/**
 * INFOBIP CPaaS X — Applications & Entities
 *
 * Multi-tenant isolation for the L4YERCAK3 platform.
 * - Application = L4YERCAK3 platform (one per environment)
 * - Entity = L4YERCAK3 organization (one per org)
 *
 * When sending SMS via the platform Infobip account, each message includes
 * applicationId + entityId for per-org isolation, reporting, and security.
 *
 * Infobip CPaaS X docs:
 * https://www.infobip.com/docs/cpaas-x/application-and-entity-management
 * https://www.infobip.com/docs/api/platform/application-entity
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { internal: internalApi } = require("../_generated/api") as {
  internal: Record<string, Record<string, Record<string, unknown>>>;
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the platform application ID from env var.
 * Set INFOBIP_APPLICATION_ID after creating the application via
 * ensurePlatformApplication or the Infobip portal.
 */
export const getPlatformApplicationId = internalQuery({
  args: {},
  handler: async (_ctx): Promise<string | null> => {
    return process.env.INFOBIP_APPLICATION_ID || null;
  },
});

/**
 * Get the Infobip entity ID for an org.
 * Returns null if the org has no entity provisioned yet.
 */
export const getOrgEntityId = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<string | null> => {
    const entity = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "infobip_entity")
      )
      .first();

    if (!entity) return null;
    return (entity.customProperties as Record<string, unknown>)
      ?.entityId as string | null;
  },
});

/**
 * Look up organization by Infobip entity ID.
 * Used by webhook handler to resolve org from inbound entityId.
 */
export const getOrgByEntityId = internalQuery({
  args: { entityId: v.string() },
  handler: async (ctx, args): Promise<Id<"organizations"> | null> => {
    const allEntities = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("type"), "infobip_entity"))
      .collect();

    const match = allEntities.find((e) => {
      const props = e.customProperties as Record<string, unknown>;
      return props?.entityId === args.entityId;
    });

    return (match?.organizationId as Id<"organizations">) ?? null;
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * Ensure the platform-level Infobip Application exists.
 * Idempotent: safe to call multiple times.
 *
 * Creates the application on Infobip and returns the ID.
 * After first run, set INFOBIP_APPLICATION_ID env var to skip future API calls.
 *
 * Uses INFOBIP_API_KEY + INFOBIP_BASE_URL env vars.
 */
export const ensurePlatformApplication = internalAction({
  args: {},
  handler: async (_ctx): Promise<{ applicationId: string }> => {
    // If env var is set, use it directly (already provisioned)
    const envAppId = process.env.INFOBIP_APPLICATION_ID;
    if (envAppId) {
      return { applicationId: envAppId };
    }

    // Create via Infobip API
    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL;
    if (!apiKey || !baseUrl) {
      throw new Error("INFOBIP_API_KEY and INFOBIP_BASE_URL required for CPaaS X provisioning");
    }

    const applicationId = "l4yercak3-prod";
    const applicationName = "L4YERCAK3";

    const response = await fetch(`${baseUrl}/provisioning/1/applications`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ applicationId, applicationName }),
    });

    if (response.ok || response.status === 409) {
      // 409 = already exists, which is fine (idempotent)
      console.log(
        `[CPaaS X] Platform application created/confirmed: ${applicationId}. ` +
        `Set INFOBIP_APPLICATION_ID="${applicationId}" env var to skip future API calls.`
      );
      return { applicationId };
    }

    const errText = await response.text().catch(() => "");
    throw new Error(
      `Failed to create Infobip Application: HTTP ${response.status} — ${errText.substring(0, 300)}`
    );
  },
});

/**
 * Provision an Infobip Entity for an organization.
 * Called lazily on first platform SMS send.
 * Idempotent: safe to call multiple times for the same org.
 */
export const provisionOrgEntity = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<{ entityId: string }> => {
    // Check if already provisioned
    const existing = await (ctx.runQuery as Function)(
      internalApi.channels.infobipCpaasX.getOrgEntityId,
      { organizationId: args.organizationId }
    ) as string | null;

    if (existing) {
      return { entityId: existing };
    }

    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL;
    if (!apiKey || !baseUrl) {
      throw new Error("INFOBIP_API_KEY and INFOBIP_BASE_URL required for entity provisioning");
    }

    // Get org name for the entity
    const org = await (ctx.runQuery as Function)(
      internalApi.channels.infobipCpaasX.getOrgName,
      { organizationId: args.organizationId }
    ) as string;

    // Entity ID: use the Convex org ID (stable, unique)
    const entityId = `org-${args.organizationId}`;
    const entityName = org || entityId;

    const response = await fetch(`${baseUrl}/provisioning/1/entities`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entityId, entityName }),
    });

    if (response.ok || response.status === 409) {
      // Store in objects table
      await (ctx.runMutation as Function)(
        internalApi.channels.infobipCpaasX.storeOrgEntity,
        {
          organizationId: args.organizationId,
          entityId,
          entityName,
        }
      );
      return { entityId };
    }

    const errText = await response.text().catch(() => "");
    throw new Error(
      `Failed to create Infobip Entity for org ${args.organizationId}: HTTP ${response.status} — ${errText.substring(0, 300)}`
    );
  },
});

/**
 * Delete an Infobip Entity when an org disconnects or is deleted.
 */
export const deleteOrgEntity = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<void> => {
    const entityId = await (ctx.runQuery as Function)(
      internalApi.channels.infobipCpaasX.getOrgEntityId,
      { organizationId: args.organizationId }
    ) as string | null;

    if (!entityId) return; // Nothing to delete

    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL;

    // Best-effort delete from Infobip
    if (apiKey && baseUrl) {
      try {
        await fetch(`${baseUrl}/provisioning/1/entities/${entityId}`, {
          method: "DELETE",
          headers: { Authorization: `App ${apiKey}` },
        });
      } catch (e) {
        console.error("[CPaaS X] Failed to delete entity from Infobip:", e);
      }
    }

    // Remove from local DB
    await (ctx.runMutation as Function)(
      internalApi.channels.infobipCpaasX.removeOrgEntity,
      { organizationId: args.organizationId }
    );
  },
});

// ============================================================================
// INTERNAL MUTATIONS (storage helpers)
// ============================================================================

/**
 * Store an org entity record.
 */
export const storeOrgEntity = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    entityId: v.string(),
    entityName: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "infobip_entity")
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        customProperties: {
          entityId: args.entityId,
          entityName: args.entityName,
          updatedAt: Date.now(),
        },
        updatedAt: Date.now(),
      });
      return;
    }

    await ctx.db.insert("objects", {
      type: "infobip_entity",
      name: `Infobip Entity: ${args.entityName}`,
      organizationId: args.organizationId,
      status: "active",
      customProperties: {
        entityId: args.entityId,
        entityName: args.entityName,
        provisionedAt: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Remove an org entity record from DB.
 */
export const removeOrgEntity = internalMutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const entity = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", "infobip_entity")
      )
      .first();

    if (entity) {
      await ctx.db.delete(entity._id);
    }
  },
});

/**
 * Helper: get org name for entity naming.
 */
export const getOrgName = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args): Promise<string> => {
    const org = await ctx.db.get(args.organizationId);
    return org?.name || `org-${args.organizationId}`;
  },
});
