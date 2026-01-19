/**
 * COLOR EXTRACTOR
 *
 * Extracts color patterns from CSS files (globals.css).
 * Focuses on OKLCH colors, CSS custom properties, and Tailwind theme colors.
 */

import * as fs from "fs";

interface DesignPattern {
  patternId: string;
  type: "color_system";
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
 * Extract color patterns from a globals.css file
 */
export async function extractColors(
  cssPath: string,
  prototypeName: string
): Promise<DesignPattern[]> {
  const css = fs.readFileSync(cssPath, "utf-8");
  const patterns: DesignPattern[] = [];

  // Extract CSS custom properties (--color-xxx)
  const customProps = extractCustomProperties(css);
  if (Object.keys(customProps).length > 0) {
    patterns.push(createColorSystemPattern(customProps, prototypeName, cssPath));
  }

  // Extract OKLCH colors
  const oklchColors = extractOklchColors(css);
  if (oklchColors.length > 0) {
    patterns.push(createOklchPattern(oklchColors, prototypeName, cssPath));
  }

  // Extract @theme colors (Tailwind v4)
  const themeColors = extractThemeColors(css);
  if (Object.keys(themeColors).length > 0) {
    patterns.push(createThemeColorsPattern(themeColors, prototypeName, cssPath));
  }

  return patterns;
}

/**
 * Extract CSS custom properties like --primary, --background, etc.
 */
function extractCustomProperties(css: string): Record<string, string> {
  const props: Record<string, string> = {};

  // Match :root { --name: value; } patterns
  const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
  if (rootMatch) {
    const propsBlock = rootMatch[1];
    const propMatches = propsBlock.matchAll(/--([a-zA-Z0-9-]+):\s*([^;]+);/g);
    for (const match of propMatches) {
      props[match[1]] = match[2].trim();
    }
  }

  // Also check for .dark theme
  const darkMatch = css.match(/\.dark\s*\{([^}]+)\}/);
  if (darkMatch) {
    const propsBlock = darkMatch[1];
    const propMatches = propsBlock.matchAll(/--([a-zA-Z0-9-]+):\s*([^;]+);/g);
    for (const match of propMatches) {
      props[`dark-${match[1]}`] = match[2].trim();
    }
  }

  return props;
}

/**
 * Extract OKLCH color values
 */
function extractOklchColors(css: string): Array<{ name: string; value: string }> {
  const colors: Array<{ name: string; value: string }> = [];

  // Match oklch(...) patterns
  const oklchMatches = css.matchAll(/--([a-zA-Z0-9-]+):\s*(oklch\([^)]+\))/g);
  for (const match of oklchMatches) {
    colors.push({
      name: match[1],
      value: match[2],
    });
  }

  return colors;
}

/**
 * Extract @theme block colors (Tailwind v4)
 */
function extractThemeColors(css: string): Record<string, string> {
  const colors: Record<string, string> = {};

  // Match @theme { --color-xxx: value; } patterns
  const themeMatch = css.match(/@theme\s*\{([^}]+)\}/);
  if (themeMatch) {
    const themeBlock = themeMatch[1];
    const colorMatches = themeBlock.matchAll(/--color-([a-zA-Z0-9-]+):\s*([^;]+);/g);
    for (const match of colorMatches) {
      colors[match[1]] = match[2].trim();
    }
  }

  return colors;
}

/**
 * Create a color system pattern from CSS custom properties
 */
function createColorSystemPattern(
  props: Record<string, string>,
  prototypeName: string,
  cssPath: string
): DesignPattern {
  // Identify key colors
  const primaryColor = props["primary"] || props["color-primary"];
  const secondaryColor = props["secondary"] || props["color-secondary"];
  const accentColor = props["accent"] || props["color-accent"];
  const backgroundColor = props["background"] || props["color-background"];
  const foregroundColor = props["foreground"] || props["color-foreground"];

  // Generate CSS code snippet
  const codeSnippet = Object.entries(props)
    .filter(([key]) => !key.startsWith("dark-"))
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");

  return {
    patternId: `${prototypeName}-color-system`,
    type: "color_system",
    sourcePrototype: prototypeName,
    sourceFile: cssPath,
    name: `${formatName(prototypeName)} Color System`,
    description: `Complete color system with ${Object.keys(props).length} CSS custom properties. Features ${primaryColor ? "primary" : ""} ${secondaryColor ? "secondary" : ""} ${accentColor ? "accent" : ""} colors.`.trim(),
    industries: inferIndustriesFromColors(props),
    mood: inferMoodFromColors(props),
    tags: ["color-system", "css-variables", "theming"],
    patternData: {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      background: backgroundColor,
      foreground: foregroundColor,
      allProperties: props,
      hasDarkMode: Object.keys(props).some((k) => k.startsWith("dark-")),
    },
    codeSnippets: [
      {
        language: "css",
        code: `:root {\n${codeSnippet}\n}`,
        purpose: "Color system CSS variables",
      },
    ],
    version: "1.0",
  };
}

/**
 * Create a pattern specifically for OKLCH colors
 */
function createOklchPattern(
  colors: Array<{ name: string; value: string }>,
  prototypeName: string,
  cssPath: string
): DesignPattern {
  const codeSnippet = colors.map((c) => `  --${c.name}: ${c.value};`).join("\n");

  return {
    patternId: `${prototypeName}-oklch-colors`,
    type: "color_system",
    sourcePrototype: prototypeName,
    sourceFile: cssPath,
    name: `${formatName(prototypeName)} OKLCH Colors`,
    description: `Modern OKLCH color palette with ${colors.length} perceptually uniform colors. OKLCH provides better color interpolation and wider gamut support.`,
    industries: inferIndustriesFromPrototype(prototypeName),
    mood: inferMoodFromPrototype(prototypeName),
    tags: ["oklch", "modern-colors", "wide-gamut", "perceptual"],
    patternData: {
      colors: colors.reduce(
        (acc, c) => {
          acc[c.name] = c.value;
          return acc;
        },
        {} as Record<string, string>
      ),
      colorCount: colors.length,
      format: "oklch",
    },
    codeSnippets: [
      {
        language: "css",
        code: `:root {\n${codeSnippet}\n}`,
        purpose: "OKLCH color definitions",
      },
    ],
    version: "1.0",
  };
}

/**
 * Create a pattern for Tailwind v4 @theme colors
 */
function createThemeColorsPattern(
  colors: Record<string, string>,
  prototypeName: string,
  cssPath: string
): DesignPattern {
  const codeSnippet = Object.entries(colors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join("\n");

  return {
    patternId: `${prototypeName}-theme-colors`,
    type: "color_system",
    sourcePrototype: prototypeName,
    sourceFile: cssPath,
    name: `${formatName(prototypeName)} Theme Colors`,
    description: `Tailwind v4 @theme colors with ${Object.keys(colors).length} semantic color definitions for consistent theming.`,
    industries: inferIndustriesFromPrototype(prototypeName),
    mood: inferMoodFromPrototype(prototypeName),
    tags: ["tailwind", "theme", "semantic-colors"],
    patternData: {
      colors,
      colorCount: Object.keys(colors).length,
      format: "tailwind-theme",
    },
    codeSnippets: [
      {
        language: "css",
        code: `@theme {\n${codeSnippet}\n}`,
        purpose: "Tailwind v4 theme colors",
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

function inferIndustriesFromColors(props: Record<string, string>): string[] {
  const industries: string[] = [];
  const colorValues = Object.values(props).join(" ").toLowerCase();

  // Blue hues suggest maritime, tech, professional
  if (
    colorValues.includes("240") ||
    colorValues.includes("210") ||
    colorValues.includes("navy") ||
    colorValues.includes("blue")
  ) {
    industries.push("maritime", "technology");
  }

  // Green suggests nature, eco
  if (
    colorValues.includes("120") ||
    colorValues.includes("140") ||
    colorValues.includes("green")
  ) {
    industries.push("nature", "wellness");
  }

  // Warm colors suggest hospitality, food
  if (
    colorValues.includes("30") ||
    colorValues.includes("40") ||
    colorValues.includes("orange") ||
    colorValues.includes("amber")
  ) {
    industries.push("hospitality", "food_beverage");
  }

  return industries.length > 0 ? industries : ["general"];
}

function inferMoodFromColors(props: Record<string, string>): string[] {
  const moods: string[] = [];
  const colorValues = Object.values(props).join(" ").toLowerCase();

  // Deep, saturated colors suggest professional
  if (colorValues.includes("0.3") || colorValues.includes("0.2")) {
    moods.push("professional", "sophisticated");
  }

  // Light, soft colors suggest friendly
  if (colorValues.includes("0.9") || colorValues.includes("0.8")) {
    moods.push("friendly", "approachable");
  }

  // High chroma suggests vibrant
  if (colorValues.includes("0.2") || colorValues.includes("0.15")) {
    moods.push("vibrant", "energetic");
  }

  return moods.length > 0 ? moods : ["balanced"];
}

function inferIndustriesFromPrototype(prototypeName: string): string[] {
  const name = prototypeName.toLowerCase();
  if (name.includes("sailing") || name.includes("maritime")) {
    return ["maritime", "tourism"];
  }
  if (name.includes("cafe") || name.includes("restaurant")) {
    return ["food_beverage", "hospitality"];
  }
  if (name.includes("rental") || name.includes("vacation")) {
    return ["hospitality", "tourism"];
  }
  return ["general"];
}

function inferMoodFromPrototype(prototypeName: string): string[] {
  const name = prototypeName.toLowerCase();
  if (name.includes("sailing") || name.includes("adventure")) {
    return ["adventurous", "professional"];
  }
  if (name.includes("cafe") || name.includes("cozy")) {
    return ["warm", "inviting"];
  }
  if (name.includes("vacation") || name.includes("rental")) {
    return ["relaxing", "comfortable"];
  }
  return ["professional"];
}
