# Phase 4 Step 6: Agent Tools + Full Automation

## Goal

Wire all GHL capabilities into the agent tool registry so the agent can operate GHL autonomously. The agent gets a suite of GHL-specific tools — create contacts, send messages, move deals, book appointments — all accessible via natural language. This is the "aha" moment: the agent runs GHL for the business.

## Depends On

- Phase 4 Steps 1–5 (all GHL infrastructure)
- Agent tool registry (`convex/ai/tools/registry.ts`)
- Agent execution pipeline (`convex/ai/agentExecution.ts`)
- Agent harness context (`convex/ai/harness.ts`)

## What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| Tool registry with 30+ tools | Done | `convex/ai/tools/registry.ts` |
| Tool action pattern | Done | `convex/ai/tools/builderToolActions.ts` (reference) |
| Agent harness (injects context) | Done | `convex/ai/harness.ts` |
| Internal tool mutations pattern | Done | `convex/ai/tools/internalToolMutations.ts` |
| GHL contact sync | Step 2 | `convex/integrations/ghlSync.ts` |
| GHL conversations | Step 3 | `convex/integrations/ghlConversations.ts` |
| GHL opportunities | Step 4 | `convex/integrations/ghlOpportunities.ts` |
| GHL calendar | Step 5 | `convex/integrations/ghlCalendar.ts` |

## Agent Tools Overview

| Tool | Category | What It Does |
|------|----------|-------------|
| `ghl_search_contacts` | CRM | Search GHL contacts by name, email, phone, or tags |
| `ghl_create_contact` | CRM | Create a new contact in GHL (syncs to our ontology) |
| `ghl_update_contact` | CRM | Update contact fields in GHL |
| `ghl_add_tag` | CRM | Add a tag to a GHL contact |
| `ghl_send_sms` | Messaging | Send SMS to a contact via GHL |
| `ghl_send_email` | Messaging | Send email to a contact via GHL |
| `ghl_get_conversations` | Messaging | List recent conversations for a contact |
| `ghl_create_opportunity` | Pipeline | Create a deal in a GHL pipeline |
| `ghl_move_deal_stage` | Pipeline | Move a deal to a different pipeline stage |
| `ghl_update_deal_status` | Pipeline | Mark deal as won/lost/abandoned |
| `ghl_check_availability` | Calendar | Check available appointment slots |
| `ghl_book_appointment` | Calendar | Book an appointment for a contact |
| `ghl_reschedule_appointment` | Calendar | Reschedule an existing appointment |
| `ghl_cancel_appointment` | Calendar | Cancel an appointment |
| `ghl_get_pipelines` | Context | List available pipelines and stages |
| `ghl_get_calendars` | Context | List available calendars |

## Implementation

### 1. GHL Tool Definitions

**File:** `convex/ai/tools/ghlTools.ts` (new)

```typescript
import { ToolDefinition } from "./registry";

export const ghlTools: ToolDefinition[] = [
  // --- CRM Tools ---
  {
    name: "ghl_search_contacts",
    description: "Search for contacts in GoHighLevel CRM by name, email, phone, or tags. Returns matching contacts with their details.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query — name, email, phone number, or tag to search for",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default 10)",
        },
      },
      required: ["query"],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_create_contact",
    description: "Create a new contact in GoHighLevel. Provide at minimum a name and either email or phone.",
    parameters: {
      type: "object",
      properties: {
        firstName: { type: "string", description: "Contact's first name" },
        lastName: { type: "string", description: "Contact's last name" },
        email: { type: "string", description: "Contact's email address" },
        phone: { type: "string", description: "Contact's phone number (E.164 format preferred)" },
        companyName: { type: "string", description: "Company name" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to add to the contact",
        },
      },
      required: ["firstName"],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_update_contact",
    description: "Update an existing GHL contact's fields. Specify the contact by their GHL contact ID or email.",
    parameters: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "GHL contact ID" },
        email: { type: "string", description: "Email to identify the contact (if no contactId)" },
        updates: {
          type: "object",
          description: "Fields to update: firstName, lastName, email, phone, companyName, tags",
        },
      },
      required: [],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_add_tag",
    description: "Add one or more tags to a GHL contact.",
    parameters: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "GHL contact ID" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to add",
        },
      },
      required: ["contactId", "tags"],
    },
    category: "ghl",
    requiresAuth: true,
  },

  // --- Messaging Tools ---
  {
    name: "ghl_send_sms",
    description: "Send an SMS message to a contact via GoHighLevel. The contact must have a phone number.",
    parameters: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "GHL contact ID to send to" },
        message: { type: "string", description: "SMS message content (keep under 160 chars for single segment)" },
      },
      required: ["contactId", "message"],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_send_email",
    description: "Send an email to a contact via GoHighLevel. The contact must have an email address.",
    parameters: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "GHL contact ID to send to" },
        subject: { type: "string", description: "Email subject line" },
        body: { type: "string", description: "Email body content (supports HTML)" },
      },
      required: ["contactId", "subject", "body"],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_get_conversations",
    description: "Get recent conversations for a contact in GoHighLevel.",
    parameters: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "GHL contact ID" },
        limit: { type: "number", description: "Max conversations to return (default 5)" },
      },
      required: ["contactId"],
    },
    category: "ghl",
    requiresAuth: true,
  },

  // --- Pipeline Tools ---
  {
    name: "ghl_create_opportunity",
    description: "Create a new deal/opportunity in a GoHighLevel pipeline. Use ghl_get_pipelines first to see available pipelines and stages.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Deal name" },
        pipelineId: { type: "string", description: "Pipeline ID to add the deal to" },
        stageId: { type: "string", description: "Initial stage ID" },
        contactId: { type: "string", description: "GHL contact ID to associate" },
        monetaryValue: { type: "number", description: "Deal value in the location's currency" },
      },
      required: ["name", "pipelineId", "stageId", "contactId"],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_move_deal_stage",
    description: "Move a deal to a different stage in its pipeline. Use ghl_get_pipelines to see stage IDs.",
    parameters: {
      type: "object",
      properties: {
        opportunityId: { type: "string", description: "GHL opportunity ID" },
        stageId: { type: "string", description: "New stage ID to move to" },
      },
      required: ["opportunityId", "stageId"],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_update_deal_status",
    description: "Update a deal's status to open, won, lost, or abandoned.",
    parameters: {
      type: "object",
      properties: {
        opportunityId: { type: "string", description: "GHL opportunity ID" },
        status: {
          type: "string",
          enum: ["open", "won", "lost", "abandoned"],
          description: "New deal status",
        },
      },
      required: ["opportunityId", "status"],
    },
    category: "ghl",
    requiresAuth: true,
  },

  // --- Calendar Tools ---
  {
    name: "ghl_check_availability",
    description: "Check available appointment slots for a specific calendar and date range. Returns open time slots.",
    parameters: {
      type: "object",
      properties: {
        calendarId: { type: "string", description: "GHL calendar ID (use ghl_get_calendars to find)" },
        startDate: { type: "string", description: "Start date in ISO format (e.g., 2026-02-20)" },
        endDate: { type: "string", description: "End date in ISO format (e.g., 2026-02-21)" },
        timezone: { type: "string", description: "Timezone (default: Europe/Berlin)" },
      },
      required: ["calendarId", "startDate", "endDate"],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_book_appointment",
    description: "Book an appointment on a GHL calendar for a contact. Check availability first.",
    parameters: {
      type: "object",
      properties: {
        calendarId: { type: "string", description: "GHL calendar ID" },
        contactId: { type: "string", description: "GHL contact ID" },
        startTime: { type: "string", description: "Appointment start time in ISO format" },
        endTime: { type: "string", description: "Appointment end time in ISO format" },
        title: { type: "string", description: "Appointment title" },
        notes: { type: "string", description: "Notes for the appointment" },
      },
      required: ["calendarId", "contactId", "startTime", "endTime"],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_reschedule_appointment",
    description: "Reschedule an existing appointment to a new time.",
    parameters: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "GHL event/appointment ID" },
        startTime: { type: "string", description: "New start time in ISO format" },
        endTime: { type: "string", description: "New end time in ISO format" },
      },
      required: ["eventId", "startTime", "endTime"],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_cancel_appointment",
    description: "Cancel an existing appointment.",
    parameters: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "GHL event/appointment ID to cancel" },
      },
      required: ["eventId"],
    },
    category: "ghl",
    requiresAuth: true,
  },

  // --- Context Tools ---
  {
    name: "ghl_get_pipelines",
    description: "List all available GHL pipelines and their stages. Use this to know which pipeline and stage IDs to use when creating or moving deals.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    category: "ghl",
    requiresAuth: true,
  },
  {
    name: "ghl_get_calendars",
    description: "List all available GHL calendars. Use this to know which calendar IDs to use when booking appointments.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    category: "ghl",
    requiresAuth: true,
  },
];
```

### 2. GHL Tool Action Handlers

**File:** `convex/ai/tools/ghlToolActions.ts` (new)

```typescript
import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

/**
 * Execute a GHL tool call from the agent.
 * Routes to the appropriate GHL API operation.
 */
export const executeGhlTool = internalAction({
  args: {
    organizationId: v.id("organizations"),
    toolName: v.string(),
    toolArgs: v.any(),
  },
  handler: async (ctx, args) => {
    const { organizationId, toolName, toolArgs } = args;

    // Get access token (handles refresh automatically)
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId }
    );

    const conn = await ctx.runQuery(
      internal.integrations.ghl.getGhlConnectionInternal,
      { organizationId }
    );
    const locationId = (conn?.customProperties as any)?.locationId;

    switch (toolName) {
      // --- CRM ---
      case "ghl_search_contacts":
        return await searchContacts(accessToken, locationId, toolArgs);

      case "ghl_create_contact":
        return await createContact(accessToken, locationId, toolArgs);

      case "ghl_update_contact":
        return await updateContact(accessToken, toolArgs);

      case "ghl_add_tag":
        return await addTag(accessToken, toolArgs);

      // --- Messaging ---
      case "ghl_send_sms":
        return await sendMessage(accessToken, toolArgs, 1); // type 1 = SMS

      case "ghl_send_email":
        return await sendEmail(accessToken, toolArgs);

      case "ghl_get_conversations":
        return await getConversations(accessToken, locationId, toolArgs);

      // --- Pipeline ---
      case "ghl_create_opportunity":
        return await createOpportunity(ctx, accessToken, locationId, organizationId, toolArgs);

      case "ghl_move_deal_stage":
        return await moveDealStage(accessToken, toolArgs);

      case "ghl_update_deal_status":
        return await updateDealStatus(accessToken, toolArgs);

      // --- Calendar ---
      case "ghl_check_availability":
        return await ctx.runAction(
          internal.integrations.ghlCalendar.checkGhlAvailability,
          { organizationId, ...toolArgs }
        );

      case "ghl_book_appointment":
        return await ctx.runAction(
          internal.integrations.ghlCalendar.createGhlAppointment,
          { organizationId, ...toolArgs }
        );

      case "ghl_reschedule_appointment":
        return await ctx.runAction(
          internal.integrations.ghlCalendar.rescheduleGhlAppointment,
          { organizationId, ...toolArgs }
        );

      case "ghl_cancel_appointment":
        return await ctx.runAction(
          internal.integrations.ghlCalendar.cancelGhlAppointment,
          { organizationId, ...toolArgs }
        );

      // --- Context ---
      case "ghl_get_pipelines":
        return await ctx.runQuery(
          internal.integrations.ghlOpportunities.getGhlPipelines,
          { organizationId }
        );

      case "ghl_get_calendars":
        return await ctx.runQuery(
          internal.integrations.ghlCalendar.getGhlCalendars,
          { organizationId }
        );

      default:
        return { error: `Unknown GHL tool: ${toolName}` };
    }
  },
});

// --- Tool implementations ---

async function searchContacts(accessToken: string, locationId: string, args: any) {
  const params = new URLSearchParams({
    locationId,
    query: args.query,
    limit: String(args.limit || 10),
  });

  const res = await fetch(`${GHL_API_BASE}/contacts/?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Version: "2021-07-28" },
  });

  if (!res.ok) return { error: `Search failed: ${await res.text()}` };
  const data = await res.json();

  return {
    contacts: (data.contacts || []).map((c: any) => ({
      id: c.id,
      name: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
      email: c.email,
      phone: c.phone,
      company: c.companyName,
      tags: c.tags,
    })),
    total: data.meta?.total || data.contacts?.length || 0,
  };
}

async function createContact(accessToken: string, locationId: string, args: any) {
  const res = await fetch(`${GHL_API_BASE}/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({ ...args, locationId }),
  });

  if (!res.ok) return { error: `Create failed: ${await res.text()}` };
  const data = await res.json();
  return { success: true, contactId: data.contact?.id, name: `${args.firstName} ${args.lastName || ""}`.trim() };
}

async function updateContact(accessToken: string, args: any) {
  const { contactId, updates } = args;
  if (!contactId) return { error: "contactId is required" };

  const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) return { error: `Update failed: ${await res.text()}` };
  return { success: true };
}

async function addTag(accessToken: string, args: any) {
  const res = await fetch(`${GHL_API_BASE}/contacts/${args.contactId}/tags`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({ tags: args.tags }),
  });

  if (!res.ok) return { error: `Add tag failed: ${await res.text()}` };
  return { success: true, tags: args.tags };
}

async function sendMessage(accessToken: string, args: any, type: number) {
  const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({
      type,
      contactId: args.contactId,
      message: args.message,
    }),
  });

  if (!res.ok) return { error: `Send failed: ${await res.text()}` };
  const data = await res.json();
  return { success: true, messageId: data.messageId || data.id };
}

async function sendEmail(accessToken: string, args: any) {
  const res = await fetch(`${GHL_API_BASE}/conversations/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({
      type: 2, // Email
      contactId: args.contactId,
      subject: args.subject,
      message: args.body,
      html: args.body, // GHL accepts HTML in the html field
    }),
  });

  if (!res.ok) return { error: `Send email failed: ${await res.text()}` };
  const data = await res.json();
  return { success: true, messageId: data.messageId || data.id };
}

async function getConversations(accessToken: string, locationId: string, args: any) {
  const params = new URLSearchParams({
    locationId,
    contactId: args.contactId,
    limit: String(args.limit || 5),
  });

  const res = await fetch(`${GHL_API_BASE}/conversations/search?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Version: "2021-07-28" },
  });

  if (!res.ok) return { error: `Fetch conversations failed: ${await res.text()}` };
  const data = await res.json();

  return {
    conversations: (data.conversations || []).map((c: any) => ({
      id: c.id,
      type: c.type,
      lastMessageDate: c.lastMessageDate,
      lastMessageBody: c.lastMessageBody?.substring(0, 200),
      unreadCount: c.unreadCount,
    })),
  };
}

async function createOpportunity(ctx: any, accessToken: string, locationId: string, orgId: any, args: any) {
  const res = await fetch(`${GHL_API_BASE}/opportunities/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({
      ...args,
      locationId,
      status: "open",
    }),
  });

  if (!res.ok) return { error: `Create opportunity failed: ${await res.text()}` };
  const data = await res.json();
  return { success: true, opportunityId: data.opportunity?.id, name: args.name };
}

async function moveDealStage(accessToken: string, args: any) {
  const res = await fetch(`${GHL_API_BASE}/opportunities/${args.opportunityId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({ pipelineStageId: args.stageId }),
  });

  if (!res.ok) return { error: `Move stage failed: ${await res.text()}` };
  return { success: true };
}

async function updateDealStatus(accessToken: string, args: any) {
  const res = await fetch(`${GHL_API_BASE}/opportunities/${args.opportunityId}/status`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Version: "2021-07-28",
    },
    body: JSON.stringify({ status: args.status }),
  });

  if (!res.ok) return { error: `Update status failed: ${await res.text()}` };
  return { success: true, status: args.status };
}
```

### 3. Register Tools in Registry

**File:** `convex/ai/tools/registry.ts` (add)

```typescript
import { ghlTools } from "./ghlTools";

// In the tool registration section:
for (const tool of ghlTools) {
  registerTool(tool);
}
```

### 4. Agent Harness — GHL Context Injection

**File:** `convex/ai/harness.ts` (extend)

Add GHL context to the agent's system prompt when the org has GHL connected:

```typescript
// In buildAgentContext():
const ghlConnection = await ctx.runQuery(
  internal.integrations.ghl.checkGhlConnectionInternal,
  { organizationId }
);

if (ghlConnection?.connected) {
  context += `\n\n## GoHighLevel Integration (Connected)
- Location: ${ghlConnection.locationName}
- You have access to GHL tools for CRM, messaging, pipelines, and calendar.
- Use ghl_get_pipelines and ghl_get_calendars to discover available pipelines/stages and calendars before creating deals or booking appointments.
- When creating contacts, always include at least firstName and either email or phone.
- Use ghl_search_contacts before creating a contact to avoid duplicates.
- For SMS, keep messages under 160 characters for a single segment.
`;
}
```

### 5. Tool Availability Gating

Tools should only be available when GHL is connected for the org:

```typescript
// In getAvailableTools():
const ghlConnected = await checkGhlConnected(organizationId);

const tools = allRegisteredTools.filter((tool) => {
  if (tool.category === "ghl" && !ghlConnected) return false;
  return true;
});
```

## Files Summary

| File | Change | Risk |
|------|--------|------|
| `convex/ai/tools/ghlTools.ts` | **New** — 16 tool definitions | Low |
| `convex/ai/tools/ghlToolActions.ts` | **New** — tool execution handlers | Medium |
| `convex/ai/tools/registry.ts` | Register GHL tools | Low |
| `convex/ai/harness.ts` | Inject GHL context into agent prompt | Low |

## Verification

1. **Tool availability**: Connect GHL → agent gains 16 GHL tools. Disconnect → tools disappear.
2. **Search contacts**: "Find contacts named John" → agent uses `ghl_search_contacts`
3. **Create contact**: "Add Maria Garcia, maria@example.com" → creates in GHL + syncs to our ontology
4. **Send SMS**: "Text John about tomorrow's meeting" → sends SMS via GHL
5. **Send email**: "Email Maria the proposal" → sends email via GHL
6. **Create deal**: "Create a deal for Maria's website project, $5000" → deal in GHL pipeline
7. **Move deal**: "Move Maria's deal to the proposal stage" → updates GHL pipeline stage
8. **Book appointment**: "Book Maria for a consultation tomorrow at 2pm" → checks availability → books in GHL
9. **Natural language pipeline**: "What deals do we have in progress?" → agent queries + responds
10. **End-to-end flow**: Customer messages → agent responds → creates contact → creates deal → books appointment — all via GHL

## Agent Conversation Examples

```
Customer: "Hi, I'd like to book a consultation for next week"

Agent thinking:
  1. Search contacts → not found
  2. Ask for details → gets name + email
  3. ghl_create_contact(firstName: "Sarah", lastName: "Miller", email: "sarah@example.com")
  4. ghl_get_calendars() → finds "Consultations" calendar
  5. ghl_check_availability(calendarId: "cal_xyz", startDate: "2026-02-23", endDate: "2026-02-28")
  6. Offers 3 available slots to customer
  7. Customer picks Wednesday 10am
  8. ghl_book_appointment(calendarId: "cal_xyz", contactId: "contact_new", startTime: "2026-02-25T10:00:00", endTime: "2026-02-25T10:30:00", title: "Consultation - Sarah Miller")
  9. ghl_create_opportunity(name: "Sarah Miller - Consultation", pipelineId: "pip_main", stageId: "stage_new", contactId: "contact_new", monetaryValue: 0)
  10. Confirms booking to customer with details

Agent: "Great! I've booked you for Wednesday, February 25th at 10:00 AM.
You'll receive a confirmation shortly. Looking forward to meeting you, Sarah!"
```
