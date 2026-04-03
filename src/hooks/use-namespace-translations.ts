"use client";

import { useQuery } from "convex/react";
import { useTranslation } from "@/contexts/translation-context";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../convex/_generated/api");

const missingTranslationWarnings = new Set<string>();

function interpolateTranslation(
  value: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return value;
  }

  let nextValue = value;
  Object.entries(params).forEach(([paramKey, paramValue]) => {
    nextValue = nextValue.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
  });

  return nextValue;
}

function warnMissingTranslationOnce(
  fingerprint: string,
  message: string,
  ...details: unknown[]
) {
  const enableDebugWarnings =
    process.env.NODE_ENV === "development"
    && process.env.NEXT_PUBLIC_DEBUG_I18N_MISSING_KEYS === "1";

  if (!enableDebugWarnings) {
    return;
  }

  if (missingTranslationWarnings.has(fingerprint)) {
    return;
  }
  missingTranslationWarnings.add(fingerprint);

  if (details.length > 0) {
    console.warn(message, ...details);
    return;
  }
  console.warn(message);
}

/**
 * USE NAMESPACE TRANSLATIONS HOOK
 *
 * Lazy-loads translations for specific namespaces to avoid the 1024 field limit.
 * This is more efficient than loading all translations upfront.
 *
 * @param namespace - Single namespace (e.g., "ui.media_library")
 * @returns Translation function scoped to the namespace
 *
 * @example
 * // In MediaLibraryWindow component
 * function MediaLibraryWindow() {
 *   const { t, isLoading } = useNamespaceTranslations("ui.media_library");
 *
 *   return (
 *     <div>
 *       <h1>{t("ui.media_library.tab.library")}</h1>
 *     </div>
 *   );
 * }
 */
export function useNamespaceTranslations(namespace: string) {
  const { locale } = useTranslation();

  // Load translations for this namespace
  type TranslationMap = Record<string, string>;
  const translationsMap = useQuery(
    generatedApi.api.ontologyTranslations.getTranslationsByNamespace,
    { locale, namespace }
  ) as TranslationMap | undefined;

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    // Check if translations are loading
    if (!translationsMap) {
      return key;
    }

    // Support both absolute keys (ui.agents_window.header.title)
    // and namespace-relative keys (header.title).
    const fullyQualifiedKey = key.startsWith(`${namespace}.`)
      ? key
      : `${namespace}.${key}`;

    // Look up translation in the key-value map
    let value = translationsMap[key];
    if (!value && fullyQualifiedKey !== key) {
      value = translationsMap[fullyQualifiedKey];
    }

    if (!value) {
      warnMissingTranslationOnce(
        `single:${locale}:${namespace}:${key}`,
        `[Translation] Missing key: ${key} in namespace: ${namespace} for locale: ${locale}`
      );

      // Fallback: return the key
      return key;
    }

    // Interpolate parameters if provided
    return interpolateTranslation(value, params);
  };

  const tWithFallback = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>,
  ): string => {
    const translated = t(key, params);
    return translated === key ? interpolateTranslation(fallback, params) : translated;
  };

  return {
    t,
    tWithFallback,
    isLoading: translationsMap === undefined,
    translationsMap,
  };
}

/**
 * USE MULTIPLE NAMESPACES HOOK
 *
 * Lazy-loads translations for multiple namespaces in a single query.
 * More efficient when a component needs translations from multiple areas.
 *
 * @param namespaces - Array of namespaces (e.g., ["ui.products", "ui.checkout"])
 * @returns Translation function for all requested namespaces
 *
 * @example
 * // In CheckoutFlow component that needs both products and checkout translations
 * function CheckoutFlow() {
 *   const { t, isLoading } = useMultipleNamespaces([
 *     "ui.products",
 *     "ui.checkout"
 *   ]);
 *
 *   return (
 *     <div>
 *       <h1>{t("ui.checkout.title")}</h1>
 *       <p>{t("ui.products.checkout.subtitle")}</p>
 *     </div>
 *   );
 * }
 */
export function useMultipleNamespaces(namespaces: string[]) {
  const { locale } = useTranslation();

  // Load translations for all namespaces
  type TranslationMap = Record<string, string>;
  const translationsMap = useQuery(
    generatedApi.api.ontologyTranslations.getMultipleNamespaces,
    { locale, namespaces }
  ) as TranslationMap | undefined;

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    // Check if translations are loading
    if (!translationsMap) {
      return key;
    }

    // Look up translation in the key-value map
    let value = translationsMap[key];

    if (!value) {
      warnMissingTranslationOnce(
        `multi:${locale}:${namespaces.join("|")}:${key}`,
        `[Translation] Missing key: ${key} in namespaces: ${namespaces.join(", ")} for locale: ${locale}`
      );

      // Fallback: return the key
      return key;
    }

    // Interpolate parameters if provided
    return interpolateTranslation(value, params);
  };

  const tWithFallback = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>,
  ): string => {
    const translated = t(key, params);
    return translated === key ? interpolateTranslation(fallback, params) : translated;
  };

  return {
    t,
    tWithFallback,
    isLoading: translationsMap === undefined,
    translationsMap,
  };
}
