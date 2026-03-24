export const dynamic = "force-dynamic";

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { extractPlatformSessionIdFromToken, getAuthSecret } from "@/lib/auth";
import { getRequestHostFromRequest } from "@/lib/request-host";
import {
  getApiBaseUrl,
  getConvexClient,
  getOrganizationId,
  mutateInternal,
  queryInternal,
  resolveSegelschuleOrganizationId,
} from "@/lib/server-convex";
import {
  applyEditorSessionCookie,
  clearEditorSessionCookie,
  resolveEditorSessionState,
} from "@/lib/cms-editor";

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../../convex/_generated/api").internal;
type TokenRequest = NonNullable<Parameters<typeof getToken>[0]>["req"];
const SWITCH_ORG_TIMEOUT_MS = 3000;

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function invalidatePlatformSession(sessionId: string): Promise<void> {
  try {
    const convex = getConvexClient();
    await mutateInternal(
      convex,
      generatedInternalApi.api.v1.emailAuthInternal.deleteSession,
      { sessionId }
    );
  } catch (error) {
    console.warn("[CMS Editor] Failed to invalidate platform session:", error);
  }
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

interface PlatformSessionContext {
  sessionId: string;
  userId: string;
  organizationId: string;
}

async function resolvePlatformSessionContext(
  sessionId: string
): Promise<PlatformSessionContext | null> {
  try {
    const convex = getConvexClient();
    const sessionContext = (await queryInternal(
      convex,
      generatedInternalApi.api.v1.emailAuthInternal.resolveSessionContext,
      { sessionId }
    )) as PlatformSessionContext | null;

    if (
      !sessionContext ||
      !normalizeOptionalString(sessionContext.sessionId) ||
      !normalizeOptionalString(sessionContext.userId) ||
      !normalizeOptionalString(sessionContext.organizationId)
    ) {
      return null;
    }

    return sessionContext;
  } catch (error) {
    console.warn("[CMS Editor] Failed to resolve platform session context:", error);
    return null;
  }
}

async function switchPlatformSessionOrganization(
  sessionId: string,
  organizationId: string
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, SWITCH_ORG_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${getApiBaseUrl().replace(/\/+$/, "")}/api/v1/auth/switch-organization`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ organizationId }),
        cache: "no-store",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => null);
      console.warn(
        "[CMS Editor] Failed to switch platform session organization",
        { status: response.status, organizationId, errorBody }
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[CMS Editor] Organization switch request failed:", error);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: Request) {
  const requestHost = getRequestHostFromRequest(request);

  try {
    let tokenSessionId: string | null = null;
    try {
      const token = await getToken({
        req: request as TokenRequest,
        secret: getAuthSecret(process.env),
      });
      tokenSessionId = extractPlatformSessionIdFromToken(token);
    } catch (error) {
      console.warn("[CMS Editor] Failed to resolve NextAuth token:", error);
    }

    if (!tokenSessionId) {
      const response = jsonResponse({
        authenticated: false,
        session: null,
      });
      clearEditorSessionCookie(response);
      return response;
    }

    const siteOrganizationId =
      (await resolveSegelschuleOrganizationId({ requestHost })) ||
      getOrganizationId();
    if (siteOrganizationId) {
      const sessionContext = await resolvePlatformSessionContext(tokenSessionId);
      const currentSessionOrganizationId = normalizeOptionalString(
        sessionContext?.organizationId
      );

      if (
        currentSessionOrganizationId &&
        currentSessionOrganizationId !== siteOrganizationId
      ) {
        await switchPlatformSessionOrganization(tokenSessionId, siteOrganizationId);
      }
    }

    const session = await resolveEditorSessionState(tokenSessionId, { requestHost });

    if (!session) {
      const response = jsonResponse({
        authenticated: false,
        session: null,
      });
      clearEditorSessionCookie(response);
      return response;
    }

    if (!session.permissions.edit_published_pages) {
      // Never block the response on session invalidation; mismatched org/dev
      // contexts should fail fast and let the user sign in again immediately.
      void invalidatePlatformSession(tokenSessionId);
      const response = jsonResponse(
        {
          authenticated: false,
          session: null,
          error: "You do not have permission to edit this site",
        },
        403
      );
      clearEditorSessionCookie(response);
      return response;
    }

    const response = jsonResponse({
      authenticated: true,
      session,
    });
    applyEditorSessionCookie(response, session.sessionId, session.expiresAt);
    return response;
  } catch (error) {
    console.error("[CMS Editor] Session route failed unexpectedly:", error);
    const response = jsonResponse(
      {
        authenticated: false,
        session: null,
        error: "Internal server error",
      },
      500
    );
    clearEditorSessionCookie(response);
    return response;
  }
}
