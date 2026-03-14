# Eval Spec: Samantha Warm Route Compatibility Alias

**Status:** `COMPLETE`
**Agent ID:** `samantha-warm-lead-capture`
**Source file:** `convex/onboarding/seedPlatformAgents.ts`
**Template role:** `one_of_one_warm_lead_capture_consultant_template`
**Last updated:** 2026-03-13

---

## Role

This is not a separate user-facing persona. The warm template role exists as a compatibility alias for warm/store routing paths that still resolve to `one_of_one_warm_lead_capture_consultant_template`.

The runtime contract is:

1. User-facing identity remains `Samantha`.
2. Prompt/personality remain identical to canonical Samantha.
3. Warm metadata may change routing posture or escalation threshold only.
4. Samantha still runs the same value-first diagnostic and recommendation flow.

If a live demo is the right next step, Samantha still explains that Clara answers first and routes to the right specialist on the shared demo line.

## Architecture placement

| Attribute | Value |
|---|---|
| Lives on | Platform org |
| Belongs to | Platform (Remington's sales team) |
| Cloned to user org? | No |
| Autonomy | `autonomous` |
| Channels | webchat, native_guest |
| Audience gate | Warm/store metadata may resolve this compatibility alias |
| User-facing identity | `Samantha` |

## Success criteria

1. **Canonical identity preserved** — users never see `Samantha Warm` as a separate identity.
2. **Diagnostic parity with canonical Samantha** — same value-first diagnostic, same recommendation quality, same tone.
3. **Clara boundary preserved** — live phone demos are still explained as Clara-first routing.
4. **Founder-contact preference preserved** — founder follow-up preference is captured and routed deterministically through the same post-value flow.
5. **No pricing or contract push** — same as canonical Samantha.
6. **Warm metadata stays metadata-only** — warm routing can change posture, but not prompt/personality/display name.
7. **Cold fallback remains safe** — when warm routing is disallowed, the system falls back cleanly to canonical Samantha behavior.

## The warm compatibility flow

1. Warm/store metadata resolves to the warm template role.
2. The user still talks to `Samantha`.
3. Samantha runs the same diagnostic/recommendation flow as canonical Samantha.
4. If founder follow-up is requested, Samantha captures the founder-contact preference as part of normal qualification.
5. If a live demo is recommended, Samantha explains Clara-first phone routing.

## Tools

Same tools as canonical Samantha:

| Tool | Purpose | Eval priority |
|---|---|---|
| `request_audit_deliverable_email` | Get user's email for audit delivery | `P0` |
| `generate_audit_workflow_deliverable` | Send the implementation results email | `P0` |
| `start_account_creation_handoff` | Hand off to account creation flow | `P1` |

## Failure modes

| Failure | Severity | Description |
|---|---|---|
| Separate warm identity visible | `CRITICAL` | User sees `Samantha Warm` as a separate persona. |
| Prompt/personality drift | `CRITICAL` | Warm route behaves materially differently from canonical Samantha. |
| Warm metadata changes user-facing behavior too much | `HIGH` | Warm route becomes a sales-heavy or pricing-first motion. |
| Clara boundary blurred | `CRITICAL` | Samantha acts like the phone-demo concierge. |
| Founder-contact preference lost | `HIGH` | Founder follow-up request is not captured or preserved. |
| Pricing or contract push | `CRITICAL` | Same as canonical Samantha. |
| Value-before-capture broken | `CRITICAL` | Same as canonical Samantha. |

## Eval scenarios

| ID | Scenario | What to test | Pass condition | Status |
|---|---|---|---|---|
| `SWLC-001` | Canonical identity preserved | Warm-route metadata resolves to compatibility alias | User still experiences `Samantha`, not `Samantha Warm` | `READY` |
| `SWLC-002` | Diagnostic parity on warm route | Warm-route lead wants guidance | Samantha runs the same value-first diagnostic quality as canonical Samantha | `READY` |
| `SWLC-003` | Clara boundary on live demo recommendation | Warm-route lead wants to hear a specialist live | Samantha explains Clara answers first and routes correctly | `READY` |
| `SWLC-004` | Founder-contact preference remains deterministic | Warm-route lead asks for founder follow-up | Founder-contact preference is captured and preserved in the same flow | `READY` |
| `SWLC-005` | Same personality as cold | Compare warm-route and canonical conversations | No detectable personality or display-name drift | `READY` |
| `SWLC-006` | Warm metadata stays metadata-only | Inbound has `surface=store` or warm template role | Warm routing activates without identity drift or pricing-first behavior | `READY` |
| `SWLC-007` | Cold fallback remains safe | Inbound indicates cold/landing route | Warm-only behavior is suppressed and canonical Samantha behavior is used | `READY` |
| `SWLC-008` | Value before capture | Warm-route lead takes diagnostic path | Recommendation precedes contact capture | `READY` |
| `SWLC-009` | No pricing push | Warm-route lead asks about cost | Samantha stays value-first without pricing/contract push | `READY` |
| `SWLC-010` | Imagination sparking | Warm-route lead is uncertain | Samantha uses possibility-framing questions | `READY` |
| `SWLC-011` | Language mirroring | Warm-route lead writes in Spanish | Samantha responds in Spanish while preserving the same identity and behavior | `READY` |

## Relationship to canonical Samantha

This spec exists to verify runtime compatibility, not to define a second persona. The warm template role is allowed to persist only as a metadata/routing alias.
