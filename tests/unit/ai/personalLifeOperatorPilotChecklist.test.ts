import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_OUTREACH_LIMITS,
  buildAppointmentOutreachAttemptLadder,
  type AppointmentChannel,
  type AppointmentMissionStep,
} from "../../../convex/channels/router";
import { evaluatePharmacistVacationDecision } from "../../../convex/bookingOntology";

interface PilotMissionIntake {
  missionId: string;
  createdAt: number;
  serviceType: string;
  dateWindowStart: number;
  dateWindowEnd: number;
  locationPreference: string;
  contactMethodConstraints: string[];
}

interface PilotCalendarGate {
  checkedAt: number;
  connectionId: string;
  resourceId: string;
}

interface PilotApprovalArtifact {
  approvalId: string;
  resolvedAt: number;
  decision: "approved" | "rejected";
  callConsentDisclosure: string;
}

interface PilotAttemptArtifact {
  attemptIndex: number;
  attemptedAt: number;
  channel: AppointmentChannel;
  reasonCode: string;
  result: "no_response" | "voicemail" | "booked" | "failed";
  approvalId?: string;
  transcriptSnippet?: string;
  outcomeArtifactId?: string;
}

interface PilotOutcomeArtifact {
  status: "BOOKED" | "UNRESOLVED_WITH_REASON";
  completedAt: number;
  reason: string;
}

interface PilotScenarioEvidence {
  mission: PilotMissionIntake;
  calendar: PilotCalendarGate;
  expectedLadder: AppointmentMissionStep[];
  attempts: PilotAttemptArtifact[];
  approvals: PilotApprovalArtifact[];
  outcome: PilotOutcomeArtifact;
}

type PilotChecklistResult = Record<
  "PO-SLA-01" | "PO-SLA-02" | "PO-SLA-03" | "PO-SLA-04" | "PO-SLA-05" | "PO-SLA-06",
  boolean
>;

interface ContextBookingMutation {
  missionId: string;
  bookingId: string;
  organizationId: string;
}

interface ContextIsolationSnapshot {
  mode: "personal" | "business";
  organizationId: string;
  sessionId: string;
  contextBanner: string;
  visibleMissionIds: string[];
  visibleBookingIds: string[];
  bookingMutations: ContextBookingMutation[];
}

type CrossOrgChecklistResult = Record<
  "PO-ORG-01" | "PO-ORG-02" | "PO-ORG-03",
  boolean
>;

function evaluatePilotChecklist(evidence: PilotScenarioEvidence): PilotChecklistResult {
  const firstAttemptAt = evidence.attempts[0]?.attemptedAt ?? Number.POSITIVE_INFINITY;
  const mission = evidence.mission;

  const poSla01 = Boolean(
    mission.serviceType &&
      mission.dateWindowStart > 0 &&
      mission.dateWindowEnd > mission.dateWindowStart &&
      mission.locationPreference &&
      mission.contactMethodConstraints.length > 0 &&
      mission.createdAt <= firstAttemptAt
  );

  const poSla02 = Boolean(
    evidence.calendar.checkedAt <= firstAttemptAt &&
      evidence.calendar.connectionId &&
      evidence.calendar.resourceId
  );

  const expectedSteps = evidence.expectedLadder.slice(0, evidence.attempts.length);
  const orderedByIndex = evidence.attempts.every(
    (attempt, index) =>
      attempt.attemptIndex === index + 1 &&
      (index === 0 || attempt.attemptedAt >= evidence.attempts[index - 1]!.attemptedAt)
  );
  const ladderMatches = expectedSteps.every((step, index) => {
    const attempt = evidence.attempts[index];
    return (
      attempt?.channel === step.channel &&
      attempt?.reasonCode === step.reasonCode &&
      (step.requiresApproval ? attempt.approvalId !== undefined : true)
    );
  });
  const poSla03 = orderedByIndex && ladderMatches;

  const phoneAttempts = evidence.attempts.filter((attempt) => attempt.channel === "phone_call");
  const approvalMap = new Map(evidence.approvals.map((artifact) => [artifact.approvalId, artifact]));
  const poSla04 = phoneAttempts.every((attempt) => {
    if (!attempt.approvalId) {
      return false;
    }
    const approval = approvalMap.get(attempt.approvalId);
    return Boolean(
      approval &&
        approval.decision === "approved" &&
        approval.callConsentDisclosure.trim().length > 0 &&
        approval.resolvedAt <= attempt.attemptedAt
    );
  });

  const closureWithinWindow =
    evidence.outcome.completedAt - mission.createdAt <= APPOINTMENT_OUTREACH_LIMITS.maxWindowMs;
  const poSla05 = Boolean(
    closureWithinWindow &&
      (evidence.outcome.status === "BOOKED" ||
        evidence.outcome.status === "UNRESOLVED_WITH_REASON") &&
      evidence.outcome.reason.trim().length > 0
  );

  const phoneArtifactsComplete = phoneAttempts.every(
    (attempt) =>
      (attempt.transcriptSnippet || "").trim().length > 0 &&
      (attempt.outcomeArtifactId || "").trim().length > 0
  );
  const poSla06 = Boolean(
    mission.missionId &&
      evidence.attempts.length > 0 &&
      evidence.outcome.reason &&
      phoneArtifactsComplete
  );

  return {
    "PO-SLA-01": poSla01,
    "PO-SLA-02": poSla02,
    "PO-SLA-03": poSla03,
    "PO-SLA-04": poSla04,
    "PO-SLA-05": poSla05,
    "PO-SLA-06": poSla06,
  };
}

function evaluateCrossOrgChecklist(args: {
  personal: ContextIsolationSnapshot;
  business: ContextIsolationSnapshot;
  personalMissionId: string;
  personalBookingId: string;
  businessMissionId: string;
  businessBookingId: string;
}): CrossOrgChecklistResult {
  const noCrossLeakage = Boolean(
    args.personal.mode === "personal" &&
      args.business.mode === "business" &&
      !args.personal.visibleMissionIds.includes(args.businessMissionId) &&
      !args.personal.visibleBookingIds.includes(args.businessBookingId) &&
      !args.business.visibleMissionIds.includes(args.personalMissionId) &&
      !args.business.visibleBookingIds.includes(args.personalBookingId)
  );

  const contextSwitchClarity = Boolean(
    args.personal.organizationId !== args.business.organizationId &&
      args.personal.sessionId !== args.business.sessionId &&
      args.personal.contextBanner.toLowerCase().includes("personal") &&
      args.business.contextBanner.toLowerCase().includes("business")
  );

  const personalMutationsAreScoped =
    args.personal.bookingMutations.length > 0 &&
    args.personal.bookingMutations.every(
      (mutation) =>
        mutation.organizationId === args.personal.organizationId &&
        mutation.missionId === args.personalMissionId &&
        mutation.bookingId === args.personalBookingId &&
        mutation.missionId !== args.businessMissionId &&
        mutation.bookingId !== args.businessBookingId
    );
  const businessMutationsAreScoped =
    args.business.bookingMutations.length > 0 &&
    args.business.bookingMutations.every(
      (mutation) =>
        mutation.organizationId === args.business.organizationId &&
        mutation.missionId === args.businessMissionId &&
        mutation.bookingId === args.businessBookingId &&
        mutation.missionId !== args.personalMissionId &&
        mutation.bookingId !== args.personalBookingId
    );
  const orgAwareBookingBehavior = Boolean(
    personalMutationsAreScoped &&
      businessMutationsAreScoped
  );

  return {
    "PO-ORG-01": noCrossLeakage,
    "PO-ORG-02": contextSwitchClarity,
    "PO-ORG-03": orgAwareBookingBehavior,
  };
}

describe("personal life operator pilot checklist", () => {
  it("passes hair appointment scenario with approved call fallback", () => {
    const startedAt = Date.UTC(2026, 1, 24, 16, 0, 0);
    const ladder = buildAppointmentOutreachAttemptLadder({
      preferredChannel: "sms",
      fallbackMethod: "phone_call",
      hasSms: true,
      hasEmail: true,
      hasTelegram: false,
      hasPhone: true,
      callFallbackApproved: true,
      domainAutonomyLevel: "live",
      maxAttempts: 4,
    });

    expect(ladder.map((step) => step.channel)).toEqual(["sms", "email", "phone_call"]);
    expect(ladder.map((step) => step.reasonCode)).toEqual([
      "initial_outreach",
      "async_fallback_retry",
      "approved_call_fallback",
    ]);

    const evidence: PilotScenarioEvidence = {
      mission: {
        missionId: "mission-hair-2026-02-24",
        createdAt: startedAt,
        serviceType: "hair_appointment",
        dateWindowStart: startedAt + 2 * 60 * 60 * 1000,
        dateWindowEnd: startedAt + 26 * 60 * 60 * 1000,
        locationPreference: "downtown",
        contactMethodConstraints: ["sms", "email", "phone_call"],
      },
      calendar: {
        checkedAt: startedAt + 5 * 60 * 1000,
        connectionId: "oauth_google_001",
        resourceId: "primary",
      },
      expectedLadder: ladder,
      attempts: [
        {
          attemptIndex: 1,
          attemptedAt: startedAt + 10 * 60 * 1000,
          channel: "sms",
          reasonCode: "initial_outreach",
          result: "no_response",
        },
        {
          attemptIndex: 2,
          attemptedAt: startedAt + 130 * 60 * 1000,
          channel: "email",
          reasonCode: "async_fallback_retry",
          result: "no_response",
        },
        {
          attemptIndex: 3,
          attemptedAt: startedAt + 250 * 60 * 1000,
          channel: "phone_call",
          reasonCode: "approved_call_fallback",
          result: "booked",
          approvalId: "approval-hair-call-1",
          transcriptSnippet: "Confirmed haircut slot at 3:30 PM tomorrow.",
          outcomeArtifactId: "telephony-outcome-hair-1",
        },
      ],
      approvals: [
        {
          approvalId: "approval-hair-call-1",
          resolvedAt: startedAt + 245 * 60 * 1000,
          decision: "approved",
          callConsentDisclosure:
            "I consent to call outreach for appointment scheduling and recording disclosure was provided.",
        },
      ],
      outcome: {
        status: "BOOKED",
        completedAt: startedAt + 255 * 60 * 1000,
        reason: "provider_confirmed_slot",
      },
    };

    const checklist = evaluatePilotChecklist(evidence);
    expect(Object.values(checklist).every(Boolean)).toBe(true);
  });

  it("passes dermatologist scenario with deterministic unresolved closure", () => {
    const startedAt = Date.UTC(2026, 1, 24, 9, 0, 0);
    const ladder = buildAppointmentOutreachAttemptLadder({
      preferredChannel: "email",
      fallbackMethod: "phone_call",
      hasSms: true,
      hasEmail: true,
      hasTelegram: false,
      hasPhone: true,
      callFallbackApproved: true,
      domainAutonomyLevel: "live",
      maxAttempts: 4,
    });

    expect(ladder.map((step) => step.channel)).toEqual(["email", "sms", "phone_call"]);
    expect(ladder[2]?.requiresApproval).toBe(true);

    const evidence: PilotScenarioEvidence = {
      mission: {
        missionId: "mission-derm-2026-02-24",
        createdAt: startedAt,
        serviceType: "dermatology_visit",
        dateWindowStart: startedAt + 24 * 60 * 60 * 1000,
        dateWindowEnd: startedAt + 5 * 24 * 60 * 60 * 1000,
        locationPreference: "northside",
        contactMethodConstraints: ["email", "sms", "phone_call"],
      },
      calendar: {
        checkedAt: startedAt + 10 * 60 * 1000,
        connectionId: "oauth_google_001",
        resourceId: "primary",
      },
      expectedLadder: ladder,
      attempts: [
        {
          attemptIndex: 1,
          attemptedAt: startedAt + 20 * 60 * 1000,
          channel: "email",
          reasonCode: "initial_outreach",
          result: "no_response",
        },
        {
          attemptIndex: 2,
          attemptedAt: startedAt + 140 * 60 * 1000,
          channel: "sms",
          reasonCode: "async_fallback_retry",
          result: "no_response",
        },
        {
          attemptIndex: 3,
          attemptedAt: startedAt + 260 * 60 * 1000,
          channel: "phone_call",
          reasonCode: "approved_call_fallback",
          result: "voicemail",
          approvalId: "approval-derm-call-1",
          transcriptSnippet: "Left voicemail requesting callback for appointment availability.",
          outcomeArtifactId: "telephony-outcome-derm-1",
        },
      ],
      approvals: [
        {
          approvalId: "approval-derm-call-1",
          resolvedAt: startedAt + 250 * 60 * 1000,
          decision: "approved",
          callConsentDisclosure:
            "I consent to outbound call outreach for scheduling and acknowledge recording disclosure.",
        },
      ],
      outcome: {
        status: "UNRESOLVED_WITH_REASON",
        completedAt: startedAt + 6 * 60 * 60 * 1000,
        reason: "provider_unreachable_within_retry_window",
      },
    };

    const checklist = evaluatePilotChecklist(evidence);
    expect(Object.values(checklist).every(Boolean)).toBe(true);
  });

  it("remains generalized for arbitrary appointment outcomes beyond fixed pilot examples", () => {
    const startedAt = Date.UTC(2026, 1, 24, 14, 0, 0);
    const ladder = buildAppointmentOutreachAttemptLadder({
      preferredChannel: "email",
      fallbackMethod: "none",
      hasSms: false,
      hasEmail: true,
      hasTelegram: true,
      hasPhone: false,
      callFallbackApproved: false,
      domainAutonomyLevel: "sandbox",
      maxAttempts: 4,
    });

    expect(ladder.map((step) => step.channel)).toEqual(["email", "telegram"]);

    const evidence: PilotScenarioEvidence = {
      mission: {
        missionId: "mission-generalized-pt-2026-02-24",
        createdAt: startedAt,
        serviceType: "physical_therapy_follow_up",
        dateWindowStart: startedAt + 18 * 60 * 60 * 1000,
        dateWindowEnd: startedAt + 72 * 60 * 60 * 1000,
        locationPreference: "westside",
        contactMethodConstraints: ["email", "telegram"],
      },
      calendar: {
        checkedAt: startedAt + 3 * 60 * 1000,
        connectionId: "oauth_google_001",
        resourceId: "rehab-calendar",
      },
      expectedLadder: ladder,
      attempts: [
        {
          attemptIndex: 1,
          attemptedAt: startedAt + 15 * 60 * 1000,
          channel: "email",
          reasonCode: "initial_outreach",
          result: "no_response",
        },
        {
          attemptIndex: 2,
          attemptedAt: startedAt + 150 * 60 * 1000,
          channel: "telegram",
          reasonCode: "async_fallback_retry",
          result: "booked",
        },
      ],
      approvals: [],
      outcome: {
        status: "BOOKED",
        completedAt: startedAt + 160 * 60 * 1000,
        reason: "provider_confirmed_slot",
      },
    };

    const checklist = evaluatePilotChecklist(evidence);
    expect(Object.values(checklist).every(Boolean)).toBe(true);
    expect(checklist["PO-SLA-04"]).toBe(true);
  });

  it("fails approval boundary when phone call execution has no consent artifact", () => {
    const startedAt = Date.UTC(2026, 1, 24, 12, 0, 0);
    const ladder = buildAppointmentOutreachAttemptLadder({
      preferredChannel: "sms",
      fallbackMethod: "phone_call",
      hasSms: true,
      hasEmail: true,
      hasTelegram: false,
      hasPhone: true,
      callFallbackApproved: true,
      domainAutonomyLevel: "live",
      maxAttempts: 3,
    });

    const evidence: PilotScenarioEvidence = {
      mission: {
        missionId: "mission-negative-approval",
        createdAt: startedAt,
        serviceType: "hair_appointment",
        dateWindowStart: startedAt + 2 * 60 * 60 * 1000,
        dateWindowEnd: startedAt + 24 * 60 * 60 * 1000,
        locationPreference: "downtown",
        contactMethodConstraints: ["sms", "email", "phone_call"],
      },
      calendar: {
        checkedAt: startedAt + 5 * 60 * 1000,
        connectionId: "oauth_google_001",
        resourceId: "primary",
      },
      expectedLadder: ladder,
      attempts: [
        {
          attemptIndex: 1,
          attemptedAt: startedAt + 10 * 60 * 1000,
          channel: "sms",
          reasonCode: "initial_outreach",
          result: "no_response",
        },
        {
          attemptIndex: 2,
          attemptedAt: startedAt + 130 * 60 * 1000,
          channel: "email",
          reasonCode: "async_fallback_retry",
          result: "no_response",
        },
        {
          attemptIndex: 3,
          attemptedAt: startedAt + 250 * 60 * 1000,
          channel: "phone_call",
          reasonCode: "approved_call_fallback",
          result: "failed",
          transcriptSnippet: "No transcript available.",
          outcomeArtifactId: "telephony-outcome-negative-1",
        },
      ],
      approvals: [],
      outcome: {
        status: "UNRESOLVED_WITH_REASON",
        completedAt: startedAt + 5 * 60 * 60 * 1000,
        reason: "missing_call_approval_artifact",
      },
    };

    const checklist = evaluatePilotChecklist(evidence);
    expect(checklist["PO-SLA-04"]).toBe(false);
  });

  it("validates personal and business context isolation with org-aware booking behavior", () => {
    const personalMissionId = "mission-personal-hair";
    const personalBookingId = "booking-personal-hair";
    const businessMissionId = "mission-business-derm";
    const businessBookingId = "booking-business-derm";
    const checklist = evaluateCrossOrgChecklist({
      personal: {
        mode: "personal",
        organizationId: "org_personal_001",
        sessionId: "session_personal_001",
        contextBanner: "Personal mode · private calendar scope",
        visibleMissionIds: [personalMissionId],
        visibleBookingIds: [personalBookingId],
        bookingMutations: [
          {
            missionId: personalMissionId,
            bookingId: personalBookingId,
            organizationId: "org_personal_001",
          },
        ],
      },
      business: {
        mode: "business",
        organizationId: "org_business_001",
        sessionId: "session_business_001",
        contextBanner: "Business mode · organization scheduling scope",
        visibleMissionIds: [businessMissionId],
        visibleBookingIds: [businessBookingId],
        bookingMutations: [
          {
            missionId: businessMissionId,
            bookingId: businessBookingId,
            organizationId: "org_business_001",
          },
        ],
      },
      personalMissionId,
      personalBookingId,
      businessMissionId,
      businessBookingId,
    });

    expect(Object.values(checklist).every(Boolean)).toBe(true);
  });

  it("fails cross-org checklist when mission visibility leaks across contexts", () => {
    const checklist = evaluateCrossOrgChecklist({
      personal: {
        mode: "personal",
        organizationId: "org_personal_001",
        sessionId: "session_shared_001",
        contextBanner: "Personal mode",
        visibleMissionIds: ["mission-personal", "mission-business"],
        visibleBookingIds: ["booking-personal"],
        bookingMutations: [
          {
            missionId: "mission-personal",
            bookingId: "booking-personal",
            organizationId: "org_personal_001",
          },
        ],
      },
      business: {
        mode: "business",
        organizationId: "org_business_001",
        sessionId: "session_shared_001",
        contextBanner: "Business mode",
        visibleMissionIds: ["mission-business"],
        visibleBookingIds: ["booking-business"],
        bookingMutations: [
          {
            missionId: "mission-business",
            bookingId: "booking-business",
            organizationId: "org_business_001",
          },
        ],
      },
      personalMissionId: "mission-personal",
      personalBookingId: "booking-personal",
      businessMissionId: "mission-business",
      businessBookingId: "booking-business",
    });

    expect(checklist["PO-ORG-01"]).toBe(false);
    expect(checklist["PO-ORG-02"]).toBe(false);
  });

  it("fails cross-org checklist when booking visibility leaks across contexts", () => {
    const checklist = evaluateCrossOrgChecklist({
      personal: {
        mode: "personal",
        organizationId: "org_personal_001",
        sessionId: "session_personal_002",
        contextBanner: "Personal mode",
        visibleMissionIds: ["mission-personal"],
        visibleBookingIds: ["booking-personal", "booking-business"],
        bookingMutations: [
          {
            missionId: "mission-personal",
            bookingId: "booking-personal",
            organizationId: "org_personal_001",
          },
        ],
      },
      business: {
        mode: "business",
        organizationId: "org_business_001",
        sessionId: "session_business_002",
        contextBanner: "Business mode",
        visibleMissionIds: ["mission-business"],
        visibleBookingIds: ["booking-business"],
        bookingMutations: [
          {
            missionId: "mission-business",
            bookingId: "booking-business",
            organizationId: "org_business_001",
          },
        ],
      },
      personalMissionId: "mission-personal",
      personalBookingId: "booking-personal",
      businessMissionId: "mission-business",
      businessBookingId: "booking-business",
    });

    expect(checklist["PO-ORG-01"]).toBe(false);
    expect(checklist["PO-ORG-02"]).toBe(true);
    expect(checklist["PO-ORG-03"]).toBe(true);
  });

  it("fails context-switch clarity when business banner does not identify business mode", () => {
    const checklist = evaluateCrossOrgChecklist({
      personal: {
        mode: "personal",
        organizationId: "org_personal_001",
        sessionId: "session_personal_003",
        contextBanner: "Personal mode · private calendar scope",
        visibleMissionIds: ["mission-personal"],
        visibleBookingIds: ["booking-personal"],
        bookingMutations: [
          {
            missionId: "mission-personal",
            bookingId: "booking-personal",
            organizationId: "org_personal_001",
          },
        ],
      },
      business: {
        mode: "business",
        organizationId: "org_business_001",
        sessionId: "session_business_003",
        contextBanner: "Org scheduling scope",
        visibleMissionIds: ["mission-business"],
        visibleBookingIds: ["booking-business"],
        bookingMutations: [
          {
            missionId: "mission-business",
            bookingId: "booking-business",
            organizationId: "org_business_001",
          },
        ],
      },
      personalMissionId: "mission-personal",
      personalBookingId: "booking-personal",
      businessMissionId: "mission-business",
      businessBookingId: "booking-business",
    });

    expect(checklist["PO-ORG-01"]).toBe(true);
    expect(checklist["PO-ORG-02"]).toBe(false);
    expect(checklist["PO-ORG-03"]).toBe(true);
  });

  it("fails org-aware booking behavior when a booking mutation crosses organization scope", () => {
    const checklist = evaluateCrossOrgChecklist({
      personal: {
        mode: "personal",
        organizationId: "org_personal_001",
        sessionId: "session_personal_004",
        contextBanner: "Personal mode",
        visibleMissionIds: ["mission-personal"],
        visibleBookingIds: ["booking-personal"],
        bookingMutations: [
          {
            missionId: "mission-business",
            bookingId: "booking-business",
            organizationId: "org_business_001",
          },
        ],
      },
      business: {
        mode: "business",
        organizationId: "org_business_001",
        sessionId: "session_business_004",
        contextBanner: "Business mode",
        visibleMissionIds: ["mission-business"],
        visibleBookingIds: ["booking-business"],
        bookingMutations: [
          {
            missionId: "mission-business",
            bookingId: "booking-business",
            organizationId: "org_business_001",
          },
        ],
      },
      personalMissionId: "mission-personal",
      personalBookingId: "booking-personal",
      businessMissionId: "mission-business",
      businessBookingId: "booking-business",
    });

    expect(checklist["PO-ORG-01"]).toBe(true);
    expect(checklist["PO-ORG-02"]).toBe(true);
    expect(checklist["PO-ORG-03"]).toBe(false);
  });

  it("fails org-aware booking behavior when context has no booking mutation evidence", () => {
    const checklist = evaluateCrossOrgChecklist({
      personal: {
        mode: "personal",
        organizationId: "org_personal_001",
        sessionId: "session_personal_005",
        contextBanner: "Personal mode",
        visibleMissionIds: ["mission-personal"],
        visibleBookingIds: ["booking-personal"],
        bookingMutations: [],
      },
      business: {
        mode: "business",
        organizationId: "org_business_001",
        sessionId: "session_business_005",
        contextBanner: "Business mode",
        visibleMissionIds: ["mission-business"],
        visibleBookingIds: ["booking-business"],
        bookingMutations: [
          {
            missionId: "mission-business",
            bookingId: "booking-business",
            organizationId: "org_business_001",
          },
        ],
      },
      personalMissionId: "mission-personal",
      personalBookingId: "booking-personal",
      businessMissionId: "mission-business",
      businessBookingId: "booking-business",
    });

    expect(checklist["PO-ORG-01"]).toBe(true);
    expect(checklist["PO-ORG-02"]).toBe(true);
    expect(checklist["PO-ORG-03"]).toBe(false);
  });
});

describe("pharmacist vacation policy decision contract", () => {
  it("fails closed when prerequisite readiness is ambiguous", () => {
    const result = evaluatePharmacistVacationDecision({
      blockedReasons: ["missing_google_calendar_read_scope"],
      blockedPeriodMatchIds: [],
      violatesRequestWindow: false,
      hasCalendarOverlap: false,
      concurrentAwayCount: 0,
      maxConcurrentAway: 2,
      minOnDutyTotalViolation: false,
      minOnDutyRoleViolations: [],
    });

    expect(result.verdict).toBe("blocked");
    expect(result.reasonCodes).toEqual(["missing_google_calendar_read_scope"]);
    expect(result.failClosed).toBe(true);
  });

  it("denies when request overlaps policy blocked periods", () => {
    const result = evaluatePharmacistVacationDecision({
      blockedReasons: [],
      blockedPeriodMatchIds: ["holiday-blackout-1"],
      violatesRequestWindow: false,
      hasCalendarOverlap: false,
      concurrentAwayCount: 0,
      maxConcurrentAway: 2,
      minOnDutyTotalViolation: false,
      minOnDutyRoleViolations: [],
    });

    expect(result.verdict).toBe("denied");
    expect(result.reasonCodes).toEqual(["blocked_period"]);
  });

  it("denies when request window policy is violated", () => {
    const result = evaluatePharmacistVacationDecision({
      blockedReasons: [],
      blockedPeriodMatchIds: [],
      violatesRequestWindow: true,
      hasCalendarOverlap: false,
      concurrentAwayCount: 0,
      maxConcurrentAway: 2,
      minOnDutyTotalViolation: false,
      minOnDutyRoleViolations: [],
    });

    expect(result.verdict).toBe("denied");
    expect(result.reasonCodes).toEqual(["request_window_violation"]);
  });

  it("conflicts when calendar overlaps or concurrent-away limit is reached", () => {
    const result = evaluatePharmacistVacationDecision({
      blockedReasons: [],
      blockedPeriodMatchIds: [],
      violatesRequestWindow: false,
      hasCalendarOverlap: true,
      concurrentAwayCount: 2,
      maxConcurrentAway: 2,
      minOnDutyTotalViolation: false,
      minOnDutyRoleViolations: [],
    });

    expect(result.verdict).toBe("conflict");
    expect(result.reasonCodes).toEqual([
      "calendar_overlap",
      "max_concurrent_away",
    ]);
  });

  it("conflicts on role-floor coverage violations", () => {
    const result = evaluatePharmacistVacationDecision({
      blockedReasons: [],
      blockedPeriodMatchIds: [],
      violatesRequestWindow: false,
      hasCalendarOverlap: false,
      concurrentAwayCount: 1,
      maxConcurrentAway: 3,
      minOnDutyTotalViolation: false,
      minOnDutyRoleViolations: ["pharmacist"],
    });

    expect(result.verdict).toBe("conflict");
    expect(result.reasonCodes).toEqual(["min_on_duty_role_violation"]);
  });

  it("approves when all deterministic checks pass", () => {
    const result = evaluatePharmacistVacationDecision({
      blockedReasons: [],
      blockedPeriodMatchIds: [],
      violatesRequestWindow: false,
      hasCalendarOverlap: false,
      concurrentAwayCount: 1,
      maxConcurrentAway: 3,
      minOnDutyTotalViolation: false,
      minOnDutyRoleViolations: [],
    });

    expect(result.verdict).toBe("approved");
    expect(result.reasonCodes).toEqual([]);
    expect(result.failClosed).toBe(false);
  });
});
