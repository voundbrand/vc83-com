import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  try {
    const { priceId, mentorId } = await request.json();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.headers.get("origin")}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get("origin")}/booking/cancel`,
      metadata: {
        mentorId: mentorId,
      },
      // Collect customer information
      customer_creation: "always",
      billing_address_collection: "required",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: "Error creating checkout session" }, { status: 500 });
  }
}
