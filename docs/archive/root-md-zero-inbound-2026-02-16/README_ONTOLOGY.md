# Ontology System - Developer Guide

## 🎯 What is the Ontology System?

The ontology system is a **universal data model** that replaces separate tables with a unified object-based approach. Instead of having 6+ translation tables, we now have:

- **1 `objects` table** - Stores ALL entities (translations, events, invoices, contacts, etc.)
- **1 `objectLinks` table** - Relationships between objects (like a graph)
- **1 `objectActions` table** - Audit trail of all actions

## 🌟 Key Benefits

### Before (Old Way)
```
systemTranslations
appTranslations
contentTranslations
translationNamespaces
translationKeys
supportedLocales
= 6 tables for translations alone
```

### After (New Way)
```
objects (type="translation", subtype="system|app|content")
= 1 table for ALL data types
```

**Benefits:**
- ✨ Add new data types without schema changes
- ✨ Flexible per-org customization (gravel road pattern)
- ✨ Powerful graph-based relationships
- ✨ Built-in audit trail
- ✨ Unified query patterns

---

## 📚 Core Concepts

### Objects

Every entity is an `object` with:
- `type` - What kind of thing it is ("translation", "event", "invoice")
- `subtype` - More specific classification ("system", "app", "content")
- `name` - Human-readable identifier
- `status` - Current state
- `customProperties` - Organization-specific fields (gravel road!)

**Example: Translation Object**
```javascript
{
  _id: "abc123",
  organizationId: "org_system",
  type: "translation",
  subtype: "system",
  name: "desktop.welcome-icon",
  value: "Welcome",
  locale: "en",
  status: "approved",
  customProperties: {
    namespace: "desktop",
    key: "welcome-icon"
  },
  createdBy: "user_123",
  createdAt: 1234567890,
  updatedAt: 1234567890
}
```

### Links

Links connect objects in meaningful ways:
- `fromObjectId` → `toObjectId`
- `linkType` - The relationship verb ("translates", "belongs_to", "registers_for")
- `properties` - Additional metadata about the relationship

**Example: Translation Link**
```javascript
{
  _id: "link_456",
  organizationId: "org_123",
  fromObjectId: "translation_abc",
  toObjectId: "event_xyz",
  linkType: "translates",
  properties: {
    fieldName: "description",
    locale: "de"
  },
  createdAt: 1234567890
}
```

### Actions

Actions provide audit trail:
- `objectId` - What was acted upon
- `actionType` - What happened ("approve", "publish", "view")
- `actionData` - Details about the change
- `performedBy` - Who did it
- `performedAt` - When it happened

---

## 🔧 How to Use It

### Query Objects

```typescript
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

// Get all translations of a specific type
const translations = useQuery(api.ontologyTranslations.getTranslations, {
  subtype: "system",
  locale: "en",
});

// Get objects of any type
const events = useQuery(api.ontologyHelpers.getObjects, {
  organizationId: currentOrg,
  type: "event",
  subtype: "podcast",
});
```

### Create Objects

```typescript
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";

const createObject = useMutation(api.ontologyHelpers.createObject);

// Create a translation
await createObject({
  sessionId: session._id,
  organizationId: orgId,
  type: "translation",
  subtype: "system",
  name: "desktop.new-icon",
  value: "New Item",
  locale: "en",
  status: "pending",
  customProperties: {
    namespace: "desktop",
    key: "new-icon"
  }
});

// Create an event (same pattern!)
await createObject({
  sessionId: session._id,
  organizationId: orgId,
  type: "event",
  subtype: "podcast",
  name: "Episode 42: The Answer",
  description: "...",
  status: "published",
  customProperties: {
    episodeNumber: 42,
    duration: 3600,
    publishedDate: Date.now()
  }
});
```

### Create Links

```typescript
// Link a translation to an event
const createLink = useMutation(api.ontologyHelpers.createLink);

await createLink({
  sessionId: session._id,
  organizationId: orgId,
  fromObjectId: translationId,
  toObjectId: eventId,
  linkType: "translates",
  properties: {
    fieldName: "description",
    locale: "de"
  }
});
```

### Query Links

```typescript
// Get all translations for an event
const linkedObjects = useQuery(api.ontologyHelpers.getLinkedObjects, {
  objectId: eventId,
  linkType: "translates",
  direction: "to" // Links pointing TO this event
});
```

---

## 🎨 Gravel Road Pattern

The `customProperties` field enables the "gravel road" pattern:

**Gravel** (Flexible): Organizations can add custom fields without schema changes

```javascript
// Organization A adds custom tracking
customProperties: {
  internalCode: "PROD-2024-001",
  costCenter: "Marketing"
}

// Organization B adds different fields
customProperties: {
  externalRef: "EXT-ABC-123",
  priority: "urgent"
}
```

**Pave** (Standardize): When a pattern emerges, promote to top-level field

```javascript
// If many orgs need "priority", add it to the schema
{
  type: "event",
  name: "...",
  priority: "urgent", // ← Promoted from customProperties
  customProperties: {
    // Other org-specific stuff
  }
}
```

---

## 🏗️ Common Patterns

### Pattern 1: Type-Specific Helpers

Instead of querying `objects` directly, create type-specific helpers:

```typescript
// convex/ontologyTranslations.ts
export const getTranslations = query({
  handler: async (ctx, args) => {
    // Query objects with type="translation"
    return ctx.db
      .query("objects")
      .withIndex("by_org_type_locale", ...)
      .filter(q => q.eq(q.field("type"), "translation"))
      .collect();
  }
});

// convex/events.ts (future)
export const getEvents = query({
  handler: async (ctx, args) => {
    // Query objects with type="event"
    return ctx.db
      .query("objects")
      .withIndex("by_org_type", ...)
      .filter(q => q.eq(q.field("type"), "event"))
      .collect();
  }
});
```

### Pattern 2: Status Workflows

Each type can have its own status workflow:

```typescript
// Translations: pending → approved
// Events: draft → published → archived
// Invoices: draft → sent → paid → closed

await updateObject({
  objectId: translationId,
  updates: {
    status: "approved"
  }
});
```

### Pattern 3: Search Across Types

```typescript
// Search all objects by name
const results = await ctx.db
  .query("objects")
  .withSearchIndex("search_by_name", q =>
    q.search("name", searchTerm)
  )
  .collect();

// Filter by type after search
const translations = results.filter(r => r.type === "translation");
const events = results.filter(r => r.type === "event");
```

---

## 📖 Migration from Old System

### Old Code
```typescript
// Get system translations
const translations = useQuery(api.translationQueries.getSystemTranslations, {
  locale: "en"
});
```

### New Code
```typescript
// Get system translations via ontology
const translations = useQuery(api.ontologyTranslations.getTranslations, {
  subtype: "system",
  locale: "en"
});
```

---

## 🚀 Adding New Data Types

Want to add a new entity type? **No schema changes needed!**

### Example: Adding "Contacts"

1. **Create type-specific helpers** (optional but recommended):

```typescript
// convex/contacts.ts
export const getContacts = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "contact")
      )
      .collect();
  }
});

export const createContact = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "contact",
      subtype: "customer",
      name: args.name,
      status: "active",
      customProperties: {
        email: args.email,
        phone: args.phone,
      },
      createdBy: session.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
});
```

2. **Use it in your UI**:

```typescript
const contacts = useQuery(api.contacts.getContacts, {
  organizationId: currentOrg
});
```

That's it! No schema migration, no database changes, no downtime. ✨

---

## 📊 Performance Considerations

### Indexes

The ontology schema includes these indexes:
- `by_org` - Fast org-scoped queries
- `by_org_type` - Fast type-scoped queries
- `by_org_type_subtype` - Fast subtype queries
- `by_org_type_locale` - Fast translation lookups
- `search_by_name` - Full-text search on names
- `search_by_value` - Full-text search on values

### Query Optimization

```typescript
// ✅ GOOD: Use indexes
ctx.db
  .query("objects")
  .withIndex("by_org_type", q =>
    q.eq("organizationId", orgId)
     .eq("type", "translation")
  )

// ❌ BAD: Full table scan
ctx.db
  .query("objects")
  .filter(q =>
    q.eq(q.field("organizationId"), orgId) &&
    q.eq(q.field("type"), "translation")
  )
```

---

## 🧪 Testing

See [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) for:
- How to deploy the ontology schema
- How to seed test data
- How to test queries
- Troubleshooting tips

---

## 📚 Further Reading

- [Clean Slate Implementation Guide](./.kiro/haffnet_features/008_clean_slate_ontology_implementation.md) - Full implementation details
- [Ontology Explained](./.kiro/haffnet_features/003_ontology_explained.md) - Deep dive into ontology concepts

---

**Last Updated**: 2025-10-07
**Status**: Production Ready ✅
