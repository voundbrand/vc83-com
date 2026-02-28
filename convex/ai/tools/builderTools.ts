/**
 * Builder Agent Tools
 *
 * Tools that let agents create and deploy web applications via the /builder pipeline.
 * Replaces the old create_page/publish_page tools.
 *
 * Flow:
 * 1. Agent generates page schema JSON (hero, features, pricing, etc.)
 * 2. create_webapp → creates builder app + Next.js scaffold files (idempotent)
 * 3. connect_webapp_data → links placeholder content to real records (optional)
 * 4. deploy_webapp → managed publish by default; external GitHub/Vercel is advanced mode
 * 5. Agent sends user the live URLs
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
    "Uses managed deployment defaults (no mandatory GitHub/Vercel setup). " +
    "Supports idempotent retries via idempotencyKey. " +
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
      idempotencyKey: {
        type: "string",
        description:
          "Optional stable key for retry-safe create behavior. Reusing the same key returns/reuses the same builder app.",
      },
    },
    required: ["name", "pageSchema"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      name: string;
      description?: string;
      pageSchema: Record<string, unknown>;
      idempotencyKey?: string;
    }
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
          idempotencyKey: args.idempotencyKey,
        }
      );

      return {
        success: true,
        message:
          `Web app "${args.name}" created (${result.appCode}). ` +
          `${result.fileCount} files generated as a deployable Next.js project. ` +
          `Use deploy_webapp with appId to publish in managed mode (default) or external mode.`,
        appId: result.appId,
        appCode: result.appCode,
        fileCount: result.fileCount,
        idempotencyKey: result.idempotencyKey,
        reused: result.reused === true,
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
    "Publish a builder web app. Defaults to managed deployment (no GitHub/Vercel setup required). " +
    "External deployment is an advanced mode that uses GitHub + Vercel. " +
    "Supports idempotent retries via idempotencyKey.",
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
          "Repository name used only for external deployment mode. " +
          "E.g., 'zen-yoga-studio'. Auto-generated from app name if omitted.",
      },
      isPrivate: {
        type: "boolean",
        description: "Make the GitHub repo private in external mode (default: true)",
      },
      deploymentMode: {
        type: "string",
        enum: ["managed", "external"],
        description:
          "managed (default): platform-managed publish path. external: advanced GitHub/Vercel export path.",
      },
      idempotencyKey: {
        type: "string",
        description:
          "Optional stable key for retry-safe publish behavior. Reusing the same key avoids duplicate publish side effects.",
      },
    },
    required: ["appId"],
  },
  execute: async (
    ctx: ToolExecutionContext,
    args: {
      appId: string;
      repoName?: string;
      isPrivate?: boolean;
      deploymentMode?: "managed" | "external";
      idempotencyKey?: string;
    }
  ) => {
    const internal = getInternal();
    const deploymentMode = args.deploymentMode || "managed";

    if (deploymentMode === "external") {
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
            "Use managed mode for zero-setup publish, or connect GitHub for external mode.",
          instructions: [
            "1. Open Settings (gear icon in the taskbar)",
            "2. Go to the Integrations tab",
            "3. Click 'Connect GitHub'",
            "4. Authorize the app",
            "5. Then retry deploy_webapp with deploymentMode='external'",
          ],
        };
      }
    }

    // 1. Fetch app to derive repo name
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

    // 2. Deploy
    try {
      const result = await ctx.runAction(
        internal.ai.tools.builderToolActions.deployWebApp,
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          appId: args.appId as Id<"objects">,
          repoName,
          isPrivate: args.isPrivate !== false,
          deploymentMode,
          sessionId: ctx.sessionId,
          idempotencyKey: args.idempotencyKey,
        }
      );

      if (deploymentMode === "managed") {
        return {
          success: true,
          message:
            `Published "${app.name}" in managed mode.\n\n` +
            `Live URL: ${result.productionUrl}\n\n` +
            `No GitHub/Vercel setup was required.`,
          deploymentMode: "managed",
          productionUrl: result.productionUrl,
          managedUrl: result.managedUrl || result.productionUrl,
          reused: result.reused === true,
          idempotencyKey: result.idempotencyKey,
        };
      }

      return {
        success: true,
        message:
          `Prepared external deployment for "${app.name}".\n\n` +
          `GitHub: ${result.repoUrl}\n` +
          `Deploy to Vercel: ${result.vercelDeployUrl}\n\n` +
          `${result.fileCount} files committed. Share the Vercel link to deploy with one click.`,
        deploymentMode: "external",
        repoUrl: result.repoUrl,
        vercelDeployUrl: result.vercelDeployUrl,
        fileCount: result.fileCount,
        defaultBranch: result.defaultBranch,
        reused: result.reused === true,
        idempotencyKey: result.idempotencyKey,
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
    "Check deployment readiness and current app publish state. " +
    "Managed mode is zero-setup. External mode requires GitHub connection.",
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
      managedModeReady: true,
    };

    if (args.appId) {
      const app = await ctx.runQuery(
        internal.ai.tools.internalToolMutations.internalGetBuilderApp,
        { appId: args.appId as Id<"objects"> }
      );

      if (app) {
        const props = app.customProperties as Record<string, unknown>;
        const deployment = (props?.deployment || {}) as Record<string, unknown>;
        const deploymentMode = (deployment?.mode as string | undefined) || "managed";
        result.app = {
          name: app.name,
          appCode: props?.appCode,
          status: app.status,
          deploymentMode,
          githubRepo: deployment?.githubRepo || null,
          vercelDeployUrl: deployment?.vercelDeployUrl || null,
          deploymentStatus: deployment?.status || "not_deployed",
          productionUrl:
            deployment?.productionUrl ||
            deployment?.managedUrl ||
            props?.v0DemoUrl ||
            props?.v0WebUrl ||
            null,
          readiness:
            deploymentMode === "managed"
              ? "ready"
              : ghConnection
                ? "ready"
                : "blocked_external_missing_github",
        };
      } else {
        result.app = null;
        result.appError = "Builder app not found";
      }
    }

    return result;
  },
};
