# Document 06: BNI Pitch & Live Demo Playbook

**Seven Layers | Cash-Is-King Strategy**
**Date:** 2026-02-24
**Classification:** Internal — Founder's Eyes Only
**Purpose:** The 45-60 second BNI pitch + live demo choreography. Two Besuchertage next month. Make it unforgettable.

---

## The Constraints (And Why They're Advantages)

| Constraint | Why It's Actually Better |
|---|---|
| 45-60 seconds only | Forces you to DO, not talk. Every other person will talk. You'll perform. |
| No projector, no laptop | Perfect. You don't need slides. You have smart glasses and a live human. |
| 7am, people are half-asleep | You're about to wake them up by pulling someone out of their chair. |
| German only | Intimate. Local. "Einer von uns" energy. |
| They've never seen anything like this | That's the point. |

---

## The Setup (Before You Stand Up)

### Pre-Work (Day Before)

1. **Identify your volunteer.** Contact the chapter Besucher-Koordinator or whoever invited you. Ask: "Gibt es jemanden, der bereit wäre, kurz mit mir nach vorne zu kommen? Dauert 30 Sekunden, wird lustig." If they can't pre-arrange, you'll pick someone cold — that's even better (see Plan B below).

2. **Test the tech.** Make sure: Meta glasses charged. WhatsApp connected. Calendar integration working. Agent responsive to German commands. Run through the exact scenario 3 times at home the night before.

3. **Have a backup.** If WiFi is shaky, hotspot from your phone. If the glasses glitch, you do the demo from your phone camera instead. The scenario still works — it's just less cinematic.

### The Moment Before You Stand Up

- Glasses are on your head (pushed up on forehead, not over eyes yet — like sunglasses)
- Phone in pocket
- You look relaxed, casual, maybe even slightly amused
- When your name is called, you stand up slowly

---

## The Pitch: Option A — "Der Terminmacher"

**This is the recommended version.** Cold pull from the audience. Maximum surprise. Maximum proof.

### The Script (German, ~55 seconds total)

---

**[0:00 — Stand up. Pause. Look around the room. 3 seconds of silence.]**

> "Guten Morgen. Mein Name ist Remington. Ich mache KI-Agenten, die für Unternehmer arbeiten — nicht irgendwann, sondern jetzt."

**[0:08 — Point casually at someone in the room. Pick someone who looks awake and friendly.]**

> "[Vorname], steh mal kurz auf. Keine Sorge — dauert 30 Sekunden."

**[0:12 — They stand. You walk to them. Face to face. Pull the glasses down over your eyes.]**

> "Ich setze jetzt meine Brille auf. Mein KI-Agent sieht, was ich sehe."

**[0:16 — Look at their name tag through the glasses. Speak to the agent out loud so the room hears:]**

> "Agent — wer steht vor mir?"

**[0:18 — The agent responds through the glasses (you repeat what it says, or it speaks through a small speaker if available):]**

> *[Agent identifies name from tag, checks contacts]* "Das ist [Name], [Beruf/Firma]. Noch kein Kontakt in deinem CRM."

**[0:22 — To the person:]**

> "[Name], wann hast du nächste Woche Zeit für ein Eins-zu-eins? Montag? Dienstag?"

**[0:25 — They answer. e.g. "Dienstag Nachmittag geht."]**

> *[To the agent:]* "Eins-zu-eins mit [Name], Dienstag 14 Uhr, 30 Minuten."

**[0:28 — To the person:]**

> "Zeig mir mal kurz dein Handy — deine Kontaktseite."

**[0:30 — They hold up their phone (contact card or email visible). You look at it through the glasses.]**

> *[Agent reads the contact info through the camera:]* "E-Mail erfasst: [email]. Telefon erfasst: [number]."

**[0:35 — The agent works. 3-5 seconds of visible processing.]**

> "Kontakt angelegt. Termin erstellt. Einladung wird verschickt."

**[0:40 — The person's phone buzzes. They look down. Their eyes go wide.]**

> "[Name], schau mal auf dein Handy."

**[0:42 — They see a calendar invite. From you. With all the details. Sent 5 seconds ago. The room reacts.]**

> *[To the room:]* "Das war kein Trick. Kein vorbereitetes Skript. Mein KI-Agent hat [Name]s Namensschild gelesen, die Kontaktdaten vom Handy erfasst, einen Termin erstellt und die Einladung verschickt. In 20 Sekunden."

**[0:52 — Beat. Let it land.]**

> "Stellt euch vor, was der in einer Woche kann."

**[0:55 — Pull a card or gesture to yourself:]**

> "Remington. Seven Layers. Wer das auf seinem Handy haben will — sprecht mich nachher an."

**[0:60 — Sit down. Done.]**

---

### LOC-046 Deterministic Failover Choreography (Primary + Fallback)

Use this exact run card to preserve trust and keep the demo inside 20-60 seconds.

| Time | Branch | Operator line (German) | Runtime intent |
|---|---|---|---|
| `0:00-0:18` | Primary start | "Ich starte mit der Brille. Gleicher Ablauf, kurze Live-Demo." | Meta glasses ingress begins; identify-from-name-tag path. |
| `0:18-0:28` | Primary continue | "Agent, wer steht vor mir?" + slot capture question | CRM lookup/create + scheduling extraction. |
| `0:28-0:36` | Fallback trigger (if needed) | "Wir schalten jetzt auf iPhone-Kamera um, gleicher Ablauf." | Immediate camera-source swap to iPhone; no restart, no branch drift. |
| `0:36-0:46` | Both branches | "Vorschau ist bereit, ich sende erst nach deiner Bestatigung." | Preview-first gate, explicit approval before mutating send. |
| `0:46-0:60` | Degraded safeguard | "Verbindung ist nicht verifiziert, ich behaupte keinen Versand." | Fail closed if invite evidence is missing; no false send claim. |

Failover rules:

1. Keep one visible operator narrative in both branches; do not mention hidden specialist routing.
2. If confidence/readiness drops (vision read, CRM, calendar, outbound invite), switch to fallback immediately and keep the same trust gates.
3. Never claim "sent" unless delivery evidence exists (invite, message ID, or visible confirmation on recipient phone).
4. If send evidence is unavailable, close with a truthful preview-state statement and post-demo completion plan.

---

### Why This Works

| Element | Effect |
|---|---|
| **Cold pull from audience** | Can't be faked. Everyone knows this wasn't prepared. |
| **Their phone buzzes in real-time** | Undeniable proof. The room HEARS the notification. |
| **You spoke to the AI out loud** | Demystifies it. It's not hidden code — it's a conversation. |
| **The agent reads a name tag** | Grounding in the real world. Not a screen demo — physical reality. |
| **The agent reads a phone screen** | Mind-bending. "It can SEE what I see." |
| **Calendar invite arrives instantly** | The output is REAL. Not a promise. Not a mockup. A real invite on a real phone. |
| **You did it in 20 seconds** | While everyone else took 60 seconds to explain their business with words. |
| **"Stellt euch vor, was der in einer Woche kann"** | Seeds the dream outcome. Their imagination does the rest. |
| **You sit down calm** | Power move. No "any questions?" No begging. Just sit. Let them come to you. |

---

## The Pitch: Option B — "Der Aufwecker" (The Wake-Up Call)

**For when you want maximum energy at 7am.** More theatrical. Gets people moving.

### The Script (German, ~55 seconds)

---

**[0:00 — Stand up. Don't go to the front. Stay where you are.]**

> "Mein Name ist Remington. Ich hab eine Frage an alle."

**[0:04 — Look around the room.]**

> "Wer hat heute Morgen schon mal auf sein Handy geschaut? E-Mails, WhatsApp, Kalender?"

**[0:08 — Everyone raises their hand or laughs.]**

> "Und wer hat dabei gedacht: 'Das könnte auch jemand anders machen'?"

**[0:12 — Laughter, nods.]**

> "Genau. Jemand anders kann das machen. Ab sofort."

**[0:15 — Pull glasses down. Walk toward someone.]**

> "[Name] — steh mal auf. Ich zeig dir was."

**[0:18 — Face to face. Same demo as Option A: name tag → contact check → schedule 1:1 → read phone → send invite.]**

**[0:40 — Their phone buzzes.]**

> "Schau auf dein Handy."

**[0:42 — They react. Room reacts.]**

> "Ich hab gerade in 20 Sekunden einen Kontakt angelegt, einen Termin erstellt und eine Einladung verschickt. Ohne Tippen. Ohne App öffnen. Nur durch Hinschauen und Sprechen."

**[0:50 — To the room:]**

> "Das ist kein Zukunftsvision. Das funktioniert jetzt. Auf eurem Handy. Für euer Geschäft."

**[0:55 — Calm.]**

> "Remington. Seven Layers. KI-Agenten für Unternehmer. Nachher bin ich da."

**[0:60 — Sit down.]**

---

## The Pitch: Option C — "Die Stille Demonstration" (The Silent Demo)

**For when you want to be the most memorable by doing the LEAST talking.** Pure spectacle.

### The Script (German, ~50 seconds)

---

**[0:00 — Stand up. Say nothing. Walk to someone. Pull glasses down.]**

**[0:05 — To the person, quietly but audible:]**

> "Steh mal kurz auf."

**[0:07 — They stand. You look at their name tag.]**

> *[To agent, clearly:]* "Agent — neuer Kontakt. Eins-zu-eins nächste Woche."

**[0:10 — To the person:]**

> "Wann passt dir?"

**[0:12 — They answer.]**

> *[To agent:]* "[Day], [time], 30 Minuten."

**[0:14 — To the person:]**

> "Zeig mir kurz deine Kontaktdaten."

**[0:16 — They hold up phone. You look.]**

> *[Agent processes. 5 seconds.]*

**[0:22 — Their phone buzzes.]**

> "Schau auf dein Handy."

**[0:25 — They look. Reaction. Room murmurs.]**

**[0:28 — First time you address the room. Walk back to your spot.]**

> "Mein Name ist Remington. Das war mein KI-Agent. Er sieht, was ich sehe, und erledigt, was ich sage. 20 Sekunden für einen kompletten Geschäftskontakt — vom Namensschild bis zur Kalendereinladung."

**[0:42 — Pause.]**

> "Kein Trick. Kein Setup. Funktioniert auf jedem Handy."

**[0:47 — Pull the glasses up casually.]**

> "Seven Layers. Wer Fragen hat — ich bin beim Kaffee."

**[0:50 — Sit down.]**

---

### Why "Die Stille" Might Be the Best Option

At BNI, everyone talks. For 45-60 seconds, they explain what they do. It's a river of words.

You walk up to someone in silence, do something nobody has ever seen, make their phone buzz with a real calendar invite, and then — THEN — you explain what just happened. The explanation lands 10x harder because they already saw the proof.

**Show first. Explain second.** The most powerful pitch structure that exists.

---

## Plan B: If You Can't Pre-Arrange a Volunteer

**This is actually BETTER.** Here's why and how.

### The Cold Pull

Walk up to the person who looks most skeptical. The arms-crossed-at-7am person. The "convince me" face.

> "[Vorname vom Namensschild], ich seh deinen Namen hier. Steh mal kurz auf."

The skeptic standing up and then looking shocked when their phone buzzes is 100x more powerful than a pre-arranged volunteer smiling politely.

### Backup if They Refuse

(Rare, but plan for it.)

> "Kein Problem. Wer traut sich?"

Someone will volunteer. Germans are polite in group settings. If you ask with a smile and confidence, someone stands up within 3 seconds.

### Backup if Tech Fails

If the glasses don't connect or the calendar invite doesn't send:

> "Mein Agent hat gerade das gleiche Problem wie ein neuer Mitarbeiter am ersten Tag — WiFi."

**[Room laughs.]**

> "Im Ernst — was ihr gerade gesehen habt, ist der Normalfall. In 95% der Fälle: Namensschild lesen, Kontakt anlegen, Termin erstellen, Einladung verschicken. 20 Sekunden. Heute hat das WLAN andere Pläne."

> *[Take out your phone, do it from there in 15 seconds as backup:]* "Hier — über die Handykamera geht's genauso."

**[Phone buzzes. Demo still lands.]**

> "Seven Layers. Wer will, spricht mich nachher an."

**Turn the failure into a joke, then recover.** The audience respects that MORE than a perfect demo because it proves you're a real person, not a performer.

---

## The After-Pitch Game Plan

The 45-60 seconds is the hook. The 45 MINUTES of networking after is where the money is.

### Immediately After Your Pitch

| What Happens | What You Do |
|---|---|
| 3-5 people approach you during the break | Don't sell. Ask: "Was macht ihr?" Listen. Then: "Darf ich dir einen Beta-Zugang schicken? Dein eigener KI-Agent, auf deinem Handy, 7 Tage kostenlos." |
| Someone asks "Was kostet das?" | "Erstmal nichts. 7 Tage kostenlos testen. Danach reden wir, ob's passt." |
| Someone asks "Wie funktioniert das technisch?" | "Kurze Antwort: dein Handy hat eine Kamera. Mein Agent nutzt sie. Lange Antwort: erzähl ich dir beim Eins-zu-eins. Wann hast du Zeit?" |
| The chapter president approaches | "Das war beeindruckend. Wollen Sie regelmäßig kommen?" → "Gerne. Gibt's in Ihrem Kapitel schon jemanden für KI oder Technologie?" (You're checking if the seat is open.) |
| Someone says "Das glaub ich nicht" | "Dann zeig ich's dir. Steh auf." → Do the demo AGAIN, one-on-one. The skeptic who gets converted in front of others is your best advocate. |

### The Follow-Up (Same Day)

Send a WhatsApp message to everyone you spoke with:

> "Hey [Name], schön dich heute Morgen kennengelernt zu haben. Hier ist dein persönlicher Beta-Zugang für deinen eigenen KI-Agenten: [CODE]. Einfach auf app.l4yercak3.com gehen — dauert 60 Sekunden. 7 Tage kostenlos. Meld dich, wenn du Fragen hast!"

### The Follow-Up (Day 3)

To anyone who activated:

> "Hey [Name], dein Agent hat mir erzählt, dass er schon einiges über [ihr Geschäft] gelernt hat. Was ist dein erster Eindruck?"

This is not a sales message. It's a curiosity message. Their response tells you if they're warm.

### The Follow-Up (Day 7)

To engaged users:

> "Hey [Name], dein 7-Tage-Zugang endet heute. Dein Agent hat in der Zeit [X] über dein Geschäft gelernt. Willst du behalten, was er weiß? 15 Minuten reichen — ich erklär dir die Optionen."

---

## The Two Besuchertage: Preparation Checklist

### 2 Weeks Before

| # | Task | Status |
|---|---|---|
| 1 | Confirm attendance at both Besuchertage | ☐ |
| 2 | Ask Besucher-Koordinator: "Darf ich eine kurze Live-Demonstration machen? Dauert 45 Sekunden, brauche keinen Beamer." | ☐ |
| 3 | Decide: Option A, B, or C (or rehearse all three and decide based on room energy) | ☐ |
| 4 | Test the full demo scenario 5 times at home | ☐ |
| 5 | Prepare beta codes (25 per event) | ☐ |
| 6 | Print simple cards with QR code + beta code (optional but nice to hand out) | ☐ |

### 1 Week Before

| # | Task | Status |
|---|---|---|
| 7 | Run the demo with a friend acting as volunteer | ☐ |
| 8 | Test on different WiFi / cellular conditions | ☐ |
| 9 | Prepare the backup (phone camera version) | ☐ |
| 10 | Write the WhatsApp follow-up messages (templates ready to personalize) | ☐ |

### Day Before

| # | Task | Status |
|---|---|---|
| 11 | Charge Meta glasses fully | ☐ |
| 12 | Test WhatsApp + calendar integration one more time | ☐ |
| 13 | Set phone hotspot as WiFi backup | ☐ |
| 14 | Lay out what you're wearing (look sharp but approachable — no suit, but clean and confident) | ☐ |
| 15 | Set alarm for 5:45am (arrive early, scope the room, test WiFi) | ☐ |

### Morning Of

| # | Task | Status |
|---|---|---|
| 16 | Arrive 20 min early | ☐ |
| 17 | Test WiFi in the room (or confirm hotspot works) | ☐ |
| 18 | Do one silent test run of the demo (not in front of people) | ☐ |
| 19 | Put glasses on forehead. Relax. Have coffee. Chat casually. | ☐ |
| 20 | When your turn comes: breathe, stand, perform. | ☐ |

---

## What Success Looks Like

### Minimum (Both Events Combined)

- 5+ people approach you during networking breaks
- 10+ beta codes distributed
- 3+ 1:1 meetings scheduled (using the glasses, live, like in the demo)
- 1 invitation to come back as a regular guest or member

### Target

- 10+ people approach you
- 20+ beta codes distributed
- 5+ 1:1 meetings scheduled
- 2+ invitations (comeback + another chapter)
- 1 person says "Ich kenn jemanden, dem musst du das zeigen" (referral intro)
- Video clip filmed (by someone in the room who pulls out their phone — this WILL happen)

### Home Run

- The chapter president asks you to become a member
- You get invited to present at a neighboring chapter
- Someone in the room is a Vistage/EO member and invites you to their group
- The video someone took goes semi-viral on LinkedIn

---

## The Pitch Comparison: You vs. Everyone Else

| Typical BNI Pitch | Your BNI Pitch |
|---|---|
| "Mein Name ist X, ich mache Y für Z..." | *[Walks to someone in silence, puts on glasses]* |
| Explains their business | Demonstrates their business |
| "Wenn Sie jemanden kennen, der..." | *[Phone buzzes in someone's hand]* |
| Business card handoff | Beta code handoff (AI starts working immediately) |
| Forgotten by lunch | Talked about for weeks |

You're not competing with other pitches. You're in a different category. Everyone else is describing. You're doing.

---

## One Last Thing: The Energy

BNI mornings are structured, professional, and a little sleepy. You have permission to break the pattern. When you pull someone out of their chair at 7:15am and their phone buzzes 20 seconds later with a real calendar invite, the ENERGY in the room shifts. People sit up. They put their phones down. They look at you differently.

That energy is your brand. You're not the guy who talks about AI. You're the guy who made AI happen in the room, to a real person, in real-time, before the coffee got cold.

Own it.

---

*This document is part of the Cash-Is-King strategy set. See Doc 04 (Day One List Playbook) for the full event strategy and Doc 05 (Grand Slam Offer v2) for the experiential beta access system.*
