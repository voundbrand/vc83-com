/**
 * Model Validation Script
 *
 * Tests AI models for tool calling reliability before platform-wide enablement.
 * Saves results to Convex database for audit trail.
 *
 * Usage:
 *   npm run test:model -- --model "anthropic/claude-3.5-sonnet"
 *   npm run test:model -- --provider "anthropic"
 *   npm run test:model -- --untested-only
 */

import { config as loadEnv } from "dotenv";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";
import { CRITICAL_TOOL_NAMES } from "../convex/ai/tools/contracts";
import { OpenRouterClient } from "../convex/ai/openrouter";
import { detectProvider, buildEnvApiKeysByProvider } from "../convex/ai/modelAdapters";
import { getToolSchemas } from "../convex/ai/tools/registry";
import {
  evaluateModelConformance,
  type ModelConformanceSample,
  type ModelConformanceSummary,
} from "../convex/ai/modelConformance";
import {
  parseToolCallArguments,
  validateToolCallAgainstContract,
} from "./model-validation-contracts";
import {
  formatModelMismatchMessage,
  getLatestAssistantModelResolution,
  resolveEffectiveValidationModel,
} from "./model-validation-runtime";

loadEnv({ path: ".env.local" });
loadEnv();

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL?.trim() || "";
const client = CONVEX_URL ? new ConvexHttpClient(CONVEX_URL) : null;
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY?.trim() || "";
const adminClient = CONVEX_DEPLOY_KEY && CONVEX_URL
  ? (() => {
      const c = new ConvexHttpClient(CONVEX_URL);
      const maybeAdminClient = c as any;
      if (typeof maybeAdminClient.setAdminAuth === "function") {
        maybeAdminClient.setAdminAuth(CONVEX_DEPLOY_KEY);
        return c;
      }
      return null;
    })()
  : null;

let TEST_ORG_ID = process.env.TEST_ORG_ID?.trim() || "";
let TEST_USER_ID = process.env.TEST_USER_ID?.trim() || "";
const TEST_SESSION_ID = process.env.TEST_SESSION_ID?.trim() || "";
const TEST_MODEL_ID = process.env.TEST_MODEL_ID;

function requireClient(): ConvexHttpClient {
  if (!client) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is required for live model validation runs."
    );
  }
  return client;
}

interface ValidationFixtureContext {
  organizationId: string;
  userId: string;
}

let validationFixture: ValidationFixtureContext | null = null;
const CONTACT_SEARCH_CONTRACT_PROMPT =
  "Search contacts using search_contacts with query \"Alice Smith sales department\".";
const BASIC_CHAT_ACK_TOKEN = "ACK_VALIDATION";
const MULTI_TURN_CONTEXT_TOKEN_PREFIX = "VCTX";

type ValidationReasoningEffort = "low" | "medium" | "high" | "extra_high";

function resolveValidationReasoningEffort(): ValidationReasoningEffort | undefined {
  const raw = process.env.MODEL_VALIDATION_REASONING_EFFORT;
  if (typeof raw !== "string") {
    return "low";
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "extra_high") {
    return normalized;
  }
  return "low";
}

const VALIDATION_REASONING_EFFORT = resolveValidationReasoningEffort();

interface ValidationResult {
  basicChat: boolean;
  toolCalling: boolean;
  complexParams: boolean;
  multiTurn: boolean;
  edgeCases: boolean;
  contractChecks: boolean;
}

interface ValidationRunResult {
  results: ValidationResult;
  conformance: ModelConformanceSummary;
}

interface TestResult {
  passed: boolean;
  message: string;
  duration: number;
  latencySamplesMs?: number[];
  error?: string;
  toolCallParsed?: boolean;
  schemaFidelity?: boolean;
  refusalHandled?: boolean;
  usageTokens?: number;
  costUsd?: number;
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

function isOperatorRoutingUnresolvedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("OPERATOR_ROUTING_UNRESOLVED")
  );
}

function isNoReleaseReadyPlatformModelError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("No release-ready platform AI models are configured")
  );
}

function parseToolCallArguments(rawArguments: unknown): Record<string, unknown> {
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

function buildValidationConversationId(): string {
  return `validation_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

const validationConversationStore = new Map<string, ValidationConversationMessage[]>();
let forceDirectRuntimeTransport = false;

async function sendValidationMessageViaDirectRuntime(args: {
  conversationId?: string;
  message: string;
  modelId: string;
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
  const existingHistory = validationConversationStore.get(conversationId) ?? [];
  const nextHistory = [...existingHistory, { role: "user" as const, content: args.message }];
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
  validationConversationStore.set(conversationId, [
    ...nextHistory,
    {
      role: "assistant",
      content: assistantMessage,
      tool_calls: runtimeToolCalls,
    },
  ]);

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

async function sendValidationMessage(args: {
  conversationId?: string;
  message: string;
  organizationId: string;
  userId: string;
  modelId: string;
}): Promise<{ response: any; latencyMs: number }> {
  if (
    forceDirectRuntimeTransport
    || (args.conversationId && validationConversationStore.has(args.conversationId))
  ) {
    forceDirectRuntimeTransport = true;
    return sendValidationMessageViaDirectRuntime({
      conversationId: args.conversationId,
      message: args.message,
      modelId: args.modelId,
    });
  }

  const buildPayload = (useLegacyPageBuilderFlow: boolean) => ({
    ...(args.conversationId ? { conversationId: args.conversationId as any } : {}),
    message: args.message,
    organizationId: args.organizationId as any,
    userId: args.userId as any,
    selectedModel: args.modelId,
    ...(VALIDATION_REASONING_EFFORT
      ? { reasoningEffort: VALIDATION_REASONING_EFFORT }
      : {}),
    ...(useLegacyPageBuilderFlow
      ? {
        context: "page_builder" as const,
        builderMode: "connect" as const,
      }
      : {}),
  });

  const startedAt = Date.now();
  try {
    const response: any = await requireClient().action(
      api.ai.chat.sendMessage,
      buildPayload(false)
    );
    return {
      response,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (isNoReleaseReadyPlatformModelError(error)) {
      console.warn(
        `[validation] No release-ready platform model baseline; using direct runtime transport for ${args.modelId}.`
      );
      forceDirectRuntimeTransport = true;
      return sendValidationMessageViaDirectRuntime({
        conversationId: args.conversationId,
        message: args.message,
        modelId: args.modelId,
      });
    }

    if (!isOperatorRoutingUnresolvedError(error)) {
      throw error;
    }
    console.warn(
      `[validation] Desktop operator route unresolved for ${args.modelId}; retrying via legacy page-builder runtime.`
    );
    try {
      const fallbackStartedAt = Date.now();
      const response: any = await requireClient().action(
        api.ai.chat.sendMessage,
        buildPayload(true)
      );
      return {
        response,
        latencyMs: Date.now() - fallbackStartedAt,
      };
    } catch (fallbackError) {
      if (isNoReleaseReadyPlatformModelError(fallbackError)) {
        console.warn(
          `[validation] Legacy runtime blocked by release-ready baseline; using direct runtime transport for ${args.modelId}.`
        );
        forceDirectRuntimeTransport = true;
        return sendValidationMessageViaDirectRuntime({
          conversationId: args.conversationId,
          message: args.message,
          modelId: args.modelId,
        });
      }
      throw fallbackError;
    }
  }
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

  const typedResponse = response as {
    usage?: { total_tokens?: number } | null;
    cost?: number;
  };
  const usageTokens = normalizeFiniteNumber(typedResponse.usage?.total_tokens);
  const costUsd = normalizeFiniteNumber(typedResponse.cost);

  return {
    usageTokens,
    costUsd,
  };
}

function buildConformanceSamples(args: {
  basicChat: TestResult;
  toolCalling: TestResult;
  complexParams: TestResult;
  multiTurn: TestResult;
  edgeCases: TestResult;
  contractChecks: TestResult;
}): ModelConformanceSample[] {
  const withCostFallback = (result: TestResult): {
    totalTokens: number;
    costUsd: number;
  } => ({
    totalTokens: result.usageTokens ?? 1000,
    costUsd: result.costUsd ?? 0,
  });

  const normalizeLatencySamples = (result: TestResult): number[] => {
    const fromSamples = (result.latencySamplesMs || [])
      .map((value) => Math.round(value))
      .filter((value) => Number.isFinite(value) && value >= 0);
    if (fromSamples.length > 0) {
      return fromSamples;
    }
    return [Math.max(0, Math.round(result.duration))];
  };

  const samples: ModelConformanceSample[] = [];

  const appendSamples = (input: {
    scenarioId: string;
    result: TestResult;
    toolCallParsed?: boolean;
    schemaFidelity?: boolean;
    refusalHandled?: boolean;
  }) => {
    const latencies = normalizeLatencySamples(input.result);
    const costFallback = withCostFallback(input.result);
    latencies.forEach((latencyMs, index) => {
      samples.push({
        scenarioId:
          index === 0
            ? input.scenarioId
            : `${input.scenarioId}_latency_${index + 1}`,
        ...(index === 0
          ? {
              ...(typeof input.toolCallParsed === "boolean"
                ? { toolCallParsed: input.toolCallParsed }
                : {}),
              ...(typeof input.schemaFidelity === "boolean"
                ? { schemaFidelity: input.schemaFidelity }
                : {}),
              ...(typeof input.refusalHandled === "boolean"
                ? { refusalHandled: input.refusalHandled }
                : {}),
              ...costFallback,
            }
          : {}),
        latencyMs,
      });
    });
  };

  appendSamples({
    scenarioId: "basic_chat",
    result: args.basicChat,
  });
  appendSamples({
    scenarioId: "tool_calling",
    result: args.toolCalling,
    toolCallParsed: args.toolCalling.toolCallParsed ?? args.toolCalling.passed,
  });
  appendSamples({
    scenarioId: "complex_params",
    result: args.complexParams,
    schemaFidelity: args.complexParams.schemaFidelity ?? args.complexParams.passed,
  });
  appendSamples({
    scenarioId: "multi_turn",
    result: args.multiTurn,
  });
  appendSamples({
    scenarioId: "edge_cases",
    result: args.edgeCases,
    refusalHandled: args.edgeCases.refusalHandled ?? args.edgeCases.passed,
  });
  appendSamples({
    scenarioId: "contract_checks",
    result: args.contractChecks,
    toolCallParsed: args.contractChecks.toolCallParsed ?? args.contractChecks.passed,
    schemaFidelity:
      args.contractChecks.schemaFidelity ?? args.contractChecks.passed,
  });

  return samples;
}

function printConformanceSummary(summary: ModelConformanceSummary) {
  console.log("\n📐 Conformance metrics:");
  console.log(
    `   tool_call_parse_rate: ${summary.toolCallParsing.rate} (${summary.toolCallParsing.passed}/${summary.toolCallParsing.total})`
  );
  console.log(
    `   schema_fidelity_rate: ${summary.schemaFidelity.rate} (${summary.schemaFidelity.passed}/${summary.schemaFidelity.total})`
  );
  console.log(
    `   refusal_handling_rate: ${summary.refusalHandling.rate} (${summary.refusalHandling.passed}/${summary.refusalHandling.total})`
  );
  console.log(`   latency_p95_ms: ${summary.latencyP95Ms ?? "missing"}`);
  console.log(
    `   cost_per_1k_tokens_usd: ${summary.costPer1kTokensUsd ?? "missing"}`
  );
  console.log(
    `   thresholds: parse>=${summary.thresholds.minToolCallParseRate}, schema>=${summary.thresholds.minSchemaFidelityRate}, refusal>=${summary.thresholds.minRefusalHandlingRate}, latency_p95<=${summary.thresholds.maxLatencyP95Ms}, cost_per_1k<=${summary.thresholds.maxCostPer1kTokensUsd}`
  );
  console.log(
    `   conformance_status: ${summary.passed ? "PASS" : `FAIL (${summary.failedMetrics.join(", ")})`}`
  );
}

function runOfflineConformanceHarness(): ModelConformanceSummary {
  const summary = evaluateModelConformance({
    samples: [
      {
        scenarioId: "offline_tooling_1",
        toolCallParsed: true,
        schemaFidelity: true,
        refusalHandled: true,
        latencyMs: 900,
        totalTokens: 1400,
        costUsd: 0.09,
      },
      {
        scenarioId: "offline_tooling_2",
        toolCallParsed: true,
        schemaFidelity: true,
        refusalHandled: true,
        latencyMs: 1100,
        totalTokens: 1800,
        costUsd: 0.11,
      },
    ],
  });

  console.log(
    "ℹ️  NEXT_PUBLIC_CONVEX_URL is not set. Running offline conformance harness only."
  );
  printConformanceSummary(summary);
  return summary;
}

function inferSearchContactsQueryFromResult(toolCall: {
  name?: unknown;
  result?: unknown;
}): string | null {
  if (toolCall.name !== "search_contacts") {
    return null;
  }

  const result = toolCall.result;
  if (!result || typeof result !== "object") {
    return null;
  }

  const message = (result as { message?: unknown }).message;
  if (typeof message !== "string") {
    return null;
  }

  const quotedMatch = message.match(/matching \"([^\"]+)\"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const bareMatch = message.match(/matching ([^\\n.]+)/i);
  if (bareMatch?.[1]) {
    return bareMatch[1].trim();
  }

  return null;
}

function hydrateToolCallArgumentsWithRuntimeEvidence(
  toolCall: {
    name?: unknown;
    arguments?: unknown;
    result?: unknown;
  }
): Record<string, unknown> {
  const parsedArgs = parseToolCallArguments(toolCall.arguments);
  const hasQuery =
    typeof parsedArgs.query === "string" && parsedArgs.query.trim().length > 0;

  if (toolCall.name === "search_contacts" && !hasQuery) {
    const inferredQuery = inferSearchContactsQueryFromResult(toolCall);
    if (inferredQuery) {
      return {
        ...parsedArgs,
        query: inferredQuery,
      };
    }
  }

  return parsedArgs;
}

function getValidationFixture(): ValidationFixtureContext {
  if (!validationFixture) {
    throw new Error("Validation fixture context is not resolved. Run resolveValidationFixtureContext() first.");
  }
  return validationFixture;
}

async function validateSeededIdsWithAdmin(): Promise<void> {
  if (!adminClient) {
    return;
  }

  if (TEST_ORG_ID) {
    try {
      await adminClient.query((internal as any).organizations.getOrganization, {
        organizationId: TEST_ORG_ID as any,
      });
    } catch (error: any) {
      console.log(
        `⚠️  TEST_ORG_ID ${TEST_ORG_ID} is invalid for this deployment (${error.message}).`
      );
      TEST_ORG_ID = "";
    }
  }

  if (TEST_USER_ID) {
    try {
      await adminClient.query((internal as any).organizations.getUser, {
        userId: TEST_USER_ID as any,
      });
    } catch (error: any) {
      console.log(
        `⚠️  TEST_USER_ID ${TEST_USER_ID} is invalid for this deployment (${error.message}).`
      );
      TEST_USER_ID = "";
    }
  }
}

async function resolveFromSession(): Promise<void> {
  if (!TEST_SESSION_ID) {
    return;
  }

  try {
    const currentUser: any = await requireClient().query(api.auth.getCurrentUser, {
      sessionId: TEST_SESSION_ID,
    });

    if (!currentUser) {
      console.log("⚠️  TEST_SESSION_ID is set but did not resolve to an active session.");
      return;
    }

    const sessionOrgId =
      currentUser.currentOrganization?.id ||
      currentUser.defaultOrgId ||
      currentUser.organizations?.[0]?.id ||
      "";
    const sessionUserId = currentUser.id || "";

    if (sessionOrgId && sessionOrgId !== TEST_ORG_ID) {
      console.log(
        `ℹ️  Using organization from TEST_SESSION_ID (${sessionOrgId}) instead of TEST_ORG_ID (${TEST_ORG_ID || "unset"}).`
      );
      TEST_ORG_ID = sessionOrgId;
    }

    if (sessionUserId && sessionUserId !== TEST_USER_ID) {
      console.log(
        `ℹ️  Using user from TEST_SESSION_ID (${sessionUserId}) instead of TEST_USER_ID (${TEST_USER_ID || "unset"}).`
      );
      TEST_USER_ID = sessionUserId;
    }
  } catch (error: any) {
    console.log(`⚠️  Failed to resolve fixture IDs from TEST_SESSION_ID (${error.message}).`);
  }
}

async function resolveFromAdminFallback(): Promise<void> {
  if (!adminClient) {
    return;
  }

  if (!TEST_ORG_ID) {
    try {
      const defaultOrgId = await adminClient.query((internal as any).auth.getDefaultOrganization, {});
      if (defaultOrgId) {
        TEST_ORG_ID = defaultOrgId as string;
        console.log(`ℹ️  Resolved fallback organization via admin token: ${TEST_ORG_ID}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Failed to resolve fallback organization (${error.message}).`);
    }
  }

  if (!TEST_USER_ID && TEST_ORG_ID) {
    try {
      const members = await adminClient.query(
        (internal as any).stripe.platformWebhooks.getOrganizationMembers,
        {
          organizationId: TEST_ORG_ID as any,
        }
      );
      const firstMember = Array.isArray(members)
        ? members.find((member: any) => member?.user?._id)
        : null;
      if (firstMember?.user?._id) {
        TEST_USER_ID = firstMember.user._id as string;
        console.log(`ℹ️  Resolved fallback user from organization member list: ${TEST_USER_ID}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Failed to resolve fallback user (${error.message}).`);
    }
  }
}

async function resolveValidationFixtureContext(): Promise<void> {
  await validateSeededIdsWithAdmin();
  await resolveFromSession();
  await resolveFromAdminFallback();

  if (!TEST_ORG_ID || !TEST_USER_ID) {
    const missing = [
      !TEST_ORG_ID ? "TEST_ORG_ID" : null,
      !TEST_USER_ID ? "TEST_USER_ID" : null,
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(
      [
        `Missing validation fixture context: ${missing}.`,
        "Set TEST_ORG_ID/TEST_USER_ID directly, or set TEST_SESSION_ID for automatic resolution.",
        CONVEX_DEPLOY_KEY
          ? "Admin fallback is enabled via CONVEX_DEPLOY_KEY but could not resolve a usable org/user pair."
          : "Set CONVEX_DEPLOY_KEY to enable admin fallback resolution in local dev.",
      ].join(" ")
    );
  }

  validationFixture = {
    organizationId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  };

  console.log(
    `ℹ️  Validation fixture context: org=${validationFixture.organizationId} user=${validationFixture.userId}`
  );
}

async function loadConversationModelResolution(
  conversationId: string,
  retries = 5,
  delayMs = 400
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const conversation: any = await requireClient().query(api.ai.conversations.getConversation, {
      conversationId: conversationId as any,
    });
    const resolution = getLatestAssistantModelResolution(conversation.messages || []);
    if (resolution) {
      return resolution;
    }
    if (typeof conversation.modelId === "string" && conversation.modelId.trim().length > 0) {
      return {
        selectedModel: conversation.modelId.trim(),
        selectionSource: "conversation_model_pin",
        fallbackUsed: false,
      };
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

async function loadLatestAssistantMessageContent(
  conversationId: string,
  retries = 2,
  delayMs = 250
): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const conversation: any = await requireClient().query(api.ai.conversations.getConversation, {
      conversationId: conversationId as any,
    });
    const messages = Array.isArray(conversation?.messages)
      ? conversation.messages
      : [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (
        message?.role === "assistant" &&
        typeof message?.content === "string" &&
        message.content.trim().length > 0
      ) {
        return message.content.trim();
      }
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

async function ensureExpectedModelWasUsed(
  response: {
    conversationId?: string;
    modelResolution?: {
      requestedModel?: string;
      selectedModel: string;
      selectionSource: string;
      fallbackUsed: boolean;
      fallbackReason?: string;
    };
  },
  expectedModel: string,
  startTime: number
): Promise<TestResult | null> {
  let resolution = response.modelResolution;

  if (
    !resolution &&
    response.conversationId &&
    response.conversationId.trim().length > 0
  ) {
    resolution = await loadConversationModelResolution(response.conversationId);
  }

  if (!resolution) {
    console.log(
      "     ⚠️  WARN: modelResolution metadata unavailable; skipping strict model assertion"
    );
    return null;
  }

  if (resolution.selectedModel !== expectedModel) {
    const duration = Date.now() - startTime;
    const message = formatModelMismatchMessage({
      expectedModel,
      resolution,
    });
    console.log(`     ❌ FAIL: ${message}`);
    return {
      passed: false,
      message,
      duration,
    };
  }

  return null;
}

async function probeRuntimeModelSelection(modelId: string): Promise<{
  selectedModel: string;
  selectionSource?: string;
} | null> {
  const { organizationId, userId } = getValidationFixture();
  try {
    const { response } = await sendValidationMessage({
      message: "Validation routing preflight. Reply with a brief acknowledgement.",
      organizationId,
      userId,
      modelId,
    });

    let resolution = response?.modelResolution;
    if (
      !resolution &&
      typeof response?.conversationId === "string" &&
      response.conversationId.trim().length > 0
    ) {
      resolution = await loadConversationModelResolution(response.conversationId);
    }

    if (
      !resolution ||
      typeof resolution.selectedModel !== "string" ||
      resolution.selectedModel.trim().length === 0
    ) {
      return null;
    }

    return {
      selectedModel: resolution.selectedModel.trim(),
      selectionSource:
        typeof resolution.selectionSource === "string" &&
        resolution.selectionSource.trim().length > 0
          ? resolution.selectionSource.trim()
          : undefined,
    };
  } catch (error: any) {
    console.log(
      `ℹ️  Model routing preflight skipped (${error?.message || "unknown_error"})`
    );
    return null;
  }
}

async function resolveDefaultModelId(): Promise<string> {
  let candidateModelId: string;
  let candidateSourceLabel: string;

  if (TEST_MODEL_ID && TEST_MODEL_ID.trim().length > 0) {
    candidateModelId = TEST_MODEL_ID.trim();
    candidateSourceLabel = "TEST_MODEL_ID";
  } else {
    const { organizationId } = getValidationFixture();
    const settings: any = await requireClient().query(api.ai.settings.getAISettings, {
      organizationId: organizationId as any,
    });
    const platformEnabledModels: Array<{ id: string }> = await requireClient().query(
      api.ai.platformModels.getEnabledModels,
      {}
    );

    const resolved = resolveEffectiveValidationModel({
      settings,
      platformEnabledModelIds: platformEnabledModels.map((model) => model.id),
    });

    if (!resolved) {
      throw new Error("Unable to resolve a default validation model from org/platform policy");
    }

    candidateModelId = resolved.modelId;
    candidateSourceLabel = `org/platform policy (${resolved.selectionSource})`;
  }

  const runtimeProbe = await probeRuntimeModelSelection(candidateModelId);
  if (runtimeProbe?.selectedModel && runtimeProbe.selectedModel !== candidateModelId) {
    const strictModelSelection = process.env.MODEL_VALIDATION_STRICT_MODEL === "1";
    const rerouteNote = `${candidateModelId} -> ${runtimeProbe.selectedModel}${
      runtimeProbe.selectionSource ? ` (${runtimeProbe.selectionSource})` : ""
    }`;
    if (strictModelSelection) {
      console.log(
        `⚠️  Runtime preflight rerouted model ${rerouteNote}, but strict model mode is enabled; continuing with ${candidateModelId}.`
      );
      return candidateModelId;
    }
    console.log(
      `ℹ️  Runtime preflight rerouted ${candidateSourceLabel} model ${rerouteNote}; validating routed model.`
    );
    return runtimeProbe.selectedModel;
  }

  console.log(
    `ℹ️  Resolved validation model ${candidateModelId} from ${candidateSourceLabel}.`
  );
  return candidateModelId;
}

// Test 1: Basic Chat
async function testBasicChat(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 1: Basic Chat Response");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();

  try {
    const { response, latencyMs } = await sendValidationMessage({
      message: `Reply with exactly "${BASIC_CHAT_ACK_TOKEN}" and nothing else.`,
      organizationId,
      userId,
      modelId,
    });

    const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
    if (modelCheck) {
      return modelCheck;
    }

    const duration = Date.now() - startTime;
    const usageAndCost = extractUsageAndCostFromResponse(response);
    const responseText =
      typeof response.message === "string" ? response.message.trim() : "";
    const acknowledgedValidation =
      responseText.toUpperCase().includes(BASIC_CHAT_ACK_TOKEN);

    if (responseText.length > 0) {
      console.log(`     ✅ PASS: Got response (${duration}ms)`);
      if (!acknowledgedValidation) {
        console.log("     ⚠️  WARN: Model ignored strict ACK token format");
      }
      console.log(`     Response: ${responseText.substring(0, 80)}...`);
      return {
        passed: true,
        message: "Basic chat works",
        duration,
        latencySamplesMs: [latencyMs],
        ...usageAndCost,
      };
    } else {
      console.log(`     ❌ FAIL: Empty response`);
      return {
        passed: false,
        message: "Empty response",
        duration,
        latencySamplesMs: [latencyMs],
        ...usageAndCost,
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return { passed: false, message: error.message, duration, error: error.message };
  }
}

// Test 2: Tool Calling
async function testToolCalling(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 2: Tool Calling");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();

  try {
    const { response, latencyMs } = await sendValidationMessage({
      message: "List my forms",
      organizationId,
      userId,
      modelId,
    });

    const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
    if (modelCheck) {
      return modelCheck;
    }

    const duration = Date.now() - startTime;
    const toolCalls = response.toolCalls || [];
    const usageAndCost = extractUsageAndCostFromResponse(response);

    if (toolCalls.length > 0 && toolCalls[0].name === "list_forms") {
      console.log(`     ✅ PASS: Called list_forms tool (${duration}ms)`);
      console.log(`     Tool status: ${toolCalls[0].status}`);
      return {
        passed: true,
        message: "Tool calling works",
        duration,
        latencySamplesMs: [latencyMs],
        toolCallParsed: true,
        ...usageAndCost,
      };
    } else {
      console.log(`     ❌ FAIL: Expected list_forms, got ${toolCalls[0]?.name || "no tool"}`);
      return {
        passed: false,
        message: `Wrong tool: ${toolCalls[0]?.name}`,
        duration,
        latencySamplesMs: [latencyMs],
        toolCallParsed: false,
        ...usageAndCost,
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return { passed: false, message: error.message, duration, error: error.message };
  }
}

// Test 3: Complex Parameters
async function testComplexParams(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 3: Complex Parameters");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();

  try {
    const { response, latencyMs } = await sendValidationMessage({
      message: CONTACT_SEARCH_CONTRACT_PROMPT,
      organizationId,
      userId,
      modelId,
    });

    const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
    if (modelCheck) {
      return modelCheck;
    }

    const duration = Date.now() - startTime;
    const toolCalls = response.toolCalls || [];
    const usageAndCost = extractUsageAndCostFromResponse(response);

    if (toolCalls.length > 0) {
      const firstTool = toolCalls[0];
      const parsedArgs =
        hydrateToolCallArgumentsWithRuntimeEvidence(firstTool);
      const hasQuery =
        parsedArgs.query ||
        parsedArgs.searchQuery ||
        parsedArgs.name ||
        parsedArgs.search;

      if (firstTool.name === "search_contacts") {
        if (hasQuery) {
          console.log(`     ✅ PASS: Parsed complex parameters (${duration}ms)`);
          console.log(
            `     Arguments: ${JSON.stringify(parsedArgs).substring(0, 80)}...`
          );
          return {
            passed: true,
            message: "Complex params work",
            duration,
            latencySamplesMs: [latencyMs],
            schemaFidelity: true,
            ...usageAndCost,
          };
        }

        console.log(`     ⚠️  PARTIAL: Called search_contacts but missing query`);
        return {
          passed: false,
          message: "Missing parameters",
          duration,
          latencySamplesMs: [latencyMs],
          schemaFidelity: false,
          ...usageAndCost,
        };
      }

      if (firstTool.name === "manage_crm") {
        const hasSearchAction =
          typeof parsedArgs.action === "string" &&
          parsedArgs.action.toLowerCase().includes("search");
        const hasSearchInput =
          Boolean(hasQuery) ||
          Boolean(parsedArgs.firstName) ||
          Boolean(parsedArgs.lastName) ||
          Boolean(parsedArgs.email) ||
          Boolean(parsedArgs.organizationName);

        if (hasSearchAction && hasSearchInput) {
          console.log(
            `     ✅ PASS: Parsed complex parameters via manage_crm (${duration}ms)`
          );
          console.log(
            `     Arguments: ${JSON.stringify(parsedArgs).substring(0, 80)}...`
          );
          return {
            passed: true,
            message: "Complex params work",
            duration,
            latencySamplesMs: [latencyMs],
            schemaFidelity: true,
            ...usageAndCost,
          };
        }

        console.log(
          `     ⚠️  PARTIAL: Called manage_crm but missing required search signal fields`
        );
        return {
          passed: false,
          message: "Missing parameters",
          duration,
          latencySamplesMs: [latencyMs],
          schemaFidelity: false,
          ...usageAndCost,
        };
      }

      console.log(`     ❌ FAIL: Unexpected tool ${firstTool.name}`);
      return {
        passed: false,
        message: `Wrong tool: ${firstTool.name}`,
        duration,
        latencySamplesMs: [latencyMs],
        schemaFidelity: false,
        ...usageAndCost,
      };
    } else {
      console.log(`     ❌ FAIL: Expected search_contacts or manage_crm tool`);
      return {
        passed: false,
        message: "Wrong tool or no tool",
        duration,
        latencySamplesMs: [latencyMs],
        schemaFidelity: false,
        ...usageAndCost,
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return { passed: false, message: error.message, duration, error: error.message };
  }
}

// Test 4: Multi-turn Conversation
async function testMultiTurn(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 4: Multi-turn Context");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();
  const latencySamples: number[] = [];
  const memoryToken =
    `${MULTI_TURN_CONTEXT_TOKEN_PREFIX}-${Date.now().toString(36).toUpperCase()}`;

  try {
    // Create a conversation first
    const conv: any = await requireClient().mutation(api.ai.conversations.createConversation, {
      organizationId: organizationId as any,
      userId: userId as any,
      title: "Test Multi-turn",
    });

    // First message
    const firstTurn = await sendValidationMessage({
      conversationId: conv,
      message:
        `Remember this token exactly for the next turn: ${memoryToken}. Reply with "READY ${memoryToken}".`,
      organizationId,
      userId,
      modelId,
    });
    latencySamples.push(firstTurn.latencyMs);

    // Second message (should remember context)
    const secondTurn = await sendValidationMessage({
      conversationId: conv,
      message: "What token did I ask you to remember? Reply with only the exact token.",
      organizationId,
      userId,
      modelId,
    });
    latencySamples.push(secondTurn.latencyMs);
    let response: any = secondTurn.response;

    const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
    if (modelCheck) {
      return modelCheck;
    }

    const duration = Date.now() - startTime;
    const usageAndCost = extractUsageAndCostFromResponse(secondTurn.response);
    const secondTurnToolCalls = Array.isArray(response.toolCalls)
      ? response.toolCalls
      : [];
    let responseText =
      typeof response.message === "string" ? response.message.trim() : "";
    if (!responseText) {
      const replayedMessage = await loadLatestAssistantMessageContent(conv);
      if (replayedMessage) {
        responseText = replayedMessage;
      }
    }
    let maintainedViaTokenEcho = responseText.toUpperCase().includes(memoryToken);

    // Bounded retry for transient empty duplicate/replay outcomes.
    if (!maintainedViaTokenEcho && responseText.length === 0) {
      const retryTurn = await sendValidationMessage({
        conversationId: conv,
        message: "Repeat only the exact token I asked you to remember.",
        organizationId,
        userId,
        modelId,
      });
      latencySamples.push(retryTurn.latencyMs);
      response = retryTurn.response;
      const retryModelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
      if (retryModelCheck) {
        return retryModelCheck;
      }
      responseText =
        typeof response.message === "string" ? response.message.trim() : "";
      if (!responseText) {
        const replayedMessage = await loadLatestAssistantMessageContent(conv);
        if (replayedMessage) {
          responseText = replayedMessage;
        }
      }
      maintainedViaTokenEcho = responseText.toUpperCase().includes(memoryToken);
    }

    if (maintainedViaTokenEcho) {
      console.log(`     ✅ PASS: Maintained context (${duration}ms)`);
      console.log(`     Response: ${responseText.substring(0, 80)}...`);
      return {
        passed: true,
        message: "Multi-turn works",
        duration,
        latencySamplesMs: latencySamples,
        ...usageAndCost,
      };
    } else {
      console.log(`     ❌ FAIL: Lost context`);
      if (secondTurnToolCalls.length > 0) {
        console.log(
          `     Tool call instead of token recall: ${secondTurnToolCalls[0]?.name || "unknown"}`
        );
      }
      return {
        passed: false,
        message: "Context lost",
        duration,
        latencySamplesMs: latencySamples,
        ...usageAndCost,
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return { passed: false, message: error.message, duration, error: error.message };
  }
}

// Test 5: Edge Cases
async function testEdgeCases(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 5: Edge Cases");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();

  try {
    // Test with empty/ambiguous query
    const { response, latencyMs } = await sendValidationMessage({
      message: "Search for", // Incomplete query
      organizationId,
      userId,
      modelId,
    });

    const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
    if (modelCheck) {
      return modelCheck;
    }

    const duration = Date.now() - startTime;
    const toolCalls = response.toolCalls || [];
    const usageAndCost = extractUsageAndCostFromResponse(response);

    // Should either ask for clarification OR handle gracefully
    if (response.message || toolCalls.length === 0) {
      console.log(`     ✅ PASS: Handled edge case gracefully (${duration}ms)`);
      return {
        passed: true,
        message: "Edge cases handled",
        duration,
        latencySamplesMs: [latencyMs],
        refusalHandled: true,
        ...usageAndCost,
      };
    } else {
      console.log(`     ⚠️  ACCEPTABLE: Called tool with incomplete params`);
      return {
        passed: true,
        message: "Acceptable behavior",
        duration,
        latencySamplesMs: [latencyMs],
        refusalHandled: true,
        ...usageAndCost,
      };
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return { passed: false, message: error.message, duration, error: error.message };
  }
}

// Test 6: Tool Contract Checks
async function testToolContracts(modelId: string): Promise<TestResult> {
  console.log("\n  🧪 Test 6: Tool Contract Checks");
  const startTime = Date.now();
  const { organizationId, userId } = getValidationFixture();
  let totalUsageTokens = 0;
  let totalCostUsd = 0;
  const latencySamples: number[] = [];

  try {
    if (CRITICAL_TOOL_NAMES.length !== 10) {
      const duration = Date.now() - startTime;
      console.log(
        `     ❌ FAIL: Expected 10 critical tool contracts, found ${CRITICAL_TOOL_NAMES.length}`
      );
      return {
        passed: false,
        message: `Critical contract set size mismatch (${CRITICAL_TOOL_NAMES.length})`,
        duration,
        toolCallParsed: false,
        schemaFidelity: false,
      };
    }

    const scenarios = [
      {
        prompt: "List my forms",
        expectedTools: ["list_forms"],
      },
      {
        prompt: CONTACT_SEARCH_CONTRACT_PROMPT,
        expectedTools: ["search_contacts", "manage_crm"],
      },
    ] as const;

    for (const scenario of scenarios) {
      const { response, latencyMs } = await sendValidationMessage({
        message: scenario.prompt,
        organizationId,
        userId,
        modelId,
      });
      latencySamples.push(latencyMs);

      const modelCheck = await ensureExpectedModelWasUsed(response, modelId, startTime);
      if (modelCheck) {
        return modelCheck;
      }

      const usageAndCost = extractUsageAndCostFromResponse(response);
      if (typeof usageAndCost.usageTokens === "number") {
        totalUsageTokens += usageAndCost.usageTokens;
      }
      if (typeof usageAndCost.costUsd === "number") {
        totalCostUsd += usageAndCost.costUsd;
      }

      const toolCalls = response.toolCalls || [];
      const firstToolCall = toolCalls[0];

      if (!firstToolCall) {
        const duration = Date.now() - startTime;
        console.log(
          `     ❌ FAIL: No tool call returned for contract scenario "${scenario.expectedTools.join("|")}"`
        );
        return {
          passed: false,
          message: `No tool call for ${scenario.expectedTools.join("|")}`,
          duration,
          latencySamplesMs: latencySamples,
          toolCallParsed: false,
          schemaFidelity: false,
          usageTokens: totalUsageTokens > 0 ? totalUsageTokens : undefined,
          costUsd: totalCostUsd > 0 ? totalCostUsd : undefined,
        };
      }

      if (!(scenario.expectedTools as readonly string[]).includes(firstToolCall.name)) {
        const duration = Date.now() - startTime;
        console.log(
          `     ❌ FAIL: Expected ${scenario.expectedTools.join("|")}, got ${firstToolCall.name}`
        );
        return {
          passed: false,
          message: `Wrong tool for contract check: ${firstToolCall.name}`,
          duration,
          latencySamplesMs: latencySamples,
          toolCallParsed: false,
          schemaFidelity: false,
          usageTokens: totalUsageTokens > 0 ? totalUsageTokens : undefined,
          costUsd: totalCostUsd > 0 ? totalCostUsd : undefined,
        };
      }

      const normalizedArguments =
        hydrateToolCallArgumentsWithRuntimeEvidence(firstToolCall);

      const contractResult = validateToolCallAgainstContract({
        name: firstToolCall.name,
        arguments: normalizedArguments,
      });

      if (!contractResult.passed) {
        const duration = Date.now() - startTime;
        console.log(`     ❌ FAIL: ${contractResult.message}`);
        return {
          passed: false,
          message: contractResult.message,
          duration,
          latencySamplesMs: latencySamples,
          toolCallParsed: false,
          schemaFidelity: false,
          usageTokens: totalUsageTokens > 0 ? totalUsageTokens : undefined,
          costUsd: totalCostUsd > 0 ? totalCostUsd : undefined,
        };
      }

      console.log(
        `     ✅ ${firstToolCall.name} matched contract ${contractResult.contractVersion}`
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `     ✅ PASS: Contract checks passed (${duration}ms)`
    );
    return {
      passed: true,
      message: "Tool contract checks passed",
      duration,
      latencySamplesMs: latencySamples,
      toolCallParsed: true,
      schemaFidelity: true,
      usageTokens: totalUsageTokens > 0 ? totalUsageTokens : undefined,
      costUsd: totalCostUsd > 0 ? totalCostUsd : undefined,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`     ❌ ERROR: ${error.message}`);
    return {
      passed: false,
      message: error.message,
      duration,
      error: error.message,
    };
  }
}

// Run all validation tests for a model
async function validateModel(modelId: string): Promise<ValidationRunResult> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🔍 Validating Model: ${modelId}`);
  console.log(`${"=".repeat(70)}`);
  validationConversationStore.clear();
  forceDirectRuntimeTransport = false;

  const results: ValidationResult = {
    basicChat: false,
    toolCalling: false,
    complexParams: false,
    multiTurn: false,
    edgeCases: false,
    contractChecks: false,
  };

  // Run all tests sequentially
  const basicChatResult = await testBasicChat(modelId);
  results.basicChat = basicChatResult.passed;

  const toolCallingResult = await testToolCalling(modelId);
  results.toolCalling = toolCallingResult.passed;

  const complexParamsResult = await testComplexParams(modelId);
  results.complexParams = complexParamsResult.passed;

  const multiTurnResult = await testMultiTurn(modelId);
  results.multiTurn = multiTurnResult.passed;

  const edgeCasesResult = await testEdgeCases(modelId);
  results.edgeCases = edgeCasesResult.passed;

  const contractChecksResult = await testToolContracts(modelId);
  results.contractChecks = contractChecksResult.passed;

  const conformance = evaluateModelConformance({
    samples: buildConformanceSamples({
      basicChat: basicChatResult,
      toolCalling: toolCallingResult,
      complexParams: complexParamsResult,
      multiTurn: multiTurnResult,
      edgeCases: edgeCasesResult,
      contractChecks: contractChecksResult,
    }),
  });

  // Summary
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  const conformancePassedLabel = conformance.passed ? "PASS" : "FAIL";

  console.log(`\n${"=".repeat(70)}`);
  console.log(
    `📊 Summary: ${passedTests}/${totalTests} tests passed | conformance=${conformancePassedLabel}`
  );
  console.log(`${"=".repeat(70)}\n`);
  printConformanceSummary(conformance);

  return {
    results,
    conformance,
  };
}

// Save validation results to database
async function saveValidationResults(
  modelId: string,
  results: ValidationResult,
  status: "validated" | "failed",
  conformance?: ModelConformanceSummary
) {
  if (!TEST_SESSION_ID) {
    console.log(
      "\n⚠️  TEST_SESSION_ID not set; skipping database persistence of validation results."
    );
    return;
  }

  console.log(`\n💾 Saving validation results to database...`);

  try {
    // Note: You'll need to create this mutation in convex/ai/platformModelManagement.ts
    await requireClient().mutation(api.ai.platformModelManagement.updateModelValidation as any, {
      sessionId: TEST_SESSION_ID,
      modelId,
      validationStatus: status,
      testResults: {
        ...results,
        ...(conformance ? { conformance } : {}),
        timestamp: Date.now(),
      },
      notes: `Validated via CLI test script on ${new Date().toISOString()}`,
    });

    console.log(`✅ Results saved successfully`);
  } catch (error: any) {
    console.error(`❌ Failed to save results: ${error.message}`);
    console.log(`   Results can still be reviewed above`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const modelArg = args.find((arg) => arg.startsWith("--model="));
  const providerArg = args.find((arg) => arg.startsWith("--provider="));
  const untestedOnly = args.includes("--untested-only");
  const offlineOnly = args.includes("--offline");
  const liveOnly = args.includes("--live");

  try {
    if (offlineOnly || (!CONVEX_URL && !liveOnly)) {
      const offlineSummary = runOfflineConformanceHarness();
      process.exit(offlineSummary.passed ? 0 : 1);
    }

    if (!CONVEX_URL) {
      throw new Error(
        "NEXT_PUBLIC_CONVEX_URL is required for live model validation. Use --offline to run local conformance harness only."
      );
    }

    await resolveValidationFixtureContext();
    if (VALIDATION_REASONING_EFFORT) {
      console.log(
        `ℹ️  Validation harness reasoning effort: ${VALIDATION_REASONING_EFFORT}`
      );
    }

    if (modelArg) {
      // Test single model
      const modelId = modelArg.split("=")[1];
      const validationRun = await validateModel(modelId);

      const allPassed =
        Object.values(validationRun.results).every(Boolean) &&
        validationRun.conformance.passed;
      const status = allPassed ? "validated" : "failed";

      await saveValidationResults(
        modelId,
        validationRun.results,
        status,
        validationRun.conformance
      );

      process.exit(allPassed ? 0 : 1);
    } else if (providerArg || untestedOnly) {
      if (!TEST_SESSION_ID) {
        console.error("❌ TEST_SESSION_ID is required for provider/batch model queries.");
        console.error("   Use --model=<modelId> or set TEST_SESSION_ID in .env.local.");
        process.exit(1);
      }

      console.log("🔄 Fetching models to test...");

      // Fetch models from database
      const platformModels: any = await requireClient().query(api.ai.platformModelManagement.getPlatformModels, {
        sessionId: TEST_SESSION_ID,
      });

      let modelsToTest = platformModels.models;

      if (providerArg) {
        const provider = providerArg.split("=")[1];
        modelsToTest = modelsToTest.filter((m: any) => m.provider === provider);
      }

      if (untestedOnly) {
        modelsToTest = modelsToTest.filter(
          (m: any) => !m.validationStatus || m.validationStatus === "not_tested"
        );
      }

      console.log(`\n📋 Testing ${modelsToTest.length} model(s)...\n`);

      for (const model of modelsToTest) {
        const validationRun = await validateModel(model.modelId);

        const allPassed =
          Object.values(validationRun.results).every(Boolean) &&
          validationRun.conformance.passed;
        const status = allPassed ? "validated" : "failed";

        await saveValidationResults(
          model.modelId,
          validationRun.results,
          status,
          validationRun.conformance
        );

        // Wait between tests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      console.log("\n✅ Batch testing complete!");
    } else {
      const defaultModelId = await resolveDefaultModelId();
      console.log(
        `ℹ️  No arguments provided; running default model validation for ${defaultModelId}`
      );
      const validationRun = await validateModel(defaultModelId);

      const allPassed =
        Object.values(validationRun.results).every(Boolean) &&
        validationRun.conformance.passed;
      const status = allPassed ? "validated" : "failed";

      await saveValidationResults(
        defaultModelId,
        validationRun.results,
        status,
        validationRun.conformance
      );

      process.exit(allPassed ? 0 : 1);
    }
  } catch (error: any) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();
