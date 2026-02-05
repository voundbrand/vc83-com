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

import type { AITool, ToolExecutionContext, ToolStatus } from "./registry";
import type { Id } from "../../_generated/dataModel";

// Lazy-load api/internal to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getApi(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../../_generated/api");
  }
  return _apiCache;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  return getApi().internal;
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

    let extractedData = context.extractedData || {};

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
// EXPORT ALL INTERVIEW TOOLS
// ============================================================================

export const INTERVIEW_TOOLS: Record<string, AITool> = {
  skip_phase: skipPhaseTool,
  mark_phase_complete: markPhaseCompleteTool,
  request_clarification: requestClarificationTool,
  get_interview_progress: getInterviewProgressTool,
  get_extracted_data: getExtractedDataTool,
};
