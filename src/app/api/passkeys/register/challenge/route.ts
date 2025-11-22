import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, deviceName } = body;

    if (!sessionId || !deviceName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get origin from request headers
    const origin = request.headers.get("origin") || `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    // Call Convex action to generate registration challenge
    const options = await convex.action(api.passkeys.generateRegistrationChallenge, {
      sessionId,
      deviceName,
      origin,
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error("Passkey challenge generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate passkey challenge",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
