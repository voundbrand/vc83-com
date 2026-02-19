import { describe, expect, it } from "vitest";
import {
  buildAgentSystemPrompt,
  mapSemanticChunksToKnowledgeDocuments,
  rankKnowledgeDocsForSemanticRetrieval,
  resolveKnowledgeRetrieval,
} from "../../../convex/ai/agentExecution";
import { aggregateAgentRetrievalTelemetry } from "../../../convex/ai/agentSessions";

describe("semantic retrieval telemetry integration", () => {
  it("ranks relevant docs and assigns stable citation ids", () => {
    const ranked = rankKnowledgeDocsForSemanticRetrieval({
      queryText: "What are your emergency plumbing prices?",
      documents: [
        {
          mediaId: "m_1",
          filename: "pricing.md",
          content: "Emergency plumbing pricing starts at $199.",
          tags: ["pricing", "plumbing"],
          source: "layercake_document",
        },
        {
          mediaId: "m_2",
          filename: "hours.md",
          content: "Office hours are Monday through Friday.",
          tags: ["hours"],
          source: "layercake_document",
        },
      ],
    });

    expect(ranked).toHaveLength(1);
    expect(ranked[0].filename).toBe("pricing.md");
    expect(ranked[0].citationId).toBe("KB-1");
    expect(ranked[0].semanticScore).toBeGreaterThan(0.08);
  });

  it("falls back to recency-tag ordering when semantic ranking has no match", () => {
    const fallback = resolveKnowledgeRetrieval({
      queryText: "solar inverter warranty",
      candidateDocs: [
        {
          mediaId: "m_10",
          filename: "pricing.md",
          content: "Emergency plumbing pricing starts at $199.",
          tags: ["pricing", "plumbing"],
          source: "layercake_document",
        },
        {
          mediaId: "m_11",
          filename: "faq.md",
          content: "We respond within 24 hours.",
          tags: ["faq"],
          source: "layercake_document",
        },
      ],
    });

    expect(fallback.mode).toBe("fallback");
    expect(fallback.fallbackUsed).toBe(true);
    expect(fallback.fallbackReason).toBe("semantic_no_match");
    expect(fallback.documents).toHaveLength(2);
    expect(fallback.documents[0].citationId).toBe("KB-1");
  });

  it("maps semantic chunk retrieval results into chunk-aware knowledge docs", () => {
    const docs = mapSemanticChunksToKnowledgeDocuments([
      {
        chunkId: "chunk_1",
        mediaId: "m_20",
        chunkOrdinal: 0,
        chunkText: "Emergency plumbing pricing starts at $199.",
        sourceFilename: "pricing.md",
        sourceDescription: "Service pricing",
        sourceTags: ["pricing", "plumbing"],
        sourceUpdatedAt: 1_700_000_000_000,
        semanticScore: 0.91,
        confidence: 0.91,
        confidenceBand: "high",
        matchedTokens: ["emergency", "plumbing", "pricing"],
      },
    ]);

    expect(docs).toHaveLength(1);
    expect(docs[0].citationId).toBe("KB-1");
    expect(docs[0].chunkId).toBe("chunk_1");
    expect(docs[0].retrievalMethod).toBe("semantic_chunk_index");
    expect(docs[0].matchedTokens).toEqual(["emergency", "plumbing", "pricing"]);
  });

  it("allows knowledge-item bridge docs to participate in retrieval fallback ranking", () => {
    const decision = resolveKnowledgeRetrieval({
      queryText: "Where is your founder bio link?",
      candidateDocs: [
        {
          mediaId: "obj_link_1",
          filename: "Founder profile link",
          content:
            "Knowledge item: Founder profile link\\nSource type: link\\nSource URL: https://example.com/founder",
          tags: ["knowledge_item_bridge", "founder", "link"],
          source: "knowledge_item_bridge",
        },
      ],
    });

    expect(decision.documents).toHaveLength(1);
    expect(decision.mode).toBe("semantic");
    expect(decision.documents[0].source).toBe("knowledge_item_bridge");
  });

  it("keeps retrieval telemetry aligned with citation and fallback metadata", () => {
    const summary = aggregateAgentRetrievalTelemetry(
      [
        {
          performedAt: Date.now() - 1_000,
          retrieval: {
            docsRetrieved: 3,
            docsInjected: 2,
            bytesRetrieved: 1200,
            bytesInjected: 800,
            mode: "semantic",
            fallbackUsed: false,
            citationCount: 2,
            chunkCitationCount: 2,
            sourceTags: ["pricing", "layercake_document"],
          },
        },
        {
          performedAt: Date.now() - 2_000,
          retrieval: {
            docsRetrieved: 2,
            docsInjected: 1,
            bytesRetrieved: 900,
            bytesInjected: 400,
            mode: "fallback",
            fallbackUsed: true,
            fallbackReason: "semantic_no_match",
            citations: [{ citationId: "KB-3", chunkId: "chunk_3" }],
            sourceTags: ["faq"],
          },
        },
      ],
      { windowHours: 24, since: Date.now() - 24 * 60 * 60 * 1000 },
    );

    expect(summary.messagesWithRetrieval).toBe(2);
    expect(summary.semanticMessages).toBe(1);
    expect(summary.fallbackMessages).toBe(1);
    expect(summary.fallbackRate).toBe(0.5);
    expect(summary.citationCount).toBe(3);
    expect(summary.avgCitationsPerMessage).toBe(1.5);
    expect(summary.chunkCitationCount).toBe(3);
    expect(summary.avgChunkCitationsPerMessage).toBe(1.5);
    expect(summary.fallbackReasons).toEqual([{ reason: "semantic_no_match", count: 1 }]);
  });

  it("renders citation ids in the organization knowledge prompt section", () => {
    const prompt = buildAgentSystemPrompt(
      {
        displayName: "Ops Agent",
        autonomyLevel: "autonomous",
      },
      [
        {
          citationId: "KB-3",
          filename: "pricing.md",
          content: "Emergency plumbing pricing starts at $199.",
        },
      ],
    );

    expect(prompt).toContain("[KB-3] pricing.md");
  });
});
