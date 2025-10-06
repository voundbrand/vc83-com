#!/usr/bin/env npx tsx

/**
 * Script to create an organization manager user
 * Run with: npx tsx scripts/seed-org-manager.ts
 *
 * Prerequisites:
 * 1. Make sure Convex is running: npx convex dev
 * 2. Organization must exist (created by seed-super-admin.ts)
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://aromatic-akita-723.convex.cloud";

// Organization Manager Configuration
const ORG_MANAGER = {
  email: "remington@voundbrand.com",
  firstName: "Remington",
  lastName: "Owner",
  organizationSlug: "voundbrand", // We'll look up the org by slug
  roleName: "org_owner", // This gives full control over the organization
};

async function seedOrgManager() {
  const client = new ConvexHttpClient(CONVEX_URL);

  console.log("🚀 Starting Organization Manager seeding...");
  console.log(`📍 Convex URL: ${CONVEX_URL}`);
  console.log(`📧 Manager Email: ${ORG_MANAGER.email}`);
  console.log(`🏢 Organization: ${ORG_MANAGER.organizationSlug}`);
  console.log(`👔 Role: ${ORG_MANAGER.roleName}`);

  try {
    // Step 1: Look up the organization by slug
    console.log("\n🔍 Step 1: Looking up organization by slug...");
    const organizations = await client.query(api.rbac.getOrganizations, {});
    const org = organizations.find((o: { slug: string }) => o.slug === ORG_MANAGER.organizationSlug);

    if (!org) {
      throw new Error(`Organization with slug '${ORG_MANAGER.organizationSlug}' not found. Please run seed-super-admin.ts first.`);
    }

    console.log(`✅ Found organization: ${org.name} (ID: ${org._id})`);

    // Step 2: Get the org_owner role
    console.log("\n🔍 Step 2: Looking up org_owner role...");
    const roles = await client.query(api.rbac.getRoles, {});
    const managerRole = roles.find((r: { name: string }) => r.name === ORG_MANAGER.roleName);

    if (!managerRole) {
      throw new Error(`Role '${ORG_MANAGER.roleName}' not found. Please run seed-rbac.ts first.`);
    }

    console.log(`✅ Found role: ${managerRole.name} (ID: ${managerRole._id})`);
    console.log(`   Description: ${managerRole.description}`);

    // Step 3: Create the manager user
    console.log("\n👤 Step 3: Creating organization manager user...");

    const result = await client.mutation(api.seedAdmin.createOrgManagerUser, {
      email: ORG_MANAGER.email,
      firstName: ORG_MANAGER.firstName,
      lastName: ORG_MANAGER.lastName,
      organizationId: org._id,
      roleId: managerRole._id,
    });

    if (result.success) {
      console.log("\n✅ Organization manager created successfully!");
      console.log("   📧 Email:", ORG_MANAGER.email);
      console.log("   👤 User ID:", result.userId);
      console.log("   🏢 Organization:", org.name);
      console.log("   👔 Role:", managerRole.name);
      console.log("   📋 Membership ID:", result.membershipId);

      console.log("\n🎉 Setup complete! The org owner has:");
      console.log("   - Organization Owner role in " + org.name);
      console.log("   - Full control over the organization");
      console.log("   - Can manage all organization settings and billing");
      console.log("   - Can invite and manage all team members");
      console.log("   - Can install and manage all apps for the organization");

      // Step 4: Verify permissions
      console.log("\n🔍 Step 4: Verifying org owner permissions...");
      const rolePermissions = await client.query(api.rbac.getRolePermissions, {
        roleId: managerRole._id,
      });

      console.log(`✅ Org owner has ${rolePermissions.length} permissions:`);
      const samplePerms = rolePermissions.slice(0, 5);
      samplePerms.forEach((perm) => {
        if (!perm) return;
        console.log(`   - ${perm.name} (${perm.resource}:${perm.action})`);
      });
      if (rolePermissions.length > 5) {
        console.log(`   ... and ${rolePermissions.length - 5} more`);
      }

    } else {
      console.log(`\n⚠️ ${result.message}`);
      if (result.userId) {
        console.log(`   Existing User ID: ${result.userId}`);
      }
    }

  } catch (error) {
    console.error("\n❌ Error creating organization manager:", error instanceof Error ? error.message : error);
    console.error("\nTroubleshooting:");
    console.error("1. Make sure Convex is running: npx convex dev");
    console.error("2. Ensure the organization exists (run seed-super-admin.ts first)");
    console.error("3. Check that RBAC is seeded (run seed-rbac.ts first)");
    console.error("4. Verify the createOrgManagerUser mutation exists");
    process.exit(1);
  }
}

// Run the seeding
seedOrgManager().then(() => {
  console.log("\n✨ Script completed successfully!");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});