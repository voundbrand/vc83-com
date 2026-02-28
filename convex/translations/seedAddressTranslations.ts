/**
 * SEED ADDRESS TRANSLATIONS
 *
 * Seeds translations for organization addresses.
 * Run independently: npx convex run translations/seedAddressTranslations:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

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
          en: "sevenlayers.io Headquarters",
          de: "sevenlayers.io Hauptsitz",
          pl: "sevenlayers.io Siedziba główna",
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
          en: "sevenlayers.io Billing Address",
          de: "sevenlayers.io Rechnungsadresse",
          pl: "sevenlayers.io Adres rozliczeniowy",
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

    // Seed translations for each locale (upsert: insert new, update existing)
    let inserted = 0;
    let updated = 0;
    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const result = await upsertTranslation(
            ctx.db,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale.code,
            "address"
          );
          if (result.inserted) inserted++;
          if (result.updated) updated++;
        }
      }
    }

    console.log(`✅ Seeded Address translations: ${inserted} inserted, ${updated} updated`);
    return { success: true, inserted, updated };
  }
});
