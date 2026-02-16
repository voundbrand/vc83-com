/**
 * UNSPLASH IMAGE SEARCH TOOL
 *
 * AI tool for searching and selecting stock images from Unsplash.
 * Used by the page builder to add real images to generated pages.
 */

import type { AITool, ToolExecutionContext } from "./registry";

/**
 * Tool definition for search_unsplash_images
 */
export const unsplashToolDefinition = {
  type: "function" as const,
  function: {
    name: "search_unsplash_images",
    description:
      "Search Unsplash for high-quality stock photos. Use this when building pages that need real images (hero backgrounds, feature cards, team photos, etc.). Returns URLs that can be used directly in the page schema.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query describing the image needed. Be specific (e.g., 'sailboat on blue ocean sunset' rather than just 'boat')",
        },
        orientation: {
          type: "string",
          enum: ["landscape", "portrait", "squarish"],
          description:
            "Image orientation. Use 'landscape' for hero backgrounds, 'portrait' for profile photos, 'squarish' for cards.",
        },
        count: {
          type: "number",
          description: "Number of images to return (1-10). Default is 3.",
        },
        color: {
          type: "string",
          enum: [
            "black_and_white",
            "black",
            "white",
            "yellow",
            "orange",
            "red",
            "purple",
            "magenta",
            "green",
            "teal",
            "blue",
          ],
          description: "Filter by dominant color. Useful for matching brand colors.",
        },
      },
      required: ["query"],
    },
  },
};

/**
 * Unsplash API response types
 */
interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
  width: number;
  height: number;
  color: string;
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashImage[];
}

/**
 * Execute the Unsplash search
 */
export async function executeUnsplashSearch(
  _ctx: ToolExecutionContext,
  args: {
    query: string;
    orientation?: "landscape" | "portrait" | "squarish";
    count?: number;
    color?: string;
  }
) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return {
      success: false,
      error: "UNSPLASH_NOT_CONFIGURED",
      message:
        "Unsplash API is not configured. Please add UNSPLASH_ACCESS_KEY to environment variables.",
      images: [],
    };
  }

  try {
    // Build search URL
    const params = new URLSearchParams({
      query: args.query,
      per_page: String(Math.min(args.count || 3, 10)),
    });

    if (args.orientation) {
      params.set("orientation", args.orientation);
    }

    if (args.color) {
      params.set("color", args.color);
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?${params.toString()}`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          "Accept-Version": "v1",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Unsplash] API error:", response.status, errorText);
      return {
        success: false,
        error: "UNSPLASH_API_ERROR",
        message: `Unsplash API error: ${response.status}`,
        images: [],
      };
    }

    const data: UnsplashSearchResponse = await response.json();

    if (data.results.length === 0) {
      return {
        success: true,
        message: `No images found for query: "${args.query}". Try a different search term.`,
        images: [],
        total: 0,
      };
    }

    // Format results for easy use in page schemas
    const images = data.results.map((img) => ({
      // Use 'regular' for most use cases (1080px width)
      url: img.urls.regular,
      // Smaller version for thumbnails
      thumbnailUrl: img.urls.small,
      // Full resolution for downloads
      fullUrl: img.urls.full,
      // Alt text for accessibility
      alt: img.alt_description || img.description || `Photo by ${img.user.name}`,
      // Credit information (required by Unsplash ToS)
      photographer: img.user.name,
      photographerUrl: img.user.links.html,
      // Image dimensions
      width: img.width,
      height: img.height,
      // Dominant color (useful for placeholders)
      dominantColor: img.color,
      // Link to original on Unsplash (for attribution)
      unsplashUrl: img.links.html,
    }));

    return {
      success: true,
      message: `Found ${data.total} images for "${args.query}". Showing ${images.length} results.`,
      images,
      total: data.total,
      // Attribution reminder
      attribution:
        "Photos provided by Unsplash. When using these images, please credit the photographer.",
    };
  } catch (error) {
    console.error("[Unsplash] Search error:", error);
    return {
      success: false,
      error: "UNSPLASH_FETCH_ERROR",
      message: `Failed to search Unsplash: ${error instanceof Error ? error.message : "Unknown error"}`,
      images: [],
    };
  }
}

/**
 * AITool definition for the registry
 */
export const searchUnsplashImagesTool: AITool = {
  name: "search_unsplash_images",
  description: unsplashToolDefinition.function.description,
  status: "ready",
  readOnly: true,
  parameters: unsplashToolDefinition.function.parameters,
  execute: async (ctx, args) => {
    return executeUnsplashSearch(ctx, args);
  },
};
