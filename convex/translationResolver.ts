/**
 * TRANSLATION RESOLVER FOR ONTOLOGY OBJECTS
 *
 * This helper resolves translation keys in ontology objects at query time.
 * Works with the existing translation system in ontologyTranslations.ts
 */

import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * Get translations map for a locale
 * Returns: { "org.address.headquarters.name": "Headquarters", ... }
 */
async function getTranslationsMap(
  ctx: QueryCtx | MutationCtx,
  locale: string
): Promise<Record<string, string>> {
  const systemOrg = await ctx.db
    .query("organizations")
    .filter(q => q.eq(q.field("slug"), "system"))
    .first();

  if (!systemOrg) return {};

  const translations = await ctx.db
    .query("objects")
    .withIndex("by_org_type_locale", q =>
      q.eq("organizationId", systemOrg._id)
       .eq("type", "translation")
       .eq("locale", locale)
    )
    .collect();

  const translationMap: Record<string, string> = {};
  translations.forEach(t => {
    if (t.value) translationMap[t.name] = t.value;
  });

  return translationMap;
}

/**
 * Resolve a single translation key
 * If key not found, returns the key itself (for debugging)
 */
export async function resolveTranslation(
  ctx: QueryCtx | MutationCtx,
  key: string,
  locale: string
): Promise<string> {
  const translations = await getTranslationsMap(ctx, locale);

  // Return translation if found, otherwise return key for debugging
  return translations[key] || key;
}

/**
 * Check if a string looks like a translation key
 * Translation keys follow pattern: domain.type.identifier.field
 * Example: "org.address.headquarters.name"
 */
function isTranslationKey(str: string): boolean {
  // Must have dots and follow pattern
  return /^[a-z]+\.[a-z]+\.[\w-]+\.[\w-]+$/i.test(str);
}

/**
 * Translate an ontology object's fields
 * Resolves translation keys in: name, description, and customProperties.*Key fields
 */
export async function translateObject<T extends Partial<Doc<"objects">>>(
  ctx: QueryCtx | MutationCtx,
  obj: T,
  locale: string
): Promise<T> {
  const translations = await getTranslationsMap(ctx, locale);
  const translated = { ...obj };

  // Resolve name if it's a translation key
  if (obj.name && isTranslationKey(obj.name)) {
    translated.name = translations[obj.name] || obj.name;
  }

  // Resolve description if it's a translation key
  if (obj.description && isTranslationKey(obj.description)) {
    translated.description = translations[obj.description] || obj.description;
  }

  // Resolve customProperties fields ending with "Key"
  if (obj.customProperties) {
    const resolvedProps = { ...obj.customProperties };

    for (const [key, value] of Object.entries(obj.customProperties)) {
      if (key.endsWith("Key") && typeof value === "string" && isTranslationKey(value)) {
        // Create the resolved field name (remove "Key" suffix)
        const fieldName = key.replace(/Key$/, "");
        // Resolve translation
        resolvedProps[fieldName] = translations[value] || value;
      }
    }

    translated.customProperties = resolvedProps;
  }

  return translated;
}

/**
 * Translate multiple ontology objects
 * Efficient batch translation
 */
export async function translateObjects<T extends Partial<Doc<"objects">>>(
  ctx: QueryCtx | MutationCtx,
  objects: T[],
  locale: string
): Promise<T[]> {
  // Load translations once for all objects
  const translations = await getTranslationsMap(ctx, locale);

  return objects.map(obj => {
    const translated = { ...obj };

    // Resolve name
    if (obj.name && isTranslationKey(obj.name)) {
      translated.name = translations[obj.name] || obj.name;
    }

    // Resolve description
    if (obj.description && isTranslationKey(obj.description)) {
      translated.description = translations[obj.description] || obj.description;
    }

    // Resolve customProperties
    if (obj.customProperties) {
      const resolvedProps = { ...obj.customProperties };

      for (const [key, value] of Object.entries(obj.customProperties)) {
        if (key.endsWith("Key") && typeof value === "string" && isTranslationKey(value)) {
          const fieldName = key.replace(/Key$/, "");
          resolvedProps[fieldName] = translations[value] || value;
        }
      }

      translated.customProperties = resolvedProps;
    }

    return translated;
  });
}
