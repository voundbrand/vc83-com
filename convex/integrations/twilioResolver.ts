/**
 * TWILIO CREDENTIAL RESOLVER
 *
 * Legacy shim kept for older callers. Resolution now delegates to the explicit
 * org-level Twilio runtime binding contract instead of ambient env fallback.
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../_generated/api");

/** Get effective Twilio credentials with source info. */
export const getTwilioCredentialsForOrg = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const runtime = await ctx.runAction(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioRuntimeBinding,
      { organizationId: args.organizationId },
    );

    if (!runtime?.accountSid || !runtime?.authToken || !runtime?.source) {
      return null;
    }

    return {
      accountSid: runtime.accountSid,
      authToken: runtime.authToken,
      verifyServiceSid: runtime.verifyServiceSid || null,
      source: runtime.source,
    };
  },
});

/** Get Verify service config for an org. */
export const getTwilioVerifyConfigForOrg = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const runtime = await ctx.runAction(
      generatedApi.internal.integrations.twilio.getOrganizationTwilioRuntimeBinding,
      { organizationId: args.organizationId },
    );

    if (
      !runtime?.accountSid ||
      !runtime?.authToken ||
      !runtime?.verifyServiceSid ||
      !runtime?.source
    ) {
      return null;
    }

    return {
      accountSid: runtime.accountSid,
      authToken: runtime.authToken,
      verifyServiceSid: runtime.verifyServiceSid,
      source: runtime.source,
    };
  },
});
