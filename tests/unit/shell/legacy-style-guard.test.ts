import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const LEGACY_GUARD_SCRIPT = path.resolve(
  process.cwd(),
  "scripts/ci/check-legacy-style-introductions.sh",
);

const CREATED_REPOS: string[] = [];

function runCommand(args: string[], cwd: string) {
  const result = spawnSync(args[0], args.slice(1), {
    cwd,
    encoding: "utf8",
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function writeWorkspaceFile(repoPath: string, relativePath: string, content: string) {
  const absolutePath = path.join(repoPath, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
}

function initFixtureRepo(baseFiles: Record<string, string>, headFiles: Record<string, string>) {
  const repoPath = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-style-guard-"));
  CREATED_REPOS.push(repoPath);

  runCommand(["git", "init", "-q"], repoPath);
  runCommand(["git", "config", "user.email", "legacy-style-guard@example.com"], repoPath);
  runCommand(["git", "config", "user.name", "Legacy Style Guard Tests"], repoPath);

  for (const [relativePath, content] of Object.entries(baseFiles)) {
    writeWorkspaceFile(repoPath, relativePath, content);
  }

  runCommand(["git", "add", "."], repoPath);
  runCommand(["git", "commit", "-qm", "base"], repoPath);
  const baseSha = runCommand(["git", "rev-parse", "HEAD"], repoPath).stdout.trim();

  for (const [relativePath, content] of Object.entries(headFiles)) {
    writeWorkspaceFile(repoPath, relativePath, content);
  }

  runCommand(["git", "add", "."], repoPath);
  runCommand(["git", "commit", "-qm", "head"], repoPath);
  const headSha = runCommand(["git", "rev-parse", "HEAD"], repoPath).stdout.trim();

  return { baseSha, headSha, repoPath };
}

function runGuard(repoPath: string, baseSha: string, headSha: string) {
  return runCommand(["bash", LEGACY_GUARD_SCRIPT, baseSha, headSha], repoPath);
}

afterEach(() => {
  while (CREATED_REPOS.length > 0) {
    const repoPath = CREATED_REPOS.pop();
    if (repoPath) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  }
});

describe("legacy style guard", () => {
  it("passes for non-legacy scoped additions", () => {
    const { repoPath, baseSha, headSha } = initFixtureRepo(
      {
        "src/app/page.tsx":
          "export default function Page() {\n  return <main className=\"bg-neutral-900\">ok</main>;\n}\n",
      },
      {
        "src/app/page.tsx":
          "export default function Page() {\n  return <main className=\"bg-stone-900\">ok</main>;\n}\n",
      },
    );

    const result = runGuard(repoPath, baseSha, headSha);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(
      "Legacy style guard passed (no new legacy indicators introduced).",
    );
  });

  it("fails when retro-button is introduced and reports line-level output", () => {
    const { repoPath, baseSha, headSha } = initFixtureRepo(
      {
        "src/app/page.tsx":
          "export default function Page() {\n  return <main className=\"bg-neutral-900\">ok</main>;\n}\n",
      },
      {
        "src/app/page.tsx":
          "export default function Page() {\n  return <main className=\"retro-button\">ok</main>;\n}\n",
      },
    );

    const result = runGuard(repoPath, baseSha, headSha);

    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain(
      "- src/app/page.tsx:2:   return <main className=\"retro-button\">ok</main>;",
    );
    expect(result.stdout).toContain("Blocked patterns:");
  });

  it("applies shade-class matching with deterministic boundaries", () => {
    const matchFixture = initFixtureRepo(
      {
        "src/app/page.tsx":
          "export default function Page() {\n  return <main className=\"bg-neutral-900\">ok</main>;\n}\n",
      },
      {
        "src/app/page.tsx":
          "export default function Page() {\n  return <main className=\"zinc-500\">ok</main>;\n}\n",
      },
    );

    const matchingResult = runGuard(
      matchFixture.repoPath,
      matchFixture.baseSha,
      matchFixture.headSha,
    );

    expect(matchingResult.status).toBe(1);
    expect(matchingResult.stdout).toContain("zinc-500");

    const nonMatchFixture = initFixtureRepo(
      {
        "src/app/page.tsx":
          "export default function Page() {\n  return <main className=\"bg-neutral-900\">ok</main>;\n}\n",
      },
      {
        "src/app/page.tsx":
          "export default function Page() {\n  return <main className=\"zinc-5000\">ok</main>;\n}\n",
      },
    );

    const nonMatchingResult = runGuard(
      nonMatchFixture.repoPath,
      nonMatchFixture.baseSha,
      nonMatchFixture.headSha,
    );

    expect(nonMatchingResult.status).toBe(0);
    expect(nonMatchingResult.stdout).toContain(
      "Legacy style guard passed (no new legacy indicators introduced).",
    );
  });

  it("keeps violation output deterministic across repeated runs (smoke)", () => {
    const { repoPath, baseSha, headSha } = initFixtureRepo(
      {
        "src/app/globals.css": ":root {\n  --tone-surface: #111111;\n}\n",
        "src/app/page.tsx":
          "export default function Page() {\n  return <main className=\"bg-neutral-900\">ok</main>;\n}\n",
      },
      {
        "src/app/globals.css":
          ":root {\n  --tone-surface: #111111;\n  --win95-bg: #000000;\n}\n",
        "src/app/page.tsx":
          "export default function Page() {\n  return <main className=\"retro-button-small\">ok</main>;\n}\n",
      },
    );

    const firstRun = runGuard(repoPath, baseSha, headSha);
    const secondRun = runGuard(repoPath, baseSha, headSha);

    expect(firstRun.status).toBe(1);
    expect(secondRun.status).toBe(1);
    expect(firstRun.stderr).toBe("");
    expect(secondRun.stderr).toBe("");
    expect(firstRun.stdout).toBe(secondRun.stdout);
    expect(firstRun.stdout).not.toContain("awk: syntax error");

    const violations = firstRun.stdout
      .split("\n")
      .filter((line) => line.startsWith("- src/"));

    expect(violations[0]).toContain("src/app/globals.css");
    expect(violations[1]).toContain("src/app/page.tsx");
  });
});
