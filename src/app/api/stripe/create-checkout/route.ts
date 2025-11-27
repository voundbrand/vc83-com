/**
 * STRIPE CHECKOUT API ROUTE
 *
 * Next.js API route that calls Convex action to create Stripe Checkout session.
 * This acts as a bridge between the frontend and Convex actions.
 */

// Force dynamic rendering to avoid build-time evaluation
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

// Lazy initialize Convex client to avoid build-time instantiation
function getConvexClient() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
    auth: process.env.CONVEX_DEPLOY_KEY,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, organizationName, email, tier, successUrl, cancelUrl } = body;

    // Validate required fields
    if (!organizationId || !organizationName || !email || !tier) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call Convex action to create checkout session
    const convex = getConvexClient();
    const result = await convex.action(api.stripe.aiCheckout.createAICheckoutSession, {
      organizationId: organizationId as Id<"organizations">,
      organizationName,
      email,
      tier,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
