#!/usr/bin/env npx tsx
/**
 * DESIGN ENGINE CLI
 *
 * CLI tool for extracting design patterns from v0 prototypes.
 *
 * Workflow:
 *   1. Extract patterns and generate embeddings: npx tsx scripts/design-engine/cli.ts export
 *   2. Commit the generated JSON to repo
 *   3. After deploy, seed production: npx tsx scripts/design-engine/cli.ts seed
 *
 * Commands:
 *   export [path]    Extract patterns, generate embeddings, save to JSON
 *   seed             Import patterns from JSON into Convex database
 *   list             List patterns in database
 *   search <query>   Search patterns (requires embeddings)
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";
import { extractColors } from "./extractors/colors";
import { extractTypography } from "./extractors/typography";
import { extractSections } from "./extractors/sections";
import { extractAnimations } from "./extractors/animations";

// ============================================================================
// CONFIGURATION
// ============================================================================

const PATTERNS_JSON_PATH = "./convex/seed/designPatterns.json";

// ============================================================================
// TYPES
// ============================================================================

interface DesignPatternExport {
  patternId: string;
  type: string;
  sourcePrototype: string;
  sourceFile?: string;
  name: string;
  description: string;
  industries: string[];
  mood: string[];
  tags: string[];
  patternData: unknown;
  codeSnippets?: Array<{
    language: string;
    code: string;
    purpose: string;
  }>;
  embedding?: number[];
  version: string;
}

interface PrototypeMetadataExport {
  prototypeName: string;
  folderPath: string;
  description: string;
  primaryIndustry: string;
  colorMood: string[];
  patternsExtracted: {
    colorSystems: number;
    typography: number;
    sections: number;
    animations: number;
    gradients: number;
  };
  version: string;
}

interface ExportedData {
  exportedAt: string;
  version: string;
  prototypes: PrototypeMetadataExport[];
  patterns: DesignPatternExport[];
}

// ============================================================================
// OPENAI EMBEDDING HELPER
// ============================================================================

async function generateEmbedding(text: string): Promise<number[]> {
  // Support both OpenRouter and OpenAI
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  const apiKey = openRouterKey || openAIKey;
  const useOpenRouter = !!openRouterKey;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY or OPENAI_API_KEY environment variable is required for embedding generation");
  }

  const baseUrl = useOpenRouter
    ? "https://openrouter.ai/api/v1/embeddings"
    : "https://api.openai.com/v1/embeddings";

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(useOpenRouter && { "HTTP-Referer": "https://vc83.com" }),
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${useOpenRouter ? "OpenRouter" : "OpenAI"} API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ============================================================================
// EXPORT COMMAND (Extract + Embed + Save JSON)
// ============================================================================

async function exportCommand(prototypesPath: string) {
  console.log("\n🎨 Design Engine - Export Patterns\n");
  console.log(`📂 Scanning: ${prototypesPath}`);
  console.log(`📄 Output: ${PATTERNS_JSON_PATH}\n`);

  // Validate path exists
  if (!fs.existsSync(prototypesPath)) {
    console.error(`❌ Path does not exist: ${prototypesPath}`);
    process.exit(1);
  }

  // Check for API key (OpenRouter or OpenAI)
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error("❌ OPENROUTER_API_KEY or OPENAI_API_KEY environment variable is required");
    console.error("   Set it in your .env.local file or export it in your shell");
    process.exit(1);
  }

  // Get all prototype directories
  const entries = fs.readdirSync(prototypesPath, { withFileTypes: true });
  const prototypeDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  if (prototypeDirs.length === 0) {
    console.error("❌ No prototype directories found");
    process.exit(1);
  }

  console.log(`Found ${prototypeDirs.length} prototype(s):\n`);
  prototypeDirs.forEach((dir) => console.log(`  - ${dir}`));
  console.log("");

  const exportData: ExportedData = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    prototypes: [],
    patterns: [],
  };

  // Process each prototype
  for (const prototypeName of prototypeDirs) {
    const protoPath = path.join(prototypesPath, prototypeName);
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📦 Processing: ${prototypeName}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      const stats = {
        colorSystems: 0,
        typography: 0,
        sections: 0,
        animations: 0,
        gradients: 0,
      };

      // 1. Extract colors from globals.css
      const globalsPath = path.join(protoPath, "app", "globals.css");
      if (fs.existsSync(globalsPath)) {
        console.log("🎨 Extracting colors...");
        const colors = await extractColors(globalsPath, prototypeName);
        for (const pattern of colors) {
          exportData.patterns.push(pattern as DesignPatternExport);
          stats.colorSystems++;
        }
        console.log(`   ✅ ${colors.length} color pattern(s)`);
      }

      // 2. Extract typography
      if (fs.existsSync(globalsPath)) {
        console.log("📝 Extracting typography...");
        const typography = await extractTypography(globalsPath, prototypeName);
        for (const pattern of typography) {
          exportData.patterns.push(pattern as DesignPatternExport);
          stats.typography++;
        }
        console.log(`   ✅ ${typography.length} typography pattern(s)`);
      }

      // 3. Extract sections from components
      const componentsPath = path.join(protoPath, "components");
      if (fs.existsSync(componentsPath)) {
        console.log("📐 Extracting sections...");
        const sections = await extractSections(componentsPath, prototypeName);
        for (const pattern of sections) {
          exportData.patterns.push(pattern as DesignPatternExport);
          stats.sections++;
        }
        console.log(`   ✅ ${sections.length} section pattern(s)`);
      }

      // 4. Extract animations
      if (fs.existsSync(globalsPath)) {
        console.log("✨ Extracting animations...");
        const animations = await extractAnimations(globalsPath, prototypeName);
        for (const pattern of animations) {
          exportData.patterns.push(pattern as DesignPatternExport);
          stats.animations++;
        }
        console.log(`   ✅ ${animations.length} animation pattern(s)`);
      }

      // Add prototype metadata
      exportData.prototypes.push({
        prototypeName,
        folderPath: protoPath,
        description: `Design patterns extracted from ${prototypeName}`,
        primaryIndustry: inferIndustry(prototypeName),
        colorMood: inferMood(prototypeName),
        patternsExtracted: stats,
        version: "1.0",
      });

      console.log(`\n✅ Extracted from ${prototypeName}:`);
      console.log(`   Colors: ${stats.colorSystems}`);
      console.log(`   Typography: ${stats.typography}`);
      console.log(`   Sections: ${stats.sections}`);
      console.log(`   Animations: ${stats.animations}`);
    } catch (error) {
      console.error(`\n❌ Error processing ${prototypeName}:`, error);
    }
  }

  // Generate embeddings for all patterns
  console.log(`\n${"=".repeat(60)}`);
  console.log("🧠 Generating embeddings...");
  console.log(`${"=".repeat(60)}\n`);

  for (let i = 0; i < exportData.patterns.length; i++) {
    const pattern = exportData.patterns[i];
    try {
      // Build searchable text
      const text = [
        pattern.name,
        pattern.description,
        pattern.type,
        ...pattern.industries,
        ...pattern.mood,
        ...pattern.tags,
      ].join(" ");

      pattern.embedding = await generateEmbedding(text);
      console.log(`✅ [${i + 1}/${exportData.patterns.length}] ${pattern.name}`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ [${i + 1}/${exportData.patterns.length}] ${pattern.name}: ${error}`);
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(PATTERNS_JSON_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON file
  fs.writeFileSync(PATTERNS_JSON_PATH, JSON.stringify(exportData, null, 2));

  console.log(`\n${"=".repeat(60)}`);
  console.log("✨ Export complete!");
  console.log(`${"=".repeat(60)}`);
  console.log(`\n📄 Output: ${PATTERNS_JSON_PATH}`);
  console.log(`   Prototypes: ${exportData.prototypes.length}`);
  console.log(`   Patterns: ${exportData.patterns.length}`);
  console.log(`   With embeddings: ${exportData.patterns.filter((p) => p.embedding).length}`);
  console.log(`\nNext steps:`);
  console.log(`   1. Review the generated JSON`);
  console.log(`   2. Commit it to your repo`);
  console.log(`   3. After deploy, run: npx tsx scripts/design-engine/cli.ts seed\n`);
}

// ============================================================================
// SEED COMMAND (Import JSON into Convex)
// ============================================================================

async function seedCommand() {
  console.log("\n🎨 Design Engine - Seed Database\n");

  const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!CONVEX_URL) {
    console.error("❌ CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is required");
    process.exit(1);
  }

  console.log(`📡 Convex URL: ${CONVEX_URL}`);
  console.log(`📄 Source: ${PATTERNS_JSON_PATH}\n`);

  // Read JSON file
  if (!fs.existsSync(PATTERNS_JSON_PATH)) {
    console.error(`❌ Patterns file not found: ${PATTERNS_JSON_PATH}`);
    console.error(`   Run 'export' command first to generate it.`);
    process.exit(1);
  }

  const data: ExportedData = JSON.parse(fs.readFileSync(PATTERNS_JSON_PATH, "utf-8"));
  console.log(`📦 Loaded ${data.patterns.length} patterns from ${data.exportedAt}\n`);

  const client = new ConvexHttpClient(CONVEX_URL);

  // Seed patterns
  console.log("🌱 Seeding patterns...\n");

  for (let i = 0; i < data.patterns.length; i++) {
    const pattern = data.patterns[i];
    try {
      await client.mutation(api.designEngine.seedPattern, {
        patternId: pattern.patternId,
        type: pattern.type as "color_system" | "typography" | "section" | "animation" | "gradient" | "component" | "full_prototype",
        sourcePrototype: pattern.sourcePrototype,
        sourceFile: pattern.sourceFile,
        name: pattern.name,
        description: pattern.description,
        industries: pattern.industries,
        mood: pattern.mood,
        tags: pattern.tags,
        patternData: pattern.patternData,
        codeSnippets: pattern.codeSnippets,
        embedding: pattern.embedding,
        version: pattern.version,
      });
      console.log(`✅ [${i + 1}/${data.patterns.length}] ${pattern.name}`);
    } catch (error) {
      console.error(`❌ [${i + 1}/${data.patterns.length}] ${pattern.name}: ${error}`);
    }
  }

  // Seed prototype metadata
  console.log("\n🌱 Seeding prototype metadata...\n");

  for (const proto of data.prototypes) {
    try {
      await client.mutation(api.designEngine.indexPrototype, {
        prototypeName: proto.prototypeName,
        folderPath: proto.folderPath,
        description: proto.description,
        primaryIndustry: proto.primaryIndustry,
        colorMood: proto.colorMood,
        patternsExtracted: proto.patternsExtracted,
        status: "indexed",
        version: proto.version,
      });
      console.log(`✅ ${proto.prototypeName}`);
    } catch (error) {
      console.error(`❌ ${proto.prototypeName}: ${error}`);
    }
  }

  console.log("\n✨ Seeding complete!\n");
}

// ============================================================================
// LIST COMMAND
// ============================================================================

async function listCommand() {
  console.log("\n🎨 Design Engine - Pattern List\n");

  const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!CONVEX_URL) {
    console.error("❌ CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is required");
    process.exit(1);
  }

  const client = new ConvexHttpClient(CONVEX_URL);
  const prototypes = await client.query(api.designEngine.listPrototypes, {});

  if (prototypes.length === 0) {
    console.log("No patterns indexed yet. Run 'seed' command first.\n");
    return;
  }

  console.log(`Found ${prototypes.length} indexed prototype(s):\n`);

  for (const proto of prototypes) {
    const statusIcon =
      proto.status === "indexed"
        ? "✅"
        : proto.status === "failed"
          ? "❌"
          : "⏳";
    console.log(`${statusIcon} ${proto.prototypeName}`);
    console.log(`   Industry: ${proto.primaryIndustry}`);
    console.log(`   Mood: ${proto.colorMood.join(", ")}`);
    console.log(`   Patterns:`);
    console.log(`     - Colors: ${proto.patternsExtracted.colorSystems}`);
    console.log(`     - Typography: ${proto.patternsExtracted.typography}`);
    console.log(`     - Sections: ${proto.patternsExtracted.sections}`);
    console.log(`     - Animations: ${proto.patternsExtracted.animations}`);
    if (proto.errorMessage) {
      console.log(`   Error: ${proto.errorMessage}`);
    }
    console.log("");
  }
}

// ============================================================================
// SEARCH COMMAND
// ============================================================================

async function searchCommand(query: string, options: { limit?: number }) {
  console.log("\n🎨 Design Engine - Pattern Search\n");
  console.log(`🔍 Query: "${query}"\n`);

  const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!CONVEX_URL) {
    console.error("❌ CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is required");
    process.exit(1);
  }

  const client = new ConvexHttpClient(CONVEX_URL);

  try {
    const results = await client.action(api.designEngine.searchPatterns, {
      query,
      limit: options.limit || 5,
    });

    if (results.length === 0) {
      console.log("No matching patterns found.\n");
      console.log("Tip: Make sure patterns are seeded and have embeddings.");
      return;
    }

    console.log(`Found ${results.length} matching pattern(s):\n`);

    for (const pattern of results) {
      console.log(`📌 ${pattern.name}`);
      console.log(`   Type: ${pattern.type}`);
      console.log(`   Source: ${pattern.sourcePrototype}`);
      console.log(`   Score: ${(pattern.score * 100).toFixed(1)}%`);
      console.log(`   Industries: ${pattern.industries.join(", ")}`);
      console.log(`   Mood: ${pattern.mood.join(", ")}`);
      console.log(`   Description: ${pattern.description}`);
      console.log("");
    }
  } catch (error) {
    console.error("❌ Search error:", error);
    console.log("\nMake sure OPENAI_API_KEY is set for vector search.");
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function inferIndustry(prototypeName: string): string {
  const name = prototypeName.toLowerCase();
  if (name.includes("sailing") || name.includes("boat") || name.includes("maritime")) {
    return "maritime";
  }
  if (name.includes("cafe") || name.includes("restaurant") || name.includes("food")) {
    return "food_beverage";
  }
  if (name.includes("rental") || name.includes("hotel") || name.includes("vacation")) {
    return "hospitality";
  }
  if (name.includes("tech") || name.includes("saas") || name.includes("software")) {
    return "technology";
  }
  return "general";
}

function inferMood(prototypeName: string): string[] {
  const name = prototypeName.toLowerCase();
  const moods: string[] = [];

  if (name.includes("sailing") || name.includes("adventure")) {
    moods.push("adventurous", "professional");
  }
  if (name.includes("cafe") || name.includes("cozy")) {
    moods.push("warm", "inviting");
  }
  if (name.includes("vacation") || name.includes("rental")) {
    moods.push("relaxing", "comfortable");
  }
  if (name.includes("historic") || name.includes("manor")) {
    moods.push("elegant", "traditional");
  }

  return moods.length > 0 ? moods : ["professional"];
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "export": {
      const prototypesPath = args[1] || "./docs/prototypes_from_v0";
      await exportCommand(prototypesPath);
      break;
    }

    case "seed":
      await seedCommand();
      break;

    case "list":
      await listCommand();
      break;

    case "search": {
      const query = args.slice(1).filter((a) => !a.startsWith("-")).join(" ");
      if (!query) {
        console.error("❌ Error: Search query is required");
        console.log("Usage: npx tsx scripts/design-engine/cli.ts search <query>");
        process.exit(1);
      }
      const limitArg = args.find((a) => a.startsWith("--limit="));
      const limit = limitArg ? parseInt(limitArg.split("=")[1]) : undefined;
      await searchCommand(query, { limit });
      break;
    }

    case "help":
    default:
      console.log(`
🎨 Design Engine CLI

Workflow:
  1. Export patterns locally (with embeddings):
     npx tsx scripts/design-engine/cli.ts export

  2. Commit the generated JSON to your repo:
     git add convex/seed/designPatterns.json
     git commit -m "Update design patterns"

  3. After deploy, seed production database:
     CONVEX_URL=https://your-prod.convex.cloud npx tsx scripts/design-engine/cli.ts seed

Commands:
  export [path]    Extract patterns from prototypes, generate embeddings, save to JSON
                   Default path: ./docs/prototypes_from_v0
                   Requires: OPENROUTER_API_KEY or OPENAI_API_KEY

  seed             Import patterns from JSON into Convex database
                   Requires: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL

  list             List all indexed prototypes and pattern counts
                   Requires: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL

  search <query>   Search patterns using semantic similarity
                   Options: --limit=N  Limit results (default: 5)
                   Requires: CONVEX_URL, OPENROUTER_API_KEY or OPENAI_API_KEY

  help             Show this help message

Environment Variables:
  OPENROUTER_API_KEY          Preferred for embedding generation (via OpenRouter)
  OPENAI_API_KEY              Alternative for embedding generation (direct OpenAI)
  CONVEX_URL                  Convex deployment URL (for seed/list/search)
  NEXT_PUBLIC_CONVEX_URL      Alternative to CONVEX_URL
`);
      break;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
