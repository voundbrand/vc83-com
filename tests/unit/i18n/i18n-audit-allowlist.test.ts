import { describe, expect, it } from "vitest";

import { I18N_AUDIT_ALLOWLIST } from "../../../scripts/i18n/i18n-audit-allowlist";

describe("i18n audit allowlist", () => {
  it("keeps exceptions explicit and deterministic", () => {
    const normalized = I18N_AUDIT_ALLOWLIST.map((entry) => ({
      scope: entry.scope,
      filePattern: entry.filePattern.source,
      kind: entry.kind ?? null,
      attributeName: entry.attributeName ?? null,
      callName: entry.callName ?? null,
      text: entry.text,
      reason: entry.reason,
    }));

    expect(normalized).toEqual([
      {
        scope: "builder",
        filePattern: "^src\\/components\\/builder\\/builder-chat-panel\\.tsx$",
        kind: "jsx_text",
        attributeName: null,
        callName: null,
        text: "v0",
        reason: "Third-party product brand (v0.dev) should remain unchanged.",
      },
      {
        scope: "builder",
        filePattern: "^src\\/components\\/builder\\/builder-chat-panel\\.tsx$",
        kind: "jsx_text",
        attributeName: null,
        callName: null,
        text: "JSON",
        reason: "Canonical technical token.",
      },
      {
        scope: "builder",
        filePattern: "^src\\/(app|components)\\/builder\\/.*\\.tsx$",
        kind: "jsx_attribute",
        attributeName: "placeholder",
        callName: null,
        text: "https://example.com",
        reason: "Standard URL example placeholder.",
      },
      {
        scope: "window-content",
        filePattern:
          "^src\\/components\\/window-content\\/payments-window\\/.*\\.tsx$",
        kind: null,
        attributeName: null,
        callName: null,
        text: "Stripe",
        reason: "External provider brand name.",
      },
      {
        scope: "builder",
        filePattern: "^src\\/components\\/builder\\/.*\\.tsx$",
        kind: null,
        attributeName: null,
        callName: null,
        text: "GitHub",
        reason: "External provider brand name.",
      },
    ]);
  });

  it("requires anchored and non-duplicated entries", () => {
    const signatures = new Set<string>();

    for (const entry of I18N_AUDIT_ALLOWLIST) {
      expect(entry.text.trim().length).toBeGreaterThan(0);
      expect(entry.reason.trim().length).toBeGreaterThanOrEqual(12);
      expect(entry.filePattern.source.startsWith("^")).toBe(true);
      expect(entry.filePattern.source.endsWith("$")).toBe(true);

      const signature = [
        entry.scope,
        entry.filePattern.source,
        entry.kind ?? "",
        entry.attributeName ?? "",
        entry.callName ?? "",
        entry.text,
      ].join("|");

      expect(signatures.has(signature)).toBe(false);
      signatures.add(signature);
    }
  });
});
