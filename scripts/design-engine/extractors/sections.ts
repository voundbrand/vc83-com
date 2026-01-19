/**
 * SECTION EXTRACTOR
 *
 * Extracts section layout patterns from TSX component files.
 * Analyzes hero sections, feature grids, CTAs, etc.
 */

import * as fs from "fs";
import * as path from "path";

interface DesignPattern {
  patternId: string;
  type: "section";
  sourcePrototype: string;
  sourceFile: string;
  name: string;
  description: string;
  industries: string[];
  mood: string[];
  tags: string[];
  patternData: Record<string, unknown>;
  codeSnippets?: Array<{
    language: string;
    code: string;
    purpose: string;
  }>;
  version: string;
}

interface SectionAnalysis {
  name: string;
  type: string;
  features: string[];
  tailwindClasses: string[];
  hasImage: boolean;
  hasGradient: boolean;
  hasAnimation: boolean;
  height: string | null;
  layout: string | null;
}

/**
 * Extract section patterns from a components directory
 */
export async function extractSections(
  componentsPath: string,
  prototypeName: string
): Promise<DesignPattern[]> {
  const patterns: DesignPattern[] = [];

  // Get all TSX files in components
  const files = fs.readdirSync(componentsPath).filter((f) => f.endsWith(".tsx"));

  for (const file of files) {
    const filePath = path.join(componentsPath, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Analyze the component
    const analysis = analyzeComponent(content, file);
    if (analysis) {
      patterns.push(createSectionPattern(analysis, prototypeName, filePath));
    }
  }

  return patterns;
}

/**
 * Analyze a TSX component file
 */
function analyzeComponent(content: string, fileName: string): SectionAnalysis | null {
  const name = fileName.replace(".tsx", "");
  const sectionType = inferSectionType(name, content);

  if (!sectionType) {
    return null; // Not a section component
  }

  return {
    name,
    type: sectionType,
    features: extractFeatures(content),
    tailwindClasses: extractTailwindClasses(content),
    hasImage: hasImageElement(content),
    hasGradient: hasGradientClasses(content),
    hasAnimation: hasAnimationClasses(content),
    height: extractHeight(content),
    layout: extractLayout(content),
  };
}

/**
 * Infer section type from component name and content
 */
function inferSectionType(name: string, content: string): string | null {
  const nameLower = name.toLowerCase();
  const contentLower = content.toLowerCase();

  if (nameLower.includes("hero") || contentLower.includes("<section") && contentLower.includes("h-screen")) {
    return "hero";
  }
  if (nameLower.includes("feature") || nameLower.includes("spaces")) {
    return "features";
  }
  if (nameLower.includes("cta") || nameLower.includes("call-to-action")) {
    return "cta";
  }
  if (nameLower.includes("testimonial") || nameLower.includes("review")) {
    return "testimonials";
  }
  if (nameLower.includes("pricing") || nameLower.includes("price")) {
    return "pricing";
  }
  if (nameLower.includes("gallery") || nameLower.includes("images")) {
    return "gallery";
  }
  if (nameLower.includes("team") || nameLower.includes("about")) {
    return "about";
  }
  if (nameLower.includes("faq") || nameLower.includes("question")) {
    return "faq";
  }
  if (nameLower.includes("footer")) {
    return "footer";
  }
  if (nameLower.includes("header") || nameLower.includes("nav")) {
    return "navigation";
  }
  if (nameLower.includes("booking") || nameLower.includes("reservation")) {
    return "booking";
  }

  // Check for section tag
  if (contentLower.includes("<section")) {
    return "generic";
  }

  return null;
}

/**
 * Extract notable features from component content
 */
function extractFeatures(content: string): string[] {
  const features: string[] = [];

  // Background image with overlay
  if (content.includes("absolute inset-0") && (content.includes("<img") || content.includes("background"))) {
    features.push("background-image-overlay");
  }

  // Image slider
  if (content.includes("currentSlide") || content.includes("Carousel") || content.includes("slider")) {
    features.push("image-slider");
  }

  // Gradient overlay
  if (content.includes("bg-gradient-to") && content.includes("from-black")) {
    features.push("gradient-overlay");
  }

  // Scroll indicator
  if (content.includes("animate-bounce") && content.includes("ArrowDown")) {
    features.push("scroll-indicator");
  }

  // Dual CTA buttons
  if ((content.match(/<Button/g) || []).length >= 2) {
    features.push("dual-cta");
  }

  // Card grid
  if (content.includes("grid") && content.includes("Card")) {
    features.push("card-grid");
  }

  // Icon + text pattern
  if (content.includes("Icon") || content.match(/\{.*Icon.*\}/)) {
    features.push("icon-text");
  }

  // Full viewport
  if (content.includes("h-screen") || content.includes("h-[90vh]") || content.includes("h-[85vh]")) {
    features.push("full-viewport");
  }

  // Modal/dialog
  if (content.includes("Modal") || content.includes("Dialog")) {
    features.push("modal-trigger");
  }

  // Booking integration
  if (content.includes("BookingModal") || content.includes("booking")) {
    features.push("booking-integration");
  }

  return features;
}

/**
 * Extract Tailwind classes from content
 */
function extractTailwindClasses(content: string): string[] {
  const classes: string[] = [];

  // Extract className strings
  const classMatches = content.matchAll(/className="([^"]+)"/g);
  for (const match of classMatches) {
    const classList = match[1].split(/\s+/);
    for (const cls of classList) {
      if (cls && !classes.includes(cls) && !cls.includes("{")) {
        classes.push(cls);
      }
    }
  }

  // Also check template literal classNames
  const templateMatches = content.matchAll(/className=\{`([^`]+)`\}/g);
  for (const match of templateMatches) {
    const classList = match[1].split(/\s+/);
    for (const cls of classList) {
      if (cls && !classes.includes(cls) && !cls.startsWith("$")) {
        classes.push(cls);
      }
    }
  }

  return classes;
}

/**
 * Check for image elements
 */
function hasImageElement(content: string): boolean {
  return content.includes("<img") || content.includes("<Image") || content.includes("background-image");
}

/**
 * Check for gradient classes
 */
function hasGradientClasses(content: string): boolean {
  return content.includes("bg-gradient-") || content.includes("from-") && content.includes("to-");
}

/**
 * Check for animation classes
 */
function hasAnimationClasses(content: string): boolean {
  return content.includes("animate-") || content.includes("transition-") || content.includes("@keyframes");
}

/**
 * Extract height specification
 */
function extractHeight(content: string): string | null {
  const heightMatch = content.match(/h-\[([^\]]+)\]|h-(screen|full|auto)/);
  if (heightMatch) {
    return heightMatch[0];
  }
  return null;
}

/**
 * Extract layout pattern
 */
function extractLayout(content: string): string | null {
  if (content.includes("grid-cols-4") || content.includes("md:grid-cols-4")) {
    return "grid-4";
  }
  if (content.includes("grid-cols-3") || content.includes("md:grid-cols-3")) {
    return "grid-3";
  }
  if (content.includes("grid-cols-2") || content.includes("md:grid-cols-2")) {
    return "grid-2";
  }
  if (content.includes("flex-col") && content.includes("flex-row")) {
    return "responsive-flex";
  }
  if (content.includes("flex")) {
    return "flex";
  }
  if (content.includes("grid")) {
    return "grid";
  }
  return null;
}

/**
 * Create a section pattern from analysis
 */
function createSectionPattern(
  analysis: SectionAnalysis,
  prototypeName: string,
  filePath: string
): DesignPattern {
  const formattedName = formatName(analysis.name);
  const tags = [
    analysis.type,
    ...analysis.features,
    analysis.layout || "",
    analysis.hasImage ? "image" : "",
    analysis.hasGradient ? "gradient" : "",
    analysis.hasAnimation ? "animated" : "",
  ].filter(Boolean);

  return {
    patternId: `${prototypeName}-${analysis.name.toLowerCase()}`,
    type: "section",
    sourcePrototype: prototypeName,
    sourceFile: filePath,
    name: `${formatName(prototypeName)} ${formattedName}`,
    description: generateSectionDescription(analysis),
    industries: inferIndustriesFromPrototype(prototypeName),
    mood: inferMoodFromPrototype(prototypeName),
    tags,
    patternData: {
      sectionType: analysis.type,
      features: analysis.features,
      layout: analysis.layout,
      height: analysis.height,
      hasImage: analysis.hasImage,
      hasGradient: analysis.hasGradient,
      hasAnimation: analysis.hasAnimation,
      notableTailwindClasses: analysis.tailwindClasses.filter(isNotableClass),
    },
    codeSnippets: [],
    version: "1.0",
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatName(name: string): string {
  return name
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function generateSectionDescription(analysis: SectionAnalysis): string {
  const parts: string[] = [];

  parts.push(`${analysis.type.charAt(0).toUpperCase() + analysis.type.slice(1)} section`);

  if (analysis.height) {
    parts.push(`with ${analysis.height} height`);
  }

  if (analysis.features.length > 0) {
    parts.push(`featuring ${analysis.features.slice(0, 3).join(", ")}`);
  }

  if (analysis.layout) {
    parts.push(`using ${analysis.layout} layout`);
  }

  return parts.join(" ") + ".";
}

function isNotableClass(cls: string): boolean {
  // Filter to keep only interesting classes
  return (
    cls.startsWith("bg-") ||
    cls.startsWith("text-") ||
    cls.startsWith("h-") ||
    cls.startsWith("py-") ||
    cls.startsWith("px-") ||
    cls.startsWith("grid") ||
    cls.startsWith("flex") ||
    cls.includes("animate") ||
    cls.includes("transition") ||
    cls.includes("gradient")
  );
}

function inferIndustriesFromPrototype(prototypeName: string): string[] {
  const name = prototypeName.toLowerCase();
  if (name.includes("sailing")) return ["maritime", "tourism"];
  if (name.includes("cafe")) return ["food_beverage", "hospitality"];
  if (name.includes("rental") || name.includes("vacation")) return ["hospitality", "tourism"];
  return ["general"];
}

function inferMoodFromPrototype(prototypeName: string): string[] {
  const name = prototypeName.toLowerCase();
  if (name.includes("sailing")) return ["adventurous", "professional"];
  if (name.includes("cafe")) return ["warm", "inviting"];
  if (name.includes("rental") || name.includes("vacation")) return ["relaxing", "comfortable"];
  return ["professional"];
}
