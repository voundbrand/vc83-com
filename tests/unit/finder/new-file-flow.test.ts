import { describe, expect, it } from "vitest";
import {
  applySuggestedExtension,
  getSuggestedStarterContent,
  inferNewFileType,
  toStarterTitle,
} from "@/components/window-content/finder-window/new-file-flow";

describe("finder new-file flow helpers", () => {
  it("infers metadata for common extensions and unknown fallback", () => {
    expect(inferNewFileType("readme.md")).toMatchObject({
      extension: "md",
      mimeType: "text/markdown",
      language: "markdown",
      source: "registry",
    });
    expect(inferNewFileType("page.html")).toMatchObject({
      extension: "html",
      mimeType: "text/html",
      language: "html",
      source: "registry",
    });
    expect(inferNewFileType("config.json")).toMatchObject({
      extension: "json",
      mimeType: "application/json",
      language: "json",
      source: "registry",
    });
    expect(inferNewFileType("layout.xml")).toMatchObject({
      extension: "xml",
      mimeType: "application/xml",
      language: "xml",
      source: "registry",
    });
    expect(inferNewFileType("script.js")).toMatchObject({
      extension: "js",
      mimeType: "text/javascript",
      language: "javascript",
      source: "registry",
    });
    expect(inferNewFileType("notes.txt")).toMatchObject({
      extension: "txt",
      mimeType: "text/plain",
      language: "plaintext",
      source: "registry",
    });
    expect(inferNewFileType("archive.abc")).toMatchObject({
      extension: "abc",
      mimeType: "text/plain",
      language: "text",
      source: "fallback",
    });
  });

  it("defaults to plain text metadata when no extension exists", () => {
    expect(inferNewFileType("untitled")).toMatchObject({
      extension: "txt",
      mimeType: "text/plain",
      language: "plaintext",
      source: "default",
    });
  });

  it("applies extension suggestions predictably", () => {
    expect(applySuggestedExtension("readme.md", "txt")).toBe("readme.txt");
    expect(applySuggestedExtension("new-file", "json")).toBe("new-file.json");
    expect(applySuggestedExtension("", "md")).toBe("untitled.md");
    expect(applySuggestedExtension("notes", ".ts")).toBe("notes.ts");
  });

  it("generates starter titles/content for markdown and code templates", () => {
    expect(toStarterTitle("my-new_note.md")).toBe("my new note");
    expect(getSuggestedStarterContent("my-new_note.md")).toBe("# my new note\n\n");
    expect(getSuggestedStarterContent("index.html")).toContain("<!doctype html>");
    expect(getSuggestedStarterContent("config.json")).toBe("{\n  \n}\n");
    expect(getSuggestedStarterContent("unknown.ext")).toBe("");
  });
});
