/**
 * PAYMENT PROVIDER HELPERS
 *
 * Helper functions for using payment providers in Convex functions.
 * These wrap the provider interface with Convex-specific logic.
 *
 * @module paymentProviders/helpers
 */

import { query } from "../_generated/server";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { paymentProviders } from "./manager";
import { IPaymentProvider, OrganizationProviderConfig } from "./types";

/**
 * Get payment provider for an organization
 *
 * @param ctx - Convex context (Query or Mutation only, not Action)
 * @param organizationId - Organization ID
 * @returns Provider instance
 */
export async function getProviderForOrg(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">
): Promise<IPaymentProvider> {
  // Get organization
  const org = await ctx.db.get(organizationId);
  if (!org) {
    throw new Error("Organization not found");
  }

  // Get provider from manager
  return paymentProviders.getProviderForOrganization(org);
}

/**
 * Get payment provider by code
 *
 * @param providerCode - Provider code (e.g., "stripe-connect")
 * @returns Provider instance
 */
export function getProviderByCode(providerCode: string): IPaymentProvider {
  return paymentProviders.getProvider(providerCode);
}

/**
 * Get organization's provider config for a specific provider (ASYNC - queries objects table)
 *
 * This is the NEW preferred way to get provider config. It queries the objects table
 * as the single source of truth, with fallback to org.paymentProviders for backward compatibility.
 *
 * @param ctx - Query or Mutation context
 * @param organizationId - Organization ID
 * @param providerCode - Provider code to look for
 * @returns Provider config or undefined
 */
export async function getOrgProviderConfigFromObjects(
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  providerCode: string
): Promise<OrganizationProviderConfig | undefined> {
  // Query objects table first (single source of truth)
  const providerObject = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "payment_provider_config")
    )
    .filter((q) => q.eq(q.field("customProperties.providerCode"), providerCode))
    .first();

  if (providerObject && providerObject.customProperties) {
    const props = providerObject.customProperties;
    return {
      providerCode: props.providerCode as string,
      accountId: props.accountId as string,
      status: providerObject.status as "active" | "pending" | "restricted" | "disabled",
      isDefault: props.isDefault as boolean,
      isTestMode: props.isTestMode as boolean,
      connectedAt: props.connectedAt as number,
      lastStatusCheck: props.lastStatusCheck as number,
      metadata: props.metadata as Record<string, unknown>,
    };
  }

  // Fallback to org.paymentProviders for backward compatibility
  const org = await ctx.db.get(organizationId);
  if (!org) return undefined;

  return getOrgProviderConfig(org, providerCode);
}

/**
 * Get organization's provider config for a specific provider (SYNC - legacy)
 *
 * DEPRECATED: Use getOrgProviderConfigFromObjects instead for new code.
 * This function only reads from org.paymentProviders array and doesn't query objects table.
 *
 * @param org - Organization document
 * @param providerCode - Provider code to look for
 * @returns Provider config or undefined
 */
export function getOrgProviderConfig(
  org: {
    stripeConnectAccountId?: string;
    paymentProviders?: OrganizationProviderConfig[];
  },
  providerCode: string
): OrganizationProviderConfig | undefined {
  // Legacy support: Convert old Stripe fields to new format
  if (
    providerCode === "stripe-connect" &&
    org.stripeConnectAccountId &&
    !org.paymentProviders
  ) {
    return {
      providerCode: "stripe-connect",
      accountId: org.stripeConnectAccountId,
      status: "active",
      isDefault: true,
      isTestMode: false, // Assume production
      connectedAt: Date.now(), // Unknown, but required
    };
  }

  // New format (from org.paymentProviders array - backward compatibility)
  return org.paymentProviders?.find((p) => p.providerCode === providerCode);
}

/**
 * Update organization's provider config
 *
 * @param ctx - Mutation context
 * @param organizationId - Organization ID
 * @param config - Provider config to add/update
 */
export async function updateOrgProviderConfig(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  config: OrganizationProviderConfig
): Promise<void> {
  const org = await ctx.db.get(organizationId);
  if (!org) {
    throw new Error("Organization not found");
  }

  const existingProviders = org.paymentProviders || [];
  const existingIndex = existingProviders.findIndex(
    (p) => p.providerCode === config.providerCode
  );

  let updatedProviders: OrganizationProviderConfig[];

  if (existingIndex >= 0) {
    // Update existing provider
    updatedProviders = [...existingProviders];
    updatedProviders[existingIndex] = config;
  } else {
    // Add new provider
    updatedProviders = [...existingProviders, config];
  }

  // If this is set as default, unset other defaults
  if (config.isDefault) {
    updatedProviders = updatedProviders.map((p) =>
      p.providerCode === config.providerCode
        ? p
        : { ...p, isDefault: false }
    );
  }

  await ctx.db.patch(organizationId, {
    paymentProviders: updatedProviders,
    updatedAt: Date.now(),
  });

  // ALSO create/update the corresponding payment_provider_config object
  // This ensures webhooks can find the org and the UI stays in sync
  const existingObject = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "payment_provider_config")
    )
    .filter((q) => q.eq(q.field("customProperties.providerCode"), config.providerCode))
    .first();

  const objectData = {
    type: "payment_provider_config" as const,
    organizationId,
    name: config.providerCode,
    description: `Payment provider: ${config.providerCode}`,
    status: config.status as "active" | "pending" | "restricted" | "disabled",
    customProperties: {
      providerCode: config.providerCode,
      accountId: config.accountId,
      isDefault: config.isDefault,
      isTestMode: config.isTestMode,
      connectedAt: config.connectedAt,
      lastStatusCheck: config.lastStatusCheck,
      metadata: config.metadata,
      supportsB2B: true, // All providers support B2B
      supportsB2C: true, // All providers support B2C
    },
    updatedAt: Date.now(),
  };

  if (existingObject) {
    // Update existing object
    await ctx.db.patch(existingObject._id, objectData);
  } else {
    // Create new object
    // Note: createdBy should ideally be the user ID, but we don't have it in this context
    // We'll leave it undefined for system-created objects
    await ctx.db.insert("objects", {
      ...objectData,
      createdAt: Date.now(),
    });
  }
}

/**
 * Remove provider config from organization
 *
 * @param ctx - Mutation context
 * @param organizationId - Organization ID
 * @param providerCode - Provider code to remove
 */
export async function removeOrgProviderConfig(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  providerCode: string
): Promise<void> {
  const org = await ctx.db.get(organizationId);
  if (!org) {
    throw new Error("Organization not found");
  }

  const updatedProviders = (org.paymentProviders || []).filter(
    (p) => p.providerCode !== providerCode
  );

  await ctx.db.patch(organizationId, {
    paymentProviders: updatedProviders,
    updatedAt: Date.now(),
  });

  // ALSO delete the corresponding payment_provider_config object
  const existingObject = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "payment_provider_config")
    )
    .filter((q) => q.eq(q.field("customProperties.providerCode"), providerCode))
    .first();

  if (existingObject) {
    await ctx.db.delete(existingObject._id);
  }
}

/**
 * Get connected account ID for a provider
 *
 * @param org - Organization document
 * @param providerCode - Provider code
 * @returns Connected account ID or undefined
 */
export function getConnectedAccountId(
  org: {
    stripeConnectAccountId?: string;
    paymentProviders?: OrganizationProviderConfig[];
  },
  providerCode: string
): string | undefined {
  const config = getOrgProviderConfig(org, providerCode);
  return config?.accountId;
}

/**
 * Check if organization has a provider connected
 *
 * @param org - Organization document
 * @param providerCode - Provider code to check
 * @returns True if provider is connected
 */
export function hasProviderConnected(
  org: {
    stripeConnectAccountId?: string;
    paymentProviders?: OrganizationProviderConfig[];
  },
  providerCode: string
): boolean {
  const config = getOrgProviderConfig(org, providerCode);
  return !!config && config.status !== "disabled";
}

// =========================================
// PROVIDER AVAILABILITY QUERIES
// =========================================

/**
 * Get all available payment providers for an organization
 *
 * Returns providers stored in the "objects" table with type "payment_provider_config"
 * for the given organization. Includes all statuses (active, disabled, pending, restricted)
 * so the UI can show appropriate status indicators.
 */
export const getAvailableProviders = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    // Get all provider configs for org from objects table (not just active!)
    const providerConfigs = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "payment_provider_config")
      )
      .collect();

    return providerConfigs.map((config) => {
      const props = config.customProperties || {};
      return {
        providerCode: props.providerCode as string,
        providerName: config.name,
        status: config.status as "active" | "pending" | "restricted" | "disabled",
        isDefault: props.isDefault as boolean,
        isTestMode: props.isTestMode as boolean,
        metadata: props.metadata as Record<string, unknown> | undefined,
        capabilities: {
          supportsB2B: props.supportsB2B as boolean,
          supportsB2C: props.supportsB2C as boolean,
        },
      };
    });
  },
});

/**
 * Get default payment provider for organization
 *
 * Returns the provider code of the default provider, or null if none configured.
 */
export const getDefaultProvider = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const defaultConfig = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", organizationId).eq("type", "payment_provider_config")
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("customProperties.isDefault"), true)
        )
      )
      .first();

    return defaultConfig?.customProperties?.providerCode as string | null;
  },
});
