import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgv } from "../core/args";
import { upsertProfile } from "../config/profile-store";
import { handleBookingSmoke } from "../commands/booking/smoke";

type FetchHandler = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => Promise<Response>;

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sevenlayers-booking-smoke-"));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function withProfileStore(
  profile: "staging" | "prod",
  run: () => Promise<void>
): Promise<void> {
  await withTempDir(async (directory) => {
    const storePath = path.join(directory, "profiles.json");
    await upsertProfile(
      {
        name: profile,
        backendUrl: "https://example.convex.site",
        appUrl: "",
        defaultOrgId: "org_staging",
        defaultAppId: "app_123",
        requiresConfirmation: profile === "prod"
      },
      { filePath: storePath }
    );

    const previous = process.env.SEVENLAYERS_PROFILE_STORE_PATH;
    process.env.SEVENLAYERS_PROFILE_STORE_PATH = storePath;
    try {
      await run();
    } finally {
      if (previous === undefined) {
        delete process.env.SEVENLAYERS_PROFILE_STORE_PATH;
      } else {
        process.env.SEVENLAYERS_PROFILE_STORE_PATH = previous;
      }
    }
  });
}

async function withMockFetch(handler: FetchHandler, run: () => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

async function captureOutput(run: () => Promise<number>): Promise<{
  exitCode: number;
  stdout: string;
}> {
  const lines: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    const exitCode = await run();
    return { exitCode, stdout: lines.join("\n") };
  } finally {
    console.log = originalLog;
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function createPreflightHandler(callCounter: { count: number }): FetchHandler {
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
      assert.equal(init?.method, "POST");
      return jsonResponse({ success: true, bookingId: "booking_1" });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
}

test("booking smoke defaults to dry-run mode", async () => {
  await withProfileStore("staging", async () => {
    const callCounter = { count: 0 };
    await withMockFetch(createPreflightHandler(callCounter), async () => {
      const parsed = parseArgv([
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
      const output = await captureOutput(() => handleBookingSmoke(parsed));
      assert.equal(output.exitCode, 0);
      const payload = JSON.parse(output.stdout) as Record<string, unknown>;
      assert.equal(payload.dryRun, true);
      assert.equal(callCounter.count, 4);
    });
  });
});

test("booking smoke blocks prod execution without allow-prod-smoke", async () => {
  await withProfileStore("prod", async () => {
    const callCounter = { count: 0 };
    await withMockFetch(createPreflightHandler(callCounter), async () => {
      const parsed = parseArgv([
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

      await assert.rejects(
        () => handleBookingSmoke(parsed),
        /allow-prod-smoke/
      );
      assert.equal(callCounter.count, 4);
    });
  });
});

test("booking smoke executes in prod when allow-prod-smoke is provided", async () => {
  await withProfileStore("prod", async () => {
    const callCounter = { count: 0 };
    await withMockFetch(createPreflightHandler(callCounter), async () => {
      const parsed = parseArgv([
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
      const output = await captureOutput(() => handleBookingSmoke(parsed));
      assert.equal(output.exitCode, 0);
      const payload = JSON.parse(output.stdout) as Record<string, unknown>;
      assert.equal(payload.dryRun, false);
      assert.equal(callCounter.count, 5);
    });
  });
});
