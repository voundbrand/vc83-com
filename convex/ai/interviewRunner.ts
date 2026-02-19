/**
 * INTERVIEW RUNNER
 *
 * Execution logic for guided interview sessions.
 * Manages state transitions, data extraction, and completion flow.
 *
 * Key Functions:
 * - startInterview: Initialize a guided session with a template
 * - advanceInterview: Move to next question/phase after processing answer
 * - completeInterview: Finalize and save Content DNA
 * - getInterviewProgress: Query current progress
 *
 * Integration with agentExecution.ts:
 * - buildInterviewContext(): Injects current question into system prompt
 * - processExtractionResult(): Updates extractedData after LLM response
 *
 * See: convex/schemas/interviewSchemas.ts for type definitions
 * See: convex/interviewTemplateOntology.ts for template CRUD
 */

import { query, mutation, action, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser } from "../rbacHelpers";
import type {
  InterviewTemplate,
  InterviewState,
  InterviewProgress,
  SkipCondition,
} from "../schemas/interviewSchemas";
import {
  TRUST_EVENT_TAXONOMY_VERSION,
  validateTrustEventPayload,
  type TrustEventName,
  type TrustEventPayload,
} from "./trustEvents";

// Lazy-load api/internal to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApi(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../_generated/api");
  }
  return _apiCache;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  return getApi().internal;
}

const INTERVIEW_MEMORY_CONSENT_SCOPE = "content_dna_profile";
const INTERVIEW_MEMORY_CONSENT_PROMPT_VERSION = "interview-memory-consent-v1";
const INTERVIEW_TRUST_CHANNEL = "interview";
const INTERVIEW_TRUST_ARTIFACTS_VERSION = "trust-artifacts.v1";
const ADAPTIVE_MICRO_SESSION_QUESTION_TARGET = 2;
const ADAPTIVE_EARLY_ADVANCE_CONFIDENCE = 0.78;

type ConsentCheckpointId =
  | "cp0_capture_notice"
  | "cp1_summary_review"
  | "cp2_save_decision"
  | "cp3_post_save_revoke";

interface ConsentCheckpointSummary {
  checkpointId: ConsentCheckpointId;
  title: string;
  description: string;
  status: "complete" | "active" | "pending";
  sourceAttributionVisible: boolean;
  sourceAttributionPolicy: string;
  sourceAttributionSummary: string;
  sourceAttributionCount: number;
  sourceAttributionPreview: SourceAttributionSummary[];
  memoryCandidateCount: number;
}

interface SourceAttributionSummary {
  fieldId: string;
  phaseId: string;
  phaseName: string;
  questionId: string;
  questionPrompt: string;
  valuePreview: string;
}

interface VoiceConsentSummary {
  channel: string;
  voiceCaptureMode: "voice_enabled";
  activeCheckpointId: ConsentCheckpointId;
  providerFallbackPolicy: string;
  sourceAttributionPolicy: string;
  sourceAttributionCount: number;
  sourceAttributionPreview: SourceAttributionSummary[];
  memoryCandidateCount: number;
}

type InterviewSessionLifecycleState =
  | "capturing"
  | "checkpoint_review"
  | "consent_pending"
  | "resumable_unsaved"
  | "saved"
  | "discarded";

interface MemoryCandidate {
  fieldId: string;
  label: string;
  value: unknown;
  valuePreview: string;
  phaseId: string;
  phaseName: string;
  questionId: string;
  questionPrompt: string;
}

interface DistilledCoreMemory {
  memoryId: string;
  type: "identity" | "boundary" | "empathy" | "pride" | "caution";
  title: string;
  narrative: string;
  source: "onboarding_story";
  immutable: true;
  immutableReason: "onboarding_anchor";
  sourceFieldId: string;
}

export interface CoreMemoryDistillationBundle {
  generatedAt: number;
  sourceTemplateName: string;
  memories: DistilledCoreMemory[];
}

interface PhaseSummary {
  phaseId: string;
  phaseName: string;
  items: Array<{
    fieldId: string;
    label: string;
    valuePreview: string;
    questionId: string;
    questionPrompt: string;
  }>;
}

interface TrustArtifactEntry {
  fieldId: string;
  label: string;
  valuePreview: string;
  phaseId: string;
  phaseName: string;
  questionId: string;
  questionPrompt: string;
}

interface TrustArtifactCard {
  cardId: "soul_card" | "guardrails_card" | "team_charter";
  title: string;
  summary: string;
  identityAnchors: TrustArtifactEntry[];
  guardrails: TrustArtifactEntry[];
  handoffBoundaries: TrustArtifactEntry[];
  driftCues: TrustArtifactEntry[];
}

interface MemoryLedgerArtifactCard {
  cardId: "memory_ledger";
  title: string;
  summary: string;
  identityAnchors: TrustArtifactEntry[];
  guardrails: TrustArtifactEntry[];
  handoffBoundaries: TrustArtifactEntry[];
  driftCues: TrustArtifactEntry[];
  consentScope: string;
  consentDecision: "accepted";
  consentPromptVersion: string;
  ledgerEntries: TrustArtifactEntry[];
}

interface TrustArtifactsBundle {
  version: string;
  generatedAt: number;
  sourceTemplateName: string;
  soulCard: TrustArtifactCard;
  guardrailsCard: TrustArtifactCard;
  teamCharter: TrustArtifactCard;
  memoryLedger: MemoryLedgerArtifactCard;
}

interface PhaseCoverageSummary {
  capturedFieldIds: string[];
  missingRequiredFieldIds: string[];
  capturedFieldCount: number;
  questionCount: number;
  remainingQuestionCount: number;
}

interface AdaptiveSessionSummary {
  microSessionLabel: string;
  progressivePrompt: string;
  phaseCoverage: PhaseCoverageSummary;
  activeCheckpointId: ConsentCheckpointId;
}

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * GET INTERVIEW PROGRESS
 * Returns current progress through an interview session.
 */
export const getInterviewProgress = query({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args): Promise<InterviewProgress | null> => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.sessionMode !== "guided" || !session.interviewTemplateId) {
      return null;
    }

    const template = await ctx.db.get(session.interviewTemplateId);
    if (!template || template.type !== "interview_template") {
      return null;
    }

    const props = template.customProperties as InterviewTemplate;
    const state = session.interviewState as InterviewState | undefined;

    if (!state) {
      return null;
    }

    // Calculate progress
    const currentPhase = props.phases[state.currentPhaseIndex];
    const totalQuestions = props.phases.reduce((sum, p) => sum + p.questions.length, 0);
    const answeredQuestions = calculateAnsweredQuestionCount(props, state);

    const percentComplete = totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;

    // Adaptive estimate: favors progressive micro-session pacing over rigid phase durations.
    const remainingQuestions = Math.max(0, totalQuestions - answeredQuestions);
    const estimatedMinutesRemaining = Math.max(
      1,
      Math.ceil(remainingQuestions * 1.5),
    );

    return {
      sessionId: args.sessionId,
      templateId: session.interviewTemplateId,
      templateName: props.templateName,
      currentPhaseName: currentPhase?.phaseName || "Unknown",
      currentQuestionIndex: state.currentQuestionIndex,
      totalQuestions,
      completedPhases: state.completedPhases.length,
      totalPhases: props.phases.length,
      percentComplete,
      estimatedMinutesRemaining,
      isComplete: state.isComplete,
    };
  },
});

/**
 * GET CURRENT INTERVIEW CONTEXT
 * Returns the current phase/question for display in UI.
 */
export const getCurrentContext = query({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.sessionMode !== "guided" || !session.interviewTemplateId) {
      return null;
    }

    const template = await ctx.db.get(session.interviewTemplateId);
    if (!template) return null;

    const props = template.customProperties as InterviewTemplate;
    const state = session.interviewState;

    if (!state) return null;

    const currentPhase = props.phases[state.currentPhaseIndex];
    const currentQuestion = currentPhase?.questions[state.currentQuestionIndex];
    const phaseSummaries = buildPhaseSummaries(props, state.extractedData);
    const memoryCandidates = buildMemoryCandidates(props, state.extractedData);
    const adaptiveSession = currentPhase
      ? buildAdaptiveSessionSummary(props, state, currentPhase)
      : null;
    const activeConsentCheckpointId =
      adaptiveSession?.activeCheckpointId || determineActiveConsentCheckpoint(state);
    const voiceConsentSummary = buildVoiceConsentSummary({
      channel: session.channel,
      activeCheckpointId: activeConsentCheckpointId,
      memoryCandidates,
    });
    const consentCheckpoints = buildConsentCheckpointSummaries({
      state,
      memoryCandidates,
      sourceAttributionPolicy: voiceConsentSummary.sourceAttributionPolicy,
    });

    return {
      phase: currentPhase
        ? {
            phaseId: currentPhase.phaseId,
            phaseName: currentPhase.phaseName,
            introPrompt: currentPhase.introPrompt,
            isRequired: currentPhase.isRequired,
          }
        : null,
      question: currentQuestion
        ? {
            questionId: currentQuestion.questionId,
            promptText: currentQuestion.promptText,
            helpText: currentQuestion.helpText,
            expectedDataType: currentQuestion.expectedDataType,
            validationRules: currentQuestion.validationRules,
          }
        : null,
      extractedData: state.extractedData,
      isComplete: state.isComplete,
      contentDNAId: state.contentDNAId,
      memoryConsent: state.memoryConsent || null,
      sessionLifecycle: state.sessionLifecycle || null,
      phaseSummaries,
      memoryCandidateIds: buildMemoryCandidateIds(memoryCandidates),
      adaptiveSession,
      activeConsentCheckpointId,
      voiceConsentSummary,
      consentCheckpoints,
    };
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * START INTERVIEW
 * Initialize a guided interview session with a template.
 */
export const startInterview = mutation({
  args: {
    sessionId: v.string(),
    agentSessionId: v.optional(v.id("agentSessions")),
    templateId: v.id("objects"),
    organizationId: v.id("organizations"),
    channel: v.optional(v.string()),
    externalContactIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate template
    const template = await ctx.db.get(args.templateId);
    if (!template || template.type !== "interview_template") {
      throw new Error("Interview template not found");
    }

    const props = template.customProperties as InterviewTemplate;
    if (props.status !== "active") {
      throw new Error("Template is not active");
    }

    if (!props.phases || props.phases.length === 0) {
      throw new Error("Template has no phases");
    }

    // Get or validate agent
    const agent = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "org_agent")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!agent) {
      throw new Error("No active agent found for organization");
    }

    // Initialize interview state
    const now = Date.now();
    const initialState: InterviewState = {
      currentPhaseIndex: 0,
      currentQuestionIndex: 0,
      completedPhases: [],
      skippedPhases: [],
      extractedData: {},
      currentFollowUpCount: 0,
      pendingFollowUp: false,
      startedAt: now,
      lastActivityAt: now,
      phaseStartTimes: { [props.phases[0].phaseId]: now },
      isComplete: false,
      sessionLifecycle: buildSessionLifecycle({
        state: "capturing",
        checkpointId: "cp0_capture_notice",
        updatedBy: "system",
        updatedAt: now,
      }),
    };

    let sessionId: Id<"agentSessions">;

    if (args.agentSessionId) {
      // Update existing session to guided mode
      const existingSession = await ctx.db.get(args.agentSessionId);
      if (!existingSession) {
        throw new Error("Session not found");
      }

      await ctx.db.patch(args.agentSessionId, {
        sessionMode: "guided",
        interviewTemplateId: args.templateId,
        interviewState: initialState,
      });

      sessionId = args.agentSessionId;
    } else {
      // Create new guided session
      sessionId = await ctx.db.insert("agentSessions", {
        agentId: agent._id,
        organizationId: args.organizationId,
        channel: args.channel || "interview",
        externalContactIdentifier: args.externalContactIdentifier || `interview_${now}`,
        status: "active",
        sessionMode: "guided",
        interviewTemplateId: args.templateId,
        interviewState: initialState,
        messageCount: 0,
        tokensUsed: 0,
        costUsd: 0,
        startedAt: now,
        lastMessageAt: now,
      });
    }

    // Increment template usage count
    await ctx.scheduler.runAfter(0, getInternal().interviewTemplateOntology.incrementUsageCount, {
      templateId: args.templateId,
    });

    return {
      sessionId,
      firstPhase: props.phases[0].phaseName,
      firstQuestion: props.phases[0].questions[0]?.promptText,
      introPrompt: props.phases[0].introPrompt,
    };
  },
});

/**
 * RESUME INTERVIEW
 * Resume an incomplete interview session.
 */
export const resumeInterview = mutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.sessionMode !== "guided" || !session.interviewTemplateId) {
      throw new Error("Not an interview session");
    }

    const state = session.interviewState;
    if (!state) {
      throw new Error("Interview state not found");
    }

    if (state.isComplete) {
      throw new Error("Interview already completed");
    }

    if (state.sessionLifecycle?.state === "discarded") {
      throw new Error("Interview was discarded and cannot be resumed.");
    }

    const now = Date.now();
    const resumedCheckpoint = determineActiveConsentCheckpoint(state);

    // Update last activity
    const resumedState: InterviewState = {
      ...state,
      lastActivityAt: now,
      sessionLifecycle: buildSessionLifecycle({
        state: "capturing",
        checkpointId: resumedCheckpoint,
        updatedBy: "user",
        updatedAt: now,
      }),
    };

    await ctx.db.patch(args.sessionId, {
      interviewState: resumedState,
      status: "active",
    });

    // Get current context
    const template = await ctx.db.get(session.interviewTemplateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const props = template.customProperties as InterviewTemplate;
    const currentPhase = props.phases[state.currentPhaseIndex];
    const currentQuestion = currentPhase?.questions[state.currentQuestionIndex];

    return {
      sessionId: args.sessionId,
      currentPhase: currentPhase?.phaseName,
      currentQuestion: currentQuestion?.promptText,
      extractedDataCount: Object.keys(resumedState.extractedData).length,
      completedPhases: resumedState.completedPhases.length,
      totalPhases: props.phases.length,
      sessionLifecycle: resumedState.sessionLifecycle,
    };
  },
});

/**
 * PAUSE INTERVIEW SESSION
 * Marks the guided session as resumable without durable memory writes.
 */
export const pauseInterviewSession = mutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.sessionMode !== "guided" || !session.interviewState) {
      throw new Error("Invalid interview session");
    }

    const now = Date.now();
    const state = session.interviewState as InterviewState;
    const pausedState: InterviewState = {
      ...state,
      lastActivityAt: now,
      sessionLifecycle: buildSessionLifecycle({
        state: "resumable_unsaved",
        checkpointId: determineActiveConsentCheckpoint(state),
        updatedAt: now,
        updatedBy: "user",
      }),
    };

    await ctx.db.patch(args.sessionId, {
      interviewState: pausedState,
      status: "active",
    });

    return {
      paused: true,
      sessionId: args.sessionId,
      sessionLifecycle: pausedState.sessionLifecycle,
      memoryConsentStatus: pausedState.memoryConsent?.status || "pending",
    };
  },
});

/**
 * DISCARD INTERVIEW SESSION
 * Explicitly closes the interview without persisting durable memory writes.
 */
export const discardInterviewSession = mutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.sessionMode !== "guided" || !session.interviewState || !session.interviewTemplateId) {
      throw new Error("Invalid interview session");
    }

    const templateObject = await ctx.db.get(session.interviewTemplateId);
    if (!templateObject) {
      throw new Error("Interview template not found");
    }
    const template = templateObject.customProperties as InterviewTemplate;

    const interviewState = session.interviewState as InterviewState;
    const now = Date.now();
    const memoryCandidates = buildMemoryCandidates(template, interviewState.extractedData);
    const memoryCandidateIds = buildMemoryCandidateIds(memoryCandidates);

    await cleanupPersistedContentDNA(ctx, interviewState.contentDNAId as Id<"objects"> | undefined);

    const discardedState = buildDeclinedInterviewState({
      state: interviewState,
      memoryCandidateIds,
      now,
      checkpointId: "cp2_save_decision",
      updatedBy: "user",
    });

    await ctx.db.patch(args.sessionId, {
      interviewState: discardedState,
      status: "closed",
    });

    await emitMemoryConsentTrustEvent(ctx, "trust.memory.consent_decided.v1", {
      organizationId: session.organizationId,
      sessionId: args.sessionId,
      actorType: "user",
      actorId: "interview_user",
      consentDecision: "declined",
      memoryCandidateIds,
    });

    await emitMemoryConsentTrustEvent(ctx, "trust.memory.write_blocked_no_consent.v1", {
      organizationId: session.organizationId,
      sessionId: args.sessionId,
      actorType: "system",
      actorId: "interview_runner",
      consentDecision: "blocked",
      memoryCandidateIds,
    });

    return {
      discarded: true,
      sessionId: args.sessionId,
      memoryCandidateIds,
      memoryCandidateCount: memoryCandidateIds.length,
    };
  },
});

/**
 * CANCEL INTERVIEW SESSION
 * Hard-delete an in-progress guided interview session and all session artifacts.
 * Used by UI "Cancel & Delete" so users can exit without keeping interview state.
 */
export const cancelInterviewSession = mutation({
  args: {
    sessionId: v.string(),
    interviewSessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx, args.sessionId);

    const session = await ctx.db.get(args.interviewSessionId);
    if (!session) {
      return {
        success: true,
        deleted: false,
        reason: "session_not_found" as const,
        deletedMessages: 0,
        deletedTurns: 0,
        deletedEdges: 0,
      };
    }

    if (session.sessionMode !== "guided") {
      throw new Error("Only guided interview sessions can be canceled with delete.");
    }

    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.interviewSessionId))
      .collect();

    const turns = await ctx.db
      .query("agentTurns")
      .withIndex("by_session_created", (q) => q.eq("sessionId", args.interviewSessionId))
      .collect();

    const edges = await ctx.db
      .query("executionEdges")
      .withIndex("by_session_time", (q) => q.eq("sessionId", args.interviewSessionId))
      .collect();

    for (const edge of edges) {
      await ctx.db.delete(edge._id);
    }

    for (const turn of turns) {
      await ctx.db.delete(turn._id);
    }

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(args.interviewSessionId);

    return {
      success: true,
      deleted: true,
      deletedMessages: messages.length,
      deletedTurns: turns.length,
      deletedEdges: edges.length,
    };
  },
});

/**
 * DECIDE MEMORY CONSENT
 * User-facing checkpoint before durable Content DNA persistence.
 */
export const decideMemoryConsent = mutation({
  args: {
    sessionId: v.id("agentSessions"),
    decision: v.union(v.literal("accept"), v.literal("decline")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.sessionMode !== "guided" || !session.interviewState || !session.interviewTemplateId) {
      throw new Error("Invalid interview session");
    }

    if (!session.interviewState.isComplete) {
      throw new Error("Interview must be complete before deciding memory consent.");
    }

    const templateObject = await ctx.db.get(session.interviewTemplateId);
    if (!templateObject) {
      throw new Error("Interview template not found");
    }
    const template = templateObject.customProperties as InterviewTemplate;

    const actorId = "interview_user";

    const interviewState = session.interviewState as InterviewState;
    const now = Date.now();
    const memoryCandidates = buildMemoryCandidates(template, interviewState.extractedData);
    const memoryCandidateIds = buildMemoryCandidateIds(memoryCandidates);
    const promptedAt = interviewState.memoryConsent?.promptedAt || now;

    if (args.decision === "accept") {
      const acceptedState: InterviewState = {
        ...interviewState,
        memoryConsent: {
          status: "accepted",
          consentScope: INTERVIEW_MEMORY_CONSENT_SCOPE,
          consentPromptVersion: INTERVIEW_MEMORY_CONSENT_PROMPT_VERSION,
          memoryCandidateIds,
          promptedAt,
          decidedAt: now,
          decisionSource: "user",
        },
        sessionLifecycle: buildSessionLifecycle({
          state: "saved",
          checkpointId: "cp3_post_save_revoke",
          updatedAt: now,
          updatedBy: "user",
        }),
      };

      await ctx.db.patch(args.sessionId, {
        interviewState: acceptedState,
      });

      await emitMemoryConsentTrustEvent(ctx, "trust.memory.consent_decided.v1", {
        organizationId: session.organizationId,
        sessionId: args.sessionId,
        actorType: "user",
        actorId,
        consentDecision: "accepted",
        memoryCandidateIds,
      });

      const completion = await persistContentDNAFromInterview(ctx, {
        sessionId: args.sessionId,
        session: {
          organizationId: session.organizationId,
          interviewTemplateId: session.interviewTemplateId,
          interviewState: acceptedState,
          channel: session.channel,
        },
        template,
      });

      return {
        decision: "accepted" as const,
        contentDNAId: completion.contentDNAId,
      };
    }

    await cleanupPersistedContentDNA(
      ctx,
      interviewState.contentDNAId as Id<"objects"> | undefined,
    );

    const declinedState = buildDeclinedInterviewState({
      state: interviewState,
      memoryCandidateIds,
      now,
      checkpointId: "cp2_save_decision",
      updatedBy: "user",
      promptedAt,
    });

    await ctx.db.patch(args.sessionId, {
      interviewState: declinedState,
      status: "closed",
    });

    await emitMemoryConsentTrustEvent(ctx, "trust.memory.consent_decided.v1", {
      organizationId: session.organizationId,
      sessionId: args.sessionId,
      actorType: "user",
      actorId,
      consentDecision: "declined",
      memoryCandidateIds,
    });

    await emitMemoryConsentTrustEvent(ctx, "trust.memory.write_blocked_no_consent.v1", {
      organizationId: session.organizationId,
      sessionId: args.sessionId,
      actorType: "system",
      actorId: "interview_runner",
      consentDecision: "blocked",
      memoryCandidateIds,
    });

    return {
      decision: "declined" as const,
      contentDNAId: null,
    };
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * INTERNAL: Get interview context for system prompt injection
 */
export const getInterviewContextInternal = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.sessionMode !== "guided" || !session.interviewTemplateId) {
      return null;
    }

    const template = await ctx.db.get(session.interviewTemplateId);
    if (!template) return null;

    const props = template.customProperties as InterviewTemplate;
    const state = session.interviewState;

    if (!state || state.isComplete) return null;

    const currentPhase = props.phases[state.currentPhaseIndex];
    const currentQuestion = currentPhase?.questions[state.currentQuestionIndex];
    if (!currentPhase || !currentQuestion) return null;
    const adaptiveSession = buildAdaptiveSessionSummary(props, state, currentPhase);
    const memoryCandidates = buildMemoryCandidates(props, state.extractedData);
    const voiceConsentSummary = buildVoiceConsentSummary({
      channel: session.channel,
      activeCheckpointId: adaptiveSession.activeCheckpointId,
      memoryCandidates,
    });

    return {
      // Template config
      interviewerPersonality: props.interviewerPersonality,
      followUpDepth: props.followUpDepth,
      silenceHandling: props.silenceHandling,

      // Current position
      currentPhaseIndex: state.currentPhaseIndex,
      totalPhases: props.phases.length,
      currentQuestionIndex: state.currentQuestionIndex,
      totalQuestionsInPhase: currentPhase.questions.length,
      microSessionLabel: adaptiveSession.microSessionLabel,
      progressivePrompt: adaptiveSession.progressivePrompt,
      activeConsentCheckpointId: voiceConsentSummary.activeCheckpointId,
      voiceCaptureMode: voiceConsentSummary.voiceCaptureMode,
      sourceAttributionPolicy: voiceConsentSummary.sourceAttributionPolicy,

      // Current phase
      phase: {
        phaseId: currentPhase.phaseId,
        phaseName: currentPhase.phaseName,
        introPrompt: currentPhase.introPrompt,
        completionPrompt: currentPhase.completionPrompt,
      },

      // Current question
      question: {
        questionId: currentQuestion.questionId,
        promptText: currentQuestion.promptText,
        helpText: currentQuestion.helpText,
        expectedDataType: currentQuestion.expectedDataType,
        extractionField: currentQuestion.extractionField,
        followUpPrompts: currentQuestion.followUpPrompts,
        validationRules: currentQuestion.validationRules,
      },

      // State
      currentFollowUpCount: state.currentFollowUpCount,
      pendingFollowUp: state.pendingFollowUp,
      extractedData: state.extractedData,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * INTERNAL: Advance interview after processing an answer
 */
export const advanceInterview = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    extractionResults: v.array(
      v.object({
        field: v.string(),
        value: v.any(),
        confidence: v.number(),
        needsFollowUp: v.boolean(),
        followUpReason: v.optional(v.string()),
      })
    ),
    forceAdvance: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.interviewState || !session.interviewTemplateId) {
      return { advanced: false, reason: "Invalid session" };
    }

    const template = await ctx.db.get(session.interviewTemplateId);
    if (!template) {
      return { advanced: false, reason: "Template not found" };
    }

    const props = template.customProperties as InterviewTemplate;
    const state: InterviewState = { ...session.interviewState } as InterviewState;
    const now = Date.now();

    // Merge extracted data
    for (const result of args.extractionResults) {
      if (result.value !== undefined && result.value !== null && result.value !== "") {
        state.extractedData[result.field] = result.value;
      }
    }
    state.lastActivityAt = now;
    state.sessionLifecycle = buildSessionLifecycle({
      state: "capturing",
      checkpointId:
        Object.keys(state.extractedData).length >= ADAPTIVE_MICRO_SESSION_QUESTION_TARGET
          ? "cp1_summary_review"
          : "cp0_capture_notice",
      updatedAt: now,
      updatedBy: "system",
    });

    // Check if any extraction needs follow-up
    const needsFollowUp = args.extractionResults.some(
      (r) => r.needsFollowUp && r.confidence < 0.7
    );

    if (needsFollowUp && !args.forceAdvance && state.currentFollowUpCount < props.followUpDepth) {
      // Stay on current question, request follow-up
      state.currentFollowUpCount++;
      state.pendingFollowUp = true;

      await ctx.db.patch(args.sessionId, { interviewState: state });
      return {
        advanced: false,
        reason: "follow_up_needed",
        followUpReason: args.extractionResults.find((r) => r.needsFollowUp)?.followUpReason,
      };
    }

    // Reset follow-up state
    state.currentFollowUpCount = 0;
    state.pendingFollowUp = false;

    const currentPhase = props.phases[state.currentPhaseIndex];
    const currentPhaseCoverage = buildPhaseCoverageSummary(
      props,
      currentPhase,
      state.extractedData,
    );
    const adaptiveEarlyAdvance = shouldAdvancePhaseEarly({
      template: props,
      phase: currentPhase,
      state,
      extractionResults: args.extractionResults,
    });

    // Try to advance to next question
    if (
      !args.forceAdvance &&
      !adaptiveEarlyAdvance &&
      state.currentQuestionIndex < currentPhase.questions.length - 1
    ) {
      state.currentQuestionIndex++;
      await ctx.db.patch(args.sessionId, { interviewState: state });
      return {
        advanced: true,
        advanceType: "next_question",
        newQuestionIndex: state.currentQuestionIndex,
        adaptiveSession: buildAdaptiveSessionSummary(props, state, currentPhase),
      };
    }

    // Current phase complete - mark it
    if (!state.completedPhases.includes(currentPhase.phaseId)) {
      state.completedPhases.push(currentPhase.phaseId);
    }

    // Try to advance to next phase
    let nextPhaseIndex = state.currentPhaseIndex + 1;

    while (nextPhaseIndex < props.phases.length) {
      const nextPhase = props.phases[nextPhaseIndex];

      // Check skip condition
      if (nextPhase.skipCondition && evaluateSkipCondition(nextPhase.skipCondition, state.extractedData)) {
        state.skippedPhases.push(nextPhase.phaseId);
        nextPhaseIndex++;
        continue;
      }

      // Found next valid phase
      state.currentPhaseIndex = nextPhaseIndex;
      state.currentQuestionIndex = 0;
      state.phaseStartTimes[nextPhase.phaseId] = now;

      await ctx.db.patch(args.sessionId, { interviewState: state });
      return {
        advanced: true,
        advanceType: "next_phase",
        newPhaseIndex: nextPhaseIndex,
        newPhaseName: nextPhase.phaseName,
        phaseIntro: nextPhase.introPrompt,
        previousPhaseCompletion: currentPhase.completionPrompt,
        adaptiveEarlyAdvance,
        phaseCoverage: currentPhaseCoverage,
      };
    }

    // No more phases - check completion criteria
    const canComplete = checkCompletionCriteria(props, state);

    if (canComplete.ready) {
      state.isComplete = true;
      state.completedAt = now;
      const memoryCandidates = buildMemoryCandidates(props, state.extractedData);
      const memoryCandidateIds = buildMemoryCandidateIds(memoryCandidates);
      state.memoryConsent = {
        status: "pending",
        consentScope: INTERVIEW_MEMORY_CONSENT_SCOPE,
        consentPromptVersion: INTERVIEW_MEMORY_CONSENT_PROMPT_VERSION,
        memoryCandidateIds,
        promptedAt: now,
      };
      state.sessionLifecycle = buildSessionLifecycle({
        state: "checkpoint_review",
        checkpointId: "cp1_summary_review",
        updatedAt: now,
        updatedBy: "system",
      });

      await ctx.db.patch(args.sessionId, { interviewState: state });

      await emitMemoryConsentTrustEvent(ctx, "trust.memory.consent_prompted.v1", {
        organizationId: session.organizationId,
        sessionId: args.sessionId,
        actorType: "system",
        actorId: "interview_runner",
        consentDecision: "pending",
        memoryCandidateIds,
      });

      return {
        advanced: true,
        advanceType: "interview_complete",
        extractedData: state.extractedData,
        memoryCandidateIds,
      };
    }

    // Cannot complete - missing required phases
    await ctx.db.patch(args.sessionId, { interviewState: state });
    return {
      advanced: false,
      reason: "completion_blocked",
      missingPhases: canComplete.missingPhases,
    };
  },
});

/**
 * INTERNAL: Complete interview and save Content DNA
 */
export const completeInterview = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.interviewState || !session.interviewTemplateId) {
      throw new Error("Invalid session");
    }

    const state = session.interviewState as InterviewState;
    if (!state.isComplete) {
      throw new Error("Interview not yet complete");
    }

    const template = await ctx.db.get(session.interviewTemplateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const props = template.customProperties as InterviewTemplate;
    const memoryCandidates = buildMemoryCandidates(props, state.extractedData);
    const memoryCandidateIds = buildMemoryCandidateIds(memoryCandidates);
    const consentAccepted = state.memoryConsent?.status === "accepted";

    if (!consentAccepted) {
      await emitMemoryConsentTrustEvent(ctx, "trust.memory.write_blocked_no_consent.v1", {
        organizationId: session.organizationId,
        sessionId: args.sessionId,
        actorType: "system",
        actorId: "interview_runner",
        consentDecision: "blocked",
        memoryCandidateIds,
      });
      throw new Error("Memory consent must be accepted before saving Content DNA.");
    }

    return await persistContentDNAFromInterview(ctx, {
      sessionId: args.sessionId,
      session: {
        organizationId: session.organizationId,
        interviewTemplateId: session.interviewTemplateId,
        interviewState: state,
        channel: session.channel,
      },
      template: props,
    });
  },
});

/**
 * INTERNAL: Skip current phase (agent-initiated)
 */
export const skipPhase = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || !session.interviewState || !session.interviewTemplateId) {
      return { skipped: false, reason: "Invalid session" };
    }

    const template = await ctx.db.get(session.interviewTemplateId);
    if (!template) {
      return { skipped: false, reason: "Template not found" };
    }

    const props = template.customProperties as InterviewTemplate;
    const state: InterviewState = { ...session.interviewState } as InterviewState;

    const currentPhase = props.phases[state.currentPhaseIndex];

    // Cannot skip required phases
    if (currentPhase.isRequired) {
      return { skipped: false, reason: "Cannot skip required phase" };
    }

    // Mark phase as skipped
    state.skippedPhases.push(currentPhase.phaseId);

    // Find next phase
    let nextPhaseIndex = state.currentPhaseIndex + 1;
    while (nextPhaseIndex < props.phases.length) {
      const nextPhase = props.phases[nextPhaseIndex];
      if (nextPhase.skipCondition && evaluateSkipCondition(nextPhase.skipCondition, state.extractedData)) {
        state.skippedPhases.push(nextPhase.phaseId);
        nextPhaseIndex++;
        continue;
      }
      break;
    }

    if (nextPhaseIndex >= props.phases.length) {
      // No more phases
      const canComplete = checkCompletionCriteria(props, state);
      if (canComplete.ready) {
        const now = Date.now();
        state.isComplete = true;
        state.completedAt = now;
        const memoryCandidateIds = buildMemoryCandidateIds(
          buildMemoryCandidates(props, state.extractedData),
        );
        state.memoryConsent = {
          status: "pending",
          consentScope: INTERVIEW_MEMORY_CONSENT_SCOPE,
          consentPromptVersion: INTERVIEW_MEMORY_CONSENT_PROMPT_VERSION,
          memoryCandidateIds,
          promptedAt: now,
        };
        state.sessionLifecycle = buildSessionLifecycle({
          state: "checkpoint_review",
          checkpointId: "cp1_summary_review",
          updatedAt: now,
          updatedBy: "system",
        });

        await emitMemoryConsentTrustEvent(ctx, "trust.memory.consent_prompted.v1", {
          organizationId: session.organizationId,
          sessionId: args.sessionId,
          actorType: "system",
          actorId: "interview_runner",
          consentDecision: "pending",
          memoryCandidateIds,
        });
      }
    } else {
      state.currentPhaseIndex = nextPhaseIndex;
      state.currentQuestionIndex = 0;
      state.phaseStartTimes[props.phases[nextPhaseIndex].phaseId] = Date.now();
    }

    const now = Date.now();
    state.lastActivityAt = now;
    if (!state.isComplete) {
      state.sessionLifecycle = buildSessionLifecycle({
        state: "capturing",
        checkpointId:
          Object.keys(state.extractedData).length >= ADAPTIVE_MICRO_SESSION_QUESTION_TARGET
            ? "cp1_summary_review"
            : "cp0_capture_notice",
        updatedAt: now,
        updatedBy: "system",
      });
    }
    await ctx.db.patch(args.sessionId, { interviewState: state });

    return {
      skipped: true,
      skippedPhase: currentPhase.phaseName,
      nextPhase: nextPhaseIndex < props.phases.length
        ? props.phases[nextPhaseIndex].phaseName
        : null,
      isComplete: state.isComplete,
    };
  },
});

// ============================================================================
// HELPERS
// ============================================================================

function formatExtractedValuePreview(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

function buildMemoryCandidates(
  template: InterviewTemplate,
  extractedData: Record<string, unknown>,
): MemoryCandidate[] {
  const candidates: MemoryCandidate[] = [];

  for (const phase of template.phases) {
    for (const question of phase.questions) {
      const value = extractedData[question.extractionField];
      if (value === undefined || value === null || value === "") {
        continue;
      }

      candidates.push({
        fieldId: question.extractionField,
        label: question.promptText,
        value,
        valuePreview: formatExtractedValuePreview(value),
        phaseId: phase.phaseId,
        phaseName: phase.phaseName,
        questionId: question.questionId,
        questionPrompt: question.promptText,
      });
    }
  }

  return candidates;
}

function buildPhaseSummaries(
  template: InterviewTemplate,
  extractedData: Record<string, unknown>,
): PhaseSummary[] {
  const byPhase = new Map<string, PhaseSummary>();

  for (const candidate of buildMemoryCandidates(template, extractedData)) {
    if (!byPhase.has(candidate.phaseId)) {
      byPhase.set(candidate.phaseId, {
        phaseId: candidate.phaseId,
        phaseName: candidate.phaseName,
        items: [],
      });
    }

    byPhase.get(candidate.phaseId)!.items.push({
      fieldId: candidate.fieldId,
      label: candidate.label,
      valuePreview: candidate.valuePreview,
      questionId: candidate.questionId,
      questionPrompt: candidate.questionPrompt,
    });
  }

  return Array.from(byPhase.values());
}

function buildMemoryCandidateIds(candidates: MemoryCandidate[]): string[] {
  return candidates.map((candidate) => candidate.fieldId);
}

function buildSessionLifecycle(args: {
  state: InterviewSessionLifecycleState;
  checkpointId: ConsentCheckpointId;
  updatedAt: number;
  updatedBy: "system" | "user";
}) {
  return {
    state: args.state,
    checkpointId: args.checkpointId,
    updatedAt: args.updatedAt,
    updatedBy: args.updatedBy,
  };
}

async function cleanupPersistedContentDNA(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  contentDNAId: Id<"objects"> | undefined,
) {
  if (!contentDNAId) {
    return;
  }

  const linksFrom = await ctx.db
    .query("objectLinks")
    .withIndex("by_from_object", (q: any) => q.eq("fromObjectId", contentDNAId))
    .collect();
  const linksTo = await ctx.db
    .query("objectLinks")
    .withIndex("by_to_object", (q: any) => q.eq("toObjectId", contentDNAId))
    .collect();
  const actions = await ctx.db
    .query("objectActions")
    .withIndex("by_object", (q: any) => q.eq("objectId", contentDNAId))
    .collect();

  for (const link of [...linksFrom, ...linksTo]) {
    await ctx.db.delete(link._id);
  }
  for (const action of actions) {
    await ctx.db.delete(action._id);
  }
  await ctx.db.delete(contentDNAId);
}

function buildDeclinedInterviewState(args: {
  state: InterviewState;
  memoryCandidateIds: string[];
  now: number;
  checkpointId: ConsentCheckpointId;
  updatedBy: "system" | "user";
  promptedAt?: number;
}): InterviewState {
  return {
    ...args.state,
    contentDNAId: undefined,
    memoryConsent: {
      status: "declined",
      consentScope: INTERVIEW_MEMORY_CONSENT_SCOPE,
      consentPromptVersion: INTERVIEW_MEMORY_CONSENT_PROMPT_VERSION,
      memoryCandidateIds: args.memoryCandidateIds,
      promptedAt: args.promptedAt || args.state.memoryConsent?.promptedAt || args.now,
      decidedAt: args.now,
      decisionSource: "user",
    },
    sessionLifecycle: buildSessionLifecycle({
      state: "discarded",
      checkpointId: args.checkpointId,
      updatedAt: args.now,
      updatedBy: args.updatedBy,
    }),
  };
}

function calculateAnsweredQuestionCount(
  template: InterviewTemplate,
  state: InterviewState,
): number {
  return state.completedPhases.reduce((sum, phaseId) => {
    const phase = template.phases.find((candidatePhase) => candidatePhase.phaseId === phaseId);
    return sum + (phase?.questions.length || 0);
  }, 0) + state.currentQuestionIndex;
}

function buildRequiredFieldSet(template: InterviewTemplate): Set<string> {
  const requiredFields = new Set<string>();
  for (const field of template.outputSchema?.fields || []) {
    if (field.required) {
      requiredFields.add(field.fieldId);
    }
  }
  return requiredFields;
}

export function buildPhaseCoverageSummary(
  template: InterviewTemplate,
  phase: InterviewTemplate["phases"][number],
  extractedData: Record<string, unknown>,
): PhaseCoverageSummary {
  const requiredFields = buildRequiredFieldSet(template);
  const capturedFieldIds = new Set<string>();
  const missingRequiredFieldIds = new Set<string>();
  let remainingQuestionCount = 0;

  for (const question of phase.questions) {
    const extractedValue = extractedData[question.extractionField];
    const hasValue = extractedValue !== undefined && extractedValue !== null && extractedValue !== "";
    if (hasValue) {
      capturedFieldIds.add(question.extractionField);
    } else {
      remainingQuestionCount++;
      if (requiredFields.has(question.extractionField)) {
        missingRequiredFieldIds.add(question.extractionField);
      }
    }
  }

  return {
    capturedFieldIds: Array.from(capturedFieldIds),
    missingRequiredFieldIds: Array.from(missingRequiredFieldIds),
    capturedFieldCount: capturedFieldIds.size,
    questionCount: phase.questions.length,
    remainingQuestionCount,
  };
}

function determineActiveConsentCheckpoint(state: InterviewState): ConsentCheckpointId {
  if (state.sessionLifecycle?.checkpointId) {
    return state.sessionLifecycle.checkpointId;
  }
  if (state.memoryConsent?.status === "accepted" && state.contentDNAId) {
    return "cp3_post_save_revoke";
  }
  if (state.isComplete) {
    return "cp2_save_decision";
  }
  if (Object.keys(state.extractedData).length >= ADAPTIVE_MICRO_SESSION_QUESTION_TARGET) {
    return "cp1_summary_review";
  }
  return "cp0_capture_notice";
}

function buildSourceAttributionPreview(
  memoryCandidates: MemoryCandidate[],
  maxEntries = 3,
): SourceAttributionSummary[] {
  return memoryCandidates.slice(0, maxEntries).map((candidate) => ({
    fieldId: candidate.fieldId,
    phaseId: candidate.phaseId,
    phaseName: candidate.phaseName,
    questionId: candidate.questionId,
    questionPrompt: candidate.questionPrompt,
    valuePreview: candidate.valuePreview,
  }));
}

function buildSourceAttributionSummary(memoryCandidateCount: number): string {
  if (memoryCandidateCount <= 0) {
    return "No memory candidates captured yet. Attribution policy remains visible before any save decision.";
  }
  if (memoryCandidateCount === 1) {
    return "1 memory candidate is source-attributed by phase, question ID, and prompt text.";
  }
  return `${memoryCandidateCount} memory candidates are source-attributed by phase, question ID, and prompt text.`;
}

function buildVoiceConsentSummary(args: {
  channel: string | undefined;
  activeCheckpointId: ConsentCheckpointId;
  memoryCandidates: MemoryCandidate[];
}): VoiceConsentSummary {
  const memoryCandidateCount = args.memoryCandidates.length;
  const sourceAttributionPreview = buildSourceAttributionPreview(args.memoryCandidates);
  return {
    channel: args.channel || INTERVIEW_TRUST_CHANNEL,
    voiceCaptureMode: "voice_enabled",
    activeCheckpointId: args.activeCheckpointId,
    providerFallbackPolicy:
      "When provider voice capture degrades, browser fallback preserves checkpoint and attribution semantics.",
    sourceAttributionPolicy:
      "At every checkpoint, source attribution shows phase, question ID, and original prompt before save options.",
    sourceAttributionCount: memoryCandidateCount,
    sourceAttributionPreview,
    memoryCandidateCount,
  };
}

function buildConsentCheckpointSummaries(args: {
  state: InterviewState;
  memoryCandidates: MemoryCandidate[];
  sourceAttributionPolicy: string;
}): ConsentCheckpointSummary[] {
  const activeCheckpointId = determineActiveConsentCheckpoint(args.state);
  const checkpointOrder: ConsentCheckpointId[] = [
    "cp0_capture_notice",
    "cp1_summary_review",
    "cp2_save_decision",
    "cp3_post_save_revoke",
  ];
  const activeIndex = checkpointOrder.indexOf(activeCheckpointId);
  const memoryCandidateCount = args.memoryCandidates.length;
  const sourceAttributionCount = args.memoryCandidates.length;
  const sourceAttributionPreview = buildSourceAttributionPreview(args.memoryCandidates);
  const sourceAttributionSummary = buildSourceAttributionSummary(memoryCandidateCount);

  const withStatus = (
    checkpointId: ConsentCheckpointId,
    title: string,
    description: string,
  ): ConsentCheckpointSummary => {
    const checkpointIndex = checkpointOrder.indexOf(checkpointId);
    const status = checkpointIndex < activeIndex
      ? "complete"
      : checkpointIndex === activeIndex
        ? "active"
        : "pending";
    return {
      checkpointId,
      title,
      description,
      status,
      sourceAttributionVisible: true,
      sourceAttributionPolicy: args.sourceAttributionPolicy,
      sourceAttributionSummary,
      sourceAttributionCount,
      sourceAttributionPreview,
      memoryCandidateCount,
    };
  };

  return [
    withStatus(
      "cp0_capture_notice",
      "Capture Notice",
      "Voice and text answers stay transient until explicit save consent is accepted.",
    ),
    withStatus(
      "cp1_summary_review",
      "Adaptive Summary Review",
      "Review high-signal memory candidates with source attribution before save.",
    ),
    withStatus(
      "cp2_save_decision",
      "Save Decision",
      "Choose explicitly whether to persist Content DNA memory.",
    ),
    withStatus(
      "cp3_post_save_revoke",
      "Post-Save Revoke",
      "Saved memory remains revocable with source-aware impact visibility.",
    ),
  ];
}

function buildProgressivePromptForPhase(
  phase: InterviewTemplate["phases"][number],
  coverage: PhaseCoverageSummary,
): string {
  if (coverage.missingRequiredFieldIds.length > 0) {
    const remainingRequiredPrompts = phase.questions
      .filter((question) => coverage.missingRequiredFieldIds.includes(question.extractionField))
      .map((question) => question.promptText);
    return remainingRequiredPrompts.length > 0
      ? `Capture required trust details next: ${remainingRequiredPrompts.join(" | ")}`
      : "Capture required trust details before advancing.";
  }

  if (coverage.remainingQuestionCount <= 0) {
    return "Required trust capture for this phase is complete. Advance when signal quality is sufficient.";
  }

  if (coverage.capturedFieldCount === 0) {
    return "Start with one concrete answer; this micro-session adapts follow-ups from your signal quality.";
  }

  if (coverage.remainingQuestionCount === 1) {
    return "One refinement prompt remains. Answer only if it improves trust clarity.";
  }

  return `${coverage.remainingQuestionCount} prompts remain. Keep this micro-session high-signal and concise.`;
}

function buildAdaptiveSessionSummary(
  template: InterviewTemplate,
  state: InterviewState,
  phase: InterviewTemplate["phases"][number],
): AdaptiveSessionSummary {
  const totalQuestions = template.phases.reduce(
    (sum, templatePhase) => sum + templatePhase.questions.length,
    0,
  );
  const answeredQuestions = calculateAnsweredQuestionCount(template, state);
  const phaseCoverage = buildPhaseCoverageSummary(template, phase, state.extractedData);
  const activeCheckpointId = determineActiveConsentCheckpoint(state);
  const totalMicroSessions = Math.max(
    1,
    Math.ceil(totalQuestions / ADAPTIVE_MICRO_SESSION_QUESTION_TARGET),
  );
  const currentMicroSession = Math.max(
    1,
    Math.min(
      totalMicroSessions,
      Math.floor(answeredQuestions / ADAPTIVE_MICRO_SESSION_QUESTION_TARGET) + 1,
    ),
  );

  return {
    microSessionLabel: `Micro-session ${currentMicroSession} of ${totalMicroSessions}`,
    progressivePrompt: buildProgressivePromptForPhase(phase, phaseCoverage),
    phaseCoverage,
    activeCheckpointId,
  };
}

export function shouldAdvancePhaseEarly(args: {
  template: InterviewTemplate;
  phase: InterviewTemplate["phases"][number];
  state: InterviewState;
  extractionResults: Array<{
    confidence: number;
    needsFollowUp: boolean;
  }>;
}): boolean {
  const phaseCoverage = buildPhaseCoverageSummary(
    args.template,
    args.phase,
    args.state.extractedData,
  );
  const minimumSignalCount = Math.min(
    ADAPTIVE_MICRO_SESSION_QUESTION_TARGET,
    args.phase.questions.length,
  );

  if (phaseCoverage.capturedFieldCount < minimumSignalCount) {
    return false;
  }
  if (phaseCoverage.remainingQuestionCount <= 0) {
    return false;
  }
  if (phaseCoverage.missingRequiredFieldIds.length > 0) {
    return false;
  }
  if (args.extractionResults.some((result) => result.needsFollowUp)) {
    return false;
  }

  const strongestConfidence = args.extractionResults.reduce(
    (maxConfidence, result) => Math.max(maxConfidence, result.confidence),
    0,
  );
  return strongestConfidence >= ADAPTIVE_EARLY_ADVANCE_CONFIDENCE;
}

const ONBOARDING_CORE_MEMORY_FIELD_MAPPINGS: Array<{
  fieldId: string;
  type: DistilledCoreMemory["type"];
  title: string;
}> = [
  {
    fieldId: "coreMemoryIdentityAnchor",
    type: "identity",
    title: "Brand Promise Anchor",
  },
  {
    fieldId: "coreMemoryBoundaryAnchor",
    type: "boundary",
    title: "Escalation Boundary Anchor",
  },
  {
    fieldId: "coreMemoryEmpathyAnchor",
    type: "empathy",
    title: "Empathy Anchor",
  },
];

function normalizeCoreMemoryNarrative(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  return normalized;
}

export function distillOnboardingCoreMemories(
  template: InterviewTemplate,
  extractedData: Record<string, unknown>,
  generatedAt: number,
): CoreMemoryDistillationBundle {
  const memories: DistilledCoreMemory[] = [];

  for (const mapping of ONBOARDING_CORE_MEMORY_FIELD_MAPPINGS) {
    const narrative = normalizeCoreMemoryNarrative(extractedData[mapping.fieldId]);
    if (!narrative) {
      continue;
    }

    memories.push({
      memoryId: `onboarding_${mapping.fieldId}`,
      type: mapping.type,
      title: mapping.title,
      narrative,
      source: "onboarding_story",
      immutable: true,
      immutableReason: "onboarding_anchor",
      sourceFieldId: mapping.fieldId,
    });
  }

  return {
    generatedAt,
    sourceTemplateName: template.templateName,
    memories,
  };
}

function toTrustArtifactEntry(candidate: MemoryCandidate): TrustArtifactEntry {
  return {
    fieldId: candidate.fieldId,
    label: candidate.label,
    valuePreview: candidate.valuePreview,
    phaseId: candidate.phaseId,
    phaseName: candidate.phaseName,
    questionId: candidate.questionId,
    questionPrompt: candidate.questionPrompt,
  };
}

function uniqueTrustArtifactEntries(entries: TrustArtifactEntry[]): TrustArtifactEntry[] {
  const seen = new Set<string>();
  const output: TrustArtifactEntry[] = [];

  for (const entry of entries) {
    const key = `${entry.phaseId}:${entry.questionId}:${entry.fieldId}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(entry);
  }

  return output;
}

type TrustArtifactFacet = "identity" | "guardrails" | "handoff" | "drift";

const TRUST_ARTIFACT_FACET_KEYWORDS: Record<TrustArtifactFacet, string[]> = {
  identity: [
    "identity",
    "anchor",
    "mission",
    "promise",
    "persona",
    "voice",
    "north star",
    "brand",
    "mandate",
  ],
  guardrails: [
    "guardrail",
    "policy",
    "non-negotiable",
    "nonnegotiable",
    "approval",
    "blocked",
    "prohibited",
    "red line",
    "immutable",
    "safety",
    "override",
  ],
  handoff: [
    "handoff",
    "escalation",
    "escalate",
    "owner",
    "specialist",
    "route",
    "context packet",
    "context envelope",
    "quality gate",
    "incident sla",
  ],
  drift: [
    "drift",
    "signal",
    "monitor",
    "review cadence",
    "rollback",
    "retraining",
    "regression",
    "correction",
    "recovery",
    "degrade",
  ],
};

function collectFacetEntries(
  candidates: MemoryCandidate[],
  facet: TrustArtifactFacet,
): TrustArtifactEntry[] {
  const keywords = TRUST_ARTIFACT_FACET_KEYWORDS[facet];

  return uniqueTrustArtifactEntries(
    candidates
      .filter((candidate) => {
        const haystack = [
          candidate.fieldId,
          candidate.label,
          candidate.questionPrompt,
          candidate.phaseId,
          candidate.phaseName,
        ]
          .join(" ")
          .toLowerCase();

        return keywords.some((keyword) => haystack.includes(keyword));
      })
      .map(toTrustArtifactEntry),
  );
}

function buildFallbackEntry(
  fieldId: string,
  label: string,
  valuePreview: string,
): TrustArtifactEntry {
  return {
    fieldId,
    label,
    valuePreview,
    phaseId: "system",
    phaseName: "System Generated",
    questionId: "system_generated",
    questionPrompt: label,
  };
}

function selectEntriesWithFallback(
  primary: TrustArtifactEntry[],
  fallback: TrustArtifactEntry[],
  maxCount: number,
  fallbackFieldId: string,
  fallbackLabel: string,
  fallbackMessage: string,
): TrustArtifactEntry[] {
  const combined = uniqueTrustArtifactEntries([...primary, ...fallback]).slice(0, maxCount);
  if (combined.length > 0) {
    return combined;
  }

  return [buildFallbackEntry(fallbackFieldId, fallbackLabel, fallbackMessage)];
}

function buildTrustArtifactsBundle(
  template: InterviewTemplate,
  candidates: MemoryCandidate[],
  generatedAt: number,
): TrustArtifactsBundle {
  const fallbackPool = uniqueTrustArtifactEntries(candidates.map(toTrustArtifactEntry));

  const identityAnchors = selectEntriesWithFallback(
    collectFacetEntries(candidates, "identity"),
    fallbackPool,
    6,
    "fallback_identity_anchor",
    "Identity Anchor",
    "No explicit identity anchor captured; review template outputs before deployment.",
  );
  const guardrails = selectEntriesWithFallback(
    collectFacetEntries(candidates, "guardrails"),
    fallbackPool,
    6,
    "fallback_guardrail",
    "Guardrail Boundary",
    "No explicit guardrail captured; define policy boundaries before enabling autonomy.",
  );
  const handoffBoundaries = selectEntriesWithFallback(
    collectFacetEntries(candidates, "handoff"),
    fallbackPool,
    6,
    "fallback_handoff_boundary",
    "Handoff Boundary",
    "No explicit handoff boundary captured; define escalation ownership before launch.",
  );
  const driftCues = selectEntriesWithFallback(
    collectFacetEntries(candidates, "drift"),
    fallbackPool,
    6,
    "fallback_drift_cue",
    "Drift Cue",
    "No explicit drift cue captured; define review cadence to prevent silent trust erosion.",
  );

  const baseCard = (
    cardId: "soul_card" | "guardrails_card" | "team_charter",
    title: string,
    summary: string,
  ): TrustArtifactCard => ({
    cardId,
    title,
    summary,
    identityAnchors,
    guardrails,
    handoffBoundaries,
    driftCues,
  });

  return {
    version: INTERVIEW_TRUST_ARTIFACTS_VERSION,
    generatedAt,
    sourceTemplateName: template.templateName,
    soulCard: baseCard(
      "soul_card",
      "Soul Card",
      "Identity anchors and trust posture extracted from the interview session.",
    ),
    guardrailsCard: baseCard(
      "guardrails_card",
      "Guardrails Card",
      "Operational boundaries and approval expectations required for safe execution.",
    ),
    teamCharter: baseCard(
      "team_charter",
      "Team Charter",
      "Handoff expectations and ownership cues for coordinated multi-agent operations.",
    ),
    memoryLedger: {
      cardId: "memory_ledger",
      title: "Memory Ledger",
      summary: `${candidates.length} consented memory entries with source attribution.`,
      identityAnchors,
      guardrails,
      handoffBoundaries,
      driftCues,
      consentScope: INTERVIEW_MEMORY_CONSENT_SCOPE,
      consentDecision: "accepted",
      consentPromptVersion: INTERVIEW_MEMORY_CONSENT_PROMPT_VERSION,
      ledgerEntries:
        fallbackPool.length > 0
          ? fallbackPool
          : [buildFallbackEntry("fallback_memory_ledger", "Memory Ledger Entry", "No memory entries were captured.")],
    },
  };
}

async function insertTrustEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  eventName: TrustEventName,
  payload: TrustEventPayload,
) {
  const validation = validateTrustEventPayload(eventName, payload);
  await ctx.db.insert("aiTrustEvents", {
    event_name: eventName,
    payload,
    schema_validation_status: validation.ok ? "passed" : "failed",
    schema_errors: validation.ok ? undefined : validation.errors,
    created_at: Date.now(),
  });
}

async function emitMemoryConsentTrustEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  eventName: TrustEventName,
  args: {
    organizationId: Id<"organizations">;
    sessionId: Id<"agentSessions">;
    actorType: "user" | "system";
    actorId: string;
    consentDecision: "pending" | "accepted" | "declined" | "blocked";
    memoryCandidateIds: string[];
  },
) {
  const occurredAt = Date.now();
  await insertTrustEvent(ctx, eventName, {
    event_id: `${eventName}:${args.sessionId}:${occurredAt}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: occurredAt,
    org_id: args.organizationId,
    mode: "lifecycle",
    channel: INTERVIEW_TRUST_CHANNEL,
    session_id: args.sessionId,
    actor_type: args.actorType,
    actor_id: args.actorId,
    consent_scope: INTERVIEW_MEMORY_CONSENT_SCOPE,
    consent_decision: args.consentDecision,
    memory_candidate_ids: args.memoryCandidateIds,
    consent_prompt_version: INTERVIEW_MEMORY_CONSENT_PROMPT_VERSION,
  });
}

async function persistContentDNAFromInterview(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    sessionId: Id<"agentSessions">;
    session: {
      organizationId: Id<"organizations">;
      interviewTemplateId: Id<"objects">;
      interviewState: InterviewState;
      channel: string;
    };
    template: InterviewTemplate;
  },
) {
  const { sessionId, session, template } = args;
  const state = session.interviewState;
  const now = Date.now();

  if (state.contentDNAId) {
    return {
      contentDNAId: state.contentDNAId,
      extractedFieldCount: Object.keys(state.extractedData).length,
      durationMinutes: Math.round((now - state.startedAt) / 60000),
    };
  }

  const memoryCandidates = buildMemoryCandidates(template, state.extractedData);
  const memoryCandidateIds = buildMemoryCandidateIds(memoryCandidates);
  const voiceConsentSummary = buildVoiceConsentSummary({
    channel: session.channel,
    activeCheckpointId: "cp3_post_save_revoke",
    memoryCandidates,
  });
  const trustArtifacts = buildTrustArtifactsBundle(template, memoryCandidates, now);
  const coreMemoryDistillation = distillOnboardingCoreMemories(
    template,
    state.extractedData,
    now
  );
  const trustArtifactTypes = ["soul_card", "guardrails_card", "team_charter", "memory_ledger"] as const;

  const contentDNAId = await ctx.db.insert("objects", {
    organizationId: session.organizationId,
    type: "content_profile",
    subtype: "interview_extracted",
    name: `Content DNA - ${new Date(now).toISOString().split("T")[0]}`,
    description: `Extracted from interview using template: ${template.templateName}`,
    status: "active",
    customProperties: {
      extractedData: state.extractedData,
      sourceTemplateId: session.interviewTemplateId,
      sourceSessionId: sessionId,
      extractedAt: now,
      schema: template.outputSchema,
      memoryConsent: {
        scope: INTERVIEW_MEMORY_CONSENT_SCOPE,
        decision: "accepted",
        decidedAt: now,
        candidateIds: memoryCandidateIds,
        promptVersion: INTERVIEW_MEMORY_CONSENT_PROMPT_VERSION,
      },
      voiceConsentSummary,
      coreMemoryDistillation,
      trustArtifacts,
      sourceAttribution: memoryCandidates.map((candidate) => ({
        fieldId: candidate.fieldId,
        phaseId: candidate.phaseId,
        phaseName: candidate.phaseName,
        questionId: candidate.questionId,
        questionPrompt: candidate.questionPrompt,
      })),
    },
    createdAt: now,
    updatedAt: now,
  });

  await ctx.db.insert("objectLinks", {
    organizationId: session.organizationId,
    fromObjectId: contentDNAId,
    toObjectId: session.interviewTemplateId,
    linkType: "extracted_from_template",
    createdAt: now,
  });

  const updatedState: InterviewState = {
    ...state,
    contentDNAId,
    sessionLifecycle: state.sessionLifecycle || buildSessionLifecycle({
      state: "saved",
      checkpointId: "cp3_post_save_revoke",
      updatedAt: now,
      updatedBy: "system",
    }),
  };

  await ctx.db.patch(sessionId, {
    interviewState: updatedState,
    status: "closed",
  });

  await ctx.db.insert("objectActions", {
    organizationId: session.organizationId,
    objectId: contentDNAId,
    actionType: "interview_completed",
    actionData: {
      sessionId,
      templateId: session.interviewTemplateId,
      templateName: template.templateName,
      durationMinutes: Math.round((now - state.startedAt) / 60000),
      extractedFieldCount: Object.keys(state.extractedData).length,
      consentScope: INTERVIEW_MEMORY_CONSENT_SCOPE,
      consentPromptVersion: INTERVIEW_MEMORY_CONSENT_PROMPT_VERSION,
      trustArtifactTypes,
    },
    performedAt: now,
  });

  await insertTrustEvent(ctx, "trust.brain.content_dna.composed.v1", {
    event_id: `trust.brain.content_dna.composed.v1:${sessionId}:${now}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: now,
    org_id: session.organizationId,
    mode: "lifecycle",
    channel: session.channel || INTERVIEW_TRUST_CHANNEL,
    session_id: sessionId,
    actor_type: "system",
    actor_id: "interview_runner",
    content_profile_id: contentDNAId,
    content_profile_version: String(template.version),
    source_object_ids: [sessionId, session.interviewTemplateId],
    artifact_types: ["content_profile", ...trustArtifactTypes, "memory_consent_snapshot"],
  });

  await insertTrustEvent(ctx, "trust.brain.content_dna.source_linked.v1", {
    event_id: `trust.brain.content_dna.source_linked.v1:${sessionId}:${now}`,
    event_version: TRUST_EVENT_TAXONOMY_VERSION,
    occurred_at: now,
    org_id: session.organizationId,
    mode: "lifecycle",
    channel: session.channel || INTERVIEW_TRUST_CHANNEL,
    session_id: sessionId,
    actor_type: "system",
    actor_id: "interview_runner",
    content_profile_id: contentDNAId,
    content_profile_version: String(template.version),
    source_object_ids: [sessionId, session.interviewTemplateId],
    artifact_types: ["template_link"],
  });

  return {
    contentDNAId,
    extractedFieldCount: Object.keys(state.extractedData).length,
    durationMinutes: Math.round((now - state.startedAt) / 60000),
    trustArtifactTypes: [...trustArtifactTypes],
  };
}

/**
 * Evaluate a skip condition against extracted data
 */
function evaluateSkipCondition(
  condition: SkipCondition,
  extractedData: Record<string, unknown>
): boolean {
  const value = extractedData[condition.field];

  switch (condition.operator) {
    case "equals":
      return value === condition.value;
    case "contains":
      return typeof value === "string" && value.includes(String(condition.value));
    case "not_empty":
      return value !== undefined && value !== null && value !== "";
    case "empty":
      return value === undefined || value === null || value === "";
    case "greater_than":
      return typeof value === "number" && value > Number(condition.value);
    case "less_than":
      return typeof value === "number" && value < Number(condition.value);
    default:
      return false;
  }
}

/**
 * Check if interview meets completion criteria
 */
function checkCompletionCriteria(
  template: InterviewTemplate,
  state: InterviewState
): { ready: boolean; missingPhases: string[] } {
  const { completionCriteria } = template;

  // Check minimum phases completed
  const completedCount = state.completedPhases.length;
  if (completedCount < completionCriteria.minPhasesCompleted) {
    return {
      ready: false,
      missingPhases: [`Need ${completionCriteria.minPhasesCompleted - completedCount} more phases`],
    };
  }

  // Check required phases
  const missingRequired = completionCriteria.requiredPhaseIds.filter(
    (phaseId) => !state.completedPhases.includes(phaseId)
  );

  if (missingRequired.length > 0) {
    const missingNames = missingRequired.map((id) => {
      const phase = template.phases.find((p) => p.phaseId === id);
      return phase?.phaseName || id;
    });
    return { ready: false, missingPhases: missingNames };
  }

  return { ready: true, missingPhases: [] };
}

/**
 * Build interview context for system prompt injection
 * Used by agentExecution.ts when processing guided session messages
 */
// ============================================================================
// FRONTEND ACTION: Submit Interview Answer
// ============================================================================

/**
 * SUBMIT INTERVIEW ANSWER
 * Called by the frontend InterviewRunner component to submit user answers.
 * Processes through LLM, extracts data, and advances the interview.
 */
export const submitInterviewAnswer = action({
  args: {
    sessionId: v.id("agentSessions"),
    answer: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    response?: string;
    advanceResult?: {
      advanced: boolean;
      advanceType?: string;
      isComplete?: boolean;
    };
    error?: string;
  }> => {
    // 1. Load session and validate
    const session = await ctx.runQuery(getInternal().ai.interviewRunner.getSessionForAnswer, {
      sessionId: args.sessionId,
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.sessionMode !== "guided") {
      return { success: false, error: "Not an interview session" };
    }

    // 2. Get interview context for prompt building
    const interviewContext = await ctx.runQuery(
      getInternal().ai.interviewRunner.getInterviewContextInternal,
      { sessionId: args.sessionId }
    );

    if (!interviewContext) {
      return { success: false, error: "Interview context not found" };
    }

    // 3. Build system prompt with interview context
    const systemPrompt = buildInterviewPromptContext(interviewContext);

    // 4. Load recent conversation history
    const history = await ctx.runQuery(getInternal().ai.agentSessions.getSessionMessages, {
      sessionId: args.sessionId,
      limit: 10,
    });

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history as Array<{ role: string; content: string }>) {
      messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }

    messages.push({ role: "user", content: args.answer });

    // 5. Call LLM
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { success: false, error: "OpenRouter API key not configured" };
    }

    const { OpenRouterClient } = await import("./openrouter");
    const client = new OpenRouterClient(apiKey);

    const model = "anthropic/claude-sonnet-4-20250514";

    const response = await client.chatCompletion({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const choice = response.choices?.[0];
    if (!choice) {
      return { success: false, error: "No response from LLM" };
    }

    const assistantContent = choice.message?.content || "";

    // 6. Save messages
    await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
      sessionId: args.sessionId,
      role: "user",
      content: args.answer,
    });

    await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
      sessionId: args.sessionId,
      role: "assistant",
      content: assistantContent,
    });

    // 7. Parse extraction results from response
    const extractionResults = parseInterviewExtractionResults(assistantContent);

    // 8. Advance interview if we got extractions
    let advanceResult = null;
    if (extractionResults.length > 0) {
      advanceResult = await ctx.runMutation(getInternal().ai.interviewRunner.advanceInterview, {
        sessionId: args.sessionId,
        extractionResults,
      });
    }

    return {
      success: true,
      response: assistantContent,
      advanceResult: advanceResult ? {
        advanced: advanceResult.advanced,
        advanceType: advanceResult.advanceType,
        isComplete: advanceResult.advanceType === "interview_complete",
      } : undefined,
    };
  },
});

/**
 * Parse extraction results from LLM response.
 * Looks for ```extraction code blocks containing JSON.
 */
function parseInterviewExtractionResults(content: string): Array<{
  field: string;
  value: unknown;
  confidence: number;
  needsFollowUp: boolean;
  followUpReason?: string;
}> {
  const results: Array<{
    field: string;
    value: unknown;
    confidence: number;
    needsFollowUp: boolean;
    followUpReason?: string;
  }> = [];

  const extractionBlockRegex = /```extraction\s*([\s\S]*?)```/gi;
  let match;

  while ((match = extractionBlockRegex.exec(content)) !== null) {
    const jsonContent = match[1].trim();
    try {
      const parsed = JSON.parse(jsonContent);
      const extractions = Array.isArray(parsed) ? parsed : [parsed];

      for (const extraction of extractions) {
        if (extraction.field && extraction.value !== undefined) {
          results.push({
            field: extraction.field,
            value: extraction.value,
            confidence: extraction.confidence ?? 0.8,
            needsFollowUp: extraction.needsFollowUp ?? false,
            followUpReason: extraction.followUpReason,
          });
        }
      }
    } catch {
      console.warn("[InterviewRunner] Failed to parse extraction block:", jsonContent);
    }
  }

  return results;
}

// ============================================================================
// INTERNAL QUERY: Get session for answer submission
// ============================================================================

export const getSessionForAnswer = internalQuery({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// ============================================================================
// PROMPT BUILDER
// ============================================================================

export function buildInterviewPromptContext(context: {
  interviewerPersonality: string;
  followUpDepth: number;
  silenceHandling: string;
  currentPhaseIndex: number;
  totalPhases: number;
  currentQuestionIndex: number;
  totalQuestionsInPhase: number;
  microSessionLabel?: string;
  progressivePrompt?: string;
  activeConsentCheckpointId?: string;
  voiceCaptureMode?: "voice_enabled";
  sourceAttributionPolicy?: string;
  phase: {
    phaseId: string;
    phaseName: string;
    introPrompt?: string;
    completionPrompt: string;
  };
  question: {
    questionId: string;
    promptText: string;
    helpText?: string;
    expectedDataType: string;
    extractionField: string;
    followUpPrompts?: string[];
    validationRules?: Record<string, unknown>;
  };
  currentFollowUpCount: number;
  pendingFollowUp: boolean;
  extractedData: Record<string, unknown>;
}): string {
  const parts: string[] = [];

  parts.push("=== INTERVIEW MODE ===");
  parts.push(`You are conducting a structured interview. ${context.interviewerPersonality}`);
  parts.push("");

  // Progress
  parts.push(`Progress: Phase ${context.currentPhaseIndex + 1}/${context.totalPhases} - "${context.phase.phaseName}"`);
  parts.push(`Question ${context.currentQuestionIndex + 1}/${context.totalQuestionsInPhase}`);
  if (context.microSessionLabel) {
    parts.push(`Adaptive pacing: ${context.microSessionLabel}`);
  }
  if (context.progressivePrompt) {
    parts.push(`Progressive focus: ${context.progressivePrompt}`);
  }
  if (context.activeConsentCheckpointId) {
    parts.push(`Active consent checkpoint: ${context.activeConsentCheckpointId}`);
  }
  if (context.voiceCaptureMode) {
    parts.push(`Voice capture mode: ${context.voiceCaptureMode}`);
  }
  if (context.sourceAttributionPolicy) {
    parts.push(`Source attribution policy: ${context.sourceAttributionPolicy}`);
  }
  parts.push("");

  // Current question
  parts.push("CURRENT QUESTION TO ASK:");
  parts.push(`"${context.question.promptText}"`);

  if (context.question.helpText) {
    parts.push(`(Help text if user needs clarification: ${context.question.helpText})`);
  }

  parts.push("");
  parts.push(`Expected response type: ${context.question.expectedDataType}`);
  parts.push(`Extract answer to field: "${context.question.extractionField}"`);
  parts.push("");
  parts.push("Message quality rules:");
  parts.push("- Ask exactly one question in the user-facing text.");
  parts.push("- Do not bundle multiple questions together.");
  parts.push("- If a CTA/link is provided, include at most one follow-up question.");

  // Follow-up handling
  if (context.pendingFollowUp && context.question.followUpPrompts?.length) {
    parts.push("");
    parts.push("The previous answer was brief. Use one of these follow-up prompts:");
    context.question.followUpPrompts.forEach((prompt, i) => {
      parts.push(`  ${i + 1}. "${prompt}"`);
    });
  }

  // Validation
  if (context.question.validationRules) {
    const rules = context.question.validationRules;
    const ruleDescriptions: string[] = [];
    if (rules.minLength) ruleDescriptions.push(`min ${rules.minLength} chars`);
    if (rules.maxLength) ruleDescriptions.push(`max ${rules.maxLength} chars`);
    if (rules.options) ruleDescriptions.push(`choices: ${(rules.options as string[]).join(", ")}`);
    if (ruleDescriptions.length > 0) {
      parts.push(`Validation: ${ruleDescriptions.join(", ")}`);
    }
  }

  // Silence handling
  parts.push("");
  parts.push(`If user seems stuck: ${context.silenceHandling}`);

  // Extraction instruction
  parts.push("");
  parts.push("IMPORTANT: After the user responds, include an extraction block in your response:");
  parts.push("```extraction");
  parts.push(JSON.stringify({
    field: context.question.extractionField,
    value: "<extracted value>",
    confidence: 0.9,
    needsFollowUp: false,
  }, null, 2));
  parts.push("```");

  // Already extracted data summary
  const extractedCount = Object.keys(context.extractedData).length;
  if (extractedCount > 0) {
    parts.push("");
    parts.push(`(${extractedCount} fields already extracted from previous questions)`);
  }

  parts.push("=== END INTERVIEW MODE ===");

  return parts.join("\n");
}
