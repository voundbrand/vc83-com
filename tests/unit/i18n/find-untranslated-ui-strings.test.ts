import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import {
  runAudit,
  type AuditReport,
} from "../../../scripts/i18n/find-untranslated-ui-strings";

const EMPTY_BASELINE_REPORT: AuditReport = {
  version: 1,
  scopes: ["builder"],
  filesScanned: 0,
  summary: {
    netFindings: 0,
    allowlisted: 0,
    byScope: { builder: 0, layers: 0, "window-content": 0 },
  },
  findings: [],
  allowlistedFindings: [],
};

function writeWorkspaceFile(
  workspace: string,
  relativePath: string,
  source: string,
): void {
  const filePath = path.join(workspace, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, source, "utf8");
}

describe("find-untranslated-ui-strings", () => {
  it("fails on new findings when fail-on-new is enabled", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "i18n-audit-new-"));
    try {
      writeWorkspaceFile(
        workspace,
        "src/components/builder/sample.tsx",
        "export function Sample() { return <div>Launch builder</div>; }\n",
      );

      const baselinePath = path.join(workspace, "baseline.json");
      writeFileSync(
        baselinePath,
        JSON.stringify(EMPTY_BASELINE_REPORT, null, 2),
      );

      const result = runAudit(
        {
          scopes: ["builder"],
          reportPath: "report.json",
          baselinePath: "baseline.json",
          failOnNew: true,
        },
        workspace,
      );

      expect(result.newFindings.length).toBeGreaterThan(0);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("passes when baseline already contains the findings", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "i18n-audit-base-"));
    try {
      writeWorkspaceFile(
        workspace,
        "src/components/builder/sample.tsx",
        "export function Sample() { return <div>Keep existing debt baseline</div>; }\n",
      );

      const initialRun = runAudit(
        {
          scopes: ["builder"],
          reportPath: "report.json",
          failOnNew: false,
        },
        workspace,
      );

      const baselinePath = path.join(workspace, "baseline.json");
      writeFileSync(
        baselinePath,
        `${JSON.stringify(initialRun.report, null, 2)}\n`,
        "utf8",
      );

      const gatedRun = runAudit(
        {
          scopes: ["builder"],
          reportPath: "report.json",
          baselinePath: "baseline.json",
          failOnNew: true,
        },
        workspace,
      );

      expect(gatedRun.newFindings).toEqual([]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("treats location-only drift as existing baseline debt", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "i18n-audit-drift-"));
    try {
      writeWorkspaceFile(
        workspace,
        "src/components/builder/sample.tsx",
        "export function Sample() { return <div>Keep baseline copy</div>; }\n",
      );

      const baselinePath = path.join(workspace, "baseline.json");
      writeFileSync(
        baselinePath,
        JSON.stringify(
          {
            ...EMPTY_BASELINE_REPORT,
            findings: [
              {
                scope: "builder",
                file: "src/components/builder/sample.tsx",
                line: 999,
                column: 999,
                kind: "jsx_text",
                text: "Keep baseline copy",
              },
            ],
          },
          null,
          2,
        ),
        "utf8",
      );

      const result = runAudit(
        {
          scopes: ["builder"],
          baselinePath: "baseline.json",
          failOnNew: true,
        },
        workspace,
      );

      expect(result.newFindings).toEqual([]);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("keeps allowlisted findings explicit in the report", () => {
    const workspace = mkdtempSync(path.join(tmpdir(), "i18n-audit-allow-"));
    try {
      writeWorkspaceFile(
        workspace,
        "src/components/builder/builder-chat-panel.tsx",
        "export function BuilderChatPanel() { return <div>JSON</div>; }\n",
      );

      const result = runAudit(
        {
          scopes: ["builder"],
          reportPath: "report.json",
          failOnNew: false,
        },
        workspace,
      );

      const reportPath = path.join(workspace, "report.json");
      writeFileSync(
        reportPath,
        `${JSON.stringify(result.report, null, 2)}\n`,
        "utf8",
      );

      const report = JSON.parse(readFileSync(reportPath, "utf8")) as AuditReport;
      expect(report.summary.netFindings).toBe(0);
      expect(report.summary.allowlisted).toBeGreaterThan(0);
      expect(report.findings).toEqual([]);
      expect(
        report.allowlistedFindings.some(
          (finding) =>
            finding.text === "JSON" &&
            finding.allowlistReason === "Canonical technical token.",
        ),
      ).toBe(true);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});
