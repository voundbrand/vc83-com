import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  CmsContentCompilerError,
  normalizeCmsPath,
  type CmsContentDocumentInput,
  type CmsContentEditIntent,
} from "./contentEditContracts";
import {
  compileCmsContentEditIntent,
  type CmsContentCompileResult,
} from "./contentEditCompiler";
import {
  buildCmsContentChangeManifest,
  type CmsContentChangeManifest,
} from "./contentDiffManifest";

export async function loadCmsContentDocumentsFromRepo(args: {
  repoRoot: string;
  targetAppPath: string;
  contentSubdirectory?: string;
}): Promise<CmsContentDocumentInput[]> {
  const repoRoot = path.resolve(args.repoRoot);
  const normalizedAppPath = normalizeCmsPath(args.targetAppPath);
  const contentSubdirectory = args.contentSubdirectory || "content";
  const contentDirectoryAbsolute = path.resolve(
    repoRoot,
    normalizedAppPath,
    contentSubdirectory
  );

  assertPathWithinRepo(repoRoot, contentDirectoryAbsolute);

  let entries: string[];
  try {
    entries = await walkJsonFiles(contentDirectoryAbsolute);
  } catch (error) {
    throw new CmsContentCompilerError(
      "invalid_target",
      `Unable to load content directory: ${normalizedAppPath}/${contentSubdirectory}`,
      {
        cause: error instanceof Error ? error.message : String(error),
      }
    );
  }

  if (entries.length === 0) {
    throw new CmsContentCompilerError(
      "invalid_target",
      `No JSON content files found under ${normalizedAppPath}/${contentSubdirectory}`
    );
  }

  const documents: CmsContentDocumentInput[] = [];
  for (const absoluteFilePath of entries) {
    const raw = await fs.readFile(absoluteFilePath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new CmsContentCompilerError(
        "invalid_target",
        `Invalid JSON content file: ${absoluteFilePath}`,
        {
          cause: error instanceof Error ? error.message : String(error),
        }
      );
    }

    if (!isRecord(parsed)) {
      throw new CmsContentCompilerError(
        "invalid_target",
        `Content file must be a JSON object: ${absoluteFilePath}`
      );
    }

    documents.push({
      filePath: normalizeCmsPath(path.relative(repoRoot, absoluteFilePath)),
      content: parsed as Record<string, any>,
    });
  }

  documents.sort((a, b) => a.filePath.localeCompare(b.filePath));
  return documents;
}

export async function compileCmsContentEditIntentFromRepo(args: {
  repoRoot: string;
  intent: CmsContentEditIntent;
  contentSubdirectory?: string;
}): Promise<{
  documents: CmsContentDocumentInput[];
  compileResult: CmsContentCompileResult;
}> {
  const documents = await loadCmsContentDocumentsFromRepo({
    repoRoot: args.repoRoot,
    targetAppPath: args.intent.targetAppPath,
    contentSubdirectory: args.contentSubdirectory,
  });

  const compileResult = compileCmsContentEditIntent(args.intent, documents);
  return {
    documents,
    compileResult,
  };
}

export async function compileCmsContentIntentWithManifestFromRepo(args: {
  repoRoot: string;
  intent: CmsContentEditIntent;
  contentSubdirectory?: string;
}): Promise<{
  documents: CmsContentDocumentInput[];
  compileResult: CmsContentCompileResult;
  changeManifest: CmsContentChangeManifest;
}> {
  const { documents, compileResult } = await compileCmsContentEditIntentFromRepo(args);
  const changeManifest = buildCmsContentChangeManifest({
    compileResult,
    beforeDocuments: documents,
  });
  return {
    documents,
    compileResult,
    changeManifest,
  };
}

async function walkJsonFiles(rootDirectory: string): Promise<string[]> {
  const jsonFiles: string[] = [];
  const pending: string[] = [rootDirectory];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) {
      continue;
    }
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(absolute);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".json")) {
        jsonFiles.push(absolute);
      }
    }
  }

  return jsonFiles.sort((a, b) => a.localeCompare(b));
}

function assertPathWithinRepo(repoRoot: string, absolutePath: string): void {
  const relative = path.relative(repoRoot, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new CmsContentCompilerError(
      "invalid_target",
      `Path resolves outside repository root: ${absolutePath}`
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
