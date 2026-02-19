import { describe, expect, it } from "vitest";
import {
  DEFAULT_CORE_MEMORY_POLICY,
  normalizeCoreMemory,
  normalizeCoreMemoryPolicy,
  normalizeCoreMemoryType,
  normalizeSoulModel,
} from "../../../convex/ai/soulEvolution";

describe("soul core memory model", () => {
  it("normalizes core memory type to taxonomy values", () => {
    expect(normalizeCoreMemoryType("boundary")).toBe("boundary");
    expect(normalizeCoreMemoryType("UNKNOWN")).toBe("identity");
    expect(normalizeCoreMemoryType(undefined)).toBe("identity");
  });

  it("normalizes core memory records with immutable-by-default policy", () => {
    const memory = normalizeCoreMemory(
      {
        memoryId: "m_1",
        type: "empathy",
        title: "Emergency Call",
        narrative: "Customer panicked. We stayed calm and solved it.",
        source: "onboarding_story",
        tags: ["Support", "Empathy", "Support"],
      },
      0,
    );

    expect(memory).not.toBeNull();
    expect(memory?.type).toBe("empathy");
    expect(memory?.immutable).toBe(true);
    expect(memory?.immutableReason).toBe("identity_anchor");
    expect(memory?.tags).toEqual(["support", "empathy"]);
  });

  it("defaults and sanitizes core memory policy bounds", () => {
    const policy = normalizeCoreMemoryPolicy({
      immutableByDefault: false,
      minCoreMemories: 4,
      maxCoreMemories: 2,
      requiredMemoryTypes: ["identity", "caution", "identity", "unknown"],
    });

    expect(policy.immutableByDefault).toBe(false);
    expect(policy.minCoreMemories).toBe(4);
    expect(policy.maxCoreMemories).toBe(4);
    expect(policy.requiredMemoryTypes).toEqual(["identity", "caution"]);
    expect(policy.requireOwnerApprovalForMutations).toBe(
      DEFAULT_CORE_MEMORY_POLICY.requireOwnerApprovalForMutations,
    );
  });

  it("normalizes soul model with typed core memories and default policy", () => {
    const soul = normalizeSoulModel({
      name: "Agent Quinn",
      coreMemories: [
        {
          title: "Pricing boundary",
          narrative: "Never quote exact pricing before assessment.",
          type: "boundary",
          source: "onboarding_story",
          immutable: true,
        },
      ],
    });

    expect(soul.coreMemories).toHaveLength(1);
    expect(soul.coreMemories?.[0].type).toBe("boundary");
    expect(soul.coreMemoryPolicy).toEqual(DEFAULT_CORE_MEMORY_POLICY);
  });
});
