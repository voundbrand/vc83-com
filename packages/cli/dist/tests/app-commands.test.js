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
const link_1 = require("../commands/app/link");
const pages_1 = require("../commands/app/pages");
const register_1 = require("../commands/app/register");
const sync_1 = require("../commands/app/sync");
const pages_2 = require("../commands/legacy/pages");
const sync_2 = require("../commands/legacy/sync");
async function withTempDir(run) {
    const directory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-app-commands-"));
    try {
        await run(directory);
    }
    finally {
        await promises_1.default.rm(directory, { recursive: true, force: true });
    }
}
async function withProfileStore(defaults, run) {
    await withTempDir(async (directory) => {
        const storePath = node_path_1.default.join(directory, "profiles.json");
        await (0, profile_store_1.upsertProfile)({
            name: "staging",
            backendUrl: "https://example.convex.site",
            appUrl: "",
            defaultOrgId: defaults.orgId,
            defaultAppId: defaults.appId,
            requiresConfirmation: false
        }, { filePath: storePath });
        const previous = process.env.SEVENLAYERS_PROFILE_STORE_PATH;
        process.env.SEVENLAYERS_PROFILE_STORE_PATH = storePath;
        try {
            await run(storePath);
        }
        finally {
            if (previous === undefined) {
                delete process.env.SEVENLAYERS_PROFILE_STORE_PATH;
            }
            else {
                process.env.SEVENLAYERS_PROFILE_STORE_PATH = previous;
            }
        }
    });
}
async function withMockFetch(handler, run) {
    const original = globalThis.fetch;
    globalThis.fetch = handler;
    try {
        await run();
    }
    finally {
        globalThis.fetch = original;
    }
}
async function captureOutput(run) {
    const stdoutLines = [];
    const stderrLines = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args) => {
        stdoutLines.push(args.map((arg) => String(arg)).join(" "));
    };
    console.error = (...args) => {
        stderrLines.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
        const exitCode = await run();
        return {
            exitCode,
            stdout: stdoutLines.join("\n"),
            stderr: stderrLines.join("\n")
        };
    }
    finally {
        console.log = originalLog;
        console.error = originalError;
    }
}
function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
(0, node_test_1.default)("app register posts to cli applications endpoint with deterministic JSON output", async () => {
    await withProfileStore({ orgId: "org_staging" }, async () => {
        await withMockFetch(async (input, init) => {
            const url = String(input);
            strict_1.default.equal(url, "https://example.convex.site/api/v1/cli/applications");
            strict_1.default.equal(init?.method, "POST");
            const body = JSON.parse(String(init?.body));
            strict_1.default.equal(body.organizationId, "org_staging");
            strict_1.default.equal(body.name, "demo-app");
            strict_1.default.equal(body.connection.features instanceof Array, true);
            return jsonResponse({
                success: true,
                applicationId: "app_123",
                existingApplication: false,
                backendUrl: "https://example.convex.site",
                apiKey: {
                    id: "key_1",
                    key: "sk_xxx",
                    prefix: "sk_xxx..."
                }
            });
        }, async () => {
            const parsed = (0, args_1.parseArgv)([
                "app",
                "register",
                "--env",
                "staging",
                "--token",
                "tok_123",
                "--name",
                "demo-app",
                "--framework",
                "nextjs",
                "--feature",
                "crm",
                "--feature",
                "events",
                "--json"
            ]);
            const output = await captureOutput(() => (0, register_1.handleAppRegister)(parsed));
            strict_1.default.equal(output.exitCode, 0);
            const payload = JSON.parse(output.stdout);
            strict_1.default.equal(payload.applicationId, "app_123");
            strict_1.default.equal(payload.organizationId, "org_staging");
            strict_1.default.equal(payload.existingApplication, false);
        });
    });
});
(0, node_test_1.default)("app link patches app metadata and fetches updated application", async () => {
    await withProfileStore({ orgId: "org_staging", appId: "app_123" }, async () => {
        let callCount = 0;
        await withMockFetch(async (input, init) => {
            callCount += 1;
            const url = String(input);
            if (callCount === 1) {
                strict_1.default.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123");
                strict_1.default.equal(init?.method, "PATCH");
                const body = JSON.parse(String(init?.body));
                const connection = body.connection;
                const deployment = body.deployment;
                strict_1.default.deepEqual(connection.features, ["crm", "events"]);
                strict_1.default.equal(deployment.githubRepo, "foundbrand/vc83-com");
                return jsonResponse({ success: true });
            }
            strict_1.default.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123");
            strict_1.default.equal(init?.method, "GET");
            return jsonResponse({
                success: true,
                application: {
                    id: "app_123",
                    name: "Demo App",
                    status: "active",
                    createdAt: 1,
                    updatedAt: 2
                }
            });
        }, async () => {
            const parsed = (0, args_1.parseArgv)([
                "app",
                "link",
                "--env",
                "staging",
                "--token",
                "tok_123",
                "--feature",
                "crm,events",
                "--github-repo",
                "foundbrand/vc83-com",
                "--json"
            ]);
            const output = await captureOutput(() => (0, link_1.handleAppLink)(parsed));
            strict_1.default.equal(output.exitCode, 0);
            const payload = JSON.parse(output.stdout);
            strict_1.default.equal(payload.success, true);
            const application = payload.application;
            strict_1.default.equal(application.id, "app_123");
            strict_1.default.equal(callCount, 2);
        });
    });
});
(0, node_test_1.default)("app sync posts sync payload with model list and dry-run", async () => {
    await withProfileStore({ orgId: "org_staging", appId: "app_123" }, async () => {
        await withMockFetch(async (input, init) => {
            const url = String(input);
            strict_1.default.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123/sync");
            strict_1.default.equal(init?.method, "POST");
            const body = JSON.parse(String(init?.body));
            strict_1.default.equal(body.direction, "push");
            strict_1.default.deepEqual(body.models, ["Contact", "Event"]);
            strict_1.default.equal(body.dryRun, true);
            return jsonResponse({ success: true, syncId: "sync_1" });
        }, async () => {
            const parsed = (0, args_1.parseArgv)([
                "app",
                "sync",
                "--env",
                "staging",
                "--token",
                "tok_123",
                "--direction",
                "push",
                "--model",
                "Contact",
                "--model",
                "Event",
                "--dry-run",
                "--json"
            ]);
            const output = await captureOutput(() => (0, sync_1.handleAppSync)(parsed));
            strict_1.default.equal(output.exitCode, 0);
            const payload = JSON.parse(output.stdout);
            strict_1.default.equal(payload.success, true);
            strict_1.default.equal(payload.direction, "push");
        });
    });
});
(0, node_test_1.default)("app pages sync posts parsed page declarations", async () => {
    await withProfileStore({ orgId: "org_staging", appId: "app_123" }, async () => {
        await withMockFetch(async (input, init) => {
            const url = String(input);
            strict_1.default.equal(url, "https://example.convex.site/api/v1/activity/pages/bulk");
            strict_1.default.equal(init?.method, "POST");
            const body = JSON.parse(String(init?.body));
            strict_1.default.equal(body.applicationId, "app_123");
            const pages = body.pages;
            strict_1.default.equal(pages.length, 2);
            strict_1.default.equal(pages[0].detectionMethod, "cli_detector");
            strict_1.default.equal(pages[1].detectionMethod, "cli_manual");
            return jsonResponse({
                success: true,
                total: 2,
                created: 1,
                updated: 1,
                results: []
            });
        }, async () => {
            const parsed = (0, args_1.parseArgv)([
                "app",
                "pages",
                "sync",
                "--env",
                "staging",
                "--token",
                "tok_123",
                "--page",
                "/home:Home:static:cli_detector",
                "--page",
                "/about:About:static",
                "--json"
            ]);
            const output = await captureOutput(() => (0, pages_1.handleAppPages)(parsed));
            strict_1.default.equal(output.exitCode, 0);
            const payload = JSON.parse(output.stdout);
            strict_1.default.equal(payload.total, 2);
            strict_1.default.equal(payload.created, 1);
            strict_1.default.equal(payload.updated, 1);
        });
    });
});
(0, node_test_1.default)("page spec parser rejects malformed input", () => {
    strict_1.default.throws(() => (0, pages_1.parsePageSpec)("/home"), /Invalid --page value/);
});
(0, node_test_1.default)("legacy sync bridges to app sync with migration message", async () => {
    await withProfileStore({ orgId: "org_staging", appId: "app_123" }, async () => {
        await withMockFetch(async (input, init) => {
            const url = String(input);
            strict_1.default.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123/sync");
            strict_1.default.equal(init?.method, "POST");
            return jsonResponse({ success: true, syncId: "sync_legacy" });
        }, async () => {
            const parsed = (0, args_1.parseArgv)([
                "sync",
                "--env",
                "staging",
                "--token",
                "tok_123"
            ]);
            const output = await captureOutput(() => (0, sync_2.handleLegacySync)(parsed));
            strict_1.default.equal(output.exitCode, 0);
            strict_1.default.match(output.stdout, /Legacy command 'sync' mapped to 'sevenlayers app sync'/);
        });
    });
});
(0, node_test_1.default)("legacy pages defaults to app pages sync bridge", async () => {
    await withProfileStore({ orgId: "org_staging", appId: "app_123" }, async () => {
        const parsed = (0, args_1.parseArgv)([
            "pages",
            "--env",
            "staging",
            "--token",
            "tok_123",
            "--page",
            "/home:Home:static",
            "--dry-run"
        ]);
        const output = await captureOutput(() => (0, pages_2.handleLegacyPages)(parsed));
        strict_1.default.equal(output.exitCode, 0);
        strict_1.default.match(output.stdout, /Legacy command 'pages' mapped to 'sevenlayers app pages sync'/);
    });
});
//# sourceMappingURL=app-commands.test.js.map