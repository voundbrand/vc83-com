/**
 * FRONTEND OIDC INTEGRATION
 *
 * Reusable per-organization OIDC settings for frontend portals.
 * Storage model:
 * - objects.type = "integration_settings"
 * - objects.subtype = "frontend_oidc"
 */

import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { checkPermission, requireAuthenticatedUser } from "./rbacHelpers";
import type { Id } from "./_generated/dataModel";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("./_generated/api");

const FRONTEND_OIDC_SETTINGS_TYPE = "integration_settings";
const FRONTEND_OIDC_SETTINGS_SUBTYPE = "frontend_oidc";
const DEFAULT_PROVIDER_ID = "frontend_oidc";
const DEFAULT_PROVIDER_NAME = "Organization OIDC";
const CLIENT_SECRET_ENCRYPTED_KEY = "clientSecretEncrypted";
const FRONTEND_OIDC_STATE_TYPE = "integration_runtime";
const FRONTEND_OIDC_STATE_SUBTYPE = "frontend_oidc_state";
const FRONTEND_OIDC_STATE_STATUS_ACTIVE = "active";
const FRONTEND_OIDC_STATE_STATUS_USED = "used";
const FRONTEND_OIDC_STATE_STATUS_EXPIRED = "expired";
const DEFAULT_EMAIL_VERIFIED_CLAIM = "email_verified";
const DEFAULT_REQUIRE_VERIFIED_EMAIL = true;
const DEFAULT_FRONTEND_OIDC_STATE_CLEANUP_LIMIT = 1000;
const MAX_FRONTEND_OIDC_STATE_CLEANUP_LIMIT = 5000;
const DEFAULT_FRONTEND_OIDC_STATE_CLEANUP_BATCH_SIZE = 250;
const MAX_FRONTEND_OIDC_STATE_CLEANUP_BATCH_SIZE = 1000;
const DEFAULT_FRONTEND_OIDC_STATE_CLEANUP_MAX_BATCHES = 8;
const MAX_FRONTEND_OIDC_STATE_CLEANUP_MAX_BATCHES = 100;
const DEFAULT_FRONTEND_OIDC_STATE_RETENTION_MS = 24 * 60 * 60 * 1000;
const MIN_FRONTEND_OIDC_STATE_RETENTION_MS = 5 * 60 * 1000;
const MAX_FRONTEND_OIDC_STATE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeProviderId(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  return normalized.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, unknown>;
}

function hasUsableOidcEndpoints(config: {
  issuer: string | null;
  authorizationUrl: string | null;
  tokenUrl: string | null;
  userinfoUrl: string | null;
}): boolean {
  if (config.issuer) {
    return true;
  }
  return Boolean(config.authorizationUrl && config.tokenUrl && config.userinfoUrl);
}

function setOptionalStringProp(
  props: Record<string, unknown>,
  key: string,
  value: string | undefined
): void {
  if (value === undefined) {
    return;
  }

  const normalized = normalizeOptionalString(value);
  if (normalized) {
    props[key] = normalized;
    return;
  }

  delete props[key];
}

function ensureEncryptedFieldMarker(
  props: Record<string, unknown>,
  fieldName: string
): void {
  const existing = Array.isArray(props.encryptedFields)
    ? (props.encryptedFields as unknown[])
    : [];
  const normalized = existing
    .filter((item): item is string => typeof item === "string" && item.length > 0)
    .filter((item) => item !== fieldName);

  props.encryptedFields = [...normalized, fieldName];
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64
    .trim()
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded =
    normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const decoded = atob(padded);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

async function encryptTokenForStorage(plaintext: string): Promise<string> {
  const encryptionKey = process.env.OAUTH_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error("OAUTH_ENCRYPTION_KEY environment variable is not set");
  }

  const keyBytes = base64ToBytes(encryptionKey);
  if (keyBytes.length !== 32) {
    throw new Error("OAUTH_ENCRYPTION_KEY must be 32 bytes (256 bits)");
  }

  const keyMaterial = new ArrayBuffer(keyBytes.byteLength);
  new Uint8Array(keyMaterial).set(keyBytes);

  const importedKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    importedKey,
    new TextEncoder().encode(plaintext)
  );
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  if (encryptedBytes.length < 16) {
    throw new Error("Token encryption failed");
  }

  const authTag = encryptedBytes.slice(encryptedBytes.length - 16);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
  return `${bytesToHex(iv)}${bytesToHex(authTag)}${bytesToHex(ciphertext)}`;
}

async function resolveAuthorizedOrganizationId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  args: {
    sessionId: string;
    organizationId?: Id<"organizations">;
  }
): Promise<{ userId: Id<"users">; organizationId: Id<"organizations"> }> {
  const { userId, organizationId: sessionOrganizationId } =
    await requireAuthenticatedUser(ctx, args.sessionId);
  const organizationId = args.organizationId || sessionOrganizationId;

  const canManageIntegrations = await checkPermission(
    ctx,
    userId,
    "manage_integrations",
    organizationId
  );

  if (!canManageIntegrations) {
    throw new Error("Permission denied: manage_integrations required");
  }

  return { userId, organizationId };
}

/**
 * Read frontend OIDC integration settings for admin UI.
 * Secret material is never returned.
 */
export const getFrontendOidcIntegration = query({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await resolveAuthorizedOrganizationId(ctx, args);

    const settings = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("type", FRONTEND_OIDC_SETTINGS_TYPE)
      )
      .filter((q) => q.eq(q.field("subtype"), FRONTEND_OIDC_SETTINGS_SUBTYPE))
      .first();

    if (!settings) {
      return {
        configured: false,
        enabled: false,
        providerId: DEFAULT_PROVIDER_ID,
        providerName: DEFAULT_PROVIDER_NAME,
        clientId: null,
        hasClientSecret: false,
        clientSecretHint: null,
        issuer: null,
        authorizationUrl: null,
        tokenUrl: null,
        userinfoUrl: null,
        scope: null,
        subClaim: null,
        emailClaim: null,
        emailVerifiedClaim: DEFAULT_EMAIL_VERIFIED_CLAIM,
        requireVerifiedEmail: DEFAULT_REQUIRE_VERIFIED_EMAIL,
        nameClaim: null,
        updatedAt: null,
      };
    }

    const props = toObject(settings.customProperties);
    const issuer = normalizeOptionalString(props.issuer ?? props.oidcIssuer);
    const authorizationUrl = normalizeOptionalString(
      props.authorizationUrl ?? props.oidcAuthorizationUrl
    );
    const tokenUrl = normalizeOptionalString(props.tokenUrl ?? props.oidcTokenUrl);
    const userinfoUrl = normalizeOptionalString(
      props.userinfoUrl ?? props.oidcUserinfoUrl
    );

    const clientId = normalizeOptionalString(
      props.clientId ?? props.oidcClientId ?? props.providerClientId
    );
    const hasClientSecret = Boolean(
      normalizeOptionalString(
        props.clientSecret ?? props.oidcClientSecret ?? props.providerClientSecret
      ) ||
        normalizeOptionalString(
          props.clientSecretEncrypted ??
            props.oidcClientSecretEncrypted ??
            props.providerClientSecretEncrypted
        )
    );
    const configured = Boolean(
      props.enabled !== false &&
        clientId &&
        hasClientSecret &&
        hasUsableOidcEndpoints({
          issuer,
          authorizationUrl,
          tokenUrl,
          userinfoUrl,
        })
    );

    return {
      configured,
      enabled: props.enabled !== false,
      providerId:
        normalizeProviderId(props.providerId ?? props.oidcProviderId) ||
        DEFAULT_PROVIDER_ID,
      providerName:
        normalizeOptionalString(props.providerName ?? props.oidcProviderName) ||
        DEFAULT_PROVIDER_NAME,
      clientId,
      hasClientSecret,
      clientSecretHint: normalizeOptionalString(props.clientSecretHint),
      issuer,
      authorizationUrl,
      tokenUrl,
      userinfoUrl,
      scope: normalizeOptionalString(props.scope ?? props.oidcScope),
      subClaim: normalizeOptionalString(props.subClaim ?? props.oidcSubClaim),
      emailClaim: normalizeOptionalString(props.emailClaim ?? props.oidcEmailClaim),
      emailVerifiedClaim:
        normalizeOptionalString(
          props.emailVerifiedClaim ?? props.oidcEmailVerifiedClaim
        ) || DEFAULT_EMAIL_VERIFIED_CLAIM,
      requireVerifiedEmail:
        props.requireVerifiedEmail !== false &&
        props.oidcRequireVerifiedEmail !== false,
      nameClaim: normalizeOptionalString(props.nameClaim ?? props.oidcNameClaim),
      updatedAt: settings.updatedAt,
    };
  },
});

/**
 * Save frontend OIDC integration settings for an organization.
 * Client secret is encrypted before storage.
 */
export const saveFrontendOidcIntegration = mutation({
  args: {
    sessionId: v.string(),
    organizationId: v.optional(v.id("organizations")),
    enabled: v.optional(v.boolean()),
    providerId: v.optional(v.string()),
    providerName: v.optional(v.string()),
    clientId: v.optional(v.string()),
    clientSecret: v.optional(v.string()),
    clearClientSecret: v.optional(v.boolean()),
    issuer: v.optional(v.string()),
    authorizationUrl: v.optional(v.string()),
    tokenUrl: v.optional(v.string()),
    userinfoUrl: v.optional(v.string()),
    scope: v.optional(v.string()),
    subClaim: v.optional(v.string()),
    emailClaim: v.optional(v.string()),
    emailVerifiedClaim: v.optional(v.string()),
    requireVerifiedEmail: v.optional(v.boolean()),
    nameClaim: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await resolveAuthorizedOrganizationId(ctx, args);

    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", (q) =>
        q
          .eq("organizationId", organizationId)
          .eq("type", FRONTEND_OIDC_SETTINGS_TYPE)
      )
      .filter((q) => q.eq(q.field("subtype"), FRONTEND_OIDC_SETTINGS_SUBTYPE))
      .first();

    const nextProps = {
      ...toObject(existing?.customProperties),
    } as Record<string, unknown>;

    if (args.enabled !== undefined) {
      nextProps.enabled = args.enabled;
    }

    if (args.providerId !== undefined) {
      const normalizedProviderId = normalizeProviderId(args.providerId);
      if (normalizedProviderId) {
        nextProps.providerId = normalizedProviderId;
      } else {
        delete nextProps.providerId;
      }
    }

    setOptionalStringProp(nextProps, "providerName", args.providerName);
    setOptionalStringProp(nextProps, "clientId", args.clientId);
    setOptionalStringProp(nextProps, "issuer", args.issuer);
    setOptionalStringProp(nextProps, "authorizationUrl", args.authorizationUrl);
    setOptionalStringProp(nextProps, "tokenUrl", args.tokenUrl);
    setOptionalStringProp(nextProps, "userinfoUrl", args.userinfoUrl);
    setOptionalStringProp(nextProps, "scope", args.scope);
    setOptionalStringProp(nextProps, "subClaim", args.subClaim);
    setOptionalStringProp(nextProps, "emailClaim", args.emailClaim);
    setOptionalStringProp(nextProps, "emailVerifiedClaim", args.emailVerifiedClaim);
    setOptionalStringProp(nextProps, "nameClaim", args.nameClaim);
    if (args.requireVerifiedEmail !== undefined) {
      nextProps.requireVerifiedEmail = args.requireVerifiedEmail;
    }

    if (args.clearClientSecret === true) {
      delete nextProps.clientSecret;
      delete nextProps.oidcClientSecret;
      delete nextProps.providerClientSecret;
      delete nextProps.clientSecretEncrypted;
      delete nextProps.oidcClientSecretEncrypted;
      delete nextProps.providerClientSecretEncrypted;
      delete nextProps.clientSecretHint;
    }

    if (args.clientSecret !== undefined) {
      const normalizedClientSecret = normalizeOptionalString(args.clientSecret);
      if (!normalizedClientSecret) {
        delete nextProps.clientSecret;
        delete nextProps.oidcClientSecret;
        delete nextProps.providerClientSecret;
        delete nextProps.clientSecretEncrypted;
        delete nextProps.oidcClientSecretEncrypted;
        delete nextProps.providerClientSecretEncrypted;
        delete nextProps.clientSecretHint;
      } else {
        const encryptedClientSecret = await encryptTokenForStorage(
          normalizedClientSecret
        );

        nextProps.clientSecretEncrypted = encryptedClientSecret;
        delete nextProps.clientSecret;
        delete nextProps.oidcClientSecret;
        delete nextProps.providerClientSecret;
        nextProps.clientSecretHint = normalizedClientSecret.slice(-4);
        ensureEncryptedFieldMarker(nextProps, CLIENT_SECRET_ENCRYPTED_KEY);
      }
    }

    const clientId = normalizeOptionalString(
      nextProps.clientId ?? nextProps.oidcClientId ?? nextProps.providerClientId
    );
    const hasClientSecret = Boolean(
      normalizeOptionalString(
        nextProps.clientSecret ??
          nextProps.oidcClientSecret ??
          nextProps.providerClientSecret
      ) ||
        normalizeOptionalString(
          nextProps.clientSecretEncrypted ??
            nextProps.oidcClientSecretEncrypted ??
            nextProps.providerClientSecretEncrypted
        )
    );
    const issuer = normalizeOptionalString(nextProps.issuer ?? nextProps.oidcIssuer);
    const authorizationUrl = normalizeOptionalString(
      nextProps.authorizationUrl ?? nextProps.oidcAuthorizationUrl
    );
    const tokenUrl = normalizeOptionalString(
      nextProps.tokenUrl ?? nextProps.oidcTokenUrl
    );
    const userinfoUrl = normalizeOptionalString(
      nextProps.userinfoUrl ?? nextProps.oidcUserinfoUrl
    );
    const enabled = nextProps.enabled !== false;

    if (enabled) {
      if (!clientId) {
        throw new Error("clientId is required when frontend OIDC is enabled");
      }
      if (!hasClientSecret) {
        throw new Error("clientSecret is required when frontend OIDC is enabled");
      }
      if (
        !hasUsableOidcEndpoints({
          issuer,
          authorizationUrl,
          tokenUrl,
          userinfoUrl,
        })
      ) {
        throw new Error(
          "OIDC endpoints are incomplete. Provide issuer or all three explicit endpoints."
        );
      }
    }

    const now = Date.now();
    let settingsId: Id<"objects">;

    if (existing) {
      await ctx.db.patch(existing._id, {
        customProperties: nextProps,
        updatedAt: now,
      });
      settingsId = existing._id;
    } else {
      settingsId = await ctx.db.insert("objects", {
        organizationId,
        type: FRONTEND_OIDC_SETTINGS_TYPE,
        subtype: FRONTEND_OIDC_SETTINGS_SUBTYPE,
        name: "Frontend OIDC Integration",
        status: "active",
        customProperties: nextProps,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      settingsId,
      enabled,
      configured: Boolean(
        enabled &&
          clientId &&
          hasClientSecret &&
          hasUsableOidcEndpoints({
            issuer,
            authorizationUrl,
            tokenUrl,
            userinfoUrl,
          })
      ),
    };
  },
});

function normalizeOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeCleanupLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_FRONTEND_OIDC_STATE_CLEANUP_LIMIT;
  }
  return Math.max(
    1,
    Math.min(MAX_FRONTEND_OIDC_STATE_CLEANUP_LIMIT, Math.floor(value))
  );
}

function normalizeCleanupRetentionMs(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_FRONTEND_OIDC_STATE_RETENTION_MS;
  }
  return Math.max(
    MIN_FRONTEND_OIDC_STATE_RETENTION_MS,
    Math.min(MAX_FRONTEND_OIDC_STATE_RETENTION_MS, Math.floor(value))
  );
}

function normalizeCleanupBatchSize(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_FRONTEND_OIDC_STATE_CLEANUP_BATCH_SIZE;
  }
  return Math.max(
    1,
    Math.min(MAX_FRONTEND_OIDC_STATE_CLEANUP_BATCH_SIZE, Math.floor(value))
  );
}

function normalizeCleanupMaxBatches(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_FRONTEND_OIDC_STATE_CLEANUP_MAX_BATCHES;
  }
  return Math.max(
    1,
    Math.min(MAX_FRONTEND_OIDC_STATE_CLEANUP_MAX_BATCHES, Math.floor(value))
  );
}

export const createFrontendOidcStateInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    state: v.string(),
    nonce: v.string(),
    codeVerifier: v.string(),
    codeChallenge: v.string(),
    codeChallengeMethod: v.string(),
    clientId: v.string(),
    redirectUri: v.string(),
    returnUrl: v.optional(v.string()),
    providerId: v.string(),
    providerName: v.string(),
    issuer: v.optional(v.string()),
    authorizationUrl: v.string(),
    tokenUrl: v.string(),
    userinfoUrl: v.optional(v.string()),
    scope: v.string(),
    subClaim: v.string(),
    emailClaim: v.string(),
    emailVerifiedClaim: v.string(),
    requireVerifiedEmail: v.boolean(),
    nameClaim: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const customProperties: Record<string, unknown> = {
      state: args.state,
      nonce: args.nonce,
      codeVerifier: args.codeVerifier,
      codeChallenge: args.codeChallenge,
      codeChallengeMethod: args.codeChallengeMethod,
      clientId: args.clientId,
      redirectUri: args.redirectUri,
      providerId: args.providerId,
      providerName: args.providerName,
      authorizationUrl: args.authorizationUrl,
      tokenUrl: args.tokenUrl,
      scope: args.scope,
      subClaim: args.subClaim,
      emailClaim: args.emailClaim,
      emailVerifiedClaim: args.emailVerifiedClaim,
      requireVerifiedEmail: args.requireVerifiedEmail,
      nameClaim: args.nameClaim,
      expiresAt: args.expiresAt,
      requestedAt: now,
    };

    const returnUrl = normalizeOptionalString(args.returnUrl);
    if (returnUrl) {
      customProperties.returnUrl = returnUrl;
    }
    const issuer = normalizeOptionalString(args.issuer);
    if (issuer) {
      customProperties.issuer = issuer;
    }
    const userinfoUrl = normalizeOptionalString(args.userinfoUrl);
    if (userinfoUrl) {
      customProperties.userinfoUrl = userinfoUrl;
    }

    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type_name", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", FRONTEND_OIDC_STATE_TYPE)
          .eq("name", args.state)
      )
      .filter((q) => q.eq(q.field("subtype"), FRONTEND_OIDC_STATE_SUBTYPE))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        subtype: FRONTEND_OIDC_STATE_SUBTYPE,
        status: FRONTEND_OIDC_STATE_STATUS_ACTIVE,
        description: "Frontend OIDC transaction state",
        customProperties,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: FRONTEND_OIDC_STATE_TYPE,
      subtype: FRONTEND_OIDC_STATE_SUBTYPE,
      name: args.state,
      description: "Frontend OIDC transaction state",
      status: FRONTEND_OIDC_STATE_STATUS_ACTIVE,
      customProperties,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const consumeFrontendOidcStateInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const stateObject = await ctx.db
      .query("objects")
      .withIndex("by_org_type_name", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("type", FRONTEND_OIDC_STATE_TYPE)
          .eq("name", args.state)
      )
      .filter((q) => q.eq(q.field("subtype"), FRONTEND_OIDC_STATE_SUBTYPE))
      .first();

    if (!stateObject) {
      return {
        status: "missing" as const,
      };
    }

    const props = toObject(stateObject.customProperties);
    const expiresAt = normalizeOptionalNumber(props.expiresAt);
    const normalizedStatus = normalizeOptionalString(stateObject.status) || "";

    if (normalizedStatus !== FRONTEND_OIDC_STATE_STATUS_ACTIVE) {
      return {
        status:
          normalizedStatus === FRONTEND_OIDC_STATE_STATUS_EXPIRED
            ? ("expired" as const)
            : ("already_used" as const),
      };
    }

    if (expiresAt !== null && expiresAt <= now) {
      await ctx.db.patch(stateObject._id, {
        status: FRONTEND_OIDC_STATE_STATUS_EXPIRED,
        updatedAt: now,
        customProperties: {
          ...props,
          consumedAt: now,
          expiredAt: now,
        },
      });
      return {
        status: "expired" as const,
      };
    }

    await ctx.db.patch(stateObject._id, {
      status: FRONTEND_OIDC_STATE_STATUS_USED,
      updatedAt: now,
      customProperties: {
        ...props,
        consumedAt: now,
      },
    });

    return {
      status: "consumed" as const,
      value: {
        state: normalizeOptionalString(props.state) || args.state,
        nonce: normalizeOptionalString(props.nonce),
        codeVerifier: normalizeOptionalString(props.codeVerifier),
        codeChallenge: normalizeOptionalString(props.codeChallenge),
        codeChallengeMethod:
          normalizeOptionalString(props.codeChallengeMethod) || "S256",
        clientId: normalizeOptionalString(props.clientId),
        redirectUri: normalizeOptionalString(props.redirectUri),
        returnUrl: normalizeOptionalString(props.returnUrl),
        providerId: normalizeOptionalString(props.providerId),
        providerName: normalizeOptionalString(props.providerName),
        issuer: normalizeOptionalString(props.issuer),
        authorizationUrl: normalizeOptionalString(props.authorizationUrl),
        tokenUrl: normalizeOptionalString(props.tokenUrl),
        userinfoUrl: normalizeOptionalString(props.userinfoUrl),
        scope: normalizeOptionalString(props.scope),
        subClaim: normalizeOptionalString(props.subClaim),
        emailClaim: normalizeOptionalString(props.emailClaim),
        emailVerifiedClaim: normalizeOptionalString(props.emailVerifiedClaim),
        requireVerifiedEmail: props.requireVerifiedEmail !== false,
        nameClaim: normalizeOptionalString(props.nameClaim),
        requestedAt: normalizeOptionalNumber(props.requestedAt),
        consumedAt: now,
        expiresAt,
      },
    };
  },
});

/**
 * Cleanup lifecycle for frontend OIDC one-time state rows.
 *
 * - Marks expired `active` state rows as `expired`
 * - Deletes `used` / `expired` rows past retention cutoff
 */
export const cleanupExpiredFrontendOidcStateInternal = internalMutation({
  args: {
    limit: v.optional(v.number()),
    batchSize: v.optional(v.number()),
    maxBatches: v.optional(v.number()),
    cursor: v.optional(v.string()),
    retentionMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const requestedLimit = normalizeCleanupLimit(args.limit);
    const batchSize = normalizeCleanupBatchSize(args.batchSize);
    const maxBatches = normalizeCleanupMaxBatches(args.maxBatches);
    const retentionMs = normalizeCleanupRetentionMs(args.retentionMs);
    const retentionCutoff = now - retentionMs;

    let scanned = 0;
    let markedExpired = 0;
    let deleted = 0;
    const errors: Array<{
      objectId: string;
      operation: "mark_expired" | "delete";
      message: string;
    }> = [];
    const batchProgress: Array<{
      batchIndex: number;
      scanned: number;
      markedExpired: number;
      deleted: number;
      remainingLimit: number;
    }> = [];
    let batchesProcessed = 0;
    let cursor = normalizeOptionalString(args.cursor);
    let hasMore = true;

    while (
      hasMore &&
      batchesProcessed < maxBatches &&
      scanned < requestedLimit
    ) {
      const remainingLimit = Math.max(0, requestedLimit - scanned);
      const pageSize = Math.max(1, Math.min(batchSize, remainingLimit));
      const page = await ctx.db
        .query("objects")
        .withIndex("by_type_subtype", (q) =>
          q
            .eq("type", FRONTEND_OIDC_STATE_TYPE)
            .eq("subtype", FRONTEND_OIDC_STATE_SUBTYPE)
        )
        .paginate({
          cursor: cursor || null,
          numItems: pageSize,
        });

      batchesProcessed += 1;
      cursor = page.continueCursor;
      hasMore = page.isDone !== true;

      let batchScanned = 0;
      let batchMarkedExpired = 0;
      let batchDeleted = 0;

      for (const stateRow of page.page) {
        scanned += 1;
        batchScanned += 1;

        const status = normalizeOptionalString(stateRow.status);
        const props = toObject(stateRow.customProperties);
        const expiresAt = normalizeOptionalNumber(props.expiresAt);

        if (
          status === FRONTEND_OIDC_STATE_STATUS_ACTIVE &&
          expiresAt !== null &&
          expiresAt <= now
        ) {
          try {
            await ctx.db.patch(stateRow._id, {
              status: FRONTEND_OIDC_STATE_STATUS_EXPIRED,
              updatedAt: now,
              customProperties: {
                ...props,
                expiredAt: now,
              },
            });
            markedExpired += 1;
            batchMarkedExpired += 1;
          } catch (error) {
            errors.push({
              objectId: String(stateRow._id),
              operation: "mark_expired",
              message: error instanceof Error ? error.message : "Unknown patch error",
            });
          }
          continue;
        }

        if (
          (status === FRONTEND_OIDC_STATE_STATUS_USED ||
            status === FRONTEND_OIDC_STATE_STATUS_EXPIRED) &&
          stateRow.updatedAt <= retentionCutoff
        ) {
          try {
            await ctx.db.delete(stateRow._id);
            deleted += 1;
            batchDeleted += 1;
          } catch (error) {
            errors.push({
              objectId: String(stateRow._id),
              operation: "delete",
              message: error instanceof Error ? error.message : "Unknown delete error",
            });
          }
        }
      }

      batchProgress.push({
        batchIndex: batchesProcessed,
        scanned: batchScanned,
        markedExpired: batchMarkedExpired,
        deleted: batchDeleted,
        remainingLimit: Math.max(0, requestedLimit - scanned),
      });

      if (page.page.length === 0) {
        hasMore = false;
      }
    }

    return {
      success: true,
      scanned,
      markedExpired,
      deleted,
      batchesProcessed,
      requestedLimit,
      batchSize,
      maxBatches,
      reachedScanLimit: scanned >= requestedLimit,
      hasMore,
      nextCursor: hasMore ? cursor : null,
      batchProgress,
      errors,
      errorCount: errors.length,
      retentionMs,
      retentionCutoff,
    };
  },
});
