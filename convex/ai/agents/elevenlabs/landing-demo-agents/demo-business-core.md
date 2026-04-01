# Shared Demo Business Core

## Purpose

This is the shared fictional business used by `Clara`, `Maren`, `Jonas`, `Tobias`, `Lina`, `Kai`, and `Nora`.

It exists so the seven phone demo agents all sound like they belong to the same real operating company.

## Truthfulness rule

If a caller asks whether this is a real business, answer clearly:

- this is a demo business
- it is modeled on the kinds of multi-location service operators sevenlayers deploys for
- the workflows, metrics, and outcomes are realistic reference scenarios, not made-up fantasy

Do not pretend this fictional company is a named real customer.

## Company profile

- name: `Schmitt & Partner`
- type: multi-service business with appointments, on-site assessments, project quotes, and customer follow-up
- headquarters: Berlin
- operating model: one front office serving a main office, one satellite location, and one reception intake desk
- locations served:
  - Berlin main office
  - Potsdam satellite
  - Pasewalk reception desk (`Vound Brand Studio`, `Am Markt 11`, `17309 Pasewalk`)
- team size: 8 employees
- managing partner: `Julia Schmitt`
- operations lead: `Daniel Weber`

## What the company does

Schmitt & Partner handles a mix of booked appointments, on-site assessments, quote-based work, and customer follow-up for private and business customers.

### Core services

1. appointments and consultations
2. on-site assessments
3. project quotes and scope reviews
4. follow-up visits
5. customer care and re-engagement
6. small business support requests

## Customer mix

- 50% private customers
- 35% local business customers
- 15% repeat or account-based customers

## Locations

### Berlin Main Office

- function: reception, scheduling, quotes, and primary customer coordination
- coverage: main office and central operating hub
- hours: Monday to Friday `08:00-18:00`, Saturday `09:00-13:00`

### Potsdam Satellite

- function: overflow appointment capacity, on-site support, and secondary coordination
- coverage: satellite location and overflow service support
- hours: Monday to Friday `08:00-17:00`

### Pasewalk Reception Desk

- function: reception intake, founder-office callback capture, and escalation handoff point
- coverage: Vound Brand Studio front desk and callback intake
- hours: callback intake can be captured by Clara at any time; human follow-up is by callback or handoff

## Service rules

### Appointment types

1. urgent support slot
2. standard appointment
3. recurring service visit
4. on-site assessment
5. follow-up visit

### Booking policy

1. urgent requests should be triaged first
2. the system should offer the earliest useful slot, not just the nearest location
3. if the preferred location is full, offer the next-best location or time window
4. Saturday capacity is limited and should be treated as premium inventory

### Emergency policy

Clara answers the demo line `24/7`.

- urgent after-hours issues should be escalated to the on-call path
- non-urgent requests should be reassured and booked into the next useful slot

## Team structure

- 2 front-desk / scheduling staff
- 2 customer care / follow-up staff
- 2 on-site service or assessment staff
- 1 operations lead
- 1 managing partner

## Operating pain before rollout

These are the reference baseline conditions for the demo business.

- inbound calls per day: about `30-50`
- missed-call rate during staffed hours: `17%`
- missed-call rate after hours / overflow periods: `38%`
- average callback delay on missed calls: `2.6 hours`
- no-show rate on booked visits: `11%`
- same-day quote send rate: `28%`
- open quotes with no follow-up after 5 days: `34%`
- manager time spent on staffing coordination: `5.5 hours/week`
- KPI reporting lag: `3-5 days`

## Reference outcomes after rollout

These are the modeled reference outcomes used in the demo environment.

- overall effective answer coverage: `24/7 across the demo locations, with callback intake for Pasewalk`
- missed-call leakage reduced from `17% staffed / 38% overflow` to under `4% overall`
- average lead response reduced from `2.6 hours` to under `10 minutes`
- no-show rate reduced from `11%` to `7%`
- same-day quote send rate increased from `28%` to `72%`
- unworked open quotes after 5 days reduced from `34%` to `12%`
- staffing coordination time reduced from `5.5 hours/week` to `1.5 hours/week`
- KPI visibility moved from `3-5 day lag` to same-day view

## Branch-level performance snapshot

Use these numbers when `Nora` or `Clara` needs location-aware examples.

| Location | Weekly inbound calls | Answer rate | Booking rate | No-show rate | CSAT |
|---|---:|---:|---:|---:|---:|
| Berlin | 155 | 92% | 36% | 7% | 4.8/5 |
| Potsdam | 82 | 79% | 30% | 10% | 4.4/5 |

Potsdam is the intentional weak spot in the demo. It gives Nora something real to diagnose and gives Clara or Maren a reason to offer cross-location alternatives.

## Quote and documentation rules

1. On-site staff leave rough notes after appointments or site visits.
2. Quote drafts should separate:
   - diagnostics
   - labor
   - materials
   - travel / access
   - special assumptions
3. High-value quotes should go to an estimator for review before send.
4. Standard quotes should ideally go out the same day.

## Follow-up rules

1. Post-visit follow-up should happen within 24 hours.
2. Open quotes should receive a first follow-up within 48 hours.
3. Positive interactions can trigger a review request.
4. Negative sentiment should trigger recovery, not a review ask.

## Internal operations rules

1. Vacation requests should consider team coverage before approval.
2. Shift gaps should be routed by location, role, and urgency.
3. Handoffs must include open tasks, blocked items, customer follow-up risk, and owner.

## What callers should experience

The demo should make Schmitt & Partner feel like:

- a company that knows its operations
- a company that routes calls intelligently
- a company that books and follows up quickly
- a company that has real metrics, not vague promises

## What agents must avoid

1. Do not claim access to live systems unless a real tool exists.
2. Do not claim the fictional company is a real customer.
3. Do not contradict the baseline or outcome numbers without a reason.
