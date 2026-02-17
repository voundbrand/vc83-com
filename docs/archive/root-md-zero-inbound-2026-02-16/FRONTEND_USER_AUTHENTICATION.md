# Frontend User Authentication Architecture

## Overview

This system has **two separate authentication layers**:

| System | User Type | Storage | Domain | Purpose |
|--------|-----------|---------|--------|---------|
| **Backend Auth** | Platform users (`users` table) | `users`, `userPasswords` | `admin.platform.com` | Platform staff, admins |
| **Frontend Auth** | Customer users (`frontend_user` objects) | `objects` (type: frontend_user) | `customer-domain.com` | Customers, event attendees |

**Critical**: These systems **cannot be unified** due to OAuth callback constraints and domain isolation requirements.

---

## Why Separate Authentication?

### OAuth Callback Constraint

When a customer signs in with Google OAuth on `customer-domain.com`:

```
1. User clicks "Sign in with Google" on customer-domain.com
2. Browser redirects to Google:
   https://accounts.google.com/oauth?redirect_uri=https://customer-domain.com/auth/callback
3. Google authenticates user
4. Google redirects back to: https://customer-domain.com/auth/callback
```

**Problem if unified**:
- ❌ Cannot redirect to `backend.convex.site/auth/callback` from `customer-domain.com`
- ❌ CORS violations
- ❌ Session cookies won't work across domains
- ❌ Users expect to stay on their domain

### Domain Isolation

**Backend users** access:
- `admin.platform.com` - Platform admin panel
- `backend.convex.site` - Backend APIs
- Full RBAC permissions across all organizations

**Frontend users** access:
- `customer-domain.com` - Customer-facing registration/tickets
- Limited to **their** organization's data
- No cross-organization access

---

## Architecture Decision: Hybrid Approach

### Backend Handles (Convex)
- ✅ User data storage (`frontend_user` objects)
- ✅ Password hashing (bcrypt via Convex actions)
- ✅ Session validation
- ✅ OAuth token verification (after frontend obtains token)
- ✅ Dormant account creation (guest checkout)

### Frontend Handles (Next.js/React)
- ✅ OAuth initiation and callback handling
- ✅ Session storage (cookies on customer domain)
- ✅ Login/signup UI
- ✅ Password reset flow
- ✅ OAuth redirect management

---

## Implementation Guide

### 1. Frontend User Data Model (Backend)

Already implemented in `convex/auth.ts`:

```typescript
// Frontend user object structure
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "frontend_user",
  subtype: "guest" | "oauth" | "password",
  name: string, // email
  status: "active" | "dormant" | "suspended",

  customProperties: {
    email: string,
    firstName?: string,
    lastName?: string,
    displayName?: string,

    // Auth state
    isPasswordSet: boolean,
    passwordHash?: string, // Only for subtype: "password"

    // OAuth data (for subtype: "oauth")
    oauthProvider?: "google" | "microsoft" | "apple",
    oauthId?: string,
    oauthEmail?: string,

    // Tracking
    lastLogin: number,
    createdAt: number,
  }
}
```

### 2. Backend API Endpoints (Convex)

Create these mutations/queries in `convex/frontendAuth.ts`:

```typescript
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * REGISTER WITH PASSWORD
 *
 * Creates active frontend_user account with password.
 * Called from customer-facing registration form.
 */
export const registerWithPassword = action({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    password: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Hash password
    const passwordHash = await ctx.runAction(internal.cryptoActions.hashPassword, {
      password: args.password,
    });

    // Create frontend_user
    const userId = await ctx.runMutation(internal.frontendAuth.createFrontendUser, {
      organizationId: args.organizationId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      passwordHash,
      subtype: "password",
      status: "active",
    });

    // Generate session token
    const sessionToken = await ctx.runMutation(internal.frontendAuth.createSession, {
      userId,
      organizationId: args.organizationId,
    });

    return {
      success: true,
      userId,
      sessionToken,
      user: {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
      },
    };
  },
});

/**
 * LOGIN WITH PASSWORD
 */
export const loginWithPassword = action({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.runQuery(internal.frontendAuth.getUserByEmail, {
      organizationId: args.organizationId,
      email: args.email,
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValid = await ctx.runAction(internal.cryptoActions.verifyPassword, {
      password: args.password,
      hash: user.customProperties?.passwordHash as string,
    });

    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    // Generate session
    const sessionToken = await ctx.runMutation(internal.frontendAuth.createSession, {
      userId: user._id,
      organizationId: args.organizationId,
    });

    return {
      success: true,
      userId: user._id,
      sessionToken,
      user: {
        email: user.customProperties?.email,
        firstName: user.customProperties?.firstName,
        lastName: user.customProperties?.lastName,
      },
    };
  },
});

/**
 * ACTIVATE DORMANT ACCOUNT
 *
 * Converts guest checkout account to active account with password.
 */
export const activateDormantAccount = action({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find dormant user
    const user = await ctx.runQuery(internal.frontendAuth.getUserByEmail, {
      organizationId: args.organizationId,
      email: args.email,
    });

    if (!user) {
      throw new Error("No account found for this email");
    }

    if (user.status !== "dormant") {
      throw new Error("Account is already active");
    }

    // Hash password
    const passwordHash = await ctx.runAction(internal.cryptoActions.hashPassword, {
      password: args.password,
    });

    // Activate account
    await ctx.runMutation(internal.frontendAuth.activateUser, {
      userId: user._id,
      passwordHash,
    });

    // Generate session
    const sessionToken = await ctx.runMutation(internal.frontendAuth.createSession, {
      userId: user._id,
      organizationId: args.organizationId,
    });

    return {
      success: true,
      userId: user._id,
      sessionToken,
    };
  },
});

/**
 * VERIFY OAUTH TOKEN
 *
 * Called after frontend obtains OAuth token from Google/Microsoft.
 * Creates or updates frontend_user with OAuth data.
 */
export const verifyOAuthToken = action({
  args: {
    organizationId: v.id("organizations"),
    provider: v.union(v.literal("google"), v.literal("microsoft")),
    idToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify token with provider (implementation depends on provider)
    let userData: { email: string; name?: string; sub: string };

    if (args.provider === "google") {
      // Verify Google ID token
      userData = await verifyGoogleToken(args.idToken);
    } else {
      // Verify Microsoft token
      userData = await verifyMicrosoftToken(args.idToken);
    }

    // Find or create frontend_user
    let user = await ctx.runQuery(internal.frontendAuth.getUserByOAuth, {
      organizationId: args.organizationId,
      provider: args.provider,
      oauthId: userData.sub,
    });

    if (!user) {
      // Create new OAuth user
      const userId = await ctx.runMutation(internal.frontendAuth.createFrontendUser, {
        organizationId: args.organizationId,
        email: userData.email,
        firstName: userData.name?.split(' ')[0],
        lastName: userData.name?.split(' ').slice(1).join(' '),
        subtype: "oauth",
        status: "active",
        oauthProvider: args.provider,
        oauthId: userData.sub,
        oauthEmail: userData.email,
      });

      user = await ctx.runQuery(internal.frontendAuth.getUserById, {
        userId,
      });
    }

    // Generate session
    const sessionToken = await ctx.runMutation(internal.frontendAuth.createSession, {
      userId: user!._id,
      organizationId: args.organizationId,
    });

    return {
      success: true,
      userId: user!._id,
      sessionToken,
      user: {
        email: userData.email,
        name: userData.name,
      },
    };
  },
});

/**
 * VERIFY SESSION
 *
 * Called on every authenticated request from frontend.
 */
export const verifySession = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("objects")
      .withIndex("by_type", (q) => q.eq("type", "frontend_session"))
      .filter((q) =>
        q.eq(q.field("customProperties.sessionToken"), args.sessionToken)
      )
      .first();

    if (!session) {
      return { valid: false };
    }

    // Check expiration
    const expiresAt = session.customProperties?.expiresAt as number;
    if (expiresAt < Date.now()) {
      return { valid: false };
    }

    // Get user
    const userId = session.customProperties?.userId as Id<"objects">;
    const user = await ctx.db.get(userId);

    if (!user || user.type !== "frontend_user") {
      return { valid: false };
    }

    return {
      valid: true,
      userId: user._id,
      organizationId: user.organizationId,
      email: user.customProperties?.email,
      firstName: user.customProperties?.firstName,
      lastName: user.customProperties?.lastName,
    };
  },
});
```

### 3. Frontend Implementation (Next.js)

Create authentication context and hooks:

#### `/src/contexts/FrontendAuthContext.tsx`

```typescript
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface FrontendUser {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationId: string;
}

interface AuthContextType {
  user: FrontendUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name: { first?: string; last?: string }) => Promise<void>;
  activateAccount: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function FrontendAuthProvider({
  children,
  organizationId,
}: {
  children: React.ReactNode;
  organizationId: string;
}) {
  const convex = useConvex();
  const [user, setUser] = useState<FrontendUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Verify session on mount
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('frontend_session_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result = await convex.query(api.frontendAuth.verifySession, {
          sessionToken: token,
        });

        if (result.valid) {
          setUser({
            userId: result.userId,
            email: result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            organizationId: result.organizationId,
          });
        } else {
          localStorage.removeItem('frontend_session_token');
        }
      } catch (error) {
        console.error('Session verification failed:', error);
        localStorage.removeItem('frontend_session_token');
      }

      setLoading(false);
    };

    verifySession();
  }, [convex]);

  const login = async (email: string, password: string) => {
    const result = await convex.action(api.frontendAuth.loginWithPassword, {
      organizationId,
      email,
      password,
    });

    if (result.success) {
      localStorage.setItem('frontend_session_token', result.sessionToken);
      setUser({
        userId: result.userId,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        organizationId,
      });
    }
  };

  const loginWithGoogle = async () => {
    // Initiate Google OAuth flow
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce: Math.random().toString(36),
    })}`;

    window.location.href = googleAuthUrl;
  };

  const register = async (
    email: string,
    password: string,
    name: { first?: string; last?: string }
  ) => {
    const result = await convex.action(api.frontendAuth.registerWithPassword, {
      organizationId,
      email,
      password,
      firstName: name.first,
      lastName: name.last,
    });

    if (result.success) {
      localStorage.setItem('frontend_session_token', result.sessionToken);
      setUser({
        userId: result.userId,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        organizationId,
      });
    }
  };

  const activateAccount = async (email: string, password: string) => {
    const result = await convex.action(api.frontendAuth.activateDormantAccount, {
      organizationId,
      email,
      password,
    });

    if (result.success) {
      localStorage.setItem('frontend_session_token', result.sessionToken);
      // Fetch full user details
      const sessionResult = await convex.query(api.frontendAuth.verifySession, {
        sessionToken: result.sessionToken,
      });

      if (sessionResult.valid) {
        setUser({
          userId: sessionResult.userId,
          email: sessionResult.email,
          firstName: sessionResult.firstName,
          lastName: sessionResult.lastName,
          organizationId: sessionResult.organizationId,
        });
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('frontend_session_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, register, activateAccount, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useFrontendAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useFrontendAuth must be used within FrontendAuthProvider');
  }
  return context;
}
```

#### OAuth Callback Handler: `/app/auth/google/callback/page.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConvex } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const convex = useConvex();

  useEffect(() => {
    const handleCallback = async () => {
      // Extract ID token from URL fragment
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const idToken = params.get('id_token');

      if (!idToken) {
        router.push('/login?error=no_token');
        return;
      }

      try {
        // Verify token with backend
        const result = await convex.action(api.frontendAuth.verifyOAuthToken, {
          organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
          provider: 'google',
          idToken,
        });

        if (result.success) {
          // Store session
          localStorage.setItem('frontend_session_token', result.sessionToken);

          // Redirect to dashboard
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('OAuth verification failed:', error);
        router.push('/login?error=verification_failed');
      }
    };

    handleCallback();
  }, [convex, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Completing sign in...</h2>
        <p className="text-gray-600 mt-2">Please wait</p>
      </div>
    </div>
  );
}
```

#### Login Component: `/components/frontend-auth/LoginForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useFrontendAuth } from '@/contexts/FrontendAuthContext';

export function LoginForm() {
  const { login, loginWithGoogle } = useFrontendAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      // Success - context will update user state
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Sign In</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
        >
          Sign In
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <button
          onClick={loginWithGoogle}
          className="mt-4 w-full bg-white border border-gray-300 py-2 rounded hover:bg-gray-50 flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            {/* Google logo SVG */}
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
```

---

## Session Management

### Session Storage (frontend_session object)

```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "frontend_session",
  name: "Session for user@example.com",

  customProperties: {
    sessionToken: string, // Random UUID
    userId: Id<"objects">, // frontend_user ID
    expiresAt: number, // Timestamp
    createdAt: number,
    lastActivity: number,
    ipAddress?: string,
    userAgent?: string,
  }
}
```

### Session Validation Middleware

```typescript
// /middleware.ts (Next.js)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('frontend_session_token')?.value;

  // Protected routes
  const protectedPaths = ['/dashboard', '/tickets', '/profile'];
  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

---

## Security Considerations

### Password Security
- ✅ Use bcrypt via Convex actions (backend)
- ✅ Minimum password length: 8 characters
- ✅ Never store plain passwords
- ✅ Hash on backend only (never send hash from frontend)

### OAuth Security
- ✅ Verify ID tokens on backend
- ✅ Use state parameter to prevent CSRF
- ✅ Validate redirect URIs
- ✅ Store OAuth tokens securely

### Session Security
- ✅ HttpOnly cookies (preferred over localStorage)
- ✅ Secure flag in production
- ✅ SameSite=Strict
- ✅ Short session lifetime (24 hours)
- ✅ Refresh tokens for long-lived sessions

---

## Comparison: Backend vs Frontend Auth

| Feature | Backend Auth | Frontend Auth |
|---------|--------------|---------------|
| **User Type** | Platform staff | Customers |
| **Domain** | admin.platform.com | customer-domain.com |
| **OAuth Callback** | backend.convex.site | customer-domain.com |
| **Session Storage** | Backend cookies | Frontend cookies |
| **Password Table** | `userPasswords` | `frontend_user.customProperties.passwordHash` |
| **RBAC** | Full platform access | Organization-scoped |
| **MFA** | Required | Optional |
| **Session Duration** | 7 days | 24 hours |

---

## Migration Path

### For Existing Guest Checkouts

Users created via checkout with `isGuestRegistration: true` can activate their accounts:

```typescript
// Show activation prompt
if (checkoutResult.isGuestRegistration) {
  showModal({
    title: "Create Your Account",
    message: "Set a password to access your tickets anytime",
    onActivate: async (password) => {
      await activateAccount(checkoutResult.email, password);
      router.push('/dashboard');
    },
  });
}
```

---

## Testing

### Test Scenarios

1. **Password Registration**
   - New user signs up with email/password
   - Receives confirmation email
   - Can login immediately

2. **Google OAuth**
   - User clicks "Sign in with Google"
   - Redirects to Google
   - Returns to customer-domain.com/auth/google/callback
   - Session created, user logged in

3. **Dormant Account Activation**
   - User completes guest checkout
   - Receives activation email
   - Sets password
   - Can access tickets

4. **Session Persistence**
   - User logs in
   - Closes browser
   - Returns later
   - Still logged in (within 24 hours)

---

## Deployment Checklist

- [ ] Set up OAuth credentials (Google, Microsoft)
- [ ] Configure redirect URIs for each domain
- [ ] Implement session cleanup (cron job)
- [ ] Add rate limiting on auth endpoints
- [ ] Set up monitoring for failed logins
- [ ] Implement password reset flow
- [ ] Add email verification (optional)
- [ ] Test OAuth flow on staging
- [ ] Test cross-domain isolation
- [ ] Deploy to production

---

## Why This Architecture?

### ✅ Advantages

1. **OAuth Works Correctly** - Callbacks stay on customer domain
2. **Domain Isolation** - Platform users and customers never mix
3. **Scalable** - Can support multiple customer domains
4. **Secure** - Backend validates all auth operations
5. **Flexible** - Easy to add more OAuth providers

### ❌ Cannot Unify Because

1. OAuth callbacks **must** match the initiating domain
2. Session cookies don't work across domains
3. Platform users need different permissions than customers
4. Customer domains are dynamic (white-label support)

---

## Summary

**Backend handles**: User data storage, password hashing, token verification, session validation

**Frontend handles**: OAuth flows, session cookies, login UI, redirect management

**Result**: Secure, scalable dual-authentication system that respects domain boundaries while leveraging backend for all security-critical operations.
