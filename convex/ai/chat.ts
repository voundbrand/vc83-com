/**
 * AI Chat Action
 *
 * Main entry point for AI conversations using OpenRouter
 */

import { action } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");
import { getToolSchemas, executeTool } from "./tools/registry";
import { calculateCostFromUsage } from "./modelPricing";
import { getAgentMessageCost } from "../credits/index";
import {
  detectProvider,
  formatToolResult,
  formatToolError,
  getProviderConfig,
} from "./modelAdapters";
import {
  SAFE_FALLBACK_MODEL_ID,
  determineModelSelectionSource,
  resolveOrgDefaultModel,
  resolveRequestedModel,
  selectFirstPlatformEnabledModel,
} from "./modelPolicy";
import {
  resolveOpenRouterAuthProfiles,
} from "./authProfilePolicy";
import { shouldRequireToolApproval, type ToolApprovalAutonomyLevel } from "./escalation";
import { getFeatureRequestMessage, detectUserLanguage } from "./i18nHelper";
import { getPageBuilderPrompt } from "./prompts/pageBuilderSystem";
import { composeKnowledgeContract } from "./systemKnowledge";
import {
  normalizeToolCallsForProvider,
  parseToolCallArguments,
} from "./toolBroker";
import {
  buildOpenRouterMessages,
  executeChatCompletionWithFailover,
  type ChatRuntimeFailoverResult,
} from "./chatRuntimeOrchestration";

// Type definitions for OpenRouter API
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  // tool_calls format varies between API and DB storage
  tool_calls?: unknown;
  tool_call_id?: string;
}

/**
 * Generate a session title from the first user message
 * Creates a concise, descriptive title based on the context
 */
function generateSessionTitle(
  message: string,
  context?: "normal" | "page_builder" | "layers_builder"
): string {
  // Strip any mode prefixes like [PLANNING MODE] or [DOCS MODE]
  const cleanMessage = message
    .replace(/^\[(PLANNING MODE|DOCS MODE)[^\]]*\]\s*/i, "")
    .replace(/^---[\s\S]*?---\s*/, "") // Remove attached content blocks
    .trim();

  // Extract the core intent (first sentence or up to 60 chars)
  let title = cleanMessage.split(/[.!?\n]/)[0].trim();

  // If too long, truncate intelligently
  if (title.length > 60) {
    // Try to break at a word boundary
    const truncated = title.substring(0, 57);
    const lastSpace = truncated.lastIndexOf(" ");
    title = lastSpace > 30 ? truncated.substring(0, lastSpace) + "..." : truncated + "...";
  }

  // Add context prefix for page builder sessions
  if (context === "page_builder") {
    // Check for common patterns and create descriptive titles
    const lowerMessage = cleanMessage.toLowerCase();

    if (lowerMessage.includes("landing page")) {
      const match = cleanMessage.match(/landing page (?:for |about )?(?:a |an |my )?([^.!?\n]+)/i);
      if (match) {
        title = `Landing: ${match[1].substring(0, 40)}${match[1].length > 40 ? "..." : ""}`;
      }
    } else if (lowerMessage.includes("contact form") || lowerMessage.includes("form")) {
      title = title.startsWith("Create") ? title : `Form: ${title}`;
    } else if (lowerMessage.includes("dashboard")) {
      title = title.startsWith("Create") ? title : `Dashboard: ${title}`;
    } else if (lowerMessage.includes("portfolio")) {
      title = `Portfolio: ${title.replace(/portfolio/i, "").trim() || "Personal"}`;
    }
  }

  // Fallback if title is empty
  if (!title || title.length < 3) {
    title = context === "page_builder" ? "New Page" : "New Chat";
  }

  return title;
}

interface ToolCallFromAPI {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string | null;
      tool_calls?: ToolCallFromAPI[];
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result: unknown;
  status: "success" | "failed" | "pending_approval";
  error?: string;
}

interface ConversationMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
    status: "success" | "failed";
    error?: string;
  }>;
}

interface ModelResolutionPayload {
  requestedModel?: string;
  selectedModel: string;
  selectionSource: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

export function buildModelResolutionPayload(args: {
  requestedModel?: string;
  selectedModel: string;
  selectionSource: string;
  usedModel?: string;
  selectedAuthProfileId?: string | null;
  usedAuthProfileId?: string | null;
}): ModelResolutionPayload {
  const modelFallbackUsed =
    typeof args.usedModel === "string" && args.usedModel !== args.selectedModel;
  const authProfileFallbackUsed =
    typeof args.selectedAuthProfileId === "string" &&
    typeof args.usedAuthProfileId === "string" &&
    args.selectedAuthProfileId !== args.usedAuthProfileId;
  const selectionFallbackUsed =
    args.selectionSource !== "preferred" && args.selectionSource !== "session_pinned";
  const fallbackUsed =
    selectionFallbackUsed || modelFallbackUsed || authProfileFallbackUsed;
  return {
    requestedModel: args.requestedModel,
    selectedModel: args.usedModel ?? args.selectedModel,
    selectionSource: args.selectionSource,
    fallbackUsed,
    fallbackReason: modelFallbackUsed
      ? "retry_chain"
      : authProfileFallbackUsed
      ? "auth_profile_rotation"
      : selectionFallbackUsed
      ? args.selectionSource
      : undefined,
  };
}

const CHAT_DANGEROUS_TOOL_ALLOWLIST = [
  "process_payment",
  "send_bulk_crm_email",
  "send_email_from_template",
  "create_invoice",
  "publish_checkout",
  "publish_all",
  "update_organization_settings",
  "configure_ai_models",
  "propose_soul_update",
];

interface ChatToolApprovalPolicy {
  autonomyLevel: ToolApprovalAutonomyLevel;
  requireApprovalFor: string[];
}

export function resolveChatToolApprovalPolicy(settings: {
  humanInLoopEnabled?: boolean;
  toolApprovalMode?: "all" | "dangerous" | "none";
}): ChatToolApprovalPolicy {
  const approvalMode = settings.toolApprovalMode ?? "all";
  const humanInLoopEnabled = settings.humanInLoopEnabled !== false;

  if (!humanInLoopEnabled || approvalMode === "none") {
    return {
      autonomyLevel: "autonomous",
      requireApprovalFor: [],
    };
  }

  if (approvalMode === "dangerous") {
    return {
      autonomyLevel: "autonomous",
      requireApprovalFor: CHAT_DANGEROUS_TOOL_ALLOWLIST,
    };
  }

  return {
    autonomyLevel: "supervised",
    requireApprovalFor: [],
  };
}

export const sendMessage = action({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    message: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    selectedModel: v.optional(v.string()),
    isAutoRecovery: v.optional(v.boolean()), // Flag to bypass proposals for auto-recovery
    context: v.optional(v.union(v.literal("normal"), v.literal("page_builder"), v.literal("layers_builder"))), // Context for system prompt selection
    builderMode: v.optional(v.union(v.literal("prototype"), v.literal("connect"))), // Builder mode for tool filtering
    isSetupMode: v.optional(v.boolean()), // Setup mode for agent creation wizard (injects system knowledge)
  },
  handler: async (ctx, args): Promise<{
    conversationId: Id<"aiConversations">;
    slug?: string;
    message: string;
    toolCalls: ToolCallResult[];
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
    cost: number;
    modelResolution: ModelResolutionPayload;
  }> => {
    // 1. Get or create conversation
    let conversationId: Id<"aiConversations"> | undefined = args.conversationId;
    let conversationSlug: string | undefined;
    const isNewConversation = !conversationId;

    if (!conversationId) {
      // Generate a title from the first message based on context
      const sessionTitle = generateSessionTitle(args.message, args.context);

      conversationId = await (ctx as any).runMutation(generatedApi.api.ai.conversations.createConversation, {
        organizationId: args.organizationId,
        userId: args.userId,
        title: sessionTitle,
      }) as Id<"aiConversations">;

      console.log(`[AI Chat] Created new conversation with title: "${sessionTitle}"`);
    }

    if (!conversationId) {
      throw new Error("Failed to initialize conversation");
    }

    // 2. Add user message
    await (ctx as any).runMutation(generatedApi.api.ai.conversations.addMessage, {
      conversationId,
      role: "user",
      content: args.message,
      timestamp: Date.now(),
    });

    // 3. Get conversation history
    const conversation = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getConversation, {
      conversationId,
    }) as { messages: ConversationMessage[]; slug?: string; modelId?: string | null };

    // Capture slug for new conversations (to return for URL update)
    if (isNewConversation && conversation.slug) {
      conversationSlug = conversation.slug;
    }

    const useLegacyPageBuilderFlow = args.context === "page_builder";
    if (!useLegacyPageBuilderFlow) {
      const externalContactIdentifier = `desktop:${args.userId}:${conversationId}`;
      const agentResult = await (ctx as any).runAction(
        generatedApi.api.ai.agentExecution.processInboundMessage,
        {
          organizationId: args.organizationId,
          channel: "desktop",
          externalContactIdentifier,
          message: args.message,
          metadata: {
            skipOutbound: true,
            source: "desktop_chat",
            conversationId,
            userId: args.userId,
            selectedModel: args.selectedModel,
          },
        }
      ) as {
        status: string;
        message?: string;
        response?: string;
        toolResults?: Array<{ tool: string; status: string; result?: unknown; error?: string }>;
      };

      if (agentResult.status === "credits_exhausted") {
        throw new Error("CREDITS_EXHAUSTED: Not enough credits for this request.");
      }
      if (agentResult.status === "rate_limited") {
        throw new Error(agentResult.message || "Rate limit exceeded. Please try again later.");
      }
      if (agentResult.status === "error") {
        throw new Error(agentResult.message || "Failed to process message via agent runtime.");
      }

      const toolCalls: ToolCallResult[] = (agentResult.toolResults || []).map((toolResult, index) => ({
        id: `agent_tool_${Date.now()}_${index}`,
        name: toolResult.tool,
        arguments: {},
        result: toolResult.result,
        status:
          toolResult.status === "success"
            ? "success"
            : toolResult.status === "pending_approval"
              ? "pending_approval"
              : "failed",
        error: toolResult.error,
      }));

      const assistantMessage = (agentResult.response || agentResult.message || "").trim();
      if (assistantMessage.length > 0) {
        const executedToolCalls = toolCalls.filter(
          (toolCall): toolCall is ToolCallResult & { status: "success" | "failed" } =>
            toolCall.status === "success" || toolCall.status === "failed"
        );
        await (ctx as any).runMutation(generatedApi.api.ai.conversations.addMessage, {
          conversationId,
          role: "assistant",
          content: assistantMessage,
          timestamp: Date.now(),
          toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
          modelResolution: {
            requestedModel: args.selectedModel,
            selectedModel: args.selectedModel || "agent_execution",
            selectionSource: "agent_execution",
            fallbackUsed: false,
          },
        });
      }

      return {
        conversationId: conversationId!,
        slug: conversationSlug,
        message: assistantMessage,
        toolCalls,
        usage: null,
        cost: 0,
        modelResolution: {
          requestedModel: args.selectedModel,
          selectedModel: args.selectedModel || "agent_execution",
          selectionSource: "agent_execution",
          fallbackUsed: false,
        },
      };
    }

    // 4. Get AI settings for model selection
    const settings = await (ctx as any).runQuery(generatedApi.api.ai.settings.getAISettings, {
      organizationId: args.organizationId,
    });

    if (!settings?.enabled) {
      throw new Error("AI features not enabled for this organization");
    }

    // Check rate limit
    const rateLimit = await (ctx as any).runQuery(generatedApi.api.ai.settings.checkRateLimit, {
      organizationId: args.organizationId,
    });

    if (rateLimit.exceeded) {
      throw new Error("Rate limit exceeded. Please try again in an hour.");
    }

    // Check budget
    if (settings.monthlyBudgetUsd && settings.currentMonthSpend >= settings.monthlyBudgetUsd) {
      throw new Error("Monthly AI budget exceeded. Please increase your budget or wait until next month.");
    }

    const chatApprovalPolicy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: settings.humanInLoopEnabled,
      toolApprovalMode: settings.toolApprovalMode,
    });

    // 5. Resolve auth profiles for two-stage failover
    const authProfiles = resolveOpenRouterAuthProfiles({
      llmSettings: settings.llm,
      envOpenRouterApiKey: process.env.OPENROUTER_API_KEY,
    });
    if (authProfiles.length === 0) {
      throw new Error("No OpenRouter auth profiles are currently configured");
    }
    const authProfileFailureCounts = new Map<string, number>();
    for (const profile of settings.llm.authProfiles ?? []) {
      if (!profile || typeof profile.profileId !== "string") {
        continue;
      }
      authProfileFailureCounts.set(profile.profileId.trim(), profile.failureCount ?? 0);
    }

    const platformEnabledModels = await (ctx as any).runQuery(
      generatedApi.api.ai.platformModels.getEnabledModels,
      {}
    ) as Array<{ id: string }>;

    if (platformEnabledModels.length === 0) {
      throw new Error("No platform-enabled AI models are currently configured");
    }

    const conversationPinnedModel =
      typeof conversation.modelId === "string" && conversation.modelId.trim().length > 0
        ? conversation.modelId.trim()
        : null;
    const preferredModel = resolveRequestedModel(settings, args.selectedModel);
    const orgDefaultModel = resolveOrgDefaultModel(settings);
    const orgEnabledModelIds = Array.isArray(settings.llm.enabledModels)
      ? settings.llm.enabledModels.map(
          (enabled: { modelId?: string }) => enabled.modelId
        )
      : [];
    const firstPlatformEnabledModel = platformEnabledModels[0]?.id ?? null;
    const model = selectFirstPlatformEnabledModel(
      [
        !args.selectedModel ? conversationPinnedModel : null,
        preferredModel,
        orgDefaultModel,
        SAFE_FALLBACK_MODEL_ID,
        firstPlatformEnabledModel,
      ],
      platformEnabledModels.map((platformModel) => platformModel.id)
    );

    if (!model) {
      throw new Error("Unable to resolve a platform-enabled model for this organization");
    }

    const selectionSource =
      !args.selectedModel && conversationPinnedModel && model === conversationPinnedModel
        ? "session_pinned"
        : determineModelSelectionSource({
            selectedModel: model,
            preferredModel,
            orgDefaultModel,
            safeFallbackModelId: SAFE_FALLBACK_MODEL_ID,
            platformFirstEnabledModelId: firstPlatformEnabledModel,
          });
    const messageCreditCost = getAgentMessageCost(model);

    // Ensure users receive daily credits (idempotent) before pre-flight checks.
    try {
      await (ctx as any).runMutation(
        generatedApi.internal.credits.index.grantDailyCreditsInternalMutation,
        { organizationId: args.organizationId }
      );
    } catch (error) {
      console.warn("[AI Chat] Failed to grant daily credits (non-blocking):", error);
    }

    const creditCheck = await (ctx as any).runQuery(
      generatedApi.internal.credits.index.checkCreditsInternalQuery,
      {
        organizationId: args.organizationId,
        requiredAmount: messageCreditCost,
      }
    ) as { hasCredits: boolean; totalCredits: number };

    if (!creditCheck.hasCredits) {
      try {
        await (ctx as any).scheduler.runAfter(
          0,
          generatedApi.internal.credits.notifications.notifyCreditExhausted,
          { organizationId: args.organizationId }
        );
      } catch (error) {
        console.warn("[AI Chat] Failed to schedule exhausted-credit notification:", error);
      }

      throw new Error(
        `CREDITS_EXHAUSTED: Not enough credits (have ${creditCheck.totalCredits}, need ${messageCreditCost}).`
      );
    }

    const modelPricingCache = new Map<string, {
      promptPerMToken: number;
      completionPerMToken: number;
      source: "aiModels" | "fallback";
      usedFallback: boolean;
      warning?: string;
    }>();
    const getModelPricing = async (modelId: string) => {
      const cached = modelPricingCache.get(modelId);
      if (cached) {
        return cached;
      }

      const resolvedModelPricing = await (ctx as any).runQuery(
        generatedApi.api.ai.modelPricing.getModelPricing,
        { modelId }
      ) as {
        promptPerMToken: number;
        completionPerMToken: number;
        source: "aiModels" | "fallback";
        usedFallback: boolean;
        warning?: string;
      };

      if (resolvedModelPricing.usedFallback) {
        console.warn("[AI Chat][PricingFallback]", {
          modelId,
          source: resolvedModelPricing.source,
          warning: resolvedModelPricing.warning,
        });
      }

      modelPricingCache.set(modelId, resolvedModelPricing);
      return resolvedModelPricing;
    };
    await getModelPricing(model);

    const calculateUsageCost = (
      usage: { prompt_tokens: number; completion_tokens: number } | null | undefined,
      modelId: string
    ) => {
      const pricing = modelPricingCache.get(modelId);
      if (!pricing) {
        throw new Error(`Missing pricing for model ${modelId}`);
      }
      return calculateCostFromUsage(
        usage ?? { prompt_tokens: 0, completion_tokens: 0 },
        pricing
      );
    };

    // 6. Prepare messages for AI (legacy page builder path only).
    // Normal desktop chat now routes through ai.agentExecution.processInboundMessage.
    const isPageBuilderContext = args.context === "page_builder";
    if (!isPageBuilderContext) {
      throw new Error("Deprecated ai.chat non-page_builder path invoked unexpectedly.");
    }

    let systemPrompt = getPageBuilderPrompt(args.builderMode);

    // For setup mode (agent creation wizard), inject ALL system knowledge (~78KB)
    // This includes: meta-context, hero-definition, guide-positioning, plan-and-cta,
    // knowledge-base-structure, follow-up-sequences, and all adapted frameworks
    if (args.isSetupMode && isPageBuilderContext) {
      const setupKnowledgeLoad = composeKnowledgeContract("setup");
      const setupKnowledge = setupKnowledgeLoad.documents;
      if (setupKnowledge.length > 0) {
        const knowledgeBlock = setupKnowledge
          .map((k) => `## ${k.name}\n\n${k.content}`)
          .join("\n\n---\n\n");

        systemPrompt = `${systemPrompt}

---

# SETUP MODE: Agent Creation Wizard

You are helping an agency owner configure an AI agent for their client. Follow the system knowledge frameworks below to guide them through the setup process.

**Your role:**
1. Interview the agency owner about their client's business using the Hero Definition Framework
2. Help position the AI agent as a helpful guide using the Guide Positioning Framework
3. Create a clear action plan using the Plan and CTA Framework
4. Build a comprehensive knowledge base using the Knowledge Base Structure Guide
5. Design effective conversations using the Conversation Design Framework

**Output format:**
Generate files in the builder file explorer:
- \`agent-config.json\` - Agent configuration (system prompt, FAQ, tools, channels)
- \`kb/hero-profile.md\` - Client business profile
- \`kb/guide-positioning.md\` - AI agent personality and voice
- \`kb/action-plan.md\` - Customer journey and CTAs
- \`kb/faq.md\` - Common questions and answers
- \`kb/services.md\` - Products and services offered
- \`kb/policies.md\` - Business policies (hours, returns, etc.)
- \`kb/success-stories.md\` - Testimonials and case studies
- \`kb/industry-context.md\` - Industry-specific knowledge

**Deterministic kickoff contract (required):**
1. On the first setup response, always emit \`agent-config.json\` plus at least one \`kb/*.md\` file.
2. Emit every file as a fenced block with language and filename on the opening fence line.
3. Keep file paths stable between turns and update file contents instead of renaming.
4. If business details are missing, use explicit placeholders instead of skipping required files.

**Fence syntax (required):**
\`\`\`json agent-config.json
{
  "name": "example-agent"
}
\`\`\`

\`\`\`markdown kb/hero-profile.md
# Hero Profile
...
\`\`\`

---

# System Knowledge Library

${knowledgeBlock}`;

        console.log("[AI Chat][KnowledgeLoad]", setupKnowledgeLoad.telemetry);
        console.log(`[AI Chat] Injected ${setupKnowledge.length} setup knowledge documents (~${Math.round(knowledgeBlock.length / 1024)}KB)`);
      }
    }

    // For page builder context, inject RAG design patterns if available
    if (isPageBuilderContext && args.message) {
      try {
        const ragContext = await (ctx as any).runAction(
          generatedApi.internal.designEngine.buildRAGContext,
          {
            userMessage: args.message,
            limit: 5,
          }
        );

        if (ragContext) {
          // Inject RAG context at the end of the system prompt
          systemPrompt = `${systemPrompt}\n\n---\n\n${ragContext}`;
          console.log("[AI Chat] Injected RAG design patterns into system prompt");
        }
      } catch (ragError) {
        // Don't fail the request if RAG fails - just log and continue
        console.log("[AI Chat] RAG retrieval skipped:", ragError instanceof Error ? ragError.message : ragError);
      }
    }

    console.log(`[AI Chat] Using ${isPageBuilderContext ? 'page builder' : 'normal chat'} system prompt`);

    const messages: ChatMessage[] = buildOpenRouterMessages({
      systemPrompt,
      conversationMessages: conversation.messages,
      onFilteredIncompleteToolCall: ({ messageIndex }) => {
        console.log(
          `[AI Chat] Filtering out incomplete tool call from history (message ${messageIndex})`
        );
      },
    });

    console.log(`[AI Chat] Built ${messages.length} messages for OpenRouter (${conversation.messages.length} in DB)`);

    // 7. Call OpenRouter with two-stage failover
    // In prototype mode (page_builder context), only provide read-only tools
    const builderMode = isPageBuilderContext ? args.builderMode : undefined;
    const availableTools = getToolSchemas(builderMode);

    console.log(`[AI Chat] Builder mode: ${builderMode || 'none'}, available tools: ${availableTools.length}`);
    const recordAuthProfileSuccess = async ({
      organizationId,
      profileId,
    }: {
      organizationId: Id<"organizations">;
      profileId: string;
    }) => {
      await (ctx as any).runMutation(
        generatedApi.internal.ai.settings.recordAuthProfileSuccess,
        {
          organizationId,
          profileId,
        }
      );
    };
    const recordAuthProfileFailure = async ({
      organizationId,
      profileId,
      reason,
      cooldownUntil,
    }: {
      organizationId: Id<"organizations">;
      profileId: string;
      reason: string;
      cooldownUntil: number;
    }) => {
      await (ctx as any).runMutation(
        generatedApi.internal.ai.settings.recordAuthProfileFailure,
        {
          organizationId,
          profileId,
          reason,
          cooldownUntil,
        }
      );
    };

    const initialCompletion = await executeChatCompletionWithFailover({
      organizationId: args.organizationId,
      primaryModelId: model,
      messages,
      tools: availableTools,
      selectedModel: args.selectedModel,
      conversationPinnedModel,
      orgEnabledModelIds,
      orgDefaultModelId: orgDefaultModel,
      platformEnabledModelIds: platformEnabledModels.map((platformModel) => platformModel.id),
      safeFallbackModelId: SAFE_FALLBACK_MODEL_ID,
      authProfiles,
      llmTemperature: settings.llm.temperature,
      llmMaxTokens: settings.llm.maxTokens,
      authProfileFailureCounts,
      onAuthProfileSuccess: recordAuthProfileSuccess,
      onAuthProfileFailure: recordAuthProfileFailure,
      onFailoverSuccess: ({
        primaryModelId,
        usedModel,
        selectedAuthProfileId,
        usedAuthProfileId,
        modelFallbackUsed,
        authProfileFallbackUsed,
      }) => {
        const failoverStage = modelFallbackUsed
          ? "model_failover"
          : authProfileFallbackUsed
            ? "auth_profile_rotation"
            : "none";
        console.log("[AI Chat][FailoverStage]", {
          primaryModelId,
          usedModel,
          selectedAuthProfileId,
          usedAuthProfileId,
          failoverStage,
        });
      },
      onAttemptFailure: ({ modelId, profileId, errorMessage }) => {
        console.error(
          `[AI Chat] Model ${modelId} failed with auth profile ${profileId}:`,
          errorMessage
        );
      },
      includeSessionPin: true,
    }) as ChatRuntimeFailoverResult;
    let response: ChatResponse = initialCompletion.response as unknown as ChatResponse;
    let usedModel = initialCompletion.usedModel;
    let selectedAuthProfileId = initialCompletion.selectedAuthProfileId;
    let usedAuthProfileId = initialCompletion.usedAuthProfileId;
    let authProfileFailoverCount = initialCompletion.authProfileFallbackUsed ? 1 : 0;
    let modelFailoverCount = initialCompletion.modelFallbackUsed ? 1 : 0;
    await getModelPricing(usedModel);
    let provider = detectProvider(usedModel);
    let providerConfig = getProviderConfig(provider);

    // 8. Handle tool calls (with provider-specific max rounds to prevent infinite loops)
    const toolCalls: ToolCallResult[] = [];
    let toolCallRounds = 0;
    let maxToolCallRounds = providerConfig.maxToolCallRounds;
    let hasProposedTools = false; // Track if any tools were proposed (not executed)

    while (toolCallRounds < maxToolCallRounds) {
      const currentToolCalls = response.choices[0].message.tool_calls;
      if (!currentToolCalls) {
        break;
      }

      toolCallRounds++;
      console.log(`[AI Chat] Tool call round ${toolCallRounds}`);

      // Add assistant message with tool calls first
      // Ensure all tool calls contain normalized argument strings before replaying to providers.
      const toolCallsWithArgs = normalizeToolCallsForProvider<ToolCallFromAPI>(
        currentToolCalls
      );

      messages.push({
        role: "assistant" as const,
        content: response.choices[0].message.content || "",
        tool_calls: toolCallsWithArgs,
      });

      // Execute each tool call
      for (const toolCall of toolCallsWithArgs) {
        const startTime = Date.now();

        const parsedArgsResult = parseToolCallArguments(
          toolCall.function.arguments,
          { strict: false }
        );
        const parsedArgs = parsedArgsResult.args;
        if (parsedArgsResult.error) {
          console.error(
            `[AI Chat] Failed to parse tool arguments for ${toolCall.function.name}:`,
            toolCall.function.arguments,
            parsedArgsResult.error
          );
        }

        // CRITICAL DECISION: Should this tool be proposed or executed immediately?
        const needsApproval = shouldRequireToolApproval({
          autonomyLevel: chatApprovalPolicy.autonomyLevel,
          toolName: toolCall.function.name,
          requireApprovalFor: chatApprovalPolicy.requireApprovalFor,
        });
        // Auto-recovery bypasses approval so retries can execute immediately.
        const shouldPropose = !args.isAutoRecovery && needsApproval;

        try {

          let result: unknown;

          if (shouldPropose) {
            // Create a proposal instead of executing
            const executionId = await (ctx as any).runMutation(generatedApi.api.ai.conversations.proposeToolExecution, {
              conversationId,
              organizationId: args.organizationId,
              userId: args.userId,
              toolName: toolCall.function.name,
              parameters: parsedArgs,
              proposalMessage: `AI wants to execute: ${toolCall.function.name}`,
            });

            result = {
              status: "pending_approval",
              executionId,
              message: `I've created a proposal for your review. Please approve it in the Tool Execution panel.`,
            };

            hasProposedTools = true; // Mark that we have proposals pending
            console.log("[AI Chat] Tool proposed for approval:", toolCall.function.name, executionId);
          } else {
            // Execute tool immediately
            result = await executeTool(
              {
                ...ctx,
                organizationId: args.organizationId,
                userId: args.userId,
                conversationId, // Pass conversationId for feature requests
              },
              toolCall.function.name,
              parsedArgs
            );
          }

          const durationMs = Date.now() - startTime;

          // If this was a proposal, don't log it as executed yet
          // The logging already happened in proposeToolExecution
          if (!shouldPropose) {
            // Determine status based on result.success field
            // Tools can return { success: false, error: "...", actionButton: {...} } for OAuth errors
            const executionStatus = result && typeof result === 'object' && 'success' in result && result.success === false
              ? "failed"
              : "success";

            // Log execution (use parsedArgs, not re-parse!)
            await (ctx as any).runMutation(generatedApi.api.ai.conversations.logToolExecution, {
              conversationId,
              organizationId: args.organizationId,
              userId: args.userId,
              toolName: toolCall.function.name,
              parameters: parsedArgs,
              result,
              status: executionStatus,
              tokensUsed: response.usage?.total_tokens || 0,
              costUsd: calculateUsageCost(response.usage, usedModel),
              executedAt: Date.now(),
              durationMs,
            });
          }

          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: parsedArgs,
            result,
            status: shouldPropose ? "pending_approval" : "success",
          });

          // Add tool result to messages ONLY if tool was actually executed
          // (Not when it's just proposed for approval)
          if (!shouldPropose) {
            const toolResultMessage = formatToolResult(
              provider,
              toolCall.id,
              toolCall.function.name,
              result
            );
            messages.push(toolResultMessage as ChatMessage);
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[AI Chat] Tool execution failed: ${toolCall.function.name}`, error);

          // Log failed execution (use parsedArgs, not re-parse!)
          await (ctx as any).runMutation(generatedApi.api.ai.conversations.logToolExecution, {
            conversationId,
            organizationId: args.organizationId,
            userId: args.userId,
            toolName: toolCall.function.name,
            parameters: parsedArgs,
            error: errorMessage,
            status: "failed",
            tokensUsed: response.usage?.total_tokens || 0,
            costUsd: calculateUsageCost(response.usage, usedModel),
            executedAt: Date.now(),
            durationMs: Date.now() - startTime,
          });

          toolCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: parsedArgs,
            result: undefined,
            error: errorMessage,
            status: "failed",
          });

          // Add tool error to messages (provider-specific format)
          // Create a user-friendly error message for feature requests in the user's language
          const isFeatureRequest = errorMessage.includes("not yet") ||
                                   errorMessage.includes("coming soon") ||
                                   errorMessage.includes("placeholder");

          // Get user's preferred language from organization settings
          const userLanguage = detectUserLanguage(settings);

          const userFriendlyError = isFeatureRequest
            ? getFeatureRequestMessage(toolCall.function.name, userLanguage)
            : errorMessage;

          // Add tool error to messages ONLY if tool was actually executed
          // (Proposals should never error since they don't execute)
          if (!shouldPropose) {
            const toolErrorMessage = formatToolError(
              provider,
              toolCall.id,
              toolCall.function.name,
              userFriendlyError
            );
            messages.push(toolErrorMessage as ChatMessage);
          }

          // 🚨 SEND FEATURE REQUEST EMAIL TO DEV TEAM
          // This helps prioritize which tools to build next based on actual user needs
          try {
            // Get the original user message from conversation
            const conversationData = await (ctx as any).runQuery(generatedApi.api.ai.conversations.getConversation, {
              conversationId,
            }) as { messages: ConversationMessage[] };
            const userMessages = conversationData.messages.filter((m) => m.role === "user");
            const lastUserMessage = userMessages[userMessages.length - 1]?.content || args.message;

            // Send feature request email (don't await - fire and forget)
            (ctx as any).runAction(generatedApi.internal.ai.featureRequestEmail.sendFeatureRequest, {
              userId: args.userId,
              organizationId: args.organizationId,
              toolName: toolCall.function.name,
              toolParameters: parsedArgs,
              errorMessage: errorMessage,
              conversationId: conversationId!, // Guaranteed set at this point
              userMessage: lastUserMessage,
              aiResponse: undefined, // Will be filled after AI responds
              occurredAt: Date.now(),
            }).catch((emailError: unknown) => {
              // Don't fail the main flow if email fails
              console.error("[AI Chat] Failed to send feature request email:", emailError);
            });

            console.log(`[AI Chat] Feature request email triggered for failed tool: ${toolCall.function.name}`);
          } catch (emailError) {
            // Don't fail the main flow if email system fails
            console.error("[AI Chat] Error in feature request email system:", emailError);
          }
        }
      }

      // CRITICAL: If any tools were proposed (not executed), break out of the loop
      // We can't continue the conversation because we don't have tool results yet
      // The user must approve the proposals first, then executeApprovedTool will feed results back
      if (hasProposedTools) {
        console.log("[AI Chat] Breaking tool loop - waiting for user approval");
        break;
      }

      // Get next response after tool execution (without tools to force final answer)
      try {
        const followUpCompletion = await executeChatCompletionWithFailover({
          organizationId: args.organizationId,
          primaryModelId: usedModel,
          messages,
          selectedModel: args.selectedModel,
          conversationPinnedModel,
          orgEnabledModelIds,
          orgDefaultModelId: orgDefaultModel,
          platformEnabledModelIds: platformEnabledModels.map((platformModel) => platformModel.id),
          safeFallbackModelId: SAFE_FALLBACK_MODEL_ID,
          authProfiles,
          llmTemperature: settings.llm.temperature,
          llmMaxTokens: settings.llm.maxTokens,
          authProfileFailureCounts,
          onAuthProfileSuccess: recordAuthProfileSuccess,
          onAuthProfileFailure: recordAuthProfileFailure,
          onFailoverSuccess: ({
            primaryModelId,
            usedModel,
            selectedAuthProfileId,
            usedAuthProfileId,
            modelFallbackUsed,
            authProfileFallbackUsed,
          }) => {
            const failoverStage = modelFallbackUsed
              ? "model_failover"
              : authProfileFallbackUsed
                ? "auth_profile_rotation"
                : "none";
            console.log("[AI Chat][FailoverStage]", {
              primaryModelId,
              usedModel,
              selectedAuthProfileId,
              usedAuthProfileId,
              failoverStage,
            });
          },
          onAttemptFailure: ({ modelId, profileId, errorMessage }) => {
            console.error(
              `[AI Chat] Model ${modelId} failed with auth profile ${profileId}:`,
              errorMessage
            );
          },
          includeSessionPin: false,
          preferredAuthProfileId: usedAuthProfileId ?? selectedAuthProfileId,
        }) as ChatRuntimeFailoverResult;
        response = followUpCompletion.response as unknown as ChatResponse;
        usedModel = followUpCompletion.usedModel;
        selectedAuthProfileId = followUpCompletion.selectedAuthProfileId;
        usedAuthProfileId = followUpCompletion.usedAuthProfileId;
        if (followUpCompletion.authProfileFallbackUsed) {
          authProfileFailoverCount += 1;
        }
        if (followUpCompletion.modelFallbackUsed) {
          modelFailoverCount += 1;
        }
        await getModelPricing(usedModel);
        provider = detectProvider(usedModel);
        providerConfig = getProviderConfig(provider);
        maxToolCallRounds = Math.max(
          maxToolCallRounds,
          providerConfig.maxToolCallRounds
        );
      } catch (apiError) {
        const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
        console.error("[AI Chat] OpenRouter API error (after tool execution):", errorMessage);
        throw new Error(errorMessage);
      }
    }

    // If we hit max rounds, log a warning
    if (toolCallRounds >= maxToolCallRounds && response.choices[0].message.tool_calls) {
      console.warn(`[AI Chat] Max tool call rounds (${maxToolCallRounds}) reached, forcing final response`);
    }

    // 9. Save assistant message
    const finalMessage = response.choices[0]?.message;
    if (!finalMessage) {
      throw new Error("No message in final response from OpenRouter");
    }
    const modelResolution = buildModelResolutionPayload({
      requestedModel: args.selectedModel ?? undefined,
      selectedModel: model,
      selectionSource,
      usedModel,
      selectedAuthProfileId,
      usedAuthProfileId,
    });
    const failoverStage =
      modelFailoverCount > 0
        ? "model_failover"
        : authProfileFailoverCount > 0
          ? "auth_profile_rotation"
          : "none";

    await (ctx as any).runMutation(generatedApi.api.ai.conversations.setConversationModel, {
      conversationId,
      modelId: usedModel,
    });

    console.log("[AI Chat][ModelResolution]", {
      selectedModel: model,
      usedModel,
      requestedModel: args.selectedModel ?? null,
      preferredModel,
      orgDefaultModel,
      fallbackModel:
        modelResolution.fallbackUsed
          ? usedModel
          : null,
      selectionSource,
      fallbackReason: modelResolution.fallbackReason ?? null,
      selectedAuthProfileId,
      usedAuthProfileId,
      failoverStage,
      authProfileFailoverCount,
      modelFailoverCount,
      platformEnabledModelCount: platformEnabledModels.length,
      provider,
      context: args.context || "normal",
    });

    // CRITICAL: If tools were proposed (not executed), create a user-friendly message
    // but DON'T include toolCalls in the saved message (they'll break future conversations)
    const executedToolCalls = toolCalls
      .filter((tc): tc is ToolCallResult & { status: "success" | "failed" } =>
        tc.status !== "pending_approval"
      );
    const proposedToolCount = toolCalls.length - executedToolCalls.length;

    // IMPORTANT: Don't add assistant messages to chat when tools are proposed
    // The proposals should ONLY appear in the Tool Execution panel, not in the main chat
    if (proposedToolCount === 0) {
      // No proposals - this is a normal response or executed tool results
      let messageContent = finalMessage.content;
      if (!messageContent) {
        if (executedToolCalls.length > 0) {
          messageContent = `Executed ${executedToolCalls.length} tool(s): ${executedToolCalls.map(t => t.name).join(", ")}`;
        } else {
          messageContent = "I'm here to help, but I didn't generate a response.";
        }
      }

      await (ctx as any).runMutation(generatedApi.api.ai.conversations.addMessage, {
        conversationId,
        role: "assistant",
        content: messageContent,
        timestamp: Date.now(),
        // ONLY save toolCalls if they were actually executed (not just proposed)
        // This prevents breaking the conversation when loading history
        toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
        modelResolution,
      });
    }
    // If proposedToolCount > 0, don't add any chat message - the proposals are in the Tool Execution panel

    // 10. Update monthly spend
    const cost = calculateUsageCost(response.usage, usedModel);
    await (ctx as any).runMutation(generatedApi.api.ai.settings.updateMonthlySpend, {
      organizationId: args.organizationId,
      costUsd: cost,
    });

    // 11. Deduct credits for the successful chat turn.
    try {
      const chatCreditDeduction = await (ctx as any).runMutation(
        generatedApi.internal.credits.index.deductCreditsInternalMutation,
        {
          organizationId: args.organizationId,
          userId: args.userId,
          amount: messageCreditCost,
          action: "agent_message",
          relatedEntityType: "ai_conversation",
          relatedEntityId: String(conversationId),
          softFailOnExhausted: true,
        }
      );

      if (!chatCreditDeduction.success) {
        console.warn("[AI Chat] Credit deduction skipped:", {
          organizationId: args.organizationId,
          errorCode: chatCreditDeduction.errorCode,
          message: chatCreditDeduction.message,
          creditsRequired: chatCreditDeduction.creditsRequired,
          creditsAvailable: chatCreditDeduction.creditsAvailable,
        });
      }
    } catch (error) {
      console.error("[AI Chat] Credit deduction failed after successful response:", error);
    }

    // 12. Collect training data (silent, non-blocking)
    try {
      const exampleType = args.context === "page_builder" ? "page_generation" : "tool_invocation";

      // Try to parse JSON from response for page builder
      let generatedJson: unknown = undefined;
      if (args.context === "page_builder" && finalMessage.content) {
        const jsonMatch = finalMessage.content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          try {
            generatedJson = JSON.parse(jsonMatch[1]);
          } catch {
            // Invalid JSON, leave as undefined
          }
        }
      }

      await (ctx as any).runMutation(generatedApi.internal.ai.trainingData.collectTrainingExample, {
        conversationId: conversationId!,
        organizationId: args.organizationId,
        exampleType,
        input: {
          userMessage: args.message,
          // previousContext could be added if needed
        },
        output: {
          response: finalMessage.content || "",
          generatedJson,
          toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
        },
        modelUsed: usedModel,
      });
    } catch (error) {
      // Don't fail the main request if training data collection fails
      console.error("[Training] Failed to collect training example:", error);
    }

    // Return message only if we saved one (i.e., no proposals)
    const returnMessage = proposedToolCount > 0
      ? "" // No message for proposals - they appear in Tool Execution panel only
      : (finalMessage.content || `Executed ${executedToolCalls.length} tool(s)`);

    return {
      conversationId: conversationId!, // Guaranteed set by createConversation
      slug: conversationSlug,          // Only set for new conversations
      message: returnMessage,
      toolCalls,
      usage: response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      cost,
      modelResolution,
    };
  },
});
