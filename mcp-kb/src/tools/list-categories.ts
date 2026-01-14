/**
 * l4yercak3_kb_list_categories - List documentation categories
 */

import { z } from "zod";
import type { ListCategoriesInput, ListCategoriesOutput } from "../types.js";
import {
  scanDocuments,
  buildCategoryTree,
  flattenCategories,
} from "../utils/doc-scanner.js";
import { kbCache } from "../utils/cache.js";

// Input schema
export const listCategoriesInputSchema = z.object({
  includeSubcategories: z.boolean().optional().default(true),
});

// Output schema
export const listCategoriesOutputSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      documentCount: z.number(),
      subcategories: z.array(z.lazy(() => z.any())), // Recursive type
    })
  ),
  totalDocuments: z.number(),
});

/**
 * List all documentation categories
 */
export async function listCategories(
  input: ListCategoriesInput,
  docsPath: string
): Promise<ListCategoriesOutput> {
  const cacheKey = `categories:${input.includeSubcategories}`;
  const cached = kbCache.get(cacheKey) as ListCategoriesOutput | null;

  if (cached) {
    return cached;
  }

  const documents = await scanDocuments(docsPath);
  const categoryTree = buildCategoryTree(documents);

  let categories = categoryTree;

  // Flatten if subcategories not requested
  if (!input.includeSubcategories) {
    categories = flattenCategories(categoryTree).map((cat) => ({
      ...cat,
      subcategories: [],
    }));
  }

  const result: ListCategoriesOutput = {
    categories,
    totalDocuments: documents.length,
  };

  kbCache.set(cacheKey, result);
  return result;
}

// Tool definition for MCP registration
export const listCategoriesTool = {
  name: "l4yercak3_kb_list_categories",
  description:
    "List all documentation categories available in the L4YERCAK3 knowledge base. Returns category names, paths, and document counts organized in a tree structure.",
  inputSchema: {
    type: "object" as const,
    properties: {
      includeSubcategories: {
        type: "boolean",
        description:
          "Include nested subcategories in the response (default: true)",
      },
    },
  },
};
