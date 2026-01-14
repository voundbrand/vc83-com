/**
 * STRIPE AI BILLING WEBHOOKS
 *
 * Handles webhook events from Stripe for AI subscription billing.
 * Updates subscription status in Convex database based on Stripe events.
 *
 * NOTE: This route is currently disabled during build to avoid Convex client
 * instantiation issues. The webhook functionality should be moved to a Convex
 * HTTP action instead.
 */

// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/stripe/ai-billing-webhooks
 *
 * Placeholder webhook handler - actual implementation should be in Convex HTTP actions
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  console.warn("AI Billing webhook received but handler not fully implemented");
  console.warn("Webhook functionality should be moved to Convex HTTP actions");

  return NextResponse.json({
    received: true,
    message: "Webhook acknowledged but not processed - implement in Convex HTTP actions"
  });
}
