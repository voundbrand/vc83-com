"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgentPermissions = handleAgentPermissions;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const runner_1 = require("./runner");
const shared_1 = require("./shared");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers agent permissions check [options]"));
    console.log("");
    console.log("Options:");
    console.log("  --env <profile>             Target profile (local|staging|prod)");
    console.log("  --org-id <id>               Target organization id");
    console.log("  --app-id <id>               Target application id");
    console.log("  --agent-id <id>             Agent object id (required)");
    console.log("  --session-id <id>           Session id (required unless env set)");
    console.log("  --dry-run                   Skip backend permission probe");
    console.log("  --token <value>             API token for target guard resolution");
    console.log("  --json                      Output deterministic JSON");
    console.log("  --help                      Show this help");
}
async function handleAgentPermissions(parsed, runner = runner_1.runConvexFunction) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    if (parsed.positionals[2] !== "check") {
        throw new Error("Usage: sevenlayers agent permissions check [options]");
    }
    const context = await (0, shared_1.resolveAgentCommandContext)(parsed, { mutating: false });
    const sessionId = (0, shared_1.resolveSessionId)(parsed);
    const agentId = (0, args_1.getOptionString)(parsed, "agent-id");
    const dryRun = (0, args_1.getOptionBoolean)(parsed, "dry-run");
    const issues = [];
    if (!sessionId) {
        issues.push("Missing session id. Provide --session-id or SEVENLAYERS_SESSION_ID.");
    }
    if (!agentId) {
        issues.push("Missing --agent-id.");
    }
    let response = null;
    let commandText = null;
    if (!dryRun && issues.length === 0) {
        const result = await runner({
            functionName: "agentOntology:getAgent",
            args: {
                sessionId,
                agentId
            },
            execute: true
        });
        commandText = result.command;
        response = result.parsedJson;
        if (result.parsedJson === null) {
            issues.push("Backend returned empty response for agent permission probe.");
        }
        else if (typeof result.parsedJson === "object" && result.parsedJson !== null) {
            const record = result.parsedJson;
            if (record.organizationId && String(record.organizationId) !== context.organizationId) {
                issues.push("Resolved agent organization does not match targeted org-id.");
            }
        }
    }
    const success = issues.length === 0;
    if (context.json) {
        console.log(JSON.stringify({
            success,
            dryRun,
            profile: context.profile,
            organizationId: context.organizationId,
            applicationId: context.applicationId,
            command: commandText,
            response,
            issues
        }, null, 2));
        return success ? 0 : 1;
    }
    if (success) {
        console.log((0, colors_1.colorGreen)("Agent permission checks passed."));
        return 0;
    }
    console.log((0, colors_1.colorOrange)("Agent permission checks failed."));
    for (const issue of issues) {
        console.log((0, colors_1.colorGray)(`- ${issue}`));
    }
    return 1;
}
//# sourceMappingURL=permissions.js.map