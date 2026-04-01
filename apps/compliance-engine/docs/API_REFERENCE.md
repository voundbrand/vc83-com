# API Reference

Base URL: `http://127.0.0.1:3335`

## Health

### GET /healthz
Liveness probe.

**Response:** `200`
```json
{ "status": "ok", "timestamp": "2026-04-01T00:00:00.000Z" }
```

### GET /readyz
Readiness probe (checks database).

**Response:** `200` or `503`
```json
{ "status": "ready", "schemaVersion": 1, "timestamp": "..." }
```

---

## Consent (GDPR Art 6/7)

### POST /api/v1/consent
Record a consent decision.

**Body:**
```json
{
  "subject_id": "user-123",
  "consent_type": "data_processing",
  "granted": true,
  "legal_basis": "art6_1a",
  "purpose": "AI agent scheduling assistance",
  "policy_version": "1.0",
  "source": "web_form",
  "expires_at": "2027-01-01T00:00:00Z",
  "metadata": {}
}
```

**Response:** `201`
```json
{ "id": "uuid", "subject_id": "user-123", "granted": true, ... }
```

### GET /api/v1/consent
Query consent records.

**Query params:** `subject_id`, `consent_type`, `limit`, `offset`

### GET /api/v1/consent/check
Quick consent status check (for agent tools).

**Query params:** `subject_id` (required), `consent_type` (required)

**Response:**
```json
{ "has_consent": true, "legal_basis": "art6_1a", "reason": "active_consent" }
```

---

## Audit Trail (GDPR Art 30)

### POST /api/v1/audit
Append an audit event.

**Body:**
```json
{
  "event_type": "agent.tool_call",
  "actor": "agent-samantha",
  "subject_id": "client-1",
  "action": "search_calendar",
  "resource": "calendar:client-1",
  "outcome": "allowed",
  "framework": "gdpr",
  "rule_id": "gdpr.consent.data_processing",
  "details": { "tool": "calendar_search" }
}
```

### GET /api/v1/audit
Query audit events.

**Query params:** `subject_id`, `event_type`, `actor`, `framework`, `from`, `to`, `limit`, `offset`

---

## Policy Evaluation

### POST /api/v1/evaluate
Evaluate an action against all loaded framework rules.

**Body:**
```json
{
  "action": "process_data",
  "subject_id": "client-1",
  "actor": "agent-samantha",
  "provider_id": "hetzner",
  "fields": {
    "purpose": "scheduling",
    "data_categories": "contact_info"
  }
}
```

**Response:**
```json
{
  "allowed": false,
  "results": [{ "rule_id": "gdpr.consent.data_processing", "passed": false, ... }],
  "blocked_by": [{ "rule_id": "...", "message": "..." }],
  "warnings": [{ "rule_id": "...", "message": "..." }]
}
```

---

## PII Detection

### POST /api/v1/pii/scan
Scan text for personally identifiable information.

**Body:**
```json
{ "text": "Contact hans@example.com or call +49 30 12345678" }
```

**Response:**
```json
{
  "has_pii": true,
  "matches": [
    { "type": "email", "value": "ha***om", "start": 8, "end": 24, "confidence": "high" }
  ],
  "summary": { "email": 1, "phone_de": 1 }
}
```

---

## Evidence Vault (GDPR Art 5(2))

### POST /api/v1/evidence
Upload an encrypted evidence artifact.

**Body:**
```json
{
  "title": "DPA with Hetzner",
  "artifact_type": "dpa",
  "data": "<base64-encoded>",
  "mime_type": "application/pdf",
  "provider_id": "hetzner",
  "uploaded_by": "admin"
}
```

### GET /api/v1/evidence
List evidence artifacts.

**Query params:** `artifact_type`, `provider_id`, `limit`, `offset`

### GET /api/v1/evidence/:id
Get single artifact metadata.

---

## Provider Registry (GDPR Art 28)

### POST /api/v1/providers
Register a subprocessor.

**Body:**
```json
{
  "name": "Hetzner",
  "provider_type": "hosting",
  "dpa_status": "signed",
  "data_location": "DE",
  "transfer_mechanism": "none_required",
  "tom_status": "documented"
}
```

### GET /api/v1/providers
List providers.

**Query params:** `dpa_status`, `provider_type`, `active`, `limit`, `offset`

### PATCH /api/v1/providers/:id
Update provider status.

---

## Data Subjects (GDPR Art 15-22)

### POST /api/v1/subjects
Register a data subject.

**Body:**
```json
{
  "external_id": "crm-contact-123",
  "pseudonym": "Client A",
  "category": "client"
}
```

### GET /api/v1/subjects/:id
Get data subject info.

### DELETE /api/v1/subjects/:id
Art 17 — Right to erasure. Soft-deletes subject, removes consent records.

### GET /api/v1/subjects/:id/export
Art 20 — Right to data portability. Returns all data associated with the subject.

---

## Reports

### GET /api/v1/reports/summary
Compliance posture report.

**Response:**
```json
{
  "posture_score": 75,
  "frameworks": [{ "id": "gdpr", "name": "GDPR / DSGVO", "rule_count": 7 }],
  "consent": { "total": 10, "granted": 8, "revoked": 2 },
  "providers": { "total": 5, "dpa_signed": 3, "dpa_missing": 2 },
  "subjects": { "total": 50, "erased": 2 },
  "audit": { "total": 1500, "denied": 45 },
  "evidence": { "total": 12 }
}
```

---

## Governance Release Gate

### GET /api/v1/governance/readiness
Weekly release-gate readiness export for runtime consumers.

**Response:** `200`
```json
{
  "decision": "NO_GO",
  "posture_score": 68,
  "frameworks": [
    { "id": "gdpr", "name": "GDPR / DSGVO" },
    { "id": "stgb_203", "name": "§203 StGB" }
  ],
  "blockers": [
    {
      "category": "provider",
      "description": "OpenRouter Inc.: Provider in US — transfer mechanism required (GDPR Art 44-49)",
      "provider_id": "uuid",
      "action_required": "Establish Standard Contractual Clauses (SCCs) or other Art 46 mechanism",
      "owner": "unassigned"
    }
  ],
  "warnings": [],
  "provider_status": [],
  "evidence_count": 3,
  "generated_at": "2026-04-01T14:00:00.000Z",
  "timestamp": "2026-04-01T14:00:00.000Z"
}
```

Export contract requirements:
1. `decision` is mandatory and controls release (`GO` or `NO_GO`).
2. `blockers[*].owner` is mandatory; unresolved or `unassigned` ownership remains fail-closed.
3. `evidence_count` is mandatory for release package traceability.
4. `generated_at` and `timestamp` are mandatory ISO-8601 generation timestamps.

### Weekly handoff to NemoClaw release package (`NCLAW-020`)

1. Generate readiness payload via `GET /api/v1/governance/readiness`.
2. Attach payload JSON + provider evidence artifacts to weekly release package.
3. If `decision=NO_GO`, carry blocker owner/action list into release notes and stop promotion.
4. If `decision=GO`, include payload timestamp and evidence count in release-gate signoff.
