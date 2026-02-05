# GDPR Real-World Steps (Business & Legal)

These are things no amount of code can solve. You need to do these yourself or with a lawyer.

---

## Step 1: Determine Your Legal Entity & Role

Before anything else, clarify:

- **Are you the Data Controller or Data Processor?**
  - If users sign up directly to your platform and you decide what data to collect: you are the **Controller**
  - If organizations use your platform to manage their customers' data: you are both a **Controller** (for your users) and a **Processor** (for their customers' data)
  - This dual role is common for SaaS platforms and affects your obligations

- **Action items:**
  - [ ] Register your business entity (if not already done)
  - [ ] Determine your legal establishment (which EU country, or if outside EU, which supervisory authority)
  - [ ] Get a registered business address for legal documents

---

## Step 2: Appoint a Data Protection Officer (DPO)

**When required by GDPR Article 37:**
- You process data on a large scale
- You process special categories of data (health, biometrics, etc.)
- You're a public authority

Even if not legally required, having a designated privacy contact is good practice and expected by enterprise customers.

- **Action items:**
  - [ ] Decide if you need a formal DPO (consult a lawyer if unsure)
  - [ ] If yes: appoint someone (internal or external DPO service)
  - [ ] If no: designate a privacy contact person
  - [ ] Create a `privacy@yourdomain.com` email address
  - [ ] Publish DPO/privacy contact in your privacy policy and on your website

**External DPO services** (if you don't want to hire one):
- Privasee, DataGrail, Dataguard, or local GDPR consultancies
- Cost: typically 200-800 EUR/month

---

## Step 3: Get a Lawyer to Draft Your Legal Documents

This is not optional. Template generators are a starting point, but a lawyer familiar with your specific data processing activities should review everything.

**Documents you need:**

| Document | What It Is | Who Sees It |
|----------|-----------|-------------|
| Privacy Policy | How you collect, use, store, share personal data | Public (website) |
| Terms of Service | Rules for using your platform | Public (website) |
| Cookie Policy | What cookies you use and why | Public (website) |
| Data Processing Agreement (DPA) | Contract between you and B2B customers | B2B customers sign this |
| Records of Processing Activities (ROPA) | Internal register of all data processing | Regulators (on request) |
| Data Transfer Impact Assessment | Assessment of cross-border data transfers | Internal + regulators |
| Incident Response Plan | What to do in a data breach | Internal |

**Action items:**
- [ ] Find a GDPR-specialized lawyer (or use Termly, iubenda, or Osano for templates as a starting point)
- [ ] Draft Privacy Policy covering all data processing activities
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

---

## Step 4: Register With Your Supervisory Authority

Depending on where your business is established:

- **EU-based:** Register with your local Data Protection Authority (DPA)
  - Ireland: Data Protection Commission (DPC)
  - Germany: State-level Datenschutzbehorde
  - France: CNIL
  - Netherlands: Autoriteit Persoonsgegevens

- **Non-EU (e.g., US) targeting EU users:** You need an EU Representative under Article 27
  - [ ] Appoint an EU-based representative
  - [ ] Services like DataRep, GDPR-Rep.eu, or Prighter can serve as your EU representative
  - [ ] Cost: typically 100-500 EUR/month
  - [ ] List this representative in your privacy policy

**Action items:**
- [ ] Determine which supervisory authority applies to you
- [ ] Register if required in your jurisdiction
- [ ] If outside EU: appoint EU representative

---

## Step 5: Sign DPAs With All Subprocessors

See `04_SUBPROCESSOR_DPA_CHECKLIST.md` for the full list with links.

---

## Step 6: Document Cross-Border Data Transfers

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
- [ ] Keep documentation updated when adding new services

---

## Step 7: Get Insurance (Optional but Recommended)

- **Cyber liability insurance** covers costs from data breaches (legal fees, notification costs, regulatory fines)
- **Professional indemnity insurance** covers claims from customers about data handling
- Cost: typically 1,000-5,000 EUR/year for a small SaaS

**Action items:**
- [ ] Get quotes for cyber liability insurance
- [ ] Consider errors & omissions (E&O) insurance if serving enterprise customers

---

## Quick-Start: What to Do This Week

1. **Today:** Disable PostHog for EU visitors until consent is built (one code change)
2. **Day 1-2:** Draft privacy policy content (use Termly/iubenda template, customize with your data practices)
3. **Day 2-3:** Build and deploy cookie consent banner
4. **Day 3-4:** Create privacy, terms, and cookies pages
5. **Day 5:** Sign DPAs with main subprocessors (Stripe, PostHog, Convex, Vercel, Resend)
6. **Week 2:** Get a lawyer to review your documents
7. **Week 2:** Set up `privacy@yourdomain.com` and DSR handling process
