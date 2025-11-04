/**
 * SEED CHECKOUT TRANSLATIONS - PAYMENT FORM STEP
 *
 * Complete translation seed for payment-form-step.tsx component
 *
 * Component: src/components/checkout/steps/payment-form-step.tsx
 * Namespace: ui.checkout.payment_form
 * Languages: en, de, pl, es, fr, ja
 */

import { internalMutation } from "../_generated/server";
import { getExistingTranslationKeys, insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout - Payment Form Step...");

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
        key: "ui.checkout.payment_form.headers.payment",
        values: {
          en: "Payment",
          de: "Zahlung",
          pl: "Płatność",
          es: "Pago",
          fr: "Paiement",
          ja: "支払い",
        }
      },
      {
        key: "ui.checkout.payment_form.headers.subtitle",
        values: {
          en: "Complete your purchase securely.",
          de: "Schließen Sie Ihren Kauf sicher ab.",
          pl: "Dokończ zakup bezpiecznie.",
          es: "Completa tu compra de forma segura.",
          fr: "Complétez votre achat en toute sécurité.",
          ja: "安全に購入を完了してください。",
        }
      },
      {
        key: "ui.checkout.payment_form.headers.order_summary",
        values: {
          en: "Order Summary",
          de: "Bestellübersicht",
          pl: "Podsumowanie zamówienia",
          es: "Resumen del pedido",
          fr: "Récapitulatif de la commande",
          ja: "注文概要",
        }
      },
      {
        key: "ui.checkout.payment_form.headers.payment_details",
        values: {
          en: "Payment Details",
          de: "Zahlungsdetails",
          pl: "Szczegóły płatności",
          es: "Detalles de pago",
          fr: "Détails du paiement",
          ja: "支払い詳細",
        }
      },
      {
        key: "ui.checkout.payment_form.headers.invoice_payment",
        values: {
          en: "📄 Invoice Payment",
          de: "📄 Rechnungszahlung",
          pl: "📄 Płatność fakturą",
          es: "📄 Pago con factura",
          fr: "📄 Paiement par facture",
          ja: "📄 請求書支払い",
        }
      },

      // ============================================================
      // PAYMENT PROVIDER MESSAGES
      // ============================================================
      {
        key: "ui.checkout.payment_form.provider_not_implemented",
        values: {
          en: "Payment provider \"{provider}\" is not yet implemented.",
          de: "Zahlungsanbieter \"{provider}\" ist noch nicht implementiert.",
          pl: "Dostawca płatności \"{provider}\" nie jest jeszcze zaimplementowany.",
          es: "El proveedor de pago \"{provider}\" aún no está implementado.",
          fr: "Le fournisseur de paiement \"{provider}\" n'est pas encore implémenté.",
          ja: "支払いプロバイダー \"{provider}\" はまだ実装されていません。",
        }
      },
      {
        key: "ui.checkout.payment_form.go_back",
        values: {
          en: "← Go Back",
          de: "← Zurück",
          pl: "← Wróć",
          es: "← Volver",
          fr: "← Retour",
          ja: "← 戻る",
        }
      },

      // ============================================================
      // STRIPE PAYMENT FORM
      // ============================================================
      {
        key: "ui.checkout.payment_form.stripe.card_details_label",
        values: {
          en: "Card Details",
          de: "Kartendetails",
          pl: "Szczegóły karty",
          es: "Detalles de la tarjeta",
          fr: "Détails de la carte",
          ja: "カード詳細",
        }
      },
      {
        key: "ui.checkout.payment_form.stripe.loading_payment_form",
        values: {
          en: "Loading payment form...",
          de: "Zahlungsformular wird geladen...",
          pl: "Ładowanie formularza płatności...",
          es: "Cargando formulario de pago...",
          fr: "Chargement du formulaire de paiement...",
          ja: "支払いフォームを読み込んでいます...",
        }
      },
      {
        key: "ui.checkout.payment_form.stripe.security_notice",
        values: {
          en: "🔒 Your payment information is encrypted and secure. We never store your card details.",
          de: "🔒 Ihre Zahlungsinformationen sind verschlüsselt und sicher. Wir speichern Ihre Kartendaten niemals.",
          pl: "🔒 Twoje dane płatności są zaszyfrowane i bezpieczne. Nigdy nie przechowujemy danych Twojej karty.",
          es: "🔒 Tu información de pago está encriptada y segura. Nunca almacenamos los detalles de tu tarjeta.",
          fr: "🔒 Vos informations de paiement sont cryptées et sécurisées. Nous ne stockons jamais les détails de votre carte.",
          ja: "🔒 お客様の支払い情報は暗号化され、安全です。カード情報を保存することはありません。",
        }
      },
      {
        key: "ui.checkout.payment_form.stripe.config_error",
        values: {
          en: "Stripe is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env.local file. Get your key from: https://dashboard.stripe.com/test/apikeys",
          de: "Stripe ist nicht konfiguriert. Bitte fügen Sie NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY zu Ihrer .env.local-Datei hinzu. Holen Sie sich Ihren Schlüssel von: https://dashboard.stripe.com/test/apikeys",
          pl: "Stripe nie jest skonfigurowany. Dodaj NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY do pliku .env.local. Pobierz klucz z: https://dashboard.stripe.com/test/apikeys",
          es: "Stripe no está configurado. Agrega NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY a tu archivo .env.local. Obtén tu clave de: https://dashboard.stripe.com/test/apikeys",
          fr: "Stripe n'est pas configuré. Veuillez ajouter NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY à votre fichier .env.local. Obtenez votre clé depuis: https://dashboard.stripe.com/test/apikeys",
          ja: "Stripeが設定されていません。.env.localファイルにNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEYを追加してください。キーを取得: https://dashboard.stripe.com/test/apikeys",
        }
      },
      {
        key: "ui.checkout.payment_form.stripe.load_failed",
        values: {
          en: "Failed to load Stripe. Please check your publishable key.",
          de: "Stripe konnte nicht geladen werden. Bitte überprüfen Sie Ihren veröffentlichbaren Schlüssel.",
          pl: "Nie udało się załadować Stripe. Sprawdź swój klucz publiczny.",
          es: "No se pudo cargar Stripe. Verifica tu clave publicable.",
          fr: "Échec du chargement de Stripe. Veuillez vérifier votre clé publiable.",
          ja: "Stripeの読み込みに失敗しました。公開可能キーを確認してください。",
        }
      },
      {
        key: "ui.checkout.payment_form.stripe.init_failed",
        values: {
          en: "Failed to initialize payment. Please refresh and try again.",
          de: "Zahlung konnte nicht initialisiert werden. Bitte aktualisieren und erneut versuchen.",
          pl: "Nie udało się zainicjować płatności. Odśwież stronę i spróbuj ponownie.",
          es: "No se pudo inicializar el pago. Actualiza y vuelve a intentarlo.",
          fr: "Échec de l'initialisation du paiement. Veuillez actualiser et réessayer.",
          ja: "支払いの初期化に失敗しました。更新して再試行してください。",
        }
      },

      // ============================================================
      // ORDER SUMMARY - CUSTOMER INFO
      // ============================================================
      {
        key: "ui.checkout.payment_form.order_summary.email",
        values: {
          en: "Email:",
          de: "E-Mail:",
          pl: "E-mail:",
          es: "Correo electrónico:",
          fr: "E-mail:",
          ja: "メール:",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.name",
        values: {
          en: "Name:",
          de: "Name:",
          pl: "Nazwisko:",
          es: "Nombre:",
          fr: "Nom:",
          ja: "名前:",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.phone",
        values: {
          en: "Phone:",
          de: "Telefon:",
          pl: "Telefon:",
          es: "Teléfono:",
          fr: "Téléphone:",
          ja: "電話:",
        }
      },

      // ============================================================
      // ORDER SUMMARY - ITEMS
      // ============================================================
      {
        key: "ui.checkout.payment_form.order_summary.items",
        values: {
          en: "Items:",
          de: "Artikel:",
          pl: "Pozycje:",
          es: "Artículos:",
          fr: "Articles:",
          ja: "商品:",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.product_fallback",
        values: {
          en: "Product {number}",
          de: "Produkt {number}",
          pl: "Produkt {number}",
          es: "Producto {number}",
          fr: "Produit {number}",
          ja: "製品 {number}",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.ticket_addon",
        values: {
          en: "(Ticket {number})",
          de: "(Ticket {number})",
          pl: "(Bilet {number})",
          es: "(Ticket {number})",
          fr: "(Billet {number})",
          ja: "(チケット {number})",
        }
      },

      // ============================================================
      // ORDER SUMMARY - PRICING
      // ============================================================
      {
        key: "ui.checkout.payment_form.order_summary.subtotal",
        values: {
          en: "Subtotal ({count} {itemText})",
          de: "Zwischensumme ({count} {itemText})",
          pl: "Suma częściowa ({count} {itemText})",
          es: "Subtotal ({count} {itemText})",
          fr: "Sous-total ({count} {itemText})",
          ja: "小計 ({count} {itemText})",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.item_singular",
        values: {
          en: "item",
          de: "Artikel",
          pl: "pozycja",
          es: "artículo",
          fr: "article",
          ja: "個",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.item_plural",
        values: {
          en: "items",
          de: "Artikel",
          pl: "pozycje",
          es: "artículos",
          fr: "articles",
          ja: "個",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.tax_rate",
        values: {
          en: "Tax ({rate}%)",
          de: "Steuer ({rate}%)",
          pl: "Podatek ({rate}%)",
          es: "Impuesto ({rate}%)",
          fr: "Taxe ({rate}%)",
          ja: "税 ({rate}%)",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.tax_inclusive",
        values: {
          en: "💶 included",
          de: "💶 inklusive",
          pl: "💶 wliczone",
          es: "💶 incluido",
          fr: "💶 inclus",
          ja: "💶 含まれる",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.tax_exclusive",
        values: {
          en: "💵 added",
          de: "💵 hinzugefügt",
          pl: "💵 dodano",
          es: "💵 añadido",
          fr: "💵 ajouté",
          ja: "💵 追加",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.tax_items_count",
        values: {
          en: "{count} items",
          de: "{count} Artikel",
          pl: "{count} pozycji",
          es: "{count} artículos",
          fr: "{count} articles",
          ja: "{count}個",
        }
      },
      {
        key: "ui.checkout.payment_form.order_summary.total",
        values: {
          en: "Total:",
          de: "Gesamt:",
          pl: "Suma:",
          es: "Total:",
          fr: "Total:",
          ja: "合計:",
        }
      },

      // ============================================================
      // BUTTONS & ACTIONS
      // ============================================================
      {
        key: "ui.checkout.payment_form.buttons.back",
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
        key: "ui.checkout.payment_form.buttons.processing",
        values: {
          en: "Processing...",
          de: "Verarbeitung läuft...",
          pl: "Przetwarzanie...",
          es: "Procesando...",
          fr: "Traitement en cours...",
          ja: "処理中...",
        }
      },
      {
        key: "ui.checkout.payment_form.buttons.complete_purchase",
        values: {
          en: "Complete Purchase {amount}",
          de: "Kauf abschließen {amount}",
          pl: "Zakończ zakup {amount}",
          es: "Completar compra {amount}",
          fr: "Finaliser l'achat {amount}",
          ja: "購入を完了 {amount}",
        }
      },
      {
        key: "ui.checkout.payment_form.buttons.complete_registration",
        values: {
          en: "Complete Registration →",
          de: "Registrierung abschließen →",
          pl: "Zakończ rejestrację →",
          es: "Completar registro →",
          fr: "Terminer l'inscription →",
          ja: "登録を完了 →",
        }
      },
      {
        key: "ui.checkout.payment_form.buttons.creating_invoice",
        values: {
          en: "Creating Invoice...",
          de: "Rechnung wird erstellt...",
          pl: "Tworzenie faktury...",
          es: "Creando factura...",
          fr: "Création de la facture...",
          ja: "請求書を作成中...",
        }
      },

      // ============================================================
      // ERROR MESSAGES
      // ============================================================
      {
        key: "ui.checkout.payment_form.errors.payment_not_initialized",
        values: {
          en: "Payment not initialized. Please refresh the page.",
          de: "Zahlung nicht initialisiert. Bitte aktualisieren Sie die Seite.",
          pl: "Płatność nie została zainicjowana. Odśwież stronę.",
          es: "Pago no inicializado. Actualiza la página.",
          fr: "Paiement non initialisé. Veuillez actualiser la page.",
          ja: "支払いが初期化されていません。ページを更新してください。",
        }
      },
      {
        key: "ui.checkout.payment_form.errors.session_not_found",
        values: {
          en: "Checkout session not found. Please refresh the page.",
          de: "Checkout-Sitzung nicht gefunden. Bitte aktualisieren Sie die Seite.",
          pl: "Sesja kasy nie została znaleziona. Odśwież stronę.",
          es: "Sesión de pago no encontrada. Actualiza la página.",
          fr: "Session de paiement introuvable. Veuillez actualiser la page.",
          ja: "チェックアウトセッションが見つかりません。ページを更新してください。",
        }
      },
      {
        key: "ui.checkout.payment_form.errors.card_incomplete",
        values: {
          en: "Please enter complete card details.",
          de: "Bitte geben Sie vollständige Kartendetails ein.",
          pl: "Wprowadź pełne dane karty.",
          es: "Ingresa los detalles completos de la tarjeta.",
          fr: "Veuillez entrer les détails complets de la carte.",
          ja: "カード情報を完全に入力してください。",
        }
      },
      {
        key: "ui.checkout.payment_form.errors.payment_not_successful",
        values: {
          en: "Payment was not successful. Please try again.",
          de: "Zahlung war nicht erfolgreich. Bitte versuchen Sie es erneut.",
          pl: "Płatność nie powiodła się. Spróbuj ponownie.",
          es: "El pago no fue exitoso. Inténtalo de nuevo.",
          fr: "Le paiement n'a pas abouti. Veuillez réessayer.",
          ja: "支払いが成功しませんでした。再試行してください。",
        }
      },
      {
        key: "ui.checkout.payment_form.errors.payment_failed",
        values: {
          en: "Payment failed",
          de: "Zahlung fehlgeschlagen",
          pl: "Płatność nie powiodła się",
          es: "Pago fallido",
          fr: "Échec du paiement",
          ja: "支払いに失敗しました",
        }
      },
      {
        key: "ui.checkout.payment_form.errors.invoice_not_initialized",
        values: {
          en: "Checkout session not initialized",
          de: "Checkout-Sitzung nicht initialisiert",
          pl: "Sesja kasy nie została zainicjowana",
          es: "Sesión de pago no inicializada",
          fr: "Session de paiement non initialisée",
          ja: "チェックアウトセッションが初期化されていません",
        }
      },
      {
        key: "ui.checkout.payment_form.errors.invoice_creation_failed",
        values: {
          en: "Failed to create invoice",
          de: "Rechnung konnte nicht erstellt werden",
          pl: "Nie udało się utworzyć faktury",
          es: "No se pudo crear la factura",
          fr: "Échec de la création de la facture",
          ja: "請求書の作成に失敗しました",
        }
      },

      // ============================================================
      // SECURITY & INFO BADGES
      // ============================================================
      {
        key: "ui.checkout.payment_form.badges.secure_payment",
        values: {
          en: "🔒 Secure payment powered by {provider}",
          de: "🔒 Sichere Zahlung powered by {provider}",
          pl: "🔒 Bezpieczna płatność powered by {provider}",
          es: "🔒 Pago seguro con tecnología de {provider}",
          fr: "🔒 Paiement sécurisé propulsé par {provider}",
          ja: "🔒 {provider}による安全な支払い",
        }
      },
      {
        key: "ui.checkout.payment_form.badges.invoice_to_employer",
        values: {
          en: "📄 Invoice will be sent to {employer} for payment",
          de: "📄 Rechnung wird an {employer} zur Zahlung gesendet",
          pl: "📄 Faktura zostanie wysłana do {employer} w celu płatności",
          es: "📄 La factura se enviará a {employer} para el pago",
          fr: "📄 La facture sera envoyée à {employer} pour paiement",
          ja: "📄 請求書は支払いのために{employer}に送信されます",
        }
      },

      // ============================================================
      // INVOICE PAYMENT - HOW IT WORKS
      // ============================================================
      {
        key: "ui.checkout.payment_form.invoice.how_it_works.title",
        values: {
          en: "How This Works",
          de: "So funktioniert es",
          pl: "Jak to działa",
          es: "Cómo funciona esto",
          fr: "Comment cela fonctionne",
          ja: "仕組み",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.how_it_works.step1",
        values: {
          en: "✅ Step 1: Complete your registration now",
          de: "✅ Schritt 1: Schließen Sie Ihre Registrierung jetzt ab",
          pl: "✅ Krok 1: Zakończ rejestrację teraz",
          es: "✅ Paso 1: Completa tu registro ahora",
          fr: "✅ Étape 1: Complétez votre inscription maintenant",
          ja: "✅ ステップ1: 今すぐ登録を完了してください",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.how_it_works.step2",
        values: {
          en: "📧 Step 2: An invoice will be sent to {employer}",
          de: "📧 Schritt 2: Eine Rechnung wird an {employer} gesendet",
          pl: "📧 Krok 2: Faktura zostanie wysłana do {employer}",
          es: "📧 Paso 2: Se enviará una factura a {employer}",
          fr: "📧 Étape 2: Une facture sera envoyée à {employer}",
          ja: "📧 ステップ2: 請求書が{employer}に送信されます",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.how_it_works.step3",
        values: {
          en: "💳 Step 3: {employer} pays the invoice ({terms} terms)",
          de: "💳 Schritt 3: {employer} zahlt die Rechnung ({terms}-Bedingungen)",
          pl: "💳 Krok 3: {employer} opłaca fakturę (warunki {terms})",
          es: "💳 Paso 3: {employer} paga la factura (términos {terms})",
          fr: "💳 Étape 3: {employer} paie la facture (conditions {terms})",
          ja: "💳 ステップ3: {employer}が請求書を支払います（{terms}条件）",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.how_it_works.step4",
        values: {
          en: "🎫 Step 4: You receive your tickets immediately after invoice is accepted",
          de: "🎫 Schritt 4: Sie erhalten Ihre Tickets sofort nach Annahme der Rechnung",
          pl: "🎫 Krok 4: Otrzymujesz bilety natychmiast po zaakceptowaniu faktury",
          es: "🎫 Paso 4: Recibes tus tickets inmediatamente después de que se acepte la factura",
          fr: "🎫 Étape 4: Vous recevez vos billets immédiatement après l'acceptation de la facture",
          ja: "🎫 ステップ4: 請求書が承認された直後にチケットを受け取ります",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.employer_fallback",
        values: {
          en: "your employer",
          de: "Ihr Arbeitgeber",
          pl: "Twój pracodawca",
          es: "tu empleador",
          fr: "votre employeur",
          ja: "あなたの雇用主",
        }
      },

      // ============================================================
      // INVOICE PAYMENT - PAYMENT TERMS
      // ============================================================
      {
        key: "ui.checkout.payment_form.invoice.payment_terms.net30",
        values: {
          en: "Net 30",
          de: "Netto 30",
          pl: "Net 30",
          es: "Neto 30",
          fr: "Net 30",
          ja: "ネット30日",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.payment_terms.net60",
        values: {
          en: "Net 60",
          de: "Netto 60",
          pl: "Net 60",
          es: "Neto 60",
          fr: "Net 60",
          ja: "ネット60日",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.payment_terms.net90",
        values: {
          en: "Net 90",
          de: "Netto 90",
          pl: "Net 90",
          es: "Neto 90",
          fr: "Net 90",
          ja: "ネット90日",
        }
      },

      // ============================================================
      // INVOICE PAYMENT - ORDER SUMMARY
      // ============================================================
      {
        key: "ui.checkout.payment_form.invoice.order_summary.quantity",
        values: {
          en: "Quantity: {count}",
          de: "Menge: {count}",
          pl: "Ilość: {count}",
          es: "Cantidad: {count}",
          fr: "Quantité: {count}",
          ja: "数量: {count}",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.order_summary.addons",
        values: {
          en: "Add-ons:",
          de: "Zusatzleistungen:",
          pl: "Dodatki:",
          es: "Complementos:",
          fr: "Modules complémentaires:",
          ja: "アドオン:",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.order_summary.ticket_extras",
        values: {
          en: "Ticket {number} extras",
          de: "Ticket {number} Extras",
          pl: "Dodatki do biletu {number}",
          es: "Extras del ticket {number}",
          fr: "Extras du billet {number}",
          ja: "チケット {number} エクストラ",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.order_summary.total_amount",
        values: {
          en: "Total Amount:",
          de: "Gesamtbetrag:",
          pl: "Całkowita kwota:",
          es: "Importe total:",
          fr: "Montant total:",
          ja: "合計金額:",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.order_summary.invoiced_note",
        values: {
          en: "* This amount will be invoiced to your employer",
          de: "* Dieser Betrag wird Ihrem Arbeitgeber in Rechnung gestellt",
          pl: "* Ta kwota zostanie zafakturowana Twojemu pracodawcy",
          es: "* Este importe se facturará a tu empleador",
          fr: "* Ce montant sera facturé à votre employeur",
          ja: "* この金額は雇用主に請求されます",
        }
      },

      // ============================================================
      // INVOICE PAYMENT - ACKNOWLEDGMENT
      // ============================================================
      {
        key: "ui.checkout.payment_form.invoice.acknowledgment.title",
        values: {
          en: "Acknowledgment",
          de: "Bestätigung",
          pl: "Potwierdzenie",
          es: "Reconocimiento",
          fr: "Reconnaissance",
          ja: "確認事項",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.acknowledgment.intro",
        values: {
          en: "By clicking \"Complete Registration\", you acknowledge that:",
          de: "Durch Klicken auf \"Registrierung abschließen\" bestätigen Sie, dass:",
          pl: "Klikając \"Zakończ rejestrację\", potwierdzasz, że:",
          es: "Al hacer clic en \"Completar registro\", reconoces que:",
          fr: "En cliquant sur \"Terminer l'inscription\", vous reconnaissez que:",
          ja: "「登録を完了」をクリックすることで、以下を確認します:",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.acknowledgment.bullet1",
        values: {
          en: "An invoice for {amount} will be generated",
          de: "Eine Rechnung über {amount} wird erstellt",
          pl: "Zostanie wygenerowana faktura na kwotę {amount}",
          es: "Se generará una factura por {amount}",
          fr: "Une facture de {amount} sera générée",
          ja: "{amount}の請求書が生成されます",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.acknowledgment.bullet2",
        values: {
          en: "The invoice will be sent to {employer}",
          de: "Die Rechnung wird an {employer} gesendet",
          pl: "Faktura zostanie wysłana do {employer}",
          es: "La factura se enviará a {employer}",
          fr: "La facture sera envoyée à {employer}",
          ja: "請求書は{employer}に送信されます",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.acknowledgment.bullet2_fallback",
        values: {
          en: "your employer organization",
          de: "Ihre Arbeitgeberorganisation",
          pl: "Twoja organizacja pracodawcy",
          es: "tu organización empleadora",
          fr: "votre organisation employeur",
          ja: "あなたの雇用主組織",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.acknowledgment.bullet3",
        values: {
          en: "Payment is due within {days} days of invoice date ({terms} terms)",
          de: "Die Zahlung ist innerhalb von {days} Tagen ab Rechnungsdatum fällig ({terms}-Bedingungen)",
          pl: "Płatność jest wymagalna w ciągu {days} dni od daty wystawienia faktury (warunki {terms})",
          es: "El pago vence dentro de {days} días desde la fecha de la factura (términos {terms})",
          fr: "Le paiement est dû dans les {days} jours suivant la date de la facture (conditions {terms})",
          ja: "支払いは請求日から{days}日以内に期限があります（{terms}条件）",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.acknowledgment.bullet4",
        values: {
          en: "Your registration will be confirmed upon invoice acceptance",
          de: "Ihre Registrierung wird nach Annahme der Rechnung bestätigt",
          pl: "Twoja rejestracja zostanie potwierdzona po zaakceptowaniu faktury",
          es: "Tu registro se confirmará tras la aceptación de la factura",
          fr: "Votre inscription sera confirmée lors de l'acceptation de la facture",
          ja: "請求書が承認されると登録が確認されます",
        }
      },
      {
        key: "ui.checkout.payment_form.invoice.acknowledgment.bullet5",
        values: {
          en: "Tickets will be delivered to: {email}",
          de: "Tickets werden gesendet an: {email}",
          pl: "Bilety zostaną dostarczone do: {email}",
          es: "Los tickets se entregarán a: {email}",
          fr: "Les billets seront livrés à: {email}",
          ja: "チケットは次のアドレスに配信されます: {email}",
        }
      },

      // ============================================================
      // PAYPAL & MANUAL PAYMENT (PLACEHOLDERS)
      // ============================================================
      {
        key: "ui.checkout.payment_form.paypal.button_description",
        values: {
          en: "PayPal button will appear here.",
          de: "PayPal-Button wird hier erscheinen.",
          pl: "Przycisk PayPal pojawi się tutaj.",
          es: "El botón de PayPal aparecerá aquí.",
          fr: "Le bouton PayPal apparaîtra ici.",
          ja: "PayPalボタンがここに表示されます。",
        }
      },
      {
        key: "ui.checkout.payment_form.paypal.button_placeholder",
        values: {
          en: "[PayPal Button]",
          de: "[PayPal-Button]",
          pl: "[Przycisk PayPal]",
          es: "[Botón PayPal]",
          fr: "[Bouton PayPal]",
          ja: "[PayPalボタン]",
        }
      },
      {
        key: "ui.checkout.payment_form.manual.transfer_instructions",
        values: {
          en: "Please transfer the total amount to the following account:",
          de: "Bitte überweisen Sie den Gesamtbetrag auf das folgende Konto:",
          pl: "Przelej całkowitą kwotę na następujące konto:",
          es: "Por favor, transfiere el monto total a la siguiente cuenta:",
          fr: "Veuillez transférer le montant total sur le compte suivant:",
          ja: "以下の口座に合計金額をお振込みください:",
        }
      },
      {
        key: "ui.checkout.payment_form.manual.bank_label",
        values: {
          en: "Bank:",
          de: "Bank:",
          pl: "Bank:",
          es: "Banco:",
          fr: "Banque:",
          ja: "銀行:",
        }
      },
      {
        key: "ui.checkout.payment_form.manual.bank_example",
        values: {
          en: "Example Bank",
          de: "Beispielbank",
          pl: "Przykładowy Bank",
          es: "Banco Ejemplo",
          fr: "Banque Exemple",
          ja: "サンプル銀行",
        }
      },
      {
        key: "ui.checkout.payment_form.manual.account_label",
        values: {
          en: "Account:",
          de: "Konto:",
          pl: "Konto:",
          es: "Cuenta:",
          fr: "Compte:",
          ja: "口座:",
        }
      },
      {
        key: "ui.checkout.payment_form.manual.reference_label",
        values: {
          en: "Reference:",
          de: "Referenz:",
          pl: "Referencja:",
          es: "Referencia:",
          fr: "Référence:",
          ja: "参照:",
        }
      },
      {
        key: "ui.checkout.payment_form.manual.reference_prefix",
        values: {
          en: "ORDER-",
          de: "BESTELLUNG-",
          pl: "ZAMÓWIENIE-",
          es: "PEDIDO-",
          fr: "COMMANDE-",
          ja: "注文-",
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
            "payment-form"
          );
          if (inserted) count++;
        }
      }
    }

    console.log(`✅ Seeded ${count} payment form translations (${translations.length} keys × ${supportedLocales.length} languages)`);
    return { success: true, count, totalKeys: translations.length };
  }
});
