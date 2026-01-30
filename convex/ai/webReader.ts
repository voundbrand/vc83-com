/**
 * Web Reader Action
 *
 * Fetches and extracts content from URLs using Jina Reader.
 * Used for design inspiration references in the page builder.
 */

import { v } from "convex/values";
import { action } from "../_generated/server";

/**
 * Fetch URL content via Jina Reader (r.jina.ai)
 *
 * Jina Reader converts web pages to clean markdown, perfect for
 * providing design inspiration context to the AI.
 */
export const fetchUrlContent = action({
  args: {
    url: v.string(),
  },
  handler: async (_ctx, args) => {
    const { url } = args;

    // Validate URL
    try {
      new URL(url);
    } catch {
      return {
        success: false,
        error: "Invalid URL format",
        content: null,
      };
    }

    try {
      // Use Jina Reader to fetch and convert to markdown
      const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

      const response = await fetch(jinaUrl, {
        headers: {
          Accept: "text/markdown",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch URL: ${response.status} ${response.statusText}`,
          content: null,
        };
      }

      const markdown = await response.text();

      // Truncate if too long (keep it reasonable for AI context)
      const maxLength = 15000;
      const truncated = markdown.length > maxLength;
      const content = truncated
        ? markdown.slice(0, maxLength) + "\n\n[Content truncated...]"
        : markdown;

      return {
        success: true,
        error: null,
        content,
        truncated,
        originalLength: markdown.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        content: null,
      };
    }
  },
});

/**
 * Fetch multiple URLs in parallel
 */
export const fetchMultipleUrls = action({
  args: {
    urls: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { urls } = args;

    // Fetch all URLs in parallel
    const results = await Promise.all(
      urls.map(async (url) => {
        const result = await ctx.runAction(
          // @ts-expect-error - Self-referential action call
          "ai/webReader:fetchUrlContent",
          { url }
        );
        return { url, ...result };
      })
    );

    return {
      results,
      successCount: results.filter((r) => r.success).length,
      failureCount: results.filter((r) => !r.success).length,
    };
  },
});
