import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

const OPENPHONE_API_BASE_URL = process.env.OPENPHONE_API_BASE_URL || 'https://api.openphone.com/v1';
const OPENPHONE_API_KEY = process.env.OPENPHONE_API_KEY;
const OPENPHONE_PHONE_NUMBER_ID = process.env.OPENPHONE_PHONE_NUMBER_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST() {
  try {
    if (!OPENPHONE_API_KEY) {
      throw new Error('OpenPhone API key not configured');
    }

    const supabase = createServiceRoleClient();

    // Log sync start
    const { data: syncLog } = await supabase
      .from('sync_log')
      .insert({
        sync_type: 'openphone_calls',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    let recordsSynced = 0;

    try {
      // Get calls from the last 3 days to ensure we catch any recent calls
      const today = new Date();
      const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);

      console.log('Syncing OpenPhone calls from last 3 days...');

      let allCalls = [];

      // Fetch calls for each of the last 3 days
      for (let i = 0; i < 3; i++) {
        const targetDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateString = targetDate.toISOString().split('T')[0];

        try {
          const dailyCalls = await fetchOpenPhoneCalls(dateString);
          allCalls = allCalls.concat(dailyCalls);
          console.log(`Found ${dailyCalls.length} calls for ${dateString}`);
        } catch (error) {
          console.error(`Error fetching calls for ${dateString}:`, error);
          // Continue with other days even if one fails
        }
      }

      const calls = allCalls;

      for (const call of calls) {
        // Check if we already have this call
        const { data: existingCall } = await supabase
          .from('openphone_calls')
          .select('id')
          .eq('call_id', call.id)
          .single();

        if (!existingCall) {
          // Classify the call using Claude (if transcript available)
          let classification = { isBooked: false, confidence: 0.1 };

          if (call.transcript && call.transcript.trim().length > 10) {
            classification = await classifyCallWithClaude(call.transcript);
          } else {
            // For calls without transcripts, use basic heuristics
            // Longer calls (>60 seconds) are more likely to be real customer calls
            if (call.duration && call.duration > 60) {
              classification = { isBooked: false, confidence: 0.3 }; // Assume not booked but real call
            }
          }

          await supabase.from('openphone_calls').upsert({
            call_id: call.id,
            caller_number: call.phoneNumber,
            direction: call.direction,
            duration: call.duration,
            transcript: call.transcript || null,
            classified_as_booked: classification.isBooked,
            classification_confidence: classification.confidence,
            call_date: call.createdAt,
            pulled_at: new Date().toISOString(),
          });

          recordsSynced++;
        }
      }

      // Update sync log with success
      await supabase
        .from('sync_log')
        .update({
          status: 'success',
          records_synced: recordsSynced,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      return NextResponse.json({
        success: true,
        recordsSynced,
        syncId: syncLog.id,
      });
    } catch (error) {
      // Update sync log with error
      await supabase
        .from('sync_log')
        .update({
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      throw error;
    }
  } catch (error) {
    console.error('OpenPhone sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function fetchOpenPhoneCalls(date: string) {
  if (!OPENPHONE_PHONE_NUMBER_ID) {
    throw new Error('OPENPHONE_PHONE_NUMBER_ID environment variable is required');
  }

  // Fixed: Add participants parameter which is now required by OpenPhone API
  // Fixed: Ensure proper date range query format
  const url = `${OPENPHONE_API_BASE_URL}/calls?phoneNumberId=${OPENPHONE_PHONE_NUMBER_ID}&participants[]=${OPENPHONE_PHONE_NUMBER_ID}&createdAt[gte]=${date}T00:00:00Z&createdAt[lt]=${date}T23:59:59Z`;

  console.log('Fetching OpenPhone calls from:', url);

  const response = await fetch(url, {
    headers: {
      // Fixed: OpenPhone uses API key directly, NOT Bearer token
      'Authorization': OPENPHONE_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  console.log('OpenPhone API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenPhone API error:', response.status, errorText);
    throw new Error(`OpenPhone API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('OpenPhone API returned:', data.totalItems, 'calls');
  return data.data || [];
}

async function classifyCallWithClaude(transcript: string): Promise<{ isBooked: boolean; confidence: number }> {
  if (!ANTHROPIC_API_KEY) {
    // Fallback: simple keyword detection
    const bookedKeywords = ['schedule', 'appointment', 'book', 'when can you come', 'available', 'estimate'];
    const hasBookedKeywords = bookedKeywords.some(keyword =>
      transcript.toLowerCase().includes(keyword)
    );
    return { isBooked: hasBookedKeywords, confidence: 0.5 };
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANTHROPIC_API_KEY}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Analyze this plumbing/HVAC service call transcript and determine if it resulted in a booked appointment or service call.

Transcript: "${transcript}"

Respond with only a JSON object: {"isBooked": true/false, "confidence": 0.0-1.0}

Consider it "booked" if:
- Customer scheduled an appointment
- Technician is coming out for service/estimate
- Follow-up visit was arranged
- Emergency service was dispatched

Consider it "not booked" if:
- Just asking for information/pricing
- Wrong number/spam
- Complaint without scheduling
- Already existing customer calling about ongoing work`
        }]
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    try {
      const classification = JSON.parse(responseText);
      return {
        isBooked: classification.isBooked || false,
        confidence: classification.confidence || 0.5,
      };
    } catch {
      // Fallback if JSON parsing fails
      const isBooked = responseText.toLowerCase().includes('true');
      return { isBooked, confidence: 0.7 };
    }
  } catch (error) {
    console.error('Claude classification error:', error);
    // Fallback to keyword detection
    const bookedKeywords = ['schedule', 'appointment', 'book', 'when can you come', 'available', 'estimate'];
    const hasBookedKeywords = bookedKeywords.some(keyword =>
      transcript.toLowerCase().includes(keyword)
    );
    return { isBooked: hasBookedKeywords, confidence: 0.5 };
  }
}