/**
 * EMAIL TEMPLATE SCHEMA
 *
 * Schema-based email templates that can be:
 * - Edited through UI
 * - Modified by AI agents
 * - Stored in database
 * - Rendered dynamically
 *
 * This extends the existing GenericEmailProps to add metadata
 * for template management and AI editing.
 */

import type { GenericEmailProps, EmailSection } from "./generic-types";

/**
 * Email Template Schema
 *
 * Complete schema for an email template including:
 * - Metadata (name, description, category)
 * - Default structure (sections and layout)
 * - Variable definitions for AI/user editing
 */
export interface EmailTemplateSchema {
  /** Template identification */
  code: string;
  name: string;
  description: string;
  category: "transactional" | "marketing" | "event" | "support";
  version: string;

  /** Template structure */
  defaultSections: EmailSection[];

  /** Brand/visual settings */
  defaultBrandColor: string;
  supportedLanguages: string[];

  /** Variable definitions for dynamic content */
  variables: EmailTemplateVariable[];

  /** Section templates - reusable section configurations */
  sectionTemplates?: Record<string, EmailSection>;

  /** Preview data for rendering examples */
  previewData?: EmailTemplatePreviewData;
}

/**
 * Template Variable Definition
 *
 * Defines dynamic variables that can be filled in:
 * - At send time with real data
 * - By AI agents for content generation
 * - By users through the UI editor
 */
export interface EmailTemplateVariable {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "url" | "email" | "currency";
  description: string;
  required: boolean;
  defaultValue?: string | number | boolean;

  /** AI instructions for generating this variable */
  aiInstructions?: string;

  /** Validation rules */
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}

/**
 * Preview Data Structure
 */
export interface EmailTemplatePreviewData {
  header: {
    brandColor: string;
    logo?: string;
    companyName: string;
  };
  recipient: {
    firstName: string;
    lastName: string;
    email: string;
  };
  [key: string]: unknown;
}

/**
 * Email Template Render Options
 */
export interface EmailTemplateRenderOptions {
  /** Data to inject into template */
  data: Record<string, unknown>;

  /** Language to render in */
  language?: string;

  /** Override brand color */
  brandColor?: string;

  /** Render mode */
  mode?: "preview" | "production" | "test";
}

/**
 * Convert GenericEmailProps to Schema
 *
 * Utility to convert existing React-based templates to schemas
 */
export function genericPropsToSchema(
  props: GenericEmailProps,
  metadata: Pick<EmailTemplateSchema, "code" | "name" | "description" | "category" | "version">
): EmailTemplateSchema {
  // Extract variables from sections
  const variables = extractVariablesFromSections(props.sections);

  return {
    ...metadata,
    defaultSections: props.sections,
    defaultBrandColor: props.header.brandColor || "#6B46C1",
    supportedLanguages: ["en", "de", "es", "fr"],
    variables,
    previewData: {
      header: props.header,
      recipient: props.recipient,
    },
  };
}

/**
 * Extract Variables from Sections
 *
 * Analyzes sections to find dynamic placeholders
 */
function extractVariablesFromSections(sections: EmailSection[]): EmailTemplateVariable[] {
  const variables: EmailTemplateVariable[] = [];
  const seen = new Set<string>();

  // Scan through sections looking for {variable} patterns
  const scanForVariables = (text: string) => {
    const matches = text.match(/\{([^}]+)\}/g);
    if (matches) {
      matches.forEach(match => {
        const varName = match.slice(1, -1);
        if (!seen.has(varName)) {
          seen.add(varName);
          variables.push({
            name: varName,
            type: inferVariableType(varName),
            description: `Dynamic variable: ${varName}`,
            required: true,
          });
        }
      });
    }
  };

  // Recursively scan all sections
  sections.forEach(section => {
    const sectionStr = JSON.stringify(section);
    scanForVariables(sectionStr);
  });

  return variables;
}

/**
 * Infer Variable Type from Name
 */
function inferVariableType(name: string): EmailTemplateVariable["type"] {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("email")) return "email";
  if (lowerName.includes("url") || lowerName.includes("link")) return "url";
  if (lowerName.includes("date") || lowerName.includes("time")) return "date";
  if (lowerName.includes("price") || lowerName.includes("amount") || lowerName.includes("total")) return "currency";
  if (lowerName.includes("count") || lowerName.includes("quantity")) return "number";
  if (lowerName.includes("is") || lowerName.includes("has")) return "boolean";

  return "string";
}

/**
 * Render Email from Schema
 *
 * Takes a schema and data, returns rendered HTML
 */
export function renderEmailFromSchema(
  schema: EmailTemplateSchema,
  options: EmailTemplateRenderOptions
): string {
  // This will be implemented with the email renderer
  // For now, return a placeholder
  return `<!-- Email template: ${schema.name} -->`;
}
