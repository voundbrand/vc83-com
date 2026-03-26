"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEnvSet = handleEnvSet;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const profile_store_1 = require("../../config/profile-store");
async function handleEnvSet(parsed) {
    const profileName = parsed.positionals[2];
    if (!profileName) {
        throw new Error("Usage: sevenlayers env set <profile-name> --backend-url <url> [options]");
    }
    const backendUrl = (0, args_1.getOptionString)(parsed, "backend-url") ?? "";
    const appUrl = (0, args_1.getOptionString)(parsed, "app-url") ?? "";
    const defaultOrgId = (0, args_1.getOptionString)(parsed, "org-id");
    const defaultAppId = (0, args_1.getOptionString)(parsed, "app-id");
    await (0, profile_store_1.upsertProfile)({
        name: profileName,
        backendUrl,
        appUrl,
        defaultOrgId,
        defaultAppId,
        requiresConfirmation: (0, args_1.getOptionBoolean)(parsed, "requires-confirmation") || profileName === "prod"
    });
    console.log((0, colors_1.colorGreen)(`Profile '${profileName}' saved.`));
    return 0;
}
//# sourceMappingURL=set.js.map