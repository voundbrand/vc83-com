"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEnvUse = handleEnvUse;
const colors_1 = require("../../core/colors");
const profile_store_1 = require("../../config/profile-store");
async function handleEnvUse(parsed) {
    const profileName = parsed.positionals[2];
    if (!profileName) {
        throw new Error("Usage: sevenlayers env use <profile-name>");
    }
    const store = await (0, profile_store_1.setActiveProfile)(profileName);
    console.log((0, colors_1.colorGreen)(`Active profile set to '${store.activeProfile}'.`));
    return 0;
}
//# sourceMappingURL=use.js.map