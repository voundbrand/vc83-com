import { describe, expect, it, vi } from "vitest";
import { buildDocxBytes } from "../../../convex/ai/tools/shared/docxBuilder";
import { createDocxDocumentTool } from "../../../convex/ai/tools/docxTools";
import { TOOL_REGISTRY } from "../../../convex/ai/tools/registry";

describe("docx tools", () => {
  it("builds a deterministic docx zip payload with expected OpenXML entries", () => {
    const bytes = buildDocxBytes({
      title: "Founder Operating Report",
      subtitle: "Week 1",
      sections: [
        {
          heading: "Action Plan",
          paragraphs: ["Map intake workflow.", "Set rollback criteria."],
        },
      ],
    });

    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K

    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toContain("word/document.xml");
    expect(decoded).toContain("Founder Operating Report");
    expect(decoded).toContain("Action Plan");
  });

  it("registers the DOCX creation tool in the global tool registry", () => {
    expect(TOOL_REGISTRY.create_docx_document).toBeDefined();
    expect(TOOL_REGISTRY.create_docx_document.status).toBe("ready");
  });

  it("creates a .docx artifact, stores it, and creates a media entry", async () => {
    const store = vi.fn().mockResolvedValue("storage_docx_1");
    const getUrl = vi.fn().mockResolvedValue("https://storage.example/docx-1");
    const runMutation = vi.fn().mockResolvedValue({
      mediaId: "media_1",
      fileName: "audit-report.docx",
    });

    const result = await createDocxDocumentTool.execute(
      {
        organizationId: "org_1",
        userId: "user_1",
        storage: { store, getUrl },
        runMutation,
      } as any,
      {
        fileName: "audit-report",
        title: "Audit Report",
        sections: [
          {
            heading: "Summary",
            paragraphs: ["The workflow is now documented."],
          },
        ],
      },
    ) as Record<string, unknown>;

    expect(result.success).toBe(true);
    expect(result.fileName).toBe("audit-report.docx");
    expect(result.storageId).toBe("storage_docx_1");
    expect(result.mediaId).toBe("media_1");
    expect(result.downloadUrl).toBe("https://storage.example/docx-1");
    expect(store).toHaveBeenCalledTimes(1);
    expect(runMutation).toHaveBeenCalledTimes(1);
  });

  it("fails closed in read-only autonomy mode", async () => {
    const result = await createDocxDocumentTool.execute(
      {
        runtimePolicy: {
          codeExecution: {
            autonomyLevel: "sandbox",
          },
        },
      } as any,
      {
        fileName: "blocked.docx",
        title: "Blocked",
      },
    ) as Record<string, unknown>;

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe("read_only_autonomy");
  });
});
