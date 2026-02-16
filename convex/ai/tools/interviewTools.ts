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
};
