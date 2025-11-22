import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Verify passkey authentication response and create session
 * POST /api/passkeys/authenticate/verify
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, response } = body;

    if (!email || !response) {
      return NextResponse.json(
        { error: "Email and response are required" },
        { status: 400 }
      );
    }

    // Get origin from request headers
    const origin = request.headers.get("origin") || `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const result = await convex.action(api.passkeys.verifyAuthentication, {
      email,
      response,
      origin,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify authentication" },
      { status: 500 }
    );
  }
}
