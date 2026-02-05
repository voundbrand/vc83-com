# Product Recommendations

ICP-driven product requirements for l4yercak3 — the AI agent platform that agencies white-label to SMB clients. Primary market: DACH. Secondary: English-speaking.

---

## Core Platform Requirements (Must-Have for Launch)

### 1. White-Label Client Portals

- Each agency client gets their own branded portal (agency's logo, colors, domain)
- Client dashboard showing: active conversations, appointment bookings, analytics, AI agent status
- Conversation logs with full history
- Knowledge base management (client uploads their own FAQs, menus, service lists)

**Why:** This IS the product. The "frontend gap" is the #1 pain point for agencies who can build AI but can't deliver it professionally.

### 2. Multi-Tenant Architecture

- Agency manages all clients from one admin dashboard
- Each client is isolated (data, branding, configuration)
- Agency controls pricing tiers (e.g., Bronze/Silver/Gold)
- Agency sees revenue dashboard across all clients

**Why:** Agencies default to "white-label and resell" model. They need to manage 10-50+ client accounts.

### 3. WhatsApp Business API Integration

- First-class, native integration (not a third-party connector)
- Support for: automated responses, appointment booking, lead qualification, FAQ handling
- Template message management and approval workflow
- 24-hour customer service window compliance
- Multi-number support (one per client)

**Why:** WhatsApp is THE channel in DACH. "GHL doesn't have WhatsApp. In Germany that's a dealbreaker."

### 4. AI Agent Configuration (No-Code)

- Per-client AI agent configuration
- Knowledge base training (upload docs, FAQs, menus)
- Personality/tone customization ("sound like the business owner")
- Conversation flow builder for common scenarios (booking, lead qualification, FAQ)
- Multi-language support (German, English minimum)

**Why:** Agency owners are not developers. "I'm a marketing professional, not a software engineer." Configure, don't code.

### 5. Pre-Built Agent Templates by Vertical

- **Home Services** (plumber, HVAC, electrician): missed call capture, job quoting, scheduling
- **Salons/Beauty:** appointment booking, no-show reminders, product recommendations
- **Restaurants:** reservation management, catering inquiries, menu FAQ
- **Dental/Medical:** appointment scheduling, insurance questions, post-visit follow-up
- **Real Estate:** lead qualification, property FAQ, viewing scheduling
- **Professional Services:** client intake, consultation booking, document collection

**Why:** "I deployed an AI agent for a cleaning company in 30 minutes and charged 500 EUR." Templates are the profit inflection point.

### 6. GDPR/DSGVO Compliance by Design

- EU data hosting (Frankfurt preferred)
- AVV/DPA (Auftragsverarbeitungsvertrag) ready and downloadable
- Sub-processor list transparent
- Data export and deletion capabilities (Right to erasure)
- Double opt-in consent management
- Data minimization built into defaults

**Why:** "#1 topic in every DACH agency discussion." Dealbreaker if missing.

### 7. Unified Inbox

- All channels in one view: WhatsApp, Instagram DM, web chat, email, SMS
- Per-client inbox (agency sees all, client sees their own)
- AI-assisted responses with human handoff
- Conversation tagging and categorization

**Why:** "I have messages in Google, Facebook, Instagram, WhatsApp, AND my website. It's insane." / "I need ONE inbox. Not seven."

---

## High-Priority Features (Ship Within First Quarter)

### 8. Instagram DM Automation

- Comment-triggered DM flows ("Comment [keyword] to get [lead magnet]")
- Story reply automations
- Lead qualification via DM sequences
- GDPR-compliant opt-in flows

**Why:** "Instagram DM automation is literally the best lead gen strategy right now." ManyChat dominates but has GDPR concerns in DACH.

### 9. Automated Booking System

- Self-service booking via AI agent
- Calendar integration (Google Calendar, Outlook)
- Automated confirmation and reminder messages (WhatsApp + email)
- No-show reduction via automated reminders
- Waitlist management

**Why:** "It takes 3-4 texts back and forth just to book a haircut." / "No-shows are killing me. 20% don't show up."

### 10. Analytics and ROI Dashboard

- Per-client: conversations handled, leads captured, appointments booked, response time
- Per-agency: total clients, MRR, retention, aggregate metrics
- ROI calculator: missed leads captured x average job value = revenue saved
- Exportable reports (agencies send to clients as proof of value)

**Why:** "Companies don't care about 'AI' -- they care about ROI." / "'This saved us 15 hours weekly' beats 'This uses GPT-4 with vector database retrieval' every time."

### 11. Review Request Automation

- Post-service automatic review request via WhatsApp/SMS/email
- Smart routing: satisfied --> Google review link; unsatisfied --> private feedback
- Review monitoring dashboard

**Why:** "If someone could automatically ask for a review after every job, that alone would be worth 200 EUR/month."

### 12. Lead Nurture Sequences

- Automated follow-up for unconverted leads
- Drip campaigns via WhatsApp/email
- Re-engagement triggers (time-based, event-based)

**Why:** "I give a quote and then I just... wait." / "200 people who inquired but never booked."

---

## Future Roadmap Features

### 13. Voice Agent / AI Phone Answering

- AI answers phone calls for SMB clients
- Captures caller info, qualifies leads, books appointments
- Transfers to human for complex cases

**Why:** Voice agents are the current premium niche (5,000-7,250 EUR per deployment). Home services segment will pay 200-500 EUR/month.

### 14. EUR Pricing with SEPA Support

- EUR pricing (not USD converted)
- MwSt/VAT clearly shown on invoices
- SEPA direct debit for recurring payments
- Proper German invoicing (Pflichtangaben)

**Why:** "Credit cards alone are insufficient" in DACH. SEPA is expected.

### 15. German-Language Templates and Defaults

- All agent templates available in German
- German greeting/closing patterns
- Swiss German and Austrian German variants
- DACH-specific compliance defaults

**Why:** "Most tools are in English. My clients are tradespeople and dentists -- they don't speak English."

### 16. Agency Marketplace / Template Store

- Agencies share/sell agent templates to other agencies
- l4yercak3 takes a cut (marketplace economics)
- Vertical-specific template packs

**Why:** Creates network effects and reduces churn. Agencies invest in the ecosystem.

---

## Pricing Model Recommendation

Based on research findings.

### Agency Pricing (What agencies pay l4yercak3)

| Tier | Monthly | Client Seats | Features |
|------|---------|-------------|----------|
| Starter | 49 EUR/mo | Up to 5 clients | Core features, 1 WhatsApp number |
| Growth | 149 EUR/mo | Up to 20 clients | + Instagram DM, booking, templates |
| Scale | 349 EUR/mo | Up to 50 clients | + Voice agents, priority support, custom branding |
| Enterprise | Custom | Unlimited | + API access, custom integrations, dedicated support |

### Key Pricing Principles

1. **Agencies set their own client pricing** -- full control (this is expected and non-negotiable)
2. **No per-client fee to l4yercak3** -- agencies hate being penalized for growth
3. **Usage-based AI costs transparent** -- API costs passed through at cost or small markup
4. **Annual billing discount** -- DACH agencies prefer annual for "Planungssicherheit"
5. **Free tier available** -- DACH agencies try free tools first; conversion from free is expected

### What Agencies Charge Their Clients (Recommended Range)

| Package | Monthly | What's Included |
|---------|---------|----------------|
| Basic | 99-199 EUR/mo | AI agent on 1 channel, basic FAQ, appointment booking |
| Professional | 199-349 EUR/mo | Multi-channel (WhatsApp + IG + web), lead nurture, analytics |
| Premium | 349-499 EUR/mo | All channels + voice agent, review automation, priority support |

Agency margin: 60-80% (after platform + API costs).

---

## Competitive Positioning Matrix

| Feature | l4yercak3 | GoHighLevel | DashLynk | Voiceflow | ManyChat |
|---------|-----------|-------------|----------|-----------|----------|
| White-label client portals | Yes (core) | Partial | Yes (core) | No | No |
| WhatsApp Business API | Yes (native) | Weak | No | No | No |
| Instagram DM automation | Yes | No | No | No | Yes (core) |
| AI agent per client | Yes (core) | Basic chatbot | Yes (n8n-dependent) | Yes | Rule-based only |
| Multi-tenant architecture | Yes | Yes | Yes | No | No |
| EU hosting / GDPR by design | Yes | No (US-based) | Unknown | No | No |
| German language support | Yes | No | No | No | No |
| Pre-built vertical templates | Yes | No | No | No | Partial |
| Unified inbox | Yes | Yes | Yes | No | No |
| Voice agent | Roadmap | No | No | No | No |
| Booking system | Yes | Yes | No | No | No |
| Analytics / ROI dashboard | Yes | Yes | Yes | Partial | Partial |
