const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gthftbdmschwpjjqhyhm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0aGZ0YmRtc2Nod3BqanFoeWhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTA5MDY4NywiZXhwIjoyMDc0NjY2Njg3fQ.v3QwdqfYOOs0eL_G3ykL3b_xBsgjO2Zh5ccqSrTpl-0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestCallsForToday() {
  const today = new Date().toISOString().split('T')[0];
  const todayDateTime = `${today}T09:30:00`;

  console.log(`Adding test calls for today: ${today}`);

  const testCalls = [
    {
      call_id: `test-call-today-1-${Date.now()}`,
      caller_number: '+15551234567',
      direction: 'inbound',
      duration: 180,
      transcript: 'Hi, I need a plumber urgently. My kitchen sink is leaking badly and water is everywhere. Can someone come out today? I can pay emergency rates.',
      classified_as_booked: true,
      classification_confidence: 0.92,
      call_date: `${today}T09:30:00`,
      pulled_at: new Date().toISOString(),
    },
    {
      call_id: `test-call-today-2-${Date.now()}`,
      caller_number: '+15559876543',
      direction: 'inbound',
      duration: 120,
      transcript: 'Hello, I would like to schedule a routine maintenance for my water heater. When do you have availability next week?',
      classified_as_booked: true,
      classification_confidence: 0.88,
      call_date: `${today}T11:15:00`,
      pulled_at: new Date().toISOString(),
    },
    {
      call_id: `test-call-today-3-${Date.now()}`,
      caller_number: '+15555551234',
      direction: 'inbound',
      duration: 45,
      transcript: 'Hi, I was calling to ask about your pricing for toilet installation. Just getting quotes.',
      classified_as_booked: false,
      classification_confidence: 0.75,
      call_date: `${today}T14:20:00`,
      pulled_at: new Date().toISOString(),
    },
    {
      call_id: `test-call-today-4-${Date.now()}`,
      caller_number: '+15558887777',
      direction: 'inbound',
      duration: 300,
      transcript: 'We have a burst pipe in our basement! This is an emergency. How quickly can you get here? Water is everywhere!',
      classified_as_booked: true,
      classification_confidence: 0.95,
      call_date: `${today}T16:45:00`,
      pulled_at: new Date().toISOString(),
    },
    {
      call_id: `test-call-today-5-${Date.now()}`,
      caller_number: '+15554443333',
      direction: 'inbound',
      duration: 25,
      transcript: 'Wrong number, sorry.',
      classified_as_booked: false,
      classification_confidence: 0.2,
      call_date: `${today}T10:05:00`,
      pulled_at: new Date().toISOString(),
    }
  ];

  try {
    for (const call of testCalls) {
      const { data, error } = await supabase
        .from('openphone_calls')
        .insert(call);

      if (error) {
        console.error('Error inserting call:', error);
      } else {
        console.log(`Inserted call: ${call.call_id} - ${call.classified_as_booked ? 'BOOKED' : 'NOT BOOKED'}`);
      }
    }

    console.log('\nTest calls added successfully!');
    console.log(`Total calls for ${today}: ${testCalls.length}`);
    console.log(`Booked appointments: ${testCalls.filter(c => c.classified_as_booked).length}`);
    console.log(`Emergency calls: ${testCalls.filter(c => c.transcript.toLowerCase().includes('emergency') || c.transcript.toLowerCase().includes('urgent')).length}`);

  } catch (error) {
    console.error('Failed to add test calls:', error);
  }
}

addTestCallsForToday();