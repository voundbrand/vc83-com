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
const doctor_1 = require("../commands/cms/doctor");
const migrate_1 = require("../commands/cms/migrate");
const seed_1 = require("../commands/cms/seed");
async function withTempDir(run) {
    const directory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-cms-ops-"));
    try {
        await run(directory);
    }
    finally {
        await promises_1.default.rm(directory, { recursive: true, force: true });
    }
}
async function captureOutput(run) {
    const stdoutLines = [];
    const originalLog = console.log;
    console.log = (...args) => {
        stdoutLines.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
        const exitCode = await run();
        return { exitCode, stdout: stdoutLines.join("\n") };
    }
    finally {
        console.log = originalLog;
    }
}
(0, node_test_1.default)("cms migrate legacy emits dry-run summary for migrated content", async () => {
    await withTempDir(async (directory) => {
        const legacyPath = node_path_1.default.join(directory, "legacy.json");
        await promises_1.default.writeFile(legacyPath, JSON.stringify({
            en: {
                "hero.title": "Hello",
                "hero.subtitle": "Welcome"
            },
            de: {
                "hero.title": "Hallo",
                "hero.subtitle": "Willkommen"
            }
        }, null, 2), "utf8");
        const parsed = (0, args_1.parseArgv)([
            "cms",
            "migrate",
            "legacy",
            "--in",
            legacyPath,
            "--json"
        ]);
        const output = await captureOutput(() => (0, migrate_1.handleCmsMigrate)(parsed));
        strict_1.default.equal(output.exitCode, 0);
        const payload = JSON.parse(output.stdout);
        const summary = payload.summary;
        strict_1.default.equal(summary.entries, 4);
        strict_1.default.equal(summary.locales, 2);
        strict_1.default.equal(summary.lookupKeys, 2);
    });
});
(0, node_test_1.default)("cms seed supports locale + field parity dry-run summary", async () => {
    const parsed = (0, args_1.parseArgv)([
        "cms",
        "seed",
        "--locale",
        "en",
        "--locale",
        "de",
        "--field",
        "hero.title",
        "--value",
        "en:hero.title:Hello",
        "--value",
        "de:hero.title:Hallo",
        "--json"
    ]);
    const output = await captureOutput(() => (0, seed_1.handleCmsSeed)(parsed));
    strict_1.default.equal(output.exitCode, 0);
    const payload = JSON.parse(output.stdout);
    const summary = payload.summary;
    strict_1.default.equal(summary.entries, 2);
    strict_1.default.equal(summary.locales, 2);
    strict_1.default.equal(summary.lookupKeys, 1);
    strict_1.default.equal(summary.parityComplete, true);
});
(0, node_test_1.default)("cms doctor reports parity failures with non-zero exit code", async () => {
    await withTempDir(async (directory) => {
        const contentPath = node_path_1.default.join(directory, "content.json");
        await promises_1.default.writeFile(contentPath, JSON.stringify({
            schemaVersion: "sevenlayers.cms.content.v1",
            generatedAt: new Date().toISOString(),
            source: "test",
            entries: [
                {
                    locale: "en",
                    lookupKey: "hero.title",
                    value: "Hello"
                }
            ]
        }, null, 2), "utf8");
        const parsed = (0, args_1.parseArgv)([
            "cms",
            "doctor",
            "--in",
            contentPath,
            "--require-locale",
            "de",
            "--json"
        ]);
        const output = await captureOutput(() => (0, doctor_1.handleCmsDoctor)(parsed));
        strict_1.default.equal(output.exitCode, 1);
        const payload = JSON.parse(output.stdout);
        strict_1.default.equal(payload.success, false);
        const summary = payload.summary;
        strict_1.default.equal(Number(summary.issues) > 0, true);
    });
});
//# sourceMappingURL=cms-ops.test.js.map