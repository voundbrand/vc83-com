# Translation System Migration Status

## Summary
- ✅ **49 components** migrated to `useNamespaceTranslations`
- ❌ **19 components** still using deprecated `getAllTranslations` via `useTranslation().t()`

## Components Still Using Deprecated `useTranslation().t()`

### Checkout Components (Legacy - 5 files)
These are the OLD checkout components in `src/components/checkout/steps/`:
- `confirmation-step.tsx`
- `customer-info-step.tsx`
- `payment-form-step.tsx`
- `product-selection-step.tsx`
- `registration-form-step.tsx`

**Note:** These are superseded by the NEW behavior-driven checkout in `src/templates/checkout/behavior-driven/` which IS already migrated.

### Super Admin Components (8 files)
`src/components/window-content/super-admin-organizations-window/`:
- `index.tsx`
- `system-organizations-tab.tsx`
- `organizations-list-tab.tsx`
- `manage-org/index.tsx`
- `manage-org/invite-user-modal.tsx`
- `manage-org/roles-permissions-tab.tsx`
- `manage-org/user-management-table.tsx`
- `manage-org/delete-account-modal.tsx`
- `manage-org/user-edit-modal.tsx`
- `manage-org/organization-details-form.tsx`
- `manage-org/components/address-card.tsx`
- `manage-org/components/address-modal.tsx`
- `manage-org/components/address-form.tsx`

### Tickets Components (3 files)
`src/components/window-content/tickets-window/`:
- `tickets-list.tsx`
- `ticket-form.tsx`
- `ticket-detail-modal.tsx`

### Other Components (3 files)
- `src/components/window-content/translations-window.tsx`
- `src/components/window-content/payments-window/stripe-section.tsx`

## Checkout Translation - FULLY MIGRATED ✅

All behavior-driven checkout components now use namespace-based translations:
- ✅ `src/templates/checkout/behavior-driven/index.tsx`
- ✅ `src/templates/checkout/behavior-driven/steps/product-selection.tsx`
- ✅ `src/templates/checkout/behavior-driven/steps/registration-form.tsx`
- ✅ `src/templates/checkout/behavior-driven/steps/customer-info.tsx`
- ✅ `src/templates/checkout/behavior-driven/steps/review-order.tsx`
- ✅ `src/templates/checkout/behavior-driven/steps/payment.tsx`
- ✅ `src/templates/checkout/behavior-driven/steps/confirmation.tsx`

Namespace: `ui.checkout_template.behavior_driven`

## Next Steps

To eliminate the deprecation warning completely, we need to migrate the 19 remaining components to use `useNamespaceTranslations`.

### Recommended Migration Priority:
1. **Low Priority**: Old checkout components (already superseded by behavior-driven)
2. **Medium Priority**: Tickets components (actively used)
3. **High Priority**: Super admin components (critical for admin workflow)
4. **High Priority**: Translations window (translation management UI)

### Migration Pattern:
```typescript
// OLD (deprecated):
import { useTranslation } from "@/contexts/translation-context";
const { t } = useTranslation();

// NEW (namespace-based):
import { useTranslation } from "@/contexts/translation-context";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
const { locale } = useTranslation(); // For locale management only
const { t } = useNamespaceTranslations("ui.component_namespace");
```
