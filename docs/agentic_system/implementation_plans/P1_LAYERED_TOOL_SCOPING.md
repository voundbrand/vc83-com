# P1: Layered Tool Scoping

> Priority: HIGH | Estimated complexity: Medium | Files touched: 3-4

---

## Problem Statement

`enabledTools=[]` means ALL 63 tools are available. New agents get instant access to `create_invoice`, `process_payment`, `send_bulk_crm_email` — even if the org hasn't configured Stripe or Resend. Flat scoping with no platform/org/integration awareness.

---

## Deliverables

1. **Integration-aware filtering** — auto-exclude tools for unconnected services
2. **Tool profiles** — named presets mapped to agent subtypes
3. **4-layer resolution** — platform → org → agent → session
4. **Subtype defaults** — new agents get appropriate profile based on type
5. **Channel restrictions** — some tools unavailable on certain channels

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/ai/agentExecution.ts` | Replace step 7 with layered resolution |
| `convex/ai/tools/registry.ts` | Add `readOnly` flag to tool definitions |
| `convex/agentOntology.ts` | Add `toolProfile` to agent config, apply defaults on bootstrap |

## New Files

| File | Purpose |
|------|---------|
| `convex/ai/toolScoping.ts` | Resolution algorithm, profiles, integration requirements, channel restrictions |

---

## Implementation Steps

### Step 1: Create tool scoping module (`convex/ai/toolScoping.ts`)

```typescript
// Integration requirements
export const INTEGRATION_REQUIREMENTS: Record<string, string> = {
  create_invoice: "stripe",
  send_invoice: "stripe",
  process_payment: "stripe",
  create_checkout_page: "stripe",
  publish_checkout: "stripe",
  send_email_from_template: "resend",
  send_bulk_crm_email: "resend",
  search_unsplash_images: "unsplash",
};

// Tool profiles (named presets)
export const TOOL_PROFILES: Record<string, string[]> = {
  general: [ /* ~25 common tools */ ],
  support: [ /* ~12 support-focused tools */ ],
  sales: [ /* ~18 sales-focused tools */ ],
  booking: [ /* ~12 booking-focused tools */ ],
  readonly: [ /* ~12 read-only tools */ ],
  admin: ["*"],  // all tools
};

// Subtype → profile mapping
export const SUBTYPE_DEFAULT_PROFILES: Record<string, string> = {
  system: "admin",
  general: "general",
  customer_support: "support",
  sales_assistant: "sales",
  booking_agent: "booking",
};

// Channel restrictions
export const CHANNEL_TOOL_RESTRICTIONS: Record<string, string[]> = {
  sms: ["upload_media", "create_page", "publish_page", "generate_certificate", "search_unsplash_images"],
  whatsapp: ["send_bulk_crm_email"],
};

// Main resolution function
export function resolveActiveTools(params: {
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
}): ToolDefinition[] {
  let tools = params.allTools;

  // Layer 1: Platform blocked
  tools = tools.filter(t => !params.platformBlocked.includes(t.name));

  // Layer 2: Org
  if (params.orgEnabled.length > 0) {
    tools = tools.filter(t => params.orgEnabled.includes(t.name));
  }
  tools = tools.filter(t => !params.orgDisabled.includes(t.name));

  // Layer 2b: Integration filter
  tools = tools.filter(t => {
    const req = INTEGRATION_REQUIREMENTS[t.name];
    return !req || params.connectedIntegrations.includes(req);
  });

  // Layer 3: Agent profile + explicit
  if (params.agentProfile && TOOL_PROFILES[params.agentProfile]) {
    const profile = TOOL_PROFILES[params.agentProfile];
    if (!profile.includes("*")) {
      tools = tools.filter(t => profile.includes(t.name));
    }
  }
  if (params.agentEnabled.length > 0) {
    tools = tools.filter(t => params.agentEnabled.includes(t.name));
  }
  tools = tools.filter(t => !params.agentDisabled.includes(t.name));

  // Layer 3b: Autonomy
  if (params.autonomyLevel === "draft_only") {
    tools = tools.filter(t => t.readOnly === true);
  }

  // Layer 4: Session + channel
  tools = tools.filter(t => !params.sessionDisabled.includes(t.name));
  const channelBlocked = CHANNEL_TOOL_RESTRICTIONS[params.channel] ?? [];
  tools = tools.filter(t => !channelBlocked.includes(t.name));

  // Always include universal read tool
  if (!tools.find(t => t.name === "query_org_data")) {
    const queryTool = params.allTools.find(t => t.name === "query_org_data");
    if (queryTool) tools.push(queryTool);
  }

  return tools;
}
```

### Step 2: Add `readOnly` flag to tool registry

In `convex/ai/tools/registry.ts`, tag read-only tools:

```typescript
// Add readOnly: true to these tools:
const READ_ONLY_TOOLS = new Set([
  "query_org_data", "search_contacts", "list_events", "list_products",
  "list_tickets", "list_forms", "list_workflows", "get_form_responses",
  "search_media", "check_oauth_connection", "get_interview_progress",
  "get_extracted_data",
]);

// During tool registration
tools.forEach(tool => {
  tool.readOnly = READ_ONLY_TOOLS.has(tool.name);
});
```

### Step 3: Replace step 7 in `agentExecution.ts`

```typescript
// BEFORE: Flat filtering
if (config.enabledTools.length > 0) {
  schemas = schemas.filter(s => enabledTools.has(s.name));
}

// AFTER: Layered resolution
const connectedIntegrations = await getConnectedIntegrations(ctx, orgId);
const activeTools = resolveActiveTools({
  allTools: getAllToolDefinitions(),
  platformBlocked: getPlatformBlockedTools(),
  orgEnabled: orgSettings.enabledTools ?? [],
  orgDisabled: orgSettings.disabledTools ?? [],
  connectedIntegrations,
  agentProfile: config.toolProfile,
  agentEnabled: config.enabledTools ?? [],
  agentDisabled: config.disabledTools ?? [],
  autonomyLevel: config.autonomyLevel,
  sessionDisabled: session.disabledForSession ?? [],
  channel: session.channel,
});
```

### Step 4: Apply defaults on agent bootstrap

In `convex/agentOntology.ts` or `completeOnboarding.ts`:

```typescript
// When creating new agent
const defaultProfile = SUBTYPE_DEFAULT_PROFILES[agentSubtype] ?? "general";
agentConfig.toolProfile = defaultProfile;
agentConfig.enabledTools = []; // profile handles filtering
```

### Step 5: Add `getConnectedIntegrations` helper

```typescript
async function getConnectedIntegrations(ctx, orgId): Promise<string[]> {
  const integrations: string[] = [];

  // Check OAuth connections
  const oauthConnections = await ctx.db.query("objects")
    .withIndex("by_org_type", q =>
      q.eq("organizationId", orgId).eq("type", "oauth_connection")
    )
    .filter(q => q.eq(q.field("customProperties.status"), "connected"))
    .collect();

  for (const conn of oauthConnections) {
    integrations.push(conn.customProperties.provider);
  }

  // Check API key-based integrations via env/settings
  const settings = await getOrgSettings(ctx, orgId);
  if (settings?.stripeSecretKey || settings?.stripeConnected) integrations.push("stripe");
  if (settings?.resendApiKey || settings?.resendConnected) integrations.push("resend");

  return integrations;
}
```

---

## Migration

### Existing Agents

- Agents with `enabledTools=[]` (all tools) get `toolProfile: "general"` — this restricts to ~25 tools instead of 63
- Agents with explicit `enabledTools` keep their existing list — profile is secondary
- This IS a behavioral change — agents lose tools they currently have. But the "lost" tools are for unconfigured services, so they'd fail anyway.

### Rollback

If profile defaults cause issues, set `toolProfile: "admin"` on affected agents — this restores all-tools behavior.

---

## Testing Strategy

1. **Unit test**: resolution algorithm with all 4 layers
2. **Unit test**: integration filter removes tools for unconnected services
3. **Unit test**: profile + explicit enabledTools combine correctly
4. **Unit test**: draft_only mode only gets readOnly tools
5. **Unit test**: channel restrictions applied
6. **Integration test**: new agent bootstrapped with correct profile for subtype
7. **Integration test**: agent can't use Stripe tools when Stripe not connected

---

## Success Criteria

- [ ] New agents get subtype-appropriate tool profile (not all 63 tools)
- [ ] Tools for unconnected integrations are auto-excluded
- [ ] 4-layer resolution works (platform → org → agent → session)
- [ ] `readOnly` flag correctly identifies safe tools for draft_only mode
- [ ] Channel-specific restrictions applied (e.g., no media upload on SMS)
- [ ] Existing agents migrated with behavioral change communicated
