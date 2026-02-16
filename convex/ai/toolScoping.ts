/**
 * LAYERED TOOL SCOPING
 *
 * Resolves which tools an agent can use via a 4-layer filter:
 *   1. Platform blocked — globally removed tools
 *   2. Org — org-level allow/deny + integration-aware filtering
 *   3. Agent — profile presets + explicit allow/deny + autonomy
 *   4. Session — per-session overrides + channel restrictions
 *
 * Each layer can only REMOVE tools, never re-add them once filtered.
 * The only exception: `query_org_data` is always injected at the end.
 *
 * See: docs/agentic_system/implementation_plans/P1_LAYERED_TOOL_SCOPING.md
 */

import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

// ============================================================================
// TYPES
// ============================================================================

export interface ToolDefinition {
  name: string;
  readOnly?: boolean;
}

export interface ResolveActiveToolsParams {
  allTools: ToolDefinition[];
  platformBlocked: string[];
  orgEnabled: string[];
  orgDisabled: string[];
  connectedIntegrations: string[];
  agentProfile?: string;
  agentEnabled: string[];
  agentDisabled: string[];
  autonomyLevel: string;
  sessionDisabled: string[];
  channel: string;
}

// ============================================================================
// INTEGRATION REQUIREMENTS
// Tools that require a specific integration to be connected.
// If the integration isn't connected, the tool is auto-excluded.
// ============================================================================

export const INTEGRATION_REQUIREMENTS: Record<string, string> = {
  // Stripe (invoicing, payments, checkout)
  create_invoice: "stripe",
  send_invoice: "stripe",
  process_payment: "stripe",
  create_checkout_page: "stripe",
  publish_checkout: "stripe",

  // Resend (email)
  send_email_from_template: "resend",
  send_bulk_crm_email: "resend",

  // Unsplash (image search)
  search_unsplash_images: "unsplash",

  // ActiveCampaign
  activecampaign: "activecampaign",

  // Microsoft OAuth (contact sync)
  sync_contacts: "microsoft",
};

// ============================================================================
// TOOL PROFILES — Named presets mapped to agent subtypes
// ============================================================================

/**
 * "general" — ~25 common tools for a typical org agent
 * Covers CRM, events, products, forms, tickets, workflows, media, settings
 */
const GENERAL_PROFILE = [
  // Meta
  "request_feature",
  "check_oauth_connection",
  // Escalation
  "escalate_to_human",
  // CRM (read + write)
  "create_contact",
  "search_contacts",
  "update_contact",
  "tag_contacts",
  // Events
  "create_event",
  "list_events",
  "update_event",
  "register_attendee",
  // Products
  "create_product",
  "list_products",
  "set_product_price",
  "activate_product",
  "deactivate_product",
  // Forms
  "create_form",
  "list_forms",
  "get_form_responses",
  // Tickets
  "create_ticket",
  "update_ticket_status",
  "list_tickets",
  // Media
  "search_media",
  // Settings
  "update_organization_settings",
];

/**
 * "support" — customer support focused (~15 tools)
 * CRM lookup, tickets, knowledge queries, forms
 */
const SUPPORT_PROFILE = [
  "request_feature",
  "check_oauth_connection",
  "escalate_to_human",
  // CRM (read-heavy)
  "search_contacts",
  "update_contact",
  "tag_contacts",
  // Tickets
  "create_ticket",
  "update_ticket_status",
  "list_tickets",
  // Forms
  "list_forms",
  "get_form_responses",
  // Events (read)
  "list_events",
  // Products (read)
  "list_products",
  // Media (read)
  "search_media",
];

/**
 * "sales" — sales assistant focused (~20 tools)
 * CRM, invoicing, products, checkout, email
 */
const SALES_PROFILE = [
  "request_feature",
  "check_oauth_connection",
  "escalate_to_human",
  // CRM
  "create_contact",
  "search_contacts",
  "update_contact",
  "tag_contacts",
  "sync_contacts",
  "send_bulk_crm_email",
  // Products
  "create_product",
  "list_products",
  "set_product_price",
  "activate_product",
  // Invoicing/Payments
  "create_invoice",
  "send_invoice",
  "process_payment",
  "create_checkout_page",
  "publish_checkout",
  // Email
  "create_template",
  "send_email_from_template",
  // Events
  "list_events",
];

/**
 * "booking" — appointment/reservation focused (~14 tools)
 * Bookings, calendar events, contacts, workflows
 */
const BOOKING_PROFILE = [
  "request_feature",
  "check_oauth_connection",
  "escalate_to_human",
  // CRM
  "create_contact",
  "search_contacts",
  "update_contact",
  // Events/Bookings
  "create_event",
  "list_events",
  "update_event",
  "register_attendee",
  "manage_bookings",
  "configure_booking_workflow",
  // Forms
  "list_forms",
  "get_form_responses",
  // Products (read)
  "list_products",
];

/**
 * "readonly" — safe read-only tools for draft_only autonomy
 * Matches the existing PROTOTYPE_MODE_ALLOWED_TOOLS + a few more
 */
const READONLY_PROFILE = [
  "request_feature",
  "check_oauth_connection",
  "escalate_to_human",
  "search_contacts",
  "list_events",
  "list_products",
  "list_forms",
  "list_tickets",
  "list_workflows",
  "get_form_responses",
  "search_media",
  "search_unsplash_images",
  "get_interview_progress",
  "get_extracted_data",
];

export const TOOL_PROFILES: Record<string, string[]> = {
  general: GENERAL_PROFILE,
  support: SUPPORT_PROFILE,
  sales: SALES_PROFILE,
  booking: BOOKING_PROFILE,
  readonly: READONLY_PROFILE,
  admin: ["*"], // all tools — no profile filtering
};

// ============================================================================
// SUBTYPE → DEFAULT PROFILE
// ============================================================================

export const SUBTYPE_DEFAULT_PROFILES: Record<string, string> = {
  system: "admin",
  general: "general",
  customer_support: "support",
  sales_assistant: "sales",
  booking_agent: "booking",
};

// ============================================================================
// CHANNEL-SPECIFIC TOOL RESTRICTIONS
// Some tools make no sense on certain channels (e.g., media upload over SMS)
// ============================================================================

export const CHANNEL_TOOL_RESTRICTIONS: Record<string, string[]> = {
  sms: [
    "upload_media",
    "create_page",
    "publish_page",
    "generate_certificate",
    "search_unsplash_images",
  ],
  whatsapp: [
    "send_bulk_crm_email",
  ],
};

// ============================================================================
// PLATFORM BLOCKED TOOLS
// Globally blocked — never available to any agent.
// Currently empty; reserved for emergency kill switches.
// ============================================================================

export function getPlatformBlockedTools(): string[] {
  return [];
}

// ============================================================================
// READ-ONLY TOOL SET
// Tools that only read data and never mutate state.
// Used by draft_only autonomy mode.
// ============================================================================

export const READ_ONLY_TOOLS = new Set([
  "check_oauth_connection",
  "search_contacts",
  "list_events",
  "list_products",
  "list_forms",
  "list_tickets",
  "list_workflows",
  "get_form_responses",
  "search_media",
  "search_unsplash_images",
  "get_interview_progress",
  "get_extracted_data",
  "request_feature",
]);

// ============================================================================
// MAIN RESOLUTION FUNCTION
// ============================================================================

/**
 * Resolve the final set of active tools for a given agent + session context.
 *
 * Layers applied in order (each can only REMOVE, never re-add):
 *   1. Platform blocked
 *   2. Org enabled/disabled + integration filter
 *   3. Agent profile + explicit enabled/disabled + autonomy
 *   4. Session disabled + channel restrictions
 *
 * Always injects `query_org_data` at the end if not already present.
 */
export function resolveActiveTools(params: ResolveActiveToolsParams): ToolDefinition[] {
  let tools = [...params.allTools];

  // ── Layer 1: Platform blocked ──
  if (params.platformBlocked.length > 0) {
    const blocked = new Set(params.platformBlocked);
    tools = tools.filter(t => !blocked.has(t.name));
  }

  // ── Layer 2: Org-level allow/deny ──
  if (params.orgEnabled.length > 0) {
    const allowed = new Set(params.orgEnabled);
    tools = tools.filter(t => allowed.has(t.name));
  }
  if (params.orgDisabled.length > 0) {
    const blocked = new Set(params.orgDisabled);
    tools = tools.filter(t => !blocked.has(t.name));
  }

  // ── Layer 2b: Integration-aware filter ──
  // Remove tools whose required integration isn't connected
  tools = tools.filter(t => {
    const requiredIntegration = INTEGRATION_REQUIREMENTS[t.name];
    if (!requiredIntegration) return true; // no requirement → keep
    return params.connectedIntegrations.includes(requiredIntegration);
  });

  // ── Layer 3: Agent profile + explicit tools ──
  if (params.agentProfile && TOOL_PROFILES[params.agentProfile]) {
    const profile = TOOL_PROFILES[params.agentProfile];
    if (!profile.includes("*")) {
      const profileSet = new Set(profile);
      tools = tools.filter(t => profileSet.has(t.name));
    }
  }

  if (params.agentEnabled.length > 0) {
    const allowed = new Set(params.agentEnabled);
    tools = tools.filter(t => allowed.has(t.name));
  }
  if (params.agentDisabled.length > 0) {
    const blocked = new Set(params.agentDisabled);
    tools = tools.filter(t => !blocked.has(t.name));
  }

  // ── Layer 3b: Autonomy filter ──
  if (params.autonomyLevel === "draft_only") {
    tools = tools.filter(t => t.readOnly === true);
  }

  // ── Layer 4: Session overrides + channel restrictions ──
  if (params.sessionDisabled.length > 0) {
    const blocked = new Set(params.sessionDisabled);
    tools = tools.filter(t => !blocked.has(t.name));
  }

  const channelBlocked = CHANNEL_TOOL_RESTRICTIONS[params.channel] ?? [];
  if (channelBlocked.length > 0) {
    const blocked = new Set(channelBlocked);
    tools = tools.filter(t => !blocked.has(t.name));
  }

  // ── Always include universal read tool ──
  if (!tools.find(t => t.name === "query_org_data")) {
    const queryTool = params.allTools.find(t => t.name === "query_org_data");
    if (queryTool) tools.push(queryTool);
  }

  return tools;
}

// ============================================================================
// DB QUERY: GET CONNECTED INTEGRATIONS
// Returns the list of integration provider names connected by an org.
// Called from agentExecution (action) via ctx.runQuery().
// ============================================================================

export const getConnectedIntegrations = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const integrations: string[] = [];

    // 1. Check OAuth connections (Microsoft, Google, etc.)
    const oauthConnections = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "oauth_connection")
      )
      .collect();

    for (const conn of oauthConnections) {
      const props = conn.customProperties as Record<string, unknown> | undefined;
      if (props?.status === "connected" && typeof props?.provider === "string") {
        integrations.push(props.provider);
      }
    }

    // 2. Check API key-based integrations via org settings objects
    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "organization_settings")
      )
      .collect();

    for (const setting of settings) {
      const props = setting.customProperties as Record<string, unknown> | undefined;
      if (!props) continue;

      // Stripe
      if (props.stripeSecretKey || props.stripeConnected) {
        if (!integrations.includes("stripe")) integrations.push("stripe");
      }

      // Resend
      if (props.resendApiKey || props.resendConnected) {
        if (!integrations.includes("resend")) integrations.push("resend");
      }
    }

    // 3. Unsplash — available if platform has the API key (global, not per-org)
    if (process.env.UNSPLASH_ACCESS_KEY) {
      integrations.push("unsplash");
    }

    // 4. ActiveCampaign — check for org-level AC connection
    const acConnections = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("type", "activecampaign_connection")
      )
      .first();

    if (acConnections) {
      const acProps = acConnections.customProperties as Record<string, unknown> | undefined;
      if (acProps?.status === "connected" || acProps?.apiKey) {
        integrations.push("activecampaign");
      }
    }

    return integrations;
  },
});
