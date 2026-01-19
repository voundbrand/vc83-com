/**
 * External Domain Routing Middleware
 *
 * Routes requests from custom domains to the appropriate project pages.
 *
 * Flow:
 * 1. Check if request is from a custom domain (not primary domains)
 * 2. Look up domain config in Convex via HTTP endpoint
 * 3. Rewrite to /project/[slug] with domain context
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Primary domains that should NOT be rewritten
const PRIMARY_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "l4yercak3.com",
  "www.l4yercak3.com",
  "app.l4yercak3.com",
  "vc83.com",
  "www.vc83.com",
  "app.vc83.com",
  // Vercel domains
  ".vercel.app",
  ".vercel.sh",
];

// Paths that should never be rewritten
const EXCLUDED_PATHS = [
  "/api/",
  "/_next/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/.well-known/",
  "/auth/",
  "/login",
  "/signup",
  "/dashboard",
  "/app",
  "/checkout/",
  "/events/",
  "/project/", // Don't rewrite existing project routes
];

/**
 * Check if hostname is a primary/internal domain
 */
function isPrimaryDomain(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase().replace(/:\d+$/, "");

  return PRIMARY_DOMAINS.some((domain) => {
    if (domain.startsWith(".")) {
      return normalizedHost.endsWith(domain);
    }
    return normalizedHost === domain;
  });
}

/**
 * Check if path should be excluded from rewriting
 */
function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATHS.some((path) => pathname.startsWith(path));
}

/**
 * Simple in-memory cache for domain lookups
 * Edge runtime compatible
 */
const domainCache = new Map<string, { data: DomainLookupResult; expires: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

interface DomainLookupResult {
  found: boolean;
  projectSlug?: string;
  organizationId?: string;
  domainConfigId?: string;
}

/**
 * Look up domain configuration from Convex
 */
async function lookupDomain(hostname: string): Promise<DomainLookupResult> {
  // Check cache first
  const cached = domainCache.get(hostname);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.error("[Middleware] NEXT_PUBLIC_CONVEX_URL not configured");
      return { found: false };
    }

    // Convert convex.cloud URL to convex.site for HTTP actions
    const siteUrl = convexUrl.replace(".convex.cloud", ".convex.site");

    const response = await fetch(`${siteUrl}/api/v1/domain-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname }),
    });

    if (!response.ok) {
      console.error("[Middleware] Domain lookup failed:", response.status);
      return { found: false };
    }

    const result = (await response.json()) as DomainLookupResult;

    // Cache the result
    domainCache.set(hostname, {
      data: result,
      expires: Date.now() + CACHE_TTL,
    });

    return result;
  } catch (error) {
    console.error("[Middleware] Domain lookup error:", error);
    return { found: false };
  }
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Skip primary domains
  if (isPrimaryDomain(hostname)) {
    return NextResponse.next();
  }

  // Skip excluded paths
  if (isExcludedPath(pathname)) {
    return NextResponse.next();
  }

  // Look up domain configuration
  const domainConfig = await lookupDomain(hostname);

  if (!domainConfig.found || !domainConfig.projectSlug) {
    // Domain not configured - show custom domain not found page
    // For now, redirect to main site
    console.log(`[Middleware] Unknown domain: ${hostname}`);
    return NextResponse.redirect(new URL("https://l4yercak3.com", request.url));
  }

  // Rewrite to project page
  // If user visits client-domain.com/, route to /project/[slug]
  // If user visits client-domain.com/something, route to /project/[slug]/something
  const projectPath = pathname === "/" ? "" : pathname;
  const projectUrl = new URL(
    `/project/${domainConfig.projectSlug}${projectPath}`,
    request.url
  );

  // Preserve query string
  projectUrl.search = request.nextUrl.search;

  const response = NextResponse.rewrite(projectUrl);

  // Add domain context headers (can be read by the page if needed)
  response.headers.set("x-custom-domain", hostname);
  response.headers.set("x-organization-id", domainConfig.organizationId || "");
  response.headers.set("x-domain-config-id", domainConfig.domainConfigId || "");
  response.headers.set("x-is-custom-domain", "true");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Static file extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)",
  ],
};
