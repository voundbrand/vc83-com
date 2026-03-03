"use client";

import { useEffect, useState } from "react";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type DriftStatus = "in_sync" | "docs_drift" | "code_drift" | "registry_drift";
type DrawerTab = "summary" | "tools" | "seed" | "runtime" | "dependencies" | "audit";
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

  const triggerCatalogSync = useMutation(api.ai.agentCatalogAdmin.triggerCatalogSync);
  const setAgentBlocker = useMutation(api.ai.agentCatalogAdmin.setAgentBlocker);
  const setSeedStatusOverride = useMutation(api.ai.agentCatalogAdmin.setSeedStatusOverride);
  const setSeedTemplateBinding = useMutation(api.ai.agentCatalogAdmin.setSeedTemplateBinding);
  const submitToolFoundryPromotionDecision = useMutation(
    api.ai.toolFoundry.proposalBacklog.submitProposalPromotionDecision,
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
  }, [agentDetails]);

  const driftTone = driftBadgeTone(overview?.drift.status ?? "registry_drift");

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

  if (!overview || !listAgents || !syncRuns) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="h-full p-4 flex gap-4 overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
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
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.access_modes", "Access modes")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.phase", "Phase")}</th>
                <th className="text-left px-2 py-2 border-b" style={{ borderColor: "var(--window-document-border)" }}>{tx("table.blockers", "Blockers")}</th>
              </tr>
            </thead>
            <tbody>
              {listAgents.agents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center" style={{ color: "var(--desktop-menu-text-muted)" }}>
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
            {tx(
              "pagination.showing_of",
              "Showing {{count}} of {{total}}",
              { count: listAgents.agents.length, total: listAgents.total },
            )}
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
                  <DetailRow label={tx("details.runtime.access_modes", "Access modes")} value={agentDetails.agent.specialistAccessModes.join(", ")} />
                  <DetailRow label={tx("details.runtime.channel_affinity", "Channel affinity")} value={agentDetails.agent.channelAffinity.join(", ")} />
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

function toShortAccessModes(modes: string[]): string {
  if (!Array.isArray(modes) || modes.length === 0) {
    return "n/a";
  }
  return modes.join(",");
}
