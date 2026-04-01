"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../convex/_generated/api") as { api: any };

type RiskStatus = "open" | "in_review" | "closed";
type RiskDecisionStatus = "open" | "partial" | "freigegeben" | "abgelehnt";
type OwnerGateDecision = "GO" | "NO_GO";

type RiskEvidence = {
  id: string;
  label: string;
  url?: string;
  notes?: string;
  addedAt: number;
  addedBy: string;
};

type RiskRow = {
  riskId: string;
  title: string;
  severity: "medium" | "medium_high" | "high";
  owner: string;
  description: string;
  status: RiskStatus;
  decisionStatus: RiskDecisionStatus;
  notes: string;
  blocker: boolean;
  evidence: RiskEvidence[];
  evidenceCount: number;
  lastUpdatedAt: number | null;
  workflowSignalSource?: "workflow_object" | "missing_workflow_object";
  workflowCompletenessScore?: number;
  workflowIsComplete?: boolean;
  workflowBlockers?: string[];
  workflowMissingArtifactIds?: string[];
};

type OrgGateSnapshot = {
  organizationId: string;
  organizationName: string;
  isOrgOwner: boolean;
  isSuperAdmin: boolean;
  canEdit: boolean;
  risks: RiskRow[];
  gate: {
    effectiveGateStatus: OwnerGateDecision;
    blockerIds: string[];
    blockerCount: number;
    blockers: Array<{
      riskId: string;
      code: string;
      message: string;
      source: "risk_assessment" | "workflow";
    }>;
    ownerGateDecision: OwnerGateDecision;
    ownerGateNotes: string;
    ownerGateDecidedAt: number | null;
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
  };
};

type GateEvaluationSnapshot = {
  organizationId: string;
  riskRows: RiskRow[];
  gate: OrgGateSnapshot["gate"];
  evaluatedAt: number;
  failClosed: boolean;
};

type FleetGateRow = {
  organizationId: string;
  organizationName: string;
  effectiveGateStatus: OwnerGateDecision;
  ownerGateDecision: OwnerGateDecision;
  blockerIds: string[];
  blockerCount: number;
  updatedAt: number;
};

type RiskDraft = {
  status: RiskStatus;
  decisionStatus: RiskDecisionStatus;
  notes: string;
};

interface ComplianceOrgGovernanceTabProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  isOrgOwner: boolean;
  isSuperAdmin: boolean;
  canEdit: boolean;
}

const RISK_STATUS_OPTIONS: Array<{ value: RiskStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "in_review", label: "In Review" },
  { value: "closed", label: "Closed" },
];

const RISK_DECISION_OPTIONS: Array<{ value: RiskDecisionStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "partial", label: "Partial" },
  { value: "freigegeben", label: "Freigegeben" },
  { value: "abgelehnt", label: "Abgelehnt" },
];

function formatDate(timestamp: number | null | undefined): string {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return "n/a";
  }
  return new Date(timestamp).toLocaleString();
}

function gateBadgeStyles(status: OwnerGateDecision): { background: string; color: string } {
  if (status === "GO") {
    return { background: "var(--success-bg)", color: "var(--success)" };
  }
  return { background: "var(--color-error-subtle)", color: "var(--error)" };
}

function riskStatusStyles(status: RiskStatus): { background: string; color: string } {
  if (status === "closed") {
    return { background: "var(--success-bg)", color: "var(--success)" };
  }
  if (status === "in_review") {
    return { background: "var(--warning-bg)", color: "var(--warning)" };
  }
  return { background: "var(--color-error-subtle)", color: "var(--error)" };
}

function decisionStatusStyles(status: RiskDecisionStatus): { background: string; color: string } {
  if (status === "freigegeben") {
    return { background: "var(--success-bg)", color: "var(--success)" };
  }
  if (status === "partial") {
    return { background: "var(--warning-bg)", color: "var(--warning)" };
  }
  if (status === "abgelehnt") {
    return { background: "var(--color-error-subtle)", color: "var(--error)" };
  }
  return { background: "var(--desktop-shell-accent)", color: "var(--desktop-menu-text-muted)" };
}

function blockerSourceLabel(source: "risk_assessment" | "workflow"): string {
  return source === "workflow" ? "Workflow" : "Risk assessment";
}

export function ComplianceOrgGovernanceTab({
  sessionId,
  organizationId,
  isOrgOwner,
  isSuperAdmin,
  canEdit,
}: ComplianceOrgGovernanceTabProps) {
  const hasAccess = isOrgOwner || isSuperAdmin;

  const gateSnapshot = useQuery(
    apiAny.complianceControlPlane.getOrgComplianceGate,
    hasAccess ? { sessionId, organizationId } : "skip",
  ) as OrgGateSnapshot | undefined;
  const gateEvaluation = useQuery(
    apiAny.complianceControlPlane.evaluateOrgComplianceGate,
    hasAccess ? { sessionId, organizationId } : "skip",
  ) as GateEvaluationSnapshot | undefined;

  const fleetSnapshot = useQuery(
    apiAny.complianceControlPlane.listComplianceFleetGateStatus,
    isSuperAdmin ? { sessionId } : "skip",
  ) as FleetGateRow[] | undefined;

  const saveRiskAssessment = useMutation(apiAny.complianceControlPlane.saveRiskAssessment);
  const addRiskEvidence = useMutation(apiAny.complianceControlPlane.addRiskEvidence);
  const setOwnerGateDecision = useMutation(apiAny.complianceControlPlane.setOwnerGateDecision);

  const effectiveGate = gateEvaluation?.gate ?? gateSnapshot?.gate;
  const effectiveRiskRows = gateEvaluation?.riskRows ?? gateSnapshot?.risks ?? [];

  const [selectedRiskId, setSelectedRiskId] = useState<string>("R-002");
  const [riskDrafts, setRiskDrafts] = useState<Record<string, RiskDraft>>({});
  const [ownerDecision, setOwnerDecision] = useState<OwnerGateDecision>("NO_GO");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [busyAction, setBusyAction] = useState<"risk" | "evidence" | "gate" | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveRiskRows.length === 0) {
      return;
    }
    const selectedExists = effectiveRiskRows.some((risk) => risk.riskId === selectedRiskId);
    if (!selectedExists) {
      setSelectedRiskId(effectiveRiskRows[0].riskId);
    }
  }, [effectiveRiskRows, selectedRiskId]);

  useEffect(() => {
    if (!effectiveGate) {
      return;
    }
    setOwnerDecision(effectiveGate.ownerGateDecision);
    setOwnerNotes(effectiveGate.ownerGateNotes ?? "");
  }, [effectiveGate]);

  useEffect(() => {
    setEvidenceLabel("");
    setEvidenceUrl("");
    setEvidenceNotes("");
  }, [selectedRiskId]);

  const selectedRisk = useMemo(() => {
    if (effectiveRiskRows.length === 0) {
      return null;
    }
    return effectiveRiskRows.find((risk) => risk.riskId === selectedRiskId) ?? effectiveRiskRows[0];
  }, [effectiveRiskRows, selectedRiskId]);

  const selectedRiskDraft = useMemo<RiskDraft | null>(() => {
    if (!selectedRisk) {
      return null;
    }
    return (
      riskDrafts[selectedRisk.riskId] ?? {
        status: selectedRisk.status,
        decisionStatus: selectedRisk.decisionStatus,
        notes: selectedRisk.notes ?? "",
      }
    );
  }, [selectedRisk, riskDrafts]);
  const inheritedSupportEvidenceCount = useMemo(
    () =>
      effectiveRiskRows.reduce(
        (sum, risk) =>
          sum
          + risk.evidence.filter((entry) =>
            entry.label.toLowerCase().includes("platform shared support"),
          ).length,
        0,
      ),
    [effectiveRiskRows],
  );
  const gateBlockers = useMemo(
    () => effectiveGate?.blockers ?? [],
    [effectiveGate],
  );

  const updateSelectedDraft = (updates: Partial<RiskDraft>) => {
    if (!selectedRisk || !selectedRiskDraft) {
      return;
    }
    setRiskDrafts((current) => ({
      ...current,
      [selectedRisk.riskId]: {
        status: updates.status ?? selectedRiskDraft.status,
        decisionStatus: updates.decisionStatus ?? selectedRiskDraft.decisionStatus,
        notes: typeof updates.notes === "string" ? updates.notes : selectedRiskDraft.notes,
      },
    }));
  };

  const resetMessages = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSaveRiskAssessment = async () => {
    if (!selectedRisk || !selectedRiskDraft || !canEdit) {
      return;
    }

    resetMessages();
    setBusyAction("risk");
    try {
      await saveRiskAssessment({
        sessionId,
        organizationId,
        riskId: selectedRisk.riskId,
        status: selectedRiskDraft.status,
        decisionStatus: selectedRiskDraft.decisionStatus,
        notes: selectedRiskDraft.notes,
      });
      setSuccessMessage(`Saved ${selectedRisk.riskId} assessment.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save risk assessment.";
      setErrorMessage(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddEvidence = async () => {
    if (!selectedRisk || !canEdit) {
      return;
    }

    if (!evidenceLabel.trim()) {
      setErrorMessage("Evidence label is required.");
      return;
    }

    resetMessages();
    setBusyAction("evidence");
    try {
      await addRiskEvidence({
        sessionId,
        organizationId,
        riskId: selectedRisk.riskId,
        label: evidenceLabel,
        url: evidenceUrl.trim() ? evidenceUrl : undefined,
        notes: evidenceNotes.trim() ? evidenceNotes : undefined,
      });
      setEvidenceLabel("");
      setEvidenceUrl("");
      setEvidenceNotes("");
      setSuccessMessage(`Evidence attached to ${selectedRisk.riskId}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add evidence.";
      setErrorMessage(message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveGateDecision = async () => {
    if (!canEdit) {
      return;
    }
    resetMessages();
    setBusyAction("gate");
    try {
      await setOwnerGateDecision({
        sessionId,
        organizationId,
        decision: ownerDecision,
        notes: ownerNotes,
      });
      setSuccessMessage("Owner release-gate decision updated.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to set owner gate decision.";
      setErrorMessage(message);
    } finally {
      setBusyAction(null);
    }
  };

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
              This release workflow is visible to organization owners and super admins only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (gateSnapshot === undefined || gateEvaluation === undefined || !effectiveGate) {
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
            Organization DSGVO release workflow
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Owner-managed fail-closed gate across R-002 to R-005.
          </p>
        </div>
        <div
          className="inline-flex items-center gap-2 rounded border px-2 py-1 text-xs font-semibold"
          style={{
            borderColor: "var(--win95-border)",
            ...gateBadgeStyles(effectiveGate.effectiveGateStatus),
          }}
        >
          <ShieldCheck size={14} />
          Effective gate: {effectiveGate.effectiveGateStatus}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Owner decision</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--win95-text)" }}>
            {effectiveGate.ownerGateDecision}
          </p>
        </div>
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Open blockers</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--win95-text)" }}>
            {effectiveGate.blockerCount}
          </p>
        </div>
        <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>Last owner decision</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--win95-text)" }}>
            {formatDate(effectiveGate.ownerGateDecidedAt)}
          </p>
        </div>
      </div>

      <div className="rounded border p-3 space-y-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
          Fail-closed blocker reasons
        </p>
        {gateBlockers.length > 0 ? (
          <div className="space-y-2">
            {gateBlockers.map((blocker) => (
              <div
                key={`${blocker.riskId}:${blocker.source}:${blocker.code}`}
                className="rounded border px-2 py-1.5"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
              >
                <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                  {blocker.riskId} · {blocker.code}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--neutral-gray)" }}>
                  {blocker.message}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--neutral-gray)" }}>
                  Source: {blockerSourceLabel(blocker.source)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            No unresolved blockers are currently derived by the fail-closed gate evaluator.
          </p>
        )}
      </div>

      <div className="rounded border p-3 space-y-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
          Inherited evidence posture (advisory only)
        </p>
        <div className="grid gap-2 md:grid-cols-5">
          <div className="rounded border p-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
            <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>Platform shared</p>
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              {gateSnapshot.platformSharedEvidence.availableCount}
            </p>
          </div>
          <div className="rounded border p-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
            <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>Org inherited</p>
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              {gateSnapshot.evidenceResolution.orgInheritedCount}
            </p>
          </div>
          <div className="rounded border p-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
            <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>Source orgs</p>
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              {gateSnapshot.platformSharedEvidence.sourceOrganizationCount}
            </p>
          </div>
          <div className="rounded border p-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
            <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>Last shared update</p>
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              {formatDate(gateSnapshot.platformSharedEvidence.latestUpdatedAt)}
            </p>
          </div>
          <div className="rounded border p-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
            <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>Org supporting links</p>
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              {inheritedSupportEvidenceCount}
            </p>
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Tenant-org decisions remain org-owner managed. Super-admin can mutate decisions only in platform mode on the configured platform org. Use Evidence Vault inherited rows to attach explicit supporting references per risk.
        </p>
      </div>

      {successMessage ? (
        <div className="rounded border p-2" style={{ borderColor: "var(--success)", background: "var(--success-bg)" }}>
          <p className="flex items-center gap-2 text-xs" style={{ color: "var(--success)" }}>
            <CheckCircle2 size={14} />
            {successMessage}
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded border p-2" style={{ borderColor: "var(--error)", background: "var(--color-error-subtle)" }}>
          <p className="flex items-center gap-2 text-xs" style={{ color: "var(--error)" }}>
            <AlertCircle size={14} />
            {errorMessage}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded border overflow-hidden" style={{ borderColor: "var(--win95-border)" }}>
          <table className="w-full text-left text-xs">
            <thead style={{ background: "var(--desktop-shell-accent)" }}>
              <tr>
                <th className="px-3 py-2 font-semibold">Risk</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Decision</th>
                <th className="px-3 py-2 font-semibold">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {effectiveRiskRows.map((risk) => {
                const selected = selectedRisk?.riskId === risk.riskId;
                return (
                  <tr
                    key={risk.riskId}
                    onClick={() => setSelectedRiskId(risk.riskId)}
                    className="cursor-pointer border-t"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: selected ? "var(--win95-bg-light)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-2">
                      <p className="font-semibold" style={{ color: "var(--win95-text)" }}>
                        {risk.riskId}
                      </p>
                      <p style={{ color: "var(--neutral-gray)" }}>{risk.title}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded px-1.5 py-0.5 font-semibold" style={riskStatusStyles(risk.status)}>
                        {risk.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex rounded px-1.5 py-0.5 font-semibold" style={decisionStatusStyles(risk.decisionStatus)}>
                        {risk.decisionStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                      {risk.evidenceCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          {selectedRisk && selectedRiskDraft ? (
            <div className="rounded border p-3 space-y-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                  {selectedRisk.riskId}: {selectedRisk.title}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  {selectedRisk.description}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  Owner: {selectedRisk.owner} | Severity: {selectedRisk.severity}
                </p>
                {selectedRisk.riskId === "R-003" || selectedRisk.riskId === "R-004" ? (
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    Workflow completeness: {selectedRisk.workflowCompletenessScore ?? 0}% · Source:{" "}
                    {selectedRisk.workflowSignalSource === "missing_workflow_object"
                      ? "Missing workflow record"
                      : "Workflow object"}
                    {selectedRisk.workflowBlockers && selectedRisk.workflowBlockers.length > 0
                      ? ` · Blockers: ${selectedRisk.workflowBlockers.join(", ")}`
                      : " · Blockers: none"}
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs" style={{ color: "var(--win95-text)" }}>
                  Status
                  <select
                    className="mt-1 w-full border rounded px-2 py-1 text-xs"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
                    value={selectedRiskDraft.status}
                    onChange={(event) => updateSelectedDraft({ status: event.target.value as RiskStatus })}
                    disabled={!canEdit}
                  >
                    {RISK_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs" style={{ color: "var(--win95-text)" }}>
                  Decision
                  <select
                    className="mt-1 w-full border rounded px-2 py-1 text-xs"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
                    value={selectedRiskDraft.decisionStatus}
                    onChange={(event) =>
                      updateSelectedDraft({ decisionStatus: event.target.value as RiskDecisionStatus })
                    }
                    disabled={!canEdit}
                  >
                    {RISK_DECISION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block text-xs" style={{ color: "var(--win95-text)" }}>
                Notes
                <textarea
                  className="mt-1 w-full h-20 border rounded px-2 py-1 text-xs"
                  style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", resize: "vertical" }}
                  value={selectedRiskDraft.notes}
                  onChange={(event) => updateSelectedDraft({ notes: event.target.value })}
                  disabled={!canEdit}
                />
              </label>

              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                  Last update: {formatDate(selectedRisk.lastUpdatedAt)}
                </p>
                <button
                  onClick={handleSaveRiskAssessment}
                  disabled={!canEdit || busyAction !== null}
                  className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                  style={{ background: "var(--win95-highlight)", color: "white" }}
                >
                  {busyAction === "risk" ? "Saving..." : "Save assessment"}
                </button>
              </div>
            </div>
          ) : null}

          {selectedRisk ? (
            <div className="rounded border p-3 space-y-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
              <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                Add evidence ({selectedRisk.riskId})
              </p>

              <input
                type="text"
                value={evidenceLabel}
                onChange={(event) => setEvidenceLabel(event.target.value)}
                placeholder="Evidence label"
                className="w-full border rounded px-2 py-1 text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
                disabled={!canEdit}
              />
              <input
                type="text"
                value={evidenceUrl}
                onChange={(event) => setEvidenceUrl(event.target.value)}
                placeholder="https://... (optional)"
                className="w-full border rounded px-2 py-1 text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
                disabled={!canEdit}
              />
              <textarea
                value={evidenceNotes}
                onChange={(event) => setEvidenceNotes(event.target.value)}
                placeholder="Notes (optional)"
                className="w-full h-16 border rounded px-2 py-1 text-xs"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", resize: "vertical" }}
                disabled={!canEdit}
              />

              <button
                onClick={handleAddEvidence}
                disabled={!canEdit || busyAction !== null}
                className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
                style={{ background: "var(--win95-highlight)", color: "white" }}
              >
                {busyAction === "evidence" ? "Saving..." : "Attach evidence"}
              </button>

              <div className="space-y-2 max-h-48 overflow-auto">
                {[...selectedRisk.evidence]
                  .sort((left, right) => right.addedAt - left.addedAt)
                  .slice(0, 6)
                  .map((evidence) => (
                    <div
                      key={evidence.id}
                      className="rounded border p-2"
                      style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
                    >
                      <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                        {evidence.label}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--neutral-gray)" }}>
                        {formatDate(evidence.addedAt)}
                      </p>
                      {evidence.url ? (
                        <a
                          href={evidence.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] underline"
                          style={{ color: "var(--win95-highlight)" }}
                        >
                          Open evidence link
                        </a>
                      ) : null}
                      {evidence.notes ? (
                        <p className="text-[11px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                          {evidence.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded border p-3 space-y-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
          Owner release decision
        </p>

        <div className="grid gap-2 md:grid-cols-[140px_1fr] items-start">
          <select
            value={ownerDecision}
            onChange={(event) => setOwnerDecision(event.target.value as OwnerGateDecision)}
            className="border rounded px-2 py-1 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
            disabled={!canEdit}
          >
            <option value="NO_GO">NO_GO</option>
            <option value="GO">GO</option>
          </select>
          <textarea
            value={ownerNotes}
            onChange={(event) => setOwnerNotes(event.target.value)}
            placeholder="Decision notes for audit trail"
            className="w-full h-16 border rounded px-2 py-1 text-xs"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)", resize: "vertical" }}
            disabled={!canEdit}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            GO is blocked until fail-closed blocker reasons are empty (risk status/decision + workflow blockers). Inherited platform evidence cannot auto-set GO.
          </p>
          <button
            onClick={handleSaveGateDecision}
            disabled={!canEdit || busyAction !== null}
            className="px-3 py-1.5 rounded text-xs font-semibold disabled:opacity-50"
            style={{ background: "var(--win95-highlight)", color: "white" }}
          >
            {busyAction === "gate" ? "Saving..." : "Save gate decision"}
          </button>
        </div>
      </div>

      {isSuperAdmin ? (
        <div className="rounded border p-3 space-y-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
              Super-admin fleet optics
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Read-only overview of owner-managed compliance gate posture across organizations.
            </p>
          </div>

          {fleetSnapshot === undefined ? (
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
              <Loader2 size={14} className="animate-spin" />
              Loading fleet status...
            </div>
          ) : (
            <div className="rounded border overflow-hidden" style={{ borderColor: "var(--win95-border)" }}>
              <table className="w-full text-left text-xs">
                <thead style={{ background: "var(--desktop-shell-accent)" }}>
                  <tr>
                    <th className="px-3 py-2 font-semibold">Organization</th>
                    <th className="px-3 py-2 font-semibold">Effective gate</th>
                    <th className="px-3 py-2 font-semibold">Owner decision</th>
                    <th className="px-3 py-2 font-semibold">Blockers</th>
                    <th className="px-3 py-2 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {fleetSnapshot.map((row) => (
                    <tr key={row.organizationId} className="border-t" style={{ borderColor: "var(--win95-border)" }}>
                      <td className="px-3 py-2" style={{ color: "var(--win95-text)" }}>
                        {row.organizationName}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded px-1.5 py-0.5 font-semibold" style={gateBadgeStyles(row.effectiveGateStatus)}>
                          {row.effectiveGateStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                        {row.ownerGateDecision}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                        {row.blockerCount > 0 ? row.blockerIds.join(", ") : "none"}
                      </td>
                      <td className="px-3 py-2" style={{ color: "var(--neutral-gray)" }}>
                        {formatDate(row.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
