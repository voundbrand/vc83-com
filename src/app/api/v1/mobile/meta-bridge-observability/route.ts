import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../../../../../convex/_generated/dataModel";
import {
  META_BRIDGE_UPLOAD_CONTRACT_VERSION,
  META_BRIDGE_UPLOAD_SOURCE,
  parseMetaBridgeUploadPayload,
} from "../../../../../../apps/operator-mobile/src/lib/av/metaBridge-observability-core";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const generatedApi: any = require("../../../../../../convex/_generated/api");

export const dynamic = "force-dynamic";

function getConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const adminToken = process.env.CONVEX_DEPLOY_KEY;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
  }
  if (!adminToken) {
    throw new Error("CONVEX_DEPLOY_KEY is not configured.");
  }

  const client = new ConvexHttpClient(convexUrl);
  const maybeAdminClient = client as any;
  if (typeof maybeAdminClient.setAdminAuth === "function") {
    maybeAdminClient.setAdminAuth(adminToken);
  }
  return client;
}

function resolveIngestOrganizationId(): string | null {
  return (
    process.env.META_BRIDGE_LOG_UPLOAD_ORGANIZATION_ID ||
    process.env.PLATFORM_ORG_ID ||
    process.env.TEST_ORG_ID ||
    process.env.NEXT_PUBLIC_PLATFORM_ORG_ID ||
    null
  );
}

function resolveAuthToken(request: NextRequest): string | null {
  const headerToken = request.headers.get("x-api-key");
  if (typeof headerToken === "string" && headerToken.trim().length > 0) {
    return headerToken.trim();
  }
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return null;
  }
  if (!authorization.startsWith("Bearer ")) {
    return null;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

function resolveConfiguredApiKey(): string {
  return (
    process.env.META_BRIDGE_LOG_UPLOAD_API_KEY ||
    process.env.EXPO_PUBLIC_META_BRIDGE_LOG_UPLOAD_API_KEY ||
    ""
  ).trim();
}

export async function POST(request: NextRequest) {
  try {
    const expectedApiKey = resolveConfiguredApiKey();
    if (expectedApiKey.length > 0) {
      const providedToken = resolveAuthToken(request);
      if (providedToken !== expectedApiKey) {
        return NextResponse.json(
          {
            error: "Unauthorized Meta bridge upload request.",
            code: "meta_bridge_upload_unauthorized",
          },
          { status: 401 }
        );
      }
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON request body.",
          code: "meta_bridge_upload_invalid_json",
        },
        { status: 400 }
      );
    }

    let payload;
    try {
      payload = parseMetaBridgeUploadPayload(body, { allowLegacy: true });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Invalid upload contract payload.",
          code: "meta_bridge_upload_contract_error",
          expectedContractVersion: META_BRIDGE_UPLOAD_CONTRACT_VERSION,
          expectedSource: META_BRIDGE_UPLOAD_SOURCE,
        },
        { status: 400 }
      );
    }

    const ingestOrganizationId = resolveIngestOrganizationId();
    if (!ingestOrganizationId) {
      return NextResponse.json(
        {
          error: "Meta bridge upload organization is not configured.",
          code: "meta_bridge_upload_missing_organization",
        },
        { status: 503 }
      );
    }

    const receivedAtMs = Date.now();
    let persistenceReceipt: {
      batchObjectId: string;
      persistedEventCount: number;
      receivedAtMs: number;
    };
    try {
      const convex = getConvexClient();
      persistenceReceipt = await convex.mutation(
        generatedApi.internal.ai.metaBridgeObservability.persistUploadBatch,
        {
          organizationId: ingestOrganizationId as Id<"organizations">,
          payload,
          requestMetadata: {
            receivedAtMs,
            endpoint: request.nextUrl.pathname,
            requestId: request.headers.get("x-request-id") || undefined,
            userAgent: request.headers.get("user-agent") || undefined,
            ipAddress:
              request.headers.get("x-forwarded-for")
              || request.headers.get("x-real-ip")
              || undefined,
          },
        }
      );
    } catch (error) {
      console.error("[MetaBridgeUpload] Failed to persist upload payload:", error);
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to persist upload payload.",
          code: "meta_bridge_upload_persist_failed",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        acceptedAtMs: receivedAtMs,
        contractVersion: payload.contractVersion,
        schemaVersion: payload.schemaVersion,
        source: payload.source,
        eventCount: payload.events.length,
        persistedEventCount: persistenceReceipt.persistedEventCount,
        batchObjectId: persistenceReceipt.batchObjectId,
      },
      {
        status: 202,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process upload payload.",
        code: "meta_bridge_upload_internal_error",
      },
      { status: 500 }
    );
  }
}
