import { describe, expect, it } from "vitest";
import {
  buildPolymarketPositionPlan,
  normalizePolymarketExecutionMode,
  resolvePolymarketExecutionGovernance,
  scorePolymarketOpportunities,
} from "../../../convex/ai/tools/polymarketTool";

const MARKET_FIXTURE = [
  {
    marketId: "m_alpha",
    question: "Will alpha happen?",
    yesPrice: 0.35,
    modelYesProbability: 0.45,
    liquidityUsd: 600_000,
    volume24hUsd: 220_000,
    confidence: 0.72,
  },
  {
    marketId: "m_beta",
    question: "Will beta happen?",
    yesPrice: 0.62,
    modelYesProbability: 0.58,
    liquidityUsd: 120_000,
    volume24hUsd: 50_000,
    confidence: 0.55,
  },
  {
    marketId: "m_gamma",
    question: "Will gamma happen?",
    yesPrice: 0.52,
    modelYesProbability: 0.67,
    liquidityUsd: 300_000,
    volume24hUsd: 95_000,
    confidence: 0.69,
  },
];

describe("polymarket tool contracts", () => {
  it("normalizes execution mode tokens to deterministic paper/live values", () => {
    expect(normalizePolymarketExecutionMode(undefined)).toBe("paper");
    expect(normalizePolymarketExecutionMode("live")).toBe("live");
    expect(normalizePolymarketExecutionMode("sandbox")).toBe("paper");
    expect(normalizePolymarketExecutionMode("simulation")).toBe("paper");
    expect(normalizePolymarketExecutionMode("unknown", "live")).toBe("live");
  });

  it("scores opportunities with deterministic ranking and directional side selection", () => {
    const scored = scorePolymarketOpportunities({ markets: MARKET_FIXTURE });

    expect(scored).toHaveLength(3);
    expect(scored[0]?.marketId).toBe("m_gamma");
    expect(scored[0]?.recommendedSide).toBe("YES");
    expect(scored[1]?.marketId).toBe("m_alpha");
    expect(scored[2]?.recommendedSide).toBe("NO");
    expect(scored[0]?.opportunityScore).toBeGreaterThan(scored[1]?.opportunityScore ?? 0);
  });

  it("builds risk-bounded plans that respect max position and count caps", () => {
    const opportunities = scorePolymarketOpportunities({ markets: MARKET_FIXTURE });
    const plan = buildPolymarketPositionPlan({
      opportunities,
      riskBudgetUsd: 120,
      maxPositionUsd: 55,
      maxOpenPositions: 2,
    });

    expect(plan.positionCount).toBeLessThanOrEqual(2);
    expect(plan.totalPlannedExposureUsd).toBeLessThanOrEqual(120);
    expect(plan.positions.every((position) => position.stakeUsd <= 55)).toBe(true);
  });

  it("requires explicit approval for live execution and fails closed without it", () => {
    const blocked = resolvePolymarketExecutionGovernance({
      requestedExecutionMode: "live",
      runtimeApprovalRequired: true,
      runtimeApprovalGranted: false,
    });
    expect(blocked.allowLiveExecution).toBe(false);
    expect(blocked.reason).toBe("live_approval_missing");

    const allowed = resolvePolymarketExecutionGovernance({
      requestedExecutionMode: "live",
      runtimeApprovalRequired: true,
      runtimeApprovalGranted: true,
      runtimeApprovalId: "approval_123",
    });
    expect(allowed.allowLiveExecution).toBe(true);
    expect(allowed.approvalId).toBe("approval_123");
    expect(allowed.reason).toBe("live_approval_verified");
  });
});
