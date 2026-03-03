import type { AITool, ToolExecutionContext } from "./registry";
import { shouldRestrictToolsToReadOnly } from "../autonomy";
import { buildDocxBytes, type DocxSection } from "./shared/docxBuilder";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../../_generated/api");

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function normalizeOptionalString(value: unknown, maxLength = 2000): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.slice(0, maxLength);
}

function normalizeStringArray(value: unknown, maxItems = 20, maxLength = 280): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized: string[] = [];
  for (const entry of value) {
    const parsed = normalizeOptionalString(entry, maxLength);
    if (!parsed) {
      continue;
    }
    normalized.push(parsed);
    if (normalized.length >= maxItems) {
      break;
    }
  }
  return normalized;
}

function normalizeSections(value: unknown): DocxSection[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized: DocxSection[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const heading = normalizeOptionalString(record.heading, 240);
    const body = normalizeStringArray(record.paragraphs, 24, 4000);
    if (!heading && body.length === 0) {
      continue;
    }
    normalized.push({
      heading,
      paragraphs: body,
    });
    if (normalized.length >= 24) {
      break;
    }
  }
  return normalized;
}

function resolveDocxFileName(value: unknown): string {
  const normalized = normalizeOptionalString(value, 180) || `document-${Date.now()}`;
  const safe = normalized
    .replace(/[\/\\:\*\?"<>\|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!safe) {
    return "document.docx";
  }
  return safe.toLowerCase().endsWith(".docx") ? safe : `${safe}.docx`;
}

function canPersistDocxForContext(
  ctx: ToolExecutionContext
): { allowed: boolean; reason?: string; reasonCode?: string } {
  if (shouldRestrictToolsToReadOnly(ctx.runtimePolicy?.codeExecution?.autonomyLevel)) {
    return {
      allowed: false,
      reasonCode: "read_only_autonomy",
      reason:
        "DOCX creation is disabled in read-only autonomy mode. Use write-enabled execution to generate files.",
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
      reasonCode: "mutation_authority_blocked",
      reason:
        `DOCX creation is blocked by runtime mutation authority invariants (${invariantSummary}).`,
    };
  }
  return { allowed: true };
}

export const createDocxDocumentTool: AITool = {
  name: "create_docx_document",
  description:
    "Create a real .docx document in backend storage and optionally register it in the media library. Use for polished deliverables, reports, handoffs, and client-ready Word files.",
  status: "ready",
  parameters: {
    type: "object",
    properties: {
      fileName: {
        type: "string",
        description: "Target file name. '.docx' is added automatically when omitted.",
      },
      title: {
        type: "string",
        description: "Document title.",
      },
      subtitle: {
        type: "string",
        description: "Optional subtitle below title.",
      },
      content: {
        type: "string",
        description: "Fallback body content as one paragraph when sections are omitted.",
      },
      sections: {
        type: "array",
        description: "Ordered document sections with heading and paragraphs.",
        items: {
          type: "object",
          properties: {
            heading: { type: "string" },
            paragraphs: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      folder: {
        type: "string",
        description: "Optional media folder label.",
      },
      description: {
        type: "string",
        description: "Optional media description.",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Optional media tags.",
      },
      saveToMediaLibrary: {
        type: "boolean",
        description: "When true (default), create a media library entry.",
      },
    },
    required: ["fileName"],
  },
  execute: async (ctx: ToolExecutionContext, args: Record<string, unknown>) => {
    const permission = canPersistDocxForContext(ctx);
    if (!permission.allowed) {
      return {
        success: false,
        errorCode: permission.reasonCode,
        message: permission.reason,
      };
    }

    const fileName = resolveDocxFileName(args.fileName);
    const title = normalizeOptionalString(args.title, 240);
    const subtitle = normalizeOptionalString(args.subtitle, 360);
    const sections = normalizeSections(args.sections);
    const fallbackContent = normalizeOptionalString(args.content, 6000);

    const finalSections =
      sections.length > 0
        ? sections
        : fallbackContent
          ? [{ paragraphs: [fallbackContent] }]
          : [];

    if (!title && finalSections.length === 0) {
      return {
        success: false,
        errorCode: "missing_document_content",
        message:
          "DOCX creation requires at least one of: title, content, or a non-empty sections array.",
      };
    }

    const bytes = buildDocxBytes({
      title,
      subtitle,
      sections: finalSections,
    });

    const docxArrayBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    ) as ArrayBuffer;
    const storageId = await ctx.storage.store(
      new Blob([docxArrayBuffer], { type: DOCX_MIME_TYPE })
    );
    const downloadUrl = await ctx.storage.getUrl(storageId);

    const saveToMediaLibrary = args.saveToMediaLibrary !== false;
    let mediaId: string | undefined;
    if (saveToMediaLibrary) {
      const mediaEntry = await (ctx as any).runMutation(
        generatedApi.internal.ai.tools.internalToolMutations.internalCreateMediaEntry,
        {
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          fileName,
          fileType: "document",
          mimeType: DOCX_MIME_TYPE,
          size: bytes.byteLength,
          folder: normalizeOptionalString(args.folder, 120),
          description: normalizeOptionalString(args.description, 800),
          tags: normalizeStringArray(args.tags, 24, 80),
          storageId: String(storageId),
          url: downloadUrl || undefined,
        }
      ) as { mediaId?: string };
      mediaId = normalizeOptionalString(mediaEntry?.mediaId, 128);
    }

    return {
      success: true,
      fileName,
      mimeType: DOCX_MIME_TYPE,
      bytes: bytes.byteLength,
      storageId: String(storageId),
      downloadUrl: downloadUrl || null,
      mediaId: mediaId || null,
      sections: finalSections.length,
      title: title || null,
    };
  },
};
