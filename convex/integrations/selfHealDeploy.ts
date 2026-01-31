/**
 * SELF-HEALING DEPLOYMENT
 *
 * Automated build error analysis and fix loop:
 * 1. Fetch Vercel build logs when deployment fails
 * 2. Use LLM (OpenRouter/Claude) to analyze errors and generate code fixes
 * 3. Apply fixes to generated files
 * 4. Push updated code to GitHub
 * 5. Vercel auto-deploys from new commit
 * 6. Poll for success (max 3 heal attempts)
 *
 * Fallback: If surgical LLM fixes fail after 2 attempts,
 * send error context back to v0 chat for full regeneration.
 */

import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { OpenRouterClient } from "../ai/openrouter";

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
// CONSTANTS
// ============================================================================

const MAX_HEAL_ATTEMPTS = 3;
const HEAL_MODEL = "anthropic/claude-3-5-sonnet"; // Fast + smart for code fixes
const MAX_FIX_TOKENS = 16000;

// ============================================================================
// TYPES
// ============================================================================

interface CodeFix {
  filePath: string;
  oldContent: string;
  newContent: string;
  explanation: string;
}

interface HealAttempt {
  attempt: number;
  strategy: "surgical" | "v0_regeneration";
  buildLogExcerpt: string;
  fixes: CodeFix[];
  success: boolean;
  error?: string;
  timestamp: number;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * GET HEAL STATUS
 * Returns the current self-healing status for a builder app
 */
export const getHealStatus = query({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") return null;

    const props = (app.customProperties || {}) as Record<string, unknown>;
    const deployment = (props.deployment || {}) as Record<string, unknown>;

    return {
      healAttempts: (deployment.healAttempts as number) || 0,
      maxAttempts: MAX_HEAL_ATTEMPTS,
      lastHealResult: (deployment.lastHealResult as HealAttempt) || null,
      isHealing: (deployment.isHealing as boolean) || false,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * UPDATE HEAL STATUS
 * Track healing attempts on the deployment record
 */
export const updateHealStatus = mutation({
  args: {
    sessionId: v.string(),
    appId: v.id("objects"),
    healAttempts: v.optional(v.number()),
    isHealing: v.optional(v.boolean()),
    lastHealResult: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app || app.type !== "builder_app") {
      throw new Error("Builder app not found");
    }

    const currentProps = (app.customProperties || {}) as Record<string, unknown>;
    const currentDeployment = (currentProps.deployment || {}) as Record<string, unknown>;

    const updatedDeployment = { ...currentDeployment };
    if (args.healAttempts !== undefined) updatedDeployment.healAttempts = args.healAttempts;
    if (args.isHealing !== undefined) updatedDeployment.isHealing = args.isHealing;
    if (args.lastHealResult !== undefined) updatedDeployment.lastHealResult = args.lastHealResult;

    await ctx.db.patch(args.appId, {
      customProperties: {
        ...currentProps,
        deployment: updatedDeployment,
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
 * ANALYZE BUILD ERROR
 *
 * Takes build logs + generated files, uses LLM to:
 * 1. Identify the root cause
 * 2. Map errors to specific files
 * 3. Generate surgical code fixes
 * 4. Return fixes as diffs
 */
export const analyzeBuildError = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appId: v.id("objects"),
    buildLogs: v.string(),
    deploymentId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    fixes: Array<{
      filePath: string;
      oldContent: string;
      newContent: string;
      explanation: string;
    }>;
    rootCause: string;
    confidence: "high" | "medium" | "low";
  }> => {
    const { api, internal } = getApi();

    // 1. Get the builder app and its generated files
    const app = await ctx.runQuery(api.builderAppOntology.getBuilderApp, {
      sessionId: args.sessionId,
      appId: args.appId,
    });

    if (!app) throw new Error("Builder app not found");

    // 1b. Get files from builderFiles table
    const generatedFiles: Array<{ path: string; content: string; language: string }> =
      await ctx.runQuery(internal.fileSystemOntology.getFilesByAppInternal, {
        appId: args.appId,
      });

    // 2. Get OpenRouter API key
    const aiSettings = await ctx.runQuery(
      internal.integrations.selfHealDeploy.getOpenRouterKey,
      { organizationId: args.organizationId }
    );

    if (!aiSettings) {
      throw new Error("OpenRouter API key not configured. Self-healing requires an AI provider.");
    }

    // 3. Build the analysis prompt
    const fileList = generatedFiles.map((f) => `- ${f.path} (${f.language})`).join("\n");
    const fileSources = generatedFiles
      .map((f) => `=== ${f.path} ===\n${f.content}`)
      .join("\n\n");

    const systemPrompt = `You are a senior software engineer specializing in Next.js, TypeScript, and Vercel deployments.
Your job is to analyze Vercel build errors and produce EXACT code fixes.

RULES:
- Output ONLY valid JSON matching the schema below. No markdown, no explanation outside JSON.
- Each fix must contain the COMPLETE NEW file content for the file being fixed
- The "oldContent" field should be empty string "" (we match by filePath)
- Focus on the most impactful fixes first
- Common issues: missing imports, missing packages in package.json, TypeScript errors, ESLint issues
- If a module import fails (Cannot find module), check if it's a local import path issue or a missing npm package
- If an import path like '@/fonts/...' fails, the file likely doesn't exist - remove or replace the import
- NEVER add packages that don't exist on npm
- Keep fixes minimal - change only what's needed to fix the build error
- If fixing a TypeScript "Cannot find module" for a local file, the fix is usually to either create the file or remove/replace the import

OUTPUT JSON SCHEMA:
{
  "rootCause": "Brief description of why the build failed",
  "confidence": "high" | "medium" | "low",
  "fixes": [
    {
      "filePath": "path/to/file.tsx",
      "explanation": "What this fix does",
      "oldContent": "",
      "newContent": "...complete new file content with fix applied..."
    }
  ]
}`;

    const userPrompt = `The Vercel deployment failed. Analyze the build logs and fix the code.

## Build Logs (error section)
\`\`\`
${args.buildLogs.substring(0, 4000)}
\`\`\`

## Project Files
${fileList}

## Source Code
${fileSources.substring(0, 12000)}

Produce the fixes as JSON. Fix ALL build errors you can identify.`;

    // 4. Call OpenRouter
    const client = new OpenRouterClient(aiSettings);

    const response = await client.chatCompletion({
      model: HEAL_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1, // Low temperature for precise code fixes
      max_tokens: MAX_FIX_TOKENS,
    });

    // 5. Parse response
    const content = response.choices?.[0]?.message?.content || "";
    console.log("[SelfHeal] LLM response length:", content.length, "chars");

    // Strip markdown code blocks if present
    let jsonStr = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Try to find the outermost JSON object
    const firstBrace = jsonStr.indexOf("{");
    if (firstBrace === -1) {
      console.error("[SelfHeal] LLM returned non-JSON response:", content.substring(0, 500));
      throw new Error("LLM did not return valid fix suggestions");
    }

    // Find matching closing brace by counting depth
    let depth = 0;
    let lastBrace = -1;
    for (let i = firstBrace; i < jsonStr.length; i++) {
      if (jsonStr[i] === "{") depth++;
      else if (jsonStr[i] === "}") {
        depth--;
        if (depth === 0) {
          lastBrace = i;
          break;
        }
      }
    }

    if (lastBrace === -1) {
      // JSON was truncated - try to salvage by closing it
      console.warn("[SelfHeal] JSON appears truncated, attempting to repair...");
      jsonStr = jsonStr.substring(firstBrace);
      // Close any open strings and arrays/objects
      const openBraces = (jsonStr.match(/\{/g) || []).length;
      const closeBraces = (jsonStr.match(/\}/g) || []).length;
      const openBrackets = (jsonStr.match(/\[/g) || []).length;
      const closeBrackets = (jsonStr.match(/\]/g) || []).length;
      // Trim to last complete fix entry if possible
      const lastCompleteEntry = jsonStr.lastIndexOf('"explanation"');
      if (lastCompleteEntry > 0) {
        const afterExplanation = jsonStr.indexOf("}", lastCompleteEntry);
        if (afterExplanation > 0) {
          jsonStr = jsonStr.substring(0, afterExplanation + 1) + "]}";
        }
      }
      jsonStr += "]".repeat(Math.max(0, openBrackets - closeBrackets));
      jsonStr += "}".repeat(Math.max(0, openBraces - closeBraces));
    } else {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return {
        fixes: parsed.fixes || [],
        rootCause: parsed.rootCause || "Unknown",
        confidence: parsed.confidence || "low",
      };
    } catch (parseErr) {
      console.error("[SelfHeal] Failed to parse LLM response:", parseErr);
      console.error("[SelfHeal] Raw content (first 1000):", content.substring(0, 1000));
      console.error("[SelfHeal] Attempted JSON (first 500):", jsonStr.substring(0, 500));
      throw new Error("Failed to parse LLM fix suggestions");
    }
  },
});

/**
 * SELF-HEAL DEPLOY
 *
 * Full self-healing loop:
 * 1. Analyze build error with LLM
 * 2. Apply fixes to generated files
 * 3. Push updated code to GitHub
 * 4. Wait for Vercel to redeploy
 *
 * Called from the frontend when user clicks "Auto-Fix"
 */
export const selfHealDeploy = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appId: v.id("objects"),
    buildLogs: v.string(),
    deploymentId: v.string(),
    repoName: v.string(),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    strategy: "surgical" | "v0_regeneration";
    fixCount: number;
    rootCause: string;
    fileDiffs?: Array<{ filePath: string; oldContent: string; newContent: string; explanation: string }>;
    error?: string;
  }> => {
    const { api, internal } = getApi();

    console.log("[SelfHeal] Starting self-heal for app:", args.appId);

    // 1. Update heal status
    await ctx.runMutation(api.integrations.selfHealDeploy.updateHealStatus, {
      sessionId: args.sessionId,
      appId: args.appId,
      isHealing: true,
    });

    // 2. Get current heal attempt count
    const healStatus = await ctx.runQuery(api.integrations.selfHealDeploy.getHealStatus, {
      sessionId: args.sessionId,
      appId: args.appId,
    });

    const attemptNumber = (healStatus?.healAttempts || 0) + 1;

    if (attemptNumber > MAX_HEAL_ATTEMPTS) {
      await ctx.runMutation(api.integrations.selfHealDeploy.updateHealStatus, {
        sessionId: args.sessionId,
        appId: args.appId,
        isHealing: false,
      });
      return {
        success: false,
        strategy: "surgical",
        fixCount: 0,
        rootCause: "Max heal attempts reached",
        error: `Exceeded maximum of ${MAX_HEAL_ATTEMPTS} self-heal attempts. Manual intervention required.`,
      };
    }

    try {
      // 3. Decide strategy based on attempt number
      const strategy: "surgical" | "v0_regeneration" =
        attemptNumber <= 2 ? "surgical" : "v0_regeneration";

      if (strategy === "surgical") {
        // ── SURGICAL FIX via OpenRouter/Claude ──
        console.log(`[SelfHeal] Attempt ${attemptNumber}: surgical fix via LLM`);

        const analysis = await ctx.runAction(api.integrations.selfHealDeploy.analyzeBuildError, {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          appId: args.appId,
          buildLogs: args.buildLogs,
          deploymentId: args.deploymentId,
        });

        if (analysis.fixes.length === 0) {
          throw new Error("LLM could not identify any fixes for the build error");
        }

        console.log(`[SelfHeal] LLM found ${analysis.fixes.length} fixes. Root cause: ${analysis.rootCause}`);

        // 4. Apply fixes to builderFiles table
        const currentFiles: Array<{ path: string; content: string; language: string }> =
          await ctx.runQuery(internal.fileSystemOntology.getFilesByAppInternal, {
            appId: args.appId,
          });

        // Build updated files array with fixes applied
        const updatedFiles = currentFiles.map((f) => ({
          path: f.path,
          content: f.content,
          language: f.language,
        }));

        for (const fix of analysis.fixes) {
          const fileIdx = updatedFiles.findIndex((f) => f.path === fix.filePath);
          // Capture old content before overwriting (for diff viewer)
          fix.oldContent = fileIdx >= 0 ? updatedFiles[fileIdx].content : "";
          if (fileIdx >= 0) {
            updatedFiles[fileIdx] = {
              ...updatedFiles[fileIdx],
              content: fix.newContent,
            };
            console.log(`[SelfHeal] Fixed: ${fix.filePath} - ${fix.explanation}`);
          } else {
            // New file (e.g., package.json fix)
            updatedFiles.push({
              path: fix.filePath,
              content: fix.newContent,
              language: fix.filePath.endsWith(".json") ? "json" :
                fix.filePath.endsWith(".ts") || fix.filePath.endsWith(".tsx") ? "typescript" : "text",
            });
            console.log(`[SelfHeal] Added: ${fix.filePath} - ${fix.explanation}`);
          }
        }

        // 5. Save updated files to builderFiles table
        await ctx.runMutation(internal.fileSystemOntology.bulkUpsertFiles, {
          appId: args.appId,
          files: updatedFiles,
          modifiedBy: "self-heal",
        });

        // 6. Push to GitHub (will update existing repo)
        await ctx.runAction(api.integrations.github.createRepoFromBuilderApp, {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          appId: args.appId,
          repoName: args.repoName,
          description: `Auto-fix attempt ${attemptNumber}: ${analysis.rootCause}`,
          isPrivate: args.isPrivate,
        });

        console.log("[SelfHeal] Pushed fixed code to GitHub");

        // 7. Update deployment status to trigger polling
        await ctx.runMutation(api.builderAppOntology.updateBuilderAppDeployment, {
          sessionId: args.sessionId,
          appId: args.appId,
          status: "deploying",
          deploymentError: undefined,
        });

        // 8. Record heal attempt
        const healResult: HealAttempt = {
          attempt: attemptNumber,
          strategy: "surgical",
          buildLogExcerpt: args.buildLogs.substring(0, 500),
          fixes: analysis.fixes.map((f: CodeFix) => ({
            filePath: f.filePath,
            oldContent: f.oldContent,
            newContent: f.newContent,
            explanation: f.explanation,
          })),
          success: true, // Will be confirmed by next deploy status check
          timestamp: Date.now(),
        };

        await ctx.runMutation(api.integrations.selfHealDeploy.updateHealStatus, {
          sessionId: args.sessionId,
          appId: args.appId,
          healAttempts: attemptNumber,
          isHealing: false,
          lastHealResult: healResult,
        });

        return {
          success: true,
          strategy: "surgical",
          fixCount: analysis.fixes.length,
          rootCause: analysis.rootCause,
          fileDiffs: analysis.fixes.map((f: CodeFix) => ({
            filePath: f.filePath,
            oldContent: f.oldContent,
            newContent: f.newContent,
            explanation: f.explanation,
          })),
        };

      } else {
        // ── V0 REGENERATION FALLBACK ──
        console.log(`[SelfHeal] Attempt ${attemptNumber}: v0 regeneration fallback`);

        // Get the v0 chat ID from the builder app
        const app = await ctx.runQuery(api.builderAppOntology.getBuilderApp, {
          sessionId: args.sessionId,
          appId: args.appId,
        });

        const appProps = (app.customProperties || {}) as Record<string, unknown>;
        const v0ChatId = appProps.v0ChatId as string | undefined;

        if (!v0ChatId) {
          throw new Error("No v0 chat ID found. Cannot use v0 regeneration fallback.");
        }

        // Send build error as follow-up to v0 chat
        const fixMessage = `The app failed to deploy on Vercel with the following build error. Please fix the code:

\`\`\`
${args.buildLogs.substring(0, 3000)}
\`\`\`

Please fix all errors and make sure the app builds successfully with \`next build\`.`;

        const v0Result = await ctx.runAction(api.integrations.v0.sendMessage, {
          sessionId: args.sessionId,
          organizationId: args.organizationId,
          chatId: v0ChatId,
          message: fixMessage,
        });

        // v0 returns complete regenerated files
        if (v0Result.files && v0Result.files.length > 0) {
          // Save regenerated files
          await ctx.runMutation(api.builderAppOntology.updateBuilderApp, {
            sessionId: args.sessionId,
            appId: args.appId,
            files: v0Result.files.map((f: { path: string; content: string; language?: string }) => ({
              path: f.path,
              content: f.content,
              language: f.language || "typescript",
            })),
          });

          // Push to GitHub
          await ctx.runAction(api.integrations.github.createRepoFromBuilderApp, {
            sessionId: args.sessionId,
            organizationId: args.organizationId,
            appId: args.appId,
            repoName: args.repoName,
            description: `v0 regeneration fix attempt ${attemptNumber}`,
            isPrivate: args.isPrivate,
          });

          // Update deployment status
          await ctx.runMutation(api.builderAppOntology.updateBuilderAppDeployment, {
            sessionId: args.sessionId,
            appId: args.appId,
            status: "deploying",
            deploymentError: undefined,
          });

          const healResult: HealAttempt = {
            attempt: attemptNumber,
            strategy: "v0_regeneration",
            buildLogExcerpt: args.buildLogs.substring(0, 500),
            fixes: [{ filePath: "*", oldContent: "", newContent: "", explanation: "Full v0 regeneration" }],
            success: true,
            timestamp: Date.now(),
          };

          await ctx.runMutation(api.integrations.selfHealDeploy.updateHealStatus, {
            sessionId: args.sessionId,
            appId: args.appId,
            healAttempts: attemptNumber,
            isHealing: false,
            lastHealResult: healResult,
          });

          return {
            success: true,
            strategy: "v0_regeneration",
            fixCount: v0Result.files.length,
            rootCause: "Full app regeneration via v0",
          };
        }

        throw new Error("v0 did not return any files");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[SelfHeal] Attempt ${attemptNumber} failed:`, errorMsg);

      // Record failed attempt
      await ctx.runMutation(api.integrations.selfHealDeploy.updateHealStatus, {
        sessionId: args.sessionId,
        appId: args.appId,
        healAttempts: attemptNumber,
        isHealing: false,
        lastHealResult: {
          attempt: attemptNumber,
          strategy: attemptNumber <= 2 ? "surgical" : "v0_regeneration",
          buildLogExcerpt: args.buildLogs.substring(0, 500),
          fixes: [],
          success: false,
          error: errorMsg,
          timestamp: Date.now(),
        },
      });

      return {
        success: false,
        strategy: attemptNumber <= 2 ? "surgical" : "v0_regeneration",
        fixCount: 0,
        rootCause: errorMsg,
        error: errorMsg,
      };
    }
  },
});

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * Get OpenRouter API key for the organization
 */
export const getOpenRouterKey = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<string | null> => {
    // Check org AI settings for custom key
    const aiSettings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "ai_settings")
      )
      .first();

    const customKey = (aiSettings?.customProperties as { llm?: { openrouterApiKey?: string } })
      ?.llm?.openrouterApiKey;

    if (customKey) return customKey;

    // Fall back to platform key
    return process.env.OPENROUTER_API_KEY || null;
  },
});
