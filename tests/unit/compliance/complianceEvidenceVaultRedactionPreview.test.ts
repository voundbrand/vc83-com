import { describe, expect, it } from "vitest";
import {
  buildEvidenceUploadRedactionPreview,
  redactSensitiveUploadText,
} from "../../../src/components/window-content/compliance-evidence-vault-tab";

describe("evidence upload redaction preview", () => {
  it("redacts common sensitive tokens deterministically", () => {
    const input =
      "Contact ops@example.com or +49 170 1234567. IBAN DE89370400440532013000 token sk_test_1234567890abcdef";
    const result = redactSensitiveUploadText(input);

    expect(result.findingCount).toBe(4);
    expect(result.redactedValue).toContain("[REDACTED_EMAIL]");
    expect(result.redactedValue).toContain("[REDACTED_PHONE]");
    expect(result.redactedValue).toContain("[REDACTED_IBAN]");
    expect(result.redactedValue).toContain("[REDACTED_TOKEN]");
  });

  it("builds field-level preview entries for flagged metadata", () => {
    const file = new File(["hello"], "avv-ops@example.com.pdf", {
      type: "application/pdf",
    });
    const preview = buildEvidenceUploadRedactionPreview({
      selectedFile: file,
      uploadForm: {
        title: "Provider contact ops@example.com",
        description: "",
        subtype: "avv_provider",
        sourceType: "org_uploaded",
        sensitivity: "confidential",
        lifecycleStatus: "active",
        reviewCadence: "annual",
        retentionClass: "3_years",
        nextReviewDate: "2026-04-01",
        retentionDeleteDate: "2028-04-01",
        providerName: "Call +49 170 1234567",
        controlId: "",
        notes: "",
        selectedRiskIds: ["R-002"],
      },
    });

    expect(preview.totalFindings).toBeGreaterThan(0);
    expect(preview.entries.some((entry) => entry.field === "Filename")).toBe(true);
    expect(preview.entries.some((entry) => entry.field === "Title")).toBe(true);
    expect(preview.entries.some((entry) => entry.field === "Provider name")).toBe(true);
  });

  it("returns empty preview when no sensitive patterns are present", () => {
    const preview = buildEvidenceUploadRedactionPreview({
      selectedFile: new File(["safe"], "policy.pdf", { type: "application/pdf" }),
      uploadForm: {
        title: "Security control policy",
        description: "Audit-safe summary",
        subtype: "security_control",
        sourceType: "org_uploaded",
        sensitivity: "confidential",
        lifecycleStatus: "active",
        reviewCadence: "annual",
        retentionClass: "3_years",
        nextReviewDate: "2026-04-01",
        retentionDeleteDate: "2028-04-01",
        providerName: "Ops Team",
        controlId: "rbac",
        notes: "Internal checklist",
        selectedRiskIds: ["R-004"],
      },
    });

    expect(preview.totalFindings).toBe(0);
    expect(preview.entries).toEqual([]);
  });
});
