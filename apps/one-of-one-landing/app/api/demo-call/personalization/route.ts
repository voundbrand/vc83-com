export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import {
  LANDING_DEMO_CALL_INTENT_OBJECT_TYPE,
  type LandingDemoCallIntentRecord,
  normalizePhoneForLookup,
  readLandingDemoCallIntentRecord,
  selectLandingDemoCallIntentForCaller,
} from "@/lib/demo-call";
import {
  getConvexClient,
  getPlatformOrganizationId,
  mutateInternal,
  queryInternal,
} from "@/lib/server-convex";

// Dynamic require avoids excessively deep Convex API type instantiation in this route.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../../convex/_generated/api").internal;

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

function readNestedString(
  value: Record<string, unknown>,
  path: string[]
): string | null {
  let current: unknown = value;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return normalizeOptionalString(current);
}

function resolveCallerPhone(payload: Record<string, unknown>): string | null {
  const candidates = [
    normalizeOptionalString(payload.caller_id),
    normalizeOptionalString(payload.callerId),
    normalizeOptionalString(payload.from),
    normalizeOptionalString(payload.from_number),
    normalizeOptionalString(payload.fromNumber),
    readNestedString(payload, ["call", "caller_id"]),
    readNestedString(payload, ["call", "from"]),
    readNestedString(payload, ["metadata", "caller_id"]),
    readNestedString(payload, ["metadata", "from"]),
  ];

  for (const candidate of candidates) {
    const normalized = normalizePhoneForLookup(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function resolveProviderCallId(payload: Record<string, unknown>): string | null {
  return (
    normalizeOptionalString(payload.call_sid) ||
    normalizeOptionalString(payload.callSid) ||
    normalizeOptionalString(payload.call_id) ||
    normalizeOptionalString(payload.callId) ||
    readNestedString(payload, ["call", "call_sid"]) ||
    readNestedString(payload, ["call", "sid"]) ||
    readNestedString(payload, ["metadata", "call_sid"]) ||
    null
  );
}

function isAuthorized(request: Request): boolean {
  const expectedSecret =
    process.env.LANDING_DEMO_CALL_PERSONALIZATION_SECRET || "";
  if (!expectedSecret) {
    return true;
  }

  const authorization =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-elevenlabs-secret") ||
    request.headers.get("x-personalization-secret") ||
    "";

  return authorization === expectedSecret;
}

function buildPersonalizedPrompt(args: {
  requestedAgentName: string;
  requestedPersonaName: string;
}): string {
  return [
    "You are Clara, the live demo concierge for sevenlayers.",
    `The caller selected ${args.requestedPersonaName} (${args.requestedAgentName}) on the landing page before calling.`,
    "After the standard opener, acknowledge that choice immediately and naturally in your first model-generated reply.",
    "Keep the caller experience smooth, short, and confident.",
    "If your configured workflow supports specialist transfer, move them to the selected specialist quickly after a short confirmation.",
    "Do not mention webhooks, phone-number matching, routing logic, hidden agents, or implementation details.",
  ].join(" ");
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = getPlatformOrganizationId();
    if (!organizationId) {
      return NextResponse.json(
        { error: "Platform organization is not configured" },
        { status: 503 }
      );
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const callerPhone = resolveCallerPhone(payload);
    const providerCallId = resolveProviderCallId(payload);

    if (!callerPhone) {
      return NextResponse.json(
        { dynamic_variables: {} },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const convex = getConvexClient();
    const existingObjects = await queryInternal(
      convex,
      generatedInternalApi.channels.router.listObjectsByOrgTypeInternal,
      {
        organizationId: organizationId as Id<"organizations">,
        type: LANDING_DEMO_CALL_INTENT_OBJECT_TYPE,
      }
    );

    const resolvedIntent = selectLandingDemoCallIntentForCaller({
      records: (existingObjects as Array<Record<string, unknown>>)
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
        .filter(isLandingDemoCallIntentRecord),
      callerPhone,
      providerCallId: providerCallId || undefined,
    });

    if (!resolvedIntent) {
      return NextResponse.json(
        { dynamic_variables: {} },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    await mutateInternal(
      convex,
      generatedInternalApi.channels.router.patchObjectInternal,
      {
        objectId: resolvedIntent.objectId as Id<"objects">,
        status: "matched",
        customProperties: {
          phoneNormalized: resolvedIntent.phoneNormalized,
          phoneDigits: resolvedIntent.phoneDigits,
          requestedAgentKey: resolvedIntent.requestedAgentKey,
          requestedAgentName: resolvedIntent.requestedAgentName,
          requestedPersonaName: resolvedIntent.requestedPersonaName,
          language: resolvedIntent.language,
          landingPath: resolvedIntent.landingPath,
          createdAt: resolvedIntent.createdAt,
          updatedAt: Date.now(),
          expiresAt: resolvedIntent.expiresAt,
          matchedAt: Date.now(),
          matchedProviderCallId: providerCallId || resolvedIntent.matchedProviderCallId,
          source: "one_of_one_landing",
        },
        updatedAt: Date.now(),
      }
    );

    return NextResponse.json(
      {
        dynamic_variables: {
          requested_agent: resolvedIntent.requestedAgentKey,
          requested_agent_name: resolvedIntent.requestedAgentName,
          requested_persona_name: resolvedIntent.requestedPersonaName,
          requested_language: resolvedIntent.language,
          call_direction: "inbound",
          call_entrypoint: "landing_demo_number",
        },
        conversation_config_override: {
          agent: {
            prompt: {
              prompt: buildPersonalizedPrompt({
                requestedAgentName: resolvedIntent.requestedAgentName,
                requestedPersonaName: resolvedIntent.requestedPersonaName,
              }),
            },
          },
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[LandingDemoCallPersonalization] Failed to personalize call:", error);
    return NextResponse.json(
      { dynamic_variables: {} },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
