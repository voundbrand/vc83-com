"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTargetContext = resolveTargetContext;
const args_1 = require("../core/args");
const profile_store_1 = require("../config/profile-store");
function assertNoMismatch(field, profileValue, flagValue, allowOverride) {
    if (!profileValue || !flagValue || allowOverride) {
        return;
    }
    if (profileValue !== flagValue) {
        throw new Error(`${field} mismatch between active profile (${profileValue}) and command flag (${flagValue}). ` +
            "Use --allow-profile-override to proceed intentionally.");
    }
}
async function resolveTargetContext(parsed, options) {
    const store = await (0, profile_store_1.loadProfileStore)({ filePath: options.profileStorePath });
    const allowProfileOverride = (0, args_1.getOptionBoolean)(parsed, "allow-profile-override");
    const profileName = (0, args_1.getOptionString)(parsed, "env") ?? (0, args_1.getOptionString)(parsed, "profile") ?? store.activeProfile;
    const profile = store.profiles[profileName];
    if (!profile) {
        throw new Error(`Profile '${profileName}' not found. Run 'sevenlayers env list' to inspect profiles.`);
    }
    const orgFlag = (0, args_1.getOptionString)(parsed, "org-id");
    const appFlag = (0, args_1.getOptionString)(parsed, "app-id");
    const backendFlag = (0, args_1.getOptionString)(parsed, "backend-url");
    assertNoMismatch("org-id", profile.defaultOrgId, orgFlag, allowProfileOverride);
    assertNoMismatch("app-id", profile.defaultAppId, appFlag, allowProfileOverride);
    assertNoMismatch("backend-url", profile.backendUrl, backendFlag, allowProfileOverride);
    const orgId = orgFlag ?? profile.defaultOrgId;
    const appId = appFlag ?? profile.defaultAppId;
    const backendUrl = backendFlag ?? profile.backendUrl;
    if (!backendUrl || backendUrl.trim().length === 0) {
        throw new Error(`Profile '${profileName}' has no backend URL configured. Set one using ` +
            "'sevenlayers env set <profile> --backend-url <url>'.");
    }
    if (options.requireOrgApp && (!orgId || !appId)) {
        throw new Error("Missing required target tuple. Provide --org-id and --app-id, or set defaults on the active profile.");
    }
    if (options.mutatingCommand && profile.requiresConfirmation) {
        const confirmed = (0, args_1.getOptionBoolean)(parsed, "yes");
        const confirmToken = (0, args_1.getOptionString)(parsed, "confirm-prod");
        if (!confirmed || confirmToken !== "PROD") {
            throw new Error("This target requires confirmation. Re-run with --yes --confirm-prod PROD to execute mutating operations.");
        }
    }
    return {
        profile,
        profileName,
        backendUrl,
        orgId,
        appId
    };
}
//# sourceMappingURL=target-guard.js.map