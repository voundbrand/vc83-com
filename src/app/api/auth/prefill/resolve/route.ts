import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";

const generatedApi: any = require("@convex/_generated/api");

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json(
      { valid: false, error: "missing_token" },
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const result = await fetchAction(
      generatedApi.api.authPrefill.resolveSignedAuthPrefill,
      { token }
    );

    if (!result?.valid) {
      return NextResponse.json(
        { valid: false, error: "invalid_or_expired" },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Auth Prefill] Resolve error:", error);
    return NextResponse.json(
      { valid: false, error: "resolver_failed" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
