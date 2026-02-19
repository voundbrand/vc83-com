"use client";

/**
 * NEW FILE FLOW HELPERS
 *
 * Shared inference + starter-content helpers used by Finder's "New File" flow.
 */

import { FILE_TYPE_CAPABILITY_REGISTRY, getNormalizedExtension } from "./file-type-registry";

export const FILE_EXTENSION_SUGGESTIONS = ["md", "txt", "ts", "tsx", "js", "json", "html", "css", "xml", "py"];

export interface InferredNewFileType {
  extension: string;
  mimeType: string;
  language: string;
  source: "default" | "registry" | "fallback";
}

export function inferNewFileType(fileName: string): InferredNewFileType {
  const extension = getNormalizedExtension(fileName.trim());

  if (!extension) {
    return {
      extension: "txt",
      mimeType: "text/plain",
      language: "plaintext",
      source: "default",
    };
  }

  const knownCapability = FILE_TYPE_CAPABILITY_REGISTRY[extension];
  if (knownCapability) {
    return {
      extension: knownCapability.extension,
      mimeType: knownCapability.mimeType,
      language: knownCapability.language,
      source: "registry",
    };
  }

  return {
    extension,
    mimeType: "text/plain",
    language: "text",
    source: "fallback",
  };
}

export function applySuggestedExtension(fileName: string, suggestedExtension: string): string {
  const normalizedSuggested = suggestedExtension.trim().replace(/^\.+/, "").toLowerCase();
  const current = fileName.trim() || "untitled";
  if (!normalizedSuggested) return current;

  const currentExtension = getNormalizedExtension(current);
  if (currentExtension) {
    const dotIndex = current.lastIndexOf(".");
    const baseName = current.slice(0, dotIndex);
    return `${baseName}.${normalizedSuggested}`;
  }

  return `${current}.${normalizedSuggested}`;
}

export function toStarterTitle(fileName: string): string {
  const trimmed = fileName.trim();
  const lastDot = trimmed.lastIndexOf(".");
  const baseName = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  const normalized = baseName.replace(/[-_]+/g, " ").trim();
  return normalized || "Untitled";
}

export function getSuggestedStarterContent(fileName: string): string {
  const extension = getNormalizedExtension(fileName.trim());

  switch (extension) {
    case "md":
    case "mdx":
      return `# ${toStarterTitle(fileName)}\n\n`;
    case "html":
      return "<!doctype html>\n<html>\n  <head>\n    <meta charset=\"UTF-8\" />\n    <title>Document</title>\n  </head>\n  <body>\n  </body>\n</html>\n";
    case "css":
      return "/* Styles */\n";
    case "json":
      return "{\n  \n}\n";
    case "yaml":
    case "yml":
      return "# key: value\n";
    case "xml":
      return "<root>\n</root>\n";
    case "ts":
      return "export function main(): void {\n  // TODO\n}\n";
    case "tsx":
      return "export function Component() {\n  return <div>Hello</div>;\n}\n";
    case "js":
      return "function main() {\n  // TODO\n}\n";
    case "jsx":
      return "export function Component() {\n  return <div>Hello</div>;\n}\n";
    case "py":
      return "def main() -> None:\n    pass\n";
    case "sh":
      return "#!/usr/bin/env bash\nset -euo pipefail\n";
    case "sql":
      return "SELECT 1;\n";
    default:
      return "";
  }
}
