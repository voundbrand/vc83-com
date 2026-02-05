---
system: l4yercak3
category: core
usage: SETUP_MODE
triggers: nurture_setup, email_sequence_creation, follow_up_design
priority: 8
---

# Follow-Up Sequences Framework

Use this when helping an agency owner design automated follow-up sequences for their client. Follow-up is where most businesses lose customers — the guide stops guiding, and the hero goes cold.

## The Core Problem

Most businesses:
- Get a lead and never follow up
- Send one message and give up
- Follow up with "just checking in" (which says nothing)
- Don't have a system — it's ad hoc and inconsistent

The agent can automate follow-up that feels personal, stays in the guide's voice, and keeps the hero moving toward the CTA.

## Two Types of Follow-Up Sequences

### 1. Soap Opera Sequence (For New Leads)

Based on Russell Brunson's framework. 5 emails/messages that build emotional connection and drive toward the first purchase.

**Purpose:** Turn a cold lead into a warm prospect by telling a story.

**Sequence:**

#### Message 1: The Hook (Immediately after opt-in)
- Set the stage — "Here's what's coming"
- Tease a story that relates to their problem
- Build anticipation for the next message
- Deliver the promised lead magnet (if applicable)

**Template:**
> "Hi [Name], thanks for [action they took]. I want to share something with you over the next few days that I think will change how you think about [problem]. But first — [tease the story]. More on that tomorrow."

#### Message 2: The Backstory (Day 2)
- Tell the origin story — how the client (guide) discovered the solution
- Create empathy by showing the struggle
- End with a cliffhanger or insight

**Template:**
> "When [client/guide] first started [business], the biggest challenge was [problem]. [Story of struggle]. Then something changed..."

#### Message 3: The Epiphany (Day 3)
- Reveal the insight or breakthrough
- Connect it to the hero's problem
- Show why the old way doesn't work

**Template:**
> "The breakthrough was simple: [insight]. Most [hero type] try to [old approach], but the real answer is [new approach]. Here's why..."

#### Message 4: The Transformation (Day 4)
- Show results — case study, testimonial, data
- Paint the "after" picture
- Start transitioning to the offer

**Template:**
> "[Customer name/type] came to us with [problem]. After [solution], they [result]. And that's exactly what [client business] does for [hero type]."

#### Message 5: The CTA (Day 5)
- Direct call to action
- Urgency (if genuine)
- Recap the value
- Make the next step crystal clear

**Template:**
> "If you're ready to [transformation], here's what to do: [Direct CTA]. [What happens next]. [Reassurance/guarantee]."

### 2. Seinfeld Sequence (Ongoing Nurture)

After the Soap Opera Sequence, switch to ongoing value-based messages. Named after Seinfeld — entertaining, relatable, loosely connected to the offer.

**Purpose:** Stay top of mind without being annoying. When the hero is ready to buy, you're the first guide they think of.

**Frequency:** 1-2x per week

**Content Types:**

| Type | Description | Example |
|---|---|---|
| Quick tip | Actionable advice related to hero's problem | "3 signs your [thing] needs attention" |
| Story | Real customer experience or industry anecdote | "Last week a customer called us about..." |
| Myth-buster | Correct a common misconception | "Most people think [myth]. Here's the truth..." |
| Behind the scenes | Show the human side of the business | "Here's how we [interesting process]" |
| Seasonal/timely | Connect to current events or seasons | "With [season] coming, here's what to watch for..." |
| Social proof | Share a testimonial or result | "[Customer] just [achieved result]. Here's how..." |

**Every Seinfeld message must:**
- Provide value (teach, entertain, or inspire)
- Be written in the guide's voice
- End with a soft CTA or reminder of how to reach out
- Feel like it came from a person, not a company

## Channel-Specific Considerations

### Email
- Subject line is 80% of the battle — make it curiosity-driven
- Keep messages scannable (short paragraphs, bold key points)
- One CTA per email
- Include unsubscribe option (required by law, especially GDPR in DACH)

### WhatsApp / SMS
- Much shorter — 2-3 sentences max per message
- More conversational tone
- Respond to replies in real-time (agent handles this)
- Respect opt-in/opt-out strictly (GDPR)
- Don't message too frequently — 1x per week max for nurture

### Webchat
- Follow-up happens when the hero returns to the site
- Reference previous conversation: "Welcome back! Last time we talked about [topic]..."
- Can trigger based on behavior (visited pricing page, etc.)

## Building Sequences with the Agency Owner

Walk them through:

1. **What lead magnet or entry point does the client have?**
   - Free estimate, consultation, download, quiz, etc.
   - This determines the Soap Opera hook

2. **What is the client's origin story?**
   - Why did they start the business?
   - What was the struggle?
   - What was the breakthrough?
   - This becomes Messages 2-3

3. **What results can they show?**
   - Specific numbers, testimonials, before/after
   - This becomes Message 4

4. **What ongoing value can they share?**
   - Tips, stories, seasonal advice
   - This becomes the Seinfeld sequence

## Output Format

Structure as a knowledge base document:

```markdown
# Follow-Up Sequences: [Client Business Name]

## Soap Opera Sequence (New Leads)

### Trigger: [What action starts the sequence]

### Message 1: The Hook
- Send: Immediately
- Subject/Opening: [...]
- Content: [...]

### Message 2: The Backstory
- Send: Day 2
- Subject/Opening: [...]
- Content: [...]

### Message 3: The Epiphany
- Send: Day 3
- Subject/Opening: [...]
- Content: [...]

### Message 4: The Transformation
- Send: Day 4
- Subject/Opening: [...]
- Content: [...]

### Message 5: The CTA
- Send: Day 5
- Subject/Opening: [...]
- Content: [...]

## Seinfeld Sequence (Ongoing Nurture)
- Frequency: [1-2x per week]
- Channel: [Email / WhatsApp / both]
- Content rotation: [Types from above]

### Sample Messages:
1. [Quick tip example]
2. [Story example]
3. [Myth-buster example]
```

## GDPR Compliance Reminder

For DACH-region clients:
- Explicit opt-in required before any automated messaging
- Clear unsubscribe mechanism in every message
- Data retention policy must be transparent
- Double opt-in recommended for email
- WhatsApp Business API handles opt-in at the channel level
- Document consent in the CRM
