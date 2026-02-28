import { describe, expect, it } from "vitest";
import {
  hasAmbiguousReferralTrackClaim,
  parseCreditsReferralTrackSignupPayload,
} from "../../../convex/api/credits";
import {
  evaluateReferralAttributionAbuse,
  REFERRAL_SIGNUP_VELOCITY_LIMIT,
} from "../../../convex/credits/index";
import { isSubscriptionPaymentConfirmed } from "../../../convex/stripe/platformWebhooks";

describe("referral claim boundary integration", () => {
  it("parses minimal referral attribution payload", () => {
    const parsed = parseCreditsReferralTrackSignupPayload({
      referralCode: "  VC83-REF-001  ",
    });

    expect(parsed).toEqual({
      referralCode: "VC83-REF-001",
      source: undefined,
      userId: undefined,
      organizationId: undefined,
    });
  });

  it("parses attribution source when provided", () => {
    const parsed = parseCreditsReferralTrackSignupPayload({
      referralCode: "CODE123",
      source: "oauth_signup",
    });

    expect(parsed.source).toBe("oauth_signup");
  });

  it("rejects payloads without referralCode", () => {
    expect(() =>
      parseCreditsReferralTrackSignupPayload({ source: "email_signup" })
    ).toThrow("Missing required field: referralCode");
  });

  it("flags ambiguous referral attribution claims", () => {
    const payload = parseCreditsReferralTrackSignupPayload({
      referralCode: "CODE123",
      userId: "user_other",
      organizationId: "org_other",
    });

    expect(
      hasAmbiguousReferralTrackClaim({
        payload,
        authUserId: "user_auth",
        authOrganizationId: "org_auth",
      })
    ).toBe(true);
  });

  it("accepts referral attribution claims bound to authenticated identity", () => {
    const payload = parseCreditsReferralTrackSignupPayload({
      referralCode: "CODE123",
      userId: "user_auth",
      organizationId: "org_auth",
      source: "manual_track",
    });

    expect(
      hasAmbiguousReferralTrackClaim({
        payload,
        authUserId: "user_auth",
        authOrganizationId: "org_auth",
      })
    ).toBe(false);
  });

  it("gates subscription referral rewards on payment-confirmed status", () => {
    expect(isSubscriptionPaymentConfirmed("active")).toBe(true);
    expect(isSubscriptionPaymentConfirmed("trialing")).toBe(false);
    expect(isSubscriptionPaymentConfirmed("incomplete")).toBe(false);
    expect(isSubscriptionPaymentConfirmed("past_due")).toBe(false);
  });

  it("flags referral abuse for self-referrals, duplicate-org attributions, and velocity spikes", () => {
    expect(
      evaluateReferralAttributionAbuse({
        isSelfReferral: true,
        hasExistingReferredOrganizationAttribution: false,
        recentReferralsForReferrer: 0,
      })
    ).toEqual({
      allowed: false,
      reason: "self_referral",
    });

    expect(
      evaluateReferralAttributionAbuse({
        isSelfReferral: false,
        hasExistingReferredOrganizationAttribution: true,
        recentReferralsForReferrer: 0,
      })
    ).toEqual({
      allowed: false,
      reason: "referred_organization_already_attributed",
    });

    expect(
      evaluateReferralAttributionAbuse({
        isSelfReferral: false,
        hasExistingReferredOrganizationAttribution: false,
        recentReferralsForReferrer: REFERRAL_SIGNUP_VELOCITY_LIMIT,
      })
    ).toEqual({
      allowed: false,
      reason: "velocity_limited",
    });
  });

  it("allows referral attribution when abuse checks pass", () => {
    expect(
      evaluateReferralAttributionAbuse({
        isSelfReferral: false,
        hasExistingReferredOrganizationAttribution: false,
        recentReferralsForReferrer: REFERRAL_SIGNUP_VELOCITY_LIMIT - 1,
      })
    ).toEqual({
      allowed: true,
      reason: "clear",
    });
  });
});
