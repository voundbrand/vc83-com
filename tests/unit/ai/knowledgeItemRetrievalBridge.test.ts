import { describe, expect, it } from "vitest";
import { buildKnowledgeItemBridgeDocument } from "../../../convex/organizationMedia";

describe("knowledge item retrieval bridge", () => {
  it("builds bridge content for non-layercake link knowledge items", () => {
    const bridgeDoc = buildKnowledgeItemBridgeDocument({
      knowledgeItem: {
        _id: "obj_link_1",
        name: "Founder profile link",
        description: "Canonical founder profile",
        status: "active",
        updatedAt: 1_739_900_000_000,
        customProperties: {
          sourceType: "link",
          sourceUrl: "https://example.com/founder",
          sourceLabel: "Teach mode web link",
          knowledgeKind: "link",
          ingestStatus: "processed",
          sourceTags: ["founder", "bio"],
        },
      },
      sourceMedia: null,
    });

    expect(bridgeDoc).not.toBeNull();
    expect(bridgeDoc?.source).toBe("knowledge_item_bridge");
    expect(bridgeDoc?.content).toContain("Source URL: https://example.com/founder");
    expect(bridgeDoc?.tags).toEqual(expect.arrayContaining(["knowledge_item_bridge", "link", "founder", "bio"]));
  });

  it("skips bridge doc generation for layercake-backed knowledge items", () => {
    const bridgeDoc = buildKnowledgeItemBridgeDocument({
      knowledgeItem: {
        _id: "obj_text_1",
        name: "Internal playbook note",
        description: "Layer Cake source should use chunk index directly",
        status: "active",
        updatedAt: 1_739_900_010_000,
        customProperties: {
          sourceType: "text",
          sourceMediaId: "media_text_1",
          knowledgeKind: "text",
          ingestStatus: "processed",
        },
      },
      sourceMedia: {
        _id: "media_text_1",
        itemType: "layercake_document",
        filename: "playbook.md",
        mimeType: "text/markdown",
        updatedAt: 1_739_900_000_500,
      },
    });

    expect(bridgeDoc).toBeNull();
  });

  it("builds bridge doc with file provenance for uploaded media sources", () => {
    const bridgeDoc = buildKnowledgeItemBridgeDocument({
      knowledgeItem: {
        _id: "obj_pdf_1",
        name: "Pricing deck",
        description: "Q1 service packages",
        status: "active",
        updatedAt: 1_739_900_020_000,
        customProperties: {
          sourceType: "pdf",
          sourceMediaId: "media_pdf_1",
          knowledgeKind: "document",
          ingestStatus: "processed",
          sourceTags: ["pricing"],
        },
      },
      sourceMedia: {
        _id: "media_pdf_1",
        itemType: "file",
        filename: "pricing-deck.pdf",
        mimeType: "application/pdf",
        description: "Sales enablement deck",
        tags: ["sales", "pricing"],
        updatedAt: 1_739_900_030_000,
      },
    });

    expect(bridgeDoc).not.toBeNull();
    expect(bridgeDoc?.sourceMediaId).toBe("media_pdf_1");
    expect(bridgeDoc?.content).toContain("Source file: pricing-deck.pdf");
    expect(bridgeDoc?.content).toContain("Source MIME type: application/pdf");
    expect(bridgeDoc?.tags).toEqual(
      expect.arrayContaining(["knowledge_item_bridge", "pdf", "document", "sales", "pricing"])
    );
  });

  it("builds bridge doc for non-layercake text sources", () => {
    const bridgeDoc = buildKnowledgeItemBridgeDocument({
      knowledgeItem: {
        _id: "obj_text_file_1",
        name: "Playbook note",
        description: "Customer support runbook",
        status: "active",
        updatedAt: 1_739_900_040_000,
        customProperties: {
          sourceType: "text",
          sourceMediaId: "media_text_file_1",
          knowledgeKind: "text",
          ingestStatus: "processed",
          sourceTags: ["support"],
        },
      },
      sourceMedia: {
        _id: "media_text_file_1",
        itemType: "file",
        filename: "playbook.txt",
        mimeType: "text/plain",
        description: "Internal support notes",
        tags: ["internal"],
        updatedAt: 1_739_900_050_000,
      },
    });

    expect(bridgeDoc).not.toBeNull();
    expect(bridgeDoc?.content).toContain("Source type: text");
    expect(bridgeDoc?.content).toContain("Source file: playbook.txt");
    expect(bridgeDoc?.tags).toEqual(
      expect.arrayContaining(["knowledge_item_bridge", "text", "support", "internal"])
    );
  });

  it("infers source type for legacy audio uploads missing sourceType", () => {
    const bridgeDoc = buildKnowledgeItemBridgeDocument({
      knowledgeItem: {
        _id: "obj_audio_legacy_1",
        name: "Call transcript audio",
        description: "Weekly support calls",
        status: "active",
        updatedAt: 1_739_900_060_000,
        customProperties: {
          sourceMediaId: "media_audio_legacy_1",
          knowledgeKind: "audio",
          ingestStatus: "processed",
        },
      },
      sourceMedia: {
        _id: "media_audio_legacy_1",
        itemType: "file",
        filename: "support-calls.mp3",
        mimeType: "audio/mpeg",
        updatedAt: 1_739_900_070_000,
      },
    });

    expect(bridgeDoc).not.toBeNull();
    expect(bridgeDoc?.content).toContain("Source type: audio");
    expect(bridgeDoc?.tags).toEqual(
      expect.arrayContaining(["knowledge_item_bridge", "audio"])
    );
  });

  it("infers link source type from sourceUrl when sourceType is absent", () => {
    const bridgeDoc = buildKnowledgeItemBridgeDocument({
      knowledgeItem: {
        _id: "obj_link_legacy_1",
        name: "FAQ source",
        description: "Canonical FAQ URL",
        status: "active",
        updatedAt: 1_739_900_080_000,
        customProperties: {
          sourceUrl: "https://example.com/faq",
          knowledgeKind: "link",
          ingestStatus: "processed",
        },
      },
      sourceMedia: null,
    });

    expect(bridgeDoc).not.toBeNull();
    expect(bridgeDoc?.content).toContain("Source type: link");
    expect(bridgeDoc?.content).toContain("Source URL: https://example.com/faq");
    expect(bridgeDoc?.tags).toEqual(
      expect.arrayContaining(["knowledge_item_bridge", "link"])
    );
  });
});
