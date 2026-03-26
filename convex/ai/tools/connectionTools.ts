/**
 * Connection Agent Tools (Tier 1)
 *
 * Tools that let agents detect placeholder data in builder apps and connect it
 * to real organization records. Channel-agnostic — works from Telegram, WhatsApp,
 * or internal web chat.
 *
 * Flow:
 * 1. Agent creates app with create_webapp
 * 2. detect_webapp_connections → scans app, finds connectable items + org matches
 * 3. Agent presents options to user (or auto-links exact matches)
 * 4. connect_webapp_data → creates/links records in batch
 * 5. deploy_webapp → push to GitHub + Vercel
 */

import type { AITool, ToolExecutionContext } from "./registry";
import type { Id } from "../../_generated/dataModel";

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
// TOOL: detect_webapp_connections
// ============================================================================

export const detectWebAppConnectionsTool: AITool = {
  name: "detect_webapp_connections",
  description:
    "Analyze a builder web app to find placeholder data that can be connected to real organization records. " +
    "Detects products (from pricing sections), contacts (from team sections), events (from date references), " +
    "forms, invoices, bookings, workflows, and checkouts. " +
    "Returns detected items with similarity-ranked matches from existing organization records. " +
    "Call this after create_webapp to prepare the data connection step.",
  status: "ready",
  readOnly: true,
  windowName: "Builder",
  parameters: {
    type: "object",
    properties: {
      appId: {
        type: "string",
        description: "Builder app ID returned by create_webapp",
      },
    },
    required: ["appId"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: { appId: string }
  ) => {
    const internal = getInternal();

    try {
      const result = await ctx.runAction(
        internal.ai.tools.connectionToolActions.detectWebAppConnections,
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          appId: args.appId as Id<"objects">,
        }
      );

      return {
        success: true,
        appId: result.appId,
        appName: result.appName,
        sections: result.sections,
        totalItems: result.totalItems,
        summary: result.summary,
        message:
          result.totalItems > 0
            ? `Found ${result.totalItems} connectable item${result.totalItems === 1 ? "" : "s"} in "${result.appName}". ${result.summary}`
            : `No connectable items found in "${result.appName}". The app may not have pricing, team, or form sections.`,
        nextStep:
          result.totalItems > 0
            ? "Review the detected items and use connect_webapp_data to create or link records."
            : null,
      };
    } catch (error) {
      return {
        success: false,
        error: `Detection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

// ============================================================================
// TOOL: connect_webapp_data
// ============================================================================

export const connectWebAppDataTool: AITool = {
  name: "connect_webapp_data",
  description:
    "Execute data connections for a builder web app. Takes an array of decisions (create/link/skip) " +
    "for each detected item from detect_webapp_connections. " +
    "Creates new organization records from placeholder data and/or links to existing records. " +
    "All connections are applied in a single batch operation. " +
    "Supports idempotent retries via idempotencyKey. " +
    "For high-confidence matches (similarity 1.0), you can auto-link without asking the user. " +
    "For lower confidence, ask the user first.",
  status: "ready",
  windowName: "Builder",
  parameters: {
    type: "object",
    properties: {
      appId: {
        type: "string",
        description: "Builder app ID from detect_webapp_connections",
      },
      decisions: {
        type: "array",
        description: "Array of connection decisions for detected items",
        items: {
          type: "object",
          properties: {
            itemId: {
              type: "string",
              description: "Item ID from the detection result",
            },
            action: {
              type: "string",
              enum: ["create", "link", "skip"],
              description:
                "What to do: 'create' a new record from placeholder data, " +
                "'link' to an existing record (requires linkedRecordId), " +
                "or 'skip' to leave unconnected",
            },
            linkedRecordId: {
              type: "string",
              description:
                "Required when action is 'link': the existing record ID to connect to",
            },
            overrides: {
              type: "object",
              description:
                "Optional: override placeholder values when creating " +
                "(e.g., { name: 'Better Name', price: 49.99 })",
            },
          },
          required: ["itemId", "action"],
        },
      },
      idempotencyKey: {
        type: "string",
        description:
          "Optional stable key for retry-safe connection runs. Reusing the same key avoids duplicate side effects.",
      },
    },
    required: ["appId", "decisions"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      appId: string;
      decisions: Array<{
        itemId: string;
        action: "create" | "link" | "skip";
        linkedRecordId?: string;
        overrides?: Record<string, unknown>;
      }>;
      idempotencyKey?: string;
    }
  ) => {
    // Validate: link decisions must have linkedRecordId
    for (const d of args.decisions) {
      if (d.action === "link" && !d.linkedRecordId) {
        return {
          success: false,
          error: `Decision for item "${d.itemId}" is "link" but no linkedRecordId provided. ` +
            `Use the record ID from detect_webapp_connections existingMatches.`,
          hint: "Each 'link' decision needs a linkedRecordId from the detection results.",
        };
      }
    }

    const internal = getInternal();

    try {
      const result = await ctx.runAction(
        internal.ai.tools.connectionToolActions.executeWebAppConnections,
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          appId: args.appId as Id<"objects">,
          decisions: args.decisions,
          idempotencyKey: args.idempotencyKey,
          conversationId: ctx.conversationId,
        }
      );

      const parts: string[] = [];
      if (result.reusedRun) {
        parts.push("reused previous idempotent run");
      }
      if (result.created.length > 0) parts.push(`${result.created.length} new record${result.created.length === 1 ? "" : "s"} created`);
      if (result.linked.length > 0) parts.push(`${result.linked.length} existing record${result.linked.length === 1 ? "" : "s"} linked`);
      if (result.skipped.length > 0) parts.push(`${result.skipped.length} item${result.skipped.length === 1 ? "" : "s"} skipped`);
      if (result.errors.length > 0) parts.push(`${result.errors.length} error${result.errors.length === 1 ? "" : "s"}`);

      return {
        success: result.errors.length === 0,
        message: `Connections complete: ${parts.join(", ")}.`,
        created: result.created,
        linked: result.linked,
        skipped: result.skipped,
        errors: result.errors,
        reusedRun: result.reusedRun === true,
        idempotencyKey: result.idempotencyKey,
        nextStep:
          result.errors.length === 0
            ? "Data is connected. Call deploy_webapp to deploy the app."
            : "Some connections failed. Review the errors and retry or skip those items.",
      };
    } catch (error) {
      return {
        success: false,
        error: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

// ============================================================================
// TOOL: list_connected_apps
// ============================================================================

export const listConnectedAppsTool: AITool = {
  name: "list_connected_apps",
  description:
    "List connected applications in the current organization. " +
    "Use this when the user asks which apps are connected, app status, or recent app activity.",
  status: "ready",
  readOnly: true,
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description:
          "Optional status filter (for example: 'active' or 'archived').",
      },
      limit: {
        type: "number",
        description: "Optional max number of apps to return (default 20, max 100).",
      },
      offset: {
        type: "number",
        description: "Optional pagination offset (default 0).",
      },
    },
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ) => {
    const internal = getInternal();

    const limit = Math.min(Math.max(Math.floor(args.limit ?? 20), 1), 100);
    const offset = Math.max(Math.floor(args.offset ?? 0), 0);
    const status = typeof args.status === "string" ? args.status.trim() : "";

    try {
      const result = await ctx.runQuery(
        internal.applicationOntology.listApplicationsInternal,
        {
          organizationId: ctx.organizationId,
          status: status.length > 0 ? status : undefined,
          limit,
          offset,
        }
      );

      const applications = (result.applications || []).map(
        (app: {
          _id: Id<"objects">;
          name: string;
          status?: string;
          subtype?: string;
          createdAt?: number;
          updatedAt?: number;
          customProperties?: Record<string, unknown>;
        }) => {
          const props = (app.customProperties || {}) as Record<string, unknown>;
          const source = (props.source || {}) as Record<string, unknown>;
          const connection = (props.connection || {}) as Record<string, unknown>;
          const cli = (props.cli || {}) as Record<string, unknown>;
          const features = Array.isArray(connection.features)
            ? connection.features.filter(
              (feature): feature is string => typeof feature === "string"
            )
            : [];
          const lastActivityAt =
            typeof cli.lastActivityAt === "number" ? cli.lastActivityAt : null;

          return {
            applicationId: app._id,
            name: app.name,
            status: app.status || "unknown",
            subtype: app.subtype || null,
            framework:
              typeof source.framework === "string" ? source.framework : null,
            features,
            createdAt:
              typeof app.createdAt === "number"
                ? new Date(app.createdAt).toISOString()
                : null,
            updatedAt:
              typeof app.updatedAt === "number"
                ? new Date(app.updatedAt).toISOString()
                : null,
            lastActivityAt:
              typeof lastActivityAt === "number"
                ? new Date(lastActivityAt).toISOString()
                : null,
          };
        }
      );

      return {
        success: true,
        total: result.total,
        returned: applications.length,
        hasMore: result.hasMore === true,
        nextOffset: result.hasMore === true ? offset + applications.length : null,
        applications,
        message:
          applications.length > 0
            ? `Found ${applications.length} connected app${applications.length === 1 ? "" : "s"}.`
            : "No connected apps found for this organization.",
      };
    } catch (error) {
      return {
        success: false,
        error: `Could not list connected apps: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
