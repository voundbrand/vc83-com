"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAgentCommandContext = resolveAgentCommandContext;
exports.resolveSessionId = resolveSessionId;
const args_1 = require("../../core/args");
const target_guard_1 = require("../../safety/target-guard");
async function resolveAgentCommandContext(parsed, options) {
    const target = await (0, target_guard_1.resolveTargetContext)(parsed, {
        requireOrgApp: true,
        mutatingCommand: options.mutating
    });
    return {
        profile: target.profileName,
        organizationId: target.orgId ?? "",
        applicationId: target.appId ?? "",
        backendUrl: target.backendUrl,
        json: (0, args_1.getOptionBoolean)(parsed, "json")
    };
}
function resolveSessionId(parsed) {
    const fromFlag = (0, args_1.getOptionString)(parsed, "session-id");
    if (fromFlag && fromFlag.trim().length > 0) {
        return fromFlag.trim();
    }
    const fromEnv = process.env.SEVENLAYERS_SESSION_ID ?? process.env.L4YERCAK3_SESSION_ID;
    if (fromEnv && fromEnv.trim().length > 0) {
        return fromEnv.trim();
    }
    return undefined;
}
//# sourceMappingURL=shared.js.map