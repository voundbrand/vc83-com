/**
 * RESEND API KEY RESOLVER
 *
 * Resolves per-org Resend API key, falls back to system default.
 */

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/** Resolve Resend API key: per-org first, then system env fallback. */
export async function resolveResendApiKey(
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<string | null> {
  const settings = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "resend_settings")
    )
    .first();

  const props = settings?.customProperties as Record<string, unknown> | undefined;
  if (props?.resendApiKey) {
    return props.resendApiKey as string;
  }

  return process.env.RESEND_API_KEY || null;
}

/** Get API key with source info. */
export const getResendApiKeyForOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "resend_settings")
      )
      .first();

    const props = settings?.customProperties as Record<string, unknown> | undefined;
    if (props?.resendApiKey) {
      return { apiKey: props.resendApiKey as string, isPerOrg: true };
    }

    return { apiKey: process.env.RESEND_API_KEY || null, isPerOrg: false };
  },
});

/** Get sender config for an org. */
export const getResendSenderForOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "resend_settings")
      )
      .first();

    if (!settings) return null;
    const props = settings.customProperties as Record<string, unknown>;
    return {
      senderEmail: props.senderEmail as string,
      replyToEmail: (props.replyToEmail as string) || undefined,
    };
  },
});
