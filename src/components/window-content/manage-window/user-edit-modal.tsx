"use client";

import { useState } from "react";
import { X, User, Shield, Save, AlertCircle } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

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
}: UserEditModalProps) {
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [selectedRoleId, setSelectedRoleId] = useState<Id<"roles">>(currentRoleId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const updateUserRole = useMutation(api.organizationMutations.updateUserRole);
  const updateUserProfile = useMutation(api.organizationMutations.updateUserProfile);
  const roles = useQuery(api.rbac.getRoles);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const promises = [];

      // Update profile if changed and allowed
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

      // Update role if changed and allowed
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
        // No changes made
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
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
            <User size={16} style={{ color: "var(--modal-header-text)" }} />
            <span
              className="text-sm font-bold"
              style={{ color: "var(--modal-header-text)" }}
            >
              Edit User
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
              <p className="font-semibold">User updated successfully!</p>
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

              {/* Email Field (Read-only) */}
              <div>
                <label
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--win95-text)" }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  disabled
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: "var(--win95-bg)",
                    color: "var(--win95-text-secondary)",
                    border: "2px inset",
                    borderColor: "var(--win95-input-border-dark)",
                    opacity: 0.7,
                  }}
                />
              </div>

              {/* First Name Field */}
              <div>
                <label
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--win95-text)" }}
                >
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!canEditProfile}
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: canEditProfile
                      ? "var(--win95-input-bg)"
                      : "var(--win95-bg)",
                    color: "var(--win95-input-text)",
                    border: "2px inset",
                    borderColor: "var(--win95-input-border-dark)",
                    opacity: canEditProfile ? 1 : 0.7,
                  }}
                  placeholder="John"
                />
              </div>

              {/* Last Name Field */}
              <div>
                <label
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--win95-text)" }}
                >
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!canEditProfile}
                  className="w-full px-2 py-1 text-sm"
                  style={{
                    backgroundColor: canEditProfile
                      ? "var(--win95-input-bg)"
                      : "var(--win95-bg)",
                    color: "var(--win95-input-text)",
                    border: "2px inset",
                    borderColor: "var(--win95-input-border-dark)",
                    opacity: canEditProfile ? 1 : 0.7,
                  }}
                  placeholder="Doe"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label
                  className="block text-sm font-semibold mb-1"
                  style={{ color: "var(--win95-text)" }}
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
                      ? "var(--win95-input-bg)"
                      : "var(--win95-bg)",
                    color: "var(--win95-input-text)",
                    border: "2px inset",
                    borderColor: "var(--win95-input-border-dark)",
                    opacity: canEditRole ? 1 : 0.7,
                  }}
                >
                  {sortedRoles?.map((role) => (
                    <option key={role._id} value={role._id}>
                      {formatRoleName(role.name)} - {role.description}
                    </option>
                  ))}
                </select>
                {!canEditRole && (
                  <p className="text-xs mt-1" style={{ color: "var(--warning)" }}>
                    You don&apos;t have permission to change roles
                  </p>
                )}
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
                  disabled={isSubmitting || (!canEditProfile && !canEditRole)}
                  className="px-4 py-1.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
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
                  <Save size={14} />
                  {isSubmitting ? "Saving..." : "Save Changes"}
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