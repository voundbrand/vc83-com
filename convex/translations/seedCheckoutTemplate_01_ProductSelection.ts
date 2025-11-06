/**
 * SEED CHECKOUT TEMPLATE - PRODUCT SELECTION STEP
 *
 * Seeds translations for the behavior-driven checkout template - Product Selection step.
 * Run independently: npx convex run translations/seedCheckoutTemplate_01_ProductSelection:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Checkout Template - Product Selection translations...");

    // Get system organization
    const systemOrg = await ctx.db
      .query("organizations")
      .filter(q => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found. Run seedOntologyData first.");
    }

    // Get system user
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found. Run seedOntologyData first.");
    }

    // Define supported locales
    const supportedLocales = [
      { code: "en", name: "English" },
      { code: "de", name: "German" },
      { code: "pl", name: "Polish" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "ja", name: "Japanese" },
    ];

    // Product Selection Step translations
    const translations = [
      // Headers
      {
        key: "ui.checkout_template.behavior_driven.product_selection.headers.title",
        values: {
          en: "Select Products",
          de: "Produkte auswählen",
          pl: "Wybierz produkty",
          es: "Seleccionar productos",
          fr: "Sélectionner des produits",
          ja: "製品を選択",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.product_selection.headers.subtitle",
        values: {
          en: "Choose your tickets and quantities",
          de: "Wählen Sie Ihre Tickets und Mengen",
          pl: "Wybierz bilety i ilości",
          es: "Elige tus entradas y cantidades",
          fr: "Choisissez vos billets et quantités",
          ja: "チケットと数量を選択してください",
        }
      },

      // Cart Summary
      {
        key: "ui.checkout_template.behavior_driven.product_selection.cart.title",
        values: {
          en: "Cart Summary",
          de: "Warenkorbzusammenfassung",
          pl: "Podsumowanie koszyka",
          es: "Resumen del carrito",
          fr: "Résumé du panier",
          ja: "カート概要",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.product_selection.cart.subtotal",
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
        key: "ui.checkout_template.behavior_driven.product_selection.cart.tax",
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
        key: "ui.checkout_template.behavior_driven.product_selection.cart.tax_included",
        values: {
          en: "included",
          de: "inkl.",
          pl: "wliczone",
          es: "incluido",
          fr: "inclus",
          ja: "込み",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.product_selection.cart.tax_added",
        values: {
          en: "added",
          de: "zzgl.",
          pl: "dodane",
          es: "añadido",
          fr: "ajouté",
          ja: "追加",
        }
      },
      {
        key: "ui.checkout_template.behavior_driven.product_selection.cart.total",
        values: {
          en: "Total:",
          de: "Gesamt:",
          pl: "Razem:",
          es: "Total:",
          fr: "Total :",
          ja: "合計:",
        }
      },

      // Buttons
      {
        key: "ui.checkout_template.behavior_driven.product_selection.buttons.continue",
        values: {
          en: "Continue to Registration →",
          de: "Weiter zur Registrierung →",
          pl: "Przejdź do rejestracji →",
          es: "Continuar con el registro →",
          fr: "Continuer vers l'inscription →",
          ja: "登録に進む →",
        }
      },

      // Messages/Alerts
      {
        key: "ui.checkout_template.behavior_driven.product_selection.messages.select_at_least_one",
        values: {
          en: "Please select at least one product",
          de: "Bitte wählen Sie mindestens ein Produkt aus",
          pl: "Proszę wybrać co najmniej jeden produkt",
          es: "Por favor, selecciona al menos un producto",
          fr: "Veuillez sélectionner au moins un produit",
          ja: "少なくとも1つの製品を選択してください",
        }
      },
    ];

    let insertedCount = 0;
    let updatedCount = 0;

    for (const trans of translations) {
      for (const locale of supportedLocales) {
        const value = trans.values[locale.code as keyof typeof trans.values];

        if (value) {
          const result = await upsertTranslation(
            ctx.db,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale.code,
            "checkout-template",
            "behavior-driven-product-selection"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Product Selection: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  }
});
