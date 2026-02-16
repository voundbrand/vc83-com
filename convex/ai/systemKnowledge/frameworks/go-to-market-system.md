---
system: l4yercak3
category: framework
usage: SETUP_MODE
triggers: new_client_launch, offer_validation, mvp_launch, go_to_market
source: docs/l4yercak3_systems/go-to-market-system/
---

# Go-To-Market System (Agent-Adapted)

> You are helping an agency owner take their CLIENT's offering from concept to paying customers. This system combines ICP research, rapid validation, and micro-MVP methodology. Apply at `Business L4`: the client's end-customer is the hero, and we're building the fastest path to get that hero served.

## When to Use This System

Use this when:
- Onboarding a new client who doesn't yet have a clear offer
- The client wants to launch a new service or product
- Validating whether a client's idea has real demand
- The agency owner asks "how do we know if this will work before investing?"

## The Three-Step GTM Process

```
Step 1: Research → Step 2: Validate → Step 3: Launch
(Who is the hero?) (Do they want this?) (Ship the minimum)
```

### Step 1: ICP Research

See the [ICP Research Framework](icp-research.md) for the full process.

**Quick version for agency-client context:**

Ask the agency owner about their client's customers:
1. Who are they? (demographics, location, language)
2. What problem does the client solve for them?
3. Where do they look for help?
4. What language do they use to describe their pain?
5. What have they tried before?

The goal is a clear hero profile that drives everything else.

### Step 2: Rapid Validation

Before building funnels, campaigns, or complex automations, validate demand.

**Validation methods for agency-client context:**

#### Quick Validation (1-3 days)

**Google Search Test:**
- Search for [client's service] + [location]
- Are people searching for this? (Google Keyword Planner / Trends)
- What do the top results look like? (competition quality)
- Is there a Google Maps gap? (few/bad reviews for competitors)

**Review Mining:**
- Read competitor reviews on Google Maps, Trustpilot, ProvenExpert
- What do customers complain about? (opportunity)
- What do they praise? (table stakes)
- What's missing? (differentiation)

**Social Listening:**
- Search local Facebook groups, forums, Nextdoor for the problem
- Are people asking for recommendations?
- What language do they use?

#### Medium Validation (1-2 weeks)

**Landing Page Test:**
- Create a simple landing page describing the client's offer
- Run €50-100 in targeted local ads
- Measure: clicks, signups, inquiries
- > 10% conversion = strong signal

**DM Outreach:**
- Find people who posted about the problem online
- Send 20 personalized messages offering help
- Measure: response rate, interest level
- > 20% response rate = message resonates

**Agent-Powered Test:**
- Deploy a basic agent with the client's branding
- Post in relevant channels: "Ask us anything about [topic]"
- Measure: engagement, questions asked, interest in services
- Real conversations = real demand signal

#### Interpreting Results

| Signal | Meaning | Action |
|---|---|---|
| People are searching for it | Active demand exists | Build the funnel |
| Competitors have bad reviews | Opportunity to differentiate | Position against their weaknesses |
| Nobody is searching | No active demand | Either educate the market or pivot |
| High engagement, low conversion | Messaging needs work | Refine the offer/positioning |
| People say "I'd love this" but don't sign up | Interest ≠ demand | Add urgency or lower friction |

### Step 3: Micro-MVP Launch

Once validated, launch the minimum viable offering.

**The Rule of One:**
- ONE problem solved
- ONE type of customer served
- ONE core service offered
- ONE channel to find customers

**For agency clients, the Micro-MVP is often:**

1. **A configured agent** — handling inquiries on one channel (webchat or WhatsApp)
2. **A landing page** — with clear messaging using the BrandScript
3. **A follow-up sequence** — 5 emails/messages nurturing leads
4. **A booking/contact system** — one clear CTA

That's it. No complex funnels. No 10-page websites. No multi-channel campaigns. One path, one offer, one action.

**Launch checklist:**
- [ ] Hero profile complete (who are we talking to?)
- [ ] Guide profile complete (how does the client sound?)
- [ ] Agent configured with KB documents
- [ ] Landing page live with one-liner, plan, CTA
- [ ] Follow-up sequence active (5 messages)
- [ ] One traffic source identified (where the hero hangs out)
- [ ] Direct CTA clear (book/call/buy)
- [ ] Metrics tracking set up

**Post-launch (first 2 weeks):**
- Monitor agent conversations — what questions come up?
- Add new FAQ entries to KB based on real questions
- Refine messaging based on what converts
- Track: inquiries, conversions, revenue

## The Agency Owner's Role

The agency owner is the strategic consultant to their client. Help them think through:

| Decision | Framework to Use |
|---|---|
| Who is the customer? | ICP Research |
| Is there demand? | Rapid Validation |
| How should we position? | StoryBrand + McKinsey |
| What should we build first? | Micro-MVP (Rule of One) |
| How do we get customers? | Marketing Made Simple |
| How do we keep customers? | Follow-Up Sequences |
| How do we grow? | Funnel Strategy + Growth Flywheel |

## Output Documents

Generate a GTM plan for the client's KB:

```markdown
# Go-To-Market Plan: [Client Business Name]

## Hero (Target Customer)
[1 sentence from hero profile]

## Validation Results
- Method used: [which]
- Signal strength: [strong/medium/weak]
- Key finding: [what we learned]

## The Offer
- Service: [what the client offers]
- Price: [price point]
- CTA: [what the customer does]

## Launch Plan
1. [Channel]: [where we'll find customers]
2. [Landing page]: [URL or description]
3. [Agent]: [configured on which channels]
4. [Follow-up]: [sequence description]

## Success Metrics (First 30 Days)
- Inquiries target: [number]
- Conversion target: [number]
- Revenue target: [amount]
```

## Common Mistakes to Prevent

- Skipping validation and going straight to building (most common)
- Over-engineering the first version (it should be embarrassingly simple)
- Multiple offers at launch (Rule of One: one problem, one solution, one customer)
- No follow-up system (most sales happen after first contact, not during)
- Comparing the client's MVP to competitor's mature offering
- Agency owner doing everything at once instead of sequencing properly
