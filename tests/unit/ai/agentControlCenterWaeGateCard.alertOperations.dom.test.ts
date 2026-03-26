/* @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { AgentControlCenterWaeGateCard } from "../../../src/components/window-content/super-admin-organizations-window/agent-control-center-wae-gate-card";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../convex/_generated/api") as { api: any };

const useQueryMock = vi.mocked(useQuery as any);
const useMutationMock = vi.mocked(useMutation as any);
const useAuthMock = vi.mocked(useAuth);

const STATUS_RESPONSE = {
  generatedAt: 1_763_000_500_000,
  template: {
    templateId: "objects_operator_template",
    templateName: "One-of-One Operator Template",
    templateOrganizationId: "organizations_platform",
    templateVersionId: "objects_operator_template_v2",
    templateVersionTag: "template_v2",
    templateLifecycleStatus: "published",
    templateVersionLifecycleStatus: "published",
  },
  certification: {
    status: "rejected",
    reasonCode: "missing_required_verification",
    recordedAt: 1_763_000_500_000,
    dependencyManifest: {
      dependencyDigest: "digest_v2",
    },
    riskAssessment: {
      tier: "medium",
      requiredVerification: ["manifest_integrity", "risk_assessment", "tool_contract_eval"],
    },
    evidenceSources: [
      {
        sourceType: "manifest_integrity",
        summary: "Pinned dependency digest digest_v2.",
      },
    ],
  },
  certificationEvaluation: {
    allowed: false,
    reasonCode: "certification_invalid",
    message: "Template certification did not satisfy the required verification bundle.",
    autoCertificationEligible: false,
    riskAssessment: {
      tier: "medium",
      requiredVerification: ["manifest_integrity", "risk_assessment", "tool_contract_eval"],
    },
    dependencyManifest: {
      dependencyDigest: "digest_v2",
    },
    certification: {
      status: "rejected",
      reasonCode: "missing_required_verification",
      recordedAt: 1_763_000_500_000,
      dependencyManifest: {
        dependencyDigest: "digest_v2",
      },
      riskAssessment: {
        tier: "medium",
        requiredVerification: ["manifest_integrity", "risk_assessment", "tool_contract_eval"],
      },
      evidenceSources: [
        {
          sourceType: "manifest_integrity",
          summary: "Pinned dependency digest digest_v2.",
        },
      ],
    },
  },
  riskAssessment: {
    tier: "medium",
    requiredVerification: ["manifest_integrity", "risk_assessment", "tool_contract_eval"],
  },
  dependencyManifest: {
    dependencyDigest: "digest_v2",
  },
  autoCertificationEligible: false,
  alertOperations: {
    templateFamily: "sales_specialist_template",
    automationPolicyScope: "family",
    automationPolicy: {
      adoptionMode: "enforced",
      ownerUserIds: ["users_sales_owner"],
      ownerTeamIds: ["team_ops"],
      alertChannels: ["slack", "pagerduty"],
      alertOnCertificationBlocked: true,
      alertOnMissingDefaultEvidence: true,
    },
    dispatchControl: {
      maxAttempts: 3,
      retryDelayMs: 300000,
      channels: {
        slack: { enabled: true, target: "certification-alerts" },
        pagerduty: { enabled: true, target: "template-certification" },
        email: { enabled: true, target: "certification-alerts@ops.local" },
      },
      throttle: {
        slack: { windowMs: 900000, maxDispatches: 8 },
        pagerduty: { windowMs: 600000, maxDispatches: 6 },
        email: { windowMs: 1800000, maxDispatches: 12 },
      },
      credentialGovernance: {
        slack: {
          requireDedicatedCredentials: false,
          allowInlineTargetCredentials: true,
          runbookUrl: "docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TRANSPORT_CREDENTIAL_RUNBOOK.md#slack",
        },
        pagerduty: {
          requireDedicatedCredentials: false,
          allowInlineTargetCredentials: true,
          runbookUrl: "docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TRANSPORT_CREDENTIAL_RUNBOOK.md#pagerduty",
        },
        email: {
          requireDedicatedCredentials: true,
          allowInlineTargetCredentials: true,
          runbookUrl: "docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TRANSPORT_CREDENTIAL_RUNBOOK.md#email",
        },
      },
      strictMode: {
        enabled: true,
        rolloutMode: "auto_promote_ready_channels",
        guardrailMode: "advisory",
        notifyOnPolicyDrift: true,
      },
    },
    dispatchControlSource: "platform_setting",
    policyDrift: {
      strictModeEnabled: true,
      detected: true,
      issueCount: 1,
      issues: [
        {
          code: "email_credential_governance_drift",
          scope: "credential_governance",
          channel: "email",
          message: "Strict credential governance drift detected for email.",
        },
      ],
    },
    strictModeRollout: {
      enabled: true,
      rolloutMode: "auto_promote_ready_channels",
      guardrailMode: "advisory",
      promotedChannels: ["slack"],
      blockedChannels: [
        {
          channel: "email",
          reasonCode: "email_transport_credential_policy_violation",
          message:
            "Email transport requires dedicated TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY and TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM credentials.",
        },
      ],
    },
    credentialHealth: {
      slack: {
        ready: true,
        policyCompliant: true,
        credentialSource: "inline_target",
        message: "Slack inline webhook target is configured.",
      },
      pagerduty: {
        ready: true,
        policyCompliant: true,
        credentialSource: "routing_map_env",
        message: "PagerDuty routing map credential is configured.",
      },
      email: {
        ready: false,
        policyCompliant: false,
        credentialSource: "fallback_env",
        reasonCode: "email_transport_credential_policy_violation",
        message: "Email transport requires dedicated TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY and TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM credentials.",
      },
    },
    defaultEvidenceSources: ["runtime_smoke_eval", "tool_contract_eval"],
    missingDefaultEvidenceSources: ["tool_contract_eval"],
    alertRecommendations: [
      {
        code: "certification_blocked",
        severity: "critical",
        summary: "Template certification blocked for objects_operator_template@template_v2.",
        ownerUserIds: ["users_sales_owner"],
        ownerTeamIds: ["team_ops"],
        alertChannels: ["slack", "pagerduty"],
      },
    ],
    recentDispatches: [
      {
        contractVersion: "template_certification_alert_dispatch_v1",
        templateId: "objects_operator_template",
        templateVersionId: "objects_operator_template_v2",
        templateVersionTag: "template_v2",
        dependencyDigest: "digest_v2",
        recommendationCode: "certification_blocked",
        recommendationSeverity: "critical",
        recommendationSummary: "Template certification blocked for objects_operator_template@template_v2.",
        channel: "slack",
        deliveryStatus: "queued",
        dedupeKey: "dispatch_key_1",
        ownerUserIds: ["users_sales_owner"],
        ownerTeamIds: ["team_ops"],
        recordedAt: 1_763_000_500_000,
        recordedByUserId: "users_super_admin",
      },
    ],
  },
  gate: null,
  evaluation: {
    allowed: false,
    reasonCode: "wae_gate_failed",
    message: "Template certification did not satisfy the required verification bundle.",
    ageMs: 1_000,
  },
  evalCommands: ["npm run wae:eval:contracts"],
  bundlePaths: {
    runRecord: "tmp/reports/wae/<runId>/bundle/run-records.jsonl",
    scenarioRecords: "tmp/reports/wae/<runId>/bundle/scenario-records.jsonl",
  },
};

const FLEET_STATUS_RESPONSE = [
  {
    organizationId: "organizations_alpha",
    organizationName: "Alpha Org",
    effectiveGateStatus: "NO_GO",
    ownerGateDecision: "NO_GO",
    blockerIds: ["R-002", "R-004"],
    blockerCount: 2,
    platformSharedEvidenceAvailableCount: 3,
    avvOutreachOverdueCount: 1,
    updatedAt: 1_763_000_400_000,
  },
];

describe("AgentControlCenterWaeGateCard alert operations", () => {
  let previewMutation: ReturnType<typeof vi.fn>;
  let recordMutation: ReturnType<typeof vi.fn>;
  let acknowledgeMutation: ReturnType<typeof vi.fn>;
  let throttleMutation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).React = React;
    useAuthMock.mockReturnValue({
      sessionId: "sessions_super_admin",
      isSuperAdmin: true,
    } as any);
    useQueryMock.mockImplementation((queryRef, args) => {
      if (args === "skip") {
        return undefined;
      }
      if (queryRef === api.complianceControlPlane.listComplianceFleetGateStatus) {
        return FLEET_STATUS_RESPONSE as any;
      }
      return STATUS_RESPONSE as any;
    });
    previewMutation = vi.fn(async () => ({}));
    recordMutation = vi.fn(async () => ({}));
    acknowledgeMutation = vi.fn(async () => ({}));
    throttleMutation = vi.fn(async () => ({}));
    useMutationMock
      .mockReturnValueOnce(previewMutation)
      .mockReturnValueOnce(recordMutation)
      .mockReturnValueOnce(acknowledgeMutation)
      .mockReturnValueOnce(throttleMutation)
      .mockReturnValue(throttleMutation);
  });

  it("renders automation policy, recommendations, and dispatch history", () => {
    render(React.createElement(AgentControlCenterWaeGateCard));

    expect(screen.getByText("Certification alert operations")).toBeTruthy();
    expect(screen.getByText(/Policy scope family/)).toBeTruthy();
    expect(screen.getByText(/adoption enforced/)).toBeTruthy();
    expect(screen.getByText(/Worker control source platform_setting/)).toBeTruthy();
    expect(screen.getByText(/Credential governance: slack dedicated no \/ inline allowed/)).toBeTruthy();
    expect(screen.getByText(/Strict mode: enabled/)).toBeTruthy();
    expect(screen.getByText(/rollout auto_promote_ready_channels/)).toBeTruthy();
    expect(screen.getByText(/Policy drift detected \(1\):/)).toBeTruthy();
    expect(screen.getByText(/email_credential_governance_drift • email/)).toBeTruthy();
    expect(screen.getByText(/email • blocked • source fallback_env • policy violation/)).toBeTruthy();
    expect(screen.getByText(/certification_blocked \(critical\)/)).toBeTruthy();
    expect(screen.getByText(/slack • queued • certification_blocked/)).toBeTruthy();
  });

  it("runs direct dispatch acknowledge and snooze controls", async () => {
    render(React.createElement(AgentControlCenterWaeGateCard));

    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
    await waitFor(() => {
      expect(acknowledgeMutation).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        templateVersionId: "objects_operator_template_v2",
        dedupeKey: "dispatch_key_1",
        acknowledgementNote: "Acknowledged from super-admin alert operations panel.",
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Snooze 30m" }));
    await waitFor(() => {
      expect(throttleMutation).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        templateVersionId: "objects_operator_template_v2",
        dedupeKey: "dispatch_key_1",
        throttleMinutes: 30,
        reason: "super_admin_snooze",
      });
    });
  });
});
