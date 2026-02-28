import type { ToolExecutionContext } from "../registry";
import { shouldRestrictToolsToReadOnly } from "../../autonomy";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../../_generated/api");

type TranscriptSaveSource = "audio" | "youtube_captions" | "youtube_audio";

interface SaveTranscriptToUserFilesArgs {
  transcript: string;
  source: TranscriptSaveSource;
  title?: string;
  language?: string | null;
  parentPath?: string;
  fileName?: string;
  overwrite?: boolean;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export interface TranscriptFileSaveResult {
  saved: boolean;
  fileId?: string;
  path?: string;
  parentPath?: string;
  name?: string;
  overwritten?: boolean;
  error?: string;
}

function canPersistTranscriptForContext(
  ctx: ToolExecutionContext
): { allowed: boolean; reason?: string } {
  if (shouldRestrictToolsToReadOnly(ctx.runtimePolicy?.codeExecution?.autonomyLevel)) {
    return {
      allowed: false,
      reason:
        "Transcript saving is disabled in read-only autonomy mode. Ask for write-enabled execution or save manually.",
    };
  }

  if (ctx.runtimePolicy?.mutationAuthority?.mutatingToolExecutionAllowed === false) {
    const invariantSummary = Array.isArray(
      ctx.runtimePolicy.mutationAuthority.invariantViolations
    )
      ? ctx.runtimePolicy.mutationAuthority.invariantViolations.join(", ")
      : "unknown_violation";
    return {
      allowed: false,
      reason:
        `Transcript saving is blocked by runtime mutation authority invariants (${invariantSummary}).`,
    };
  }

  return { allowed: true };
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePath(path: string | undefined): string {
  const value = normalizeOptionalString(path) || "/";
  if (value === "/") {
    return "/";
  }
  return value.startsWith("/") ? value : `/${value}`;
}

function defaultTranscriptFileName(args: {
  source: TranscriptSaveSource;
  timestamp: number;
}): string {
  const stamp = new Date(args.timestamp)
    .toISOString()
    .replace(/[:.]/g, "-");
  return `transcript-${args.source}-${stamp}.md`;
}

function buildTranscriptMarkdown(args: {
  transcript: string;
  source: TranscriptSaveSource;
  title?: string;
  language?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}): string {
  const lines: string[] = [];
  lines.push(`# Transcript (${args.source})`);
  if (args.title) {
    lines.push(`- Title: ${args.title}`);
  }
  if (args.language) {
    lines.push(`- Language: ${args.language}`);
  }
  lines.push(`- Saved at: ${new Date().toISOString()}`);

  const metadataEntries = Object.entries(args.metadata || {}).filter(
    ([, value]) => value !== undefined
  );
  for (const [key, value] of metadataEntries) {
    lines.push(`- ${key}: ${value === null ? "null" : String(value)}`);
  }

  lines.push("");
  lines.push("## Transcript");
  lines.push("");
  lines.push(args.transcript);

  return lines.join("\n");
}

export async function saveTranscriptToUserFiles(
  ctx: ToolExecutionContext,
  args: SaveTranscriptToUserFilesArgs
): Promise<TranscriptFileSaveResult> {
  const transcript = normalizeOptionalString(args.transcript);
  if (!transcript) {
    return {
      saved: false,
      error: "Empty transcript cannot be saved.",
    };
  }

  const permission = canPersistTranscriptForContext(ctx);
  if (!permission.allowed) {
    return {
      saved: false,
      error: permission.reason,
    };
  }

  const now = Date.now();
  const parentPath = normalizePath(args.parentPath);
  const fileName =
    normalizeOptionalString(args.fileName)
    || defaultTranscriptFileName({ source: args.source, timestamp: now });
  const content = buildTranscriptMarkdown({
    transcript,
    source: args.source,
    title: normalizeOptionalString(args.title) || undefined,
    language: normalizeOptionalString(args.language) || undefined,
    metadata: args.metadata,
  });

  try {
    const result = await (ctx as any).runMutation(
      generatedApi.internal.projectFileSystem.upsertVirtualFileInternal,
      {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        parentPath,
        name: fileName,
        content,
        mimeType: "text/markdown",
        language: "markdown",
        overwrite: args.overwrite === true,
      }
    ) as {
      fileId: string;
      path: string;
      parentPath: string;
      name: string;
      overwritten: boolean;
    };

    return {
      saved: true,
      fileId: result.fileId,
      path: result.path,
      parentPath: result.parentPath,
      name: result.name,
      overwritten: result.overwritten,
    };
  } catch (error) {
    return {
      saved: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
