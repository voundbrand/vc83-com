"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePageSpec = parsePageSpec;
exports.handleAppPages = handleAppPages;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const remote_1 = require("./remote");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers app pages <sync|list> [options]"));
    console.log("");
    console.log("Sync options:");
    console.log("  --page <path:name[:type[:method]]>   Add page declaration (repeatable)");
    console.log("  --pages-file <path>                   JSON file with page declarations");
    console.log("  --dry-run                             Show payload without API write");
    console.log("");
    console.log("List options:");
    console.log("  --status <status>                     Filter registered pages by status");
    console.log("");
    console.log("Shared options:");
    console.log("  --env <profile>                       Target profile (local|staging|prod)");
    console.log("  --org-id <id>                         Target organization id");
    console.log("  --app-id <id>                         Target application id");
    console.log("  --token <value>                       API token (or use env vars)");
    console.log("  --yes --confirm-prod PROD             Required on confirm-gated targets");
    console.log("  --json                                Output deterministic JSON");
    console.log("  --help                                Show this help");
}
function parsePageSpec(spec) {
    const [pagePath, pageName, pageType, detectionMethod] = spec.split(":");
    if (!pagePath || !pageName) {
        throw new Error(`Invalid --page value '${spec}'. Expected format: <path>:<name>[:<pageType>[:<detectionMethod>]]`);
    }
    return {
        path: pagePath.trim(),
        name: pageName.trim(),
        pageType: pageType?.trim() || undefined,
        detectionMethod: detectionMethod?.trim() || undefined
    };
}
async function loadPagesFromFile(filePath) {
    const absolutePath = node_path_1.default.resolve(process.cwd(), filePath);
    const raw = await promises_1.default.readFile(absolutePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
        throw new Error(`Pages file '${filePath}' must contain an array.`);
    }
    return parsed.map((entry) => {
        if (!entry || typeof entry !== "object") {
            throw new Error(`Pages file '${filePath}' contains invalid entries.`);
        }
        const record = entry;
        const pagePath = typeof record.path === "string" ? record.path.trim() : "";
        const pageName = typeof record.name === "string" ? record.name.trim() : "";
        if (!pagePath || !pageName) {
            throw new Error(`Pages file '${filePath}' contains entry missing path or name.`);
        }
        return {
            path: pagePath,
            name: pageName,
            pageType: typeof record.pageType === "string" ? record.pageType.trim() || undefined : undefined,
            detectionMethod: typeof record.detectionMethod === "string" ? record.detectionMethod.trim() || undefined : undefined
        };
    });
}
async function resolvePageInputs(parsed) {
    const inlinePages = (0, args_1.getOptionStringArray)(parsed, "page").map(parsePageSpec);
    const filePath = (0, args_1.getOptionString)(parsed, "pages-file");
    if (!filePath) {
        return inlinePages;
    }
    const filePages = await loadPagesFromFile(filePath);
    return [...filePages, ...inlinePages];
}
async function handlePagesSync(parsed, options) {
    const command = await (0, remote_1.resolveRemoteCommand)(parsed, {
        requireOrgApp: true,
        mutatingCommand: true
    });
    const pages = await resolvePageInputs(parsed);
    if (pages.length === 0) {
        throw new Error("No pages provided. Use --page or --pages-file for app pages sync.");
    }
    const payload = pages.map((page) => ({
        path: page.path,
        name: page.name,
        pageType: page.pageType,
        detectionMethod: page.detectionMethod ?? "cli_manual"
    }));
    const dryRun = (0, args_1.getOptionBoolean)(parsed, "dry-run");
    if (dryRun) {
        if (command.json) {
            console.log(JSON.stringify({
                success: true,
                dryRun: true,
                profile: command.target.profileName,
                organizationId: command.target.orgId,
                applicationId: command.target.appId,
                pages: payload
            }, null, 2));
            return 0;
        }
        if (options.legacySource) {
            console.log((0, colors_1.colorGray)(`Legacy command '${options.legacySource}' mapped to 'sevenlayers app pages sync'.`));
        }
        console.log((0, colors_1.colorOrange)("Dry-run page sync payload"));
        console.log((0, colors_1.colorGray)(`Application: ${command.target.appId}`));
        console.log((0, colors_1.colorGray)(`Page count: ${payload.length}`));
        return 0;
    }
    const result = await command.api.bulkRegisterPages(command.target.appId, payload);
    if (command.json) {
        console.log(JSON.stringify({
            success: true,
            profile: command.target.profileName,
            organizationId: command.target.orgId,
            applicationId: command.target.appId,
            total: result.total,
            created: result.created,
            updated: result.updated
        }, null, 2));
        return 0;
    }
    if (options.legacySource) {
        console.log((0, colors_1.colorGray)(`Legacy command '${options.legacySource}' mapped to 'sevenlayers app pages sync'.`));
    }
    console.log((0, colors_1.colorGreen)("Page sync completed."));
    console.log((0, colors_1.colorGray)(`Application: ${command.target.appId}`));
    console.log((0, colors_1.colorGray)(`Total: ${result.total}`));
    console.log((0, colors_1.colorGray)(`Created: ${result.created}`));
    console.log((0, colors_1.colorGray)(`Updated: ${result.updated}`));
    return 0;
}
async function handlePagesList(parsed, options) {
    const command = await (0, remote_1.resolveRemoteCommand)(parsed, {
        requireOrgApp: true,
        mutatingCommand: false
    });
    const status = (0, args_1.getOptionString)(parsed, "status");
    const result = await command.api.getApplicationPages(command.target.appId, status);
    if (command.json) {
        console.log(JSON.stringify({
            success: true,
            profile: command.target.profileName,
            organizationId: command.target.orgId,
            applicationId: command.target.appId,
            total: result.total,
            pages: result.pages
        }, null, 2));
        return 0;
    }
    if (options.legacySource) {
        console.log((0, colors_1.colorGray)(`Legacy command '${options.legacySource}' mapped to 'sevenlayers app pages list'.`));
    }
    console.log((0, colors_1.colorGreen)(`Registered pages: ${result.total}`));
    for (const page of result.pages) {
        const type = page.pageType ?? "unknown";
        console.log((0, colors_1.colorGray)(`  ${page.path} -> ${page.name} (${type})`));
    }
    return 0;
}
async function handleAppPages(parsed, options = {}) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const subcommand = parsed.positionals[2] ?? options.defaultSubcommand ?? "sync";
    if (subcommand === "sync") {
        return handlePagesSync(parsed, options);
    }
    if (subcommand === "list") {
        return handlePagesList(parsed, options);
    }
    throw new Error(`Unknown app pages subcommand '${subcommand}'. Expected 'sync' or 'list'.`);
}
//# sourceMappingURL=pages.js.map