"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "./use-auth";

/**
 * Hook to check if a specific app is available to the current organization
 *
 * LEGACY: This hook used to check the appAvailabilities table for per-org app enablement.
 * NOW: All apps are available to all organizations. Feature gating is handled by the
 * tier-based licensing system (tierConfigs.ts + licensing/helpers.ts).
 *
 * @param appCode - The app code (kept for backwards compatibility, but ignored)
 * @returns Object with availability status - always returns isAvailable: true
 */
export function useAppAvailability(appCode: string) {
  const currentOrg = useCurrentOrganization();

  // All apps are now available - feature limits are enforced by the tier system
  return {
    isAvailable: true,
    isLoading: false,
    appCode,
    organizationName: currentOrg?.name || "your organization",
  };
}

/**
 * Hook to get all available apps for the current organization
 *
 * UPDATED: Still queries getAvailableApps for the app catalog display,
 * but isAppAvailable always returns true since tier system handles limits.
 */
export function useAvailableApps() {
  const { sessionId, isSignedIn } = useAuth();
  const currentOrg = useCurrentOrganization();
  const organizationId = currentOrg?.id;
  const useQueryUntyped = useQuery as (query: unknown, args: unknown) => unknown;
  // @ts-ignore TS2589: Convex generated API type can exceed instantiation depth in compatibility hooks.
  const apiUntyped: unknown = api;
  const appAvailabilityApi = (apiUntyped as Record<string, unknown>)["appAvailability"] as Record<string, unknown> | undefined;
  const getAvailableApps = appAvailabilityApi?.["getAvailableApps"];
  type AvailableApp = {
    _id: string;
    code: string;
    icon?: string;
    description?: string;
    category?: string;
    [key: string]: unknown;
  };

  // Query apps for the catalog display (AllAppsWindow, etc.)
  const availableApps = useQueryUntyped(
    getAvailableApps,
    sessionId && organizationId && isSignedIn
      ? { sessionId, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  ) as AvailableApp[] | undefined;

  // All apps are available - tier system handles feature limits
  const isAppAvailable = (_appCode: string): boolean => true;

  return {
    availableApps: availableApps || [],
    isAppAvailable,
    isLoading: availableApps === undefined,
    organizationName: currentOrg?.name || "your organization",
  };
}

/**
 * App configuration for the availability guard
 */
export interface AppConfig {
  code: string;
  name: string;
  description?: string;
}

/**
 * Hook that returns a guard component if the app is unavailable or loading
 * Returns null if the app is available (allowing normal rendering to proceed)
 *
 * LEGACY: Used to show AppUnavailable screen for unlicensed apps.
 * NOW: Always returns null since all apps are available.
 * Feature limits are enforced by the tier system at the action level.
 *
 * @example
 * ```typescript
 * export function PaymentsWindow() {
 *   const guard = useAppAvailabilityGuard({
 *     code: "payments",
 *     name: "Payment Management",
 *   });
 *
 *   if (guard) return guard; // Will always be null now
 *
 *   return <PaymentsContent />;
 * }
 * ```
 */
export function useAppAvailabilityGuard(_appConfig: AppConfig) {
  // All apps are available - tier system handles feature limits
  return null;
}
