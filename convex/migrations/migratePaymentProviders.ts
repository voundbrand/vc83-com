/**
 * MIGRATION: Payment Providers to Ontology
 *
 * Migrates payment providers from old storage (org.paymentProviders array)
 * to new storage (objects table with type: payment_provider_config).
 *
 * Run this ONCE per organization to set up providers properly.
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Get or create system user for migrations
 */
async function getOrCreateSystemUser(ctx: MutationCtx): Promise<Id<"users">> {
  const systemEmail = "system@l4yercak3.com";
  const existingUser = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("email"), systemEmail))
    .first();

  if (existingUser) {
    return existingUser._id;
  }

  // Create system user
  const systemUserId = await ctx.db.insert("users", {
    email: systemEmail,
    firstName: "System",
    lastName: "Migration",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return systemUserId;
}

export const migratePaymentProviders = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Get system user for created_by field
    const systemUserId = await getOrCreateSystemUser(ctx);

    console.log(`🔄 [Migration] Starting payment provider migration for org: ${org.name}`);

    const results: string[] = [];

    // Check for existing provider configs (skip if already migrated)
    const existingConfigs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "payment_provider_config")
      )
      .collect();

    if (existingConfigs.length > 0) {
      console.log(`✅ [Migration] Organization already has ${existingConfigs.length} provider configs. Skipping migration.`);
      return {
        success: true,
        message: "Organization already migrated",
        existingProviders: existingConfigs.map((p) => p.customProperties?.providerCode),
      };
    }

    // 1. Migrate Stripe Connect (from legacy stripeConnectAccountId field)
    const stripeConnectAccountId = (org as any).stripeConnectAccountId as string | undefined;
    if (stripeConnectAccountId) {
      const stripeProviderId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "payment_provider_config",
        name: "Stripe Connect",
        description: "Accept credit card payments via Stripe",
        status: "active",
        customProperties: {
          providerCode: "stripe-connect",
          accountId: stripeConnectAccountId,
          isDefault: true, // First provider is default
          isTestMode: false,
          supportsB2B: true,
          supportsB2C: true,
          connectedAt: org._creationTime || Date.now(),
        },
        createdBy: systemUserId,
        createdAt: org._creationTime || Date.now(),
        updatedAt: Date.now(),
      });

      results.push(`✅ Migrated Stripe Connect (${stripeProviderId})`);
      console.log(`✅ [Migration] Created Stripe Connect provider: ${stripeProviderId}`);
    }

    // 2. Check if Invoicing app is available -> Create invoice provider
    const invoicingApp = await ctx.db
      .query("apps")
      .filter((q) => q.eq(q.field("code"), "app_invoicing"))
      .first();

    if (invoicingApp) {
      const appAvailability = await ctx.db
        .query("appAvailabilities")
        .withIndex("by_org_app", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("appId", invoicingApp._id)
        )
        .first();

      if (appAvailability?.isAvailable) {
        const invoiceProviderId = await ctx.db.insert("objects", {
          organizationId: args.organizationId,
          type: "payment_provider_config",
          name: "Invoice (Pay Later)",
          description: "B2B invoice payment with Net 30 terms",
          status: "active",
          customProperties: {
            providerCode: "invoice",
            accountId: "invoice-system",
            isDefault: !stripeConnectAccountId, // Default only if no Stripe
            isTestMode: false,
            supportsB2B: true,
            supportsB2C: false,
            connectedAt: Date.now(),
          },
          createdBy: systemUserId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        results.push(`✅ Created Invoice provider (${invoiceProviderId})`);
        console.log(`✅ [Migration] Created Invoice provider: ${invoiceProviderId}`);
      }
    }

    // 3. Migrate from org.paymentProviders array (if exists)
    if (org.paymentProviders && Array.isArray(org.paymentProviders)) {
      for (const provider of org.paymentProviders) {
        // Skip if we already created this provider above
        if (
          (provider.providerCode === "stripe-connect" && stripeConnectAccountId) ||
          provider.providerCode === "invoice"
        ) {
          continue;
        }

        const providerId = await ctx.db.insert("objects", {
          organizationId: args.organizationId,
          type: "payment_provider_config",
          name: provider.providerCode,
          description: `Payment provider: ${provider.providerCode}`,
          status: provider.status === "active" ? "active" : "inactive",
          customProperties: {
            providerCode: provider.providerCode,
            accountId: provider.accountId || "unknown",
            isDefault: provider.isDefault || false,
            isTestMode: provider.isTestMode || false,
            supportsB2B: true,
            supportsB2C: true,
            connectedAt: provider.connectedAt || Date.now(),
          },
          createdBy: systemUserId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        results.push(`✅ Migrated ${provider.providerCode} (${providerId})`);
        console.log(`✅ [Migration] Migrated ${provider.providerCode}: ${providerId}`);
      }
    }

    if (results.length === 0) {
      return {
        success: true,
        message: "No payment providers found to migrate",
        results: ["⚠️ No providers configured"],
      };
    }

    console.log(`✅ [Migration] Completed for org: ${org.name}. Results:`, results);

    return {
      success: true,
      message: `Migrated ${results.length} payment providers`,
      results,
    };
  },
});

/**
 * MIGRATE ALL ORGANIZATIONS
 *
 * Runs migration for all organizations in the system.
 * Safe to run multiple times (skips already-migrated orgs).
 */
export const migrateAllOrganizations = internalMutation({
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organizations").collect();

    console.log(`🔄 [Migration] Starting migration for ${orgs.length} organizations`);

    const results: Record<string, unknown> = {};

    for (const org of orgs) {
      try {
        const result = await ctx.runMutation(internal.migrations.migratePaymentProviders.migratePaymentProviders, {
          organizationId: org._id,
        });
        results[org.slug || org._id] = result;
      } catch (error) {
        console.error(`❌ [Migration] Failed for org ${org.name}:`, error);
        results[org.slug || org._id] = { error: String(error) };
      }
    }

    console.log(`✅ [Migration] Completed all organizations`);

    return {
      success: true,
      totalOrganizations: orgs.length,
      results,
    };
  },
});

// Export internal API
import { internal } from "../_generated/api";
