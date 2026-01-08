/**
 * l4yercak3_kb_read - Read a specific documentation file
 */

import { z } from "zod";
import { readFile, stat } from "fs/promises";
import { resolve, join } from "path";
import type { ReadInput, ReadOutput } from "../types.js";
import { parseMarkdown, extractSection } from "../utils/markdown-parser.js";
import { kbCache } from "../utils/cache.js";

// Input schema
export const readInputSchema = z.object({
  path: z.string().min(1),
  section: z.string().optional(),
  freshContent: z.boolean().optional().default(false),
});

// Output schema
export const readOutputSchema = z.object({
  path: z.string(),
  title: z.string(),
  content: z.string(),
  wordCount: z.number(),
  lastModified: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      level: z.number(),
      startLine: z.number(),
      endLine: z.number().optional(),
    })
  ),
});

/**
 * Resolve and validate document path
 */
function resolvePath(docPath: string, docsPath: string): string {
  // Remove leading slashes
  const cleanPath = docPath.replace(/^\/+/, "");

  // Ensure .md extension
  const withExtension = cleanPath.endsWith(".md") ? cleanPath : `${cleanPath}.md`;

  // Resolve full path
  const fullPath = resolve(docsPath, withExtension);

  // Security check - ensure path is within docs directory
  if (!fullPath.startsWith(resolve(docsPath))) {
    throw new Error("Invalid path: Path traversal detected");
  }

  return fullPath;
}

/**
 * Read a specific document
 */
export async function read(
  input: ReadInput,
  docsPath: string
): Promise<ReadOutput> {
  const { path: docPath, section, freshContent = false } = input;
  const cacheKey = `read:${docPath}:${section || "full"}`;

  // Check cache unless fresh content requested
  if (!freshContent) {
    const cached = kbCache.get(cacheKey) as ReadOutput | null;
    if (cached) {
      return cached;
    }
  }

  const fullPath = resolvePath(docPath, docsPath);

  try {
    const [content, stats] = await Promise.all([
      readFile(fullPath, "utf-8"),
      stat(fullPath),
    ]);

    const parsed = parseMarkdown(content, docPath);

    let outputContent = parsed.content;

    // Extract specific section if requested
    if (section) {
      const sectionContent = extractSection(parsed.content, section);
      if (sectionContent) {
        outputContent = sectionContent;
      } else {
        throw new Error(`Section "${section}" not found in document`);
      }
    }

    const output: ReadOutput = {
      path: docPath,
      title: parsed.title,
      content: outputContent,
      wordCount: parsed.wordCount,
      lastModified: stats.mtime.toISOString(),
      sections: parsed.sections,
    };

    // Cache the result
    kbCache.set(cacheKey, output);

    return output;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Document not found: ${docPath}`);
    }
    throw error;
  }
}

// Tool definition for MCP registration
export const readTool = {
  name: "l4yercak3_kb_read",
  description:
    "Read the full content of a specific documentation file from the L4YERCAK3 knowledge base. Returns the raw markdown content along with metadata like sections and word count.",
  inputSchema: {
    type: "object" as const,
    required: ["path"],
    properties: {
      path: {
        type: "string",
        description:
          "Document path relative to docs folder (e.g., 'ARCHITECTURE.md' or 'api/API_TESTING_GUIDE.md')",
      },
      section: {
        type: "string",
        description:
          "Optional: Return only a specific section by heading (e.g., 'Authentication')",
      },
      freshContent: {
        type: "boolean",
        description: "Bypass cache and read fresh content (default: false)",
      },
    },
  },
};
