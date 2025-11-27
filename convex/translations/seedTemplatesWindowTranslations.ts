/**
 * TEMPLATES WINDOW TRANSLATIONS
 *
 * Translations for template subtypes following the same pattern as Forms
 *
 * Languages: EN, DE, PL, ES, FR, JA
 *
 * Covers:
 * - 15 Email Template Types
 * - 15 PDF Template Types
 */

import { mutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew, upsertTranslation } from "./_translationHelpers";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🌱 Seeding Templates Window translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) throw new Error("System organization not found");

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
      // =====================================================
      // TEMPLATES WINDOW UI LABELS
      // =====================================================

      {
        key: "ui.templates.title",
        values: {
          en: "Templates",
          de: "Vorlagen",
          pl: "Szablony",
          es: "Plantillas",
          fr: "Modèles",
          ja: "テンプレート",
        },
      },
      {
        key: "ui.templates.subtitle",
        values: {
          en: "Manage email and PDF templates",
          de: "E-Mail- und PDF-Vorlagen verwalten",
          pl: "Zarządzaj szablonami e-mail i PDF",
          es: "Gestionar plantillas de correo electrónico y PDF",
          fr: "Gérer les modèles d'e-mail et de PDF",
          ja: "メールとPDFテンプレートを管理",
        },
      },
      {
        key: "ui.templates.sign_in_prompt",
        values: {
          en: "Please sign in to access templates",
          de: "Bitte melden Sie sich an, um auf Vorlagen zuzugreifen",
          pl: "Zaloguj się, aby uzyskać dostęp do szablonów",
          es: "Inicie sesión para acceder a las plantillas",
          fr: "Veuillez vous connecter pour accéder aux modèles",
          ja: "テンプレートにアクセスするにはサインインしてください",
        },
      },

      // =====================================================
      // EMAIL TEMPLATE TYPES (15 total)
      // =====================================================

      {
        key: "ui.templates.email_type_transactional",
        values: {
          en: "Transactional",
          de: "Transaktional",
          pl: "Transakcyjny",
          es: "Transaccional",
          fr: "Transactionnel",
          ja: "トランザクション",
        }
      },
      {
        key: "ui.templates.email_type_event_confirmation",
        values: {
          en: "Event Confirmation",
          de: "Veranstaltungsbestätigung",
          pl: "Potwierdzenie wydarzenia",
          es: "Confirmación de evento",
          fr: "Confirmation d'événement",
          ja: "イベント確認",
        }
      },
      {
        key: "ui.templates.email_type_event_reminder",
        values: {
          en: "Event Reminder",
          de: "Veranstaltungserinnerung",
          pl: "Przypomnienie o wydarzeniu",
          es: "Recordatorio de evento",
          fr: "Rappel d'événement",
          ja: "イベントリマインダー",
        }
      },
      {
        key: "ui.templates.email_type_event_followup",
        values: {
          en: "Event Follow-up",
          de: "Veranstaltungs-Nachbereitung",
          pl: "Działania po wydarzeniu",
          es: "Seguimiento del evento",
          fr: "Suivi d'événement",
          ja: "イベントフォローアップ",
        }
      },
      {
        key: "ui.templates.email_type_newsletter",
        values: {
          en: "Newsletter",
          de: "Newsletter",
          pl: "Newsletter",
          es: "Boletín",
          fr: "Lettre d'information",
          ja: "ニュースレター",
        }
      },
      {
        key: "ui.templates.email_type_marketing",
        values: {
          en: "Marketing",
          de: "Marketing",
          pl: "Marketing",
          es: "Marketing",
          fr: "Marketing",
          ja: "マーケティング",
        }
      },
      {
        key: "ui.templates.email_type_promotional",
        values: {
          en: "Promotional",
          de: "Werbung",
          pl: "Promocyjny",
          es: "Promocional",
          fr: "Promotionnel",
          ja: "プロモーション",
        }
      },
      {
        key: "ui.templates.email_type_invoice",
        values: {
          en: "Invoice",
          de: "Rechnung",
          pl: "Faktura",
          es: "Factura",
          fr: "Facture",
          ja: "請求書",
        }
      },
      {
        key: "ui.templates.email_type_receipt",
        values: {
          en: "Receipt",
          de: "Quittung",
          pl: "Paragon",
          es: "Recibo",
          fr: "Reçu",
          ja: "領収書",
        }
      },
      {
        key: "ui.templates.email_type_shipping",
        values: {
          en: "Shipping",
          de: "Versand",
          pl: "Wysyłka",
          es: "Envío",
          fr: "Expédition",
          ja: "配送",
        }
      },
      {
        key: "ui.templates.email_type_support",
        values: {
          en: "Support",
          de: "Support",
          pl: "Wsparcie",
          es: "Soporte",
          fr: "Support",
          ja: "サポート",
        }
      },
      {
        key: "ui.templates.email_type_account",
        values: {
          en: "Account",
          de: "Konto",
          pl: "Konto",
          es: "Cuenta",
          fr: "Compte",
          ja: "アカウント",
        }
      },
      {
        key: "ui.templates.email_type_notification",
        values: {
          en: "Notification",
          de: "Benachrichtigung",
          pl: "Powiadomienie",
          es: "Notificación",
          fr: "Notification",
          ja: "通知",
        }
      },
      {
        key: "ui.templates.email_type_welcome",
        values: {
          en: "Welcome",
          de: "Willkommen",
          pl: "Powitanie",
          es: "Bienvenida",
          fr: "Bienvenue",
          ja: "ようこそ",
        }
      },
      {
        key: "ui.templates.email_type_other",
        values: {
          en: "Other",
          de: "Andere",
          pl: "Inne",
          es: "Otro",
          fr: "Autre",
          ja: "その他",
        }
      },

      // =====================================================
      // PDF TEMPLATE TYPES (15 total)
      // =====================================================

      {
        key: "ui.templates.pdf_type_ticket",
        values: {
          en: "Ticket",
          de: "Ticket",
          pl: "Bilet",
          es: "Boleto",
          fr: "Billet",
          ja: "チケット",
        }
      },
      {
        key: "ui.templates.pdf_type_invoice",
        values: {
          en: "Invoice",
          de: "Rechnung",
          pl: "Faktura",
          es: "Factura",
          fr: "Facture",
          ja: "請求書",
        }
      },
      {
        key: "ui.templates.pdf_type_receipt",
        values: {
          en: "Receipt",
          de: "Quittung",
          pl: "Paragon",
          es: "Recibo",
          fr: "Reçu",
          ja: "領収書",
        }
      },
      {
        key: "ui.templates.pdf_type_certificate",
        values: {
          en: "Certificate",
          de: "Zertifikat",
          pl: "Certyfikat",
          es: "Certificado",
          fr: "Certificat",
          ja: "証明書",
        }
      },
      {
        key: "ui.templates.pdf_type_badge",
        values: {
          en: "Badge",
          de: "Badge",
          pl: "Plakietka",
          es: "Insignia",
          fr: "Badge",
          ja: "バッジ",
        }
      },
      {
        key: "ui.templates.pdf_type_program",
        values: {
          en: "Event Program",
          de: "Veranstaltungsprogramm",
          pl: "Program wydarzenia",
          es: "Programa del evento",
          fr: "Programme de l'événement",
          ja: "イベントプログラム",
        }
      },
      {
        key: "ui.templates.pdf_type_quote",
        values: {
          en: "Quote/Estimate",
          de: "Angebot/Kostenvoranschlag",
          pl: "Wycena/Kosztorys",
          es: "Cotización/Presupuesto",
          fr: "Devis/Estimation",
          ja: "見積書",
        }
      },
      {
        key: "ui.templates.pdf_type_proposal",
        values: {
          en: "Proposal",
          de: "Vorschlag",
          pl: "Propozycja",
          es: "Propuesta",
          fr: "Proposition",
          ja: "提案書",
        }
      },
      {
        key: "ui.templates.pdf_type_contract",
        values: {
          en: "Contract",
          de: "Vertrag",
          pl: "Umowa",
          es: "Contrato",
          fr: "Contrat",
          ja: "契約書",
        }
      },
      {
        key: "ui.templates.pdf_type_report",
        values: {
          en: "Report",
          de: "Bericht",
          pl: "Raport",
          es: "Informe",
          fr: "Rapport",
          ja: "レポート",
        }
      },
      {
        key: "ui.templates.pdf_type_ebook",
        values: {
          en: "eBook",
          de: "eBook",
          pl: "eBook",
          es: "eBook",
          fr: "eBook",
          ja: "電子書籍",
        }
      },
      {
        key: "ui.templates.pdf_type_guide",
        values: {
          en: "Guide",
          de: "Leitfaden",
          pl: "Przewodnik",
          es: "Guía",
          fr: "Guide",
          ja: "ガイド",
        }
      },
      {
        key: "ui.templates.pdf_type_checklist",
        values: {
          en: "Checklist",
          de: "Checkliste",
          pl: "Lista kontrolna",
          es: "Lista de verificación",
          fr: "Liste de contrôle",
          ja: "チェックリスト",
        }
      },
      {
        key: "ui.templates.pdf_type_flyer",
        values: {
          en: "Flyer",
          de: "Flyer",
          pl: "Ulotka",
          es: "Folleto",
          fr: "Dépliant",
          ja: "チラシ",
        }
      },
      {
        key: "ui.templates.pdf_type_other",
        values: {
          en: "Other",
          de: "Andere",
          pl: "Inne",
          es: "Otro",
          fr: "Autre",
          ja: "その他",
        }
      },
    ];

    // Get existing translation keys
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      translations.map(t => t.key)
    );

    // Insert only new translations
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
            "templates",
            "templates-window"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Templates Window translations`);
    return { success: true, count };
  }
});
