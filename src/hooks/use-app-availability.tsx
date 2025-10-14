"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "./use-auth";
import { AppUnavailable } from "@/components/app-unavailable";

/**
 * Hook to check if a specific app is available to the current organization
 *
 * @param appCode - The app code to check (e.g., "payments", "web-publishing", "media-library")
 * @returns Object with availability status and helper functions
 */
export function useAppAvailability(appCode: string) {
  const { sessionId, isSignedIn } = useAuth();
  const currentOrg = useCurrentOrganization();
  const organizationId = currentOrg?.id;

  // Get all available apps for the organization
  const availableApps = useQuery(
    api.appAvailability.getAvailableApps,
    sessionId && organizationId && isSignedIn
      ? { sessionId, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  const isAvailable = availableApps
    ? availableApps.some((app) => app.code === appCode)
    : false;

  const isLoading = availableApps === undefined;

  return {
    isAvailable,
    isLoading,
    appCode,
    organizationName: currentOrg?.name || "your organization",
  };
}

/**
 * Hook to get all available apps for the current organization
 * Useful for building dynamic menus and checking multiple apps at once
 */
export function useAvailableApps() {
  const { sessionId, isSignedIn } = useAuth();
  const currentOrg = useCurrentOrganization();
  const organizationId = currentOrg?.id;

  const availableApps = useQuery(
    api.appAvailability.getAvailableApps,
    sessionId && organizationId && isSignedIn
      ? { sessionId, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  const isAppAvailable = (appCode: string): boolean => {
    if (!availableApps) return false;
    return availableApps.some((app) => app.code === appCode);
  };

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
 * This reduces boilerplate from ~13 lines to 2 lines per app.
 *
 * @example
 * ```typescript
 * export function PaymentsWindow() {
 *   const guard = useAppAvailabilityGuard({
 *     code: "payments",
 *     name: "Payment Management",
 *     description: "Stripe integration for processing payments"
 *   });
 *
 *   if (guard) return guard; // Returns loading or unavailable UI
 *
 *   // Your actual app content here
 *   return <PaymentsContent />;
 * }
 * ```
 */
export function useAppAvailabilityGuard(appConfig: AppConfig) {
  const { isAvailable, isLoading, organizationName } = useAppAvailability(
    appConfig.code
  );

  // Return null if available (no guard needed - render normally)
  if (!isLoading && isAvailable) {
    return null;
  }

  // Return loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--win95-bg)' }}>
        <div style={{ color: 'var(--neutral-gray)' }}>Loading...</div>
      </div>
    );
  }

  // Return unavailable screen
  return (
    <AppUnavailable
      appName={appConfig.name}
      appCode={appConfig.code}
      organizationName={organizationName}
      message={appConfig.description}
    />
  );
}
