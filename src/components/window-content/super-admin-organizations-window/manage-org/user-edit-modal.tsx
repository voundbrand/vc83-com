"use client";

import { useState } from "react";
import { X, User, Shield, Save, AlertCircle, Mail, Trash2 } from "lucide-react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { formatRoleName } from "@/utils/roleFormatter";
import { DeleteAccountModal } from "./delete-account-modal";
import { useAuth } from "@/hooks/use-auth";

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    _id: Id<"users">;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  organizationId: Id<"organizations">;
  currentRoleId: Id<"roles">;
  sessionId: string;
  canEditRole: boolean;
  canEditProfile: boolean;
  invitationPending?: boolean;
  isEditingSelf?: boolean;
}

export function UserEditModal({
  isOpen,
  onClose,
  user,
  organizationId,
  currentRoleId,
  sessionId,
  canEditRole,
  canEditProfile,
  invitationPending = false,
  isEditingSelf = false,
}: UserEditModalProps) {
  const { t } = useNamespaceTranslations("ui.organizations");
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [selectedRoleId, setSelectedRoleId] = useState<Id<"roles">>(currentRoleId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const { user: currentUser } = useAuth();
  const updateUserRole = useMutation(api.organizationMutations.updateUserRole);
  const updateUserProfile = useMutation(api.organizationMutations.updateUserProfile);
  const resendInvitation = useAction(api.organizations.resendInvitation);
  const deleteAccountAction = useAction(api.accountManagement.deleteAccount);
  const restoreAccountAction = useAction(api.accountManagement.restoreAccount);
  const assignableRoles = useQuery(api.rbac.getAssignableRoles, {
    sessionId,
    organizationId,
  });

  const handleDeleteAccount = async () => {
    try {
      // Delete account via backend (this also deletes the session)
      await deleteAccountAction({ sessionId });

      // Clear local storage (session already deleted on backend)
      localStorage.removeItem("convex_session_id");

      // Redirect to homepage
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to delete account:", err);
      throw err;
    }
  };

  const handleRestoreAccount = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      await restoreAccountAction({ sessionId });
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        // Refresh the page to update the UI
        window.location.reload();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to restore account";
      setError(errorMessage);
      console.error("Restore account error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const handleResendInvitation = async () => {
    setError("");
    setResendSuccess(false);
    setIsResending(true);

    try {
      await resendInvitation({
        sessionId,
        userId: user._id,
        organizationId,
      });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to resend invitation";
      setError(errorMessage);
      console.error("Resend invitation error:", err);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const promises = [];

      if (canEditProfile && (firstName !== user.firstName || lastName !== user.lastName)) {
        promises.push(
          updateUserProfile({
            sessionId,
            userId: user._id,
            updates: {
              firstName: firstName || undefined,
              lastName: lastName || undefined,
            },
          })
        );
      }

      if (canEditRole && selectedRoleId !== currentRoleId) {
        promises.push(
          updateUserRole({
            sessionId,
            organizationId,
            userId: user._id,
            roleId: selectedRoleId,
          })
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1500);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedRoles = assignableRoles?.sort((a, b) => {
    const roleOrder: Record<string, number> = {
      super_admin: 0,
      enterprise_owner: 1,
      org_owner: 2,
      business_manager: 3,
      translator: 4,
      employee: 5,
      viewer: 6,
    };
    const aOrder = roleOrder[a.name] ?? 100;
    const bOrder = roleOrder[b.name] ?? 100;

    if (aOrder === bOrder) {
      return a.name.localeCompare(b.name);
    }
    return aOrder - bOrder;
  });

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: "var(--modal-overlay-bg)" }}
        onClick={onClose}
      />

      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 min-w-[500px]"
        style={{
          backgroundColor: "var(--modal-bg)",
          border: "2px solid",
          borderColor: "var(--modal-border)",
          boxShadow: "var(--modal-shadow)",
        }}
      >
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{
            background: "var(--modal-header-bg)",
          }}
        >
          <div className="flex items-center gap-2">
            <User size={16} style={{ color: "var(--modal-header-text)" }} />
            <span
              className="text-sm font-bold"
              style={{ color: "var(--modal-header-text)" }}
            >
              {t("ui.manage.edit_user.title")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-0.5 hover:opacity-80"
            style={{
              backgroundColor: "var(--window-document-bg)",
              border: "1px solid",
              borderColor: "var(--window-document-border)",
            }}
          >
            <X size={16} style={{ color: "var(--window-document-text)" }} />
          </button>
        </div>

        <div className="p-4">
          {success ? (
            <div
              className="p-4 text-center rounded"
              style={{
                backgroundColor: "var(--success)",
                color: "white",
                border: "2px solid",
                borderColor: "var(--success)",
              }}
            >
              <p className="font-semibold text-lg mb-2"> Success!</p>
              <p className="text-sm">{t("ui.manage.edit_user.success_message")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  className="flex items-start gap-2 p-3 rounded"
                  style={{
                    backgroundColor: "var(--error)",
                    color: "white",
                    border: "2px solid",
                    borderColor: "var(--error)",
                  }}
                >
                  <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              {resendSuccess && (
                <div
                  className="flex items-start gap-2 p-3 rounded"
                  style={{
                    backgroundColor: "var(--success)",
                    color: "white",
                    border: "2px solid",
                    borderColor: "var(--success)",
                  }}
                >
                  <Mail size={20} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1">{t("ui.manage.edit_user.invitation_sent")}</p>
                    <p className="text-sm">{t("ui.manage.edit_user.invitation_resent_message").replace("{email}", user.email)}</p>
                  </div>
                </div>
              )}

              {invitationPending && (
                <div
                  className="flex items-start gap-2 p-3 rounded"
                  style={{
                    backgroundColor: "var(--warning)",
                    color: "white",
                    border: "2px solid",
                    borderColor: "var(--warning)",
                  }}
                >
                  <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1">{t("ui.manage.edit_user.invitation_pending")}</p>
                    <p className="text-sm">{t("ui.manage.edit_user.invitation_pending_message")}</p>
                  </div>
                </div>
              )}

              <div>
                <label
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {t("ui.manage.invite.email_address")}
                </label>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  disabled
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text-muted)",
                    border: "2px inset",
                    borderColor: "var(--window-document-border)",
                    opacity: 0.7,
                  }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {t("ui.manage.invite.first_name")}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!canEditProfile}
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: canEditProfile
                      ? "var(--window-document-bg)"
                      : "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                    border: "2px inset",
                    borderColor: "var(--window-document-border)",
                    opacity: canEditProfile ? 1 : 0.7,
                  }}
                  placeholder="John"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {t("ui.manage.invite.last_name")}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!canEditProfile}
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: canEditProfile
                      ? "var(--window-document-bg)"
                      : "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                    border: "2px inset",
                    borderColor: "var(--window-document-border)",
                    opacity: canEditProfile ? 1 : 0.7,
                  }}
                  placeholder="Doe"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--window-document-text)" }}
                >
                  <Shield size={14} className="inline mr-1" />
                  Role
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value as Id<"roles">)}
                  disabled={!canEditRole}
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: canEditRole
                      ? "var(--window-document-bg)"
                      : "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                    border: "2px inset",
                    borderColor: "var(--window-document-border)",
                    opacity: canEditRole ? 1 : 0.7,
                  }}
                >
                  {sortedRoles?.map((role) => (
                    <option key={role._id} value={role._id}>
                      {formatRoleName(role.name, t)} - {role.description}
                    </option>
                  ))}
                </select>
                {!canEditRole && (
                  <p className="text-xs mt-1" style={{ color: "var(--warning)" }}>
                    {t("ui.manage.edit_user.no_permission_role")}
                  </p>
                )}
              </div>

              {/* Danger Zone - Only shown when editing self */}
              {isEditingSelf && (
                <div className="mt-8 pt-6 border-t-2" style={{ borderColor: currentUser?.scheduledDeletionDate ? "var(--warning)" : "var(--error)" }}>
                  <h4 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: currentUser?.scheduledDeletionDate ? "var(--warning)" : "var(--error)" }}>
                    <AlertCircle size={16} />
                    {currentUser?.scheduledDeletionDate ? "Account Restoration" : t("ui.manage.delete_account.danger_zone")}
                  </h4>

                  {/* Show Restore button if account is scheduled for deletion */}
                  {currentUser?.scheduledDeletionDate ? (
                    <>
                      <div
                        className="p-3 mb-3 rounded"
                        style={{
                          backgroundColor: "var(--warning)",
                          color: "white",
                          border: "2px solid",
                          borderColor: "var(--warning)",
                        }}
                      >
                        <p className="text-sm font-semibold mb-1"> Account Scheduled for Deletion</p>
                        <p className="text-xs">
                          Your account will be permanently deleted on{" "}
                          <strong>{new Date(currentUser.scheduledDeletionDate).toLocaleDateString()}</strong>.
                          Click below to restore your account.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRestoreAccount}
                        disabled={isSubmitting}
                        className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                        style={{
                          backgroundColor: "var(--success)",
                          color: "white",
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                          <path d="M21 3v5h-5" />
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                          <path d="M3 21v-5h5" />
                        </svg>
                        {isSubmitting ? "Restoring..." : "Restore My Account"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs mb-3" style={{ color: "var(--window-document-text)" }}>
                        {t("ui.manage.delete_account.button_description")}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowDeleteAccountModal(true)}
                        className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2"
                        style={{
                          backgroundColor: "var(--error)",
                          color: "white",
                        }}
                      >
                    <Trash2 size={14} />
                    {t("ui.manage.delete_account.button_text")}
                  </button>
                    </>
                  )}
                </div>
              )}

              <div className="flex justify-between gap-2 mt-6">
                <div>
                  {invitationPending && canEditRole && (
                    <button
                      type="button"
                      onClick={handleResendInvitation}
                      disabled={isResending}
                      className="beveled-button px-4 py-1.5 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--tone-accent)",
                        color: "white",
                      }}
                    >
                      <Mail size={14} />
                      {isResending ? t("ui.manage.edit_user.resending") : t("ui.manage.edit_user.resend_invitation")}
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="beveled-button px-4 py-1.5 text-sm font-semibold"
                    style={{
                      backgroundColor: "var(--window-document-bg)",
                      color: "var(--window-document-text)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (!canEditProfile && !canEditRole)}
                    className="beveled-button px-4 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                    style={{
                      backgroundColor: "var(--button-primary-bg, var(--tone-accent))",
                      color: "var(--button-primary-text, #0f0f0f)",
                    }}
                  >
                    <Save size={14} />
                    {isSubmitting ? t("ui.manage.org.saving") : t("ui.manage.edit_user.save_changes")}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onConfirm={handleDeleteAccount}
        userEmail={user.email}
      />
    </>
  );
}
