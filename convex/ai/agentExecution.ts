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
import { withRetry, LLM_RETRY_POLICY, MODEL_FALLBACK_CHAIN } from "./retryPolicy";
import { getUserErrorMessage, classifyError } from "./errorMessages";
import { resolveActiveTools, getPlatformBlockedTools, SUBTYPE_DEFAULT_PROFILES } from "./toolScoping";
import { getAllToolDefinitions } from "./tools/registry";
import {
  checkPreLLMEscalation,
  checkPostLLMEscalation,
  checkToolFailureEscalation,
  DEFAULT_HOLD_MESSAGE,
  UNCERTAINTY_PHRASES,
  resolvePolicy,
  type EscalationCounters,
  type EscalationPolicy,
} from "./escalation";
import { brokerTools, extractRecentToolNames, type BrokerMetrics } from "./toolBroker";

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
  toolProfile?: string;
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
  escalationPolicy?: EscalationPolicy;
  useToolBroker?: boolean;
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
    // 1. Load agent config (with worker pool fallback for system bot)
    let agent = await ctx.runQuery(getInternal().agentOntology.getActiveAgentForOrg, {
      organizationId: args.organizationId,
      channel: args.channel,
    });

    if (!agent) {
      // No active agent — check if this org has a template agent (worker pool model).
      // If so, spawn/reuse a worker from the pool.
      const template = await ctx.runQuery(getInternal().agentOntology.getTemplateAgent, {
        organizationId: args.organizationId,
      });

      if (template) {
        const workerId = await ctx.runMutation(getInternal().ai.workerPool.getOnboardingWorker, {
          platformOrgId: args.organizationId,
        });
        agent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
          agentId: workerId,
        });
      }
    }

    if (!agent) {
      return { status: "error", message: "No active agent found for this organization" };
    }

    // Update worker's last active timestamp if this is a worker
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentProps = (agent.customProperties || {}) as Record<string, any>;
    if (agentProps.templateAgentId) {
      try {
        await ctx.runMutation(getInternal().ai.workerPool.touchWorker, {
          workerId: agent._id,
        });
      } catch {
        // Non-fatal — worker touch is best-effort
      }
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

    // 3.25. Team session — if a specialist was tagged in, swap to the effective agent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamSession = (session as any).teamSession as {
      isTeamSession?: boolean;
      activeAgentId?: Id<"objects">;
      sharedContext?: string;
      handoffHistory?: Array<{
        fromAgentId: Id<"objects">;
        toAgentId: Id<"objects">;
        reason: string;
        contextSummary?: string;
        timestamp: number;
      }>;
    } | undefined;

    if (teamSession?.isTeamSession && teamSession.activeAgentId && teamSession.activeAgentId !== agent._id) {
      const effectiveAgent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
        agentId: teamSession.activeAgentId,
      });
      if (effectiveAgent) {
        agent = effectiveAgent;
        // Reload config from new agent's customProperties
        Object.assign(config, (effectiveAgent.customProperties || {}) as unknown as AgentConfig);
      }
    }

    // 3.5. Check if session has an active escalation (human-in-the-loop)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionEsc = (session as any).escalationState;
    if (sessionEsc?.status === "taken_over") {
      // Human has control — save message but skip LLM
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "user",
        content: args.message,
      });
      return {
        status: "escalated_to_human",
        message: "This conversation is being handled by a team member.",
        sessionId: session._id,
      };
    }
    if (sessionEsc?.status === "pending") {
      // Still waiting for human — save message, remind customer
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "user",
        content: args.message,
      });
      const waitMessage = "My team has been notified and will be with you shortly. Please hang tight!";
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "assistant",
        content: waitMessage,
      });
      // Route wait message outbound
      const waitMeta = (args.metadata as Record<string, unknown>) || {};
      if (!waitMeta.skipOutbound && args.channel !== "api_test") {
        try {
          await ctx.runAction(getInternal().channels.router.sendMessage, {
            organizationId: args.organizationId,
            channel: args.channel,
            recipientIdentifier: args.externalContactIdentifier,
            content: waitMessage,
            providerConversationId: waitMeta.providerConversationId as string | undefined,
          });
        } catch { /* best effort */ }
      }
      return {
        status: "escalation_pending",
        message: waitMessage,
        sessionId: session._id,
      };
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

    // 4.7. Pre-LLM escalation check (pattern matching + sentiment on inbound message)
    // Gather recent user messages for sentiment sliding window
    const recentForSentiment = await ctx.runQuery(getInternal().ai.agentSessions.getSessionMessages, {
      sessionId: session._id,
      limit: 5,
    }) as Array<{ role: string; content: string }>;
    const recentUserMsgs = recentForSentiment
      .filter((m) => m.role === "user")
      .map((m) => m.content);

    const preEscalation = checkPreLLMEscalation(args.message, config, recentUserMsgs);
    if (preEscalation) {
      // Create escalation on the session
      await ctx.runMutation(getInternal().ai.escalation.createEscalation, {
        sessionId: session._id,
        agentId: agent._id,
        organizationId: args.organizationId,
        reason: preEscalation.reason,
        urgency: preEscalation.urgency,
        triggerType: preEscalation.triggerType,
      });

      // Load agent name for notifications
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const escAgentName = (agent.customProperties as any)?.displayName || agent.name || "Agent";

      // Fire all notification channels (fire-and-forget)
      ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationTelegram, {
        sessionId: session._id,
        organizationId: args.organizationId,
        agentName: escAgentName,
        reason: preEscalation.reason,
        urgency: preEscalation.urgency,
        contactIdentifier: args.externalContactIdentifier,
        channel: args.channel,
        lastMessage: args.message.slice(0, 200),
      });
      ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationPushover, {
        organizationId: args.organizationId,
        agentName: escAgentName,
        reason: preEscalation.reason,
        urgency: preEscalation.urgency,
        contactIdentifier: args.externalContactIdentifier,
        channel: args.channel,
      });
      ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationEmail, {
        organizationId: args.organizationId,
        agentName: escAgentName,
        reason: preEscalation.reason,
        urgency: preEscalation.urgency,
        contactIdentifier: args.externalContactIdentifier,
        channel: args.channel,
        lastMessage: args.message.slice(0, 200),
      });

      // Schedule delayed email retry for HIGH urgency escalations
      if (preEscalation.urgency === "high") {
        ctx.scheduler.runAfter(5 * 60 * 1000, getInternal().ai.escalation.retryHighUrgencyEmail, {
          sessionId: session._id,
          organizationId: args.organizationId,
          agentName: escAgentName,
          reason: preEscalation.reason,
          contactIdentifier: args.externalContactIdentifier,
          channel: args.channel,
          lastMessage: args.message.slice(0, 200),
        });
      }

      // Save user message + hold message (skip LLM call entirely)
      const resolvedPol = resolvePolicy(config.escalationPolicy);
      const holdMessage = resolvedPol.holdMessage;
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "user",
        content: args.message,
      });
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "assistant",
        content: holdMessage,
      });

      // Route hold message outbound
      const escMeta = (args.metadata as Record<string, unknown>) || {};
      if (!escMeta.skipOutbound && args.channel !== "api_test") {
        try {
          await ctx.runAction(getInternal().channels.router.sendMessage, {
            organizationId: args.organizationId,
            channel: args.channel,
            recipientIdentifier: args.externalContactIdentifier,
            content: holdMessage,
            providerConversationId: escMeta.providerConversationId as string | undefined,
          });
        } catch { /* best effort — message saved in session */ }
      }

      return { status: "escalated", response: holdMessage, sessionId: session._id };
    }

    // 5. Build system prompt (with previous session context if resuming)
    const previousSessionSummary = (session as Record<string, unknown>).previousSessionSummary as string | undefined;

    // Check for degraded mode (tools disabled from prior failures)
    const preflightErrorState = await ctx.runQuery(
      getInternal().ai.agentSessions.getSessionErrorState,
      { sessionId: session._id }
    ) as { degraded?: boolean; disabledTools?: string[]; degradedReason?: string } | null;

    // Build team handoff context if this is a specialist session
    let handoffCtx: { sharedContext?: string; lastHandoff?: { fromAgent: string; reason: string; contextSummary?: string } } | undefined;
    if (teamSession?.isTeamSession && teamSession.handoffHistory?.length) {
      const lastHandoff = teamSession.handoffHistory[teamSession.handoffHistory.length - 1];
      // Resolve the "from" agent name
      let fromName = "a team member";
      try {
        const fromAgent = await ctx.runQuery(getInternal().agentOntology.getAgentInternal, {
          agentId: lastHandoff.fromAgentId,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fromName = (fromAgent?.customProperties as any)?.displayName || fromAgent?.name || fromName;
      } catch { /* best effort */ }

      handoffCtx = {
        sharedContext: teamSession.sharedContext,
        lastHandoff: {
          fromAgent: fromName,
          reason: lastHandoff.reason,
          contextSummary: lastHandoff.contextSummary,
        },
      };
    }

    const systemPrompt = buildAgentSystemPrompt(
      config, knowledgeBaseDocs, interviewContext, previousSessionSummary,
      preflightErrorState?.degraded ? preflightErrorState.disabledTools : undefined,
      handoffCtx,
    );

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

    // 7. Layered tool scoping (platform → org → agent → session)
    const connectedIntegrations = await ctx.runQuery(
      getInternal().ai.toolScoping.getConnectedIntegrations,
      { organizationId: args.organizationId }
    ) as string[];

    // Resolve agent's effective tool profile
    const agentProfile = config.toolProfile
      ?? SUBTYPE_DEFAULT_PROFILES[agent.subtype ?? "general"]
      ?? "general";

    // Session-level disabled tools (from degraded mode / error state)
    const sessionDisabledTools = preflightErrorState?.disabledTools ?? [];

    const allToolDefs = getAllToolDefinitions();
    const activeToolDefs = resolveActiveTools({
      allTools: allToolDefs,
      platformBlocked: getPlatformBlockedTools(),
      orgEnabled: [],   // Org-level allow list (future: from org settings)
      orgDisabled: [],   // Org-level deny list (future: from org settings)
      connectedIntegrations,
      agentProfile,
      agentEnabled: config.enabledTools ?? [],
      agentDisabled: config.disabledTools ?? [],
      autonomyLevel: config.autonomyLevel,
      sessionDisabled: sessionDisabledTools,
      channel: args.channel,
    });

    // Convert resolved tool names to OpenAI function schemas
    const activeToolNames = new Set(activeToolDefs.map(t => t.name));
    let toolSchemas = getToolSchemas().filter(s => activeToolNames.has(s.function.name));

    // 7.25. Tool broker — narrow tools by intent + recent usage (feature-flagged)
    let brokerMetrics: BrokerMetrics | undefined;
    if (config.useToolBroker) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recentToolNames = extractRecentToolNames(history as Array<{ role: string; toolCalls?: any }>);
      const brokerResult = brokerTools(args.message, toolSchemas, recentToolNames);
      toolSchemas = brokerResult.tools;
      brokerMetrics = brokerResult.metrics;
    }

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

    // 8. Call LLM with retry + model failover
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return { status: "error", message: "OpenRouter API key not configured" };
    }

    const client = new OpenRouterClient(apiKey);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any = null;
    let usedModel = model;

    // Try primary model with retry
    const modelsToTry = [model, ...(MODEL_FALLBACK_CHAIN[model] || [])];

    for (const tryModel of modelsToTry) {
      try {
        const retryResult = await withRetry(
          () =>
            client.chatCompletion({
              model: tryModel,
              messages,
              tools: toolSchemas.length > 0 ? toolSchemas : undefined,
              temperature: config.temperature ?? 0.7,
              max_tokens: config.maxTokens || 4096,
            }),
          LLM_RETRY_POLICY
        );
        response = retryResult.result;
        usedModel = tryModel;

        if (retryResult.attempts > 1) {
          console.warn(
            `[AgentExecution] LLM call succeeded on attempt ${retryResult.attempts} with model ${tryModel}`
          );
        }
        break;
      } catch (e) {
        console.error(
          `[AgentExecution] Model ${tryModel} failed all retries:`,
          e instanceof Error ? e.message : String(e)
        );
        // Continue to next fallback model
      }
    }

    // All models failed — send user error message and notify owner
    if (!response) {
      const errorMessage = getUserErrorMessage("ALL_MODELS_FAILED");

      // Save error message as assistant response
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "user",
        content: args.message,
      });
      await ctx.runMutation(getInternal().ai.agentSessions.addSessionMessage, {
        sessionId: session._id,
        role: "assistant",
        content: errorMessage,
      });

      // Send error to user via channel
      const meta = (args.metadata as Record<string, unknown>) || {};
      if (!meta.skipOutbound && args.channel !== "api_test") {
        try {
          await ctx.runAction(getInternal().channels.router.sendMessage, {
            organizationId: args.organizationId,
            channel: args.channel,
            recipientIdentifier: args.externalContactIdentifier,
            content: errorMessage,
          });
        } catch {
          // Best effort — if channel also fails, message is at least saved in session
        }
      }

      // Notify owner — this is a model failure, not a credit issue
      ctx.scheduler.runAfter(0, getInternal().credits.notifications.notifyAllModelsFailed, {
        organizationId: args.organizationId,
        error: "All retry attempts and fallback models exhausted",
      });

      return { status: "error", message: "All AI models are currently unavailable", sessionId: session._id };
    }

    const choice = response.choices?.[0];
    if (!choice) {
      return { status: "error", message: "No response from LLM" };
    }

    const assistantContent = choice.message?.content || "";
    const toolCalls = choice.message?.tool_calls || [];

    // 9. Handle tool calls with autonomy checks + failure tracking
    const toolResults: Array<{ tool: string; status: "success" | "error" | "disabled" | "pending_approval"; result?: unknown; error?: string }> = [];

    // Load persisted error state from session (survives across action invocations)
    const existingErrorState = await ctx.runQuery(
      getInternal().ai.agentSessions.getSessionErrorState,
      { sessionId: session._id }
    ) as { disabledTools?: string[]; failedToolCounts?: Record<string, number> } | null;

    const failedToolCounts: Record<string, number> = { ...(existingErrorState?.failedToolCounts || {}) };
    const disabledTools = new Set<string>(existingErrorState?.disabledTools || []);
    let errorStateDirty = false;

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function?.name;
      if (!toolName) continue;

      // Skip tools disabled from prior invocations or this one
      if (disabledTools.has(toolName) || (failedToolCounts[toolName] || 0) >= 3) {
        toolResults.push({
          tool: toolName,
          status: "disabled",
          error: `Tool disabled after repeated failures`,
        });
        continue;
      }

      let parsedArgs;
      try {
        parsedArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        toolResults.push({ tool: toolName, status: "error", error: "Invalid arguments" });
        failedToolCounts[toolName] = (failedToolCounts[toolName] || 0) + 1;
        errorStateDirty = true;
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
          failedToolCounts[toolName] = (failedToolCounts[toolName] || 0) + 1;
          const errorStr = e instanceof Error ? e.message : String(e);
          toolResults.push({ tool: toolName, status: "error", error: errorStr });
          errorStateDirty = true;

          // If tool has now failed 3 times, disable it and notify owner
          if (failedToolCounts[toolName] >= 3) {
            disabledTools.add(toolName);
            console.error(`[AgentExecution] Tool "${toolName}" disabled after 3 failures in session ${session._id}`);

            ctx.scheduler.runAfter(0, getInternal().credits.notifications.notifyToolDisabled, {
              organizationId: args.organizationId,
              toolName,
              error: errorStr,
            });
          }
        }
      }
    }

    // Persist error state to session if anything changed
    if (errorStateDirty) {
      // Enter degraded mode when 3+ distinct tools are disabled
      const isDegraded = disabledTools.size >= 3;
      await ctx.runMutation(getInternal().ai.agentSessions.updateSessionErrorState, {
        sessionId: session._id,
        disabledTools: Array.from(disabledTools),
        failedToolCounts,
        degraded: isDegraded,
        degradedReason: isDegraded
          ? `${disabledTools.size} tools disabled due to repeated failures`
          : undefined,
      });

      // Tool failure escalation — check if threshold met (per-agent configurable)
      if (!sessionEsc) {
        const toolEsc = checkToolFailureEscalation(disabledTools.size, config.escalationPolicy);
        if (toolEsc) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tfAgentName = (agent.customProperties as any)?.displayName || agent.name || "Agent";

          await ctx.runMutation(getInternal().ai.escalation.createEscalation, {
            sessionId: session._id,
            agentId: agent._id,
            organizationId: args.organizationId,
            reason: toolEsc.reason,
            urgency: toolEsc.urgency,
            triggerType: toolEsc.triggerType,
          });

          // Fire notifications
          ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationTelegram, {
            sessionId: session._id,
            organizationId: args.organizationId,
            agentName: tfAgentName,
            reason: toolEsc.reason,
            urgency: toolEsc.urgency,
            contactIdentifier: args.externalContactIdentifier,
            channel: args.channel,
            lastMessage: args.message.slice(0, 200),
          });
          ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationPushover, {
            organizationId: args.organizationId,
            agentName: tfAgentName,
            reason: toolEsc.reason,
            urgency: toolEsc.urgency,
            contactIdentifier: args.externalContactIdentifier,
            channel: args.channel,
          });
          ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationEmail, {
            organizationId: args.organizationId,
            agentName: tfAgentName,
            reason: toolEsc.reason,
            urgency: toolEsc.urgency,
            contactIdentifier: args.externalContactIdentifier,
            channel: args.channel,
            lastMessage: args.message.slice(0, 200),
          });

          // Schedule HIGH urgency email retry
          if (toolEsc.urgency === "high") {
            ctx.scheduler.runAfter(5 * 60 * 1000, getInternal().ai.escalation.retryHighUrgencyEmail, {
              sessionId: session._id,
              organizationId: args.organizationId,
              agentName: tfAgentName,
              reason: toolEsc.reason,
              contactIdentifier: args.externalContactIdentifier,
              channel: args.channel,
              lastMessage: args.message.slice(0, 200),
            });
          }
        }
      }
    }

    // 9.5. Post-LLM escalation checks (uncertainty phrases, response loops)
    // Load last 2 assistant responses + uncertainty counter for this session
    const sessionHistory = await ctx.runQuery(getInternal().ai.agentSessions.getSessionMessages, {
      sessionId: session._id,
      limit: 10,
    }) as Array<{ role: string; content: string }>;

    const recentAssistantMessages = sessionHistory
      .filter((m) => m.role === "assistant")
      .map((m) => m.content)
      .slice(-2);

    // Count existing uncertainty responses from this session
    let existingUncertaintyCount = 0;
    for (const msg of sessionHistory.filter((m) => m.role === "assistant")) {
      const lower = msg.content.toLowerCase();
      if (UNCERTAINTY_PHRASES.some((p) => lower.includes(p))) {
        existingUncertaintyCount++;
      }
    }

    const escalationCounters: EscalationCounters = {
      uncertaintyCount: existingUncertaintyCount,
      recentResponses: recentAssistantMessages,
    };

    const postEscalation = checkPostLLMEscalation(assistantContent, escalationCounters, config.escalationPolicy);
    if (postEscalation.shouldEscalate && !sessionEsc) {
      // Only escalate if not already escalated
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const postAgentName = (agent.customProperties as any)?.displayName || agent.name || "Agent";

      await ctx.runMutation(getInternal().ai.escalation.createEscalation, {
        sessionId: session._id,
        agentId: agent._id,
        organizationId: args.organizationId,
        reason: postEscalation.reason,
        urgency: postEscalation.urgency,
        triggerType: postEscalation.triggerType,
      });

      // Fire notifications (fire-and-forget)
      ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationTelegram, {
        sessionId: session._id,
        organizationId: args.organizationId,
        agentName: postAgentName,
        reason: postEscalation.reason,
        urgency: postEscalation.urgency,
        contactIdentifier: args.externalContactIdentifier,
        channel: args.channel,
        lastMessage: args.message.slice(0, 200),
      });
      ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationPushover, {
        organizationId: args.organizationId,
        agentName: postAgentName,
        reason: postEscalation.reason,
        urgency: postEscalation.urgency,
        contactIdentifier: args.externalContactIdentifier,
        channel: args.channel,
      });
      ctx.scheduler.runAfter(0, getInternal().ai.escalation.notifyEscalationEmail, {
        organizationId: args.organizationId,
        agentName: postAgentName,
        reason: postEscalation.reason,
        urgency: postEscalation.urgency,
        contactIdentifier: args.externalContactIdentifier,
        channel: args.channel,
        lastMessage: args.message.slice(0, 200),
      });

      // Schedule HIGH urgency email retry
      if (postEscalation.urgency === "high") {
        ctx.scheduler.runAfter(5 * 60 * 1000, getInternal().ai.escalation.retryHighUrgencyEmail, {
          sessionId: session._id,
          organizationId: args.organizationId,
          agentName: postAgentName,
          reason: postEscalation.reason,
          contactIdentifier: args.externalContactIdentifier,
          channel: args.channel,
          lastMessage: args.message.slice(0, 200),
        });
      }
      // Note: still send the LLM response (already generated) but now team is notified
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
        ...(brokerMetrics ? {
          broker: {
            brokered: brokerMetrics.brokered,
            toolsBefore: brokerMetrics.toolsBeforeBroker,
            toolsAfter: brokerMetrics.toolsOffered,
            intents: brokerMetrics.intentsDetected,
            toolSelected: toolResults[0]?.tool,
            toolInBrokeredSet: toolResults[0]?.tool
              ? toolSchemas.some(s => s.function.name === toolResults[0]?.tool)
              : undefined,
          },
        } : {}),
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
        // Outbound delivery failed — add to dead letter queue for retry.
        // The response is still saved in the session.
        const errorStr = e instanceof Error ? e.message : String(e);
        console.error("[AgentExecution] Outbound delivery failed, adding to DLQ:", errorStr);

        try {
          await ctx.runMutation(getInternal().ai.deadLetterQueue.addToDeadLetterQueue, {
            organizationId: args.organizationId,
            channel: args.channel,
            recipientIdentifier: args.externalContactIdentifier,
            content: assistantContent,
            error: errorStr,
            sessionId: session._id,
            providerConversationId: meta.providerConversationId as string | undefined,
          });
        } catch (dlqError) {
          // Last resort — if even DLQ fails, just log
          console.error("[AgentExecution] Failed to add to dead letter queue:", dlqError);
        }
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
  previousSessionSummary?: string,
  disabledTools?: string[],
  handoffContext?: { sharedContext?: string; lastHandoff?: { fromAgent: string; reason: string; contextSummary?: string } },
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

  // Previous session context (for resumed sessions after TTL expiry)
  if (previousSessionSummary) {
    parts.push("\n--- PREVIOUS CONVERSATION ---");
    parts.push(`You previously spoke with this customer. Summary: "${previousSessionSummary}"`);
    parts.push("Greet them naturally and reference the previous context if relevant.");
    parts.push("--- END PREVIOUS CONVERSATION ---");
  }

  // Team handoff context (specialist was tagged in by PM/lead)
  if (handoffContext) {
    parts.push("\n--- TEAM HANDOFF ---");
    if (handoffContext.lastHandoff) {
      parts.push(`You were tagged in by ${handoffContext.lastHandoff.fromAgent}.`);
      parts.push(`Reason: ${handoffContext.lastHandoff.reason}`);
      if (handoffContext.lastHandoff.contextSummary) {
        parts.push(`Context: ${handoffContext.lastHandoff.contextSummary}`);
      }
    }
    if (handoffContext.sharedContext) {
      parts.push(`Shared notes: ${handoffContext.sharedContext}`);
    }
    parts.push("Continue the conversation naturally. The customer may not know a handoff occurred.");
    parts.push("--- END TEAM HANDOFF ---");
  }

  // Degraded mode (multiple tools disabled due to failures)
  if (disabledTools && disabledTools.length > 0) {
    parts.push("\n--- DEGRADED MODE ---");
    parts.push(`Some of your capabilities are temporarily unavailable: ${disabledTools.join(", ")}.`);
    parts.push("Focus on answering questions, providing information, and offering to connect the customer with our team for actions you cannot perform.");
    parts.push("Do NOT attempt to use the disabled tools.");
    parts.push("--- END DEGRADED MODE ---");
  }

  return parts.join("\n");
}

// filterToolsForAgent — REMOVED
// Replaced by resolveActiveTools() in convex/ai/toolScoping.ts
// which implements 4-layer scoping: platform → org → agent → session

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
