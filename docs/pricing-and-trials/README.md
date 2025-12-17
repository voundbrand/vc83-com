# Pricing & Trials Documentation

This folder contains all documentation related to the 14-day trial implementation and Community Access pricing strategy.

---

## Documents Overview

### 1. IMPLEMENTATION-SUMMARY-TRIALS-AND-COMMUNITY.md
**Quick reference and TODO checklist**

- Overview of all changes
- Database schema updates (completed)
- Documentation updates (completed)
- Implementation checklist (TODO)
- Environment variables needed
- Success metrics to track

**Start here** for a high-level overview and task list.

---

### 2. PRICING-STRUCTURE-WITH-COMMUNITY.md
**Business strategy and pricing model**

- Pricing tier breakdown
- Community Access inclusion strategy
- User journey examples
- Revenue projections
- Marketing copy examples
- FAQ for customers

**Use this** for understanding the business model and customer messaging.

---

### 3. STRIPE-14-DAY-TRIAL-IMPLEMENTATION.md
**Complete technical implementation guide**

- Stripe product configuration
- Database schema changes
- Webhook handler implementations
- Email template specifications
- Frontend component updates
- Testing procedures

**Use this** for step-by-step technical implementation.

---

### 4. STRIPE-CONFIGURATION.md
**Master Stripe product reference**

- ⚠️ Important warnings about Stripe price immutability
- Complete product specifications for all tiers
- Price configurations with 14-day trials
- Metadata templates for each product
- Environment variable reference
- Legacy vs new price management

**Use this** as your reference when creating/updating Stripe products in the dashboard.

---

## Quick Links

### Key Decisions
- **Community as Add-On:** Not a platform tier, independent subscription
- **Community Included in Paid Tiers:** Starter, Professional, Agency, Enterprise
- **14-Day Trials:** All paid tiers (including Community standalone)
- **Free Tier Preserved:** Remains in code, can be reactivated

### Pricing Structure
```
FREE:         €0/mo    → No community (or add for €9/mo)
COMMUNITY:    €9/mo    → Courses, calls, Skool + Free platform
STARTER:      €199/mo  → Community INCLUDED + 1,000 contacts
PROFESSIONAL: €399/mo  → Community INCLUDED + 5,000 contacts
AGENCY:       €599/mo  → Community INCLUDED + sub-orgs
ENTERPRISE:   €1,500+  → Community INCLUDED + custom
```

### Database Changes (Completed)
- Added `trialStatus`, `trialStartedAt`, `trialEndsAt`, `trialPlan`
- Added `communitySubscription` object
- File: `convex/schemas/coreSchemas.ts`

---

## Implementation Status

### ✅ Completed
- [x] Database schema updated
- [x] Documentation written
- [x] Architecture designed
- [x] Licensing matrix updated

### 🔄 In Progress
- [ ] Stripe product setup
- [ ] Webhook handlers
- [ ] Email templates
- [ ] Frontend updates

### ⏳ Not Started
- [ ] Skool integration
- [ ] Testing
- [ ] Deployment

---

## Related Documentation

- **Licensing Matrix:** `.kiro/onboarding_flow_v1/LICENSING-ENFORCEMENT-MATRIX.md`
- **Skool Integration:** `.kiro/skool_integration_platform_level_v2/OVERVIEW.md`

---

## Questions or Issues?

Refer to the appropriate document:
- **Business questions** → PRICING-STRUCTURE-WITH-COMMUNITY.md
- **Technical questions** → STRIPE-14-DAY-TRIAL-IMPLEMENTATION.md
- **Implementation status** → IMPLEMENTATION-SUMMARY-TRIALS-AND-COMMUNITY.md

---

*Last Updated: December 2025*
