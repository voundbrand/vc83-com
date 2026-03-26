"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDoctorTarget = handleDoctorTarget;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const target_guard_1 = require("../../safety/target-guard");
async function handleDoctorTarget(parsed) {
    const context = await (0, target_guard_1.resolveTargetContext)(parsed, {
        requireOrgApp: false,
        mutatingCommand: false
    });
    const issues = [];
    if (!context.orgId) {
        issues.push("org-id is not resolved");
    }
    if (!context.appId) {
        issues.push("app-id is not resolved");
    }
    if ((0, args_1.getOptionBoolean)(parsed, "json")) {
        console.log(JSON.stringify({
            profile: context.profileName,
            backendUrl: context.backendUrl,
            orgId: context.orgId ?? null,
            appId: context.appId ?? null,
            requiresConfirmation: context.profile.requiresConfirmation,
            status: issues.length === 0 ? "ok" : "incomplete",
            issues
        }, null, 2));
        return issues.length === 0 ? 0 : 1;
    }
    console.log((0, colors_1.colorOrange)("Target resolution"));
    console.log((0, colors_1.colorGray)(`  profile: ${context.profileName}`));
    console.log((0, colors_1.colorGray)(`  backendUrl: ${context.backendUrl}`));
    console.log((0, colors_1.colorGray)(`  orgId: ${context.orgId ?? "<unset>"}`));
    console.log((0, colors_1.colorGray)(`  appId: ${context.appId ?? "<unset>"}`));
    console.log((0, colors_1.colorGray)(`  requires confirmation: ${context.profile.requiresConfirmation ? "yes" : "no"}`));
    if (issues.length === 0) {
        console.log((0, colors_1.colorGreen)("Target context is complete."));
        return 0;
    }
    for (const issue of issues) {
        console.log((0, colors_1.colorGray)(`  issue: ${issue}`));
    }
    return 1;
}
//# sourceMappingURL=target.js.map