/**
 * Internal API functions that are not exposed to external clients
 * These functions are used internally between Convex functions
 */

import { getUserContext, hasPermission, hasPermissions, logAudit } from "./rbac";

// ❌ OLD: Importing from translationQueries (removed)
// import {
//   getTranslationsByNamespaceInternal as getTranslationsByNamespace,
//   getMissingTranslationsInternal as getMissingTranslations,
//   getTranslationStatsInternal as getTranslationStats,
//   getTranslationsForManagementInternal as getTranslationsForManagement
// } from "./translationQueries";

// ✅ NEW: Import from ontology-based translations
import {
  getAllTranslationObjects,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  bulkImportTranslations
} from "./ontologyTranslations";

// Re-export internal RBAC functions
export { getUserContext, hasPermission, hasPermissions, logAudit };

// Re-export internal translation functions (ontology-based)
export {
  getAllTranslationObjects,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  bulkImportTranslations
};

// Note: Old functions (getMissingTranslations, getTranslationsForManagement)
// can be reimplemented on top of ontologyTranslations if needed