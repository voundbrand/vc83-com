import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { runNamespaceLoadBudgetAudit } from "../../../scripts/i18n/check-namespace-load-budget";

function writeWorkspaceFile(
  workspace: string,
  relativePath: string,
  source: string,
): void {
  const filePath = path.join(workspace, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, source, "utf8");
}

function seedSource(keys: string[]): string {
  const rows = keys
    .map(
      (key, index) =>
        `  { key: "${key}", values: { en: "value_${index}" } },`,
    )
    .join("\n");
  return `export const seed = [\n${rows}\n];\n`;
}

describe("check-namespace-load-budget", () => {
  it("passes when namespace usage stays within budget", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "i18n-budget-pass-"));
    try {
      writeWorkspaceFile(
        workspace,
        "src/components/example.tsx",
        "export function Example() { useNamespaceTranslations(\"ui.small\"); return null; }\n",
      );
      writeWorkspaceFile(
        workspace,
        "convex/translations/seedSmall.ts",
        seedSource(["ui.small.one", "ui.small.two"]),
      );

      const result = runNamespaceLoadBudgetAudit(
        {
          srcDir: "src",
          seedDir: "convex/translations",
          maxSingle: 5,
          maxCombined: 8,
        },
        workspace,
      );

      expect(result.singleViolations).toEqual([]);
      expect(result.multiViolations).toEqual([]);
      expect(result.namespaceCounts[0]?.namespace).toBe("ui.small");
      expect(result.namespaceCounts[0]?.count).toBe(2);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("fails when a single namespace exceeds the per-namespace limit", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "i18n-budget-single-"));
    try {
      writeWorkspaceFile(
        workspace,
        "src/components/example.tsx",
        "export function Example() { useNamespaceTranslations(\"ui.big\"); return null; }\n",
      );
      writeWorkspaceFile(
        workspace,
        "convex/translations/seedBig.ts",
        seedSource(["ui.big.one", "ui.big.two", "ui.big.three"]),
      );

      const result = runNamespaceLoadBudgetAudit(
        {
          srcDir: "src",
          seedDir: "convex/translations",
          maxSingle: 2,
          maxCombined: 10,
        },
        workspace,
      );

      expect(result.singleViolations).toHaveLength(1);
      expect(result.singleViolations[0]?.namespace).toBe("ui.big");
      expect(result.singleViolations[0]?.count).toBe(3);
      expect(result.multiViolations).toEqual([]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("fails when combined multi-namespace load exceeds the combined limit", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "i18n-budget-multi-"));
    try {
      writeWorkspaceFile(
        workspace,
        "src/components/example.tsx",
        "export function Example() { useMultipleNamespaces([\"ui.alpha\", \"ui.beta\"]); return null; }\n",
      );
      writeWorkspaceFile(
        workspace,
        "convex/translations/seedMulti.ts",
        seedSource([
          "ui.alpha.one",
          "ui.alpha.two",
          "ui.beta.one",
          "ui.beta.two",
        ]),
      );

      const result = runNamespaceLoadBudgetAudit(
        {
          srcDir: "src",
          seedDir: "convex/translations",
          maxSingle: 10,
          maxCombined: 3,
        },
        workspace,
      );

      expect(result.singleViolations).toEqual([]);
      expect(result.multiViolations).toHaveLength(1);
      expect(result.multiViolations[0]?.namespaces).toEqual([
        "ui.alpha",
        "ui.beta",
      ]);
      expect(result.multiViolations[0]?.count).toBe(4);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
