# Payment Providers Migration Guide

## Overview

This guide covers the migration from the old payment provider structure to the new improved architecture.

## What Changed?

### Before (Old Structure)
```
src/templates/checkout/providers/
├── index.ts
├── types.ts
├── stripe.ts
└── manual.ts
```

### After (New Structure)
```
src/lib/payment-providers/      # ✅ NEW LOCATION
├── index.ts
├── types.ts
├── stripe.ts
└── manual.ts
```

## Why the Change?

### ✅ **Better Organization**
- Payment providers are infrastructure, not templates
- Clearer separation: `convex/` = backend, `src/lib/` = frontend infrastructure

### ✅ **Reusability**
- Can be used by multiple checkout templates
- Can be used outside checkout (donations, subscriptions, etc.)

### ✅ **Clearer Architecture**
- Backend operations: `convex/paymentProviders/`
- Frontend operations: `src/lib/payment-providers/`
- UI Templates: `src/templates/checkout/`

## Migration Steps

### Step 1: Update Imports

**Old Import** (❌ No longer works):
```typescript
import { StripePaymentProvider } from "@/templates/checkout/providers";
import { getPaymentProvider } from "@/templates/checkout/providers";
import type { IPaymentProvider } from "@/templates/checkout/providers/types";
```

**New Import** (✅ Use this):
```typescript
import { StripePaymentProvider } from "@/lib/payment-providers";
import { getPaymentProvider } from "@/lib/payment-providers";
import type { IPaymentProvider } from "@/lib/payment-providers/types";
```

### Step 2: Update Path Aliases (if using)

If you have custom path aliases in `tsconfig.json`, update them:

```json
{
  "compilerOptions": {
    "paths": {
      "@/lib/*": ["./src/lib/*"],
      "@/templates/*": ["./src/templates/*"]
    }
  }
}
```

### Step 3: Update Dynamic Imports

**Old** (❌):
```typescript
const { StripePaymentProvider } = await import("@/templates/checkout/providers");
```

**New** (✅):
```typescript
const { StripePaymentProvider } = await import("@/lib/payment-providers");
```

## Common Import Patterns

### Importing Specific Provider

**Before**:
```typescript
import { StripePaymentProvider } from "../../templates/checkout/providers/stripe";
```

**After**:
```typescript
import { StripePaymentProvider } from "@/lib/payment-providers/stripe";
// Or just:
import { StripePaymentProvider } from "@/lib/payment-providers";
```

### Importing Types

**Before**:
```typescript
import type {
  IPaymentProvider,
  CreateSessionOptions,
  PaymentProviderConfig,
} from "../../templates/checkout/providers/types";
```

**After**:
```typescript
import type {
  IPaymentProvider,
  CreateSessionOptions,
  PaymentProviderConfig,
} from "@/lib/payment-providers/types";
// Or just:
import type {
  IPaymentProvider,
  CreateSessionOptions,
  PaymentProviderConfig,
} from "@/lib/payment-providers";
```

### Importing Helper Functions

**Before**:
```typescript
import { getPaymentProvider, isValidProvider } from "../../templates/checkout/providers";
```

**After**:
```typescript
import { getPaymentProvider, isValidProvider } from "@/lib/payment-providers";
```

## Files That Need Updating

Run this command to find files that need updating:

```bash
grep -r "templates/checkout/providers" src/ --include="*.ts" --include="*.tsx"
```

If any files are found, update their imports according to the patterns above.

## Verification

After migration, verify everything works:

```bash
# Check for any remaining old imports
grep -r "templates/checkout/providers" src/

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Run tests (if you have them)
npm test
```

All checks should pass with no errors.

## Breaking Changes

### ⚠️ None!

This migration is **non-breaking** because:
- All APIs remain the same
- Only import paths changed
- Old directory was completely removed to prevent confusion

## Rollback (Not Recommended)

If you need to rollback for any reason:

```bash
# Restore old directory
git checkout src/templates/checkout/providers/

# Revert import changes
git checkout src/
```

However, this is **not recommended** as the new structure is superior.

## Benefits After Migration

### ✅ **Clearer Structure**
```
convex/paymentProviders/    → Backend payment operations
src/lib/payment-providers/  → Frontend payment integrations
src/templates/checkout/     → Checkout UI templates only
```

### ✅ **Better Imports**
```typescript
// Clean, short imports
import { StripePaymentProvider } from "@/lib/payment-providers";

// No more deep relative paths
// ❌ import { ... } from "../../../../templates/checkout/providers";
```

### ✅ **Reusable**
```typescript
// Can use in any component
import { getPaymentProvider } from "@/lib/payment-providers";

// Not limited to checkout templates
export function DonationForm() {
  const provider = await getPaymentProvider(config);
  // Use provider for donations
}
```

## Common Issues

### Issue: "Module not found: Can't resolve '@/templates/checkout/providers'"

**Cause**: Old import path still in use

**Fix**: Update to new path:
```typescript
import { ... } from "@/lib/payment-providers";
```

### Issue: TypeScript errors after migration

**Cause**: TypeScript cache out of date

**Fix**: Clear cache and rebuild:
```bash
rm -rf node_modules/.cache
npm run typecheck
```

### Issue: "Cannot find module" in tests

**Cause**: Test mocks using old paths

**Fix**: Update test mocks:
```typescript
// Old
jest.mock('@/templates/checkout/providers');

// New
jest.mock('@/lib/payment-providers');
```

## Architecture Reference

For detailed architecture documentation, see:
- [PAYMENT_PROVIDERS_ARCHITECTURE.md](./billing/payment-providers-architecture.md)

For tax integration specifics, see:
- [STRIPE_TAX_INTEGRATION.md](./billing/stripe-tax-integration.md)
- [TAX_SYSTEM.md](./billing/tax-system.md)

## Questions?

If you encounter any issues during migration:
1. Check this guide first
2. Review the architecture documentation
3. Check for TypeScript errors: `npm run typecheck`
4. Open an issue with specific error messages

## Completed Migration Checklist

- [x] Created new `src/lib/payment-providers/` directory
- [x] Copied all provider files to new location
- [x] Updated import paths in provider files
- [x] Removed old `src/templates/checkout/providers/` directory
- [x] Verified TypeScript compilation (`npm run typecheck`)
- [x] Verified linting (`npm run lint`)
- [x] Created architecture documentation
- [x] Created migration guide

✅ **Migration Complete!**
