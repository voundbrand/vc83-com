import { httpAction } from "../../_generated/server";
import { getCorsHeaders, handleOptionsRequest } from "./corsHeaders";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("../../_generated/api");

type FrontendOidcStartRequest = {
  organizationId?: string;
  requestHost?: string;
  redirectUri?: string;
  returnUrl?: string;
  scope?: string;
  loginHint?: string;
  prompt?: string;
  stateTtlMs?: number;
  responseMode?: "json" | "redirect";
};

type FrontendOidcCallbackRequest = {
  state?: string;
  code?: string;
  error?: string;
  errorDescription?: string;
  errorUri?: string;
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function normalizeHostForScope(value: string | null): string | null {
  if (!value) {
    return null;
  }

  let normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.includes("://")) {
    try {
      normalized = new URL(normalized).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  normalized = normalized.split("/")[0].split(":")[0].replace(/\.$/, "");
  return normalized || null;
}

function getQueryParam(url: URL, keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeOptionalString(url.searchParams.get(key));
    if (value) {
      return value;
    }
  }
  return null;
}

function parseStartRequestFromQuery(url: URL): FrontendOidcStartRequest {
  return {
    organizationId: getQueryParam(url, ["organizationId", "organization_id"]) || undefined,
    requestHost: getQueryParam(url, ["requestHost", "request_host"]) || undefined,
    redirectUri: getQueryParam(url, ["redirectUri", "redirect_uri"]) || undefined,
    returnUrl: getQueryParam(url, ["returnUrl", "return_url"]) || undefined,
    scope: getQueryParam(url, ["scope"]) || undefined,
    loginHint: getQueryParam(url, ["loginHint", "login_hint"]) || undefined,
    prompt: getQueryParam(url, ["prompt"]) || undefined,
    stateTtlMs: normalizeOptionalNumber(
      getQueryParam(url, ["stateTtlMs", "state_ttl_ms"])
    ),
    responseMode:
      getQueryParam(url, ["responseMode", "response_mode"]) === "redirect"
        ? "redirect"
        : "json",
  };
}

function parseCallbackRequestFromQuery(url: URL): FrontendOidcCallbackRequest {
  return {
    state: getQueryParam(url, ["state"]) || undefined,
    code: getQueryParam(url, ["code"]) || undefined,
    error: getQueryParam(url, ["error"]) || undefined,
    errorDescription:
      getQueryParam(url, ["error_description", "errorDescription"]) || undefined,
    errorUri: getQueryParam(url, ["error_uri", "errorUri"]) || undefined,
  };
}

async function parseJsonBody<T>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }
    return body as T;
  } catch {
    return null;
  }
}

function resolveDefaultCallbackUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/v1/frontend-oidc/callback`;
}

function resolveRequestHost(args: {
  bodyHost: string | null | undefined;
  queryHost: string | null | undefined;
  headerHost: string | null | undefined;
}): string | undefined {
  const normalized =
    normalizeHostForScope(args.bodyHost || null) ||
    normalizeHostForScope(args.queryHost || null) ||
    normalizeHostForScope(args.headerHost || null);
  return normalized || undefined;
}

export const frontendOidcOptionsHandler = httpAction(async (ctx, request) => {
  return handleOptionsRequest(request.headers.get("origin"));
});

export const frontendOidcStartHandler = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const url = new URL(request.url);
    const queryArgs = parseStartRequestFromQuery(url);
    const bodyArgs =
      request.method === "POST"
        ? await parseJsonBody<FrontendOidcStartRequest>(request)
        : null;

    const requestedRedirectUri =
      normalizeOptionalString(bodyArgs?.redirectUri) ||
      normalizeOptionalString(queryArgs.redirectUri) ||
      resolveDefaultCallbackUri(request);

    const responseMode =
      (normalizeOptionalString(bodyArgs?.responseMode) as "json" | "redirect" | null) ||
      queryArgs.responseMode ||
      "json";

    const result = await (ctx as any).runAction(
      generatedApi.internal.frontendOidcInternal.startFrontendOidcAuthorizationInternal,
      {
        organizationId:
          normalizeOptionalString(bodyArgs?.organizationId) ||
          normalizeOptionalString(queryArgs.organizationId) ||
          undefined,
        requestHost: resolveRequestHost({
          bodyHost: bodyArgs?.requestHost,
          queryHost: queryArgs.requestHost,
          headerHost: request.headers.get("x-forwarded-host") || request.headers.get("host"),
        }),
        redirectUri: requestedRedirectUri,
        returnUrl:
          normalizeOptionalString(bodyArgs?.returnUrl) ||
          normalizeOptionalString(queryArgs.returnUrl) ||
          undefined,
        scope:
          normalizeOptionalString(bodyArgs?.scope) ||
          normalizeOptionalString(queryArgs.scope) ||
          undefined,
        loginHint:
          normalizeOptionalString(bodyArgs?.loginHint) ||
          normalizeOptionalString(queryArgs.loginHint) ||
          undefined,
        prompt:
          normalizeOptionalString(bodyArgs?.prompt) ||
          normalizeOptionalString(queryArgs.prompt) ||
          undefined,
        stateTtlMs:
          normalizeOptionalNumber(bodyArgs?.stateTtlMs) ||
          normalizeOptionalNumber(queryArgs.stateTtlMs),
      }
    );

    if (responseMode === "redirect") {
      return Response.redirect(result.authorizationUrl, 302);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to start frontend OIDC flow",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});

async function parseCallbackRequest(request: Request): Promise<FrontendOidcCallbackRequest> {
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formPayload = new URLSearchParams(await request.text());
      return {
        state: normalizeOptionalString(formPayload.get("state")) || undefined,
        code: normalizeOptionalString(formPayload.get("code")) || undefined,
        error: normalizeOptionalString(formPayload.get("error")) || undefined,
        errorDescription:
          normalizeOptionalString(formPayload.get("error_description")) || undefined,
        errorUri: normalizeOptionalString(formPayload.get("error_uri")) || undefined,
      };
    }

    const bodyPayload = await parseJsonBody<Record<string, unknown>>(request);
    if (bodyPayload) {
      return {
        state: normalizeOptionalString(bodyPayload.state) || undefined,
        code: normalizeOptionalString(bodyPayload.code) || undefined,
        error: normalizeOptionalString(bodyPayload.error) || undefined,
        errorDescription:
          normalizeOptionalString(bodyPayload.errorDescription) ||
          normalizeOptionalString(bodyPayload.error_description) ||
          undefined,
        errorUri:
          normalizeOptionalString(bodyPayload.errorUri) ||
          normalizeOptionalString(bodyPayload.error_uri) ||
          undefined,
      };
    }
  }

  return parseCallbackRequestFromQuery(new URL(request.url));
}

export const frontendOidcCallbackHandler = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const callbackPayload = await parseCallbackRequest(request);
    const state = normalizeOptionalString(callbackPayload.state);
    if (!state) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing state parameter",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const result = await (ctx as any).runAction(
      generatedApi.internal.frontendOidcInternal.completeFrontendOidcAuthorizationInternal,
      {
        state,
        code: callbackPayload.code,
        error: callbackPayload.error,
        errorDescription: callbackPayload.errorDescription,
        errorUri: callbackPayload.errorUri,
      }
    );

    return new Response(JSON.stringify(result), {
      status: result?.success ? 200 : 400,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to complete frontend OIDC flow",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
