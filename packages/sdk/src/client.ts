/**
 * @l4yercak3/sdk API Client
 *
 * A fully-typed API client for the LayerCake platform.
 */

import type {
  Contact,
  ContactCreateInput,
  ContactUpdateInput,
  ContactListParams,
  Organization,
  OrganizationCreateInput,
  OrganizationListParams,
  Event,
  EventCreateInput,
  EventListParams,
  Attendee,
  AttendeeListParams,
  Form,
  FormSubmission,
  FormListParams,
  FormSubmissionListParams,
  Product,
  ProductListParams,
  Order,
  OrderListParams,
  CheckoutSession,
  CheckoutSessionCreateInput,
  Invoice,
  InvoiceCreateInput,
  InvoiceListParams,
  BenefitClaim,
  BenefitClaimInput,
  BenefitClaimListParams,
  CommissionPayout,
  CommissionPayoutListParams,
  Certificate,
  BuilderProject,
  BuilderProjectCreateInput,
  BuilderProjectUpdateInput,
  BuilderProjectLinkInput,
  BuilderProjectListParams,
  BuilderProjectLinkedObjects,
  PaginatedResponse,
} from './types';

const DEFAULT_BASE_URL = 'https://agreeable-lion-828.convex.site';

export interface L4yercak3ClientConfig {
  /** API key for authentication */
  apiKey?: string;
  /** Base URL for the API (defaults to production) */
  baseUrl?: string;
  /** Organization ID to scope requests to */
  organizationId?: string;
}

export class L4yercak3Client {
  private apiKey: string;
  private baseUrl: string;
  private organizationId?: string;

  public readonly contacts: ContactsAPI;
  public readonly organizations: OrganizationsAPI;
  public readonly events: EventsAPI;
  public readonly forms: FormsAPI;
  public readonly products: ProductsAPI;
  public readonly checkout: CheckoutAPI;
  public readonly orders: OrdersAPI;
  public readonly invoices: InvoicesAPI;
  public readonly benefits: BenefitsAPI;
  public readonly certificates: CertificatesAPI;
  public readonly builderProjects: BuilderProjectsAPI;

  constructor(config: L4yercak3ClientConfig = {}) {
    this.apiKey = config.apiKey || this.getEnvVar('NEXT_PUBLIC_L4YERCAK3_API_KEY') || this.getEnvVar('L4YERCAK3_API_KEY') || '';
    this.baseUrl = config.baseUrl || this.getEnvVar('NEXT_PUBLIC_L4YERCAK3_URL') || DEFAULT_BASE_URL;
    this.organizationId = config.organizationId || this.getEnvVar('L4YERCAK3_ORG_ID');

    if (!this.apiKey) {
      console.warn('[@l4yercak3/sdk] No API key provided. Set NEXT_PUBLIC_L4YERCAK3_API_KEY or pass apiKey to constructor.');
    }

    // Initialize domain APIs
    this.contacts = new ContactsAPI(this);
    this.organizations = new OrganizationsAPI(this);
    this.events = new EventsAPI(this);
    this.forms = new FormsAPI(this);
    this.products = new ProductsAPI(this);
    this.checkout = new CheckoutAPI(this);
    this.orders = new OrdersAPI(this);
    this.invoices = new InvoicesAPI(this);
    this.benefits = new BenefitsAPI(this);
    this.certificates = new CertificatesAPI(this);
    this.builderProjects = new BuilderProjectsAPI(this);
  }

  private getEnvVar(name: string): string | undefined {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name];
    }
    return undefined;
  }

  /** Make a raw API request */
  async request<T, P extends Record<string, unknown> = Record<string, unknown>>(
    method: string,
    path: string,
    options?: {
      params?: P;
      body?: unknown;
    }
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.set(key, String(value));
          }
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    if (this.organizationId) {
      headers['X-Organization-Id'] = this.organizationId;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new L4yercak3Error(
        response.status,
        error.message || `Request failed: ${response.status}`,
        error.code,
        error
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }
}

// ============ Domain APIs ============

class ContactsAPI {
  constructor(private client: L4yercak3Client) {}

  /** List contacts with optional filtering */
  async list(params?: ContactListParams): Promise<PaginatedResponse<Contact>> {
    return this.client.request('GET', '/api/v1/crm/contacts', { params });
  }

  /** Get a single contact by ID */
  async get(
    id: string,
    options?: {
      includeActivities?: boolean;
      includeNotes?: boolean;
      includeOrganization?: boolean;
    }
  ): Promise<Contact> {
    return this.client.request('GET', `/api/v1/crm/contacts/${id}`, { params: options });
  }

  /** Create a new contact */
  async create(data: ContactCreateInput): Promise<Contact> {
    return this.client.request('POST', '/api/v1/crm/contacts', { body: data });
  }

  /** Update an existing contact */
  async update(id: string, data: ContactUpdateInput): Promise<Contact> {
    return this.client.request('PATCH', `/api/v1/crm/contacts/${id}`, { body: data });
  }

  /** Delete a contact */
  async delete(id: string): Promise<void> {
    return this.client.request('DELETE', `/api/v1/crm/contacts/${id}`);
  }

  /** Add tags to a contact */
  async addTags(id: string, tags: string[]): Promise<Contact> {
    return this.client.request('POST', `/api/v1/crm/contacts/${id}/tags`, { body: { tags } });
  }

  /** Remove tags from a contact */
  async removeTags(id: string, tags: string[]): Promise<Contact> {
    return this.client.request('DELETE', `/api/v1/crm/contacts/${id}/tags`, { body: { tags } });
  }
}

class OrganizationsAPI {
  constructor(private client: L4yercak3Client) {}

  /** List organizations with optional filtering */
  async list(params?: OrganizationListParams): Promise<PaginatedResponse<Organization>> {
    return this.client.request('GET', '/api/v1/crm/organizations', { params });
  }

  /** Get a single organization by ID */
  async get(id: string, options?: { includeContacts?: boolean }): Promise<Organization> {
    return this.client.request('GET', `/api/v1/crm/organizations/${id}`, { params: options });
  }

  /** Create a new organization */
  async create(data: OrganizationCreateInput): Promise<Organization> {
    return this.client.request('POST', '/api/v1/crm/organizations', { body: data });
  }

  /** Update an existing organization */
  async update(id: string, data: Partial<OrganizationCreateInput>): Promise<Organization> {
    return this.client.request('PATCH', `/api/v1/crm/organizations/${id}`, { body: data });
  }

  /** Delete an organization */
  async delete(id: string): Promise<void> {
    return this.client.request('DELETE', `/api/v1/crm/organizations/${id}`);
  }
}

class EventsAPI {
  constructor(private client: L4yercak3Client) {}

  /** List events with optional filtering */
  async list(params?: EventListParams): Promise<PaginatedResponse<Event>> {
    return this.client.request('GET', '/api/v1/events', { params });
  }

  /** Get a single event by ID */
  async get(
    id: string,
    options?: {
      includeProducts?: boolean;
      includeSponsors?: boolean;
      includeForms?: boolean;
    }
  ): Promise<Event> {
    return this.client.request('GET', `/api/v1/events/${id}`, { params: options });
  }

  /** Create a new event */
  async create(data: EventCreateInput): Promise<Event> {
    return this.client.request('POST', '/api/v1/events', { body: data });
  }

  /** Update an existing event */
  async update(id: string, data: Partial<EventCreateInput>): Promise<Event> {
    return this.client.request('PATCH', `/api/v1/events/${id}`, { body: data });
  }

  /** Delete an event */
  async delete(id: string): Promise<void> {
    return this.client.request('DELETE', `/api/v1/events/${id}`);
  }

  /** Get attendees for an event */
  async getAttendees(eventId: string, params?: AttendeeListParams): Promise<PaginatedResponse<Attendee>> {
    return this.client.request('GET', `/api/v1/events/${eventId}/attendees`, { params });
  }

  /** Check in an attendee */
  async checkInAttendee(eventId: string, attendeeId: string): Promise<Attendee> {
    return this.client.request('POST', `/api/v1/events/${eventId}/attendees/${attendeeId}/check-in`);
  }

  /** Cancel an attendee's registration */
  async cancelAttendee(eventId: string, attendeeId: string): Promise<Attendee> {
    return this.client.request('POST', `/api/v1/events/${eventId}/attendees/${attendeeId}/cancel`);
  }
}

class FormsAPI {
  constructor(private client: L4yercak3Client) {}

  /** List forms with optional filtering */
  async list(params?: FormListParams): Promise<PaginatedResponse<Form>> {
    return this.client.request('GET', '/api/v1/forms', { params });
  }

  /** Get a single form by ID */
  async get(id: string): Promise<Form> {
    return this.client.request('GET', `/api/v1/forms/${id}`);
  }

  /** Submit a form response */
  async submit(formId: string, data: Record<string, unknown>): Promise<FormSubmission> {
    return this.client.request('POST', `/api/v1/forms/${formId}/submit`, { body: data });
  }

  /** Get submissions for a form */
  async getSubmissions(formId: string, params?: FormSubmissionListParams): Promise<PaginatedResponse<FormSubmission>> {
    return this.client.request('GET', `/api/v1/forms/${formId}/responses`, { params });
  }

  /** Get a single submission by ID */
  async getSubmission(formId: string, submissionId: string): Promise<FormSubmission> {
    return this.client.request('GET', `/api/v1/forms/${formId}/responses/${submissionId}`);
  }
}

class ProductsAPI {
  constructor(private client: L4yercak3Client) {}

  /** List products with optional filtering */
  async list(params?: ProductListParams): Promise<PaginatedResponse<Product>> {
    return this.client.request('GET', '/api/v1/products', { params });
  }

  /** Get a single product by ID */
  async get(id: string): Promise<Product> {
    return this.client.request('GET', `/api/v1/products/${id}`);
  }
}

class CheckoutAPI {
  constructor(private client: L4yercak3Client) {}

  /** Create a new checkout session */
  async createSession(data: CheckoutSessionCreateInput): Promise<CheckoutSession> {
    return this.client.request('POST', '/api/v1/checkout/sessions', { body: data });
  }

  /** Get a checkout session by ID */
  async getSession(sessionId: string): Promise<CheckoutSession> {
    return this.client.request('GET', `/api/v1/checkout/sessions/${sessionId}`);
  }
}

class OrdersAPI {
  constructor(private client: L4yercak3Client) {}

  /** List orders with optional filtering */
  async list(params?: OrderListParams): Promise<PaginatedResponse<Order>> {
    return this.client.request('GET', '/api/v1/orders', { params });
  }

  /** Get a single order by ID */
  async get(id: string): Promise<Order> {
    return this.client.request('GET', `/api/v1/orders/${id}`);
  }

  /** Get an order by order number */
  async getByOrderNumber(orderNumber: string): Promise<Order> {
    return this.client.request('GET', `/api/v1/orders/by-number/${orderNumber}`);
  }
}

class InvoicesAPI {
  constructor(private client: L4yercak3Client) {}

  /** List invoices with optional filtering */
  async list(params?: InvoiceListParams): Promise<PaginatedResponse<Invoice>> {
    return this.client.request('GET', '/api/v1/invoices', { params });
  }

  /** Get a single invoice by ID */
  async get(id: string): Promise<Invoice> {
    return this.client.request('GET', `/api/v1/invoices/${id}`);
  }

  /** Create a new invoice */
  async create(data: InvoiceCreateInput): Promise<Invoice> {
    return this.client.request('POST', '/api/v1/invoices', { body: data });
  }

  /** Send an invoice */
  async send(id: string, options?: { emailTo?: string; message?: string }): Promise<void> {
    return this.client.request('POST', `/api/v1/invoices/${id}/send`, { body: options });
  }

  /** Mark an invoice as paid */
  async markPaid(
    id: string,
    data?: {
      paidAt?: string;
      paymentMethod?: string;
      paymentReference?: string;
    }
  ): Promise<Invoice> {
    return this.client.request('POST', `/api/v1/invoices/${id}/mark-paid`, { body: data });
  }

  /** Get the PDF URL for an invoice */
  async getPdf(id: string): Promise<{ pdfUrl: string }> {
    return this.client.request('GET', `/api/v1/invoices/${id}/pdf`);
  }

  /** Void an invoice */
  async void(id: string): Promise<Invoice> {
    return this.client.request('POST', `/api/v1/invoices/${id}/void`);
  }
}

class BenefitsAPI {
  constructor(private client: L4yercak3Client) {}

  /** List benefit claims with optional filtering */
  async listClaims(params?: BenefitClaimListParams): Promise<PaginatedResponse<BenefitClaim>> {
    return this.client.request('GET', '/api/v1/benefits/claims', { params });
  }

  /** Get a single benefit claim by ID */
  async getClaim(id: string): Promise<BenefitClaim> {
    return this.client.request('GET', `/api/v1/benefits/claims/${id}`);
  }

  /** Create a new benefit claim */
  async createClaim(data: BenefitClaimInput): Promise<BenefitClaim> {
    return this.client.request('POST', '/api/v1/benefits/claims', { body: data });
  }

  /** Approve a benefit claim */
  async approveClaim(id: string, notes?: string): Promise<BenefitClaim> {
    return this.client.request('POST', `/api/v1/benefits/claims/${id}/approve`, { body: { notes } });
  }

  /** Reject a benefit claim */
  async rejectClaim(id: string, reason: string): Promise<BenefitClaim> {
    return this.client.request('POST', `/api/v1/benefits/claims/${id}/reject`, { body: { reason } });
  }

  /** List commission payouts with optional filtering */
  async listCommissions(params?: CommissionPayoutListParams): Promise<PaginatedResponse<CommissionPayout>> {
    return this.client.request('GET', '/api/v1/benefits/commissions', { params });
  }

  /** Get a single commission payout by ID */
  async getCommission(id: string): Promise<CommissionPayout> {
    return this.client.request('GET', `/api/v1/benefits/commissions/${id}`);
  }
}

class CertificatesAPI {
  constructor(private client: L4yercak3Client) {}

  /** List certificates */
  async list(params?: { recipientId?: string; eventId?: string; limit?: number }): Promise<PaginatedResponse<Certificate>> {
    return this.client.request('GET', '/api/v1/certificates', { params });
  }

  /** Get a single certificate by ID */
  async get(id: string): Promise<Certificate> {
    return this.client.request('GET', `/api/v1/certificates/${id}`);
  }

  /** Verify a certificate by certificate number */
  async verify(certificateNumber: string): Promise<Certificate> {
    return this.client.request('GET', `/api/v1/certificates/verify/${certificateNumber}`);
  }
}

class BuilderProjectsAPI {
  constructor(private client: L4yercak3Client) {}

  /** List builder projects with optional filtering */
  async list(params?: BuilderProjectListParams): Promise<PaginatedResponse<BuilderProject>> {
    return this.client.request('GET', '/api/v1/builder-projects', { params });
  }

  /** Get a single builder project by ID */
  async get(id: string): Promise<BuilderProject> {
    return this.client.request('GET', `/api/v1/builder-projects/${id}`);
  }

  /** Create a new builder project */
  async create(data: BuilderProjectCreateInput): Promise<BuilderProject> {
    return this.client.request('POST', '/api/v1/builder-projects', { body: data });
  }

  /** Update an existing builder project */
  async update(id: string, data: BuilderProjectUpdateInput): Promise<BuilderProject> {
    return this.client.request('PATCH', `/api/v1/builder-projects/${id}`, { body: data });
  }

  /** Delete a builder project */
  async delete(id: string): Promise<void> {
    return this.client.request('DELETE', `/api/v1/builder-projects/${id}`);
  }

  /** Link objects to a builder project */
  async linkObjects(id: string, data: BuilderProjectLinkInput): Promise<{ linkedObjects: BuilderProjectLinkedObjects }> {
    return this.client.request('POST', `/api/v1/builder-projects/${id}/link`, { body: data });
  }

  /** Get linked objects for a builder project with full data */
  async getLinkedData(id: string): Promise<{
    events: Event[];
    products: Product[];
    forms: Form[];
    contacts: Contact[];
  }> {
    return this.client.request('GET', `/api/v1/builder-projects/${id}/linked-data`);
  }

  /** Initiate deployment to Vercel */
  async deploy(id: string): Promise<{ deployUrl: string; vercelProjectId: string }> {
    return this.client.request('POST', `/api/v1/builder-projects/${id}/deploy`);
  }

  /** Get deployment status */
  async getDeploymentStatus(id: string): Promise<BuilderProject['deployment']> {
    return this.client.request('GET', `/api/v1/builder-projects/${id}/deployment`);
  }
}

// ============ Error Class ============

export class L4yercak3Error extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'L4yercak3Error';
  }
}

// ============ Singleton Helper ============

let defaultClient: L4yercak3Client | null = null;

/**
 * Get the default L4yercak3Client instance.
 * Creates one if it doesn't exist, using environment variables for configuration.
 */
export function getL4yercak3Client(): L4yercak3Client {
  if (!defaultClient) {
    defaultClient = new L4yercak3Client();
  }
  return defaultClient;
}

/**
 * Create a new L4yercak3Client instance with custom configuration.
 */
export function createL4yercak3Client(config: L4yercak3ClientConfig): L4yercak3Client {
  return new L4yercak3Client(config);
}
