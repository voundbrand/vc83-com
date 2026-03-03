import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const GATES_SCRIPT = path.resolve(
  process.cwd(),
  "scripts/ci/check-agent-runtime-dev-gates.sh",
);

const PACKAGE_JSON = path.resolve(process.cwd(), "package.json");

describe("agent runtime DEV gates script", () => {
  it("wires only define->warmup stage scripts with explicit deterministic mapping", () => {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["agent-runtime:dev:gates"]).toBe(
      "bash scripts/ci/check-agent-runtime-dev-gates.sh",
    );
    expect(packageJson.scripts["agent-runtime:dev:stage1:spec-lint"]).toBe(
      "npm run typecheck && npm run docs:guard",
    );
    expect(packageJson.scripts["agent-runtime:dev:stage2:compile-determinism"]).toBe(
      "npx tsc -p convex/tsconfig.json --noEmit",
    );
    expect(packageJson.scripts["agent-runtime:dev:stage3:contract-tests"]).toBe(
      "npm run test:unit -- tests/unit/ai/auditDeliverableGuardrail.test.ts tests/unit/ai/actionCompletionMismatchTelemetry.test.ts tests/unit/ai/runtimeIncidentAlerts.test.ts tests/unit/ai/toolScopingPolicyAudit.test.ts && npm run qa:telemetry:guard",
    );
    expect(packageJson.scripts["agent-runtime:dev:stage4:synthetic-warmup"]).toBe(
      "npm run test:unit -- tests/unit/shell/webchat-deployment-flow.smoke.test.ts && npm run test:integration -- tests/integration/onboarding/universalOnboardingIngress.phase5.integration.test.ts",
    );
  });

  it("is deterministic across repeated dry-runs and excludes release-stage logic", () => {
    const firstRun = spawnSync("bash", [GATES_SCRIPT], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AGENT_RUNTIME_DEV_GATES_DRY_RUN: "1",
      },
    });

    const secondRun = spawnSync("bash", [GATES_SCRIPT], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        AGENT_RUNTIME_DEV_GATES_DRY_RUN: "1",
      },
    });

    expect(firstRun.error).toBeUndefined();
    expect(secondRun.error).toBeUndefined();
    expect(firstRun.status).toBe(0);
    expect(secondRun.status).toBe(0);
    expect(firstRun.stderr).toBe("");
    expect(secondRun.stderr).toBe("");
    expect(firstRun.stdout).toBe(secondRun.stdout);

    const stageLines = firstRun.stdout
      .split("\n")
      .filter((line) => line.includes("[check-agent-runtime-dev-gates] stage-"));

    expect(stageLines).toEqual([
      "[check-agent-runtime-dev-gates] stage-1-spec-lint: npm run agent-runtime:dev:stage1:spec-lint",
      "[check-agent-runtime-dev-gates] stage-2-compile-determinism: npm run agent-runtime:dev:stage2:compile-determinism",
      "[check-agent-runtime-dev-gates] stage-3-contract-tests: npm run agent-runtime:dev:stage3:contract-tests",
      "[check-agent-runtime-dev-gates] stage-4-synthetic-warmup: npm run agent-runtime:dev:stage4:synthetic-warmup",
    ]);

    expect(firstRun.stdout).toContain("scope=dev pipeline=define-to-warmup");
    expect(firstRun.stdout).toContain("mode=dry-run");
    expect(firstRun.stdout).toContain(
      "excluded=stage-5-canary,stage-6-promotion,migration,cutover,rollback",
    );
    expect(firstRun.stdout).toContain("completed stages=4");
    expect(firstRun.stdout).not.toContain("[check-agent-runtime-dev-gates] stage-5:");
    expect(firstRun.stdout).not.toContain("[check-agent-runtime-dev-gates] stage-6:");
  });
});
