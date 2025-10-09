"use client";

import { usePermission } from "./use-auth";
import { useNotification } from "./use-notification";

/**
 * Hook that checks for a permission and optionally shows a notification if denied
 *
 * @param permissionName - The permission to check (e.g., "manage_users")
 * @param options - Configuration options
 * @returns Object with hasPermission boolean and checkAndNotify function
 *
 * @example
 * // Silent permission check (no notification)
 * const { hasPermission } = usePermissionWithNotification("manage_users");
 * if (!hasPermission) return <ViewOnlyMessage />;
 *
 * @example
 * // Show notification on action attempt
 * const { checkAndNotify } = usePermissionWithNotification("manage_roles", {
 *   title: "Permission Required",
 *   message: "You need the 'manage_roles' permission to perform this action."
 * });
 *
 * const handleEdit = () => {
 *   if (!checkAndNotify()) return; // Shows notification if denied
 *   // Proceed with edit action
 * };
 */
export function usePermissionWithNotification(
  permissionName: string,
  options?: {
    title?: string;
    message?: string;
    showNotification?: boolean;
  }
) {
  const hasPermission = usePermission(permissionName);
  const notification = useNotification();

  const checkAndNotify = (): boolean => {
    if (hasPermission) return true;

    if (options?.showNotification !== false) {
      notification.error(
        options?.title || "Permission Denied",
        options?.message ||
          `You don't have permission to perform this action. Required permission: ${permissionName}`,
        true // autoClose
      );
    }

    return false;
  };

  return {
    hasPermission,
    checkAndNotify,
  };
}

/**
 * Permission categories with human-readable names and descriptions
 */
export const PERMISSION_DESCRIPTIONS: Record<string, { title: string; message: string }> = {
  // Organization Management
  manage_organization: {
    title: "Organization Management Required",
    message: "You need organization management permissions to modify organization settings."
  },
  view_organization: {
    title: "View Access Required",
    message: "You need permission to view organization details."
  },

  // User Management
  manage_users: {
    title: "User Management Required",
    message: "You need user management permissions to invite, remove, or modify user roles."
  },
  view_users: {
    title: "View Access Required",
    message: "You need permission to view team members."
  },
  update_profile: {
    title: "Profile Update Required",
    message: "You need permission to update user profiles."
  },

  // Roles & Permissions
  view_roles: {
    title: "View Roles Required",
    message: "You need permission to view roles and permissions."
  },
  manage_roles: {
    title: "Role Management Required",
    message: "You need role management permissions to create, update, or delete roles."
  },
  view_permissions: {
    title: "View Permissions Required",
    message: "You need permission to view available permissions."
  },
  manage_permissions: {
    title: "Permission Management Required",
    message: "You need permission to assign or remove permissions from roles."
  },

  // Financial Management
  manage_financials: {
    title: "Financial Management Required",
    message: "You need financial management permissions to modify billing and subscriptions."
  },
  create_invoice: {
    title: "Invoice Creation Required",
    message: "You need permission to create and generate invoices."
  },
  approve_invoice: {
    title: "Invoice Approval Required",
    message: "You need permission to approve and sign off on invoices."
  },
  view_financials: {
    title: "View Access Required",
    message: "You need permission to view financial reports."
  },

  // Operations Management
  manage_operations: {
    title: "Operations Management Required",
    message: "You need operations management permissions to manage tasks, projects, and events."
  },
  create_task: {
    title: "Task Creation Required",
    message: "You need permission to create new tasks."
  },
  assign_task: {
    title: "Task Assignment Required",
    message: "You need permission to assign tasks to team members."
  },
  execute_task: {
    title: "Task Execution Required",
    message: "You need permission to complete and update tasks."
  },
  view_operations: {
    title: "View Access Required",
    message: "You need permission to view tasks and operational data."
  },

  // Reporting
  create_report: {
    title: "Report Creation Required",
    message: "You need permission to generate custom reports and analytics."
  },
  view_reports: {
    title: "View Access Required",
    message: "You need permission to access dashboards and reports."
  },
  export_data: {
    title: "Data Export Required",
    message: "You need permission to download and export data."
  },
  view_audit_logs: {
    title: "Audit Access Required",
    message: "You need permission to view audit trail and security logs."
  },

  // App Management
  install_apps: {
    title: "App Installation Required",
    message: "You need permission to install and configure apps from the app store."
  },
  manage_apps: {
    title: "App Management Required",
    message: "You need permission to configure and manage installed apps."
  },
  view_apps: {
    title: "View Access Required",
    message: "You need permission to view installed apps and their configurations."
  },
};

/**
 * Helper hook that automatically uses the description from PERMISSION_DESCRIPTIONS
 *
 * @example
 * const { checkAndNotify } = usePermissionCheck("manage_roles");
 *
 * const handleEdit = () => {
 *   if (!checkAndNotify()) return; // Automatically shows appropriate message
 *   // Proceed with action
 * };
 */
export function usePermissionCheck(permissionName: string) {
  const description = PERMISSION_DESCRIPTIONS[permissionName];

  return usePermissionWithNotification(permissionName, {
    title: description?.title,
    message: description?.message,
  });
}
