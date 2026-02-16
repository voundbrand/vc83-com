# Phase 4 Step 2: CRM Contact Sync (Bidirectional)

## Goal

Contacts flow seamlessly between GHL and our ontology. When a contact is created or updated in GHL, it appears in our system within seconds. When our agent creates or modifies a contact, it's reflected in GHL. No duplicates, no data loss, deterministic conflict resolution.

## Depends On

- Phase 4 Step 1 (OAuth Foundation) — authenticated GHL API access
- CRM ontology (`convex/crmOntology.ts`) — contact CRUD
- Existing contact schema in ontology

## What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| CRM contacts CRUD | Done | `convex/crmOntology.ts` |
| Ontology objects table with contact type | Done | `convex/schemas/ontologySchemas.ts` |
| GHL OAuth connection + token management | Step 1 | `convex/integrations/ghl.ts` |
| GHL webhook endpoint | Step 1 | `convex/http.ts` |

## Field Mapping

| Our Field | GHL Field | Direction | Notes |
|-----------|-----------|-----------|-------|
| `name` | `firstName` + `lastName` | Bidirectional | Split/join on sync |
| `email` | `email` | Bidirectional | Primary identifier for matching |
| `phone` | `phone` | Bidirectional | E.164 format |
| `customProperties.company` | `companyName` | Bidirectional | |
| `customProperties.address` | `address1`, `city`, `state`, `postalCode`, `country` | Bidirectional | Flatten/expand |
| `customProperties.ghlContactId` | `id` | Our → GHL lookup | Stored on our side |
| `customProperties.ghlLocationId` | `locationId` | Reference | Which GHL sub-account |
| `tags` | `tags` | Bidirectional | Array of strings |
| `customProperties.dnd` | `dnd` | GHL → Ours | Do-not-disturb status |
| `customProperties.source` | `source` | GHL → Ours | Lead source tracking |
| `status` | — | Internal only | Our lifecycle status |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INBOUND (GHL → Us)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GHL Webhook ─► /ghl-webhook ─► processGhlWebhook         │
│                                     │                       │
│                     ┌───────────────┼───────────────┐       │
│                     ▼               ▼               ▼       │
│              ContactCreate   ContactUpdate   ContactDelete  │
│                     │               │               │       │
│                     ▼               ▼               ▼       │
│              upsertFromGhl   updateFromGhl   markDeleted    │
│              (create in      (merge fields)  (soft delete)  │
│               ontology)                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    OUTBOUND (Us → GHL)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Agent creates/updates contact                              │
│         │                                                   │
│         ▼                                                   │
│  crmOntology.createContact / updateContact                  │
│         │                                                   │
│         ▼                                                   │
│  afterContactChange (internal action)                       │
│         │                                                   │
│         ├── Check: org has GHL connected?                   │
│         ├── Check: contact has ghlContactId?                │
│         │       YES → PATCH /contacts/{id}                  │
│         │       NO  → POST /contacts/ (create in GHL)      │
│         └── Store ghlContactId on our contact               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 RECONCILIATION (Periodic)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cron (every 15 min)                                        │
│         │                                                   │
│         ▼                                                   │
│  reconcileGhlContacts                                       │
│         │                                                   │
│         ├── GET /contacts/?locationId=xxx&startAfter=last   │
│         ├── For each: match by email/phone/ghlContactId     │
│         ├── Create missing, update stale                    │
│         └── Update lastReconciled timestamp                 │
└─────────────────────────────────────────────────────────────┘
```

## Conflict Resolution Strategy

| Scenario | Rule | Rationale |
|----------|------|-----------|
| Both sides changed same field | GHL wins (most recent timestamp) | GHL is the "system of record" for CRM data |
| Contact exists in GHL but not in ours | Create in our ontology | Initial sync / missed webhook |
| Contact exists in ours but not in GHL | Create in GHL (if org connected) | Agent-created contacts should appear in GHL |
| Contact deleted in GHL | Soft-delete in our system (mark inactive) | Preserve conversation history |
| Contact deleted in ours | Do NOT delete in GHL | Prevent accidental GHL data loss |
| Duplicate detection | Match by email (primary) → phone (secondary) → ghlContactId (definitive) | Deterministic dedup |

## Implementation

### 1. Webhook Event Router

**File:** `convex/integrations/ghl.ts` (extend)

```typescript
/**
 * Process incoming GHL webhooks.
 * Routes to appropriate handler based on event type.
 */
export const processGhlWebhook = internalAction({
  args: { payload: v.string() },
  handler: async (ctx, args) => {
    const event = JSON.parse(args.payload);
    const eventType = event.type;
    const locationId = event.locationId;

    // Resolve organization from GHL locationId
    const organizationId = await ctx.runQuery(
      internal.integrations.ghl.resolveOrgFromGhlLocation,
      { locationId }
    );

    if (!organizationId) {
      console.warn(`[GHL] No org found for locationId: ${locationId}`);
      return { status: "skipped", reason: "unknown_location" };
    }

    // Route by event type
    switch (eventType) {
      case "ContactCreate":
        return await ctx.runMutation(
          internal.integrations.ghlSync.upsertContactFromGhl,
          { organizationId, ghlContact: event }
        );

      case "ContactUpdate":
      case "ContactDndUpdate":
      case "ContactTagUpdate":
        return await ctx.runMutation(
          internal.integrations.ghlSync.updateContactFromGhl,
          { organizationId, ghlContact: event }
        );

      case "ContactDelete":
        return await ctx.runMutation(
          internal.integrations.ghlSync.softDeleteContactFromGhl,
          { organizationId, ghlContactId: event.id }
        );

      // Conversation events → Step 3
      case "InboundMessage":
      case "OutboundMessage":
        return await ctx.runAction(
          internal.integrations.ghlConversations.processGhlMessage,
          { organizationId, event }
        );

      // Opportunity events → Step 4
      case "OpportunityCreate":
      case "OpportunityUpdate":
      case "OpportunityStageUpdate":
      case "OpportunityStatusUpdate":
      case "OpportunityMonetaryValueUpdate":
      case "OpportunityDelete":
        return await ctx.runAction(
          internal.integrations.ghlOpportunities.processGhlOpportunityEvent,
          { organizationId, event }
        );

      // Appointment events → Step 5
      case "AppointmentCreate":
      case "AppointmentUpdate":
      case "AppointmentDelete":
        return await ctx.runAction(
          internal.integrations.ghlCalendar.processGhlAppointmentEvent,
          { organizationId, event }
        );

      // App lifecycle
      case "AppInstall":
        console.log(`[GHL] App installed for location: ${locationId}`);
        return { status: "logged" };

      case "AppUninstall":
        console.log(`[GHL] App uninstalled for location: ${locationId}`);
        await ctx.runMutation(internal.integrations.ghl.disconnectGhl, {
          organizationId,
        });
        return { status: "disconnected" };

      default:
        console.log(`[GHL] Unhandled event type: ${eventType}`);
        return { status: "skipped", reason: "unhandled_event" };
    }
  },
});

/**
 * Resolve our organizationId from a GHL locationId.
 */
export const resolveOrgFromGhlLocation = internalQuery({
  args: { locationId: v.string() },
  handler: async (ctx, args) => {
    const connections = await ctx.db
      .query("oauthConnections")
      .filter((q) => q.eq(q.field("provider"), "ghl"))
      .collect();

    const match = connections.find(
      (c) => (c.customProperties as any)?.locationId === args.locationId
    );

    return match?.organizationId || null;
  },
});
```

### 2. Contact Sync Mutations

**File:** `convex/integrations/ghlSync.ts` (new)

```typescript
import { v } from "convex/values";
import { internalMutation, internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Create or update a contact from a GHL webhook event.
 */
export const upsertContactFromGhl = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    ghlContact: v.any(),
  },
  handler: async (ctx, args) => {
    const { organizationId, ghlContact } = args;
    const ghlContactId = ghlContact.id || ghlContact.contactId;

    // Check if we already have this contact
    const existing = await findContactByGhlId(ctx, organizationId, ghlContactId);
    if (existing) {
      // Update instead of create
      return await updateContactFields(ctx, existing._id, ghlContact);
    }

    // Check for duplicate by email or phone
    const emailMatch = ghlContact.email
      ? await findContactByEmail(ctx, organizationId, ghlContact.email)
      : null;
    if (emailMatch) {
      // Link existing contact to GHL
      await ctx.db.patch(emailMatch._id, {
        customProperties: {
          ...(emailMatch.customProperties as Record<string, unknown>),
          ghlContactId,
          ghlLocationId: ghlContact.locationId,
        },
        updatedAt: Date.now(),
      });
      return { status: "linked", contactId: emailMatch._id };
    }

    // Create new contact
    const name = [ghlContact.firstName, ghlContact.lastName]
      .filter(Boolean)
      .join(" ") || "Unknown";

    const contactId = await ctx.db.insert("objects", {
      organizationId,
      type: "contact",
      name,
      status: "active",
      customProperties: {
        email: ghlContact.email || undefined,
        phone: ghlContact.phone || undefined,
        company: ghlContact.companyName || undefined,
        address: formatAddress(ghlContact),
        source: ghlContact.source || "ghl",
        tags: ghlContact.tags || [],
        dnd: ghlContact.dnd || false,
        ghlContactId,
        ghlLocationId: ghlContact.locationId,
        syncedFromGhl: true,
        lastGhlSync: Date.now(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { status: "created", contactId };
  },
});

/**
 * Update an existing contact from a GHL webhook event.
 */
export const updateContactFromGhl = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    ghlContact: v.any(),
  },
  handler: async (ctx, args) => {
    const ghlContactId = args.ghlContact.id || args.ghlContact.contactId;
    const existing = await findContactByGhlId(ctx, args.organizationId, ghlContactId);

    if (!existing) {
      // Contact not in our system yet — create it
      return await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: "contact",
        name: [args.ghlContact.firstName, args.ghlContact.lastName]
          .filter(Boolean).join(" ") || "Unknown",
        status: "active",
        customProperties: {
          email: args.ghlContact.email,
          phone: args.ghlContact.phone,
          ghlContactId,
          lastGhlSync: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return await updateContactFields(ctx, existing._id, args.ghlContact);
  },
});

/**
 * Soft-delete a contact when deleted in GHL.
 */
export const softDeleteContactFromGhl = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    ghlContactId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await findContactByGhlId(ctx, args.organizationId, args.ghlContactId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "inactive",
        customProperties: {
          ...(existing.customProperties as Record<string, unknown>),
          deletedInGhl: true,
          deletedInGhlAt: Date.now(),
        },
        updatedAt: Date.now(),
      });
    }
    return { status: "soft_deleted" };
  },
});

// --- Helper functions ---

async function findContactByGhlId(ctx: any, orgId: any, ghlContactId: string) {
  const contacts = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", orgId).eq("type", "contact")
    )
    .collect();

  return contacts.find(
    (c: any) => (c.customProperties as any)?.ghlContactId === ghlContactId
  ) || null;
}

async function findContactByEmail(ctx: any, orgId: any, email: string) {
  const contacts = await ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", orgId).eq("type", "contact")
    )
    .collect();

  return contacts.find(
    (c: any) => (c.customProperties as any)?.email?.toLowerCase() === email.toLowerCase()
  ) || null;
}

async function updateContactFields(ctx: any, contactId: any, ghlContact: any) {
  const existing = await ctx.db.get(contactId);
  if (!existing) return { status: "not_found" };

  const name = [ghlContact.firstName, ghlContact.lastName]
    .filter(Boolean).join(" ");

  await ctx.db.patch(contactId, {
    name: name || existing.name,
    customProperties: {
      ...(existing.customProperties as Record<string, unknown>),
      email: ghlContact.email || (existing.customProperties as any)?.email,
      phone: ghlContact.phone || (existing.customProperties as any)?.phone,
      company: ghlContact.companyName || (existing.customProperties as any)?.company,
      tags: ghlContact.tags || (existing.customProperties as any)?.tags,
      dnd: ghlContact.dnd ?? (existing.customProperties as any)?.dnd,
      lastGhlSync: Date.now(),
    },
    updatedAt: Date.now(),
  });

  return { status: "updated", contactId };
}

function formatAddress(ghlContact: any): string | undefined {
  const parts = [
    ghlContact.address1,
    ghlContact.city,
    ghlContact.state,
    ghlContact.postalCode,
    ghlContact.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : undefined;
}
```

### 3. Outbound Push (Our System → GHL)

**File:** `convex/integrations/ghlSync.ts` (add)

```typescript
/**
 * Push a contact to GHL after creation/update in our system.
 * Called by agent tools or CRM mutations.
 */
export const pushContactToGhl = internalAction({
  args: {
    organizationId: v.id("organizations"),
    contactId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    // Get GHL access token
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId: args.organizationId }
    );

    // Get our contact
    const contact = await ctx.runQuery(
      internal.integrations.ghlSync.getContactInternal,
      { contactId: args.contactId }
    );
    if (!contact) throw new Error("Contact not found");

    const cp = contact.customProperties as Record<string, any>;
    const ghlContactId = cp?.ghlContactId;

    // Get location ID
    const conn = await ctx.runQuery(
      internal.integrations.ghl.getGhlConnectionInternal,
      { organizationId: args.organizationId }
    );
    const locationId = (conn?.customProperties as any)?.locationId;

    // Split name into first + last
    const nameParts = (contact.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const ghlPayload = {
      firstName,
      lastName,
      email: cp?.email || undefined,
      phone: cp?.phone || undefined,
      companyName: cp?.company || undefined,
      tags: cp?.tags || [],
      locationId,
    };

    if (ghlContactId) {
      // UPDATE existing GHL contact
      const res = await fetch(
        `https://services.leadconnectorhq.com/contacts/${ghlContactId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify(ghlPayload),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`GHL contact update failed: ${err}`);
      }

      return { status: "updated", ghlContactId };
    } else {
      // CREATE new GHL contact
      const res = await fetch(
        "https://services.leadconnectorhq.com/contacts/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify(ghlPayload),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`GHL contact create failed: ${err}`);
      }

      const result = await res.json();
      const newGhlId = result.contact?.id;

      // Store GHL ID on our contact
      if (newGhlId) {
        await ctx.runMutation(
          internal.integrations.ghlSync.linkGhlContactId,
          { contactId: args.contactId, ghlContactId: newGhlId }
        );
      }

      return { status: "created", ghlContactId: newGhlId };
    }
  },
});

export const getContactInternal = internalQuery({
  args: { contactId: v.id("objects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contactId);
  },
});

export const linkGhlContactId = internalMutation({
  args: { contactId: v.id("objects"), ghlContactId: v.string() },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.contactId);
    if (contact) {
      await ctx.db.patch(args.contactId, {
        customProperties: {
          ...(contact.customProperties as Record<string, unknown>),
          ghlContactId: args.ghlContactId,
        },
        updatedAt: Date.now(),
      });
    }
  },
});
```

### 4. Periodic Reconciliation

**File:** `convex/integrations/ghlSync.ts` (add)

```typescript
/**
 * Periodic reconciliation to catch missed webhooks.
 * Fetches contacts modified since last sync.
 */
export const reconcileGhlContacts = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId: args.organizationId }
    );

    const conn = await ctx.runQuery(
      internal.integrations.ghl.getGhlConnectionInternal,
      { organizationId: args.organizationId }
    );
    const locationId = (conn?.customProperties as any)?.locationId;
    if (!locationId) return { status: "no_location" };

    // Fetch recently modified contacts (last 20 minutes to overlap with cron)
    const since = new Date(Date.now() - 20 * 60_000).toISOString();

    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&startAfter=${encodeURIComponent(since)}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
      }
    );

    if (!res.ok) {
      console.error(`[GHL Reconcile] Failed to fetch contacts: ${await res.text()}`);
      return { status: "error" };
    }

    const data = await res.json();
    const contacts = data.contacts || [];
    let synced = 0;

    for (const ghlContact of contacts) {
      await ctx.runMutation(
        internal.integrations.ghlSync.upsertContactFromGhl,
        { organizationId: args.organizationId, ghlContact }
      );
      synced++;
    }

    return { status: "reconciled", synced };
  },
});
```

### 5. Initial Sync (First Connection)

**File:** `convex/integrations/ghlSync.ts` (add)

```typescript
/**
 * Full initial sync when GHL is first connected.
 * Pulls all contacts from GHL into our ontology.
 * Called once after successful OAuth connection.
 */
export const initialGhlContactSync = internalAction({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const accessToken = await ctx.runAction(
      internal.integrations.ghl.getGhlAccessToken,
      { organizationId: args.organizationId }
    );

    const conn = await ctx.runQuery(
      internal.integrations.ghl.getGhlConnectionInternal,
      { organizationId: args.organizationId }
    );
    const locationId = (conn?.customProperties as any)?.locationId;

    let cursor: string | undefined;
    let totalSynced = 0;

    do {
      const url = new URL("https://services.leadconnectorhq.com/contacts/");
      url.searchParams.set("locationId", locationId);
      url.searchParams.set("limit", "100");
      if (cursor) url.searchParams.set("startAfterId", cursor);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: "2021-07-28",
        },
      });

      if (!res.ok) break;

      const data = await res.json();
      const contacts = data.contacts || [];

      for (const ghlContact of contacts) {
        await ctx.runMutation(
          internal.integrations.ghlSync.upsertContactFromGhl,
          { organizationId: args.organizationId, ghlContact: { ...ghlContact, locationId } }
        );
        totalSynced++;
      }

      cursor = data.meta?.nextPageUrl ? contacts[contacts.length - 1]?.id : undefined;
    } while (cursor);

    console.log(`[GHL] Initial contact sync complete: ${totalSynced} contacts for org ${args.organizationId}`);
    return { status: "complete", totalSynced };
  },
});
```

## Files Summary

| File | Change | Risk |
|------|--------|------|
| `convex/integrations/ghlSync.ts` | **New** — contact sync logic (inbound, outbound, reconciliation) | Medium |
| `convex/integrations/ghl.ts` | Extend with webhook router + org resolver | Low |
| `convex/crons.ts` | Add 15-min reconciliation cron | Low |

## Verification

1. **Inbound create**: Create contact in GHL → webhook fires → contact appears in our ontology with `ghlContactId`
2. **Inbound update**: Update contact email in GHL → our contact's email updates
3. **Inbound delete**: Delete contact in GHL → our contact status becomes "inactive"
4. **Outbound create**: Agent creates contact → `pushContactToGhl` → contact appears in GHL
5. **Outbound update**: Agent updates phone → change syncs to GHL
6. **Duplicate detection**: Create contact with existing email → links to existing record (no duplicate)
7. **Initial sync**: Connect GHL → all existing contacts imported
8. **Reconciliation**: Kill webhook temporarily → edit contact in GHL → reconciliation cron picks up the change
9. **Tag sync**: Add tag in GHL → tag appears in our customProperties
