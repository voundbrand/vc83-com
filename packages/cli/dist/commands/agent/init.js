"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgentInit = handleAgentInit;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const runner_1 = require("./runner");
const shared_1 = require("./shared");
function printUsage() {
    console.log((0, colors_1.colorOrange)("Usage: sevenlayers agent init [options]"));
    console.log("");
    console.log("Options:");
    console.log("  --env <profile>             Target profile (local|staging|prod)");
    console.log("  --org-id <id>               Target organization id");
    console.log("  --app-id <id>               Target application id");
    console.log("  --name <name>               Agent name (required)");
    console.log("  --subtype <type>            Agent subtype (default: general)");
    console.log("  --industry <text>           Bootstrap industry hint");
    console.log("  --target-audience <text>    Bootstrap audience hint");
    console.log("  --tone <text>               Bootstrap tone preference");
    console.log("  --context <text>            Additional bootstrap context");
    console.log("  --execute                   Execute bootstrap (default: dry-run)");
    console.log("  --token <value>             API token for target guard resolution");
    console.log("  --yes --confirm-prod PROD   Required for confirm-gated targets");
    console.log("  --json                      Output deterministic JSON");
    console.log("  --help                      Show this help");
}
async function handleAgentInit(parsed, runner = runner_1.runConvexFunction) {
    if ((0, args_1.getOptionBoolean)(parsed, "help")) {
        printUsage();
        return 0;
    }
    const execute = (0, args_1.getOptionBoolean)(parsed, "execute");
    const context = await (0, shared_1.resolveAgentCommandContext)(parsed, { mutating: execute });
    const name = (0, args_1.getOptionString)(parsed, "name");
    if (!name) {
        throw new Error("agent init requires --name <agent-name>.");
    }
    const result = await runner({
        functionName: "ai/soulGenerator:bootstrapAgent",
        args: {
            organizationId: context.organizationId,
            name,
            subtype: (0, args_1.getOptionString)(parsed, "subtype") ?? "general",
            industry: (0, args_1.getOptionString)(parsed, "industry"),
            targetAudience: (0, args_1.getOptionString)(parsed, "target-audience"),
            tonePreference: (0, args_1.getOptionString)(parsed, "tone"),
            additionalContext: (0, args_1.getOptionString)(parsed, "context")
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
        console.log((0, colors_1.colorGreen)("Agent init dry-run prepared."));
        console.log((0, colors_1.colorGray)(`Run with --execute to apply:`));
        console.log((0, colors_1.colorGray)(`  ${result.command}`));
        return 0;
    }
    console.log((0, colors_1.colorGreen)("Agent init completed."));
    if (result.parsedJson) {
        console.log((0, colors_1.colorGray)(`Response: ${JSON.stringify(result.parsedJson)}`));
    }
    return 0;
}
//# sourceMappingURL=init.js.map