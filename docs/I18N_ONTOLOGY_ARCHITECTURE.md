# Internationalization (i18n) Architecture for Ontology System

## 🎯 Problem Statement

The current ontology system stores **literal translated strings** directly in the database:

```javascript
// ❌ CURRENT PROBLEM
await ctx.db.insert("objects", {
  type: "address",
  name: "l4yercak3 Hauptsitz",  // German hardcoded
  description: "Hauptstandort des Büros",  // German hardcoded
  customProperties: {
    label: "Hauptsitz"  // German hardcoded
  }
});
```

**This causes critical issues:**
- ❌ Cannot switch languages dynamically
- ❌ Cannot support multi-language organizations
- ❌ Requires database migrations to add new languages
- ❌ Translation updates require data updates
- ❌ Cannot share data across language boundaries

---

## ✅ Solution: Translation Keys + Runtime Resolution

Store **translation keys** in the database, resolve to **actual translations** at query time.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      DATABASE                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  objects table:                                         │
│  ┌────────────────────────────────────────────┐        │
│  │ type: "address"                            │        │
│  │ nameKey: "org.address.headquarters.name"   │ ◄──┐   │
│  │ descriptionKey: "org.address.hq.desc"      │    │   │
│  │ customProperties: {                        │    │   │
│  │   labelKey: "org.address.label.hq"         │    │   │
│  │ }                                          │    │   │
│  └────────────────────────────────────────────┘    │   │
│                                                     │   │
│  objects table (translations):                     │   │
│  ┌────────────────────────────────────────────┐    │   │
│  │ type: "translation"                        │    │   │
│  │ name: "org.address.headquarters.name"      │ ◄──┘   │
│  │ value: "Headquarters"                      │        │
│  │ locale: "en"                               │        │
│  └────────────────────────────────────────────┘        │
│  ┌────────────────────────────────────────────┐        │
│  │ type: "translation"                        │        │
│  │ name: "org.address.headquarters.name"      │        │
│  │ value: "Hauptsitz"                         │        │
│  │ locale: "de"                               │        │
│  └────────────────────────────────────────────┘        │
│                                                         │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │ Query time resolution
                         │
┌────────────────────────┴──────────────────────────────┐
│            TRANSLATION RESOLVER                       │
│  translateObject(obj, locale="de") {                  │
│    return {                                           │
│      ...obj,                                          │
│      name: t(obj.nameKey, locale),  // "Hauptsitz"   │
│      description: t(obj.descKey, locale)              │
│    }                                                  │
│  }                                                    │
└───────────────────────────────────────────────────────┘
                         ▲
                         │
┌────────────────────────┴──────────────────────────────┐
│                   FRONTEND                            │
│  const address = useQuery(api.addresses.get, {        │
│    locale: userLocale  // "de"                        │
│  });                                                  │
│                                                       │
│  // Receives: { name: "Hauptsitz", ... }             │
└───────────────────────────────────────────────────────┘
```

---

## 🏗️ Implementation Strategy

### Phase 1: Dual Storage (Backward Compatible)

Store **both** translation keys AND literal values during migration:

```javascript
await ctx.db.insert("objects", {
  type: "address",

  // NEW: Translation keys (for future i18n)
  nameKey: "org.address.headquarters.name",
  descriptionKey: "org.address.headquarters.description",

  // OLD: Keep literal values (for backward compatibility)
  name: "l4yercak3 Headquarters",  // English fallback
  description: "Primary office location",

  customProperties: {
    labelKey: "org.address.label.headquarters",
    label: "Headquarters"  // Fallback
  }
});
```

**Benefits:**
- ✅ No breaking changes
- ✅ Frontend can migrate gradually
- ✅ Can fall back to literal values if translation missing

---

### Phase 2: Translation Key Naming Convention

**Format:** `{domain}.{type}.{subtype}.{field}.{identifier}`

**Examples:**
```
org.address.headquarters.name
org.address.headquarters.description
org.address.label.headquarters
org.address.label.billing
org.profile.industry.technology
org.profile.description.system
org.contact.email.support
rbac.role.admin.name
rbac.role.admin.description
rbac.permission.org.manage.name
error.auth.invalid-credentials
error.org.not-found
success.user.created
```

**Rules:**
1. Use dots (`.`) as separators
2. Lowercase only
3. Use hyphens (`-`) for multi-word identifiers
4. Maximum 6 segments
5. Keep descriptive but concise

---

### Phase 3: Translation Resolution Helper

Create a universal translation resolver:

```typescript
// convex/translationResolver.ts

/**
 * Resolve translation key to localized value
 */
export async function resolveTranslation(
  ctx: QueryCtx | MutationCtx,
  key: string,
  locale: string,
  organizationId: Id<"organizations">
): Promise<string> {
  // 1. Try organization-specific translation
  const orgTranslation = await ctx.db
    .query("objects")
    .withIndex("by_org_type_locale", q =>
      q.eq("organizationId", organizationId)
       .eq("type", "translation")
       .eq("locale", locale)
    )
    .filter(q => q.eq(q.field("name"), key))
    .first();

  if (orgTranslation) return orgTranslation.value;

  // 2. Try system translation
  const systemOrg = await getSystemOrg(ctx);
  const systemTranslation = await ctx.db
    .query("objects")
    .withIndex("by_org_type_locale", q =>
      q.eq("organizationId", systemOrg._id)
       .eq("type", "translation")
       .eq("locale", locale)
    )
    .filter(q => q.eq(q.field("name"), key))
    .first();

  if (systemTranslation) return systemTranslation.value;

  // 3. Try English fallback
  if (locale !== "en") {
    return resolveTranslation(ctx, key, "en", organizationId);
  }

  // 4. Return key itself if no translation found
  return key;
}

/**
 * Translate an entire object's translatable fields
 */
export async function translateObject<T extends object>(
  ctx: QueryCtx | MutationCtx,
  obj: T,
  locale: string,
  organizationId: Id<"organizations">
): Promise<T> {
  const translated = { ...obj };

  // Resolve all *Key fields
  for (const [key, value] of Object.entries(obj)) {
    if (key.endsWith("Key") && typeof value === "string") {
      const fieldName = key.replace(/Key$/, "");
      (translated as any)[fieldName] = await resolveTranslation(
        ctx,
        value,
        locale,
        organizationId
      );
    }
  }

  // Resolve customProperties keys
  if (obj.customProperties) {
    for (const [key, value] of Object.entries(obj.customProperties)) {
      if (key.endsWith("Key") && typeof value === "string") {
        const fieldName = key.replace(/Key$/, "");
        translated.customProperties[fieldName] = await resolveTranslation(
          ctx,
          value,
          locale,
          organizationId
        );
      }
    }
  }

  return translated;
}
```

---

### Phase 4: Query-Time Translation

Modify queries to resolve translations automatically:

```typescript
// convex/organizationOntology.ts

export const getOrganizationProfile = query({
  args: {
    organizationId: v.id("organizations"),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, { organizationId, locale = "en" }) => {
    const profile = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", organizationId)
         .eq("type", "organization_profile")
      )
      .first();

    if (!profile) return null;

    // ✅ Translate before returning
    return await translateObject(ctx, profile, locale, organizationId);
  }
});
```

---

## 📚 Translation Seed Data Structure

Update seed scripts to create translation keys:

```typescript
// convex/seedOntologyData.ts

// 1. Create translation keys for all languages
const translations = [
  // English
  { key: "org.address.headquarters.name", locale: "en", value: "Headquarters" },
  { key: "org.address.headquarters.description", locale: "en", value: "Primary office location" },
  { key: "org.address.label.headquarters", locale: "en", value: "Headquarters" },
  { key: "org.address.label.billing", locale: "en", value: "Billing" },

  // German
  { key: "org.address.headquarters.name", locale: "de", value: "Hauptsitz" },
  { key: "org.address.headquarters.description", locale: "de", value: "Hauptstandort des Büros" },
  { key: "org.address.label.headquarters", locale: "de", value: "Hauptsitz" },
  { key: "org.address.label.billing", locale: "de", value: "Rechnung" },

  // Polish
  { key: "org.address.headquarters.name", locale: "pl", value: "Siedziba główna" },
  { key: "org.address.headquarters.description", locale: "pl", value: "Główna lokalizacja biura" },
  { key: "org.address.label.headquarters", locale: "pl", value: "Siedziba" },
  { key: "org.address.label.billing", locale: "pl", value: "Fakturowanie" },
];

for (const trans of translations) {
  await ctx.db.insert("objects", {
    organizationId: systemOrg._id,
    type: "translation",
    subtype: "system",
    name: trans.key,
    value: trans.value,
    locale: trans.locale,
    status: "approved",
    customProperties: {
      category: "ontology",
      domain: trans.key.split(".")[0]
    },
    createdBy: systemUser._id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

// 2. Create objects using translation keys
await ctx.db.insert("objects", {
  organizationId: systemOrg._id,
  type: "address",
  subtype: "physical",

  // ✅ Use translation keys
  nameKey: "org.address.headquarters.name",
  descriptionKey: "org.address.headquarters.description",

  // ✅ Keep fallback values for backward compatibility
  name: "Headquarters",
  description: "Primary office location",

  status: "active",
  customProperties: {
    addressLine1: "123 Tech Street",
    addressLine2: "Suite 1983",
    city: "San Francisco",
    state: "CA",
    postalCode: "94105",
    country: "USA",

    // ✅ Translation key for UI labels
    labelKey: "org.address.label.headquarters",
    label: "Headquarters",  // Fallback

    isDefault: true,
    isPrimary: true,
  },
  createdBy: systemUser._id,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

---

## 🎯 Migration Path

### Step 1: Add Translation Keys (Non-Breaking)
- Add `nameKey`, `descriptionKey` fields
- Keep existing literal values as fallbacks
- Frontend still works without changes

### Step 2: Populate Translations
- Seed translation key → value mappings
- All supported languages (en, de, pl)

### Step 3: Update Queries
- Add `locale` parameter to queries
- Resolve translations at query time
- Return translated objects

### Step 4: Update Frontend
- Pass user's locale to queries
- Receive pre-translated objects
- No frontend translation logic needed!

### Step 5: Phase Out Literals (Optional)
- Once all translations exist
- Remove literal `name`, `description` fields
- Keep only `*Key` fields

---

## 🚀 Benefits of This Approach

### ✅ Language Flexibility
- Add new languages without schema changes
- Switch languages instantly (no page reload)
- Per-user language preferences

### ✅ Organization Customization
- Organizations can override system translations
- Custom terminology per organization
- Gravel road pattern still works!

### ✅ Content Management
- Non-technical users can update translations
- Translation approval workflows
- Version control for translations

### ✅ Performance
- Translations cached by Convex
- Minimal query overhead
- Batch translation resolution

### ✅ Developer Experience
- Simple query API: just pass `locale`
- No frontend translation logic
- Type-safe translation keys (future: TypeScript enums)

---

## 📖 Usage Examples

### Backend Query
```typescript
// Get organization profile in user's language
const profile = await ctx.runQuery(api.organizationOntology.getOrganizationProfile, {
  organizationId: orgId,
  locale: "de"  // German
});

// Returns: { name: "Hauptsitz", description: "Hauptstandort des Büros", ... }
```

### Frontend Component
```typescript
// React component
function AddressDisplay() {
  const { locale } = useTranslation();  // User's current locale

  const address = useQuery(api.organizationOntology.getAddress, {
    addressId: "...",
    locale  // Pass user's locale
  });

  // Address is already translated!
  return <div>{address.name}</div>;  // "Hauptsitz" if locale="de"
}
```

### Language Switcher
```typescript
function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <select value={locale} onChange={e => setLocale(e.target.value)}>
      <option value="en">English</option>
      <option value="de">Deutsch</option>
      <option value="pl">Polski</option>
    </select>
  );

  // All queries automatically refetch with new locale!
}
```

---

## 🔄 Rollback Strategy

If issues arise:

1. **Phase 1-2**: No breaking changes, just revert seed scripts
2. **Phase 3-4**: Frontend falls back to literal values automatically
3. **Phase 5**: Keep literal fields indefinitely if needed

---

## 📝 Next Steps

1. ✅ Review this architecture doc
2. Create translation key registry (TypeScript)
3. Update seed scripts with translation keys
4. Implement `translationResolver.ts`
5. Update queries to support `locale` parameter
6. Create migration script for existing data
7. Update frontend to pass locale
8. Add language switcher UI
9. Test multi-language workflows

---

**Last Updated**: 2025-10-09
**Status**: Architecture Proposal 📋
**Author**: Claude Code
