#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as ts from "typescript";

export interface NamespaceLoadBudgetOptions {
  srcDir: string;
  seedDir: string;
  maxSingle: number;
  maxCombined: number;
}

interface NamespaceUsage {
  namespace: string;
  file: string;
  line: number;
}

interface MultiNamespaceUsage {
  namespaces: string[];
  file: string;
  line: number;
}

interface NamespaceCount {
  namespace: string;
  count: number;
  callSites: string[];
}

interface SingleNamespaceViolation {
  namespace: string;
  count: number;
  limit: number;
  callSites: string[];
}

interface MultiNamespaceViolation {
  namespaces: string[];
  count: number;
  limit: number;
  callSite: string;
}

export interface NamespaceLoadBudgetResult {
  seedKeyCount: number;
  loadedNamespaceCount: number;
  namespaceCounts: NamespaceCount[];
  singleViolations: SingleNamespaceViolation[];
  multiViolations: MultiNamespaceViolation[];
}

interface CliOptions {
  srcDir: string;
  seedDir: string;
  maxSingle: number;
  maxCombined: number;
}

const DEFAULT_MAX_SINGLE = 1500;
const DEFAULT_MAX_COMBINED = 2200;
const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

function main(): void {
  try {
    const cli = parseArgs(process.argv.slice(2));
    const result = runNamespaceLoadBudgetAudit(
      {
        srcDir: cli.srcDir,
        seedDir: cli.seedDir,
        maxSingle: cli.maxSingle,
        maxCombined: cli.maxCombined,
      },
      process.cwd(),
    );

    console.log(
      `[i18n-namespace-budget] namespaces=${result.loadedNamespaceCount} seedKeys=${result.seedKeyCount}`,
    );

    const top = result.namespaceCounts.slice(0, 20);
    if (top.length > 0) {
      console.log("[i18n-namespace-budget] Top loaded namespaces by key count:");
      for (const row of top) {
        console.log(`- ${row.namespace} :: ${row.count}`);
      }
    }

    if (result.singleViolations.length === 0 && result.multiViolations.length === 0) {
      console.log(
        `[i18n-namespace-budget] OK (maxSingle=${cli.maxSingle}, maxCombined=${cli.maxCombined})`,
      );
      return;
    }

    if (result.singleViolations.length > 0) {
      console.log("[i18n-namespace-budget] Single-namespace violations:");
      for (const violation of result.singleViolations) {
        console.log(
          `- ${violation.namespace} :: count=${violation.count} limit=${violation.limit} callSites=${violation.callSites.join(", ")}`,
        );
      }
    }

    if (result.multiViolations.length > 0) {
      console.log("[i18n-namespace-budget] Multi-namespace violations:");
      for (const violation of result.multiViolations) {
        console.log(
          `- [${violation.namespaces.join(", ")}] :: count=${violation.count} limit=${violation.limit} callSite=${violation.callSite}`,
        );
      }
    }

    process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[i18n-namespace-budget] ${message}`);
    process.exitCode = 1;
  }
}

export function runNamespaceLoadBudgetAudit(
  options: NamespaceLoadBudgetOptions,
  cwd: string = process.cwd(),
): NamespaceLoadBudgetResult {
  const srcDir = path.resolve(cwd, options.srcDir);
  const seedDir = path.resolve(cwd, options.seedDir);
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${toPosixPath(srcDir)}`);
  }
  if (!fs.existsSync(seedDir)) {
    throw new Error(`Seed directory not found: ${toPosixPath(seedDir)}`);
  }
  if (!Number.isFinite(options.maxSingle) || options.maxSingle < 1) {
    throw new Error("--max-single must be a positive number");
  }
  if (!Number.isFinite(options.maxCombined) || options.maxCombined < 1) {
    throw new Error("--max-combined must be a positive number");
  }

  const sourceFiles = walkSourceFiles(srcDir);
  const usages = collectNamespaceUsages(sourceFiles);
  const seedKeys = collectSeedKeys(seedDir);
  const uniqueSeedKeys = [...new Set(seedKeys)].sort((a, b) => a.localeCompare(b));

  const usageByNamespace = new Map<string, Set<string>>();
  for (const usage of usages.single) {
    const callsite = `${usage.file}:${usage.line}`;
    const current = usageByNamespace.get(usage.namespace) ?? new Set<string>();
    current.add(callsite);
    usageByNamespace.set(usage.namespace, current);
  }
  for (const usage of usages.multiple) {
    for (const namespace of usage.namespaces) {
      const callsite = `${usage.file}:${usage.line}`;
      const current = usageByNamespace.get(namespace) ?? new Set<string>();
      current.add(callsite);
      usageByNamespace.set(namespace, current);
    }
  }

  const namespaceCounts: NamespaceCount[] = [...usageByNamespace.entries()]
    .map(([namespace, callSites]) => ({
      namespace,
      count: countKeysForNamespace(uniqueSeedKeys, namespace),
      callSites: [...callSites].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => b.count - a.count || a.namespace.localeCompare(b.namespace));

  const singleViolations: SingleNamespaceViolation[] = namespaceCounts
    .filter((row) => row.count > options.maxSingle)
    .map((row) => ({
      namespace: row.namespace,
      count: row.count,
      limit: options.maxSingle,
      callSites: row.callSites,
    }))
    .sort((a, b) => b.count - a.count || a.namespace.localeCompare(b.namespace));

  const multiViolations: MultiNamespaceViolation[] = usages.multiple
    .map((usage) => {
      const uniqueNamespaces = [...new Set(usage.namespaces)].sort((a, b) =>
        a.localeCompare(b),
      );
      const keyCount = countKeysForNamespaces(uniqueSeedKeys, uniqueNamespaces);
      return {
        namespaces: uniqueNamespaces,
        count: keyCount,
        limit: options.maxCombined,
        callSite: `${usage.file}:${usage.line}`,
      };
    })
    .filter((row) => row.count > row.limit)
    .sort((a, b) => b.count - a.count || a.callSite.localeCompare(b.callSite));

  return {
    seedKeyCount: uniqueSeedKeys.length,
    loadedNamespaceCount: namespaceCounts.length,
    namespaceCounts,
    singleViolations,
    multiViolations,
  };
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    srcDir: "src",
    seedDir: "convex/translations",
    maxSingle: DEFAULT_MAX_SINGLE,
    maxCombined: DEFAULT_MAX_COMBINED,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--src-dir") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --src-dir");
      }
      options.srcDir = value;
      index += 1;
      continue;
    }

    if (arg === "--seed-dir") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --seed-dir");
      }
      options.seedDir = value;
      index += 1;
      continue;
    }

    if (arg === "--max-single") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --max-single");
      }
      options.maxSingle = Number(value);
      index += 1;
      continue;
    }

    if (arg === "--max-combined") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --max-combined");
      }
      options.maxCombined = Number(value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printUsage(): void {
  console.log("Usage:");
  console.log(
    "  npx tsx scripts/i18n/check-namespace-load-budget.ts [--src-dir src] [--seed-dir convex/translations] [--max-single 1500] [--max-combined 2200]",
  );
}

function walkSourceFiles(sourceRoot: string): string[] {
  const files: string[] = [];
  walkRecursive(sourceRoot, files);
  return files
    .filter((filePath) =>
      SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase()),
    )
    .sort((a, b) => a.localeCompare(b));
}

function walkRecursive(absoluteDir: string, files: string[]): void {
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }

    const entryPath = path.join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      walkRecursive(entryPath, files);
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }
}

function collectNamespaceUsages(files: string[]): {
  single: NamespaceUsage[];
  multiple: MultiNamespaceUsage[];
} {
  const single: NamespaceUsage[] = [];
  const multiple: MultiNamespaceUsage[] = [];

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf8");
    const source = ts.createSourceFile(
      filePath,
      raw,
      ts.ScriptTarget.Latest,
      true,
      toScriptKind(filePath),
    );

    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const callee = getCalleeName(node.expression);

        if (callee === "useNamespaceTranslations") {
          const firstArg = node.arguments[0];
          const namespace = getStringLiteralValue(firstArg);
          if (namespace) {
            const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
            single.push({
              namespace: normalizeNamespaceValue(namespace),
              file: toPosixPath(filePath),
              line: pos.line + 1,
            });
          }
        }

        if (callee === "useMultipleNamespaces") {
          const firstArg = node.arguments[0];
          if (firstArg && ts.isArrayLiteralExpression(firstArg)) {
            const namespaces = firstArg.elements
              .map((element) => getStringLiteralValue(element))
              .filter((value): value is string => typeof value === "string")
              .map(normalizeNamespaceValue)
              .filter((value) => value.length > 0);

            if (namespaces.length > 0) {
              const pos = source.getLineAndCharacterOfPosition(node.getStart(source));
              multiple.push({
                namespaces,
                file: toPosixPath(filePath),
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

  return { single, multiple };
}

function getCalleeName(expression: ts.LeftHandSideExpression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return null;
}

function collectSeedKeys(seedDir: string): string[] {
  const seedFiles = fs
    .readdirSync(seedDir)
    .filter((name) => /^seed.*\.ts$/i.test(name))
    .map((name) => path.join(seedDir, name))
    .sort((a, b) => a.localeCompare(b));

  const keys: string[] = [];
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
        const key = getKeyPropertyValue(node);
        if (key && key.startsWith("ui.")) {
          keys.push(key);
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return keys;
}

function getKeyPropertyValue(node: ts.ObjectLiteralExpression): string | null {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    const name = getPropertyName(property.name);
    if (name !== "key") {
      continue;
    }
    return getStringLiteralValue(property.initializer);
  }
  return null;
}

function getPropertyName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name)) {
    return name.text;
  }
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }
  return null;
}

function getStringLiteralValue(node: ts.Node | undefined): string | null {
  if (!node) {
    return null;
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function countKeysForNamespace(keys: string[], namespace: string): number {
  const prefix = `${namespace}.`;
  let count = 0;
  for (const key of keys) {
    if (key.startsWith(prefix)) {
      count += 1;
    }
  }
  return count;
}

function countKeysForNamespaces(keys: string[], namespaces: string[]): number {
  const prefixes = namespaces.map((namespace) => `${namespace}.`);
  const matched = new Set<string>();

  for (const key of keys) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) {
        matched.add(key);
        break;
      }
    }
  }

  return matched.size;
}

function normalizeNamespaceValue(value: string): string {
  return value.trim().replace(/\.+$/, "");
}

function toScriptKind(filePath: string): ts.ScriptKind {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".tsx") {
    return ts.ScriptKind.TSX;
  }
  if (extension === ".jsx") {
    return ts.ScriptKind.JSX;
  }
  if (extension === ".js") {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function toPosixPath(rawPath: string): string {
  return rawPath.split(path.sep).join("/");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
