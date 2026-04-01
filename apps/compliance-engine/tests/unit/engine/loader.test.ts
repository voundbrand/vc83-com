import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { loadFrameworks } from "../../../server/engine/loader.js";

const FRAMEWORKS_DIR = resolve(
  import.meta.dirname ?? new URL(".", import.meta.url).pathname,
  "..",
  "..",
  "..",
  "frameworks",
);

describe("YAML framework loader", () => {
  it("loads GDPR framework", () => {
    const frameworks = loadFrameworks(FRAMEWORKS_DIR, ["gdpr"]);
    expect(frameworks).toHaveLength(1);
    expect(frameworks[0].meta.id).toBe("gdpr");
    expect(frameworks[0].meta.name).toBe("GDPR / DSGVO");
  });

  it("loads GDPR rules from multiple YAML files", () => {
    const frameworks = loadFrameworks(FRAMEWORKS_DIR, ["gdpr"]);
    const gdpr = frameworks[0];

    // Should have rules from consent, minimization, transfer, special_categories, rights
    expect(gdpr.rules.length).toBeGreaterThanOrEqual(5);

    // Check specific rules exist
    const ruleIds = gdpr.rules.map((r) => r.id);
    expect(ruleIds).toContain("gdpr.consent.data_processing");
    expect(ruleIds).toContain("gdpr.minimization.purpose_stated");
    expect(ruleIds).toContain("gdpr.transfer.provider_dpa");
    expect(ruleIds).toContain("gdpr.special.health_data");
    expect(ruleIds).toContain("gdpr.rights.subject_registered");
  });

  it("only loads enabled frameworks", () => {
    const frameworks = loadFrameworks(FRAMEWORKS_DIR, ["nonexistent_framework"]);
    expect(frameworks).toHaveLength(0);
  });

  it("loads §203 StGB framework with rules", () => {
    const frameworks = loadFrameworks(FRAMEWORKS_DIR, ["stgb_203"]);
    expect(frameworks).toHaveLength(1);
    expect(frameworks[0].meta.id).toBe("stgb_203");
    expect(frameworks[0].rules.length).toBeGreaterThanOrEqual(2);
  });

  it("loads all four frameworks when enabled", () => {
    const frameworks = loadFrameworks(FRAMEWORKS_DIR, [
      "gdpr", "stgb_203", "stberg_62a", "ai_act",
    ]);
    expect(frameworks).toHaveLength(4);
    const ids = frameworks.map((f) => f.meta.id);
    expect(ids).toContain("gdpr");
    expect(ids).toContain("stgb_203");
    expect(ids).toContain("stberg_62a");
    expect(ids).toContain("ai_act");
  });

  it("returns empty array for nonexistent directory", () => {
    const frameworks = loadFrameworks("/nonexistent", ["gdpr"]);
    expect(frameworks).toHaveLength(0);
  });

  it("each rule has required fields", () => {
    const frameworks = loadFrameworks(FRAMEWORKS_DIR, ["gdpr"]);
    for (const rule of frameworks[0].rules) {
      expect(rule.id).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(rule.severity).toBeTruthy();
      expect(rule.condition).toBeTruthy();
      expect(rule.action).toBeTruthy();
    }
  });
});
