import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Helper function to calculate call duration in seconds
function calculateDuration(
  createdAt: string | null,
  completedAt: string | null,
): number {
  try {
    if (!createdAt || !completedAt) return 0;
    const start = new Date(createdAt);
    const end = new Date(completedAt);
    const diff = (end.getTime() - start.getTime()) / 1000; // seconds
    return isNaN(diff) || diff < 0 ? 0 : Math.round(diff);
  } catch {
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log(
      "OpenPhone webhook received:",
      JSON.stringify(payload, null, 2),
    );

    const supabase = createServiceRoleClient();

    // Get event type from payload - OpenPhone sends it in different locations
    const eventType = payload.object?.type || payload.event || payload.type;

    // Log event type BEFORE any processing
    console.log("📥 EVENT TYPE:", eventType);

    // Filter out SMS events - will be tracked separately in future SMS Analytics feature
    if (eventType === "message.received" || eventType === "message.delivered") {
      console.log("💬 Processing message event:", eventType);
      console.log(
        "⚠️  ACTION: SKIPPING - Messages should go to openphone_messages table (not implemented yet)",
      );
      console.log(
        "Ignoring SMS event:",
        eventType,
        "from",
        payload.data?.phoneNumber || "unknown",
      );
      return NextResponse.json({
        success: true,
        message:
          "SMS event ignored - will be tracked in future SMS Analytics widget",
      });
    }

    // Handle call events only (call.completed, call.transcript.completed, call.summary.completed, etc.)
    if (
      eventType === "call.completed" ||
      eventType === "call.transcript.completed" ||
      eventType === "call.summary.completed" ||
      eventType === "call.recording.completed" ||
      eventType === "test" ||
      !eventType
    ) {
      // OpenPhone nests data under different structures depending on API version
      const callData =
        payload.object?.data?.object ||
        payload.data?.object ||
        payload.data ||
        payload;

    console.log("Extracted call data:", JSON.stringify(callData, null, 2));

    // Extract call ID
    const callId = callData.id || callData.callId || `openphone-${Date.now()}`;

    // ============================================================
    // 1️⃣ Handle call.completed events
    // ============================================================
    if (eventType === "call.completed") {
      console.log("📞 Processing call.completed event for call:", callId);
      console.log("⚡ ACTION: UPSERT into openphone_calls");

      // Extract call information - handle different payload structures
      const callerNumber =
        callData.from ||
        callData.phoneNumber ||
        callData.participants?.[0]?.phoneNumber ||
        "+15550000000";
      const receiverNumber =
        callData.to || callData.receiverNumber || "Unknown";
      const direction =
        callData.direction === "incoming"
          ? "inbound"
          : callData.direction || "inbound";
      const duration = Math.round(
        callData.callTranscript?.duration || callData.duration || 0,
      );
      const callDate =
        callData.completedAt ||
        callData.createdAt ||
        callData.startedAt ||
        new Date().toISOString();

      // Get AI classification (with null transcript initially)
      const classification = await classifyCallWithClaude(
        "",
        duration,
        callDate,
        callerNumber,
      );

      const finalData = {
        call_id: callId,
        caller_number: callerNumber,
        receiver_number: receiverNumber,
        direction: direction,
        duration: duration,
        call_date: callDate,
        transcript: null,
        classified_as_outcome: classification.outcome,
        classified_as_booked: classification.booked,
        service_type: classification.service_type,
        pipeline_stage: classification.pipeline_stage,
        sentiment: classification.sentiment,
        is_emergency: classification.is_emergency,
        ai_confidence: classification.confidence_score / 100,
        ai_summary: classification.summary,
        notes: classification.notes,
        pulled_at: new Date().toISOString(),
      };

      console.log("Final object sent to Supabase (call.completed):", finalData);

      const { error: insertError } = await supabase
        .from("openphone_calls")
        .upsert(finalData);

      if (insertError) {
        console.error("Database insertion error:", insertError);
        return NextResponse.json(
          { error: "Failed to save call data", details: insertError.message },
          { status: 500 },
        );
      }

      console.log(`✅ Call ${callId} metadata stored successfully`);

      return NextResponse.json({
        success: true,
        message: "Call completed event processed",
        call_id: callId,
        classification: {
          outcome: classification.outcome,
          booked: classification.booked,
          service_type: classification.service_type,
          pipeline: classification.pipeline_stage,
          sentiment: classification.sentiment,
          emergency: classification.is_emergency,
        },
      });
    }

    // ============================================================
    // 2️⃣ Handle call.transcript.completed events
    // ============================================================
    if (eventType === "call.transcript.completed") {
      console.log(
        "📝 Processing call.transcript.completed event for call:",
        callId,
      );
      console.log("⚡ ACTION: UPDATE openphone_calls with transcript");

      let transcriptText =
        callData.transcript || callData.transcription?.text || null;

      if (!transcriptText && callData.callTranscript?.dialogue) {
        transcriptText = callData.callTranscript.dialogue
          .map((d: any) => `Speaker ${d.speaker}: ${d.content}`)
          .join("\n");
      }

      if (!transcriptText) {
        console.warn("Transcript event received but no transcript text found");
        return NextResponse.json({
          success: true,
          message: "Transcript event received but no text available",
        });
      }

      console.log("Transcript extracted, length:", transcriptText.length);

      const { data: existingCall } = await supabase
        .from("openphone_calls")
        .select("duration, call_date, caller_number")
        .eq("call_id", callId)
        .single();

      // Re-classify with actual transcript
      const classification = await classifyCallWithClaude(
        transcriptText,
        existingCall?.duration || 0,
        existingCall?.call_date || new Date().toISOString(),
        existingCall?.caller_number || "Unknown",
      );

      const updateData = {
        transcript: transcriptText,
        classified_as_outcome: classification.outcome,
        classified_as_booked: classification.booked,
        service_type: classification.service_type,
        pipeline_stage: classification.pipeline_stage,
        sentiment: classification.sentiment,
        is_emergency: classification.is_emergency,
        ai_confidence: classification.confidence_score / 100,
        ai_summary: classification.summary,
        notes: classification.notes,
      };

      console.log(
        "Final object sent to Supabase (transcript update):",
        updateData,
      );

      const { error: updateError } = await supabase
        .from("openphone_calls")
        .update(updateData)
        .eq("call_id", callId);

      if (updateError) {
        console.error("Database update error:", updateError);
        return NextResponse.json(
          {
            error: "Failed to update transcript",
            details: updateError.message,
          },
          { status: 500 },
        );
      }

      console.log(`✅ Call ${callId} transcript and classification updated`);

      return NextResponse.json({
        success: true,
        message: "Transcript processed and call updated",
        call_id: callId,
        classification: {
          outcome: classification.outcome,
          booked: classification.booked,
          service_type: classification.service_type,
          pipeline: classification.pipeline_stage,
          sentiment: classification.sentiment,
          emergency: classification.is_emergency,
          confidence: classification.confidence_score,
        },
      });
    }

    // ============================================================
    // Handle unknown/test events
    // ============================================================
    console.log("⚠️  Unhandled webhook event type:", eventType);

    return NextResponse.json({
      success: true,
      message: "Webhook received but not processed",
      event_type: eventType,
    });
  }

  } catch (error) {
    console.error("OpenPhone webhook error:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================
// AI Classification Function
// ============================================================

interface CallClassification {
  outcome: string;
  booked: boolean;
  service_type: string | null;
  pipeline_stage: string;
  sentiment: string;
  is_emergency: boolean;
  summary: string;
  notes: string;
  confidence_score: number;
}

async function classifyCallWithClaude(
  transcript: string,
  duration: number = 0,
  callDate: string = new Date().toISOString(),
  contactName: string = "Unknown",
): Promise<CallClassification> {
  // If no transcript, use basic fallback
  if (!transcript || transcript.length === 0) {
    return {
      outcome:
        duration > 30 ? "Call Completed - Awaiting Transcript" : "Short Call",
      booked: false,
      service_type: null,
      pipeline_stage: duration > 30 ? "New" : "Closed-Lost",
      sentiment: "Neutral",
      is_emergency: false,
      summary: `Call duration: ${duration}s. Transcript not yet available.`,
      notes: "Awaiting transcript for full classification.",
      confidence_score: 30,
    };
  }

  if (!ANTHROPIC_API_KEY) {
    // Keyword-based fallback
    const bookedKeywords = [
      "that's fine",
      "go ahead",
      "sounds good",
      "yes please",
      "book it",
    ];
    const serviceKeywords = {
      "Water Heater": ["water heater", "hot water tank", "no hot water"], // Most specific first
      "Drain Cleaning": [
        "drain cleaning",
        "clogged drain",
        "backed up drain",
        "snake drain",
      ],
      HVAC: [
        "air condition",
        "furnace",
        "ac unit",
        "hvac",
        "thermostat",
        "heating system",
        "air handler",
      ],
      Plumbing: [
        "plumber",
        "plumbing",
        "pipe",
        "leak",
        "toilet",
        "sink",
        "faucet",
        "sewer",
        "valve",
      ],
    };
    const emergencyKeywords = [
      "emergency",
      "flooding",
      "burst",
      "no heat",
      "leaking badly",
    ];

    const hasBooked = bookedKeywords.some((kw) =>
      transcript.toLowerCase().includes(kw),
    );
    const isEmergency = emergencyKeywords.some((kw) =>
      transcript.toLowerCase().includes(kw),
    );

    let serviceType = null;
    for (const [type, keywords] of Object.entries(serviceKeywords)) {
      if (keywords.some((kw) => transcript.toLowerCase().includes(kw))) {
        serviceType = type; // Use the key as-is (already properly formatted)
        break;
      }
    }

    return {
      outcome: hasBooked ? "Booked" : "Inquiry",
      booked: hasBooked,
      service_type: serviceType,
      pipeline_stage: hasBooked ? "Booked" : "New",
      sentiment: "Neutral",
      is_emergency: isEmergency,
      summary: `${serviceType || "General"} inquiry. ${isEmergency ? "EMERGENCY. " : ""}${hasBooked ? "Customer agreed to proceed." : "No commitment yet."}`,
      notes: "Keyword-based classification (no AI available)",
      confidence_score: 40,
    };
  }

  try {
    const prompt = `You are analyzing a phone call transcript for a plumbing and HVAC company. Extract key details and classify the call.

CALL TRANSCRIPT:
${transcript}

CALL METADATA:
- Duration: ${duration} seconds
- Date: ${callDate}
- Contact: ${contactName}

CLASSIFICATION RULES:

1. **booked** (boolean):
   - TRUE only if customer explicitly accepted service fee or clearly agreed to proceed
   - Phrases like: "that's fine", "go ahead", "yes please", "sounds good", "book it"
   - FALSE if they're just inquiring or haven't committed

2. **service_type** (string or null):
   - Detect: "Plumbing", "HVAC", "Drain", "Water Heater", "Furnace", "AC Repair", etc.
   - Be specific if possible
   - null if unclear

3. **is_emergency** (boolean):
   - TRUE if urgent keywords: "flooding", "burst pipe", "no heat", "no hot water", "leaking badly"
   - FALSE otherwise

4. **sentiment** (string):
   - "Positive" - friendly, cooperative
   - "Neutral" - matter-of-fact
   - "Negative" - frustrated, angry

5. **pipeline_stage** (string):
   - "Booked" - Customer agreed to service
   - "Quote Needed" - Needs estimate first
   - "Follow-Up" - Call back later
   - "Inquiry" - Just asking questions
   - "Closed-Lost" - Not interested

6. **outcome** (string):
   - Brief description (e.g., "Booked water heater repair", "Inquiry about HVAC service", "Price shopping")

7. **summary** (string):
   - 1-2 sentences: what happened, key details, next steps

8. **notes** (string):
   - Important details: address mentioned, preferred times, special requests, concerns

9. **confidence_score** (0-100):
   - How confident are you in this classification?

RESPONSE (JSON only, no markdown):
{
  "booked": boolean,
  "service_type": "string or null",
  "is_emergency": boolean,
  "sentiment": "string",
  "pipeline_stage": "string",
  "outcome": "string",
  "summary": "string",
  "notes": "string",
  "confidence_score": number
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
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
        outcome: classification.outcome || "Not Classified",
        booked: classification.booked || false,
        service_type: classification.service_type || null,
        pipeline_stage: classification.pipeline_stage || "Inquiry",
        sentiment: classification.sentiment || "Neutral",
        is_emergency: classification.is_emergency || false,
        summary: classification.summary || "AI classification completed",
        notes: classification.notes || "",
        confidence_score: classification.confidence_score || 75,
      };
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      return {
        outcome: "Classification Error",
        booked: false,
        service_type: null,
        pipeline_stage: "Inquiry",
        sentiment: "Neutral",
        is_emergency: false,
        summary: "AI analysis completed but parsing failed",
        notes: responseText.substring(0, 200),
        confidence_score: 40,
      };
    }
  } catch (error) {
    console.error("Claude classification error:", error);

    // Fall back to keyword-based classification when API fails
    const bookedKeywords = [
      "that's fine",
      "go ahead",
      "sounds good",
      "yes please",
      "book it",
    ];
    const serviceKeywords = {
      "Water Heater": ["water heater", "hot water tank", "no hot water"], // Most specific first
      "Drain Cleaning": [
        "drain cleaning",
        "clogged drain",
        "backed up drain",
        "snake drain",
      ],
      HVAC: [
        "air condition",
        "furnace",
        "ac unit",
        "hvac",
        "thermostat",
        "heating system",
        "air handler",
      ],
      Plumbing: [
        "plumber",
        "plumbing",
        "pipe",
        "leak",
        "toilet",
        "sink",
        "faucet",
        "sewer",
        "valve",
      ],
    };
    const emergencyKeywords = [
      "emergency",
      "flooding",
      "burst",
      "no heat",
      "leaking badly",
    ];

    const hasBooked = bookedKeywords.some((kw) =>
      transcript.toLowerCase().includes(kw),
    );
    const isEmergency = emergencyKeywords.some((kw) =>
      transcript.toLowerCase().includes(kw),
    );

    let serviceType = null;
    for (const [type, keywords] of Object.entries(serviceKeywords)) {
      if (keywords.some((kw) => transcript.toLowerCase().includes(kw))) {
        serviceType = type; // Use the key as-is (already properly formatted)
        break;
      }
    }

    return {
      outcome: hasBooked ? "Booked" : "Inquiry",
      booked: hasBooked,
      service_type: serviceType,
      pipeline_stage: hasBooked ? "Booked" : "New",
      sentiment: "Neutral",
      is_emergency: isEmergency,
      summary: `${serviceType || "General"} inquiry. ${isEmergency ? "EMERGENCY. " : ""}${hasBooked ? "Customer agreed to proceed." : "No commitment yet."}`,
      notes: "Keyword-based classification (API error fallback)",
      confidence_score: 40,
    };
  }
}

// Handle GET requests for webhook verification
export async function GET() {
  return NextResponse.json({
    message: "OpenPhone webhook endpoint active (Enhanced)",
    endpoint: "/api/webhooks/openphone",
    methods: ["POST"],
    supported_events: [
      "call.completed",
      "call.transcript.completed",
      "call.summary.completed",
    ],
    features: [
      "Service fee acceptance detection",
      "Service type classification",
      "Emergency detection",
      "Sentiment analysis",
      "Enhanced AI summaries",
    ],
  });
}
