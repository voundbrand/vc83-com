/**
 * OpenRouter Client for AI Completions
 *
 * OpenRouter provides unified access to 200+ AI models through a single API.
 * This client handles chat completions, tool calling, cost tracking, and streaming.
 */

/**
 * OpenRouter client for AI completions
 */
export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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
      tool_calls?: any;
    }>;
    tools?: Array<any>;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }) {
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

    const requestBody = {
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 4000,
      stream: params.stream ?? false,
    };

    // Log request for debugging (only in development)
    if (process.env.NODE_ENV !== "production") {
      console.log("[OpenRouter] Request:", {
        model: params.model,
        messageCount: params.messages.length,
        hasTools: !!params.tools,
        toolCount: params.tools?.length || 0,
      });
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://l4yercak3.com",
        "X-Title": process.env.OPENROUTER_APP_NAME || "l4yercak3 Platform",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Try to parse error response
      let errorMessage = "Unknown error";
      let errorDetails: any = null;

      try {
        const errorBody = await response.text();
        errorDetails = JSON.parse(errorBody);

        // Extract error message from various possible structures
        errorMessage = errorDetails.error?.message
          || errorDetails.message
          || errorDetails.error
          || "Provider returned error";

        // Log detailed error for debugging
        console.error("[OpenRouter] API Error:", {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorDetails,
          model: params.model,
          messageCount: params.messages.length,
          lastMessage: params.messages[params.messages.length - 1],
        });
      } catch (parseError) {
        console.error("[OpenRouter] Failed to parse error response:", parseError);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      throw new Error(`OpenRouter API error (${response.status}): ${errorMessage}`);
    }

    if (params.stream) {
      return response; // Return stream for client handling
    }

    const data = await response.json();

    // Log response for debugging (only in development)
    if (process.env.NODE_ENV !== "production") {
      console.log("[OpenRouter] Response:", {
        model: params.model,
        hasChoices: !!data.choices,
        choiceCount: data.choices?.length || 0,
        hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
        toolCallCount: data.choices?.[0]?.message?.tool_calls?.length || 0,
        usage: data.usage,
      });
    }

    return data;
  }

  /**
   * Calculate cost for a completion
   *
   * Real implementation should fetch rates from OpenRouter API
   */
  calculateCost(usage: {
    prompt_tokens: number;
    completion_tokens: number;
  }, model: string): number {
    // Simplified cost calculation
    // Real implementation should fetch rates from OpenRouter
    const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
      "anthropic/claude-3.5-sonnet": { input: 3, output: 15 },
      "anthropic/claude-3-5-sonnet": { input: 3, output: 15 },
      "anthropic/claude-3-sonnet": { input: 3, output: 15 },
      "openai/gpt-4o": { input: 2.5, output: 10 },
      "openai/gpt-4": { input: 30, output: 60 },
      "openai/gpt-3.5-turbo": { input: 0.5, output: 1.5 },
      "google/gemini-pro": { input: 0.125, output: 0.5 },
    };

    const rates = COST_PER_MILLION[model] || { input: 1, output: 2 };

    const inputCost = (usage.prompt_tokens / 1_000_000) * rates.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * rates.output;

    return inputCost + outputCost;
  }
}
