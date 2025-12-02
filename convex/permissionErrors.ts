/**
 * Permission Error Messages
 *
 * Standardized error messages for permission-related failures
 * These provide user-friendly guidance instead of generic error messages
 */

/**
 * Get a user-friendly permission denied error message
 */
export function getPermissionDeniedError(permissionName: string): string {
  const baseMessage = `Permission denied: ${permissionName} required.`;
  const helpMessage = `Please contact your organization owner to grant you this permission in Organization Settings → Roles & Permissions.`;

  return `${baseMessage} ${helpMessage}`;
}

/**
 * Common permission error messages for specific permissions
 */
export const PERMISSION_ERRORS = {
  view_templates: getPermissionDeniedError("view_templates"),
  create_templates: getPermissionDeniedError("create_templates"),
  edit_templates: getPermissionDeniedError("edit_templates"),
  delete_templates: getPermissionDeniedError("delete_templates"),
  apply_templates: getPermissionDeniedError("apply_templates"),
  manage_organization: getPermissionDeniedError("manage_organization"),
  manage_users: getPermissionDeniedError("manage_users"),
  manage_roles: getPermissionDeniedError("manage_roles"),
  manage_permissions: getPermissionDeniedError("manage_permissions"),
  view_financials: getPermissionDeniedError("view_financials"),
  manage_financials: getPermissionDeniedError("manage_financials"),
} as const;

/**
 * Get a permission error with custom context
 */
export function getPermissionError(
  permissionName: string,
  context?: string
): string {
  const baseError = getPermissionDeniedError(permissionName);
  return context ? `${baseError} ${context}` : baseError;
}
