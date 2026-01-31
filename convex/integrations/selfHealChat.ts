/**
 * CHAT-BASED SELF-HEALING DEPLOYMENT
 *
 * Wraps selfHealDeploy.ts logic but integrates with the builder chat:
 * - Posts progress messages as heal attempts proceed
 * - Stores heal state in the builder app deployment record (not React state)
 * - Manages attempt counter via DB
 * - Supports resume on page reload
 *
 * Flow:
 * 1. "Fix in Chat" button sends deployment failure context
 * 2. Chat auto-triggers heal action
 * 3. Progress posted as messages to a mutation (builder context picks them up)
 * 4. Up to 3 attempts, with v0 fallback on attempt 3
 * 5. On success: posts production URL
 */

import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Lazy-load to avoid TS2589
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

// ============================================================================
// TYPES
// ============================================================================

export interface HealState {
  attemptNumber: number;
  maxAttempts: number;
  lastBuildLogs: string;
  fixHistory: Array<{
    attempt: number;
    filesChanged: string[];
    strategy: string;
    error?: string;
    success: boolean;
  }>;
  status: "idle" | "analyzing" | "fixing" | "building" | "succeeded" | "failed";
  deploymentId?: string;
  repoName?: string;
  isPrivate?: boolean;
}

const DEFAULT_HEAL_STATE: HealState = {
  attemptNumber: 0,
  maxAttempts: 3,
  lastBuildLogs: "",
  fixHistory: [],
  status: "idle",
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET HEAL STATE
 * Returns the full heal state for a builder app's deployment
 */
export const getHealState = query({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<HealState | null> => {
    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") return null;

    const props = (app.customProperties || {}) as Record<string, unknown>;
    const deployment = (props.deployment || {}) as Record<string, unknown>;
    const healState = deployment.healState as HealState | undefined;

    return healState || null;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * UPDATE HEAL STATE
 * Persists the full heal state on the deployment record
 */
export const updateHealState = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    healState: v.any(),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const currentDeployment = (currentProps.deployment || {}) as Record<string, unknown>;

    await ctx.db.patch(args.appId, {
      customProperties: {
        ...currentProps,
        deployment: {
          ...currentDeployment,
          healState: args.healState,
        },
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * RESET HEAL STATE
 * Clears heal state back to idle
 */
export const resetHealState = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const currentDeployment = (currentProps.deployment || {}) as Record<string, unknown>;

    await ctx.db.patch(args.appId, {
      customProperties: {
        ...currentProps,
        deployment: {
          ...currentDeployment,
          healState: DEFAULT_HEAL_STATE,
          isHealing: false,
        },
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * START CHAT HEAL
 *
 * Called when user clicks "Fix in Chat". Initializes heal state
 * and kicks off the first attempt. Returns immediately with the
 * initial context message for the chat.
 */
export const startChatHeal = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appId: v.id("objects"),
    buildLogs: v.string(),
    deploymentId: v.string(),
    repoName: v.string(),
    isPrivate: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    healState: HealState;
    contextMessage: string;
  }> => {
    const { api } = getApi();

    // 1. Get current heal state (may already have attempts from dropdown)
    const currentState = await ctx.runQuery(
      api.integrations.selfHealChat.getHealState,
      { sessionId: args.sessionId, appId: args.appId }
    );

    const attemptNumber = (currentState?.attemptNumber || 0) + 1;

    // 2. Initialize heal state
    const healState: HealState = {
      attemptNumber,
      maxAttempts: 3,
      lastBuildLogs: args.buildLogs.substring(0, 4000),
      fixHistory: currentState?.fixHistory || [],
      status: "analyzing",
      deploymentId: args.deploymentId,
      repoName: args.repoName,
      isPrivate: args.isPrivate,
    };

    // 3. Persist heal state
    await ctx.runMutation(api.integrations.selfHealChat.updateHealState, {
      sessionId: args.sessionId,
      appId: args.appId,
      healState,
    });

    // 4. Also update legacy heal tracking
    await ctx.runMutation(api.integrations.selfHealDeploy.updateHealStatus, {
      sessionId: args.sessionId,
      appId: args.appId,
      isHealing: true,
      healAttempts: attemptNumber,
    });

    // 5. Build context message for the chat
    const errorSummary = args.errorMessage || "Build failed on Vercel";
    const logExcerpt = args.buildLogs.substring(0, 800);

    const contextMessage = [
      `**Deployment Failed** - Attempt ${attemptNumber} of 3`,
      "",
      `**Error:** ${errorSummary}`,
      "",
      "**Build Logs:**",
      "```",
      logExcerpt,
      "```",
      "",
      attemptNumber <= 2
        ? "Analyzing build errors and generating surgical fixes..."
        : "Surgical fixes failed. Sending to v0 for full regeneration...",
    ].join("\n");

    return { healState, contextMessage };
  },
});

/**
 * RUN CHAT HEAL ATTEMPT
 *
 * Executes a single heal attempt within the chat flow.
 * Posts progress updates by returning structured results
 * that the frontend converts to chat messages.
 */
export const runChatHealAttempt = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appId: v.id("objects"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    strategy: "surgical" | "v0_regeneration";
    fixCount: number;
    rootCause: string;
    filesChanged: string[];
    fileDiffs?: Array<{ filePath: string; oldContent: string; newContent: string; explanation: string }>;
    progressMessages: string[];
    error?: string;
  }> => {
    const { api } = getApi();

    const progressMessages: string[] = [];

    // 1. Get current heal state
    const healState = await ctx.runQuery(
      api.integrations.selfHealChat.getHealState,
      { sessionId: args.sessionId, appId: args.appId }
    );

    if (!healState || healState.status === "idle" || healState.status === "succeeded") {
      return {
        success: false,
        strategy: "surgical",
        fixCount: 0,
        rootCause: "No active heal state",
        filesChanged: [],
        progressMessages: ["No active healing session found."],
        error: "No active heal state",
      };
    }

    const attemptNumber = healState.attemptNumber;

    if (attemptNumber > healState.maxAttempts) {
      // Update state to failed
      await ctx.runMutation(api.integrations.selfHealChat.updateHealState, {
        sessionId: args.sessionId,
        appId: args.appId,
        healState: { ...healState, status: "failed" },
      });

      return {
        success: false,
        strategy: "surgical",
        fixCount: 0,
        rootCause: "Max heal attempts reached",
        filesChanged: [],
        progressMessages: [`Maximum of ${healState.maxAttempts} heal attempts reached. Manual intervention required.`],
        error: `Exceeded maximum of ${healState.maxAttempts} self-heal attempts.`,
      };
    }

    try {
      // 2. Call the existing selfHealDeploy action
      const result = await ctx.runAction(api.integrations.selfHealDeploy.selfHealDeploy, {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
        appId: args.appId,
        buildLogs: healState.lastBuildLogs,
        deploymentId: healState.deploymentId || "",
        repoName: healState.repoName || "",
        isPrivate: healState.isPrivate ?? true,
      });

      // 3. Build progress messages
      if (result.success) {
        progressMessages.push(
          `**Fix Applied** (${result.strategy === "surgical" ? "Surgical Fix" : "v0 Regeneration"})`,
          "",
          `**Root cause:** ${result.rootCause}`,
          `**Files changed:** ${result.fixCount}`,
          "",
          "Pushed fixes to GitHub. Vercel is rebuilding..."
        );

        // Update heal state to building
        const updatedState: HealState = {
          ...healState,
          status: "building",
          fixHistory: [
            ...healState.fixHistory,
            {
              attempt: attemptNumber,
              filesChanged: [], // We don't have filenames from the result
              strategy: result.strategy,
              success: true,
            },
          ],
        };

        await ctx.runMutation(api.integrations.selfHealChat.updateHealState, {
          sessionId: args.sessionId,
          appId: args.appId,
          healState: updatedState,
        });
      } else {
        progressMessages.push(
          `**Fix Failed** (Attempt ${attemptNumber} of ${healState.maxAttempts})`,
          "",
          `**Error:** ${result.error || result.rootCause}`,
        );

        if (attemptNumber < healState.maxAttempts) {
          progressMessages.push("", "Will retry with a different approach...");
        } else {
          progressMessages.push("", "All heal attempts exhausted. Manual intervention required.");
        }

        // Update heal state
        const updatedState: HealState = {
          ...healState,
          status: attemptNumber >= healState.maxAttempts ? "failed" : "analyzing",
          fixHistory: [
            ...healState.fixHistory,
            {
              attempt: attemptNumber,
              filesChanged: [],
              strategy: result.strategy,
              error: result.error,
              success: false,
            },
          ],
        };

        await ctx.runMutation(api.integrations.selfHealChat.updateHealState, {
          sessionId: args.sessionId,
          appId: args.appId,
          healState: updatedState,
        });
      }

      // Update legacy heal tracking
      await ctx.runMutation(api.integrations.selfHealDeploy.updateHealStatus, {
        sessionId: args.sessionId,
        appId: args.appId,
        isHealing: false,
      });

      return {
        success: result.success,
        strategy: result.strategy,
        fixCount: result.fixCount,
        rootCause: result.rootCause,
        filesChanged: result.fileDiffs?.map((d: { filePath: string }) => d.filePath) || [],
        fileDiffs: result.fileDiffs,
        progressMessages,
        error: result.error,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Update state to failed
      await ctx.runMutation(api.integrations.selfHealChat.updateHealState, {
        sessionId: args.sessionId,
        appId: args.appId,
        healState: {
          ...healState,
          status: "failed",
          fixHistory: [
            ...healState.fixHistory,
            {
              attempt: attemptNumber,
              filesChanged: [],
              strategy: attemptNumber <= 2 ? "surgical" : "v0_regeneration",
              error: errorMsg,
              success: false,
            },
          ],
        },
      });

      await ctx.runMutation(api.integrations.selfHealDeploy.updateHealStatus, {
        sessionId: args.sessionId,
        appId: args.appId,
        isHealing: false,
      });

      return {
        success: false,
        strategy: attemptNumber <= 2 ? "surgical" : "v0_regeneration",
        fixCount: 0,
        rootCause: errorMsg,
        filesChanged: [],
        progressMessages: [
          `**Heal Error** (Attempt ${attemptNumber})`,
          "",
          `\`${errorMsg}\``,
        ],
        error: errorMsg,
      };
    }
  },
});

/**
 * MARK HEAL SUCCEEDED
 * Called when Vercel polling detects a successful deployment after heal
 */
export const markHealSucceeded = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    productionUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const currentDeployment = (currentProps.deployment || {}) as Record<string, unknown>;
    const healState = (currentDeployment.healState as HealState) || DEFAULT_HEAL_STATE;

    await ctx.db.patch(args.appId, {
      customProperties: {
        ...currentProps,
        deployment: {
          ...currentDeployment,
          healState: {
            ...healState,
            status: "succeeded",
          },
          isHealing: false,
        },
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
