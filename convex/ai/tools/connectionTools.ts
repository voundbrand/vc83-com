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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
        }
      );

      const parts: string[] = [];
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
