import type { StructuredHandoffPacket } from "../../convex/schemas/aiSchemas";

export const LEGAL_FRONT_OFFICE_SYNTHETIC_FIXTURE_CONTRACT_VERSION =
  "legal_front_office_synthetic_fixture_v1" as const;

export const SYNTHETIC_LEGAL_FRONT_OFFICE_ORGANIZATION = {
  contractVersion: LEGAL_FRONT_OFFICE_SYNTHETIC_FIXTURE_CONTRACT_VERSION,
  organizationId: "org_kanzlei_synthetic_001",
  displayName: "Kanzlei Adler & Partner (Synthetic)",
  timezone: "Europe/Berlin",
  locale: "de-DE",
  channelProfile: "phone_intake_to_back_office",
} as const;

export const SYNTHETIC_LEGAL_FRONT_OFFICE_HANDOFF_PACKETS: {
  urgentCallback: StructuredHandoffPacket;
  evidenceFollowUp: StructuredHandoffPacket;
  informationalIntake: StructuredHandoffPacket;
} = {
  urgentCallback: {
    contractVersion: "structured_handoff_packet_v1",
    sourceAgent: "Clara",
    targetAgent: "Helena",
    callerIdentity: {
      callerId: "+49-170-111-2233",
      callerDisplayName: "Anja M.",
      callbackNumber: "+49-170-111-2233",
      existingClient: false,
    },
    urgency: {
      level: "high",
      deadlineAtMs: 1774491600000,
      deadlineLabel: "today_17_00",
    },
    requestedNextStep: "schedule_callback",
    intakeSummary:
      "Synthetic intake: caller requests same-day callback for tenancy termination dispute.",
    disclosureEvidence: {
      identityConfirmed: true,
      conflictCheckDisclosed: true,
      consentToCallback: true,
      recordingDisclosureGiven: true,
    },
    createdAt: 1774472400000,
  },
  evidenceFollowUp: {
    contractVersion: "structured_handoff_packet_v1",
    sourceAgent: "Clara",
    targetAgent: "Helena",
    callerIdentity: {
      callerId: "+49-176-222-8899",
      callerDisplayName: "Markus M.",
      callbackNumber: "+49-176-222-8899",
      existingClient: true,
    },
    urgency: {
      level: "medium",
      deadlineLabel: "next_business_day",
    },
    requestedNextStep: "request_documents",
    intakeSummary:
      "Synthetic intake: existing client needs evidence checklist before appointment confirmation.",
    disclosureEvidence: {
      identityConfirmed: true,
      conflictCheckDisclosed: true,
      consentToCallback: true,
      recordingDisclosureGiven: true,
    },
    createdAt: 1774476000000,
  },
  informationalIntake: {
    contractVersion: "structured_handoff_packet_v1",
    sourceAgent: "Clara",
    targetAgent: "Helena",
    callerIdentity: {
      callerId: "+49-151-444-7700",
      callerDisplayName: "Leonie B.",
      callbackNumber: "+49-151-444-7700",
      existingClient: false,
    },
    urgency: {
      level: "low",
    },
    requestedNextStep: "collect_case_summary",
    intakeSummary:
      "Synthetic intake: caller asks for initial process explanation only, no appointment commitment yet.",
    disclosureEvidence: {
      identityConfirmed: true,
      conflictCheckDisclosed: true,
      consentToCallback: true,
      recordingDisclosureGiven: true,
    },
    createdAt: 1774479600000,
  },
};

export const SYNTHETIC_LEGAL_FRONT_OFFICE_SCENARIOS = {
  commitmentRequiresGate: {
    scenarioId: "urgent_callback_commitment",
    summary:
      "Clara to Helena handoff with booking commitment must trigger evaluator gate.",
    packet: SYNTHETIC_LEGAL_FRONT_OFFICE_HANDOFF_PACKETS.urgentCallback,
    plannedToolNames: ["manage_bookings"],
    assistantContent:
      "Termin ist bestätigt. Wir rufen Sie heute bis 17:00 Uhr verbindlich zurück.",
  },
  commitmentBlockedAtNoGo: {
    scenarioId: "outbound_confirmation_with_blockers",
    summary:
      "Outbound commitment remains fail-closed when compliance gate status is NO_GO.",
    packet: SYNTHETIC_LEGAL_FRONT_OFFICE_HANDOFF_PACKETS.evidenceFollowUp,
    plannedToolNames: ["send_email_from_template"],
    assistantContent:
      "Appointment is confirmed and the confirmation email has been sent.",
  },
  informationalOnlyNoGate: {
    scenarioId: "informational_intake_only",
    summary:
      "Informational intake without commitment should not require evaluator gate.",
    packet: SYNTHETIC_LEGAL_FRONT_OFFICE_HANDOFF_PACKETS.informationalIntake,
    plannedToolNames: [],
    assistantContent:
      "Ich habe die wichtigsten Informationen aufgenommen und leite den Vorgang intern weiter.",
  },
} as const;
