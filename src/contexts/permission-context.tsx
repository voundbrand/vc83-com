"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNotification } from "@/hooks/use-notification";

/**
 * Permission Context - Application-level permission state
 *
 * Loads user permissions once and makes them available throughout the app.
 * No need for per-component permission queries or multiple boundary layers.
 */

interface PermissionContextValue {
  /**
   * Set of all permissions the current user has
   * Includes wildcard expansion for super admins
   */
  permissions: Set<string>;

  /**
   * Check if user has a specific permission (silent check, no notification)
   */
  hasPermission: (permission: string) => boolean;

  /**
   * Check permission and show notification if denied
   * Returns true if allowed, false if denied
   */
  checkPermission: (
    permission: string,
    options?: {
      title?: string;
      message?: string;
      showNotification?: boolean;
    }
  ) => boolean;

  /**
   * Request permission (always shows notification if denied)
   * Used by declarative components
   */
  requestPermission: (permission: string) => boolean;

  /**
   * Check if user has ANY of the provided permissions
   */
  hasAnyPermission: (permissions: string[]) => boolean;

  /**
   * Check if user has ALL of the provided permissions
   */
  hasAllPermissions: (permissions: string[]) => boolean;

  /**
   * True if user is a super admin (has all permissions)
   */
  isSuperAdmin: boolean;

  /**
   * True if permissions are still loading
   */
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

/**
 * Permission descriptions for user-friendly error messages
 */
const PERMISSION_MESSAGES: Record<string, { title: string; message: string }> = {
  manage_organization: {
    title: "Organization Management Required",
    message: "You need organization management permissions to modify settings.",
  },
  view_organization: {
    title: "View Access Required",
    message: "You need permission to view organization details.",
  },
  manage_users: {
    title: "User Management Required",
    message: "You need user management permissions to invite or modify users.",
  },
  view_users: {
    title: "View Access Required",
    message: "You need permission to view team members.",
  },
  update_profile: {
    title: "Profile Update Required",
    message: "You need permission to update profiles.",
  },
  view_roles: {
    title: "View Roles Required",
    message: "You need permission to view roles and permissions.",
  },
  manage_roles: {
    title: "Role Management Required",
    message: "You need permission to manage roles.",
  },
  view_permissions: {
    title: "View Permissions Required",
    message: "You need permission to view available permissions.",
  },
  manage_permissions: {
    title: "Permission Management Required",
    message: "You need permission to assign or remove permissions.",
  },
  manage_financials: {
    title: "Financial Management Required",
    message: "You need permission to manage billing and subscriptions.",
  },
  create_invoice: {
    title: "Invoice Creation Required",
    message: "You need permission to create invoices.",
  },
  approve_invoice: {
    title: "Invoice Approval Required",
    message: "You need permission to approve invoices.",
  },
  view_financials: {
    title: "View Access Required",
    message: "You need permission to view financial reports.",
  },
  manage_operations: {
    title: "Operations Management Required",
    message: "You need permission to manage operations.",
  },
  create_task: {
    title: "Task Creation Required",
    message: "You need permission to create tasks.",
  },
  assign_task: {
    title: "Task Assignment Required",
    message: "You need permission to assign tasks.",
  },
  execute_task: {
    title: "Task Execution Required",
    message: "You need permission to execute tasks.",
  },
  view_operations: {
    title: "View Access Required",
    message: "You need permission to view operations.",
  },
  create_report: {
    title: "Report Creation Required",
    message: "You need permission to create reports.",
  },
  view_reports: {
    title: "View Access Required",
    message: "You need permission to view reports.",
  },
  export_data: {
    title: "Data Export Required",
    message: "You need permission to export data.",
  },
  view_audit_logs: {
    title: "Audit Access Required",
    message: "You need permission to view audit logs.",
  },
  install_apps: {
    title: "App Installation Required",
    message: "You need permission to install apps.",
  },
  manage_apps: {
    title: "App Management Required",
    message: "You need permission to manage apps.",
  },
  view_apps: {
    title: "View Access Required",
    message: "You need permission to view apps.",
  },
};

interface PermissionProviderProps {
  children: ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const auth = useAuth();
  const notification = useNotification();

  // Get permissions from auth hook (already handles super admin wildcard)
  const userPermissions = auth.permissions || [];
  const permissionSet = new Set(userPermissions);
  const isSuperAdmin = auth.isSuperAdmin || false;

  const hasPermission = (permission: string): boolean => {
    // Super admin has all permissions
    if (isSuperAdmin) return true;

    // Check if user has the specific permission
    return permissionSet.has(permission);
  };

  const checkPermission = (
    permission: string,
    options?: {
      title?: string;
      message?: string;
      showNotification?: boolean;
    }
  ): boolean => {
    if (hasPermission(permission)) return true;

    // Show notification if not explicitly disabled
    if (options?.showNotification !== false) {
      const defaultMessage = PERMISSION_MESSAGES[permission];
      notification.error(
        options?.title || defaultMessage?.title || "Permission Denied",
        options?.message || defaultMessage?.message || `You don't have the '${permission}' permission.`,
        true // autoClose
      );
    }

    return false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (isSuperAdmin) return true;
    return permissions.some((p) => permissionSet.has(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (isSuperAdmin) return true;
    return permissions.every((p) => permissionSet.has(p));
  };

  const requestPermission = (permission: string): boolean => {
    return checkPermission(permission, { showNotification: true });
  };

  const value: PermissionContextValue = {
    permissions: permissionSet,
    hasPermission,
    checkPermission,
    requestPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    isLoading: auth.isLoading,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to access permission context throughout the app
 *
 * @example
 * // Silent check
 * const { hasPermission } = usePermissions();
 * if (!hasPermission("manage_users")) return <ReadOnlyView />;
 *
 * @example
 * // Check with notification
 * const { checkPermission } = usePermissions();
 * const handleEdit = () => {
 *   if (!checkPermission("manage_users")) return;
 *   // Proceed with action
 * };
 *
 * @example
 * // Check multiple permissions
 * const { hasAllPermissions } = usePermissions();
 * const canApprove = hasAllPermissions(["view_financials", "approve_invoice"]);
 */
export function usePermissions() {
  const context = useContext(PermissionContext);

  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }

  return context;
}
