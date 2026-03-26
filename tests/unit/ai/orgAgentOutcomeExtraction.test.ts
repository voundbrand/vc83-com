import { describe, expect, it } from "vitest";
import {
  ORG_AGENT_OUTCOME_ENVELOPE_CONTRACT_VERSION,
  buildOrgAgentOutcomeEnvelope,
  deriveActionCandidatesFromSummary,
  normalizeOrgAgentOutcomeEnvelope,
} from "../../../convex/ai/orgAgentOutcomeExtraction";

describe("org agent outcome extraction", () => {
  it("derives deterministic action candidates from conversational summary text", () => {
    const candidates = deriveActionCandidatesFromSummary(
      "Please follow up by email and book an appointment next week.",
    );
    expect(candidates.map((candidate) => candidate.actionKey)).toEqual([
      "book_appointment",
      "schedule_follow_up",
      "send_email_follow_up",
    ]);
  });

  it("builds a normalized envelope with merged heuristic + provided actions", () => {
    const envelope = buildOrgAgentOutcomeEnvelope({
      source: "agent_session",
      organizationId: "org_123",
      agentId: "agent_123",
      sessionId: "session_123",
      channel: "telephony",
      summary:
        "Caller asked for a callback and email summary; create note for owner.",
      actionCandidates: [
        {
          actionKey: "schedule_follow_up",
          title: "Schedule callback",
          confidence: 0.9,
          targetSystemClass: "platform_internal",
          approvalRequired: true,
        },
      ],
      contactCandidate: {
        objectId: "contact_123",
        externalIdentifier: "+49123456789",
        confidence: 0.88,
      },
    });

    expect(envelope.contractVersion).toBe(
      ORG_AGENT_OUTCOME_ENVELOPE_CONTRACT_VERSION,
    );
    expect(envelope.source).toBe("agent_session");
    expect(envelope.actionCandidates.map((candidate) => candidate.actionKey)).toEqual([
      "create_crm_note",
      "schedule_follow_up",
      "send_email_follow_up",
    ]);
    expect(
      envelope.actionCandidates.find(
        (candidate) => candidate.actionKey === "schedule_follow_up",
      )?.confidence,
    ).toBe(0.9);
  });

  it("normalizes persisted envelope payloads and fails closed on invalid values", () => {
    const normalized = normalizeOrgAgentOutcomeEnvelope({
      contractVersion: ORG_AGENT_OUTCOME_ENVELOPE_CONTRACT_VERSION,
      source: "conversation",
      organizationId: "org_123",
      conversationId: "conv_123",
      channel: "webchat",
      capturedAt: 1772467200000,
      summary: "Outcome captured",
      actionCandidates: [
        {
          actionKey: "create_crm_note",
          title: "Create CRM note",
          confidence: 0.7,
          targetSystemClass: "platform_internal",
          approvalRequired: false,
        },
      ],
      checkpoints: ["approval_signal", "approval_signal"],
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.checkpoints).toEqual(["approval_signal"]);

    expect(
      normalizeOrgAgentOutcomeEnvelope({
        contractVersion: ORG_AGENT_OUTCOME_ENVELOPE_CONTRACT_VERSION,
        source: "conversation",
        organizationId: "org_123",
        channel: "webchat",
        capturedAt: 1772467200000,
        summary: "x",
        actionCandidates: [
          {
            actionKey: "x",
            title: "X",
            confidence: 0.5,
            targetSystemClass: "unsupported_target",
            approvalRequired: false,
          },
        ],
      }),
    ).toBeNull();
  });

  it("throws when required envelope scope is missing", () => {
    expect(() =>
      buildOrgAgentOutcomeEnvelope({
        source: "conversation",
        organizationId: "",
        conversationId: "conv_123",
        channel: "webchat",
      }),
    ).toThrow(/requires non-empty organizationId and channel/i);
  });
});
