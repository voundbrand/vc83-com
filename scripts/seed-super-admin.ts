#!/usr/bin/env npx tsx

/**
 * Script to seed a super admin user with organization
 * Run with: npx tsx scripts/seed-super-admin.ts
 *
 * Prerequisites:
 * 1. Make sure Convex is running: npx convex dev
 * 2. RBAC will be automatically seeded if not already done
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://aromatic-akita-723.convex.cloud";

// Super Admin Configuration
const SUPER_ADMIN = {
  email: "remington@voundbrand.com",
  firstName: "Remington",
  lastName: "Admin",
  organizationName: "Voundbrand",
  organizationSlug: "voundbrand",
};

async function seedSuperAdmin() {
  const client = new ConvexHttpClient(CONVEX_URL);

  console.log("🚀 Starting Super Admin seeding...");
  console.log(`📍 Convex URL: ${CONVEX_URL}`);
  console.log(`📧 Admin Email: ${SUPER_ADMIN.email}`);
  console.log(`🏢 Organization: ${SUPER_ADMIN.organizationName}`);

  try {
    // Step 1: Ensure RBAC is seeded first
    console.log("\n📝 Step 1: Checking RBAC system...");
    const rbacResult = await client.mutation(api.rbac.seedRBAC, {});

    if (rbacResult.skipped) {
      console.log("✅ RBAC already seeded");
    } else {
      console.log("✅ RBAC seeded successfully!");
      console.log(`   - Roles created: ${rbacResult.rolesCount}`);
      console.log(`   - Permissions created: ${rbacResult.permissionsCount}`);
    }

    // Step 2: Create the super admin user with organization
    console.log("\n👤 Step 2: Creating super admin user...");

    const result = await client.mutation(api.seedAdmin.createSuperAdminUser, {
      email: SUPER_ADMIN.email,
      firstName: SUPER_ADMIN.firstName,
      lastName: SUPER_ADMIN.lastName,
      organizationName: SUPER_ADMIN.organizationName,
      organizationSlug: SUPER_ADMIN.organizationSlug,
    });

    if (result.success) {
      console.log("\n✅ Super admin created successfully!");
      console.log("   📧 Email:", SUPER_ADMIN.email);
      console.log("   👤 User ID:", result.userId);
      console.log("   🏢 Organization:", SUPER_ADMIN.organizationName);
      console.log("   🔑 Organization ID:", result.organizationId);
      console.log("   🛡️ Role: Super Admin (global access)");

      console.log("\n🎉 Setup complete! The super admin user has:");
      console.log("   - Global super admin privileges across the entire platform");
      console.log("   - Owner role in their organization (" + SUPER_ADMIN.organizationName + ")");
      console.log("   - Access to all resources and operations");

      console.log("\n📝 Next steps:");
      console.log("1. You can now log in with this user");
      console.log("2. Set up authentication (password/OAuth) for this user");
      console.log("3. This user can create and manage other organizations");
      console.log("4. This user can assign roles to other users");
    } else {
      console.log(`\n⚠️ ${result.message}`);
      if (result.userId) {
        console.log(`   Existing User ID: ${result.userId}`);
      }
    }

    // Step 3: Verify the setup
    console.log("\n🔍 Step 3: Verifying setup...");
    const roles = await client.query(api.rbac.getRoles, {});
    console.log(`✅ Roles in system: ${roles.length}`);

    const permissions = await client.query(api.rbac.getPermissions, {});
    console.log(`✅ Permissions in system: ${permissions.length}`);

  } catch (error) {
    console.error("\n❌ Error seeding super admin:", error);
    console.error("\nTroubleshooting:");
    console.error("1. Make sure Convex is running: npx convex dev");
    console.error("2. Check that your CONVEX_URL is correct");
    console.error("3. Ensure the seedAdmin.createSuperAdminUser mutation exists");
    console.error("4. Check Convex logs for detailed error messages");
    process.exit(1);
  }
}

// Run the seeding
seedSuperAdmin().then(() => {
  console.log("\n✨ Script completed successfully!");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});