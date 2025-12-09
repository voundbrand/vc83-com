/**
 * LOCAL API TESTING SCRIPT FOR INVOICES
 *
 * This script tests the Invoices API endpoints locally.
 *
 * Prerequisites:
 * 1. Run `npm run dev` (Next.js on port 3000)
 * 2. Run `npx convex dev` (Convex backend)
 * 3. Create an API key in your Convex dashboard (see instructions below)
 *
 * Usage:
 * npx tsx scripts/test-invoices-api.ts
 */

// ===========================================
// CONFIGURATION
// ===========================================

const CONFIG = {
  // Your Convex backend URL (from .env.local)
  CONVEX_URL: "https://aromatic-akita-723.convex.cloud",

  // API key - YOU NEED TO CREATE THIS FIRST!
  // See instructions below on how to create an API key
  API_KEY: "YOUR_API_KEY_HERE", // Replace with actual API key

  // Test data
  TEST_CRM_ORG_ID: "test-org-123", // Replace with actual CRM org ID
};

// ===========================================
// HOW TO CREATE AN API KEY
// ===========================================
//
// Option 1: Via Convex Dashboard
// 1. Go to your Convex dashboard: https://dashboard.convex.dev
// 2. Navigate to your project (aromatic-akita-723)
// 3. Go to Settings > API Keys
// 4. Create a new API key with appropriate scopes
//
// Option 2: Via Code (Programmatically)
// You can also create API keys programmatically using the auth.ts mutations
// See convex/api/v1/auth.ts for the createApiKey mutation
//
// ===========================================

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPriceInCents: number;
  totalPriceInCents: number;
}

interface CreateInvoiceRequest {
  crmOrganizationId: string;
  billToName: string;
  billToEmail: string;
  billToVatNumber?: string;
  billToAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  lineItems: InvoiceLineItem[];
  subtotalInCents: number;
  taxInCents: number;
  totalInCents: number;
  currency: string;
  invoiceDate: number;
  dueDate: number;
  paymentTerms?: string;
  notes?: string;
}

class InvoicesApiTester {
  private baseUrl: string;
  private apiKey: string;

  constructor(convexUrl: string, apiKey: string) {
    this.baseUrl = convexUrl;
    this.apiKey = apiKey;
  }

  private async makeRequest(
    method: string,
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: unknown }> {
    const url = `${this.baseUrl}${path}`;

    console.log(`\n🔵 ${method} ${path}`);
    if (body) {
      console.log("📤 Request:", JSON.stringify(body, null, 2));
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      console.log(`✅ Status: ${response.status}`);
      console.log("📥 Response:", JSON.stringify(data, null, 2));

      return { status: response.status, data };
    } catch (error) {
      console.error("❌ Error:", error);
      throw error;
    }
  }

  async testCreateDraftInvoice(): Promise<string | null> {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 1: Create Draft Invoice");
    console.log("=".repeat(60));

    const now = Date.now();
    const dueDate = now + (30 * 24 * 60 * 60 * 1000); // 30 days from now

    const invoiceData: CreateInvoiceRequest = {
      crmOrganizationId: CONFIG.TEST_CRM_ORG_ID,
      billToName: "Test Customer Inc.",
      billToEmail: "customer@example.com",
      billToVatNumber: "GB123456789",
      billToAddress: {
        street: "123 Test Street",
        city: "London",
        state: "Greater London",
        postalCode: "SW1A 1AA",
        country: "United Kingdom",
      },
      lineItems: [
        {
          description: "Website Development",
          quantity: 1,
          unitPriceInCents: 500000, // $5,000.00
          totalPriceInCents: 500000,
        },
        {
          description: "Consulting Hours",
          quantity: 10,
          unitPriceInCents: 15000, // $150.00 per hour
          totalPriceInCents: 150000, // $1,500.00 total
        },
      ],
      subtotalInCents: 650000, // $6,500.00
      taxInCents: 130000, // 20% VAT = $1,300.00
      totalInCents: 780000, // $7,800.00
      currency: "USD",
      invoiceDate: now,
      dueDate,
      paymentTerms: "net30",
      notes: "Thank you for your business!",
    };

    const result = await this.makeRequest("POST", "/api/v1/invoices", invoiceData);

    if (result.status === 200 && typeof result.data === "object" && result.data !== null) {
      const data = result.data as { invoiceId?: string };
      return data.invoiceId || null;
    }
    return null;
  }

  async testListInvoices() {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 2: List All Invoices");
    console.log("=".repeat(60));

    await this.makeRequest("GET", "/api/v1/invoices?limit=10");
  }

  async testListDraftInvoices() {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 3: List Draft Invoices Only");
    console.log("=".repeat(60));

    await this.makeRequest("GET", "/api/v1/invoices?isDraft=true");
  }

  async testGetInvoice(invoiceId: string) {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 4: Get Invoice Details");
    console.log("=".repeat(60));

    await this.makeRequest("GET", `/api/v1/invoices/${invoiceId}`);
  }

  async testUpdateDraftInvoice(invoiceId: string) {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 5: Update Draft Invoice");
    console.log("=".repeat(60));

    const updates = {
      notes: "Updated: Payment due within 30 days. Late fees may apply.",
      paymentTerms: "net15",
    };

    await this.makeRequest("PATCH", `/api/v1/invoices/${invoiceId}`, updates);
  }

  async testSealInvoice(invoiceId: string) {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 6: Seal Draft Invoice (Make it Final)");
    console.log("=".repeat(60));

    await this.makeRequest("POST", `/api/v1/invoices/${invoiceId}/seal`);
  }

  async testSendInvoice(invoiceId: string) {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 7: Send Invoice");
    console.log("=".repeat(60));

    const sendData = {
      sentTo: ["customer@example.com", "accounting@example.com"],
    };

    await this.makeRequest("POST", `/api/v1/invoices/${invoiceId}/send`, sendData);
  }

  async testGetInvoicePdf(invoiceId: string) {
    console.log("\n" + "=".repeat(60));
    console.log("TEST 8: Get Invoice PDF URL");
    console.log("=".repeat(60));

    await this.makeRequest("GET", `/api/v1/invoices/${invoiceId}/pdf`);
  }

  async runAllTests() {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 STARTING INVOICES API TESTS");
    console.log("=".repeat(60));
    console.log(`📡 Backend: ${this.baseUrl}`);
    console.log(`🔑 API Key: ${this.apiKey.substring(0, 20)}...`);
    console.log("=".repeat(60));

    try {
      // Test 1: Create a draft invoice
      const invoiceId = await this.testCreateDraftInvoice();

      if (!invoiceId) {
        console.error("\n❌ Failed to create invoice. Cannot continue tests.");
        return;
      }

      console.log(`\n✅ Created invoice: ${invoiceId}`);

      // Test 2 & 3: List invoices
      await this.testListInvoices();
      await this.testListDraftInvoices();

      // Test 4: Get specific invoice
      await this.testGetInvoice(invoiceId);

      // Test 5: Update the draft
      await this.testUpdateDraftInvoice(invoiceId);

      // Test 6: Seal the invoice (make it final)
      await this.testSealInvoice(invoiceId);

      // Test 7: Send the invoice
      await this.testSendInvoice(invoiceId);

      // Test 8: Get PDF URL
      await this.testGetInvoicePdf(invoiceId);

      console.log("\n" + "=".repeat(60));
      console.log("✅ ALL TESTS COMPLETED SUCCESSFULLY!");
      console.log("=".repeat(60));

    } catch (error) {
      console.error("\n" + "=".repeat(60));
      console.error("❌ TEST FAILED");
      console.error("=".repeat(60));
      console.error(error);
    }
  }
}

// ===========================================
// RUN TESTS
// ===========================================

async function main() {
  // Validate configuration
  if (CONFIG.API_KEY === "YOUR_API_KEY_HERE") {
    console.error("\n❌ ERROR: You need to set your API key!");
    console.error("\nPlease follow these steps:");
    console.error("1. Create an API key in your Convex dashboard");
    console.error("2. Update CONFIG.API_KEY in this file");
    console.error("\nSee the comments at the top of this file for detailed instructions.");
    process.exit(1);
  }

  const tester = new InvoicesApiTester(CONFIG.CONVEX_URL, CONFIG.API_KEY);
  await tester.runAllTests();
}

main().catch(console.error);
