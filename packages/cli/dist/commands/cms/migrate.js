"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCmsMigrate = handleCmsMigrate;
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const content_1 = require("./content");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers cms migrate legacy [options]"));
    console.log("");
    console.log("Options:");
    console.log("  --in <path>                Legacy input file (default: .sevenlayers/cms-legacy.json)");
    console.log("  --out <path>               Migrated output file (default: .sevenlayers/cms-content.json)");
    console.log("  --dry-run                  Preview migration summary without writing");
    console.log("  --apply                    Write migrated file (overrides dry-run)");
    console.log("  --json                     Output deterministic JSON");
    console.log("  --help                     Show this help");
}
function defaultLegacyPath() {
    return ".sevenlayers/cms-legacy.json";
}
function defaultOutputPath() {
    return ".sevenlayers/cms-content.json";
}
async function handleCmsMigrate(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const mode = parsed.positionals[2];
    if (mode !== "legacy") {
        throw new Error("Usage: sevenlayers cms migrate legacy [options]");
    }
    const inputPath = (0, args_1.getOptionString)(parsed, "in") ?? defaultLegacyPath();
    const outputPath = (0, args_1.getOptionString)(parsed, "out") ?? defaultOutputPath();
    const dryRun = (0, args_1.getOptionBoolean)(parsed, "dry-run") || !(0, args_1.getOptionBoolean)(parsed, "apply");
    const json = (0, args_1.getOptionBoolean)(parsed, "json");
    const legacyInput = await (0, content_1.readJsonFile)(inputPath);
    const entries = (0, content_1.parseLegacyCmsInput)(legacyInput);
    const document = (0, content_1.buildContentDocument)(entries, "cms migrate legacy");
    const parity = (0, content_1.buildParityReport)({ entries: document.entries, allowEmptyValues: true });
    if (!dryRun) {
        await (0, content_1.writeJsonFile)(outputPath, document);
    }
    if (json) {
        console.log(JSON.stringify({
            success: true,
            action: "migrate-legacy",
            dryRun,
            input: node_path_1.default.resolve(process.cwd(), inputPath),
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
    console.log((0, colors_1.colorGreen)("CMS legacy migration completed."));
    console.log((0, colors_1.colorGray)(`Input: ${node_path_1.default.resolve(process.cwd(), inputPath)}`));
    console.log((0, colors_1.colorGray)(`Entries: ${document.entries.length}`));
    console.log((0, colors_1.colorGray)(`Locales: ${parity.locales.length}`));
    console.log((0, colors_1.colorGray)(`Lookup keys: ${parity.lookupKeys.length}`));
    if (dryRun) {
        console.log((0, colors_1.colorGray)("Dry-run: migrated file not written."));
    }
    else {
        console.log((0, colors_1.colorGray)(`Wrote: ${node_path_1.default.resolve(process.cwd(), outputPath)}`));
    }
    return 0;
}
//# sourceMappingURL=migrate.js.map