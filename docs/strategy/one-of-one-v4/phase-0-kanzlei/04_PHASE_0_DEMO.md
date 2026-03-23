# Phase 0 — Kanzlei Proof: Demo Specification

| Field | Value |
|---|---|
| **Document** | Phase 0 Demo — "Schröder & Partner" Law Firm Demo |
| **Date** | 2026-03-18 |
| **Classification** | Internal — Founder's Eyes Only |

---

## Demo Business

**Schröder & Partner Rechtsanwälte** — fictional 8-lawyer Arbeitsrecht firm in Düsseldorf.

See `03_DEMO_KIT_SPEC.md` for full firm profile, agent configuration, and demo scenarios.

---

## What Phase 0 Demo Must Prove

| # | Proof Point | How |
|---|------------|-----|
| 1 | The AI sounds like a real Sekretärin | Natural German, professional greeting, no robot |
| 2 | Practice area detection works | Say "Kündigung" → Arbeitsrecht. Say "Trennung" → Familienrecht. |
| 3 | Urgency assessment works | "Kündigung gestern" → DRINGEND (Frist). "Vertragsfrage" → Normal. |
| 4 | Booking works end-to-end | Caller gets a confirmed appointment in a specific lawyer's calendar |
| 5 | The handoff is seamless | Clara → Jonas → Maren feels like one conversation |
| 6 | 24/7 works | Call at 21:00, get the same quality as 10:00 |

---

## Agent Configuration for Phase 0

### Clara (Empfang)

**System prompt key elements:**
- Greeting: "Kanzlei Schröder und Partner, guten Tag! Mein Name ist Clara."
- Answer standard questions from knowledge base
- Route to Jonas for any legal matter
- Transfer to human for emergencies or explicit request
- Never give legal advice
- Always capture caller name and phone number

**Knowledge base:**
- Office hours: Mo-Fr 8-18 Uhr, Sa 9-13 Uhr (KI-Assistenz)
- Address: Königsallee 82, 40212 Düsseldorf
- Parking: Tiefgarage Kö-Galerie, 3 Min zu Fuß
- Erstberatung: €250 zzgl. MwSt. (Arbeitsrecht), €190 zzgl. MwSt. (Familienrecht)
- Practice areas: Arbeitsrecht, Familienrecht, Mietrecht
- 8 Rechtsanwälte, davon 3 Fachanwälte für Arbeitsrecht

### Jonas (Qualifizierung)

**Arbeitsrecht qualification tree:**

```
1. "Haben Sie eine Kündigung erhalten?"
   ├─ Ja → "Wann haben Sie die Kündigung erhalten?" → Calculate Frist
   │       "Wie lange arbeiten Sie dort?" → Betriebszugehörigkeit
   │       "Gibt es einen Betriebsrat?" → Process relevance
   │       "Haben Sie eine Rechtsschutzversicherung?" → Payment
   │       → Urgency: DRINGEND if Frist < 2 weeks
   │
   └─ Nein → "Worum geht es bei Ihrem Anliegen?"
            ├─ Abmahnung → Priorität
            ├─ Arbeitszeugnis → Normal
            ├─ Aufhebungsvertrag → Priorität (often has Frist)
            ├─ Mobbing → Normal
            └─ Sonstiges → Normal
```

**Familienrecht qualification tree:**

```
1. "Geht es um eine Trennung oder Scheidung?"
   ├─ Trennung → "Leben Sie bereits getrennt? Seit wann?"
   │             "Gibt es gemeinsame Kinder?"
   │             "Gibt es Streit um Unterhalt oder Vermögen?"
   │
   ├─ Scheidung → "Ist das Trennungsjahr bereits abgelaufen?"
   │              "Sind sich beide Seiten einig?" (einvernehmlich?)
   │
   └─ Anderes → "Worum geht es genau?"
               ├─ Sorgerecht → Priorität
               ├─ Umgangsrecht → Normal
               ├─ Unterhalt → Normal
               └─ Gewaltschutz → DRINGEND
```

### Maren (Terminbuchung)

**Booking rules:**
- Match lawyer to practice area (Arbeitsrecht → Dr. Schröder, Weber, Krüger)
- Check availability in calendar
- Offer 2-3 time slots
- Confirm with caller
- Send email confirmation to caller + lawyer
- Include intake summary from Jonas in the email to lawyer

**Lawyer roster (demo):**

| Lawyer | Practice Area | Availability |
|--------|-------------|-------------|
| Dr. Thomas Schröder | Arbeitsrecht | Mo-Fr 9-12, 14-17 |
| Jennifer Weber | Arbeitsrecht, Familienrecht | Mo-Do 10-16 |
| Michael Krüger | Arbeitsrecht | Di, Do 9-17 |
| Lisa Hartmann | Familienrecht | Mo-Fr 9-15 |
| Robert Fischer | Mietrecht | Mo, Mi, Fr 10-16 |

---

## Test Scenarios (50+ required before launch)

### Must-pass scenarios

| # | Scenario | Expected Behavior | Pass? |
|---|----------|-------------------|-------|
| 1 | "Ich wurde gestern gekündigt" | Clara → Jonas (Arbeitsrecht, DRINGEND, Frist 3 Wochen) → Maren (nächster freier Termin) | |
| 2 | "Meine Frau und ich trennen uns" | Clara → Jonas (Familienrecht, Priorität) → Maren (Termin diese Woche) | |
| 3 | "Wann haben Sie geöffnet?" | Clara answers directly from KB. No transfer. | |
| 4 | "Ich brauche sofort einen Anwalt" (after hours) | Clara → Jonas (qualify urgency) → Maren (first available tomorrow) | |
| 5 | "Mein Vermieter hat mir gekündigt" | Clara → Jonas (Mietrecht, check Räumungsfrist) → Maren (Termin bei Fischer) | |
| 6 | "Kann ich mit Herrn Dr. Schröder sprechen?" | Clara: "Herr Dr. Schröder ist gerade in einem Gespräch. Darf ich einen Rückruf einrichten oder einen Termin buchen?" | |
| 7 | "Was kostet eine Erstberatung?" | Clara: "Die Erstberatung im Arbeitsrecht kostet €250 zzgl. MwSt." No transfer. | |
| 8 | Caller speaks unclear/mumbles | Clara asks for clarification politely | |
| 9 | Caller is angry/emotional | Clara remains calm, empathetic, professional | |
| 10 | Wrong number / spam | Clara handles gracefully, ends call politely | |

### Edge cases

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 11 | Caller asks for legal advice | "Ich darf leider keine Rechtsberatung geben. Aber ich kann Ihnen einen Termin bei einem unserer Anwälte buchen." |
| 12 | All lawyers fully booked | "Leider sind diese Woche alle Termine belegt. Darf ich Ihre Nummer aufnehmen? Wir melden uns, sobald ein Termin frei wird." |
| 13 | Caller speaks English | Switch to English if possible, or: "I can help you in English. What is your legal matter?" |
| 14 | Caller hangs up mid-conversation | Log partial data, don't call back automatically. |
| 15 | Two calls simultaneously | Both handled independently (ElevenLabs handles parallel calls) |

---

## Demo Delivery

### Live demo format (for managing partner)

1. Share demo number
2. "Rufen Sie an und sagen Sie: Ich wurde gestern gekündigt."
3. Let them experience the full flow (Clara → Jonas → Maren)
4. After the call: "Das war eine KI. 24/7. Für Ihre Kanzlei."
5. Show the structured intake email that was generated
6. Show the calendar booking that was created

### Demo card (physical or digital)

Front:
> **AI Kanzleiassistenz**
> Rufen Sie an: [+49 xxx xxxxxxx]
> Sagen Sie: "Ich wurde gekündigt."

Back:
> 59% der Anrufer legen bei Mailbox auf.
> 68% rufen nie wieder an.
> Clara ist immer da.
> one-of-one.ai

---

*Created: March 2026*
*Status: Operative — configure agents on ElevenLabs, test 50+ scenarios*
*Next step: Deploy Clara+Jonas+Maren with Schröder & Partner profile, begin testing*
