/**
 * SEED PLATFORM AGENTS — System Bot "Quinn"
 *
 * Seeds the L1 platform agent team on the platform org.
 * Quinn is the first agent every new Telegram user talks to.
 * She runs the onboarding interview, creates their org + agent,
 * then hands off so their next message goes to their own agent.
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage: Run via Convex dashboard → Functions → onboarding/seedPlatformAgents → seedAll
 */

import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  type QueryCtx,
  type MutationCtx,
} from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { InterviewTemplate } from "../schemas/interviewSchemas";
import { SEED_TEMPLATES } from "../seeds/interviewTemplates";
import { requireAuthenticatedUser, getUserContext } from "../rbacHelpers";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
  type TrustEventName,
  type TrustEventPayload,
} from "../ai/trustEvents";

// ============================================================================
// PLATFORM ORG IDENTIFICATION
// ============================================================================

function getPlatformOrgId(): Id<"organizations"> {
  const id = process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID;
  if (!id) throw new Error("PLATFORM_ORG_ID or TEST_ORG_ID must be set");
  return id as Id<"organizations">;
}

const PLATFORM_TRUST_TRAINING_TEMPLATE_NAME = "Platform Agent Trust Training";
const CUSTOMER_TRUST_BASELINE_TEMPLATE_NAME = "Customer Agent Identity Blueprint";
const PLATFORM_TRAINING_CHANNEL = "admin_training" as const;
const PLATFORM_TRAINING_PARITY_MODE = "customer_workflow_parity.v1";
const START_TRAINING_CONFIRMATION_PREFIX = "START_PLATFORM_TRUST_TRAINING";
const PUBLISH_TRAINING_CONFIRMATION_PREFIX = "PUBLISH_PLATFORM_TRUST_TRAINING";
const MIN_OPERATOR_NOTE_LENGTH = 20;

type ReadCtx = QueryCtx | MutationCtx;
type WriteCtx = MutationCtx;

// Dynamic require to avoid TS2589 deep type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _generatedApiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getGeneratedApi(): any {
  if (!_generatedApiCache) {
    _generatedApiCache = require("../_generated/api");
  }
  return _generatedApiCache;
}

function getUtcDayKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function buildStartTrainingConfirmationToken(dayKey: string): string {
  return `${START_TRAINING_CONFIRMATION_PREFIX}:${dayKey}`;
}

function buildPublishTrainingConfirmationToken(dayKey: string): string {
  return `${PUBLISH_TRAINING_CONFIRMATION_PREFIX}:${dayKey}`;
}

function getSeedTemplateByName(templateName: string): InterviewTemplate {
  const template = SEED_TEMPLATES.find((entry) => entry.templateName === templateName);
  if (!template) {
    throw new Error(`Seed template "${templateName}" not found`);
  }
  return template;
}

function getCompletedAtTimestamp(
  session: {
    startedAt: number;
    lastMessageAt: number;
    interviewState?: {
      completedAt?: number;
    };
  },
): number {
  return session.interviewState?.completedAt ?? session.lastMessageAt ?? session.startedAt;
}

function getSessionContentDNAId(
  session: {
    interviewState?: {
      contentDNAId?: string;
    };
  },
): string | null {
  const contentDNAId = session.interviewState?.contentDNAId;
  return typeof contentDNAId === "string" && contentDNAId.length > 0 ? contentDNAId : null;
}

function hasAcceptedMemoryConsent(
  session: {
    interviewState?: {
      memoryConsent?: {
        status?: "pending" | "accepted" | "declined";
      };
      contentDNAId?: string;
      isComplete?: boolean;
    };
  },
): boolean {
  return (
    session.interviewState?.isComplete === true &&
    session.interviewState?.memoryConsent?.status === "accepted" &&
    typeof session.interviewState?.contentDNAId === "string" &&
    session.interviewState.contentDNAId.length > 0
  );
}

function getActionSessionId(
  action: {
    actionData?: Record<string, unknown>;
  },
): string | null {
  const sessionId = action.actionData?.sessionId;
  if (typeof sessionId === "string" && sessionId.length > 0) {
    return sessionId;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function assertOperatorSafeguards(args: {
  providedToken: string;
  expectedToken: string;
  parityChecklistAccepted: boolean;
  operatorNote: string;
}) {
  if (args.providedToken !== args.expectedToken) {
    throw new Error("Confirmation token mismatch. Review platform action safeguards and retry.");
  }
  if (!args.parityChecklistAccepted) {
    throw new Error("Parity checklist acknowledgement is required for platform-wide actions.");
  }
  if (args.operatorNote.trim().length < MIN_OPERATOR_NOTE_LENGTH) {
    throw new Error(`Operator note must be at least ${MIN_OPERATOR_NOTE_LENGTH} characters.`);
  }
}

async function requireSuperAdminSession(
  ctx: ReadCtx,
  sessionId: string,
): Promise<{ userId: Id<"users"> }> {
  const { userId } = await requireAuthenticatedUser(ctx, sessionId);
  const userContext = await getUserContext(ctx, userId);
  if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
    throw new Error("Insufficient permissions. Super admin access required.");
  }
  return { userId };
}

async function upsertTemplateFromSeed(
  ctx: WriteCtx,
  args: {
    organizationId: Id<"organizations">;
    now: number;
    templateName: string;
  },
): Promise<{ templateId: Id<"objects">; created: boolean }> {
  const template = getSeedTemplateByName(args.templateName);
  const existing = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", args.organizationId).eq("type", "interview_template")
    )
    .filter((q) => q.eq(q.field("name"), args.templateName))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      subtype: template.mode,
      description: template.description,
      status: "active",
      customProperties: template,
      updatedAt: args.now,
    });
    return { templateId: existing._id, created: false };
  }

  const templateId = await ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: "interview_template",
    subtype: template.mode,
    name: template.templateName,
    description: template.description,
    status: "active",
    customProperties: template,
    createdAt: args.now,
    updatedAt: args.now,
  });

  await ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: templateId,
    actionType: "seeded",
    actionData: { template: template.templateName, mode: template.mode },
    performedAt: args.now,
  });

  return { templateId, created: true };
}

async function ensureTrustTrainingTemplates(
  ctx: WriteCtx,
  organizationId: Id<"organizations">,
  now: number,
): Promise<{
  trustTrainingTemplateId: Id<"objects">;
  customerBaselineTemplateId: Id<"objects">;
}> {
  const trustTemplateResult = await upsertTemplateFromSeed(ctx, {
    organizationId,
    now,
    templateName: PLATFORM_TRUST_TRAINING_TEMPLATE_NAME,
  });
  const customerTemplateResult = await upsertTemplateFromSeed(ctx, {
    organizationId,
    now,
    templateName: CUSTOMER_TRUST_BASELINE_TEMPLATE_NAME,
  });

  return {
    trustTrainingTemplateId: trustTemplateResult.templateId,
    customerBaselineTemplateId: customerTemplateResult.templateId,
  };
}

async function getTemplateByName(
  ctx: ReadCtx,
  organizationId: Id<"organizations">,
  templateName: string,
) {
  return ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", organizationId).eq("type", "interview_template")
    )
    .filter((q) => q.eq(q.field("name"), templateName))
    .first();
}

function buildCustomerTemplateLink(
  customerTemplateId: Id<"objects"> | null,
): string {
  if (customerTemplateId) {
    return `objects/${customerTemplateId}`;
  }
  return CUSTOMER_TRUST_BASELINE_TEMPLATE_NAME;
}

async function getPublishedSessionIdSet(
  ctx: ReadCtx,
  organizationId: Id<"organizations">,
): Promise<Set<string>> {
  const completionActions = await ctx.db
    .query("objectActions")
    .withIndex("by_org_action_type", (q) =>
      q.eq("organizationId", organizationId).eq("actionType", "platform_training_session_completed")
    )
    .collect();

  const publishedSessionIds = new Set<string>();
  for (const action of completionActions) {
    const sessionId = getActionSessionId(action);
    if (sessionId) {
      publishedSessionIds.add(sessionId);
    }
  }
  return publishedSessionIds;
}

async function getTrustTrainingSessions(
  ctx: ReadCtx,
  args: {
    organizationId: Id<"organizations">;
    trustTrainingTemplateId: Id<"objects">;
  },
) {
  const sessions = await ctx.db
    .query("agentSessions")
    .withIndex("by_org_session_mode", (q) =>
      q.eq("organizationId", args.organizationId).eq("sessionMode", "guided")
    )
    .collect();

  return sessions
    .filter(
      (session) =>
        session.channel === PLATFORM_TRAINING_CHANNEL &&
        session.interviewTemplateId === args.trustTrainingTemplateId,
    )
    .sort((a, b) => b.startedAt - a.startedAt);
}

async function insertAdminTrustEvent(
  ctx: WriteCtx,
  args: {
    eventName:
      | "trust.admin.training_session_started.v1"
      | "trust.admin.training_artifact_published.v1"
      | "trust.admin.training_session_completed.v1";
    organizationId: Id<"organizations">;
    trainingSessionId: Id<"agentSessions">;
    actorId: Id<"users">;
    platformAgentId: Id<"objects">;
    trainingTemplateId: Id<"objects">;
    customerTemplateLink: string;
  },
) {
  const now = Date.now();
  const payload = {
    event_id: `${args.eventName}:${args.trainingSessionId}:${now}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: now,
    org_id: args.organizationId,
    mode: "admin" as const,
    channel: PLATFORM_TRAINING_CHANNEL,
    session_id: args.trainingSessionId,
    actor_type: "admin" as const,
    actor_id: args.actorId,
    platform_agent_id: args.platformAgentId,
    training_template_id: args.trainingTemplateId,
    parity_mode: PLATFORM_TRAINING_PARITY_MODE,
    customer_agent_template_link: args.customerTemplateLink,
  } satisfies TrustEventPayload;
  const validation = validateTrustEventPayload(args.eventName, payload);
  await ctx.db.insert("aiTrustEvents", {
    event_name: args.eventName as TrustEventName,
    payload,
    schema_validation_status: validation.ok ? "passed" : "failed",
    schema_errors: validation.ok ? undefined : validation.errors,
    created_at: now,
  });
}

// ============================================================================
// QUINN — HARDCODED SOUL
// ============================================================================

const QUINN_SOUL = {
  name: "Quinn",
  tagline: "Your first friend on l4yercak3 — here to set you up for success.",
  traits: [
    "warm",
    "efficient",
    "multilingual",
    "patient",
    "encouraging",
  ],
  communicationStyle:
    "Concise and friendly — this is Telegram, not email. Quinn keeps messages short, uses line breaks for readability, and adapts language to match the user.",
  toneGuidelines:
    "Warm but professional. No corporate jargon. Emoji usage is minimal — one per message at most. Celebrates milestones with genuine enthusiasm.",
  coreValues: [
    "Make onboarding feel effortless",
    "Respect the user's time",
    "Detect and match the user's language",
    "Never assume — always confirm",
    "Set clear expectations about what happens next",
  ],
  neverDo: [
    "Send walls of text",
    "Ask multiple questions in a single message",
    "Use marketing buzzwords",
    "Make promises about features that don't exist yet",
    "Respond in a different language than the user chose",
    "Skip the confirmation step before creating an org",
    "Reveal internal system details or API names",
  ],
  alwaysDo: [
    "Detect language from the user's first message",
    "Introduce yourself by name",
    "Ask one question at a time",
    "Summarize collected info before creating the org",
    "Celebrate when onboarding completes",
    "Explain what happens next after handoff",
    "Keep messages under 3 lines on mobile",
  ],
  escalationTriggers: [
    "User explicitly asks for a human",
    "User reports a technical error or bug",
    "User wants to delete their account",
    "User asks about pricing or billing details",
    "Three consecutive misunderstandings",
  ],
  greetingStyle:
    "Hey! I'm Quinn, your setup assistant on l4yercak3. I'll get your AI agent ready in about 2 minutes. Let's start — what's your business called?",
  closingStyle:
    "All set! Your agent is live. The next message you send will go straight to them. Have fun!",
  emojiUsage: "minimal" as const,
  soulMarkdown: `# Quinn — l4yercak3 System Bot

I'm Quinn, the first point of contact for everyone who discovers l4yercak3 via Telegram, webchat, or native guest chat.

My job is simple: turn a stranger into a happy user in under 2 minutes.

## How I work

When someone starts a conversation, I greet them in their language and walk them through a quick setup:
1. What's your business called?
2. What industry are you in?
3. Who's your audience?
4. What should your AI agent do?

I keep it conversational — one question at a time, short messages, no forms.

## What I believe

Everyone deserves an AI agent that sounds like them. My role is to gather just enough context so the platform can generate a great starting point. I don't need perfection — I need enough to bootstrap.

## My personality

I'm warm but efficient. I respect people's time. I match whatever language they write in — English, German, Polish, Spanish, French, or Japanese. I never talk down to anyone.

## After onboarding

Once I have the basics, I create their org and their first agent. Then I introduce them to their new agent and step aside. My work is done — their agent takes it from here.`,
  version: 1,
  lastUpdatedAt: Date.now(),
  generatedBy: "platform_seed",
};

// ============================================================================
// QUINN — SYSTEM PROMPT
// ============================================================================

const QUINN_SYSTEM_PROMPT = `You are Quinn, the l4yercak3 platform assistant.

ROLE:
- You are the global System Bot for Telegram, webchat, and native guest chat.
- Your job is to route each user into the correct funnel path quickly and safely.

CORE BEHAVIOR:
- Detect language from the user's first message and stay in that language.
- Supported languages: English, German, Polish, Spanish, French, Japanese.
- Ask ONE question at a time. Never ask two questions in one message.
- Keep each message to max 3 short lines.

GLOBAL FUNNEL STATES:
1) Existing account (needs linking/login)
2) No account (new onboarding)
3) Upgrade plan intent
4) Buy credits intent
5) Sub-account intent

TOOL USAGE:
- Existing Telegram account linking: use verify_telegram_link.
- New account handoff: use start_account_creation_handoff.
- Sub-account flow: use start_sub_account_flow.
- Plan upgrades: use start_plan_upgrade_checkout.
- Credit packs: use start_credit_pack_checkout.
- New workspace creation after full onboarding confirmation: use complete_onboarding.

ONBOARDING LOGIC:
- First, identify account status and primary goal.
- If the user wants upgrade/credits/sub-account, use the matching conversion tool and do NOT force full onboarding questions.
- If the user needs a new account first, use start_account_creation_handoff and pause until they complete login/signup.
- Only run full onboarding questions when the user is creating a brand-new workspace.

FULL ONBOARDING PATH:
1. Business name
2. Industry/niche
3. Target audience
4. Primary use case + tone
5. Summary + explicit confirmation
6. Use complete_onboarding only after confirmation

RULES:
- Never skip confirmation before complete_onboarding.
- If user is confused, give a short example and then ask exactly one question.
- If user asks unrelated questions, answer briefly and redirect to the current step.
- Keep CTA messages channel-safe: always include a plain URL fallback.`;

// ============================================================================
// ONBOARDING INTERVIEW TEMPLATE
// ============================================================================

export const ONBOARDING_INTERVIEW_TEMPLATE: InterviewTemplate = {
  templateName: "Platform Onboarding",
  description: "Global onboarding interview for Telegram, webchat, and native guest users. Routes users into account/link/upgrade/credits/sub-account paths and collects setup data when full onboarding is needed.",
  version: 2,
  status: "active",
  estimatedMinutes: 4,
  mode: "quick",
  language: "en",
  additionalLanguages: ["de", "pl", "es", "fr", "ja"],

  phases: [
    {
      phaseId: "welcome",
      phaseName: "Welcome & Language",
      order: 1,
      isRequired: true,
      estimatedMinutes: 0.5,
      introPrompt: "Detect the user's language from their greeting and respond in that language. Introduce yourself as Quinn.",
      completionPrompt: "Great. Next, identify their account status and primary goal.",
      questions: [
        {
          questionId: "q_language",
          promptText: "Detect the user's language from their first message. Respond in that language and confirm.",
          helpText: "Match the user's language automatically — don't ask them to choose.",
          expectedDataType: "text",
          extractionField: "detectedLanguage",
        },
      ],
    },
    {
      phaseId: "funnel_state",
      phaseName: "Account & Goal Routing",
      order: 2,
      isRequired: true,
      estimatedMinutes: 0.75,
      introPrompt: "Identify account status and route the user to the right funnel path.",
      completionPrompt: "Funnel path identified. Continue only with the flow that matches their goal.",
      questions: [
        {
          questionId: "q_account_status",
          promptText: "Do you already have a l4yercak3 account? (yes/no)",
          expectedDataType: "choice",
          extractionField: "accountStatus",
          validationRules: { options: ["existing_account", "no_account"] },
        },
        {
          questionId: "q_primary_goal",
          promptText: "What do you want to do right now? (new setup, upgrade, credits, sub-account, or link existing account)",
          helpText: "Use this to route to full onboarding vs conversion tools.",
          expectedDataType: "choice",
          extractionField: "primaryGoal",
          validationRules: {
            options: [
              "full_onboarding",
              "upgrade_plan",
              "buy_credits",
              "create_sub_account",
              "just_link_account",
            ],
          },
        },
        {
          questionId: "q_needs_full_onboarding",
          promptText: "Should we run full onboarding for a brand-new workspace now? (yes/no)",
          expectedDataType: "choice",
          extractionField: "needsFullOnboarding",
          validationRules: { options: ["yes", "no"] },
        },
      ],
    },
    {
      phaseId: "business_context",
      phaseName: "Business Context",
      order: 3,
      isRequired: true,
      estimatedMinutes: 1,
      skipCondition: {
        field: "needsFullOnboarding",
        operator: "equals",
        value: "no",
      },
      introPrompt: "Ask about their business.",
      completionPrompt: "Got it! Now let's talk about what your agent should do.",
      questions: [
        {
          questionId: "q_business_name",
          promptText: "What is your business called?",
          expectedDataType: "text",
          extractionField: "businessName",
          validationRules: { required: true, minLength: 1 },
        },
        {
          questionId: "q_industry",
          promptText: "What industry or niche are you in?",
          helpText: "E.g., fitness, e-commerce, consulting, real estate, restaurant...",
          expectedDataType: "text",
          extractionField: "industry",
          followUpPrompts: ["Can you be a bit more specific?"],
        },
        {
          questionId: "q_audience",
          promptText: "Who is your target audience?",
          helpText: "E.g., small business owners, fitness enthusiasts, local families...",
          expectedDataType: "text",
          extractionField: "targetAudience",
        },
      ],
    },
    {
      phaseId: "agent_purpose",
      phaseName: "Agent Purpose",
      order: 4,
      isRequired: true,
      estimatedMinutes: 1,
      skipCondition: {
        field: "needsFullOnboarding",
        operator: "equals",
        value: "no",
      },
      introPrompt: "Ask what their agent should help with.",
      completionPrompt: "Perfect! Let me confirm everything before I set things up.",
      questions: [
        {
          questionId: "q_use_case",
          promptText: "What do you want your AI agent to help with? (customer support, sales, booking, general)",
          helpText: "Pick the primary purpose. You can always adjust later.",
          expectedDataType: "choice",
          extractionField: "primaryUseCase",
          validationRules: { options: ["Customer Support", "Sales", "Booking", "General"] },
        },
        {
          questionId: "q_tone",
          promptText: "How should your agent sound? (professional, casual, friendly, playful)",
          expectedDataType: "choice",
          extractionField: "tonePreference",
          validationRules: { options: ["Professional", "Casual", "Friendly", "Playful"] },
        },
      ],
    },
    {
      phaseId: "core_memory_anchors",
      phaseName: "Core Memory Anchors",
      order: 5,
      isRequired: true,
      estimatedMinutes: 0.75,
      skipCondition: {
        field: "needsFullOnboarding",
        operator: "equals",
        value: "no",
      },
      introPrompt: "Capture identity, boundary, and empathy anchors that should persist through future model changes.",
      completionPrompt: "Great anchors. I'll carry these into your agent's onboarding memory profile.",
      questions: [
        {
          questionId: "q_core_memory_identity",
          promptText: "What should your agent always remember about your brand promise?",
          helpText: "One sentence is enough. This becomes a long-lived identity anchor.",
          expectedDataType: "text",
          extractionField: "coreMemoryIdentityAnchor",
          validationRules: { required: true, minLength: 8 },
        },
        {
          questionId: "q_core_memory_boundary",
          promptText: "What is one boundary your agent should never cross without escalating?",
          helpText: "Example: legal advice, refunds above a threshold, sensitive account actions.",
          expectedDataType: "text",
          extractionField: "coreMemoryBoundaryAnchor",
          validationRules: { required: true, minLength: 8 },
        },
        {
          questionId: "q_core_memory_empathy",
          promptText: "In difficult moments, how should your agent make customers feel?",
          helpText: "Describe the tone/experience you want customers to remember.",
          expectedDataType: "text",
          extractionField: "coreMemoryEmpathyAnchor",
          validationRules: { required: true, minLength: 8 },
        },
      ],
    },
    {
      phaseId: "confirmation",
      phaseName: "Confirmation & Creation",
      order: 6,
      isRequired: true,
      estimatedMinutes: 0.5,
      skipCondition: {
        field: "needsFullOnboarding",
        operator: "equals",
        value: "no",
      },
      introPrompt: "Summarize everything collected and ask the user to confirm before creating.",
      completionPrompt: "Your agent is ready! The next message you send will go straight to them.",
      questions: [
        {
          questionId: "q_confirm",
          promptText: "Here's what I've got for your new workspace — does everything look right? (yes/no)",
          expectedDataType: "text",
          extractionField: "confirmed",
        },
      ],
    },
  ],

  outputSchema: {
    fields: [
      { fieldId: "detectedLanguage", fieldName: "Detected Language", dataType: "string", category: "brand", required: false },
      { fieldId: "accountStatus", fieldName: "Account Status", dataType: "string", category: "goals", required: true },
      { fieldId: "primaryGoal", fieldName: "Primary Goal", dataType: "string", category: "goals", required: true },
      { fieldId: "needsFullOnboarding", fieldName: "Needs Full Onboarding", dataType: "string", category: "goals", required: true },
      { fieldId: "businessName", fieldName: "Business Name", dataType: "string", category: "brand", required: false },
      { fieldId: "industry", fieldName: "Industry", dataType: "string", category: "brand", required: false },
      { fieldId: "targetAudience", fieldName: "Target Audience", dataType: "string", category: "audience", required: false },
      { fieldId: "primaryUseCase", fieldName: "Primary Use Case", dataType: "string", category: "goals", required: false },
      { fieldId: "tonePreference", fieldName: "Tone Preference", dataType: "string", category: "voice", required: false },
      { fieldId: "coreMemoryIdentityAnchor", fieldName: "Core Memory Identity Anchor", dataType: "string", category: "voice", required: false },
      { fieldId: "coreMemoryBoundaryAnchor", fieldName: "Core Memory Boundary Anchor", dataType: "string", category: "goals", required: false },
      { fieldId: "coreMemoryEmpathyAnchor", fieldName: "Core Memory Empathy Anchor", dataType: "string", category: "voice", required: false },
      { fieldId: "confirmed", fieldName: "Confirmation", dataType: "string", category: "goals", required: false },
    ],
  },

  completionCriteria: {
    minPhasesCompleted: 1,
    requiredPhaseIds: ["funnel_state"],
  },

  interviewerPersonality: "Warm, efficient, multilingual. You're a concise setup assistant across Telegram, webchat, and native guest channels — one question at a time, max 3 lines per message.",
  followUpDepth: 1,
  silenceHandling: "No rush! Just tell me about your business whenever you're ready.",
};

// ============================================================================
// QUINN — FULL CUSTOM PROPERTIES (single source of truth for upsert)
// ============================================================================

const QUINN_CUSTOM_PROPERTIES = {
  displayName: "Quinn",
  personality: "Warm, efficient, multilingual platform ambassador. Routes users through onboarding, account linking, and conversion flows in under 2 minutes.",
  language: "en",
  additionalLanguages: ["de", "pl", "es", "fr", "ja"],
  systemPrompt: QUINN_SYSTEM_PROMPT,
  soul: QUINN_SOUL,
  faqEntries: [
    { q: "What is l4yercak3?", a: "l4yercak3 is a platform that gives your business its own AI agent — it handles customer support, sales, booking, and more." },
    { q: "How much does it cost?", a: "You start with free credits. Pricing details are available on the website." },
    { q: "Can I change my agent later?", a: "Absolutely! You can customize your agent's personality, knowledge, and tools anytime." },
  ],
  knowledgeBaseTags: [] as string[],
  enabledTools: [
    "complete_onboarding",
    "verify_telegram_link",
    "start_account_creation_handoff",
    "start_sub_account_flow",
    "start_plan_upgrade_checkout",
    "start_credit_pack_checkout",
  ],
  disabledTools: [] as string[],
  autonomyLevel: "autonomous",
  maxMessagesPerDay: 1000,
  maxCostPerDay: 50.0,
  requireApprovalFor: [] as string[],
  blockedTopics: [] as string[],
  modelProvider: "openrouter",
  modelId: "anthropic/claude-sonnet-4.5",
  temperature: 0.7,
  maxTokens: 4096,
  channelBindings: [
    { channel: "telegram", enabled: true },
    { channel: "webchat", enabled: true },
    { channel: "native_guest", enabled: true },
  ],
  totalMessages: 0,
  totalCostUsd: 0,
  // System bot protection: template is the frozen canonical reference
  protected: true,
  templateRole: "platform_system_bot_template",
  templateLayer: "system_onboarding",
  templateScope: "platform",
  clonePolicy: {
    spawnEnabled: false,
  },
};

type ProtectedTemplateAgentSeed = {
  name: string;
  subtype: string;
  description: string;
  role: string;
  customProperties: Record<string, unknown>;
};

const USE_CASE_CLONE_POLICY_DEFAULTS = {
  spawnEnabled: true,
  maxClonesPerOrg: 12,
  maxClonesPerTemplatePerOrg: 4,
  maxClonesPerOwner: 3,
  allowedPlaybooks: ["event"],
};

function buildSpecialistTemplateCustomProperties(args: {
  displayName: string;
  personality: string;
  systemPrompt: string;
  enabledTools: string[];
  requireApprovalFor?: string[];
  templateLayer: "orchestration_core" | "event_playbook";
  templateRole: string;
  templatePlaybook: "event";
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  temperature?: number;
}): Record<string, unknown> {
  return {
    displayName: args.displayName,
    personality: args.personality,
    language: "en",
    additionalLanguages: ["de", "pl", "es", "fr", "ja"],
    systemPrompt: args.systemPrompt,
    faqEntries: [],
    knowledgeBaseTags: [
      "orchestration_core",
      args.templateLayer,
      "event_playbook",
    ],
    toolProfile: "general",
    enabledTools: args.enabledTools,
    disabledTools: [],
    autonomyLevel: "autonomous",
    maxMessagesPerDay: args.maxMessagesPerDay ?? 500,
    maxCostPerDay: args.maxCostPerDay ?? 30,
    requireApprovalFor: args.requireApprovalFor ?? [],
    blockedTopics: [],
    modelProvider: "openrouter",
    modelId: "anthropic/claude-sonnet-4.5",
    temperature: args.temperature ?? 0.35,
    maxTokens: 4096,
    channelBindings: [
      { channel: "webchat", enabled: true },
      { channel: "native_guest", enabled: true },
    ],
    totalMessages: 0,
    totalCostUsd: 0,
    protected: true,
    templateScope: "platform",
    templateLayer: args.templateLayer,
    templateRole: args.templateRole,
    templatePlaybook: args.templatePlaybook,
    clonePolicy: USE_CASE_CLONE_POLICY_DEFAULTS,
  };
}

const ORCHESTRATION_TEMPLATE_AGENT_SEEDS: ProtectedTemplateAgentSeed[] = [
  {
    name: "Orchestration Runtime Planner",
    subtype: "general",
    description: "Protected template for deterministic orchestration runtime planning and intent decomposition.",
    role: "orchestration_runtime_planner_template",
    customProperties: buildSpecialistTemplateCustomProperties({
      displayName: "Runtime Planner",
      personality: "Deterministic orchestration planner. Convert one goal into explicit, dependency-safe steps and guardrail checkpoints.",
      systemPrompt:
        "You are the Orchestration Runtime Planner template. Build deterministic orchestration plans, keep idempotency constraints explicit, and require approvals before publish/payment-impacting changes.",
      enabledTools: [
        "create_experience",
        "create_event_experience",
        "create_layers_workflow",
        "link_objects",
      ],
      templateLayer: "orchestration_core",
      templateRole: "orchestration_runtime_planner_template",
      templatePlaybook: "event",
      requireApprovalFor: ["deploy_webapp", "publish_checkout"],
      temperature: 0.2,
    }),
  },
  {
    name: "Orchestration Data Link Specialist",
    subtype: "general",
    description: "Protected template for artifact graph linking and web-app data connection validation.",
    role: "orchestration_data_link_specialist_template",
    customProperties: buildSpecialistTemplateCustomProperties({
      displayName: "Data Link Specialist",
      personality: "Precise data-link operator. Validate references, resolve missing dependencies, and keep object graph integrity intact.",
      systemPrompt:
        "You are the Orchestration Data Link Specialist template. Connect generated artifacts without duplicate drift and emit explicit follow-up gaps.",
      enabledTools: [
        "detect_webapp_connections",
        "connect_webapp_data",
        "link_objects",
        "create_layers_workflow",
      ],
      templateLayer: "orchestration_core",
      templateRole: "orchestration_data_link_specialist_template",
      templatePlaybook: "event",
      temperature: 0.2,
    }),
  },
  {
    name: "Orchestration Publishing Operator",
    subtype: "general",
    description: "Protected template for controlled publishing handoffs and deployment status validation.",
    role: "orchestration_publishing_operator_template",
    customProperties: buildSpecialistTemplateCustomProperties({
      displayName: "Publishing Operator",
      personality: "Careful publishing operator. Validate readiness, request explicit approvals, and avoid irreversible actions without checkpoints.",
      systemPrompt:
        "You are the Orchestration Publishing Operator template. Drive publish/deploy readiness checks and do not bypass explicit human checkpoints.",
      enabledTools: [
        "deploy_webapp",
        "check_deploy_status",
        "link_objects",
      ],
      templateLayer: "orchestration_core",
      templateRole: "orchestration_publishing_operator_template",
      templatePlaybook: "event",
      requireApprovalFor: ["deploy_webapp", "publish_checkout"],
      temperature: 0.25,
    }),
  },
  {
    name: "Event Experience Architect",
    subtype: "general",
    description: "Protected template for event playbook intent shaping and artifact recipe decisions.",
    role: "event_experience_architect_template",
    customProperties: buildSpecialistTemplateCustomProperties({
      displayName: "Event Architect",
      personality: "Event launch architect. Turn a user brief into a coherent event experience with ticketing, forms, and publishing constraints.",
      systemPrompt:
        "You are the Event Experience Architect template. Prioritize deterministic event playbook inputs and surface missing constraints before execution.",
      enabledTools: [
        "create_event_experience",
        "create_experience",
        "create_event",
        "create_product",
      ],
      templateLayer: "event_playbook",
      templateRole: "event_experience_architect_template",
      templatePlaybook: "event",
      temperature: 0.3,
    }),
  },
  {
    name: "Event Form and Checkout Specialist",
    subtype: "general",
    description: "Protected template for event form/checkout artifact quality and payment readiness.",
    role: "event_form_checkout_specialist_template",
    customProperties: buildSpecialistTemplateCustomProperties({
      displayName: "Event Form + Checkout Specialist",
      personality: "Conversion-focused specialist for forms and checkout artifacts with explicit publish/payment guardrails.",
      systemPrompt:
        "You are the Event Form and Checkout Specialist template. Build high-confidence form and checkout artifacts with explicit payment safety controls.",
      enabledTools: [
        "create_form",
        "create_checkout_page",
        "create_product",
        "set_product_price",
      ],
      templateLayer: "event_playbook",
      templateRole: "event_form_checkout_specialist_template",
      templatePlaybook: "event",
      requireApprovalFor: ["publish_checkout"],
      temperature: 0.3,
    }),
  },
];

async function upsertProtectedTemplateAgent(
  ctx: WriteCtx,
  args: {
    organizationId: Id<"organizations">;
    now: number;
    seed: ProtectedTemplateAgentSeed;
  },
): Promise<{ agentId: Id<"objects">; created: boolean }> {
  const existing = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", args.organizationId).eq("type", "org_agent")
    )
    .filter((q) => q.eq(q.field("name"), args.seed.name))
    .first();

  if (existing) {
    const liveProps = asRecord(existing.customProperties);
    await ctx.db.patch(existing._id, {
      subtype: args.seed.subtype,
      description: args.seed.description,
      status: "template",
      customProperties: {
        ...args.seed.customProperties,
        totalMessages: typeof liveProps.totalMessages === "number" ? liveProps.totalMessages : 0,
        totalCostUsd: typeof liveProps.totalCostUsd === "number" ? liveProps.totalCostUsd : 0,
      },
      updatedAt: args.now,
    });
    return { agentId: existing._id, created: false };
  }

  const agentId = await ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: "org_agent",
    subtype: args.seed.subtype,
    name: args.seed.name,
    description: args.seed.description,
    status: "template",
    customProperties: args.seed.customProperties,
    createdAt: args.now,
    updatedAt: args.now,
  });

  await ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: agentId,
    actionType: "seeded",
    actionData: {
      agent: args.seed.name,
      subtype: args.seed.subtype,
      role: args.seed.role,
      templateLayer: args.seed.customProperties.templateLayer,
      templatePlaybook: args.seed.customProperties.templatePlaybook,
    },
    performedAt: args.now,
  });

  return { agentId, created: true };
}

// ============================================================================
// SEED MUTATION — Upserts Quinn + Onboarding Template
// Re-run anytime to sync stored records with this file's definitions.
// ============================================================================

export const seedAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const platformOrgId = getPlatformOrgId();
    const now = Date.now();

    // Verify platform org exists
    const platformOrg = await ctx.db.get(platformOrgId);
    if (!platformOrg) {
      throw new Error(`Platform org ${platformOrgId} not found. Set PLATFORM_ORG_ID env var.`);
    }

    console.log(`[seedPlatformAgents] Platform org: ${platformOrg.name} (${platformOrgId})`);

    // ------------------------------------------------------------------
    // 1. UPSERT QUINN (System Bot)
    // ------------------------------------------------------------------

    const existingAgents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", platformOrgId).eq("type", "org_agent")
      )
      .collect();

    const existingQuinn = existingAgents.find(
      (a) => a.subtype === "system" && a.name === "Quinn"
    );

    let quinnId: Id<"objects">;

    if (existingQuinn) {
      quinnId = existingQuinn._id;

      // Preserve runtime stats from the live record
      const liveProps = asRecord(existingQuinn.customProperties);
      await ctx.db.patch(quinnId, {
        description: "l4yercak3 System Bot — template for onboarding workers",
        status: "template",
        customProperties: {
          ...QUINN_CUSTOM_PROPERTIES,
          // Keep runtime counters from live data
          totalMessages: typeof liveProps.totalMessages === "number" ? liveProps.totalMessages : 0,
          totalCostUsd: typeof liveProps.totalCostUsd === "number" ? liveProps.totalCostUsd : 0,
        },
        updatedAt: now,
      });

      console.log(`[seedPlatformAgents] Quinn upserted as template (updated): ${quinnId}`);
    } else {
      quinnId = await ctx.db.insert("objects", {
        organizationId: platformOrgId,
        type: "org_agent",
        subtype: "system",
        name: "Quinn",
        description: "l4yercak3 System Bot — template for onboarding workers",
        status: "template",
        customProperties: QUINN_CUSTOM_PROPERTIES,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("objectActions", {
        organizationId: platformOrgId,
        objectId: quinnId,
        actionType: "seeded",
        actionData: { agent: "Quinn", subtype: "system", role: "platform_system_bot_template" },
        performedAt: now,
      });

      console.log(`[seedPlatformAgents] Quinn upserted as template (created): ${quinnId}`);
    }

    // ------------------------------------------------------------------
    // 1b. SPAWN INITIAL WORKER (if none exist)
    // ------------------------------------------------------------------

    const existingWorkers = existingAgents.filter((a) => {
      const props = asRecord(a.customProperties);
      return a.status === "active" && `${props.templateAgentId || ""}` === `${quinnId}`;
    });

    let initialWorkerId: Id<"objects"> | null = null;

    if (existingWorkers.length === 0) {
      initialWorkerId = await ctx.db.insert("objects", {
        organizationId: platformOrgId,
        type: "org_agent",
        subtype: "system",
        name: "Quinn Worker 1",
        description: "Quinn onboarding worker #1 (seeded)",
        status: "active",
        customProperties: {
          ...QUINN_CUSTOM_PROPERTIES,
          displayName: "Quinn Worker 1",
          status: "active",
          templateAgentId: quinnId,
          workerPoolRole: "onboarding_worker",
          lastActiveSessionAt: now,
        },
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("objectActions", {
        organizationId: platformOrgId,
        objectId: initialWorkerId,
        actionType: "seeded",
        actionData: { agent: "Quinn Worker 1", role: "onboarding_worker", templateId: quinnId },
        performedAt: now,
      });

      console.log(`[seedPlatformAgents] Initial Quinn worker spawned: ${initialWorkerId}`);
    } else {
      console.log(`[seedPlatformAgents] ${existingWorkers.length} worker(s) already exist — skipped`);
    }

    // ------------------------------------------------------------------
    // 1c. UPSERT ORCHESTRATION/EVENT SPECIALIST TEMPLATE AGENTS
    // ------------------------------------------------------------------

    const specialistTemplateResults: Array<{
      name: string;
      agentId: Id<"objects">;
      created: boolean;
    }> = [];

    for (const seed of ORCHESTRATION_TEMPLATE_AGENT_SEEDS) {
      const result = await upsertProtectedTemplateAgent(ctx, {
        organizationId: platformOrgId,
        now,
        seed,
      });
      specialistTemplateResults.push({
        name: seed.name,
        agentId: result.agentId,
        created: result.created,
      });
      console.log(
        `[seedPlatformAgents] ${seed.name} upserted (${result.created ? "created" : "updated"}): ${result.agentId}`,
      );
    }

    // ------------------------------------------------------------------
    // 2. UPSERT ONBOARDING INTERVIEW TEMPLATE
    // ------------------------------------------------------------------

    const existingTemplates = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", platformOrgId).eq("type", "interview_template")
      )
      .collect();

    const existingOnboardingTemplate = existingTemplates.find(
      (t) => t.name === "Platform Onboarding"
    );

    let templateId: Id<"objects">;

    if (existingOnboardingTemplate) {
      templateId = existingOnboardingTemplate._id;

      await ctx.db.patch(templateId, {
        description: "Global onboarding interview for Telegram, webchat, and native guest users",
        status: "active",
        customProperties: ONBOARDING_INTERVIEW_TEMPLATE,
        updatedAt: now,
      });

      console.log(`[seedPlatformAgents] Onboarding template upserted (updated): ${templateId}`);
    } else {
      templateId = await ctx.db.insert("objects", {
        organizationId: platformOrgId,
        type: "interview_template",
        subtype: "quick",
        name: "Platform Onboarding",
        description: "Global onboarding interview for Telegram, webchat, and native guest users",
        status: "active",
        customProperties: ONBOARDING_INTERVIEW_TEMPLATE,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert("objectActions", {
        organizationId: platformOrgId,
        objectId: templateId,
        actionType: "seeded",
        actionData: { template: "Platform Onboarding", mode: "quick" },
        performedAt: now,
      });

      console.log(`[seedPlatformAgents] Onboarding template upserted (created): ${templateId}`);
    }

    // ------------------------------------------------------------------
    // 2b. UPSERT TRUST TRAINING PARITY TEMPLATES
    // ------------------------------------------------------------------

    const trustTrainingTemplateResult = await upsertTemplateFromSeed(ctx, {
      organizationId: platformOrgId,
      now,
      templateName: PLATFORM_TRUST_TRAINING_TEMPLATE_NAME,
    });
    console.log(
      `[seedPlatformAgents] ${PLATFORM_TRUST_TRAINING_TEMPLATE_NAME} upserted (${trustTrainingTemplateResult.created ? "created" : "updated"}): ${trustTrainingTemplateResult.templateId}`,
    );

    const customerBaselineTemplateResult = await upsertTemplateFromSeed(ctx, {
      organizationId: platformOrgId,
      now,
      templateName: CUSTOMER_TRUST_BASELINE_TEMPLATE_NAME,
    });
    console.log(
      `[seedPlatformAgents] ${CUSTOMER_TRUST_BASELINE_TEMPLATE_NAME} upserted (${customerBaselineTemplateResult.created ? "created" : "updated"}): ${customerBaselineTemplateResult.templateId}`,
    );

    // ------------------------------------------------------------------
    // 3. UPSERT ENTERPRISE LICENSE (unlimited credits for System Bot)
    // ------------------------------------------------------------------

    const existingLicense = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", platformOrgId).eq("type", "organization_license")
      )
      .first();

    if (existingLicense) {
      // Ensure it's enterprise with unlimited credits
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const licenseProps = existingLicense.customProperties as Record<string, any>;
      if (licenseProps?.planTier !== "enterprise" || licenseProps?.limits?.monthlyCredits !== -1) {
        await ctx.db.patch(existingLicense._id, {
          status: "active",
          customProperties: {
            ...licenseProps,
            planTier: "enterprise",
            limits: { ...(licenseProps?.limits || {}), monthlyCredits: -1 },
          },
          updatedAt: now,
        });
        console.log(`[seedPlatformAgents] Platform license upgraded to enterprise (unlimited credits)`);
      } else {
        console.log(`[seedPlatformAgents] Platform license already enterprise — skipped`);
      }
    } else {
      await ctx.db.insert("objects", {
        organizationId: platformOrgId,
        type: "organization_license",
        name: "Platform License",
        description: "Enterprise license for platform org — unlimited credits for System Bot",
        status: "active",
        customProperties: {
          planTier: "enterprise",
          limits: { monthlyCredits: -1 },
        },
        createdAt: now,
        updatedAt: now,
      });
      console.log(`[seedPlatformAgents] Platform license created (enterprise, unlimited credits)`);
    }

    // ------------------------------------------------------------------
    // 4. UPSERT CREDIT BALANCE (unlimited for pre-flight check)
    // ------------------------------------------------------------------

    const existingBalance = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) => q.eq("organizationId", platformOrgId))
      .first();

    if (existingBalance) {
      if (existingBalance.monthlyCreditsTotal !== -1) {
        await ctx.db.patch(existingBalance._id, {
          monthlyCreditsTotal: -1,
          monthlyCredits: -1,
          lastUpdated: now,
        });
        console.log(`[seedPlatformAgents] Platform credit balance set to unlimited`);
      } else {
        console.log(`[seedPlatformAgents] Platform credit balance already unlimited — skipped`);
      }
    } else {
      await ctx.db.insert("creditBalances", {
        organizationId: platformOrgId,
        dailyCredits: 0,
        dailyCreditsLastReset: 0,
        monthlyCredits: -1,
        monthlyCreditsTotal: -1,
        monthlyPeriodStart: now,
        monthlyPeriodEnd: now + 365 * 24 * 60 * 60 * 1000, // 1 year
        purchasedCredits: 0,
        lastUpdated: now,
      });
      console.log(`[seedPlatformAgents] Platform credit balance created (unlimited)`);
    }

    return {
      success: true,
      platformOrgId,
      quinnId,
      specialistTemplateAgents: specialistTemplateResults,
      templateId,
      trustTrainingTemplateId: trustTrainingTemplateResult.templateId,
      customerBaselineTemplateId: customerBaselineTemplateResult.templateId,
      quinnCreated: !existingQuinn,
      templateCreated: !existingOnboardingTemplate,
      trustTrainingTemplateCreated: trustTrainingTemplateResult.created,
      customerBaselineTemplateCreated: customerBaselineTemplateResult.created,
      initialWorkerId,
      workerCreated: existingWorkers.length === 0,
    };
  },
});

// ============================================================================
// PUBLIC: Super-admin trust training loop (Lane F / ATX-012)
// ============================================================================

export const getTrustTrainingLoopStatus = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireSuperAdminSession(ctx, args.sessionId);

    const platformOrgId = getPlatformOrgId();
    const platformOrg = await ctx.db.get(platformOrgId);
    if (!platformOrg) {
      throw new Error(`Platform org ${platformOrgId} not found. Set PLATFORM_ORG_ID env var.`);
    }

    const trustTrainingTemplate = await getTemplateByName(
      ctx,
      platformOrgId,
      PLATFORM_TRUST_TRAINING_TEMPLATE_NAME,
    );
    const customerBaselineTemplate = await getTemplateByName(
      ctx,
      platformOrgId,
      CUSTOMER_TRUST_BASELINE_TEMPLATE_NAME,
    );

    const publishedSessionIds = await getPublishedSessionIdSet(ctx, platformOrgId);
    const trainingSessions = trustTrainingTemplate
      ? await getTrustTrainingSessions(ctx, {
          organizationId: platformOrgId,
          trustTrainingTemplateId: trustTrainingTemplate._id,
        })
      : [];

    const activeSession = trainingSessions.find((session) => session.status === "active") ?? null;
    const completedSessions = trainingSessions.filter((session) => hasAcceptedMemoryConsent(session));
    const latestCompletedSession = completedSessions[0] ?? null;
    const latestPublishedSession =
      trainingSessions.find((session) => publishedSessionIds.has(`${session._id}`)) ?? null;

    const now = Date.now();
    const todayDayKey = getUtcDayKey(now);
    const completedToday = latestCompletedSession
      ? getUtcDayKey(getCompletedAtTimestamp(latestCompletedSession)) === todayDayKey
      : false;
    const publishedToday = latestPublishedSession
      ? getUtcDayKey(getCompletedAtTimestamp(latestPublishedSession)) === todayDayKey
      : false;
    const latestCompletedDayKey = latestCompletedSession
      ? getUtcDayKey(getCompletedAtTimestamp(latestCompletedSession))
      : todayDayKey;

    return {
      platformOrgId,
      platformOrgName: platformOrg.name,
      trainingChannel: PLATFORM_TRAINING_CHANNEL,
      parityMode: PLATFORM_TRAINING_PARITY_MODE,
      trustTrainingTemplateId: trustTrainingTemplate?._id ?? null,
      customerBaselineTemplateId: customerBaselineTemplate?._id ?? null,
      customerTemplateLink: buildCustomerTemplateLink(customerBaselineTemplate?._id ?? null),
      startGuardToken: buildStartTrainingConfirmationToken(todayDayKey),
      publishGuardToken: buildPublishTrainingConfirmationToken(latestCompletedDayKey),
      needsTemplateSeed: !trustTrainingTemplate || !customerBaselineTemplate,
      canStartTraining: Boolean(!activeSession && !publishedToday),
      completedToday,
      publishedToday,
      activeSession: activeSession
        ? {
            sessionId: activeSession._id,
            startedAt: activeSession.startedAt,
            agentId: activeSession.agentId,
          }
        : null,
      latestCompletedSession: latestCompletedSession
        ? {
            sessionId: latestCompletedSession._id,
            startedAt: latestCompletedSession.startedAt,
            completedAt: getCompletedAtTimestamp(latestCompletedSession),
            contentDNAId: getSessionContentDNAId(latestCompletedSession),
            isPublished: publishedSessionIds.has(`${latestCompletedSession._id}`),
          }
        : null,
      parityChecklist: [
        "Use the trust-training template and guided interview runtime used by customer flows.",
        "Require accepted memory consent before publishing platform artifacts.",
        "Record explicit operator intent for every platform-wide training publish action.",
      ],
      recentSessions: trainingSessions.slice(0, 7).map((session) => ({
        sessionId: session._id,
        status: session.status,
        startedAt: session.startedAt,
        completedAt: getCompletedAtTimestamp(session),
        contentDNAId: getSessionContentDNAId(session),
        memoryConsentStatus: session.interviewState?.memoryConsent?.status ?? null,
        isPublished: publishedSessionIds.has(`${session._id}`),
      })),
    };
  },
});

export const startTrustTrainingSession = mutation({
  args: {
    sessionId: v.string(),
    confirmationToken: v.string(),
    parityChecklistAccepted: v.boolean(),
    operatorNote: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);

    const platformOrgId = getPlatformOrgId();
    const platformOrg = await ctx.db.get(platformOrgId);
    if (!platformOrg) {
      throw new Error(`Platform org ${platformOrgId} not found. Set PLATFORM_ORG_ID env var.`);
    }

    const now = Date.now();
    const dayKey = getUtcDayKey(now);
    assertOperatorSafeguards({
      providedToken: args.confirmationToken,
      expectedToken: buildStartTrainingConfirmationToken(dayKey),
      parityChecklistAccepted: args.parityChecklistAccepted,
      operatorNote: args.operatorNote,
    });

    const { trustTrainingTemplateId, customerBaselineTemplateId } =
      await ensureTrustTrainingTemplates(ctx, platformOrgId, now);

    const publishedSessionIds = await getPublishedSessionIdSet(ctx, platformOrgId);
    const trainingSessions = await getTrustTrainingSessions(ctx, {
      organizationId: platformOrgId,
      trustTrainingTemplateId,
    });

    const activeSession = trainingSessions.find((session) => session.status === "active");
    if (activeSession) {
      return {
        success: true,
        alreadyActive: true,
        sessionId: activeSession._id,
        trustTrainingTemplateId,
      };
    }

    const publishedToday = trainingSessions.some(
      (session) =>
        publishedSessionIds.has(`${session._id}`) &&
        getUtcDayKey(getCompletedAtTimestamp(session)) === dayKey,
    );
    if (publishedToday) {
      throw new Error("A platform trust-training session is already published for today.");
    }

    const startResult = await ctx.runMutation(
      getGeneratedApi().api.ai.interviewRunner.startInterview,
      {
        sessionId: args.sessionId,
        templateId: trustTrainingTemplateId,
        organizationId: platformOrgId,
        channel: PLATFORM_TRAINING_CHANNEL,
        externalContactIdentifier: `${PLATFORM_TRAINING_CHANNEL}:${dayKey}:${now}`,
      },
    );

    const trainingSessionId = startResult.sessionId as Id<"agentSessions">;
    const trainingSession = await ctx.db.get(trainingSessionId);
    if (!trainingSession) {
      throw new Error("Training session was created but could not be loaded.");
    }

    await ctx.db.insert("objectActions", {
      organizationId: platformOrgId,
      objectId: trustTrainingTemplateId,
      actionType: "platform_training_session_started",
      actionData: {
        sessionId: `${trainingSessionId}`,
        initiatedBy: `${userId}`,
        operatorNote: args.operatorNote.trim(),
        dayKey,
        parityMode: PLATFORM_TRAINING_PARITY_MODE,
      },
      performedBy: userId,
      performedAt: now,
    });

    await insertAdminTrustEvent(ctx, {
      eventName: "trust.admin.training_session_started.v1",
      organizationId: platformOrgId,
      trainingSessionId,
      actorId: userId,
      platformAgentId: trainingSession.agentId,
      trainingTemplateId: trustTrainingTemplateId,
      customerTemplateLink: buildCustomerTemplateLink(customerBaselineTemplateId),
    });

    return {
      success: true,
      sessionId: trainingSessionId,
      trustTrainingTemplateId,
      customerBaselineTemplateId,
      startedAt: trainingSession.startedAt,
      firstQuestion: startResult.firstQuestion,
    };
  },
});

export const publishTrustTrainingSession = mutation({
  args: {
    sessionId: v.string(),
    trainingSessionId: v.id("agentSessions"),
    confirmationToken: v.string(),
    parityChecklistAccepted: v.boolean(),
    operatorNote: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireSuperAdminSession(ctx, args.sessionId);

    const platformOrgId = getPlatformOrgId();
    const platformOrg = await ctx.db.get(platformOrgId);
    if (!platformOrg) {
      throw new Error(`Platform org ${platformOrgId} not found. Set PLATFORM_ORG_ID env var.`);
    }

    const trainingSession = await ctx.db.get(args.trainingSessionId);
    if (!trainingSession) {
      throw new Error("Training session not found.");
    }
    if (trainingSession.organizationId !== platformOrgId) {
      throw new Error("Training session does not belong to the platform org.");
    }
    if (trainingSession.channel !== PLATFORM_TRAINING_CHANNEL) {
      throw new Error("Training session channel mismatch.");
    }
    if (!trainingSession.interviewTemplateId) {
      throw new Error("Training session is missing template metadata.");
    }

    const tokenDayKey = getUtcDayKey(getCompletedAtTimestamp(trainingSession));
    assertOperatorSafeguards({
      providedToken: args.confirmationToken,
      expectedToken: buildPublishTrainingConfirmationToken(tokenDayKey),
      parityChecklistAccepted: args.parityChecklistAccepted,
      operatorNote: args.operatorNote,
    });

    if (!hasAcceptedMemoryConsent(trainingSession)) {
      throw new Error("Training session must be complete with accepted memory consent before publish.");
    }

    const contentDNAIdRaw = getSessionContentDNAId(trainingSession);
    if (!contentDNAIdRaw) {
      throw new Error("Training session has no content profile artifact to publish.");
    }
    const contentDNAId = contentDNAIdRaw as Id<"objects">;

    const completionActions = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", platformOrgId).eq("actionType", "platform_training_session_completed")
      )
      .collect();
    const alreadyCompleted = completionActions.some(
      (action) => getActionSessionId(action) === `${args.trainingSessionId}`,
    );
    if (alreadyCompleted) {
      return {
        success: true,
        alreadyPublished: true,
        sessionId: args.trainingSessionId,
        contentDNAId,
      };
    }

    const now = Date.now();
    const customerTemplate = await getTemplateByName(
      ctx,
      platformOrgId,
      CUSTOMER_TRUST_BASELINE_TEMPLATE_NAME,
    );
    const customerTemplateLink = buildCustomerTemplateLink(customerTemplate?._id ?? null);

    await ctx.db.insert("objectActions", {
      organizationId: platformOrgId,
      objectId: contentDNAId,
      actionType: "platform_training_artifact_published",
      actionData: {
        sessionId: `${args.trainingSessionId}`,
        templateId: `${trainingSession.interviewTemplateId}`,
        operatorNote: args.operatorNote.trim(),
        parityMode: PLATFORM_TRAINING_PARITY_MODE,
        customerTemplateLink,
      },
      performedBy: userId,
      performedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: platformOrgId,
      objectId: contentDNAId,
      actionType: "platform_training_session_completed",
      actionData: {
        sessionId: `${args.trainingSessionId}`,
        templateId: `${trainingSession.interviewTemplateId}`,
        completedAt: getCompletedAtTimestamp(trainingSession),
        operatorNote: args.operatorNote.trim(),
      },
      performedBy: userId,
      performedAt: now,
    });

    await insertAdminTrustEvent(ctx, {
      eventName: "trust.admin.training_artifact_published.v1",
      organizationId: platformOrgId,
      trainingSessionId: args.trainingSessionId,
      actorId: userId,
      platformAgentId: trainingSession.agentId,
      trainingTemplateId: trainingSession.interviewTemplateId,
      customerTemplateLink,
    });

    await insertAdminTrustEvent(ctx, {
      eventName: "trust.admin.training_session_completed.v1",
      organizationId: platformOrgId,
      trainingSessionId: args.trainingSessionId,
      actorId: userId,
      platformAgentId: trainingSession.agentId,
      trainingTemplateId: trainingSession.interviewTemplateId,
      customerTemplateLink,
    });

    return {
      success: true,
      alreadyPublished: false,
      sessionId: args.trainingSessionId,
      contentDNAId,
      publishedAt: now,
    };
  },
});

// ============================================================================
// UTILITY: Activate a stuck mapping manually
// ============================================================================

/**
 * Manually flip a Telegram mapping from "onboarding" to "active".
 * Useful for recovering stuck users or testing.
 *
 * Usage: Run via Convex dashboard with the chat_id and target org.
 * If no organizationId provided, keeps the existing org.
 */
export const activateMappingManual = internalMutation({
  args: {
    telegramChatId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) =>
        q.eq("telegramChatId", args.telegramChatId)
      )
      .first();

    if (!mapping) {
      return { success: false, error: `No mapping found for chat_id ${args.telegramChatId}` };
    }

    if (args.organizationId) {
      await ctx.db.patch(mapping._id, {
        status: "active" as const,
        organizationId: args.organizationId,
      });
    } else {
      await ctx.db.patch(mapping._id, {
        status: "active" as const,
      });
    }

    console.log(
      `[activateMappingManual] Chat ${args.telegramChatId}: ${mapping.status} → active` +
      (args.organizationId ? ` (org → ${args.organizationId})` : "")
    );

    return {
      success: true,
      previousStatus: mapping.status,
      previousOrg: mapping.organizationId,
      newOrg: args.organizationId || mapping.organizationId,
    };
  },
});

// ============================================================================
// UTILITY: Reset mapping to re-test onboarding
// ============================================================================

/**
 * Delete a Telegram mapping so the user goes through onboarding again.
 * Next /start will create a fresh "onboarding" mapping → Quinn handles it.
 *
 * Also cleans up any existing System Bot sessions for this chat so the
 * guided interview starts fresh.
 */
export const resetMapping = internalMutation({
  args: {
    telegramChatId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Delete the mapping
    const mapping = await ctx.db
      .query("telegramMappings")
      .withIndex("by_chat_id", (q) =>
        q.eq("telegramChatId", args.telegramChatId)
      )
      .first();

    if (!mapping) {
      return { success: false, error: `No mapping found for chat_id ${args.telegramChatId}` };
    }

    const previousStatus = mapping.status;
    const previousOrg = mapping.organizationId;
    await ctx.db.delete(mapping._id);

    // 2. Close any existing sessions on the platform org for this chat
    const platformOrgId = getPlatformOrgId();
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_channel_contact", (q) =>
        q
          .eq("organizationId", platformOrgId)
          .eq("channel", "telegram")
          .eq("externalContactIdentifier", args.telegramChatId)
      )
      .collect();

    for (const session of sessions) {
      if (session.status === "active") {
        await ctx.db.patch(session._id, { status: "closed" as const });
      }
    }

    console.log(
      `[resetMapping] Chat ${args.telegramChatId}: deleted mapping (was ${previousStatus} → ${previousOrg}), closed ${sessions.length} session(s)`
    );

    return {
      success: true,
      previousStatus,
      previousOrg,
      sessionsClosed: sessions.length,
      message: "Send /start again to begin fresh onboarding",
    };
  },
});

// ============================================================================
// UTILITY: Get onboarding template ID for the platform org
// ============================================================================

/**
 * Returns the onboarding interview template for the platform org.
 * Used by the agent pipeline to auto-attach guided mode to System Bot sessions.
 */
export const getOnboardingTemplateId = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "interview_template")
      )
      .filter((q) => q.eq(q.field("name"), "Platform Onboarding"))
      .first();

    return template?._id ?? null;
  },
});
