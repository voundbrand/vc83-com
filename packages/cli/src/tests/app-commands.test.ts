import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgv } from "../core/args";
import { upsertProfile } from "../config/profile-store";
import { handleAppLink } from "../commands/app/link";
import { handleAppPages, parsePageSpec } from "../commands/app/pages";
import { handleAppRegister } from "../commands/app/register";
import { handleAppSync } from "../commands/app/sync";
import { handleLegacyPages } from "../commands/legacy/pages";
import { handleLegacySync } from "../commands/legacy/sync";

type FetchHandler = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => Promise<Response>;

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sevenlayers-app-commands-"));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function withProfileStore(
  defaults: { orgId: string; appId?: string },
  run: (storePath: string) => Promise<void>
): Promise<void> {
  await withTempDir(async (directory) => {
    const storePath = path.join(directory, "profiles.json");
    await upsertProfile(
      {
        name: "staging",
        backendUrl: "https://example.convex.site",
        appUrl: "",
        defaultOrgId: defaults.orgId,
        defaultAppId: defaults.appId,
        requiresConfirmation: false
      },
      { filePath: storePath }
    );

    const previous = process.env.SEVENLAYERS_PROFILE_STORE_PATH;
    process.env.SEVENLAYERS_PROFILE_STORE_PATH = storePath;
    try {
      await run(storePath);
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
  stderr: string;
}> {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    stdoutLines.push(args.map((arg) => String(arg)).join(" "));
  };
  console.error = (...args: unknown[]) => {
    stderrLines.push(args.map((arg) => String(arg)).join(" "));
  };

  try {
    const exitCode = await run();
    return {
      exitCode,
      stdout: stdoutLines.join("\n"),
      stderr: stderrLines.join("\n")
    };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("app register posts to cli applications endpoint with deterministic JSON output", async () => {
  await withProfileStore({ orgId: "org_staging" }, async () => {
    await withMockFetch(async (input, init) => {
      const url = String(input);
      assert.equal(url, "https://example.convex.site/api/v1/cli/applications");
      assert.equal(init?.method, "POST");

      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.organizationId, "org_staging");
      assert.equal(body.name, "demo-app");
      assert.equal((body.connection as Record<string, unknown>).features instanceof Array, true);

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
      const parsed = parseArgv([
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

      const output = await captureOutput(() => handleAppRegister(parsed));
      assert.equal(output.exitCode, 0);
      const payload = JSON.parse(output.stdout) as Record<string, unknown>;
      assert.equal(payload.applicationId, "app_123");
      assert.equal(payload.organizationId, "org_staging");
      assert.equal(payload.existingApplication, false);
    });
  });
});

test("app link patches app metadata and fetches updated application", async () => {
  await withProfileStore({ orgId: "org_staging", appId: "app_123" }, async () => {
    let callCount = 0;

    await withMockFetch(async (input, init) => {
      callCount += 1;
      const url = String(input);

      if (callCount === 1) {
        assert.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123");
        assert.equal(init?.method, "PATCH");
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        const connection = body.connection as Record<string, unknown>;
        const deployment = body.deployment as Record<string, unknown>;
        assert.deepEqual(connection.features, ["crm", "events"]);
        assert.equal(deployment.githubRepo, "foundbrand/vc83-com");
        return jsonResponse({ success: true });
      }

      assert.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123");
      assert.equal(init?.method, "GET");
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
      const parsed = parseArgv([
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

      const output = await captureOutput(() => handleAppLink(parsed));
      assert.equal(output.exitCode, 0);
      const payload = JSON.parse(output.stdout) as Record<string, unknown>;
      assert.equal(payload.success, true);
      const application = payload.application as Record<string, unknown>;
      assert.equal(application.id, "app_123");
      assert.equal(callCount, 2);
    });
  });
});

test("app sync posts sync payload with model list and dry-run", async () => {
  await withProfileStore({ orgId: "org_staging", appId: "app_123" }, async () => {
    await withMockFetch(async (input, init) => {
      const url = String(input);
      assert.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123/sync");
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.direction, "push");
      assert.deepEqual(body.models, ["Contact", "Event"]);
      assert.equal(body.dryRun, true);
      return jsonResponse({ success: true, syncId: "sync_1" });
    }, async () => {
      const parsed = parseArgv([
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

      const output = await captureOutput(() => handleAppSync(parsed));
      assert.equal(output.exitCode, 0);
      const payload = JSON.parse(output.stdout) as Record<string, unknown>;
      assert.equal(payload.success, true);
      assert.equal(payload.direction, "push");
    });
  });
});

test("app pages sync posts parsed page declarations", async () => {
  await withProfileStore({ orgId: "org_staging", appId: "app_123" }, async () => {
    await withMockFetch(async (input, init) => {
      const url = String(input);
      assert.equal(url, "https://example.convex.site/api/v1/activity/pages/bulk");
      assert.equal(init?.method, "POST");

      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.applicationId, "app_123");
      const pages = body.pages as Array<Record<string, unknown>>;
      assert.equal(pages.length, 2);
      assert.equal(pages[0].detectionMethod, "cli_detector");
      assert.equal(pages[1].detectionMethod, "cli_manual");

      return jsonResponse({
        success: true,
        total: 2,
        created: 1,
        updated: 1,
        results: []
      });
    }, async () => {
      const parsed = parseArgv([
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

      const output = await captureOutput(() => handleAppPages(parsed));
      assert.equal(output.exitCode, 0);
      const payload = JSON.parse(output.stdout) as Record<string, unknown>;
      assert.equal(payload.total, 2);
      assert.equal(payload.created, 1);
      assert.equal(payload.updated, 1);
    });
  });
});

test("page spec parser rejects malformed input", () => {
  assert.throws(() => parsePageSpec("/home"), /Invalid --page value/);
});

test("legacy sync bridges to app sync with migration message", async () => {
  await withProfileStore({ orgId: "org_staging", appId: "app_123" }, async () => {
    await withMockFetch(async (input, init) => {
      const url = String(input);
      assert.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123/sync");
      assert.equal(init?.method, "POST");
      return jsonResponse({ success: true, syncId: "sync_legacy" });
    }, async () => {
      const parsed = parseArgv([
        "sync",
        "--env",
        "staging",
        "--token",
        "tok_123"
      ]);
      const output = await captureOutput(() => handleLegacySync(parsed));
      assert.equal(output.exitCode, 0);
      assert.match(output.stdout, /Legacy command 'sync' mapped to 'sevenlayers app sync'/);
    });
  });
});

test("legacy pages defaults to app pages sync bridge", async () => {
  await withProfileStore({ orgId: "org_staging", appId: "app_123" }, async () => {
    const parsed = parseArgv([
      "pages",
      "--env",
      "staging",
      "--token",
      "tok_123",
      "--page",
      "/home:Home:static",
      "--dry-run"
    ]);

    const output = await captureOutput(() => handleLegacyPages(parsed));
    assert.equal(output.exitCode, 0);
    assert.match(output.stdout, /Legacy command 'pages' mapped to 'sevenlayers app pages sync'/);
  });
});
