import { describe, expect, it } from "vitest";

import {
  buildMobileFrontlineFeatureIntakeKickoff,
  buildMobileToolBoundaryIntakeKickoff,
  shouldShowMobileToolBoundaryCta,
} from "../../../apps/operator-mobile/src/lib/chat/frontlineFeatureIntake";

describe("operator-mobile frontline intake kickoff contract", () => {
  it("keeps interview-first kickoff composition and explicit confirmation rule", () => {
    const kickoff = buildMobileFrontlineFeatureIntakeKickoff({
      trigger: "tool_failure",
      failedToolName: "request_feature",
      boundaryReason: "runtime blocked",
      lastUserMessage: "I need a missing workflow",
    });

    expect(kickoff).toContain("trigger=tool_failure");
    expect(kickoff).toContain("failed_tool=request_feature");
    expect(kickoff).toContain("boundary_reason=runtime blocked");
    expect(kickoff).toContain("operator_original_request=I need a missing workflow");
    expect(kickoff).toContain("Only after explicit confirmation, call request_feature");
    expect(kickoff).toContain(
      "Start now with: What's missing right now, and what do you need that doesn't work yet?"
    );
  });

  it("gates boundary CTA launch on policy-error presence and builds tool-failure kickoff", () => {
    expect(shouldShowMobileToolBoundaryCta("")).toBe(false);
    expect(shouldShowMobileToolBoundaryCta(null)).toBe(false);
    expect(shouldShowMobileToolBoundaryCta("blocked by policy")).toBe(true);

    const kickoff = buildMobileToolBoundaryIntakeKickoff({
      policyError: 'Command "execute_meeting_concierge" blocked (scope_mismatch)',
      lastUserMessage: "Please make this work on mobile.",
    });
    expect(kickoff).not.toBeNull();
    expect(kickoff).toContain("trigger=tool_failure");
    expect(kickoff).toContain("boundary_reason=Command \"execute_meeting_concierge\" blocked (scope_mismatch)");
    expect(kickoff).toContain("operator_original_request=Please make this work on mobile.");

    const noKickoff = buildMobileToolBoundaryIntakeKickoff({
      policyError: "   ",
      lastUserMessage: "ignored",
    });
    expect(noKickoff).toBeNull();
  });
});
