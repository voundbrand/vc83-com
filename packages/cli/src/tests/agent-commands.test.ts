import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgv } from "../core/args";
import { upsertProfile } from "../config/profile-store";
import { handleAgentInit } from "../commands/agent/init";
import { handleAgentPermissions } from "../commands/agent/permissions";
import { handleAgentTemplate } from "../commands/agent/template";

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sevenlayers-agent-tests-"));
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

test("agent init defaults to dry-run and emits deterministic JSON", async () => {
  await withProfileStore(async () => {
    let invoked = false;
    const parsed = parseArgv([
      "agent",
      "init",
      "--env",
      "staging",
      "--name",
      "Ops Agent",
      "--json"
    ]);

    const output = await captureOutput(() =>
      handleAgentInit(parsed, async (input) => {
        invoked = true;
        assert.equal(input.execute, false);
        assert.equal(input.functionName, "ai/soulGenerator:bootstrapAgent");
        return {
          executed: false,
          command: "npx convex run ai/soulGenerator:bootstrapAgent --args '{...}'",
          stdout: "",
          stderr: "",
          parsedJson: null
        };
      })
    );

    assert.equal(output.exitCode, 0);
    assert.equal(invoked, true);
    const payload = JSON.parse(output.stdout) as Record<string, unknown>;
    assert.equal(payload.executed, false);
  });
});

test("agent template apply uses preview mutation in dry-run mode", async () => {
  await withProfileStore(async () => {
    await withTempDir(async (directory) => {
      const patchFile = path.join(directory, "patch.json");
      await fs.writeFile(
        patchFile,
        JSON.stringify({ displayName: "Updated Agent" }, null, 2),
        "utf8"
      );

      const parsed = parseArgv([
        "agent",
        "template",
        "apply",
        "--env",
        "staging",
        "--session-id",
        "sess_123",
        "--agent-id",
        "agent_1",
        "--patch-file",
        patchFile,
        "--json"
      ]);

      const output = await captureOutput(() =>
        handleAgentTemplate(parsed, async (input) => {
          assert.equal(input.execute, false);
          assert.equal(input.functionName, "agentOntology:previewAgentFieldPatch");
          return {
            executed: false,
            command: "npx convex run agentOntology:previewAgentFieldPatch --args '{...}'",
            stdout: "",
            stderr: "",
            parsedJson: null
          };
        })
      );

      assert.equal(output.exitCode, 0);
      const payload = JSON.parse(output.stdout) as Record<string, unknown>;
      assert.equal(payload.executed, false);
    });
  });
});

test("agent permissions check reports missing session in dry-run", async () => {
  await withProfileStore(async () => {
    const parsed = parseArgv([
      "agent",
      "permissions",
      "check",
      "--env",
      "staging",
      "--agent-id",
      "agent_1",
      "--dry-run",
      "--json"
    ]);

    const output = await captureOutput(() => handleAgentPermissions(parsed));
    assert.equal(output.exitCode, 1);
    const payload = JSON.parse(output.stdout) as Record<string, unknown>;
    assert.equal(payload.success, false);
  });
});

test("agent permissions check executes backend probe when dry-run is disabled", async () => {
  await withProfileStore(async () => {
    const parsed = parseArgv([
      "agent",
      "permissions",
      "check",
      "--env",
      "staging",
      "--session-id",
      "sess_123",
      "--agent-id",
      "agent_1",
      "--json"
    ]);

    const output = await captureOutput(() =>
      handleAgentPermissions(parsed, async (input) => {
        assert.equal(input.execute, true);
        assert.equal(input.functionName, "agentOntology:getAgent");
        return {
          executed: true,
          command: "npx convex run agentOntology:getAgent --args '{...}'",
          stdout: '{"organizationId":"org_staging"}',
          stderr: "",
          parsedJson: { organizationId: "org_staging" }
        };
      })
    );

    assert.equal(output.exitCode, 0);
    const payload = JSON.parse(output.stdout) as Record<string, unknown>;
    assert.equal(payload.success, true);
  });
});
