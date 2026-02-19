/**
 * Slack OAuth Callback Route
 *
 * Handles OAuth redirect from Slack and returns users to Integrations.
 */

import { NextRequest, NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { fetchAction } from "convex/nextjs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/?window=integrations&error=${encodeURIComponent(
          errorDescription || error
        )}`,
        request.url
      )
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/?window=integrations&error=missing_oauth_params", request.url)
    );
  }

  try {
    const result = await fetchAction(api.oauth.slack.handleSlackCallback, {
      code,
      state,
    });

    if (result.returnUrl) {
      const returnUrl = new URL(result.returnUrl, request.url);
      returnUrl.searchParams.set("success", "slack_connected");
      returnUrl.searchParams.set("workspace", result.workspaceName);
      return NextResponse.redirect(returnUrl);
    }

    return NextResponse.redirect(
      new URL(
        `/?window=integrations&success=slack_connected&workspace=${encodeURIComponent(
          result.workspaceName
        )}`,
        request.url
      )
    );
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "connection_failed";

    return NextResponse.redirect(
      new URL(
        `/?window=integrations&error=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    );
  }
}
