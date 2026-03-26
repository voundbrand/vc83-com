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
const bind_1 = require("../commands/cms/bind");
const registry_1 = require("../commands/cms/registry");
async function withTempDir(run) {
    const directory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-cms-commands-"));
    try {
        await run(directory);
    }
    finally {
        await promises_1.default.rm(directory, { recursive: true, force: true });
    }
}
async function withProfileStore(run) {
    await withTempDir(async (directory) => {
        const storePath = node_path_1.default.join(directory, "profiles.json");
        await (0, profile_store_1.upsertProfile)({
            name: "staging",
            backendUrl: "https://example.convex.site",
            appUrl: "",
            defaultOrgId: "org_staging",
            defaultAppId: "app_123",
            requiresConfirmation: false
        }, { filePath: storePath });
        const previous = process.env.SEVENLAYERS_PROFILE_STORE_PATH;
        process.env.SEVENLAYERS_PROFILE_STORE_PATH = storePath;
        try {
            await run();
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
    const originalLog = console.log;
    console.log = (...args) => {
        stdoutLines.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
        const exitCode = await run();
        return {
            exitCode,
            stdout: stdoutLines.join("\n")
        };
    }
    finally {
        console.log = originalLog;
    }
}
function jsonResponse(payload, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { "Content-Type": "application/json" }
    });
}
(0, node_test_1.default)("cms registry pull writes deterministic registry document", async () => {
    await withProfileStore(async () => {
        await withTempDir(async (directory) => {
            const outPath = node_path_1.default.join(directory, "registry.json");
            await withMockFetch(async (input, init) => {
                const url = String(input);
                strict_1.default.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123");
                strict_1.default.equal(init?.method, "GET");
                return jsonResponse({
                    success: true,
                    application: {
                        id: "app_123",
                        name: "Segelschule Altwarp",
                        status: "active",
                        connection: {
                            features: ["crm", "cms_registry:segelschule.home.v1"]
                        },
                        createdAt: 1,
                        updatedAt: 2
                    }
                });
            }, async () => {
                const parsed = (0, args_1.parseArgv)([
                    "cms",
                    "registry",
                    "pull",
                    "--env",
                    "staging",
                    "--token",
                    "tok_123",
                    "--out",
                    outPath,
                    "--json"
                ]);
                const output = await captureOutput(() => (0, registry_1.handleCmsRegistry)(parsed));
                strict_1.default.equal(output.exitCode, 0);
                const payload = JSON.parse(output.stdout);
                const document = payload.document;
                strict_1.default.equal(document.registryId, "segelschule.home.v1");
                const written = JSON.parse(await promises_1.default.readFile(outPath, "utf8"));
                strict_1.default.equal(written.registryId, "segelschule.home.v1");
            });
        });
    });
});
(0, node_test_1.default)("cms registry push merges cms registry feature into app metadata", async () => {
    await withProfileStore(async () => {
        await withTempDir(async (directory) => {
            const inputPath = node_path_1.default.join(directory, "registry.json");
            await promises_1.default.writeFile(inputPath, `${JSON.stringify({
                schemaVersion: "sevenlayers.cms.registry.v1",
                fetchedAt: new Date().toISOString(),
                profile: "staging",
                organizationId: "org_staging",
                applicationId: "app_123",
                applicationName: "Demo",
                registryId: "segelschule.home.v1",
                source: "feature"
            }, null, 2)}\n`, "utf8");
            let callCount = 0;
            await withMockFetch(async (input, init) => {
                callCount += 1;
                const url = String(input);
                if (callCount === 1) {
                    strict_1.default.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123");
                    strict_1.default.equal(init?.method, "GET");
                    return jsonResponse({
                        success: true,
                        application: {
                            id: "app_123",
                            name: "Demo",
                            status: "active",
                            connection: {
                                features: ["crm", "events"]
                            },
                            createdAt: 1,
                            updatedAt: 2
                        }
                    });
                }
                strict_1.default.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123");
                strict_1.default.equal(init?.method, "PATCH");
                const body = JSON.parse(String(init?.body));
                const features = body.connection.features;
                strict_1.default.equal(features.includes("cms_registry:segelschule.home.v1"), true);
                return jsonResponse({ success: true });
            }, async () => {
                const parsed = (0, args_1.parseArgv)([
                    "cms",
                    "registry",
                    "push",
                    "--env",
                    "staging",
                    "--token",
                    "tok_123",
                    "--in",
                    inputPath,
                    "--json"
                ]);
                const output = await captureOutput(() => (0, registry_1.handleCmsRegistry)(parsed));
                strict_1.default.equal(output.exitCode, 0);
                const payload = JSON.parse(output.stdout);
                strict_1.default.equal(payload.registryId, "segelschule.home.v1");
                strict_1.default.equal(callCount, 2);
            });
        });
    });
});
(0, node_test_1.default)("cms bind resolves page by path and patches merged bindings", async () => {
    await withProfileStore(async () => {
        let callCount = 0;
        await withMockFetch(async (input, init) => {
            callCount += 1;
            const url = String(input);
            if (callCount === 1) {
                strict_1.default.equal(url, "https://example.convex.site/api/v1/activity/pages?applicationId=app_123");
                strict_1.default.equal(init?.method, "GET");
                return jsonResponse({
                    success: true,
                    total: 1,
                    pages: [
                        {
                            id: "page_1",
                            path: "/home",
                            name: "Home",
                            objectBindings: [
                                {
                                    objectType: "event",
                                    accessMode: "read",
                                    syncEnabled: false
                                }
                            ],
                            status: "active",
                            createdAt: 1,
                            updatedAt: 2
                        }
                    ]
                });
            }
            strict_1.default.equal(url, "https://example.convex.site/api/v1/activity/pages/page_1/bindings");
            strict_1.default.equal(init?.method, "PATCH");
            const body = JSON.parse(String(init?.body));
            const bindings = body.objectBindings;
            strict_1.default.equal(bindings.length, 2);
            const checkoutBinding = bindings.find((binding) => binding.objectType === "checkout");
            strict_1.default.ok(checkoutBinding);
            strict_1.default.equal(checkoutBinding.syncDirection, "bidirectional");
            return jsonResponse({ success: true });
        }, async () => {
            const parsed = (0, args_1.parseArgv)([
                "cms",
                "bind",
                "--env",
                "staging",
                "--token",
                "tok_123",
                "--page-path",
                "/home",
                "--binding",
                "checkout:read_write:bidirectional:obj_1,obj_2",
                "--json"
            ]);
            const output = await captureOutput(() => (0, bind_1.handleCmsBind)(parsed));
            strict_1.default.equal(output.exitCode, 0);
            const payload = JSON.parse(output.stdout);
            strict_1.default.equal(payload.success, true);
            strict_1.default.equal(payload.pageId, "page_1");
            strict_1.default.equal(callCount, 2);
        });
    });
});
//# sourceMappingURL=cms-commands.test.js.map