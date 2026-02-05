/**
 * Consume Session Cookie Route (SEC-010)
 *
 * POST /api/auth/consume-session
 *
 * Reads the pending_session HTTP-only cookie set during OAuth callback,
 * returns the session token to the client, and deletes the cookie.
 * This avoids passing session tokens in URL parameters.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const pendingSession = cookieStore.get("pending_session");

  if (!pendingSession?.value) {
    return NextResponse.json(
      { error: "No pending session" },
      { status: 404 }
    );
  }

  // Return the token and delete the cookie
  const response = NextResponse.json({
    token: pendingSession.value,
  });

  response.cookies.set("pending_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // Delete immediately
  });

  return response;
}
