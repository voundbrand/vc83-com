import { describe, expect, it } from "vitest";
import { selectOnboardingTemplateAgent } from "../../../convex/agentOntology";

type Candidate = {
  _id: string;
  name?: string;
  status?: string;
  customProperties?: Record<string, unknown>;
};

describe("selectOnboardingTemplateAgent", () => {
  it("prefers explicit platform_system_bot_template role", () => {
    const selected = selectOnboardingTemplateAgent<Candidate>([
      {
        _id: "template_event",
        name: "Event Architect Template",
        status: "template",
        customProperties: { protected: true, templateRole: "event_experience_architect_template" },
      },
      {
        _id: "template_quinn",
        name: "Quinn",
        status: "template",
        customProperties: { protected: true, templateRole: "platform_system_bot_template" },
      },
    ]);

    expect(selected?._id).toBe("template_quinn");
  });

  it("falls back to legacy Quinn naming when templateRole is missing", () => {
    const selected = selectOnboardingTemplateAgent<Candidate>([
      {
        _id: "template_other",
        name: "Other Template",
        status: "template",
        customProperties: { protected: true },
      },
      {
        _id: "template_quinn",
        name: "Quinn",
        status: "template",
        customProperties: { protected: true },
      },
    ]);

    expect(selected?._id).toBe("template_quinn");
  });

  it("returns first protected template when no explicit onboarding marker exists", () => {
    const selected = selectOnboardingTemplateAgent<Candidate>([
      {
        _id: "template_a",
        name: "Template A",
        status: "template",
        customProperties: { protected: true },
      },
      {
        _id: "template_b",
        name: "Template B",
        status: "template",
        customProperties: { protected: true },
      },
    ]);

    expect(selected?._id).toBe("template_a");
  });
});
