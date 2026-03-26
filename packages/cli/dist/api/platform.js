"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformApiClient = void 0;
exports.createPlatformApiClient = createPlatformApiClient;
const client_1 = require("./client");
function encodeQuery(params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value && value.trim().length > 0) {
            query.set(key, value);
        }
    }
    const encoded = query.toString();
    return encoded.length > 0 ? `?${encoded}` : "";
}
class PlatformApiClient {
    constructor(api) {
        this.api = api;
    }
    async registerApplication(payload) {
        return this.api.request("POST", "/api/v1/cli/applications", payload);
    }
    async updateApplication(applicationId, payload) {
        await this.api.request("PATCH", `/api/v1/cli/applications/${applicationId}`, payload);
    }
    async syncApplication(applicationId, payload) {
        return this.api.request("POST", `/api/v1/cli/applications/${applicationId}/sync`, payload);
    }
    async getApplication(applicationId) {
        return this.api.request("GET", `/api/v1/cli/applications/${applicationId}`);
    }
    async bulkRegisterPages(applicationId, pages) {
        return this.api.request("POST", "/api/v1/activity/pages/bulk", {
            applicationId,
            pages
        });
    }
    async getApplicationPages(applicationId, status) {
        const query = encodeQuery({ applicationId, status });
        return this.api.request("GET", `/api/v1/activity/pages${query}`);
    }
    async updatePageBindings(pageId, objectBindings) {
        await this.api.request("PATCH", `/api/v1/activity/pages/${pageId}/bindings`, { objectBindings });
    }
    async listEvents(limit = 1) {
        const query = encodeQuery({ limit: String(limit) });
        return this.api.request("GET", `/api/v1/events${query}`);
    }
    async getEvent(eventId) {
        return this.api.request("GET", `/api/v1/events/${eventId}`);
    }
    async listProducts(limit = 1) {
        const query = encodeQuery({ limit: String(limit) });
        return this.api.request("GET", `/api/v1/products${query}`);
    }
    async getProduct(productId) {
        return this.api.request("GET", `/api/v1/products/${productId}`);
    }
    async createBooking(payload) {
        return this.api.request("POST", "/api/v1/bookings/create", payload);
    }
}
exports.PlatformApiClient = PlatformApiClient;
function createPlatformApiClient(options) {
    return new PlatformApiClient((0, client_1.createApiClient)({
        backendUrl: options.backendUrl,
        token: options.token
    }));
}
//# sourceMappingURL=platform.js.map