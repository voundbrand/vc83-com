/**
 * TEMPLATE AND THEME REGISTRY
 *
 * Maps codes (stored in DB) to components/themes (stored in code).
 *
 * Architecture:
 * - Templates = HTML structure (landing-page, blog-post, etc.)
 * - Themes = Visual appearance (modern-gradient, minimalist, etc.)
 * - Mix and match: landing-page + modern-gradient, blog-post + minimalist, etc.
 */

import { TemplateComponent } from "./types";
import { TemplateContentSchema } from "./schema-types";

// Import templates
import { LandingPageTemplate } from "./web/landing-page";
import { landingPageSchema } from "./web/landing-page/schema";
import { EventLandingTemplate } from "./web/event-landing";
import { eventLandingSchema } from "./web/event-landing/schema";

// Import themes (all themes in one file!)
import { webPublishingThemes, getThemeByCode, getDefaultTheme } from "./themes";

/**
 * TEMPLATE REGISTRY
 *
 * Maps template codes to React components.
 */
export const templateRegistry: Record<string, TemplateComponent> = {
  "landing-page": LandingPageTemplate,
  "event-landing": EventLandingTemplate,
  // Add more templates as you create them:
  // "blog-post": BlogPostTemplate,
  // "product-page": ProductPageTemplate,
};

/**
 * TEMPLATE SCHEMA REGISTRY
 *
 * Maps template codes to their content schemas.
 */
export const templateSchemaRegistry: Record<string, TemplateContentSchema> = {
  "landing-page": landingPageSchema,
  "event-landing": eventLandingSchema,
  // Add more schemas as you create them:
  // "blog-post": blogPostSchema,
  // "product-page": productPageSchema,
};

/**
 * Get Template Component by Code
 *
 * Returns the React component for a template code.
 * Falls back to landing-page if template not found.
 */
export function getTemplateComponent(templateCode: string): TemplateComponent {
  const component = templateRegistry[templateCode];

  if (!component) {
    console.warn(
      `Template "${templateCode}" not found in registry. Falling back to landing-page.`
    );
    return templateRegistry["landing-page"];
  }

  return component;
}

/**
 * Get Theme by Code
 *
 * Uses the themes array from themes.ts (single-file pattern).
 * Falls back to default theme if theme not found.
 */
export function getTheme(themeCode: string) {
  const theme = getThemeByCode(themeCode);

  if (!theme) {
    console.warn(
      `Theme "${themeCode}" not found. Falling back to default theme.`
    );
    return getDefaultTheme();
  }

  return theme;
}

/**
 * Get All Template Codes
 */
export function getAllTemplateCodes(): string[] {
  return Object.keys(templateRegistry);
}

/**
 * Get All Theme Codes
 */
export function getAllThemeCodes(): string[] {
  return webPublishingThemes.map((theme) => theme.code);
}

/**
 * Get All Themes (for UI pickers, etc.)
 */
export function getAllThemes() {
  return webPublishingThemes;
}

/**
 * EMAIL TEMPLATES
 *
 * Import email template functions for backend use
 */
export {
  getEmailTemplate,
  getAllEmailTemplateCodes,
  emailTemplateExists,
  getEmailTemplateMetadata,
  getAllEmailTemplateMetadata
} from "./emails/registry";

/**
 * Check if Template Exists
 */
export function templateExists(templateCode: string): boolean {
  return templateCode in templateRegistry;
}

/**
 * Check if Theme Exists
 */
export function themeExists(themeCode: string): boolean {
  return webPublishingThemes.some((theme) => theme.code === themeCode);
}

/**
 * Get Template Schema by Code
 *
 * Returns the content schema for a template.
 * Falls back to landing-page schema if not found.
 */
export function getTemplateSchema(templateCode: string): TemplateContentSchema {
  const schema = templateSchemaRegistry[templateCode];

  if (!schema) {
    console.warn(
      `Schema for template "${templateCode}" not found. Falling back to landing-page schema.`
    );
    return templateSchemaRegistry["landing-page"];
  }

  return schema;
}

/**
 * Get Template Metadata
 *
 * Returns template info for UI pickers.
 */
export function getTemplateMetadata(templateCode: string) {
  const schema = getTemplateSchema(templateCode);
  return {
    code: schema.templateCode,
    name: schema.templateName,
    description: schema.description,
  };
}

/**
 * Get All Template Metadata
 *
 * Returns metadata for all templates (for UI pickers).
 */
export function getAllTemplateMetadata() {
  return Object.keys(templateRegistry).map((code) => getTemplateMetadata(code));
}
