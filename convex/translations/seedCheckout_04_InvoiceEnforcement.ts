/**
 * SEED FILE: Invoice Enforcement Step Translations
 *
 * This file contains ALL translation keys for the invoice enforcement checkout step.
 * This step appears when payment rules engine enforces invoice payment based on employer selection.
 * Total Keys: ~45 unique keys × 6 languages = ~270 translations
 *
 * KEY NAMING CONVENTION:
 * ui.checkout.invoice_enforcement.{category}.{field}
 *
 * Categories:
 * - errors: Error messages when enforcement details unavailable
 * - headers: Page title and description
 * - notice: Invoice enforcement notice with employer and terms
 * - workflow: Step-by-step process explanation (4 steps)
 * - order_summary: Products, add-ons, pricing breakdown
 * - tax: Tax display labels
 * - totals: Subtotal and total labels
 * - acknowledgment: User acknowledgment checklist
 * - buttons: Navigation buttons
 * - info_badge: Bottom information notice
 *
 * Languages: English (en), German (de), Polish (pl), Spanish (es), French (fr), Japanese (ja)
 *
 * USAGE IN COMPONENT:
 * const { t } = useTranslation();
 * <h2>{t("ui.checkout.invoice_enforcement.headers.title")}</h2>
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout - Invoice Enforcement Step...");

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
      // CATEGORY: ERROR MESSAGES
      // ============================================================
      {
        key: "ui.checkout.invoice_enforcement.errors.details_unavailable",
        values: {
          en: "Error: Invoice enforcement details not available",
          de: "Fehler: Details zur Rechnungsdurchsetzung nicht verfügbar",
          pl: "Błąd: Szczegóły wymuszenia faktury niedostępne",
          es: "Error: Detalles de aplicación de factura no disponibles",
          fr: "Erreur : Détails d'application de facture non disponibles",
          ja: "エラー：請求書強制詳細が利用できません",
        },
      },

      // ============================================================
      // CATEGORY: HEADERS
      // ============================================================
      {
        key: "ui.checkout.invoice_enforcement.headers.title",
        values: {
          en: "Invoice Payment Confirmation",
          de: "Bestätigung der Rechnungszahlung",
          pl: "Potwierdzenie płatności faktury",
          es: "Confirmación de pago de factura",
          fr: "Confirmation de paiement de facture",
          ja: "請求書支払い確認",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.headers.description",
        values: {
          en: "Based on your employer selection, this registration will be invoiced.",
          de: "Basierend auf Ihrer Arbeitgeberauswahl wird diese Registrierung in Rechnung gestellt.",
          pl: "Na podstawie wyboru pracodawcy ta rejestracja zostanie zafakturowana.",
          es: "Según la selección de su empleador, este registro será facturado.",
          fr: "En fonction de votre sélection d'employeur, cette inscription sera facturée.",
          ja: "雇用主の選択に基づき、この登録は請求されます。",
        },
      },

      // ============================================================
      // CATEGORY: ENFORCEMENT NOTICE
      // ============================================================
      {
        key: "ui.checkout.invoice_enforcement.notice.title",
        values: {
          en: "Invoice Will Be Sent To",
          de: "Rechnung wird gesendet an",
          pl: "Faktura zostanie wysłana do",
          es: "La factura se enviará a",
          fr: "La facture sera envoyée à",
          ja: "請求書送付先",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.notice.payment_terms_label",
        values: {
          en: "Payment Terms:",
          de: "Zahlungsbedingungen:",
          pl: "Warunki płatności:",
          es: "Condiciones de pago:",
          fr: "Conditions de paiement :",
          ja: "支払条件：",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.notice.payment_terms_net30",
        values: {
          en: "Net 30 (payment due within 30 days)",
          de: "Netto 30 (Zahlung fällig innerhalb von 30 Tagen)",
          pl: "Netto 30 (płatność w ciągu 30 dni)",
          es: "Neto 30 (pago vence en 30 días)",
          fr: "Net 30 (paiement dû sous 30 jours)",
          ja: "ネット30日（30日以内にお支払い）",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.notice.payment_terms_net60",
        values: {
          en: "Net 60 (payment due within 60 days)",
          de: "Netto 60 (Zahlung fällig innerhalb von 60 Tagen)",
          pl: "Netto 60 (płatność w ciągu 60 dni)",
          es: "Neto 60 (pago vence en 60 días)",
          fr: "Net 60 (paiement dû sous 60 jours)",
          ja: "ネット60日（60日以内にお支払い）",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.notice.payment_terms_net90",
        values: {
          en: "Net 90 (payment due within 90 days)",
          de: "Netto 90 (Zahlung fällig innerhalb von 90 Tagen)",
          pl: "Netto 90 (płatność w ciągu 90 dni)",
          es: "Neto 90 (pago vence en 90 días)",
          fr: "Net 90 (paiement dû sous 90 jours)",
          ja: "ネット90日（90日以内にお支払い）",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.notice.invoice_amount_label",
        values: {
          en: "Invoice Amount:",
          de: "Rechnungsbetrag:",
          pl: "Kwota faktury:",
          es: "Monto de la factura:",
          fr: "Montant de la facture :",
          ja: "請求金額：",
        },
      },

      // ============================================================
      // CATEGORY: WORKFLOW STEPS
      // ============================================================
      {
        key: "ui.checkout.invoice_enforcement.workflow.section_title",
        values: {
          en: "How This Works",
          de: "So funktioniert es",
          pl: "Jak to działa",
          es: "Cómo funciona esto",
          fr: "Comment ça marche",
          ja: "仕組み",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.workflow.step1_title",
        values: {
          en: "Complete Your Registration",
          de: "Schließen Sie Ihre Registrierung ab",
          pl: "Dokończ rejestrację",
          es: "Complete su registro",
          fr: "Complétez votre inscription",
          ja: "登録を完了",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.workflow.step1_description",
        values: {
          en: "You'll confirm your registration in the next step",
          de: "Sie bestätigen Ihre Registrierung im nächsten Schritt",
          pl: "Potwierdzisz rejestrację w następnym kroku",
          es: "Confirmará su registro en el siguiente paso",
          fr: "Vous confirmerez votre inscription à l'étape suivante",
          ja: "次のステップで登録を確認します",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.workflow.step2_title",
        values: {
          en: "Invoice Sent to {employerName}",
          de: "Rechnung gesendet an {employerName}",
          pl: "Faktura wysłana do {employerName}",
          es: "Factura enviada a {employerName}",
          fr: "Facture envoyée à {employerName}",
          ja: "{employerName}に請求書送信",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.workflow.step2_description",
        values: {
          en: "An invoice for {amount} will be generated and sent to your employer",
          de: "Eine Rechnung über {amount} wird erstellt und an Ihren Arbeitgeber gesendet",
          pl: "Faktura na kwotę {amount} zostanie wygenerowana i wysłana do pracodawcy",
          es: "Se generará y enviará una factura por {amount} a su empleador",
          fr: "Une facture de {amount} sera générée et envoyée à votre employeur",
          ja: "{amount}の請求書が生成され、雇用主に送信されます",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.workflow.step3_title",
        values: {
          en: "Employer Pays Invoice",
          de: "Arbeitgeber zahlt Rechnung",
          pl: "Pracodawca płaci fakturę",
          es: "El empleador paga la factura",
          fr: "L'employeur paie la facture",
          ja: "雇用主が請求書を支払う",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.workflow.step3_description",
        values: {
          en: "Payment due within {days} days of invoice date",
          de: "Zahlung fällig innerhalb von {days} Tagen ab Rechnungsdatum",
          pl: "Płatność w ciągu {days} dni od daty faktury",
          es: "Pago vence en {days} días desde la fecha de la factura",
          fr: "Paiement dû sous {days} jours à compter de la date de facture",
          ja: "請求日から{days}日以内にお支払い",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.workflow.step4_title",
        values: {
          en: "Receive Your Tickets",
          de: "Erhalten Sie Ihre Tickets",
          pl: "Otrzymaj bilety",
          es: "Reciba sus entradas",
          fr: "Recevez vos billets",
          ja: "チケットを受け取る",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.workflow.step4_description",
        values: {
          en: "Tickets will be delivered to {email} after invoice acceptance",
          de: "Tickets werden an {email} geliefert nach Rechnungsannahme",
          pl: "Bilety zostaną dostarczone na {email} po przyjęciu faktury",
          es: "Las entradas se entregarán a {email} después de la aceptación de la factura",
          fr: "Les billets seront livrés à {email} après acceptation de la facture",
          ja: "請求書受理後、{email}にチケットが配信されます",
        },
      },

      // ============================================================
      // CATEGORY: ORDER SUMMARY
      // ============================================================
      {
        key: "ui.checkout.invoice_enforcement.order_summary.title",
        values: {
          en: "Order Summary",
          de: "Bestellübersicht",
          pl: "Podsumowanie zamówienia",
          es: "Resumen del pedido",
          fr: "Résumé de la commande",
          ja: "注文概要",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.order_summary.quantity_label",
        values: {
          en: "Quantity: {quantity}",
          de: "Menge: {quantity}",
          pl: "Ilość: {quantity}",
          es: "Cantidad: {quantity}",
          fr: "Quantité : {quantity}",
          ja: "数量：{quantity}",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.order_summary.addons_label",
        values: {
          en: "Add-ons:",
          de: "Extras:",
          pl: "Dodatki:",
          es: "Complementos:",
          fr: "Suppléments :",
          ja: "追加オプション：",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.order_summary.ticket_extras",
        values: {
          en: "Ticket {ticketNumber} extras",
          de: "Ticket {ticketNumber} Extras",
          pl: "Dodatki do biletu {ticketNumber}",
          es: "Extras del boleto {ticketNumber}",
          fr: "Suppléments du billet {ticketNumber}",
          ja: "チケット{ticketNumber}の追加",
        },
      },

      // ============================================================
      // CATEGORY: TAX & TOTALS
      // ============================================================
      {
        key: "ui.checkout.invoice_enforcement.totals.subtotal_label",
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
        key: "ui.checkout.invoice_enforcement.tax.label",
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
        key: "ui.checkout.invoice_enforcement.tax.included_label",
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
        key: "ui.checkout.invoice_enforcement.tax.added_label",
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
        key: "ui.checkout.invoice_enforcement.totals.total_amount_label",
        values: {
          en: "Total Amount:",
          de: "Gesamtbetrag:",
          pl: "Łączna kwota:",
          es: "Monto total:",
          fr: "Montant total :",
          ja: "合計金額：",
        },
      },

      // ============================================================
      // CATEGORY: ACKNOWLEDGMENT
      // ============================================================
      {
        key: "ui.checkout.invoice_enforcement.acknowledgment.title",
        values: {
          en: "Acknowledgment",
          de: "Bestätigung",
          pl: "Potwierdzenie",
          es: "Reconocimiento",
          fr: "Reconnaissance",
          ja: "確認事項",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.acknowledgment.intro",
        values: {
          en: "By continuing, you acknowledge that:",
          de: "Indem Sie fortfahren, bestätigen Sie, dass:",
          pl: "Kontynuując, potwierdzasz, że:",
          es: "Al continuar, reconoce que:",
          fr: "En continuant, vous reconnaissez que :",
          ja: "続行することで、以下を確認します：",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.acknowledgment.item1",
        values: {
          en: "An invoice for {amount} will be generated",
          de: "Eine Rechnung über {amount} wird erstellt",
          pl: "Zostanie wygenerowana faktura na kwotę {amount}",
          es: "Se generará una factura por {amount}",
          fr: "Une facture de {amount} sera générée",
          ja: "{amount}の請求書が生成されます",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.acknowledgment.item2",
        values: {
          en: "The invoice will be sent to {employerName}",
          de: "Die Rechnung wird an {employerName} gesendet",
          pl: "Faktura zostanie wysłana do {employerName}",
          es: "La factura se enviará a {employerName}",
          fr: "La facture sera envoyée à {employerName}",
          ja: "請求書は{employerName}に送信されます",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.acknowledgment.item3",
        values: {
          en: "Payment is due within {days} days of invoice date",
          de: "Zahlung ist fällig innerhalb von {days} Tagen ab Rechnungsdatum",
          pl: "Płatność jest wymagana w ciągu {days} dni od daty faktury",
          es: "El pago vence en {days} días desde la fecha de la factura",
          fr: "Le paiement est dû sous {days} jours à compter de la date de facture",
          ja: "請求日から{days}日以内にお支払いが必要です",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.acknowledgment.item4",
        values: {
          en: "Your registration will be confirmed upon invoice acceptance",
          de: "Ihre Registrierung wird nach Rechnungsannahme bestätigt",
          pl: "Twoja rejestracja zostanie potwierdzona po przyjęciu faktury",
          es: "Su registro se confirmará al aceptar la factura",
          fr: "Votre inscription sera confirmée lors de l'acceptation de la facture",
          ja: "請求書受理後、登録が確認されます",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.acknowledgment.item5",
        values: {
          en: "Tickets will be delivered to: {email}",
          de: "Tickets werden geliefert an: {email}",
          pl: "Bilety zostaną dostarczone na: {email}",
          es: "Las entradas se entregarán a: {email}",
          fr: "Les billets seront livrés à : {email}",
          ja: "チケットは{email}に配信されます",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.acknowledgment.item6",
        values: {
          en: "You have authorization from your employer to make this purchase",
          de: "Sie haben die Genehmigung Ihres Arbeitgebers für diesen Kauf",
          pl: "Masz upoważnienie od pracodawcy do dokonania tego zakupu",
          es: "Tiene autorización de su empleador para realizar esta compra",
          fr: "Vous avez l'autorisation de votre employeur pour effectuer cet achat",
          ja: "この購入について雇用主の承認を得ています",
        },
      },

      // ============================================================
      // CATEGORY: BUTTONS
      // ============================================================
      {
        key: "ui.checkout.invoice_enforcement.buttons.back",
        values: {
          en: "Back",
          de: "Zurück",
          pl: "Wstecz",
          es: "Atrás",
          fr: "Retour",
          ja: "戻る",
        },
      },
      {
        key: "ui.checkout.invoice_enforcement.buttons.continue",
        values: {
          en: "Continue to Invoice Payment →",
          de: "Weiter zur Rechnungszahlung →",
          pl: "Kontynuuj do płatności fakturą →",
          es: "Continuar al pago de factura →",
          fr: "Continuer vers le paiement de facture →",
          ja: "請求書支払いに進む →",
        },
      },

      // ============================================================
      // CATEGORY: INFO BADGE
      // ============================================================
      {
        key: "ui.checkout.invoice_enforcement.info_badge.message",
        values: {
          en: "📄 No immediate payment required - Invoice will be sent to {employerName}",
          de: "📄 Keine sofortige Zahlung erforderlich - Rechnung wird an {employerName} gesendet",
          pl: "📄 Nie wymaga natychmiastowej płatności - Faktura zostanie wysłana do {employerName}",
          es: "📄 No se requiere pago inmediato - La factura se enviará a {employerName}",
          fr: "📄 Aucun paiement immédiat requis - La facture sera envoyée à {employerName}",
          ja: "📄 即時支払い不要 - 請求書は{employerName}に送信されます",
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
            "invoice_enforcement"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} invoice enforcement translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  },
});
