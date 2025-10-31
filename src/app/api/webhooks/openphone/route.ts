import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { readFile } from "fs/promises";
import path from "path";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Simple memoized loader for the classification guide
let classificationGuideCache: string | null = null;
async function getClassificationGuide(): Promise<string> {
  if (classificationGuideCache) return classificationGuideCache;
  try {
    const guidePath = path.join(process.cwd(), "knowledge", "CALL_CLASSIFICATION_GUIDE.md");
    const content = await readFile(guidePath, "utf8");
    classificationGuideCache = content;
    return content;
  } catch {
    return ""; // Fail open if not found
  }
}

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

    // Remove noisy full-payload log
    // console.log(
    //   "OpenPhone webhook received:",
    //   JSON.stringify(payload, null, 2),
    // );

    // Get event type from payload - OpenPhone sends it in different locations
    const eventType = payload.object?.type || payload.event || payload.type;

    // Enhanced debugging for event types
    console.log("🔍 WEBHOOK DEBUG INFO:");
    console.log("📥 Raw event type:", eventType);
    console.log("📦 Payload structure:", {
      hasObject: !!payload.object,
      hasData: !!payload.data,
      hasEvent: !!payload.event,
      hasType: !!payload.type,
      objectType: payload.object?.type,
      dataObject: payload.data?.object?.id || payload.data?.id,
    });

    // Comprehensive OpenPhone diagnostics
    console.log('📥 OpenPhone webhook:', {
      eventType,
      callId: payload.data?.object?.id || payload.data?.id,
      hasTranscript: !!payload?.data?.object?.callTranscript,
      hasDuration: !!payload?.data?.object?.duration,
      hasMedia: !!payload?.data?.object?.media?.[0]?.duration,
      transcriptLength: payload?.data?.object?.callTranscript?.dialogue?.length || 0,
      mediaDuration: payload?.data?.object?.media?.[0]?.duration,
      callDuration: payload?.data?.object?.duration,
      createdAt: payload?.data?.object?.createdAt,
      completedAt: payload?.data?.object?.completedAt,
      from: payload?.data?.object?.from,
      to: payload?.data?.object?.to,
      direction: payload?.data?.object?.direction,
      status: payload?.data?.object?.status
    });

    // Log to webhook logger for debugging
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/debug/webhook-logger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (logError) {
      console.warn('Failed to log webhook to debug endpoint:', logError);
    }

    const supabase = createServiceRoleClient();

    // Log event type BEFORE any processing
    console.log("📥 EVENT TYPE:", eventType);
    console.log("📥 EVENT TYPE LENGTH:", eventType?.length);
    console.log("📥 EVENT TYPE CHAR CODES:", eventType?.split('').map((c: string) => c.charCodeAt(0)));

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
    console.log("🔍 DEBUG: Checking main if condition for event type:", eventType);
    console.log("🔍 DEBUG: call.recording.completed match:", eventType === "call.recording.completed");
    
    if (
      eventType === "call.completed" ||
      eventType === "call.transcript.completed" ||
      eventType === "call.summary.completed" ||
      eventType === "call.recording.completed" ||
      eventType === "call.ringing" ||
      eventType === "call.answered" ||
      eventType === "call.ended" ||
      eventType === "call.failed" ||
      eventType === "test" ||
      !eventType
    ) {
      // OpenPhone nests data under different structures depending on API version
      const callData =
        payload.object?.data?.object ||
        payload.data?.object ||
        payload.data ||
        payload;

      // Extract call ID
      const callId = callData.id || callData.callId || `openphone-${Date.now()}`;

      // ============================================================
      // 1️⃣ Handle call.completed events
      // ============================================================
      console.log("🔍 DEBUG: Checking call.completed handler for event type:", eventType);
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
        // console.log("🔍 OpenPhone call payload (call.completed):", JSON.stringify(callData, null, 2));

        // Robust duration extraction from multiple sources (call.completed handler)
        let duration: number = 0;
        const computedFromTimestamps = (callData.completedAt && callData.createdAt)
          ? Math.max(0, Math.round((new Date(callData.completedAt).getTime() - new Date(callData.createdAt).getTime()) / 1000))
          : undefined;
        duration = (
          callData.duration ??
          callData.callDuration ??
          callData.media?.[0]?.duration ??
          callData.callTranscript?.duration ??
          callData.metadata?.duration ??
          callData.call?.duration ??
          computedFromTimestamps ??
          0
        );
        duration = Math.round(Number(duration));
        if (!Number.isFinite(duration) || duration < 0) duration = 0;
        console.log(`[OpenPhone] 🕑 normalized duration`, { callId, duration });

        // Ensure callDate is in UTC format
        let callDate = callData.completedAt || callData.createdAt || callData.startedAt || new Date().toISOString();
        
        // If the date doesn't end with 'Z' or have timezone info, assume it's UTC
        if (!callDate.endsWith('Z') && !callDate.includes('+') && !callDate.includes('-', 10)) {
          // Add 'Z' to indicate UTC if not present
          callDate = callDate.endsWith('Z') ? callDate : callDate + 'Z';
        }
        
        // Convert to proper UTC ISO string
        callDate = new Date(callDate).toISOString();

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

        // console.log("Final object sent to Supabase (call.completed):", finalData);

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
        console.log(`[OpenPhone] ✅ call.completed processed`, { callId, duration });

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
      console.log("🔍 DEBUG: Checking call.transcript.completed handler for event type:", eventType);
      if (eventType === "call.transcript.completed") {
        // Remove verbose payload logs in production
        // console.log(
        //   "[OpenPhone Webhook] Received call.transcript.completed with data:",
        //   JSON.stringify(callData, null, 2)
        // );

        // console.log(
        //   "[OpenPhone] transcript:", callData.transcript,
        //   "| transcription.text:", callData.transcription?.text,
        //   "| callTranscript.dialogue length:", Array.isArray(callData.callTranscript?.dialogue) ? callData.callTranscript.dialogue.length : "N/A",
        //   "| recording.transcript:", callData.recording?.transcript
        // );

        let transcriptText = null;
        // 1. Direct transcript string
        if (callData.transcript && typeof callData.transcript === "string" && callData.transcript.length > 0) {
          transcriptText = callData.transcript;
        // 2. Transcription.text fallback
        } else if (callData.transcription?.text && callData.transcription.text.length > 0) {
          transcriptText = callData.transcription.text;
        // 3. New OpenPhone schema: dialogue array directly under object
        } else if (Array.isArray(callData.dialogue) && callData.dialogue.length > 0) {
          transcriptText = callData.dialogue.map((d: any) => `Speaker ${d.speaker}: ${d.content}`).join("\n");
        // 4. Old OpenPhone schema: callTranscript.dialogue
        } else if (Array.isArray(callData.callTranscript?.dialogue) && callData.callTranscript.dialogue.length > 0) {
          transcriptText = callData.callTranscript.dialogue.map((d: any) => `Speaker ${d.speaker}: ${d.content}`).join("\n");
        // 5. Fallback: recording.transcript
        } else if (callData.recording?.transcript && typeof callData.recording.transcript === "string" && callData.recording.transcript.length > 0) {
          transcriptText = callData.recording.transcript;
        }

        // Call ID extraction (prefer new OpenPhone schema callId, then old id, then fallback)
        const callId = callData.callId || callData.id || `openphone-${Date.now()}`;

        if (!transcriptText) {
          console.warn("[OpenPhone] ⚠️ transcript missing in event", {
            callId,
            dialogueCount: Array.isArray(callData.dialogue) ? callData.dialogue.length : (Array.isArray(callData.callTranscript?.dialogue) ? callData.callTranscript.dialogue.length : 0)
          });
          return NextResponse.json({ success: true, message: "Transcript event received but no text available" });
        }

        // Concise info log for transcript extraction success
        console.log(`[OpenPhone] ✅ transcript extracted`, { callId, length: transcriptText.length });

        const { data: existingCall } = await supabase
          .from("openphone_calls")
          .select("duration, call_date, caller_number, receiver_number")
          .eq("call_id", callId)
          .single();

        // Re-classify with actual transcript
        const classification = await classifyCallWithClaude(
          transcriptText,
          existingCall?.duration || 0,
          existingCall?.call_date || new Date().toISOString(),
          existingCall?.caller_number || "Unknown",
        );

        // Extract phone number from transcript event
        const callerNumber = callData.from || callData.phoneNumber || existingCall?.caller_number || "Unknown";
        const receiverNumber = callData.to || callData.receiverNumber || existingCall?.receiver_number || "Unknown";
        
        // Enhanced duration extraction - check multiple sources (transcript.completed handler)
        let duration = existingCall?.duration || 0;
        if (callData.duration) {
          duration = callData.duration;
        } else if (callData.media?.[0]?.duration) {
          duration = callData.media[0].duration;
        } else if (callData.callTranscript?.duration) {
          duration = callData.callTranscript.duration;
        } else if (callData.completedAt && callData.createdAt) {
          duration = calculateDuration(callData.createdAt, callData.completedAt);
        }
        duration = Math.round(Number(duration));
        if (!Number.isFinite(duration) || duration < 0) duration = 0;
        console.log(`[OpenPhone] 🕑 normalized duration`, { callId, duration });

        // Removed verbose extracted-data log in production
        // console.log(`📊 Extracted data for ${callId}:`, { callerNumber, receiverNumber, duration, hasTranscript: !!transcriptText });

        const updateData = {
          transcript: transcriptText,
          caller_number: callerNumber,
          receiver_number: receiverNumber,
          duration: duration,
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

        // console.log("Final object sent to Supabase (transcript update):", updateData);

        const { error: updateError } = await supabase
          .from("openphone_calls")
          .update(updateData)
          .eq("call_id", callId);

        if (updateError) {
          console.error("[OpenPhone] ❌ transcript update failed", { callId, error: updateError.message });
          return NextResponse.json(
            {
              error: "Failed to update transcript",
              details: updateError.message,
            },
            { status: 500 },
          );
        }

        console.log(`[OpenPhone] ✅ transcript processed`, { callId, transcriptLength: transcriptText.length, duration });

        // NEW: Enhanced AI analysis using refined categorization system
        try {
          const direction = callData.direction || existingCall?.direction || 'inbound';
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              call_id: callId,
              transcript: transcriptText,
              direction,
              duration,
              caller_number: callerNumber,
              call_date: existingCall?.call_date || new Date().toISOString(),
            }),
          });
          console.log(`[OpenPhone] 🤖 Enhanced AI analysis triggered`, { callId });
        } catch (analysisError) {
          // Don't fail the webhook if analysis fails
          console.error(`[OpenPhone] ⚠️ Enhanced analysis failed (non-blocking)`, { callId, error: analysisError });
        }

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
      // 3️⃣ Handle call.recording.completed events
      // ============================================================
      console.log("🔍 DEBUG: Checking event type:", eventType, "for recording handler");
      if (eventType === "call.recording.completed") {
        console.log("🎥 Processing call.recording.completed event for call:", callId);
        console.log("⚡ ACTION: CHECK FOR TRANSCRIPT IN RECORDING EVENT");
        
        // Check if this recording event contains transcript data
        let transcriptText = callData.transcript || callData.transcription?.text || null;
        
        if (!transcriptText && callData.callTranscript?.dialogue) {
          transcriptText = callData.callTranscript.dialogue
            .map((d: any) => `Speaker ${d.speaker}: ${d.content}`)
            .join("\n");
        }
        
        if (transcriptText) {
          console.log("📝 Found transcript in recording event, processing...");
          
          // Update existing call with transcript
          const { data: existingCall } = await supabase
            .from("openphone_calls")
            .select("duration, call_date, caller_number, receiver_number")
            .eq("call_id", callId)
            .single();

          if (existingCall) {
            // Re-classify with actual transcript
            const classification = await classifyCallWithClaude(
              transcriptText,
              existingCall?.duration || 0,
              existingCall?.call_date || new Date().toISOString(),
              existingCall?.caller_number || "Unknown",
            );

            // Extract phone number from recording event
            const callerNumber = callData.from || callData.phoneNumber || existingCall?.caller_number || "Unknown";
            const receiverNumber = callData.to || callData.receiverNumber || existingCall?.receiver_number || "Unknown";
            
            // Enhanced duration extraction - check multiple sources (recording event handler)
            let duration = existingCall?.duration || 0;
            if (callData.duration) {
              duration = callData.duration;
            } else if (callData.media?.[0]?.duration) {
              duration = callData.media[0].duration;
            } else if (callData.callTranscript?.duration) {
              duration = callData.callTranscript.duration;
            } else if (callData.completedAt && callData.createdAt) {
              duration = calculateDuration(callData.createdAt, callData.completedAt);
            }
            duration = Math.round(Number(duration));
            if (!Number.isFinite(duration) || duration < 0) duration = 0;
            console.log(`[OpenPhone] 🕑 normalized duration`, { callId, duration });

            // console.log(`📊 Recording event - Extracted data for ${callId}:`, { callerNumber, receiverNumber, duration, hasTranscript: !!transcriptText });

            const updateData = {
              transcript: transcriptText,
              caller_number: callerNumber,
              receiver_number: receiverNumber,
              duration: duration,
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

            console.log(`✅ Call ${callId} transcript updated from recording event`);
            
            // NEW: Enhanced AI analysis using refined categorization system
            try {
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  call_id: callId,
                  transcript: transcriptText,
                  direction: callData.direction || existingCall?.direction || 'inbound',
                  duration,
                  caller_number: callerNumber,
                  call_date: existingCall?.call_date || new Date().toISOString(),
                }),
              });
              console.log(`[OpenPhone] 🤖 Enhanced AI analysis triggered (recording event)`, { callId });
            } catch (analysisError) {
              console.error(`[OpenPhone] ⚠️ Enhanced analysis failed (non-blocking)`, { callId, error: analysisError });
            }
            
            return NextResponse.json({
              success: true,
              message: "Recording event processed and transcript updated",
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
        }
        
        console.log("📝 No transcript found in recording event");
        return NextResponse.json({
          success: true,
          message: "Recording event processed (no transcript)",
          call_id: callId,
          event_type: eventType,
        });
      }

      // ============================================================
      // 4️⃣ Handle other call events (ringing, answered, ended, failed)
      // ============================================================
      if (eventType === "call.ringing" || eventType === "call.answered" || 
          eventType === "call.ended" || eventType === "call.failed") {
        console.log(`📞 Processing ${eventType} event for call:`, callId);
        console.log("⚡ ACTION: LOGGING ONLY - These events don't create database records");
        
        // For now, just log these events - they don't need database storage
        // but we can use them for analytics or debugging
        console.log(`Call ${callId} event: ${eventType}`);
        
        return NextResponse.json({
          success: true,
          message: `${eventType} event logged`,
          call_id: callId,
          event_type: eventType,
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
        debug: {
          eventType: eventType,
          eventTypeLength: eventType?.length,
          isCallRecordingCompleted: eventType === "call.recording.completed",
          charCodes: eventType?.split('').map((c: string) => c.charCodeAt(0))
        }
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
    // Keyword-based fallback (when no API key configured)
    const transcriptLower = transcript.toLowerCase();
    
    // Exclusion patterns - NEVER mark as booked
    const exclusionPatterns = [
      "calling from",
      "i'm calling from",
      "invoice",
      "bill",
      "receipt",
      "payment",
      "i have the part",
      "part arrived",
      "checking status",
      "just following up",
      "rebate",
      "permit"
    ];
    
    const hasExclusion = exclusionPatterns.some(pattern => transcriptLower.includes(pattern));
    
    // Scheduling keywords (must be present)
    const schedulingKeywords = [
      "when can you come",
      "what time can you",
      "tomorrow at",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "i'm available at"
    ];
    
    const hasScheduling = schedulingKeywords.some(kw => transcriptLower.includes(kw));
    
    // Agreement keywords
    const agreementKeywords = [
      "go ahead",
      "yes please",
      "book it",
      "send someone out"
    ];
    
    const hasAgreement = agreementKeywords.some(kw => transcriptLower.includes(kw));
    
    const serviceKeywords = {
      "Water Heater": ["water heater", "hot water tank", "no hot water"],
      "Drain": ["drain cleaning", "clogged drain", "backed up drain", "snake"],
      "HVAC": ["furnace", "ac unit", "hvac", "air conditioning", "heating"],
      "Plumbing": ["plumber", "plumbing", "pipe", "leak", "toilet", "sink", "faucet"],
    };
    
    const emergencyKeywords = [
      "emergency",
      "flooding",
      "burst",
      "no heat",
      "leaking badly",
    ];

    const hasBooked = !hasExclusion && hasScheduling && hasAgreement;
    const isEmergency = emergencyKeywords.some((kw) => transcriptLower.includes(kw));

    let serviceType = null;
    for (const [type, keywords] of Object.entries(serviceKeywords)) {
      if (keywords.some((kw) => transcriptLower.includes(kw))) {
        serviceType = type;
        break;
      }
    }

    return {
      outcome: hasBooked ? "Booked" : "Inquiry",
      booked: hasBooked,
      service_type: serviceType,
      pipeline_stage: hasBooked ? "Booked" : (hasExclusion ? "Follow-Up" : "Inquiry"),
      sentiment: "Neutral",
      is_emergency: isEmergency,
      summary: `${serviceType || "General"} ${hasExclusion ? "follow-up" : "inquiry"}. ${isEmergency ? "EMERGENCY. " : ""}${hasBooked ? "Customer agreed to proceed." : "No commitment yet."}`,
      notes: "Keyword-based classification (no AI available)",
      confidence_score: 40,
    };
  }

  try {
    const guideText = await getClassificationGuide();
    const prompt = `You are analyzing a phone call transcript for a plumbing and HVAC company. Extract key details and classify the call.

CALL TRANSCRIPT:
${transcript}

CALL METADATA:
- Duration: ${duration} seconds
- Date: ${callDate}
- Contact: ${contactName}

BUSINESS CLASSIFICATION GUIDE (authoritative):
${guideText}

CLASSIFICATION RULES FOR PLUMBING/HVAC BUSINESS:

1. **booked** (boolean):
   - TRUE ONLY IF ALL THREE CONDITIONS ARE MET:
     a) CSR explains service process/fees AND customer acknowledges ("ok", "that's fine", "sounds good", "go ahead")
     b) Clear scheduling commitment with specific timing ("when can you come?", "tomorrow at X", "Monday morning", "I'm available at [time]")
     c) Customer is booking NEW service (not just following up on existing work)
   
   - AUTOMATIC FALSE (NEVER mark as booked):
     * Vendor/contractor calls: "This is [name] calling from [company]" or "I'm calling from [business name]"
     * Invoice/billing questions: mentions "invoice", "bill", "receipt", "payment", "charge"
     * Parts follow-up: "I have the part", "part arrived", "part is here"
     * Status checks: "checking status", "just following up on", "what's the status"
     * Internal staff coordination: employees talking to each other
   
   - BOOKING PHRASES (must be combined with service fee discussion):
     * "send someone out", "what time can you be here?", "I'll be home at [time]"
     * "how soon can you get here?", "when can you come?", "what's your availability?"
     * "I'm available [day/time]", "book it for tomorrow"
   
   - FALSE if just inquiring, price shopping, or no clear commitment

2. **service_type** (string or null):
   - WATER HEATER: "water heater", "hot water tank", "no hot water", "tank leaking", "pilot light", "thermostat"
   - HVAC: "furnace", "AC", "air conditioning", "heating", "cooling", "thermostat", "heat pump", "air handler", "ductwork"
   - PLUMBING: "toilet", "sink", "faucet", "pipe burst", "leak", "fixture", "shower", "bathtub", "garbage disposal"
   - DRAIN: "drain cleaning", "clogged drain", "snake", "slow drain", "backup", "sewer", "main line"
   - GENERAL: "plumbing", "repair", "service call", "maintenance"
   - Be specific if possible, null if unclear

3. **is_emergency** (boolean):
   - CRITICAL (immediate response): "flooding", "burst pipe", "water everywhere", "no heat" (winter), "gas smell", "gas leak", "basement flooded", "sewage backup", "leaking badly"
   - URGENT (same day): "no hot water", "toilet overflowing", "leak getting worse", "AC not working" (summer), "emergency", "as soon as possible"
   - FALSE for routine maintenance or non-urgent issues

4. **sentiment** (string):
   - "Positive" - friendly, cooperative, satisfied, grateful
   - "Neutral" - matter-of-fact, business-like, calm
   - "Negative" - frustrated, angry, upset, demanding

5. **pipeline_stage** (string):
   - "Booked" - Customer agreed to service and scheduling discussed
   - "Quote Needed" - Needs estimate first, pricing discussed
   - "Follow-Up" - Call back later, not ready to book
   - "Inquiry" - Just asking questions, gathering information
   - "Closed-Lost" - Not interested, price shopping, going elsewhere

6. **outcome** (string):
   - Brief description: "Booked water heater repair", "Emergency drain cleaning", "HVAC maintenance inquiry", "Price shopping for plumbing"

7. **summary** (string):
   - 1-2 sentences: what happened, key details, next steps, urgency level

8. **notes** (string):
   - Important details: address mentioned, preferred times, special requests, concerns, urgency level, specific symptoms

9. **confidence_score** (0-100):
   - How confident are you in this classification? Consider transcript clarity and explicit language

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
      const errorBody = await response.text();
      console.error(`Claude API error: ${response.status}`, errorBody);
      throw new Error(`Claude API error: ${response.status} - ${errorBody.substring(0, 200)}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error("Claude API returned unexpected format:", JSON.stringify(data));
      throw new Error("Claude API returned unexpected response format");
    }
    
    const responseText = data.content[0].text;
    console.log("[Claude] Classification successful, confidence:", data.content[0].text.match(/"confidence_score":\s*(\d+)/)?.[1] || "unknown");

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
    const transcriptLower = transcript.toLowerCase();
    
    // Exclusion patterns - NEVER mark as booked if these are present
    const exclusionPatterns = [
      "calling from",
      "i'm calling from",
      "this is .* calling from",
      "invoice",
      "bill",
      "receipt",
      "payment",
      "i have the part",
      "part arrived",
      "part is here",
      "checking status",
      "just following up",
      "what's the status",
      "status check",
      "rebate",
      "permit",
      "inspection"
    ];
    
    const hasExclusion = exclusionPatterns.some(pattern => {
      if (pattern.includes(".*")) {
        return new RegExp(pattern).test(transcriptLower);
      }
      return transcriptLower.includes(pattern);
    });
    
    // Scheduling keywords (must be present for booking)
    const schedulingKeywords = [
      "when can you come",
      "what time can you be here",
      "i'll be home at",
      "how soon can you get here",
      "tomorrow at",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "what's your availability",
      "i'm available at"
    ];
    
    const hasScheduling = schedulingKeywords.some(kw => transcriptLower.includes(kw));
    
    // Agreement keywords (must combine with scheduling)
    const agreementKeywords = [
      "send someone out",
      "go ahead",
      "yes please",
      "book it",
      "that's fine",
      "sounds good"
    ];
    
    const hasAgreement = agreementKeywords.some(kw => transcriptLower.includes(kw));
    
    const serviceKeywords = {
      "Water Heater": [
        "water heater", 
        "hot water tank", 
        "no hot water", 
        "tank leaking", 
        "pilot light"
      ],
      "HVAC": [
        "furnace",
        "ac ",
        "air conditioning", 
        "heating",
        "cooling",
        "heat pump",
        "air handler",
        "hvac"
      ],
      "Plumbing": [
        "toilet",
        "sink", 
        "faucet",
        "pipe burst",
        "leak",
        "fixture",
        "shower",
        "bathtub",
        "plumber",
        "plumbing",
        "sewer"
      ],
      "Drain": [
        "drain cleaning",
        "clogged drain",
        "snake",
        "slow drain",
        "backup"
      ],
    };
    
    const emergencyKeywords = [
      "flooding",
      "burst pipe", 
      "water everywhere",
      "no heat",
      "gas smell",
      "gas leak",
      "basement flooded",
      "sewage backup",
      "leaking badly",
      "emergency"
    ];

    // Only mark as booked if:
    // 1. No exclusion patterns present
    // 2. Has scheduling language
    // 3. Has agreement language
    const hasBooked = !hasExclusion && hasScheduling && hasAgreement;
    
    const isEmergency = emergencyKeywords.some((kw) =>
      transcriptLower.includes(kw),
    );

    let serviceType = null;
    for (const [type, keywords] of Object.entries(serviceKeywords)) {
      if (keywords.some((kw) => transcriptLower.includes(kw))) {
        serviceType = type;
        break;
      }
    }

    return {
      outcome: hasBooked ? "Booked" : "Inquiry",
      booked: hasBooked,
      service_type: serviceType,
      pipeline_stage: hasBooked ? "Booked" : (hasExclusion ? "Follow-Up" : "Inquiry"),
      sentiment: "Neutral",
      is_emergency: isEmergency,
      summary: `${serviceType || "General"} ${hasExclusion ? "follow-up" : "inquiry"}. ${isEmergency ? "EMERGENCY. " : ""}${hasBooked ? "Customer agreed to proceed." : "No commitment yet."}`,
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
      "call.recording.completed",
      "call.ringing",
      "call.answered",
      "call.ended",
      "call.failed",
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
