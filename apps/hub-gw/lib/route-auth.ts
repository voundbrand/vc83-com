import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export interface HubGwSellerAuthContext {
  frontendUserId: string;
  crmContactId: string | null;
  crmOrganizationId: string | null;
  subOrgId: string | null;
  isSeller: boolean;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toSellerAuthContext(value: unknown): HubGwSellerAuthContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const frontendUserId = normalizeOptionalString(source.frontendUserId);
  if (!frontendUserId) {
    return null;
  }

  return {
    frontendUserId,
    crmContactId: normalizeOptionalString(source.crmContactId),
    crmOrganizationId: normalizeOptionalString(source.crmOrganizationId),
    subOrgId: normalizeOptionalString(source.subOrgId),
    isSeller: source.isSeller === true,
  };
}

type RequireSellerAuthResult =
  | { ok: true; auth: HubGwSellerAuthContext }
  | { ok: false; response: NextResponse };

export async function requireSellerAuth(
  request: NextRequest
): Promise<RequireSellerAuthResult> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "AUTH_SECRET is not configured" },
        { status: 500 }
      ),
    };
  }

  const token = await getToken({ req: request, secret });
  const auth = toSellerAuthContext(token?.auth);

  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!auth.isSeller) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, auth };
}
