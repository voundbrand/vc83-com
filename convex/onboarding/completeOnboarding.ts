/**
 * COMPLETE ONBOARDING — Post-Interview Orchestration
 *
 * When Quinn (System Bot) finishes the onboarding interview, this action:
 * 1. Reads extractedData from the completed interview session
 * 2. Creates (or resolves) the user's workspace organization
 * 3. Seeds daily credits
 * 4. Resolves the customer's default template-managed one-of-one operator
 * 5. Switches channel/session routing from System Bot → workspace agent
 * 6. Sends an intro message when channel transport supports direct dispatch
 * 7. Stores the intro in the new session with agent attribution
 *
 * After this, the user's next message goes to their own workspace agent — not Quinn.
 */

import { internalAction, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  normalizeUniversalOnboardingChannel,
  resolveCompletionContactIdentifier,
  resolveExistingWorkspaceAction,
  requiresClaimedAccountForOnboardingCompletion,
  resolveWorkspaceProfileFromExtractedData,
} from "./universalOnboardingPolicy";

// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const { internal: internalApi } = require("../_generated/api") as { internal: any };

const GENERIC_AGENT_NAMES = new Set([
  "agent",
  "your agent",
  "assistant",
  "ai assistant",
  "one-of-one operator",
  "default assistant",
]);

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function buildOnboardingWorkspaceSlug(workspaceName: string): string {
  const baseSlug = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const uniqueSuffix = Date.now().toString(36);
  return `${baseSlug}-${uniqueSuffix}`;
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveSelfSelectedName(args: {
  extractedData: Record<string, unknown>;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
}): string {
  const candidates = [
    "Samantha",
    "Mira",
    "Nova",
    "Iris",
    "Aria",
    "Kai",
    "Ember",
    "Atlas",
    "Lyra",
    "Soren",
    "Nico",
    "Avery",
  ];
  const seedParts = [
    String(args.organizationId),
    String(args.agentId),
    String(args.extractedData.workspaceName || ""),
    String(args.extractedData.workspaceContext || ""),
    String(args.extractedData.primaryUseCase || args.extractedData.primary_use_case || ""),
  ];
  const seed = seedParts.join("|").toLowerCase();
  const index = hashSeed(seed) % candidates.length;
  return candidates[index] || "Nova";
}

function resolvePersonalAgentIdentity(args: {
  extractedData: Record<string, unknown>;
  organizationId: Id<"organizations">;
  agentId: Id<"objects">;
  soulName: unknown;
  displayName: unknown;
}): { agentName: string; selfSelected: boolean } {
  const soulName = normalizeOptionalString(args.soulName);
  const displayName = normalizeOptionalString(args.displayName);
  const candidate = soulName || displayName;
  if (candidate && !GENERIC_AGENT_NAMES.has(candidate.toLowerCase())) {
    return { agentName: candidate, selfSelected: false };
  }
  return {
    agentName: resolveSelfSelectedName({
      extractedData: args.extractedData,
      organizationId: args.organizationId,
      agentId: args.agentId,
    }),
    selfSelected: true,
  };
}

export const run = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    channelContactIdentifier: v.optional(v.string()),
    telegramChatId: v.optional(v.string()), // TODO(onboarding-phase6-telegram-alias): remove after compatibility window.
    channel: v.string(),
    organizationId: v.id("organizations"), // Platform org (System Bot's org)
  },
  handler: async (ctx, args) => {
    const channelContactIdentifier = resolveCompletionContactIdentifier({
      channelContactIdentifier: args.channelContactIdentifier,
      telegramChatId: args.telegramChatId,
    });
    if (!channelContactIdentifier) {
      return {
        success: false,
        error: "missing_channel_contact_identifier",
      };
    }

    console.log("[completeOnboarding] Starting for channel contact:", channelContactIdentifier);
    const normalizedChannel = normalizeUniversalOnboardingChannel(args.channel);
    const guestSessionToken =
      normalizedChannel === "webchat" || normalizedChannel === "native_guest"
        ? channelContactIdentifier.trim()
        : null;
    let guestSession:
      | {
          claimedByUserId?: Id<"users">;
          claimedOrganizationId?: Id<"organizations">;
          organizationId: Id<"organizations">;
        }
      | null = null;
    let guestOnboardingBinding:
      | {
          _id: Id<"guestOnboardingBindings">;
          onboardingOrganizationId: Id<"organizations">;
          organizationLifecycleState:
            | "provisional_onboarding"
            | "live_unclaimed_workspace"
            | "claimed_workspace";
          bindingStatus: "active" | "claimed" | "expired";
        }
      | null = null;

    if (
      (normalizedChannel === "webchat" || normalizedChannel === "native_guest")
      && guestSessionToken
    ) {
      guestOnboardingBinding = await ctx.runQuery(
        internalApi.onboarding.orgBootstrap.getGuestOnboardingBindingBySessionToken,
        {
          channel: normalizedChannel,
          sessionToken: guestSessionToken,
        }
      );
      if (guestOnboardingBinding?.bindingStatus === "expired") {
        guestOnboardingBinding = null;
      }
    }

    if (requiresClaimedAccountForOnboardingCompletion(normalizedChannel)) {
      if (!guestSessionToken) {
        return {
          success: false,
          error: "account_required",
          reason: "missing_guest_session",
        };
      }

      guestSession = await ctx.runQuery(
        internalApi.api.v1.webchatApi.getWebchatSession,
        { sessionToken: guestSessionToken }
      );
      if (!guestSession) {
        return {
          success: false,
          error: "account_required",
          reason: "guest_session_not_found",
        };
      }

      const allowedGuestSessionOrgIds = guestOnboardingBinding
        ? new Set([
            String(args.organizationId),
            String(guestOnboardingBinding.onboardingOrganizationId),
          ])
        : new Set([String(args.organizationId)]);

      if (!allowedGuestSessionOrgIds.has(String(guestSession.organizationId))) {
        return {
          success: false,
          error: "account_required",
          reason: "guest_session_org_mismatch",
        };
      }

      if (!guestOnboardingBinding && !guestSession.claimedByUserId) {
        return {
          success: false,
          error: "account_required",
          reason: "guest_session_unclaimed",
        };
      }
    }

    const sessionDoc = await ctx.runQuery(
      internalApi.ai.agentSessions.getSessionByIdInternal,
      { sessionId: args.sessionId }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interviewState = (sessionDoc as any)?.interviewState;
    const extractedData = interviewState?.extractedData || {};
    const workspaceProfile = resolveWorkspaceProfileFromExtractedData(extractedData);
    const workspaceName = workspaceProfile.workspaceName;
    const workspaceContext = workspaceProfile.workspaceContext;

    console.log("[completeOnboarding] Extracted data:", JSON.stringify(extractedData));

    let existingOrganizationId: Id<"organizations"> | null = null;
    let hasActiveTelegramMapping = false;
    let hasBoundAnonymousOnboardingOrg = false;
    let telegramMapping:
      | {
          status: "onboarding" | "active" | "churned";
          organizationId: Id<"organizations">;
          onboardingOrganizationId?: Id<"organizations">;
          senderName?: string;
        }
      | null = null;

    if (normalizedChannel === "telegram") {
      telegramMapping = await ctx.runQuery(
        internalApi.onboarding.telegramResolver.getMappingByChatId,
        { telegramChatId: channelContactIdentifier }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any;

      if (telegramMapping?.status === "active") {
        hasActiveTelegramMapping = true;
        existingOrganizationId = telegramMapping.organizationId as Id<"organizations">;
      } else if (telegramMapping?.status === "onboarding") {
        if (telegramMapping.onboardingOrganizationId) {
          existingOrganizationId =
            telegramMapping.onboardingOrganizationId as Id<"organizations">;
          hasBoundAnonymousOnboardingOrg = true;
        } else {
          const bindingResult = await ctx.runMutation(
            internalApi.onboarding.orgBootstrap.ensureTelegramOnboardingOrgBinding,
            {
              telegramChatId: channelContactIdentifier,
              source: `${normalizedChannel}_onboarding`,
              senderName: telegramMapping.senderName,
            }
          ) as { organizationId: Id<"organizations"> };
          existingOrganizationId = bindingResult.organizationId;
          hasBoundAnonymousOnboardingOrg = true;
        }
      }
    }
    if (guestOnboardingBinding) {
      existingOrganizationId = guestOnboardingBinding.onboardingOrganizationId;
      hasBoundAnonymousOnboardingOrg = guestOnboardingBinding.bindingStatus !== "expired";
    } else if (
      requiresClaimedAccountForOnboardingCompletion(normalizedChannel)
      && guestSession?.claimedOrganizationId
    ) {
      existingOrganizationId = guestSession.claimedOrganizationId;
    }

    const existingWorkspaceAction = resolveExistingWorkspaceAction({
      extractedData,
      existingOrganizationId,
    });
    if (
      normalizedChannel === "telegram"
      && hasActiveTelegramMapping
      && existingWorkspaceAction !== "recreate"
    ) {
      if (existingWorkspaceAction === "rename" && existingOrganizationId) {
        await ctx.runMutation(internalApi.onboarding.orgBootstrap.updateOrgFromOnboarding, {
          organizationId: existingOrganizationId,
          workspaceName,
          source: `${normalizedChannel}_onboarding`,
          channelContactIdentifier,
        });
      }
      console.log(
        "[completeOnboarding] Active Telegram mapping already linked; preserving existing org:",
        existingOrganizationId
      );
      return {
        success: true,
        organizationId: existingOrganizationId as Id<"organizations">,
        agentId: null,
        agentName: "Your Agent",
        linkedExisting: true,
      };
    }

    const shouldReuseExistingOrganization =
      Boolean(existingOrganizationId)
      && (hasBoundAnonymousOnboardingOrg || existingWorkspaceAction !== "recreate");
    const claimedUserId =
      !guestOnboardingBinding
      && requiresClaimedAccountForOnboardingCompletion(normalizedChannel)
      && guestSession?.claimedByUserId
        ? guestSession.claimedByUserId
        : null;

    let lifecycleProvisioning:
      | {
          operatorAgentId?: Id<"objects"> | null;
          operatorProvisioningAction?: string | null;
        }
      | null = null;
    let orgId: Id<"organizations">;
    if (shouldReuseExistingOrganization) {
      orgId = existingOrganizationId as Id<"organizations">;
    } else if (claimedUserId) {
      orgId = await ctx.runMutation(
        internalApi.organizations.createOrgRecord,
        {
          businessName: workspaceName,
          name: workspaceName,
          slug: buildOnboardingWorkspaceSlug(workspaceName),
          description: workspaceContext || undefined,
          createdBy: claimedUserId,
        }
      );
      lifecycleProvisioning = await ctx.runMutation(
        internalApi.onboarding.orgBootstrap.finalizeOnboardingOrgClaim,
        {
          organizationId: orgId,
          userId: claimedUserId,
          appSurface: "platform_web",
        }
      );
    } else {
      if (normalizedChannel === "telegram") {
        const bindingResult = await ctx.runMutation(
          internalApi.onboarding.orgBootstrap.ensureTelegramOnboardingOrgBinding,
          {
            telegramChatId: channelContactIdentifier,
            source: `${normalizedChannel}_onboarding`,
            senderName: telegramMapping?.senderName,
          }
        ) as { organizationId: Id<"organizations"> };
        orgId = bindingResult.organizationId;
        hasBoundAnonymousOnboardingOrg = true;
      } else {
        orgId = await ctx.runMutation(
          internalApi.onboarding.orgBootstrap.createProvisionalOnboardingOrg,
          {
            workspaceName,
            workspaceContext,
            source: `${normalizedChannel}_onboarding`,
            channelContactIdentifier,
          }
        );
      }
    }

    if (!claimedUserId) {
      lifecycleProvisioning = await ctx.runMutation(
        internalApi.onboarding.orgBootstrap.promoteOnboardingOrgToLiveUnclaimed,
        {
          organizationId: orgId,
          workspaceName,
          workspaceContext,
          source: `${normalizedChannel}_onboarding`,
          channelContactIdentifier,
          appSurface: "platform_web",
        }
      );
    }

    if (
      shouldReuseExistingOrganization
      && existingWorkspaceAction === "rename"
      && !hasBoundAnonymousOnboardingOrg
    ) {
      await ctx.runMutation(internalApi.onboarding.orgBootstrap.updateOrgFromOnboarding, {
        organizationId: orgId,
        workspaceName,
        source: `${normalizedChannel}_onboarding`,
        channelContactIdentifier,
      });
    }

    if (shouldReuseExistingOrganization) {
      console.log("[completeOnboarding] Reusing existing org:", orgId);
    } else {
      console.log("[completeOnboarding] Created org:", orgId);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    const integrationsLink = appUrl ? `${appUrl}/?openWindow=integrations` : null;
    let identityClaimToken: string | null = null;
    let identityClaimLink: string | null = null;

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

    // 3.1 Persist detected language to user record
    const detectedLanguage = normalizeOptionalString(extractedData.detectedLanguage);
    if (claimedUserId && detectedLanguage) {
      try {
        await ctx.runMutation(
          internalApi.onboarding.completeOnboarding.persistUserPreferredLanguage,
          { userId: claimedUserId, preferredLanguage: detectedLanguage }
        );
        console.log("[completeOnboarding] Persisted preferredLanguage:", detectedLanguage);
      } catch (e) {
        console.error("[completeOnboarding] Failed to persist preferredLanguage (non-blocking):", e);
      }
    }

    // 4. Resolve the template-managed default onboarding operator.
    let onboardingAgentId =
      (lifecycleProvisioning?.operatorAgentId as Id<"objects"> | undefined) || null;
    if (onboardingAgentId) {
      console.log(
        "[completeOnboarding] Default onboarding agent resolved from lifecycle provisioning:",
        onboardingAgentId,
        "provisioningAction:",
        lifecycleProvisioning?.operatorProvisioningAction || "unknown"
      );
    } else {
      try {
        const defaultAgentProvisioning = await ctx.runMutation(
          internalApi.organizations.ensureOperatorAuthorityBootstrapInternal,
          {
            organizationId: orgId,
            appSurface: "platform_web",
          }
        );
        onboardingAgentId =
          (defaultAgentProvisioning?.operatorAgentId as Id<"objects"> | undefined) || null;
        console.log(
          "[completeOnboarding] Default onboarding agent resolved:",
          onboardingAgentId || "unknown",
          "provisioningAction:",
          defaultAgentProvisioning?.operatorProvisioningAction || "unknown"
        );
      } catch (defaultAgentResolutionError) {
        console.error(
          "[completeOnboarding] Default onboarding agent resolution failed:",
          defaultAgentResolutionError
        );
      }
    }

    if (!onboardingAgentId) {
      console.error("[completeOnboarding] Failed to resolve onboarding agent");
      return { success: false, error: "No agent created" };
    }

    try {
      await ctx.runMutation(internalApi.ai.weekendMode.ensureDefaultWeekendModeConfigForAgent, {
        agentId: onboardingAgentId,
        enabled: true,
      });
    } catch (weekendModeConfigError) {
      console.warn(
        "[completeOnboarding] Failed to seed weekend mode defaults (non-blocking):",
        weekendModeConfigError
      );
    }

    // 5. Switch channel routing/session ownership when needed.
    if (normalizedChannel === "telegram") {
      try {
        await ctx.runMutation(
          internalApi.onboarding.telegramResolver.activateMapping,
          {
            telegramChatId: channelContactIdentifier,
            organizationId: orgId,
          }
        );
        console.log("[completeOnboarding] Telegram routing switched to org:", orgId);
      } catch (e) {
        console.error("[completeOnboarding] Telegram routing switch failed:", e);
      }
    } else if (requiresClaimedAccountForOnboardingCompletion(normalizedChannel)) {
      try {
        const rebindResult = await ctx.runMutation(
          internalApi.api.v1.webchatApi.rebindSessionContext,
          {
            sessionToken: guestSessionToken!,
            organizationId: orgId,
            agentId: onboardingAgentId,
          }
        );
        if (rebindResult?.success) {
          console.log("[completeOnboarding] Guest session ownership switched to org:", orgId);
          if (guestOnboardingBinding && guestSessionToken) {
            await ctx.runMutation(
              internalApi.onboarding.orgBootstrap.recordGuestOnboardingBindingHandoff,
              {
                channel: normalizedChannel,
                sessionToken: guestSessionToken,
                resolvedAgentId: onboardingAgentId,
              }
            );
          }
        }
      } catch (guestSwitchError) {
        console.error("[completeOnboarding] Guest session ownership switch failed:", guestSwitchError);
      }
    }

    // 5.1 Issue identity-claim token for the active channel path.
    try {
      if (normalizedChannel === "telegram") {
        await ctx.runMutation(internalApi.onboarding.identityClaims.syncTelegramIdentityLedger, {
          telegramChatId: channelContactIdentifier,
          organizationId: orgId,
        });

        const claimTokenResult = await ctx.runMutation(
          internalApi.onboarding.identityClaims.issueTelegramOrgClaimToken,
          {
            telegramChatId: channelContactIdentifier,
            organizationId: orgId,
            issuedBy: "complete_onboarding",
          }
        ) as { claimToken?: string } | null;

        identityClaimToken =
          claimTokenResult?.claimToken && claimTokenResult.claimToken.length > 0
            ? claimTokenResult.claimToken
            : null;
      } else if (requiresClaimedAccountForOnboardingCompletion(normalizedChannel)) {
        await ctx.runMutation(internalApi.onboarding.identityClaims.syncGuestSessionLedger, {
          sessionToken: guestSessionToken!,
          organizationId: orgId,
          agentId: onboardingAgentId,
          channel: normalizedChannel,
          agentSessionId: undefined,
        });
        const claimTokenResult = guestOnboardingBinding
          ? await ctx.runMutation(
              internalApi.onboarding.identityClaims.issueGuestOnboardingOrgClaimToken,
              {
                bindingId: guestOnboardingBinding._id,
                sessionToken: guestSessionToken!,
                organizationId: orgId,
                channel: normalizedChannel,
                issuedBy: "complete_onboarding",
              }
            ) as { claimToken?: string | null; tokenId?: string | null } | null
          : await ctx.runMutation(
              internalApi.onboarding.identityClaims.issueGuestSessionClaimToken,
              {
                sessionToken: guestSessionToken!,
                organizationId: orgId,
                agentId: onboardingAgentId,
                channel: normalizedChannel,
              }
            ) as { claimToken?: string | null; tokenId?: string | null } | null;
        identityClaimToken =
          typeof claimTokenResult?.claimToken === "string" && claimTokenResult.claimToken.length > 0
            ? claimTokenResult.claimToken
            : null;
        if (guestOnboardingBinding && guestSessionToken && claimTokenResult?.tokenId) {
          await ctx.runMutation(
            internalApi.onboarding.orgBootstrap.recordGuestOnboardingBindingHandoff,
            {
              channel: normalizedChannel,
              sessionToken: guestSessionToken,
              resolvedAgentId: onboardingAgentId,
              lastClaimTokenId: claimTokenResult.tokenId,
            }
          );
        }
      }

      if (appUrl && identityClaimToken) {
        identityClaimLink =
          `${appUrl}/api/auth/oauth-signup` +
          `?provider=google&sessionType=platform` +
          `&identityClaimToken=${encodeURIComponent(identityClaimToken)}`;
      }
    } catch (claimTokenError) {
      console.error("[completeOnboarding] Failed to issue channel claim token:", claimTokenError);
    }

    // 6. New agent introduces itself
    const newAgent = await ctx.runQuery(
      internalApi.agentOntology.getAgentInternal,
      { agentId: onboardingAgentId }
    );

    const customProperties = asRecord(newAgent?.customProperties);
    const soul = asRecord(customProperties.soul);
    const identity = resolvePersonalAgentIdentity({
      extractedData: extractedData as Record<string, unknown>,
      organizationId: orgId,
      agentId: onboardingAgentId,
      soulName: soul.name,
      displayName: customProperties.displayName,
    });
    const agentName = identity.agentName;
    const workspaceLabel = workspaceName || "your workspace";

    if (identity.selfSelected) {
      try {
        await ctx.runMutation(
          internalApi.onboarding.completeOnboarding.persistOnboardingAgentIdentity,
          { agentId: onboardingAgentId, agentName }
        );
      } catch (identityPersistError) {
        console.error("[completeOnboarding] Failed to persist agent self-selected name:", identityPersistError);
      }
    }

    const introMessage = normalizeOptionalString(soul.greetingStyle)
      ? String(soul.greetingStyle)
      : identity.selfSelected
        ? `Hi! I'm ${agentName}. I chose that name for myself. I'm here to help with ${workspaceLabel}.`
        : `Hi! I'm ${agentName}. I'm here to help with ${workspaceLabel}. Tell me what you want to tackle first.`;

    // Send intro via Telegram Bot API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && normalizedChannel === "telegram") {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channelContactIdentifier,
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
              chat_id: channelContactIdentifier,
              text:
                "When you're ready to use the web dashboard, claim this workspace with your account:\n" +
                identityClaimLink,
            }),
          });
          console.log("[completeOnboarding] Claim link sent via Telegram");
        }

        const channelPromptLines = [
          "Next step: connect your channels so customers can reach your new agent everywhere.",
          integrationsLink
            ? `Open Integrations: ${integrationsLink}`
            : "Open Integrations in your dashboard to connect channels.",
          "Recommended: connect Slack, WhatsApp, and SMS, then send one test message from each channel.",
          "We track first-message SLA on connected channels with a target under 60 seconds.",
        ];
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: channelContactIdentifier,
            text: channelPromptLines.join("\n"),
          }),
        });
        console.log("[completeOnboarding] Channel connection prompt sent via Telegram");
      } catch (e) {
        console.error("[completeOnboarding] Telegram intro failed (non-blocking):", e);
      }
    }

    // 7. Create session for new agent + store intro message
    const newSession = await ctx.runMutation(
      internalApi.ai.agentSessions.resolveSession,
      {
        agentId: onboardingAgentId,
        organizationId: orgId,
        channel: normalizedChannel,
        externalContactIdentifier: channelContactIdentifier,
      }
    );

    if (newSession) {
      await ctx.runMutation(
        internalApi.ai.agentSessions.addSessionMessage,
        {
          sessionId: newSession._id,
          role: "assistant" as const,
          content: introMessage,
          agentId: onboardingAgentId,
          agentName,
        }
      );
    }

    console.log("[completeOnboarding] Complete! Agent:", agentName, "Org:", orgId);

    return {
      success: true,
      organizationId: orgId,
      agentId: onboardingAgentId,
      agentName,
      identityClaimToken: identityClaimToken || undefined,
      identityClaimLink: identityClaimLink || undefined,
    };
  },
});

export const persistOnboardingAgentIdentity = internalMutation({
  args: {
    agentId: v.id("objects"),
    agentName: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      return { success: false, reason: "agent_not_found" };
    }

    const customProperties = asRecord(agent.customProperties);
    const soul = asRecord(customProperties.soul);

    await ctx.db.patch(agent._id, {
      name: args.agentName,
      customProperties: {
        ...customProperties,
        displayName: args.agentName,
        soul: {
          ...soul,
          name: args.agentName,
        },
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const persistUserPreferredLanguage = internalMutation({
  args: {
    userId: v.id("users"),
    preferredLanguage: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;
    // Only set if user hasn't already chosen a preference
    if (!user.preferredLanguage) {
      await ctx.db.patch(args.userId, {
        preferredLanguage: args.preferredLanguage,
      });
    }
  },
});
