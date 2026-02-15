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

    // Handle /start deep links
    if (args.startParam) {
      // ── Path B: Dashboard "Connect Telegram" link (link_{token}) ──
      if (args.startParam.startsWith("link_")) {
        const token = args.startParam.slice(5);

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
        // Token not found or expired — fall through to normal flow
      }

      // ── Sub-org deep link routing (existing behavior) ──
      const deepLinkResult = (await (ctx.runQuery as Function)(
        internalApi.onboarding.agencySubOrgBootstrap.resolveDeepLink,
        { slug: args.startParam }
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
  },
});
