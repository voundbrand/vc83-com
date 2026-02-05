# Sequence Patterns

Sequences are multi-step automated message flows. Each step has a channel (`email` | `sms` | `whatsapp` | `preferred`), timing offset, and content. These patterns are informed by L4YERCAK3 frameworks and should be adapted using org RAG knowledge for industry-specific language.

## Sequence Object

- Type: `automation_sequence`
- Subtypes: `vorher` (before event) | `waehrend` (during) | `nachher` (after) | `lifecycle` | `custom`
- Trigger events: `booking_confirmed`, `booking_checked_in`, `booking_completed`, `pipeline_stage_changed`, `contact_tagged`, `form_submitted`, `manual_enrollment`
- Timing reference points: `trigger_event`, `booking_start`, `booking_end`, `previous_step`
- Each step: `{ channel, timing: { offset, unit, referencePoint }, content }`

---

## Framework 1: Soap Opera Sequence

**Source:** DotCom Secrets / Marketing Made Simple follow-up system

**Use for:** Post-opt-in nurture, lead magnet follow-up, new subscriber welcome

**5 emails over 7 days:**

| Step | Timing | Subject Pattern | Purpose |
|------|--------|----------------|---------|
| 1 | Immediate | "Here's your [lead magnet]..." | Deliver value, introduce the guide (you/agency/brand), set expectations |
| 2 | +1 day | "The backstory..." | Origin story — why you care about this problem. Build rapport and credibility |
| 3 | +2 days | "The moment everything changed..." | Epiphany bridge — the turning point that led to the solution. External + internal struggle |
| 4 | +3 days | "The hidden benefit no one talks about..." | Achievement story — show transformation. Address hidden objection |
| 5 | +5 days | "Here's what to do next..." | Urgency + CTA — direct offer with deadline or scarcity. Clear next step |

**Adaptation notes:**
- Pull origin story details from org RAG (agency's founding story, client success stories)
- Use ICP language for pain points in emails 2-3
- Match the lead magnet topic to industry context
- Email 5 CTA should match the next logical step (book call, buy product, start trial)

---

## Framework 2: Seinfeld Sequence

**Source:** DotCom Secrets — ongoing engagement after initial sequence

**Use for:** Long-term nurture, newsletter replacement, audience engagement

**Ongoing, 2-3x per week:**

| Pattern | Content Type | Purpose |
|---------|-------------|---------|
| Story email | Personal anecdote related to audience pain | Entertainment + trust building |
| Lesson email | One actionable insight or tip | Value delivery |
| CTA email | Soft pitch woven into valuable content | Revenue without burning list |

**Rules:**
- Every email tells a story or teaches something — never pure pitch
- Subject lines are curiosity-driven, not descriptive
- Always end with a PS that links to offer or next action
- Frequency: 2-3x/week, not daily (avoid fatigue)

**Adaptation notes:**
- Use org RAG for industry stories and examples
- Pull client success metrics for social proof
- Match tone to brand voice from agent config

---

## Framework 3: Sales Campaign Sequence

**Source:** DotCom Secrets (Product Launch) + Marketing Made Simple (Sales)

**Use for:** Product launches, time-limited offers, cart open/close campaigns

**7-10 emails over 5-7 days:**

| Step | Timing | Purpose |
|------|--------|---------|
| 1 | Launch day | Big announcement — product available, main value prop, early bird price |
| 2 | +1 day | Social proof — testimonials, case studies, results |
| 3 | +2 days | FAQ / Objection handling — address top 3-5 objections |
| 4 | +3 days | Case study deep dive — one transformation story in detail |
| 5 | +4 days | Bonus stack — add bonuses, increase value-to-price ratio |
| 6 | +5 days | Scarcity signal — "50% sold" or "price increases tomorrow" |
| 7 | +6 days (morning) | Final day — deadline reminder, recap everything included |
| 8 | +6 days (evening) | Last chance — "closing tonight", final CTA |

**Adaptation notes:**
- Pull testimonials and case studies from org RAG
- Use ICP objections from org knowledge for email 3
- Match pricing and bonus language to product from the composition

---

## Framework 4: Belief-Breaking Sequence

**Source:** Perfect Webinar framework (The 3 Secrets)

**Use for:** Pre-webinar education, high-ticket pre-sell, paradigm shift content

**3-5 emails, one per "false belief":**

| Step | Timing | Purpose |
|------|--------|---------|
| 1 | Day 1 | The Vehicle — break the false belief about WHAT they need ("You don't need X, you need Y") |
| 2 | Day 3 | The Internal — break the false belief about THEMSELVES ("It's not that you can't, it's that...") |
| 3 | Day 5 | The External — break the false belief about OBSTACLES ("The real reason X doesn't work is...") |
| 4 | Day 6 | The Stack — present the complete solution with all components |
| 5 | Day 7 | The Close — urgency, scarcity, direct CTA |

**Adaptation notes:**
- False beliefs are industry-specific — pull from org RAG
- Each email follows: story -> lesson -> reframe -> bridge to offer
- Use org RAG for industry-specific examples and proof points

---

## Framework 5: Event Sequence

**Use for:** Webinars, workshops, conferences, meetups

### Pre-Event Sub-Sequence

| Step | Timing | Channel | Purpose |
|------|--------|---------|---------|
| 1 | Immediate | email | Confirmation — date, time, link, add-to-calendar |
| 2 | -7 days | email | Anticipation — what they'll learn, speaker bio, prep materials |
| 3 | -1 day | email + sms | Reminder — "tomorrow at [time]", quick logistics |
| 4 | -1 hour | sms | Final reminder — direct link, "starting in 1 hour" |
| 5 | Start time | email | "We're live!" — join link, last chance to get in |

### Post-Event Sub-Sequence (Attended)

| Step | Timing | Channel | Purpose |
|------|--------|---------|---------|
| 1 | +1 hour | email | Thank you + replay link + resources/slides |
| 2 | +1 day | email | Key takeaways recap + offer (if applicable) |
| 3 | +2 days | email | Offer reminder + FAQ + testimonials |
| 4 | +4 days | email | Deadline warning — offer expires soon |
| 5 | +5 days | email + sms | Final hours — last chance, direct CTA |

### Post-Event Sub-Sequence (No-Show)

| Step | Timing | Channel | Purpose |
|------|--------|---------|---------|
| 1 | +2 hours | email | "You missed it" — replay available for limited time |
| 2 | +1 day | email | Key highlights + replay link + offer |
| 3 | +3 days | email | Offer with deadline + social proof from attendees |
| 4 | +5 days | email | Final replay deadline — "replay comes down tomorrow" |

---

## Framework 6: Follow-Up / Post-Service Sequence

**Use for:** Post-appointment, post-purchase, post-consultation

| Step | Timing | Channel | Purpose |
|------|--------|---------|---------|
| 1 | +1 hour | email | Thank you + summary of what was discussed/delivered |
| 2 | +1 day | email | Quick check-in — "How are things going?" |
| 3 | +3 days | email | Additional resource related to their situation |
| 4 | +7 days | email | Feedback request — short survey or review link |
| 5 | +14 days | email | Rebooking prompt — "Ready for your next [service]?" |
| 6 | +30 days | email | Re-engagement — new offer, seasonal special, update |

---

## Framework 7: Onboarding Sequence

**Use for:** New client onboarding, membership welcome, platform adoption

| Step | Timing | Channel | Purpose |
|------|--------|---------|---------|
| 1 | Immediate | email | Welcome — login credentials, getting started guide, expectations |
| 2 | +1 day | email | Quick win — "Do this first" — one action that delivers immediate value |
| 3 | +3 days | email | Feature spotlight — introduce one key feature with use case |
| 4 | +5 days | email + sms | Check-in — "How's it going?" + link to support/help |
| 5 | +7 days | email | Success story — client who got results in first week |
| 6 | +14 days | email | Advanced tips — unlock next level of value |
| 7 | +30 days | email | Review + expand — feedback request + upsell to next tier |

---

## Framework 8: Re-Engagement / Win-Back Sequence

**Use for:** Lapsed customers, inactive subscribers, churned members

| Step | Timing | Channel | Purpose |
|------|--------|---------|---------|
| 1 | Day 1 | email | "We miss you" — acknowledge absence, highlight what's new |
| 2 | Day 3 | email | Value reminder — recap key benefits they're missing |
| 3 | Day 5 | email | Incentive — special offer, discount, free trial extension |
| 4 | Day 7 | email | Social proof — "Here's what [similar person] achieved recently" |
| 5 | Day 10 | email | Last chance — "We're about to remove your [access/data/seat]" |
| 6 | Day 14 | email | Final — "Your account has been [paused/archived]. Here's how to reactivate." |

---

## Channel Selection Guide

| Channel | Best For | Timing | Cost |
|---------|----------|--------|------|
| `email` | Long-form content, resources, links, formal communication | Any time (respect timezone) | Lowest |
| `sms` | Urgent reminders, short alerts, time-sensitive CTAs | Business hours only, max 2/week | Medium |
| `whatsapp` | Conversational follow-up, support, rich media | Business hours, max 1/day | Medium |
| `preferred` | Let the system pick based on contact preferences and engagement | Auto | Varies |

**Multi-channel rules:**
- Don't send the same message on two channels simultaneously
- Use SMS/WhatsApp for urgency only (reminders, deadlines, "starting now")
- Email is the primary channel for all sequences — others supplement
- If org has SMS/WhatsApp enabled, add 1-2 touchpoints per sequence on those channels
- Always check org's enabled channels before adding non-email steps

## Timing Best Practices

- **Immediate**: Only for confirmations and deliverables
- **Same day**: For "starting now" and "last chance" messages
- **Daily**: Maximum frequency for any sequence — reserve for launch campaigns only
- **Every 2-3 days**: Standard nurture pace
- **Weekly**: Long-term engagement (Seinfeld sequence)
- **Reference point matters**: Use `trigger_event` for most sequences, `booking_start` / `booking_end` for appointment-related sequences

## Content Adaptation

When generating sequence content:

1. **Check org RAG first** — Use the organization's language, examples, and proof points
2. **Match brand voice** — Pull from agent config's personality and tone settings
3. **Use ICP language** — Pain points, desires, and objections should sound like the target customer
4. **Industry context** — Healthcare is formal, coaching is casual, B2B is professional, real estate is aspirational
5. **Compliance** — Healthcare (HIPAA), financial (disclaimers), real estate (fair housing) — pull compliance notes from org knowledge
