import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Generate authentication challenge for passkey login
 * POST /api/passkeys/authenticate/challenge
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Get origin from request headers
    const origin = request.headers.get("origin") || `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    try {
      const options = await convex.action(api.passkeys.generateAuthenticationChallenge, {
        email,
        origin,
      });

      return NextResponse.json(options);
    } catch (convexError) {
      // Convex action threw an error - extract the message
      console.error("Full Convex error object:", JSON.stringify(convexError, null, 2));

      let errorMessage = "Failed to generate authentication challenge";
      let errorCode = "AUTHENTICATION_ERROR";

      // Try to get error message from Convex error
      if (convexError instanceof Error) {
        errorMessage = convexError.message;

        // Check if there's additional data in the Error object
        const errWithData = convexError as any;
        if (errWithData.data) {
          console.error("Error data:", errWithData.data);
          // Try to extract from data property
          if (typeof errWithData.data === 'string') {
            errorMessage = errWithData.data;
          } else if (errWithData.data.message) {
            errorMessage = errWithData.data.message;
          }
        }
      } else if (typeof convexError === 'string') {
        errorMessage = convexError;
      } else if (convexError && typeof convexError === 'object') {
        // Try various properties where Convex might store the error
        const errObj = convexError as any;
        errorMessage = errObj.message || errObj.error || errObj.data?.message || errorMessage;
      }

      console.error("Extracted error message:", errorMessage);
      console.error("Error code will be:", errorCode);

      // Detect specific error types for better client handling
      if (errorMessage.includes("No passkey set up")) {
        errorCode = "NO_PASSKEY_CONFIGURED";
      } else if (errorMessage.includes("No account found")) {
        errorCode = "ACCOUNT_NOT_FOUND";
      }

      return NextResponse.json(
        { error: errorMessage, code: errorCode },
        { status: 500 }
      );
    }
  } catch (error) {
    // Outer catch for request parsing errors
    console.error("Request parsing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 }
    );
  }
}
