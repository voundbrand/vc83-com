import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  consentSourceValidator,
  consentTypeValidator,
} from "./schemas/consentSchemas";

type ConsentType =
  | "cookie_analytics"
  | "cookie_marketing"
  | "email_marketing"
  | "data_processing";

type ConsentSource =
  | "cookie_banner"
  | "settings"
  | "signup"
  | "system_migration";

const COOKIE_CONSENT_TYPES = new Set<ConsentType>([
  "cookie_analytics",
  "cookie_marketing",
]);

function getConsentRecordsDb(ctx: MutationCtx | QueryCtx) {
  type IndexClause = {
    eq: (field: string, value: unknown) => IndexClause;
  };

  return ctx.db as unknown as {
    insert: (table: string, value: unknown) => Promise<string>;
    query: (table: string) => {
      withIndex: (
        indexName: string,
        builder: (q: IndexClause) => unknown,
      ) => {
        order: (direction: "asc" | "desc") => {
          first: () => Promise<{
            _id: string;
            granted: boolean;
            policyVersion: string;
            source: ConsentSource;
            timestamp: number;
          } | null>;
          take: (count: number) => Promise<unknown[]>;
        };
      };
    };
  };
}

async function requireUserIdFromSession(
  ctx: MutationCtx | QueryCtx,
  sessionId: string,
): Promise<Id<"users">> {
  const session = await ctx.db.get(sessionId as Id<"sessions">);
  if (!session) {
    throw new Error("Ungültige Sitzung");
  }
  return session.userId;
}

async function patchCookieConsentSnapshot(
  ctx: MutationCtx,
  input: {
    userId: Id<"users">;
    consentType: ConsentType;
    granted: boolean;
    policyVersion: string;
    source: ConsentSource;
    timestamp: number;
  },
): Promise<void> {
  if (!COOKIE_CONSENT_TYPES.has(input.consentType)) {
    return;
  }

  const existingPreferences = await ctx.db
    .query("userPreferences")
    .withIndex("by_user", (q) => q.eq("userId", input.userId))
    .first();

  if (!existingPreferences) {
    return;
  }

  const existingCookieConsent = (
    existingPreferences as {
      cookieConsent?: {
        analytics?: unknown;
        marketing?: unknown;
      };
    }
  ).cookieConsent;

  const nextAnalytics =
    input.consentType === "cookie_analytics"
      ? input.granted
      : typeof existingCookieConsent?.analytics === "boolean"
        ? existingCookieConsent.analytics
        : false;

  const nextMarketing =
    input.consentType === "cookie_marketing"
      ? input.granted
      : typeof existingCookieConsent?.marketing === "boolean"
        ? existingCookieConsent.marketing
        : false;

  await ctx.db.patch(existingPreferences._id, {
    cookieConsent: {
      analytics: nextAnalytics,
      marketing: nextMarketing,
      policyVersion: input.policyVersion,
      source: input.source,
      updatedAt: input.timestamp,
    },
    updatedAt: input.timestamp,
  } as never);
}

async function recordConsentDecision(
  ctx: MutationCtx,
  args: {
    sessionId: string;
    consentType: ConsentType;
    granted: boolean;
    policyVersion: string;
    source: ConsentSource;
    policyLocale?: string;
    policyUrl?: string;
  },
): Promise<{
  recordId: string;
  recordedAt: number;
  deduped: boolean;
}> {
  const userId = await requireUserIdFromSession(ctx, args.sessionId);
  const timestamp = Date.now();
  const consentDb = getConsentRecordsDb(ctx);

  const latestRecord = await consentDb
    .query("consentRecords")
    .withIndex("by_user_type_timestamp", (q) =>
      q.eq("userId", userId).eq("consentType", args.consentType),
    )
    .order("desc")
    .first();

  if (
    latestRecord &&
    latestRecord.granted === args.granted &&
    latestRecord.policyVersion === args.policyVersion &&
    latestRecord.source === args.source
  ) {
    return {
      recordId: latestRecord._id,
      recordedAt: latestRecord.timestamp,
      deduped: true,
    };
  }

  const recordId = await consentDb.insert("consentRecords", {
    userId,
    consentType: args.consentType,
    granted: args.granted,
    timestamp,
    policyVersion: args.policyVersion,
    source: args.source,
    ...(args.policyLocale !== undefined ? { policyLocale: args.policyLocale } : {}),
    ...(args.policyUrl !== undefined ? { policyUrl: args.policyUrl } : {}),
  });

  await patchCookieConsentSnapshot(ctx, {
    userId,
    consentType: args.consentType,
    granted: args.granted,
    policyVersion: args.policyVersion,
    source: args.source,
    timestamp,
  });

  return { recordId, recordedAt: timestamp, deduped: false };
}

export const recordConsent = mutation({
  args: {
    sessionId: v.string(),
    consentType: consentTypeValidator,
    granted: v.boolean(),
    policyVersion: v.string(),
    source: consentSourceValidator,
    policyLocale: v.optional(v.string()),
    policyUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    recordConsentDecision(ctx, {
      sessionId: args.sessionId,
      consentType: args.consentType as ConsentType,
      granted: args.granted,
      policyVersion: args.policyVersion,
      source: args.source as ConsentSource,
      policyLocale: args.policyLocale,
      policyUrl: args.policyUrl,
    }),
});

export const revokeConsent = mutation({
  args: {
    sessionId: v.string(),
    consentType: consentTypeValidator,
    policyVersion: v.string(),
    source: v.optional(consentSourceValidator),
    policyLocale: v.optional(v.string()),
    policyUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await recordConsentDecision(ctx, {
      sessionId: args.sessionId,
      consentType: args.consentType as ConsentType,
      granted: false,
      policyVersion: args.policyVersion,
      source: (args.source ?? "settings") as ConsentSource,
      policyLocale: args.policyLocale,
      policyUrl: args.policyUrl,
    });

    return {
      ...result,
      revoked: true,
    };
  },
});

export const getConsentHistory = query({
  args: {
    sessionId: v.string(),
    consentType: v.optional(consentTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserIdFromSession(ctx, args.sessionId);
    const normalizedLimit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const consentDb = getConsentRecordsDb(ctx);

    if (args.consentType) {
      return consentDb
        .query("consentRecords")
        .withIndex("by_user_type_timestamp", (q) =>
          q.eq("userId", userId).eq("consentType", args.consentType),
        )
        .order("desc")
        .take(normalizedLimit);
    }

    return consentDb
      .query("consentRecords")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .order("desc")
      .take(normalizedLimit);
  },
});
