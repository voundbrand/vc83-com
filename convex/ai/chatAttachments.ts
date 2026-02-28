import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "../_generated/server";
import { getUserContext, requireAuthenticatedUser } from "../rbacHelpers";

const MAX_CHAT_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_ATTACHMENTS_PER_MESSAGE = 8;
const DEFAULT_ATTACHMENT_CLEANUP_BATCH_LIMIT = 100;
const UPLOADED_RETENTION_MS = 60 * 60 * 1000; // 1 hour
const ORPHANED_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours
const LINKED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const ATTACHMENT_RETENTION_RULES = [
  {
    status: "uploaded" as const,
    retentionMs: UPLOADED_RETENTION_MS,
  },
  {
    status: "orphaned" as const,
    retentionMs: ORPHANED_RETENTION_MS,
  },
  {
    status: "linked" as const,
    retentionMs: LINKED_RETENTION_MS,
  },
];

type AttachmentStatus = (typeof ATTACHMENT_RETENTION_RULES)[number]["status"];

type AttachmentStatusCounts = Record<AttachmentStatus, number>;

function createStatusCounts(): AttachmentStatusCounts {
  return {
    uploaded: 0,
    orphaned: 0,
    linked: 0,
  };
}

function normalizeCleanupLimit(limit?: number): number {
  if (!Number.isFinite(limit)) {
    return DEFAULT_ATTACHMENT_CLEANUP_BATCH_LIMIT;
  }

  const rounded = Math.floor(Number(limit));
  if (rounded < 1) {
    return 1;
  }

  if (rounded > DEFAULT_ATTACHMENT_CLEANUP_BATCH_LIMIT) {
    return DEFAULT_ATTACHMENT_CLEANUP_BATCH_LIMIT;
  }

  return rounded;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}

function isNotFoundError(error: unknown): boolean {
  const normalized = normalizeErrorMessage(error).toLowerCase();
  return (
    normalized.includes("not found") ||
    normalized.includes("does not exist") ||
    normalized.includes("missing")
  );
}

interface CleanupCandidate {
  _id: Id<"aiMessageAttachments">;
  storageId: Id<"_storage">;
  status: AttachmentStatus;
  updatedAt: number;
}

interface CleanupBatchResult {
  batchLimit: number;
  scanned: number;
  deleted: number;
  skipped: number;
  errors: number;
  scannedByStatus: AttachmentStatusCounts;
  deletedByStatus: AttachmentStatusCounts;
}

async function collectCleanupCandidates(
  ctx: MutationCtx,
  now: number,
  batchLimit: number
): Promise<CleanupCandidate[]> {
  const candidates: CleanupCandidate[] = [];

  for (const rule of ATTACHMENT_RETENTION_RULES) {
    const remaining = batchLimit - candidates.length;
    if (remaining <= 0) {
      break;
    }

    const cutoff = now - rule.retentionMs;
    const rows = await ctx.db
      .query("aiMessageAttachments")
      .withIndex("by_status_updated_at", (q) => q.eq("status", rule.status).lt("updatedAt", cutoff))
      .take(remaining);

    for (const row of rows) {
      candidates.push({
        _id: row._id,
        storageId: row.storageId,
        status: row.status,
        updatedAt: row.updatedAt,
      });
    }
  }

  return candidates;
}

async function runRetentionCleanupBatch(
  ctx: MutationCtx,
  options?: { limit?: number }
): Promise<CleanupBatchResult> {
  const now = Date.now();
  const batchLimit = normalizeCleanupLimit(options?.limit);
  const scannedByStatus = createStatusCounts();
  const deletedByStatus = createStatusCounts();
  let scanned = 0;
  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  const candidates = await collectCleanupCandidates(ctx, now, batchLimit);

  for (const candidate of candidates) {
    scanned += 1;
    scannedByStatus[candidate.status] += 1;

    const current = await ctx.db.get(candidate._id);
    if (!current) {
      skipped += 1;
      continue;
    }

    const matchingRule = ATTACHMENT_RETENTION_RULES.find((rule) => rule.status === current.status);
    if (!matchingRule) {
      skipped += 1;
      continue;
    }

    const retentionCutoff = now - matchingRule.retentionMs;
    if (current.updatedAt >= retentionCutoff) {
      skipped += 1;
      continue;
    }

    try {
      await ctx.storage.delete(current.storageId);
    } catch (error) {
      if (!isNotFoundError(error)) {
        errors += 1;
        console.error("[ChatAttachments] Failed to delete attachment storage blob", {
          attachmentId: current._id,
          storageId: current.storageId,
          status: current.status,
          error: normalizeErrorMessage(error),
        });
        continue;
      }
    }

    try {
      await ctx.db.delete(current._id);
      deleted += 1;
      deletedByStatus[current.status] += 1;
    } catch (error) {
      if (isNotFoundError(error)) {
        skipped += 1;
        continue;
      }

      errors += 1;
      console.error("[ChatAttachments] Failed to delete attachment metadata row", {
        attachmentId: current._id,
        storageId: current.storageId,
        status: current.status,
        error: normalizeErrorMessage(error),
      });
    }
  }

  return {
    batchLimit,
    scanned,
    deleted,
    skipped,
    errors,
    scannedByStatus,
    deletedByStatus,
  };
}

function normalizeNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateImageMimeType(mimeType: string): void {
  const normalizedMimeType = mimeType.trim().toLowerCase();
  if (!normalizedMimeType.startsWith("image/")) {
    throw new Error("Only image attachments are supported in chat.");
  }
}

function validateAttachmentSize(sizeBytes: number): void {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    throw new Error("Attachment size must be greater than zero.");
  }
  if (sizeBytes > MAX_CHAT_IMAGE_BYTES) {
    throw new Error("Image attachment exceeds the 20MB upload limit.");
  }
}

function dedupeAttachmentIds<T>(ids: T[]): T[] {
  return Array.from(new Set(ids));
}

export const generateUploadUrl = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const fileName = normalizeNonEmptyString(args.fileName);
    if (!fileName) {
      throw new Error("Attachment file name is required.");
    }

    const mimeType = normalizeNonEmptyString(args.mimeType);
    if (!mimeType) {
      throw new Error("Attachment MIME type is required.");
    }

    validateImageMimeType(mimeType);
    validateAttachmentSize(args.sizeBytes);

    return await ctx.storage.generateUploadUrl();
  },
});

export const saveUploadedAttachment = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    conversationId: v.optional(v.id("aiConversations")),
  },
  handler: async (ctx, args) => {
    const fileName = normalizeNonEmptyString(args.fileName);
    if (!fileName) {
      throw new Error("Attachment file name is required.");
    }

    const mimeType = normalizeNonEmptyString(args.mimeType);
    if (!mimeType) {
      throw new Error("Attachment MIME type is required.");
    }

    validateImageMimeType(mimeType);
    validateAttachmentSize(args.sizeBytes);

    const now = Date.now();
    const attachmentId = await ctx.db.insert("aiMessageAttachments", {
      organizationId: args.organizationId,
      userId: args.userId,
      conversationId: args.conversationId,
      messageId: undefined,
      kind: "image",
      storageId: args.storageId,
      fileName,
      mimeType,
      sizeBytes: Math.round(args.sizeBytes),
      width:
        typeof args.width === "number" && Number.isFinite(args.width) && args.width > 0
          ? Math.round(args.width)
          : undefined,
      height:
        typeof args.height === "number" && Number.isFinite(args.height) && args.height > 0
          ? Math.round(args.height)
          : undefined,
      status: "uploaded",
      createdAt: now,
      updatedAt: now,
    });

    const url = await ctx.storage.getUrl(args.storageId);
    return {
      attachmentId,
      kind: "image" as const,
      storageId: args.storageId,
      fileName,
      mimeType,
      sizeBytes: Math.round(args.sizeBytes),
      width:
        typeof args.width === "number" && Number.isFinite(args.width) && args.width > 0
          ? Math.round(args.width)
          : undefined,
      height:
        typeof args.height === "number" && Number.isFinite(args.height) && args.height > 0
          ? Math.round(args.height)
          : undefined,
      url: url ?? undefined,
    };
  },
});

export const resolveSendAttachments = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    attachmentIds: v.array(v.id("aiMessageAttachments")),
  },
  handler: async (ctx, args) => {
    const attachmentIds = dedupeAttachmentIds(args.attachmentIds);
    if (attachmentIds.length === 0) {
      return [];
    }
    if (attachmentIds.length > MAX_ATTACHMENTS_PER_MESSAGE) {
      throw new Error(`A maximum of ${MAX_ATTACHMENTS_PER_MESSAGE} image attachments is allowed per message.`);
    }

    const resolved: Array<{
      attachmentId: typeof attachmentIds[number];
      kind: "image";
      storageId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      width?: number;
      height?: number;
      url: string;
    }> = [];

    for (const attachmentId of attachmentIds) {
      const attachment = await ctx.db.get(attachmentId);
      if (!attachment) {
        throw new Error("One or more attachments no longer exist. Reattach and retry.");
      }

      if (attachment.organizationId !== args.organizationId || attachment.userId !== args.userId) {
        throw new Error("Attachment does not belong to this user or organization.");
      }

      if (attachment.kind !== "image") {
        throw new Error("Unsupported attachment kind.");
      }

      const url = await ctx.storage.getUrl(attachment.storageId);
      if (!url) {
        throw new Error(`Attachment "${attachment.fileName}" is no longer available.`);
      }

      resolved.push({
        attachmentId,
        kind: "image",
        storageId: String(attachment.storageId),
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        width: attachment.width,
        height: attachment.height,
        url,
      });
    }

    return resolved;
  },
});

export const getSignedAttachmentUrls = query({
  args: {
    attachmentIds: v.array(v.id("aiMessageAttachments")),
  },
  handler: async (ctx, args) => {
    const attachmentIds = dedupeAttachmentIds(args.attachmentIds);
    const records: Array<{
      attachmentId: typeof attachmentIds[number];
      url?: string;
    }> = [];

    for (const attachmentId of attachmentIds) {
      const attachment = await ctx.db.get(attachmentId);
      if (!attachment) {
        records.push({ attachmentId });
        continue;
      }
      const url = await ctx.storage.getUrl(attachment.storageId);
      records.push({
        attachmentId,
        url: url ?? undefined,
      });
    }

    return records;
  },
});

export const linkAttachmentsToMessage = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    conversationId: v.id("aiConversations"),
    messageId: v.id("aiMessages"),
    attachmentIds: v.array(v.id("aiMessageAttachments")),
  },
  handler: async (ctx, args) => {
    const attachmentIds = dedupeAttachmentIds(args.attachmentIds);
    const now = Date.now();

    for (const attachmentId of attachmentIds) {
      const attachment = await ctx.db.get(attachmentId);
      if (!attachment) {
        continue;
      }

      if (attachment.organizationId !== args.organizationId || attachment.userId !== args.userId) {
        throw new Error("Attachment ownership mismatch while linking message attachments.");
      }

      if (attachment.messageId && attachment.messageId !== args.messageId) {
        throw new Error("Attachment is already linked to another message.");
      }

      await ctx.db.patch(attachmentId, {
        conversationId: args.conversationId,
        messageId: args.messageId,
        status: "linked",
        updatedAt: now,
      });
    }

    return {
      linkedCount: attachmentIds.length,
    };
  },
});

export const cleanupExpiredAttachments = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await runRetentionCleanupBatch(ctx, { limit: args.limit });
  },
});

export const runAttachmentRetentionCleanup = mutation({
  args: {
    sessionId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthenticatedUser(ctx, args.sessionId);
    const userContext = await getUserContext(ctx, userId);

    if (!userContext.isGlobal || userContext.roleName !== "super_admin") {
      throw new Error("Super admin only");
    }

    return await runRetentionCleanupBatch(ctx, { limit: args.limit });
  },
});
