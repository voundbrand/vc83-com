export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { clearEditorSessionCookie } from "@/lib/cms-editor";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST() {
  const response = jsonResponse(
    {
      success: false,
      error:
        "Direct editor sign-in is disabled. Use the NextAuth-based platform/OIDC login flow.",
    },
    410
  );
  clearEditorSessionCookie(response);
  return response;
}
