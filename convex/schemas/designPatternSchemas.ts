import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Design Pattern Schemas - Platform-wide Design Library
 *
 * These tables store design patterns extracted from v0 prototypes
 * and make them available via RAG to the page builder AI.
 * This is a PLATFORM-WIDE library (not per-organization).
 */

// ============================================================================
// DESIGN PATTERNS TABLE
// ============================================================================

/**
 * Design Patterns
 *
 * Stores extracted design patterns from prototype files.
 * Used for RAG-based design suggestions in page builder.
 */
export const designPatterns = defineTable({
  // Identity
  patternId: v.string(), // Unique ID, e.g., "sailing-hero-gradient"

  // Pattern type
  type: v.union(
    v.literal("color_system"), // OKLCH color palettes
    v.literal("typography"), // Font pairings
    v.literal("section"), // Section layout patterns
    v.literal("animation"), // CSS @keyframes
    v.literal("gradient"), // Gradient patterns
    v.literal("component"), // Reusable component patterns
    v.literal("full_prototype") // Complete page analysis
  ),

  // Source tracking
  sourcePrototype: v.string(), // e.g., "sailing-school-landing-page"
  sourceFile: v.optional(v.string()), // e.g., "components/hero.tsx"

  // Content
  name: v.string(), // Human-readable name
  description: v.string(), // What this pattern does/when to use it

  // Classification
  industries: v.array(v.string()), // ["maritime", "hospitality", "tourism"]
  mood: v.array(v.string()), // ["professional", "adventurous", "warm"]
  tags: v.array(v.string()), // ["hero", "gradient-overlay", "full-viewport"]

  // Pattern data (structure varies by type)
  patternData: v.any(),
  /*
   * Examples by type:
   *
   * color_system: {
   *   primary: "oklch(0.32 0.08 240)",
   *   secondary: "oklch(0.88 0.04 60)",
   *   accent: "oklch(0.55 0.25 210)",
   *   tailwindClasses: { primary: "bg-primary", ... }
   * }
   *
   * section: {
   *   sectionType: "hero",
   *   layout: "full-viewport-image",
   *   features: ["gradient-overlay", "scroll-indicator", "dual-cta"],
   *   tailwindClasses: ["h-screen", "relative", "overflow-hidden"],
   *   propsExample: { backgroundImage: {...}, scrollIndicator: {...} }
   * }
   *
   * animation: {
   *   name: "shimmer",
   *   keyframes: "@keyframes shimmer { ... }",
   *   trigger: "hover",
   *   duration: "2s",
   *   usage: "Button hover effects"
   * }
   */

  // Code snippets for reference
  codeSnippets: v.optional(
    v.array(
      v.object({
        language: v.string(), // "tsx", "css", "tailwind"
        code: v.string(),
        purpose: v.string(), // "Hero with gradient overlay"
      })
    )
  ),

  // Vector embedding for semantic search (OpenAI text-embedding-3-small)
  embedding: v.optional(v.array(v.float64())),

  // Metadata
  extractedAt: v.number(),
  version: v.string(), // Schema version, e.g., "1.0"
})
  .index("by_type", ["type"])
  .index("by_prototype", ["sourcePrototype"])
  .index("by_type_and_prototype", ["type", "sourcePrototype"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 1536, // OpenAI text-embedding-3-small
    filterFields: ["type"],
  });

// ============================================================================
// PROTOTYPE METADATA TABLE
// ============================================================================

/**
 * Prototype Metadata
 *
 * Tracks indexed prototypes and their extraction status.
 */
export const prototypeMetadata = defineTable({
  // Identity
  prototypeName: v.string(), // e.g., "sailing-school-landing-page"
  folderPath: v.string(), // Original folder path

  // Analysis results
  description: v.string(), // AI-generated description
  primaryIndustry: v.string(), // Main industry classification
  colorMood: v.array(v.string()), // ["professional", "adventurous"]

  // Extraction stats
  patternsExtracted: v.object({
    colorSystems: v.number(),
    typography: v.number(),
    sections: v.number(),
    animations: v.number(),
    gradients: v.number(),
  }),

  // Status
  status: v.union(
    v.literal("pending"),
    v.literal("indexing"),
    v.literal("indexed"),
    v.literal("failed")
  ),
  errorMessage: v.optional(v.string()),

  // Metadata
  indexedAt: v.optional(v.number()),
  lastUpdatedAt: v.number(),
  version: v.string(),
}).index("by_name", ["prototypeName"]);
