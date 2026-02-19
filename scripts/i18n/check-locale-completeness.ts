#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

interface CliOptions {
  locales: string[];
  seedDir: string;
}

interface TranslationKeyEntry {
  key: string;
  locales: Set<string>;
  files: Set<string>;
}

interface MissingLocaleEntry {
  key: string;
  missingLocales: string[];
  files: string[];
}

const DEFAULT_LOCALES = ["en", "de", "pl", "es", "fr", "ja"];

const REQUIRED_NAMESPACE_PREFIXES = [
  "ui.builder.",
  "ui.manage.security.passkeys.",
  "ui.payments.stripe.",
  "ui.payments.stripe_connect.",
] as const;

function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));
    const files = collectSeedFiles(options.seedDir);
    const entries = collectTranslationEntries(files);

    const missingNamespaces: string[] = [];
    const keysInScope = [...entries.values()]
      .filter((entry) => matchesRequiredNamespace(entry.key))
      .sort((a, b) => a.key.localeCompare(b.key));

    for (const prefix of REQUIRED_NAMESPACE_PREFIXES) {
      const hasNamespace = keysInScope.some((entry) => entry.key.startsWith(prefix));
      if (!hasNamespace) {
        missingNamespaces.push(prefix);
      }
    }

    const missingLocales: MissingLocaleEntry[] = [];
    for (const entry of keysInScope) {
      const missing = options.locales.filter((locale) => !entry.locales.has(locale));
      if (missing.length > 0) {
        missingLocales.push({
          key: entry.key,
          missingLocales: missing,
          files: [...entry.files].sort(),
        });
      }
    }

    console.log(
      `[i18n-seed-check] filesScanned=${files.length} keysInRequiredNamespaces=${keysInScope.length}`,
    );

    if (missingNamespaces.length === 0) {
      console.log("[i18n-seed-check] Required namespace coverage: OK");
    } else {
      console.log("[i18n-seed-check] Missing required namespace coverage:");
      for (const prefix of missingNamespaces) {
        console.log(`- ${prefix}`);
      }
    }

    if (missingLocales.length === 0) {
      console.log(
        `[i18n-seed-check] Locale parity: OK for locales ${options.locales.join(",")}`,
      );
      return;
    }

    console.log("[i18n-seed-check] Missing locale values:");
    for (const entry of missingLocales) {
      console.log(
        `- ${entry.key} :: missing=[${entry.missingLocales.join(",")}] files=${entry.files.join(",")}`,
      );
    }

    process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[i18n-seed-check] ${message}`);
    process.exitCode = 1;
  }
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    locales: [...DEFAULT_LOCALES],
    seedDir: path.join(process.cwd(), "convex/translations"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help") {
      printUsage();
      process.exit(0);
    }

    if (arg === "--locales") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --locales");
      }
      const parsed = value
        .split(",")
        .map((locale) => locale.trim())
        .filter((locale) => locale.length > 0);

      if (parsed.length === 0) {
        throw new Error("--locales requires at least one locale");
      }

      options.locales = parsed;
      index += 1;
      continue;
    }

    if (arg === "--seed-dir") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --seed-dir");
      }
      options.seedDir = path.resolve(process.cwd(), value);
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
    "  npx tsx scripts/i18n/check-locale-completeness.ts [--locales en,de,pl,es,fr,ja] [--seed-dir convex/translations]",
  );
}

function collectSeedFiles(seedDir: string): string[] {
  if (!fs.existsSync(seedDir)) {
    throw new Error(`Seed directory not found: ${toPosixPath(seedDir)}`);
  }

  const files = fs
    .readdirSync(seedDir)
    .filter((name) => /^seed.*\.ts$/i.test(name))
    .map((name) => path.join(seedDir, name))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No seed files found in ${toPosixPath(seedDir)}`);
  }

  return files;
}

function collectTranslationEntries(seedFiles: string[]): Map<string, TranslationKeyEntry> {
  const entries = new Map<string, TranslationKeyEntry>();

  for (const filePath of seedFiles) {
    const raw = fs.readFileSync(filePath, "utf8");
    const source = ts.createSourceFile(filePath, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    const visit = (node: ts.Node): void => {
      if (ts.isObjectLiteralExpression(node)) {
        const key = getKeyPropertyValue(node);
        if (key && key.startsWith("ui.")) {
          const locales = getValuesLocales(node);
          if (locales.size > 0) {
            const existing = entries.get(key) ?? {
              key,
              locales: new Set<string>(),
              files: new Set<string>(),
            };

            for (const locale of locales) {
              existing.locales.add(locale);
            }
            existing.files.add(toPosixPath(path.relative(process.cwd(), filePath)));
            entries.set(key, existing);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  return entries;
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

function getValuesLocales(node: ts.ObjectLiteralExpression): Set<string> {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }

    const name = getPropertyName(property.name);
    if (name !== "values" || !ts.isObjectLiteralExpression(property.initializer)) {
      continue;
    }

    const locales = new Set<string>();
    for (const valueProperty of property.initializer.properties) {
      if (!ts.isPropertyAssignment(valueProperty)) {
        continue;
      }

      const locale = getPropertyName(valueProperty.name);
      if (!locale) {
        continue;
      }

      const value = getStringLiteralValue(valueProperty.initializer);
      if (typeof value === "string") {
        locales.add(locale);
      }
    }

    return locales;
  }

  return new Set<string>();
}

function getPropertyName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name)) {
    return name.text;
  }

  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) {
    return name.text;
  }

  if (ts.isComputedPropertyName(name)) {
    return getStringLiteralValue(name.expression);
  }

  return null;
}

function getStringLiteralValue(expression: ts.Expression): string | null {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }

  return null;
}

function matchesRequiredNamespace(key: string): boolean {
  return REQUIRED_NAMESPACE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

main();
