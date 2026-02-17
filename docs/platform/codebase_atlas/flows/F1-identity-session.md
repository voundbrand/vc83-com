# F1 - Identity and Session Lifecycle

## Intent

Authenticate users (password, OAuth, passkeys), establish session context, and enforce authorization.

## Entry points

- `src/app/api/auth/*`
- `src/app/api/passkeys/*`
- `src/app/api/oauth/*`

## Primary anchors

- `convex/auth.ts`
- `convex/passkeys.ts`
- `convex/portalAuth.ts`
- `convex/rbac.ts`
- `convex/rbacQueries.ts`

## Sequence

```mermaid
sequenceDiagram
    participant User
    participant NextAPI as Next API Route
    participant Auth as Convex Auth
    participant RBAC as Convex RBAC
    participant DB

    User->>NextAPI: Submit login / oauth callback / passkey verify
    NextAPI->>Auth: Validate credentials or challenge response
    Auth->>DB: Read user/session/passkey records
    DB-->>Auth: User + auth state
    Auth->>RBAC: Resolve org role and permissions
    RBAC->>DB: Read memberships/roles/policies
    DB-->>RBAC: Effective grants
    RBAC-->>Auth: Authorization context
    Auth-->>NextAPI: Session established
    NextAPI-->>User: Authenticated response
```

## Invariants

1. Authentication and authorization remain separate concerns.
2. Session creation must produce org-aware permission context.
3. Passkey flows must verify challenge before session issuance.
