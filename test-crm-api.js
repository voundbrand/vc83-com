/**
 * CRM API TEST SCRIPT
 *
 * Tests the new CRM API endpoints for contact management.
 *
 * Usage:
 * 1. Generate an API key in the app (localhost:3000)
 * 2. Copy the full API key
 * 3. Run: node test-crm-api.js YOUR_API_KEY_HERE
 */

// Get API key from command line argument
const apiKey = process.argv[2];

if (!apiKey) {
  console.error('❌ Error: No API key provided');
  console.log('\nUsage: node test-crm-api.js YOUR_API_KEY');
  console.log('\nExample:');
  console.log('  node test-crm-api.js org_kn7024kr1pag4ck3haeqaf29zs7sfd78_z93ta6b4aisnud363m91zxf34v0y2jy4\n');
  process.exit(1);
}

// Get Convex deployment URL
// IMPORTANT: HTTP endpoints are at .convex.site, NOT .convex.cloud!
const CONVEX_CLOUD_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_CLOUD_URL) {
  console.error('❌ Error: NEXT_PUBLIC_CONVEX_URL not found in .env.local');
  console.log('\nPlease ensure your .env.local file has NEXT_PUBLIC_CONVEX_URL set\n');
  process.exit(1);
}

// Extract deployment name
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

console.log('🔑 Testing CRM API Endpoints\n');
console.log('API Key:', apiKey.substring(0, 30) + '...');
console.log('Target:', CONVEX_URL);
console.log('─'.repeat(60));

// Store created contact IDs for later tests
let createdContactId = null;
let createdEventContactId = null;

/**
 * Test 1: Create Contact from Event
 */
async function testCreateContactFromEvent() {
  console.log('\n📋 Test 1: POST /api/v1/crm/contacts/from-event');
  console.log('─'.repeat(60));

  try {
    const url = `${CONVEX_URL}/api/v1/crm/contacts/from-event`;
    const requestBody = {
      eventName: "Test Conference 2024",
      eventDate: Date.now(),
      attendeeInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1-555-1234",
        company: "Acme Corp"
      }
    };

    console.log('Request URL:', url);
    console.log('Method: POST');
    console.log('Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('\nResponse Status:', response.status, response.statusText);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success!');
      console.log('\nResponse Data:');
      console.log(JSON.stringify(data, null, 2));
      createdEventContactId = data.contactId;
      console.log(`\n📊 Created contact ID: ${createdEventContactId}`);
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
 * Test 2: Create Contact from Event (Duplicate - Should Link)
 */
async function testCreateContactFromEventDuplicate() {
  console.log('\n📋 Test 2: POST /api/v1/crm/contacts/from-event (Duplicate Email)');
  console.log('─'.repeat(60));

  try {
    const url = `${CONVEX_URL}/api/v1/crm/contacts/from-event`;
    const requestBody = {
      eventName: "Another Conference 2024",
      eventDate: Date.now(),
      attendeeInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com", // Same email as before
        phone: "+1-555-1234"
      }
    };

    console.log('Request URL:', url);
    console.log('Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('\nResponse Status:', response.status, response.statusText);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success!');
      console.log('\nResponse Data:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n📊 Message:', data.message);
      console.log('Should say: "Existing contact linked to event"');
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
 * Test 3: Create Generic Contact
 */
async function testCreateContact() {
  console.log('\n📋 Test 3: POST /api/v1/crm/contacts');
  console.log('─'.repeat(60));

  try {
    const url = `${CONVEX_URL}/api/v1/crm/contacts`;
    const requestBody = {
      subtype: "lead",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phone: "+1-555-5678",
      company: "Tech Solutions Inc",
      jobTitle: "CTO",
      source: "api",
      tags: ["api-test", "demo"],
      notes: "Test contact created via API"
    };

    console.log('Request URL:', url);
    console.log('Method: POST');
    console.log('Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('\nResponse Status:', response.status, response.statusText);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success!');
      console.log('\nResponse Data:');
      console.log(JSON.stringify(data, null, 2));
      createdContactId = data.contactId;
      console.log(`\n📊 Created contact ID: ${createdContactId}`);
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
 * Test 4: List All Contacts
 */
async function testListContacts() {
  console.log('\n📋 Test 4: GET /api/v1/crm/contacts');
  console.log('─'.repeat(60));

  try {
    const url = `${CONVEX_URL}/api/v1/crm/contacts`;
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
      console.log(`\n📊 Found ${data.total} contacts (showing ${data.contacts.length})`);
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
 * Test 5: List Contacts with Filter
 */
async function testListContactsWithFilter() {
  console.log('\n📋 Test 5: GET /api/v1/crm/contacts?subtype=lead&status=active');
  console.log('─'.repeat(60));

  try {
    const url = `${CONVEX_URL}/api/v1/crm/contacts?subtype=lead&status=active&limit=10`;
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
      console.log(`\n📊 Found ${data.total} lead contacts (showing ${data.contacts.length})`);
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
 * Test 6: Get Specific Contact
 */
async function testGetContact() {
  console.log('\n📋 Test 6: GET /api/v1/crm/contacts/:contactId');
  console.log('─'.repeat(60));

  if (!createdContactId) {
    console.log('⚠️  Skipping - No contact ID available from previous tests');
    return true; // Don't fail the test suite
  }

  try {
    const url = `${CONVEX_URL}/api/v1/crm/contacts/${createdContactId}`;
    console.log('Request URL:', url);
    console.log('Contact ID:', createdContactId);

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
      console.log(`\n📊 Retrieved contact: ${data.name}`);
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
 * Test 7: Invalid API Key
 */
async function testInvalidKey() {
  console.log('\n🔒 Test 7: Invalid API Key (Should Fail)');
  console.log('─'.repeat(60));

  try {
    const url = `${CONVEX_URL}/api/v1/crm/contacts`;
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
 * Run all tests
 */
async function runTests() {
  console.log('\n🧪 Running CRM API Tests...\n');

  const results = {
    createContactFromEvent: await testCreateContactFromEvent(),
    createContactFromEventDuplicate: await testCreateContactFromEventDuplicate(),
    createContact: await testCreateContact(),
    listContacts: await testListContacts(),
    listContactsWithFilter: await testListContactsWithFilter(),
    getContact: await testGetContact(),
    invalidKey: await testInvalidKey(),
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
    console.log('\n🎉 All CRM API tests passed! Ready to integrate with external clients.\n');
    console.log('📝 Next Steps:');
    console.log('   1. Use these endpoints in your external website');
    console.log('   2. Store the API key securely in environment variables');
    console.log('   3. Implement fire-and-forget pattern for event registrations\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.\n');
  }
}

// Run the tests
runTests().catch(console.error);
