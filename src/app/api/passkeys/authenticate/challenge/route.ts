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

    const options = await convex.action(api.passkeys.generateAuthenticationChallenge, {
      email,
      origin,
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generating authentication challenge:", error);

    // Extract error message from Convex error or regular Error
    let errorMessage = "Failed to generate authentication challenge";

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    } else if (error && typeof error === 'object' && 'data' in error) {
      // Convex errors sometimes have error message in data field
      const data = error.data as any;
      if (data && data.message) {
        errorMessage = data.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
