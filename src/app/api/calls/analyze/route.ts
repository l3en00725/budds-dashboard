import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANALYSIS_VERSION = 'v1.0';

interface CallAnalysisInput {
  call_id: string;
  transcript: string;
  direction: string;
  duration: number;
  caller_number?: string;
  call_date?: string;
}

interface CallAnalysisOutput {
  category: string;
  intent: string;
  sentiment: string;
  service_detail: string | null;
  customer_need: string | null;
  confidence: number;
  needs_review: boolean;
}

/**
 * Analyze a call transcript for category, intent, and sentiment
 * POST /api/calls/analyze
 * Body: { call_id, transcript, direction, duration, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const body: CallAnalysisInput = await request.json();
    const { call_id, transcript, direction, duration, caller_number, call_date } = body;

    if (!call_id || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields: call_id, transcript' },
        { status: 400 }
      );
    }

    // Perform AI analysis
    const analysis = await analyzeCallWithAI(
      transcript,
      direction,
      duration,
      caller_number,
      call_date
    );

    // Store in database
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('calls_ai_analysis')
      .upsert({
        call_id,
        category: analysis.category,
        intent: analysis.intent,
        sentiment: analysis.sentiment,
        service_detail: analysis.service_detail,
        customer_need: analysis.customer_need,
        confidence: analysis.confidence,
        needs_review: analysis.needs_review,
        analyzed_at: new Date().toISOString(),
        analysis_version: ANALYSIS_VERSION,
        model_used: 'claude-3.5-sonnet',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Database error storing analysis:', error);
      return NextResponse.json(
        { error: 'Failed to store analysis', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      call_id,
      analysis: data,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Core AI analysis function using Claude
 */
async function analyzeCallWithAI(
  transcript: string,
  direction: string,
  duration: number,
  callerNumber?: string,
  callDate?: string
): Promise<CallAnalysisOutput> {
  
  // Fallback for no transcript
  if (!transcript || transcript.trim().length < 10) {
    return {
      category: 'Other',
      intent: 'Inquiry',
      sentiment: 'Neutral',
      service_detail: null,
      customer_need: duration > 30 ? 'Call too short for analysis' : 'No transcript available',
      confidence: 0.1,
      needs_review: true,
    };
  }

  // Fallback if no API key
  if (!ANTHROPIC_API_KEY) {
    return keywordBasedFallback(transcript, direction, duration);
  }

  try {
    const prompt = buildAnalysisPrompt(transcript, direction, duration, callerNumber, callDate);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        temperature: 0.2, // Lower temperature for more consistent categorization
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return keywordBasedFallback(transcript, direction, duration);
    }

    const data = await response.json();
    const responseText = data.content[0].text;

    // Parse JSON response
    let result;
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return keywordBasedFallback(transcript, direction, duration);
    }

    // Validate and normalize the response
    const analysis: CallAnalysisOutput = {
      category: normalizeCategory(result.category),
      intent: normalizeIntent(result.intent),
      sentiment: normalizeSentiment(result.sentiment),
      service_detail: result.service_detail || null,
      customer_need: result.customer_need || null,
      confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
      needs_review: false,
    };

    // Flag for review if confidence is low
    analysis.needs_review = analysis.confidence < 0.6;

    return analysis;
  } catch (error) {
    console.error('AI analysis error:', error);
    return keywordBasedFallback(transcript, direction, duration);
  }
}

/**
 * Build the analysis prompt for Claude
 */
function buildAnalysisPrompt(
  transcript: string,
  direction: string,
  duration: number,
  callerNumber?: string,
  callDate?: string
): string {
  return `You are analyzing a call for a home services company that provides PLUMBING, HVAC, and DRAIN CLEANING services.

CALL METADATA:
- Direction: ${direction}
- Duration: ${duration} seconds
- Caller: ${callerNumber || 'Unknown'}
- Date: ${callDate || 'Unknown'}

CALL TRANSCRIPT:
${transcript}

ANALYSIS INSTRUCTIONS:

1. **CATEGORY** - Identify the PRIMARY service discussed:
   - "Plumbing" - Toilets, sinks, faucets, pipes, fixtures, water leaks, backflow, general plumbing
   - "HVAC" - Furnace, AC, air conditioning, heating, cooling, thermostat, ductwork, air quality
   - "Drain" - Drain cleaning, clogged drains, snake, sewer, main line, backup
   - "Water Heater" - Water heater repair/install, hot water tank, tankless, no hot water
   - "Financing" - Payment plans, financing options, credit, payment arrangements
   - "Membership" - Service plans, membership programs, maintenance agreements
   - "Other" - Not clearly one of the above, multiple services, or administrative

2. **INTENT** - What is the caller trying to accomplish?
   - "Booking" - Wants to schedule service, agrees to appointment, ready to proceed
   - "Estimate" - Asking for price quote, wants cost information before deciding
   - "Emergency" - Urgent issue needing immediate attention (flooding, no heat in winter, gas smell)
   - "Inquiry" - General questions, seeking information, exploring options
   - "Complaint" - Issue with previous service, billing dispute, dissatisfaction
   - "Follow-up" - Checking status of existing work, parts update, permit waiting

3. **SENTIMENT** - Overall tone of the interaction:
   - "Positive" - Friendly, cooperative, satisfied, grateful
   - "Neutral" - Matter-of-fact, businesslike, calm
   - "Negative" - Frustrated, upset, angry, demanding

4. **SERVICE_DETAIL** - Be SPECIFIC about what they need (e.g., "Water heater leaking", "AC not cooling", "Kitchen sink clogged")

5. **CUSTOMER_NEED** - Brief summary of what the customer is asking for

6. **CONFIDENCE** - How confident are you in this categorization? (0.0 to 1.0)
   - Use 0.9+ for clear, unambiguous calls
   - Use 0.7-0.9 for moderately clear calls
   - Use 0.5-0.7 for ambiguous or multi-topic calls
   - Use <0.5 for unclear or confusing calls

IMPORTANT RULES:
- If transcript mentions BOTH plumbing AND HVAC, choose the PRIMARY focus
- "Water heater" is its own category, NOT plumbing or HVAC
- "Drain cleaning" is separate from general plumbing
- Vendor/contractor calls about permits/parts = "Follow-up" intent, not "Booking"
- Calls mentioning "invoice" or "bill" are likely "Complaint" or "Inquiry", NOT "Booking"

Return ONLY valid JSON (no markdown, no code blocks):
{
  "category": "Plumbing|HVAC|Drain|Water Heater|Financing|Membership|Other",
  "intent": "Booking|Estimate|Emergency|Inquiry|Complaint|Follow-up",
  "sentiment": "Positive|Neutral|Negative",
  "service_detail": "specific service needed",
  "customer_need": "brief summary of need",
  "confidence": 0.85
}`;
}

/**
 * Keyword-based fallback when AI is unavailable
 */
function keywordBasedFallback(
  transcript: string,
  direction: string,
  duration: number
): CallAnalysisOutput {
  const lower = transcript.toLowerCase();

  // Category detection
  let category = 'Other';
  if (/(water heater|hot water|tank|tankless|pilot light)/i.test(transcript)) {
    category = 'Water Heater';
  } else if (/(furnace|ac|air condition|heating|cooling|hvac|thermostat|heat pump)/i.test(transcript)) {
    category = 'HVAC';
  } else if (/(drain|clog|snake|sewer|backup|main line|slow drain)/i.test(transcript)) {
    category = 'Drain';
  } else if (/(toilet|sink|faucet|pipe|leak|plumb|fixture)/i.test(transcript)) {
    category = 'Plumbing';
  } else if (/(financ|payment plan|credit|pay over time)/i.test(transcript)) {
    category = 'Financing';
  } else if (/(membership|service plan|maintenance agreement)/i.test(transcript)) {
    category = 'Membership';
  }

  // Intent detection
  let intent = 'Inquiry';
  if (/(emergency|urgent|flooding|burst|no heat|gas smell|asap)/i.test(transcript)) {
    intent = 'Emergency';
  } else if (/(schedule|book|appointment|send someone|come out|when can you)/i.test(transcript)) {
    intent = 'Booking';
  } else if (/(how much|cost|price|quote|estimate)/i.test(transcript)) {
    intent = 'Estimate';
  } else if (/(complaint|unhappy|upset|problem with|issue with)/i.test(transcript)) {
    intent = 'Complaint';
  } else if (/(status|following up|checking on|permit|part)/i.test(transcript)) {
    intent = 'Follow-up';
  }

  // Sentiment detection
  let sentiment = 'Neutral';
  const positiveWords = /(thank|great|appreciate|wonderful|excellent|perfect)/i.test(transcript);
  const negativeWords = /(angry|frustrated|upset|terrible|awful|horrible)/i.test(transcript);
  
  if (positiveWords && !negativeWords) {
    sentiment = 'Positive';
  } else if (negativeWords && !positiveWords) {
    sentiment = 'Negative';
  }

  return {
    category,
    intent,
    sentiment,
    service_detail: null,
    customer_need: 'Analysis using keyword fallback',
    confidence: 0.4,
    needs_review: true,
  };
}

/**
 * Normalize category to valid values
 */
function normalizeCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  if (normalized.includes('plumb')) return 'Plumbing';
  if (normalized.includes('hvac') || normalized.includes('heat') || normalized.includes('cool')) return 'HVAC';
  if (normalized.includes('drain')) return 'Drain';
  if (normalized.includes('water heater') || normalized.includes('hot water')) return 'Water Heater';
  if (normalized.includes('financ')) return 'Financing';
  if (normalized.includes('member')) return 'Membership';
  return 'Other';
}

/**
 * Normalize intent to valid values
 */
function normalizeIntent(intent: string): string {
  const normalized = intent.toLowerCase().trim();
  if (normalized.includes('book')) return 'Booking';
  if (normalized.includes('estimate') || normalized.includes('quote')) return 'Estimate';
  if (normalized.includes('emergency') || normalized.includes('urgent')) return 'Emergency';
  if (normalized.includes('inquir') || normalized.includes('question')) return 'Inquiry';
  if (normalized.includes('complaint')) return 'Complaint';
  if (normalized.includes('follow')) return 'Follow-up';
  return 'Inquiry';
}

/**
 * Normalize sentiment to valid values
 */
function normalizeSentiment(sentiment: string): string {
  const normalized = sentiment.toLowerCase().trim();
  if (normalized.includes('pos')) return 'Positive';
  if (normalized.includes('neg')) return 'Negative';
  return 'Neutral';
}

/**
 * GET endpoint to retrieve analysis for a call
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const call_id = searchParams.get('call_id');

    if (!call_id) {
      return NextResponse.json(
        { error: 'Missing call_id parameter' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('calls_ai_analysis')
      .select('*')
      .eq('call_id', call_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Analysis not found for this call' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: data,
    });
  } catch (error) {
    console.error('Error retrieving analysis:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve analysis',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

