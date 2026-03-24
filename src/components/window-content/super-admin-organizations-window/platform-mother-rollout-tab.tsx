"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Loader2,
  RadioTower,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../../../convex/_generated/api");

type RouteCandidate = {
  artifactId: string;
  artifactKind: string;
  approvalStatus: "pending" | "approved" | "rejected";
  targetTemplateRole: string;
  createdAt: number;
  updatedAt: number;
  requestedTargetCount: number;
  stagedTargetCount: number;
  partialRolloutDetected: boolean;
  gaReady: boolean;
  gaBlockedReason: string | null;
  certification: {
    status: "certified" | "auto_certifiable" | "blocked" | "missing";
    reasonCode: string | null;
    message: string | null;
    riskTier: string | null;
    requiredVerification: string[];
  };
  policy: {
    eligible: boolean;
    outOfScopeFields: string[];
  };
  orgReadiness: {
    interventionCount: number;
    blockedCount: number;
    staleCount: number;
    missingCloneCount: number;
  };
};

type RolloutOverview = {
  platformOrganizationId: string;
  platformOrganizationName: string;
  needsSeed: boolean;
  supportRuntimeId: string | null;
  governanceRuntimeId: string | null;
  supportRuntimeName: string | null;
  releaseStatus: {
    stage: string;
    reviewArtifactId?: string;
    approvedByUserId?: string;
    reviewedAt?: number;
    aliasCompatibilityMode: string;
  } | null;
  routeFlags: {
    identityEnabled: boolean;
    supportRouteEnabled: boolean;
    reviewArtifactId?: string;
    updatedByUserId?: string;
    updatedAt?: number;
  } | null;
  routeAvailability: {
    enabled: boolean;
    identityEnabled: boolean;
    supportRouteEnabled: boolean;
    customerFacingRuntime: boolean;
    renameSafetySatisfied: boolean;
    releaseStage: string;
    aliasCompatibilityMode: string;
    canaryAllowlisted: boolean;
    reviewArtifactId?: string;
  } | null;
  routeCandidates: RouteCandidate[];
  statusCounts: {
    pending: number;
    approved: number;
    rejected: number;
  };
};

function formatDateTime(value?: number | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function toArtifactLabel(candidate: RouteCandidate): string {
  return [
    candidate.artifactKind,
    candidate.certification.status,
    candidate.approvalStatus,
    candidate.targetTemplateRole,
    formatDateTime(candidate.updatedAt),
  ].join(" • ");
}

function certificationTone(status: RouteCandidate["certification"]["status"]) {
  if (status === "certified") {
    return { color: "#166534", bg: "#f0fdf4", label: "Certified" };
  }
  if (status === "auto_certifiable") {
    return { color: "#92400e", bg: "#fef3c7", label: "Auto-Certifiable" };
  }
  if (status === "missing") {
    return { color: "#92400e", bg: "#fff7ed", label: "Missing" };
  }
  return { color: "#991b1b", bg: "#fee2e2", label: "Blocked" };
}

export function PlatformMotherRolloutTab() {
  const { sessionId, isSuperAdmin } = useAuth();
  const platformMotherAdminApi = generatedApi.api.ai.platformMotherAdmin;

  const overview = useQuery(
    platformMotherAdminApi.getPlatformMotherRolloutStatus,
    sessionId && isSuperAdmin ? { sessionId } : "skip",
  ) as RolloutOverview | undefined;

  const seedPlatformMotherRuntimes = useMutation(
    platformMotherAdminApi.seedPlatformMotherRuntimes,
  );
  const setPlatformMotherLive = useMutation(
    platformMotherAdminApi.setPlatformMotherLive,
  );
  const disablePlatformMotherLive = useMutation(
    platformMotherAdminApi.disablePlatformMotherLive,
  );

  const [selectedArtifactId, setSelectedArtifactId] = useState("");
  const [reason, setReason] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [notes, setNotes] = useState("");
  const [pendingAction, setPendingAction] = useState<"seed" | "live" | "disable" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!overview) {
      return;
    }
    if (!selectedArtifactId) {
      return;
    }
    const selectedStillPresent = overview.routeCandidates.some(
      (candidate) => candidate.artifactId === selectedArtifactId,
    );
    if (!selectedStillPresent) {
      setSelectedArtifactId("");
    }
  }, [overview, selectedArtifactId]);

  const selectedCandidate = overview?.routeCandidates.find(
    (candidate) => candidate.artifactId === selectedArtifactId,
  ) ?? null;
  const canSetLive = Boolean(
    reason.trim().length >= 12
    && pendingAction === null
    && (selectedCandidate ? selectedCandidate.gaReady : true),
  );
  const canDisable = Boolean(
    overview?.routeAvailability?.enabled && pendingAction === null,
  );

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
  };

  const handleSeed = async () => {
    if (!sessionId) {
      return;
    }
    setPendingAction("seed");
    setMessage(null);
    try {
      await seedPlatformMotherRuntimes({ sessionId });
      showMessage("success", "Mother runtimes seeded or refreshed on the platform org.");
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Failed to seed Mother runtimes.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleSetLive = async () => {
    if (!sessionId || !canSetLive) {
      return;
    }
    setPendingAction("live");
    setMessage(null);
    try {
      await setPlatformMotherLive({
        sessionId,
        artifactId: selectedArtifactId || undefined,
        reason: reason.trim(),
        ticketId: ticketId.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      showMessage("success", "Mother is now live for customer-facing support.");
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Failed to set Mother live.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleDisable = async () => {
    if (!sessionId || !canDisable) {
      return;
    }
    setPendingAction("disable");
    setMessage(null);
    try {
      await disablePlatformMotherLive({ sessionId });
      showMessage("success", "Customer-facing Mother support is disabled.");
    } catch (error) {
      showMessage(
        "error",
        error instanceof Error ? error.message : "Failed to disable Mother support.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="mx-auto mb-3" size={36} style={{ color: "var(--error)" }} />
          <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
            Super admin access required
          </p>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <RadioTower size={22} style={{ color: "var(--primary)" }} />
          Platform Mother
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--window-document-text-muted)" }}>
          Mother live rollout now exposes reusable template certification, policy eligibility, and org-blocker pressure directly in the release surface instead of hiding everything behind artifact approval alone.
        </p>
      </div>

      {message && (
        <div
          className="border-2 rounded p-3 flex items-start gap-2"
          style={{
            borderColor: message.type === "success" ? "#16a34a" : "#dc2626",
            background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          }}
        >
          {message.type === "success" ? (
            <ShieldCheck size={16} style={{ color: "#15803d" }} />
          ) : (
            <AlertCircle size={16} style={{ color: "#dc2626" }} />
          )}
          <p className="text-xs" style={{ color: message.type === "success" ? "#166534" : "#991b1b" }}>
            {message.text}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="border rounded p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
          <p className="text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>Platform Org</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--window-document-text)" }}>
            {overview.platformOrganizationName}
          </p>
        </div>
        <div className="border rounded p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
          <p className="text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>Runtime Status</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--window-document-text)" }}>
            {overview.needsSeed ? "Needs seed" : "Seeded"}
          </p>
        </div>
        <div className="border rounded p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
          <p className="text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>Release Stage</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--window-document-text)" }}>
            {overview.releaseStatus?.stage ?? "internal_only"}
          </p>
        </div>
        <div className="border rounded p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
          <p className="text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>Customer-Facing Route</p>
          <p className="text-sm font-semibold mt-1" style={{ color: overview.routeAvailability?.enabled ? "#15803d" : "var(--window-document-text)" }}>
            {overview.routeAvailability?.enabled ? "Live" : "Disabled"}
          </p>
        </div>
        <div className="border rounded p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
          <p className="text-[11px]" style={{ color: "var(--window-document-text-muted)" }}>Live Candidate Readiness</p>
          <p className="text-sm font-semibold mt-1" style={{ color: "var(--window-document-text)" }}>
            {overview.routeCandidates.some((candidate) => candidate.gaReady) ? "Ready" : "Blocked"}
          </p>
        </div>
      </div>

      <div className="border-2 rounded p-4 space-y-4" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
              Rollout Controls
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--window-document-text-muted)" }}>
              The live action seeds Mother if needed, reuses the selected artifact or records a fresh Mother migration review, approves it when needed, stores the GA support release contract, and flips the platform-owned route flags.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSeed}
              disabled={pendingAction !== null}
              className="px-3 py-2 text-xs font-semibold border-2 flex items-center gap-2 disabled:opacity-50"
              style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
            >
              {pendingAction === "seed" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Seed / Refresh Mother
            </button>
            <button
              type="button"
              onClick={handleDisable}
              disabled={!canDisable}
              className="px-3 py-2 text-xs font-semibold border-2 disabled:opacity-50"
              style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
            >
              {pendingAction === "disable" ? "Disabling..." : "Disable Live Route"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="border rounded p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}>
            <p style={{ color: "var(--window-document-text-muted)" }}>Stored Route Flags</p>
            <p className="mt-1 font-semibold" style={{ color: "var(--window-document-text)" }}>
              identity={overview.routeFlags?.identityEnabled ? "on" : "off"}, route={overview.routeFlags?.supportRouteEnabled ? "on" : "off"}
            </p>
            <p className="mt-2" style={{ color: "var(--window-document-text-muted)" }}>
              Last updated {formatDateTime(overview.routeFlags?.updatedAt)}
            </p>
          </div>
          <div className="border rounded p-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}>
            <p style={{ color: "var(--window-document-text-muted)" }}>Current Release Artifact</p>
            <p className="mt-1 font-semibold break-all" style={{ color: "var(--window-document-text)" }}>
              {overview.releaseStatus?.reviewArtifactId ?? "—"}
            </p>
            <p className="mt-2" style={{ color: "var(--window-document-text-muted)" }}>
              Reviewed {formatDateTime(overview.releaseStatus?.reviewedAt)}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
            Review artifact for live rollout
          </label>
          <select
            value={selectedArtifactId}
            onChange={(event) => setSelectedArtifactId(event.target.value)}
            className="w-full px-3 py-2 text-xs border rounded"
            style={{
              backgroundColor: "var(--window-document-bg)",
              color: "var(--window-document-text)",
              borderColor: "var(--window-document-border)",
            }}
          >
            <option value="">Generate fresh Mother migration review now</option>
            {overview.routeCandidates.map((candidate) => (
              <option key={candidate.artifactId} value={candidate.artifactId}>
                {toArtifactLabel(candidate)}
              </option>
            ))}
          </select>
          <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
            Leave this blank to generate a fresh Mother migration review artifact during the live rollout.
          </p>

          {selectedCandidate && (
            <div className="border rounded p-3 text-xs" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div>
                  <p style={{ color: "var(--window-document-text-muted)" }}>Certification</p>
                  <span
                    className="inline-flex mt-1 px-1.5 py-0.5 rounded"
                    style={{
                      color: certificationTone(selectedCandidate.certification.status).color,
                      background: certificationTone(selectedCandidate.certification.status).bg,
                    }}
                  >
                    {certificationTone(selectedCandidate.certification.status).label}
                  </span>
                </div>
                <div>
                  <p style={{ color: "var(--window-document-text-muted)" }}>Policy</p>
                  <p className="mt-1" style={{ color: selectedCandidate.policy.eligible ? "#166534" : "#991b1b" }}>
                    {selectedCandidate.policy.eligible ? "Eligible" : "Blocked"}
                  </p>
                </div>
                <div>
                  <p style={{ color: "var(--window-document-text-muted)" }}>Org blockers</p>
                  <p className="mt-1">
                    blocked {selectedCandidate.orgReadiness.blockedCount} • stale {selectedCandidate.orgReadiness.staleCount}
                  </p>
                </div>
                <div>
                  <p style={{ color: "var(--window-document-text-muted)" }}>Targets</p>
                  <p className="mt-1">
                    requested {selectedCandidate.requestedTargetCount} • staged {selectedCandidate.stagedTargetCount}
                  </p>
                </div>
              </div>
              <p className="mt-2" style={{ color: selectedCandidate.gaReady ? "#15803d" : "var(--window-document-text-muted)" }}>
                {selectedCandidate.gaReady
                  ? "This artifact is eligible for a live Mother rollout."
                  : selectedCandidate.gaBlockedReason || "This artifact cannot be promoted live."}
              </p>
              {!selectedCandidate.policy.eligible && selectedCandidate.policy.outOfScopeFields.length > 0 && (
                <p className="mt-1" style={{ color: "#b45309" }}>
                  Policy blockers: {selectedCandidate.policy.outOfScopeFields.join(", ")}
                </p>
              )}
            </div>
          )}
          {!selectedCandidate && (
            <div className="border rounded p-3 text-xs" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}>
              <p style={{ color: "var(--window-document-text)" }}>
                A fresh `migration_plan` review artifact will be generated for all bootstrapped non-platform organizations when you set Mother live.
              </p>
              <p className="mt-1" style={{ color: "var(--window-document-text-muted)" }}>
                This keeps the rollout on the existing Mother governance path and records dry-run, alias-safety, approval, release, and route-flag evidence together.
              </p>
            </div>
          )}

          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Approval reason for live rollout (minimum 12 characters)"
            rows={3}
            className="w-full px-3 py-2 text-xs"
            style={{
              backgroundColor: "var(--window-document-bg)",
              color: "var(--window-document-text)",
              border: "2px inset",
              borderColor: "var(--window-document-border)",
            }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={ticketId}
              onChange={(event) => setTicketId(event.target.value)}
              placeholder="Ticket ID (optional)"
              className="w-full px-3 py-2 text-xs"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Operator notes (optional)"
              className="w-full px-3 py-2 text-xs"
              style={{
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
                border: "2px inset",
                borderColor: "var(--window-document-border)",
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleSetLive}
            disabled={!canSetLive}
            className="px-4 py-2 text-xs font-semibold border-2 disabled:opacity-50 flex items-center gap-2"
            style={{
              borderColor: "var(--window-document-border)",
              backgroundColor: "var(--button-primary-bg, var(--tone-accent))",
              color: "var(--button-primary-text, #0f0f0f)",
            }}
          >
            {pendingAction === "live" ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
            {pendingAction === "live" ? "Setting Mother live..." : "Approve + Set Mother Live"}
          </button>
        </div>
      </div>

      <div className="border-2 rounded p-4 space-y-3" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
              Review Artifact Queue
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--window-document-text-muted)" }}>
              Pending {overview.statusCounts.pending} • approved {overview.statusCounts.approved} • rejected {overview.statusCounts.rejected}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {overview.routeCandidates.length === 0 && (
            <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
              No Mother review artifacts are available yet.
            </p>
          )}
          {overview.routeCandidates.map((candidate) => (
            <div
              key={candidate.artifactId}
              className="border rounded p-3 text-xs"
              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold break-all" style={{ color: "var(--window-document-text)" }}>
                  {candidate.artifactKind} • {candidate.artifactId}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      color: certificationTone(candidate.certification.status).color,
                      background: certificationTone(candidate.certification.status).bg,
                    }}
                  >
                    {certificationTone(candidate.certification.status).label}
                  </span>
                  <span style={{ color: candidate.gaReady ? "#15803d" : "var(--window-document-text-muted)" }}>
                    {candidate.approvalStatus}
                  </span>
                </div>
              </div>
              <p className="mt-1" style={{ color: "var(--window-document-text-muted)" }}>
                {candidate.targetTemplateRole} • updated {formatDateTime(candidate.updatedAt)}
              </p>
              <p className="mt-1" style={{ color: "var(--window-document-text-muted)" }}>
                Risk {candidate.certification.riskTier || "n/a"} • verification {candidate.certification.requiredVerification.join(", ") || "none"} • org blockers {candidate.orgReadiness.blockedCount}
              </p>
              {!candidate.gaReady && candidate.gaBlockedReason && (
                <p className="mt-2" style={{ color: "#b45309" }}>
                  {candidate.gaBlockedReason}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
