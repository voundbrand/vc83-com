export const OAUTH_SIGNUP_STORE_STATE_MISSING_MESSAGE =
  "OAuth signup service is temporarily unavailable because backend functions are out of sync.";

export function isMissingOAuthSignupStoreStateFunctionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message || "";
  if (!message.includes("Could not find public function")) {
    return false;
  }

  return (
    message.includes("v1/oauthSignup:storeOAuthSignupState") ||
    message.includes("api/v1/oauthSignup:storeOAuthSignupState")
  );
}
