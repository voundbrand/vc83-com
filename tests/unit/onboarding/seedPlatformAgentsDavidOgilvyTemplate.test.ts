import { describe, expect, it } from "vitest";

import {
  DAVID_OGILVY_TEMPLATE_KB_DOCUMENTS,
  DAVID_OGILVY_COPYWRITER_TEMPLATE_AGENT_SEED,
  DAVID_OGILVY_COPYWRITER_TEMPLATE_ROLE,
  PROTECTED_TEMPLATE_AGENT_SEEDS,
} from "../../../convex/onboarding/seedPlatformAgents";

describe("David Ogilvy copywriter protected template seed", () => {
  it("registers the template in protected template seeds with the expected role", () => {
    const registered = PROTECTED_TEMPLATE_AGENT_SEEDS.find(
      (seed) => seed.role === DAVID_OGILVY_COPYWRITER_TEMPLATE_ROLE,
    );

    expect(registered).toBeDefined();
    expect(registered?.name).toBe("David Ogilvy Copywriter Template");
    expect(registered?.customProperties.templateRole).toBe(
      DAVID_OGILVY_COPYWRITER_TEMPLATE_ROLE,
    );
  });

  it("uses readonly draft-first guardrails and deterministic clone policy", () => {
    expect(DAVID_OGILVY_COPYWRITER_TEMPLATE_AGENT_SEED.customProperties.toolProfile).toBe(
      "readonly",
    );
    expect(DAVID_OGILVY_COPYWRITER_TEMPLATE_AGENT_SEED.customProperties.autonomyLevel).toBe(
      "draft_only",
    );
    expect(DAVID_OGILVY_COPYWRITER_TEMPLATE_AGENT_SEED.customProperties.clonePolicy).toMatchObject({
      spawnEnabled: true,
      allowedPlaybooks: ["copywriting_ogilvy"],
    });
  });

  it("keeps research-grounded knowledge tags in the template baseline", () => {
    expect(
      DAVID_OGILVY_COPYWRITER_TEMPLATE_AGENT_SEED.customProperties.knowledgeBaseTags,
    ).toEqual(
      expect.arrayContaining([
        "agent:david-ogilvy",
        "copywriting",
        "direct-response",
        "research-first",
      ]),
    );
  });

  it("ships a deterministic kb import bundle for org media hydration", () => {
    expect(DAVID_OGILVY_TEMPLATE_KB_DOCUMENTS.length).toBeGreaterThanOrEqual(5);
    expect(
      DAVID_OGILVY_TEMPLATE_KB_DOCUMENTS.map((doc) => doc.filename),
    ).toEqual(
      expect.arrayContaining([
        "00-operating-manual.md",
        "01-brief-template.md",
        "02-headline-and-body-formulas.md",
        "03-channel-playbooks.md",
        "04-quality-rubric.md",
        "05-constraints-and-ethics.md",
      ]),
    );
    for (const document of DAVID_OGILVY_TEMPLATE_KB_DOCUMENTS) {
      expect(document.content.trim().length).toBeGreaterThan(20);
    }
  });
});
