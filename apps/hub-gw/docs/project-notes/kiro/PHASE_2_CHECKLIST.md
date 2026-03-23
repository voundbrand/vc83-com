# Phase 2: OAuth Integration - Detailed Checklist

**Duration:** 2-3 days
**Status:** Not Started (waiting for Chuck's OAuth credentials)
**Goal:** Integrate Gründungswerft OAuth for member authentication

---

## Overview

This phase implements NextAuth.js with Gründungswerft's PHP League OAuth server. Members will log in with their existing Gründungswerft credentials - no separate registration needed.

**Success Criteria:**
- ✅ NextAuth.js configured with Gründungswerft OAuth
- ✅ Login/logout flow working
- ✅ Session management implemented
- ✅ Protected routes configured
- ✅ Test member can log in successfully

**Prerequisites:**
- ✅ Phase 1 complete (Next.js project set up)
- ⏳ OAuth credentials from Chuck (see [CHUCK_REQUIREMENTS_DE.md](./CHUCK_REQUIREMENTS_DE.md))

---

## Day 3: NextAuth.js Configuration (3-4 hours)

### Morning: NextAuth.js Setup

**1. Verify OAuth Credentials**

Check that `.env.local` has all required variables:

```bash
# These should be filled in (from Chuck)
GRUENDUNGSWERFT_CLIENT_ID=gwapp_abc123
GRUENDUNGSWERFT_CLIENT_SECRET=secret_xyz789
GRUENDUNGSWERFT_AUTHORIZATION_URL=https://intranet.gruendungswerft.com/oauth/authorize
GRUENDUNGSWERFT_TOKEN_URL=https://intranet.gruendungswerft.com/oauth/token
GRUENDUNGSWERFT_USERINFO_URL=https://intranet.gruendungswerft.com/oauth/userinfo

# These should already be set from Phase 1
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generated_secret>
```

**If credentials missing:** Contact Chuck with [CHUCK_REQUIREMENTS_DE.md](./CHUCK_REQUIREMENTS_DE.md)

**2. Create NextAuth Route Handler**

**File:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth, { type NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "gruendungswerft",
      name: "Gründungswerft",
      type: "oauth",
      clientId: process.env.GRUENDUNGSWERFT_CLIENT_ID!,
      clientSecret: process.env.GRUENDUNGSWERFT_CLIENT_SECRET!,
      authorization: {
        url: process.env.GRUENDUNGSWERFT_AUTHORIZATION_URL!,
        params: {
          scope: "profile email", // Adjust based on Chuck's OAuth
          response_type: "code",
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/gruendungswerft`,
        },
      },
      token: {
        url: process.env.GRUENDUNGSWERFT_TOKEN_URL!,
      },
      userinfo: {
        url: process.env.GRUENDUNGSWERFT_USERINFO_URL!,
      },
      profile(profile) {
        // Map Gründungswerft profile to NextAuth user
        // Adjust fields based on actual response from Chuck's OAuth
        return {
          id: profile.sub || profile.id || profile.user_id,
          name: profile.name || `${profile.first_name} ${profile.last_name}`,
          email: profile.email,
          image: profile.picture || profile.avatar || null,
          memberNumber: profile.member_number || profile.membership_id || null,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Add extra fields to JWT on login
      if (user) {
        token.id = user.id;
        token.memberNumber = user.memberNumber;
      }
      return token;
    },
    async session({ session, token }) {
      // Add extra fields to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.memberNumber = token.memberNumber as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login", // Error code passed in query string as ?error=
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  debug: process.env.NODE_ENV === "development", // Enable debug in dev
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

**3. Update Types**

**File:** `src/types/next-auth.d.ts` (create new file)

```typescript
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    memberNumber?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      memberNumber?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    memberNumber?: string;
  }
}
```

**Checklist - Morning:**
- [ ] OAuth credentials verified in `.env.local`
- [ ] NextAuth route handler created
- [ ] Profile mapping configured
- [ ] Type definitions added

### Afternoon: Login Page

**1. Create Login Page**

**File:** `src/app/(auth)/login/page.tsx`

```typescript
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gw-gray p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gw-blue">
            Gründungswerft
          </CardTitle>
          <CardDescription className="text-lg">
            Benefits & Provisionsplattform
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error === "OAuthSignin" && "OAuth-Anmeldung fehlgeschlagen"}
              {error === "OAuthCallback" && "OAuth-Callback-Fehler"}
              {error === "OAuthCreateAccount" && "Konto konnte nicht erstellt werden"}
              {error === "SessionRequired" && "Bitte melden Sie sich an"}
              {!["OAuthSignin", "OAuthCallback", "OAuthCreateAccount", "SessionRequired"].includes(error) &&
                "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."}
            </div>
          )}

          <Button
            onClick={() => signIn("gruendungswerft", { callbackUrl: "/benefits" })}
            className="w-full bg-gw-blue hover:bg-gw-blue-dark text-white font-semibold py-6 text-lg"
            size="lg"
          >
            Mit Gründungswerft anmelden
          </Button>

          <p className="mt-4 text-center text-sm text-gray-600">
            Nur für Gründungswerft-Mitglieder
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**2. Create Auth Layout**

**File:** `src/app/(auth)/layout.tsx`

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anmelden | Gründungswerft",
  description: "Melden Sie sich mit Ihrem Gründungswerft-Konto an",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

**Checklist - Afternoon:**
- [ ] Login page created
- [ ] Error messages in German
- [ ] Gründungswerft branding applied
- [ ] Auth layout created

---

## Day 4: Protected Routes & Session Management (3-4 hours)

### Morning: Middleware & Protected Routes

**1. Create Middleware**

**File:** `src/middleware.ts`

```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Optional: Add custom middleware logic here
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Protected routes
export const config = {
  matcher: [
    "/benefits/:path*",
    "/commissions/:path*",
    "/profile/:path*",
    // Don't protect these:
    // - /login
    // - /api/auth/*
    // - /_next/*
    // - /favicon.ico
  ],
};
```

**2. Create Session Provider**

**File:** `src/app/providers.tsx`

```typescript
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

**3. Update Root Layout**

**File:** `src/app/layout.tsx`

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gründungswerft Benefits & Provisionsplattform",
  description: "Mitglieder-Benefits und Provisionsangebote für Gründungswerft",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

**Checklist - Morning:**
- [ ] Middleware created
- [ ] Protected routes configured
- [ ] Session provider added
- [ ] Root layout updated

### Afternoon: Navigation & Logout

**1. Create Navigation Component**

**File:** `src/components/layout/navbar.tsx`

```typescript
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/benefits" className="text-xl font-bold text-gw-blue">
            Gründungswerft
          </Link>

          <div className="hidden md:flex gap-4">
            <Link
              href="/benefits"
              className="text-gray-700 hover:text-gw-blue font-medium"
            >
              Benefits
            </Link>
            <Link
              href="/commissions"
              className="text-gray-700 hover:text-gw-blue font-medium"
            >
              Provisionen
            </Link>
          </div>
        </div>

        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <User className="w-4 h-4" />
                {session.user.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/benefits">Meine Benefits</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
```

**2. Create Dashboard Layout**

**File:** `src/app/(dashboard)/layout.tsx`

```typescript
import { Navbar } from "@/components/layout/navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gw-gray">
      <Navbar />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

**3. Create Temporary Dashboard Page**

**File:** `src/app/(dashboard)/benefits/page.tsx`

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function BenefitsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Benefits</h1>
      <p>Willkommen, {session.user.name}!</p>
      <p className="text-sm text-gray-600 mt-2">
        Mitgliedsnummer: {session.user.memberNumber || "Keine"}
      </p>
      <p className="mt-4">Benefits-Liste wird in Phase 4 implementiert.</p>
    </div>
  );
}
```

**Checklist - Afternoon:**
- [ ] Navbar component created
- [ ] Dashboard layout created
- [ ] Temporary benefits page created
- [ ] Logout functionality working

---

## Day 5: Testing & Debugging (2-3 hours)

### Morning: OAuth Flow Testing

**1. Test Login Flow**

```bash
# Start dev server
npm run dev

# Open browser
# 1. Go to http://localhost:3000/benefits
# 2. Should redirect to /login (not logged in)
# 3. Click "Mit Gründungswerft anmelden"
# 4. Should redirect to Gründungswerft OAuth
# 5. Enter test credentials (from Chuck)
# 6. Should redirect back to /benefits
# 7. Should see welcome message with name
```

**2. Test Session Persistence**

```bash
# After logging in:
# 1. Refresh page - should stay logged in
# 2. Close tab and reopen - should stay logged in
# 3. Clear cookies - should redirect to login
```

**3. Test Logout**

```bash
# After logging in:
# 1. Click user dropdown
# 2. Click "Abmelden"
# 3. Should redirect to /login
# 4. Should not be able to access /benefits without login
```

**Checklist - Morning:**
- [ ] Login flow works end-to-end
- [ ] Session persists after refresh
- [ ] Logout clears session
- [ ] Protected routes redirect to login

### Afternoon: Debug & Polish

**1. Enable Debug Logging**

In `.env.local`, add:
```bash
# Enable NextAuth.js debug logs
NEXTAUTH_DEBUG=true
```

**2. Common Issues & Fixes**

**Issue:** "OAuthSignin error"

```typescript
// Check redirect_uri matches exactly
// In NextAuth config:
authorization: {
  params: {
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/gruendungswerft`,
  },
}

// Make sure Chuck registered this exact URI
```

**Issue:** "OAuthCallback error"

```typescript
// Check userinfo endpoint response
// Add logging to profile function:
profile(profile) {
  console.log("OAuth profile:", profile);
  // Map profile fields
}
```

**Issue:** "Session not persisting"

```typescript
// Check cookies
// In DevTools > Application > Cookies
// Should see: next-auth.session-token

// Check NEXTAUTH_SECRET is set in .env.local
```

**3. Error Handling**

**File:** `src/app/(auth)/login/page.tsx` (update error messages)

```typescript
{error && (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
    {error === "OAuthSignin" && (
      <>
        <strong>OAuth-Fehler:</strong> Anmeldung bei Gründungswerft fehlgeschlagen.
        Bitte kontaktieren Sie den Support.
      </>
    )}
    {error === "OAuthCallback" && (
      <>
        <strong>Callback-Fehler:</strong> Fehler beim Zurückkehren von Gründungswerft.
        Bitte versuchen Sie es erneut.
      </>
    )}
    {/* Add more error cases */}
  </div>
)}
```

**Checklist - Afternoon:**
- [ ] Debug logging enabled
- [ ] Common issues fixed
- [ ] Error messages clear and in German
- [ ] All edge cases tested

---

## Integration Test Script

**File:** `tests/oauth-integration.test.ts` (optional, for Phase 5)

```typescript
import { test, expect } from '@playwright/test';

test.describe('OAuth Integration', () => {
  test('should login with Gründungswerft', async ({ page }) => {
    // Go to protected page
    await page.goto('/benefits');

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Click login button
    await page.click('text=Mit Gründungswerft anmelden');

    // Should redirect to OAuth
    await expect(page).toHaveURL(/intranet\.gruendungswerft\.com/);

    // Fill in credentials (from Chuck's test account)
    await page.fill('input[name="username"]', process.env.TEST_USERNAME!);
    await page.fill('input[name="password"]', process.env.TEST_PASSWORD!);
    await page.click('button[type="submit"]');

    // Should redirect back to benefits
    await expect(page).toHaveURL('/benefits');

    // Should see welcome message
    await expect(page.locator('text=Willkommen')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first (helper function)
    await loginAsTestUser(page);

    // Click logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Abmelden');

    // Should redirect to login
    await expect(page).toHaveURL('/login');

    // Should not be able to access protected page
    await page.goto('/benefits');
    await expect(page).toHaveURL('/login');
  });
});
```

---

## Completion Checklist

### NextAuth.js Configuration
- [ ] Route handler created (`/api/auth/[...nextauth]`)
- [ ] OAuth provider configured (Gründungswerft)
- [ ] Profile mapping working
- [ ] JWT callbacks configured
- [ ] Session callbacks configured
- [ ] Type definitions added

### UI Implementation
- [ ] Login page created
- [ ] Error messages in German
- [ ] Gründungswerft branding applied
- [ ] Navigation bar with user dropdown
- [ ] Logout functionality

### Protected Routes
- [ ] Middleware configured
- [ ] Protected routes defined
- [ ] Redirects to login working
- [ ] Session persistence working

### Testing
- [ ] Can log in with test account
- [ ] Session persists across refreshes
- [ ] Can log out successfully
- [ ] Protected routes inaccessible when logged out
- [ ] Error states display correctly

---

## Blockers for Next Phase

**Phase 3 (Backend API) requires:**
- ✅ OAuth working (from Phase 2)
- ⏳ L4YERCAK3 API key (should already have)
- ⏳ Organization ID for Gründungswerft in L4YERCAK3

---

## Next Phase

Once Phase 2 is complete, proceed to **[Phase 3: Backend API](./PHASE_3_CHECKLIST.md)**.

---

**Phase 2 Status:** Not Started
**Estimated Completion:** Day 5 end
**Blocker:** Waiting for OAuth credentials from Chuck
