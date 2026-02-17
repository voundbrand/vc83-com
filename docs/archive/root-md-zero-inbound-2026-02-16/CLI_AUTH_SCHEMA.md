# CLI Authentication Schema Requirements

## Database Tables Needed

### 1. `cliSessions` Table

Stores CLI session tokens for authenticated CLI users.

```typescript
cliSessions: defineTable({
  userId: v.id("users"),
  email: v.string(),
  organizationId: v.id("organizations"),
  cliToken: v.string(), // Format: cli_session_{32_random_bytes}
  createdAt: v.number(),
  expiresAt: v.number(), // 30 days from creation
  lastUsedAt: v.number(),
})
  .index("by_token", ["cliToken"])
  .index("by_user", ["userId"])
  .index("by_organization", ["organizationId"])
```

### 2. `cliLoginStates` Table

Stores temporary OAuth state tokens during CLI login flow.

```typescript
cliLoginStates: defineTable({
  state: v.string(), // UUID for CSRF protection
  cliToken: v.string(), // Pre-generated token to store after OAuth
  callbackUrl: v.string(), // Where to redirect after OAuth
  createdAt: v.number(),
  expiresAt: v.number(), // 10 minutes
})
  .index("by_state", ["state"])
```

## Schema File Location

Add these tables to: `convex/schemas/coreSchemas.ts` (or appropriate schema file)

## Indexes

- `cliSessions.by_token` - For fast token lookup during validation
- `cliSessions.by_user` - For listing user's CLI sessions
- `cliSessions.by_organization` - For organization-scoped queries
- `cliLoginStates.by_state` - For OAuth state verification

## Cleanup

Consider adding a scheduled job to:
- Delete expired `cliLoginStates` records (older than 10 minutes)
- Delete expired `cliSessions` records (older than expiration date)
- Optionally: Delete unused `cliSessions` (not used in 90 days)

