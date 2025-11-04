/**
 * SEED CHECKOUT TRANSLATIONS - CUSTOMER INFO: BASIC INFORMATION
 *
 * Part 1 of 3: Headers, labels, placeholders, helpers, and UI indicators
 *
 * Component: src/components/checkout/steps/customer-info-step.tsx
 * Namespace: ui.checkout.customer_info
 * Languages: en, de, pl, es, fr, ja
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout - Customer Info: Basic Information...");

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
      // HEADERS & TITLES
      // ============================================================
      {
        key: "ui.checkout.customer_info.headers.title",
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
        key: "ui.checkout.customer_info.headers.subtitle_employer",
        values: {
          en: "Personal information only - billing will be sent to your employer",
          de: "Nur persönliche Informationen - die Rechnung wird an Ihren Arbeitgeber gesendet",
          pl: "Tylko dane osobowe - faktura zostanie wysłana do Twojego pracodawcy",
          es: "Solo información personal - la factura se enviará a tu empleador",
          fr: "Informations personnelles uniquement - la facture sera envoyée à votre employeur",
          ja: "個人情報のみ - 請求書は雇用主に送信されます",
        }
      },
      {
        key: "ui.checkout.customer_info.headers.subtitle_default",
        values: {
          en: "Please provide your contact details for order confirmation.",
          de: "Bitte geben Sie Ihre Kontaktdaten zur Bestellbestätigung an.",
          pl: "Podaj swoje dane kontaktowe w celu potwierdzenia zamówienia.",
          es: "Por favor, proporciona tus datos de contacto para la confirmación del pedido.",
          fr: "Veuillez fournir vos coordonnées pour la confirmation de la commande.",
          ja: "注文確認のために連絡先の詳細を入力してください.",
        }
      },
      {
        key: "ui.checkout.customer_info.headers.employer_billing_detected",
        values: {
          en: "Employer Billing Detected",
          de: "Arbeitgeberabrechnung erkannt",
          pl: "Wykryto rozliczenia pracodawcy",
          es: "Facturación del empleador detectada",
          fr: "Facturation employeur détectée",
          ja: "雇用主の請求が検出されました",
        }
      },

      // ============================================================
      // FORM FIELD LABELS
      // ============================================================
      {
        key: "ui.checkout.customer_info.labels.email_address",
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
        key: "ui.checkout.customer_info.labels.full_name",
        values: {
          en: "Full Name",
          de: "Vollständiger Name",
          pl: "Pełne imię i nazwisko",
          es: "Nombre completo",
          fr: "Nom complet",
          ja: "氏名",
        }
      },
      {
        key: "ui.checkout.customer_info.labels.phone_number",
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
        key: "ui.checkout.customer_info.labels.special_requests",
        values: {
          en: "Special Requests or Notes",
          de: "Besondere Wünsche oder Anmerkungen",
          pl: "Specjalne życzenia lub uwagi",
          es: "Solicitudes especiales o notas",
          fr: "Demandes spéciales ou notes",
          ja: "特別なリクエストまたはメモ",
        }
      },
      {
        key: "ui.checkout.customer_info.labels.transaction_type",
        values: {
          en: "Transaction Type",
          de: "Transaktionstyp",
          pl: "Typ transakcji",
          es: "Tipo de transacción",
          fr: "Type de transaction",
          ja: "取引タイプ",
        }
      },

      // ============================================================
      // TRANSACTION TYPES
      // ============================================================
      {
        key: "ui.checkout.customer_info.transaction_types.individual_consumer",
        values: {
          en: "Individual/Consumer",
          de: "Privatperson/Verbraucher",
          pl: "Osoba prywatna/Konsument",
          es: "Individual/Consumidor",
          fr: "Particulier/Consommateur",
          ja: "個人/消費者",
        }
      },
      {
        key: "ui.checkout.customer_info.transaction_types.business_company",
        values: {
          en: "Business/Company",
          de: "Geschäftlich/Firma",
          pl: "Firma/Przedsiębiorstwo",
          es: "Negocio/Empresa",
          fr: "Entreprise/Société",
          ja: "ビジネス/企業",
        }
      },

      // ============================================================
      // PLACEHOLDERS
      // ============================================================
      {
        key: "ui.checkout.customer_info.placeholders.email",
        values: {
          en: "you@example.com",
          de: "sie@beispiel.de",
          pl: "ty@przyklad.pl",
          es: "tu@ejemplo.com",
          fr: "vous@exemple.fr",
          ja: "you@example.jp",
        }
      },
      {
        key: "ui.checkout.customer_info.placeholders.name",
        values: {
          en: "Jane Doe",
          de: "Max Mustermann",
          pl: "Jan Kowalski",
          es: "Juan Pérez",
          fr: "Marie Dupont",
          ja: "山田太郎",
        }
      },
      {
        key: "ui.checkout.customer_info.placeholders.phone",
        values: {
          en: "+49 123 456 7890",
          de: "+49 123 456 7890",
          pl: "+48 123 456 789",
          es: "+34 123 456 789",
          fr: "+33 1 23 45 67 89",
          ja: "+81 90-1234-5678",
        }
      },
      {
        key: "ui.checkout.customer_info.placeholders.special_requests",
        values: {
          en: "Any special instructions or requests...",
          de: "Besondere Anweisungen oder Wünsche...",
          pl: "Jakieś specjalne instrukcje lub życzenia...",
          es: "Cualquier instrucción especial o solicitud...",
          fr: "Toute instruction spéciale ou demande...",
          ja: "特別な指示またはリクエスト...",
        }
      },

      // ============================================================
      // HELPER TEXT
      // ============================================================
      {
        key: "ui.checkout.customer_info.helpers.email_description",
        values: {
          en: "We'll send your order confirmation and receipt here.",
          de: "Wir senden Ihre Bestellbestätigung und Quittung hierher.",
          pl: "Wyślemy tutaj potwierdzenie zamówienia i paragon.",
          es: "Enviaremos aquí tu confirmación de pedido y recibo.",
          fr: "Nous enverrons ici votre confirmation de commande et votre reçu.",
          ja: "こちらに注文確認と領収書をお送りします。",
        }
      },
      {
        key: "ui.checkout.customer_info.helpers.transaction_type_description",
        values: {
          en: "Select whether this purchase is for personal use or on behalf of a business.",
          de: "Wählen Sie aus, ob dieser Kauf für den persönlichen Gebrauch oder im Namen eines Unternehmens erfolgt.",
          pl: "Wybierz, czy ten zakup jest do użytku osobistego, czy w imieniu firmy.",
          es: "Selecciona si esta compra es para uso personal o en nombre de una empresa.",
          fr: "Sélectionnez si cet achat est à usage personnel ou au nom d'une entreprise.",
          ja: "この購入が個人使用か企業代表としてかを選択してください。",
        }
      },

      // ============================================================
      // REQUIRED/OPTIONAL INDICATORS
      // ============================================================
      {
        key: "ui.checkout.customer_info.required_optional.required_indicator",
        values: {
          en: "*",
          de: "*",
          pl: "*",
          es: "*",
          fr: "*",
          ja: "*",
        }
      },
      {
        key: "ui.checkout.customer_info.required_optional.optional_indicator",
        values: {
          en: "(optional)",
          de: "(optional)",
          pl: "(opcjonalne)",
          es: "(opcional)",
          fr: "(optionnel)",
          ja: "(任意)",
        }
      },
      {
        key: "ui.checkout.customer_info.required_optional.autofilled_indicator",
        values: {
          en: "(auto-filled from employer)",
          de: "(automatisch vom Arbeitgeber ausgefüllt)",
          pl: "(automatycznie wypełnione od pracodawcy)",
          es: "(completado automáticamente desde el empleador)",
          fr: "(rempli automatiquement depuis l'employeur)",
          ja: "(雇用主から自動入力)",
        }
      },
      {
        key: "ui.checkout.customer_info.required_optional.autofilled_short",
        values: {
          en: "(auto-filled)",
          de: "(automatisch)",
          pl: "(auto-wypełnione)",
          es: "(autocompletado)",
          fr: "(auto-rempli)",
          ja: "(自動入力)",
        }
      },

      // ============================================================
      // BUTTONS
      // ============================================================
      {
        key: "ui.checkout.customer_info.buttons.back",
        values: {
          en: "Back",
          de: "Zurück",
          pl: "Wstecz",
          es: "Atrás",
          fr: "Retour",
          ja: "戻る",
        }
      },
      {
        key: "ui.checkout.customer_info.buttons.continue",
        values: {
          en: "Continue",
          de: "Weiter",
          pl: "Kontynuuj",
          es: "Continuar",
          fr: "Continuer",
          ja: "続ける",
        }
      },

      // ============================================================
      // FORCED B2B MODE MESSAGES
      // ============================================================
      {
        key: "ui.checkout.customer_info.forced_b2b.title",
        values: {
          en: "Business Invoice Required",
          de: "Geschäftsrechnung erforderlich",
          pl: "Wymagana faktura firmowa",
          es: "Factura comercial requerida",
          fr: "Facture commerciale requise",
          ja: "事業者請求書が必要",
        }
      },
      {
        key: "ui.checkout.customer_info.forced_b2b.description",
        values: {
          en: "This product requires business billing information for invoicing purposes.",
          de: "Dieses Produkt erfordert geschäftliche Rechnungsinformationen für Rechnungszwecke.",
          pl: "Ten produkt wymaga informacji o rozliczeniach biznesowych do celów fakturowania.",
          es: "Este producto requiere información de facturación comercial para fines de facturación.",
          fr: "Ce produit nécessite des informations de facturation commerciale à des fins de facturation.",
          ja: "この製品には請求目的でビジネス請求情報が必要です。",
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
            "customer-info-basic"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} basic info translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
