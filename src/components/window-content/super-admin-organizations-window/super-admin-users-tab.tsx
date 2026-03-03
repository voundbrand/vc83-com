"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, UserPlus, Users } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";

const apiAny = require("../../../../convex/_generated/api").api as {
  superAdminUserManagement: {
    listUsers: unknown;
    getUserDetail: unknown;
    listOrganizationsLite: unknown;
    createUser: unknown;
    updateUserProfile: unknown;
    setUserActivation: unknown;
    addMembership: unknown;
    changeMembershipRole: unknown;
    removeMembership: unknown;
    setDefaultOrganization: unknown;
    backfillUserSortKeys: unknown;
  };
};

type SortBy = "email" | "name" | "createdAt";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";
type MembershipRoleName = "org_owner" | "business_manager" | "employee" | "viewer";

type UserListRow = {
  id: Id<"users">;
  email: string;
  firstName: string;
  lastName: string;
  status: "active" | "inactive";
  createdAt: number;
  lastActiveAt: number | null;
  betaAccessStatus: "approved" | "pending" | "rejected" | "none";
  membershipCount: number;
  defaultOrgName: string | null;
};

type UserListPage = {
  users: UserListRow[];
  continueCursor: string;
  isDone: boolean;
  pageSize: number;
};

type UserDetailPayload = {
  user: {
    id: Id<"users">;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    status: "active" | "inactive";
    createdAt: number;
    updatedAt: number;
    betaAccessStatus: "approved" | "pending" | "rejected" | "none";
    defaultOrgId: Id<"organizations"> | null;
    defaultOrgName: string | null;
    currentOrgId: Id<"organizations"> | null;
    currentOrgName: string | null;
    scheduledDeletionDate: number | null;
    lastActiveAt: number | null;
  };
  auth: {
    hasPasswordIdentity: boolean;
    passkeyCount: number;
    providers: Array<{
      provider: string;
      providerEmail: string;
      isPrimary: boolean;
      isVerified: boolean;
      connectedAt: number;
      lastUsedAt: number | null;
    }>;
  };
  memberships: Array<{
    membershipId: Id<"organizationMembers">;
    organizationId: Id<"organizations">;
    organizationName: string;
    roleId: Id<"roles">;
    roleName: string;
    isActive: boolean;
    joinedAt: number;
  }>;
};

type OrganizationLite = {
  id: Id<"organizations">;
  name: string;
  businessName: string;
  isActive: boolean;
};

const roleOptions: MembershipRoleName[] = ["org_owner", "business_manager", "employee", "viewer"];

function formatDate(timestamp: number | null): string {
  if (!timestamp) {
    return "N/A";
  }
  return new Date(timestamp).toLocaleString();
}

export function SuperAdminUsersTab() {
  const { sessionId } = useAuth();
  const unsafeUseQuery = useQuery as unknown as (queryRef: unknown, args: unknown) => unknown;
  const unsafeUseMutation = useMutation as unknown as (mutationRef: unknown) => (args: unknown) => Promise<unknown>;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBackfillingSortKeys, setIsBackfillingSortKeys] = useState(false);

  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createOrgId, setCreateOrgId] = useState<Id<"organizations"> | "">("");
  const [createRoleName, setCreateRoleName] = useState<MembershipRoleName>("employee");

  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileBetaStatus, setProfileBetaStatus] = useState<"approved" | "pending" | "rejected" | "none">("none");
  const [addMembershipOrgId, setAddMembershipOrgId] = useState<Id<"organizations"> | "">("");
  const [addMembershipRoleName, setAddMembershipRoleName] = useState<MembershipRoleName>("employee");
  const [defaultOrgCandidate, setDefaultOrgCandidate] = useState<Id<"organizations"> | "">("");
  const [activeMembershipRoleDraft, setActiveMembershipRoleDraft] = useState<Record<string, MembershipRoleName>>({});

  const listUsersResult = unsafeUseQuery(
    apiAny.superAdminUserManagement.listUsers,
    sessionId
      ? {
          sessionId,
          cursor: cursor ?? undefined,
          pageSize: 50,
          search: search.trim() || undefined,
          status,
          sortBy,
          sortDirection,
        }
      : "skip"
  ) as UserListPage | null | undefined;

  const organizations = unsafeUseQuery(
    apiAny.superAdminUserManagement.listOrganizationsLite,
    sessionId ? { sessionId, limit: 250 } : "skip"
  ) as OrganizationLite[] | undefined;

  const userDetail = unsafeUseQuery(
    apiAny.superAdminUserManagement.getUserDetail,
    sessionId && selectedUserId ? { sessionId, userId: selectedUserId } : "skip"
  ) as UserDetailPayload | null | undefined;

  const createUser = unsafeUseMutation(apiAny.superAdminUserManagement.createUser);
  const updateUserProfile = unsafeUseMutation(apiAny.superAdminUserManagement.updateUserProfile);
  const setUserActivation = unsafeUseMutation(apiAny.superAdminUserManagement.setUserActivation);
  const addMembership = unsafeUseMutation(apiAny.superAdminUserManagement.addMembership);
  const changeMembershipRole = unsafeUseMutation(apiAny.superAdminUserManagement.changeMembershipRole);
  const removeMembership = unsafeUseMutation(apiAny.superAdminUserManagement.removeMembership);
  const setDefaultOrganization = unsafeUseMutation(apiAny.superAdminUserManagement.setDefaultOrganization);
  const backfillUserSortKeys = unsafeUseMutation(apiAny.superAdminUserManagement.backfillUserSortKeys);

  const users = listUsersResult?.users ?? [];
  const hasNextPage = Boolean(listUsersResult?.continueCursor && !listUsersResult?.isDone);
  const hasPreviousPage = cursorHistory.length > 1;

  const selectedUser = useMemo(() => {
    return users.find((user) => user.id === selectedUserId) ?? null;
  }, [users, selectedUserId]);

  const resetMessages = () => {
    setNoticeMessage("");
    setErrorMessage("");
  };

  const resetPagination = () => {
    setCursor(null);
    setCursorHistory([null]);
  };

  useEffect(() => {
    if (!userDetail) {
      return;
    }
    setProfileFirstName(userDetail.user.firstName ?? "");
    setProfileLastName(userDetail.user.lastName ?? "");
    setProfileEmail(userDetail.user.email ?? "");
    setProfileAvatarUrl(userDetail.user.avatarUrl ?? "");
    setProfileBetaStatus(userDetail.user.betaAccessStatus ?? "none");
    setDefaultOrgCandidate(userDetail.user.defaultOrgId ?? "");
  }, [userDetail]);

  const handleCreateUser = async () => {
    resetMessages();
    if (!sessionId) {
      setErrorMessage("Not authenticated.");
      return;
    }
    if (!createEmail.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    try {
      const result = (await createUser({
        sessionId,
        email: createEmail.trim(),
        firstName: createFirstName.trim() || undefined,
        lastName: createLastName.trim() || undefined,
        initialMembership:
          createOrgId !== ""
            ? {
                organizationId: createOrgId,
                roleName: createRoleName,
                setAsDefaultOrg: true,
              }
            : undefined,
      })) as { success: boolean; userId: Id<"users"> };

      setNoticeMessage("User created.");
      setCreateEmail("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreateOrgId("");
      setCreateRoleName("employee");
      setSelectedUserId(result.userId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create user.");
    }
  };

  const handleUpdateProfile = async () => {
    resetMessages();
    if (!sessionId || !selectedUserId) {
      return;
    }
    try {
      await updateUserProfile({
        sessionId,
        userId: selectedUserId,
        updates: {
          email: profileEmail.trim(),
          firstName: profileFirstName,
          lastName: profileLastName,
          avatarUrl: profileAvatarUrl,
          betaAccessStatus: profileBetaStatus,
        },
      });
      setNoticeMessage("Profile updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update profile.");
    }
  };

  const handleActivationToggle = async () => {
    resetMessages();
    if (!sessionId || !userDetail) {
      return;
    }

    const activate = userDetail.user.status !== "active";
    const confirmationMessage = activate
      ? `Reactivate ${userDetail.user.email}?`
      : `Deactivate ${userDetail.user.email}? This is a privileged action.`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    try {
      await setUserActivation({
        sessionId,
        userId: userDetail.user.id,
        active: activate,
      });
      setNoticeMessage(activate ? "User reactivated." : "User deactivated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to change user status.");
    }
  };

  const handleAddMembership = async () => {
    resetMessages();
    if (!sessionId || !selectedUserId || addMembershipOrgId === "") {
      return;
    }
    try {
      await addMembership({
        sessionId,
        userId: selectedUserId,
        organizationId: addMembershipOrgId,
        roleName: addMembershipRoleName,
        setAsDefaultOrg: false,
      });
      setNoticeMessage("Membership added.");
      setAddMembershipOrgId("");
      setAddMembershipRoleName("employee");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to add membership.");
    }
  };

  const handleMembershipRoleChange = async (
    organizationId: Id<"organizations">,
    roleName: MembershipRoleName
  ) => {
    resetMessages();
    if (!sessionId || !selectedUserId) {
      return;
    }
    try {
      await changeMembershipRole({
        sessionId,
        userId: selectedUserId,
        organizationId,
        roleName,
      });
      setNoticeMessage("Role updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to change role.");
    }
  };

  const handleRemoveMembership = async (organizationId: Id<"organizations">) => {
    resetMessages();
    if (!sessionId || !selectedUserId) {
      return;
    }
    if (!window.confirm("Remove this organization membership?")) {
      return;
    }
    try {
      await removeMembership({
        sessionId,
        userId: selectedUserId,
        organizationId,
      });
      setNoticeMessage("Membership removed.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to remove membership.");
    }
  };

  const handleSetDefaultOrg = async () => {
    resetMessages();
    if (!sessionId || !selectedUserId) {
      return;
    }
    try {
      await setDefaultOrganization({
        sessionId,
        userId: selectedUserId,
        organizationId: defaultOrgCandidate === "" ? null : defaultOrgCandidate,
      });
      setNoticeMessage("Default organization updated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to set default organization.");
    }
  };

  const handleBackfillSortKeys = async () => {
    resetMessages();
    if (!sessionId || isBackfillingSortKeys) {
      return;
    }

    setIsBackfillingSortKeys(true);
    try {
      let backfillCursor: string | null = null;
      let totalUpdated = 0;

      for (;;) {
        const result = (await backfillUserSortKeys({
          sessionId,
          cursor: backfillCursor ?? undefined,
          pageSize: 250,
        })) as {
          updatedCount: number;
          continueCursor: string;
          isDone: boolean;
        };
        totalUpdated += result.updatedCount;
        if (result.isDone) {
          break;
        }
        backfillCursor = result.continueCursor;
      }

      setNoticeMessage(`Backfilled deterministic sort keys for ${totalUpdated} users.`);
      resetPagination();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to backfill sort keys.");
    } finally {
      setIsBackfillingSortKeys(false);
    }
  };

  return (
    <div className="h-full overflow-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <Users size={18} />
            Super Admin User Management
          </h2>
          <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
            Full platform user visibility and organization-level membership controls.
          </p>
        </div>
        <button
          type="button"
          disabled={isBackfillingSortKeys}
          onClick={handleBackfillSortKeys}
          className="px-3 py-1 text-xs border-2 disabled:opacity-50"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
        >
          {isBackfillingSortKeys ? "Backfilling..." : "Backfill Sort Keys"}
        </button>
      </div>

      {noticeMessage && (
        <div className="mb-3 p-2 text-xs rounded flex items-center gap-2" style={{ background: "var(--success)", color: "white" }}>
          <CheckCircle2 size={14} />
          {noticeMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-3 p-2 text-xs rounded flex items-center gap-2" style={{ background: "var(--error)", color: "white" }}>
          <AlertCircle size={14} />
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
        <section className="border-2 p-3" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPagination();
              }}
              placeholder="Search by email or name"
              className="px-2 py-1 text-xs border-2 md:col-span-2"
              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                resetPagination();
              }}
              className="px-2 py-1 text-xs border-2"
              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as SortBy);
                  resetPagination();
                }}
                className="px-2 py-1 text-xs border-2 w-full"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              >
                <option value="createdAt">Created</option>
                <option value="email">Email</option>
                <option value="name">Name</option>
              </select>
              <select
                value={sortDirection}
                onChange={(event) => {
                  setSortDirection(event.target.value as SortDirection);
                  resetPagination();
                }}
                className="px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>

          <div className="text-xs mb-2" style={{ color: "var(--window-document-text-muted)" }}>
            Loaded users in page: {users.length} (page size {listUsersResult?.pageSize ?? 0})
          </div>

          <div className="mb-2 flex gap-2">
            <button
              type="button"
              disabled={!hasPreviousPage}
              onClick={() => {
                if (cursorHistory.length <= 1) {
                  return;
                }
                const nextHistory = cursorHistory.slice(0, -1);
                const previousCursor = nextHistory[nextHistory.length - 1] ?? null;
                setCursorHistory(nextHistory);
                setCursor(previousCursor);
              }}
              className="px-2 py-1 text-xs border-2 disabled:opacity-50"
              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNextPage}
              onClick={() => {
                if (!listUsersResult?.continueCursor) {
                  return;
                }
                setCursorHistory((previous) => [...previous, listUsersResult.continueCursor]);
                setCursor(listUsersResult.continueCursor);
              }}
              className="px-2 py-1 text-xs border-2 disabled:opacity-50"
              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
            >
              Next
            </button>
          </div>

          <div className="max-h-[420px] overflow-auto border-2" style={{ borderColor: "var(--window-document-border)" }}>
            <table className="w-full text-xs">
              <thead style={{ background: "var(--window-document-bg-elevated)" }}>
                <tr>
                  <th className="text-left px-2 py-1">Email</th>
                  <th className="text-left px-2 py-1">Name</th>
                  <th className="text-left px-2 py-1">Status</th>
                  <th className="text-left px-2 py-1">Created</th>
                  <th className="text-left px-2 py-1">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => {
                      setSelectedUserId(user.id);
                    }}
                    className="cursor-pointer"
                    style={{
                      background: selectedUserId === user.id ? "var(--window-document-bg-elevated)" : "transparent",
                      borderTop: "1px solid var(--window-document-border)",
                    }}
                  >
                    <td className="px-2 py-1">{user.email}</td>
                    <td className="px-2 py-1">{`${user.firstName} ${user.lastName}`.trim() || "N/A"}</td>
                    <td className="px-2 py-1">{user.status}</td>
                    <td className="px-2 py-1">{formatDate(user.createdAt)}</td>
                    <td className="px-2 py-1">{formatDate(user.lastActiveAt)}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td className="px-2 py-2" colSpan={5}>
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 border-2 p-3" style={{ borderColor: "var(--window-document-border)" }}>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <UserPlus size={14} />
              Create User
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="email"
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
                placeholder="Email *"
                className="px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              />
              <input
                type="text"
                value={createFirstName}
                onChange={(event) => setCreateFirstName(event.target.value)}
                placeholder="First name"
                className="px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              />
              <input
                type="text"
                value={createLastName}
                onChange={(event) => setCreateLastName(event.target.value)}
                placeholder="Last name"
                className="px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              />
              <select
                value={createOrgId}
                onChange={(event) => setCreateOrgId(event.target.value as Id<"organizations"> | "")}
                className="px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              >
                <option value="">No initial org</option>
                {(organizations ?? []).map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              <select
                value={createRoleName}
                onChange={(event) => setCreateRoleName(event.target.value as MembershipRoleName)}
                className="px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCreateUser}
                className="px-2 py-1 text-xs border-2"
                style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
              >
                Create User
              </button>
            </div>
          </div>
        </section>

        <section className="border-2 p-3" style={{ borderColor: "var(--window-document-border)" }}>
          {!userDetail ? (
            <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
              Select a user to view details.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">{userDetail.user.email}</h3>
                <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                  Created: {formatDate(userDetail.user.createdAt)} | Last active: {formatDate(userDetail.user.lastActiveAt)}
                </p>
                <p className="text-xs" style={{ color: "var(--window-document-text-muted)" }}>
                  Default org: {userDetail.user.defaultOrgName ?? "None"} | Current org: {userDetail.user.currentOrgName ?? "N/A"}
                </p>
              </div>

              <div className="border-2 p-2" style={{ borderColor: "var(--window-document-border)" }}>
                <h4 className="text-xs font-semibold mb-2">Profile</h4>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    value={profileEmail}
                    onChange={(event) => setProfileEmail(event.target.value)}
                    placeholder="Email"
                    className="px-2 py-1 text-xs border-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                  />
                  <input
                    value={profileFirstName}
                    onChange={(event) => setProfileFirstName(event.target.value)}
                    placeholder="First name"
                    className="px-2 py-1 text-xs border-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                  />
                  <input
                    value={profileLastName}
                    onChange={(event) => setProfileLastName(event.target.value)}
                    placeholder="Last name"
                    className="px-2 py-1 text-xs border-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                  />
                  <input
                    value={profileAvatarUrl}
                    onChange={(event) => setProfileAvatarUrl(event.target.value)}
                    placeholder="Avatar URL"
                    className="px-2 py-1 text-xs border-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                  />
                  <select
                    value={profileBetaStatus}
                    onChange={(event) =>
                      setProfileBetaStatus(event.target.value as "approved" | "pending" | "rejected" | "none")
                    }
                    className="px-2 py-1 text-xs border-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                  >
                    <option value="none">beta: none</option>
                    <option value="pending">beta: pending</option>
                    <option value="approved">beta: approved</option>
                    <option value="rejected">beta: rejected</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleUpdateProfile}
                    className="px-2 py-1 text-xs border-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
                  >
                    Save Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleActivationToggle}
                    className="px-2 py-1 text-xs border-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
                  >
                    {userDetail.user.status === "active" ? "Deactivate User" : "Reactivate User"}
                  </button>
                </div>
              </div>

              <div className="border-2 p-2" style={{ borderColor: "var(--window-document-border)" }}>
                <h4 className="text-xs font-semibold mb-2">Auth methods</h4>
                <p className="text-xs">
                  Password identity: {userDetail.auth.hasPasswordIdentity ? "yes" : "no"} | Passkeys: {userDetail.auth.passkeyCount}
                </p>
                <ul className="text-xs mt-1 space-y-1">
                  {userDetail.auth.providers.map((provider) => (
                    <li key={`${provider.provider}-${provider.providerEmail}`}>
                      {provider.provider} ({provider.providerEmail}) {provider.isPrimary ? "[primary]" : ""}
                    </li>
                  ))}
                  {userDetail.auth.providers.length === 0 && <li>No linked providers.</li>}
                </ul>
              </div>

              <div className="border-2 p-2" style={{ borderColor: "var(--window-document-border)" }}>
                <h4 className="text-xs font-semibold mb-2">Memberships</h4>
                <div className="space-y-2">
                  {userDetail.memberships
                    .filter((membership) => membership.isActive)
                    .map((membership) => {
                      const roleDraft =
                        activeMembershipRoleDraft[membership.organizationId] ??
                        (membership.roleName as MembershipRoleName);
                      return (
                        <div
                          key={membership.membershipId}
                          className="border p-2 text-xs"
                          style={{ borderColor: "var(--window-document-border)" }}
                        >
                          <div className="font-semibold">{membership.organizationName}</div>
                          <div className="flex gap-2 mt-1">
                            <select
                              value={roleDraft}
                              onChange={(event) =>
                                setActiveMembershipRoleDraft((previous) => ({
                                  ...previous,
                                  [membership.organizationId]: event.target.value as MembershipRoleName,
                                }))
                              }
                              className="px-2 py-1 border"
                              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleMembershipRoleChange(membership.organizationId, roleDraft)}
                              className="px-2 py-1 border"
                              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
                            >
                              Change Role
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveMembership(membership.organizationId)}
                              className="px-2 py-1 border"
                              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2">
                  <select
                    value={addMembershipOrgId}
                    onChange={(event) => setAddMembershipOrgId(event.target.value as Id<"organizations"> | "")}
                    className="px-2 py-1 text-xs border-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                  >
                    <option value="">Select organization</option>
                    {(organizations ?? []).map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={addMembershipRoleName}
                    onChange={(event) => setAddMembershipRoleName(event.target.value as MembershipRoleName)}
                    className="px-2 py-1 text-xs border-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMembership}
                    className="px-2 py-1 text-xs border-2"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
                  >
                    Add Membership
                  </button>
                </div>
              </div>

              <div className="border-2 p-2" style={{ borderColor: "var(--window-document-border)" }}>
                <h4 className="text-xs font-semibold mb-2">Default organization</h4>
                <select
                  value={defaultOrgCandidate}
                  onChange={(event) => setDefaultOrgCandidate(event.target.value as Id<"organizations"> | "")}
                  className="px-2 py-1 text-xs border-2 w-full"
                  style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
                >
                  <option value="">None</option>
                  {userDetail.memberships
                    .filter((membership) => membership.isActive)
                    .map((membership) => (
                      <option key={membership.membershipId} value={membership.organizationId}>
                        {membership.organizationName}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleSetDefaultOrg}
                  className="px-2 py-1 text-xs border-2 mt-2"
                  style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
                >
                  Set Default Org
                </button>
              </div>
            </div>
          )}
          {selectedUser && !userDetail && (
            <p className="text-xs mt-2" style={{ color: "var(--window-document-text-muted)" }}>
              Loading detail for {selectedUser.email}...
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
