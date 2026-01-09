/**
 * APP-TO-FEATURE-FLAG MAPPING
 *
 * Maps app codes to their corresponding tier feature flags.
 * Used by the app availability system to check license-based access.
 *
 * Apps not in this mapping are considered "always available" (core apps like
 * payments, media-library, and compliance which are needed for basic operation).
 */

import { TierFeatures } from "./tierConfigs";

/**
 * Type for feature flag keys that control app access
 */
export type AppFeatureFlag = keyof TierFeatures;

/**
 * Mapping from app code to the feature flag that controls access.
 *
 * - If an app code is in this map, its feature flag must be true for the app to be available.
 * - If an app code is NOT in this map, the app is always available (no license check).
 */
export const APP_FEATURE_MAPPING: Record<string, AppFeatureFlag> = {
  // Business apps
  crm: "crmEnabled",
  projects: "projectsEnabled",
  events: "eventsEnabled",
  products: "productsEnabled",
  tickets: "eventsEnabled", // Tickets is part of events system

  // Commerce apps
  checkout: "checkoutEnabled",
  app_invoicing: "invoicingEnabled",
  forms: "formsEnabled",
  booking: "bookingsEnabled",
  benefits: "benefitsEnabled",

  // Content apps
  "web-publishing": "webPublishingEnabled",
  templates: "templatesEnabled",
  certificates: "certificatesEnabled",

  // Automation apps
  workflows: "workflowsEnabled",
  "ai-assistant": "aiEnabled",
};

/**
 * Apps that are always available regardless of tier.
 * These are core platform features or GDPR requirements.
 */
export const ALWAYS_AVAILABLE_APPS = [
  "payments", // Core payment processing
  "media-library", // Core file storage
  "compliance", // GDPR requirement - account deletion must be accessible
];

/**
 * Check if an app is available based on tier features.
 *
 * @param appCode - The app code to check
 * @param features - The tier features for the organization
 * @returns true if the app is available, false otherwise
 */
export function isAppEnabledByTier(
  appCode: string,
  features: TierFeatures
): boolean {
  // Always-available apps bypass the feature check
  if (ALWAYS_AVAILABLE_APPS.includes(appCode)) {
    return true;
  }

  // Check if this app has a feature flag requirement
  const featureFlag = APP_FEATURE_MAPPING[appCode];

  // If no feature flag is defined, the app is available by default
  if (!featureFlag) {
    return true;
  }

  // Check the feature flag value
  return features[featureFlag] === true;
}

/**
 * Get a list of all apps that are enabled for a given tier's features.
 *
 * @param features - The tier features
 * @returns Array of app codes that are enabled
 */
export function getEnabledAppsForTier(features: TierFeatures): string[] {
  const enabledApps: string[] = [...ALWAYS_AVAILABLE_APPS];

  for (const [appCode, featureFlag] of Object.entries(APP_FEATURE_MAPPING)) {
    if (features[featureFlag] === true) {
      enabledApps.push(appCode);
    }
  }

  return enabledApps;
}
