import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { l4yercak3Client } from '../api/client';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  feedback?: 'positive' | 'negative';
};

export type Attachment = {
  type: 'image' | 'file' | 'audio';
  uri: string;
  name?: string;
  mimeType?: string;
  duration?: number;
  attachmentId?: string;
  sizeBytes?: number;
  sourceId?: string;
  width?: number;
  height?: number;
};

export type PendingToolApproval = {
  id: string;
  conversationId: string;
  toolName: string;
  parameters?: Record<string, unknown>;
  proposalMessage?: string;
  status: 'proposed' | 'approved' | 'rejected' | 'cancelled' | 'success' | 'failed';
  executedAt: Date;
  durationMs?: number;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
};

type SendMessagePayload = {
  message: string;
  liveSessionId?: string;
  cameraRuntime?: Record<string, unknown>;
  voiceRuntime?: Record<string, unknown>;
  commandPolicy?: Record<string, unknown>;
  transportRuntime?: Record<string, unknown>;
  avObservability?: Record<string, unknown>;
  geminiLive?: Record<string, unknown>;
  attachments?: Attachment[];
};

type ApiAttachmentReference = {
  attachmentId: string;
};

type ApiInlineAttachment = {
  type: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  uri?: string;
  sourceId?: string;
  width?: number;
  height?: number;
};

type ChatState = {
  conversations: Conversation[];
  currentConversationId: string | null;
  selectedModel: string;
  isIncognitoMode: boolean;
  pendingApprovalsByConversation: Record<string, PendingToolApproval[]>;

  isSyncing: boolean;
  isLoading: boolean;
  lastSyncError: string | null;

  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessageFeedback: (conversationId: string, messageId: string, feedback: 'positive' | 'negative') => void;
  updateConversationTitle: (conversationId: string, title: string) => void;
  setSelectedModel: (model: string) => void;
  setIncognitoMode: (enabled: boolean) => void;
  clearAllConversations: () => void;

  syncConversations: () => Promise<void>;
  loadConversation: (
    conversationId: string,
    options?: { allowUnknownId?: boolean }
  ) => Promise<void>;
  sendMessageToBackend: (payload: SendMessagePayload) => Promise<{
    success: boolean;
    error?: string;
    errorCode?: string;
    actionLabel?: string;
    actionUrl?: string;
  }>;
  approvePendingTool: (executionId: string, dontAskAgain?: boolean) => Promise<{ success: boolean; error?: string }>;
  rejectPendingTool: (executionId: string) => Promise<{ success: boolean; error?: string }>;
  archiveConversation: (conversationId: string) => Promise<void>;

  getCurrentConversation: () => Conversation | null;
  getConversationById: (id: string) => Conversation | null;
  getPendingApprovals: (conversationId?: string | null) => PendingToolApproval[];
};

function generateTitle(content: string): string {
  const words = content.split(' ').slice(0, 6).join(' ');
  return words.length > 40 ? words.substring(0, 40) + '...' : words;
}

function isBackendConversationId(value: string | null | undefined): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  // Local draft IDs are generated with Date.now().toString() and are numeric only.
  return !/^\d+$/.test(trimmed);
}

function toPendingToolApprovals(
  conversationId: string,
  tools: Array<{
    _id: string;
    conversationId: string;
    toolName: string;
    parameters?: Record<string, unknown>;
    proposalMessage?: string;
    status: 'proposed' | 'approved' | 'rejected' | 'cancelled' | 'success' | 'failed';
    executedAt: number;
    durationMs?: number;
  }> | undefined
): PendingToolApproval[] {
  if (!Array.isArray(tools)) {
    return [];
  }

  return tools
    .filter((tool) => tool.status === 'proposed')
    .map((tool) => ({
      id: tool._id,
      conversationId,
      toolName: tool.toolName,
      parameters: tool.parameters,
      proposalMessage: tool.proposalMessage,
      status: tool.status,
      executedAt: new Date(tool.executedAt),
      durationMs: tool.durationMs,
    }));
}

function mapAttachmentForApi(
  attachment: Attachment
): ApiAttachmentReference | ApiInlineAttachment {
  const attachmentId =
    typeof attachment.attachmentId === 'string' ? attachment.attachmentId.trim() : '';
  if (attachmentId.length > 0) {
    return { attachmentId };
  }

  const isRemoteUrl = /^https?:\/\//i.test(attachment.uri);
  return {
    type: attachment.type,
    name: attachment.name,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    url: isRemoteUrl ? attachment.uri : undefined,
    uri: attachment.uri,
    sourceId: attachment.sourceId,
    width: attachment.width,
    height: attachment.height,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveCreditRecoveryFromError(error: unknown): {
  errorCode: string;
  actionLabel: string;
  actionUrl: string;
} | null {
  const defaultAction = {
    errorCode: 'CREDITS_EXHAUSTED',
    actionLabel: 'Buy Credits',
    actionUrl: '/?openWindow=store&panel=credits&context=credit_exhausted',
  };

  const errorRecord = asRecord(error);
  const errorData = errorRecord ? asRecord(errorRecord.data) : null;
  const code = asNonEmptyString(errorData?.code);

  if (
    code === 'CREDITS_EXHAUSTED'
    || code === 'CHILD_CREDIT_CAP_REACHED'
    || code === 'SHARED_POOL_EXHAUSTED'
  ) {
    return {
      errorCode: code,
      actionLabel: asNonEmptyString(errorData?.actionLabel) || defaultAction.actionLabel,
      actionUrl: asNonEmptyString(errorData?.actionUrl) || defaultAction.actionUrl,
    };
  }

  const message =
    (error instanceof Error ? error.message : undefined)
    || asNonEmptyString(errorData?.error)
    || asNonEmptyString(errorData?.message)
    || asNonEmptyString(errorRecord?.message);
  if (!message) {
    return null;
  }

  const normalized = message.toLowerCase();
  if (
    normalized.includes('credits_exhausted')
    || (normalized.includes('not enough') && normalized.includes('credit'))
  ) {
    return defaultAction;
  }

  return null;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,
      // Empty model ID intentionally defers to backend runtime default routing.
      selectedModel: '',
      isIncognitoMode: false,
      pendingApprovalsByConversation: {},
      isSyncing: false,
      isLoading: false,
      lastSyncError: null,

      createConversation: () => {
        const id = Date.now().toString();
        const newConversation: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          model: get().selectedModel,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
        }));

        return id;
      },

      deleteConversation: (id) => {
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== id);
          const newCurrentId =
            state.currentConversationId === id
              ? newConversations[0]?.id || null
              : state.currentConversationId;

          const nextPending = { ...state.pendingApprovalsByConversation };
          delete nextPending[id];

          return {
            conversations: newConversations,
            currentConversationId: newCurrentId,
            pendingApprovalsByConversation: nextPending,
          };
        });
      },

      setCurrentConversation: (id) => {
        set({ currentConversationId: id });
      },

      addMessage: (conversationId, messageData) => {
        const message: Message = {
          ...messageData,
          id: Date.now().toString(),
          timestamp: new Date(),
        };

        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id !== conversationId) return conv;

            const updatedMessages = [...conv.messages, message];
            let title = conv.title;
            if (conv.title === 'New Chat' && message.role === 'user') {
              title = generateTitle(message.content);
            }

            return {
              ...conv,
              messages: updatedMessages,
              title,
              updatedAt: new Date(),
            };
          }),
        }));
      },

      updateMessageFeedback: (conversationId, messageId, feedback) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id !== conversationId) return conv;

            return {
              ...conv,
              messages: conv.messages.map((msg) => {
                if (msg.id !== messageId) return msg;
                return { ...msg, feedback };
              }),
            };
          }),
        }));
      },

      updateConversationTitle: (conversationId, title) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id !== conversationId) return conv;
            return { ...conv, title };
          }),
        }));
      },

      setSelectedModel: (model) => {
        set({ selectedModel: model.trim() });
      },

      setIncognitoMode: (enabled) => {
        set({ isIncognitoMode: enabled });
        if (enabled) {
          set({ currentConversationId: null });
        }
      },

      clearAllConversations: () => {
        set({
          conversations: [],
          currentConversationId: null,
          pendingApprovalsByConversation: {},
        });
      },

      getCurrentConversation: () => {
        const state = get();
        if (!state.currentConversationId) return null;
        return state.conversations.find((c) => c.id === state.currentConversationId) || null;
      },

      getConversationById: (id) => {
        return get().conversations.find((c) => c.id === id) || null;
      },

      getPendingApprovals: (conversationId) => {
        const state = get();
        const targetConversationId = conversationId ?? state.currentConversationId;
        if (!targetConversationId) {
          return [];
        }
        return state.pendingApprovalsByConversation[targetConversationId] || [];
      },

      syncConversations: async () => {
        set({ isSyncing: true, lastSyncError: null });

        if (!l4yercak3Client.hasAuth()) {
          set({ isSyncing: false, lastSyncError: null });
          return;
        }

        try {
          const response = await l4yercak3Client.ai.listConversations(50);

          if (response.success) {
            set((state) => {
              const existingById = new Map(state.conversations.map((conversation) => [conversation.id, conversation]));
              const conversations: Conversation[] = response.conversations.map((conv) => {
                const existing = existingById.get(conv._id);
                return {
                  id: conv._id,
                  title: conv.title,
                  messages: existing?.messages || [],
                  model: existing?.model || '',
                  createdAt: new Date(conv.createdAt),
                  updatedAt: new Date(conv.updatedAt),
                };
              });
              const conversationIds = new Set(conversations.map((conversation) => conversation.id));
              const hasExistingCurrentConversation =
                typeof state.currentConversationId === 'string' &&
                conversationIds.has(state.currentConversationId);
              const nextCurrentConversationId = hasExistingCurrentConversation
                ? state.currentConversationId
                : conversations[0]?.id || null;
              const pendingApprovalsByConversation = Object.fromEntries(
                Object.entries(state.pendingApprovalsByConversation).filter(([conversationId]) =>
                  conversationIds.has(conversationId)
                )
              );

              return {
                conversations,
                currentConversationId: nextCurrentConversationId,
                pendingApprovalsByConversation,
                isSyncing: false,
              };
            });
            return;
          }

          set({ isSyncing: false });
        } catch (error) {
          console.error('Failed to sync conversations:', error);
          set({
            isSyncing: false,
            lastSyncError: error instanceof Error ? error.message : 'Failed to sync',
          });
        }
      },

      loadConversation: async (conversationId, options) => {
        set({ isLoading: true });

        if (!l4yercak3Client.hasAuth()) {
          set({ isLoading: false });
          return;
        }
        if (!isBackendConversationId(conversationId)) {
          set({ isLoading: false });
          return;
        }
        const allowUnknownId = options?.allowUnknownId === true;
        if (!allowUnknownId) {
          const isKnownConversationId = get().conversations.some(
            (conversation) => conversation.id === conversationId
          );
          if (!isKnownConversationId) {
            set((state) => ({
              isLoading: false,
              currentConversationId:
                state.currentConversationId === conversationId
                  ? state.conversations[0]?.id || null
                  : state.currentConversationId,
            }));
            return;
          }
        }

        try {
          const response = await l4yercak3Client.ai.getConversation(conversationId);

          if (response.success) {
            const conv = response.conversation;
            const messages: Message[] = conv.messages.map((msg) => ({
              id: msg._id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
            }));
            const pendingApprovals = toPendingToolApprovals(conversationId, response.pendingTools);

            set((state) => {
              const existingConversation = state.conversations.find((c) => c.id === conversationId);
              const nextConversation: Conversation = {
                id: conversationId,
                title: conv.title,
                messages,
                model: existingConversation?.model || state.selectedModel,
                createdAt: existingConversation?.createdAt || new Date(conv.createdAt),
                updatedAt: new Date(conv.updatedAt),
              };

              const hasConversation = Boolean(existingConversation);
              return {
                isLoading: false,
                conversations: hasConversation
                  ? state.conversations.map((c) => (c.id === conversationId ? nextConversation : c))
                  : [nextConversation, ...state.conversations],
                currentConversationId: conversationId,
                pendingApprovalsByConversation: {
                  ...state.pendingApprovalsByConversation,
                  [conversationId]: pendingApprovals,
                },
              };
            });
            return;
          }

          set({ isLoading: false });
        } catch (error) {
          console.error('Failed to load conversation:', error);
          set({ isLoading: false });
        }
      },

      sendMessageToBackend: async (payload) => {
        const { currentConversationId, selectedModel, isIncognitoMode } = get();
        set({ isLoading: true, lastSyncError: null });

        if (!l4yercak3Client.hasAuth()) {
          const error = 'Please sign in to continue';
          set({ isLoading: false, lastSyncError: error });
          return { success: false, error };
        }

        try {
          const backendConversationId = isBackendConversationId(currentConversationId)
            ? currentConversationId
            : undefined;
          const response = await l4yercak3Client.ai.sendMessage({
            conversationId: backendConversationId,
            message: payload.message,
            selectedModel: selectedModel.trim().length > 0 ? selectedModel : undefined,
            privacyMode: isIncognitoMode,
            liveSessionId: payload.liveSessionId,
            cameraRuntime: payload.cameraRuntime,
            voiceRuntime: payload.voiceRuntime,
            commandPolicy: payload.commandPolicy,
            transportRuntime: payload.transportRuntime,
            avObservability: payload.avObservability,
            geminiLive: payload.geminiLive,
            attachments: payload.attachments?.map(mapAttachmentForApi),
          });

          if (!response.success) {
            set({ isLoading: false });
            return { success: false, error: 'Failed to send message' };
          }

          const convId = response.conversationId;
          await get().loadConversation(convId, { allowUnknownId: true });
          if (!backendConversationId) {
            await get().syncConversations();
          }

          set({ isLoading: false });
          return { success: true };
        } catch (error) {
          console.error('Failed to send message:', error);
          const creditRecovery = resolveCreditRecoveryFromError(error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
          set({
            isLoading: false,
            lastSyncError: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
            errorCode: creditRecovery?.errorCode,
            actionLabel: creditRecovery?.actionLabel,
            actionUrl: creditRecovery?.actionUrl,
          };
        }
      },

      approvePendingTool: async (executionId, dontAskAgain) => {
        const { currentConversationId } = get();

        if (!l4yercak3Client.hasAuth()) {
          return { success: false, error: 'Please sign in to continue' };
        }

        try {
          await l4yercak3Client.ai.approveTool(executionId, dontAskAgain);
          if (isBackendConversationId(currentConversationId)) {
            await get().loadConversation(currentConversationId);
          }
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to approve tool',
          };
        }
      },

      rejectPendingTool: async (executionId) => {
        const { currentConversationId } = get();

        if (!l4yercak3Client.hasAuth()) {
          return { success: false, error: 'Please sign in to continue' };
        }

        try {
          await l4yercak3Client.ai.rejectTool(executionId);
          if (isBackendConversationId(currentConversationId)) {
            await get().loadConversation(currentConversationId);
          }
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to reject tool',
          };
        }
      },

      archiveConversation: async (conversationId) => {
        try {
          if (l4yercak3Client.hasAuth() && isBackendConversationId(conversationId)) {
            await l4yercak3Client.ai.archiveConversation(conversationId);
          }

          set((state) => {
            const nextPending = { ...state.pendingApprovalsByConversation };
            delete nextPending[conversationId];

            return {
              conversations: state.conversations.filter((c) => c.id !== conversationId),
              currentConversationId:
                state.currentConversationId === conversationId
                  ? null
                  : state.currentConversationId,
              pendingApprovalsByConversation: nextPending,
            };
          });
        } catch (error) {
          console.error('Failed to archive conversation:', error);
        }
      },
    }),
    {
      name: 'l4yercak3-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        currentConversationId: state.currentConversationId,
        selectedModel: state.selectedModel,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.conversations = state.conversations.map((conv) => ({
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
            messages: conv.messages.map((msg) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          }));
        }
      },
    }
  )
);
