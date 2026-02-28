import type {
  ToolFoundryPromotionEvidence,
  ToolFoundryStage,
} from "../../../../convex/ai/toolFoundry/contracts";

export const TOOL_FOUNDRY_EVIDENCE_VIEW_CONTRACT_VERSION =
  "tool_foundry_evidence_view_v1" as const;
export const TOOL_FOUNDRY_MOBILE_EVIDENCE_FLAG_KEY =
  "NEXT_PUBLIC_OPERATOR_MOBILE_TOOL_FOUNDRY_EVIDENCE_VIEW_ENABLED" as const;

const DEFAULT_MIN_CANARY_RUNS = 50;
const DEFAULT_MIN_CANARY_SUCCESS_RATE = 0.98;

type ToolFoundryEvidenceCheckStatus = "pass" | "fail";

export type ToolFoundryEvidenceSectionId =
  | "policy_checks"
  | "test_evidence"
  | "approval_chain"
  | "canary_metrics"
  | "rollback_readiness";

export type ToolFoundryEvidenceOverallStatus = "pass" | "needs_attention";

export type ToolFoundryLifecycleEventName =
  | "trust.tool_foundry.proposal_created.v1"
  | "trust.tool_foundry.promotion_requested.v1"
  | "trust.tool_foundry.promotion_granted.v1"
  | "trust.tool_foundry.promotion_denied.v1"
  | "trust.tool_foundry.execution_blocked.v1";

export interface ToolFoundryLifecycleEvidenceEvent {
  name: ToolFoundryLifecycleEventName;
  occurredAt: number;
  correlationId?: string;
  lineageId?: string;
  threadId?: string;
  workflowKey?: string;
  frontlineIntakeTrigger?: string;
  boundaryReason?: string;
}

export interface ToolFoundryApprovalChainEntry {
  approverId: string;
  decision: "approved" | "denied" | "pending";
  occurredAt: number;
}

export interface ToolFoundryRollbackEvidence {
  status?: "rollback_ready" | "rollback_missing" | "rollback_applied";
}

export interface ToolFoundryEvidenceViewInput {
  fromStage: ToolFoundryStage;
  toStage: ToolFoundryStage;
  promotionEvidence: ToolFoundryPromotionEvidence;
  lifecycleEvents: ToolFoundryLifecycleEvidenceEvent[];
  approvalChain: ToolFoundryApprovalChainEntry[];
  rollback?: ToolFoundryRollbackEvidence;
  minCanaryRuns?: number;
  minCanarySuccessRate?: number;
  mobileParityEnv?: Record<string, string | undefined>;
}

export interface ToolFoundryEvidenceCheck {
  id: string;
  label: string;
  status: ToolFoundryEvidenceCheckStatus;
}

export interface ToolFoundryEvidenceSection {
  id: ToolFoundryEvidenceSectionId;
  title: string;
  status: ToolFoundryEvidenceOverallStatus;
  checks: ToolFoundryEvidenceCheck[];
}

export interface ToolFoundryMobileEvidenceParity {
  featureFlagKey: string;
  enabled: boolean;
  mode: "desktop_only" | "flag_gated_contract_only";
  fullRolloutAllowed: false;
}

export interface ToolFoundryEvidenceViewContract {
  contractVersion: typeof TOOL_FOUNDRY_EVIDENCE_VIEW_CONTRACT_VERSION;
  readOnly: true;
  trustBoundary: "one_agent";
  stageTransition: {
    from: ToolFoundryStage;
    to: ToolFoundryStage;
  };
  sections: ToolFoundryEvidenceSection[];
  overallStatus: ToolFoundryEvidenceOverallStatus;
  mobileParity: ToolFoundryMobileEvidenceParity;
}

export function buildToolFoundryEvidenceViewContract(
  input: ToolFoundryEvidenceViewInput,
): ToolFoundryEvidenceViewContract {
  const minCanaryRuns = input.minCanaryRuns ?? DEFAULT_MIN_CANARY_RUNS;
  const minCanarySuccessRate =
    input.minCanarySuccessRate ?? DEFAULT_MIN_CANARY_SUCCESS_RATE;

  const hasCompleteLifecycleTrace = input.lifecycleEvents.some((event) =>
    Boolean(
      event.correlationId &&
        event.lineageId &&
        event.threadId &&
        event.workflowKey &&
        event.frontlineIntakeTrigger &&
        event.boundaryReason,
    ),
  );
  const hasPromotionRequestedEvent = input.lifecycleEvents.some(
    (event) => event.name === "trust.tool_foundry.promotion_requested.v1",
  );
  const hasPromotionDecisionEvent = input.lifecycleEvents.some(
    (event) =>
      event.name === "trust.tool_foundry.promotion_granted.v1" ||
      event.name === "trust.tool_foundry.promotion_denied.v1",
  );

  const policyChecks: ToolFoundryEvidenceCheck[] = [
    buildCheck("policy_bundle_hash", "Policy bundle hash present", Boolean(input.promotionEvidence.policyBundleHash)),
    buildCheck("lifecycle_trace_fields", "Lifecycle trust trace fields complete", hasCompleteLifecycleTrace),
  ];

  const testEvidenceChecks: ToolFoundryEvidenceCheck[] = [
    buildCheck("spec_validated", "Spec validation passed", Boolean(input.promotionEvidence.specValidated)),
    buildCheck("contract_tests_passed", "Contract tests passed", Boolean(input.promotionEvidence.contractTestsPassed)),
    buildCheck("regression_tests_passed", "Regression tests passed", Boolean(input.promotionEvidence.regressionTestsPassed)),
    buildCheck("security_review_passed", "Security review passed", Boolean(input.promotionEvidence.securityReviewPassed)),
  ];

  const hasApprovedEntry = input.approvalChain.some(
    (entry) => entry.decision === "approved",
  );
  const latestApproval = input.approvalChain
    .slice()
    .sort((a, b) => b.occurredAt - a.occurredAt)[0];

  const approvalChecks: ToolFoundryEvidenceCheck[] = [
    buildCheck("human_approver_id", "Human approver ID captured", Boolean(input.promotionEvidence.humanApproverId)),
    buildCheck("approval_chain_recorded", "Approval chain recorded", input.approvalChain.length > 0),
    buildCheck("promotion_requested_event", "Promotion requested event recorded", hasPromotionRequestedEvent),
    buildCheck("promotion_decision_event", "Promotion decision event recorded", hasPromotionDecisionEvent),
    buildCheck("latest_decision_not_denied", "Latest approval decision is not denied", latestApproval?.decision !== "denied"),
    buildCheck("approval_granted", "At least one approval grant present", hasApprovedEntry),
  ];

  const canaryRuns = input.promotionEvidence.canaryRuns ?? 0;
  const canarySuccessRate = input.promotionEvidence.canarySuccessRate ?? 0;
  const canaryChecks: ToolFoundryEvidenceCheck[] = [
    buildCheck("canary_runs_threshold", `Canary runs >= ${minCanaryRuns}`, canaryRuns >= minCanaryRuns),
    buildCheck(
      "canary_success_threshold",
      `Canary success rate >= ${minCanarySuccessRate}`,
      canarySuccessRate >= minCanarySuccessRate,
    ),
  ];

  const rollbackStatus = input.rollback?.status ?? "rollback_ready";
  const rollbackChecks: ToolFoundryEvidenceCheck[] = [
    buildCheck("rollback_plan_id", "Rollback plan ID captured", Boolean(input.promotionEvidence.rollbackPlanId)),
    buildCheck("rollback_status_ready", "Rollback status is rollback_ready", rollbackStatus === "rollback_ready"),
  ];

  const sections: ToolFoundryEvidenceSection[] = [
    buildSection("policy_checks", "Policy checks", policyChecks),
    buildSection("test_evidence", "Test evidence", testEvidenceChecks),
    buildSection("approval_chain", "Approval chain", approvalChecks),
    buildSection("canary_metrics", "Canary metrics", canaryChecks),
    buildSection("rollback_readiness", "Rollback readiness", rollbackChecks),
  ];

  return {
    contractVersion: TOOL_FOUNDRY_EVIDENCE_VIEW_CONTRACT_VERSION,
    readOnly: true,
    trustBoundary: "one_agent",
    stageTransition: {
      from: input.fromStage,
      to: input.toStage,
    },
    sections,
    overallStatus: sections.every((section) => section.status === "pass")
      ? "pass"
      : "needs_attention",
    mobileParity: resolveMobileParityContract(input.mobileParityEnv),
  };
}

function buildCheck(
  id: string,
  label: string,
  passed: boolean,
): ToolFoundryEvidenceCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
  };
}

function buildSection(
  id: ToolFoundryEvidenceSectionId,
  title: string,
  checks: ToolFoundryEvidenceCheck[],
): ToolFoundryEvidenceSection {
  return {
    id,
    title,
    checks,
    status: checks.every((check) => check.status === "pass")
      ? "pass"
      : "needs_attention",
  };
}

function resolveMobileParityContract(
  env: Record<string, string | undefined> | undefined,
): ToolFoundryMobileEvidenceParity {
  const enabled = normalizeBoolean(
    env?.[TOOL_FOUNDRY_MOBILE_EVIDENCE_FLAG_KEY],
    false,
  );

  return {
    featureFlagKey: TOOL_FOUNDRY_MOBILE_EVIDENCE_FLAG_KEY,
    enabled,
    mode: enabled ? "flag_gated_contract_only" : "desktop_only",
    fullRolloutAllowed: false,
  };
}

function normalizeBoolean(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return fallback;
}
