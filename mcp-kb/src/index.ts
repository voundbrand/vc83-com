/**
 * MCP Knowledge Base Tools for L4YERCAK3
 *
 * Exposes project documentation as queryable tools for MCP clients.
 */

import { resolve } from "path";
import type { KBConfig } from "./types.js";

// Tool handlers
import { listCategories, listCategoriesTool } from "./tools/list-categories.js";
import { listDocuments, listDocumentsTool } from "./tools/list-documents.js";
import { search, searchTool } from "./tools/search.js";
import { read, readTool } from "./tools/read.js";

// Re-export types
export * from "./types.js";

// Re-export utilities for advanced usage
export { kbCache } from "./utils/cache.js";
export { SearchEngine } from "./utils/search-engine.js";
export { scanDocuments, buildCategoryTree } from "./utils/doc-scanner.js";
export { parseMarkdown, extractSection } from "./utils/markdown-parser.js";

/**
 * Default configuration
 */
const DEFAULT_CONFIG: KBConfig = {
  docsPath: resolve(process.cwd(), "docs"),
  cacheTTL: 3600, // 1 hour
  indexOnStart: true,
};

/**
 * Create KB tools configured for a specific docs path
 */
export function createKBTools(config: Partial<KBConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { docsPath } = finalConfig;

  return {
    // Tool definitions for MCP server registration
    tools: [listCategoriesTool, listDocumentsTool, searchTool, readTool],

    // Tool handlers
    handlers: {
      l4yercak3_kb_list_categories: async (input: unknown) => {
        return listCategories(input as Parameters<typeof listCategories>[0], docsPath);
      },
      l4yercak3_kb_list_documents: async (input: unknown) => {
        return listDocuments(input as Parameters<typeof listDocuments>[0], docsPath);
      },
      l4yercak3_kb_search: async (input: unknown) => {
        return search(input as Parameters<typeof search>[0], docsPath);
      },
      l4yercak3_kb_read: async (input: unknown) => {
        return read(input as Parameters<typeof read>[0], docsPath);
      },
    },

    // Configuration
    config: finalConfig,
  };
}

/**
 * Tool definitions array for direct registration
 */
export const kbToolDefinitions = [
  listCategoriesTool,
  listDocumentsTool,
  searchTool,
  readTool,
];

/**
 * Individual tool exports
 */
export {
  listCategories,
  listCategoriesTool,
  listDocuments,
  listDocumentsTool,
  search,
  searchTool,
  read,
  readTool,
};
