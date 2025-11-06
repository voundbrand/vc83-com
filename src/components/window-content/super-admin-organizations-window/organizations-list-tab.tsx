"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Building2, Trash2, Users, Calendar, Loader2, AlertCircle, Archive, Settings } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { useState } from "react";
import { useWindowManager } from "@/hooks/use-window-manager";
import { AdminManageWindow } from "./manage-org";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

/**
 * Organizations List Tab
 *
 * Lists all organizations the user has access to and allows deletion
 */
export function OrganizationsListTab() {
  const { sessionId, switchOrganization, isSuperAdmin } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { openWindow } = useWindowManager();
  const { t } = useNamespaceTranslations("ui.organizations");

  // Archive modal (soft delete - for active orgs)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [orgToArchive, setOrgToArchive] = useState<{ id: Id<"organizations">; name: string; isCurrent: boolean } | null>(null);

  // Delete modal (hard delete - for inactive orgs)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<{ id: Id<"organizations">; name: string } | null>(null);

  // Query user's organizations
  const organizations = useQuery(
    api.organizations.getUserOrganizations,
    sessionId ? { sessionId } : "skip"
  );

  // Actions
  const archiveOrganization = useAction(api.organizations.deleteOrganization); // This soft-deletes
  const restoreOrganization = useAction(api.organizations.restoreOrganization);
  const permanentlyDeleteOrganization = useAction(api.organizations.permanentlyDeleteOrganization);

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

  // Archive handler (soft delete - for active orgs)
  const handleArchiveClick = (organizationId: Id<"organizations">, organizationName: string) => {
    // Count active organizations
    const activeOrgCount = organizations?.filter(item =>
      item.organization?.isActive
    ).length || 0;

    // Check if this is the last active org
    const isLastActiveOrg = activeOrgCount === 1 &&
      organizations?.find(item => item.organization?._id === organizationId)?.organization?.isActive;

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
        // Find another active organization
        const otherActiveOrgs = organizations?.filter(item =>
          item.organization &&
          item.organization.isActive &&
          item.organization._id !== orgToArchive.id
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

  // Loading state
  if (organizations === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} style={{ color: "var(--primary)" }} />
          <p style={{ color: "var(--win95-text)" }}>{t('ui.organizations.list.loading')}</p>
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
          <h3 className="text-lg font-bold mb-2" style={{ color: "var(--win95-text)" }}>
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

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
          {t('ui.organizations.list.title')}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t('ui.organizations.list.subtitle')} ({organizations.length})
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          {t('ui.organizations.list.inactive_note')}
        </p>
      </div>

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
                borderColor: "var(--win95-border)",
                backgroundColor: "var(--win95-bg-light)",
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={18} style={{ color: "var(--primary)" }} />
                    <div className="flex items-center gap-2">
                      <div>
                        <h4 className="font-bold text-sm" style={{ color: "var(--win95-text)" }}>
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

                  <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} style={{ color: "var(--neutral-gray)" }} />
                      <span style={{ color: "var(--win95-text)" }}>
                        {t('ui.organizations.role.label')} <span className="font-semibold">{formatRole(role, t)}</span>
                      </span>
                    </div>

                    {joinedAt && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} style={{ color: "var(--neutral-gray)" }} />
                        <span style={{ color: "var(--win95-text)" }}>
                          {new Date(joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {org.slug && (
                    <div className="mt-2">
                      <span className="text-xs px-2 py-0.5 border" style={{
                        backgroundColor: "var(--win95-bg)",
                        borderColor: "var(--win95-border)",
                        color: "var(--neutral-gray)",
                        fontFamily: "monospace"
                      }}>
                        /{org.slug}
                      </span>
                    </div>
                  )}
                </div>

                <div className="ml-3 flex gap-2">
                  {/* System Admin: Show "Manage" button */}
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleManageClick(org._id, org.name)}
                      className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
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
                          className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: "var(--warning)",
                            color: "white",
                            border: "2px solid",
                            borderTopColor: "var(--win95-button-light)",
                            borderLeftColor: "var(--win95-button-light)",
                            borderBottomColor: "var(--win95-button-dark)",
                            borderRightColor: "var(--win95-button-dark)",
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
                              className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                              style={{
                                backgroundColor: "var(--success)",
                                color: "white",
                                border: "2px solid",
                                borderTopColor: "var(--win95-button-light)",
                                borderLeftColor: "var(--win95-button-light)",
                                borderBottomColor: "var(--win95-button-dark)",
                                borderRightColor: "var(--win95-button-dark)",
                              }}
                            >
                              <Archive size={11} />
                              {t('ui.organizations.button.restore')}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(org._id, org.name)}
                            className="px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: "var(--error)",
                              color: "white",
                              border: "2px solid",
                              borderTopColor: "var(--win95-button-light)",
                              borderLeftColor: "var(--win95-button-light)",
                              borderBottomColor: "var(--win95-button-dark)",
                              borderRightColor: "var(--win95-button-dark)",
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
