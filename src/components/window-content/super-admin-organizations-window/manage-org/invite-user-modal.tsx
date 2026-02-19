"use client";

import { useState } from "react";
import { X, UserPlus, Mail, Shield, AlertCircle } from "lucide-react";
import { useAction, useQuery } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../../convex/_generated/api") as { api: any };
import { Id } from "../../../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { formatRoleName } from "@/utils/roleFormatter";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: Id<"organizations">;
}

type OrganizationRoleOption = {
  _id: Id<"roles">;
  name: string;
  description?: string;
};

export function InviteUserModal({ isOpen, onClose, organizationId }: InviteUserModalProps) {
  const { t } = useNamespaceTranslations("ui.organizations");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedRole, setSelectedRole] = useState<Id<"roles"> | "">("");
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { sessionId } = useAuth();
  const inviteUser = useAction(api.organizations.inviteUser);
  const roles = useQuery(api.rbac.getRoles) as OrganizationRoleOption[] | undefined;

  if (!isOpen) return null;

  if (!sessionId) {
    return null; // Not authenticated
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email || !selectedRole) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteUser({
        sessionId,
        email,
        organizationId,
        roleId: selectedRole as Id<"roles">,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        sendEmail,
      });

      setSuccess(true);
      // Reset form
      setEmail("");
      setFirstName("");
      setLastName("");
      setSelectedRole("");

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("ui.manage.invite.error");
      setError(errorMessage);
      console.error("Invitation error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort roles by hierarchy
  const sortedRoles = roles ? [...roles].sort((a: OrganizationRoleOption, b: OrganizationRoleOption) => {
    const roleOrder: Record<string, number> = {
      super_admin: 0,
      org_owner: 1,
      business_manager: 2,
      employee: 3,
      viewer: 4,
    };
    return (roleOrder[a.name] || 99) - (roleOrder[b.name] || 99);
  }) : [];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: "var(--modal-overlay-bg)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 min-w-[500px]"
        style={{
          backgroundColor: "var(--modal-bg)",
          border: "2px solid",
          borderColor: "var(--modal-border)",
          boxShadow: "var(--modal-shadow)",
        }}
      >
        {/* Title Bar */}
        <div
          className="flex items-center justify-between px-2 py-1"
          style={{
            background: "var(--modal-header-bg)",
          }}
        >
          <div className="flex items-center gap-2">
            <UserPlus
              size={16}
              style={{ color: "var(--modal-header-text)" }}
            />
            <span
              className="text-sm font-bold"
              style={{ color: "var(--modal-header-text)" }}
            >
              {t("ui.manage.invite.title")}
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

        {/* Content */}
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
              <p className="font-semibold text-lg mb-2"> {t("ui.manage.invite.success_title")}</p>
              <p className="text-sm">{t("ui.manage.invite.success_message")}</p>
              <p className="text-sm mt-1">{t("ui.manage.invite.success_email_sent")}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
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

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--window-document-text)" }}
                >
                  <Mail size={14} className="inline mr-1" />
                  {t("ui.manage.invite.email_address")}
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                    border: "2px inset",
                    borderColor: "var(--window-document-border)",
                  }}
                  placeholder="user@example.com"
                />
              </div>

              {/* First Name Field */}
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {t("ui.manage.invite.first_name")}
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                    border: "2px inset",
                    borderColor: "var(--window-document-border)",
                  }}
                  placeholder="John"
                />
              </div>

              {/* Last Name Field */}
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--window-document-text)" }}
                >
                  {t("ui.manage.invite.last_name")}
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                    border: "2px inset",
                    borderColor: "var(--window-document-border)",
                  }}
                  placeholder="Doe"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--window-document-text)" }}
                >
                  <Shield size={14} className="inline mr-1" />
                  {t("ui.manage.users.role")}
                </label>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Id<"roles">)}
                  required
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                    border: "2px inset",
                    borderColor: "var(--window-document-border)",
                  }}
                >
                  <option value="">{t("ui.manage.invite.select_role")}</option>
                  {sortedRoles.map((role: OrganizationRoleOption) => (
                    <option key={role._id} value={role._id}>
                      {formatRoleName(role.name, t)} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Send Email Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="cursor-pointer"
                  style={{
                    width: "16px",
                    height: "16px",
                  }}
                />
                <label
                  htmlFor="sendEmail"
                  className="text-sm cursor-pointer"
                  style={{ color: "var(--window-document-text)" }}
                >
                  <Mail size={14} className="inline mr-1" />
                  {t("ui.manage.invite.send_email")}
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-6">
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
                  {t("ui.manage.org.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email || !selectedRole}
                  className="beveled-button px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--button-primary-bg, var(--tone-accent))",
                    color: "var(--button-primary-text, #0f0f0f)",
                  }}
                >
                  {isSubmitting ? t("ui.manage.invite.inviting") : t("ui.manage.invite.send_invitation")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
