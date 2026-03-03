import { describe, expect, it } from "vitest";
import de from "../../../apps/one-of-one-landing/content/landing.de.json";
import en from "../../../apps/one-of-one-landing/content/landing.en.json";
import {
  CmsContentCompilerError,
  type CmsContentDocumentInput,
} from "../../../src/lib/cms-agent/contentEditContracts";
import {
  compileCmsContentEditIntent,
  compileCmsContentEditPayload,
} from "../../../src/lib/cms-agent/contentEditCompiler";

function buildReferenceDocuments(): CmsContentDocumentInput[] {
  return [
    {
      filePath: "apps/one-of-one-landing/content/landing.en.json",
      content: en,
    },
    {
      filePath: "apps/one-of-one-landing/content/landing.de.json",
      content: de,
    },
  ];
}

describe("cms content edit compiler", () => {
  it("generates deterministic patches and repo changes from mixed selectors", () => {
    const result = compileCmsContentEditPayload({
      targetAppPath: "apps/one-of-one-landing",
      riskTier: "medium",
      operationClass: "content_copy",
      documents: buildReferenceDocuments(),
      intentPayload: {
        edits: [
          {
            op: "replace",
            selector: {
              type: "content_key",
              key: "headline",
              locale: "en",
            },
            value: "Private AI. Built for your business.",
          },
          {
            op: "replace",
            selector: {
              type: "json_pointer",
              filePath: "apps/one-of-one-landing/content/landing.de.json",
              pointer: "/ctaButton",
            },
            value: "Direkt testen",
          },
        ],
      },
    });

    expect(result.policyDecision.allowed).toBe(true);
    expect(result.touchedFiles).toEqual([
      "apps/one-of-one-landing/content/landing.de.json",
      "apps/one-of-one-landing/content/landing.en.json",
    ]);
    expect(result.patches).toEqual([
      {
        filePath: "apps/one-of-one-landing/content/landing.de.json",
        operations: [
          {
            op: "replace",
            path: "/ctaButton",
            value: "Direkt testen",
          },
        ],
      },
      {
        filePath: "apps/one-of-one-landing/content/landing.en.json",
        operations: [
          {
            op: "replace",
            path: "/headline",
            value: "Private AI. Built for your business.",
          },
        ],
      },
    ]);

    const nextDe = result.repoChanges.find((entry) =>
      entry.filePath.endsWith("landing.de.json")
    );
    const nextEn = result.repoChanges.find((entry) =>
      entry.filePath.endsWith("landing.en.json")
    );

    expect(nextDe).toBeTruthy();
    expect(nextEn).toBeTruthy();
    expect(JSON.parse(nextDe!.nextContent).ctaButton).toBe("Direkt testen");
    expect(JSON.parse(nextEn!.nextContent).headline).toBe(
      "Private AI. Built for your business."
    );
  });

  it("rejects patch generation when policy denies touched files", () => {
    expect(() =>
      compileCmsContentEditIntent(
        {
          targetAppPath: "apps/one-of-one-landing",
          riskTier: "low",
          operationClass: "content_copy",
          edits: [
            {
              op: "replace",
              selector: {
                type: "json_pointer",
                filePath: "apps/one-of-one-landing/package.json",
                pointer: "/name",
              },
              value: "blocked-by-policy",
            },
          ],
        },
        [
          {
            filePath: "apps/one-of-one-landing/package.json",
            content: {
              name: "one-of-one-landing",
            },
          },
        ]
      )
    ).toThrowError(CmsContentCompilerError);

    try {
      compileCmsContentEditIntent(
        {
          targetAppPath: "apps/one-of-one-landing",
          riskTier: "low",
          operationClass: "content_copy",
          edits: [
            {
              op: "replace",
              selector: {
                type: "json_pointer",
                filePath: "apps/one-of-one-landing/package.json",
                pointer: "/name",
              },
              value: "blocked-by-policy",
            },
          ],
        },
        [
          {
            filePath: "apps/one-of-one-landing/package.json",
            content: {
              name: "one-of-one-landing",
            },
          },
        ]
      );
      throw new Error("Expected policy rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(CmsContentCompilerError);
      expect((error as CmsContentCompilerError).code).toBe("policy_denied");
      expect((error as CmsContentCompilerError).details?.reason).toBe(
        "file_path_not_allowed"
      );
    }
  });

  it("rejects ambiguous content_key selectors", () => {
    try {
      compileCmsContentEditIntent(
        {
          targetAppPath: "apps/one-of-one-landing",
          riskTier: "low",
          operationClass: "content_copy",
          edits: [
            {
              op: "replace",
              selector: {
                type: "content_key",
                key: "headline",
              },
              value: "This should fail",
            },
          ],
        },
        buildReferenceDocuments()
      );
      throw new Error("Expected ambiguous selector rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(CmsContentCompilerError);
      expect((error as CmsContentCompilerError).code).toBe("ambiguous_selector");
      expect((error as CmsContentCompilerError).details?.candidateFilePaths).toEqual([
        "apps/one-of-one-landing/content/landing.de.json",
        "apps/one-of-one-landing/content/landing.en.json",
      ]);
    }
  });

  it("fails closed when target app policy is missing", () => {
    try {
      compileCmsContentEditIntent(
        {
          targetAppPath: "apps/new-customer-site",
          riskTier: "low",
          operationClass: "content_copy",
          edits: [
            {
              op: "replace",
              selector: {
                type: "json_pointer",
                filePath: "apps/new-customer-site/content/home.json",
                pointer: "/headline",
              },
              value: "New headline",
            },
          ],
        },
        [
          {
            filePath: "apps/new-customer-site/content/home.json",
            content: {
              headline: "Old headline",
            },
          },
        ]
      );
      throw new Error("Expected missing app policy rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(CmsContentCompilerError);
      expect((error as CmsContentCompilerError).code).toBe("policy_denied");
      expect((error as CmsContentCompilerError).details?.reason).toBe(
        "missing_app_policy"
      );
    }
  });
});
