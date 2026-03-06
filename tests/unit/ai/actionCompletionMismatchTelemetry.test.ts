import { describe, expect, it } from "vitest";
import { aggregateActionCompletionMismatchTelemetry } from "../../../convex/ai/agentSessions";
import { normalizeActionCompletionMismatchReasonCode } from "../../../convex/ai/trustTelemetry";

describe("action-completion mismatch telemetry aggregation", () => {
  it("computes deterministic mismatch/rewrite counters with reason/template breakdowns", () => {
    const summary = aggregateActionCompletionMismatchTelemetry(
      [
        {
          performedAt: 1,
          channel: "whatsapp",
          actionCompletion: {
            enforcementMode: "enforce",
            source: "template_metadata",
            templateRole: "sales_template",
            templateAgentId: "agent_template_sales",
            rewriteApplied: true,
            claimedOutcomes: ["audit_workflow_deliverable_email"],
            malformedClaimCount: 0,
            payload: {
              observedViolation: true,
              reasonCode: "claim_tool_not_observed",
              outcome: "audit_workflow_deliverable_email",
              status: "enforced",
            },
          },
        },
        {
          performedAt: 2,
          channel: "telegram",
          actionCompletion: {
            enforcementMode: "observe",
            source: "template_metadata",
            templateRole: "sales_template",
            templateAgentId: "agent_template_sales",
            rewriteApplied: false,
            claimedOutcomes: ["audit_workflow_deliverable_email"],
            malformedClaimCount: 0,
            payload: {
              observedViolation: true,
              reasonCode: "claim_tool_unavailable",
              outcome: "audit_workflow_deliverable_email",
              status: "pass",
            },
          },
        },
        {
          performedAt: 3,
          channel: "slack",
          actionCompletion: {
            enforcementMode: "observe",
            source: "template_metadata",
            templateRole: "ops_template",
            rewriteApplied: false,
            claimedOutcomes: ["booking_created"],
            malformedClaimCount: 0,
            payload: {
              observedViolation: false,
              status: "pass",
            },
          },
        },
      ],
      { windowHours: 24, since: 0 }
    );

    expect(summary.actionsScanned).toBe(3);
    expect(summary.actionsWithActionCompletionTelemetry).toBe(3);
    expect(summary.mismatchCount).toBe(2);
    expect(summary.rewriteCount).toBe(1);
    expect(summary.mismatchRate).toBe(0.6667);
    expect(summary.reasonCodes).toEqual([
      { reasonCode: "claim_tool_not_observed", count: 1 },
      { reasonCode: "claim_tool_unavailable", count: 1 },
    ]);
    expect(summary.templateIncidents).toEqual([
      { templateRole: "sales_template", mismatchCount: 2, rewriteCount: 1 },
    ]);
    expect(summary.channels).toEqual([
      { channel: "telegram", count: 1 },
      { channel: "whatsapp", count: 1 },
    ]);
    expect(summary.templateIdentifiers).toEqual([
      {
        templateIdentifier: "agent_template_sales",
        mismatchCount: 2,
        rewriteCount: 1,
      },
    ]);
  });
});

describe("action-completion mismatch reason-code normalization", () => {
  it("normalizes known codes and collapses unknowns", () => {
    expect(normalizeActionCompletionMismatchReasonCode("claim_tool_not_observed")).toBe(
      "claim_tool_not_observed"
    );
    expect(normalizeActionCompletionMismatchReasonCode(" CLAIM_PAYLOAD_INVALID ")).toBe(
      "claim_payload_invalid"
    );
    expect(normalizeActionCompletionMismatchReasonCode("something_else")).toBe("unknown");
  });
});
