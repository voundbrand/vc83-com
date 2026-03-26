"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRemoteCommand = resolveRemoteCommand;
const args_1 = require("../../core/args");
const platform_1 = require("../../api/platform");
const target_guard_1 = require("../../safety/target-guard");
function resolveApiToken(parsed) {
    const explicit = (0, args_1.getOptionString)(parsed, "token") ??
        (0, args_1.getOptionString)(parsed, "api-token") ??
        (0, args_1.getOptionString)(parsed, "api-key");
    if (explicit && explicit.trim().length > 0) {
        return explicit.trim();
    }
    const envTokenCandidates = [
        process.env.SEVENLAYERS_API_TOKEN,
        process.env.L4YERCAK3_API_TOKEN,
        process.env.L4YERCAK3_API_KEY
    ];
    for (const candidate of envTokenCandidates) {
        if (candidate && candidate.trim().length > 0) {
            return candidate.trim();
        }
    }
    return undefined;
}
async function resolveRemoteCommand(parsed, options) {
    const target = await (0, target_guard_1.resolveTargetContext)(parsed, {
        requireOrgApp: options.requireOrgApp,
        mutatingCommand: options.mutatingCommand
    });
    const token = resolveApiToken(parsed);
    if (!token) {
        throw new Error("Missing API token. Provide --token <value> or set SEVENLAYERS_API_TOKEN/L4YERCAK3_API_KEY.");
    }
    return {
        target,
        json: (0, args_1.getOptionBoolean)(parsed, "json"),
        api: (0, platform_1.createPlatformApiClient)({
            backendUrl: target.backendUrl,
            token
        })
    };
}
//# sourceMappingURL=remote.js.map