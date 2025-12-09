/**
 * CREATE TEST API KEY
 *
 * This script creates a test API key for local development.
 * Run this once to generate an API key, then use it in test-invoices-api.ts
 *
 * Usage:
 * npx tsx scripts/create-test-api-key.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = "https://aromatic-akita-723.convex.cloud";

async function createApiKey() {
  console.log("🔑 Creating Test API Key...\n");

  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // Note: You'll need to be authenticated to create an API key
    // This script shows the structure, but you may need to create the key
    // through the Convex dashboard or use your own authentication method

    console.log("📝 To create an API key:");
    console.log("\nOption 1: Via Convex Dashboard (Recommended)");
    console.log("1. Go to: https://dashboard.convex.dev");
    console.log("2. Select your project: aromatic-akita-723");
    console.log("3. Navigate to Settings > API Keys");
    console.log("4. Click 'Create API Key'");
    console.log("5. Copy the key and paste it into test-invoices-api.ts\n");

    console.log("Option 2: Programmatically (Advanced)");
    console.log("You can use the convex mutations to create API keys:");
    console.log("- See convex/api/v1/auth.ts for createApiKey mutation");
    console.log("- You'll need proper authentication first\n");

    console.log("Option 3: Quick Test (Use this for now)");
    console.log("1. Open Convex Dashboard");
    console.log("2. Go to Data > apiKeys table");
    console.log("3. Manually insert a record:");
    console.log(`   {
     organizationId: "<your-org-id>",
     userId: "<your-user-id>",
     keyHash: "test-key-hash",
     keyPrefix: "test_",
     name: "Local Development Key",
     scopes: ["invoices:read", "invoices:write"],
     isActive: true,
     createdAt: Date.now(),
     lastUsedAt: Date.now(),
     expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
   }`);
    console.log("4. Use the full key value in your tests\n");

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

createApiKey();
