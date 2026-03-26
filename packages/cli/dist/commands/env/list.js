"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEnvList = handleEnvList;
const args_1 = require("../../core/args");
const colors_1 = require("../../core/colors");
const profile_store_1 = require("../../config/profile-store");
async function handleEnvList(parsed) {
    const store = await (0, profile_store_1.loadProfileStore)();
    if ((0, args_1.getOptionBoolean)(parsed, "json")) {
        console.log(JSON.stringify(store, null, 2));
        return 0;
    }
    console.log((0, colors_1.colorOrange)("Configured profiles:"));
    for (const profile of Object.values(store.profiles)) {
        const active = profile.name === store.activeProfile ? "*" : " ";
        const backend = profile.backendUrl || "<unset>";
        const org = profile.defaultOrgId || "<unset>";
        const app = profile.defaultAppId || "<unset>";
        const confirm = profile.requiresConfirmation ? "yes" : "no";
        console.log(`${active} ${profile.name}`);
        console.log((0, colors_1.colorGray)(`    backend: ${backend}`));
        console.log((0, colors_1.colorGray)(`    default org: ${org}`));
        console.log((0, colors_1.colorGray)(`    default app: ${app}`));
        console.log((0, colors_1.colorGray)(`    requires confirmation: ${confirm}`));
    }
    return 0;
}
//# sourceMappingURL=list.js.map