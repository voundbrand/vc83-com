/**
 * Slack OAuth Callback Route
 *
 * Handles OAuth redirect from Slack and returns users to Integrations.
 */

import { NextRequest } from "next/server";
import { handleSlackOAuthCallbackRequest } from "./handle-slack-oauth-callback";

export async function GET(request: NextRequest) {
  return handleSlackOAuthCallbackRequest(request);
}
