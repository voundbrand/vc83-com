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

vi.mock("@/hooks/use-namespace-translations", () => ({
  useNamespaceTranslations: () => ({
    t: (key: string) => key,
    tWithFallback: (_key: string, fallback: string) => fallback,
    isLoading: false,
    translationsMap: {},
  }),
}));

vi.mock("@/contexts/translation-context", () => ({
  useTranslation: () => ({
    locale: "en",
    setLocale: vi.fn(),
    availableLocales: ["en"],
    formatDate: (date: Date) => date.toISOString(),
    formatNumber: (value: number) => String(value),
  }),
}));

import { useMutation, useQuery } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { AgentControlCenterTab } from "../../../src/components/window-content/super-admin-organizations-window/agent-control-center-tab";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../convex/_generated/api") as { api: any };

const useAuthMock = vi.mocked(useAuth);
const useQueryMock = vi.mocked(useQuery as any);
const useMutationMock = vi.mocked(useMutation as any);

const OVERVIEW_RESPONSE = {
  datasetVersion: "agp_v1",
  datasetVersions: ["agp_v1"],
  expectedAgentCount: 104,
  summary: {
    totalAgents: 1,
    catalogDone: 1,
    seedsFull: 0,
    runtimeLive: 0,
    toolsMissing: 1,
    published: 0,
    blockedAgents: 1,
  },
  drift: {
    status: "in_sync" as const,
    docsOutOfSync: false,
    registryOutOfSync: false,
    codeOutOfSync: false,
    reasons: [],
  },
  filterMetadata: {
    implementationPhases: [2],
  },
};

const LIST_AGENTS_RESPONSE = {
  total: 1,
  nextCursor: null,
  agents: [
    {
      _id: "agent_7",
      catalogAgentNumber: 7,
      name: "Revenue Strategist",
      category: "core",
      toolProfile: "sales",
      seedStatus: "skeleton",
      runtimeStatus: "template_only",
      published: false,
      specialistAccessModes: ["invisible"],
      implementationPhase: 2,
      blockersCount: 1,
      blockers: ["Needs legal review"],
      toolCoverageCounts: {
        required: 2,
        implemented: 1,
        missing: 1,
      },
      sourceRefs: {
        catalogDocPath: "docs/prd/souls/AGENT_PRODUCT_CATALOG.md",
        matrixDocPath: "docs/prd/souls/TOOL_REQUIREMENT_MATRIX.md",
        seedDocPath: "docs/prd/souls/SOUL_SEED_LIBRARY.md",
        roadmapDocPath: "docs/prd/souls/IMPLEMENTATION_ROADMAP.md",
      },
    },
  ],
};

const SYNC_RUNS_RESPONSE = {
  runs: [
    {
      _id: "run_1",
      mode: "read_only_audit" as const,
      status: "success" as const,
      startedAt: 1_700_000_000_000,
      completedAt: 1_700_000_000_200,
      summary: {
        totalAgents: 1,
        catalogDone: 1,
        seedsFull: 0,
        runtimeLive: 0,
        toolsMissing: 1,
      },
      drift: {
        docsOutOfSync: false,
        registryOutOfSync: false,
        codeOutOfSync: false,
        reasons: [],
      },
    },
  ],
};

const AGENT_DETAILS_RESPONSE = {
  agent: {
    ...LIST_AGENTS_RESPONSE.agents[0],
    subtype: "operator",
    tier: "t2",
    soulBlend: "analyst",
    soulStatus: "ready",
    autonomyDefault: "supervised",
    requiredIntegrations: [],
    channelAffinity: ["chat"],
  },
  tools: [],
  seed: {
    seedCoverage: "skeleton" as const,
    requiresSoulBuild: true,
    requiresSoulBuildReason: "Needs production prompt tuning",
    systemTemplateAgentId: "objects_template_agent_legacy",
    templateRole: "specialist",
    protectedTemplate: true,
    immutableOriginContractMapped: true,
    sourcePath: "convex/onboarding/seedPlatformAgents.ts",
  },
  recentSyncRuns: SYNC_RUNS_RESPONSE.runs,
};

const ORG_ACTION_CONTEXT_VIEW = {
  pipelineStates: [
    "pending",
    "assigned",
    "approved",
    "executing",
    "failed",
    "completed",
  ],
  totalsByPipelineState: {
    pending: 2,
    assigned: 1,
    approved: 1,
    executing: 0,
    failed: 1,
    completed: 3,
  },
  agentFilters: [],
  items: [],
  total: 8,
};

let triggerCatalogSyncMock: ReturnType<typeof vi.fn>;
let setAgentBlockerMock: ReturnType<typeof vi.fn>;
let setSeedStatusOverrideMock: ReturnType<typeof vi.fn>;
let setSeedTemplateBindingMock: ReturnType<typeof vi.fn>;
let setCatalogPublishedStatusMock: ReturnType<typeof vi.fn>;
let backfillCatalogPublishedFlagsMock: ReturnType<typeof vi.fn>;
let distributeTemplateToOrganizationsMock: ReturnType<typeof vi.fn>;
let submitToolFoundryPromotionDecisionMock: ReturnType<typeof vi.fn>;
let createAgentTemplateVersionSnapshotMock: ReturnType<typeof vi.fn>;
let publishAgentTemplateVersionMock: ReturnType<typeof vi.fn>;
let deprecateAgentTemplateLifecycleMock: ReturnType<typeof vi.fn>;

function makeCertificationSummary(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    status: "certified",
    requiredVerification: ["manifest_integrity"],
    autoCertificationEligible: false,
    evidenceSources: ["manifest_integrity"],
    ...overrides,
  };
}

const TOOL_FOUNDRY_PENDING_PROPOSALS = [
  {
    _id: "tf_backlog_1",
    organizationId: "organizations_super_admin",
    proposalKey: "toolspec:issue_refund_transfer:org_1:session_1",
    requestedToolName: "issue_refund_transfer",
    status: "pending_review" as const,
    lastObservedAt: 1_700_000_000_000,
    sourceRequestTraceKey: "trace_1",
    reasonCode: "missing_internal_concept_tool_backend_contract",
  },
];

const CLONE_INVENTORY_RESPONSE = {
  generatedAt: 1_700_100_000_000,
  total: 2,
  summary: {
    byPolicyState: {
      in_sync: 1,
      overridden: 1,
      stale: 0,
      blocked: 0,
    },
    byRisk: {
      low: 1,
      medium: 1,
      high: 0,
    },
  },
  filterMetadata: {
    organizations: [
      { id: "organizations_1", name: "Alpha Org", count: 1 },
      { id: "organizations_2", name: "Beta Org", count: 1 },
    ],
    templates: [
      { id: "objects_template_1", name: "Revenue Template", count: 2 },
    ],
  },
  rows: [
    {
      organizationId: "organizations_1",
      organizationName: "Alpha Org",
      templateId: "objects_template_1",
      templateName: "Revenue Template",
      templateVersion: "v1",
      cloneAgentId: "objects_clone_1",
      cloneAgentName: "Revenue Clone 1",
      cloneLifecycleState: "managed_in_sync",
      policyState: "in_sync" as const,
      riskLevel: "low" as const,
      stale: false,
      blocked: false,
      blockedFields: [],
      overriddenFields: [],
      diffCount: 0,
    },
    {
      organizationId: "organizations_2",
      organizationName: "Beta Org",
      templateId: "objects_template_1",
      templateName: "Revenue Template",
      templateVersion: "v1",
      cloneAgentId: "objects_clone_2",
      cloneAgentName: "Revenue Clone 2",
      cloneLifecycleState: "managed_override_pending_sync",
      policyState: "overridden" as const,
      riskLevel: "medium" as const,
      stale: false,
      blocked: false,
      blockedFields: [],
      overriddenFields: ["toolProfile"],
      diffCount: 1,
    },
  ],
};

const TEMPLATE_ROLLOUT_OPTIONS_RESPONSE = {
  generatedAt: 1_700_100_000_100,
  templates: [
    {
      templateId: "objects_template_1",
      templateName: "Revenue Template",
      lifecycleStatus: "published" as const,
      publishedVersionId: "objects_template_version_v2",
      publishedVersionTag: "v2",
      versions: [
        {
          templateVersionId: "objects_template_version_v2",
          versionTag: "v2",
          lifecycleStatus: "published" as const,
          createdAt: 1_700_090_000_000,
          updatedAt: 1_700_100_000_000,
          certification: makeCertificationSummary({
            riskTier: "medium",
            dependencyDigest: "digest_v2",
          }),
        },
        {
          templateVersionId: "objects_template_version_v1",
          versionTag: "v1",
          lifecycleStatus: "deprecated" as const,
          createdAt: 1_700_080_000_000,
          updatedAt: 1_700_080_000_100,
          certification: makeCertificationSummary({
            riskTier: "low",
            dependencyDigest: "digest_v1",
          }),
        },
      ],
    },
  ],
};

const ROLLOUT_DRIFT_PREVIEW_RESPONSE = {
  templateId: "objects_template_1",
  templateVersion: "v2",
  precedenceOrder: [
    "platform_policy",
    "template_baseline",
    "org_clone_overrides",
    "runtime_session_restrictions",
  ],
  fields: [
    "toolProfile",
    "enabledTools",
    "disabledTools",
    "autonomyLevel",
    "modelProvider",
    "modelId",
    "systemPrompt",
    "channelBindings",
  ],
  targets: [
    {
      organizationId: "organizations_2",
      cloneAgentId: "objects_clone_2",
      sourceTemplateId: "objects_template_1",
      sourceTemplateVersion: "v1",
      cloneLifecycleState: "managed_override_pending_sync",
      policyState: "overridden" as const,
      stale: false,
      blocked: false,
      blockedFields: [],
      overriddenFields: ["toolProfile"],
      diff: [
        {
          field: "toolProfile",
          policyMode: "warn" as const,
          templateValue: "sales",
          cloneValue: "support",
        },
      ],
    },
  ],
};

const DISTRIBUTION_TELEMETRY_RESPONSE = {
  generatedAt: 1_700_100_000_300,
  summary: {
    totalJobs: 2,
    byStatus: {
      planned: 1,
      completed: 0,
      completedWithErrors: 1,
    },
    byOperationKind: {
      rolloutApply: 1,
      rolloutRollback: 1,
    },
    totalAffectedOrgs: {
      requested: 3,
      staged: 2,
      mutated: 1,
      blocked: 1,
    },
  },
  rows: [
    {
      _id: "action_dist_1",
      performedAt: 1_700_100_000_250,
      actionType: "template_distribution_applied" as const,
      distributionJobId: "ath_dist_apply_rollback_1",
      templateId: "objects_template_1",
      templateVersion: "v1",
      operationKind: "rollout_rollback" as const,
      reason: "rollback_after_incident",
      dryRun: false,
      status: "completed_with_errors" as const,
      affectedOrgCounts: {
        requested: 1,
        staged: 1,
        mutated: 0,
        skipped: 0,
        blocked: 1,
      },
      summary: {
        plan: { creates: 0, updates: 0, skips: 0, blocked: 1 },
        applied: { creates: 0, updates: 0, skips: 0, blocked: 1 },
      },
      policyGates: {
        blockedLocked: 1,
        blockedWarnConfirmation: 0,
        warnConfirmed: 0,
        free: 0,
      },
      reasonCounts: {
        plan: { locked_override_fields: 1 },
        applied: { locked_override_fields: 1 },
      },
      rolloutWindow: {
        stageStartIndex: 0,
        stageSize: 1,
        requestedTargetCount: 1,
        stagedTargetCount: 1,
      },
    },
    {
      _id: "action_dist_2",
      performedAt: 1_700_100_000_200,
      actionType: "template_distribution_plan_generated" as const,
      distributionJobId: "ath_dist_preview_1",
      templateId: "objects_template_1",
      templateVersion: "v2",
      operationKind: "rollout_apply" as const,
      reason: "canary_window_1",
      dryRun: true,
      status: "planned" as const,
      affectedOrgCounts: {
        requested: 2,
        staged: 1,
        mutated: 1,
        skipped: 0,
        blocked: 0,
      },
      summary: {
        plan: { creates: 0, updates: 1, skips: 0, blocked: 0 },
        applied: { creates: 0, updates: 0, skips: 0, blocked: 0 },
      },
      policyGates: {
        blockedLocked: 0,
        blockedWarnConfirmation: 0,
        warnConfirmed: 1,
        free: 0,
      },
      reasonCounts: {
        plan: { template_version_drift: 1 },
        applied: {},
      },
      rolloutWindow: {
        stageStartIndex: 0,
        stageSize: 1,
        requestedTargetCount: 2,
        stagedTargetCount: 1,
      },
    },
  ],
};

const COMPLIANCE_FLEET_GATE_STATUS = [
  {
    organizationId: "organizations_1",
    organizationName: "Alpha Org",
    effectiveGateStatus: "NO_GO",
    ownerGateDecision: "NO_GO",
    blockerIds: ["R-003"],
    blockerCount: 1,
    platformSharedEvidenceAvailableCount: 2,
    avvOutreachOverdueCount: 0,
    updatedAt: 1_700_100_000_000,
  },
];

function resolveUseQueryResult(queryRef: any, args: any) {
  if (args === "skip") {
    return undefined;
  }
  if (queryRef === api.ai.orgActionCenter.getActionCenterView) {
    return ORG_ACTION_CONTEXT_VIEW;
  }
  if (
    args &&
    typeof args === "object" &&
    "sessionId" in args &&
    "organizationId" in args &&
    !("filters" in args) &&
    !("catalogAgentNumber" in args)
  ) {
    return ORG_ACTION_CONTEXT_VIEW;
  }
  if (queryRef === api.complianceControlPlane.listComplianceFleetGateStatus) {
    return COMPLIANCE_FLEET_GATE_STATUS;
  }
  if (args && typeof args === "object" && "templateId" in args && "targetOrganizationIds" in args) {
    return ROLLOUT_DRIFT_PREVIEW_RESPONSE;
  }
  if (
    args &&
    typeof args === "object" &&
    "sessionId" in args &&
    Object.keys(args).every((key) => key === "sessionId" || key === "refreshNonce")
  ) {
    return TEMPLATE_ROLLOUT_OPTIONS_RESPONSE;
  }
  if (args && typeof args === "object" && "templateId" in args && "limit" in args) {
    return DISTRIBUTION_TELEMETRY_RESPONSE;
  }
  if (args && typeof args === "object" && "filters" in args && !("datasetVersion" in args)) {
    return CLONE_INVENTORY_RESPONSE;
  }
  if (args && typeof args === "object" && "limit" in args && !("datasetVersion" in args)) {
    return TOOL_FOUNDRY_PENDING_PROPOSALS;
  }
  if (args && typeof args === "object" && "catalogAgentNumber" in args) {
    return AGENT_DETAILS_RESPONSE;
  }
  if (args && typeof args === "object" && "limit" in args) {
    return SYNC_RUNS_RESPONSE;
  }
  if (args && typeof args === "object" && "filters" in args) {
    return LIST_AGENTS_RESPONSE;
  }
  return OVERVIEW_RESPONSE;
}

async function selectAgentRowAndOpenDependencies() {
  const rowNameCell = screen.getByText("Revenue Strategist");
  const row = rowNameCell.closest("tr");
  expect(row).not.toBeNull();
  fireEvent.click(row as HTMLTableRowElement);

  const dependenciesButton = await screen.findByRole("button", { name: "Dependencies" });
  fireEvent.click(dependenciesButton);
  expect(await screen.findByPlaceholderText("Add blocker note.")).toBeTruthy();
}

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).React = React;

  triggerCatalogSyncMock = vi.fn().mockResolvedValue({ status: "in_sync" });
  setAgentBlockerMock = vi.fn().mockResolvedValue({ success: true });
  setSeedStatusOverrideMock = vi.fn().mockResolvedValue({ success: true });
  setSeedTemplateBindingMock = vi.fn().mockResolvedValue({ success: true });
  setCatalogPublishedStatusMock = vi.fn().mockResolvedValue({ success: true });
  backfillCatalogPublishedFlagsMock = vi.fn().mockResolvedValue({ success: true, updatedCount: 0 });
  distributeTemplateToOrganizationsMock = vi
    .fn()
    .mockResolvedValueOnce({
      distributionJobId: "ath_dist_preview_1",
      templateId: "objects_template_1",
      templateVersion: "v2",
      operationKind: "rollout_apply",
      dryRun: true,
      requestedTargetOrganizationIds: ["organizations_1", "organizations_2"],
      targetOrganizationIds: ["organizations_2"],
      rolloutWindow: {
        stageStartIndex: 0,
        stageSize: 1,
        requestedTargetCount: 2,
        stagedTargetCount: 1,
      },
      summary: {
        plan: { creates: 0, updates: 1, skips: 0, blocked: 0 },
        applied: { creates: 0, updates: 0, skips: 0, blocked: 0 },
      },
      plan: [
        {
          organizationId: "organizations_2",
          operation: "update",
          reason: "template_version_drift",
          existingCloneId: "objects_clone_2",
          changedFields: ["templateVersion"],
        },
      ],
      applied: [],
    })
    .mockResolvedValue({
      distributionJobId: "ath_dist_apply_1",
      templateId: "objects_template_1",
      templateVersion: "v2",
      operationKind: "rollout_apply",
      dryRun: false,
      requestedTargetOrganizationIds: ["organizations_2"],
      targetOrganizationIds: ["organizations_2"],
      rolloutWindow: {
        stageStartIndex: 0,
        stageSize: 1,
        requestedTargetCount: 1,
        stagedTargetCount: 1,
      },
      summary: {
        plan: { creates: 0, updates: 1, skips: 0, blocked: 0 },
        applied: { creates: 0, updates: 1, skips: 0, blocked: 0 },
      },
      plan: [],
      applied: [
        {
          organizationId: "organizations_2",
          operation: "update",
          cloneAgentId: "objects_clone_2",
        },
      ],
    });
  submitToolFoundryPromotionDecisionMock = vi.fn().mockResolvedValue({ success: true });
  createAgentTemplateVersionSnapshotMock = vi.fn().mockResolvedValue({
    templateVersionId: "objects_template_version_v3",
    versionTag: "v3",
    lifecycleStatus: "draft",
  });
  publishAgentTemplateVersionMock = vi.fn().mockResolvedValue({
    templateVersionId: "objects_template_version_v2",
    publishedVersion: "v2",
    templateLifecycleStatus: "published",
    versionLifecycleStatus: "published",
  });
  deprecateAgentTemplateLifecycleMock = vi.fn().mockResolvedValue({
    target: "version",
    templateVersionId: "objects_template_version_v2",
    lifecycleStatus: "deprecated",
  });

  useAuthMock.mockReturnValue({
    sessionId: "sessions_super_admin",
    isSuperAdmin: true,
    user: {
      currentOrganization: {
        id: "organizations_super_admin",
      },
    },
  } as any);

  useQueryMock.mockImplementation((queryRef, args) => resolveUseQueryResult(queryRef, args));

  useMutationMock.mockImplementation(() => {
    return async (args: any) => {
      if (args?.waeRunRecord && args?.waeScenarioRecords) {
        return {
          template: {
            templateId: "objects_template_1",
            templateName: "Revenue Template",
            templateOrganizationId: "organizations_platform",
            templateVersionId: "objects_template_version_v2",
            templateVersionTag: "v2",
            templateLifecycleStatus: "published",
            templateVersionLifecycleStatus: "published",
          },
          artifact: { status: "pass" },
          certification: { status: "certified" },
          canRecord: true,
        };
      }
      if (args?.mode) {
        return triggerCatalogSyncMock(args);
      }
      if (args?.catalogAgentNumber && args?.action) {
        return setAgentBlockerMock(args);
      }
      if (args?.catalogAgentNumber && args?.override) {
        return setSeedStatusOverrideMock(args);
      }
      if (args?.catalogAgentNumber && "templateAgentId" in args) {
        return setSeedTemplateBindingMock(args);
      }
      if (args?.catalogAgentNumber && "published" in args) {
        return setCatalogPublishedStatusMock(args);
      }
      if (args?.dryRun !== undefined && args?.datasetVersion) {
        return backfillCatalogPublishedFlagsMock(args);
      }
      if (args?.operationKind) {
        return distributeTemplateToOrganizationsMock(args);
      }
      if (args?.proposalKey) {
        return submitToolFoundryPromotionDecisionMock(args);
      }
      if (args?.target === "version") {
        return deprecateAgentTemplateLifecycleMock(args);
      }
      if ("publishReason" in (args || {})) {
        return publishAgentTemplateVersionMock(args);
      }
      if ("versionTag" in (args || {}) || "summary" in (args || {})) {
        return createAgentTemplateVersionSnapshotMock(args);
      }
      return { success: true };
    };
  });
});

describe("Agent Control Center DOM click-through write flows", () => {
  it("renders template hub entry sections and allows section toggles", async () => {
    render(React.createElement(AgentControlCenterTab));

    expect(await screen.findByText("Template Hub")).toBeTruthy();
    expect(screen.getByTestId("agent-control-center-org-action-context")).toBeTruthy();
    expect(screen.getByText(/Org action context/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Template Catalog/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Version History/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Rollout Actions/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Version History/i }));
    expect(screen.getByText(/certification console/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Rollout Actions/i }));
    expect(screen.getByText(/Rollout is now split cleanly/i)).toBeTruthy();
  });

  it("confirms and executes add blocker only after modal confirmation", async () => {
    render(React.createElement(AgentControlCenterTab));

    await selectAgentRowAndOpenDependencies();

    fireEvent.change(screen.getByPlaceholderText("Add blocker note."), {
      target: { value: "Needs compliance sign-off" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add blocker" }));

    expect(setAgentBlockerMock).not.toHaveBeenCalled();
    expect(screen.getByText("Confirm Agent Control Write")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Write" }));

    await waitFor(() => {
      expect(setAgentBlockerMock).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        datasetVersion: "agp_v1",
        catalogAgentNumber: 7,
        blocker: "Needs compliance sign-off",
        action: "add",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Added blocker for agent #7.")).toBeTruthy();
    });
  });

  it("confirms and executes blocker removal through the danger confirmation path", async () => {
    render(React.createElement(AgentControlCenterTab));

    await selectAgentRowAndOpenDependencies();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(setAgentBlockerMock).not.toHaveBeenCalled();
    expect(
      screen.getByText((content) => content.includes("Operation: remove blocker")),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Write" }));

    await waitFor(() => {
      expect(setAgentBlockerMock).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        datasetVersion: "agp_v1",
        catalogAgentNumber: 7,
        blocker: "Needs legal review",
        action: "remove",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Removed blocker for agent #7.")).toBeTruthy();
    });
  });

  it("requires a reason before seed override and executes only after confirmation", async () => {
    render(React.createElement(AgentControlCenterTab));

    const rowNameCell = screen.getByText("Revenue Strategist");
    const row = rowNameCell.closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLTableRowElement);

    fireEvent.click(await screen.findByRole("button", { name: "Seed" }));
    expect(await screen.findByPlaceholderText("Explain why this override is required.")).toBeTruthy();

    const applyButton = screen.getByRole("button", { name: "Apply seed override" }) as HTMLButtonElement;
    expect(applyButton.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText("Explain why this override is required."), {
      target: { value: "Manual catalog verification" },
    });
    expect(applyButton.disabled).toBe(false);

    fireEvent.click(applyButton);
    expect(setSeedStatusOverrideMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Write" }));

    await waitFor(() => {
      expect(setSeedStatusOverrideMock).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        datasetVersion: "agp_v1",
        catalogAgentNumber: 7,
        override: {
          seedStatus: "skeleton",
          reason: "Manual catalog verification",
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Applied seed override for agent #7.")).toBeTruthy();
    });
  });

  it("binds template mapping through confirmation-gated seed write controls", async () => {
    render(React.createElement(AgentControlCenterTab));

    const rowNameCell = screen.getByText("Revenue Strategist");
    const row = rowNameCell.closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLTableRowElement);

    fireEvent.click(await screen.findByRole("button", { name: "Seed" }));
    expect(await screen.findByPlaceholderText("objects_...")).toBeTruthy();

    const bindButton = screen.getByRole("button", { name: "Bind template mapping" }) as HTMLButtonElement;
    expect(bindButton.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText("objects_..."), {
      target: { value: "objects_template_agent_7" },
    });
    fireEvent.change(screen.getByPlaceholderText("Explain why this binding change is required."), {
      target: { value: "Wire catalog seed mapping to clone source template" },
    });
    expect(bindButton.disabled).toBe(false);

    fireEvent.click(bindButton);
    expect(setSeedTemplateBindingMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Write" }));

    await waitFor(() => {
      expect(setSeedTemplateBindingMock).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        datasetVersion: "agp_v1",
        catalogAgentNumber: 7,
        templateAgentId: "objects_template_agent_7",
        reason: "Wire catalog seed mapping to clone source template",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Set template binding for agent #7.")).toBeTruthy();
    });
  });

  it("renders rollout preview diff and gates apply behind explicit confirmation", async () => {
    render(React.createElement(AgentControlCenterTab));

    fireEvent.click(await screen.findByRole("button", { name: /Rollout Actions/i }));
    fireEvent.change(screen.getByDisplayValue("25"), { target: { value: "1" } });
    fireEvent.change(screen.getByDisplayValue("0"), { target: { value: "0" } });
    fireEvent.change(
      screen.getByPlaceholderText("staged_rollout_window_1"),
      { target: { value: "canary_window_1" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview rollout diff" }));

    await waitFor(() => {
      expect(distributeTemplateToOrganizationsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: true,
          reason: "canary_window_1",
        }),
      );
    });

    expect(
      await screen.findByText(/Rollout preview summary/i),
    ).toBeTruthy();
    expect(await screen.findByText("Distribution telemetry")).toBeTruthy();
    expect(await screen.findByText(/completed with errors/i)).toBeTruthy();
    expect((await screen.findAllByText(/rollback/i)).length).toBeGreaterThan(0);
    expect(
      await screen.findByText(/toolProfile \(warn\): support -> sales/i),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Apply rollout (confirm)" }));
    expect(
      await screen.findByText("Confirm Template Rollout"),
    ).toBeTruthy();
    expect(distributeTemplateToOrganizationsMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Confirm Rollout" }));
    await waitFor(() => {
      expect(distributeTemplateToOrganizationsMock).toHaveBeenCalledTimes(2);
    });
    expect(distributeTemplateToOrganizationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dryRun: false,
        reason: "canary_window_1",
        templateVersionId: "objects_template_version_v2",
      }),
    );
  });

  it("sends rollback payload with selected target version only after confirmation", async () => {
    render(React.createElement(AgentControlCenterTab));

    fireEvent.click(await screen.findByRole("button", { name: /Rollout Actions/i }));
    fireEvent.change(screen.getByDisplayValue("25"), { target: { value: "1" } });
    fireEvent.change(screen.getByDisplayValue("0"), { target: { value: "0" } });
    fireEvent.change(
      screen.getByPlaceholderText("staged_rollout_window_1"),
      { target: { value: "rollback_after_incident" } },
    );

    fireEvent.change(screen.getByDisplayValue("Apply rollout"), {
      target: { value: "rollback" },
    });
    fireEvent.change(screen.getByDisplayValue("v2 (published)"), {
      target: { value: "objects_template_version_v1" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview rollout diff" }));
    await waitFor(() => {
      expect(distributeTemplateToOrganizationsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: true,
          templateVersionId: "objects_template_version_v1",
          reason: "rollback_after_incident",
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Rollback (confirm)" }));
    expect(await screen.findByText("Confirm Template Rollout")).toBeTruthy();
    expect(distributeTemplateToOrganizationsMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Confirm Rollback" }));
    await waitFor(() => {
      expect(distributeTemplateToOrganizationsMock).toHaveBeenCalledTimes(2);
    });
    expect(distributeTemplateToOrganizationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dryRun: false,
        templateVersionId: "objects_template_version_v1",
        reason: "rollback_after_incident",
      }),
    );
  });

  it("routes Tool Foundry approve action through submitProposalPromotionDecision", async () => {
    render(React.createElement(AgentControlCenterTab));

    const rowNameCell = screen.getByText("Revenue Strategist");
    const row = rowNameCell.closest("tr");
    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLTableRowElement);

    fireEvent.click(await screen.findByRole("button", { name: "Runtime" }));
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(submitToolFoundryPromotionDecisionMock).toHaveBeenCalledWith({
        sessionId: "sessions_super_admin",
        organizationId: "organizations_super_admin",
        proposalKey: "toolspec:issue_refund_transfer:org_1:session_1",
        decision: "granted",
        reason: "approved_via_agent_control_center",
      });
    });
  });
});
