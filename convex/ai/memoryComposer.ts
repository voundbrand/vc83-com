export interface KnowledgeContextDocument {
  filename: string;
  content: string;
  description?: string;
  tags?: string[];
  sizeBytes?: number;
  source?: string;
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
