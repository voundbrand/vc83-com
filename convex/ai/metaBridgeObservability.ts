import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";

const metaBridgeSourceValidator = v.object({
  source: v.literal("operator_mobile"),
  platform: v.union(v.literal("ios"), v.literal("android"), v.literal("unknown")),
  runtime: v.literal("expo"),
});

const metaBridgePersistedEventValidator = v.object({
  id: v.string(),
  kind: v.union(v.literal("debug_event"), v.literal("snapshot")),
  atMs: v.number(),
  stage: v.string(),
  severity: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
  code: v.string(),
  message: v.string(),
  details: v.optional(v.record(v.string(), v.any())),
  connectionState: v.union(
    v.literal("disconnected"),
    v.literal("connecting"),
    v.literal("connected"),
    v.literal("error")
  ),
  diagnostics: v.record(v.string(), v.any()),
});

const metaBridgeUploadPayloadValidator = v.object({
  contractVersion: v.string(),
  schemaVersion: v.number(),
  generatedAtMs: v.number(),
  source: metaBridgeSourceValidator,
  events: v.array(metaBridgePersistedEventValidator),
});

const requestMetadataValidator = v.object({
  receivedAtMs: v.number(),
  endpoint: v.optional(v.string()),
  requestId: v.optional(v.string()),
  userAgent: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
});

function buildEventCodeCounts(events: Array<{ code: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    const key = event.code.trim();
    if (!key) {
      continue;
    }
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function mapEventSeverityToStatus(
  severity: "info" | "warn" | "error"
): "success" | "warning" | "error" {
  if (severity === "error") {
    return "error";
  }
  if (severity === "warn") {
    return "warning";
  }
  return "success";
}

export const persistUploadBatch = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    payload: metaBridgeUploadPayloadValidator,
    requestMetadata: requestMetadataValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const eventCount = args.payload.events.length;
    const eventCodeCounts = buildEventCodeCounts(args.payload.events);
    const normalizedUploadName = `meta-bridge-upload-${args.payload.generatedAtMs}`;

    const batchObjectId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "meta_bridge_observability_upload",
      subtype: args.payload.source.platform,
      name: normalizedUploadName,
      description: `Meta bridge upload batch (${eventCount} events)`,
      status: "accepted",
      customProperties: {
        contractVersion: args.payload.contractVersion,
        schemaVersion: args.payload.schemaVersion,
        generatedAtMs: args.payload.generatedAtMs,
        source: args.payload.source,
        eventCount,
        eventCodeCounts,
        requestMetadata: args.requestMetadata,
      },
      createdAt: now,
      updatedAt: now,
    });

    for (const event of args.payload.events) {
      const details = event.details || {};
      await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "meta_bridge_observability_event",
        subtype: event.kind,
        name: `${event.code}:${event.id}`,
        description: event.message,
        status: mapEventSeverityToStatus(event.severity),
        customProperties: {
          batchObjectId,
          contractVersion: args.payload.contractVersion,
          schemaVersion: args.payload.schemaVersion,
          source: args.payload.source,
          event,
          details,
        },
        createdAt: Math.max(0, Math.floor(event.atMs)),
        updatedAt: now,
      });
    }

    return {
      batchObjectId: batchObjectId as Id<"objects">,
      persistedEventCount: eventCount,
      receivedAtMs: args.requestMetadata.receivedAtMs,
    };
  },
});
