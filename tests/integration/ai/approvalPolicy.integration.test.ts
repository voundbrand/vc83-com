import { describe, expect, it } from "vitest";
import { shouldRequireToolApproval } from "../../../convex/ai/escalation";
import { resolveChatToolApprovalPolicy } from "../../../convex/ai/chat";
import { buildVacationDecisionResponse } from "../../../convex/ai/tools/bookingTool";

describe("chat/agent approval policy consistency", () => {
  it("keeps chat 'all' mode aligned with supervised tool approval semantics", () => {
    const chatPolicy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: true,
      toolApprovalMode: "all",
    });

    const chatDecision = shouldRequireToolApproval({
      autonomyLevel: chatPolicy.autonomyLevel,
      toolName: "list_forms",
      requireApprovalFor: chatPolicy.requireApprovalFor,
    });
    const agentDecision = shouldRequireToolApproval({
      autonomyLevel: "supervised",
      toolName: "list_forms",
    });

    expect(chatDecision).toBe(true);
    expect(chatDecision).toBe(agentDecision);
  });

  it("keeps chat 'dangerous' mode aligned with autonomous requireApprovalFor semantics", () => {
    const chatPolicy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: true,
      toolApprovalMode: "dangerous",
    });

    const tools = ["process_payment", "list_forms"];
    for (const toolName of tools) {
      const chatDecision = shouldRequireToolApproval({
        autonomyLevel: chatPolicy.autonomyLevel,
        toolName,
        requireApprovalFor: chatPolicy.requireApprovalFor,
      });
      const agentDecision = shouldRequireToolApproval({
        autonomyLevel: "autonomous",
        toolName,
        requireApprovalFor: chatPolicy.requireApprovalFor,
      });

      expect(chatDecision).toBe(agentDecision);
    }
  });

  it("keeps chat no-approval settings aligned with non-supervised escalation path", () => {
    const chatPolicy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: false,
      toolApprovalMode: "none",
    });

    const chatDecision = shouldRequireToolApproval({
      autonomyLevel: chatPolicy.autonomyLevel,
      toolName: "process_payment",
      requireApprovalFor: chatPolicy.requireApprovalFor,
    });
    const agentDecision = shouldRequireToolApproval({
      autonomyLevel: "autonomous",
      toolName: "process_payment",
      requireApprovalFor: [],
    });

    expect(chatDecision).toBe(false);
    expect(chatDecision).toBe(agentDecision);
  });

  it("keeps appointment call fallback approval-gated across chat and agent runtimes", () => {
    const chatPolicy = resolveChatToolApprovalPolicy({
      humanInLoopEnabled: false,
      toolApprovalMode: "none",
    });
    const callArgs = {
      action: "execute_appointment_outreach",
      preferredOutreachChannel: "phone_call",
    };

    const chatDecision = shouldRequireToolApproval({
      autonomyLevel: chatPolicy.autonomyLevel,
      toolName: "manage_bookings",
      requireApprovalFor: chatPolicy.requireApprovalFor,
      toolArgs: callArgs,
    });
    const agentDecision = shouldRequireToolApproval({
      autonomyLevel: "autonomous",
      toolName: "manage_bookings",
      requireApprovalFor: [],
      toolArgs: callArgs,
    });

    expect(chatDecision).toBe(true);
    expect(chatDecision).toBe(agentDecision);
  });

  it("keeps vacation conflict mediation deterministic with alternatives and direct colleague guidance", () => {
    const response = buildVacationDecisionResponse({
      verdict: "conflict",
      requestedStartDate: "2026-05-10",
      requestedEndDate: "2026-05-12",
      reasonCodes: ["min_on_duty_role_violation"],
      alternatives: [{ startDate: "2026-05-17", endDate: "2026-05-19" }],
      requireDirectColleagueDiscussion: true,
      colleagueDiscussionTemplate:
        "Please coordinate coverage directly with a colleague before retrying this window.",
    });

    expect(response.verdict).toBe("conflict");
    expect(response.colleagueResolutionSuggested).toBe(true);
    expect(response.responseMessage).toContain("2026-05-17 to 2026-05-19");
    expect(response.responseMessage).toContain(
      "coordinate coverage directly with a colleague"
    );
  });

  it("keeps vacation policy-prerequisite failures fail-closed", () => {
    const response = buildVacationDecisionResponse({
      verdict: "blocked",
      requestedStartDate: "2026-07-02",
      requestedEndDate: "2026-07-05",
      reasonCodes: ["missing_matching_vacation_policy"],
    });

    expect(response.verdict).toBe("blocked");
    expect(response.colleagueResolutionSuggested).toBe(false);
    expect(response.responseMessage).toContain(
      "resolve the missing policy/integration prerequisites"
    );
  });

  it("maps relative-date prerequisite blockers to explicit user-facing rationale", () => {
    const response = buildVacationDecisionResponse({
      verdict: "blocked",
      requestedStartDate: undefined,
      requestedEndDate: undefined,
      reasonCodes: ["missing_relative_timezone", "missing_relative_anchor_time"],
    });

    expect(response.verdict).toBe("blocked");
    expect(response.responseMessage).toContain(
      "relative vacation requests must include an explicit timezone"
    );
    expect(response.responseMessage).toContain(
      "missing a deterministic anchor timestamp"
    );
  });
});
