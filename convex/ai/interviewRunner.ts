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
import type {
  InterviewTemplate,
  InterviewPhase,
  InterviewQuestion,
  InterviewState,
  InterviewProgress,
  ExtractionResult,
  SkipCondition,
} from "../schemas/interviewSchemas";

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
    const state = session.interviewState;

    if (!state) {
      return null;
    }

    // Calculate progress
    const currentPhase = props.phases[state.currentPhaseIndex];
    const totalQuestions = props.phases.reduce((sum, p) => sum + p.questions.length, 0);
    const answeredQuestions = state.completedPhases.reduce((sum, phaseId) => {
      const phase = props.phases.find((p) => p.phaseId === phaseId);
      return sum + (phase?.questions.length || 0);
    }, 0) + state.currentQuestionIndex;

    const percentComplete = totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;

    // Estimate remaining time
    const remainingPhases = props.phases.slice(state.currentPhaseIndex);
    const estimatedMinutesRemaining = remainingPhases.reduce(
      (sum, p) => sum + p.estimatedMinutes,
      0
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

    // Update last activity
    await ctx.db.patch(args.sessionId, {
      interviewState: {
        ...state,
        lastActivityAt: Date.now(),
      },
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
      extractedDataCount: Object.keys(state.extractedData).length,
      completedPhases: state.completedPhases.length,
      totalPhases: props.phases.length,
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
    const state = { ...session.interviewState };
    const now = Date.now();

    // Merge extracted data
    for (const result of args.extractionResults) {
      if (result.value !== undefined && result.value !== null && result.value !== "") {
        state.extractedData[result.field] = result.value;
      }
    }
    state.lastActivityAt = now;

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

    // Try to advance to next question
    if (state.currentQuestionIndex < currentPhase.questions.length - 1) {
      state.currentQuestionIndex++;
      await ctx.db.patch(args.sessionId, { interviewState: state });
      return {
        advanced: true,
        advanceType: "next_question",
        newQuestionIndex: state.currentQuestionIndex,
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
      };
    }

    // No more phases - check completion criteria
    const canComplete = checkCompletionCriteria(props, state);

    if (canComplete.ready) {
      state.isComplete = true;
      state.completedAt = now;

      await ctx.db.patch(args.sessionId, { interviewState: state });

      return {
        advanced: true,
        advanceType: "interview_complete",
        extractedData: state.extractedData,
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

    const state = session.interviewState;
    if (!state.isComplete) {
      throw new Error("Interview not yet complete");
    }

    const template = await ctx.db.get(session.interviewTemplateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const props = template.customProperties as InterviewTemplate;

    // Create Content DNA object
    const contentDNAId = await ctx.db.insert("objects", {
      organizationId: session.organizationId,
      type: "content_profile",
      subtype: "interview_extracted",
      name: `Content DNA - ${new Date().toISOString().split("T")[0]}`,
      description: `Extracted from interview using template: ${props.templateName}`,
      status: "active",
      customProperties: {
        extractedData: state.extractedData,
        sourceTemplateId: session.interviewTemplateId,
        sourceSessionId: args.sessionId,
        extractedAt: Date.now(),
        schema: props.outputSchema,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Link Content DNA to session
    await ctx.db.insert("objectLinks", {
      organizationId: session.organizationId,
      fromObjectId: contentDNAId,
      toObjectId: session.interviewTemplateId,
      linkType: "extracted_from_template",
      createdAt: Date.now(),
    });

    // Update session with Content DNA ID
    const updatedState: InterviewState = {
      ...state,
      contentDNAId: contentDNAId,
    };

    await ctx.db.patch(args.sessionId, {
      interviewState: updatedState,
      status: "closed",
    });

    // Log completion
    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: contentDNAId,
      actionType: "interview_completed",
      actionData: {
        sessionId: args.sessionId,
        templateId: session.interviewTemplateId,
        templateName: props.templateName,
        durationMinutes: Math.round((Date.now() - state.startedAt) / 60000),
        extractedFieldCount: Object.keys(state.extractedData).length,
      },
      performedAt: Date.now(),
    });

    return {
      contentDNAId,
      extractedFieldCount: Object.keys(state.extractedData).length,
      durationMinutes: Math.round((Date.now() - state.startedAt) / 60000),
    };
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
    const state = { ...session.interviewState };

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
        state.isComplete = true;
        state.completedAt = Date.now();
      }
    } else {
      state.currentPhaseIndex = nextPhaseIndex;
      state.currentQuestionIndex = 0;
      state.phaseStartTimes[props.phases[nextPhaseIndex].phaseId] = Date.now();
    }

    state.lastActivityAt = Date.now();
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

      // 9. If interview complete, save Content DNA
      if (advanceResult.advanceType === "interview_complete") {
        await ctx.runMutation(getInternal().ai.interviewRunner.completeInterview, {
          sessionId: args.sessionId,
        });
      }
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
