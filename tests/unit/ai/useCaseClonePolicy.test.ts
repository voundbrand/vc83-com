import { describe, expect, it } from "vitest";
import {
  buildUseCaseCloneName,
  normalizeUseCaseKey,
  resolveTemplateClonePolicy,
} from "../../../convex/ai/workerPool";
import {
  buildManagedTemplateCloneLinkage,
  readTemplateCloneLinkageContract,
  resolveTemplateSourceId,
} from "../../../convex/ai/templateCloneLinkage";

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

describe("template clone linkage contract helpers", () => {
  it("builds managed linkage metadata with lifecycle + override policy defaults", () => {
    expect(
      buildManagedTemplateCloneLinkage({
        sourceTemplateId: "objects_template_1",
        sourceTemplateVersion: "objects_template_1@1700001000000",
        lastTemplateSyncAt: 1_700_001_000_000,
        lastTemplateSyncJobId: "job_123",
      })
    ).toMatchObject({
      contractVersion: "ath_template_clone_linkage_v1",
      sourceTemplateId: "objects_template_1",
      sourceTemplateVersion: "objects_template_1@1700001000000",
      cloneLifecycleState: "managed_in_sync",
      lastTemplateSyncAt: 1_700_001_000_000,
      lastTemplateSyncJobId: "job_123",
      overridePolicy: {
        mode: "warn",
      },
    });
  });

  it("keeps legacy clone metadata readable when templateCloneLinkage is absent", () => {
    const legacyCustomProperties = {
      templateAgentId: "objects_template_legacy",
      cloneLifecycle: "managed_use_case_clone_v1",
      overridePolicy: {
        mode: "free",
      },
      lastTemplateSyncAt: 1_700_001_111_000,
      lastTemplateJobId: "job_legacy_1",
    };

    expect(resolveTemplateSourceId(legacyCustomProperties)).toBe(
      "objects_template_legacy"
    );
    expect(readTemplateCloneLinkageContract(legacyCustomProperties)).toMatchObject({
      sourceTemplateId: "objects_template_legacy",
      cloneLifecycleState: "managed_in_sync",
      lastTemplateSyncAt: 1_700_001_111_000,
      lastTemplateSyncJobId: "job_legacy_1",
      overridePolicy: {
        mode: "free",
      },
    });
  });
});
