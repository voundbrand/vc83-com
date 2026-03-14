/**
 * SELF-IMPROVEMENT LOOP
 *
 * The engine that drives continuous agent improvement.
 * Runs as scheduled jobs and inline hooks.
 *
 * Four phases: Observe → Reflect → Propose → Learn
 */

import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import {
  buildMissingWaeScorePacket,
  buildWaeEvalRecommendationPacket,
  normalizeWaeRunRecord,
  normalizeWaeScenarioRecords,
  scoreWaeEvalBundle,
  WAE_EVAL_RECOMMENDATION_PACKET_VERSION,
  WAE_EVAL_SCORE_PACKET_VERSION,
  type WaeEvalRecommendation,
  type WaeEvalRecommendationPacket,
  type WaeEvalScorePacket,
} from "./tools/evalAnalystTool";
import { resolvePlatformSoulScope } from "./platformSoulScope";
import { SOUL_V2_OVERLAY_VERSION } from "./soulEvolution";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

export const WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION =
  "wae_improvement_workflow_v1" as const;

type WaeImprovementWorkflowState =
  | "pending_owner_approval"
  | "approved_pending_apply"
  | "applied_pending_verification"
  | "verified"
  | "rolled_back"
  | "blocked";

interface WaeImprovementProposalDraft {
  contractVersion: typeof WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION;
  allowed: boolean;
  blockedReason?: string;
  workflowState: WaeImprovementWorkflowState;
  rollbackPlan: {
    targetVersion: number;
    autoRollbackOnRegression: true;
  };
  recommendationId?: string;
  recommendationTarget?: "agent" | "prompt";
  runId?: string;
  suiteKeyHash?: string;
  proposalSummary?: string;
  driftSummary?: string;
  telemetrySummary?: string;
}

interface WaeImprovementVerificationDecision {
  contractVersion: typeof WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION;
  workflowState: WaeImprovementWorkflowState;
  rollbackRequired: boolean;
  blockedReason?: string;
  summary: string;
}

function normalizeNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => normalizeNonEmptyString(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function normalizeFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeWaeImprovementRecommendationPacket(
  value: unknown,
): WaeEvalRecommendationPacket | null {
  const record = readRecord(value);
  if (!record) {
    return null;
  }
  if (record.contractVersion !== WAE_EVAL_RECOMMENDATION_PACKET_VERSION) {
    return null;
  }

  const runId = normalizeNonEmptyString(record.runId);
  const suiteKeyHash = normalizeNonEmptyString(record.suiteKeyHash);
  const verdict = normalizeNonEmptyString(record.verdict);
  const decision = normalizeNonEmptyString(record.decision);
  if (
    !runId
    || !suiteKeyHash
    || (verdict !== "passed" && verdict !== "failed" && verdict !== "blocked")
    || (decision !== "proceed" && decision !== "hold")
  ) {
    return null;
  }

  const recommendations: WaeEvalRecommendation[] = Array.isArray(record.recommendations)
    ? record.recommendations
        .map((entry): WaeEvalRecommendation | null => {
          const recommendation = readRecord(entry);
          if (!recommendation) {
            return null;
          }
          const recommendationId = normalizeNonEmptyString(recommendation.recommendationId);
          const target = normalizeNonEmptyString(recommendation.target);
          const priority = normalizeNonEmptyString(recommendation.priority);
          const clusterReason = normalizeNonEmptyString(recommendation.clusterReason);
          const title = normalizeNonEmptyString(recommendation.title);
          const summary = normalizeNonEmptyString(recommendation.summary);
          if (
            !recommendationId
            || (target !== "agent" && target !== "prompt" && target !== "tool" && target !== "gate")
            || (priority !== "high" && priority !== "medium")
            || !clusterReason
            || !title
            || !summary
          ) {
            return null;
          }
          const evidence: WaeEvalRecommendation["evidence"] = Array.isArray(recommendation.evidence)
            ? recommendation.evidence
                .map((evidenceEntry): WaeEvalRecommendation["evidence"][number] | null => {
                  const evidenceRecord = readRecord(evidenceEntry);
                  if (!evidenceRecord) {
                    return null;
                  }
                  const evidenceId = normalizeNonEmptyString(evidenceRecord.evidenceId);
                  const summaryValue = normalizeNonEmptyString(evidenceRecord.summary);
                  if (!evidenceId || !summaryValue) {
                    return null;
                  }
                  const normalizedEvidence: WaeEvalRecommendation["evidence"][number] = {
                    evidenceId,
                    summary: summaryValue,
                    failedMetrics: normalizeStringArray(evidenceRecord.failedMetrics),
                    reasonCodes: normalizeStringArray(evidenceRecord.reasonCodes),
                    artifactPaths: normalizeStringArray(evidenceRecord.artifactPaths),
                  };
                  const scenarioId = normalizeNonEmptyString(evidenceRecord.scenarioId);
                  const agentId = normalizeNonEmptyString(evidenceRecord.agentId);
                  if (scenarioId) {
                    normalizedEvidence.scenarioId = scenarioId;
                  }
                  if (agentId) {
                    normalizedEvidence.agentId = agentId;
                  }
                  return normalizedEvidence;
                })
                .filter((evidence): evidence is WaeEvalRecommendation["evidence"][number] => Boolean(evidence))
            : [];

          return {
            recommendationId,
            target,
            priority,
            clusterReason,
            title,
            summary,
            scenarioIds: normalizeStringArray(recommendation.scenarioIds),
            agentIds: normalizeStringArray(recommendation.agentIds),
            failedMetrics: normalizeStringArray(recommendation.failedMetrics),
            recommendedActions: normalizeStringArray(recommendation.recommendedActions),
            evidence,
          } satisfies WaeEvalRecommendation;
        })
        .filter((recommendation): recommendation is WaeEvalRecommendation => Boolean(recommendation))
    : [];

  return {
    contractVersion: WAE_EVAL_RECOMMENDATION_PACKET_VERSION,
    sourceScoreContractVersion: WAE_EVAL_SCORE_PACKET_VERSION,
    runId,
    suiteKeyHash,
    verdict,
    decision,
    blockedReasons: normalizeStringArray(record.blockedReasons),
    recommendationCount: recommendations.length,
    recommendations,
  };
}

function findWaeRecommendation(
  packet: WaeEvalRecommendationPacket,
  recommendationId: string,
): WaeEvalRecommendation | null {
  return (
    packet.recommendations.find(
      (recommendation) => recommendation.recommendationId === recommendationId,
    ) || null
  );
}

function readSoulVersion(customProperties: Record<string, unknown> | undefined): number {
  const soul = readRecord(customProperties?.soul);
  return normalizeFiniteNumber(soul?.version) ?? 1;
}

function summarizeRecommendationEvidence(recommendation: WaeEvalRecommendation): string {
  const evidenceLines = recommendation.evidence
    .map((evidence) => evidence.summary)
    .filter((entry) => entry.length > 0);
  return evidenceLines.join(" | ");
}

export function buildWaeImprovementProposalDraft(args: {
  recommendationPacket: unknown;
  recommendationId: string;
  agentId: string;
  agentCustomProperties: Record<string, unknown> | undefined;
}): WaeImprovementProposalDraft {
  const packet = normalizeWaeImprovementRecommendationPacket(args.recommendationPacket);
  const baselineVersion = readSoulVersion(args.agentCustomProperties);

  if (!packet) {
    return {
      contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
      allowed: false,
      blockedReason: "wae_recommendation_packet_invalid",
      workflowState: "blocked",
      rollbackPlan: {
        targetVersion: baselineVersion,
        autoRollbackOnRegression: true,
      },
    };
  }

  const platformScope = resolvePlatformSoulScope(args.agentCustomProperties);
  if (platformScope.isPlatformL2) {
    return {
      contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
      allowed: false,
      blockedReason: "platform_soul_admin_required",
      workflowState: "blocked",
      rollbackPlan: {
        targetVersion: baselineVersion,
        autoRollbackOnRegression: true,
      },
      runId: packet.runId,
      suiteKeyHash: packet.suiteKeyHash,
    };
  }

  const recommendation = findWaeRecommendation(packet, args.recommendationId);
  if (!recommendation) {
    return {
      contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
      allowed: false,
      blockedReason: "wae_recommendation_missing",
      workflowState: "blocked",
      rollbackPlan: {
        targetVersion: baselineVersion,
        autoRollbackOnRegression: true,
      },
      runId: packet.runId,
      suiteKeyHash: packet.suiteKeyHash,
    };
  }

  if (recommendation.target !== "agent" && recommendation.target !== "prompt") {
    return {
      contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
      allowed: false,
      blockedReason: "wae_recommendation_target_requires_manual_followup",
      workflowState: "blocked",
      rollbackPlan: {
        targetVersion: baselineVersion,
        autoRollbackOnRegression: true,
      },
      recommendationId: recommendation.recommendationId,
      runId: packet.runId,
      suiteKeyHash: packet.suiteKeyHash,
    };
  }

  if (
    recommendation.agentIds.length > 0
    && !recommendation.agentIds.includes(args.agentId)
  ) {
    return {
      contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
      allowed: false,
      blockedReason: "wae_recommendation_agent_mismatch",
      workflowState: "blocked",
      rollbackPlan: {
        targetVersion: baselineVersion,
        autoRollbackOnRegression: true,
      },
      recommendationId: recommendation.recommendationId,
      runId: packet.runId,
      suiteKeyHash: packet.suiteKeyHash,
    };
  }

  const evidenceSummary = summarizeRecommendationEvidence(recommendation);
  return {
    contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
    allowed: true,
    workflowState: "pending_owner_approval",
    rollbackPlan: {
      targetVersion: baselineVersion,
      autoRollbackOnRegression: true,
    },
    recommendationId: recommendation.recommendationId,
    recommendationTarget: recommendation.target,
    runId: packet.runId,
    suiteKeyHash: packet.suiteKeyHash,
    proposalSummary:
      `${recommendation.title} :: ${recommendation.summary}`,
    driftSummary:
      `WAE ${packet.runId} ${recommendation.recommendationId}`
      + ` scenarios=${recommendation.scenarioIds.join(", ") || "none"}`
      + ` failedMetrics=${recommendation.failedMetrics.join(", ") || "none"}.`,
    telemetrySummary: evidenceSummary,
  };
}

function normalizeWaeScorePacket(value: unknown): WaeEvalScorePacket | null {
  const record = readRecord(value);
  if (!record || record.contractVersion !== WAE_EVAL_SCORE_PACKET_VERSION) {
    return null;
  }
  const runId = normalizeNonEmptyString(record.runId);
  const suiteKeyHash = normalizeNonEmptyString(record.suiteKeyHash);
  const verdict = normalizeNonEmptyString(record.verdict);
  const decision = normalizeNonEmptyString(record.decision);
  if (
    !runId
    || !suiteKeyHash
    || (verdict !== "passed" && verdict !== "failed" && verdict !== "blocked")
    || (decision !== "proceed" && decision !== "hold")
  ) {
    return null;
  }

  return {
    contractVersion: WAE_EVAL_SCORE_PACKET_VERSION,
    rubricContractVersion: "wae_eval_weighted_rubric_v1",
    runId,
    suiteKeyHash,
    verdict,
    decision,
    resultLabel: verdict === "passed" ? "PASS" : "FAIL",
    weightedScore: normalizeFiniteNumber(record.weightedScore) ?? 0,
    thresholds: {
      pass: 0.85,
      hold: 0.7,
    },
    counts: {
      scenarios: 0,
      runnable: 0,
      skipped: 0,
      passed: 0,
      failed: 0,
    },
    aggregateDimensions: {} as WaeEvalScorePacket["aggregateDimensions"],
    scenarioBreakdown: [],
    failedMetrics: normalizeStringArray(record.failedMetrics),
    warnings: normalizeStringArray(record.warnings),
    blockedReasons: normalizeStringArray(record.blockedReasons),
    requiredRemediation: [],
  };
}

export function evaluateWaeImprovementVerificationResult(
  scorePacket: unknown,
): WaeImprovementVerificationDecision {
  const normalized = normalizeWaeScorePacket(scorePacket);
  if (!normalized) {
    return {
      contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
      workflowState: "blocked",
      rollbackRequired: false,
      blockedReason: "wae_post_apply_score_missing_or_invalid",
      summary: "Post-apply WAE verification is missing or invalid.",
    };
  }

  if (normalized.verdict === "passed" && normalized.decision === "proceed") {
    return {
      contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
      workflowState: "verified",
      rollbackRequired: false,
      summary: `Post-apply WAE verification passed for ${normalized.runId}.`,
    };
  }

  const reasons =
    normalized.blockedReasons.length > 0
      ? normalized.blockedReasons
      : normalized.failedMetrics;

  return {
    contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
    workflowState: "rolled_back",
    rollbackRequired: true,
    blockedReason: reasons[0] || "wae_post_apply_regression_detected",
    summary:
      `Post-apply WAE verification regressed for ${normalized.runId}: `
      + `${reasons.join(", ") || "unknown_reason"}.`,
  };
}

function readWaeWorkflowState(value: unknown): WaeImprovementWorkflowState | null {
  const workflowState = normalizeNonEmptyString(value);
  if (
    workflowState === "pending_owner_approval"
    || workflowState === "approved_pending_apply"
    || workflowState === "applied_pending_verification"
    || workflowState === "verified"
    || workflowState === "rolled_back"
    || workflowState === "blocked"
  ) {
    return workflowState;
  }
  return null;
}

async function loadAgentInternal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  agentId: any,
) {
  return await ctx.runQuery(generatedApi.internal.agentOntology.getAgentInternal, {
    agentId,
  });
}

// ============================================================================
// PHASE 1: OBSERVE — Track conversation outcomes
// ============================================================================

/**
 * Called at the end of each conversation (after session goes idle).
 * Extracts metrics and signals from the conversation.
 */
export const recordConversationMetrics = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Load session messages
    const messages = await (ctx as any).runQuery(
      generatedApi.internal.ai.agentSessions.getSessionMessages,
      { sessionId: args.sessionId }
    );

    if (!messages?.length) return;

    // 2. Count metrics
    const messageCount = messages.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCalls = messages.filter((m: any) => m.toolCalls?.length > 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolCallCount = toolCalls.reduce((sum: number, m: any) => sum + (m.toolCalls?.length || 0), 0);
    const toolFailures = toolCalls.filter((m: any) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      m.toolCalls?.some((tc: any) => tc.result?.error)
    ).length;

    // 3. Detect escalation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const escalated = messages.some((m: any) =>
      m.content?.includes("tag_in_specialist") || m.content?.includes("Let me bring in")
    );

    // 4. Detect owner corrections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownerCorrected = messages.some((m: any) =>
      m.role === "user" && m.metadata?.isOwnerInstruction
    );

    // 5. Find unanswered questions
    const unknownPatterns = [
      "I don't have that information",
      "I'm not sure about",
      "I don't know",
      "let me check with",
      "I'll need to find out",
    ];
    const unansweredQuestions: string[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        const lower = msg.content?.toLowerCase() || "";
        if (unknownPatterns.some(p => lower.includes(p.toLowerCase()))) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prevUser = messages.slice(0, i).reverse().find((m: any) => m.role === "user");
          if (prevUser?.content) {
            unansweredQuestions.push(prevUser.content.slice(0, 200));
          }
        }
      }
    }

    // 6. Detect media types handled
    const mediaTypesHandled = messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.toolCalls?.some((tc: any) =>
        ["transcribe_audio", "analyze_image", "parse_document"].includes(tc.name)
      ))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((m: any) => m.toolCalls?.map((tc: any) => tc.name) || []);

    // 7. Sentiment heuristic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop();
    const lastContent = lastUserMsg?.content?.toLowerCase() || "";
    let customerSentiment: "positive" | "neutral" | "negative" | "unknown" = "unknown";
    const positiveSignals = ["thank", "great", "perfect", "awesome", "love", "excellent"];
    const negativeSignals = ["terrible", "awful", "worst", "frustrated", "angry", "useless", "disappointed"];
    if (positiveSignals.some(s => lastContent.includes(s))) customerSentiment = "positive";
    else if (negativeSignals.some(s => lastContent.includes(s))) customerSentiment = "negative";
    else if (messages.length > 2) customerSentiment = "neutral";

    // 8. Calculate response time
    const assistantTimes = messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.role === "assistant" && m._creationTime)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m._creationTime as number);
    const userTimes = messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.role === "user" && m._creationTime)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m._creationTime as number);
    let avgResponseTimeMs: number | undefined;
    if (assistantTimes.length > 0 && userTimes.length > 0) {
      const responseTimes: number[] = [];
      for (const aTime of assistantTimes) {
        const prevUserTime = userTimes.filter((t: number) => t < aTime).pop();
        if (prevUserTime) responseTimes.push(aTime - prevUserTime);
      }
      if (responseTimes.length > 0) {
        avgResponseTimeMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
    }

    // 9. Store metrics
    await (ctx as any).runMutation(
      generatedApi.internal.ai.selfImprovement.storeConversationMetrics,
      {
        organizationId: args.organizationId,
        agentId: args.agentId,
        sessionId: args.sessionId,
        channel: args.channel,
        messageCount,
        toolCallCount,
        toolFailureCount: toolFailures,
        escalated,
        customerSentiment,
        ownerCorrected,
        unansweredQuestions: unansweredQuestions.length > 0 ? unansweredQuestions : undefined,
        mediaTypesHandled: mediaTypesHandled.length > 0 ? mediaTypesHandled : undefined,
        startedAt: messages[0]?._creationTime || Date.now(),
        endedAt: messages[messages.length - 1]?._creationTime,
        avgResponseTimeMs,
      }
    );

    // Mark session as metrics recorded
    await (ctx as any).runMutation(
      generatedApi.internal.ai.selfImprovement.markSessionMetricsRecorded,
      { sessionId: args.sessionId }
    );
  },
});

export const storeConversationMetrics = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    sessionId: v.id("agentSessions"),
    channel: v.string(),
    messageCount: v.number(),
    toolCallCount: v.number(),
    toolFailureCount: v.number(),
    escalated: v.boolean(),
    customerSentiment: v.optional(v.union(
      v.literal("positive"), v.literal("neutral"), v.literal("negative"), v.literal("unknown")
    )),
    ownerCorrected: v.boolean(),
    unansweredQuestions: v.optional(v.array(v.string())),
    mediaTypesHandled: v.optional(v.array(v.string())),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    avgResponseTimeMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentConversationMetrics", args);
  },
});

export const markSessionMetricsRecorded = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, { metricsRecorded: true });
  },
});

// ============================================================================
// PHASE 2: REFLECT — Periodic self-analysis
// ============================================================================

/**
 * Daily reflection — reviews metrics and generates improvement proposals.
 */
export const dailyReflection = internalAction({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Consolidated path: reuse the soulEvolution reflection runtime so we only
    // maintain one reflection engine and policy guard surface.
    return await (ctx as any).runAction(
      generatedApi.internal.ai.soulEvolution.runSelfReflection,
      {
        agentId: args.agentId,
        organizationId: args.organizationId,
      }
    );
  },
});

/**
 * Generate deterministic WAE recommendation packets from a scored eval bundle.
 * This remains suggestion-only; later rows handle approval and application.
 */
export const generateWaeImprovementRecommendations = internalAction({
  args: {
    waeRunRecord: v.any(),
    waeScenarioRecords: v.optional(v.array(v.any())),
  },
  handler: async (_ctx, args) => {
    const runRecord = normalizeWaeRunRecord(args.waeRunRecord);
    const scenarioRecords = normalizeWaeScenarioRecords(args.waeScenarioRecords || []);
    const scorePacket =
      runRecord === null
        ? buildMissingWaeScorePacket()
        : scoreWaeEvalBundle({
            runRecord,
            scenarioRecords,
          });

    return buildWaeEvalRecommendationPacket({
      runRecord,
      scenarioRecords,
      scorePacket,
    });
  },
});

export const updateWaeImprovementWorkflowState = internalMutation({
  args: {
    proposalId: v.id("soulProposals"),
    workflowPatch: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.proposalId, args.workflowPatch);
  },
});

export const getWaeImprovementWorkflowState = internalQuery({
  args: {
    proposalId: v.id("soulProposals"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) {
      return null;
    }

    return {
      contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
      proposalId: proposal._id,
      proposalStatus: proposal.status,
      workflowState:
        readWaeWorkflowState(proposal.workflowState)
        ?? (proposal.status === "approved"
          ? "approved_pending_apply"
          : proposal.status === "applied"
            ? "applied_pending_verification"
            : proposal.status === "pending"
              ? "pending_owner_approval"
              : "blocked"),
      recommendationId: proposal.waeRecommendationId,
      recommendationTarget: proposal.waeRecommendationTarget,
      baselineSoulVersion: proposal.waeBaselineSoulVersion,
      appliedSoulVersion: proposal.waeAppliedSoulVersion,
      rollbackTargetVersion: proposal.waeRollbackTargetVersion,
      verificationSummary: proposal.waeVerificationSummary,
    };
  },
});

export const ensureWaeRollbackCheckpoint = internalMutation({
  args: {
    agentId: v.id("objects"),
    organizationId: v.id("organizations"),
    targetVersion: v.number(),
    soulSnapshot: v.string(),
    requestedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("soulVersionHistory")
      .withIndex("by_agent_version", (q) =>
        q.eq("agentId", args.agentId).eq("version", args.targetVersion),
      )
      .first();

    if (existing) {
      return {
        checkpointCreated: false,
        targetVersion: args.targetVersion,
      };
    }

    await ctx.db.insert("soulVersionHistory", {
      agentId: args.agentId,
      organizationId: args.organizationId,
      version: args.targetVersion,
      previousSoul: args.soulSnapshot,
      newSoul: args.soulSnapshot,
      changeType: "wae_improvement_baseline_checkpoint",
      fromVersion: args.targetVersion,
      toVersion: args.targetVersion,
      soulSchemaVersion: SOUL_V2_OVERLAY_VERSION,
      soulOverlayVersion: SOUL_V2_OVERLAY_VERSION,
      rollbackCheckpointId:
        `wae_baseline:${String(args.agentId)}:${args.targetVersion}:${Date.now()}`,
      changedBy: args.requestedBy,
      changedAt: Date.now(),
    } as any);

    return {
      checkpointCreated: true,
      targetVersion: args.targetVersion,
    };
  },
});

/**
 * Stage a concrete WAE recommendation as a soul proposal that must still go
 * through the existing owner approval path before application.
 */
export const stageWaeImprovementProposal = internalAction({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    recommendationPacket: v.any(),
    recommendationId: v.string(),
    proposalType: v.union(
      v.literal("add"),
      v.literal("modify"),
      v.literal("remove"),
      v.literal("add_faq"),
    ),
    targetField: v.string(),
    proposedValue: v.string(),
    currentValue: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await loadAgentInternal(ctx, args.agentId);
    if (!agent) {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason: "wae_improvement_agent_missing",
      };
    }

    const draft = buildWaeImprovementProposalDraft({
      recommendationPacket: args.recommendationPacket,
      recommendationId: args.recommendationId,
      agentId: String(args.agentId),
      agentCustomProperties: readRecord(agent.customProperties) ?? undefined,
    });

    if (!draft.allowed) {
      return draft;
    }

    const proposalId = await ctx.runMutation(
      generatedApi.internal.ai.soulEvolution.createProposal,
      {
        organizationId: args.organizationId,
        agentId: args.agentId,
        proposalType: args.proposalType,
        targetField: args.targetField,
        currentValue: args.currentValue,
        proposedValue: args.proposedValue,
        reason: draft.proposalSummary,
        triggerType: "alignment",
        alignmentMode: "remediate",
        evidenceMessages: [],
        driftSummary: draft.driftSummary,
        driftSignalSource: draft.recommendationId,
        telemetrySummary: draft.telemetrySummary,
      },
    );

    if (!proposalId) {
      return {
        ...draft,
        allowed: false,
        workflowState: "blocked",
        blockedReason: "wae_improvement_proposal_creation_blocked",
      };
    }

    await ctx.runMutation(generatedApi.internal.ai.selfImprovement.updateWaeImprovementWorkflowState, {
      proposalId,
      workflowPatch: {
        workflowContractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowSource: "wae",
        workflowState: "pending_owner_approval",
        waeRecommendationPacketContractVersion: WAE_EVAL_RECOMMENDATION_PACKET_VERSION,
        waeRecommendationId: draft.recommendationId,
        waeRecommendationTarget: draft.recommendationTarget,
        waeRunId: draft.runId,
        waeSuiteKeyHash: draft.suiteKeyHash,
        waeBaselineSoulVersion: draft.rollbackPlan.targetVersion,
        waeAutoRollbackOnRegression: true,
      },
    });

    return {
      ...draft,
      proposalId,
      proposalType: args.proposalType,
      targetField: args.targetField,
    };
  },
});

/**
 * Apply a previously approved WAE proposal only when the explicit owner
 * approval checkpoint matches, and store enough rollback context for the
 * follow-up verification loop.
 */
export const applyApprovedWaeImprovementProposal = internalAction({
  args: {
    proposalId: v.id("soulProposals"),
    approvalCheckpointId: v.string(),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.runQuery(generatedApi.internal.ai.soulEvolution.getProposalById, {
      proposalId: args.proposalId,
    });

    if (!proposal) {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason: "wae_improvement_proposal_missing",
      };
    }

    if (proposal.status !== "approved") {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason: "wae_improvement_proposal_not_approved",
      };
    }

    if (proposal.approvalCheckpointId !== args.approvalCheckpointId) {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason: "wae_improvement_approval_checkpoint_mismatch",
      };
    }

    const baselineVersion = normalizeFiniteNumber(proposal.waeBaselineSoulVersion);
    if (typeof baselineVersion !== "number") {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason: "wae_improvement_baseline_missing",
      };
    }

    const agent = await loadAgentInternal(ctx, proposal.agentId);
    const agentCustomProperties = readRecord(agent?.customProperties) ?? undefined;
    const currentSoulVersion = readSoulVersion(agentCustomProperties);
    if (currentSoulVersion !== baselineVersion) {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason: "wae_improvement_baseline_drift_detected",
      };
    }

    await ctx.runMutation(
      generatedApi.internal.ai.selfImprovement.ensureWaeRollbackCheckpoint,
      {
        agentId: proposal.agentId,
        organizationId: proposal.organizationId,
        targetVersion: baselineVersion,
        soulSnapshot: JSON.stringify(agentCustomProperties?.soul ?? {}),
        requestedBy: "wae_improvement_apply",
      },
    );

    const applyResult = await ctx.runMutation(
      generatedApi.internal.ai.soulEvolution.applyProposal,
      {
        proposalId: args.proposalId,
      },
    );

    if (!applyResult?.success) {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason:
          normalizeNonEmptyString(applyResult?.error)
          || "wae_improvement_apply_failed",
      };
    }

    await ctx.runMutation(generatedApi.internal.ai.selfImprovement.updateWaeImprovementWorkflowState, {
      proposalId: args.proposalId,
      workflowPatch: {
        workflowContractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowSource: "wae",
        workflowState: "applied_pending_verification",
        waeApprovalCheckpointId: args.approvalCheckpointId,
        waeBaselineSoulVersion: baselineVersion,
        waeAppliedSoulVersion: applyResult.newSoulVersion,
        waeAutoRollbackOnRegression: true,
      },
    });

    return {
      contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
      workflowState: "applied_pending_verification" as const,
      proposalId: args.proposalId,
      newSoulVersion: applyResult.newSoulVersion,
      rollbackPlan: {
        targetVersion: baselineVersion,
        autoRollbackOnRegression: true,
      },
    };
  },
});

/**
 * Finalize post-apply WAE verification. Fail-closed if the score packet is
 * missing or regressed, and automatically rollback to the staged baseline.
 */
export const finalizeWaeImprovementVerification = internalAction({
  args: {
    proposalId: v.id("soulProposals"),
    approvalCheckpointId: v.string(),
    waeScorePacket: v.any(),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.runQuery(generatedApi.internal.ai.soulEvolution.getProposalById, {
      proposalId: args.proposalId,
    });
    if (!proposal) {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason: "wae_improvement_proposal_missing",
      };
    }

    if (proposal.workflowState !== "applied_pending_verification") {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason: "wae_improvement_apply_action_missing",
      };
    }

    if (proposal.waeApprovalCheckpointId !== args.approvalCheckpointId) {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason: "wae_improvement_approval_checkpoint_mismatch",
      };
    }

    const decision = evaluateWaeImprovementVerificationResult(args.waeScorePacket);
    if (!decision.rollbackRequired) {
      if (decision.workflowState === "verified") {
        await ctx.runMutation(generatedApi.internal.ai.selfImprovement.updateWaeImprovementWorkflowState, {
          proposalId: args.proposalId,
          workflowPatch: {
            workflowContractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
            workflowSource: "wae",
            workflowState: "verified",
            waeApprovalCheckpointId: args.approvalCheckpointId,
            waeVerificationSummary: decision.summary,
          },
        });
      }
      return decision;
    }

    const baselineVersion = normalizeFiniteNumber(proposal.waeBaselineSoulVersion);
    if (typeof baselineVersion !== "number") {
      return {
        contractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowState: "blocked" as const,
        blockedReason: "wae_improvement_rollback_target_missing",
      };
    }

    const rollbackResult = await ctx.runMutation(
      generatedApi.internal.ai.soulEvolution.rollbackSoul,
      {
        agentId: proposal.agentId,
        targetVersion: baselineVersion,
        requestedBy: `wae_improvement_auto_rollback:${String(args.proposalId)}`,
      },
    );

    await ctx.runMutation(generatedApi.internal.ai.selfImprovement.updateWaeImprovementWorkflowState, {
      proposalId: args.proposalId,
      workflowPatch: {
        workflowContractVersion: WAE_IMPROVEMENT_WORKFLOW_CONTRACT_VERSION,
        workflowSource: "wae",
        workflowState: "rolled_back",
        waeApprovalCheckpointId: args.approvalCheckpointId,
        waeRollbackTargetVersion: baselineVersion,
        waeVerificationSummary: decision.summary,
        waeAutoRollbackOnRegression: rollbackResult?.success === true,
      },
    });

    return decision;
  },
});

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

/**
 * Cron job: run daily reflection for all active agents.
 */
export const runAllDailyReflections = internalAction({
  args: {},
  handler: async (ctx) => {
    // Consolidated scheduler path: delegate to soulEvolution.scheduledReflection.
    return await (ctx as any).runAction(
      generatedApi.internal.ai.soulEvolution.scheduledReflection,
      {}
    );
  },
});

/**
 * Session idle detector — triggers metric recording when a session goes quiet.
 */
export const detectIdleSessions = internalAction({
  args: {},
  handler: async (ctx) => {
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;

    const idleSessions = await (ctx as any).runQuery(
      generatedApi.internal.ai.selfImprovement.getNewlyIdleSessions,
      { idleSince: thirtyMinAgo }
    );

    for (const session of (idleSessions || [])) {
      await ctx.scheduler.runAfter(0,
        generatedApi.internal.ai.selfImprovement.recordConversationMetrics,
        {
          sessionId: session._id,
          organizationId: session.organizationId,
          agentId: session.agentId,
          channel: session.channel,
        }
      );
    }
  },
});

// ============================================================================
// QUERIES
// ============================================================================

export const getMetricsSince = internalQuery({
  args: {
    agentId: v.id("objects"),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentConversationMetrics")
      .withIndex("by_agent", (q) =>
        q.eq("agentId", args.agentId).gte("startedAt", args.since)
      )
      .collect();
  },
});

export const getRecentFeedback = internalQuery({
  args: {
    agentId: v.id("objects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("proposalFeedback")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit || 10);
  },
});

export const getOrgsWithActiveAgents = internalQuery({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db
      .query("objects")
      .filter((q) =>
        q.and(
          q.eq(q.field("type"), "org_agent"),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    return agents.map(a => ({
      agentId: a._id,
      organizationId: a.organizationId,
    }));
  },
});

export const getNewlyIdleSessions = internalQuery({
  args: {
    idleSince: v.number(),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("agentSessions")
      .filter((q) =>
        q.and(
          q.lt(q.field("lastMessageAt"), args.idleSince),
          q.neq(q.field("metricsRecorded"), true)
        )
      )
      .take(50);

    return sessions;
  },
});

export const updateMetricSelfScore = internalMutation({
  args: {
    metricId: v.id("agentConversationMetrics"),
    selfScore: v.number(),
    selfNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.metricId, {
      selfScore: args.selfScore,
      selfNotes: args.selfNotes,
    });
  },
});
