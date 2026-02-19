"use client";

/**
 * FILE TYPE REGISTRY
 *
 * Central registry for virtual-file capabilities:
 * extension -> mimeType -> language -> editorType.
 */

import type {
  FileTypeCapability,
  ProjectFile,
  ResolvedFileTypeCapability,
  TextEditorType,
} from "./finder-types";

export const FILE_TYPE_CAPABILITY_REGISTRY: Readonly<Record<string, FileTypeCapability>> = {
  md: {
    extension: "md",
    mimeType: "text/markdown",
    language: "markdown",
    editorType: "markdown",
  },
  mdx: {
    extension: "mdx",
    mimeType: "text/markdown",
    language: "markdown",
    editorType: "markdown",
  },
  txt: {
    extension: "txt",
    mimeType: "text/plain",
    language: "plaintext",
    editorType: "note",
  },
  html: {
    extension: "html",
    mimeType: "text/html",
    language: "html",
    editorType: "code",
  },
  css: {
    extension: "css",
    mimeType: "text/css",
    language: "css",
    editorType: "code",
  },
  js: {
    extension: "js",
    mimeType: "text/javascript",
    language: "javascript",
    editorType: "code",
  },
  jsx: {
    extension: "jsx",
    mimeType: "text/javascript",
    language: "javascript",
    editorType: "code",
  },
  ts: {
    extension: "ts",
    mimeType: "text/typescript",
    language: "typescript",
    editorType: "code",
  },
  tsx: {
    extension: "tsx",
    mimeType: "text/typescript",
    language: "typescript",
    editorType: "code",
  },
  json: {
    extension: "json",
    mimeType: "application/json",
    language: "json",
    editorType: "code",
  },
  yaml: {
    extension: "yaml",
    mimeType: "application/x-yaml",
    language: "yaml",
    editorType: "code",
  },
  yml: {
    extension: "yml",
    mimeType: "application/x-yaml",
    language: "yaml",
    editorType: "code",
  },
  xml: {
    extension: "xml",
    mimeType: "application/xml",
    language: "xml",
    editorType: "code",
  },
  sql: {
    extension: "sql",
    mimeType: "text/x-sql",
    language: "sql",
    editorType: "code",
  },
  sh: {
    extension: "sh",
    mimeType: "text/x-shellscript",
    language: "shell",
    editorType: "code",
  },
  py: {
    extension: "py",
    mimeType: "text/x-python",
    language: "python",
    editorType: "code",
  },
  csv: {
    extension: "csv",
    mimeType: "text/csv",
    language: "csv",
    editorType: "code",
  },
  toml: {
    extension: "toml",
    mimeType: "application/toml",
    language: "toml",
    editorType: "code",
  },
  env: {
    extension: "env",
    mimeType: "text/plain",
    language: "dotenv",
    editorType: "code",
  },
};

const MIME_TO_EDITOR: Readonly<Record<string, TextEditorType>> = {
  "text/markdown": "markdown",
  "text/plain": "note",
  "application/json": "code",
  "application/ld+json": "code",
  "text/javascript": "code",
  "application/javascript": "code",
  "text/typescript": "code",
  "application/x-typescript": "code",
  "text/html": "code",
  "text/css": "code",
  "application/x-yaml": "code",
  "text/yaml": "code",
  "application/xml": "code",
  "text/xml": "code",
  "text/x-sql": "code",
  "application/sql": "code",
  "text/csv": "code",
  "application/toml": "code",
  "text/x-python": "code",
  "text/x-shellscript": "code",
};

const LANGUAGE_TO_EDITOR: Readonly<Record<string, TextEditorType>> = {
  markdown: "markdown",
  mdx: "markdown",
  plaintext: "note",
  text: "note",
  json: "code",
  javascript: "code",
  typescript: "code",
  html: "code",
  css: "code",
  yaml: "code",
  yml: "code",
  xml: "code",
  sql: "code",
  shell: "code",
  bash: "code",
  sh: "code",
  python: "code",
  py: "code",
  csv: "code",
  toml: "code",
  dotenv: "code",
};

function normalizeMimeType(mimeType?: string): string {
  return (mimeType || "").trim().toLowerCase();
}

function normalizeLanguage(language?: string): string {
  return (language || "").trim().toLowerCase();
}

export function getNormalizedExtension(name: string): string | null {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return null;

  if (normalizedName === ".env" || normalizedName.startsWith(".env.")) {
    return "env";
  }

  const lastDot = normalizedName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === normalizedName.length - 1) {
    return null;
  }

  return normalizedName.slice(lastDot + 1);
}

function fallbackCapability(extension: string | null): ResolvedFileTypeCapability {
  const fallbackEditor: TextEditorType = extension === "txt" ? "note" : "code";

  return {
    extension: extension || "unknown",
    mimeType: "text/plain",
    language: fallbackEditor === "note" ? "plaintext" : "text",
    editorType: fallbackEditor,
    source: "fallback",
  };
}

export function resolveVirtualFileType(file: ProjectFile): ResolvedFileTypeCapability {
  const extension = getNormalizedExtension(file.name);
  const mimeType = normalizeMimeType(file.mimeType);
  const language = normalizeLanguage(file.language);

  if (extension) {
    const byExtension = FILE_TYPE_CAPABILITY_REGISTRY[extension];
    if (byExtension) {
      return {
        ...byExtension,
        source: "extension",
      };
    }
  }

  if (mimeType) {
    const editorType = MIME_TO_EDITOR[mimeType];
    if (editorType) {
      return {
        extension: extension || "unknown",
        mimeType,
        language: language || (editorType === "markdown" ? "markdown" : "text"),
        editorType,
        source: "mime",
      };
    }
  }

  if (language) {
    const editorType = LANGUAGE_TO_EDITOR[language];
    if (editorType) {
      return {
        extension: extension || "unknown",
        mimeType: mimeType || "text/plain",
        language,
        editorType,
        source: "language",
      };
    }
  }

  return fallbackCapability(extension);
}

