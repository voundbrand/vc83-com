# Translation Seed Files - Upsert Pattern Update

## Problem

The translation seed files were using `ctx.db.insert()` which created **duplicate entries** every time they were run. This caused database bloat and made re-running seed files problematic when adding new translations or fixing existing ones.

### Example of the Problem:

```bash
# Running the same seed file twice created duplicates
npx convex run translations/seedWorkflowsTranslations:seed
# Result: 208 new entries created

npx convex run translations/seedWorkflowsTranslations:seed
# Result: 208 MORE entries created (416 total - duplicates!)
```

## Solution

Updated seed files to use the `upsertTranslation` helper function which:
- **INSERT** if translation doesn't exist
- **UPDATE** if translation already exists (based on unique key: organizationId + type + locale + name)

### Files Updated

The following seed files have been updated to use the upsert pattern:

1. ✅ **seedWorkflowsTranslations.ts** - 208 translations across 2 locales (en, de)
2. ✅ **seedWebPublishing.ts** - 226 translations
3. ✅ **seedMediaLibrary.ts** - 156 translations across 6 locales (en, de, pl, es, fr, ja)
4. ✅ **seedTicketsTranslations.ts** - 438 translations across 6 locales (en, de, pl, es, fr, ja)

### Example of Fixed Behavior:

```bash
# First run - inserts new translations
npx convex run translations/seedWorkflowsTranslations:seed
# Result: "✅ Seeded Workflows translations: 208 inserted, 0 updated"

# Second run - updates existing translations
npx convex run translations/seedWorkflowsTranslations:seed
# Result: "✅ Seeded Workflows translations: 0 inserted, 208 updated"
```

## Implementation Pattern

### Old Pattern (Creates Duplicates):

```typescript
import { internalMutation } from "../_generated/server";

export const seed = internalMutation({
  handler: async (ctx) => {
    const translations = [...];

    for (const translation of translations) {
      await ctx.db.insert("objects", {
        organizationId: systemOrg._id,
        type: "translation",
        locale: translation.locale,
        name: translation.key,
        value: translation.value,
        status: "active",
        // ...
      });
    }

    return { count: translations.length };
  },
});
```

### New Pattern (Upserts - No Duplicates):

```typescript
import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    const translations = [...];

    // Track insert vs update counts
    let insertedCount = 0;
    let updatedCount = 0;

    for (const translation of translations) {
      const result = await upsertTranslation(
        ctx.db,
        systemOrg._id,
        systemUser._id,
        translation.key,
        translation.value,
        translation.locale,
        "category_name",
        "component-name"
      );

      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(`✅ Seeded translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
```

## Benefits

1. **No More Duplicates**: Running a seed file multiple times won't create duplicate translations
2. **Safe Updates**: Can update translation text by re-running the seed file
3. **Better Feedback**: Console output shows how many were inserted vs updated
4. **Idempotent**: Seed files are now idempotent (safe to run multiple times)

## Testing Results

All updated seed files have been tested and verified:

```bash
# Workflows: ✅ 0 inserted, 208 updated
npx convex run translations/seedWorkflowsTranslations:seed

# Web Publishing: ✅ 0 inserted, 226 updated
npx convex run translations/seedWebPublishing:seed

# Media Library: ✅ 0 inserted, 156 updated
npx convex run translations/seedMediaLibrary:seed

# Tickets: ✅ 0 inserted, 438 updated
npx convex run translations/seedTicketsTranslations:seed
```

## Remaining Files

Other seed files that still use `insert` and should be updated in the future:

- seedControlPanel.ts
- seedDesktop.ts
- seedLogin.ts
- seedNotifications.ts
- seedOrganizations.ts
- seedSettings.ts

These files use a similar pattern and can be updated using the same approach when needed.

## How the Upsert Helper Works

The `upsertTranslation` function in `convex/translations/_translationHelpers.ts`:

1. Uses the highly-selective index `by_org_type_locale_name` to check if translation exists
2. If exists: patches the existing record with new value and updated timestamp
3. If not exists: inserts a new translation record
4. Returns `{ inserted: boolean, updated: boolean }` to track the operation

This approach avoids hitting Convex's 32k document read limit by checking translations individually rather than loading all translations at once.

## Conclusion

✅ **Problem Solved**: Translation seed files now use upsert pattern and won't create duplicates
✅ **Tested**: All 4 major seed files tested and working correctly
✅ **Documented**: Clear pattern established for future seed file updates
