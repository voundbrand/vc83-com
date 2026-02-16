# Quick Wins - Low Effort, High Impact Refactoring

Items ordered by effort (smallest first). Each can be done independently.

---

## 1. Delete Dead Code (30 minutes)

### Files to remove:
```
src/app/project/gerrit-old/          (6,978 lines)
src/app/project/rikscha-old/         (1,801 lines)
```

### Files to consolidate:
```
# Keep only v3, rename to canonical name:
src/components/window-content/org-owner-manage-window/ai-settings-tab.tsx      -> DELETE
src/components/window-content/org-owner-manage-window/ai-settings-tab-v2.tsx   -> DELETE
src/components/window-content/org-owner-manage-window/ai-settings-tab-v3.tsx   -> RENAME to ai-settings-tab.tsx
```

### Example files to relocate:
```
convex/middleware/rateLimitExample.ts       -> docs/examples/convex/rateLimitExample.ts
convex/middleware/anomalyDetectionExample.ts -> docs/examples/convex/anomalyDetectionExample.ts
convex/security/usageTrackingExample.ts     -> docs/examples/convex/usageTrackingExample.ts
```

**Lines saved:** ~11,000+
**Risk:** Very low (old files have new replacements, verify no imports first)

---

## 2. Fix Password Hashing (30 minutes)

**File:** `convex/crmIntegrations.ts:787`

Change:
```typescript
passwordHash: args.password, // TODO: Actually hash this!
```

To use the same hashing approach as `convex/auth.ts`. The calling code should hash before passing to this mutation, matching the pattern in all other 5 password storage locations.

**Risk:** Low (one-line change + caller update)

---

## 3. ~~Deduplicate Address Form~~ — SKIPPED

**Reason:** Intentional duplication. The org-owner and super-admin address forms use different translation namespaces (`ui.manage` vs `ui.organizations`) and are kept separate by design so each context can evolve independently.

---

## 4. Extract Error Utilities (2 hours)

**Create:** `convex/lib/errors.ts`

```typescript
import { ConvexError } from "convex/values";

export function requireEntity<T>(entity: T | null | undefined, entityName: string): T {
  if (entity == null) {
    throw new ConvexError({ code: "NOT_FOUND", message: `${entityName} not found` });
  }
  return entity;
}

export function requirePermission(hasPermission: boolean, permissionName?: string): void {
  if (!hasPermission) {
    throw new ConvexError({
      code: "PERMISSION_DENIED",
      message: permissionName ? `Missing permission: ${permissionName}` : "Permission denied"
    });
  }
}
```

Then gradually replace across files (can be done file-by-file, no big bang needed).

**Risk:** Very low (additive, doesn't break existing code)

---

## 5. Extract Time Constants (1 hour)

**Create:** `convex/lib/constants.ts`

```typescript
export const DURATION_MS = {
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  TWO_WEEKS: 14 * 24 * 60 * 60 * 1000,
} as const;

export const PAYMENT_TERMS = ["dueonreceipt", "net7", "net15", "net30", "net60", "net90"] as const;
export type PaymentTerm = typeof PAYMENT_TERMS[number];
export const DEFAULT_PAYMENT_TERM: PaymentTerm = "net30";

export const DEFAULT_TIMEZONE = "America/Los_Angeles";
```

**Risk:** Very low

---

## 6. Create Custom Hooks (1 day)

### useFormMutation
```typescript
// src/hooks/use-form-mutation.ts
export function useFormMutation<T>(mutation: UseMutation<T>, initialData: Partial<T>) {
  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const mutate = useMutation(mutation);

  const setField = (key: keyof T, value: T[keyof T]) =>
    setFormData(prev => ({ ...prev, [key]: value }));

  const save = async (extra?: Partial<T>) => {
    setIsSaving(true);
    try {
      await mutate({ ...formData, ...extra });
    } finally {
      setIsSaving(false);
    }
  };

  return { formData, setFormData, setField, save, isSaving };
}
```

### useModal
```typescript
// src/hooks/use-modal.ts
export function useModal<T = string>() {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<T | null>(null);

  const open = (id?: T) => { setEditId(id ?? null); setIsOpen(true); };
  const close = () => { setEditId(null); setIsOpen(false); };

  return { isOpen, editId, open, close };
}
```

**Impact:** Simplifies 50+ component files
**Risk:** Low (additive, migrate gradually)

---

## 7. Create Integration Settings Template (1-2 days)

This is the single highest-ROI refactoring: 14 near-identical files consolidated into one template.

**Create:** `src/components/window-content/integrations-window/integration-settings-template.tsx`

**Config per integration:**
```typescript
const TELEGRAM_CONFIG: IntegrationConfig = {
  key: "telegram",
  label: "Telegram",
  fields: [
    { key: "botToken", label: "Bot Token", secret: true, required: true },
    { key: "chatId", label: "Chat ID", required: false },
  ],
  testable: true,
};
```

**Each integration file reduces from ~600-900 lines to ~20-50 lines** (just the config object + any custom rendering).

**Lines saved:** ~6,500
**Risk:** Medium (need to handle edge cases in individual integrations)

---

## Tracking Checklist

- [x] 1. Delete dead code (gerrit-old, rikscha-old, AI settings v1/v2) -- DONE 2025-02-15
- [x] 2. Fix password hashing in crmIntegrations.ts -- DONE 2025-02-15
- [x] 3. ~~Deduplicate address form/modal~~ — SKIPPED (intentional duplication per owner)
- [x] 4. Create `convex/lib/errors.ts` -- DONE 2025-02-15
- [x] 5. Create `convex/lib/constants.ts` -- DONE 2025-02-15
- [x] 6. Create `useModal` hook (`src/hooks/use-modal.ts`) -- DONE 2025-02-15
- [x] 6b. Fix hardcoded org data in consolidatedInvoicing.ts -- DONE 2025-02-15
- [x] 7. ~~Create integration settings template~~ — SKIPPED (real savings ~2.5-3.5K lines, not worth the complexity; files have too many unique sections)
- [ ] 8. Create `useFormMutation` hook

**Total estimated effort:** 3-4 days
**Total estimated line reduction:** ~18,000-28,000 lines
**Risk profile:** Mostly low, item 7 is medium
