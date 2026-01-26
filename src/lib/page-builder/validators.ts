/**
 * PAGE SCHEMA VALIDATORS
 *
 * Zod schemas for validating AI-generated page JSON.
 * Used to ensure AI output is safe and well-formed before rendering.
 */

import { z } from "zod";
import { allowedIcons, type PageSection } from "./section-registry";
import type { AIGeneratedPageSchema } from "./page-schema";

// ============================================================================
// CTA CONFIG SCHEMA
// ============================================================================

const ctaActionTypeSchema = z.enum([
  "link",
  "booking",
  "form",
  "scroll",
  "contact",
]);

const ctaConfigSchema = z.object({
  text: z.string().min(1).max(100),
  href: z.string().max(500).optional(),
  actionType: ctaActionTypeSchema.optional(),
  variant: z.enum(["primary", "secondary", "outline"]).optional(),
  className: z.string().max(500).optional(),
  bookingResourceId: z.string().optional(),
  formId: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

// ============================================================================
// HERO SECTION SCHEMA
// ============================================================================

const heroSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("hero"),
  className: z.string().max(500).optional(),
  props: z.object({
    badge: z.string().max(100).optional(),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional(),
    titleClassName: z.string().max(500).optional(),
    subtitleClassName: z.string().max(500).optional(),
    backgroundClassName: z.string().max(500).optional(),
    alignment: z.enum(["left", "center", "right"]).optional(),
    cta: ctaConfigSchema.optional(),
    secondaryCta: ctaConfigSchema.optional(),
    image: z
      .object({
        src: z.string().url(),
        alt: z.string().max(200),
        className: z.string().max(500).optional(),
      })
      .optional(),
  }),
});

// ============================================================================
// FEATURES SECTION SCHEMA
// ============================================================================

const featureItemSchema = z.object({
  id: z.string().min(1),
  icon: z.string().max(50).optional(),
  title: z.string().min(1).max(100),
  description: z.string().max(500),
  titleClassName: z.string().max(500).optional(),
  descriptionClassName: z.string().max(500).optional(),
  iconClassName: z.string().max(500).optional(),
});

const featuresSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("features"),
  className: z.string().max(500).optional(),
  props: z.object({
    badge: z.string().max(100).optional(),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional(),
    titleClassName: z.string().max(500).optional(),
    subtitleClassName: z.string().max(500).optional(),
    backgroundClassName: z.string().max(500).optional(),
    layout: z.enum(["grid-2", "grid-3", "grid-4", "list"]).optional(),
    features: z.array(featureItemSchema).min(1).max(12),
  }),
});

// ============================================================================
// CTA SECTION SCHEMA
// ============================================================================

const ctaSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("cta"),
  className: z.string().max(500).optional(),
  props: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    titleClassName: z.string().max(500).optional(),
    descriptionClassName: z.string().max(500).optional(),
    backgroundClassName: z.string().max(500).optional(),
    alignment: z.enum(["left", "center", "right"]).optional(),
    primaryCta: ctaConfigSchema,
    secondaryCta: ctaConfigSchema.optional(),
  }),
});

// ============================================================================
// TESTIMONIALS SECTION SCHEMA
// ============================================================================

const testimonialItemSchema = z.object({
  id: z.string().min(1),
  quote: z.string().min(1).max(500),
  author: z.string().min(1).max(100),
  role: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  avatar: z.string().url().optional(),
  rating: z.number().min(1).max(5).optional(),
});

const testimonialsSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("testimonials"),
  className: z.string().max(500).optional(),
  props: z.object({
    badge: z.string().max(100).optional(),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional(),
    titleClassName: z.string().max(500).optional(),
    subtitleClassName: z.string().max(500).optional(),
    backgroundClassName: z.string().max(500).optional(),
    layout: z.enum(["grid", "carousel", "single"]).optional(),
    testimonials: z.array(testimonialItemSchema).min(1).max(12),
  }),
});

// ============================================================================
// PRICING SECTION SCHEMA
// ============================================================================

const pricingFeatureSchema = z.object({
  text: z.string().min(1).max(200),
  included: z.boolean(),
});

const pricingTierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  price: z.string().min(1).max(50),
  priceSubtext: z.string().max(50).optional(),
  features: z.array(pricingFeatureSchema).min(1).max(15),
  cta: ctaConfigSchema,
  highlighted: z.boolean().optional(),
});

const pricingSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("pricing"),
  className: z.string().max(500).optional(),
  props: z.object({
    badge: z.string().max(100).optional(),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional(),
    titleClassName: z.string().max(500).optional(),
    subtitleClassName: z.string().max(500).optional(),
    backgroundClassName: z.string().max(500).optional(),
    tiers: z.array(pricingTierSchema).min(1).max(6),
  }),
});

// ============================================================================
// GALLERY SECTION SCHEMA
// ============================================================================

const galleryImageSchema = z.object({
  id: z.string().min(1),
  src: z.string().url(),
  alt: z.string().max(200),
  caption: z.string().max(200).optional(),
});

const gallerySectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("gallery"),
  className: z.string().max(500).optional(),
  props: z.object({
    badge: z.string().max(100).optional(),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional(),
    titleClassName: z.string().max(500).optional(),
    subtitleClassName: z.string().max(500).optional(),
    backgroundClassName: z.string().max(500).optional(),
    layout: z.enum(["grid-2", "grid-3", "grid-4", "masonry"]).optional(),
    images: z.array(galleryImageSchema).min(1).max(24),
  }),
});

// ============================================================================
// TEAM SECTION SCHEMA
// ============================================================================

const teamMemberSocialSchema = z.object({
  linkedin: z.string().url().optional(),
  twitter: z.string().url().optional(),
  email: z.string().email().optional(),
});

const teamMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  bio: z.string().max(300).optional(),
  image: z.string().url().optional(),
  social: teamMemberSocialSchema.optional(),
});

const teamSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("team"),
  className: z.string().max(500).optional(),
  props: z.object({
    badge: z.string().max(100).optional(),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional(),
    titleClassName: z.string().max(500).optional(),
    subtitleClassName: z.string().max(500).optional(),
    backgroundClassName: z.string().max(500).optional(),
    layout: z.enum(["grid-2", "grid-3", "grid-4"]).optional(),
    members: z.array(teamMemberSchema).min(1).max(20),
  }),
});

// ============================================================================
// FAQ SECTION SCHEMA
// ============================================================================

const faqItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(1000),
});

const faqSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("faq"),
  className: z.string().max(500).optional(),
  props: z.object({
    badge: z.string().max(100).optional(),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional(),
    titleClassName: z.string().max(500).optional(),
    subtitleClassName: z.string().max(500).optional(),
    backgroundClassName: z.string().max(500).optional(),
    layout: z.enum(["accordion", "grid"]).optional(),
    faqs: z.array(faqItemSchema).min(1).max(20),
  }),
});

// ============================================================================
// PROCESS SECTION SCHEMA
// ============================================================================

const processStepSchema = z.object({
  id: z.string().min(1),
  number: z.number().optional(),
  icon: z.string().max(50).optional(),
  title: z.string().min(1).max(100),
  description: z.string().max(500),
});

const processSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("process"),
  className: z.string().max(500).optional(),
  props: z.object({
    badge: z.string().max(100).optional(),
    title: z.string().min(1).max(200),
    subtitle: z.string().max(500).optional(),
    titleClassName: z.string().max(500).optional(),
    subtitleClassName: z.string().max(500).optional(),
    backgroundClassName: z.string().max(500).optional(),
    layout: z.enum(["horizontal", "vertical", "alternating"]).optional(),
    steps: z.array(processStepSchema).min(1).max(10),
  }),
});

// ============================================================================
// PAGE SECTION UNION
// ============================================================================

const pageSectionSchema = z.discriminatedUnion("type", [
  heroSectionSchema,
  featuresSectionSchema,
  ctaSectionSchema,
  testimonialsSectionSchema,
  pricingSectionSchema,
  gallerySectionSchema,
  teamSectionSchema,
  faqSectionSchema,
  processSectionSchema,
]);

// ============================================================================
// PAGE THEME SCHEMA
// ============================================================================

const pageThemeSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  textColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  fontFamily: z.string().max(100).optional(),
  borderRadius: z.enum(["none", "sm", "md", "lg", "xl", "full"]).optional(),
});

// ============================================================================
// PAGE METADATA SCHEMA
// ============================================================================

const pageMetadataSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  ogImage: z.string().url().optional(),
  favicon: z.string().url().optional(),
  language: z.enum(["en", "de"]).optional(),
});

// ============================================================================
// PAGE INTEGRATIONS SCHEMA
// ============================================================================

const pageIntegrationsSchema = z.object({
  bookingResources: z.array(z.string()).optional(),
  forms: z.array(z.string()).optional(),
  contactEmail: z.string().email().optional(),
});

// ============================================================================
// PAGE REVISION SCHEMA
// ============================================================================

const pageRevisionSchema = z.object({
  at: z.number(),
  by: z.enum(["ai", "user"]),
  summary: z.string().max(200),
});

// ============================================================================
// COMPLETE PAGE SCHEMA
// ============================================================================

export const aiGeneratedPageSchemaValidator = z.object({
  version: z.literal("1.0"),
  metadata: pageMetadataSchema,
  theme: pageThemeSchema.optional(),
  sections: z.array(pageSectionSchema).min(1).max(20),
  integrations: pageIntegrationsSchema.optional(),
  generatedAt: z.number(),
  generatedBy: z.enum(["ai", "user"]),
  conversationId: z.string().optional(),
  revisions: z.array(pageRevisionSchema),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  data?: AIGeneratedPageSchema;
  errors?: z.ZodError;
}

/**
 * Validates a complete page schema.
 */
export function validatePageSchema(data: unknown): ValidationResult {
  const result = aiGeneratedPageSchemaValidator.safeParse(data);

  if (result.success) {
    return {
      valid: true,
      data: result.data as AIGeneratedPageSchema,
    };
  }

  return {
    valid: false,
    errors: result.error,
  };
}

/**
 * Validates a single section.
 */
export function validateSection(
  data: unknown
): { valid: boolean; data?: PageSection; errors?: z.ZodError } {
  const result = pageSectionSchema.safeParse(data);

  if (result.success) {
    return {
      valid: true,
      data: result.data as PageSection,
    };
  }

  return {
    valid: false,
    errors: result.error,
  };
}

/**
 * Checks if an icon name is in the allowed list.
 */
export function isValidIcon(iconName: string): boolean {
  return (allowedIcons as readonly string[]).includes(iconName);
}

/**
 * Sanitizes Tailwind classes to prevent XSS.
 * Only allows alphanumeric, hyphens, colons, slashes, brackets, and spaces.
 */
export function sanitizeTailwindClasses(classes: string): string {
  // Remove anything that's not a valid Tailwind class character
  return classes.replace(/[^a-zA-Z0-9\-:\/\[\]\.\s%#]/g, "").trim();
}

/**
 * Attempts to repair truncated JSON by closing unclosed brackets/braces.
 * This helps when AI responses get cut off due to token limits.
 */
function attemptJsonRepair(jsonString: string): string {
  let repaired = jsonString.trim();

  // Remove trailing incomplete content (partial strings, etc.)
  // Look for the last complete structure
  const lastCompleteIndex = Math.max(
    repaired.lastIndexOf("},"),
    repaired.lastIndexOf("}]"),
    repaired.lastIndexOf('"}'),
    repaired.lastIndexOf("]}")
  );

  if (lastCompleteIndex > repaired.length * 0.5) {
    // Truncate to last complete structure
    repaired = repaired.substring(0, lastCompleteIndex + 1);
  }

  // Count unclosed brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of repaired) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") openBraces++;
    if (char === "}") openBraces--;
    if (char === "[") openBrackets++;
    if (char === "]") openBrackets--;
  }

  // If we're in a string, close it
  if (inString) {
    repaired += '"';
  }

  // Close any unclosed brackets
  while (openBrackets > 0) {
    repaired += "]";
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += "}";
    openBraces--;
  }

  return repaired;
}

/**
 * Parses AI response and extracts JSON.
 * Handles responses that may have markdown code blocks.
 */
export function parseAIResponse(response: string): {
  json: unknown | null;
  error?: string;
} {
  // Try multiple strategies to extract JSON

  // Strategy 1: Look for ```json ... ``` code block (greedy to get the full JSON)
  // Use a greedy match but look for the pattern where ``` follows a closing brace
  let jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);

  // Strategy 2: If no json-labeled block, try any code block
  if (!jsonMatch) {
    jsonMatch = response.match(/```\s*([\s\S]*?)\s*```/);
  }

  // Strategy 3: If the response starts with ``` but regex didn't match (truncated response),
  // try to extract everything between first ``` and either closing ``` or end of string
  if (!jsonMatch && response.includes("```")) {
    const startMatch = response.match(/```(?:json)?\s*/);
    if (startMatch) {
      const startIndex = startMatch.index! + startMatch[0].length;
      // Look for closing backticks
      const endMatch = response.slice(startIndex).match(/\s*```/);
      if (endMatch) {
        const jsonContent = response.slice(startIndex, startIndex + endMatch.index!);
        jsonMatch = [response, jsonContent];
      } else {
        // No closing backticks - try to parse everything after the opening
        const jsonContent = response.slice(startIndex).trim();
        jsonMatch = [response, jsonContent];
      }
    }
  }

  // Strategy 4: Look for JSON object directly (starts with { and ends with })
  if (!jsonMatch) {
    const directJsonMatch = response.match(/\{[\s\S]*"version"\s*:\s*"1\.0"[\s\S]*\}/);
    if (directJsonMatch) {
      jsonMatch = [response, directJsonMatch[0]];
    }
  }

  console.log("[parseAIResponse] Found code block:", !!jsonMatch);

  const jsonString = jsonMatch ? jsonMatch[1] : response;
  console.log("[parseAIResponse] JSON string to parse (first 100 chars):", jsonString.trim().substring(0, 100));

  try {
    const parsed = JSON.parse(jsonString.trim());
    console.log("[parseAIResponse] JSON parsed successfully, type:", typeof parsed, "isObject:", typeof parsed === "object");
    return { json: parsed };
  } catch (e) {
    const originalError = e instanceof Error ? e.message : "Unknown error";
    console.log("[parseAIResponse] JSON parse failed, attempting repair:", originalError);

    // Try to repair truncated JSON
    try {
      const repairedJson = attemptJsonRepair(jsonString);
      console.log("[parseAIResponse] Attempting to parse repaired JSON (length:", repairedJson.length, ")");
      const parsed = JSON.parse(repairedJson);
      console.log("[parseAIResponse] Repaired JSON parsed successfully!");
      return { json: parsed };
    } catch (repairError) {
      console.log("[parseAIResponse] Repair failed:", repairError instanceof Error ? repairError.message : "Unknown");
      return {
        json: null,
        error: `Failed to parse JSON: ${originalError}`,
      };
    }
  }
}

/**
 * Valid section types that our system supports
 */
const VALID_SECTION_TYPES = ["hero", "features", "cta", "testimonials", "pricing", "gallery", "team", "faq", "process"];

/**
 * Preprocesses AI-generated JSON to fix common mistakes before validation.
 * This is more forgiving than strict validation to improve user experience.
 */
function preprocessAIJson(json: Record<string, unknown>): Record<string, unknown> {
  const sections = json.sections as Array<Record<string, unknown>> | undefined;
  if (!sections || !Array.isArray(sections)) {
    return json;
  }

  const processedSections = sections
    .filter((section) => {
      // Filter out sections with invalid types
      const sectionType = section.type as string;
      if (!VALID_SECTION_TYPES.includes(sectionType)) {
        console.log(`[Validator] Removing unsupported section type: "${sectionType}"`);
        return false;
      }
      return true;
    })
    .map((section) => {
      const sectionType = section.type as string;
      const props = section.props as Record<string, unknown> | undefined;

      if (!props) return section;

      // Fix pricing section: transform string features to objects
      if (sectionType === "pricing" && props.tiers) {
        const tiers = props.tiers as Array<Record<string, unknown>>;
        props.tiers = tiers.map((tier) => {
          if (tier.features && Array.isArray(tier.features)) {
            tier.features = (tier.features as unknown[]).map((feature) => {
              // If feature is a string, convert to object format
              if (typeof feature === "string") {
                return { text: feature, included: true };
              }
              return feature;
            });
          }
          return tier;
        });
      }

      return section;
    });

  return {
    ...json,
    sections: processedSections,
  };
}

/**
 * Validates and parses AI response in one step.
 * Automatically adds required metadata fields that the AI doesn't generate.
 */
export function parseAndValidateAIResponse(response: string): ValidationResult & { parseError?: string } {
  console.log("[Validator] parseAndValidateAIResponse called with response length:", response.length);

  const { json, error: parseError } = parseAIResponse(response);

  console.log("[Validator] parseAIResponse result:", {
    hasJson: json !== null,
    parseError: parseError || "none",
    jsonKeys: json ? Object.keys(json as Record<string, unknown>) : []
  });

  if (parseError || json === null) {
    console.log("[Validator] Returning early - no valid JSON found");
    return {
      valid: false,
      parseError,
    };
  }

  // Preprocess to fix common AI mistakes
  const preprocessedJson = preprocessAIJson(json as Record<string, unknown>);

  // Add required metadata fields that the AI doesn't generate
  // These are system-level fields, not content the AI should produce
  const enrichedJson = {
    ...preprocessedJson,
    generatedAt: preprocessedJson.generatedAt ?? Date.now(),
    generatedBy: preprocessedJson.generatedBy ?? "ai",
    revisions: preprocessedJson.revisions ?? [],
  };

  console.log("[Validator] Enriched JSON with metadata, validating schema...");
  const result = validatePageSchema(enrichedJson);
  console.log("[Validator] Schema validation result:", {
    valid: result.valid,
    hasData: !!result.data,
    errorCount: result.errors?.issues?.length || 0
  });

  if (!result.valid && result.errors) {
    console.log("[Validator] Validation errors:", JSON.stringify(result.errors.issues.slice(0, 3), null, 2));
  }

  return result;
}
