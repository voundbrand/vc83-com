/**
 * INVOICING WINDOW - TEMPLATES TAB TRANSLATIONS
 *
 * Namespace: ui.invoicing_window.templates.*
 *
 * Seeds translations for the invoice templates tab in the Invoicing Window.
 * Run: npx convex run translations/seedInvoicingWindow_Templates:seed
 */

import { internalMutation } from "../_generated/server";
import { upsertTranslation } from "./_translationHelpers";

export const seed = internalMutation({
  handler: async (ctx) => {
    console.log("🌱 Seeding Invoicing Window - Templates translations...");

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

    const translations = [
      // === TEMPLATES TAB HEADER ===
      {
        key: "ui.invoicing_window.templates.title",
        values: {
          en: "Invoice Templates",
          de: "Rechnungsvorlagen",
          es: "Plantillas de factura",
          fr: "Modèles de facture",
          pl: "Szablony faktur",
        },
      },
      {
        key: "ui.invoicing_window.templates.description",
        values: {
          en: "Choose a template for your invoice PDFs. Each template is optimized for specific use cases.",
          de: "Wählen Sie eine Vorlage für Ihre Rechnungs-PDFs. Jede Vorlage ist für bestimmte Anwendungsfälle optimiert.",
          es: "Elija una plantilla para sus facturas PDF. Cada plantilla está optimizada para casos de uso específicos.",
          fr: "Choisissez un modèle pour vos factures PDF. Chaque modèle est optimisé pour des cas d'utilisation spécifiques.",
          pl: "Wybierz szablon dla swoich faktur PDF. Każdy szablon jest zoptymalizowany pod kątem konkretnych przypadków użycia.",
        },
      },

      // === B2C RECEIPT TEMPLATE ===
      {
        key: "ui.invoicing_window.templates.b2c_receipt.name",
        values: {
          en: "B2C Receipt",
          de: "B2C-Quittung",
          es: "Recibo B2C",
          fr: "Reçu B2C",
          pl: "Paragon B2C",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2c_receipt.description",
        values: {
          en: "Simple customer receipt for individual purchases",
          de: "Einfache Kundenquittung für Einzelkäufe",
          es: "Recibo simple para compras individuales",
          fr: "Reçu client simple pour les achats individuels",
          pl: "Prosty paragon dla indywidualnych zakupów",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2c_receipt.use_case",
        values: {
          en: "Single customer checkout",
          de: "Einzelkunden-Checkout",
          es: "Pago de un solo cliente",
          fr: "Paiement client unique",
          pl: "Płatność pojedynczego klienta",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2c_receipt.features.layout",
        values: {
          en: "Clean, simple layout",
          de: "Sauberes, einfaches Layout",
          es: "Diseño limpio y simple",
          fr: "Mise en page propre et simple",
          pl: "Czysty, prosty układ",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2c_receipt.features.customer",
        values: {
          en: "Customer details",
          de: "Kundendetails",
          es: "Detalles del cliente",
          fr: "Détails du client",
          pl: "Dane klienta",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2c_receipt.features.items",
        values: {
          en: "Line items with prices",
          de: "Positionen mit Preisen",
          es: "Artículos con precios",
          fr: "Articles avec prix",
          pl: "Pozycje z cenami",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2c_receipt.features.tax",
        values: {
          en: "Tax breakdown",
          de: "Steueraufschlüsselung",
          es: "Desglose de impuestos",
          fr: "Ventilation des taxes",
          pl: "Podział podatków",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2c_receipt.features.payment",
        values: {
          en: "Payment method",
          de: "Zahlungsmethode",
          es: "Método de pago",
          fr: "Mode de paiement",
          pl: "Metoda płatności",
        },
      },

      // === B2B SINGLE INVOICE TEMPLATE ===
      {
        key: "ui.invoicing_window.templates.b2b_single.name",
        values: {
          en: "B2B Single Invoice",
          de: "B2B-Einzelrechnung",
          es: "Factura B2B individual",
          fr: "Facture B2B unique",
          pl: "Pojedyncza faktura B2B",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_single.description",
        values: {
          en: "Professional invoice for individual business transactions",
          de: "Professionelle Rechnung für einzelne Geschäftstransaktionen",
          es: "Factura profesional para transacciones comerciales individuales",
          fr: "Facture professionnelle pour les transactions commerciales individuelles",
          pl: "Profesjonalna faktura dla indywidualnych transakcji biznesowych",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_single.use_case",
        values: {
          en: "Single business customer",
          de: "Einzelner Geschäftskunde",
          es: "Cliente empresarial único",
          fr: "Client professionnel unique",
          pl: "Pojedynczy klient biznesowy",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_single.features.layout",
        values: {
          en: "Professional layout",
          de: "Professionelles Layout",
          es: "Diseño profesional",
          fr: "Mise en page professionnelle",
          pl: "Profesjonalny układ",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_single.features.company",
        values: {
          en: "Company details & VAT",
          de: "Firmendetails & USt.",
          es: "Detalles de la empresa e IVA",
          fr: "Détails de l'entreprise et TVA",
          pl: "Dane firmy i VAT",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_single.features.address",
        values: {
          en: "Billing address",
          de: "Rechnungsadresse",
          es: "Dirección de facturación",
          fr: "Adresse de facturation",
          pl: "Adres rozliczeniowy",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_single.features.terms",
        values: {
          en: "Payment terms (NET30)",
          de: "Zahlungsbedingungen (NET30)",
          es: "Términos de pago (NET30)",
          fr: "Conditions de paiement (NET30)",
          pl: "Warunki płatności (NET30)",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_single.features.number",
        values: {
          en: "Invoice number",
          de: "Rechnungsnummer",
          es: "Número de factura",
          fr: "Numéro de facture",
          pl: "Numer faktury",
        },
      },

      // === B2B CONSOLIDATED TEMPLATE ===
      {
        key: "ui.invoicing_window.templates.b2b_consolidated.name",
        values: {
          en: "B2B Consolidated",
          de: "B2B Konsolidiert",
          es: "B2B Consolidado",
          fr: "B2B Consolidé",
          pl: "B2B Skonsolidowana",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated.description",
        values: {
          en: "Multi-employee invoice for employer billing (AMEOS use case)",
          de: "Rechnung für mehrere Mitarbeiter zur Arbeitgeberabrechnung (AMEOS-Anwendungsfall)",
          es: "Factura de múltiples empleados para facturación del empleador (caso de uso AMEOS)",
          fr: "Facture multi-employés pour la facturation de l'employeur (cas d'utilisation AMEOS)",
          pl: "Faktura wielopracownicza do rozliczeń pracodawcy (przypadek użycia AMEOS)",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated.use_case",
        values: {
          en: "Multiple employees → Single employer",
          de: "Mehrere Mitarbeiter → Ein Arbeitgeber",
          es: "Múltiples empleados → Un empleador",
          fr: "Plusieurs employés → Un employeur",
          pl: "Wielu pracowników → Jeden pracodawca",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated.features.list",
        values: {
          en: "Employee list view",
          de: "Mitarbeiterliste",
          es: "Vista de lista de empleados",
          fr: "Vue de liste des employés",
          pl: "Widok listy pracowników",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated.features.grouped",
        values: {
          en: "Grouped by employee",
          de: "Gruppiert nach Mitarbeiter",
          es: "Agrupado por empleado",
          fr: "Groupé par employé",
          pl: "Pogrupowane według pracownika",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated.features.per_employee",
        values: {
          en: "Total per employee",
          de: "Gesamt pro Mitarbeiter",
          es: "Total por empleado",
          fr: "Total par employé",
          pl: "Suma na pracownika",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated.features.total",
        values: {
          en: "Consolidated total",
          de: "Konsolidierte Gesamtsumme",
          es: "Total consolidado",
          fr: "Total consolidé",
          pl: "Suma skonsolidowana",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated.features.billing",
        values: {
          en: "Employer billing",
          de: "Arbeitgeberabrechnung",
          es: "Facturación del empleador",
          fr: "Facturation de l'employeur",
          pl: "Rozliczenia pracodawcy",
        },
      },

      // === B2B CONSOLIDATED DETAILED TEMPLATE ===
      {
        key: "ui.invoicing_window.templates.b2b_consolidated_detailed.name",
        values: {
          en: "B2B Consolidated (Detailed)",
          de: "B2B Konsolidiert (Detailliert)",
          es: "B2B Consolidado (Detallado)",
          fr: "B2B Consolidé (Détaillé)",
          pl: "B2B Skonsolidowana (Szczegółowa)",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated_detailed.description",
        values: {
          en: "Itemized breakdown per employee with full ticket details",
          de: "Aufgeschlüsselte Aufstellung pro Mitarbeiter mit vollständigen Ticketdetails",
          es: "Desglose detallado por empleado con detalles completos del ticket",
          fr: "Répartition détaillée par employé avec tous les détails du billet",
          pl: "Szczegółowy podział na pracownika ze wszystkimi detalami biletu",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated_detailed.use_case",
        values: {
          en: "Detailed employer invoice",
          de: "Detaillierte Arbeitgeberrechnung",
          es: "Factura detallada del empleador",
          fr: "Facture détaillée de l'employeur",
          pl: "Szczegółowa faktura pracodawcy",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated_detailed.features.itemization",
        values: {
          en: "Full itemization",
          de: "Vollständige Aufschlüsselung",
          es: "Desglose completo",
          fr: "Détail complet",
          pl: "Pełne wyszczególnienie",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated_detailed.features.breakdown",
        values: {
          en: "Product breakdown per employee",
          de: "Produktaufschlüsselung pro Mitarbeiter",
          es: "Desglose de productos por empleado",
          fr: "Répartition des produits par employé",
          pl: "Podział produktów według pracownika",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated_detailed.features.details",
        values: {
          en: "Ticket-level details",
          de: "Details auf Ticketebene",
          es: "Detalles a nivel de ticket",
          fr: "Détails au niveau du billet",
          pl: "Szczegóły na poziomie biletu",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated_detailed.features.subtotals",
        values: {
          en: "Subtotals & totals",
          de: "Zwischensummen & Gesamtsummen",
          es: "Subtotales y totales",
          fr: "Sous-totaux et totaux",
          pl: "Sumy częściowe i całkowite",
        },
      },
      {
        key: "ui.invoicing_window.templates.b2b_consolidated_detailed.features.comprehensive",
        values: {
          en: "Comprehensive view",
          de: "Umfassende Ansicht",
          es: "Vista completa",
          fr: "Vue complète",
          pl: "Widok kompleksowy",
        },
      },

      // === TEMPLATE BUTTONS ===
      {
        key: "ui.invoicing_window.templates.buttons.preview",
        values: {
          en: "Preview",
          de: "Vorschau",
          es: "Vista previa",
          fr: "Aperçu",
          pl: "Podgląd",
        },
      },
      {
        key: "ui.invoicing_window.templates.buttons.use",
        values: {
          en: "Use",
          de: "Verwenden",
          es: "Usar",
          fr: "Utiliser",
          pl: "Użyj",
        },
      },
      {
        key: "ui.invoicing_window.templates.buttons.use_hint",
        values: {
          en: "Use in Rules tab",
          de: "Im Tab Regeln verwenden",
          es: "Usar en la pestaña Reglas",
          fr: "Utiliser dans l'onglet Règles",
          pl: "Użyj w zakładce Reguły",
        },
      },

      // === TEMPLATE USAGE INFO ===
      {
        key: "ui.invoicing_window.templates.usage.title",
        values: {
          en: "Template Usage",
          de: "Vorlagenverwendung",
          es: "Uso de plantillas",
          fr: "Utilisation des modèles",
          pl: "Użycie szablonu",
        },
      },
      {
        key: "ui.invoicing_window.templates.usage.b2c_receipt",
        values: {
          en: "B2C Receipt: Used automatically for individual customer transactions",
          de: "B2C-Quittung: Wird automatisch für einzelne Kundentransaktionen verwendet",
          es: "Recibo B2C: Se usa automáticamente para transacciones de clientes individuales",
          fr: "Reçu B2C : Utilisé automatiquement pour les transactions clients individuelles",
          pl: "Paragon B2C: Używany automatycznie do indywidualnych transakcji klientów",
        },
      },
      {
        key: "ui.invoicing_window.templates.usage.b2b_single",
        values: {
          en: "B2B Single: Used for single business transactions",
          de: "B2B-Einzel: Für einzelne Geschäftstransaktionen verwendet",
          es: "B2B Individual: Utilizado para transacciones comerciales únicas",
          fr: "B2B Unique : Utilisé pour les transactions commerciales uniques",
          pl: "B2B Pojedyncza: Używana do pojedynczych transakcji biznesowych",
        },
      },
      {
        key: "ui.invoicing_window.templates.usage.b2b_consolidated",
        values: {
          en: "B2B Consolidated: AMEOS use case - 10 doctors → 1 invoice to employer",
          de: "B2B Konsolidiert: AMEOS-Anwendungsfall - 10 Ärzte → 1 Rechnung an Arbeitgeber",
          es: "B2B Consolidado: Caso de uso AMEOS - 10 médicos → 1 factura al empleador",
          fr: "B2B Consolidé : Cas d'utilisation AMEOS - 10 médecins → 1 facture à l'employeur",
          pl: "B2B Skonsolidowana: Przypadek użycia AMEOS - 10 lekarzy → 1 faktura dla pracodawcy",
        },
      },
      {
        key: "ui.invoicing_window.templates.usage.b2b_consolidated_detailed",
        values: {
          en: "B2B Consolidated (Detailed): Same as above but with full itemization",
          de: "B2B Konsolidiert (Detailliert): Wie oben, aber mit vollständiger Aufschlüsselung",
          es: "B2B Consolidado (Detallado): Igual que el anterior pero con desglose completo",
          fr: "B2B Consolidé (Détaillé) : Identique à ce qui précède mais avec détail complet",
          pl: "B2B Skonsolidowana (Szczegółowa): Jak powyżej, ale z pełnym wyszczególnieniem",
        },
      },

      // === PREVIEW MESSAGE ===
      {
        key: "ui.invoicing_window.templates.preview_coming_soon",
        values: {
          en: "Preview coming soon!",
          de: "Vorschau demnächst!",
          es: "¡Vista previa próximamente!",
          fr: "Aperçu à venir !",
          pl: "Podgląd wkrótce!",
        },
      },
    ];

    console.log(`📝 Upserting ${translations.length} translation keys...`);

    // Upsert translations (insert new, update existing)
    let insertedCount = 0;
    let updatedCount = 0;

    for (const trans of translations) {
      for (const [locale, value] of Object.entries(trans.values)) {
        if (typeof value === "string") {
          const result = await upsertTranslation(
            ctx.db,
            systemOrg._id,
            systemUser._id,
            trans.key,
            value,
            locale,
            "invoicing",
            "invoicing-window-templates"
          );

          if (result.inserted) insertedCount++;
          if (result.updated) updatedCount++;
        }
      }
    }

    console.log(`✅ Seeded Invoicing Window Templates translations: ${insertedCount} inserted, ${updatedCount} updated`);
    return { success: true, inserted: insertedCount, updated: updatedCount };
  },
});
