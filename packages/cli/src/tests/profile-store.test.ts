import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getActiveProfile,
  loadProfileStore,
  setActiveProfile,
  upsertProfile
} from "../config/profile-store";

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sevenlayers-profile-store-"));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("profile store initializes defaults and persists active profile", async () => {
  await withTempDir(async (directory) => {
    const storePath = path.join(directory, "profiles.json");

    const first = await loadProfileStore({ filePath: storePath });
    assert.equal(first.activeProfile, "local");
    assert.ok(first.profiles.local);
    assert.ok(first.profiles.staging);
    assert.ok(first.profiles.prod);

    await upsertProfile(
      {
        name: "staging",
        backendUrl: "https://staging.convex.site",
        appUrl: "https://staging.app.sevenlayers.io",
        defaultOrgId: "org_staging",
        defaultAppId: "app_staging",
        requiresConfirmation: false
      },
      { filePath: storePath }
    );

    await setActiveProfile("staging", { filePath: storePath });
    const active = await getActiveProfile({ filePath: storePath });

    assert.equal(active.name, "staging");
    assert.equal(active.backendUrl, "https://staging.convex.site");
    assert.equal(active.defaultOrgId, "org_staging");
    assert.equal(active.defaultAppId, "app_staging");
  });
});
