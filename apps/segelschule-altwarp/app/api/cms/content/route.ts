export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { getConvexClient, getOrganizationId, mutateInternal, queryInternal } from "@/lib/server-convex";
import { EditorSessionError, requireEditorSession } from "@/lib/cms-editor";
import {
  buildCmsContentName,
  createEmptyCmsRecord,
  parseBooleanFlag,
  toCmsBridgeRecord,
  serializeCmsContentInput,
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

async function loadContentRecord(args: {
  organizationId: Id<"organizations">;
  name: string;
  locale: string;
  defaultLocale: string;
  includeUnpublished: boolean;
  sessionId?: string;
}) {
  const convex = getConvexClient();
  const localizedRecord = await queryInternal(
    convex,
    generatedInternalApi.cmsContent.getCmsObjectByLocaleName,
    {
      organizationId: args.organizationId,
      name: args.name,
      locale: args.locale,
      includeUnpublished: args.includeUnpublished,
      sessionId: args.sessionId,
    }
  );

  if (localizedRecord) {
    return toCmsBridgeRecord(localizedRecord, {
      resolvedLocale: localizedRecord.locale || args.locale,
    });
  }

  if (args.defaultLocale !== args.locale) {
    const defaultLocaleRecord = await queryInternal(
      convex,
      generatedInternalApi.cmsContent.getCmsObjectByLocaleName,
      {
        organizationId: args.organizationId,
        name: args.name,
        locale: args.defaultLocale,
        includeUnpublished: args.includeUnpublished,
        sessionId: args.sessionId,
      }
    );

    if (defaultLocaleRecord) {
      return toCmsBridgeRecord(defaultLocaleRecord, {
        resolvedLocale: defaultLocaleRecord.locale || args.defaultLocale,
      });
    }
  }

  const fallbackRecord = await queryInternal(
    convex,
    generatedInternalApi.cmsContent.getCmsObjectByName,
    {
      organizationId: args.organizationId,
      name: args.name,
      preferredLocale: args.locale,
      includeUnpublished: args.includeUnpublished,
      sessionId: args.sessionId,
    }
  );

  return fallbackRecord
    ? toCmsBridgeRecord(fallbackRecord, {
        resolvedLocale: fallbackRecord.locale || null,
      })
    : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = readRequiredParam(url.searchParams, "page");
    const section = readRequiredParam(url.searchParams, "section");
    const key = readRequiredParam(url.searchParams, "key");
    const locale = readRequiredParam(url.searchParams, "locale");
    const defaultLocale = url.searchParams.get("defaultLocale")?.trim() || locale;
    const subtype = url.searchParams.get("subtype")?.trim() || "text";
    const includeUnpublished = parseBooleanFlag(
      url.searchParams.get("includeUnpublished")
    );

    let sessionId: string | undefined;
    if (includeUnpublished) {
      const session = await requireEditorSession(["edit_published_pages"]);
      sessionId = session.sessionId;
    }

    const name = buildCmsContentName(page, section, key);
    const record = await loadContentRecord({
      organizationId: getCmsOrganizationId(),
      name,
      locale,
      defaultLocale,
      includeUnpublished,
      sessionId,
    });

    return jsonResponse(
      record || createEmptyCmsRecord({ name, subtype })
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
          error instanceof Error ? error.message : "Failed to load CMS content",
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const page = typeof body.page === "string" ? body.page.trim() : "";
    const section =
      typeof body.section === "string" ? body.section.trim() : "";
    const key = typeof body.key === "string" ? body.key.trim() : "";
    const locale =
      typeof body.locale === "string" ? body.locale.trim() : "";
    const subtype =
      typeof body.subtype === "string" ? body.subtype.trim() : "";
    const status =
      typeof body.status === "string" && body.status.trim().length > 0
        ? body.status.trim()
        : undefined;

    if (!page || !section || !key || !locale || !subtype) {
      return jsonResponse(
        {
          error: "page, section, key, locale, and subtype are required",
        },
        400
      );
    }

    const requiredPermissions = ["edit_published_pages"] as const;
    const session = await requireEditorSession(
      status === "published"
        ? [...requiredPermissions, "publish_pages"]
        : [...requiredPermissions]
    );

    const serializedInput = serializeCmsContentInput({
      subtype,
      value: body.value ?? null,
      customProperties:
        body.customProperties && typeof body.customProperties === "object"
          ? (body.customProperties as Record<string, unknown>)
          : undefined,
    });

    const args = {
      sessionId: session.sessionId,
      organizationId: getCmsOrganizationId(),
      name: buildCmsContentName(page, section, key),
      locale,
      value: serializedInput.value,
      description:
        typeof body.description === "string" ? body.description : undefined,
      customProperties: serializedInput.customProperties,
      status,
    };

    const convex = getConvexClient();
    const record =
      subtype === "text"
        ? await mutateInternal(
            convex,
            generatedInternalApi.cmsContent.upsertCmsText,
            {
              ...args,
              value: typeof serializedInput.value === "string" ? serializedInput.value : "",
            }
          )
        : await mutateInternal(
            convex,
            generatedInternalApi.cmsContent.upsertCmsStructuredContent,
            {
              ...args,
              subtype,
            }
          );

    return jsonResponse(
      toCmsBridgeRecord(record, {
        resolvedLocale: record.locale || locale,
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
          error instanceof Error ? error.message : "Failed to save CMS content",
      },
      500
    );
  }
}
