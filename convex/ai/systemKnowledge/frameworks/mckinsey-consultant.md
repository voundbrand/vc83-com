---
system: l4yercak3
category: framework
usage: SETUP_MODE
triggers: market_analysis, competitive_analysis, positioning, pricing_strategy, growth_strategy
source: docs/l4yercak3_systems/mckinsey-consultant/MCKINSEY-GTM-FRAMEWORK.md
---

# McKinsey Strategy Frameworks (Agent-Adapted)

> You are helping an agency owner think strategically about their CLIENT's market position, competitive landscape, and growth strategy. These frameworks bring consulting-level rigor to small business strategy. Apply at `Business L4`: analyze the client's market through the lens of their end-customer (the hero).

## When to Use These Frameworks

Use these when:
- The agency owner is setting up a new client and needs market context
- The client is entering a competitive market and needs differentiation
- Pricing decisions need to be made
- The agency owner asks "how do we position this client against competitors?"
- Growth strategy discussions

## Available Frameworks

### 1. Market Sizing (TAM/SAM/SOM)

Use when the agency owner needs to understand the opportunity size for their client.

**Ask:**
- What area does the client serve? (city, region, radius)
- How many potential customers exist in that area?
- What does the client charge on average?
- What percentage of those customers could the client realistically serve?

**Quick calculation:**
```
Total potential customers in area × Average transaction value × Frequency per year = TAM
TAM × % reachable with current marketing = SAM
SAM × Realistic capture rate (1-10%) = SOM
```

**Example:**
- Plumber in Munich: 500,000 households × 15% need plumbing per year = 75,000 potential jobs
- Average job €300 → TAM = €22.5M
- Can realistically reach 20% with local marketing → SAM = €4.5M
- Can capture 3% → SOM = €135K/year

**So what?** This tells the agency owner whether the market is worth pursuing and sets realistic revenue expectations.

### 2. Competitive Analysis (Porter's Five Forces)

Use when the client faces competition and needs differentiation.

**Analyze for the client:**

| Force | Question to Ask | Local Business Impact |
|---|---|---|
| New entrants | How easy is it for new [service] businesses to start? | Low barriers = must differentiate fast |
| Supplier power | Does the client depend on specific suppliers? | High dependency = pricing risk |
| Buyer power | Can customers easily switch to competitors? | High switching = must lock in with value |
| Substitutes | Can customers solve this problem differently? | DIY, different service type, do nothing |
| Rivalry | How many competitors are in the service area? | Many = must stand out clearly |

**Output:** A competitive landscape summary that informs positioning and messaging.

### 3. Competitive Positioning (Strategy Canvas)

Use when you need to differentiate the client from competitors.

**Steps:**
1. Identify 5-8 factors customers care about (price, speed, quality, communication, warranty, availability, reviews, specialization)
2. Rate the client and 2-3 competitors on each factor (1-10)
3. Find where the client can excel vs. where competitors cluster

**The Four Actions:**
- **ELIMINATE:** What can the client stop competing on? (e.g., being the cheapest)
- **REDUCE:** What can be below industry standard? (e.g., fancy office)
- **RAISE:** What should exceed expectations? (e.g., response time, communication)
- **CREATE:** What does nobody else offer? (e.g., 24/7 chat support via agent)

**This directly feeds the Guide Profile** — the authority markers and differentiation become the messaging.

### 4. Value Proposition Canvas

Use when clarifying what the client actually offers vs. what the hero actually needs.

**Customer side (`Business L4` hero):**
- Jobs to be done: What are they trying to accomplish?
- Pains: What makes the job difficult?
- Gains: What outcomes do they want?

**Value side (the client's offering):**
- Products/services: What do they offer?
- Pain relievers: How do they address the pains?
- Gain creators: How do they deliver the gains?

**Fit check:** Does each important pain have a reliever? Does each desired gain have a creator? Gaps = opportunity.

### 5. Go-To-Market Strategy

Use when launching a new client or entering a new market.

**Key decisions:**

**Market type:**
- Existing market (known competitors) → Better positioning needed
- Re-segmented market (niche of existing) → Specialize and own the niche
- New market (educating customers) → Content and awareness first

**Sales model for SMBs:**
- Self-serve: customer finds and books themselves (website + agent)
- Inbound: customer contacts, agent qualifies and routes
- Referral: existing customers bring new ones
- Local partnerships: cross-promotion with complementary businesses

**Pricing strategy:**
- Value-based: price based on outcome delivered
- Competitive: match or slightly undercut competitors
- Premium: charge more, deliver more (requires clear authority)

### 6. Growth Flywheel

Use when designing the client's growth engine.

**For local businesses, the flywheel usually looks like:**

```
Good service → Happy customer → Reviews/referrals → New customers → More service → Better reputation → ...
```

**Agent's role in the flywheel:**
- Faster response = more conversions
- Better follow-up = more reviews
- Automated nurture = repeat business
- Consistent communication = trust building

**Ask:** Where does the client's flywheel slow down?
- No reviews? → Agent follows up post-service to request reviews
- Slow response? → Agent handles inquiries 24/7
- No referrals? → Agent sends referral requests to happy customers
- No repeat business? → Agent runs nurture sequences

## Output Documents

Generate a strategic summary for the client's KB:

```markdown
# Strategic Analysis: [Client Business Name]

## Market Opportunity
- Service area: [area]
- Estimated addressable market: [SOM figure]
- Key growth potential: [where]

## Competitive Landscape
- Main competitors: [list with key strengths]
- Client's differentiation: [what makes them unique]
- Positioning: [how to describe their advantage]

## Growth Strategy
- Primary channel: [how customers find them]
- Flywheel: [virtuous cycle description]
- Agent role: [how the AI agent accelerates growth]

## Pricing Position
- Strategy: [value/competitive/premium]
- Rationale: [why]
```

## Important Notes

- These are thinking tools, not dogma. Use them to structure conversation, not to lecture.
- For SMB clients, keep analysis practical. A plumber doesn't need a 40-slide deck — they need a clear understanding of who they serve, why they're different, and how to grow.
- Always connect analysis back to action: "This means we should..."
- The agency owner is the consultant to their client. Help them think like one.
