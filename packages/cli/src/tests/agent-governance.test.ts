import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgv } from "../core/args";
import { upsertProfile } from "../config/profile-store";
import { handleAgentCatalog } from "../commands/agent/catalog";
import { handleAgentDrift } from "../commands/agent/drift";

async function withTempDir(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "sevenlayers-agent-governance-tests-"));
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

test("agent drift forwards normalized organization scope and emits JSON", async () => {
  await withProfileStore(async () => {
    const parsed = parseArgv([
      "agent",
      "drift",
      "--env",
      "staging",
      "--session-id",
      "sess_123",
      "--template-id",
      "template_1",
      "--template-version-id",
      "version_1",
      "--target-org-id",
      "org_b,org_a",
      "--target-org-id",
      "org_a",
      "--json"
    ]);

    const output = await captureOutput(() =>
      handleAgentDrift(parsed, async (input) => {
        assert.equal(input.execute, true);
        assert.equal(input.functionName, "agentOntology:getTemplateCloneDriftReport");
        assert.deepEqual(input.args, {
          sessionId: "sess_123",
          templateId: "template_1",
          templateVersionId: "version_1",
          targetOrganizationIds: ["org_a", "org_b"]
        });
        return {
          executed: true,
          command: "npx convex run agentOntology:getTemplateCloneDriftReport --args '{...}'",
          stdout: '{"targets":[]}',
          stderr: "",
          parsedJson: { targets: [] }
        };
      })
    );

    assert.equal(output.exitCode, 0);
    const payload = JSON.parse(output.stdout) as Record<string, unknown>;
    assert.equal(payload.success, true);
    assert.deepEqual(payload.targetOrganizationIds, ["org_a", "org_b"]);
  });
});

test("agent drift fails when backend output is not parseable JSON", async () => {
  await withProfileStore(async () => {
    const parsed = parseArgv([
      "agent",
      "drift",
      "--env",
      "staging",
      "--session-id",
      "sess_123",
      "--template-id",
      "template_1",
      "--json"
    ]);

    const output = await captureOutput(() =>
      handleAgentDrift(parsed, async () => ({
        executed: true,
        command: "npx convex run agentOntology:getTemplateCloneDriftReport --args '{...}'",
        stdout: "not-json",
        stderr: "",
        parsedJson: null
      }))
    );

    assert.equal(output.exitCode, 1);
    const payload = JSON.parse(output.stdout) as Record<string, unknown>;
    assert.equal(payload.success, false);
    const issues = payload.issues as string[];
    assert.equal(
      issues.some((issue) => issue.includes("non-JSON drift response")),
      true
    );
  });
});

test("agent catalog defaults to rollout mode", async () => {
  await withProfileStore(async () => {
    const parsed = parseArgv([
      "agent",
      "catalog",
      "--env",
      "staging",
      "--session-id",
      "sess_123",
      "--refresh-nonce",
      "42",
      "--json"
    ]);

    const output = await captureOutput(() =>
      handleAgentCatalog(parsed, async (input) => {
        assert.equal(input.execute, true);
        assert.equal(input.functionName, "agentOntology:listTemplateRolloutOptions");
        assert.deepEqual(input.args, {
          sessionId: "sess_123",
          refreshNonce: 42
        });
        return {
          executed: true,
          command: "npx convex run agentOntology:listTemplateRolloutOptions --args '{...}'",
          stdout: '{"templates":[]}',
          stderr: "",
          parsedJson: { templates: [] }
        };
      })
    );

    assert.equal(output.exitCode, 0);
    const payload = JSON.parse(output.stdout) as Record<string, unknown>;
    assert.equal(payload.success, true);
    assert.equal(payload.mode, "rollout");
  });
});

test("agent catalog lifecycle mode maps to lifecycle function", async () => {
  await withProfileStore(async () => {
    const parsed = parseArgv([
      "agent",
      "catalog",
      "lifecycle",
      "--env",
      "staging",
      "--session-id",
      "sess_123",
      "--json"
    ]);

    const output = await captureOutput(() =>
      handleAgentCatalog(parsed, async (input) => {
        assert.equal(input.functionName, "agentOntology:listTemplateLifecycleOptions");
        assert.deepEqual(input.args, {
          sessionId: "sess_123"
        });
        return {
          executed: true,
          command: "npx convex run agentOntology:listTemplateLifecycleOptions --args '{...}'",
          stdout: '{"templates":[]}',
          stderr: "",
          parsedJson: { templates: [] }
        };
      })
    );

    assert.equal(output.exitCode, 0);
    const payload = JSON.parse(output.stdout) as Record<string, unknown>;
    assert.equal(payload.mode, "lifecycle");
  });
});

test("agent catalog telemetry mode forwards template and limit filters", async () => {
  await withProfileStore(async () => {
    const parsed = parseArgv([
      "agent",
      "catalog",
      "telemetry",
      "--env",
      "staging",
      "--session-id",
      "sess_123",
      "--template-id",
      "template_1",
      "--limit",
      "15",
      "--json"
    ]);

    const output = await captureOutput(() =>
      handleAgentCatalog(parsed, async (input) => {
        assert.equal(input.functionName, "agentOntology:listTemplateDistributionTelemetry");
        assert.deepEqual(input.args, {
          sessionId: "sess_123",
          templateId: "template_1",
          limit: 15
        });
        return {
          executed: true,
          command: "npx convex run agentOntology:listTemplateDistributionTelemetry --args '{...}'",
          stdout: '{"rows":[]}',
          stderr: "",
          parsedJson: { rows: [] }
        };
      })
    );

    assert.equal(output.exitCode, 0);
    const payload = JSON.parse(output.stdout) as Record<string, unknown>;
    assert.equal(payload.mode, "telemetry");
  });
});
