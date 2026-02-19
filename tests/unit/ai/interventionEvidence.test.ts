import { describe, expect, it } from "vitest";
import {
  deriveMemoryProvenanceEvidence,
  deriveRetrievalCitationEvidence,
} from "@/components/window-content/agents/intervention-evidence";

describe("deriveMemoryProvenanceEvidence", () => {
  it("returns latest consent checkpoint with candidate attribution and blocked flag", () => {
    const evidence = deriveMemoryProvenanceEvidence([
      {
        occurredAt: 1_000,
        trustEventName: "trust.memory.consent_prompted.v1",
        metadata: {
          consentScope: "session",
          consentDecision: "pending",
          memoryCandidateIds: ["mem_1", "mem_2"],
        },
      },
      {
        occurredAt: 1_500,
        trustEventName: "trust.memory.write_blocked_no_consent.v1",
        metadata: {
          consentScope: "session",
          consentDecision: "deny",
          memoryCandidateIds: ["mem_2"],
        },
      },
      {
        occurredAt: 2_000,
        trustEventName: "trust.memory.consent_decided.v1",
        metadata: {
          consentScope: "session",
          consentDecision: "accept",
          memoryCandidateIds: ["mem_2", "mem_3"],
          consentPromptVersion: "v2",
        },
      },
    ]);

    expect(evidence).not.toBeNull();
    expect(evidence?.eventName).toBe("trust.memory.consent_decided.v1");
    expect(evidence?.consentScope).toBe("session");
    expect(evidence?.consentDecision).toBe("accept");
    expect(evidence?.memoryCandidateIds).toEqual(["mem_2", "mem_3"]);
    expect(evidence?.consentPromptVersion).toBe("v2");
    expect(evidence?.blockedNoConsent).toBe(true);
    expect(evidence?.eventCount).toBe(3);
  });
});

describe("deriveRetrievalCitationEvidence", () => {
  it("classifies chunk vs bridge citations and exposes source kind/path", () => {
    const evidence = deriveRetrievalCitationEvidence([
      {
        occurredAt: 1_000,
        metadata: {
          retrieval: {
            mode: "semantic",
            path: "chunk_index",
            fallbackUsed: false,
            citationCount: 3,
            citations: [
              {
                citationId: "KB-1",
                chunkId: "chunk_1",
                source: "layercake_document",
                filename: "/kb/chunks/chunk_1.md",
              },
              {
                citationId: "KB-2",
                source: "knowledge_item_bridge",
                mediaId: "media_22",
                filename: "https://example.com/docs/playbook",
              },
              {
                citationId: "KB-3",
                source: "knowledge_item_bridge",
              },
            ],
          },
        },
      },
    ]);

    expect(evidence).not.toBeNull();
    expect(evidence?.mode).toBe("semantic");
    expect(evidence?.path).toBe("chunk_index");
    expect(evidence?.citationCount).toBe(3);
    expect(evidence?.chunkCitationCount).toBe(1);
    expect(evidence?.bridgeCitationCount).toBe(2);
    expect(evidence?.sourceKindCounts).toEqual([
      { sourceKind: "knowledge_item_bridge", count: 2 },
      { sourceKind: "layercake_document", count: 1 },
    ]);
    expect(evidence?.citations[0]).toMatchObject({
      citationId: "KB-1",
      provenanceType: "chunk_index",
      sourceKind: "layercake_document",
      sourcePath: "/kb/chunks/chunk_1.md",
    });
    expect(evidence?.citations[1]).toMatchObject({
      citationId: "KB-2",
      provenanceType: "knowledge_item_bridge",
      sourceKind: "knowledge_item_bridge",
      sourcePath: "https://example.com/docs/playbook",
    });
    expect(evidence?.citations[2]).toMatchObject({
      citationId: "KB-3",
      provenanceType: "knowledge_item_bridge",
      sourcePath: "KB-3",
    });
  });
});
