import path from "node:path";
import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString,
  getOptionStringArray
} from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import {
  type CmsContentEntry,
  buildContentDocument,
  buildParityReport,
  normalizeCmsEntry,
  writeJsonFile
} from "./content";

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers cms seed [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --locale <code>            Locale code (repeatable, default: en)");
  console.log("  --field <lookupKey>        Lookup key to seed (repeatable)");
  console.log("  --value <locale:key:value> Optional seed value override (repeatable)");
  console.log("  --out <path>               Output content file (default: .sevenlayers/cms-content.json)");
  console.log("  --dry-run                  Preview seed summary without writing");
  console.log("  --apply                    Write seed file (overrides dry-run)");
  console.log("  --json                     Output deterministic JSON");
  console.log("  --help                     Show this help");
}

function defaultOutputPath(): string {
  return ".sevenlayers/cms-content.json";
}

function parseValueOverride(spec: string): CmsContentEntry {
  const [locale, lookupKey, ...valueParts] = spec.split(":");
  if (!locale || !lookupKey || valueParts.length === 0) {
    throw new Error(
      `Invalid --value '${spec}'. Expected format: <locale>:<lookupKey>:<value>`
    );
  }
  return normalizeCmsEntry({
    locale,
    lookupKey,
    value: valueParts.join(":")
  });
}

export async function handleCmsSeed(parsed: ParsedArgs): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const locales = getOptionStringArray(parsed, "locale");
  const normalizedLocales = locales.length > 0 ? locales : ["en"];
  const lookupKeys = getOptionStringArray(parsed, "field");
  if (lookupKeys.length === 0) {
    throw new Error("cms seed requires at least one --field <lookupKey>.");
  }

  const entries: CmsContentEntry[] = [];
  for (const locale of normalizedLocales) {
    for (const lookupKey of lookupKeys) {
      entries.push(normalizeCmsEntry({ locale, lookupKey, value: "" }));
    }
  }

  const overrides = getOptionStringArray(parsed, "value").map(parseValueOverride);
  if (overrides.length > 0) {
    const byKey = new Map<string, CmsContentEntry>();
    for (const entry of entries) {
      byKey.set(`${entry.locale}::${entry.lookupKey}`, entry);
    }
    for (const override of overrides) {
      byKey.set(`${override.locale}::${override.lookupKey}`, override);
    }
    entries.splice(0, entries.length, ...Array.from(byKey.values()));
  }

  const outputPath = getOptionString(parsed, "out") ?? defaultOutputPath();
  const dryRun = getOptionBoolean(parsed, "dry-run") || !getOptionBoolean(parsed, "apply");
  const json = getOptionBoolean(parsed, "json");

  const document = buildContentDocument(entries, "cms seed");
  const parity = buildParityReport({ entries: document.entries });

  if (!dryRun) {
    await writeJsonFile(outputPath, document);
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          action: "seed",
          dryRun,
          output: path.resolve(process.cwd(), outputPath),
          summary: {
            entries: document.entries.length,
            locales: parity.locales.length,
            lookupKeys: parity.lookupKeys.length,
            parityComplete: parity.complete,
            issues: parity.issues.length
          }
        },
        null,
        2
      )
    );
    return 0;
  }

  console.log(colorGreen("CMS seed plan generated."));
  console.log(colorGray(`Entries: ${document.entries.length}`));
  console.log(colorGray(`Locales: ${parity.locales.join(", ")}`));
  console.log(colorGray(`Lookup keys: ${parity.lookupKeys.join(", ")}`));
  if (dryRun) {
    console.log(colorGray("Dry-run: seed file not written."));
  } else {
    console.log(colorGray(`Wrote: ${path.resolve(process.cwd(), outputPath)}`));
  }
  return 0;
}
