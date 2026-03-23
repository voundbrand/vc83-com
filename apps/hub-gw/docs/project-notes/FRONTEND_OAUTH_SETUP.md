# Frontend OAuth Authentication Setup Guide

This guide explains how to integrate OAuth authentication in your frontend Next.js application while managing all user data in the centralized backend.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [OAuth App Registration](#oauth-app-registration)
- [Backend API Endpoints](#backend-api-endpoints)
- [Frontend Implementation](#frontend-implementation)
- [API Client Usage](#api-client-usage)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level Flow

```
┌─────────────────┐
│  Frontend App   │
│   (Next.js)     │
│                 │
│  1. User clicks │
│     "Sign in"   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  NextAuth.js    │
│  OAuth Provider │
│                 │
│  2. Redirect to │
│     Google/MS   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OAuth Provider │
│ (Google/MS)     │
│                 │
│  3. User grants │
│     permission  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  NextAuth.js    │
│  Callback       │
│                 │
│  4. Call backend│
│     /sync-user  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Backend (Convex)               │
│                                 │
│  5. Create/update frontend_user │
│  6. Link to crm_contact/org     │
│  7. Return user object          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Frontend App   │
│                 │
│  8. Store JWT   │
│  9. Make API    │
│     calls       │
└─────────────────┘
```

### Key Principles

- **Single Database**: All user data lives in the backend Convex database
- **No Frontend Database**: Frontend only handles OAuth and API calls
- **Centralized Auth**: Backend validates all requests and manages permissions
- **Linked Entities**: Frontend users are linked to existing CRM contacts/organizations

---

## Prerequisites

### Backend Requirements

✅ Backend Convex deployment running
✅ Ontology system (`objects`, `objectLinks`, `objectActions` tables)
✅ CRM data (contacts, organizations) already in place

### Frontend Requirements

✅ Next.js 14+ application (App Router)
✅ Node.js 18+ installed
✅ Access to OAuth provider admin consoles (Google, Microsoft)

---

## OAuth App Registration

You must create **separate OAuth app registrations** for the frontend (different from backend registrations).

### Google OAuth Setup

1. **Go to Google Cloud Console**
   - Navigate to: https://console.cloud.google.com/
   - Select your project or create a new one

2. **Enable Google+ API**
   - Go to "APIs & Services" → "Enable APIs and Services"
   - Search for "Google+ API" and enable it

3. **Create OAuth Client ID**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `YourApp - Frontend`

4. **Configure Redirect URIs**
   ```
   Production:
   https://yourdomain.com/api/auth/callback/google

   Development:
   http://localhost:3000/api/auth/callback/google
   ```

5. **Save Credentials**
   - Copy `Client ID` and `Client Secret`
   - Store in `.env.local` (see below)

### Microsoft Entra ID (Azure AD) Setup

1. **Go to Azure Portal**
   - Navigate to: https://portal.azure.com/
   - Go to "Microsoft Entra ID" (formerly Azure AD)

2. **Register Application**
   - Go to "App registrations" → "New registration"
   - Name: `YourApp - Frontend`
   - Supported account types: Choose based on your needs
   - Redirect URI: **Web**

3. **Configure Redirect URIs**
   ```
   Production:
   https://yourdomain.com/api/auth/callback/microsoft

   Development:
   http://localhost:3000/api/auth/callback/microsoft
   ```

4. **Create Client Secret**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: `Frontend OAuth Secret`
   - Expires: Choose duration
   - **Copy the secret value immediately** (you can't see it again!)

5. **Save Credentials**
   - Copy `Application (client) ID`
   - Copy `Directory (tenant) ID`
   - Copy `Client Secret` value
   - Store in `.env.local` (see below)

6. **Configure API Permissions**
   - Go to "API permissions"
   - Add permissions:
     - `User.Read`
     - `email`
     - `profile`
     - `openid`

---

## Backend API Endpoints

The backend provides these endpoints for frontend authentication:

### 1. **POST /api/v1/auth/sync-user**

Creates or updates a frontend user in the backend after OAuth login.

**Request:**
```typescript
POST https://your-backend.convex.cloud/api/v1/auth/sync-user
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe",
  "oauthProvider": "google" | "microsoft",
  "oauthId": "provider_user_id_12345"
}
```

**Response:**
```typescript
{
  "_id": "k1abc123...",
  "_creationTime": 1234567890,
  "organizationId": "org_xyz",
  "type": "frontend_user",
  "subtype": "oauth",
  "name": "user@example.com",
  "status": "active",
  "customProperties": {
    "oauthProvider": "google",
    "oauthId": "provider_user_id_12345",
    "displayName": "John Doe",
    "lastLogin": 1234567890,
    "crmContactId": "k1contact123...", // If linked
    "crmOrganizationId": "k1org123..." // If linked
  },
  "createdBy": "system",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

### 2. **POST /api/v1/auth/validate-token**

Validates a frontend user's session token.

**Request:**
```typescript
POST https://your-backend.convex.cloud/api/v1/auth/validate-token
Content-Type: application/json
Authorization: Bearer <frontend_user_id>

{
  "userId": "k1abc123..."
}
```

**Response:**
```typescript
{
  "valid": true,
  "user": { /* frontend_user object */ },
  "crmContext": {
    "contactId": "k1contact123...",
    "organizationId": "k1org123..."
  }
}
```

### 3. **GET /api/v1/crm/***

All CRM endpoints require authentication and are automatically scoped to the user's CRM organization.

**Example:**
```typescript
GET https://your-backend.convex.cloud/api/v1/crm/contacts
Authorization: Bearer <frontend_user_id>

Response:
[
  {
    "_id": "k1contact123...",
    "type": "crm_contact",
    "name": "Jane Smith",
    // ... only contacts from user's CRM organization
  }
]
```

---

## Frontend Implementation

### Step 1: Install Dependencies

```bash
npm install next-auth@beta
```

**Note:** Use `next-auth@beta` for Next.js 14+ App Router support.

### Step 2: Environment Variables

Create `.env.local` in your frontend root:

```bash
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-here-use-openssl-rand-base64-32

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id

# Backend API
NEXT_PUBLIC_BACKEND_API_URL=https://your-backend.convex.cloud
BACKEND_API_URL=https://your-backend.convex.cloud
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 3: NextAuth.js Configuration

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import MicrosoftEntraIDProvider from "next-auth/providers/microsoft-entra-id";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    MicrosoftEntraIDProvider({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      tenantId: process.env.AZURE_TENANT_ID!,
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Call backend to sync user
        const response = await fetch(`${process.env.BACKEND_API_URL}/api/v1/auth/sync-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            name: user.name,
            oauthProvider: account?.provider,
            oauthId: account?.providerAccountId,
          }),
        });

        if (!response.ok) {
          console.error('Failed to sync user with backend');
          return false;
        }

        const backendUser = await response.json();

        // Store backend user ID for later use
        user.backendUserId = backendUser._id;
        user.crmContactId = backendUser.customProperties?.crmContactId;
        user.crmOrganizationId = backendUser.customProperties?.crmOrganizationId;

        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },

    async jwt({ token, user, account }) {
      // Add backend user info to JWT token
      if (user) {
        token.backendUserId = user.backendUserId;
        token.crmContactId = user.crmContactId;
        token.crmOrganizationId = user.crmOrganizationId;
      }
      return token;
    },

    async session({ session, token }) {
      // Add backend user info to session
      if (token && session.user) {
        session.user.backendUserId = token.backendUserId as string;
        session.user.crmContactId = token.crmContactId as string;
        session.user.crmOrganizationId = token.crmOrganizationId as string;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

### Step 4: TypeScript Types

Create `types/next-auth.d.ts`:

```typescript
import 'next-auth';

declare module 'next-auth' {
  interface User {
    backendUserId?: string;
    crmContactId?: string;
    crmOrganizationId?: string;
  }

  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      backendUserId?: string;
      crmContactId?: string;
      crmOrganizationId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    backendUserId?: string;
    crmContactId?: string;
    crmOrganizationId?: string;
  }
}
```

### Step 5: Session Provider

Create `app/providers.tsx`:

```typescript
'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

Update `app/layout.tsx`:

```typescript
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 6: Sign In Page

Create `app/auth/signin/page.tsx`:

```typescript
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (provider: 'google' | 'azure-ad') => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>

        <div className="space-y-4">
          <button
            onClick={() => handleSignIn('google')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            onClick={() => handleSignIn('azure-ad')}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 23 23">
              <path fill="#f25022" d="M1 1h10v10H1z"/>
              <path fill="#00a4ef" d="M12 1h10v10H12z"/>
              <path fill="#7fba00" d="M1 12h10v10H1z"/>
              <path fill="#ffb900" d="M12 12h10v10H12z"/>
            </svg>
            <span>Continue with Microsoft</span>
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## API Client Usage

### Create API Client

Create `lib/api-client.ts`:

```typescript
import { getServerSession } from 'next-auth';
import { getSession } from 'next-auth/react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

/**
 * Client-side API calls (from React components)
 */
export async function callBackendAPI<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await getSession();

  if (!session?.user?.backendUserId) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.user.backendUserId}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Server-side API calls (from Server Components or API routes)
 */
export async function callBackendAPIServer<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await getServerSession();

  if (!session?.user?.backendUserId) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.user.backendUserId}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return response.json();
}
```

### Usage in Components

**Client Component Example:**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { callBackendAPI } from '@/lib/api-client';

interface Contact {
  _id: string;
  name: string;
  email: string;
}

export function ContactsList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContacts() {
      try {
        const data = await callBackendAPI<Contact[]>('/api/v1/crm/contacts');
        setContacts(data);
      } catch (error) {
        console.error('Failed to load contacts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadContacts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {contacts.map((contact) => (
        <li key={contact._id}>
          {contact.name} - {contact.email}
        </li>
      ))}
    </ul>
  );
}
```

**Server Component Example:**

```typescript
import { callBackendAPIServer } from '@/lib/api-client';

interface Contact {
  _id: string;
  name: string;
  email: string;
}

export default async function ContactsPage() {
  const contacts = await callBackendAPIServer<Contact[]>('/api/v1/crm/contacts');

  return (
    <div>
      <h1>Contacts</h1>
      <ul>
        {contacts.map((contact) => (
          <li key={contact._id}>
            {contact.name} - {contact.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Protected Routes

Create `app/dashboard/layout.tsx`:

```typescript
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect('/auth/signin');
  }

  return <>{children}</>;
}
```

Or use middleware for app-wide protection (`middleware.ts`):

```typescript
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: ['/dashboard/:path*', '/crm/:path*'],
};
```

---

## Testing

### 1. Test OAuth Flow

1. Start your frontend: `npm run dev`
2. Navigate to: `http://localhost:3000/auth/signin`
3. Click "Continue with Google" or "Continue with Microsoft"
4. Complete OAuth consent
5. Check backend logs to verify user creation
6. Verify redirect to `/dashboard`

### 2. Test API Calls

```typescript
// app/test/page.tsx
'use client';

import { useEffect } from 'react';
import { callBackendAPI } from '@/lib/api-client';

export default function TestPage() {
  useEffect(() => {
    async function test() {
      try {
        const result = await callBackendAPI('/api/v1/crm/contacts');
        console.log('API Response:', result);
      } catch (error) {
        console.error('API Error:', error);
      }
    }
    test();
  }, []);

  return <div>Check console for API response</div>;
}
```

### 3. Verify Backend User Creation

Check Convex dashboard:
1. Go to your Convex deployment dashboard
2. Navigate to "Data" → "objects" table
3. Filter by `type: "frontend_user"`
4. Verify user record exists with correct data

---

## Troubleshooting

### Issue: "Redirect URI mismatch" Error

**Cause:** OAuth redirect URIs don't match what's registered.

**Solution:**
- Verify `.env.local` has correct `NEXTAUTH_URL`
- Check OAuth app registration has exact redirect URI
- Include both `http://localhost:3000` and production URLs

### Issue: User not created in backend

**Cause:** Backend API call failing in `signIn` callback.

**Solution:**
- Check `BACKEND_API_URL` environment variable
- Verify backend is running and accessible
- Check backend logs for errors
- Add `debug: true` to NextAuth config

### Issue: "Not authenticated" in API calls

**Cause:** Session not properly initialized.

**Solution:**
- Verify `SessionProvider` wraps your app
- Check `backendUserId` is in session (console.log session)
- Ensure cookies are enabled

### Issue: CORS errors when calling backend

**Cause:** Backend not configured to accept requests from frontend domain.

**Solution:**
- Add frontend domain to backend CORS whitelist
- In Convex HTTP action, add proper CORS headers:

```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
});
```

### Issue: Session expires too quickly

**Cause:** Default JWT expiration.

**Solution:**
- Adjust `session.maxAge` in NextAuth config
- Implement refresh token rotation if needed

---

## Security Considerations

### ✅ DO:

- Always use HTTPS in production
- Keep OAuth client secrets secure (never commit to Git)
- Validate all user input on backend
- Implement rate limiting on auth endpoints
- Use short-lived JWT tokens
- Log all authentication events

### ❌ DON'T:

- Don't store sensitive data in JWT tokens
- Don't trust client-side data without backend validation
- Don't use same OAuth credentials for dev and prod
- Don't expose backend user IDs in URLs
- Don't skip CSRF protection

---

## Production Checklist

Before deploying to production:

- [ ] Update `NEXTAUTH_URL` to production domain
- [ ] Update OAuth redirect URIs to production URLs
- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Set up separate OAuth apps for production
- [ ] Configure CORS properly in backend
- [ ] Enable rate limiting on auth endpoints
- [ ] Set up monitoring for failed auth attempts
- [ ] Test full auth flow in production environment
- [ ] Document any provider-specific requirements
- [ ] Set up email notifications for security events

---

## Support

For questions or issues:

1. Check backend logs in Convex dashboard
2. Check frontend console for errors
3. Review OAuth provider documentation:
   - [Google OAuth](https://developers.google.com/identity/protocols/oauth2)
   - [Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/)
4. Review NextAuth.js documentation: https://next-auth.js.org/

---

## Appendix: Example Environment Files

### Frontend `.env.local` (Development)

```bash
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generated-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456

# Microsoft OAuth
AZURE_CLIENT_ID=abcd1234-5678-90ef-ghij-klmnopqrstuv
AZURE_CLIENT_SECRET=abc~DEF123_ghi456-JKL789
AZURE_TENANT_ID=wxyz9876-5432-10ab-cdef-ghijklmnopqr

# Backend API
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3001
BACKEND_API_URL=http://localhost:3001
```

### Frontend `.env.production` (Production)

```bash
# NextAuth.js
NEXTAUTH_URL=https://app.yourdomain.com
NEXTAUTH_SECRET=different-production-secret-here

# Google OAuth (Production App)
GOOGLE_CLIENT_ID=987654321.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz789uvw456

# Microsoft OAuth (Production App)
AZURE_CLIENT_ID=efgh5678-9012-34ij-klmn-opqrstuvwxyz
AZURE_CLIENT_SECRET=xyz~ABC987_mno654-PQR321
AZURE_TENANT_ID=stuv4321-8765-09wx-yzab-cdefghijklmn

# Backend API
NEXT_PUBLIC_BACKEND_API_URL=https://api.yourdomain.com
BACKEND_API_URL=https://api.yourdomain.com
```

---

**Last Updated:** 2025-01-14
**Version:** 1.0.0
