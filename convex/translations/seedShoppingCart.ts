/**
 * SEED SHOPPING CART TRANSLATIONS
 *
 * Seeds translations for the shopping cart checkout window
 *
 * Run: npx convex run translations/seedShoppingCart:seed
 */

import { internalMutation } from "../_generated/server";
import { insertTranslationIfNew } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Shopping Cart translations...");

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
      // === EMPTY CART STATE ===
      {
        key: "ui.cart.empty.title",
        values: {
          en: "Your cart is empty",
          de: "Ihr Warenkorb ist leer",
          pl: "Twój koszyk jest pusty",
          es: "Tu carrito está vacío",
          fr: "Votre panier est vide",
          ja: "カートは空です",
        }
      },
      {
        key: "ui.cart.empty.subtitle",
        values: {
          en: "Add items to your cart to get started!",
          de: "Fügen Sie Artikel zu Ihrem Warenkorb hinzu, um zu beginnen!",
          pl: "Dodaj przedmioty do koszyka, aby rozpocząć!",
          es: "¡Agrega artículos a tu carrito para comenzar!",
          fr: "Ajoutez des articles à votre panier pour commencer!",
          ja: "カートにアイテムを追加して開始しましょう！",
        }
      },

      // === CART LABELS ===
      {
        key: "ui.cart.label.total",
        values: {
          en: "TOTAL:",
          de: "GESAMT:",
          pl: "SUMA:",
          es: "TOTAL:",
          fr: "TOTAL:",
          ja: "合計：",
        }
      },
      {
        key: "ui.cart.label.tax_notice",
        values: {
          en: "Tax calculated at checkout",
          de: "Steuer wird an der Kasse berechnet",
          pl: "Podatek obliczany przy kasie",
          es: "Impuestos calculados al finalizar compra",
          fr: "Taxe calculée à la caisse",
          ja: "税金は精算時に計算されます",
        }
      },

      // === BUTTONS ===
      {
        key: "ui.cart.button.clear_cart",
        values: {
          en: "Clear Cart",
          de: "Warenkorb leeren",
          pl: "Wyczyść koszyk",
          es: "Vaciar carrito",
          fr: "Vider le panier",
          ja: "カートをクリア",
        }
      },
      {
        key: "ui.cart.button.checkout",
        values: {
          en: "Checkout",
          de: "Zur Kasse",
          pl: "Kasa",
          es: "Finalizar compra",
          fr: "Passer à la caisse",
          ja: "精算する",
        }
      },
      {
        key: "ui.cart.button.processing",
        values: {
          en: "Processing...",
          de: "Wird verarbeitet...",
          pl: "Przetwarzanie...",
          es: "Procesando...",
          fr: "Traitement en cours...",
          ja: "処理中...",
        }
      },

      // === CART ITEM ACTIONS ===
      {
        key: "ui.cart.item.remove",
        values: {
          en: "Remove from cart",
          de: "Aus dem Warenkorb entfernen",
          pl: "Usuń z koszyka",
          es: "Eliminar del carrito",
          fr: "Retirer du panier",
          ja: "カートから削除",
        }
      },

      // === ERROR MESSAGES ===
      {
        key: "ui.cart.error.no_organization",
        values: {
          en: "Please select an organization first",
          de: "Bitte wählen Sie zuerst eine Organisation",
          pl: "Najpierw wybierz organizację",
          es: "Por favor, selecciona una organización primero",
          fr: "Veuillez d'abord sélectionner une organisation",
          ja: "まず組織を選択してください",
        }
      },
      {
        key: "ui.cart.error.checkout_failed",
        values: {
          en: "Checkout failed. Please try again.",
          de: "Kasse fehlgeschlagen. Bitte versuchen Sie es erneut.",
          pl: "Płatność nie powiodła się. Spróbuj ponownie.",
          es: "Pago fallido. Por favor, inténtalo de nuevo.",
          fr: "Échec du paiement. Veuillez réessayer.",
          ja: "精算に失敗しました。もう一度お試しください。",
        }
      },

      // === B2B CHECKOUT ===
      {
        key: "ui.cart.b2b.label",
        values: {
          en: "Checkout as:",
          de: "Kasse als:",
          pl: "Kasa jako:",
          es: "Pagar como:",
          fr: "Payer en tant que:",
          ja: "精算方法：",
        }
      },
      {
        key: "ui.cart.b2b.personal",
        values: {
          en: "Personal",
          de: "Privat",
          pl: "Prywatny",
          es: "Personal",
          fr: "Personnel",
          ja: "個人",
        }
      },
      {
        key: "ui.cart.b2b.business",
        values: {
          en: "Business",
          de: "Geschäftlich",
          pl: "Biznesowy",
          es: "Empresa",
          fr: "Professionnel",
          ja: "ビジネス",
        }
      },
      {
        key: "ui.cart.b2b.info",
        values: {
          en: "You'll be able to enter your business tax ID (VAT, EIN, etc.) on the next page.",
          de: "Sie können Ihre Umsatzsteuer-ID (USt-IdNr., EIN usw.) auf der nächsten Seite eingeben.",
          pl: "Będziesz mógł wprowadzić swój NIP (VAT, EIN itp.) na następnej stronie.",
          es: "Podrás ingresar tu número de identificación fiscal empresarial (IVA, EIN, etc.) en la siguiente página.",
          fr: "Vous pourrez saisir votre numéro d'identification fiscale (TVA, SIRET, etc.) sur la page suivante.",
          ja: "次のページで事業者税番号（VAT、EINなど）を入力できます。",
        }
      },
    ];

    const existingKeys = new Set<string>();

    let insertedCount = 0;
    let skippedCount = 0;

    // Insert translations for each locale
    for (const translation of translations) {
      for (const locale of supportedLocales) {
        const value = translation.values[locale.code as keyof typeof translation.values];

        const inserted = await insertTranslationIfNew(
          ctx.db,
          existingKeys,
          systemOrg._id,
          systemUser._id,
          translation.key,
          value,
          locale.code,
          "ui",
          "cart"
        );

        if (inserted) {
          insertedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    console.log(`✅ Shopping Cart translations seeded successfully!`);
    console.log(`   - Inserted: ${insertedCount} new translations`);
    console.log(`   - Skipped: ${skippedCount} existing translations`);

    return {
      success: true,
      totalTranslations: translations.length * supportedLocales.length,
      inserted: insertedCount,
      skipped: skippedCount,
    };
  },
});
