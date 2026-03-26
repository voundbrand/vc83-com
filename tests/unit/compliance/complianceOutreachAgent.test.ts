import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  buildComplianceAvvOutreachEmailDraft,
  buildComplianceAvvResponseEvidenceDraft,
  canTransitionAvvOutreachState,
  computeComplianceAvvOutreachRetryPlan,
  computeComplianceAvvOutreachSlaCadence,
  mapAvvOutreachObjectToRow,
  summarizeAvvOutreachRows,
} from "../../../convex/complianceOutreachAgent";

function makeOutreachObject(
  overrides: Partial<Doc<"objects">> = {},
  customProperties: Record<string, unknown> = {},
): Doc<"objects"> {
  return {
    _id: "obj_avv_1" as Id<"objects">,
    _creationTime: 1700000000000,
    organizationId: "org_1" as Id<"organizations">,
    type: "compliance_avv_outreach",
    subtype: "provider_dossier",
    name: "Provider dossier",
    description: "AVV outreach dossier",
    status: "draft",
    customProperties,
    createdBy: "user_1" as Id<"users">,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
    ...overrides,
  };
}

describe("compliance AVV outreach contracts", () => {
  it("enforces deterministic and fail-closed state transitions", () => {
    expect(canTransitionAvvOutreachState("draft", "pending_confirmation")).toBe(true);
    expect(canTransitionAvvOutreachState("pending_confirmation", "queued")).toBe(true);
    expect(canTransitionAvvOutreachState("awaiting_response", "approved")).toBe(false);
    expect(canTransitionAvvOutreachState("approved", "queued")).toBe(false);
    expect(canTransitionAvvOutreachState("closed_blocked", "draft")).toBe(true);
  });

  it("maps dossier rows and marks invalid metadata as contract blockers", () => {
    const invalidRow = mapAvvOutreachObjectToRow(
      makeOutreachObject(
        {
          _id: "obj_invalid" as Id<"objects">,
          status: "awaiting_response",
          updatedAt: 1700000005000,
        },
        {
          providerName: "  ",
          providerEmail: "not-an-email",
          linkedEvidenceObjectIds: ["obj_b", "obj_a", "obj_b", "   "],
        },
      ),
    );

    expect(invalidRow.contractValid).toBe(false);
    expect(invalidRow.validationErrors).toEqual(
      expect.arrayContaining([
        "provider_name_required",
        "provider_email_invalid",
        "sla_first_due_required",
      ]),
    );
    expect(invalidRow.linkedEvidenceObjectIds).toEqual(["obj_a", "obj_b"]);
  });

  it("summarizes open/overdue/awaiting outreach rows deterministically", () => {
    const now = 1800000000000;
    const rows = [
      mapAvvOutreachObjectToRow(
        makeOutreachObject(
          {
            _id: "obj_1" as Id<"objects">,
            status: "awaiting_response",
          },
          {
            providerName: "Provider A",
            providerEmail: "ops@provider-a.example",
            slaFirstDueAt: now - 1000,
          },
        ),
      ),
      mapAvvOutreachObjectToRow(
        makeOutreachObject(
          {
            _id: "obj_2" as Id<"objects">,
            status: "approved",
          },
          {
            providerName: "Provider B",
            providerEmail: "ops@provider-b.example",
            slaFirstDueAt: now + 100_000,
          },
        ),
      ),
      mapAvvOutreachObjectToRow(
        makeOutreachObject(
          {
            _id: "obj_3" as Id<"objects">,
            status: "draft",
          },
          {
            providerName: "Provider C",
            providerEmail: "ops@provider-c.example",
            slaFirstDueAt: now + 10_000,
          },
        ),
      ),
    ];

    const summary = summarizeAvvOutreachRows({ rows, now });
    expect(summary.total).toBe(3);
    expect(summary.invalidCount).toBe(0);
    expect(summary.openCount).toBe(2);
    expect(summary.overdueCount).toBe(1);
    expect(summary.awaitingResponseCount).toBe(1);
    expect(summary.reminderDueCount).toBe(1);
    expect(summary.escalationDueCount).toBe(0);
    expect(summary.nextDueAt).toBe(now - 1000);
    expect(summary.byState.awaiting_response).toBe(1);
    expect(summary.byState.approved).toBe(1);
    expect(summary.byState.draft).toBe(1);
  });

  it("computes deterministic reminder and escalation cadence windows", () => {
    const now = 1800000000000;
    const reminderAt = now - 1000;
    const escalationAt = now + 60_000;
    const cadence = computeComplianceAvvOutreachSlaCadence({
      state: "awaiting_response",
      now,
      slaFirstDueAt: now - 2000,
      slaReminderAt: reminderAt,
      slaEscalationAt: escalationAt,
      reminderAlertCount: 1,
      nextReminderAlertAt: reminderAt,
    });

    expect(cadence.reminderAnchorAt).toBe(reminderAt);
    expect(cadence.nextReminderAt).toBe(reminderAt);
    expect(cadence.reminderDue).toBe(true);
    expect(cadence.escalationDue).toBe(false);
    expect(cadence.nextMilestoneAt).toBe(reminderAt);
  });

  it("fails closed to escalation when escalation threshold is breached", () => {
    const now = 1800000000000;
    const cadence = computeComplianceAvvOutreachSlaCadence({
      state: "awaiting_response",
      now,
      slaFirstDueAt: now - 86_400_000,
      slaReminderAt: now - 43_200_000,
      slaEscalationAt: now - 1000,
      reminderAlertCount: 0,
      nextReminderAlertAt: now - 43_200_000,
    });

    expect(cadence.escalationDue).toBe(true);
    expect(cadence.reminderDue).toBe(false);
    expect(cadence.escalationAt).toBe(now - 1000);
  });

  it("builds deterministic AVV outreach email content", () => {
    const draft = buildComplianceAvvOutreachEmailDraft({
      providerName: "Processor GmbH",
      organizationName: "Altwarp Sailing School",
      customMessage: "Please include your latest annex.",
    });

    expect(draft.subject).toContain("AVV confirmation request");
    expect(draft.textBody).toContain("Processor GmbH");
    expect(draft.textBody).toContain("Please include your latest annex.");
    expect(draft.htmlBody).toContain("Altwarp Sailing School");
    expect(draft.htmlBody).toContain("Additional context");
  });

  it("computes fail-closed retry planning for outreach delivery failures", () => {
    const now = 1800000000000;
    const firstRetry = computeComplianceAvvOutreachRetryPlan({
      retryCount: 1,
      now,
      maxRetries: 3,
    });
    expect(firstRetry.willRetry).toBe(true);
    expect(firstRetry.backoffMs).toBe(5 * 60 * 1000);
    expect(firstRetry.nextRetryAt).toBe(now + 5 * 60 * 1000);

    const terminal = computeComplianceAvvOutreachRetryPlan({
      retryCount: 3,
      now,
      maxRetries: 3,
    });
    expect(terminal.willRetry).toBe(false);
    expect(terminal.backoffMs).toBeNull();
    expect(terminal.nextRetryAt).toBeNull();
  });

  it("builds deterministic provider-response evidence draft defaults", () => {
    const now = Date.UTC(2026, 2, 25, 12, 0, 0);
    const draft = buildComplianceAvvResponseEvidenceDraft({
      providerName: "Processor GmbH",
      responseSummary: "Signed AVV returned by legal team.",
      intakeMode: "parser_assisted",
      outcome: "signed_avv_received",
      now,
    });

    expect(draft.title).toContain("Processor GmbH");
    expect(draft.sourceType).toBe("provider_response");
    expect(draft.subtype).toBe("avv_provider");
    expect(draft.riskReferences).toEqual([
      {
        riskId: "R-002",
        controlId: "provider_avv",
        note: "outcome:signed_avv_received",
      },
    ]);
    expect(draft.tags).toEqual(
      expect.arrayContaining(["avv", "outreach", "provider_response", "parser_assisted"]),
    );
    expect(draft.retentionDeleteAt).toBeGreaterThan(draft.nextReviewAt);
  });

  it("fails closed when retention does not outlive next review", () => {
    const now = Date.UTC(2026, 2, 25, 12, 0, 0);
    expect(() =>
      buildComplianceAvvResponseEvidenceDraft({
        providerName: "Processor GmbH",
        responseSummary: "Follow-up date provided.",
        intakeMode: "manual_upload",
        outcome: "delivery_eta_provided",
        now,
        nextReviewAt: now + 1000,
        retentionDeleteAt: now,
      }),
    ).toThrow("Retention delete timestamp must be after next review timestamp.");
  });
});
