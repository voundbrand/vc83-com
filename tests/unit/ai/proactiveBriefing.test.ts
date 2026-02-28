import { describe, expect, it } from "vitest";
import { buildConversationContinuityTelemetry } from "../../../convex/ai/conversations";
import {
  buildMorningBriefingTemplate,
  computeMorningBriefingRolloutMetrics,
  computeNextMorningBriefingWindow,
  evaluateMorningBriefingMutationPolicy,
} from "../../../convex/ai/proactiveBriefing";

function makeContinuity(args?: {
  ingressSurface?: "desktop" | "iphone" | "android" | "webchat" | "voice";
  previousIngressSurface?: "desktop" | "iphone" | "android" | "webchat" | "voice";
  replayOutcome?: "accepted" | "duplicate_acknowledged";
}) {
  return buildConversationContinuityTelemetry({
    conversationId: "conv_briefing",
    organizationId: "org_briefing",
    userId: "user_briefing",
    ingressSurface: args?.ingressSurface ?? "desktop",
    previousIngressSurface: args?.previousIngressSurface,
    collaboration: {
      threadType: "group_thread",
      threadId: "group:briefing",
      groupThreadId: "group:briefing",
      lineageId: "lineage:briefing",
      workflowKey: "message_ingress",
    },
    idempotencyKey: `idem:${args?.ingressSurface ?? "desktop"}`,
    idempotencyContract: {
      replayOutcome: args?.replayOutcome ?? "accepted",
    },
    occurredAt: 1700000000000,
  });
}

describe("proactive morning briefing contract", () => {
  it("computes the next local morning briefing window deterministically", () => {
    const window = computeNextMorningBriefingWindow({
      utcOffsetMinutes: -300,
      referenceTimestamp: Date.UTC(2026, 1, 25, 13, 30, 0, 0),
      localHour: 7,
      localMinute: 0,
      windowDurationMinutes: 45,
    });

    expect(window.windowStartAt).toBe(Date.UTC(2026, 1, 26, 12, 0, 0, 0));
    expect(window.windowEndAt).toBe(Date.UTC(2026, 1, 26, 12, 45, 0, 0));
  });

  it("builds a briefing template with continuity and privacy boundary sections", () => {
    const template = buildMorningBriefingTemplate({
      localDateLabel: "Wednesday",
      primaryChannel: "desktop",
      privacyMode: "prefer_local",
      continuity: makeContinuity({
        ingressSurface: "desktop",
        previousIngressSurface: "iphone",
      }),
      highlights: ["Follow up on contract renewals", "Review onboarding drop-off rate"],
      pendingApprovals: 2,
      pendingProposals: 3,
      generatedAt: 1700000000000,
    });

    expect(template.title).toBe("Wednesday briefing");
    expect(template.summary).toContain("Route continuity key");
    expect(template.sections.find((section) => section.id === "continuity")?.lines[0]).toContain(
      "Cross-channel continuity restored from iphone to desktop"
    );
    expect(template.sections.find((section) => section.id === "privacy")?.lines[0]).toContain(
      "proposal-only"
    );
  });

  it("enforces no-bypass mutation policy for privacy-local and approval-missing paths", () => {
    const privacyLocalDecision = evaluateMorningBriefingMutationPolicy({
      privacyMode: "local_only",
      trustGate: "allow",
      mutatingActionRequested: true,
      requestedIntent: "commit",
      approvalTokenId: "approval_1",
    });
    expect(privacyLocalDecision.decision).toBe("proposal_required");
    expect(privacyLocalDecision.enforcedIntent).toBe("proposal");
    expect(privacyLocalDecision.reason).toBe("privacy_local_requires_proposal");

    const missingApprovalDecision = evaluateMorningBriefingMutationPolicy({
      privacyMode: "cloud",
      trustGate: "allow",
      mutatingActionRequested: true,
      requestedIntent: "commit",
    });
    expect(missingApprovalDecision.decision).toBe("proposal_required");
    expect(missingApprovalDecision.enforcedIntent).toBe("proposal");
    expect(missingApprovalDecision.reason).toBe("approval_token_required");
  });

  it("permits commit only when trust gate allows and approval token is present", () => {
    const blocked = evaluateMorningBriefingMutationPolicy({
      privacyMode: "cloud",
      trustGate: "hard_gate",
      mutatingActionRequested: true,
      requestedIntent: "commit",
      approvalTokenId: "approval_2",
    });
    expect(blocked.decision).toBe("blocked");
    expect(blocked.enforcedIntent).toBe("read_only");

    const allowed = evaluateMorningBriefingMutationPolicy({
      privacyMode: "cloud",
      trustGate: "allow",
      mutatingActionRequested: true,
      requestedIntent: "commit",
      approvalTokenId: "approval_3",
    });
    expect(allowed.decision).toBe("commit_allowed");
    expect(allowed.enforcedIntent).toBe("commit");
    expect(allowed.reason).toBe("approval_token_present");
  });

  it("computes rollout metrics for delivery, continuity, and replay rates", () => {
    const metrics = computeMorningBriefingRolloutMetrics([
      {
        primaryChannel: "desktop",
        continuity: makeContinuity({
          ingressSurface: "desktop",
          previousIngressSurface: "iphone",
          replayOutcome: "accepted",
        }),
        delivered: true,
        acknowledged: true,
        responseLatencyMs: 900,
      },
      {
        primaryChannel: "iphone",
        continuity: makeContinuity({
          ingressSurface: "iphone",
          replayOutcome: "duplicate_acknowledged",
        }),
        delivered: true,
        acknowledged: false,
        responseLatencyMs: 1500,
      },
      {
        primaryChannel: "desktop",
        continuity: makeContinuity({
          ingressSurface: "desktop",
          replayOutcome: "accepted",
        }),
        delivered: false,
        acknowledged: false,
      },
    ]);

    expect(metrics.totalBriefings).toBe(3);
    expect(metrics.deliveredBriefings).toBe(2);
    expect(metrics.acknowledgedBriefings).toBe(1);
    expect(metrics.deliveryRate).toBeCloseTo(2 / 3);
    expect(metrics.acknowledgmentRate).toBeCloseTo(1 / 2);
    expect(metrics.crossChannelContinuationRate).toBeCloseTo(1 / 3);
    expect(metrics.replayRate).toBeCloseTo(1 / 3);
    expect(metrics.medianResponseLatencyMs).toBe(1200);
    expect(metrics.channelCounts).toEqual([
      { channel: "desktop", count: 2 },
      { channel: "iphone", count: 1 },
    ]);
  });
});
