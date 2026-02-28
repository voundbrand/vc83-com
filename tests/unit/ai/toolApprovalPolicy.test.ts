import { describe, expect, it } from "vitest";
import { shouldRequireToolApproval } from "../../../convex/ai/escalation";
import { resolveChatToolApprovalPolicy } from "../../../convex/ai/chat";
import { buildVacationDecisionResponse } from "../../../convex/ai/tools/bookingTool";

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

  it("never requires approval in sandbox mode", () => {
    expect(
      shouldRequireToolApproval({
        autonomyLevel: "sandbox",
        toolName: "process_payment",
        requireApprovalFor: ["process_payment"],
      })
    ).toBe(false);
  });

  it("uses requireApprovalFor list in delegation mode", () => {
    expect(
      shouldRequireToolApproval({
        autonomyLevel: "delegation",
        toolName: "process_payment",
        requireApprovalFor: ["process_payment"],
      })
    ).toBe(true);
    expect(
      shouldRequireToolApproval({
        autonomyLevel: "delegation",
        toolName: "list_forms",
        requireApprovalFor: ["process_payment"],
      })
    ).toBe(false);
  });

  it("always requires approval for outbound appointment call flows", () => {
    expect(
      shouldRequireToolApproval({
        autonomyLevel: "autonomous",
        toolName: "manage_bookings",
        requireApprovalFor: [],
        toolArgs: {
          action: "execute_appointment_outreach",
          preferredOutreachChannel: "phone_call",
        },
      })
    ).toBe(true);

    expect(
      shouldRequireToolApproval({
        autonomyLevel: "draft_only",
        toolName: "manage_bookings",
        requireApprovalFor: [],
        toolArgs: {
          action: "execute_appointment_outreach",
          outreachFallbackMethod: "phone_call",
        },
      })
    ).toBe(true);
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

  it("builds deterministic conflict responses with alternatives and colleague guidance", () => {
    const response = buildVacationDecisionResponse({
      verdict: "conflict",
      requestedStartDate: "2026-03-01",
      requestedEndDate: "2026-03-03",
      reasonCodes: ["calendar_overlap", "max_concurrent_away"],
      alternatives: [
        { startDate: "2026-03-08", endDate: "2026-03-10" },
        { startDate: "2026-03-15", endDate: "2026-03-17" },
      ],
      requireDirectColleagueDiscussion: true,
      colleagueDiscussionTemplate:
        "Please confirm coverage directly with your pharmacist teammate before resubmitting.",
    });

    expect(response.verdict).toBe("conflict");
    expect(response.colleagueResolutionSuggested).toBe(true);
    expect(response.responseMessage).toContain("Alternative windows");
    expect(response.responseMessage).toContain("2026-03-08 to 2026-03-10");
    expect(response.responseMessage).toContain(
      "confirm coverage directly with your pharmacist teammate"
    );
  });

  it("keeps approved-response mutation messaging fail-closed when write readiness is missing", () => {
    const response = buildVacationDecisionResponse({
      verdict: "approved",
      requestedStartDate: "2026-04-01",
      requestedEndDate: "2026-04-02",
      reasonCodes: [],
      calendarMutationStatus: "skipped",
    });

    expect(response.verdict).toBe("approved");
    expect(response.responseMessage).toContain("Calendar mutation was not attempted");
  });

  it("keeps blocked-policy prerequisite messaging deterministic", () => {
    const response = buildVacationDecisionResponse({
      verdict: "blocked",
      requestedStartDate: "2026-06-01",
      requestedEndDate: "2026-06-03",
      reasonCodes: [
        "missing_matching_vacation_policy",
        "policy_prerequisites_unresolved",
      ],
    });

    expect(response.verdict).toBe("blocked");
    expect(response.responseMessage).toContain(
      "no matching vacation policy is configured"
    );
    expect(response.responseMessage).toContain(
      "policy prerequisites remain unresolved"
    );
  });
});
