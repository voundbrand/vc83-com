/**
 * Platform AI Model Management
 *
 * Super admin functions for managing which AI models are available platform-wide.
 * Models auto-discovered by the daily cron job can be enabled/disabled here.
 */

import { v } from "convex/values";
import { mutation, query, action, internalQuery } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { requireAuthenticatedUser, getUserContext } from "../rbacHelpers";
import {
  evaluateModelEnablementReleaseGates,
  REQUIRED_CRITICAL_TOOL_CONTRACT_COUNT,
} from "./modelEnablementGates";
import type { ModelReleaseGateSnapshot } from "./modelReleaseGateAudit";
import {
  evaluateModelConformance,
  type ModelConformanceSample,
  type ModelConformanceSummary,
} from "./modelConformance";
import { OpenRouterClient } from "./openrouter";
import { detectProvider, buildEnvApiKeysByProvider } from "./modelAdapters";
import { CRITICAL_TOOL_NAMES } from "./tools/contracts";
import { getToolSchemas } from "./tools/registry";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

export type ModelLifecycleStatus =
  | "discovered"
  | "enabled"
  | "default"
  | "deprecated"
  | "retired";

export type ModelValidationRunStatus = "idle" | "running" | "passed" | "failed";

interface ModelValidationResultFlags {
  basicChat: boolean;
  toolCalling: boolean;
  complexParams: boolean;
  multiTurn: boolean;
  edgeCases: boolean;
  contractChecks: boolean;
}

interface ModelValidationProbeResult {
  passed: boolean;
  durationMs: number;
  latencySamplesMs: number[];
  usageTokens?: number;
  costUsd?: number;
  toolCallParsed?: boolean;
  schemaFidelity?: boolean;
  refusalHandled?: boolean;
  conversationId?: string;
}

interface ModelValidationRunPayload {
  results: ModelValidationResultFlags;
  conformance: ModelConformanceSummary;
}

interface ValidationConversationMessage {
  role: "user" | "assistant";
  content: string;
  tool_calls?: Array<{
    id?: string;
    type?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

interface ValidationTransportState {
  forceDirectRuntime: boolean;
}

function isOperatorRoutingUnresolvedError(error: unknown): boolean {
  return (
    error instanceof Error
    && error.message.includes("OPERATOR_ROUTING_UNRESOLVED")
  );
}

function isNoReleaseReadyPlatformModelError(error: unknown): boolean {
  return (
    error instanceof Error
    && error.message.includes("No release-ready platform AI models are configured")
  );
}

function parseToolCallArguments(
  rawArguments: unknown
): Record<string, unknown> {
  if (typeof rawArguments !== "string") {
    return {};
  }
  try {
    const parsed = JSON.parse(rawArguments);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // no-op
  }
  return {};
}

function buildValidationToolChoiceExtraBody(args: {
  providerId: string;
  toolChoiceName?: string;
}): Record<string, unknown> | undefined {
  const toolChoiceName = args.toolChoiceName?.trim();
  if (!toolChoiceName) {
    return undefined;
  }

  if (args.providerId === "anthropic") {
    return {
      tool_choice: {
        type: "tool",
        name: toolChoiceName,
      },
    };
  }

  return {
    tool_choice: {
      type: "function",
      function: {
        name: toolChoiceName,
      },
    },
  };
}

function buildValidationConversationId(): string {
  return `validation_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

async function sendModelValidationMessageViaDirectRuntime(args: {
  ctx: any;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  modelId: string;
  message: string;
  conversationId?: string;
  conversationStore: Map<string, ValidationConversationMessage[]>;
  toolChoiceName?: string;
}): Promise<{ response: any; latencyMs: number }> {
  const envApiKeysByProvider = buildEnvApiKeysByProvider({
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    OPENAI_COMPATIBLE_API_KEY: process.env.OPENAI_COMPATIBLE_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    KIMI_API_KEY: process.env.KIMI_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  });
  const detectedProvider = detectProvider(args.modelId, "openrouter");
  const providerApiKey = envApiKeysByProvider[detectedProvider];
  const openRouterApiKey = envApiKeysByProvider.openrouter;
  const providerId = providerApiKey ? detectedProvider : "openrouter";
  const apiKey = providerApiKey ?? openRouterApiKey;
  if (!apiKey) {
    throw new Error(
      "MODEL_VALIDATION_RUNTIME_MISSING_API_KEY: Configure OPENROUTER_API_KEY or provider-specific API keys."
    );
  }

  const client = new OpenRouterClient(apiKey, { providerId });
  const conversationId = args.conversationId ?? buildValidationConversationId();
  const existingHistory = args.conversationStore.get(conversationId) ?? [];
  const nextHistory: ValidationConversationMessage[] = [
    ...existingHistory,
    { role: "user", content: args.message },
  ];
  const extraBody = buildValidationToolChoiceExtraBody({
    providerId,
    toolChoiceName: args.toolChoiceName,
  });
  const startedAt = Date.now();
  const runtimeResponse = await client.chatCompletion({
    model: args.modelId,
    messages: [
      {
        role: "system",
        content:
          "You are a model validation probe. Answer directly and produce tool calls when relevant.",
      },
      ...nextHistory,
    ],
    tools: getToolSchemas(),
    temperature: 0,
    max_tokens: 1024,
    ...(extraBody ? { extraBody } : {}),
  });

  const choiceMessage = runtimeResponse?.choices?.[0]?.message;
  const assistantMessage =
    typeof choiceMessage?.content === "string" ? choiceMessage.content : "";
  const runtimeToolCalls = Array.isArray(choiceMessage?.tool_calls)
    ? choiceMessage.tool_calls
    : [];
  const normalizedToolCalls = runtimeToolCalls.map((toolCall: any) => ({
    id:
      typeof toolCall?.id === "string"
        ? toolCall.id
        : `validation_tool_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`,
    name: typeof toolCall?.function?.name === "string" ? toolCall.function.name : "tool",
    arguments: parseToolCallArguments(toolCall?.function?.arguments),
  }));
  const usage =
    runtimeResponse?.usage &&
    typeof runtimeResponse.usage.total_tokens === "number"
      ? runtimeResponse.usage
      : null;
  const cost = usage
    ? client.calculateCost(
      {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
      },
      args.modelId
    )
    : 0;
  const promptTokens = Math.max(0, usage?.prompt_tokens ?? 0);
  const completionTokens = Math.max(0, usage?.completion_tokens ?? 0);
  const totalTokens = Math.max(
    0,
    usage?.total_tokens ?? promptTokens + completionTokens
  );
  const nativeCostInCents = Math.max(0, Math.round(cost * 100));

  args.conversationStore.set(conversationId, [
    ...nextHistory,
    {
      role: "assistant" as const,
      content: assistantMessage,
      tool_calls: runtimeToolCalls,
    },
  ]);

  // Validation inference telemetry should appear in economics rollups, but never block validation UX.
  try {
    await args.ctx.runMutation(generatedApi.api.ai.billing.recordUsage, {
      organizationId: args.organizationId,
      userId: args.userId,
      requestType: "chat",
      provider: providerId,
      model: args.modelId,
      action: "model_validation_probe",
      requestCount: 1,
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      totalTokens,
      costInCents: nativeCostInCents,
      nativeUsageUnit: "tokens",
      nativeUsageQuantity: totalTokens,
      nativeInputUnits: promptTokens,
      nativeOutputUnits: completionTokens,
      nativeTotalUnits: totalTokens,
      nativeCostInCents,
      nativeCostCurrency: "USD",
      nativeCostSource: "estimated_model_pricing",
      creditsCharged: 0,
      creditChargeStatus: "skipped_not_required",
      success: true,
      billingSource: "platform",
      requestSource: "llm",
      ledgerMode: "credits_ledger",
      creditLedgerAction: "model_validation_probe",
      usageMetadata: {
        source: "platform_model_validation",
        transport: "direct_runtime",
        validationConversationId: conversationId,
      },
    });
  } catch (error) {
    console.warn("[ModelValidation] Failed to persist direct-runtime usage telemetry:", error);
  }

  return {
    response: {
      conversationId,
      message: assistantMessage,
      toolCalls: normalizedToolCalls,
      usage,
      cost,
    },
    latencyMs: Date.now() - startedAt,
  };
}

export function deriveLifecycleState(args: {
  isPlatformEnabled: boolean;
  isSystemDefault: boolean;
  deprecatedAt?: number;
  retiredAt?: number;
}): ModelLifecycleStatus {
  if (typeof args.retiredAt === "number") {
    return "retired";
  }
  if (typeof args.deprecatedAt === "number") {
    return "deprecated";
  }
  if (args.isSystemDefault) {
    return "default";
  }
  if (args.isPlatformEnabled) {
    return "enabled";
  }
  return "discovered";
}

export function validateRetirementSafety(args: {
  modelId: string;
  isSystemDefault: boolean;
  replacementModel: {
    modelId: string;
    isPlatformEnabled: boolean;
    lifecycleStatus?: string;
  } | null;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (args.isSystemDefault && !args.replacementModel) {
    reasons.push(
      `Default model ${args.modelId} requires a replacement model before retirement.`
    );
  }

  if (args.replacementModel) {
    if (!args.replacementModel.isPlatformEnabled) {
      reasons.push(
        `Replacement model ${args.replacementModel.modelId} must be platform-enabled.`
      );
    }
    if (args.replacementModel.lifecycleStatus === "retired") {
      reasons.push(
        `Replacement model ${args.replacementModel.modelId} cannot be retired.`
      );
    }
  }

  return { ok: reasons.length === 0, reasons };
}

function normalizeFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function extractUsageAndCostFromResponse(response: unknown): {
  usageTokens?: number;
  costUsd?: number;
} {
  if (!response || typeof response !== "object") {
    return {};
  }
  const typed = response as {
    usage?: { total_tokens?: number } | null;
    cost?: number;
  };
  return {
    usageTokens: normalizeFiniteNumber(typed.usage?.total_tokens),
    costUsd: normalizeFiniteNumber(typed.cost),
  };
}

function extractToolCalls(response: unknown): Array<{
  name?: string;
  arguments?: Record<string, unknown>;
}> {
  if (!response || typeof response !== "object") {
    return [];
  }
  const toolCalls = (response as { toolCalls?: unknown }).toolCalls;
  if (!Array.isArray(toolCalls)) {
    return [];
  }
  const normalized: Array<{
    name?: string;
    arguments?: Record<string, unknown>;
  }> = [];
  for (const toolCall of toolCalls) {
    if (!toolCall || typeof toolCall !== "object") {
      continue;
    }
    const record = toolCall as Record<string, unknown>;
    normalized.push({
      name: typeof record.name === "string" ? record.name : undefined,
      arguments:
        record.arguments && typeof record.arguments === "object"
          ? (record.arguments as Record<string, unknown>)
          : undefined,
    });
  }
  return normalized;
}

function buildValidationConformanceSamples(args: {
  basicChat: ModelValidationProbeResult;
  toolCalling: ModelValidationProbeResult;
  complexParams: ModelValidationProbeResult;
  multiTurn: ModelValidationProbeResult;
  edgeCases: ModelValidationProbeResult;
  contractChecks: ModelValidationProbeResult;
}): ModelConformanceSample[] {
  const toCostTuple = (probe: ModelValidationProbeResult) => ({
    totalTokens: probe.usageTokens ?? 1000,
    costUsd: probe.costUsd ?? 0,
  });
  const appendSamples = (input: {
    scenarioId: string;
    probe: ModelValidationProbeResult;
    toolCallParsed?: boolean;
    schemaFidelity?: boolean;
    refusalHandled?: boolean;
  }) => {
    const costTuple = toCostTuple(input.probe);
    const latencies = input.probe.latencySamplesMs.length > 0
      ? input.probe.latencySamplesMs
      : [Math.max(0, Math.round(input.probe.durationMs))];
    return latencies.map((latencyMs, index) => ({
      scenarioId:
        index === 0 ? input.scenarioId : `${input.scenarioId}_latency_${index + 1}`,
      latencyMs,
      ...(index === 0
        ? {
            ...costTuple,
            ...(typeof input.toolCallParsed === "boolean"
              ? { toolCallParsed: input.toolCallParsed }
              : {}),
            ...(typeof input.schemaFidelity === "boolean"
              ? { schemaFidelity: input.schemaFidelity }
              : {}),
            ...(typeof input.refusalHandled === "boolean"
              ? { refusalHandled: input.refusalHandled }
              : {}),
          }
        : {}),
    }));
  };

  return [
    ...appendSamples({ scenarioId: "basic_chat", probe: args.basicChat }),
    ...appendSamples({
      scenarioId: "tool_calling",
      probe: args.toolCalling,
      toolCallParsed: args.toolCalling.toolCallParsed ?? args.toolCalling.passed,
    }),
    ...appendSamples({
      scenarioId: "complex_params",
      probe: args.complexParams,
      schemaFidelity: args.complexParams.schemaFidelity ?? args.complexParams.passed,
    }),
    ...appendSamples({ scenarioId: "multi_turn", probe: args.multiTurn }),
    ...appendSamples({
      scenarioId: "edge_cases",
      probe: args.edgeCases,
      refusalHandled: args.edgeCases.refusalHandled ?? args.edgeCases.passed,
    }),
    ...appendSamples({
      scenarioId: "contract_checks",
      probe: args.contractChecks,
      toolCallParsed: args.contractChecks.toolCallParsed ?? args.contractChecks.passed,
      schemaFidelity: args.contractChecks.schemaFidelity ?? args.contractChecks.passed,
    }),
  ];
}

export function deriveValidationStatusFromRun(args: {
  results: ModelValidationResultFlags;
  conformance: ModelConformanceSummary;
}): "validated" | "failed" {
  return Object.values(args.results).every(Boolean) && args.conformance.passed
    ? "validated"
    : "failed";
}

async function sendModelValidationMessage(args: {
  ctx: any;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  modelId: string;
  message: string;
  conversationId?: string;
  conversationStore: Map<string, ValidationConversationMessage[]>;
  transportState: ValidationTransportState;
  forceDirectRuntime?: boolean;
  toolChoiceName?: string;
}): Promise<{ response: any; latencyMs: number }> {
  if (args.forceDirectRuntime === true) {
    return sendModelValidationMessageViaDirectRuntime({
      ctx: args.ctx,
      organizationId: args.organizationId,
      userId: args.userId,
      modelId: args.modelId,
      message: args.message,
      conversationId: args.conversationId,
      conversationStore: args.conversationStore,
      toolChoiceName: args.toolChoiceName,
    });
  }

  if (
    args.transportState.forceDirectRuntime
    || (args.conversationId && args.conversationStore.has(args.conversationId))
  ) {
    args.transportState.forceDirectRuntime = true;
    return sendModelValidationMessageViaDirectRuntime({
      ctx: args.ctx,
      organizationId: args.organizationId,
      userId: args.userId,
      modelId: args.modelId,
      message: args.message,
      conversationId: args.conversationId,
      conversationStore: args.conversationStore,
      toolChoiceName: args.toolChoiceName,
    });
  }

  const buildSendMessageArgs = (useLegacyPageBuilderFlow: boolean) => ({
    ...(args.conversationId ? { conversationId: args.conversationId as any } : {}),
    organizationId: args.organizationId,
    userId: args.userId,
    selectedModel: args.modelId,
    message: args.message,
    reasoningEffort: "low" as const,
    ...(useLegacyPageBuilderFlow
      ? {
        context: "page_builder" as const,
        builderMode: "connect" as const,
      }
      : {}),
  });

  const primaryStartedAt = Date.now();
  try {
    const response = await args.ctx.runAction(
      generatedApi.api.ai.chat.sendMessage,
      buildSendMessageArgs(false)
    );
    return {
      response,
      latencyMs: Date.now() - primaryStartedAt,
    };
  } catch (error) {
    if (isNoReleaseReadyPlatformModelError(error)) {
      console.warn(
        `[ModelValidation] No release-ready platform model baseline; using direct runtime transport for ${args.modelId}.`
      );
      args.transportState.forceDirectRuntime = true;
      return sendModelValidationMessageViaDirectRuntime({
        ctx: args.ctx,
        organizationId: args.organizationId,
        userId: args.userId,
        modelId: args.modelId,
        message: args.message,
        conversationId: args.conversationId,
        conversationStore: args.conversationStore,
        toolChoiceName: args.toolChoiceName,
      });
    }

    if (!isOperatorRoutingUnresolvedError(error)) {
      throw error;
    }

    console.warn(
      `[ModelValidation] Desktop operator route unresolved for ${args.modelId}; retrying via legacy page-builder runtime.`
    );

    const fallbackStartedAt = Date.now();
    try {
      const response = await args.ctx.runAction(
        generatedApi.api.ai.chat.sendMessage,
        buildSendMessageArgs(true)
      );
      return {
        response,
        latencyMs: Date.now() - fallbackStartedAt,
      };
    } catch (fallbackError) {
      if (isNoReleaseReadyPlatformModelError(fallbackError)) {
        console.warn(
          `[ModelValidation] Legacy runtime blocked by release-ready baseline; using direct runtime transport for ${args.modelId}.`
        );
        args.transportState.forceDirectRuntime = true;
        return sendModelValidationMessageViaDirectRuntime({
          ctx: args.ctx,
          organizationId: args.organizationId,
          userId: args.userId,
          modelId: args.modelId,
          message: args.message,
          conversationId: args.conversationId,
          conversationStore: args.conversationStore,
          toolChoiceName: args.toolChoiceName,
        });
      }
      throw fallbackError;
    }
  }
}

async function runModelValidationSuite(args: {
  ctx: any;
  organizationId: Id<"organizations">;
  userId: Id<"users">;
  modelId: string;
}): Promise<ModelValidationRunPayload> {
  const conversationStore = new Map<string, ValidationConversationMessage[]>();
  const transportState: ValidationTransportState = {
    // Platform model validation is always executed against direct runtime.
    forceDirectRuntime: true,
  };
  const sendValidationProbeMessage = (input: {
    message: string;
    conversationId?: string;
    forceDirectRuntime?: boolean;
    toolChoiceName?: string;
  }) =>
    sendModelValidationMessage({
      ctx: args.ctx,
      organizationId: args.organizationId,
      userId: args.userId,
      modelId: args.modelId,
      message: input.message,
      conversationId: input.conversationId,
      conversationStore,
      transportState,
      forceDirectRuntime: input.forceDirectRuntime,
      toolChoiceName: input.toolChoiceName,
    });

  const mergeUsageAndCost = (
    first: { usageTokens?: number; costUsd?: number },
    second?: { usageTokens?: number; costUsd?: number }
  ): { usageTokens?: number; costUsd?: number } => {
    const usageTokens =
      first.usageTokens === undefined && second?.usageTokens === undefined
        ? undefined
        : (first.usageTokens ?? 0) + (second?.usageTokens ?? 0);
    const costUsd =
      first.costUsd === undefined && second?.costUsd === undefined
        ? undefined
        : (first.costUsd ?? 0) + (second?.costUsd ?? 0);

    return {
      ...(usageTokens !== undefined ? { usageTokens } : {}),
      ...(costUsd !== undefined ? { costUsd } : {}),
    };
  };

  const runBasicChat = async (): Promise<ModelValidationProbeResult> => {
    const { response, latencyMs } = await sendValidationProbeMessage({
      message: 'Reply with exactly "ACK_VALIDATION" and nothing else.',
    });
    const message =
      typeof response?.message === "string" ? response.message.trim() : "";
    const usageAndCost = extractUsageAndCostFromResponse(response);
    return {
      passed: message.length > 0,
      durationMs: latencyMs,
      latencySamplesMs: [latencyMs],
      ...usageAndCost,
    };
  };

  const runToolCalling = async (): Promise<ModelValidationProbeResult> => {
    const initialAttempt = await sendValidationProbeMessage({
      message: "List my forms using the available tools.",
    });
    const initialToolCalls = extractToolCalls(initialAttempt.response);
    const initialUsageAndCost = extractUsageAndCostFromResponse(initialAttempt.response);
    if (initialToolCalls.length > 0) {
      return {
        passed: true,
        durationMs: initialAttempt.latencyMs,
        latencySamplesMs: [initialAttempt.latencyMs],
        toolCallParsed: true,
        ...initialUsageAndCost,
      };
    }

    const retryAttempt = await sendValidationProbeMessage({
      forceDirectRuntime: true,
      toolChoiceName: "list_forms",
      message:
        'Call "list_forms" now. Return only a tool call.',
    });
    const retryToolCalls = extractToolCalls(retryAttempt.response);
    const retryUsageAndCost = extractUsageAndCostFromResponse(retryAttempt.response);
    const usageAndCost = mergeUsageAndCost(initialUsageAndCost, retryUsageAndCost);
    const passed = retryToolCalls.length > 0;

    return {
      passed,
      durationMs: initialAttempt.latencyMs + retryAttempt.latencyMs,
      latencySamplesMs: [initialAttempt.latencyMs, retryAttempt.latencyMs],
      toolCallParsed: passed,
      ...usageAndCost,
    };
  };

  const runComplexParams = async (): Promise<ModelValidationProbeResult> => {
    const initialAttempt = await sendValidationProbeMessage({
      message:
        'Search contacts using search_contacts with query "Alice Smith sales department".',
    });
    const evaluateComplexParamsProbe = (
      toolCalls: Array<{ name?: string; arguments?: Record<string, unknown> }>
    ): { passed: boolean } => {
      const candidate = toolCalls.find(
        (toolCall) =>
          toolCall.name === "search_contacts" || toolCall.name === "manage_crm"
      );
      const argsObject = candidate?.arguments ?? {};
      const hasQuerySignal = [
        "query",
        "searchQuery",
        "search_query",
        "name",
        "term",
      ].some(
        (key) => typeof argsObject[key] === "string" && argsObject[key].trim().length > 0
      );
      return { passed: Boolean(candidate) && hasQuerySignal };
    };

    const initialToolCalls = extractToolCalls(initialAttempt.response);
    const initialEvaluation = evaluateComplexParamsProbe(initialToolCalls);
    const initialUsageAndCost = extractUsageAndCostFromResponse(initialAttempt.response);
    if (initialEvaluation.passed) {
      return {
        passed: true,
        durationMs: initialAttempt.latencyMs,
        latencySamplesMs: [initialAttempt.latencyMs],
        schemaFidelity: true,
        ...initialUsageAndCost,
      };
    }

    const retryAttempt = await sendValidationProbeMessage({
      forceDirectRuntime: true,
      toolChoiceName: "search_contacts",
      message:
        'Call "search_contacts" now with query "Alice Smith sales department". Return only a tool call.',
    });
    const retryToolCalls = extractToolCalls(retryAttempt.response);
    const retryEvaluation = evaluateComplexParamsProbe(retryToolCalls);
    const retryUsageAndCost = extractUsageAndCostFromResponse(retryAttempt.response);
    const usageAndCost = mergeUsageAndCost(initialUsageAndCost, retryUsageAndCost);

    return {
      passed: retryEvaluation.passed,
      durationMs: initialAttempt.latencyMs + retryAttempt.latencyMs,
      latencySamplesMs: [initialAttempt.latencyMs, retryAttempt.latencyMs],
      schemaFidelity: retryEvaluation.passed,
      ...usageAndCost,
    };
  };

  const runMultiTurn = async (): Promise<ModelValidationProbeResult> => {
    const first = await sendValidationProbeMessage({
      message: "List my forms.",
    });
    const conversationId =
      typeof first.response?.conversationId === "string"
        ? first.response.conversationId
        : undefined;
    const second = await sendValidationProbeMessage({
      conversationId,
      message: "How many did you find?",
    });
    const message =
      typeof second.response?.message === "string"
        ? second.response.message.trim()
        : "";
    const firstUsage = extractUsageAndCostFromResponse(first.response);
    const secondUsage = extractUsageAndCostFromResponse(second.response);
    return {
      passed: message.length > 0,
      durationMs: first.latencyMs + second.latencyMs,
      latencySamplesMs: [first.latencyMs, second.latencyMs],
      usageTokens:
        (firstUsage.usageTokens ?? 0) + (secondUsage.usageTokens ?? 0),
      costUsd: (firstUsage.costUsd ?? 0) + (secondUsage.costUsd ?? 0),
      conversationId,
    };
  };

  const runEdgeCases = async (): Promise<ModelValidationProbeResult> => {
    const { response, latencyMs } = await sendValidationProbeMessage({
      message: "Search for",
    });
    const message =
      typeof response?.message === "string" ? response.message.trim() : "";
    const usageAndCost = extractUsageAndCostFromResponse(response);
    return {
      passed: message.length > 0,
      durationMs: latencyMs,
      latencySamplesMs: [latencyMs],
      refusalHandled: message.length > 0,
      ...usageAndCost,
    };
  };

  const runContractChecks = async (): Promise<ModelValidationProbeResult> => {
    const contractCountMatches =
      CRITICAL_TOOL_NAMES.length === REQUIRED_CRITICAL_TOOL_CONTRACT_COUNT;
    return {
      passed: contractCountMatches,
      durationMs: 0,
      latencySamplesMs: [0],
      toolCallParsed: contractCountMatches,
      schemaFidelity: contractCountMatches,
    };
  };

  const basicChat = await runBasicChat();
  const toolCalling = await runToolCalling();
  const complexParams = await runComplexParams();
  const multiTurn = await runMultiTurn();
  const edgeCases = await runEdgeCases();
  const contractChecks = await runContractChecks();

  const results: ModelValidationResultFlags = {
    basicChat: basicChat.passed,
    toolCalling: toolCalling.passed,
    complexParams: complexParams.passed,
    multiTurn: multiTurn.passed,
    edgeCases: edgeCases.passed,
    contractChecks: contractChecks.passed,
  };
  const conformance = evaluateModelConformance({
    samples: buildValidationConformanceSamples({
      basicChat,
      toolCalling,
      complexParams,
      multiTurn,
      edgeCases,
      contractChecks,
    }),
  });

  return { results, conformance };
}

/**
 * Get all discovered AI models with their platform availability status
 */
export const getPlatformModels = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can manage platform models
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Get all discovered models
    const models = await ctx.db.query("aiModels").collect();

    return {
      models: models.map((model) => ({
        _id: model._id,
        modelId: model.modelId,
        name: model.name,
        provider: model.provider,
        pricing: model.pricing,
        contextLength: model.contextLength,
        capabilities: model.capabilities,
        discoveredAt: model.discoveredAt,
        lastSeenAt: model.lastSeenAt,
        isNew: model.isNew,
        // Platform availability - default to disabled for new models
        isPlatformEnabled: model.isPlatformEnabled ?? false,
        isSystemDefault: model.isSystemDefault ?? false,
        isFreeTierLocked: model.isFreeTierLocked ?? false,
        lifecycleStatus:
          model.lifecycleStatus
          ?? deriveLifecycleState({
            isPlatformEnabled: model.isPlatformEnabled ?? false,
            isSystemDefault: model.isSystemDefault ?? false,
            deprecatedAt: model.deprecatedAt,
            retiredAt: model.retiredAt,
          }),
        deprecatedAt: model.deprecatedAt,
        retiredAt: model.retiredAt,
        replacementModelId: model.replacementModelId,
        retirementReason: model.retirementReason,
        // Validation tracking
        validationStatus: model.validationStatus,
        testResults: model.testResults,
        testedBy: model.testedBy,
        testedAt: model.testedAt,
        notes: model.notes,
        validationRunStatus: model.validationRunStatus,
        validationRunStartedAt: model.validationRunStartedAt,
        validationRunFinishedAt: model.validationRunFinishedAt,
        validationRunMessage: model.validationRunMessage,
        operationalReviewAcknowledgedAt: model.operationalReviewAcknowledgedAt,
        operationalReviewAcknowledgedBy: model.operationalReviewAcknowledgedBy,
      })),
    };
  },
});

/**
 * Enable a model for platform-wide use
 */
export const enablePlatformModel = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(), // e.g., "anthropic/claude-3-5-sonnet"
    operationalReviewAcknowledged: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can manage platform models
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Find the model in the database
    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }
    if (model.lifecycleStatus === "retired") {
      throw new Error(
        `Model ${args.modelId} is retired and cannot be re-enabled without lifecycle override.`
      );
    }

    const releaseGateResult = evaluateModelEnablementReleaseGates({
      model: {
        modelId: model.modelId,
        validationStatus: model.validationStatus,
        testResults: model.testResults,
      },
      operationalReviewAcknowledged: args.operationalReviewAcknowledged,
    });

    if (!releaseGateResult.passed) {
      throw new Error(
        `Release gate check failed for ${args.modelId}: ${releaseGateResult.reasons.join(" ")}`
      );
    }

    // Enable the model
    const lifecycleStatus = deriveLifecycleState({
      isPlatformEnabled: true,
      isSystemDefault: model.isSystemDefault ?? false,
      deprecatedAt: model.deprecatedAt,
      retiredAt: undefined,
    });
    await ctx.db.patch(model._id, {
      isPlatformEnabled: true,
      lifecycleStatus,
      retiredAt: undefined,
      retirementReason: undefined,
      operationalReviewAcknowledgedAt: Date.now(),
      operationalReviewAcknowledgedBy: userId,
    });

    // Schedule org model defaults sync so existing orgs pick up the new model
    await ctx.scheduler.runAfter(
      0,
      generatedApi.internal.migrations.syncOrgModelDefaults
        .syncOrgModelDefaultsBatch,
      {}
    );

    return {
      success: true,
      message: `Model ${model.name} has been enabled platform-wide`,
    };
  },
});

/**
 * Disable a model from platform-wide use
 */
export const disablePlatformModel = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can manage platform models
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Find the model
    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    // Disable the model
    const lifecycleStatus =
      model.lifecycleStatus === "retired"
        ? "retired"
        : deriveLifecycleState({
          isPlatformEnabled: false,
          isSystemDefault: false,
          deprecatedAt: model.deprecatedAt,
          retiredAt: model.retiredAt,
        });
    await ctx.db.patch(model._id, {
      isPlatformEnabled: false,
      isSystemDefault: false,
      isFreeTierLocked: false,
      lifecycleStatus,
    });

    // Schedule org model defaults sync so existing orgs update stale references
    await ctx.scheduler.runAfter(
      0,
      generatedApi.internal.migrations.syncOrgModelDefaults
        .syncOrgModelDefaultsBatch,
      {}
    );

    return {
      success: true,
      message: `Model ${model.name} has been disabled platform-wide`,
    };
  },
});

/**
 * Batch enable multiple models
 */
export const batchEnableModels = mutation({
  args: {
    sessionId: v.string(),
    modelIds: v.array(v.string()),
    operationalReviewAcknowledged: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can manage platform models
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    let enabledCount = 0;
    const missingModels: string[] = [];
    const blockedModels: Array<{ modelId: string; reasons: string[] }> = [];
    const modelsToEnable: Array<{ _id: Id<"aiModels">; modelId: string }> = [];

    for (const modelId of args.modelIds) {
      const model = await ctx.db
        .query("aiModels")
        .withIndex("by_model_id", (q) => q.eq("modelId", modelId))
        .first();

      if (!model) {
        missingModels.push(modelId);
        continue;
      }
      if (model.lifecycleStatus === "retired") {
        blockedModels.push({
          modelId: model.modelId,
          reasons: ["retired models cannot be batch-enabled"],
        });
        continue;
      }

      const releaseGateResult = evaluateModelEnablementReleaseGates({
        model: {
          modelId: model.modelId,
          validationStatus: model.validationStatus,
          testResults: model.testResults,
        },
        operationalReviewAcknowledged: args.operationalReviewAcknowledged,
      });

      if (!releaseGateResult.passed) {
        blockedModels.push({
          modelId: model.modelId,
          reasons: releaseGateResult.reasons,
        });
        continue;
      }

      modelsToEnable.push({
        _id: model._id,
        modelId: model.modelId,
      });
    }

    if (missingModels.length > 0) {
      throw new Error(
        `Batch enable aborted; unknown model IDs: ${missingModels.join(", ")}`
      );
    }

    if (blockedModels.length > 0) {
      const summary = blockedModels
        .map(({ modelId, reasons }) => `${modelId} (${reasons.join(" ")})`)
        .join("; ");
      throw new Error(
        `Batch enable blocked by release gates for ${blockedModels.length} model(s): ${summary}`
      );
    }

    for (const model of modelsToEnable) {
      const existing = await ctx.db.get(model._id);
      const lifecycleStatus = deriveLifecycleState({
        isPlatformEnabled: true,
        isSystemDefault: existing?.isSystemDefault ?? false,
        deprecatedAt: existing?.deprecatedAt,
        retiredAt: undefined,
      });
      await ctx.db.patch(model._id, {
        isPlatformEnabled: true,
        lifecycleStatus,
        retiredAt: undefined,
        retirementReason: undefined,
        operationalReviewAcknowledgedAt: Date.now(),
        operationalReviewAcknowledgedBy: userId,
      });
      enabledCount++;
    }

    // Schedule org model defaults sync so existing orgs pick up new models
    await ctx.scheduler.runAfter(
      0,
      generatedApi.internal.migrations.syncOrgModelDefaults
        .syncOrgModelDefaultsBatch,
      {}
    );

    return {
      success: true,
      message: `Enabled ${enabledCount} models platform-wide`,
      count: enabledCount,
    };
  },
});

/**
 * Batch disable multiple models.
 */
export const batchDisableModels = mutation({
  args: {
    sessionId: v.string(),
    modelIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    let disabledCount = 0;
    const missingModels: string[] = [];

    for (const modelId of args.modelIds) {
      const model = await ctx.db
        .query("aiModels")
        .withIndex("by_model_id", (q) => q.eq("modelId", modelId))
        .first();

      if (!model) {
        missingModels.push(modelId);
        continue;
      }

      const lifecycleStatus =
        model.lifecycleStatus === "retired"
          ? "retired"
          : deriveLifecycleState({
            isPlatformEnabled: false,
            isSystemDefault: false,
            deprecatedAt: model.deprecatedAt,
            retiredAt: model.retiredAt,
          });
      await ctx.db.patch(model._id, {
        isPlatformEnabled: false,
        isSystemDefault: false,
        isFreeTierLocked: false,
        lifecycleStatus,
      });
      disabledCount += 1;
    }

    if (missingModels.length > 0) {
      throw new Error(
        `Batch disable aborted; unknown model IDs: ${missingModels.join(", ")}`
      );
    }

    // Schedule org model defaults sync so existing orgs update stale references
    await ctx.scheduler.runAfter(
      0,
      generatedApi.internal.migrations.syncOrgModelDefaults
        .syncOrgModelDefaultsBatch,
      {}
    );

    return {
      success: true,
      message: `Disabled ${disabledCount} models platform-wide`,
      count: disabledCount,
    };
  },
});

/**
 * Set the platform default model.
 *
 * Exactly one platform-enabled model should be marked as the default starter.
 * This mutation promotes the selected model and clears any existing defaults.
 */
export const setPlatformDefaultModel = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    if (!model.isPlatformEnabled) {
      throw new Error("Only platform-enabled models can be set as platform default");
    }
    if (model.lifecycleStatus === "retired" || model.lifecycleStatus === "deprecated") {
      throw new Error("Deprecated or retired models cannot be platform defaults");
    }

    const currentDefaults = await ctx.db
      .query("aiModels")
      .withIndex("by_system_default", (q) => q.eq("isSystemDefault", true))
      .collect();

    let demotedDefaults = 0;
    for (const currentDefault of currentDefaults) {
      if (currentDefault._id === model._id) {
        continue;
      }

      const demotedLifecycleStatus = deriveLifecycleState({
        isPlatformEnabled: currentDefault.isPlatformEnabled ?? false,
        isSystemDefault: false,
        deprecatedAt: currentDefault.deprecatedAt,
        retiredAt: currentDefault.retiredAt,
      });
      await ctx.db.patch(currentDefault._id, {
        isSystemDefault: false,
        lifecycleStatus: demotedLifecycleStatus,
      });
      demotedDefaults += 1;
    }

    const nextLifecycleStatus = deriveLifecycleState({
      isPlatformEnabled: model.isPlatformEnabled ?? false,
      isSystemDefault: true,
      deprecatedAt: model.deprecatedAt,
      retiredAt: model.retiredAt,
    });
    await ctx.db.patch(model._id, {
      isSystemDefault: true,
      lifecycleStatus: nextLifecycleStatus,
    });

    // Schedule org model defaults sync so existing orgs get new default
    await ctx.scheduler.runAfter(
      0,
      generatedApi.internal.migrations.syncOrgModelDefaults
        .syncOrgModelDefaultsBatch,
      {}
    );

    return {
      success: true,
      message:
        demotedDefaults > 0
          ? `${model.name} is now the platform default (replaced ${demotedDefaults} previous default${demotedDefaults === 1 ? "" : "s"})`
          : `${model.name} is now the platform default`,
    };
  },
});

/**
 * Toggle a model as a system default
 *
 * System defaults are the recommended "starter" models.
 * Multiple models can be system defaults.
 */
export const toggleSystemDefault = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can manage platform models
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Find the model
    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    // Model must be platform-enabled to be set as default
    if (args.isDefault && !model.isPlatformEnabled) {
      throw new Error("Only platform-enabled models can be set as system default");
    }
    if (
      args.isDefault
      && (model.lifecycleStatus === "retired" || model.lifecycleStatus === "deprecated")
    ) {
      throw new Error("Deprecated or retired models cannot be system defaults");
    }

    // Update the model
    const lifecycleStatus = deriveLifecycleState({
      isPlatformEnabled: model.isPlatformEnabled ?? false,
      isSystemDefault: args.isDefault,
      deprecatedAt: model.deprecatedAt,
      retiredAt: model.retiredAt,
    });
    await ctx.db.patch(model._id, {
      isSystemDefault: args.isDefault,
      lifecycleStatus,
    });

    // Schedule org model defaults sync so existing orgs pick up default change
    await ctx.scheduler.runAfter(
      0,
      generatedApi.internal.migrations.syncOrgModelDefaults
        .syncOrgModelDefaultsBatch,
      {}
    );

    return {
      success: true,
      message: args.isDefault
        ? `${model.name} is now a system default`
        : `${model.name} is no longer a system default`,
    };
  },
});

/**
 * Toggle the platform-wide locked model for free-tier organizations.
 *
 * Only one model can be locked at a time.
 */
export const toggleFreeTierLockedModel = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
    isLocked: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    if (!args.isLocked) {
      await ctx.db.patch(model._id, {
        isFreeTierLocked: false,
      });
      return {
        success: true,
        message: `${model.name} is no longer locked for free-tier organizations`,
      };
    }

    if (!model.isPlatformEnabled) {
      throw new Error("Only platform-enabled models can be locked for free tier");
    }
    if (model.lifecycleStatus === "retired" || model.lifecycleStatus === "deprecated") {
      throw new Error("Deprecated or retired models cannot be locked for free tier");
    }

    const releaseGateResult = evaluateModelEnablementReleaseGates({
      model: {
        modelId: model.modelId,
        validationStatus: model.validationStatus,
        testResults: model.testResults,
      },
      operationalReviewAcknowledged: true,
    });
    if (!releaseGateResult.passed) {
      throw new Error(
        `Model ${args.modelId} is not release-ready for free-tier lock: ${releaseGateResult.reasons.join(" ")}`
      );
    }

    const currentlyLocked = await ctx.db
      .query("aiModels")
      .withIndex("by_free_tier_locked", (q) => q.eq("isFreeTierLocked", true))
      .collect();
    for (const lockedModel of currentlyLocked) {
      if (lockedModel._id !== model._id) {
        await ctx.db.patch(lockedModel._id, {
          isFreeTierLocked: false,
        });
      }
    }

    await ctx.db.patch(model._id, {
      isFreeTierLocked: true,
    });

    return {
      success: true,
      message: `${model.name} is now locked for free-tier organizations`,
    };
  },
});

/**
 * Mark a model as deprecated while optionally guiding operators to a replacement.
 */
export const deprecatePlatformModel = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
    replacementModelId: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }
    if (model.lifecycleStatus === "retired") {
      throw new Error(`Model ${args.modelId} is retired and cannot be deprecated`);
    }

    let replacementModel = null as
      | {
          _id: Id<"aiModels">;
          modelId: string;
          isPlatformEnabled?: boolean;
          isSystemDefault?: boolean;
          isFreeTierLocked?: boolean;
          lifecycleStatus?: string;
          deprecatedAt?: number;
        }
      | null;
    if (args.replacementModelId) {
      replacementModel = await ctx.db
        .query("aiModels")
        .withIndex("by_model_id", (q) => q.eq("modelId", args.replacementModelId!))
        .first();
      if (!replacementModel) {
        throw new Error(`Replacement model ${args.replacementModelId} not found`);
      }
      if (!replacementModel.isPlatformEnabled) {
        throw new Error("Replacement model must be platform-enabled before deprecation");
      }
      if (replacementModel.lifecycleStatus === "retired") {
        throw new Error("Replacement model cannot be retired");
      }
    }

    const now = Date.now();
    await ctx.db.patch(model._id, {
      lifecycleStatus: "deprecated",
      deprecatedAt: model.deprecatedAt ?? now,
      replacementModelId: args.replacementModelId,
      retirementReason: args.reason,
      isFreeTierLocked: false,
      isSystemDefault:
        args.replacementModelId && model.isSystemDefault ? false : model.isSystemDefault,
    });

    if (replacementModel && (model.isSystemDefault || model.isFreeTierLocked)) {
      const replacementIsSystemDefault =
        model.isSystemDefault === true
          ? true
          : replacementModel.isSystemDefault ?? false;
      const replacementIsFreeTierLocked =
        model.isFreeTierLocked === true
          ? true
          : replacementModel.isFreeTierLocked ?? false;
      const replacementLifecycleStatus = deriveLifecycleState({
        isPlatformEnabled: replacementModel.isPlatformEnabled ?? false,
        isSystemDefault: replacementIsSystemDefault,
        deprecatedAt: replacementModel.lifecycleStatus === "deprecated"
          ? replacementModel.deprecatedAt
          : undefined,
        retiredAt: undefined,
      });
      await ctx.db.patch(replacementModel._id, {
        isSystemDefault: replacementIsSystemDefault,
        isFreeTierLocked: replacementIsFreeTierLocked,
        lifecycleStatus: replacementLifecycleStatus,
      });
    }

    return {
      success: true,
      message: `Model ${model.name} marked as deprecated`,
    };
  },
});

/**
 * Retire a model from platform use with optional replacement safety checks.
 */
export const retirePlatformModel = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
    replacementModelId: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }
    if (model.lifecycleStatus === "retired") {
      throw new Error(`Model ${args.modelId} is already retired`);
    }

    let replacementModel = null as
      | {
          _id: Id<"aiModels">;
          modelId: string;
          isPlatformEnabled?: boolean;
          isSystemDefault?: boolean;
          isFreeTierLocked?: boolean;
          lifecycleStatus?: string;
          deprecatedAt?: number;
        }
      | null;
    if (args.replacementModelId) {
      replacementModel = await ctx.db
        .query("aiModels")
        .withIndex("by_model_id", (q) => q.eq("modelId", args.replacementModelId!))
        .first();
      if (!replacementModel) {
        throw new Error(`Replacement model ${args.replacementModelId} not found`);
      }
    }

    const retirementSafety = validateRetirementSafety({
      modelId: model.modelId,
      isSystemDefault: model.isSystemDefault ?? false,
      replacementModel: replacementModel
        ? {
            modelId: replacementModel.modelId,
            isPlatformEnabled: replacementModel.isPlatformEnabled ?? false,
            lifecycleStatus: replacementModel.lifecycleStatus,
          }
        : null,
    });
    if (!retirementSafety.ok) {
      throw new Error(retirementSafety.reasons.join(" "));
    }

    const now = Date.now();
    await ctx.db.patch(model._id, {
      isPlatformEnabled: false,
      isSystemDefault: false,
      isFreeTierLocked: false,
      lifecycleStatus: "retired",
      deprecatedAt: model.deprecatedAt ?? now,
      retiredAt: now,
      replacementModelId: args.replacementModelId,
      retirementReason: args.reason ?? "retired_by_operator",
    });

    if (replacementModel && (model.isSystemDefault || model.isFreeTierLocked)) {
      const replacementIsSystemDefault =
        model.isSystemDefault === true
          ? true
          : replacementModel.isSystemDefault ?? false;
      const replacementIsFreeTierLocked =
        model.isFreeTierLocked === true
          ? true
          : replacementModel.isFreeTierLocked ?? false;
      const replacementLifecycleStatus = deriveLifecycleState({
        isPlatformEnabled: replacementModel.isPlatformEnabled ?? false,
        isSystemDefault: replacementIsSystemDefault,
        deprecatedAt: replacementModel.lifecycleStatus === "deprecated"
          ? replacementModel.deprecatedAt
          : undefined,
        retiredAt: undefined,
      });
      await ctx.db.patch(replacementModel._id, {
        isSystemDefault: replacementIsSystemDefault,
        isFreeTierLocked: replacementIsFreeTierLocked,
        lifecycleStatus: replacementLifecycleStatus,
      });
    }

    return {
      success: true,
      message: `Model ${model.name} has been retired`,
    };
  },
});

/**
 * Manually refresh models from provider discovery fanout
 *
 * Triggers the same model discovery that runs daily via cron job.
 * Super admin only.
 */
export const manualRefreshModels = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    count: number;
    fetchedAt: number;
  }> => {
    // Authenticate user (need to use internal query for action context)
    const userCheck = await (ctx as any).runQuery(generatedApi.internal.ai.platformModelManagement.checkSuperAdmin, {
      sessionId: args.sessionId,
    });

    if (!userCheck.isSuperAdmin) {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Trigger the model discovery
    const result = await (ctx as any).runAction(generatedApi.internal.ai.modelDiscovery.fetchAvailableModels);

    return {
      success: true,
      message: `Successfully refreshed models. Found ${result.models.length} models from provider discovery fanout.`,
      count: result.models.length,
      fetchedAt: result.fetchedAt,
    };
  },
});

/**
 * Manually trigger org model defaults sync across all organizations.
 *
 * Schedules a paginated backfill that calls ensureOrganizationModelDefaultsInternal
 * for each organization, ensuring their AI settings include current platform models.
 * Super admin only.
 */
export const manualSyncOrgModelDefaults = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    await ctx.scheduler.runAfter(
      0,
      generatedApi.internal.migrations.syncOrgModelDefaults
        .syncOrgModelDefaultsBatch,
      {}
    );

    return {
      success: true,
      message:
        "Organization model defaults sync has been scheduled. All organizations will be updated with current platform-enabled models.",
    };
  },
});

/**
 * Internal query to check if user is super admin
 * Used by actions that need authentication
 */
export const checkSuperAdmin = internalQuery({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Authenticate user
      const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

      // Get user context to check super admin status
      const userContext = await getUserContext(ctx, userId);

      return {
        isSuperAdmin: userContext.isGlobal && userContext.roleName === "super_admin",
        userId,
      };
    } catch {
      return {
        isSuperAdmin: false,
        userId: undefined,
      };
    }
  },
});

/**
 * Internal release-gate snapshot export for CI and operational audits.
 */
export const getModelReleaseGateSnapshots = internalQuery({
  args: {},
  handler: async (ctx): Promise<ModelReleaseGateSnapshot[]> => {
    const models = await ctx.db.query("aiModels").collect();
    const snapshots = models.map((model) => ({
      modelId: model.modelId,
      name: model.name,
      provider: model.provider,
      lifecycleStatus: model.lifecycleStatus,
      isPlatformEnabled: model.isPlatformEnabled === true,
      validationStatus: model.validationStatus,
      testResults: model.testResults,
      operationalReviewAcknowledgedAt: model.operationalReviewAcknowledgedAt,
    }));

    snapshots.sort((left, right) => left.modelId.localeCompare(right.modelId));
    return snapshots;
  },
});

/**
 * Update per-model validation run state for UI progress/status display.
 */
export const setModelValidationRunState = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("running"),
      v.literal("passed"),
      v.literal("failed")
    ),
    message: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();
    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    await ctx.db.patch(model._id, {
      validationRunStatus: args.status,
      validationRunMessage: args.message,
      validationRunStartedAt: args.startedAt ?? model.validationRunStartedAt,
      validationRunFinishedAt: args.finishedAt ?? model.validationRunFinishedAt,
    });

    return { success: true };
  },
});

/**
 * Run live validation for a single model from the super-admin UI.
 */
export const runPlatformModelValidation = action({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
  },
  handler: async (ctx, args) => {
    const userCheck = await (ctx as any).runQuery(
      generatedApi.internal.ai.platformModelManagement.checkSuperAdmin,
      {
        sessionId: args.sessionId,
      }
    );
    if (!userCheck?.isSuperAdmin) {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    const currentUser = await (ctx as any).runQuery(
      generatedApi.api.auth.getCurrentUser,
      { sessionId: args.sessionId }
    ) as {
      id?: string;
      currentOrganization?: { id?: string } | null;
      defaultOrgId?: string | null;
    } | null;

    const organizationId =
      currentUser?.currentOrganization?.id ?? currentUser?.defaultOrgId;
    const userId = currentUser?.id;
    if (!organizationId || !userId) {
      throw new Error(
        "Unable to resolve validation fixture context from your authenticated super-admin session."
      );
    }

    const startedAt = Date.now();
    await (ctx as any).runMutation(
      generatedApi.api.ai.platformModelManagement.setModelValidationRunState,
      {
        sessionId: args.sessionId,
        modelId: args.modelId,
        status: "running",
        message: "Validation in progress",
        startedAt,
      }
    );

    try {
      const validationRun = await runModelValidationSuite({
        ctx,
        organizationId: organizationId as Id<"organizations">,
        userId: userId as Id<"users">,
        modelId: args.modelId,
      });
      const validationStatus = deriveValidationStatusFromRun({
        results: validationRun.results,
        conformance: validationRun.conformance,
      });

      await (ctx as any).runMutation(
        generatedApi.api.ai.platformModelManagement.updateModelValidation,
        {
          sessionId: args.sessionId,
          modelId: args.modelId,
          validationStatus,
          testResults: {
            ...validationRun.results,
            conformance: validationRun.conformance,
            timestamp: Date.now(),
          },
          notes: `Validated via super-admin UI on ${new Date().toISOString()}`,
        }
      );

      const finishedAt = Date.now();
      const passedChecks = Object.values(validationRun.results).filter(Boolean).length;
      const totalChecks = Object.keys(validationRun.results).length;
      const summaryMessage = `${passedChecks}/${totalChecks} checks passed; conformance=${
        validationRun.conformance.passed ? "PASS" : "FAIL"
      }`;
      await (ctx as any).runMutation(
        generatedApi.api.ai.platformModelManagement.setModelValidationRunState,
        {
          sessionId: args.sessionId,
          modelId: args.modelId,
          status: validationStatus === "validated" ? "passed" : "failed",
          message: summaryMessage,
          finishedAt,
        }
      );

      return {
        success: true,
        modelId: args.modelId,
        validationStatus,
        summary: summaryMessage,
      };
    } catch (error) {
      const finishedAt = Date.now();
      const message =
        error instanceof Error ? error.message : "Model validation failed";
      await (ctx as any).runMutation(
        generatedApi.api.ai.platformModelManagement.setModelValidationRunState,
        {
          sessionId: args.sessionId,
          modelId: args.modelId,
          status: "failed",
          message,
          finishedAt,
        }
      );
      throw error;
    }
  },
});

/**
 * Update model validation status and test results
 *
 * Used by CLI test scripts to save validation results.
 */
export const updateModelValidation = mutation({
  args: {
    sessionId: v.string(),
    modelId: v.string(),
    validationStatus: v.union(
      v.literal("not_tested"),
      v.literal("validated"),
      v.literal("failed")
    ),
    testResults: v.object({
      basicChat: v.boolean(),
      toolCalling: v.boolean(),
      complexParams: v.boolean(),
      multiTurn: v.boolean(),
      edgeCases: v.boolean(),
      contractChecks: v.boolean(),
      conformance: v.optional(v.object({
        sampleCount: v.number(),
        toolCallParsing: v.object({
          passed: v.number(),
          total: v.number(),
          rate: v.number(),
        }),
        schemaFidelity: v.object({
          passed: v.number(),
          total: v.number(),
          rate: v.number(),
        }),
        refusalHandling: v.object({
          passed: v.number(),
          total: v.number(),
          rate: v.number(),
        }),
        latencyP95Ms: v.union(v.number(), v.null()),
        costPer1kTokensUsd: v.union(v.number(), v.null()),
        thresholds: v.object({
          minToolCallParseRate: v.number(),
          minSchemaFidelityRate: v.number(),
          minRefusalHandlingRate: v.number(),
          maxLatencyP95Ms: v.number(),
          maxCostPer1kTokensUsd: v.number(),
        }),
        passed: v.boolean(),
        failedMetrics: v.array(v.string()),
      })),
      timestamp: v.number(),
    }),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);

    // Get user context to check super admin status
    const userContext = await getUserContext(ctx, userId);

    // Only super admins can update validation status
    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Insufficient permissions. Super admin access required.");
    }

    // Find the model
    const model = await ctx.db
      .query("aiModels")
      .withIndex("by_model_id", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!model) {
      throw new Error(`Model ${args.modelId} not found`);
    }

    // Update validation status
    await ctx.db.patch(model._id, {
      validationStatus: args.validationStatus,
      testResults: args.testResults,
      testedBy: userId,
      testedAt: Date.now(),
      notes: args.notes,
      validationRunStatus:
        args.validationStatus === "validated" ? "passed" : "failed",
      validationRunFinishedAt: Date.now(),
      validationRunMessage:
        args.validationStatus === "validated"
          ? "Validation completed successfully"
          : "Validation completed with failures",
    });

    return {
      success: true,
      message: `Validation status updated for ${model.name}`,
    };
  },
});
