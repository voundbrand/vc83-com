# One-of-One Strategy v4 — Trial Playbook

| Field | Value |
|-------|-------|
| **Document** | 04 — Trial Playbook |
| **Date** | 2026-03-18 |
| **Classification** | Internal — Founder's Eyes Only |

---

## Structure: Two-Phase Trial

> "Phase A measures the pain. Phase B proves the cure."

| Phase | Duration | Price | Purpose |
|-------|----------|-------|---------|
| **A: Call Audit** | 2 weeks | €0 | Capture overflow calls, generate data, create urgency |
| **B: Active Pilot** | 2 weeks | €299/month | Full intake + booking, prove ROI |

Total trial: 4 weeks. Phase A is free. Phase B requires minimal commitment.

---

## Phase A: Call Audit (Weeks 1-2)

### Pre-Audit Setup (Day 0, ~30 minutes)

| Task | Owner | Time |
|------|-------|------|
| Configure call forwarding on firm's Telefonanlage (busy/no-answer → our number) | Firm's IT or Empfang | 10 min |
| Create firm profile in our system (name, practice areas, lawyers, hours) | Remington | 15 min |
| Deploy Clara in "audit mode" (no booking, qualification only) | Remington | 5 min |
| Send confirmation email to managing partner with what to expect | Remington | 5 min |

### Daily Rhythm (Remington)

| Time | Activity |
|------|----------|
| **09:00** | Check overnight calls. Flag urgent matters. Send morning summary to firm. |
| **13:00** | Check Mittagspause calls (peak overflow time). Note volume patterns. |
| **18:00** | Check end-of-day calls. Update daily log. |
| **20:00** | Review agent performance. Tune prompts if needed. Note any misclassifications. |

### Weekly Check-In (15 min, end of week 1)

| Topic | Talking Points |
|-------|---------------|
| Volume | "In der ersten Woche haben wir [X] Anrufe aufgefangen, davon [Y] qualifizierte Anfragen." |
| Patterns | "Die meisten Anrufe kommen zwischen 12-14 Uhr und nach 17 Uhr — genau dann, wenn niemand da ist." |
| Quality | "Hier sind 3 Beispiel-Zusammenfassungen. Ist das die Qualität, die Sie erwarten?" |
| Feedback | "Gibt es etwas, das die KI anders machen sollte?" |

### Data Collection (automated)

| Metric | How Captured |
|--------|-------------|
| Total calls | System count |
| Time of day distribution | Timestamp analysis |
| Practice area classification | Jonas qualification output |
| Urgency level | Jonas urgency assessment |
| Call duration | System timer |
| Caller details captured (name, phone, email) | Agent extraction |
| Repeat callers | Phone number matching |
| Calls that would have been lost (outside business hours) | Time-based filter |

### Audit Report (delivered end of week 2)

**Format:** 2-page PDF + 15-minute video call walkthrough

**Page 1: The Numbers**

| Metric | Value |
|--------|-------|
| Total overflow calls captured | [X] |
| During business hours (staff busy) | [X] |
| Outside business hours | [X] |
| Qualified Mandatsanfragen | [X] (Y%) |
| By practice area | Arbeitsrecht: [X], Familienrecht: [X], Mietrecht: [X], Sonstige: [X] |
| Urgent (Frist-relevant) | [X] |
| Average call duration | [X] min |
| Repeat callers (tried again) | [X] |

**Page 2: The Revenue Math**

| Line | Calculation |
|------|------------|
| Qualified leads captured | [X] |
| × Estimated conversion to Mandat | 30% |
| = Potential new Mandate | [X] |
| × Average Erstberatungshonorar | €350 |
| = **Monthly revenue at risk** | **€[X]** |
| Your investment in our service | €499-999/month |
| **ROI** | **[X]x** |

> "Diese [X] Anrufe wären auf Ihrer Mailbox gelandet. [Y] davon hatten ein echtes Anliegen. Das sind €[Z] pro Monat an Honoraren, die gerade zum nächsten Anwalt gehen."

---

## Phase B: Active Pilot (Weeks 3-4)

### Pilot Activation (Day 15, ~2 hours)

| Task | Owner | Time |
|------|-------|------|
| Connect firm's calendar (Google/Outlook) | Remington + firm | 15 min |
| Configure lawyer availability per practice area | Remington | 30 min |
| Upload firm FAQ, practice area details, Erstberatung pricing | Remington | 30 min |
| Enable Maren (booking agent) | Remington | 15 min |
| Test end-to-end: call → qualify → book → calendar entry → email notification | Remington | 30 min |
| Brief managing partner on what changed ("Ab jetzt bucht die KI auch Termine") | Remington | 15 min |

### Daily Rhythm (Remington) — same as Phase A plus:

| Time | Activity |
|------|----------|
| **09:00** | Check booked appointments. Verify they appear correctly in lawyer calendars. |
| **12:00** | Check for any booking errors or double-bookings. |
| **17:00** | Review day's intake summaries for quality. |

### Weekly Check-In (15 min, end of week 3)

| Topic | Talking Points |
|-------|---------------|
| Bookings | "[X] Erstberatungen gebucht diese Woche. Hier sind die Zusammenfassungen." |
| Quality | "Gab es Termine, die nicht gepasst haben? Muss ich die Verfügbarkeiten anpassen?" |
| Feedback from lawyers | "Was sagen Ihre Anwälte zu den Intake-Zusammenfassungen?" |
| Preview close | "Nächste Woche schauen wir uns die Gesamtzahlen an und besprechen, wie es weitergeht." |

### Pilot Data Collection (additional to Phase A)

| Metric | How Captured |
|--------|-------------|
| Erstberatungen booked | Calendar entries |
| Erstberatungen attended (show rate) | Firm feedback |
| Booking accuracy (right lawyer, right time) | Firm feedback |
| Caller satisfaction (complaints?) | Firm feedback |
| Agent-to-human escalations | System count |
| Average time from call to booked appointment | System calculation |

---

## Conversion Meeting (Week 5, Day 1)

See `02_SALES_MOTION.md` Phase 5 for the full close script.

**Key data points to present:**

| Metric | Phase A | Phase B | Combined |
|--------|---------|---------|----------|
| Calls captured | [X] | [X] | [X] |
| Qualified leads | [X] | [X] | [X] |
| Erstberatungen booked | — | [X] | [X] |
| Revenue potential | €[X] | €[X] | €[X] |
| Hours saved for staff | [X]h | [X]h | [X]h |

---

## Exit Criteria

### Trial succeeds if:

- [ ] 20+ calls captured in Phase A
- [ ] 60%+ classified as qualified Mandatsanfragen
- [ ] 5+ Erstberatungen booked in Phase B
- [ ] Managing partner says "Meine Anwälte finden die Zusammenfassungen hilfreich"
- [ ] No DSGVO or BRAO compliance objection raised

### Trial fails if:

- [ ] <10 overflow calls in 2 weeks (no pain = no sale)
- [ ] Managing partner stops responding (lost interest)
- [ ] Lawyers reject the AI concept fundamentally ("Ich will das nicht")
- [ ] Call forwarding can't be configured on their Telefonanlage

### If trial fails:

Don't force it. Thank them, ask for a referral, move on. Not every Kanzlei is ready. The ones that are will close fast.

---

*Created: March 2026*
*Status: Operative — companion to 02_SALES_MOTION.md*
*Next step: Build audit report template, configure Clara audit mode (no booking)*
