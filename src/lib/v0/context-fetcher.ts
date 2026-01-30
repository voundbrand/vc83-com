/**
 * v0 Context Fetcher
 *
 * Fetches organization context from Convex to inject into v0 prompts.
 * This enables v0 to generate code with real IDs and data from the user's LayerCake account.
 */

import type {
  V0PromptContext,
  OrganizationContext,
  EventContext,
  FormContext,
  ProductContext,
} from "./system-prompt";

// ============ Types ============

/** Options for fetching context */
export interface FetchContextOptions {
  /** Include events in context */
  includeEvents?: boolean;
  /** Include forms in context */
  includeForms?: boolean;
  /** Include products in context */
  includeProducts?: boolean;
  /** Maximum number of events to include */
  maxEvents?: number;
  /** Maximum number of forms to include */
  maxForms?: number;
  /** Maximum number of products to include */
  maxProducts?: number;
  /** Only include published events */
  publishedEventsOnly?: boolean;
  /** Only include active products */
  activeProductsOnly?: boolean;
}

const DEFAULT_OPTIONS: FetchContextOptions = {
  includeEvents: true,
  includeForms: true,
  includeProducts: true,
  maxEvents: 10,
  maxForms: 10,
  maxProducts: 20,
  publishedEventsOnly: true,
  activeProductsOnly: true,
};

// ============ Context Fetcher ============

/**
 * Fetch organization context from Convex for v0 prompt injection
 *
 * @param organizationId - The organization ID to fetch context for
 * @param convexUrl - The Convex HTTP Actions URL
 * @param apiKey - API key for authentication
 * @param options - Options for what context to fetch
 */
export async function fetchV0Context(
  organizationId: string,
  convexUrl: string,
  apiKey: string,
  options: FetchContextOptions = {}
): Promise<V0PromptContext> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // Fetch organization details
  const orgResponse = await fetch(`${convexUrl}/api/organizations/${organizationId}`, {
    headers,
  });

  if (!orgResponse.ok) {
    throw new Error(`Failed to fetch organization: ${orgResponse.statusText}`);
  }

  const orgData = await orgResponse.json();
  const organization: OrganizationContext = {
    id: orgData.id,
    name: orgData.name,
    website: orgData.website,
    industry: orgData.industry,
  };

  // Fetch events, forms, and products in parallel
  const [events, forms, products] = await Promise.all([
    opts.includeEvents ? fetchEvents(convexUrl, headers, organizationId, opts) : undefined,
    opts.includeForms ? fetchForms(convexUrl, headers, organizationId, opts) : undefined,
    opts.includeProducts ? fetchProducts(convexUrl, headers, organizationId, opts) : undefined,
  ]);

  return {
    organization,
    events,
    forms,
    products,
  };
}

/**
 * Fetch events for context
 */
async function fetchEvents(
  convexUrl: string,
  headers: Record<string, string>,
  organizationId: string,
  opts: FetchContextOptions
): Promise<EventContext[]> {
  const params = new URLSearchParams({
    organizationId,
    limit: String(opts.maxEvents || 10),
    ...(opts.publishedEventsOnly && { status: "published" }),
  });

  const response = await fetch(`${convexUrl}/api/events?${params}`, { headers });

  if (!response.ok) {
    console.warn(`Failed to fetch events: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return (data.items || []).map(
    (e: Record<string, unknown>): EventContext => ({
      id: e.id as string,
      name: e.name as string,
      startDate: e.startDate as string,
      endDate: e.endDate as string,
      location: e.location as string,
      status: e.status as string,
      ticketCount: (e.products as unknown[])?.length,
    })
  );
}

/**
 * Fetch forms for context
 */
async function fetchForms(
  convexUrl: string,
  headers: Record<string, string>,
  organizationId: string,
  opts: FetchContextOptions
): Promise<FormContext[]> {
  const params = new URLSearchParams({
    organizationId,
    limit: String(opts.maxForms || 10),
    status: "published",
  });

  const response = await fetch(`${convexUrl}/api/forms?${params}`, { headers });

  if (!response.ok) {
    console.warn(`Failed to fetch forms: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return (data.items || []).map(
    (f: Record<string, unknown>): FormContext => ({
      id: f.id as string,
      name: f.name as string,
      subtype: f.subtype as string,
      fieldCount: (f.fields as unknown[])?.length || 0,
      eventId: f.eventId as string | undefined,
    })
  );
}

/**
 * Fetch products for context
 */
async function fetchProducts(
  convexUrl: string,
  headers: Record<string, string>,
  organizationId: string,
  opts: FetchContextOptions
): Promise<ProductContext[]> {
  const params = new URLSearchParams({
    organizationId,
    limit: String(opts.maxProducts || 20),
    ...(opts.activeProductsOnly && { status: "active" }),
  });

  const response = await fetch(`${convexUrl}/api/products?${params}`, { headers });

  if (!response.ok) {
    console.warn(`Failed to fetch products: ${response.statusText}`);
    return [];
  }

  const data = await response.json();
  return (data.items || []).map(
    (p: Record<string, unknown>): ProductContext => ({
      id: p.id as string,
      name: p.name as string,
      priceInCents: p.priceInCents as number,
      category: p.category as string | undefined,
      eventId: p.eventId as string | undefined,
      status: p.status as string,
    })
  );
}

// ============ Mock Context (for testing) ============

/**
 * Generate mock context for testing v0 prompt generation
 */
export function createMockContext(overrides?: Partial<V0PromptContext>): V0PromptContext {
  return {
    organization: {
      id: "org_test123",
      name: "Acme Events Co.",
      website: "https://acme-events.com",
      industry: "Event Management",
    },
    events: [
      {
        id: "evt_tech2024",
        name: "Tech Conference 2024",
        startDate: "2024-06-15T09:00:00Z",
        endDate: "2024-06-17T18:00:00Z",
        location: "San Francisco, CA",
        status: "published",
        ticketCount: 3,
      },
      {
        id: "evt_workshop",
        name: "React Workshop",
        startDate: "2024-07-10T10:00:00Z",
        endDate: "2024-07-10T16:00:00Z",
        location: "Online",
        status: "published",
        ticketCount: 1,
      },
    ],
    forms: [
      {
        id: "form_registration",
        name: "Conference Registration",
        subtype: "registration",
        fieldCount: 8,
        eventId: "evt_tech2024",
      },
      {
        id: "form_feedback",
        name: "Post-Event Survey",
        subtype: "survey",
        fieldCount: 12,
      },
    ],
    products: [
      {
        id: "prod_early_bird",
        name: "Early Bird Ticket",
        priceInCents: 29900,
        category: "tickets",
        eventId: "evt_tech2024",
        status: "active",
      },
      {
        id: "prod_vip",
        name: "VIP Access",
        priceInCents: 59900,
        category: "tickets",
        eventId: "evt_tech2024",
        status: "active",
      },
      {
        id: "prod_workshop",
        name: "Workshop Seat",
        priceInCents: 14900,
        category: "tickets",
        eventId: "evt_workshop",
        status: "active",
      },
    ],
    ...overrides,
  };
}
