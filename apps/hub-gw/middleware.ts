import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type HubGwTokenAuth = {
  isSeller?: boolean;
} | null;

function readAuthFromToken(token: unknown): HubGwTokenAuth {
  if (!token || typeof token !== "object" || Array.isArray(token)) {
    return null;
  }
  const source = token as Record<string, unknown>;
  const auth = source.auth;
  if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
    return null;
  }
  return auth as HubGwTokenAuth;
}

function buildSignInRedirect(request: NextRequest): NextResponse {
  const signInUrl = new URL("/auth/signin", request.url);
  signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret });
  const auth = readAuthFromToken(token);

  if (!auth) {
    return buildSignInRedirect(request);
  }

  if (
    request.nextUrl.pathname.startsWith("/meine-angebote")
    && auth.isSeller !== true
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile/:path*",
    "/my-requests/:path*",
    "/meine-angebote/:path*",
  ],
};
