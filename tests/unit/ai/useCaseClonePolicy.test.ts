import { describe, expect, it } from "vitest";
import {
  buildUseCaseCloneName,
  normalizeUseCaseKey,
  normalizeSpawnMetadataForPromptInputMinimization,
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

describe("Kanzlei prompt-input minimization metadata", () => {
  it("trims spawn promptInput payloads to need-to-know fields and emits drop audit", () => {
    const normalized = normalizeSpawnMetadataForPromptInputMinimization({
      templateProps: {
        templateRole: "kanzlei_mvp_customer_telephony_template",
      },
      metadata: {
        promptInput: {
          matterType: "erstberatung",
          urgency: "hoch",
          mandantName: "Max Mustermann",
          freeFormNotes: "Bevorzugte Rueckrufzeit 17 Uhr.",
        },
        originSurface: "operator_desktop",
      },
    });

    expect(normalized.promptInputMinimizationContract).toMatchObject({
      mode: "need_to_know",
      requiresExplicitFieldMapping: true,
    });
    expect(normalized.spawnMetadata.promptInput).toEqual({
      matterType: "erstberatung",
      urgency: "hoch",
    });
    expect(normalized.promptInputMinimizationAudit).toMatchObject({
      droppedFields: ["freeFormNotes", "mandantName"],
      droppedDeniedFields: ["mandantName"],
      droppedFieldCount: 2,
      retainedFields: ["matterType", "urgency"],
    });
    expect(normalized.spawnMetadata.originSurface).toBe("operator_desktop");
  });

  it("keeps spawn metadata unchanged outside Kanzlei policy context", () => {
    const normalized = normalizeSpawnMetadataForPromptInputMinimization({
      templateProps: {
        templateRole: "customer_support_template",
      },
      metadata: {
        promptInput: {
          mandantName: "Max Mustermann",
          urgency: "hoch",
        },
      },
    });

    expect(normalized.promptInputMinimizationContract).toBeNull();
    expect(normalized.promptInputMinimizationAudit).toBeNull();
    expect(normalized.spawnMetadata).toEqual({
      promptInput: {
        mandantName: "Max Mustermann",
        urgency: "hoch",
      },
    });
  });
});
