/**
 * l4yercak3_kb_list_documents - List documents in a category
 */

import { z } from "zod";
import type { ListDocumentsInput, ListDocumentsOutput } from "../types.js";
import {
  scanDocuments,
  filterByCategory,
  sortDocuments,
} from "../utils/doc-scanner.js";
import { kbCache } from "../utils/cache.js";

// Input schema
export const listDocumentsInputSchema = z.object({
  category: z.string().optional(),
  limit: z.number().min(1).max(200).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  sortBy: z.enum(["name", "modified", "size"]).optional().default("name"),
});

// Output schema
export const listDocumentsOutputSchema = z.object({
  documents: z.array(
    z.object({
      path: z.string(),
      relativePath: z.string(),
      title: z.string(),
      category: z.string(),
      size: z.number(),
      lastModified: z.date(),
      wordCount: z.number(),
    })
  ),
  total: z.number(),
});

/**
 * List documents, optionally filtered by category
 */
export async function listDocuments(
  input: ListDocumentsInput,
  docsPath: string
): Promise<ListDocumentsOutput> {
  const { category, limit = 50, offset = 0, sortBy = "name" } = input;
  const cacheKey = `documents:${category || "all"}:${sortBy}`;

  // Try cache for the full list
  let documents = kbCache.get(cacheKey) as ListDocumentsOutput["documents"] | null;

  if (!documents) {
    let allDocs = await scanDocuments(docsPath);

    if (category) {
      allDocs = filterByCategory(allDocs, category);
    }

    documents = sortDocuments(allDocs, sortBy);
    kbCache.set(cacheKey, documents);
  }

  // Apply pagination
  const total = documents.length;
  const paginatedDocs = documents.slice(offset, offset + limit);

  return {
    documents: paginatedDocs,
    total,
  };
}

// Tool definition for MCP registration
export const listDocumentsTool = {
  name: "l4yercak3_kb_list_documents",
  description:
    "List documentation files in the L4YERCAK3 knowledge base. Can filter by category and supports pagination and sorting.",
  inputSchema: {
    type: "object" as const,
    properties: {
      category: {
        type: "string",
        description:
          "Filter by category path (e.g., 'api', 'features/ai'). Omit to list all documents.",
      },
      limit: {
        type: "number",
        description: "Maximum documents to return (default: 50, max: 200)",
      },
      offset: {
        type: "number",
        description: "Pagination offset (default: 0)",
      },
      sortBy: {
        type: "string",
        enum: ["name", "modified", "size"],
        description: "Sort order: 'name', 'modified', or 'size' (default: name)",
      },
    },
  },
};
