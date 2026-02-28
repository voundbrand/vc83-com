import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  evaluateSessionReactivationMemoryCacheState,
  evaluateSessionReactivationMemoryReadScope,
  evaluateSessionReactivationTrigger,
} from "../../../convex/ai/agentSessions";

const ORG_A = "org_a" as Id<"organizations">;
const ORG_B = "org_b" as Id<"organizations">;

describe("session reactivation memory contracts", () => {
  it("deterministically triggers reactivation when inactivity reaches threshold", () => {
    const decision = evaluateSessionReactivationTrigger({
      now: 2_000_000,
      lastMessageAt: 1_900_000,
      startedAt: 1_000_000,
      inactivityTimeoutMs: 100_000,
      maxDurationMs: 5_000_000,
    });

    expect(decision.shouldClose).toBe(true);
    expect(decision.closeReason).toBe("idle_timeout");
    expect(decision.reactivationTriggered).toBe(true);
    expect(decision.inactivityGapMs).toBe(100_000);
  });

  it("does not trigger reactivation before inactivity threshold", () => {
    const decision = evaluateSessionReactivationTrigger({
      now: 1_950_000,
      lastMessageAt: 1_900_000,
      startedAt: 1_000_000,
      inactivityTimeoutMs: 100_000,
      maxDurationMs: 5_000_000,
    });

    expect(decision.shouldClose).toBe(false);
    expect(decision.closeReason).toBeNull();
    expect(decision.reactivationTriggered).toBe(false);
  });

  it("fails closed on cross-tenant or cross-channel reactivation reads", () => {
    const tenantMismatch = evaluateSessionReactivationMemoryReadScope({
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_B,
      sessionChannel: "slack",
      requestedChannel: "slack",
      sessionExternalContactIdentifier: "slack:C1:user:U1",
      requestedExternalContactIdentifier: "slack:C1:user:U1",
      sessionRoutingKey: "route:slack:T1",
      requestedSessionRoutingKey: "route:slack:T1",
    });
    const channelMismatch = evaluateSessionReactivationMemoryReadScope({
      sessionOrganizationId: ORG_A,
      requestedOrganizationId: ORG_A,
      sessionChannel: "slack",
      requestedChannel: "webchat",
      sessionExternalContactIdentifier: "slack:C1:user:U1",
      requestedExternalContactIdentifier: "slack:C1:user:U1",
      sessionRoutingKey: "route:slack:T1",
      requestedSessionRoutingKey: "route:slack:T1",
    });

    expect(tenantMismatch.allowed).toBe(false);
    expect(tenantMismatch.reason).toBe("session_org_mismatch");
    expect(channelMismatch.allowed).toBe(false);
    expect(channelMismatch.reason).toBe("channel_mismatch");
  });

  it("fails closed on stale reactivation cache", () => {
    const cacheState = evaluateSessionReactivationMemoryCacheState({
      value: {
        contractVersion: "session_reactivation_memory_v1",
        sourcePolicy: "rolling_summary_close_summary_v1",
        trigger: "inactivity_reactivation_v1",
        cachedContext: "carry this context forward",
        generatedAt: 1_000,
        cacheExpiresAt: 1_100,
        inactivityGapMs: 500,
        source: {
          sessionId: "session_prev",
          organizationId: "org_a",
          channel: "slack",
          externalContactIdentifier: "slack:C1:user:U1",
          sessionRoutingKey: "route:slack:T1",
          closeReason: "idle_timeout",
          closedAt: 900,
          lastMessageAt: 800,
        },
        provenance: {
          derivedFromRollingSummary: true,
          derivedFromSessionSummary: false,
        },
      },
      now: 1_200,
    });

    expect(cacheState.allowed).toBe(false);
    expect(cacheState.reason).toBe("cache_stale");
  });
});
