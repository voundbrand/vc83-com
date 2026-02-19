import { describe, expect, it } from "vitest";
import {
  buildUseCaseCloneName,
  normalizeUseCaseKey,
  resolveTemplateClonePolicy,
} from "../../../convex/ai/workerPool";

describe("resolveTemplateClonePolicy", () => {
  it("applies safe defaults when clone policy is missing", () => {
    expect(resolveTemplateClonePolicy(undefined)).toEqual({
      spawnEnabled: true,
      maxClonesPerOrg: 12,
      maxClonesPerTemplatePerOrg: 4,
      maxClonesPerOwner: 3,
      allowedPlaybooks: null,
    });
  });

  it("normalizes explicit limits and allowed playbooks", () => {
    expect(
      resolveTemplateClonePolicy({
        clonePolicy: {
          spawnEnabled: false,
          maxClonesPerOrg: 20,
          maxClonesPerTemplatePerOrg: 5.9,
          maxClonesPerOwner: -1,
          allowedPlaybooks: ["event", " Event ", "", null],
        },
      })
    ).toEqual({
      spawnEnabled: false,
      maxClonesPerOrg: 20,
      maxClonesPerTemplatePerOrg: 5,
      maxClonesPerOwner: -1,
      allowedPlaybooks: ["event"],
    });
  });
});

describe("use-case clone naming helpers", () => {
  it("normalizes use case keys to deterministic slugs", () => {
    expect(normalizeUseCaseKey("Event Launch - Q2")).toBe("event_launch_q2");
    expect(normalizeUseCaseKey("   ")).toBe("default");
  });

  it("builds clone names from template, use case, and sequence number", () => {
    expect(
      buildUseCaseCloneName({
        templateName: "Event Experience Architect",
        useCaseLabel: "Product Launch",
        cloneNumber: 2,
      })
    ).toBe("Event Experience Architect - Product Launch #2");
  });
});
