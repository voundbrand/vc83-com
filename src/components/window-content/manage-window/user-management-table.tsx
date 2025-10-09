"use client";

import { useState } from "react";
import { UserPlus, ChevronUp, ChevronDown, User, Shield, Mail, Calendar, Edit2, Trash2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { InviteUserModal } from "./invite-user-modal";
import { UserEditModal } from "./user-edit-modal";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/permission-context";
import { PermissionGuard, PermissionButton } from "@/components/permission";

interface UserManagementTableProps {
  organizationId: Id<"organizations">;
}

type SortField = "name" | "email" | "role" | "joinedAt";
type SortDirection = "asc" | "desc";

export function UserManagementTable({ organizationId }: UserManagementTableProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    user: { id: Id<"users">; email: string; firstName?: string; lastName?: string };
    currentRoleId: Id<"roles">;
    roleName: string;
  } | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Get session and permissions from auth context
  const { sessionId, user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const removeUser = useMutation(api.organizationMutations.removeUserFromOrganization);

  // Get organization with members
  const organization = useQuery(api.organizations.getById,
    organizationId && sessionId ? { organizationId, sessionId } : "skip"
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort members
  const sortedMembers = organization?.members?.slice().sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case "name":
        aValue = `${a.user?.firstName || ""} ${a.user?.lastName || ""}`.trim().toLowerCase();
        bValue = `${b.user?.firstName || ""} ${b.user?.lastName || ""}`.trim().toLowerCase();
        break;
      case "email":
        aValue = a.user?.email?.toLowerCase() || "";
        bValue = b.user?.email?.toLowerCase() || "";
        break;
      case "role":
        aValue = a.roleName?.toLowerCase() || "";
        bValue = b.roleName?.toLowerCase() || "";
        break;
      case "joinedAt":
        aValue = a.joinedAt || 0;
        bValue = b.joinedAt || 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp size={12} style={{ opacity: 0.3 }} />;
    }
    return sortDirection === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header with Invite Button */}
        <div className="flex justify-between items-center">
          <h3
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: "var(--win95-text)" }}
          >
            <User size={20} />
            Team Members ({sortedMembers?.length || 0})
          </h3>

          <PermissionGuard permission="manage_users">
            <PermissionButton
              permission="manage_users"
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold"
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
              <UserPlus size={16} />
              Invite User
            </PermissionButton>
          </PermissionGuard>
        </div>

        {/* Table */}
        <div
          className="overflow-auto"
          style={{
            border: "2px inset",
            borderColor: "var(--table-border)",
            backgroundColor: "var(--win95-bg-light)",
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "var(--table-header-bg)" }}>
                <th
                  className="px-3 py-2 text-left text-sm font-semibold cursor-pointer hover:opacity-80"
                  style={{ color: "var(--table-header-text)" }}
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    Name
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-sm font-semibold cursor-pointer hover:opacity-80"
                  style={{ color: "var(--table-header-text)" }}
                  onClick={() => handleSort("email")}
                >
                  <div className="flex items-center gap-1">
                    <Mail size={14} />
                    Email
                    <SortIcon field="email" />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-sm font-semibold cursor-pointer hover:opacity-80"
                  style={{ color: "var(--table-header-text)" }}
                  onClick={() => handleSort("role")}
                >
                  <div className="flex items-center gap-1">
                    <Shield size={14} />
                    Role
                    <SortIcon field="role" />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-sm font-semibold cursor-pointer hover:opacity-80"
                  style={{ color: "var(--table-header-text)" }}
                  onClick={() => handleSort("joinedAt")}
                >
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    Joined
                    <SortIcon field="joinedAt" />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-sm font-semibold"
                  style={{ color: "var(--table-header-text)" }}
                >
                  Status
                </th>
                <th
                  className="px-3 py-2 text-left text-sm font-semibold"
                  style={{ color: "var(--table-header-text)" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers?.map((member, index) => (
                <tr
                  key={member._id}
                  className="hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: index % 2 === 0 ? "var(--table-row-even-bg)" : "var(--table-row-odd-bg)",
                  }}
                >
                  <td
                    className="px-3 py-2 text-sm"
                    style={{ color: "var(--win95-text)" }}
                  >
                    {member.user?.firstName || member.user?.lastName
                      ? `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim()
                      : "—"}
                  </td>
                  <td
                    className="px-3 py-2 text-sm"
                    style={{ color: "var(--win95-text)" }}
                  >
                    {member.user?.email || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <RoleBadge role={member.roleName || "unknown"} />
                  </td>
                  <td
                    className="px-3 py-2 text-sm"
                    style={{ color: "var(--win95-text-secondary)" }}
                  >
                    {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      isActive={member.isActive}
                      acceptedAt={member.acceptedAt}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {(hasPermission("manage_users") || currentUser?.id === member.user?.id) && (
                        <button
                          onClick={() => {
                            setSelectedUser({
                              user: member.user!,
                              currentRoleId: member.role,
                              roleName: member.roleName || "",
                            });
                            setShowEditModal(true);
                          }}
                          className="p-1 hover:opacity-80"
                          style={{
                            backgroundColor: "var(--primary)",
                            color: "white",
                            border: "1px solid",
                            borderColor: "var(--primary)",
                          }}
                          title="Edit User"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {hasPermission("manage_users") && member.user?.id !== currentUser?.id && (
                        <PermissionButton
                          permission="manage_users"
                          onClick={async () => {
                            if (confirm(`Remove ${member.user?.email} from the organization?`)) {
                              try {
                                await removeUser({
                                  sessionId: sessionId!,
                                  organizationId,
                                  userId: member.user!.id,
                                });
                              } catch (error) {
                                console.error("Failed to remove user:", error);
                                alert("Failed to remove user. " + (error instanceof Error ? error.message : ""));
                              }
                            }
                          }}
                          className="p-1 hover:opacity-80"
                          style={{
                            backgroundColor: "var(--error)",
                            color: "white",
                            border: "1px solid",
                            borderColor: "var(--error)",
                          }}
                          title="Remove User"
                        >
                          <Trash2 size={14} />
                        </PermissionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {(!sortedMembers || sortedMembers.length === 0) && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm"
                    style={{ color: "var(--win95-text-secondary)" }}
                  >
                    No team members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        organizationId={organizationId}
      />

      {/* Edit User Modal */}
      {selectedUser && sessionId && (
        <UserEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          user={{
            _id: selectedUser.user.id,
            email: selectedUser.user.email,
            firstName: selectedUser.user.firstName,
            lastName: selectedUser.user.lastName,
          }}
          organizationId={organizationId}
          currentRoleId={selectedUser.currentRoleId}
          sessionId={sessionId}
          canEditRole={hasPermission("manage_users")}
          canEditProfile={hasPermission("manage_users") || currentUser?.id === selectedUser.user?.id}
        />
      )}
    </>
  );
}

// Role Badge Component
function RoleBadge({ role }: { role: string }) {
  const roleConfig: Record<string, { bg: string; text: string; display: string }> = {
    super_admin: {
      bg: "var(--badge-super-admin-bg)",
      text: "var(--badge-super-admin-text)",
      display: "Super Admin",
    },
    org_owner: {
      bg: "var(--badge-org-owner-bg)",
      text: "var(--badge-org-owner-text)",
      display: "Owner",
    },
    business_manager: {
      bg: "var(--badge-manager-bg)",
      text: "var(--badge-manager-text)",
      display: "Manager",
    },
    employee: {
      bg: "var(--badge-employee-bg)",
      text: "var(--badge-employee-text)",
      display: "Employee",
    },
    viewer: {
      bg: "var(--badge-viewer-bg)",
      text: "var(--badge-viewer-text)",
      display: "Viewer",
    },
  };

  const config = roleConfig[role] || {
    bg: "var(--neutral-gray)",
    text: "white",
    display: role,
  };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: "1px solid",
        borderColor: config.bg,
      }}
    >
      <Shield size={10} className="mr-1" />
      {config.display}
    </span>
  );
}

// Status Badge Component
function StatusBadge({ isActive, acceptedAt }: { isActive: boolean; acceptedAt?: number }) {
  if (!isActive) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 text-xs font-semibold"
        style={{
          backgroundColor: "var(--badge-inactive-bg)",
          color: "var(--badge-inactive-text)",
          border: "1px solid",
          borderColor: "var(--badge-inactive-bg)",
        }}
      >
        Inactive
      </span>
    );
  }

  if (!acceptedAt) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 text-xs font-semibold"
        style={{
          backgroundColor: "var(--badge-pending-bg)",
          color: "var(--badge-pending-text)",
          border: "1px solid",
          borderColor: "var(--badge-pending-bg)",
        }}
      >
        Pending
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: "var(--badge-active-bg)",
        color: "var(--badge-active-text)",
        border: "1px solid",
        borderColor: "var(--badge-active-bg)",
      }}
    >
      Active
    </span>
  );
}