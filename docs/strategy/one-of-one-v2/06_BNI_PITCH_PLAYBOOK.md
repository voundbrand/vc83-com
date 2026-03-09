# Document 06: BNI Pitch & Live Demo Playbook

**Seven Layers | One-of-One Strategy v2**
**Date:** 2026-03-03
**Classification:** Internal — Founder's Eyes Only
**Purpose:** The 45-60 second BNI pitch + live demo choreography. Make it unforgettable.

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

### Deterministic Failover Choreography (Primary + Fallback)

Use this exact run card to preserve trust and keep the demo inside 20-60 seconds.

| Time | Branch | Operator line (German) | Runtime intent |
|---|---|---|---|
| `0:00-0:18` | Primary start | "Ich starte mit der Brille. Gleicher Ablauf, kurze Live-Demo." | Meta glasses ingress begins; identify-from-name-tag path. |
| `0:18-0:28` | Primary continue | "Agent, wer steht vor mir?" + slot capture question | CRM lookup/create + scheduling extraction. |
| `0:28-0:36` | Fallback trigger (if needed) | "Wir schalten jetzt auf iPhone-Kamera um, gleicher Ablauf." | Immediate camera-source swap to iPhone; no restart, no branch drift. |
| `0:36-0:46` | Both branches | "Vorschau ist bereit, ich sende erst nach deiner Bestätigung." | Preview-first gate, explicit approval before mutating send. |
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

**[0:18 — Face to face. Same demo as Option A: name tag -> contact check -> schedule 1:1 -> read phone -> send invite.]**

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
| 3-5 people approach you during the break | Don't sell. Ask: "Was macht ihr?" Listen. Then: "Schau dir mal sevenlayers.io an — red mit meiner KI, die macht in 7 Minuten eine Analyse für dein Geschäft. Kostenlos." |
| Someone asks "Was kostet das?" | "Die Analyse ist kostenlos und dauert 7 Minuten. Danach reden wir, ob's passt." |
| Someone asks "Wie funktioniert das technisch?" | "Kurze Antwort: dein Handy hat eine Kamera. Mein Agent nutzt sie. Lange Antwort: erzähl ich dir beim Eins-zu-eins. Wann hast du Zeit?" |
| The chapter president approaches | "Das war beeindruckend. Wollen Sie regelmäßig kommen?" -> "Gerne. Gibt's in Ihrem Kapitel schon jemanden für KI oder Technologie?" (You're checking if the seat is open.) |
| Someone says "Das glaub ich nicht" | "Dann zeig ich's dir. Steh auf." -> Do the demo AGAIN, one-on-one. The skeptic who gets converted in front of others is your best advocate. |

### The Follow-Up (Same Day)

Send a WhatsApp message to everyone you spoke with:

> "Hey [Name], schön dich heute Morgen kennengelernt zu haben. Geh mal auf sevenlayers.io — meine KI macht in 7 Minuten eine kostenlose Analyse für dein Geschäft. Danach weißt du genau, wo der größte Hebel liegt. Meld dich, wenn du Fragen hast!"

### The Follow-Up (Day 3)

To anyone who completed the diagnostic:

> "Hey [Name], meine KI hat mir erzählt, dass sie schon einiges über [ihr Geschäft] analysiert hat. Was ist dein erster Eindruck?"

This is not a sales message. It's a curiosity message. Their response tells you if they're warm.

### The Follow-Up (Day 7)

To engaged prospects:

> "Hey [Name], hast du dir die Analyse angeschaut? Wenn du willst, zeig ich dir in 15 Minuten, was ein voller Operator für dein Geschäft tun kann. [Calendly-Link]"

---

## Event Preparation Checklist

### 2 Weeks Before

| # | Task | Status |
|---|---|---|
| 1 | Confirm attendance at the event | |
| 2 | Ask Besucher-Koordinator: "Darf ich eine kurze Live-Demonstration machen? Dauert 45 Sekunden, brauche keinen Beamer." | |
| 3 | Decide: Option A, B, or C (or rehearse all three and decide based on room energy) | |
| 4 | Test the full demo scenario 5 times at home | |
| 5 | Print simple cards with QR code to sevenlayers.io (25 per event) | |

### 1 Week Before

| # | Task | Status |
|---|---|---|
| 6 | Run the demo with a friend acting as volunteer | |
| 7 | Test on different WiFi / cellular conditions | |
| 8 | Prepare the backup (phone camera version) | |
| 9 | Write the WhatsApp follow-up messages (templates ready to personalize) | |

### Day Before

| # | Task | Status |
|---|---|---|
| 10 | Charge Meta glasses fully | |
| 11 | Test WhatsApp + calendar integration one more time | |
| 12 | Set phone hotspot as WiFi backup | |
| 13 | Lay out what you're wearing (look sharp but approachable — no suit, but clean and confident) | |
| 14 | Set alarm for 5:45am (arrive early, scope the room, test WiFi) | |

### Morning Of

| # | Task | Status |
|---|---|---|
| 15 | Arrive 20 min early | |
| 16 | Test WiFi in the room (or confirm hotspot works) | |
| 17 | Do one silent test run of the demo (not in front of people) | |
| 18 | Put glasses on forehead. Relax. Have coffee. Chat casually. | |
| 19 | When your turn comes: breathe, stand, perform. | |

---

## What Success Looks Like

### Minimum (Per Event)

- 5+ people approach you during networking breaks
- 10+ cards distributed (QR to sevenlayers.io)
- 3+ 1:1 meetings scheduled (using the glasses, live, like in the demo)
- 1 invitation to come back as a regular guest or member

### Target

- 10+ people approach you
- 20+ cards distributed
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
| Business card handoff | QR code handoff (diagnostic starts immediately) |
| Forgotten by lunch | Talked about for weeks |

You're not competing with other pitches. You're in a different category. Everyone else is describing. You're doing.

---

## The Energy

BNI mornings are structured, professional, and a little sleepy. You have permission to break the pattern. When you pull someone out of their chair at 7:15am and their phone buzzes 20 seconds later with a real calendar invite, the ENERGY in the room shifts. People sit up. They put their phones down. They look at you differently.

That energy is your brand. You're not the guy who talks about AI. You're the guy who made AI happen in the room, to a real person, in real-time, before the coffee got cold.

Own it.

---

## Option D — Non-Tech Backup Pitches (Sinek/Fisher Method)

**For when you don't have the glasses, don't want to demo, or the audience isn't tech-receptive.** No product name. No platform. No jargon. Pure problem-first storytelling.

### Framework

| Principle | Source | Application |
|---|---|---|
| Start with Why | Simon Sinek | Open with conviction, not a job title. "Ich bin fest davon überzeugt, dass..." |
| Golden Circle | Simon Sinek | Why → How → What. Never lead with What. |
| Just Cause | Simon Sinek | Paint a future that doesn't exist yet. Let their imagination finish the sentence. |
| Short sentences | Jefferson Fisher | "Sechzig. Mindestens." — No compound sentences. Period. Full stop. |
| Strategic silence | Jefferson Fisher | Pause BEFORE the important line, not after. Silence = authority. |
| No hedging | Jefferson Fisher | Zero "eigentlich", "sozusagen", "vielleicht". State facts. |
| Land the plane | Jefferson Fisher | Make your point. Stop talking. No "Habt ihr noch Fragen?" |
| Don't justify | Jefferson Fisher | Say WHAT happened, not HOW it works. Numbers speak. |

### Delivery Rules

1. **Half the speed you think.** If it feels uncomfortably slow, it's perfect.
2. **Pick one person for eye contact.** Hold for a full sentence. Then move.
3. **No smile at the start.** Calm. Serious. The smile comes later, if at all.
4. **Hands still.** No gestures until the key line. Then one gesture, max.
5. **Stand where you are.** Don't walk to the front. Own your spot.

---

### D1: 30-Sekunden-Pitch — "Woran ich glaube"

**[0:00 — Aufstehen. Stille. 3 Sekunden. Kein Lächeln.]**

> "Ich bin Remington."

**[0:04 — Pause.]**

> "Ich bin fest davon überzeugt, dass kein Unternehmer abends um zehn E-Mails beantworten sollte. Dass niemand Aufträge verlieren sollte, weil er zu langsam war. Und dass 'alles selber machen' kein Geschäftsmodell ist."

**[0:16 — Pause. Ein Blick durch den Raum.]**

> "Ich baue Unternehmern ihre rechte Hand. Private KI. Die antwortet, bucht und fasst nach. Ab Tag eins."

**[0:24 — Pause.]**

> "Die Arbeit verschwindet nicht. Die Frage ist, wer sie macht."

**[0:27 — Hinsetzen.]**

---

### D2: 1-Minuten-Pitch — "Der Handwerkermeister"

**[0:00 — Aufstehen. Stille.]**

> "Ich bin Remington."

**[0:03 — Pause.]**

> "Letzte Woche hab ich einen Handwerkermeister gefragt: Wie viele Stunden arbeitest du pro Woche?"

> "Sechzig. Mindestens."

**[0:12 — Pause.]**

> "Dann hab ich gefragt: Wie viele davon sind Handwerk?"

> "Er hat gelacht. Vielleicht zwanzig."

**[0:20 — Pause. Blickkontakt.]**

> "Vierzig Stunden pro Woche. E-Mails. Angebote. Termine. Nachfassen. Vierzig Stunden, die nichts mit seinem Können zu tun haben."

> "Das ist kein Einzelfall. Das ist fast jeder in diesem Raum."

**[0:32 — Pause.]**

> "Ich bin fest davon überzeugt, dass Unternehmer das tun sollten, wofür sie angetreten sind. Nicht den Rest."

> "Deshalb baue ich Unternehmern eine rechte Hand. Keinen Chatbot. Keine vorgefertigte Lösung. Private KI, die eure Prozesse lernt, Anfragen beantwortet und Termine einbucht. Eigenständig."

**[0:46 — Pause.]**

> "Der Handwerker hat jetzt eine. Seit einer Woche. Vierzehn Anfragen beantwortet. Sechs Termine gebucht. Null Stunden dafür investiert."

**[0:54 — Stille. Wirken lassen.]**

> "Die Frage ist nicht ob. Die Frage ist wann."

> "Die Arbeit verschwindet nicht. Die Frage ist, wer sie macht."

**[0:60 — Hinsetzen.]**

---

### D3: 1-Minuten-Pitch — "Die Liste" (The List)

**The admin-pain version.** Maximum recognition. Every sentence is a gut punch because they're living it right now. Stack the specifics until the room is nodding, then offer the way out.

**[0:00 — Aufstehen. Stille. Kein Lächeln.]**

> "Ich bin Remington."

**[0:03 — Pause. Blickkontakt mit einer Person.]**

> "Ich hab eine Frage. Wer hat heute Morgen vor diesem Termin schon mindestens drei Dinge erledigt, die nichts mit dem zu tun haben, wofür er sein Geschäft gegründet hat?"

**[0:12 — Hände gehen hoch. Lächeln im Raum.]**

> "Urlaubsplanung für zwanzig Leute. Wer darf wann. Wer vertritt wen. Wer beschwert sich."

**[0:18 — Pause.]**

> "Rechnungen hinterherlaufen. Sechzig Tage überfällig. Beim Kunden, den man nicht verlieren will."

**[0:23 — Pause.]**

> "Onboarding-Mails schreiben. Zum vierzehnten Mal. Die gleiche Mail. Für den neuen Mitarbeiter."

**[0:28 — Pause. Langsamer werden.]**

> "Drei Versicherungsangebote vergleichen. Dreißig Lieferantenrechnungen prüfen. Spesen freigeben, die seit zwei Wochen im Posteingang liegen."

**[0:36 — Stille. Blick durch den Raum.]**

> "Keiner von uns hat sein Geschäft gegründet, um das zu tun. Aber keiner von uns kann es abgeben. Weil niemand sonst den vollen Überblick hat."

**[0:44 — Pause.]**

> "Bis jetzt."

**[0:46 — Pause. Wirken lassen.]**

> "Ich baue Unternehmern ihre rechte Hand. Keine vorgefertigte Lösung. Keine Unternehmensberatung. Private KI, die eure Prozesse lernt — nicht umgekehrt. Und den Verwaltungskram übernimmt, den nur ihr machen konntet. Ab Tag eins."

**[0:54 — Stille.]**

> "Die Arbeit verschwindet nicht. Die Frage ist, wer sie macht."

**[0:58 — Hinsetzen.]**

---

### D3-EN: 1-Minute Pitch — "The List" (English)

**[0:00 — Stand up. Silence. No smile.]**

> "I'm Remington."

**[0:03 — Pause. Eye contact with one person.]**

> "Quick question. Who here has already done at least three things this morning that have nothing to do with why you started your business?"

**[0:12 — Hands go up. Smiles in the room.]**

> "Planning vacation for a team of twenty. Who goes when. Who covers whom. Who complains."

**[0:18 — Pause.]**

> "Chasing invoices. Sixty days overdue. From the client you can't afford to lose."

**[0:23 — Pause.]**

> "Writing the onboarding email. For the fourteenth time. Same email. New hire."

**[0:28 — Pause. Slow down.]**

> "Comparing three insurance quotes. Reviewing thirty supplier invoices. Approving expense reports that have been sitting in your inbox for two weeks."

**[0:36 — Silence. Scan the room.]**

> "None of us started a business to do this. But none of us can hand it off. Because nobody else has the full picture."

**[0:44 — Pause.]**

> "Until now."

**[0:46 — Pause. Let it land.]**

> "I build business owners their right hand. No off-the-shelf solution. No consulting. Private AI that learns your processes — not the other way around. And takes over the admin only you could do. From day one."

**[0:54 — Silence.]**

> "The work doesn't disappear. The question is who does it."

**[0:58 — Sit down.]**

---

### Why D3 "Die Liste" Hits Different

| Element | Why It Works |
|---|---|
| **The opening question** | Interactive. Gets hands up. Breaks the BNI monotony. Everyone answers yes. |
| **The stack** | Each admin task is one sentence. Each one lands. By the third, they're nodding. By the fifth, they're uncomfortable. That's the point. |
| **Specificity** | Not "admin work." Vacation planning for twenty. Fourteen onboarding emails. Sixty-day invoices. The more specific, the more they see themselves. |
| **"Keiner von uns kann es abgeben"** | Names the real trap. It's not that they're bad at delegating. It's that this work requires the full picture — and only they have it. That's the problem the right hand solves. |
| **"Bis jetzt."** | Two words. Biggest turn in the pitch. Everything before was the problem. Everything after is the future. Fisher would deliver this at half speed. |
| **No tech explanation** | Doesn't say how. Doesn't say AI agent. Doesn't say machine learning. Says "rechte Hand" and "Private KI." The owner doesn't care how. They care that the pile goes away. |
| **"Keine vorgefertigte Lösung. Keine Unternehmensberatung."** | Every owner in the room has been burned by both. Software that made them change their workflow. Consultants who delivered a deck and left. Two negations. Two wounds. Then the kicker: "die eure Prozesse lernt — nicht umgekehrt." YOUR processes. Not ours. Not a template. Yours. |
| **Enhancement frame** | "Den Verwaltungskram, den nur ihr machen konntet" — acknowledges that this work required THEM. The right hand doesn't replace them. It handles the work that was beneath their capability but above everyone else's context. |

### When to Use D3 vs. D1/D2

| Situation | Use |
|---|---|
| Room is mostly service businesses (agencies, trades, consultancies) | **D3** — the admin list is their daily life |
| Room has a lot of solo founders or very small teams (1-3 people) | **D2** — the craftsman story resonates more personally |
| You have 30 seconds, not 60 | **D1** — tightest version |
| You want maximum audience interaction | **D3** — the opening question gets hands up and energy moving |
| Return visit, they already heard D2 last time | **D3** — different angle, same conviction |

---

### D5: 1-Minuten-Pitch — "Wertschöpfung" (Value Creation)

**The strategic version.** No list. No story. One question, repeated. Forces the room to audit their own time against value creation — in real-time, silently, in their own heads. Then you name the gap. Then you fill it. For the sophisticated owner who thinks in systems, not tasks.

**[0:00 — Aufstehen. Stille. Kein Lächeln.]**

> "Ich bin Remington."

**[0:03 — Pause. Blickkontakt mit einer Person.]**

> "Ich hab eine Frage. Und ich bitte euch, ehrlich zu antworten. Nicht mir. Euch selbst."

**[0:10 — Pause.]**

> "Heute Morgen. E-Mails sortieren. Ist das ein wertschöpfender Prozess?"

**[0:15 — Stille. Wirken lassen. Nicht weiterreden, bis man sieht, dass sie nachdenken.]**

> "Urlaubsanträge prüfen. Wertschöpfend?"

**[0:19 — Pause.]**

> "Rechnungen hinterherlaufen. Wertschöpfend?"

**[0:22 — Pause.]**

> "Spesen freigeben. Angebote nachfassen. Terminbestätigungen verschicken."

**[0:27 — Pause. Langsamer werden.]**

> "Wertschöpfend?"

**[0:29 — Stille. Blick durch den Raum.]**

> "Rechnet mal kurz. Wie viele Stunden pro Woche verbringt ihr — die teuerste Person im Unternehmen — mit Prozessen, die keinen Wert schaffen?"

**[0:38 — Pause.]**

> "Zehn? Zwanzig? Dreißig?"

**[0:42 — Stille. Wirken lassen.]**

> "Genau an diese Prozesse setze ich meine Software an. Nicht an eure wertschöpfende Arbeit. Die könnt nur ihr. Sondern an alles drumherum."

**[0:50 — Pause.]**

> "Keine vorgefertigte Lösung. Keine Unternehmensberatung. Private KI, die sich an eure Prozesse anpasst — und die nicht-wertschöpfenden Stunden optimiert. Nicht umgekehrt."

**[0:58 — Stille.]**

> "Die Arbeit verschwindet nicht. Die Frage ist, wer sie macht."

**[0:60 — Hinsetzen.]**

---

### D5-EN: 1-Minute Pitch — "Value Creation" (English)

**[0:00 — Stand up. Silence. No smile.]**

> "I'm Remington."

**[0:03 — Pause. Eye contact with one person.]**

> "I have a question. And I'm asking you to answer it honestly. Not to me. To yourself."

**[0:10 — Pause.]**

> "This morning. Sorting emails. Is that a value-creating process?"

**[0:15 — Silence. Let them think. Don't continue until you see them reflecting.]**

> "Reviewing time-off requests. Value-creating?"

**[0:19 — Pause.]**

> "Chasing invoices. Value-creating?"

**[0:22 — Pause.]**

> "Approving expenses. Following up on proposals. Sending calendar confirmations."

**[0:27 — Pause. Slow down.]**

> "Value-creating?"

**[0:29 — Silence. Scan the room.]**

> "Do the math. How many hours per week does the most expensive person in your company spend on processes that create no value?"

**[0:38 — Pause.]**

> "Ten? Twenty? Thirty?"

**[0:42 — Silence. Let it land.]**

> "That's exactly where my software sits. Not on your value-creating work. That's yours. Only you can do that. But on everything around it."

**[0:50 — Pause.]**

> "No off-the-shelf solution. No consulting. Private AI that adapts to your processes — and optimizes the hours that create no value. Not the other way around."

**[0:58 — Silence.]**

> "The work doesn't disappear. The question is who does it."

**[0:60 — Sit down.]**

---

### Why D5 "Wertschöpfung" Hits Different Than D3

| Element | Why It Works |
|---|---|
| **"Ist das ein wertschöpfender Prozess?"** | One question, repeated. Every time you ask it, they answer silently in their head. By the fourth time, they're uncomfortable. They've never audited their own time like this. You just made them do it in public. |
| **The repetition** | "Wertschöpfend?" becomes a refrain. Like a drumbeat. Fisher would approve — same word, same cadence, same weight, every time. It builds pressure. |
| **"Rechnet mal kurz"** | You're asking them to do actual math. In their head. Right now. "How many hours?" Ten, twenty, thirty. They're calculating. That's not a pitch anymore — that's a mirror. |
| **"Die teuerste Person im Unternehmen"** | That's them. You just called them the most expensive person in their own company and showed them how many hours of their cost are wasted on non-value work. CFO logic applied to their own calendar. |
| **"Nicht an eure wertschöpfende Arbeit. Die könnt nur ihr."** | The enhancement frame, stated explicitly. Your value-creating work is YOURS. Only you can do that. The software doesn't touch it. It takes everything else. |
| **"Optimiert"** | Not "eliminates." Not "automates." Optimizes. The processes still exist, still serve the business — they just stop consuming the owner. That's the right word for a sophisticated buyer. |
| **No story, no demo, no list** | D2 tells a story. D3 stacks a list. D5 asks a question. Three completely different rhetorical tools for three different room energies. |
| **No "Die Frage ist nicht ob"** | D5 doesn't need the Sinek closer. The math IS the closer. They've already calculated their own gap. The question answered itself. You just sit down. |

### When to Use D5 vs. D1/D2/D3

| Situation | Use |
|---|---|
| Room of sophisticated owners (Vistage-level, EOS-familiar, strategic thinkers) | **D5** — they think in value creation and systems, not task lists |
| Room with a mix of trades, services, and professional firms | **D3** — the admin list is more universal and visceral |
| Room of mostly hands-on trades (electricians, plumbers, craftsmen) | **D2** — the craftsman story is their story |
| You want to position as a strategist, not a tech vendor | **D5** — "wertschöpfend" is business language, not tech language |
| Return visit, they've heard D2 and D3 | **D5** — completely different angle, highest sophistication level |
| You have 30 seconds, not 60 | **D1** — tightest version |

---

### E: 1-Minuten-Pitch — "Das muss trotzdem passieren" (It Still Needs to Happen)

**The weight pitch.** Names the full weight of administrative work — both the tasks that make money and the ones that don't. The business doesn't care which ones are fun. It just needs them done. And right now, the owner is doing all of them. The pitch stacks that weight until it's undeniable, then offers one sentence of relief: "Dafür baue ich Systeme." No consulting. No off-the-shelf. Systems built on your processes.

**[0:00 — Aufstehen. Stille. Kein Lächeln.]**

> "Ich bin Remington."

**[0:03 — Pause. Blickkontakt.]**

> "In eurem Unternehmen gibt es Dinge, die Geld bringen. Und Dinge, die erledigt werden müssen, obwohl sie kein Geld bringen."

**[0:10 — Pause.]**

> "Eurem Unternehmen ist es völlig egal, welche davon euch Spaß machen. Es will nur, dass sie passieren."

**[0:16 — Pause. Wirken lassen. Einige werden lachen. Nicht mitlachen. Ruhig bleiben.]**

> "Angebote nachfassen. Bringt Geld. Muss passieren."

**[0:20 — Pause.]**

> "Urlaubsplanung für zwanzig Leute. Bringt kein Geld. Muss trotzdem passieren."

**[0:24 — Pause.]**

> "Rechnungen hinterherlaufen, die seit sechzig Tagen offen sind. Bringt Geld. Muss passieren."

**[0:27 — Pause.]**

> "Arbeitszeugnisse schreiben. Bringt kein Geld. Muss trotzdem passieren."

**[0:30 — Pause.]**

> "Alte Kontakte reaktivieren, die seit Monaten nichts gehört haben. Bringt Geld. Muss passieren."

**[0:34 — Pause.]**

> "Buchhaltung abstimmen. Bringt kein Geld. Muss trotzdem passieren."

**[0:37 — Stille. Blick durch den Raum.]**

> "Das ist der Verwaltungsberg. Er wird nicht kleiner. Er wächst jede Woche. Und am Ende des Tages sitzt ihr dran — weil es sonst keiner macht."

**[0:46 — Pause. Langsamer werden.]**

> "Dafür baue ich Systeme. Keine vorgefertigte Lösung. Keine Unternehmensberatung. Private KI, die eure Prozesse lernt. Die nachfasst. Die bucht. Die antwortet. Ob es Geld bringt oder nicht — es passiert. Ohne euch."

**[0:58 — Stille.]**

> "Die Arbeit verschwindet nicht. Die Frage ist, wer sie macht."

**[1:00 — Hinsetzen.]**

---

### E-EN: 1-Minute Pitch — "It Still Needs to Happen" (English)

**[0:00 — Stand up. Silence. No smile.]**

> "I'm Remington."

**[0:03 — Pause. Eye contact.]**

> "In your business, there are things that make money. And things that need to get done even though they don't make money."

**[0:10 — Pause.]**

> "Your business does not care which ones are fun for you. It just needs them to happen."

**[0:16 — Pause. Let it land. Some will laugh. Don't laugh with them. Stay calm.]**

> "Following up on proposals. Makes money. Needs to happen."

**[0:20 — Pause.]**

> "Vacation planning for twenty people. Doesn't make money. Needs to happen anyway."

**[0:24 — Pause.]**

> "Chasing invoices that are sixty days overdue. Makes money. Needs to happen."

**[0:27 — Pause.]**

> "Writing employment references. Doesn't make money. Needs to happen anyway."

**[0:30 — Pause.]**

> "Reactivating old contacts who haven't heard from you in months. Makes money. Needs to happen."

**[0:34 — Pause.]**

> "Reconciling the books. Doesn't make money. Needs to happen anyway."

**[0:37 — Silence. Scan the room.]**

> "That's the admin mountain. It doesn't shrink. It grows every week. And at the end of the day, you're the one sitting there — because nobody else will."

**[0:46 — Pause. Slow down.]**

> "That's what I build systems for. No off-the-shelf solution. No consulting. Private AI that learns your processes. It follows up. It books. It answers. Whether it makes money or not — it happens. Without you."

**[0:58 — Silence.]**

> "The work doesn't disappear. The question is who does it."

**[1:00 — Sit down.]**

---

### Why E "Das muss trotzdem passieren" Hits Different Than D5

| Element | Why It Works |
|---|---|
| **"Verwaltungsberg"** | Every owner knows the admin mountain. It's not a metaphor — it's Monday morning. Naming it makes the invisible weight visible. And the kicker: "Er wird nicht kleiner. Er wächst jede Woche." That's the truth nobody says out loud. |
| **Both types of processes** | D5 only talked about non-value-creating work. E says: BOTH types eat your time. Following up on proposals makes money — but you're still sitting there doing it at 9pm. This is more honest and more complete. And it makes the product easier to sell: agents that touch revenue have obvious ROI. |
| **"Bringt Geld. Muss passieren." / "Bringt kein Geld. Muss trotzdem passieren."** | The alternating cadence. Money / no money / money / no money. Fisher rhythm. By the fourth beat, the pattern is clear: it ALL needs to happen. The question isn't which tasks matter. The question is who does them. |
| **Six beats, not four** | The extended stack gives the cadence time to fully land. By beat three, they get the pattern. By beat six, they feel the weight. Each additional pair makes the mountain taller. |
| **Specific details** | "Urlaubsplanung für zwanzig Leute." "Arbeitszeugnisse schreiben." "Alte Kontakte reaktivieren." "Buchhaltung abstimmen." Not abstract admin — the exact tasks that make owners groan. D3's specificity meets E's structural argument. |
| **"Völlig egal"** | "Your business doesn't care which ones are fun." Confrontational. True. Fisher's principle: say the thing nobody else will say. |
| **"Weil es sonst keiner macht"** | The loneliest sentence in the pitch. Every owner has thought this. You're not describing a staffing problem — you're naming the weight of ownership itself. The admin isn't hard. It's that it's always yours. |
| **"Dafür baue ich Systeme"** | Not "I build AI." Not "I build agents." "I build systems." That's the word a $1-2M owner respects. Systems are how businesses scale. Systems are how owners get free. Systems are what EOS and Vistage teach. You're speaking their language. |
| **"Ob es Geld bringt oder nicht — es passiert. Ohne euch."** | The closer. Three beats. Revenue or not — it gets done — without you. This is the relief sentence. After 40 seconds of stacking weight, you lift it in one line. Fisher landing. No extra words. |
| **Revenue-adjacent agents** | Three of six beats directly touch revenue: following up proposals, chasing invoices, reactivating contacts. That's the easiest ROI conversation at the coffee: "How much is a missed follow-up worth to you?" You're not selling admin relief — you're selling money recovery. |
| **Reactivation** | "Alte Kontakte reaktivieren" — every owner has a CRM full of dormant leads they know they should reach out to. Nobody does. It's the perfect AI use case: systematic, personalized outreach at scale. And it plants a seed: the right hand doesn't just handle today's tasks, it resurfaces dormant revenue. |
| **Buchhaltung** | Undeniable pure admin. Legally required. Brings zero revenue. Every owner knows the pain of month-end reconciliation. Pairs perfectly with the revenue tasks — you handle the money AND the paperwork around the money. |
| **Arbeitszeugnisse** | The ultimate "pure admin" task. Legally required in Germany. Takes hours. Brings zero revenue. Every owner in the room has procrastinated on one. And it's a perfect AI use case: structured, templated, personalizable. |

### The Rhetorical Ladder: D2 → D3 → D5 → E

| Pitch | Tool | Target | Emotional Register |
|---|---|---|---|
| **D2** "Handwerkermeister" | Story | Gut — they see themselves in the craftsman | Empathy |
| **D3** "Die Liste" | List | Stomach — each task is a gut punch | Recognition |
| **D5** "Wertschöpfung" | Question | Head — they calculate their own gap | Analysis |
| **E** "Das muss trotzdem passieren" | Weight | Shoulders — they feel the admin mountain | Relief |

Each pitch climbs the ladder. D2 makes them feel. D3 makes them nod. D5 makes them think. E makes them exhale. Choose based on the room, the energy, and what the audience needs to hear.

### When to Use E vs. D5/D3/D2

| Situation | Use |
|---|---|
| Room of owners who look tired, not inspired — they're drowning in admin | **E** — you name the weight before you offer the lift |
| You want to position as a systems builder, not a tech vendor | **E** — "I build systems" lands differently than "I build AI" |
| Room where the ROI conversation matters (CFOs, accountants present) | **E** — you show agents that touch revenue AND agents that save time |
| Owner-operators who are visibly stuck and know it | **E** — the "Verwaltungsberg" metaphor names what they can't articulate |
| First visit, nobody knows you yet | **D2 or D3** — earn trust with empathy before weight |
| Room is skeptical or arms-crossed | **D5** — math disarms skeptics better than metaphor |
| You want maximum interaction and energy | **D3** — the opening question gets hands up |
| You have 30 seconds, not 60 | **D1** — tightest version |

---

### D1-EN: 30-Second Pitch — "What I Believe" (English)

**[0:00 — Stand up. Silence. 3 seconds. No smile.]**

> "I'm Remington."

**[0:04 — Pause.]**

> "I am convinced that no business owner should be answering emails at 10pm. That nobody should lose a deal because they were too slow to respond. And that 'doing everything yourself' is not a business model."

**[0:16 — Pause. Scan the room.]**

> "I build business owners their right hand. Private AI that responds, books, and follows up. From day one."

**[0:24 — Pause.]**

> "The work doesn't disappear. The question is who does it."

**[0:27 — Sit down.]**

---

### D2-EN: 1-Minute Pitch — "The Master Craftsman" (English)

**[0:00 — Stand up. Silence.]**

> "I'm Remington."

**[0:03 — Pause.]**

> "Last week I asked a master craftsman: How many hours do you work per week?"

> "Sixty. At least."

**[0:12 — Pause.]**

> "Then I asked: How many of those are actual craft?"

> "He laughed. Maybe twenty."

**[0:20 — Pause. Eye contact.]**

> "Forty hours a week. Emails. Quotes. Scheduling. Follow-ups. Forty hours that have nothing to do with what he's actually good at."

> "That's not an outlier. That's almost everyone in this room."

**[0:32 — Pause.]**

> "I am convinced that business owners should do the thing they set out to do. Not the rest."

> "So I build business owners a right hand. Not a chatbot. Not an off-the-shelf solution. Private AI that learns your processes, answers inquiries, and books appointments. On its own."

**[0:46 — Pause.]**

> "That craftsman has his now. One week in. Fourteen inquiries answered. Six appointments booked. Zero hours spent."

**[0:54 — Silence. Let it land.]**

> "The question isn't if. The question is when."

> "The work doesn't disappear. The question is who does it."

**[0:60 — Sit down.]**

---

### Why Option D Works Without Tech

| Element | Why It Hits |
|---|---|
| **No product name** | They remember YOU, not a URL. The platform comes later, at the coffee. |
| **"Ich bin fest davon überzeugt" / "I am convinced"** | Sinek's core move, delivered with Fisher conviction. No hedging. Not "I believe" — "I am convinced." You're not sharing an opinion. You're stating a position. |
| **The Craftsman story** | Everyone in BNI IS that person. 60 hours, 20 of them doing their actual job. They see themselves. |
| **Short staccato sentences** | Fisher's signature. In a room of people giving run-on pitches, short sentences sound like authority. |
| **The pauses** | While everyone else rushes to fill 60 seconds with words, you use silence. Silence = confidence. Silence = "I don't need to convince you." |
| **No "Habt ihr Fragen?"** | Fisher's "land the plane." You made your point. You sat down. No permission-seeking. No begging. |
| **"Die Frage ist nicht ob"** | Sinek's Just Cause. You're not asking them to buy. You're telling them the future is coming — and they get to choose their seat. |
| **Real numbers** | 14 inquiries. 6 appointments. 0 hours. Not adjectives. Not promises. Results. |

### When to Use Option D vs. Options A-C

| Situation | Use |
|---|---|
| Strong WiFi, glasses working, audience is curious | **Option A, B, or C** (live tech demo) |
| No WiFi, glasses forgot to charge, tech-skeptical room | **Option D** (non-tech, story-driven) |
| First visit to a new chapter, feeling out the crowd | **Option D** (safe, universal, no tech risk) |
| Return visit, they already saw the demo last time | **Option D** (show range — last time you performed, this time you spoke) |
| Mixed audience, not all business owners | **Option D** (the craftsman story resonates universally) |
| You have 30 seconds, not 60 | **Option D1** (tightest version, no story needed) |
