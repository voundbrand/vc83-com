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
const env_writer_1 = require("../config/env-writer");
async function withTempDir(run) {
    const directory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-cli-"));
    try {
        await run(directory);
    }
    finally {
        await promises_1.default.rm(directory, { recursive: true, force: true });
    }
}
(0, node_test_1.default)("upsert mode preserves existing unmanaged and managed values", async () => {
    await withTempDir(async (directory) => {
        const envFile = node_path_1.default.join(directory, ".env.local");
        const before = [
            "# Existing file",
            "KEEP_ME=1",
            "L4YERCAK3_API_KEY=old_key",
            "NEXT_PUBLIC_CUSTOM=abc",
            ""
        ].join("\n");
        await promises_1.default.writeFile(envFile, before, "utf8");
        const result = await (0, env_writer_1.writeEnvFile)(envFile, [
            { key: "L4YERCAK3_API_KEY", value: "new_key" },
            { key: "L4YERCAK3_BACKEND_URL", value: "https://example.convex.site" }
        ], { mode: "upsert" });
        strict_1.default.equal(result.applied, true);
        const after = await promises_1.default.readFile(envFile, "utf8");
        strict_1.default.match(after, /KEEP_ME=1/);
        strict_1.default.match(after, /NEXT_PUBLIC_CUSTOM=abc/);
        strict_1.default.match(after, /L4YERCAK3_API_KEY=old_key/);
        strict_1.default.match(after, /L4YERCAK3_BACKEND_URL=https:\/\/example\.convex\.site/);
        const skip = result.changes.find((change) => change.key === "L4YERCAK3_API_KEY");
        strict_1.default.equal(skip?.type, "skip-existing");
    });
});
(0, node_test_1.default)("replace-key mode updates managed key without deleting unknown keys", async () => {
    await withTempDir(async (directory) => {
        const envFile = node_path_1.default.join(directory, ".env.local");
        await promises_1.default.writeFile(envFile, "KEEP_ME=1\nL4YERCAK3_API_KEY=old_key\n", "utf8");
        const result = await (0, env_writer_1.writeEnvFile)(envFile, [{ key: "L4YERCAK3_API_KEY", value: "new_key" }], { mode: "replace-key" });
        strict_1.default.equal(result.applied, true);
        const after = await promises_1.default.readFile(envFile, "utf8");
        strict_1.default.match(after, /KEEP_ME=1/);
        strict_1.default.match(after, /L4YERCAK3_API_KEY=new_key/);
    });
});
(0, node_test_1.default)("full-rewrite mode requires explicit guard", async () => {
    await withTempDir(async (directory) => {
        const envFile = node_path_1.default.join(directory, ".env.local");
        await promises_1.default.writeFile(envFile, "KEEP_ME=1\n", "utf8");
        await strict_1.default.rejects(() => (0, env_writer_1.writeEnvFile)(envFile, [{ key: "L4YERCAK3_API_KEY", value: "new_key" }], { mode: "full-rewrite" }), /full-rewrite mode is blocked/);
        const result = await (0, env_writer_1.writeEnvFile)(envFile, [{ key: "L4YERCAK3_API_KEY", value: "new_key" }], { mode: "full-rewrite", allowFullRewrite: true });
        strict_1.default.equal(result.applied, true);
        const after = await promises_1.default.readFile(envFile, "utf8");
        strict_1.default.equal(after, "L4YERCAK3_API_KEY=new_key\n");
    });
});
(0, node_test_1.default)("dry-run reports changes without writing", async () => {
    await withTempDir(async (directory) => {
        const envFile = node_path_1.default.join(directory, ".env.local");
        await promises_1.default.writeFile(envFile, "KEEP_ME=1\n", "utf8");
        const result = await (0, env_writer_1.writeEnvFile)(envFile, [{ key: "L4YERCAK3_BACKEND_URL", value: "https://example.convex.site" }], { mode: "upsert", dryRun: true });
        strict_1.default.equal(result.applied, false);
        const after = await promises_1.default.readFile(envFile, "utf8");
        strict_1.default.equal(after, "KEEP_ME=1\n");
        strict_1.default.ok(result.nextContent.includes("L4YERCAK3_BACKEND_URL=https://example.convex.site"));
    });
});
(0, node_test_1.default)("write creates backup for existing file", async () => {
    await withTempDir(async (directory) => {
        const envFile = node_path_1.default.join(directory, ".env.local");
        await promises_1.default.writeFile(envFile, "L4YERCAK3_API_KEY=old\n", "utf8");
        const result = await (0, env_writer_1.writeEnvFile)(envFile, [{ key: "L4YERCAK3_API_KEY", value: "new" }], { mode: "replace-key" });
        strict_1.default.equal(result.applied, true);
        strict_1.default.ok(result.backupPath);
        const backup = await promises_1.default.readFile(result.backupPath, "utf8");
        strict_1.default.equal(backup, "L4YERCAK3_API_KEY=old\n");
    });
});
//# sourceMappingURL=env-writer.test.js.map