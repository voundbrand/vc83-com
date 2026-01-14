/**
 * l4yercak3_kb_search - Full-text search across documentation
 */

import { z } from "zod";
import type { SearchInput, SearchOutput } from "../types.js";
import { scanDocuments } from "../utils/doc-scanner.js";
import { SearchEngine } from "../utils/search-engine.js";
import { kbCache } from "../utils/cache.js";

// Input schema
export const searchInputSchema = z.object({
  query: z.string().min(1),
  category: z.string().optional(),
  limit: z.number().min(1).max(50).optional().default(10),
  freshResults: z.boolean().optional().default(false),
});

// Output schema
export const searchOutputSchema = z.object({
  results: z.array(
    z.object({
      path: z.string(),
      title: z.string(),
      category: z.string(),
      snippet: z.string(),
      score: z.number(),
      matchCount: z.number(),
    })
  ),
  totalMatches: z.number(),
  searchTime: z.number(),
  cached: z.boolean(),
});

// Singleton search engine instance
let searchEngine: SearchEngine | null = null;

/**
 * Get or create search engine instance
 */
async function getSearchEngine(
  docsPath: string,
  forceRebuild: boolean = false
): Promise<SearchEngine> {
  if (!searchEngine || searchEngine.needsRebuild() || forceRebuild) {
    searchEngine = new SearchEngine(docsPath);
    const documents = await scanDocuments(docsPath);
    await searchEngine.buildIndex(documents);
  }
  return searchEngine;
}

/**
 * Search documentation
 */
export async function search(
  input: SearchInput,
  docsPath: string
): Promise<SearchOutput> {
  const { query, category, limit = 10, freshResults = false } = input;
  const cacheKey = `search:${query}:${category || "all"}:${limit}`;

  // Check cache unless fresh results requested
  if (!freshResults) {
    const cached = kbCache.get(cacheKey) as SearchOutput | null;
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  const startTime = performance.now();
  const engine = await getSearchEngine(docsPath, freshResults);
  const results = engine.search(query, { category, limit });
  const searchTime = performance.now() - startTime;

  const output: SearchOutput = {
    results,
    totalMatches: results.length,
    searchTime: Math.round(searchTime),
    cached: false,
  };

  // Cache the results
  kbCache.set(cacheKey, output);

  return output;
}

// Tool definition for MCP registration
export const searchTool = {
  name: "l4yercak3_kb_search",
  description:
    "Search across all L4YERCAK3 documentation using full-text search. Returns matching documents with relevant snippets, ranked by relevance. Use this to find information about specific topics, features, or APIs.",
  inputSchema: {
    type: "object" as const,
    required: ["query"],
    properties: {
      query: {
        type: "string",
        description:
          "Search query - supports keywords and phrases. Example: 'authentication API' or 'CLI setup'",
      },
      category: {
        type: "string",
        description:
          "Limit search to a specific category (e.g., 'api', 'features/ai')",
      },
      limit: {
        type: "number",
        description: "Maximum results to return (default: 10, max: 50)",
      },
      freshResults: {
        type: "boolean",
        description:
          "Bypass cache and rebuild index for fresh results (default: false)",
      },
    },
  },
};
