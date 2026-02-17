import { describe, expect, it } from "vitest";
import { shouldRequireToolApproval } from "../../../convex/ai/escalation";
import { resolveChatToolApprovalPolicy } from "../../../convex/ai/chat";

describe("tool approval policy", () => {
  it("requires approval in supervised mode", () => {
    expect(
      shouldRequireToolApproval({
        autonomyLevel: "supervised",
        toolName: "list_forms",
      })
    ).toBe(true);
  });

  it("respects requireApprovalFor in autonomous mode", () => {
    expect(
      shouldRequireToolApproval({
        autonomyLevel: "autonomous",
        toolName: "process_payment",
        requireApprovalFor: ["process_payment"],
      })
    ).toBe(true);

    expect(
      shouldRequireToolApproval({
        autonomyLevel: "autonomous",
        toolName: "list_forms",
        requireApprovalFor: ["process_payment"],
      })
    ).toBe(false);
  });

  it("never requires approval in draft-only mode", () => {
    expect(
      shouldRequireToolApproval({
        autonomyLevel: "draft_only",
        toolName: "process_payment",
        requireApprovalFor: ["process_payment"],
      })
    ).toBe(false);
  });

  it("maps chat approval settings to the shared policy modes", () => {
    const supervised = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: true,
      toolApprovalMode: "all",
    });
    expect(supervised.autonomyLevel).toBe("supervised");

    const dangerous = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: true,
      toolApprovalMode: "dangerous",
    });
    expect(dangerous.autonomyLevel).toBe("autonomous");
    expect(dangerous.requireApprovalFor).toContain("process_payment");
    expect(dangerous.requireApprovalFor).not.toContain("list_forms");

    const none = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: false,
      toolApprovalMode: "none",
    });
    expect(none.autonomyLevel).toBe("autonomous");
    expect(none.requireApprovalFor).toEqual([]);
  });
});
