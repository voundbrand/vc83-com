import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CmsContentCompilerError } from "../../../src/lib/cms-agent/contentEditContracts";
import {
  compileCmsContentIntentWithManifestFromRepo,
  compileCmsContentEditIntentFromRepo,
  loadCmsContentDocumentsFromRepo,
} from "../../../src/lib/cms-agent/repoContentAdapter";

const tempDirectories: string[] = [];

async function createRepoFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "cms-repo-adapter-"));
  tempDirectories.push(root);

  const contentDir = path.join(root, "apps/one-of-one-landing/content");
  await fs.mkdir(contentDir, { recursive: true });
  await fs.writeFile(
    path.join(contentDir, "landing.en.json"),
    JSON.stringify({ headline: "Original EN", ctaButton: "Talk to it" }, null, 2),
    "utf8"
  );
  await fs.writeFile(
    path.join(contentDir, "landing.de.json"),
    JSON.stringify({ headline: "Original DE", ctaButton: "Jetzt testen" }, null, 2),
    "utf8"
  );

  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true })
    )
  );
});

describe("cms repo content adapter", () => {
  it("loads content documents from app content directory", async () => {
    const repoRoot = await createRepoFixture();
    const documents = await loadCmsContentDocumentsFromRepo({
      repoRoot,
      targetAppPath: "apps/one-of-one-landing",
    });

    expect(documents.map((document) => document.filePath)).toEqual([
      "apps/one-of-one-landing/content/landing.de.json",
      "apps/one-of-one-landing/content/landing.en.json",
    ]);
  });

  it("compiles intent directly from repository content snapshot", async () => {
    const repoRoot = await createRepoFixture();

    const { compileResult } = await compileCmsContentEditIntentFromRepo({
      repoRoot,
      intent: {
        targetAppPath: "apps/one-of-one-landing",
        riskTier: "low",
        operationClass: "content_copy",
        edits: [
          {
            op: "replace",
            selector: {
              type: "content_key",
              key: "headline",
              locale: "en",
            },
            value: "Repo adapter headline",
          },
        ],
      },
    });

    expect(compileResult.patches).toEqual([
      {
        filePath: "apps/one-of-one-landing/content/landing.en.json",
        operations: [
          {
            op: "replace",
            path: "/headline",
            value: "Repo adapter headline",
          },
        ],
      },
    ]);
  });

  it("returns change manifest alongside compile output for orchestration", async () => {
    const repoRoot = await createRepoFixture();
    const result = await compileCmsContentIntentWithManifestFromRepo({
      repoRoot,
      intent: {
        targetAppPath: "apps/one-of-one-landing",
        riskTier: "low",
        operationClass: "content_copy",
        edits: [
          {
            op: "replace",
            selector: {
              type: "json_pointer",
              filePath: "apps/one-of-one-landing/content/landing.en.json",
              pointer: "/ctaButton",
            },
            value: "New CTA",
          },
        ],
      },
    });

    expect(result.changeManifest.contractVersion).toBe(
      "cms_content_change_manifest.v1"
    );
    expect(result.changeManifest.diffUx.semanticChangeCount).toBe(1);
    expect(result.changeManifest.diffUx.semanticChanges[0]).toMatchObject({
      filePath: "apps/one-of-one-landing/content/landing.en.json",
      path: "/ctaButton",
      op: "replace",
      before: "Talk to it",
      after: "New CTA",
    });
  });

  it("fails closed when app content directory is missing", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cms-repo-adapter-missing-"));
    tempDirectories.push(repoRoot);

    await expect(
      loadCmsContentDocumentsFromRepo({
        repoRoot,
        targetAppPath: "apps/one-of-one-landing",
      })
    ).rejects.toThrow(CmsContentCompilerError);
  });
});
