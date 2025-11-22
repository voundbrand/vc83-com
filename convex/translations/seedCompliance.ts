/**
 * Compliance App Translations
 *
 * Namespace: ui.compliance
 */

import { Id } from "../_generated/dataModel";

export async function seedComplianceTranslations(
  ctx: any,
  systemOrgId: Id<"organizations">
) {
  const translations = [
    // English
    {
      name: "ui.compliance.header.title",
      value: "Compliance Document Converter",
      locale: "en",
    },
    {
      name: "ui.compliance.header.subtitle",
      value: "Convert markdown legal documents to professional PDFs",
      locale: "en",
    },
    {
      name: "ui.compliance.loading",
      value: "Loading...",
      locale: "en",
    },
    {
      name: "ui.compliance.auth.login_required",
      value: "Please log in to use the Compliance app",
      locale: "en",
    },
    {
      name: "ui.compliance.auth.no_org_title",
      value: "No Organization Selected",
      locale: "en",
    },
    {
      name: "ui.compliance.auth.no_org_subtitle",
      value: "Please select an organization to use the Compliance app",
      locale: "en",
    },
    {
      name: "ui.compliance.input.title_label",
      value: "Document Title",
      locale: "en",
    },
    {
      name: "ui.compliance.input.title_placeholder",
      value: "e.g., Software License Agreement",
      locale: "en",
    },
    {
      name: "ui.compliance.input.content_label",
      value: "Markdown Content",
      locale: "en",
    },
    {
      name: "ui.compliance.input.content_placeholder",
      value: "Paste your markdown content here...",
      locale: "en",
    },
    {
      name: "ui.compliance.input.content_help",
      value: "Supports headers, bold, italic, lists, and tables",
      locale: "en",
    },
    {
      name: "ui.compliance.input.generate_button",
      value: "Generate PDF",
      locale: "en",
    },
    {
      name: "ui.compliance.input.load_example",
      value: "Load Example",
      locale: "en",
    },
    {
      name: "ui.compliance.processing.title",
      value: "Generating PDF...",
      locale: "en",
    },
    {
      name: "ui.compliance.processing.subtitle",
      value: "Converting your markdown document to a professional PDF",
      locale: "en",
    },
    {
      name: "ui.compliance.success.title",
      value: "PDF Generated Successfully!",
      locale: "en",
    },
    {
      name: "ui.compliance.success.subtitle",
      value: "Your document \"{{documentTitle}}\" is ready to download",
      locale: "en",
    },
    {
      name: "ui.compliance.success.download",
      value: "Download PDF",
      locale: "en",
    },
    {
      name: "ui.compliance.success.create_another",
      value: "Create Another",
      locale: "en",
    },
    {
      name: "ui.compliance.success.media_library_message",
      value: "This PDF has been saved to your Media Library for future access.",
      locale: "en",
    },
    {
      name: "ui.compliance.success.open_media_library",
      value: "Open Media Library",
      locale: "en",
    },
    {
      name: "ui.compliance.error.title",
      value: "Error Generating PDF",
      locale: "en",
    },
    {
      name: "ui.compliance.error.try_again",
      value: "Try Again",
      locale: "en",
    },

    // German
    {
      name: "ui.compliance.header.title",
      value: "Compliance-Dokumenten-Konverter",
      locale: "de",
    },
    {
      name: "ui.compliance.header.subtitle",
      value: "Markdown-Rechtsdokumente in professionelle PDFs konvertieren",
      locale: "de",
    },
    {
      name: "ui.compliance.loading",
      value: "Laden...",
      locale: "de",
    },
    {
      name: "ui.compliance.auth.login_required",
      value: "Bitte melden Sie sich an, um die Compliance-App zu verwenden",
      locale: "de",
    },
    {
      name: "ui.compliance.auth.no_org_title",
      value: "Keine Organisation ausgewählt",
      locale: "de",
    },
    {
      name: "ui.compliance.auth.no_org_subtitle",
      value: "Bitte wählen Sie eine Organisation aus, um die Compliance-App zu verwenden",
      locale: "de",
    },
    {
      name: "ui.compliance.input.title_label",
      value: "Dokumenttitel",
      locale: "de",
    },
    {
      name: "ui.compliance.input.title_placeholder",
      value: "z.B. Software-Lizenzvereinbarung",
      locale: "de",
    },
    {
      name: "ui.compliance.input.content_label",
      value: "Markdown-Inhalt",
      locale: "de",
    },
    {
      name: "ui.compliance.input.content_placeholder",
      value: "Fügen Sie Ihren Markdown-Inhalt hier ein...",
      locale: "de",
    },
    {
      name: "ui.compliance.input.content_help",
      value: "Unterstützt Überschriften, Fett, Kursiv, Listen und Tabellen",
      locale: "de",
    },
    {
      name: "ui.compliance.input.generate_button",
      value: "PDF Generieren",
      locale: "de",
    },
    {
      name: "ui.compliance.input.load_example",
      value: "Beispiel Laden",
      locale: "de",
    },
    {
      name: "ui.compliance.processing.title",
      value: "PDF wird erstellt...",
      locale: "de",
    },
    {
      name: "ui.compliance.processing.subtitle",
      value: "Ihr Markdown-Dokument wird in ein professionelles PDF konvertiert",
      locale: "de",
    },
    {
      name: "ui.compliance.success.title",
      value: "PDF erfolgreich erstellt!",
      locale: "de",
    },
    {
      name: "ui.compliance.success.subtitle",
      value: "Ihr Dokument \"{{documentTitle}}\" ist zum Download bereit",
      locale: "de",
    },
    {
      name: "ui.compliance.success.download",
      value: "PDF Herunterladen",
      locale: "de",
    },
    {
      name: "ui.compliance.success.create_another",
      value: "Weitere Erstellen",
      locale: "de",
    },
    {
      name: "ui.compliance.success.media_library_message",
      value: "Diese PDF wurde in Ihrer Medienbibliothek für zukünftigen Zugriff gespeichert.",
      locale: "de",
    },
    {
      name: "ui.compliance.success.open_media_library",
      value: "Medienbibliothek Öffnen",
      locale: "de",
    },
    {
      name: "ui.compliance.error.title",
      value: "Fehler beim Erstellen der PDF",
      locale: "de",
    },
    {
      name: "ui.compliance.error.try_again",
      value: "Erneut Versuchen",
      locale: "de",
    },
  ];

  for (const trans of translations) {
    await ctx.db.insert("objects", {
      organizationId: systemOrgId,
      type: "translation",
      locale: trans.locale,
      name: trans.name,
      value: trans.value,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  console.log(`✅ Seeded ${translations.length} compliance translations`);
}
