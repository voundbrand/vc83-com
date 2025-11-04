/**
 * SEED CHECKOUT TRANSLATIONS - CUSTOMER INFO: B2B FIELDS & COUNTRIES
 *
 * Part 3 of 3: B2B labels, placeholders, helpers, employer billing, and country names
 *
 * Component: src/components/checkout/steps/customer-info-step.tsx
 * Namespace: ui.checkout.customer_info
 * Languages: en, de, pl, es, fr, ja
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout - Customer Info: B2B Fields & Countries...");

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
      // B2B FIELD LABELS
      // ============================================================
      {
        key: "ui.checkout.customer_info.labels.company_name",
        values: {
          en: "Company Name",
          de: "Firmenname",
          pl: "Nazwa firmy",
          es: "Nombre de la empresa",
          fr: "Nom de l'entreprise",
          ja: "会社名",
        }
      },
      {
        key: "ui.checkout.customer_info.labels.vat_number",
        values: {
          en: "VAT Number",
          de: "USt-IdNr.",
          pl: "Numer VAT",
          es: "Número de IVA",
          fr: "Numéro de TVA",
          ja: "VAT番号",
        }
      },
      {
        key: "ui.checkout.customer_info.labels.billing_address",
        values: {
          en: "Billing Address",
          de: "Rechnungsadresse",
          pl: "Adres rozliczeniowy",
          es: "Dirección de facturación",
          fr: "Adresse de facturation",
          ja: "請求先住所",
        }
      },
      {
        key: "ui.checkout.customer_info.labels.street_address",
        values: {
          en: "Street Address",
          de: "Straße und Hausnummer",
          pl: "Ulica i numer",
          es: "Dirección",
          fr: "Adresse",
          ja: "住所",
        }
      },
      {
        key: "ui.checkout.customer_info.labels.address_line2",
        values: {
          en: "Address Line 2",
          de: "Adresszusatz",
          pl: "Dodatkowy adres",
          es: "Línea de dirección 2",
          fr: "Complément d'adresse",
          ja: "住所2行目",
        }
      },
      {
        key: "ui.checkout.customer_info.labels.city",
        values: {
          en: "City",
          de: "Stadt",
          pl: "Miasto",
          es: "Ciudad",
          fr: "Ville",
          ja: "市区町村",
        }
      },
      {
        key: "ui.checkout.customer_info.labels.state_province",
        values: {
          en: "State/Province",
          de: "Bundesland/Region",
          pl: "Województwo/Region",
          es: "Estado/Provincia",
          fr: "État/Province",
          ja: "都道府県",
        }
      },
      {
        key: "ui.checkout.customer_info.labels.postal_code",
        values: {
          en: "Postal Code",
          de: "Postleitzahl",
          pl: "Kod pocztowy",
          es: "Código postal",
          fr: "Code postal",
          ja: "郵便番号",
        }
      },
      {
        key: "ui.checkout.customer_info.labels.country",
        values: {
          en: "Country",
          de: "Land",
          pl: "Kraj",
          es: "País",
          fr: "Pays",
          ja: "国",
        }
      },

      // ============================================================
      // B2B PLACEHOLDERS
      // ============================================================
      {
        key: "ui.checkout.customer_info.placeholders.company_name",
        values: {
          en: "Acme Corporation",
          de: "Beispiel GmbH",
          pl: "Firma Przykład Sp. z o.o.",
          es: "Empresa Ejemplo S.A.",
          fr: "Société Exemple SARL",
          ja: "株式会社サンプル",
        }
      },
      {
        key: "ui.checkout.customer_info.placeholders.vat_number",
        values: {
          en: "DE123456789 or GB999999973",
          de: "DE123456789 oder GB999999973",
          pl: "DE123456789 lub GB999999973",
          es: "DE123456789 o GB999999973",
          fr: "DE123456789 ou GB999999973",
          ja: "DE123456789 または GB999999973",
        }
      },
      {
        key: "ui.checkout.customer_info.placeholders.street_address",
        values: {
          en: "123 Main Street",
          de: "Hauptstraße 123",
          pl: "ul. Główna 123",
          es: "Calle Principal 123",
          fr: "123 Rue Principale",
          ja: "メインストリート123",
        }
      },
      {
        key: "ui.checkout.customer_info.placeholders.address_line2",
        values: {
          en: "Suite 100, Floor 2",
          de: "Etage 2, Büro 100",
          pl: "Piętro 2, Lokal 100",
          es: "Piso 2, Suite 100",
          fr: "Étage 2, Bureau 100",
          ja: "2階、スイート100",
        }
      },
      {
        key: "ui.checkout.customer_info.placeholders.city",
        values: {
          en: "San Francisco",
          de: "Berlin",
          pl: "Warszawa",
          es: "Madrid",
          fr: "Paris",
          ja: "東京",
        }
      },
      {
        key: "ui.checkout.customer_info.placeholders.state",
        values: {
          en: "CA",
          de: "BE",
          pl: "MZ",
          es: "M",
          fr: "IDF",
          ja: "東京都",
        }
      },
      {
        key: "ui.checkout.customer_info.placeholders.postal_code",
        values: {
          en: "94105",
          de: "10115",
          pl: "00-001",
          es: "28001",
          fr: "75001",
          ja: "100-0001",
        }
      },

      // ============================================================
      // B2B HELPER TEXT
      // ============================================================
      {
        key: "ui.checkout.customer_info.helpers.company_autofilled",
        values: {
          en: "Auto-filled from your employer. You can modify if needed.",
          de: "Automatisch von Ihrem Arbeitgeber ausgefüllt. Bei Bedarf können Sie Änderungen vornehmen.",
          pl: "Automatycznie wypełnione przez pracodawcę. Możesz modyfikować w razie potrzeby.",
          es: "Rellenado automáticamente por tu empleador. Puedes modificarlo si es necesario.",
          fr: "Rempli automatiquement par votre employeur. Vous pouvez le modifier si nécessaire.",
          ja: "雇用主から自動入力されました。必要に応じて変更できます。",
        }
      },
      {
        key: "ui.checkout.customer_info.helpers.vat_format",
        values: {
          en: "EU VAT number format: 2-letter country code + digits (e.g., DE123456789)",
          de: "EU-USt-IdNr.-Format: 2-stelliger Ländercode + Ziffern (z.B. DE123456789)",
          pl: "Format numeru VAT UE: 2-literowy kod kraju + cyfry (np. DE123456789)",
          es: "Formato de número IVA UE: código de país de 2 letras + dígitos (ej. DE123456789)",
          fr: "Format du numéro de TVA UE : code pays à 2 lettres + chiffres (ex. DE123456789)",
          ja: "EU VAT番号形式：2文字の国コード + 数字（例：DE123456789）",
        }
      },
      {
        key: "ui.checkout.customer_info.helpers.billing_address_employer",
        values: {
          en: "Pre-filled from employer information. You can modify if needed.",
          de: "Aus den Arbeitgeberinformationen vorausgefüllt. Bei Bedarf können Sie Änderungen vornehmen.",
          pl: "Wstępnie wypełnione z informacji o pracodawcy. Możesz modyfikować w razie potrzeby.",
          es: "Prellenado con información del empleador. Puedes modificarlo si es necesario.",
          fr: "Pré-rempli à partir des informations de l'employeur. Vous pouvez le modifier si nécessaire.",
          ja: "雇用主情報から事前入力されました。必要に応じて変更できます。",
        }
      },
      {
        key: "ui.checkout.customer_info.helpers.billing_address_required",
        values: {
          en: "Required for business invoices",
          de: "Erforderlich für Geschäftsrechnungen",
          pl: "Wymagane dla faktur biznesowych",
          es: "Obligatorio para facturas comerciales",
          fr: "Requis pour les factures professionnelles",
          ja: "事業請求書に必要",
        }
      },
      {
        key: "ui.checkout.customer_info.helpers.address_line2_description",
        values: {
          en: "Apartment, suite, unit, building, floor, etc.",
          de: "Wohnung, Suite, Einheit, Gebäude, Etage, usw.",
          pl: "Mieszkanie, apartament, jednostka, budynek, piętro itp.",
          es: "Apartamento, suite, unidad, edificio, piso, etc.",
          fr: "Appartement, suite, unité, bâtiment, étage, etc.",
          ja: "アパート、スイート、ユニット、ビル、階数など",
        }
      },
      {
        key: "ui.checkout.customer_info.helpers.country_code_format",
        values: {
          en: "ISO 3166-1 alpha-2 country code (e.g., DE for Germany)",
          de: "ISO 3166-1 Alpha-2-Ländercode (z.B. DE für Deutschland)",
          pl: "Kod kraju ISO 3166-1 alpha-2 (np. DE dla Niemiec)",
          es: "Código de país ISO 3166-1 alfa-2 (ej. DE para Alemania)",
          fr: "Code pays ISO 3166-1 alpha-2 (ex. DE pour l'Allemagne)",
          ja: "ISO 3166-1 alpha-2国コード（例：ドイツの場合はDE）",
        }
      },

      // ============================================================
      // EMPLOYER BILLING DISPLAY
      // ============================================================
      {
        key: "ui.checkout.customer_info.employer_billing.company_label",
        values: {
          en: "Company:",
          de: "Firma:",
          pl: "Firma:",
          es: "Empresa:",
          fr: "Entreprise:",
          ja: "会社：",
        }
      },
      {
        key: "ui.checkout.customer_info.employer_billing.billing_address_label",
        values: {
          en: "Billing Address:",
          de: "Rechnungsadresse:",
          pl: "Adres rozliczeniowy:",
          es: "Dirección de facturación:",
          fr: "Adresse de facturation:",
          ja: "請求先住所：",
        }
      },
      {
        key: "ui.checkout.customer_info.employer_billing.vat_number_label",
        values: {
          en: "VAT Number:",
          de: "USt-IdNr.:",
          pl: "Numer VAT:",
          es: "Número de IVA:",
          fr: "Numéro de TVA:",
          ja: "VAT番号：",
        }
      },
      {
        key: "ui.checkout.customer_info.employer_billing.invoice_sent_to",
        values: {
          en: "Invoice will be sent to:",
          de: "Rechnung wird gesendet an:",
          pl: "Faktura zostanie wysłana do:",
          es: "La factura se enviará a:",
          fr: "La facture sera envoyée à:",
          ja: "請求書の送信先：",
        }
      },
      {
        key: "ui.checkout.customer_info.employer_billing.auto_configured_message",
        values: {
          en: "✓ Billing information has been automatically configured based on your employer selection.",
          de: "✓ Die Rechnungsinformationen wurden basierend auf Ihrer Arbeitgeberauswahl automatisch konfiguriert.",
          pl: "✓ Informacje rozliczeniowe zostały automatycznie skonfigurowane na podstawie wyboru pracodawcy.",
          es: "✓ La información de facturación se ha configurado automáticamente según tu selección de empleador.",
          fr: "✓ Les informations de facturation ont été automatiquement configurées selon votre sélection d'employeur.",
          ja: "✓ 請求情報は雇用主の選択に基づいて自動的に設定されました。",
        }
      },

      // ============================================================
      // COUNTRY NAMES
      // ============================================================
      {
        key: "ui.checkout.customer_info.countries.de",
        values: {
          en: "Germany",
          de: "Deutschland",
          pl: "Niemcy",
          es: "Alemania",
          fr: "Allemagne",
          ja: "ドイツ",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.at",
        values: {
          en: "Austria",
          de: "Österreich",
          pl: "Austria",
          es: "Austria",
          fr: "Autriche",
          ja: "オーストリア",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.ch",
        values: {
          en: "Switzerland",
          de: "Schweiz",
          pl: "Szwajcaria",
          es: "Suiza",
          fr: "Suisse",
          ja: "スイス",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.pl",
        values: {
          en: "Poland",
          de: "Polen",
          pl: "Polska",
          es: "Polonia",
          fr: "Pologne",
          ja: "ポーランド",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.fr",
        values: {
          en: "France",
          de: "Frankreich",
          pl: "Francja",
          es: "Francia",
          fr: "France",
          ja: "フランス",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.nl",
        values: {
          en: "Netherlands",
          de: "Niederlande",
          pl: "Holandia",
          es: "Países Bajos",
          fr: "Pays-Bas",
          ja: "オランダ",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.be",
        values: {
          en: "Belgium",
          de: "Belgien",
          pl: "Belgia",
          es: "Bélgica",
          fr: "Belgique",
          ja: "ベルギー",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.dk",
        values: {
          en: "Denmark",
          de: "Dänemark",
          pl: "Dania",
          es: "Dinamarca",
          fr: "Danemark",
          ja: "デンマーク",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.se",
        values: {
          en: "Sweden",
          de: "Schweden",
          pl: "Szwecja",
          es: "Suecia",
          fr: "Suède",
          ja: "スウェーデン",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.no",
        values: {
          en: "Norway",
          de: "Norwegen",
          pl: "Norwegia",
          es: "Noruega",
          fr: "Norvège",
          ja: "ノルウェー",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.gb",
        values: {
          en: "United Kingdom",
          de: "Vereinigtes Königreich",
          pl: "Wielka Brytania",
          es: "Reino Unido",
          fr: "Royaume-Uni",
          ja: "イギリス",
        }
      },
      {
        key: "ui.checkout.customer_info.countries.us",
        values: {
          en: "United States",
          de: "USA",
          pl: "Stany Zjednoczone",
          es: "Estados Unidos",
          fr: "États-Unis",
          ja: "アメリカ合衆国",
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
            "customer-info-b2b"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} B2B & country translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
