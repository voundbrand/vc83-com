# F13 - OAuth, API Keys, and Integration Authorization

## Intent

Authorize external clients and platform integrations, issue scoped credentials, and enforce scoped access across API operations.

## Entry points

- OAuth endpoints in `convex/oauth/endpoints.ts`
- API auth middleware in `convex/middleware/auth.ts`
- Integration settings in `convex/integrations/*`

## Primary anchors

- `convex/oauth/authorize.ts`
- `convex/oauth/tokens.ts`
- `convex/oauth/endpoints.ts`
- `convex/apiKeysInternal.ts`
- `convex/middleware/auth.ts`
- `convex/organizationApiSettings.ts`

## Sequence

```mermaid
sequenceDiagram
    participant Client as External App/Integrator
    participant OAuth as OAuth Endpoints
    participant Consent as Authorization Runtime
    participant Tokens as Token Runtime
    participant Auth as API Auth Middleware
    participant API as v1 API Endpoints
    participant Integrations as Integration Config Runtime
    participant DB

    Client->>OAuth: /oauth/authorize request
    OAuth->>Consent: Validate client, redirect URI, scopes, PKCE
    Consent->>DB: Read oauth app + membership context
    Consent-->>Client: Redirect with authorization code

    Client->>OAuth: Exchange code for tokens
    OAuth->>Tokens: Sign JWT/refresh token and persist state
    Tokens->>DB: Store token/session metadata

    Client->>API: Call API with API key or OAuth bearer token
    API->>Auth: authenticateRequest + requireScopes
    Auth->>DB: Resolve key/token/org context
    Auth-->>API: Effective organization + scopes
    API-->>Client: Scoped response

    Client->>Integrations: Save/update provider integration settings
    Integrations->>DB: Persist provider credentials/bindings
```

## Invariants

1. OAuth authorization must validate redirect URIs and allowed scopes before code issuance.
2. API request handling must apply scope checks after authentication, never before.
3. Integration credentials must remain organization-scoped and auditable.
