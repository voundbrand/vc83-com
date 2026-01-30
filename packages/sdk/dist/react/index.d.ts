import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';

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

interface L4yercak3ContextValue {
    client: L4yercak3Client;
    organizationId?: string;
}
interface L4yercak3ProviderProps {
    children: ReactNode;
    /** API key for authentication. If not provided, uses NEXT_PUBLIC_L4YERCAK3_API_KEY */
    apiKey?: string;
    /** Organization ID to scope requests. If not provided, uses L4YERCAK3_ORG_ID */
    organizationId?: string;
    /** Base URL for the API. If not provided, uses NEXT_PUBLIC_L4YERCAK3_URL */
    baseUrl?: string;
    /** Pre-configured client instance (optional, overrides other props) */
    client?: L4yercak3Client;
}
/**
 * Provider component for LayerCake SDK.
 * Wrap your app with this provider to use the SDK hooks.
 *
 * @example
 * ```tsx
 * // In your app/layout.tsx
 * import { L4yercak3Provider } from '@l4yercak3/sdk/react';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <L4yercak3Provider>
 *           {children}
 *         </L4yercak3Provider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
declare function L4yercak3Provider({ children, apiKey, organizationId, baseUrl, client: providedClient, }: L4yercak3ProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to access the LayerCake client and context.
 * Must be used within a L4yercak3Provider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { client } = useL4yercak3();
 *   // Use client.contacts, client.events, etc.
 * }
 * ```
 */
declare function useL4yercak3(): L4yercak3ContextValue;
/**
 * Hook to get just the client instance.
 * Convenience wrapper around useL4yercak3().
 */
declare function useL4yercak3Client(): L4yercak3Client;

interface UseContactsResult {
    /** Current list of contacts */
    contacts: Contact[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of contacts (from last fetch) */
    total: number;
    /** Whether there are more contacts to load */
    hasMore: boolean;
    /** Fetch contacts with optional filters */
    fetchContacts: (params?: ContactListParams) => Promise<PaginatedResponse<Contact>>;
    /** Get a single contact by ID */
    getContact: (id: string) => Promise<Contact>;
    /** Create a new contact */
    createContact: (data: ContactCreateInput) => Promise<Contact>;
    /** Update an existing contact */
    updateContact: (id: string, data: ContactUpdateInput) => Promise<Contact>;
    /** Delete a contact */
    deleteContact: (id: string) => Promise<void>;
    /** Add tags to a contact */
    addTags: (id: string, tags: string[]) => Promise<Contact>;
    /** Remove tags from a contact */
    removeTags: (id: string, tags: string[]) => Promise<Contact>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing contacts in your LayerCake CRM.
 *
 * @example
 * ```tsx
 * function ContactList() {
 *   const { contacts, loading, error, fetchContacts } = useContacts();
 *
 *   useEffect(() => {
 *     fetchContacts({ status: 'active' });
 *   }, []);
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <ul>
 *       {contacts.map(contact => (
 *         <li key={contact.id}>{contact.firstName} {contact.lastName}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
declare function useContacts(): UseContactsResult;

interface UseOrganizationsResult {
    /** Current list of organizations */
    organizations: Organization[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of organizations (from last fetch) */
    total: number;
    /** Whether there are more organizations to load */
    hasMore: boolean;
    /** Fetch organizations with optional filters */
    fetchOrganizations: (params?: OrganizationListParams) => Promise<PaginatedResponse<Organization>>;
    /** Get a single organization by ID */
    getOrganization: (id: string, options?: {
        includeContacts?: boolean;
    }) => Promise<Organization>;
    /** Create a new organization */
    createOrganization: (data: OrganizationCreateInput) => Promise<Organization>;
    /** Update an existing organization */
    updateOrganization: (id: string, data: Partial<OrganizationCreateInput>) => Promise<Organization>;
    /** Delete an organization */
    deleteOrganization: (id: string) => Promise<void>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing B2B organizations in your CRM.
 *
 * @example
 * ```tsx
 * function OrganizationList() {
 *   const { organizations, loading, fetchOrganizations } = useOrganizations();
 *
 *   useEffect(() => {
 *     fetchOrganizations({ subtype: 'customer' });
 *   }, []);
 *
 *   return (
 *     <ul>
 *       {organizations.map(org => (
 *         <li key={org.id}>{org.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
declare function useOrganizations(): UseOrganizationsResult;

interface UseEventsResult {
    /** Current list of events */
    events: Event[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of events (from last fetch) */
    total: number;
    /** Whether there are more events to load */
    hasMore: boolean;
    /** Fetch events with optional filters */
    fetchEvents: (params?: EventListParams) => Promise<PaginatedResponse<Event>>;
    /** Get a single event by ID */
    getEvent: (id: string, options?: {
        includeProducts?: boolean;
        includeSponsors?: boolean;
        includeForms?: boolean;
    }) => Promise<Event>;
    /** Create a new event */
    createEvent: (data: EventCreateInput) => Promise<Event>;
    /** Update an existing event */
    updateEvent: (id: string, data: Partial<EventCreateInput>) => Promise<Event>;
    /** Delete an event */
    deleteEvent: (id: string) => Promise<void>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing events.
 *
 * @example
 * ```tsx
 * function EventList() {
 *   const { events, loading, fetchEvents } = useEvents();
 *
 *   useEffect(() => {
 *     fetchEvents({ status: 'published' });
 *   }, []);
 *
 *   return (
 *     <div>
 *       {events.map(event => (
 *         <EventCard key={event.id} event={event} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
declare function useEvents(): UseEventsResult;
interface UseAttendeesResult {
    /** Current list of attendees */
    attendees: Attendee[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of attendees (from last fetch) */
    total: number;
    /** Whether there are more attendees to load */
    hasMore: boolean;
    /** Fetch attendees for an event */
    fetchAttendees: (eventId: string, params?: AttendeeListParams) => Promise<PaginatedResponse<Attendee>>;
    /** Check in an attendee */
    checkIn: (eventId: string, attendeeId: string) => Promise<Attendee>;
    /** Cancel an attendee's registration */
    cancelRegistration: (eventId: string, attendeeId: string) => Promise<Attendee>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing event attendees.
 *
 * @example
 * ```tsx
 * function AttendeeList({ eventId }) {
 *   const { attendees, loading, fetchAttendees, checkIn } = useAttendees();
 *
 *   useEffect(() => {
 *     fetchAttendees(eventId);
 *   }, [eventId]);
 *
 *   const handleCheckIn = async (attendeeId) => {
 *     await checkIn(eventId, attendeeId);
 *   };
 *
 *   return (
 *     <ul>
 *       {attendees.map(attendee => (
 *         <li key={attendee.id}>
 *           {attendee.contact.firstName} - {attendee.status}
 *           {attendee.status !== 'checked_in' && (
 *             <button onClick={() => handleCheckIn(attendee.id)}>Check In</button>
 *           )}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
declare function useAttendees(): UseAttendeesResult;

interface UseFormsResult {
    /** Current list of forms */
    forms: Form[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of forms (from last fetch) */
    total: number;
    /** Whether there are more forms to load */
    hasMore: boolean;
    /** Fetch forms with optional filters */
    fetchForms: (params?: FormListParams) => Promise<PaginatedResponse<Form>>;
    /** Get a single form by ID */
    getForm: (id: string) => Promise<Form>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing forms.
 *
 * @example
 * ```tsx
 * function FormList() {
 *   const { forms, loading, fetchForms } = useForms();
 *
 *   useEffect(() => {
 *     fetchForms({ status: 'published' });
 *   }, []);
 *
 *   return (
 *     <div>
 *       {forms.map(form => (
 *         <FormCard key={form.id} form={form} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
declare function useForms(): UseFormsResult;
interface UseFormSubmissionsResult {
    /** Current list of submissions */
    submissions: FormSubmission[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Whether a form is being submitted */
    isSubmitting: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of submissions (from last fetch) */
    total: number;
    /** Whether there are more submissions to load */
    hasMore: boolean;
    /** Fetch submissions for a form */
    fetchSubmissions: (formId: string, params?: FormSubmissionListParams) => Promise<PaginatedResponse<FormSubmission>>;
    /** Submit a form response */
    submitForm: (formId: string, data: Record<string, unknown>) => Promise<FormSubmission>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing form submissions.
 *
 * @example
 * ```tsx
 * function ContactForm({ formId }) {
 *   const { submitForm, isSubmitting, error } = useFormSubmissions();
 *   const [formData, setFormData] = useState({});
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       await submitForm(formId, formData);
 *       alert('Form submitted successfully!');
 *     } catch (err) {
 *       // Error is also available in the error state
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {error && <div className="error">{error.message}</div>}
 *       <button type="submit" disabled={isSubmitting}>
 *         {isSubmitting ? 'Submitting...' : 'Submit'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
declare function useFormSubmissions(): UseFormSubmissionsResult;

interface UseProductsResult {
    /** Current list of products */
    products: Product[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of products (from last fetch) */
    total: number;
    /** Whether there are more products to load */
    hasMore: boolean;
    /** Fetch products with optional filters */
    fetchProducts: (params?: ProductListParams) => Promise<PaginatedResponse<Product>>;
    /** Get a single product by ID */
    getProduct: (id: string) => Promise<Product>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for fetching products.
 *
 * @example
 * ```tsx
 * function ProductCatalog({ eventId }) {
 *   const { products, loading, fetchProducts } = useProducts();
 *
 *   useEffect(() => {
 *     fetchProducts({ eventId, status: 'active' });
 *   }, [eventId]);
 *
 *   return (
 *     <div className="grid grid-cols-3 gap-4">
 *       {products.map(product => (
 *         <ProductCard key={product.id} product={product} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
declare function useProducts(): UseProductsResult;
interface CartItem {
    productId: string;
    quantity: number;
    product?: Product;
}
interface UseCheckoutResult {
    /** Current cart items */
    cart: CartItem[];
    /** Whether a checkout is being created */
    isCreatingCheckout: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Current checkout session (if created) */
    checkoutSession: CheckoutSession | null;
    /** Add an item to the cart */
    addToCart: (productId: string, quantity?: number) => void;
    /** Remove an item from the cart */
    removeFromCart: (productId: string) => void;
    /** Update quantity of an item */
    updateQuantity: (productId: string, quantity: number) => void;
    /** Clear the cart */
    clearCart: () => void;
    /** Create a checkout session and redirect to payment */
    createCheckoutSession: (options: Omit<CheckoutSessionCreateInput, 'items'>) => Promise<CheckoutSession>;
    /** Get an existing checkout session by ID */
    getCheckoutSession: (sessionId: string) => Promise<CheckoutSession>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing shopping cart and checkout.
 *
 * @example
 * ```tsx
 * function ProductCard({ product }) {
 *   const { addToCart } = useCheckout();
 *
 *   return (
 *     <div>
 *       <h3>{product.name}</h3>
 *       <p>${(product.priceInCents / 100).toFixed(2)}</p>
 *       <button onClick={() => addToCart(product.id)}>
 *         Add to Cart
 *       </button>
 *     </div>
 *   );
 * }
 *
 * function CartSummary() {
 *   const { cart, createCheckoutSession, isCreatingCheckout } = useCheckout();
 *
 *   const handleCheckout = async () => {
 *     const session = await createCheckoutSession({
 *       successUrl: '/checkout/success',
 *       cancelUrl: '/checkout/cancelled',
 *     });
 *     // Redirect to Stripe checkout
 *     window.location.href = session.checkoutUrl;
 *   };
 *
 *   return (
 *     <div>
 *       <p>{cart.length} items in cart</p>
 *       <button onClick={handleCheckout} disabled={isCreatingCheckout || cart.length === 0}>
 *         {isCreatingCheckout ? 'Creating checkout...' : 'Proceed to Checkout'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
declare function useCheckout(): UseCheckoutResult;

interface UseOrdersResult {
    /** Current list of orders */
    orders: Order[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of orders (from last fetch) */
    total: number;
    /** Whether there are more orders to load */
    hasMore: boolean;
    /** Fetch orders with optional filters */
    fetchOrders: (params?: OrderListParams) => Promise<PaginatedResponse<Order>>;
    /** Get a single order by ID */
    getOrder: (id: string) => Promise<Order>;
    /** Get an order by order number */
    getOrderByNumber: (orderNumber: string) => Promise<Order>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing orders.
 *
 * @example
 * ```tsx
 * function OrderHistory({ contactId }) {
 *   const { orders, loading, fetchOrders } = useOrders();
 *
 *   useEffect(() => {
 *     fetchOrders({ contactId, status: 'paid' });
 *   }, [contactId]);
 *
 *   return (
 *     <div>
 *       {orders.map(order => (
 *         <OrderCard key={order.id} order={order} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
declare function useOrders(): UseOrdersResult;

interface UseInvoicesResult {
    /** Current list of invoices */
    invoices: Invoice[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of invoices (from last fetch) */
    total: number;
    /** Whether there are more invoices to load */
    hasMore: boolean;
    /** Fetch invoices with optional filters */
    fetchInvoices: (params?: InvoiceListParams) => Promise<PaginatedResponse<Invoice>>;
    /** Get a single invoice by ID */
    getInvoice: (id: string) => Promise<Invoice>;
    /** Create a new invoice */
    createInvoice: (data: InvoiceCreateInput) => Promise<Invoice>;
    /** Send an invoice */
    sendInvoice: (id: string, options?: {
        emailTo?: string;
        message?: string;
    }) => Promise<void>;
    /** Mark an invoice as paid */
    markPaid: (id: string, data?: {
        paidAt?: string;
        paymentMethod?: string;
        paymentReference?: string;
    }) => Promise<Invoice>;
    /** Get the PDF URL for an invoice */
    getPdf: (id: string) => Promise<{
        pdfUrl: string;
    }>;
    /** Void an invoice */
    voidInvoice: (id: string) => Promise<Invoice>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing invoices.
 *
 * @example
 * ```tsx
 * function InvoiceList({ organizationId }) {
 *   const { invoices, loading, fetchInvoices, sendInvoice } = useInvoices();
 *
 *   useEffect(() => {
 *     fetchInvoices({ organizationId, status: 'sent' });
 *   }, [organizationId]);
 *
 *   return (
 *     <table>
 *       <tbody>
 *         {invoices.map(invoice => (
 *           <tr key={invoice.id}>
 *             <td>{invoice.number}</td>
 *             <td>${(invoice.totalInCents / 100).toFixed(2)}</td>
 *             <td>{invoice.status}</td>
 *           </tr>
 *         ))}
 *       </tbody>
 *     </table>
 *   );
 * }
 * ```
 */
declare function useInvoices(): UseInvoicesResult;

interface UseBenefitClaimsResult {
    /** Current list of benefit claims */
    claims: BenefitClaim[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of claims (from last fetch) */
    total: number;
    /** Whether there are more claims to load */
    hasMore: boolean;
    /** Fetch claims with optional filters */
    fetchClaims: (params?: BenefitClaimListParams) => Promise<PaginatedResponse<BenefitClaim>>;
    /** Get a single claim by ID */
    getClaim: (id: string) => Promise<BenefitClaim>;
    /** Create a new benefit claim */
    createClaim: (data: BenefitClaimInput) => Promise<BenefitClaim>;
    /** Approve a benefit claim */
    approveClaim: (id: string, notes?: string) => Promise<BenefitClaim>;
    /** Reject a benefit claim */
    rejectClaim: (id: string, reason: string) => Promise<BenefitClaim>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing benefit claims.
 *
 * @example
 * ```tsx
 * function ClaimsList({ memberId }) {
 *   const { claims, loading, fetchClaims } = useBenefitClaims();
 *
 *   useEffect(() => {
 *     fetchClaims({ memberId, status: 'pending' });
 *   }, [memberId]);
 *
 *   return (
 *     <ul>
 *       {claims.map(claim => (
 *         <li key={claim.id}>
 *           {claim.benefitType} - ${(claim.amountInCents / 100).toFixed(2)}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
declare function useBenefitClaims(): UseBenefitClaimsResult;
interface UseCommissionsResult {
    /** Current list of commission payouts */
    commissions: CommissionPayout[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of commissions (from last fetch) */
    total: number;
    /** Whether there are more commissions to load */
    hasMore: boolean;
    /** Fetch commissions with optional filters */
    fetchCommissions: (params?: CommissionPayoutListParams) => Promise<PaginatedResponse<CommissionPayout>>;
    /** Get a single commission payout by ID */
    getCommission: (id: string) => Promise<CommissionPayout>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for viewing commission payouts.
 *
 * @example
 * ```tsx
 * function CommissionHistory({ memberId }) {
 *   const { commissions, loading, fetchCommissions } = useCommissions();
 *
 *   useEffect(() => {
 *     fetchCommissions({ memberId, status: 'completed' });
 *   }, [memberId]);
 *
 *   return (
 *     <ul>
 *       {commissions.map(commission => (
 *         <li key={commission.id}>
 *           {commission.commissionType} - ${(commission.amountInCents / 100).toFixed(2)}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
declare function useCommissions(): UseCommissionsResult;

interface UseCertificatesResult {
    /** Current list of certificates */
    certificates: Certificate[];
    /** Whether a request is in progress */
    loading: boolean;
    /** Last error that occurred */
    error: Error | null;
    /** Total count of certificates (from last fetch) */
    total: number;
    /** Whether there are more certificates to load */
    hasMore: boolean;
    /** Fetch certificates with optional filters */
    fetchCertificates: (params?: {
        recipientId?: string;
        eventId?: string;
        limit?: number;
    }) => Promise<PaginatedResponse<Certificate>>;
    /** Get a single certificate by ID */
    getCertificate: (id: string) => Promise<Certificate>;
    /** Verify a certificate by certificate number */
    verifyCertificate: (certificateNumber: string) => Promise<Certificate>;
    /** Reset error state */
    clearError: () => void;
}
/**
 * Hook for managing certificates.
 *
 * @example
 * ```tsx
 * function CertificateList({ recipientId }) {
 *   const { certificates, loading, fetchCertificates } = useCertificates();
 *
 *   useEffect(() => {
 *     fetchCertificates({ recipientId });
 *   }, [recipientId]);
 *
 *   return (
 *     <div className="grid gap-4">
 *       {certificates.map(cert => (
 *         <CertificateCard key={cert.id} certificate={cert} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
declare function useCertificates(): UseCertificatesResult;

export { type CartItem, L4yercak3Provider, type L4yercak3ProviderProps, type UseAttendeesResult, type UseBenefitClaimsResult, type UseCertificatesResult, type UseCheckoutResult, type UseCommissionsResult, type UseContactsResult, type UseEventsResult, type UseFormSubmissionsResult, type UseFormsResult, type UseInvoicesResult, type UseOrdersResult, type UseOrganizationsResult, type UseProductsResult, useAttendees, useBenefitClaims, useCertificates, useCheckout, useCommissions, useContacts, useEvents, useFormSubmissions, useForms, useInvoices, useL4yercak3, useL4yercak3Client, useOrders, useOrganizations, useProducts };
