import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

const SUPPORTED_LOCALES = ["en", "de", "pl", "es", "fr", "ja"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const translations: Array<{ key: string; values: Record<SupportedLocale, string> }> = [
  {
    key: "ui.payments.stripe_connect.feature_locked.title",
    values: {
      en: "Stripe Connect",
      de: "Stripe Connect",
      pl: "Stripe Connect",
      es: "Stripe Connect",
      fr: "Stripe Connect",
      ja: "Stripe Connect",
    },
  },
  {
    key: "ui.payments.stripe_connect.refresh.refresh_failed_title",
    values: {
      en: "Refresh Failed",
      de: "Refresh Failed",
      pl: "Refresh Failed",
      es: "Refresh Failed",
      fr: "Refresh Failed",
      ja: "Refresh Failed",
    },
  },
  {
    key: "ui.payments.stripe_connect.refresh.settings_refreshed_title",
    values: {
      en: "Settings Refreshed",
      de: "Settings Refreshed",
      pl: "Settings Refreshed",
      es: "Settings Refreshed",
      fr: "Settings Refreshed",
      ja: "Settings Refreshed",
    },
  },
  {
    key: "ui.payments.stripe_connect.refresh.tax_settings_not_found_title",
    values: {
      en: "Tax Settings Not Found",
      de: "Tax Settings Not Found",
      pl: "Tax Settings Not Found",
      es: "Tax Settings Not Found",
      fr: "Tax Settings Not Found",
      ja: "Tax Settings Not Found",
    },
  },
  {
    key: "ui.payments.stripe_connect.refresh.tax_status_prefix",
    values: {
      en: "Stripe Tax is",
      de: "Stripe Tax is",
      pl: "Stripe Tax is",
      es: "Stripe Tax is",
      fr: "Stripe Tax is",
      ja: "Stripe Tax is",
    },
  },
  {
    key: "ui.payments.stripe.oauth.connect_error",
    values: {
      en: "Failed to connect Stripe account. Please try again.",
      de: "Failed to connect Stripe account. Please try again.",
      pl: "Failed to connect Stripe account. Please try again.",
      es: "Failed to connect Stripe account. Please try again.",
      fr: "Failed to connect Stripe account. Please try again.",
      ja: "Failed to connect Stripe account. Please try again.",
    },
  }
];

/**
 * Seed Payments Translation Coverage (Lane D)
 *
 * Adds missing ui.payments.stripe* and ui.payments.stripe_connect.* keys introduced during lane migration with six-locale parity.
 */
export const seedPaymentsI18nCoverage = internalMutation({
  args: {},
  handler: async (ctx) => {
    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    let inserted = 0;
    let updated = 0;

    for (const translation of translations) {
      for (const locale of SUPPORTED_LOCALES) {
        const result = await upsertTranslation(
          ctx.db,
          systemOrg._id,
          systemUser._id,
          translation.key,
          translation.values[locale],
          locale,
          "payments",
          "lane-d-i18n-coverage",
        );

        if (result.inserted) {
          inserted += 1;
        }

        if (result.updated) {
          updated += 1;
        }
      }
    }

    return {
      success: true,
      keys: translations.length,
      locales: SUPPORTED_LOCALES.length,
      inserted,
      updated,
      totalOperations: translations.length * SUPPORTED_LOCALES.length,
    };
  },
});
