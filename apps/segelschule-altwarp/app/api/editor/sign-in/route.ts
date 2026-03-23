export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getApiBaseUrl, getConvexClient, mutateInternal } from "@/lib/server-convex";
import {
  EditorSessionError,
  applyEditorSessionCookie,
  clearEditorSessionCookie,
  resolveEditorSessionState,
} from "@/lib/cms-editor";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return jsonResponse(
        { success: false, error: "Email and password are required" },
        400
      );
    }

    const response = await fetch(`${getApiBaseUrl().replace(/\/+$/, "")}/api/v1/auth/sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!response.ok) {
      return jsonResponse(
        payload || { success: false, error: "Editor sign-in failed" },
        response.status
      );
    }

    const sessionId =
      typeof payload?.sessionId === "string" ? payload.sessionId : null;
    const expiresAt =
      typeof payload?.expiresAt === "number" ? payload.expiresAt : null;

    if (!sessionId || !expiresAt) {
      return jsonResponse(
        { success: false, error: "Platform sign-in did not return a session" },
        502
      );
    }

    const session = await resolveEditorSessionState(sessionId);
    if (!session) {
      const cleanupResponse = jsonResponse(
        { success: false, error: "Editor session could not be resolved" },
        502
      );
      clearEditorSessionCookie(cleanupResponse);
      return cleanupResponse;
    }

    if (!session.permissions.edit_published_pages) {
      const convex = getConvexClient();
      await mutateInternal(
        convex,
        generatedInternalApi.api.v1.emailAuthInternal.deleteSession,
        { sessionId }
      );
      const deniedResponse = jsonResponse(
        {
          success: false,
          error: "You do not have permission to edit this site",
        },
        403
      );
      clearEditorSessionCookie(deniedResponse);
      return deniedResponse;
    }

    const successResponse = jsonResponse({
      success: true,
      session,
    });
    applyEditorSessionCookie(successResponse, sessionId, expiresAt);
    return successResponse;
  } catch (error) {
    if (error instanceof EditorSessionError) {
      return jsonResponse(
        { success: false, error: error.message },
        error.status
      );
    }

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Editor sign-in failed",
      },
      500
    );
  }
}
