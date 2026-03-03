export type CoverageAvailability = "available_now" | "planned";

export interface AgentCoverageRecommendationRow {
  id: string;
  specialistName: string;
  availability: CoverageAvailability;
  isCovered: boolean;
}

export interface AgentIntegrationReadiness {
  googleCalendarConnected: boolean;
  microsoftCalendarConnected: boolean;
  telegramConnected: boolean;
  whatsappConnected: boolean;
  slackConnected: boolean;
}

export const SPECIALIST_COVERAGE_BLUEPRINT_IDS = [
  "pack_personal_inbox_defense",
  "pack_wearable_operator_companion",
  "pack_exec_daily_checkup",
  "pack_visual_todo_shopping",
  "pack_note_capture_memory",
  "pack_vacation_delegate_guard",
] as const;

export type CoverageBlueprintId = (typeof SPECIALIST_COVERAGE_BLUEPRINT_IDS)[number];

export type SpecialistRoleId =
  | "appointment_booking_specialist"
  | "provider_outreach_specialist"
  | "personal_schedule_coordinator"
  | "medical_compliance_reviewer";

export interface SpecialistRoleContract {
  roleName: string;
  defaultSubtype: "booking_agent" | "customer_support" | "general";
  focus: string;
  coverageBlueprintIds: readonly CoverageBlueprintId[];
}

export const SPECIALIST_ROLE_CONTRACTS: Record<SpecialistRoleId, SpecialistRoleContract> = {
  appointment_booking_specialist: {
    roleName: "Appointment Booking Specialist",
    defaultSubtype: "booking_agent",
    focus: "Coordinate calendar-aware booking intents and deterministic scheduling follow-through.",
    coverageBlueprintIds: ["pack_exec_daily_checkup"],
  },
  provider_outreach_specialist: {
    roleName: "Provider Outreach Specialist",
    defaultSubtype: "customer_support",
    focus: "Handle asynchronous provider outreach via messaging/email channels before escalation.",
    coverageBlueprintIds: ["pack_personal_inbox_defense", "pack_vacation_delegate_guard"],
  },
  personal_schedule_coordinator: {
    roleName: "Personal Schedule Coordinator",
    defaultSubtype: "general",
    focus: "Orchestrate end-to-end personal operator plans and manage handoff readiness.",
    coverageBlueprintIds: [
      "pack_wearable_operator_companion",
      "pack_exec_daily_checkup",
      "pack_visual_todo_shopping",
      "pack_note_capture_memory",
    ],
  },
  medical_compliance_reviewer: {
    roleName: "Medical Compliance Reviewer",
    defaultSubtype: "booking_agent",
    focus: "Review high-risk medical follow-up plans before execution and preserve compliance boundaries.",
    coverageBlueprintIds: ["pack_exec_daily_checkup"],
  },
};

export type AgentNeedOutcomeId =
  | "book_appointment"
  | "reschedule_appointment"
  | "provider_outreach"
  | "medical_follow_up"
  | "general_planning";

export interface AgentNeedOutcomeOption {
  id: AgentNeedOutcomeId;
  label: string;
  description: string;
}

export const AGENT_NEED_OUTCOME_OPTIONS: readonly AgentNeedOutcomeOption[] = [
  {
    id: "book_appointment",
    label: "Book an appointment",
    description: "Plan and confirm a new appointment with deterministic constraints.",
  },
  {
    id: "reschedule_appointment",
    label: "Resolve schedule conflict",
    description: "Replan around conflicts and update calendar commitments.",
  },
  {
    id: "provider_outreach",
    label: "Run provider outreach",
    description: "Execute async outreach steps and track retries/outcomes.",
  },
  {
    id: "medical_follow_up",
    label: "Coordinate medical follow-up",
    description: "Coordinate healthcare follow-up while preserving compliance boundaries.",
  },
  {
    id: "general_planning",
    label: "General personal planning",
    description: "Choose the best specialist for day-to-day personal operations planning.",
  },
] as const;

type IntegrationRequirementId =
  | "calendar_connected"
  | "messaging_connected";

interface IntegrationRequirement {
  id: IntegrationRequirementId;
  gapTitle: string;
  isMet: (readiness: AgentIntegrationReadiness) => boolean;
}

const INTEGRATION_REQUIREMENTS: Record<IntegrationRequirementId, IntegrationRequirement> = {
  calendar_connected: {
    id: "calendar_connected",
    gapTitle: "Calendar integration gap: connect Google Calendar or Microsoft Calendar.",
    isMet: (readiness) =>
      readiness.googleCalendarConnected || readiness.microsoftCalendarConnected,
  },
  messaging_connected: {
    id: "messaging_connected",
    gapTitle: "Messaging integration gap: connect Telegram, WhatsApp, or Slack for outreach fallback.",
    isMet: (readiness) =>
      readiness.telegramConnected
      || readiness.whatsappConnected
      || readiness.slackConnected,
  },
};

interface OutcomeRule {
  specialistIds: SpecialistRoleId[];
  integrationRequirements: IntegrationRequirementId[];
}

const OUTCOME_RULES: Record<AgentNeedOutcomeId, OutcomeRule> = {
  book_appointment: {
    specialistIds: ["appointment_booking_specialist", "personal_schedule_coordinator"],
    integrationRequirements: ["calendar_connected"],
  },
  reschedule_appointment: {
    specialistIds: ["personal_schedule_coordinator"],
    integrationRequirements: ["calendar_connected"],
  },
  provider_outreach: {
    specialistIds: ["provider_outreach_specialist"],
    integrationRequirements: ["messaging_connected"],
  },
  medical_follow_up: {
    specialistIds: ["appointment_booking_specialist"],
    integrationRequirements: ["calendar_connected", "messaging_connected"],
  },
  general_planning: {
    specialistIds: ["personal_schedule_coordinator"],
    integrationRequirements: [],
  },
};

export interface AgentNeedRecommendationCard {
  coverageId: string;
  specialistName: string;
  availability: CoverageAvailability;
  isCovered: boolean;
  toolGaps: string[];
  integrationGaps: string[];
  shouldSuggestActivation: boolean;
}

export interface AgentNeedRecommendationResult {
  outcome: AgentNeedOutcomeOption;
  enabledIntegrationLabels: string[];
  integrationGaps: string[];
  cards: AgentNeedRecommendationCard[];
}

function resolveEnabledIntegrationLabels(
  readiness: AgentIntegrationReadiness
): string[] {
  const labels: string[] = [];
  if (readiness.googleCalendarConnected) labels.push("Google Calendar");
  if (readiness.microsoftCalendarConnected) labels.push("Microsoft Calendar");
  if (readiness.telegramConnected) labels.push("Telegram");
  if (readiness.whatsappConnected) labels.push("WhatsApp");
  if (readiness.slackConnected) labels.push("Slack");
  return labels;
}

export function buildAgentNeedRecommendation(args: {
  outcomeId: AgentNeedOutcomeId;
  coverageRows: AgentCoverageRecommendationRow[];
  readiness: AgentIntegrationReadiness;
}): AgentNeedRecommendationResult {
  const outcome = AGENT_NEED_OUTCOME_OPTIONS.find(
    (option) => option.id === args.outcomeId
  ) || AGENT_NEED_OUTCOME_OPTIONS[0];
  const rule = OUTCOME_RULES[outcome.id];
  const coverageById = new Map(args.coverageRows.map((row) => [row.id, row]));
  const integrationGaps = rule.integrationRequirements
    .map((requirementId) => INTEGRATION_REQUIREMENTS[requirementId])
    .filter((requirement) => !requirement.isMet(args.readiness))
    .map((requirement) => requirement.gapTitle);

  const cards = rule.specialistIds.map((specialistId) => {
    const coverage = coverageById.get(specialistId);
    if (!coverage) {
      return {
        coverageId: specialistId,
        specialistName: specialistId,
        availability: "planned" as CoverageAvailability,
        isCovered: false,
        toolGaps: ["Tooling map gap: specialist blueprint is not registered."],
        integrationGaps,
        shouldSuggestActivation: false,
      };
    }

    const toolGaps: string[] = [];
    if (coverage.availability === "planned") {
      toolGaps.push("Tool/runtime gap: this specialist path is still planned.");
    } else if (!coverage.isCovered) {
      toolGaps.push("Activation gap: no active specialist agent currently covers this outcome.");
    }

    return {
      coverageId: coverage.id,
      specialistName: coverage.specialistName,
      availability: coverage.availability,
      isCovered: coverage.isCovered,
      toolGaps,
      integrationGaps,
      shouldSuggestActivation:
        coverage.availability === "available_now"
        && !coverage.isCovered
        && integrationGaps.length === 0,
    };
  });

  return {
    outcome,
    enabledIntegrationLabels: resolveEnabledIntegrationLabels(args.readiness),
    integrationGaps,
    cards,
  };
}
