# Translation Upsert Pattern

## Overview

All translation seed files now use the **upsert pattern** instead of insert-only. This ensures that:
- ✅ New translations are **inserted** when they don't exist
- ✅ Existing translations are **updated** when the seed is re-run
- ✅ No duplicate translations are created
- ✅ Translation improvements can be deployed by re-running the seed

## How It Works

### Helper Function: `upsertTranslation`

Located in: `convex/translations/_translationHelpers.ts`

```typescript
export async function upsertTranslation(
  db: DatabaseWriter,
  systemOrgId: Id<"organizations">,
  systemUserId: Id<"users">,
  key: string,
  value: string,
  locale: string,
  category: string,
  component?: string
): Promise<{ inserted: boolean; updated: boolean }>
```

**What it does:**
1. Checks if a translation exists using the highly-selective `by_org_type_locale_name` index
2. If exists: **UPDATES** the `value` and `updatedAt` fields
3. If not exists: **INSERTS** a new translation record
4. Returns result indicating what happened

### Usage in Seed Files

**✅ CORRECT - Use `upsertTranslation`:**

```typescript
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    let insertedCount = 0;
    let updatedCount = 0;

    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code];

        if (value) {
          const result = await upsertTranslation(
            ctx.db,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale.code,
            "ui",
            "templates"
          );

          if (result.inserted) insertedCount++;
          else if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Translations:`);
    console.log(`   - Inserted: ${insertedCount} new`);
    console.log(`   - Updated: ${updatedCount} existing`);

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount
    };
  }
});
```

**❌ WRONG - Don't use `insertTranslationIfNew`:**

```typescript
import { insertTranslationIfNew } from "./_translationHelpers";

// This will SKIP existing translations instead of updating them!
const inserted = await insertTranslationIfNew(...);
```

## When to Update Translations

### Safe to Update:
- ✅ Fixing typos or grammatical errors
- ✅ Improving wording or clarity
- ✅ Adding missing parameters (e.g., `{count}`, `{name}`)
- ✅ Adjusting tone or formality
- ✅ Correcting cultural/regional differences

### Requires Migration:
- ⚠️ Changing translation **keys** (old key → new key)
- ⚠️ Removing translations entirely
- ⚠️ Restructuring parameter names

## Example: Templates Window Seed

**File:** `convex/translations/seedTemplatesTranslations.ts`

**First Run (New Installation):**
```bash
npx convex run translations/seedTemplatesTranslations:seed --push
```
**Output:**
```
✅ Templates Window translations:
   - Inserted: 240 new translations
   - Updated: 0 existing translations
   - Skipped: 0 (no value provided)
```

**Second Run (After Fixing Typos):**
```bash
npx convex run translations/seedTemplatesTranslations:seed --push
```
**Output:**
```
✅ Templates Window translations:
   - Inserted: 0 new translations
   - Updated: 240 existing translations  ← All translations updated!
   - Skipped: 0 (no value provided)
```

## Migration Guide for Existing Seeds

If you have old seed files using `insertTranslationIfNew`, update them:

1. **Change import:**
   ```typescript
   // OLD
   import { insertTranslationIfNew } from "./_translationHelpers";

   // NEW
   import { upsertTranslation } from "./_translationHelpers";
   ```

2. **Update logic:**
   ```typescript
   // OLD
   const inserted = await insertTranslationIfNew(ctx.db, existingKeys, ...);
   if (inserted) count++;

   // NEW
   const result = await upsertTranslation(ctx.db, ...);
   if (result.inserted) insertedCount++;
   else if (result.updated) updatedCount++;
   ```

3. **Update return value:**
   ```typescript
   // OLD
   return { success: true, count, totalKeys };

   // NEW
   return {
     success: true,
     inserted: insertedCount,
     updated: updatedCount,
     skipped: skippedCount,
     totalKeys
   };
   ```

## Benefits

### 1. **Translation Improvements**
When you find a typo or want to improve wording:
- Edit the translation in the seed file
- Re-run the seed script
- All instances update automatically

### 2. **No Database Cleanup**
No need to manually delete old translations before updating them.

### 3. **Clear Audit Trail**
The return value shows exactly what happened:
- How many were new
- How many were updated
- How many were skipped

### 4. **Idempotency**
Running the seed multiple times is safe and won't create duplicates.

## Performance

The `upsertTranslation` function is optimized:
- Uses the `by_org_type_locale_name` index for fast lookups
- Single query to check existence
- Single operation (insert OR update) per translation
- No batch operations needed

For 240 translations (40 keys × 6 locales):
- First run: ~240 inserts
- Subsequent runs: ~240 updates
- Total time: < 10 seconds

## Index Used

The helper relies on this Convex index:
```typescript
.index("by_org_type_locale_name", [
  "organizationId",
  "type",
  "locale",
  "name"
])
```

This provides **exact match lookups** with minimal overhead.

## Files Using Upsert Pattern

Current seed files updated to use upsert:
- ✅ `convex/translations/seedTemplatesTranslations.ts`
- ⏳ Other seed files (to be migrated)

## Testing Upsert Behavior

To verify upsert is working:

1. **First run:**
   ```bash
   npx convex run translations/seedTemplatesTranslations:seed --push
   ```
   Should show: `Inserted: X, Updated: 0`

2. **Change a translation value in the seed file**

3. **Second run:**
   ```bash
   npx convex run translations/seedTemplatesTranslations:seed --push
   ```
   Should show: `Inserted: 0, Updated: X`

4. **Verify in database:**
   ```bash
   npx convex run ontologyTranslations:getTranslationsByNamespace \
     '{"locale":"en","namespace":"ui.templates"}'
   ```
   Should show the updated value.

## Best Practices

1. **Always use `--push`** when testing changes:
   ```bash
   npx convex run translations/seedTemplatesTranslations:seed --push
   ```

2. **Check the output** to see what changed:
   - Large update count = you fixed many translations ✅
   - Large insert count = adding new translations ✅
   - Zero changes = everything already up to date ℹ️

3. **Version control** your seed files so you can track translation changes over time

4. **Document major changes** in git commit messages:
   ```
   fix(i18n): Improve German invoice translations

   - Fixed grammar in payment terms
   - Updated formal address to informal
   - Added missing plural forms
   ```

---

**Status:** ✅ Implemented and tested
**Last Updated:** 2025-01-12
**Migration Path:** Replace `insertTranslationIfNew` with `upsertTranslation` in all seed files
