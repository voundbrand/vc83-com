/**
 * TYPOGRAPHY EXTRACTOR
 *
 * Extracts typography patterns from CSS files.
 * Focuses on font families, font pairings, and text styles.
 */

import * as fs from "fs";

interface DesignPattern {
  patternId: string;
  type: "typography";
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

/**
 * Extract typography patterns from a CSS file
 */
export async function extractTypography(
  cssPath: string,
  prototypeName: string
): Promise<DesignPattern[]> {
  const css = fs.readFileSync(cssPath, "utf-8");
  const patterns: DesignPattern[] = [];

  // Extract font families
  const fontFamilies = extractFontFamilies(css);
  if (fontFamilies.length > 0) {
    patterns.push(createFontPairingPattern(fontFamilies, prototypeName, cssPath));
  }

  // Extract @theme font definitions (Tailwind v4)
  const themeFonts = extractThemeFonts(css);
  if (Object.keys(themeFonts).length > 0) {
    patterns.push(createThemeFontsPattern(themeFonts, prototypeName, cssPath));
  }

  return patterns;
}

/**
 * Extract font-family declarations
 */
function extractFontFamilies(css: string): string[] {
  const families: string[] = [];

  // Match font-family declarations
  const fontMatches = css.matchAll(/font-family:\s*([^;]+);/g);
  for (const match of fontMatches) {
    const family = match[1].trim();
    if (!families.includes(family)) {
      families.push(family);
    }
  }

  // Match --font-xxx custom properties
  const fontVarMatches = css.matchAll(/--font-([a-zA-Z0-9-]+):\s*([^;]+);/g);
  for (const match of fontVarMatches) {
    const family = match[2].trim();
    if (!families.includes(family)) {
      families.push(family);
    }
  }

  // Match @theme font definitions
  const themeMatch = css.match(/@theme\s*\{([^}]+)\}/);
  if (themeMatch) {
    const fontMatches = themeMatch[1].matchAll(/--font-([a-zA-Z0-9-]+):\s*([^;]+);/g);
    for (const match of fontMatches) {
      const family = match[2].trim();
      if (!families.includes(family)) {
        families.push(family);
      }
    }
  }

  return families;
}

/**
 * Extract @theme font definitions
 */
function extractThemeFonts(css: string): Record<string, string> {
  const fonts: Record<string, string> = {};

  const themeMatch = css.match(/@theme\s*\{([^}]+)\}/);
  if (themeMatch) {
    const fontMatches = themeMatch[1].matchAll(/--font-([a-zA-Z0-9-]+):\s*([^;]+);/g);
    for (const match of fontMatches) {
      fonts[match[1]] = match[2].trim();
    }
  }

  return fonts;
}

/**
 * Create a font pairing pattern
 */
function createFontPairingPattern(
  families: string[],
  prototypeName: string,
  cssPath: string
): DesignPattern {
  // Categorize fonts
  const serifFonts = families.filter(
    (f) =>
      f.toLowerCase().includes("serif") ||
      f.includes("Playfair") ||
      f.includes("Georgia") ||
      f.includes("Times")
  );
  const sansFonts = families.filter(
    (f) =>
      f.toLowerCase().includes("sans") ||
      f.includes("Inter") ||
      f.includes("Helvetica") ||
      f.includes("Arial")
  );
  const displayFonts = families.filter(
    (f) =>
      f.toLowerCase().includes("display") ||
      f.includes("Playfair Display")
  );

  // Determine pairing type
  let pairingType = "single";
  if (serifFonts.length > 0 && sansFonts.length > 0) {
    pairingType = "serif-sans";
  } else if (displayFonts.length > 0) {
    pairingType = "display-body";
  }

  const description = generatePairingDescription(families, pairingType);

  return {
    patternId: `${prototypeName}-typography`,
    type: "typography",
    sourcePrototype: prototypeName,
    sourceFile: cssPath,
    name: `${formatName(prototypeName)} Typography`,
    description,
    industries: inferIndustriesFromFonts(families),
    mood: inferMoodFromFonts(families),
    tags: ["typography", "fonts", pairingType],
    patternData: {
      allFonts: families,
      serifFonts,
      sansFonts,
      displayFonts,
      pairingType,
      primaryFont: sansFonts[0] || families[0],
      headingFont: displayFonts[0] || serifFonts[0] || families[0],
    },
    codeSnippets: [
      {
        language: "css",
        code: families.map((f, i) => `--font-${i === 0 ? "sans" : i === 1 ? "serif" : `custom-${i}`}: ${f};`).join("\n"),
        purpose: "Font family definitions",
      },
    ],
    version: "1.0",
  };
}

/**
 * Create a pattern for Tailwind v4 @theme fonts
 */
function createThemeFontsPattern(
  fonts: Record<string, string>,
  prototypeName: string,
  cssPath: string
): DesignPattern {
  const codeSnippet = Object.entries(fonts)
    .map(([key, value]) => `  --font-${key}: ${value};`)
    .join("\n");

  return {
    patternId: `${prototypeName}-theme-fonts`,
    type: "typography",
    sourcePrototype: prototypeName,
    sourceFile: cssPath,
    name: `${formatName(prototypeName)} Theme Fonts`,
    description: `Tailwind v4 @theme font stack with ${Object.keys(fonts).length} font families configured for consistent typography.`,
    industries: inferIndustriesFromPrototype(prototypeName),
    mood: inferMoodFromPrototype(prototypeName),
    tags: ["tailwind", "theme", "font-stack"],
    patternData: {
      fonts,
      fontCount: Object.keys(fonts).length,
    },
    codeSnippets: [
      {
        language: "css",
        code: `@theme {\n${codeSnippet}\n}`,
        purpose: "Tailwind v4 theme fonts",
      },
    ],
    version: "1.0",
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatName(prototypeName: string): string {
  return prototypeName
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function generatePairingDescription(families: string[], pairingType: string): string {
  if (pairingType === "serif-sans") {
    return `Classic serif-sans pairing for elegant headlines with readable body text. Features ${families.length} font families for visual hierarchy.`;
  }
  if (pairingType === "display-body") {
    return `Display font pairing with decorative headlines and clean body text. Creates strong visual impact for landing pages.`;
  }
  return `Typography system with ${families.length} font ${families.length === 1 ? "family" : "families"}.`;
}

function inferIndustriesFromFonts(families: string[]): string[] {
  const fontsStr = families.join(" ").toLowerCase();
  const industries: string[] = [];

  if (fontsStr.includes("playfair") || fontsStr.includes("georgia")) {
    industries.push("hospitality", "luxury");
  }
  if (fontsStr.includes("inter") || fontsStr.includes("system-ui")) {
    industries.push("technology", "saas");
  }
  if (fontsStr.includes("serif")) {
    industries.push("editorial", "traditional");
  }

  return industries.length > 0 ? industries : ["general"];
}

function inferMoodFromFonts(families: string[]): string[] {
  const fontsStr = families.join(" ").toLowerCase();
  const moods: string[] = [];

  if (fontsStr.includes("playfair") || fontsStr.includes("display")) {
    moods.push("elegant", "sophisticated");
  }
  if (fontsStr.includes("inter") || fontsStr.includes("sans")) {
    moods.push("modern", "clean");
  }
  if (fontsStr.includes("serif") && !fontsStr.includes("sans")) {
    moods.push("traditional", "trustworthy");
  }

  return moods.length > 0 ? moods : ["professional"];
}

function inferIndustriesFromPrototype(prototypeName: string): string[] {
  const name = prototypeName.toLowerCase();
  if (name.includes("sailing")) return ["maritime", "tourism"];
  if (name.includes("cafe")) return ["food_beverage", "hospitality"];
  if (name.includes("rental")) return ["hospitality", "tourism"];
  return ["general"];
}

function inferMoodFromPrototype(prototypeName: string): string[] {
  const name = prototypeName.toLowerCase();
  if (name.includes("sailing")) return ["adventurous", "professional"];
  if (name.includes("cafe")) return ["warm", "inviting"];
  if (name.includes("rental")) return ["relaxing", "comfortable"];
  return ["professional"];
}
