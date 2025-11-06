/**
 * PRODUCTS TRANSLATION SEED DATA - POLISH (pl)
 *
 * Polish translations for Product UI text.
 * Run with: npx convex run translations/seedProductTranslations_pl:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

const polishTranslations = [
  // PRODUCTS WINDOW - MAIN HEADER
  { key: "ui.products.header.title", value: "Produkty" },
  { key: "ui.products.header.description", value: "Zarządzaj katalogiem produktów - bilety, towary i produkty cyfrowe" },
  { key: "ui.products.button.createProduct", value: "Utwórz produkt" },
  { key: "ui.products.button.backToList", value: "Powrót do listy" },
  { key: "ui.products.loading", value: "Ładowanie produktów..." },
  { key: "ui.products.error.login", value: "Zaloguj się, aby uzyskać dostęp do produktów" },
  { key: "ui.products.error.noOrg", value: "Nie wybrano organizacji" },
  { key: "ui.products.error.noOrgDescription", value: "Wybierz organizację, aby zarządzać produktami" },

  // PRODUCTS LIST
  { key: "ui.products.list.empty", value: "Brak produktów. Kliknij \"Utwórz produkt\", aby rozpocząć." },
  { key: "ui.products.list.filter.allTypes", value: "Wszystkie typy" },
  { key: "ui.products.list.filter.tickets", value: "Bilety" },
  { key: "ui.products.list.filter.physical", value: "Fizyczne" },
  { key: "ui.products.list.filter.digital", value: "Cyfrowe" },
  { key: "ui.products.list.filter.allStatuses", value: "Wszystkie statusy" },
  { key: "ui.products.list.status.draft", value: "Szkic" },
  { key: "ui.products.list.status.active", value: "Aktywny" },
  { key: "ui.products.list.status.soldOut", value: "Wyprzedane" },
  { key: "ui.products.list.status.archived", value: "Zarchiwizowane" },
  { key: "ui.products.list.label.price", value: "Cena:" },
  { key: "ui.products.list.label.stock", value: "Magazyn:" },
  { key: "ui.products.list.label.sold", value: "Sprzedano:" },
  { key: "ui.products.list.button.edit", value: "Edytuj" },
  { key: "ui.products.list.button.delete", value: "Usuń" },
  { key: "ui.products.list.button.publish", value: "Opublikuj" },

  // PRODUCT FORM
  { key: "ui.products.form.title.create", value: "Utwórz nowy produkt" },
  { key: "ui.products.form.title.edit", value: "Edytuj produkt" },
  { key: "ui.products.form.basicInfo", value: "Podstawowe informacje" },
  { key: "ui.products.form.name.label", value: "Nazwa produktu" },
  { key: "ui.products.form.name.placeholder", value: "np. Bilet VIP, Koszulka, Kurs cyfrowy" },
  { key: "ui.products.form.type.label", value: "Typ produktu" },
  { key: "ui.products.form.type.ticket", value: "Bilet (wejściówka na wydarzenie)" },
  { key: "ui.products.form.type.physical", value: "Fizyczny (towary, merchandising)" },
  { key: "ui.products.form.type.digital", value: "Cyfrowy (pliki do pobrania, licencje)" },
  { key: "ui.products.form.description.label", value: "Opis" },
  { key: "ui.products.form.description.placeholder", value: "Opisz produkt..." },

  // PRICING
  { key: "ui.products.form.pricing", value: "Ceny i inwentarz" },
  { key: "ui.products.form.price.label", value: "Cena" },
  { key: "ui.products.form.price.placeholder", value: "0.00" },
  { key: "ui.products.form.currency.label", value: "Waluta" },
  { key: "ui.products.form.taxRate.label", value: "Stawka podatku (%)" },
  { key: "ui.products.form.taxRate.placeholder", value: "0" },
  { key: "ui.products.form.inventory.label", value: "Dostępny magazyn" },
  { key: "ui.products.form.inventory.placeholder", value: "0" },
  { key: "ui.products.form.inventory.unlimited", value: "Nieograniczony magazyn" },

  // TICKET SPECIFIC
  { key: "ui.products.form.ticketSettings", value: "Ustawienia biletu" },
  { key: "ui.products.form.ticket.eventId.label", value: "Wydarzenie" },
  { key: "ui.products.form.ticket.eventId.placeholder", value: "Wybierz wydarzenie (opcjonalnie)" },
  { key: "ui.products.form.ticket.validFrom.label", value: "Ważny od" },
  { key: "ui.products.form.ticket.validUntil.label", value: "Ważny do" },
  { key: "ui.products.form.ticket.seatInfo.label", value: "Informacje o miejscu" },
  { key: "ui.products.form.ticket.seatInfo.placeholder", value: "np. Sekcja A, Rząd 5, Miejsce 12" },

  // DIGITAL SPECIFIC
  { key: "ui.products.form.digitalSettings", value: "Ustawienia produktu cyfrowego" },
  { key: "ui.products.form.digital.downloadUrl.label", value: "URL pobierania" },
  { key: "ui.products.form.digital.downloadUrl.placeholder", value: "https://..." },
  { key: "ui.products.form.digital.fileSize.label", value: "Rozmiar pliku (MB)" },
  { key: "ui.products.form.digital.fileSize.placeholder", value: "0" },
  { key: "ui.products.form.digital.licenseKey.label", value: "Klucz licencyjny (opcjonalnie)" },
  { key: "ui.products.form.digital.licenseKey.placeholder", value: "XXXX-XXXX-XXXX-XXXX" },

  // ADD-ONS
  { key: "ui.products.form.addons", value: "Dodatki" },
  { key: "ui.products.form.addons.description", value: "Utwórz dodatkowe produkty, które klienci mogą dodać podczas zakupu." },
  { key: "ui.products.form.addons.button.manage", value: "Zarządzaj dodatkami" },
  { key: "ui.products.form.addons.count", value: "dodatków" },

  // STATUS & PUBLISHING
  { key: "ui.products.form.status", value: "Status i publikacja" },
  { key: "ui.products.form.status.label", value: "Status produktu" },
  { key: "ui.products.form.status.description", value: "Kontroluj widoczność produktu" },
  { key: "ui.products.form.featured.label", value: "Produkt wyróżniony" },
  { key: "ui.products.form.featured.description", value: "Wyświetlaj ten produkt w wyróżnionych sekcjach" },

  // INVOICING
  { key: "ui.products.form.invoicing", value: "Konfiguracja fakturowania" },
  { key: "ui.products.form.invoicing.description", value: "Skonfiguruj, jak ten produkt pojawia się na fakturach Stripe" },
  { key: "ui.products.form.invoicing.button.configure", value: "Konfiguruj fakturowanie" },

  // ACTIONS
  { key: "ui.products.button.save", value: "Zapisz" },
  { key: "ui.products.button.cancel", value: "Anuluj" },
  { key: "ui.products.button.update", value: "Aktualizuj" },
  { key: "ui.products.button.create", value: "Utwórz" },
  { key: "ui.products.saving", value: "Zapisywanie..." },
  { key: "ui.products.required", value: "*" },

  // CHECKOUT
  { key: "ui.products.checkout.title", value: "Koszyk" },
  { key: "ui.products.checkout.empty", value: "Twój koszyk jest pusty" },
  { key: "ui.products.checkout.item", value: "Pozycja" },
  { key: "ui.products.checkout.quantity", value: "Ilość" },
  { key: "ui.products.checkout.price", value: "Cena" },
  { key: "ui.products.checkout.subtotal", value: "Suma częściowa" },
  { key: "ui.products.checkout.tax", value: "Podatek" },
  { key: "ui.products.checkout.tax.included", value: "wliczony" },
  { key: "ui.products.checkout.tax.added", value: "dodany" },
  { key: "ui.products.checkout.total", value: "Suma" },
  { key: "ui.products.checkout.button.proceed", value: "Przejdź do kasy" },
  { key: "ui.products.checkout.footer.secure", value: "Bezpieczna kasa obsługiwana przez Stripe" },
];

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Polish (pl) Product translations...");

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

    for (const translation of polishTranslations) {
      const result = await upsertTranslation(
        ctx.db,
        systemOrg._id,
        systemUser._id,
        translation.key,
        translation.value,
        "pl", // Polish locale
        "products"
      );
      if (result.inserted) insertedCount++;
      if (result.updated) updatedCount++;
    }

    console.log(
      `✅ Polish product translations seeded: ${insertedCount} inserted, ${updatedCount} updated`
    );

    return {
      success: true,
      inserted: insertedCount,
      updated: updatedCount,
      total: polishTranslations.length,
      locale: "pl",
    };
  },
});
