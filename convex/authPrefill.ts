import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { decodeAndVerifyAuthPrefillToken } from "./lib/authPrefillToken";

const generatedApi: any = require("./_generated/api");

const authModeValidator = v.union(
  v.literal("check"),
  v.literal("signin"),
  v.literal("setup"),
  v.literal("signup")
);

const DEFAULT_OPAQUE_PREFILL_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_OPAQUE_PREFILL_TTL_MS = 45 * 24 * 60 * 60 * 1000;
const DEFAULT_CLEANUP_LIMIT = 500;
const MAX_CLEANUP_LIMIT = 5000;

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTtlMs(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_OPAQUE_PREFILL_TTL_MS;
  }
  return Math.min(Math.floor(value), MAX_OPAQUE_PREFILL_TTL_MS);
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  if (typeof btoa === "function") {
    let binary = "";
    for (let index = 0; index < bytes.length; index++) {
      binary += String.fromCharCode(bytes[index]!);
    }
    return btoa(binary);
  }

  throw new Error("Base64 encoding is not available in this runtime");
}

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(new Uint8Array(digest));
}

function generateOpaqueToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

type ResolvedAuthPrefillResult =
  | {
      valid: true;
      prefill: {
        email: string;
        firstName?: string;
        lastName?: string;
        organizationName?: string;
        betaCode?: string;
        authMode?: "check" | "signin" | "setup" | "signup";
        autoCheck: boolean;
      };
      expiresAt: number;
    }
  | { valid: false };

export const issueOpaqueAuthPrefillToken = internalMutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    organizationName: v.optional(v.string()),
    betaCode: v.optional(v.string()),
    authMode: v.optional(authModeValidator),
    autoCheck: v.optional(v.boolean()),
    source: v.optional(v.string()),
    ttlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const email = normalizeOptionalString(args.email);
    if (!email) {
      throw new Error("Opaque auth prefill token requires a non-empty email");
    }

    const now = Date.now();
    const token = generateOpaqueToken();
    const tokenHash = await sha256Hex(token);
    const ttlMs = normalizeTtlMs(args.ttlMs);

    const expiresAt = now + ttlMs;
    await ctx.db.insert("authPrefillTokens", {
      tokenHash,
      email,
      firstName: normalizeOptionalString(args.firstName),
      lastName: normalizeOptionalString(args.lastName),
      organizationName: normalizeOptionalString(args.organizationName),
      betaCode: normalizeOptionalString(args.betaCode),
      authMode: args.authMode,
      autoCheck: args.autoCheck === true ? true : undefined,
      source: normalizeOptionalString(args.source),
      createdAt: now,
      expiresAt,
      consumedAt: undefined,
    });

    return {
      token,
      expiresAt,
    };
  },
});

export const consumeOpaqueAuthPrefillToken = internalMutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<ResolvedAuthPrefillResult> => {
    const token = normalizeOptionalString(args.token);
    if (!token) {
      return { valid: false };
    }

    const tokenHash = await sha256Hex(token);
    const record = await ctx.db
      .query("authPrefillTokens")
      .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!record) {
      return { valid: false };
    }

    const now = Date.now();
    if (typeof record.consumedAt === "number") {
      return { valid: false };
    }
    if (now > record.expiresAt) {
      return { valid: false };
    }

    await ctx.db.patch(record._id, {
      consumedAt: now,
    });

    return {
      valid: true,
      prefill: {
        email: record.email,
        firstName: record.firstName,
        lastName: record.lastName,
        organizationName: record.organizationName,
        betaCode: record.betaCode,
        authMode: record.authMode,
        autoCheck: record.autoCheck === true,
      },
      expiresAt: record.expiresAt,
    };
  },
});

async function resolveAuthPrefill(
  ctx: any,
  token: string
): Promise<ResolvedAuthPrefillResult> {
  const opaqueResolved: ResolvedAuthPrefillResult = await ctx.runMutation(
    generatedApi.internal.authPrefill.consumeOpaqueAuthPrefillToken,
    { token }
  );
  if (opaqueResolved.valid) {
    return opaqueResolved;
  }

  const decoded = await decodeAndVerifyAuthPrefillToken(token);
  if (!decoded) {
    return { valid: false };
  }

  return {
    valid: true,
    prefill: {
      email: decoded.payload.email,
      firstName: decoded.payload.firstName,
      lastName: decoded.payload.lastName,
      organizationName: decoded.payload.organizationName,
      betaCode: decoded.payload.betaCode,
      authMode: decoded.payload.authMode,
      autoCheck: decoded.payload.autoCheck === true,
    },
    expiresAt: decoded.payload.exp,
  };
}

export const resolveSignedAuthPrefill = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args): Promise<ResolvedAuthPrefillResult> => {
    const token = normalizeOptionalString(args.token);
    if (!token) {
      return { valid: false };
    }
    return resolveAuthPrefill(ctx, token);
  },
});

export const cleanupExpiredAuthPrefillTokens = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const requestedLimit = typeof args.limit === "number" ? Math.floor(args.limit) : DEFAULT_CLEANUP_LIMIT;
    const limit = Math.max(1, Math.min(requestedLimit, MAX_CLEANUP_LIMIT));

    const expired = await ctx.db
      .query("authPrefillTokens")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(limit);

    for (const row of expired) {
      await ctx.db.delete(row._id);
    }

    return {
      deletedCount: expired.length,
      now,
      limit,
    };
  },
});
