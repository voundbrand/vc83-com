/**
 * ANIMATIONS EXTRACTOR
 *
 * Extracts animation patterns from CSS files.
 * Focuses on @keyframes, transitions, and animation utilities.
 */

import * as fs from "fs";

interface DesignPattern {
  patternId: string;
  type: "animation";
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

interface KeyframeAnimation {
  name: string;
  keyframes: string;
  properties: string[];
}

/**
 * Extract animation patterns from a CSS file
 */
export async function extractAnimations(
  cssPath: string,
  prototypeName: string
): Promise<DesignPattern[]> {
  const css = fs.readFileSync(cssPath, "utf-8");
  const patterns: DesignPattern[] = [];

  // Extract @keyframes animations
  const keyframes = extractKeyframes(css);
  for (const kf of keyframes) {
    patterns.push(createKeyframePattern(kf, prototypeName, cssPath));
  }

  // Extract animation utilities from @theme
  const themeAnimations = extractThemeAnimations(css);
  if (Object.keys(themeAnimations).length > 0) {
    patterns.push(createThemeAnimationsPattern(themeAnimations, prototypeName, cssPath));
  }

  return patterns;
}

/**
 * Extract @keyframes definitions
 */
function extractKeyframes(css: string): KeyframeAnimation[] {
  const animations: KeyframeAnimation[] = [];

  // Match @keyframes blocks
  const keyframeMatches = css.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)\s*\{([\s\S]*?)\n\}/g);

  for (const match of keyframeMatches) {
    const name = match[1];
    const keyframes = match[0];

    // Extract animated properties
    const properties = extractAnimatedProperties(match[2]);

    animations.push({
      name,
      keyframes,
      properties,
    });
  }

  return animations;
}

/**
 * Extract animated CSS properties from keyframe content
 */
function extractAnimatedProperties(keyframeContent: string): string[] {
  const properties: string[] = [];

  // Common CSS properties that are animated
  const propertyPatterns = [
    "transform",
    "opacity",
    "background",
    "color",
    "scale",
    "rotate",
    "translate",
    "width",
    "height",
    "left",
    "right",
    "top",
    "bottom",
    "border",
    "box-shadow",
    "filter",
    "clip-path",
  ];

  for (const prop of propertyPatterns) {
    if (keyframeContent.includes(prop)) {
      properties.push(prop);
    }
  }

  return properties;
}

/**
 * Extract @theme animation utilities
 */
function extractThemeAnimations(css: string): Record<string, string> {
  const animations: Record<string, string> = {};

  const themeMatch = css.match(/@theme\s*\{([^}]+)\}/);
  if (themeMatch) {
    // Match --animate-xxx definitions
    const animMatches = themeMatch[1].matchAll(/--animate-([a-zA-Z0-9-]+):\s*([^;]+);/g);
    for (const match of animMatches) {
      animations[match[1]] = match[2].trim();
    }
  }

  return animations;
}

/**
 * Create a pattern for a keyframe animation
 */
function createKeyframePattern(
  animation: KeyframeAnimation,
  prototypeName: string,
  cssPath: string
): DesignPattern {
  const formattedName = formatAnimationName(animation.name);
  const description = generateAnimationDescription(animation);

  return {
    patternId: `${prototypeName}-animation-${animation.name}`,
    type: "animation",
    sourcePrototype: prototypeName,
    sourceFile: cssPath,
    name: `${formattedName} Animation`,
    description,
    industries: inferIndustriesFromPrototype(prototypeName),
    mood: inferMoodFromAnimation(animation),
    tags: ["keyframes", ...animation.properties, inferAnimationType(animation)],
    patternData: {
      animationName: animation.name,
      animatedProperties: animation.properties,
      animationType: inferAnimationType(animation),
      trigger: inferAnimationTrigger(animation.name),
    },
    codeSnippets: [
      {
        language: "css",
        code: animation.keyframes,
        purpose: `${formattedName} keyframe animation`,
      },
      {
        language: "tailwind",
        code: `.animate-${animation.name} {\n  animation: ${animation.name} 0.5s ease-in-out;\n}`,
        purpose: "Tailwind utility class",
      },
    ],
    version: "1.0",
  };
}

/**
 * Create a pattern for @theme animation utilities
 */
function createThemeAnimationsPattern(
  animations: Record<string, string>,
  prototypeName: string,
  cssPath: string
): DesignPattern {
  const codeSnippet = Object.entries(animations)
    .map(([key, value]) => `  --animate-${key}: ${value};`)
    .join("\n");

  return {
    patternId: `${prototypeName}-theme-animations`,
    type: "animation",
    sourcePrototype: prototypeName,
    sourceFile: cssPath,
    name: `${formatName(prototypeName)} Animation Utilities`,
    description: `Tailwind v4 @theme animation utilities with ${Object.keys(animations).length} animation definitions for consistent motion design.`,
    industries: inferIndustriesFromPrototype(prototypeName),
    mood: inferMoodFromPrototype(prototypeName),
    tags: ["tailwind", "theme", "utilities"],
    patternData: {
      animations,
      animationCount: Object.keys(animations).length,
    },
    codeSnippets: [
      {
        language: "css",
        code: `@theme {\n${codeSnippet}\n}`,
        purpose: "Tailwind v4 theme animations",
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

function formatAnimationName(name: string): string {
  return name
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function generateAnimationDescription(animation: KeyframeAnimation): string {
  const type = inferAnimationType(animation);
  const props = animation.properties.slice(0, 3).join(", ");

  switch (type) {
    case "entrance":
      return `Entrance animation that animates ${props}. Use for elements appearing on scroll or page load.`;
    case "exit":
      return `Exit animation that animates ${props}. Use for elements leaving the viewport or being dismissed.`;
    case "attention":
      return `Attention-grabbing animation that animates ${props}. Use for CTAs, notifications, or important elements.`;
    case "loading":
      return `Loading/progress animation that animates ${props}. Use for loading states or progress indicators.`;
    case "hover":
      return `Hover effect animation that animates ${props}. Use for interactive elements and buttons.`;
    default:
      return `Animation that animates ${props}.`;
  }
}

function inferAnimationType(animation: KeyframeAnimation): string {
  const name = animation.name.toLowerCase();
  const props = animation.properties;

  // Check name patterns
  if (name.includes("fade") && name.includes("in")) return "entrance";
  if (name.includes("fade") && name.includes("out")) return "exit";
  if (name.includes("slide") && name.includes("in")) return "entrance";
  if (name.includes("slide") && name.includes("out")) return "exit";
  if (name.includes("bounce") || name.includes("pulse") || name.includes("wiggle")) return "attention";
  if (name.includes("spin") || name.includes("loading")) return "loading";
  if (name.includes("shimmer") || name.includes("glow")) return "hover";

  // Check property patterns
  if (props.includes("opacity") && props.includes("transform")) return "entrance";
  if (props.includes("scale")) return "attention";
  if (props.includes("rotate")) return "loading";

  return "general";
}

function inferAnimationTrigger(name: string): string {
  const nameLower = name.toLowerCase();

  if (nameLower.includes("hover")) return "hover";
  if (nameLower.includes("focus")) return "focus";
  if (nameLower.includes("scroll")) return "scroll";
  if (nameLower.includes("load") || nameLower.includes("appear")) return "load";
  if (nameLower.includes("click") || nameLower.includes("tap")) return "click";

  return "auto";
}

function inferMoodFromAnimation(animation: KeyframeAnimation): string[] {
  const name = animation.name.toLowerCase();
  const moods: string[] = [];

  if (name.includes("bounce") || name.includes("wiggle")) {
    moods.push("playful", "energetic");
  }
  if (name.includes("fade") || name.includes("slide")) {
    moods.push("elegant", "smooth");
  }
  if (name.includes("shimmer") || name.includes("glow")) {
    moods.push("premium", "attention-grabbing");
  }
  if (name.includes("pulse")) {
    moods.push("urgent", "active");
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
