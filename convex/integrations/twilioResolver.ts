/**
 * TWILIO CREDENTIAL RESOLVER
 *
 * Resolves per-org Twilio credentials, falls back to system env vars.
 */

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/** Resolve Twilio credentials: per-org first, then system env fallback. */
export async function resolveTwilioCredentials(
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<{
  accountSid: string;
  authToken: string;
  verifyServiceSid: string | null;
  source: "org" | "platform";
} | null> {
  const settings = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "twilio_settings")
    )
    .first();

  const props = settings?.customProperties as Record<string, unknown> | undefined;
  if (props?.accountSid && props?.authToken) {
    return {
      accountSid: props.accountSid as string,
      authToken: props.authToken as string,
      verifyServiceSid: (props.verifyServiceSid as string) || null,
      source: "org",
    };
  }

  const envSid = process.env.TWILIO_ACCOUNT_SID;
  const envToken = process.env.TWILIO_AUTH_TOKEN;
  if (!envSid || !envToken) return null;

  return {
    accountSid: envSid,
    authToken: envToken,
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || null,
    source: "platform",
  };
}

/** Get credentials with source info. */
export const getTwilioCredentialsForOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    return resolveTwilioCredentials(ctx, args.organizationId);
  },
});

/** Get Verify service config for an org. */
export const getTwilioVerifyConfigForOrg = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const creds = await resolveTwilioCredentials(ctx, args.organizationId);
    if (!creds || !creds.verifyServiceSid) return null;
    return {
      accountSid: creds.accountSid,
      authToken: creds.authToken,
      verifyServiceSid: creds.verifyServiceSid,
      source: creds.source,
    };
  },
});
