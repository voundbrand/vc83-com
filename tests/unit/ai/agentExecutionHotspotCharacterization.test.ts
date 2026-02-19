import { describe, expect, it } from "vitest";
import {
  buildAgentSystemPrompt,
  mapSemanticChunksToKnowledgeDocuments,
  resolveKnowledgeRetrieval,
} from "../../../convex/ai/agentExecution";

describe("agent execution hotspot characterization", () => {
  it("preserves prompt section ordering across resume, handoff, and degraded mode blocks", () => {
    const prompt = buildAgentSystemPrompt(
      {
        displayName: "Billing Specialist",
        autonomyLevel: "draft_only",
        blockedTopics: ["refund policy exceptions"],
      },
      [
        {
          citationId: "KB-2",
          filename: "billing-guide.md",
          content: "Always verify invoice ownership before taking action.",
        },
      ],
      undefined,
      "Customer asked about invoice status yesterday",
      ["process_payment", "create_invoice"],
      {
        sharedContext: "Customer already shared account and invoice IDs.",
        lastHandoff: {
          fromAgent: "Ops PM",
          reason: "Billing specialist support",
          summary: "Canonical handoff summary",
          contextSummary: "Legacy handoff summary",
          goal: "Recover failed checkout",
        },
      },
      "=== YOUR HARNESS (Self-Awareness) ===\nHarness marker\n=== END HARNESS ==="
    );

    const previousConversationIndex = prompt.indexOf("--- PREVIOUS CONVERSATION ---");
    const handoffIndex = prompt.indexOf("--- TEAM HANDOFF ---");
    const degradedModeIndex = prompt.indexOf("--- DEGRADED MODE ---");

    expect(prompt).toContain("Harness marker");
    expect(prompt).toContain("Summary: Canonical handoff summary");
    expect(prompt).not.toContain("Summary: Legacy handoff summary");
    expect(prompt).toContain("Goal: Recover failed checkout");
    expect(prompt).toContain("IMPORTANT: You are in draft-only mode.");

    expect(previousConversationIndex).toBeGreaterThan(-1);
    expect(handoffIndex).toBeGreaterThan(-1);
    expect(degradedModeIndex).toBeGreaterThan(-1);
    expect(previousConversationIndex).toBeLessThan(handoffIndex);
    expect(handoffIndex).toBeLessThan(degradedModeIndex);
  });

  it("returns the empty-knowledge fallback contract when there are no candidate docs", () => {
    const retrieval = resolveKnowledgeRetrieval({
      queryText: "warranty coverage",
      candidateDocs: [],
      limit: 3,
    });

    expect(retrieval.mode).toBe("fallback");
    expect(retrieval.fallbackUsed).toBe(false);
    expect(retrieval.fallbackReason).toBe("knowledge_base_empty");
    expect(retrieval.documents).toEqual([]);
    expect(retrieval.semanticCandidates).toBe(0);
  });

  it("filters blank semantic chunks and preserves deterministic citation numbering", () => {
    const docs = mapSemanticChunksToKnowledgeDocuments([
      {
        chunkId: "chunk_blank",
        chunkText: "   ",
        sourceFilename: "blank.md",
      },
      {
        chunkId: "chunk_kept",
        chunkText: "Contract terms are valid for 12 months.",
        sourceFilename: "terms.md",
        sourceTags: ["terms"],
      },
    ]);

    expect(docs).toHaveLength(1);
    expect(docs[0].chunkId).toBe("chunk_kept");
    expect(docs[0].filename).toBe("terms.md");
    expect(docs[0].citationId).toBe("KB-1");
    expect(docs[0].retrievalMethod).toBe("semantic_chunk_index");
  });
});
