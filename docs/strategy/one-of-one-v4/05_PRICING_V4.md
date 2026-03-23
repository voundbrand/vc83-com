# Document 05 — Pricing v4

| Field | Value |
|-------|-------|
| **Document** | 05 — Pricing v4 |
| **Date** | 2026-03-18 |
| **Classification** | Internal — Founder's Eyes Only |

---

## Pricing Philosophy

> "Hallo Kira answers phones for €99. A Sekretärin costs €2,000. We sit in between — because we deliver the outcome of a Sekretärin at a fraction of the cost, with 24/7 coverage. The call audit data makes the price irrelevant."

We compete on **outcomes** (Mandate gewonnen, Termine gebucht), not on **minutes** (Hallo Kira) or **calls** (ebuero).

---

## Tier Overview

| Tier | Setup (excl. VAT) | Monthly (excl. VAT) | Who It's For |
|------|-------------------|---------------------|-------------|
| **Call Audit** | €0 | €0 | 2-week overflow audit. Prove the pain with data. |
| **Pilot** | €0 | €299/mo | 2-week active pilot with booking. Prove the cure. |
| **Basis** | €1,500 | €499/mo | 2-5 lawyers, 1 number, 1 location. Phone intake + qualification + calendar booking. |
| **Professional** | €2,000 | €999/mo | 5-15 lawyers, 2 numbers, 1-3 locations. Full 3-agent suite, web dashboard, monthly optimization. |
| **Premium** | €2,500 | €1,999/mo | 15+ lawyers, 3+ numbers, multi-location. All agents, CRM integration, dedicated account management. |

---

## Why Pricing Changed from v3

| Change | Rationale |
|--------|-----------|
| €499/mo replaces €12K setup for law firms | A 5-partner Kanzlei will never write a €12K check to try AI phone. €499/mo is digestible and month-to-month. |
| 3 tiers instead of 5 | Law firm decision is simple: how many lawyers, how many locations. No need for Foundation/Dream Team/Sovereign complexity. |
| Setup fee (€1,500-2,500) instead of €0 | Covers real configuration work (templates, knowledge base, calendar setup). Low enough not to block. High enough to signal commitment. |
| Month-to-month | Law firms are risk-averse. No annual lock-in. If the product works, they stay. If it doesn't, we need to know. |
| Call audit is free | The audit IS the sales tool. It creates the data that justifies the price. Never charge for data collection. |

---

## COGS Breakdown per Tier

### Variable costs (per customer per month)

| Cost Component | Basis (€499/mo) | Professional (€999/mo) | Premium (€1,999/mo) |
|---------------|-----------------|----------------------|---------------------|
| **ElevenLabs voice** ($0.08/min) | ~1,500 min → €110 | ~3,500 min → €260 | ~6,000 min → €440 |
| **LLM pass-through** (~$0.03/min est.) | €40 | €95 | €165 |
| **Twilio number + inbound** | €5 | €10 | €20 |
| **Total COGS** | **€155** | **€365** | **€625** |
| **Gross margin (COGS only)** | **€344 (69%)** | **€634 (63%)** | **€1,374 (69%)** |

### Time costs (Remington's hours per customer per month)

| Activity | Basis | Professional | Premium |
|----------|-------|-------------|---------|
| Prompt tuning | 1-2 hrs | 2-3 hrs | 3-4 hrs |
| Monthly optimization call | 30 min | 1 hr | 1 hr |
| Roster/availability changes | 30 min | 1 hr | 1-2 hrs |
| Dashboard monitoring | 30 min | 1 hr | 1-2 hrs |
| **Total hours/month** | **3-4 hrs** | **5-6 hrs** | **6-8 hrs** |

### Fully loaded margin (COGS + time at €75/hr implicit)

| | Basis | Professional | Premium |
|-|-------|-------------|---------|
| Revenue | €499 | €999 | €1,999 |
| COGS | -€155 | -€365 | -€625 |
| Time cost | -€263 | -€413 | -€525 |
| **Net margin** | **€81 (16%)** | **€221 (22%)** | **€849 (42%)** |

**Margin improves with:**
- Practice area templates (reduce config time by 60%)
- Dashboard automation (reduce monitoring time)
- Customer self-service for roster changes
- Higher tier adoption (Premium has best margins)

**Target state (month 6+, templates built):**

| | Basis | Professional | Premium |
|-|-------|-------------|---------|
| Time cost (with templates) | -€113 (1.5 hrs) | -€225 (3 hrs) | -€300 (4 hrs) |
| **Net margin** | **€231 (46%)** | **€409 (41%)** | **€1,074 (54%)** |

---

## Payment Terms

| Tier | Terms |
|------|-------|
| Call Audit | Free. No contract. |
| Pilot | €299 billed on activation. No contract. |
| Basis | Setup: 100% upfront before configuration. Monthly: first invoice on go-live, monthly thereafter. |
| Professional | Setup: 100% upfront. Monthly: same as Basis. |
| Premium | Setup: 50/50 (50% on contract, 50% on go-live). Monthly: same as Basis. |
| All tiers | Monatlich kündbar. 30 days notice. No annual lock-in. |

---

## ACV (Annual Contract Value) by Tier

| Tier | Setup | Year 1 Recurring | Year 1 ACV |
|------|-------|------------------|------------|
| Basis | €1,500 | €5,988 | €7,488 |
| Professional | €2,000 | €11,988 | €13,988 |
| Premium | €2,500 | €23,988 | €26,488 |

---

## Revenue Scenarios (Year 1)

**Conservative:** 20 Basis + 5 Professional = €15K MRR = **€180K + €17.5K setup = €197.5K**

**Target:** 15 Basis + 10 Professional + 5 Premium = €27.4K MRR = **€329K + €37K setup = €366K**

**Stretch:** 10 Basis + 15 Professional + 10 Premium = €39.9K MRR = **€479K + €55K setup = €534K**

---

## Price Anchoring

| Alternative | Monthly Cost | Comparison |
|-------------|-------------|------------|
| Part-time Sekretärin (20h/week) | €1,500-2,500 (incl. Sozialabgaben) | "Für ein Drittel des Preises, 24/7, nie krank" |
| ebuero Telefonsekretariat | €60-180/month + €1-1.40/call | "Die nehmen Nachrichten auf. Wir qualifizieren und buchen Termine." |
| Hallo Kira | €99-299/month | "Die beantworten Anrufe. Wir betreiben Ihre Mandatsannahme." |
| Additional associate to handle overflow | €6,700-10,000/month | "Ein Anwalt, der Telefone beantwortet, statt Mandate zu bearbeiten?" |
| Lost Mandate (doing nothing) | €3,000-5,000/month estimated | "Die teuerste Option ist, nichts zu tun." |

---

## The Close Script (pricing section)

> "Für Ihre Kanzlei mit [N] Anwälten empfehle ich den Professional-Tarif: €999 im Monat, €2.000 einmalig für die Einrichtung. Das beinhaltet drei KI-Agenten — Empfang, Qualifizierung, Terminbuchung — plus ein Dashboard, auf dem Sie sehen, wie viele Anfragen reinkommen und wo sie landen.
>
> Wenn Sie erst mal kleiner starten wollen: Basis ist €499 im Monat für eine Nummer und Terminbuchung.
>
> In Ihrem Audit haben wir [X] qualifizierte Anfragen in 2 Wochen gesehen. Bei €350 durchschnittlichem Erstberatungshonorar sind das €[Y] im Monat an Potenzial. Die Investition rechnet sich in [Z] Wochen."

---

*Created: March 2026*
*Status: Operative — companion to 08_UNIT_ECONOMICS.md for detailed COGS analysis*
*Next step: Build ROI calculator, finalize audit report template with pricing section*
