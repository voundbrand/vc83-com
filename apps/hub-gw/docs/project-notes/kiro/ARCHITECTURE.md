# Benefits & Provisionsplattform - Architecture

**Project:** Gründungswerft Benefits & Commission Platform
**Domain:** provision.gruendungswerft.com
**Status:** Planning Phase
**Updated:** December 2024

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER FLOW                                   │
└─────────────────────────────────────────────────────────────────────┘

1. Member visits provision.gruendungswerft.com
2. Clicks "Mit Gründungswerft anmelden"
3. Redirects to Gründungswerft OAuth (intranet.gruendungswerft.com)
4. Member logs in with existing credentials
5. Returns to provision.gruendungswerft.com (authenticated)
6. Can now create/view benefits and commission offers


┌─────────────────────────────────────────────────────────────────────┐
│                      TECHNICAL ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Member         │
│   (Browser)      │
└────────┬─────────┘
         │
         │ 1. Visit site
         ▼
┌────────────────────────────────────────────────────────────────────┐
│  Next.js 15 App (provision.gruendungswerft.com)                   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Frontend (React/Next.js)                                     │ │
│  │ - Benefits List                                              │ │
│  │ - Create Benefit Form                                        │ │
│  │ - Commission Offers List                                     │ │
│  │ - Member Profile                                             │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ API Routes (Backend-for-Frontend)                            │ │
│  │ - /api/auth/[...nextauth] (NextAuth.js)                     │ │
│  │ - /api/benefits                                              │ │
│  │ - /api/commissions                                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────┬───────────────────────────────────────────┬──────────────┘
         │                                           │
         │ 2. OAuth Login                            │ 4. API Calls
         │                                           │    (with API key)
         ▼                                           ▼
┌─────────────────────┐              ┌────────────────────────────────┐
│ Gründungswerft      │              │ L4YERCAK3 Backend (Convex)     │
│ OAuth Server (PHP)  │              │                                │
│                     │              │ ┌────────────────────────────┐ │
│ - /oauth/authorize  │              │ │ Database Tables:           │ │
│ - /oauth/token      │              │ │ - benefits                 │ │
│ - /oauth/userinfo   │              │ │ - commissions              │ │
│                     │              │ │ - members (from CRM)       │ │
│ 3. Returns token    │              │ │ - organizations            │ │
│    with member info │              │ └────────────────────────────┘ │
└─────────────────────┘              │                                │
                                     │ ┌────────────────────────────┐ │
                                     │ │ API Endpoints:             │ │
                                     │ │ - GET  /api/v1/benefits    │ │
                                     │ │ - POST /api/v1/benefits    │ │
                                     │ │ - GET  /api/v1/commissions │ │
                                     │ │ - POST /api/v1/commissions │ │
                                     │ └────────────────────────────┘ │
                                     └────────────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend (Next.js App)

**Technology Stack:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui components

**Pages:**

```
provision.gruendungswerft.com/
├── / (Homepage - Benefits Overview)
├── /benefits
│   ├── /benefits (List all benefits)
│   ├── /benefits/create (Create new benefit)
│   ├── /benefits/[id] (Benefit detail)
│   └── /benefits/[id]/edit (Edit benefit)
├── /commissions
│   ├── /commissions (List all commission offers)
│   ├── /commissions/create (Create commission offer)
│   ├── /commissions/[id] (Commission detail)
│   └── /commissions/[id]/edit (Edit commission)
├── /profile (Member profile)
└── /login (OAuth login page)
```

**Key Features:**
- Server-side rendering (SSR) for SEO
- Client-side navigation for speed
- Responsive design (mobile-first)
- Real-time updates (optional via Convex subscriptions)

### 2. Authentication (NextAuth.js)

**OAuth Flow:**

```typescript
// NextAuth.js configuration
{
  providers: [
    {
      id: "gruendungswerft",
      name: "Gründungswerft",
      type: "oauth",
      authorization: {
        url: "https://intranet.gruendungswerft.com/oauth/authorize",
        params: { scope: "profile email" }
      },
      token: "https://intranet.gruendungswerft.com/oauth/token",
      userinfo: "https://intranet.gruendungswerft.com/oauth/userinfo",
    }
  ]
}
```

**Session Management:**
- Server-side sessions (JWT)
- Session stored in HTTP-only cookie
- Auto-refresh on expiration

### 3. API Routes (Backend-for-Frontend)

**Purpose:** Proxy requests to L4YERCAK3 backend with authentication

**Example:**

```typescript
// app/api/benefits/route.ts
export async function GET(request: Request) {
  // 1. Validate Gründungswerft session
  const session = await getServerSession();
  if (!session) return unauthorized();

  // 2. Call L4YERCAK3 with API key (server-to-server)
  const benefits = await l4yercak3.getBenefits({
    organizationId: 'gruendungswerft',
    memberId: session.user.id,
  });

  return Response.json(benefits);
}
```

**Benefits of this architecture:**
- ✅ Frontend never sees L4YERCAK3 API key (secure)
- ✅ Can add caching/rate limiting in Next.js
- ✅ Can transform data before sending to frontend
- ✅ Single authentication point (Gründungswerft OAuth)

### 4. L4YERCAK3 Backend (Convex)

**Role:** Data persistence and business logic

**New Database Tables:**

```typescript
// Schema definition
defineSchema({
  // Existing tables
  organizations: {...},
  users: {...},

  // NEW: Benefits table
  benefits: defineTable({
    organizationId: v.id("organizations"), // gruendungswerft
    createdBy: v.string(), // member_id from OAuth
    title: v.string(),
    description: v.string(),
    category: v.string(), // "discount", "service", "product", "event"
    contactInfo: v.string(),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_creator", ["createdBy"]),

  // NEW: Commissions table
  commissions: defineTable({
    organizationId: v.id("organizations"),
    createdBy: v.string(), // member_id
    title: v.string(),
    description: v.string(),
    commissionRate: v.string(), // "10%", "€500", etc.
    category: v.string(), // "sales", "consulting", "referral"
    contactInfo: v.string(),
    requirements: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_creator", ["createdBy"]),
});
```

**API Endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/v1/benefits | List all benefits | API Key |
| POST | /api/v1/benefits | Create benefit | API Key |
| GET | /api/v1/benefits/:id | Get benefit detail | API Key |
| PATCH | /api/v1/benefits/:id | Update benefit | API Key |
| DELETE | /api/v1/benefits/:id | Delete benefit | API Key |
| GET | /api/v1/commissions | List all commissions | API Key |
| POST | /api/v1/commissions | Create commission | API Key |
| GET | /api/v1/commissions/:id | Get commission detail | API Key |
| PATCH | /api/v1/commissions/:id | Update commission | API Key |
| DELETE | /api/v1/commissions/:id | Delete commission | API Key |

---

## Authentication Flow (Detailed)

### Initial Login

```
┌──────────┐                 ┌──────────────┐                 ┌─────────────────┐
│ Member   │                 │  Next.js App │                 │ Gründungswerft  │
│          │                 │              │                 │ OAuth Server    │
└────┬─────┘                 └──────┬───────┘                 └────────┬────────┘
     │                              │                                   │
     │  1. Visit /benefits          │                                   │
     ├─────────────────────────────>│                                   │
     │                              │                                   │
     │  2. Redirect to /login       │                                   │
     │<─────────────────────────────┤                                   │
     │                              │                                   │
     │  3. Click "Login"            │                                   │
     ├─────────────────────────────>│                                   │
     │                              │                                   │
     │  4. Redirect to OAuth        │  5. GET /oauth/authorize          │
     │                              ├──────────────────────────────────>│
     │                              │     ?client_id=...                 │
     │                              │     &redirect_uri=...              │
     │                              │     &scope=profile email           │
     │                              │                                   │
     │  6. Show login page          │                                   │
     │<─────────────────────────────┼───────────────────────────────────┤
     │                              │                                   │
     │  7. Enter credentials        │                                   │
     ├──────────────────────────────┼──────────────────────────────────>│
     │                              │                                   │
     │  8. Redirect with code       │  9. Callback with code            │
     │<─────────────────────────────┼───────────────────────────────────┤
     │                              │<──────────────────────────────────┤
     │                              │                                   │
     │                              │ 10. POST /oauth/token             │
     │                              │     (exchange code for token)     │
     │                              ├──────────────────────────────────>│
     │                              │                                   │
     │                              │ 11. Return access_token           │
     │                              │<──────────────────────────────────┤
     │                              │                                   │
     │                              │ 12. GET /oauth/userinfo           │
     │                              │     Authorization: Bearer token   │
     │                              ├──────────────────────────────────>│
     │                              │                                   │
     │                              │ 13. Return user profile           │
     │                              │<──────────────────────────────────┤
     │                              │                                   │
     │  14. Set session cookie      │                                   │
     │      Redirect to /benefits   │                                   │
     │<─────────────────────────────┤                                   │
     │                              │                                   │
```

### Authenticated API Call

```
┌──────────┐         ┌──────────────┐         ┌─────────────────┐
│ Member   │         │  Next.js App │         │ L4YERCAK3 API   │
│          │         │              │         │                 │
└────┬─────┘         └──────┬───────┘         └────────┬────────┘
     │                      │                           │
     │  1. GET /benefits    │                           │
     ├─────────────────────>│                           │
     │                      │                           │
     │                      │  2. Verify session cookie │
     │                      ├─┐                         │
     │                      │ │                         │
     │                      │<┘                         │
     │                      │                           │
     │                      │  3. GET /api/v1/benefits  │
     │                      │     Authorization: Bearer │
     │                      │     <L4YERCAK3_API_KEY>   │
     │                      ├──────────────────────────>│
     │                      │                           │
     │                      │  4. Return benefits       │
     │                      │<──────────────────────────┤
     │                      │                           │
     │  5. Render page      │                           │
     │<─────────────────────┤                           │
     │                      │                           │
```

---

## Security Considerations

### 1. API Key Protection

**❌ BAD:** Frontend directly calls L4YERCAK3
```typescript
// DON'T DO THIS - exposes API key in browser
const benefits = await fetch('https://app.l4yercak3.com/api/v1/benefits', {
  headers: { 'Authorization': `Bearer ${API_KEY}` } // EXPOSED!
});
```

**✅ GOOD:** Frontend calls Next.js API route (server-side)
```typescript
// Frontend (client-side)
const benefits = await fetch('/api/benefits'); // No API key needed

// Backend (server-side)
export async function GET() {
  const benefits = await fetch('https://app.l4yercak3.com/api/v1/benefits', {
    headers: { 'Authorization': `Bearer ${process.env.L4YERCAK3_API_KEY}` }
  });
  return Response.json(benefits);
}
```

### 2. OAuth Security

- ✅ State parameter for CSRF protection (NextAuth.js handles this)
- ✅ HTTP-only cookies for session (not accessible via JavaScript)
- ✅ HTTPS only in production
- ✅ Short-lived access tokens
- ✅ No client secret in frontend code

### 3. Data Access Control

**Organization-level isolation:**
```typescript
// Every API call is scoped to Gründungswerft organization
const benefits = await ctx.db
  .query("benefits")
  .filter(q => q.eq(q.field("organizationId"), "gruendungswerft"))
  .collect();
```

**Member-level permissions:**
- Members can only edit/delete their own benefits
- Members can view all benefits in the organization
- No cross-organization data access

---

## Data Flow Examples

### Example 1: Create Benefit

```typescript
// 1. Frontend form submission
const formData = {
  title: "20% Rabatt auf Web-Entwicklung",
  description: "Ich biete allen Mitgliedern 20% Rabatt...",
  category: "service",
  contactInfo: "max@example.com"
};

// 2. Frontend calls Next.js API
const response = await fetch('/api/benefits', {
  method: 'POST',
  body: JSON.stringify(formData)
});

// 3. Next.js validates session and calls L4YERCAK3
export async function POST(request: Request) {
  const session = await getServerSession();
  const body = await request.json();

  const result = await fetch('https://app.l4yercak3.com/api/v1/benefits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.L4YERCAK3_API_KEY}`,
      'X-Organization-Id': 'gruendungswerft',
      'X-Member-Id': session.user.id,
    },
    body: JSON.stringify(body)
  });

  return result;
}

// 4. L4YERCAK3 creates benefit in database
export const createBenefit = mutation({
  handler: async (ctx, args) => {
    return await ctx.db.insert("benefits", {
      organizationId: args.organizationId,
      createdBy: args.memberId,
      title: args.title,
      description: args.description,
      category: args.category,
      contactInfo: args.contactInfo,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
});
```

### Example 2: List Benefits

```typescript
// 1. Frontend loads benefits page
useEffect(() => {
  fetch('/api/benefits')
    .then(res => res.json())
    .then(data => setBenefits(data.benefits));
}, []);

// 2. Next.js API route proxies to L4YERCAK3
export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();

  const response = await fetch(
    'https://app.l4yercak3.com/api/v1/benefits' +
    '?organizationId=gruendungswerft',
    {
      headers: {
        'Authorization': `Bearer ${process.env.L4YERCAK3_API_KEY}`
      }
    }
  );

  return response;
}

// 3. L4YERCAK3 queries database
export const listBenefits = query({
  handler: async (ctx, args) => {
    return await ctx.db
      .query("benefits")
      .filter(q => q.eq(q.field("organizationId"), args.organizationId))
      .filter(q => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();
  }
});
```

---

## Deployment Architecture

### Development

```
Local Machine:
├── Next.js App (localhost:3000)
├── Convex Dev Server (npx convex dev)
└── Test OAuth (intranet.gruendungswerft.com)
```

### Production

```
Domain: provision.gruendungswerft.com

Hosting:
├── Next.js → Vercel (recommended)
│   ├── Automatic deployments from git
│   ├── Edge functions for API routes
│   └── CDN for static assets
│
└── L4YERCAK3 Backend → Convex (existing)
    ├── Database
    ├── API endpoints
    └── Real-time subscriptions
```

---

## Performance Considerations

### Caching Strategy

```typescript
// Cache benefits list for 5 minutes
export async function GET() {
  return fetch('https://app.l4yercak3.com/api/v1/benefits', {
    headers: { ... },
    next: { revalidate: 300 } // 5 minutes
  });
}
```

### Database Indexes

```typescript
// Convex schema
benefits: defineTable({...})
  .index("by_organization", ["organizationId"]) // Fast org lookup
  .index("by_creator", ["createdBy"])          // Fast member lookup
  .index("by_category", ["category"])          // Filter by category
```

### Real-time Updates (Optional)

```typescript
// Frontend subscribes to benefits updates
const benefits = useQuery(api.benefits.list, {
  organizationId: "gruendungswerft"
});
// Automatically updates when new benefit is created
```

---

## Scalability

### Current Setup (MVP)

- **Users:** 50-200 Gründungswerft members
- **Load:** Low to medium
- **Architecture:** Monolithic Next.js app + Convex backend

### Future Growth

If the platform scales to multiple organizations:

```
Benefits Platform (Multi-Tenant)
├── Organization 1: Gründungswerft
│   ├── Custom OAuth
│   └── Subdomain: gw.benefits-hub.com
│
├── Organization 2: Another Association
│   ├── Custom OAuth
│   └── Subdomain: org2.benefits-hub.com
│
└── Shared L4YERCAK3 Backend
    └── Organization-level data isolation
```

---

## Technology Rationale

### Why Next.js?

- ✅ Server-side rendering (SEO, performance)
- ✅ API routes (no separate backend needed)
- ✅ TypeScript support
- ✅ Easy Vercel deployment
- ✅ Great DX for rapid development

### Why NextAuth.js?

- ✅ Built for Next.js
- ✅ OAuth 2.0 support out of the box
- ✅ Secure session management
- ✅ Custom provider support

### Why Keep L4YERCAK3 Backend?

- ✅ Already built and tested
- ✅ Real-time capabilities (Convex)
- ✅ No database management needed
- ✅ Can reuse for other projects
- ✅ Easy to add features (CRM, invoicing, etc.)

---

## Next Steps

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed implementation phases.
