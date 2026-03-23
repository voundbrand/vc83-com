export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { getConvexClient, getOrganizationId, mutateInternal, queryInternal } from "@/lib/server-convex";
import { EditorSessionError, requireEditorSession } from "@/lib/cms-editor";
import {
  createEmptyCmsRecord,
  parseBooleanFlag,
  parseJsonObject,
  toCmsBridgeRecord,
} from "@/lib/cms-bridge";

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../../convex/_generated/api").internal;

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getCmsOrganizationId(): Id<"organizations"> {
  const organizationId = getOrganizationId();
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
    const url = new URL(request.url);
    const usage = readRequiredParam(url.searchParams, "usage");
    const locale = url.searchParams.get("locale")?.trim() || undefined;
    const defaultLocale = url.searchParams.get("defaultLocale")?.trim() || undefined;
    const includeUnpublished = parseBooleanFlag(
      url.searchParams.get("includeUnpublished")
    );

    let sessionId: string | undefined;
    if (includeUnpublished) {
      const session = await requireEditorSession(["edit_published_pages"]);
      sessionId = session.sessionId;
    }

    const convex = getConvexClient();
    const organizationId = getCmsOrganizationId();

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
      return jsonResponse(
        { error: error.message },
        error.status
      );
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
    const formData = await request.formData();
    const usage = formData.get("usage");
    const locale = formData.get("locale");
    const alt = formData.get("alt");
    const description = formData.get("description");
    const status = formData.get("status");
    const customProperties = parseJsonObject(
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
        : [...requiredPermissions]
    );

    const convex = getConvexClient();
    const organizationId = getCmsOrganizationId();
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

    const record = await mutateInternal(
      convex,
      generatedInternalApi.cmsContent.upsertCmsImage,
      {
        sessionId: session.sessionId,
        organizationId,
        name: usage.trim(),
        locale: typeof locale === "string" && locale.trim().length > 0 ? locale.trim() : null,
        description:
          typeof description === "string" && description.trim().length > 0
            ? description.trim()
            : undefined,
        status:
          typeof status === "string" && status.trim().length > 0
            ? status.trim()
            : undefined,
        storageId: uploadResult.storageId,
        filename: file.name,
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
      return jsonResponse(
        { error: error.message },
        error.status
      );
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
    ]);

    const record = await mutateInternal(
      getConvexClient(),
      generatedInternalApi.cmsContent.deleteCmsFile,
      {
        sessionId: session.sessionId,
        organizationId: getCmsOrganizationId(),
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
      return jsonResponse(
        { error: error.message },
        error.status
      );
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
