# l4yercak3 Pricing Structure - Community Access Model

**Version:** 2.0
**Date:** December 2025
**Purpose:** Define pricing tiers with Community access inclusion strategy

---

## Pricing Overview

| Tier | Price | Platform Features | Community Access | Trial |
|------|-------|-------------------|------------------|-------|
| **Free** | €0 | 100 contacts, 1 user, basic | ❌ €9/mo add-on | N/A |
| **Starter** | €199/mo | 1,000 contacts, 3 users, AI | ✅ **Included** | 14 days |
| **Professional** | €399/mo | 5,000 contacts, 10 users, advanced | ✅ **Included** | 14 days |
| **Agency** | €599/mo | 10,000 contacts, sub-orgs | ✅ **Included** | 14 days |
| **Enterprise** | €1,500+/mo | Custom limits, SSO | ✅ **Included** | 14 days |

---

## Community Access Breakdown

### What is "Community Access"?

Community Access includes:
- ✅ **Foundations Course** - Complete onboarding & best practices course
- ✅ **Templates Library** - Pre-built workflows, email templates, automations
- ✅ **Weekly Live Calls** - Group coaching & Q&A sessions
- ✅ **Private Skool Group** - Community discussions, peer support
- ✅ **Early Access** - New features & beta testing opportunities

**Value:** €9/month standalone OR included with Starter+ plans

---

## Pricing Strategy

### Free Tier (€0/month)
**Target:** Template users, lead magnets, trial before commitment

**Platform Features:**
- 100 CRM contacts
- 1 user
- 3 projects
- 3 events
- Basic features

**Community Access:** ❌ NOT Included
- **Option:** Add Community for €9/mo
- **Purpose:** Low-barrier entry to paid relationship
- **Value Prop:** "Get courses & live calls for €9"

---

### Starter Tier (€199/month)
**Target:** Solo operators, single project businesses

**Platform Features:**
- 1,000 CRM contacts
- 3 users
- AI Assistant included
- 20 projects
- Email campaigns (500/mo)

**Community Access:** ✅ **INCLUDED** (€9 value)
- **Why included:** Justifies price jump from Free
- **Benefit:** Onboarding support, templates reduce setup time
- **Stickiness:** Live calls create personal connection
- **Upsell:** Smooth path to Professional

**Marketing Message:**
> "€199/mo gets you the full platform PLUS community access (€9 value)"

---

### Professional Tier (€399/month)
**Target:** Growing businesses, teams

**Platform Features:**
- 5,000 CRM contacts
- 10 users
- Advanced features
- Unlimited projects
- Custom roles

**Community Access:** ✅ **INCLUDED** (€9 value)
- **Why included:** Premium tier expects white-glove support
- **Benefit:** Advanced templates for scaling businesses
- **Network Effect:** Connect with other growing businesses

---

### Agency Tier (€599/month)
**Target:** Multi-client operators, white-label resellers

**Platform Features:**
- 10,000 contacts
- Sub-organizations
- White-label
- Priority support

**Community Access:** ✅ **INCLUDED** (€9 value)
- **Why included:** Agency-specific playbooks & templates
- **Benefit:** Client onboarding templates
- **Network:** Peer agency operators sharing strategies

---

### Enterprise Tier (€1,500+/month)
**Target:** Large organizations, compliance-heavy industries

**Platform Features:**
- Custom limits
- SSO
- Dedicated support
- SLA guarantees

**Community Access:** ✅ **INCLUDED** (€9 value)
- **Why included:** Executive-level content & networking
- **Benefit:** Custom training sessions
- **Network:** Enterprise peer connections

---

## User Journey Examples

### Journey 1: Community-First Entry
```
Step 1: User discovers l4yercak3 through content
Step 2: "Join Community" CTA → €9/mo
Step 3: Starts Free platform account + Community access
Step 4: Uses platform, attends calls, gets value
Step 5: Business grows → upgrades to Starter (€199)
Step 6: Community subscription auto-canceled (now included)
Step 7: Saves €9/mo, gets more platform features
```

**Total Cost Timeline:**
- Month 1-3: €9/mo (Free platform + Community)
- Month 4+: €199/mo (Starter platform + Community included)
- **Net savings:** €9/mo after upgrade

---

### Journey 2: Platform-First Entry
```
Step 1: User needs CRM/platform features immediately
Step 2: Signs up for 14-day Starter trial
Step 3: Gets platform features + Community access
Step 4: During trial, attends live calls, downloads templates
Step 5: Trial converts → €199/mo (everything included)
```

**Trial Experience:**
- Day 1-3: Platform setup with template library
- Day 4-7: First live call attendance
- Day 8-14: Active in Skool group, building relationships
- **Conversion driver:** Community creates stickiness

---

### Journey 3: Free User Upgrade Path
```
Step 1: Free user (100 contacts, 1 user)
Step 2: Discovers Community through in-app banner
Step 3: Adds Community for €9/mo
Step 4: Attends calls, realizes they need more platform features
Step 5: Upgrades to Starter (€199/mo)
Step 6: Community now included, standalone canceled
```

**Conversion Funnel:**
- Free users without Community: 5% upgrade rate
- Free users with Community: 25% upgrade rate (5x better!)
- **Reason:** Community builds relationship & trust

---

### Journey 4: Downgrade Scenario
```
Current: Starter (€199/mo) with Community included
Scenario: Budget cuts, need to reduce costs

Option A: Downgrade to Free, lose Community
  → Cost: €0/mo
  → Loses: Platform features + Community access

Option B: Downgrade to Free, re-add Community
  → Cost: €9/mo
  → Loses: Platform features
  → Keeps: Community access, relationships, content

Option C: Keep Starter (recommended)
  → Cost: €199/mo
  → Keeps: Everything
```

**Retention Strategy:**
- Community makes downgrade harder (emotional connection)
- "You'll lose access to the community" warning
- Option to keep Community for €9 provides safety net

---

## Revenue Model

### Example: 1,000 Customers

**Without Community Inclusion:**
```
Breakdown:
- 500 Free users: €0
- 300 Starter users: 300 × €199 = €59,700
- 150 Professional users: 150 × €399 = €59,850
- 50 Agency users: 50 × €599 = €29,950

Total MRR: €149,500
```

**With Community Inclusion (Current Model):**
```
Breakdown:
- 400 Free users: €0
- 50 Free + Community: 50 × €9 = €450
- 350 Starter (Community included): 350 × €199 = €69,650
- 150 Professional (Community included): 150 × €399 = €59,850
- 50 Agency (Community included): 50 × €599 = €29,950

Total MRR: €159,900

Net Increase: €10,400/mo (+7%)
```

**Why the increase:**
1. 50 Free users pay €9 (new revenue stream)
2. 50 Free users upgrade to Starter (€199 vs €0)
   - Reason: Community included makes Starter more attractive
   - "Get Community + platform features for €199"
3. Higher perceived value across all paid tiers

---

## Implementation Details

### Database Schema

```typescript
interface Organization {
  // Platform tier
  plan: "free" | "starter" | "professional" | "agency" | "enterprise";
  stripeSubscriptionId?: string;

  // Community access tracking
  communitySubscription?: {
    active: boolean;
    includedInPlan: boolean;      // true if Starter+
    standalone: boolean;           // true if Free user paying €9
    stripeSubscriptionId?: string; // Only if standalone
    startedAt?: number;
    trialEndsAt?: number;
    canceledAt?: number;
    skoolInviteSent?: boolean;
    skoolJoinedAt?: number;
  };
}
```

### Access Check Function

```typescript
export function hasCommunityAccess(org: Organization): boolean {
  // Paid plans include community
  if (['starter', 'professional', 'agency', 'enterprise'].includes(org.plan)) {
    return true;
  }

  // Free users with standalone community subscription
  if (org.communitySubscription?.active &&
      org.communitySubscription?.standalone) {
    return true;
  }

  return false;
}
```

### Stripe Webhook Logic

```typescript
// When user subscribes to Starter+
case 'customer.subscription.created':
  if (['starter', 'professional', 'agency', 'enterprise'].includes(planTier)) {
    // Grant community access (included)
    await updateOrganization(orgId, {
      communitySubscription: {
        active: true,
        includedInPlan: true,
        standalone: false,
      }
    });

    // Check if they had standalone community
    const existingCommunity = org.communitySubscription?.standalone;
    if (existingCommunity) {
      // Cancel standalone subscription (now included)
      await stripe.subscriptions.cancel(
        org.communitySubscription.stripeSubscriptionId
      );
      // Send email: "Community now included in Starter!"
    }

    // Send Skool invite
    await sendSkoolInvite(orgId);
  }
  break;

// When user downgrades from Starter+ to Free
case 'customer.subscription.deleted':
  if (org.communitySubscription?.includedInPlan) {
    // Remove community access
    await updateOrganization(orgId, {
      communitySubscription: {
        active: false,
        includedInPlan: false,
        canceledAt: Date.now(),
      }
    });

    // Send email with re-subscription option
    await sendCommunityLossEmail(orgId, {
      message: "You've lost community access. Re-subscribe for €9/mo to keep it!",
      ctaUrl: "/settings/billing/add-community"
    });
  }
  break;
```

---

## Marketing Copy

### Pricing Page

```markdown
# Choose Your Plan

## Free
**€0/month**
- 100 contacts
- 1 user
- Basic features
- ❌ No community access

[Get Started]

---

Want courses & live calls?
[Add Community for €9/mo →]

---

## Starter - Most Popular
**€199/month**
*14-day free trial*

Everything in Free, PLUS:
- 1,000 contacts
- 3 users
- AI Assistant
- Email campaigns (500/mo)
- ✅ **Community access included** (€9 value)
  - Foundations Course
  - Templates Library
  - Weekly Live Calls
  - Private Skool Group

[Start 14-day trial]

---

## Professional
**€399/month**
*14-day free trial*

Everything in Starter, PLUS:
- 5,000 contacts
- 10 users
- Advanced features
- Unlimited projects
- ✅ **Community access included** (€9 value)

[Start 14-day trial]
```

### In-App Upgrade Prompts

**For Free Users:**
```
🎓 Unlock Community Access

Get access to courses, templates, and weekly live calls.

What's included:
✅ Foundations Course
✅ Templates Library
✅ Weekly Live Calls
✅ Private Skool Group

[Add for €9/mo]

---

💡 Or upgrade to Starter and get Community INCLUDED!
€199/mo = Platform + Community

[View plans]
```

**For Free + Community Users:**
```
🚀 Upgrade to Starter - Community Already Included!

You're paying €9/mo for Community.
Upgrade to Starter (€199/mo) and get:

✅ Community access (already included!)
✅ 1,000 contacts (vs 100)
✅ 3 users (vs 1)
✅ AI Assistant
✅ Email campaigns

Save €9/mo on Community + unlock platform features!

[Upgrade to Starter]
```

---

## Competitive Positioning

### vs Competitors

**HubSpot:**
- Starter: $30/mo (no community)
- Professional: $1,600/mo (no community)
- Community: Separate "HubSpot Academy" (free but limited)

**ActiveCampaign:**
- Lite: $29/mo (no community)
- Plus: $49/mo (no community)
- Professional: $149/mo (no community)
- Community: Separate forum (free but basic)

**l4yercak3 Advantage:**
- Starter: €199/mo **with community included**
- Personal connection through live calls
- Actionable templates, not just docs
- Real support network, not just forums

**Positioning:**
> "Other platforms charge extra for training and support. We include it."

---

## Success Metrics to Track

### Community Metrics
- **Standalone Community subscribers** (Free users paying €9)
- **Community attendance rate** (% attending live calls)
- **Template download rate** (% using templates)
- **Skool engagement** (posts, comments, reactions)

### Conversion Metrics
- **Free → Free+Community** conversion rate
- **Free+Community → Starter** conversion rate
- **Community-driven upgrades** (upgrades within 30 days of joining)

### Retention Metrics
- **Churn rate** for Starter+ with Community
- **Churn rate** for standalone Community
- **Downgrade prevention** (% who keep Community when downgrading)

### Revenue Metrics
- **MRR from standalone Community** (Free users × €9)
- **MRR from paid tiers** (with Community included)
- **Average revenue per user** (ARPU)
- **Customer lifetime value** (LTV)

---

## FAQ

### For Free Users

**Q: How do I get Community access?**
A: Add Community for €9/mo, OR upgrade to Starter (€199/mo) and get it included!

**Q: What's the difference between €9 Community and Starter?**
A:
- €9: Just Community access (courses, calls) + Free platform (100 contacts)
- €199: Community access + Full platform (1,000 contacts, 3 users, AI)

**Q: Can I try Community before paying?**
A: Yes! 14-day free trial when you add Community or upgrade to Starter.

---

### For Paid Users

**Q: Is Community access included in my plan?**
A: Yes! All Starter, Professional, Agency, and Enterprise plans include Community.

**Q: What happens if I downgrade to Free?**
A: You'll lose Community access. You can re-add it for €9/mo if you want to keep it.

**Q: Can I upgrade from Starter to Professional and keep Community?**
A: Yes! Community stays included as you upgrade between paid tiers.

---

### For Standalone Community Subscribers

**Q: I'm paying €9/mo for Community. Should I upgrade to Starter?**
A: If you need more than 100 contacts, 1 user, or want AI features - yes! You'll save €9/mo on Community since it's included in Starter.

**Q: Can I cancel Community and keep my Free account?**
A: Yes! You'll keep your Free platform account (100 contacts, 1 user) but lose Community access.

---

*Document Version 2.0 — December 2025*
*Includes Community inclusion strategy for all paid tiers*
