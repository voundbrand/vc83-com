/**
 * Markdown parser for extracting title, sections, and content
 */

import matter from "gray-matter";
import type { ParsedDocument, DocumentSection } from "../types.js";

/**
 * Extract title from markdown content
 * Priority: frontmatter title > first H1 > filename
 */
export function extractTitle(
  content: string,
  frontmatter: Record<string, unknown>,
  filename: string
): string {
  // Check frontmatter
  if (frontmatter.title && typeof frontmatter.title === "string") {
    return frontmatter.title;
  }

  // Find first H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }

  // Fall back to filename without extension
  return filename.replace(/\.md$/i, "").replace(/_/g, " ");
}

/**
 * Extract sections (headings) from markdown content
 */
export function extractSections(content: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      sections.push({
        heading: match[2].trim(),
        level: match[1].length,
        startLine: i + 1, // 1-indexed
      });
    }
  }

  // Calculate end lines
  for (let i = 0; i < sections.length - 1; i++) {
    sections[i].endLine = sections[i + 1].startLine - 1;
  }

  return sections;
}

/**
 * Count words in content
 */
export function countWords(content: string): number {
  return content
    .replace(/[#*`\[\]()]/g, "") // Remove markdown syntax
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Parse a markdown file and extract metadata
 */
export function parseMarkdown(
  content: string,
  filePath: string
): ParsedDocument {
  const { data: frontmatter, content: body } = matter(content);
  const filename = filePath.split("/").pop() || filePath;

  return {
    path: filePath,
    title: extractTitle(body, frontmatter, filename),
    content: body,
    sections: extractSections(body),
    frontmatter,
    wordCount: countWords(body),
  };
}

/**
 * Extract a specific section by heading
 */
export function extractSection(
  content: string,
  sectionHeading: string
): string | null {
  const sections = extractSections(content);
  const lines = content.split("\n");

  const targetSection = sections.find(
    (s) => s.heading.toLowerCase() === sectionHeading.toLowerCase()
  );

  if (!targetSection) return null;

  const startLine = targetSection.startLine - 1; // Convert to 0-indexed
  const endLine = targetSection.endLine
    ? targetSection.endLine - 1
    : lines.length;

  return lines.slice(startLine, endLine).join("\n");
}

/**
 * Generate a snippet around matched terms
 */
export function generateSnippet(
  content: string,
  query: string,
  maxLength: number = 200
): string {
  const terms = query.toLowerCase().split(/\s+/);
  const contentLower = content.toLowerCase();

  // Find first occurrence of any term
  let bestIndex = -1;
  for (const term of terms) {
    const index = contentLower.indexOf(term);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
    }
  }

  if (bestIndex === -1) {
    // No match found, return beginning
    return content.slice(0, maxLength) + (content.length > maxLength ? "..." : "");
  }

  // Calculate snippet window
  const halfLength = Math.floor(maxLength / 2);
  let start = Math.max(0, bestIndex - halfLength);
  let end = Math.min(content.length, bestIndex + halfLength);

  // Adjust to word boundaries
  if (start > 0) {
    const spaceIndex = content.indexOf(" ", start);
    if (spaceIndex !== -1 && spaceIndex < bestIndex) {
      start = spaceIndex + 1;
    }
  }

  if (end < content.length) {
    const spaceIndex = content.lastIndexOf(" ", end);
    if (spaceIndex !== -1 && spaceIndex > bestIndex) {
      end = spaceIndex;
    }
  }

  let snippet = content.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet;
}
