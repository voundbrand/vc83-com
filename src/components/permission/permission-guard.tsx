"use client";

import { ReactNode } from "react";
import { usePermissions } from "@/contexts/permission-context";

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  mode?: "hide" | "show-fallback";
}

/**
 * Declarative permission wrapper - show/hide content based on permissions
 *
 * @example
 * // Hide content if no permission
 * <PermissionGuard permission="manage_users">
 *   <UserManagementPanel />
 * </PermissionGuard>
 *
 * @example
 * // Show fallback if no permission
 * <PermissionGuard permission="manage_organization" fallback={<AccessDenied />}>
 *   <OrganizationSettings />
 * </PermissionGuard>
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
  mode = "hide",
}: PermissionGuardProps) {
  const { hasPermission } = usePermissions();
  const allowed = hasPermission(permission);

  if (!allowed) {
    return mode === "show-fallback" ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}
