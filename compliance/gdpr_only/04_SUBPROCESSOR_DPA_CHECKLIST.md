# Subprocessor DPA Signing Checklist

Every third-party service that processes personal data on your behalf needs a signed DPA. Go through each one and check it off.

---

## Instructions

1. Visit each provider's DPA page
2. Sign or accept the DPA (most are self-serve)
3. Download a copy for your records
4. Store in a shared folder (e.g., `legal/signed-dpas/`)
5. Record the date signed

---

## Checklist

### Convex (Database & Backend)
- **Data processed:** All user data, files, database records
- **Hosted:** US
- **DPA:** Contact Convex support or check their legal page
- **Transfer mechanism needed:** SCCs or DPF
- [ ] DPA signed
- [ ] Date: ___________
- [ ] Transfer mechanism confirmed

### Vercel (Hosting)
- **Data processed:** Application logs, request data, deployment metadata
- **Hosted:** US/EU (depends on region config)
- **DPA:** https://vercel.com/legal/dpa
- **Transfer mechanism needed:** SCCs (included in DPA)
- [ ] DPA signed
- [ ] Date: ___________
- [ ] Deployment region confirmed: ___________

### Stripe (Payments)
- **Data processed:** Customer IDs, billing info, subscription status, payment methods
- **Hosted:** US/EU
- **DPA:** https://stripe.com/privacy-center/legal#dpa
- **Transfer mechanism:** DPF certified - verify at dataprivacyframework.gov
- **Note:** Stripe is a joint controller for some processing
- [ ] DPA signed
- [ ] Date: ___________
- [ ] DPF certification verified

### PostHog (Analytics)
- **Data processed:** Page views, user events, email (via identify), behavior tracking
- **Hosted:** EU (`eu.i.posthog.com`)
- **DPA:** https://posthog.com/dpa
- **Transfer mechanism:** Not needed (EU to EU)
- [ ] DPA signed
- [ ] Date: ___________
- [ ] Data retention configured to match your policy

### Resend (Email Delivery)
- **Data processed:** Email addresses, email content, delivery metadata
- **Hosted:** US
- **DPA:** Check Resend's legal/privacy page
- **Transfer mechanism needed:** SCCs or DPF
- [ ] DPA signed
- [ ] Date: ___________
- [ ] Transfer mechanism confirmed

### Mux (Video Hosting)
- **Data processed:** Video content, viewing data, viewer metadata
- **Hosted:** US
- **DPA:** Check Mux's legal page
- **Transfer mechanism needed:** SCCs or DPF
- [ ] DPA signed
- [ ] Date: ___________
- [ ] Transfer mechanism confirmed

### Radar (Maps)
- **Data processed:** Location queries, map interactions
- **Hosted:** US
- **DPA:** Check Radar's legal page
- **Transfer mechanism needed:** SCCs or DPF
- [ ] DPA signed
- [ ] Date: ___________

### OpenRouter (AI)
- **Data processed:** AI prompts, conversation context (may contain user data)
- **Hosted:** US
- **DPA:** Check OpenRouter's terms
- **Transfer mechanism needed:** SCCs or DPF
- **Note:** Document that AI prompts may contain personal data
- [ ] DPA signed
- [ ] Date: ___________
- [ ] Data retention/deletion policy confirmed

### ActiveCampaign (CRM)
- **Data processed:** Contact info, email addresses, marketing preferences, subscribe/unsubscribe status
- **Hosted:** US
- **DPA:** ActiveCampaign provides a DPA through their platform
- **Transfer mechanism needed:** SCCs or DPF
- [ ] DPA signed
- [ ] Date: ___________

### Font Awesome (CDN)
- **Data processed:** Page load data, IP addresses (CDN logs)
- **Hosted:** US
- **DPA:** Review Font Awesome privacy terms
- **Alternative:** Self-host Font Awesome to avoid third-party requests entirely
- [ ] DPA signed OR self-hosting implemented
- [ ] Date: ___________

---

## After Signing All DPAs

- [ ] Create a public subprocessor list page on your website
- [ ] Include: service name, purpose, location, link to their privacy policy
- [ ] Set up a process to notify B2B customers 30 days before adding new subprocessors
- [ ] Store all signed DPAs in a secure, accessible location
- [ ] Set calendar reminder to review DPAs annually
