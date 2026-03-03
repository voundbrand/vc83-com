import { describe, expect, it } from "vitest";
import { resolveSamanthaWarmLeadGuardrail } from "../../../convex/ai/tools/teamTools";

describe("resolveSamanthaWarmLeadGuardrail", () => {
  it("reroutes warm Samantha to cold Samantha when warm-lead eligibility is false", () => {
    const warmAgent = {
      _id: "agent_samantha_warm",
      subtype: "general",
      customProperties: {
        templateRole: "one_of_one_warm_lead_capture_consultant_template",
      },
    };

    const result = resolveSamanthaWarmLeadGuardrail({
      selectedAgent: warmAgent,
      activeAgents: [
        warmAgent,
        {
          _id: "agent_samantha_cold",
          subtype: "general",
          customProperties: {
            templateRole: "one_of_one_lead_capture_consultant_template",
          },
        },
      ],
      requestedSpecialistType: "general",
      runtimePolicy: {
        commercialRouting: {
          warmLeadEligible: false,
          signalSource: "message",
          surface: "one_of_one_landing",
          audienceTemperature: "cold",
        },
      },
    });

    expect(result.error).toBeUndefined();
    expect(result.guardrailApplied).toBe(true);
    expect(result.reasonCode).toBe("warm_samantha_disallowed_for_cold_lead");
    expect(result.targetAgent._id).toBe("agent_samantha_cold");
    expect(result.provenance?.selectionStrategy).toBe("fallback_subtype");
  });

  it("allows warm Samantha when warm-lead eligibility is true", () => {
    const warmAgent = {
      _id: "agent_samantha_warm",
      subtype: "general",
      customProperties: {
        templateRole: "one_of_one_warm_lead_capture_consultant_template",
      },
    };

    const result = resolveSamanthaWarmLeadGuardrail({
      selectedAgent: warmAgent,
      activeAgents: [warmAgent],
      requestedSpecialistType: "general",
      runtimePolicy: {
        commercialRouting: {
          warmLeadEligible: true,
          signalSource: "message",
          surface: "store",
          audienceTemperature: "warm",
        },
      },
    });

    expect(result.error).toBeUndefined();
    expect(result.guardrailApplied).toBe(false);
    expect(result.targetAgent._id).toBe("agent_samantha_warm");
  });

  it("fails closed when warm Samantha is selected but no cold fallback exists", () => {
    const warmAgent = {
      _id: "agent_samantha_warm",
      subtype: "general",
      customProperties: {
        templateRole: "one_of_one_warm_lead_capture_consultant_template",
      },
    };

    const result = resolveSamanthaWarmLeadGuardrail({
      selectedAgent: warmAgent,
      activeAgents: [warmAgent],
      requestedSpecialistType: "general",
      runtimePolicy: {
        commercialRouting: {
          warmLeadEligible: false,
          signalSource: "none",
        },
      },
    });

    expect(result.guardrailApplied).toBe(false);
    expect(result.reasonCode).toBe("warm_samantha_disallowed_for_cold_lead");
    expect(result.error).toContain("restricted to warm/store leads");
    expect(result.targetAgent._id).toBe("agent_samantha_warm");
  });
});
