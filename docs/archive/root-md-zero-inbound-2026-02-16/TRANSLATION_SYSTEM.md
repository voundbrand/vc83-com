# Translation System Architecture

## Overview

l4yercak3.com uses a complete i18n (internationalization) system that supports:
- **Frontend UI translations** via `TranslationContext`
- **Backend ontology translations** via `translationResolver`
- **Namespace-based lazy loading** to avoid Convex 1024 field limit
- **Missing translation detection** by showing keys instead of fallback values

## 🚨 IMPORTANT: Namespace-Based Loading (NEW!)

As of the latest update, we've moved from loading all translations at once to **namespace-based lazy loading**. This solves the Convex 1024 field limit issue and improves performance.

### Why Namespace-Based Loading?

**Problem:** The old `getAllTranslations` query tried to return all 1000+ translations as a single object, which exceeded Convex's 1024 field limit.

**Solution:** Load only the translations you need for the current component/window using namespaces.

### Migration Guide

**❌ OLD WAY (Deprecated):**
```tsx
const { t } = useTranslation(); // Loads ALL translations upfront
<h1>{t("ui.media_library.tab.library")}</h1>
```

**✅ NEW WAY (Recommended):**
```tsx
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

const { t, isLoading } = useNamespaceTranslations("ui.media_library");
<h1>{t("ui.media_library.tab.library")}</h1>
```

## How It Works

### 1. Frontend Translation (UI) - Namespace-Based

Located in: `src/hooks/use-namespace-translations.ts`

```tsx
// Usage in components - SINGLE NAMESPACE
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

function MediaLibraryWindow() {
  const { t, isLoading } = useNamespaceTranslations("ui.media_library");
  const { locale, setLocale } = useTranslation(); // For locale management

  if (isLoading) return <div>Loading translations...</div>;

  return (
    <div>
      <h1>{t("ui.media_library.tab.library")}</h1>
      <p>{t("ui.media_library.tab.upload")}</p>
    </div>
  );
}
```

```tsx
// Usage in components - MULTIPLE NAMESPACES
import { useMultipleNamespaces } from "@/hooks/use-namespace-translations";

function CheckoutFlow() {
  const { t, isLoading } = useMultipleNamespaces([
    "ui.products",
    "ui.checkout"
  ]);

  return (
    <div>
      <h1>{t("ui.checkout.title")}</h1>
      <p>{t("ui.products.checkout.subtitle")}</p>
    </div>
  );
}
```

**Key Features:**
- `t(key)` function looks up translation in real-time
- Returns the **key itself** if translation is missing (no fallback!)
- Loads only the translations for requested namespace(s)
- Automatically uses current user's locale from `TranslationContext`
- Supports parameter interpolation: `t("key", { name: "John" })`

**Legacy Context (Still Available):**
Located in: `src/contexts/translation-context.tsx`

```tsx
// For locale management ONLY (no longer loads all translations)
const { locale, setLocale } = useTranslation();

// Change language
setLocale("de"); // German
setLocale("en"); // English
```

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

### UI Translation Namespaces

All UI translations follow this pattern: `ui.{namespace}.{key}`

Current namespaces:
- `ui.media_library.*` - Media Library window
- `ui.payments.*` - Payments window
- `ui.products.*` - Products window
- `ui.tickets.*` - Tickets window
- `ui.start_menu.*` - Start menu and desktop
- `ui.welcome.*` - Welcome window

**When to create a new namespace:**
- Each major window/feature should have its own namespace
- Group related translations together
- Keep namespaces focused (< 200 translations per namespace recommended)

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

## Available Queries

### Frontend (Client-Side)

1. **`getTranslationsByNamespace`** - Load single namespace
   ```tsx
   const translations = useQuery(
     api.ontologyTranslations.getTranslationsByNamespace,
     { locale: "en", namespace: "ui.media_library" }
   );
   ```

2. **`getMultipleNamespaces`** - Load multiple namespaces
   ```tsx
   const translations = useQuery(
     api.ontologyTranslations.getMultipleNamespaces,
     { locale: "en", namespaces: ["ui.products", "ui.checkout"] }
   );
   ```

3. **`getAllTranslations`** (DEPRECATED) - Don't use! Returns empty object.

### Backend (Server-Side)

- `translateObject()` - Translate single ontology object
- `translateObjects()` - Batch translate ontology objects

## Performance Best Practices

1. **Use the right hook for your needs:**
   - Single window/component? → `useNamespaceTranslations("ui.media_library")`
   - Multiple related namespaces? → `useMultipleNamespaces(["ui.a", "ui.b"])`
   - Just need locale? → `useTranslation()` (for `locale`, `setLocale` only)

2. **Keep namespaces focused:**
   - Aim for < 200 translations per namespace
   - Split large features into sub-namespaces if needed
   - Example: `ui.products.form`, `ui.products.list`, `ui.products.checkout`

3. **Load translations at the component level:**
   - Don't lift namespace loading to parent components unnecessarily
   - Let each window/feature load its own translations
   - Convex will cache and dedupe queries automatically

4. **Monitor translation size:**
   - If a namespace exceeds 100-150 translations, consider splitting it
   - Use descriptive keys to make debugging easier

## Files Reference

- `src/hooks/use-namespace-translations.ts` - **NEW** Namespace-based hooks
- `src/contexts/translation-context.tsx` - Locale management context
- `convex/ontologyTranslations.ts` - Translation queries (namespace-based)
- `convex/translationResolver.ts` - Backend translation helpers
- `convex/organizationOntology.ts` - Example usage in queries
- `convex/seedOntologyData.ts` - Seed data with translation keys
- `convex/translations/` - Translation seed files by feature
