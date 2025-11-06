/**
 * PRODUCTS TRANSLATION SEED DATA - FRENCH (fr)
 *
 * French translations for Product UI text.
 * Run with: npx convex run translations/seedProductTranslations_fr:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

const frenchTranslations = [
  // PRODUCTS WINDOW - MAIN HEADER
  { key: "ui.products.header.title", value: "Produits" },
  { key: "ui.products.header.description", value: "Gérez votre catalogue de produits - billets, marchandises et produits numériques" },
  { key: "ui.products.button.createProduct", value: "Créer un produit" },
  { key: "ui.products.button.backToList", value: "Retour à la liste" },
  { key: "ui.products.loading", value: "Chargement des produits..." },
  { key: "ui.products.error.login", value: "Connectez-vous pour accéder aux produits" },
  { key: "ui.products.error.noOrg", value: "Aucune organisation sélectionnée" },
  { key: "ui.products.error.noOrgDescription", value: "Veuillez sélectionner une organisation pour gérer les produits" },

  // PRODUCTS LIST
  { key: "ui.products.list.empty", value: "Aucun produit. Cliquez sur \"Créer un produit\" pour commencer." },
  { key: "ui.products.list.filter.allTypes", value: "Tous les types" },
  { key: "ui.products.list.filter.tickets", value: "Billets" },
  { key: "ui.products.list.filter.physical", value: "Physiques" },
  { key: "ui.products.list.filter.digital", value: "Numériques" },
  { key: "ui.products.list.filter.allStatuses", value: "Tous les statuts" },
  { key: "ui.products.list.status.draft", value: "Brouillon" },
  { key: "ui.products.list.status.active", value: "Actif" },
  { key: "ui.products.list.status.soldOut", value: "Épuisé" },
  { key: "ui.products.list.status.archived", value: "Archivé" },
  { key: "ui.products.list.label.price", value: "Prix :" },
  { key: "ui.products.list.label.stock", value: "Stock :" },
  { key: "ui.products.list.label.sold", value: "Vendu :" },
  { key: "ui.products.list.button.edit", value: "Modifier" },
  { key: "ui.products.list.button.delete", value: "Supprimer" },
  { key: "ui.products.list.button.publish", value: "Publier" },

  // PRODUCT FORM
  { key: "ui.products.form.title.create", value: "Créer un nouveau produit" },
  { key: "ui.products.form.title.edit", value: "Modifier le produit" },
  { key: "ui.products.form.basicInfo", value: "Informations de base" },
  { key: "ui.products.form.name.label", value: "Nom du produit" },
  { key: "ui.products.form.name.placeholder", value: "ex. Billet VIP, T-shirt, Cours numérique" },
  { key: "ui.products.form.type.label", value: "Type de produit" },
  { key: "ui.products.form.type.ticket", value: "Billet (entrée à l'événement)" },
  { key: "ui.products.form.type.physical", value: "Physique (marchandises, produits)" },
  { key: "ui.products.form.type.digital", value: "Numérique (téléchargements, licences)" },
  { key: "ui.products.form.description.label", value: "Description" },
  { key: "ui.products.form.description.placeholder", value: "Décrivez le produit..." },

  // PRICING
  { key: "ui.products.form.pricing", value: "Prix et inventaire" },
  { key: "ui.products.form.price.label", value: "Prix" },
  { key: "ui.products.form.price.placeholder", value: "0.00" },
  { key: "ui.products.form.currency.label", value: "Devise" },
  { key: "ui.products.form.taxRate.label", value: "Taux de taxe (%)" },
  { key: "ui.products.form.taxRate.placeholder", value: "0" },
  { key: "ui.products.form.inventory.label", value: "Stock disponible" },
  { key: "ui.products.form.inventory.placeholder", value: "0" },
  { key: "ui.products.form.inventory.unlimited", value: "Stock illimité" },

  // TICKET SPECIFIC
  { key: "ui.products.form.ticketSettings", value: "Paramètres du billet" },
  { key: "ui.products.form.ticket.eventId.label", value: "Événement" },
  { key: "ui.products.form.ticket.eventId.placeholder", value: "Sélectionner un événement (optionnel)" },
  { key: "ui.products.form.ticket.validFrom.label", value: "Valable à partir de" },
  { key: "ui.products.form.ticket.validUntil.label", value: "Valable jusqu'au" },
  { key: "ui.products.form.ticket.seatInfo.label", value: "Informations sur le siège" },
  { key: "ui.products.form.ticket.seatInfo.placeholder", value: "ex. Section A, Rangée 5, Siège 12" },

  // DIGITAL SPECIFIC
  { key: "ui.products.form.digitalSettings", value: "Paramètres du produit numérique" },
  { key: "ui.products.form.digital.downloadUrl.label", value: "URL de téléchargement" },
  { key: "ui.products.form.digital.downloadUrl.placeholder", value: "https://..." },
  { key: "ui.products.form.digital.fileSize.label", value: "Taille du fichier (MB)" },
  { key: "ui.products.form.digital.fileSize.placeholder", value: "0" },
  { key: "ui.products.form.digital.licenseKey.label", value: "Clé de licence (optionnel)" },
  { key: "ui.products.form.digital.licenseKey.placeholder", value: "XXXX-XXXX-XXXX-XXXX" },

  // ADD-ONS
  { key: "ui.products.form.addons", value: "Modules complémentaires" },
  { key: "ui.products.form.addons.description", value: "Créez des produits supplémentaires que les clients peuvent ajouter lors de l'achat." },
  { key: "ui.products.form.addons.button.manage", value: "Gérer les modules" },
  { key: "ui.products.form.addons.count", value: "modules" },

  // STATUS & PUBLISHING
  { key: "ui.products.form.status", value: "Statut et publication" },
  { key: "ui.products.form.status.label", value: "Statut du produit" },
  { key: "ui.products.form.status.description", value: "Contrôlez la visibilité du produit" },
  { key: "ui.products.form.featured.label", value: "Produit en vedette" },
  { key: "ui.products.form.featured.description", value: "Afficher ce produit dans les sections en vedette" },

  // INVOICING
  { key: "ui.products.form.invoicing", value: "Configuration de facturation" },
  { key: "ui.products.form.invoicing.description", value: "Configurez comment ce produit apparaît sur les factures Stripe" },
  { key: "ui.products.form.invoicing.button.configure", value: "Configurer la facturation" },

  // ACTIONS
  { key: "ui.products.button.save", value: "Enregistrer" },
  { key: "ui.products.button.cancel", value: "Annuler" },
  { key: "ui.products.button.update", value: "Mettre à jour" },
  { key: "ui.products.button.create", value: "Créer" },
  { key: "ui.products.saving", value: "Enregistrement..." },
  { key: "ui.products.required", value: "*" },

  // CHECKOUT
  { key: "ui.products.checkout.title", value: "Panier" },
  { key: "ui.products.checkout.empty", value: "Votre panier est vide" },
  { key: "ui.products.checkout.item", value: "Article" },
  { key: "ui.products.checkout.quantity", value: "Quantité" },
  { key: "ui.products.checkout.price", value: "Prix" },
  { key: "ui.products.checkout.subtotal", value: "Sous-total" },
  { key: "ui.products.checkout.tax", value: "Taxe" },
  { key: "ui.products.checkout.tax.included", value: "incluse" },
  { key: "ui.products.checkout.tax.added", value: "ajoutée" },
  { key: "ui.products.checkout.total", value: "Total" },
  { key: "ui.products.checkout.button.proceed", value: "Procéder au paiement" },
  { key: "ui.products.checkout.footer.secure", value: "Paiement sécurisé par Stripe" },
];

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding French (fr) Product translations...");

    const systemOrg = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("slug"), "system"))
      .first();

    if (!systemOrg) {
      throw new Error("System organization not found.");
    }

    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();

    if (!systemUser) {
      throw new Error("System user not found.");
    }

    let insertedCount = 0;
    let updatedCount = 0;

    for (const translation of frenchTranslations) {
      const result = await upsertTranslation(
        ctx.db,
        systemOrg._id,
        systemUser._id,
        translation.key,
        translation.value,
        "fr", // French locale
        "products"
      );
      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(
      `✅ French product translations seeded: ${insertedCount} inserted, ${updatedCount} updated`
    );

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total: frenchTranslations.length,
      locale: "fr",
    };
  },
});
