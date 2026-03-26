export interface ApiClientOptions {
    backendUrl: string;
    token?: string;
}
export declare class ApiClient {
    private readonly backendUrl;
    private readonly token?;
    constructor(options: ApiClientOptions);
    request<TResponse>(method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", endpoint: string, body?: unknown): Promise<TResponse>;
}
export declare function createApiClient(options: ApiClientOptions): ApiClient;
//# sourceMappingURL=client.d.ts.map