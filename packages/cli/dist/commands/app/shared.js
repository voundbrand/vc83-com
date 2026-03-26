"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAppEnvUpdateCommand = runAppEnvUpdateCommand;
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../../core/args");
const env_diff_1 = require("../../config/env-diff");
const env_writer_1 = require("../../config/env-writer");
const colors_1 = require("../../core/colors");
const target_guard_1 = require("../../safety/target-guard");
function resolveManagedUpdates(parsed, target) {
    const apiKey = (0, args_1.getOptionString)(parsed, "api-key") ?? process.env.L4YERCAK3_API_KEY;
    const backendUrl = target.backendUrl;
    const organizationId = target.orgId;
    const appId = target.appId;
    const updates = [];
    if (apiKey) {
        updates.push({ key: "L4YERCAK3_API_KEY", value: apiKey });
    }
    if (backendUrl) {
        updates.push({ key: "L4YERCAK3_BACKEND_URL", value: backendUrl });
        updates.push({ key: "NEXT_PUBLIC_L4YERCAK3_BACKEND_URL", value: backendUrl });
    }
    if (organizationId) {
        updates.push({ key: "L4YERCAK3_ORG_ID", value: organizationId });
        updates.push({ key: "L4YERCAK3_ORGANIZATION_ID", value: organizationId });
    }
    if (appId) {
        updates.push({ key: "L4YERCAK3_APP_ID", value: appId });
    }
    return updates;
}
function resolveWriteMode(parsed) {
    if ((0, args_1.getOptionBoolean)(parsed, "full-rewrite")) {
        return "full-rewrite";
    }
    if ((0, args_1.getOptionBoolean)(parsed, "replace-existing")) {
        return "replace-key";
    }
    return "upsert";
}
function printCommandUsage(commandName) {
    console.log((0, colors_1.colorOrange)(`Usage: sevenlayers ${commandName} [options]`));
    console.log("");
    console.log("Options:");
    console.log("  --env <profile>             Target profile (local|staging|prod)");
    console.log("  --env-file <path>           Env file path (default: .env.local)");
    console.log("  --api-key <value>           Set L4YERCAK3_API_KEY");
    console.log("  --backend-url <url>         Override profile backend URL for this command");
    console.log("  --org-id <id>               Target organization id");
    console.log("  --app-id <id>               Target app id");
    console.log("  --allow-profile-override    Allow profile/default mismatch overrides");
    console.log("  --yes --confirm-prod PROD   Required for mutating commands on confirm-gated profile");
    console.log("  --dry-run                   Print changes without writing file");
    console.log("  --replace-existing          Replace managed keys that already exist");
    console.log("  --full-rewrite              Rewrite file using managed keys only (guarded)");
    console.log("  --allow-full-rewrite        Required with --full-rewrite");
    console.log("  --backup-path <path>        Custom backup path for writes");
    console.log("  --help                      Show this help");
    console.log("");
    console.log("Default mode is non-destructive upsert. Unknown keys are preserved.");
}
async function runAppEnvUpdateCommand(params) {
    const { parsed, commandName, legacySource } = params;
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printCommandUsage(commandName);
        return 0;
    }
    const target = await (0, target_guard_1.resolveTargetContext)(parsed, {
        requireOrgApp: true,
        mutatingCommand: true
    });
    const updates = resolveManagedUpdates(parsed, target);
    if (updates.length === 0) {
        console.error((0, colors_1.colorRed)("No managed values resolved. Provide --api-key/--backend-url/--org-id/--app-id or set matching env vars."));
        return 1;
    }
    const envFileArg = (0, args_1.getOptionString)(parsed, "env-file") ?? ".env.local";
    const envFile = node_path_1.default.resolve(process.cwd(), envFileArg);
    const mode = resolveWriteMode(parsed);
    if (legacySource) {
        console.log((0, colors_1.colorGray)(`Legacy command '${legacySource}' mapped to 'sevenlayers ${commandName}'.`));
    }
    console.log((0, colors_1.colorGray)(`Resolved profile: ${target.profileName}`));
    console.log((0, colors_1.colorGray)(`Resolved org/app: ${target.orgId}/${target.appId}`));
    console.log("");
    const result = await (0, env_writer_1.writeEnvFile)(envFile, updates, {
        mode,
        dryRun: (0, args_1.getOptionBoolean)(parsed, "dry-run"),
        backupPath: (0, args_1.getOptionString)(parsed, "backup-path"),
        allowFullRewrite: (0, args_1.getOptionBoolean)(parsed, "allow-full-rewrite")
    });
    console.log((0, colors_1.colorOrange)(`Target file: ${result.filePath}`));
    console.log((0, colors_1.colorOrange)(`Mode: ${result.mode}`));
    console.log("");
    console.log((0, env_diff_1.formatEnvChanges)(result.changes));
    if (!result.applied) {
        console.log("");
        console.log((0, colors_1.colorGray)("No write performed (dry-run or no mutable changes)."));
        return 0;
    }
    console.log("");
    console.log((0, colors_1.colorGreen)("Environment update applied successfully."));
    if (result.backupPath) {
        console.log((0, colors_1.colorGray)(`Backup: ${result.backupPath}`));
    }
    return 0;
}
//# sourceMappingURL=shared.js.map