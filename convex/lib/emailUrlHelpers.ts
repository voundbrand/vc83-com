/**
 * EMAIL URL HELPERS
 *
 * Utilities for improving email deliverability by:
 * 1. Proxying image URLs through the sending domain
 * 2. Proxying map links through the sending domain
 *
 * This reduces spam scores because:
 * - Image URLs match the sending domain (mail.l4yercak3.com → l4yercak3.com)
 * - External links (Google Maps, Apple Maps) go through our domain
 *
 * Usage in email templates:
 *   import { proxyStorageUrl, proxyMapUrl } from "./lib/emailUrlHelpers";
 *   const imageUrl = proxyStorageUrl(convexStorageUrl, siteUrl);
 *   const googleMapsUrl = proxyMapUrl("google", lat, lng, siteUrl);
 */

/**
 * Convert a Convex storage URL to a proxied URL through the sending domain
 *
 * Input:  https://agreeable-lion-828.convex.cloud/api/storage/abc123
 * Output: https://l4yercak3.com/storage/abc123
 *
 * @param convexUrl - The original Convex storage URL
 * @param siteUrl - The site URL to proxy through (e.g., "https://l4yercak3.com")
 * @returns Proxied URL or original if conversion fails
 */
export function proxyStorageUrl(
  convexUrl: string | null | undefined,
  siteUrl?: string | null
): string | null {
  if (!convexUrl) return null;

  // Default to production site URL
  const baseUrl = siteUrl || process.env.SITE_URL || "https://l4yercak3.com";

  try {
    // Extract storage ID from Convex URL
    // Format: https://xxx.convex.cloud/api/storage/{storageId}
    // or:     https://xxx.convex.site/api/storage/{storageId}
    const storageMatch = convexUrl.match(/\/api\/storage\/(.+)$/);

    if (storageMatch) {
      const storageId = storageMatch[1];
      return `${baseUrl}/storage/${storageId}`;
    }

    // If not a Convex storage URL, return as-is
    return convexUrl;
  } catch (error) {
    console.warn("[proxyStorageUrl] Failed to proxy URL:", convexUrl, error);
    return convexUrl;
  }
}

/**
 * Generate a proxied map URL for directions
 *
 * Instead of: https://www.google.com/maps/dir/?api=1&destination=49.85,8.03
 * Use:        https://l4yercak3.com/maps/google/49.85,8.03
 *
 * The Next.js rewrite will redirect to the actual map service
 *
 * @param provider - "google" or "apple"
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param siteUrl - The site URL to proxy through
 * @returns Proxied map URL
 */
export function proxyMapUrl(
  provider: "google" | "apple",
  latitude: number,
  longitude: number,
  siteUrl?: string | null
): string {
  const baseUrl = siteUrl || process.env.SITE_URL || "https://l4yercak3.com";
  return `${baseUrl}/maps/${provider}/${latitude},${longitude}`;
}

/**
 * Generate direct map URLs (for cases where proxying isn't possible)
 *
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Object with google and apple map URLs
 */
export function getDirectMapUrls(
  latitude: number,
  longitude: number
): { google: string; apple: string } {
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    apple: `https://maps.apple.com/?daddr=${latitude},${longitude}`,
  };
}

/**
 * Check if a URL is from Convex storage
 */
export function isConvexStorageUrl(url: string): boolean {
  return url.includes(".convex.cloud/api/storage/") ||
         url.includes(".convex.site/api/storage/");
}

/**
 * Get the storage ID from a Convex storage URL
 */
export function getStorageIdFromUrl(url: string): string | null {
  const match = url.match(/\/api\/storage\/([^/?]+)/);
  return match ? match[1] : null;
}
