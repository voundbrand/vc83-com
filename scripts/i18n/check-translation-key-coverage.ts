#!/usr/bin/env tsx
/**
 * CHECK TRANSLATION KEY COVERAGE
 *
 * Cross-references t() calls in component source files against keys defined
 * in seed files.  Reports any keys that are used at runtime but have no
 * matching seed entry — meaning they will render as raw dotted keys in the UI.
 *
 * Usage:
 *   npx tsx scripts/i18n/check-translation-key-coverage.ts [options]
 *
 * Options:
 *   --src-dirs <dirs>   Comma-separated source directories (default: src/components,src/app)
 *   --seed-dir <dir>    Seed file directory (default: convex/translations)
 *   --fail-on-missing   Exit with code 1 when missing keys are found
 *   --report <path>     Write JSON report to this path
 *   --help              Show usage
 */
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CliOptions {
  srcDirs: string[];
  seedDir: string;
  failOnMissing: boolean;
  reportPath?: string;
}

interface KeyUsage {
  key: string;
  file: string;
  line: number;
}

interface CoverageReport {
  version: 1;
  srcDirs: string[];
  seedDir: string;
  componentFilesScanned: number;
  seedFilesScanned: number;
  uniqueKeysInComponents: number;
  uniqueKeysInSeeds: number;
  missingFromSeeds: MissingKeyEntry[];
}

interface MissingKeyEntry {
  key: string;
  usages: { file: string; line: number }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const TRANSLATION_FN_NAMES = new Set(["t", "tWithFallback"]);

// Keys matching this pattern are treated as translation keys.
const TRANSLATION_KEY_PATTERN = /^ui\.[a-z0-9_]+(\.[a-z0-9_]+)+$/;

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = runCoverageCheck(options);

    logSummary(report);

    if (options.reportPath) {
      writeReport(options.reportPath, report);
    }

    if (options.failOnMissing && report.missingFromSeeds.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[i18n-key-coverage] ${message}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

function runCoverageCheck(options: CliOptions): CoverageReport {
  const cwd = process.cwd();

  // 1. Collect all translation keys defined in seed files.
  const seedFiles = collectSeedFiles(options.seedDir);
  const seedKeys = collectSeedKeys(seedFiles);

  // 2. Collect all translation keys used in component sources.
  const srcFiles = collectSourceFiles(options.srcDirs, cwd);
  const usages = collectKeyUsages(srcFiles, cwd);

  // 3. Build unique component-key set.
  const componentKeyMap = new Map<string, KeyUsage[]>();
  for (const usage of usages) {
    const list = componentKeyMap.get(usage.key) ?? [];
    list.push(usage);
    componentKeyMap.set(usage.key, list);
  }

  // 4. Find keys used in components but absent from seeds.
  const missingFromSeeds: MissingKeyEntry[] = [];
  for (const [key, keyUsages] of [...componentKeyMap.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (!seedKeys.has(key)) {
      missingFromSeeds.push({
        key,
        usages: keyUsages.map((u) => ({
          file: toPosix(u.file),
          line: u.line,
        })),
      });
    }
  }

  return {
    version: 1,
    srcDirs: options.srcDirs,
    seedDir: options.seedDir,
    componentFilesScanned: srcFiles.length,
    seedFilesScanned: seedFiles.length,
    uniqueKeysInComponents: componentKeyMap.size,
    uniqueKeysInSeeds: seedKeys.size,
    missingFromSeeds,
  };
}

// ---------------------------------------------------------------------------
// Seed file scanning
// ---------------------------------------------------------------------------

function collectSeedFiles(seedDir: string): string[] {
  const absoluteDir = path.resolve(process.cwd(), seedDir);
  if (!fs.existsSync(absoluteDir)) {
    throw new Error(`Seed directory not found: ${seedDir}`);
  }

  return fs
    .readdirSync(absoluteDir)
    .filter((name) => /^seed.*\.ts$/i.test(name))
    .map((name) => path.join(absoluteDir, name))
    .sort();
}

function collectSeedKeys(seedFiles: string[]): Set<string> {
  const keys = new Set<string>();

  for (const filePath of seedFiles) {
    const raw = fs.readFileSync(filePath, "utf8");
    const source = ts.createSourceFile(
      filePath,
      raw,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const visit = (node: ts.Node): void => {
      if (ts.isObjectLiteralExpression(node)) {
        const key = getPropertyStringValue(node, "key");
        if (key && key.startsWith("ui.")) {
          keys.add(key);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return keys;
}

// ---------------------------------------------------------------------------
// Component source scanning
// ---------------------------------------------------------------------------

function collectSourceFiles(srcDirs: string[], cwd: string): string[] {
  const files = new Set<string>();
  for (const dir of srcDirs) {
    const absoluteDir = path.resolve(cwd, dir);
    if (!fs.existsSync(absoluteDir)) {
      continue;
    }
    for (const file of walkDirectory(absoluteDir)) {
      if (SUPPORTED_EXTENSIONS.has(path.extname(file).toLowerCase())) {
        files.add(file);
      }
    }
  }
  return [...files].sort();
}

function collectKeyUsages(sourceFiles: string[], cwd: string): KeyUsage[] {
  const usages: KeyUsage[] = [];

  for (const absolutePath of sourceFiles) {
    const relativePath = toPosix(path.relative(cwd, absolutePath));
    const raw = fs.readFileSync(absolutePath, "utf8");
    const source = ts.createSourceFile(
      relativePath,
      raw,
      ts.ScriptTarget.Latest,
      true,
      toScriptKind(absolutePath),
    );

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const calleeName = resolveCalleeName(node.expression);
        if (calleeName && TRANSLATION_FN_NAMES.has(calleeName)) {
          const firstArg = node.arguments[0];
          if (firstArg) {
            const key = extractStringLiteral(firstArg);
            if (key && TRANSLATION_KEY_PATTERN.test(key)) {
              const pos = source.getLineAndCharacterOfPosition(
                node.getStart(source),
              );
              usages.push({
                key,
                file: relativePath,
                line: pos.line + 1,
              });
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return usages;
}

// ---------------------------------------------------------------------------
// AST helpers
// ---------------------------------------------------------------------------

function resolveCalleeName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return null;
}

function extractStringLiteral(node: ts.Expression): string | null {
  if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node)
  ) {
    return node.text;
  }
  return null;
}

function getPropertyStringValue(
  obj: ts.ObjectLiteralExpression,
  propertyName: string,
): string | null {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = ts.isIdentifier(prop.name)
      ? prop.name.text
      : ts.isStringLiteral(prop.name)
        ? prop.name.text
        : null;
    if (name === propertyName) {
      return extractStringLiteral(prop.initializer);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// File system helpers
// ---------------------------------------------------------------------------

function walkDirectory(absoluteDir: string): string[] {
  const collected: string[] = [];
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      collected.push(...walkDirectory(full));
    } else if (entry.isFile()) {
      collected.push(full);
    }
  }
  return collected;
}

function toScriptKind(file: string): ts.ScriptKind {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".tsx") return ts.ScriptKind.TSX;
  if (ext === ".jsx") return ts.ScriptKind.JSX;
  if (ext === ".js") return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function logSummary(report: CoverageReport): void {
  console.log(
    `[i18n-key-coverage] componentFiles=${report.componentFilesScanned} seedFiles=${report.seedFilesScanned}`,
  );
  console.log(
    `[i18n-key-coverage] keysInComponents=${report.uniqueKeysInComponents} keysInSeeds=${report.uniqueKeysInSeeds}`,
  );

  if (report.missingFromSeeds.length === 0) {
    console.log("[i18n-key-coverage] All component translation keys have matching seed entries. OK");
    return;
  }

  console.log(
    `[i18n-key-coverage] MISSING: ${report.missingFromSeeds.length} key(s) used in components but not defined in any seed file:`,
  );
  for (const entry of report.missingFromSeeds) {
    const locations = entry.usages
      .map((u) => `${u.file}:${u.line}`)
      .join(", ");
    console.log(`  - ${entry.key}  (${locations})`);
  }
}

function writeReport(reportPath: string, report: CoverageReport): void {
  const absolutePath = path.resolve(process.cwd(), reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`[i18n-key-coverage] report=${toPosix(reportPath)}`);
}

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    srcDirs: ["src/components", "src/app"],
    seedDir: "convex/translations",
    failOnMissing: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--src-dirs") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --src-dirs");
      }
      options.srcDirs = value.split(",").map((d) => d.trim()).filter(Boolean);
      i += 1;
      continue;
    }

    if (arg === "--seed-dir") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --seed-dir");
      }
      options.seedDir = value;
      i += 1;
      continue;
    }

    if (arg === "--fail-on-missing") {
      options.failOnMissing = true;
      continue;
    }

    if (arg === "--report") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --report");
      }
      options.reportPath = value;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage(): void {
  console.log("Usage:");
  console.log(
    "  npx tsx scripts/i18n/check-translation-key-coverage.ts [--src-dirs src/components,src/app] [--seed-dir convex/translations] [--fail-on-missing] [--report path]",
  );
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main();
