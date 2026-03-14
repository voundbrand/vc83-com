# Document 06 — Landing Page Changes Spec

| Field            | Value                              |
| ---------------- | ---------------------------------- |
| **Document**     | 06 — Landing Page Changes Spec     |
| **Date**         | 2026-03-13                         |
| **Classification**| Internal — Founder's Eyes Only    |

---

## Purpose

This document is the internal reference for landing page changes made as part of the v3 mid-market pivot. The full implementation spec lives in the Claude Code plan file.

---

## Summary of Changes

| # | Section | Change |
| --- | --- | --- |
| 1 | **Hero section** | Reframed from personal overwhelm to organizational revenue loss at scale |
| 2 | **Problem section** | From solo-owner drowning to multi-location missed calls costing hundreds of thousands |
| 3 | **7 Agents section** | Carousel replaced with alternating left/right tiles showing 7 concrete agents (Virtual Receptionist, Appointment Coordinator, Lead Qualification, Field Documentation, Customer Follow-Up, Team Operations, Location Intelligence) |
| 4 | **Chat demo** | Samantha diagnostic updated for mid-market revenue leak identification |
| 5 | **Case studies** | Marcus Engel kept as hero; scale callout added ("Imagine this across 15 agents") |
| 6 | **Process section** | 4 steps updated to match sales motion (Demo -> Demo Kit -> Trial -> Go Live) |
| 7 | **New Demo Kit section** | Added between Process and FAQ |
| 8 | **FAQ** | Updated for demo-first and trial-first questions |
| 9 | **CTAs** | "Book a consultation" -> "Request a demo" throughout |

---

## Files Modified

| File | Notes |
| --- | --- |
| `apps/one-of-one-landing/content/landing.en.json` | English copy updates for all sections above |
| `apps/one-of-one-landing/content/landing.de.json` | German copy updates for all sections above |
| `apps/one-of-one-landing/app/page.tsx` | Layout and component changes (carousel to tiles, new Demo Kit section, updated CTAs) |

---

## Files Removed (dependency)

| Package | Reason |
| --- | --- |
| `embla-carousel-react` | Carousel replaced with alternating left/right tiles in the 7 Agents section |

---

## Additional Guidance — German-First Messaging Placement

This section is additive guidance only.

It does not replace the existing landing-page direction.

### Recommendation

Keep the landing page anchored on:

1. missed calls,
2. revenue leakage,
3. one intelligent front door,
4. proof through demo and trial.

Use German-first / DSGVO-first messaging as a trust amplifier, not as the homepage category headline.

### What belongs on the landing page

Good homepage-level uses of this messaging:

- a short trust line that signals DACH readiness,
- a concise mention of deployment flexibility,
- a concise mention of governed provider choice,
- a concise mention that the platform is multimodal, not voice-only.

Example territory:

- "German-first multimodal AI agents for customer operations"
- "Deploy in `Cloud`, `Dedicated-EU`, or `Sovereign Preview`"
- "Control where calls, transcripts, and model traffic are processed"

### What should stay off the main landing page

Do not turn the landing page into:

- a data residency explainer,
- a subprocessor matrix,
- a sovereign architecture page,
- a generic "all models in one place" pitch.

Those details are better handled in:

1. founder sales conversations,
2. demo follow-up material,
3. procurement and security review assets,
4. dedicated enterprise or compliance pages later.

### Suggested delivery pattern

Recommended split:

1. **Hero and early sections:** stay outcome-first and operational.
2. **Trust band or proof section:** lightly introduce German-first, multimodal, and deployment-tier language.
3. **FAQ or enterprise callout:** mention `Cloud`, `Dedicated-EU`, and `Sovereign Preview` as deployment options.
4. **Sales conversation:** unpack the real meaning of live-path control, provider policy, support-access policy, and processor boundaries.

### Frontend team note

Treat this as a messaging-boundary rule for the landing page implementation.

The page should:

1. signal trust and enterprise readiness,
2. lightly signal German-first and multimodal credibility,
3. avoid becoming a compliance explainer or sovereign architecture page.

In practice:

1. keep the hero and main narrative focused on missed calls, revenue leakage, and the intelligent front door,
2. place German-first / DSGVO / deployment-tier language in supporting UI such as trust bands, enterprise callouts, proof sections, or FAQ entries,
3. avoid giving the impression that the primary category is a horizontal AI workspace or generic secure AI platform,
4. leave detailed deployment commitments for sales conversations and enterprise follow-up material.

### Internal rule

The homepage should say:

- "we take deployment and data-residency seriously,"

but the sales call should explain:

- what actually stays in the EEA,
- what differs by deployment tier,
- which providers are allowed or disallowed,
- what "Sovereign Preview" does and does not include.

### Landing page guardrails

Avoid these homepage mistakes:

- leading with "secure AI workspace" language,
- sounding like a horizontal AI platform,
- saying "Germany-hosted" unless the full claim is provable,
- overloading the page with compliance detail before the operational problem is clear.

The landing page should create trust.

The sales process should cash that trust out into specific deployment commitments.
