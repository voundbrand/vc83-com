# Tool Scoping

> Layered tool policies, integration-aware filtering, tool broker, and subtype defaults.

---

## Current State (Problems)

- **`enabledTools=[]` means ALL 63 tools.** A newly bootstrapped agent has access to everything — invoices, payments, bulk email, etc. — even if the org hasn't configured Stripe or Resend.
- **No integration awareness.** Tools are available regardless of whether the underlying service is connected.
- **Flat scoping.** Only agent-level `enabledTools[]` / `disabledTools[]`. No platform or org layer.
- **No subtype defaults.** A `booking_agent` gets the same tools as a `sales_assistant`.
- **Tool count affects LLM cost and accuracy.** 63 tools in the prompt = more tokens, more confusion, worse tool selection.

---

## Layered Tool Resolution

### The Four Layers

```
Layer 1: PLATFORM (l4yercak3 controls)
  ├── platformAllowedTools[]    → master list of ALL available tools
  ├── platformBlockedTools[]    → tools disabled globally (maintenance, broken, etc.)
  └── Managed via platform admin, not exposed to org owners

Layer 2: ORGANIZATION (org owner controls)
  ├── orgEnabledTools[]         → tools the org has chosen to enable
  ├── orgDisabledTools[]        → tools the org wants blocked for all agents
  └── integrationRequirements   → auto-filter: tool X requires integration Y

Layer 3: AGENT (per-agent config)
  ├── enabledTools[]            → agent's whitelist (empty = all org tools)
  ├── disabledTools[]           → agent-specific blocks
  ├── toolProfile               → named preset (e.g., "support", "sales")
  └── autonomyLevel + requireApprovalFor[]

Layer 4: SESSION (runtime)
  ├── disabledForSession[]      → tools disabled due to runtime errors
  ├── channelRestrictions       → some tools unavailable on certain channels
  └── Tool broker filtering     → intent-based narrowing (future)
```

### Resolution Algorithm

```typescript
function resolveActiveTools(
  platform: PlatformToolPolicy,
  org: OrgToolPolicy,
  agent: AgentToolConfig,
  session: SessionState,
): ToolDefinition[] {
  let tools = getAllToolDefinitions();

  // Layer 1: Platform filter
  if (platform.allowedTools.length > 0) {
    tools = tools.filter(t => platform.allowedTools.includes(t.name));
  }
  tools = tools.filter(t => !platform.blockedTools.includes(t.name));

  // Layer 2: Org filter
  if (org.enabledTools.length > 0) {
    tools = tools.filter(t => org.enabledTools.includes(t.name));
  }
  tools = tools.filter(t => !org.disabledTools.includes(t.name));

  // Layer 2b: Integration filter
  tools = tools.filter(t => {
    const requirement = org.integrationRequirements[t.name];
    if (!requirement) return true;  // no integration needed
    return org.connectedIntegrations.includes(requirement);
  });

  // Layer 3: Agent filter
  if (agent.toolProfile) {
    const profileTools = TOOL_PROFILES[agent.toolProfile];
    tools = tools.filter(t => profileTools.includes(t.name));
  }
  if (agent.enabledTools.length > 0) {
    tools = tools.filter(t => agent.enabledTools.includes(t.name));
  }
  tools = tools.filter(t => !agent.disabledTools.includes(t.name));

  // Layer 3b: Autonomy filter
  if (agent.autonomyLevel === "draft_only") {
    tools = tools.filter(t => t.readOnly === true);
  }

  // Layer 4: Session filter
  tools = tools.filter(t => !session.disabledForSession.includes(t.name));
  tools = tools.filter(t => !session.channelRestrictions[session.channel]?.blocked.includes(t.name));

  // Always include query_org_data (universal read tool)
  if (!tools.find(t => t.name === "query_org_data")) {
    tools.push(getToolDefinition("query_org_data"));
  }

  return tools;
}
```

---

## Integration Requirements

Tools that depend on external services should be auto-filtered when the service isn't connected.

```typescript
const INTEGRATION_REQUIREMENTS: Record<string, string> = {
  // Stripe
  "create_invoice": "stripe",
  "send_invoice": "stripe",
  "process_payment": "stripe",
  "create_checkout_page": "stripe",
  "publish_checkout": "stripe",

  // Email (Resend)
  "send_email_from_template": "resend",
  "send_bulk_crm_email": "resend",

  // WhatsApp (Meta Cloud API)
  // (handled by channel binding, not integration check)

  // Unsplash
  "search_unsplash_images": "unsplash",
};

// Check connected integrations
async function getConnectedIntegrations(ctx, orgId): Promise<string[]> {
  const connections = await ctx.db.query("objects")
    .withIndex("by_org_type", q =>
      q.eq("organizationId", orgId).eq("type", "oauth_connection")
    )
    .filter(q => q.eq(q.field("customProperties.status"), "connected"))
    .collect();

  const integrations = connections.map(c => c.customProperties.provider);

  // Also check for API key-based integrations
  const settings = await getOrgSettings(ctx, orgId);
  if (settings.stripeSecretKey) integrations.push("stripe");
  if (settings.resendApiKey) integrations.push("resend");
  if (settings.unsplashAccessKey) integrations.push("unsplash");

  return integrations;
}
```

---

## Tool Profiles (Named Presets)

Pre-defined tool subsets for common agent subtypes.

```typescript
const TOOL_PROFILES: Record<string, string[]> = {
  // General-purpose — everything except admin tools
  "general": [
    "query_org_data",
    // CRM
    "create_contact", "search_contacts", "update_contact", "tag_contacts",
    // Events
    "create_event", "list_events", "update_event", "register_attendee",
    // Products
    "create_product", "list_products", "set_product_price",
    "set_product_form", "activate_product", "deactivate_product",
    // Support
    "create_ticket", "update_ticket_status", "list_tickets",
    // Content
    "search_media", "create_template", "search_unsplash_images",
    // Meta
    "request_feature", "check_oauth_connection",
  ],

  // Customer support — focused on tickets, CRM, knowledge
  "support": [
    "query_org_data",
    "search_contacts", "update_contact", "tag_contacts",
    "create_ticket", "update_ticket_status", "list_tickets",
    "list_events",
    "list_products",
    "search_media",
    "request_feature",
  ],

  // Sales — CRM, products, invoicing, checkout
  "sales": [
    "query_org_data",
    "create_contact", "search_contacts", "update_contact", "tag_contacts",
    "manage_crm", "sync_contacts",
    "create_product", "list_products", "set_product_price",
    "create_invoice", "send_invoice",
    "create_checkout_page", "publish_checkout", "publish_all",
    "create_template", "send_email_from_template",
    "search_media", "search_unsplash_images",
    "request_feature",
  ],

  // Booking — events, scheduling, CRM
  "booking": [
    "query_org_data",
    "create_contact", "search_contacts", "update_contact",
    "create_event", "list_events", "update_event", "register_attendee",
    "manage_bookings", "configure_booking_workflow",
    "list_products",
    "search_media",
    "request_feature",
  ],

  // Read-only — safe for draft_only or new untrusted agents
  "readonly": [
    "query_org_data",
    "search_contacts",
    "list_events",
    "list_products",
    "list_tickets",
    "list_forms",
    "list_workflows",
    "get_form_responses",
    "search_media",
    "check_oauth_connection",
    "get_interview_progress",
    "get_extracted_data",
  ],

  // Admin — everything including settings
  "admin": [
    // All 63 tools
    "*",
  ],
};
```

### Subtype → Profile Mapping

```typescript
const SUBTYPE_DEFAULT_PROFILES: Record<string, string> = {
  "system": "admin",
  "general": "general",
  "customer_support": "support",
  "sales_assistant": "sales",
  "booking_agent": "booking",
};

// During bootstrap
function getDefaultToolProfile(agentSubtype: string): string {
  return SUBTYPE_DEFAULT_PROFILES[agentSubtype] ?? "general";
}
```

---

## Tool Broker (Future — P2)

A deterministic filter that narrows the tool set based on message intent, reducing LLM token cost and improving tool selection accuracy.

### Concept

Instead of sending 63 (or 30) tools to the LLM every call, the tool broker selects 10-15 relevant tools based on:
1. **Message intent** — what the customer is asking about
2. **Conversation context** — what tools were used recently
3. **Agent subtype** — what this agent specializes in
4. **Integration availability** — what services are connected

### Intent Classification

```typescript
const INTENT_TOOL_MAPPING: Record<string, string[]> = {
  "billing": ["create_invoice", "send_invoice", "process_payment", "query_org_data"],
  "scheduling": ["create_event", "list_events", "update_event", "register_attendee", "manage_bookings"],
  "support": ["create_ticket", "update_ticket_status", "list_tickets", "search_contacts"],
  "products": ["create_product", "list_products", "set_product_price", "search_media"],
  "contact": ["create_contact", "search_contacts", "update_contact", "tag_contacts"],
  "email": ["create_template", "send_email_from_template", "send_bulk_crm_email"],
  "general": [],  // falls through to full profile
};

// Simple keyword-based intent detection (no LLM needed)
function detectIntent(message: string): string[] {
  const intents: string[] = [];

  const patterns: Record<string, RegExp[]> = {
    billing: [/invoice/i, /payment/i, /charge/i, /refund/i, /billing/i, /price/i, /cost/i],
    scheduling: [/book/i, /schedule/i, /appointment/i, /event/i, /calendar/i, /meeting/i],
    support: [/ticket/i, /issue/i, /problem/i, /help/i, /broken/i, /not working/i],
    products: [/product/i, /item/i, /catalog/i, /inventory/i, /stock/i],
    contact: [/contact/i, /customer/i, /client/i, /lead/i, /subscriber/i],
    email: [/email/i, /newsletter/i, /campaign/i, /send.*message/i],
  };

  for (const [intent, regexes] of Object.entries(patterns)) {
    if (regexes.some(r => r.test(message))) {
      intents.push(intent);
    }
  }

  return intents.length > 0 ? intents : ["general"];
}
```

### Broker Flow

```typescript
function brokerTools(
  message: string,
  activeTools: ToolDefinition[],
  recentToolCalls: string[],
): ToolDefinition[] {
  const intents = detectIntent(message);

  // Get intent-specific tools
  let brokerSet = new Set<string>();
  for (const intent of intents) {
    const intentTools = INTENT_TOOL_MAPPING[intent] || [];
    intentTools.forEach(t => brokerSet.add(t));
  }

  // Always include recently used tools (conversation continuity)
  recentToolCalls.forEach(t => brokerSet.add(t));

  // Always include universal tools
  brokerSet.add("query_org_data");
  brokerSet.add("request_feature");

  // If "general" intent or too few tools, fall back to full set
  if (intents.includes("general") || brokerSet.size < 5) {
    return activeTools;
  }

  // Filter activeTools to broker set
  const brokered = activeTools.filter(t => brokerSet.has(t.name));

  // Ensure minimum tool count (don't over-filter)
  if (brokered.length < 5) {
    return activeTools;
  }

  return brokered;
}
```

### Benefits

| Metric | Without Broker | With Broker |
|--------|---------------|-------------|
| Tools per LLM call | 30-63 | 10-15 |
| Prompt tokens (tools) | ~8,000-15,000 | ~3,000-5,000 |
| Tool selection accuracy | ~85% | ~95% |
| Cost per message | Higher | Lower |

---

## Channel-Specific Tool Restrictions

Some tools don't make sense on certain channels.

```typescript
const CHANNEL_TOOL_RESTRICTIONS: Record<string, string[]> = {
  sms: [
    // SMS can't handle rich content
    "upload_media",
    "create_page",
    "publish_page",
    "generate_certificate",
    "search_unsplash_images",
  ],
  email: [
    // Email is async, real-time tools don't work
    "manage_bookings",  // real-time availability
  ],
  webchat: [],  // webchat can handle everything
  telegram: [], // telegram can handle everything
  whatsapp: [
    // WhatsApp has message template restrictions
    "send_bulk_crm_email",  // not applicable to WhatsApp
  ],
};
```

---

## Migration Plan

### Phase 1: Add integration filtering (P1)

Modify step 7 in `agentExecution.ts` to check connected integrations before including tools. This is the highest-impact change — prevents agents from offering tools for services that aren't set up.

### Phase 2: Add tool profiles + subtype defaults (P1)

Create `TOOL_PROFILES` constant. Map agent subtypes to default profiles during `bootstrapAgent`. Existing agents get `toolProfile: "general"` as migration default.

### Phase 3: Add platform/org tool policy layers (P1)

Add `platformToolPolicy` to platform config and `orgToolPolicy` to organization settings. Modify resolution to check all 4 layers.

### Phase 4: Add tool broker (P2)

Implement intent detection and broker filtering as an optional pipeline optimization. Feature-flagged per org initially.
