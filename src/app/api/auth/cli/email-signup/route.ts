/**
 * CLI Email Signup Route
 * 
 * POST /api/auth/cli/email-signup
 * 
 * Creates account with email/password and returns CLI session token.
 * Uses the same signup logic as platform (signupFreeAccount).
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAction, fetchQuery, fetchMutation } from "convex/nextjs";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: generatedApi } = require("@convex/_generated/api") as { api: any };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      state,
      email,
      password,
      firstName,
      lastName,
      organizationName,
      description,
      industry,
      contactEmail,
      contactPhone,
      timezone,
      dateFormat,
      language,
    } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, firstName, lastName" },
        { status: 400 }
      );
    }

    // Validate state (if provided)
    let cliToken: string | null = null;
    if (state) {
      const stateRecord = await (fetchQuery as any)(generatedApi.api.v1.cliAuth.getCliLoginState, {
        state,
      });

      if (!stateRecord) {
        return NextResponse.json(
          { error: "Invalid or expired state token" },
          { status: 400 }
        );
      }

      cliToken = stateRecord.cliToken;
    } else {
      // Generate new CLI token if no state provided
      cliToken = `cli_session_${crypto.randomUUID().replace(/-/g, '')}`;
    }

    // Create account using platform signup logic
    const signupResult = await (fetchAction as any)(generatedApi.onboarding.signupFreeAccount, {
      email,
      password,
      firstName,
      lastName,
      organizationName,
      description,
      industry,
      contactEmail,
      contactPhone,
      timezone,
      dateFormat,
      language,
    });

    // Create CLI session (30 days expiration)
    const sessionResult = await (fetchAction as any)(generatedApi.api.v1.cliAuth.createCliSessionFromSignup, {
      userId: signupResult.user.id,
      email: signupResult.user.email,
      organizationId: signupResult.organization.id,
      cliToken: cliToken!,
    });

    // Clean up state if it existed
    if (state) {
      await (fetchMutation as any)(generatedApi.api.v1.cliAuth.deleteCliLoginState, {
        state,
      });
    }

    return NextResponse.json({
      token: cliToken,
      sessionId: sessionResult.sessionId,
      userId: signupResult.user.id,
      email: signupResult.user.email,
      organizationId: signupResult.organization.id,
    });
  } catch (error: unknown) {
    console.error("CLI email signup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create account", error_description: errorMessage },
      { status: 500 }
    );
  }
}
