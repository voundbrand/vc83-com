# Data Model - L4YERCAK3 Ontology Mapping

**Document:** How Gründungswerft Data Maps to L4YERCAK3
**Status:** Draft
**Updated:** January 2025

---

## Overview

This document defines how Gründungswerft's member, startup, project, benefit, and commission data maps to L4YERCAK3's existing ontology system.

---

## The Gap: What OAuth Provides vs What We Need

### OAuth Returns (from Chuck)

```json
{
  "id": "abc-123",
  "membership_id": "GW-2024-0456",
  "firstname": "Max",
  "lastname": "Mustermann",
  "email": "max@startup.de",
  "street": "Hauptstraße",
  "housenumber": "42",
  "zip": "10115",
  "city": "Berlin",
  "telephone": "+49 30 12345678",
  "avatar": "wp-media-id-123",
  "socialmedia": ["linkedin.com/in/max", "twitter.com/max"],
  "languages": ["de", "en"],
  "portrait": "Serial entrepreneur with 10+ years..."
}
```

### What's Missing

- **Projects** - What initiatives is the member working on?
- **Startups** - What companies has the member founded/joined?
- **Benefits** - What benefits does the member/startup offer?
- **Commissions** - What commission opportunities exist?
- **Relationships** - Who works with whom?

---

## L4YERCAK3 Fills the Gap

### Object Type Mapping

| GW Concept | L4YERCAK3 Object Type | Subtype |
|------------|----------------------|---------|
| Member (Person) | `crm_contact` | `gw_member` |
| Startup (Company) | `crm_organization` | `gw_startup` |
| Project | `project` | `gw_initiative` |
| Benefit Offer | `gw_benefit` | `discount`, `service`, `product`, `event` |
| Commission Offer | `gw_commission` | `referral`, `partnership`, `sales` |
| Benefit Claim | `gw_benefit_claim` | - |
| Commission Payout | `gw_commission_payout` | - |

---

## Object Definitions

### 1. GW Member (crm_contact)

```typescript
// Object in L4YERCAK3
{
  _id: Id<"objects">,
  organizationId: "l4yercak3_gw_org_id",
  type: "crm_contact",
  subtype: "gw_member",
  name: "Max Mustermann",
  status: "active",

  customProperties: {
    // From OAuth
    gwUserId: "abc-123",                    // GW OAuth user ID
    gwMembershipId: "GW-2024-0456",         // GW membership number
    firstName: "Max",
    lastName: "Mustermann",
    email: "max@startup.de",
    phone: "+49 30 12345678",

    // Address
    address: {
      street: "Hauptstraße 42",
      city: "Berlin",
      postalCode: "10115",
      country: "DE",
    },

    // Profile
    avatar: "https://cdn.gruendungswerft.com/avatars/123.jpg",
    bio: "Serial entrepreneur with 10+ years...",
    languages: ["de", "en"],
    socialMedia: {
      linkedin: "linkedin.com/in/max",
      twitter: "twitter.com/max",
    },

    // Platform data (added by L4YERCAK3)
    linkedWallets: ["0x1234...abcd"],        // Crypto wallets
    preferredPaymentMethod: "stripe",
    benefitsOfferedCount: 3,
    commissionsEarnedCount: 5,
    memberSince: 1704067200000,
    lastActiveAt: 1735689600000,
  },

  createdAt: 1704067200000,
  updatedAt: 1735689600000,
}
```

### 2. GW Startup (crm_organization)

```typescript
{
  _id: Id<"objects">,
  organizationId: "l4yercak3_gw_org_id",
  type: "crm_organization",
  subtype: "gw_startup",
  name: "TechStartup GmbH",
  status: "active",

  customProperties: {
    // Basic info
    legalName: "TechStartup GmbH",
    registrationNumber: "HRB 123456",
    vatNumber: "DE123456789",
    website: "https://techstartup.de",

    // Address
    address: {
      street: "Startup Allee 1",
      city: "Berlin",
      postalCode: "10997",
      country: "DE",
    },

    // Startup specific
    stage: "growth",                         // idea, prototype, mvp, growth, scale
    industry: "fintech",
    foundedYear: 2022,
    teamSize: 12,

    // Funding
    fundingStage: "series_a",               // pre_seed, seed, series_a, etc.
    fundingAmount: 2500000,
    fundingCurrency: "EUR",
    lastFundingDate: 1704067200000,

    // Metrics
    monthlyRevenue: 50000,
    customerCount: 150,

    // Platform data
    benefitsOfferedCount: 5,
    commissionsPostedCount: 3,

    // Payment info
    stripeAccountId: "acct_xxxx",
    paypalMerchantId: "merchant_xxxx",
    walletAddress: "0x1234...abcd",
  },

  createdAt: 1640995200000,
  updatedAt: 1735689600000,
}
```

### 3. GW Benefit (gw_benefit)

```typescript
{
  _id: Id<"objects">,
  organizationId: "l4yercak3_gw_org_id",
  type: "gw_benefit",
  subtype: "discount",                       // discount, service, product, event
  name: "20% Rabatt auf Web-Entwicklung",
  description: "Exklusiv für GW-Mitglieder: 20% Rabatt auf alle Web-Entwicklungs-Projekte bis €10.000",
  status: "active",                          // draft, active, paused, expired

  customProperties: {
    // Offer details
    category: "technology",
    tags: ["web", "development", "discount"],

    // Value
    discountType: "percent",                 // percent, fixed, free
    discountValue: 20,
    discountCurrency: "EUR",
    maxDiscountAmount: 2000,                 // Cap at €2000 savings

    // Validity
    validFrom: 1704067200000,
    validUntil: 1735689600000,

    // Limits
    maxTotalClaims: 50,
    maxClaimsPerMember: 1,
    currentClaimCount: 12,

    // Requirements
    requirements: "Gilt nur für Neukunden. Projekt muss innerhalb von 3 Monaten starten.",

    // Contact
    contactEmail: "max@techstartup.de",
    contactPhone: "+49 30 12345678",
    contactName: "Max Mustermann",

    // Media
    imageUrl: "https://cdn.l4yercak3.com/benefits/123.jpg",

    // Stats
    viewCount: 245,
    claimCount: 12,

    // Offered by (can be member or startup)
    offeredByType: "startup",                // member, startup
    offeredById: Id<"objects">,              // Reference to crm_contact or crm_organization
  },

  createdBy: Id<"objects">,                  // The member who created it
  createdAt: 1704067200000,
  updatedAt: 1735689600000,
}
```

### 4. GW Commission (gw_commission)

```typescript
{
  _id: Id<"objects">,
  organizationId: "l4yercak3_gw_org_id",
  type: "gw_commission",
  subtype: "referral",                       // referral, partnership, sales
  name: "10% für Kundenempfehlung",
  description: "Vermittle uns einen Neukunden und erhalte 10% des ersten Jahresumsatzes",
  status: "active",

  customProperties: {
    // Commission structure
    commissionType: "percent",               // percent, fixed, tiered
    commissionValue: 10,
    commissionCurrency: "EUR",

    // Limits
    minCommission: 100,                      // Minimum payout €100
    maxCommission: 5000,                     // Maximum payout €5000

    // Target
    targetCustomerType: "b2b",               // b2b, b2c, both
    targetIndustries: ["fintech", "saas"],
    targetMinDealSize: 10000,                // Min deal value €10k

    // Requirements
    requirements: "Kunde muss Vertrag abschließen. Provision wird nach 30 Tagen ausgezahlt.",
    qualificationCriteria: "Erstkontakt muss über Empfehler erfolgen.",

    // Payout
    payoutDelay: 30,                         // Days after deal closes
    payoutMethods: ["stripe", "paypal", "crypto", "escrow"],
    preferredPayoutMethod: "stripe",

    // Stats
    totalReferrals: 25,
    successfulReferrals: 8,
    totalPaidOut: 12500,
    averageCommission: 1562.50,

    // Contact
    contactEmail: "partnerships@techstartup.de",
    contactName: "Anna Schmidt",

    // Offered by
    offeredByType: "startup",
    offeredById: Id<"objects">,
  },

  createdBy: Id<"objects">,
  createdAt: 1704067200000,
  updatedAt: 1735689600000,
}
```

### 5. GW Benefit Claim (gw_benefit_claim)

```typescript
{
  _id: Id<"objects">,
  organizationId: "l4yercak3_gw_org_id",
  type: "gw_benefit_claim",
  name: "Claim: 20% Web-Entwicklung by Lisa Weber",
  status: "redeemed",                        // pending, approved, redeemed, expired, rejected

  customProperties: {
    benefitId: Id<"objects">,                // Reference to gw_benefit
    benefitName: "20% Rabatt auf Web-Entwicklung",

    claimedById: Id<"objects">,              // crm_contact of claimer
    claimedByName: "Lisa Weber",
    claimedByEmail: "lisa@otherstartup.de",

    // Claim details
    claimedAt: 1735000000000,
    approvedAt: 1735000500000,
    redeemedAt: 1735500000000,
    expiresAt: 1766536000000,

    // Redemption details
    redemptionNotes: "Projekt für neue Website gestartet",
    estimatedValue: 1500,                    // Estimated savings

    // Platform fee
    platformFeeCharged: true,
    platformFeeAmount: 50,                   // €0.50 in cents
    platformFeeStatus: "collected",
  },

  createdAt: 1735000000000,
  updatedAt: 1735500000000,
}
```

### 6. GW Commission Payout (gw_commission_payout)

```typescript
{
  _id: Id<"objects">,
  organizationId: "l4yercak3_gw_org_id",
  type: "gw_commission_payout",
  name: "Payout: €500 to Lisa Weber for TechStartup referral",
  status: "paid",                            // pending, verified, processing, paid, disputed, cancelled

  customProperties: {
    commissionId: Id<"objects">,             // Reference to gw_commission
    commissionName: "10% für Kundenempfehlung",

    // Parties
    affiliateId: Id<"objects">,              // Who earns (crm_contact)
    affiliateName: "Lisa Weber",
    affiliateEmail: "lisa@otherstartup.de",

    merchantId: Id<"objects">,               // Who pays (crm_contact or crm_organization)
    merchantName: "TechStartup GmbH",

    // Referral details
    referralDescription: "Introduced CloudCorp as new customer",
    referralDate: 1734000000000,
    dealValue: 50000,                        // €50k deal

    // Commission calculation
    commissionPercent: 10,
    grossCommission: 5000,                   // 10% of €50k
    cappedCommission: 5000,                  // After cap applied

    // Platform fee
    platformFeePercent: 2.5,
    platformFeeAmount: 125,                  // €1.25 in cents... wait, €12.50
    netCommission: 4875,                     // After platform fee (if deducted)

    // Payment
    paymentMethod: "stripe",
    paymentReference: "pi_xxxx",
    paymentStatus: "succeeded",
    paidAt: 1735000000000,

    // Or for escrow
    escrowContractAddress: "0xEscrow...",
    escrowId: "42",
    escrowTxHash: "0xabc...",
    escrowStatus: "released",

    // Invoice (if generated)
    invoiceId: Id<"objects">,
    invoiceNumber: "INV-2025-0042",
  },

  createdAt: 1734000000000,
  updatedAt: 1735000000000,
}
```

---

## Object Links

### Link Types

| Link Type | From | To | Description |
|-----------|------|----|----|
| `founder_of` | crm_contact (member) | crm_organization (startup) | Member founded startup |
| `team_member_of` | crm_contact (member) | crm_organization (startup) | Member works at startup |
| `works_on` | crm_contact (member) | project | Member contributes to project |
| `owns` | crm_organization (startup) | project | Startup owns project |
| `offers_benefit` | crm_contact/org | gw_benefit | Offers this benefit |
| `offers_commission` | crm_contact/org | gw_commission | Offers this commission |
| `claimed` | crm_contact (member) | gw_benefit_claim | Member claimed benefit |
| `earned` | crm_contact (member) | gw_commission_payout | Member earned commission |
| `paid` | crm_contact/org | gw_commission_payout | Paid this commission |
| `invoiced_for` | invoice | gw_commission_payout | Invoice for this payout |

### Example Link Records

```typescript
// Max Mustermann founded TechStartup GmbH
{
  _id: Id<"objectLinks">,
  organizationId: "l4yercak3_gw_org_id",
  fromObjectId: "max_member_id",
  toObjectId: "techstartup_id",
  linkType: "founder_of",
  properties: {
    role: "CEO",
    equity: 40,
    since: 1640995200000,
  },
  createdAt: 1640995200000,
}

// TechStartup offers the 20% discount benefit
{
  _id: Id<"objectLinks">,
  organizationId: "l4yercak3_gw_org_id",
  fromObjectId: "techstartup_id",
  toObjectId: "benefit_20_percent_id",
  linkType: "offers_benefit",
  createdAt: 1704067200000,
}

// Lisa Weber claimed the benefit
{
  _id: Id<"objectLinks">,
  organizationId: "l4yercak3_gw_org_id",
  fromObjectId: "lisa_member_id",
  toObjectId: "benefit_claim_id",
  linkType: "claimed",
  createdAt: 1735000000000,
}

// Lisa earned commission from TechStartup
{
  _id: Id<"objectLinks">,
  organizationId: "l4yercak3_gw_org_id",
  fromObjectId: "lisa_member_id",
  toObjectId: "commission_payout_id",
  linkType: "earned",
  createdAt: 1735000000000,
}
```

---

## Data Sync Flow

### On OAuth Login

```typescript
// convex/gw/memberSync.ts

export const syncMemberFromOAuth = mutation({
  args: {
    oauthProfile: v.object({
      id: v.string(),
      membership_id: v.string(),
      firstname: v.string(),
      lastname: v.string(),
      email: v.string(),
      // ... other fields
    }),
  },
  handler: async (ctx, { oauthProfile }) => {
    const gwOrgId = await getGWOrganizationId(ctx);

    // Check if member already exists
    const existing = await ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", gwOrgId)
         .eq("type", "crm_contact")
      )
      .filter(q =>
        q.eq(q.field("customProperties.gwUserId"), oauthProfile.id)
      )
      .first();

    const memberData = {
      organizationId: gwOrgId,
      type: "crm_contact",
      subtype: "gw_member",
      name: `${oauthProfile.firstname} ${oauthProfile.lastname}`,
      status: "active",
      customProperties: {
        gwUserId: oauthProfile.id,
        gwMembershipId: oauthProfile.membership_id,
        firstName: oauthProfile.firstname,
        lastName: oauthProfile.lastname,
        email: oauthProfile.email,
        phone: oauthProfile.telephone,
        address: {
          street: `${oauthProfile.street} ${oauthProfile.housenumber}`,
          city: oauthProfile.city,
          postalCode: oauthProfile.zip,
          country: "DE",
        },
        bio: oauthProfile.portrait,
        languages: oauthProfile.languages,
        socialMedia: parseSocialMedia(oauthProfile.socialmedia),
        // Avatar needs to be resolved from WP Media ID
        avatarWpMediaId: oauthProfile.avatar,
      },
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, memberData);
      return existing._id;
    } else {
      return await ctx.db.insert("objects", {
        ...memberData,
        createdAt: Date.now(),
      });
    }
  },
});
```

### Prompt for Missing Data

After OAuth sync, prompt member to add:
1. Their startup(s)
2. Projects they're working on
3. Benefits they want to offer
4. Commission opportunities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Welcome, Max! Let's complete your profile.                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ Basic Profile                 Synced from Gründungswerft                │
│                                                                             │
│  ❌ Your Startups                 Add your startup or company               │
│     └─ [+ Add Startup]                                                      │
│                                                                             │
│  ❌ Your Projects                 What are you working on?                  │
│     └─ [+ Add Project]                                                      │
│                                                                             │
│  ❌ Benefits You Offer            Share discounts with members              │
│     └─ [+ Add Benefit]                                                      │
│                                                                             │
│  ❌ Commission Opportunities      Offer referral commissions                │
│     └─ [+ Add Commission]                                                   │
│                                                                             │
│  ❌ Payment Methods               Set up how you get paid                   │
│     └─ [Connect Stripe] [Connect PayPal] [Link Wallet]                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Querying Patterns

### Get Member with All Related Data

```typescript
export const getMemberProfile = query({
  args: { memberId: v.id("objects") },
  handler: async (ctx, { memberId }) => {
    const member = await ctx.db.get(memberId);
    if (!member || member.type !== "crm_contact") return null;

    // Get startups (via founder_of and team_member_of links)
    const startupLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", q =>
        q.eq("fromObjectId", memberId)
      )
      .filter(q =>
        q.or(
          q.eq(q.field("linkType"), "founder_of"),
          q.eq(q.field("linkType"), "team_member_of")
        )
      )
      .collect();

    const startups = await Promise.all(
      startupLinks.map(link => ctx.db.get(link.toObjectId))
    );

    // Get benefits offered
    const benefitLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", q =>
        q.eq("fromObjectId", memberId)
         .eq("linkType", "offers_benefit")
      )
      .collect();

    const benefits = await Promise.all(
      benefitLinks.map(link => ctx.db.get(link.toObjectId))
    );

    // Get commissions earned
    const earnedLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_link_type", q =>
        q.eq("fromObjectId", memberId)
         .eq("linkType", "earned")
      )
      .collect();

    const commissionsEarned = await Promise.all(
      earnedLinks.map(link => ctx.db.get(link.toObjectId))
    );

    return {
      member,
      startups: startups.filter(Boolean),
      benefitsOffered: benefits.filter(Boolean),
      commissionsEarned: commissionsEarned.filter(Boolean),
    };
  },
});
```

### List All Active Benefits

```typescript
export const listActiveBenefits = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { category, limit = 20 }) => {
    const gwOrgId = await getGWOrganizationId(ctx);

    let query = ctx.db
      .query("objects")
      .withIndex("by_org_type", q =>
        q.eq("organizationId", gwOrgId)
         .eq("type", "gw_benefit")
      )
      .filter(q => q.eq(q.field("status"), "active"));

    if (category) {
      query = query.filter(q =>
        q.eq(q.field("customProperties.category"), category)
      );
    }

    const benefits = await query.take(limit);

    // Enrich with offerer info
    return Promise.all(
      benefits.map(async (benefit) => {
        const offerer = await ctx.db.get(benefit.customProperties.offeredById);
        return {
          ...benefit,
          offerer: offerer ? {
            id: offerer._id,
            name: offerer.name,
            type: offerer.type,
          } : null,
        };
      })
    );
  },
});
```

---

## Migration from OAuth-Only to Full Profile

When a member first logs in, we have minimal data. Over time, they add more:

```
Day 1 (OAuth Only):
├── crm_contact (basic profile)
└── No links

Day 7 (Added Startup):
├── crm_contact (basic profile)
├── crm_organization (startup)
└── objectLink: founder_of

Day 14 (Posted Benefit):
├── crm_contact (basic profile)
├── crm_organization (startup)
├── gw_benefit (discount offer)
└── objectLinks: founder_of, offers_benefit

Day 30 (Earned Commission):
├── crm_contact (enriched profile)
├── crm_organization (startup)
├── gw_benefit (discount offer)
├── gw_commission_payout (earned €500)
├── invoice (for commission)
└── objectLinks: founder_of, offers_benefit, earned, invoiced_for
```

---

## Next Steps

1. Implement member sync mutation
2. Create startup/project creation flows
3. Build benefit and commission CRUD
4. Implement claim and payout workflows
5. Add payment method linking
