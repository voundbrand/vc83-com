#!/usr/bin/env npx tsx

/**
 * Script to seed RBAC roles and permissions
 * Run with: npx tsx scripts/seed-rbac.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!CONVEX_URL) {
  console.error("❌ Error: NEXT_PUBLIC_CONVEX_URL not found in .env.local");
  process.exit(1);
}

async function seedRBAC() {
  const client = new ConvexHttpClient(CONVEX_URL);

  console.log("🚀 Starting RBAC seeding...");
  console.log(`📍 Convex URL: ${CONVEX_URL}`);

  try {
    // Seed base RBAC without any vertical
    console.log("\n📝 Seeding base roles and permissions...");
    const result = await client.mutation(api.rbac.seedRBAC, {});

    if (result.skipped) {
      console.log("⚠️  RBAC already seeded - skipping");
    } else {
      console.log("✅ RBAC seeded successfully!");
      console.log(`   - Roles created: ${result.rolesCount}`);
      console.log(`   - Permissions created: ${result.permissionsCount}`);
    }

    // Optionally seed vertical-specific permissions
    console.log("\n📝 Adding invoicing vertical permissions...");
    const verticalResult = await client.mutation(api.rbac.addVerticalPermissions, {
      vertical: "invoicing"
    });
    console.log(`✅ ${verticalResult.message}`);

    // Get all roles to verify
    console.log("\n📋 Verifying created roles...");
    const roles = await client.query(api.rbac.getRoles, {});
    console.log("Roles in system:");
    roles.forEach((role: { name: string; description?: string }) => {
      console.log(`   - ${role.name}: ${role.description}`);
    });

    // Get all permissions to verify
    console.log("\n📋 Verifying permissions (sample)...");
    const permissions = await client.query(api.rbac.getPermissions, {});
    console.log(`Total permissions: ${permissions.length}`);
    console.log("Sample permissions:");
    permissions.slice(0, 5).forEach((perm: { name: string; resource: string; action: string }) => {
      console.log(`   - ${perm.name} (${perm.resource}:${perm.action})`);
    });

    console.log("\n✅ RBAC seeding complete!");
    console.log("\n📝 Next steps:");
    console.log("1. Create users and assign roles using assignRoleToOrganization()");
    console.log("2. Test permission checks using checkPermission()");
    console.log("3. Implement permission guards in your queries/mutations");

  } catch (error) {
    console.error("❌ Error seeding RBAC:", error);
    process.exit(1);
  }
}

// Run the seeding
seedRBAC().then(() => {
  console.log("\n👍 Script completed successfully");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});