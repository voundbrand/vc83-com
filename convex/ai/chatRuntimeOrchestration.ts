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
import { executeTwoStageFailover } from "./twoStageFailoverExecutor";

export type ChatRuntimeContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatRuntimeMessageContent = string | ChatRuntimeContentPart[];

export interface ChatRuntimeMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: ChatRuntimeMessageContent;
  tool_calls?: unknown;
  tool_call_id?: string;
}

export interface ChatRuntimeConversationAttachment {
  kind?: "image";
  url?: string;
}

export interface ChatRuntimeConversationMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  attachments?: ChatRuntimeConversationAttachment[];
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

export interface ChatRuntimeAuthProfile extends ResolvedAuthProfile {
  baseUrl?: string;
}

export interface ChatRuntimeFailoverResult {
  response: ChatRuntimeResponse;
  usedModel: string;
  selectedAuthProfileId: string | null;
  usedAuthProfileId: string | null;
  authProfileFallbackUsed: boolean;
  modelFallbackUsed: boolean;
}

function buildMultimodalUserContent(args: {
  content: string;
  attachments?: ChatRuntimeConversationAttachment[];
}): ChatRuntimeMessageContent {
  const imageUrls = Array.from(
    new Set(
      (args.attachments || [])
        .filter((attachment) => attachment.kind === "image")
        .map((attachment) => attachment.url?.trim())
        .filter((url): url is string => Boolean(url))
    )
  );

  if (imageUrls.length === 0) {
    return args.content;
  }

  const parts: ChatRuntimeContentPart[] = [];
  if (args.content.trim().length > 0) {
    parts.push({
      type: "text",
      text: args.content,
    });
  }

  for (const imageUrl of imageUrls) {
    parts.push({
      type: "image_url",
      image_url: { url: imageUrl },
    });
  }

  if (parts.length === 0) {
    return "";
  }

  return parts;
}

function normalizeOptionalToken(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function shouldSuppressLatestUserImageAttachments(args: {
  sessionTransportPath?: string | null;
  voiceSessionId?: string | null;
  turnStitchAttachmentPolicy?: string | null;
}): boolean {
  return (
    normalizeOptionalToken(args.turnStitchAttachmentPolicy)
      === "suppress_latest_user_image_attachments"
    && normalizeOptionalToken(args.sessionTransportPath)
      === "persistent_realtime_multimodal"
    && typeof args.voiceSessionId === "string"
    && args.voiceSessionId.trim().length > 0
  );
}

export function buildOpenRouterMessages(args: {
  systemPrompt: string;
  conversationMessages: ChatRuntimeConversationMessage[];
  suppressLatestUserImageAttachments?: boolean;
  onFilteredIncompleteToolCall?: (args: { messageIndex: number }) => void;
}): ChatRuntimeMessage[] {
  const messages: ChatRuntimeMessage[] = [
    { role: "system", content: args.systemPrompt },
  ];
  let latestUserMessageIndex = -1;
  for (let index = 0; index < args.conversationMessages.length; index += 1) {
    if (args.conversationMessages[index]?.role === "user") {
      latestUserMessageIndex = index;
    }
  }

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

    const suppressAttachmentsForMessage =
      msg.role === "user"
      && args.suppressLatestUserImageAttachments === true
      && i === latestUserMessageIndex;
    const content = msg.role === "user"
      ? (suppressAttachmentsForMessage
          ? msg.content
          : buildMultimodalUserContent({
              content: msg.content,
              attachments: msg.attachments,
            }))
      : msg.content;

    messages.push({
      role: msg.role,
      content,
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
  conversationPinnedAuthProfileId?: string | null;
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
    providerId: string;
  }) => Promise<void>;
  onAuthProfileFailure?: (args: {
    organizationId: Id<"organizations">;
    profileId: string;
    providerId: string;
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
  const pinnedAuthProfileId =
    args.includeSessionPin && !args.selectedModel
      ? args.conversationPinnedAuthProfileId ?? null
      : null;
  const authProfilesToTry = orderAuthProfilesForSession(
    args.authProfiles,
    pinnedAuthProfileId ?? args.preferredAuthProfileId
  ) as ChatRuntimeAuthProfile[];
  const selectedAuthProfileId = authProfilesToTry[0]?.profileId ?? null;
  const failoverResult = await executeTwoStageFailover<
    ChatRuntimeResponse,
    ChatRuntimeAuthProfile
  >({
    modelIds: modelsToTry,
    // Preserve chat behavior: rotate across auth profiles per model, but do not
    // carry cooled profiles into subsequent model-fallback passes.
    carryRotatedProfilesAcrossModels: false,
    resolveModelPlan: () => ({
      authProfiles: authProfilesToTry,
    }),
    getAuthProfileKey: (authProfile) =>
      `${authProfile.providerId}:${authProfile.profileId}`,
    executeAttempt: async ({ modelId, authProfile }) => {
      const client = new OpenRouterClient(authProfile.apiKey, {
        providerId: authProfile.providerId,
        baseUrl: authProfile.baseUrl,
      });
      const retryResult = await withRetry(
        () =>
          client.chatCompletion({
            model: modelId,
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

      if (authProfile.source === "profile") {
        await args.onAuthProfileSuccess?.({
          organizationId: args.organizationId,
          profileId: authProfile.profileId,
          providerId: authProfile.providerId,
        });
      }

      return {
        result: response,
        attempts: retryResult.attempts,
      };
    },
    onAttemptFailure: ({ modelId, authProfile, errorMessage }) => {
      args.onAttemptFailure?.({
        modelId,
        profileId: authProfile.profileId,
        errorMessage,
      });
    },
    shouldRotateAuthProfile: ({ authProfile, error }) =>
      authProfile.source === "profile" &&
      isAuthProfileRotatableError(error),
    onAuthProfileRotated: async ({ authProfile, errorMessage }) => {
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
        providerId: authProfile.providerId,
        reason: errorMessage.slice(0, 300),
        cooldownUntil,
      });
    },
    failedAttemptCount: LLM_RETRY_POLICY.maxAttempts,
  });
  const usedAuthProfileId = failoverResult.usedAuthProfile.profileId;
  const modelFallbackUsed = failoverResult.usedModelId !== args.primaryModelId;
  const authProfileFallbackUsed =
    Boolean(selectedAuthProfileId) &&
    selectedAuthProfileId !== usedAuthProfileId;
  args.onFailoverSuccess?.({
    primaryModelId: args.primaryModelId,
    usedModel: failoverResult.usedModelId,
    selectedAuthProfileId,
    usedAuthProfileId,
    modelFallbackUsed,
    authProfileFallbackUsed,
  });

  return {
    response: failoverResult.result,
    usedModel: failoverResult.usedModelId,
    selectedAuthProfileId,
    usedAuthProfileId,
    authProfileFallbackUsed,
    modelFallbackUsed,
  };
}
