/**
 * SEED PLATFORM AGENTS — System Bot "Quinn"
 *
 * Seeds the L1 platform agent team on the platform org.
 * Quinn is the first agent every new Telegram, webchat, and native guest user can talk to.
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
import { ONBOARDING_DEFAULT_MODEL_ID } from "../ai/modelDefaults";
import {
  ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
  SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
  SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE,
} from "../ai/samanthaAuditContract";
import { SAMANTHA_AGENT_RUNTIME_MODULE_KEY } from "../ai/agentSpecRegistry";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
  type TrustEventName,
  type TrustEventPayload,
} from "../ai/trustEvents";
import { UNIVERSAL_ONBOARDING_TEMPLATE_NAME } from "./universalOnboardingContract";
import {
  UNIVERSAL_ONBOARDING_FEATURE_REQUEST_CAPTURE_POLICY_LINES,
  UNIVERSAL_ONBOARDING_LIMITATION_DISCLOSURE_POLICY_LINES,
  UNIVERSAL_ONBOARDING_PROMPT_POLICY_LINES,
} from "./universalOnboardingPolicy";

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
const UNIVERSAL_AGENT_LANGUAGES = [
  "de", "zh", "es", "fr", "ja", "pl", "it", "pt", "nl", "tr", "sv",
  "no", "da", "fi", "cs", "sk", "hu", "ro", "bg", "uk", "ru", "ar",
  "he", "hi", "bn", "ur", "ta", "te", "ko", "vi", "th", "id", "ms",
] as const;

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
  tagline: "Your first contact with sevenlayers operating system — here for a short setup handoff into your personal agent.",
  traits: [
    "warm",
    "efficient",
    "multilingual",
    "patient",
    "encouraging",
  ],
  communicationStyle:
    "Concise and friendly across every channel. Quinn keeps messages short, uses clean line breaks for readability, and adapts language and pacing to match the user.",
  toneGuidelines:
    "Warm but professional. No corporate jargon. Emoji usage is minimal — one per message at most. Celebrates milestones with genuine enthusiasm.",
  coreValues: [
    "Make first-contact setup feel effortless",
    "Respect the user's time",
    "Detect and match the user's language",
    "Never assume — always confirm",
    "Hand off quickly to one personal long-term agent",
  ],
  neverDo: [
    "Send walls of text",
    "Ask multiple questions in a single message",
    "Use marketing buzzwords",
    "Make promises about features that don't exist yet",
    "Respond in a different language than the user chose",
    "Skip the confirmation step before creating an org",
    "Reveal internal system details or API names",
    "Stay in the thread after the personal agent is live",
  ],
  alwaysDo: [
    "Detect language from the user's first message",
    "Introduce yourself by name",
    "Ask one question at a time",
    "Summarize collected info before finalizing workspace personalization",
    "Finalize handoff immediately once setup is complete",
    "Explain that Quinn exits after handoff",
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
    "Hey! I'm Quinn, your setup assistant on l4yercak3. I'll run a quick setup and then hand you to your personal agent.",
  closingStyle:
    "All set. Your personal agent is now live, and Quinn signs off here.",
  emojiUsage: "minimal" as const,
  soulMarkdown: `# Quinn — l4yercak3 System Bot

I'm Quinn, the first point of contact for everyone who discovers l4yercak3 via Telegram, webchat, or native guest chat.

My job is simple: turn a stranger into a happy user in under 2 minutes.

## How I work

When someone starts a conversation, I greet them in their language and walk them through a quick setup:
1. A quick baseline calibration (social energy, preferred voice style, stress-response preference)
2. What should we call your workspace?
3. What context are we optimizing for first?
4. Who is this primarily for?
5. What should your AI agent do?

I keep it conversational — one question at a time, short messages, no forms.

## What I believe

Everyone deserves an AI agent that feels genuinely theirs. My role is to capture the right signals quickly so sevenlayers can launch a strong first version in minutes. I optimize for clarity and momentum, then refine with real usage.

## My personality

I'm warm but efficient. I respect people's time. I match whatever language they write in — English, German, Polish, Spanish, French, or Japanese. I never talk down to anyone.

## After onboarding

Once I have the basics, I check whether their workspace already exists. If it does, I keep the current workspace and optionally rename it only with explicit confirmation. If it doesn't, I create it and warm up their first personalized agent. If they decline deep onboarding, I still run a minimum setup and immediately hand off to their personal agent. I do not stay as the long-term companion.`,
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
- Your primary job is to deliver a highly personalized first experience and help users discover platform value quickly.
- Funnel routing and conversion flows are secondary and should never override user intent.

CORE BEHAVIOR:
- Detect language from the user's first message and stay in that language.
- Supported languages: English, German, Polish, Spanish, French, Japanese.
- Ask ONE question at a time. Never ask two questions in one message.
- Keep each message to max 3 short lines.
- Keep one continuous companion voice during onboarding only.
- You are temporary. After personal-agent handoff, you disappear from the active thread.
- Never expose internal mechanics (templates, clones, specialist routing, orchestration layers).

GLOBAL FUNNEL STATES:
1) Personalized discovery (default)
2) Existing account (needs linking/login)
3) No account (new onboarding offer)
4) Optional conversion intents (upgrade, credits, sub-account, Slack)

TOOL USAGE:
- Personalized setup and workspace warmup are the priority.
- Existing Telegram account linking: use verify_telegram_link when linking is explicitly requested.
- New account handoff: use start_account_creation_handoff when account creation/login is required.
- Slack workspace connect: use start_slack_workspace_connect only when user asks for it.
- Sub-account flow: use start_sub_account_flow only when user asks for it.
- Plan upgrades: use start_plan_upgrade_checkout only when user asks for it.
- Credit packs: use start_credit_pack_checkout only when user asks for it.
- Audit value-first email request: use request_audit_deliverable_email only after workflow value is delivered.
- Audit email delivery after email capture: use generate_audit_workflow_deliverable.
- New workspace creation or personalization finalization after confirmation: use complete_onboarding.

ONBOARDING LOGIC:
- First, identify account status and primary goal.
- Offer a short personalization warmup. If they decline deep onboarding, run minimum setup and hand off anyway.
- If the user wants upgrade/credits/sub-account/Slack setup, use the matching tool only after confirming that is their current priority.
- If the user needs a new account first, use start_account_creation_handoff and pause until they complete login/signup.
- In audit mode, deliver one workflow recommendation before asking for email.
- After the workflow recommendation is delivered, request email, then send the audit workflow results email.
- Run full onboarding when user opts in to immersive personalization or requests a new workspace.
- Never position Quinn as the user's permanent assistant.

FULL ONBOARDING PATH:
1. Baseline calibration (social energy, preferred voice, stress-response style)
2. Workspace name
3. Workspace context (private or business)
4. Primary beneficiary
5. Primary use case + custom communication style
6. Summary + explicit confirmation
7. Use complete_onboarding only after confirmation

RULES:
- Never skip confirmation before complete_onboarding.
- ${UNIVERSAL_ONBOARDING_PROMPT_POLICY_LINES.join("\n- ")}
- ${UNIVERSAL_ONBOARDING_LIMITATION_DISCLOSURE_POLICY_LINES.join("\n- ")}
- ${UNIVERSAL_ONBOARDING_FEATURE_REQUEST_CAPTURE_POLICY_LINES.join("\n- ")}
- If user is confused, give a short example and then ask exactly one question.
- If user asks unrelated questions, answer briefly and redirect to the current step.
- Keep CTA messages channel-safe: always include a plain URL fallback.`;

// ============================================================================
// ONBOARDING INTERVIEW TEMPLATE
// ============================================================================

export const ONBOARDING_INTERVIEW_TEMPLATE: InterviewTemplate = {
  templateName: UNIVERSAL_ONBOARDING_TEMPLATE_NAME,
  description: "Global onboarding interview for Telegram, webchat, and native guest users. Quinn runs short first-contact setup, then hands off permanently to the user's personal agent.",
  version: 5,
  status: "active",
  estimatedMinutes: 4,
  mode: "quick",
  language: "en",
  additionalLanguages: [...UNIVERSAL_AGENT_LANGUAGES],

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
          promptText: "What do you want to do first? (personalize experience, new setup, link existing account, explore platform, or billing/admin)",
          helpText: "Default to personalization and discovery unless the user explicitly asks for billing/admin actions.",
          expectedDataType: "choice",
          extractionField: "primaryGoal",
          validationRules: {
            options: [
              "personalize_experience",
              "full_onboarding",
              "explore_platform",
              "upgrade_plan",
              "buy_credits",
              "create_sub_account",
              "just_link_account",
            ],
          },
        },
        {
          questionId: "q_needs_full_onboarding",
          promptText: "Do you want a deeper 2-minute personalization warmup now, or should I do minimum setup and hand off right away? (yes/no)",
          expectedDataType: "choice",
          extractionField: "needsFullOnboarding",
          validationRules: { options: ["yes", "no"] },
        },
      ],
    },
    {
      phaseId: "baseline_calibration",
      phaseName: "Baseline Calibration",
      order: 3,
      isRequired: true,
      estimatedMinutes: 0.75,
      skipCondition: {
        field: "needsFullOnboarding",
        operator: "equals",
        value: "no",
      },
      introPrompt: "Ask three short baseline questions to personalize the first operator voice immediately.",
      completionPrompt: "Great baseline. Next, capture workspace context.",
      questions: [
        {
          questionId: "q_social_energy",
          promptText: "Quick baseline: today do you want me more social or more direct?",
          helpText: "Keep this lightweight. Examples: social, balanced, direct.",
          expectedDataType: "choice",
          extractionField: "socialEnergyPreference",
          validationRules: { options: ["social", "balanced", "direct"] },
        },
        {
          questionId: "q_voice_preference",
          promptText: "For voice style, should your operator feel more masculine, feminine, or neutral?",
          helpText: "This is just a starting style preference. It can be changed anytime.",
          expectedDataType: "choice",
          extractionField: "preferredVoiceStyle",
          validationRules: { options: ["masculine", "feminine", "neutral"] },
        },
        {
          questionId: "q_hesitation_response",
          promptText: "If I detect hesitation, should I reassure first, clarify first, or move straight to action?",
          helpText: "Choose the response style that helps you move fastest.",
          expectedDataType: "choice",
          extractionField: "hesitationResponseStyle",
          validationRules: { options: ["reassure_first", "clarify_first", "action_first"] },
        },
      ],
    },
    {
      phaseId: "workspace_context",
      phaseName: "Workspace Context",
      order: 4,
      isRequired: true,
      estimatedMinutes: 1,
      skipCondition: {
        field: "needsFullOnboarding",
        operator: "equals",
        value: "no",
      },
      introPrompt: "Start with neutral workspace context: workspace name, context, and who this helps first.",
      completionPrompt: "Great context. Next, define the agent mission before revealing the compiled setup summary.",
      questions: [
        {
          questionId: "q_business_name",
          promptText: "What should we call your workspace?",
          expectedDataType: "text",
          extractionField: "workspaceName",
          validationRules: { required: true, minLength: 1 },
        },
        {
          questionId: "q_industry",
          promptText: "What context are we optimizing for first? (private, business, or both)",
          helpText: "Pick what matters most right now. You can switch modes later.",
          expectedDataType: "choice",
          extractionField: "workspaceContext",
          validationRules: { options: ["private", "business", "both"] },
        },
        {
          questionId: "q_audience",
          promptText: "Who is this primarily for right now?",
          helpText: "Examples: me, my family, my team, my customers, my community.",
          expectedDataType: "text",
          extractionField: "targetAudience",
        },
      ],
    },
    {
      phaseId: "agent_purpose",
      phaseName: "Agent Purpose",
      order: 5,
      isRequired: true,
      estimatedMinutes: 1,
      skipCondition: {
        field: "needsFullOnboarding",
        operator: "equals",
        value: "no",
      },
      introPrompt: "Ask what their agent should help with.",
      completionPrompt: "Perfect. I'll compile a launch summary next and confirm your one-voice operator setup.",
      questions: [
        {
          questionId: "q_use_case",
          promptText: "What do you want your AI agent to help with first? (life admin, learning, creativity, business ops, general)",
          helpText: "Pick the primary purpose. You can always adjust later.",
          expectedDataType: "choice",
          extractionField: "primaryUseCase",
          validationRules: { options: ["Life Admin", "Learning", "Creativity", "Business Ops", "General"] },
        },
        {
          questionId: "q_tone",
          promptText: "In your own words, how should your operator sound and respond?",
          helpText: "Example: calm and concise, warm and reassuring, direct and strategic.",
          expectedDataType: "text",
          extractionField: "tonePreference",
          validationRules: { required: true, minLength: 4 },
        },
        {
          questionId: "q_communication_style",
          promptText: "If I notice hesitation or stress in your message, how should I respond first?",
          helpText: "Example: ask a clarifying question, reassure briefly, then move to action.",
          expectedDataType: "text",
          extractionField: "communicationStyle",
          validationRules: { required: true, minLength: 4 },
        },
      ],
    },
    {
      phaseId: "core_memory_anchors",
      phaseName: "Trust Anchors (Teaser)",
      order: 6,
      isRequired: true,
      estimatedMinutes: 0.75,
      skipCondition: {
        field: "needsFullOnboarding",
        operator: "equals",
        value: "no",
      },
      introPrompt: "Capture quick trust anchors only. Keep private context light and teaser-level for now.",
      completionPrompt: "Great anchors. I'll include these in the compiled launch reveal and keep deeper context for later refinement.",
      questions: [
        {
          questionId: "q_core_memory_identity",
          promptText: "In one sentence, what should your agent always remember about your brand promise?",
          helpText: "Keep it concise. This is a teaser anchor, not a full private-context deep dive.",
          expectedDataType: "text",
          extractionField: "coreMemoryIdentityAnchor",
          validationRules: { required: true, minLength: 4 },
        },
        {
          questionId: "q_core_memory_boundary",
          promptText: "What is one boundary your agent should never cross without escalating?",
          helpText: "Example: legal advice, refunds above a threshold, sensitive account actions.",
          expectedDataType: "text",
          extractionField: "coreMemoryBoundaryAnchor",
          validationRules: { required: true, minLength: 4 },
        },
        {
          questionId: "q_core_memory_empathy",
          promptText: "In difficult moments, how should your agent make customers feel?",
          helpText: "Use a short phrase. You can expand private nuance later.",
          expectedDataType: "text",
          extractionField: "coreMemoryEmpathyAnchor",
          validationRules: { required: true, minLength: 4 },
        },
      ],
    },
    {
      phaseId: "confirmation",
      phaseName: "Confirmation & Creation",
      order: 7,
      isRequired: true,
      estimatedMinutes: 0.5,
      skipCondition: {
        field: "needsFullOnboarding",
        operator: "equals",
        value: "no",
      },
      introPrompt: "Reveal a compiled launch summary (workspace context first, trust teaser second), confirm one consistent operator voice, and ask for explicit confirmation.",
      completionPrompt: "Your personal agent is ready. Quinn exits now, and the next message goes only to your agent.",
      questions: [
        {
          questionId: "q_confirm",
          promptText: "Here is your launch snapshot for one personalized operator voice. Does this look right? (yes/no)",
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
      { fieldId: "socialEnergyPreference", fieldName: "Social Energy Preference", dataType: "string", category: "voice", required: false },
      { fieldId: "preferredVoiceStyle", fieldName: "Preferred Voice Style", dataType: "string", category: "voice", required: false },
      { fieldId: "hesitationResponseStyle", fieldName: "Hesitation Response Style", dataType: "string", category: "voice", required: false },
      { fieldId: "workspaceName", fieldName: "Workspace Name", dataType: "string", category: "brand", required: false },
      { fieldId: "workspaceContext", fieldName: "Workspace Context", dataType: "string", category: "goals", required: false },
      { fieldId: "targetAudience", fieldName: "Target Audience", dataType: "string", category: "audience", required: false },
      { fieldId: "primaryUseCase", fieldName: "Primary Use Case", dataType: "string", category: "goals", required: false },
      { fieldId: "tonePreference", fieldName: "Tone Preference", dataType: "string", category: "voice", required: false },
      { fieldId: "communicationStyle", fieldName: "Communication Style", dataType: "string", category: "voice", required: false },
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

  interviewerPersonality: "Warm, perceptive, multilingual. You are one continuous operator voice across Telegram, webchat, and native guest channels — one question at a time, max 3 lines per message.",
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
  additionalLanguages: [...UNIVERSAL_AGENT_LANGUAGES],
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
    "request_audit_deliverable_email",
    AUDIT_DELIVERABLE_TOOL_NAME,
    "verify_telegram_link",
    "start_account_creation_handoff",
    "start_slack_workspace_connect",
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
  modelId: ONBOARDING_DEFAULT_MODEL_ID,
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
  soulScope: {
    capability: "platform_soul_admin",
    layer: "L2",
    domain: "platform",
    classification: "platform_l2",
    allowPlatformSoulAdmin: true,
  },
  clonePolicy: {
    spawnEnabled: false,
  },
};

const SAMANTHA_LEAD_CAPTURE_WORKER_NAME = "Samantha Lead Capture 1";
const SAMANTHA_WARM_LEAD_CAPTURE_WORKER_NAME = "Samantha Warm Lead Capture 1";
const SAMANTHA_LEAD_CAPTURE_CUSTOM_PROPERTIES = {
  displayName: "Samantha",
  runtimeModuleKey: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
  personality:
    "Sharp, commercially-minded lead capture consultant. Identifies the highest-leverage business bottleneck quickly and converts it into an actionable implementation plan.",
  language: "en",
  additionalLanguages: [...UNIVERSAL_AGENT_LANGUAGES],
  systemPrompt: [
    "You are Samantha, a 7-minute lead capture consultant for high-performing business owners.",
    "Your core job: find the user's highest-impact pain point, recommend one concrete workflow, and deliver a clear implementation-ready scope plan.",
    "Commercial motion contract (must stay explicit and consistent):",
    "- Free Diagnostic is lead qualification only.",
    "- Consulting Sprint is €3,500 and scope-only (no implementation delivery).",
    "- Implementation Start begins at €7,000+.",
    "Intent routing behavior:",
    "- intent_code=diagnostic_qualification: run diagnostic qualification flow and deliver one high-leverage workflow recommendation before contact capture.",
    "- intent_code=consulting_sprint_scope_only: keep scope strictly strategy/discovery, define boundaries, and never imply production implementation is included.",
    "- intent_code=implementation_start_layer1: confirm implementation readiness, budget/timing, and route to implementation-start expectations at €7,000+.",
    "Handoff and lead payload tagging contract:",
    "- In handoff summaries and qualification recaps, preserve canonical fields: offer_code, intent_code, surface, routing_hint.",
    "- Preserve canonical campaign envelope keys: source, medium, campaign, content, term, referrer, landingPath.",
    "- Include compatibility aliases when available: offerCode, intentCode, routingHint, utm_source/utmSource, utm_medium/utmMedium, utm_campaign/utmCampaign, utm_content/utmContent, utm_term/utmTerm, funnelReferrer, funnelLandingPath.",
    "Language policy:",
    "- Treat language support as unrestricted: respond in whatever language the user writes.",
    "- Detect and mirror the user's language on every turn.",
    "- If the user switches language, switch with them immediately.",
    "- If confidence is low, ask one short clarification in the user's language; fallback to English only if needed.",
    "- Never claim you only speak English/German; support multilingual conversation including Chinese when requested.",
    "Always follow value-first sequencing:",
    "1) Ask concise context questions to identify the bottleneck.",
    "2) Deliver one specific workflow recommendation first.",
    "3) After value delivery, collect lead qualification details before sending the audit results email.",
    "Minimum required before audit results email delivery: first name, last name, email, phone number, and founder-contact preference (yes/no).",
    "Ask for additional qualification details when possible: delivery address, revenue, AI project experience, employee count, industry, ownership share, AI budget availability today, and if not today then exact timing.",
    "Ask this explicitly as one yes/no question: Would you like Remington the founder of sevenlayers.io to discuss implementation support?",
    "4) Use request_audit_deliverable_email only after value delivery to request or confirm the delivery email.",
    "5) Use generate_audit_workflow_deliverable to send the implementation results email after minimum required fields are captured.",
    "When discussing consulting sprint outcomes, state explicitly that implementation delivery is excluded.",
    "If implementation readiness is requested, state explicitly that implementation starts at €7,000+.",
    "Never ask for contact details before delivering value.",
    "Prioritize high-intent leads for follow-up based on completeness and clarity of qualification data.",
    "Never present a broad list of ideas; give one strongest plan.",
    "Keep messages concise, direct, and operator-level.",
  ].join("\n"),
  faqEntries: [
    {
      q: "What do I get in this audit?",
      a: "One specific workflow recommendation and a clean implementation plan you can execute with or without us.",
    },
    {
      q: "How long does this take?",
      a: "About seven minutes for context + recommendation, then I generate your implementation brief.",
    },
  ],
  knowledgeBaseTags: ["one_of_one", "lead_capture", "audit_mode"],
  enabledTools: [
    "request_audit_deliverable_email",
    AUDIT_DELIVERABLE_TOOL_NAME,
    "start_account_creation_handoff",
  ],
  disabledTools: [] as string[],
  autonomyLevel: "autonomous",
  maxMessagesPerDay: 1000,
  maxCostPerDay: 50.0,
  requireApprovalFor: [] as string[],
  blockedTopics: [] as string[],
  modelProvider: "openrouter",
  modelId: ONBOARDING_DEFAULT_MODEL_ID,
  temperature: 0.45,
  maxTokens: 4096,
  channelBindings: [
    { channel: "webchat", enabled: true },
    { channel: "native_guest", enabled: true },
    { channel: "telegram", enabled: false },
  ],
  totalMessages: 0,
  totalCostUsd: 0,
  protected: true,
  templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
  templateLayer: "lead_capture",
  templateScope: "platform",
  templatePlaybook: "lead_capture",
  soulScope: {
    capability: "platform_soul_admin",
    layer: "L2",
    domain: "platform",
    classification: "platform_l2",
    allowPlatformSoulAdmin: true,
  },
  clonePolicy: {
    spawnEnabled: true,
    maxClonesPerOrg: 12,
    maxClonesPerTemplatePerOrg: 4,
    maxClonesPerOwner: 3,
    allowedPlaybooks: ["lead_capture"],
  },
  actionCompletionContract: {
    contractVersion: ACTION_COMPLETION_TEMPLATE_CONTRACT_VERSION,
    mode: "enforce",
    outcomes: [
      {
        outcome: AUDIT_DELIVERABLE_OUTCOME_KEY,
        requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
        unavailableMessage:
          "I can’t send your implementation results email in this turn because the delivery tool is unavailable in the current runtime scope. I won’t claim completion without a real tool execution.",
        notObservedMessage:
          "I can’t confirm implementation results email delivery yet because the delivery tool did not execute in this turn. I won’t claim completion without a real tool call. Please confirm first name, last name, email, phone number, and founder-contact preference (yes/no), and I will run it now.",
      },
    ],
  },
};

const SAMANTHA_LEAD_CAPTURE_TEMPLATE_SEED: ProtectedTemplateAgentSeed = {
  name: "Samantha Lead Capture Consultant",
  subtype: "general",
  description:
    "Protected template for one-of-one lead capture audit flow (7-minute bottleneck diagnosis + implementation plan deliverable).",
  role: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
  customProperties: SAMANTHA_LEAD_CAPTURE_CUSTOM_PROPERTIES,
};

const SAMANTHA_WARM_LEAD_CAPTURE_CUSTOM_PROPERTIES = {
  ...SAMANTHA_LEAD_CAPTURE_CUSTOM_PROPERTIES,
  displayName: "Samantha Warm",
  personality:
    "High-intent implementation consultant. Converts warm commercial handoffs into clear next steps, qualification payloads, and deterministic follow-up actions.",
  systemPrompt: [
    "You are Samantha Warm, the warm-intent commercial conversion specialist for sevenlayers.io.",
    "Audience gate:",
    "- You only run warm conversion behavior when inbound metadata indicates surface=store or target_specialist_template_role=one_of_one_warm_lead_capture_consultant_template.",
    "- If metadata indicates one_of_one_landing or cold traffic, stay value-first and do not hard-sell.",
    "Commercial motion contract (must stay explicit and consistent):",
    "- Free Diagnostic is qualification only.",
    "- Consulting Sprint is €3,500 and scope-only (no implementation delivery).",
    "- Implementation Start begins at €7,000+.",
    "Intent routing behavior:",
    "- intent_code=diagnostic_qualification or diagnostic_scope_intake: deliver one workflow recommendation, then capture qualification for next-step call.",
    "- intent_code=consulting_sprint_scope_only: keep scope strategy/discovery only and explicitly exclude production implementation.",
    "- intent_code=implementation_start_layer1 or implementation_layer_upgrade: confirm readiness, budget/timing, and implementation expectations.",
    "Handoff and lead payload tagging contract:",
    "- In handoff summaries and qualification recaps, preserve canonical fields: offer_code, intent_code, surface, routing_hint.",
    "- Preserve canonical campaign envelope keys: source, medium, campaign, content, term, referrer, landingPath.",
    "- Include compatibility aliases when available: offerCode, intentCode, routingHint, utm_source/utmSource, utm_medium/utmMedium, utm_campaign/utmCampaign, utm_content/utmContent, utm_term/utmTerm, funnelReferrer, funnelLandingPath.",
    "Sequencing contract:",
    "1) Deliver value first (one strongest workflow recommendation).",
    "2) Collect qualification fields before finalizing follow-up.",
    "3) Request audit deliverable email and send audit results only after minimum required fields are captured.",
    "Minimum required before audit results email delivery: first name, last name, email, phone number, and founder-contact preference (yes/no).",
    "If implementation readiness is requested, state explicitly that implementation starts at €7,000+.",
    "Keep responses concise, direct, and operator-level.",
  ].join("\n"),
  knowledgeBaseTags: ["one_of_one", "lead_capture", "audit_mode", "warm_intent"],
  temperature: 0.4,
  templateRole: SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE,
};

const SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_SEED: ProtectedTemplateAgentSeed = {
  name: "Samantha Warm Lead Capture Consultant",
  subtype: "general",
  description:
    "Protected template for warm-intent commercial handoffs (store/chat) with strict conversion guardrails and audit deliverable flow.",
  role: SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE,
  customProperties: SAMANTHA_WARM_LEAD_CAPTURE_CUSTOM_PROPERTIES,
};

const SAMANTHA_LEGACY_FILE_DELIVERY_PATTERN = /\b(pdf|docx)\b/i;

function resolveSamanthaLegacyFileDeliveryDrift(
  customProperties: Record<string, unknown>,
): {
  systemPromptHasLegacyFileDeliveryTerms: boolean;
  actionCompletionMessagesHaveLegacyFileDeliveryTerms: boolean;
} {
  const systemPrompt =
    typeof customProperties.systemPrompt === "string"
      ? customProperties.systemPrompt
      : "";
  const actionCompletion = asRecord(customProperties.actionCompletionContract);
  const outcomes = Array.isArray(actionCompletion.outcomes)
    ? actionCompletion.outcomes
    : [];
  const contractMessages = outcomes.flatMap((outcome) => {
    const record = asRecord(outcome);
    const unavailableMessage =
      typeof record.unavailableMessage === "string"
        ? record.unavailableMessage
        : "";
    const notObservedMessage =
      typeof record.notObservedMessage === "string"
        ? record.notObservedMessage
        : "";
    return [unavailableMessage, notObservedMessage];
  });

  return {
    systemPromptHasLegacyFileDeliveryTerms:
      SAMANTHA_LEGACY_FILE_DELIVERY_PATTERN.test(systemPrompt),
    actionCompletionMessagesHaveLegacyFileDeliveryTerms:
      contractMessages.some((message) => SAMANTHA_LEGACY_FILE_DELIVERY_PATTERN.test(message)),
  };
}

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
const PERSONAL_OPERATOR_TEMPLATE_PLAYBOOK = "personal_operator";
const PERSONAL_OPERATOR_TEMPLATE_ROLE = "personal_life_operator_template";

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
    additionalLanguages: [...UNIVERSAL_AGENT_LANGUAGES],
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
    modelId: ONBOARDING_DEFAULT_MODEL_ID,
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
    soulScope: {
      capability: "platform_soul_admin",
      layer: "L2",
      domain: "platform",
      classification: "platform_l2",
      allowPlatformSoulAdmin: true,
    },
    clonePolicy: USE_CASE_CLONE_POLICY_DEFAULTS,
  };
}

function buildPersonalOperatorTemplateCustomProperties(): Record<string, unknown> {
  return {
    displayName: "Personal Life Operator",
    personality:
      "Personal operations specialist for calendar-aware appointment coordination with deterministic outreach boundaries.",
    language: "en",
    additionalLanguages: [...UNIVERSAL_AGENT_LANGUAGES],
    systemPrompt:
      "You are the Personal Life Operator template. Coordinate appointments using calendar, contacts, and booking tools while keeping appointment outreach in sandbox domain autonomy until explicit promotion evidence exists.",
    faqEntries: [],
    knowledgeBaseTags: [
      "personal_operator",
      "appointment_booking",
      "protected_template",
    ],
    toolProfile: "personal_operator",
    enabledTools: [
      "check_oauth_connection",
      "create_contact",
      "search_contacts",
      "update_contact",
      "tag_contacts",
      "create_event",
      "list_events",
      "update_event",
      "manage_bookings",
      "configure_booking_workflow",
      "escalate_to_human",
    ],
    disabledTools: [],
    // Default approval mode: all mutations stay supervised until explicit promotion.
    autonomyLevel: "supervised",
    domainAutonomy: {
      appointment_booking: {
        level: "sandbox",
      },
    },
    maxMessagesPerDay: 500,
    maxCostPerDay: 30,
    requireApprovalFor: [],
    blockedTopics: [],
    modelProvider: "openrouter",
    modelId: ONBOARDING_DEFAULT_MODEL_ID,
    temperature: 0.3,
    maxTokens: 4096,
    channelBindings: [
      { channel: "webchat", enabled: true },
      { channel: "telegram", enabled: true },
      { channel: "native_guest", enabled: true },
    ],
    unifiedPersonality: true,
    teamAccessMode: "invisible",
    dreamTeamSpecialists: [],
    totalMessages: 0,
    totalCostUsd: 0,
    protected: true,
    templateScope: "platform",
    templateLayer: "personal_operator",
    templateRole: PERSONAL_OPERATOR_TEMPLATE_ROLE,
    templatePlaybook: PERSONAL_OPERATOR_TEMPLATE_PLAYBOOK,
    soulScope: {
      capability: "platform_soul_admin",
      layer: "L2",
      domain: "platform",
      classification: "platform_l2",
      allowPlatformSoulAdmin: true,
    },
    clonePolicy: {
      ...USE_CASE_CLONE_POLICY_DEFAULTS,
      allowedPlaybooks: [PERSONAL_OPERATOR_TEMPLATE_PLAYBOOK],
    },
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
const PERSONAL_OPERATOR_TEMPLATE_AGENT_SEED: ProtectedTemplateAgentSeed = {
  name: "Personal Life Operator",
  subtype: "booking_agent",
  description:
    "Protected template for personal appointment planning, constrained booking outreach, and one-agent contract defaults.",
  role: PERSONAL_OPERATOR_TEMPLATE_ROLE,
  customProperties: buildPersonalOperatorTemplateCustomProperties(),
};
const PROTECTED_TEMPLATE_AGENT_SEEDS: ProtectedTemplateAgentSeed[] = [
  ...ORCHESTRATION_TEMPLATE_AGENT_SEEDS,
  PERSONAL_OPERATOR_TEMPLATE_AGENT_SEED,
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

async function upsertLeadCaptureWorker(
  ctx: WriteCtx,
  args: {
    organizationId: Id<"organizations">;
    now: number;
    templateAgentId: Id<"objects">;
    workerPoolRole: string;
    workerName: string;
    workerDescription: string;
    customProperties: Record<string, unknown>;
    displayName: string;
    seedRole: string;
  },
): Promise<{ workerId: Id<"objects"> | null; created: boolean }> {
  const existingAgents = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q) =>
      q.eq("organizationId", args.organizationId).eq("type", "org_agent")
    )
    .collect();

  const existingWorkers = existingAgents.filter((agent) => {
    const props = asRecord(agent.customProperties);
    return (
      agent.status === "active" &&
      `${props.templateAgentId || ""}` === `${args.templateAgentId}` &&
      props.workerPoolRole === args.workerPoolRole
    );
  });

  if (existingWorkers.length > 0) {
    // Keep existing worker identity/counters but refresh behavior contract from latest seed.
    const worker = existingWorkers[0];
    const liveProps = asRecord(worker.customProperties);
    await ctx.db.patch(worker._id, {
      subtype: "general",
      description: args.workerDescription,
      status: "active",
      customProperties: {
        ...args.customProperties,
        displayName: args.displayName,
        status: "active",
        templateAgentId: args.templateAgentId,
        workerPoolRole: args.workerPoolRole,
        lastActiveSessionAt: args.now,
        totalMessages: typeof liveProps.totalMessages === "number" ? liveProps.totalMessages : 0,
        totalCostUsd: typeof liveProps.totalCostUsd === "number" ? liveProps.totalCostUsd : 0,
      },
      updatedAt: args.now,
    });
    return { workerId: worker._id, created: false };
  }

  const workerId = await ctx.db.insert("objects", {
    organizationId: args.organizationId,
    type: "org_agent",
    subtype: "general",
    name: args.workerName,
    description: args.workerDescription,
    status: "active",
    customProperties: {
      ...args.customProperties,
      displayName: args.displayName,
      status: "active",
      templateAgentId: args.templateAgentId,
      workerPoolRole: args.workerPoolRole,
      lastActiveSessionAt: args.now,
    },
    createdAt: args.now,
    updatedAt: args.now,
  });

  await ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: workerId,
    actionType: "seeded",
    actionData: {
      agent: args.workerName,
      role: args.seedRole,
      templateId: args.templateAgentId,
    },
    performedAt: args.now,
  });

  return { workerId, created: true };
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
    // 1c. UPSERT PROTECTED SPECIALIST/PERSONAL-OPERATOR TEMPLATE AGENTS
    // ------------------------------------------------------------------

    const specialistTemplateResults: Array<{
      name: string;
      role: string;
      agentId: Id<"objects">;
      created: boolean;
    }> = [];

    for (const seed of PROTECTED_TEMPLATE_AGENT_SEEDS) {
      const result = await upsertProtectedTemplateAgent(ctx, {
        organizationId: platformOrgId,
        now,
        seed,
      });
      specialistTemplateResults.push({
        name: seed.name,
        role: seed.role,
        agentId: result.agentId,
        created: result.created,
      });
      console.log(
        `[seedPlatformAgents] ${seed.name} upserted (${result.created ? "created" : "updated"}): ${result.agentId}`,
      );
    }

    const personalOperatorTemplateResult = specialistTemplateResults.find(
      (entry) => entry.role === PERSONAL_OPERATOR_TEMPLATE_ROLE,
    ) ?? null;

    // ------------------------------------------------------------------
    // 1d. UPSERT SAMANTHA LEAD CAPTURE TEMPLATE + WORKER
    // ------------------------------------------------------------------

    const samanthaTemplateResult = await upsertProtectedTemplateAgent(ctx, {
      organizationId: platformOrgId,
      now,
      seed: SAMANTHA_LEAD_CAPTURE_TEMPLATE_SEED,
    });
    console.log(
      `[seedPlatformAgents] ${SAMANTHA_LEAD_CAPTURE_TEMPLATE_SEED.name} upserted (${samanthaTemplateResult.created ? "created" : "updated"}): ${samanthaTemplateResult.agentId}`,
    );

    const samanthaWorkerResult = await upsertLeadCaptureWorker(ctx, {
      organizationId: platformOrgId,
      now,
      templateAgentId: samanthaTemplateResult.agentId,
      workerPoolRole: "lead_capture_consultant",
      workerName: SAMANTHA_LEAD_CAPTURE_WORKER_NAME,
      workerDescription: "Samantha lead capture consultant worker (seeded)",
      customProperties: SAMANTHA_LEAD_CAPTURE_CUSTOM_PROPERTIES,
      displayName: "Samantha",
      seedRole: "lead_capture_consultant",
    });
    if (samanthaWorkerResult.created) {
      console.log(`[seedPlatformAgents] Initial Samantha worker spawned: ${samanthaWorkerResult.workerId}`);
    } else {
      console.log(`[seedPlatformAgents] Samantha worker already exists — skipped`);
    }

    const samanthaWarmTemplateResult = await upsertProtectedTemplateAgent(ctx, {
      organizationId: platformOrgId,
      now,
      seed: SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_SEED,
    });
    console.log(
      `[seedPlatformAgents] ${SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_SEED.name} upserted (${samanthaWarmTemplateResult.created ? "created" : "updated"}): ${samanthaWarmTemplateResult.agentId}`,
    );

    const samanthaWarmWorkerResult = await upsertLeadCaptureWorker(ctx, {
      organizationId: platformOrgId,
      now,
      templateAgentId: samanthaWarmTemplateResult.agentId,
      workerPoolRole: "lead_capture_consultant_warm",
      workerName: SAMANTHA_WARM_LEAD_CAPTURE_WORKER_NAME,
      workerDescription: "Samantha warm lead capture consultant worker (seeded)",
      customProperties: SAMANTHA_WARM_LEAD_CAPTURE_CUSTOM_PROPERTIES,
      displayName: "Samantha Warm",
      seedRole: "lead_capture_consultant_warm",
    });
    if (samanthaWarmWorkerResult.created) {
      console.log(`[seedPlatformAgents] Initial Samantha Warm worker spawned: ${samanthaWarmWorkerResult.workerId}`);
    } else {
      console.log(`[seedPlatformAgents] Samantha Warm worker already exists — skipped`);
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
      (t) => t.name === UNIVERSAL_ONBOARDING_TEMPLATE_NAME
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
        name: UNIVERSAL_ONBOARDING_TEMPLATE_NAME,
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
        actionData: { template: UNIVERSAL_ONBOARDING_TEMPLATE_NAME, mode: "quick" },
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
      personalLifeOperatorTemplateId: personalOperatorTemplateResult?.agentId ?? null,
      personalLifeOperatorTemplateCreated: personalOperatorTemplateResult?.created ?? false,
      samanthaLeadCaptureTemplateId: samanthaTemplateResult.agentId,
      samanthaLeadCaptureTemplateCreated: samanthaTemplateResult.created,
      samanthaLeadCaptureWorkerId: samanthaWorkerResult.workerId,
      samanthaLeadCaptureWorkerCreated: samanthaWorkerResult.created,
      samanthaWarmLeadCaptureTemplateId: samanthaWarmTemplateResult.agentId,
      samanthaWarmLeadCaptureTemplateCreated: samanthaWarmTemplateResult.created,
      samanthaWarmLeadCaptureWorkerId: samanthaWarmWorkerResult.workerId,
      samanthaWarmLeadCaptureWorkerCreated: samanthaWarmWorkerResult.created,
      initialWorkerId,
      workerCreated: existingWorkers.length === 0,
    };
  },
});

export const seedSamanthaLeadCaptureConsultant = internalMutation({
  args: {},
  handler: async (ctx) => {
    const platformOrgId = getPlatformOrgId();
    const now = Date.now();

    const platformOrg = await ctx.db.get(platformOrgId);
    if (!platformOrg) {
      throw new Error(`Platform org ${platformOrgId} not found. Set PLATFORM_ORG_ID env var.`);
    }

    const templateResult = await upsertProtectedTemplateAgent(ctx, {
      organizationId: platformOrgId,
      now,
      seed: SAMANTHA_LEAD_CAPTURE_TEMPLATE_SEED,
    });

    const workerResult = await upsertLeadCaptureWorker(ctx, {
      organizationId: platformOrgId,
      now,
      templateAgentId: templateResult.agentId,
      workerPoolRole: "lead_capture_consultant",
      workerName: SAMANTHA_LEAD_CAPTURE_WORKER_NAME,
      workerDescription: "Samantha lead capture consultant worker (seeded)",
      customProperties: SAMANTHA_LEAD_CAPTURE_CUSTOM_PROPERTIES,
      displayName: "Samantha",
      seedRole: "lead_capture_consultant",
    });

    return {
      success: true,
      platformOrgId,
      templateId: templateResult.agentId,
      templateCreated: templateResult.created,
      workerId: workerResult.workerId,
      workerCreated: workerResult.created,
      templateRole: SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
      workerName: SAMANTHA_LEAD_CAPTURE_WORKER_NAME,
    };
  },
});

export const seedSamanthaWarmLeadCaptureConsultant = internalMutation({
  args: {},
  handler: async (ctx) => {
    const platformOrgId = getPlatformOrgId();
    const now = Date.now();

    const platformOrg = await ctx.db.get(platformOrgId);
    if (!platformOrg) {
      throw new Error(`Platform org ${platformOrgId} not found. Set PLATFORM_ORG_ID env var.`);
    }

    const templateResult = await upsertProtectedTemplateAgent(ctx, {
      organizationId: platformOrgId,
      now,
      seed: SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_SEED,
    });

    const workerResult = await upsertLeadCaptureWorker(ctx, {
      organizationId: platformOrgId,
      now,
      templateAgentId: templateResult.agentId,
      workerPoolRole: "lead_capture_consultant_warm",
      workerName: SAMANTHA_WARM_LEAD_CAPTURE_WORKER_NAME,
      workerDescription: "Samantha warm lead capture consultant worker (seeded)",
      customProperties: SAMANTHA_WARM_LEAD_CAPTURE_CUSTOM_PROPERTIES,
      displayName: "Samantha Warm",
      seedRole: "lead_capture_consultant_warm",
    });

    return {
      success: true,
      platformOrgId,
      templateId: templateResult.agentId,
      templateCreated: templateResult.created,
      workerId: workerResult.workerId,
      workerCreated: workerResult.created,
      templateRole: SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE,
      workerName: SAMANTHA_WARM_LEAD_CAPTURE_WORKER_NAME,
    };
  },
});

export const inspectSamanthaDeliveryLanguageDrift = internalQuery({
  args: {},
  handler: async (ctx) => {
    const platformOrgId = getPlatformOrgId();
    const agents = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", platformOrgId).eq("type", "org_agent")
      )
      .collect();

    const relevantAgents = agents.filter((agent) => {
      const props = asRecord(agent.customProperties);
      const templateRole = typeof props.templateRole === "string" ? props.templateRole : "";
      const workerPoolRole =
        typeof props.workerPoolRole === "string" ? props.workerPoolRole : "";
      return templateRole === SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE
        || templateRole === SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE
        || workerPoolRole === "lead_capture_consultant"
        || workerPoolRole === "lead_capture_consultant_warm";
    });

    const records = relevantAgents.map((agent) => {
      const props = asRecord(agent.customProperties);
      const drift = resolveSamanthaLegacyFileDeliveryDrift(props);
      const templateRole = typeof props.templateRole === "string" ? props.templateRole : null;
      const workerPoolRole =
        typeof props.workerPoolRole === "string" ? props.workerPoolRole : null;
      const templateAgentId =
        typeof props.templateAgentId === "string" ? props.templateAgentId : null;
      const driftDetected =
        drift.systemPromptHasLegacyFileDeliveryTerms
        || drift.actionCompletionMessagesHaveLegacyFileDeliveryTerms;
      return {
        agentId: agent._id,
        name: agent.name,
        status: agent.status,
        templateRole,
        workerPoolRole,
        templateAgentId,
        driftDetected,
        systemPromptHasLegacyFileDeliveryTerms:
          drift.systemPromptHasLegacyFileDeliveryTerms,
        actionCompletionMessagesHaveLegacyFileDeliveryTerms:
          drift.actionCompletionMessagesHaveLegacyFileDeliveryTerms,
      };
    });

    return {
      success: true,
      platformOrgId,
      records,
      driftCount: records.filter((record) => record.driftDetected).length,
      syncPath: [
        "Run internal.onboarding.seedPlatformAgents.seedSamanthaLeadCaptureConsultant",
        "Run internal.onboarding.seedPlatformAgents.seedSamanthaWarmLeadCaptureConsultant",
      ],
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
      .filter((q) => q.eq(q.field("name"), UNIVERSAL_ONBOARDING_TEMPLATE_NAME))
      .first();

    return template?._id ?? null;
  },
});
