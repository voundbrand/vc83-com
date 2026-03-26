import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgv } from "../core/args";
import { upsertProfile } from "../config/profile-store";
import { handleBookingCheck } from "../commands/booking/check";
import { handleBookingSetup } from "../commands/booking/setup";

type FetchHandler = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => Promise<Response>;

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sevenlayers-booking-tests-"));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function withProfileStore(run: () => Promise<void>): Promise<void> {
  await withTempDir(async (directory) => {
    const storePath = path.join(directory, "profiles.json");
    await upsertProfile(
      {
        name: "staging",
        backendUrl: "https://example.convex.site",
        appUrl: "",
        defaultOrgId: "org_staging",
        defaultAppId: "app_123",
        requiresConfirmation: false
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

test("booking check validates endpoint and entity prerequisites", async () => {
  await withProfileStore(async () => {
    const requests: string[] = [];
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
      const parsed = parseArgv([
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
      const output = await captureOutput(() => handleBookingCheck(parsed));
      assert.equal(output.exitCode, 0);
      const payload = JSON.parse(output.stdout) as Record<string, unknown>;
      assert.equal(payload.success, true);
      assert.equal(requests.length, 4);
    });
  });
});

test("booking setup returns validation issues when endpoints are unreachable", async () => {
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
      const parsed = parseArgv([
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
      const output = await captureOutput(() => handleBookingSetup(parsed));
      assert.equal(output.exitCode, 1);
      const payload = JSON.parse(output.stdout) as Record<string, unknown>;
      assert.equal(payload.success, false);
      const issues = payload.issues as string[];
      assert.equal(issues.some((issue) => issue.includes("products endpoint unreachable")), true);
    });
  });
});

test("booking setup dry-run reports env changes when preflight passes", async () => {
  await withProfileStore(async () => {
    await withTempDir(async (directory) => {
      const envFilePath = path.join(directory, ".env.local");
      await fs.writeFile(envFilePath, "KEEP_ME=1\n", "utf8");

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
        const parsed = parseArgv([
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
        const output = await captureOutput(() => handleBookingSetup(parsed));
        assert.equal(output.exitCode, 0);
        const payload = JSON.parse(output.stdout) as Record<string, unknown>;
        assert.equal(payload.success, true);
        assert.equal(payload.applied, false);
        const changes = payload.changes as Array<Record<string, unknown>>;
        assert.equal(changes.some((change) => change.key === "L4YERCAK3_BOOKING_EVENT_ID"), true);
      });
    });
  });
});
