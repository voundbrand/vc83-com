"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCmsRegistry = handleCmsRegistry;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const shared_1 = require("./shared");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers cms registry <pull|push> [options]"));
    console.log("");
    console.log("Shared options:");
    console.log("  --env <profile>             Target profile (local|staging|prod)");
    console.log("  --org-id <id>               Target organization id");
    console.log("  --app-id <id>               Target application id");
    console.log("  --registry-id <id>          Override CMS registry id");
    console.log("  --token <value>             API token (or use env vars)");
    console.log("  --yes --confirm-prod PROD   Required on confirm-gated targets for push");
    console.log("  --json                      Output deterministic JSON");
    console.log("  --help                      Show this help");
    console.log("");
    console.log("Pull options:");
    console.log("  --out <path>                Output file (default: .sevenlayers/cms-registry.json)");
    console.log("  --dry-run                   Print document without writing");
    console.log("");
    console.log("Push options:");
    console.log("  --in <path>                 Input file (default: .sevenlayers/cms-registry.json)");
    console.log("  --dry-run                   Preview feature update without writing");
}
function defaultRegistryPath() {
    return node_path_1.default.resolve(process.cwd(), ".sevenlayers/cms-registry.json");
}
async function loadRegistryFile(filePath) {
    const absolutePath = node_path_1.default.resolve(process.cwd(), filePath);
    const raw = await promises_1.default.readFile(absolutePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== "sevenlayers.cms.registry.v1") {
        throw new Error(`Unsupported registry file schema in '${filePath}'.`);
    }
    const registryId = typeof parsed.registryId === "string" && parsed.registryId.trim().length > 0
        ? parsed.registryId
        : null;
    if (!registryId) {
        throw new Error(`Registry file '${filePath}' is missing registryId.`);
    }
    return {
        schemaVersion: "sevenlayers.cms.registry.v1",
        fetchedAt: typeof parsed.fetchedAt === "string" ? parsed.fetchedAt : new Date().toISOString(),
        profile: typeof parsed.profile === "string" ? parsed.profile : "unknown",
        organizationId: typeof parsed.organizationId === "string" ? parsed.organizationId : "",
        applicationId: typeof parsed.applicationId === "string" ? parsed.applicationId : "",
        applicationName: typeof parsed.applicationName === "string" ? parsed.applicationName : "",
        registryId,
        source: parsed.source === "feature" || parsed.source === "override" || parsed.source === "inferred"
            ? parsed.source
            : "inferred"
    };
}
async function handleRegistryPull(parsed) {
    const command = await (0, shared_1.resolveCmsCommandContext)(parsed, { mutating: false });
    const application = await command.api.getApplication(command.applicationId);
    const registry = (0, shared_1.resolveCmsRegistrySelection)(parsed, application.application);
    const document = {
        schemaVersion: "sevenlayers.cms.registry.v1",
        fetchedAt: new Date().toISOString(),
        profile: command.profile,
        organizationId: command.organizationId,
        applicationId: command.applicationId,
        applicationName: application.application.name,
        registryId: registry.registryId,
        source: registry.source
    };
    const outputPath = (0, args_1.getOptionString)(parsed, "out") ?? defaultRegistryPath();
    const dryRun = (0, args_1.getOptionBoolean)(parsed, "dry-run");
    if (!dryRun) {
        const absolutePath = node_path_1.default.resolve(process.cwd(), outputPath);
        await promises_1.default.mkdir(node_path_1.default.dirname(absolutePath), { recursive: true });
        await promises_1.default.writeFile(absolutePath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
    }
    if (command.json) {
        console.log(JSON.stringify({
            success: true,
            action: "pull",
            dryRun,
            file: node_path_1.default.resolve(process.cwd(), outputPath),
            document
        }, null, 2));
        return 0;
    }
    console.log((0, colors_1.colorGreen)("CMS registry pull completed."));
    console.log((0, colors_1.colorGray)(`Application: ${command.applicationId}`));
    console.log((0, colors_1.colorGray)(`Registry: ${document.registryId}`));
    console.log((0, colors_1.colorGray)(`Source: ${document.source}`));
    if (dryRun) {
        console.log((0, colors_1.colorGray)("Dry-run: no file written."));
    }
    else {
        console.log((0, colors_1.colorGray)(`Wrote: ${node_path_1.default.resolve(process.cwd(), outputPath)}`));
    }
    return 0;
}
async function handleRegistryPush(parsed) {
    const command = await (0, shared_1.resolveCmsCommandContext)(parsed, { mutating: true });
    const application = await command.api.getApplication(command.applicationId);
    const inputPath = (0, args_1.getOptionString)(parsed, "in") ?? defaultRegistryPath();
    const fileDocument = await loadRegistryFile(inputPath);
    const selected = (0, shared_1.resolveCmsRegistrySelection)(parsed, application.application);
    const registryId = selected.source === "override" ? selected.registryId : fileDocument.registryId;
    const currentFeatures = application.application.connection
        ?.features;
    const nextFeatures = (0, shared_1.mergeCmsRegistryFeature)(currentFeatures, registryId);
    const dryRun = (0, args_1.getOptionBoolean)(parsed, "dry-run");
    if (!dryRun) {
        await command.api.updateApplication(command.applicationId, {
            connection: {
                features: nextFeatures
            }
        });
    }
    if (command.json) {
        console.log(JSON.stringify({
            success: true,
            action: "push",
            dryRun,
            profile: command.profile,
            organizationId: command.organizationId,
            applicationId: command.applicationId,
            registryId,
            features: nextFeatures
        }, null, 2));
        return 0;
    }
    console.log((0, colors_1.colorGreen)("CMS registry push completed."));
    console.log((0, colors_1.colorGray)(`Application: ${command.applicationId}`));
    console.log((0, colors_1.colorGray)(`Registry: ${registryId}`));
    if (dryRun) {
        console.log((0, colors_1.colorGray)("Dry-run: no backend update applied."));
    }
    else {
        console.log((0, colors_1.colorGray)("Connected application feature metadata updated."));
    }
    return 0;
}
async function handleCmsRegistry(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const subcommand = parsed.positionals[2];
    if (subcommand === "pull") {
        return handleRegistryPull(parsed);
    }
    if (subcommand === "push") {
        return handleRegistryPush(parsed);
    }
    throw new Error("Usage: sevenlayers cms registry <pull|push> [options]");
}
//# sourceMappingURL=registry.js.map