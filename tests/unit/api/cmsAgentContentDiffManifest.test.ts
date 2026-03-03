import { describe, expect, it } from "vitest";
import de from "../../../apps/one-of-one-landing/content/landing.de.json";
import en from "../../../apps/one-of-one-landing/content/landing.en.json";
import { compileCmsContentEditPayload } from "../../../src/lib/cms-agent/contentEditCompiler";
import { buildCmsContentChangeManifest } from "../../../src/lib/cms-agent/contentDiffManifest";

describe("cms content diff manifest", () => {
  it("builds semantic-only diff contract from compiler output", () => {
    const documents = [
      {
        filePath: "apps/one-of-one-landing/content/landing.en.json",
        content: en,
      },
      {
        filePath: "apps/one-of-one-landing/content/landing.de.json",
        content: de,
      },
    ];

    const compileResult = compileCmsContentEditPayload({
      targetAppPath: "apps/one-of-one-landing",
      riskTier: "low",
      operationClass: "content_copy",
      documents,
      intentPayload: {
        edits: [
          {
            op: "replace",
            selector: {
              type: "content_key",
              key: "headline",
              locale: "en",
            },
            value: "Semantic diff headline",
          },
        ],
      },
    });

    const manifest = buildCmsContentChangeManifest({
      compileResult,
      beforeDocuments: documents,
    });

    expect(manifest.contractVersion).toBe("cms_content_change_manifest.v1");
    expect(manifest.diffUx.canonicalKeyOrderingApplied).toBe(true);
    expect(manifest.diffUx.keyReorderingIsCosmetic).toBe(true);
    expect(manifest.diffUx.semanticChangeCount).toBe(1);
    expect(manifest.diffUx.semanticChanges).toEqual([
      {
        filePath: "apps/one-of-one-landing/content/landing.en.json",
        path: "/headline",
        op: "replace",
        before: en.headline,
        after: "Semantic diff headline",
      },
    ]);
  });
});
