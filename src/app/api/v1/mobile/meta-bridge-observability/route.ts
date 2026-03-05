import { NextRequest, NextResponse } from "next/server";
import {
  META_BRIDGE_UPLOAD_CONTRACT_VERSION,
  META_BRIDGE_UPLOAD_SOURCE,
  parseMetaBridgeUploadPayload,
} from "../../../../../../apps/operator-mobile/src/lib/av/metaBridge-observability-core";

export const dynamic = "force-dynamic";

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

    // Current ingestion endpoint validates and acknowledges payloads.
    // Durable persistence/forwarding can be layered behind this contract boundary.
    return NextResponse.json(
      {
        ok: true,
        acceptedAtMs: Date.now(),
        contractVersion: payload.contractVersion,
        schemaVersion: payload.schemaVersion,
        source: payload.source,
        eventCount: payload.events.length,
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
