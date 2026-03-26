"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAppRegister = handleAppRegister;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_path_1 = __importDefault(require("node:path"));
const package_json_1 = __importDefault(require("../../../package.json"));
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const remote_1 = require("./remote");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers app register [options]"));
    console.log("");
    console.log("Options:");
    console.log("  --env <profile>             Target profile (local|staging|prod)");
    console.log("  --org-id <id>               Target organization id (required)");
    console.log("  --name <name>               Application name (default: current folder)");
    console.log("  --description <text>        Application description");
    console.log("  --framework <name>          Framework marker (default: unknown)");
    console.log("  --router-type <type>        Router type marker (app/pages/etc.)");
    console.log("  --typescript                Mark project as TypeScript");
    console.log("  --project-path-hash <hash>  Optional stable project hash override");
    console.log("  --feature <name>            Repeated or comma-separated feature flags");
    console.log("  --has-frontend-database     Mark app as frontend-db connected");
    console.log("  --frontend-db-type <type>   Frontend DB type marker");
    console.log("  --token <value>             API token (or use env vars)");
    console.log("  --yes --confirm-prod PROD   Required on confirm-gated targets");
    console.log("  --json                      Output deterministic JSON");
    console.log("  --help                      Show this help");
}
function hashProjectPath(projectPath) {
    return node_crypto_1.default.createHash("sha256").update(projectPath).digest("hex");
}
async function handleAppRegister(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const command = await (0, remote_1.resolveRemoteCommand)(parsed, {
        requireOrgApp: false,
        mutatingCommand: true
    });
    if (!command.target.orgId) {
        throw new Error("app register requires an organization target. Provide --org-id or set defaultOrgId on the active profile.");
    }
    const projectPath = node_path_1.default.resolve(process.cwd());
    const appName = (0, args_1.getOptionString)(parsed, "name") ?? node_path_1.default.basename(projectPath);
    const sourceHash = (0, args_1.getOptionString)(parsed, "project-path-hash") ?? hashProjectPath(projectPath);
    const features = (0, args_1.getOptionStringArray)(parsed, "feature");
    const payload = {
        organizationId: command.target.orgId,
        name: appName,
        description: (0, args_1.getOptionString)(parsed, "description"),
        source: {
            type: "cli",
            projectPathHash: sourceHash,
            cliVersion: package_json_1.default.version,
            framework: (0, args_1.getOptionString)(parsed, "framework") ?? "unknown",
            routerType: (0, args_1.getOptionString)(parsed, "router-type"),
            hasTypeScript: (0, args_1.getOptionBoolean)(parsed, "typescript")
        },
        connection: {
            features,
            hasFrontendDatabase: (0, args_1.hasOption)(parsed, "has-frontend-database")
                ? (0, args_1.getOptionBoolean)(parsed, "has-frontend-database")
                : undefined,
            frontendDatabaseType: (0, args_1.getOptionString)(parsed, "frontend-db-type")
        }
    };
    const result = await command.api.registerApplication(payload);
    if (command.json) {
        console.log(JSON.stringify({
            success: result.success,
            profile: command.target.profileName,
            organizationId: command.target.orgId,
            applicationId: result.applicationId,
            existingApplication: result.existingApplication,
            backendUrl: result.backendUrl ?? command.target.backendUrl,
            apiKeyPrefix: result.apiKey?.prefix ?? null
        }, null, 2));
        return 0;
    }
    console.log((0, colors_1.colorGreen)("Application registration completed."));
    console.log((0, colors_1.colorGray)(`Profile: ${command.target.profileName}`));
    console.log((0, colors_1.colorGray)(`Organization: ${command.target.orgId}`));
    console.log((0, colors_1.colorGray)(`Application: ${result.applicationId}`));
    console.log((0, colors_1.colorGray)(`Existing registration: ${result.existingApplication ? "yes" : "no"}`));
    if (result.apiKey?.prefix) {
        console.log((0, colors_1.colorGray)(`API key: ${result.apiKey.prefix}`));
    }
    console.log("");
    console.log((0, colors_1.colorOrange)("Next step:"));
    console.log((0, colors_1.colorGray)(`  sevenlayers app link --app-id ${result.applicationId}`));
    return 0;
}
//# sourceMappingURL=register.js.map