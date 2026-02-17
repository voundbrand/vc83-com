# F15 - Governance, Audit, and Runtime Guards

## Intent

Apply security and governance controls (RBAC, rate limiting, usage telemetry, audit logging, compliance outputs) around all critical runtime operations.

## Entry points

- API and runtime middleware (`convex/middleware/*`)
- RBAC and permission checks (`convex/rbac*.ts`)
- Compliance/audit modules (`convex/compliance.ts`, `convex/auditLogExport.ts`)

## Primary anchors

- `convex/middleware/auth.ts`
- `convex/middleware/rateLimit.ts`
- `convex/rbac.ts`
- `convex/security/usageTracking.ts`
- `convex/auditLogExport.ts`
- `convex/compliance.ts`

## Sequence

```mermaid
sequenceDiagram
    participant Caller
    participant Auth as Auth Middleware
    participant Limit as Rate Limit Middleware
    participant RBAC as RBAC/Permission Runtime
    participant Domain as Target Domain Runtime
    participant Usage as Usage Tracking
    participant Audit as Audit/Compliance Runtime
    participant DB

    Caller->>Auth: API or action request
    Auth->>DB: Validate API key/OAuth/session identity
    Auth-->>Caller: Unauthorized error on failure

    Auth->>Limit: Check token bucket limits
    Limit->>DB: Resolve/update bucket state
    Limit-->>Caller: 429 on limit violations

    Limit->>RBAC: Check role/permission policy
    RBAC->>DB: Resolve memberships and grants
    RBAC-->>Caller: Permission error on denial

    RBAC->>Domain: Execute allowed domain logic
    Domain->>DB: Persist business state

    Domain->>Usage: Async usage metadata tracking
    Usage->>DB: Insert usage/anomaly records
    Domain->>Audit: Write audit/compliance logs
    Audit->>DB: Persist audit trail and exportable records
```

## Invariants

1. Authentication, rate limit, and permission checks execute in that order.
2. Guard failures return explicit errors and block domain mutations.
3. Governance telemetry/audit writes must be append-only and organization-scoped.
