"use client";

import { useQuery, useAction, useMutation } from "convex/react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Building2, Trash2, Users, Calendar, Loader2, AlertCircle, Archive, Settings, Globe, Search, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { useState, useMemo, useEffect } from "react";
import { useWindowManager } from "@/hooks/use-window-manager";
import { AdminManageWindow } from "./manage-org";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apiAny: any = require("../../../../convex/_generated/api").api;
const LEGACY_PRICING_MANUAL_REVEAL_FEATURE_KEY = "storeLegacyPricingManualReveal";

/**
 * Organizations List Tab
 *
 * Lists all organizations the user has access to and allows deletion
 * Super admins see ALL organizations (even ones they're not members of)
 * Regular users see only organizations they are members of
 */
export function OrganizationsListTab() {
  const { sessionId, switchOrganization, isSuperAdmin } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { openWindow } = useWindowManager();
  const { t } = useNamespaceTranslations("ui.organizations");
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args: unknown,
  ) => unknown;
  // Avoid deep generated type instantiation on large Convex API unions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unsafeUseAction = useAction as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unsafeUseMutation = useMutation as any;
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [legacyPricingMutationOrgId, setLegacyPricingMutationOrgId] = useState<Id<"organizations"> | null>(null);

  // Archive modal (soft delete - for active orgs)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [orgToArchive, setOrgToArchive] = useState<{ id: Id<"organizations">; name: string; isCurrent: boolean } | null>(null);

  // Delete modal (hard delete - for inactive orgs)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<{ id: Id<"organizations">; name: string } | null>(null);
  const [bulkArchiveModalOpen, setBulkArchiveModalOpen] = useState(false);
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<Id<"organizations">>>(new Set());

  // Query user's organizations (used for regular users and archive safety checks)
  const userOrganizations = unsafeUseQuery(
    apiAny.organizations.getUserOrganizations,
    sessionId ? { sessionId } : "skip"
  ) as
    | Array<{
        organization: {
          _id: Id<"organizations">;
          name: string;
          businessName?: string;
          slug?: string;
          isActive: boolean;
        } | null;
        role: string;
        joinedAt?: number;
      }>
    | null
    | undefined;

  // Query paginated organizations for super admins
  const paginatedOrganizations = unsafeUseQuery(
    apiAny.organizations.listAllPaginated,
    sessionId && isSuperAdmin
      ? {
          sessionId,
          cursor: cursor ?? undefined,
          pageSize,
          search: searchTerm || undefined,
        }
      : "skip"
  ) as
    | {
        organizations: Array<{
          _id: Id<"organizations">;
          name: string;
          businessName?: string;
          slug?: string;
          isActive: boolean;
          createdAt: number;
          memberCount: number;
          legacyPricingStatus?: "hidden" | "compatibility" | "revealed";
          legacyPricingManualRevealEnabled?: boolean;
          hasLegacyPlanAccess?: boolean;
        }>;
        continueCursor: string;
        isDone: boolean;
      }
    | null
    | undefined;

  // Normalize the data format - super admin query returns different structure
  const organizations = useMemo(() => {
    if (isSuperAdmin) {
      if (!paginatedOrganizations) {
        return undefined;
      }
      return paginatedOrganizations.organizations.map((org) => ({
        organization: org,
        role: "super_admin" as const,
        joinedAt: typeof org.createdAt === "number" ? org.createdAt : undefined,
      }));
    }
    return userOrganizations;
  }, [isSuperAdmin, paginatedOrganizations, userOrganizations]);

  const accessibleOrganizations = useMemo(() => {
    return (userOrganizations ?? []).filter((item) => item.organization);
  }, [userOrganizations]);

  const bulkArchivableOrgIds = useMemo(() => {
    return new Set(
      (organizations ?? [])
        .filter(
          (item): item is typeof item & { organization: NonNullable<typeof item.organization> } =>
            !!item.organization &&
            (item.role === "org_owner" || item.role === "super_admin") &&
            item.organization.isActive === true
        )
        .map((item) => item.organization._id)
    );
  }, [organizations]);

  const bulkDeletableOrgIds = useMemo(() => {
    return new Set(
      (organizations ?? [])
        .filter(
          (item): item is typeof item & { organization: NonNullable<typeof item.organization> } =>
            !!item.organization &&
            (item.role === "org_owner" || item.role === "super_admin") &&
            item.organization.isActive === false
        )
        .map((item) => item.organization._id)
    );
  }, [organizations]);

  const selectableOrgIds = useMemo(() => {
    return new Set<Id<"organizations">>([...bulkArchivableOrgIds, ...bulkDeletableOrgIds]);
  }, [bulkArchivableOrgIds, bulkDeletableOrgIds]);

  const selectedActiveCount = useMemo(() => {
    return [...selectedOrgIds].filter((id) => bulkArchivableOrgIds.has(id)).length;
  }, [selectedOrgIds, bulkArchivableOrgIds]);

  const selectedInactiveCount = useMemo(() => {
    return [...selectedOrgIds].filter((id) => bulkDeletableOrgIds.has(id)).length;
  }, [selectedOrgIds, bulkDeletableOrgIds]);

  const selectedCount = selectedActiveCount + selectedInactiveCount;

  const allListedSelected = selectableOrgIds.size > 0 && selectedCount === selectableOrgIds.size;

  useEffect(() => {
    setSelectedOrgIds((prev) => {
      const next = new Set<Id<"organizations">>();
      for (const id of prev) {
        if (selectableOrgIds.has(id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [selectableOrgIds]);

  // Actions
  const archiveOrganization = unsafeUseAction(apiAny.organizations.deleteOrganization); // This soft-deletes
  const restoreOrganization = unsafeUseAction(apiAny.organizations.restoreOrganization);
  const permanentlyDeleteOrganization = unsafeUseAction(apiAny.organizations.permanentlyDeleteOrganization);
  const toggleLegacyPricingOverride = unsafeUseMutation(apiAny.licensing.helpers.toggleFeature);

  const handleToggleLegacyPricing = async (
    organizationId: Id<"organizations">,
    enabled: boolean,
  ) => {
    if (!sessionId || !isSuperAdmin) {
      return;
    }
    setLegacyPricingMutationOrgId(organizationId);
    try {
      await toggleLegacyPricingOverride({
        sessionId,
        organizationId,
        featureKey: LEGACY_PRICING_MANUAL_REVEAL_FEATURE_KEY,
        enabled,
      });
    } catch (error) {
      console.error("Failed to toggle legacy pricing override:", error);
      alert(`Failed to update legacy pricing override: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLegacyPricingMutationOrgId(null);
    }
  };

  // Open AdminManageWindow for system admins
  const handleManageClick = (organizationId: Id<"organizations">, organizationName: string) => {
    openWindow(
      `admin-manage-org-${organizationId}`,
      `Manage ${organizationName}`,
      <AdminManageWindow organizationId={organizationId} />,
      { x: 150, y: 50 },
      { width: 950, height: 600 }
    );
  };

  const applySearch = (value: string) => {
    setSearchTerm(value);
    setCursor(null);
    setCursorHistory([]);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    applySearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    applySearch("");
  };

  const handleNextPage = () => {
    if (!paginatedOrganizations || paginatedOrganizations.isDone) {
      return;
    }
    setCursorHistory((prev) => [...prev, cursor]);
    setCursor(paginatedOrganizations.continueCursor);
  };

  const handlePreviousPage = () => {
    setCursorHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const next = [...prev];
      const previousCursor = next.pop() ?? null;
      setCursor(previousCursor);
      return next;
    });
  };

  // Archive handler (soft delete - for active orgs)
  const handleArchiveClick = (organizationId: Id<"organizations">, organizationName: string) => {
    // Use accessible memberships for safety checks (paged super-admin lists are not complete).
    const activeAccessibleOrgCount = accessibleOrganizations.filter((item) => item.organization?.isActive).length;
    const targetAccessibleOrg = accessibleOrganizations.find(
      (item) => item.organization?._id === organizationId,
    )?.organization;
    const isLastActiveOrg = activeAccessibleOrgCount === 1 && !!targetAccessibleOrg?.isActive;

    if (isLastActiveOrg) {
      // Instead of archiving, offer account deletion
      alert(t('ui.organizations.alert.last_active'));
      return;
    }

    // Check if archiving current org
    const isArchivingCurrentOrg = currentOrg?.id === organizationId;

    setOrgToArchive({
      id: organizationId,
      name: organizationName,
      isCurrent: isArchivingCurrentOrg
    });
    setArchiveModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!sessionId || !orgToArchive) return;

    setIsArchiving(true);
    try {
      // If archiving current org, switch to another active org first
      if (orgToArchive.isCurrent) {
        // Find another active organization from user's memberships.
        const otherActiveOrgs = accessibleOrganizations.filter(
          (item) =>
            item.organization &&
            item.organization.isActive &&
            item.organization._id !== orgToArchive.id,
        );

        if (!otherActiveOrgs || otherActiveOrgs.length === 0) {
          throw new Error("Cannot archive your only active organization. Create another organization first.");
        }

        // Switch to the FIRST other active org
        if (otherActiveOrgs[0].organization) {
          await switchOrganization(otherActiveOrgs[0].organization._id);
        }
      }

      // Now safe to archive
      await archiveOrganization({
        sessionId,
        organizationId: orgToArchive.id,
      });

      // Success - modal will close and org badge will update to "Inactive"
      setArchiveModalOpen(false);
      setOrgToArchive(null);
    } catch (error) {
      console.error("Failed to archive organization:", error);
      alert(t('ui.organizations.error.archive_failed') + " " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsArchiving(false);
    }
  };

  // Restore handler (for inactive orgs)
  const handleRestoreClick = async (organizationId: Id<"organizations">, organizationName: string) => {
    if (!sessionId) return;

    if (!confirm(t('ui.organizations.restore.confirm_message').replace('{name}', organizationName))) {
      return;
    }

    try {
      await restoreOrganization({
        sessionId,
        organizationId,
      });
    } catch (error) {
      console.error("Failed to restore organization:", error);
      alert(t('ui.organizations.error.restore_failed') + " " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  // Delete handler (hard delete - for inactive orgs)
  const handleDeleteClick = (organizationId: Id<"organizations">, organizationName: string) => {
    setOrgToDelete({ id: organizationId, name: organizationName });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!sessionId || !orgToDelete) return;

    setIsDeleting(true);
    try {
      await permanentlyDeleteOrganization({
        sessionId,
        organizationId: orgToDelete.id,
      });
      // Success - modal will close and org will disappear from list
      setDeleteModalOpen(false);
      setOrgToDelete(null);
    } catch (error) {
      console.error("Failed to delete organization:", error);
      alert(t('ui.organizations.error.delete_failed') + " " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleSelectOrg = (organizationId: Id<"organizations">) => {
    if (!selectableOrgIds.has(organizationId)) {
      return;
    }
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(organizationId)) {
        next.delete(organizationId);
      } else {
        next.add(organizationId);
      }
      return next;
    });
  };

  const handleToggleSelectAllListed = () => {
    if (allListedSelected) {
      setSelectedOrgIds(new Set());
      return;
    }
    setSelectedOrgIds(new Set(selectableOrgIds));
  };

  const handleBulkDeleteClick = () => {
    if (selectedInactiveCount === 0) {
      return;
    }
    setBulkDeleteModalOpen(true);
  };

  const handleBulkArchiveClick = () => {
    if (selectedActiveCount === 0) {
      return;
    }
    setBulkArchiveModalOpen(true);
  };

  const handleConfirmBulkArchive = async () => {
    if (!sessionId || selectedActiveCount === 0) {
      return;
    }

    setIsBulkArchiving(true);
    const idsToArchive = [...selectedOrgIds].filter((id) => bulkArchivableOrgIds.has(id));

    try {
      // If archiving current org, switch to another active membership org that is not being archived.
      if (currentOrg?.id && idsToArchive.includes(currentOrg.id as Id<"organizations">)) {
        const otherActiveOrgs = accessibleOrganizations.filter(
          (item) =>
            item.organization &&
            item.organization.isActive &&
            item.organization._id !== (currentOrg.id as Id<"organizations">) &&
            !idsToArchive.includes(item.organization._id),
        );

        if (!otherActiveOrgs || otherActiveOrgs.length === 0) {
          throw new Error("Cannot archive your current organization in bulk unless another active organization remains available.");
        }

        if (otherActiveOrgs[0].organization) {
          await switchOrganization(otherActiveOrgs[0].organization._id);
        }
      }

      const results = await Promise.allSettled(
        idsToArchive.map((organizationId) =>
          archiveOrganization({
            sessionId,
            organizationId,
          })
        )
      );

      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        const firstReason = failed[0].status === "rejected"
          ? (failed[0].reason instanceof Error ? failed[0].reason.message : "Unknown error")
          : "Unknown error";
        alert(`${t('ui.organizations.error.archive_failed')} ${failed.length} of ${results.length} failed. ${firstReason}`);
      }

      setBulkArchiveModalOpen(false);
      setSelectedOrgIds(new Set());
    } catch (error) {
      console.error("Failed to bulk archive organizations:", error);
      alert(t('ui.organizations.error.archive_failed') + " " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsBulkArchiving(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (!sessionId || selectedInactiveCount === 0) {
      return;
    }

    setIsBulkDeleting(true);
    const idsToDelete = [...selectedOrgIds].filter((id) => selectableOrgIds.has(id));

    try {
      const results = await Promise.allSettled(
        idsToDelete.map((organizationId) =>
          permanentlyDeleteOrganization({
            sessionId,
            organizationId,
          })
        )
      );

      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        const firstReason = failed[0].status === "rejected"
          ? (failed[0].reason instanceof Error ? failed[0].reason.message : "Unknown error")
          : "Unknown error";
        alert(`${t('ui.organizations.error.delete_failed')} ${failed.length} of ${results.length} failed. ${firstReason}`);
      }

      setBulkDeleteModalOpen(false);
      setSelectedOrgIds(new Set());
    } catch (error) {
      console.error("Failed to bulk delete organizations:", error);
      alert(t('ui.organizations.error.delete_failed') + " " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Loading state
  if (organizations === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} style={{ color: "var(--primary)" }} />
          <p style={{ color: "var(--window-document-text)" }}>{t('ui.organizations.list.loading')}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!organizations || organizations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <Building2 className="mx-auto mb-4 opacity-50" size={64} style={{ color: "var(--neutral-gray)" }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            {t('ui.organizations.list.empty.title')}
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--neutral-gray)" }}>
            {t('ui.organizations.list.empty.description')}
          </p>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {t('ui.organizations.list.empty.action')}
          </p>
        </div>
      </div>
    );
  }

  const currentPage = cursorHistory.length + 1;

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          {isSuperAdmin && <Globe size={14} style={{ color: "var(--primary)" }} />}
          {t('ui.organizations.list.title')}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {isSuperAdmin
            ? `Viewing ${organizations.length} organizations (page ${currentPage})`
            : `${t('ui.organizations.list.subtitle')} (${organizations.length})`
          }
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          {t('ui.organizations.list.inactive_note')}
        </p>
      </div>

      {isSuperAdmin ? (
        <div
          className="mb-4 border-2 p-3 flex flex-wrap items-center gap-3"
          style={{
            borderColor: "var(--window-document-border)",
            backgroundColor: "var(--window-document-bg-elevated)",
          }}
        >
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--neutral-gray)" }} />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search organizations by name"
                className="pl-8 pr-2 py-1.5 text-xs border min-w-[240px]"
                style={{
                  borderColor: "var(--window-document-border)",
                  backgroundColor: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              />
            </div>
            <button
              type="submit"
              className="beveled-button px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: "var(--window-document-bg)", color: "var(--window-document-text)" }}
            >
              Search
            </button>
            {searchTerm ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="beveled-button px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: "var(--window-document-bg)", color: "var(--window-document-text)" }}
              >
                Clear
              </button>
            ) : null}
          </form>

          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--window-document-text)" }}>
            <span className="font-semibold">Rows</span>
            <select
              value={pageSize}
              onChange={(event) => {
                const nextPageSize = Number(event.target.value);
                setPageSize(nextPageSize);
                setCursor(null);
                setCursorHistory([]);
              }}
              className="px-2 py-1 border text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                backgroundColor: "var(--window-document-bg)",
                color: "var(--window-document-text)",
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-semibold mr-2" style={{ color: "var(--window-document-text)" }}>
              <input
                type="checkbox"
                checked={allListedSelected}
                onChange={handleToggleSelectAllListed}
                disabled={selectableOrgIds.size === 0}
              />
              Select all listed
            </label>
            <button
              type="button"
              onClick={handleBulkArchiveClick}
              disabled={selectedActiveCount === 0}
              className="beveled-button px-3 py-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              style={{ backgroundColor: "var(--warning)", color: "white" }}
            >
              <Archive size={12} />
              Make inactive ({selectedActiveCount})
            </button>
            <button
              type="button"
              onClick={handleBulkDeleteClick}
              disabled={selectedInactiveCount === 0}
              className="beveled-button px-3 py-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              style={{ backgroundColor: "var(--error)", color: "white" }}
            >
              <Trash2 size={12} />
              Delete selected ({selectedInactiveCount})
            </button>
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={cursorHistory.length === 0}
              className="beveled-button px-3 py-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              style={{ backgroundColor: "var(--window-document-bg)", color: "var(--window-document-text)" }}
            >
              <ChevronLeft size={12} />
              Prev
            </button>
            <span className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              Page {currentPage}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={!paginatedOrganizations || paginatedOrganizations.isDone}
              className="beveled-button px-3 py-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              style={{ backgroundColor: "var(--window-document-bg)", color: "var(--window-document-text)" }}
            >
              Next
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {organizations.map((item) => {
          if (!item.organization) return null;

          const org = item.organization;
          const role = item.role;
          const joinedAt = item.joinedAt;

          return (
            <div
              key={org._id}
              className="border-2 p-3"
              style={{
                borderColor: "var(--window-document-border)",
                backgroundColor: "var(--window-document-bg-elevated)",
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={selectedOrgIds.has(org._id)}
                      onChange={() => handleToggleSelectOrg(org._id)}
                      disabled={!selectableOrgIds.has(org._id)}
                      title={!selectableOrgIds.has(org._id) ? "You do not have bulk action access for this organization" : "Select organization"}
                    />
                    <Building2 size={18} style={{ color: "var(--primary)" }} />
                    <div className="flex items-center gap-2">
                      <div>
                        <h4 className="font-bold text-sm" style={{ color: "var(--window-document-text)" }}>
                          {org.name}
                        </h4>
                        {org.businessName && org.businessName !== org.name && (
                          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                            {org.businessName}
                          </p>
                        )}
                      </div>
                      {/* Status Badge */}
                      <span
                        className="px-2 py-0.5 text-[10px] font-semibold border"
                        style={{
                          backgroundColor: org.isActive ? "var(--success)" : "var(--neutral-gray)",
                          color: "white",
                          borderColor: org.isActive ? "var(--success)" : "var(--neutral-gray)",
                        }}
                      >
                        {org.isActive ? t('ui.organizations.status.active') : t('ui.organizations.status.inactive')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} style={{ color: "var(--neutral-gray)" }} />
                      <span style={{ color: "var(--window-document-text)" }}>
                        {t('ui.organizations.role.label')} <span className="font-semibold">{formatRole(role, t)}</span>
                      </span>
                    </div>

                    {/* Show member count for super admin view */}
                    {isSuperAdmin && 'memberCount' in org && (
                      <div className="flex items-center gap-1.5">
                        <Users size={12} style={{ color: "var(--primary)" }} />
                        <span style={{ color: "var(--window-document-text)" }}>
                          <span className="font-semibold">{(org as { memberCount: number }).memberCount}</span> {(org as { memberCount: number }).memberCount === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    )}

                    {isSuperAdmin && "legacyPricingStatus" in org && (
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: "var(--window-document-text)" }}>Legacy pricing:</span>
                        <span
                          className="px-2 py-0.5 text-xs font-semibold border"
                          style={{
                            backgroundColor:
                              org.legacyPricingStatus === "compatibility"
                                ? "var(--success)"
                                : org.legacyPricingStatus === "revealed"
                                  ? "var(--warning)"
                                  : "var(--neutral-gray)",
                            color: "white",
                            borderColor:
                              org.legacyPricingStatus === "compatibility"
                                ? "var(--success)"
                                : org.legacyPricingStatus === "revealed"
                                  ? "var(--warning)"
                                  : "var(--neutral-gray)",
                          }}
                        >
                          {org.legacyPricingStatus === "compatibility"
                            ? "Compatibility"
                            : org.legacyPricingStatus === "revealed"
                              ? "Revealed"
                              : "Hidden"}
                        </span>
                      </div>
                    )}

                    {joinedAt && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} style={{ color: "var(--neutral-gray)" }} />
                        <span style={{ color: "var(--window-document-text)" }}>
                          {new Date(joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {org.slug && (
                    <div className="mt-2">
                      <span className="text-xs px-2 py-0.5 border" style={{
                        backgroundColor: "var(--window-document-bg)",
                        borderColor: "var(--window-document-border)",
                        color: "var(--neutral-gray)",
                        fontFamily: "monospace"
                      }}>
                        /{org.slug}
                      </span>
                    </div>
                  )}
                </div>

                <div className="ml-3 flex gap-2">
                  {isSuperAdmin && "legacyPricingStatus" in org ? (
                    <button
                      onClick={() => {
                        if (org.legacyPricingStatus === "compatibility") {
                          return;
                        }
                        void handleToggleLegacyPricing(
                          org._id,
                          org.legacyPricingStatus !== "revealed",
                        );
                      }}
                      disabled={
                        legacyPricingMutationOrgId === org._id ||
                        org.legacyPricingStatus === "compatibility"
                      }
                      className="beveled-button px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: "var(--window-document-bg)",
                        color: "var(--window-document-text)",
                      }}
                      title={
                        org.legacyPricingStatus === "compatibility"
                          ? "Legacy pricing is automatically available for compatibility."
                          : undefined
                      }
                    >
                      {legacyPricingMutationOrgId === org._id ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : org.legacyPricingStatus === "revealed" ? (
                        <EyeOff size={11} />
                      ) : (
                        <Eye size={11} />
                      )}
                      {org.legacyPricingStatus === "compatibility"
                        ? "Compatibility auto"
                        : org.legacyPricingStatus === "revealed"
                          ? "Hide legacy pricing"
                          : "Reveal legacy pricing"}
                    </button>
                  ) : null}

                  {/* System Admin: Show "Manage" button */}
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleManageClick(org._id, org.name)}
                      className="beveled-button px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: "var(--button-primary-bg, var(--tone-accent))",
                        color: "var(--button-primary-text, #0f0f0f)",
                      }}
                    >
                      <Settings size={11} />
                      {t('ui.organizations.button.manage')}
                    </button>
                  )}

                  {(role === "org_owner" || role === "super_admin") && (
                    <>
                      {org.isActive ? (
                        // Active org: Show "Archive" button (soft delete)
                        <button
                          onClick={() => handleArchiveClick(org._id, org.name)}
                          className="beveled-button px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: "var(--warning)",
                            color: "white",
                          }}
                        >
                          <Archive size={11} />
                          {t('ui.organizations.button.archive')}
                        </button>
                      ) : (
                        // Inactive org: Show "Restore" (super admin only) and "Delete" buttons
                        <div className="flex gap-1">
                          {role === "super_admin" && (
                            <button
                              onClick={() => handleRestoreClick(org._id, org.name)}
                              className="beveled-button px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                              style={{
                                backgroundColor: "var(--success)",
                                color: "white",
                              }}
                            >
                              <Archive size={11} />
                              {t('ui.organizations.button.restore')}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(org._id, org.name)}
                            className="beveled-button px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: "var(--error)",
                              color: "white",
                            }}
                          >
                            <Trash2 size={11} />
                            {t('ui.organizations.button.delete')}
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {role !== "org_owner" && role !== "super_admin" && (
                    <div className="text-xs text-center px-2" style={{ color: "var(--neutral-gray)" }}>
                      <AlertCircle size={12} className="mx-auto mb-0.5" />
                      <p className="text-[10px]">{t('ui.organizations.button.no_access')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Archive Confirmation Modal (soft delete - active orgs) */}
      <ConfirmationModal
        isOpen={archiveModalOpen}
        onClose={() => {
          setArchiveModalOpen(false);
          setOrgToArchive(null);
        }}
        onConfirm={handleConfirmArchive}
        title={t('ui.organizations.archive.title')}
        message={
          orgToArchive?.isCurrent
            ? t('ui.organizations.archive.message_current').replace('{name}', orgToArchive.name)
            : t('ui.organizations.archive.message_other').replace('{name}', orgToArchive?.name || '')
        }
        confirmText={t('ui.organizations.archive.confirm_button')}
        cancelText={t('ui.organizations.button.cancel')}
        variant="warning"
        isLoading={isArchiving}
      />

      {/* Delete Confirmation Modal (hard delete - inactive orgs) */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setOrgToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={t('ui.organizations.delete.title')}
        message={t('ui.organizations.delete.message').replace('{name}', orgToDelete?.name || '')}
        confirmText={t('ui.organizations.delete.confirm_button')}
        cancelText={t('ui.organizations.button.cancel')}
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={bulkArchiveModalOpen}
        onClose={() => {
          setBulkArchiveModalOpen(false);
        }}
        onConfirm={handleConfirmBulkArchive}
        title="Make selected organizations inactive"
        message={`Archive ${selectedActiveCount} selected active organization${selectedActiveCount === 1 ? "" : "s"}?`}
        confirmText={t('ui.organizations.archive.confirm_button')}
        cancelText={t('ui.organizations.button.cancel')}
        variant="warning"
        isLoading={isBulkArchiving}
      />

      <ConfirmationModal
        isOpen={bulkDeleteModalOpen}
        onClose={() => {
          setBulkDeleteModalOpen(false);
        }}
        onConfirm={handleConfirmBulkDelete}
        title="Delete selected organizations"
        message={`Permanently delete ${selectedCount} selected inactive organization${selectedCount === 1 ? "" : "s"}? This cannot be undone.`}
        confirmText={t('ui.organizations.delete.confirm_button')}
        cancelText={t('ui.organizations.button.cancel')}
        variant="danger"
        isLoading={isBulkDeleting}
      />
    </div>
  );
}

function formatRole(role: string, t: (key: string) => string): string {
  const roleMap: Record<string, string> = {
    super_admin: t('ui.organizations.role.super_admin'),
    org_owner: t('ui.organizations.role.org_owner'),
    business_manager: t('ui.organizations.role.business_manager'),
    employee: t('ui.organizations.role.employee'),
    viewer: t('ui.organizations.role.viewer'),
  };
  return roleMap[role] || role;
}
