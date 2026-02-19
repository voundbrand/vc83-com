import { describe, expect, it } from "vitest";
import {
  isMissingOAuthSignupStoreStateFunctionError,
  OAUTH_SIGNUP_STORE_STATE_MISSING_MESSAGE,
} from "../../../src/lib/auth/oauth-signup-runtime";

describe("oauth signup runtime error classifier", () => {
  it("matches missing storeOAuthSignupState runtime errors", () => {
    const error = new Error(
      "Could not find public function for 'v1/oauthSignup:storeOAuthSignupState'. Did you forget to run npx convex dev or npx convex deploy?"
    );

    expect(isMissingOAuthSignupStoreStateFunctionError(error)).toBe(true);
  });

  it("does not match unrelated function errors", () => {
    const error = new Error("Could not find public function for 'v1/oauthSignup:getOAuthSignupState'");

    expect(isMissingOAuthSignupStoreStateFunctionError(error)).toBe(false);
  });

  it("keeps the human-facing outage message stable", () => {
    expect(OAUTH_SIGNUP_STORE_STATE_MISSING_MESSAGE).toContain("temporarily unavailable");
    expect(OAUTH_SIGNUP_STORE_STATE_MISSING_MESSAGE).toContain("out of sync");
  });
});
