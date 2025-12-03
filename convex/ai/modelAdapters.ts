/**
 * Model Adapters for Different LLM Providers
 *
 * OpenRouter supports 200+ models from different providers, each with
 * their own tool calling format. This adapter system ensures we send
 * the correct format to each provider.
 */

export type ToolCallMessage = {
  role: "assistant";
  content: string | null;
  tool_calls: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
};

export type ToolResultMessage = {
  role: "tool";
  content: string;
  [key: string]: any; // Allow provider-specific fields
};

/**
 * Detect the provider from the model string
 *
 * @example
 * detectProvider("anthropic/claude-3-5-sonnet") // "anthropic"
 * detectProvider("openai/gpt-4o") // "openai"
 * detectProvider("google/gemini-pro") // "google"
 */
export function detectProvider(model: string): string {
  const provider = model.split("/")[0];
  return provider.toLowerCase();
}

/**
 * Format tool result message for the specific provider
 */
export function formatToolResult(
  provider: string,
  toolCallId: string,
  toolName: string,
  result: any
): ToolResultMessage {
  const baseMessage: ToolResultMessage = {
    role: "tool",
    content: JSON.stringify(result),
  };

  // ALL providers through OpenRouter use OpenAI-compatible format
  // Even Anthropic models routed through Bedrock accept tool_call_id
  // (OpenRouter handles the translation internally)
  return {
    ...baseMessage,
    tool_call_id: toolCallId,
    name: toolName,
  };
}

/**
 * Check if a provider supports tool calling
 */
export function supportsToolCalling(provider: string): boolean {
  const supportedProviders = [
    "anthropic",
    "openai",
    "openrouter",
    "google",
    "meta",
    "meta-llama",
    "mistral",
    "mistralai",
    "cohere",
  ];

  return supportedProviders.includes(provider.toLowerCase());
}

/**
 * Get provider-specific configuration
 */
export interface ProviderConfig {
  supportsToolCalling: boolean;
  maxToolCallRounds: number;
  requiresToolCallId: boolean;
  toolResultField: "tool_use_id" | "tool_call_id";
}

export function getProviderConfig(provider: string): ProviderConfig {
  switch (provider) {
    case "anthropic":
      return {
        supportsToolCalling: true,
        maxToolCallRounds: 3,
        requiresToolCallId: true,
        toolResultField: "tool_use_id",
      };

    case "openai":
    case "openrouter":
      return {
        supportsToolCalling: true,
        maxToolCallRounds: 3,
        requiresToolCallId: true,
        toolResultField: "tool_call_id",
      };

    case "google":
      return {
        supportsToolCalling: true,
        maxToolCallRounds: 3,
        requiresToolCallId: true,
        toolResultField: "tool_call_id",
      };

    case "meta":
    case "meta-llama":
      return {
        supportsToolCalling: true,
        maxToolCallRounds: 2,
        requiresToolCallId: true,
        toolResultField: "tool_call_id",
      };

    case "mistral":
    case "mistralai":
      return {
        supportsToolCalling: true,
        maxToolCallRounds: 3,
        requiresToolCallId: true,
        toolResultField: "tool_call_id",
      };

    default:
      // Conservative defaults
      return {
        supportsToolCalling: false,
        maxToolCallRounds: 1,
        requiresToolCallId: false,
        toolResultField: "tool_call_id",
      };
  }
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
  // Use provider-specific format via formatToolResult
  return formatToolResult(provider, toolCallId, toolName, {
    error: errorMessage,
    success: false,
  });
}
