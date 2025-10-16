import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log('OpenPhone webhook received:', JSON.stringify(payload, null, 2));
    console.log('Payload event type:', payload.event || payload.type);
    console.log('Payload data:', payload.data);

    // Verify webhook authenticity (OpenPhone may send signature headers)
    const signature = request.headers.get('x-openphone-signature');
    // TODO: Implement signature verification when available

    const supabase = createServiceRoleClient();

    // Handle call completed and transcript events
    if (payload.event === 'call.completed' || payload.type === 'call.completed' ||
        payload.event === 'call.transcript.completed' || payload.type === 'call.transcript.completed' ||
        payload.event === 'test' || !payload.event) {

      // OpenPhone nests data under data.object for some events
      const callData = payload.data?.object || payload.data || payload;

      // Generate a unique ID for test webhooks or empty payloads
      const timestamp = Date.now();
      const callId = callData.id || callData.callId || `openphone-test-${timestamp}`;

      console.log('Extracted call_id:', callId);

      // Extract transcript from callTranscript.dialogue if available
      let transcript = callData.transcript || callData.transcription?.text;
      if (!transcript && callData.callTranscript?.dialogue) {
        // Combine all dialogue into a single transcript
        transcript = callData.callTranscript.dialogue
          .map((d: any) => `Speaker ${d.speaker}: ${d.content}`)
          .join('\n');
      }
      if (!transcript) {
        transcript = 'Test webhook - no transcript';
      }

      // Extract call information - handle different payload structures
      const callInfo = {
        call_id: callId,
        caller_number: callData.from || callData.phoneNumber || callData.participants?.[0]?.phoneNumber || '+15550000000',
        direction: callData.direction === 'incoming' ? 'inbound' : (callData.direction || 'inbound'),
        duration: callData.callTranscript?.duration || callData.duration || 0,
        call_date: callData.completedAt || callData.createdAt || callData.startedAt || new Date().toISOString(),
        transcript: transcript,
      };

      // Get enhanced classification with sales intelligence
      const classification = await classifyCallWithClaude(
        callInfo.transcript || '',
        callInfo.duration,
        callInfo.call_date,
        callInfo.caller_number || 'Unknown'
      );

      // Store call data using only existing schema fields
      const { data: insertData, error: insertError } = await supabase.from('openphone_calls').upsert({
        call_id: callInfo.call_id,
        caller_number: callInfo.caller_number,
        direction: callInfo.direction,
        duration: callInfo.duration,
        call_date: callInfo.call_date,
        transcript: callInfo.transcript,
        classified_as_booked: classification.bookable_opportunity,
        classification_confidence: classification.confidence_score / 100,
        pulled_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error('Database insertion error:', insertError);
        return NextResponse.json(
          {
            error: 'Failed to save call data',
            details: insertError.message,
            classification: classification
          },
          { status: 500 }
        );
      }

      console.log(`Call ${callInfo.call_id} processed:`, {
        outcome: classification.outcome,
        bookable: classification.bookable_opportunity,
        pipeline: classification.pipeline_stage,
        sentiment: classification.sentiment,
        confidence: classification.confidence_score
      });

      return NextResponse.json({
        success: true,
        message: 'Call processed with advanced classification',
        classification: {
          outcome: classification.outcome,
          bookable_opportunity: classification.bookable_opportunity,
          pipeline_stage: classification.pipeline_stage,
          sentiment: classification.sentiment,
          confidence: classification.confidence_score
        }
      });
    }

    // Handle other webhook events
    console.log('Unhandled webhook event:', payload.event || payload.type);

    return NextResponse.json({
      success: true,
      message: 'Webhook received but not processed'
    });

  } catch (error) {
    console.error('OpenPhone webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

interface CallClassification {
  outcome: string;
  bookable_opportunity: boolean;
  appointment_datetime: string | null;
  follow_up_date: string | null;
  pipeline_stage: string;
  sentiment: string;
  notes: string;
  confidence_score: number;
}

async function classifyCallWithClaude(
  transcript: string,
  duration: number = 0,
  callDate: string = new Date().toISOString(),
  contactName: string = 'Unknown'
): Promise<CallClassification> {
  if (!ANTHROPIC_API_KEY || !transcript) {
    // Enhanced fallback classification
    const bookedKeywords = ['schedule', 'appointment', 'book', 'when can you come', 'available', 'estimate', 'emergency', 'service call'];
    const hasBookedKeywords = bookedKeywords.some(keyword =>
      transcript.toLowerCase().includes(keyword)
    );

    return {
      outcome: hasBookedKeywords ? "Appointment Discussed" : "Interested - No Date Set",
      bookable_opportunity: duration > 30,
      appointment_datetime: null,
      follow_up_date: null,
      pipeline_stage: hasBookedKeywords ? "Qualified" : "New",
      sentiment: "Neutral",
      notes: "Automatic classification - no AI analysis available. Keywords detected: " +
             (hasBookedKeywords ? "appointment-related terms" : "general inquiry"),
      confidence_score: 40
    };
  }

  try {
    const prompt = `You are analyzing a phone call transcript to classify the outcome and extract key information for sales tracking.

CALL TRANSCRIPT:
${transcript}

CALL METADATA:
- Duration: ${duration} seconds
- Date: ${callDate}
- Contact: ${contactName}

YOUR TASK:
Analyze this conversation and provide a structured JSON response with the following fields:

1. **outcome** - Choose ONE category that best fits:
   - "Appointment Discussed" - Customer agreed to have technician come out for diagnosis/estimate
   - "Follow-Up Scheduled" - Callback requested with specific date/time
   - "Interested - No Date Set" - Positive conversation but no commitment yet
   - "Fee Concern" - Interested but hesitant about diagnosis/emergency fees
   - "Not Interested" - Clear rejection or not interested
   - "Not Qualified" - Doesn't meet criteria (budget, location, timing, etc.)
   - "No Answer" - No one picked up
   - "Voicemail Left" - Left a voicemail message
   - "Gatekeeper/No Decision Maker" - Couldn't reach decision maker
   - "Bad Number/Wrong Contact" - Wrong number or disconnected
   - "Existing Client/Non-Sales" - Current customer or non-sales call

2. **bookable_opportunity** - Boolean (true/false)
   - TRUE if you had a real conversation with a decision maker or prospect
   - FALSE if no answer, voicemail, gatekeeper, bad number, or existing client

3. **appointment_datetime** - If an appointment was booked, extract the date and time in ISO format (YYYY-MM-DD HH:MM). Otherwise null.

4. **follow_up_date** - If a callback was scheduled, extract the date/time in ISO format. Otherwise null.

5. **pipeline_stage** - Choose ONE:
   - "New" - First contact or early conversation
   - "Follow-Up" - Scheduled callback or ongoing conversation
   - "Qualified" - Appointment discussed, awaiting quote/conversion
   - "Closed-Lost" - Not interested or not qualified

6. **sentiment** - Overall tone of the conversation:
   - "Positive" - Friendly, engaged, interested
   - "Neutral" - Professional but not particularly warm
   - "Negative" - Frustrated, annoyed, or hostile

7. **notes** - A brief 2-3 sentence summary including:
   - Key points discussed
   - Any objections or concerns mentioned
   - Important context for follow-up

8. **confidence_score** - Your confidence in this classification (0-100)

IMPORTANT RULES:
- Respond ONLY with valid JSON
- Do not include markdown code blocks or any text outside the JSON
- Be specific with dates/times when mentioned
- If information is not available, use null
- Focus on accuracy over assumptions

RESPONSE FORMAT (respond with ONLY this JSON structure):
{
  "outcome": "string",
  "bookable_opportunity": boolean,
  "appointment_datetime": "string or null",
  "follow_up_date": "string or null",
  "pipeline_stage": "string",
  "sentiment": "string",
  "notes": "string",
  "confidence_score": number
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
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
        outcome: classification.outcome || "Not Qualified",
        bookable_opportunity: classification.bookable_opportunity || false,
        appointment_datetime: classification.appointment_datetime || null,
        follow_up_date: classification.follow_up_date || null,
        pipeline_stage: classification.pipeline_stage || "New",
        sentiment: classification.sentiment || "Neutral",
        notes: classification.notes || "AI classification completed",
        confidence_score: classification.confidence_score || 75
      };
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      // Enhanced fallback if JSON parsing fails
      return {
        outcome: responseText.toLowerCase().includes('appointment') ? "Appointment Discussed" : "Interested - No Date Set",
        bookable_opportunity: duration > 30,
        appointment_datetime: null,
        follow_up_date: null,
        pipeline_stage: "New",
        sentiment: "Neutral",
        notes: "AI analysis completed but parsing failed: " + responseText.substring(0, 100),
        confidence_score: 60
      };
    }
  } catch (error) {
    console.error('Claude classification error:', error);
    // Enhanced fallback to keyword detection
    const bookedKeywords = ['schedule', 'appointment', 'book', 'when can you come', 'available', 'estimate', 'emergency'];
    const hasBookedKeywords = bookedKeywords.some(keyword =>
      transcript.toLowerCase().includes(keyword)
    );

    return {
      outcome: hasBookedKeywords ? "Appointment Discussed" : "Not Interested",
      bookable_opportunity: duration > 30,
      appointment_datetime: null,
      follow_up_date: null,
      pipeline_stage: hasBookedKeywords ? "Qualified" : "Closed-Lost",
      sentiment: "Neutral",
      notes: "Fallback classification used due to API error. Duration: " + duration + "s",
      confidence_score: 30
    };
  }
}

// Handle GET requests for webhook verification
export async function GET() {
  return NextResponse.json({
    message: 'OpenPhone webhook endpoint active',
    endpoint: '/api/webhooks/openphone',
    methods: ['POST']
  });
}