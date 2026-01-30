/**
 * AFFILIATE TRACKING CLIENT
 *
 * Client library for communicating with the RefRef affiliate system.
 * Tracks signups (with referral attribution) and purchases (for commission calculation).
 *
 * Integration points:
 * - Signup: Called after user/org creation to attribute referrals
 * - Purchase: Called from Stripe webhook when invoice.paid fires
 *
 * @see docs/layercake-agency-influencers/BACKEND-IMPLEMENTATION-BRIEF.md
 */

const REFREF_API_URL = process.env.REFREF_API_URL || "http://localhost:3002";
const REFREF_API_KEY = process.env.REFREF_API_KEY || "";
const REFREF_PRODUCT_ID = process.env.REFREF_PRODUCT_ID || "";
const REFREF_PROGRAM_ID = process.env.REFREF_PROGRAM_ID || "";

interface TrackSignupParams {
  userId: string;
  email?: string;
  name?: string;
  refcode?: string;
}

interface TrackPurchaseParams {
  userId: string;
  orderId: string;
  orderAmount: number;
  currency?: string;
}

interface TrackResponse {
  success: boolean;
  message: string;
  eventId: string;
}

/**
 * Track a new signup with optional referral attribution.
 * Fire-and-forget safe — returns null on failure, never throws.
 */
export async function trackSignup(
  params: TrackSignupParams
): Promise<TrackResponse | null> {
  if (!REFREF_API_KEY || !REFREF_PRODUCT_ID) {
    console.warn("[Affiliate] RefRef not configured, skipping signup tracking");
    return null;
  }

  try {
    const response = await fetch(`${REFREF_API_URL}/v1/track/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": REFREF_API_KEY,
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        productId: REFREF_PRODUCT_ID,
        programId: REFREF_PROGRAM_ID,
        payload: {
          userId: params.userId,
          email: params.email,
          name: params.name,
          refcode: params.refcode,
        },
      }),
    });

    if (!response.ok) {
      console.error(
        "[Affiliate] Failed to track signup:",
        await response.text()
      );
      return null;
    }

    const data = (await response.json()) as TrackResponse;
    console.log("[Affiliate] Signup tracked:", {
      userId: params.userId,
      refcode: params.refcode,
      eventId: data.eventId,
    });
    return data;
  } catch (error) {
    console.error("[Affiliate] Error tracking signup:", error);
    return null;
  }
}

/**
 * Track a purchase event (triggers commission calculation in RefRef).
 * Fire-and-forget safe — returns null on failure, never throws.
 */
export async function trackPurchase(
  params: TrackPurchaseParams
): Promise<TrackResponse | null> {
  if (!REFREF_API_KEY || !REFREF_PRODUCT_ID) {
    console.warn(
      "[Affiliate] RefRef not configured, skipping purchase tracking"
    );
    return null;
  }

  try {
    const response = await fetch(`${REFREF_API_URL}/v1/track/purchase`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": REFREF_API_KEY,
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        productId: REFREF_PRODUCT_ID,
        programId: REFREF_PROGRAM_ID,
        payload: {
          userId: params.userId,
          orderId: params.orderId,
          orderAmount: params.orderAmount,
          currency: params.currency || "USD",
        },
      }),
    });

    if (!response.ok) {
      console.error(
        "[Affiliate] Failed to track purchase:",
        await response.text()
      );
      return null;
    }

    const data = (await response.json()) as TrackResponse;
    console.log("[Affiliate] Purchase tracked:", {
      userId: params.userId,
      orderId: params.orderId,
      amount: params.orderAmount,
      eventId: data.eventId,
    });
    return data;
  } catch (error) {
    console.error("[Affiliate] Error tracking purchase:", error);
    return null;
  }
}
