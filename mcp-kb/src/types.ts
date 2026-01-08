/**
 * MCP Knowledge Base Types
 */

// Document metadata from scanning
export interface DocumentMetadata {
  path: string;
  relativePath: string;
  title: string;
  category: string;
  size: number;
  lastModified: Date;
  wordCount: number;
}

// Parsed markdown document
export interface ParsedDocument {
  path: string;
  title: string;
  content: string;
  sections: DocumentSection[];
  frontmatter: Record<string, unknown>;
  wordCount: number;
}

// Document section (heading)
export interface DocumentSection {
  heading: string;
  level: number;
  startLine: number;
  endLine?: number;
}

// Category with document counts
export interface Category {
  name: string;
  path: string;
  documentCount: number;
  subcategories: Category[];
}

// Search result
export interface SearchResult {
  path: string;
  title: string;
  category: string;
  snippet: string;
  score: number;
  matchCount: number;
}

// Indexed document for search
export interface IndexedDocument {
  path: string;
  title: string;
  category: string;
  content: string;
  wordFrequency: Map<string, number>;
  lastModified: number;
}

// Search index
export interface SearchIndex {
  documents: Map<string, IndexedDocument>;
  invertedIndex: Map<string, Set<string>>; // word -> document paths
  lastBuilt: number;
  totalDocuments: number;
}

// Cache entry
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

// Tool input schemas
export interface ListCategoriesInput {
  includeSubcategories?: boolean;
}

export interface ListDocumentsInput {
  category?: string;
  limit?: number;
  offset?: number;
  sortBy?: "name" | "modified" | "size";
}

export interface SearchInput {
  query: string;
  category?: string;
  limit?: number;
  freshResults?: boolean;
}

export interface ReadInput {
  path: string;
  section?: string;
  freshContent?: boolean;
}

// Tool output schemas
export interface ListCategoriesOutput {
  categories: Category[];
  totalDocuments: number;
}

export interface ListDocumentsOutput {
  documents: DocumentMetadata[];
  total: number;
}

export interface SearchOutput {
  results: SearchResult[];
  totalMatches: number;
  searchTime: number;
  cached: boolean;
}

export interface ReadOutput {
  path: string;
  title: string;
  content: string;
  wordCount: number;
  lastModified: string;
  sections: DocumentSection[];
}

// Configuration
export interface KBConfig {
  docsPath: string;
  cacheTTL: number; // seconds, 0 = disabled
  indexOnStart: boolean;
}

// Category mapping from filename prefix
export const CATEGORY_MAP: Record<string, string> = {
  AI: "features/ai",
  API: "api",
  CRM: "features/crm",
  CLI: "cli",
  AUTH: "authentication",
  CHECKOUT: "features/checkout",
  FORM: "features/forms",
  FRONTEND: "frontend",
  BACKEND: "backend",
  INVOICE: "features/invoicing",
  PAYMENT: "features/payments",
  PDF: "features/pdf",
  TAX: "features/tax",
  OAUTH: "features/oauth",
  WORKFLOW: "features/workflow",
  CMS: "features/cms",
  RBAC: "features/rbac",
  SESSION: "status",
  PHASE: "status",
  SYSTEM: "architecture",
  ARCHITECTURE: "architecture",
  DATABASE: "backend/database",
  EMAIL: "features/email",
  EVENT: "features/events",
  PROJECT: "features/projects",
  STRIPE: "integrations/stripe",
  WEBHOOK: "integrations/webhooks",
  MCP: "mcp",
};
