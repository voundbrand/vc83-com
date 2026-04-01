import { describe, expect, it } from "vitest";
import { CATALOG_CLONE_CAPABILITY_LIMITS_BLOCKED_MESSAGE } from "../../../convex/ai/kernel/agentExecution";
import { NO_FIT_CONCIERGE_TERMS } from "../../../convex/ai/agentStoreCatalog";
import { hasPrimaryForOperator } from "../../../convex/ai/workerPool";
import { ONBOARDING_INTERVIEW_TEMPLATE } from "../../../convex/onboarding/seedPlatformAgents";
import { buildPlatformAgentCreationKickoff } from "../../../src/components/window-content/ai-chat-window/onboarding-kickoff-contract";

type WorkerPoolAgentStub = {
  type: string;
  status: string;
  customProperties?: Record<string, unknown>;
  createdBy?: string;
};

function toWorkerPoolAgentStub(agent: WorkerPoolAgentStub) {
  return {
    _id: "objects_agent_stub" as never,
    organizationId: "org_stub" as never,
    type: agent.type,
    subtype: "general",
    name: "Agent Stub",
    description: "stub",
    status: agent.status,
    customProperties: agent.customProperties,
    createdBy: agent.createdBy,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("clone-first primary assignment guardrails", () => {
  it("assigns first-successful-clone primary only when org+owner context has no viable primary", () => {
    const withoutPrimary = [
      toWorkerPoolAgentStub({
        type: "org_agent",
        status: "active",
        customProperties: { operatorId: "user_1", isPrimary: false },
      }),
    ];

    const withPrimary = [
      toWorkerPoolAgentStub({
        type: "org_agent",
        status: "active",
        customProperties: { operatorId: "user_1", isPrimary: true },
      }),
    ];

    expect(hasPrimaryForOperator(withoutPrimary as never, "user_1")).toBe(false);
    expect(hasPrimaryForOperator(withPrimary as never, "user_1")).toBe(true);
  });

  it("ignores ineligible statuses and other-owner primary flags for primary assignment checks", () => {
    const mixedAgents = [
      toWorkerPoolAgentStub({
        type: "org_agent",
        status: "template",
        customProperties: { operatorId: "user_1", isPrimary: true },
      }),
      toWorkerPoolAgentStub({
        type: "org_agent",
        status: "archived",
        customProperties: { operatorId: "user_1", isPrimary: true },
      }),
      toWorkerPoolAgentStub({
        type: "org_agent",
        status: "active",
        customProperties: { operatorId: "user_2", isPrimary: true },
      }),
    ];

    expect(hasPrimaryForOperator(mixedAgents as never, "user_1")).toBe(false);
  });
});

describe("onboarding kickoff copy contracts", () => {
  it("keeps one-visible-operator and capability-limit transparency language", () => {
    const kickoff = buildPlatformAgentCreationKickoff({
      sourceSessionId: "session_123",
      sourceOrganizationId: "org_123",
    });

    expect(kickoff).toContain("Route this conversation through one-visible-operator activation.");
    expect(kickoff).toContain("2) Readiness Snapshot: always show two sections - ready now and needs setup next.");
    expect(kickoff).toContain("3) Tool Mappings: exact tool/integration checks mapped to each needs-setup item.");
    expect(kickoff).toContain("forbidden_operator_terms=clone|template|catalog|specialist|orchestration_layer|blocked");
    expect(kickoff).toContain("If required inputs are missing, ask targeted questions first and list missing fields explicitly.");
  });

  it("keeps purchase-only no-fit concierge terms and coverage-context specialist hints", () => {
    const kickoff = buildPlatformAgentCreationKickoff({
      openContext: "agent_coverage:provider_outreach_specialist:sms_support",
    });

    expect(kickoff).toContain(
      "5) No-Fit Route: purchase-only custom concierge with exact terms - €5,000 minimum, €2,500 deposit, includes 90-minute onboarding with engineer."
    );
    expect(kickoff).toContain("recommended_specialist_role=Provider Outreach Specialist");
    expect(kickoff).toContain("recommended_specialist_subtype=sms_support");
  });
});

describe("onboarding tone/subtext capture and fallback messaging", () => {
  it("retains tone and communication-style capture fields in onboarding interview", () => {
    const agentPurposePhase = ONBOARDING_INTERVIEW_TEMPLATE.phases.find(
      (phase) => phase.phaseId === "agent_purpose"
    );
    const confirmationPhase = ONBOARDING_INTERVIEW_TEMPLATE.phases.find(
      (phase) => phase.phaseId === "confirmation"
    );
    const outputFieldIds = ONBOARDING_INTERVIEW_TEMPLATE.outputSchema.fields.map((field) => field.fieldId);

    expect(agentPurposePhase?.questions.map((question) => question.extractionField)).toEqual(
      expect.arrayContaining(["tonePreference", "communicationStyle"])
    );
    expect(outputFieldIds).toEqual(expect.arrayContaining(["tonePreference", "communicationStyle"]));
    expect(confirmationPhase?.questions.find((question) => question.questionId === "q_confirm")?.promptText).toContain(
      "one personalized operator voice"
    );
  });

  it("keeps deterministic fallback messages for capability blocks and no-fit concierge escalation", () => {
    expect(CATALOG_CLONE_CAPABILITY_LIMITS_BLOCKED_MESSAGE).toContain("required capabilities");
    expect(CATALOG_CLONE_CAPABILITY_LIMITS_BLOCKED_MESSAGE).toContain("blocked to available now");
    expect(NO_FIT_CONCIERGE_TERMS).toEqual({
      minimum: "€5,000 minimum",
      deposit: "€2,500 deposit",
      onboarding: "includes 90-minute onboarding with engineer",
    });
  });
});
