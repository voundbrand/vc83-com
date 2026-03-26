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
const args_1 = require("../core/args");
const profile_store_1 = require("../config/profile-store");
const target_guard_1 = require("../safety/target-guard");
async function withTempDir(run) {
    const directory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-target-guard-"));
    try {
        await run(directory);
    }
    finally {
        await promises_1.default.rm(directory, { recursive: true, force: true });
    }
}
(0, node_test_1.default)("target guard resolves tuple from active profile defaults", async () => {
    await withTempDir(async (directory) => {
        const storePath = node_path_1.default.join(directory, "profiles.json");
        await (0, profile_store_1.upsertProfile)({
            name: "staging",
            backendUrl: "https://staging.convex.site",
            appUrl: "",
            defaultOrgId: "org_staging",
            defaultAppId: "app_staging",
            requiresConfirmation: false
        }, { filePath: storePath });
        const parsed = (0, args_1.parseArgv)(["app", "init", "--env", "staging"]);
        const context = await (0, target_guard_1.resolveTargetContext)(parsed, {
            requireOrgApp: true,
            mutatingCommand: true,
            profileStorePath: storePath
        });
        strict_1.default.equal(context.profileName, "staging");
        strict_1.default.equal(context.backendUrl, "https://staging.convex.site");
        strict_1.default.equal(context.orgId, "org_staging");
        strict_1.default.equal(context.appId, "app_staging");
    });
});
(0, node_test_1.default)("target guard rejects profile mismatch without override", async () => {
    await withTempDir(async (directory) => {
        const storePath = node_path_1.default.join(directory, "profiles.json");
        await (0, profile_store_1.upsertProfile)({
            name: "staging",
            backendUrl: "https://staging.convex.site",
            appUrl: "",
            defaultOrgId: "org_staging",
            defaultAppId: "app_staging",
            requiresConfirmation: false
        }, { filePath: storePath });
        const parsed = (0, args_1.parseArgv)([
            "app",
            "init",
            "--env",
            "staging",
            "--org-id",
            "other_org"
        ]);
        await strict_1.default.rejects(() => (0, target_guard_1.resolveTargetContext)(parsed, {
            requireOrgApp: true,
            mutatingCommand: true,
            profileStorePath: storePath
        }), /mismatch/);
    });
});
(0, node_test_1.default)("target guard requires explicit confirmation for prod", async () => {
    await withTempDir(async (directory) => {
        const storePath = node_path_1.default.join(directory, "profiles.json");
        await (0, profile_store_1.upsertProfile)({
            name: "prod",
            backendUrl: "https://prod.convex.site",
            appUrl: "",
            defaultOrgId: "org_prod",
            defaultAppId: "app_prod",
            requiresConfirmation: true
        }, { filePath: storePath });
        const unsafe = (0, args_1.parseArgv)(["app", "connect", "--env", "prod"]);
        await strict_1.default.rejects(() => (0, target_guard_1.resolveTargetContext)(unsafe, {
            requireOrgApp: true,
            mutatingCommand: true,
            profileStorePath: storePath
        }), /requires confirmation/);
        const safe = (0, args_1.parseArgv)([
            "app",
            "connect",
            "--env",
            "prod",
            "--yes",
            "--confirm-prod",
            "PROD"
        ]);
        const context = await (0, target_guard_1.resolveTargetContext)(safe, {
            requireOrgApp: true,
            mutatingCommand: true,
            profileStorePath: storePath
        });
        strict_1.default.equal(context.profileName, "prod");
    });
});
//# sourceMappingURL=target-guard.test.js.map