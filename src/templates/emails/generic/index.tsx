/**
 * UNIVERSAL GENERIC EMAIL TEMPLATE
 *
 * This template can render ANY type of email based on the sections provided.
 * AI-configurable: colors, logo, sections, language, content.
 *
 * Design: Professional purple (#6B46C1) by default, AI can change to any brand color
 * Languages: DE, EN, ES, FR
 * Sections: Modular - AI determines which to include
 *
 * Version: 1.0.0 - Universal Business Communication Base
 */

import type { GenericEmailProps, GenericEmailOutput } from "../generic-types";
import { renderSection } from "../section-renderer";
import { getTranslations, replaceVariables } from "../translations";

/**
 * Universal Generic Email Template
 *
 * Renders emails based on modular sections.
 * AI controls which sections to include and their content.
 */
export function GenericEmailTemplate(props: GenericEmailProps): GenericEmailOutput {
  const { header, recipient, sections, footer, language = "en" } = props;

  const t = getTranslations(language);
  const primaryColor = header.brandColor || '#6B46C1'; // Default purple
  const fullName = `${recipient.firstName} ${recipient.lastName}`;
  const year = new Date().getFullYear();

  // Generate subject from first hero section or default
  const heroSection = sections.find(s => s.type === 'hero');
  const defaultSubject = heroSection && 'title' in heroSection
    ? heroSection.title
    : `${t.greeting} ${recipient.firstName}`;

  const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${header.companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

    <!-- Header with Brand Color -->
    <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${adjustBrightness(primaryColor, -15)} 100%); padding: 50px 40px; text-align: center;">
      ${header.logo ? `
        <div style="margin-bottom: 25px;">
          <img src="${header.logo}" alt="${header.companyName}" style="max-width: 180px; height: auto;">
        </div>
      ` : `
        <div style="width: 60px; height: 3px; background: rgba(255, 255, 255, 0.5); margin: 0 auto 25px; border-radius: 2px;"></div>
      `}
      <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">
        ${header.companyName}
      </h1>
      <div style="width: 60px; height: 3px; background: rgba(255, 255, 255, 0.5); margin: 25px auto 0; border-radius: 2px;"></div>
    </div>

    <!-- Content -->
    <div style="padding: 50px 40px;">
      <!-- Greeting -->
      <div style="margin-bottom: 35px;">
        <p style="margin: 0; font-size: 17px; color: #64748b;">
          ${t.greeting} <strong style="color: #0f172a;">${fullName}</strong>
        </p>
      </div>

      <!-- Dynamic Sections (AI-controlled) -->
      ${sections.map(section => renderSection(section, primaryColor)).join('\n')}

      <!-- Closing -->
      <div style="text-align: center; margin-top: 50px; padding-top: 35px; border-top: 2px solid #e2e8f0;">
        <p style="margin: 0 0 12px 0; font-size: 16px; color: #0f172a; font-weight: 500;">
          ${t.regards},
        </p>
        <p style="margin: 0; font-size: 15px; color: #64748b;">
          ${replaceVariables(t.team, { companyName: header.companyName })}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 30px 40px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); text-align: center; border-top: 2px solid #e2e8f0;">
      ${footer.tagline ? `
        <p style="margin: 0 0 15px 0; font-size: 14px; color: #475569; font-style: italic;">
          ${footer.tagline}
        </p>
      ` : ''}

      ${footer.address ? `
        <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b;">
          ${footer.address}
        </p>
      ` : ''}

      ${footer.socialLinks && footer.socialLinks.length > 0 ? `
        <div style="margin: 20px 0;">
          ${footer.socialLinks.map(link => `
            <a href="${link.url}" style="display: inline-block; margin: 0 8px; text-decoration: none; color: ${primaryColor}; font-size: 13px; font-weight: 600;">
              ${link.platform}
            </a>
          `).join(' • ')}
        </div>
      ` : ''}

      <p style="margin: 15px 0 6px 0; font-size: 13px; color: #64748b;">
        ${replaceVariables(t.copyright, { year: year.toString(), companyName: footer.companyName })}
      </p>

      ${footer.unsubscribeUrl ? `
        <p style="margin: 8px 0 0 0; font-size: 12px;">
          <a href="${footer.unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">
            ${t.unsubscribe}
          </a>
        </p>
      ` : ''}

      ${footer.legalText ? `
        <p style="margin: 15px 0 0 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
          ${footer.legalText}
        </p>
      ` : ''}
    </div>
  </div>
</body>
</html>
  `;

  // Generate preview text from first body section or hero subtitle
  let previewText = "";
  const bodySection = sections.find(s => s.type === 'body');
  if (bodySection && 'paragraphs' in bodySection && bodySection.paragraphs && bodySection.paragraphs.length > 0) {
    previewText = bodySection.paragraphs[0].substring(0, 100);
  } else if (heroSection && 'subtitle' in heroSection && heroSection.subtitle) {
    previewText = heroSection.subtitle.substring(0, 100);
  }

  return {
    html,
    subject: defaultSubject,
    previewText,
  };
}

/**
 * Utility: Adjust color brightness
 * Used to create gradient effects from brand color
 */
function adjustBrightness(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse RGB
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + percent));
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + percent));

  // Convert back to hex
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Template Metadata
 */
export const GENERIC_EMAIL_METADATA = {
  code: "email_generic_universal",
  name: "Universal Generic Email",
  description: "AI-adaptable email template that works for any business context. Modular sections allow complete customization.",
  category: "transactional" as const,
  suggestedSections: ["hero", "body", "cta"] as const,
  previewImageUrl: "",
  supportedLanguages: ["en", "de", "es", "fr"],
  author: "System",
  version: "1.0.0",
};
