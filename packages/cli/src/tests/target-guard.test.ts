import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgv } from "../core/args";
import { upsertProfile } from "../config/profile-store";
import { resolveTargetContext } from "../safety/target-guard";

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sevenlayers-target-guard-"));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("target guard resolves tuple from active profile defaults", async () => {
  await withTempDir(async (directory) => {
    const storePath = path.join(directory, "profiles.json");

    await upsertProfile(
      {
        name: "staging",
        backendUrl: "https://staging.convex.site",
        appUrl: "",
        defaultOrgId: "org_staging",
        defaultAppId: "app_staging",
        requiresConfirmation: false
      },
      { filePath: storePath }
    );

    const parsed = parseArgv(["app", "init", "--env", "staging"]);
    const context = await resolveTargetContext(parsed, {
      requireOrgApp: true,
      mutatingCommand: true,
      profileStorePath: storePath
    });

    assert.equal(context.profileName, "staging");
    assert.equal(context.backendUrl, "https://staging.convex.site");
    assert.equal(context.orgId, "org_staging");
    assert.equal(context.appId, "app_staging");
  });
});

test("target guard rejects profile mismatch without override", async () => {
  await withTempDir(async (directory) => {
    const storePath = path.join(directory, "profiles.json");

    await upsertProfile(
      {
        name: "staging",
        backendUrl: "https://staging.convex.site",
        appUrl: "",
        defaultOrgId: "org_staging",
        defaultAppId: "app_staging",
        requiresConfirmation: false
      },
      { filePath: storePath }
    );

    const parsed = parseArgv([
      "app",
      "init",
      "--env",
      "staging",
      "--org-id",
      "other_org"
    ]);

    await assert.rejects(
      () =>
        resolveTargetContext(parsed, {
          requireOrgApp: true,
          mutatingCommand: true,
          profileStorePath: storePath
        }),
      /mismatch/
    );
  });
});

test("target guard requires explicit confirmation for prod", async () => {
  await withTempDir(async (directory) => {
    const storePath = path.join(directory, "profiles.json");

    await upsertProfile(
      {
        name: "prod",
        backendUrl: "https://prod.convex.site",
        appUrl: "",
        defaultOrgId: "org_prod",
        defaultAppId: "app_prod",
        requiresConfirmation: true
      },
      { filePath: storePath }
    );

    const unsafe = parseArgv(["app", "connect", "--env", "prod"]);

    await assert.rejects(
      () =>
        resolveTargetContext(unsafe, {
          requireOrgApp: true,
          mutatingCommand: true,
          profileStorePath: storePath
        }),
      /requires confirmation/
    );

    const safe = parseArgv([
      "app",
      "connect",
      "--env",
      "prod",
      "--yes",
      "--confirm-prod",
      "PROD"
    ]);

    const context = await resolveTargetContext(safe, {
      requireOrgApp: true,
      mutatingCommand: true,
      profileStorePath: storePath
    });

    assert.equal(context.profileName, "prod");
  });
});
