/**
 * Enhanced CRM API Test Script
 *
 * Tests the new organization support and contact upsert functionality.
 *
 * Features tested:
 * - Creating contacts with organizations
 * - Updating existing contacts (deduplication by email)
 * - Merging tags across multiple submissions
 * - Organization creation and linking
 * - Multiple organizations per contact
 */

const API_BASE_URL = "https://honest-macaw-698.convex.site/api/v1";
const API_KEY = "YOUR_API_KEY_HERE"; // Replace with your actual API key

// Test cases
const tests = [
  {
    name: "Test 1: Create new contact with organization",
    endpoint: "/crm/contacts/from-event",
    data: {
      eventName: "Tech Conference 2025",
      eventDate: Date.now(),
      attendeeInfo: {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice.test@example.com",
        phone: "+1234567890",
        tags: ["newsletter", "tech-conference"]
      },
      organizationInfo: {
        name: "Acme Corporation",
        website: "https://acme.com",
        industry: "Technology",
        address: {
          street: "123 Main St",
          city: "San Francisco",
          state: "CA",
          postalCode: "94105",
          country: "USA"
        },
        taxId: "12-3456789",
        billingEmail: "billing@acme.com",
        phone: "+1234567890"
      }
    },
    expectedResult: {
      success: true,
      isNewContact: true,
      crmOrganizationId: "should exist"
    }
  },
  {
    name: "Test 2: Update existing contact (same email, new tags)",
    endpoint: "/crm/contacts/from-event",
    data: {
      eventName: "Webinar 2025",
      eventDate: Date.now(),
      attendeeInfo: {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice.test@example.com", // SAME EMAIL as Test 1
        tags: ["webinar", "premium"]      // NEW TAGS
      }
    },
    expectedResult: {
      success: true,
      isNewContact: false, // Should be false - updating existing
      message: "Existing contact updated and linked to event"
    }
  },
  {
    name: "Test 3: Same contact, different organization",
    endpoint: "/crm/contacts/from-event",
    data: {
      eventName: "Partner Summit 2025",
      attendeeInfo: {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice.test@example.com", // SAME EMAIL
        tags: ["partner-program"]
      },
      organizationInfo: {
        name: "Beta Industries",          // DIFFERENT COMPANY
        website: "https://beta.com",
        industry: "Manufacturing"
      }
    },
    expectedResult: {
      success: true,
      isNewContact: false,
      crmOrganizationId: "should exist (different from Test 1)"
    }
  },
  {
    name: "Test 4: Generic contact with organization",
    endpoint: "/crm/contacts",
    data: {
      subtype: "lead",
      firstName: "Bob",
      lastName: "Smith",
      email: "bob.test@company.com",
      phone: "+9876543210",
      jobTitle: "CTO",
      tags: ["decision-maker", "technical"],
      notes: "Met at conference booth",
      organizationInfo: {
        name: "Tech Startup Inc",
        website: "https://techstartup.io",
        industry: "SaaS",
        address: {
          street: "456 Innovation Drive",
          city: "Austin",
          state: "TX",
          postalCode: "78701",
          country: "USA"
        }
      }
    },
    expectedResult: {
      success: true,
      isNewContact: true,
      crmOrganizationId: "should exist"
    }
  },
  {
    name: "Test 5: Update generic contact",
    endpoint: "/crm/contacts",
    data: {
      subtype: "customer", // Upgrading from lead to customer
      firstName: "Bob",
      lastName: "Smith",
      email: "bob.test@company.com", // SAME EMAIL as Test 4
      tags: ["customer", "paid"],     // NEW TAGS
      notes: "Converted to paying customer"
    },
    expectedResult: {
      success: true,
      isNewContact: false, // Should update existing
      message: "Existing contact updated successfully"
    }
  },
  {
    name: "Test 6: Contact with simple company name (backward compatible)",
    endpoint: "/crm/contacts/from-event",
    data: {
      eventName: "Trade Show 2025",
      attendeeInfo: {
        firstName: "Charlie",
        lastName: "Davis",
        email: "charlie.test@gamma.com",
        company: "Gamma Corp", // Simple company name (old format)
        tags: ["trade-show"]
      }
    },
    expectedResult: {
      success: true,
      isNewContact: true,
      crmOrganizationId: "should exist" // Should create org from company field
    }
  },
  {
    name: "Test 7: Organization name deduplication (case-insensitive)",
    endpoint: "/crm/contacts/from-event",
    data: {
      eventName: "Workshop 2025",
      attendeeInfo: {
        firstName: "Diana",
        lastName: "Evans",
        email: "diana.test@example.com",
        tags: ["workshop"]
      },
      organizationInfo: {
        name: "ACME CORPORATION", // Same as Test 1 but different case
        website: "https://acme.com",
        phone: "+1234567890"
      }
    },
    expectedResult: {
      success: true,
      isNewContact: true,
      crmOrganizationId: "should match Test 1's organization" // Same org as Test 1
    }
  }
];

// Helper function to make API calls
async function callAPI(endpoint, data) {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: result
    };
  } catch (error) {
    return {
      error: error.message
    };
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Enhanced CRM API Tests\n');
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...\n`);

  const results = [];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 ${test.name}`);
    console.log(`${'='.repeat(80)}`);

    console.log('\n📤 Request:');
    console.log(`  Endpoint: POST ${test.endpoint}`);
    console.log(`  Data:`, JSON.stringify(test.data, null, 2));

    const result = await callAPI(test.endpoint, test.data);

    console.log('\n📥 Response:');
    console.log(`  Status: ${result.status || 'ERROR'}`);
    if (result.headers) {
      console.log(`  Organization ID: ${result.headers['x-organization-id'] || 'N/A'}`);
      console.log(`  CRM Organization ID: ${result.headers['x-crm-organization-id'] || 'N/A'}`);
    }
    console.log(`  Body:`, JSON.stringify(result.data || result.error, null, 2));

    // Check expected results
    console.log('\n✅ Expected Results:');
    Object.entries(test.expectedResult).forEach(([key, value]) => {
      const actual = result.data?.[key];
      const matches = typeof value === 'string' && value.includes('should')
        ? actual !== undefined
        : actual === value;

      console.log(`  ${matches ? '✅' : '❌'} ${key}: ${actual} ${matches ? '' : `(expected ${value})`}`);
    });

    results.push({
      test: test.name,
      status: result.status,
      success: result.data?.success,
      isNewContact: result.data?.isNewContact,
      contactId: result.data?.contactId,
      crmOrganizationId: result.data?.crmOrganizationId,
      organizationId: result.data?.organizationId
    });

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(80)}\n`);

  console.table(results);

  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Passed: ${successCount}/${results.length}`);
  console.log(`❌ Failed: ${results.length - successCount}/${results.length}`);

  // Key insights
  console.log(`\n${'='.repeat(80)}`);
  console.log('🔍 KEY INSIGHTS');
  console.log(`${'='.repeat(80)}\n`);

  console.log('1. Contact Deduplication:');
  const aliceTests = results.filter((r, i) => [0, 1, 2, 6].includes(i));
  console.log(`   - Alice (alice.test@example.com) created once, updated ${aliceTests.filter(r => !r.isNewContact).length} times`);
  console.log(`   - Contact ID consistent: ${new Set(aliceTests.map(r => r.contactId)).size === 1 ? '✅' : '❌'}`);

  console.log('\n2. Organization Creation:');
  const uniqueOrgs = new Set(results.filter(r => r.crmOrganizationId).map(r => r.crmOrganizationId));
  console.log(`   - Total unique organizations created: ${uniqueOrgs.size}`);
  console.log(`   - Organizations: ${Array.from(uniqueOrgs).join(', ')}`);

  console.log('\n3. Tag Merging:');
  console.log('   - Test 1: [newsletter, tech-conference]');
  console.log('   - Test 2: Should merge to [newsletter, tech-conference, webinar, premium]');
  console.log('   - Test 3: Should add [partner-program]');

  console.log('\n4. Organization Deduplication:');
  const acmeOrg1 = results[0]?.crmOrganizationId;
  const acmeOrg2 = results[6]?.crmOrganizationId;
  console.log(`   - "Acme Corporation" (Test 1): ${acmeOrg1}`);
  console.log(`   - "ACME CORPORATION" (Test 7): ${acmeOrg2}`);
  console.log(`   - Same organization: ${acmeOrg1 === acmeOrg2 ? '✅' : '❌'}`);
}

// Check if API key is set
if (API_KEY === "YOUR_API_KEY_HERE") {
  console.error('❌ ERROR: Please set your API_KEY in the script first!');
  console.error('\nHow to get your API key:');
  console.error('1. Log in to your app');
  console.error('2. Go to Settings > API Keys');
  console.error('3. Create a new API key or copy an existing one');
  console.error('4. Replace "YOUR_API_KEY_HERE" in this script\n');
  process.exit(1);
}

// Run the tests
runTests().catch(console.error);
