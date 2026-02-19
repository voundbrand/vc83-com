/**
 * Connection Tool Actions (Tier 2)
 *
 * Backend Convex actions that power the agent data connection tools.
 * These bridge agent tool calls to the detection logic + ontology mutations.
 *
 * Flow:
 * 1. detectWebAppConnections: fetch app files → run detection → search org records → return matches
 * 2. executeWebAppConnections: process decisions → create/link records → update builder app
 */

import { internalAction } from "../../_generated/server";
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { detectAllConnections, buildDetectionSummary } from "../../lib/connectionDetector";
import { getAutoCreateUnsupportedReason } from "./connectionTypeSupport";

// Lazy-load to avoid TS2589
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

// ============================================================================
// ACTION: Detect Web App Connections
// ============================================================================

/**
 * Analyze a builder app's page schema + files to detect connectable items,
 * then search the org's existing records for matches.
 */
export const detectWebAppConnections = internalAction({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const internal = getInternal();

    // 1. Fetch the builder app
    const app = await ctx.runQuery(
      internal.ai.tools.internalToolMutations.internalGetBuilderApp,
      { appId: args.appId }
    );
    if (!app) throw new Error("Builder app not found");

    // 2. Fetch builder files
    const files = await ctx.runQuery(
      internal.ai.tools.internalToolMutations.internalGetBuilderFiles,
      { appId: args.appId }
    );

    // 3. Extract page schema from data/page-data.json
    const pageDataFile = files.find(
      (f: { path: string }) => f.path === "data/page-data.json"
    );
    let pageSchema = null;
    if (pageDataFile) {
      try {
        pageSchema = JSON.parse(pageDataFile.content);
      } catch {
        // Invalid JSON — skip schema detection
      }
    }

    // 4. Run detection (pure functions, no DB)
    const detection = detectAllConnections(
      pageSchema,
      files.map((f: { path: string; content: string }) => ({
        path: f.path,
        content: f.content,
      }))
    );

    // 5. Collect all detected items for org record search
    const itemsForSearch = detection.sections.flatMap((s) =>
      s.detectedItems.map((item) => ({
        id: item.id,
        type: item.type,
        name: item.placeholderData.name || "",
      }))
    );

    // 6. Search org records for matches
    let matchResults: Record<string, unknown[]> = {};
    if (itemsForSearch.length > 0) {
      matchResults = await ctx.runQuery(
        internal.ai.tools.internalToolMutations.internalGetExistingRecordsForConnection,
        {
          organizationId: args.organizationId,
          detectedItems: itemsForSearch,
        }
      );
    }

    // 7. Merge matches into detection results
    for (const section of detection.sections) {
      for (const item of section.detectedItems) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item as any).existingMatches = matchResults[item.id] || [];
      }
    }

    return {
      appId: args.appId,
      appName: app.name,
      sections: detection.sections,
      totalItems: detection.totalItems,
      summary: buildDetectionSummary(detection),
    };
  },
});

// ============================================================================
// ACTION: Execute Web App Connections
// ============================================================================

/**
 * Process connection decisions: create new records, link existing ones, skip others.
 * All results are linked to the builder app via objectLinks.
 */
export const executeWebAppConnections = internalAction({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    appId: v.id("objects"),
    decisions: v.array(
      v.object({
        itemId: v.string(),
        action: v.union(v.literal("create"), v.literal("link"), v.literal("skip")),
        linkedRecordId: v.optional(v.string()),
        overrides: v.optional(v.any()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const internal = getInternal();

    // Build decision lookup
    const decisionMap = new Map(args.decisions.map((d) => [d.itemId, d]));

    // Re-run detection to get full item details (placeholder data for creation)
    const app = await ctx.runQuery(
      internal.ai.tools.internalToolMutations.internalGetBuilderApp,
      { appId: args.appId }
    );
    if (!app) throw new Error("Builder app not found");

    const files = await ctx.runQuery(
      internal.ai.tools.internalToolMutations.internalGetBuilderFiles,
      { appId: args.appId }
    );

    const pageDataFile = files.find(
      (f: { path: string }) => f.path === "data/page-data.json"
    );
    let pageSchema = null;
    if (pageDataFile) {
      try {
        pageSchema = JSON.parse(pageDataFile.content);
      } catch {
        // Invalid JSON
      }
    }

    const detection = detectAllConnections(
      pageSchema,
      files.map((f: { path: string; content: string }) => ({
        path: f.path,
        content: f.content,
      }))
    );

    // Process decisions
    const results: {
      created: Array<{ itemId: string; name: string; recordId: string; type: string }>;
      linked: Array<{ itemId: string; name: string; linkedTo: string }>;
      skipped: Array<{ itemId: string; name: string }>;
      errors: Array<{ itemId: string; name: string; error: string }>;
    } = { created: [], linked: [], skipped: [], errors: [] };

    const idsByType: Record<string, Id<"objects">[]> = {
      forms: [], contacts: [], products: [], events: [],
      invoices: [], tickets: [], bookings: [], workflows: [], checkouts: [],
    };

    const typeToBucket: Record<string, string> = {
      form: "forms", contact: "contacts", product: "products", event: "events",
      invoice: "invoices", ticket: "tickets", booking: "bookings",
      workflow: "workflows", checkout: "checkouts",
    };

    for (const section of detection.sections) {
      for (const item of section.detectedItems) {
        const decision = decisionMap.get(item.id);
        if (!decision || decision.action === "skip") {
          results.skipped.push({
            itemId: item.id,
            name: item.placeholderData.name || "Unknown",
          });
          continue;
        }

        const bucket = typeToBucket[item.type];

        // LINK: connect to existing record
        if (decision.action === "link" && decision.linkedRecordId) {
          if (bucket) {
            idsByType[bucket].push(decision.linkedRecordId as Id<"objects">);
          }
          results.linked.push({
            itemId: item.id,
            name: item.placeholderData.name || "Unknown",
            linkedTo: decision.linkedRecordId,
          });
          continue;
        }

        // CREATE: create new record from placeholder data
        if (decision.action === "create") {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const overrides = (decision.overrides || {}) as Record<string, any>;
            const recordId = await createRecordForType(
              ctx,
              internal,
              args.organizationId,
              args.userId,
              item.type,
              item.placeholderData,
              overrides
            );

            if (recordId && bucket) {
              idsByType[bucket].push(recordId as Id<"objects">);
            }
            results.created.push({
              itemId: item.id,
              name: item.placeholderData.name || "Unknown",
              recordId: recordId as string,
              type: item.type,
            });
          } catch (error) {
            results.errors.push({
              itemId: item.id,
              name: item.placeholderData.name || "Unknown",
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }

    // Link all collected records to the builder app
    const hasAnyIds = Object.values(idsByType).some((arr) => arr.length > 0);
    if (hasAnyIds) {
      const linkArgs: Record<string, unknown> = {
        appId: args.appId,
        userId: args.userId,
      };
      for (const [key, ids] of Object.entries(idsByType)) {
        if (ids.length > 0) linkArgs[key] = ids;
      }
      await ctx.runMutation(
        internal.ai.tools.internalToolMutations.internalLinkObjectsToBuilderApp,
        linkArgs
      );
    }

    // Update connection status
    await ctx.runMutation(
      internal.ai.tools.internalToolMutations.internalUpdateConnectionStatus,
      {
        appId: args.appId,
        connectionStatus: "completed",
        connectionCompletedAt: Date.now(),
      }
    );

    return results;
  },
});

// ============================================================================
// RECORD CREATION DISPATCHER
// ============================================================================

/**
 * Create a new record based on type, using the item's placeholder data.
 * Mirrors the creation logic in builder-context.tsx executeConnections.
 */
async function createRecordForType(
  ctx: { runMutation: (ref: any, args: any) => Promise<any> },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  internal: any,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  type: string,
  placeholderData: Record<string, unknown>,
  overrides: Record<string, unknown>
): Promise<Id<"objects"> | null> {
  const mutations = internal.ai.tools.internalToolMutations;
  const name = (overrides.name as string) || (placeholderData.name as string) || "New Record";

  switch (type) {
    case "contact": {
      const nameParts = name.split(" ");
      return await ctx.runMutation(mutations.internalCreateContact, {
        organizationId,
        userId,
        subtype: "lead",
        firstName: nameParts[0] || "New",
        lastName: nameParts.slice(1).join(" ") || "Contact",
        email: (overrides.email as string) || (placeholderData.email as string) || "",
        jobTitle: (overrides.description as string) || (placeholderData.description as string) || undefined,
        tags: ["builder"],
      });
    }

    case "form": {
      return await ctx.runMutation(mutations.internalCreateForm, {
        organizationId,
        userId,
        subtype: "registration",
        name,
        description: (overrides.description as string) || (placeholderData.description as string) || undefined,
      });
    }

    case "product": {
      const rawPrice = overrides.price ?? placeholderData.price;
      const price = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice)) || 0;
      return await ctx.runMutation(mutations.internalCreateProduct, {
        organizationId,
        userId,
        subtype: "digital",
        name,
        description: (overrides.description as string) || (placeholderData.description as string) || undefined,
        price,
      });
    }

    case "event": {
      const now = Date.now();
      return await ctx.runMutation(mutations.internalCreateEvent, {
        organizationId,
        userId,
        subtype: "meetup",
        name,
        description: (overrides.description as string) || (placeholderData.description as string) || undefined,
        startDate: now + 7 * 24 * 60 * 60 * 1000,
        endDate: now + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000,
        location: (overrides.location as string) || "TBD",
      });
    }

    case "invoice": {
      return await ctx.runMutation(mutations.internalCreateInvoice, {
        organizationId,
        userId,
        customerName: name,
        customerEmail: "draft@example.com",
        items: [],
        currency: "EUR",
        dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
    }

    case "workflow": {
      return await ctx.runMutation(mutations.internalCreateWorkflow, {
        organizationId,
        userId,
        name,
        trigger: "manual",
        status: "draft",
      });
    }

    default:
      {
        const unsupportedReason = getAutoCreateUnsupportedReason(type);
        if (unsupportedReason) {
          throw new Error(unsupportedReason);
        }
        throw new Error(`Unsupported record type: ${type}`);
      }
  }
}
