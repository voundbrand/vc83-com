import type { Id } from "../_generated/dataModel";
import { OpenRouterClient } from "./openrouter";
import {
  getAuthProfileCooldownMs,
  isAuthProfileRotatableError,
  orderAuthProfilesForSession,
  type ResolvedAuthProfile,
} from "./authProfilePolicy";
import { buildModelFailoverCandidates } from "./modelFailoverPolicy";
import { LLM_RETRY_POLICY, withRetry } from "./retryPolicy";

export interface ChatRuntimeMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: unknown;
  tool_call_id?: string;
}

export interface ChatRuntimeConversationMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Array<unknown>;
}

interface ChatRuntimeToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface ChatRuntimeChoiceMessage {
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface ChatRuntimeResponse {
  choices: Array<{
    message: ChatRuntimeChoiceMessage;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type ChatRuntimeAuthProfile = ResolvedAuthProfile;

export interface ChatRuntimeFailoverResult {
  response: ChatRuntimeResponse;
  usedModel: string;
  selectedAuthProfileId: string | null;
  usedAuthProfileId: string | null;
  authProfileFallbackUsed: boolean;
  modelFallbackUsed: boolean;
}

export function buildOpenRouterMessages(args: {
  systemPrompt: string;
  conversationMessages: ChatRuntimeConversationMessage[];
  onFilteredIncompleteToolCall?: (args: { messageIndex: number }) => void;
}): ChatRuntimeMessage[] {
  const messages: ChatRuntimeMessage[] = [
    { role: "system", content: args.systemPrompt },
  ];

  for (let i = 0; i < args.conversationMessages.length; i++) {
    const msg = args.conversationMessages[i];
    const nextMsg = args.conversationMessages[i + 1];

    if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
      const hasToolResult =
        nextMsg
        && nextMsg.role === "assistant"
        && nextMsg.content?.startsWith("[Tool Result]");

      if (!hasToolResult) {
        args.onFilteredIncompleteToolCall?.({ messageIndex: i });
        messages.push({
          role: msg.role,
          content: msg.content,
        });
        continue;
      }
    }

    messages.push({
      role: msg.role,
      content: msg.content,
      tool_calls: msg.toolCalls,
    });
  }

  return messages;
}

export async function executeChatCompletionWithFailover(args: {
  organizationId: Id<"organizations">;
  primaryModelId: string;
  messages: ChatRuntimeMessage[];
  tools?: ChatRuntimeToolSchema[];
  preferredAuthProfileId?: string | null;
  includeSessionPin: boolean;
  selectedModel?: string;
  conversationPinnedModel?: string | null;
  orgEnabledModelIds: string[];
  orgDefaultModelId?: string | null;
  platformEnabledModelIds: string[];
  safeFallbackModelId: string;
  authProfiles: ChatRuntimeAuthProfile[];
  llmTemperature?: number;
  llmMaxTokens?: number;
  onAuthProfileSuccess?: (args: {
    organizationId: Id<"organizations">;
    profileId: string;
  }) => Promise<void>;
  onAuthProfileFailure?: (args: {
    organizationId: Id<"organizations">;
    profileId: string;
    reason: string;
    cooldownUntil: number;
  }) => Promise<void>;
  authProfileFailureCounts?: Map<string, number>;
  onFailoverSuccess?: (args: {
    primaryModelId: string;
    usedModel: string;
    selectedAuthProfileId: string | null;
    usedAuthProfileId: string;
    modelFallbackUsed: boolean;
    authProfileFallbackUsed: boolean;
  }) => void;
  onAttemptFailure?: (args: {
    modelId: string;
    profileId: string;
    errorMessage: string;
  }) => void;
}): Promise<ChatRuntimeFailoverResult> {
  const modelsToTry = buildModelFailoverCandidates({
    primaryModelId: args.primaryModelId,
    orgEnabledModelIds: args.orgEnabledModelIds,
    orgDefaultModelId: args.orgDefaultModelId ?? null,
    platformEnabledModelIds: args.platformEnabledModelIds,
    safeFallbackModelId: args.safeFallbackModelId,
    sessionPinnedModelId:
      args.includeSessionPin && !args.selectedModel
        ? args.conversationPinnedModel ?? null
        : null,
  });
  const authProfilesToTry = orderAuthProfilesForSession(
    args.authProfiles,
    args.preferredAuthProfileId
  );
  const selectedAuthProfileId = authProfilesToTry[0]?.profileId ?? null;
  let lastErrorMessage = "OpenRouter request failed";

  for (const tryModel of modelsToTry) {
    for (const authProfile of authProfilesToTry) {
      const client = new OpenRouterClient(authProfile.apiKey);
      try {
        const retryResult = await withRetry(
          () =>
            client.chatCompletion({
              model: tryModel,
              messages: args.messages,
              tools: args.tools,
              temperature: args.llmTemperature,
              max_tokens: args.llmMaxTokens,
            }),
          LLM_RETRY_POLICY
        );
        const response = retryResult.result as ChatRuntimeResponse;
        if (!response.choices || response.choices.length === 0) {
          throw new Error("Invalid response from OpenRouter: no choices returned");
        }

        const usedAuthProfileId = authProfile.profileId;
        if (authProfile.source === "profile") {
          await args.onAuthProfileSuccess?.({
            organizationId: args.organizationId,
            profileId: authProfile.profileId,
          });
        }

        const modelFallbackUsed = tryModel !== args.primaryModelId;
        const authProfileFallbackUsed =
          Boolean(selectedAuthProfileId) &&
          selectedAuthProfileId !== usedAuthProfileId;
        args.onFailoverSuccess?.({
          primaryModelId: args.primaryModelId,
          usedModel: tryModel,
          selectedAuthProfileId,
          usedAuthProfileId,
          modelFallbackUsed,
          authProfileFallbackUsed,
        });

        return {
          response,
          usedModel: tryModel,
          selectedAuthProfileId,
          usedAuthProfileId,
          authProfileFallbackUsed,
          modelFallbackUsed,
        };
      } catch (apiError) {
        const errorMessage =
          apiError instanceof Error ? apiError.message : String(apiError);
        lastErrorMessage = errorMessage;
        args.onAttemptFailure?.({
          modelId: tryModel,
          profileId: authProfile.profileId,
          errorMessage,
        });

        if (
          authProfile.source === "profile" &&
          isAuthProfileRotatableError(apiError)
        ) {
          const previousFailureCount =
            args.authProfileFailureCounts?.get(authProfile.profileId) ?? 0;
          const nextFailureCount = previousFailureCount + 1;
          args.authProfileFailureCounts?.set(
            authProfile.profileId,
            nextFailureCount
          );
          const cooldownUntil = Date.now() + getAuthProfileCooldownMs(nextFailureCount);
          await args.onAuthProfileFailure?.({
            organizationId: args.organizationId,
            profileId: authProfile.profileId,
            reason: errorMessage.slice(0, 300),
            cooldownUntil,
          });
        }
      }
    }
  }

  throw new Error(lastErrorMessage);
}
