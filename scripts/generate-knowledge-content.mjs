#!/usr/bin/env node
/**
 * Generate _content.ts from system knowledge .md files.
 *
 * Run this whenever you update a .md file in convex/ai/systemKnowledge/:
 *   node scripts/generate-knowledge-content.mjs
 *
 * This creates convex/ai/systemKnowledge/_content.ts with all MD content
 * as exported string constants, so Convex can bundle them.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";

const KNOWLEDGE_DIR = join(
  process.cwd(),
  "convex",
  "ai",
  "systemKnowledge"
);
const FRAMEWORKS_DIR = join(KNOWLEDGE_DIR, "frameworks");
const COMPOSITION_DIR = join(KNOWLEDGE_DIR, "composition");
const SKILLS_DIR = join(KNOWLEDGE_DIR, "skills");
const OUTPUT_FILE = join(KNOWLEDGE_DIR, "_content.ts");

function toConstName(filename) {
  // meta-context.md → META_CONTEXT
  // frameworks/storybrand.md → FRAMEWORK_STORYBRAND
  return filename
    .replace(/\.md$/, "")
    .replace(/\//g, "_")
    .replace(/-/g, "_")
    .toUpperCase();
}

function escapeForTemplate(content) {
  // Escape backticks and ${} for template literals
  return content.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function stripFrontmatter(content) {
  // Remove YAML frontmatter (--- ... ---) if present
  const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

const entries = [];

// Core files
const coreFiles = readdirSync(KNOWLEDGE_DIR).filter(
  (f) => f.endsWith(".md") && !f.startsWith("_")
);
for (const file of coreFiles) {
  const raw = readFileSync(join(KNOWLEDGE_DIR, file), "utf-8");
  const content = stripFrontmatter(raw);
  const constName = toConstName(file);
  const id = file.replace(/\.md$/, "");
  entries.push({ constName, content, id, filePath: file });
}

// Framework files
const frameworkFiles = readdirSync(FRAMEWORKS_DIR).filter((f) =>
  f.endsWith(".md")
);
for (const file of frameworkFiles) {
  const raw = readFileSync(join(FRAMEWORKS_DIR, file), "utf-8");
  const content = stripFrontmatter(raw);
  const constName = toConstName(`frameworks/${file}`);
  const id = file.replace(/\.md$/, "");
  entries.push({
    constName,
    content,
    id,
    filePath: `frameworks/${file}`,
  });
}

// Composition files
const compositionFiles = readdirSync(COMPOSITION_DIR).filter((f) =>
  f.endsWith(".md")
);
for (const file of compositionFiles) {
  const raw = readFileSync(join(COMPOSITION_DIR, file), "utf-8");
  const content = stripFrontmatter(raw);
  const constName = toConstName(`composition/${file}`);
  const id = file.replace(/\.md$/, "");
  entries.push({
    constName,
    content,
    id,
    filePath: `composition/${file}`,
  });
}

// Skills files (recursive subdirectories)
function scanSkillsDir(dir, prefix = "skills") {
  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory()) {
      scanSkillsDir(join(dir, item.name), `${prefix}/${item.name}`);
    } else if (item.name.endsWith(".md")) {
      const raw = readFileSync(join(dir, item.name), "utf-8");
      const content = stripFrontmatter(raw);
      const constName = toConstName(`${prefix}/${item.name}`);
      // For SKILL.md files, use folder name as ID: "skill-lead-generation"
      const id =
        item.name === "SKILL.md"
          ? `skill-${prefix.split("/").pop()}`
          : item.name === "_SHARED.md"
            ? "skill-shared"
            : item.name.replace(/\.md$/, "");
      entries.push({ constName, content, id, filePath: `${prefix}/${item.name}` });
    }
  }
}

if (existsSync(SKILLS_DIR)) {
  scanSkillsDir(SKILLS_DIR);
}

// Generate _content.ts
const lines = [
  "/**",
  " * AUTO-GENERATED — Do not edit manually.",
  " * Run: node scripts/generate-knowledge-content.mjs",
  " *",
  ` * Generated from ${entries.length} .md files in convex/ai/systemKnowledge/`,
  ` * Total size: ${entries.reduce((sum, e) => sum + e.content.length, 0).toLocaleString()} characters`,
  " */",
  "",
];

// Export each constant
for (const entry of entries) {
  lines.push(`export const ${entry.constName} = \`${escapeForTemplate(entry.content)}\`;`);
  lines.push("");
}

// Export a lookup map: id → content
lines.push("/** Lookup map: knowledge ID → content string */");
lines.push("export const KNOWLEDGE_CONTENT: Record<string, string> = {");
for (const entry of entries) {
  lines.push(`  "${entry.id}": ${entry.constName},`);
}
lines.push("};");
lines.push("");

writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8");

console.log(`Generated ${OUTPUT_FILE}`);
console.log(`  ${entries.length} knowledge documents`);
console.log(
  `  ${entries.reduce((sum, e) => sum + e.content.length, 0).toLocaleString()} characters total`
);
