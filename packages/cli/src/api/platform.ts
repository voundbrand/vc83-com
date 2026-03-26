import { ApiClient, createApiClient } from "./client";

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

function encodeQuery(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value.trim().length > 0) {
      query.set(key, value);
    }
  }
  const encoded = query.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}

export class PlatformApiClient {
  private readonly api: ApiClient;

  constructor(api: ApiClient) {
    this.api = api;
  }

  async registerApplication(
    payload: RegisterApplicationPayload
  ): Promise<RegisterApplicationResponse> {
    return this.api.request<RegisterApplicationResponse>("POST", "/api/v1/cli/applications", payload);
  }

  async updateApplication(applicationId: string, payload: UpdateApplicationPayload): Promise<void> {
    await this.api.request<{ success: boolean }>(
      "PATCH",
      `/api/v1/cli/applications/${applicationId}`,
      payload
    );
  }

  async syncApplication(
    applicationId: string,
    payload: SyncApplicationPayload
  ): Promise<Record<string, unknown>> {
    return this.api.request<Record<string, unknown>>(
      "POST",
      `/api/v1/cli/applications/${applicationId}/sync`,
      payload
    );
  }

  async getApplication(applicationId: string): Promise<GetApplicationResponse> {
    return this.api.request<GetApplicationResponse>(
      "GET",
      `/api/v1/cli/applications/${applicationId}`
    );
  }

  async bulkRegisterPages(
    applicationId: string,
    pages: BulkPageInput[]
  ): Promise<BulkRegisterPagesResponse> {
    return this.api.request<BulkRegisterPagesResponse>("POST", "/api/v1/activity/pages/bulk", {
      applicationId,
      pages
    });
  }

  async getApplicationPages(
    applicationId: string,
    status?: string
  ): Promise<ApplicationPagesResponse> {
    const query = encodeQuery({ applicationId, status });
    return this.api.request<ApplicationPagesResponse>("GET", `/api/v1/activity/pages${query}`);
  }

  async updatePageBindings(pageId: string, objectBindings: PageObjectBinding[]): Promise<void> {
    await this.api.request<{ success: boolean }>(
      "PATCH",
      `/api/v1/activity/pages/${pageId}/bindings`,
      { objectBindings }
    );
  }

  async listEvents(limit = 1): Promise<EventsListResponse> {
    const query = encodeQuery({ limit: String(limit) });
    return this.api.request<EventsListResponse>("GET", `/api/v1/events${query}`);
  }

  async getEvent(eventId: string): Promise<Record<string, unknown>> {
    return this.api.request<Record<string, unknown>>("GET", `/api/v1/events/${eventId}`);
  }

  async listProducts(limit = 1): Promise<ProductsListResponse> {
    const query = encodeQuery({ limit: String(limit) });
    return this.api.request<ProductsListResponse>("GET", `/api/v1/products${query}`);
  }

  async getProduct(productId: string): Promise<Record<string, unknown>> {
    return this.api.request<Record<string, unknown>>("GET", `/api/v1/products/${productId}`);
  }

  async createBooking(payload: CreateBookingPayload): Promise<Record<string, unknown>> {
    return this.api.request<Record<string, unknown>>("POST", "/api/v1/bookings/create", payload);
  }
}

export function createPlatformApiClient(options: {
  backendUrl: string;
  token: string;
}): PlatformApiClient {
  return new PlatformApiClient(
    createApiClient({
      backendUrl: options.backendUrl,
      token: options.token
    })
  );
}
