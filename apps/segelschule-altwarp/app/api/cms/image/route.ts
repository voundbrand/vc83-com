export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import {
  getConvexClient,
  getOrganizationId,
  mutateInternal,
  queryInternal,
  resolveSegelschuleOrganizationId,
} from "@/lib/server-convex";
import {
  clearEditorSessionCookie,
  EditorSessionError,
  requireEditorSession,
} from "@/lib/cms-editor";
import {
  createEmptyCmsRecord,
  parseBooleanFlag,
  parseJsonObject,
  toCmsBridgeRecord,
} from "@/lib/cms-bridge";
import { getRequestHostFromRequest } from "@/lib/request-host";

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../../convex/_generated/api").internal;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../../../../../../convex/_generated/api").api;

const CMS_MEDIA_LIBRARY_CONTRACT_VERSION = "cms_media_library_path_v1";
const CMS_MEDIA_APP_SLUG = "segelschule-altwarp";

interface CmsMediaPathDescriptor {
  appSlug: string;
  usage: string;
  page: string;
  section: string | null;
  folderSegments: string[];
  folderPath: string;
  mediaFilename: string;
  tags: string[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizePathSegment(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function getFileExtension(filename: string, mimeType: string): string {
  const extMatch = filename.trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  if (extMatch) {
    return extMatch[1];
  }

  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  if (mimeType === "image/gif") {
    return "gif";
  }
  if (mimeType === "image/svg+xml") {
    return "svg";
  }
  if (mimeType === "image/avif") {
    return "avif";
  }
  return "bin";
}

function buildCmsMediaPathDescriptor(args: {
  usage: string;
  filename: string;
  locale: string | null;
  mimeType: string;
}): CmsMediaPathDescriptor {
  const usage = args.usage.trim();
  const usageTokens = usage
    .split(/[/_]+/)
    .map((token) => normalizePathSegment(token, "segment"))
    .filter((token) => token.length > 0);

  const page = usageTokens[0] || "home";
  const section = usageTokens.length > 1 ? usageTokens[1] : null;
  const folderSegments = [CMS_MEDIA_APP_SLUG, page, ...(section ? [section] : [])];
  const folderPath = `/${folderSegments.join("/")}`;

  const usageStem = normalizePathSegment(
    usageTokens.join("-") || "cms-image",
    "cms-image"
  );
  const localeSuffix = args.locale
    ? `.${normalizePathSegment(args.locale, "locale")}`
    : "";
  const extension = getFileExtension(args.filename, args.mimeType);
  const mediaFilename = `${usageStem}${localeSuffix}.${extension}`;

  const tags = [
    "cms",
    "cms:image",
    `app:${CMS_MEDIA_APP_SLUG}`,
    `page:${page}`,
    ...(section ? [`section:${section}`] : []),
    `usage:${usage}`,
    ...(args.locale ? [`locale:${args.locale}`] : []),
  ];

  return {
    appSlug: CMS_MEDIA_APP_SLUG,
    usage,
    page,
    section,
    folderSegments,
    folderPath,
    mediaFilename,
    tags,
  };
}

async function ensureMediaFolderPath(args: {
  sessionId: string;
  organizationId: Id<"organizations">;
  pathSegments: string[];
}): Promise<string | null> {
  const convex = getConvexClient();
  let parentFolderId: string | undefined;

  for (const segment of args.pathSegments) {
    const folders = (await convex.query(
      generatedApi.mediaFolderOntology.listFolders,
      {
        organizationId: args.organizationId,
        ...(parentFolderId ? { parentFolderId } : {}),
      }
    )) as Array<{ _id: string; name: string }> | null;

    const existing = (folders || []).find(
      (folder) =>
        normalizePathSegment(folder.name, "folder") ===
        normalizePathSegment(segment, "folder")
    );
    if (existing) {
      parentFolderId = String(existing._id);
      continue;
    }

    const createdFolderId = (await convex.mutation(
      generatedApi.mediaFolderOntology.createFolder,
      {
        sessionId: args.sessionId,
        organizationId: args.organizationId,
        name: segment,
        ...(parentFolderId ? { parentFolderId } : {}),
      }
    )) as string;
    parentFolderId = createdFolderId;
  }

  return parentFolderId || null;
}

async function syncCmsImageToOrganizationMedia(args: {
  sessionId: string;
  organizationId: Id<"organizations">;
  storageId: Id<"_storage">;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  description?: string;
  mediaPath: CmsMediaPathDescriptor;
}): Promise<{
  mediaId: string | null;
  folderId: string | null;
  syncError?: string;
}> {
  const convex = getConvexClient();

  try {
    const folderId = await ensureMediaFolderPath({
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      pathSegments: args.mediaPath.folderSegments,
    });

    const media = (await convex.mutation(generatedApi.organizationMedia.saveMedia, {
      sessionId: args.sessionId,
      organizationId: args.organizationId,
      storageId: args.storageId,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      category: "general",
      tags: args.mediaPath.tags,
      description:
        args.description ||
        `CMS image ${args.mediaPath.usage} (${args.mediaPath.folderPath})`,
    })) as { mediaId?: string };

    const mediaId = media?.mediaId ? String(media.mediaId) : null;
    if (mediaId && folderId) {
      await convex.mutation(generatedApi.organizationMedia.moveMediaToFolder, {
        sessionId: args.sessionId,
        mediaId,
        folderId,
      });
    }

    return {
      mediaId,
      folderId,
    };
  } catch (error) {
    const syncError =
      error instanceof Error
        ? error.message
        : "Failed to sync CMS image with media library";
    console.warn("[CMS Image] Media library sync failed", {
      usage: args.mediaPath.usage,
      syncError,
    });
    return {
      mediaId: null,
      folderId: null,
      syncError,
    };
  }
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function getCmsOrganizationId(
  requestHost: string | null
): Promise<Id<"organizations">> {
  const organizationId =
    (await resolveSegelschuleOrganizationId({ requestHost })) ||
    getOrganizationId();
  if (!organizationId) {
    throw new Error("Platform organization is not configured");
  }
  return organizationId as Id<"organizations">;
}

function readRequiredParam(
  params: URLSearchParams,
  key: string
): string {
  const value = params.get(key)?.trim();
  if (!value) {
    throw new Error(`${key} is required`);
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const requestHost = getRequestHostFromRequest(request);
    const url = new URL(request.url);
    const usage = readRequiredParam(url.searchParams, "usage");
    const locale = url.searchParams.get("locale")?.trim() || undefined;
    const defaultLocale = url.searchParams.get("defaultLocale")?.trim() || undefined;
    const includeUnpublished = parseBooleanFlag(
      url.searchParams.get("includeUnpublished")
    );

    let sessionId: string | undefined;
    if (includeUnpublished) {
      const session = await requireEditorSession(["edit_published_pages"], {
        requestHost,
      });
      sessionId = session.sessionId;
    }

    const convex = getConvexClient();
    const organizationId = await getCmsOrganizationId(requestHost);

    if (locale) {
      const localizedRecord = await queryInternal(
        convex,
        generatedInternalApi.cmsContent.getCmsObjectByLocaleName,
        {
          organizationId,
          name: usage,
          locale,
          includeUnpublished,
          sessionId,
        }
      );

      if (localizedRecord) {
        return jsonResponse(
          toCmsBridgeRecord(localizedRecord, {
            resolvedLocale: localizedRecord.locale || locale,
          })
        );
      }
    }

    if (defaultLocale && defaultLocale !== locale) {
      const defaultRecord = await queryInternal(
        convex,
        generatedInternalApi.cmsContent.getCmsObjectByLocaleName,
        {
          organizationId,
          name: usage,
          locale: defaultLocale,
          includeUnpublished,
          sessionId,
        }
      );

      if (defaultRecord) {
        return jsonResponse(
          toCmsBridgeRecord(defaultRecord, {
            resolvedLocale: defaultRecord.locale || defaultLocale,
          })
        );
      }
    }

    const fallbackRecord = await queryInternal(
      convex,
      generatedInternalApi.cmsContent.getCmsObjectByName,
      {
        organizationId,
        name: usage,
        preferredLocale: locale,
        includeUnpublished,
        sessionId,
      }
    );

    return jsonResponse(
      fallbackRecord
        ? toCmsBridgeRecord(fallbackRecord, {
            resolvedLocale: fallbackRecord.locale || null,
          })
        : createEmptyCmsRecord({ name: usage, subtype: "image" })
    );
  } catch (error) {
    if (error instanceof EditorSessionError) {
      const response = jsonResponse(
        { error: error.message },
        error.status
      );
      clearEditorSessionCookie(response);
      return response;
    }

    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Failed to load CMS image",
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const requestHost = getRequestHostFromRequest(request);
    const formData = await request.formData();
    const usage = formData.get("usage");
    const locale = formData.get("locale");
    const alt = formData.get("alt");
    const description = formData.get("description");
    const status = formData.get("status");
    const customPropertiesInput = parseJsonObject(
      typeof formData.get("customProperties") === "string"
        ? (formData.get("customProperties") as string)
        : undefined,
      "customProperties"
    );
    const file = formData.get("file");

    if (typeof usage !== "string" || usage.trim().length === 0) {
      return jsonResponse({ error: "usage is required" }, 400);
    }
    if (!(file instanceof File)) {
      return jsonResponse({ error: "file is required" }, 400);
    }

    const requiredPermissions = [
      "edit_published_pages",
      "media_library.upload",
    ] as const;
    const session = await requireEditorSession(
      typeof status === "string" && status.trim() === "published"
        ? [...requiredPermissions, "publish_pages"]
        : [...requiredPermissions],
      { requestHost }
    );

    const convex = getConvexClient();
    const organizationId = await getCmsOrganizationId(requestHost);
    const normalizedUsage = usage.trim();
    const normalizedLocale =
      typeof locale === "string" && locale.trim().length > 0
        ? locale.trim()
        : null;
    const normalizedDescription =
      typeof description === "string" && description.trim().length > 0
        ? description.trim()
        : undefined;
    const normalizedStatus =
      typeof status === "string" && status.trim().length > 0
        ? status.trim()
        : undefined;

    const mediaPath = buildCmsMediaPathDescriptor({
      usage: normalizedUsage,
      filename: file.name,
      locale: normalizedLocale,
      mimeType: file.type || "application/octet-stream",
    });
    const uploadUrl = await mutateInternal(
      convex,
      generatedInternalApi.cmsContent.generateCmsUploadUrl,
      {
        sessionId: session.sessionId,
        organizationId,
      }
    );

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      return jsonResponse(
        { error: "Failed to upload image bytes to storage" },
        502
      );
    }

    const uploadResult = (await uploadResponse.json()) as {
      storageId?: Id<"_storage">;
    };

    if (!uploadResult.storageId) {
      return jsonResponse(
        { error: "Upload did not return a storageId" },
        502
      );
    }

    const mediaSync = await syncCmsImageToOrganizationMedia({
      sessionId: session.sessionId,
      organizationId,
      storageId: uploadResult.storageId,
      filename: mediaPath.mediaFilename,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      description: normalizedDescription,
      mediaPath,
    });

    const customProperties: Record<string, unknown> = {
      ...(customPropertiesInput || {}),
      mediaLibrary: {
        ...(asRecord(customPropertiesInput?.mediaLibrary) || {}),
        contractVersion: CMS_MEDIA_LIBRARY_CONTRACT_VERSION,
        appSlug: mediaPath.appSlug,
        usage: mediaPath.usage,
        page: mediaPath.page,
        section: mediaPath.section,
        folderPath: mediaPath.folderPath,
        folderSegments: mediaPath.folderSegments,
        mediaFilename: mediaPath.mediaFilename,
        locale: normalizedLocale,
        mediaId: mediaSync.mediaId,
        folderId: mediaSync.folderId,
        syncError: mediaSync.syncError,
      },
    };

    const record = await mutateInternal(
      convex,
      generatedInternalApi.cmsContent.upsertCmsImage,
      {
        sessionId: session.sessionId,
        organizationId,
        name: normalizedUsage,
        locale: normalizedLocale,
        description: normalizedDescription,
        status: normalizedStatus,
        storageId: uploadResult.storageId,
        filename: mediaPath.mediaFilename,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        alt:
          typeof alt === "string" && alt.trim().length > 0 ? alt.trim() : undefined,
        customProperties,
      }
    );

    return jsonResponse(
      toCmsBridgeRecord(record, {
        resolvedLocale: record.locale || null,
      })
    );
  } catch (error) {
    if (error instanceof EditorSessionError) {
      const response = jsonResponse(
        { error: error.message },
        error.status
      );
      clearEditorSessionCookie(response);
      return response;
    }

    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload CMS image",
      },
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const requestHost = getRequestHostFromRequest(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const objectId =
      typeof body.recordId === "string"
        ? body.recordId.trim()
        : "";

    if (!objectId) {
      return jsonResponse({ error: "recordId is required" }, 400);
    }

    const session = await requireEditorSession([
      "edit_published_pages",
      "media_library.upload",
    ], { requestHost });

    const record = await mutateInternal(
      getConvexClient(),
      generatedInternalApi.cmsContent.deleteCmsFile,
      {
        sessionId: session.sessionId,
        organizationId: await getCmsOrganizationId(requestHost),
        objectId: objectId as Id<"objects">,
      }
    );

    return jsonResponse(
      toCmsBridgeRecord(record, {
        resolvedLocale: record.locale || null,
      })
    );
  } catch (error) {
    if (error instanceof EditorSessionError) {
      const response = jsonResponse(
        { error: error.message },
        error.status
      );
      clearEditorSessionCookie(response);
      return response;
    }

    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete CMS image",
      },
      500
    );
  }
}
