import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  requireAuthenticatedUser,
  requirePermission,
} from "./rbacHelpers";

const FRONTEND_SURFACE_BINDING_OBJECT_TYPE = "frontend_surface_binding" as const;
const FRONTEND_SURFACE_BINDING_CONTRACT_VERSION =
  "frontend_surface_binding_v1" as const;
const DEFAULT_SURFACE_TYPE = "booking";
const DEFAULT_SURFACE_KEY = "default";

type FrontendSurfaceBindingRecord = {
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  name?: string;
  status?: string;
  customProperties?: unknown;
  updatedAt: number;
};

type BindingIdentity = {
  appSlug: string;
  surfaceType: string;
  surfaceKey: string;
  enabled: boolean;
  priority: number;
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeIdentityToken(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }
  return normalized.toLowerCase();
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true" || value === 1 || value === "1") {
    return true;
  }
  if (value === "false" || value === 0 || value === "0") {
    return false;
  }
  return null;
}

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeIdentityFromCustomProperties(
  customProperties: unknown,
): BindingIdentity | null {
  const cp = normalizeRecord(customProperties);
  if (!cp) {
    return null;
  }

  const appSlug = normalizeIdentityToken(cp.appSlug);
  if (!appSlug) {
    return null;
  }

  const surfaceType =
    normalizeIdentityToken(cp.surfaceType) || DEFAULT_SURFACE_TYPE;
  const surfaceKey =
    normalizeIdentityToken(cp.surfaceKey) || DEFAULT_SURFACE_KEY;
  const enabled = normalizeOptionalBoolean(cp.enabled) !== false;
  const priority = Math.round(normalizeOptionalNumber(cp.priority) || 0);

  return {
    appSlug,
    surfaceType,
    surfaceKey,
    enabled,
    priority,
  };
}

function isActiveBindingStatus(status: string | undefined): boolean {
  if (!status) {
    return true;
  }
  const normalized = status.trim().toLowerCase();
  return normalized !== "archived"
    && normalized !== "deleted"
    && normalized !== "inactive";
}

function extractBindingPayload(customProperties: unknown): {
  runtimeConfig: Record<string, unknown> | null;
  legacyBindings: unknown;
  metadata: Record<string, unknown>;
} {
  const cp = normalizeRecord(customProperties) || {};
  const runtimeConfig = normalizeRecord(cp.runtimeConfig || cp.bookingRuntimeConfig);
  const legacyBindings = cp.legacyBindings || cp.courseBindings || null;
  return {
    runtimeConfig,
    legacyBindings,
    metadata: cp,
  };
}

function bindingMatchesIdentity(args: {
  bindingIdentity: BindingIdentity;
  appSlug: string;
  surfaceType: string;
  surfaceKey: string;
}): boolean {
  return args.bindingIdentity.appSlug === args.appSlug
    && args.bindingIdentity.surfaceType === args.surfaceType
    && args.bindingIdentity.surfaceKey === args.surfaceKey;
}

async function listSurfaceBindingObjects(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
}): Promise<FrontendSurfaceBindingRecord[]> {
  return (await args.ctx.db
    .query("objects")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex("by_org_type", (q: any) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("type", FRONTEND_SURFACE_BINDING_OBJECT_TYPE)
    )
    .collect()) as FrontendSurfaceBindingRecord[];
}

function sortBindingRecords(
  bindings: Array<{
    record: FrontendSurfaceBindingRecord;
    identity: BindingIdentity;
  }>,
) {
  return [...bindings].sort((left, right) => {
    if (right.identity.priority !== left.identity.priority) {
      return right.identity.priority - left.identity.priority;
    }
    if (right.record.updatedAt !== left.record.updatedAt) {
      return right.record.updatedAt - left.record.updatedAt;
    }
    return String(left.record._id).localeCompare(String(right.record._id));
  });
}

function selectMatchingBinding(args: {
  records: FrontendSurfaceBindingRecord[];
  appSlug: string;
  surfaceType: string;
  surfaceKey: string;
  allowDisabled: boolean;
}): {
  record: FrontendSurfaceBindingRecord;
  identity: BindingIdentity;
} | null {
  const candidates = args.records
    .filter((record) => isActiveBindingStatus(record.status))
    .map((record) => ({
      record,
      identity: normalizeIdentityFromCustomProperties(record.customProperties),
    }))
    .filter((entry): entry is { record: FrontendSurfaceBindingRecord; identity: BindingIdentity } => Boolean(entry.identity))
    .filter((entry) =>
      bindingMatchesIdentity({
        bindingIdentity: entry.identity,
        appSlug: args.appSlug,
        surfaceType: args.surfaceType,
        surfaceKey: args.surfaceKey,
      })
    )
    .filter((entry) => args.allowDisabled || entry.identity.enabled);

  if (candidates.length === 0) {
    return null;
  }

  return sortBindingRecords(candidates)[0];
}

export const resolveBookingSurfaceBindingInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    appSlug: v.string(),
    surfaceType: v.optional(v.string()),
    surfaceKey: v.optional(v.string()),
    allowDisabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const appSlug = normalizeIdentityToken(args.appSlug);
    if (!appSlug) {
      return null;
    }
    const surfaceType =
      normalizeIdentityToken(args.surfaceType) || DEFAULT_SURFACE_TYPE;
    const surfaceKey =
      normalizeIdentityToken(args.surfaceKey) || DEFAULT_SURFACE_KEY;
    const allowDisabled = args.allowDisabled === true;

    const records = await listSurfaceBindingObjects({
      ctx: { db: ctx.db },
      organizationId: args.organizationId,
    });

    const selected = selectMatchingBinding({
      records,
      appSlug,
      surfaceType,
      surfaceKey,
      allowDisabled,
    });
    if (!selected) {
      return null;
    }

    const payload = extractBindingPayload(selected.record.customProperties);

    return {
      bindingId: selected.record._id,
      contractVersion: FRONTEND_SURFACE_BINDING_CONTRACT_VERSION,
      appSlug: selected.identity.appSlug,
      surfaceType: selected.identity.surfaceType,
      surfaceKey: selected.identity.surfaceKey,
      enabled: selected.identity.enabled,
      priority: selected.identity.priority,
      runtimeConfig: payload.runtimeConfig,
      legacyBindings: payload.legacyBindings,
      updatedAt: selected.record.updatedAt,
      name: selected.record.name || null,
    };
  },
});

export const listBookingSurfaceBindingsInternal = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    appSlug: v.optional(v.string()),
    surfaceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const requestedAppSlug = normalizeIdentityToken(args.appSlug);
    const requestedSurfaceType = normalizeIdentityToken(args.surfaceType);

    const records = await listSurfaceBindingObjects({
      ctx: { db: ctx.db },
      organizationId: args.organizationId,
    });

    return records
      .map((record) => ({
        record,
        identity: normalizeIdentityFromCustomProperties(record.customProperties),
        payload: extractBindingPayload(record.customProperties),
      }))
      .filter((entry): entry is {
        record: FrontendSurfaceBindingRecord;
        identity: BindingIdentity;
        payload: ReturnType<typeof extractBindingPayload>;
      } => Boolean(entry.identity))
      .filter((entry) =>
        requestedAppSlug ? entry.identity.appSlug === requestedAppSlug : true
      )
      .filter((entry) =>
        requestedSurfaceType
          ? entry.identity.surfaceType === requestedSurfaceType
          : true
      )
      .sort((left, right) => right.record.updatedAt - left.record.updatedAt)
      .map((entry) => ({
        bindingId: entry.record._id,
        appSlug: entry.identity.appSlug,
        surfaceType: entry.identity.surfaceType,
        surfaceKey: entry.identity.surfaceKey,
        enabled: entry.identity.enabled,
        priority: entry.identity.priority,
        status: entry.record.status || "active",
        updatedAt: entry.record.updatedAt,
        name: entry.record.name || null,
        hasRuntimeConfig: Boolean(entry.payload.runtimeConfig),
        hasLegacyBindings:
          Boolean(
            entry.payload.legacyBindings
              && typeof entry.payload.legacyBindings === "object"
          ),
      }));
  },
});

export const listBookingSurfaceBindings = query({
  args: {
    sessionId: v.string(),
    appSlug: v.optional(v.string()),
    surfaceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const requestedAppSlug = normalizeIdentityToken(args.appSlug);
    const requestedSurfaceType = normalizeIdentityToken(args.surfaceType);

    const records = await listSurfaceBindingObjects({
      ctx: { db: ctx.db },
      organizationId: auth.organizationId,
    });

    const mapped = records
      .map((record) => ({
        record,
        identity: normalizeIdentityFromCustomProperties(record.customProperties),
        payload: extractBindingPayload(record.customProperties),
      }))
      .filter((entry): entry is {
        record: FrontendSurfaceBindingRecord;
        identity: BindingIdentity;
        payload: ReturnType<typeof extractBindingPayload>;
      } => Boolean(entry.identity))
      .filter((entry) =>
        requestedAppSlug ? entry.identity.appSlug === requestedAppSlug : true
      )
      .filter((entry) =>
        requestedSurfaceType
          ? entry.identity.surfaceType === requestedSurfaceType
          : true
      )
      .sort((left, right) => right.record.updatedAt - left.record.updatedAt);

    return mapped.map((entry) => ({
      bindingId: entry.record._id,
      appSlug: entry.identity.appSlug,
      surfaceType: entry.identity.surfaceType,
      surfaceKey: entry.identity.surfaceKey,
      enabled: entry.identity.enabled,
      priority: entry.identity.priority,
      status: entry.record.status || "active",
      updatedAt: entry.record.updatedAt,
      name: entry.record.name || null,
      hasRuntimeConfig: Boolean(entry.payload.runtimeConfig),
      hasLegacyBindings:
        Boolean(
          entry.payload.legacyBindings
            && typeof entry.payload.legacyBindings === "object"
        ),
    }));
  },
});

export const upsertBookingSurfaceBindingInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.optional(v.id("users")),
    appSlug: v.string(),
    surfaceType: v.optional(v.string()),
    surfaceKey: v.optional(v.string()),
    name: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    priority: v.optional(v.number()),
    runtimeConfig: v.optional(v.any()),
    legacyBindings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const appSlug = normalizeIdentityToken(args.appSlug);
    if (!appSlug) {
      throw new Error("appSlug is required");
    }
    const surfaceType =
      normalizeIdentityToken(args.surfaceType) || DEFAULT_SURFACE_TYPE;
    const surfaceKey =
      normalizeIdentityToken(args.surfaceKey) || DEFAULT_SURFACE_KEY;
    const enabled = args.enabled !== false;
    const priority = Math.round(normalizeOptionalNumber(args.priority) || 0);
    const now = Date.now();

    const records = await listSurfaceBindingObjects({
      ctx: { db: ctx.db },
      organizationId: args.organizationId,
    });

    const existing = selectMatchingBinding({
      records,
      appSlug,
      surfaceType,
      surfaceKey,
      allowDisabled: true,
    });

    const existingPayload = existing
      ? extractBindingPayload(existing.record.customProperties)
      : { runtimeConfig: null, legacyBindings: null };

    const runtimeConfig =
      normalizeRecord(args.runtimeConfig)
      || existingPayload.runtimeConfig;
    if (!runtimeConfig) {
      throw new Error("runtimeConfig is required");
    }

    const legacyBindings =
      typeof args.legacyBindings === "undefined"
        ? existingPayload.legacyBindings
        : args.legacyBindings;

    const bindingName =
      normalizeOptionalString(args.name)
      || existing?.record.name
      || `${appSlug}:${surfaceType}:${surfaceKey}`;

    const customProperties = {
      contractVersion: FRONTEND_SURFACE_BINDING_CONTRACT_VERSION,
      appSlug,
      surfaceType,
      surfaceKey,
      enabled,
      priority,
      runtimeConfig,
      legacyBindings,
      updatedByUserId: args.userId ? String(args.userId) : null,
      updatedAt: now,
    };

    let bindingId: Id<"objects">;
    if (existing) {
      bindingId = existing.record._id;
      await ctx.db.patch(existing.record._id, {
        name: bindingName,
        status: "active",
        customProperties,
        updatedAt: now,
      });
    } else {
      bindingId = await ctx.db.insert("objects", {
        organizationId: args.organizationId,
        type: FRONTEND_SURFACE_BINDING_OBJECT_TYPE,
        subtype: surfaceType,
        name: bindingName,
        status: "active",
        customProperties,
        createdBy: args.userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      bindingId,
      created: !existing,
      appSlug,
      surfaceType,
      surfaceKey,
      enabled,
      priority,
      runtimeConfig,
      legacyBindings,
    };
  },
});

export const saveBookingSurfaceBinding = mutation({
  args: {
    sessionId: v.string(),
    appSlug: v.string(),
    surfaceType: v.optional(v.string()),
    surfaceKey: v.optional(v.string()),
    name: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    priority: v.optional(v.number()),
    runtimeConfig: v.optional(v.any()),
    legacyBindings: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    await requirePermission(ctx, auth.userId, "manage_organization", {
      organizationId: auth.organizationId,
      errorMessage:
        "Nur Organisations-Admins können Frontend-Surface-Bindings aktualisieren.",
    });

    return ctx.runMutation(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("./_generated/api").internal.frontendSurfaceBindings
        .upsertBookingSurfaceBindingInternal,
      {
        organizationId: auth.organizationId,
        userId: auth.userId,
        appSlug: args.appSlug,
        surfaceType: args.surfaceType,
        surfaceKey: args.surfaceKey,
        name: args.name,
        enabled: args.enabled,
        priority: args.priority,
        runtimeConfig: args.runtimeConfig,
        legacyBindings: args.legacyBindings,
      }
    );
  },
});
