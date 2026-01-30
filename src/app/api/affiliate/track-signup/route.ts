/**
 * AFFILIATE SIGNUP TRACKING API ROUTE
 *
 * Proxies signup events to the RefRef affiliate system.
 * Called from the client after successful signup/OAuth completion.
 *
 * POST /api/affiliate/track-signup
 * Body: { userId, email?, name?, refcode? }
 */

import { NextResponse } from "next/server";
import { trackSignup } from "@/lib/affiliate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, name, refcode } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const result = await trackSignup({ userId, email, name, refcode });

    return NextResponse.json({ success: true, eventId: result?.eventId });
  } catch (error) {
    console.error("[Affiliate] Track signup error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
