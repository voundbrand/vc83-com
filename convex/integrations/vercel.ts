/**
 * VERCEL INTEGRATION
 *
 * Handles Vercel API operations for builder app deployments:
 * - Create Vercel projects from GitHub repos
 * - Set environment variables on projects
 * - Poll deployment status
 *
 * Uses the existing Vercel OAuth connection (convex/oauth/vercel.ts)
 * for authenticated API calls.
 */

import { action, query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Lazy-load internal to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../_generated/api");
  }
  return _internalCache;
}

const VERCEL_API_URL = "https://api.vercel.com";

// ============================================================================
// TYPES
// ============================================================================

interface VercelProject {
  id: string;
  name: string;
  link?: {
    type: string;
    repo: string;
    repoId: number;
  };
}

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  readyState: "QUEUED" | "BUILDING" | "INITIALIZING" | "READY" | "ERROR" | "CANCELED";
  state: string;
  createdAt: number;
  ready?: number;
  buildingAt?: number;
  meta?: {
    githubCommitSha?: string;
    githubCommitMessage?: string;
  };
}

interface VercelDeploymentEvent {
  type: string;
  created: number;
  payload?: {
    text?: string;
    deploymentId?: string;
  };
  text?: string;
}

// ============================================================================
// INTERNAL QUERIES
// ============================================================================

/**
 * GET VERCEL CONNECTION (Internal)
 * Returns the Vercel OAuth connection including encrypted access token
 */
export const getVercelConnectionInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => {
        const provider = q.field("provider");
        const status = q.field("status");
        return q.and(q.eq(provider, "vercel"), q.eq(status, "active"));
      })
      .first();

    if (!connection) {
      return null;
    }

    return {
      connected: true,
      accessToken: connection.accessToken,
      username: connection.providerEmail || "Vercel",
      teamId: (connection.customProperties as { teamId?: string })?.teamId || null,
      connectedAt: connection._creationTime,
    };
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * CHECK VERCEL CONNECTION
 * Verify that Vercel OAuth is connected for the organization
 */
export const checkVercelConnection = query({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => {
        const provider = q.field("provider");
        const status = q.field("status");
        return q.and(q.eq(provider, "vercel"), q.eq(status, "active"));
      })
      .first();

    if (connection) {
      return {
        connected: true,
        username: connection.providerEmail || "Vercel",
        teamId: (connection.customProperties as { teamId?: string })?.teamId || null,
        connectedAt: connection._creationTime,
      };
    }

    return {
      connected: false,
      username: null,
      teamId: null,
      connectedAt: null,
    };
  },
});

// ============================================================================
// HELPER
// ============================================================================

/**
 * Make authenticated Vercel API request
 */
async function vercelFetch<T>(
  endpoint: string,
  accessToken: string,
  teamId: string | null,
  options: RequestInit = {}
): Promise<T> {
  // Append teamId to URL if present
  let url = `${VERCEL_API_URL}${endpoint}`;
  if (teamId) {
    const sep = url.includes("?") ? "&" : "?";
    url += `${sep}teamId=${teamId}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Vercel API error (${response.status})`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      errorMessage += `: ${errorText.substring(0, 200)}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// ============================================================================
// ACTIONS
// ============================================================================

/**
 * DEPLOY TO VERCEL
 *
 * Full deployment flow:
 * 1. Get Vercel OAuth token
 * 2. Create Vercel project connected to GitHub repo
 * 3. Set environment variables
 * 4. Vercel auto-deploys from GitHub
 * 5. Return project/deployment info for polling
 */
export const deployToVercel = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appId: v.id("objects"),
    projectName: v.string(),
    githubRepo: v.string(), // e.g. "https://github.com/owner/repo"
    envVars: v.array(
      v.object({
        key: v.string(),
        value: v.string(),
        sensitive: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args): Promise<{
    vercelProjectId: string;
    vercelProjectUrl: string;
    deploymentId: string | null;
    deploymentUrl: string | null;
  }> => {
    console.log("[Vercel] Starting deployment for:", args.projectName);

    // 1. Get Vercel OAuth connection
    const { internal } = getInternal();
    const connection = await ctx.runQuery(
      internal.integrations.vercel.getVercelConnectionInternal,
      { organizationId: args.organizationId }
    );

    if (!connection) {
      throw new Error("Vercel not connected. Please connect Vercel in Integrations settings.");
    }

    // 2. Decrypt access token (fallback to plaintext for legacy connections)
    let accessToken: string;
    try {
      accessToken = await ctx.runAction(internal.oauth.encryption.decryptToken, {
        encrypted: connection.accessToken,
      });
    } catch (err) {
      console.warn("[Vercel] Decrypt failed, trying token as plaintext (legacy):", err);
      // Legacy: token may have been stored unencrypted before encryption was added
      accessToken = connection.accessToken;
    }

    const teamId = connection.teamId;

    // 3. Parse GitHub repo: "https://github.com/owner/repo" → "owner/repo"
    const repoMatch = args.githubRepo.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
    if (!repoMatch) {
      throw new Error(`Invalid GitHub URL: ${args.githubRepo}`);
    }
    const repoSlug = `${repoMatch[1]}/${repoMatch[2]}`;

    // 4. Create Vercel project with GitHub integration
    console.log("[Vercel] Creating project:", args.projectName, "from repo:", repoSlug);
    let project: VercelProject;
    try {
      project = await vercelFetch<VercelProject>(
        "/v10/projects",
        accessToken,
        teamId,
        {
          method: "POST",
          body: JSON.stringify({
            name: args.projectName,
            framework: "nextjs",
            gitRepository: {
              repo: repoSlug,
              type: "github",
            },
          }),
        }
      );
      console.log("[Vercel] Project created:", project.id, project.name);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      // If project already exists, try to get it
      if (errorMsg.includes("already exist") || errorMsg.includes("409")) {
        console.log("[Vercel] Project may already exist, trying to fetch...");
        project = await vercelFetch<VercelProject>(
          `/v9/projects/${encodeURIComponent(args.projectName)}`,
          accessToken,
          teamId
        );
        console.log("[Vercel] Found existing project:", project.id);
      } else {
        throw new Error(`Failed to create Vercel project: ${errorMsg}`);
      }
    }

    // 5. Set environment variables
    if (args.envVars.length > 0) {
      console.log("[Vercel] Setting", args.envVars.length, "environment variables...");
      try {
        const envPayload = args.envVars.map((ev) => ({
          key: ev.key,
          value: ev.value,
          type: ev.sensitive ? "encrypted" : "plain",
          target: ["production", "preview", "development"],
        }));

        await vercelFetch(
          `/v10/projects/${project.id}/env?upsert=true`,
          accessToken,
          teamId,
          {
            method: "POST",
            body: JSON.stringify(envPayload),
          }
        );
        console.log("[Vercel] Environment variables set successfully");
      } catch (err) {
        console.error("[Vercel] Failed to set env vars:", err);
        // Non-fatal - deployment can proceed, user can add vars in Vercel dashboard
      }
    }

    // 6. Check for initial deployment (Vercel auto-deploys when project is connected to GitHub)
    let deploymentId: string | null = null;
    let deploymentUrl: string | null = null;
    try {
      // Wait a moment for Vercel to start the auto-deployment
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const deploymentsResponse = await vercelFetch<{ deployments: VercelDeployment[] }>(
        `/v6/deployments?projectId=${project.id}&limit=1`,
        accessToken,
        teamId
      );

      if (deploymentsResponse.deployments.length > 0) {
        const deployment = deploymentsResponse.deployments[0];
        deploymentId = deployment.uid;
        deploymentUrl = `https://${deployment.url}`;
        console.log("[Vercel] Initial deployment found:", deploymentId, deployment.readyState);
      } else {
        // Auto-deploy didn't trigger — manually create deployment from git source
        console.log("[Vercel] No auto-deployment detected, triggering manual deployment...");
        try {
          const manualDeployment = await vercelFetch<{ id: string; url: string; readyState: string }>(
            "/v13/deployments",
            accessToken,
            teamId,
            {
              method: "POST",
              body: JSON.stringify({
                name: args.projectName,
                project: project.id,
                gitSource: {
                  type: "github",
                  repo: repoSlug,
                  ref: "main",
                },
                target: "production",
              }),
            }
          );
          deploymentId = manualDeployment.id;
          deploymentUrl = `https://${manualDeployment.url}`;
          console.log("[Vercel] Manual deployment created:", deploymentId, manualDeployment.readyState);
        } catch (manualErr) {
          console.warn("[Vercel] Manual deployment trigger failed:", manualErr);
          // Non-fatal: polling will continue to check for deployments
        }
      }
    } catch (err) {
      console.warn("[Vercel] Could not fetch initial deployment:", err);
    }

    // 7. Update builder app deployment record
    const { api } = getInternal();
    await ctx.runMutation(api.builderAppOntology.updateBuilderAppDeployment, {
      sessionId: args.sessionId,
      appId: args.appId,
      vercelProjectId: project.id,
      status: "deploying" as const,
    });

    // Build the Vercel project URL
    const vercelProjectUrl = teamId
      ? `https://vercel.com/team/~/project/${project.name}`
      : `https://vercel.com/~/project/${project.name}`;

    console.log("[Vercel] Deployment initiated successfully");

    return {
      vercelProjectId: project.id,
      vercelProjectUrl,
      deploymentId,
      deploymentUrl,
    };
  },
});

/**
 * CHECK VERCEL DEPLOYMENT STATUS
 *
 * Polls the Vercel API for the latest deployment status.
 * Updates the builder app record when deployment completes or fails.
 */
export const checkVercelDeploymentStatus = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    appId: v.id("objects"),
    vercelProjectId: v.string(),
    pollCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    readyState: string;
    url: string | null;
    deploymentId: string | null;
    createdAt: number | null;
    buildingAt: number | null;
    readyAt: number | null;
    error: string | null;
  }> => {
    // 1. Get Vercel OAuth connection
    const { internal } = getInternal();
    const connection = await ctx.runQuery(
      internal.integrations.vercel.getVercelConnectionInternal,
      { organizationId: args.organizationId }
    );

    if (!connection) {
      return {
        readyState: "ERROR",
        url: null,
        deploymentId: null,
        createdAt: null,
        buildingAt: null,
        readyAt: null,
        error: "Vercel not connected",
      };
    }

    // 2. Decrypt access token (fallback to plaintext for legacy connections)
    let accessToken: string;
    try {
      accessToken = await ctx.runAction(internal.oauth.encryption.decryptToken, {
        encrypted: connection.accessToken,
      });
    } catch {
      console.warn("[Vercel] Decrypt failed, trying token as plaintext (legacy)");
      accessToken = connection.accessToken;
    }

    const teamId = connection.teamId;

    // 3. Get latest deployment for project
    try {
      const response = await vercelFetch<{ deployments: VercelDeployment[] }>(
        `/v6/deployments?projectId=${args.vercelProjectId}&limit=1`,
        accessToken,
        teamId
      );

      if (response.deployments.length === 0) {
        const pollCount = args.pollCount || 0;
        console.log("[Vercel] No deployments found for project:", args.vercelProjectId, "poll:", pollCount);

        // After ~30 seconds (6 polls at 5s) with no deployments, try manual trigger
        if (pollCount === 6) {
          console.log("[Vercel] No auto-deployment after 30s, attempting manual trigger...");
          try {
            // Get project info to find the linked repo
            const projectInfo = await vercelFetch<{ link?: { repo?: string } }>(
              `/v9/projects/${args.vercelProjectId}`,
              accessToken,
              teamId
            );
            const linkedRepo = projectInfo.link?.repo;
            if (linkedRepo) {
              const manualDeploy = await vercelFetch<{ id: string; url: string }>(
                "/v13/deployments",
                accessToken,
                teamId,
                {
                  method: "POST",
                  body: JSON.stringify({
                    name: args.vercelProjectId,
                    project: args.vercelProjectId,
                    gitSource: {
                      type: "github",
                      repo: linkedRepo,
                      ref: "main",
                    },
                    target: "production",
                  }),
                }
              );
              console.log("[Vercel] Manual deployment triggered:", manualDeploy.id);
              return {
                readyState: "BUILDING",
                url: `https://${manualDeploy.url}`,
                deploymentId: manualDeploy.id,
                createdAt: Date.now(),
                buildingAt: Date.now(),
                readyAt: null,
                error: null,
              };
            }
          } catch (manualErr) {
            console.warn("[Vercel] Manual deployment trigger in poll failed:", manualErr);
          }
        }

        return {
          readyState: "QUEUED",
          url: null,
          deploymentId: null,
          createdAt: null,
          buildingAt: null,
          readyAt: null,
          error: null,
        };
      }

      const deployment = response.deployments[0];
      const productionUrl = `https://${deployment.url}`;
      console.log("[Vercel] Deployment status:", deployment.readyState, deployment.uid, productionUrl);

      // 4. If deployment is READY, update builder app record
      if (deployment.readyState === "READY") {
        const { api } = getInternal();
        await ctx.runMutation(api.builderAppOntology.updateBuilderAppDeployment, {
          sessionId: args.sessionId,
          appId: args.appId,
          productionUrl,
          status: "deployed" as const,
        });
      }

      // 5. If deployment ERROR, fetch build logs for diagnostics
      let buildLogExcerpt: string | null = null;
      if (deployment.readyState === "ERROR" || deployment.readyState === "CANCELED") {
        try {
          buildLogExcerpt = await fetchBuildLogExcerpt(
            deployment.uid,
            accessToken,
            teamId
          );
          console.log("[Vercel] Build log excerpt:", buildLogExcerpt?.substring(0, 200));
        } catch (logErr) {
          console.warn("[Vercel] Failed to fetch build logs:", logErr);
        }

        const errorDetail = buildLogExcerpt
          ? `Build failed:\n${buildLogExcerpt}`
          : `Deployment ${deployment.readyState.toLowerCase()}`;

        const { api } = getInternal();
        await ctx.runMutation(api.builderAppOntology.updateBuilderAppDeployment, {
          sessionId: args.sessionId,
          appId: args.appId,
          status: "failed" as const,
          deploymentError: errorDetail.substring(0, 2000), // Cap at 2KB
        });
      }

      return {
        readyState: deployment.readyState,
        url: productionUrl,
        deploymentId: deployment.uid,
        createdAt: deployment.createdAt,
        buildingAt: deployment.buildingAt || null,
        readyAt: deployment.ready || null,
        error: deployment.readyState === "ERROR"
          ? (buildLogExcerpt || "Build failed")
          : null,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        readyState: "ERROR",
        url: null,
        deploymentId: null,
        createdAt: null,
        buildingAt: null,
        readyAt: null,
        error: errorMsg,
      };
    }
  },
});

// ============================================================================
// BUILD LOG HELPERS
// ============================================================================

/**
 * Fetch build log excerpt from a Vercel deployment.
 * Uses the deployment events API to extract error-relevant lines.
 */
async function fetchBuildLogExcerpt(
  deploymentId: string,
  accessToken: string,
  teamId: string | null,
): Promise<string | null> {
  try {
    // Vercel deployment events API returns build output
    const events = await vercelFetch<VercelDeploymentEvent[]>(
      `/v3/deployments/${deploymentId}/events?direction=backward&limit=100`,
      accessToken,
      teamId
    );

    if (!events || events.length === 0) return null;

    // Extract text from events, focusing on error-related lines
    const logLines: string[] = [];
    for (const event of events) {
      const text = event.payload?.text || event.text || "";
      if (!text) continue;
      logLines.push(text);
    }

    // Reverse to get chronological order (we fetched backward)
    logLines.reverse();

    // Find error-relevant section: look for common error markers
    const errorMarkers = [
      "error", "Error", "ERROR",
      "failed", "Failed", "FAILED",
      "Module not found",
      "Cannot find module",
      "Type error",
      "Build error",
      "Command failed",
      "Exit code",
      "npm ERR",
      "ENOENT",
    ];

    // Collect lines around errors (context window)
    const errorLines: string[] = [];
    for (let i = 0; i < logLines.length; i++) {
      const line = logLines[i];
      const isError = errorMarkers.some((marker) => line.includes(marker));
      if (isError) {
        // Include 2 lines before and 3 lines after for context
        const start = Math.max(0, i - 2);
        const end = Math.min(logLines.length, i + 4);
        for (let j = start; j < end; j++) {
          if (!errorLines.includes(logLines[j])) {
            errorLines.push(logLines[j]);
          }
        }
      }
    }

    if (errorLines.length > 0) {
      return errorLines.join("\n").substring(0, 1500);
    }

    // Fallback: return last 30 lines
    return logLines.slice(-30).join("\n").substring(0, 1500);
  } catch (err) {
    console.warn("[Vercel] fetchBuildLogExcerpt error:", err);
    return null;
  }
}

/**
 * GET VERCEL BUILD LOGS
 *
 * Fetches full build logs for a specific deployment.
 * Used for detailed error analysis and self-healing feedback.
 */
export const getVercelBuildLogs = action({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    deploymentId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    logs: string;
    errorSummary: string | null;
    suggestedFixes: string[];
  }> => {
    const { internal } = getInternal();
    const connection = await ctx.runQuery(
      internal.integrations.vercel.getVercelConnectionInternal,
      { organizationId: args.organizationId }
    );

    if (!connection) {
      throw new Error("Vercel not connected");
    }

    let accessToken: string;
    try {
      accessToken = await ctx.runAction(internal.oauth.encryption.decryptToken, {
        encrypted: connection.accessToken,
      });
    } catch {
      accessToken = connection.accessToken;
    }

    const teamId = connection.teamId;

    // Fetch deployment events
    const events = await vercelFetch<VercelDeploymentEvent[]>(
      `/v3/deployments/${args.deploymentId}/events?direction=forward&limit=500`,
      accessToken,
      teamId
    );

    const logLines: string[] = [];
    for (const event of events) {
      const text = event.payload?.text || event.text || "";
      if (text) logLines.push(text);
    }

    const fullLog = logLines.join("\n");

    // Extract error summary
    const errorSummary = extractErrorSummary(logLines);

    // Generate suggested fixes based on common patterns
    const suggestedFixes = generateSuggestedFixes(logLines);

    return {
      logs: fullLog.substring(0, 10000), // Cap at 10KB
      errorSummary,
      suggestedFixes,
    };
  },
});

/**
 * Extract a concise error summary from build log lines
 */
function extractErrorSummary(lines: string[]): string | null {
  const errorPatterns: { pattern: RegExp; category: string }[] = [
    { pattern: /Module not found: Can't resolve '([^']+)'/, category: "missing_module" },
    { pattern: /Cannot find module '([^']+)'/, category: "missing_module" },
    { pattern: /Type error: (.+)/, category: "type_error" },
    { pattern: /SyntaxError: (.+)/, category: "syntax_error" },
    { pattern: /Error: (.+)/, category: "generic_error" },
    { pattern: /npm ERR! (.+)/, category: "npm_error" },
    { pattern: /Command "(.+)" exited with (\d+)/, category: "command_failed" },
    { pattern: /Exit code: (\d+)/, category: "exit_code" },
  ];

  const errors: string[] = [];
  for (const line of lines) {
    for (const { pattern } of errorPatterns) {
      const match = line.match(pattern);
      if (match) {
        errors.push(line.trim());
        break;
      }
    }
  }

  if (errors.length === 0) return null;

  // Deduplicate and return top errors
  const unique = [...new Set(errors)];
  return unique.slice(0, 5).join("\n");
}

/**
 * Generate actionable fix suggestions from build log patterns
 */
function generateSuggestedFixes(lines: string[]): string[] {
  const fixes: string[] = [];
  const fullText = lines.join("\n");

  // Missing module
  const missingModules = fullText.match(/Module not found: Can't resolve '([^']+)'/g);
  if (missingModules) {
    const modules = missingModules.map((m) => {
      const match = m.match(/Can't resolve '([^']+)'/);
      return match?.[1];
    }).filter(Boolean);
    if (modules.length > 0) {
      fixes.push(`Install missing packages: npm install ${modules.join(" ")}`);
    }
  }

  // TypeScript errors
  if (fullText.includes("Type error:") || fullText.includes("TS")) {
    fixes.push("Fix TypeScript type errors in the source code");
  }

  // ESLint errors
  if (fullText.includes("ESLint") || fullText.includes("lint")) {
    fixes.push("Fix ESLint errors or add // eslint-disable where appropriate");
  }

  // Missing env vars
  const envMissing = fullText.match(/Environment variable[s]? (.+?) (?:is|are) not set/i);
  if (envMissing) {
    fixes.push(`Set missing environment variables: ${envMissing[1]}`);
  }

  // Build command failed
  if (fullText.includes("next build") && fullText.includes("Exit code")) {
    fixes.push("Check Next.js build output for compilation errors");
  }

  // npm install failures
  if (fullText.includes("npm ERR!") && fullText.includes("ERESOLVE")) {
    fixes.push("Resolve npm dependency conflicts: try npm install --legacy-peer-deps");
  }

  return fixes;
}
