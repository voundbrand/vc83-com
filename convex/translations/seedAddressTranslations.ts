/**
 * SEED ADDRESS TRANSLATIONS
 *
 * Seeds translations for organization addresses.
 * Run independently: npx convex run translations/seedAddressTranslations:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Address translations...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    // Define supported locales
    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
    ];

    // Address translations
    const translations = [
      // Headquarters Address
      {
        key: "org.address.headquarters.name",
        values: {
          en: "l4yercak3 Headquarters",
          de: "l4yercak3 Hauptsitz",
          pl: "l4yercak3 Siedziba główna",
        }
      },
      {
        key: "org.address.headquarters.description",
        values: {
          en: "Primary office location",
          de: "Hauptstandort des Büros",
          pl: "Główna lokalizacja biura",
        }
      },
      {
        key: "org.address.label.headquarters",
        values: {
          en: "Headquarters",
          de: "Hauptsitz",
          pl: "Siedziba",
        }
      },

      // Billing Address
      {
        key: "org.address.billing.name",
        values: {
          en: "l4yercak3 Billing Address",
          de: "l4yercak3 Rechnungsadresse",
          pl: "l4yercak3 Adres rozliczeniowy",
        }
      },
      {
        key: "org.address.billing.description",
        values: {
          en: "Primary billing address",
          de: "Primäre Rechnungsadresse",
          pl: "Główny adres rozliczeniowy",
        }
      },
      {
        key: "org.address.label.billing",
        values: {
          en: "Billing",
          de: "Rechnung",
          pl: "Fakturowanie",
        }
      },
    ];

    // Get all unique translation keys
    const allKeys = translations.map(t => t.key);

    // Efficiently check which translations already exist
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      allKeys
    );

    // Seed translations for each locale
    let count = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const inserted = await insertTranslationIfNew(
            ctx.db,
            existingKeys,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale.code,
            "address"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Address translations`);
    return { success: true, count };
  }
});
