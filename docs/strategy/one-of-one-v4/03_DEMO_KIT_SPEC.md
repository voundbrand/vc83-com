# One-of-One Strategy v4 — Demo Kit Spec

| Field | Value |
|-------|-------|
| **Document** | 03 — Demo Kit Spec |
| **Date** | 2026-03-18 |
| **Classification** | Internal — Founder's Eyes Only |

---

## Demo Business: "Schröder & Partner Rechtsanwälte"

A fictional mid-size Arbeitsrecht Kanzlei configured to showcase the full intake flow.

---

## Firm Profile

| Field | Value |
|-------|-------|
| **Name** | Schröder & Partner Rechtsanwälte |
| **Practice areas** | Arbeitsrecht (primary), Familienrecht (secondary), Mietrecht |
| **Size** | 8 Rechtsanwälte, 3 Rechtsanwaltsfachangestellte, 1 Empfang |
| **Locations** | 1 (Düsseldorf) |
| **Phone volume** | ~40 calls/day |
| **Software** | RA-MICRO, Outlook Calendar |
| **Pain** | Empfang besetzt → Mailbox → Mandanten rufen woanders an. Mittagspause, nach 18 Uhr, Samstag: niemand da. |

---

## Agent Configuration

### Agent 1: Clara (Empfang / Rezeption)

| Field | Value |
|-------|-------|
| **Role** | First point of contact. Answers every call. |
| **Greeting** | "Kanzlei Schröder und Partner, guten Tag! Mein Name ist Clara. Wie kann ich Ihnen helfen?" |
| **Capabilities** | Route by practice area, capture caller details, answer standard questions (Öffnungszeiten, Adresse, Parkplätze, Erstberatungshonorar) |
| **Knowledge base** | Firm FAQ, lawyer profiles, office hours, directions, Erstberatung pricing (€250 + MwSt.) |
| **Transfers to** | Jonas (qualification) or Maren (booking) depending on caller intent |
| **Escalation** | "Einen Moment bitte, ich verbinde Sie mit dem zuständigen Anwalt" → transfer to human |

### Agent 2: Jonas (Mandatsqualifizierung)

| Field | Value |
|-------|-------|
| **Role** | Qualifies the legal matter. Determines urgency and practice area. |
| **Trigger** | Clara transfers when caller has a legal matter (not just a question) |
| **Qualification flow** | |

**Arbeitsrecht qualification:**
1. "Haben Sie eine Kündigung erhalten?" (Yes/No)
2. If yes: "Wann haben Sie die Kündigung erhalten?" (Date → calculate 3-Wochen-Frist)
3. "Wie lange sind Sie bei dem Arbeitgeber beschäftigt?" (Betriebszugehörigkeit)
4. "Haben Sie einen Betriebsrat?" (Relevant for process)
5. "Haben Sie bereits eine Rechtsschutzversicherung?" (Payment question)

**Familienrecht qualification:**
1. "Geht es um eine Trennung oder Scheidung?"
2. "Leben Sie bereits getrennt? Seit wann?" (Trennungsjahr)
3. "Gibt es gemeinsame Kinder?" (Sorgerecht/Umgangsrecht)
4. "Gibt es Streit um Unterhalt oder Vermögen?"

**Urgency assessment:**
- **Dringend (same-day Rückruf):** Kündigung mit laufender Frist (<2 weeks), Gewaltschutz, Strafverfahren
- **Priorität (next-day Termin):** Kündigung (Frist >2 weeks), Trennung mit Kindern, Räumungsklage
- **Normal (within 1 week):** Allgemeine Beratung, Vertragsprüfung, Mietminderung

| Field | Value |
|-------|-------|
| **Output** | Structured intake summary: practice area, urgency, key facts, caller details |
| **Transfers to** | Maren (booking) with full context |

### Agent 3: Maren (Terminbuchung)

| Field | Value |
|-------|-------|
| **Role** | Books the Erstberatung appointment |
| **Trigger** | Jonas transfers after qualification complete |
| **Booking flow** | |

1. "Ich buche Ihnen gerne einen Termin zur Erstberatung. Wann passt es Ihnen am besten — vormittags oder nachmittags?"
2. Check lawyer availability (practice-area-matched)
3. Offer 2-3 slots: "Ich habe am Dienstag um 10 Uhr bei Herrn Dr. Schröder oder am Mittwoch um 14 Uhr bei Frau Weber. Was passt Ihnen besser?"
4. Confirm: "Ich habe Sie eingetragen für Dienstag, 10 Uhr, bei Herrn Dr. Schröder. Sie erhalten eine Bestätigung per E-Mail."
5. Capture: Name, Telefon, E-Mail

| Field | Value |
|-------|-------|
| **Calendar** | Books directly in lawyer's Outlook/Google Calendar |
| **Confirmation** | Email to caller + email to assigned lawyer with intake summary |
| **Fallback** | If no slots available: "Leider sind diese Woche alle Termine belegt. Darf ich Sie auf unsere Warteliste setzen? Wir melden uns, sobald ein Termin frei wird." |

---

## Demo Scenarios

### Scenario 1: "Ich wurde gekündigt" (Primary demo — 3 minutes)

> Caller: "Guten Tag, ich habe gestern meine Kündigung bekommen und weiß nicht, was ich tun soll."
>
> Clara → Jonas (Arbeitsrecht qualification: Kündigung gestern = 3-Wochen-Frist aktiv, DRINGEND) → Maren (Erstberatung morgen, 10 Uhr, Dr. Schröder)
>
> **End state:** Caller has a booked appointment, lawyer has an intake summary in their inbox.

### Scenario 2: "Mein Vermieter hat mir gekündigt" (2 minutes)

> Caller: "Mein Vermieter will, dass ich ausziehe. Was kann ich tun?"
>
> Clara → Jonas (Mietrecht qualification: Kündigung? Wann? Grund?) → Maren (Termin nächste Woche, Frau Weber)

### Scenario 3: "Wann haben Sie geöffnet?" (30 seconds, no transfer)

> Caller: "Wann sind Sie erreichbar?"
>
> Clara: "Unsere Kanzlei ist montags bis freitags von 8 bis 18 Uhr besetzt. Samstags erreichen Sie uns über diese Nummer von 9 bis 13 Uhr. Kann ich sonst noch etwas für Sie tun?"
>
> **No transfer needed.** Clara handles directly from knowledge base.

### Scenario 4: After-hours call (demonstrates 24/7 value)

> Caller calls at 21:00: "Ich brauche dringend einen Anwalt."
>
> Clara: "Guten Abend, Kanzlei Schröder und Partner. Unsere Anwälte sind aktuell nicht im Büro, aber ich kann Ihnen sofort weiterhelfen. Um was geht es?"
>
> → Full qualification → Booking for first available slot tomorrow morning
>
> **The money shot:** This is the call that would have gone to voicemail. The caller would have hung up and called another Kanzlei tomorrow.

---

## What to Watch For (Demo Checklist)

Share this with the managing partner after the first call:

| # | Feature | What You'll Notice |
|---|---------|-------------------|
| 1 | **Natural German** | Clara spricht fließend Deutsch, nicht wie ein Roboter |
| 2 | **Practice area routing** | Die KI erkennt automatisch ob Arbeitsrecht, Familienrecht oder Mietrecht |
| 3 | **Urgency detection** | Frist-relevante Fälle werden als dringend markiert |
| 4 | **Calendar booking** | Der Termin steht direkt im Kalender des zuständigen Anwalts |
| 5 | **Structured intake** | Sie erhalten eine E-Mail mit allen relevanten Informationen |
| 6 | **24/7 coverage** | Rufen Sie ruhig abends oder am Wochenende an — Clara ist immer da |
| 7 | **Smooth handoffs** | Der Übergang zwischen Clara, Qualifizierung und Buchung fühlt sich wie ein Gespräch an |

---

## Demo Kit Deliverables

| Component | Format | Purpose |
|-----------|--------|---------|
| **Demo phone number** | German local number (+49...) | Managing partner calls it, shares it with colleagues |
| **1-Pager** | PDF (German) | "Die KI-Kanzleiassistenz" — features, stats, pricing preview |
| **ROI calculator** | Simple spreadsheet or web tool | Plug in: calls/day, missed %, Erstberatungshonorar → monthly ROI |
| **What to Watch For** checklist | PDF or printed card | Guides the demo experience |
| **Call audit offer** | Verbal + follow-up email | "2 Wochen kostenlos testen — leiten Sie einfach Ihre Überlauf-Anrufe um" |

---

*Created: March 2026*
*Status: Operative — build demo agents on ElevenLabs, configure Schröder & Partner profile*
*Next step: Configure Clara/Jonas/Maren with Schröder & Partner knowledge base, test 50+ scenarios*
