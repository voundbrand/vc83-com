/**
 * USE FIELD CONFIGURATION HOOK
 *
 * This hook loads field visibility configuration for a specific object type.
 * It checks both global and organization-specific configurations.
 *
 * Usage in forms:
 * ```tsx
 * const { isFieldVisible, loading } = useFieldConfiguration("organization_profile", organizationId);
 *
 * {isFieldVisible("industry") && (
 *   <input name="industry" />
 * )}
 * ```
 */

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "./use-auth";
import { Id } from "../../convex/_generated/dataModel";

interface FieldConfigurationResult {
  isFieldVisible: (fieldName: string) => boolean;
  visibleFields: string[];
  hiddenFields: string[];
  loading: boolean;
}

export function useFieldConfiguration(
  objectType: string,
  organizationId?: Id<"organizations">
): FieldConfigurationResult {
  const { sessionId } = useAuth();

  // Try to load org-specific configuration first
  const orgConfig = useQuery(
    api.ontologyAdmin.getFieldConfiguration,
    sessionId && organizationId
      ? {
          sessionId,
          objectType,
          organizationId,
        }
      : "skip"
  );

  // Load global configuration as fallback
  const globalConfig = useQuery(
    api.ontologyAdmin.getFieldConfiguration,
    sessionId
      ? {
          sessionId,
          objectType,
        }
      : "skip"
  );

  // Determine which config to use
  const activeConfig = orgConfig && orgConfig.visibleFields.length > 0 ? orgConfig : globalConfig;

  const loading = !sessionId || (!orgConfig && !globalConfig);

  return {
    isFieldVisible: (fieldName: string) => {
      // If no configuration exists, show all fields by default
      if (!activeConfig || activeConfig.visibleFields.length === 0) {
        return true;
      }

      // Check if field is in visible fields list
      return activeConfig.visibleFields.some((f: string) => f === fieldName);
    },
    visibleFields: activeConfig?.visibleFields || [],
    hiddenFields: activeConfig?.hiddenFields || [],
    loading,
  };
}
