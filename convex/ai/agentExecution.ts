/**
 * AGENT EXECUTION PIPELINE
 *
 * Core runtime for processing inbound messages through an org's AI agent.
 * Reuses OpenRouter client and tool registry from the existing chat system.
 *
 * Pipeline:
 * 1. Load agent config → 2. Check rate limits → 3. Resolve session →
 * 4. Resolve CRM contact → 5. Build context → 6. Call LLM →
 * 7. Execute tools (with autonomy checks) → 8. Store messages →
 * 9. Update stats → 10. Return response
 */

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { OpenRouterClient } from "./openrouter";
import { TOOL_REGISTRY, getToolSchemas } from "./tools/registry";
import type { ToolExecutionContext } from "./tools/registry";
import type { Id } from "../_generated/dataModel";
import { getAgentMessageCost, getToolCreditCost } from "../credits/index";
import { getKnowledgeContent } from "./systemKnowledge/index";
import { buildInterviewPromptContext } from "./interviewRunner";

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
function getInternal(): any { return getApi().internal; }

// ============================================================================
// TYPES
// ============================================================================

interface AgentConfig {
  displayName?: string;
  personality?: string;
  language?: string;
  additionalLanguages?: string[];
  brandVoiceInstructions?: string;
  systemPrompt?: string;
  faqEntries?: Array<{ q: string; a: string }>;
  knowledgeBaseTags?: string[];
  enabledTools?: string[];
  disabledTools?: string[];
  autonomyLevel: "supervised" | "autonomous" | "draft_only";
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  requireApprovalFor?: string[];
  blockedTopics?: string[];
  modelProvider?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  channelBindings?: Array<{ channel: string; enabled: boolean }>;
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

/**
 * Process an inbound message through the agent pipeline.
 * Entry point for all channels (WhatsApp, email, webchat, SMS, API test).
 */
export const processInboundMessage = action({
  args: {
    organizationId: v.id("organizations"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{
    status: string;
    message?: string;
    response?: string;
    toolResults?: Array<{ tool: string; status: string; result?: unknown; error?: string }>;
    sessionId?: string;
  }> => {
    // 1. Load agent config
    const agent = await ctx.runQuery(getInternal().agentOntology.getActiveAgentForOrg, {
      organizationId: args.organizationId,
      channel: args.channel,
    });

    if (!agent) {
      return { status: "error", message: "No active agent found for this organization" };
    }

    const config = (agent.customProperties || {}) as unknown as AgentConfig;

    // 2. Check rate limits
    const rateLimitCheck = await ctx.runQuery(getInternal().ai.agentSessions.checkAgentRateLimit, {
      agentId: agent._id,
      organizationId: args.organizationId,
      maxMessagesPerDay: config.maxMessagesPerDay || 100,
      maxCostPerDay: config.maxCostPerDay || 5.0,
    });

    if (!rateLimitCheck.allowed) {
      return { status: "rate_limited", message: rateLimitCheck.message };
    }

    // 3. Resolve or create session
    const session = await ctx.runMutation(getInternal().ai.agentSessions.resolveSession, {
      agentId: agent._id,
      organizationId: args.organizationId,
      channel: args.channel,
      externalContactIdentifier: args.externalContactIdentifier,
    });

    if (!session) {
      return { status: "error", message: "Failed to create session" };
    }

    // 4. Auto-resolve CRM contact
    if (!(session as any).crmContactId) {
      const contact = await ctx.runQuery(getInternal().ai.agentSessions.resolveContact, {
        organizationId: args.organizationId,
        identifier: args.externalContactIdentifier,
        channel: args.channel,
      });
      if (contact) {
        await ctx.runMutation(getInternal().ai.agentSessions.linkContactToSession, {
          sessionId: session._id,
          crmContactId: contact._id,
        });
      }
    }

    // 4.5. Fetch org's knowledge base documents from media library
    // If agent has knowledgeBaseTags configured, only fetch matching docs
    // TODO: Wire up getKnowledgeBaseDocsInternal once organizationMedia exports it
    const knowledgeBaseDocs: Array<{ filename: string; content: string; description?: string; tags?: string[] }> = [];

    // 4.6. Check for guided interview mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let interviewContext: any = null;
    const sessionData = session as { sessionMode?: string; interviewTemplateId?: Id<"objects"> };

    if (sessionData.sessionMode === "guided" && sessionData.interviewTemplateId) {
      interviewContext = await ctx.runQuery(
        getInternal().ai.interviewRunner.getInterviewContextInternal,
        { sessionId: session._id }
      );
    }

    // 5. Build system prompt
    const systemPrompt = buildAgentSystemPrompt(config, knowledgeBaseDocs, interviewContext);

    // 6. Load conversation history
    const history = await ctx.runQuery(getInternal().ai.agentSessions.getSessionMessages, {
      sessionId: session._id,
      limit: 20,
    });

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of history as Array<{ role: string; content: string }>) {
      messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }

    messages.push({ role: "user", content: args.message });

    // 7. Filter tools for this agent
    const toolSchemas = filterToolsForAgent(config);

    // 7.5. Pre-flight credit check
    const model = config.modelId || "anthropic/claude-sonnet-4-20250514";
    const estimatedCost = getAgentMessageCost(model);

    const creditCheck = await ctx.runQuery(
      getInternal().credits.index.checkCreditsInternalQuery,
      {
        organizationId: args.organizationId,
        requiredAmount: estimatedCost,
      }
    );

    if (!creditCheck.hasCredits) {
      // Fire-and-forget notification to org owner
      ctx.scheduler.runAfter(0, getInternal().credits.notifications.notifyCreditExhausted, {
        organizationId: args.organizationId,
      });

      return {
        status: "credits_exhausted",
        // Customer-facing: never expose credit internals
        message: "Our team is currently unavailable. Please try again later or contact us directly.",
      };
    }

    // 8. Call LLM
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { status: "error", message: "OpenRouter API key not configured" };
    }

    const client = new OpenRouterClient(apiKey);

    const response = await client.chatCompletion({
      model,
      messages,
      tools: toolSchemas.length > 0 ? toolSchemas : undefined,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens || 4096,
    });

    const choice = response.choices?.[0];
    if (!choice) {
      return { status: "error", message: "No response from LLM" };
    }

    const assistantContent = choice.message?.content || "";
    const toolCalls = choice.message?.tool_calls || [];

    // 9. Handle tool calls with autonomy checks
    const toolResults = [];
    for (const toolCall of toolCalls) {
      const toolName = toolCall.function?.name;
      if (!toolName) continue;

      let parsedArgs;
      try {
        parsedArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        toolResults.push({ tool: toolName, status: "error", error: "Invalid arguments" });
        continue;
      }

      const needsApproval = checkNeedsApproval(config, toolName);

      if (needsApproval) {
        // Queue for approval instead of executing
        await ctx.runMutation(getInternal().ai.agentApprovals.createApprovalRequest, {
          agentId: agent._id,
          sessionId: session._id,
          organizationId: args.organizationId,
          actionType: toolName,
          actionPayload: parsedArgs,
        });
        toolResults.push({ tool: toolName, status: "pending_approval" });
      } else {
        // Execute directly
        try {
          const toolCtx: ToolExecutionContext = {
            ...ctx,
            organizationId: args.organizationId,
            userId: agent.createdBy as Id<"users">,
            sessionId: undefined,
            conversationId: undefined,
          };
          const result = await TOOL_REGISTRY[toolName]?.execute(toolCtx, parsedArgs);
          toolResults.push({ tool: toolName, status: "success", result });
        } catch (e) {
          toolResults.push({ tool: toolName, status: "error", error: String(e) });
        }
      }
    }

    // 10. Save messages
    await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
      sessionId: session._id,
      role: "user",
      content: args.message,
    });

    await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
      sessionId: session._id,
      role: "assistant",
      content: assistantContent,
      toolCalls: toolResults.length > 0 ? toolResults : undefined,
    });

    // 10.3. Process interview extraction (guided mode only)
    if (interviewContext && assistantContent) {
      const extractionResults = parseExtractionResults(assistantContent);
      if (extractionResults.length > 0) {
        await ctx.runMutation(getInternal().ai.interviewRunner.advanceInterview, {
          sessionId: session._id,
          extractionResults,
        });
      }
    }

    // 10.5. Deduct credits for LLM call
    const llmCreditCost = getAgentMessageCost(model);
    try {
      await ctx.runMutation(
        getInternal().credits.index.deductCreditsInternalMutation,
        {
          organizationId: args.organizationId,
          amount: llmCreditCost,
          action: "agent_message",
          relatedEntityType: "agent_session",
          relatedEntityId: session._id,
        }
      );
    } catch (e) {
      // Log but don't fail - the message was already processed
      console.error("[AgentExecution] Credit deduction failed:", e);
    }

    // 10.6. Deduct credits for tool executions (only successful ones)
    for (const result of toolResults) {
      if (result.status === "success") {
        const toolCost = getToolCreditCost(result.tool);
        if (toolCost > 0) {
          try {
            await ctx.runMutation(
              getInternal().credits.index.deductCreditsInternalMutation,
              {
                organizationId: args.organizationId,
                amount: toolCost,
                action: `tool_${result.tool}`,
                relatedEntityType: "agent_session",
                relatedEntityId: session._id,
              }
            );
          } catch (e) {
            console.error(`[AgentExecution] Tool credit deduction failed for ${result.tool}:`, e);
          }
        }
      }
    }

    // 11. Update stats
    const tokensUsed = response.usage?.total_tokens || 0;
    const costUsd = calculateCost(response.usage, model);

    await ctx.runMutation(getInternal().ai.agentSessions.updateSessionStats, {
      sessionId: session._id,
      tokensUsed,
      costUsd,
    });

    // 12. Audit log
    await ctx.runMutation(getInternal().ai.agentSessions.logAgentAction, {
      agentId: agent._id,
      organizationId: args.organizationId,
      actionType: "message_processed",
      actionData: {
        channel: args.channel,
        sessionId: session._id,
        toolsUsed: toolResults.map((t) => t.tool),
        tokensUsed,
        costUsd,
      },
    });

    // 13. Route response back through channel provider (outbound delivery)
    // Skip if: metadata.skipOutbound is true (webhook handler sends reply itself),
    // or channel is "api_test" (testing via API, no delivery needed),
    // or there's no response content.
    const meta = (args.metadata as Record<string, unknown>) || {};
    if (assistantContent && !meta.skipOutbound && args.channel !== "api_test") {
      try {
        await ctx.runAction(getInternal().channels.router.sendMessage, {
          organizationId: args.organizationId,
          channel: args.channel,
          recipientIdentifier: args.externalContactIdentifier,
          content: assistantContent,
          providerConversationId: meta.providerConversationId as string | undefined,
        });
      } catch (e) {
        // Don't fail the pipeline if outbound delivery fails.
        // The response is still saved in the session.
        console.error("[AgentExecution] Outbound delivery failed:", e);
      }
    }

    return {
      status: "success",
      response: assistantContent,
      toolResults,
      sessionId: session._id,
    };
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildAgentSystemPrompt(
  config: AgentConfig,
  knowledgeBaseDocs?: Array<{ filename: string; description?: string; content: string; tags?: string[] }>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interviewContext?: any,
): string {
  const parts: string[] = [];

  // System knowledge frameworks (CUSTOMER_MODE: meta-context + conversation-design + handoff)
  // These provide the three-layer hero/guide model, conversation flow, and escalation rules.
  const knowledgeDocs = getKnowledgeContent("customer");
  if (knowledgeDocs.length > 0) {
    parts.push("=== SYSTEM KNOWLEDGE ===");
    for (const doc of knowledgeDocs) {
      parts.push(doc.content);
    }
    parts.push("=== END SYSTEM KNOWLEDGE ===\n");
  }

  // Organization knowledge base (uploaded documents: price lists, FAQs, service descriptions)
  if (knowledgeBaseDocs && knowledgeBaseDocs.length > 0) {
    parts.push("=== ORGANIZATION KNOWLEDGE BASE ===");
    parts.push("The following documents were uploaded by the business owner. Use them to answer customer questions accurately.\n");
    for (const doc of knowledgeBaseDocs) {
      parts.push(`--- ${doc.filename} ---`);
      if (doc.description) {
        parts.push(`(${doc.description})`);
      }
      parts.push(doc.content);
      parts.push("");
    }
    parts.push("=== END ORGANIZATION KNOWLEDGE BASE ===\n");
  }

  // Base identity
  parts.push(`You are ${config.displayName || "an AI assistant"} for this organization.`);

  // Language
  if (config.language) {
    parts.push(`Primary language: ${config.language}.`);
  }
  if (config.additionalLanguages?.length) {
    parts.push(`You can also communicate in: ${config.additionalLanguages.join(", ")}.`);
  }

  // Personality
  if (config.personality) {
    parts.push(`\nPersonality: ${config.personality}`);
  }

  // Brand voice
  if (config.brandVoiceInstructions) {
    parts.push(`\nBrand voice guidelines: ${config.brandVoiceInstructions}`);
  }

  // Custom system prompt
  if (config.systemPrompt) {
    parts.push(`\n${config.systemPrompt}`);
  }

  // FAQ
  if (config.faqEntries?.length) {
    parts.push("\n\nFrequently Asked Questions:");
    for (const faq of config.faqEntries) {
      parts.push(`Q: ${faq.q}\nA: ${faq.a}`);
    }
  }

  // Blocked topics
  if (config.blockedTopics?.length) {
    parts.push(`\nIMPORTANT: Do NOT discuss these topics: ${config.blockedTopics.join(", ")}. Politely redirect the conversation if asked.`);
  }

  // Autonomy instruction
  if (config.autonomyLevel === "draft_only") {
    parts.push("\nIMPORTANT: You are in draft-only mode. Generate responses but do NOT execute any tools. Describe what you would do instead.");
  }

  // Interview context (guided mode)
  if (interviewContext) {
    parts.push("\n");
    parts.push(buildInterviewPromptContext(interviewContext));
  }

  return parts.join("\n");
}

function filterToolsForAgent(config: AgentConfig): Array<{
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  // Get all ready tool schemas
  let schemas = getToolSchemas();

  // If enabledTools specified, only include those + query_org_data
  if (config.enabledTools && config.enabledTools.length > 0) {
    const allowed = new Set([...config.enabledTools, "query_org_data"]);
    schemas = schemas.filter((s) => allowed.has(s.function.name));
  }

  // Always exclude disabled tools
  if (config.disabledTools && config.disabledTools.length > 0) {
    const blocked = new Set(config.disabledTools);
    schemas = schemas.filter((s) => !blocked.has(s.function.name));
  }

  // In draft_only mode, only allow read-only tools
  if (config.autonomyLevel === "draft_only") {
    const readOnlyTools = new Set([
      "query_org_data", "search_contacts", "list_events", "list_products",
      "list_forms", "list_tickets", "list_workflows", "search_media",
      "search_unsplash_images", "get_form_responses",
    ]);
    schemas = schemas.filter((s) => readOnlyTools.has(s.function.name));
  }

  return schemas;
}

function checkNeedsApproval(config: AgentConfig, toolName: string): boolean {
  // Supervised mode: everything needs approval
  if (config.autonomyLevel === "supervised") return true;

  // Draft-only mode: nothing executes (tools already filtered to read-only)
  if (config.autonomyLevel === "draft_only") return false;

  // Autonomous mode: check requireApprovalFor list
  if (config.requireApprovalFor?.includes(toolName)) return true;

  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateCost(usage: any, model: string): number {
  if (!usage) return 0;

  // Approximate costs per 1M tokens (from OpenRouter pricing)
  const pricing: Record<string, { input: number; output: number }> = {
    "anthropic/claude-sonnet-4-20250514": { input: 3, output: 15 },
    "anthropic/claude-3-5-sonnet": { input: 3, output: 15 },
    "openai/gpt-4o": { input: 2.5, output: 10 },
    "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
    "google/gemini-pro-1.5": { input: 1.25, output: 5 },
  };

  const rates = pricing[model] || { input: 3, output: 15 };
  const inputCost = (usage.prompt_tokens || 0) * rates.input / 1_000_000;
  const outputCost = (usage.completion_tokens || 0) * rates.output / 1_000_000;

  return inputCost + outputCost;
}

/**
 * Parse extraction results from LLM response (interview mode).
 * Looks for ```extraction code blocks containing JSON.
 */
function parseExtractionResults(content: string): Array<{
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

  // Match ```extraction ... ``` blocks
  const extractionBlockRegex = /```extraction\s*([\s\S]*?)```/gi;
  let match;

  while ((match = extractionBlockRegex.exec(content)) !== null) {
    const jsonContent = match[1].trim();
    try {
      const parsed = JSON.parse(jsonContent);

      // Handle single extraction or array of extractions
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
      // Invalid JSON in extraction block - skip it
      console.warn("[AgentExecution] Failed to parse extraction block:", jsonContent);
    }
  }

  return results;
}
