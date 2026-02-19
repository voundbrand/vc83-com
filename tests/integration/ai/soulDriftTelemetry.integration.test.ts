import { describe, expect, it } from "vitest";
import {
  aggregateSoulDriftTelemetry,
} from "../../../convex/ai/agentSessions";
import {
  DEFAULT_SOUL_EVOLUTION_POLICY,
  evaluateProposalCreationPolicy,
} from "../../../convex/ai/soulEvolution";

describe("soul drift telemetry integration", () => {
  it("aggregates alignment proposal drift and severity breakdown", () => {
    const now = Date.now();
    const summary = aggregateSoulDriftTelemetry(
      [
        {
          createdAt: now - 1_000,
          triggerType: "alignment",
          status: "pending",
          alignmentMode: "remediate",
          driftScores: {
            identity: 0.7,
            scope: 0.5,
            boundary: 0.6,
            performance: 0.4,
            overall: 0.6,
          },
        },
        {
          createdAt: now - 2_000,
          triggerType: "alignment",
          status: "approved",
          alignmentMode: "monitor",
          driftScores: {
            identity: 0.2,
            scope: 0.25,
            boundary: 0.1,
            performance: 0.15,
            overall: 0.2,
          },
        },
        {
          createdAt: now - 3_000,
          triggerType: "reflection",
          status: "pending",
        },
      ],
      { windowHours: 24, since: now - 24 * 60 * 60 * 1000 },
    );

    expect(summary.proposalsScanned).toBe(3);
    expect(summary.alignmentProposals).toBe(2);
    expect(summary.pendingAlignmentProposals).toBe(1);
    expect(summary.proposalsWithDrift).toBe(2);
    expect(summary.maxOverallDrift).toBe(0.6);
    expect(summary.severityBreakdown).toEqual([
      { severity: "high", count: 1 },
      { severity: "low", count: 1 },
    ]);
  });

  it("blocks proposal creation when weekly limit is exceeded", () => {
    const decision = evaluateProposalCreationPolicy(DEFAULT_SOUL_EVOLUTION_POLICY, {
      pendingCount: 0,
      proposalsLast24Hours: 0,
      proposalsLast7Days: DEFAULT_SOUL_EVOLUTION_POLICY.maxProposalsPerWeek,
      conversationCount: DEFAULT_SOUL_EVOLUTION_POLICY.requireMinConversations,
      sessionCount: DEFAULT_SOUL_EVOLUTION_POLICY.requireMinSessions,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("Weekly limit reached");
  });

  it("blocks proposal creation during between-proposal cooldown", () => {
    const decision = evaluateProposalCreationPolicy(DEFAULT_SOUL_EVOLUTION_POLICY, {
      pendingCount: 0,
      proposalsLast24Hours: 0,
      proposalsLast7Days: 0,
      lastProposalAgeMs: DEFAULT_SOUL_EVOLUTION_POLICY.cooldownBetweenProposals - 1,
      conversationCount: DEFAULT_SOUL_EVOLUTION_POLICY.requireMinConversations,
      sessionCount: DEFAULT_SOUL_EVOLUTION_POLICY.requireMinSessions,
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("Cooling down between proposals");
  });
});
