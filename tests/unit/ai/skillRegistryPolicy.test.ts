import { describe, expect, it } from "vitest";
import {
  getExternalSendSkillToolNames,
  getSkillsRequiringHumanApproval,
  isExternalSendSkillTool,
  resolveKanzleiApprovedExternalToolNames,
} from "../../../convex/ai/skills";

describe("skill registry compliance policy helpers", () => {
  it("returns a deterministic external-send tool set", () => {
    expect(getExternalSendSkillToolNames()).toEqual([
      "create_checkout_page",
      "enable_workflow",
      "manage_sequences",
    ]);
  });

  it("flags only external-send tools as external dispatch risk", () => {
    expect(isExternalSendSkillTool("manage_sequences")).toBe(true);
    expect(isExternalSendSkillTool("create_form")).toBe(false);
  });

  it("resolves approved external tools from explicit tools and approved skills", () => {
    expect(
      resolveKanzleiApprovedExternalToolNames({
        approvedToolNames: [" manage_sequences "],
        approvedSkillIds: ["create_checkout", "ACTIVATE_WORKFLOW", "unknown_skill"],
      }),
    ).toEqual([
      "create_checkout_page",
      "enable_workflow",
      "manage_sequences",
    ]);
  });

  it("keeps human-approval skill list deterministic", () => {
    const skills = getSkillsRequiringHumanApproval();
    expect(skills.length).toBeGreaterThan(0);
    expect(skills).toEqual([...skills].sort((left, right) => left.localeCompare(right)));
  });
});
