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
const check_1 = require("../commands/booking/check");
const setup_1 = require("../commands/booking/setup");
async function withTempDir(run) {
    const directory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-booking-tests-"));
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
    const lines = [];
    const originalLog = console.log;
    console.log = (...args) => {
        lines.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
        const exitCode = await run();
        return { exitCode, stdout: lines.join("\n") };
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
(0, node_test_1.default)("booking check validates endpoint and entity prerequisites", async () => {
    await withProfileStore(async () => {
        const requests = [];
        await withMockFetch(async (input) => {
            const url = String(input);
            requests.push(url);
            if (url.endsWith("/api/v1/events?limit=1")) {
                return jsonResponse({ events: [] });
            }
            if (url.endsWith("/api/v1/products?limit=1")) {
                return jsonResponse({ products: [] });
            }
            if (url.endsWith("/api/v1/events/evt_1")) {
                return jsonResponse({ id: "evt_1" });
            }
            if (url.endsWith("/api/v1/products/prod_1")) {
                return jsonResponse({ id: "prod_1" });
            }
            throw new Error(`Unexpected URL: ${url}`);
        }, async () => {
            const parsed = (0, args_1.parseArgv)([
                "booking",
                "check",
                "--env",
                "staging",
                "--token",
                "tok_123",
                "--event-id",
                "evt_1",
                "--product-id",
                "prod_1",
                "--json"
            ]);
            const output = await captureOutput(() => (0, check_1.handleBookingCheck)(parsed));
            strict_1.default.equal(output.exitCode, 0);
            const payload = JSON.parse(output.stdout);
            strict_1.default.equal(payload.success, true);
            strict_1.default.equal(requests.length, 4);
        });
    });
});
(0, node_test_1.default)("booking setup returns validation issues when endpoints are unreachable", async () => {
    await withProfileStore(async () => {
        await withMockFetch(async (input) => {
            const url = String(input);
            if (url.endsWith("/api/v1/events?limit=1")) {
                return jsonResponse({ events: [] });
            }
            if (url.endsWith("/api/v1/products?limit=1")) {
                return new Response("boom", { status: 500 });
            }
            return jsonResponse({ id: "ok" });
        }, async () => {
            const parsed = (0, args_1.parseArgv)([
                "booking",
                "setup",
                "--env",
                "staging",
                "--token",
                "tok_123",
                "--event-id",
                "evt_1",
                "--product-id",
                "prod_1",
                "--dry-run",
                "--json"
            ]);
            const output = await captureOutput(() => (0, setup_1.handleBookingSetup)(parsed));
            strict_1.default.equal(output.exitCode, 1);
            const payload = JSON.parse(output.stdout);
            strict_1.default.equal(payload.success, false);
            const issues = payload.issues;
            strict_1.default.equal(issues.some((issue) => issue.includes("products endpoint unreachable")), true);
        });
    });
});
(0, node_test_1.default)("booking setup dry-run reports env changes when preflight passes", async () => {
    await withProfileStore(async () => {
        await withTempDir(async (directory) => {
            const envFilePath = node_path_1.default.join(directory, ".env.local");
            await promises_1.default.writeFile(envFilePath, "KEEP_ME=1\n", "utf8");
            await withMockFetch(async (input) => {
                const url = String(input);
                if (url.endsWith("/api/v1/events?limit=1")) {
                    return jsonResponse({ events: [] });
                }
                if (url.endsWith("/api/v1/products?limit=1")) {
                    return jsonResponse({ products: [] });
                }
                if (url.endsWith("/api/v1/events/evt_1")) {
                    return jsonResponse({ id: "evt_1" });
                }
                if (url.endsWith("/api/v1/products/prod_1")) {
                    return jsonResponse({ id: "prod_1" });
                }
                throw new Error(`Unexpected URL: ${url}`);
            }, async () => {
                const parsed = (0, args_1.parseArgv)([
                    "booking",
                    "setup",
                    "--env",
                    "staging",
                    "--token",
                    "tok_123",
                    "--event-id",
                    "evt_1",
                    "--product-id",
                    "prod_1",
                    "--env-file",
                    envFilePath,
                    "--dry-run",
                    "--json"
                ]);
                const output = await captureOutput(() => (0, setup_1.handleBookingSetup)(parsed));
                strict_1.default.equal(output.exitCode, 0);
                const payload = JSON.parse(output.stdout);
                strict_1.default.equal(payload.success, true);
                strict_1.default.equal(payload.applied, false);
                const changes = payload.changes;
                strict_1.default.equal(changes.some((change) => change.key === "L4YERCAK3_BOOKING_EVENT_ID"), true);
            });
        });
    });
});
//# sourceMappingURL=booking-commands.test.js.map