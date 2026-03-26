"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgentCatalog = handleAgentCatalog;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const runner_1 = require("./runner");
const shared_1 = require("./shared");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers agent catalog [rollout|lifecycle|telemetry] [options]"));
    console.log("");
    console.log("Options:");
    console.log("  --env <profile>             Target profile (local|staging|prod)");
    console.log("  --org-id <id>               Target organization id");
    console.log("  --app-id <id>               Target application id");
    console.log("  --session-id <id>           Session id (required unless env set)");
    console.log("  --template-id <id>          Optional template id filter (telemetry mode)");
    console.log("  --limit <number>            Optional row limit (telemetry mode)");
    console.log("  --refresh-nonce <number>    Optional cache-busting nonce");
    console.log("  --token <value>             API token for target guard resolution");
    console.log("  --json                      Output deterministic JSON");
    console.log("  --help                      Show this help");
}
function parseOptionalInteger(parsed, key, label) {
    const raw = (0, args_1.getOptionString)(parsed, key);
    if (!raw) {
        return undefined;
    }
    const parsedValue = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsedValue) || String(parsedValue) !== raw.trim()) {
        throw new Error(`Invalid ${label}: '${raw}'. Expected an integer.`);
    }
    return parsedValue;
}
function resolveCatalogMode(parsed) {
    const mode = parsed.positionals[2];
    if (!mode || mode === "rollout") {
        return "rollout";
    }
    if (mode === "lifecycle") {
        return "lifecycle";
    }
    if (mode === "telemetry") {
        return "telemetry";
    }
    throw new Error("Usage: sevenlayers agent catalog [rollout|lifecycle|telemetry] [options]");
}
function countTemplates(response) {
    if (!response || typeof response !== "object") {
        return 0;
    }
    const templates = response.templates;
    return Array.isArray(templates) ? templates.length : 0;
}
function countRows(response) {
    if (!response || typeof response !== "object") {
        return 0;
    }
    const rows = response.rows;
    return Array.isArray(rows) ? rows.length : 0;
}
async function handleAgentCatalog(parsed, runner = runner_1.runConvexFunction) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const context = await (0, shared_1.resolveAgentCommandContext)(parsed, { mutating: false });
    const sessionId = (0, shared_1.resolveSessionId)(parsed);
    if (!sessionId) {
        throw new Error("agent catalog requires --session-id or SEVENLAYERS_SESSION_ID.");
    }
    const mode = resolveCatalogMode(parsed);
    const refreshNonce = parseOptionalInteger(parsed, "refresh-nonce", "--refresh-nonce");
    const limit = parseOptionalInteger(parsed, "limit", "--limit");
    const templateId = (0, args_1.getOptionString)(parsed, "template-id");
    let functionName;
    let args = {
        sessionId
    };
    if (mode === "rollout") {
        functionName = "agentOntology:listTemplateRolloutOptions";
        if (refreshNonce !== undefined) {
            args = { ...args, refreshNonce };
        }
    }
    else if (mode === "lifecycle") {
        functionName = "agentOntology:listTemplateLifecycleOptions";
        if (refreshNonce !== undefined) {
            args = { ...args, refreshNonce };
        }
    }
    else {
        functionName = "agentOntology:listTemplateDistributionTelemetry";
        if (templateId) {
            args = { ...args, templateId };
        }
        if (limit !== undefined) {
            args = { ...args, limit };
        }
        if (refreshNonce !== undefined) {
            args = { ...args, refreshNonce };
        }
    }
    const result = await runner({
        functionName,
        args,
        execute: true
    });
    const issues = [];
    if (result.parsedJson === null) {
        issues.push("Backend returned empty or non-JSON catalog response.");
    }
    const success = issues.length === 0;
    if (context.json) {
        console.log(JSON.stringify({
            success,
            mode,
            profile: context.profile,
            organizationId: context.organizationId,
            applicationId: context.applicationId,
            command: result.command,
            response: result.parsedJson,
            issues
        }, null, 2));
        return success ? 0 : 1;
    }
    if (!success) {
        console.log((0, colors_1.colorOrange)("Agent catalog query failed."));
        for (const issue of issues) {
            console.log((0, colors_1.colorGray)(`- ${issue}`));
        }
        return 1;
    }
    console.log((0, colors_1.colorGreen)(`Agent catalog '${mode}' query completed.`));
    if (mode === "telemetry") {
        console.log((0, colors_1.colorGray)(`Rows: ${countRows(result.parsedJson)}`));
    }
    else {
        console.log((0, colors_1.colorGray)(`Templates: ${countTemplates(result.parsedJson)}`));
    }
    return 0;
}
//# sourceMappingURL=catalog.js.map