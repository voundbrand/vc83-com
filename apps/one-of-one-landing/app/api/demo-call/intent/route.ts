export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { internal as generatedInternalApi } from "../../../../../../convex/_generated/api";
import {
  LANDING_DEMO_CALL_INTENT_OBJECT_TYPE,
  LANDING_DEMO_CALL_INTENT_TTL_MS,
  type LandingDemoCallIntentRecord,
  normalizePhoneDigits,
  normalizePhoneForLookup,
  readLandingDemoCallIntentRecord,
} from "@/lib/demo-call";
import {
  getConvexClient,
  getPlatformOrganizationId,
  mutateInternal,
  queryInternal,
} from "@/lib/server-convex";

type CreateLandingDemoCallIntentRequest = {
  callerPhone?: string;
  requestedAgentKey?: string;
  requestedAgentName?: string;
  requestedPersonaName?: string;
  language?: string;
  landingPath?: string;
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isLandingDemoCallIntentRecord(
  value: LandingDemoCallIntentRecord | null
): value is LandingDemoCallIntentRecord {
  return value !== null;
}

export async function POST(request: Request) {
  try {
    const organizationId = getPlatformOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: "Platform organization is not configured" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as CreateLandingDemoCallIntentRequest;
    const callerPhone = normalizePhoneForLookup(body.callerPhone);
    const phoneDigits = normalizePhoneDigits(body.callerPhone);
    const requestedAgentKey = normalizeOptionalString(body.requestedAgentKey);
    const requestedAgentName = normalizeOptionalString(body.requestedAgentName);
    const requestedPersonaName =
      normalizeOptionalString(body.requestedPersonaName) || requestedAgentName;
    const language = normalizeOptionalString(body.language) || "en";
    const landingPath = normalizeOptionalString(body.landingPath) || undefined;

    if (!callerPhone || !phoneDigits) {
      return NextResponse.json(
        { error: "A valid caller phone number is required." },
        { status: 400 }
      );
    }
    if (!requestedAgentKey || !requestedAgentName || !requestedPersonaName) {
      return NextResponse.json(
        { error: "Requested agent context is incomplete." },
        { status: 400 }
      );
    }

    const convex = getConvexClient();
    const now = Date.now();
    const expiresAt = now + LANDING_DEMO_CALL_INTENT_TTL_MS;
    const existingObjects = await queryInternal(
      convex,
      generatedInternalApi.channels.router.listObjectsByOrgTypeInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        type: LANDING_DEMO_CALL_INTENT_OBJECT_TYPE,
      }
    );

    const activeMatch = (existingObjects as Array<Record<string, unknown>>)
      .map((record) =>
        readLandingDemoCallIntentRecord(record as {
          _id: string;
          type?: string;
          name?: string;
          status?: string;
          createdAt?: number;
          updatedAt?: number;
          customProperties?: Record<string, unknown>;
        })
      )
      .filter(isLandingDemoCallIntentRecord)
      .filter((record) => record.phoneDigits === phoneDigits && record.expiresAt > now)
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];

    const customProperties = {
      source: "one_of_one_landing",
      phoneNormalized: callerPhone,
      phoneDigits,
      requestedAgentKey,
      requestedAgentName,
      requestedPersonaName,
      language,
      landingPath,
      createdAt: activeMatch?.createdAt || now,
      updatedAt: now,
      expiresAt,
      matchedAt: undefined,
      matchedProviderCallId: undefined,
    };

    let objectId = activeMatch?.objectId || null;
    if (activeMatch) {
      await mutateInternal(
        convex,
        generatedInternalApi.channels.router.patchObjectInternal,
        {
          objectId: activeMatch.objectId as Id<"objects">,
          status: "pending",
          customProperties,
          updatedAt: now,
        }
      );
    } else {
      objectId = await mutateInternal(
        convex,
        generatedInternalApi.channels.router.insertObjectInternal,
        {
          organizationId: organizationId as Id<"organizations">,
          type: LANDING_DEMO_CALL_INTENT_OBJECT_TYPE,
          subtype: "one_of_one_landing",
          name: `landing-demo-call:${requestedAgentKey}:${phoneDigits}:${now}`,
          status: "pending",
          customProperties,
          createdAt: now,
          updatedAt: now,
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        intentId: objectId,
        expiresAt,
        expiresInSeconds: Math.floor(LANDING_DEMO_CALL_INTENT_TTL_MS / 1000),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[LandingDemoCallIntent] Failed to create intent:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare demo call intent",
      },
      { status: 500 }
    );
  }
}
