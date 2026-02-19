/**
 * Builder Agent Tools
 *
 * Tools that let agents create and deploy web applications via the /builder pipeline.
 * Replaces the old create_page/publish_page tools.
 *
 * Flow:
 * 1. Agent generates page schema JSON (hero, features, pricing, etc.)
 * 2. create_webapp → creates builder app + Next.js scaffold files
 * 3. deploy_webapp → pushes to GitHub, generates Vercel deploy URL
 * 4. Agent sends user the live URLs
 */

import type { AITool, ToolExecutionContext } from "./registry";
import type { Id } from "../../_generated/dataModel";

// Lazy-load to avoid TS2589
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _internalCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_internalCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _internalCache = require("../../_generated/api").internal;
  }
  return _internalCache;
}

// ============================================================================
// TOOL: create_webapp
// ============================================================================

export const createWebAppTool: AITool = {
  name: "create_webapp",
  description:
    "Create a deployable Next.js web application from a page schema. " +
    "Generate the page schema first with sections (hero, features, cta, testimonials, pricing, gallery, team, faq, process), " +
    "then call this tool to convert it into a real builder app with scaffold files. " +
    "Returns appId for subsequent deployment with deploy_webapp.",
  status: "ready",
  windowName: "Builder",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "App name (e.g., 'Zen Yoga Studio')",
      },
      description: {
        type: "string",
        description: "Brief description of the web app",
      },
      pageSchema: {
        type: "object",
        description:
          "Page schema JSON object with: version (string), " +
          "metadata (optional: title, description), " +
          "theme (optional: primaryColor, secondaryColor, accentColor, backgroundColor, textColor, fontFamily), " +
          "sections (array of objects with id, type, and props). " +
          "Section types: hero, features, cta, testimonials, pricing, gallery, team, faq, process.",
        properties: {
          version: { type: "string" },
          metadata: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
            },
          },
          theme: {
            type: "object",
            properties: {
              primaryColor: { type: "string" },
              secondaryColor: { type: "string" },
            },
          },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                props: { type: "object" },
              },
              required: ["type", "props"],
            },
          },
        },
        required: ["version", "sections"],
      },
    },
    required: ["name", "pageSchema"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: { name: string; description?: string; pageSchema: Record<string, unknown> }
  ) => {
    const internal = getInternal();

    // Validate schema structure
    const schema = args.pageSchema;
    if (!schema.version || !schema.sections || !Array.isArray(schema.sections)) {
      return {
        success: false,
        error: "Invalid pageSchema: must have 'version' (string) and 'sections' (array).",
        hint: "Generate a page schema with version and an array of sections before calling this tool.",
      };
    }

    if (schema.sections.length === 0) {
      return {
        success: false,
        error: "pageSchema.sections is empty. Include at least one section (e.g., hero).",
      };
    }

    try {
      const result = await ctx.runAction(
        internal.ai.tools.builderToolActions.createWebAppFromSchema,
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          name: args.name,
          description: args.description || `Landing page for ${args.name}`,
          pageSchema: args.pageSchema,
          conversationId: ctx.conversationId,
        }
      );

      return {
        success: true,
        message:
          `Web app "${args.name}" created (${result.appCode}). ` +
          `${result.fileCount} files generated as a deployable Next.js project. ` +
          `Use deploy_webapp with appId to push to GitHub and get a Vercel deploy link.`,
        appId: result.appId,
        appCode: result.appCode,
        fileCount: result.fileCount,
        status: "ready",
        nextStep: "Call deploy_webapp with the appId to deploy.",
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create web app: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

// ============================================================================
// TOOL: deploy_webapp
// ============================================================================

export const deployWebAppTool: AITool = {
  name: "deploy_webapp",
  description:
    "Deploy a builder web app to GitHub and generate a Vercel deploy link. " +
    "Requires: (1) an appId from create_webapp, (2) GitHub OAuth connected for the organization. " +
    "Returns the GitHub repo URL and a one-click Vercel deploy URL to share with the user.",
  status: "ready",
  windowName: "Builder",
  parameters: {
    type: "object",
    properties: {
      appId: {
        type: "string",
        description: "Builder app ID returned by create_webapp",
      },
      repoName: {
        type: "string",
        description:
          "GitHub repository name (lowercase, hyphens only). " +
          "E.g., 'zen-yoga-studio'. Auto-generated from app name if omitted.",
      },
      isPrivate: {
        type: "boolean",
        description: "Make the GitHub repo private (default: true)",
      },
    },
    required: ["appId"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: { appId: string; repoName?: string; isPrivate?: boolean }
  ) => {
    const internal = getInternal();

    // 1. Check GitHub connection
    const ghConnection = await ctx.runQuery(
      internal.integrations.github.getGitHubConnectionInternal,
      { organizationId: ctx.organizationId }
    );

    if (!ghConnection) {
      return {
        success: false,
        error: "GITHUB_NOT_CONNECTED",
        message:
          "GitHub is not connected for this organization. " +
          "The owner needs to connect GitHub before deploying.",
        instructions: [
          "1. Open Settings (gear icon in the taskbar)",
          "2. Go to the Integrations tab",
          "3. Click 'Connect GitHub'",
          "4. Authorize the app",
          "5. Then try deploy_webapp again",
        ],
      };
    }

    // 2. Fetch app to derive repo name
    const app = await ctx.runQuery(
      internal.ai.tools.internalToolMutations.internalGetBuilderApp,
      { appId: args.appId as Id<"objects"> }
    );

    if (!app) {
      return {
        success: false,
        error: "APP_NOT_FOUND",
        message: `Builder app "${args.appId}" not found. Create one first with create_webapp.`,
      };
    }

    const repoName =
      args.repoName ||
      app.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    // 3. Deploy
    try {
      const result = await ctx.runAction(
        internal.ai.tools.builderToolActions.deployWebApp,
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          appId: args.appId as Id<"objects">,
          repoName,
          isPrivate: args.isPrivate !== false,
        }
      );

      return {
        success: true,
        message:
          `Deployed "${app.name}" to GitHub!\n\n` +
          `GitHub: ${result.repoUrl}\n` +
          `Deploy to Vercel: ${result.vercelDeployUrl}\n\n` +
          `${result.fileCount} files committed. Share the Vercel link to deploy with one click.`,
        repoUrl: result.repoUrl,
        vercelDeployUrl: result.vercelDeployUrl,
        fileCount: result.fileCount,
        defaultBranch: result.defaultBranch,
      };
    } catch (error) {
      return {
        success: false,
        error: "DEPLOY_FAILED",
        message: `Deployment failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

// ============================================================================
// TOOL: check_deploy_status
// ============================================================================

export const checkDeployStatusTool: AITool = {
  name: "check_deploy_status",
  description:
    "Check deployment prerequisites (GitHub connection) and get the status of a builder app. " +
    "Call this before deploy_webapp to verify readiness, or after to check deployment status.",
  status: "ready",
  readOnly: true,
  windowName: "Builder",
  parameters: {
    type: "object",
    properties: {
      appId: {
        type: "string",
        description: "Optional: builder app ID to check status for",
      },
    },
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: { appId?: string }
  ) => {
    const internal = getInternal();

    const ghConnection = await ctx.runQuery(
      internal.integrations.github.getGitHubConnectionInternal,
      { organizationId: ctx.organizationId }
    );

    const result: Record<string, unknown> = {
      success: true,
      githubConnected: !!ghConnection,
      githubUsername: ghConnection?.username || null,
    };

    if (args.appId) {
      const app = await ctx.runQuery(
        internal.ai.tools.internalToolMutations.internalGetBuilderApp,
        { appId: args.appId as Id<"objects"> }
      );

      if (app) {
        const props = app.customProperties as Record<string, unknown>;
        const deployment = (props?.deployment || {}) as Record<string, unknown>;
        result.app = {
          name: app.name,
          appCode: props?.appCode,
          status: app.status,
          githubRepo: deployment?.githubRepo || null,
          vercelDeployUrl: deployment?.vercelDeployUrl || null,
          deploymentStatus: deployment?.status || "not_deployed",
          productionUrl: deployment?.productionUrl || null,
        };
      } else {
        result.app = null;
        result.appError = "Builder app not found";
      }
    }

    return result;
  },
};
