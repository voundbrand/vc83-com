/**
 * Internal API functions that are not exposed to external clients
 * These functions are used internally between Convex functions
 */

import { getUserContext, hasPermission, hasPermissions, logAudit } from "./rbac";

// Re-export internal RBAC functions
export { getUserContext, hasPermission, hasPermissions, logAudit };