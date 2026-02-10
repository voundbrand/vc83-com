"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Check, X, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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
  const { sessionId } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [rejectUserId, setRejectUserId] = useState<Id<"users"> | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Queries
  const betaGatingStatus = useQuery(
    api.betaAccess.getBetaGatingStatus,
    {}
  );

  const betaRequests = useQuery(
    api.betaAccess.listBetaRequests,
    sessionId ? { sessionId, status: activeFilter } : "skip"
  );

  const pendingCount = useQuery(
    api.betaAccess.getPendingBetaRequestCount,
    sessionId ? { sessionId } : "skip"
  );

  // Mutations
  const toggleBetaGating = useMutation(api.betaAccess.toggleBetaGating);
  const approveBetaAccess = useMutation(api.betaAccess.approveBetaAccess);
  const rejectBetaAccess = useMutation(api.betaAccess.rejectBetaAccess);

  const handleToggleGating = async () => {
    if (!sessionId) return;
    try {
      await toggleBetaGating({
        sessionId,
        enabled: !betaGatingStatus?.enabled,
      });
    } catch (error) {
      console.error("Failed to toggle beta gating:", error);
      alert("Failed to toggle beta gating");
    }
  };

  const handleApprove = async (userId: Id<"users">) => {
    if (!sessionId) return;
    try {
      await approveBetaAccess({ sessionId, userId });
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("Failed to approve beta access");
    }
  };

  const handleReject = async () => {
    if (!sessionId || !rejectUserId) return;
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
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
      alert("Failed to reject beta access");
    }
  };

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: "var(--win95-bg)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--neutral-gray)" }} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6" style={{ backgroundColor: "var(--win95-bg)" }}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
          <Shield size={24} style={{ color: "var(--primary)" }} />
          Beta Access Management
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--win95-text-secondary)" }}>
          Control platform-wide beta access gating and manage user requests
        </p>
      </div>

      {/* Beta Gating Toggle */}
      <div
        className="mb-6 p-4 rounded"
        style={{
          backgroundColor: "var(--win95-input-bg)",
          border: "2px solid var(--win95-border)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg" style={{ color: "var(--win95-text)" }}>
              Beta Access Gating
            </h3>
            <p className="text-sm" style={{ color: "var(--win95-text-secondary)" }}>
              Control whether new users need approval to access the platform
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
              backgroundColor: betaGatingStatus?.enabled ? undefined : "var(--win95-button-bg)",
              color: betaGatingStatus?.enabled ? "white" : "var(--win95-text)",
            }}
          >
            {betaGatingStatus?.enabled ? "ON" : "OFF"}
          </button>
        </div>
        <div className="text-sm" style={{ color: "var(--win95-text-secondary)" }}>
          {betaGatingStatus?.enabled ? (
            <span className="flex items-center gap-2">
              <Check size={16} style={{ color: "var(--success)" }} />
              Beta gating is <strong>enabled</strong>. New users must request and receive approval.
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <X size={16} style={{ color: "var(--warning)" }} />
              Beta gating is <strong>disabled</strong>. All users can access the platform freely.
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        {(["pending", "approved", "rejected"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 text-sm font-bold border-2 border-b-0 transition-colors ${
              activeFilter === filter ? "" : "opacity-70"
            }`}
            style={{
              backgroundColor: activeFilter === filter ? "var(--win95-bg)" : "var(--win95-button-bg)",
              color: "var(--win95-text)",
              borderColor: "var(--win95-border)",
            }}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
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
          backgroundColor: "var(--win95-input-bg)",
          border: "2px solid var(--win95-border)",
        }}
      >
        {!betaRequests ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--neutral-gray)" }} />
          </div>
        ) : betaRequests.length === 0 ? (
          <div className="p-8 text-center" style={{ color: "var(--win95-text-secondary)" }}>
            No {activeFilter} beta requests found
          </div>
        ) : (
          <div className="divide-y-2" style={{ borderColor: "var(--win95-border)" }}>
            {betaRequests.map((request) => (
              <div key={request.userId} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-bold" style={{ color: "var(--win95-text)" }}>
                      {request.firstName || request.lastName
                        ? `${request.firstName || ""} ${request.lastName || ""}`.trim()
                        : "No name provided"}
                    </div>
                    <div className="text-sm" style={{ color: "var(--win95-text-secondary)" }}>
                      {request.email}
                    </div>

                    {request.requestedAt && (
                      <div className="text-xs mt-1" style={{ color: "var(--win95-text-secondary)" }}>
                        Requested: {new Date(request.requestedAt).toLocaleString()}
                      </div>
                    )}

                    {request.approvedAt && (
                      <div className="text-xs mt-1" style={{ color: "var(--success)" }}>
                        Approved: {new Date(request.approvedAt).toLocaleString()}
                      </div>
                    )}

                    {request.requestReason && (
                      <div className="mt-2 text-sm" style={{ color: "var(--win95-text)" }}>
                        <strong>Reason:</strong> {request.requestReason}
                      </div>
                    )}

                    {request.useCase && (
                      <div className="mt-1 text-sm" style={{ color: "var(--win95-text)" }}>
                        <strong>Use Case:</strong> {request.useCase}
                      </div>
                    )}

                    {request.referralSource && (
                      <div className="mt-1 text-sm" style={{ color: "var(--win95-text)" }}>
                        <strong>Referral:</strong> {request.referralSource}
                      </div>
                    )}

                    {request.rejectionReason && (
                      <div
                        className="mt-2 text-sm p-2 rounded"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid var(--error)",
                          color: "var(--win95-text)",
                        }}
                      >
                        <strong>Rejection Reason:</strong> {request.rejectionReason}
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
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => setRejectUserId(request.userId)}
                        className="beveled-button px-4 py-1 text-sm font-bold flex items-center gap-1"
                        style={{
                          backgroundColor: "var(--error)",
                          color: "white",
                        }}
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="w-full max-w-md rounded"
            style={{
              backgroundColor: "var(--win95-bg)",
              border: "2px solid var(--win95-border)",
            }}
          >
            <div
              className="px-3 py-2 flex items-center justify-between"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <div className="text-white font-bold text-sm">Reject Beta Access Request</div>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block font-bold mb-2" style={{ color: "var(--win95-text)" }}>
                  Rejection Reason:
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-2 py-1 h-32 resize-none"
                  style={{
                    backgroundColor: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                    border: "2px inset",
                    borderColor: "var(--win95-input-border-dark)",
                  }}
                  placeholder="Please provide a reason for rejection..."
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
                  Confirm Rejection
                </button>
                <button
                  onClick={() => {
                    setRejectUserId(null);
                    setRejectionReason("");
                  }}
                  className="beveled-button px-6 py-2 font-bold"
                  style={{
                    backgroundColor: "var(--win95-button-bg)",
                    color: "var(--win95-text)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
