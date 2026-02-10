/**
 * STRIPE SMS CHECKOUT API ROUTE
 *
 * Next.js API route bridge to Convex action for VLN number checkout.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("../../../../../convex/_generated/api") as { api: any };
import { Id } from "../../../../../convex/_generated/dataModel";

function getConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, organizationName, email, successUrl, cancelUrl } = body;

    if (!organizationId || !email) {
      return NextResponse.json(
        { error: "Missing required fields: organizationId, email" },
        { status: 400 }
      );
    }

    const convex = getConvexClient();
    const result = await convex.action(api.stripe.smsCheckout.createSmsCheckoutSession, {
      organizationId: organizationId as Id<"organizations">,
      organizationName: organizationName || "",
      email,
      successUrl: successUrl || `${req.nextUrl.origin}?sms_checkout=success`,
      cancelUrl: cancelUrl || `${req.nextUrl.origin}?sms_checkout=cancel`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating SMS checkout session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
