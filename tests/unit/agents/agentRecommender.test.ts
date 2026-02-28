import { describe, expect, it } from "vitest";
import {
  buildAgentNeedRecommendation,
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

  it("keeps planned specialists as tool gaps", () => {
    const recommendation = buildAgentNeedRecommendation({
      outcomeId: "medical_follow_up",
      coverageRows: COVERAGE_ROWS,
      readiness: {
        googleCalendarConnected: true,
        microsoftCalendarConnected: false,
        telegramConnected: true,
        whatsappConnected: false,
        slackConnected: false,
      },
    });

    const plannedCard = recommendation.cards.find(
      (card) => card.coverageId === "medical_compliance_reviewer"
    );
    expect(plannedCard?.availability).toBe("planned");
    expect(plannedCard?.toolGaps).toContain(
      "Tool/runtime gap: this specialist path is still planned."
    );
    expect(plannedCard?.shouldSuggestActivation).toBe(false);
  });
});
