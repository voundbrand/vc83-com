import { describe, expect, it } from "vitest";
import {
  CPMU_MIGRATION_GATE_THRESHOLDS,
  calculateMetadataCompleteness,
  evaluateCpmuMigrationGates,
  evaluateCpmuRollbackRehearsal,
  type CpmuMetadataEnvelope,
} from "@/lib/commercial-migration-gates";

const completeEnvelope: CpmuMetadataEnvelope = {
  offer_code: "layer1_foundation",
  intent_code: "implementation_start_layer1",
  surface: "store",
  routing_hint: "founder_bridge",
  source: "direct",
  medium: "organic",
  campaign: "spring_launch",
  content: "hero_cta",
  term: "implementation",
  referrer: "https://example.com",
  landingPath: "/",
};

describe("commercial migration gate helpers", () => {
  it("calculates metadata completeness against canonical commercial + campaign envelope keys", () => {
    const sample: CpmuMetadataEnvelope[] = [
      completeEnvelope,
      {
        ...completeEnvelope,
        landingPath: "",
      },
      completeEnvelope,
    ];

    const result = calculateMetadataCompleteness(sample);

    expect(result.completeSamples).toBe(2);
    expect(result.totalSamples).toBe(3);
    expect(result.rate).toBeCloseTo(2 / 3, 6);
  });

  it("passes all migration gates when thresholds are satisfied", () => {
    const metadataSamples = Array.from({ length: 1000 }, (_, index) =>
      index < 995 ? completeEnvelope : { ...completeEnvelope, source: "" }
    );

    const decision = evaluateCpmuMigrationGates({
      metadataSamples,
      checkoutFailureRateBaseline: 0.01,
      checkoutFailureRateCandidate: 0.01,
      creditBalanceDriftCount: 0,
      backofficeContinuityIncidentCount: 0,
      subscriberContinuityIncidentCount: 0,
    });

    expect(decision.passed).toBe(true);
    expect(decision.rollbackRequired).toBe(false);
    expect(decision.gates.metadataCompleteness.observed).toBeCloseTo(
      CPMU_MIGRATION_GATE_THRESHOLDS.metadataCompletenessMin,
      8
    );
  });

  it("fails gates and requests rollback on checkout regression and continuity incidents", () => {
    const decision = evaluateCpmuMigrationGates({
      metadataSamples: [completeEnvelope],
      checkoutFailureRateBaseline: 0.01,
      checkoutFailureRateCandidate: 0.012,
      creditBalanceDriftCount: 1,
      backofficeContinuityIncidentCount: 0,
      subscriberContinuityIncidentCount: 1,
    });

    expect(decision.passed).toBe(false);
    expect(decision.rollbackRequired).toBe(true);
    expect(decision.rollbackReasons).toEqual([
      "checkout_health_regression",
      "credit_balance_drift_detected",
      "subscriber_continuity_incident",
    ]);
  });
});

describe("commercial rollback rehearsal checks", () => {
  it("passes rehearsal when coexistence is preserved and all deterministic steps complete in window", () => {
    const decision = evaluateCpmuRollbackRehearsal({
      coexistencePreserved: true,
      rollbackWindowMs: 7 * 60 * 1000,
      maxRollbackWindowMs: 15 * 60 * 1000,
      steps: {
        captureBaseline: true,
        validateMetadataParity: true,
        validateCheckoutParity: true,
        validateCreditsBackofficeParity: true,
        restoreCoexistenceSurface: true,
        revalidateSubscriberPaths: true,
      },
    });

    expect(decision.passed).toBe(true);
    expect(decision.rollbackRequired).toBe(false);
  });

  it("fails rehearsal when coexistence is not preserved or rollback steps are incomplete", () => {
    const decision = evaluateCpmuRollbackRehearsal({
      coexistencePreserved: false,
      rollbackWindowMs: 20 * 60 * 1000,
      maxRollbackWindowMs: 15 * 60 * 1000,
      steps: {
        captureBaseline: true,
        validateMetadataParity: false,
        validateCheckoutParity: true,
        validateCreditsBackofficeParity: true,
        restoreCoexistenceSurface: true,
        revalidateSubscriberPaths: false,
      },
    });

    expect(decision.passed).toBe(false);
    expect(decision.rollbackRequired).toBe(true);
    expect(decision.missingSteps).toEqual([
      "validateMetadataParity",
      "revalidateSubscriberPaths",
    ]);
    expect(decision.rollbackReasons).toEqual([
      "coexistence_not_preserved",
      "rollback_window_breach",
      "rollback_steps_incomplete",
    ]);
  });
});
