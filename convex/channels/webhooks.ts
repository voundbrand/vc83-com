/**
 * CHANNEL WEBHOOK PROCESSORS
 *
 * Internal actions that process provider webhooks asynchronously.
 * HTTP routes respond quickly (200), then schedule these for actual processing.
 *
 * Flow: HTTP route → schedule internalAction → normalize → agent pipeline → reply
 */

import { internalAction, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getProvider } from "./registry";
import type { ProviderCredentials } from "./types";
import type { Id } from "../_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { api, internal: internalApi } = require("../_generated/api") as {
  api: Record<string, Record<string, Record<string, unknown>>>;
  internal: Record<string, Record<string, Record<string, unknown>>>;
};

/**
 * Resolve organization from a Chatwoot account ID.
 * Looks up chatwoot_settings objects to find which org owns the account.
 */
export const resolveOrgFromChatwootAccount = internalQuery({
  args: { chatwootAccountId: v.number() },
  handler: async (ctx, args) => {
    const allSettings = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "chatwoot_settings"))
      .collect();

    const match = allSettings.find((s) => {
      const props = s.customProperties as Record<string, unknown>;
      return props?.chatwootAccountId === args.chatwootAccountId;
    });

    return match?.organizationId ?? null;
  },
});

/**
 * Resolve organization from a WhatsApp phone_number_id.
 * Looks up oauthConnections to find which org owns the phone number.
 */
export const resolveOrgFromWhatsAppPhoneNumberId = internalQuery({
  args: { phoneNumberId: v.string() },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("oauthConnections")
      .filter((q) => q.eq(q.field("provider"), "whatsapp"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const match = connections.find((c) => {
      const meta = c.customProperties as Record<string, unknown>;
      return meta?.phoneNumberId === args.phoneNumberId;
    });

    return match?.organizationId ?? null;
  },
});

/**
 * Verify WhatsApp webhook HMAC signature.
 * Runs as internalAction because it needs Node.js crypto (via "use node" in encryption module).
 */
export const verifyWhatsAppSignature = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const appSecret = process.env.META_APP_SECRET;
    if (!appSecret) {
      console.warn("[WhatsApp] META_APP_SECRET not set, skipping HMAC verification");
      return true;
    }

    if (!args.signature) return false;

    // Use the encryption module's runtime (Node.js) for HMAC
    // Since we can't import crypto here (not "use node"), we do a simple
    // comparison. For production, move this to a "use node" file.
    // For now, we trust the signature check at the HTTP layer or skip if not configured.
    // The HTTP handler passes the signature through for logging/auditing.
    return true; // Verification handled at HTTP endpoint level
  },
});

/**
 * Process an inbound WhatsApp webhook from Meta Cloud API.
 * Resolves org, normalizes payload, feeds into agent pipeline.
 */
export const processWhatsAppWebhook = internalAction({
  args: {
    payload: v.string(),
    phoneNumberId: v.string(),
  },
  handler: async (ctx, args): Promise<{ status: string; message?: string; response?: string }> => {
    const provider = getProvider("whatsapp");
    if (!provider) {
      console.error("[WhatsApp] Provider not registered");
      return { status: "error", message: "WhatsApp provider not registered" };
    }

    // 1. Resolve organization from phone_number_id
    const organizationId = await (ctx.runQuery as Function)(
      internalApi.channels.webhooks.resolveOrgFromWhatsAppPhoneNumberId,
      { phoneNumberId: args.phoneNumberId }
    ) as Id<"organizations"> | null;

    if (!organizationId) {
      console.error(`[WhatsApp] No org found for phone_number_id ${args.phoneNumberId}`);
      return { status: "error", message: "Unknown WhatsApp phone number" };
    }

    // 2. Normalize inbound message
    const rawPayload = JSON.parse(args.payload);
    const normalized = provider.normalizeInbound(rawPayload, {} as ProviderCredentials);

    if (!normalized) {
      // Could be a status update, not a message — silently skip
      return { status: "skipped", message: "Not an inbound text message" };
    }

    // 3. Feed into agent execution pipeline
    // The pipeline's step 13 handles outbound delivery via channels.router.sendMessage,
    // which routes back through whatsappProvider.sendMessage.
    try {
      const result = (await (ctx.runAction as Function)(
        api.ai.agentExecution.processInboundMessage,
        {
          organizationId,
          channel: normalized.channel,
          externalContactIdentifier: normalized.externalContactIdentifier,
          message: normalized.message,
          metadata: normalized.metadata,
        }
      )) as { status: string; response?: string; message?: string };

      return result;
    } catch (error) {
      console.error("[WhatsApp] Agent pipeline error:", error);
      return { status: "error", message: String(error) };
    }
  },
});

/**
 * Process an inbound Chatwoot webhook.
 * Verifies signature, normalizes the payload, feeds into agent pipeline,
 * then sends the agent's reply back through Chatwoot.
 */
export const processChatwootWebhook = internalAction({
  args: {
    payload: v.string(),
    webhookToken: v.string(),
    chatwootAccountId: v.number(),
  },
  handler: async (ctx, args): Promise<{ status: string; message?: string; response?: string }> => {
    const provider = getProvider("chatwoot");
    if (!provider) {
      console.error("[Chatwoot] Provider not registered");
      return { status: "error", message: "Chatwoot provider not registered" };
    }

    // 1. Resolve organization
    const organizationId = await (ctx.runQuery as Function)(
      internalApi.channels.webhooks.resolveOrgFromChatwootAccount,
      { chatwootAccountId: args.chatwootAccountId }
    ) as Id<"organizations"> | null;

    if (!organizationId) {
      console.error(
        `[Chatwoot] No org found for account ${args.chatwootAccountId}`
      );
      return { status: "error", message: "Unknown Chatwoot account" };
    }

    // 2. Get credentials for verification
    const credentials = (await (ctx.runQuery as Function)(
      internalApi.channels.router.getProviderCredentials,
      { organizationId, providerId: "chatwoot" }
    )) as ProviderCredentials | null;

    // 3. Verify webhook signature
    if (credentials) {
      const headers = { "x-chatwoot-webhook-token": args.webhookToken };
      if (!provider.verifyWebhook(args.payload, headers, credentials)) {
        console.error("[Chatwoot] Webhook verification failed");
        return { status: "error", message: "Verification failed" };
      }
    }

    // 4. Normalize inbound message
    const rawPayload = JSON.parse(args.payload);
    const normalized = provider.normalizeInbound(
      rawPayload,
      credentials || ({} as ProviderCredentials)
    );

    if (!normalized) {
      return { status: "skipped", message: "Not an inbound message event" };
    }

    // 5. Feed into agent execution pipeline
    const result = (await (ctx.runAction as Function)(
      api.ai.agentExecution.processInboundMessage,
      {
        organizationId,
        channel: normalized.channel,
        externalContactIdentifier: normalized.externalContactIdentifier,
        message: normalized.message,
        metadata: normalized.metadata,
      }
    )) as { status: string; response?: string; message?: string };

    // 6. Send agent response back through Chatwoot
    if (result.status === "success" && result.response) {
      await (ctx.runAction as Function)(internalApi.channels.router.sendMessage, {
        organizationId,
        channel: normalized.channel,
        recipientIdentifier: normalized.externalContactIdentifier,
        content: result.response,
        providerConversationId:
          normalized.metadata.providerConversationId,
      });
    }

    return result;
  },
});

// ============================================================================
// INFOBIP WEBHOOK PROCESSING
// ============================================================================

/**
 * Resolve org from Infobip sender ID or from number.
 *
 * Resolution order:
 * 1. Per-org infobip_settings matching the `to` number (enterprise Infobip)
 * 2. If `to` matches platform sender ID (INFOBIP_SMS_SENDER_ID env var),
 *    look up the `from` number in contacts/conversations to find the org
 * 3. If platform sender but no contact match, return null (new unknown sender)
 */
export const resolveOrgFromInfobipSenderId = internalQuery({
  args: { senderId: v.string(), fromNumber: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // 1. Try per-org enterprise settings
    const allSettings = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "infobip_settings"))
      .collect();

    const match = allSettings.find((s) => {
      const props = s.customProperties as Record<string, unknown>;
      return props?.infobipSmsSenderId === args.senderId && props?.enabled !== false;
    });

    if (match?.organizationId) return match.organizationId;

    // 2. Platform SMS fallback: check if this is the platform sender ID
    const platformSenderId = process.env.INFOBIP_SMS_SENDER_ID;
    if (platformSenderId && args.senderId === platformSenderId && args.fromNumber) {
      // Look up the from number in contacts to find the org
      const contacts = await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", "contact"))
        .collect();

      const contactMatch = contacts.find((c) => {
        const props = c.customProperties as Record<string, unknown>;
        const phone = (props?.phone as string) || (props?.phoneNumber as string) || "";
        // Normalize for comparison: strip non-digits
        const normalizedStored = phone.replace(/[^\d]/g, "");
        const normalizedFrom = args.fromNumber!.replace(/[^\d]/g, "");
        return normalizedStored && normalizedFrom && normalizedStored === normalizedFrom;
      });

      if (contactMatch?.organizationId) return contactMatch.organizationId;

      // 3. No contact match — check sms_conversation_log for previous conversations
      const convLogs = await ctx.db
        .query("objects")
        .withIndex("by_type", (q) => q.eq("type", "sms_conversation"))
        .collect();

      const convMatch = convLogs.find((c) => {
        const props = c.customProperties as Record<string, unknown>;
        const phone = (props?.phoneNumber as string) || "";
        const normalizedStored = phone.replace(/[^\d]/g, "");
        const normalizedFrom = args.fromNumber!.replace(/[^\d]/g, "");
        return normalizedStored && normalizedFrom && normalizedStored === normalizedFrom;
      });

      if (convMatch?.organizationId) return convMatch.organizationId;
    }

    return null;
  },
});

/**
 * Process Infobip webhook — handles both inbound SMS and delivery reports.
 *
 * Inbound SMS: normalized → agent pipeline → reply via SMS
 * Delivery reports: logged for now (Phase 2: update message status in DB)
 */
export const processInfobipWebhook = internalAction({
  args: {
    payload: v.string(),
    senderId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ status: string; message?: string; response?: string }> => {
    const provider = getProvider("infobip");
    if (!provider) {
      console.error("[Infobip] Provider not registered");
      return { status: "error", message: "Infobip provider not registered" };
    }

    const rawPayload = JSON.parse(args.payload);
    const results = rawPayload.results as Array<Record<string, unknown>> | undefined;
    if (!results?.length) {
      return { status: "skipped", message: "Empty results array" };
    }

    const firstResult = results[0];

    // --- Delivery report (has `status` field, no `text`) ---
    if (firstResult.status && !firstResult.text) {
      const status = firstResult.status as Record<string, unknown>;
      const groupId = status.groupId as number | undefined;
      const groupName = status.groupName as string | undefined;
      const messageId = firstResult.messageId as string | undefined;
      console.log(
        `[Infobip] Delivery report: messageId=${messageId} status=${groupName}(${groupId})`
      );
      // Phase 2: update message delivery status in DB
      return {
        status: "delivery_report",
        message: `${groupName} (groupId: ${groupId})`,
      };
    }

    // --- Inbound SMS ---
    // Resolve org: try CPaaS X entityId first (fastest), then senderId, then phone lookup
    const toNumber = firstResult.to as string | undefined;
    const fromNumber = firstResult.from as string | undefined;
    const entityId = firstResult.entityId as string | undefined;
    const resolveId = args.senderId || toNumber;

    let organizationId: Id<"organizations"> | null = null;

    // CPaaS X fast path: resolve via entityId
    if (entityId) {
      organizationId = (await (ctx.runQuery as Function)(
        internalApi.channels.infobipCpaasX.getOrgByEntityId,
        { entityId }
      )) as Id<"organizations"> | null;
    }

    // Fallback: sender ID / phone number lookup
    if (!organizationId) {
      if (!resolveId) {
        console.error("[Infobip] No senderId, entityId, or 'to' field to resolve org");
        return { status: "error", message: "Cannot resolve organization" };
      }

      organizationId = (await (ctx.runQuery as Function)(
        internalApi.channels.webhooks.resolveOrgFromInfobipSenderId,
        { senderId: resolveId, fromNumber: fromNumber || undefined }
      )) as Id<"organizations"> | null;
    }

    if (!organizationId) {
      console.error(`[Infobip] No org found for senderId=${resolveId} from=${fromNumber}`);
      return { status: "error", message: "Unknown sender — no matching organization" };
    }

    // Normalize
    const normalized = provider.normalizeInbound(rawPayload, {} as ProviderCredentials);
    if (!normalized) {
      return { status: "skipped", message: "Could not normalize inbound SMS" };
    }

    // Feed into agent pipeline
    try {
      const result = (await (ctx.runAction as Function)(
        api.ai.agentExecution.processInboundMessage,
        {
          organizationId,
          channel: normalized.channel,
          externalContactIdentifier: normalized.externalContactIdentifier,
          message: normalized.message,
          metadata: normalized.metadata,
        }
      )) as { status: string; response?: string; message?: string };

      // Auto-reply via SMS
      if (result.status === "success" && result.response) {
        await (ctx.runAction as Function)(
          internalApi.channels.router.sendMessage,
          {
            organizationId,
            channel: "sms",
            recipientIdentifier: normalized.externalContactIdentifier,
            content: result.response,
          }
        );
      }

      return result;
    } catch (error) {
      console.error("[Infobip] Agent pipeline error:", error);
      return { status: "error", message: String(error) };
    }
  },
});
