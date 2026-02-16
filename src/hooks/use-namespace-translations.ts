"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useTranslation } from "@/contexts/translation-context";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Deep type instantiation in Convex generated types
  const getTranslations = (api as any).ontologyTranslations.getTranslationsByNamespace;
  const translationsMap = useQuery(getTranslations, { locale, namespace });

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    // Check if translations are loading
    if (!translationsMap) {
      return key;
    }

    // Look up translation in the key-value map
    let value = translationsMap[key];

    if (!value) {
      // Debug logging in development only
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Translation] Missing key: ${key} in namespace: ${namespace} for locale: ${locale}`);
      }

      // Fallback: return the key
      return key;
    }

    // Interpolate parameters if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return value;
  };

  return {
    t,
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
  const translationsMap = useQuery(
    api.ontologyTranslations.getMultipleNamespaces,
    { locale, namespaces }
  );

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    // Check if translations are loading
    if (!translationsMap) {
      return key;
    }

    // Look up translation in the key-value map
    let value = translationsMap[key];

    if (!value) {
      // Debug logging in development only
      if (process.env.NODE_ENV === 'development') {
        // Enhanced debug logging for window title issues
        if (key.includes('ui.windows.')) {
          const windowKeys = Object.keys(translationsMap).filter(k => k.startsWith('ui.windows.'));
          console.warn(`[Translation] Missing window title: "${key}"`);
          console.warn(`[Translation] Loaded ${windowKeys.length} window keys:`, windowKeys.slice(0, 15));
        } else {
          console.warn(`[Translation] Missing key: ${key} in namespaces: ${namespaces.join(", ")} for locale: ${locale}`);
        }
      }

      // Fallback: return the key
      return key;
    }

    // Interpolate parameters if provided
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      });
    }

    return value;
  };

  return {
    t,
    isLoading: translationsMap === undefined,
    translationsMap,
  };
}
