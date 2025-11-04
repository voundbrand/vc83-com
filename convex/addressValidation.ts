/**
 * Address Validation using Radar.com
 *
 * Provides address verification, geocoding, and directions URL generation
 * for events.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

// Radar API types
interface RadarAddress {
  addressLabel: string;
  formattedAddress: string;
  city?: string;
  state?: string;
  stateCode?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  confidence: "exact" | "interpolated" | "fallback" | "none";
}

interface RadarValidationResponse {
  addresses: RadarAddress[]; // API returns an array of addresses
  meta: {
    code: number;
  };
}

/**
 * Validate an address using Radar.com API
 * Returns formatted address, coordinates, and directions URL
 */
export const validateAddress = action({
  args: {
    address: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    formattedAddress?: string;
    latitude?: number;
    longitude?: number;
    directionsUrl?: string;
    googleMapsUrl?: string;
    confidence?: string;
    error?: string;
  }> => {
    const apiKey = process.env.RADAR_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "RADAR_API_KEY not configured",
      };
    }

    try {
      const url = `https://api.radar.io/v1/geocode/forward?query=${encodeURIComponent(args.address)}`;

      console.log("🌍 Radar validation request:", {
        address: args.address,
        url,
        hasApiKey: !!apiKey,
      });

      // Call Radar forward geocoding API
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": apiKey,
          "Content-Type": "application/json",
        },
      });

      console.log("📡 Radar API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Radar API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        return {
          success: false,
          error: `API returned error ${response.status}: ${response.statusText}. ${errorText}`,
        };
      }

      const data = await response.json() as RadarValidationResponse;

      console.log("📦 Radar API response data:", {
        addressCount: data.addresses?.length || 0,
        firstAddress: data.addresses?.[0]?.formattedAddress || "none",
        confidence: data.addresses?.[0]?.confidence || "none",
      });

      // Radar returns an array of addresses, take the first (best match)
      if (!data.addresses || data.addresses.length === 0) {
        console.log("⚠️ No addresses found in response");
        return {
          success: false,
          error: `No address found matching "${args.address}". Try including more details like street number, postal code, and country.`,
        };
      }

      const address = data.addresses[0]; // Best match is first

      console.log("✅ Address validated successfully:", {
        formatted: address.formattedAddress,
        confidence: address.confidence,
        coords: `${address.latitude}, ${address.longitude}`,
      });

      // Generate directions URLs
      const directionsUrl = `https://radar.com/maps?lat=${address.latitude}&lng=${address.longitude}`;
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${address.latitude},${address.longitude}`;

      return {
        success: true,
        formattedAddress: address.formattedAddress,
        latitude: address.latitude,
        longitude: address.longitude,
        directionsUrl,
        googleMapsUrl,
        confidence: address.confidence,
      };
    } catch (error) {
      console.error("❌ Address validation exception:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Validation failed: ${errorMessage}. Please check your internet connection and try again.`,
      };
    }
  },
});

/**
 * Reverse geocode coordinates to get address
 * Useful if user provides coordinates directly
 */
export const reverseGeocode = action({
  args: {
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    formattedAddress?: string;
    error?: string;
  }> => {
    const apiKey = process.env.RADAR_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "RADAR_API_KEY not configured",
      };
    }

    try {
      const response = await fetch(
        `https://api.radar.io/v1/geocode/reverse?coordinates=${args.latitude},${args.longitude}`,
        {
          method: "GET",
          headers: {
            "Authorization": apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return {
          success: false,
          error: `Radar API error: ${response.status}`,
        };
      }

      const data = await response.json() as { addresses: RadarAddress[] };

      if (!data.addresses || data.addresses.length === 0) {
        return {
          success: false,
          error: "No address found for coordinates",
        };
      }

      return {
        success: true,
        formattedAddress: data.addresses[0].formattedAddress,
      };
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
