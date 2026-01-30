/**
 * API ENDPOINT CATALOG
 *
 * Static catalog of platform API capabilities that v0-generated apps
 * can connect to. Each category maps to real /api/v1/ endpoints
 * and their required scopes.
 *
 * Used by the V0ConnectionPanel to let users select which
 * platform features their app needs access to.
 */

export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
}

export interface ApiCategory {
  /** Unique category identifier */
  id: string;
  /** Display label */
  label: string;
  /** Short description of what this category enables */
  description: string;
  /** Lucide icon name */
  icon: string;
  /** API key scopes required for this category */
  scopes: string[];
  /** Available endpoints in this category */
  endpoints: ApiEndpoint[];
}

/**
 * All available API categories.
 * Each maps directly to existing /api/v1/ endpoints.
 */
export const API_CATEGORIES: ApiCategory[] = [
  {
    id: "forms",
    label: "Forms & Submissions",
    description: "Create forms, collect submissions, and manage form responses",
    icon: "FileText",
    scopes: ["forms:read", "forms:write"],
    endpoints: [
      { method: "GET", path: "/api/v1/forms", description: "List all forms" },
      { method: "POST", path: "/api/v1/forms", description: "Create a new form" },
      { method: "GET", path: "/api/v1/forms/{formId}", description: "Get form details" },
      { method: "GET", path: "/api/v1/forms/{formId}/responses", description: "Get form responses" },
      { method: "POST", path: "/api/v1/forms/{formId}/responses", description: "Submit a form response" },
      { method: "POST", path: "/api/v1/forms/public/{formId}/submit", description: "Public form submission" },
    ],
  },
  {
    id: "crm",
    label: "CRM & Contacts",
    description: "Create and manage contacts, link to events, and track relationships",
    icon: "Users",
    scopes: ["contacts:read", "contacts:write"],
    endpoints: [
      { method: "GET", path: "/api/v1/crm/contacts", description: "List contacts" },
      { method: "POST", path: "/api/v1/crm/contacts", description: "Create a contact" },
      { method: "GET", path: "/api/v1/crm/contacts/{contactId}", description: "Get contact details" },
      { method: "POST", path: "/api/v1/crm/contacts/from-event", description: "Create contact from event registration" },
    ],
  },
  {
    id: "events",
    label: "Events & Ticketing",
    description: "Manage events, ticket types, and attendee registrations",
    icon: "Calendar",
    scopes: ["events:read", "events:write"],
    endpoints: [
      { method: "GET", path: "/api/v1/events", description: "List events" },
      { method: "POST", path: "/api/v1/events", description: "Create an event" },
      { method: "GET", path: "/api/v1/events/{eventId}", description: "Get event details" },
      { method: "PUT", path: "/api/v1/events/{eventId}", description: "Update an event" },
    ],
  },
  {
    id: "products",
    label: "Products & Pricing",
    description: "Manage products, pricing tiers, and inventory",
    icon: "ShoppingBag",
    scopes: ["products:read", "products:write"],
    endpoints: [
      { method: "GET", path: "/api/v1/products", description: "List products" },
      { method: "POST", path: "/api/v1/products", description: "Create a product" },
      { method: "GET", path: "/api/v1/products/{productId}", description: "Get product details" },
      { method: "PUT", path: "/api/v1/products/{productId}", description: "Update a product" },
    ],
  },
  {
    id: "workflows",
    label: "Workflows & Automation",
    description: "Trigger workflows and automate actions based on events",
    icon: "Zap",
    scopes: ["workflows:trigger", "workflows:write"],
    endpoints: [
      { method: "POST", path: "/api/v1/workflows/trigger", description: "Trigger a workflow" },
    ],
  },
  {
    id: "invoices",
    label: "Invoicing & Payments",
    description: "Create invoices, track payments, and manage billing",
    icon: "Receipt",
    scopes: ["invoices:read", "invoices:write"],
    endpoints: [
      { method: "GET", path: "/api/v1/invoices", description: "List invoices" },
      { method: "POST", path: "/api/v1/invoices", description: "Create an invoice" },
      { method: "GET", path: "/api/v1/invoices/{invoiceId}", description: "Get invoice details" },
      { method: "POST", path: "/api/v1/invoices/{invoiceId}/send", description: "Send an invoice" },
    ],
  },
  {
    id: "tickets",
    label: "Tickets & Check-in",
    description: "Manage ticket types, purchases, and check-in status",
    icon: "Ticket",
    scopes: ["tickets:read", "tickets:write"],
    endpoints: [
      { method: "GET", path: "/api/v1/tickets", description: "List tickets" },
      { method: "POST", path: "/api/v1/tickets", description: "Create a ticket type" },
      { method: "GET", path: "/api/v1/tickets/{ticketId}", description: "Get ticket details" },
      { method: "PUT", path: "/api/v1/tickets/{ticketId}", description: "Update a ticket" },
    ],
  },
  {
    id: "bookings",
    label: "Bookings & Availability",
    description: "Manage resource bookings, availability slots, and scheduling",
    icon: "CalendarCheck",
    scopes: ["bookings:read", "bookings:write", "availability:read", "availability:write"],
    endpoints: [
      { method: "GET", path: "/api/v1/bookings", description: "List bookings" },
      { method: "POST", path: "/api/v1/bookings", description: "Create a booking" },
      { method: "GET", path: "/api/v1/availability", description: "Get availability slots" },
      { method: "POST", path: "/api/v1/availability", description: "Create availability" },
    ],
  },
];

/**
 * Get all scopes needed for a set of selected category IDs
 */
export function getScopesForCategories(categoryIds: string[]): string[] {
  const scopes = new Set<string>();
  for (const id of categoryIds) {
    const category = API_CATEGORIES.find((c) => c.id === id);
    if (category) {
      category.scopes.forEach((s) => scopes.add(s));
    }
  }
  return Array.from(scopes);
}

/**
 * Base URL for the platform API
 */
export const PLATFORM_API_BASE_URL = "https://agreeable-lion-828.convex.site";
