type ExtensionMetadata = {
  mimeType: string;
  language: string;
};

const EXTENSION_METADATA_REGISTRY: Readonly<Record<string, ExtensionMetadata>> = {
  md: { mimeType: "text/markdown", language: "markdown" },
  mdx: { mimeType: "text/markdown", language: "markdown" },
  txt: { mimeType: "text/plain", language: "plaintext" },
  html: { mimeType: "text/html", language: "html" },
  css: { mimeType: "text/css", language: "css" },
  js: { mimeType: "text/javascript", language: "javascript" },
  jsx: { mimeType: "text/javascript", language: "javascript" },
  ts: { mimeType: "text/typescript", language: "typescript" },
  tsx: { mimeType: "text/typescript", language: "typescript" },
  json: { mimeType: "application/json", language: "json" },
  yaml: { mimeType: "application/x-yaml", language: "yaml" },
  yml: { mimeType: "application/x-yaml", language: "yaml" },
  xml: { mimeType: "application/xml", language: "xml" },
  sql: { mimeType: "text/x-sql", language: "sql" },
  sh: { mimeType: "text/x-shellscript", language: "shell" },
  py: { mimeType: "text/x-python", language: "python" },
  csv: { mimeType: "text/csv", language: "csv" },
  toml: { mimeType: "application/toml", language: "toml" },
  env: { mimeType: "text/plain", language: "dotenv" },
};

const MIME_LANGUAGE_HINTS: Readonly<Record<string, string>> = {
  "text/markdown": "markdown",
  "text/plain": "text",
  "application/json": "json",
  "application/ld+json": "json",
  "text/javascript": "javascript",
  "application/javascript": "javascript",
  "text/typescript": "typescript",
  "application/x-typescript": "typescript",
  "text/html": "html",
  "text/css": "css",
  "application/x-yaml": "yaml",
  "text/yaml": "yaml",
  "application/xml": "xml",
  "text/xml": "xml",
  "text/x-sql": "sql",
  "application/sql": "sql",
  "text/x-shellscript": "shell",
  "text/x-python": "python",
  "text/csv": "csv",
  "application/toml": "toml",
};

const LANGUAGE_MIME_HINTS: Readonly<Record<string, string>> = {
  markdown: "text/markdown",
  mdx: "text/markdown",
  plaintext: "text/plain",
  text: "text/plain",
  json: "application/json",
  javascript: "text/javascript",
  js: "text/javascript",
  typescript: "text/typescript",
  ts: "text/typescript",
  html: "text/html",
  css: "text/css",
  yaml: "application/x-yaml",
  yml: "application/x-yaml",
  xml: "application/xml",
  sql: "text/x-sql",
  shell: "text/x-shellscript",
  sh: "text/x-shellscript",
  python: "text/x-python",
  py: "text/x-python",
  csv: "text/csv",
  toml: "application/toml",
  dotenv: "text/plain",
};

const SAFE_MIME_TYPE_PATTERN = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/;
const SAFE_LANGUAGE_PATTERN = /^[a-z0-9][a-z0-9_+.-]{0,49}$/;
const INVALID_FILE_NAME_PATTERN = /[\/\\\u0000-\u001f]/;
const MAX_FILE_NAME_LENGTH = 255;

export type VirtualFileMetadataSource =
  | "extension"
  | "provided"
  | "fallback"
  | "legacy_default";

export interface VirtualFileMetadataInput {
  name: string;
  mimeType?: string;
  language?: string;
}

export interface VirtualFileMetadataOptions {
  preferLegacyMarkdownDefault?: boolean;
}

export interface ResolvedVirtualFileMetadata {
  extension: string | null;
  mimeType: string;
  language: string;
  source: VirtualFileMetadataSource;
}

export function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeVirtualFileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("File name is required");
  }
  if (trimmed === "." || trimmed === "..") {
    throw new Error("Invalid file name");
  }
  if (trimmed.length > MAX_FILE_NAME_LENGTH) {
    throw new Error(`File name exceeds ${MAX_FILE_NAME_LENGTH} characters`);
  }
  if (INVALID_FILE_NAME_PATTERN.test(trimmed)) {
    throw new Error("File name contains unsupported characters");
  }
  return trimmed;
}

export function getNormalizedVirtualFileExtension(name: string): string | null {
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

export function normalizeMimeTypeValue(mimeType?: string): string | undefined {
  if (!hasNonEmptyString(mimeType)) return undefined;
  const candidate = mimeType.trim().toLowerCase().split(";")[0]?.trim();
  if (!candidate) return undefined;
  if (!SAFE_MIME_TYPE_PATTERN.test(candidate)) return undefined;
  return candidate;
}

export function normalizeLanguageValue(language?: string): string | undefined {
  if (!hasNonEmptyString(language)) return undefined;
  const candidate = language.trim().toLowerCase();
  if (!SAFE_LANGUAGE_PATTERN.test(candidate)) return undefined;
  return candidate;
}

function inferLanguageFromMimeType(mimeType: string): string | undefined {
  const direct = MIME_LANGUAGE_HINTS[mimeType];
  if (direct) return direct;
  if (mimeType.startsWith("text/")) return "text";
  return undefined;
}

function inferMimeTypeFromLanguage(language: string): string | undefined {
  return LANGUAGE_MIME_HINTS[language];
}

export function deriveVirtualFileMetadata(
  input: VirtualFileMetadataInput,
  options: VirtualFileMetadataOptions = {}
): ResolvedVirtualFileMetadata {
  const extension = getNormalizedVirtualFileExtension(input.name);
  const extensionMetadata = extension
    ? EXTENSION_METADATA_REGISTRY[extension]
    : undefined;
  if (extensionMetadata) {
    return {
      extension,
      mimeType: extensionMetadata.mimeType,
      language: extensionMetadata.language,
      source: "extension",
    };
  }

  const normalizedMimeType = normalizeMimeTypeValue(input.mimeType);
  const normalizedLanguage = normalizeLanguageValue(input.language);
  if (normalizedMimeType || normalizedLanguage) {
    const mimeType =
      normalizedMimeType ||
      (normalizedLanguage
        ? inferMimeTypeFromLanguage(normalizedLanguage)
        : undefined) ||
      "text/plain";
    const language =
      normalizedLanguage ||
      inferLanguageFromMimeType(mimeType) ||
      (extension === "txt" ? "plaintext" : "text");
    return {
      extension,
      mimeType,
      language,
      source: "provided",
    };
  }

  if (!extension && options.preferLegacyMarkdownDefault) {
    return {
      extension: null,
      mimeType: "text/markdown",
      language: "markdown",
      source: "legacy_default",
    };
  }

  return {
    extension,
    mimeType: "text/plain",
    language: extension === "txt" ? "plaintext" : "text",
    source: "fallback",
  };
}
