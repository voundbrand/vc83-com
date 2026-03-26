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
const smoke_1 = require("../commands/booking/smoke");
async function withTempDir(run) {
    const directory = await promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "sevenlayers-booking-smoke-"));
    try {
        await run(directory);
    }
    finally {
        await promises_1.default.rm(directory, { recursive: true, force: true });
    }
}
async function withProfileStore(profile, run) {
    await withTempDir(async (directory) => {
        const storePath = node_path_1.default.join(directory, "profiles.json");
        await (0, profile_store_1.upsertProfile)({
            name: profile,
            backendUrl: "https://example.convex.site",
            appUrl: "",
            defaultOrgId: "org_staging",
            defaultAppId: "app_123",
            requiresConfirmation: profile === "prod"
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
function createPreflightHandler(callCounter) {
    return async (input, init) => {
        callCounter.count += 1;
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
        if (url.endsWith("/api/v1/bookings/create")) {
            strict_1.default.equal(init?.method, "POST");
            return jsonResponse({ success: true, bookingId: "booking_1" });
        }
        throw new Error(`Unexpected URL: ${url}`);
    };
}
(0, node_test_1.default)("booking smoke defaults to dry-run mode", async () => {
    await withProfileStore("staging", async () => {
        const callCounter = { count: 0 };
        await withMockFetch(createPreflightHandler(callCounter), async () => {
            const parsed = (0, args_1.parseArgv)([
                "booking",
                "smoke",
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
            const output = await captureOutput(() => (0, smoke_1.handleBookingSmoke)(parsed));
            strict_1.default.equal(output.exitCode, 0);
            const payload = JSON.parse(output.stdout);
            strict_1.default.equal(payload.dryRun, true);
            strict_1.default.equal(callCounter.count, 4);
        });
    });
});
(0, node_test_1.default)("booking smoke blocks prod execution without allow-prod-smoke", async () => {
    await withProfileStore("prod", async () => {
        const callCounter = { count: 0 };
        await withMockFetch(createPreflightHandler(callCounter), async () => {
            const parsed = (0, args_1.parseArgv)([
                "booking",
                "smoke",
                "--env",
                "prod",
                "--token",
                "tok_123",
                "--event-id",
                "evt_1",
                "--product-id",
                "prod_1",
                "--execute",
                "--yes",
                "--confirm-prod",
                "PROD",
                "--json"
            ]);
            await strict_1.default.rejects(() => (0, smoke_1.handleBookingSmoke)(parsed), /allow-prod-smoke/);
            strict_1.default.equal(callCounter.count, 4);
        });
    });
});
(0, node_test_1.default)("booking smoke executes in prod when allow-prod-smoke is provided", async () => {
    await withProfileStore("prod", async () => {
        const callCounter = { count: 0 };
        await withMockFetch(createPreflightHandler(callCounter), async () => {
            const parsed = (0, args_1.parseArgv)([
                "booking",
                "smoke",
                "--env",
                "prod",
                "--token",
                "tok_123",
                "--event-id",
                "evt_1",
                "--product-id",
                "prod_1",
                "--execute",
                "--allow-prod-smoke",
                "--yes",
                "--confirm-prod",
                "PROD",
                "--json"
            ]);
            const output = await captureOutput(() => (0, smoke_1.handleBookingSmoke)(parsed));
            strict_1.default.equal(output.exitCode, 0);
            const payload = JSON.parse(output.stdout);
            strict_1.default.equal(payload.dryRun, false);
            strict_1.default.equal(callCounter.count, 5);
        });
    });
});
//# sourceMappingURL=booking-smoke.test.js.map