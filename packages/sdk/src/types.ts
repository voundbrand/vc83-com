/**
 * @l4yercak3/sdk Types
 *
 * Comprehensive TypeScript type definitions for the LayerCake platform.
 */

// ============ CRM Types ============

/** A contact represents a person in your CRM (customer, lead, prospect, or partner) */
export interface Contact {
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

export type ContactStatus = 'active' | 'inactive' | 'unsubscribed' | 'archived';
export type ContactSubtype = 'customer' | 'lead' | 'prospect' | 'partner';

/** Input for creating a new contact */
export interface ContactCreateInput {
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
export interface ContactUpdateInput {
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
export interface ContactNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

/** An activity log entry for a contact */
export interface ContactActivity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'task' | 'event';
  title: string;
  description?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}

/** A B2B organization in your CRM */
export interface Organization {
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

export type OrganizationSize = 'small' | 'medium' | 'large' | 'enterprise';
export type OrganizationSubtype = 'customer' | 'prospect' | 'partner' | 'vendor';

/** Input for creating a new organization */
export interface OrganizationCreateInput {
  name: string;
  website?: string;
  industry?: string;
  size?: OrganizationSize;
  subtype?: OrganizationSubtype;
  address?: AddressInput;
  taxId?: string;
  billingEmail?: string;
}

// ============ Event Types ============

/** An event (conference, workshop, webinar, etc.) */
export interface Event {
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

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventSubtype = 'conference' | 'workshop' | 'webinar' | 'meetup' | 'seminar' | 'other';

/** Input for creating a new event */
export interface EventCreateInput {
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
export interface Attendee {
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

export type AttendeeStatus = 'registered' | 'checked_in' | 'cancelled' | 'no_show';

/** A venue where an event takes place */
export interface Venue {
  name: string;
  address: Address;
  capacity?: number;
  website?: string;
  phone?: string;
  notes?: string;
}

/** Input for venue data */
export interface VenueInput {
  name: string;
  address: AddressInput;
  capacity?: number;
  website?: string;
  phone?: string;
}

/** A sponsor for an event */
export interface Sponsor {
  id: string;
  organizationId: string;
  organizationName: string;
  level: SponsorLevel;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  order?: number;
}

export type SponsorLevel = 'platinum' | 'gold' | 'silver' | 'bronze' | 'community';

// ============ Form Types ============

/** A form for collecting data (registration, survey, application, etc.) */
export interface Form {
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

export type FormStatus = 'draft' | 'published' | 'closed';
export type FormSubtype = 'registration' | 'survey' | 'application' | 'feedback' | 'contact' | 'custom';

/** A field in a form */
export interface FormField {
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

export type FormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'datetime'
  | 'time'
  | 'file'
  | 'image'
  | 'signature'
  | 'rating'
  | 'slider'
  | 'hidden';

/** An option for select/radio/checkbox fields */
export interface FormFieldOption {
  label: string;
  value: string;
}

/** Validation rules for a form field */
export interface FormFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

/** Conditional logic for showing/hiding/requiring a field */
export interface FormFieldConditional {
  action: 'show' | 'hide' | 'require';
  conditions: Array<{
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: unknown;
  }>;
  logic: 'and' | 'or';
}

/** Settings for a form */
export interface FormSettings {
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
export interface FormSubmission {
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

export type FormSubmissionStatus = 'submitted' | 'reviewed' | 'approved' | 'rejected';

// ============ Product & Checkout Types ============

/** A product (ticket, merchandise, subscription, etc.) */
export interface Product {
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

export type ProductStatus = 'active' | 'sold_out' | 'hidden' | 'archived';

/** An order placed through checkout */
export interface Order {
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

export type OrderStatus = 'pending' | 'paid' | 'partially_refunded' | 'refunded' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

/** An item in an order */
export interface OrderItem {
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
export interface CheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  status: 'open' | 'complete' | 'expired';
  order?: Order;
}

/** Input for creating a checkout session */
export interface CheckoutSessionCreateInput {
  items: Array<{ productId: string; quantity: number }>;
  contactId?: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

// ============ Invoice Types ============

/** An invoice for billing */
export interface Invoice {
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

export type InvoiceType = 'b2b' | 'b2c';
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'void';

/** A line item on an invoice */
export interface InvoiceLineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPriceInCents: number;
  totalInCents: number;
  productId?: string;
  taxable?: boolean;
}

/** Input for creating an invoice */
export interface InvoiceCreateInput {
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
export interface InvoiceReminder {
  sentAt: string;
  type: 'upcoming' | 'due' | 'overdue';
  method: 'email' | 'sms';
}

// ============ Benefits Types ============

/** A benefit claim submitted by a member */
export interface BenefitClaim {
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

export type BenefitClaimStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'cancelled';

/** Input for creating a benefit claim */
export interface BenefitClaimInput {
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
export interface CommissionPayout {
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
    adjustments?: Array<{ description: string; amount: number }>;
  };
  scheduledFor?: string;
  processedAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  failureReason?: string;
  notes?: string;
}

export type CommissionPayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// ============ Certificate Types ============

/** A certificate issued to a recipient */
export interface Certificate {
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

export type CertificateType = 'attendance' | 'completion' | 'cme' | 'ce' | 'achievement' | 'custom';
export type CertificateStatus = 'draft' | 'issued' | 'revoked' | 'expired';

// ============ Common Types ============

/** A physical address */
export interface Address {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/** Input for address data */
export interface AddressInput {
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

// ============ Pagination ============

/** A paginated response from the API */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

// ============ List Parameters ============

/** Common parameters for list endpoints */
export interface ListParams {
  limit?: number;
  offset?: number;
  cursor?: string;
  [key: string]: unknown;
}

export interface ContactListParams extends ListParams {
  status?: ContactStatus;
  subtype?: ContactSubtype;
  search?: string;
  tags?: string[];
}

export interface OrganizationListParams extends ListParams {
  subtype?: OrganizationSubtype;
  search?: string;
}

export interface EventListParams extends ListParams {
  status?: EventStatus;
  fromDate?: string;
  toDate?: string;
}

export interface AttendeeListParams extends ListParams {
  status?: AttendeeStatus;
}

export interface FormListParams extends ListParams {
  status?: FormStatus;
  eventId?: string;
  subtype?: FormSubtype;
}

export interface FormSubmissionListParams extends ListParams {
  status?: FormSubmissionStatus;
}

export interface ProductListParams extends ListParams {
  eventId?: string;
  status?: ProductStatus;
  category?: string;
}

export interface OrderListParams extends ListParams {
  contactId?: string;
  status?: OrderStatus;
  fromDate?: string;
  toDate?: string;
}

export interface InvoiceListParams extends ListParams {
  contactId?: string;
  organizationId?: string;
  status?: InvoiceStatus;
  type?: InvoiceType;
}

export interface BenefitClaimListParams extends ListParams {
  memberId?: string;
  status?: BenefitClaimStatus;
  benefitType?: string;
}

export interface CommissionPayoutListParams extends ListParams {
  memberId?: string;
  status?: CommissionPayoutStatus;
}

// ============ Webhook Types ============

/** A webhook event from LayerCake */
export interface WebhookEvent<T = Record<string, unknown>> {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  data: T;
  organizationId: string;
}

export type WebhookEventType =
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'organization.created'
  | 'organization.updated'
  | 'event.created'
  | 'event.updated'
  | 'event.published'
  | 'event.cancelled'
  | 'attendee.registered'
  | 'attendee.checked_in'
  | 'attendee.cancelled'
  | 'form.submitted'
  | 'order.created'
  | 'order.paid'
  | 'order.refunded'
  | 'invoice.created'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'benefit_claim.submitted'
  | 'benefit_claim.approved'
  | 'benefit_claim.rejected'
  | 'benefit_claim.paid'
  | 'commission.calculated'
  | 'commission.paid'
  | 'certificate.issued';

// ============ Builder Project Types ============

/** A builder project (v0-generated deployable app) */
export interface BuilderProject {
  id: string;
  name: string;
  description?: string;
  status: BuilderProjectStatus;
  subtype: BuilderProjectSubtype;
  appCode: string;
  /** v0 chat/generation info */
  v0ChatId?: string;
  v0WebUrl?: string;
  v0DemoUrl?: string;
  /** Generated files from v0 */
  generatedFiles: BuilderProjectFile[];
  /** SDK version to use */
  sdkVersion: string;
  /** Required environment variables for deployment */
  requiredEnvVars: BuilderProjectEnvVar[];
  /** Linked database objects for dynamic data */
  linkedObjects: BuilderProjectLinkedObjects;
  /** Deployment info */
  deployment: BuilderProjectDeployment;
  createdAt: string;
  updatedAt: string;
}

export type BuilderProjectStatus = 'draft' | 'generating' | 'ready' | 'deploying' | 'deployed' | 'failed' | 'archived';
export type BuilderProjectSubtype = 'v0_generated' | 'template_based' | 'custom';

/** A generated file in a builder project */
export interface BuilderProjectFile {
  path: string;
  content: string;
  language: string;
}

/** Environment variable definition */
export interface BuilderProjectEnvVar {
  key: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

/** Linked objects for dynamic data in builder projects */
export interface BuilderProjectLinkedObjects {
  events: string[];
  products: string[];
  forms: string[];
  contacts: string[];
}

/** Deployment information for a builder project */
export interface BuilderProjectDeployment {
  githubRepo?: string | null;
  githubBranch?: string;
  vercelProjectId?: string | null;
  vercelDeployUrl?: string | null;
  productionUrl?: string | null;
  status: BuilderProjectDeploymentStatus;
  lastDeployedAt?: number | null;
  deploymentError?: string | null;
}

export type BuilderProjectDeploymentStatus = 'not_deployed' | 'deploying' | 'deployed' | 'failed';

/** Input for creating a builder project */
export interface BuilderProjectCreateInput {
  name: string;
  description?: string;
  subtype: BuilderProjectSubtype;
  v0ChatId?: string;
  v0WebUrl?: string;
  v0DemoUrl?: string;
  files?: BuilderProjectFile[];
}

/** Input for updating a builder project */
export interface BuilderProjectUpdateInput {
  name?: string;
  description?: string;
  status?: BuilderProjectStatus;
  v0ChatId?: string;
  v0WebUrl?: string;
  v0DemoUrl?: string;
  files?: BuilderProjectFile[];
}

/** Input for linking objects to a builder project */
export interface BuilderProjectLinkInput {
  events?: string[];
  products?: string[];
  forms?: string[];
  contacts?: string[];
}

/** List params for builder projects */
export interface BuilderProjectListParams extends ListParams {
  status?: BuilderProjectStatus;
  subtype?: BuilderProjectSubtype;
}

// ============ API Error Types ============

/** Error response from the API */
export interface ApiErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
