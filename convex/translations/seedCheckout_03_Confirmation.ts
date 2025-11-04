/**
 * SEED FILE: Confirmation Step Translations
 *
 * This file contains ALL translation keys for the checkout confirmation step (Step 5).
 * Total Keys: ~31 unique keys × 6 languages = ~186 translations
 *
 * KEY NAMING CONVENTION:
 * ui.checkout.confirmation.{category}.{field}
 *
 * Categories:
 * - headers: Page titles and success messages
 * - transaction: Transaction ID and email confirmation
 * - order_details: Products, add-ons, pricing breakdown
 * - tax: Tax display labels and formatting
 * - totals: Subtotal and total labels
 * - email_notice: Email confirmation messages
 * - downloads: Download button labels
 * - support: Support contact information
 * - alerts: Error messages for downloads
 *
 * Languages: English (en), German (de), Polish (pl), Spanish (es), French (fr), Japanese (ja)
 *
 * USAGE IN COMPONENT:
 * const { t } = useTranslation();
 * <h2>{t("ui.checkout.confirmation.headers.success_title")}</h2>
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout - Confirmation Step...");

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
      // CATEGORY: HEADERS & SUCCESS MESSAGES
      // ============================================================
      {
        key: "ui.checkout.confirmation.headers.success_title",
        values: {
          en: "Payment Successful!",
          de: "Zahlung erfolgreich!",
          pl: "Płatność udana!",
          es: "¡Pago exitoso!",
          fr: "Paiement réussi !",
          ja: "支払い成功！",
        },
      },
      {
        key: "ui.checkout.confirmation.headers.subtitle_invoice",
        values: {
          en: "Your tickets have been sent to your email. An invoice will be sent to your employer for payment.",
          de: "Ihre Tickets wurden an Ihre E-Mail gesendet. Eine Rechnung wird an Ihren Arbeitgeber zur Zahlung gesendet.",
          pl: "Twoje bilety zostały wysłane na Twój e-mail. Faktura zostanie wysłana do Twojego pracodawcy do zapłaty.",
          es: "Tus entradas se han enviado a tu correo electrónico. Se enviará una factura a tu empleador para el pago.",
          fr: "Vos billets ont été envoyés à votre adresse e-mail. Une facture sera envoyée à votre employeur pour le paiement.",
          ja: "チケットはメールで送信されました。請求書は雇用主に送信されます。",
        },
      },
      {
        key: "ui.checkout.confirmation.headers.subtitle_tickets",
        values: {
          en: "Your tickets have been sent to your email with QR codes.",
          de: "Ihre Tickets wurden mit QR-Codes an Ihre E-Mail gesendet.",
          pl: "Twoje bilety zostały wysłane na Twój e-mail z kodami QR.",
          es: "Tus entradas se han enviado a tu correo electrónico con códigos QR.",
          fr: "Vos billets ont été envoyés à votre adresse e-mail avec des codes QR.",
          ja: "QRコード付きチケットがメールで送信されました。",
        },
      },
      {
        key: "ui.checkout.confirmation.headers.subtitle_order",
        values: {
          en: "Your order has been confirmed.",
          de: "Ihre Bestellung wurde bestätigt.",
          pl: "Twoje zamówienie zostało potwierdzone.",
          es: "Tu pedido ha sido confirmado.",
          fr: "Votre commande a été confirmée.",
          ja: "ご注文が確認されました。",
        },
      },

      // ============================================================
      // CATEGORY: TRANSACTION DETAILS
      // ============================================================
      {
        key: "ui.checkout.confirmation.order_details.section_title",
        values: {
          en: "Order Details",
          de: "Bestelldetails",
          pl: "Szczegóły zamówienia",
          es: "Detalles del pedido",
          fr: "Détails de la commande",
          ja: "注文詳細",
        },
      },
      {
        key: "ui.checkout.confirmation.transaction.id_label",
        values: {
          en: "Transaction ID:",
          de: "Transaktions-ID:",
          pl: "ID transakcji:",
          es: "ID de transacción:",
          fr: "ID de transaction :",
          ja: "取引ID：",
        },
      },
      {
        key: "ui.checkout.confirmation.transaction.id_not_available",
        values: {
          en: "N/A",
          de: "N/V",
          pl: "N/D",
          es: "N/D",
          fr: "N/D",
          ja: "該当なし",
        },
      },
      {
        key: "ui.checkout.confirmation.transaction.email_label",
        values: {
          en: "Email:",
          de: "E-Mail:",
          pl: "E-mail:",
          es: "Correo electrónico:",
          fr: "E-mail :",
          ja: "メール：",
        },
      },

      // ============================================================
      // CATEGORY: ORDER ITEMS & ADD-ONS
      // ============================================================
      {
        key: "ui.checkout.confirmation.order_details.items_label",
        values: {
          en: "Items Purchased:",
          de: "Gekaufte Artikel:",
          pl: "Zakupione produkty:",
          es: "Artículos comprados:",
          fr: "Articles achetés :",
          ja: "購入商品：",
        },
      },
      {
        key: "ui.checkout.confirmation.order_details.product_fallback",
        values: {
          en: "Product",
          de: "Produkt",
          pl: "Produkt",
          es: "Producto",
          fr: "Produit",
          ja: "商品",
        },
      },
      {
        key: "ui.checkout.confirmation.order_details.ticket_addons",
        values: {
          en: "Ticket {ticketNumber} add-ons",
          de: "Ticket {ticketNumber} Extras",
          pl: "Dodatki do biletu {ticketNumber}",
          es: "Extras del boleto {ticketNumber}",
          fr: "Suppléments du billet {ticketNumber}",
          ja: "チケット{ticketNumber}の追加オプション",
        },
      },

      // ============================================================
      // CATEGORY: PRICING BREAKDOWN
      // ============================================================
      {
        key: "ui.checkout.confirmation.totals.subtotal_label",
        values: {
          en: "Subtotal:",
          de: "Zwischensumme:",
          pl: "Suma częściowa:",
          es: "Subtotal:",
          fr: "Sous-total :",
          ja: "小計：",
        },
      },
      {
        key: "ui.checkout.confirmation.tax.label",
        values: {
          en: "Tax ({rate}%)",
          de: "Steuer ({rate}%)",
          pl: "Podatek ({rate}%)",
          es: "Impuesto ({rate}%)",
          fr: "Taxe ({rate}%)",
          ja: "税金（{rate}%）",
        },
      },
      {
        key: "ui.checkout.confirmation.tax.included_label",
        values: {
          en: "💶 included",
          de: "💶 enthalten",
          pl: "💶 wliczone",
          es: "💶 incluido",
          fr: "💶 inclus",
          ja: "💶 含まれる",
        },
      },
      {
        key: "ui.checkout.confirmation.tax.added_label",
        values: {
          en: "💵 added",
          de: "💵 hinzugefügt",
          pl: "💵 dodane",
          es: "💵 agregado",
          fr: "💵 ajouté",
          ja: "💵 追加",
        },
      },
      {
        key: "ui.checkout.confirmation.tax.items_count",
        values: {
          en: "{count} items",
          de: "{count} Artikel",
          pl: "{count} pozycji",
          es: "{count} artículos",
          fr: "{count} articles",
          ja: "{count}個の商品",
        },
      },
      {
        key: "ui.checkout.confirmation.totals.total_paid_label",
        values: {
          en: "Total Paid:",
          de: "Gesamt bezahlt:",
          pl: "Łącznie zapłacono:",
          es: "Total pagado:",
          fr: "Total payé :",
          ja: "お支払い合計：",
        },
      },

      // ============================================================
      // CATEGORY: EMAIL CONFIRMATION NOTICE
      // ============================================================
      {
        key: "ui.checkout.confirmation.email_notice.title",
        values: {
          en: "Confirmation Email Sent",
          de: "Bestätigungs-E-Mail gesendet",
          pl: "Wysłano e-mail potwierdzający",
          es: "Correo de confirmación enviado",
          fr: "E-mail de confirmation envoyé",
          ja: "確認メールを送信しました",
        },
      },
      {
        key: "ui.checkout.confirmation.email_notice.message_invoice",
        values: {
          en: "We've sent your tickets (with QR codes) to {email}. The invoice will be sent separately to your employer.",
          de: "Wir haben Ihre Tickets (mit QR-Codes) an {email} gesendet. Die Rechnung wird separat an Ihren Arbeitgeber gesendet.",
          pl: "Wysłaliśmy Twoje bilety (z kodami QR) na adres {email}. Faktura zostanie wysłana osobno do Twojego pracodawcy.",
          es: "Hemos enviado tus entradas (con códigos QR) a {email}. La factura se enviará por separado a tu empleador.",
          fr: "Nous avons envoyé vos billets (avec codes QR) à {email}. La facture sera envoyée séparément à votre employeur.",
          ja: "{email}にチケット（QRコード付き）を送信しました。請求書は別途雇用主に送信されます。",
        },
      },
      {
        key: "ui.checkout.confirmation.email_notice.message_tickets",
        values: {
          en: "We've sent your tickets (with QR codes) and receipt to {email}",
          de: "Wir haben Ihre Tickets (mit QR-Codes) und Quittung an {email} gesendet",
          pl: "Wysłaliśmy Twoje bilety (z kodami QR) i potwierdzenie na adres {email}",
          es: "Hemos enviado tus entradas (con códigos QR) y recibo a {email}",
          fr: "Nous avons envoyé vos billets (avec codes QR) et reçu à {email}",
          ja: "{email}にチケット（QRコード付き）と領収書を送信しました",
        },
      },
      {
        key: "ui.checkout.confirmation.email_notice.message_order",
        values: {
          en: "We've sent a confirmation email with your receipt to {email}",
          de: "Wir haben eine Bestätigungs-E-Mail mit Ihrer Quittung an {email} gesendet",
          pl: "Wysłaliśmy e-mail potwierdzający z potwierdzeniem na adres {email}",
          es: "Hemos enviado un correo de confirmación con tu recibo a {email}",
          fr: "Nous avons envoyé un e-mail de confirmation avec votre reçu à {email}",
          ja: "{email}に領収書付き確認メールを送信しました",
        },
      },

      // ============================================================
      // CATEGORY: DOWNLOAD BUTTONS
      // ============================================================
      {
        key: "ui.checkout.confirmation.downloads.receipt_button",
        values: {
          en: "Download Receipt",
          de: "Quittung herunterladen",
          pl: "Pobierz potwierdzenie",
          es: "Descargar recibo",
          fr: "Télécharger le reçu",
          ja: "領収書をダウンロード",
        },
      },
      {
        key: "ui.checkout.confirmation.downloads.receipt_downloading",
        values: {
          en: "Downloading...",
          de: "Wird heruntergeladen...",
          pl: "Pobieranie...",
          es: "Descargando...",
          fr: "Téléchargement...",
          ja: "ダウンロード中...",
        },
      },
      {
        key: "ui.checkout.confirmation.downloads.ticket_button",
        values: {
          en: "Download Ticket",
          de: "Ticket herunterladen",
          pl: "Pobierz bilet",
          es: "Descargar entrada",
          fr: "Télécharger le billet",
          ja: "チケットをダウンロード",
        },
      },
      {
        key: "ui.checkout.confirmation.downloads.tickets_button",
        values: {
          en: "Download Tickets",
          de: "Tickets herunterladen",
          pl: "Pobierz bilety",
          es: "Descargar entradas",
          fr: "Télécharger les billets",
          ja: "チケットをダウンロード",
        },
      },

      // ============================================================
      // CATEGORY: ALERT MESSAGES (for downloads)
      // ============================================================
      {
        key: "ui.checkout.confirmation.alerts.session_not_found",
        values: {
          en: "Checkout session not found. Please refresh the page.",
          de: "Checkout-Sitzung nicht gefunden. Bitte aktualisieren Sie die Seite.",
          pl: "Nie znaleziono sesji kasy. Odśwież stronę.",
          es: "Sesión de pago no encontrada. Por favor, actualiza la página.",
          fr: "Session de paiement introuvable. Veuillez actualiser la page.",
          ja: "チェックアウトセッションが見つかりません。ページを更新してください。",
        },
      },
      {
        key: "ui.checkout.confirmation.alerts.receipt_download_failed",
        values: {
          en: "Failed to download receipt. Please try again.",
          de: "Download der Quittung fehlgeschlagen. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się pobrać potwierdzenia. Spróbuj ponownie.",
          es: "Error al descargar el recibo. Por favor, inténtalo de nuevo.",
          fr: "Échec du téléchargement du reçu. Veuillez réessayer.",
          ja: "領収書のダウンロードに失敗しました。もう一度お試しください。",
        },
      },
      {
        key: "ui.checkout.confirmation.alerts.no_tickets_found",
        values: {
          en: "No tickets found. Please contact support.",
          de: "Keine Tickets gefunden. Bitte kontaktieren Sie den Support.",
          pl: "Nie znaleziono biletów. Skontaktuj się z pomocą techniczną.",
          es: "No se encontraron entradas. Por favor, contacta con soporte.",
          fr: "Aucun billet trouvé. Veuillez contacter le support.",
          ja: "チケットが見つかりません。サポートにお問い合わせください。",
        },
      },
      {
        key: "ui.checkout.confirmation.alerts.tickets_download_failed",
        values: {
          en: "Failed to download tickets. Please try again.",
          de: "Download der Tickets fehlgeschlagen. Bitte versuchen Sie es erneut.",
          pl: "Nie udało się pobrać biletów. Spróbuj ponownie.",
          es: "Error al descargar las entradas. Por favor, inténtalo de nuevo.",
          fr: "Échec du téléchargement des billets. Veuillez réessayer.",
          ja: "チケットのダウンロードに失敗しました。もう一度お試しください。",
        },
      },

      // ============================================================
      // CATEGORY: SUPPORT INFORMATION
      // ============================================================
      {
        key: "ui.checkout.confirmation.support.contact_text",
        values: {
          en: "Questions? Contact us at",
          de: "Fragen? Kontaktieren Sie uns unter",
          pl: "Pytania? Skontaktuj się z nami pod adresem",
          es: "¿Preguntas? Contáctanos en",
          fr: "Des questions ? Contactez-nous à",
          ja: "ご質問は",
        },
      },
      {
        key: "ui.checkout.confirmation.support.email",
        values: {
          en: "support@example.com",
          de: "support@example.com",
          pl: "support@example.com",
          es: "support@example.com",
          fr: "support@example.com",
          ja: "support@example.com",
        },
      },
    ];

    // Get existing keys to avoid duplicates
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
            "confirmation"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} confirmation translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  },
});
