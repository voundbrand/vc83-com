import { action } from "../../_generated/server";
import { v } from "convex/values";

export const POLYMARKET_RUNTIME_CONTRACT_VERSION =
  "yai_polymarket_native_runtime_v1" as const;
export const POLYMARKET_RUNTIME_ROUTE = "vc83_tool_registry" as const;
const POLYMARKET_EXECUTION_POLICY = "approval_required_for_live_execution" as const;

export type PolymarketExecutionMode = "paper" | "live";
export type PolymarketOrderSide = "YES" | "NO";

type PolymarketResearchAction =
  | "discover_markets"
  | "score_opportunities"
  | "plan_position"
  | "simulate_execution";

interface PolymarketMarketCandidate {
  marketId: string;
  question: string;
  category?: string;
  tags?: string[];
  yesPrice: number;
  modelYesProbability?: number;
  liquidityUsd?: number;
  volume24hUsd?: number;
  confidence?: number;
  closeTime?: string;
}

export interface PolymarketOpportunityScore {
  marketId: string;
  question: string;
  recommendedSide: PolymarketOrderSide;
  marketYesProbability: number;
  modelYesProbability: number;
  expectedEdgeBps: number;
  confidence: number;
  liquidityScore: number;
  volumeScore: number;
  opportunityScore: number;
}

interface PolymarketPositionPlanEntry {
  marketId: string;
  question: string;
  side: PolymarketOrderSide;
  stakeUsd: number;
  expectedEdgeBps: number;
  opportunityScore: number;
}

interface PolymarketPositionPlan {
  planId: string;
  positionCount: number;
  riskBudgetUsd: number;
  maxPositionUsd: number;
  totalPlannedExposureUsd: number;
  positions: PolymarketPositionPlanEntry[];
}

export interface PolymarketExecutionGovernanceDecision {
  policy: "approval_required_for_live_execution";
  requestedExecutionMode: PolymarketExecutionMode;
  effectiveExecutionMode: PolymarketExecutionMode;
  requiresApproval: boolean;
  approvalGranted: boolean;
  approvalId?: string;
  allowLiveExecution: boolean;
  reason:
    | "paper_mode"
    | "live_approval_verified"
    | "live_approval_missing";
}

const BASE_MARKET_UNIVERSE: PolymarketMarketCandidate[] = [
  {
    marketId: "pm_us_recession_2026",
    question: "Will the U.S. enter a recession in 2026?",
    category: "macro",
    tags: ["economy", "us", "macro"],
    yesPrice: 0.37,
    modelYesProbability: 0.42,
    liquidityUsd: 420_000,
    volume24hUsd: 180_000,
    confidence: 0.66,
  },
  {
    marketId: "pm_btc_150k_2026",
    question: "Will BTC reach $150k before 2027?",
    category: "crypto",
    tags: ["crypto", "btc"],
    yesPrice: 0.41,
    modelYesProbability: 0.36,
    liquidityUsd: 610_000,
    volume24hUsd: 320_000,
    confidence: 0.71,
  },
  {
    marketId: "pm_fed_cut_2026_q2",
    question: "Will the Fed cut rates by Q2 2026?",
    category: "macro",
    tags: ["fed", "rates", "macro"],
    yesPrice: 0.58,
    modelYesProbability: 0.49,
    liquidityUsd: 290_000,
    volume24hUsd: 150_000,
    confidence: 0.62,
  },
  {
    marketId: "pm_spx_6500_2026",
    question: "Will the S&P 500 close above 6,500 by end of 2026?",
    category: "equities",
    tags: ["equities", "spx"],
    yesPrice: 0.44,
    modelYesProbability: 0.52,
    liquidityUsd: 260_000,
    volume24hUsd: 96_000,
    confidence: 0.6,
  },
];

const polymarketMarketInputValidator = v.object({
  marketId: v.string(),
  question: v.string(),
  category: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  yesPrice: v.number(),
  modelYesProbability: v.optional(v.number()),
  liquidityUsd: v.optional(v.number()),
  volume24hUsd: v.optional(v.number()),
  confidence: v.optional(v.number()),
  closeTime: v.optional(v.string()),
});

function normalizeNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function clampBetweenZeroAndOne(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  const finite = toFiniteNumber(value);
  if (finite === undefined || finite <= 0) {
    return fallback;
  }
  return finite;
}

function normalizeInteger(value: unknown, fallback: number): number {
  const finite = toFiniteNumber(value);
  if (finite === undefined) {
    return fallback;
  }
  const floored = Math.floor(finite);
  return floored > 0 ? floored : fallback;
}

function normalizeOrderSide(value: unknown): PolymarketOrderSide | undefined {
  const normalized = normalizeNonEmptyString(value)?.toLowerCase();
  if (normalized === "yes") {
    return "YES";
  }
  if (normalized === "no") {
    return "NO";
  }
  return undefined;
}

function normalizeMarketCandidate(
  market: PolymarketMarketCandidate,
): PolymarketMarketCandidate {
  return {
    ...market,
    marketId: market.marketId.trim(),
    question: market.question.trim(),
    category: normalizeNonEmptyString(market.category),
    tags: Array.isArray(market.tags)
      ? market.tags
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [],
    yesPrice: clampBetweenZeroAndOne(market.yesPrice),
    modelYesProbability: market.modelYesProbability !== undefined
      ? clampBetweenZeroAndOne(market.modelYesProbability)
      : undefined,
    liquidityUsd: normalizePositiveNumber(market.liquidityUsd, 0),
    volume24hUsd: normalizePositiveNumber(market.volume24hUsd, 0),
    confidence: clampBetweenZeroAndOne(
      normalizePositiveNumber(market.confidence, 0.5),
    ),
    closeTime: normalizeNonEmptyString(market.closeTime),
  };
}

function resolveMarketUniverse(
  marketUniverse: PolymarketMarketCandidate[] | undefined,
): PolymarketMarketCandidate[] {
  const source =
    Array.isArray(marketUniverse) && marketUniverse.length > 0
      ? marketUniverse
      : BASE_MARKET_UNIVERSE;
  return source.map(normalizeMarketCandidate);
}

function scoreLogBucket(value: number, maxReference: number): number {
  if (!Number.isFinite(value) || value <= 0 || maxReference <= 0) {
    return 0;
  }
  const numerator = Math.log10(value + 1);
  const denominator = Math.log10(maxReference + 1);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return clampBetweenZeroAndOne(numerator / denominator);
}

export function normalizePolymarketExecutionMode(
  value: unknown,
  fallback: PolymarketExecutionMode = "paper",
): PolymarketExecutionMode {
  const normalized = normalizeNonEmptyString(value)?.toLowerCase();
  if (normalized === "live") {
    return "live";
  }
  if (
    normalized === "paper"
    || normalized === "sandbox"
    || normalized === "simulation"
  ) {
    return "paper";
  }
  return fallback;
}

export function scorePolymarketOpportunities(args: {
  markets: PolymarketMarketCandidate[];
  minAbsoluteEdgeBps?: number;
}): PolymarketOpportunityScore[] {
  const minAbsoluteEdgeBps = normalizePositiveNumber(args.minAbsoluteEdgeBps, 10);
  const scored = args.markets.map((market) => {
    const normalized = normalizeMarketCandidate(market);
    const modelYesProbability =
      normalized.modelYesProbability ?? normalized.yesPrice;
    const edge = modelYesProbability - normalized.yesPrice;
    const recommendedSide: PolymarketOrderSide =
      edge >= 0 ? "YES" : "NO";
    const absoluteEdge = Math.abs(edge);
    const expectedEdgeBps = roundTo(absoluteEdge * 10_000, 1);
    const liquidityScore = scoreLogBucket(normalized.liquidityUsd ?? 0, 1_000_000);
    const volumeScore = scoreLogBucket(normalized.volume24hUsd ?? 0, 500_000);
    const confidence = clampBetweenZeroAndOne(normalized.confidence ?? 0.5);
    const opportunityScore = roundTo(
      absoluteEdge * 0.55 + liquidityScore * 0.2 + volumeScore * 0.15 + confidence * 0.1,
      4,
    );

    return {
      marketId: normalized.marketId,
      question: normalized.question,
      recommendedSide,
      marketYesProbability: roundTo(normalized.yesPrice, 4),
      modelYesProbability: roundTo(modelYesProbability, 4),
      expectedEdgeBps,
      confidence: roundTo(confidence, 4),
      liquidityScore: roundTo(liquidityScore, 4),
      volumeScore: roundTo(volumeScore, 4),
      opportunityScore,
    };
  });

  return scored
    .filter((row) => row.expectedEdgeBps >= minAbsoluteEdgeBps)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export function buildPolymarketPositionPlan(args: {
  opportunities: PolymarketOpportunityScore[];
  riskBudgetUsd?: number;
  maxPositionUsd?: number;
  maxOpenPositions?: number;
}): PolymarketPositionPlan {
  const riskBudgetUsd = roundTo(
    normalizePositiveNumber(args.riskBudgetUsd, 250),
    2,
  );
  const maxPositionUsd = roundTo(
    Math.min(
      riskBudgetUsd,
      normalizePositiveNumber(args.maxPositionUsd, Math.min(75, riskBudgetUsd)),
    ),
    2,
  );
  const maxOpenPositions = Math.min(
    8,
    normalizeInteger(args.maxOpenPositions, 3),
  );

  const eligible = args.opportunities
    .filter((row) => row.expectedEdgeBps >= 25)
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, maxOpenPositions);

  if (eligible.length === 0) {
    return {
      planId: `pm_plan_empty_${Date.now()}`,
      positionCount: 0,
      riskBudgetUsd,
      maxPositionUsd,
      totalPlannedExposureUsd: 0,
      positions: [],
    };
  }

  const totalScore = eligible.reduce(
    (sum, opportunity) => sum + Math.max(opportunity.opportunityScore, 0.0001),
    0,
  );
  const positions = eligible.map((opportunity, index) => {
    const proportionalStake =
      riskBudgetUsd * (Math.max(opportunity.opportunityScore, 0.0001) / totalScore);
    const stakeUsd = roundTo(
      Math.min(maxPositionUsd, Math.max(5, proportionalStake)),
      2,
    );
    return {
      marketId: opportunity.marketId,
      question: opportunity.question,
      side: opportunity.recommendedSide,
      stakeUsd,
      expectedEdgeBps: opportunity.expectedEdgeBps,
      opportunityScore: opportunity.opportunityScore,
      // Preserve deterministic ordering if scores tie.
      tieBreaker: index,
    };
  });

  const ordered = positions.sort((a, b) => {
    if (b.opportunityScore === a.opportunityScore) {
      return a.tieBreaker - b.tieBreaker;
    }
    return b.opportunityScore - a.opportunityScore;
  });

  const totalPlannedExposureUsd = roundTo(
    ordered.reduce((sum, position) => sum + position.stakeUsd, 0),
    2,
  );

  return {
    planId: `pm_plan_${Date.now()}`,
    positionCount: ordered.length,
    riskBudgetUsd,
    maxPositionUsd,
    totalPlannedExposureUsd,
    positions: ordered.map(({ tieBreaker: _ignored, ...rest }) => rest),
  };
}

export function resolvePolymarketExecutionGovernance(args: {
  requestedExecutionMode: PolymarketExecutionMode;
  liveExecutionApprovalId?: string;
  runtimeApprovalRequired?: boolean;
  runtimeApprovalGranted?: boolean;
  runtimeApprovalId?: string;
}): PolymarketExecutionGovernanceDecision {
  const requestedExecutionMode = normalizePolymarketExecutionMode(
    args.requestedExecutionMode,
  );
  if (requestedExecutionMode === "paper") {
    return {
      policy: POLYMARKET_EXECUTION_POLICY,
      requestedExecutionMode,
      effectiveExecutionMode: "paper",
      requiresApproval: false,
      approvalGranted: true,
      allowLiveExecution: false,
      reason: "paper_mode",
    };
  }

  const approvalId =
    normalizeNonEmptyString(args.liveExecutionApprovalId)
    ?? normalizeNonEmptyString(args.runtimeApprovalId);
  const runtimeApprovalGranted = args.runtimeApprovalGranted === true;
  const approvalGranted = runtimeApprovalGranted || Boolean(approvalId);
  const allowLiveExecution = approvalGranted && Boolean(approvalId);

  return {
    policy: POLYMARKET_EXECUTION_POLICY,
    requestedExecutionMode,
    effectiveExecutionMode: "live",
    requiresApproval: args.runtimeApprovalRequired !== false,
    approvalGranted,
    approvalId,
    allowLiveExecution,
    reason: allowLiveExecution
      ? "live_approval_verified"
      : "live_approval_missing",
  };
}

function discoverMarkets(args: {
  marketUniverse: PolymarketMarketCandidate[];
  marketQuery?: string;
  tags?: string[];
  minLiquidityUsd?: number;
  minVolumeUsd?: number;
  limit?: number;
}): PolymarketMarketCandidate[] {
  const queryToken = normalizeNonEmptyString(args.marketQuery)?.toLowerCase();
  const requiredTags = (args.tags || [])
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);
  const minLiquidityUsd = normalizePositiveNumber(args.minLiquidityUsd, 0);
  const minVolumeUsd = normalizePositiveNumber(args.minVolumeUsd, 0);
  const limit = Math.min(30, normalizeInteger(args.limit, 8));

  const filtered = args.marketUniverse.filter((market) => {
    if (queryToken) {
      const haystack = [
        market.marketId,
        market.question,
        market.category,
        ...(market.tags || []),
      ]
        .filter((token): token is string => typeof token === "string")
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(queryToken)) {
        return false;
      }
    }
    if (requiredTags.length > 0) {
      const marketTags = new Set((market.tags || []).map((tag) => tag.toLowerCase()));
      if (!requiredTags.every((tag) => marketTags.has(tag))) {
        return false;
      }
    }
    if ((market.liquidityUsd ?? 0) < minLiquidityUsd) {
      return false;
    }
    if ((market.volume24hUsd ?? 0) < minVolumeUsd) {
      return false;
    }
    return true;
  });

  return filtered
    .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))
    .slice(0, limit);
}

function buildPolymarketAuditEnvelope(args: {
  action: string;
  executionMode: PolymarketExecutionMode;
  governance?: PolymarketExecutionGovernanceDecision;
  decision: "proposal" | "simulation" | "execution" | "blocked";
  reason: string;
}) {
  return {
    contractVersion: POLYMARKET_RUNTIME_CONTRACT_VERSION,
    nativeRoute: POLYMARKET_RUNTIME_ROUTE,
    executionPolicy: POLYMARKET_EXECUTION_POLICY,
    occurredAt: Date.now(),
    action: args.action,
    executionMode: args.executionMode,
    decision: args.decision,
    reason: args.reason,
    governance: args.governance,
  };
}

export const polymarketResearchToolDefinition = {
  type: "function" as const,
  function: {
    name: "manage_polymarket",
    description:
      "Native vc83 Polymarket research + paper-trading tool. Use for market discovery, opportunity scoring, risk-bounded position planning, and paper execution simulation. Live orders are intentionally blocked in this tool and must go through execute_polymarket_live with approval governance.",
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: [
            "discover_markets",
            "score_opportunities",
            "plan_position",
            "simulate_execution",
          ],
          description: "Research/paper action to perform",
        },
        marketQuery: {
          type: "string",
          description: "Free-text filter for market discovery",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags for market filtering",
        },
        marketUniverse: {
          type: "array",
          description:
            "Optional normalized market snapshots. If omitted, native fallback universe is used.",
          items: {
            type: "object",
            properties: {
              marketId: { type: "string" },
              question: { type: "string" },
              category: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              yesPrice: { type: "number" },
              modelYesProbability: { type: "number" },
              liquidityUsd: { type: "number" },
              volume24hUsd: { type: "number" },
              confidence: { type: "number" },
              closeTime: { type: "string" },
            },
            required: ["marketId", "question", "yesPrice"],
          },
        },
        minLiquidityUsd: {
          type: "number",
          description: "Minimum liquidity filter for discovery",
        },
        minVolumeUsd: {
          type: "number",
          description: "Minimum 24h volume filter for discovery",
        },
        limit: {
          type: "number",
          description: "Maximum number of records to return",
        },
        riskBudgetUsd: {
          type: "number",
          description: "Risk budget used by plan_position",
        },
        maxPositionUsd: {
          type: "number",
          description: "Per-position cap used by plan_position/simulate_execution",
        },
        maxOpenPositions: {
          type: "number",
          description: "Maximum number of positions in plan_position",
        },
        executionMode: {
          type: "string",
          enum: ["paper", "live"],
          description:
            "Requested mode for simulate_execution. live is blocked here and must use execute_polymarket_live.",
        },
        runtimeDefaultExecutionMode: {
          type: "string",
          enum: ["paper", "live"],
          description: "Runtime-injected default mode from native policy context",
        },
        marketId: {
          type: "string",
          description: "Target market id for simulate_execution",
        },
        side: {
          type: "string",
          enum: ["yes", "no"],
          description: "Order side for simulate_execution",
        },
        stakeUsd: {
          type: "number",
          description: "Stake size for simulate_execution",
        },
        priceLimit: {
          type: "number",
          description: "Optional limit price (0..1)",
        },
        rationale: {
          type: "string",
          description: "Optional rationale used in audit envelope",
        },
        idempotencyKey: {
          type: "string",
          description: "Optional deterministic identifier for simulation trace",
        },
      },
      required: ["action"],
    },
  },
};

export const polymarketLiveExecutionToolDefinition = {
  type: "function" as const,
  function: {
    name: "execute_polymarket_live",
    description:
      "Native vc83 Polymarket live-order tool. This path is approval-governed and fail-closed: execution requires explicit approval context and a live approval artifact.",
    parameters: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["execute_live_order"],
          description: "Live execution action",
        },
        executionMode: {
          type: "string",
          enum: ["live"],
          description: "Must be live for this tool",
        },
        runtimeDefaultExecutionMode: {
          type: "string",
          enum: ["paper", "live"],
          description: "Runtime-injected domain default mode",
        },
        marketId: {
          type: "string",
          description: "Target market id",
        },
        question: {
          type: "string",
          description: "Optional market question for audit readability",
        },
        side: {
          type: "string",
          enum: ["yes", "no"],
          description: "Order side",
        },
        stakeUsd: {
          type: "number",
          description: "Stake amount in USD",
        },
        maxPositionUsd: {
          type: "number",
          description: "Per-order risk cap in USD",
        },
        priceLimit: {
          type: "number",
          description: "Optional limit price (0..1)",
        },
        rationale: {
          type: "string",
          description: "Execution rationale for auditability",
        },
        idempotencyKey: {
          type: "string",
          description: "Stable idempotency key for deterministic order intents",
        },
        liveExecutionApprovalId: {
          type: "string",
          description: "Explicit approval artifact id for live execution",
        },
        runtimeApprovalRequired: {
          type: "boolean",
          description: "Runtime-injected approval-required signal",
        },
        runtimeApprovalGranted: {
          type: "boolean",
          description: "Runtime-injected approval-granted signal",
        },
        runtimeApprovalId: {
          type: "string",
          description: "Runtime-injected approval id from policy context",
        },
      },
      required: ["action", "marketId", "side", "stakeUsd"],
    },
  },
};

export const executeManagePolymarket = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    conversationId: v.optional(v.id("aiConversations")),
    action: v.string(),
    marketQuery: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    marketUniverse: v.optional(v.array(polymarketMarketInputValidator)),
    minLiquidityUsd: v.optional(v.number()),
    minVolumeUsd: v.optional(v.number()),
    limit: v.optional(v.number()),
    riskBudgetUsd: v.optional(v.number()),
    maxPositionUsd: v.optional(v.number()),
    maxOpenPositions: v.optional(v.number()),
    executionMode: v.optional(v.string()),
    runtimeDefaultExecutionMode: v.optional(v.string()),
    marketId: v.optional(v.string()),
    side: v.optional(v.string()),
    stakeUsd: v.optional(v.number()),
    priceLimit: v.optional(v.number()),
    rationale: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const action = normalizeNonEmptyString(args.action) as PolymarketResearchAction | undefined;
    const marketUniverse = resolveMarketUniverse(args.marketUniverse);
    const executionMode = normalizePolymarketExecutionMode(
      args.executionMode ?? args.runtimeDefaultExecutionMode,
      "paper",
    );

    if (!action) {
      return {
        success: false,
        action: args.action,
        error: "invalid_action",
        message:
          "Action is required. Supported actions: discover_markets, score_opportunities, plan_position, simulate_execution.",
      };
    }

    if (
      action !== "discover_markets"
      && action !== "score_opportunities"
      && action !== "plan_position"
      && action !== "simulate_execution"
    ) {
      return {
        success: false,
        action,
        error: "unsupported_action",
        message:
          "Unsupported action. Supported actions: discover_markets, score_opportunities, plan_position, simulate_execution.",
      };
    }

    if (action === "discover_markets") {
      const discovered = discoverMarkets({
        marketUniverse,
        marketQuery: args.marketQuery,
        tags: args.tags,
        minLiquidityUsd: args.minLiquidityUsd,
        minVolumeUsd: args.minVolumeUsd,
        limit: args.limit,
      });
      return {
        success: true,
        action,
        executionMode: "paper" as const,
        data: {
          markets: discovered,
          total: discovered.length,
        },
        audit: buildPolymarketAuditEnvelope({
          action,
          executionMode: "paper",
          decision: "proposal",
          reason: "market_discovery_completed",
        }),
        message: `Discovered ${discovered.length} market(s) in native Polymarket research mode.`,
      };
    }

    if (action === "score_opportunities") {
      const opportunities = scorePolymarketOpportunities({
        markets: marketUniverse,
      });
      return {
        success: true,
        action,
        executionMode: "paper" as const,
        data: {
          opportunities,
          total: opportunities.length,
        },
        audit: buildPolymarketAuditEnvelope({
          action,
          executionMode: "paper",
          decision: "proposal",
          reason: "opportunity_scoring_completed",
        }),
        message: `Scored ${opportunities.length} opportunity candidate(s).`,
      };
    }

    if (action === "plan_position") {
      const opportunities = scorePolymarketOpportunities({
        markets: marketUniverse,
      });
      const plan = buildPolymarketPositionPlan({
        opportunities,
        riskBudgetUsd: args.riskBudgetUsd,
        maxPositionUsd: args.maxPositionUsd,
        maxOpenPositions: args.maxOpenPositions,
      });
      return {
        success: true,
        action,
        executionMode: "paper" as const,
        data: {
          opportunities,
          plan,
        },
        audit: buildPolymarketAuditEnvelope({
          action,
          executionMode: "paper",
          decision: "proposal",
          reason:
            plan.positionCount > 0
              ? "position_plan_generated"
              : "position_plan_empty",
        }),
        message:
          plan.positionCount > 0
            ? `Generated plan ${plan.planId} with ${plan.positionCount} position(s).`
            : "No eligible opportunities cleared plan thresholds.",
      };
    }

    if (executionMode === "live") {
      return {
        success: false,
        action,
        executionMode,
        error: "live_execution_requires_native_mutation_tool",
        message:
          "Live execution is blocked in manage_polymarket. Use execute_polymarket_live with approval governance.",
        audit: buildPolymarketAuditEnvelope({
          action,
          executionMode,
          decision: "blocked",
          reason: "live_execution_path_blocked_in_read_only_tool",
        }),
      };
    }

    const marketId = normalizeNonEmptyString(args.marketId);
    const side = normalizeOrderSide(args.side);
    const stakeUsd = normalizePositiveNumber(args.stakeUsd, 0);
    const maxPositionUsd = normalizePositiveNumber(args.maxPositionUsd, 75);
    const selectedMarket = marketUniverse.find(
      (market) => market.marketId === marketId,
    );

    if (!marketId || !side || stakeUsd <= 0) {
      return {
        success: false,
        action,
        executionMode: "paper" as const,
        error: "invalid_simulation_payload",
        message:
          "simulate_execution requires marketId, side (yes/no), and positive stakeUsd.",
      };
    }

    if (stakeUsd > maxPositionUsd) {
      return {
        success: false,
        action,
        executionMode: "paper" as const,
        error: "risk_cap_exceeded",
        message: `Stake ${stakeUsd} exceeds maxPositionUsd ${maxPositionUsd}.`,
      };
    }

    const priceLimit = clampBetweenZeroAndOne(
      normalizePositiveNumber(
        args.priceLimit,
        selectedMarket?.yesPrice ?? 0.5,
      ),
    );
    const simulationId =
      normalizeNonEmptyString(args.idempotencyKey)
      ?? `pm_paper_${marketId}_${Date.now()}`;
    const expectedFillPrice = side === "YES" ? priceLimit : 1 - priceLimit;

    return {
      success: true,
      action,
      executionMode: "paper" as const,
      data: {
        simulationId,
        marketId,
        question: selectedMarket?.question,
        side,
        stakeUsd: roundTo(stakeUsd, 2),
        expectedFillPrice: roundTo(expectedFillPrice, 4),
        expectedContracts: roundTo(stakeUsd / Math.max(expectedFillPrice, 0.01), 4),
        rationale: normalizeNonEmptyString(args.rationale),
      },
      audit: buildPolymarketAuditEnvelope({
        action,
        executionMode: "paper",
        decision: "simulation",
        reason: "paper_execution_simulated",
      }),
      message: `Paper execution simulated for ${marketId} (${side}) with stake ${roundTo(stakeUsd, 2)} USD.`,
    };
  },
});

export const executePolymarketLiveExecution = action({
  args: {
    sessionId: v.optional(v.string()),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    conversationId: v.optional(v.id("aiConversations")),
    action: v.string(),
    executionMode: v.optional(v.string()),
    runtimeDefaultExecutionMode: v.optional(v.string()),
    marketId: v.string(),
    question: v.optional(v.string()),
    side: v.string(),
    stakeUsd: v.number(),
    maxPositionUsd: v.optional(v.number()),
    priceLimit: v.optional(v.number()),
    rationale: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    liveExecutionApprovalId: v.optional(v.string()),
    runtimeApprovalRequired: v.optional(v.boolean()),
    runtimeApprovalGranted: v.optional(v.boolean()),
    runtimeApprovalId: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const action = normalizeNonEmptyString(args.action);
    if (action !== "execute_live_order") {
      return {
        success: false,
        action: args.action,
        error: "unsupported_action",
        message: "execute_polymarket_live only supports action=execute_live_order.",
      };
    }

    const requestedMode = normalizePolymarketExecutionMode(
      args.executionMode ?? args.runtimeDefaultExecutionMode,
      "live",
    );
    const governance = resolvePolymarketExecutionGovernance({
      requestedExecutionMode: requestedMode,
      liveExecutionApprovalId: args.liveExecutionApprovalId,
      runtimeApprovalRequired: args.runtimeApprovalRequired,
      runtimeApprovalGranted: args.runtimeApprovalGranted,
      runtimeApprovalId: args.runtimeApprovalId,
    });

    if (!governance.allowLiveExecution) {
      return {
        success: false,
        action,
        executionMode: "live" as const,
        error: "live_execution_approval_required",
        governance,
        audit: buildPolymarketAuditEnvelope({
          action,
          executionMode: "live",
          governance,
          decision: "blocked",
          reason: governance.reason,
        }),
        message:
          "Live Polymarket execution is blocked. Approval artifact is required before order submission.",
      };
    }

    const side = normalizeOrderSide(args.side);
    if (!side) {
      return {
        success: false,
        action,
        executionMode: "live" as const,
        error: "invalid_side",
        message: "side must be yes or no.",
      };
    }

    const stakeUsd = normalizePositiveNumber(args.stakeUsd, 0);
    if (stakeUsd <= 0) {
      return {
        success: false,
        action,
        executionMode: "live" as const,
        error: "invalid_stake",
        message: "stakeUsd must be greater than zero.",
      };
    }

    const maxPositionUsd = normalizePositiveNumber(args.maxPositionUsd, 100);
    if (stakeUsd > maxPositionUsd) {
      return {
        success: false,
        action,
        executionMode: "live" as const,
        error: "risk_cap_exceeded",
        message: `Stake ${roundTo(stakeUsd, 2)} exceeds maxPositionUsd ${roundTo(maxPositionUsd, 2)}.`,
      };
    }

    const priceLimit = clampBetweenZeroAndOne(
      normalizePositiveNumber(args.priceLimit, 0.5),
    );
    const orderIntentId =
      normalizeNonEmptyString(args.idempotencyKey)
      ?? `pm_live_${args.marketId}_${Date.now()}`;

    return {
      success: true,
      action,
      executionMode: "live" as const,
      governance,
      data: {
        status: "submitted",
        orderIntentId,
        marketId: args.marketId,
        question: normalizeNonEmptyString(args.question),
        side,
        stakeUsd: roundTo(stakeUsd, 2),
        priceLimit: roundTo(priceLimit, 4),
        approvalId: governance.approvalId,
        nativeRoute: POLYMARKET_RUNTIME_ROUTE,
        rationale: normalizeNonEmptyString(args.rationale),
      },
      audit: buildPolymarketAuditEnvelope({
        action,
        executionMode: "live",
        governance,
        decision: "execution",
        reason: "live_order_submitted",
      }),
      message: `Live order submitted for ${args.marketId} (${side}) under approval ${governance.approvalId}.`,
    };
  },
});
