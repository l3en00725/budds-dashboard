const OPENPHONE_API_KEY = 'HCHrJrk0WhvrTskPoLF5hsGOeOpV0VVD';
const OPENPHONE_API_BASE_URL = 'https://api.openphone.com/v1';

async function testOpenPhoneAPI() {
  console.log('Testing OpenPhone API...');

  const mainPhoneId = "PN7r9F5MtW"; // Budd's Plumbing main line
  const today = new Date().toISOString().split('T')[0];

  // Current implementation URL
  const currentUrl = `${OPENPHONE_API_BASE_URL}/calls?phoneNumberId=${mainPhoneId}&participants[]=any&createdAt[gte]=${today}T00:00:00Z&createdAt[lt]=${today}T23:59:59Z`;

  console.log('Current URL:', currentUrl);
  console.log('Date filter:', today);

  try {
    // Test 1: Current implementation
    console.log('\n--- Test 1: Current Implementation ---');
    const response1 = await fetch(currentUrl, {
      headers: {
        'Authorization': OPENPHONE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', response1.status);
    console.log('Headers:', Object.fromEntries(response1.headers.entries()));

    if (!response1.ok) {
      const errorText = await response1.text();
      console.log('Error response:', errorText);
    } else {
      const data1 = await response1.json();
      console.log('Success! Data structure:', JSON.stringify(data1, null, 2));
    }

    // Test 2: Try with Bearer prefix
    console.log('\n--- Test 2: With Bearer Prefix ---');
    const response2 = await fetch(currentUrl, {
      headers: {
        'Authorization': `Bearer ${OPENPHONE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', response2.status);
    if (!response2.ok) {
      const errorText2 = await response2.text();
      console.log('Error response:', errorText2);
    } else {
      const data2 = await response2.json();
      console.log('Success! Data structure:', JSON.stringify(data2, null, 2));
    }

    // Test 3: Try without participants parameter
    console.log('\n--- Test 3: Without Participants Parameter ---');
    const urlWithoutParticipants = `${OPENPHONE_API_BASE_URL}/calls?phoneNumberId=${mainPhoneId}&createdAt[gte]=${today}T00:00:00Z&createdAt[lt]=${today}T23:59:59Z`;
    console.log('URL without participants:', urlWithoutParticipants);

    const response3 = await fetch(urlWithoutParticipants, {
      headers: {
        'Authorization': `Bearer ${OPENPHONE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', response3.status);
    if (!response3.ok) {
      const errorText3 = await response3.text();
      console.log('Error response:', errorText3);
    } else {
      const data3 = await response3.json();
      console.log('Success! Data structure:', JSON.stringify(data3, null, 2));
    }

    // Test 4: Try broader date range (last 7 days)
    console.log('\n--- Test 4: Last 7 Days ---');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const broadUrl = `${OPENPHONE_API_BASE_URL}/calls?phoneNumberId=${mainPhoneId}&createdAt[gte]=${sevenDaysAgoStr}T00:00:00Z`;
    console.log('Broad URL (7 days):', broadUrl);

    const response4 = await fetch(broadUrl, {
      headers: {
        'Authorization': `Bearer ${OPENPHONE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Status:', response4.status);
    if (!response4.ok) {
      const errorText4 = await response4.text();
      console.log('Error response:', errorText4);
    } else {
      const data4 = await response4.json();
      console.log('Success! Found', data4.data?.length || 0, 'calls in last 7 days');
      if (data4.data && data4.data.length > 0) {
        console.log('Sample call:', JSON.stringify(data4.data[0], null, 2));
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testOpenPhoneAPI();