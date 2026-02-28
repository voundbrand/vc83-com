export const TOOL_FOUNDRY_STAGE_ORDER = ["draft", "staged", "canary", "trusted"] as const;

export type ToolFoundryStage = (typeof TOOL_FOUNDRY_STAGE_ORDER)[number];
export type ToolFoundryDecision = "allow" | "require_approval" | "deny";
export type ToolFoundryOperationClass =
  | "read"
  | "mutate"
  | "external_network"
  | "secret_access";

export type ToolFoundryPromotionEvidence = {
  policyBundleHash?: string;
  specValidated?: boolean;
  contractTestsPassed?: boolean;
  regressionTestsPassed?: boolean;
  securityReviewPassed?: boolean;
  humanApproverId?: string;
  rollbackPlanId?: string;
  canaryRuns?: number;
  canarySuccessRate?: number;
  threatModelVersion?: string;
};

export type ToolFoundryPromotionInput = {
  from: ToolFoundryStage;
  to: ToolFoundryStage;
  evidence: ToolFoundryPromotionEvidence;
  minCanaryRuns?: number;
  minCanarySuccessRate?: number;
};

export type ToolFoundryPromotionDecision = {
  allowed: boolean;
  reasons: string[];
};

export type ToolExecutionAuthorizationInput = {
  stage: ToolFoundryStage;
  operationClass: ToolFoundryOperationClass;
  capabilityAllowlisted: boolean;
  scopedTokenPresent: boolean;
  sandboxEnforced: boolean;
  humanApprovalRequired: boolean;
  humanApprovalGranted: boolean;
};

export type ToolExecutionAuthorizationDecision = {
  decision: ToolFoundryDecision;
  reasons: string[];
};

const DEFAULT_MIN_CANARY_RUNS = 50;
const DEFAULT_MIN_CANARY_SUCCESS_RATE = 0.98;

function stageIndex(stage: ToolFoundryStage): number {
  return TOOL_FOUNDRY_STAGE_ORDER.indexOf(stage);
}

function deny(...reasons: string[]): ToolFoundryPromotionDecision {
  return {
    allowed: false,
    reasons,
  };
}

export function evaluateToolVersionPromotion(
  input: ToolFoundryPromotionInput,
): ToolFoundryPromotionDecision {
  const fromIndex = stageIndex(input.from);
  const toIndex = stageIndex(input.to);

  if (fromIndex < 0 || toIndex < 0) {
    return deny("unknown_stage");
  }

  if (toIndex - fromIndex !== 1) {
    return deny("stage_transition_invalid");
  }

  const evidence = input.evidence;
  if (!evidence.policyBundleHash) {
    return deny("missing_policy_bundle_hash");
  }

  if (input.to === "staged") {
    if (!evidence.specValidated) {
      return deny("spec_validation_required");
    }
    if (!evidence.contractTestsPassed) {
      return deny("contract_tests_required");
    }
    return {
      allowed: true,
      reasons: [],
    };
  }

  if (input.to === "canary") {
    if (!evidence.regressionTestsPassed) {
      return deny("regression_tests_required");
    }
    if (!evidence.securityReviewPassed) {
      return deny("security_review_required");
    }
    if (!evidence.humanApproverId) {
      return deny("human_approver_required");
    }
    if (!evidence.rollbackPlanId) {
      return deny("rollback_plan_required");
    }
    return {
      allowed: true,
      reasons: [],
    };
  }

  if (input.to === "trusted") {
    const minCanaryRuns = input.minCanaryRuns ?? DEFAULT_MIN_CANARY_RUNS;
    const minCanarySuccessRate =
      input.minCanarySuccessRate ?? DEFAULT_MIN_CANARY_SUCCESS_RATE;

    if (!evidence.humanApproverId) {
      return deny("human_approver_required");
    }
    if (!evidence.threatModelVersion) {
      return deny("threat_model_version_required");
    }
    if ((evidence.canaryRuns ?? 0) < minCanaryRuns) {
      return deny("insufficient_canary_runs");
    }
    if ((evidence.canarySuccessRate ?? 0) < minCanarySuccessRate) {
      return deny("insufficient_canary_success_rate");
    }
    return {
      allowed: true,
      reasons: [],
    };
  }

  return deny("unsupported_target_stage");
}

function buildDecision(
  decision: ToolFoundryDecision,
  ...reasons: string[]
): ToolExecutionAuthorizationDecision {
  return {
    decision,
    reasons,
  };
}

export function evaluateToolExecutionAuthorization(
  input: ToolExecutionAuthorizationInput,
): ToolExecutionAuthorizationDecision {
  if (!input.capabilityAllowlisted) {
    return buildDecision("deny", "capability_not_allowlisted");
  }

  if (!input.scopedTokenPresent) {
    return buildDecision("deny", "scoped_token_required");
  }

  if (input.operationClass !== "read" && !input.sandboxEnforced) {
    return buildDecision("deny", "sandbox_required_for_non_read");
  }

  if (input.stage === "draft" && input.operationClass !== "read") {
    return buildDecision("deny", "draft_stage_read_only");
  }

  if (
    (input.operationClass === "mutate" ||
      input.operationClass === "external_network" ||
      input.operationClass === "secret_access") &&
    input.humanApprovalRequired &&
    !input.humanApprovalGranted
  ) {
    return buildDecision("require_approval", "human_approval_required");
  }

  if (
    input.operationClass === "mutate" &&
    (input.stage === "staged" || input.stage === "canary") &&
    !input.humanApprovalGranted
  ) {
    return buildDecision("require_approval", "mutation_approval_required_before_trusted");
  }

  if (input.operationClass === "external_network") {
    if (input.stage === "staged" || input.stage === "draft") {
      return buildDecision("deny", "external_network_not_allowed_before_canary");
    }
    if (input.stage === "canary" && !input.humanApprovalGranted) {
      return buildDecision("require_approval", "external_network_requires_canary_approval");
    }
  }

  if (input.operationClass === "secret_access") {
    if (input.stage !== "trusted") {
      return buildDecision("deny", "secret_access_only_allowed_in_trusted_stage");
    }
    if (!input.humanApprovalGranted) {
      return buildDecision("require_approval", "secret_access_requires_human_approval");
    }
  }

  return buildDecision("allow");
}
