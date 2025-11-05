/**
 * API KEY TEST SCRIPT
 *
 * Simple Node.js script to test API key authentication
 *
 * Usage:
 * 1. Generate an API key in the app (localhost:3000)
 * 2. Copy the full API key
 * 3. Run: node test-api.js YOUR_API_KEY_HERE
 */

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('❌ Error: No API key provided');
  console.log('\nUsage: node test-api.js YOUR_API_KEY');
  console.log('\nExample:');
  console.log('  node test-api.js org_j97a2b3c4d5e6f7g8h9i_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6\n');
  process.exit(1);
}

// Get Convex deployment URL
// IMPORTANT: HTTP endpoints are at .convex.site, NOT .convex.cloud!
// Extract deployment name from NEXT_PUBLIC_CONVEX_URL and construct .site URL
const CONVEX_CLOUD_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_CLOUD_URL) {
  console.error('❌ Error: NEXT_PUBLIC_CONVEX_URL not found in .env.local');
  console.log('\nPlease ensure your .env.local file has NEXT_PUBLIC_CONVEX_URL set\n');
  process.exit(1);
}

// Extract deployment name (e.g., "aromatic-akita-723" from "https://aromatic-akita-723.convex.cloud")
const deploymentMatch = CONVEX_CLOUD_URL.match(/https:\/\/([^.]+)\.convex\.cloud/);
if (!deploymentMatch) {
  console.error('❌ Error: Could not parse deployment name from NEXT_PUBLIC_CONVEX_URL');
  process.exit(1);
}

const deploymentName = deploymentMatch[1];
const CONVEX_URL = `https://${deploymentName}.convex.site`;

console.log('📝 Note: HTTP endpoints use .convex.site, not .convex.cloud');
console.log(`   Cloud URL: ${CONVEX_CLOUD_URL}`);
console.log(`   HTTP URL:  ${CONVEX_URL}\n`);

console.log('🔑 Testing API Key Authentication\n');
console.log('API Key:', apiKey.substring(0, 30) + '...');
console.log('Target:', CONVEX_URL);
console.log('─'.repeat(60));

/**
 * Test 1: Fetch Events
 */
async function testGetEvents() {
  console.log('\n📋 Test 1: GET /api/v1/events');
  console.log('─'.repeat(60));

  try {
    const url = `${CONVEX_URL}/api/v1/events`;
    console.log('Request URL:', url);
    console.log('Method: GET');
    console.log('Headers: Authorization: Bearer [API_KEY]');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('\nResponse Status:', response.status, response.statusText);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success!');
      console.log('\nResponse Data:');
      console.log(JSON.stringify(data, null, 2));

      if (data.events) {
        console.log(`\n📊 Found ${data.events.length} events`);
      }
    } else {
      console.log('❌ Failed!');
      console.log('\nError:', data.error || 'Unknown error');
    }

    return response.ok;
  } catch (error) {
    console.log('❌ Request Failed!');
    console.log('Error:', error.message);
    return false;
  }
}

/**
 * Test 2: Fetch Events with Query Params
 */
async function testGetEventsWithParams() {
  console.log('\n📦 Test 2: GET /api/v1/events?subtype=conference');
  console.log('─'.repeat(60));

  try {
    const url = `${CONVEX_URL}/api/v1/events?subtype=conference`;
    console.log('Request URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('\nResponse Status:', response.status, response.statusText);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success!');
      console.log('\nResponse Data:');
      console.log(JSON.stringify(data, null, 2));

      if (data.events) {
        console.log(`\n📊 Found ${data.events.length} events with subtype=conference`);
      }
    } else {
      console.log('❌ Failed!');
      console.log('\nError:', data.error || 'Unknown error');
    }

    return response.ok;
  } catch (error) {
    console.log('❌ Request Failed!');
    console.log('Error:', error.message);
    return false;
  }
}

/**
 * Test 3: Invalid API Key
 */
async function testInvalidKey() {
  console.log('\n🔒 Test 3: Invalid API Key (Should Fail)');
  console.log('─'.repeat(60));

  try {
    const url = `${CONVEX_URL}/api/v1/events`;
    const invalidKey = 'org_invalid_key_12345';
    console.log('Request URL:', url);
    console.log('Using Invalid Key:', invalidKey);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${invalidKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('\nResponse Status:', response.status, response.statusText);

    const data = await response.json();

    if (!response.ok) {
      console.log('✅ Correctly Rejected!');
      console.log('Error:', data.error);
    } else {
      console.log('❌ Should have been rejected!');
    }

    return !response.ok; // Success if it failed
  } catch (error) {
    console.log('❌ Request Failed!');
    console.log('Error:', error.message);
    return false;
  }
}

/**
 * Test 4: Missing Authorization Header
 */
async function testMissingAuth() {
  console.log('\n🚫 Test 4: Missing Authorization Header (Should Fail)');
  console.log('─'.repeat(60));

  try {
    const url = `${CONVEX_URL}/api/v1/events`;
    console.log('Request URL:', url);
    console.log('No Authorization header');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('\nResponse Status:', response.status, response.statusText);

    const data = await response.json();

    if (!response.ok) {
      console.log('✅ Correctly Rejected!');
      console.log('Error:', data.error);
    } else {
      console.log('❌ Should have been rejected!');
    }

    return !response.ok; // Success if it failed
  } catch (error) {
    console.log('❌ Request Failed!');
    console.log('Error:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n🧪 Running API Tests...\n');

  const results = {
    getEvents: await testGetEvents(),
    getEventsWithParams: await testGetEventsWithParams(),
    invalidKey: await testInvalidKey(),
    missingAuth: await testMissingAuth(),
  };

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });

  console.log('\n' + `${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! API key is working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.\n');
  }
}

// Run the tests
runTests().catch(console.error);
