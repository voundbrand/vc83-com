import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/**
 * TEMPLATE RESOLUTION TELEMETRY
 *
 * Persists resolver-source checkpoints so template path usage can be measured
 * before deprecating legacy runtime branches.
 */
export const logTemplateResolutionCheckpoint = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    resolverSource: v.union(
      v.literal("template_set"),
      v.literal("direct_override"),
      v.literal("fallback")
    ),
    templateCapability: v.union(
      v.literal("document_invoice"),
      v.literal("document_ticket"),
      v.literal("transactional_email"),
      v.literal("web_event_page"),
      v.literal("checkout_surface")
    ),
    surface: v.string(),
    templateId: v.optional(v.id("objects")),
    templateCode: v.optional(v.string()),
    checkoutSessionId: v.optional(v.id("objects")),
    ticketId: v.optional(v.id("objects")),
    invoiceId: v.optional(v.id("objects")),
    context: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const objectId =
      args.templateId || args.invoiceId || args.ticketId || args.checkoutSessionId;

    if (!objectId) {
      return null;
    }

    return await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: objectId as Id<"objects">,
      actionType: "template_resolution_checkpoint",
      actionData: {
        resolverSource: args.resolverSource,
        templateCapability: args.templateCapability,
        surface: args.surface,
        templateId: args.templateId,
        templateCode: args.templateCode,
        checkoutSessionId: args.checkoutSessionId,
        ticketId: args.ticketId,
        invoiceId: args.invoiceId,
        context: args.context,
      },
      performedAt: Date.now(),
    });
  },
});
