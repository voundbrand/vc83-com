# Phase 6: Cleanup

> **Priority:** LOW (do after all functional phases)
> **Dependencies:** Phase 1-5 complete
> **Files touched:** ~10-15

## Goal

Remove all references to deleted tiers (Community, Starter, Professional) and clean up outdated documentation.

---

## 6A. Search and Update Old Tier References

### Files to check

Run this search to find all remaining references:

```bash
grep -rn '"community"\|"starter"\|"professional"\|COMMUNITY\|STARTER\|PROFESSIONAL' \
  --include="*.ts" --include="*.tsx" \
  convex/ src/
```

### Known files needing updates

| File | What to change |
|------|---------------|
| `convex/http.ts` | Update tier routing if tier names appear |
| `convex/seedApps.ts` | Update seed data tier references |
| `convex/actions/betaAccessEmails.ts` | Update tier names in email content |
| `convex/ai/systemKnowledge/index.ts` | Update AI knowledge about pricing tiers |
| `convex/ai/systemKnowledge/_content.ts` | Update tier descriptions |
| `convex/checkoutSessionOntology.ts` | Update tier references in ontology |
| `convex/eventOntology.ts` | Update tier references |
| `convex/zapier/triggers.ts` | Remove community subscription trigger |
| `convex/zapier/webhooks.ts` | Remove community webhook handling |
| `src/components/ai-billing/enterprise-contact-modal.tsx` | Verify works with new tiers |
| `src/components/window-content/platform-cart-window.tsx` | Update tier names in cart logic |

### Legacy tier mappings to keep temporarily

In `tierConfigs.ts` and `platformWebhooks.ts`, keep backward-compatible mappings for existing database records:

```typescript
// In webhook TIER_MAP — keep these for Stripe metadata compat
starter: "pro",
professional: "pro",
community: "free",
```

These can be removed after all existing Stripe subscriptions have cycled (or a data migration is run).

---

## 6B. Update AI System Knowledge

The AI agents use system knowledge that includes pricing information. Update:

- `convex/ai/systemKnowledge/_content.ts` — Replace old tier descriptions with:
  ```
  Platform tiers: Free (0 EUR, 5 credits/day), Pro (29 EUR/mo, 200 credits/mo),
  Agency (299 EUR/mo, 2000 credits/mo), Enterprise (custom, unlimited).
  Credits can be purchased separately. Annual billing saves 17%.
  ```

---

## 6C. Clean Up Old Docs

### Archive these (move to `docs/pricing-and-trials/ARCHIVE/`):

| Doc | Reason |
|-----|--------|
| `STORE-WINDOW-UPDATE.md` | References adding Community tier to old store |
| `STRIPE-CONFIGURATION.md` | References old 6-tier products (Community, Starter, Professional) |
| `IMPLEMENTATION-PLAN.md` | Old implementation plan for Community + trials |
| `IMPLEMENTATION-SUMMARY-TRIALS-AND-COMMUNITY.md` | Community tier summary |
| `PRICING-STRUCTURE-WITH-COMMUNITY.md` | Old pricing with Community |
| `STRIPE-14-DAY-TRIAL-IMPLEMENTATION.md` | Replaced by new trial on Agency only |
| `COMMUNITY-TIER-GUEST-CHECKOUT.md` | Community tier no longer exists |

### Keep these (still relevant):

| Doc | Reason |
|-----|--------|
| `NEW_PRICING_PLAN.md` | Source of truth for new 4-tier model |
| `CHECKOUT_RESULT_WINDOW_PLAN.md` | Reference for purchase-result-window (already built) |
| `STRIPE-SETUP-GUIDE.md` | General Stripe setup (update tier names) |
| `README.md` | Update to reference new pricing |
| `UPDATE_PRICING/` | This folder — current implementation docs |

---

## 6D. Remove Unused Components

After verifying the new store works end-to-end:

| File | Action | Reason |
|------|--------|--------|
| `checkout-success-window.tsx` | DELETE | Replaced by `purchase-result-window.tsx` (Phase 4D) |
| `checkout-failed-window.tsx` | DELETE | Replaced by `purchase-result-window.tsx` (Phase 4D) |

---

## Verification

### Full type check
```bash
npx tsc --noEmit
```

### Build check
```bash
npm run build
```

### Final grep — no old tier names in active code
```bash
# Should return 0 results in non-archive, non-deprecated files
grep -rn '"community"\|"starter"\|"professional"' \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir=ARCHIVE \
  convex/ src/ | grep -v "@deprecated" | grep -v "LEGACY" | grep -v "backward"
```

### Manual smoke test
1. Open store → see 4 plans + credit section
2. Click Pro "Subscribe" → Stripe checkout opens
3. Complete test payment → redirected with `?purchase=success&type=plan&tier=pro`
4. PurchaseResultWindow shows "Welcome to Pro!" with confetti
5. Check Resend dashboard → "Welcome to Pro" email sent
6. Open store → Pro shows "Current Plan" badge
7. Click "Downgrade" on Free → subscription change succeeds
8. PurchaseResultWindow shows "Cancellation Scheduled"
9. Check Resend → "Subscription ending" email sent
