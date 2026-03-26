"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCmsDoctor = handleCmsDoctor;
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const content_1 = require("./content");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers cms doctor [options]"));
    console.log("");
    console.log("Options:");
    console.log("  --in <path>                  Content file (default: .sevenlayers/cms-content.json)");
    console.log("  --require-locale <code>      Required locale (repeatable)");
    console.log("  --require-field <lookupKey>  Required lookup key (repeatable)");
    console.log("  --allow-empty-values         Do not flag empty values as issues");
    console.log("  --json                       Output deterministic JSON");
    console.log("  --help                       Show this help");
}
function defaultInputPath() {
    return ".sevenlayers/cms-content.json";
}
async function handleCmsDoctor(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const inputPath = (0, args_1.getOptionString)(parsed, "in") ?? defaultInputPath();
    const json = (0, args_1.getOptionBoolean)(parsed, "json");
    const requiredLocales = (0, args_1.getOptionStringArray)(parsed, "require-locale");
    const requiredLookupKeys = (0, args_1.getOptionStringArray)(parsed, "require-field");
    const input = await (0, content_1.readJsonFile)(inputPath);
    const document = (0, content_1.parseContentDocument)(input);
    const report = (0, content_1.buildParityReport)({
        entries: document.entries,
        requiredLocales,
        requiredLookupKeys,
        allowEmptyValues: (0, args_1.getOptionBoolean)(parsed, "allow-empty-values")
    });
    if (json) {
        console.log(JSON.stringify({
            success: report.complete,
            input: node_path_1.default.resolve(process.cwd(), inputPath),
            summary: {
                locales: report.locales.length,
                lookupKeys: report.lookupKeys.length,
                issues: report.issues.length
            },
            issues: report.issues
        }, null, 2));
        return report.complete ? 0 : 1;
    }
    console.log((0, colors_1.colorOrange)("CMS doctor report"));
    console.log((0, colors_1.colorGray)(`Input: ${node_path_1.default.resolve(process.cwd(), inputPath)}`));
    console.log((0, colors_1.colorGray)(`Locales: ${report.locales.join(", ") || "<none>"}`));
    console.log((0, colors_1.colorGray)(`Lookup keys: ${report.lookupKeys.join(", ") || "<none>"}`));
    console.log((0, colors_1.colorGray)(`Issues: ${report.issues.length}`));
    if (report.complete) {
        console.log((0, colors_1.colorGreen)("Locale/field parity checks passed."));
        return 0;
    }
    for (const issue of report.issues) {
        console.log((0, colors_1.colorRed)(`- ${issue.message}`));
    }
    return 1;
}
//# sourceMappingURL=doctor.js.map