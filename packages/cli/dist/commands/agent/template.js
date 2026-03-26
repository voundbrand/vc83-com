"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgentTemplate = handleAgentTemplate;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const runner_1 = require("./runner");
const shared_1 = require("./shared");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers agent template apply [options]"));
    console.log("");
    console.log("Options:");
    console.log("  --env <profile>             Target profile (local|staging|prod)");
    console.log("  --org-id <id>               Target organization id");
    console.log("  --app-id <id>               Target application id");
    console.log("  --agent-id <id>             Agent object id (required)");
    console.log("  --session-id <id>           Session id for protected mutations");
    console.log("  --patch-file <path>         JSON patch payload (required)");
    console.log("  --confirm-warn-override     Set overridePolicyGate.confirmWarnOverride=true");
    console.log("  --override-reason <text>    Set overridePolicyGate.reason");
    console.log("  --execute                   Apply patch (default: preview only)");
    console.log("  --token <value>             API token for target guard resolution");
    console.log("  --yes --confirm-prod PROD   Required for confirm-gated targets");
    console.log("  --json                      Output deterministic JSON");
    console.log("  --help                      Show this help");
}
async function loadPatchFile(filePath) {
    const absolutePath = node_path_1.default.resolve(process.cwd(), filePath);
    const raw = await promises_1.default.readFile(absolutePath, "utf8");
    return JSON.parse(raw);
}
async function handleAgentTemplate(parsed, runner = runner_1.runConvexFunction) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    if (parsed.positionals[2] !== "apply") {
        throw new Error("Usage: sevenlayers agent template apply [options]");
    }
    const execute = (0, args_1.getOptionBoolean)(parsed, "execute");
    const context = await (0, shared_1.resolveAgentCommandContext)(parsed, { mutating: execute });
    const sessionId = (0, shared_1.resolveSessionId)(parsed);
    const agentId = (0, args_1.getOptionString)(parsed, "agent-id");
    const patchFile = (0, args_1.getOptionString)(parsed, "patch-file");
    if (!sessionId) {
        throw new Error("agent template apply requires --session-id or SEVENLAYERS_SESSION_ID.");
    }
    if (!agentId) {
        throw new Error("agent template apply requires --agent-id.");
    }
    if (!patchFile) {
        throw new Error("agent template apply requires --patch-file <path>.");
    }
    const patch = await loadPatchFile(patchFile);
    const overrideReason = (0, args_1.getOptionString)(parsed, "override-reason");
    const confirmWarnOverride = (0, args_1.getOptionBoolean)(parsed, "confirm-warn-override");
    const overridePolicyGate = overrideReason || confirmWarnOverride
        ? {
            ...(confirmWarnOverride ? { confirmWarnOverride: true } : {}),
            ...(overrideReason ? { reason: overrideReason } : {})
        }
        : undefined;
    const functionName = execute
        ? "agentOntology:applyAgentFieldPatch"
        : "agentOntology:previewAgentFieldPatch";
    const result = await runner({
        functionName,
        args: {
            sessionId,
            agentId,
            patch,
            ...(overridePolicyGate ? { overridePolicyGate } : {})
        },
        execute
    });
    if (context.json) {
        console.log(JSON.stringify({
            success: true,
            executed: result.executed,
            profile: context.profile,
            organizationId: context.organizationId,
            applicationId: context.applicationId,
            command: result.command,
            response: result.parsedJson
        }, null, 2));
        return 0;
    }
    if (!result.executed) {
        console.log((0, colors_1.colorGreen)("Agent template apply dry-run prepared."));
        console.log((0, colors_1.colorGray)(`Run with --execute to apply:`));
        console.log((0, colors_1.colorGray)(`  ${result.command}`));
        return 0;
    }
    console.log((0, colors_1.colorGreen)("Agent template apply completed."));
    if (result.parsedJson) {
        console.log((0, colors_1.colorGray)(`Response: ${JSON.stringify(result.parsedJson)}`));
    }
    return 0;
}
//# sourceMappingURL=template.js.map