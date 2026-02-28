"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Check, X, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { BetaCodeOperationsPanel } from "./beta-code-operations-panel";

const apiAny = require("../../../../convex/_generated/api").api as any;

/**
 * Beta Access Management Tab - Platform-wide beta access control
 *
 * Permission: super admin only
 *
 * Features:
 * - Toggle beta gating ON/OFF
 * - View pending, approved, and rejected beta access requests
 * - Approve/reject beta access requests with reasons
 * - Real-time pending count badge
 */
export function BetaAccessTab() {
  type RolloutStage = "legacy_manual_approval" | "v2_beta_code_auto_approve";

  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.super_admin.beta_access");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const fullKey = `ui.super_admin.beta_access.${key}`;
    const translated = t(fullKey, params);
    return translated === fullKey ? fallback : translated;
  };
  const [activeFilter, setActiveFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectUserId, setRejectUserId] = useState<Id<"users"> | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Queries
  const betaGatingStatus = (useQuery as any)(
    apiAny.betaAccess.getBetaGatingStatus,
    {}
  ) as
    | {
        enabled?: boolean;
        rollout?: {
          rolloutStage?: RolloutStage;
          effectiveRolloutStage?: RolloutStage;
          killSwitchForceLegacyManualApproval?: boolean;
          supportsBetaCodeAutoApprove?: boolean;
        };
      }
    | undefined;

  const betaRequests = useQuery(
    apiAny.betaAccess.listBetaRequests,
    sessionId ? { sessionId, status: activeFilter } : "skip"
  );

  const pendingCount = useQuery(
    apiAny.betaAccess.getPendingBetaRequestCount,
    sessionId ? { sessionId } : "skip"
  );

  // Mutations
  const toggleBetaGating = useMutation(apiAny.betaAccess.toggleBetaGating);
  const betaAccessMutations = apiAny.betaAccess;
  const setBetaOnboardingRolloutControls = useMutation(
    betaAccessMutations.setBetaOnboardingRolloutControls
  );
  const setBetaOnboardingKillSwitch = useMutation(
    betaAccessMutations.setBetaOnboardingKillSwitch
  );
  const approveBetaAccess = useMutation(apiAny.betaAccess.approveBetaAccess);
  const rejectBetaAccess = useMutation(apiAny.betaAccess.rejectBetaAccess);

  const rolloutStage: RolloutStage =
    betaGatingStatus?.rollout?.rolloutStage === "v2_beta_code_auto_approve"
      ? "v2_beta_code_auto_approve"
      : "legacy_manual_approval";
  const killSwitchEnabled =
    betaGatingStatus?.rollout?.killSwitchForceLegacyManualApproval === true;
  const effectiveRolloutStage: RolloutStage =
    betaGatingStatus?.rollout?.effectiveRolloutStage === "v2_beta_code_auto_approve"
      ? "v2_beta_code_auto_approve"
      : "legacy_manual_approval";

  const handleToggleGating = async () => {
    if (!sessionId) return;
    try {
      await toggleBetaGating({
        sessionId,
        enabled: !betaGatingStatus?.enabled,
      });
    } catch (error) {
      console.error("Failed to toggle beta gating:", error);
      alert(tx("alerts.toggle_gating_failed", "Failed to toggle beta gating"));
    }
  };

  const handleSetRolloutStage = async (nextStage: RolloutStage) => {
    if (!sessionId) return;
    try {
      await setBetaOnboardingRolloutControls({
        sessionId,
        rolloutStage: nextStage,
        killSwitchForceLegacyManualApproval: killSwitchEnabled,
      });
    } catch (error) {
      console.error("Failed to update rollout stage:", error);
      alert(tx("alerts.update_rollout_failed", "Failed to update rollout stage"));
    }
  };

  const handleToggleKillSwitch = async () => {
    if (!sessionId) return;
    try {
      await setBetaOnboardingKillSwitch({
        sessionId,
        enabled: !killSwitchEnabled,
      });
    } catch (error) {
      console.error("Failed to toggle kill switch:", error);
      alert(tx("alerts.toggle_kill_switch_failed", "Failed to toggle kill switch"));
    }
  };

  const handleApprove = async (userId: Id<"users">) => {
    if (!sessionId) return;
    try {
      await approveBetaAccess({ sessionId, userId });
    } catch (error) {
      console.error("Failed to approve:", error);
      alert(tx("alerts.approve_failed", "Failed to approve beta access"));
    }
  };

  const handleReject = async () => {
    if (!sessionId || !rejectUserId) return;
    if (!rejectionReason.trim()) {
      alert(tx("alerts.rejection_reason_required", "Please provide a rejection reason"));
      return;
    }

    try {
      await rejectBetaAccess({
        sessionId,
        userId: rejectUserId,
        reason: rejectionReason,
      });
      setRejectUserId(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Failed to reject:", error);
      alert(tx("alerts.reject_failed", "Failed to reject beta access"));
    }
  };

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: "var(--window-document-bg)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--neutral-gray)" }} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6" style={{ backgroundColor: "var(--window-document-bg)" }}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <Shield size={24} style={{ color: "var(--primary)" }} />
          {tx("header.title", "Beta Access Management")}
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--window-document-text-muted)" }}>
          {tx(
            "header.subtitle",
            "Control platform-wide beta access gating and manage user requests"
          )}
        </p>
      </div>

      {/* Beta Gating Toggle */}
      <div
        className="mb-6 p-4 rounded"
        style={{
          backgroundColor: "var(--window-document-bg)",
          border: "2px solid var(--window-document-border)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg" style={{ color: "var(--window-document-text)" }}>
              {tx("gating.title", "Beta Access Gating")}
            </h3>
            <p className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
              {tx(
                "gating.subtitle",
                "Control whether new users need approval to access the platform"
              )}
            </p>
          </div>
          <button
            onClick={handleToggleGating}
            className={`beveled-button px-6 py-2 font-bold transition-colors ${
              betaGatingStatus?.enabled
                ? "bg-green-500 hover:bg-green-600"
                : ""
            }`}
            style={{
              backgroundColor: betaGatingStatus?.enabled ? undefined : "var(--window-document-bg)",
              color: betaGatingStatus?.enabled ? "white" : "var(--window-document-text)",
            }}
          >
            {betaGatingStatus?.enabled ? tx("gating.state_on", "ON") : tx("gating.state_off", "OFF")}
          </button>
        </div>
        <div className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
          {betaGatingStatus?.enabled ? (
            <span className="flex items-center gap-2">
              <Check size={16} style={{ color: "var(--success)" }} />
              {tx("gating.enabled_prefix", "Beta gating is")}{" "}
              <strong>{tx("gating.enabled_status", "enabled")}</strong>
              {tx(
                "gating.enabled_suffix",
                ". No-code signups require approval; valid beta code auto-approval depends on rollout mode."
              )}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <X size={16} style={{ color: "var(--warning)" }} />
              {tx("gating.disabled_prefix", "Beta gating is")}{" "}
              <strong>{tx("gating.disabled_status", "disabled")}</strong>
              {tx("gating.disabled_suffix", ". All users can access the platform freely.")}
            </span>
          )}
        </div>
      </div>

      <div
        className="mb-6 p-4 rounded"
        style={{
          backgroundColor: "var(--window-document-bg)",
          border: "2px solid var(--window-document-border)",
        }}
      >
        <div className="mb-3">
          <h3 className="font-bold text-lg" style={{ color: "var(--window-document-text)" }}>
            {tx("rollout.title", "Onboarding Rollout Controls")}
          </h3>
          <p className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
            {tx(
              "rollout.subtitle",
              "Migrate between legacy manual approval and v2 beta-code auto-approve without code deploys."
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => handleSetRolloutStage("legacy_manual_approval")}
            className="beveled-button px-4 py-2 text-sm font-bold"
            style={{
              backgroundColor:
                rolloutStage === "legacy_manual_approval"
                  ? "var(--primary)"
                  : "var(--window-document-bg)",
              color:
                rolloutStage === "legacy_manual_approval"
                  ? "white"
                  : "var(--window-document-text)",
            }}
          >
            {tx("rollout.legacy_manual_button", "Legacy Manual Approval")}
          </button>
          <button
            onClick={() => handleSetRolloutStage("v2_beta_code_auto_approve")}
            className="beveled-button px-4 py-2 text-sm font-bold"
            style={{
              backgroundColor:
                rolloutStage === "v2_beta_code_auto_approve"
                  ? "var(--primary)"
                  : "var(--window-document-bg)",
              color:
                rolloutStage === "v2_beta_code_auto_approve"
                  ? "white"
                  : "var(--window-document-text)",
            }}
          >
            {tx("rollout.v2_auto_approve_button", "V2 Beta Code Auto-Approve")}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={handleToggleKillSwitch}
            className="beveled-button px-4 py-2 text-sm font-bold"
            style={{
              backgroundColor: killSwitchEnabled ? "var(--error)" : "var(--window-document-bg)",
              color: killSwitchEnabled ? "white" : "var(--window-document-text)",
            }}
          >
            {killSwitchEnabled
              ? tx("rollout.kill_switch_on", "Kill Switch ON")
              : tx("rollout.kill_switch_off", "Kill Switch OFF")}
          </button>
          <span className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
            {tx(
              "rollout.kill_switch_description",
              "When ON, all signups use legacy manual approval behavior immediately."
            )}
          </span>
        </div>

        <div className="text-sm space-y-1" style={{ color: "var(--window-document-text-muted)" }}>
          <div>
            {tx("rollout.configured_stage_label", "Configured rollout stage:")}{" "}
            <strong>
              {rolloutStage === "v2_beta_code_auto_approve"
                ? tx("rollout.stage_v2", "v2_beta_code_auto_approve")
                : tx("rollout.stage_legacy", "legacy_manual_approval")}
            </strong>
          </div>
          <div>
            {tx("rollout.effective_stage_label", "Effective rollout stage:")}{" "}
            <strong>
              {effectiveRolloutStage === "v2_beta_code_auto_approve"
                ? tx("rollout.stage_v2", "v2_beta_code_auto_approve")
                : tx("rollout.stage_legacy", "legacy_manual_approval")}
            </strong>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 border-b-2" style={{ borderColor: "var(--window-document-border)" }}>
        {(["pending", "approved", "rejected"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 text-sm font-bold border-2 border-b-0 transition-colors ${
              activeFilter === filter ? "" : "opacity-70"
            }`}
            style={{
              backgroundColor: activeFilter === filter ? "var(--window-document-bg)" : "var(--window-document-bg)",
              color: "var(--window-document-text)",
              borderColor: "var(--window-document-border)",
            }}
          >
            {filter === "pending"
              ? tx("filters.pending", "Pending")
              : filter === "approved"
                ? tx("filters.approved", "Approved")
                : tx("filters.rejected", "Rejected")}
            {filter === "pending" && pendingCount !== undefined && pendingCount > 0 && (
              <span
                className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold"
                style={{
                  backgroundColor: "var(--error)",
                  color: "white",
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests list */}
      <div
        className="rounded"
        style={{
          backgroundColor: "var(--window-document-bg)",
          border: "2px solid var(--window-document-border)",
        }}
      >
        {!betaRequests ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--neutral-gray)" }} />
          </div>
        ) : betaRequests.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "var(--window-document-text-muted)" }}>
            {tx("requests.none_prefix", "No")}{" "}
            {activeFilter === "pending"
              ? tx("filters.pending_lower", "pending")
              : activeFilter === "approved"
                ? tx("filters.approved_lower", "approved")
                : tx("filters.rejected_lower", "rejected")}{" "}
            {tx("requests.none_suffix", "beta requests found")}
          </div>
        ) : (
          <div className="divide-y-2" style={{ borderColor: "var(--window-document-border)" }}>
            {betaRequests.map((request: any) => (
              <div key={request.userId} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-bold" style={{ color: "var(--window-document-text)" }}>
                      {request.firstName || request.lastName
                        ? `${request.firstName || ""} ${request.lastName || ""}`.trim()
                        : tx("requests.no_name", "No name provided")}
                    </div>
                    <div className="text-sm" style={{ color: "var(--window-document-text-muted)" }}>
                      {request.email}
                    </div>

                    {request.requestedAt && (
                      <div className="text-xs mt-1" style={{ color: "var(--window-document-text-muted)" }}>
                        {tx("requests.requested_label", "Requested:")}{" "}
                        {new Date(request.requestedAt).toLocaleString()}
                      </div>
                    )}

                    {request.approvedAt && (
                      <div className="text-xs mt-1" style={{ color: "var(--success)" }}>
                        {tx("requests.approved_label", "Approved:")}{" "}
                        {new Date(request.approvedAt).toLocaleString()}
                      </div>
                    )}

                    {request.requestReason && (
                      <div className="mt-2 text-sm" style={{ color: "var(--window-document-text)" }}>
                        <strong>{tx("requests.reason_label", "Reason:")}</strong> {request.requestReason}
                      </div>
                    )}

                    {request.useCase && (
                      <div className="mt-1 text-sm" style={{ color: "var(--window-document-text)" }}>
                        <strong>{tx("requests.use_case_label", "Use Case:")}</strong> {request.useCase}
                      </div>
                    )}

                    {request.referralSource && (
                      <div className="mt-1 text-sm" style={{ color: "var(--window-document-text)" }}>
                        <strong>{tx("requests.referral_label", "Referral:")}</strong> {request.referralSource}
                      </div>
                    )}

                    {request.rejectionReason && (
                      <div
                        className="mt-2 text-sm p-2 rounded"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid var(--error)",
                          color: "var(--window-document-text)",
                        }}
                      >
                        <strong>{tx("requests.rejection_reason_label", "Rejection Reason:")}</strong>{" "}
                        {request.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {activeFilter === "pending" && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(request.userId)}
                        className="beveled-button px-4 py-1 text-sm font-bold flex items-center gap-1 bg-green-500 hover:bg-green-600"
                        style={{ color: "white" }}
                        title={tx("actions.approve", "Approve")}
                      >
                        <Check className="w-4 h-4" />
                        {tx("actions.approve", "Approve")}
                      </button>
                      <button
                        onClick={() => setRejectUserId(request.userId)}
                        className="beveled-button px-4 py-1 text-sm font-bold flex items-center gap-1"
                        style={{
                          backgroundColor: "var(--error)",
                          color: "white",
                        }}
                        title={tx("actions.reject", "Reject")}
                      >
                        <X className="w-4 h-4" />
                        {tx("actions.reject", "Reject")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BetaCodeOperationsPanel tx={tx} />

      {/* Reject modal */}
      {rejectUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="w-full max-w-md rounded"
            style={{
              backgroundColor: "var(--window-document-bg)",
              border: "2px solid var(--window-document-border)",
            }}
          >
            <div
              className="px-3 py-2 flex items-center justify-between"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <div className="text-white font-bold text-sm">
                {tx("modal.reject_title", "Reject Beta Access Request")}
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
                  {tx("modal.rejection_reason_label", "Rejection Reason:")}
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-2 py-1 h-32 resize-none"
                  style={{
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                    border: "2px inset",
                    borderColor: "var(--window-document-border)",
                  }}
                  placeholder={tx(
                    "modal.rejection_reason_placeholder",
                    "Please provide a reason for rejection..."
                  )}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  className="beveled-button px-6 py-2 font-bold"
                  style={{
                    backgroundColor: "var(--error)",
                    color: "white",
                  }}
                >
                  {tx("modal.confirm_rejection", "Confirm Rejection")}
                </button>
                <button
                  onClick={() => {
                    setRejectUserId(null);
                    setRejectionReason("");
                  }}
                  className="beveled-button px-6 py-2 font-bold"
                  style={{
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                >
                  {tx("modal.cancel", "Cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
