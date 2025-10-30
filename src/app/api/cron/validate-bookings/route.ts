import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

/**
 * Nightly cron job to validate AI booking classifications against actual Jobber job creation
 *
 * Purpose: Measure accuracy of AI "classified_as_booked" field by cross-referencing
 * with real Jobber jobs created within 48 hours of the call.
 *
 * Schedule: Run daily via Vercel cron (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/validate-bookings",
 *     "schedule": "0 2 * * *"  // 2 AM daily
 *   }]
 * }
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Get calls from last 7 days that are marked as booked by AI
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: bookedCalls, error: callsError } = await supabase
      .from('openphone_calls')
      .select('id, call_id, caller_number, call_date, classified_as_booked, booking_validated')
      .gte('call_date', sevenDaysAgo.toISOString())
      .eq('classified_as_booked', true)
      .eq('direction', 'inbound')
      .is('booking_validated', null); // Only check unvalidated calls

    if (callsError) {
      console.error('Error fetching booked calls:', callsError);
      throw callsError;
    }

    if (!bookedCalls || bookedCalls.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unvalidated bookings to check',
        validated: 0,
        confirmed: 0,
        falsePositives: 0,
      });
    }

    let confirmedBookings = 0;
    let falsePositives = 0;

    for (const call of bookedCalls) {
      const callDate = new Date(call.call_date);
      const windowEnd = new Date(callDate.getTime() + 48 * 60 * 60 * 1000); // +48 hours

      // Extract phone digits from caller_number (remove +1, spaces, dashes)
      const phoneDigits = call.caller_number
        ?.replace(/[\s\-\(\)\+]/g, '')
        .replace(/^1/, ''); // Remove leading 1 from US numbers

      // Look for matching Jobber job created within 48 hours
      const { data: matchingJobs, error: jobsError } = await supabase
        .from('jobber_jobs')
        .select('job_id, client_name, client_id, created_at_jobber')
        .gte('created_at_jobber', callDate.toISOString())
        .lte('created_at_jobber', windowEnd.toISOString())
        .or(
          // Match by client name containing phone digits OR client_id match
          `client_name.ilike.%${phoneDigits}%,client_id.eq.${call.caller_number}`
        )
        .limit(1);

      if (jobsError) {
        console.error(`Error querying jobs for call ${call.call_id}:`, jobsError);
        continue;
      }

      // Update validation result
      if (matchingJobs && matchingJobs.length > 0) {
        // TRUE POSITIVE: AI correctly identified booking
        confirmedBookings++;
        await supabase
          .from('openphone_calls')
          .update({
            booking_validated: true,
            jobber_job_id: matchingJobs[0].job_id,
            validation_checked_at: new Date().toISOString(),
          })
          .eq('id', call.id);

        console.log(`✅ Confirmed booking: Call ${call.call_id} → Job ${matchingJobs[0].job_id}`);
      } else {
        // FALSE POSITIVE: AI said booked but no job was created
        falsePositives++;
        await supabase
          .from('openphone_calls')
          .update({
            booking_validated: false,
            jobber_job_id: null,
            validation_checked_at: new Date().toISOString(),
          })
          .eq('id', call.id);

        console.log(`❌ False positive: Call ${call.call_id} - No matching job found`);
      }
    }

    const accuracyRate = bookedCalls.length > 0
      ? Math.round((confirmedBookings / bookedCalls.length) * 100)
      : 0;

    console.log(`📊 Booking Validation Summary:
      - Total validated: ${bookedCalls.length}
      - Confirmed bookings: ${confirmedBookings}
      - False positives: ${falsePositives}
      - Accuracy rate: ${accuracyRate}%
    `);

    return NextResponse.json({
      success: true,
      validated: bookedCalls.length,
      confirmed: confirmedBookings,
      falsePositives,
      accuracyRate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Booking validation cron error:', error);
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
