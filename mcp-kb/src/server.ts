/**
 * Standalone MCP Server for Knowledge Base
 *
 * Can be run directly or integrated into the main L4YERCAK3 MCP server.
 *
 * Usage:
 *   npx tsx mcp-kb/src/server.ts
 *
 * Or add to Claude Code:
 *   claude mcp add l4yercak3-kb -- npx tsx ./mcp-kb/src/server.ts
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve } from "path";

import { listCategories } from "./tools/list-categories.js";
import { listDocuments } from "./tools/list-documents.js";
import { search } from "./tools/search.js";
import { read } from "./tools/read.js";

// Configuration from environment or defaults
const DOCS_PATH = process.env.KB_DOCS_PATH || resolve(process.cwd(), "docs");
const CACHE_TTL = parseInt(process.env.KB_CACHE_TTL || "3600", 10);

async function main() {
  // Create MCP server
  const server = new McpServer({
    name: "l4yercak3-kb",
    version: "1.0.0",
  });

  // Register l4yercak3_kb_list_categories
  server.tool(
    "l4yercak3_kb_list_categories",
    "List all documentation categories available in the L4YERCAK3 knowledge base. Returns category names, paths, and document counts organized in a tree structure.",
    {
      includeSubcategories: z
        .boolean()
        .optional()
        .describe("Include nested subcategories in the response (default: true)"),
    },
    async (args) => {
      try {
        const result = await listCategories(
          { includeSubcategories: args.includeSubcategories ?? true },
          DOCS_PATH
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // Register l4yercak3_kb_list_documents
  server.tool(
    "l4yercak3_kb_list_documents",
    "List documentation files in the L4YERCAK3 knowledge base. Can filter by category and supports pagination and sorting.",
    {
      category: z
        .string()
        .optional()
        .describe("Filter by category path (e.g., 'api', 'features/ai')"),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Maximum documents to return (default: 50, max: 200)"),
      offset: z
        .number()
        .min(0)
        .optional()
        .describe("Pagination offset (default: 0)"),
      sortBy: z
        .enum(["name", "modified", "size"])
        .optional()
        .describe("Sort order: 'name', 'modified', or 'size' (default: name)"),
    },
    async (args) => {
      try {
        const result = await listDocuments(
          {
            category: args.category,
            limit: args.limit ?? 50,
            offset: args.offset ?? 0,
            sortBy: args.sortBy ?? "name",
          },
          DOCS_PATH
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // Register l4yercak3_kb_search
  server.tool(
    "l4yercak3_kb_search",
    "Search across all L4YERCAK3 documentation using full-text search. Returns matching documents with relevant snippets, ranked by relevance.",
    {
      query: z
        .string()
        .min(1)
        .describe("Search query - supports keywords and phrases"),
      category: z
        .string()
        .optional()
        .describe("Limit search to a specific category (e.g., 'api', 'features/ai')"),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Maximum results to return (default: 10, max: 50)"),
      freshResults: z
        .boolean()
        .optional()
        .describe("Bypass cache and rebuild index for fresh results (default: false)"),
    },
    async (args) => {
      try {
        const result = await search(
          {
            query: args.query,
            category: args.category,
            limit: args.limit ?? 10,
            freshResults: args.freshResults ?? false,
          },
          DOCS_PATH
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // Register l4yercak3_kb_read
  server.tool(
    "l4yercak3_kb_read",
    "Read the full content of a specific documentation file from the L4YERCAK3 knowledge base. Returns the raw markdown content along with metadata.",
    {
      path: z
        .string()
        .min(1)
        .describe("Document path relative to docs folder (e.g., 'ARCHITECTURE.md')"),
      section: z
        .string()
        .optional()
        .describe("Optional: Return only a specific section by heading"),
      freshContent: z
        .boolean()
        .optional()
        .describe("Bypass cache and read fresh content (default: false)"),
    },
    async (args) => {
      try {
        const result = await read(
          {
            path: args.path,
            section: args.section,
            freshContent: args.freshContent ?? false,
          },
          DOCS_PATH
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP communication)
  console.error(`L4YERCAK3 KB MCP Server started`);
  console.error(`Docs path: ${DOCS_PATH}`);
  console.error(`Cache TTL: ${CACHE_TTL}s`);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
