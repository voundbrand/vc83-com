# SESSION_PROMPTS

## Lane A Prompt

Implement and verify Super Admin user management using existing Convex RBAC helpers and audit logging patterns.

### Lane Rules

- Do not bypass super-admin checks for any mutation.
- Preserve fail-closed membership/ownership invariants.
- Keep changes localized to backend user-management module + super-admin window UI + targeted tests.
