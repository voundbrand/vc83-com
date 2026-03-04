/**
 * L4yercak3 API Client
 *
 * Handles authenticated requests to the L4yercak3 backend.
 * Works with both session-based auth and API keys.
 */

import { ENV } from '../config/env';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'l4yercak3_session';

export type OperatorVoiceCatalogEntry = {
  id: string;
  name: string;
  language?: string;
  labels?: Record<string, string>;
  previewUrl?: string;
};

class L4yercak3APIClient {
  private baseUrl: string;
  private sessionId: string | null = null;
  private apiKey: string | null = null;
  private organizationId: string | null = null;

  constructor() {
    this.baseUrl = ENV.L4YERCAK3_API_URL;
  }

  /**
   * Set session for authenticated requests
   */
  setSession(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Set API key for authenticated requests
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Set organization context
   */
  setOrganization(organizationId: string) {
    this.organizationId = organizationId;
  }

  /**
   * Clear authentication
   */
  clearAuth() {
    this.sessionId = null;
    this.apiKey = null;
    this.organizationId = null;
  }

  /**
   * Whether the client currently has auth credentials
   */
  hasAuth() {
    return Boolean(this.apiKey || this.sessionId);
  }

  /**
   * Load session from secure storage
   */
  async loadSession(): Promise<string | null> {
    try {
      const session = await SecureStore.getItemAsync(SESSION_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        this.sessionId = parsed.sessionId;
        this.organizationId = parsed.organizationId;
        return parsed.sessionId;
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
    return null;
  }

  /**
   * Save session to secure storage
   */
  async saveSession(sessionId: string, organizationId?: string) {
    try {
      this.sessionId = sessionId;
      this.organizationId = organizationId || null;
      await SecureStore.setItemAsync(
        SESSION_KEY,
        JSON.stringify({ sessionId, organizationId })
      );
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  /**
   * Clear session from secure storage
   */
  async clearSession() {
    try {
      this.sessionId = null;
      this.organizationId = null;
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }

  /**
   * Make authenticated request
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Add authentication - prefer API key, fallback to session ID
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else if (this.sessionId) {
      headers['Authorization'] = `Bearer ${this.sessionId}`;
    }
    if (this.organizationId) {
      headers['X-Organization-Id'] = this.organizationId;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });
    const rawBody = await response.text();
    const data = this.parseJsonResponse(rawBody);
    const textSnippet =
      rawBody.length > 0 ? rawBody.slice(0, 240).replace(/\s+/g, " ").trim() : "";

    if (!response.ok) {
      const errorMessage =
        (typeof data?.error === 'string' && data.error) ||
        (typeof data?.message === 'string' && data.message) ||
        textSnippet ||
        `Request failed: ${response.status}`;

      // Common after switching environments: stale session tokens keep failing every request.
      // Clear local auth so callers stop retrying authenticated endpoints with invalid credentials.
      if (
        response.status === 401 &&
        /session|authorization|auth/i.test(errorMessage)
      ) {
        await this.clearSession();
        this.clearAuth();
        throw new Error('Session expired. Please sign in again.');
      }

      const requestError = new Error(errorMessage) as Error & {
        status?: number;
        data?: Record<string, unknown> | null;
      };
      requestError.status = response.status;
      requestError.data = data;
      throw requestError;
    }

    if (rawBody.length > 0 && data === null) {
      throw new Error(
        `Expected JSON response from ${endpoint}, received non-JSON payload: ${textSnippet || "<empty>"}`
      );
    }

    return data as T;
  }

  private parseJsonResponse(rawBody: string): Record<string, unknown> | null {
    if (rawBody.length === 0) {
      return null;
    }
    try {
      return JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * CRM endpoints
   */
  crm = {
    listContacts: async (params?: { search?: string; status?: string; subtype?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.search) query.set('search', params.search);
      if (params?.status) query.set('status', params.status);
      if (params?.subtype) query.set('subtype', params.subtype);
      if (params?.limit) query.set('limit', params.limit.toString());

      return this.request<{ contacts: unknown[]; total: number }>(
        `/api/v1/crm/contacts?${query.toString()}`
      );
    },

    getContact: async (contactId: string) => {
      return this.request<unknown>(`/api/v1/crm/contacts/${contactId}`);
    },

    createContact: async (data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      company?: string;
      subtype?: string;
    }) => {
      return this.request<{ success: boolean; contactId: string }>('/api/v1/crm/contacts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateContact: async (contactId: string, data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      company: string;
      status: string;
      subtype: string;
    }>) => {
      return this.request<{ success: boolean }>(`/api/v1/crm/contacts/${contactId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    deleteContact: async (contactId: string) => {
      return this.request<{ success: boolean }>(`/api/v1/crm/contacts/${contactId}`, {
        method: 'DELETE',
      });
    },

    listOrganizations: async () => {
      return this.request<{ organizations: unknown[]; total: number }>('/api/v1/crm/organizations');
    },
  };

  /**
   * Events endpoints
   */
  events = {
    list: async (params?: { status?: string; subtype?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.subtype) query.set('subtype', params.subtype);
      if (params?.limit) query.set('limit', params.limit.toString());

      return this.request<{ events: unknown[]; total: number }>(
        `/api/v1/events?${query.toString()}`
      );
    },

    get: async (eventId: string) => {
      return this.request<unknown>(`/api/v1/events/${eventId}`);
    },

    create: async (data: {
      name: string;
      startDate: string;
      endDate: string;
      location: string;
      description?: string;
      subtype?: string;
      maxCapacity?: number;
    }) => {
      return this.request<{ success: boolean; eventId: string }>('/api/v1/events', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: async (eventId: string, data: Partial<{
      name: string;
      startDate: string;
      endDate: string;
      location: string;
      description: string;
    }>) => {
      return this.request<{ success: boolean }>(`/api/v1/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    publish: async (eventId: string) => {
      return this.request<{ success: boolean }>(`/api/v1/events/${eventId}/publish`, {
        method: 'POST',
      });
    },

    cancel: async (eventId: string) => {
      return this.request<{ success: boolean }>(`/api/v1/events/${eventId}/cancel`, {
        method: 'POST',
      });
    },

    getAttendees: async (eventId: string) => {
      return this.request<{ attendees: unknown[]; total: number }>(`/api/v1/events/${eventId}/attendees`);
    },
  };

  /**
   * Forms endpoints
   */
  forms = {
    list: async (params?: { status?: string; subtype?: string }) => {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.subtype) query.set('subtype', params.subtype);

      return this.request<{ forms: unknown[]; total: number }>(
        `/api/v1/forms?${query.toString()}`
      );
    },

    get: async (formId: string) => {
      return this.request<unknown>(`/api/v1/forms/${formId}`);
    },

    create: async (data: {
      name: string;
      description?: string;
      subtype?: string;
    }) => {
      return this.request<{ success: boolean; formId: string }>('/api/v1/forms', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    publish: async (formId: string) => {
      return this.request<{ success: boolean }>(`/api/v1/forms/${formId}/publish`, {
        method: 'POST',
      });
    },

    getResponses: async (formId: string) => {
      return this.request<{ responses: unknown[]; total: number }>(`/api/v1/forms/${formId}/responses`);
    },
  };

  /**
   * AI Chat endpoints
   * Syncs with web app - same database for cross-platform experience
   */
  ai = {
    // Create new conversation
    createConversation: async (title?: string) => {
      return this.request<{
        success: boolean;
        conversationId: string;
        conversation: {
          _id: string;
          title: string;
          status: string;
          messages: unknown[];
          createdAt: number;
          updatedAt: number;
        };
      }>('/api/v1/ai/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
    },

    // List conversations
    listConversations: async (limit = 50) => {
      return this.request<{
        success: boolean;
        conversations: {
          _id: string;
          title: string;
          status: string;
          createdAt: number;
          updatedAt: number;
        }[];
      }>(`/api/v1/ai/conversations?limit=${limit}`);
    },

    // Get conversation with messages
    getConversation: async (conversationId: string) => {
      return this.request<{
        success: boolean;
        conversation: {
          _id: string;
          title: string;
          status: string;
          messages: {
            _id: string;
            role: 'user' | 'assistant' | 'system';
            content: string;
            timestamp: number;
            toolCalls?: unknown[];
          }[];
          createdAt: number;
          updatedAt: number;
        };
        pendingTools?: {
          _id: string;
          conversationId: string;
          toolName: string;
          parameters?: Record<string, unknown>;
          proposalMessage?: string;
          status: 'proposed' | 'approved' | 'rejected' | 'cancelled' | 'success' | 'failed';
          executedAt: number;
          durationMs?: number;
        }[];
      }>(`/api/v1/ai/conversations/${conversationId}`);
    },

    // Send message and get AI response
    sendMessage: async (data: {
      conversationId?: string;
      message: string;
      selectedModel?: string;
      privacyMode?: boolean; // When true, backend won't use data for LLM training
      liveSessionId?: string;
      cameraRuntime?: Record<string, unknown>;
      voiceRuntime?: Record<string, unknown>;
      commandPolicy?: Record<string, unknown>;
      transportRuntime?: Record<string, unknown>;
      avObservability?: Record<string, unknown>;
      geminiLive?: Record<string, unknown>;
      attachments?: Array<
        | {
            attachmentId: string;
          }
        | {
            type: string;
            name?: string;
            mimeType?: string;
            sizeBytes?: number;
            url?: string;
            uri?: string;
            sourceId?: string;
            width?: number;
            height?: number;
          }
      >;
    }) => {
      return this.request<{
        success: boolean;
        conversationId: string;
        message: string;
        toolCalls?: {
          id: string;
          name: string;
          arguments: unknown;
          result?: unknown;
          status: 'success' | 'failed' | 'pending_approval';
        }[];
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
        cost?: number;
      }>('/api/v1/ai/chat', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    // Get AI settings
    getSettings: async () => {
      return this.request<{
        success: boolean;
        settings: {
          enabled: boolean;
          billingMode: 'platform' | 'byok';
          tier: 'standard' | 'privacy-enhanced' | 'private-llm';
          llm: {
            enabledModels: { modelId: string; isDefault: boolean }[];
            defaultModelId: string;
            temperature: number;
            maxTokens: number;
            hasApiKey: boolean;
          };
          monthlyBudgetUsd?: number;
          currentMonthSpend?: number;
        };
      }>('/api/v1/ai/settings');
    },

    // Get available models
    getModels: async () => {
      return this.request<{
        success: boolean;
        models: {
          modelId: string;
          name: string;
          provider: string;
          isDefault: boolean;
          customLabel?: string;
        }[];
      }>('/api/v1/ai/models');
    },

    // Approve tool execution
    approveTool: async (executionId: string, dontAskAgain?: boolean) => {
      return this.request<{ success: boolean }>(
        `/api/v1/ai/tools/${executionId}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ dontAskAgain }),
        }
      );
    },

    // Reject tool execution
    rejectTool: async (executionId: string) => {
      return this.request<{ success: boolean }>(
        `/api/v1/ai/tools/${executionId}/reject`,
        { method: 'POST' }
      );
    },

    // Update conversation title
    updateConversation: async (conversationId: string, title: string) => {
      return this.request<{ success: boolean }>(
        `/api/v1/ai/conversations/${conversationId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ title }),
        }
      );
    },

    // Archive conversation
    archiveConversation: async (conversationId: string) => {
      return this.request<{ success: boolean }>(
        `/api/v1/ai/conversations/${conversationId}`,
        { method: 'DELETE' }
      );
    },

    voice: {
      listCatalog: async () => {
        return this.request<{
          success: boolean;
          voices: OperatorVoiceCatalogEntry[];
          selectedVoiceId: string | null;
          provider: 'elevenlabs';
          providerStatus: 'healthy' | 'degraded';
          warning?: string;
        }>('/api/v1/ai/voice/catalog');
      },

      updatePreferences: async (data: { agentVoiceId: string | null; language?: string }) => {
        return this.request<{
          success: boolean;
          agentVoiceId: string | null;
          language?: string | null;
          provider: 'elevenlabs';
        }>('/api/v1/ai/voice/preferences', {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      },

      resolveSession: async (data: {
        conversationId?: string;
        liveSessionId?: string;
        sourceMode?: string;
        voiceRuntime?: Record<string, unknown>;
      }) => {
        return this.request<{
          success: boolean;
          conversationId: string;
          interviewSessionId: string;
          sessionOpenAttestationProof?: {
            token: string;
            expiresAt: number;
          } | null;
        }>('/api/v1/ai/voice/session/resolve', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      openSession: async (data: {
        conversationId?: string;
        interviewSessionId?: string;
        requestedProviderId?: 'browser' | 'elevenlabs';
        requestedVoiceId?: string;
        voiceSessionId?: string;
        liveSessionId?: string;
        sourceMode?: string;
        voiceRuntime?: Record<string, unknown>;
        transportRuntime?: Record<string, unknown>;
        avObservability?: Record<string, unknown>;
        attestationProofToken?: string;
      }) => {
        return this.request<{
          success: boolean;
          conversationId?: string;
          interviewSessionId: string;
          voiceSessionId: string;
          providerId: 'browser' | 'elevenlabs';
          requestedProviderId: 'browser' | 'elevenlabs';
          fallbackProviderId: 'browser' | 'elevenlabs' | null;
          health: Record<string, unknown>;
          nativeBridge?: Record<string, unknown>;
          error?: string;
        }>('/api/v1/ai/voice/session/open', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      closeSession: async (data: {
        conversationId?: string;
        interviewSessionId?: string;
        voiceSessionId: string;
        activeProviderId?: 'browser' | 'elevenlabs';
        reason?: string;
      }) => {
        return this.request<{
          success: boolean;
          providerId: 'browser' | 'elevenlabs';
          health: Record<string, unknown>;
          nativeBridge?: Record<string, unknown>;
          conversationId?: string;
          interviewSessionId?: string;
        }>('/api/v1/ai/voice/session/close', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      transcribe: async (data: {
        conversationId?: string;
        interviewSessionId?: string;
        voiceSessionId: string;
        audioBase64: string;
        mimeType?: string;
        requestedProviderId?: 'browser' | 'elevenlabs';
        requestedVoiceId?: string;
        language?: string;
      }) => {
        return this.request<{
          success: boolean;
          text?: string;
          error?: string;
          providerId: 'browser' | 'elevenlabs';
          requestedProviderId: 'browser' | 'elevenlabs';
          fallbackProviderId: 'browser' | 'elevenlabs' | null;
          health: Record<string, unknown>;
          nativeBridge?: Record<string, unknown>;
          conversationId?: string;
          interviewSessionId?: string;
        }>('/api/v1/ai/voice/transcribe', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      ingestVoiceFrame: async (data: {
        conversationId?: string;
        interviewSessionId?: string;
        requestedProviderId?: 'browser' | 'elevenlabs';
        conversationRuntime?: Record<string, unknown>;
        voiceRuntime?: Record<string, unknown>;
        transportRuntime?: Record<string, unknown>;
        avObservability?: Record<string, unknown>;
        envelope: Record<string, unknown>;
      }) => {
        return this.request<{
          success: boolean;
          conversationId?: string;
          interviewSessionId?: string;
          idempotent?: boolean;
          persistedFinalTranscript?: boolean;
          ordering?: {
            decision: 'accepted' | 'duplicate_replay' | 'gap_detected';
            expectedSequence: number;
            lastAcceptedSequence: number;
          };
          relayEvents?: Array<Record<string, unknown>>;
          orchestration?: {
            shouldTriggerAssistantTurn: boolean;
            interrupted: boolean;
            reason: string;
            transcriptText?: string | null;
            turn?: {
              status: 'triggered' | 'suppressed' | 'failed';
              reason: string;
              transcriptText?: string;
              assistantText?: string;
              conversationId?: string;
              toolCallCount?: number;
            };
          };
        }>('/api/v1/ai/voice/audio/frame', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      synthesize: async (data: {
        conversationId?: string;
        interviewSessionId?: string;
        voiceSessionId: string;
        text: string;
        requestedProviderId?: 'browser' | 'elevenlabs';
        requestedVoiceId?: string;
      }) => {
        return this.request<{
          success: boolean;
          providerId: 'browser' | 'elevenlabs';
          requestedProviderId: 'browser' | 'elevenlabs';
          fallbackProviderId: 'browser' | 'elevenlabs' | null;
          health: Record<string, unknown>;
          mimeType?: string;
          audioBase64?: string | null;
          fallbackText?: string | null;
          nativeBridge?: Record<string, unknown>;
          error?: string;
          conversationId?: string;
          interviewSessionId?: string;
        }>('/api/v1/ai/voice/synthesize', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },

      ingestVideoFrame: async (data: {
        conversationId?: string;
        interviewSessionId?: string;
        mediaSessionEnvelope: Record<string, unknown>;
        maxFramesPerWindow?: number;
        windowMs?: number;
      }) => {
        return this.request<{
          success: boolean;
          conversationId?: string;
          interviewSessionId?: string;
          liveSessionId: string;
          videoSessionId: string;
          ordering?: {
            decision: 'accepted' | 'duplicate_replay' | 'gap_detected' | 'rate_limited';
            expectedSequence: number;
            receivedSequence: number;
            lastAcceptedSequence: number;
          };
          rateControl?: {
            frameCountInWindow: number;
            windowStartMs: number;
            retryAfterMs: number;
          };
          relay?: {
            accepted: boolean;
            reason: string;
          };
        }>('/api/v1/ai/voice/video/frame', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      },
    },
  };

  /**
   * Organization endpoints
   * Uses /api/v1/auth/* endpoints per spec
   */
  organizations = {
    // List user's organizations
    list: async () => {
      return this.request<{
        success: boolean;
        organizations: {
          id: string;
          name: string;
          slug: string;
          role: string;
          isCurrent: boolean;
        }[];
        currentOrganizationId: string;
      }>('/api/v1/auth/organizations');
    },

    // Switch organization context
    switch: async (organizationId: string) => {
      return this.request<{
        success: boolean;
        organization: {
          id: string;
          name: string;
          slug: string;
        };
      }>('/api/v1/auth/switch-organization', {
        method: 'POST',
        body: JSON.stringify({ organizationId }),
      });
    },
  };
}

// Export singleton instance
export const l4yercak3Client = new L4yercak3APIClient();

// Also export class for testing
export { L4yercak3APIClient };
