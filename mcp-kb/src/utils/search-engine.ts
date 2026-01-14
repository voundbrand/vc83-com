/**
 * TF-IDF based search engine for documentation
 */

import { readFile } from "fs/promises";
import type {
  SearchIndex,
  IndexedDocument,
  SearchResult,
  DocumentMetadata,
} from "../types.js";
import { parseMarkdown, generateSnippet } from "./markdown-parser.js";

// Stopwords to exclude from indexing
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "he", "in", "is", "it", "its", "of", "on", "or", "that",
  "the", "to", "was", "were", "will", "with", "this", "but", "they",
  "have", "had", "what", "when", "where", "who", "which", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some",
  "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "can", "just", "should", "now", "also", "into", "over", "after",
]);

/**
 * Tokenize text into searchable terms
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // Remove special chars
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * Calculate word frequency for a document
 */
export function calculateWordFrequency(content: string): Map<string, number> {
  const frequency = new Map<string, number>();
  const tokens = tokenize(content);

  for (const token of tokens) {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  }

  return frequency;
}

/**
 * Search engine class
 */
export class SearchEngine {
  private index: SearchIndex = {
    documents: new Map(),
    invertedIndex: new Map(),
    lastBuilt: 0,
    totalDocuments: 0,
  };

  private docsPath: string;

  constructor(docsPath: string) {
    this.docsPath = docsPath;
  }

  /**
   * Build or rebuild the search index
   */
  async buildIndex(documents: DocumentMetadata[]): Promise<void> {
    this.index = {
      documents: new Map(),
      invertedIndex: new Map(),
      lastBuilt: Date.now(),
      totalDocuments: documents.length,
    };

    for (const doc of documents) {
      try {
        const content = await readFile(doc.path, "utf-8");
        const parsed = parseMarkdown(content, doc.relativePath);
        const wordFrequency = calculateWordFrequency(
          parsed.title + " " + parsed.content
        );

        const indexedDoc: IndexedDocument = {
          path: doc.relativePath,
          title: parsed.title,
          category: doc.category,
          content: parsed.content,
          wordFrequency,
          lastModified: doc.lastModified.getTime(),
        };

        this.index.documents.set(doc.relativePath, indexedDoc);

        // Build inverted index
        for (const word of wordFrequency.keys()) {
          if (!this.index.invertedIndex.has(word)) {
            this.index.invertedIndex.set(word, new Set());
          }
          this.index.invertedIndex.get(word)!.add(doc.relativePath);
        }
      } catch (error) {
        console.error(`Error indexing ${doc.relativePath}:`, error);
      }
    }
  }

  /**
   * Calculate IDF for a term
   */
  private calculateIDF(term: string): number {
    const docFrequency = this.index.invertedIndex.get(term)?.size || 0;
    if (docFrequency === 0) return 0;
    return Math.log(this.index.totalDocuments / docFrequency);
  }

  /**
   * Calculate TF-IDF score for a document
   */
  private calculateScore(queryTerms: string[], doc: IndexedDocument): number {
    let score = 0;

    for (const term of queryTerms) {
      const tf = doc.wordFrequency.get(term) || 0;
      const idf = this.calculateIDF(term);
      score += tf * idf;

      // Boost for title matches
      if (doc.title.toLowerCase().includes(term)) {
        score *= 1.5;
      }
    }

    return score;
  }

  /**
   * Search for documents matching the query
   */
  search(
    query: string,
    options: { category?: string; limit?: number } = {}
  ): SearchResult[] {
    const { category, limit = 10 } = options;
    const queryTerms = tokenize(query);

    if (queryTerms.length === 0) {
      return [];
    }

    // Find candidate documents using inverted index
    const candidatePaths = new Set<string>();
    for (const term of queryTerms) {
      const paths = this.index.invertedIndex.get(term);
      if (paths) {
        for (const path of paths) {
          candidatePaths.add(path);
        }
      }
    }

    // Score and filter candidates
    const results: SearchResult[] = [];

    for (const path of candidatePaths) {
      const doc = this.index.documents.get(path);
      if (!doc) continue;

      // Filter by category if specified
      if (category && !doc.category.startsWith(category)) {
        continue;
      }

      const score = this.calculateScore(queryTerms, doc);
      if (score > 0) {
        // Count matches
        let matchCount = 0;
        for (const term of queryTerms) {
          matchCount += doc.wordFrequency.get(term) || 0;
        }

        results.push({
          path: doc.path,
          title: doc.title,
          category: doc.category,
          snippet: generateSnippet(doc.content, query),
          score,
          matchCount,
        });
      }
    }

    // Sort by score descending and limit
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get index statistics
   */
  getStats(): {
    documentCount: number;
    uniqueTerms: number;
    lastBuilt: number;
  } {
    return {
      documentCount: this.index.totalDocuments,
      uniqueTerms: this.index.invertedIndex.size,
      lastBuilt: this.index.lastBuilt,
    };
  }

  /**
   * Check if index needs rebuilding
   */
  needsRebuild(maxAgeMs: number = 3600000): boolean {
    return (
      this.index.totalDocuments === 0 ||
      Date.now() - this.index.lastBuilt > maxAgeMs
    );
  }
}
