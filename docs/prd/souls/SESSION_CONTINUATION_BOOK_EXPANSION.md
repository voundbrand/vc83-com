# Session Continuation Prompt — Book of 100 AI Agents Deep-Dive Sprint

Copy everything below the line into a new Claude Code chat to resume.

---

## Context

We're building "The Book of 100 AI Agents" — a lead magnet for Seven Layers (sevenlayers.io). The book lives at:

```
docs/strategy/cash-is-king/The Book of 100 AI Agents/
```

The book has 5 sections across 21 markdown files (~5,000 lines total). The front-of-book **"21 Things That Disappear"** section was just expanded to full visceral depth — 2,300+ lines of Before/After storytelling with specific names, dollar amounts, emotions, Math tables, and What Disappeared lists. That section is the emotional anchor of the book. **It's done. Don't touch it.**

## What's Done

| Section | File(s) | Lines | Status |
|---|---|---|---|
| Cover | `00-front-matter/00-cover.md` | 39 | ✅ Done |
| Table of Contents | `00-front-matter/01-table-of-contents.md` | 227 | ✅ Done |
| Introduction | `00-front-matter/02-introduction.md` | 119 | ✅ Done |
| 21 Things That Disappear | `00-front-matter/03-twenty-things-that-disappear.md` | 2,315 | ✅ Done — full depth, all 21 scenarios |
| Core Specialists Overview | `01-the-six-core-specialists/00-overview.md` | 77 | ✅ Done |
| The Closer (#1) | `01-the-six-core-specialists/01-the-closer.md` | 79 | **Needs expansion** |
| The Strategist (#2) | `01-the-six-core-specialists/02-the-strategist.md` | 79 | **Needs expansion** |
| The Copywriter (#3) | `01-the-six-core-specialists/03-the-copywriter.md` | 77 | **Needs expansion** |
| The Operator (#4) | `01-the-six-core-specialists/04-the-operator.md` | 81 | **Needs expansion** |
| The CFO (#5) | `01-the-six-core-specialists/05-the-cfo.md` | 79 | **Needs expansion** |
| The Coach (#6) | `01-the-six-core-specialists/06-the-coach.md` | 85 | **Needs expansion** |
| Legal Agents | `02-industry-agents/01-legal/agents.md` | 265 | **Needs hero agent expansion** |
| Finance Agents | `02-industry-agents/02-finance/agents.md` | 265 | **Needs hero agent expansion** |
| Health/Medical Agents | `02-industry-agents/03-health-medical/agents.md` | 265 | **Needs hero agent expansion** |
| Coaching/Consulting Agents | `02-industry-agents/04-coaching-consulting/agents.md` | 265 | **Needs hero agent expansion** |
| Agencies Agents | `02-industry-agents/05-agencies/agents.md` | 265 | **Needs hero agent expansion** |
| Trades/Construction Agents | `02-industry-agents/06-trades-construction/agents.md` | 265 | **Needs hero agent expansion** |
| E-Commerce/Retail Agents | `02-industry-agents/07-ecommerce-retail/agents.md` | 265 | **Needs hero agent expansion** |
| Soul-Binding Difference | `03-the-soul-binding-difference/01-soul-binding.md` | 123 | **Needs expansion** |
| Self-Assessment Quiz | `04-self-assessment/01-quiz.md` | 166 | ✅ Done (all 5 parts + scoring) |
| Next Steps / CTA | `05-next-steps/01-next-steps.md` | 99 | ✅ Done |

## What Needs Expanding — Three Workstreams

### Workstream 1: Core Specialists (Priority — Do First)

The 6 Core Specialist files are currently 79-85 lines each. They have good content — Identity tables, Core Capabilities, one Example Conversation, Best For, Impact Estimates, and Signature Frameworks. But they read like **reference cards**, not stories.

After the gut-punch of the 21 Things section, the reader turns the page and hits a table. The tone shift is jarring. These need a narrative layer.

**What each Core Specialist file currently has:**
- Identity table (soul blend, personality, voice)
- Core Capabilities table (5 capabilities)
- Example Conversation (generic Q&A format — "You: We're a B2B SaaS company..." / "The Closer: Let me be direct...")
- Best For table
- Impact Estimate table
- Signature Frameworks table

**What each needs added (insert BEFORE the Example Conversation):**

#### A. "See It In Action" — Real-World Scenario

A vivid Before/After mini-story (30-50 lines) showing the agent working for a REAL small business owner. Not a generic B2B SaaS company — a specific person with a specific problem.

Use the same voice and format as the 21 Things scenarios:
- **Before:** Tell a story. Specific names, dollar amounts, emotions. The reader should recognize themselves.
- **After:** Show the agent's actual outputs in blockquotes. Walk through the timeline.
- **The Math:** Before/After comparison table.

Match the agent to its natural habitat:

| Agent | Scenario Setting | Suggested Story |
|---|---|---|
| **The Closer** | A contractor loses a $52K deal because his proposal had no guarantee and one flat price. The Closer rebuilds his offer with the Value Equation and 3-tier pricing. Next proposal closes same week. |
| **The Strategist** | A consultant has been in business 5 years and still can't explain what she does in one sentence. Prospects go "hmm" and never call back. The Strategist runs her through StoryBrand and builds a one-liner that converts. |
| **The Copywriter** | An e-commerce brand spends $8K/month on ads driving traffic to a landing page with a 1.2% conversion rate. The Copywriter rewrites the page using Hook/Story/Offer. Conversion goes to 4.8%. Same ad spend, 4x revenue. |
| **The Operator** | A 12-person agency owner works 65-hour weeks. Key account manager quits, takes 3 clients. The Operator builds SOPs, delegation frameworks, and client retention systems. (NOTE: the current Example Conversation already covers this scenario — weave the narrative version AROUND the existing Q&A, don't duplicate it.) |
| **The CFO** | A trades company is at $2.1M revenue but the owner can't tell you his profit margin on any service line. He prices by gut feel. The CFO runs a unit economics audit and discovers his most popular service is losing money on every job. |
| **The Coach** | A founder at $4M/year feels hollow and dreads Mondays. Thinks about selling. The Coach helps her realize she needs a role redesign, not an exit. (NOTE: same as current Example Conversation — weave narrative around it.) |

#### B. Keep the Existing Content

Don't remove or rewrite any existing content. The Identity tables, Capabilities, Example Conversations, Frameworks — all stay. The narrative section gets **inserted before** the Example Conversation as a new `### See It In Action` section.

**Target: expand each file from ~80 lines to ~150-180 lines.**

### Workstream 2: Industry Hero Agents (Do Second)

Each industry chapter has 14 agents at ~18 lines each. Every agent has: Role, Built On, Key Behaviors, Best For, Hours Saved, Revenue Influence, Tier, and one Example paragraph (3-4 sentences).

**Don't expand all 14.** Pick the **top 3 "hero" agents** per vertical — the ones most likely to make a reader say "I need THAT." Expand those 3 to full depth with Before/After storytelling, agent messages in blockquotes, and a Math table. Leave the other 11 as-is.

**Hero agent selection criteria:**
1. Highest revenue influence
2. Most emotionally resonant pain point
3. Best demonstration of soul-binding value (memory, context, evolution)

**Suggested hero agents per vertical:**

| Vertical | Hero Agent 1 | Hero Agent 2 | Hero Agent 3 |
|---|---|---|---|
| **Legal** | #7 Client Intake Specialist | #12 Billing Coordinator | #18 Client Retention Advisor |
| **Finance** | #21 Portfolio Narrator | #22 Risk Sentinel | #34 (Client Retention) |
| **Health/Medical** | #35 Patient Liaison | #37 Wellness Coach | #48 (Practice Growth) |
| **Coaching/Consulting** | #49 Discovery Call | #55 Accountability | #62 (Testimonial Collector) |
| **Agencies** | #63 Client Success Manager | #64 Proposal Engineer | #76 (Retention) |
| **Trades/Construction** | #77 Quote Follow-Up | #78 Job Scheduler | #90 (Payment Collector) |
| **E-Commerce/Retail** | #91 Cart Recovery | #92 Product Recommender | #104 (Retention) |

**For each hero agent, expand the Example section from 3-4 sentences to 30-50 lines:**
1. Name the business owner and the specific situation
2. Show the Before (what they're doing manually, what it costs)
3. Show the After (agent messages in blockquotes, timeline)
4. Add a quick Math line (X hours saved, $Y recovered)

**Target: expand each chapter from ~265 lines to ~400-450 lines.**

### Workstream 3: Soul-Binding Deep Dive (Do Third)

The Soul-Binding section (123 lines) is structurally complete but reads like a product spec, not a story. It needs the same narrative treatment as the rest of the book.

**Current structure (keep all of it):**
- The Problem With AI Today (comparison table)
- What Is Soul-Binding (3 layers)
- Layer 1: Persistent Identity
- Layer 2: Contextual Memory
- Layer 3: Soul Evolution
- The Seven Layers Stack
- Why Businesses Don't Switch Back

**What to add:**

#### A. Extended Case Study (insert after "Layer 3: Soul Evolution")

A **6-month narrative** showing one agent evolving with one business. Pick The Closer working with a trades company. Show:

- **Week 1:** Agent asks basic questions, uses industry templates, makes a minor mistake the owner corrects
- **Month 1:** Agent has learned the owner's pricing, voice, and top objections. Handles 60% of follow-ups autonomously.
- **Month 3:** Agent notices a pattern — quotes sent on Tuesdays close 40% better than Fridays. Recommends rescheduling the quote pipeline. Revenue bump.
- **Month 6:** Agent has full institutional knowledge. Owner goes on a 2-week vacation. Agent handles 14 quote follow-ups, 3 objection conversations, and 1 escalation. Owner comes back to $28K in closed deals he didn't touch.

Show the actual agent messages at each stage — Week 1 should sound competent but generic. Month 6 should sound like a trusted business partner who knows everything.

**Target: 60-80 lines.**

#### B. ChatGPT Side-by-Side (insert after the Extended Case Study)

Show the SAME business owner asking the SAME question to ChatGPT vs. their soul-bound agent. Make the contrast visceral:

- ChatGPT: generic advice, no context, starts from zero
- Soul-bound agent: references specific clients by name, uses the owner's pricing, remembers last week's conversation, makes a specific recommendation based on 3 months of data

**Target: 30-40 lines.**

#### C. Expand "Why Businesses Don't Switch Back" (replace existing table)

The current version is a 4-row table with one-sentence quotes. Expand to 3 mini-testimonials (5-8 lines each) with specific numbers, timeframes, and the "aha moment" when they realized the agent was different.

**Target: 30-40 lines.**

**Total Soul-Binding target: expand from 123 lines to ~280-320 lines.**

## How To Work

1. **Read the 21 Things file first** — especially scenarios #1, #3, and #9. Those set the voice and depth standard for everything.
2. **Workstream 1 first** (Core Specialists). Do all 6 in order: Closer, Strategist, Copywriter, Operator, CFO, Coach.
3. **Workstream 2 second** (Industry Hero Agents). Do 2-3 verticals per turn.
4. **Workstream 3 third** (Soul-Binding expansion).
5. For each expansion: read the existing content, then **add new sections in place** — don't rewrite what's already there.
6. Use the same heading structure as the rest of the book.

## Voice & Tone

- Same voice as the 21 Things section: second person ("you"), present tense, conversational
- Specific > general. "$52,000 Park Avenue deal" not "a large commercial project"
- Agent messages in blockquotes should sound warm, competent, and specific — not robotic
- Emotions matter in the Before sections: frustration, guilt, anxiety, exhaustion
- The After sections should feel like relief: weight lifting, clarity arriving, time returning
- Business owners think in numbers — always include specific dollar amounts, hours, percentages
- The 21 Things set the bar. Match it.

## Estimated Scope

| Workstream | Items | Lines Added | Sessions |
|---|---|---|---|
| WS1: Core Specialists | 6 files | ~420-600 lines | 1-2 turns |
| WS2: Industry Heroes | 7 chapters × 3 agents | ~630-1,050 lines | 2-3 turns |
| WS3: Soul-Binding | 1 file | ~160-200 lines | 1 turn |
| **Total** | | **~1,200-1,850 lines** | **4-6 turns** |

## Start

Read the full 21 Things file first for voice calibration:
```
docs/strategy/cash-is-king/The Book of 100 AI Agents/00-front-matter/03-twenty-things-that-disappear.md
```

Then read The Closer:
```
docs/strategy/cash-is-king/The Book of 100 AI Agents/01-the-six-core-specialists/01-the-closer.md
```

Then begin with **Workstream 1, Agent #1 — The Closer**. Add the "See It In Action" narrative section before the Example Conversation. Then move through all 6 Core Specialists.
