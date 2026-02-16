/**
 * BACKEND TRANSLATION HELPER
 *
 * Helper functions to fetch translations from the database for backend actions
 * (email generation, PDF generation, etc.)
 *
 * This is the backend equivalent of the frontend's useNamespaceTranslations hook.
 * It follows the same translation system architecture documented in TRANSLATION_SYSTEM.md
 */

import { ActionCtx } from "../_generated/server";

const generatedApi: any = require("../_generated/api");

/**
 * Fetch multiple translations at once for backend actions
 *
 * @param ctx - Action context
 * @param locale - Language code (e.g., "en", "de")
 * @param keys - Array of translation keys to fetch
 * @returns Object mapping keys to translated values
 *
 * @example
 * const t = await getBackendTranslations(ctx, "de", [
 *   "pdf.invoice.title",
 *   "pdf.invoice.billTo"
 * ]);
 * // Returns: { "pdf.invoice.title": "Rechnung", "pdf.invoice.billTo": "Rechnungsempfänger" }
 */
export async function getBackendTranslations(
  ctx: ActionCtx,
  locale: string,
  keys: string[]
): Promise<Record<string, string>> {
  // Get system organization (translations are stored under system org)
  const systemOrg = await (ctx as any).runQuery(generatedApi.internal.helpers.backendTranslationQueries.getSystemOrganization);

  if (!systemOrg) {
    console.error("❌ System organization not found for translations");
    // Return keys as fallback
    return Object.fromEntries(keys.map(key => [key, key]));
  }

  // Normalize locale (e.g., "de-DE" -> "de")
  const normalizedLocale = normalizeLocale(locale);

  // Fetch translations for requested locale
  const translations = await (ctx as any).runQuery(
    generatedApi.internal.helpers.backendTranslationQueries.getTranslationsByLocale,
    {
      organizationId: systemOrg._id,
      locale: normalizedLocale,
    }
  );

  // Build map of translations
  const translationMap = new Map(
    translations.map((t: any) => [t.name, t.value as string])
  );

  // Get English fallbacks if needed
  let fallbackMap: Map<string, string> | null = null;

  const results: Record<string, string> = {};

  for (const key of keys) {
    const value = translationMap.get(key);

    if (value !== undefined && typeof value === "string") {
      results[key] = value;
    } else if (normalizedLocale !== "en") {
      // Load English fallbacks if not already loaded
      if (!fallbackMap) {
        const fallbackTranslations = await (ctx as any).runQuery(
          generatedApi.internal.helpers.backendTranslationQueries.getTranslationsByLocale,
          {
            organizationId: systemOrg._id,
            locale: "en",
          }
        );

        fallbackMap = new Map(
          fallbackTranslations.map((t: any) => [t.name, t.value as string])
        );
      }

      const fallbackValue = fallbackMap.get(key);
      if (fallbackValue) {
        results[key] = fallbackValue;
        console.warn(`⚠️ Translation not found for ${key} in ${normalizedLocale}, using English fallback`);
      } else {
        results[key] = key; // Return key itself if no translation found
        console.error(`❌ Translation not found for ${key} in ${normalizedLocale} or English`);
      }
    } else {
      // English locale but key not found
      results[key] = key; // Return key itself
      console.error(`❌ Translation not found for ${key} in English`);
    }
  }

  return results;
}

/**
 * Fetch translations by namespace (loads all keys matching namespace prefix)
 *
 * @param ctx - Action context
 * @param locale - Language code (e.g., "en", "de")
 * @param namespace - Namespace prefix (e.g., "pdf.invoice", "email.order")
 * @returns Object mapping keys to translated values
 *
 * @example
 * const t = await getBackendTranslationsByNamespace(ctx, "de", "pdf.invoice");
 * // Returns all translations starting with "pdf.invoice.*"
 */
export async function getBackendTranslationsByNamespace(
  ctx: ActionCtx,
  locale: string,
  namespace: string
): Promise<Record<string, string>> {
  // Get system organization
  const systemOrg = await (ctx as any).runQuery(generatedApi.internal.helpers.backendTranslationQueries.getSystemOrganization);

  if (!systemOrg) {
    console.error("❌ System organization not found for translations");
    return {};
  }

  // Normalize locale
  const normalizedLocale = normalizeLocale(locale);

  // Fetch all translations for this locale
  const allTranslations = await (ctx as any).runQuery(
    generatedApi.internal.helpers.backendTranslationQueries.getTranslationsByLocale,
    {
      organizationId: systemOrg._id,
      locale: normalizedLocale,
    }
  );

  // Filter by namespace
  const translations = allTranslations.filter((t: any) => t.name.startsWith(namespace + "."));

  // Build results object
  const results: Record<string, string> = {};
  for (const t of translations) {
    results[t.name] = t.value as string;
  }

  console.log(`✅ Loaded ${Object.keys(results).length} translations for namespace ${namespace} in ${normalizedLocale}`);

  return results;
}

/**
 * Normalize locale code (e.g., "de-DE" -> "de", "en-US" -> "en")
 * This matches how translations are stored in the database
 */
function normalizeLocale(locale: string): string {
  if (!locale) return "en";

  // Extract language code (first 2 characters)
  const normalized = locale.toLowerCase().split("-")[0];

  // Default to English if invalid
  if (normalized.length !== 2) {
    console.warn(`⚠️ Invalid locale ${locale}, defaulting to "en"`);
    return "en";
  }

  return normalized;
}

/**
 * Helper to interpolate variables into translation strings
 *
 * @param template - Translation string with {variable} placeholders
 * @param values - Object with variable values
 * @returns Interpolated string
 *
 * @example
 * interpolate("Your Tickets for {eventName}", { eventName: "Medical Conference" })
 * // Returns: "Your Tickets for Medical Conference"
 */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? String(values[key]) : match;
  });
}
