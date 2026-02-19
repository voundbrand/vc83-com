import { describe, expect, it } from "vitest";
import {
  getNormalizedExtension,
  resolveVirtualFileType,
} from "@/components/window-content/finder-window/file-type-registry";
import type { ProjectFile } from "@/components/window-content/finder-window/finder-types";

function buildVirtualFile(
  name: string,
  overrides: Partial<ProjectFile> = {},
): ProjectFile {
  return {
    _id: "file_1" as ProjectFile["_id"],
    _creationTime: 0,
    organizationId: "org_1" as ProjectFile["organizationId"],
    projectId: "project_1" as ProjectFile["projectId"],
    name,
    path: `/${name}`,
    parentPath: "/",
    fileKind: "virtual",
    source: "user",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("finder file-type registry mapping", () => {
  it("normalizes extension parsing for edge-case names", () => {
    expect(getNormalizedExtension("README.MD")).toBe("md");
    expect(getNormalizedExtension("config.ENV")).toBe("env");
    expect(getNormalizedExtension(".env.local")).toBe("env");
    expect(getNormalizedExtension("untitled")).toBeNull();
    expect(getNormalizedExtension("file.")).toBeNull();
  });

  it("maps expected extensions to deterministic editor capabilities", () => {
    const cases: Array<{
      name: string;
      expectedEditor: "markdown" | "code" | "note";
      expectedLanguage: string;
      expectedMime: string;
    }> = [
      {
        name: "readme.md",
        expectedEditor: "markdown",
        expectedLanguage: "markdown",
        expectedMime: "text/markdown",
      },
      {
        name: "page.html",
        expectedEditor: "code",
        expectedLanguage: "html",
        expectedMime: "text/html",
      },
      {
        name: "config.json",
        expectedEditor: "code",
        expectedLanguage: "json",
        expectedMime: "application/json",
      },
      {
        name: "layout.xml",
        expectedEditor: "code",
        expectedLanguage: "xml",
        expectedMime: "application/xml",
      },
      {
        name: "script.js",
        expectedEditor: "code",
        expectedLanguage: "javascript",
        expectedMime: "text/javascript",
      },
      {
        name: "notes.txt",
        expectedEditor: "note",
        expectedLanguage: "plaintext",
        expectedMime: "text/plain",
      },
    ];

    for (const testCase of cases) {
      const resolved = resolveVirtualFileType(buildVirtualFile(testCase.name));
      expect(resolved.editorType).toBe(testCase.expectedEditor);
      expect(resolved.language).toBe(testCase.expectedLanguage);
      expect(resolved.mimeType).toBe(testCase.expectedMime);
      expect(resolved.source).toBe("extension");
    }
  });

  it("falls back safely for unknown extensions", () => {
    const resolved = resolveVirtualFileType(buildVirtualFile("payload.unknown"));
    expect(resolved.extension).toBe("unknown");
    expect(resolved.editorType).toBe("code");
    expect(resolved.mimeType).toBe("text/plain");
    expect(resolved.language).toBe("text");
    expect(resolved.source).toBe("fallback");
  });

  it("uses mime/language fallback when no extension exists", () => {
    const mimeResolved = resolveVirtualFileType(
      buildVirtualFile("README", { mimeType: "text/markdown" }),
    );
    expect(mimeResolved.editorType).toBe("markdown");
    expect(mimeResolved.source).toBe("mime");

    const languageResolved = resolveVirtualFileType(
      buildVirtualFile("SCRATCH", { language: "plaintext" }),
    );
    expect(languageResolved.editorType).toBe("note");
    expect(languageResolved.source).toBe("language");
  });
});
