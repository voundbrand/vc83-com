/**
 * Fix Checkout Configuration Script
 *
 * This script helps diagnose and fix checkout configuration issues:
 * 1. Find checkout instances that might not be published
 * 2. Update publicSlug if missing
 * 3. Publish checkout instances
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "";

if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL not found in environment");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log("🔍 Diagnosing checkout configuration...\n");

  // Check what we're looking for
  const orgSlug = "voundbrand";
  const publicSlug = "behavior-driven-checkout";

  console.log("Looking for:");
  console.log(`  Organization: ${orgSlug}`);
  console.log(`  Checkout publicSlug: ${publicSlug}\n`);

  try {
    // Try to fetch the checkout (this will show us what's wrong)
    const checkout = await client.query(api.checkoutOntology.getPublicCheckoutInstance, {
      orgSlug,
      publicSlug,
    });

    if (checkout) {
      console.log("✅ Checkout found!");
      console.log("Checkout details:", JSON.stringify(checkout, null, 2));
    } else {
      console.log("❌ Checkout NOT found");
      console.log("\nPossible issues:");
      console.log("1. Organization slug 'voundbrand' doesn't exist");
      console.log("2. Checkout instance doesn't have publicSlug 'behavior-driven-checkout'");
      console.log("3. Checkout instance status is not 'published'");
      console.log("\nTo fix this:");
      console.log("1. Go to your L4YERCAK3 desktop");
      console.log("2. Open the Workflows window");
      console.log("3. Find your 'behavior-driven-checkout' checkout instance");
      console.log("4. Make sure:");
      console.log("   - Public Slug is set to: 'behavior-driven-checkout'");
      console.log("   - Status is set to: 'published'");
      console.log("5. Or use Convex dashboard to manually update the checkout instance");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  process.exit(0);
}

main();
