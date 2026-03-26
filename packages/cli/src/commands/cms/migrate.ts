import path from "node:path";
import { type ParsedArgs, getOptionBoolean, getOptionString } from "../../core/args";
import { colorGray, colorGreen, colorOrange } from "../../core/colors";
import {
  buildContentDocument,
  buildParityReport,
  parseLegacyCmsInput,
  readJsonFile,
  writeJsonFile
} from "./content";

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers cms migrate legacy [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --in <path>                Legacy input file (default: .sevenlayers/cms-legacy.json)");
  console.log("  --out <path>               Migrated output file (default: .sevenlayers/cms-content.json)");
  console.log("  --dry-run                  Preview migration summary without writing");
  console.log("  --apply                    Write migrated file (overrides dry-run)");
  console.log("  --json                     Output deterministic JSON");
  console.log("  --help                     Show this help");
}

function defaultLegacyPath(): string {
  return ".sevenlayers/cms-legacy.json";
}

function defaultOutputPath(): string {
  return ".sevenlayers/cms-content.json";
}

export async function handleCmsMigrate(parsed: ParsedArgs): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const mode = parsed.positionals[2];
  if (mode !== "legacy") {
    throw new Error("Usage: sevenlayers cms migrate legacy [options]");
  }

  const inputPath = getOptionString(parsed, "in") ?? defaultLegacyPath();
  const outputPath = getOptionString(parsed, "out") ?? defaultOutputPath();
  const dryRun = getOptionBoolean(parsed, "dry-run") || !getOptionBoolean(parsed, "apply");
  const json = getOptionBoolean(parsed, "json");

  const legacyInput = await readJsonFile(inputPath);
  const entries = parseLegacyCmsInput(legacyInput);
  const document = buildContentDocument(entries, "cms migrate legacy");
  const parity = buildParityReport({ entries: document.entries, allowEmptyValues: true });

  if (!dryRun) {
    await writeJsonFile(outputPath, document);
  }

  if (json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          action: "migrate-legacy",
          dryRun,
          input: path.resolve(process.cwd(), inputPath),
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

  console.log(colorGreen("CMS legacy migration completed."));
  console.log(colorGray(`Input: ${path.resolve(process.cwd(), inputPath)}`));
  console.log(colorGray(`Entries: ${document.entries.length}`));
  console.log(colorGray(`Locales: ${parity.locales.length}`));
  console.log(colorGray(`Lookup keys: ${parity.lookupKeys.length}`));
  if (dryRun) {
    console.log(colorGray("Dry-run: migrated file not written."));
  } else {
    console.log(colorGray(`Wrote: ${path.resolve(process.cwd(), outputPath)}`));
  }
  return 0;
}
