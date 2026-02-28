import { describe, expect, it } from "vitest";
import {
  normalizeAutonomyLevel,
  resolveAutonomyTrustRecommendation,
  resolveDomainAutonomyLevel,
  resolveModeScopedAutonomyLevel,
} from "../../../convex/ai/autonomy";

describe("autonomy runtime contracts", () => {
  it("normalizes legacy autonomy aliases into the 4-level contract", () => {
    expect(normalizeAutonomyLevel("supervised")).toBe("supervised");
    expect(normalizeAutonomyLevel("sandbox")).toBe("sandbox");
    expect(normalizeAutonomyLevel("autonomous")).toBe("autonomous");
    expect(normalizeAutonomyLevel("delegation")).toBe("delegation");
    expect(normalizeAutonomyLevel("draft_only")).toBe("sandbox");
    expect(normalizeAutonomyLevel("unknown")).toBe("supervised");
  });

  it("enforces sandbox autonomy whenever mode scope is not full", () => {
    expect(
      resolveModeScopedAutonomyLevel({
        autonomyLevel: "delegation",
        modeToolScope: "full",
      }),
    ).toBe("delegation");
    expect(
      resolveModeScopedAutonomyLevel({
        autonomyLevel: "autonomous",
        modeToolScope: "read_only",
      }),
    ).toBe("sandbox");
    expect(
      resolveModeScopedAutonomyLevel({
        autonomyLevel: "autonomous",
        modeToolScope: "none",
      }),
    ).toBe("sandbox");
  });

  it("keeps appointment domain defaults sandboxed unless live promotion evidence exists", () => {
    const supervisedResolution = resolveDomainAutonomyLevel({
      domain: "appointment_booking",
      autonomyLevel: "supervised",
      domainAutonomy: {
        appointment_booking: {
          level: "live",
          promotedAt: Date.now(),
          promotedBy: "ops_lead",
        },
      },
    });
    expect(supervisedResolution.effectiveLevel).toBe("sandbox");
    expect(supervisedResolution.source).toBe("autonomy_cap");

    const missingEvidenceResolution = resolveDomainAutonomyLevel({
      domain: "appointment_booking",
      autonomyLevel: "autonomous",
      domainAutonomy: {
        appointment_booking: {
          level: "live",
        },
      },
    });
    expect(missingEvidenceResolution.effectiveLevel).toBe("sandbox");
    expect(missingEvidenceResolution.source).toBe("missing_promotion_evidence");

    const promotedResolution = resolveDomainAutonomyLevel({
      domain: "appointment_booking",
      autonomyLevel: "autonomous",
      domainAutonomy: {
        appointment_booking: {
          level: "live",
          promotedAt: 1_739_900_000_000,
          promotedBy: "ops_lead",
          trustScore: 0.93,
          trustSignalCount: 34,
        },
      },
    });
    expect(promotedResolution.effectiveLevel).toBe("live");
    expect(promotedResolution.source).toBe("domain_override");
    expect(promotedResolution.trustScore).toBe(0.93);
    expect(promotedResolution.trustSignalCount).toBe(34);
  });

  it("computes deterministic trust promotion and demotion recommendations", () => {
    const promote = resolveAutonomyTrustRecommendation({
      currentLevel: "sandbox",
      snapshot: {
        trustScore: 0.91,
        signalCount: 28,
        successfulActionCount: 40,
        policyViolationCount: 0,
        recentFailureCount: 0,
      },
    });
    expect(promote?.action).toBe("promote");
    expect(promote?.toLevel).toBe("autonomous");

    const demote = resolveAutonomyTrustRecommendation({
      currentLevel: "autonomous",
      snapshot: {
        trustScore: 0.22,
        signalCount: 24,
        successfulActionCount: 8,
        policyViolationCount: 1,
        recentFailureCount: 3,
      },
    });
    expect(demote?.action).toBe("demote");
    expect(demote?.toLevel).toBe("sandbox");

    const delegationHold = resolveAutonomyTrustRecommendation({
      currentLevel: "autonomous",
      snapshot: {
        trustScore: 0.95,
        signalCount: 40,
        successfulActionCount: 60,
        policyViolationCount: 0,
        recentFailureCount: 0,
        delegationOptIn: false,
      },
    });
    expect(delegationHold?.action).toBe("hold");
    expect(delegationHold?.reason).toContain("Delegation promotion requires explicit delegation opt-in");
  });
});
