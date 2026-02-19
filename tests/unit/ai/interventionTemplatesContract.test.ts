import { describe, expect, it } from "vitest";
import { normalizeInterventionTemplateInput } from "../../../convex/ai/interventionTemplates";

describe("intervention template contract", () => {
  it("normalizes whitespace and keeps template identity for override draft", () => {
    const normalized = normalizeInterventionTemplateInput({
      templateId: "override_draft",
      note: "  approve with operator context  ",
    });

    expect(normalized).toEqual({
      templateId: "override_draft",
      note: "approve with operator context",
      fileName: undefined,
      fileUrl: undefined,
    });
  });

  it("requires a file reference when send file template is selected", () => {
    expect(() =>
      normalizeInterventionTemplateInput({
        templateId: "send_file",
        note: "send collateral",
      })
    ).toThrow("Send file template requires fileName or fileUrl.");
  });

  it("accepts send file templates when file metadata is present", () => {
    const normalized = normalizeInterventionTemplateInput({
      templateId: "send_file",
      fileName: "  deck.pdf ",
      fileUrl: " https://cdn.example.com/deck.pdf ",
    });

    expect(normalized).toEqual({
      templateId: "send_file",
      fileName: "deck.pdf",
      fileUrl: "https://cdn.example.com/deck.pdf",
      note: undefined,
    });
  });
});
