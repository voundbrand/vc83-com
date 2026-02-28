import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOUL_EVOLUTION_POLICY,
  evaluateModelSwitchDrift,
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

  it("evaluates model-switch drift warnings from recent samples", () => {
    const evaluation = evaluateModelSwitchDrift({
      threshold: 0.4,
      minimumSamples: 3,
      samples: [
        {
          responseId: "a",
          driftScores: {
            identity: 0.5,
            scope: 0.3,
            boundary: 0.4,
            performance: 0.3,
            overall: 0.44,
          },
        },
        {
          responseId: "b",
          driftScores: {
            identity: 0.45,
            scope: 0.35,
            boundary: 0.4,
            performance: 0.33,
            overall: 0.42,
          },
        },
        {
          responseId: "c",
          driftScores: {
            identity: 0.48,
            scope: 0.36,
            boundary: 0.41,
            performance: 0.34,
            overall: 0.43,
          },
        },
      ],
    });

    expect(evaluation.sampleCount).toBe(3);
    expect(evaluation.exceedsThreshold).toBe(true);
    expect(evaluation.userVisibleWarning).toBeDefined();
  });
});
