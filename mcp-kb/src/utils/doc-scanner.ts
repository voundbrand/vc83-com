/**
 * Document scanner - scans /docs/ directory and builds file index
 */

import { glob } from "glob";
import { readFile, stat } from "fs/promises";
import { resolve, relative, basename, dirname } from "path";
import type { DocumentMetadata, Category } from "../types.js";
import { CATEGORY_MAP } from "../types.js";
import { parseMarkdown } from "./markdown-parser.js";

/**
 * Derive category from file path and name
 */
export function deriveCategory(filePath: string, docsPath: string): string {
  const relativePath = relative(docsPath, filePath);
  const dir = dirname(relativePath);

  // If in a subdirectory, use that as the category
  if (dir && dir !== ".") {
    return dir.replace(/\\/g, "/");
  }

  // Parse filename prefix
  const filename = basename(filePath, ".md");
  const prefix = filename.split("_")[0];

  return CATEGORY_MAP[prefix] || "general";
}

/**
 * Scan a directory for markdown files
 */
export async function scanDocuments(
  docsPath: string
): Promise<DocumentMetadata[]> {
  const absolutePath = resolve(docsPath);
  const pattern = "**/*.md";

  const files = await glob(pattern, {
    cwd: absolutePath,
    nodir: true,
    ignore: ["**/node_modules/**", "**/000_pdfs/**"],
  });

  const documents: DocumentMetadata[] = [];

  for (const file of files) {
    const fullPath = resolve(absolutePath, file);

    try {
      const [content, stats] = await Promise.all([
        readFile(fullPath, "utf-8"),
        stat(fullPath),
      ]);

      const parsed = parseMarkdown(content, file);

      documents.push({
        path: fullPath,
        relativePath: file,
        title: parsed.title,
        category: deriveCategory(fullPath, absolutePath),
        size: stats.size,
        lastModified: stats.mtime,
        wordCount: parsed.wordCount,
      });
    } catch (error) {
      console.error(`Error scanning ${file}:`, error);
    }
  }

  return documents;
}

/**
 * Build category tree from documents
 */
export function buildCategoryTree(documents: DocumentMetadata[]): Category[] {
  const categoryMap = new Map<string, Category>();

  // Count documents per category
  for (const doc of documents) {
    const parts = doc.category.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!categoryMap.has(currentPath)) {
        categoryMap.set(currentPath, {
          name: part,
          path: currentPath,
          documentCount: 0,
          subcategories: [],
        });
      }

      // Only count at the leaf category level
      if (i === parts.length - 1) {
        const cat = categoryMap.get(currentPath)!;
        cat.documentCount++;
      }
    }
  }

  // Build tree structure
  const rootCategories: Category[] = [];

  for (const [path, category] of categoryMap.entries()) {
    const parts = path.split("/");

    if (parts.length === 1) {
      // Root level category
      rootCategories.push(category);
    } else {
      // Find parent and add as subcategory
      const parentPath = parts.slice(0, -1).join("/");
      const parent = categoryMap.get(parentPath);
      if (parent) {
        parent.subcategories.push(category);
      }
    }
  }

  // Sort categories alphabetically
  const sortCategories = (cats: Category[]): Category[] => {
    return cats
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((cat) => ({
        ...cat,
        subcategories: sortCategories(cat.subcategories),
      }));
  };

  return sortCategories(rootCategories);
}

/**
 * Flatten category tree (for counting subcategory documents)
 */
export function flattenCategories(categories: Category[]): Category[] {
  const result: Category[] = [];

  const flatten = (cats: Category[]) => {
    for (const cat of cats) {
      result.push(cat);
      flatten(cat.subcategories);
    }
  };

  flatten(categories);
  return result;
}

/**
 * Get documents filtered by category
 */
export function filterByCategory(
  documents: DocumentMetadata[],
  category: string
): DocumentMetadata[] {
  return documents.filter(
    (doc) =>
      doc.category === category || doc.category.startsWith(category + "/")
  );
}

/**
 * Sort documents by specified field
 */
export function sortDocuments(
  documents: DocumentMetadata[],
  sortBy: "name" | "modified" | "size" = "name"
): DocumentMetadata[] {
  const sorted = [...documents];

  switch (sortBy) {
    case "name":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "modified":
      sorted.sort(
        (a, b) => b.lastModified.getTime() - a.lastModified.getTime()
      );
      break;
    case "size":
      sorted.sort((a, b) => b.size - a.size);
      break;
  }

  return sorted;
}
