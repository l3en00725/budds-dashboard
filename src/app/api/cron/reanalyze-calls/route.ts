import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

/**
 * Cron job to re-analyze calls that:
 * 1. Have no analysis yet
 * 2. Have low confidence (<0.6)
 * 3. Were analyzed with an old version
 * 
 * Run this nightly via Vercel Cron or external scheduler
 * GET /api/cron/reanalyze-calls
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceRoleClient();
    
    // Find calls that need re-analysis
    // 1. Get all calls with transcripts from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: calls, error: callsError } = await supabase
      .from('openphone_calls')
      .select('call_id, transcript, direction, duration, caller_number, call_date')
      .gte('call_date', thirtyDaysAgo)
      .not('transcript', 'is', null)
      .neq('transcript', '')
      .not('call_id', 'like', 'test%')
      .not('call_id', 'like', 'ACtest%');

    if (callsError) {
      throw callsError;
    }

    if (!calls || calls.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No calls to analyze',
        processed: 0,
      });
    }

    // 2. Get existing analyses
    const { data: existingAnalyses, error: analysesError } = await supabase
      .from('calls_ai_analysis')
      .select('call_id, confidence, needs_review, analysis_version');

    if (analysesError) {
      throw analysesError;
    }

    const existingMap = new Map(
      existingAnalyses?.map(a => [a.call_id, a]) || []
    );

    // 3. Filter calls that need (re-)analysis
    const callsToAnalyze = calls.filter(call => {
      const existing = existingMap.get(call.call_id);
      
      // No analysis yet
      if (!existing) return true;
      
      // Low confidence
      if (existing.confidence < 0.6) return true;
      
      // Flagged for review
      if (existing.needs_review) return true;
      
      // Old analysis version (if you update prompts, increment version)
      if (existing.analysis_version !== 'v1.0') return true;
      
      return false;
    });

    console.log(`[Reanalyze Cron] Found ${callsToAnalyze.length} calls to analyze out of ${calls.length} total`);

    // 4. Re-analyze in batches (limit to avoid timeouts)
    const BATCH_SIZE = 50;
    const batch = callsToAnalyze.slice(0, BATCH_SIZE);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const call of batch) {
      try {
        // Call the analyze endpoint
        const analyzeResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/analyze`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              call_id: call.call_id,
              transcript: call.transcript,
              direction: call.direction || 'inbound',
              duration: call.duration || 0,
              caller_number: call.caller_number,
              call_date: call.call_date,
            }),
          }
        );

        if (analyzeResponse.ok) {
          successCount++;
        } else {
          errorCount++;
          const errorData = await analyzeResponse.json();
          errors.push({
            call_id: call.call_id,
            error: errorData.error || 'Unknown error',
          });
        }
      } catch (error) {
        errorCount++;
        errors.push({
          call_id: call.call_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${batch.length} calls`,
      stats: {
        totalCallsInDB: calls.length,
        callsNeedingAnalysis: callsToAnalyze.length,
        processedInBatch: batch.length,
        successful: successCount,
        failed: errorCount,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });

  } catch (error) {
    console.error('[Reanalyze Cron] Error:', error);
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

