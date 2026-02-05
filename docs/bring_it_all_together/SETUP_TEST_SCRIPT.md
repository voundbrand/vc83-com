# Setup Mode Test Script — Plumber Niche

> **Scenario:** You're an agency owner onboarding your client Schmidt Sanitär, a plumber in Munich. You want the AI to create an agent that handles inbound leads via WhatsApp and webchat.
>
> **How to run:** Open Builder → switch to Setup mode (Bot icon in sidebar) → paste each prompt in sequence. Wait for the AI to respond and generate files before sending the next one.

---

## Prompt 1 — Kick off

```
Set up an AI agent for my client. They're a plumber in Munich called Schmidt Sanitär. They do emergency repairs (burst pipes, blocked drains, heating failures) and planned maintenance (boiler servicing, bathroom renovations). Two-man operation, been running for 12 years.
```

**What to check:** AI should ask follow-up questions about the customer (the homeowner), not jump straight to config. Should start generating `kb/hero-profile.md` or at least outline who the hero is.

---

## Prompt 2 — The customer (Hero)

```
Their typical customer is a homeowner in Munich, 35-55, dual income household. When something breaks they're stressed because they don't know who to trust — they've been burned by overpriced handymen before. They want someone who shows up on time, gives a clear price upfront, and doesn't try to upsell unnecessary work. For planned maintenance they're usually renovating a bathroom or getting the boiler serviced before winter.
```

**What to check:** AI should generate or update `kb/hero-profile.md` with the three problem levels (external: pipe broken, internal: stress/distrust, philosophical: "a home should just work"). Should move on to guide positioning.

---

## Prompt 3 — The brand (Guide)

```
Schmidt Sanitär should come across as the reliable neighbor who happens to be a master plumber. Professional but not corporate. They use "du" not "Sie" — casual Munich style. Key trust signals: Meisterbetrieb (master craftsman certified), 12 years in Munich, over 2000 jobs completed, 4.9 stars on Google with 340 reviews. They always give a fixed price before starting work.
```

**What to check:** `kb/guide-profile.md` should be generated with empathy + authority positioning. The `agent-config.json` should start forming with personality, language ("de"), brandVoiceInstructions.

---

## Prompt 4 — Services & pricing

```
Their services and rough pricing:

Emergency callout: €89 base fee + hourly rate €95/hr, available 7am-10pm
Drain unblocking: €149-€299 depending on severity
Pipe repair: €199-€599
Heating repair: €149-€449
Boiler service (annual): €189
Bathroom renovation: starts at €4,500, average job €8,000-€12,000

They service all of Munich and surrounding areas within 30km. Response time for emergencies: usually within 60 minutes.
```

**What to check:** `kb/products-services.md` should list all services with pricing. `agent-config.json` should have FAQ entries about pricing. The AI should ask about the customer journey next.

---

## Prompt 5 — The plan (customer journey)

```
The process for emergency customers:
1. Customer describes the problem (via WhatsApp, phone, or webchat)
2. Schmidt confirms availability and gives a price estimate within 15 minutes
3. Technician arrives, fixes the issue, customer pays on-site (card or invoice)

For renovations:
1. Customer describes what they want
2. Free on-site consultation within 3 days
3. Written quote within 48 hours
4. Work scheduled, completed, 2-year warranty on all work

The main CTA should be "Termin vereinbaren" (book appointment) for planned work and "Notdienst anfordern" (request emergency service) for urgent issues.
```

**What to check:** `kb/plan-and-cta.md` should have both journeys. `agent-config.json` should have the CTAs. AI should move to FAQ/objections next.

---

## Prompt 6 — FAQ & objections

```
Common questions they get:
- "Was kostet ein Notdiensteinsatz?" (emergency callout cost) — €89 base + €95/hr, always a fixed quote before we start
- "Wie schnell können Sie kommen?" (how fast) — Usually within 60 minutes in Munich
- "Arbeiten Sie auch am Wochenende?" (weekends) — Emergency service 7 days, planned work Mon-Fri
- "Gibt es eine Garantie?" (warranty) — 2 years on all work
- "Kann ich auch per Rechnung zahlen?" (invoice payment) — Yes, for jobs over €500

Main objections:
- "Das ist zu teuer" (too expensive) — We give fixed prices upfront, no surprises. Compare our Google reviews — quality costs less than calling someone twice.
- "Ich hab schon jemanden" (I already have someone) — Great, keep our number for emergencies. We're available when others aren't.
- "Können Sie erst nächste Woche?" (can you come next week) — For non-urgent jobs we can schedule flexibly. For emergencies we prioritize same-day.
```

**What to check:** `kb/faq.md` should have 10+ entries (AI should expand beyond what you gave). `kb/objection-handling.md` should be generated with the three objections plus AI-inferred ones.

---

## Prompt 7 — Business info & hours

```
Business details:
- Schmidt Sanitär GmbH
- Lindwurmstraße 42, 80337 München
- Tel: 089 1234567
- WhatsApp: +49 171 1234567
- Email: info@schmidt-sanitaer.de
- Website: schmidt-sanitaer.de
- Hours: Mon-Fri 7:00-18:00, Emergency service 7:00-22:00 daily
- Owner: Thomas Schmidt, Sanitärmeister
```

**What to check:** `kb/business-info.md` generated. `agent-config.json` should be nearly complete now.

---

## Prompt 8 — Channels & autonomy

```
Enable WhatsApp and webchat. The agent should be in supervised mode — it can answer questions and collect info, but any booking confirmations or price quotes need Thomas's approval first. The agent should hand off to Thomas if the customer asks for something outside the service list or if they seem angry.
```

**What to check:** `agent-config.json` should have `channelBindings` with WhatsApp + webchat enabled, `autonomyLevel: "supervised"`, `requireApprovalFor` including bookings/quotes, and handoff rules.

---

## Prompt 9 — Success stories (optional)

```
A couple of testimonials they have:

"Rohrbruch am Sonntagabend, Schmidt war in 40 Minuten da. Alles repariert, fairer Preis. Absolut empfehlenswert!" — Maria K., Google Review

"Badezimmer komplett renoviert, alles im Budget und pünktlich fertig. Sehr saubere Arbeit." — Stefan W., Google Review

"Die einzigen Handwerker die wirklich pünktlich sind. Seit 3 Jahren mein Stammklempner." — Petra H., Google Review
```

**What to check:** `kb/success-stories.md` generated with the testimonials.

---

## Prompt 10 — Review & finalize

```
Looks good. Can you show me a summary of everything you've generated?
```

**What to check:** AI should summarize: agent name, personality, channels, autonomy level, list all 9 files generated. Should suggest switching to Connect mode to create the agent.

---

## After the conversation

1. **Check file explorer** — should show `agent-config.json` + 8 files in `kb/`
2. **Switch to Connect mode** — should detect the agent config and KB docs automatically
3. **Click Connect All** — should create agent + save KB docs to media library
4. **Check agent config window** — new agent should appear with status "draft", all fields populated

---

## What to watch for (common issues)

| Issue | What it means |
|-------|--------------|
| AI generates page JSON instead of files | Setup prompt not injected — check `isSetupMode` is true |
| AI doesn't ask structured questions | Knowledge frameworks not loaded — check console for "Injected X knowledge docs" |
| Files don't appear in explorer | v0 not returning files — check v0 API response in console |
| Connect step doesn't detect agent | `agent-config.json` missing required fields (need `name` + at least one of: `systemPrompt`, `autonomyLevel`, `channelBindings`, `faqEntries`, `enabledTools`, `subtype`) |
| KB docs not saved | `createLayerCakeDocument` mutation failing — check console for errors |
