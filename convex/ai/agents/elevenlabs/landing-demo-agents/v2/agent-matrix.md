# Landing Demo Agent to Platform Template Matrix

**Last updated:** 2026-03-16

## Authority rule

This document now maps the current landing-demo agents into platform-native template definitions.

Canonical authority:

1. the shared platform contract in `../../PLATFORM_NATIVE_SEVEN_AGENT_CONTRACT.md`,
2. the platform template mapping in this file.

Current landing-demo prompt, workflow, and tool files remain migration inputs and proof-demo continuity assets only. They are not the product source of truth for seven-agent behavior.

## Shared platform contract

All seven templates share the same platform-owned contract:

1. logic is platform-defined,
2. tools are platform-defined and provider bindings only implement them,
3. data access is org-scoped and platform-governed,
4. memory behavior is platform-owned across session, outcome, customer, and org-policy layers,
5. trust / approval policy is platform-owned and fail-closed,
6. channel-safe variants are platform-owned,
7. current Eleven assets are migration input only.

Default shared telephony trust posture:

1. may explain, recommend, capture caller-provided facts, and route,
2. may queue follow-up only through approved platform tools,
3. must fail closed to `return_to_concierge`, `handoff_to_human`, or `end_interaction` when required data or authorization is missing,
4. may not create irreversible commitments from phone calls without an explicit later-row approval contract.

Default shared memory posture:

1. ephemeral in-call state is session memory,
2. durable output is a platform-owned structured outcome record,
3. customer memory reuse is channel-safe and org-approved only,
4. provider-managed hidden memory is never canonical.

## Seven-agent mapping

| Platform template | Current landing-demo input | Platform-owned responsibility | Required org data | Platform tools | Eligible channel-safe variants | Migration note |
|---|---|---|---|---|---|---|
| `clara` | `Clara`; staging id `agent_4501kkk9m4fdezp8hby997w5v630`; prompt `../clara/system-prompt.md`; workflow `../clara/workflow.json`; tools `../clara/tools.json` | Public concierge, mandatory disclosure, caller-intent triage, specialist routing, transfer-failure fallback, closeout | org profile, service catalog, locations and hours, specialist roster, routing policy, disclosure policy, transfer targets | `lookup_org_profile`, `lookup_operating_state`, `route_to_specialist`, `handoff_to_human`, `record_conversation_outcome`, `end_interaction` | `telephony_public_entry`, `webchat_direct`, `messaging_async` | Sole public-entry template. Current Eleven workflow is a continuity artifact and future adapter target, not the canonical routing definition. |
| `maren` | `Maren`; staging id `agent_8601kknt8xcve37vyqnf4asktczh`; prompt `../maren/system-prompt.md` | Scheduling, appointment coordination, cancellations, waitlist handling, no-show recovery | locations, calendars or availability state, booking rules, waitlist policy, cancellation policy, coverage exceptions | `lookup_org_profile`, `lookup_customer_context`, `lookup_operating_state`, `return_to_concierge`, `handoff_to_human`, `queue_follow_up`, `record_conversation_outcome`, `end_interaction` | `telephony_transfer_target`, `webchat_direct`, `callback_or_outbound` | Current demo asset mostly proves transfer behavior. Platform template adds structured availability and follow-up contracts later without changing the role. |
| `jonas` | `Jonas`; staging id `agent_7501kkntg09qegs8nx4fv8g1js1z`; prompt `../jonas/system-prompt.md` | Lead qualification, service-fit triage, routing, intake summary generation | qualification rules, service-fit rules, territory coverage, callback windows, routing priorities | `lookup_org_profile`, `lookup_customer_context`, `return_to_concierge`, `handoff_to_human`, `queue_follow_up`, `record_conversation_outcome`, `end_interaction` | `telephony_transfer_target`, `webchat_direct`, `callback_or_outbound` | Current demo prompt is a migration seed. Canonical lead policy and routing thresholds must live in platform-owned config. |
| `tobias` | `Tobias`; staging id `agent_1301kknqwgvmezk90qcgmjqtwhr5`; prompt `../tobias/system-prompt.md` | Field-note intake, scope clarification, quote-ready documentation structuring | service packages, documentation schema, quote intake checklist, site-visit fields, follow-up ownership rules | `lookup_org_profile`, `lookup_customer_context`, `return_to_concierge`, `handoff_to_human`, `queue_follow_up`, `record_conversation_outcome`, `end_interaction` | `telephony_transfer_target`, `webchat_direct`, `messaging_async` | Current demo asset captures the voice lane only. Platform template will own structured documentation outputs instead of hiding them in provider prompt wording. |
| `lina` | `Lina`; staging id `agent_4401kknv2pswe5mb5c8dzgf87bcq`; prompt `../lina/system-prompt.md` | Follow-up orchestration, quote follow-up, retention and review recovery | customer history, open quotes, retention playbooks, review recovery policy, callback preferences, allowed offers | `lookup_customer_context`, `lookup_org_profile`, `return_to_concierge`, `handoff_to_human`, `queue_follow_up`, `record_conversation_outcome`, `end_interaction` | `telephony_transfer_target`, `messaging_async`, `callback_or_outbound` | Current demo asset proves lane identity. Platform template must own retention policy, follow-up sequencing, and allowed-offer boundaries. |
| `kai` | `Kai`; staging id `agent_6301kknv5hd5fr89hby28wvrrzcb`; prompt `../kai/system-prompt.md` | Team operations, staffing coordination, vacation and coverage triage, escalation readiness | team roster, shift coverage, vacation policy, escalation matrix, blackout windows, service continuity rules | `lookup_org_profile`, `lookup_operating_state`, `lookup_customer_context`, `return_to_concierge`, `handoff_to_human`, `queue_follow_up`, `record_conversation_outcome`, `end_interaction` | `telephony_transfer_target`, `webchat_direct`, `messaging_async` | This template must stay aligned with the platform-owned vacation and staffing domain contracts instead of re-embedding those rules in Eleven prompts. |
| `nora` | `Nora`; staging id `agent_8301kknv8hc9e0pvdgyy7ve8h07t`; prompt `../nora/system-prompt.md` | KPI explanation, trend interpretation, location-performance insight, recommended next-step framing | KPI definitions, reporting windows, location scorecards, benchmarks, escalation thresholds, approved narrative rules | `lookup_org_profile`, `lookup_operating_state`, `return_to_concierge`, `handoff_to_human`, `record_conversation_outcome`, `end_interaction` | `telephony_transfer_target`, `webchat_direct`, `messaging_async` | Current demo asset covers spoken analytics explanation only. Platform template must own metric definitions and approved interpretation boundaries. |

## Out of scope for this row

`Samantha` remains outside the platform-canonical seven-agent contract.

1. Samantha is a separate diagnostic and recommendation layer.
2. Samantha Phone remains deferred behind `ELA-072` and lane `L`.
3. The current `../samantha/*` demo assets are not part of this seven-template mapping row.

## Editing rule

Treat this file as the canonical migration map from the current landing-demo assets into platform-native templates.

If a product-role or capability rule changes:

1. update `../../PLATFORM_NATIVE_SEVEN_AGENT_CONTRACT.md`,
2. update this matrix,
3. update demo-runtime assets only if proof continuity or migration capture requires it.
