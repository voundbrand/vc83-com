/**
 * SEED CHECKOUT SUCCESS TRANSLATIONS
 *
 * Seeds translations for the Checkout Success Window
 * Namespace: ui.checkout_success
 *
 * Run: npx convex run translations/seedCheckoutSuccess:seed
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

// Define translation value type
type TranslationValues = {
  en: string;
  de: string;
  pl: string;
  es: string;
  fr: string;
  ja: string;
};

const translations: Array<{ key: string; values: TranslationValues }> = [
  // Main Title
  {
    key: "ui.checkout_success.title",
    values: {
      en: "Payment Successful! 🎉",
      de: "Zahlung erfolgreich! 🎉",
      pl: "Płatność udana! 🎉",
      es: "¡Pago exitoso! 🎉",
      fr: "Paiement réussi! 🎉",
      ja: "お支払い完了！🎉",
    },
  },
  {
    key: "ui.checkout_success.thank_you",
    values: {
      en: "Thank you for your purchase!",
      de: "Vielen Dank für Ihren Kauf!",
      pl: "Dziękujemy za zakup!",
      es: "¡Gracias por tu compra!",
      fr: "Merci pour votre achat!",
      ja: "ご購入ありがとうございます！",
    },
  },
  {
    key: "ui.checkout_success.subtitle",
    values: {
      en: "Your order has been confirmed and is being processed.",
      de: "Ihre Bestellung wurde bestätigt und wird bearbeitet.",
      pl: "Twoje zamówienie zostało potwierdzone i jest przetwarzane.",
      es: "Tu pedido ha sido confirmado y está siendo procesado.",
      fr: "Votre commande a été confirmée et est en cours de traitement.",
      ja: "ご注文が確認され、処理中です。",
    },
  },

  // Order Confirmed Card
  {
    key: "ui.checkout_success.order_confirmed_title",
    values: {
      en: "Order Confirmed",
      de: "Bestellung bestätigt",
      pl: "Zamówienie potwierdzone",
      es: "Pedido confirmado",
      fr: "Commande confirmée",
      ja: "注文確認済み",
    },
  },
  {
    key: "ui.checkout_success.order_confirmed_message",
    values: {
      en: "Your order is being processed and you'll receive access to your purchase shortly.",
      de: "Ihre Bestellung wird bearbeitet und Sie erhalten in Kürze Zugriff auf Ihren Kauf.",
      pl: "Twoje zamówienie jest przetwarzane i wkrótce otrzymasz dostęp do zakupu.",
      es: "Tu pedido está siendo procesado y recibirás acceso a tu compra en breve.",
      fr: "Votre commande est en cours de traitement et vous recevrez l'accès à votre achat sous peu.",
      ja: "ご注文を処理中です。まもなく購入商品へのアクセスが可能になります。",
    },
  },

  // Email Confirmation Card
  {
    key: "ui.checkout_success.email_title",
    values: {
      en: "Confirmation Email Sent",
      de: "Bestätigungs-E-Mail gesendet",
      pl: "Wysłano e-mail z potwierdzeniem",
      es: "Correo de confirmación enviado",
      fr: "E-mail de confirmation envoyé",
      ja: "確認メールを送信しました",
    },
  },
  {
    key: "ui.checkout_success.email_message",
    values: {
      en: "We've sent a confirmation email with your order details and receipt. Check your inbox!",
      de: "Wir haben Ihnen eine Bestätigungs-E-Mail mit Ihren Bestelldetails und der Quittung gesendet. Überprüfen Sie Ihren Posteingang!",
      pl: "Wysłaliśmy e-mail z potwierdzeniem zawierający szczegóły zamówienia i paragon. Sprawdź swoją skrzynkę!",
      es: "Hemos enviado un correo de confirmación con los detalles de tu pedido y el recibo. ¡Revisa tu bandeja de entrada!",
      fr: "Nous avons envoyé un e-mail de confirmation avec les détails de votre commande et le reçu. Vérifiez votre boîte de réception!",
      ja: "ご注文の詳細と領収書を記載した確認メールを送信しました。受信トレイをご確認ください！",
    },
  },

  // Next Steps Card
  {
    key: "ui.checkout_success.next_steps_title",
    values: {
      en: "What's Next?",
      de: "Wie geht es weiter?",
      pl: "Co dalej?",
      es: "¿Qué sigue?",
      fr: "Et maintenant?",
      ja: "次は何をすれば？",
    },
  },
  {
    key: "ui.checkout_success.next_steps_message",
    values: {
      en: "You can now access your purchased items from the Start Menu. Close this window to continue exploring l4yercak3!",
      de: "Sie können jetzt über das Startmenü auf Ihre gekauften Artikel zugreifen. Schließen Sie dieses Fenster, um l4yercak3 weiter zu erkunden!",
      pl: "Możesz teraz uzyskać dostęp do zakupionych przedmiotów z menu Start. Zamknij to okno, aby kontynuować eksplorację l4yercak3!",
      es: "Ahora puedes acceder a tus artículos comprados desde el menú Inicio. ¡Cierra esta ventana para continuar explorando l4yercak3!",
      fr: "Vous pouvez maintenant accéder à vos articles achetés depuis le menu Démarrer. Fermez cette fenêtre pour continuer à explorer l4yercak3!",
      ja: "スタートメニューから購入したアイテムにアクセスできます。このウィンドウを閉じてl4yercak3の探索を続けましょう！",
    },
  },

  // Footer
  {
    key: "ui.checkout_success.footer_title",
    values: {
      en: "Thank you for choosing l4yercak3! 🚀",
      de: "Vielen Dank, dass Sie sich für l4yercak3 entschieden haben! 🚀",
      pl: "Dziękujemy za wybór l4yercak3! 🚀",
      es: "¡Gracias por elegir l4yercak3! 🚀",
      fr: "Merci d'avoir choisi l4yercak3! 🚀",
      ja: "l4yercak3をお選びいただきありがとうございます！🚀",
    },
  },
  {
    key: "ui.checkout_success.footer_message",
    values: {
      en: "We appreciate your business and look forward to powering your workflow.",
      de: "Wir schätzen Ihr Geschäft und freuen uns darauf, Ihren Workflow zu unterstützen.",
      pl: "Doceniamy Twoją współpracę i nie możemy się doczekać wspierania Twojego przepływu pracy.",
      es: "Apreciamos tu negocio y esperamos impulsar tu flujo de trabajo.",
      fr: "Nous apprécions votre confiance et sommes impatients d'optimiser votre flux de travail.",
      ja: "ご利用いただきありがとうございます。お客様のワークフローをサポートできることを楽しみにしています。",
    },
  },
];

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Success translations...");

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

    // Get existing translations to avoid duplicates
    const existingKeys = await getExistingTranslationKeys(
      ctx.db,
      systemOrg._id,
      translations.map(t => t.key)
    );

    let insertedCount = 0;
    let skippedCount = 0;

    // Insert all translations
    for (const translation of translations) {
      for (const locale of supportedLocales) {
        const value = translation.values[locale.code as keyof TranslationValues];
        if (!value) continue;

        const wasInserted = await insertTranslationIfNew(
          ctx.db,
          existingKeys,
          systemOrg._id,
          systemUser._id,
          translation.key,
          value,
          locale.code,
          "checkout",
          "checkout-success"
        );

        if (wasInserted) {
          insertedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log(
      `✅ Seeded ${insertedCount} new Checkout Success translations (skipped ${skippedCount} existing)`
    );

    return {
      success: true,
      insertedCount,
      skippedCount,
      keysCount: translations.length,
    };
  },
});

export default seed;
