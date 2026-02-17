"use client";

/**
 * SHARE PROJECT DIALOG
 *
 * Cross-organization project sharing for the Finder window.
 * Allows creating, managing, and accepting share invitations.
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Share2, Users, Shield, X, Check, Trash2, ChevronDown } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface ShareProjectDialogProps {
  sessionId: string;
  projectId: string;
  onClose: () => void;
}

type Permission = "viewer" | "editor" | "admin";
type ShareScope = "project" | "subtree";
type TabId = "new" | "active";

const PERMISSION_LABELS: Record<Permission, string> = {
  viewer: "Viewer",
  editor: "Editor",
  admin: "Admin",
};

const PERMISSION_COLORS: Record<Permission, string> = {
  viewer: "var(--neutral-gray)",
  editor: "var(--primary)",
  admin: "var(--error-red)",
};

// ============================================================================
// SHARE PROJECT DIALOG
// ============================================================================

export function ShareProjectDialog({
  sessionId,
  projectId,
  onClose,
}: ShareProjectDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>("new");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-lg p-6 border rounded-2xl shadow-lg"
        style={{
          background: "var(--window-document-bg-elevated)",
          borderColor: "var(--window-document-border)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md"
          style={{ color: "var(--neutral-gray)" }}
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Share2 size={18} style={{ color: "var(--primary)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            Share Project
          </h3>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b pb-2" style={{ borderColor: "var(--window-document-border)" }}>
          <TabButton
            label="New Share"
            active={activeTab === "new"}
            onClick={() => setActiveTab("new")}
          />
          <TabButton
            label="Active Shares"
            active={activeTab === "active"}
            onClick={() => setActiveTab("active")}
          />
        </div>

        {/* Tab Content */}
        {activeTab === "new" && (
          <NewShareTab sessionId={sessionId} projectId={projectId} />
        )}
        {activeTab === "active" && (
          <ActiveSharesTab sessionId={sessionId} projectId={projectId} />
        )}

        {/* Pending Invites */}
        <PendingInvitesSection sessionId={sessionId} />
      </div>
    </div>
  );
}

// ============================================================================
// TAB BUTTON
// ============================================================================

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`desktop-interior-tab px-3 py-1.5 text-xs font-bold ${active ? "desktop-interior-tab-active" : ""}`}
    >
      {label}
    </button>
  );
}

// ============================================================================
// NEW SHARE TAB
// ============================================================================

function NewShareTab({
  sessionId,
  projectId,
}: {
  sessionId: string;
  projectId: string;
}) {
  const [targetOrgId, setTargetOrgId] = useState("");
  const [permission, setPermission] = useState<Permission>("viewer");
  const [scope, setScope] = useState<ShareScope>("project");
  const [sharedPath, setSharedPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createShare = useMutation(api.projectSharing.createShare);

  const handleSubmit = async () => {
    if (!targetOrgId.trim()) {
      setError("Target Organization ID is required");
      return;
    }
    if (scope === "subtree" && !sharedPath.trim()) {
      setError("Path is required for subtree shares");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createShare({
        sessionId,
        projectId: projectId as Id<"objects">,
        targetOrgId: targetOrgId.trim() as Id<"organizations">,
        shareScope: scope,
        sharedPath: scope === "subtree" ? sharedPath.trim() : undefined,
        permission,
      });

      setSuccess(
        result.autoAccepted
          ? "Share created and auto-accepted (sub-org detected)"
          : "Share invitation sent"
      );
      setTargetOrgId("");
      setSharedPath("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create share");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Target Org ID */}
      <div>
        <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
          <Users size={12} className="inline mr-1" />
          Target Organization ID
        </label>
        <input
          type="text"
          value={targetOrgId}
          onChange={(e) => setTargetOrgId(e.target.value)}
          placeholder="Paste organization ID..."
          className="desktop-interior-input w-full text-xs font-mono"
        />
      </div>

      {/* Permission */}
      <div>
        <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
          <Shield size={12} className="inline mr-1" />
          Permission
        </label>
        <div className="relative">
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as Permission)}
            className="desktop-interior-select w-full text-xs pr-8"
          >
            <option value="viewer">Viewer - Read only</option>
            <option value="editor">Editor - Read & write</option>
            <option value="admin">Admin - Full control</option>
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--neutral-gray)" }}
          />
        </div>
      </div>

      {/* Scope */}
      <div>
        <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
          Share Scope
        </label>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--win95-text)" }}>
            <input
              type="radio"
              name="scope"
              checked={scope === "project"}
              onChange={() => setScope("project")}
            />
            Whole Project
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--win95-text)" }}>
            <input
              type="radio"
              name="scope"
              checked={scope === "subtree"}
              onChange={() => setScope("subtree")}
            />
            Subtree Only
          </label>
        </div>
      </div>

      {/* Subtree Path */}
      {scope === "subtree" && (
        <div>
          <label className="text-xs font-bold block mb-1" style={{ color: "var(--win95-text)" }}>
            Shared Path
          </label>
          <input
            type="text"
            value={sharedPath}
            onChange={(e) => setSharedPath(e.target.value)}
            placeholder="/src/components"
            className="desktop-interior-input w-full text-xs font-mono"
          />
          <p className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
            Only this path and its children will be shared.
          </p>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <p className="text-xs" style={{ color: "var(--error-red)" }}>
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs" style={{ color: "var(--success-green)" }}>
          {success}
        </p>
      )}

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !targetOrgId.trim()}
          className="desktop-interior-button desktop-interior-button-primary px-4 py-2 text-xs font-bold"
          style={{
            opacity: isSubmitting || !targetOrgId.trim() ? 0.5 : 1,
          }}
        >
          {isSubmitting ? "Sharing..." : "Create Share"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVE SHARES TAB
// ============================================================================

function ActiveSharesTab({
  sessionId,
  projectId,
}: {
  sessionId: string;
  projectId: string;
}) {
  const shares = useQuery(api.projectSharing.listMyShares, {
    sessionId,
    projectId: projectId as Id<"objects">,
  });

  const revokeShare = useMutation(api.projectSharing.revokeShare);
  const updatePermission = useMutation(api.projectSharing.updateSharePermission);

  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeShares = shares?.filter(
    (s) => s.status === "active" || s.status === "pending"
  );

  const handleRevoke = async (shareId: Id<"projectShares">) => {
    setRevoking(shareId);
    setError(null);
    try {
      await revokeShare({ sessionId, shareId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to revoke");
    } finally {
      setRevoking(null);
    }
  };

  const handlePermissionChange = async (
    shareId: Id<"projectShares">,
    newPermission: Permission
  ) => {
    setError(null);
    try {
      await updatePermission({ sessionId, shareId, permission: newPermission });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update permission");
    }
  };

  if (shares === undefined) {
    return (
      <p className="text-xs py-4 text-center" style={{ color: "var(--neutral-gray)" }}>
        Loading shares...
      </p>
    );
  }

  if (!activeShares || activeShares.length === 0) {
    return (
      <p className="text-xs py-4 text-center" style={{ color: "var(--neutral-gray)" }}>
        No active shares for this project.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs" style={{ color: "var(--error-red)" }}>
          {error}
        </p>
      )}

      {activeShares.map((share) => (
        <div
          key={share._id}
          className="flex items-center justify-between gap-2 px-3 py-2 border rounded-lg"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg)",
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: "var(--win95-text)" }}>
              {String(share.targetOrgId)}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{
                  background: PERMISSION_COLORS[share.permission],
                  color: "#fff",
                }}
              >
                {PERMISSION_LABELS[share.permission]}
              </span>
              <span className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                {share.shareScope === "subtree" ? share.sharedPath : "Full project"}
              </span>
              {share.status === "pending" && (
                <span className="text-[10px] italic" style={{ color: "var(--neutral-gray)" }}>
                  (pending)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Permission Dropdown */}
            {share.status === "active" && (
              <div className="relative">
                <select
                  value={share.permission}
                  onChange={(e) =>
                    handlePermissionChange(
                      share._id as Id<"projectShares">,
                      e.target.value as Permission
                    )
                  }
                  className="desktop-interior-select text-[10px] py-0.5 pl-1 pr-5"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown
                  size={8}
                  className="absolute right-0.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--neutral-gray)" }}
                />
              </div>
            )}

            {/* Revoke Button */}
            <button
              onClick={() => handleRevoke(share._id as Id<"projectShares">)}
              disabled={revoking === share._id}
              className="desktop-interior-button p-1"
              style={{
                color: "var(--error-red)",
                opacity: revoking === share._id ? 0.5 : 1,
              }}
              title="Revoke share"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PENDING INVITES SECTION
// ============================================================================

function PendingInvitesSection({ sessionId }: { sessionId: string }) {
  const pending = useQuery(api.projectSharing.listPendingInvites, { sessionId });
  const acceptShare = useMutation(api.projectSharing.acceptShare);
  const revokeShare = useMutation(api.projectSharing.revokeShare);

  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!pending || pending.length === 0) return null;

  const handleAccept = async (shareId: Id<"projectShares">) => {
    setProcessing(shareId);
    setError(null);
    try {
      await acceptShare({ sessionId, shareId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (shareId: Id<"projectShares">) => {
    setProcessing(shareId);
    setError(null);
    try {
      await revokeShare({ sessionId, shareId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to decline");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--window-document-border)" }}>
      <h4 className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
        <Users size={12} className="inline mr-1" />
        Pending Invitations ({pending.length})
      </h4>

      {error && (
        <p className="text-xs mb-2" style={{ color: "var(--error-red)" }}>
          {error}
        </p>
      )}

      <div className="space-y-2">
        {pending.map((invite) => (
          <div
            key={invite._id}
            className="flex items-center justify-between gap-2 px-3 py-2 border rounded-lg"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-bg)",
            }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: "var(--win95-text)" }}>
                {invite.projectName}
              </p>
              <p className="text-[10px] truncate" style={{ color: "var(--neutral-gray)" }}>
                From: {invite.ownerOrgName} ({invite.sharedByName})
              </p>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold inline-block mt-0.5"
                style={{
                  background: PERMISSION_COLORS[invite.permission as Permission],
                  color: "#fff",
                }}
              >
                {PERMISSION_LABELS[invite.permission as Permission]}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleAccept(invite._id as Id<"projectShares">)}
                disabled={processing === invite._id}
                className="desktop-interior-button p-1"
                style={{
                  background: "var(--success-green)",
                  color: "#fff",
                  opacity: processing === invite._id ? 0.5 : 1,
                }}
                title="Accept"
              >
                <Check size={12} />
              </button>
              <button
                onClick={() => handleDecline(invite._id as Id<"projectShares">)}
                disabled={processing === invite._id}
                className="desktop-interior-button p-1"
                style={{
                  color: "var(--error-red)",
                  opacity: processing === invite._id ? 0.5 : 1,
                }}
                title="Decline"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
