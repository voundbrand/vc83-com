import { TestConvex } from "convex-test";
import { Id } from "../_generated/dataModel";
import schema from "../schema";

export interface TestOrgs {
  vc83OrgId: Id<"organizations">;
  orgAId: Id<"organizations">;
  orgBId: Id<"organizations">;
  userAId: Id<"users">;
  userBId: Id<"users">;
  vc83CreatorId: Id<"users">;
}

export async function setupTestOrgs(t: TestConvex<typeof schema>): Promise<TestOrgs> {
  // Create orgs and users within a single transaction
  const vc83OrgId = await t.run(async (ctx) => {
    return await ctx.db.insert("organizations", {
      name: "VC83 System",
      slug: "vc83-system",
      businessName: "VC83 Podcast",
      plan: "enterprise",
      isPersonalWorkspace: false,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const orgAId = await t.run(async (ctx) => {
    return await ctx.db.insert("organizations", {
      name: "Customer Org A",
      slug: "customer-a",
      businessName: "Company A",
      plan: "business",
      isPersonalWorkspace: false,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const orgBId = await t.run(async (ctx) => {
    return await ctx.db.insert("organizations", {
      name: "Customer Org B",
      slug: "customer-b",
      businessName: "Company B",
      plan: "business",
      isPersonalWorkspace: false,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const vc83CreatorId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      firstName: "VC83",
      lastName: "Creator",
      email: "creator@vc83.com",
      emailVerifiedAt: Date.now(),
      defaultOrgId: vc83OrgId,
      emailVerified: true,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const userAId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      firstName: "User",
      lastName: "A",
      email: "usera@test.com",
      emailVerifiedAt: Date.now(),
      defaultOrgId: orgAId,
      emailVerified: true,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  const userBId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      firstName: "User",
      lastName: "B",
      email: "userb@test.com",
      emailVerifiedAt: Date.now(),
      defaultOrgId: orgBId,
      emailVerified: true,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  await t.run(async (ctx) => {
    await ctx.db.insert("organizationMembers", {
      userId: vc83CreatorId,
      organizationId: vc83OrgId,
      role: "owner",
      isActive: true,
      joinedAt: Date.now(),
    });

    await ctx.db.insert("organizationMembers", {
      userId: userAId,
      organizationId: orgAId,
      role: "owner",
      isActive: true,
      joinedAt: Date.now(),
    });

    await ctx.db.insert("organizationMembers", {
      userId: userBId,
      organizationId: orgBId,
      role: "owner",
      isActive: true,
      joinedAt: Date.now(),
    });
  });

  return { vc83OrgId, orgAId, orgBId, userAId, userBId, vc83CreatorId };
}
