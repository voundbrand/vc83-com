import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, response } = body;

    if (!sessionId || !response) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get origin from request headers
    const origin = request.headers.get("origin") || `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Call Convex action to verify registration response
    const result = await convex.action(api.passkeys.verifyRegistration, {
      sessionId,
      response,
      origin,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Passkey verification error:", error);
    return NextResponse.json(
      {
        error: "Failed to verify passkey",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
