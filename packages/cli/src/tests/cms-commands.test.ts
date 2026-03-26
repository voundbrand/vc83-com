import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgv } from "../core/args";
import { upsertProfile } from "../config/profile-store";
import { handleCmsBind } from "../commands/cms/bind";
import { handleCmsRegistry } from "../commands/cms/registry";

type FetchHandler = (
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) => Promise<Response>;

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sevenlayers-cms-commands-"));
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
  const stdoutLines: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    stdoutLines.push(args.map((arg) => String(arg)).join(" "));
  };
  try {
    const exitCode = await run();
    return {
      exitCode,
      stdout: stdoutLines.join("\n")
    };
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

test("cms registry pull writes deterministic registry document", async () => {
  await withProfileStore(async () => {
    await withTempDir(async (directory) => {
      const outPath = path.join(directory, "registry.json");

      await withMockFetch(async (input, init) => {
        const url = String(input);
        assert.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123");
        assert.equal(init?.method, "GET");
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
        const parsed = parseArgv([
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

        const output = await captureOutput(() => handleCmsRegistry(parsed));
        assert.equal(output.exitCode, 0);
        const payload = JSON.parse(output.stdout) as Record<string, unknown>;
        const document = payload.document as Record<string, unknown>;
        assert.equal(document.registryId, "segelschule.home.v1");

        const written = JSON.parse(await fs.readFile(outPath, "utf8")) as Record<string, unknown>;
        assert.equal(written.registryId, "segelschule.home.v1");
      });
    });
  });
});

test("cms registry push merges cms registry feature into app metadata", async () => {
  await withProfileStore(async () => {
    await withTempDir(async (directory) => {
      const inputPath = path.join(directory, "registry.json");
      await fs.writeFile(
        inputPath,
        `${JSON.stringify(
          {
            schemaVersion: "sevenlayers.cms.registry.v1",
            fetchedAt: new Date().toISOString(),
            profile: "staging",
            organizationId: "org_staging",
            applicationId: "app_123",
            applicationName: "Demo",
            registryId: "segelschule.home.v1",
            source: "feature"
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      let callCount = 0;
      await withMockFetch(async (input, init) => {
        callCount += 1;
        const url = String(input);

        if (callCount === 1) {
          assert.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123");
          assert.equal(init?.method, "GET");
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

        assert.equal(url, "https://example.convex.site/api/v1/cli/applications/app_123");
        assert.equal(init?.method, "PATCH");
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        const features = (body.connection as Record<string, unknown>).features as string[];
        assert.equal(features.includes("cms_registry:segelschule.home.v1"), true);
        return jsonResponse({ success: true });
      }, async () => {
        const parsed = parseArgv([
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

        const output = await captureOutput(() => handleCmsRegistry(parsed));
        assert.equal(output.exitCode, 0);
        const payload = JSON.parse(output.stdout) as Record<string, unknown>;
        assert.equal(payload.registryId, "segelschule.home.v1");
        assert.equal(callCount, 2);
      });
    });
  });
});

test("cms bind resolves page by path and patches merged bindings", async () => {
  await withProfileStore(async () => {
    let callCount = 0;
    await withMockFetch(async (input, init) => {
      callCount += 1;
      const url = String(input);

      if (callCount === 1) {
        assert.equal(url, "https://example.convex.site/api/v1/activity/pages?applicationId=app_123");
        assert.equal(init?.method, "GET");
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

      assert.equal(url, "https://example.convex.site/api/v1/activity/pages/page_1/bindings");
      assert.equal(init?.method, "PATCH");
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      const bindings = body.objectBindings as Array<Record<string, unknown>>;
      assert.equal(bindings.length, 2);
      const checkoutBinding = bindings.find((binding) => binding.objectType === "checkout");
      assert.ok(checkoutBinding);
      assert.equal(checkoutBinding.syncDirection, "bidirectional");
      return jsonResponse({ success: true });
    }, async () => {
      const parsed = parseArgv([
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

      const output = await captureOutput(() => handleCmsBind(parsed));
      assert.equal(output.exitCode, 0);
      const payload = JSON.parse(output.stdout) as Record<string, unknown>;
      assert.equal(payload.success, true);
      assert.equal(payload.pageId, "page_1");
      assert.equal(callCount, 2);
    });
  });
});
