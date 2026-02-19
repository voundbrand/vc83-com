/**
 * COMPLETE ONBOARDING — Post-Interview Orchestration
 *
 * When Quinn (System Bot) finishes the onboarding interview, this action:
 * 1. Reads extractedData from the completed interview session
 * 2. Creates a new organization
 * 3. Seeds daily credits
 * 4. Bootstraps the customer's first AI agent (with soul from interview data)
 * 5. Switches Telegram routing from System Bot → new org's agent
 * 6. Sends an intro message from the new agent
 * 7. Stores the intro in the new session with agent attribution
 *
 * After this, the user's next message goes to their own agent — not Quinn.
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const { api: publicApi, internal: internalApi } = require("../_generated/api") as { api: any; internal: any };

export const run = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    telegramChatId: v.string(),
    channel: v.string(),
    organizationId: v.id("organizations"), // Platform org (System Bot's org)
  },
  handler: async (ctx, args) => {
    console.log("[completeOnboarding] Starting for chat_id:", args.telegramChatId);

    // 1. Get extractedData from the completed interview session
    const messages = await ctx.runQuery(
      internalApi.ai.agentSessions.getSessionMessages,
      { sessionId: args.sessionId, limit: 50 }
    );

    // Get session to read interviewState
    const session = await ctx.runQuery(
      internalApi.ai.agentSessions.getSessionMessages,
      { sessionId: args.sessionId, limit: 1 }
    );

    // We can't query the session directly from getSessionMessages,
    // so we'll use the extractedData from what advanceInterview stored.
    // The interviewState is on the session doc itself — we need a query for it.
    // For now, use a lightweight approach: read from session via resolveSession.
    const sessionDoc = await ctx.runMutation(
      internalApi.ai.agentSessions.resolveSession,
      {
        agentId: args.organizationId as unknown as string, // placeholder — resolveSession finds by org+channel+contact
        organizationId: args.organizationId,
        channel: args.channel,
        externalContactIdentifier: args.telegramChatId,
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interviewState = (sessionDoc as any)?.interviewState;
    const extractedData = interviewState?.extractedData || {};

    console.log("[completeOnboarding] Extracted data:", JSON.stringify(extractedData));

    // 2a. DUPLICATE-ORG GUARD: Check if this chat already has an active mapping
    //     (e.g., linked via Path A email verification during this session)
    const existingActiveMapping = await ctx.runQuery(
      internalApi.onboarding.telegramResolver.getMappingByChatId,
      { telegramChatId: args.telegramChatId }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any;

    if (existingActiveMapping?.status === "active") {
      console.log("[completeOnboarding] Chat already has active mapping → org:", existingActiveMapping.organizationId, "— skipping org creation");
      return {
        success: true,
        organizationId: existingActiveMapping.organizationId,
        agentId: null,
        agentName: "Your Agent",
        linkedExisting: true,
      };
    }

    // 2b. Create new organization
    const orgId = await ctx.runMutation(
      internalApi.onboarding.orgBootstrap.createMinimalOrg,
      {
        name: extractedData.businessName || extractedData.business_name || "My Business",
        industry: extractedData.industry,
        source: "telegram_onboarding",
        telegramChatId: args.telegramChatId,
      }
    );

    console.log("[completeOnboarding] Created org:", orgId);

    let identityClaimToken: string | null = null;
    let identityClaimLink: string | null = null;
    try {
      await ctx.runMutation(internalApi.onboarding.identityClaims.syncTelegramIdentityLedger, {
        telegramChatId: args.telegramChatId,
        organizationId: orgId,
      });

      const claimTokenResult = await ctx.runMutation(
        internalApi.onboarding.identityClaims.issueTelegramOrgClaimToken,
        {
          telegramChatId: args.telegramChatId,
          organizationId: orgId,
          issuedBy: "complete_onboarding",
        }
      ) as { claimToken?: string } | null;

      identityClaimToken =
        claimTokenResult?.claimToken && claimTokenResult.claimToken.length > 0
          ? claimTokenResult.claimToken
          : null;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
      if (appUrl && identityClaimToken) {
        identityClaimLink =
          `${appUrl}/api/auth/oauth-signup` +
          `?provider=google&sessionType=platform` +
          `&identityClaimToken=${encodeURIComponent(identityClaimToken)}`;
      }
    } catch (claimTokenError) {
      console.error("[completeOnboarding] Failed to issue Telegram org claim token:", claimTokenError);
    }

    // 3. Seed credits
    try {
      await ctx.runMutation(
        internalApi.credits.index.grantDailyCreditsInternalMutation,
        { organizationId: orgId }
      );
      console.log("[completeOnboarding] Credits seeded for org:", orgId);
    } catch (e) {
      console.error("[completeOnboarding] Credit seeding failed (non-blocking):", e);
    }

    // 4. Bootstrap agent with soul from interview data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let agentResult: any;
    try {
      agentResult = await ctx.runAction(
        publicApi.ai.soulGenerator.bootstrapAgent,
        {
          organizationId: orgId,
          name: "Agent",
          subtype: "general",
          industry: extractedData.industry,
          targetAudience: extractedData.targetAudience || extractedData.target_audience,
          tonePreference: extractedData.tonePreference || extractedData.tone_preference,
          additionalContext: extractedData.primaryUseCase || extractedData.primary_use_case,
        }
      );
      console.log("[completeOnboarding] Agent bootstrapped:", agentResult?.agentId);
    } catch (e) {
      console.error("[completeOnboarding] Agent bootstrap failed:", e);
      return { success: false, error: "Agent bootstrap failed" };
    }

    if (!agentResult?.agentId) {
      console.error("[completeOnboarding] No agentId returned from bootstrap");
      return { success: false, error: "No agent created" };
    }

    // 5. Switch Telegram routing
    try {
      await ctx.runMutation(
        internalApi.onboarding.telegramResolver.activateMapping,
        {
          telegramChatId: args.telegramChatId,
          organizationId: orgId,
        }
      );
      console.log("[completeOnboarding] Telegram routing switched to org:", orgId);
    } catch (e) {
      console.error("[completeOnboarding] Routing switch failed:", e);
    }

    // 6. New agent introduces itself
    const newAgent = await ctx.runQuery(
      internalApi.agentOntology.getAgentInternal,
      { agentId: agentResult.agentId }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const soul = (newAgent?.customProperties as any)?.soul;
    const agentName = soul?.name || (newAgent?.customProperties as any)?.displayName || "Your Agent";
    const businessName = extractedData.businessName || extractedData.business_name || "your business";

    const introMessage = soul?.greetingStyle
      ? String(soul.greetingStyle)
      : `Hi! I'm ${agentName}. I'm here to help with ${businessName}. Try asking me something a customer would ask!`;

    // Send intro via Telegram Bot API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && args.channel === "telegram") {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: args.telegramChatId,
            text: `*${agentName}:* ${introMessage}`,
            parse_mode: "Markdown",
          }),
        });
        console.log("[completeOnboarding] Intro sent via Telegram");

        if (identityClaimLink) {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: args.telegramChatId,
              text:
                "When you're ready to use the web dashboard, claim this workspace with your account:\n" +
                identityClaimLink,
            }),
          });
          console.log("[completeOnboarding] Claim link sent via Telegram");
        }
      } catch (e) {
        console.error("[completeOnboarding] Telegram intro failed (non-blocking):", e);
      }
    }

    // 7. Create session for new agent + store intro message
    const newSession = await ctx.runMutation(
      internalApi.ai.agentSessions.resolveSession,
      {
        agentId: agentResult.agentId,
        organizationId: orgId,
        channel: args.channel,
        externalContactIdentifier: args.telegramChatId,
      }
    );

    if (newSession) {
      await ctx.runMutation(
        internalApi.ai.agentSessions.addSessionMessage,
        {
          sessionId: newSession._id,
          role: "assistant" as const,
          content: introMessage,
          agentId: agentResult.agentId,
          agentName,
        }
      );
    }

    console.log("[completeOnboarding] Complete! Agent:", agentName, "Org:", orgId);

    return {
      success: true,
      organizationId: orgId,
      agentId: agentResult.agentId,
      agentName,
      identityClaimToken: identityClaimToken || undefined,
      identityClaimLink: identityClaimLink || undefined,
    };
  },
});
