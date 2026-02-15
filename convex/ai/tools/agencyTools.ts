/**
 * AGENCY TOOLS — Sub-Organization Management
 *
 * Tools that let the agency PM agent create and manage client sub-orgs.
 * Only available to agents on agency-tier or enterprise-tier orgs.
 */

import type { AITool, ToolExecutionContext } from "./registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getInternal(): any {
  if (!_apiCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _apiCache = require("../../_generated/api").internal;
  }
  return _apiCache;
}

/**
 * create_client_org — Create a sub-org for an agency client
 */
export const createClientOrgTool: AITool = {
  name: "create_client_org",
  description: `Create a new client organization under your agency. Use this after collecting the client's business details. This will:
1. Create the sub-organization
2. Bootstrap a PM agent for the client
3. Generate the agent's personality from the business context
4. Create a Telegram deep link for the client's customers

Only available for agency-tier organizations.`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      businessName: {
        type: "string",
        description: "The client's legal business name (e.g., 'Apotheke Schmidt')",
      },
      industry: {
        type: "string",
        description: "Industry category (e.g., 'pharmacy', 'fitness', 'restaurant')",
      },
      description: {
        type: "string",
        description: "Brief description of the business and what the agent should do",
      },
      targetAudience: {
        type: "string",
        description: "Who the client's customers are (e.g., 'elderly patients, young families')",
      },
      language: {
        type: "string",
        description: "Primary language for the agent (e.g., 'de', 'en', 'es')",
      },
      tonePreference: {
        type: "string",
        description: "Communication style (e.g., 'formal German with Sie, warm and caring')",
      },
      agentNameHint: {
        type: "string",
        description: "Optional preferred name for the client's agent",
      },
    },
    required: ["businessName", "industry", "description", "targetAudience"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    if (!ctx.organizationId) {
      return { error: "No organization context" };
    }

    try {
      const result = await ctx.runAction(
        getInternal().onboarding.agencySubOrgBootstrap.bootstrapClientOrg,
        {
          parentOrganizationId: ctx.organizationId,
          businessName: args.businessName as string,
          industry: args.industry as string,
          description: args.description as string,
          targetAudience: args.targetAudience as string,
          language: (args.language as string) || "en",
          tonePreference: (args.tonePreference as string) || undefined,
          agentNameHint: (args.agentNameHint as string) || undefined,
        }
      );

      return result;
    } catch (e) {
      return { error: String(e) };
    }
  },
};

/**
 * list_client_orgs — List all client sub-orgs for the agency
 */
export const listClientOrgsTool: AITool = {
  name: "list_client_orgs",
  description: "List all client organizations under your agency, including their status, agent names, and recent activity.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  execute: async (ctx: ToolExecutionContext) => {
    if (!ctx.organizationId) {
      return { error: "No organization context" };
    }

    try {
      const children = await ctx.runQuery(
        getInternal().api.v1.subOrganizationsInternal.getChildOrganizationsInternal,
        { parentOrganizationId: ctx.organizationId }
      );

      if (!children?.organizations?.length) {
        return { message: "No client organizations yet. Use create_client_org to set up your first client." };
      }

      // Enrich with agent info per sub-org
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enriched: any[] = [];
      for (const child of children.organizations) {
        const agents = await ctx.runQuery(
          getInternal().agentOntology.getAllActiveAgentsForOrg,
          { organizationId: child.id }
        );

        // Check if org has a custom Telegram bot deployed
        const telegramCreds = await ctx.runQuery(
          getInternal().channels.router.getProviderCredentials,
          { organizationId: child.id, providerId: "telegram" }
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const creds = telegramCreds as any;
        const hasCustomBot = creds?.telegramBotUsername && creds.telegramBotUsername !== process.env.TELEGRAM_BOT_USERNAME;

        enriched.push({
          name: child.name,
          slug: child.slug,
          isActive: child.isActive,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          agentCount: (agents as any[])?.length || 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          agents: (agents as any[])?.map((a: any) => ({
            name: (a.customProperties as Record<string, unknown>)?.displayName || a.name,
            subtype: a.subtype,
          })) || [],
          telegramMode: hasCustomBot ? "deployed" as const : "testing" as const,
          customBotUsername: hasCustomBot ? `@${creds.telegramBotUsername}` : undefined,
          deepLink: `${process.env.NEXT_PUBLIC_API_ENDPOINT_URL || "https://aromatic-akita-723.convex.site"}/start?slug=${child.slug}`,
        });
      }

      return {
        clientCount: enriched.length,
        clients: enriched,
        _note: "Clients in 'testing' mode use the platform bot. Use deploy_telegram_bot to give them their own branded bot.",
      };
    } catch (e) {
      return { error: String(e) };
    }
  },
};

/**
 * deploy_telegram_bot — Deploy a custom Telegram bot for a client sub-org
 */
export const deployTelegramBotTool: AITool = {
  name: "deploy_telegram_bot",
  description: `Deploy a custom Telegram bot for a client sub-organization.
The agency owner must first create a bot via @BotFather in Telegram and provide the token.
After deployment, customers message @CustomBotName directly instead of using the platform bot.`,
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      clientSlug: {
        type: "string",
        description: "The client org slug (e.g., 'apotheke-schmidt')",
      },
      botToken: {
        type: "string",
        description: "The bot token from @BotFather (e.g., '1234567890:ABCdef...')",
      },
    },
    required: ["clientSlug", "botToken"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    if (!ctx.organizationId) {
      return { error: "No organization context" };
    }

    try {
      // 1. Look up child org by slug
      const child = await ctx.runQuery(
        getInternal().organizations.getOrgBySlug,
        { slug: args.clientSlug as string }
      );

      if (!child) {
        return { error: "Client organization not found" };
      }

      // 2. Verify parent-child relationship
      if (String(child.parentOrganizationId) !== String(ctx.organizationId)) {
        return { error: "Client organization is not under your agency" };
      }

      // 3. Deploy the bot
      const result = await ctx.runAction(
        getInternal().channels.telegramBotSetup.deployBot,
        {
          organizationId: child._id,
          botToken: args.botToken as string,
        }
      );

      return result;
    } catch (e) {
      return { error: String(e) };
    }
  },
};

/**
 * get_client_org_stats — Get performance stats for a client org
 */
export const getClientOrgStatsTool: AITool = {
  name: "get_client_org_stats",
  description: "Get conversation and credit usage stats for a specific client organization. Use the client's org slug.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      clientSlug: {
        type: "string",
        description: "The client's org slug (e.g., 'acme-apotheke-schmidt')",
      },
    },
    required: ["clientSlug"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    if (!ctx.organizationId) {
      return { error: "No organization context" };
    }

    try {
      // Look up child org by slug
      const child = await ctx.runQuery(
        getInternal().organizations.getOrgBySlug,
        { slug: args.clientSlug as string }
      );

      if (!child || String(child.parentOrganizationId) !== String(ctx.organizationId)) {
        return { error: "Client organization not found or not under your agency" };
      }

      // Get credit balance
      const credits = await ctx.runQuery(
        getInternal().credits.index.getCreditBalanceInternalQuery,
        { organizationId: child._id }
      );

      // Get agents for this sub-org
      const agents = await ctx.runQuery(
        getInternal().agentOntology.getAllActiveAgentsForOrg,
        { organizationId: child._id }
      );

      // Get recent metrics for each agent
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      let totalConversations = 0;
      let totalMessages = 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const agent of (agents as any[]) || []) {
        try {
          const metrics = await ctx.runQuery(
            getInternal().ai.selfImprovement.getMetricsSince,
            { agentId: agent._id, since: weekAgo }
          );
          if (metrics) {
            totalConversations += metrics.length;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            totalMessages += metrics.reduce((s: number, m: any) => s + (m.messageCount || 0), 0);
          }
        } catch {
          // Metrics may not exist for all agents
        }
      }

      return {
        client: child.name,
        slug: child.slug,
        isActive: child.isActive,
        credits: credits ? {
          monthly: credits.monthlyCredits,
          purchased: credits.purchasedCredits,
        } : { message: "Using parent credit pool" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        agentCount: (agents as any[])?.length || 0,
        last7Days: {
          conversations: totalConversations,
          avgMessagesPerConversation: totalConversations > 0
            ? (totalMessages / totalConversations).toFixed(1)
            : "N/A",
        },
      };
    } catch (e) {
      return { error: String(e) };
    }
  },
};
