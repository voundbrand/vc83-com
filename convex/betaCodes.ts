import { ConvexError, v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { checkPermission, requireAuthenticatedUser } from "./rbacHelpers";
const generatedApi: any = require("./_generated/api");

type BetaCodeDoc = {
  _id: Id<"betaActivationCodes">;
  code: string;
  codeKey: string;
  channelTag?: string;
  sourceDetail?: string;
  notes?: string;
  maxUses: number;
  currentUses: number;
  expiresAt?: number;
  status: "active" | "redeemed" | "expired" | "deactivated";
  createdByUserId?: Id<"users">;
  deactivatedByUserId?: Id<"users">;
  deactivatedAt?: number;
  createdAt: number;
  updatedAt: number;
};

type BetaCodeValidationReason =
  | "valid"
  | "invalid_format"
  | "not_found"
  | "deactivated"
  | "expired"
  | "exhausted"
  | "already_redeemed";

const betaCodeStatusValidator = v.union(
  v.literal("active"),
  v.literal("redeemed"),
  v.literal("expired"),
  v.literal("deactivated"),
);

const BETA_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const BETA_PREFIX_PATTERN = /^[A-Z0-9-]+$/;

function normalizeOptionalText(value?: string | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function mapRedemptionChannelToFunnelChannel(
  value?: string
):
  | "webchat"
  | "native_guest"
  | "telegram"
  | "whatsapp"
  | "slack"
  | "sms"
  | "platform_web"
  | "unknown" {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (!normalized) {
    return "unknown";
  }
  if (normalized.includes("telegram")) return "telegram";
  if (normalized.includes("whatsapp")) return "whatsapp";
  if (normalized.includes("slack")) return "slack";
  if (normalized.includes("sms")) return "sms";
  if (normalized.includes("webchat")) return "webchat";
  if (normalized.includes("native")) return "native_guest";
  if (
    normalized.includes("platform") ||
    normalized.includes("oauth") ||
    normalized.includes("email")
  ) {
    return "platform_web";
  }
  return "unknown";
}

function buildAggregateBuckets(
  values: Array<string | undefined>,
  fallbackKey: string
): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = normalizeOptionalText(value) || fallbackKey;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => (b.count === a.count ? a.key.localeCompare(b.key) : b.count - a.count));
}

function normalizeBetaCode(value: string): string {
  return value.trim().toUpperCase();
}

function assertValidBetaCode(value: string): string {
  const normalized = normalizeBetaCode(value);
  if (!BETA_CODE_PATTERN.test(normalized)) {
    throw new ConvexError({
      code: "INVALID_BETA_CODE_FORMAT",
      message: "Beta code format is invalid.",
    });
  }
  return normalized;
}

function normalizeMaxUses(value?: number): number {
  if (value === undefined) {
    return 1;
  }
  const rounded = Math.floor(value);
  if (!Number.isFinite(rounded) || rounded < 1 || rounded > 10000) {
    throw new ConvexError({
      code: "INVALID_BETA_MAX_USES",
      message: "maxUses must be between 1 and 10000.",
    });
  }
  return rounded;
}

function normalizeFutureTimestamp(value?: number | null): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Number.isFinite(value)) {
    throw new ConvexError({
      code: "INVALID_BETA_EXPIRES_AT",
      message: "expiresAt must be a valid timestamp.",
    });
  }
  const now = Date.now();
  if (value <= now) {
    throw new ConvexError({
      code: "INVALID_BETA_EXPIRES_AT",
      message: "expiresAt must be in the future.",
    });
  }
  return value;
}

function resolveLifecycleStatus(doc: BetaCodeDoc, now = Date.now()): "active" | "redeemed" | "expired" | "deactivated" {
  if (doc.status === "deactivated") {
    return "deactivated";
  }
  if (typeof doc.expiresAt === "number" && doc.expiresAt <= now) {
    return "expired";
  }
  if (doc.currentUses >= doc.maxUses) {
    return "redeemed";
  }
  return "active";
}

function toBetaCodeView(doc: BetaCodeDoc, now = Date.now()) {
  const status = resolveLifecycleStatus(doc, now);
  return {
    _id: doc._id,
    code: doc.code,
    codeKey: doc.codeKey,
    status,
    channelTag: doc.channelTag ?? null,
    sourceDetail: doc.sourceDetail ?? null,
    notes: doc.notes ?? null,
    maxUses: doc.maxUses,
    currentUses: doc.currentUses,
    remainingUses: Math.max(0, doc.maxUses - doc.currentUses),
    expiresAt: doc.expiresAt ?? null,
    createdByUserId: doc.createdByUserId ?? null,
    deactivatedByUserId: doc.deactivatedByUserId ?? null,
    deactivatedAt: doc.deactivatedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function randomCodeSegment(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return output;
}

function generateRandomBetaCode(): string {
  return `BETA-${randomCodeSegment(4)}-${randomCodeSegment(4)}`;
}

async function requireBetaCodeAdminSession(
  ctx: any,
  sessionId: string,
): Promise<{ userId: Id<"users"> }> {
  const auth = await requireAuthenticatedUser(ctx, sessionId);
  const hasPermission = await checkPermission(
    ctx,
    auth.userId,
    "manage_platform_settings",
    auth.organizationId,
  );

  if (!hasPermission) {
    throw new ConvexError({
      code: "PERMISSION_DENIED",
      message: "Permission denied: manage_platform_settings required.",
    });
  }

  return { userId: auth.userId };
}

async function findCodeByKey(ctx: any, codeKey: string): Promise<BetaCodeDoc | null> {
  const row = await ctx.db
    .query("betaActivationCodes")
    .withIndex("by_code_key", (q: any) => q.eq("codeKey", codeKey))
    .first();
  return (row as BetaCodeDoc | null) ?? null;
}

async function evaluateCode(
  ctx: any,
  code: string,
  args?: { userId?: Id<"users"> },
): Promise<{
  isValid: boolean;
  reason: BetaCodeValidationReason;
  code: string;
  codeId: Id<"betaActivationCodes"> | null;
  status: "active" | "redeemed" | "expired" | "deactivated" | null;
  channelTag: string | null;
  sourceDetail: string | null;
  remainingUses: number;
  expiresAt: number | null;
}> {
  const normalized = normalizeBetaCode(code);
  if (!BETA_CODE_PATTERN.test(normalized)) {
    return {
      isValid: false,
      reason: "invalid_format",
      code: normalized,
      codeId: null,
      status: null,
      channelTag: null,
      sourceDetail: null,
      remainingUses: 0,
      expiresAt: null,
    };
  }

  const codeDoc = await findCodeByKey(ctx, normalized);
  if (!codeDoc) {
    return {
      isValid: false,
      reason: "not_found",
      code: normalized,
      codeId: null,
      status: null,
      channelTag: null,
      sourceDetail: null,
      remainingUses: 0,
      expiresAt: null,
    };
  }

  const derivedStatus = resolveLifecycleStatus(codeDoc);

  if (derivedStatus === "deactivated") {
    return {
      isValid: false,
      reason: "deactivated",
      code: codeDoc.code,
      codeId: codeDoc._id,
      status: derivedStatus,
      channelTag: codeDoc.channelTag ?? null,
      sourceDetail: codeDoc.sourceDetail ?? null,
      remainingUses: Math.max(0, codeDoc.maxUses - codeDoc.currentUses),
      expiresAt: codeDoc.expiresAt ?? null,
    };
  }

  if (derivedStatus === "expired") {
    return {
      isValid: false,
      reason: "expired",
      code: codeDoc.code,
      codeId: codeDoc._id,
      status: derivedStatus,
      channelTag: codeDoc.channelTag ?? null,
      sourceDetail: codeDoc.sourceDetail ?? null,
      remainingUses: Math.max(0, codeDoc.maxUses - codeDoc.currentUses),
      expiresAt: codeDoc.expiresAt ?? null,
    };
  }

  if (derivedStatus === "redeemed") {
    return {
      isValid: false,
      reason: "exhausted",
      code: codeDoc.code,
      codeId: codeDoc._id,
      status: derivedStatus,
      channelTag: codeDoc.channelTag ?? null,
      sourceDetail: codeDoc.sourceDetail ?? null,
      remainingUses: Math.max(0, codeDoc.maxUses - codeDoc.currentUses),
      expiresAt: codeDoc.expiresAt ?? null,
    };
  }

  if (args?.userId) {
    const existing = await ctx.db
      .query("betaCodeRedemptions")
      .withIndex("by_code_id_user", (q: any) => q.eq("betaCodeId", codeDoc._id).eq("redeemedByUserId", args.userId))
      .first();

    if (existing) {
      return {
        isValid: false,
        reason: "already_redeemed",
        code: codeDoc.code,
        codeId: codeDoc._id,
        status: derivedStatus,
        channelTag: codeDoc.channelTag ?? null,
        sourceDetail: codeDoc.sourceDetail ?? null,
        remainingUses: Math.max(0, codeDoc.maxUses - codeDoc.currentUses),
        expiresAt: codeDoc.expiresAt ?? null,
      };
    }
  }

  return {
    isValid: true,
    reason: "valid",
    code: codeDoc.code,
    codeId: codeDoc._id,
    status: derivedStatus,
    channelTag: codeDoc.channelTag ?? null,
    sourceDetail: codeDoc.sourceDetail ?? null,
    remainingUses: Math.max(0, codeDoc.maxUses - codeDoc.currentUses),
    expiresAt: codeDoc.expiresAt ?? null,
  };
}

export const createBetaCode = mutation({
  args: {
    sessionId: v.string(),
    code: v.optional(v.string()),
    channelTag: v.optional(v.string()),
    sourceDetail: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireBetaCodeAdminSession(ctx, args.sessionId);
    const maxUses = normalizeMaxUses(args.maxUses);
    const expiresAt = normalizeFutureTimestamp(args.expiresAt);

    const channelTag = normalizeOptionalText(args.channelTag);
    const sourceDetail = normalizeOptionalText(args.sourceDetail);
    const notes = normalizeOptionalText(args.notes);

    let code = args.code ? assertValidBetaCode(args.code) : generateRandomBetaCode();
    let codeKey = normalizeBetaCode(code);

    let attempts = 0;
    while (attempts < 10) {
      const existing = await findCodeByKey(ctx, codeKey);
      if (!existing) {
        break;
      }

      if (args.code) {
        throw new ConvexError({
          code: "BETA_CODE_ALREADY_EXISTS",
          message: "Beta code already exists.",
        });
      }

      code = generateRandomBetaCode();
      codeKey = normalizeBetaCode(code);
      attempts += 1;
    }

    if (attempts >= 10) {
      throw new ConvexError({
        code: "BETA_CODE_GENERATION_FAILED",
        message: "Failed to generate a unique beta code.",
      });
    }

    const now = Date.now();
    const codeId = await ctx.db.insert("betaActivationCodes", {
      code,
      codeKey,
      channelTag,
      sourceDetail,
      notes,
      maxUses,
      currentUses: 0,
      expiresAt,
      status: "active",
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(codeId);
    return {
      success: true,
      codeId,
      code,
      record: created ? toBetaCodeView(created as BetaCodeDoc, now) : null,
    };
  },
});

export const batchCreateBetaCodes = mutation({
  args: {
    sessionId: v.string(),
    prefix: v.string(),
    count: v.number(),
    startNumber: v.optional(v.number()),
    padding: v.optional(v.number()),
    channelTag: v.optional(v.string()),
    sourceDetail: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireBetaCodeAdminSession(ctx, args.sessionId);

    const count = Math.floor(args.count);
    if (!Number.isFinite(count) || count < 1 || count > 500) {
      throw new ConvexError({
        code: "INVALID_BETA_BATCH_COUNT",
        message: "count must be between 1 and 500.",
      });
    }

    const rawPrefix = normalizeOptionalText(args.prefix) || "BETA";
    const prefix = rawPrefix.toUpperCase();
    if (!BETA_PREFIX_PATTERN.test(prefix)) {
      throw new ConvexError({
        code: "INVALID_BETA_PREFIX",
        message: "prefix may only contain A-Z, 0-9, and dashes.",
      });
    }

    const startNumber = Math.floor(args.startNumber ?? 1);
    if (!Number.isFinite(startNumber) || startNumber < 0) {
      throw new ConvexError({
        code: "INVALID_BETA_START_NUMBER",
        message: "startNumber must be >= 0.",
      });
    }

    const padding = Math.floor(args.padding ?? 3);
    if (!Number.isFinite(padding) || padding < 1 || padding > 8) {
      throw new ConvexError({
        code: "INVALID_BETA_PADDING",
        message: "padding must be between 1 and 8.",
      });
    }

    const maxUses = normalizeMaxUses(args.maxUses);
    const expiresAt = normalizeFutureTimestamp(args.expiresAt);
    const channelTag = normalizeOptionalText(args.channelTag);
    const sourceDetail = normalizeOptionalText(args.sourceDetail);
    const notes = normalizeOptionalText(args.notes);

    const basePrefix = prefix.endsWith("-") ? prefix : `${prefix}-`;
    const now = Date.now();

    const created: Array<{ _id: Id<"betaActivationCodes">; code: string }> = [];
    const skippedExisting: string[] = [];

    for (let i = 0; i < count; i += 1) {
      const sequence = startNumber + i;
      const code = `${basePrefix}${String(sequence).padStart(padding, "0")}`;
      const codeKey = normalizeBetaCode(code);
      const exists = await findCodeByKey(ctx, codeKey);

      if (exists) {
        skippedExisting.push(code);
        continue;
      }

      const codeId = await ctx.db.insert("betaActivationCodes", {
        code,
        codeKey,
        channelTag,
        sourceDetail,
        notes,
        maxUses,
        currentUses: 0,
        expiresAt,
        status: "active",
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      });

      created.push({ _id: codeId, code });
    }

    return {
      success: true,
      requested: count,
      createdCount: created.length,
      skippedCount: skippedExisting.length,
      created,
      skippedExisting,
    };
  },
});

export const listBetaCodes = query({
  args: {
    sessionId: v.string(),
    status: v.optional(betaCodeStatusValidator),
    channelTag: v.optional(v.string()),
    sourceDetail: v.optional(v.string()),
    codeSearch: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireBetaCodeAdminSession(ctx, args.sessionId);
    return queryBetaCodeViews(ctx, {
      status: args.status,
      channelTag: args.channelTag,
      sourceDetail: args.sourceDetail,
      codeSearch: args.codeSearch,
      limit: args.limit,
    });
  },
});

async function queryBetaCodeViews(
  ctx: any,
  args: {
    status?: "active" | "redeemed" | "expired" | "deactivated";
    channelTag?: string;
    sourceDetail?: string;
    codeSearch?: string;
    limit?: number;
  },
) {
  const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 100), 300));
  const now = Date.now();

  const normalizedChannelTag = normalizeOptionalText(args.channelTag);
  const normalizedSourceDetail = normalizeOptionalText(args.sourceDetail)?.toLowerCase();
  const normalizedCodeSearch = normalizeOptionalText(args.codeSearch)?.toUpperCase();
  let candidates: BetaCodeDoc[] = [];
  const takeLimit = Math.min(1000, limit * 5);

  if (args.status && normalizedChannelTag) {
    candidates = (await ctx.db
      .query("betaActivationCodes")
      .withIndex("by_channel_status", (q: any) => q.eq("channelTag", normalizedChannelTag).eq("status", args.status))
      .order("desc")
      .take(takeLimit)) as BetaCodeDoc[];
  } else if (args.status) {
    candidates = (await ctx.db
      .query("betaActivationCodes")
      .withIndex("by_status", (q: any) => q.eq("status", args.status))
      .order("desc")
      .take(takeLimit)) as BetaCodeDoc[];
  } else {
    candidates = (await ctx.db
      .query("betaActivationCodes")
      .withIndex("by_created_at", (q: any) => q.gte("createdAt", 0))
      .order("desc")
      .take(takeLimit)) as BetaCodeDoc[];
  }

  const filtered = candidates.filter((doc) => {
    if (normalizedChannelTag && normalizeOptionalText(doc.channelTag) !== normalizedChannelTag) {
      return false;
    }
    if (normalizedSourceDetail) {
      const sourceDetail = normalizeOptionalText(doc.sourceDetail)?.toLowerCase();
      if (!sourceDetail || !sourceDetail.includes(normalizedSourceDetail)) {
        return false;
      }
    }
    if (normalizedCodeSearch && !doc.code.includes(normalizedCodeSearch)) {
      return false;
    }
    if (!args.status) {
      return true;
    }
    return resolveLifecycleStatus(doc, now) === args.status;
  });

  return filtered.slice(0, limit).map((doc) => toBetaCodeView(doc, now));
}

export const getBetaCodeDetails = query({
  args: {
    sessionId: v.string(),
    codeId: v.id("betaActivationCodes"),
  },
  handler: async (ctx, args) => {
    await requireBetaCodeAdminSession(ctx, args.sessionId);

    const codeDoc = await ctx.db.get(args.codeId);
    if (!codeDoc) {
      throw new ConvexError({
        code: "BETA_CODE_NOT_FOUND",
        message: "Beta code not found.",
      });
    }

    const redemptions = await ctx.db
      .query("betaCodeRedemptions")
      .withIndex("by_code_id", (q: any) => q.eq("betaCodeId", args.codeId))
      .order("desc")
      .take(100);

    return {
      code: toBetaCodeView(codeDoc as BetaCodeDoc),
      redemptions,
    };
  },
});

export const getBetaCodeRedemptionAnalytics = query({
  args: {
    sessionId: v.string(),
    codeId: v.optional(v.id("betaActivationCodes")),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    channel: v.optional(v.string()),
    source: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireBetaCodeAdminSession(ctx, args.sessionId);

    const now = Date.now();
    const endTime = args.endTime ?? now;
    const startTime = args.startTime ?? Math.max(0, endTime - 30 * 24 * 60 * 60 * 1000);
    const limit = Math.max(1, Math.min(Math.floor(args.limit ?? 5000), 10000));

    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime > endTime) {
      throw new ConvexError({
        code: "INVALID_REDEMPTION_WINDOW",
        message: "startTime/endTime must be valid timestamps where startTime <= endTime.",
      });
    }

    const normalizedChannel = normalizeOptionalText(args.channel);
    const normalizedSource = normalizeOptionalText(args.source);
    const normalizedDeviceType = normalizeOptionalText(args.deviceType);

    const sampled = args.codeId
      ? await ctx.db
          .query("betaCodeRedemptions")
          .withIndex("by_code_id", (q: any) => q.eq("betaCodeId", args.codeId))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("betaCodeRedemptions")
          .withIndex("by_redeemed_at", (q: any) => q.lte("redeemedAt", endTime))
          .order("desc")
          .take(limit);

    const filtered = sampled.filter((row: any) => {
      if (row.redeemedAt < startTime || row.redeemedAt > endTime) return false;
      if (normalizedChannel && normalizeOptionalText(row.channel) !== normalizedChannel) return false;
      if (normalizedSource && normalizeOptionalText(row.source) !== normalizedSource) return false;
      if (normalizedDeviceType && normalizeOptionalText(row.deviceType) !== normalizedDeviceType) return false;
      return true;
    });

    const byCodeMap = new Map<
      string,
      {
        codeId: Id<"betaActivationCodes">;
        code: string;
        codeKey: string;
        count: number;
      }
    >();
    for (const row of filtered) {
      const existing = byCodeMap.get(row.codeKey);
      if (existing) {
        existing.count += 1;
      } else {
        byCodeMap.set(row.codeKey, {
          codeId: row.betaCodeId,
          code: row.code,
          codeKey: row.codeKey,
          count: 1,
        });
      }
    }

    const byCode = Array.from(byCodeMap.values()).sort((a, b) =>
      b.count === a.count ? a.code.localeCompare(b.code) : b.count - a.count
    );

    return {
      window: {
        startTime,
        endTime,
      },
      appliedFilters: {
        codeId: args.codeId ?? null,
        channel: normalizedChannel ?? null,
        source: normalizedSource ?? null,
        deviceType: normalizedDeviceType ?? null,
      },
      sampleLimit: limit,
      sampledRows: sampled.length,
      filteredRows: filtered.length,
      truncated: sampled.length >= limit,
      byChannel: buildAggregateBuckets(filtered.map((row: any) => row.channel), "unknown"),
      bySource: buildAggregateBuckets(filtered.map((row: any) => row.source), "unknown"),
      byDeviceType: buildAggregateBuckets(filtered.map((row: any) => row.deviceType), "unknown"),
      byCode,
    };
  },
});

export const updateBetaCode = mutation({
  args: {
    sessionId: v.string(),
    codeId: v.id("betaActivationCodes"),
    expiresAt: v.optional(v.union(v.number(), v.null())),
    maxUses: v.optional(v.number()),
    channelTag: v.optional(v.union(v.string(), v.null())),
    sourceDetail: v.optional(v.union(v.string(), v.null())),
    notes: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    await requireBetaCodeAdminSession(ctx, args.sessionId);

    const codeDocRaw = await ctx.db.get(args.codeId);
    const codeDoc = codeDocRaw as BetaCodeDoc | null;

    if (!codeDoc) {
      throw new ConvexError({
        code: "BETA_CODE_NOT_FOUND",
        message: "Beta code not found.",
      });
    }

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.expiresAt !== undefined) {
      patch.expiresAt = normalizeFutureTimestamp(args.expiresAt);
    }

    if (args.maxUses !== undefined) {
      const maxUses = normalizeMaxUses(args.maxUses);
      if (maxUses < codeDoc.currentUses) {
        throw new ConvexError({
          code: "INVALID_BETA_MAX_USES",
          message: "maxUses cannot be lower than currentUses.",
        });
      }
      patch.maxUses = maxUses;
    }

    if (args.channelTag !== undefined) {
      patch.channelTag = normalizeOptionalText(args.channelTag);
    }

    if (args.sourceDetail !== undefined) {
      patch.sourceDetail = normalizeOptionalText(args.sourceDetail);
    }

    if (args.notes !== undefined) {
      patch.notes = normalizeOptionalText(args.notes);
    }

    await ctx.db.patch(args.codeId, patch);
    const updated = await ctx.db.get(args.codeId);

    return {
      success: true,
      codeId: args.codeId,
      record: updated ? toBetaCodeView(updated as BetaCodeDoc) : null,
    };
  },
});

export const deactivateBetaCode = mutation({
  args: {
    sessionId: v.string(),
    codeId: v.id("betaActivationCodes"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireBetaCodeAdminSession(ctx, args.sessionId);

    const codeDocRaw = await ctx.db.get(args.codeId);
    const codeDoc = codeDocRaw as BetaCodeDoc | null;

    if (!codeDoc) {
      throw new ConvexError({
        code: "BETA_CODE_NOT_FOUND",
        message: "Beta code not found.",
      });
    }

    if (codeDoc.status === "deactivated") {
      return {
        success: true,
        alreadyDeactivated: true,
        codeId: args.codeId,
      };
    }

    const reason = normalizeOptionalText(args.reason);
    const now = Date.now();

    await ctx.db.patch(args.codeId, {
      status: "deactivated",
      notes: reason ? `${codeDoc.notes ? `${codeDoc.notes}\n` : ""}deactivation_reason: ${reason}` : codeDoc.notes,
      deactivatedByUserId: userId,
      deactivatedAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      alreadyDeactivated: false,
      codeId: args.codeId,
    };
  },
});

export const exportBetaCodesCsv = query({
  args: {
    sessionId: v.string(),
    status: v.optional(betaCodeStatusValidator),
    channelTag: v.optional(v.string()),
    sourceDetail: v.optional(v.string()),
    codeSearch: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireBetaCodeAdminSession(ctx, args.sessionId);

    const list = await queryBetaCodeViews(ctx, {
      status: args.status,
      channelTag: args.channelTag,
      sourceDetail: args.sourceDetail,
      codeSearch: args.codeSearch,
      limit: args.limit,
    });

    const escapeCsv = (value: unknown) => {
      const stringValue = value === null || value === undefined ? "" : String(value);
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const header = [
      "code",
      "status",
      "channelTag",
      "sourceDetail",
      "maxUses",
      "currentUses",
      "remainingUses",
      "expiresAt",
      "createdAt",
      "updatedAt",
    ];

    const rows = list.map((entry: any) => [
      entry.code,
      entry.status,
      entry.channelTag,
      entry.sourceDetail,
      entry.maxUses,
      entry.currentUses,
      entry.remainingUses,
      entry.expiresAt,
      entry.createdAt,
      entry.updatedAt,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
      .join("\n");

    return {
      filename: `beta-codes-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      rowCount: rows.length,
    };
  },
});

export const validateBetaCodePublic = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await evaluateCode(ctx, args.code);
    return {
      isValid: result.isValid,
      reason: result.reason,
      code: result.code,
      status: result.status,
      channelTag: result.channelTag,
      sourceDetail: result.sourceDetail,
      remainingUses: result.remainingUses,
      expiresAt: result.expiresAt,
    };
  },
});

export const validateBetaCodeInternal = internalQuery({
  args: {
    code: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const result = await evaluateCode(ctx, args.code, { userId: args.userId });
    return {
      ...result,
    };
  },
});

export const redeemBetaCodeForSignupInternal = internalMutation({
  args: {
    code: v.string(),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    channel: v.optional(v.string()),
    source: v.optional(v.string()),
    deviceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const validation = await evaluateCode(ctx, args.code, { userId: args.userId });

    if (!validation.codeId) {
      throw new ConvexError({
        code: "INVALID_BETA_CODE",
        message: "Beta code is invalid.",
      });
    }

    if (!validation.isValid && validation.reason !== "already_redeemed") {
      throw new ConvexError({
        code:
          validation.reason === "expired"
            ? "BETA_CODE_EXPIRED"
            : validation.reason === "exhausted"
            ? "BETA_CODE_EXHAUSTED"
            : validation.reason === "deactivated"
            ? "BETA_CODE_DEACTIVATED"
            : "INVALID_BETA_CODE",
        message: `Beta code cannot be redeemed (${validation.reason}).`,
      });
    }

    const codeDocRaw = await ctx.db.get(validation.codeId);
    const codeDoc = codeDocRaw as BetaCodeDoc | null;
    if (!codeDoc) {
      throw new ConvexError({
        code: "INVALID_BETA_CODE",
        message: "Beta code not found.",
      });
    }

    const normalizedChannel = normalizeOptionalText(args.channel);
    const normalizedSource = normalizeOptionalText(args.source);
    const normalizedDeviceType = normalizeOptionalText(args.deviceType);

    const emitRedemptionFunnelEvent = async () => {
      try {
        await (ctx as any).runMutation(generatedApi.internal.onboarding.funnelEvents.emitFunnelEvent, {
          eventName: "onboarding.funnel.activation",
          channel: mapRedemptionChannelToFunnelChannel(normalizedChannel),
          organizationId: args.organizationId,
          userId: args.userId,
          eventKey: `onboarding.funnel.activation:beta_code:${args.userId}:${codeDoc.codeKey}`,
          metadata: {
            reason: "beta_code_redemption",
            code: codeDoc.code,
            codeKey: codeDoc.codeKey,
            channel: normalizedChannel,
            source: normalizedSource,
            deviceType: normalizedDeviceType,
          },
        });
      } catch (error) {
        console.error("[Beta Codes] Redemption funnel event failed (non-blocking):", error);
      }
    };

    const existingRedemption = await ctx.db
      .query("betaCodeRedemptions")
      .withIndex("by_code_id_user", (q: any) => q.eq("betaCodeId", codeDoc._id).eq("redeemedByUserId", args.userId))
      .first();

    if (existingRedemption) {
      const patch: Record<string, unknown> = {};
      if (!normalizeOptionalText(existingRedemption.channel) && normalizedChannel) {
        patch.channel = normalizedChannel;
      }
      if (!normalizeOptionalText(existingRedemption.source) && normalizedSource) {
        patch.source = normalizedSource;
      }
      if (!normalizeOptionalText(existingRedemption.deviceType) && normalizedDeviceType) {
        patch.deviceType = normalizedDeviceType;
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existingRedemption._id, patch);
      }
      await emitRedemptionFunnelEvent();
      return {
        success: true,
        idempotent: true,
        codeId: codeDoc._id,
        code: codeDoc.code,
      };
    }

    const now = Date.now();
    const lifecycle = resolveLifecycleStatus(codeDoc, now);
    if (lifecycle !== "active") {
      throw new ConvexError({
        code:
          lifecycle === "expired"
            ? "BETA_CODE_EXPIRED"
            : lifecycle === "redeemed"
            ? "BETA_CODE_EXHAUSTED"
            : lifecycle === "deactivated"
            ? "BETA_CODE_DEACTIVATED"
            : "INVALID_BETA_CODE",
        message: `Beta code cannot be redeemed (${lifecycle}).`,
      });
    }

    await ctx.db.insert("betaCodeRedemptions", {
      betaCodeId: codeDoc._id,
      code: codeDoc.code,
      codeKey: codeDoc.codeKey,
      redeemedByUserId: args.userId,
      redeemedByOrganizationId: args.organizationId,
      redeemedAt: now,
      channel: normalizedChannel,
      source: normalizedSource,
      deviceType: normalizedDeviceType,
    });

    const nextUses = codeDoc.currentUses + 1;
    await ctx.db.patch(codeDoc._id, {
      currentUses: nextUses,
      status: nextUses >= codeDoc.maxUses ? "redeemed" : codeDoc.status,
      updatedAt: now,
    });
    await emitRedemptionFunnelEvent();

    return {
      success: true,
      idempotent: false,
      codeId: codeDoc._id,
      code: codeDoc.code,
      currentUses: nextUses,
      maxUses: codeDoc.maxUses,
    };
  },
});
