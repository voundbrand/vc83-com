# Phase 1: Foundation

**Phase:** 1 of 5
**Duration:** 2 weeks
**Status:** Not Started
**Dependencies:** None

---

## Objectives

1. Set up Next.js frontend with GW OAuth integration
2. Create L4YERCAK3 schema extensions for GW objects
3. Build member sync from OAuth to L4YERCAK3
4. Implement basic benefits and commissions CRUD
5. Create simple listing UI

---

## Deliverables

- [ ] Next.js app deployed to Vercel
- [ ] OAuth login working with GW credentials
- [ ] Member profiles synced to L4YERCAK3
- [ ] Benefits list and create pages
- [ ] Commissions list and create pages
- [ ] Basic claim workflow (no payments yet)

---

## Week 1: Setup & OAuth

### Day 1-2: Project Setup

**Task 1.1: Create Next.js Project**
```bash
npx create-next-app@latest provision-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd provision-app
npm install next-auth @auth/core
npm install convex
npm install @radix-ui/react-* lucide-react
npx shadcn@latest init
```

**Task 1.2: Configure Environment**
```env
# .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

GRUENDUNGSWERFT_CLIENT_ID=hub
GRUENDUNGSWERFT_CLIENT_SECRET=asldkj2384790saljkd8903lkjsad
GRUENDUNGSWERFT_AUTHORIZATION_URL=https://auth.gruendungswerft.com/authorize/
GRUENDUNGSWERFT_TOKEN_URL=https://auth.gruendungswerft.com/token/
GRUENDUNGSWERFT_USERINFO_URL=https://auth.gruendungswerft.com/userinfo/

NEXTAUTH_SECRET=generate-secure-secret
NEXTAUTH_URL=http://localhost:3000
```

**Task 1.3: Create Folder Structure**
```
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── benefits/
│   │   └── commissions/
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── lib/
└── hooks/
```

### Day 3-4: OAuth Integration

**Task 1.4: Configure NextAuth.js**
```typescript
// src/app/api/auth/[...nextauth]/route.ts
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
          scope: "basic",
          response_type: "code",
        },
      },
      token: process.env.GRUENDUNGSWERFT_TOKEN_URL!,
      userinfo: process.env.GRUENDUNGSWERFT_USERINFO_URL!,
      profile(profile) {
        return {
          id: profile.id,
          name: `${profile.firstname} ${profile.lastname}`,
          email: profile.email,
          membershipId: profile.membership_id,
          firstName: profile.firstname,
          lastName: profile.lastname,
          avatar: profile.avatar,
          bio: profile.portrait,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.membershipId = user.membershipId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.membershipId = token.membershipId as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
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

**Task 1.5: Create Login Page**
```typescript
// src/app/(auth)/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Benefits Platform</h1>
          <p className="mt-2 text-gray-600">
            Exklusiv für Gründungswerft Mitglieder
          </p>
        </div>

        <Button
          onClick={() => signIn("gruendungswerft", { callbackUrl: "/" })}
          className="w-full"
        >
          Mit Gründungswerft anmelden
        </Button>
      </div>
    </div>
  );
}
```

**Task 1.6: Create Protected Layout**
```typescript
// src/app/(dashboard)/layout.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        {/* Navigation header */}
      </nav>
      <main className="container mx-auto py-8">
        {children}
      </main>
    </div>
  );
}
```

### Day 5: Test OAuth Flow

**Task 1.7: Test with Chuck's Test Account**
- Login with: henjeson@gmail.com / Testzugang!
- Verify token exchange works
- Verify userinfo returns expected fields
- Debug any OAuth issues

---

## Week 2: L4YERCAK3 Integration

### Day 6-7: Schema Extensions

**Task 2.1: Add GW Schemas to L4YERCAK3**
```typescript
// convex/schemas/gwBenefitsSchemas.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const gwBenefitsSchemas = {
  // Benefit claims tracking
  gwBenefitClaims: defineTable({
    organizationId: v.id("organizations"),
    benefitId: v.id("objects"),
    claimedById: v.id("objects"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("redeemed"),
      v.literal("expired"),
      v.literal("rejected")
    ),
    claimedAt: v.number(),
    approvedAt: v.optional(v.number()),
    redeemedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_benefit", ["benefitId"])
    .index("by_claimer", ["claimedById"])
    .index("by_status", ["organizationId", "status"]),

  // Commission payouts tracking
  gwCommissionPayouts: defineTable({
    organizationId: v.id("organizations"),
    commissionId: v.id("objects"),
    affiliateId: v.id("objects"),
    merchantId: v.id("objects"),
    referralDetails: v.string(),
    amountInCents: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending_verification"),
      v.literal("verified"),
      v.literal("processing"),
      v.literal("paid"),
      v.literal("disputed"),
      v.literal("cancelled")
    ),
    paymentMethod: v.optional(v.string()),
    paymentReference: v.optional(v.string()),
    invoiceId: v.optional(v.id("objects")),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_commission", ["commissionId"])
    .index("by_affiliate", ["affiliateId"])
    .index("by_merchant", ["merchantId"])
    .index("by_status", ["organizationId", "status"]),

  // Member wallet links
  gwMemberWallets: defineTable({
    organizationId: v.id("organizations"),
    memberId: v.string(),
    walletAddress: v.string(),
    signature: v.string(),
    linkedAt: v.number(),
  })
    .index("by_member", ["organizationId", "memberId"])
    .index("by_wallet", ["walletAddress"]),
};
```

**Task 2.2: Update Schema Index**
```typescript
// convex/schema.ts
import { gwBenefitsSchemas } from "./schemas/gwBenefitsSchemas";

export default defineSchema({
  // Existing schemas...
  ...gwBenefitsSchemas,
});
```

### Day 8-9: Member Sync

**Task 2.3: Create Member Sync Mutation**
```typescript
// convex/gw/members.ts
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Organization ID for Gründungswerft (set in env)
const GW_ORG_ID = process.env.L4YERCAK3_GW_ORG_ID;

export const syncMemberFromOAuth = mutation({
  args: {
    gwUserId: v.string(),
    gwMembershipId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    street: v.optional(v.string()),
    houseNumber: v.optional(v.string()),
    zip: v.optional(v.string()),
    city: v.optional(v.string()),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    languages: v.optional(v.array(v.string())),
    socialMedia: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const gwOrgId = GW_ORG_ID as Id<"organizations">;

    // Check if member already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", gwOrgId).eq("type", "crm_contact")
      )
      .filter(q =>
        q.eq(q.field("customProperties.gwUserId"), args.gwUserId)
      )
      .first();

    const memberData = {
      organizationId: gwOrgId,
      type: "crm_contact" as const,
      subtype: "gw_member",
      name: `${args.firstName} ${args.lastName}`,
      status: "active" as const,
      customProperties: {
        gwUserId: args.gwUserId,
        gwMembershipId: args.gwMembershipId,
        firstName: args.firstName,
        lastName: args.lastName,
        email: args.email,
        phone: args.phone,
        address: args.street ? {
          street: `${args.street} ${args.houseNumber || ""}`.trim(),
          city: args.city,
          postalCode: args.zip,
          country: "DE",
        } : undefined,
        avatar: args.avatar,
        bio: args.bio,
        languages: args.languages,
        socialMedia: args.socialMedia,
      },
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, memberData);
      return { memberId: existing._id, isNew: false };
    } else {
      const memberId = await ctx.db.insert("objects", {
        ...memberData,
        createdAt: Date.now(),
      });
      return { memberId, isNew: true };
    }
  },
});

export const getMemberByGWUserId = query({
  args: { gwUserId: v.string() },
  handler: async (ctx, { gwUserId }) => {
    const gwOrgId = GW_ORG_ID as Id<"organizations">;

    return await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", gwOrgId).eq("type", "crm_contact")
      )
      .filter(q =>
        q.eq(q.field("customProperties.gwUserId"), gwUserId)
      )
      .first();
  },
});
```

**Task 2.4: Sync on Login**
```typescript
// src/app/api/auth/[...nextauth]/route.ts
// Add to callbacks:

callbacks: {
  async signIn({ user, account, profile }) {
    // Sync member to L4YERCAK3 on every login
    try {
      await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/mutation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.L4YERCAK3_API_KEY}`,
        },
        body: JSON.stringify({
          path: "gw/members:syncMemberFromOAuth",
          args: {
            gwUserId: profile.id,
            gwMembershipId: profile.membership_id,
            firstName: profile.firstname,
            lastName: profile.lastname,
            email: profile.email,
            phone: profile.telephone,
            street: profile.street,
            houseNumber: profile.housenumber,
            zip: profile.zip,
            city: profile.city,
            avatar: profile.avatar,
            bio: profile.portrait,
            languages: profile.languages,
            socialMedia: profile.socialmedia,
          },
        }),
      });
    } catch (error) {
      console.error("Failed to sync member:", error);
      // Don't block login on sync failure
    }
    return true;
  },
  // ... other callbacks
}
```

### Day 10-12: Benefits CRUD

**Task 2.5: Benefits Mutations**
```typescript
// convex/gw/benefits.ts
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const createBenefit = mutation({
  args: {
    memberId: v.id("objects"),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    subtype: v.union(
      v.literal("discount"),
      v.literal("service"),
      v.literal("product"),
      v.literal("event")
    ),
    discountType: v.optional(v.string()),
    discountValue: v.optional(v.number()),
    validUntil: v.optional(v.number()),
    maxClaims: v.optional(v.number()),
    requirements: v.optional(v.string()),
    contactEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    const benefitId = await ctx.db.insert("objects", {
      organizationId: member.organizationId,
      type: "gw_benefit",
      subtype: args.subtype,
      name: args.title,
      description: args.description,
      status: "active",
      customProperties: {
        category: args.category,
        discountType: args.discountType,
        discountValue: args.discountValue,
        validUntil: args.validUntil,
        maxTotalClaims: args.maxClaims,
        currentClaimCount: 0,
        requirements: args.requirements,
        contactEmail: args.contactEmail,
        offeredByType: "member",
        offeredById: args.memberId,
      },
      createdBy: args.memberId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create link
    await ctx.db.insert("objectLinks", {
      organizationId: member.organizationId,
      fromObjectId: args.memberId,
      toObjectId: benefitId,
      linkType: "offers_benefit",
      createdAt: Date.now(),
    });

    return benefitId;
  },
});

export const listBenefits = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { category, limit = 20 }) => {
    const gwOrgId = process.env.L4YERCAK3_GW_ORG_ID as Id<"organizations">;

    let benefits = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", gwOrgId).eq("type", "gw_benefit")
      )
      .filter(q => q.eq(q.field("status"), "active"))
      .take(limit);

    if (category) {
      benefits = benefits.filter(
        b => b.customProperties?.category === category
      );
    }

    // Enrich with offerer info
    return Promise.all(
      benefits.map(async (benefit) => {
        const offerer = await ctx.db.get(
          benefit.customProperties?.offeredById as Id<"objects">
        );
        return {
          ...benefit,
          offerer: offerer ? {
            id: offerer._id,
            name: offerer.name,
          } : null,
        };
      })
    );
  },
});

export const claimBenefit = mutation({
  args: {
    benefitId: v.id("objects"),
    memberId: v.id("objects"),
  },
  handler: async (ctx, { benefitId, memberId }) => {
    const benefit = await ctx.db.get(benefitId);
    if (!benefit) throw new Error("Benefit not found");
    if (benefit.status !== "active") throw new Error("Benefit not active");

    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Member not found");

    // Check if already claimed
    const existingClaim = await ctx.db
      .query("gwBenefitClaims")
      .withIndex("by_claimer", q => q.eq("claimedById", memberId))
      .filter(q => q.eq(q.field("benefitId"), benefitId))
      .first();

    if (existingClaim) {
      throw new Error("You have already claimed this benefit");
    }

    // Check max claims
    const currentClaims = benefit.customProperties?.currentClaimCount || 0;
    const maxClaims = benefit.customProperties?.maxTotalClaims;
    if (maxClaims && currentClaims >= maxClaims) {
      throw new Error("This benefit has reached its maximum claims");
    }

    // Create claim
    const claimId = await ctx.db.insert("gwBenefitClaims", {
      organizationId: benefit.organizationId,
      benefitId,
      claimedById: memberId,
      status: "pending",
      claimedAt: Date.now(),
    });

    // Update claim count
    await ctx.db.patch(benefitId, {
      customProperties: {
        ...benefit.customProperties,
        currentClaimCount: currentClaims + 1,
      },
      updatedAt: Date.now(),
    });

    return claimId;
  },
});
```

### Day 13-14: UI Components

**Task 2.6: Benefits List Page**
```typescript
// src/app/(dashboard)/benefits/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BenefitCard } from "@/components/benefits/benefit-card";

export default function BenefitsPage() {
  const benefits = useQuery(api.gw.benefits.listBenefits, {});

  if (!benefits) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Benefits</h1>
        <Link href="/benefits/create">
          <Button>Benefit anbieten</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((benefit) => (
          <BenefitCard key={benefit._id} benefit={benefit} />
        ))}
      </div>
    </div>
  );
}
```

**Task 2.7: Benefit Card Component**
```typescript
// src/components/benefits/benefit-card.tsx
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function BenefitCard({ benefit }) {
  const subtypeLabels = {
    discount: "Rabatt",
    service: "Dienstleistung",
    product: "Produkt",
    event: "Veranstaltung",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <Badge variant="secondary">
            {subtypeLabels[benefit.subtype] || benefit.subtype}
          </Badge>
          {benefit.customProperties?.discountValue && (
            <Badge variant="default">
              {benefit.customProperties.discountValue}%
            </Badge>
          )}
        </div>
        <h3 className="text-lg font-semibold mt-2">{benefit.name}</h3>
        <p className="text-sm text-gray-500">
          von {benefit.offerer?.name}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 line-clamp-3">
          {benefit.description}
        </p>
      </CardContent>
      <CardFooter>
        <Link href={`/benefits/${benefit._id}`} className="w-full">
          <Button variant="outline" className="w-full">
            Details ansehen
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
```

---

## Checklist

### Week 1
- [ ] Create Next.js project
- [ ] Install dependencies
- [ ] Configure environment variables
- [ ] Implement NextAuth.js with GW OAuth
- [ ] Create login page
- [ ] Create protected layout
- [ ] Test OAuth with Chuck's test account
- [ ] Deploy to Vercel (staging)

### Week 2
- [ ] Add GW schemas to L4YERCAK3
- [ ] Run Convex migrations
- [ ] Implement member sync mutation
- [ ] Sync on login callback
- [ ] Create benefits CRUD mutations
- [ ] Create commissions CRUD mutations
- [ ] Build benefits list page
- [ ] Build benefit detail page
- [ ] Build create benefit form
- [ ] Build commissions list page
- [ ] Implement basic claim workflow
- [ ] Test end-to-end flow

---

## Success Criteria

1. ✅ Members can log in with GW OAuth
2. ✅ Member profiles sync to L4YERCAK3
3. ✅ Members can view all benefits
4. ✅ Members can create benefits
5. ✅ Members can claim benefits
6. ✅ Basic UI is functional and responsive

---

## Next Phase

[Phase 2: Payments](./PHASE_2_PAYMENTS.md) - Add Stripe and PayPal payment integration
