import { httpAction } from "../_generated/server";
import { getCorsHeaders, handleOptionsRequest } from "./v1/corsHeaders";
import {
  authenticateRequest,
  getEffectiveOrganizationId,
} from "../middleware/auth";
import { addRateLimitHeaders, checkRateLimit } from "../middleware/rateLimit";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

function errorResponse(
  error: string,
  status: number,
  origin: string | null,
  organizationId?: string
): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(organizationId ? { "X-Organization-Id": organizationId } : {}),
      ...getCorsHeaders(origin),
    },
  });
}

function successResponse(
  data: unknown,
  origin: string | null,
  organizationId: string
): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Organization-Id": organizationId,
      ...getCorsHeaders(origin),
    },
  });
}

function parseBooleanQueryParam(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parseLimitParam(value: string | null, fallback = 50): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.min(parsed, 200));
}

export type CreditsRedeemRequestPayload = {
  code: string;
  idempotencyKey?: string;
  userId?: string;
  organizationId?: string;
};

type ReferralAttributionSource = "email_signup" | "oauth_signup" | "manual_track";

export type CreditsReferralTrackSignupPayload = {
  referralCode: string;
  source?: ReferralAttributionSource;
  userId?: string;
  organizationId?: string;
};

type ConvexErrorData = {
  code?: string;
  message?: string;
};

type RateLimitGuard = {
  key: string;
  identifierType: "api_key" | "user" | "ip";
  plan: string;
  blockedMessage: string;
};

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeRateLimitSegment(
  value: string,
  fallback = "unknown",
  maxLength = 64
): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, "");
  if (!normalized) {
    return fallback;
  }
  return normalized.slice(0, maxLength);
}

async function evaluateRateLimitGuards(
  ctx: any,
  guards: RateLimitGuard[],
): Promise<{
  allowed: true;
  result: Awaited<ReturnType<typeof checkRateLimit>>;
} | {
  allowed: false;
  result: Awaited<ReturnType<typeof checkRateLimit>>;
  message: string;
}> {
  let lastResult: Awaited<ReturnType<typeof checkRateLimit>> | null = null;
  for (const guard of guards) {
    const result = await checkRateLimit(
      ctx,
      guard.key,
      guard.identifierType,
      guard.plan,
    );
    lastResult = result;
    if (!result.allowed) {
      return {
        allowed: false,
        result,
        message: guard.blockedMessage,
      };
    }
  }

  return {
    allowed: true,
    result: lastResult ?? {
      allowed: true,
      remainingTokens: 0,
      limit: 0,
      used: 0,
    },
  };
}

export function parseCreditsRedeemPayload(raw: unknown): CreditsRedeemRequestPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid JSON payload");
  }
  const payload = raw as Record<string, unknown>;
  const code = asNonEmptyString(payload.code);
  if (!code) {
    throw new Error("Missing required field: code");
  }

  return {
    code,
    idempotencyKey: asNonEmptyString(payload.idempotencyKey),
    userId: asNonEmptyString(payload.userId),
    organizationId: asNonEmptyString(payload.organizationId),
  };
}

function normalizeReferralAttributionSource(
  value: unknown
): ReferralAttributionSource | undefined {
  if (value === "email_signup" || value === "oauth_signup" || value === "manual_track") {
    return value;
  }
  return undefined;
}

export function parseCreditsReferralTrackSignupPayload(
  raw: unknown
): CreditsReferralTrackSignupPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid JSON payload");
  }
  const payload = raw as Record<string, unknown>;
  const referralCode = asNonEmptyString(payload.referralCode);
  if (!referralCode) {
    throw new Error("Missing required field: referralCode");
  }

  const source = normalizeReferralAttributionSource(payload.source);

  return {
    referralCode,
    source,
    userId: asNonEmptyString(payload.userId),
    organizationId: asNonEmptyString(payload.organizationId),
  };
}

export function hasAmbiguousRedeemClaim(args: {
  payload: CreditsRedeemRequestPayload;
  authUserId: string;
  authOrganizationId: string;
}): boolean {
  if (args.payload.userId && args.payload.userId !== args.authUserId) {
    return true;
  }
  if (
    args.payload.organizationId &&
    args.payload.organizationId !== args.authOrganizationId
  ) {
    return true;
  }
  return false;
}

export function hasAmbiguousReferralTrackClaim(args: {
  payload: CreditsReferralTrackSignupPayload;
  authUserId: string;
  authOrganizationId: string;
}): boolean {
  if (args.payload.userId && args.payload.userId !== args.authUserId) {
    return true;
  }
  if (
    args.payload.organizationId &&
    args.payload.organizationId !== args.authOrganizationId
  ) {
    return true;
  }
  return false;
}

function getConvexErrorData(error: unknown): ConvexErrorData {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: ConvexErrorData }).data;
    if (data && typeof data === "object") {
      return data;
    }
  }
  return {};
}

function mapRedeemErrorToHttp(
  error: unknown
): { status: number; error: string; code?: string } {
  const data = getConvexErrorData(error);
  const code = asNonEmptyString(data.code);
  const message =
    error instanceof Error ? error.message : "Failed to redeem code";

  if (code === "REDEEM_CODE_ALREADY_REDEEMED_BY_USER") {
    return { status: 409, error: "Code already redeemed by this user.", code };
  }

  if (code === "REDEEM_CODE_GRANT_FAILED") {
    return { status: 500, error: "Failed to apply redeemed credits.", code };
  }

  if (
    code === "REDEEM_CODE_INVALID" ||
    code === "REDEEM_CODE_REVOKED" ||
    code === "REDEEM_CODE_EXPIRED" ||
    code === "REDEEM_CODE_EXHAUSTED" ||
    code === "REDEEM_CODE_NOT_ELIGIBLE" ||
    code === "REDEEM_CODE_INVALID_POLICY" ||
    code === "REDEEM_AMBIGUOUS_IDENTITY" ||
    code === "INVALID_REDEMPTION_CODE"
  ) {
    return {
      status: 400,
      error: "Redemption claim could not be validated.",
      code,
    };
  }

  return {
    status: 500,
    error: message,
    code,
  };
}

export const handleOptions = httpAction(async (_ctx, request) => {
  const origin = request.headers.get("origin");
  return handleOptionsRequest(origin);
});

export const getCreditsBalance = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  const authResult = await authenticateRequest(ctx as any, request);
  if (!authResult.success) {
    return errorResponse(authResult.error, authResult.status, origin);
  }

  const authContext = authResult.context;
  const organizationId = getEffectiveOrganizationId(authContext);

  try {
    const url = new URL(request.url);
    const includeParent = parseBooleanQueryParam(url.searchParams.get("includeParent"));

    const envelope = await (ctx as any).runQuery(
      generatedApi.api.credits.index.getCreditsBalanceEnvelope,
      {
        organizationId,
        includeParent,
      }
    );

    return successResponse(envelope, origin, organizationId);
  } catch (error) {
    console.error("API GET /api/credits/balance error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch credit balance";
    return errorResponse(message, 500, origin, organizationId);
  }
});

export const getCreditsHistory = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  const authResult = await authenticateRequest(ctx as any, request);
  if (!authResult.success) {
    return errorResponse(authResult.error, authResult.status, origin);
  }

  const authContext = authResult.context;
  const organizationId = getEffectiveOrganizationId(authContext);

  try {
    const url = new URL(request.url);
    const limit = parseLimitParam(url.searchParams.get("limit"));

    const envelope = await (ctx as any).runQuery(
      generatedApi.api.credits.index.getCreditsHistoryEnvelope,
      {
        organizationId,
        limit,
      }
    );

    return successResponse(envelope, origin, organizationId);
  } catch (error) {
    console.error("API GET /api/credits/history error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch credit history";
    return errorResponse(message, 500, origin, organizationId);
  }
});

export const redeemCreditsCode = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  const authResult = await authenticateRequest(ctx as any, request);
  if (!authResult.success) {
    return errorResponse(authResult.error, authResult.status, origin);
  }

  const authContext = authResult.context;
  const organizationId = getEffectiveOrganizationId(authContext);
  const userId = authContext.userId;

  let payload: CreditsRedeemRequestPayload;
  try {
    const raw = await request.json();
    payload = parseCreditsRedeemPayload(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";
    return errorResponse(message, 400, origin, organizationId);
  }

  if (
    hasAmbiguousRedeemClaim({
      payload,
      authUserId: userId,
      authOrganizationId: organizationId,
    })
  ) {
    return errorResponse(
      "Redemption claim could not be validated.",
      400,
      origin,
      organizationId
    );
  }

  const normalizedCodeKey = normalizeRateLimitSegment(payload.code);
  const rateLimitState = await evaluateRateLimitGuards(ctx as any, [
    {
      key: `credits_redeem:user:${normalizeRateLimitSegment(userId)}`,
      identifierType: "user",
      plan: "free",
      blockedMessage: "Too many redeem attempts. Please retry later.",
    },
    {
      key: `credits_redeem:org:${normalizeRateLimitSegment(organizationId)}`,
      identifierType: "api_key",
      plan: "free",
      blockedMessage: "Organization redeem threshold reached. Please retry later.",
    },
    {
      key: `credits_redeem:code:${normalizeRateLimitSegment(organizationId)}:${normalizedCodeKey}`,
      identifierType: "api_key",
      plan: "free",
      blockedMessage: "Redeem attempts for this code are temporarily throttled.",
    },
  ]);

  if (!rateLimitState.allowed) {
    const response = errorResponse(
      rateLimitState.message,
      429,
      origin,
      organizationId
    );
    return addRateLimitHeaders(response, rateLimitState.result);
  }

  try {
    const redeemResult = await (ctx as any).runMutation(
      generatedApi.internal.credits.index.redeemCreditCodeInternal,
      {
        code: payload.code,
        organizationId,
        userId,
        idempotencyKey: payload.idempotencyKey,
      }
    );

    const response = successResponse(redeemResult, origin, organizationId);
    return addRateLimitHeaders(response, rateLimitState.result);
  } catch (error) {
    console.error("API POST /api/credits/redeem error:", error);
    const mapped = mapRedeemErrorToHttp(error);
    const response = new Response(
      JSON.stringify({
        success: false,
        error: mapped.error,
        code: mapped.code,
      }),
      {
        status: mapped.status,
        headers: {
          "Content-Type": "application/json",
          ...(organizationId ? { "X-Organization-Id": organizationId } : {}),
          ...getCorsHeaders(origin),
        },
      }
    );
    return addRateLimitHeaders(response, rateLimitState.result);
  }
});

export const getReferralProgramDashboard = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  const authResult = await authenticateRequest(ctx as any, request);
  if (!authResult.success) {
    return errorResponse(authResult.error, authResult.status, origin);
  }

  const authContext = authResult.context;
  const organizationId = getEffectiveOrganizationId(authContext);

  try {
    const dashboard = await (ctx as any).runQuery(
      generatedApi.internal.credits.index.getReferralStatsInternal,
      {
        userId: authContext.userId,
      }
    );

    return successResponse(dashboard, origin, organizationId);
  } catch (error) {
    console.error("API GET /api/credits/referral error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch referral dashboard";
    return errorResponse(message, 500, origin, organizationId);
  }
});

export const ensureReferralProfile = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  const authResult = await authenticateRequest(ctx as any, request);
  if (!authResult.success) {
    return errorResponse(authResult.error, authResult.status, origin);
  }

  const authContext = authResult.context;
  const organizationId = getEffectiveOrganizationId(authContext);

  try {
    const profile = await (ctx as any).runMutation(
      generatedApi.internal.credits.index.ensureReferralProfileInternal,
      {
        userId: authContext.userId,
      }
    );

    return successResponse(profile, origin, organizationId);
  } catch (error) {
    console.error("API POST /api/credits/referral/profile error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to ensure referral profile";
    return errorResponse(message, 500, origin, organizationId);
  }
});

export const trackReferralSignup = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");

  const authResult = await authenticateRequest(ctx as any, request);
  if (!authResult.success) {
    return errorResponse(authResult.error, authResult.status, origin);
  }

  const authContext = authResult.context;
  const organizationId = getEffectiveOrganizationId(authContext);
  const userId = authContext.userId;

  let payload: CreditsReferralTrackSignupPayload;
  try {
    const raw = await request.json();
    payload = parseCreditsReferralTrackSignupPayload(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request payload";
    return errorResponse(message, 400, origin, organizationId);
  }

  if (
    hasAmbiguousReferralTrackClaim({
      payload,
      authUserId: userId,
      authOrganizationId: organizationId,
    })
  ) {
    return errorResponse(
      "Referral attribution claim could not be validated.",
      400,
      origin,
      organizationId
    );
  }

  const normalizedCodeKey = normalizeRateLimitSegment(payload.referralCode);
  const rateLimitState = await evaluateRateLimitGuards(ctx as any, [
    {
      key: `credits_referral_track:user:${normalizeRateLimitSegment(userId)}`,
      identifierType: "user",
      plan: "free",
      blockedMessage: "Too many referral attribution attempts. Please retry later.",
    },
    {
      key: `credits_referral_track:org:${normalizeRateLimitSegment(organizationId)}`,
      identifierType: "api_key",
      plan: "free",
      blockedMessage: "Organization referral attribution threshold reached. Please retry later.",
    },
    {
      key: `credits_referral_track:code:${normalizedCodeKey}`,
      identifierType: "api_key",
      plan: "free",
      blockedMessage: "Referral attribution for this code is temporarily throttled.",
    },
  ]);

  if (!rateLimitState.allowed) {
    const response = errorResponse(
      rateLimitState.message,
      429,
      origin,
      organizationId
    );
    return addRateLimitHeaders(response, rateLimitState.result);
  }

  try {
    const result = await (ctx as any).runMutation(
      generatedApi.internal.credits.index.trackReferralSignupConversionInternal,
      {
        referralCode: payload.referralCode,
        referredUserId: userId,
        referredOrganizationId: organizationId,
        source: payload.source ?? "manual_track",
      }
    );

    const response = successResponse(result, origin, organizationId);
    return addRateLimitHeaders(response, rateLimitState.result);
  } catch (error) {
    console.error("API POST /api/credits/referral/track-signup error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to track referral signup";
    const response = errorResponse(message, 500, origin, organizationId);
    return addRateLimitHeaders(response, rateLimitState.result);
  }
});
