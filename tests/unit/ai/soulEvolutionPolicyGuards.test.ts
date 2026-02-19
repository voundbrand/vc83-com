import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOUL_EVOLUTION_POLICY,
  normalizeSoulEvolutionPolicy,
} from "../../../convex/ai/soulEvolution";

describe("normalizeSoulEvolutionPolicy", () => {
  it("applies defaults for missing fields and normalizes schedule", () => {
    const policy = normalizeSoulEvolutionPolicy({
      maxProposalsPerDay: 2,
      autoReflectionSchedule: "invalid",
    });

    expect(policy.maxProposalsPerDay).toBe(2);
    expect(policy.autoReflectionSchedule).toBe(
      DEFAULT_SOUL_EVOLUTION_POLICY.autoReflectionSchedule
    );
    expect(policy.maxPendingProposals).toBe(
      DEFAULT_SOUL_EVOLUTION_POLICY.maxPendingProposals
    );
    expect(policy.requireMinConversations).toBe(
      DEFAULT_SOUL_EVOLUTION_POLICY.requireMinConversations
    );
  });

  it("enforces weekly floor and non-negative guard values", () => {
    const policy = normalizeSoulEvolutionPolicy({
      maxProposalsPerDay: 6,
      maxProposalsPerWeek: 3,
      cooldownAfterRejection: -100,
      cooldownBetweenProposals: -1,
      requireMinConversations: -10,
      requireMinSessions: -2,
      maxPendingProposals: 0,
    });

    expect(policy.maxProposalsPerWeek).toBe(6);
    expect(policy.cooldownAfterRejection).toBe(0);
    expect(policy.cooldownBetweenProposals).toBe(0);
    expect(policy.requireMinConversations).toBe(0);
    expect(policy.requireMinSessions).toBe(0);
    expect(policy.maxPendingProposals).toBe(1);
  });

  it("deduplicates protected fields and falls back when empty", () => {
    const deduped = normalizeSoulEvolutionPolicy({
      protectedFields: ["neverDo", "neverDo", "blockedTopics", ""],
    });
    expect(deduped.protectedFields).toEqual(["neverDo", "blockedTopics"]);

    const fallback = normalizeSoulEvolutionPolicy({
      protectedFields: [],
    });
    expect(fallback.protectedFields).toEqual(
      DEFAULT_SOUL_EVOLUTION_POLICY.protectedFields
    );
  });
});
