"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
exports.createApiClient = createApiClient;
class ApiClient {
    constructor(options) {
        this.backendUrl = options.backendUrl;
        this.token = options.token;
    }
    async request(method, endpoint, body) {
        const url = `${this.backendUrl}${endpoint}`;
        const headers = {
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
            return undefined;
        }
        return (await response.json());
    }
}
exports.ApiClient = ApiClient;
function createApiClient(options) {
    return new ApiClient(options);
}
//# sourceMappingURL=client.js.map