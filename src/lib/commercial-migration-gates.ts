export const CPMU_MIGRATION_GATES_VERSION = "cpmu_gates_v1" as const;

export const CPMU_REQUIRED_METADATA_KEYS = [
  "offer_code",
  "intent_code",
  "surface",
  "routing_hint",
  "source",
  "medium",
  "campaign",
  "content",
  "term",
  "referrer",
  "landingPath",
] as const;

export type CpmuMetadataKey = (typeof CPMU_REQUIRED_METADATA_KEYS)[number];

export type CpmuMetadataEnvelope = Partial<Record<CpmuMetadataKey, string | undefined>>;

export interface CpmuMigrationGateThresholds {
  metadataCompletenessMin: number;
  checkoutFailureRateDeltaMax: number;
  creditBalanceDriftMax: number;
  backofficeContinuityIncidentsMax: number;
  subscriberContinuityIncidentsMax: number;
}

export const CPMU_MIGRATION_GATE_THRESHOLDS: CpmuMigrationGateThresholds = {
  metadataCompletenessMin: 0.995,
  checkoutFailureRateDeltaMax: 0,
  creditBalanceDriftMax: 0,
  backofficeContinuityIncidentsMax: 0,
  subscriberContinuityIncidentsMax: 0,
};

export interface CpmuMigrationGateInput {
  metadataSamples: CpmuMetadataEnvelope[];
  checkoutFailureRateBaseline: number;
  checkoutFailureRateCandidate: number;
  creditBalanceDriftCount: number;
  backofficeContinuityIncidentCount: number;
  subscriberContinuityIncidentCount: number;
}

export interface CpmuMigrationGateDecision {
  version: typeof CPMU_MIGRATION_GATES_VERSION;
  passed: boolean;
  rollbackRequired: boolean;
  rollbackReasons: string[];
  gates: {
    metadataCompleteness: {
      passed: boolean;
      threshold: number;
      observed: number;
      completeSamples: number;
      totalSamples: number;
    };
    checkoutHealthParity: {
      passed: boolean;
      threshold: number;
      observed: number;
    };
    creditsContinuity: {
      passed: boolean;
      threshold: number;
      observed: number;
    };
    backofficeContinuity: {
      passed: boolean;
      threshold: number;
      observed: number;
    };
    subscriberContinuity: {
      passed: boolean;
      threshold: number;
      observed: number;
    };
  };
}

export interface CpmuRollbackRehearsalInput {
  coexistencePreserved: boolean;
  rollbackWindowMs: number;
  maxRollbackWindowMs: number;
  steps: {
    captureBaseline: boolean;
    validateMetadataParity: boolean;
    validateCheckoutParity: boolean;
    validateCreditsBackofficeParity: boolean;
    restoreCoexistenceSurface: boolean;
    revalidateSubscriberPaths: boolean;
  };
}

export interface CpmuRollbackRehearsalDecision {
  passed: boolean;
  missingSteps: string[];
  rollbackWindowPassed: boolean;
  coexistencePassed: boolean;
  rollbackRequired: boolean;
  rollbackReasons: string[];
}

function hasValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function countCompleteMetadataSamples(samples: CpmuMetadataEnvelope[]): number {
  return samples.filter((sample) =>
    CPMU_REQUIRED_METADATA_KEYS.every((key) => hasValue(sample[key]))
  ).length;
}

export function calculateMetadataCompleteness(samples: CpmuMetadataEnvelope[]): {
  rate: number;
  completeSamples: number;
  totalSamples: number;
} {
  const totalSamples = samples.length;
  if (totalSamples === 0) {
    return { rate: 0, completeSamples: 0, totalSamples: 0 };
  }

  const completeSamples = countCompleteMetadataSamples(samples);
  return {
    rate: completeSamples / totalSamples,
    completeSamples,
    totalSamples,
  };
}

export function evaluateCpmuMigrationGates(
  input: CpmuMigrationGateInput,
  thresholds: CpmuMigrationGateThresholds = CPMU_MIGRATION_GATE_THRESHOLDS
): CpmuMigrationGateDecision {
  const metadata = calculateMetadataCompleteness(input.metadataSamples);
  const checkoutFailureDelta =
    input.checkoutFailureRateCandidate - input.checkoutFailureRateBaseline;

  const metadataPassed = metadata.rate >= thresholds.metadataCompletenessMin;
  const checkoutPassed = checkoutFailureDelta <= thresholds.checkoutFailureRateDeltaMax;
  const creditsPassed = input.creditBalanceDriftCount <= thresholds.creditBalanceDriftMax;
  const backofficePassed =
    input.backofficeContinuityIncidentCount <= thresholds.backofficeContinuityIncidentsMax;
  const subscriberPassed =
    input.subscriberContinuityIncidentCount <= thresholds.subscriberContinuityIncidentsMax;

  const rollbackReasons: string[] = [];
  if (!metadataPassed) rollbackReasons.push("metadata_completeness_below_threshold");
  if (!checkoutPassed) rollbackReasons.push("checkout_health_regression");
  if (!creditsPassed) rollbackReasons.push("credit_balance_drift_detected");
  if (!backofficePassed) rollbackReasons.push("backoffice_continuity_incident");
  if (!subscriberPassed) rollbackReasons.push("subscriber_continuity_incident");

  return {
    version: CPMU_MIGRATION_GATES_VERSION,
    passed:
      metadataPassed &&
      checkoutPassed &&
      creditsPassed &&
      backofficePassed &&
      subscriberPassed,
    rollbackRequired: rollbackReasons.length > 0,
    rollbackReasons,
    gates: {
      metadataCompleteness: {
        passed: metadataPassed,
        threshold: thresholds.metadataCompletenessMin,
        observed: metadata.rate,
        completeSamples: metadata.completeSamples,
        totalSamples: metadata.totalSamples,
      },
      checkoutHealthParity: {
        passed: checkoutPassed,
        threshold: thresholds.checkoutFailureRateDeltaMax,
        observed: checkoutFailureDelta,
      },
      creditsContinuity: {
        passed: creditsPassed,
        threshold: thresholds.creditBalanceDriftMax,
        observed: input.creditBalanceDriftCount,
      },
      backofficeContinuity: {
        passed: backofficePassed,
        threshold: thresholds.backofficeContinuityIncidentsMax,
        observed: input.backofficeContinuityIncidentCount,
      },
      subscriberContinuity: {
        passed: subscriberPassed,
        threshold: thresholds.subscriberContinuityIncidentsMax,
        observed: input.subscriberContinuityIncidentCount,
      },
    },
  };
}

export function evaluateCpmuRollbackRehearsal(
  input: CpmuRollbackRehearsalInput
): CpmuRollbackRehearsalDecision {
  const missingSteps = Object.entries(input.steps)
    .filter(([, completed]) => !completed)
    .map(([step]) => step);

  const rollbackWindowPassed = input.rollbackWindowMs <= input.maxRollbackWindowMs;
  const coexistencePassed = input.coexistencePreserved;

  const rollbackReasons: string[] = [];
  if (!coexistencePassed) rollbackReasons.push("coexistence_not_preserved");
  if (!rollbackWindowPassed) rollbackReasons.push("rollback_window_breach");
  if (missingSteps.length > 0) rollbackReasons.push("rollback_steps_incomplete");

  return {
    passed: coexistencePassed && rollbackWindowPassed && missingSteps.length === 0,
    missingSteps,
    rollbackWindowPassed,
    coexistencePassed,
    rollbackRequired: rollbackReasons.length > 0,
    rollbackReasons,
  };
}
