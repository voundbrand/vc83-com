# Implementation Plan - Gründungswerft Benefits Platform

**Project:** Benefits & Provisionsplattform
**Timeline:** 3-4 weeks (18 working days)
**Status:** Planning Phase
**Updated:** December 2024

---

## Executive Summary

Build a custom Next.js application for Gründungswerft members to share benefits and commission opportunities. The app authenticates via Gründungswerft's existing PHP OAuth server and stores data in L4YERCAK3's Convex backend.

### Key Deliverables

1. ✅ Custom Next.js app at provision.gruendungswerft.com
2. ✅ OAuth integration with Gründungswerft (no separate registration)
3. ✅ Benefits platform (Benefitplattform)
4. ✅ Commission platform (Provisionsplattform)
5. ✅ Member-only access
6. ✅ Mobile-responsive design
7. ✅ Production deployment

---

## Project Phases Overview

| Phase | Duration | Status | Dependencies |
|-------|----------|--------|--------------|
| Phase 1: Project Setup | 2 days | Not Started | None |
| Phase 2: OAuth Integration | 2-3 days | Not Started | Chuck's OAuth info |
| Phase 3: Backend API | 2-3 days | Not Started | Phase 1 complete |
| Phase 4: Frontend UI | 4-5 days | Not Started | Phases 2-3 complete |
| Phase 5: Testing & Deployment | 3-4 days | Not Started | Phase 4 complete |

**Total:** 13-17 days (buffer: +3-4 days for issues)

---

## Phase 1: Project Setup (Days 1-2)

### Objectives

- ✅ Create new Next.js 15 project
- ✅ Install and configure all dependencies
- ✅ Set up development environment
- ✅ Configure TypeScript, ESLint, Tailwind
- ✅ Initialize git repository

### Deliverables

- [ ] Next.js app running on localhost:3000
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Git repository with initial commit
- [ ] README with setup instructions

### Technical Tasks

**Day 1: Next.js Setup**
```bash
# Create project
npx create-next-app@latest provision-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

# Install dependencies
npm install next-auth @auth/core
npm install @radix-ui/react-* # shadcn/ui dependencies
npm install lucide-react # Icons
npm install convex # Backend client

# Dev dependencies
npm install -D @types/node
```

**Day 2: Configuration**
- Configure `next.config.js`
- Set up `tailwind.config.js`
- Create `.env.local` template
- Initialize shadcn/ui components
- Create folder structure

### Folder Structure

```
provision-app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── api/auth/[...nextauth]/
│   │   ├── (dashboard)/
│   │   │   ├── benefits/
│   │   │   ├── commissions/
│   │   │   └── profile/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/ (shadcn)
│   │   ├── benefits/
│   │   ├── commissions/
│   │   └── layout/
│   ├── lib/
│   │   ├── auth.ts (NextAuth config)
│   │   ├── l4yercak3.ts (API client)
│   │   └── utils.ts
│   └── types/
├── public/
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

**Checklist:** [PHASE_1_CHECKLIST.md](./PHASE_1_CHECKLIST.md)

---

## Phase 2: OAuth Integration (Days 3-5)

### Objectives

- ✅ Integrate NextAuth.js with Gründungswerft OAuth
- ✅ Implement login/logout flow
- ✅ Create protected routes
- ✅ Test authentication end-to-end

### Dependencies

**Required from Chuck:**
- Client ID and Client Secret
- OAuth endpoints (authorize, token, userinfo)
- Test account credentials

**Document:** [CHUCK_REQUIREMENTS_DE.md](./CHUCK_REQUIREMENTS_DE.md)

### Deliverables

- [ ] NextAuth.js configured with Gründungswerft OAuth
- [ ] Login page with "Mit Gründungswerft anmelden" button
- [ ] Session management working
- [ ] Protected routes middleware
- [ ] Test user can log in successfully

### Technical Implementation

**File:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";

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
          scope: "profile email",
          response_type: "code",
        },
      },
      token: process.env.GRUENDUNGSWERFT_TOKEN_URL!,
      userinfo: process.env.GRUENDUNGSWERFT_USERINFO_URL!,
      profile(profile) {
        return {
          id: profile.sub || profile.id,
          name: profile.name,
          email: profile.email,
          memberNumber: profile.member_number,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.memberNumber = user.memberNumber;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.memberNumber = token.memberNumber;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

**File:** `src/middleware.ts` (Protected Routes)

```typescript
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/benefits/:path*",
    "/commissions/:path*",
    "/profile/:path*",
  ],
};
```

**Checklist:** [PHASE_2_CHECKLIST.md](./PHASE_2_CHECKLIST.md)

---

## Phase 3: Backend API (Days 6-8)

### Objectives

- ✅ Create database schema in Convex
- ✅ Build L4YERCAK3 API endpoints
- ✅ Create Next.js API routes (BFF pattern)
- ✅ Implement CRUD operations
- ✅ Add data validation

### Database Schema (Convex)

**File:** `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Existing tables...

  // NEW: Benefits
  benefits: defineTable({
    organizationId: v.id("organizations"),
    createdBy: v.string(), // member_id from OAuth
    createdByName: v.string(),
    createdByEmail: v.string(),
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
    .index("by_creator", ["createdBy"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  // NEW: Commissions
  commissions: defineTable({
    organizationId: v.id("organizations"),
    createdBy: v.string(),
    createdByName: v.string(),
    createdByEmail: v.string(),
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
    .index("by_creator", ["createdBy"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),
});
```

### L4YERCAK3 API Endpoints

**Benefits Endpoints:**
- `GET /api/v1/benefits` - List all benefits
- `POST /api/v1/benefits` - Create benefit
- `GET /api/v1/benefits/:id` - Get benefit detail
- `PATCH /api/v1/benefits/:id` - Update benefit
- `DELETE /api/v1/benefits/:id` - Delete benefit

**Commissions Endpoints:**
- `GET /api/v1/commissions` - List all commissions
- `POST /api/v1/commissions` - Create commission
- `GET /api/v1/commissions/:id` - Get commission detail
- `PATCH /api/v1/commissions/:id` - Update commission
- `DELETE /api/v1/commissions/:id` - Delete commission

### Next.js API Routes (BFF)

**File:** `src/app/api/benefits/route.ts`

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const L4YERCAK3_API_KEY = process.env.L4YERCAK3_API_KEY!;
const L4YERCAK3_BASE_URL = process.env.L4YERCAK3_BASE_URL!;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const response = await fetch(`${L4YERCAK3_BASE_URL}/api/v1/benefits`, {
    headers: {
      "Authorization": `Bearer ${L4YERCAK3_API_KEY}`,
      "X-Organization-Id": "gruendungswerft",
    },
  });

  return response;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();

  const response = await fetch(`${L4YERCAK3_BASE_URL}/api/v1/benefits`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${L4YERCAK3_API_KEY}`,
      "X-Organization-Id": "gruendungswerft",
      "X-Member-Id": session.user.id,
      "X-Member-Name": session.user.name,
      "X-Member-Email": session.user.email,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response;
}
```

**Checklist:** [PHASE_3_CHECKLIST.md](./PHASE_3_CHECKLIST.md)

---

## Phase 4: Frontend UI (Days 9-14)

### Objectives

- ✅ Build benefits platform UI
- ✅ Build commissions platform UI
- ✅ Create forms and validation
- ✅ Implement search and filtering
- ✅ Add responsive design

### Pages to Build

**Benefits Platform:**
1. `/benefits` - List all benefits
2. `/benefits/create` - Create new benefit
3. `/benefits/[id]` - Benefit detail view
4. `/benefits/[id]/edit` - Edit benefit

**Commissions Platform:**
1. `/commissions` - List all commission offers
2. `/commissions/create` - Create commission offer
3. `/commissions/[id]` - Commission detail
4. `/commissions/[id]/edit` - Edit commission

**Other Pages:**
1. `/` - Homepage (dashboard)
2. `/login` - Login page
3. `/profile` - Member profile

### UI Components

**Benefits Card:**
```tsx
<Card>
  <CardHeader>
    <Badge>{category}</Badge>
    <CardTitle>{title}</CardTitle>
    <CardDescription>
      Angeboten von {createdByName}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p>{description}</p>
    <div className="flex gap-2 mt-4">
      <Mail className="w-4 h-4" />
      <span>{contactInfo}</span>
    </div>
  </CardContent>
  <CardFooter>
    <Button>Details anzeigen</Button>
  </CardFooter>
</Card>
```

**Create Benefit Form:**
```tsx
<form onSubmit={handleSubmit}>
  <FormField>
    <Label>Titel</Label>
    <Input name="title" required />
  </FormField>

  <FormField>
    <Label>Beschreibung</Label>
    <Textarea name="description" required />
  </FormField>

  <FormField>
    <Label>Kategorie</Label>
    <Select name="category">
      <option value="discount">Rabatt</option>
      <option value="service">Dienstleistung</option>
      <option value="product">Produkt</option>
      <option value="event">Veranstaltung</option>
    </Select>
  </FormField>

  <FormField>
    <Label>Kontaktinfo</Label>
    <Input name="contactInfo" type="email" required />
  </FormField>

  <Button type="submit">Benefit erstellen</Button>
</form>
```

### Design Guidelines

**Colors:**
- Primary: Gründungswerft blue (#0066CC or similar)
- Secondary: Light gray for cards
- Accent: Green for CTAs

**Typography:**
- Headings: Bold, large
- Body: Readable sans-serif
- Labels: Small, uppercase

**Layout:**
- Grid layout for cards (1 col mobile, 2-3 cols desktop)
- Max width container (1200px)
- Generous padding and spacing

**Checklist:** [PHASE_4_CHECKLIST.md](./PHASE_4_CHECKLIST.md)

---

## Phase 5: Testing & Deployment (Days 15-18)

### Objectives

- ✅ Write unit and integration tests
- ✅ Test OAuth flow thoroughly
- ✅ User acceptance testing with real members
- ✅ Deploy to production
- ✅ Configure custom domain

### Testing Strategy

**Unit Tests:**
- API route handlers
- Form validation
- Utility functions

**Integration Tests:**
- OAuth login flow
- Create/edit/delete benefits
- Create/edit/delete commissions
- Protected routes

**E2E Tests (Playwright):**
```typescript
test('member can create benefit', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.click('button:has-text("Mit Gründungswerft anmelden")');
  // ... OAuth flow

  // Create benefit
  await page.goto('/benefits/create');
  await page.fill('input[name="title"]', 'Test Benefit');
  await page.fill('textarea[name="description"]', 'Test description');
  await page.selectOption('select[name="category"]', 'service');
  await page.fill('input[name="contactInfo"]', 'test@example.com');
  await page.click('button[type="submit"]');

  // Verify created
  await expect(page).toHaveURL(/\/benefits\/[\w-]+/);
  await expect(page.locator('h1')).toContainText('Test Benefit');
});
```

### Deployment

**Vercel Deployment:**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy to production
vercel --prod

# 4. Set environment variables in Vercel dashboard
# - GRUENDUNGSWERFT_CLIENT_ID
# - GRUENDUNGSWERFT_CLIENT_SECRET
# - GRUENDUNGSWERFT_AUTHORIZATION_URL
# - GRUENDUNGSWERFT_TOKEN_URL
# - GRUENDUNGSWERFT_USERINFO_URL
# - L4YERCAK3_API_KEY
# - L4YERCAK3_BASE_URL
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL
```

**Custom Domain:**

1. Add domain in Vercel: provision.gruendungswerft.com
2. Add DNS records (provided by Vercel)
3. Wait for SSL certificate
4. Test HTTPS access

**Checklist:** [PHASE_5_CHECKLIST.md](./PHASE_5_CHECKLIST.md)

---

## Risk Mitigation

### Risk 1: OAuth Integration Issues

**Risk:** Gründungswerft OAuth server may have quirks or non-standard behavior

**Mitigation:**
- Get OAuth info early (Day 1)
- Test with Chuck's test account ASAP
- Have backup plan (email-based login if OAuth fails)

### Risk 2: Scope Creep

**Risk:** Chuck may request additional features mid-development

**Mitigation:**
- Define MVP clearly upfront
- Document "Phase 2 features" for future
- Communicate timeline impact of new features

### Risk 3: Performance Issues

**Risk:** Slow loading times with many benefits

**Mitigation:**
- Implement pagination (10-20 items per page)
- Add caching in Next.js API routes
- Use Convex indexes for fast queries
- Lazy load images

### Risk 4: Mobile Experience

**Risk:** Complex UI may not work well on mobile

**Mitigation:**
- Mobile-first design approach
- Test on real devices early
- Simplify UI for small screens
- Progressive disclosure (show less info on mobile)

---

## Success Metrics

### Technical Metrics

- [ ] Page load time <2 seconds
- [ ] OAuth login success rate >95%
- [ ] Zero critical bugs in production
- [ ] Mobile Lighthouse score >90

### Business Metrics

- [ ] 10+ benefits posted in first week
- [ ] 5+ commission offers posted
- [ ] 50+ member logins
- [ ] Positive feedback from Chuck

---

## Timeline with Buffer

```
Week 1: Foundation
├── Mon-Tue:    Phase 1 (Project Setup)
├── Wed-Fri:    Phase 2 (OAuth Integration)
└── Weekend:    Buffer / OAuth troubleshooting

Week 2: Development
├── Mon-Wed:    Phase 3 (Backend API)
├── Thu-Fri:    Phase 4 Start (Benefits UI)
└── Weekend:    Buffer

Week 3: Completion
├── Mon-Tue:    Phase 4 Complete (Commissions UI)
├── Wed-Thu:    Phase 5 (Testing)
├── Fri:        Deployment
└── Weekend:    Monitoring

Week 4: Buffer
├── Mon-Tue:    Bug fixes
├── Wed:        User testing with real members
├── Thu:        Final adjustments
└── Fri:        Official launch announcement
```

**Total:** 3-4 weeks with buffer

---

## Post-Launch Plan

### Week 1 After Launch

- [ ] Daily monitoring of errors and performance
- [ ] Gather user feedback
- [ ] Fix critical bugs immediately
- [ ] Document common issues

### Month 1 Goals

- [ ] 100+ benefits posted
- [ ] 50+ members active
- [ ] <1% error rate
- [ ] Positive NPS score

### Future Enhancements (Phase 2)

1. Email notifications (new benefits posted)
2. Search and advanced filtering
3. Member ratings/reviews
4. Admin dashboard
5. Analytics (most viewed benefits, etc.)
6. Mobile app (React Native)
7. Integration with existing Gründungswerft systems
8. Export features (PDF, CSV)

---

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Convex Docs](https://docs.convex.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

### Support
- Remington (Project Lead)
- Chuck (OAuth, requirements)
- Gründungswerft Team (User testing)

---

## Next Steps

1. ✅ Send [CHUCK_REQUIREMENTS_DE.md](./CHUCK_REQUIREMENTS_DE.md) to Chuck
2. ⏳ Wait for OAuth credentials
3. 🚀 Start [Phase 1](./PHASE_1_CHECKLIST.md) (can start without OAuth info)
4. 🔐 Complete [Phase 2](./PHASE_2_CHECKLIST.md) once OAuth info received
5. 🔧 Continue with remaining phases

---

Ready to build! 🚀
