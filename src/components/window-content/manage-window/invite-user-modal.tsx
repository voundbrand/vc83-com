"use client";

import { useState } from "react";
import { X, UserPlus, Mail, Shield, AlertCircle } from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: Id<"organizations">;
}

export function InviteUserModal({ isOpen, onClose, organizationId }: InviteUserModalProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedRole, setSelectedRole] = useState<Id<"roles"> | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const inviteUser = useAction(api.organizations.inviteUser);
  const roles = useQuery(api.rbac.getRoles);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!email || !selectedRole) {
      setError("Email and role are required");
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteUser({
        email,
        organizationId,
        roleId: selectedRole as Id<"roles">,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
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
      setError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort roles by hierarchy
  const sortedRoles = roles?.sort((a, b) => {
    const roleOrder: Record<string, number> = {
      super_admin: 0,
      org_owner: 1,
      business_manager: 2,
      employee: 3,
      viewer: 4,
    };
    return (roleOrder[a.name] || 99) - (roleOrder[b.name] || 99);
  });

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
              Invite User
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-0.5 hover:opacity-80"
            style={{
              backgroundColor: "var(--win95-button-face)",
              border: "1px solid",
              borderColor: "var(--win95-button-dark)",
            }}
          >
            <X size={16} style={{ color: "var(--win95-text)" }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {success ? (
            <div
              className="p-4 text-center"
              style={{
                backgroundColor: "var(--success)",
                color: "white",
              }}
            >
              <p className="font-semibold">User invited successfully!</p>
              <p className="text-sm mt-1">An invitation email has been sent.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div
                  className="flex items-start gap-2 p-2"
                  style={{
                    backgroundColor: "var(--error)",
                    color: "white",
                  }}
                >
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--win95-text)" }}
                >
                  <Mail size={14} className="inline mr-1" />
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                    border: "2px inset",
                    borderColor: "var(--win95-input-border-dark)",
                  }}
                  placeholder="user@example.com"
                />
              </div>

              {/* First Name Field */}
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--win95-text)" }}
                >
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                    border: "2px inset",
                    borderColor: "var(--win95-input-border-dark)",
                  }}
                  placeholder="John"
                />
              </div>

              {/* Last Name Field */}
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--win95-text)" }}
                >
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                    border: "2px inset",
                    borderColor: "var(--win95-input-border-dark)",
                  }}
                  placeholder="Doe"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--win95-text)" }}
                >
                  <Shield size={14} className="inline mr-1" />
                  Role *
                </label>
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as Id<"roles">)}
                  required
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: "var(--win95-input-bg)",
                    color: "var(--win95-input-text)",
                    border: "2px inset",
                    borderColor: "var(--win95-input-border-dark)",
                  }}
                >
                  <option value="">Select a role...</option>
                  {sortedRoles?.map((role) => (
                    <option key={role._id} value={role._id}>
                      {formatRoleName(role.name)} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-sm font-semibold"
                  style={{
                    backgroundColor: "var(--win95-button-face)",
                    color: "var(--win95-text)",
                    border: "2px solid",
                    borderTopColor: "var(--win95-button-light)",
                    borderLeftColor: "var(--win95-button-light)",
                    borderBottomColor: "var(--win95-button-dark)",
                    borderRightColor: "var(--win95-button-dark)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email || !selectedRole}
                  className="px-4 py-1.5 text-sm font-semibold disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "white",
                    border: "2px solid",
                    borderTopColor: "var(--win95-button-light)",
                    borderLeftColor: "var(--win95-button-light)",
                    borderBottomColor: "var(--win95-button-dark)",
                    borderRightColor: "var(--win95-button-dark)",
                  }}
                >
                  {isSubmitting ? "Inviting..." : "Send Invitation"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

// Helper function to format role names
function formatRoleName(role: string): string {
  const roleDisplay: Record<string, string> = {
    super_admin: "Super Admin",
    org_owner: "Organization Owner",
    business_manager: "Business Manager",
    employee: "Employee",
    viewer: "Viewer",
  };
  return roleDisplay[role] || role;
}