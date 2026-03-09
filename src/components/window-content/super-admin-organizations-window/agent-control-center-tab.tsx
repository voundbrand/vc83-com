"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { TemplateHubEntryPanel } from "@/components/window-content/agents/template-hub-entry-panel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type DriftStatus = "in_sync" | "docs_drift" | "code_drift" | "registry_drift";
type DrawerTab = "summary" | "tools" | "seed" | "runtime" | "dependencies" | "audit";
type TemplateHubSection = "catalog" | "versions" | "rollout";
type ClonePolicyState = "in_sync" | "overridden" | "stale" | "blocked";
type CloneRiskLevel = "low" | "medium" | "high";
type SeedStatus = "full" | "skeleton" | "missing";

export type SeedStatusOverrideState = {
  seedStatus: SeedStatus;
  reason: string;
  actorUserId: string;
  actorLabel: string;
  updatedAt: number;
};

export type ConfirmAction =
  | {
      type: "add_blocker";
      catalogAgentNumber: number;
      blocker: string;
    }
  | {
      type: "remove_blocker";
      catalogAgentNumber: number;
      blocker: string;
    }
  | {
      type: "apply_seed_override";
      catalogAgentNumber: number;
      seedStatus: SeedStatus;
      reason: string;
    }
  | {
      type: "set_seed_template_binding";
      catalogAgentNumber: number;
      templateAgentId?: string;
      reason: string;
    }
  | {
      type: "set_published";
      catalogAgentNumber: number;
      published: boolean;
      reason: string;
    };

type OverviewResponse = {
  datasetVersion: string;
  datasetVersions: string[];
  expectedAgentCount: number;
  summary: {
    totalAgents: number;
    catalogDone: number;
    seedsFull: number;
    runtimeLive: number;
    toolsMissing: number;
    published: number;
    blockedAgents: number;
  };
  drift: {
    status: DriftStatus;
    docsOutOfSync: boolean;
    registryOutOfSync: boolean;
    codeOutOfSync: boolean;
    reasons: string[];
  };
  filterMetadata: {
    implementationPhases: number[];
  };
};

type AgentListRow = {
  _id: string;
  catalogAgentNumber: number;
  name: string;
  category: string;
  toolProfile: string;
  seedStatus: string;
  runtimeStatus: string;
  published: boolean;
  seedStatusOverride?: SeedStatusOverrideState;
  specialistAccessModes: string[];
  implementationPhase: number;
  blockersCount: number;
  blockers: string[];
  toolCoverageCounts: {
    required: number;
    implemented: number;
    missing: number;
  };
  sourceRefs: {
    catalogDocPath: string;
    matrixDocPath: string;
    seedDocPath: string;
    roadmapDocPath: string;
  };
};

type ListAgentsResponse = {
  total: number;
  nextCursor: string | null;
  agents: AgentListRow[];
};

type ToolRequirementRow = {
  _id: string;
  toolName: string;
  requirementLevel: "required" | "recommended" | "optional";
  implementationStatus: "implemented" | "missing";
  mutability: "read_only" | "mutating";
  source: "registry" | "interview_tools" | "proposed_new";
  integrationDependency?: string;
  modeScope: {
    work: "allow" | "approval_required" | "deny";
    private: "allow" | "approval_required" | "deny";
  };
  notes?: string;
};

type SeedRegistryRow = {
  seedCoverage: "full" | "skeleton" | "missing";
  requiresSoulBuild: boolean;
  requiresSoulBuildReason?: string;
  systemTemplateAgentId?: string;
  templateRole?: string;
  protectedTemplate?: boolean;
  immutableOriginContractMapped: boolean;
  sourcePath: string;
};

type ToolFoundryProposalReviewRow = {
  _id: string;
  organizationId: string;
  proposalKey: string;
  requestedToolName: string;
  status: "pending_review" | "in_review" | "promoted" | "rejected" | "rolled_back";
  lastObservedAt: number;
  sourceRequestTraceKey: string;
  reasonCode: string;
};

type SyncRunRow = {
  _id: string;
  mode: "read_only_audit" | "sync_apply";
  status: "success" | "failed";
  startedAt: number;
  completedAt?: number;
  summary: {
    totalAgents: number;
    catalogDone: number;
    seedsFull: number;
    runtimeLive: number;
    toolsMissing: number;
  };
  drift: {
    docsOutOfSync: boolean;
    registryOutOfSync: boolean;
    codeOutOfSync: boolean;
    reasons: string[];
  };
};

type AgentDetailsResponse = {
  agent: AgentListRow & {
    subtype: string;
    tier: string;
    soulBlend: string;
    soulStatus: string;
    autonomyDefault: string;
    requiredIntegrations: string[];
    channelAffinity: string[];
  };
  tools: ToolRequirementRow[];
  seed: SeedRegistryRow | null;
  recentSyncRuns: SyncRunRow[];
};

type SyncRunsResponse = {
  runs: SyncRunRow[];
};

type TemplateCloneInventoryResponse = {
  generatedAt: number;
  total: number;
  summary: {
    byPolicyState: Record<ClonePolicyState, number>;
    byRisk: Record<CloneRiskLevel, number>;
  };
  filterMetadata: {
    organizations: Array<{
      id: string;
      name: string;
      count: number;
    }>;
    templates: Array<{
      id: string;
      name: string;
      count: number;
    }>;
  };
  rows: Array<{
    organizationId: string;
    organizationName: string;
    templateId: string;
    templateName: string;
    templateVersion: string;
    cloneAgentId: string;
    cloneAgentName: string;
    cloneLifecycleState: string;
    policyState: ClonePolicyState;
    riskLevel: CloneRiskLevel;
    stale: boolean;
    blocked: boolean;
    blockedFields: string[];
    overriddenFields: string[];
    diffCount: number;
  }>;
};

type TemplateRolloutOptionsResponse = {
  generatedAt: number;
  templates: Array<{
    templateId: string;
    templateName: string;
    templateOrganizationId?: string;
    lifecycleStatus: "draft" | "published" | "deprecated";
    publishedVersionId?: string;
    publishedVersionTag?: string;
    versions: Array<{
      templateVersionId: string;
      versionTag: string;
      lifecycleStatus: "draft" | "published" | "deprecated";
      createdAt: number;
      updatedAt: number;
    }>;
  }>;
};

type TemplateDriftDiffRow = {
  field: string;
  policyMode: "locked" | "warn" | "free";
  templateValue: unknown;
  cloneValue: unknown;
};

type TemplateCloneDriftReportResponse = {
  templateId: string;
  templateVersion: string;
  precedenceOrder: string[];
  fields: string[];
  targets: Array<{
    organizationId: string;
    cloneAgentId: string;
    sourceTemplateId: string;
    sourceTemplateVersion: string | null;
    cloneLifecycleState: string;
    policyState: ClonePolicyState;
    stale: boolean;
    blocked: boolean;
    blockedFields: string[];
    overriddenFields: string[];
    diff: TemplateDriftDiffRow[];
  }>;
};

type RolloutConfirmAction = {
  type: "rollout_apply" | "rollout_rollback";
  templateId: string;
  templateName: string;
  templateVersionId: string;
  templateVersionTag: string;
  targetOrganizationIds: string[];
  stageSize: number;
  stageStartIndex: number;
  reason: string;
};

type TemplateLifecycleConfirmAction =
  | {
      type: "publish";
      templateId: string;
      templateName: string;
      templateVersionId: string;
      templateVersionTag: string;
      publishReason?: string;
    }
  | {
      type: "deprecate";
      templateId: string;
      templateName: string;
      templateVersionId: string;
      templateVersionTag: string;
      reason: string;
    };

type RolloutPlanResponse = {
  distributionJobId: string;
  templateId: string;
  templateVersion: string;
  operationKind: "rollout_apply" | "rollout_rollback";
  dryRun: boolean;
  requestedTargetOrganizationIds: string[];
  targetOrganizationIds: string[];
  rolloutWindow: {
    stageStartIndex: number;
    stageSize: number;
    requestedTargetCount: number;
    stagedTargetCount: number;
  };
  summary: {
    plan: {
      creates: number;
      updates: number;
      skips: number;
      blocked: number;
    };
    applied: {
      creates: number;
      updates: number;
      skips: number;
      blocked: number;
    };
  };
  policyGates?: {
    blockedLocked: number;
    blockedWarnConfirmation: number;
    warnConfirmed: number;
    free: number;
  };
  reasonCounts?: {
    plan: Record<string, number>;
    applied: Record<string, number>;
  };
  plan: Array<{
    organizationId: string;
    operation: "create" | "update" | "skip" | "blocked";
    reason: string;
    existingCloneId?: string;
    changedFields: string[];
  }>;
  applied: Array<{
    organizationId: string;
    cloneAgentId?: string;
    operation: "create" | "update" | "skip" | "blocked";
    reason?: string;
  }>;
};

type TemplateDistributionTelemetryResponse = {
  generatedAt: number;
  summary: {
    totalJobs: number;
    byStatus: {
      planned: number;
      completed: number;
      completedWithErrors: number;
    };
    byOperationKind: {
      rolloutApply: number;
      rolloutRollback: number;
    };
    totalAffectedOrgs: {
      requested: number;
      staged: number;
      mutated: number;
      blocked: number;
    };
  };
  rows: Array<{
    _id: string;
    performedAt: number;
    actionType: "template_distribution_plan_generated" | "template_distribution_applied";
    distributionJobId: string;
    templateId: string;
    templateVersion: string;
    operationKind: "rollout_apply" | "rollout_rollback";
    reason: string;
    dryRun: boolean;
    status: "planned" | "completed" | "completed_with_errors";
    affectedOrgCounts: {
      requested: number;
      staged: number;
      mutated: number;
      skipped: number;
      blocked: number;
    };
    summary: {
      plan: {
        creates: number;
        updates: number;
        skips: number;
        blocked: number;
      };
      applied: {
        creates: number;
        updates: number;
        skips: number;
        blocked: number;
      };
    };
    policyGates: {
      blockedLocked: number;
      blockedWarnConfirmation: number;
      warnConfirmed: number;
      free: number;
    };
    reasonCounts: {
      plan: Record<string, number>;
      applied: Record<string, number>;
    };
    rolloutWindow: {
      stageStartIndex: number;
      stageSize: number;
      requestedTargetCount: number;
      stagedTargetCount: number;
    };
  }>;
};

type OrganizationOption = {
  _id: string;
  name: string;
  isActive?: boolean;
};

function normalizeOrganizationOptions(value: unknown): OrganizationOption[] {
  if (Array.isArray(value)) {
    return value as OrganizationOption[];
  }
  if (value && typeof value === "object") {
    const candidate = (value as { organizations?: unknown }).organizations;
    if (Array.isArray(candidate)) {
      return candidate as OrganizationOption[];
    }
  }
  return [];
}

function areSortedStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

const CATEGORY_OPTIONS = [
  "core",
  "legal",
  "finance",
  "health",
  "coaching",
  "agency",
  "trades",
  "ecommerce",
];

const RUNTIME_STATUS_OPTIONS = ["live", "template_only", "not_deployed"];
const SEED_STATUS_OPTIONS: SeedStatus[] = ["full", "skeleton", "missing"];
const TOOL_COVERAGE_OPTIONS = ["complete", "partial", "missing"];
const CLONE_POLICY_STATE_OPTIONS: ClonePolicyState[] = [
  "in_sync",
  "overridden",
  "stale",
  "blocked",
];
const CLONE_RISK_LEVEL_OPTIONS: CloneRiskLevel[] = ["high", "medium", "low"];
const DEFAULT_ROLLOUT_STAGE_SIZE = 25;
const ROLLOUT_ORGANIZATION_PAGE_SIZE = 24;
const DRAWER_TABS: Array<{ id: DrawerTab; label: string }> = [
  { id: "summary", label: "Summary" },
  { id: "tools", label: "Tools" },
  { id: "seed", label: "Seed" },
  { id: "runtime", label: "Runtime" },
  { id: "dependencies", label: "Dependencies" },
  { id: "audit", label: "Audit" },
];

export function formatDateTime(value?: number): string {
  if (!value) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

function driftBadgeTone(status: DriftStatus): { bg: string; border: string; text: string; label: string } {
  switch (status) {
    case "in_sync":
      return {
        bg: "#f0fdf4",
        border: "#15803d",
        text: "#166534",
        label: "In Sync",
      };
    case "docs_drift":
      return {
        bg: "#fff7ed",
        border: "#c2410c",
        text: "#9a3412",
        label: "Docs Drift",
      };
    case "code_drift":
      return {
        bg: "#fee2e2",
        border: "#dc2626",
        text: "#991b1b",
        label: "Code Drift",
      };
    default:
      return {
        bg: "#fef3c7",
        border: "#b45309",
        text: "#92400e",
        label: "Registry Drift",
      };
  }
}

function statusTone(value: string): { color: string; bg: string } {
  if (value === "live" || value === "full" || value === "implemented" || value === "complete") {
    return { color: "#166534", bg: "#f0fdf4" };
  }
  if (value === "template_only" || value === "skeleton" || value === "partial") {
    return { color: "#9a3412", bg: "#fff7ed" };
  }
  if (value === "missing" || value === "not_deployed") {
    return { color: "#991b1b", bg: "#fee2e2" };
  }
  return { color: "var(--window-document-text)", bg: "var(--window-document-bg)" };
}

function compactCell(value: string): string {
  return value.replace(/_/g, " ");
}

function normalizeSeedStatus(value?: string): SeedStatus {
  if (value === "full" || value === "skeleton") {
    return value;
  }
  return "missing";
}

export function buildAgentControlConfirmationMessage(action: ConfirmAction, datasetVersion: string): string {
  if (action.type === "add_blocker") {
    return `Confirm Agent Control write action.\n\nDataset: ${datasetVersion}\nAgent: #${action.catalogAgentNumber}\nOperation: add blocker\nBlocker: ${action.blocker}\nAudit event: agent_catalog.blocker_add`;
  }
  if (action.type === "remove_blocker") {
    return `Confirm Agent Control write action.\n\nDataset: ${datasetVersion}\nAgent: #${action.catalogAgentNumber}\nOperation: remove blocker\nBlocker: ${action.blocker}\nAudit event: agent_catalog.blocker_remove`;
  }
  if (action.type === "set_seed_template_binding") {
    const nextTemplate = action.templateAgentId ?? "<clear>";
    const operation = action.templateAgentId ? "set seed template binding" : "clear seed template binding";
    return `Confirm Agent Control write action.\n\nDataset: ${datasetVersion}\nAgent: #${action.catalogAgentNumber}\nOperation: ${operation}\nTemplate agent id: ${nextTemplate}\nReason: ${action.reason}\nAudit event: agent_catalog.seed_template_binding_set`;
  }
  if (action.type === "set_published") {
    return `Confirm Agent Control write action.\n\nDataset: ${datasetVersion}\nAgent: #${action.catalogAgentNumber}\nOperation: ${action.published ? "publish catalog entry" : "unpublish catalog entry"}\nReason: ${action.reason}\nAudit event: agent_catalog.published_set`;
  }
  return `Confirm Agent Control write action.\n\nDataset: ${datasetVersion}\nAgent: #${action.catalogAgentNumber}\nOperation: apply seed override\nOverride status: ${action.seedStatus}\nReason: ${action.reason}\nAudit event: agent_catalog.seed_override_set\n\nComputed seed status remains read-only.`;
}

export function buildSeedOverrideBadgeTitle(override?: SeedStatusOverrideState): string | null {
  if (!override) {
    return null;
  }
  return `Override by ${override.actorLabel} at ${formatDateTime(override.updatedAt)}`;
}

export function canExecuteConfirmedWrite(args: {
  sessionId: string | null | undefined;
  pendingConfirmAction: ConfirmAction | null;
  isSubmittingWrite: boolean;
}): boolean {
  return Boolean(args.sessionId && args.pendingConfirmAction && !args.isSubmittingWrite);
}

function formatRolloutDiffValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

function parsePositiveIntegerInput(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function parseNonNegativeIntegerInput(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function buildRolloutConfirmationMessage(action: RolloutConfirmAction): string {
  const operation = action.type === "rollout_rollback" ? "rollback staged rollout" : "apply staged rollout";
  return [
    "Confirm template distribution action.",
    "",
    `Operation: ${operation}`,
    `Template: ${action.templateName}`,
    `Version target: ${action.templateVersionTag}`,
    `Stage start: ${action.stageStartIndex}`,
    `Stage size: ${action.stageSize}`,
    `Staged orgs: ${action.targetOrganizationIds.length}`,
    `Reason: ${action.reason}`,
    "Audit event: template_distribution_applied",
  ].join("\n");
}

function buildTemplateLifecycleConfirmationMessage(action: TemplateLifecycleConfirmAction): string {
  if (action.type === "publish") {
    return [
      "Confirm template lifecycle action.",
      "",
      "Operation: publish template version",
      `Template: ${action.templateName}`,
      `Version target: ${action.templateVersionTag}`,
      `Reason: ${action.publishReason || "n/a"}`,
      "Audit event: agent_template.version_published",
    ].join("\n");
  }
  return [
    "Confirm template lifecycle action.",
    "",
    "Operation: deprecate template version",
    `Template: ${action.templateName}`,
    `Version target: ${action.templateVersionTag}`,
    `Reason: ${action.reason}`,
    "Audit event: agent_template.version_deprecated",
  ].join("\n");
}

export function AgentControlCenterTab() {
  const { sessionId, isSuperAdmin } = useAuth();
  const { t } = useNamespaceTranslations("ui.super_admin.agent_control_center");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>,
  ): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

  const [datasetVersion, setDatasetVersion] = useState<string>("agp_v1");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [runtimeStatusFilter, setRuntimeStatusFilter] = useState<string>("");
  const [seedStatusFilter, setSeedStatusFilter] = useState<string>("");
  const [toolCoverageFilter, setToolCoverageFilter] = useState<string>("");
  const [implementationPhaseFilter, setImplementationPhaseFilter] = useState<string>("");
  const [onlyWithBlockers, setOnlyWithBlockers] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [cursor, setCursor] = useState<string>("0");
  const [selectedAgentNumber, setSelectedAgentNumber] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("summary");
  const [auditMessage, setAuditMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [writeMessage, setWriteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  const [isSubmittingWrite, setIsSubmittingWrite] = useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<ConfirmAction | null>(null);
  const [blockerDraft, setBlockerDraft] = useState<string>("");
  const [seedOverrideStatus, setSeedOverrideStatus] = useState<SeedStatus>("full");
  const [seedOverrideReason, setSeedOverrideReason] = useState<string>("");
  const [seedTemplateBindingAgentId, setSeedTemplateBindingAgentId] = useState<string>("");
  const [seedTemplateBindingReason, setSeedTemplateBindingReason] = useState<string>("");
  const [publishReason, setPublishReason] = useState<string>("");
  const [templateHubSection, setTemplateHubSection] = useState<TemplateHubSection>("catalog");
  const [cloneInventoryOrgFilter, setCloneInventoryOrgFilter] = useState<string>("");
  const [cloneInventoryTemplateFilter, setCloneInventoryTemplateFilter] = useState<string>("");
  const [cloneInventoryPolicyStateFilter, setCloneInventoryPolicyStateFilter] = useState<string>("");
  const [cloneInventoryRiskFilter, setCloneInventoryRiskFilter] = useState<string>("");
  const [cloneInventorySearch, setCloneInventorySearch] = useState<string>("");
  const [templateDataRefreshNonce, setTemplateDataRefreshNonce] = useState<number>(0);
  const [selectedLifecycleTemplateId, setSelectedLifecycleTemplateId] = useState<string>("");
  const [selectedLifecycleVersionId, setSelectedLifecycleVersionId] = useState<string>("");
  const [selectedRolloutTemplateId, setSelectedRolloutTemplateId] = useState<string>("");
  const [selectedRolloutVersionId, setSelectedRolloutVersionId] = useState<string>("");
  const [rolloutStageSize, setRolloutStageSize] = useState<string>(String(DEFAULT_ROLLOUT_STAGE_SIZE));
  const [rolloutStageStartIndex, setRolloutStageStartIndex] = useState<string>("0");
  const [rolloutReason, setRolloutReason] = useState<string>("");
  const [rolloutMode, setRolloutMode] = useState<"apply" | "rollback">("apply");
  const [rolloutTargetOrgIds, setRolloutTargetOrgIds] = useState<string[]>([]);
  const [rolloutInlineMessage, setRolloutInlineMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [rolloutOrganizationSearch, setRolloutOrganizationSearch] = useState<string>("");
  const [rolloutOrganizationPage, setRolloutOrganizationPage] = useState<number>(1);
  const [rolloutPreview, setRolloutPreview] = useState<{
    requestedTargetOrganizationIds: string[];
    stagedTargetOrganizationIds: string[];
    drift: TemplateCloneDriftReportResponse | null;
  } | null>(null);
  const [rolloutPreviewRequest, setRolloutPreviewRequest] = useState<{
    templateId: string;
    templateVersionId: string;
    targetOrganizationIds: string[];
  } | null>(null);
  const [isLoadingRolloutPreview, setIsLoadingRolloutPreview] = useState<boolean>(false);
  const [pendingRolloutConfirmAction, setPendingRolloutConfirmAction] = useState<RolloutConfirmAction | null>(null);
  const [lastRolloutResult, setLastRolloutResult] = useState<RolloutPlanResponse | null>(null);
  const [snapshotVersionTagDraft, setSnapshotVersionTagDraft] = useState<string>("");
  const [snapshotSummaryDraft, setSnapshotSummaryDraft] = useState<string>("");
  const [publishVersionReasonDraft, setPublishVersionReasonDraft] = useState<string>("");
  const [deprecateVersionReasonDraft, setDeprecateVersionReasonDraft] = useState<string>("");
  const [templateLifecycleMessage, setTemplateLifecycleMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingTemplateLifecycleConfirmAction, setPendingTemplateLifecycleConfirmAction] = useState<TemplateLifecycleConfirmAction | null>(null);

  const triggerCatalogSync = useMutation(api.ai.agentCatalogAdmin.triggerCatalogSync);
  const setAgentBlocker = useMutation(api.ai.agentCatalogAdmin.setAgentBlocker);
  const setSeedStatusOverride = useMutation(api.ai.agentCatalogAdmin.setSeedStatusOverride);
  const setSeedTemplateBinding = useMutation(api.ai.agentCatalogAdmin.setSeedTemplateBinding);
  const setCatalogPublishedStatus = useMutation(api.ai.agentCatalogAdmin.setCatalogPublishedStatus);
  const backfillCatalogPublishedFlags = useMutation(api.ai.agentCatalogAdmin.backfillCatalogPublishedFlags);
  const distributeTemplateToOrganizations = useMutation(
    api.agentOntology.distributeAgentTemplateToOrganizations,
  );
  const submitToolFoundryPromotionDecision = useMutation(
    api.ai.toolFoundry.proposalBacklog.submitProposalPromotionDecision,
  );
  const createAgentTemplateVersionSnapshot = useMutation(
    api.agentOntology.createAgentTemplateVersionSnapshot,
  );
  const publishAgentTemplateVersion = useMutation(
    api.agentOntology.publishAgentTemplateVersion,
  );
  const deprecateAgentTemplateLifecycle = useMutation(
    api.agentOntology.deprecateAgentTemplateLifecycle,
  );

  const overview = useQuery(
    api.ai.agentCatalogAdmin.getOverview,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          datasetVersion,
        }
      : "skip",
  ) as OverviewResponse | undefined;

  const listAgents = useQuery(
    api.ai.agentCatalogAdmin.listAgents,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          datasetVersion,
          filters: {
            category: categoryFilter || undefined,
            runtimeStatus: runtimeStatusFilter || undefined,
            seedStatus: seedStatusFilter || undefined,
            toolCoverageStatus: toolCoverageFilter || undefined,
            implementationPhase: implementationPhaseFilter
              ? Number.parseInt(implementationPhaseFilter, 10)
              : undefined,
            onlyWithBlockers: onlyWithBlockers || undefined,
            search: search.trim() || undefined,
          },
          pagination: {
            cursor,
            limit: 50,
          },
        }
      : "skip",
  ) as ListAgentsResponse | undefined;

  const syncRuns = useQuery(
    api.ai.agentCatalogAdmin.listSyncRuns,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          datasetVersion,
          limit: 10,
        }
      : "skip",
  ) as SyncRunsResponse | undefined;

  const agentDetails = useQuery(
    api.ai.agentCatalogAdmin.getAgentDetails,
    sessionId && isSuperAdmin && selectedAgentNumber !== null
      ? {
          sessionId,
          datasetVersion,
          catalogAgentNumber: selectedAgentNumber,
        }
      : "skip",
  ) as AgentDetailsResponse | null | undefined;

  const toolFoundryProposals = useQuery(
    api.ai.toolFoundry.proposalBacklog.listPendingProposalsForReview,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          limit: 20,
        }
      : "skip",
  ) as ToolFoundryProposalReviewRow[] | undefined;

  const cloneInventory = useQuery(
    api.agentOntology.listTemplateCloneInventory,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          filters: {
            organizationId: cloneInventoryOrgFilter || undefined,
            templateId: cloneInventoryTemplateFilter || undefined,
            policyState: cloneInventoryPolicyStateFilter || undefined,
            riskLevel: cloneInventoryRiskFilter || undefined,
            search: cloneInventorySearch.trim() || undefined,
          },
          limit: 300,
        }
      : "skip",
  ) as TemplateCloneInventoryResponse | undefined;
  const templateRolloutOptions = useQuery(
    api.agentOntology.listTemplateRolloutOptions,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          refreshNonce: templateDataRefreshNonce,
        }
      : "skip",
  ) as TemplateRolloutOptionsResponse | undefined;
  const templateLifecycleOptions = useQuery(
    api.agentOntology.listTemplateLifecycleOptions,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          refreshNonce: templateDataRefreshNonce,
        }
      : "skip",
  ) as TemplateRolloutOptionsResponse | undefined;
  const rolloutDriftPreview = useQuery(
    api.agentOntology.getTemplateCloneDriftReport,
    sessionId && isSuperAdmin && rolloutPreviewRequest
      ? {
          sessionId,
          templateId: rolloutPreviewRequest.templateId,
          templateVersionId: rolloutPreviewRequest.templateVersionId,
          targetOrganizationIds: rolloutPreviewRequest.targetOrganizationIds,
        }
      : "skip",
  ) as TemplateCloneDriftReportResponse | undefined;
  const distributionTelemetry = useQuery(
    api.agentOntology.listTemplateDistributionTelemetry,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          templateId: selectedRolloutTemplateId || undefined,
          limit: 20,
          refreshNonce: templateDataRefreshNonce,
        }
      : "skip",
  ) as TemplateDistributionTelemetryResponse | undefined;
  const allOrganizations = useQuery(
    api.organizations.listAll,
    sessionId && isSuperAdmin
      ? {
          sessionId,
        }
      : "skip",
  ) as unknown;
  const organizationOptions = useMemo(
    () => normalizeOrganizationOptions(allOrganizations),
    [allOrganizations],
  );

  useEffect(() => {
    if (!overview) {
      return;
    }
    if (!overview.datasetVersions.includes(datasetVersion) && overview.datasetVersions.length > 0) {
      setDatasetVersion(overview.datasetVersions[0]);
    }
  }, [datasetVersion, overview]);

  useEffect(() => {
    setCursor("0");
  }, [
    datasetVersion,
    categoryFilter,
    runtimeStatusFilter,
    seedStatusFilter,
    toolCoverageFilter,
    implementationPhaseFilter,
    onlyWithBlockers,
    search,
  ]);

  useEffect(() => {
    setSelectedAgentNumber(null);
    setDrawerTab("summary");
    setAuditMessage(null);
    setWriteMessage(null);
    setPendingConfirmAction(null);
    setBlockerDraft("");
    setSeedOverrideReason("");
    setSeedTemplateBindingAgentId("");
    setSeedTemplateBindingReason("");
    setPublishReason("");
    setTemplateHubSection("catalog");
    setCloneInventoryOrgFilter("");
    setCloneInventoryTemplateFilter("");
    setCloneInventoryPolicyStateFilter("");
    setCloneInventoryRiskFilter("");
    setCloneInventorySearch("");
    setSelectedLifecycleTemplateId("");
    setSelectedLifecycleVersionId("");
    setSelectedRolloutTemplateId("");
    setSelectedRolloutVersionId("");
    setRolloutStageSize(String(DEFAULT_ROLLOUT_STAGE_SIZE));
    setRolloutStageStartIndex("0");
    setRolloutReason("");
    setRolloutMode("apply");
    setRolloutTargetOrgIds([]);
    setRolloutInlineMessage(null);
    setRolloutOrganizationSearch("");
    setRolloutOrganizationPage(1);
    setRolloutPreview(null);
    setRolloutPreviewRequest(null);
    setPendingRolloutConfirmAction(null);
    setLastRolloutResult(null);
    setSnapshotVersionTagDraft("");
    setSnapshotSummaryDraft("");
    setPublishVersionReasonDraft("");
    setDeprecateVersionReasonDraft("");
    setTemplateLifecycleMessage(null);
    setPendingTemplateLifecycleConfirmAction(null);
  }, [datasetVersion]);

  useEffect(() => {
    if (!agentDetails) {
      return;
    }
    setBlockerDraft("");
    setSeedOverrideStatus(
      normalizeSeedStatus(
        agentDetails.agent.seedStatusOverride?.seedStatus ?? agentDetails.agent.seedStatus,
      ),
    );
    setSeedOverrideReason("");
    setSeedTemplateBindingAgentId(agentDetails.seed?.systemTemplateAgentId ?? "");
    setSeedTemplateBindingReason("");
    setPublishReason("");
  }, [agentDetails]);

  useEffect(() => {
    if (!templateLifecycleOptions) {
      return;
    }
    if (
      selectedLifecycleTemplateId &&
      templateLifecycleOptions.templates.some(
        (template) => template.templateId === selectedLifecycleTemplateId,
      )
    ) {
      return;
    }
    const firstTemplateId = templateLifecycleOptions.templates[0]?.templateId ?? "";
    setSelectedLifecycleTemplateId(firstTemplateId);
  }, [templateLifecycleOptions, selectedLifecycleTemplateId]);

  useEffect(() => {
    const selectedTemplate = templateLifecycleOptions?.templates.find(
      (template) => template.templateId === selectedLifecycleTemplateId,
    );
    if (!selectedTemplate) {
      setSelectedLifecycleVersionId("");
      return;
    }
    const publishedVersionId = selectedTemplate.publishedVersionId;
    const fallbackVersionId = selectedTemplate.versions[0]?.templateVersionId ?? "";
    const nextVersionId = publishedVersionId || fallbackVersionId;
    if (
      selectedLifecycleVersionId &&
      selectedTemplate.versions.some((version) => version.templateVersionId === selectedLifecycleVersionId)
    ) {
      return;
    }
    setSelectedLifecycleVersionId(nextVersionId);
  }, [templateLifecycleOptions, selectedLifecycleTemplateId, selectedLifecycleVersionId]);

  useEffect(() => {
    if (!templateRolloutOptions) {
      return;
    }
    if (
      selectedRolloutTemplateId &&
      templateRolloutOptions.templates.some(
        (template) => template.templateId === selectedRolloutTemplateId,
      )
    ) {
      return;
    }
    const firstTemplateId = templateRolloutOptions.templates[0]?.templateId ?? "";
    setSelectedRolloutTemplateId(firstTemplateId);
  }, [templateRolloutOptions, selectedRolloutTemplateId]);

  useEffect(() => {
    const selectedTemplate = templateRolloutOptions?.templates.find(
      (template) => template.templateId === selectedRolloutTemplateId,
    );
    if (!selectedTemplate) {
      setSelectedRolloutVersionId("");
      return;
    }
    const publishedVersionId = selectedTemplate.publishedVersionId;
    const fallbackVersionId = selectedTemplate.versions[0]?.templateVersionId ?? "";
    const nextVersionId = publishedVersionId || fallbackVersionId;
    if (
      selectedRolloutVersionId &&
      selectedTemplate.versions.some((version) => version.templateVersionId === selectedRolloutVersionId)
    ) {
      return;
    }
    setSelectedRolloutVersionId(nextVersionId);
  }, [templateRolloutOptions, selectedRolloutTemplateId, selectedRolloutVersionId]);

  useEffect(() => {
    const selectedTemplateOwnerOrgIdRaw = templateRolloutOptions?.templates.find(
      (template) => template.templateId === selectedRolloutTemplateId,
    )?.templateOrganizationId;
    const selectedTemplateOwnerOrgId =
      typeof selectedTemplateOwnerOrgIdRaw === "string" && selectedTemplateOwnerOrgIdRaw.trim().length > 0
        ? selectedTemplateOwnerOrgIdRaw.trim()
        : undefined;
    const cloneScopedOrgIds = Array.from(
      new Set(
        (cloneInventory?.rows ?? [])
          .filter((row) => !selectedRolloutTemplateId || row.templateId === selectedRolloutTemplateId)
          .map((row) => row.organizationId),
      ),
    );
    const activeOrganizationIds = Array.from(
      new Set(
        organizationOptions
          .filter(
            (organization) =>
              organization.isActive !== false &&
              String(organization._id) !== selectedTemplateOwnerOrgId,
          )
          .map((organization) => String(organization._id)),
      ),
    );
    const availableOrgIds = new Set(
      activeOrganizationIds.length > 0 ? activeOrganizationIds : cloneScopedOrgIds,
    );
    setRolloutTargetOrgIds((current) => {
      const filtered = current.filter((organizationId) => availableOrgIds.has(organizationId));
      if (filtered.length > 0) {
        if (areSortedStringArraysEqual(filtered, current)) {
          return current;
        }
        return filtered;
      }
      if (cloneScopedOrgIds.length > 0) {
        const sortedDefaults = cloneScopedOrgIds.sort((left, right) => left.localeCompare(right));
        if (areSortedStringArraysEqual(sortedDefaults, current)) {
          return current;
        }
        return sortedDefaults;
      }
      if (current.length === 0) {
        return current;
      }
      return [];
    });
  }, [cloneInventory, selectedRolloutTemplateId, organizationOptions, templateRolloutOptions]);

  useEffect(() => {
    if (!rolloutPreview || !rolloutDriftPreview) {
      return;
    }
    setRolloutPreview((current) => {
      if (!current) {
        return current;
      }
      if (current.drift === rolloutDriftPreview) {
        return current;
      }
      return {
        ...current,
        drift: rolloutDriftPreview,
      };
    });
  }, [rolloutPreview, rolloutDriftPreview]);

  const driftTone = driftBadgeTone(overview?.drift.status ?? "registry_drift");
  const latestSyncCompletedAt = syncRuns?.runs?.[0]?.completedAt;
  const selectedLifecycleTemplate = templateLifecycleOptions?.templates.find(
    (template) => template.templateId === selectedLifecycleTemplateId,
  );
  const selectedLifecycleVersion = selectedLifecycleTemplate?.versions.find(
    (version) => version.templateVersionId === selectedLifecycleVersionId,
  );
  const selectedRolloutTemplate = templateRolloutOptions?.templates.find(
    (template) => template.templateId === selectedRolloutTemplateId,
  );
  const selectedRolloutTemplateOwnerOrgId =
    typeof selectedRolloutTemplate?.templateOrganizationId === "string" &&
    selectedRolloutTemplate.templateOrganizationId.trim().length > 0
      ? selectedRolloutTemplate.templateOrganizationId.trim()
      : undefined;
  const selectedRolloutVersion = selectedRolloutTemplate?.versions.find(
    (version) => version.templateVersionId === selectedRolloutVersionId,
  );
  const rolloutStageSizeValue = parsePositiveIntegerInput(
    rolloutStageSize,
    DEFAULT_ROLLOUT_STAGE_SIZE,
  );
  const rolloutStageStartIndexValue = parseNonNegativeIntegerInput(
    rolloutStageStartIndex,
    0,
  );
  const templateScopedInventoryRows = (cloneInventory?.rows ?? []).filter(
    (row) => !selectedRolloutTemplateId || row.templateId === selectedRolloutTemplateId,
  );
  const cloneBackedTemplateScopedOrgIds = Array.from(
    new Set(templateScopedInventoryRows.map((row) => row.organizationId)),
  ).sort((left, right) => left.localeCompare(right));
  const cloneBackedOrgIdSet = new Set(cloneBackedTemplateScopedOrgIds);
  const rolloutOrganizationOptions = organizationOptions
    .filter(
      (organization) =>
        organization.isActive !== false &&
        String(organization._id) !== selectedRolloutTemplateOwnerOrgId,
    )
    .map((organization) => {
      const id = String(organization._id);
      return {
        id,
        name: organization.name || id,
        hasClone: cloneBackedOrgIdSet.has(id),
      };
    })
    .sort((left, right) => {
      const nameSort = left.name.localeCompare(right.name);
      if (nameSort !== 0) {
        return nameSort;
      }
      return left.id.localeCompare(right.id);
    });
  const availableRolloutOrgIds = rolloutOrganizationOptions.map((organization) => organization.id);
  const rolloutOrganizationNameById = new Map(
    rolloutOrganizationOptions.map((organization) => [organization.id, organization.name]),
  );
  const plannedRolloutRows = lastRolloutResult?.plan ?? [];
  const driftTargetByOrganizationId = new Map(
    (rolloutPreview?.drift?.targets ?? []).map((target) => [target.organizationId, target]),
  );
  const normalizedRolloutOrganizationSearch = rolloutOrganizationSearch.trim().toLowerCase();
  const filteredRolloutOrganizationOptions = rolloutOrganizationOptions.filter((organization) => {
    if (!normalizedRolloutOrganizationSearch) {
      return true;
    }
    return (
      organization.name.toLowerCase().includes(normalizedRolloutOrganizationSearch) ||
      organization.id.toLowerCase().includes(normalizedRolloutOrganizationSearch)
    );
  });
  const rolloutOrganizationTotalPages = Math.max(
    1,
    Math.ceil(filteredRolloutOrganizationOptions.length / ROLLOUT_ORGANIZATION_PAGE_SIZE),
  );
  const boundedRolloutOrganizationPage = Math.min(
    Math.max(1, rolloutOrganizationPage),
    rolloutOrganizationTotalPages,
  );
  const rolloutOrganizationPageStart =
    (boundedRolloutOrganizationPage - 1) * ROLLOUT_ORGANIZATION_PAGE_SIZE;
  const pagedRolloutOrganizationOptions = filteredRolloutOrganizationOptions.slice(
    rolloutOrganizationPageStart,
    rolloutOrganizationPageStart + ROLLOUT_ORGANIZATION_PAGE_SIZE,
  );
  useEffect(() => {
    if (rolloutOrganizationPage !== boundedRolloutOrganizationPage) {
      setRolloutOrganizationPage(boundedRolloutOrganizationPage);
    }
  }, [rolloutOrganizationPage, boundedRolloutOrganizationPage]);
  const defaultRolloutTargetOrgIds = cloneBackedTemplateScopedOrgIds;
  const effectiveRolloutTargetOrgIds =
    rolloutTargetOrgIds.length > 0 ? rolloutTargetOrgIds : defaultRolloutTargetOrgIds;
  const stagedRolloutTargetOrgIds = effectiveRolloutTargetOrgIds
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .slice(
      rolloutStageStartIndexValue,
      rolloutStageStartIndexValue + rolloutStageSizeValue,
    );
  const hasRolloutTemplates = (templateRolloutOptions?.templates?.length ?? 0) > 0;
  const hasLifecycleTemplates = (templateLifecycleOptions?.templates?.length ?? 0) > 0;
  const hasSelectedTemplateVersions = (selectedRolloutTemplate?.versions?.length ?? 0) > 0;
  const rolloutReadinessIssue = !hasRolloutTemplates
    ? "No templates are available for rollout options yet."
    : !selectedRolloutTemplate
      ? "Select a template before generating a rollout preview."
      : !hasSelectedTemplateVersions
        ? "Selected template has no version snapshots yet. Create/publish a version first."
        : effectiveRolloutTargetOrgIds.length === 0
          ? "No target organizations currently have clones for the selected template."
          : null;
  const rolloutConfirmIssue = rolloutReadinessIssue
    ? rolloutReadinessIssue
    : !selectedRolloutTemplate || !selectedRolloutVersion
      ? "Select a template and target version before apply or rollback."
      : !rolloutPreview || rolloutPreview.stagedTargetOrganizationIds.length === 0
        ? "Generate rollout preview first. Apply and rollback are confirmation-gated after preview."
        : rolloutReason.trim().length === 0
          ? "Reason is required before apply or rollback."
          : null;
  const templateLifecycleVersions = selectedLifecycleTemplate?.versions ?? [];
  const hasTemplateLifecycleVersions = templateLifecycleVersions.length > 0;
  const fallbackPublishableVersion = templateLifecycleVersions.find(
    (version) => version.lifecycleStatus === "draft",
  );
  const selectedOrPublishableVersion = selectedLifecycleVersion ?? fallbackPublishableVersion ?? null;
  const createSnapshotDisabledReason = !sessionId
    ? "Super admin session is required."
    : !selectedLifecycleTemplate
      ? "Select a template first."
      : isSubmittingWrite
        ? "Wait for current write operation to complete."
        : null;
  const publishDisabledReason = !sessionId
    ? "Super admin session is required."
    : !selectedLifecycleTemplate
      ? "Select a template first."
      : !hasTemplateLifecycleVersions
        ? "No versions created yet."
        : !selectedOrPublishableVersion
          ? "No publishable version available."
          : selectedOrPublishableVersion.lifecycleStatus !== "draft"
            ? "Only draft versions are publishable."
            : isSubmittingWrite
              ? "Wait for current write operation to complete."
              : null;
  const deprecateDisabledReason = !sessionId
    ? "Super admin session is required."
    : !selectedLifecycleTemplate
      ? "Select a template first."
      : !selectedLifecycleVersion
        ? "Select a version first."
        : selectedLifecycleVersion.lifecycleStatus !== "published"
          ? "Only published versions can be deprecated."
          : deprecateVersionReasonDraft.trim().length === 0
            ? "Deprecation reason is required."
            : isSubmittingWrite
              ? "Wait for current write operation to complete."
              : null;

  const handleAudit = async () => {
    if (!sessionId || isRunningAudit) {
      return;
    }

    setIsRunningAudit(true);
    setAuditMessage(null);
    try {
      const result = await triggerCatalogSync({
        sessionId,
        datasetVersion,
        mode: "read_only_audit",
      });
      const statusLabel = typeof result?.status === "string" ? result.status : "in_sync";
      setAuditMessage({
        type: "success",
        text: `Audit completed (${statusLabel}).`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Audit failed.";
      setAuditMessage({ type: "error", text: message });
    } finally {
      setIsRunningAudit(false);
    }
  };

  const handlePublishedBackfill = async () => {
    if (!sessionId || isSubmittingWrite) {
      return;
    }
    setIsSubmittingWrite(true);
    setWriteMessage(null);
    try {
      const result = await backfillCatalogPublishedFlags({
        sessionId,
        datasetVersion,
        dryRun: false,
      });
      const updatedCount =
        typeof result?.updatedCount === "number" ? result.updatedCount : 0;
      setWriteMessage({
        type: "success",
        text: `Published-flag backfill completed (${updatedCount} rows updated).`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Published-flag backfill failed.";
      setWriteMessage({ type: "error", text: message });
    } finally {
      setIsSubmittingWrite(false);
    }
  };

  const handleToolFoundryDecision = async (proposal: ToolFoundryProposalReviewRow, decision: "granted" | "denied") => {
    if (!sessionId || isSubmittingWrite) {
      return;
    }
    setIsSubmittingWrite(true);
    setWriteMessage(null);
    try {
      await submitToolFoundryPromotionDecision({
        sessionId,
        organizationId: proposal.organizationId as any,
        proposalKey: proposal.proposalKey,
        decision,
        reason:
          decision === "granted"
            ? "approved_via_agent_control_center"
            : "denied_via_agent_control_center",
      });
      setWriteMessage({
        type: "success",
        text:
          decision === "granted"
            ? `Approved Tool Foundry proposal ${proposal.proposalKey}.`
            : `Rejected Tool Foundry proposal ${proposal.proposalKey}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool Foundry decision failed.";
      setWriteMessage({ type: "error", text: message });
    } finally {
      setIsSubmittingWrite(false);
    }
  };

  const clearTemplateLifecycleDerivedState = () => {
    setRolloutPreview(null);
    setRolloutPreviewRequest(null);
    setLastRolloutResult(null);
  };

  const triggerTemplateLifecycleRefresh = () => {
    setTemplateDataRefreshNonce((current) => current + 1);
    clearTemplateLifecycleDerivedState();
  };

  const handleCreateSnapshot = async () => {
    if (!sessionId || !selectedLifecycleTemplate || isSubmittingWrite) {
      setTemplateLifecycleMessage({
        type: "error",
        text: createSnapshotDisabledReason || "Snapshot creation is currently unavailable.",
      });
      return;
    }
    setIsSubmittingWrite(true);
    setTemplateLifecycleMessage(null);
    try {
      const result = await createAgentTemplateVersionSnapshot({
        sessionId,
        templateId: selectedLifecycleTemplate.templateId as any,
        versionTag: snapshotVersionTagDraft.trim() || undefined,
        summary: snapshotSummaryDraft.trim() || undefined,
      });
      triggerTemplateLifecycleRefresh();
      setSelectedLifecycleVersionId(String(result.templateVersionId));
      setSnapshotVersionTagDraft("");
      setSnapshotSummaryDraft("");
      setTemplateLifecycleMessage({
        type: "success",
        text: `Created snapshot ${result.versionTag}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create version snapshot.";
      setTemplateLifecycleMessage({ type: "error", text: message });
    } finally {
      setIsSubmittingWrite(false);
    }
  };

  const handleRequestPublishVersion = () => {
    if (publishDisabledReason || !selectedLifecycleTemplate || !selectedOrPublishableVersion) {
      setTemplateLifecycleMessage({
        type: "error",
        text: publishDisabledReason || "Publish is currently unavailable.",
      });
      return;
    }
    setPendingTemplateLifecycleConfirmAction({
      type: "publish",
      templateId: selectedLifecycleTemplate.templateId,
      templateName: selectedLifecycleTemplate.templateName,
      templateVersionId: selectedOrPublishableVersion.templateVersionId,
      templateVersionTag: selectedOrPublishableVersion.versionTag,
      publishReason: publishVersionReasonDraft.trim() || undefined,
    });
  };

  const handleRequestDeprecateVersion = () => {
    if (deprecateDisabledReason || !selectedLifecycleTemplate || !selectedLifecycleVersion) {
      setTemplateLifecycleMessage({
        type: "error",
        text: deprecateDisabledReason || "Deprecation is currently unavailable.",
      });
      return;
    }
    setPendingTemplateLifecycleConfirmAction({
      type: "deprecate",
      templateId: selectedLifecycleTemplate.templateId,
      templateName: selectedLifecycleTemplate.templateName,
      templateVersionId: selectedLifecycleVersion.templateVersionId,
      templateVersionTag: selectedLifecycleVersion.versionTag,
      reason: deprecateVersionReasonDraft.trim(),
    });
  };

  const handleConfirmedTemplateLifecycleAction = async () => {
    if (!sessionId || !pendingTemplateLifecycleConfirmAction || isSubmittingWrite) {
      return;
    }
    setIsSubmittingWrite(true);
    setTemplateLifecycleMessage(null);
    try {
      const action = pendingTemplateLifecycleConfirmAction;
      if (action.type === "publish") {
        await publishAgentTemplateVersion({
          sessionId,
          templateId: action.templateId as any,
          templateVersionId: action.templateVersionId as any,
          publishReason: action.publishReason,
        });
        setSelectedLifecycleVersionId(action.templateVersionId);
        setPublishVersionReasonDraft("");
        setTemplateLifecycleMessage({
          type: "success",
          text: `Published ${action.templateVersionTag}.`,
        });
      } else {
        await deprecateAgentTemplateLifecycle({
          sessionId,
          templateId: action.templateId as any,
          target: "version",
          templateVersionId: action.templateVersionId as any,
          reason: action.reason,
        });
        setDeprecateVersionReasonDraft("");
        setTemplateLifecycleMessage({
          type: "success",
          text: `Deprecated ${action.templateVersionTag}.`,
        });
      }
      triggerTemplateLifecycleRefresh();
      setPendingTemplateLifecycleConfirmAction(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Template lifecycle action failed.";
      setTemplateLifecycleMessage({ type: "error", text: message });
    } finally {
      setIsSubmittingWrite(false);
    }
  };

  const handleRolloutPreview = async () => {
    if (!sessionId || !selectedRolloutTemplate || !selectedRolloutVersion) {
      setWriteMessage({
        type: "error",
        text: "Select a template and target version before generating rollout preview.",
      });
      return;
    }
    if (effectiveRolloutTargetOrgIds.length === 0) {
      setWriteMessage({
        type: "error",
        text: "No rollout target organizations available for selected template.",
      });
      return;
    }
    setIsLoadingRolloutPreview(true);
    setWriteMessage(null);
    setRolloutInlineMessage({
      type: "info",
      text: "Generating rollout preview...",
    });
    try {
      const dryRunPlan = (await distributeTemplateToOrganizations({
        sessionId,
        templateId: selectedRolloutTemplate.templateId,
        templateVersionId: selectedRolloutVersion.templateVersionId,
        operationKind: rolloutMode === "rollback" ? "rollout_rollback" : "rollout_apply",
        targetOrganizationIds: effectiveRolloutTargetOrgIds as any,
        stagedRollout: {
          stageSize: rolloutStageSizeValue,
          stageStartIndex: rolloutStageStartIndexValue,
        },
        dryRun: true,
        reason:
          rolloutReason.trim() ||
          (rolloutMode === "rollback"
            ? "template_distribution_rollback_preview"
            : "template_distribution_rollout_preview"),
      })) as RolloutPlanResponse;
      setRolloutPreview({
        requestedTargetOrganizationIds: dryRunPlan.requestedTargetOrganizationIds,
        stagedTargetOrganizationIds: dryRunPlan.targetOrganizationIds,
        drift: null,
      });
      setRolloutPreviewRequest({
        templateId: selectedRolloutTemplate.templateId,
        templateVersionId: selectedRolloutVersion.templateVersionId,
        targetOrganizationIds: dryRunPlan.targetOrganizationIds,
      });
      setLastRolloutResult(dryRunPlan);
      setWriteMessage({
        type: "success",
        text: `Rollout preview ready (${dryRunPlan.targetOrganizationIds.length} staged orgs, job ${dryRunPlan.distributionJobId}).`,
      });
      setRolloutInlineMessage({
        type: "success",
        text: `Preview ready. ${dryRunPlan.targetOrganizationIds.length} organizations staged.`,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate rollout preview.";
      setWriteMessage({ type: "error", text: message });
      setRolloutInlineMessage({
        type: "error",
        text: `Preview failed: ${message}`,
      });
    } finally {
      setIsLoadingRolloutPreview(false);
    }
  };

  const handleRequestRolloutConfirm = () => {
    if (!selectedRolloutTemplate || !selectedRolloutVersion) {
      const message = "Select a template and target version before apply or rollback.";
      setWriteMessage({
        type: "error",
        text: message,
      });
      setRolloutInlineMessage({ type: "error", text: message });
      return;
    }
    if (!rolloutPreview || rolloutPreview.stagedTargetOrganizationIds.length === 0) {
      const message = "Generate rollout preview first. Apply and rollback are confirmation-gated after preview.";
      setWriteMessage({
        type: "error",
        text: message,
      });
      setRolloutInlineMessage({ type: "error", text: message });
      return;
    }
    const reason = rolloutReason.trim();
    if (!reason) {
      const message = "Reason is required before apply or rollback.";
      setWriteMessage({
        type: "error",
        text: message,
      });
      setRolloutInlineMessage({ type: "error", text: message });
      return;
    }
    setPendingRolloutConfirmAction({
      type: rolloutMode === "rollback" ? "rollout_rollback" : "rollout_apply",
      templateId: selectedRolloutTemplate.templateId,
      templateName: selectedRolloutTemplate.templateName,
      templateVersionId: selectedRolloutVersion.templateVersionId,
      templateVersionTag: selectedRolloutVersion.versionTag,
      targetOrganizationIds: rolloutPreview.stagedTargetOrganizationIds,
      stageSize: rolloutStageSizeValue,
      stageStartIndex: rolloutStageStartIndexValue,
      reason,
    });
    setRolloutInlineMessage({
      type: "info",
      text: "Confirmation required. Use Confirm Rollout to execute.",
    });
  };

  const handleConfirmedRollout = async () => {
    if (!sessionId || !pendingRolloutConfirmAction || isSubmittingWrite) {
      return;
    }
    setIsSubmittingWrite(true);
    setWriteMessage(null);
    setRolloutInlineMessage({
      type: "info",
      text: "Executing rollout...",
    });
    try {
      const action = pendingRolloutConfirmAction;
      const applyResult = (await distributeTemplateToOrganizations({
        sessionId,
        templateId: action.templateId,
        templateVersionId: action.templateVersionId as any,
        operationKind: action.type === "rollout_rollback" ? "rollout_rollback" : "rollout_apply",
        targetOrganizationIds: action.targetOrganizationIds as any,
        stagedRollout: {
          stageSize: action.stageSize,
          stageStartIndex: 0,
        },
        dryRun: false,
        reason: action.reason,
      })) as RolloutPlanResponse;
      setLastRolloutResult(applyResult);
      setPendingRolloutConfirmAction(null);
      setWriteMessage({
        type: "success",
        text:
          action.type === "rollout_rollback"
            ? `Rollback applied (${applyResult.summary.applied.creates + applyResult.summary.applied.updates} mutations, job ${applyResult.distributionJobId}).`
            : `Rollout applied (${applyResult.summary.applied.creates + applyResult.summary.applied.updates} mutations, job ${applyResult.distributionJobId}).`,
      });
      setRolloutInlineMessage({
        type: "success",
        text:
          action.type === "rollout_rollback"
            ? `Rollback completed. Job ${applyResult.distributionJobId}.`
            : `Rollout completed. Job ${applyResult.distributionJobId}.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Rollout execution failed.";
      setWriteMessage({ type: "error", text: message });
      setRolloutInlineMessage({
        type: "error",
        text: `Rollout failed: ${message}`,
      });
    } finally {
      setIsSubmittingWrite(false);
    }
  };

  const handleConfirmedWrite = async () => {
    if (!canExecuteConfirmedWrite({ sessionId, pendingConfirmAction, isSubmittingWrite })) {
      return;
    }
    if (!pendingConfirmAction) {
      return;
    }
    const action = pendingConfirmAction;

    setIsSubmittingWrite(true);
    setWriteMessage(null);
    try {
      if (action.type === "add_blocker") {
        await setAgentBlocker({
          sessionId,
          datasetVersion,
          catalogAgentNumber: action.catalogAgentNumber,
          blocker: action.blocker,
          action: "add",
        });
        setBlockerDraft("");
        setWriteMessage({
          type: "success",
          text: `Added blocker for agent #${action.catalogAgentNumber}.`,
        });
      } else if (action.type === "remove_blocker") {
        await setAgentBlocker({
          sessionId,
          datasetVersion,
          catalogAgentNumber: action.catalogAgentNumber,
          blocker: action.blocker,
          action: "remove",
        });
        setWriteMessage({
          type: "success",
          text: `Removed blocker for agent #${action.catalogAgentNumber}.`,
        });
      } else if (action.type === "set_seed_template_binding") {
        await setSeedTemplateBinding({
          sessionId,
          datasetVersion,
          catalogAgentNumber: action.catalogAgentNumber,
          templateAgentId: action.templateAgentId || undefined,
          reason: action.reason,
        });
        setSeedTemplateBindingReason("");
        if (action.templateAgentId) {
          setSeedTemplateBindingAgentId(action.templateAgentId);
        } else {
          setSeedTemplateBindingAgentId("");
        }
        setWriteMessage({
          type: "success",
          text: action.templateAgentId
            ? `Set template binding for agent #${action.catalogAgentNumber}.`
            : `Cleared template binding for agent #${action.catalogAgentNumber}.`,
        });
      } else if (action.type === "set_published") {
        await setCatalogPublishedStatus({
          sessionId,
          datasetVersion,
          catalogAgentNumber: action.catalogAgentNumber,
          published: action.published,
          reason: action.reason,
        });
        setPublishReason("");
        setWriteMessage({
          type: "success",
          text: action.published
            ? `Published agent #${action.catalogAgentNumber} to catalog.`
            : `Unpublished agent #${action.catalogAgentNumber} from catalog.`,
        });
      } else {
        await setSeedStatusOverride({
          sessionId,
          datasetVersion,
          catalogAgentNumber: action.catalogAgentNumber,
          override: {
            seedStatus: action.seedStatus,
            reason: action.reason,
          },
        });
        setSeedOverrideReason("");
        setWriteMessage({
          type: "success",
          text: `Applied seed override for agent #${action.catalogAgentNumber}.`,
        });
      }
      setPendingConfirmAction(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Controlled write failed.";
      setWriteMessage({ type: "error", text: message });
    } finally {
      setIsSubmittingWrite(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="mx-auto mb-3" size={36} style={{ color: "var(--error)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
            {tx("access.super_admin_required", "Super admin access required")}
          </p>
        </div>
      </div>
    );
  }

  if (!overview || !listAgents || !syncRuns || !cloneInventory) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 p-4 flex gap-4 overflow-auto">
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="border rounded p-3 flex flex-col gap-3" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
                <Database size={16} />
                {tx("header.title", "Agent Control Center")}
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx(
                  "header.subtitle",
                  "Super-admin control surface for catalog visibility, drift audits, blocker writes, seed overrides, and seed template bindings.",
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
                {tx("controls.dataset", "Dataset")}
                <select
                  value={datasetVersion}
                  onChange={(event) => setDatasetVersion(event.target.value)}
                  className="px-2 py-1 text-xs border rounded bg-transparent"
                  style={{ borderColor: "var(--window-document-border)" }}
                >
                  {overview.datasetVersions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={handleAudit}
                disabled={isRunningAudit}
                className="px-2 py-1 text-xs border rounded flex items-center gap-1"
                style={{
                  borderColor: "var(--window-document-border)",
                  color: "var(--window-document-text)",
                  opacity: isRunningAudit ? 0.6 : 1,
                }}
              >
                {isRunningAudit ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {tx("controls.audit", "Audit")}
              </button>

              <button
                type="button"
                onClick={handlePublishedBackfill}
                disabled={isSubmittingWrite}
                className="px-2 py-1 text-xs border rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  color: "var(--window-document-text)",
                  opacity: isSubmittingWrite ? 0.6 : 1,
                }}
                title={tx(
                  "controls.backfill_published_title",
                  "Populate missing explicit published flags using legacy inference rule.",
                )}
              >
                {tx("controls.backfill_published", "Backfill Published Flags")}
              </button>

              <button
                type="button"
                disabled
                className="px-2 py-1 text-xs border rounded"
                style={{
                  borderColor: "var(--window-document-border)",
                  color: "var(--desktop-menu-text-muted)",
                  opacity: 0.6,
                }}
                title={tx("controls.phase2_title", "Phase 2")}
              >
                {tx("controls.sync_apply_phase2", "Sync Apply (Phase 2)")}
              </button>

              <div
                className="px-2 py-1 text-xs border rounded"
                style={{
                  borderColor: driftTone.border,
                  background: driftTone.bg,
                  color: driftTone.text,
                }}
              >
                {driftTone.label}
              </div>
            </div>
          </div>

          {auditMessage && (
            <div
              className="text-xs border rounded px-2 py-1 flex items-center gap-2"
              style={{
                borderColor: auditMessage.type === "success" ? "#15803d" : "#dc2626",
                color: auditMessage.type === "success" ? "#166534" : "#991b1b",
                background: auditMessage.type === "success" ? "#f0fdf4" : "#fee2e2",
              }}
            >
              {auditMessage.type === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {auditMessage.text}
            </div>
          )}

          {writeMessage && (
            <div
              className="text-xs border rounded px-2 py-1 flex items-center gap-2"
              style={{
                borderColor: writeMessage.type === "success" ? "#15803d" : "#dc2626",
                color: writeMessage.type === "success" ? "#166534" : "#991b1b",
                background: writeMessage.type === "success" ? "#f0fdf4" : "#fee2e2",
              }}
            >
              {writeMessage.type === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              {writeMessage.text}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
            <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("summary.total_agents", "Total agents")}
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {overview.summary.totalAgents}/{overview.expectedAgentCount}
              </div>
            </div>
            <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("summary.catalog_done", "Catalog done")}
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {overview.summary.catalogDone}
              </div>
            </div>
            <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("summary.seeds_full", "Seeds full")}
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {overview.summary.seedsFull}
              </div>
            </div>
            <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("summary.runtime_live", "Runtime live")}
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {overview.summary.runtimeLive}
              </div>
            </div>
            <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("summary.published", "Published")}
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {overview.summary.published}
              </div>
            </div>
            <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("summary.missing_tools", "Missing tools")}
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {overview.summary.toolsMissing}
              </div>
            </div>
            <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("summary.blocked_agents", "Blocked agents")}
              </div>
              <div className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                {overview.summary.blockedAgents}
              </div>
            </div>
          </div>

          {overview.drift.reasons.length > 0 && (
            <div
              className="text-xs border rounded p-2"
              style={{
                borderColor: driftTone.border,
                background: driftTone.bg,
                color: driftTone.text,
              }}
            >
              {overview.drift.reasons.map((reason) => (
                <p key={reason}>{reason}</p>
              ))}
            </div>
          )}
        </div>

        <TemplateHubEntryPanel
          totalCatalogAgents={overview.summary.totalAgents}
          publishedCatalogAgents={overview.summary.published}
          latestSyncCompletedAt={latestSyncCompletedAt}
          driftStatus={overview.drift.status}
          activeSection={templateHubSection}
          onSelectSection={setTemplateHubSection}
        />

        <div
          className="border rounded p-2 text-xs"
          style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
        >
          {templateHubSection === "catalog" && (
            <p>Template catalog view is active. Use dataset filters and the agent table to inspect publish readiness.</p>
          )}
          {templateHubSection === "versions" && (
            <div className="space-y-3">
              <p>Version history view is active. Use sync runs and drift status above as the timeline source of truth.</p>

              {templateLifecycleMessage && (
                <div
                  className="text-xs border rounded px-2 py-1 flex items-center gap-2"
                  style={{
                    borderColor: templateLifecycleMessage.type === "success" ? "#15803d" : "#dc2626",
                    color: templateLifecycleMessage.type === "success" ? "#166534" : "#991b1b",
                    background: templateLifecycleMessage.type === "success" ? "#f0fdf4" : "#fee2e2",
                  }}
                >
                  {templateLifecycleMessage.type === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {templateLifecycleMessage.text}
                </div>
              )}

              {!hasLifecycleTemplates ? (
                <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  No templates available.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        Template
                      </span>
                      <select
                        className="px-2 py-1 text-xs border rounded bg-transparent"
                        style={{ borderColor: "var(--window-document-border)" }}
                        value={selectedLifecycleTemplateId}
                        onChange={(event) => {
                          setSelectedLifecycleTemplateId(event.target.value);
                          clearTemplateLifecycleDerivedState();
                          setTemplateLifecycleMessage(null);
                        }}
                      >
                        {templateLifecycleOptions?.templates.map((template) => (
                          <option key={template.templateId} value={template.templateId}>
                            {template.templateName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        Version
                      </span>
                      <select
                        className="px-2 py-1 text-xs border rounded bg-transparent"
                        style={{ borderColor: "var(--window-document-border)" }}
                        value={selectedLifecycleVersionId}
                        onChange={(event) => {
                          setSelectedLifecycleVersionId(event.target.value);
                          clearTemplateLifecycleDerivedState();
                          setTemplateLifecycleMessage(null);
                        }}
                      >
                        {!hasTemplateLifecycleVersions && <option value="">No versions available</option>}
                        {templateLifecycleVersions.map((version) => (
                          <option key={version.templateVersionId} value={version.templateVersionId}>
                            {version.versionTag} ({version.lifecycleStatus})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {!hasTemplateLifecycleVersions && (
                    <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      No versions created yet.
                    </p>
                  )}

                  {hasTemplateLifecycleVersions && !fallbackPublishableVersion && (
                    <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      No publishable version available.
                    </p>
                  )}

                  <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
                    <p className="font-semibold">Create Snapshot</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <label className="text-[11px] flex flex-col gap-1">
                        Version tag (optional)
                        <input
                          type="text"
                          value={snapshotVersionTagDraft}
                          onChange={(event) => setSnapshotVersionTagDraft(event.target.value)}
                          className="px-2 py-1 text-xs border rounded bg-transparent"
                          style={{ borderColor: "var(--window-document-border)" }}
                          placeholder="v3"
                          disabled={isSubmittingWrite}
                        />
                      </label>
                      <label className="text-[11px] flex flex-col gap-1">
                        Summary (optional)
                        <input
                          type="text"
                          value={snapshotSummaryDraft}
                          onChange={(event) => setSnapshotSummaryDraft(event.target.value)}
                          className="px-2 py-1 text-xs border rounded bg-transparent"
                          style={{ borderColor: "var(--window-document-border)" }}
                          placeholder="describe changes in this snapshot"
                          disabled={isSubmittingWrite}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs border rounded"
                      style={{ borderColor: "var(--window-document-border)" }}
                      disabled={Boolean(createSnapshotDisabledReason)}
                      title={createSnapshotDisabledReason ?? "Create a new immutable version snapshot"}
                      onClick={handleCreateSnapshot}
                    >
                      Create Snapshot
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs border rounded"
                      style={{ borderColor: "var(--window-document-border)" }}
                      disabled={isSubmittingWrite}
                      title="Explicitly refetch lifecycle data"
                      onClick={() => {
                        triggerTemplateLifecycleRefresh();
                        setTemplateLifecycleMessage({
                          type: "success",
                          text: "Lifecycle data refresh requested.",
                        });
                      }}
                    >
                      Refresh Lifecycle Data
                    </button>
                    {createSnapshotDisabledReason && (
                      <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        Create Snapshot unavailable: {createSnapshotDisabledReason}
                      </p>
                    )}
                  </div>

                  <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
                    <p className="font-semibold">Publish / Deprecate</p>
                    <label className="text-[11px] flex flex-col gap-1">
                      Publish reason (optional)
                      <input
                        type="text"
                        value={publishVersionReasonDraft}
                        onChange={(event) => setPublishVersionReasonDraft(event.target.value)}
                        className="px-2 py-1 text-xs border rounded bg-transparent"
                        style={{ borderColor: "var(--window-document-border)" }}
                        placeholder="release to rollout channel"
                        disabled={isSubmittingWrite}
                      />
                    </label>
                    <label className="text-[11px] flex flex-col gap-1">
                      Deprecation reason (required)
                      <input
                        type="text"
                        value={deprecateVersionReasonDraft}
                        onChange={(event) => setDeprecateVersionReasonDraft(event.target.value)}
                        className="px-2 py-1 text-xs border rounded bg-transparent"
                        style={{ borderColor: "var(--window-document-border)" }}
                        placeholder="superseded_by_newer_version"
                        disabled={isSubmittingWrite}
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs border rounded"
                        style={{ borderColor: "var(--window-document-border)" }}
                        disabled={Boolean(publishDisabledReason)}
                        title={publishDisabledReason ?? "Publish selected draft version"}
                        onClick={handleRequestPublishVersion}
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs border rounded"
                        style={{ borderColor: "var(--window-document-border)" }}
                        disabled={Boolean(deprecateDisabledReason)}
                        title={deprecateDisabledReason ?? "Deprecate selected published version"}
                        onClick={handleRequestDeprecateVersion}
                      >
                        Deprecate
                      </button>
                    </div>
                    {publishDisabledReason && (
                      <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        Publish unavailable: {publishDisabledReason}
                      </p>
                    )}
                    {deprecateDisabledReason && (
                      <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        Deprecate unavailable: {deprecateDisabledReason}
                      </p>
                    )}
                  </div>

                  {hasTemplateLifecycleVersions && (
                    <div className="border rounded overflow-auto" style={{ borderColor: "var(--window-document-border)" }}>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr style={{ background: "var(--window-document-bg-elevated)" }}>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Version</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Lifecycle</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {templateLifecycleVersions.map((version) => {
                            const tone = statusTone(version.lifecycleStatus === "published"
                              ? "full"
                              : version.lifecycleStatus === "draft"
                                ? "skeleton"
                                : "missing");
                            return (
                              <tr key={version.templateVersionId}>
                                <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                  {version.versionTag}
                                </td>
                                <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                  <span className="px-1 py-0.5 rounded" style={{ color: tone.color, background: tone.bg }}>
                                    {version.lifecycleStatus}
                                  </span>
                                </td>
                                <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                  {formatDateTime(version.updatedAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {templateHubSection === "rollout" && (
            <div className="space-y-3">
              <p>
                Rollout actions are confirmation-gated and preserve deterministic precedence:
                platform policy -&gt; template baseline -&gt; org clone overrides -&gt; runtime/session restrictions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Template
                  </span>
                  <select
                    className="px-2 py-1 text-xs border rounded bg-transparent"
                    style={{ borderColor: "var(--window-document-border)" }}
                    value={selectedRolloutTemplateId}
                    onChange={(event) => {
                      setSelectedRolloutTemplateId(event.target.value);
                      setRolloutPreview(null);
                      setRolloutPreviewRequest(null);
                    }}
                  >
                    {(templateRolloutOptions?.templates ?? []).map((template) => (
                      <option key={template.templateId} value={template.templateId}>
                        {template.templateName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Target version
                  </span>
                  <select
                    className="px-2 py-1 text-xs border rounded bg-transparent"
                    style={{ borderColor: "var(--window-document-border)" }}
                    value={selectedRolloutVersionId}
                    onChange={(event) => {
                      setSelectedRolloutVersionId(event.target.value);
                      setRolloutPreview(null);
                      setRolloutPreviewRequest(null);
                    }}
                  >
                    {(!hasSelectedTemplateVersions || !selectedRolloutVersionId) && (
                      <option value="">
                        {hasSelectedTemplateVersions ? "Select target version" : "No versions available"}
                      </option>
                    )}
                    {(selectedRolloutTemplate?.versions ?? []).map((version) => (
                      <option key={version.templateVersionId} value={version.templateVersionId}>
                        {version.versionTag} ({version.lifecycleStatus})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Mode
                  </span>
                  <select
                    className="px-2 py-1 text-xs border rounded bg-transparent"
                    style={{ borderColor: "var(--window-document-border)" }}
                    value={rolloutMode}
                    onChange={(event) => setRolloutMode(event.target.value === "rollback" ? "rollback" : "apply")}
                  >
                    <option value="apply">Apply rollout</option>
                    <option value="rollback">Rollback to target version</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Stage size
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={rolloutStageSize}
                    onChange={(event) => setRolloutStageSize(event.target.value)}
                    className="px-2 py-1 text-xs border rounded"
                    style={{ borderColor: "var(--window-document-border)", background: "transparent" }}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Stage start index
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={rolloutStageStartIndex}
                    onChange={(event) => setRolloutStageStartIndex(event.target.value)}
                    className="px-2 py-1 text-xs border rounded"
                    style={{ borderColor: "var(--window-document-border)", background: "transparent" }}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Reason (required for apply/rollback)
                  </span>
                  <input
                    type="text"
                    value={rolloutReason}
                    onChange={(event) => setRolloutReason(event.target.value)}
                    placeholder={
                      rolloutMode === "rollback"
                        ? "rollback_to_template_version_due_to_incident"
                        : "staged_rollout_window_1"
                    }
                    className="px-2 py-1 text-xs border rounded"
                    style={{ borderColor: "var(--window-document-border)", background: "transparent" }}
                  />
                </label>
              </div>

              <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
                <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  Target organizations (defaults to clone-backed orgs for selected template): {cloneBackedTemplateScopedOrgIds.length} clone-backed / {availableRolloutOrgIds.length} active
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={rolloutOrganizationSearch}
                    onChange={(event) => {
                      setRolloutOrganizationSearch(event.target.value);
                      setRolloutOrganizationPage(1);
                    }}
                    placeholder="Search org name or ID"
                    className="min-w-[220px] px-2 py-1 text-xs border rounded"
                    style={{ borderColor: "var(--window-document-border)", background: "transparent" }}
                  />
                  <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    <button
                      type="button"
                      className="px-2 py-1 border rounded disabled:opacity-50"
                      style={{ borderColor: "var(--window-document-border)" }}
                      disabled={boundedRolloutOrganizationPage <= 1}
                      onClick={() => setRolloutOrganizationPage((current) => Math.max(1, current - 1))}
                    >
                      Prev
                    </button>
                    <span>
                      Page {boundedRolloutOrganizationPage} / {rolloutOrganizationTotalPages}
                    </span>
                    <button
                      type="button"
                      className="px-2 py-1 border rounded disabled:opacity-50"
                      style={{ borderColor: "var(--window-document-border)" }}
                      disabled={boundedRolloutOrganizationPage >= rolloutOrganizationTotalPages}
                      onClick={() =>
                        setRolloutOrganizationPage((current) =>
                          Math.min(rolloutOrganizationTotalPages, current + 1),
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                  <span className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Showing {pagedRolloutOrganizationOptions.length} of {filteredRolloutOrganizationOptions.length} matches
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                  {filteredRolloutOrganizationOptions.length === 0 ? (
                    <p style={{ color: "var(--desktop-menu-text-muted)" }}>No active organizations available.</p>
                  ) : (
                    pagedRolloutOrganizationOptions.map((organization) => {
                      const organizationId = organization.id;
                      const checked = rolloutTargetOrgIds.includes(organizationId);
                      return (
                        <label key={organizationId} className="flex items-center gap-1 text-[11px]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setRolloutPreview(null);
                              setRolloutPreviewRequest(null);
                              setRolloutTargetOrgIds((current) => {
                                const next = new Set(current);
                                if (event.target.checked) {
                                  next.add(organizationId);
                                } else {
                                  next.delete(organizationId);
                                }
                                return Array.from(next).sort((left, right) => left.localeCompare(right));
                              });
                            }}
                          />
                          {organization.name}
                          <span style={{ color: "var(--desktop-menu-text-muted)" }}>
                            ({organization.hasClone ? "clone" : "new"})
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-2 py-1 text-xs border rounded"
                  style={{ borderColor: "var(--window-document-border)" }}
                  disabled={isLoadingRolloutPreview || Boolean(rolloutReadinessIssue)}
                  title={rolloutReadinessIssue ?? "Generate rollout dry-run and drift preview"}
                  onClick={handleRolloutPreview}
                >
                  {isLoadingRolloutPreview ? "Preparing preview..." : "Preview rollout diff"}
                </button>
                <button
                  type="button"
                  className="px-2 py-1 text-xs border rounded"
                  style={{ borderColor: "var(--window-document-border)" }}
                  disabled={isSubmittingWrite}
                  title={rolloutConfirmIssue ?? "Run confirmation-gated rollout apply or rollback"}
                  onClick={handleRequestRolloutConfirm}
                >
                  {rolloutMode === "rollback" ? "Rollback (confirm)" : "Apply rollout (confirm)"}
                </button>
              </div>
              {rolloutConfirmIssue && (
                <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  Apply/rollback unavailable: {rolloutConfirmIssue}
                </p>
              )}
              {rolloutInlineMessage && (
                <div
                  className="border rounded px-2 py-1 text-[11px]"
                  style={{
                    borderColor:
                      rolloutInlineMessage.type === "error"
                        ? "#dc2626"
                        : rolloutInlineMessage.type === "success"
                          ? "#15803d"
                          : "var(--window-document-border)",
                    color:
                      rolloutInlineMessage.type === "error"
                        ? "#991b1b"
                        : rolloutInlineMessage.type === "success"
                          ? "#166534"
                          : "var(--window-document-text)",
                    background:
                      rolloutInlineMessage.type === "error"
                        ? "#fee2e2"
                        : rolloutInlineMessage.type === "success"
                          ? "#f0fdf4"
                          : "var(--window-document-bg-elevated)",
                  }}
                >
                  {rolloutInlineMessage.text}
                </div>
              )}
              {pendingRolloutConfirmAction && (
                <div
                  className="border rounded p-2 space-y-2"
                  style={{ borderColor: "#f59e0b", background: "var(--window-document-bg-elevated)" }}
                >
                  <p className="text-[11px] font-semibold" style={{ color: "var(--window-document-text)" }}>
                    Confirmation pending: {pendingRolloutConfirmAction.type === "rollout_rollback" ? "Rollback" : "Apply rollout"}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Template {pendingRolloutConfirmAction.templateVersionTag} • {pendingRolloutConfirmAction.targetOrganizationIds.length} staged orgs
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 text-xs border rounded"
                      style={{ borderColor: "#f59e0b" }}
                      disabled={isSubmittingWrite}
                      onClick={handleConfirmedRollout}
                    >
                      {pendingRolloutConfirmAction.type === "rollout_rollback" ? "Run rollback now" : "Run rollout now"}
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs border rounded"
                      style={{ borderColor: "var(--window-document-border)" }}
                      disabled={isSubmittingWrite}
                      onClick={() => setPendingRolloutConfirmAction(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {rolloutReadinessIssue && (
                <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                  Rollout unavailable: {rolloutReadinessIssue}
                </p>
              )}

              <div className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                Requested orgs: {effectiveRolloutTargetOrgIds.length} | Staged window preview: {stagedRolloutTargetOrgIds.length}
              </div>

              {rolloutPreview && (
                <div
                  className="border rounded p-2 space-y-2"
                  style={{ borderColor: "var(--window-document-border)" }}
                >
                  <p className="font-semibold">Rollout preview summary</p>
                  <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Requested: {rolloutPreview.requestedTargetOrganizationIds.length} | Staged: {rolloutPreview.stagedTargetOrganizationIds.length}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Plan creates: {lastRolloutResult?.summary.plan.creates ?? 0} | updates: {lastRolloutResult?.summary.plan.updates ?? 0} | skips: {lastRolloutResult?.summary.plan.skips ?? 0} | blocked: {lastRolloutResult?.summary.plan.blocked ?? 0}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Rollout plan ID: {lastRolloutResult?.distributionJobId ?? "n/a"}
                  </p>

                  <p className="font-semibold text-[12px]">Planned targets</p>
                  <div className="border rounded overflow-auto" style={{ borderColor: "var(--window-document-border)" }}>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr style={{ background: "var(--window-document-bg-elevated)" }}>
                          <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Org</th>
                          <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Operation</th>
                          <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Template version</th>
                          <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Existing clone</th>
                          <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Reason</th>
                          <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Changed fields</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plannedRolloutRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-2 py-2 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
                              No staged rollout plan rows found.
                            </td>
                          </tr>
                        ) : (
                          plannedRolloutRows.map((row) => (
                            <tr key={`${row.organizationId}:${row.operation}:${row.reason}`}>
                              <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                {rolloutOrganizationNameById.get(row.organizationId) ?? row.organizationId}
                                <div style={{ color: "var(--desktop-menu-text-muted)" }}>{row.organizationId}</div>
                              </td>
                              <td className="px-2 py-1 border-b capitalize" style={{ borderColor: "var(--window-document-border)" }}>
                                {row.operation}
                              </td>
                              <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                {lastRolloutResult?.templateVersion ?? selectedRolloutVersion?.versionTag ?? "n/a"}
                              </td>
                              <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                {row.existingCloneId ?? "n/a (new clone)"}
                              </td>
                              <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                {row.reason}
                              </td>
                              <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                {row.changedFields.length}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="font-semibold text-[12px]">Drift details (updates only)</p>
                  {!rolloutPreview.drift ? (
                    <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      Loading preview drift diff...
                    </p>
                  ) : (
                    <div className="border rounded overflow-auto" style={{ borderColor: "var(--window-document-border)" }}>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr style={{ background: "var(--window-document-bg-elevated)" }}>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Org</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Clone</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>State</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Diff</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plannedRolloutRows.filter((row) => row.operation === "update").length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-2 py-2 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
                                No update rows in this plan, so drift detail is not required.
                              </td>
                            </tr>
                          ) : (
                            plannedRolloutRows
                              .filter((row) => row.operation === "update")
                              .map((row) => {
                                const target = driftTargetByOrganizationId.get(row.organizationId);
                                const firstDiff = target?.diff?.[0];
                                return (
                                  <tr key={`drift:${row.organizationId}`}>
                                    <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                      {row.organizationId}
                                    </td>
                                    <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                      {target?.cloneAgentId ?? row.existingCloneId ?? "n/a"}
                                    </td>
                                    <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                      {target?.policyState ?? row.operation}
                                    </td>
                                    <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                      {firstDiff
                                        ? `${firstDiff.field} (${firstDiff.policyMode}): ${formatRolloutDiffValue(firstDiff.cloneValue)} -> ${formatRolloutDiffValue(firstDiff.templateValue)}`
                                        : "diff pending"}
                                    </td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div
                className="border rounded p-2 space-y-2"
                style={{ borderColor: "var(--window-document-border)" }}
              >
                <p className="font-semibold">Distribution telemetry</p>
                {!distributionTelemetry ? (
                  <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Loading distribution telemetry...
                  </p>
                ) : (
                  <>
                    <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      Generated {formatDateTime(distributionTelemetry.generatedAt)}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                      <MiniStat label="Jobs" value={distributionTelemetry.summary.totalJobs} />
                      <MiniStat label="Completed" value={distributionTelemetry.summary.byStatus.completed} />
                      <MiniStat label="With errors" value={distributionTelemetry.summary.byStatus.completedWithErrors} />
                      <MiniStat label="Rollbacks" value={distributionTelemetry.summary.byOperationKind.rolloutRollback} />
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      Affected org totals - requested: {distributionTelemetry.summary.totalAffectedOrgs.requested}, staged: {distributionTelemetry.summary.totalAffectedOrgs.staged}, mutated: {distributionTelemetry.summary.totalAffectedOrgs.mutated}, blocked: {distributionTelemetry.summary.totalAffectedOrgs.blocked}
                    </p>
                    <div className="border rounded overflow-auto" style={{ borderColor: "var(--window-document-border)" }}>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr style={{ background: "var(--window-document-bg-elevated)" }}>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Time</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Kind</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Status</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Template</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Job</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Affected</th>
                            <th className="text-left px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>Errors</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distributionTelemetry.rows.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-2 py-2 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
                                No distribution jobs for current template filter.
                              </td>
                            </tr>
                          ) : (
                            distributionTelemetry.rows.map((row) => (
                              <tr key={row._id}>
                                <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                  {formatDateTime(row.performedAt)}
                                </td>
                                <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                  {row.operationKind === "rollout_rollback" ? "rollback" : "rollout"}
                                </td>
                                <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                  {row.status.replace(/_/g, " ")}
                                </td>
                                <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                  {row.templateVersion}
                                </td>
                                <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                  {row.distributionJobId}
                                </td>
                                <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                  mutated {row.affectedOrgCounts.mutated} / staged {row.affectedOrgCounts.staged}
                                </td>
                                <td className="px-2 py-1 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                                  blocked {row.affectedOrgCounts.blocked}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border rounded p-3 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                Cross-Org Clone Inventory
              </h4>
              <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                Filter clone drift by organization, template, policy state, and risk level.
              </p>
            </div>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Generated {formatDateTime(cloneInventory.generatedAt)}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 text-[11px]">
            <MiniStat label="Total" value={cloneInventory.total} />
            <MiniStat label="In Sync" value={cloneInventory.summary.byPolicyState.in_sync} />
            <MiniStat label="Overridden" value={cloneInventory.summary.byPolicyState.overridden} />
            <MiniStat label="Stale" value={cloneInventory.summary.byPolicyState.stale} />
            <MiniStat label="Blocked" value={cloneInventory.summary.byPolicyState.blocked} />
            <MiniStat label="High Risk" value={cloneInventory.summary.byRisk.high} />
            <MiniStat label="Medium Risk" value={cloneInventory.summary.byRisk.medium} />
            <MiniStat label="Low Risk" value={cloneInventory.summary.byRisk.low} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={cloneInventorySearch}
              onChange={(event) => setCloneInventorySearch(event.target.value)}
              placeholder="Search org/template/clone"
              className="px-2 py-1 text-xs border rounded min-w-[220px]"
              style={{ borderColor: "var(--window-document-border)", background: "transparent" }}
            />

            <select
              className="px-2 py-1 text-xs border rounded bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={cloneInventoryOrgFilter}
              onChange={(event) => setCloneInventoryOrgFilter(event.target.value)}
            >
              <option value="">Org</option>
              {cloneInventory.filterMetadata.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} ({organization.count})
                </option>
              ))}
            </select>

            <select
              className="px-2 py-1 text-xs border rounded bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={cloneInventoryTemplateFilter}
              onChange={(event) => setCloneInventoryTemplateFilter(event.target.value)}
            >
              <option value="">Template</option>
              {cloneInventory.filterMetadata.templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.count})
                </option>
              ))}
            </select>

            <select
              className="px-2 py-1 text-xs border rounded bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={cloneInventoryPolicyStateFilter}
              onChange={(event) => setCloneInventoryPolicyStateFilter(event.target.value)}
            >
              <option value="">State</option>
              {CLONE_POLICY_STATE_OPTIONS.map((policyState) => (
                <option key={policyState} value={policyState}>
                  {compactCell(policyState)}
                </option>
              ))}
            </select>

            <select
              className="px-2 py-1 text-xs border rounded bg-transparent"
              style={{ borderColor: "var(--window-document-border)" }}
              value={cloneInventoryRiskFilter}
              onChange={(event) => setCloneInventoryRiskFilter(event.target.value)}
            >
              <option value="">Risk</option>
              {CLONE_RISK_LEVEL_OPTIONS.map((riskLevel) => (
                <option key={riskLevel} value={riskLevel}>
                  {compactCell(riskLevel)}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="px-2 py-1 text-xs border rounded"
              style={{ borderColor: "var(--window-document-border)" }}
              onClick={() => {
                setCloneInventoryOrgFilter("");
                setCloneInventoryTemplateFilter("");
                setCloneInventoryPolicyStateFilter("");
                setCloneInventoryRiskFilter("");
                setCloneInventorySearch("");
              }}
            >
              Reset Inventory Filters
            </button>
          </div>

          <div className="border rounded overflow-auto" style={{ borderColor: "var(--window-document-border)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--window-document-bg-elevated)", color: "var(--window-document-text)" }}>
                  <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>Org</th>
                  <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>Template</th>
                  <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>Clone</th>
                  <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>State</th>
                  <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>Risk</th>
                  <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>Diffs</th>
                </tr>
              </thead>
              <tbody>
                {cloneInventory.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-5 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
                      No clone inventory rows for current filters.
                    </td>
                  </tr>
                ) : (
                  cloneInventory.rows.map((row) => {
                    const stateTone = statusTone(row.policyState);
                    const riskTone =
                      row.riskLevel === "high"
                        ? { color: "#991b1b", bg: "#fee2e2" }
                        : row.riskLevel === "medium"
                        ? { color: "#9a3412", bg: "#fff7ed" }
                        : { color: "#166534", bg: "#f0fdf4" };
                    return (
                      <tr key={row.cloneAgentId}>
                        <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                          {row.organizationName}
                        </td>
                        <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                          {row.templateName}
                        </td>
                        <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                          {row.cloneAgentName}
                        </td>
                        <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                          <span className="px-1 py-0.5 rounded" style={{ color: stateTone.color, background: stateTone.bg }}>
                            {compactCell(row.policyState)}
                          </span>
                        </td>
                        <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                          <span className="px-1 py-0.5 rounded" style={{ color: riskTone.color, background: riskTone.bg }}>
                            {row.riskLevel}
                          </span>
                        </td>
                        <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                          {row.diffCount}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded p-3 flex flex-wrap items-center gap-2" style={{ borderColor: "var(--window-document-border)" }}>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={tx("filters.search_placeholder", "Search agent #, name, profile")}
            className="px-2 py-1 text-xs border rounded min-w-[220px]"
            style={{ borderColor: "var(--window-document-border)", background: "transparent" }}
          />

          <select
            className="px-2 py-1 text-xs border rounded bg-transparent"
            style={{ borderColor: "var(--window-document-border)" }}
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">{tx("filters.category", "Category")}</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            className="px-2 py-1 text-xs border rounded bg-transparent"
            style={{ borderColor: "var(--window-document-border)" }}
            value={runtimeStatusFilter}
            onChange={(event) => setRuntimeStatusFilter(event.target.value)}
          >
            <option value="">{tx("filters.runtime", "Runtime")}</option>
            {RUNTIME_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            className="px-2 py-1 text-xs border rounded bg-transparent"
            style={{ borderColor: "var(--window-document-border)" }}
            value={seedStatusFilter}
            onChange={(event) => setSeedStatusFilter(event.target.value)}
          >
            <option value="">{tx("filters.seed", "Seed")}</option>
            {SEED_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            className="px-2 py-1 text-xs border rounded bg-transparent"
            style={{ borderColor: "var(--window-document-border)" }}
            value={toolCoverageFilter}
            onChange={(event) => setToolCoverageFilter(event.target.value)}
          >
            <option value="">{tx("filters.tool_coverage", "Tool coverage")}</option>
            {TOOL_COVERAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            className="px-2 py-1 text-xs border rounded bg-transparent"
            style={{ borderColor: "var(--window-document-border)" }}
            value={implementationPhaseFilter}
            onChange={(event) => setImplementationPhaseFilter(event.target.value)}
          >
            <option value="">{tx("filters.phase", "Phase")}</option>
            {overview.filterMetadata.implementationPhases.map((phase) => (
              <option key={phase} value={String(phase)}>
                {phase}
              </option>
            ))}
          </select>

          <label className="text-xs inline-flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <input
              type="checkbox"
              checked={onlyWithBlockers}
              onChange={(event) => setOnlyWithBlockers(event.target.checked)}
            />
            {tx("filters.only_blockers", "Only blockers")}
          </label>

          <button
            type="button"
            className="px-2 py-1 text-xs border rounded"
            style={{ borderColor: "var(--window-document-border)" }}
            onClick={() => {
              setCategoryFilter("");
              setRuntimeStatusFilter("");
              setSeedStatusFilter("");
              setToolCoverageFilter("");
              setImplementationPhaseFilter("");
              setOnlyWithBlockers(false);
              setSearch("");
            }}
          >
            {tx("filters.reset", "Reset")}
          </button>
        </div>

        <div className="border rounded flex-1 overflow-auto" style={{ borderColor: "var(--window-document-border)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--window-document-bg-elevated)", color: "var(--window-document-text)" }}>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.agent_number", "Agent #")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.name", "Name")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.category", "Category")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.tool_profile", "Tool profile")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.tool_coverage", "Tool coverage")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.seed", "Seed")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.runtime", "Runtime")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.published", "Published")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.access_modes", "Access modes")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.phase", "Phase")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.blockers", "Blockers")}</th>
              </tr>
            </thead>
            <tbody>
              {listAgents.agents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {tx("table.empty", "No agents found for current filters.")}
                  </td>
                </tr>
              ) : (
                listAgents.agents.map((agent) => {
                  const seedTone = statusTone(agent.seedStatus);
                  const runtimeTone = statusTone(agent.runtimeStatus);
                  const selected = selectedAgentNumber === agent.catalogAgentNumber;

                  return (
                    <tr
                      key={agent._id}
                      className="cursor-pointer"
                      style={{
                        background: selected ? "var(--window-document-bg-elevated)" : "transparent",
                        color: "var(--window-document-text)",
                      }}
                      onClick={() => {
                        setSelectedAgentNumber(agent.catalogAgentNumber);
                        setDrawerTab("summary");
                      }}
                    >
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        {agent.catalogAgentNumber}
                      </td>
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        {agent.name}
                      </td>
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        {agent.category}
                      </td>
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        {agent.toolProfile}
                      </td>
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        {agent.toolCoverageCounts.implemented}/{agent.toolCoverageCounts.required}
                      </td>
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        <span className="px-1 py-0.5 rounded" style={{ color: seedTone.color, background: seedTone.bg }}>
                          {compactCell(agent.seedStatus)}
                        </span>
                      </td>
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        <span className="px-1 py-0.5 rounded" style={{ color: runtimeTone.color, background: runtimeTone.bg }}>
                          {compactCell(agent.runtimeStatus)}
                        </span>
                      </td>
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        <span
                          className="px-1 py-0.5 rounded"
                          style={{
                            color: agent.published ? "#166534" : "#9a3412",
                            background: agent.published ? "#f0fdf4" : "#fff7ed",
                          }}
                        >
                          {agent.published ? "yes" : "no"}
                        </span>
                      </td>
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        {toShortAccessModes(agent.specialistAccessModes)}
                      </td>
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        {agent.implementationPhase}
                      </td>
                      <td className="px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
                        {agent.blockersCount}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs" style={{ color: "var(--window-document-text)" }}>
          <p>
            {`Showing ${listAgents.agents.length} of ${listAgents.total}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 border rounded"
              style={{ borderColor: "var(--window-document-border)", opacity: cursor === "0" ? 0.5 : 1 }}
              disabled={cursor === "0"}
              onClick={() => {
                const current = Number.parseInt(cursor, 10);
                const next = Number.isFinite(current) ? Math.max(0, current - 50) : 0;
                setCursor(String(next));
              }}
            >
              {tx("pagination.previous", "Previous")}
            </button>
            <button
              type="button"
              className="px-2 py-1 border rounded"
              style={{ borderColor: "var(--window-document-border)", opacity: listAgents.nextCursor ? 1 : 0.5 }}
              disabled={!listAgents.nextCursor}
              onClick={() => {
                if (listAgents.nextCursor) {
                  setCursor(listAgents.nextCursor);
                }
              }}
            >
              {tx("pagination.next", "Next")}
            </button>
          </div>
        </div>
      </div>

      <div className="w-[420px] border rounded flex flex-col overflow-hidden" style={{ borderColor: "var(--window-document-border)" }}>
        {!selectedAgentNumber ? (
          <div className="h-full flex items-center justify-center px-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx("details.empty_select_agent", "Select an agent row to open details.")}
          </div>
        ) : agentDetails === undefined ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        ) : !agentDetails ? (
          <div className="h-full flex items-center justify-center px-4 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
            {tx("details.unavailable", "Agent details unavailable for this dataset row.")}
          </div>
        ) : (
          <>
            <div className="px-3 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>
              <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                {tx("details.agent_number", "Agent #{{number}}", {
                  number: agentDetails.agent.catalogAgentNumber,
                })}
              </p>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
                  {agentDetails.agent.name}
                </h4>
                {agentDetails.agent.seedStatusOverride && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 border rounded"
                    style={{
                      borderColor: "#c2410c",
                      color: "#9a3412",
                      background: "#fff7ed",
                    }}
                    title={buildSeedOverrideBadgeTitle(agentDetails.agent.seedStatusOverride) ?? undefined}
                  >
                    {tx("details.override_badge", "override")}
                  </span>
                )}
              </div>
            </div>

            <div className="px-2 py-2 border-b flex flex-wrap gap-1" style={{ borderColor: "var(--window-document-border)" }}>
              {DRAWER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDrawerTab(tab.id)}
                  className="px-2 py-1 text-[11px] border rounded"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: drawerTab === tab.id ? "var(--window-document-bg-elevated)" : "transparent",
                    color: drawerTab === tab.id ? "var(--window-document-text)" : "var(--desktop-menu-text-muted)",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto p-3 text-xs" style={{ color: "var(--window-document-text)" }}>
              {drawerTab === "summary" && (
                <div className="space-y-2">
                  <DetailRow label={tx("details.summary.category", "Category")} value={agentDetails.agent.category} />
                  <DetailRow label={tx("details.summary.subtype", "Subtype")} value={agentDetails.agent.subtype} />
                  <DetailRow label={tx("details.summary.tier", "Tier")} value={agentDetails.agent.tier} />
                  <DetailRow label={tx("details.summary.soul_blend", "Soul blend")} value={agentDetails.agent.soulBlend} />
                  <DetailRow label={tx("details.summary.soul_status", "Soul status")} value={agentDetails.agent.soulStatus} />
                  <DetailRow label={tx("details.summary.tool_profile", "Tool profile")} value={agentDetails.agent.toolProfile} />
                  <DetailRow label={tx("details.summary.autonomy", "Autonomy")} value={agentDetails.agent.autonomyDefault} />
                  <DetailRow
                    label={tx("details.summary.source_docs", "Source docs")}
                    value={`${agentDetails.agent.sourceRefs.catalogDocPath}\n${agentDetails.agent.sourceRefs.matrixDocPath}\n${agentDetails.agent.sourceRefs.seedDocPath}\n${agentDetails.agent.sourceRefs.roadmapDocPath}`}
                    multiline
                  />
                </div>
              )}

              {drawerTab === "tools" && (
                <div className="space-y-2">
                  {agentDetails.tools.length === 0 ? (
                    <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {tx("details.tools.empty", "No tool requirements recorded.")}
                    </p>
                  ) : (
                    agentDetails.tools.map((tool) => {
                      const tone = statusTone(tool.implementationStatus);
                      return (
                        <div key={tool._id} className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold">{tool.toolName}</p>
                            <span className="px-1 py-0.5 rounded" style={{ background: tone.bg, color: tone.color }}>
                              {tool.implementationStatus}
                            </span>
                          </div>
                          <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                            {tool.requirementLevel} | {tool.mutability} | {tool.source}
                          </p>
                          <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                            {tx(
                              "details.tools.mode_scope",
                              "Work: {{work}} | Private: {{private}}",
                              { work: tool.modeScope.work, private: tool.modeScope.private },
                            )}
                          </p>
                          {tool.integrationDependency && (
                            <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                              {tx(
                                "details.tools.integration",
                                "Integration: {{integration}}",
                                { integration: tool.integrationDependency },
                              )}
                            </p>
                          )}
                          {tool.notes && <p style={{ color: "var(--desktop-menu-text-muted)" }}>{tool.notes}</p>}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {drawerTab === "seed" && (
                <div className="space-y-2">
                  <DetailRow
                    label={tx("details.seed.computed_status", "Computed seed status (sync-owned)")}
                    value={agentDetails.agent.seedStatus}
                  />
                  {!agentDetails.seed ? (
                    <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {tx("details.seed.empty", "No seed registry row for this agent.")}
                    </p>
                  ) : (
                    <>
                      <DetailRow label={tx("details.seed.coverage", "Coverage")} value={agentDetails.seed.seedCoverage} />
                      <DetailRow
                        label={tx("details.seed.requires_soul_build", "Requires soul build")}
                        value={agentDetails.seed.requiresSoulBuild ? "yes" : "no"}
                      />
                      <DetailRow
                        label={tx("details.seed.soul_build_reason", "Soul build reason")}
                        value={agentDetails.seed.requiresSoulBuildReason || "n/a"}
                      />
                      <DetailRow
                        label={tx("details.seed.template_role", "Template role")}
                        value={agentDetails.seed.templateRole || "n/a"}
                      />
                      <DetailRow
                        label={tx("details.seed.protected_template", "Protected template")}
                        value={agentDetails.seed.protectedTemplate ? "yes" : "no"}
                      />
                      <DetailRow
                        label={tx("details.seed.immutable_origin_mapped", "Immutable origin mapped")}
                        value={agentDetails.seed.immutableOriginContractMapped ? "yes" : "no"}
                      />
                      <DetailRow
                        label={tx("details.seed.system_template_binding", "System template binding")}
                        value={agentDetails.seed.systemTemplateAgentId || "none"}
                      />
                      <DetailRow
                        label={tx("details.seed.source_path", "Source path")}
                        value={agentDetails.seed.sourcePath}
                        multiline
                      />
                    </>
                  )}
                  <div
                    className="border rounded p-2 space-y-1"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
                  >
                    <p className="font-semibold">{tx("details.seed.override_metadata", "Seed override metadata")}</p>
                    {agentDetails.agent.seedStatusOverride ? (
                      <>
                        <div
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px]"
                          style={{
                            borderColor: "#c2410c",
                            color: "#9a3412",
                            background: "#fff7ed",
                          }}
                        >
                          {tx(
                            "details.seed.override_label",
                            "Override {{status}}",
                            { status: agentDetails.agent.seedStatusOverride.seedStatus },
                          )}
                        </div>
                        <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                          {tx(
                            "details.seed.override_actor_time",
                            "{{actor}} at {{time}}",
                            {
                              actor: agentDetails.agent.seedStatusOverride.actorLabel,
                              time: formatDateTime(agentDetails.agent.seedStatusOverride.updatedAt),
                            },
                          )}
                        </p>
                        <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                          {agentDetails.agent.seedStatusOverride.reason}
                        </p>
                      </>
                    ) : (
                      <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {tx("details.seed.no_override", "No seed override has been applied.")}
                      </p>
                    )}
                  </div>
                  <div
                    className="border rounded p-2 space-y-2"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <p className="font-semibold">{tx("details.seed.template_binding", "Seed template binding")}</p>
                    <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {tx(
                        "details.seed.template_binding_help",
                        "Bind this catalog agent to a protected template (`objects` id), or clear the binding.",
                      )}
                    </p>
                    <label className="text-[11px] flex flex-col gap-1">
                      {tx("details.seed.template_binding_object_id", "Template agent object id")}
                      <input
                        type="text"
                        value={seedTemplateBindingAgentId}
                        onChange={(event) => setSeedTemplateBindingAgentId(event.target.value)}
                        className="px-2 py-1 text-xs border rounded bg-transparent"
                        style={{ borderColor: "var(--window-document-border)" }}
                        placeholder="objects_..."
                        disabled={isSubmittingWrite}
                      />
                    </label>
                    <label className="text-[11px] flex flex-col gap-1">
                      {tx("details.seed.template_binding_required_reason", "Required reason")}
                      <textarea
                        value={seedTemplateBindingReason}
                        onChange={(event) => setSeedTemplateBindingReason(event.target.value)}
                        rows={2}
                        className="px-2 py-1 text-xs border rounded bg-transparent"
                        style={{ borderColor: "var(--window-document-border)" }}
                        placeholder={tx(
                          "details.seed.template_binding_required_reason_placeholder",
                          "Explain why this binding change is required.",
                        )}
                        disabled={isSubmittingWrite}
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          opacity:
                            seedTemplateBindingAgentId.trim().length > 0
                            && seedTemplateBindingReason.trim().length > 0
                            && !isSubmittingWrite
                              ? 1
                              : 0.6,
                        }}
                        disabled={
                          seedTemplateBindingAgentId.trim().length === 0
                          || seedTemplateBindingReason.trim().length === 0
                          || isSubmittingWrite
                        }
                        onClick={() => {
                          setPendingConfirmAction({
                            type: "set_seed_template_binding",
                            catalogAgentNumber: agentDetails.agent.catalogAgentNumber,
                            templateAgentId: seedTemplateBindingAgentId.trim(),
                            reason: seedTemplateBindingReason.trim(),
                          });
                        }}
                      >
                        {tx("details.seed.bind_template_mapping", "Bind template mapping")}
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          opacity:
                            (agentDetails.seed?.systemTemplateAgentId?.length ?? 0) > 0
                            && seedTemplateBindingReason.trim().length > 0
                            && !isSubmittingWrite
                              ? 1
                              : 0.6,
                        }}
                        disabled={
                          (agentDetails.seed?.systemTemplateAgentId?.length ?? 0) === 0
                          || seedTemplateBindingReason.trim().length === 0
                          || isSubmittingWrite
                        }
                        onClick={() => {
                          setPendingConfirmAction({
                            type: "set_seed_template_binding",
                            catalogAgentNumber: agentDetails.agent.catalogAgentNumber,
                            templateAgentId: undefined,
                            reason: seedTemplateBindingReason.trim(),
                          });
                        }}
                      >
                        {tx("details.seed.clear_binding", "Clear binding")}
                      </button>
                    </div>
                  </div>
                  <div
                    className="border rounded p-2 space-y-2"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <p className="font-semibold">{tx("details.seed.apply_override", "Apply seed override")}</p>
                    <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {tx(
                        "details.seed.apply_override_help",
                        "Computed status fields remain read-only; this action only stores an audited override.",
                      )}
                    </p>
                    <label className="text-[11px] flex flex-col gap-1">
                      {tx("details.seed.override_status", "Override status")}
                      <select
                        value={seedOverrideStatus}
                        onChange={(event) => setSeedOverrideStatus(normalizeSeedStatus(event.target.value))}
                        className="px-2 py-1 text-xs border rounded bg-transparent"
                        style={{ borderColor: "var(--window-document-border)" }}
                        disabled={isSubmittingWrite}
                      >
                        {SEED_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-[11px] flex flex-col gap-1">
                      {tx("details.seed.required_reason", "Required reason")}
                      <textarea
                        value={seedOverrideReason}
                        onChange={(event) => setSeedOverrideReason(event.target.value)}
                        rows={3}
                        className="px-2 py-1 text-xs border rounded bg-transparent"
                        style={{ borderColor: "var(--window-document-border)" }}
                        placeholder={tx(
                          "details.seed.required_reason_placeholder",
                          "Explain why this override is required.",
                        )}
                        disabled={isSubmittingWrite}
                      />
                    </label>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs border rounded"
                      style={{
                        borderColor: "var(--window-document-border)",
                        opacity: seedOverrideReason.trim().length > 0 && !isSubmittingWrite ? 1 : 0.6,
                      }}
                      disabled={seedOverrideReason.trim().length === 0 || isSubmittingWrite}
                      onClick={() => {
                        setPendingConfirmAction({
                          type: "apply_seed_override",
                          catalogAgentNumber: agentDetails.agent.catalogAgentNumber,
                          seedStatus: seedOverrideStatus,
                          reason: seedOverrideReason.trim(),
                        });
                      }}
                    >
                      {tx("details.seed.apply_override", "Apply seed override")}
                    </button>
                  </div>
                </div>
              )}

              {drawerTab === "runtime" && (
                <div className="space-y-2">
                  <DetailRow label={tx("details.runtime.status", "Runtime status")} value={agentDetails.agent.runtimeStatus} />
                  <DetailRow
                    label={tx("details.runtime.published", "Published")}
                    value={agentDetails.agent.published ? "yes" : "no"}
                  />
                  <DetailRow label={tx("details.runtime.access_modes", "Access modes")} value={agentDetails.agent.specialistAccessModes.join(", ")} />
                  <DetailRow label={tx("details.runtime.channel_affinity", "Channel affinity")} value={agentDetails.agent.channelAffinity.join(", ")} />
                  <div
                    className="border rounded p-2 space-y-2"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <p className="font-semibold">
                      {tx("details.runtime.catalog_release", "Catalog release status")}
                    </p>
                    <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {tx(
                        "details.runtime.catalog_release_help",
                        "Toggle explicit catalog visibility. This controls whether Agent Catalog storefront users can discover this entry.",
                      )}
                    </p>
                    <label className="text-[11px] flex flex-col gap-1">
                      {tx("details.runtime.required_reason", "Required reason")}
                      <textarea
                        value={publishReason}
                        onChange={(event) => setPublishReason(event.target.value)}
                        rows={2}
                        className="px-2 py-1 text-xs border rounded bg-transparent"
                        style={{ borderColor: "var(--window-document-border)" }}
                        placeholder={tx(
                          "details.runtime.required_reason_placeholder",
                          "Explain why this publish state is changing.",
                        )}
                        disabled={isSubmittingWrite}
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          opacity:
                            !agentDetails.agent.published
                            && publishReason.trim().length > 0
                            && !isSubmittingWrite
                              ? 1
                              : 0.6,
                        }}
                        disabled={
                          agentDetails.agent.published
                          || publishReason.trim().length === 0
                          || isSubmittingWrite
                        }
                        onClick={() => {
                          setPendingConfirmAction({
                            type: "set_published",
                            catalogAgentNumber: agentDetails.agent.catalogAgentNumber,
                            published: true,
                            reason: publishReason.trim(),
                          });
                        }}
                      >
                        {tx("details.runtime.publish", "Publish to catalog")}
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          opacity:
                            agentDetails.agent.published
                            && publishReason.trim().length > 0
                            && !isSubmittingWrite
                              ? 1
                              : 0.6,
                        }}
                        disabled={
                          !agentDetails.agent.published
                          || publishReason.trim().length === 0
                          || isSubmittingWrite
                        }
                        onClick={() => {
                          setPendingConfirmAction({
                            type: "set_published",
                            catalogAgentNumber: agentDetails.agent.catalogAgentNumber,
                            published: false,
                            reason: publishReason.trim(),
                          });
                        }}
                      >
                        {tx("details.runtime.unpublish", "Unpublish from catalog")}
                      </button>
                    </div>
                  </div>
                  <div
                    className="border rounded p-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
                  >
                    <p className="font-semibold flex items-center gap-1">
                      <Wrench size={12} />
                      {tx("details.runtime.promotion_policy_title", "Runtime promotion policy")}
                    </p>
                    <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {tx(
                        "details.runtime.promotion_policy_help",
                        "Runtime promotion remains an explicit follow-up path.",
                      )}
                    </p>
                  </div>
                  <div
                    className="border rounded p-2 space-y-2"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <p className="font-semibold">
                      {tx("details.runtime.tool_foundry_queue", "Tool Foundry proposal queue")}
                    </p>
                    {toolFoundryProposals === undefined ? (
                      <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {tx("details.runtime.tool_foundry_queue_loading", "Loading proposal queue...")}
                      </p>
                    ) : toolFoundryProposals.length === 0 ? (
                      <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {tx("details.runtime.tool_foundry_queue_empty", "No pending Tool Foundry proposals.")}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {toolFoundryProposals.map((proposal) => (
                          <div
                            key={proposal._id}
                            className="border rounded px-2 py-1.5 space-y-1"
                            style={{ borderColor: "var(--window-document-border)" }}
                          >
                            <p className="text-xs font-semibold">{proposal.requestedToolName}</p>
                            <p className="text-xs break-all" style={{ color: "var(--desktop-menu-text-muted)" }}>
                              {proposal.proposalKey}
                            </p>
                            <p className="text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
                              {proposal.status} | {formatDateTime(proposal.lastObservedAt)}
                            </p>
                            <div className="flex gap-1.5 pt-0.5">
                              <button
                                type="button"
                                className="px-2 py-1 text-xs border rounded"
                                style={{ borderColor: "var(--window-document-border)" }}
                                disabled={isSubmittingWrite}
                                onClick={() => void handleToolFoundryDecision(proposal, "granted")}
                              >
                                {tx("details.runtime.tool_foundry_queue_approve", "Approve")}
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 text-xs border rounded"
                                style={{ borderColor: "var(--window-document-border)" }}
                                disabled={isSubmittingWrite}
                                onClick={() => void handleToolFoundryDecision(proposal, "denied")}
                              >
                                {tx("details.runtime.tool_foundry_queue_reject", "Reject")}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === "dependencies" && (
                <div className="space-y-2">
                  <DetailRow
                    label={tx("details.dependencies.required_integrations", "Required integrations")}
                    value={
                      agentDetails.agent.requiredIntegrations.length > 0
                        ? agentDetails.agent.requiredIntegrations.join(", ")
                        : "none"
                    }
                    multiline
                  />
                  <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
                    <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                      {tx("details.dependencies.blockers", "Blockers")}
                    </p>
                    {agentDetails.agent.blockers.length === 0 ? (
                      <p>{tx("details.dependencies.none", "none")}</p>
                    ) : (
                      <div className="space-y-1">
                        {agentDetails.agent.blockers.map((blocker) => (
                          <div
                            key={blocker}
                            className="border rounded px-2 py-1 flex items-start justify-between gap-2"
                            style={{ borderColor: "var(--window-document-border)" }}
                          >
                            <p className="whitespace-pre-wrap flex-1">{blocker}</p>
                            <button
                              type="button"
                              className="px-1.5 py-0.5 text-[11px] border rounded"
                              style={{ borderColor: "var(--window-document-border)" }}
                              disabled={isSubmittingWrite}
                              onClick={() => {
                                setPendingConfirmAction({
                                  type: "remove_blocker",
                                  catalogAgentNumber: agentDetails.agent.catalogAgentNumber,
                                  blocker,
                                });
                              }}
                            >
                              {tx("details.dependencies.remove", "Remove")}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
                      <p className="font-semibold">{tx("details.dependencies.add_blocker", "Add blocker")}</p>
                      <textarea
                        value={blockerDraft}
                        onChange={(event) => setBlockerDraft(event.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 text-xs border rounded bg-transparent"
                        style={{ borderColor: "var(--window-document-border)" }}
                        placeholder={tx("details.dependencies.add_blocker_placeholder", "Add blocker note.")}
                        disabled={isSubmittingWrite}
                      />
                      <button
                        type="button"
                        className="px-2 py-1 text-xs border rounded"
                        style={{
                          borderColor: "var(--window-document-border)",
                          opacity: blockerDraft.trim().length > 0 && !isSubmittingWrite ? 1 : 0.6,
                        }}
                        disabled={blockerDraft.trim().length === 0 || isSubmittingWrite}
                        onClick={() => {
                          setPendingConfirmAction({
                            type: "add_blocker",
                            catalogAgentNumber: agentDetails.agent.catalogAgentNumber,
                            blocker: blockerDraft.trim(),
                          });
                        }}
                      >
                        {tx("details.dependencies.add_blocker", "Add blocker")}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "audit" && (
                <div className="space-y-2">
                  {(agentDetails.recentSyncRuns.length === 0 ? syncRuns.runs : agentDetails.recentSyncRuns).map((run) => (
                    <div key={run._id} className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
                      <p className="font-semibold">{run.mode}</p>
                      <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {run.status} | {formatDateTime(run.startedAt)}
                      </p>
                      <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {tx(
                          "details.audit.summary_line",
                          "Agents: {{agents}} | Done: {{done}} | Seeds full: {{seeds}} | Live: {{live}}",
                          {
                            agents: run.summary.totalAgents,
                            done: run.summary.catalogDone,
                            seeds: run.summary.seedsFull,
                            live: run.summary.runtimeLive,
                          },
                        )}
                      </p>
                      {run.drift.reasons.length > 0 && (
                        <p style={{ color: "#9a3412" }}>{run.drift.reasons.join(" | ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={pendingConfirmAction !== null}
        onClose={() => {
          if (!isSubmittingWrite) {
            setPendingConfirmAction(null);
          }
        }}
        onConfirm={handleConfirmedWrite}
        title={tx("confirmation.title", "Confirm Agent Control Write")}
        message={
          pendingConfirmAction
            ? buildAgentControlConfirmationMessage(pendingConfirmAction, datasetVersion)
            : ""
        }
        confirmText={tx("confirmation.confirm", "Confirm Write")}
        cancelText={tx("confirmation.cancel", "Cancel")}
        variant={pendingConfirmAction?.type === "remove_blocker" ? "danger" : "warning"}
        isLoading={isSubmittingWrite}
      />
      <ConfirmationModal
        isOpen={pendingRolloutConfirmAction !== null}
        onClose={() => {
          if (!isSubmittingWrite) {
            setPendingRolloutConfirmAction(null);
          }
        }}
        onConfirm={handleConfirmedRollout}
        title="Confirm Template Rollout"
        message={
          pendingRolloutConfirmAction
            ? buildRolloutConfirmationMessage(pendingRolloutConfirmAction)
            : ""
        }
        confirmText={
          pendingRolloutConfirmAction?.type === "rollout_rollback"
            ? "Confirm Rollback"
            : "Confirm Rollout"
        }
        cancelText="Cancel"
        variant={
          pendingRolloutConfirmAction?.type === "rollout_rollback"
            ? "danger"
            : "warning"
        }
        isLoading={isSubmittingWrite}
      />
      <ConfirmationModal
        isOpen={pendingTemplateLifecycleConfirmAction !== null}
        onClose={() => {
          if (!isSubmittingWrite) {
            setPendingTemplateLifecycleConfirmAction(null);
          }
        }}
        onConfirm={handleConfirmedTemplateLifecycleAction}
        title={
          pendingTemplateLifecycleConfirmAction?.type === "deprecate"
            ? "Confirm Template Deprecation"
            : "Confirm Template Publish"
        }
        message={
          pendingTemplateLifecycleConfirmAction
            ? buildTemplateLifecycleConfirmationMessage(pendingTemplateLifecycleConfirmAction)
            : ""
        }
        confirmText={
          pendingTemplateLifecycleConfirmAction?.type === "deprecate"
            ? "Confirm Deprecation"
            : "Confirm Publish"
        }
        cancelText="Cancel"
        variant={
          pendingTemplateLifecycleConfirmAction?.type === "deprecate"
            ? "danger"
            : "warning"
        }
        isLoading={isSubmittingWrite}
      />
    </div>
  );
}

function DetailRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
      <p style={{ color: "var(--desktop-menu-text-muted)" }}>{label}</p>
      <p className={multiline ? "whitespace-pre-wrap" : undefined}>{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="border rounded p-2" style={{ borderColor: "var(--window-document-border)" }}>
      <p style={{ color: "var(--desktop-menu-text-muted)" }}>{label}</p>
      <p className="font-semibold" style={{ color: "var(--window-document-text)" }}>
        {value}
      </p>
    </div>
  );
}

function toShortAccessModes(modes: string[]): string {
  if (!Array.isArray(modes) || modes.length === 0) {
    return "n/a";
  }
  return modes.join(",");
}
