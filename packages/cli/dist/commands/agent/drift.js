"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgentDrift = handleAgentDrift;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const runner_1 = require("./runner");
const shared_1 = require("./shared");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers agent drift [options]"));
    console.log("");
    console.log("Options:");
    console.log("  --env <profile>             Target profile (local|staging|prod)");
    console.log("  --org-id <id>               Target organization id");
    console.log("  --app-id <id>               Target application id");
    console.log("  --session-id <id>           Session id (required unless env set)");
    console.log("  --template-id <id>          Template object id (required)");
    console.log("  --template-version-id <id>  Optional immutable template version id");
    console.log("  --target-org-id <id>        Optional org scope (repeatable or comma-separated)");
    console.log("  --token <value>             API token for target guard resolution");
    console.log("  --json                      Output deterministic JSON");
    console.log("  --help                      Show this help");
}
function normalizeIds(values) {
    return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)))
        .sort((left, right) => left.localeCompare(right));
}
function countFlaggedTargets(report, key) {
    if (!report || typeof report !== "object") {
        return 0;
    }
    const targets = report.targets;
    if (!Array.isArray(targets)) {
        return 0;
    }
    let count = 0;
    for (const target of targets) {
        if (target && typeof target === "object" && target[key] === true) {
            count += 1;
        }
    }
    return count;
}
function resolveTargetCount(report) {
    if (!report || typeof report !== "object") {
        return 0;
    }
    const targets = report.targets;
    return Array.isArray(targets) ? targets.length : 0;
}
async function handleAgentDrift(parsed, runner = runner_1.runConvexFunction) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const context = await (0, shared_1.resolveAgentCommandContext)(parsed, { mutating: false });
    const sessionId = (0, shared_1.resolveSessionId)(parsed);
    const templateId = (0, args_1.getOptionString)(parsed, "template-id");
    const templateVersionId = (0, args_1.getOptionString)(parsed, "template-version-id");
    const targetOrganizationIds = normalizeIds((0, args_1.getOptionStringArray)(parsed, "target-org-id"));
    if (!sessionId) {
        throw new Error("agent drift requires --session-id or SEVENLAYERS_SESSION_ID.");
    }
    if (!templateId) {
        throw new Error("agent drift requires --template-id.");
    }
    const result = await runner({
        functionName: "agentOntology:getTemplateCloneDriftReport",
        args: {
            sessionId,
            templateId,
            ...(templateVersionId ? { templateVersionId } : {}),
            ...(targetOrganizationIds.length > 0 ? { targetOrganizationIds } : {})
        },
        execute: true
    });
    const issues = [];
    if (result.parsedJson === null) {
        issues.push("Backend returned empty or non-JSON drift response.");
    }
    const success = issues.length === 0;
    if (context.json) {
        console.log(JSON.stringify({
            success,
            profile: context.profile,
            organizationId: context.organizationId,
            applicationId: context.applicationId,
            templateId,
            templateVersionId: templateVersionId ?? null,
            targetOrganizationIds,
            command: result.command,
            response: result.parsedJson,
            issues
        }, null, 2));
        return success ? 0 : 1;
    }
    if (!success) {
        console.log((0, colors_1.colorOrange)("Agent drift query failed."));
        for (const issue of issues) {
            console.log((0, colors_1.colorGray)(`- ${issue}`));
        }
        return 1;
    }
    const targetCount = resolveTargetCount(result.parsedJson);
    const staleCount = countFlaggedTargets(result.parsedJson, "stale");
    const blockedCount = countFlaggedTargets(result.parsedJson, "blocked");
    console.log((0, colors_1.colorGreen)("Agent drift query completed."));
    console.log((0, colors_1.colorGray)(`Template: ${templateId}`));
    console.log((0, colors_1.colorGray)(`Targets: ${targetCount}`));
    console.log((0, colors_1.colorGray)(`Stale: ${staleCount}`));
    console.log((0, colors_1.colorGray)(`Blocked: ${blockedCount}`));
    return 0;
}
//# sourceMappingURL=drift.js.map