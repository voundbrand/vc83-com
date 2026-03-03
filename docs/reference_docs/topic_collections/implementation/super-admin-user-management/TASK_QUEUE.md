# TASK_QUEUE

## Queue Rules

- Status flow is dependency-based and deterministic: `READY` -> `IN_PROGRESS` -> `DONE` (or `BLOCKED`/`PENDING` when needed).
- Allowed statuses: `READY`, `IN_PROGRESS`, `PENDING`, `BLOCKED`, `DONE`.
- Verification commands are mandatory before promoting a row to `DONE`.

## Verification Profiles

- `V-TYPE`: `npm run typecheck`
- `V-UNIT`: `npm run test:unit`
- `V-DOCS`: `npm run docs:guard`

## Execution Lanes

| Lane | Focus | Concurrency Rule |
| --- | --- | --- |
| `A` | Super-admin user management backend + UI + tests | Exclusive lane for this workstream |

## Deterministic Task Rows

| ID | Lane | Plan | Priority | Status | Depends On | Task | Primary files | Verify | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `SAUM-001` | `A` | 1 | `P0` | `DONE` | - | Build Super Admin user-management tab with cross-org list/detail CRUD controls, strict super-admin mutation gating, ownership/self-lockout safeguards, and audit logging | `convex/superAdminUserManagement.ts`; `convex/superAdminUserManagementGuards.ts`; `src/components/window-content/super-admin-organizations-window/index.tsx`; `src/components/window-content/super-admin-organizations-window/super-admin-users-tab.tsx`; `tests/unit/permissions/superAdminUserManagementGuards.test.ts` | `V-TYPE`; `V-UNIT`; `V-DOCS` | Done 2026-03-02. Follow-up same day: replaced full-table user list loading with cursor paging and deterministic index-driven sort keys (`email`, `name`, `createdAt`) plus super-admin backfill mutation for legacy users. |
