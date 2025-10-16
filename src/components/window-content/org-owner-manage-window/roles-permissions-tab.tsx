"use client";

import { useState } from "react";
import { Shield, ChevronDown, ChevronRight, Lock, Eye, Edit, Check, X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PermissionGuard } from "@/components/permission";
import { useTranslation } from "@/contexts/translation-context";
import { formatRoleName } from "@/utils/roleFormatter";

type ViewMode = "roles" | "permissions" | "matrix";

export function RolesPermissionsTab() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>("roles");
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

  // Get all roles and permissions
  const roles = useQuery(api.rbac.getRoles, {});
  const allPermissions = useQuery(api.rbac.getPermissions, {});
  const allRolePermissions = useQuery(api.rbac.getAllRolePermissions, {});

  // Create a map of role ID to permissions
  type Permission = NonNullable<typeof allPermissions>[number];
  const rolePermissionsMap = new Map<string, Permission[]>();
  if (allRolePermissions) {
    for (const [roleId, permissions] of Object.entries(allRolePermissions)) {
      rolePermissionsMap.set(roleId, permissions as Permission[]);
    }
  }

  const toggleRole = (roleId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  const toggleResource = (resource: string) => {
    const newExpanded = new Set(expandedResources);
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource);
    } else {
      newExpanded.add(resource);
    }
    setExpandedResources(newExpanded);
  };

  // Group permissions by resource
  const permissionsByResource = allPermissions?.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, typeof allPermissions>);

  const resourceNames: Record<string, string> = {
    organizations: "Organizations",
    users: "Users & Teams",
    purchases: "Financials & Billing",
    invoices: "Invoicing",
    operations: "Operations",
    tasks: "Tasks & Projects",
    reports: "Reports & Analytics",
    auditLogs: "Audit & Security",
    appInstallations: "Apps & Integrations",
  };

  // Use PermissionGuard for view access control
  return (
    <PermissionGuard
      permission="view_roles"
      mode="show-fallback"
      fallback={
        <div className="space-y-4">
          <div
            className="p-4 border-2 flex items-start gap-2"
            style={{
              backgroundColor: 'var(--warning)',
              borderColor: 'var(--win95-border)',
              color: 'var(--win95-text)'
            }}
          >
            <Lock size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">{t("ui.manage.roles_perms.access_restricted")}</p>
              <p className="text-xs mt-1">
                {t("ui.manage.roles_perms.access_restricted_message")}
              </p>
            </div>
          </div>
        </div>
      }
    >
    <div className="space-y-4">
      {/* Header with view mode tabs */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
          {t("ui.manage.roles_perms.title")}
        </h3>

        {/* View Mode Selector */}
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("roles")}
            className="px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: viewMode === "roles" ? "var(--primary)" : "var(--win95-button-face)",
              color: viewMode === "roles" ? "white" : "var(--win95-text)",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            {t("ui.manage.roles_perms.by_role")}
          </button>
          <button
            onClick={() => setViewMode("permissions")}
            className="px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: viewMode === "permissions" ? "var(--primary)" : "var(--win95-button-face)",
              color: viewMode === "permissions" ? "white" : "var(--win95-text)",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            {t("ui.manage.roles_perms.by_permission")}
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            className="px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: viewMode === "matrix" ? "var(--primary)" : "var(--win95-button-face)",
              color: viewMode === "matrix" ? "white" : "var(--win95-text)",
              border: "2px solid",
              borderTopColor: "var(--win95-button-light)",
              borderLeftColor: "var(--win95-button-light)",
              borderBottomColor: "var(--win95-button-dark)",
              borderRightColor: "var(--win95-button-dark)",
            }}
          >
            {t("ui.manage.roles_perms.matrix")}
          </button>
        </div>
      </div>

      <PermissionGuard permission="manage_roles" mode="show-fallback" fallback={
        <div
          className="p-3 border-2 flex items-start gap-2"
          style={{
            backgroundColor: 'var(--info)',
            borderColor: 'var(--win95-border)',
            color: 'white'
          }}
        >
          <Shield size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{t("ui.manage.roles_perms.view_only")}</p>
            <p className="text-xs mt-1">
              {t("ui.manage.roles_perms.view_only_message")}
            </p>
          </div>
        </div>
      }>
        {null}
      </PermissionGuard>

      {/* View by Role */}
      {viewMode === "roles" && (
        <div className="space-y-2">
          {roles?.map((role) => {
            const permissions = rolePermissionsMap.get(role._id) || [];
            const isExpanded = expandedRoles.has(role._id);

            return (
              <div
                key={role._id}
                className="border-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  backgroundColor: 'var(--win95-bg-light)'
                }}
              >
                {/* Role Header */}
                <button
                  onClick={() => toggleRole(role._id)}
                  className="w-full p-3 flex items-center justify-between hover:opacity-80"
                  style={{ backgroundColor: 'var(--table-header-bg)' }}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <RoleBadge role={role.name} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
                      {formatRoleName(role.name, t)}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.manage.roles_perms.permissions_count").replace("{count}", String(permissions.length))}
                  </span>
                </button>

                {/* Role Description */}
                <div className="px-3 py-2 border-b-2" style={{ borderColor: 'var(--win95-border)' }}>
                  <p className="text-xs" style={{ color: 'var(--win95-text-secondary)' }}>
                    {role.description}
                  </p>
                </div>

                {/* Permissions List (Expanded) */}
                {isExpanded && (
                  <div className="p-2">
                    {permissions.length > 0 ? (
                      <div className="grid grid-cols-1 gap-1">
                        {permissions.map((perm) => (
                          <div
                            key={perm._id}
                            className="flex items-start gap-2 p-2 text-xs"
                            style={{
                              backgroundColor: 'var(--win95-bg)',
                              border: '1px solid',
                              borderColor: 'var(--win95-border)'
                            }}
                          >
                            <PermissionIcon action={perm.action} />
                            <div className="flex-1">
                              <div className="font-semibold" style={{ color: 'var(--win95-text)' }}>
                                {perm.name}
                              </div>
                              <div style={{ color: 'var(--win95-text-secondary)' }}>
                                {perm.description}
                              </div>
                              <div className="mt-1 flex gap-2">
                                <span
                                  className="px-1 py-0.5 text-xs"
                                  style={{
                                    backgroundColor: 'var(--badge-employee-bg)',
                                    color: 'var(--badge-employee-text)'
                                  }}
                                >
                                  {perm.resource}
                                </span>
                                <span
                                  className="px-1 py-0.5 text-xs"
                                  style={{
                                    backgroundColor: 'var(--badge-viewer-bg)',
                                    color: 'var(--badge-viewer-text)'
                                  }}
                                >
                                  {perm.action}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-center py-4" style={{ color: 'var(--neutral-gray)' }}>
                        {t("ui.manage.roles_perms.no_permissions")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View by Permission/Resource */}
      {viewMode === "permissions" && permissionsByResource && (
        <div className="space-y-2">
          {Object.entries(permissionsByResource).map(([resource, permissions]) => {
            const isExpanded = expandedResources.has(resource);

            return (
              <div
                key={resource}
                className="border-2"
                style={{
                  borderColor: 'var(--win95-border)',
                  backgroundColor: 'var(--win95-bg-light)'
                }}
              >
                {/* Resource Header */}
                <button
                  onClick={() => toggleResource(resource)}
                  className="w-full p-3 flex items-center justify-between hover:opacity-80"
                  style={{ backgroundColor: 'var(--table-header-bg)' }}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Lock size={16} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--win95-text)' }}>
                      {resourceNames[resource] || resource}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.manage.roles_perms.permissions_count").replace("{count}", String(permissions.length))}
                  </span>
                </button>

                {/* Permissions List (Expanded) */}
                {isExpanded && (
                  <div className="p-2">
                    <div className="grid grid-cols-1 gap-1">
                      {permissions.map((perm) => (
                        <div
                          key={perm._id}
                          className="flex items-start gap-2 p-2 text-xs"
                          style={{
                            backgroundColor: 'var(--win95-bg)',
                            border: '1px solid',
                            borderColor: 'var(--win95-border)'
                          }}
                        >
                          <PermissionIcon action={perm.action} />
                          <div className="flex-1">
                            <div className="font-semibold" style={{ color: 'var(--win95-text)' }}>
                              {perm.name}
                            </div>
                            <div style={{ color: 'var(--win95-text-secondary)' }}>
                              {perm.description}
                            </div>
                            <span
                              className="inline-block mt-1 px-1 py-0.5 text-xs"
                              style={{
                                backgroundColor: 'var(--badge-viewer-bg)',
                                color: 'var(--badge-viewer-text)'
                              }}
                            >
                              {perm.action}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Matrix View */}
      {viewMode === "matrix" && (
        <div
          className="overflow-x-auto border-2"
          style={{
            borderColor: 'var(--win95-border)',
            backgroundColor: 'var(--win95-bg-light)'
          }}
        >
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                <th className="sticky left-0 px-3 py-2 text-left font-semibold" style={{ backgroundColor: 'var(--table-header-bg)', color: 'var(--table-header-text)' }}>
                  {t("ui.manage.roles_perms.permission")}
                </th>
                {roles?.map((role) => (
                  <th
                    key={role._id}
                    className="px-3 py-2 text-center font-semibold min-w-[100px]"
                    style={{ color: 'var(--table-header-text)' }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <RoleBadge role={role.name} />
                      <span className="text-xs">{formatRoleName(role.name, t)}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPermissions?.map((perm, index) => (
                <tr
                  key={perm._id}
                  style={{
                    backgroundColor: index % 2 === 0 ? 'var(--table-row-even-bg)' : 'var(--table-row-odd-bg)'
                  }}
                >
                  <td className="sticky left-0 px-3 py-2" style={{ backgroundColor: index % 2 === 0 ? 'var(--table-row-even-bg)' : 'var(--table-row-odd-bg)' }}>
                    <div className="flex items-center gap-2">
                      <PermissionIcon action={perm.action} />
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--win95-text)' }}>
                          {perm.name}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                          {perm.resource}:{perm.action}
                        </div>
                      </div>
                    </div>
                  </td>
                  {roles?.map((role) => {
                    const permissions = rolePermissionsMap.get(role._id) || [];
                    const hasPermission = permissions.some(p => p._id === perm._id);

                    return (
                      <td key={role._id} className="px-3 py-2 text-center">
                        {hasPermission ? (
                          <Check size={16} className="inline" style={{ color: 'var(--success)' }} />
                        ) : (
                          <X size={16} className="inline" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      <div
        className="p-3 border-2"
        style={{
          backgroundColor: 'var(--win95-bg-light)',
          borderColor: 'var(--win95-border)'
        }}
      >
        <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--win95-text)' }}>
          {t("ui.manage.roles_perms.system_summary")}
        </h4>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="font-semibold" style={{ color: 'var(--primary)' }}>
              {roles?.length || 0}
            </div>
            <div style={{ color: 'var(--win95-text-secondary)' }}>{t("ui.manage.roles_perms.roles")}</div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: 'var(--primary)' }}>
              {allPermissions?.length || 0}
            </div>
            <div style={{ color: 'var(--win95-text-secondary)' }}>{t("ui.manage.roles_perms.permissions")}</div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: 'var(--primary)' }}>
              {permissionsByResource ? Object.keys(permissionsByResource).length : 0}
            </div>
            <div style={{ color: 'var(--win95-text-secondary)' }}>{t("ui.manage.roles_perms.resources")}</div>
          </div>
        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}

// Helper Components
function PermissionIcon({ action }: { action: string }) {
  const iconMap: Record<string, React.ElementType> = {
    read: Eye,
    write: Edit,
    manage: Shield,
    approve: Check,
    assign: Shield,
    update: Edit,
    export: Shield,
    configure: Shield,
    notify: Shield,
    write_self: Edit,
  };

  const Icon = iconMap[action] || Lock;

  return <Icon size={14} style={{ color: 'var(--primary)' }} />;
}

function RoleBadge({ role }: { role: string }) {
  const roleConfig: Record<string, { bg: string; text: string; display: string }> = {
    super_admin: {
      bg: "var(--badge-super-admin-bg)",
      text: "var(--badge-super-admin-text)",
      display: "SA",
    },
    org_owner: {
      bg: "var(--badge-org-owner-bg)",
      text: "var(--badge-org-owner-text)",
      display: "OO",
    },
    business_manager: {
      bg: "var(--badge-manager-bg)",
      text: "var(--badge-manager-text)",
      display: "BM",
    },
    employee: {
      bg: "var(--badge-employee-bg)",
      text: "var(--badge-employee-text)",
      display: "EE",
    },
    viewer: {
      bg: "var(--badge-viewer-bg)",
      text: "var(--badge-viewer-text)",
      display: "VW",
    },
  };

  const config = roleConfig[role] || {
    bg: "var(--neutral-gray)",
    text: "white",
    display: "??",
  };

  return (
    <span
      className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: "1px solid",
        borderColor: config.bg,
        minWidth: "24px",
      }}
    >
      {config.display}
    </span>
  );
}

// formatRoleName is now imported from @/utils/roleFormatter
