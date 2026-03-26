"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAppSync = handleAppSync;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const remote_1 = require("./remote");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers app sync [options]"));
    console.log("");
    console.log("Options:");
    console.log("  --env <profile>             Target profile (local|staging|prod)");
    console.log("  --org-id <id>               Target organization id");
    console.log("  --app-id <id>               Target application id");
    console.log("  --direction <mode>          push|pull|bidirectional (default: bidirectional)");
    console.log("  --model <name>              Restrict sync to model names (repeatable)");
    console.log("  --dry-run                   Request dry-run sync instructions");
    console.log("  --result-status <status>    Record sync result status");
    console.log("  --records-processed <n>     Record processed count");
    console.log("  --records-created <n>       Record created count");
    console.log("  --records-updated <n>       Record updated count");
    console.log("  --result-errors <n>         Record error count");
    console.log("  --token <value>             API token (or use env vars)");
    console.log("  --yes --confirm-prod PROD   Required on confirm-gated targets");
    console.log("  --json                      Output deterministic JSON");
    console.log("  --help                      Show this help");
}
function parseOptionalNumber(rawValue) {
    if (rawValue === undefined) {
        return undefined;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Expected numeric value, received '${rawValue}'.`);
    }
    return parsed;
}
function buildResultsPayload(parsed) {
    const status = (0, args_1.getOptionString)(parsed, "result-status");
    const recordsProcessed = parseOptionalNumber((0, args_1.getOptionString)(parsed, "records-processed"));
    const recordsCreated = parseOptionalNumber((0, args_1.getOptionString)(parsed, "records-created"));
    const recordsUpdated = parseOptionalNumber((0, args_1.getOptionString)(parsed, "records-updated"));
    const errors = parseOptionalNumber((0, args_1.getOptionString)(parsed, "result-errors"));
    if (status === undefined &&
        recordsProcessed === undefined &&
        recordsCreated === undefined &&
        recordsUpdated === undefined &&
        errors === undefined) {
        return undefined;
    }
    return {
        direction: (0, args_1.getOptionString)(parsed, "direction"),
        status,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        errors
    };
}
async function handleAppSync(parsed, options = {}) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const command = await (0, remote_1.resolveRemoteCommand)(parsed, {
        requireOrgApp: true,
        mutatingCommand: true
    });
    const direction = (0, args_1.getOptionString)(parsed, "direction") ?? "bidirectional";
    const models = (0, args_1.getOptionStringArray)(parsed, "model");
    const dryRun = (0, args_1.getOptionBoolean)(parsed, "dry-run");
    const results = buildResultsPayload(parsed);
    const response = await command.api.syncApplication(command.target.appId, {
        direction,
        models: models.length > 0 ? models : undefined,
        dryRun,
        results
    });
    if (command.json) {
        console.log(JSON.stringify({
            success: true,
            profile: command.target.profileName,
            organizationId: command.target.orgId,
            applicationId: command.target.appId,
            direction,
            models,
            dryRun,
            response
        }, null, 2));
        return 0;
    }
    if (options.legacySource) {
        console.log((0, colors_1.colorGray)(`Legacy command '${options.legacySource}' mapped to 'sevenlayers app sync'.`));
    }
    console.log((0, colors_1.colorGreen)("Application sync request completed."));
    console.log((0, colors_1.colorGray)(`Profile: ${command.target.profileName}`));
    console.log((0, colors_1.colorGray)(`Organization: ${command.target.orgId}`));
    console.log((0, colors_1.colorGray)(`Application: ${command.target.appId}`));
    if (dryRun) {
        console.log((0, colors_1.colorGray)("Dry-run: yes"));
    }
    console.log((0, colors_1.colorGray)(`Direction: ${direction}`));
    if (models.length > 0) {
        console.log((0, colors_1.colorGray)(`Models: ${models.join(", ")}`));
    }
    return 0;
}
//# sourceMappingURL=sync.js.map