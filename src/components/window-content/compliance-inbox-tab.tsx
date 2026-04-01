"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  ListChecks,
  Loader2,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { useWindowManager } from "@/hooks/use-window-manager";
import { AIChatWindow } from "@/components/window-content/ai-chat-window";
import { getVoiceAssistantWindowContract } from "@/components/window-content/ai-chat-window/voice-assistant-contract";
import {
  ComplianceInboxWizard,
  type ComplianceInboxWizardAction,
} from "./compliance-inbox-wizard";
import { ComplianceAvvOutreachPanel } from "./compliance-avv-outreach-panel";

// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../convex/_generated/api") as { api: any };

type PlannerPriority = "critical" | "high" | "medium";
type PlannerEvidenceSource = "platform_shared" | "org_inherited" | "org_local";
type PlannerAction = {
  actionId: string;
  order: number;
  type: string;
  priority: PlannerPriority;
  riskId: string | null;
  title: string;
  reason: string;
  dueAt: number | null;
  requiredArtifactLabel?: string;
  evidenceTitle?: string;
  evidenceSource?: PlannerEvidenceSource;
};

type PlannerRiskCoverage = {
  riskId: string;
  requiredArtifactCount: number;
  satisfiedArtifactCount: number;
  missingArtifactIds: string[];
  platformSharedSupportingCount: number;
  orgInheritedSupportingCount: number;
  inheritedSupportingCount: number;
  inheritedSupportingTitles: string[];
};

type AvvOutreachState =
  | "draft"
  | "pending_confirmation"
  | "queued"
  | "sent"
  | "awaiting_response"
  | "response_received"
  | "approved"
  | "rejected"
  | "escalated"
  | "closed_blocked";

type AvvOutreachRow = {
  dossierObjectId: string;
  providerName: string | null;
  providerEmail: string | null;
  state: AvvOutreachState;
  stateReason: string | null;
  slaFirstDueAt: number | null;
  slaReminderAt: number | null;
  slaEscalationAt: number | null;
  lastContactedAt: number | null;
  respondedAt: number | null;
  approvedAt: number | null;
  rejectedAt: number | null;
  reminderAlertCount: number;
  lastReminderAlertAt: number | null;
  nextReminderAlertAt: number | null;
  escalationAlertedAt: number | null;
  linkedEvidenceObjectIds: string[];
  contractValid: boolean;
  validationErrors: string[];
  updatedAt: number;
  createdAt: number;
};

type AvvOutreachSummary = {
  total: number;
  invalidCount: number;
  openCount: number;
  overdueCount: number;
  awaitingResponseCount: number;
  reminderDueCount: number;
  escalationDueCount: number;
  nextDueAt: number | null;
  byState: Record<AvvOutreachState, number>;
};

type PlannerSnapshot = {
  organizationName: string;
  isOrgOwner: boolean;
  isSuperAdmin: boolean;
  canEdit: boolean;
  gate: {
    effectiveGateStatus: "GO" | "NO_GO";
    blockerCount: number;
  };
  planner: {
    actions: PlannerAction[];
    nextAction: PlannerAction | null;
    riskCoverage: PlannerRiskCoverage[];
    summary: {
      totalActions: number;
      criticalActions: number;
      highActions: number;
      mediumActions: number;
      blockerRiskIds: string[];
      dueReviewCount: number;
      overdueRetentionCount: number;
      invalidEvidenceCount: number;
      missingArtifactCount: number;
    };
  };
  avvOutreach: {
    rows: AvvOutreachRow[];
    summary: AvvOutreachSummary;
  };
  platformSharedEvidence: {
    availableCount: number;
    latestUpdatedAt: number | null;
    sourceOrganizationCount: number;
  };
  evidenceResolution: {
    resolvedCount: number;
    hiddenCount: number;
    orgLocalCount: number;
    orgInheritedCount: number;
    platformSharedCount: number;
    invalidOrganizationEvidenceCount: number;
  };
};

interface ComplianceInboxTabProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  isOrgOwner: boolean;
  isSuperAdmin: boolean;
}

function encodeUtf8Base64(value: unknown): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return window.btoa(binary);
  } catch {
    return null;
  }
}

function formatDate(timestamp: number | null | undefined): string {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return "No due date";
  }
  return new Date(timestamp).toLocaleString();
}

function priorityStyles(priority: PlannerPriority): { background: string; color: string } {
  if (priority === "critical") {
    return { background: "var(--color-error-subtle)", color: "var(--error)" };
  }
  if (priority === "high") {
    return { background: "var(--warning-bg)", color: "var(--warning)" };
  }
  return { background: "var(--desktop-shell-accent)", color: "var(--desktop-menu-text-muted)" };
}

function gateStyles(status: "GO" | "NO_GO"): { background: string; color: string } {
  if (status === "GO") {
    return { background: "var(--success-bg)", color: "var(--success)" };
  }
  return { background: "var(--color-error-subtle)", color: "var(--error)" };
}

function evidenceSourceLabel(source: PlannerEvidenceSource): string {
  if (source === "platform_shared") {
    return "Platform shared";
  }
  if (source === "org_inherited") {
    return "Org inherited";
  }
  return "Org local";
}

function evidenceSourceStyles(source: PlannerEvidenceSource): { background: string; color: string } {
  if (source === "platform_shared") {
    return { background: "var(--desktop-shell-accent)", color: "var(--desktop-menu-text-muted)" };
  }
  if (source === "org_inherited") {
    return { background: "var(--warning-bg)", color: "var(--warning)" };
  }
  return { background: "var(--success-bg)", color: "var(--success)" };
}

export function ComplianceInboxTab({
  sessionId,
  organizationId,
  isOrgOwner,
  isSuperAdmin,
}: ComplianceInboxTabProps) {
  const { openWindow } = useWindowManager();
  const hasAccess = isOrgOwner || isSuperAdmin;
  const snapshot = useQuery(
    apiAny.complianceControlPlane.getComplianceInboxPlanner,
    hasAccess ? { sessionId, organizationId } : "skip",
  ) as PlannerSnapshot | undefined;
  const canEdit = snapshot?.canEdit ?? false;
  const readOnlyReason = !canEdit
    ? isSuperAdmin
      ? "Read-only mode: super-admin edits are enabled only in Platform mode for the configured platform organization."
      : "Read-only mode: only organization owners can save wizard checkpoints or execute outreach mutations."
    : null;
  const actions = snapshot?.planner.actions ?? [];
  const summary = snapshot?.planner.summary ?? {
    totalActions: 0,
    criticalActions: 0,
    highActions: 0,
    mediumActions: 0,
    blockerRiskIds: [],
    dueReviewCount: 0,
    overdueRetentionCount: 0,
    invalidEvidenceCount: 0,
    missingArtifactCount: 0,
  };
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const selectedAction = useMemo<ComplianceInboxWizardAction | null>(() => {
    if (!snapshot || actions.length === 0) {
      return null;
    }
    const preferred = selectedActionId
      ? actions.find((action) => action.actionId === selectedActionId)
      : null;
    const resolved = preferred ?? snapshot.planner.nextAction ?? actions[0];
    return resolved
      ? {
          actionId: resolved.actionId,
          riskId: resolved.riskId,
          title: resolved.title,
          reason: resolved.reason,
          requiredArtifactLabel: resolved.requiredArtifactLabel,
        }
      : null;
  }, [actions, selectedActionId, snapshot]);
  const riskCoverageById = useMemo(() => {
    const coverageRows = snapshot?.planner.riskCoverage ?? [];
    return new Map(coverageRows.map((row) => [row.riskId, row]));
  }, [snapshot]);
  const platformSharedEvidence = snapshot?.platformSharedEvidence ?? {
    availableCount: 0,
    latestUpdatedAt: null,
    sourceOrganizationCount: 0,
  };
  const evidenceResolution = snapshot?.evidenceResolution ?? {
    resolvedCount: 0,
    hiddenCount: 0,
    orgLocalCount: 0,
    orgInheritedCount: 0,
    platformSharedCount: 0,
    invalidOrganizationEvidenceCount: 0,
  };
  const avvOutreach = snapshot?.avvOutreach ?? {
    rows: [],
    summary: {
      total: 0,
      invalidCount: 0,
      openCount: 0,
      overdueCount: 0,
      awaitingResponseCount: 0,
      reminderDueCount: 0,
      escalationDueCount: 0,
      nextDueAt: null,
      byState: {
        draft: 0,
        pending_confirmation: 0,
        queued: 0,
        sent: 0,
        awaiting_response: 0,
        response_received: 0,
        approved: 0,
        rejected: 0,
        escalated: 0,
        closed_blocked: 0,
      },
    },
  };

  const openComplianceAgent = () => {
    if (!snapshot) {
      return;
    }
    const encodedPayload = encodeUtf8Base64({
      contractVersion: "compliance_inbox_chat_context_v1",
      requestedAt: Date.now(),
      organizationId: String(organizationId),
      organizationName: snapshot.organizationName,
      canEdit,
      gateStatus: snapshot.gate.effectiveGateStatus,
      gateBlockerCount: snapshot.gate.blockerCount,
      summary: {
        totalActions: summary.totalActions,
        criticalActions: summary.criticalActions,
        highActions: summary.highActions,
        blockerRiskIds: summary.blockerRiskIds,
        invalidEvidenceCount: summary.invalidEvidenceCount,
        missingArtifactCount: summary.missingArtifactCount,
      },
      selectedAction: selectedAction
        ? {
            actionId: selectedAction.actionId,
            riskId: selectedAction.riskId,
            title: selectedAction.title,
            reason: selectedAction.reason,
            requiredArtifactLabel: selectedAction.requiredArtifactLabel ?? null,
          }
        : null,
    });
    const openContext = encodedPayload ? `compliance_inbox:${encodedPayload}` : "compliance_inbox";
    const aiAssistantWindowContract = getVoiceAssistantWindowContract("ai-assistant");
    const sourceOrganizationId = String(organizationId);

    openWindow(
      aiAssistantWindowContract.windowId,
      aiAssistantWindowContract.title,
      <AIChatWindow
        initialLayoutMode="slick"
        initialPanel="compliance-inbox"
        openContext={openContext}
        sourceSessionId={sessionId}
        sourceOrganizationId={sourceOrganizationId}
      />,
      aiAssistantWindowContract.position,
      aiAssistantWindowContract.size,
      aiAssistantWindowContract.titleKey,
      aiAssistantWindowContract.iconId,
      {
        initialLayoutMode: "slick",
        initialPanel: "compliance-inbox",
        openContext,
        sourceSessionId: sessionId,
        sourceOrganizationId,
      },
    );
  };

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    if (actions.length === 0) {
      setSelectedActionId(null);
      return;
    }
    if (!selectedActionId || !actions.some((action) => action.actionId === selectedActionId)) {
      setSelectedActionId(snapshot.planner.nextAction?.actionId ?? actions[0].actionId);
    }
  }, [actions, selectedActionId, snapshot]);

  if (!hasAccess) {
    return (
      <div
        className="p-4 rounded border"
        style={{ borderColor: "var(--warning)", background: "var(--warning-bg)" }}
      >
        <div className="flex items-start gap-2">
          <ShieldAlert size={18} style={{ color: "var(--warning)" }} className="mt-0.5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
              Owner or super-admin access required
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Compliance Inbox is available for organization owners and super admins only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (snapshot === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            Compliance Inbox
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Deterministic next-action queue for risks R-002 to R-005.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openComplianceAgent}
            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            <Sparkles size={12} />
            Agent assist
          </button>
          <div
            className="inline-flex items-center gap-2 rounded border px-2 py-1 text-xs font-semibold"
            style={{
              borderColor: "var(--win95-border)",
              ...gateStyles(snapshot.gate.effectiveGateStatus),
            }}
          >
            <ListChecks size={14} />
            Gate: {snapshot.gate.effectiveGateStatus}
          </div>
        </div>
      </div>

      {readOnlyReason ? (
        <div
          className="rounded border p-3 text-xs"
          style={{ borderColor: "var(--warning)", background: "var(--warning-bg)", color: "var(--warning)" }}
        >
          {readOnlyReason}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Queued actions</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--win95-text)" }}>
            {summary.totalActions}
          </p>
        </div>
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Critical</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--error)" }}>
            {summary.criticalActions}
          </p>
        </div>
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>High</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--warning)" }}>
            {summary.highActions}
          </p>
        </div>
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Blocker risks</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--win95-text)" }}>
            {summary.blockerRiskIds.length}
          </p>
        </div>
      </div>

      {(platformSharedEvidence.availableCount > 0 || evidenceResolution.orgInheritedCount > 0) ? (
        <div
          className="rounded border p-3"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
            Inherited evidence context
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Platform/shared evidence is visible for support only. Org-owner conformity decisions remain local and explicit.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
            <span>Platform shared: {platformSharedEvidence.availableCount}</span>
            <span>Org inherited: {evidenceResolution.orgInheritedCount}</span>
            <span>Source orgs: {platformSharedEvidence.sourceOrganizationCount}</span>
            <span>Last shared update: {formatDate(platformSharedEvidence.latestUpdatedAt)}</span>
          </div>
        </div>
      ) : null}

      <ComplianceAvvOutreachPanel
        sessionId={sessionId}
        organizationId={organizationId}
        canEdit={canEdit}
        rows={avvOutreach.rows}
        summary={avvOutreach.summary}
      />

      {actions.length === 0 ? (
        <div
          className="rounded border p-4"
          style={{ borderColor: "var(--success)", background: "var(--success-bg)" }}
        >
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} style={{ color: "var(--success)" }} className="mt-0.5" />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--success)" }}>
                No pending inbox actions
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--win95-text)" }}>
                No new deterministic actions are required right now. Keep evidence reviews current to prevent regression to `NO_GO`.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {actions.map((action) => {
              const selected = selectedActionId === action.actionId;
              const riskCoverage = action.riskId ? riskCoverageById.get(action.riskId) : null;
              return (
                <button
                  key={action.actionId}
                  onClick={() => setSelectedActionId(action.actionId)}
                  className="w-full rounded border p-3 text-left"
                  style={{
                    borderColor: selected ? "var(--win95-highlight)" : "var(--win95-border)",
                    background: selected ? "var(--win95-bg-light)" : "var(--win95-surface)",
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded-full border flex items-center justify-center text-xs font-semibold"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--desktop-shell-accent)",
                          color: "var(--win95-text)",
                        }}
                      >
                        {action.order}
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                        {action.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span
                        className="rounded border px-2 py-0.5 font-semibold"
                        style={{
                          borderColor: "var(--win95-border)",
                          ...priorityStyles(action.priority),
                        }}
                      >
                        {action.priority.toUpperCase()}
                      </span>
                      {action.riskId ? (
                        <span
                          className="rounded border px-2 py-0.5 font-semibold"
                          style={{
                            borderColor: "var(--win95-border)",
                            background: "var(--desktop-shell-accent)",
                            color: "var(--desktop-menu-text-muted)",
                          }}
                        >
                          {action.riskId}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                    {action.reason}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} />
                      {formatDate(action.dueAt)}
                    </span>
                    {action.requiredArtifactLabel ? (
                      <span>Required: {action.requiredArtifactLabel}</span>
                    ) : null}
                    {action.evidenceTitle ? (
                      <span>Evidence: {action.evidenceTitle}</span>
                    ) : null}
                    {action.evidenceSource ? (
                      <span
                        className="rounded border px-2 py-0.5 font-semibold"
                        style={{
                          borderColor: "var(--win95-border)",
                          ...evidenceSourceStyles(action.evidenceSource),
                        }}
                      >
                        Source: {evidenceSourceLabel(action.evidenceSource)}
                      </span>
                    ) : null}
                    {riskCoverage && riskCoverage.inheritedSupportingCount > 0 ? (
                      <span
                        className="rounded border px-2 py-0.5 font-semibold"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--desktop-shell-accent)",
                          color: "var(--desktop-menu-text-muted)",
                        }}
                      >
                        Inherited support: {riskCoverage.inheritedSupportingCount}
                      </span>
                    ) : null}
                  </div>

                  {riskCoverage && riskCoverage.inheritedSupportingTitles.length > 0 ? (
                    <p className="mt-2 text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                      Inherited evidence refs: {riskCoverage.inheritedSupportingTitles.join(", ")}
                    </p>
                  ) : null}

                  {action.type === "missing_evidence" && riskCoverage && riskCoverage.inheritedSupportingCount > 0 ? (
                    <p className="mt-1 text-[11px]" style={{ color: "var(--warning)" }}>
                      Inherited evidence is advisory. Attach org evidence or explicit org adoption context to clear blockers.
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          <ComplianceInboxWizard
            sessionId={sessionId}
            organizationId={organizationId}
            canEdit={canEdit}
            action={selectedAction}
            onComplete={() => {
              // Let planner re-select deterministic next action after mutation-backed workflow completion.
              setSelectedActionId(null);
            }}
          />
        </div>
      )}

      {snapshot.gate.effectiveGateStatus === "NO_GO" && summary.totalActions > 0 ? (
        <div
          className="rounded border p-3"
          style={{ borderColor: "var(--error)", background: "var(--color-error-subtle)" }}
        >
          <p className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--error)" }}>
            <AlertCircle size={14} />
            Fail-closed guardrail active: unresolved inbox items keep gate status at `NO_GO`.
          </p>
        </div>
      ) : null}
    </div>
  );
}
