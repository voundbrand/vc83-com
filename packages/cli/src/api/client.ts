export interface ApiClientOptions {
  backendUrl: string;
  token?: string;
}

export class ApiClient {
  private readonly backendUrl: string;

  private readonly token?: string;

  constructor(options: ApiClientOptions) {
    this.backendUrl = options.backendUrl;
    this.token = options.token;
  }

  async request<TResponse>(
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
    endpoint: string,
    body?: unknown
  ): Promise<TResponse> {
    const url = `${this.backendUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API request failed (${response.status}): ${text || response.statusText}`);
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}
