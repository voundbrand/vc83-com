import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { Framework, FrameworkMeta, Rule } from "./types.js";

/**
 * Load all frameworks from a directory.
 * Each subdirectory is a framework with meta.yaml + rule files.
 */
export function loadFrameworks(
  frameworksDir: string,
  enabledIds: string[],
): Framework[] {
  if (!existsSync(frameworksDir)) {
    return [];
  }

  const frameworks: Framework[] = [];

  for (const dirName of readdirSync(frameworksDir, { withFileTypes: true })) {
    if (!dirName.isDirectory()) continue;

    // Only load enabled frameworks
    if (!enabledIds.includes(dirName.name)) continue;

    const frameworkDir = resolve(frameworksDir, dirName.name);
    const framework = loadSingleFramework(frameworkDir, dirName.name);
    if (framework) {
      frameworks.push(framework);
    }
  }

  return frameworks;
}

function loadSingleFramework(
  dir: string,
  fallbackId: string,
): Framework | null {
  const metaPath = join(dir, "meta.yaml");

  let meta: FrameworkMeta;
  if (existsSync(metaPath)) {
    const raw = readFileSync(metaPath, "utf-8");
    meta = parseYaml(raw) as FrameworkMeta;
  } else {
    meta = {
      id: fallbackId,
      name: fallbackId,
      version: "0.0.0",
      description: `Framework: ${fallbackId}`,
    };
  }

  // Load all YAML files that aren't meta.yaml
  const rules: Rule[] = [];
  for (const file of readdirSync(dir)) {
    if (file === "meta.yaml") continue;
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;

    const filePath = join(dir, file);
    const raw = readFileSync(filePath, "utf-8");
    const parsed = parseYaml(raw) as { rules?: Rule[] };

    if (parsed?.rules && Array.isArray(parsed.rules)) {
      rules.push(...parsed.rules);
    }
  }

  return { meta, rules };
}

/**
 * Load a single framework from inline rule definitions (for testing).
 */
export function createInlineFramework(
  meta: FrameworkMeta,
  rules: Rule[],
): Framework {
  return { meta, rules };
}
