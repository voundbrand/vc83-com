/**
 * SEED CHECKOUT TEMPLATE - CONFIRMATION STEP (PART A: SUCCESS & ORDER SUMMARY)
 *
 * Seeds translations for success messages and order summary.
 * Part of behavior-driven checkout template - Confirmation step.
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Template - Confirmation Success...");

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
      // Success headers
      {
        key: "ui.checkout_template.behavior_driven.confirmation.headers.title",
        values: {
          en: "Payment Successful!",
          de: "Zahlung erfolgreich!",
          pl: "Płatność zakończona sukcesem!",
          es: "¡Pago exitoso!",
          fr: "Paiement réussi !",
          ja: "支払い成功！",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.headers.title_invoice",
        values: {
          en: "Registration Complete!",
          de: "Registrierung abgeschlossen!",
          pl: "Rejestracja zakończona!",
          es: "¡Registro completo!",
          fr: "Inscription terminée !",
          ja: "登録完了！",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.headers.subtitle",
        values: {
          en: "Your order has been confirmed and tickets are on their way.",
          de: "Ihre Bestellung wurde bestätigt und Ihre Tickets sind unterwegs.",
          pl: "Twoje zamówienie zostało potwierdzone, a bilety są w drodze.",
          es: "Tu pedido ha sido confirmado y las entradas están en camino.",
          fr: "Votre commande a été confirmée et les billets sont en route.",
          ja: "ご注文が確認され、チケットが送信されています。",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.headers.subtitle_invoice",
        values: {
          en: "Your tickets will be sent via email. Invoice sent to employer.",
          de: "Ihre Tickets werden per E-Mail versandt. Rechnung an Arbeitgeber gesendet.",
          pl: "Twoje bilety zostaną wysłane e-mailem. Faktura wysłana do pracodawcy.",
          es: "Tus entradas se enviarán por correo. Factura enviada al empleador.",
          fr: "Vos billets seront envoyés par e-mail. Facture envoyée à l'employeur.",
          ja: "チケットはメールで送信されます。請求書は雇用主に送信されました。",
        }
      },

      // Transaction info
      {
        key: "ui.checkout_template.behavior_driven.confirmation.labels.transaction_id",
        values: {
          en: "Transaction ID:",
          de: "Transaktions-ID:",
          pl: "ID transakcji:",
          es: "ID de transacción:",
          fr: "ID de transaction :",
          ja: "取引ID:",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.labels.pending",
        values: {
          en: "Pending",
          de: "Ausstehend",
          pl: "Oczekujące",
          es: "Pendiente",
          fr: "En attente",
          ja: "保留中",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.labels.email",
        values: {
          en: "Email:",
          de: "E-Mail:",
          pl: "E-mail:",
          es: "Correo:",
          fr: "E-mail :",
          ja: "メール:",
        }
      },

      // Order summary
      {
        key: "ui.checkout_template.behavior_driven.confirmation.sections.order_summary",
        values: {
          en: "Order Summary",
          de: "Bestellübersicht",
          pl: "Podsumowanie zamówienia",
          es: "Resumen del pedido",
          fr: "Récapitulatif de commande",
          ja: "注文概要",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.labels.subtotal",
        values: {
          en: "Subtotal:",
          de: "Zwischensumme:",
          pl: "Suma częściowa:",
          es: "Subtotal:",
          fr: "Sous-total :",
          ja: "小計:",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.labels.tax",
        values: {
          en: "Tax",
          de: "MwSt.",
          pl: "Podatek",
          es: "Impuesto",
          fr: "Taxe",
          ja: "税金",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.labels.total",
        values: {
          en: "Total:",
          de: "Gesamt:",
          pl: "Razem:",
          es: "Total:",
          fr: "Total :",
          ja: "合計:",
        }
      },

      // Email confirmation
      {
        key: "ui.checkout_template.behavior_driven.confirmation.email.title",
        values: {
          en: "Confirmation Email Sent",
          de: "Bestätigungs-E-Mail gesendet",
          pl: "Wysłano e-mail potwierdzający",
          es: "Correo de confirmación enviado",
          fr: "E-mail de confirmation envoyé",
          ja: "確認メールを送信しました",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.email.sent_to",
        values: {
          en: "We've sent your {type} to",
          de: "Wir haben Ihre {type} gesendet an",
          pl: "Wysłaliśmy Twoje {type} na adres",
          es: "Hemos enviado tu {type} a",
          fr: "Nous avons envoyé votre {type} à",
          ja: "{type}を送信しました",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.email.type_receipt_and_tickets",
        values: {
          en: "tickets, confirmation, and receipt",
          de: "Tickets, Bestätigung und Quittung",
          pl: "bilety, potwierdzenie i paragon",
          es: "entradas, confirmación y recibo",
          fr: "billets, confirmation et reçu",
          ja: "チケット、確認書、領収書",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.email.type_tickets_and_confirmation",
        values: {
          en: "tickets and confirmation",
          de: "Tickets und Bestätigung",
          pl: "bilety i potwierdzenie",
          es: "entradas y confirmación",
          fr: "billets et confirmation",
          ja: "チケットと確認書",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.confirmation.email.multiple_tickets",
        values: {
          en: "Each ticket holder will receive their individual ticket with QR code.",
          de: "Jeder Ticketinhaber erhält sein individuelles Ticket mit QR-Code.",
          pl: "Każdy posiadacz biletu otrzyma swój indywidualny bilet z kodem QR.",
          es: "Cada titular de entrada recibirá su entrada individual con código QR.",
          fr: "Chaque titulaire de billet recevra son billet individuel avec code QR.",
          ja: "各チケット保持者は、QRコード付きの個別チケットを受け取ります。",
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
            "behavior-driven-confirmation"
          );

          if (inserted) {
            count++;
          }
        }
      }
    }

    console.log(`✅ Seeded ${count} Confirmation Success translations (${translations.length} keys)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
