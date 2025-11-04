/**
 * SEED CHECKOUT TEMPLATE - CUSTOMER INFO STEP
 *
 * Seeds translations for the behavior-driven checkout template - Customer Info step.
 * Run independently: npx convex run translations/seedCheckoutTemplate_03_CustomerInfo:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Template - Customer Info translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    const translations = [
      // Headers
      {
        key: "ui.checkout_template.behavior_driven.customer_info.headers.title",
        values: {
          en: "Your Information",
          de: "Ihre Informationen",
          pl: "Twoje informacje",
          es: "Tu información",
          fr: "Vos informations",
          ja: "あなたの情報",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.headers.subtitle",
        values: {
          en: "Please provide your contact details",
          de: "Bitte geben Sie Ihre Kontaktdaten an",
          pl: "Proszę podać dane kontaktowe",
          es: "Por favor, proporcione sus datos de contacto",
          fr: "Veuillez fournir vos coordonnées",
          ja: "連絡先情報を入力してください",
        }
      },

      // Email field
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.email.label",
        values: {
          en: "Email Address",
          de: "E-Mail-Adresse",
          pl: "Adres e-mail",
          es: "Dirección de correo electrónico",
          fr: "Adresse e-mail",
          ja: "メールアドレス",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.email.placeholder",
        values: {
          en: "your.email@example.com",
          de: "ihre.email@beispiel.de",
          pl: "twoj.email@przyklad.pl",
          es: "tu.email@ejemplo.com",
          fr: "votre.email@exemple.fr",
          ja: "your.email@example.com",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.email.help",
        values: {
          en: "We'll send your tickets and confirmation to this email",
          de: "Wir senden Ihre Tickets und Bestätigung an diese E-Mail",
          pl: "Wyślemy bilety i potwierdzenie na ten adres e-mail",
          es: "Enviaremos tus entradas y confirmación a este correo",
          fr: "Nous enverrons vos billets et confirmation à cet e-mail",
          ja: "このメールアドレスにチケットと確認書を送信します",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.email.error_required",
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
        key: "ui.checkout_template.behavior_driven.customer_info.fields.email.error_invalid",
        values: {
          en: "Please enter a valid email address",
          de: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
          pl: "Proszę podać prawidłowy adres e-mail",
          es: "Por favor, introduce una dirección de correo válida",
          fr: "Veuillez entrer une adresse e-mail valide",
          ja: "有効なメールアドレスを入力してください",
        }
      },

      // Name field
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.name.label",
        values: {
          en: "Full Name",
          de: "Vollständiger Name",
          pl: "Imię i nazwisko",
          es: "Nombre completo",
          fr: "Nom complet",
          ja: "氏名",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.name.placeholder",
        values: {
          en: "John Doe",
          de: "Max Mustermann",
          pl: "Jan Kowalski",
          es: "Juan Pérez",
          fr: "Jean Dupont",
          ja: "山田太郎",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.name.error_required",
        values: {
          en: "Name is required",
          de: "Name ist erforderlich",
          pl: "Imię jest wymagane",
          es: "El nombre es obligatorio",
          fr: "Le nom est requis",
          ja: "氏名は必須です",
        }
      },

      // Phone field
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.phone.label",
        values: {
          en: "Phone Number",
          de: "Telefonnummer",
          pl: "Numer telefonu",
          es: "Número de teléfono",
          fr: "Numéro de téléphone",
          ja: "電話番号",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.phone.placeholder",
        values: {
          en: "+1 (555) 123-4567",
          de: "+49 (30) 123-4567",
          pl: "+48 123 456 789",
          es: "+34 123 456 789",
          fr: "+33 1 23 45 67 89",
          ja: "+81 90-1234-5678",
        }
      },

      // Purchase type
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.purchase_type.label",
        values: {
          en: "Purchase Type",
          de: "Kauftyp",
          pl: "Typ zakupu",
          es: "Tipo de compra",
          fr: "Type d'achat",
          ja: "購入タイプ",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.purchase_type.b2c",
        values: {
          en: "Individual / Consumer",
          de: "Privat / Verbraucher",
          pl: "Indywidualny / Konsument",
          es: "Individual / Consumidor",
          fr: "Particulier / Consommateur",
          ja: "個人 / 消費者",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.purchase_type.b2b",
        values: {
          en: "Business / Company",
          de: "Geschäftlich / Unternehmen",
          pl: "Biznesowy / Firma",
          es: "Empresa / Compañía",
          fr: "Entreprise / Société",
          ja: "ビジネス / 企業",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.purchase_type.help",
        values: {
          en: 'Select "Business / Company" if you need an invoice with company details',
          de: 'Wählen Sie "Geschäftlich / Unternehmen", wenn Sie eine Rechnung mit Firmendaten benötigen',
          pl: 'Wybierz "Biznesowy / Firma", jeśli potrzebujesz faktury z danymi firmy',
          es: 'Selecciona "Empresa / Compañía" si necesitas una factura con datos de empresa',
          fr: 'Sélectionnez "Entreprise / Société" si vous avez besoin d\'une facture avec les détails de l\'entreprise',
          ja: '会社の詳細が記載された請求書が必要な場合は「ビジネス / 企業」を選択してください',
        }
      },

      // Company fields
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.company.label",
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
        key: "ui.checkout_template.behavior_driven.customer_info.fields.company.placeholder",
        values: {
          en: "Acme Corporation",
          de: "Musterfirma GmbH",
          pl: "Przykładowa Firma Sp. z o.o.",
          es: "Empresa Ejemplo S.L.",
          fr: "Société Exemple SARL",
          ja: "株式会社サンプル",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.company.error_required",
        values: {
          en: "Company name is required for business checkout",
          de: "Firmenname ist für geschäftliche Käufe erforderlich",
          pl: "Nazwa firmy jest wymagana dla zakupów biznesowych",
          es: "El nombre de la empresa es obligatorio para compras empresariales",
          fr: "Le nom de l'entreprise est requis pour les achats professionnels",
          ja: "ビジネス購入には会社名が必要です",
        }
      },

      // VAT field
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.vat.label",
        values: {
          en: "VAT Number",
          de: "USt-IdNr.",
          pl: "Numer NIP",
          es: "Número de IVA",
          fr: "Numéro de TVA",
          ja: "VAT番号",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.vat.placeholder",
        values: {
          en: "DE123456789",
          de: "DE123456789",
          pl: "PL1234567890",
          es: "ES12345678Z",
          fr: "FR12345678901",
          ja: "JP123456789",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.vat.help",
        values: {
          en: "Format: 2-letter country code + 2-13 digits (e.g., DE123456789)",
          de: "Format: 2-stelliger Ländercode + 2-13 Ziffern (z.B. DE123456789)",
          pl: "Format: 2-literowy kod kraju + 2-13 cyfr (np. PL1234567890)",
          es: "Formato: código de país de 2 letras + 2-13 dígitos (ej. ES12345678Z)",
          fr: "Format: code pays à 2 lettres + 2-13 chiffres (ex. FR12345678901)",
          ja: "形式: 2文字の国コード + 2-13桁の数字 (例: JP123456789)",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.vat.error_invalid",
        values: {
          en: "Please enter a valid VAT number (e.g., DE123456789)",
          de: "Bitte geben Sie eine gültige USt-IdNr. ein (z.B. DE123456789)",
          pl: "Proszę podać prawidłowy numer NIP (np. PL1234567890)",
          es: "Por favor, introduce un número de IVA válido (ej. ES12345678Z)",
          fr: "Veuillez entrer un numéro de TVA valide (ex. FR12345678901)",
          ja: "有効なVAT番号を入力してください (例: JP123456789)",
        }
      },

      // Billing address
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.billing_address.label",
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
        key: "ui.checkout_template.behavior_driven.customer_info.fields.billing_address.help",
        values: {
          en: "Required for business invoices",
          de: "Erforderlich für Geschäftsrechnungen",
          pl: "Wymagane dla faktur biznesowych",
          es: "Obligatorio para facturas empresariales",
          fr: "Requis pour les factures professionnelles",
          ja: "ビジネス請求書には必須",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.street.label",
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
        key: "ui.checkout_template.behavior_driven.customer_info.fields.street.placeholder",
        values: {
          en: "123 Main Street",
          de: "Hauptstraße 123",
          pl: "ul. Główna 123",
          es: "Calle Principal 123",
          fr: "123 Rue Principale",
          ja: "メイン通り123",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.street.error_required",
        values: {
          en: "Street address is required for business checkout",
          de: "Straßenadresse ist für geschäftliche Käufe erforderlich",
          pl: "Adres ulicy jest wymagany dla zakupów biznesowych",
          es: "La dirección es obligatoria para compras empresariales",
          fr: "L'adresse est requise pour les achats professionnels",
          ja: "ビジネス購入には住所が必要です",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.address_line2.label",
        values: {
          en: "Address Line 2",
          de: "Adresszeile 2",
          pl: "Adres - linia 2",
          es: "Dirección línea 2",
          fr: "Adresse ligne 2",
          ja: "住所2行目",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.address_line2.placeholder",
        values: {
          en: "Suite, Floor, etc.",
          de: "Suite, Etage, etc.",
          pl: "Mieszkanie, piętro, itp.",
          es: "Suite, piso, etc.",
          fr: "Suite, étage, etc.",
          ja: "部屋番号、階数など",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.city.label",
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
        key: "ui.checkout_template.behavior_driven.customer_info.fields.city.placeholder",
        values: {
          en: "Berlin",
          de: "Berlin",
          pl: "Warszawa",
          es: "Madrid",
          fr: "Paris",
          ja: "東京",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.city.error_required",
        values: {
          en: "City is required for business checkout",
          de: "Stadt ist für geschäftliche Käufe erforderlich",
          pl: "Miasto jest wymagane dla zakupów biznesowych",
          es: "La ciudad es obligatoria para compras empresariales",
          fr: "La ville est requise pour les achats professionnels",
          ja: "ビジネス購入には市区町村が必要です",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.state.label",
        values: {
          en: "State/Province",
          de: "Bundesland",
          pl: "Województwo",
          es: "Provincia/Estado",
          fr: "Province/État",
          ja: "都道府県",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.postal_code.label",
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
        key: "ui.checkout_template.behavior_driven.customer_info.fields.postal_code.placeholder",
        values: {
          en: "10115",
          de: "10115",
          pl: "00-001",
          es: "28001",
          fr: "75001",
          ja: "100-0001",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.postal_code.error_required",
        values: {
          en: "Postal code is required for business checkout",
          de: "Postleitzahl ist für geschäftliche Käufe erforderlich",
          pl: "Kod pocztowy jest wymagany dla zakupów biznesowych",
          es: "El código postal es obligatorio para compras empresariales",
          fr: "Le code postal est requis pour les achats professionnels",
          ja: "ビジネス購入には郵便番号が必要です",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.country.label",
        values: {
          en: "Country",
          de: "Land",
          pl: "Kraj",
          es: "País",
          fr: "Pays",
          ja: "国",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.fields.country.error_required",
        values: {
          en: "Country is required for business checkout",
          de: "Land ist für geschäftliche Käufe erforderlich",
          pl: "Kraj jest wymagany dla zakupów biznesowych",
          es: "El país es obligatorio para compras empresariales",
          fr: "Le pays est requis pour les achats professionnels",
          ja: "ビジネス購入には国が必要です",
        }
      },

      // Countries
      {
        key: "ui.checkout_template.behavior_driven.customer_info.countries.DE",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.AT",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.CH",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.PL",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.FR",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.NL",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.BE",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.DK",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.SE",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.NO",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.GB",
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
        key: "ui.checkout_template.behavior_driven.customer_info.countries.US",
        values: {
          en: "United States",
          de: "Vereinigte Staaten",
          pl: "Stany Zjednoczone",
          es: "Estados Unidos",
          fr: "États-Unis",
          ja: "アメリカ合衆国",
        }
      },

      // Buttons
      {
        key: "ui.checkout_template.behavior_driven.customer_info.buttons.continue",
        values: {
          en: "Continue to Review →",
          de: "Weiter zur Überprüfung →",
          pl: "Przejdź do przeglądu →",
          es: "Continuar a revisión →",
          fr: "Continuer vers révision →",
          ja: "確認に進む →",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.buttons.back",
        values: {
          en: "Back",
          de: "Zurück",
          pl: "Wstecz",
          es: "Atrás",
          fr: "Retour",
          ja: "戻る",
        }
      },

      // Common
      {
        key: "ui.checkout_template.behavior_driven.customer_info.common.optional",
        values: {
          en: "(Optional)",
          de: "(Optional)",
          pl: "(Opcjonalne)",
          es: "(Opcional)",
          fr: "(Optionnel)",
          ja: "(任意)",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.customer_info.common.required",
        values: {
          en: "*",
          de: "*",
          pl: "*",
          es: "*",
          fr: "*",
          ja: "*",
        }
      },
    ];

    const allKeys = translations.map(t => t.key);
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      allKeys
    );

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
            "checkout-template",
            "behavior-driven-customer-info"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Customer Info step translations`);
    return { success: true, count };
  }
});
