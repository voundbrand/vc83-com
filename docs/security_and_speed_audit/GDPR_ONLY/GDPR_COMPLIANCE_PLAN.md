# GDPR Compliance Plan: Code + Real-World Actions

**Project:** vc83-com
**Date:** 2026-02-01
**Scope:** Full GDPR readiness - technical implementation + business/legal obligations

---

## Current Status: 35/100

You have strong backend foundations (data export, account deletion, audit logging) but are missing critical user-facing and legal components.

| Category | Status |
|----------|--------|
| Data export (Article 20) | DONE |
| Account deletion with grace period (Article 17) | DONE |
| Audit logging | DONE |
| RBAC and access control | DONE |
| EU-hosted analytics (PostHog) | DONE |
| Password hashing (bcrypt/PBKDF2) | DONE |
| Cookie consent banner | NOT DONE |
| Privacy policy | NOT DONE |
| Terms of service | NOT DONE |
| Cookie policy | NOT DONE |
| Consent tracking in database | NOT DONE |
| PostHog blocked until consent | NOT DONE |
| DPA for customers | NOT DONE |
| ROPA document | NOT DONE |
| Subprocessor list | NOT DONE |
| Breach notification process | NOT DONE |
| DPO appointment | NOT DONE |
| Data retention automation | PARTIAL |

**Existing implementation plan:** `docs/plans/compliance_gdpr/gdpr-compliance.md` (10 phases, 584 lines, well-structured - use it as the technical blueprint)

---

## PART 1: REAL-WORLD STEPS (Business & Legal)

These are things no amount of code can solve. You need to do these yourself or with a lawyer.

### Step 1: Determine Your Legal Entity & Role

Before anything else, clarify:

- **Are you the Data Controller or Data Processor?**
  - If users sign up directly to your platform and you decide what data to collect: you are the **Controller**
  - If organizations use your platform to manage their customers' data: you are both a **Controller** (for your users) and a **Processor** (for their customers' data)
  - This dual role is common for SaaS platforms and affects your obligations

- **Action items:**
  - [ ] Register your business entity (if not already done)
  - [ ] Determine your legal establishment (which EU country, or if outside EU, which supervisory authority)
  - [ ] Get a registered business address for legal documents

### Step 2: Appoint a Data Protection Officer (DPO)

**When required by GDPR Article 37:**
- You process data on a large scale
- You process special categories of data (health, biometrics, etc.)
- You're a public authority

**Even if not legally required**, having a designated privacy contact is good practice and expected by enterprise customers.

- **Action items:**
  - [ ] Decide if you need a formal DPO (consult a lawyer if unsure)
  - [ ] If yes: appoint someone (internal or external DPO service)
  - [ ] If no: designate a privacy contact person
  - [ ] Create a `privacy@yourdomain.com` email address
  - [ ] Publish DPO/privacy contact in your privacy policy and on your website

**External DPO services** (if you don't want to hire one):
- Privasee, DataGrail, Dataguard, or local GDPR consultancies
- Cost: typically 200-800 EUR/month

### Step 3: Get a Lawyer to Draft Your Legal Documents

This is not optional. Template generators are a starting point, but a lawyer familiar with your specific data processing activities should review everything.

**Documents you need:**

| Document | What It Is | Who Sees It |
|----------|-----------|-------------|
| Privacy Policy | How you collect, use, store, share personal data | Public (on your website) |
| Terms of Service | Rules for using your platform | Public (on your website) |
| Cookie Policy | What cookies you use and why | Public (on your website) |
| Data Processing Agreement (DPA) | Contract between you and B2B customers about data handling | B2B customers sign this |
| Records of Processing Activities (ROPA) | Internal register of all data processing | Regulators (on request) |
| Data Transfer Impact Assessment | Assessment of cross-border data transfers | Internal + regulators |
| Incident Response Plan | What to do in a data breach | Internal |

**Action items:**
- [ ] Find a GDPR-specialized lawyer (or use a service like Termly, iubenda, or Osano for templates as a starting point)
- [ ] Draft Privacy Policy covering all data processing activities (see checklist below)
- [ ] Draft Terms of Service
- [ ] Draft Cookie Policy with specific cookie table
- [ ] Draft DPA template for B2B customers
- [ ] Have lawyer review all documents

**Privacy Policy must include (GDPR Article 13 & 14):**
- [ ] Your identity and contact details (legal entity name, address)
- [ ] DPO contact details
- [ ] Purposes of processing and legal basis for each
- [ ] Categories of personal data collected
- [ ] Recipients or categories of recipients (third parties)
- [ ] International transfer details and safeguards
- [ ] Retention periods for each data category
- [ ] User rights (access, rectification, erasure, restriction, portability, objection)
- [ ] Right to withdraw consent at any time
- [ ] Right to lodge a complaint with supervisory authority
- [ ] Whether providing data is a contractual requirement
- [ ] Existence of automated decision-making/profiling

### Step 4: Register With Your Supervisory Authority

Depending on where your business is established:

- **EU-based:** Register with your local Data Protection Authority (DPA)
  - Ireland: Data Protection Commission (DPC)
  - Germany: State-level Datenschutzbehörde
  - France: CNIL
  - Netherlands: Autoriteit Persoonsgegevens
  - Full list: https://edpb.europa.eu/about-edpb/about-edpb/members_en

- **Non-EU (e.g., US) targeting EU users:** You need an EU Representative under Article 27
  - [ ] Appoint an EU-based representative
  - [ ] Services like DataRep, GDPR-Rep.eu, or Prighter can serve as your EU representative
  - [ ] Cost: typically 100-500 EUR/month
  - [ ] List this representative in your privacy policy

**Action items:**
- [ ] Determine which supervisory authority applies to you
- [ ] Register if required in your jurisdiction
- [ ] If outside EU: appoint EU representative

### Step 5: Sign DPAs With All Your Subprocessors

Every third-party service that processes personal data on your behalf needs a DPA signed.

**Your subprocessors (based on codebase analysis):**

| Service | Data Processed | DPA Status |
|---------|---------------|------------|
| **Convex** | All user data, files, database | [ ] Sign DPA |
| **Vercel** | Application logs, request data | [ ] Sign DPA (usually in their terms) |
| **Stripe** | Payment info, customer IDs, billing | [ ] Sign DPA (Stripe provides one) |
| **PostHog** | Analytics events, user behavior, email | [ ] Sign DPA (PostHog provides one) |
| **Resend** | Email addresses, email content | [ ] Sign DPA |
| **Mux** | Video viewing data, viewer metadata | [ ] Sign DPA |
| **Radar** | Location queries, map interactions | [ ] Sign DPA |
| **OpenRouter** | AI prompts, conversation context | [ ] Sign DPA |
| **ActiveCampaign** | Contact info, marketing preferences | [ ] Sign DPA |
| **Font Awesome** | Page load data (CDN) | [ ] Review privacy terms |

**Action items:**
- [ ] Go to each provider's website and sign/accept their DPA
  - Most major providers (Stripe, PostHog, Vercel) have self-serve DPA signing
  - Some include it in their standard terms
- [ ] Download and store a copy of each signed DPA
- [ ] Create a subprocessor list page/document (required by your DPA with customers)
- [ ] Set up a process to notify customers when you add new subprocessors

### Step 6: Document Your Cross-Border Data Transfers

If you're EU-based but using US services (or vice versa), you need legal mechanisms for data transfers.

**Current data flows:**

| Transfer | Mechanism Needed |
|----------|-----------------|
| EU users -> Convex (US) | Standard Contractual Clauses (SCCs) or Data Privacy Framework (DPF) |
| EU users -> Stripe (US) | Stripe participates in DPF - verify current status |
| EU users -> Resend (US) | SCCs or DPF |
| EU users -> Mux (US) | SCCs or DPF |
| EU users -> OpenRouter (US) | SCCs or DPF |
| EU users -> PostHog (EU) | No mechanism needed (EU to EU) |

**Action items:**
- [ ] Check each provider's DPF certification at https://www.dataprivacyframework.gov/list
- [ ] For providers not in DPF: ensure SCCs are included in their DPA
- [ ] Document all transfers in a Data Transfer Impact Assessment
- [ ] Keep this documentation updated when adding new services

### Step 7: Create Your Records of Processing Activities (ROPA)

Required by Article 30 for most organizations. This is an internal document but must be produced on request by regulators.

**Your processing activities (based on codebase):**

| Activity | Legal Basis | Data Categories | Recipients | Retention |
|----------|-------------|-----------------|------------|-----------|
| User account management | Contract (Art 6.1.b) | Email, name, preferences | Convex | Until account deleted + 14 days |
| Authentication (OAuth) | Contract | Email, OAuth tokens | Google, Microsoft, GitHub, Apple | Session duration |
| Payment processing | Contract | Billing info, Stripe customer ID | Stripe | 10 years (tax law) |
| Email delivery | Contract + Consent | Email addresses, content | Resend | 90 days |
| Analytics | Consent (Art 6.1.a) | Usage events, page views | PostHog (EU) | 26 months |
| AI chat/builder | Contract | Prompts, generated content | OpenRouter | Session-based |
| Video hosting | Contract | Viewing data | Mux | Until content deleted |
| CRM management | Legitimate interest (Art 6.1.f) | Contact info, org data | ActiveCampaign | Until deleted |
| Form submissions | Consent or Contract | Form field data | Convex | Until org deletes |
| Marketing emails | Consent | Email address | Resend, ActiveCampaign | Until unsubscribed |

**Action items:**
- [ ] Formalize this table with your actual retention periods
- [ ] Add your legal entity details, DPO contact
- [ ] Store in a format you can produce quickly if a regulator asks
- [ ] Review and update quarterly

### Step 8: Set Up Your Breach Response Process

GDPR Article 33 requires notifying your supervisory authority within **72 hours** of becoming aware of a breach.

**Create an Incident Response Plan:**

1. **Detection** - Who monitors for breaches? Set up alerts for:
   - Unusual login patterns
   - Bulk data access
   - Unauthorized API key usage
   - Failed authentication spikes

2. **Assessment (within 24 hours):**
   - What data was affected?
   - How many users impacted?
   - What's the risk to individuals?
   - Is the breach ongoing?

3. **Notification (within 72 hours if high risk):**
   - Notify supervisory authority via their online form
   - Include: nature of breach, categories of data, approximate number of users, consequences, measures taken
   - If high risk to individuals: notify affected users directly

4. **Remediation:**
   - Fix the vulnerability
   - Change compromised credentials
   - Document everything
   - Update security measures

**Action items:**
- [ ] Write a 1-page incident response plan
- [ ] Designate an incident response lead
- [ ] Bookmark your supervisory authority's breach notification form
- [ ] Test the process with a tabletop exercise (simulate a breach scenario)

### Step 9: Prepare for Data Subject Requests (DSRs)

Users can exercise their rights at any time. You have **30 days** to respond.

| Right | What They Ask | Your Response |
|-------|--------------|---------------|
| Access (Art 15) | "What data do you have about me?" | Provide the data export (already implemented in compliance window) |
| Rectification (Art 16) | "My name is wrong, fix it" | Update the data, confirm to user |
| Erasure (Art 17) | "Delete my account" | Trigger account deletion (already implemented) |
| Portability (Art 20) | "Give me my data in machine format" | Provide JSON export (already implemented) |
| Restriction (Art 18) | "Stop processing my data but don't delete it" | Freeze the account, stop analytics |
| Objection (Art 21) | "Stop using my data for marketing" | Unsubscribe from marketing, stop analytics |

**Action items:**
- [ ] Create a `privacy@yourdomain.com` inbox for DSR requests
- [ ] Create a simple internal process document: who handles DSRs, how to verify identity, templates for responses
- [ ] Test each right end-to-end (submit a DSR as a test user, verify you can fulfill it within 30 days)

### Step 10: Insurance (Optional but Recommended)

- **Cyber liability insurance** covers costs from data breaches (legal fees, notification costs, regulatory fines)
- **Professional indemnity insurance** covers claims from customers about data handling
- Cost: typically $1,000-5,000/year for a small SaaS

**Action items:**
- [ ] Get quotes for cyber liability insurance
- [ ] Consider errors & omissions (E&O) insurance if serving enterprise customers

---

## PART 2: CODE CHANGES REQUIRED

Your existing plan at `docs/plans/compliance_gdpr/gdpr-compliance.md` is comprehensive. Below is a condensed priority order with the specific files to change.

### Priority 1: Block Tracking Until Consent (Do This First)

**Problem:** PostHog initializes on every page load without asking permission. This is a GDPR violation if you have any EU visitors.

**Files to change:**
- `src/components/providers/posthog-provider.tsx` - Wrap `posthog.init()` in a consent check. Use `posthog.opt_out_capturing()` as the default state. Only call `posthog.opt_in_capturing()` after the user consents.
- New: `src/components/gdpr/cookie-consent-banner.tsx` - Banner component with Accept All / Reject All / Customize
- New: `src/hooks/use-cookie-consent.ts` - Hook to read/write consent state
- `convex/schemas/coreSchemas.ts` - Add `cookieConsent` field to `userPreferences` table
- New: `convex/userPreferences.ts` - Mutations for saving/reading consent

**For anonymous visitors (not logged in):** Store consent in `localStorage` as a fallback until they create an account. Migrate to database on signup.

### Priority 2: Legal Pages

**Files to create:**
- `src/app/privacy/page.tsx` - Privacy policy page
- `src/app/terms/page.tsx` - Terms of service page
- `src/app/cookies/page.tsx` - Cookie policy page

**Content:** Use lawyer-drafted content (see Part 1, Step 3). The code is just a page shell with markdown/text rendering.

**Footer:** Add links to these pages from every page. Update layout or create a footer component if one doesn't exist.

### Priority 3: Consent Tracking

**Files to create/change:**
- New: `convex/schemas/consentSchemas.ts` - `consentRecords` table tracking all consent decisions with timestamps, source, and policy version
- `convex/schema.ts` - Import new schema
- New: `convex/consent.ts` - Mutations for recording, querying, and revoking consent

### Priority 4: Data Retention Automation

**Files to change:**
- `convex/crons.ts` - Add scheduled jobs for:
  - Expired session cleanup (daily)
  - Expired OAuth state cleanup (hourly)
  - Audit log archival after 2 years (weekly)
- `convex/accountManagement.ts` - Enhance deletion to cover all related tables (sessions, preferences, consent records, OAuth connections, API keys, passkeys)

### Priority 5: Breach Notification System

**Files to create:**
- `convex/schemas/securitySchemas.ts` - `dataBreaches` table
- `convex/security/breachNotification.ts` - Breach logging, authority notification, user notification actions
- Email template for breach notification

---

## PART 3: THIRD-PARTY SERVICES CHECKLIST

For each service, you need to complete these actions:

### PostHog (Analytics)
- [x] EU hosting (`eu.i.posthog.com`) - already configured
- [ ] Sign DPA: https://posthog.com/dpa
- [ ] Block initialization until consent (code change)
- [ ] Configure data retention to match your policy
- [ ] Document in privacy policy and cookie policy

### Stripe (Payments)
- [ ] Sign DPA: https://stripe.com/privacy-center/legal#dpa
- [ ] Verify DPF certification
- [ ] Document in privacy policy
- [ ] Note: Stripe is a joint controller for some processing - your privacy policy should reflect this

### Convex (Database)
- [ ] Sign DPA with Convex
- [ ] Confirm data hosting region (US? EU?)
- [ ] If US: ensure SCCs are in the DPA
- [ ] Document in subprocessor list

### Vercel (Hosting)
- [ ] Review Vercel's DPA: https://vercel.com/legal/dpa
- [ ] Confirm deployment region
- [ ] Document in subprocessor list

### Resend (Email)
- [ ] Sign DPA with Resend
- [ ] Confirm data processing location
- [ ] Document in subprocessor list and privacy policy

### Mux (Video)
- [ ] Sign DPA with Mux
- [ ] Document what viewer data is collected
- [ ] Include in privacy policy

### OpenRouter (AI)
- [ ] Review OpenRouter's data handling terms
- [ ] Sign DPA if available
- [ ] Document that AI prompts may contain personal data
- [ ] Include in privacy policy with explanation of AI features

### Radar (Maps)
- [ ] Review Radar's privacy terms
- [ ] Sign DPA if needed
- [ ] Document in subprocessor list

### ActiveCampaign (CRM)
- [ ] Sign DPA: ActiveCampaign provides one
- [ ] Ensure double opt-in for marketing emails
- [ ] Document in privacy policy

### Font Awesome (CDN)
- [ ] Review if FA CDN sets cookies or collects data
- [ ] If yes: include in cookie policy
- [ ] Consider self-hosting to avoid third-party requests

---

## PART 4: ONGOING OBLIGATIONS

GDPR compliance is not a one-time project. These are recurring tasks.

| Task | Frequency | Owner |
|------|-----------|-------|
| Review and update privacy policy | Quarterly or on any data practice change | DPO / Legal |
| Review subprocessor list | Monthly | DPO |
| Process data subject requests (DSRs) | As received (30-day deadline) | Privacy contact |
| Review consent records and opt-in rates | Monthly | Product / DPO |
| Update ROPA | Quarterly | DPO |
| Security incident review | Monthly | Engineering |
| Penetration test | Annually | Engineering / External |
| DPA review with subprocessors | Annually | Legal |
| Staff GDPR awareness training | Annually | DPO |
| Cookie consent audit (verify tracking respects choices) | Quarterly | Engineering |
| Check DPF certifications of US subprocessors | Annually | Legal |

---

## PART 5: COST ESTIMATE

| Item | Cost | Frequency |
|------|------|-----------|
| GDPR lawyer review of documents | 1,500-5,000 EUR | One-time (+ updates) |
| External DPO service (if needed) | 200-800 EUR/month | Monthly |
| EU Representative (if non-EU) | 100-500 EUR/month | Monthly |
| Cookie consent platform (Cookiebot, Osano, etc.) | 0-50 EUR/month | Monthly (or build your own) |
| Cyber liability insurance | 1,000-5,000 EUR/year | Annual |
| Annual penetration test | 3,000-15,000 EUR | Annual |
| **Total first year (estimate)** | **5,000-30,000 EUR** | Depends on company size |

For a small SaaS startup, budget roughly 5,000-10,000 EUR for the first year including legal review, with 2,000-5,000 EUR/year ongoing.

---

## QUICK-START: What to Do This Week

1. **Today:** Add a one-line code change to disable PostHog for EU visitors until you have consent (use `posthog.opt_out_capturing()` as default)
2. **Day 1-2:** Draft privacy policy content (use a template from Termly or iubenda as starting point, customize with your actual data practices)
3. **Day 2-3:** Build and deploy cookie consent banner
4. **Day 3-4:** Create privacy, terms, and cookies pages with your drafted content
5. **Day 5:** Sign DPAs with your main subprocessors (Stripe, PostHog, Convex, Vercel, Resend)
6. **Week 2:** Get a lawyer to review your documents
7. **Week 2:** Set up `privacy@yourdomain.com` and DSR handling process

---

*This plan covers both technical and real-world obligations. The existing implementation plan at `docs/plans/compliance_gdpr/gdpr-compliance.md` should be used as the detailed technical blueprint for all code changes.*
