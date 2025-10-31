import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

/**
 * Test endpoint to validate categorization accuracy
 * Fetches recent calls and displays their analysis
 * GET /api/debug/test-categorization
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Get 10 recent calls with transcripts
    const { data: calls, error: callsError } = await supabase
      .from('openphone_calls')
      .select('call_id, caller_number, call_date, duration, direction, transcript, classified_as_booked')
      .not('transcript', 'is', null)
      .neq('transcript', '')
      .not('call_id', 'like', 'test%')
      .order('call_date', { ascending: false })
      .limit(10);

    if (callsError) {
      throw callsError;
    }

    if (!calls || calls.length === 0) {
      return NextResponse.json({
        message: 'No calls with transcripts found',
        calls: [],
      });
    }

    // Get their analyses
    const callIds = calls.map(c => c.call_id);
    const { data: analyses, error: analysesError } = await supabase
      .from('calls_ai_analysis')
      .select('*')
      .in('call_id', callIds);

    if (analysesError) {
      throw analysesError;
    }

    const analysisMap = new Map(
      analyses?.map(a => [a.call_id, a]) || []
    );

    // Combine and format for display
    const results = calls.map(call => {
      const analysis = analysisMap.get(call.call_id);
      const transcriptPreview = call.transcript?.substring(0, 200) || '';
      
      return {
        call_id: call.call_id,
        caller_number: call.caller_number,
        call_date: call.call_date,
        duration: call.duration,
        direction: call.direction,
        classified_as_booked: call.classified_as_booked,
        transcript_preview: transcriptPreview + (call.transcript.length > 200 ? '...' : ''),
        transcript_length: call.transcript.length,
        analysis: analysis ? {
          category: analysis.category,
          intent: analysis.intent,
          sentiment: analysis.sentiment,
          service_detail: analysis.service_detail,
          customer_need: analysis.customer_need,
          confidence: analysis.confidence,
          needs_review: analysis.needs_review,
          analyzed_at: analysis.analyzed_at,
        } : null,
      };
    });

    // Calculate stats
    const withAnalysis = results.filter(r => r.analysis !== null);
    const needsReview = withAnalysis.filter(r => r.analysis?.needs_review);
    const highConfidence = withAnalysis.filter(r => r.analysis && r.analysis.confidence >= 0.8);
    
    const categoryBreakdown = withAnalysis.reduce((acc, r) => {
      const cat = r.analysis?.category || 'Unknown';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const intentBreakdown = withAnalysis.reduce((acc, r) => {
      const intent = r.analysis?.intent || 'Unknown';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Check for "HVAC inquiry" generic issue
    const genericHVACissue = withAnalysis.filter(r => 
      r.analysis?.service_detail?.toLowerCase().includes('hvac inquiry') ||
      r.analysis?.service_detail?.toLowerCase().includes('general inquiry')
    );

    return NextResponse.json({
      summary: {
        total_calls: results.length,
        with_analysis: withAnalysis.length,
        needs_review: needsReview.length,
        high_confidence: highConfidence.length,
        accuracy_rate: withAnalysis.length > 0 
          ? `${Math.round((highConfidence.length / withAnalysis.length) * 100)}%`
          : '0%',
        generic_hvac_issue_count: genericHVACissue.length,
      },
      category_breakdown: categoryBreakdown,
      intent_breakdown: intentBreakdown,
      calls: results,
      validation: {
        passed: genericHVACissue.length === 0 && highConfidence.length >= withAnalysis.length * 0.7,
        issues: [
          ...(genericHVACissue.length > 0 ? [`Found ${genericHVACissue.length} generic "HVAC inquiry" classifications`] : []),
          ...(highConfidence.length < withAnalysis.length * 0.7 ? ['Less than 70% high confidence'] : []),
        ],
      },
    });

  } catch (error) {
    console.error('Test categorization error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to analyze a specific set of calls
 */
export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // Get 10 recent calls
    const { data: calls } = await supabase
      .from('openphone_calls')
      .select('call_id, transcript, direction, duration, caller_number, call_date')
      .not('transcript', 'is', null)
      .neq('transcript', '')
      .not('call_id', 'like', 'test%')
      .order('call_date', { ascending: false })
      .limit(10);

    if (!calls || calls.length === 0) {
      return NextResponse.json({
        message: 'No calls to analyze',
        processed: 0,
      });
    }

    // Analyze each one
    let successCount = 0;
    const results = [];

    for (const call of calls) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calls/analyze`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

        if (response.ok) {
          const data = await response.json();
          successCount++;
          results.push({
            call_id: call.call_id,
            success: true,
            analysis: data.analysis,
          });
        } else {
          const error = await response.json();
          results.push({
            call_id: call.call_id,
            success: false,
            error: error.error,
          });
        }
      } catch (error) {
        results.push({
          call_id: call.call_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Analyzed ${calls.length} calls`,
      successful: successCount,
      failed: calls.length - successCount,
      results,
    });

  } catch (error) {
    console.error('Batch analysis error:', error);
    return NextResponse.json(
      {
        error: 'Batch analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

