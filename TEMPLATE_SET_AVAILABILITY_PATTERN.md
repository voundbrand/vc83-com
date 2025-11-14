# Template Set Availability Pattern

## Overview

Template Sets use an **availability ontology** for licensing control, following the same pattern as PDF templates, form templates, and checkout templates.

**Key Principle**: Template sets live ONLY in the system organization. Super admins control which organizations can access which template sets through the availability ontology.

## Architecture

```
┌─────────────────────────────────────────────┐
│       SYSTEM ORGANIZATION                    │
│  ┌─────────────────────────────────────┐   │
│  │  Template Set: "Professional"        │   │
│  │  - Ticket: Professional Template     │   │
│  │  - Invoice: B2B Single Invoice       │   │
│  │  - Email: Luxury Confirmation        │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  Template Set: "VIP Premium"         │   │
│  │  - Ticket: VIP Premium Template      │   │
│  │  - Invoice: B2B Detailed Invoice     │   │
│  │  - Email: VIP Exclusive              │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    │
                    │ Super Admin enables via
                    │ templateSetAvailability.enableTemplateSet()
                    ↓
┌─────────────────────────────────────────────┐
│       ORGANIZATION: "Acme Corp"              │
│  ┌─────────────────────────────────────┐   │
│  │  template_set_availability           │   │
│  │  - templateSetId: Professional       │   │
│  │  - available: true                   │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  Organization can now use "Professional"    │
│  template set in their checkouts/products   │
└─────────────────────────────────────────────┘
```

## How It Works

### 1. Template Sets Live in System Organization

All template sets are created in the system organization:

```bash
# Create system default template set
npx convex run seedTemplateSet:seedSystemDefaultSet
```

This creates:
- Type: `"template_set"`
- Organization: `system`
- Contains: ticket + invoice + email template IDs
- Status: `"active"`

### 2. Super Admins Grant Access

Super admins use the availability ontology to grant organizations access:

```typescript
// Enable a template set for an organization (super admin only)
await enableTemplateSet({
  sessionId,
  organizationId: "org_abc123",
  templateSetId: "set_xyz789",
  customSettings: {} // Optional custom settings
});
```

This creates an availability object:
- Type: `"template_set_availability"`
- Organization: `org_abc123` (the org getting access)
- customProperties:
  - `templateSetId`: `set_xyz789` (the system template set)
  - `available`: `true`
  - `enabledBy`: `userId`
  - `enabledAt`: `timestamp`

### 3. Organizations See Only Enabled Sets

When organizations query available template sets, they only see what's been enabled for them:

```typescript
// Get template sets available to this organization
const sets = await getAvailableTemplateSets({ organizationId });
// Returns only template sets with available=true for this org
```

The query:
1. Fetches all `template_set_availability` objects for the organization where `available === true`
2. Extracts the enabled template set IDs
3. Fetches those template sets from the system organization
4. Returns only the enabled sets

## Files

### Core Files

- **`convex/templateSetAvailability.ts`** - Availability ontology (enable/disable/list)
- **`convex/templateSetQueries.ts`** - Public queries filtered by availability
- **`convex/templateSetOntology.ts`** - CRUD operations for template sets
- **`convex/templateSetResolver.ts`** - Template precedence resolution
- **`convex/seedTemplateSet.ts`** - Seed system-level template sets

### UI Components

- **`src/components/template-set-selector.tsx`** - Dropdown for organizations (shows only available sets)
- **`src/components/window-content/checkout-window/create-checkout-tab.tsx`** - Uses template set selector
- **`src/components/window-content/products-window/product-form.tsx`** - Product-level template set override

## API Reference

### Super Admin Mutations

#### `enableTemplateSet`

Enable a template set for an organization (super admin only).

```typescript
await enableTemplateSet({
  sessionId: string,
  organizationId: Id<"organizations">,
  templateSetId: Id<"objects">,
  customSettings?: Record<string, any>
});
```

#### `disableTemplateSet`

Disable a template set for an organization (super admin only).

```typescript
await disableTemplateSet({
  sessionId: string,
  organizationId: Id<"organizations">,
  templateSetId: Id<"objects">
});
```

#### `listTemplateSetsWithAvailability`

List all system template sets with availability status for a specific organization (super admin only).

```typescript
const sets = await listTemplateSetsWithAvailability({
  sessionId: string,
  organizationId: Id<"organizations">
});
// Returns all system sets with availableForOrg: boolean field
```

### Public Queries

#### `getAvailableTemplateSets`

Get template sets available to an organization (no auth required - for UI).

```typescript
const sets = await getAvailableTemplateSets({
  organizationId: Id<"organizations">
});
// Returns only enabled template sets
```

## Seeding Process

### Step 1: Seed System Default Template Set

```bash
npx convex run seedTemplateSet:seedSystemDefaultSet
```

This creates a "System Default" template set in the system organization.

**Output:**
```
✅ System default template set created: q97f0z7w84v0nv9527xf9prw2h7vc4kx
   Ticket: Professional Event Ticket
   Invoice: B2B Single Invoice
   Email: Luxury Event Confirmation

⚠️  IMPORTANT: Super admins must enable this template set for organizations!
   Use templateSetAvailability.enableTemplateSet() mutation
```

### Step 2: Enable for Organizations (Super Admin)

Super admins must explicitly enable the template set for each organization via the UI or API:

```typescript
// Example: Enable system default for Acme Corp
await enableTemplateSet({
  sessionId,
  organizationId: acmeCorpId,
  templateSetId: systemDefaultSetId
});
```

### Step 3: Verify Access

Organizations can now see and use the template set:

```typescript
const sets = await getAvailableTemplateSets({ organizationId: acmeCorpId });
console.log(sets); // [{ name: "System Default", ... }]
```

## Migration Strategy

### For Existing Organizations

1. **Seed system default**: Run `seedSystemDefaultSet`
2. **Enable for each org**: Super admin enables system default for all existing organizations
3. **Update checkouts**: Existing checkouts continue to work (resolver falls back to organization default)
4. **Gradual adoption**: Organizations can optionally configure template sets when editing checkouts/products

### No Breaking Changes

- Template resolution still works without template sets (falls back to organization defaults)
- Existing individual template selections are still supported (legacy mode)
- Template Set is an optional enhancement, not a requirement

## Licensing Control Benefits

### 1. Centralized Management

Super admins control which template sets exist and who can access them.

### 2. Flexible Licensing

- Free tier: Enable basic template set
- Pro tier: Enable premium template sets
- Enterprise: Custom branded template sets

### 3. Audit Trail

All enable/disable actions are logged in `objectActions` with:
- `actionType`: "template_set_enabled" or "template_set_disabled"
- `performedBy`: userId
- `performedAt`: timestamp
- `actionData`: template set details

### 4. Gradual Rollout

Enable template sets for beta organizations first, then gradually roll out to all organizations.

## Comparison with Other Availability Ontologies

The template set availability pattern follows the exact same approach as:

- **`pdfTemplateAvailability.ts`** - PDF template licensing
- **`formTemplateAvailability.ts`** - Form template licensing
- **`checkoutTemplateAvailability.ts`** - Checkout template licensing

This consistency makes it familiar for admins and easy to maintain.

## Future Enhancements

### Super Admin UI

Create a Template Set Management window where super admins can:
- View all system template sets
- See which organizations have access to each set
- Bulk enable/disable template sets across multiple organizations
- Create new branded template sets
- Preview template sets

### Organization Analytics

Track template set usage:
- Which template sets are most popular
- Template set usage by organization
- Conversion metrics by template set

### Template Set Marketplace

Allow organizations to purchase additional template sets:
- Browse available template sets
- Request access (requires super admin approval)
- One-click enable for purchased sets

## Summary

The Template Set Availability Pattern provides:

✅ **Centralized licensing control** - Super admins decide who gets what
✅ **Consistent with existing patterns** - Follows PDF/form/checkout template model
✅ **Audit trail** - All enable/disable actions are logged
✅ **Gradual rollout** - Enable for specific organizations first
✅ **No breaking changes** - Existing templates still work
✅ **Flexible pricing tiers** - Different sets for different subscription levels

Organizations only see template sets that super admins have explicitly enabled for them.
