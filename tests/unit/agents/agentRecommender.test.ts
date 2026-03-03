import { describe, expect, it } from "vitest";
import {
  buildAgentNeedRecommendation,
  SPECIALIST_COVERAGE_BLUEPRINT_IDS,
  SPECIALIST_ROLE_CONTRACTS,
  type AgentCoverageRecommendationRow,
} from "../../../src/components/window-content/agents/agent-recommender";

const COVERAGE_ROWS: AgentCoverageRecommendationRow[] = [
  {
    id: "appointment_booking_specialist",
    specialistName: "Appointment Booking Specialist",
    availability: "available_now",
    isCovered: false,
  },
  {
    id: "personal_schedule_coordinator",
    specialistName: "Personal Schedule Coordinator",
    availability: "available_now",
    isCovered: true,
  },
  {
    id: "provider_outreach_specialist",
    specialistName: "Provider Outreach Specialist",
    availability: "available_now",
    isCovered: false,
  },
  {
    id: "medical_compliance_reviewer",
    specialistName: "Medical Compliance Reviewer",
    availability: "planned",
    isCovered: false,
  },
];

describe("agent recommender flow", () => {
  it("keeps specialist-to-blueprint join contract deterministic", () => {
    const blueprintIds = new Set(SPECIALIST_COVERAGE_BLUEPRINT_IDS);
    for (const role of Object.values(SPECIALIST_ROLE_CONTRACTS)) {
      expect(role.coverageBlueprintIds.length).toBeGreaterThan(0);
      for (const coverageBlueprintId of role.coverageBlueprintIds) {
        expect(blueprintIds.has(coverageBlueprintId)).toBe(true);
      }
    }
    expect(SPECIALIST_ROLE_CONTRACTS.medical_compliance_reviewer.coverageBlueprintIds).toContain(
      "pack_exec_daily_checkup"
    );
  });

  it("surfaces integration gaps before activation suggestions", () => {
    const recommendation = buildAgentNeedRecommendation({
      outcomeId: "book_appointment",
      coverageRows: COVERAGE_ROWS,
      readiness: {
        googleCalendarConnected: false,
        microsoftCalendarConnected: false,
        telegramConnected: false,
        whatsappConnected: false,
        slackConnected: false,
      },
    });

    expect(recommendation.integrationGaps).toEqual([
      "Calendar integration gap: connect Google Calendar or Microsoft Calendar.",
    ]);
    expect(recommendation.cards[0].shouldSuggestActivation).toBe(false);
  });

  it("recommends activation when required integrations are ready", () => {
    const recommendation = buildAgentNeedRecommendation({
      outcomeId: "book_appointment",
      coverageRows: COVERAGE_ROWS,
      readiness: {
        googleCalendarConnected: true,
        microsoftCalendarConnected: false,
        telegramConnected: false,
        whatsappConnected: false,
        slackConnected: false,
      },
    });

    expect(recommendation.integrationGaps).toHaveLength(0);
    expect(recommendation.cards[0].shouldSuggestActivation).toBe(true);
  });

  it("keeps medical follow-up on the appointment specialist path when integrations are ready", () => {
    const coverageRows = COVERAGE_ROWS.map((row) =>
      row.id === "appointment_booking_specialist"
        ? { ...row, isCovered: true }
        : row
    );
    const recommendation = buildAgentNeedRecommendation({
      outcomeId: "medical_follow_up",
      coverageRows,
      readiness: {
        googleCalendarConnected: true,
        microsoftCalendarConnected: false,
        telegramConnected: true,
        whatsappConnected: false,
        slackConnected: false,
      },
    });

    const appointmentCard = recommendation.cards.find(
      (card) => card.coverageId === "appointment_booking_specialist"
    );
    expect(recommendation.cards).toHaveLength(1);
    expect(appointmentCard?.availability).toBe("available_now");
    expect(appointmentCard?.toolGaps).toHaveLength(0);
    expect(appointmentCard?.integrationGaps).toHaveLength(0);
    expect(appointmentCard?.shouldSuggestActivation).toBe(false);
  });
});
