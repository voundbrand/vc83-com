"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCmsSeed = handleCmsSeed;
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const content_1 = require("./content");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers cms seed [options]"));
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
function defaultOutputPath() {
    return ".sevenlayers/cms-content.json";
}
function parseValueOverride(spec) {
    const [locale, lookupKey, ...valueParts] = spec.split(":");
    if (!locale || !lookupKey || valueParts.length === 0) {
        throw new Error(`Invalid --value '${spec}'. Expected format: <locale>:<lookupKey>:<value>`);
    }
    return (0, content_1.normalizeCmsEntry)({
        locale,
        lookupKey,
        value: valueParts.join(":")
    });
}
async function handleCmsSeed(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const locales = (0, args_1.getOptionStringArray)(parsed, "locale");
    const normalizedLocales = locales.length > 0 ? locales : ["en"];
    const lookupKeys = (0, args_1.getOptionStringArray)(parsed, "field");
    if (lookupKeys.length === 0) {
        throw new Error("cms seed requires at least one --field <lookupKey>.");
    }
    const entries = [];
    for (const locale of normalizedLocales) {
        for (const lookupKey of lookupKeys) {
            entries.push((0, content_1.normalizeCmsEntry)({ locale, lookupKey, value: "" }));
        }
    }
    const overrides = (0, args_1.getOptionStringArray)(parsed, "value").map(parseValueOverride);
    if (overrides.length > 0) {
        const byKey = new Map();
        for (const entry of entries) {
            byKey.set(`${entry.locale}::${entry.lookupKey}`, entry);
        }
        for (const override of overrides) {
            byKey.set(`${override.locale}::${override.lookupKey}`, override);
        }
        entries.splice(0, entries.length, ...Array.from(byKey.values()));
    }
    const outputPath = (0, args_1.getOptionString)(parsed, "out") ?? defaultOutputPath();
    const dryRun = (0, args_1.getOptionBoolean)(parsed, "dry-run") || !(0, args_1.getOptionBoolean)(parsed, "apply");
    const json = (0, args_1.getOptionBoolean)(parsed, "json");
    const document = (0, content_1.buildContentDocument)(entries, "cms seed");
    const parity = (0, content_1.buildParityReport)({ entries: document.entries });
    if (!dryRun) {
        await (0, content_1.writeJsonFile)(outputPath, document);
    }
    if (json) {
        console.log(JSON.stringify({
            success: true,
            action: "seed",
            dryRun,
            output: node_path_1.default.resolve(process.cwd(), outputPath),
            summary: {
                entries: document.entries.length,
                locales: parity.locales.length,
                lookupKeys: parity.lookupKeys.length,
                parityComplete: parity.complete,
                issues: parity.issues.length
            }
        }, null, 2));
        return 0;
    }
    console.log((0, colors_1.colorGreen)("CMS seed plan generated."));
    console.log((0, colors_1.colorGray)(`Entries: ${document.entries.length}`));
    console.log((0, colors_1.colorGray)(`Locales: ${parity.locales.join(", ")}`));
    console.log((0, colors_1.colorGray)(`Lookup keys: ${parity.lookupKeys.join(", ")}`));
    if (dryRun) {
        console.log((0, colors_1.colorGray)("Dry-run: seed file not written."));
    }
    else {
        console.log((0, colors_1.colorGray)(`Wrote: ${node_path_1.default.resolve(process.cwd(), outputPath)}`));
    }
    return 0;
}
//# sourceMappingURL=seed.js.map