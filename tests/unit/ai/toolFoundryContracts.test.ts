import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { buildCapabilityGapBlockedPayload } from "../../../convex/ai/agentToolOrchestration";
import {
  evaluateToolExecutionAuthorization,
  evaluateToolVersionPromotion,
} from "../../../convex/ai/toolFoundry/contracts";
import {
  TOOL_FOUNDRY_PROPOSAL_BACKLOG_CONTRACT_VERSION,
  TOOL_FOUNDRY_PROPOSAL_ROLLBACK_POLICY,
  buildToolSpecProposalBacklogRecord,
  buildToolSpecProposalBacklogUpdatePatch,
  buildToolSpecProposalTraceKey,
} from "../../../convex/ai/toolFoundry/proposalBacklog";
import {
  TOOL_FOUNDRY_EVIDENCE_VIEW_CONTRACT_VERSION,
  buildToolFoundryEvidenceViewContract,
} from "@/components/window-content/agents/tool-foundry-evidence-contract";

describe("tool foundry promotion contracts", () => {
  it("denies stage skipping", () => {
    const result = evaluateToolVersionPromotion({
      from: "draft",
      to: "trusted",
      evidence: {
        policyBundleHash: "hash_1",
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toEqual(["stage_transition_invalid"]);
  });

  it("requires stage evidence for draft to staged", () => {
    const result = evaluateToolVersionPromotion({
      from: "draft",
      to: "staged",
      evidence: {
        policyBundleHash: "hash_1",
        specValidated: true,
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toEqual(["contract_tests_required"]);
  });

  it("allows draft to staged when spec and contract tests pass", () => {
    const result = evaluateToolVersionPromotion({
      from: "draft",
      to: "staged",
      evidence: {
        policyBundleHash: "hash_1",
        specValidated: true,
        contractTestsPassed: true,
      },
    });

    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("requires human approver and rollback plan for staged to canary", () => {
    const result = evaluateToolVersionPromotion({
      from: "staged",
      to: "canary",
      evidence: {
        policyBundleHash: "hash_2",
        regressionTestsPassed: true,
        securityReviewPassed: true,
      },
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toEqual(["human_approver_required"]);
  });

  it("requires canary run evidence for canary to trusted", () => {
    const result = evaluateToolVersionPromotion({
      from: "canary",
      to: "trusted",
      evidence: {
        policyBundleHash: "hash_3",
        humanApproverId: "user_1",
        threatModelVersion: "tm_1",
        canaryRuns: 30,
        canarySuccessRate: 0.99,
      },
      minCanaryRuns: 50,
      minCanarySuccessRate: 0.98,
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toEqual(["insufficient_canary_runs"]);
  });

  it("allows canary to trusted when all quality gates pass", () => {
    const result = evaluateToolVersionPromotion({
      from: "canary",
      to: "trusted",
      evidence: {
        policyBundleHash: "hash_4",
        humanApproverId: "user_2",
        threatModelVersion: "tm_2",
        canaryRuns: 120,
        canarySuccessRate: 0.992,
      },
    });

    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
  });
});

describe("tool foundry execution authorization", () => {
  it("denies execution when capability is not allowlisted", () => {
    const result = evaluateToolExecutionAuthorization({
      stage: "trusted",
      operationClass: "read",
      capabilityAllowlisted: false,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: false,
      humanApprovalGranted: false,
    });

    expect(result).toEqual({
      decision: "deny",
      reasons: ["capability_not_allowlisted"],
    });
  });

  it("denies execution when scoped token is missing", () => {
    const result = evaluateToolExecutionAuthorization({
      stage: "trusted",
      operationClass: "read",
      capabilityAllowlisted: true,
      scopedTokenPresent: false,
      sandboxEnforced: true,
      humanApprovalRequired: false,
      humanApprovalGranted: false,
    });

    expect(result).toEqual({
      decision: "deny",
      reasons: ["scoped_token_required"],
    });
  });

  it("keeps draft stage read-only", () => {
    const result = evaluateToolExecutionAuthorization({
      stage: "draft",
      operationClass: "mutate",
      capabilityAllowlisted: true,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: true,
      humanApprovalGranted: true,
    });

    expect(result).toEqual({
      decision: "deny",
      reasons: ["draft_stage_read_only"],
    });
  });

  it("requires approval for staged mutation without explicit grant", () => {
    const result = evaluateToolExecutionAuthorization({
      stage: "staged",
      operationClass: "mutate",
      capabilityAllowlisted: true,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: false,
      humanApprovalGranted: false,
    });

    expect(result).toEqual({
      decision: "require_approval",
      reasons: ["mutation_approval_required_before_trusted"],
    });
  });

  it("allows staged mutation after explicit approval", () => {
    const result = evaluateToolExecutionAuthorization({
      stage: "staged",
      operationClass: "mutate",
      capabilityAllowlisted: true,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: true,
      humanApprovalGranted: true,
    });

    expect(result).toEqual({
      decision: "allow",
      reasons: [],
    });
  });

  it("requires approval for canary external network access", () => {
    const result = evaluateToolExecutionAuthorization({
      stage: "canary",
      operationClass: "external_network",
      capabilityAllowlisted: true,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: false,
      humanApprovalGranted: false,
    });

    expect(result).toEqual({
      decision: "require_approval",
      reasons: ["external_network_requires_canary_approval"],
    });
  });

  it("keeps secret access trusted-only and approval-bound", () => {
    const denied = evaluateToolExecutionAuthorization({
      stage: "canary",
      operationClass: "secret_access",
      capabilityAllowlisted: true,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: true,
      humanApprovalGranted: true,
    });

    expect(denied).toEqual({
      decision: "deny",
      reasons: ["secret_access_only_allowed_in_trusted_stage"],
    });

    const approvalNeeded = evaluateToolExecutionAuthorization({
      stage: "trusted",
      operationClass: "secret_access",
      capabilityAllowlisted: true,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: false,
      humanApprovalGranted: false,
    });

    expect(approvalNeeded).toEqual({
      decision: "require_approval",
      reasons: ["secret_access_requires_human_approval"],
    });

    const allowed = evaluateToolExecutionAuthorization({
      stage: "trusted",
      operationClass: "secret_access",
      capabilityAllowlisted: true,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: true,
      humanApprovalGranted: true,
    });

    expect(allowed).toEqual({
      decision: "allow",
      reasons: [],
    });
  });
});

describe("tool foundry proposal backlog persistence contracts", () => {
  const organizationId = "org_1" as Id<"organizations">;
  const agentId = "agent_1" as Id<"objects">;
  const sessionId = "session_1" as Id<"agentSessions">;
  const turnId = "turn_1" as Id<"agentTurns">;

  it("builds deterministic backlog records with provenance trace and rollback metadata", () => {
    const blockedCapabilityGap = buildCapabilityGapBlockedPayload({
      requestedToolName: "manage_quantum_invoices",
      parsedArgs: {
        amount: 100,
        currency: "USD",
      },
      organizationId,
      agentId,
      sessionId,
      now: 1700000000000,
    });

    const record = buildToolSpecProposalBacklogRecord({
      organizationId,
      blockedCapabilityGap,
      sourceTrace: {
        agentId,
        sessionId,
        turnId,
        receiptId: "receipt_1",
        channel: "slack",
        externalContactIdentifier: "U123",
        idempotencyScopeKey: "scope:message_ingress",
        payloadHash: "payload:abc:123",
        queueConcurrencyKey: "org_1:route:slack:T1:message_ingress",
        workflowKey: "message_ingress",
      },
      observedAt: 1700000000000,
      now: 1700000000000,
    });

    expect(record.contractVersion).toBe(
      TOOL_FOUNDRY_PROPOSAL_BACKLOG_CONTRACT_VERSION
    );
    expect(record.proposalKey).toBe(
      "toolspec:manage_quantum_invoices:org_1:session_1"
    );
    expect(record.status).toBe("pending_review");
    expect(record.trace).toMatchObject({
      reasonCode: "missing_internal_concept_tool_backend_contract",
      missingKinds: ["internal_concept", "tool_contract", "backend_contract"],
    });
    expect(record.provenance.sourceRequestTraceKey).toBe(
      "trace:toolspec_manage_quantum_invoices_org_1_session_1:session_1:missing_internal_concept_tool_backend_contract:payload_abc_123"
    );
    expect(record.rollback).toEqual({
      rollbackKey:
        "rollback:toolspec:manage_quantum_invoices:org_1:session_1:missing_internal_concept_tool_backend_contract",
      policy: TOOL_FOUNDRY_PROPOSAL_ROLLBACK_POLICY,
      status: "rollback_ready",
      reasonCode: "missing_internal_concept_tool_backend_contract",
    });
    expect(record.observationCount).toBe(1);
  });

  it("keeps deterministic trace keys stable across equivalent payloads", () => {
    const traceKeyOne = buildToolSpecProposalTraceKey({
      proposalKey: "toolspec:manage_quantum_invoices:org_1:session_1",
      sessionId: "session_1",
      reasonCode: "missing_internal_concept_tool_backend_contract",
      payloadHash: "payload:abc:123",
    });
    const traceKeyTwo = buildToolSpecProposalTraceKey({
      proposalKey: "toolspec-manage-quantum-invoices-org-1-session-1",
      sessionId: "SESSION_1",
      reasonCode: "missing_internal_concept_tool_backend_contract",
      payloadHash: "payload_abc_123",
    });

    expect(traceKeyOne).toBe(
      "trace:toolspec_manage_quantum_invoices_org_1_session_1:session_1:missing_internal_concept_tool_backend_contract:payload_abc_123"
    );
    expect(traceKeyOne).toBe(traceKeyTwo);
  });

  it("increments observation count while preserving rollback-applied state", () => {
    const blockedCapabilityGap = buildCapabilityGapBlockedPayload({
      requestedToolName: "manage_quantum_invoices",
      parsedArgs: { amount: 200 },
      organizationId,
      agentId,
      sessionId,
      now: 1700000001000,
    });

    const firstRecord = buildToolSpecProposalBacklogRecord({
      organizationId,
      blockedCapabilityGap,
      sourceTrace: {
        agentId,
        sessionId,
      },
      observedAt: 1700000001000,
      now: 1700000001000,
    });

    const existing = {
      ...firstRecord,
      status: "rolled_back" as const,
      rollback: {
        ...firstRecord.rollback,
        status: "rollback_applied" as const,
        appliedAt: 1700000001500,
        appliedBy: "operator_1",
      },
      firstObservedAt: 1700000000000,
      lastObservedAt: 1700000001000,
      observationCount: 2,
      createdAt: 1700000000000,
      updatedAt: 1700000001000,
    };

    const nextRecord = buildToolSpecProposalBacklogRecord({
      organizationId,
      blockedCapabilityGap,
      sourceTrace: {
        agentId,
        sessionId,
      },
      observedAt: 1700000003000,
      now: 1700000003000,
    });

    const patch = buildToolSpecProposalBacklogUpdatePatch({
      existing,
      next: nextRecord,
      now: 1700000003000,
    });

    expect(patch.status).toBe("rolled_back");
    expect(patch.rollback).toEqual(existing.rollback);
    expect(patch.firstObservedAt).toBe(1700000000000);
    expect(patch.lastObservedAt).toBe(1700000003000);
    expect(patch.observationCount).toBe(3);
    expect(patch.createdAt).toBe(1700000000000);
    expect(patch.updatedAt).toBe(1700000003000);
  });
});

describe("tool foundry evidence view contracts", () => {
  it("fails closed when lifecycle trace and rollback readiness evidence is incomplete", () => {
    const contract = buildToolFoundryEvidenceViewContract({
      fromStage: "staged",
      toStage: "canary",
      promotionEvidence: {
        policyBundleHash: "",
        specValidated: true,
        contractTestsPassed: true,
        regressionTestsPassed: false,
        securityReviewPassed: false,
        humanApproverId: "",
        rollbackPlanId: "",
        canaryRuns: 2,
        canarySuccessRate: 0.5,
      },
      lifecycleEvents: [
        {
          name: "trust.tool_foundry.promotion_requested.v1",
          occurredAt: 1700000000000,
          correlationId: "corr_1",
        },
      ],
      approvalChain: [],
      rollback: {
        status: "rollback_missing",
      },
    });

    expect(contract.contractVersion).toBe(
      TOOL_FOUNDRY_EVIDENCE_VIEW_CONTRACT_VERSION,
    );
    expect(contract.readOnly).toBe(true);
    expect(contract.trustBoundary).toBe("one_agent");
    expect(contract.overallStatus).toBe("needs_attention");
    expect(contract.sections).toHaveLength(5);
    expect(
      contract.sections.find((section) => section.id === "policy_checks")?.status,
    ).toBe("needs_attention");
    expect(
      contract.sections.find((section) => section.id === "rollback_readiness")?.status,
    ).toBe("needs_attention");
    expect(contract.mobileParity).toEqual({
      featureFlagKey:
        "NEXT_PUBLIC_OPERATOR_MOBILE_TOOL_FOUNDRY_EVIDENCE_VIEW_ENABLED",
      enabled: false,
      mode: "desktop_only",
      fullRolloutAllowed: false,
    });
  });

  it("marks every evidence section pass with complete promotion, approval, canary, and rollback artifacts", () => {
    const contract = buildToolFoundryEvidenceViewContract({
      fromStage: "canary",
      toStage: "trusted",
      promotionEvidence: {
        policyBundleHash: "policy_hash_1",
        specValidated: true,
        contractTestsPassed: true,
        regressionTestsPassed: true,
        securityReviewPassed: true,
        humanApproverId: "operator_1",
        rollbackPlanId: "rollback_1",
        canaryRuns: 120,
        canarySuccessRate: 0.995,
      },
      lifecycleEvents: [
        {
          name: "trust.tool_foundry.promotion_requested.v1",
          occurredAt: 1700000000000,
          correlationId: "corr_1",
          lineageId: "lineage_1",
          threadId: "thread_1",
          workflowKey: "tool_foundry_review",
          frontlineIntakeTrigger: "tool_failure",
          boundaryReason: "runtime_capability_gap_detected",
        },
        {
          name: "trust.tool_foundry.promotion_granted.v1",
          occurredAt: 1700000005000,
          correlationId: "corr_1",
          lineageId: "lineage_1",
          threadId: "thread_1",
          workflowKey: "tool_foundry_review",
          frontlineIntakeTrigger: "tool_failure",
          boundaryReason: "runtime_capability_gap_detected",
        },
      ],
      approvalChain: [
        {
          approverId: "operator_1",
          decision: "approved",
          occurredAt: 1700000005000,
        },
      ],
      rollback: {
        status: "rollback_ready",
      },
      minCanaryRuns: 100,
      minCanarySuccessRate: 0.99,
    });

    expect(contract.overallStatus).toBe("pass");
    expect(
      contract.sections.every((section) => section.status === "pass"),
    ).toBe(true);
  });

  it("keeps operator-mobile evidence parity behind an explicit feature flag", () => {
    const disabled = buildToolFoundryEvidenceViewContract({
      fromStage: "staged",
      toStage: "canary",
      promotionEvidence: {
        policyBundleHash: "policy_hash_1",
      },
      lifecycleEvents: [],
      approvalChain: [],
    });

    expect(disabled.mobileParity.enabled).toBe(false);
    expect(disabled.mobileParity.mode).toBe("desktop_only");
    expect(disabled.mobileParity.fullRolloutAllowed).toBe(false);

    const enabled = buildToolFoundryEvidenceViewContract({
      fromStage: "staged",
      toStage: "canary",
      promotionEvidence: {
        policyBundleHash: "policy_hash_1",
      },
      lifecycleEvents: [],
      approvalChain: [],
      mobileParityEnv: {
        NEXT_PUBLIC_OPERATOR_MOBILE_TOOL_FOUNDRY_EVIDENCE_VIEW_ENABLED: "true",
      },
    });

    expect(enabled.mobileParity.enabled).toBe(true);
    expect(enabled.mobileParity.mode).toBe("flag_gated_contract_only");
    expect(enabled.mobileParity.fullRolloutAllowed).toBe(false);
  });
});

describe("tool foundry TFD-009 pilot scenarios", () => {
  const organizationId = "org_1" as Id<"organizations">;
  const agentId = "agent_1" as Id<"objects">;
  const sessionId = "session_1" as Id<"agentSessions">;

  it("keeps the read-only capability-gap path deterministic from blocked payload to staged promotion", () => {
    const blocked = buildCapabilityGapBlockedPayload({
      requestedToolName: "lookup_policy_snapshot",
      parsedArgs: {
        policyId: "POL-100",
        includeHistory: false,
      },
      organizationId,
      agentId,
      sessionId,
      now: 1700000010000,
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.code).toBe("missing_internal_concept_tool_backend_contract");
    expect(blocked.proposalArtifact.proposalKey).toBe(
      "toolspec:lookup_policy_snapshot:org_1:session_1",
    );

    const record = buildToolSpecProposalBacklogRecord({
      organizationId,
      blockedCapabilityGap: blocked,
      sourceTrace: {
        agentId,
        sessionId,
      },
      observedAt: 1700000010000,
      now: 1700000010000,
    });

    expect(record.status).toBe("pending_review");
    expect(record.proposalKey).toBe(
      "toolspec:lookup_policy_snapshot:org_1:session_1",
    );
    expect(record.trace.reasonCode).toBe(
      "missing_internal_concept_tool_backend_contract",
    );

    const stagedPromotion = evaluateToolVersionPromotion({
      from: "draft",
      to: "staged",
      evidence: {
        policyBundleHash: "policy_hash_read_1",
        specValidated: true,
        contractTestsPassed: true,
      },
    });

    expect(stagedPromotion).toEqual({
      allowed: true,
      reasons: [],
    });

    const readExecution = evaluateToolExecutionAuthorization({
      stage: "staged",
      operationClass: "read",
      capabilityAllowlisted: true,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: false,
      humanApprovalGranted: false,
    });

    expect(readExecution).toEqual({
      decision: "allow",
      reasons: [],
    });
  });

  it("blocks mutating capability escalation and approval bypass while allowing approved execution", () => {
    const blocked = buildCapabilityGapBlockedPayload({
      requestedToolName: "issue_refund_transfer",
      parsedArgs: {
        invoiceId: "INV-44",
        amount: 250,
      },
      organizationId,
      agentId,
      sessionId,
      now: 1700000020000,
    });

    expect(blocked.status).toBe("blocked");
    expect(blocked.proposalArtifact.draft.suggestedToolName).toBe(
      "issue_refund_transfer",
    );

    const canaryWithoutApprover = evaluateToolVersionPromotion({
      from: "staged",
      to: "canary",
      evidence: {
        policyBundleHash: "policy_hash_mutate_1",
        regressionTestsPassed: true,
        securityReviewPassed: true,
      },
    });

    expect(canaryWithoutApprover).toEqual({
      allowed: false,
      reasons: ["human_approver_required"],
    });

    const canaryWithEvidence = evaluateToolVersionPromotion({
      from: "staged",
      to: "canary",
      evidence: {
        policyBundleHash: "policy_hash_mutate_1",
        regressionTestsPassed: true,
        securityReviewPassed: true,
        humanApproverId: "operator_2",
        rollbackPlanId: "rollback_mutate_1",
      },
    });

    expect(canaryWithEvidence).toEqual({
      allowed: true,
      reasons: [],
    });

    const capabilityEscalationDenied = evaluateToolExecutionAuthorization({
      stage: "trusted",
      operationClass: "mutate",
      capabilityAllowlisted: false,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: true,
      humanApprovalGranted: true,
    });

    expect(capabilityEscalationDenied).toEqual({
      decision: "deny",
      reasons: ["capability_not_allowlisted"],
    });

    const bypassAttempt = evaluateToolExecutionAuthorization({
      stage: "canary",
      operationClass: "mutate",
      capabilityAllowlisted: true,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: false,
      humanApprovalGranted: false,
    });

    expect(bypassAttempt).toEqual({
      decision: "require_approval",
      reasons: ["mutation_approval_required_before_trusted"],
    });

    const approvedExecution = evaluateToolExecutionAuthorization({
      stage: "canary",
      operationClass: "mutate",
      capabilityAllowlisted: true,
      scopedTokenPresent: true,
      sandboxEnforced: true,
      humanApprovalRequired: true,
      humanApprovalGranted: true,
    });

    expect(approvedExecution).toEqual({
      decision: "allow",
      reasons: [],
    });
  });

  it("keeps desktop and mobile evidence intake contracts aligned when mobile flag is enabled", () => {
    const sharedInput = {
      fromStage: "staged" as const,
      toStage: "canary" as const,
      promotionEvidence: {
        policyBundleHash: "policy_hash_parity_1",
        specValidated: true,
        contractTestsPassed: true,
        regressionTestsPassed: true,
        securityReviewPassed: true,
        humanApproverId: "operator_3",
        rollbackPlanId: "rollback_parity_1",
        canaryRuns: 60,
        canarySuccessRate: 0.99,
      },
      lifecycleEvents: [
        {
          name: "trust.tool_foundry.promotion_requested.v1" as const,
          occurredAt: 1700000030000,
          correlationId: "corr_parity",
          lineageId: "lineage_parity",
          threadId: "thread_parity",
          workflowKey: "tool_foundry_review",
          frontlineIntakeTrigger: "tool_failure",
          boundaryReason: "runtime_capability_gap_detected",
        },
        {
          name: "trust.tool_foundry.promotion_granted.v1" as const,
          occurredAt: 1700000031000,
          correlationId: "corr_parity",
          lineageId: "lineage_parity",
          threadId: "thread_parity",
          workflowKey: "tool_foundry_review",
          frontlineIntakeTrigger: "tool_failure",
          boundaryReason: "runtime_capability_gap_detected",
        },
      ],
      approvalChain: [
        {
          approverId: "operator_3",
          decision: "approved" as const,
          occurredAt: 1700000031000,
        },
      ],
      rollback: {
        status: "rollback_ready" as const,
      },
    };

    const desktop = buildToolFoundryEvidenceViewContract(sharedInput);
    const mobile = buildToolFoundryEvidenceViewContract({
      ...sharedInput,
      mobileParityEnv: {
        NEXT_PUBLIC_OPERATOR_MOBILE_TOOL_FOUNDRY_EVIDENCE_VIEW_ENABLED: "true",
      },
    });

    expect(desktop.contractVersion).toBe(mobile.contractVersion);
    expect(desktop.readOnly).toBe(true);
    expect(mobile.readOnly).toBe(true);
    expect(desktop.stageTransition).toEqual(mobile.stageTransition);
    expect(desktop.sections).toEqual(mobile.sections);
    expect(desktop.overallStatus).toBe(mobile.overallStatus);
    expect(mobile.mobileParity.enabled).toBe(true);
    expect(mobile.mobileParity.mode).toBe("flag_gated_contract_only");
    expect(mobile.mobileParity.fullRolloutAllowed).toBe(false);
  });
});
