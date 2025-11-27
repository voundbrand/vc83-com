# Quick Fixes Required Before Merge

## Priority 1: Hardcoded Colors (5 min fix) 🎨

**File:** `src/components/window-content/super-admin-organizations-window/template-sets-tab.tsx`

**Lines to fix:**

### Line 49-55 (Error State)
```tsx
// BEFORE:
borderColor: "#ef4444",
background: "#fef2f2",

// AFTER:
borderColor: "var(--error)",
background: "color-mix(in srgb, var(--error) 10%, white)",
```

### Line 83-85 (Warning State)
```tsx
// BEFORE:
borderColor: "#f59e0b",
background: "#fffbeb"

// AFTER:
borderColor: "var(--warning)",
background: "color-mix(in srgb, var(--warning) 10%, white)",
```

---

## Priority 2: Remove Top Unused Variables (10 min) 🧹

### File: `src/components/window-content/templates-window/index.tsx`
**Line 39:** Remove unused `translationsLoading`
```tsx
// BEFORE:
const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.templates");

// AFTER:
const { t } = useNamespaceTranslations("ui.templates");
```

### File: `src/components/window-content/super-admin-organizations-window/templates-tab.tsx`
**Line 563:** Replace console.error with proper error handling
```tsx
// BEFORE:
} catch (error) {
  console.error("Failed to toggle template availability:", error);
  alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
}

// AFTER:
} catch (error) {
  // TODO: Use structured logging service
  alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
}
```

---

## Priority 3: Add Type Definitions (15 min) 📝

**Create new file:** `src/types/templates.ts`

```typescript
import { Id } from "../../convex/_generated/dataModel";

/**
 * Audited template from auditTemplates.auditAllTemplates
 */
export type AuditedTemplate = {
  _id: Id<"objects">;
  name: string;
  code: string;
  hasSchema: boolean;
  status: "draft" | "published" | "archived";
  subtype?: "email" | "pdf" | "page" | "form";
  category?: string;
  customProperties?: Record<string, unknown>;
};

/**
 * Template type for filtering
 */
export type TemplateType = "email" | "pdf" | "form" | "checkout" | "workflow" | "page" | "other";

/**
 * Template audit data structure
 */
export type TemplateAuditData = {
  templates: {
    schemaEmail: AuditedTemplate[];
    htmlEmail: AuditedTemplate[];
    pdf: AuditedTemplate[];
    unknown: AuditedTemplate[];
  };
  summary: {
    total: number;
    schemaEmailCount: number;
    htmlEmailCount: number;
    pdfCount: number;
    unknownCount: number;
  };
};
```

**Update:** `src/components/window-content/super-admin-organizations-window/templates-tab.tsx`

```typescript
// Add import at top:
import { AuditedTemplate, TemplateType, TemplateAuditData } from "@/types/templates";

// Replace any[] with AuditedTemplate[] throughout:
function TemplateCRUDSection({
  templates,
  sessionId,
}: {
  templates: AuditedTemplate[];  // instead of any[]
  sessionId: string;
}) {
  // ...
}

function TemplateCRUDRow({
  template,
  sessionId,
}: {
  template: AuditedTemplate;  // instead of any
  sessionId: string;
}) {
  // ...
}
```

---

## Auto-fixable Lint Issues (1 min) 🔧

Run this command to auto-fix 4 simple linting issues:
```bash
npm run lint -- --fix
```

---

## Testing Checklist Before Merge ✅

Run these commands and ensure they pass:

```bash
# 1. TypeScript check (should already pass)
npm run typecheck

# 2. Linting (should have <50 warnings after fixes)
npm run lint

# 3. Build check (ensure production build works)
npm run build

# 4. Manual testing
# - Open Templates Window
# - Switch between all tabs
# - Verify theme colors are consistent
# - Test template filtering
# - Toggle template availability
```

---

## Estimated Time

- **Priority 1 (Colors):** 5 minutes
- **Priority 2 (Unused vars):** 10 minutes
- **Priority 3 (Types):** 15 minutes
- **Auto-fix linting:** 1 minute
- **Testing:** 10 minutes

**Total:** ~40 minutes of focused work

---

## Optional: CSS Variable Definitions

If CSS variables don't exist yet, add to your theme file:

```css
:root {
  /* Error states */
  --error: #ef4444;
  --error-light: #fef2f2;
  --error-text: #991b1b;

  /* Warning states */
  --warning: #f59e0b;
  --warning-light: #fffbeb;
  --warning-text: #78350f;

  /* Success states */
  --success: #10b981;
  --success-light: #d1fae5;
  --success-text: #065f46;
}
```

Then use with color-mix for consistency:
```tsx
style={{
  borderColor: "var(--error)",
  background: "color-mix(in srgb, var(--error) 10%, white)",
  color: "var(--error-text)"
}}
```
