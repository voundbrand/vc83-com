export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getConvexClient, mutateInternal } from "@/lib/server-convex";
import {
  clearEditorSessionCookie,
  getEditorSessionIdFromCookie,
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

export async function POST() {
  const response = jsonResponse({
    success: true,
  });

  try {
    const sessionId = await getEditorSessionIdFromCookie();
    if (sessionId) {
      const convex = getConvexClient();
      await mutateInternal(
        convex,
        generatedInternalApi.api.v1.emailAuthInternal.deleteSession,
        { sessionId }
      );
    }
  } catch (error) {
    console.warn("[CMS Editor] Failed to invalidate editor session:", error);
  }

  clearEditorSessionCookie(response);
  return response;
}
