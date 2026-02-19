import { describe, expect, it } from "vitest";
import {
  composeKnowledgeContext,
  estimateTokensFromText,
  rankSemanticRetrievalChunks,
  tokenizeSemanticRetrievalText,
} from "../../../convex/ai/memoryComposer";

describe("memoryComposer", () => {
  it("estimates token usage from text length", () => {
    expect(estimateTokensFromText("")).toBe(0);
    expect(estimateTokensFromText("abcd")).toBe(1);
    expect(estimateTokensFromText("abcde")).toBe(2);
  });

  it("keeps all docs when the budget can fit them", () => {
    const composed = composeKnowledgeContext({
      documents: [
        {
          filename: "pricing.md",
          content: "Pricing is fixed for 2026.",
          tags: ["Pricing", "Sales"],
          source: "layercake_document",
        },
        {
          filename: "faq.md",
          content: "Opening hours are Monday to Friday from 9 to 5.",
          tags: ["FAQ"],
          source: "layercake_document",
        },
      ],
      modelContextLength: 2000,
      budgetRatio: 0.4,
      minBudgetTokens: 50,
      maxBudgetTokens: 500,
    });

    expect(composed.documents).toHaveLength(2);
    expect(composed.droppedDocumentCount).toBe(0);
    expect(composed.truncatedDocumentCount).toBe(0);
    expect(composed.estimatedTokensUsed).toBeGreaterThan(0);
    expect(composed.sourceTags).toContain("pricing");
    expect(composed.sourceTags).toContain("faq");
    expect(composed.sourceTags).toContain("layercake_document");
  });

  it("truncates long content when the document exceeds the remaining budget", () => {
    const composed = composeKnowledgeContext({
      documents: [
        {
          filename: "long.md",
          content: "x".repeat(6000),
          source: "layercake_document",
        },
      ],
      modelContextLength: 200,
      budgetRatio: 0.1,
      minBudgetTokens: 5,
      maxBudgetTokens: 20,
    });

    expect(composed.documents).toHaveLength(1);
    expect(composed.truncatedDocumentCount).toBe(1);
    expect(composed.documents[0].content).toContain("[Truncated for context budget]");
  });

  it("drops overflow docs after budget is consumed", () => {
    const composed = composeKnowledgeContext({
      documents: [
        { filename: "doc-1.md", content: "a".repeat(500), source: "layercake_document" },
        { filename: "doc-2.md", content: "b".repeat(500), source: "layercake_document" },
        { filename: "doc-3.md", content: "c".repeat(500), source: "layercake_document" },
      ],
      modelContextLength: 300,
      budgetRatio: 0.1,
      minBudgetTokens: 10,
      maxBudgetTokens: 30,
    });

    expect(composed.documents.length).toBeLessThan(3);
    expect(composed.droppedDocumentCount).toBeGreaterThan(0);
  });

  it("tokenizes retrieval text with stop-word filtering", () => {
    const tokens = tokenizeSemanticRetrievalText(
      "What are the emergency plumbing prices in Berlin?"
    );
    expect(tokens).toContain("emergency");
    expect(tokens).toContain("plumbing");
    expect(tokens).toContain("prices");
    expect(tokens).not.toContain("what");
    expect(tokens).not.toContain("are");
  });

  it("ranks semantic chunks with confidence metadata", () => {
    const ranked = rankSemanticRetrievalChunks({
      queryText: "emergency plumbing prices",
      candidates: [
        {
          chunkId: "c-1",
          chunkText: "Emergency plumbing prices start at $199 for same-day callouts.",
          sourceFilename: "pricing.md",
          sourceTags: ["pricing", "plumbing"],
          sourceUpdatedAt: Date.now(),
        },
        {
          chunkId: "c-2",
          chunkText: "Our office opening hours are Monday to Friday.",
          sourceFilename: "hours.md",
          sourceTags: ["hours"],
          sourceUpdatedAt: Date.now(),
        },
      ],
      limit: 5,
    });

    expect(ranked).toHaveLength(1);
    expect(ranked[0].chunkId).toBe("c-1");
    expect(ranked[0].semanticScore).toBeGreaterThan(0.1);
    expect(ranked[0].confidence).toBeCloseTo(ranked[0].semanticScore, 4);
    expect(["low", "medium", "high"]).toContain(ranked[0].confidenceBand);
    expect(ranked[0].matchedTokens).toContain("emergency");
  });
});
