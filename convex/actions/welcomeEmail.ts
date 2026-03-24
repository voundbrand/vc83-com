"use node";

/**
 * WELCOME EMAIL ACTION
 *
 * Sends a personalized welcome email with onboarding checklist
 * when a user signs up for a free account.
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import {
  EMAIL_BRAND,
  EMAIL_COLORS,
  EMAIL_STYLES,
  emailDarkWrapper,
  emailHeader,
  emailFooter,
  emailButton,
  emailContentRow,
  emailHeading,
  emailParagraph,
  emailInfoBox,
  emailDivider,
} from "../lib/emailBrandConstants";

const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
};

export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    organizationName: v.string(),
    apiKeyPrefix: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const language = args.language || "en";

    const subjects: Record<string, string> = {
      en: `Welcome to sevenlayers, ${args.firstName}!`,
      de: `Willkommen bei sevenlayers, ${args.firstName}!`,
    };

    const emailArgs = { ...args, language };
    const html = generateWelcomeEmailHTML(emailArgs);
    const text = generateWelcomeEmailText(emailArgs);

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: process.env.REPLY_TO_EMAIL || "support@l4yercak3.com",
        to: args.email,
        subject: subjects[language] || subjects.en,
        html,
        text,
        headers: {
          'X-Entity-Ref-ID': `welcome-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send welcome email:", error);
        throw new Error(`Email could not be sent: ${error.message}`);
      }

      console.log("Welcome email sent successfully:", data);
      return { success: true, emailId: data?.id };
    } catch (error) {
      console.error("Error sending welcome email:", error);
      throw error;
    }
  },
});

function generateWelcomeEmailHTML(args: {
  firstName: string;
  organizationName: string;
  apiKeyPrefix: string;
  language: string;
}): string {
  const siteBaseUrl = (process.env.SITE_URL || "https://l4yercak3.com").replace(/\/+$/, "");
  const docsBaseUrl = (process.env.DOCS_URL || "https://docs.l4yercak3.com").replace(/\/+$/, "");
  const isDE = args.language === "de";

  const checklistItem = (num: string, title: string, desc: string, link?: { label: string; url: string }) => `
    <div style="padding:16px 0;border-bottom:1px solid ${EMAIL_COLORS.border};">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">${num} ${title}</p>
      <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textSecondary};">${desc}</p>
      ${link ? `<a href="${link.url}" style="display:inline-block;margin-top:8px;font-size:13px;color:${EMAIL_COLORS.accent};text-decoration:underline;">${link.label}</a>` : ""}
    </div>`;

  return emailDarkWrapper(
    emailHeader() +
    emailContentRow(
      emailHeading(isDE
        ? `Willkommen bei ${EMAIL_BRAND.name}, ${args.firstName}!`
        : `Welcome to ${EMAIL_BRAND.name}, ${args.firstName}!`
      ) +
      emailParagraph(isDE
        ? `Ihre Organisation <strong>${args.organizationName}</strong> ist einsatzbereit. Sie haben jetzt ein leistungsstarkes Backend für Ihr Geschäft — ganz ohne Backend-Programmierung.`
        : `Your organization <strong>${args.organizationName}</strong> is ready to go. You now have a powerful backend for your freelance business — no backend coding required.`
      ) +

      // API key box
      `<div style="background:${EMAIL_COLORS.surfaceRaised};border-left:3px solid ${EMAIL_COLORS.warning};border-radius:${EMAIL_STYLES.cardRadius};padding:16px 20px;margin:16px 0;">
        <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${EMAIL_COLORS.warning};">${isDE ? "Ihr API-Schlüssel-Präfix:" : "Your API Key Prefix:"}</p>
        <code style="font-family:${EMAIL_STYLES.monoStack};font-size:14px;color:${EMAIL_COLORS.textPrimary};word-break:break-all;">${args.apiKeyPrefix}...</code>
        <p style="margin:8px 0 0;font-size:12px;color:${EMAIL_COLORS.textTertiary};">${isDE ? "(Der vollständige Schlüssel wurde einmalig bei der Registrierung angezeigt. Prüfen Sie Ihren Download oder die Registrierungsbestätigung.)" : "(Full key was shown once during signup. Check your download or signup confirmation.)"}</p>
      </div>` +

      // Checklist
      emailDivider() +
      emailHeading(isDE ? "Ihre nächsten Schritte" : "Your Next Steps", { level: 2 }) +
      `<div style="background:${EMAIL_COLORS.surfaceRaised};border-left:3px solid ${EMAIL_COLORS.accent};border-radius:${EMAIL_STYLES.cardRadius};padding:4px 20px;">` +
      checklistItem("1.",
        isDE ? "Freelancer-Portal-Vorlage herunterladen" : "Download the Freelancer Portal Template",
        isDE ? "Holen Sie sich die kostenlose Next.js-Vorlage, die sich mit Ihrem Backend verbindet" : "Get the free Next.js template that connects to your backend",
        { label: isDE ? "Vorlage herunterladen" : "Download Template", url: `${siteBaseUrl}/templates/freelancer-portal` }
      ) +
      checklistItem("2.",
        isDE ? "API-Schlüssel einrichten" : "Set Up Your API Key",
        isDE ? "Fügen Sie Ihren API-Schlüssel zur .env.local-Datei der Vorlage hinzu" : "Add your API key to the template's .env.local file"
      ) +
      checklistItem("3.",
        isDE ? "Vorlage bereitstellen" : "Deploy Your Template",
        isDE ? "In 2 Minuten auf Vercel (kostenlos) bereitstellen" : "Deploy to Vercel (free) in 2 minutes",
        { label: isDE ? "Jetzt bereitstellen" : "Deploy Now", url: "https://vercel.com/new" }
      ) +
      checklistItem("4.",
        isDE ? "Ersten Kontakt hinzufügen" : "Add Your First Contact",
        isDE ? "Testen Sie das CRM, indem Sie einen Kunden oder Interessenten hinzufügen" : "Test the CRM by adding a client or prospect"
      ) +
      `<div style="padding:16px 0;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">5. ${isDE ? "Erste Rechnung erstellen" : "Create Your First Invoice"}</p>
        <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textSecondary};">${isDE ? "Nutzen Sie das integrierte Rechnungssystem" : "Use the built-in invoicing system"}</p>
      </div>` +
      `</div>` +

      // Resources
      emailDivider() +
      emailHeading(isDE ? "Hilfreiche Ressourcen" : "Helpful Resources", { level: 2 }) +
      `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
        <li><a href="${docsBaseUrl}/quickstart" style="color:${EMAIL_COLORS.accent};">${isDE ? "Schnellstartanleitung" : "Quickstart Guide"}</a> — ${isDE ? "Einrichtung in 5 Minuten" : "5-minute setup walkthrough"}</li>
        <li><a href="${docsBaseUrl}/api" style="color:${EMAIL_COLORS.accent};">${isDE ? "API-Dokumentation" : "API Documentation"}</a> — ${isDE ? "Vollständige API-Referenz" : "Complete API reference"}</li>
        <li><a href="${docsBaseUrl}/templates" style="color:${EMAIL_COLORS.accent};">${isDE ? "Vorlagen-Bibliothek" : "Template Library"}</a> — ${isDE ? "Fertige Vorlagen für gängige Anwendungsfälle" : "Pre-built templates for common use cases"}</li>
        <li><a href="${siteBaseUrl}/support" style="color:${EMAIL_COLORS.accent};">Support</a> — ${isDE ? "Hilfe von unserem Team erhalten" : "Get help from our team"}</li>
      </ul>` +

      // What you can build
      emailDivider() +
      emailHeading(isDE ? "Was Sie damit bauen können" : "What You Can Build", { level: 2 }) +
      emailParagraph(isDE
        ? `Mit ${EMAIL_BRAND.name} als Backend können Sie Folgendes erstellen:`
        : `With ${EMAIL_BRAND.name} as your backend, you can build:`
      ) +
      `<ul style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
        <li>${isDE ? "Kundenportale mit Echtzeit-Updates" : "Client portals with real-time updates"}</li>
        <li>${isDE ? "Rechnungsverwaltungssysteme" : "Invoice management systems"}</li>
        <li>${isDE ? "Projektverfolgungs-Dashboards" : "Project tracking dashboards"}</li>
        <li>${isDE ? "CRM-Systeme mit Kontaktsynchronisierung" : "CRM systems with contact syncing"}</li>
        <li>${isDE ? "KI-gestützte Workflows und Automatisierungen" : "AI-powered workflows and automations"}</li>
        <li>${isDE ? "Multi-Tenant-SaaS-Anwendungen" : "Multi-tenant SaaS applications"}</li>
      </ul>` +

      // Upgrade
      emailDivider() +
      emailHeading(isDE ? "Bereit für ein Upgrade?" : "Ready to Upgrade?", { level: 2 }) +
      emailParagraph(isDE
        ? "Ihr kostenloses Konto beinhaltet: 100 Kontakte, 1 API-Schlüssel, 250 MB Speicher und CRM-, Projekt- und Rechnungskernfunktionen."
        : "Your free account includes: 100 contacts, 1 API key, 250 MB storage, and core CRM, projects, and invoicing."
      ) +
      emailParagraph(isDE
        ? "Mehr benötigt? <strong>Upgrade auf Starter (€199/Monat)</strong> für 1.000 Kontakte, KI-gestützte Funktionen, erweiterte Analysen, White-Label-Branding und Priority-Support."
        : "Need more? <strong>Upgrade to Starter (€199/month)</strong> for 1,000 contacts, AI-powered features, advanced analytics, white-label branding, and priority support."
      ) +
      emailButton(isDE ? "Preise ansehen" : "View Pricing", `${siteBaseUrl}/pricing`)
    ) +
    emailFooter({ extra: isDE
      ? `Brauchen Sie Hilfe? Antworten Sie auf diese E-Mail oder besuchen Sie <a href="${siteBaseUrl}/support" style="color:${EMAIL_COLORS.textTertiary};text-decoration:underline;">unsere Support-Seite</a>.`
      : `Need help? Reply to this email or visit <a href="${siteBaseUrl}/support" style="color:${EMAIL_COLORS.textTertiary};text-decoration:underline;">our support page</a>.`
    }),
    { lang: args.language }
  );
}

function generateWelcomeEmailText(args: {
  firstName: string;
  organizationName: string;
  apiKeyPrefix: string;
  language: string;
}): string {
  const siteBaseUrl = (process.env.SITE_URL || "https://l4yercak3.com").replace(/\/+$/, "");
  const docsBaseUrl = (process.env.DOCS_URL || "https://docs.l4yercak3.com").replace(/\/+$/, "");

  if (args.language === "de") {
    return `
Willkommen bei sevenlayers, ${args.firstName}!

Ihre Organisation "${args.organizationName}" ist einsatzbereit. Sie haben jetzt ein leistungsstarkes Backend für Ihr Geschäft — ganz ohne Backend-Programmierung.

IHR API-SCHLÜSSEL-PRÄFIX: ${args.apiKeyPrefix}...
(Der vollständige Schlüssel wurde einmalig bei der Registrierung angezeigt. Prüfen Sie Ihren Download oder die Registrierungsbestätigung.)

IHRE NÄCHSTEN SCHRITTE:

1. Freelancer-Portal-Vorlage herunterladen
Holen Sie sich die kostenlose Next.js-Vorlage, die sich mit Ihrem Backend verbindet
-> ${siteBaseUrl}/templates/freelancer-portal

2. API-Schlüssel einrichten
Fügen Sie Ihren API-Schlüssel zur .env.local-Datei der Vorlage hinzu:
NEXT_PUBLIC_API_KEY=ihr_schlüssel_hier

3. Vorlage bereitstellen
In 2 Minuten auf Vercel (kostenlos) bereitstellen
-> https://vercel.com/new

4. Ersten Kontakt hinzufügen
Testen Sie das CRM, indem Sie einen Kunden oder Interessenten hinzufügen

5. Erste Rechnung erstellen
Nutzen Sie das integrierte Rechnungssystem

HILFREICHE RESSOURCEN:

- Schnellstartanleitung: ${docsBaseUrl}/quickstart
- API-Dokumentation: ${docsBaseUrl}/api
- Vorlagen-Bibliothek: ${docsBaseUrl}/templates
- Support: ${siteBaseUrl}/support

WAS SIE DAMIT BAUEN KÖNNEN:

Mit sevenlayers als Backend können Sie Folgendes erstellen:
- Kundenportale mit Echtzeit-Updates
- Rechnungsverwaltungssysteme
- Projektverfolgungs-Dashboards
- CRM-Systeme mit Kontaktsynchronisierung
- KI-gestützte Workflows und Automatisierungen
- Multi-Tenant-SaaS-Anwendungen

BEREIT FÜR EIN UPGRADE?

Ihr kostenloses Konto beinhaltet:
- 100 Kontakte
- 1 API-Schlüssel
- 250 MB Speicher
- CRM-, Projekt- und Rechnungskernfunktionen

Mehr benötigt? Upgrade auf Starter (€199/Monat) für:
- 1.000 Kontakte
- KI-gestützte Funktionen
- Erweiterte Analysen
- White-Label-Branding
- Priority-Support

Preise ansehen: ${siteBaseUrl}/pricing

---

Brauchen Sie Hilfe? Antworten Sie auf diese E-Mail oder besuchen Sie ${siteBaseUrl}/support

— Das sevenlayers Team
    `.trim();
  }

  return `
Welcome to sevenlayers, ${args.firstName}!

Your organization "${args.organizationName}" is ready to go. You now have a powerful backend for your freelance business — no backend coding required.

YOUR API KEY PREFIX: ${args.apiKeyPrefix}...
(Full key was shown once during signup. Check your download or signup confirmation.)

YOUR NEXT STEPS:

1. Download the Freelancer Portal Template
Get the free Next.js template that connects to your backend
-> ${siteBaseUrl}/templates/freelancer-portal

2. Set Up Your API Key
Add your API key to the template's .env.local file:
NEXT_PUBLIC_API_KEY=your_key_here

3. Deploy Your Template
Deploy to Vercel (free) in 2 minutes
-> https://vercel.com/new

4. Add Your First Contact
Test the CRM by adding a client or prospect

5. Create Your First Invoice
Use the built-in invoicing system

HELPFUL RESOURCES:

- Quickstart Guide: ${docsBaseUrl}/quickstart
- API Documentation: ${docsBaseUrl}/api
- Template Library: ${docsBaseUrl}/templates
- Support: ${siteBaseUrl}/support

WHAT YOU CAN BUILD:

With sevenlayers as your backend, you can build:
- Client portals with real-time updates
- Invoice management systems
- Project tracking dashboards
- CRM systems with contact syncing
- AI-powered workflows and automations
- Multi-tenant SaaS applications

READY TO UPGRADE?

Your free account includes:
- 100 contacts
- 1 API key
- 250 MB storage
- Core CRM, projects, and invoicing

Need more? Upgrade to Starter (€199/month) for:
- 1,000 contacts
- AI-powered features
- Advanced analytics
- White-label branding
- Priority support

View pricing: ${siteBaseUrl}/pricing

---

Need help? Reply to this email or visit ${siteBaseUrl}/support

— The sevenlayers Team
  `.trim();
}
