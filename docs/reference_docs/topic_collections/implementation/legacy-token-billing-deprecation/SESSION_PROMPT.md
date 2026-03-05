# Session Prompt: Deprecate Legacy Token Billing System

## Objective

Remove the legacy `aiTokenBalance`/`aiSubscriptions`/`aiTokenPurchases` billing path and consolidate all billing onto the **existing `creditBalances` system** (`convex/credits/index.ts`). The runtime charging already uses credits — this session removes the dead legacy write paths, UI components, and backend mutations.

## Context

The codebase has TWO parallel billing systems:

### New System (KEEP — already authoritative for runtime)
- **Table:** `creditBalances` (gifted, daily, monthly, purchased buckets)
- **Table:** `creditTransactions` (full audit trail)
- **Deduction:** `deductCredits` / `deductCreditsInternalMutation` in `convex/credits/index.ts`
- **Granting:** `grantGiftedCredits`, `grantDailyCredits`, `grantMonthlyCredits`, `addPurchasedCredits`
- **Super admin grant:** `superAdminGrantCredits` mutation in `convex/credits/index.ts` (just added)
- **Super admin UI:** `credit-grant-issuance.tsx` in `manage-org/components/` (just added)
- **Balance query:** `getCreditBalance` in `convex/credits/index.ts`
- **Tier configs:** `convex/licensing/tierConfigs.ts` — each tier has `monthlyCredits` and `dailyCreditsOnLogin`

### Legacy System (DEPRECATE — no longer used for runtime authorization)
- **Table:** `aiTokenBalance` — `purchasedTokens` field; nothing deducts from it at runtime
- **Table:** `aiTokenPurchases` — audit trail for legacy token pack purchases
- **Table:** `aiSubscriptions` — Stripe subscription records with `includedTokensTotal/Used/Remaining`
- **Mutation:** `issueManualTokens` in `convex/ai/manualGrants.ts:188-284` — writes to `aiTokenBalance` + `aiTokenPurchases`
- **Mutation:** `grantManualSubscription` in `convex/ai/manualGrants.ts:41-166` — writes to `aiSubscriptions`
- **Query:** `getTokenBalance` in `convex/ai/billing.ts:884-910`
- **Query:** `getSubscriptionStatus` in `convex/ai/billing.ts:831-877`
- **UI:** `token-pack-issuance.tsx` in `manage-org/components/` — calls `issueManualTokens`
- **UI:** `manual-subscription-grant.tsx` in `manage-org/components/` — calls `grantManualSubscription`
- **UI:** `manual-grants-history.tsx` in `manage-org/components/` — reads from objects table `type="organization_manual_grant"`
- **Webhook:** `convex/stripe/aiWebhooks.ts` — processes Stripe events into `aiSubscriptions`
- **Hook:** `src/hooks/use-ai-config.ts` — `AIBillingStatus` interface has `includedTokensRemaining/Total/Used`

The runtime path (`convex/ai/billing.ts:recordUsage` at line ~1339) already **rejects** legacy token mode with an explicit guard. So the legacy tables are write-only dead weight.

## Tasks

### 1. Remove Legacy Super Admin UI Components

**Delete these files entirely:**
- `src/components/window-content/super-admin-organizations-window/manage-org/components/token-pack-issuance.tsx`
- `src/components/window-content/super-admin-organizations-window/manage-org/components/manual-subscription-grant.tsx`

**Keep but clean up:**
- `src/components/window-content/super-admin-organizations-window/manage-org/components/manual-grants-history.tsx` — keep this for historical audit; it reads from the objects table which is still useful for invoicing
- `src/components/window-content/super-admin-organizations-window/manage-org/licensing-tab.tsx` — remove imports of `TokenPackIssuance` and `ManualSubscriptionGrant`, remove their JSX mounts. Keep the `CreditGrantIssuance` and `ManualGrantsHistory` components.

### 2. Remove Legacy Backend Mutations

**In `convex/ai/manualGrants.ts`:**
- Remove `issueManualTokens` mutation (lines 188-284)
- Remove `grantManualSubscription` mutation (lines 41-166)
- Keep `listManualGrants` query and `markGrantsAsInvoiced` mutation (they read from objects table, not legacy billing tables)

**In `convex/ai/billing.ts`:**
- Remove `getTokenBalance` query (lines 884-910)
- Remove or deprecate `getSubscriptionStatus` query (lines 831-877) — check if anything else still needs it first. If the licensing-tab or ai-config hook still references it, replace with credit balance query.
- Remove `resetMonthlyTokenUsage` mutation if it exists (already disabled)
- Keep `recordUsage` — it's the active usage recording path

### 3. Clean Up Frontend References

**In `src/hooks/use-ai-config.ts`:**
- Remove `includedTokensRemaining`, `includedTokensTotal`, `includedTokensUsed` from `AIBillingStatus` interface
- Remove any query call to `getSubscriptionStatus` or `getTokenBalance`
- If the hook needs billing info, use `getCreditBalance` from credits system instead

**In `src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx`:**
- Check for references to legacy billing queries and replace with credit balance

**In `src/components/window-content/org-owner-manage-window/billing-tab.tsx`:**
- This may already use the new credit system — verify and clean up any remaining legacy references

### 4. Handle Stripe Webhook Path

**In `convex/stripe/aiWebhooks.ts`:**
- The `processAIWebhook` action creates/updates `aiSubscriptions` records from Stripe events
- This is the trickiest part. Options:
  - **Option A (recommended):** Keep `aiSubscriptions` table as a **Stripe sync mirror** (rename concept to "stripe subscription records") but stop using it for token accounting. Remove `TOKEN_LIMITS` and `getTokenLimitForTier`. When a subscription event arrives, sync the record AND call `grantMonthlyCredits` on the credits system with the tier's `monthlyCredits` from `tierConfigs.ts`.
  - **Option B:** Remove entirely if Stripe subscriptions are managed elsewhere (check `convex/stripe/platformCheckout.ts` for overlap)

### 5. Schema Cleanup

**In `convex/schemas/aiBillingSchemas.ts`:**
- Do NOT delete the `aiTokenBalance` or `aiTokenPurchases` table definitions yet (Convex requires schema stability for deployed tables with data)
- Add deprecation comments to make intent clear
- Keep `aiSubscriptions` if taking Option A above (Stripe sync mirror)
- Keep `aiUsage`, `aiBudgetAlerts`, `aiBillingEvents` — these are active

### 6. Clean Up `.next/types/` Cache

After deleting files, run:
```bash
rm -rf .next/types
```
The `.next/types/` cache can hold stale references to deleted files.

## Files to Read First

Before making changes, read these files in full to understand the current state:

1. `convex/credits/index.ts` — the authoritative credit system (3700+ lines)
2. `convex/ai/billing.ts` — legacy billing engine
3. `convex/ai/manualGrants.ts` — legacy manual grant mutations
4. `convex/stripe/aiWebhooks.ts` — Stripe webhook processing
5. `src/hooks/use-ai-config.ts` — frontend AI config hook
6. `src/components/window-content/super-admin-organizations-window/manage-org/licensing-tab.tsx` — licensing tab that mounts components
7. `convex/licensing/tierConfigs.ts` — tier definitions with `monthlyCredits` allocations
8. `convex/schemas/aiBillingSchemas.ts` — schema definitions for legacy tables

## Verification

After all changes:

1. **Type check:** `npx tsc --noEmit --pretty` — must pass with 0 errors
2. **Search for dead imports:** Grep for `getTokenBalance`, `issueManualTokens`, `grantManualSubscription`, `getSubscriptionStatus`, `TokenPackIssuance`, `ManualSubscriptionGrant` — should have zero results in production code (docs/tests are OK)
3. **Verify credit flow:** The following path must still work:
   - User sends AI chat message → `recordUsage` → `deductCredits` → `creditBalances` debited
   - Super admin grants credits → `superAdminGrantCredits` → `creditBalances.giftedCredits` credited
   - Daily login → `grantDailyCredits` → `creditBalances.dailyCredits` reset
   - Stripe subscription start → webhook → `grantMonthlyCredits` → `creditBalances.monthlyCredits` set
4. **UI check:** Super admin licensing tab should show:
   - `CreditGrantIssuance` (grant credits) — working
   - `ManualGrantsHistory` (audit trail) — working
   - NO token pack issuance, NO manual subscription grant

## Important Constraints

- **Do NOT delete Convex table definitions** for `aiTokenBalance`, `aiTokenPurchases`, `aiSubscriptions` from the schema file — deployed tables with data require schema stability. Just add deprecation comments.
- **Do NOT run `npx convex dev`** — it deploys to backend. Use `npx tsc --noEmit` for type checking.
- **Do NOT run `git stash`** or other destructive git commands without asking.
- Keep files under 500 lines where possible.
- The `manual-grants-history.tsx` component reads from the `objects` table (not the legacy billing tables), so it should be preserved for invoicing workflows.
