# Architecture

## Overview

The compliance engine is a standalone HTTP sidecar that provides GDPR/DSGVO
compliance infrastructure for AI agent runtimes. It runs as a Docker container
alongside OpenClaw/NemoClaw instances.

```
┌──────────────────────────────────┐
│    OpenClaw Agent Runtime        │
│  ┌────────────────────────────┐  │
│  │  Compliance Plugin         │  │
│  │  (tools, hooks, commands)  │──┼──── HTTP ────┐
│  └────────────────────────────┘  │              │
└──────────────────────────────────┘              ▼
                                    ┌──────────────────────────┐
                                    │  Compliance Engine        │
                                    │  localhost:3335            │
                                    │  ┌──────────┐ ┌────────┐ │
                                    │  │ Fastify   │ │ SQLite │ │
                                    │  │ REST API  │ │  (WAL) │ │
                                    │  └──────────┘ └────────┘ │
                                    │  ┌──────────┐ ┌────────┐ │
                                    │  │ Rule      │ │ Vault  │ │
                                    │  │ Engine    │ │ (AES)  │ │
                                    │  └──────────┘ └────────┘ │
                                    └──────────────────────────┘
```

## Architectural Decisions

### ADR-1: Fail-Closed by Default

**Decision:** Unknown state = blocked. If the sidecar is unreachable, agents
cannot start.

**Rationale:** For §203 StGB regulated professions, processing client data
without compliance guarantees is a criminal offense. Failing open would expose
users to legal liability.

### ADR-2: SQLite + WAL Mode

**Decision:** Use SQLite with Write-Ahead Logging for the compliance database.

**Rationale:**
- Zero external dependencies (no Postgres, no Redis)
- Single-file backup/restore
- WAL mode allows concurrent reads during writes
- Easily auditable — any SQL tool can inspect the database

### ADR-3: AES-256-GCM Encrypted Vault

**Decision:** Evidence artifacts are encrypted at rest using AES-256-GCM with
scrypt key derivation.

**Rationale:**
- Art 32 GDPR requires appropriate security measures
- Each file gets unique IV (random) and salt (random)
- Encryption key derived from passphrase via scrypt (memory-hard)
- Tamper-evident: GCM authentication tag prevents modification

### ADR-4: YAML Framework Rules

**Decision:** Compliance rules are defined in YAML files, organized by framework.

**Rationale:**
- Non-developers (compliance officers, lawyers) can review rules
- New frameworks added by dropping a folder — no code changes
- Version-controllable alongside the engine
- Condition types are deliberately limited for auditability

### ADR-5: Plugin Architecture

**Decision:** The OpenClaw integration is a thin plugin (~300 LOC) that
communicates with the sidecar via HTTP.

**Rationale:**
- Plugin can be updated independently of the engine
- HTTP boundary makes the compliance engine reusable with other runtimes
- Plugin failure doesn't crash the agent runtime
- Clear security boundary between agent code and compliance data

### ADR-6: Append-Only Audit Trail

**Decision:** Audit events are never deleted or modified (soft-expiry only).

**Rationale:**
- Art 30 GDPR requires records of processing activities
- Append-only design prevents evidence tampering
- Data subject erasure (Art 17) only removes personal data, not audit structure

## Module Map

```
server/
├── index.ts              # Entry point — loads config, DB, frameworks, starts server
├── app.ts                # Fastify factory — registers all routes
├── config.ts             # Environment config with fail-closed defaults
├── lib/
│   ├── constants.ts      # Default values, API prefix
│   └── errors.ts         # ComplianceError, PolicyDeniedError, etc.
├── db/
│   ├── connection.ts     # SQLite init (WAL, foreign keys, busy timeout)
│   ├── migrations.ts     # Versioned migration runner
│   └── schema.sql        # Master DDL (6 tables)
├── engine/
│   ├── types.ts          # Rule, Framework, EvaluationContext, EvaluationResult
│   ├── loader.ts         # YAML framework loader
│   └── evaluator.ts      # Policy evaluator (fail-closed)
├── vault/
│   ├── crypto.ts         # AES-256-GCM encrypt/decrypt
│   └── vault.ts          # Encrypted file store
├── pii/
│   ├── types.ts          # PiiMatch, PiiScanResult
│   ├── patterns.ts       # German PII regex patterns
│   └── detector.ts       # PII scanner
└── routes/
    ├── health.ts         # /healthz, /readyz
    ├── consent.ts        # POST/GET /api/v1/consent
    ├── audit.ts          # POST/GET /api/v1/audit
    ├── evaluate.ts       # POST /api/v1/evaluate
    ├── pii.ts            # POST /api/v1/pii/scan
    ├── evidence.ts       # POST/GET /api/v1/evidence
    ├── providers.ts      # POST/GET/PATCH /api/v1/providers
    ├── subjects.ts       # POST/GET/DELETE /api/v1/subjects
    └── reports.ts        # GET /api/v1/reports/summary
```

## Data Flow

### Agent Tool Call with Compliance Check

```
Agent → [consent_check tool] → Plugin → HTTP GET /api/v1/consent/check
                                              ↓
                                        Compliance Engine
                                              ↓
                                        SQLite: consent_records
                                              ↓
                                        Response: { has_consent: true/false }
```

### Policy Evaluation Before Data Processing

```
Agent → [before_agent_start hook] → Plugin → HTTP POST /api/v1/evaluate
                                                    ↓
                                              Rule Engine
                                                    ↓
                                              Load YAML rules → Check conditions
                                              (consent DB, provider DB, fields)
                                                    ↓
                                              Response: { allowed: true/false,
                                                          blocked_by: [...],
                                                          warnings: [...] }
```

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| fastify | ^5.3 | HTTP server |
| better-sqlite3 | ^11.8 | SQLite database |
| yaml | ^2.7 | YAML parsing for framework rules |
| pino | ^9.6 | Structured logging |
| tsx | ^4.19 | TypeScript execution (dev) |
| vitest | ^3.1 | Test framework |

**Zero SaaS dependencies.** Everything runs locally.
