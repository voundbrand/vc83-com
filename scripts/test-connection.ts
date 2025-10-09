#!/usr/bin/env npx tsx

/**
 * Test Convex connection
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { config } from "dotenv";

// Load environment variables from .env.local
config({ path: ".env.local" });

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  console.error("❌ Error: NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  console.error("Please set NEXT_PUBLIC_CONVEX_URL in your .env.local file");
  process.exit(1);
}

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

async function testConnection() {
  const client = new ConvexHttpClient(CONVEX_URL);

  console.log("🔍 Testing Convex connection...");
  console.log(`📍 URL: ${CONVEX_URL}`);

  try {
    // Try to get roles (which might be empty, but the query should work)
    console.log("\n📋 Fetching roles...");
    const roles = await client.query(api.rbac.getRoles, {});
    console.log(`✅ Connection successful! Found ${roles.length} roles`);

    // Try to get permissions
    console.log("\n📋 Fetching permissions...");
    const permissions = await client.query(api.rbac.getPermissions, {});
    console.log(`✅ Found ${permissions.length} permissions`);

    console.log("\n✅ Convex is properly connected!");
  } catch (error) {
    console.error("\n❌ Connection failed:", error instanceof Error ? error.message : String(error));
    console.error("\nDetails:", error);
  }
}

testConnection();