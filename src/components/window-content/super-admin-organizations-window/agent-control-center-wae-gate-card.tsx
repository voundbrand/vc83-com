"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type WaeGateTemplateContext = {
  templateId: string;
  templateName: string;
  templateOrganizationId: string;
  templateVersionId: string;
  templateVersionTag: string;
  templateLifecycleStatus: string;
  templateVersionLifecycleStatus: string;
};

type WaeGateArtifact = {
  status: "pass" | "fail";
  reasonCode: string;
  templateId: string;
  templateVersionId: string;
  templateVersionTag: string;
  runId: string;
  suiteKeyHash: string;
  scenarioMatrixContractVersion: string;
  recordedAt: number;
  freshnessWindowMs: number;
  score: {
    verdict: "passed" | "failed" | "blocked";
    decision: "proceed" | "hold";
    resultLabel: "PASS" | "FAIL";
    weightedScore: number;
    failedMetrics: string[];
    warnings: string[];
    blockedReasons: string[];
  };
  scenarioCoverage: {
    totalScenarios: number;
    runnableScenarios: number;
    skippedScenarios: number;
    passedScenarios: number;
    failedScenarios: number;
  };
  criticalReasonCodeBudget: {
    observedCount: number;
    observedReasonCodes: string[];
  };
};

type WaeGateEvaluation = {
  allowed: boolean;
  reasonCode?: string;
  message?: string;
  ageMs?: number;
};

type TemplateCertificationArtifact = {
  status: "certified" | "rejected";
  reasonCode: string;
  recordedAt: number;
  dependencyManifest: {
    dependencyDigest: string;
  };
  riskAssessment: {
    tier: "low" | "medium" | "high";
    requiredVerification: string[];
  };
  evidenceSources: Array<{
    sourceType: string;
    summary: string;
  }>;
};

type TemplateCertificationEvaluation = {
  allowed: boolean;
  reasonCode?: string;
  message?: string;
  autoCertificationEligible: boolean;
  riskAssessment: {
    tier: "low" | "medium" | "high";
    requiredVerification: string[];
  } | null;
  dependencyManifest: {
    dependencyDigest: string;
  } | null;
  certification: TemplateCertificationArtifact | null;
};

type TemplateCertificationAlertRecommendation = {
  code: "certification_blocked" | "default_evidence_missing" | "policy_drift_detected";
  severity: "critical" | "warning";
  summary: string;
  ownerUserIds: string[];
  ownerTeamIds: string[];
  alertChannels: string[];
};

type TemplateCertificationAlertDispatch = {
  contractVersion: string;
  templateId: string;
  templateVersionId: string;
  templateVersionTag: string;
  dependencyDigest: string;
  recommendationCode: "certification_blocked" | "default_evidence_missing" | "policy_drift_detected";
  recommendationSeverity: "critical" | "warning";
  recommendationSummary: string;
  channel: string;
  deliveryStatus:
    | "delivered_in_app"
    | "queued"
    | "suppressed_duplicate"
    | "unsupported_channel"
    | "dispatched"
    | "dispatch_failed"
    | "throttled"
    | "acknowledged";
  dedupeKey: string;
  ownerUserIds: string[];
  ownerTeamIds: string[];
  recordedAt: number;
  recordedByUserId: string;
  workerStatus?:
    | "pending"
    | "dispatched"
    | "retry_scheduled"
    | "failed_terminal"
    | "throttled"
    | "acknowledged";
  attemptCount?: number;
  maxAttempts?: number;
  nextAttemptAt?: number;
  lastAttemptAt?: number;
  dispatchedAt?: number;
  acknowledgedAt?: number;
  acknowledgedByUserId?: string;
  acknowledgementNote?: string;
  throttleUntil?: number;
  throttleReason?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
};

type TemplateCertificationAlertDispatchControl = {
  maxAttempts: number;
  retryDelayMs: number;
  channels: Record<
    "slack" | "pagerduty" | "email",
    {
      enabled: boolean;
      target: string | null;
    }
  >;
  throttle: Record<
    "slack" | "pagerduty" | "email",
    {
      windowMs: number;
      maxDispatches: number;
    }
  >;
  credentialGovernance: Record<
    "slack" | "pagerduty" | "email",
    {
      requireDedicatedCredentials: boolean;
      allowInlineTargetCredentials: boolean;
      runbookUrl: string | null;
    }
  >;
  strictMode: {
    enabled: boolean;
    rolloutMode: "manual" | "auto_promote_ready_channels";
    guardrailMode: "advisory" | "enforced";
    notifyOnPolicyDrift: boolean;
  };
};

type TemplateCertificationAlertCredentialHealthStatus = {
  ready: boolean;
  policyCompliant: boolean;
  credentialSource: string;
  reasonCode?: string;
  message: string;
  runbookUrl?: string;
};

type TemplateCertificationAlertPolicyDriftIssue = {
  code: string;
  scope: "credential_governance" | "requirement_authoring";
  channel?: "slack" | "pagerduty" | "email";
  tier?: "low" | "medium" | "high";
  message: string;
};

type TemplateCertificationAlertPolicyDriftStatus = {
  strictModeEnabled: boolean;
  detected: boolean;
  issueCount: number;
  issues: TemplateCertificationAlertPolicyDriftIssue[];
};

type TemplateCertificationAlertStrictModeRolloutStatus = {
  enabled: boolean;
  rolloutMode: "manual" | "auto_promote_ready_channels";
  guardrailMode: "advisory" | "enforced";
  promotedChannels: Array<"slack" | "pagerduty" | "email">;
  blockedChannels: Array<{
    channel: "slack" | "pagerduty" | "email";
    reasonCode?: string;
    message: string;
  }>;
};

type TemplateCertificationAutomationPolicy = {
  adoptionMode: "manual" | "shadow" | "enforced";
  ownerUserIds: string[];
  ownerTeamIds: string[];
  alertChannels: string[];
  alertOnCertificationBlocked: boolean;
  alertOnMissingDefaultEvidence: boolean;
};

type CurrentDefaultTemplateWaeGateStatusResponse = {
  generatedAt: number;
  template: WaeGateTemplateContext;
  certification: TemplateCertificationArtifact | null;
  certificationEvaluation: TemplateCertificationEvaluation;
  riskAssessment: {
    tier: "low" | "medium" | "high";
    requiredVerification: string[];
  } | null;
  dependencyManifest: {
    dependencyDigest: string;
  } | null;
  autoCertificationEligible: boolean;
  alertOperations: {
    templateFamily?: string;
    automationPolicyScope: "global" | "family";
    automationPolicy: TemplateCertificationAutomationPolicy;
    dispatchControl: TemplateCertificationAlertDispatchControl;
    dispatchControlSource: "default" | "platform_setting";
    credentialHealth: Record<
      "slack" | "pagerduty" | "email",
      TemplateCertificationAlertCredentialHealthStatus
    >;
    policyDrift: TemplateCertificationAlertPolicyDriftStatus;
    strictModeRollout: TemplateCertificationAlertStrictModeRolloutStatus;
    defaultEvidenceSources: string[];
    missingDefaultEvidenceSources: string[];
    alertRecommendations: TemplateCertificationAlertRecommendation[];
    recentDispatches: TemplateCertificationAlertDispatch[];
  };
  gate: WaeGateArtifact | null;
  evaluation: WaeGateEvaluation;
  evalCommands: string[];
  bundlePaths: {
    runRecord: string;
    scenarioRecords: string;
  };
};

type WaeGatePreviewResponse = {
  template: WaeGateTemplateContext;
  artifact: WaeGateArtifact;
  certification: TemplateCertificationArtifact;
  canRecord: boolean;
};

type ComplianceFleetGateRow = {
  organizationId: string;
  organizationName: string;
  effectiveGateStatus: "GO" | "NO_GO";
  ownerGateDecision: "GO" | "NO_GO";
  blockerIds: string[];
  blockerCount: number;
  platformSharedEvidenceAvailableCount: number;
  avvOutreachOverdueCount: number;
  updatedAt: number;
};

function parseJsonObjectOrFirstJsonLine(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Run record input is empty.");
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Run record must be a JSON object.");
    }
    return parsed;
  } catch {
    const firstLine = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (!firstLine) {
      throw new Error("Run record input is empty.");
    }
    const parsed = JSON.parse(firstLine);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Run record must be a JSON object.");
    }
    return parsed;
  }
}

function parseJsonArrayOrJsonLines(text: string): unknown[] {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Scenario records input is empty.");
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === "object") {
      return [parsed];
    }
    throw new Error("Scenario records must be a JSON array or JSONL payload.");
  } catch {
    const rows = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line));
    if (rows.length === 0) {
      throw new Error("Scenario records input is empty.");
    }
    return rows;
  }
}

function formatDateTime(value?: number): string {
  if (!value || !Number.isFinite(value)) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

export function AgentControlCenterWaeGateCard() {
  const { sessionId, isSuperAdmin } = useAuth();
  const [waeRunRecordDraft, setWaeRunRecordDraft] = useState("");
  const [waeScenarioRecordsDraft, setWaeScenarioRecordsDraft] = useState("");
  const [waeGateMessage, setWaeGateMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [waeGatePreview, setWaeGatePreview] = useState<WaeGatePreviewResponse | null>(null);
  const [isPreviewingWaeGate, setIsPreviewingWaeGate] = useState(false);
  const [isRecordingWaeGate, setIsRecordingWaeGate] = useState(false);
  const [activeAlertDispatchActionKey, setActiveAlertDispatchActionKey] = useState<string | null>(null);

  const previewCurrentDefaultTemplateWaeRolloutGate = useMutation(
    api.ai.agentCatalogAdmin.previewCurrentDefaultTemplateWaeRolloutGate,
  );
  const recordCurrentDefaultTemplateWaeRolloutGate = useMutation(
    api.ai.agentCatalogAdmin.recordCurrentDefaultTemplateWaeRolloutGate,
  );
  const acknowledgeTemplateCertificationAlertDispatch = useMutation(
    api.ai.agentCatalogAdmin.acknowledgeTemplateCertificationAlertDispatch,
  );
  const throttleTemplateCertificationAlertDispatch = useMutation(
    api.ai.agentCatalogAdmin.throttleTemplateCertificationAlertDispatch,
  );
  const currentDefaultTemplateWaeGateStatus = useQuery(
    api.ai.agentCatalogAdmin.getCurrentDefaultTemplateWaeRolloutGateStatus,
    sessionId && isSuperAdmin ? { sessionId } : "skip",
  ) as CurrentDefaultTemplateWaeGateStatusResponse | undefined;
  const complianceFleetGateStatus = useQuery(
    api.complianceControlPlane.listComplianceFleetGateStatus,
    sessionId && isSuperAdmin ? { sessionId } : "skip",
  ) as ComplianceFleetGateRow[] | undefined;

  const currentWaeGateTemplate = currentDefaultTemplateWaeGateStatus?.template ?? null;
  const currentCertification = currentDefaultTemplateWaeGateStatus?.certification ?? null;
  const currentCertificationEvaluation =
    currentDefaultTemplateWaeGateStatus?.certificationEvaluation ?? null;
  const currentWaeGateEvaluation = currentDefaultTemplateWaeGateStatus?.evaluation ?? null;
  const currentWaeGateArtifact = currentDefaultTemplateWaeGateStatus?.gate ?? null;
  const currentAlertOperations = currentDefaultTemplateWaeGateStatus?.alertOperations ?? null;
  const complianceFleetRows = Array.isArray(complianceFleetGateStatus)
    ? complianceFleetGateStatus
    : [];
  const complianceFleetSummary = {
    totalOrgs: complianceFleetRows.length,
    noGoOrgs: complianceFleetRows.filter((row) => row.effectiveGateStatus === "NO_GO").length,
    goOrgs: complianceFleetRows.filter((row) => row.effectiveGateStatus === "GO").length,
    blockedOrgs: complianceFleetRows.filter((row) => row.blockerCount > 0).length,
  };
  const manualWaeEvidenceRequired = Boolean(
    currentDefaultTemplateWaeGateStatus?.riskAssessment?.requiredVerification.includes("wae_eval"),
  );
  const waeGateBusy = isPreviewingWaeGate || isRecordingWaeGate;
  const waeGateRecordDisabledReason = waeGateBusy
    ? "WAE gate action already in progress."
    : !manualWaeEvidenceRequired
      ? "This version is low risk. It can be auto-certified through lifecycle actions without manual WAE import."
    : !waeGatePreview
      ? "Preview a WAE bundle first."
      : !waeGatePreview.canRecord
        ? "Only passing WAE bundles can be recorded as certification evidence."
        : null;

  const handleAcknowledgeDispatch = async (dispatch: TemplateCertificationAlertDispatch) => {
    if (!sessionId || !currentWaeGateTemplate || !dispatch.dedupeKey) {
      return;
    }
    const actionKey = `ack:${dispatch.dedupeKey}`;
    try {
      setActiveAlertDispatchActionKey(actionKey);
      await acknowledgeTemplateCertificationAlertDispatch({
        sessionId,
        templateVersionId: currentWaeGateTemplate.templateVersionId,
        dedupeKey: dispatch.dedupeKey,
        acknowledgementNote: "Acknowledged from super-admin alert operations panel.",
      });
      setWaeGateMessage({
        type: "success",
        text: `Acknowledged ${dispatch.channel} dispatch ${dispatch.dedupeKey}.`,
      });
    } catch (error) {
      setWaeGateMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to acknowledge alert dispatch.",
      });
    } finally {
      setActiveAlertDispatchActionKey((current) => (current === actionKey ? null : current));
    }
  };

  const handleSnoozeDispatch = async (
    dispatch: TemplateCertificationAlertDispatch,
    throttleMinutes: number,
  ) => {
    if (!sessionId || !currentWaeGateTemplate || !dispatch.dedupeKey) {
      return;
    }
    const actionKey = `snooze:${dispatch.dedupeKey}:${throttleMinutes}`;
    try {
      setActiveAlertDispatchActionKey(actionKey);
      await throttleTemplateCertificationAlertDispatch({
        sessionId,
        templateVersionId: currentWaeGateTemplate.templateVersionId,
        dedupeKey: dispatch.dedupeKey,
        throttleMinutes,
        reason: "super_admin_snooze",
      });
      setWaeGateMessage({
        type: "success",
        text: `Snoozed ${dispatch.channel} dispatch ${dispatch.dedupeKey} for ${throttleMinutes}m.`,
      });
    } catch (error) {
      setWaeGateMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to throttle alert dispatch.",
      });
    } finally {
      setActiveAlertDispatchActionKey((current) => (current === actionKey ? null : current));
    }
  };

  const handleImportWaeGateFile = async (
    kind: "run" | "scenarios",
    fileList: FileList | null,
  ) => {
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      if (kind === "run") {
        setWaeRunRecordDraft(text);
      } else {
        setWaeScenarioRecordsDraft(text);
      }
      setWaeGatePreview(null);
      setWaeGateMessage({
        type: "success",
        text:
          kind === "run"
            ? `Loaded run record file ${file.name}.`
            : `Loaded scenario records file ${file.name}.`,
      });
    } catch (error) {
      setWaeGateMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to read imported WAE bundle file.",
      });
    }
  };

  const handlePreviewWaeRolloutGate = async () => {
    if (!sessionId) {
      return;
    }
    try {
      const waeRunRecord = parseJsonObjectOrFirstJsonLine(waeRunRecordDraft);
      const waeScenarioRecords = parseJsonArrayOrJsonLines(waeScenarioRecordsDraft);
      setIsPreviewingWaeGate(true);
      setWaeGateMessage({
        type: "info",
        text: "Scoring imported WAE bundle against the current protected operator version...",
      });
      const preview = await previewCurrentDefaultTemplateWaeRolloutGate({
        sessionId,
        waeRunRecord,
        waeScenarioRecords,
      }) as WaeGatePreviewResponse;
      setWaeGatePreview(preview);
      setWaeGateMessage({
        type: preview.canRecord ? "success" : "error",
        text: preview.canRecord
          ? `Bundle passes for ${preview.template.templateVersionTag}. Ready to record certification evidence.`
          : `Bundle does not pass for ${preview.template.templateVersionTag}. Fix eval failures before recording certification.`,
      });
    } catch (error) {
      setWaeGatePreview(null);
      setWaeGateMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to preview WAE rollout gate bundle.",
      });
    } finally {
      setIsPreviewingWaeGate(false);
    }
  };

  const handleRecordWaeRolloutGate = async () => {
    if (!sessionId) {
      return;
    }
    try {
      const waeRunRecord = parseJsonObjectOrFirstJsonLine(waeRunRecordDraft);
      const waeScenarioRecords = parseJsonArrayOrJsonLines(waeScenarioRecordsDraft);
      setIsRecordingWaeGate(true);
      setWaeGateMessage({
        type: "info",
        text: "Recording WAE rollout gate for the current protected operator version...",
      });
      const result = await recordCurrentDefaultTemplateWaeRolloutGate({
        sessionId,
        waeRunRecord,
        waeScenarioRecords,
      }) as {
        template: WaeGateTemplateContext;
        artifact: WaeGateArtifact;
        certificationArtifact: TemplateCertificationArtifact;
        certificationEvaluation: TemplateCertificationEvaluation;
        evaluation: WaeGateEvaluation;
      };
      setWaeGatePreview({
        template: result.template,
        artifact: result.artifact,
        certification: result.certificationArtifact,
        canRecord: result.artifact.status === "pass",
      });
      setWaeGateMessage({
        type: result.certificationEvaluation.allowed ? "success" : "error",
        text: result.certificationEvaluation.allowed
          ? `Recorded certification for ${result.template.templateVersionTag}.`
          : result.certificationEvaluation.message || "Recorded certification did not pass.",
      });
    } catch (error) {
      setWaeGateMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to record WAE rollout gate.",
      });
    } finally {
      setIsRecordingWaeGate(false);
    }
  };

  return (
    <div className="border rounded p-2 space-y-3" style={{ borderColor: "var(--window-document-border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Template Certification</p>
          <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Certification is version-scoped and reusable across orgs. WAE remains one evidence source, but deployability now follows certification plus org preflight instead of per-org rollout-gate ceremony.
          </p>
        </div>
      </div>

      <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
        <p className="font-semibold">Compliance fleet optics (read-only)</p>
        <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
          Super-admin can observe org gate posture, but org owners keep final GO/NO_GO decision authority.
        </p>
        {complianceFleetGateStatus === undefined ? (
          <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Loading compliance fleet posture…
          </p>
        ) : (
          <>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Organizations {complianceFleetSummary.totalOrgs} • GO {complianceFleetSummary.goOrgs}
              {` • NO_GO ${complianceFleetSummary.noGoOrgs} • blocked ${complianceFleetSummary.blockedOrgs}`}
            </p>
            <div className="max-h-40 overflow-auto border rounded" style={{ borderColor: "var(--window-document-border)" }}>
              <table className="w-full text-left text-[11px]">
                <thead style={{ background: "var(--desktop-shell-accent)" }}>
                  <tr>
                    <th className="px-2 py-1 font-semibold">Organization</th>
                    <th className="px-2 py-1 font-semibold">Effective gate</th>
                    <th className="px-2 py-1 font-semibold">Owner decision</th>
                    <th className="px-2 py-1 font-semibold">Blockers</th>
                    <th className="px-2 py-1 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceFleetRows.slice(0, 10).map((row) => (
                    <tr key={row.organizationId} className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
                      <td className="px-2 py-1">{row.organizationName}</td>
                      <td className="px-2 py-1" style={{ color: row.effectiveGateStatus === "GO" ? "#166534" : "#991b1b" }}>
                        {row.effectiveGateStatus}
                      </td>
                      <td className="px-2 py-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {row.ownerGateDecision}
                      </td>
                      <td className="px-2 py-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {row.blockerCount > 0 ? row.blockerIds.join(", ") : "none"}
                      </td>
                      <td className="px-2 py-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
                        {formatDateTime(row.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {waeGateMessage && (
        <div
          className="text-xs border rounded px-2 py-1 flex items-center gap-2"
          style={{
            borderColor:
              waeGateMessage.type === "success"
                ? "#15803d"
                : waeGateMessage.type === "error"
                  ? "#dc2626"
                  : "#1d4ed8",
            color:
              waeGateMessage.type === "success"
                ? "#166534"
                : waeGateMessage.type === "error"
                  ? "#991b1b"
                  : "#1e3a8a",
            background:
              waeGateMessage.type === "success"
                ? "#f0fdf4"
                : waeGateMessage.type === "error"
                  ? "#fee2e2"
                  : "#dbeafe",
          }}
        >
          {waeGateMessage.type === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {waeGateMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
        <div className="border rounded p-2 space-y-1" style={{ borderColor: "var(--window-document-border)" }}>
          <p className="font-semibold">Current protected template</p>
          {currentWaeGateTemplate ? (
            <>
              <p>{currentWaeGateTemplate.templateName}</p>
              <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                Version {currentWaeGateTemplate.templateVersionTag} • template {currentWaeGateTemplate.templateLifecycleStatus} • version {currentWaeGateTemplate.templateVersionLifecycleStatus}
              </p>
            </>
          ) : (
            <p style={{ color: "var(--desktop-menu-text-muted)" }}>Loading current protected operator template…</p>
          )}
        </div>
        <div className="border rounded p-2 space-y-1" style={{ borderColor: "var(--window-document-border)" }}>
          <p className="font-semibold">Latest gate status</p>
          {currentCertificationEvaluation ? (
            <>
              <p style={{ color: currentCertificationEvaluation.allowed ? "#166534" : "#991b1b" }}>
                {currentCertificationEvaluation.allowed
                  ? "Certified for rollout"
                  : currentCertificationEvaluation.message || "Certification not satisfied"}
              </p>
              <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                Risk {currentDefaultTemplateWaeGateStatus?.riskAssessment?.tier ?? "n/a"} • verification {(currentDefaultTemplateWaeGateStatus?.riskAssessment?.requiredVerification ?? []).join(", ") || "none"}
              </p>
              {currentCertification && (
                <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                  Digest {currentCertification.dependencyManifest.dependencyDigest} • recorded {formatDateTime(currentCertification.recordedAt)}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: "var(--desktop-menu-text-muted)" }}>Loading certification status…</p>
          )}
        </div>
      </div>

      <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
        <p className="font-semibold">Certification profile</p>
        <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
          Dependency digest: {currentDefaultTemplateWaeGateStatus?.dependencyManifest?.dependencyDigest ?? "n/a"}
        </p>
        <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
          Auto-certify eligible: {currentDefaultTemplateWaeGateStatus?.autoCertificationEligible ? "yes" : "no"}
        </p>
        {currentCertification?.evidenceSources?.length ? (
          <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Evidence: {currentCertification.evidenceSources.map((source) => source.sourceType).join(", ")}
          </p>
        ) : null}
      </div>

      <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
        <p className="font-semibold">Certification alert operations</p>
        {currentAlertOperations ? (
          <>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Policy scope {currentAlertOperations.automationPolicyScope}
              {currentAlertOperations.templateFamily ? ` • family ${currentAlertOperations.templateFamily}` : ""}
              {` • adoption ${currentAlertOperations.automationPolicy.adoptionMode}`}
            </p>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Owners: {(currentAlertOperations.automationPolicy.ownerUserIds.length > 0
                ? currentAlertOperations.automationPolicy.ownerUserIds.join(", ")
                : "none")}
              {currentAlertOperations.automationPolicy.ownerTeamIds.length > 0
                ? ` • teams ${currentAlertOperations.automationPolicy.ownerTeamIds.join(", ")}`
                : ""}
            </p>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Channels: {currentAlertOperations.automationPolicy.alertChannels.join(", ") || "none"}
            </p>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Worker control source {currentAlertOperations.dispatchControlSource}
              {` • retry ${currentAlertOperations.dispatchControl.maxAttempts} attempts / ${Math.round(currentAlertOperations.dispatchControl.retryDelayMs / 1000)}s`}
            </p>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Throttle windows: slack {currentAlertOperations.dispatchControl.throttle.slack.maxDispatches}/{Math.round(currentAlertOperations.dispatchControl.throttle.slack.windowMs / 60000)}m
              {` • pagerduty ${currentAlertOperations.dispatchControl.throttle.pagerduty.maxDispatches}/${Math.round(currentAlertOperations.dispatchControl.throttle.pagerduty.windowMs / 60000)}m`}
              {` • email ${currentAlertOperations.dispatchControl.throttle.email.maxDispatches}/${Math.round(currentAlertOperations.dispatchControl.throttle.email.windowMs / 60000)}m`}
            </p>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Credential governance: slack dedicated {currentAlertOperations.dispatchControl.credentialGovernance?.slack?.requireDedicatedCredentials ? "yes" : "no"} / inline {currentAlertOperations.dispatchControl.credentialGovernance?.slack?.allowInlineTargetCredentials === false ? "blocked" : "allowed"}
              {` • pagerduty inline ${currentAlertOperations.dispatchControl.credentialGovernance?.pagerduty?.allowInlineTargetCredentials === false ? "blocked" : "allowed"}`}
              {` • email dedicated ${currentAlertOperations.dispatchControl.credentialGovernance?.email?.requireDedicatedCredentials ? "yes" : "no"}`}
            </p>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Strict mode: {currentAlertOperations.dispatchControl.strictMode?.enabled ? "enabled" : "disabled"}
              {` • rollout ${currentAlertOperations.dispatchControl.strictMode?.rolloutMode ?? "manual"}`}
              {` • guardrail ${currentAlertOperations.dispatchControl.strictMode?.guardrailMode ?? "advisory"}`}
              {` • drift notify ${currentAlertOperations.dispatchControl.strictMode?.notifyOnPolicyDrift === false ? "off" : "on"}`}
            </p>
            {currentAlertOperations.strictModeRollout ? (
              <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                Strict rollout: promoted {currentAlertOperations.strictModeRollout.promotedChannels.join(", ") || "none"}
                {` • blocked ${currentAlertOperations.strictModeRollout.blockedChannels.length}`}
              </p>
            ) : null}
            {currentAlertOperations.policyDrift?.detected ? (
              <div className="text-[11px] space-y-1">
                <p style={{ color: "#991b1b" }}>
                  Policy drift detected ({currentAlertOperations.policyDrift.issueCount}):
                </p>
                {currentAlertOperations.policyDrift.issues.slice(0, 4).map((issue) => (
                  <p key={issue.code} style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {issue.code}
                    {issue.channel ? ` • ${issue.channel}` : ""}
                    {issue.tier ? ` • ${issue.tier}` : ""}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "#166534" }}>
                Policy drift: none
              </p>
            )}
            <div className="text-[11px] space-y-1">
              <p style={{ color: "var(--desktop-menu-text-muted)" }}>Credential health:</p>
              {currentAlertOperations.credentialHealth
                ? (Object.entries(currentAlertOperations.credentialHealth) as Array<[
                  "slack" | "pagerduty" | "email",
                  TemplateCertificationAlertCredentialHealthStatus,
                ]>).map(([channel, status]) => (
                  <p key={channel} style={{ color: status.ready ? "#166534" : "#991b1b" }}>
                    {channel}
                    {` • ${status.ready ? "ready" : "blocked"}`}
                    {` • source ${status.credentialSource}`}
                    {` • policy ${status.policyCompliant ? "ok" : "violation"}`}
                    {status.reasonCode ? ` • ${status.reasonCode}` : ""}
                  </p>
                ))
                : (
                  <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                    Credential health unavailable.
                  </p>
                )}
            </div>
            {currentAlertOperations.alertRecommendations.length > 0 ? (
              <div className="text-[11px] space-y-1">
                {currentAlertOperations.alertRecommendations.map((recommendation) => (
                  <div
                    key={`${recommendation.code}:${recommendation.severity}:${recommendation.summary}`}
                    className="border rounded px-2 py-1"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <p style={{ color: recommendation.severity === "critical" ? "#991b1b" : "#92400e" }}>
                      {recommendation.code} ({recommendation.severity})
                    </p>
                    <p style={{ color: "var(--desktop-menu-text-muted)" }}>{recommendation.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                No active alert recommendations for the current certification bundle.
              </p>
            )}
            {currentAlertOperations.recentDispatches.length > 0 ? (
              <div className="text-[11px] space-y-1">
                <p style={{ color: "var(--desktop-menu-text-muted)" }}>Recent dispatches:</p>
                {currentAlertOperations.recentDispatches.slice(0, 6).map((dispatch) => (
                  <div
                    key={`${dispatch.dedupeKey}:${dispatch.channel}`}
                    className="border rounded px-2 py-1 space-y-1"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    <p>
                      {dispatch.channel}
                      {` • ${dispatch.deliveryStatus}`}
                      {dispatch.workerStatus ? ` / ${dispatch.workerStatus}` : ""}
                      {` • ${dispatch.recommendationCode} • ${formatDateTime(dispatch.recordedAt)}`}
                      {typeof dispatch.nextAttemptAt === "number"
                        ? ` • next ${formatDateTime(dispatch.nextAttemptAt)}`
                        : ""}
                    </p>
                    {(typeof dispatch.throttleUntil === "number" || dispatch.throttleReason) && (
                      <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                        Throttle: {dispatch.throttleReason || "active"}
                        {typeof dispatch.throttleUntil === "number"
                          ? ` until ${formatDateTime(dispatch.throttleUntil)}`
                          : ""}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="px-2 py-1 text-[11px] border rounded"
                        style={{ borderColor: "var(--window-document-border)" }}
                        onClick={() => {
                          void handleAcknowledgeDispatch(dispatch);
                        }}
                        disabled={
                          !sessionId
                          || !currentWaeGateTemplate
                          || dispatch.deliveryStatus === "acknowledged"
                          || dispatch.workerStatus === "acknowledged"
                          || activeAlertDispatchActionKey !== null
                        }
                      >
                        {activeAlertDispatchActionKey === `ack:${dispatch.dedupeKey}`
                          ? "Acknowledging..."
                          : "Acknowledge"}
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-[11px] border rounded"
                        style={{ borderColor: "var(--window-document-border)" }}
                        onClick={() => {
                          void handleSnoozeDispatch(dispatch, 30);
                        }}
                        disabled={
                          !sessionId
                          || !currentWaeGateTemplate
                          || dispatch.deliveryStatus === "acknowledged"
                          || dispatch.workerStatus === "acknowledged"
                          || activeAlertDispatchActionKey !== null
                        }
                      >
                        {activeAlertDispatchActionKey === `snooze:${dispatch.dedupeKey}:30`
                          ? "Snoozing..."
                          : "Snooze 30m"}
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-[11px] border rounded"
                        style={{ borderColor: "var(--window-document-border)" }}
                        onClick={() => {
                          void handleSnoozeDispatch(dispatch, 120);
                        }}
                        disabled={
                          !sessionId
                          || !currentWaeGateTemplate
                          || dispatch.deliveryStatus === "acknowledged"
                          || dispatch.workerStatus === "acknowledged"
                          || activeAlertDispatchActionKey !== null
                        }
                      >
                        {activeAlertDispatchActionKey === `snooze:${dispatch.dedupeKey}:120`
                          ? "Snoozing..."
                          : "Snooze 2h"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
                No alert dispatch history recorded for this version digest.
              </p>
            )}
          </>
        ) : (
          <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Loading alert operations…
          </p>
        )}
      </div>

      <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
        <p className="font-semibold">Step 1: Run eval evidence when required</p>
        <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
          {manualWaeEvidenceRequired
            ? "This version requires WAE evidence. Run the eval bundle locally, then import it below."
            : "This version does not require WAE as the primary verification path. Lifecycle actions can auto-certify it as long as the dependency digest stays unchanged."}
        </p>
        <pre
          className="text-[11px] overflow-auto rounded p-2"
          style={{
            background: "var(--window-document-bg)",
            border: "1px solid var(--window-document-border)",
            color: "var(--window-document-text)",
          }}
        >{(currentDefaultTemplateWaeGateStatus?.evalCommands ?? [
          "npm run wae:eval:contracts",
          "npm run wae:eval:regression",
        ]).join("\n")}</pre>
        <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
          Expected bundle files: {currentDefaultTemplateWaeGateStatus?.bundlePaths?.runRecord ?? "tmp/reports/wae/<runId>/bundle/run-records.jsonl"} and {currentDefaultTemplateWaeGateStatus?.bundlePaths?.scenarioRecords ?? "tmp/reports/wae/<runId>/bundle/scenario-records.jsonl"}
        </p>
      </div>

      <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
        <p className="font-semibold">Step 2: Import WAE evidence</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="text-[11px] flex flex-col gap-1">
            Run record file
            <input
              type="file"
              accept=".json,.jsonl,.txt"
              onChange={(event) => {
                void handleImportWaeGateFile("run", event.target.files);
                event.currentTarget.value = "";
              }}
              disabled={waeGateBusy}
              className="text-xs"
            />
          </label>
          <label className="text-[11px] flex flex-col gap-1">
            Scenario records file
            <input
              type="file"
              accept=".json,.jsonl,.txt"
              onChange={(event) => {
                void handleImportWaeGateFile("scenarios", event.target.files);
                event.currentTarget.value = "";
              }}
              disabled={waeGateBusy}
              className="text-xs"
            />
          </label>
        </div>
        <label className="text-[11px] flex flex-col gap-1">
          Run record JSON / JSONL
          <textarea
            rows={6}
            value={waeRunRecordDraft}
            onChange={(event) => {
              setWaeRunRecordDraft(event.target.value);
              setWaeGatePreview(null);
            }}
            placeholder="Paste run-records.jsonl contents or a single JSON object"
            className="px-2 py-1 text-xs border rounded bg-transparent"
            style={{ borderColor: "var(--window-document-border)" }}
            disabled={waeGateBusy}
          />
        </label>
        <label className="text-[11px] flex flex-col gap-1">
          Scenario records JSON array / JSONL
          <textarea
            rows={10}
            value={waeScenarioRecordsDraft}
            onChange={(event) => {
              setWaeScenarioRecordsDraft(event.target.value);
              setWaeGatePreview(null);
            }}
            placeholder="Paste scenario-records.jsonl contents or a JSON array of scenario records"
            className="px-2 py-1 text-xs border rounded bg-transparent"
            style={{ borderColor: "var(--window-document-border)" }}
            disabled={waeGateBusy}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-2 py-1 text-xs border rounded"
            style={{ borderColor: "var(--window-document-border)" }}
            onClick={handlePreviewWaeRolloutGate}
            disabled={waeGateBusy}
          >
            {isPreviewingWaeGate ? "Previewing..." : "Preview gate result"}
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs border rounded"
            style={{ borderColor: "var(--window-document-border)" }}
            onClick={() => {
              setWaeRunRecordDraft("");
              setWaeScenarioRecordsDraft("");
              setWaeGatePreview(null);
              setWaeGateMessage(null);
            }}
            disabled={waeGateBusy}
          >
            Clear imported bundle
          </button>
        </div>
      </div>

      {(waeGatePreview || currentWaeGateArtifact) && (
        <div className="border rounded p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
          <p className="font-semibold">Step 3: Preview / record certification</p>
          {waeGatePreview && (
            <div className="text-[11px] space-y-1">
              <p style={{ color: waeGatePreview.canRecord ? "#166534" : "#991b1b" }}>
                Preview {waeGatePreview.artifact.status === "pass" ? "passes" : "fails"} for {waeGatePreview.template.templateVersionTag}
              </p>
              <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                Run {waeGatePreview.artifact.runId} • weighted score {waeGatePreview.artifact.score.weightedScore.toFixed(4)} • verdict {waeGatePreview.artifact.score.verdict} / {waeGatePreview.artifact.score.decision}
              </p>
              <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                Certification outcome: {waeGatePreview.certification.status} • risk {waeGatePreview.certification.riskAssessment.tier} • digest {waeGatePreview.certification.dependencyManifest.dependencyDigest}
              </p>
              <p style={{ color: "var(--desktop-menu-text-muted)" }}>
                Scenario coverage: {waeGatePreview.artifact.scenarioCoverage.passedScenarios} passed, {waeGatePreview.artifact.scenarioCoverage.failedScenarios} failed, {waeGatePreview.artifact.scenarioCoverage.skippedScenarios} skipped
              </p>
              {waeGatePreview.artifact.criticalReasonCodeBudget.observedCount > 0 && (
                <p style={{ color: "#b45309" }}>
                  Critical reason codes: {waeGatePreview.artifact.criticalReasonCodeBudget.observedReasonCodes.join(", ")}
                </p>
              )}
              {waeGatePreview.artifact.score.blockedReasons.length > 0 && (
                <p style={{ color: "#b45309" }}>
                  Blocked reasons: {waeGatePreview.artifact.score.blockedReasons.join(", ")}
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            className="px-2 py-1 text-xs border rounded"
            style={{ borderColor: "var(--window-document-border)" }}
            onClick={handleRecordWaeRolloutGate}
            disabled={Boolean(waeGateRecordDisabledReason)}
            title={waeGateRecordDisabledReason ?? "Record rollout gate for the current protected operator version"}
          >
            {isRecordingWaeGate ? "Recording certification..." : "Record certification"}
          </button>
          {waeGateRecordDisabledReason && (
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Record certification unavailable: {waeGateRecordDisabledReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
