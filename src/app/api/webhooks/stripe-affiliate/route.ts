/**
 * STRIPE AFFILIATE WEBHOOK ENDPOINT
 *
 * Receives Stripe webhook events and forwards purchase data to RefRef
 * for affiliate commission calculation.
 *
 * Listens for: invoice.paid
 * Sends: trackPurchase(userId, orderId, amount, currency) → RefRef
 *
 * Configure in Stripe Dashboard:
 * 1. Add webhook endpoint: https://your-domain.com/api/webhooks/stripe-affiliate
 * 2. Select events: invoice.paid
 * 3. Copy signing secret to STRIPE_AFFILIATE_WEBHOOK_SECRET env var
 *
 * @see docs/layercake-agency-influencers/BACKEND-IMPLEMENTATION-BRIEF.md Phase 5
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { trackPurchase } from "@/lib/affiliate";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-10-29.clover",
});

const webhookSecret = process.env.STRIPE_AFFILIATE_WEBHOOK_SECRET || "";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error("[Affiliate Webhook] STRIPE_AFFILIATE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Affiliate Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;

    // Extract customer metadata to get userId/organizationId
    const customerId = invoice.customer as string;
    let userId = "";

    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        // Use organizationId as the userId for RefRef tracking
        // (maps to the affiliate participant's externalId)
        userId =
          customer.metadata.organizationId ||
          customer.metadata.userEmail ||
          customerId;
      }
    } catch (err) {
      console.error("[Affiliate Webhook] Failed to retrieve customer:", err);
      userId = customerId;
    }

    // Forward to RefRef for commission calculation
    const amountPaid = (invoice.amount_paid || 0) / 100; // Convert cents to dollars
    const currency = invoice.currency?.toUpperCase() || "USD";

    await trackPurchase({
      userId,
      orderId: invoice.id,
      orderAmount: amountPaid,
      currency,
    });

    console.log(`[Affiliate Webhook] Tracked purchase: ${invoice.id} ($${amountPaid} ${currency}) for ${userId}`);
  }

  return NextResponse.json({ received: true });
}
