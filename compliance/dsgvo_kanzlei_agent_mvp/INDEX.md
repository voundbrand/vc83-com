# DSGVO Kanzlei Agent MVP Index

**Workstream root:** `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp`  
**Source request:** Create a queue-first implementation plan using docs CI and integrate existing legal work under `existing-docs/`.

---

## Purpose

This workstream is the canonical execution surface for Kanzlei-agent MVP compliance and release readiness.

It combines:

1. legal and policy baseline documents,
2. vendor and transfer compliance evidence,
3. technical runtime guardrail planning,
4. objective go-live and release-gate controls.

---

## Current status

1. Planning lane `A` is complete (`KAMVP-001`, `KAMVP-002` are `DONE`).
2. Legal source inventory is complete (`KAMVP-003` is `DONE`).
3. German MVP privacy policy draft is complete (`KAMVP-004` is `DONE`).
4. German DPA/AVV clause pack draft is complete (`KAMVP-006` is `DONE`).
5. Subprocessor and transfer matrix draft is complete (`KAMVP-007` is `DONE`).
6. Provider-level AVV/§62a decisions are documented (`KAMVP-008` is `DONE`, fail-closed baseline).
7. Transfer impact register is complete (`KAMVP-009` is `DONE`, fail-closed baseline).
8. TOM control matrix is complete (`KAMVP-010` is `DONE`).
9. Runtime approval gating is complete (`KAMVP-011` is `DONE` with scoped `V-UNIT` verification evidence).
10. Kanzlei skill/tool allowlist gating is complete (`KAMVP-012` is `DONE`).
11. Structured runtime audit events for approvals/blocked actions/external dispatch attempts are complete (`KAMVP-013` is `DONE`).
12. Go-live checklist evidence wiring is complete (`KAMVP-015` is `DONE`).
13. DSR and incident runbooks are complete (`KAMVP-016` is `DONE`).
14. German MVP terms draft is complete (`KAMVP-005` is `DONE`).
15. `KAMVP-017` validation evidence is refreshed and globally green for docs/type/unit/integration (`VALIDATION_EVIDENCE.md`).
16. `KAMVP-014` is `DONE`; `V-MODEL` is green for release baseline `TEST_MODEL_ID=anthropic/claude-opus-4.5` using strict direct-runtime validation (`6/6`, conformance `PASS`).
17. `KAMVP-018` release-gate decision remains published with verdict `NO_GO` (`RELEASE_GATE_DECISION.md`).
18. No row is actively `IN_PROGRESS`.
19. Docs CI command `npm run docs:guard` is part of every milestone verify profile.

---

## Core files

- Queue:
  `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/TASK_QUEUE.md`
- Session prompts:
  `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/SESSION_PROMPTS.md`
- Master plan:
  `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/MASTER_PLAN.md`
- Workstream index:
  `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/INDEX.md`
- Operating policy:
  `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/MVP_AGENT_POLICY.md`
- Go-live gate:
  `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/GO_LIVE_CHECKLIST.md`
- Provider check:
  `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/AVV_62A_CHECKLIST.md`
- AVV intake runbook:
  `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/AVV_PROVIDER_COLLECTION_RUNBOOK.md`
- DSR runbook:
  `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/DSR_RUNBOOK.md`
- Incident runbook:
  `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/INCIDENT_RUNBOOK.md`

Source intake folder:

- `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/existing-docs/`
- `/Users/foundbrand_001/Development/vc83-com/compliance/dsgvo_kanzlei_agent_mvp/provider_dossiers/`

---

## Lane progress board

- [x] Lane A planning contract and intake baseline (`KAMVP-001`, `KAMVP-002`)
- [x] Lane B kickoff baseline (`KAMVP-003` legal source inventory)
- [x] Lane B privacy draft milestone (`KAMVP-004`)
- [x] Lane B DPA/AVV draft milestone (`KAMVP-006`)
- [x] Lane B subprocessor/transfer matrix milestone (`KAMVP-007`)
- [x] Lane B legal corpus normalization (`KAMVP-005`)
- [x] Lane C AVV/§62a provider decision milestone (`KAMVP-008`)
- [x] Lane C transfer-impact milestone (`KAMVP-009`)
- [x] Lane C TOM control matrix milestone (`KAMVP-010`)
- [x] Lane D P0 runtime guardrails (`KAMVP-011`, `KAMVP-012`, `KAMVP-013`)
- [x] Lane D P1 minimization follow-up (`KAMVP-014`)
- [x] Lane E operational readiness (`KAMVP-015`, `KAMVP-016`)
- [x] Lane F validation and release gate evidence run (`KAMVP-017`)
- [x] Lane F release gate decision published (`KAMVP-018`, current verdict `NO_GO`)

---

## Operating commands

- Docs CI:
  `npm run docs:guard`
- Typecheck:
  `npm run typecheck`
- Unit tests:
  `npm run test:unit`
- Integration tests:
  `npm run test:integration`
- Model tests:
  `npm run test:model`
