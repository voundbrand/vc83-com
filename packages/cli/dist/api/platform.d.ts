import { ApiClient } from "./client";
export interface RegisterApplicationPayload {
    organizationId?: string;
    name: string;
    description?: string;
    source: {
        type: "cli";
        projectPathHash: string;
        cliVersion?: string;
        framework: string;
        routerType?: string;
        hasTypeScript?: boolean;
    };
    connection: {
        features: string[];
        hasFrontendDatabase?: boolean;
        frontendDatabaseType?: string;
    };
}
export interface RegisterApplicationResponse {
    success: boolean;
    applicationId: string;
    existingApplication: boolean;
    backendUrl?: string;
    apiKey?: {
        id: string;
        key: string;
        prefix: string;
    };
}
export interface UpdateApplicationPayload {
    name?: string;
    description?: string;
    status?: string;
    connection?: {
        features?: string[];
        hasFrontendDatabase?: boolean;
        frontendDatabaseType?: string;
    };
    deployment?: {
        githubRepo?: string;
        productionUrl?: string;
        stagingUrl?: string;
    };
}
export interface SyncApplicationPayload {
    direction?: string;
    models?: string[];
    dryRun?: boolean;
    results?: {
        direction?: string;
        status?: string;
        recordsProcessed?: number;
        recordsCreated?: number;
        recordsUpdated?: number;
        errors?: number;
    };
}
export interface BulkPageInput {
    path: string;
    name: string;
    pageType?: string;
    detectionMethod?: string;
    objectBindings?: unknown[];
}
export interface BulkRegisterPagesResponse {
    success: boolean;
    results: Array<{
        pageId: string;
        created: boolean;
    }>;
    total: number;
    created: number;
    updated: number;
}
export interface ApplicationPagesResponse {
    success: boolean;
    pages: Array<{
        id: string;
        name: string;
        path: string;
        pageType?: string;
        detectionMethod?: string;
        objectBindings?: unknown[];
        status: string;
        createdAt: number;
        updatedAt: number;
    }>;
    total: number;
}
export interface PageObjectBinding {
    objectType: string;
    accessMode: "read" | "write" | "read_write";
    boundObjectIds?: string[];
    syncEnabled: boolean;
    syncDirection?: "push" | "pull" | "bidirectional";
}
export interface GetApplicationResponse {
    success: boolean;
    application: {
        id: string;
        name: string;
        description?: string;
        status: string;
        source?: Record<string, unknown>;
        connection?: Record<string, unknown>;
        modelMappings?: unknown[];
        deployment?: Record<string, unknown>;
        sync?: Record<string, unknown>;
        cli?: Record<string, unknown>;
        createdAt: number;
        updatedAt: number;
    };
}
export interface EventsListResponse {
    events: Array<Record<string, unknown>>;
    total?: number;
}
export interface ProductsListResponse {
    products: Array<Record<string, unknown>>;
    total?: number;
}
export interface CreateBookingPayload {
    eventId: string;
    productId: string;
    primaryAttendee: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
    guests?: Array<{
        firstName: string;
        lastName: string;
        email?: string;
        phone: string;
    }>;
    source: string;
    frontendRsvpId?: string;
}
export declare class PlatformApiClient {
    private readonly api;
    constructor(api: ApiClient);
    registerApplication(payload: RegisterApplicationPayload): Promise<RegisterApplicationResponse>;
    updateApplication(applicationId: string, payload: UpdateApplicationPayload): Promise<void>;
    syncApplication(applicationId: string, payload: SyncApplicationPayload): Promise<Record<string, unknown>>;
    getApplication(applicationId: string): Promise<GetApplicationResponse>;
    bulkRegisterPages(applicationId: string, pages: BulkPageInput[]): Promise<BulkRegisterPagesResponse>;
    getApplicationPages(applicationId: string, status?: string): Promise<ApplicationPagesResponse>;
    updatePageBindings(pageId: string, objectBindings: PageObjectBinding[]): Promise<void>;
    listEvents(limit?: number): Promise<EventsListResponse>;
    getEvent(eventId: string): Promise<Record<string, unknown>>;
    listProducts(limit?: number): Promise<ProductsListResponse>;
    getProduct(productId: string): Promise<Record<string, unknown>>;
    createBooking(payload: CreateBookingPayload): Promise<Record<string, unknown>>;
}
export declare function createPlatformApiClient(options: {
    backendUrl: string;
    token: string;
}): PlatformApiClient;
//# sourceMappingURL=platform.d.ts.map