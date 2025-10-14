/**
 * Role Formatter Utility
 *
 * Provides consistent role name translation across all components.
 * Used in manage window, user tables, modals, etc.
 */

export function formatRoleName(role: string, t: (key: string) => string): string {
  const roleKeyMap: Record<string, string> = {
    super_admin: "ui.manage.roles.super_admin",
    org_owner: "ui.manage.roles.org_owner",
    business_manager: "ui.manage.roles.business_manager",
    employee: "ui.manage.roles.employee",
    viewer: "ui.manage.roles.viewer",
  };

  const key = roleKeyMap[role];
  return key ? t(key) : role;
}
