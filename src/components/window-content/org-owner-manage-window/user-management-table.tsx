"use client";

import { useEffect, useState } from "react";
import { UserPlus, ChevronUp, ChevronDown, User, Shield, Mail, Calendar, Edit2, Trash2 } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { InviteUserModal } from "./invite-user-modal";
import { UserEditModal } from "./user-edit-modal";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/permission-context";
import { PermissionGuard, PermissionButton } from "@/components/permission";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { formatRoleName } from "@/utils/roleFormatter";
const apiAny: any = require("../../../../convex/_generated/api").api;

interface UserManagementTableProps {
  organizationId: Id<"organizations">;
  initialUserEntity?: string;
}

type SortField = "name" | "email" | "role" | "joinedAt";
type SortDirection = "asc" | "desc";

export function UserManagementTable({ organizationId, initialUserEntity }: UserManagementTableProps) {
  const { t } = useNamespaceTranslations("ui.manage");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    user: { id: Id<"users">; email: string; firstName?: string; lastName?: string; avatarUrl?: string };
    currentRoleId: Id<"roles">;
    roleName: string;
    invitationPending: boolean;
  } | null>(null);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [hasAutoOpenedUserEdit, setHasAutoOpenedUserEdit] = useState(false);

  // Get session and permissions from auth context
  const { sessionId, user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  // Avoid deep generated type instantiation in this table path.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unsafeUseMutation = useMutation as any;
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args?: unknown
  ) => unknown;

  const removeUser = unsafeUseMutation(apiAny.organizationMutations.removeUserFromOrganization);

  // Get organization with members
  const organization = unsafeUseQuery(apiAny.organizations.getById,
    organizationId && sessionId ? { organizationId, sessionId } : "skip"
  ) as {
    members?: Array<{
      _id: string;
      user?: { id: Id<"users">; email: string; firstName?: string; lastName?: string; avatarUrl?: string };
      role: Id<"roles">;
      roleName?: string;
      joinedAt?: number;
      isActive: boolean;
      acceptedAt?: number;
    }>;
  } | undefined;

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

  useEffect(() => {
    if (hasAutoOpenedUserEdit || !initialUserEntity || !organization?.members?.length) {
      return;
    }

    const targetUserId = initialUserEntity === "self"
      ? currentUser?.id
      : initialUserEntity;

    if (!targetUserId) {
      return;
    }

    const targetMember = organization.members.find((member) => {
      const memberUserId = member.user?.id ? String(member.user.id) : "";
      return memberUserId === String(targetUserId);
    });

    if (!targetMember?.user) {
      return;
    }

    setSelectedUser({
      user: targetMember.user,
      currentRoleId: targetMember.role,
      roleName: targetMember.roleName || "",
      invitationPending: !targetMember.acceptedAt && targetMember.isActive,
    });
    setShowEditModal(true);
    setHasAutoOpenedUserEdit(true);
  }, [hasAutoOpenedUserEdit, initialUserEntity, organization?.members, currentUser?.id]);

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
            style={{ color: "var(--window-document-text)" }}
          >
            <User size={20} />
            {t("ui.manage.users.team_members")} ({sortedMembers?.length || 0})
          </h3>

          <PermissionGuard permission="manage_users">
            <PermissionButton
              permission="manage_users"
              onClick={() => setShowInviteModal(true)}
              className="desktop-interior-button desktop-interior-button-primary flex items-center gap-2 px-3 py-1.5 text-sm font-semibold"
            >
              <UserPlus size={16} />
              {t("ui.manage.users.invite_user")}
            </PermissionButton>
          </PermissionGuard>
        </div>

        {/* Table */}
        <div
          className="overflow-auto rounded-lg border"
          style={{
            borderColor: "var(--window-document-border)",
            backgroundColor: "var(--window-document-bg)",
          }}
        >
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "var(--desktop-shell-accent)" }}>
                <th
                  className="px-3 py-2 text-left text-sm font-semibold cursor-pointer hover:opacity-80"
                  style={{ color: "var(--table-header-text)" }}
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <User size={14} />
                    {t("ui.manage.users.name")}
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
                    {t("ui.manage.users.email")}
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
                    {t("ui.manage.users.role")}
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
                    {t("ui.manage.users.joined")}
                    <SortIcon field="joinedAt" />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left text-sm font-semibold"
                  style={{ color: "var(--table-header-text)" }}
                >
                  {t("ui.manage.users.status")}
                </th>
                <th
                  className="px-3 py-2 text-left text-sm font-semibold"
                  style={{ color: "var(--table-header-text)" }}
                >
                  {t("ui.manage.users.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMembers?.map((member, index) => (
                <tr
                  key={member._id}
                  className="hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: index % 2 === 0 ? "var(--window-document-bg)" : "var(--window-document-bg-elevated)",
                  }}
                >
                  <td
                    className="px-3 py-2 text-sm"
                    style={{ color: "var(--window-document-text)" }}
                  >
                    {member.user?.firstName || member.user?.lastName
                      ? `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim()
                      : "—"}
                  </td>
                  <td
                    className="px-3 py-2 text-sm"
                    style={{ color: "var(--window-document-text)" }}
                  >
                    {member.user?.email || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <RoleBadge role={member.roleName || "unknown"} />
                  </td>
                  <td
                    className="px-3 py-2 text-sm"
                    style={{ color: "var(--window-document-text-muted)" }}
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
                              invitationPending: !member.acceptedAt && member.isActive,
                            });
                            setShowEditModal(true);
                          }}
                          className="desktop-interior-button desktop-interior-button-primary p-1"
                          title={t("ui.manage.users.edit_user")}
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {hasPermission("manage_users") && member.user?.id !== currentUser?.id && (
                        <PermissionButton
                          permission="manage_users"
                          onClick={async () => {
                            const confirmMsg = `${t("ui.manage.users.confirm_remove")} ${member.user?.email || ""}`;
                            if (confirm(confirmMsg)) {
                              try {
                                await removeUser({
                                  sessionId: sessionId!,
                                  organizationId,
                                  userId: member.user!.id,
                                });
                              } catch (error) {
                                console.error("Failed to remove user:", error);
                                alert(t("ui.manage.users.remove_error") + " " + (error instanceof Error ? error.message : ""));
                              }
                            }
                          }}
                          className="desktop-interior-button desktop-interior-button-danger p-1"
                          title={t("ui.manage.users.remove_user")}
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
                    style={{ color: "var(--window-document-text-muted)" }}
                  >
                    {t("ui.manage.users.no_members")}
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
            avatarUrl: selectedUser.user.avatarUrl,
          }}
          organizationId={organizationId}
          currentRoleId={selectedUser.currentRoleId}
          sessionId={sessionId}
          canEditRole={hasPermission("manage_users")}
          canEditProfile={hasPermission("manage_users") || currentUser?.id === selectedUser.user?.id}
          invitationPending={selectedUser.invitationPending}
          isEditingSelf={currentUser?.id === selectedUser.user?.id}
        />
      )}
    </>
  );
}

// Role Badge Component
function RoleBadge({ role }: { role: string }) {
  const { t } = useNamespaceTranslations("ui.manage");

  const roleConfig: Record<string, { bg: string; text: string }> = {
    super_admin: {
      bg: "var(--badge-super-admin-bg)",
      text: "var(--badge-super-admin-text)",
    },
    org_owner: {
      bg: "var(--badge-org-owner-bg)",
      text: "var(--badge-org-owner-text)",
    },
    business_manager: {
      bg: "var(--badge-manager-bg)",
      text: "var(--badge-manager-text)",
    },
    employee: {
      bg: "var(--badge-employee-bg)",
      text: "var(--badge-employee-text)",
    },
    viewer: {
      bg: "var(--badge-viewer-bg)",
      text: "var(--badge-viewer-text)",
    },
  };

  const config = roleConfig[role] || {
    bg: "var(--neutral-gray)",
    text: "white",
  };

  const displayName = formatRoleName(role, t);

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
      {displayName}
    </span>
  );
}

// Status Badge Component
function StatusBadge({ isActive, acceptedAt }: { isActive: boolean; acceptedAt?: number }) {
  const { t } = useNamespaceTranslations("ui.manage");

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
        {t("ui.manage.users.status.inactive")}
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
        {t("ui.manage.users.status.pending")}
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
      {t("ui.manage.users.status.active")}
    </span>
  );
}
