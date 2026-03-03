# ORV-014 Owner Handoff Roster

**Date:** 2026-03-02  
**Workstream:** `operator-mobile-realtime-voice-runtime`

This file resolves role-only ownership ambiguity in the ORV-014 runbook by assigning named owner-of-record mappings.

## Named owner mapping

| Domain | Primary owner (named) | Secondary owner (named) | Notes |
|---|---|---|---|
| Runtime canary controller | `foundbrand_001` | `foundbrand_001` | Primary executes canary percentage changes and rollback decisions. |
| Mobile transport/runtime | `foundbrand_001` | `foundbrand_001` | Primary validates client transport and reconnect behavior. |
| Observability and telemetry | `foundbrand_001` | `foundbrand_001` | Primary validates ingestion + taxonomy dashboards/alerts. |
| Security and attestation | `foundbrand_001` | `foundbrand_001` | Primary validates fail-closed auth/attestation + rate-limit behavior. |
| Incident command | `foundbrand_001` | `foundbrand_001` | Primary coordinates SEV response and rollback comms. |
| Release signoff | `foundbrand_001` | `foundbrand_001` | Primary signs stage promotion gates at 50% and 100%. |

## Update policy

1. Before each stage promotion, confirm roster values are current.
2. If any `TBD` remains for target-stage critical domains, promotion is blocked.
3. Record roster changes in `ORV_014_CANARY_EXECUTION_LOG.md` with date/time.
