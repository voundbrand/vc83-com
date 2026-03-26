"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const profile_store_1 = require("../config/profile-store");
async function withTempDir(run) {
    const directory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-profile-store-"));
    try {
        await run(directory);
    }
    finally {
        await promises_1.default.rm(directory, { recursive: true, force: true });
    }
}
(0, node_test_1.default)("profile store initializes defaults and persists active profile", async () => {
    await withTempDir(async (directory) => {
        const storePath = node_path_1.default.join(directory, "profiles.json");
        const first = await (0, profile_store_1.loadProfileStore)({ filePath: storePath });
        strict_1.default.equal(first.activeProfile, "local");
        strict_1.default.ok(first.profiles.local);
        strict_1.default.ok(first.profiles.staging);
        strict_1.default.ok(first.profiles.prod);
        await (0, profile_store_1.upsertProfile)({
            name: "staging",
            backendUrl: "https://staging.convex.site",
            appUrl: "https://staging.app.sevenlayers.io",
            defaultOrgId: "org_staging",
            defaultAppId: "app_staging",
            requiresConfirmation: false
        }, { filePath: storePath });
        await (0, profile_store_1.setActiveProfile)("staging", { filePath: storePath });
        const active = await (0, profile_store_1.getActiveProfile)({ filePath: storePath });
        strict_1.default.equal(active.name, "staging");
        strict_1.default.equal(active.backendUrl, "https://staging.convex.site");
        strict_1.default.equal(active.defaultOrgId, "org_staging");
        strict_1.default.equal(active.defaultAppId, "app_staging");
    });
});
//# sourceMappingURL=profile-store.test.js.map