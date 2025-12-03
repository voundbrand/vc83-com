#!/usr/bin/env tsx
/**
 * Helper script to get your organization and user IDs for testing
 *
 * Usage:
 *   npx tsx scripts/get-test-ids.ts your-email@example.com
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const email = process.argv[2];

if (!email) {
  console.log("Usage: npx tsx scripts/get-test-ids.ts your-email@example.com");
  process.exit(1);
}

if (!CONVEX_URL) {
  console.error("❌ Error: NEXT_PUBLIC_CONVEX_URL not set in .env.local");
  process.exit(1);
}

async function getTestIds() {
  console.log("🔍 Looking up user and organization IDs...");
  console.log(`Email: ${email}`);
  console.log("");

  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    // You'll need to create a simple query to look up user by email
    console.log("📝 To use the test script, add these to your .env.local:");
    console.log("");
    console.log("# Find these in the Convex dashboard:");
    console.log("# 1. Go to https://dashboard.convex.dev");
    console.log("# 2. Select your project");
    console.log("# 3. Go to 'Data' tab");
    console.log("# 4. Look in 'users' table for your user ID");
    console.log("# 5. Look in 'organizations' table for your org ID");
    console.log("");
    console.log("TEST_ORG_ID=your_org_id_here");
    console.log("TEST_USER_ID=your_user_id_here");
    console.log("");
    console.log("💡 Tip: IDs look like: 'j57abc123def456...' (starts with j, k, or similar)");

  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

getTestIds();
