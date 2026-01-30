/**
 * @l4yercak3/sdk Types
 *
 * Comprehensive TypeScript type definitions for the LayerCake platform.
 */
/** A contact represents a person in your CRM (customer, lead, prospect, or partner) */
interface Contact {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    status: ContactStatus;
    subtype: ContactSubtype;
    tags: string[];
    customFields?: Record<string, unknown>;
    organizationId?: string;
    organization?: Organization;
    avatarUrl?: string;
    notes?: ContactNote[];
    activities?: ContactActivity[];
    createdAt: string;
    updatedAt: string;
}
type ContactStatus = 'active' | 'inactive' | 'unsubscribed' | 'archived';
type ContactSubtype = 'customer' | 'lead' | 'prospect' | 'partner';
/** Input for creating a new contact */
interface ContactCreateInput {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    subtype?: ContactSubtype;
    tags?: string[];
    customFields?: Record<string, unknown>;
    organizationId?: string;
}
/** Input for updating an existing contact */
interface ContactUpdateInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    status?: Exclude<ContactStatus, 'archived'>;
    subtype?: ContactSubtype;
    tags?: string[];
    customFields?: Record<string, unknown>;
}
/** A note attached to a contact */
interface ContactNote {
    id: string;
    content: string;
    createdBy: string;
    createdAt: string;
}
/** An activity log entry for a contact */
interface ContactActivity {
    id: string;
    type: 'email' | 'call' | 'meeting' | 'note' | 'task' | 'event';
    title: string;
    description?: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
}
/** A B2B organization in your CRM */
interface Organization {
    id: string;
    name: string;
    website?: string;
    industry?: string;
    size?: OrganizationSize;
    subtype: OrganizationSubtype;
    address?: Address;
    taxId?: string;
    billingEmail?: string;
    contacts?: Contact[];
    createdAt: string;
    updatedAt: string;
}
type OrganizationSize = 'small' | 'medium' | 'large' | 'enterprise';
type OrganizationSubtype = 'customer' | 'prospect' | 'partner' | 'vendor';
/** Input for creating a new organization */
interface OrganizationCreateInput {
    name: string;
    website?: string;
    industry?: string;
    size?: OrganizationSize;
    subtype?: OrganizationSubtype;
    address?: AddressInput;
    taxId?: string;
    billingEmail?: string;
}
/** An event (conference, workshop, webinar, etc.) */
interface Event {
    id: string;
    name: string;
    description?: string;
    shortDescription?: string;
    startDate: string;
    endDate: string;
    timezone: string;
    location: string;
    venue?: Venue;
    status: EventStatus;
    subtype: EventSubtype;
    maxCapacity?: number;
    registeredCount?: number;
    imageUrl?: string;
    coverImageUrl?: string;
    products?: Product[];
    sponsors?: Sponsor[];
    forms?: Form[];
    tags?: string[];
    customFields?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
type EventSubtype = 'conference' | 'workshop' | 'webinar' | 'meetup' | 'seminar' | 'other';
/** Input for creating a new event */
interface EventCreateInput {
    name: string;
    description?: string;
    shortDescription?: string;
    startDate: string;
    endDate: string;
    timezone?: string;
    location: string;
    venue?: VenueInput;
    subtype?: EventSubtype;
    maxCapacity?: number;
    imageUrl?: string;
    tags?: string[];
}
/** An attendee registered for an event */
interface Attendee {
    id: string;
    contactId: string;
    contact: Contact;
    eventId: string;
    ticketId: string;
    ticketName: string;
    status: AttendeeStatus;
    checkedInAt?: string;
    checkedInBy?: string;
    registeredAt: string;
    metadata?: Record<string, unknown>;
}
type AttendeeStatus = 'registered' | 'checked_in' | 'cancelled' | 'no_show';
/** A venue where an event takes place */
interface Venue {
    name: string;
    address: Address;
    capacity?: number;
    website?: string;
    phone?: string;
    notes?: string;
}
/** Input for venue data */
interface VenueInput {
    name: string;
    address: AddressInput;
    capacity?: number;
    website?: string;
    phone?: string;
}
/** A sponsor for an event */
interface Sponsor {
    id: string;
    organizationId: string;
    organizationName: string;
    level: SponsorLevel;
    logoUrl?: string;
    websiteUrl?: string;
    description?: string;
    order?: number;
}
type SponsorLevel = 'platinum' | 'gold' | 'silver' | 'bronze' | 'community';
/** A form for collecting data (registration, survey, application, etc.) */
interface Form {
    id: string;
    name: string;
    description?: string;
    status: FormStatus;
    subtype: FormSubtype;
    eventId?: string;
    fields: FormField[];
    settings: FormSettings;
    responseCount: number;
    createdAt: string;
    updatedAt: string;
}
type FormStatus = 'draft' | 'published' | 'closed';
type FormSubtype = 'registration' | 'survey' | 'application' | 'feedback' | 'contact' | 'custom';
/** A field in a form */
interface FormField {
    id: string;
    type: FormFieldType;
    label: string;
    name: string;
    required: boolean;
    placeholder?: string;
    helpText?: string;
    options?: FormFieldOption[];
    validation?: FormFieldValidation;
    conditionalLogic?: FormFieldConditional;
    order: number;
}
type FormFieldType = 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'datetime' | 'time' | 'file' | 'image' | 'signature' | 'rating' | 'slider' | 'hidden';
/** An option for select/radio/checkbox fields */
interface FormFieldOption {
    label: string;
    value: string;
}
/** Validation rules for a form field */
interface FormFieldValidation {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customMessage?: string;
}
/** Conditional logic for showing/hiding/requiring a field */
interface FormFieldConditional {
    action: 'show' | 'hide' | 'require';
    conditions: Array<{
        fieldId: string;
        operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
        value: unknown;
    }>;
    logic: 'and' | 'or';
}
/** Settings for a form */
interface FormSettings {
    submitButtonText: string;
    confirmationMessage: string;
    redirectUrl?: string;
    notifyEmails: string[];
    allowMultipleSubmissions: boolean;
    requireAuth: boolean;
    closedMessage?: string;
    limitResponses?: number;
}
/** A submission/response to a form */
interface FormSubmission {
    id: string;
    formId: string;
    contactId?: string;
    contact?: Contact;
    data: Record<string, unknown>;
    status: FormSubmissionStatus;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    submittedAt: string;
    metadata?: {
        ipAddress?: string;
        userAgent?: string;
        referrer?: string;
    };
}
type FormSubmissionStatus = 'submitted' | 'reviewed' | 'approved' | 'rejected';
/** A product (ticket, merchandise, subscription, etc.) */
interface Product {
    id: string;
    name: string;
    description?: string;
    shortDescription?: string;
    priceInCents: number;
    currency: string;
    eventId?: string;
    category?: string;
    sku?: string;
    status: ProductStatus;
    inventory?: number;
    maxPerOrder?: number;
    minPerOrder?: number;
    salesStart?: string;
    salesEnd?: string;
    imageUrl?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
type ProductStatus = 'active' | 'sold_out' | 'hidden' | 'archived';
/** An order placed through checkout */
interface Order {
    id: string;
    orderNumber: string;
    contactId: string;
    contact?: Contact;
    items: OrderItem[];
    subtotalInCents: number;
    discountInCents?: number;
    taxInCents?: number;
    totalInCents: number;
    currency: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    stripePaymentIntentId?: string;
    stripeCustomerId?: string;
    billingAddress?: Address;
    notes?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    completedAt?: string;
}
type OrderStatus = 'pending' | 'paid' | 'partially_refunded' | 'refunded' | 'cancelled';
type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
/** An item in an order */
interface OrderItem {
    id: string;
    productId: string;
    productName: string;
    productSku?: string;
    quantity: number;
    unitPriceInCents: number;
    totalPriceInCents: number;
    metadata?: Record<string, unknown>;
}
/** A checkout session for collecting payment */
interface CheckoutSession {
    sessionId: string;
    checkoutUrl: string;
    status: 'open' | 'complete' | 'expired';
    order?: Order;
}
/** Input for creating a checkout session */
interface CheckoutSessionCreateInput {
    items: Array<{
        productId: string;
        quantity: number;
    }>;
    contactId?: string;
    email?: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
}
/** An invoice for billing */
interface Invoice {
    id: string;
    number: string;
    contactId?: string;
    contact?: Contact;
    organizationId?: string;
    organization?: Organization;
    type: InvoiceType;
    status: InvoiceStatus;
    issueDate: string;
    dueDate: string;
    paidAt?: string;
    lineItems: InvoiceLineItem[];
    subtotalInCents: number;
    discountInCents?: number;
    discountDescription?: string;
    taxInCents: number;
    taxRate: number;
    totalInCents: number;
    currency: string;
    notes?: string;
    terms?: string;
    footer?: string;
    pdfUrl?: string;
    paymentLink?: string;
    billingAddress?: Address;
    paymentMethod?: string;
    paymentReference?: string;
    reminders?: InvoiceReminder[];
    createdAt: string;
    updatedAt: string;
}
type InvoiceType = 'b2b' | 'b2c';
type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'void';
/** A line item on an invoice */
interface InvoiceLineItem {
    id?: string;
    description: string;
    quantity: number;
    unitPriceInCents: number;
    totalInCents: number;
    productId?: string;
    taxable?: boolean;
}
/** Input for creating an invoice */
interface InvoiceCreateInput {
    contactId?: string;
    organizationId?: string;
    type: InvoiceType;
    dueDate: string;
    lineItems: Array<{
        description: string;
        quantity: number;
        unitPriceInCents: number;
        productId?: string;
        taxable?: boolean;
    }>;
    taxRate?: number;
    discountInCents?: number;
    discountDescription?: string;
    notes?: string;
    terms?: string;
    billingAddress?: AddressInput;
}
/** A reminder sent for an invoice */
interface InvoiceReminder {
    sentAt: string;
    type: 'upcoming' | 'due' | 'overdue';
    method: 'email' | 'sms';
}
/** A benefit claim submitted by a member */
interface BenefitClaim {
    id: string;
    claimNumber: string;
    memberId: string;
    memberName: string;
    memberEmail?: string;
    benefitType: string;
    benefitPlanId?: string;
    amountInCents: number;
    currency: string;
    status: BenefitClaimStatus;
    description?: string;
    receiptUrl?: string;
    supportingDocuments?: string[];
    submittedAt: string;
    processedAt?: string;
    processedBy?: string;
    paidAt?: string;
    paymentMethod?: string;
    paymentReference?: string;
    rejectionReason?: string;
    notes?: string;
    metadata?: Record<string, unknown>;
}
type BenefitClaimStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'cancelled';
/** Input for creating a benefit claim */
interface BenefitClaimInput {
    memberId: string;
    benefitType: string;
    benefitPlanId?: string;
    amountInCents: number;
    currency?: string;
    description?: string;
    receiptUrl?: string;
    supportingDocuments?: string[];
    metadata?: Record<string, unknown>;
}
/** A commission payout to a member */
interface CommissionPayout {
    id: string;
    payoutNumber: string;
    memberId: string;
    memberName: string;
    memberEmail?: string;
    commissionType: string;
    amountInCents: number;
    currency: string;
    status: CommissionPayoutStatus;
    sourceTransactionId?: string;
    sourceTransactionType?: string;
    calculationDetails?: {
        baseAmount: number;
        rate: number;
        adjustments?: Array<{
            description: string;
            amount: number;
        }>;
    };
    scheduledFor?: string;
    processedAt?: string;
    paymentMethod?: string;
    paymentReference?: string;
    failureReason?: string;
    notes?: string;
}
type CommissionPayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
/** A certificate issued to a recipient */
interface Certificate {
    id: string;
    certificateNumber: string;
    type: CertificateType;
    recipientId: string;
    recipientName: string;
    recipientEmail?: string;
    eventId?: string;
    eventName?: string;
    courseName?: string;
    credits?: number;
    creditType?: string;
    issueDate: string;
    expiryDate?: string;
    status: CertificateStatus;
    pdfUrl?: string;
    verificationUrl?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
}
type CertificateType = 'attendance' | 'completion' | 'cme' | 'ce' | 'achievement' | 'custom';
type CertificateStatus = 'draft' | 'issued' | 'revoked' | 'expired';
/** A physical address */
interface Address {
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}
/** Input for address data */
interface AddressInput {
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
}
/** A paginated response from the API */
interface PaginatedResponse<T> {
    items: T[];
    total: number;
    hasMore: boolean;
    nextCursor?: string;
}
/** Common parameters for list endpoints */
interface ListParams {
    limit?: number;
    offset?: number;
    cursor?: string;
    [key: string]: unknown;
}
interface ContactListParams extends ListParams {
    status?: ContactStatus;
    subtype?: ContactSubtype;
    search?: string;
    tags?: string[];
}
interface OrganizationListParams extends ListParams {
    subtype?: OrganizationSubtype;
    search?: string;
}
interface EventListParams extends ListParams {
    status?: EventStatus;
    fromDate?: string;
    toDate?: string;
}
interface AttendeeListParams extends ListParams {
    status?: AttendeeStatus;
}
interface FormListParams extends ListParams {
    status?: FormStatus;
    eventId?: string;
    subtype?: FormSubtype;
}
interface FormSubmissionListParams extends ListParams {
    status?: FormSubmissionStatus;
}
interface ProductListParams extends ListParams {
    eventId?: string;
    status?: ProductStatus;
    category?: string;
}
interface OrderListParams extends ListParams {
    contactId?: string;
    status?: OrderStatus;
    fromDate?: string;
    toDate?: string;
}
interface InvoiceListParams extends ListParams {
    contactId?: string;
    organizationId?: string;
    status?: InvoiceStatus;
    type?: InvoiceType;
}
interface BenefitClaimListParams extends ListParams {
    memberId?: string;
    status?: BenefitClaimStatus;
    benefitType?: string;
}
interface CommissionPayoutListParams extends ListParams {
    memberId?: string;
    status?: CommissionPayoutStatus;
}
/** A webhook event from LayerCake */
interface WebhookEvent<T = Record<string, unknown>> {
    id: string;
    type: WebhookEventType;
    timestamp: string;
    data: T;
    organizationId: string;
}
type WebhookEventType = 'contact.created' | 'contact.updated' | 'contact.deleted' | 'organization.created' | 'organization.updated' | 'event.created' | 'event.updated' | 'event.published' | 'event.cancelled' | 'attendee.registered' | 'attendee.checked_in' | 'attendee.cancelled' | 'form.submitted' | 'order.created' | 'order.paid' | 'order.refunded' | 'invoice.created' | 'invoice.sent' | 'invoice.paid' | 'invoice.overdue' | 'benefit_claim.submitted' | 'benefit_claim.approved' | 'benefit_claim.rejected' | 'benefit_claim.paid' | 'commission.calculated' | 'commission.paid' | 'certificate.issued';
/** Error response from the API */
interface ApiErrorResponse {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}

/**
 * @l4yercak3/sdk API Client
 *
 * A fully-typed API client for the LayerCake platform.
 */

interface L4yercak3ClientConfig {
    /** API key for authentication */
    apiKey?: string;
    /** Base URL for the API (defaults to production) */
    baseUrl?: string;
    /** Organization ID to scope requests to */
    organizationId?: string;
}
declare class L4yercak3Client {
    private apiKey;
    private baseUrl;
    private organizationId?;
    readonly contacts: ContactsAPI;
    readonly organizations: OrganizationsAPI;
    readonly events: EventsAPI;
    readonly forms: FormsAPI;
    readonly products: ProductsAPI;
    readonly checkout: CheckoutAPI;
    readonly orders: OrdersAPI;
    readonly invoices: InvoicesAPI;
    readonly benefits: BenefitsAPI;
    readonly certificates: CertificatesAPI;
    constructor(config?: L4yercak3ClientConfig);
    private getEnvVar;
    /** Make a raw API request */
    request<T, P extends Record<string, unknown> = Record<string, unknown>>(method: string, path: string, options?: {
        params?: P;
        body?: unknown;
    }): Promise<T>;
}
declare class ContactsAPI {
    private client;
    constructor(client: L4yercak3Client);
    /** List contacts with optional filtering */
    list(params?: ContactListParams): Promise<PaginatedResponse<Contact>>;
    /** Get a single contact by ID */
    get(id: string, options?: {
        includeActivities?: boolean;
        includeNotes?: boolean;
        includeOrganization?: boolean;
    }): Promise<Contact>;
    /** Create a new contact */
    create(data: ContactCreateInput): Promise<Contact>;
    /** Update an existing contact */
    update(id: string, data: ContactUpdateInput): Promise<Contact>;
    /** Delete a contact */
    delete(id: string): Promise<void>;
    /** Add tags to a contact */
    addTags(id: string, tags: string[]): Promise<Contact>;
    /** Remove tags from a contact */
    removeTags(id: string, tags: string[]): Promise<Contact>;
}
declare class OrganizationsAPI {
    private client;
    constructor(client: L4yercak3Client);
    /** List organizations with optional filtering */
    list(params?: OrganizationListParams): Promise<PaginatedResponse<Organization>>;
    /** Get a single organization by ID */
    get(id: string, options?: {
        includeContacts?: boolean;
    }): Promise<Organization>;
    /** Create a new organization */
    create(data: OrganizationCreateInput): Promise<Organization>;
    /** Update an existing organization */
    update(id: string, data: Partial<OrganizationCreateInput>): Promise<Organization>;
    /** Delete an organization */
    delete(id: string): Promise<void>;
}
declare class EventsAPI {
    private client;
    constructor(client: L4yercak3Client);
    /** List events with optional filtering */
    list(params?: EventListParams): Promise<PaginatedResponse<Event>>;
    /** Get a single event by ID */
    get(id: string, options?: {
        includeProducts?: boolean;
        includeSponsors?: boolean;
        includeForms?: boolean;
    }): Promise<Event>;
    /** Create a new event */
    create(data: EventCreateInput): Promise<Event>;
    /** Update an existing event */
    update(id: string, data: Partial<EventCreateInput>): Promise<Event>;
    /** Delete an event */
    delete(id: string): Promise<void>;
    /** Get attendees for an event */
    getAttendees(eventId: string, params?: AttendeeListParams): Promise<PaginatedResponse<Attendee>>;
    /** Check in an attendee */
    checkInAttendee(eventId: string, attendeeId: string): Promise<Attendee>;
    /** Cancel an attendee's registration */
    cancelAttendee(eventId: string, attendeeId: string): Promise<Attendee>;
}
declare class FormsAPI {
    private client;
    constructor(client: L4yercak3Client);
    /** List forms with optional filtering */
    list(params?: FormListParams): Promise<PaginatedResponse<Form>>;
    /** Get a single form by ID */
    get(id: string): Promise<Form>;
    /** Submit a form response */
    submit(formId: string, data: Record<string, unknown>): Promise<FormSubmission>;
    /** Get submissions for a form */
    getSubmissions(formId: string, params?: FormSubmissionListParams): Promise<PaginatedResponse<FormSubmission>>;
    /** Get a single submission by ID */
    getSubmission(formId: string, submissionId: string): Promise<FormSubmission>;
}
declare class ProductsAPI {
    private client;
    constructor(client: L4yercak3Client);
    /** List products with optional filtering */
    list(params?: ProductListParams): Promise<PaginatedResponse<Product>>;
    /** Get a single product by ID */
    get(id: string): Promise<Product>;
}
declare class CheckoutAPI {
    private client;
    constructor(client: L4yercak3Client);
    /** Create a new checkout session */
    createSession(data: CheckoutSessionCreateInput): Promise<CheckoutSession>;
    /** Get a checkout session by ID */
    getSession(sessionId: string): Promise<CheckoutSession>;
}
declare class OrdersAPI {
    private client;
    constructor(client: L4yercak3Client);
    /** List orders with optional filtering */
    list(params?: OrderListParams): Promise<PaginatedResponse<Order>>;
    /** Get a single order by ID */
    get(id: string): Promise<Order>;
    /** Get an order by order number */
    getByOrderNumber(orderNumber: string): Promise<Order>;
}
declare class InvoicesAPI {
    private client;
    constructor(client: L4yercak3Client);
    /** List invoices with optional filtering */
    list(params?: InvoiceListParams): Promise<PaginatedResponse<Invoice>>;
    /** Get a single invoice by ID */
    get(id: string): Promise<Invoice>;
    /** Create a new invoice */
    create(data: InvoiceCreateInput): Promise<Invoice>;
    /** Send an invoice */
    send(id: string, options?: {
        emailTo?: string;
        message?: string;
    }): Promise<void>;
    /** Mark an invoice as paid */
    markPaid(id: string, data?: {
        paidAt?: string;
        paymentMethod?: string;
        paymentReference?: string;
    }): Promise<Invoice>;
    /** Get the PDF URL for an invoice */
    getPdf(id: string): Promise<{
        pdfUrl: string;
    }>;
    /** Void an invoice */
    void(id: string): Promise<Invoice>;
}
declare class BenefitsAPI {
    private client;
    constructor(client: L4yercak3Client);
    /** List benefit claims with optional filtering */
    listClaims(params?: BenefitClaimListParams): Promise<PaginatedResponse<BenefitClaim>>;
    /** Get a single benefit claim by ID */
    getClaim(id: string): Promise<BenefitClaim>;
    /** Create a new benefit claim */
    createClaim(data: BenefitClaimInput): Promise<BenefitClaim>;
    /** Approve a benefit claim */
    approveClaim(id: string, notes?: string): Promise<BenefitClaim>;
    /** Reject a benefit claim */
    rejectClaim(id: string, reason: string): Promise<BenefitClaim>;
    /** List commission payouts with optional filtering */
    listCommissions(params?: CommissionPayoutListParams): Promise<PaginatedResponse<CommissionPayout>>;
    /** Get a single commission payout by ID */
    getCommission(id: string): Promise<CommissionPayout>;
}
declare class CertificatesAPI {
    private client;
    constructor(client: L4yercak3Client);
    /** List certificates */
    list(params?: {
        recipientId?: string;
        eventId?: string;
        limit?: number;
    }): Promise<PaginatedResponse<Certificate>>;
    /** Get a single certificate by ID */
    get(id: string): Promise<Certificate>;
    /** Verify a certificate by certificate number */
    verify(certificateNumber: string): Promise<Certificate>;
}
declare class L4yercak3Error extends Error {
    status: number;
    code?: string | undefined;
    details?: unknown | undefined;
    constructor(status: number, message: string, code?: string | undefined, details?: unknown | undefined);
}
/**
 * Get the default L4yercak3Client instance.
 * Creates one if it doesn't exist, using environment variables for configuration.
 */
declare function getL4yercak3Client(): L4yercak3Client;
/**
 * Create a new L4yercak3Client instance with custom configuration.
 */
declare function createL4yercak3Client(config: L4yercak3ClientConfig): L4yercak3Client;

export { type Address, type AddressInput, type ApiErrorResponse, type Attendee, type AttendeeListParams, type AttendeeStatus, type BenefitClaim, type BenefitClaimInput, type BenefitClaimListParams, type BenefitClaimStatus, type Certificate, type CertificateStatus, type CertificateType, type CheckoutSession, type CheckoutSessionCreateInput, type CommissionPayout, type CommissionPayoutListParams, type CommissionPayoutStatus, type Contact, type ContactActivity, type ContactCreateInput, type ContactListParams, type ContactNote, type ContactStatus, type ContactSubtype, type ContactUpdateInput, type Event, type EventCreateInput, type EventListParams, type EventStatus, type EventSubtype, type Form, type FormField, type FormFieldConditional, type FormFieldOption, type FormFieldType, type FormFieldValidation, type FormListParams, type FormSettings, type FormStatus, type FormSubmission, type FormSubmissionListParams, type FormSubmissionStatus, type FormSubtype, type Invoice, type InvoiceCreateInput, type InvoiceLineItem, type InvoiceListParams, type InvoiceReminder, type InvoiceStatus, type InvoiceType, L4yercak3Client, type L4yercak3ClientConfig, L4yercak3Error, type ListParams, type Order, type OrderItem, type OrderListParams, type OrderStatus, type Organization, type OrganizationCreateInput, type OrganizationListParams, type OrganizationSize, type OrganizationSubtype, type PaginatedResponse, type PaymentStatus, type Product, type ProductListParams, type ProductStatus, type Sponsor, type SponsorLevel, type Venue, type VenueInput, type WebhookEvent, type WebhookEventType, createL4yercak3Client, getL4yercak3Client };
