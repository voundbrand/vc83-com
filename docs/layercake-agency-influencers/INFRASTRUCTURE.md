# Affiliate Program Infrastructure

> What you need to build before launching outreach

---

## Overview

| Component | Priority | Build Time | Status |
|-----------|----------|------------|--------|
| Affiliate Tracking System | P0 | 1-2 days | [ ] Not started |
| Affiliate Signup Page | P0 | 1 day | [ ] Not started |
| Affiliate Dashboard | P0 | 2-3 days | [ ] Not started |
| Marketing Materials Kit | P1 | 2-3 days | [ ] Not started |
| Payout System | P1 | 1-2 days | [ ] Not started |
| Affiliate Agreement | P1 | 1 day | [ ] Not started |

---

## 1. Affiliate Tracking System

### What It Does
- Generate unique referral links per affiliate
- Track clicks, signups, and conversions
- Attribute sales to correct affiliate
- Handle cookie-based attribution (90-day window)

### Build vs Buy Decision

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Build In-House** | Full control, custom features, fits your stack | Dev time, maintenance | Dev hours |
| **Rewardful** | Fast setup, Stripe native, good UX | Monthly fee, less control | $29-299/mo |
| **FirstPromoter** | Popular with SaaS, good features | Monthly fee | $49-199/mo |
| **PartnerStack** | Enterprise-grade | Expensive, complex | $800+/mo |
| **Tapfiliate** | Good balance of features/price | Monthly fee | $89-149/mo |

**Recommendation:** If you can build in-house quickly, do it. Otherwise, start with Rewardful or FirstPromoter to launch fast, migrate later.

### Required Features

**Must Have:**
- [ ] Unique referral links (e.g., `layercake.com/?ref=AFFILIATE123`)
- [ ] Click tracking
- [ ] Signup/trial attribution
- [ ] Conversion (payment) attribution
- [ ] 90-day cookie window
- [ ] First-touch attribution
- [ ] Stripe integration (for commission calculation)

**Nice to Have:**
- [ ] Sub-ID tracking (for A/B testing)
- [ ] Custom landing pages per affiliate
- [ ] API for affiliates to pull their own data

---

## 2. Affiliate Signup Page

### URL
`layercake.com/affiliates` or `affiliates.layercake.com`

### Page Structure

```
1. HERO
   - Headline: "Earn 40% Recurring, Forever"
   - Subhead: "Join the Layer Cake affiliate program"
   - CTA: "Apply Now"

2. THE MATH
   - Commission calculator
   - "10 referrals = $2,000/month"

3. WHAT YOU GET
   - 40% recurring lifetime
   - 90-day cookie
   - Marketing materials
   - Dedicated support

4. WHO IT'S FOR
   - Agency educators
   - Software reviewers
   - Web design influencers

5. HOW IT WORKS
   - Step 1: Apply
   - Step 2: Get approved
   - Step 3: Get your link + materials
   - Step 4: Promote & earn

6. FAQ
   - Common questions

7. APPLICATION FORM
   - Name, email
   - Website/social links
   - Audience size
   - How they plan to promote
```

### Application Form Fields

**Required:**
- [ ] Full name
- [ ] Email
- [ ] Primary platform (YouTube, Podcast, LinkedIn, etc.)
- [ ] Audience size (range)
- [ ] Link to content (YouTube channel, website, etc.)
- [ ] Brief description of how they'll promote

**Optional:**
- [ ] Other affiliate programs they're part of
- [ ] Expected referrals per month

---

## 3. Affiliate Dashboard

### What Affiliates See

```
DASHBOARD HOME
├── Quick Stats
│   ├── Clicks (this month)
│   ├── Signups (this month)
│   ├── Conversions (this month)
│   ├── Commission earned (this month)
│   └── Lifetime earnings
│
├── Referral Links
│   ├── Default link
│   └── Custom links (optional)
│
├── Performance
│   ├── Click-through rate
│   ├── Conversion rate
│   └── Earnings graph
│
├── Marketing Materials
│   ├── Logos
│   ├── Banners
│   ├── Swipe copy
│   └── Demo videos
│
├── Payouts
│   ├── Pending balance
│   ├── Next payout date
│   └── Payout history
│
└── Settings
    ├── Payment info
    ├── Notification preferences
    └── Profile
```

---

## 4. Marketing Materials Kit

### What to Create

**Videos:**
- [ ] 2-minute product demo (screen recording)
- [ ] 30-second social clip
- [ ] "How it works" explainer

**Images:**
- [ ] Logo pack (PNG, SVG, light/dark)
- [ ] Social media banners (1200x628, 1080x1080)
- [ ] Profile badge ("Layer Cake Partner")

**Copy:**
- [ ] Email swipe (3 templates)
- [ ] Social media posts (5-10 variations)
- [ ] Tweet threads (2-3 templates)
- [ ] LinkedIn post templates

**Documents:**
- [ ] Product one-pager (PDF)
- [ ] Affiliate FAQ
- [ ] Best practices guide

**Assets Location:**
Create a shared folder or page at `layercake.com/affiliate-resources`

---

## 5. Payout System

### Configuration

| Setting | Value |
|---------|-------|
| Commission Rate | 40% |
| Duration | Lifetime |
| Payout Frequency | Monthly |
| Payout Date | 1st of month (for previous month) |
| Minimum Payout | $100 |
| Hold Period | 30 days (for refunds) |

### Payment Methods to Support

- [ ] PayPal
- [ ] Wise (international transfers)
- [ ] Direct bank transfer (ACH for US)
- [ ] Crypto (optional — good differentiator)

### Payout Process

1. Month ends
2. Calculate commissions (minus any refunds)
3. Apply 30-day hold for recent transactions
4. Generate payout report
5. Process payments on 1st
6. Send confirmation emails

---

## 6. Affiliate Agreement

### Key Terms to Include

**Commission:**
- 40% of net revenue (after payment processor fees)
- Recurring for lifetime of customer
- Paid monthly, NET-30

**Attribution:**
- 90-day cookie window
- First-touch attribution
- Commission awarded for any plan customer signs up for

**Prohibited Activities:**
- No paid ads bidding on "Layer Cake" brand terms
- No spam or unsolicited bulk messaging
- No false claims about the product
- No cookie stuffing or fraud

**Disclosure:**
- Must comply with FTC guidelines
- Must disclose affiliate relationship

**Termination:**
- Either party can terminate with 30 days notice
- Earned commissions still paid out
- Fraud = immediate termination, forfeiture

**Liability:**
- Standard limitation of liability clause
- No warranties on earnings

### Template Sources
- Rewardful provides template agreements
- FirstPromoter has templates
- Or have a lawyer draft one (~$500-1000)

---

## 7. Launch Checklist

### Before First Outreach

**Technical:**
- [ ] Tracking system live and tested
- [ ] Signup page published
- [ ] Dashboard functional
- [ ] Test referral link end-to-end
- [ ] Stripe integration working

**Materials:**
- [ ] Product demo video recorded
- [ ] Logo pack ready
- [ ] Swipe copy written
- [ ] One-pager PDF created

**Legal:**
- [ ] Affiliate agreement drafted
- [ ] Privacy policy updated
- [ ] Terms of service updated

**Process:**
- [ ] Application review process defined
- [ ] Payout process documented
- [ ] Support process defined

---

## 8. Minimum Viable Launch

If you need to launch FAST, here's the bare minimum:

| Component | MVP Version |
|-----------|-------------|
| **Tracking** | Stripe coupon codes per affiliate + spreadsheet |
| **Signup** | Google Form + manual approval |
| **Dashboard** | Spreadsheet shared with affiliate (read-only) |
| **Materials** | 1 demo video, logo pack, 3 email templates |
| **Payouts** | PayPal manual transfer monthly |
| **Agreement** | Simple 1-page terms in email |

**Time to launch:** 2-3 days

**Upgrade path:** Build proper system after first 5-10 affiliates prove the model.

---

## 9. Metrics to Track

| Metric | Definition | Target |
|--------|------------|--------|
| Affiliate signups | Applications received | 50 in 90 days |
| Approval rate | Approved / Applied | 40% |
| Active affiliates | Made at least 1 referral | 50% of approved |
| Clicks per affiliate | Total clicks / Active affiliates | 100+/mo |
| Conversion rate | Customers / Clicks | 2-5% |
| Revenue per affiliate | Total revenue / Active affiliates | $500+/mo |
| Affiliate churn | Stopped referring / Total | <10%/mo |

---

*Part of the [Layer Cake Affiliate Recruitment Campaign](./README.md)*
