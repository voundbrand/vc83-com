import { internalMutation, internalQuery, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { checkPermission, requireAuthenticatedUser, requirePermission } from "./rbacHelpers";

const CMS_CONTENT_TYPE = "cms_content" as const;
const CMS_PAGE_NAME_DELIMITER = "_";
const CMS_PREFIX_UPPER_BOUND_SUFFIX = "\uffff";
const CMS_IMAGE_METADATA_CONTRACT_VERSION = "cms_image_v1" as const;
const CMS_DEFAULT_STATUS = "draft" as const;
const CMS_PUBLISHED_STATUSES = new Set(["published", "active"]);

type CmsObjectDoc = Doc<"objects"> & { type: "cms_content" };
type CmsReadCtx = QueryCtx | MutationCtx;

type CmsImageMetadata = {
  contractVersion: typeof CMS_IMAGE_METADATA_CONTRACT_VERSION;
  storageId?: Id<"_storage">;
  previousStorageId?: Id<"_storage">;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  alt?: string;
  width?: number;
  height?: number;
  usage: string;
  localeMode: "agnostic" | "localized";
  blurDataUrl?: string;
  focalPoint?: {
    x: number;
    y: number;
  };
  deletedAt?: number;
  deletedBy?: Id<"users">;
};

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return normalized;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeNullableString(value: unknown): string | undefined {
  if (value === null) {
    return undefined;
  }
  return normalizeOptionalString(value);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function isCmsObject(record: Doc<"objects"> | null): record is CmsObjectDoc {
  return Boolean(record && record.type === CMS_CONTENT_TYPE);
}

function isPublishedCmsStatus(status: string): boolean {
  return CMS_PUBLISHED_STATUSES.has(status);
}

function shouldRequirePublishPermission(currentStatus: string | undefined, nextStatus: string): boolean {
  return currentStatus !== nextStatus && (currentStatus === "published" || nextStatus === "published");
}

function resolveNullableField<T>(
  incoming: T | null | undefined,
  existing: T | undefined
): T | undefined {
  if (incoming === undefined) {
    return existing;
  }
  if (incoming === null) {
    return undefined;
  }
  return incoming;
}

function omitUndefinedFields<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as T;
}

function getCmsPagePrefixBounds(pagePrefix: string): {
  lowerBound: string;
  upperBound: string;
} {
  const normalized = normalizeRequiredString(pagePrefix, "pagePrefix").replace(
    new RegExp(`${CMS_PAGE_NAME_DELIMITER}+$`),
    ""
  );
  const lowerBound = `${normalized}${CMS_PAGE_NAME_DELIMITER}`;
  return {
    lowerBound,
    upperBound: `${lowerBound}${CMS_PREFIX_UPPER_BOUND_SUFFIX}`,
  };
}

async function getCmsObjectByExactLocaleName(
  ctx: CmsReadCtx,
  organizationId: Id<"organizations">,
  locale: string,
  name: string
): Promise<CmsObjectDoc | null> {
  const record = await ctx.db
    .query("objects")
    .withIndex("by_org_type_locale_name", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("type", CMS_CONTENT_TYPE)
        .eq("locale", locale)
        .eq("name", name)
    )
    .first();

  return isCmsObject(record) ? record : null;
}

async function listCmsObjectsByExactName(
  ctx: CmsReadCtx,
  organizationId: Id<"organizations">,
  name: string
): Promise<CmsObjectDoc[]> {
  const records = await ctx.db
    .query("objects")
    .withIndex("by_org_type_name", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("type", CMS_CONTENT_TYPE)
        .eq("name", name)
    )
    .collect();

  return records.filter(isCmsObject);
}

async function listCmsObjectsByNamePrefix(
  ctx: CmsReadCtx,
  organizationId: Id<"organizations">,
  pagePrefix: string
): Promise<CmsObjectDoc[]> {
  const { lowerBound, upperBound } = getCmsPagePrefixBounds(pagePrefix);
  const records = await ctx.db
    .query("objects")
    .withIndex("by_org_type_name", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("type", CMS_CONTENT_TYPE)
        .gte("name", lowerBound)
        .lt("name", upperBound)
    )
    .collect();

  return records.filter(isCmsObject);
}

async function listCmsObjectsByLocalePrefix(
  ctx: CmsReadCtx,
  organizationId: Id<"organizations">,
  locale: string,
  pagePrefix: string
): Promise<CmsObjectDoc[]> {
  const { lowerBound, upperBound } = getCmsPagePrefixBounds(pagePrefix);
  const records = await ctx.db
    .query("objects")
    .withIndex("by_org_type_locale_name", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("type", CMS_CONTENT_TYPE)
        .eq("locale", locale)
        .gte("name", lowerBound)
        .lt("name", upperBound)
    )
    .collect();

  return records.filter(isCmsObject);
}

async function requireCmsReadAccess(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  sessionId: string | undefined
): Promise<void> {
  if (!sessionId) {
    throw new Error("sessionId is required when includeUnpublished is true");
  }

  const { userId } = await requireAuthenticatedUser(ctx, sessionId);
  const canReadUnpublished = await checkPermission(
    ctx,
    userId,
    "edit_published_pages",
    organizationId
  );
  if (!canReadUnpublished) {
    throw new Error("Permission denied: edit_published_pages required");
  }
}

async function requireCmsWriteAccess(args: {
  ctx: MutationCtx;
  sessionId: string;
  organizationId: Id<"organizations">;
  requireMediaUpload?: boolean;
  currentStatus?: string;
  nextStatus: string;
}): Promise<Id<"users">> {
  const { userId } = await requireAuthenticatedUser(args.ctx, args.sessionId);

  await requirePermission(args.ctx, userId, "edit_published_pages", {
    organizationId: args.organizationId,
  });

  if (args.requireMediaUpload) {
    await requirePermission(args.ctx, userId, "media_library.upload", {
      organizationId: args.organizationId,
    });
  }

  if (shouldRequirePublishPermission(args.currentStatus, args.nextStatus)) {
    await requirePermission(args.ctx, userId, "publish_pages", {
      organizationId: args.organizationId,
    });
  }

  return userId;
}

function parseCmsImageMetadata(record: CmsObjectDoc): CmsImageMetadata | null {
  if (record.subtype !== "image") {
    return null;
  }
  const customProperties = asRecord(record.customProperties);
  if (!customProperties) {
    return null;
  }

  const filename = normalizeOptionalString(customProperties.filename);
  const mimeType = normalizeOptionalString(customProperties.mimeType);
  const usage = normalizeOptionalString(customProperties.usage) || record.name;
  const sizeBytes =
    typeof customProperties.sizeBytes === "number" && Number.isFinite(customProperties.sizeBytes)
      ? customProperties.sizeBytes
      : 0;
  const width =
    typeof customProperties.width === "number" && Number.isFinite(customProperties.width)
      ? customProperties.width
      : undefined;
  const height =
    typeof customProperties.height === "number" && Number.isFinite(customProperties.height)
      ? customProperties.height
      : undefined;
  const focalPoint = asRecord(customProperties.focalPoint);
  const storageId = normalizeOptionalString(customProperties.storageId) as Id<"_storage"> | undefined;
  const previousStorageId = normalizeOptionalString(
    customProperties.previousStorageId
  ) as Id<"_storage"> | undefined;
  const deletedBy = normalizeOptionalString(customProperties.deletedBy) as Id<"users"> | undefined;
  const deletedAt =
    typeof customProperties.deletedAt === "number" && Number.isFinite(customProperties.deletedAt)
      ? customProperties.deletedAt
      : undefined;

  if (!filename || !mimeType) {
    return null;
  }

  return {
    contractVersion: CMS_IMAGE_METADATA_CONTRACT_VERSION,
    storageId,
    previousStorageId,
    filename,
    mimeType,
    sizeBytes,
    alt: normalizeOptionalString(customProperties.alt),
    width,
    height,
    usage,
    localeMode: record.locale ? "localized" : "agnostic",
    blurDataUrl: normalizeOptionalString(customProperties.blurDataUrl),
    focalPoint:
      typeof focalPoint?.x === "number" &&
      Number.isFinite(focalPoint.x) &&
      typeof focalPoint?.y === "number" &&
      Number.isFinite(focalPoint.y)
        ? {
            x: focalPoint.x,
            y: focalPoint.y,
          }
        : undefined,
    deletedAt,
    deletedBy,
  };
}

function buildCmsImageCustomProperties(args: {
  name: string;
  locale?: string;
  storageId?: Id<"_storage">;
  previousStorageId?: Id<"_storage">;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  alt?: string;
  width?: number;
  height?: number;
  blurDataUrl?: string;
  focalPoint?: {
    x: number;
    y: number;
  };
  customProperties?: Record<string, unknown>;
  deletedAt?: number;
  deletedBy?: Id<"users">;
}): Record<string, unknown> {
  const nextCustomProperties: Record<string, unknown> = {
    ...(args.customProperties || {}),
    contractVersion: CMS_IMAGE_METADATA_CONTRACT_VERSION,
    filename: args.filename,
    mimeType: args.mimeType,
    sizeBytes: args.sizeBytes,
    usage: args.name,
    localeMode: args.locale ? "localized" : "agnostic",
  };

  if (args.storageId) {
    nextCustomProperties.storageId = args.storageId;
  } else {
    delete nextCustomProperties.storageId;
  }

  if (args.previousStorageId) {
    nextCustomProperties.previousStorageId = args.previousStorageId;
  } else {
    delete nextCustomProperties.previousStorageId;
  }

  if (args.alt) {
    nextCustomProperties.alt = args.alt;
  } else {
    delete nextCustomProperties.alt;
  }

  if (typeof args.width === "number") {
    nextCustomProperties.width = args.width;
  } else {
    delete nextCustomProperties.width;
  }

  if (typeof args.height === "number") {
    nextCustomProperties.height = args.height;
  } else {
    delete nextCustomProperties.height;
  }

  if (args.blurDataUrl) {
    nextCustomProperties.blurDataUrl = args.blurDataUrl;
  } else {
    delete nextCustomProperties.blurDataUrl;
  }

  if (args.focalPoint) {
    nextCustomProperties.focalPoint = args.focalPoint;
  } else {
    delete nextCustomProperties.focalPoint;
  }

  if (typeof args.deletedAt === "number") {
    nextCustomProperties.deletedAt = args.deletedAt;
  } else {
    delete nextCustomProperties.deletedAt;
  }

  if (args.deletedBy) {
    nextCustomProperties.deletedBy = args.deletedBy;
  } else {
    delete nextCustomProperties.deletedBy;
  }

  return nextCustomProperties;
}

async function resolveCmsFileUrl(
  ctx: CmsReadCtx,
  record: CmsObjectDoc
): Promise<string | null> {
  const imageMetadata = parseCmsImageMetadata(record);
  if (!imageMetadata?.storageId) {
    return null;
  }
  return await ctx.storage.getUrl(imageMetadata.storageId);
}

async function serializeCmsObject(
  ctx: CmsReadCtx,
  record: CmsObjectDoc
): Promise<{
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  type: "cms_content";
  subtype?: string;
  name: string;
  locale?: string;
  value?: string;
  description?: string;
  status: string;
  customProperties?: Record<string, unknown>;
  createdBy?: Id<"users"> | Id<"objects">;
  createdAt: number;
  updatedAt: number;
  fileUrl: string | null;
  imageMetadata: CmsImageMetadata | null;
}> {
  const imageMetadata = parseCmsImageMetadata(record);
  return omitUndefinedFields({
    _id: record._id,
    organizationId: record.organizationId,
    type: CMS_CONTENT_TYPE,
    subtype: record.subtype,
    name: record.name,
    locale: record.locale,
    value: record.value,
    description: record.description,
    status: record.status,
    customProperties: asRecord(record.customProperties),
    createdBy: record.createdBy,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    fileUrl: await resolveCmsFileUrl(ctx, record),
    imageMetadata,
  });
}

async function findCmsRecordForUpsert(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  name: string;
  locale?: string;
}): Promise<CmsObjectDoc | null> {
  if (args.locale) {
    return await getCmsObjectByExactLocaleName(args.ctx, args.organizationId, args.locale, args.name);
  }

  const exactMatches = await listCmsObjectsByExactName(args.ctx, args.organizationId, args.name);
  return exactMatches.find((record) => !record.locale) || null;
}

async function replaceCmsRecord(
  ctx: MutationCtx,
  record: CmsObjectDoc,
  replacement: {
    subtype?: string;
    name: string;
    locale?: string;
    value?: string;
    description?: string;
    status: string;
    customProperties?: Record<string, unknown>;
    updatedAt: number;
  }
): Promise<void> {
  await ctx.db.replace(
    record._id,
    omitUndefinedFields({
      organizationId: record.organizationId,
      type: CMS_CONTENT_TYPE,
      subtype: replacement.subtype,
      name: replacement.name,
      description: replacement.description,
      status: replacement.status,
      locale: replacement.locale,
      value: replacement.value,
      customProperties: replacement.customProperties,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: replacement.updatedAt,
    })
  );
}

async function logCmsAction(args: {
  ctx: MutationCtx;
  organizationId: Id<"organizations">;
  objectId: Id<"objects">;
  actionType: string;
  actionData: Record<string, unknown>;
  performedBy: Id<"users">;
}): Promise<void> {
  await args.ctx.db.insert("objectActions", {
    organizationId: args.organizationId,
    objectId: args.objectId,
    actionType: args.actionType,
    actionData: omitUndefinedFields(args.actionData),
    performedBy: args.performedBy,
    performedAt: Date.now(),
  });
}

export const getCmsObjectByLocaleName = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    locale: v.string(),
    includeUnpublished: v.optional(v.boolean()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = normalizeRequiredString(args.name, "name");
    const locale = normalizeRequiredString(args.locale, "locale");
    const includeUnpublished = args.includeUnpublished === true;

    if (includeUnpublished) {
      await requireCmsReadAccess(ctx, args.organizationId, args.sessionId);
    }

    const record = await getCmsObjectByExactLocaleName(ctx, args.organizationId, locale, name);
    if (!record) {
      return null;
    }
    if (!includeUnpublished && !isPublishedCmsStatus(record.status)) {
      return null;
    }

    return await serializeCmsObject(ctx, record);
  },
});

export const getCmsObjectByName = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    preferredLocale: v.optional(v.string()),
    includeUnpublished: v.optional(v.boolean()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = normalizeRequiredString(args.name, "name");
    const includeUnpublished = args.includeUnpublished === true;

    if (includeUnpublished) {
      await requireCmsReadAccess(ctx, args.organizationId, args.sessionId);
    }

    const matches = (await listCmsObjectsByExactName(ctx, args.organizationId, name)).filter(
      (record) => includeUnpublished || isPublishedCmsStatus(record.status)
    );

    if (matches.length === 0) {
      return null;
    }

    const preferredLocale = normalizeOptionalString(args.preferredLocale);
    const record =
      matches.find((candidate) => !candidate.locale) ||
      (preferredLocale
        ? matches.find((candidate) => candidate.locale === preferredLocale)
        : undefined) ||
      matches[0];

    return await serializeCmsObject(ctx, record);
  },
});

export const listCmsObjectsByPageLocale = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    pagePrefix: v.string(),
    locale: v.string(),
    includeUnpublished: v.optional(v.boolean()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const locale = normalizeRequiredString(args.locale, "locale");
    const pagePrefix = normalizeRequiredString(args.pagePrefix, "pagePrefix");
    const includeUnpublished = args.includeUnpublished === true;

    if (includeUnpublished) {
      await requireCmsReadAccess(ctx, args.organizationId, args.sessionId);
    }

    const localizedRecords = await listCmsObjectsByLocalePrefix(
      ctx,
      args.organizationId,
      locale,
      pagePrefix
    );
    const localeAgnosticRecords = (await listCmsObjectsByNamePrefix(
      ctx,
      args.organizationId,
      pagePrefix
    )).filter((record) => !record.locale);

    const visibleRecords = [...localizedRecords, ...localeAgnosticRecords]
      .filter((record) => includeUnpublished || isPublishedCmsStatus(record.status))
      .sort((a, b) => a.name.localeCompare(b.name) || (a.locale || "").localeCompare(b.locale || ""));

    return await Promise.all(visibleRecords.map((record) => serializeCmsObject(ctx, record)));
  },
});

export const upsertCmsText = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    locale: v.string(),
    value: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    customProperties: v.optional(v.union(v.record(v.string(), v.any()), v.null())),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = normalizeRequiredString(args.name, "name");
    const locale = normalizeRequiredString(args.locale, "locale");
    const nextStatus = normalizeOptionalString(args.status) || CMS_DEFAULT_STATUS;
    const existing = await findCmsRecordForUpsert({
      ctx,
      organizationId: args.organizationId,
      name,
      locale,
    });

    if (existing && existing.subtype && existing.subtype !== "text") {
      throw new Error(`Existing CMS record "${name}" is subtype "${existing.subtype}", expected "text"`);
    }

    const userId = await requireCmsWriteAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      currentStatus: existing?.status,
      nextStatus,
    });

    const now = Date.now();
    const nextDescription = resolveNullableField(
      args.description,
      normalizeOptionalString(existing?.description)
    );

    if (existing) {
      await replaceCmsRecord(ctx, existing, {
        subtype: "text",
        name,
        locale,
        value: args.value,
        description: nextDescription,
        status: nextStatus,
        customProperties: resolveNullableField(args.customProperties, asRecord(existing.customProperties)),
        updatedAt: now,
      });

      await logCmsAction({
        ctx,
        organizationId: args.organizationId,
        objectId: existing._id,
        actionType: "cms_content.updated",
        actionData: {
          subtype: "text",
          name,
          locale,
          status: nextStatus,
        },
        performedBy: userId,
      });

      const updated = await ctx.db.get(existing._id);
      if (!isCmsObject(updated)) {
        throw new Error("Failed to reload updated CMS text record");
      }
      return await serializeCmsObject(ctx, updated);
    }

    const objectId = await ctx.db.insert(
      "objects",
      omitUndefinedFields({
        organizationId: args.organizationId,
        type: CMS_CONTENT_TYPE,
        subtype: "text",
        name,
        description: nextDescription,
        status: nextStatus,
        locale,
        value: args.value,
        customProperties: resolveNullableField(args.customProperties, undefined),
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
    );

    await logCmsAction({
      ctx,
      organizationId: args.organizationId,
      objectId,
      actionType: "cms_content.created",
      actionData: {
        subtype: "text",
        name,
        locale,
        status: nextStatus,
      },
      performedBy: userId,
    });

    const created = await ctx.db.get(objectId);
    if (!isCmsObject(created)) {
      throw new Error("Failed to reload created CMS text record");
    }
    return await serializeCmsObject(ctx, created);
  },
});

export const upsertCmsStructuredContent = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    locale: v.string(),
    subtype: v.string(),
    value: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    customProperties: v.optional(v.union(v.record(v.string(), v.any()), v.null())),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = normalizeRequiredString(args.name, "name");
    const locale = normalizeRequiredString(args.locale, "locale");
    const subtype = normalizeRequiredString(args.subtype, "subtype");
    if (subtype === "text" || subtype === "image") {
      throw new Error("upsertCmsStructuredContent only supports structured CMS subtypes");
    }

    const nextStatus = normalizeOptionalString(args.status) || CMS_DEFAULT_STATUS;
    const existing = await findCmsRecordForUpsert({
      ctx,
      organizationId: args.organizationId,
      name,
      locale,
    });

    if (existing && existing.subtype && existing.subtype !== subtype) {
      throw new Error(
        `Existing CMS record "${name}" is subtype "${existing.subtype}", expected "${subtype}"`
      );
    }

    const userId = await requireCmsWriteAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      currentStatus: existing?.status,
      nextStatus,
    });

    const now = Date.now();
    const nextValue = resolveNullableField(args.value, existing?.value);
    const nextDescription = resolveNullableField(
      args.description,
      normalizeOptionalString(existing?.description)
    );
    const nextCustomProperties = resolveNullableField(
      args.customProperties,
      asRecord(existing?.customProperties)
    );

    if (existing) {
      await replaceCmsRecord(ctx, existing, {
        subtype,
        name,
        locale,
        value: nextValue,
        description: nextDescription,
        status: nextStatus,
        customProperties: nextCustomProperties,
        updatedAt: now,
      });

      await logCmsAction({
        ctx,
        organizationId: args.organizationId,
        objectId: existing._id,
        actionType: "cms_content.updated",
        actionData: {
          subtype,
          name,
          locale,
          status: nextStatus,
        },
        performedBy: userId,
      });

      const updated = await ctx.db.get(existing._id);
      if (!isCmsObject(updated)) {
        throw new Error("Failed to reload updated structured CMS record");
      }
      return await serializeCmsObject(ctx, updated);
    }

    const objectId = await ctx.db.insert(
      "objects",
      omitUndefinedFields({
        organizationId: args.organizationId,
        type: CMS_CONTENT_TYPE,
        subtype,
        name,
        description: nextDescription,
        status: nextStatus,
        locale,
        value: nextValue,
        customProperties: nextCustomProperties,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })
    );

    await logCmsAction({
      ctx,
      organizationId: args.organizationId,
      objectId,
      actionType: "cms_content.created",
      actionData: {
        subtype,
        name,
        locale,
        status: nextStatus,
      },
      performedBy: userId,
    });

    const created = await ctx.db.get(objectId);
    if (!isCmsObject(created)) {
      throw new Error("Failed to reload created structured CMS record");
    }
    return await serializeCmsObject(ctx, created);
  },
});

export const generateCmsUploadUrl = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireCmsWriteAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      requireMediaUpload: true,
      nextStatus: CMS_DEFAULT_STATUS,
    });

    return await ctx.storage.generateUploadUrl();
  },
});

export const upsertCmsImage = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    name: v.string(),
    locale: v.optional(v.union(v.string(), v.null())),
    description: v.optional(v.union(v.string(), v.null())),
    status: v.optional(v.string()),
    storageId: v.id("_storage"),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    alt: v.optional(v.union(v.string(), v.null())),
    width: v.optional(v.union(v.number(), v.null())),
    height: v.optional(v.union(v.number(), v.null())),
    blurDataUrl: v.optional(v.union(v.string(), v.null())),
    focalPoint: v.optional(
      v.union(
        v.object({
          x: v.number(),
          y: v.number(),
        }),
        v.null()
      )
    ),
    customProperties: v.optional(v.union(v.record(v.string(), v.any()), v.null())),
  },
  handler: async (ctx, args) => {
    const name = normalizeRequiredString(args.name, "name");
    const locale = normalizeNullableString(args.locale);
    const nextStatus = normalizeOptionalString(args.status) || CMS_DEFAULT_STATUS;
    const existing = await findCmsRecordForUpsert({
      ctx,
      organizationId: args.organizationId,
      name,
      locale,
    });

    if (existing && existing.subtype && existing.subtype !== "image") {
      throw new Error(`Existing CMS record "${name}" is subtype "${existing.subtype}", expected "image"`);
    }

    const userId = await requireCmsWriteAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      requireMediaUpload: true,
      currentStatus: existing?.status,
      nextStatus,
    });

    const now = Date.now();
    const existingImageMetadata = existing ? parseCmsImageMetadata(existing) : null;
    const customProperties = buildCmsImageCustomProperties({
      name,
      locale,
      storageId: args.storageId,
      filename: normalizeRequiredString(args.filename, "filename"),
      mimeType: normalizeRequiredString(args.mimeType, "mimeType"),
      sizeBytes: args.sizeBytes,
      alt: normalizeNullableString(args.alt),
      width: args.width === null ? undefined : args.width ?? existingImageMetadata?.width,
      height: args.height === null ? undefined : args.height ?? existingImageMetadata?.height,
      blurDataUrl: normalizeNullableString(args.blurDataUrl),
      focalPoint: args.focalPoint === null ? undefined : args.focalPoint || existingImageMetadata?.focalPoint,
      customProperties: resolveNullableField(
        args.customProperties,
        asRecord(existing?.customProperties)
      ),
    });

    let objectId: Id<"objects">;
    if (existing) {
      await replaceCmsRecord(ctx, existing, {
        subtype: "image",
        name,
        locale,
        value: undefined,
        description: resolveNullableField(
          args.description,
          normalizeOptionalString(existing.description)
        ),
        status: nextStatus,
        customProperties,
        updatedAt: now,
      });
      objectId = existing._id;

      if (
        existingImageMetadata?.storageId &&
        existingImageMetadata.storageId !== args.storageId
      ) {
        try {
          await ctx.storage.delete(existingImageMetadata.storageId);
        } catch (error) {
          console.warn("Failed to delete replaced CMS image storage object", error);
        }
      }

      await logCmsAction({
        ctx,
        organizationId: args.organizationId,
        objectId,
        actionType: "cms_content.updated",
        actionData: {
          subtype: "image",
          name,
          locale,
          status: nextStatus,
        },
        performedBy: userId,
      });
    } else {
      objectId = await ctx.db.insert(
        "objects",
        omitUndefinedFields({
          organizationId: args.organizationId,
          type: CMS_CONTENT_TYPE,
          subtype: "image",
          name,
          description: normalizeNullableString(args.description),
          status: nextStatus,
          locale,
          customProperties,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
        })
      );

      await logCmsAction({
        ctx,
        organizationId: args.organizationId,
        objectId,
        actionType: "cms_content.created",
        actionData: {
          subtype: "image",
          name,
          locale,
          status: nextStatus,
        },
        performedBy: userId,
      });
    }

    const record = await ctx.db.get(objectId);
    if (!isCmsObject(record)) {
      throw new Error("Failed to reload CMS image record");
    }
    return await serializeCmsObject(ctx, record);
  },
});

export const getCmsFileUrl = internalQuery({
  args: {
    objectId: v.optional(v.id("objects")),
    storageId: v.optional(v.id("_storage")),
    includeUnpublished: v.optional(v.boolean()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.objectId && !args.storageId) {
      throw new Error("Either objectId or storageId is required");
    }

    if (args.storageId) {
      return await ctx.storage.getUrl(args.storageId);
    }

    const record = await ctx.db.get(args.objectId!);
    if (!isCmsObject(record)) {
      return null;
    }

    if (args.includeUnpublished) {
      await requireCmsReadAccess(ctx, record.organizationId, args.sessionId);
    } else if (!isPublishedCmsStatus(record.status)) {
      return null;
    }

    return await resolveCmsFileUrl(ctx, record);
  },
});

export const deleteCmsFile = internalMutation({
  args: {
    sessionId: v.string(),
    organizationId: v.id("organizations"),
    objectId: v.id("objects"),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.objectId);
    if (!isCmsObject(record) || record.organizationId !== args.organizationId) {
      throw new Error("CMS image record not found");
    }
    if (record.subtype !== "image") {
      throw new Error("deleteCmsFile only supports image records");
    }

    const currentImageMetadata = parseCmsImageMetadata(record);
    const userId = await requireCmsWriteAccess({
      ctx,
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      requireMediaUpload: true,
      currentStatus: record.status,
      nextStatus: "deleted",
    });

    if (currentImageMetadata?.storageId) {
      await ctx.storage.delete(currentImageMetadata.storageId);
    }

    const now = Date.now();
    const deletedCustomProperties = buildCmsImageCustomProperties({
      name: record.name,
      locale: record.locale,
      previousStorageId: currentImageMetadata?.storageId,
      filename: currentImageMetadata?.filename || record.name,
      mimeType: currentImageMetadata?.mimeType || "application/octet-stream",
      sizeBytes: currentImageMetadata?.sizeBytes || 0,
      alt: currentImageMetadata?.alt,
      width: currentImageMetadata?.width,
      height: currentImageMetadata?.height,
      blurDataUrl: currentImageMetadata?.blurDataUrl,
      focalPoint: currentImageMetadata?.focalPoint,
      customProperties: asRecord(record.customProperties),
      deletedAt: now,
      deletedBy: userId,
    });

    await replaceCmsRecord(ctx, record, {
      subtype: "image",
      name: record.name,
      locale: record.locale,
      value: undefined,
      description: record.description,
      status: "deleted",
      customProperties: deletedCustomProperties,
      updatedAt: now,
    });

    await logCmsAction({
      ctx,
      organizationId: args.organizationId,
      objectId: record._id,
      actionType: "cms_file.deleted",
      actionData: {
        subtype: "image",
        name: record.name,
        locale: record.locale,
        previousStorageId: currentImageMetadata?.storageId,
      },
      performedBy: userId,
    });

    const updated = await ctx.db.get(record._id);
    if (!isCmsObject(updated)) {
      throw new Error("Failed to reload deleted CMS image record");
    }
    return await serializeCmsObject(ctx, updated);
  },
});
