import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgv } from "../core/args";
import { handleCmsDoctor } from "../commands/cms/doctor";
import { handleCmsMigrate } from "../commands/cms/migrate";
import { handleCmsSeed } from "../commands/cms/seed";

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sevenlayers-cms-ops-"));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
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
    return { exitCode, stdout: stdoutLines.join("\n") };
  } finally {
    console.log = originalLog;
  }
}

test("cms migrate legacy emits dry-run summary for migrated content", async () => {
  await withTempDir(async (directory) => {
    const legacyPath = path.join(directory, "legacy.json");
    await fs.writeFile(
      legacyPath,
      JSON.stringify(
        {
          en: {
            "hero.title": "Hello",
            "hero.subtitle": "Welcome"
          },
          de: {
            "hero.title": "Hallo",
            "hero.subtitle": "Willkommen"
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const parsed = parseArgv([
      "cms",
      "migrate",
      "legacy",
      "--in",
      legacyPath,
      "--json"
    ]);
    const output = await captureOutput(() => handleCmsMigrate(parsed));
    assert.equal(output.exitCode, 0);
    const payload = JSON.parse(output.stdout) as Record<string, unknown>;
    const summary = payload.summary as Record<string, unknown>;
    assert.equal(summary.entries, 4);
    assert.equal(summary.locales, 2);
    assert.equal(summary.lookupKeys, 2);
  });
});

test("cms seed supports locale + field parity dry-run summary", async () => {
  const parsed = parseArgv([
    "cms",
    "seed",
    "--locale",
    "en",
    "--locale",
    "de",
    "--field",
    "hero.title",
    "--value",
    "en:hero.title:Hello",
    "--value",
    "de:hero.title:Hallo",
    "--json"
  ]);

  const output = await captureOutput(() => handleCmsSeed(parsed));
  assert.equal(output.exitCode, 0);
  const payload = JSON.parse(output.stdout) as Record<string, unknown>;
  const summary = payload.summary as Record<string, unknown>;
  assert.equal(summary.entries, 2);
  assert.equal(summary.locales, 2);
  assert.equal(summary.lookupKeys, 1);
  assert.equal(summary.parityComplete, true);
});

test("cms doctor reports parity failures with non-zero exit code", async () => {
  await withTempDir(async (directory) => {
    const contentPath = path.join(directory, "content.json");
    await fs.writeFile(
      contentPath,
      JSON.stringify(
        {
          schemaVersion: "sevenlayers.cms.content.v1",
          generatedAt: new Date().toISOString(),
          source: "test",
          entries: [
            {
              locale: "en",
              lookupKey: "hero.title",
              value: "Hello"
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const parsed = parseArgv([
      "cms",
      "doctor",
      "--in",
      contentPath,
      "--require-locale",
      "de",
      "--json"
    ]);
    const output = await captureOutput(() => handleCmsDoctor(parsed));
    assert.equal(output.exitCode, 1);
    const payload = JSON.parse(output.stdout) as Record<string, unknown>;
    assert.equal(payload.success, false);
    const summary = payload.summary as Record<string, unknown>;
    assert.equal(Number(summary.issues) > 0, true);
  });
});
