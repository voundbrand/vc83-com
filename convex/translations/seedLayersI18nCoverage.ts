import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

const SUPPORTED_LOCALES = ["en", "de", "pl", "es", "fr", "ja"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const translations: Array<{ key: string; values: Record<SupportedLocale, string> }> = [
  {
    key: "ui.manage.security.passkeys.add_device",
    values: {
      en: "Add another device",
      de: "Add another device",
      pl: "Add another device",
      es: "Add another device",
      fr: "Add another device",
      ja: "Add another device",
    },
  },
  {
    key: "ui.manage.security.passkeys.api_keys_notice.title",
    values: {
      en: "Looking for API Keys?",
      de: "Looking for API Keys?",
      pl: "Looking for API Keys?",
      es: "Looking for API Keys?",
      fr: "Looking for API Keys?",
      ja: "Looking for API Keys?",
    },
  },
  {
    key: "ui.manage.security.passkeys.benefit.device_support",
    values: {
      en: "Works on phone, laptop, or security key",
      de: "Works on phone, laptop, or security key",
      pl: "Works on phone, laptop, or security key",
      es: "Works on phone, laptop, or security key",
      fr: "Works on phone, laptop, or security key",
      ja: "Works on phone, laptop, or security key",
    },
  },
  {
    key: "ui.manage.security.passkeys.benefit.fast_login",
    values: {
      en: "Faster login - no typing passwords",
      de: "Faster login - no typing passwords",
      pl: "Faster login - no typing passwords",
      es: "Faster login - no typing passwords",
      fr: "Faster login - no typing passwords",
      ja: "Faster login - no typing passwords",
    },
  },
  {
    key: "ui.manage.security.passkeys.benefit.secure_login",
    values: {
      en: "More secure - phishing-proof biometrics",
      de: "More secure - phishing-proof biometrics",
      pl: "More secure - phishing-proof biometrics",
      es: "More secure - phishing-proof biometrics",
      fr: "More secure - phishing-proof biometrics",
      ja: "More secure - phishing-proof biometrics",
    },
  },
  {
    key: "ui.manage.security.passkeys.empty.cta",
    values: {
      en: "Set up Face ID / Touch ID",
      de: "Set up Face ID / Touch ID",
      pl: "Set up Face ID / Touch ID",
      es: "Set up Face ID / Touch ID",
      fr: "Set up Face ID / Touch ID",
      ja: "Set up Face ID / Touch ID",
    },
  },
  {
    key: "ui.manage.security.passkeys.empty.title",
    values: {
      en: "No passkeys set up yet",
      de: "No passkeys set up yet",
      pl: "No passkeys set up yet",
      es: "No passkeys set up yet",
      fr: "No passkeys set up yet",
      ja: "No passkeys set up yet",
    },
  },
  {
    key: "ui.manage.security.passkeys.errors.unknown",
    values: {
      en: "Unknown error",
      de: "Unknown error",
      pl: "Unknown error",
      es: "Unknown error",
      fr: "Unknown error",
      ja: "Unknown error",
    },
  },
  {
    key: "ui.manage.security.passkeys.remove.button",
    values: {
      en: "Remove",
      de: "Remove",
      pl: "Remove",
      es: "Remove",
      fr: "Remove",
      ja: "Remove",
    },
  },
  {
    key: "ui.manage.security.passkeys.row.added",
    values: {
      en: "Added",
      de: "Added",
      pl: "Added",
      es: "Added",
      fr: "Added",
      ja: "Added",
    },
  },
  {
    key: "ui.manage.security.passkeys.row.last_used",
    values: {
      en: "Last used",
      de: "Last used",
      pl: "Last used",
      es: "Last used",
      fr: "Last used",
      ja: "Last used",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.actions.cancel",
    values: {
      en: "Cancel",
      de: "Cancel",
      pl: "Cancel",
      es: "Cancel",
      fr: "Cancel",
      ja: "Cancel",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.actions.setting_up",
    values: {
      en: "Setting up...",
      de: "Setting up...",
      pl: "Setting up...",
      es: "Setting up...",
      fr: "Setting up...",
      ja: "Setting up...",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.actions.setup",
    values: {
      en: "Set up",
      de: "Set up",
      pl: "Set up",
      es: "Set up",
      fr: "Set up",
      ja: "Set up",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.device_name.label",
    values: {
      en: "Device Name",
      de: "Device Name",
      pl: "Device Name",
      es: "Device Name",
      fr: "Device Name",
      ja: "Device Name",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.device_name.placeholder",
    values: {
      en: "e.g., iPhone 15 Pro, MacBook Air",
      de: "e.g., iPhone 15 Pro, MacBook Air",
      pl: "e.g., iPhone 15 Pro, MacBook Air",
      es: "e.g., iPhone 15 Pro, MacBook Air",
      fr: "e.g., iPhone 15 Pro, MacBook Air",
      ja: "e.g., iPhone 15 Pro, MacBook Air",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.errors.browser_not_supported_title",
    values: {
      en: "Browser Not Supported",
      de: "Browser Not Supported",
      pl: "Browser Not Supported",
      es: "Browser Not Supported",
      fr: "Browser Not Supported",
      ja: "Browser Not Supported",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.errors.cancelled_message",
    values: {
      en: "Please try again when you're ready.",
      de: "Please try again when you're ready.",
      pl: "Please try again when you're ready.",
      es: "Please try again when you're ready.",
      fr: "Please try again when you're ready.",
      ja: "Please try again when you're ready.",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.errors.cancelled_title",
    values: {
      en: "Setup Cancelled",
      de: "Setup Cancelled",
      pl: "Setup Cancelled",
      es: "Setup Cancelled",
      fr: "Setup Cancelled",
      ja: "Setup Cancelled",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.errors.missing_device_name_message",
    values: {
      en: "Please enter a device name",
      de: "Please enter a device name",
      pl: "Please enter a device name",
      es: "Please enter a device name",
      fr: "Please enter a device name",
      ja: "Please enter a device name",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.errors.missing_device_name_title",
    values: {
      en: "Missing Device Name",
      de: "Missing Device Name",
      pl: "Missing Device Name",
      es: "Missing Device Name",
      fr: "Missing Device Name",
      ja: "Missing Device Name",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.errors.setup_failed_title",
    values: {
      en: "Setup Failed",
      de: "Setup Failed",
      pl: "Setup Failed",
      es: "Setup Failed",
      fr: "Setup Failed",
      ja: "Setup Failed",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.modal_title",
    values: {
      en: "Set up Face ID / Touch ID",
      de: "Set up Face ID / Touch ID",
      pl: "Set up Face ID / Touch ID",
      es: "Set up Face ID / Touch ID",
      fr: "Set up Face ID / Touch ID",
      ja: "Set up Face ID / Touch ID",
    },
  },
  {
    key: "ui.manage.security.passkeys.setup.success.title",
    values: {
      en: "Face ID / Touch ID",
      de: "Face ID / Touch ID",
      pl: "Face ID / Touch ID",
      es: "Face ID / Touch ID",
      fr: "Face ID / Touch ID",
      ja: "Face ID / Touch ID",
    },
  }
];

/**
 * Seed Layers/Desktop Translation Coverage (Lane D)
 *
 * Adds missing ui.manage.security.passkeys.* keys for high-traffic desktop security surfaces with six-locale parity.
 */
export const seedLayersI18nCoverage = internalMutation({
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
          "manage",
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
