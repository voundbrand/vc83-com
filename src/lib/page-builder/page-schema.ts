/**
 * PAGE SCHEMA
 *
 * Defines the complete JSON structure for AI-generated pages.
 * This is what the AI outputs and what gets stored in project.customProperties.
 */

import type { PageSection } from "./section-registry";

// ============================================================================
// PAGE THEME
// ============================================================================

export interface PageTheme {
  /** Primary brand color (hex) */
  primaryColor?: string;
  /** Secondary accent color (hex) */
  secondaryColor?: string;
  /** Default text color */
  textColor?: string;
  /** Page background color */
  backgroundColor?: string;
  /** Google Font family name */
  fontFamily?: string;
  /** Border radius preset */
  borderRadius?: "none" | "sm" | "md" | "lg" | "xl" | "full";
}

// ============================================================================
// PAGE METADATA
// ============================================================================

export interface PageMetadata {
  /** Page title (used in <title> and og:title) */
  title: string;
  /** Meta description (used in <meta> and og:description) */
  description?: string;
  /** URL slug (e.g., "sailing-school-landing") */
  slug: string;
  /** Open Graph image URL */
  ogImage?: string;
  /** Favicon URL */
  favicon?: string;
  /** Page language */
  language?: "en" | "de";
}

// ============================================================================
// PAGE INTEGRATIONS
// ============================================================================

export interface PageIntegrations {
  /** Booking resource IDs available on this page */
  bookingResources?: string[];
  /** Form IDs available on this page */
  forms?: string[];
  /** Default contact email for CRM integration */
  contactEmail?: string;
}

// ============================================================================
// REVISION ENTRY
// ============================================================================

export interface PageRevision {
  /** Unix timestamp */
  at: number;
  /** Who made the change */
  by: "ai" | "user";
  /** Description of what changed */
  summary: string;
}

// ============================================================================
// AI GENERATED PAGE SCHEMA
// ============================================================================

/**
 * The complete schema for an AI-generated page.
 * This is what the AI outputs and what gets stored.
 */
export interface AIGeneratedPageSchema {
  /** Schema version for future migrations */
  version: "1.0";

  /** Page metadata (title, slug, etc.) */
  metadata: PageMetadata;

  /** Optional theme customization */
  theme?: PageTheme;

  /** Array of page sections */
  sections: PageSection[];

  /** Integration references */
  integrations?: PageIntegrations;

  /** When the page was first generated */
  generatedAt: number;

  /** Who generated it */
  generatedBy: "ai" | "user";

  /** Link to AI conversation for context */
  conversationId?: string;

  /** Revision history */
  revisions: PageRevision[];
}

// ============================================================================
// PROJECT CONFIG (stored in customProperties)
// ============================================================================

/**
 * The config stored in project.customProperties for AI-generated pages.
 */
export interface AIGeneratedProjectConfig {
  /** The page schema */
  pageSchema: AIGeneratedPageSchema;

  /** Last edit timestamp */
  lastEditedAt?: number;

  /** Last editor user ID */
  lastEditedBy?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a new empty page schema with defaults.
 */
export function createEmptyPageSchema(
  metadata: Partial<PageMetadata> = {}
): AIGeneratedPageSchema {
  return {
    version: "1.0",
    metadata: {
      title: metadata.title || "Untitled Page",
      slug: metadata.slug || "untitled-page",
      description: metadata.description,
      language: metadata.language || "en",
    },
    sections: [],
    generatedAt: Date.now(),
    generatedBy: "user",
    revisions: [],
  };
}

/**
 * Generates a unique section ID.
 */
export function generateSectionId(): string {
  return `sec_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generates a unique feature ID.
 */
export function generateFeatureId(): string {
  return `feat_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Deep merges partial schema updates into existing schema.
 */
export function mergePageSchema(
  existing: AIGeneratedPageSchema,
  updates: Partial<AIGeneratedPageSchema>
): AIGeneratedPageSchema {
  return {
    ...existing,
    ...updates,
    metadata: {
      ...existing.metadata,
      ...updates.metadata,
    },
    theme: {
      ...existing.theme,
      ...updates.theme,
    },
    integrations: {
      ...existing.integrations,
      ...updates.integrations,
    },
    revisions: updates.revisions || existing.revisions,
  };
}
