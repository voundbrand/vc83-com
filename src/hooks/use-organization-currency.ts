/**
 * ORGANIZATION CURRENCY HOOK
 *
 * Fetches currency and locale settings from organization settings.
 * This is the SINGLE SOURCE OF TRUTH for currency across the entire application.
 *
 * Organization settings pattern:
 * - Type: "organization_settings"
 * - Subtype: "locale"
 * - Fields: customProperties.currency, customProperties.locale
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useCurrentOrganization } from "./use-auth";

export interface OrganizationCurrency {
  /** Currency code (e.g., "EUR", "USD") */
  currency: string;
  /** Locale for formatting (e.g., "de-DE", "en-US") */
  locale: string;
  /** Whether settings are still loading */
  isLoading: boolean;
}

/**
 * Hook to fetch organization's currency and locale settings
 *
 * @returns Organization currency settings from locale settings object
 *
 * @example
 * const { currency, locale, isLoading } = useOrganizationCurrency();
 * const { formatCurrency } = useFormatCurrency({ currency });
 * formatCurrency(12000) // Uses org's currency
 */
export function useOrganizationCurrency(): OrganizationCurrency {
  const currentOrg = useCurrentOrganization();

  // Fetch locale settings (contains currency)
  // When subtype is provided, returns single object (not array)
  const localeSettings = useQuery(
    api.organizationOntology.getOrganizationSettings,
    currentOrg
      ? {
          organizationId: currentOrg.id as Id<"organizations">,
          subtype: "locale",
        }
      : "skip"
  );

  // localeSettings is single object when subtype is specified
  const settings = localeSettings && !Array.isArray(localeSettings) ? localeSettings : null;

  const currency = (settings?.customProperties?.currency as string) || "EUR";
  const locale = (settings?.customProperties?.locale as string) || "de-DE";

  return {
    currency,
    locale,
    isLoading: localeSettings === undefined,
  };
}
