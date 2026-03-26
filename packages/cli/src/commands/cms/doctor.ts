import path from "node:path";
import {
  type ParsedArgs,
  getOptionBoolean,
  getOptionString,
  getOptionStringArray
} from "../../core/args";
import { colorGray, colorGreen, colorOrange, colorRed } from "../../core/colors";
import {
  buildParityReport,
  parseContentDocument,
  readJsonFile
} from "./content";

function printUsage(): void {
  console.log(colorOrange("Usage: sevenlayers cms doctor [options]"));
  console.log("");
  console.log("Options:");
  console.log("  --in <path>                  Content file (default: .sevenlayers/cms-content.json)");
  console.log("  --require-locale <code>      Required locale (repeatable)");
  console.log("  --require-field <lookupKey>  Required lookup key (repeatable)");
  console.log("  --allow-empty-values         Do not flag empty values as issues");
  console.log("  --json                       Output deterministic JSON");
  console.log("  --help                       Show this help");
}

function defaultInputPath(): string {
  return ".sevenlayers/cms-content.json";
}

export async function handleCmsDoctor(parsed: ParsedArgs): Promise<number> {
  if (getOptionBoolean(parsed, "help")) {
    printUsage();
    return 0;
  }

  const inputPath = getOptionString(parsed, "in") ?? defaultInputPath();
  const json = getOptionBoolean(parsed, "json");
  const requiredLocales = getOptionStringArray(parsed, "require-locale");
  const requiredLookupKeys = getOptionStringArray(parsed, "require-field");

  const input = await readJsonFile(inputPath);
  const document = parseContentDocument(input);
  const report = buildParityReport({
    entries: document.entries,
    requiredLocales,
    requiredLookupKeys,
    allowEmptyValues: getOptionBoolean(parsed, "allow-empty-values")
  });

  if (json) {
    console.log(
      JSON.stringify(
        {
          success: report.complete,
          input: path.resolve(process.cwd(), inputPath),
          summary: {
            locales: report.locales.length,
            lookupKeys: report.lookupKeys.length,
            issues: report.issues.length
          },
          issues: report.issues
        },
        null,
        2
      )
    );
    return report.complete ? 0 : 1;
  }

  console.log(colorOrange("CMS doctor report"));
  console.log(colorGray(`Input: ${path.resolve(process.cwd(), inputPath)}`));
  console.log(colorGray(`Locales: ${report.locales.join(", ") || "<none>"}`));
  console.log(colorGray(`Lookup keys: ${report.lookupKeys.join(", ") || "<none>"}`));
  console.log(colorGray(`Issues: ${report.issues.length}`));

  if (report.complete) {
    console.log(colorGreen("Locale/field parity checks passed."));
    return 0;
  }

  for (const issue of report.issues) {
    console.log(colorRed(`- ${issue.message}`));
  }
  return 1;
}
