import { describe, expect, it } from "vitest";

import { selectOnboardingTemplateAgent } from "../../../convex/agentOntology";
import {
  LEGACY_PLATFORM_SYSTEM_BOT_TEMPLATE_ROLE,
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_LEGACY_NAME,
  PLATFORM_MOTHER_TEMPLATE_ROLE,
} from "../../../convex/platformMother";

type Candidate = {
  _id: string;
  name?: string;
  status?: string;
  customProperties?: Record<string, unknown>;
};

describe("platform Mother alias selection", () => {
  it("prefers the new Mother template role when present", () => {
    const selected = selectOnboardingTemplateAgent<Candidate>([
      {
        _id: "template_other",
        name: "Other Template",
        status: "template",
        customProperties: { protected: true, templateRole: "personal_life_operator_template" },
      },
      {
        _id: "template_mother",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        status: "template",
        customProperties: { protected: true, templateRole: PLATFORM_MOTHER_TEMPLATE_ROLE },
      },
    ]);

    expect(selected?._id).toBe("template_mother");
  });

  it("accepts Mother metadata while preserving Quinn legacy aliasing", () => {
    const selected = selectOnboardingTemplateAgent<Candidate>([
      {
        _id: "template_other",
        name: "Template A",
        status: "template",
        customProperties: { protected: true },
      },
      {
        _id: "template_quinn_compat",
        name: PLATFORM_MOTHER_CANONICAL_NAME,
        status: "template",
        customProperties: {
          protected: true,
          templateRole: LEGACY_PLATFORM_SYSTEM_BOT_TEMPLATE_ROLE,
          canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyIdentityAliases: [PLATFORM_MOTHER_LEGACY_NAME],
        },
      },
    ]);

    expect(selected?._id).toBe("template_quinn_compat");
  });

  it("falls back to the literal Quinn template name when legacy metadata is all that remains", () => {
    const selected = selectOnboardingTemplateAgent<Candidate>([
      {
        _id: "template_other",
        name: "Template A",
        status: "template",
        customProperties: { protected: true },
      },
      {
        _id: "template_quinn_literal",
        name: PLATFORM_MOTHER_LEGACY_NAME,
        status: "template",
        customProperties: {
          protected: true,
        },
      },
    ]);

    expect(selected?._id).toBe("template_quinn_literal");
  });
});
