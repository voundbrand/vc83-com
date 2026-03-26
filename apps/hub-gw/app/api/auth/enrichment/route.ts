export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getHubGwUserProfileEnrichment } from "@/lib/server-convex";

interface HubGwTokenAuthContext {
  crmContactId?: string | null;
  crmOrganizationId?: string | null;
}

function toAuthContext(value: unknown): HubGwTokenAuthContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as HubGwTokenAuthContext;
}

export async function GET(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "AUTH_SECRET is not configured" },
      { status: 500 }
    );
  }

  const token = await getToken({ req: request, secret });
  const authContext = toAuthContext(token?.auth);
  if (!authContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const enrichment = await getHubGwUserProfileEnrichment({
      crmContactId: authContext.crmContactId,
      crmOrganizationId: authContext.crmOrganizationId,
    });
    return NextResponse.json(enrichment);
  } catch (error) {
    console.error("[hub-gw-profile] Failed to resolve profile enrichment", error);
    return NextResponse.json(
      { error: "Failed to load profile enrichment" },
      { status: 500 }
    );
  }
}
