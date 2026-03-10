/**
 * SHARED EMAIL BRAND CONSTANTS
 *
 * Centralized brand identity, colors, and HTML helpers for all system emails.
 * Uses the Design Guard "Midnight" dark theme with sevenlayers orange accent.
 *
 * Usage:
 *   import { EMAIL_BRAND, EMAIL_COLORS, emailDarkWrapper, emailHeader, emailFooter, emailButton } from "../lib/emailBrandConstants";
 */

// ============================================================================
// BRAND IDENTITY
// ============================================================================

export const EMAIL_BRAND = {
  /** Display name — always lowercase per CI rules */
  name: "sevenlayers",
  /** Tagline */
  tagline: "Business Operating System",
} as const;

// ============================================================================
// MIDNIGHT COLOR PALETTE
// ============================================================================

export const EMAIL_COLORS = {
  // Primary accent
  accent: "#E8520A",
  accentHover: "#CC4709",

  // Dark surfaces
  pageBg: "#0A0A0A",
  surface: "#141414",
  surfaceRaised: "#1A1A1A",
  surfaceHover: "#1E1E1E",

  // Text hierarchy
  textPrimary: "#EDEDED",
  textSecondary: "#888888",
  textTertiary: "#555555",

  // Borders
  border: "#262626",
  borderHover: "#3A3A3A",

  // Semantic colors (for dark backgrounds)
  success: "#34D399",
  successSubtle: "rgba(52,211,153,0.10)",
  warning: "#FBBF24",
  warningSubtle: "rgba(251,191,36,0.10)",
  error: "#EF4444",
  errorSubtle: "rgba(239,68,68,0.10)",
  info: "#3B82F6",
  infoSubtle: "rgba(59,130,246,0.10)",
} as const;

// ============================================================================
// CSS BUILDING BLOCKS
// ============================================================================

export const EMAIL_STYLES = {
  fontStack:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  monoStack: "'Courier New', Courier, monospace",

  buttonRadius: "6px",
  cardRadius: "8px",
  containerRadius: "12px",

  cardShadow: "0 4px 16px rgba(0,0,0,0.65)",
  containerShadow: "0 8px 32px rgba(0,0,0,0.4)",

  maxWidth: "600px",
} as const;

// ============================================================================
// HTML HELPER FUNCTIONS
// ============================================================================

/**
 * Wraps email content in a dark-themed, email-client-safe HTML document.
 * Uses table-based layout for Outlook compatibility.
 */
export function emailDarkWrapper(
  content: string,
  options?: { lang?: string }
): string {
  const lang = options?.lang || "en";
  return `<!DOCTYPE html>
<html lang="${lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_COLORS.pageBg};font-family:${EMAIL_STYLES.fontStack};color:${EMAIL_COLORS.textPrimary};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${EMAIL_COLORS.pageBg};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="${EMAIL_STYLES.maxWidth}" cellpadding="0" cellspacing="0" style="max-width:${EMAIL_STYLES.maxWidth};width:100%;background-color:${EMAIL_COLORS.surface};border-radius:${EMAIL_STYLES.containerRadius};overflow:hidden;border:1px solid ${EMAIL_COLORS.border};">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Standard email header row with sevenlayers logo.
 */
export function emailHeader(options?: { subtitle?: string }): string {
  const subtitleHtml = options?.subtitle
    ? `<p style="margin:8px 0 0;font-size:13px;color:${EMAIL_COLORS.textSecondary};">${options.subtitle}</p>`
    : "";
  return `<tr>
  <td style="padding:32px 40px 24px;border-bottom:1px solid ${EMAIL_COLORS.border};">
    <img src="https://sevenlayers.io/sevenlayers-logo.png" alt="${EMAIL_BRAND.name}" style="max-height:28px;width:auto;" />
    ${subtitleHtml}
  </td>
</tr>`;
}

/**
 * Standard email footer row with copyright.
 */
export function emailFooter(options?: { extra?: string }): string {
  const year = new Date().getFullYear();
  const extraHtml = options?.extra
    ? `<p style="margin:0 0 8px;font-size:12px;color:${EMAIL_COLORS.textTertiary};">${options.extra}</p>`
    : "";
  return `<tr>
  <td style="padding:24px 40px;border-top:1px solid ${EMAIL_COLORS.border};text-align:center;">
    ${extraHtml}
    <p style="margin:0;font-size:12px;color:${EMAIL_COLORS.textTertiary};">
      &copy; ${year} ${EMAIL_BRAND.name}
    </p>
  </td>
</tr>`;
}

/**
 * CTA button — always has 1px solid border per Design Guard CI.
 */
export function emailButton(
  label: string,
  url: string,
  options?: { variant?: "primary" | "secondary" | "danger" }
): string {
  const variant = options?.variant || "primary";

  let bg: string;
  let textColor: string;
  let borderColor: string;

  switch (variant) {
    case "secondary":
      bg = "transparent";
      textColor = EMAIL_COLORS.accent;
      borderColor = EMAIL_COLORS.accent;
      break;
    case "danger":
      bg = EMAIL_COLORS.error;
      textColor = "#FFFFFF";
      borderColor = EMAIL_COLORS.error;
      break;
    default:
      bg = EMAIL_COLORS.accent;
      textColor = "#FFFFFF";
      borderColor = EMAIL_COLORS.accent;
      break;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td style="background:${bg};border:1px solid ${borderColor};border-radius:${EMAIL_STYLES.buttonRadius};">
      <a href="${url}" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:${textColor};text-decoration:none;letter-spacing:0.3px;">${label}</a>
    </td>
  </tr>
</table>`;
}

/**
 * Content row — wraps arbitrary HTML in a padded table row.
 */
export function emailContentRow(innerHtml: string): string {
  return `<tr>
  <td style="padding:24px 40px;">
    ${innerHtml}
  </td>
</tr>`;
}

/**
 * Info box — a bordered section for callouts/details.
 */
export function emailInfoBox(
  innerHtml: string,
  options?: { borderColor?: string }
): string {
  const bc = options?.borderColor || EMAIL_COLORS.accent;
  return `<div style="background:${EMAIL_COLORS.surfaceRaised};border-left:3px solid ${bc};border-radius:${EMAIL_STYLES.cardRadius};padding:16px 20px;margin:16px 0;">
  ${innerHtml}
</div>`;
}

/**
 * Metric display — large number with label.
 */
export function emailMetric(
  value: string,
  label: string,
  options?: { color?: string }
): string {
  const color = options?.color || EMAIL_COLORS.accent;
  return `<div style="background:${EMAIL_COLORS.surfaceRaised};border-radius:${EMAIL_STYLES.cardRadius};padding:20px;margin:16px 0;text-align:center;">
  <div style="font-size:32px;font-weight:bold;color:${color};">${value}</div>
  <div style="color:${EMAIL_COLORS.textSecondary};font-size:14px;margin-top:4px;">${label}</div>
</div>`;
}

/**
 * Section heading inside content.
 */
export function emailHeading(
  text: string,
  options?: { level?: 1 | 2 | 3 }
): string {
  const level = options?.level || 1;
  const sizes: Record<number, string> = { 1: "22px", 2: "18px", 3: "15px" };
  const margins: Record<number, string> = {
    1: "0 0 16px",
    2: "0 0 12px",
    3: "0 0 8px",
  };
  return `<h${level} style="margin:${margins[level]};font-size:${sizes[level]};font-weight:600;color:${EMAIL_COLORS.textPrimary};">${text}</h${level}>`;
}

/**
 * Body paragraph.
 */
export function emailParagraph(
  text: string,
  options?: { muted?: boolean; small?: boolean }
): string {
  const color = options?.muted
    ? EMAIL_COLORS.textSecondary
    : EMAIL_COLORS.textPrimary;
  const size = options?.small ? "13px" : "15px";
  return `<p style="margin:0 0 12px;font-size:${size};line-height:1.6;color:${color};">${text}</p>`;
}

/**
 * Divider line.
 */
export function emailDivider(): string {
  return `<hr style="border:none;border-top:1px solid ${EMAIL_COLORS.border};margin:24px 0;" />`;
}
