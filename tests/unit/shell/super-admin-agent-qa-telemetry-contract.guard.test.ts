import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const GUARD_SCRIPT = path.resolve(
  process.cwd(),
  "scripts/ci/check-super-admin-qa-telemetry-contract.sh",
);
const PACKAGE_JSON = path.resolve(process.cwd(), "package.json");

describe("super-admin QA telemetry contract guard", () => {
  it("wires npm scripts to run the QA telemetry guard in stage 3", () => {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, "utf8")) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts["qa:telemetry:guard"]).toBe(
      "bash scripts/ci/check-super-admin-qa-telemetry-contract.sh",
    );
    expect(packageJson.scripts["agent-runtime:dev:stage3:contract-tests"]).toContain(
      "npm run qa:telemetry:guard",
    );
  });

  it("passes deterministically and reports checked token counts", () => {
    const firstRun = spawnSync("bash", [GUARD_SCRIPT], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    const secondRun = spawnSync("bash", [GUARD_SCRIPT], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(firstRun.error).toBeUndefined();
    expect(secondRun.error).toBeUndefined();
    expect(firstRun.status).toBe(0);
    expect(secondRun.status).toBe(0);
    expect(firstRun.stderr).toBe("");
    expect(secondRun.stderr).toBe("");
    expect(firstRun.stdout).toBe(secondRun.stdout);
    expect(firstRun.stdout).toContain("check-super-admin-qa-telemetry-contract");
    expect(firstRun.stdout).toContain("checked emitter_tokens=");
    expect(firstRun.stdout).toContain("contract_tokens=");
    expect(firstRun.stdout).toContain("formatter_tokens=");
  });
});
