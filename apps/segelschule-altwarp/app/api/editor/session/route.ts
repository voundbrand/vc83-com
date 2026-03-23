export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  clearEditorSessionCookie,
  getEditorSessionStateFromCookie,
} from "@/lib/cms-editor";

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  const session = await getEditorSessionStateFromCookie();

  if (!session) {
    const response = jsonResponse({
      authenticated: false,
      session: null,
    });
    clearEditorSessionCookie(response);
    return response;
  }

  return jsonResponse({
    authenticated: true,
    session,
  });
}
