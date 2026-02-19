/**
 * TELEGRAM CHAT-TO-ORG RESOLVER
 *
 * Maps Telegram chat_id → organization for inbound message routing.
 *
 * Resolution logic:
 * - Known chat_id + "active" → route to their org's agent
 * - Known chat_id + "onboarding" → route to System Bot (resume interview)
 * - Unknown chat_id → create mapping in "onboarding" state, route to System Bot
 *
 * The System Bot is the platform org's agent — it handles onboarding interviews.
 */

import { action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { internal: internalApi } = require("../_generated/api") as {
  internal: Record<string, Record<string, Record<string, unknown>>>;
};

/**
 * The platform org that owns the System Bot.
 * Set via PLATFORM_ORG_ID env var, or defaults to TEST_ORG_ID for dev.
 */
function getPlatformOrgId(): Id<"organizations"> {
  const id = process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID;
  if (!id) throw new Error("PLATFORM_ORG_ID or TEST_ORG_ID must be set");
  return id as Id<"organizations">;
}

async function emitTelegramFunnelEvent(
  ctx: any,
  args: {
    eventName:
      | "onboarding.funnel.first_touch"
      | "onboarding.funnel.activation";
    organizationId: Id<"organizations">;
    telegramChatId: string;
    eventKey: string;
    metadata?: Record<string, unknown>;
  }
) {
  await (ctx.runMutation as Function)(
    internalApi.onboarding.funnelEvents.emitFunnelEvent,
    {
      eventName: args.eventName,
      channel: "telegram",
      organizationId: args.organizationId,
      telegramChatId: args.telegramChatId,
      eventKey: args.eventKey,
      metadata: args.metadata,
    }
  );
}

async function logTelegramAbuseSignal(
  ctx: any,
  args: {
    organizationId?: Id<"organizations">;
    telegramChatId: string;
    reason: string;
    startParam?: string;
  }
) {
  await (ctx.runMutation as Function)(internalApi.onboarding.telegramResolver.logAbuseSignal, {
    organizationId: args.organizationId,
    telegramChatId: args.telegramChatId,
    reason: args.reason,
    startParam: args.startParam,
  });
}

/**
 * Resolve a Telegram chat_id to an organization.
 * Called by the bridge script and webhook handler before routing to the agent pipeline.
 */
export const resolveChatToOrg = action({
  args: {
    telegramChatId: v.string(),
    senderName: v.optional(v.string()),
    startParam: v.optional(v.string()), // Deep link slug from /start command
  },
  handler: async (ctx, args) => {
    const PLATFORM_ORG_ID = getPlatformOrgId();
    let startParam = args.startParam?.trim();

    if (startParam && startParam.length > 160) {
      await logTelegramAbuseSignal(ctx, {
        organizationId: PLATFORM_ORG_ID,
        telegramChatId: args.telegramChatId,
        reason: "oversized_start_param",
        startParam,
      });
      startParam = undefined;
    }

    // Handle /start deep links
    if (startParam) {
      // ── Path B: Dashboard "Connect Telegram" link (link_{token}) ──
      if (startParam.startsWith("link_")) {
        const token = startParam.slice(5);

        const tokenResult = (await (ctx.runQuery as Function)(
          internalApi.onboarding.telegramLinking.lookupLinkToken,
          { token }
        )) as { objectId: Id<"objects">; organizationId: Id<"organizations">; userId: Id<"users"> } | null;

        if (tokenResult) {
          // Consume the token (one-time use)
          await (ctx.runMutation as Function)(
            internalApi.onboarding.telegramLinking.consumeLinkToken,
            { objectId: tokenResult.objectId }
          );

          // Check if this chat already has a mapping
          const existingMapping = (await (ctx.runQuery as Function)(
            internalApi.onboarding.telegramResolver.getMappingByChatId,
            { telegramChatId: args.telegramChatId }
          )) as { _id: Id<"telegramMappings">; organizationId: Id<"organizations">; status: string } | null;

          if (existingMapping) {
            // Update existing mapping to point to the linked org
            await (ctx.runMutation as Function)(
              internalApi.onboarding.telegramResolver.activateMapping,
              {
                telegramChatId: args.telegramChatId,
                organizationId: tokenResult.organizationId,
              }
            );
          } else {
            // Create new active mapping
            await (ctx.runMutation as Function)(
              internalApi.onboarding.telegramResolver.createMapping,
              {
                telegramChatId: args.telegramChatId,
                organizationId: tokenResult.organizationId,
                senderName: args.senderName,
              }
            );
            await (ctx.runMutation as Function)(
              internalApi.onboarding.telegramResolver.activateMapping,
              {
                telegramChatId: args.telegramChatId,
                organizationId: tokenResult.organizationId,
              }
            );
          }

          // Send confirmation message via Telegram
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken) {
            try {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: args.telegramChatId,
                  text: "Telegram connected! Your messages now go to your agent.",
                }),
              });
            } catch {
              // Non-fatal
            }
          }

          return {
            organizationId: tokenResult.organizationId,
            isNew: !existingMapping,
            routeToSystemBot: false,
          };
        }

        await logTelegramAbuseSignal(ctx, {
          organizationId: PLATFORM_ORG_ID,
          telegramChatId: args.telegramChatId,
          reason: "invalid_or_expired_link_token",
          startParam,
        });
        // Token not found or expired — fall through to normal flow
      }

      // ── Sub-org deep link routing (existing behavior) ──
      const deepLinkResult = (await (ctx.runQuery as Function)(
        internalApi.onboarding.agencySubOrgBootstrap.resolveDeepLink,
        { slug: startParam }
      )) as { organizationId: Id<"organizations"> } | null;

      if (deepLinkResult) {
        // Check if this chat already has a mapping
        const existingDeepLink = (await (ctx.runQuery as Function)(
          internalApi.onboarding.telegramResolver.getMappingByChatId,
          { telegramChatId: args.telegramChatId }
        )) as { organizationId: Id<"organizations">; status: string } | null;

        if (!existingDeepLink) {
          // Create a mapping for this chat_id -> sub-org so future messages route correctly
          await (ctx.runMutation as Function)(
            internalApi.onboarding.telegramResolver.createMapping,
            {
              telegramChatId: args.telegramChatId,
              organizationId: deepLinkResult.organizationId,
              senderName: args.senderName,
            }
          );
          // Immediately activate so messages go to the sub-org agent (not System Bot)
          await (ctx.runMutation as Function)(
            internalApi.onboarding.telegramResolver.activateMapping,
            {
              telegramChatId: args.telegramChatId,
              organizationId: deepLinkResult.organizationId,
            }
          );
        }

        // Detect testing mode: check if sender is the parent org's owner
        let testingMode = false;
        let isExternalCustomer = true;
        try {
          const targetOrg = (await (ctx.runQuery as Function)(
            internalApi.organizations.getOrgById,
            { organizationId: deepLinkResult.organizationId }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          )) as any;

          if (targetOrg?.parentOrganizationId) {
            // Check if this telegram chat is mapped to the parent org (agency owner)
            const parentMappings = (await (ctx.runQuery as Function)(
              internalApi.onboarding.telegramResolver.getMappingByChatId,
              { telegramChatId: args.telegramChatId }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            )) as any;

            // If the chat was previously mapped to the parent org, this is the agency owner testing
            if (parentMappings && String(parentMappings.organizationId) === String(targetOrg.parentOrganizationId)) {
              testingMode = true;
              isExternalCustomer = false;
	    }
    }
        } catch {
          // Non-fatal — testing mode detection is optional
        }

        return {
          organizationId: deepLinkResult.organizationId,
          isNew: !existingDeepLink,
          routeToSystemBot: false,
          testingMode,
          isExternalCustomer,
        };
      }
    }

    // Look up existing mapping
    const existing = (await (ctx.runQuery as Function)(
      internalApi.onboarding.telegramResolver.getMappingByChatId,
      { telegramChatId: args.telegramChatId }
    )) as {
      organizationId: Id<"organizations">;
      status: "onboarding" | "active" | "churned";
    } | null;

    if (existing?.status === "active") {
      // Grant idempotent daily credits so Telegram users always have fresh credits
      await (ctx.runMutation as Function)(
        internalApi.credits.index.grantDailyCreditsInternalMutation,
        { organizationId: existing.organizationId }
      );
      await (ctx.runMutation as Function)(
        internalApi.onboarding.identityClaims.syncTelegramIdentityLedger,
        {
          telegramChatId: args.telegramChatId,
          organizationId: existing.organizationId,
        }
      );
      await emitTelegramFunnelEvent(ctx, {
        eventName: "onboarding.funnel.activation",
        organizationId: existing.organizationId,
        telegramChatId: args.telegramChatId,
        eventKey: `onboarding.funnel.activation:telegram:${args.telegramChatId}`,
      });
      return {
        organizationId: existing.organizationId,
        isNew: false,
        routeToSystemBot: false,
      };
    }

    if (existing?.status === "onboarding") {
      return {
        organizationId: PLATFORM_ORG_ID,
        isNew: false,
        routeToSystemBot: true,
      };
    }

    // New user — create mapping in "onboarding" state
    await (ctx.runMutation as Function)(
      internalApi.onboarding.telegramResolver.createMapping,
      {
        telegramChatId: args.telegramChatId,
        organizationId: PLATFORM_ORG_ID,
        senderName: args.senderName,
      }
    );

    await emitTelegramFunnelEvent(ctx, {
      eventName: "onboarding.funnel.first_touch",
      organizationId: PLATFORM_ORG_ID,
      telegramChatId: args.telegramChatId,
      eventKey: `onboarding.funnel.first_touch:telegram:${args.telegramChatId}`,
      metadata: {
        routeToSystemBot: true,
      },
    });

    return {
      organizationId: PLATFORM_ORG_ID,
      isNew: true,
      routeToSystemBot: true,
    };
  },
});

// ============================================================================
// INTERNAL QUERIES & MUTATIONS
// ============================================================================

export const getMappingByChatId = internalQuery({
  args: { telegramChatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) =>
        q.eq("telegramChatId", args.telegramChatId)
      )
      .first();
  },
});

export const createMapping = internalMutation({
  args: {
    telegramChatId: v.string(),
    organizationId: v.id("organizations"),
    senderName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("telegramMappings", {
      telegramChatId: args.telegramChatId,
      organizationId: args.organizationId,
      status: "onboarding",
      senderName: args.senderName,
      createdAt: Date.now(),
    });
  },
});

/**
 * Activate a mapping — switches routing from System Bot to the org's own agent.
 * Called by completeOnboarding after the interview finishes.
 */
export const activateMapping = internalMutation({
  args: {
    telegramChatId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) =>
        q.eq("telegramChatId", args.telegramChatId)
      )
      .first();

    if (!mapping) throw new Error(`No mapping for chat_id ${args.telegramChatId}`);

    await ctx.db.patch(mapping._id, {
      organizationId: args.organizationId,
      status: "active",
    });

    const now = Date.now();
    const ledgerEntry = await ctx.db
      .query("anonymousIdentityLedger")
      .withIndex("by_telegram_chat", (q) => q.eq("telegramChatId", args.telegramChatId))
      .first();

    const claimFields =
      mapping.userId
        ? {
            claimStatus: "claimed" as const,
            claimedByUserId: mapping.userId,
            claimedOrganizationId: args.organizationId,
            claimedAt: now,
          }
        : {
            claimStatus: "unclaimed" as const,
            claimedByUserId: undefined,
            claimedOrganizationId: undefined,
            claimedAt: undefined,
          };

    if (ledgerEntry) {
      await ctx.db.patch(ledgerEntry._id, {
        organizationId: args.organizationId,
        ...claimFields,
        updatedAt: now,
        lastActivityAt: now,
      });
      return;
    }

    await ctx.db.insert("anonymousIdentityLedger", {
      identityKey: `telegram:${args.telegramChatId}`,
      channel: "telegram",
      organizationId: args.organizationId,
      telegramChatId: args.telegramChatId,
      ...claimFields,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });
  },
});

export const logAbuseSignal = internalMutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    telegramChatId: v.string(),
    reason: v.string(),
    startParam: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      organizationId: args.organizationId,
      action: "onboarding.abuse.signal",
      resource: "telegramResolver",
      resourceId: args.telegramChatId,
      metadata: {
        channel: "telegram",
        reason: args.reason,
        startParam: args.startParam,
      },
      success: false,
      createdAt: Date.now(),
    });
  },
});
