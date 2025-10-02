const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gthftbdmschwpjjqhyhm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aGZ0YmRtc2Nod3BqanFoeWhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA5MDY4NywiZXhwIjoyMDc0NjY2Njg3fQ.v3QwdqfYOOs0eL_G3ykL3b_xBsgjO2Zh5ccqSrTpl-0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('Checking OpenPhone calls in database...');

  try {
    // Check if openphone_calls table exists and has data
    const { data: calls, error } = await supabase
      .from('openphone_calls')
      .select('*')
      .order('call_date', { ascending: false })
      .limit(10);

    if (error) {
      console.log('Error querying calls:', error);
      return;
    }

    console.log(`Found ${calls.length} calls in database`);

    if (calls.length > 0) {
      console.log('\nRecent calls:');
      calls.forEach((call, i) => {
        console.log(`${i + 1}. Call ID: ${call.call_id}, Date: ${call.call_date}, Booked: ${call.classified_as_booked}, Transcript: ${call.transcript ? call.transcript.substring(0, 100) + '...' : 'No transcript'}`);
      });
    } else {
      console.log('No calls found in database');
    }

    // Check sync logs
    const { data: syncLogs, error: syncError } = await supabase
      .from('sync_log')
      .select('*')
      .eq('sync_type', 'openphone_calls')
      .order('started_at', { ascending: false })
      .limit(5);

    if (syncError) {
      console.log('Error querying sync logs:', syncError);
      return;
    }

    console.log(`\nFound ${syncLogs.length} sync logs:`);
    syncLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log.started_at}: ${log.status}, Records: ${log.records_synced}, Error: ${log.error_message || 'None'}`);
    });

    // Check today's calls specifically
    const today = new Date().toISOString().split('T')[0];
    const { data: todayCalls, error: todayError } = await supabase
      .from('openphone_calls')
      .select('*')
      .gte('call_date', today)
      .lt('call_date', `${today}T23:59:59`);

    if (todayError) {
      console.log('Error querying today\'s calls:', todayError);
    } else {
      console.log(`\nToday (${today}) calls: ${todayCalls.length}`);
      todayCalls.forEach((call, i) => {
        console.log(`${i + 1}. ${call.call_date}: ${call.caller_number}, Booked: ${call.classified_as_booked}`);
      });
    }

  } catch (error) {
    console.error('Database check failed:', error);
  }
}

checkDatabase();