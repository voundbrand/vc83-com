export interface KnowledgeContextDocument {
  mediaId?: string;
  chunkId?: string;
  chunkOrdinal?: number;
  filename: string;
  content: string;
  description?: string;
  tags?: string[];
  sizeBytes?: number;
  source?: string;
  updatedAt?: number;
  citationId?: string;
  semanticScore?: number;
  confidence?: number;
  confidenceBand?: "high" | "medium" | "low";
  matchedTokens?: string[];
  retrievalMethod?: string;
}

export interface KnowledgeContextComposition {
  documents: KnowledgeContextDocument[];
  tokenBudget: number;
  estimatedTokensUsed: number;
  droppedDocumentCount: number;
  truncatedDocumentCount: number;
  bytesUsed: number;
  sourceTags: string[];
}

export interface SemanticRetrievalChunkCandidate {
  chunkId: string;
  mediaId?: string;
  chunkOrdinal?: number;
  chunkText: string;
  sourceFilename: string;
  sourceDescription?: string;
  sourceTags?: string[];
  sourceUpdatedAt?: number;
  embeddingScore?: number;
}

export interface RankedSemanticRetrievalChunk extends SemanticRetrievalChunkCandidate {
  semanticScore: number;
  confidence: number;
  confidenceBand: "high" | "medium" | "low";
  matchedTokens: string[];
}

interface ComposeKnowledgeContextArgs {
  documents: KnowledgeContextDocument[];
  modelContextLength?: number;
  budgetRatio?: number;
  minBudgetTokens?: number;
  maxBudgetTokens?: number;
}

const ESTIMATED_CHARS_PER_TOKEN = 4;
const DEFAULT_MODEL_CONTEXT_LENGTH = 128_000;
const DEFAULT_BUDGET_RATIO = 0.2;
const DEFAULT_MIN_BUDGET_TOKENS = 1_000;
const DEFAULT_MAX_BUDGET_TOKENS = 12_000;
const UTF8_ENCODER = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const SEMANTIC_RETRIEVAL_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "for",
  "from",
  "how",
  "in",
  "is",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "we",
  "what",
  "when",
  "where",
  "which",
  "with",
]);

export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / ESTIMATED_CHARS_PER_TOKEN);
}

export function getUtf8ByteLength(text: string): number {
  if (!text) return 0;
  if (UTF8_ENCODER) {
    return UTF8_ENCODER.encode(text).length;
  }
  // Fallback for runtimes without TextEncoder.
  return encodeURIComponent(text).replace(/%[A-F\d]{2}/g, "U").length;
}

export function tokenizeSemanticRetrievalText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !SEMANTIC_RETRIEVAL_STOP_WORDS.has(token));
}

function toConfidenceBand(score: number): "high" | "medium" | "low" {
  if (score >= 0.55) return "high";
  if (score >= 0.28) return "medium";
  return "low";
}

function clampConfidence(value: number): number {
  return Number(Math.min(1, Math.max(0, value)).toFixed(4));
}

export function rankSemanticRetrievalChunks(args: {
  queryText: string;
  candidates: SemanticRetrievalChunkCandidate[];
  limit?: number;
  minScore?: number;
}): RankedSemanticRetrievalChunk[] {
  const queryTokens = tokenizeSemanticRetrievalText(args.queryText);
  if (queryTokens.length === 0 || args.candidates.length === 0) {
    return [];
  }
  const queryTokenSet = new Set(queryTokens);
  const minScore = typeof args.minScore === "number" ? Math.max(0, args.minScore) : 0.1;
  const limit = Math.max(1, Math.floor(args.limit ?? args.candidates.length));
  const now = Date.now();
  const recentWindowMs = 30 * 24 * 60 * 60 * 1000;

  const scored: RankedSemanticRetrievalChunk[] = [];
  for (const candidate of args.candidates) {
    const corpus = [
      candidate.sourceFilename,
      candidate.sourceDescription ?? "",
      (candidate.sourceTags ?? []).join(" "),
      candidate.chunkText.slice(0, 6000),
    ].join(" ");
    const docTokens = tokenizeSemanticRetrievalText(corpus);
    if (docTokens.length === 0) continue;

    const docTokenSet = new Set(docTokens);
    const matchedTokens = queryTokens.filter((token) => docTokenSet.has(token));
    if (matchedTokens.length === 0) continue;

    const overlapScore = matchedTokens.length / queryTokenSet.size;
    const densityScore = matchedTokens.length / Math.max(1, Math.sqrt(docTokenSet.size));

    const sourceTagSet = new Set(
      (candidate.sourceTags ?? []).map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0)
    );
    const tagMatches = queryTokens.filter((token) => sourceTagSet.has(token)).length;
    const tagBoost = Math.min(0.25, tagMatches * 0.08);

    const ageMs =
      typeof candidate.sourceUpdatedAt === "number" ? Math.max(0, now - candidate.sourceUpdatedAt) : recentWindowMs;
    const recencyBoost = Math.max(0, 1 - ageMs / recentWindowMs) * 0.1;
    const embeddingBoost = Math.max(0, Math.min(1, candidate.embeddingScore ?? 0)) * 0.2;

    const semanticScore = clampConfidence(
      overlapScore * 0.55 + densityScore * 0.15 + tagBoost + recencyBoost + embeddingBoost
    );
    if (semanticScore < minScore) {
      continue;
    }

    scored.push({
      ...candidate,
      semanticScore,
      confidence: semanticScore,
      confidenceBand: toConfidenceBand(semanticScore),
      matchedTokens,
    });
  }

  return scored
    .sort((a, b) => {
      const scoreDelta = b.semanticScore - a.semanticScore;
      if (scoreDelta !== 0) return scoreDelta;
      const updatedAtDelta = (b.sourceUpdatedAt ?? 0) - (a.sourceUpdatedAt ?? 0);
      if (updatedAtDelta !== 0) return updatedAtDelta;
      return (a.chunkOrdinal ?? 0) - (b.chunkOrdinal ?? 0);
    })
    .slice(0, limit);
}

function clampTokenBudget(args: ComposeKnowledgeContextArgs): number {
  const contextLength = Number.isFinite(args.modelContextLength)
    ? Math.max(1, Math.floor(args.modelContextLength as number))
    : DEFAULT_MODEL_CONTEXT_LENGTH;
  const ratio = Number.isFinite(args.budgetRatio)
    ? Math.min(Math.max(args.budgetRatio as number, 0.01), 0.9)
    : DEFAULT_BUDGET_RATIO;
  const minBudget = Number.isFinite(args.minBudgetTokens)
    ? Math.max(1, Math.floor(args.minBudgetTokens as number))
    : DEFAULT_MIN_BUDGET_TOKENS;
  const maxBudget = Number.isFinite(args.maxBudgetTokens)
    ? Math.max(minBudget, Math.floor(args.maxBudgetTokens as number))
    : DEFAULT_MAX_BUDGET_TOKENS;
  const computed = Math.floor(contextLength * ratio);
  return Math.min(maxBudget, Math.max(minBudget, computed));
}

function truncateTextToTokenBudget(text: string, tokenBudget: number): string {
  if (tokenBudget <= 0) return "";
  const maxChars = tokenBudget * ESTIMATED_CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  const marker = "\n[Truncated for context budget]";
  const sliceChars = Math.max(0, maxChars - marker.length);
  const sliced = text.slice(0, sliceChars).trimEnd();
  return `${sliced}${marker}`;
}

function estimateDocumentOverheadTokens(doc: KnowledgeContextDocument): number {
  const overheadParts = [
    doc.filename,
    doc.description || "",
    (doc.tags || []).join(","),
    doc.source || "",
  ];
  return estimateTokensFromText(overheadParts.join("\n"));
}

function uniqueNormalizedTags(docs: KnowledgeContextDocument[]): string[] {
  const tags = new Set<string>();
  for (const doc of docs) {
    for (const tag of doc.tags || []) {
      const normalized = tag.trim().toLowerCase();
      if (normalized.length > 0) {
        tags.add(normalized);
      }
    }
    if (doc.source) {
      const normalizedSource = doc.source.trim().toLowerCase();
      if (normalizedSource.length > 0) {
        tags.add(normalizedSource);
      }
    }
  }
  return Array.from(tags);
}

export function composeKnowledgeContext(
  args: ComposeKnowledgeContextArgs
): KnowledgeContextComposition {
  const tokenBudget = clampTokenBudget(args);
  const docs = args.documents || [];
  const selected: KnowledgeContextDocument[] = [];
  let estimatedTokensUsed = 0;
  let droppedDocumentCount = 0;
  let truncatedDocumentCount = 0;
  let bytesUsed = 0;

  for (const doc of docs) {
    const content = doc.content?.trim();
    if (!content) {
      droppedDocumentCount += 1;
      continue;
    }

    const remainingBudget = tokenBudget - estimatedTokensUsed;
    if (remainingBudget <= 0) {
      droppedDocumentCount += 1;
      continue;
    }

    const overheadTokens = estimateDocumentOverheadTokens(doc);
    const contentTokenBudget = remainingBudget - overheadTokens;
    if (contentTokenBudget <= 0) {
      droppedDocumentCount += 1;
      continue;
    }

    let boundedContent = content;
    let contentTokens = estimateTokensFromText(content);
    if (contentTokens > contentTokenBudget) {
      boundedContent = truncateTextToTokenBudget(content, contentTokenBudget);
      contentTokens = estimateTokensFromText(boundedContent);
      truncatedDocumentCount += 1;
    }

    if (contentTokens <= 0) {
      droppedDocumentCount += 1;
      continue;
    }

    selected.push({
      ...doc,
      content: boundedContent,
    });
    estimatedTokensUsed += overheadTokens + contentTokens;
    bytesUsed += getUtf8ByteLength(boundedContent);
  }

  return {
    documents: selected,
    tokenBudget,
    estimatedTokensUsed,
    droppedDocumentCount,
    truncatedDocumentCount,
    bytesUsed,
    sourceTags: uniqueNormalizedTags(selected),
  };
}
