/**
 * SEED CHECKOUT TRANSLATIONS - CUSTOMER INFO: ERROR MESSAGES
 *
 * Part 2 of 3: All validation error messages
 *
 * Component: src/components/checkout/steps/customer-info-step.tsx
 * Namespace: ui.checkout.customer_info.errors
 * Languages: en, de, pl, es, fr, ja
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout - Customer Info: Error Messages...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) throw new Error("System user not found");

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    const translations = [
      // ============================================================
      // ERROR MESSAGES
      // ============================================================
      {
        key: "ui.checkout.customer_info.errors.email_required",
        values: {
          en: "Email is required",
          de: "E-Mail ist erforderlich",
          pl: "E-mail jest wymagany",
          es: "El correo electrónico es obligatorio",
          fr: "L'e-mail est requis",
          ja: "メールアドレスは必須です",
        }
      },
      {
        key: "ui.checkout.customer_info.errors.email_invalid",
        values: {
          en: "Please enter a valid email address",
          de: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
          pl: "Proszę podać prawidłowy adres e-mail",
          es: "Por favor, introduce una dirección de correo válida",
          fr: "Veuillez saisir une adresse e-mail valide",
          ja: "有効なメールアドレスを入力してください",
        }
      },
      {
        key: "ui.checkout.customer_info.errors.name_required",
        values: {
          en: "Name is required",
          de: "Name ist erforderlich",
          pl: "Imię i nazwisko jest wymagane",
          es: "El nombre es obligatorio",
          fr: "Le nom est requis",
          ja: "氏名は必須です",
        }
      },
      {
        key: "ui.checkout.customer_info.errors.company_required",
        values: {
          en: "Company name is required for business transactions",
          de: "Firmenname ist für Geschäftstransaktionen erforderlich",
          pl: "Nazwa firmy jest wymagana dla transakcji biznesowych",
          es: "El nombre de la empresa es obligatorio para transacciones comerciales",
          fr: "Le nom de l'entreprise est requis pour les transactions professionnelles",
          ja: "事業取引には会社名が必要です",
        }
      },
      {
        key: "ui.checkout.customer_info.errors.vat_invalid",
        values: {
          en: "Please enter a valid VAT number (e.g., DE123456789, GB999999973)",
          de: "Bitte geben Sie eine gültige USt-IdNr. ein (z.B. DE123456789, GB999999973)",
          pl: "Proszę podać prawidłowy numer VAT (np. DE123456789, GB999999973)",
          es: "Por favor, introduce un número de IVA válido (ej. DE123456789, GB999999973)",
          fr: "Veuillez saisir un numéro de TVA valide (ex. DE123456789, GB999999973)",
          ja: "有効なVAT番号を入力してください（例：DE123456789、GB999999973）",
        }
      },
      {
        key: "ui.checkout.customer_info.errors.street_required",
        values: {
          en: "Street address is required for business transactions",
          de: "Straßenadresse ist für Geschäftstransaktionen erforderlich",
          pl: "Adres ulicy jest wymagany dla transakcji biznesowych",
          es: "La dirección es obligatoria para transacciones comerciales",
          fr: "L'adresse est requise pour les transactions professionnelles",
          ja: "事業取引には住所が必要です",
        }
      },
      {
        key: "ui.checkout.customer_info.errors.city_required",
        values: {
          en: "City is required for business transactions",
          de: "Stadt ist für Geschäftstransaktionen erforderlich",
          pl: "Miasto jest wymagane dla transakcji biznesowych",
          es: "La ciudad es obligatoria para transacciones comerciales",
          fr: "La ville est requise pour les transactions professionnelles",
          ja: "事業取引には市区町村が必要です",
        }
      },
      {
        key: "ui.checkout.customer_info.errors.postal_code_required",
        values: {
          en: "Postal code is required for business transactions",
          de: "Postleitzahl ist für Geschäftstransaktionen erforderlich",
          pl: "Kod pocztowy jest wymagany dla transakcji biznesowych",
          es: "El código postal es obligatorio para transacciones comerciales",
          fr: "Le code postal est requis pour les transactions professionnelles",
          ja: "事業取引には郵便番号が必要です",
        }
      },
      {
        key: "ui.checkout.customer_info.errors.country_required",
        values: {
          en: "Country is required for business transactions",
          de: "Land ist für Geschäftstransaktionen erforderlich",
          pl: "Kraj jest wymagany dla transakcji biznesowych",
          es: "El país es obligatorio para transacciones comerciales",
          fr: "Le pays est requis pour les transactions professionnelles",
          ja: "事業取引には国が必要です",
        }
      },
    ];

    const allKeys = translations.map(t => t.key);
    const existingKeys = await getExistingTranslationKeys(ctx.db, systemOrg._id, allKeys);

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
            "checkout",
            "customer-info-errors"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} error translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
