export const dynamic = "force-dynamic";

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { extractPlatformSessionIdFromToken, getAuthSecret } from "@/lib/auth";
import { getConvexClient, mutateInternal } from "@/lib/server-convex";
import {
  clearEditorSessionCookie,
  getEditorSessionIdFromCookie,
} from "@/lib/cms-editor";

// Dynamic require avoids excessively deep Convex API type instantiation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedInternalApi: any =
  require("../../../../../../convex/_generated/api").internal;
type TokenRequest = NonNullable<Parameters<typeof getToken>[0]>["req"];

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const response = jsonResponse({
    success: true,
  });

  const sessionIds = new Set<string>();

  try {
    const cookieSessionId = await getEditorSessionIdFromCookie();
    if (cookieSessionId) {
      sessionIds.add(cookieSessionId);
    }

    const token = await getToken({
      req: request as TokenRequest,
      secret: getAuthSecret(process.env),
    });
    const tokenSessionId = extractPlatformSessionIdFromToken(token);
    if (tokenSessionId) {
      sessionIds.add(tokenSessionId);
    }

    if (sessionIds.size > 0) {
      const convex = getConvexClient();
      for (const sessionId of sessionIds) {
        await mutateInternal(
          convex,
          generatedInternalApi.api.v1.emailAuthInternal.deleteSession,
          { sessionId }
        );
      }
    }
  } catch (error) {
    console.warn("[CMS Editor] Failed to invalidate editor session:", error);
  }

  clearEditorSessionCookie(response);
  return response;
}
