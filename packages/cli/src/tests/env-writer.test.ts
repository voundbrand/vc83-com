import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeEnvFile } from "../config/env-writer";

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sevenlayers-cli-"));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test("upsert mode preserves existing unmanaged and managed values", async () => {
  await withTempDir(async (directory) => {
    const envFile = path.join(directory, ".env.local");
    const before = [
      "# Existing file",
      "KEEP_ME=1",
      "L4YERCAK3_API_KEY=old_key",
      "NEXT_PUBLIC_CUSTOM=abc",
      ""
    ].join("\n");
    await fs.writeFile(envFile, before, "utf8");

    const result = await writeEnvFile(
      envFile,
      [
        { key: "L4YERCAK3_API_KEY", value: "new_key" },
        { key: "L4YERCAK3_BACKEND_URL", value: "https://example.convex.site" }
      ],
      { mode: "upsert" }
    );

    assert.equal(result.applied, true);
    const after = await fs.readFile(envFile, "utf8");

    assert.match(after, /KEEP_ME=1/);
    assert.match(after, /NEXT_PUBLIC_CUSTOM=abc/);
    assert.match(after, /L4YERCAK3_API_KEY=old_key/);
    assert.match(after, /L4YERCAK3_BACKEND_URL=https:\/\/example\.convex\.site/);

    const skip = result.changes.find((change) => change.key === "L4YERCAK3_API_KEY");
    assert.equal(skip?.type, "skip-existing");
  });
});

test("replace-key mode updates managed key without deleting unknown keys", async () => {
  await withTempDir(async (directory) => {
    const envFile = path.join(directory, ".env.local");
    await fs.writeFile(envFile, "KEEP_ME=1\nL4YERCAK3_API_KEY=old_key\n", "utf8");

    const result = await writeEnvFile(
      envFile,
      [{ key: "L4YERCAK3_API_KEY", value: "new_key" }],
      { mode: "replace-key" }
    );

    assert.equal(result.applied, true);
    const after = await fs.readFile(envFile, "utf8");
    assert.match(after, /KEEP_ME=1/);
    assert.match(after, /L4YERCAK3_API_KEY=new_key/);
  });
});

test("full-rewrite mode requires explicit guard", async () => {
  await withTempDir(async (directory) => {
    const envFile = path.join(directory, ".env.local");
    await fs.writeFile(envFile, "KEEP_ME=1\n", "utf8");

    await assert.rejects(
      () =>
        writeEnvFile(
          envFile,
          [{ key: "L4YERCAK3_API_KEY", value: "new_key" }],
          { mode: "full-rewrite" }
        ),
      /full-rewrite mode is blocked/
    );

    const result = await writeEnvFile(
      envFile,
      [{ key: "L4YERCAK3_API_KEY", value: "new_key" }],
      { mode: "full-rewrite", allowFullRewrite: true }
    );

    assert.equal(result.applied, true);
    const after = await fs.readFile(envFile, "utf8");
    assert.equal(after, "L4YERCAK3_API_KEY=new_key\n");
  });
});

test("dry-run reports changes without writing", async () => {
  await withTempDir(async (directory) => {
    const envFile = path.join(directory, ".env.local");
    await fs.writeFile(envFile, "KEEP_ME=1\n", "utf8");

    const result = await writeEnvFile(
      envFile,
      [{ key: "L4YERCAK3_BACKEND_URL", value: "https://example.convex.site" }],
      { mode: "upsert", dryRun: true }
    );

    assert.equal(result.applied, false);
    const after = await fs.readFile(envFile, "utf8");
    assert.equal(after, "KEEP_ME=1\n");
    assert.ok(result.nextContent.includes("L4YERCAK3_BACKEND_URL=https://example.convex.site"));
  });
});

test("write creates backup for existing file", async () => {
  await withTempDir(async (directory) => {
    const envFile = path.join(directory, ".env.local");
    await fs.writeFile(envFile, "L4YERCAK3_API_KEY=old\n", "utf8");

    const result = await writeEnvFile(
      envFile,
      [{ key: "L4YERCAK3_API_KEY", value: "new" }],
      { mode: "replace-key" }
    );

    assert.equal(result.applied, true);
    assert.ok(result.backupPath);

    const backup = await fs.readFile(result.backupPath!, "utf8");
    assert.equal(backup, "L4YERCAK3_API_KEY=old\n");
  });
});
