# One-of-One Strategy v4 — Expansion Roadmap

| Field | Value |
|-------|-------|
| **Document** | 10 — Expansion Roadmap |
| **Date** | 2026-03-18 |
| **Classification** | Internal — Founder's Eyes Only |

---

## The Platform Company Thesis

> "Each vertical adds 5,000-50,000 potential customers using the same platform, same voice infrastructure, different templates and integrations. The platform scales; the vertical expertise compounds."

---

## Phase Map

| Phase | Vertical | Timeline | TAM | Target MRR | Key Integration | Gate to Enter |
|-------|----------|----------|-----|-----------|----------------|---------------|
| **1** | Rechtsanwaltskanzleien | Month 1-6 | 5,000+ | €5-10K | Calendar, RA-MICRO (CSV) | — (start here) |
| **2** | Steuerberaterkanzleien | Month 6-12 | 50,000+ | €15-25K | DATEV (mandatory) | 10+ law firm customers |
| **3** | Tierarztpraxis-Ketten | Month 9-15 | 10,186 | €20-35K | VetFox/Manta.vet, PMS | 15+ total customers |
| **4** | Schädlingsbekämpfung | Month 12-18 | 1-2K | €25-40K | None required | 20+ total customers |
| **5** | Zeitarbeitsfirmen | Month 12+ | 46,000 | €30-50K | ATS/CRM systems | 25+ total customers |
| **Future** | RE/MAX franchise offices | Year 2+ | 950+ | — | Telli-competitive territory | Established brand |

---

## Phase 1: Rechtsanwaltskanzleien (Month 1-6)

### Entry strategy

| Dimension | Detail |
|-----------|--------|
| **ICP** | 5-20 lawyers, Arbeitsrecht / Familienrecht primary |
| **Sales motion** | Call audit → pilot → paid (see 02_SALES_MOTION.md) |
| **Pricing** | €499-1,999/month (see 05_PRICING_V4.md) |
| **Agents** | Clara (reception), Jonas (qualification), Maren (booking) |
| **Integration** | Google/Outlook Calendar, email notifications, CSV export for RA-MICRO |
| **Templates** | Arbeitsrecht intake, Familienrecht intake, Mietrecht intake |
| **Key events** | legalXchange Munich (Apr), Anwaltstag Freiburg (Jun), Legal Tech Day Berlin (Sep) |

### Phase 1 exit criteria

- [ ] 10+ paying law firm customers
- [ ] 3+ practice area templates battle-tested
- [ ] €5K+ MRR from law firms alone
- [ ] 2+ case studies with named firms
- [ ] Call audit → paid conversion rate >40%
- [ ] ElevenLabs CPA executed

---

## Phase 2: Steuerberaterkanzleien (Month 6-12)

### Why Steuerberater follows law firms

| Dimension | Detail |
|-----------|--------|
| **Same DNA** | Professional services practice, 5-20 people, managing partner decides, phone is critical channel |
| **Same pain** | Missed calls during Steuererklärung season (Jan-May) = lost Mandanten |
| **Same buyer persona** | Kanzleiinhaber, 45-60, uses DATEV, low-tech |
| **Bigger TAM** | 50,000+ Steuerberater practices in Germany (10x law firms) |
| **Lower competition** | No direct AI phone competitor targeting Steuerberater specifically |

### What's different

| | Law Firms | Steuerberater |
|-|-----------|---------------|
| Practice management | RA-MICRO | **DATEV** |
| Urgency driver | Fristen, Kündigungsschutz | Abgabefristen, Steuerbescheide |
| Season | Year-round (slight Q1 peak for Arbeitsrecht) | Jan-May massive peak, Jul-Sep second peak |
| Qualification depth | Practice area + urgency + Frist | Steuerart + Mandatsstatus + Dringlichkeit |
| Integration required | RA-MICRO (optional) | **DATEV (mandatory)** |

### DATEV Integration Challenge

| Dimension | Detail |
|-----------|--------|
| **DATEV market position** | Dominant in German Steuerberater market. Used by ~90% of practices. |
| **API access** | DATEV has APIs but access is heavily gated. Requires DATEV Partnerschaft. |
| **Application** | Apply for DATEV Marktplatz partnership. Requires technical review. |
| **Timeline** | 3-6 months for partnership approval, 3-6 months for integration build |
| **Start now?** | No. Build the application on paper. Submit at Month 4-5. Target approval at Month 8-10. |

### Steuerberater-specific agents

| Agent | Role |
|-------|------|
| Clara | "Steuerkanzlei [Name], guten Tag!" — route by service type |
| Jonas | Qualify: Steuererklärung? Buchhaltung? Lohnabrechnung? Unternehmensberatung? Dringlichkeit? |
| Maren | Book consultation with appropriate Steuerberater |

### Phase 2 entry criteria

- 10+ law firm customers (proof the model works)
- DATEV partnership application submitted
- 2+ Steuerberater templates configured
- First 3 Steuerberater pilot agreements from network introductions

### Key channels for Steuerberater

| Channel | Detail |
|---------|--------|
| DStV (Deutscher Steuerberaterverband) | National association. Events, partnerships. |
| Regional Steuerberaterkammern | 21 regional chambers. Continuing education events. |
| DATEV Marktplatz | If partnership approved, direct distribution to 90% of market. |
| Cross-referral from law firms | "Works for Kanzleien, works for Steuerkanzleien." |

---

## Phase 3: Tierarztpraxis-Ketten (Month 9-15)

### Why veterinary practices

| Dimension | Detail |
|-----------|--------|
| **TAM** | 10,186 practices in Germany. Growing corporate consolidation (Evidensia, AniCura, IVC). |
| **No Doctolib** | Unlike human medical practices, vets have no dominant appointment platform. |
| **Emergency triage** | Vet calls often have urgency: "Mein Hund hat Schokolade gefressen — ist das gefährlich?" → Triage is high-value. |
| **Corporate buyers** | Vet groups (5-20 practices) have operational pain similar to law firms. |
| **Low competition** | VetFox and Manta.vet are tiny/early-stage. No AI phone competitor. |

### Vet-specific qualification

| Agent | Role |
|-------|------|
| Clara | "Tierarztpraxis [Name], guten Tag!" |
| Jonas | Qualify: Notfall? Routine-Termin? Impfung? Welches Tier? Symptome? |
| Maren | Book with appropriate vet. Emergency → transfer to on-call vet immediately. |

### Integration requirements

- Practice management systems: VetFox, Manta.vet, easyVet, Vetera
- Challenge: Fragmented PMS market (no single dominant player like RA-MICRO)
- Start with calendar + email, same as law firm Phase 1

---

## Phase 4: Schädlingsbekämpfung (Month 12-18)

### Why pest control

| Dimension | Detail |
|-----------|--------|
| **Zero competition** | No AI phone competitor. No Hallo Kira equivalent. |
| **Emergency-driven** | Calls are often urgent: "Ich habe Ratten im Keller." Must answer immediately. |
| **High recurring** | 70-85% recurring service contracts. Sticky customer base. |
| **Simple qualification** | Schädlingsart? Adresse? Dringlichkeit? Gewerblich oder privat? |
| **Small TAM** | 1-2K firms. Ceiling is lower but competition is zero. |

### Phase 4 value

Good for: margin, case studies, "we work across professional services" credibility.
Bad for: scale (TAM caps out at ~€100-200K MRR from this vertical alone).

---

## Phase 5: Zeitarbeitsfirmen (Month 12+)

### Why temp staffing

| Dimension | Detail |
|-----------|--------|
| **Most phone-intensive** | Candidates call constantly. Clients call constantly. Dispatchers are overwhelmed. |
| **Massive TAM** | 46,000 firms, €32B market |
| **Pain** | Every missed candidate call = lost placement = lost revenue |
| **Challenge** | 4% industry margins = tight budget for AI tools |

### Staffing-specific agents

| Agent | Role |
|-------|------|
| Clara | "Zeitarbeit [Name], guten Tag!" |
| Jonas | Qualify: Bewerber oder Auftraggeber? Qualifikation? Verfügbarkeit? Region? |
| Maren | Book interview or dispatch meeting |

### Why wait until Month 12+

- Need proven templates + operational maturity
- Low margins mean price sensitivity — need efficient delivery
- High volume means COGS must be tightly managed
- Better to enter with 20+ customers in other verticals as proof

---

## Cross-Vertical Platform Leverage

| Component | Law Firms | Steuerberater | Vets | Pest Control | Staffing |
|-----------|-----------|---------------|------|-------------|---------|
| Clara (reception) | Reuse 90% | Reuse 90% | Reuse 90% | Reuse 90% | Reuse 90% |
| Jonas (qualification) | Custom templates | Custom templates | Custom templates | Custom templates | Custom templates |
| Maren (booking) | Reuse 95% | Reuse 95% | Reuse 95% | Reuse 95% | Reuse 95% |
| Calendar sync | Same | Same | Same | Same | Same |
| CRM | Same | Same | Same | Same | Same |
| Dashboard | Same | Same | Same | Same | Same |
| **Unique per vertical** | ~10-15% (qualification templates, industry knowledge) | ~10-15% | ~10-15% | ~5-10% | ~10-15% |

**The flywheel:** Each new vertical costs ~10-15% new development. 85-90% is reused. Templates compound. Brand compounds. Revenue diversifies.

---

## Month-by-Month Timeline

| Month | Milestone | Revenue Target |
|-------|-----------|---------------|
| 1 (Apr 2026) | legalXchange debut. First 2-3 call audits. | €0 (pilots) |
| 2 (May 2026) | First 2-3 paying law firms. | €1-2K MRR |
| 3 (Jun 2026) | Anwaltstag Freiburg. 5-8 law firms. ElevenLabs CPA. | €3-5K MRR |
| 4-5 (Jul-Aug) | Templates mature. Pipeline fills. | €5-8K MRR |
| 6 (Sep 2026) | Legal Tech Day Berlin. 12-15 law firms. DATEV application submitted. | €8-11K MRR |
| 7-8 (Oct-Nov) | First hire. First 2-3 Steuerberater pilots. | €10-14K MRR |
| 9 (Dec 2026) | German Legal Tech Summit Hanover. 18-22 customers total. | €14-17K MRR |
| 10-12 (Q1 2027) | Steuerberater ramp (tax season). RA-MICRO conversation. Vet pilot. | €17-25K MRR |
| 13-18 (Q2-Q3 2027) | Multi-vertical. Second hire. 40-60 customers. | €25-40K MRR |
| 19-24 (Q4 2027-Q1 2028) | Pest control, staffing pilots. 60-80 customers. | €40-60K MRR |

---

*Created: March 2026*
*Status: Operative — Phase 1 begins immediately*
*Next step: Configure law firm demo, register for legalXchange, start outreach to first 20 Arbeitsrecht firms*
