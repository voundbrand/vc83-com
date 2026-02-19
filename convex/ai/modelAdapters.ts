/**
 * Model Adapters for Different LLM Providers
 *
 * Normalizes provider/runtime contract for:
 * - request provider detection/routing,
 * - response usage + tool calls,
 * - structured output extraction,
 * - provider error classes.
 */

import type { AiProviderId } from "../channels/types";

const CANONICAL_PROVIDER_ALIAS: Record<string, AiProviderId> = {
  openrouter: "openrouter",
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  google: "gemini",
  grok: "grok",
  xai: "grok",
  mistral: "mistral",
  kimi: "kimi",
  elevenlabs: "elevenlabs",
  openai_compatible: "openai_compatible",
  "openai-compatible": "openai_compatible",
};

const PROVIDER_DEFAULT_BASE_URL: Record<AiProviderId, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  grok: "https://api.x.ai/v1",
  mistral: "https://api.mistral.ai/v1",
  kimi: "https://api.moonshot.ai/v1",
  elevenlabs: "https://api.elevenlabs.io/v1",
  openai_compatible: "https://api.openai.com/v1",
};

export type ToolCallMessage = {
  role: "assistant";
  content: string | null;
  tool_calls: NormalizedToolCall[];
};

export type ToolResultMessage = {
  role: "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
};

export interface NormalizedToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface NormalizedUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface NormalizedStructuredOutput {
  format: "json_object" | "json_code_block";
  value: unknown;
}

export interface NormalizedChoiceMessage {
  content: string | null;
  tool_calls?: NormalizedToolCall[];
}

export interface NormalizedProviderCompletion {
  providerId: AiProviderId;
  choices: Array<{
    message: NormalizedChoiceMessage;
  }>;
  usage: NormalizedUsage;
  structuredOutput?: NormalizedStructuredOutput;
  raw: unknown;
}

export type ProviderErrorClass =
  | "auth"
  | "rate_limit"
  | "quota"
  | "invalid_request"
  | "provider_unavailable"
  | "network"
  | "timeout"
  | "safety"
  | "unknown";

export interface NormalizedProviderError {
  providerId: AiProviderId;
  message: string;
  statusCode?: number;
  code?: string;
  errorClass: ProviderErrorClass;
  retryable: boolean;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function normalizeProviderToken(value: unknown): AiProviderId | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  return CANONICAL_PROVIDER_ALIAS[normalized] ?? null;
}

/**
 * Detect provider from model ID or provider token.
 *
 * @example
 * detectProvider("anthropic/claude-3-5-sonnet") // "anthropic"
 * detectProvider("openai/gpt-4o") // "openai"
 * detectProvider("google/gemini-1.5-pro") // "gemini"
 */
export function detectProvider(
  modelOrProvider: string,
  fallbackProvider?: string | null
): AiProviderId {
  const directProvider = normalizeProviderToken(modelOrProvider);
  if (directProvider) {
    return directProvider;
  }

  const modelToken = normalizeString(modelOrProvider)?.split("/", 1)[0]?.trim();
  const modelProvider = normalizeProviderToken(modelToken);
  if (modelProvider) {
    return modelProvider;
  }

  return normalizeProviderToken(fallbackProvider) ?? "openrouter";
}

export function normalizeModelForProvider(
  provider: string,
  model: string
): string {
  const providerId = detectProvider(provider);
  const normalizedModel = normalizeString(model) ?? model;

  if (providerId === "openrouter") {
    return normalizedModel;
  }

  const slashIndex = normalizedModel.indexOf("/");
  if (slashIndex === -1) {
    return normalizedModel;
  }

  if (providerId === "openai_compatible") {
    const withoutPrefix = normalizedModel.slice(slashIndex + 1).trim();
    return withoutPrefix.length > 0 ? withoutPrefix : normalizedModel;
  }

  const modelProvider = detectProvider(normalizedModel, providerId);
  if (modelProvider === providerId) {
    const withoutPrefix = normalizedModel.slice(slashIndex + 1).trim();
    return withoutPrefix.length > 0 ? withoutPrefix : normalizedModel;
  }

  return normalizedModel;
}

export function getDefaultProviderBaseUrl(provider: string): string {
  const providerId = detectProvider(provider);
  return PROVIDER_DEFAULT_BASE_URL[providerId];
}

export function resolveProviderBaseUrl(args: {
  providerId: string;
  baseUrl?: string | null;
  envOpenAiCompatibleBaseUrl?: string | null;
}): string {
  const providerId = detectProvider(args.providerId);
  const explicitBaseUrl = normalizeString(args.baseUrl);
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }

  if (providerId === "openai_compatible") {
    const envBaseUrl = normalizeString(args.envOpenAiCompatibleBaseUrl);
    if (envBaseUrl) {
      return envBaseUrl.replace(/\/+$/, "");
    }
  }

  return getDefaultProviderBaseUrl(providerId);
}

/**
 * Format tool result message for the specific provider.
 * Runtime stores/forwards one OpenAI-compatible envelope.
 */
export function formatToolResult(
  provider: string,
  toolCallId: string,
  toolName: string,
  result: unknown
): ToolResultMessage {
  void provider;
  return {
    role: "tool",
    content: JSON.stringify(result),
    tool_call_id: toolCallId,
    name: toolName,
  };
}

/**
 * Check if a provider supports tool calling
 */
export function supportsToolCalling(provider: string): boolean {
  return getProviderConfig(provider).supportsToolCalling;
}

/**
 * Get provider-specific configuration
 */
export interface ProviderConfig {
  supportsToolCalling: boolean;
  maxToolCallRounds: number;
  requiresToolCallId: boolean;
  toolResultField: "tool_use_id" | "tool_call_id";
  requestProtocol: "openai_compatible" | "anthropic_messages";
  supportsStructuredOutput: boolean;
}

export function getProviderConfig(provider: string): ProviderConfig {
  const providerId = detectProvider(provider);

  switch (providerId) {
    case "anthropic":
      return {
        supportsToolCalling: true,
        maxToolCallRounds: 3,
        requiresToolCallId: true,
        toolResultField: "tool_use_id",
        requestProtocol: "anthropic_messages",
        supportsStructuredOutput: true,
      };

    case "openrouter":
    case "openai":
    case "gemini":
    case "openai_compatible":
    case "grok":
    case "mistral":
    case "kimi":
      return {
        supportsToolCalling: true,
        maxToolCallRounds: 3,
        requiresToolCallId: true,
        toolResultField: "tool_call_id",
        requestProtocol: "openai_compatible",
        supportsStructuredOutput: true,
      };

    default:
      return {
        supportsToolCalling: false,
        maxToolCallRounds: 1,
        requiresToolCallId: false,
        toolResultField: "tool_call_id",
        requestProtocol: "openai_compatible",
        supportsStructuredOutput: false,
      };
  }
}

function normalizeToolArguments(rawArguments: unknown): string {
  if (typeof rawArguments === "string") {
    const trimmed = rawArguments.trim();
    if (trimmed.length === 0 || trimmed === "undefined" || trimmed === "null") {
      return "{}";
    }
    return trimmed;
  }

  if (rawArguments && typeof rawArguments === "object") {
    try {
      return JSON.stringify(rawArguments);
    } catch {
      return "{}";
    }
  }

  return "{}";
}

function normalizeOpenAIToolCalls(rawToolCalls: unknown): NormalizedToolCall[] {
  if (!Array.isArray(rawToolCalls)) {
    return [];
  }

  const normalized: NormalizedToolCall[] = [];
  for (let index = 0; index < rawToolCalls.length; index += 1) {
    const rawToolCall = rawToolCalls[index] as Record<string, unknown>;
    const id =
      normalizeString(rawToolCall.id) ??
      `tool_call_${index + 1}`;
    const fn = (rawToolCall.function ?? {}) as Record<string, unknown>;
    const name =
      normalizeString(fn.name) ??
      normalizeString(rawToolCall.name) ??
      `tool_${index + 1}`;

    normalized.push({
      id,
      type: "function",
      function: {
        name,
        arguments: normalizeToolArguments(
          fn.arguments ?? rawToolCall.input
        ),
      },
    });
  }

  return normalized;
}

function normalizeUsage(rawUsage: unknown): NormalizedUsage {
  const usage = (rawUsage ?? {}) as Record<string, unknown>;

  const promptTokens = normalizeInteger(
    usage.prompt_tokens ?? usage.input_tokens
  );
  const completionTokens = normalizeInteger(
    usage.completion_tokens ?? usage.output_tokens
  );
  const totalTokens = normalizeInteger(
    usage.total_tokens ?? promptTokens + completionTokens
  );

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  };
}

function normalizeStructuredOutput(rawContent: unknown): NormalizedStructuredOutput | undefined {
  if (typeof rawContent !== "string") {
    return undefined;
  }

  const trimmed = rawContent.trim();
  if (!trimmed) {
    return undefined;
  }

  const directJson = parseJson(trimmed);
  if (directJson !== undefined) {
    return {
      format: "json_object",
      value: directJson,
    };
  }

  const fencedJsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (!fencedJsonMatch) {
    return undefined;
  }

  const parsed = parseJson(fencedJsonMatch[1]);
  if (parsed === undefined) {
    return undefined;
  }

  return {
    format: "json_code_block",
    value: parsed,
  };
}

function normalizeOpenAICompatibleCompletion(args: {
  providerId: AiProviderId;
  response: unknown;
}): NormalizedProviderCompletion {
  const record = (args.response ?? {}) as Record<string, unknown>;
  const rawChoices = Array.isArray(record.choices)
    ? (record.choices as Array<Record<string, unknown>>)
    : [];

  const choices = rawChoices.length > 0
    ? rawChoices.map((choice) => {
        const message = (choice.message ?? {}) as Record<string, unknown>;
        const content =
          message.content === null
            ? null
            : typeof message.content === "string"
            ? message.content
            : "";

        const normalizedToolCalls = normalizeOpenAIToolCalls(message.tool_calls);

        return {
          message: {
            content,
            tool_calls: normalizedToolCalls.length > 0 ? normalizedToolCalls : undefined,
          },
        };
      })
    : [
        {
          message: {
            content: typeof record.output_text === "string" ? record.output_text : "",
          },
        },
      ];

  const firstContent = choices[0]?.message.content ?? "";
  const structuredOutput =
    normalizeStructuredOutput(record.structured_output) ??
    normalizeStructuredOutput(firstContent);

  return {
    providerId: args.providerId,
    choices,
    usage: normalizeUsage(record.usage),
    structuredOutput,
    raw: args.response,
  };
}

function normalizeAnthropicCompletion(args: {
  providerId: AiProviderId;
  response: unknown;
}): NormalizedProviderCompletion {
  const record = (args.response ?? {}) as Record<string, unknown>;
  const contentBlocks = Array.isArray(record.content)
    ? (record.content as Array<Record<string, unknown>>)
    : [];

  const textParts: string[] = [];
  const toolCalls: NormalizedToolCall[] = [];

  for (let index = 0; index < contentBlocks.length; index += 1) {
    const block = contentBlocks[index];
    const blockType = normalizeString(block.type) ?? "";

    if (blockType === "text") {
      const blockText = normalizeString(block.text);
      if (blockText) {
        textParts.push(blockText);
      }
      continue;
    }

    if (blockType === "tool_use") {
      toolCalls.push({
        id: normalizeString(block.id) ?? `tool_call_${index + 1}`,
        type: "function",
        function: {
          name: normalizeString(block.name) ?? `tool_${index + 1}`,
          arguments: normalizeToolArguments(block.input),
        },
      });
    }
  }

  const content = textParts.join("\n").trim();
  const structuredOutput = normalizeStructuredOutput(content);

  return {
    providerId: args.providerId,
    choices: [
      {
        message: {
          content: content.length > 0 ? content : null,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        },
      },
    ],
    usage: normalizeUsage(record.usage),
    structuredOutput,
    raw: args.response,
  };
}

export function normalizeProviderCompletionResponse(args: {
  providerId: string;
  response: unknown;
}): NormalizedProviderCompletion {
  const providerId = detectProvider(args.providerId);
  const config = getProviderConfig(providerId);

  if (config.requestProtocol === "anthropic_messages") {
    return normalizeAnthropicCompletion({
      providerId,
      response: args.response,
    });
  }

  return normalizeOpenAICompatibleCompletion({
    providerId,
    response: args.response,
  });
}

function extractErrorMessage(errorPayload: Record<string, unknown>): string {
  const providerError = (errorPayload.error ?? {}) as Record<string, unknown>;

  return (
    normalizeString(providerError.message) ??
    normalizeString(errorPayload.message) ??
    normalizeString(providerError.type) ??
    normalizeString(providerError.code) ??
    "Provider returned an unknown error"
  );
}

function extractErrorCode(errorPayload: Record<string, unknown>): string | undefined {
  const providerError = (errorPayload.error ?? {}) as Record<string, unknown>;
  return (
    normalizeString(providerError.code) ??
    normalizeString(providerError.type) ??
    normalizeString(errorPayload.code) ??
    undefined
  );
}

function extractErrorStatus(errorPayload: Record<string, unknown>): number | undefined {
  const statusCandidate =
    errorPayload.statusCode ??
    errorPayload.status ??
    (errorPayload.response as Record<string, unknown> | undefined)?.status;

  if (typeof statusCandidate !== "number" || !Number.isFinite(statusCandidate)) {
    return undefined;
  }
  return Math.floor(statusCandidate);
}

export function normalizeProviderError(args: {
  providerId: string;
  error: unknown;
  statusCode?: number;
}): NormalizedProviderError {
  const providerId = detectProvider(args.providerId);
  const payload = (args.error ?? {}) as Record<string, unknown>;
  const message = extractErrorMessage(payload);
  const code = extractErrorCode(payload);
  const statusCode = args.statusCode ?? extractErrorStatus(payload);
  const normalizedMessage = message.toLowerCase();

  if (statusCode === 401 || statusCode === 403) {
    return {
      providerId,
      message,
      code,
      statusCode,
      errorClass: "auth",
      retryable: false,
    };
  }

  if (statusCode === 429) {
    const quotaSignal =
      normalizedMessage.includes("quota") ||
      normalizedMessage.includes("insufficient credits") ||
      normalizedMessage.includes("billing");
    return {
      providerId,
      message,
      code,
      statusCode,
      errorClass: quotaSignal ? "quota" : "rate_limit",
      retryable: !quotaSignal,
    };
  }

  if (
    statusCode === 400 ||
    statusCode === 404 ||
    statusCode === 409 ||
    statusCode === 422
  ) {
    return {
      providerId,
      message,
      code,
      statusCode,
      errorClass: "invalid_request",
      retryable: false,
    };
  }

  if (typeof statusCode === "number" && statusCode >= 500) {
    return {
      providerId,
      message,
      code,
      statusCode,
      errorClass: "provider_unavailable",
      retryable: true,
    };
  }

  if (
    normalizedMessage.includes("timed out") ||
    normalizedMessage.includes("timeout")
  ) {
    return {
      providerId,
      message,
      code,
      statusCode,
      errorClass: "timeout",
      retryable: true,
    };
  }

  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("fetch failed") ||
    normalizedMessage.includes("socket hang up") ||
    normalizedMessage.includes("econnreset") ||
    normalizedMessage.includes("enotfound")
  ) {
    return {
      providerId,
      message,
      code,
      statusCode,
      errorClass: "network",
      retryable: true,
    };
  }

  if (
    normalizedMessage.includes("safety") ||
    normalizedMessage.includes("refusal") ||
    normalizedMessage.includes("blocked")
  ) {
    return {
      providerId,
      message,
      code,
      statusCode,
      errorClass: "safety",
      retryable: false,
    };
  }

  return {
    providerId,
    message,
    code,
    statusCode,
    errorClass: "unknown",
    retryable: true,
  };
}

export function buildEnvApiKeysByProvider(
  env: Record<string, string | undefined>
): Partial<Record<AiProviderId, string | undefined>> {
  return {
    openrouter: env.OPENROUTER_API_KEY,
    openai: env.OPENAI_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    gemini:
      env.GEMINI_API_KEY ??
      env.GOOGLE_API_KEY ??
      env.GOOGLE_GENERATIVE_AI_API_KEY,
    openai_compatible: env.OPENAI_COMPATIBLE_API_KEY,
    grok: env.XAI_API_KEY,
    mistral: env.MISTRAL_API_KEY,
    kimi: env.KIMI_API_KEY,
    elevenlabs: env.ELEVENLABS_API_KEY,
  };
}

export function resolveAuthProfileBaseUrl(args: {
  llmSettings?: {
    providerAuthProfiles?: Array<{
      profileId?: string;
      providerId?: string;
      baseUrl?: string;
    }>;
  } | null;
  providerId?: string | null;
  profileId?: string | null;
  envOpenAiCompatibleBaseUrl?: string | null;
}): string | undefined {
  const targetProviderId = detectProvider(
    args.providerId ?? "openrouter"
  );
  const targetProfileId = normalizeString(args.profileId);

  for (const profile of args.llmSettings?.providerAuthProfiles ?? []) {
    const profileProviderId = detectProvider(
      profile.providerId ?? targetProviderId
    );
    if (profileProviderId !== targetProviderId) {
      continue;
    }

    const profileId = normalizeString(profile.profileId);
    if (targetProfileId && profileId !== targetProfileId) {
      continue;
    }

    const baseUrl = normalizeString(profile.baseUrl);
    if (baseUrl) {
      return baseUrl.replace(/\/+$/, "");
    }
  }

  if (targetProviderId === "openai_compatible") {
    const envBaseUrl = normalizeString(args.envOpenAiCompatibleBaseUrl);
    if (envBaseUrl) {
      return envBaseUrl.replace(/\/+$/, "");
    }
  }

  return undefined;
}

/**
 * Format error result for tool execution failures
 */
export function formatToolError(
  provider: string,
  toolCallId: string,
  toolName: string,
  errorMessage: string
): ToolResultMessage {
  return formatToolResult(provider, toolCallId, toolName, {
    error: errorMessage,
    success: false,
  });
}
