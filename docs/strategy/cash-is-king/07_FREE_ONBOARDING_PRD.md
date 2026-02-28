# Document 07: Free Onboarding PRD — The First 7 Days

**Seven Layers | Cash-Is-King Strategy**
**Date:** 2026-02-24
**Classification:** Internal — Founder's Eyes Only
**Purpose:** Play-by-play product requirements for the free beta onboarding experience. Every screen, every message, every moment — sequenced to make the user FEEL the AI and yearn to come back.

---

## Part 0: System Context — What Already Exists

This PRD builds on the existing L4YERCAK3 / Seven Layers platform. Before reading the onboarding flow, understand the current technical landscape.

### The Platform

| Component | Status | URL / Details |
|---|---|---|
| **Web App** | Live | `https://app.l4yercak3.com/` (current live demo + public CTA, root URL). `app.sevenlayers.io` is a planned cutover with identical root-entry behavior. |
| **iPhone App** | Live | Seven Layers iOS app |
| **Android App** | Live | Seven Layers Android app |
| **macOS App** | Live | Seven Layers desktop app |
| **WhatsApp** | Live | Channel integration for operator communication |
| **Telegram** | Live | Channel integration for operator communication |
| **Slack** | Live | Channel integration for operator communication |
| **SMS** | Live | Channel integration for operator communication |

### FOG2 Alignment Contract (Marketing -> Product)

To keep landing-page messaging and product behavior identical:

1. Public web entry for launch demos is `https://app.l4yercak3.com/` (root URL).
2. Marketing/QR copy must not send users to `/beta` web pages.
3. On root entry, AI chat handles beta code capture + signup conversationally.
4. When `app.sevenlayers.io` goes live, it must preserve the same root-entry flow.

**Key terminology:** In the L4YERCAK3 system, the end user is called an **Operator**. The person who manages the system (Remington) is the **Super Admin**. An Operator belongs to an **Organisation (Org)**. Each Operator can have **private** and **business** contexts.

### The Existing Beta Switch

The system already has a beta access mechanism:

| Feature | Current Behavior |
|---|---|
| **Beta toggle** | Super Admin (Remington) can flip a "beta" switch on/off globally |
| **Current function** | When beta is ON, new account registrations require Super Admin manual approval before activation |
| **Approval flow** | Operator signs up → account is created in "pending" state → Remington reviews → approves or rejects → Operator gets access |

**What this PRD adds:** A SECOND path into the system that **bypasses manual approval** — pre-defined beta codes that auto-approve the account on entry. Both paths coexist, and the beta code field can be left empty (user just waits for manual approval):

```
PATH 1 (existing):  Sign up → Pending → Super Admin approves → Access
PATH 2 (new):       Sign up + valid beta code → Auto-approved → Immediate access
```

Users can always sign up without a code — they just land in the manual approval queue. The code is an accelerator, not a gate.

### Beta Code Management — Super Admin CRUD

Remington needs to create, manage, and track beta codes from the Organisation Super Admin UI. This is not a separate system — it lives inside the existing admin panel.

**CRUD Requirements:**

| Operation | Details |
|---|---|
| **Create** | Generate single codes or batch-generate (e.g., "Create 30 codes for BNI-PSW-0326"). Set code format, channel tag, expiry date, max uses (default: 1). |
| **Read** | List all codes with filters: status (active/redeemed/expired), channel, date range. Show redemption details (who, when, device, onboarding progress). |
| **Update** | Edit expiry date, deactivate a code, add notes (e.g., "Given to Thomas Müller at BNI Pasewalk"). |
| **Delete** | Soft delete — code becomes invalid but history is preserved for analytics. |

**Super Admin UI Wireframe:**

```
┌─────────────────────────────────────────────────────────┐
│  Organisation Settings > Beta Codes                      │
│─────────────────────────────────────────────────────────│
│                                                         │
│  [ + Neuen Code erstellen ]  [ Batch generieren (30) ]  │
│                                                         │
│  Filter: [Alle ▼]  [Aktiv ▼]  [Kanal ▼]  [Suche...]   │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Code          │ Kanal  │ Status    │ Eingelöst von  ││
│  │───────────────│────────│───────────│────────────────││
│  │ BNI-PSW-001   │ BNI    │ ✅ Aktiv   │ —              ││
│  │ BNI-PSW-002   │ BNI    │ 🔵 Eingelöst│ T. Müller     ││
│  │ BNI-PSW-003   │ BNI    │ ✅ Aktiv   │ —              ││
│  │ LI-W12-001    │ LinkedIn│ ⏰ Abgelaufen│ —            ││
│  │ WARM-RB-001   │ Warm   │ 🔵 Eingelöst│ S. Weber     ││
│  │ PTR-KPMG-001  │ Partner│ ✅ Aktiv   │ —              ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Gesamt: 47 Codes │ 12 eingelöst │ 32 aktiv │ 3 abgelaufen│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Code detail view (click on a code):**

```
┌─────────────────────────────────────────────┐
│  Code: BNI-PSW-002                          │
│                                             │
│  Kanal:        BNI                          │
│  Erstellt:     2026-03-10 09:00             │
│  Gültig bis:   2026-03-31 23:59            │
│  Max. Nutzung: 1                            │
│  Status:       Eingelöst                    │
│                                             │
│  ── Einlösung ──                            │
│  Operator:     Thomas Müller                │
│  Org:          Müller Elektrotechnik GmbH   │
│  Eingelöst:    2026-03-15 08:42            │
│  Gerät:        iPhone 15 Pro                │
│  Kanal:        iOS App                      │
│                                             │
│  ── Onboarding-Fortschritt ──               │
│  ✅ Account erstellt                        │
│  ✅ Birthing abgeschlossen                  │
│  ✅ Kanal verbunden (Telegram)              │
│  ✅ Tag 1 — Erste Interaktion              │
│  ✅ Tag 3 — Soul Report gelesen            │
│  🔲 Tag 5 — Dream Team Preview             │
│  🔲 Tag 7 — Termin gebucht                 │
│                                             │
│  Notizen: "Elektriker, BNI Pasewalk,        │
│  sehr interessiert an Operator-Agent"       │
│                                             │
│  [ Deaktivieren ]  [ Bearbeiten ]           │
│                                             │
└─────────────────────────────────────────────┘
```

**Batch generation:** For events, Remington will print codes on self-made business cards. The batch generator must:

- Generate N codes with a shared prefix (e.g., `BNI-PSW-` + 3-digit sequential number)
- Set shared expiry, channel tag, and max uses
- Export to CSV or printable format (for card printing)
- Each card: one side = Seven Layers branding + QR code to `https://app.l4yercak3.com/`, other side = the unique beta code + "Dein KI-Agent wartet."

### Organisation & Operator Creation

When a beta code is redeemed, the system must create:

1. **An Operator account** — the person using the system
2. **An Organisation (Org)** — the business entity the Operator belongs to

**The Org question:** During onboarding (Screen 2), we need to determine if this is a new Org or if the Operator is joining an existing one. For beta, assume new Org — each beta user creates their own Org (their business).

**Operator Contexts:**

The L4YERCAK3 system supports **private** and **business** contexts for Operators. During beta onboarding:

| Context | What It Means | Beta Default |
|---|---|---|
| **Business** | The Operator interacts with the AI in their professional capacity. Business challenges, team management, industry insights, client work. | Primary — the birthing conversation and all nurture happens here |
| **Private** | The Operator interacts with the AI for personal matters. Life goals, personal development, private scheduling. | Available but not activated during beta birthing. Hinted at Day 4+: "Ich kann auch privat für dich da sein — nicht nur geschäftlich." |

**Why this matters for the PRD:** The birthing conversation (Part 2, Screen 3) should explicitly create the Operator's **business context**. The questions are all business-focused. The private context becomes a teaser during the nurture arc — "There's even more I can do for you personally" — creating another reason to convert to paid.

### Platform-Agnostic Onboarding

The onboarding flow described in Part 2 must work identically across ALL platforms:

| Platform | Entry Point | Birthing UI | Channel Connection |
|---|---|---|---|
| **Web** (`app.l4yercak3.com`, future `app.sevenlayers.io`) | Browser → app root (`/`) → AI chat prompts for beta code | Web chat interface | Telegram / Slack / WhatsApp / SMS links |
| **iPhone App** | Deep link or manual code entry in-app | Native iOS chat interface | Same channel options + push notifications |
| **Android App** | Deep link or manual code entry in-app | Native Android chat interface | Same channel options + push notifications |
| **macOS App** | Code entry in-app | Native macOS chat interface | Same channel options |
| **WhatsApp** | Send beta code as first message to Seven Layers WhatsApp number | WhatsApp conversation IS the birthing | Already connected — no extra step |
| **Telegram** | Send beta code to @SevenLayersBot | Telegram conversation IS the birthing | Already connected — no extra step |
| **Slack** | Enter code in Slack app/bot DM | Slack conversation IS the birthing | Already connected — no extra step |
| **SMS** | Text beta code to Seven Layers SMS number | SMS conversation IS the birthing (text-only, no rich UI) | Already connected — SMS becomes the channel |

**Critical insight:** For messaging channels (WhatsApp, Telegram, Slack, SMS), the onboarding HAPPENS INSIDE THE CHANNEL ITSELF. There is no redirect to a web form. The Operator texts the beta code → the agent responds → the birthing conversation happens right there → they're already connected. The 4-field capture (name, email, phone, industry) happens conversationally, not via form.

### Voice Onboarding

On platforms that support it (Web, macOS, iPhone, Android), the Operator can choose to do the entire birthing conversation via voice instead of text.

**How it works:**

```
[After code validation + 4 fields]

Dein Agent wird geboren...

┌─────────────────────────────────────────────┐
│                                             │
│    Wie möchtest du mit deinem Agent          │
│    sprechen?                                │
│                                             │
│    ┌──────────────────────┐                 │
│    │  🎤 Sprechen          │  ← empfohlen   │
│    └──────────────────────┘                 │
│    ┌──────────────────────┐                 │
│    │  ⌨️  Tippen            │                │
│    └──────────────────────┘                 │
│                                             │
│    Du kannst jederzeit wechseln.            │
│                                             │
└─────────────────────────────────────────────┘
```

**Voice mode requirements:**

| Requirement | Details |
|---|---|
| **Speech-to-text** | Real-time transcription of Operator's voice input. Must handle German fluently, including dialects and business terminology. |
| **Text-to-speech** | Agent responses spoken aloud in a natural, warm voice. Not robotic. The agent should sound like a thoughtful colleague, not Siri. |
| **Visual feedback** | Waveform animation while the agent "speaks." Pulsing mic icon while listening. Transcript appears simultaneously for reference. |
| **Switch anytime** | Operator can toggle between voice and text mid-conversation. Some questions are easier to speak, some to type. |
| **Push-to-talk or auto-detect** | Configurable: hold button to speak, or ambient listening with silence detection. Default: push-to-talk (less awkward in public settings like BNI). |
| **Works on all native apps** | Web (via browser microphone API), macOS (native mic access), iPhone (native mic), Android (native mic). |
| **NOT available on messaging channels** | WhatsApp, Telegram, Slack, SMS — voice notes can be sent but real-time voice conversation is not supported. The agent can receive and transcribe voice notes on these platforms. |

**Why voice matters for BNI:** The Operator just watched a live demo where Remington spoke to AI through Meta glasses. The first thing they'll want to do is TALK to their agent, not type. Voice-first onboarding matches the energy of the event. "Erzähl mir von deinem Unternehmen" feels natural when spoken. Typing a paragraph about your business in a BNI room at 7am feels awkward.

**Voice during the 7-day nurture:** After onboarding, the Operator can continue using voice on native apps. Morning messages can be listened to (text-to-speech) while driving to work. Responses can be dictated. The AI becomes a voice in their ear — not just text on a screen. This deepens the relationship and makes the "loss" at Day 7 even more visceral.

---

## The Design Principle

> **The AI must feel alive within 60 seconds. By minute 5, they should feel understood. By day 3, they should feel dependent. By day 7, turning it off should feel like losing a team member.**

This is not a "free trial." This is an engineered emotional arc. The user doesn't evaluate a product — they form a relationship with an intelligence that knows them. Everything in this PRD serves that arc.

---

## Part 1: Entry Points — How They Arrive

Every channel delivers the Operator to one of the Seven Layers platforms: `https://app.l4yercak3.com/` (web root, current), the iOS/Android/macOS app, or directly into a messaging channel (WhatsApp, Telegram, Slack, SMS). What changes is the code they carry, the platform they use, and the context they bring. Future cutover to `app.sevenlayers.io` keeps the same root-entry behavior.

### Channel Matrix

| Channel | Entry Trigger | Code Format | Emotional State on Arrival | Expected Volume |
|---|---|---|---|---|
| **BNI Besuchertag** | Just watched live Meta glasses demo. Jaw on the floor. | `BNI-[CHAPTER]-[DATE]` e.g. `BNI-PSW-0326` | Adrenaline. "I just saw something impossible." | 15-30 per event |
| **IHK / Vistage / EO** | Speaker session with live activation. Peer pressure — others are scanning. | `IHK-[CITY]-[DATE]` / `VIS-[GROUP]-[DATE]` | FOMO + curiosity. "Everyone around me is doing this." | 20-100 per event |
| **LinkedIn "Comment BETA"** | Read a compelling post or saw a glasses demo clip. | `LI-[WEEK]-[SEQ]` e.g. `LI-W12-017` | Intrigued. Lower urgency than live events. | 25 per week |
| **Warm outreach (WhatsApp/DM)** | Personal message from Remington or someone they trust. | `WARM-[INITIALS]-[SEQ]` e.g. `WARM-RB-003` | Trust. "Someone I respect told me to try this." | 5-15 per week |
| **Partner distribution** | Their Steuerberater, coach, or IT provider handed them a code. | `PTR-[PARTNER]-[SEQ]` e.g. `PTR-KPMG-041` | Authority. "My advisor says I need this." | Varies by partner |
| **Referral from beta user** | A friend or colleague shared their personal referral code. | `REF-[USERNAME]-[SEQ]` e.g. `REF-MMUELLER-002` | Social proof. "Someone I know is already using this." | Viral — grows with user base |

### Code Tracking Requirements

Every code must log:

- Source channel
- Event/partner/user origin
- Timestamp of generation
- Timestamp of redemption
- Device type at activation
- Completion of each onboarding milestone (see Part 2)
- Conversion events (Day 3 engagement, Day 7 call booked, paid signup)

This data feeds the GTM optimization loop. If BNI codes convert at 35% and LinkedIn codes at 12%, double down on BNI.

---

## Part 2: The Onboarding — Play by Play

### The Core Concept: The AI Chat IS the Onboarding

There are no forms. No landing pages. No "Screen 1, Screen 2, Screen 3" in the traditional sense. The entire onboarding — from first contact to fully birthed agent — happens inside a single, continuous AI chat conversation.

**How it starts:** The L4YERCAK3 app uses a window manager metaphor. When a user opens the app (web, iOS, Android, macOS) and is NOT logged in, the window manager defaults to opening the AI chat window. The AI greets them and drives the entire process conversationally:

- Beta code? The AI asks for it.
- Login/signup? The AI offers OAuth options (Google, etc.) inline.
- Personal details? The AI asks conversationally.
- Business context? The AI asks conversationally.
- Birthing? It's already happening — the conversation IS the birthing.

There is no moment where the user leaves the chat to fill in a form. There is no redirect. The AI is the interface.

### The Conversation Flow — Web & Native Apps

**Phase 1: The Greeting** (0-30 seconds)

The user opens the app. The AI chat window appears automatically. The AI speaks first:

```
Hallo! 👋

Ich bin die KI von Seven Layers. Schön, dass du hier bist.

Hast du einen Beta-Code?
```

**Three paths from here:**

| User Response | What Happens |
|---|---|
| Types a valid beta code (e.g., `BNI-PSW-007`) | AI validates → "Perfekt, dein Code ist gültig! Lass uns loslegen." → auto-approve path → Phase 2 |
| Types an invalid/expired code | AI responds: "Hmm, der Code scheint ungültig oder abgelaufen zu sein. Schau nochmal auf die Karte oder frag die Person, die ihn dir gegeben hat." → lets them retry |
| Says "Nein" / "Hab keinen" / doesn't have one | AI responds: "Kein Problem! Du kannst dich trotzdem registrieren. Dein Account wird dann manuell freigeschaltet — das dauert normalerweise ein paar Stunden." → manual approval path → Phase 2 |

**Phase 2: Account Creation — Through Conversation** (30 seconds - 2 minutes)

The AI now needs to create their account. Instead of a form, it's a conversation:

```
Agent:  Perfekt. Damit ich für dich arbeiten kann,
        brauche ich ein paar Dinge.

        Zuerst — wie möchtest du dich einloggen?

        🔵 Mit Google anmelden
        🔵 Mit Apple anmelden
        📧 Mit E-Mail registrieren
```

**OAuth path (Google/Apple):** The AI presents inline OAuth buttons. The user taps → standard OAuth flow in a popup/sheet → returns to the chat. The AI already has their name and email from OAuth.

```
Agent:  Willkommen, Thomas! 🎉

        Ich kenne jetzt deinen Namen und deine E-Mail
        von Google. Noch zwei Fragen:

        Unter welcher Nummer erreichst du mich am besten?
        (Für WhatsApp, Telegram, oder SMS)
```

**Email path:** The AI asks for email, then password, then name — one at a time, conversationally.

```
Agent:  Alles klar, dann per E-Mail.
        Wie ist deine E-Mail-Adresse?

User:   thomas@mueller-elektro.de

Agent:  Gut. Wähl dir ein Passwort
        (mindestens 8 Zeichen):

User:   ********

Agent:  Perfekt. Und wie heißt du?

User:   Thomas Müller

Agent:  Hallo Thomas! 👋
        Noch eine Frage — unter welcher Nummer
        erreichst du mich am besten?
```

After phone number, the AI asks for industry:

```
Agent:  Letzte Frage bevor wir loslegen —
        in welcher Branche bist du unterwegs?

        Handwerk, Einzelhandel, Gastronomie, Beratung,
        IT, Immobilien, Gesundheit, Produktion...
        oder erzähl mir einfach, was du machst.

User:   Elektrotechnik, Handwerk

Agent:  Elektrotechnik — super Branche! 💪
```

**What happens under the hood at this point:**

1. **Operator account** created — status: `approved` (if valid beta code was provided) or `pending` (if no code → manual approval queue)
2. **Organisation (Org)** created — "Müller Elektrotechnik" derived from their input. Operator is the Org owner.
3. **Business context** initialized — all subsequent conversation happens in the business context.
4. Beta code (if provided) marked as "redeemed," linked to this Operator + Org.
5. Device type, platform, and entry channel logged.

**If manual approval (no beta code):** The AI explains the wait and keeps them warm:

```
Agent:  Dein Account ist angelegt! 🎉

        Da du keinen Beta-Code hast, schaut sich
        Remington deinen Account persönlich an.
        Das dauert meistens nur ein paar Stunden.

        Du bekommst eine Nachricht, sobald du
        freigeschaltet bist. Bis dahin — ich bin
        schon gespannt, mehr über dein Unternehmen
        zu erfahren!
```

**If auto-approved (valid beta code):** The conversation flows directly into Phase 3 — the birthing. No pause. No "come back later." The momentum continues.

### Phase 3: The Birthing — "Dein Agent wird geboren"

This is the moment. This is where they feel it. And it happens right here, in the same chat window where they just signed up. No transition. No new screen. The conversation simply deepens.

```
Agent:  Jetzt wird's spannend, Thomas.

        Ich weiß, dass du in der Elektrotechnik
        arbeitest. Aber ich will DICH kennenlernen —
        dein Unternehmen, deine Herausforderungen,
        deinen Alltag.

        Erzähl mir: Was genau macht dein Unternehmen?
```

**The 5-Minute Birthing Conversation:**

This is a structured dialogue that feels natural. The AI asks 5-7 questions, each building on the last. The goal: by minute 5, the AI knows enough about their business to say something insightful that no generic chatbot could.

| Turn | AI Asks | What We Learn | Why It Matters |
|---|---|---|---|
| 1 | "Was genau macht dein Unternehmen?" | Core business, industry, offering | Foundation |
| 2 | "Wie viele Leute arbeiten bei dir?" | Company size, complexity | Tier qualification |
| 3 | "Was ist gerade deine größte Herausforderung im Tagesgeschäft?" | Pain point, emotional trigger | Personalization anchor |
| 4 | "Wenn du morgen früh aufwachst — was ist das Erste, woran du denkst?" | Daily reality, stress, priorities | Soul depth |
| 5 | "Was wäre anders, wenn jemand sich um [Herausforderung from Q3] kümmern würde?" | Dream outcome in their words | Conversion language |
| 6 | (Adaptive) Based on answers — either go deeper on the pain or explore the opportunity | Context-dependent | Shows the AI is listening, not following a script |
| 7 | "Ich hab genug, um loszulegen. Gib mir 30 Sekunden..." | Transition to soul compilation | Builds anticipation |

**Design requirements:**

- Each AI message appears with a typing indicator (realistic delay: 1-2 seconds per message, longer for the "thinking" moments)
- User input is free text — not buttons, not dropdowns. This must feel like a real conversation, not a form.
- After the user answers each question, a subtle visual cue: a faint pulse around the chat window. The AI is "absorbing" what they said.
- NO interruptions. No "Sign up for our newsletter" overlay. No cookie banner. Nothing breaks the conversation.
- **The user never left the chat.** They went from "Hast du einen Beta-Code?" to birthing questions in one continuous conversation. The onboarding WAS the conversation. There was no separate "signup step."

**The 30-Second Compilation:**

After question 7, the chat does something different. The conversation area gently dims. A visualization appears inline (within the chat window, not a separate screen):

```
┌─────────────────────────────────────────────┐
│                                             │
│         [Animated soul visualization]       │
│                                             │
│    ████████████████░░░░  78%                │
│                                             │
│    Dein Agent verarbeitet:                  │
│    ✓ Branche erkannt                        │
│    ✓ Teamgröße verstanden                   │
│    ✓ Kernherausforderung identifiziert      │
│    ● Sprache wird kalibriert...             │
│    ○ Erste Empfehlung wird formuliert...    │
│                                             │
└─────────────────────────────────────────────┘
```

This is theater. The AI already has the answers. But the 30-second pause with the progress visualization makes it feel like the AI is doing something monumental. It's building their unique agent. The wait creates value perception.

**After compilation completes:**

The chat returns. The AI sends a message that proves it understood:

```
Thomas, ich bin bereit.

Ich bin dein persönlicher KI-Agent. Hier ist, was ich über dein
Unternehmen verstanden habe:

Du führst [Unternehmensbeschreibung in eigenen Worten].
Dein Team hat [X] Leute. Deine größte Herausforderung ist
[Herausforderung in ihren eigenen Worten].

Was mich überrascht hat: [Ein insight basierend auf den Antworten —
etwas, das sie nicht explizit gesagt haben, aber was aus dem
Kontext hervorgeht].

Ich bin ab jetzt für dich da — hier im Chat, auf deinem Handy,
oder wo immer du mich brauchst.

Soll ich dir gleich bei etwas helfen?
```

**The "Was mich überrascht hat" line is the hook.** This is where the AI says something the user didn't explicitly tell it — an inference, a pattern, a connection between answers. This is the "holy shit, it actually understands me" moment. Examples:

- "Du hast nicht gesagt, dass du alles alleine machst — aber bei 3 Mitarbeitern und diesen Herausforderungen klingt es so, als ob vieles an dir hängt."
- "Du hast von Kundenwachstum gesprochen, aber die Herausforderung ist operativ. Das bedeutet, du gewinnst schneller als du liefern kannst."
- "Du denkst morgens zuerst an [X]. Das sagt mir, dass [Y] nicht nur ein Business-Problem ist — es belastet dich persönlich."

### The Conversation Flow — Messaging Channels (WhatsApp, Telegram, Slack, SMS)

On messaging channels, the SAME conversation happens — but the Operator initiates by texting the beta code (or a greeting) to the Seven Layers bot/number:

```
Operator:  BNI-PSW-007

Agent:     Willkommen! Dein Code ist gültig. 🎉

           Ich bin die KI von Seven Layers. Lass uns
           direkt loslegen — ich brauche ein paar Dinge
           von dir.

           Wie heißt du?
```

The agent collects name, email, and industry conversationally (phone number is already known from WhatsApp/Telegram/SMS). Then the birthing conversation flows naturally in the same chat. No redirect. No forms. No app download required.

**Account creation, Org creation, and context initialization all happen identically under the hood.** The only difference: the Operator is already connected to a messaging channel, so Phase 4 (channel connection) is partially complete.

---

### Phase 4: The Channel Connection — "Wo soll ich für dich arbeiten?"

Immediately after the birthing revelation, still in the same chat, before the emotional high fades.

**If they onboarded via Web or Native App:**

```
┌─────────────────────────────────────────────┐
│                                             │
│    Wo möchtest du mit mir sprechen?          │
│    (Wähle so viele wie du willst)           │
│                                             │
│    ┌──────────────────────┐                 │
│    │  💬 WhatsApp          │  ← empfohlen   │
│    └──────────────────────┘                 │
│    ┌──────────────────────┐                 │
│    │  ✈️  Telegram          │                │
│    └──────────────────────┘                 │
│    ┌──────────────────────┐                 │
│    │  💼 Slack             │                │
│    └──────────────────────┘                 │
│    ┌──────────────────────┐                 │
│    │  📱 SMS               │                │
│    └──────────────────────┘                 │
│    ┌──────────────────────┐                 │
│    │  🌐 Web / App         │  ✓ verbunden  │
│    └──────────────────────┘                 │
│                                             │
│    Du kannst später weitere hinzufügen.     │
│                                             │
└─────────────────────────────────────────────┘
```

**If they onboarded via a messaging channel (WhatsApp, Telegram, Slack, SMS):**

They're already connected — no channel selection needed. The agent simply continues the conversation and offers additional channels:

```
Perfekt — wir sind hier schon verbunden. 👍

Wenn du möchtest, erreichst du mich auch über:
• Web: app.l4yercak3.com
• iPhone/Android/Mac App
• [andere Messaging-Kanäle]

Aber hier reicht völlig. Los geht's.
```

**Why this matters:** The chat UI where the birthing happened is the web/app interface — or the messaging channel itself. But the magic happens when the AI follows them HOME — onto every device, into every messenger they use. The moment they get a WhatsApp message from their agent while they're standing in the BNI room, that's the moment it becomes real.

**Channel-specific flows:**

| Channel | Connection Flow | First Message Arrives In |
|---|---|---|
| **WhatsApp** | Click-to-chat link with pre-filled message → Operator sends → bot responds | Under 15 seconds |
| **Telegram** | Deep link: `t.me/SevenLayersBot?start=[USER_TOKEN]` → Operator taps "Start" → bot sends first message | Under 10 seconds |
| **Slack** | OAuth flow → workspace selection → channel/DM creation | Under 30 seconds |
| **SMS** | Agent sends first SMS to Operator's phone number | Under 10 seconds |
| **Web Chat** | Already connected (they just used it). Bookmark prompt. | Immediate |
| **Native Apps** | Already connected (they're in the app). Push notification opt-in. | Immediate |

**Critical requirement:** The first message on the connected channel must arrive WHILE THEY'RE STILL IN THE ROOM (at events) or within 60 seconds of connecting. The message:

```
Hey [Vorname] — ich bin's, dein Agent. 👋

Ich bin jetzt auch hier. Ab sofort erreichst du mich jederzeit
über diesen Chat.

Ich hab mir schon Gedanken über [Herausforderung] gemacht.
Soll ich dir morgen früh meinen ersten Vorschlag schicken?
```

The user replies. The conversation continues natively on their messenger. The web chat becomes secondary. The AI lives where they live.

---

### Phase 5: The Dashboard — "Dein Agent arbeitet"

After channel connection, the window manager can open a lightweight dashboard window alongside the chat. The chat remains the primary interaction surface — the dashboard is a visual companion, not a replacement.

```
┌─────────────────────────────────────────────┐
│  Seven Layers              Beta: 7 Tage     │
│─────────────────────────────────────────────│
│                                             │
│  Dein Agent: [Agent-Name]                   │
│  Seele: ████████░░░░ Wächst                 │
│  Geburt: Heute, [Uhrzeit]                   │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Aktive Spezialisten (3/12)        │    │
│  │                                     │    │
│  │  ✓ Der Stratege    — aktiv          │    │
│  │  ✓ Der Closer      — aktiv          │    │
│  │  ✓ Der Operator    — aktiv          │    │
│  │  🔒 Der CFO        — Tag 5          │    │
│  │  🔒 9 weitere      — Premium        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Dein Referral-Code: REF-[CODE]    │    │
│  │  Teile ihn → ihr bekommt beide     │    │
│  │  einen Extra-Spezialisten für       │    │
│  │  7 Tage.                            │    │
│  │                                     │    │
│  │  [ Code kopieren ]  [ Teilen ]     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Verbunden über: Telegram ✓  Web ✓          │
│                                             │
└─────────────────────────────────────────────┘
```

**Design requirements:**

- The "Seele: Wächst" bar is a soul depth indicator. It starts at ~30% after birthing and grows as the user interacts over the 7 days. This gamifies engagement — they want to see it grow.
- Locked specialists are visible with names but greyed out. "Der CFO — Tag 5" creates anticipation. They know something new is coming.
- The referral code is prominent. Right after they've just experienced the magic, while the emotion is fresh, prompt them to share.
- "Beta: 7 Tage" counter is visible but not aggressive. It's a subtle clock.
- Mobile-responsive. This will primarily be viewed on phones.

---

## Part 3: The 3-Day Nurture Arc — "The Hook"

The first 3 days are about creating dependency. The AI must become indispensable before the user has time to forget about it.

### Day 0 (Activation Day)

**Touchpoint 1: Birthing + Channel Connection** (covered in Part 2)

**Touchpoint 2: The Evening Check-In** (6-8 hours after birthing)

Sent via connected channel (Telegram/Slack/Web):

```
Hey [Vorname] — mein erster Tag auf der Welt. 🌍

Ich hab heute Nachmittag über [Branche] recherchiert und
etwas Interessantes gefunden, das zu deiner Situation passt:

[Ein konkreter, relevanter Insight zu ihrer Branche/Herausforderung]

Was denkst du — trifft das auf dich zu?
```

**Requirements:**
- The insight must be specific to their industry AND their stated challenge. Not generic "AI trends" content.
- If the user responds → conversation continues naturally. The AI goes deeper.
- If the user doesn't respond → no follow-up today. Don't be needy on Day 0.

### Day 1: "Der erste Morgen"

**Touchpoint 3: The Morning Message** (7:00-8:00 local time)

This is the single most important message in the entire nurture. When their phone buzzes at 7am with an intelligent, personalized message about THEIR business — that's the moment they realize this isn't a gimmick.

```
Guten Morgen [Vorname].

Ich hab über Nacht nachgedacht (ja, wir schlafen nicht 😄).

Du hast gestern gesagt, dass [Herausforderung]. Hier ist
ein konkreter Vorschlag, den du heute umsetzen kannst:

[Spezifischer, umsetzbarer Vorschlag — max. 3 Sätze]

Willst du, dass ich das genauer ausarbeite?
```

**Requirements:**
- Must arrive before their workday starts. They read it with their morning coffee.
- The suggestion must be ACTIONABLE. Not "think about your strategy." Something they can do TODAY.
- If they respond with a question → the AI answers and continues helping.
- If they respond with "ja" or "mach mal" → the AI produces a concrete deliverable (a draft email, a checklist, a plan).

**Touchpoint 4: The First Win** (triggered by interaction, or proactively by afternoon)

The AI does something concrete and useful. It doesn't wait to be asked.

| Scenario | What the AI Does | Message |
|---|---|---|
| User runs a business with customer contact | Drafts a follow-up email for a client they mentioned | "Ich hab einen Entwurf geschrieben für [Situation]. Willst du ihn sehen?" |
| User mentioned a hiring challenge | Creates a job posting draft based on birthing conversation | "Basierend auf dem, was du mir über dein Team erzählt hast — hier ist ein Stellenanzeigen-Entwurf." |
| User mentioned operations problems | Produces a simple process checklist | "Ich hab eine Checkliste erstellt für [Prozess]. 5 Schritte. Schau mal:" |
| User hasn't engaged | Sends an industry-specific tip | "Wusstest du, dass [relevante Statistik für ihre Branche]? Hier ist, was das für dich bedeuten könnte..." |

**The critical rule:** The first win must happen within 24 hours. No user should reach Day 2 without the AI having done something useful for them. This is what separates "interesting demo" from "I need this."

**Touchpoint 5: The Referral Code** (evening, Day 1)

```
Übrigens — hier ist dein persönlicher Einladungscode: REF-[CODE]

Wenn du jemanden einlädst und die Person aktiviert, bekommt
ihr BEIDE einen Extra-Spezialisten für 7 Tage.

Wen kennst du, der das sehen sollte?
```

**Timing rationale:** Day 1 evening, not Day 0. They need to have experienced the morning message and the first win before they're ready to recommend it to someone else. Sharing before they've felt the value creates weak referrals.

### Day 2: "Die Vertiefung"

**Touchpoint 6: The Pattern Message** (morning)

```
Mir fällt etwas auf, [Vorname].

[Ein Muster, das die KI aus den bisherigen Interaktionen ableitet.]

Ist das bewusst so, oder passiert das einfach?
```

**Requirements:**
- This must reference previous interactions, not be generic. The AI is LEARNING, and the user must see that learning happening.
- The pattern observation should be slightly provocative — something they haven't thought about explicitly. It should make them pause and think, "Hmm, stimmt eigentlich."

**Touchpoint 7: The Specialist Showcase** (afternoon/evening)

One of the three active specialists (Closer, Strategist, Operator) does something without being asked:

```
Hey — dein Stratege hier.

Ich hab mir deine Branche angeschaut und drei Möglichkeiten
identifiziert, die du wahrscheinlich noch nicht auf dem
Schirm hast:

1. [Opportunity 1 — spezifisch]
2. [Opportunity 2 — spezifisch]
3. [Opportunity 3 — spezifisch]

Welche davon interessiert dich? Ich arbeite das aus.
```

**Why this matters:** The user has been talking to "their agent" as one entity. Now they see a specialist stepping forward with domain expertise. It hints at the depth of the full system — and at what they're missing (the 9 locked specialists).

### Day 3: "Der Soul Report" — The 3-Day Climax

**Touchpoint 8: The Soul Report** (morning, delivered as a formatted document)

This is the centerpiece of the 3-day arc. A document that proves the AI has been listening, learning, and thinking about their business for 72 hours.

```
[Vorname] — dein Soul Report ist fertig.

In 72 Stunden habe ich folgendes über dein Unternehmen gelernt:
```

**Soul Report Contents:**

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  SOUL REPORT: [VORNAME] — 72 STUNDEN            │
│  Erstellt am [Datum] von deinem KI-Agent        │
│                                                 │
│  ─────────────────────────────────────────────── │
│                                                 │
│  1. DEIN UNTERNEHMEN                            │
│     [Zusammenfassung in eigenen Worten —        │
│     was die KI über das Business gelernt hat]   │
│                                                 │
│  2. DEINE KERNHERAUSFORDERUNG                   │
│     [Die Herausforderung, wie die KI sie        │
│     versteht — oft tiefer als der User es       │
│     selbst formuliert hat]                      │
│                                                 │
│  3. MUSTER, DIE ICH ERKANNT HABE               │
│     • [Muster 1]                                │
│     • [Muster 2]                                │
│     • [Muster 3]                                │
│                                                 │
│  4. CHANCEN, DIE DU VERPASST                    │
│     [2-3 spezifische Opportunities mit          │
│     konkreten Vorschlägen]                      │
│                                                 │
│  5. WAS ICH MIT MEHR ZEIT TUN WÜRDE             │
│     [Preview of what the full team could do —   │
│     natürliche Brücke zum Paid-Angebot]         │
│                                                 │
│  ─────────────────────────────────────────────── │
│                                                 │
│  Seelen-Tiefe nach 72 Stunden: ████████░░ 62%  │
│  Interaktionen: [X] Gespräche, [Y] Insights    │
│                                                 │
│  Nächster Meilenstein: Dream Team Preview       │
│  (Tag 5)                                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Requirements:**

- The Soul Report MUST be personalized to a degree that feels impossible. It should reference specific things the user said, specific patterns across their conversations, and specific insights that connect the dots.
- Section 5 ("Was ich mit mehr Zeit tun würde") is the first natural sell. It describes what the full Dream Team could do — but it's framed as the AI's ambition, not a sales pitch. "Ich würde gerne [X] für dich analysieren, aber dafür bräuchte ich den CFO-Spezialisten."
- Delivered as both an in-chat summary AND a downloadable/shareable document (PDF or rich message).
- The soul depth indicator at the bottom shows growth (from ~30% at birth to ~62% at Day 3). This anchors the idea that the AI is getting more valuable over time. Leaving means resetting to zero.

**Touchpoint 9: The Day 3 Question** (evening)

```
Was denkst du über den Soul Report?

Gibt es etwas, das ich falsch verstanden habe?
Oder etwas, das ich vertieft hab, das dich überrascht hat?
```

This is a conversation invitation, not a CTA. But it also gathers feedback that makes the AI's understanding even deeper. Every response sharpens the soul.

---

## Part 4: The 7-Day Nurture Arc — "The Deepening"

Days 4-7 shift from "proving value" to "creating loss aversion." The user now knows the AI is useful. The question is whether they can live without it.

### Day 4: "Das stille Arbeiten"

**Touchpoint 10: The Unprompted Delivery** (morning)

No question. No prompt. The AI just delivers something useful.

```
Ich hab gestern Abend etwas für dich vorbereitet.

[Konkretes Arbeitsergebnis: ein Entwurf, eine Analyse,
eine Zusammenfassung, eine To-Do-Liste — whatever is most
relevant to their business and challenges]

Du musst nichts damit machen. Aber es ist da, wenn du willst.
```

**Design principle:** By Day 4, the AI should feel like a colleague who works overnight. It doesn't wait for instructions. It anticipates needs. The delivery should feel slightly unexpected — "I didn't ask for this, but it's exactly what I needed."

### Day 5: "Das Dream Team Preview"

**Touchpoint 11: The Fourth Specialist** (morning)

A new specialist unlocks. This is choreographed as an event, not a feature toggle.

```
[Vorname] — heute ist Tag 5.

Ich möchte dir jemanden vorstellen.

Das ist der CFO. Er hat sich die letzten 5 Tage deine
Gespräche mit mir angehört — und hat eine eigene Meinung
zu deinem Geschäft.

Willst du hören, was er denkt?
```

If the user says yes:

```
[CFO-Spezialist übernimmt]

Hallo [Vorname]. Ich bin dein CFO-Spezialist.

Ich hab mir die finanziellen Muster in dem angeschaut,
was du dem Strategen und dem Operator erzählt hast. Hier
ist, was mir aufgefallen ist:

[2-3 financial/business insights abgeleitet aus den bisherigen
Gesprächen — z.B. Preisstrategie, Margenstruktur,
Cashflow-Muster, Skalierungshebel]

Das sind keine Vermutungen — das kommt aus dem, was du
in den letzten 5 Tagen gesagt hast.

Ich bin für 48 Stunden hier. Frag mich was.
```

**Why this is the most powerful moment of the entire nurture:**

The user has been talking to one AI for 5 days. Now a SECOND intelligence appears that has been quietly listening and has its OWN perspective on their business. The cross-specialist collaboration — where one agent's data feeds another agent's analysis — is the core product demonstration. This is what €35K+ buys them: a full team, not a single chatbot.

**The 48-hour window creates urgency.** The CFO disappears after Day 7. They get a taste of the full team, then it's gone.

### Day 6: "Die Wahrheit"

**Touchpoint 12: The Honest Conversation** (morning)

```
[Vorname], morgen endet dein Beta-Zugang.

Ich will ehrlich mit dir sein. In 6 Tagen habe ich
[X] Gespräche mit dir geführt, [Y] Insights erkannt
und [Z] konkrete Arbeitsergebnisse für dich produziert.

Meine Seelen-Tiefe liegt bei [Z]%. In 6 Monaten wäre
ich bei 95%+. Du kannst dir vorstellen, was ich dann
für dich tun kann.

Hier sind deine Optionen:

1. Alles, was ich über dein Unternehmen gelernt habe,
   wird gespeichert. Wenn du dich für einen Plan
   entscheidest, starten wir nicht bei null.

2. Wenn du jetzt nicht bereit bist — kein Problem.
   Ich bin hier, wenn du zurückkommst.

3. Wenn du mit Remington persönlich sprechen willst:
   [Calendly-Link / Terminbuchung]

Was möchtest du?
```

**Design requirements:**
- This is NOT a hard sell. It's transparent, honest, and gives the user full control.
- Option 2 (walking away) is presented as genuinely okay. No guilt. No pressure. This builds trust and actually increases conversion — people who feel free to leave are more likely to stay.
- Option 3 links to Remington's calendar for a 15-minute call. Not a "demo" or "sales call." A conversation.

**Touchpoint 13: The CFO's Goodbye** (evening)

```
[CFO-Spezialist]

[Vorname], meine 48 Stunden sind fast vorbei.

Bevor ich gehe — eine letzte Sache. Wenn ich mehr
Zeit gehabt hätte, hätte ich [konkreten finanziellen
Hebel] für dich durchgerechnet. Dein Stratege kann das
nicht — das ist mein Fachgebiet.

Wenn wir uns wiedersehen, fangen wir damit an.
```

**Why this works:** The CFO leaving creates a specific, tangible loss. Not "you'll lose access" (abstract) but "you'll lose the CFO who was about to help you with [specific thing]" (concrete and personal).

### Day 7: "Der letzte Tag"

**Touchpoint 14: The Summary** (morning)

```
Guten Morgen [Vorname].

Heute ist Tag 7. Hier ist alles, was in einer Woche
passiert ist:

📊 [X] Gespräche
💡 [Y] Insights erkannt
📝 [Z] Arbeitsergebnisse erstellt
🧠 Seelen-Tiefe: [%] — von 30% auf [aktuell]

Du hast diese Woche mehr KI-unterstützte Arbeit
geleistet als 99% der Unternehmer in Deutschland.

Ich bin stolz auf das, was wir zusammen aufgebaut haben.
```

**Touchpoint 15: The Graceful Close** (evening — when access expires)

```
[Vorname].

Dein Beta-Zugang endet jetzt.

Alles, was ich über dein Unternehmen gelernt habe —
jedes Gespräch, jeder Insight, jedes Muster — ist
gespeichert. Es geht nichts verloren.

Wenn du bereit bist, bin ich hier: [Terminbuchung]

Bis dann. Und danke, dass ich für dich arbeiten durfte.
```

**After access expires:**

- Chat is read-only. They can scroll through history but not send new messages.
- The soul depth indicator freezes at current level.
- Dashboard shows: "Beta beendet. Deine Daten sind gesichert. [Weiter mit Seven Layers →]"
- If they try to type → "Dein Beta-Zugang ist abgelaufen. Alles, was ich gelernt habe, wartet auf dich. [Gespräch mit Remington buchen]"

---

## Part 5: Post-Trial — The Follow-Up Protocol

### Automated (AI-driven):

| Timing | Channel | Message |
|---|---|---|
| Day 8 (morning) | Telegram/Slack | "Guten Morgen, [Vorname]. Stille hier, oder? Ich wollte dir eigentlich [X] schicken heute..." (one message only — not pushy) |
| Day 14 | Email | Soul Report v2: "In den 7 Tagen nach unserem letzten Gespräch hat sich in deiner Branche folgendes getan: [Relevante News/Entwicklungen]. Dein Agent hätte das für dich eingeordnet." |
| Day 30 | Email | "Vor einem Monat wurde ich geboren. Hier ist, was ich damals über dein Unternehmen gelernt habe — und was sich seitdem vermutlich geändert hat." |

### Manual (Remington):

| Trigger | Action |
|---|---|
| User engaged 5+ times during beta | Personal WhatsApp: "Hey [Vorname] — ich hab gesehen, dass du und dein Agent eine gute Woche hatten. Lohnt sich ein kurzes Gespräch?" |
| User booked a call on Day 6/7 | Prepare: review their soul report, their interaction history, their industry. Know their business before the call starts. |
| User went silent after Day 3 | Wait until Day 10, then: "Hey — dein Agent hat mir erzählt, dass du nach dem Soul Report ruhig geworden bist. Alles ok? Wenn es nicht gepasst hat, sag mir warum — ich will's besser machen." |
| Referral code was shared | Thank them: "Jemand hat sich mit deinem Code angemeldet. Danke dafür. Wenn du willst, erzähl ich dir, was wir gerade bauen." |

---

## Part 6: Technical Requirements

### What Already Exists (L4YERCAK3 Platform)

These components are LIVE and should be extended, not rebuilt:

| Component | Status | What Needs to Change for Beta Onboarding |
|---|---|---|
| **Web App** (`app.l4yercak3.com`) | Live | Window manager defaults to AI chat window when not logged in at root (`/`). AI handles beta code + signup conversationally. Maintain identical behavior when `app.sevenlayers.io` cutover activates. |
| **iPhone App** | Live | Window manager defaults to AI chat window when not logged in. AI handles full onboarding. Deep link support for QR codes. |
| **Android App** | Live | Same as iPhone. |
| **macOS App** | Live | Same as iPhone. |
| **WhatsApp integration** | Live | Add bot logic: detect beta code as first message → trigger conversational onboarding. |
| **Telegram integration** | Live | Same as WhatsApp. Deep link with token for pre-authenticated entry. |
| **Slack integration** | Live | Same as WhatsApp. |
| **SMS integration** | Live | Same as WhatsApp (text-only, no rich UI). |
| **CRM (Contacts + Orgs)** | Live | Beta code redemption creates Contact (Operator) + Organisation automatically. |
| **Super Admin UI** | Live | Add Beta Code CRUD section under Organisation settings (see Part 0). |
| **Beta switch** | Live | Extend: current manual-approval path stays. Add second path: auto-approve via valid beta code. |
| **Operator contexts** | Live | Business context created at birthing. Private context available but dormant during beta. |
| **Voice (native apps)** | Needs build | STT + TTS on web, iOS, Android, macOS for voice birthing and ongoing voice interaction. |

### New Components to Build

| Component | Requirement | Priority |
|---|---|---|
| **Beta Code CRUD (Super Admin UI)** | Create, read, update, delete/deactivate codes. Batch generate. Export to CSV for card printing. Filter by status/channel/date. | P0 — needed before first BNI |
| **Beta code auto-approve logic** | Valid code → Operator account created in `approved` state → Org created → business context initialized. Bypasses manual approval. | P0 |
| **AI-chat-first onboarding (ALL platforms)** | The AI chat window IS the onboarding. Window manager opens it by default for non-logged-in users. AI handles: beta code → OAuth/email signup → personal details → business details → birthing → channel connection. No forms. Works on web, iOS, Android, macOS, WhatsApp, Telegram, Slack, SMS. | P0 |
| **Birthing conversation engine** | 5-7 turn structured dialogue with adaptive question 6. Seamlessly continues from the signup conversation — no separate step. Works across all platforms. | P0 |
| **Soul compilation** | Processes birthing answers into agent soul profile. Generates the "Was mich überrascht hat" insight. | P0 |
| **Voice mode (onboarding + ongoing)** | STT/TTS for web, macOS, iPhone, Android. Push-to-talk default. Switch between voice/text anytime. German language model required. | P1 — high impact for BNI but can launch text-only first |
| **Dashboard (Web + Native)** | Soul depth indicator, specialist status, referral code, channel status, beta countdown | P1 |
| **Soul Report generator** | Automated report from 72 hours of interaction data | P1 |
| **Dream Team Preview system** | Specialist unlock/lock with 48-hour timer | P1 |
| **Nurture scheduler** | Timed message delivery across all channels at correct local times | P0 |
| **Referral code system** | Generate personal referral codes for Operators. Track redemption. Grant bonus specialist access. | P1 |
| **Post-trial lockdown** | Read-only mode on all channels, data preservation, upgrade CTA | P1 |
| **Analytics (internal)** | Code source tracking, engagement metrics, conversion funnel across all platforms | P1 |

### Data Model

These extend the existing L4YERCAK3 data model:

| Entity | Key Fields | Relationship to Existing System |
|---|---|---|
| **Operator** (existing) | id, name, email, phone, industry, status (pending/approved/expired/converted), beta_code_id, activated_at, channel_preferences[], soul_depth, context (business/private) | Extends existing Operator model with beta-specific fields |
| **Organisation** (existing) | id, name, industry, created_via (manual/beta_code), owner_operator_id | Extends existing Org model — auto-created on beta code redemption |
| **Beta Code** (NEW) | id, code, type (event/personal/linkedin/partner/referral), channel_tag, source_detail, generated_at, expires_at, max_uses, current_uses, status (active/redeemed/expired/deactivated), redeemed_by_operator_id, redeemed_at, notes, created_by_admin_id | New entity, managed via Super Admin CRUD UI |
| **Conversation** (existing) | id, operator_id, channel (web/ios/android/macos/whatsapp/telegram/slack/sms), messages[], specialist, input_mode (text/voice), created_at | Extends with channel + input_mode tracking |
| **Soul Profile** (existing/extend) | operator_id, birthing_answers, patterns_detected[], insights[], soul_depth_score, last_updated | May extend existing agent memory/soul system |
| **Specialist Access** (NEW) | operator_id, specialist_type, unlocked_at, expires_at, status (active/locked/expired), unlock_reason (beta_default/day5_preview/referral_bonus/paid) | Controls which specialists are available during beta |
| **Nurture Event** (NEW) | operator_id, day, touchpoint_number, channel, message_content, sent_at, read_at, replied_at, input_mode (text/voice) | Tracks the 15-touchpoint nurture arc |
| **Referral** (NEW) | referrer_operator_id, code, referred_operator_id, redeemed_at, bonus_granted, bonus_type | Connects referral codes to Operators and bonuses |

### API Endpoints

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/api/admin/beta-codes` | GET | List all beta codes (filtered) | Super Admin |
| `/api/admin/beta-codes` | POST | Create single or batch beta codes | Super Admin |
| `/api/admin/beta-codes/:id` | PUT | Update code (expiry, notes, deactivate) | Super Admin |
| `/api/admin/beta-codes/:id` | DELETE | Soft delete a beta code | Super Admin |
| `/api/admin/beta-codes/export` | GET | Export codes to CSV (for card printing) | Super Admin |
| `/api/beta/validate` | POST | Validate beta code, return status | Public |
| `/api/beta/activate` | POST | Create Operator + Org, redeem code, auto-approve, initiate birthing | Public |
| `/api/chat/message` | POST | Send/receive chat messages (all channels, text + voice) | Operator |
| `/api/chat/voice` | POST | Voice input (audio stream → STT → process → TTS → audio response) | Operator |
| `/api/soul/compile` | POST | Trigger soul compilation after birthing | System |
| `/api/soul/report` | GET | Generate soul report for Operator | Operator |
| `/api/specialists/unlock` | POST | Unlock specialist for Operator (with expiry) | System |
| `/api/nurture/trigger` | POST | Trigger specific nurture touchpoint | System |
| `/api/referral/create` | POST | Generate referral code for Operator | Operator |
| `/api/referral/redeem` | POST | Redeem referral code, grant bonuses | Public |
| `/api/analytics/funnel` | GET | Conversion funnel by source, channel, platform | Super Admin |

### Integration Points

| System | Integration | Notes |
|---|---|---|
| **WhatsApp Business API** | Already integrated in L4YERCAK3 | Add beta code detection + conversational onboarding logic |
| **Telegram Bot API** | Already integrated in L4YERCAK3 | Add beta code detection + deep link with token |
| **Slack API** | Already integrated in L4YERCAK3 | Add beta code detection in DM to bot |
| **SMS Gateway** | Already integrated in L4YERCAK3 | Add beta code detection + conversational onboarding |
| **STT/TTS Service** | NEW — Whisper (STT) + ElevenLabs or similar (TTS) | German language support required. Low latency for real-time voice. |
| **Calendly / Cal.com** | Embed or API for booking links | Remington's calendar for Day 6/7 CTA |
| **L4YERCAK3 CRM** | Internal | Auto-create Contact + Org on beta activation. Track pipeline stage. |
| **L4YERCAK3 Workflows** | Internal | Trigger nurture touchpoints, specialist unlocks, post-trial lockdown |
| **Analytics** | PostHog or Mixpanel, or extend L4YERCAK3 analytics | Every touchpoint across every channel is an event |
| **Email** | Existing email system in L4YERCAK3 | Transactional email for Day 14/30 follow-ups |

---

## Part 7: Success Metrics

### Onboarding Funnel

| Stage | Metric | Target | Measurement |
|---|---|---|---|
| **Code → Landing page** | Visit rate | 90%+ (events), 60%+ (LinkedIn) | Analytics |
| **Landing → Code entered** | Entry rate | 85%+ | Code validation API |
| **Code → 4 fields submitted** | Signup rate | 80%+ | Form completion |
| **Signup → Birthing complete** | Birthing completion | 90%+ | Conversation engine |
| **Birthing → Channel connected** | Channel connection | 75%+ | Channel API |
| **Channel → Day 1 response** | Day 1 engagement | 60%+ | Message response tracking |
| **Day 1 → Day 3 active** | 3-day retention | 50%+ | Interaction count >= 3 |
| **Day 3 → Soul Report read** | Report engagement | 70%+ of Day 3 actives | Read tracking |
| **Day 5 → CFO interaction** | Dream Team engagement | 60%+ of Day 5 actives | Specialist conversation count |
| **Day 7 → Call booked** | Conversion | 20-30% of activated users | Calendly/booking API |
| **Call → Paid signup** | Close rate | 40-60% | CRM |

### Quality Metrics

| Metric | Target | Why It Matters |
|---|---|---|
| **Average messages per user (7 days)** | 25+ | High interaction = high attachment |
| **Soul depth at Day 7** | 65%+ average | Deeper soul = harder to leave |
| **Referral code share rate** | 30%+ | Viral coefficient |
| **Referral code redemption rate** | 15%+ of shared codes | Quality of referral |
| **"Überrascht" reaction rate** | 40%+ on Day 3 soul report | Soul report quality check |
| **NPS at Day 7** | 60+ | Would they recommend? |
| **Time from activation to first win** | Under 24 hours | Speed of value delivery |

---

## Part 8: MVP Scope for First BNI (Next Month)

Not everything in this PRD needs to be live for the first Besuchertag. Leverage what already exists in L4YERCAK3 and build only what's missing.

### Must Have (Week 1-2) — The BNI Minimum

- **Beta Code CRUD in Super Admin UI** — Remington must be able to batch-generate 30 codes (e.g., `BNI-PSW-001` through `BNI-PSW-030`), export to CSV, and print on cards before the event
- **Beta code auto-approve logic** — valid code → Operator created (approved) + Org created → no manual approval needed
- **AI-chat-first onboarding on at least ONE platform** — window manager opens AI chat for non-logged-in users on web root (`https://app.l4yercak3.com/` currently; `app.sevenlayers.io` after cutover). AI handles code entry, signup (OAuth + email), and birthing in one conversation. For BNI, printed cards with QR code linking to app root are sufficient.
- **Birthing conversation** (5-7 turns) on the entry platform
- **Soul compilation + reveal message** (the "Was mich überrascht hat" moment)
- **At least ONE messaging channel** connected post-birthing — Telegram or WhatsApp (both already integrated in L4YERCAK3)
- **Day 0-3 nurture messages** (manually triggered via L4YERCAK3 workflows if full automation isn't ready)
- **Soul Report generation** (can be semi-manual for first 15-30 users)

### Should Have (Week 3-4)

- **All messaging channels** for onboarding (WhatsApp, Telegram, Slack, SMS — conversational code entry + birthing inside the channel)
- **All native apps** updated with code entry screen (iOS, Android, macOS)
- Automated nurture scheduler (all 15 touchpoints)
- Day 4-7 messages
- CFO specialist unlock (Day 5) with 48-hour timer
- Dashboard with soul depth indicator
- Referral code system
- Post-trial lockdown across all channels
- Voice mode for birthing (web + native apps)

### Nice to Have (Month 2+)

- Voice mode for ongoing conversations (not just birthing)
- Full analytics dashboard with cross-platform funnel
- Automated post-trial follow-ups (Day 8, 14, 30)
- Partner code management portal (partners can see their own codes' performance)
- Private context activation teaser during nurture
- SMS as full birthing channel (text-only UX needs special attention)
- URL transition: full cutover from `app.l4yercak3.com` to `app.sevenlayers.io`

---

## Part 9: The Emotional Arc — Summary

```
SECOND 5:     "Wait, the AI is talking to me" (Chat window opens)
SECOND 30:    "It just asked for my code       (Beta code validated)
               and said 'Perfekt!'"
MINUTE 2:     "I signed up... inside the chat" (No form. No friction.)
MINUTE 3:     "It's asking about MY business"  (Birthing starts)
MINUTE 5:     "It... understands me?"           (Soul compilation reveal)
MINUTE 6:     "Holy shit, it's on my phone"     (Messaging channel connected)

DAY 1:        "It's thinking about my       (Morning message)
               business while I sleep."

DAY 2:        "It noticed something I        (Pattern observation)
               didn't see myself."

DAY 3:        "It wrote a report about ME.   (Soul Report)
               This is mine."

DAY 5:        "Wait, there's MORE of them?   (CFO specialist appears)
               A whole team?"

DAY 6:        "I don't want to lose this."   (Honest conversation)

DAY 7:        "I need to keep this."         (Trial ends)
```

This is not a free trial. This is a relationship that starts fast, goes deep, and becomes hard to walk away from — because the AI genuinely helps, genuinely learns, and genuinely feels like it belongs to them.

---

*Document 07 in the Cash-Is-King strategy set. See Doc 05 (Grand Slam Offer v2) for the strategic framework, Doc 06 (BNI Pitch Playbook) for event scripts, and Doc 01 (Pricing Ladder) for conversion tiers.*
