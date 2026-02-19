import { describe, expect, it } from "vitest";
import { splitKnowledgeDocumentIntoChunks } from "../../../convex/organizationMedia";

describe("organizationMedia semantic chunk indexing", () => {
  it("returns no chunks for empty content", () => {
    expect(
      splitKnowledgeDocumentIntoChunks({
        mediaId: "media_empty",
        content: "   \n\n  ",
      })
    ).toEqual([]);
  });

  it("splits long documents into deterministic chunk records", () => {
    const paragraph =
      "Emergency plumbing pricing starts at $199 and includes after-hours dispatch support with transparent billing.";
    const content = Array.from({ length: 16 }, (_, index) =>
      `## Section ${index + 1}\n${paragraph} ${"w".repeat(120)}`
    ).join("\n\n");

    const chunks = splitKnowledgeDocumentIntoChunks({
      mediaId: "media_123",
      content,
      targetChars: 420,
      maxChars: 520,
      minChars: 180,
      overlapChars: 90,
      maxChunks: 12,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkOrdinal).toBe(0);
    expect(chunks[1].chunkOrdinal).toBe(1);
    expect(chunks.every((chunk) => chunk.chunkText.length > 0)).toBe(true);
    expect(chunks.every((chunk) => chunk.tokenEstimate > 0)).toBe(true);
    expect(chunks.every((chunk) => chunk.chunkId.startsWith("media_123:"))).toBe(true);

    const repeated = splitKnowledgeDocumentIntoChunks({
      mediaId: "media_123",
      content,
      targetChars: 420,
      maxChars: 520,
      minChars: 180,
      overlapChars: 90,
      maxChunks: 12,
    });

    expect(repeated.map((chunk) => chunk.chunkId)).toEqual(
      chunks.map((chunk) => chunk.chunkId)
    );
    expect(repeated.map((chunk) => chunk.startOffset)).toEqual(
      chunks.map((chunk) => chunk.startOffset)
    );
  });

  it("respects the max chunk guardrail", () => {
    const content = Array.from({ length: 40 }, (_, index) => `Paragraph ${index} ${"z".repeat(100)}`).join("\n\n");

    const chunks = splitKnowledgeDocumentIntoChunks({
      mediaId: "media_guardrail",
      content,
      targetChars: 240,
      maxChars: 280,
      minChars: 120,
      overlapChars: 40,
      maxChunks: 2,
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[1].chunkOrdinal).toBe(1);
  });
});
