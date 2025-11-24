import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Generate authentication challenge for passkey login
 * POST /api/passkeys/authenticate/challenge
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Get origin from request headers
    const origin = request.headers.get("origin") || `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const result = await convex.action(api.passkeys.generateAuthenticationChallenge, {
      email,
      origin,
    });

    // Check if result is an error response
    if ('error' in result && 'code' in result) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }

    // Success - return the authentication options
    return NextResponse.json(result);
  } catch (error) {
    // Outer catch for request parsing errors
    console.error("Request parsing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}
