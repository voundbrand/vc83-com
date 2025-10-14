# Translation System Architecture

## Overview

L4YERCAK3.com uses a complete i18n (internationalization) system that supports:
- **Frontend UI translations** via `TranslationContext`
- **Backend ontology translations** via `translationResolver`
- **Missing translation detection** by showing keys instead of fallback values

## How It Works

### 1. Frontend Translation (UI)

Located in: `src/contexts/translation-context.tsx`

```tsx
// Usage in components
const { t, locale, setLocale } = useTranslation();

// Translate UI text
<h1>{t("settings.region.title")}</h1>

// Change language
setLocale("de"); // German
setLocale("en"); // English
```

**Key Features:**
- `t(key)` function looks up translation in real-time
- Returns the **key itself** if translation is missing (no fallback!)
- Persists locale to user preferences or localStorage
- Uses `api.ontologyTranslations.getAllTranslations` backend query

### 2. Backend Translation (Ontology Objects)

Located in: `convex/translationResolver.ts`

```typescript
// Usage in queries
import { translateObject, translateObjects } from "./translationResolver";

// Translate single object
const profile = await translateObject(ctx, profileObj, locale);

// Translate multiple objects (efficient batch)
const addresses = await translateObjects(ctx, addressArray, locale);
```

**Key Features:**
- Resolves translation keys in `name`, `description`, and `customProperties.*Key` fields
- Returns the **key itself** if translation is missing (for debugging!)
- Batch translation for efficiency
- Only translates strings matching pattern: `domain.type.id.field`

### 3. Translation Data Storage

Translations are stored in the `objects` table with:
- `type: "translation"`
- `locale: "en"` | `"de"` | `"pl"` etc.
- `name: "org.address.headquarters.name"` (the translation key)
- `value: "Headquarters"` (the translated text)
- `organizationId: system-org-id`

## Example: Address Translation

### Seed Data (with translation keys, NO fallbacks!)

```typescript
// In seedOntologyData.ts
await ctx.db.insert("objects", {
  organizationId: systemOrg._id,
  type: "address",
  subtype: "billing",
  name: "org.address.headquarters.nameKey", // ← Translation key
  description: "org.address.headquarters.descriptionKey", // ← Translation key
  status: "active",
  customProperties: {
    addressLine1: "123 Tech Street",
    city: "Berlin",
    country: "Germany",
    labelKey: "org.address.headquarters.labelKey" // ← Translation key
  },
  // ... other fields
});
```

### Translation Entries

```typescript
// English translations
{ name: "org.address.headquarters.nameKey", value: "Headquarters", locale: "en" }
{ name: "org.address.headquarters.labelKey", value: "Main Office", locale: "en" }

// German translations
{ name: "org.address.headquarters.nameKey", value: "Hauptsitz", locale: "de" }
{ name: "org.address.headquarters.labelKey", value: "Hauptbüro", locale: "de" }
```

### Query with Translation

```typescript
// In organizationOntology.ts
export const getOrganizationAddresses = query({
  args: {
    organizationId: v.id("organizations"),
    locale: v.optional(v.string())
  },
  handler: async (ctx, { organizationId, locale = "en" }) => {
    const addresses = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "address")
      )
      .collect();

    // ✅ Translate all addresses based on locale
    return await translateObjects(ctx, addresses, locale);
  }
});
```

### Result

**English (locale = "en"):**
```json
{
  "name": "Headquarters",
  "description": "Our main office location",
  "customProperties": {
    "labelKey": "org.address.headquarters.labelKey",
    "label": "Main Office"  // ← Resolved from labelKey!
  }
}
```

**German (locale = "de"):**
```json
{
  "name": "Hauptsitz",
  "description": "Unser Hauptbüro-Standort",
  "customProperties": {
    "labelKey": "org.address.headquarters.labelKey",
    "label": "Hauptbüro"  // ← Resolved from labelKey!
  }
}
```

**Missing Translation (locale = "pl"):**
```json
{
  "name": "org.address.headquarters.nameKey",  // ← Key shown if missing!
  "description": "org.address.headquarters.descriptionKey",
  "customProperties": {
    "labelKey": "org.address.headquarters.labelKey",
    "label": "org.address.headquarters.labelKey"  // ← Key shown!
  }
}
```

## Translation Key Naming Convention

Format: `domain.type.identifier.field`

Examples:
- `org.address.headquarters.name` - Organization address name
- `org.address.headquarters.label` - Organization address label
- `org.profile.tech-company.industry` - Organization profile industry
- `ui.settings.region.title` - UI text in settings
- `email.verification.subject` - Email subject line

## How to Add New Translations

### Step 1: Create translation keys in seed data

```typescript
// In seedOntologyData.ts or similar
await ctx.db.insert("objects", {
  type: "address",
  name: "org.address.warehouse.nameKey", // ← Translation key
  customProperties: {
    labelKey: "org.address.warehouse.labelKey" // ← Translation key
  }
});
```

### Step 2: Add translations for each locale

```typescript
// English
await ctx.db.insert("objects", {
  organizationId: systemOrg._id,
  type: "translation",
  locale: "en",
  name: "org.address.warehouse.nameKey",
  value: "Warehouse Location"
});

// German
await ctx.db.insert("objects", {
  organizationId: systemOrg._id,
  type: "translation",
  locale: "de",
  name: "org.address.warehouse.nameKey",
  value: "Lagerstandort"
});
```

## Backend Query Updates

All queries that return ontology objects should:
1. Accept optional `locale` parameter
2. Use `translateObject()` or `translateObjects()`
3. Default to `"en"` if no locale provided

```typescript
export const getMyData = query({
  args: {
    organizationId: v.id("organizations"),
    locale: v.optional(v.string())  // ← Add this!
  },
  handler: async (ctx, { organizationId, locale = "en" }) => {
    const data = await ctx.db.query("objects").collect();

    // ← Add translation!
    return await translateObjects(ctx, data, locale);
  }
});
```

## Frontend Integration

Update components to pass current locale to queries:

```tsx
// In your component
const { locale } = useTranslation();

// Pass locale to query
const addresses = useQuery(
  api.organizationOntology.getOrganizationAddresses,
  { organizationId: org._id, locale }
);
```

## Debugging Missing Translations

When a translation is missing, you'll see the **key** displayed in the UI:

```
// Instead of seeing fallback text:
"Headquarters"

// You see the key (easy to debug!):
"org.address.headquarters.nameKey"
```

This makes it immediately obvious which translations are missing!

## Visual Indicators (Future Enhancement)

You could add visual styling for missing translations:

```tsx
// In a component
function TranslatedText({ text }: { text: string }) {
  const isKey = /^[a-z]+\.[a-z]+\.[\w-]+\.[\w-]+$/i.test(text);

  return (
    <span className={isKey ? "text-red-500 italic" : ""}>
      {text}
    </span>
  );
}
```

## Benefits of This System

1. **No Hidden Missing Translations**: Keys are shown, not generic fallbacks
2. **Type-Safe**: TypeScript ensures correct usage
3. **Efficient**: Batch translation reduces database queries
4. **Flexible**: Easy to add new languages
5. **Debuggable**: Missing translations are immediately obvious
6. **Consistent**: Same pattern for UI and ontology translations

## Files Reference

- `src/contexts/translation-context.tsx` - Frontend translation context
- `convex/translationResolver.ts` - Backend translation helpers
- `convex/ontologyTranslations.ts` - Translation data queries
- `convex/organizationOntology.ts` - Example usage in queries
- `convex/seedOntologyData.ts` - Seed data with translation keys
