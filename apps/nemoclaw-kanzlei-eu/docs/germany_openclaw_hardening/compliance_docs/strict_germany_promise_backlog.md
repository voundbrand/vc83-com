# Strict Germany-Only Promise Backlog

Snapshot date: 2026-03-27
Status: `Future track` (not required for EU-compliant MVP launch).

## Purpose

Keep a deterministic backlog for a future `Germany-only` product tier while allowing the current MVP to launch on an EU-compliant basis.

## Gap summary against current MVP

1. Current MVP uses EU-compliant external processors for voice/inference.
2. Strict Germany-only tier requires removal or replacement of any non-DE processing path.
3. Marketing and contract language must remain explicit: current tier is EU-compliant, not Germany-only.

## Required future work items

1. Replace or isolate voice runtime to a Germany-only processing path.
2. Replace or isolate inference gateway to Germany-only processing path.
3. Prove Germany-only residency for prompts, responses, logs, and support-access channels.
4. Produce strict-DE legal packet addendum for every subprocessor in the final chain.
5. Run separate validation drills and publish dedicated `GO/NO_GO` gate for strict-DE tier.

## Gate policy

1. Do not claim Germany-only until every item above is `DONE` with evidence.
2. Any unresolved transfer ambiguity keeps strict-DE tier at `NO_GO`.
