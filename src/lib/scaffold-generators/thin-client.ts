/**
 * THIN CLIENT SCAFFOLD GENERATOR
 *
 * Generates infrastructure files that wrap around v0-generated app files.
 * v0 files are preserved untouched — this only ADDS plumbing:
 *
 * - lib/api.ts         — Typed API wrapper for l4yercak3 platform
 * - lib/{category}.ts  — Category-specific helpers (forms, events, etc.)
 * - middleware.ts       — Auth check, CORS, rate limiting
 * - app/api/webhook/route.ts — Webhook handler for platform events
 * - components/providers.tsx  — Client-side providers wrapper
 * - types/index.ts     — TypeScript interfaces for API responses
 * - tailwind.config.ts — Tailwind config (v0 apps use it)
 * - tsconfig.json      — TypeScript config
 *
 * These files are ADDITIVE — they sit alongside v0's components/pages.
 */

import type { PublishConfig, EnvVarConfig } from "@/contexts/publish-context";
import { API_CATEGORIES } from "@/lib/api-catalog";

// ============================================================================
// TYPES
// ============================================================================

export interface ScaffoldFile {
  path: string;
  content: string;
  /** Descriptive label for the file */
  label: string;
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate all scaffold files based on publish config.
 * These are ADDED alongside the v0-generated files.
 */
export function generateThinClientScaffold(config: PublishConfig): ScaffoldFile[] {
  const files: ScaffoldFile[] = [];

  // Always generated
  files.push(generateApiWrapper(config));
  files.push(generateTypesIndex(config));
  files.push(generateProvidersWrapper(config));
  files.push(generateTailwindConfig());
  files.push(generateTsConfig());
  files.push(generatePackageJson(config));
  files.push(generateEnvExample(config.envVars));
  files.push(generateReadme(config));
  files.push(generateMiddleware(config));
  files.push(generateGitignore());

  // Category-specific helpers
  for (const categoryId of config.selectedCategories) {
    const categoryFile = generateCategoryHelper(categoryId);
    if (categoryFile) {
      files.push(categoryFile);
    }
  }

  // Category-specific pages
  for (const categoryId of config.selectedCategories) {
    const pageFiles = generateCategoryPages(categoryId);
    files.push(...pageFiles);
  }

  // Webhook handler (if any webhook-capable category selected)
  const webhookCategories = ["forms", "events", "products", "invoices", "bookings"];
  if (config.selectedCategories.some((c) => webhookCategories.includes(c))) {
    files.push(generateWebhookHandler(config));
  }

  // Stripe files
  if (config.payments.stripe) {
    files.push(...generateStripeFiles());
  }

  return files;
}

// ============================================================================
// CORE FILES
// ============================================================================

function generateApiWrapper(config: PublishConfig): ScaffoldFile {
  const categories = config.selectedCategories;

  const imports = categories
    .map((id) => {
      const fnName = getCategoryImportName(id);
      return `export { ${fnName} } from './${id}';`;
    })
    .join("\n");

  return {
    path: "lib/api.ts",
    label: "API wrapper library",
    content: `/**
 * l4yercak3 API Client
 *
 * Typed wrapper around the l4yercak3 platform REST API.
 * Auto-generated based on your selected capabilities.
 */

const BASE_URL = process.env.NEXT_PUBLIC_L4YERCAK3_URL || '';
const API_KEY = process.env.L4YERCAK3_API_KEY || '';
const ORG_ID = process.env.NEXT_PUBLIC_L4YERCAK3_ORG_ID || '';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Use public endpoint (no API key needed) */
  isPublic?: boolean;
}

/**
 * Make an authenticated request to the l4yercak3 API.
 * Handles auth headers and error formatting.
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, isPublic = false } = options;

  const url = \`\${BASE_URL}\${endpoint}\`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (!isPublic) {
    requestHeaders['Authorization'] = \`Bearer \${API_KEY}\`;
    requestHeaders['X-Organization-Id'] = ORG_ID;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(\`API error (\${response.status}): \${errorText}\`);
  }

  return response.json();
}

/**
 * Make a server-side API request (includes API key).
 * Use this in API routes and server components.
 */
export async function serverApiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, isPublic: false });
}

/**
 * Re-export all category helpers for convenient imports
 */
${imports}
`,
  };
}

function generateTypesIndex(config: PublishConfig): ScaffoldFile {
  const typeBlocks: string[] = [];

  if (config.selectedCategories.includes("forms")) {
    typeBlocks.push(`
export interface Form {
  _id: string;
  name: string;
  description?: string;
  fields: FormField[];
  status: 'active' | 'archived';
  createdAt: number;
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormResponse {
  _id: string;
  formId: string;
  data: Record<string, unknown>;
  submittedAt: number;
}`);
  }

  if (config.selectedCategories.includes("events")) {
    typeBlocks.push(`
export interface Event {
  _id: string;
  name: string;
  description?: string;
  date: string;
  endDate?: string;
  location?: string;
  capacity?: number;
  status: 'draft' | 'published' | 'cancelled';
  ticketTypes?: TicketType[];
}

export interface TicketType {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  available: number;
}`);
  }

  if (config.selectedCategories.includes("products")) {
    typeBlocks.push(`
export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  images?: string[];
  status: 'active' | 'archived';
  inventory?: number;
}`);
  }

  if (config.selectedCategories.includes("crm")) {
    typeBlocks.push(`
export interface Contact {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tags?: string[];
  createdAt: number;
}`);
  }

  if (config.selectedCategories.includes("invoices")) {
    typeBlocks.push(`
export interface Invoice {
  _id: string;
  invoiceNumber: string;
  contactId: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  createdAt: number;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}`);
  }

  if (config.selectedCategories.includes("bookings")) {
    typeBlocks.push(`
export interface Booking {
  _id: string;
  resourceId: string;
  contactId?: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
}

export interface AvailabilitySlot {
  _id: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}`);
  }

  if (config.selectedCategories.includes("tickets")) {
    typeBlocks.push(`
export interface Ticket {
  _id: string;
  eventId: string;
  ticketTypeId: string;
  buyerName: string;
  buyerEmail: string;
  status: 'valid' | 'used' | 'cancelled';
  purchasedAt: number;
  qrCode?: string;
}`);
  }

  return {
    path: "types/index.ts",
    label: "TypeScript type definitions",
    content: `/**
 * Type definitions for l4yercak3 API responses.
 * Auto-generated based on your selected capabilities.
 */

/** Standard paginated API response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Standard API error response */
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
${typeBlocks.join("\n")}
`,
  };
}

function generateProvidersWrapper(config: PublishConfig): ScaffoldFile {
  const imports: string[] = [`'use client';`, ""];
  const providers: string[] = [];

  if (config.auth === "clerk") {
    imports.push(`import { ClerkProvider } from '@clerk/nextjs';`);
    providers.push("ClerkProvider");
  }

  imports.push(`import type { ReactNode } from 'react';`);

  let wrapperBody: string;
  if (providers.length === 0) {
    wrapperBody = `  return <>{children}</>;`;
  } else if (providers.length === 1) {
    wrapperBody = `  return (
    <${providers[0]}>
      {children}
    </${providers[0]}>
  );`;
  } else {
    // Nest providers
    let inner = "{children}";
    for (let i = providers.length - 1; i >= 0; i--) {
      inner = `<${providers[i]}>\n      ${inner}\n    </${providers[i]}>`;
    }
    wrapperBody = `  return (\n    ${inner}\n  );`;
  }

  return {
    path: "components/providers.tsx",
    label: "Client-side providers wrapper",
    content: `${imports.join("\n")}

/**
 * App-level providers wrapper.
 * Wrap your root layout's children with this component.
 */
export function Providers({ children }: { children: ReactNode }) {
${wrapperBody}
}
`,
  };
}

function generateMiddleware(config: PublishConfig): ScaffoldFile {
  const hasAuth = config.auth !== "none";

  if (config.auth === "clerk") {
    return {
      path: "middleware.ts",
      label: "Next.js middleware (Clerk auth)",
      content: `import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
`,
    };
  }

  return {
    path: "middleware.ts",
    label: "Next.js middleware",
    content: `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

${
  hasAuth
    ? `  // Auth check for protected routes
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/account');

  if (isProtectedRoute) {
    // Check for auth session cookie/token
    const token = request.cookies.get('session')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
`
    : `  // No auth configured — all routes are public`
}

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
`,
  };
}

function generateWebhookHandler(config: PublishConfig): ScaffoldFile {
  const eventTypes: string[] = [];

  if (config.selectedCategories.includes("forms")) {
    eventTypes.push("'form.submitted'", "'form.created'");
  }
  if (config.selectedCategories.includes("events")) {
    eventTypes.push("'event.created'", "'event.updated'", "'ticket.purchased'");
  }
  if (config.selectedCategories.includes("products")) {
    eventTypes.push("'product.created'", "'product.updated'", "'order.completed'");
  }
  if (config.selectedCategories.includes("invoices")) {
    eventTypes.push("'invoice.sent'", "'invoice.paid'", "'invoice.overdue'");
  }
  if (config.selectedCategories.includes("bookings")) {
    eventTypes.push("'booking.created'", "'booking.cancelled'");
  }

  return {
    path: "app/api/webhook/route.ts",
    label: "Webhook handler for platform events",
    content: `import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.L4YERCAK3_WEBHOOK_SECRET || '';

/**
 * Verify webhook signature from l4yercak3 platform.
 */
function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('L4YERCAK3_WEBHOOK_SECRET not set — skipping verification');
    return true;
  }

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

type WebhookEventType = ${eventTypes.length > 0 ? eventTypes.join(" | ") : "string"};

interface WebhookEvent {
  type: WebhookEventType;
  data: Record<string, unknown>;
  timestamp: number;
  organizationId: string;
}

/**
 * Handle incoming webhooks from l4yercak3 platform.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-l4yercak3-signature') || '';

    // Verify webhook authenticity
    if (!verifySignature(payload, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event: WebhookEvent = JSON.parse(payload);
    console.log(\`[Webhook] Received: \${event.type}\`, event.data);

    // Handle each event type
    switch (event.type) {
${config.selectedCategories.includes("forms") ? `      case 'form.submitted':
        // Handle new form submission
        console.log('New form submission:', event.data);
        break;
` : ""}${config.selectedCategories.includes("events") ? `      case 'ticket.purchased':
        // Handle ticket purchase
        console.log('Ticket purchased:', event.data);
        break;
` : ""}${config.selectedCategories.includes("products") ? `      case 'order.completed':
        // Handle completed order
        console.log('Order completed:', event.data);
        break;
` : ""}${config.selectedCategories.includes("invoices") ? `      case 'invoice.paid':
        // Handle paid invoice
        console.log('Invoice paid:', event.data);
        break;
` : ""}      default:
        console.log(\`[Webhook] Unhandled event type: \${event.type}\`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
`,
  };
}

// ============================================================================
// CATEGORY-SPECIFIC HELPERS
// ============================================================================

function generateCategoryHelper(categoryId: string): ScaffoldFile | null {
  switch (categoryId) {
    case "forms":
      return generateFormsHelper();
    case "events":
      return generateEventsHelper();
    case "products":
      return generateProductsHelper();
    case "crm":
      return generateCrmHelper();
    case "invoices":
      return generateInvoicesHelper();
    case "bookings":
      return generateBookingsHelper();
    case "tickets":
      return generateTicketsHelper();
    default:
      return null;
  }
}

function generateFormsHelper(): ScaffoldFile {
  return {
    path: "lib/forms.ts",
    label: "Forms API helpers",
    content: `import { apiRequest } from './api';
import type { Form, FormResponse, PaginatedResponse } from '@/types';

export async function fetchForms(): Promise<PaginatedResponse<Form>> {
  return apiRequest('/api/v1/forms');
}

export async function fetchForm(formId: string): Promise<Form> {
  return apiRequest(\`/api/v1/forms/\${formId}\`);
}

export async function fetchFormResponses(formId: string): Promise<PaginatedResponse<FormResponse>> {
  return apiRequest(\`/api/v1/forms/\${formId}/responses\`);
}

export async function submitForm(formId: string, data: Record<string, unknown>): Promise<FormResponse> {
  return apiRequest(\`/api/v1/forms/\${formId}/responses\`, {
    method: 'POST',
    body: data,
  });
}

/**
 * Public form submission — no API key needed.
 * Use this for public-facing forms.
 */
export async function submitPublicForm(formId: string, data: Record<string, unknown>): Promise<FormResponse> {
  return apiRequest(\`/api/v1/forms/public/\${formId}/submit\`, {
    method: 'POST',
    body: data,
    isPublic: true,
  });
}
`,
  };
}

function generateEventsHelper(): ScaffoldFile {
  return {
    path: "lib/events.ts",
    label: "Events API helpers",
    content: `import { apiRequest } from './api';
import type { Event, PaginatedResponse } from '@/types';

export async function fetchEvents(): Promise<PaginatedResponse<Event>> {
  return apiRequest('/api/v1/events');
}

export async function fetchEvent(eventId: string): Promise<Event> {
  return apiRequest(\`/api/v1/events/\${eventId}\`);
}

export async function createEvent(data: Partial<Event>): Promise<Event> {
  return apiRequest('/api/v1/events', {
    method: 'POST',
    body: data,
  });
}

export async function updateEvent(eventId: string, data: Partial<Event>): Promise<Event> {
  return apiRequest(\`/api/v1/events/\${eventId}\`, {
    method: 'PUT',
    body: data,
  });
}
`,
  };
}

function generateProductsHelper(): ScaffoldFile {
  return {
    path: "lib/products.ts",
    label: "Products API helpers",
    content: `import { apiRequest } from './api';
import type { Product, PaginatedResponse } from '@/types';

export async function fetchProducts(): Promise<PaginatedResponse<Product>> {
  return apiRequest('/api/v1/products');
}

export async function fetchProduct(productId: string): Promise<Product> {
  return apiRequest(\`/api/v1/products/\${productId}\`);
}

export async function createProduct(data: Partial<Product>): Promise<Product> {
  return apiRequest('/api/v1/products', {
    method: 'POST',
    body: data,
  });
}

export async function updateProduct(productId: string, data: Partial<Product>): Promise<Product> {
  return apiRequest(\`/api/v1/products/\${productId}\`, {
    method: 'PUT',
    body: data,
  });
}
`,
  };
}

function generateCrmHelper(): ScaffoldFile {
  return {
    path: "lib/contacts.ts",
    label: "CRM Contacts API helpers",
    content: `import { apiRequest } from './api';
import type { Contact, PaginatedResponse } from '@/types';

export async function fetchContacts(): Promise<PaginatedResponse<Contact>> {
  return apiRequest('/api/v1/crm/contacts');
}

export async function fetchContact(contactId: string): Promise<Contact> {
  return apiRequest(\`/api/v1/crm/contacts/\${contactId}\`);
}

export async function createContact(data: Partial<Contact>): Promise<Contact> {
  return apiRequest('/api/v1/crm/contacts', {
    method: 'POST',
    body: data,
  });
}
`,
  };
}

function generateInvoicesHelper(): ScaffoldFile {
  return {
    path: "lib/invoicing.ts",
    label: "Invoicing API helpers",
    content: `import { apiRequest } from './api';
import type { Invoice, PaginatedResponse } from '@/types';

export async function fetchInvoices(): Promise<PaginatedResponse<Invoice>> {
  return apiRequest('/api/v1/invoices');
}

export async function fetchInvoice(invoiceId: string): Promise<Invoice> {
  return apiRequest(\`/api/v1/invoices/\${invoiceId}\`);
}

export async function createInvoice(data: Partial<Invoice>): Promise<Invoice> {
  return apiRequest('/api/v1/invoices', {
    method: 'POST',
    body: data,
  });
}

export async function sendInvoice(invoiceId: string): Promise<{ sent: boolean }> {
  return apiRequest(\`/api/v1/invoices/\${invoiceId}/send\`, {
    method: 'POST',
  });
}
`,
  };
}

function generateBookingsHelper(): ScaffoldFile {
  return {
    path: "lib/bookings.ts",
    label: "Bookings API helpers",
    content: `import { apiRequest } from './api';
import type { Booking, AvailabilitySlot, PaginatedResponse } from '@/types';

export async function fetchBookings(): Promise<PaginatedResponse<Booking>> {
  return apiRequest('/api/v1/bookings');
}

export async function createBooking(data: Partial<Booking>): Promise<Booking> {
  return apiRequest('/api/v1/bookings', {
    method: 'POST',
    body: data,
  });
}

export async function fetchAvailability(resourceId?: string): Promise<PaginatedResponse<AvailabilitySlot>> {
  const query = resourceId ? \`?resourceId=\${resourceId}\` : '';
  return apiRequest(\`/api/v1/availability\${query}\`);
}

export async function createAvailability(data: Partial<AvailabilitySlot>): Promise<AvailabilitySlot> {
  return apiRequest('/api/v1/availability', {
    method: 'POST',
    body: data,
  });
}
`,
  };
}

function generateTicketsHelper(): ScaffoldFile {
  return {
    path: "lib/tickets.ts",
    label: "Tickets API helpers",
    content: `import { apiRequest } from './api';
import type { Ticket, PaginatedResponse } from '@/types';

export async function fetchTickets(): Promise<PaginatedResponse<Ticket>> {
  return apiRequest('/api/v1/tickets');
}

export async function fetchTicket(ticketId: string): Promise<Ticket> {
  return apiRequest(\`/api/v1/tickets/\${ticketId}\`);
}

export async function createTicket(data: Partial<Ticket>): Promise<Ticket> {
  return apiRequest('/api/v1/tickets', {
    method: 'POST',
    body: data,
  });
}

export async function updateTicket(ticketId: string, data: Partial<Ticket>): Promise<Ticket> {
  return apiRequest(\`/api/v1/tickets/\${ticketId}\`, {
    method: 'PUT',
    body: data,
  });
}
`,
  };
}

// ============================================================================
// CATEGORY-SPECIFIC PAGES
// ============================================================================

function generateCategoryPages(categoryId: string): ScaffoldFile[] {
  switch (categoryId) {
    case "forms":
      return [
        {
          path: "app/forms/page.tsx",
          label: "Forms listing page",
          content: `import { fetchForms } from '@/lib/forms';

export default async function FormsPage() {
  const { data: forms } = await fetchForms();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Forms</h1>
      <div className="grid gap-4">
        {forms.map((form) => (
          <a
            key={form._id}
            href={\`/forms/\${form._id}\`}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold">{form.name}</h2>
            {form.description && (
              <p className="text-gray-600 mt-2">{form.description}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
`,
        },
      ];

    case "events":
      return [
        {
          path: "app/events/page.tsx",
          label: "Events listing page",
          content: `import { fetchEvents } from '@/lib/events';

export default async function EventsPage() {
  const { data: events } = await fetchEvents();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Events</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <a
            key={event._id}
            href={\`/events/\${event._id}\`}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold">{event.name}</h2>
            <p className="text-gray-500 mt-1">
              {new Date(event.date).toLocaleDateString()}
            </p>
            {event.location && (
              <p className="text-gray-600 mt-2">{event.location}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
`,
        },
      ];

    case "products":
      return [
        {
          path: "app/products/page.tsx",
          label: "Products catalog page",
          content: `import { fetchProducts } from '@/lib/products';

export default async function ProductsPage() {
  const { data: products } = await fetchProducts();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Products</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <a
            key={product._id}
            href={\`/products/\${product._id}\`}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-2xl font-bold text-green-600 mt-2">
              \${(product.price / 100).toFixed(2)}
            </p>
            {product.description && (
              <p className="text-gray-600 mt-2 line-clamp-2">{product.description}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
`,
        },
      ];

    case "invoices":
      return [
        {
          path: "app/invoices/page.tsx",
          label: "Invoices listing page",
          content: `import { fetchInvoices } from '@/lib/invoicing';

export default async function InvoicesPage() {
  const { data: invoices } = await fetchInvoices();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Invoices</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="pb-3 font-semibold">Invoice #</th>
              <th className="pb-3 font-semibold">Amount</th>
              <th className="pb-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice._id} className="border-b">
                <td className="py-3">
                  <a href={\`/invoices/\${invoice._id}\`} className="text-blue-600 hover:underline">
                    {invoice.invoiceNumber}
                  </a>
                </td>
                <td className="py-3">\${(invoice.total / 100).toFixed(2)}</td>
                <td className="py-3">
                  <span className={\`px-2 py-1 rounded-full text-xs font-medium \${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }\`}>
                    {invoice.status}
                  </span>
                </td>
                <td className="py-3">{new Date(invoice.dueDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
`,
        },
      ];

    case "bookings":
      return [
        {
          path: "app/bookings/page.tsx",
          label: "Bookings calendar page",
          content: `import { fetchBookings } from '@/lib/bookings';

export default async function BookingsPage() {
  const { data: bookings } = await fetchBookings();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Bookings</h1>
      <div className="grid gap-4">
        {bookings.map((booking) => (
          <div
            key={booking._id}
            className="p-4 bg-white rounded-lg shadow border-l-4 border-blue-500"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">
                  {new Date(booking.startTime).toLocaleString()} - {new Date(booking.endTime).toLocaleTimeString()}
                </p>
                {booking.notes && <p className="text-gray-600 mt-1">{booking.notes}</p>}
              </div>
              <span className={\`px-2 py-1 rounded-full text-xs font-medium \${
                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }\`}>
                {booking.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
`,
        },
      ];

    default:
      return [];
  }
}

// ============================================================================
// STRIPE FILES
// ============================================================================

function generateStripeFiles(): ScaffoldFile[] {
  return [
    {
      path: "lib/stripe.ts",
      label: "Stripe client initialization",
      content: `import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
});
`,
    },
    {
      path: "app/api/stripe/checkout/route.ts",
      label: "Stripe checkout session API",
      content: `import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { priceId, successUrl, cancelUrl } = await request.json();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || \`\${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}\`,
      cancel_url: cancelUrl || \`\${request.nextUrl.origin}/cancel\`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[Stripe] Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
`,
    },
    {
      path: "app/api/stripe/webhook/route.ts",
      label: "Stripe webhook handler",
      content: `import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Checkout completed:', event.data.object);
        break;
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object);
        break;
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object);
        break;
      default:
        console.log(\`Unhandled Stripe event: \${event.type}\`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 400 });
  }
}
`,
    },
  ];
}

// ============================================================================
// CONFIG FILES
// ============================================================================

function generateTailwindConfig(): ScaffoldFile {
  return {
    path: "tailwind.config.ts",
    label: "Tailwind CSS configuration",
    content: `import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`,
  };
}

function generateTsConfig(): ScaffoldFile {
  return {
    path: "tsconfig.json",
    label: "TypeScript configuration",
    content: `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`,
  };
}

function generatePackageJson(config: PublishConfig): ScaffoldFile {
  const deps: Record<string, string> = {
    next: "14.2.5",
    react: "^18.2.0",
    "react-dom": "^18.2.0",
  };

  const devDeps: Record<string, string> = {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    eslint: "^8",
    "eslint-config-next": "14.2.5",
    typescript: "^5",
    tailwindcss: "^3.4.1",
    postcss: "^8",
    autoprefixer: "^10",
  };

  // Conditional dependencies
  if (config.payments.stripe) {
    deps["stripe"] = "^16.0.0";
  }
  if (config.auth === "clerk") {
    deps["@clerk/nextjs"] = "^5.0.0";
  }
  if (config.auth === "nextauth" || config.auth === "l4yercak3-oauth") {
    deps["next-auth"] = "^4.24.0";
  }

  const packageJson = {
    name: config.repoName || config.appName.toLowerCase().replace(/\s+/g, "-"),
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint",
    },
    dependencies: deps,
    devDependencies: devDeps,
  };

  return {
    path: "package.json",
    label: "Package configuration",
    content: JSON.stringify(packageJson, null, 2),
  };
}

function generateEnvExample(envVars: EnvVarConfig[]): ScaffoldFile {
  const lines: string[] = [
    "# Environment Variables",
    "# Copy this file to .env.local and fill in your values",
    "",
  ];

  // Group by source
  const grouped = new Map<string, EnvVarConfig[]>();
  for (const v of envVars) {
    const group = grouped.get(v.source) || [];
    group.push(v);
    grouped.set(v.source, group);
  }

  for (const [source, vars] of grouped) {
    lines.push(`# ${source.toUpperCase()}`);
    for (const v of vars) {
      lines.push(`# ${v.description}${v.required ? " (required)" : ""}`);
      lines.push(`${v.key}=${v.defaultValue || ""}`);
    }
    lines.push("");
  }

  return {
    path: ".env.example",
    label: "Environment variables template",
    content: lines.join("\n"),
  };
}

function generateReadme(config: PublishConfig): ScaffoldFile {
  const categories = config.selectedCategories
    .map((id) => {
      const cat = API_CATEGORIES.find((c) => c.id === id);
      return cat ? `- ${cat.label}` : null;
    })
    .filter(Boolean)
    .join("\n");

  return {
    path: "README.md",
    label: "Project documentation",
    content: `# ${config.appName}

${config.description || "Built with l4yercak3 and v0.dev."}

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Copy \`.env.example\` to \`.env.local\` and fill in your values:
\`\`\`bash
cp .env.example .env.local
\`\`\`

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Platform Capabilities

This app is connected to the l4yercak3 platform with:

${categories}

## Architecture

**${config.architecture === "thin-client" ? "Thin Client" : config.architecture === "full-stack" ? "Full-Stack" : "Hybrid"}** — ${
      config.architecture === "thin-client"
        ? "All data operations go through the l4yercak3 platform API."
        : config.architecture === "full-stack"
          ? "Standalone app with its own database, synced via webhooks."
          : "l4yercak3 for auth/CRM, own database for domain data."
    }

## Deployment

Deploy to Vercel for the best Next.js experience:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
`,
  };
}

function generateGitignore(): ScaffoldFile {
  return {
    path: ".gitignore",
    label: "Git ignore rules",
    content: `# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryImportName(categoryId: string): string {
  const names: Record<string, string> = {
    forms: "fetchForms, submitForm, submitPublicForm",
    events: "fetchEvents, fetchEvent, createEvent",
    products: "fetchProducts, fetchProduct",
    crm: "fetchContacts, fetchContact, createContact",
    invoices: "fetchInvoices, createInvoice, sendInvoice",
    bookings: "fetchBookings, createBooking, fetchAvailability",
    tickets: "fetchTickets, fetchTicket",
  };
  return names[categoryId] || "";
}
