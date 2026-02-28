import { NextRequest } from "next/server";
import { handleSlackOAuthCallbackRequest } from "../../../../api/oauth/slack/callback/handle-slack-oauth-callback";

export async function GET(request: NextRequest) {
  return handleSlackOAuthCallbackRequest(request);
}

