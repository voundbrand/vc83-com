const ELEVENLABS_CONVAI_BASE_URL = "https://api.elevenlabs.io/v1/convai";

interface RequestOptions extends RequestInit {
  path: string;
}

export interface ElevenLabsAgentPrompt {
  prompt: string | null;
  built_in_tools?: Record<string, unknown>;
  tool_ids?: string[];
  tools?: unknown;
  knowledge_base?: ElevenLabsKnowledgeBaseDocumentRef[];
  [key: string]: unknown;
}

export interface ElevenLabsKnowledgeBaseDocumentRef {
  id: string;
  name?: string;
  type?: string;
  usage_mode?: string;
  [key: string]: unknown;
}

export interface ElevenLabsAgent {
  agent_id: string;
  name: string;
  conversation_config: {
    agent: {
      first_message?: string | null;
      prompt: ElevenLabsAgentPrompt;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  workflow?: unknown;
  [key: string]: unknown;
}

export interface ElevenLabsConversationTranscriptTurn {
  role: string;
  message?: string | null;
  agent_metadata?: {
    agent_id?: string | null;
    branch_id?: string | null;
    workflow_node_id?: string | null;
    version_id?: string | null;
  } | null;
  tool_calls?: unknown[];
  tool_results?: unknown[];
  source_medium?: string | null;
  time_in_call_secs?: number;
  [key: string]: unknown;
}

export interface ElevenLabsConversation {
  conversation_id: string;
  status: string;
  agent_id: string;
  agent_name: string;
  transcript: ElevenLabsConversationTranscriptTurn[];
  metadata?: Record<string, unknown>;
  analysis?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ElevenLabsCreatedKnowledgeBaseDocument {
  id: string;
  name: string;
  [key: string]: unknown;
}

export class ElevenLabsClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = ELEVENLABS_CONVAI_BASE_URL
  ) {}

  async getAgent(agentId: string): Promise<ElevenLabsAgent> {
    return this.request<ElevenLabsAgent>({
      path: `/agents/${encodeURIComponent(agentId)}`,
      method: "GET",
    });
  }

  async updateAgent(agentId: string, payload: unknown): Promise<ElevenLabsAgent> {
    return this.request<ElevenLabsAgent>({
      path: `/agents/${encodeURIComponent(agentId)}`,
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  async getSignedUrl(agentId: string): Promise<string> {
    const response = await this.request<{ signed_url: string }>({
      path: `/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`,
      method: "GET",
    });
    return response.signed_url;
  }

  async getConversation(conversationId: string): Promise<ElevenLabsConversation> {
    return this.request<ElevenLabsConversation>({
      path: `/conversations/${encodeURIComponent(conversationId)}`,
      method: "GET",
    });
  }

  async getKnowledgeBaseDocumentContent(documentId: string): Promise<string> {
    return this.request<string>({
      path: `/knowledge-base/${encodeURIComponent(documentId)}/content`,
      method: "GET",
    });
  }

  async createTextKnowledgeBaseDocument(
    name: string,
    text: string
  ): Promise<ElevenLabsCreatedKnowledgeBaseDocument> {
    return this.request<ElevenLabsCreatedKnowledgeBaseDocument>({
      path: "/knowledge-base/text",
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name,
        text,
      }),
    });
  }

  async deleteKnowledgeBaseDocument(documentId: string, force = false): Promise<void> {
    await this.request<Record<string, unknown>>({
      path: `/knowledge-base/${encodeURIComponent(documentId)}?force=${force ? "true" : "false"}`,
      method: "DELETE",
    });
  }

  private async request<T>({ path, headers, ...init }: RequestOptions): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "xi-api-key": this.apiKey,
        ...headers,
      },
    });

    const rawBody = await response.text();
    const parsedBody = rawBody.length > 0 ? safeJsonParse(rawBody) : null;

    if (!response.ok) {
      const message =
        typeof parsedBody === "object" && parsedBody && "detail" in parsedBody
          ? String((parsedBody as { detail?: unknown }).detail)
          : rawBody || `${response.status} ${response.statusText}`;
      throw new Error(`ElevenLabs API request failed (${response.status}): ${message}`);
    }

    return parsedBody as T;
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
