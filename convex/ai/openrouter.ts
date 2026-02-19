/**
 * Provider Adapter Client for AI Completions
 *
 * Maintains backwards compatibility with OpenRouter while supporting
 * provider-agnostic execution for:
 * - OpenRouter
 * - OpenAI
 * - Anthropic
 * - Gemini
 * - OpenAI-compatible custom/private endpoints
 */
import {
  calculateCostFromUsage,
  type ModelPricingRates,
  resolveModelPricingFromRecord,
} from "./modelPricing";
import {
  detectProvider,
  getProviderConfig,
  normalizeModelForProvider,
  normalizeProviderCompletionResponse,
  normalizeProviderError,
  resolveProviderBaseUrl,
} from "./modelAdapters";

interface ToolCallLike {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolSchema {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ProviderErrorEnvelope {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
  message?: string;
  code?: string;
  status?: number;
  statusCode?: number;
}

interface ProviderClientOptions {
  providerId?: string;
  baseUrl?: string;
  customHeaders?: Record<string, string>;
}

/**
 * Provider adapter client for AI completions.
 * Keep class name for backwards compatibility with existing imports.
 */
export class OpenRouterClient {
  private apiKey: string;
  private providerId: string;
  private baseUrl: string;
  private customHeaders: Record<string, string>;

  constructor(apiKey: string, options: ProviderClientOptions = {}) {
    this.apiKey = apiKey;
    this.providerId = detectProvider(options.providerId ?? "openrouter");
    this.baseUrl = resolveProviderBaseUrl({
      providerId: this.providerId,
      baseUrl: options.baseUrl,
      envOpenAiCompatibleBaseUrl: process.env.OPENAI_COMPATIBLE_BASE_URL,
    });
    this.customHeaders = options.customHeaders ?? {};
  }

  private buildHeaders(): Record<string, string> {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.customHeaders,
    };

    switch (detectProvider(this.providerId)) {
      case "openrouter":
        return {
          ...baseHeaders,
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://l4yercak3.com",
          "X-Title": process.env.OPENROUTER_APP_NAME || "l4yercak3 Platform",
        };
      case "anthropic":
        return {
          ...baseHeaders,
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        };
      case "gemini":
        return {
          ...baseHeaders,
          "Authorization": `Bearer ${this.apiKey}`,
          "x-goog-api-key": this.apiKey,
        };
      default:
        return {
          ...baseHeaders,
          "Authorization": `Bearer ${this.apiKey}`,
        };
    }
  }

  private parseToolArguments(rawArguments: string): Record<string, unknown> {
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

  private buildAnthropicRequestBody(params: {
    model: string;
    messages: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string | null;
      name?: string;
      tool_calls?: unknown;
      tool_call_id?: string;
    }>;
    tools?: ToolSchema[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }) {
    const systemParts: string[] = [];
    const anthropicMessages: Array<{
      role: "user" | "assistant";
      content: Array<Record<string, unknown>>;
    }> = [];

    for (let index = 0; index < params.messages.length; index += 1) {
      const message = params.messages[index];

      if (message.role === "system") {
        if (typeof message.content === "string" && message.content.trim().length > 0) {
          systemParts.push(message.content.trim());
        }
        continue;
      }

      if (message.role === "tool") {
        anthropicMessages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: message.tool_call_id ?? `tool_result_${index + 1}`,
              content: typeof message.content === "string" ? message.content : "",
            },
          ],
        });
        continue;
      }

      if (message.role === "assistant") {
        const contentParts: Array<Record<string, unknown>> = [];
        if (typeof message.content === "string" && message.content.trim().length > 0) {
          contentParts.push({
            type: "text",
            text: message.content,
          });
        }

        const rawToolCalls = Array.isArray(message.tool_calls)
          ? (message.tool_calls as ToolCallLike[])
          : [];
        for (let toolCallIndex = 0; toolCallIndex < rawToolCalls.length; toolCallIndex += 1) {
          const toolCall = rawToolCalls[toolCallIndex];
          contentParts.push({
            type: "tool_use",
            id: toolCall.id ?? `tool_call_${toolCallIndex + 1}`,
            name: toolCall.function?.name ?? `tool_${toolCallIndex + 1}`,
            input: this.parseToolArguments(toolCall.function?.arguments ?? "{}"),
          });
        }

        anthropicMessages.push({
          role: "assistant",
          content: contentParts.length > 0
            ? contentParts
            : [{ type: "text", text: "" }],
        });
        continue;
      }

      anthropicMessages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: typeof message.content === "string" ? message.content : "",
          },
        ],
      });
    }

    const anthropicTools = params.tools?.map((tool) => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: tool.function.parameters,
    }));

    return {
      model: normalizeModelForProvider(this.providerId, params.model),
      system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
      messages: anthropicMessages,
      tools: anthropicTools,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4000,
      stream: params.stream ?? false,
    };
  }

  /**
   * Chat completion with streaming support
   */
  async chatCompletion(params: {
    model: string;
    messages: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string | null;
      name?: string;
      tool_calls?: unknown;
      tool_call_id?: string;
    }>;
    tools?: ToolSchema[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }): Promise<any> {
    // Validate messages array
    if (!params.messages || params.messages.length === 0) {
      throw new Error("Messages array cannot be empty");
    }

    // Ensure all messages have content (except assistant messages with tool_calls or null content)
    for (const msg of params.messages) {
      if (msg.role !== "assistant" && (!msg.content || (typeof msg.content === 'string' && msg.content.trim() === ""))) {
        throw new Error(`Message with role '${msg.role}' must have non-empty content`);
      }
    }

    const providerConfig = getProviderConfig(this.providerId);
    const requestBody = providerConfig.requestProtocol === "anthropic_messages"
      ? this.buildAnthropicRequestBody(params)
      : {
          model: normalizeModelForProvider(this.providerId, params.model),
          messages: params.messages,
          tools: params.tools,
          temperature: params.temperature ?? 0.7,
          max_tokens: params.max_tokens ?? 4000,
          stream: params.stream ?? false,
        };
    const endpointPath =
      providerConfig.requestProtocol === "anthropic_messages"
        ? "/messages"
        : "/chat/completions";

    // Log request for debugging (only in development)
    if (process.env.NODE_ENV !== "production") {
      console.log("[LLMAdapter] Request:", {
        providerId: this.providerId,
        model: requestBody.model,
        endpointPath,
        messageCount: params.messages.length,
        hasTools: !!params.tools,
        toolCount: params.tools?.length || 0,
      });
    }

    const response = await fetch(`${this.baseUrl}${endpointPath}`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorBodyText = "";
      let parsedErrorBody: ProviderErrorEnvelope | null = null;

      try {
        errorBodyText = await response.text();
        parsedErrorBody = JSON.parse(errorBodyText) as ProviderErrorEnvelope;
      } catch {
        parsedErrorBody = {
          message: errorBodyText || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const normalizedError = normalizeProviderError({
        providerId: this.providerId,
        statusCode: response.status,
        error: parsedErrorBody,
      });

      console.error("[LLMAdapter] API Error:", {
        providerId: this.providerId,
        status: response.status,
        statusText: response.statusText,
        errorClass: normalizedError.errorClass,
        errorBody: parsedErrorBody,
        model: requestBody.model,
        messageCount: params.messages.length,
        lastMessage: params.messages[params.messages.length - 1],
      });

      const providerLabel = this.providerId.toUpperCase();
      const error = new Error(
        `${providerLabel} API error (${response.status}): ${normalizedError.message}`
      ) as Error & {
        providerId?: string;
        status?: number;
        statusCode?: number;
        code?: string;
        retryable?: boolean;
        errorClass?: string;
      };
      error.providerId = this.providerId;
      error.status = response.status;
      error.statusCode = response.status;
      error.code = normalizedError.code;
      error.retryable = normalizedError.retryable;
      error.errorClass = normalizedError.errorClass;
      throw error;
    }

    if (params.stream) {
      return response; // Return stream for client handling
    }

    const rawData = await response.json();
    const normalizedData = normalizeProviderCompletionResponse({
      providerId: this.providerId,
      response: rawData,
    });

    // Log response for debugging (only in development)
    if (process.env.NODE_ENV !== "production") {
      console.log("[LLMAdapter] Response:", {
        providerId: this.providerId,
        model: requestBody.model,
        hasChoices: !!normalizedData.choices,
        choiceCount: normalizedData.choices?.length || 0,
        hasToolCalls: !!normalizedData.choices?.[0]?.message?.tool_calls,
        toolCallCount: normalizedData.choices?.[0]?.message?.tool_calls?.length || 0,
        usage: normalizedData.usage,
        hasStructuredOutput: !!normalizedData.structuredOutput,
      });
    }

    return normalizedData;
  }

  /**
   * Calculate cost for a completion
   */
  calculateCost(usage: {
    prompt_tokens: number;
    completion_tokens: number;
  }, model: string, pricing?: ModelPricingRates): number {
    const fallbackResolution = pricing
      ? null
      : resolveModelPricingFromRecord(model, null);
    const resolvedPricing =
      pricing ?? fallbackResolution ?? resolveModelPricingFromRecord(model, null);

    if (fallbackResolution?.usedFallback) {
      console.warn(
        `[OpenRouter] Missing resolved pricing for model ${model}; applying fallback rates`
      );
    }

    return calculateCostFromUsage(usage, resolvedPricing);
  }
}
