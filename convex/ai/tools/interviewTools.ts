/**
 * INTERVIEW TOOLS
 *
 * Agent tools for guided interview sessions.
 * These allow the agent to control interview flow during conversations.
 *
 * Tools:
 * - skip_phase: Skip current optional phase (agent-initiated)
 * - mark_phase_complete: Explicitly mark phase as done
 * - request_clarification: Ask for more detail on a specific topic
 * - get_interview_progress: Check current progress
 *
 * See: convex/ai/interviewRunner.ts for execution logic
 */

import type {
  AITool,
  ChannelSafeCtaPayload,
  ToolExecutionContext,
  ToolStatus,
} from "./registry";
import type { Id } from "../../_generated/dataModel";
import { buildTelegramPlainLinkText } from "../../integrations/telegram";
import {
  buildPlatformCheckoutRedirectUrls,
  resolvePublicAppUrl,
} from "../../stripe/platformCheckout";
import {
  buildCreditCheckoutRedirectUrls,
  calculateCreditsFromAmount,
} from "../../stripe/creditCheckout";

// Lazy-load api/internal to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApi(): any {
  if (!_apiCache) {
    _apiCache = require("../../_generated/api");
  }
  return _apiCache;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  return getApi().internal;
}

type RuntimeChannel = "telegram" | "webchat" | "native_guest";
type OAuthProvider = "google" | "microsoft" | "github";

function normalizeRuntimeChannel(channel?: string): RuntimeChannel {
  if (channel === "telegram") return "telegram";
  if (channel === "native_guest") return "native_guest";
  return "webchat";
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildChannelSafeUrlCta(args: {
  label: string;
  url: string;
  fallbackText: string;
}): ChannelSafeCtaPayload {
  return {
    kind: "external_url",
    default: {
      label: args.label,
      url: args.url,
      fallbackText: args.fallbackText,
    },
    byChannel: {
      telegram: {
        label: args.label,
        url: args.url,
        fallbackText: buildTelegramPlainLinkText(args.label, args.url),
        parseMode: "plain_text",
      },
      webchat: {
        label: args.label,
        url: args.url,
        fallbackText: `${args.fallbackText} ${args.url}`,
      },
      native_guest: {
        label: args.label,
        url: args.url,
        fallbackText: `${args.fallbackText} ${args.url}`,
      },
    },
  };
}

function buildOAuthSignupUrl(args: {
  provider: OAuthProvider;
  identityClaimToken?: string;
  onboardingChannel?: RuntimeChannel;
  attribution?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
    referrer?: string;
    landingPath?: string;
  };
  appBaseUrl?: string;
}): string {
  const appBaseUrl = (args.appBaseUrl || resolvePublicAppUrl()).replace(/\/+$/, "");
  const params = new URLSearchParams({
    provider: args.provider,
    sessionType: "platform",
    onboardingChannel: args.onboardingChannel || "webchat",
  });

  if (args.identityClaimToken) {
    params.set("identityClaimToken", args.identityClaimToken);
  }

  if (args.attribution?.source) params.set("utm_source", args.attribution.source);
  if (args.attribution?.medium) params.set("utm_medium", args.attribution.medium);
  if (args.attribution?.campaign) params.set("utm_campaign", args.attribution.campaign);
  if (args.attribution?.content) params.set("utm_content", args.attribution.content);
  if (args.attribution?.term) params.set("utm_term", args.attribution.term);
  if (args.attribution?.referrer) params.set("referrer", args.attribution.referrer);
  if (args.attribution?.landingPath) params.set("landingPath", args.attribution.landingPath);

  return `${appBaseUrl}/api/auth/oauth-signup?${params.toString()}`;
}

function resolvePlatformOrgId(): string | undefined {
  return process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID;
}

async function tryIssueGuestClaimToken(args: {
  ctx: ToolExecutionContext;
  channel: RuntimeChannel;
  contactId?: string;
}): Promise<string | undefined> {
  if (!args.contactId) return undefined;
  if (args.channel !== "webchat" && args.channel !== "native_guest") return undefined;

  try {
    let agentId = args.ctx.agentId;

    if (!agentId) {
      const activeAgent = await args.ctx.runQuery(
        getInternal().agentOntology.getActiveAgentForOrg,
        {
          organizationId: args.ctx.organizationId,
          channel: args.channel,
        }
      );
      agentId = activeAgent?._id;
    }

    if (!agentId) return undefined;

    const tokenResult = await args.ctx.runMutation(
      getInternal().onboarding.identityClaims.issueGuestSessionClaimToken,
      {
        sessionToken: args.contactId,
        organizationId: args.ctx.organizationId,
        agentId,
        channel: args.channel,
      }
    );

    return cleanOptionalString(tokenResult?.claimToken);
  } catch (error) {
    console.warn("[interviewTools] Unable to issue guest claim token:", error);
    return undefined;
  }
}

// ============================================================================
// SKIP PHASE TOOL
// ============================================================================

export const skipPhaseTool: AITool = {
  name: "skip_phase",
  description: "Skip the current interview phase if it's optional. Use when the user has already provided enough information through other answers, or when the phase topics have been covered naturally in conversation.",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Brief explanation of why the phase is being skipped (e.g., 'Already covered in previous answers')",
      },
    },
    required: [],
  },
  status: "ready" as ToolStatus,

  async execute(ctx: ToolExecutionContext, args: { reason?: string }) {
    // Get session ID from context
    const sessionId = ctx.sessionId as Id<"agentSessions"> | undefined;
    if (!sessionId) {
      return {
        success: false,
        error: "No active interview session",
      };
    }

    const result = await ctx.runMutation(getInternal().ai.interviewRunner.skipPhase, {
      sessionId,
      reason: args.reason,
    });

    return result;
  },
};

// ============================================================================
// MARK PHASE COMPLETE TOOL
// ============================================================================

export const markPhaseCompleteTool: AITool = {
  name: "mark_phase_complete",
  description: "Explicitly mark the current interview phase as complete and move to the next phase. Use when all questions in the current phase have been adequately answered.",
  parameters: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Brief summary of what was learned in this phase",
      },
    },
    required: [],
  },
  status: "ready" as ToolStatus,

  async execute(ctx: ToolExecutionContext, args: { summary?: string }) {
    const sessionId = ctx.sessionId as Id<"agentSessions"> | undefined;
    if (!sessionId) {
      return {
        success: false,
        error: "No active interview session",
      };
    }

    // Force advance to next phase
    const result = await ctx.runMutation(getInternal().ai.interviewRunner.advanceInterview, {
      sessionId,
      extractionResults: [],
      forceAdvance: true,
    });

    return {
      ...result,
      phaseSummary: args.summary,
    };
  },
};

// ============================================================================
// REQUEST CLARIFICATION TOOL
// ============================================================================

export const requestClarificationTool: AITool = {
  name: "request_clarification",
  description: "Request additional detail or clarification on a specific topic. Use when the user's answer was too brief or unclear to extract meaningful data.",
  parameters: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "The specific topic or aspect that needs clarification",
      },
      suggestedQuestion: {
        type: "string",
        description: "A suggested follow-up question to ask",
      },
    },
    required: ["topic"],
  },
  status: "ready" as ToolStatus,

  async execute(ctx: ToolExecutionContext, args: { topic: string; suggestedQuestion?: string }) {
    const sessionId = ctx.sessionId as Id<"agentSessions"> | undefined;
    if (!sessionId) {
      return {
        success: false,
        error: "No active interview session",
      };
    }

    // Get current session to check follow-up count
    const session = await ctx.runQuery(getInternal().ai.agentSessions.getSessionInternal, {
      sessionId,
    });

    if (!session || !session.interviewState) {
      return {
        success: false,
        error: "Interview state not found",
      };
    }

    // Return clarification request info (agent uses this to formulate follow-up)
    return {
      success: true,
      topic: args.topic,
      suggestedQuestion: args.suggestedQuestion,
      currentFollowUpCount: session.interviewState.currentFollowUpCount,
      maxFollowUps: 3, // Default from template
    };
  },
};

// ============================================================================
// GET INTERVIEW PROGRESS TOOL
// ============================================================================

export const getInterviewProgressTool: AITool = {
  name: "get_interview_progress",
  readOnly: true,
  description: "Get the current progress of the interview, including completed phases, current position, and estimated time remaining.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  status: "ready" as ToolStatus,

  async execute(ctx: ToolExecutionContext) {
    const sessionId = ctx.sessionId as Id<"agentSessions"> | undefined;
    if (!sessionId) {
      return {
        success: false,
        error: "No active interview session",
      };
    }

    const progress = await ctx.runQuery(getInternal().ai.interviewRunner.getInterviewProgress, {
      sessionId,
    });

    if (!progress) {
      return {
        success: false,
        error: "Could not retrieve interview progress",
      };
    }

    return {
      success: true,
      ...progress,
    };
  },
};

// ============================================================================
// GET EXTRACTED DATA TOOL
// ============================================================================

export const getExtractedDataTool: AITool = {
  name: "get_extracted_data",
  readOnly: true,
  description: "Get all data extracted so far in the current interview. Use to review what information has been collected and identify gaps.",
  parameters: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Optional: filter by category (voice, expertise, audience, content_prefs, brand, goals)",
        enum: ["voice", "expertise", "audience", "content_prefs", "brand", "goals"],
      },
    },
    required: [],
  },
  status: "ready" as ToolStatus,

  async execute(ctx: ToolExecutionContext, args: { category?: string }) {
    const sessionId = ctx.sessionId as Id<"agentSessions"> | undefined;
    if (!sessionId) {
      return {
        success: false,
        error: "No active interview session",
      };
    }

    const context = await ctx.runQuery(getInternal().ai.interviewRunner.getCurrentContext, {
      sessionId,
    });

    if (!context) {
      return {
        success: false,
        error: "Interview context not found",
      };
    }

    const extractedData = context.extractedData || {};

    // Filter by category if specified (would need schema to do this properly)
    // For now, just return all data
    if (args.category) {
      // TODO: Filter based on output schema categories
    }

    return {
      success: true,
      extractedData,
      fieldCount: Object.keys(extractedData).length,
      isComplete: context.isComplete,
    };
  },
};

// ============================================================================
// COMPLETE ONBOARDING TOOL
// ============================================================================

const completeOnboardingTool: AITool = {
  name: "complete_onboarding",
  description: "Complete the onboarding interview. Creates the user's organization, bootstraps their AI agent, and switches Telegram routing so their next message goes to their own agent. ONLY call this after the user has confirmed all collected information is correct.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  status: "ready" as ToolStatus,

  async execute(ctx: ToolExecutionContext) {
    const agentSessionId = ctx.agentSessionId as Id<"agentSessions"> | undefined;
    const channel = ctx.channel;
    const contactId = ctx.contactId;

    if (!agentSessionId || !channel || !contactId) {
      return {
        success: false,
        error: "Missing session context for onboarding completion",
      };
    }

    try {
      const result = await ctx.runAction(getInternal().onboarding.completeOnboarding.run, {
        sessionId: agentSessionId,
        telegramChatId: contactId,
        channel,
        organizationId: ctx.organizationId,
      });
      return result;
    } catch (e) {
      console.error("[complete_onboarding tool] Error:", e);
      return {
        success: false,
        error: String(e),
      };
    }
  },
};

// ============================================================================
// VERIFY TELEGRAM LINK TOOL (Path A: Email Verification)
// ============================================================================

const verifyTelegramLinkTool: AITool = {
  name: "verify_telegram_link",
  description:
    "Link this Telegram chat to an existing l4yercak3 account. Two-step process: " +
    "1) action='lookup_email' — checks if the email exists and sends a 6-digit verification code. " +
    "2) action='verify_code' — verifies the code the user enters and links their Telegram to their org. " +
    "Use this when a user says they already have a l4yercak3 account.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "Either 'lookup_email' (step 1: send code) or 'verify_code' (step 2: verify code)",
        enum: ["lookup_email", "verify_code"],
      },
      email: {
        type: "string",
        description: "The user's email address (required for action='lookup_email')",
      },
      code: {
        type: "string",
        description: "The 6-digit verification code (required for action='verify_code')",
      },
    },
    required: ["action"],
  },
  status: "ready" as ToolStatus,

  async execute(
    ctx: ToolExecutionContext,
    args: { action: string; email?: string; code?: string }
  ) {
    const contactId = ctx.contactId; // telegramChatId
    if (!contactId) {
      return { success: false, error: "No Telegram chat context" };
    }

    if (args.action === "lookup_email") {
      if (!args.email) {
        return { success: false, error: "Email is required for lookup" };
      }

      // Look up the user by email
      const userResult = await ctx.runQuery(
        getInternal().onboarding.telegramLinking.lookupUserByEmail,
        { email: args.email }
      );

      if (!userResult) {
        return {
          success: false,
          found: false,
          message: "No account found with that email. Would you like to continue setting up a new account?",
        };
      }

      // Generate and store a verification code
      const codeResult = await ctx.runMutation(
        getInternal().onboarding.telegramLinking.generateVerificationCode,
        {
          userId: userResult.userId,
          email: userResult.email,
          telegramChatId: contactId,
          organizationId: userResult.organizationId,
        }
      );

      console.log(
        `[verify_telegram_link] Verification code for ${args.email}: ${codeResult.code}`
      );

      return {
        success: true,
        found: true,
        organizationName: userResult.organizationName,
        message: `Account found for ${userResult.organizationName}. A 6-digit verification code has been generated. Ask the user to check their email for the code.`,
        _devCode: codeResult.code,
      };
    }

    if (args.action === "verify_code") {
      if (!args.code) {
        return { success: false, error: "Code is required for verification" };
      }

      const result = await ctx.runMutation(
        getInternal().onboarding.telegramLinking.verifyCodeAndLink,
        {
          code: args.code.trim(),
          telegramChatId: contactId,
        }
      );

      if (result.success) {
        return {
          success: true,
          linked: true,
          organizationName: result.organizationName,
          message: `Telegram connected to ${result.organizationName}! Your next message will go to your agent.`,
        };
      }

      return {
        success: false,
        linked: false,
        message: result.error || "Verification failed. Please try again.",
      };
    }

    return { success: false, error: `Unknown action: ${args.action}` };
  },
};

// ============================================================================
// ONBOARDING CONVERSION TOOLS
// ============================================================================

const startAccountCreationHandoffTool: AITool = {
  name: "start_account_creation_handoff",
  description:
    "Create a channel-safe account creation/login handoff CTA for Telegram, webchat, and native guest flows. " +
    "Use when the user needs to create or claim an account.",
  parameters: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        description: "OAuth provider for account handoff",
        enum: ["google", "microsoft", "github"],
      },
      identityClaimToken: {
        type: "string",
        description: "Optional signed claim token to preserve guest/Telegram onboarding context during signup",
      },
    },
    required: [],
  },
  status: "ready" as ToolStatus,

  async execute(
    ctx: ToolExecutionContext,
    args: { provider?: OAuthProvider; identityClaimToken?: string }
  ) {
    const provider: OAuthProvider = args.provider || "google";
    const channel = normalizeRuntimeChannel(ctx.channel);
    const contactId = cleanOptionalString(ctx.contactId);
    let claimToken = cleanOptionalString(args.identityClaimToken);

    if (!claimToken) {
      claimToken = await tryIssueGuestClaimToken({
        ctx,
        channel,
        contactId,
      });
    }

    const accountUrl = buildOAuthSignupUrl({
      provider,
      identityClaimToken: claimToken,
      onboardingChannel: channel,
    });

    const cta = buildChannelSafeUrlCta({
      label: "Create or connect your account",
      url: accountUrl,
      fallbackText: "Open this secure link to create or connect your account.",
    });

    return {
      success: true,
      flow: "account_creation_handoff",
      provider,
      channel,
      claimTokenAttached: Boolean(claimToken),
      accountUrl,
      cta,
      message:
        "Share the CTA and wait for the user to finish signup/login before continuing onboarding.",
    };
  },
};

const startSubAccountFlowTool: AITool = {
  name: "start_sub_account_flow",
  description:
    "Start sub-account (sub-organization) flow. Returns dashboard CTA by default, or creates a sub-account immediately when action='create_now'.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        description: "Choose 'open_dashboard' for guided UI flow, or 'create_now' when full client details are already collected",
        enum: ["open_dashboard", "create_now"],
      },
      businessName: {
        type: "string",
        description: "Required for action='create_now': client business name",
      },
      industry: {
        type: "string",
        description: "Required for action='create_now': client industry",
      },
      description: {
        type: "string",
        description: "Required for action='create_now': short business/agent context",
      },
      targetAudience: {
        type: "string",
        description: "Required for action='create_now': client target audience",
      },
      language: {
        type: "string",
        description: "Optional language hint for action='create_now'",
      },
      tonePreference: {
        type: "string",
        description: "Optional tone preference for action='create_now'",
      },
      agentNameHint: {
        type: "string",
        description: "Optional agent name hint for action='create_now'",
      },
    },
    required: [],
  },
  status: "ready" as ToolStatus,

  async execute(
    ctx: ToolExecutionContext,
    args: {
      action?: "open_dashboard" | "create_now";
      businessName?: string;
      industry?: string;
      description?: string;
      targetAudience?: string;
      language?: string;
      tonePreference?: string;
      agentNameHint?: string;
    }
  ) {
    const action = args.action || "open_dashboard";
    const appBaseUrl = resolvePublicAppUrl();
    const subOrgDashboardUrl = `${appBaseUrl}/?openWindow=manage&panel=sub-orgs`;
    const upgradeStoreUrl = `${appBaseUrl}/?openWindow=store`;

    const subOrgDashboardCta = buildChannelSafeUrlCta({
      label: "Open sub-accounts",
      url: subOrgDashboardUrl,
      fallbackText: "Open this link to create and manage sub-accounts.",
    });

    const upgradeCta = buildChannelSafeUrlCta({
      label: "Upgrade plan",
      url: upgradeStoreUrl,
      fallbackText: "Open this link to upgrade to Agency or Enterprise.",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const license: any = await ctx.runQuery(getApi().api.licensing.helpers.getLicense, {
      organizationId: ctx.organizationId,
    });

    const subOrgsEnabled = Boolean(license?.features?.subOrgsEnabled);
    if (!subOrgsEnabled) {
      return {
        success: false,
        flow: "sub_account",
        requiresUpgrade: true,
        message: "Sub-accounts require Agency or Enterprise tier.",
        cta: upgradeCta,
      };
    }

    if (action === "open_dashboard") {
      return {
        success: true,
        flow: "sub_account",
        action,
        cta: subOrgDashboardCta,
        message:
          "Send the CTA and guide the user through creating the sub-account in the Sub-organizations tab.",
      };
    }

    const businessName = cleanOptionalString(args.businessName);
    const industry = cleanOptionalString(args.industry);
    const description = cleanOptionalString(args.description);
    const targetAudience = cleanOptionalString(args.targetAudience);

    const missingFields = [
      !businessName ? "businessName" : null,
      !industry ? "industry" : null,
      !description ? "description" : null,
      !targetAudience ? "targetAudience" : null,
    ].filter(Boolean) as string[];

    if (missingFields.length > 0) {
      return {
        success: false,
        flow: "sub_account",
        action,
        error: "missing_required_fields",
        missingFields,
        message:
          "Need businessName, industry, description, and targetAudience to create a sub-account immediately.",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await ctx.runAction(
      getInternal().onboarding.agencySubOrgBootstrap.bootstrapClientOrg,
      {
        parentOrganizationId: ctx.organizationId,
        businessName,
        industry,
        description,
        targetAudience,
        language: cleanOptionalString(args.language),
        tonePreference: cleanOptionalString(args.tonePreference),
        agentNameHint: cleanOptionalString(args.agentNameHint),
      }
    );

    if (!result?.success) {
      if (result?.upgradeRequired) {
        return {
          success: false,
          flow: "sub_account",
          action,
          requiresUpgrade: true,
          message: result.error || "Sub-account creation requires plan upgrade.",
          cta: upgradeCta,
        };
      }

      return {
        success: false,
        flow: "sub_account",
        action,
        message: result?.error || "Failed to create sub-account.",
      };
    }

    const subOrgUrl = cleanOptionalString(result.deepLink) || subOrgDashboardUrl;
    const cta = buildChannelSafeUrlCta({
      label: "Open new sub-account",
      url: subOrgUrl,
      fallbackText: "Open this link to access the new sub-account.",
    });

    return {
      success: true,
      flow: "sub_account",
      action,
      childOrganizationId: result.childOrganizationId,
      slug: result.slug,
      agentName: result.agentName,
      cta,
      message: result.message || "Sub-account created successfully.",
    };
  },
};

const startPlanUpgradeCheckoutTool: AITool = {
  name: "start_plan_upgrade_checkout",
  description:
    "Start plan upgrade flow. Uses immediate subscription change if possible, otherwise returns a Stripe checkout CTA.",
  parameters: {
    type: "object",
    properties: {
      tier: {
        type: "string",
        description: "Target plan tier",
        enum: ["pro", "agency", "enterprise"],
      },
      billingPeriod: {
        type: "string",
        description: "Billing period for subscription checkout/changes",
        enum: ["monthly", "annual"],
      },
      email: {
        type: "string",
        description: "Billing email if organization has none on file",
      },
      organizationName: {
        type: "string",
        description: "Organization display name if organization record is missing one",
      },
      isB2B: {
        type: "boolean",
        description: "Set true to enable B2B checkout metadata and tax collection context",
      },
    },
    required: ["tier"],
  },
  status: "ready" as ToolStatus,

  async execute(
    ctx: ToolExecutionContext,
    args: {
      tier: "pro" | "agency" | "enterprise";
      billingPeriod?: "monthly" | "annual";
      email?: string;
      organizationName?: string;
      isB2B?: boolean;
    }
  ) {
    const appBaseUrl = resolvePublicAppUrl();
    const billingPeriod = args.billingPeriod || "monthly";
    const channel = normalizeRuntimeChannel(ctx.channel);

    if (args.tier === "enterprise") {
      const enterpriseCta = buildChannelSafeUrlCta({
        label: "Open enterprise options",
        url: `${appBaseUrl}/?openWindow=store`,
        fallbackText: "Open this link to continue with Enterprise sales flow.",
      });

      return {
        success: true,
        flow: "plan_upgrade",
        action: "enterprise_handoff",
        message: "Enterprise uses sales-assisted setup.",
        cta: enterpriseCta,
      };
    }

    const platformOrgId = resolvePlatformOrgId();
    if (platformOrgId && String(ctx.organizationId) === String(platformOrgId)) {
      const claimToken = await tryIssueGuestClaimToken({
        ctx,
        channel,
        contactId: cleanOptionalString(ctx.contactId),
      });
      const signupCta = buildChannelSafeUrlCta({
        label: "Create your account first",
        url: buildOAuthSignupUrl({
          provider: "google",
          identityClaimToken: claimToken,
          onboardingChannel: channel,
          appBaseUrl,
        }),
        fallbackText: "Open this link to create or connect your account before upgrading.",
      });

      return {
        success: false,
        flow: "plan_upgrade",
        error: "account_required",
        message: "Plan upgrades require a customer workspace account.",
        cta: signupCta,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const organization: any = await ctx.runQuery(getApi().api.organizations.get, {
      id: ctx.organizationId,
    });

    if (!organization) {
      return {
        success: false,
        flow: "plan_upgrade",
        error: "organization_not_found",
        message: "Organization not found for upgrade checkout.",
      };
    }

    const organizationName =
      cleanOptionalString(args.organizationName) ||
      cleanOptionalString(organization.name) ||
      "Organization";

    const billingEmail =
      cleanOptionalString(args.email) ||
      cleanOptionalString(organization.email) ||
      cleanOptionalString(organization.customProperties?.billingEmail);

    if (!billingEmail) {
      return {
        success: false,
        flow: "plan_upgrade",
        error: "billing_email_required",
        requiredFields: ["email"],
        message: "Billing email is required before starting plan checkout.",
      };
    }

    // Try immediate subscription management first (existing subscriptions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manageResult: any = await ctx.runAction(
      getApi().api.stripe.platformCheckout.managePlatformSubscription,
      {
        organizationId: ctx.organizationId,
        newTier: args.tier,
        billingPeriod,
      }
    );

    if (manageResult?.success && manageResult?.action !== "no_subscription") {
      const manageCta = buildChannelSafeUrlCta({
        label: "Open billing overview",
        url: `${appBaseUrl}/?openWindow=store`,
        fallbackText: "Open this link to review your billing status.",
      });

      return {
        success: true,
        flow: "plan_upgrade",
        action: manageResult.action,
        message: manageResult.message,
        effectiveDate: manageResult.effectiveDate,
        cta: manageCta,
      };
    }

    const { successUrl, cancelUrl } = buildPlatformCheckoutRedirectUrls({
      appBaseUrl,
      tier: args.tier,
      billingPeriod,
      attribution: {
        channel,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkoutResult: any = await ctx.runAction(
      getApi().api.stripe.platformCheckout.createPlatformCheckoutSession,
      {
        organizationId: ctx.organizationId,
        organizationName,
        email: billingEmail,
        tier: args.tier,
        billingPeriod,
        successUrl,
        cancelUrl,
        isB2B: args.isB2B,
        funnelChannel: channel,
      }
    );

    const cta = buildChannelSafeUrlCta({
      label: "Open secure plan checkout",
      url: checkoutResult.checkoutUrl,
      fallbackText: "Open this secure checkout link to upgrade your plan.",
    });

    return {
      success: true,
      flow: "plan_upgrade",
      action: "checkout_created",
      tier: args.tier,
      billingPeriod,
      checkoutUrl: checkoutResult.checkoutUrl,
      sessionId: checkoutResult.sessionId,
      cta,
      message: "Plan checkout link created.",
    };
  },
};

const startCreditPackCheckoutTool: AITool = {
  name: "start_credit_pack_checkout",
  description:
    "Create a credit-pack Stripe checkout CTA with channel-safe URL and fallback text.",
  parameters: {
    type: "object",
    properties: {
      amountEur: {
        type: "number",
        description: "Credit purchase amount in EUR",
      },
      email: {
        type: "string",
        description: "Billing email if organization record has none",
      },
      organizationName: {
        type: "string",
        description: "Organization name override if needed",
      },
      isB2B: {
        type: "boolean",
        description: "Set true to include B2B metadata and tax flow context",
      },
    },
    required: ["amountEur"],
  },
  status: "ready" as ToolStatus,

  async execute(
    ctx: ToolExecutionContext,
    args: {
      amountEur: number;
      email?: string;
      organizationName?: string;
      isB2B?: boolean;
    }
  ) {
    const appBaseUrl = resolvePublicAppUrl();
    const channel = normalizeRuntimeChannel(ctx.channel);
    const amountEur = Number(args.amountEur);
    const creditsPreview = calculateCreditsFromAmount(amountEur);

    if (!Number.isFinite(amountEur) || amountEur < 1) {
      return {
        success: false,
        flow: "credit_pack",
        error: "invalid_amount",
        message: "amountEur must be at least 1.",
      };
    }

    const platformOrgId = resolvePlatformOrgId();
    if (platformOrgId && String(ctx.organizationId) === String(platformOrgId)) {
      const claimToken = await tryIssueGuestClaimToken({
        ctx,
        channel,
        contactId: cleanOptionalString(ctx.contactId),
      });
      const signupCta = buildChannelSafeUrlCta({
        label: "Create your account first",
        url: buildOAuthSignupUrl({
          provider: "google",
          identityClaimToken: claimToken,
          onboardingChannel: channel,
          appBaseUrl,
        }),
        fallbackText: "Open this link to create or connect your account before buying credits.",
      });

      return {
        success: false,
        flow: "credit_pack",
        error: "account_required",
        message: "Credit purchases require a customer workspace account.",
        cta: signupCta,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const organization: any = await ctx.runQuery(getApi().api.organizations.get, {
      id: ctx.organizationId,
    });

    if (!organization) {
      return {
        success: false,
        flow: "credit_pack",
        error: "organization_not_found",
        message: "Organization not found for credit checkout.",
      };
    }

    const organizationName =
      cleanOptionalString(args.organizationName) ||
      cleanOptionalString(organization.name) ||
      "Organization";

    const billingEmail =
      cleanOptionalString(args.email) ||
      cleanOptionalString(organization.email) ||
      cleanOptionalString(organization.customProperties?.billingEmail);

    if (!billingEmail) {
      return {
        success: false,
        flow: "credit_pack",
        error: "billing_email_required",
        requiredFields: ["email"],
        message: "Billing email is required before starting credit checkout.",
      };
    }

    const { successUrl, cancelUrl } = buildCreditCheckoutRedirectUrls({
      appBaseUrl,
      amountEur,
      credits: creditsPreview.credits,
      attribution: {
        channel,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkoutResult: any = await ctx.runAction(
      getApi().api.stripe.creditCheckout.createCreditCheckoutSession,
      {
        organizationId: ctx.organizationId,
        organizationName,
        email: billingEmail,
        amountEur,
        successUrl,
        cancelUrl,
        isB2B: args.isB2B,
        funnelChannel: channel,
      }
    );

    const cta = buildChannelSafeUrlCta({
      label: "Open secure credit checkout",
      url: checkoutResult.checkoutUrl,
      fallbackText: "Open this secure checkout link to buy credits.",
    });

    return {
      success: true,
      flow: "credit_pack",
      action: "checkout_created",
      amountEur,
      credits: checkoutResult.credits,
      checkoutUrl: checkoutResult.checkoutUrl,
      sessionId: checkoutResult.sessionId,
      cta,
      message: "Credit checkout link created.",
    };
  },
};

// ============================================================================
// EXPORT ALL INTERVIEW TOOLS
// ============================================================================

export const INTERVIEW_TOOLS: Record<string, AITool> = {
  skip_phase: skipPhaseTool,
  mark_phase_complete: markPhaseCompleteTool,
  request_clarification: requestClarificationTool,
  get_interview_progress: getInterviewProgressTool,
  get_extracted_data: getExtractedDataTool,
  complete_onboarding: completeOnboardingTool,
  verify_telegram_link: verifyTelegramLinkTool,
  start_account_creation_handoff: startAccountCreationHandoffTool,
  start_sub_account_flow: startSubAccountFlowTool,
  start_plan_upgrade_checkout: startPlanUpgradeCheckoutTool,
  start_credit_pack_checkout: startCreditPackCheckoutTool,
};
