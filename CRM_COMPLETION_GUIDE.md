# CRM Translation & Theme System - Completion Guide

## Files Completed ✅

- [x] crm-window.tsx
- [x] contacts-list.tsx
- [x] contact-detail.tsx (95% - needs import line)
- [x] Translation seed files (all 3)

## Files Remaining 🔄

### 1. Contact-detail.tsx - Final Touch

**Add missing import at line 7:**
```typescript
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
```

### 2. Organizations-list.tsx

Copy the pattern from `contacts-list.tsx` - they're nearly identical. Changes needed:

**Line 10: Add import**
```typescript
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations"
```

**Line 21: Add hook**
```typescript
const { t } = useNamespaceTranslations("ui.crm")
```

**Replace all hardcoded text:**
- `"Search organizations..."` → `{t("ui.crm.organizations.search_placeholder")}`
- `"PLEASE LOG IN"` → `{t("ui.crm.organizations.please_login")}`
- `"Loading organizations..."` → `{t("ui.crm.organizations.loading")}`
- `"No organizations found"` → `{t("ui.crm.organizations.no_organizations")}`
- `"Clear search"` → `{t("ui.crm.organizations.clear_search")}`

**Replace all hardcoded colors with theme variables:**
- `bg-gray-100` → `style={{ background: 'var(--win95-bg)' }}`
- `text-gray-500` → `style={{ color: 'var(--neutral-gray)' }}`
- `border-gray-300` → `style={{ borderColor: 'var(--win95-border)' }}`
- `bg-blue-100` → `style={{ background: 'var(--win95-selected-bg)' }}`
- `text-blue-600` → `style={{ color: 'var(--win95-highlight)' }}`
- Status badges (prospect/customer/partner/sponsor) - use the same color pattern as contacts-list.tsx

### 3. Organization-detail.tsx

Similar to contact-detail.tsx. Changes needed:

**Add import and hook** (same as above)

**Replace text strings:**
- `"COMPANY INFO"` → `{t("ui.crm.organization_detail.company_info")}`
- `"Industry:"` → `{t("ui.crm.organization_detail.industry")}`
- `"Company Size:"` → `{t("ui.crm.organization_detail.company_size")}`
- `"ADDRESS"` → `{t("ui.crm.organization_detail.address_label")}`
- `"CONTACTS ({count})"` → `{t("ui.crm.organization_detail.contacts_label", { count })}`
- `"STATUS"` → `{t("ui.crm.contact_detail.status_label")}`
- `"TAGS"` → `{t("ui.crm.contact_detail.tags_label")}`
- `"NOTES"` → `{t("ui.crm.contact_detail.notes_label")}`
- `"ACTIVITY"` → `{t("ui.crm.contact_detail.activity_label")}`
- `"Created:"` → `{t("ui.crm.contact_detail.created")}`
- `"PRIMARY"` → `{t("ui.crm.organization_detail.primary_tag")}`

**Replace colors:** Same pattern as contact-detail.tsx

### 4. Contact-form-modal.tsx

This is larger. Key changes:

**Add import and hook**

**Modal structure:**
```typescript
// Modal overlay
style={{ background: 'var(--modal-overlay-bg)' }}

// Modal container
style={{
  borderColor: 'var(--modal-border)',
  background: 'var(--modal-bg)',
  boxShadow: 'var(--modal-shadow)'
}}

// Modal header
style={{ background: 'var(--modal-header-bg)', color: 'var(--modal-header-text)' }}
```

**Form elements:**
```typescript
// Labels
style={{ color: 'var(--win95-text)' }}

// Inputs
style={{
  borderColor: 'var(--win95-border)',
  background: 'var(--win95-input-bg)',
  color: 'var(--win95-input-text)'
}}

// Buttons
style={{
  borderColor: 'var(--win95-border)',
  background: 'var(--win95-button-face)',
  color: 'var(--win95-text)'
}}
```

**Translation keys** (check seedCRM_03_ContactForm.ts for all keys):
- Form title, labels, placeholders, buttons, errors
- All available in the translation seed file

### 5. Organization-form-modal.tsx

**This file already has translations!** Just needs color cleanup:

**Find and replace:**
- Remove all inline Tailwind color classes
- Keep the pattern already used with theme variables
- The file uses many `style={{...}}` already - just ensure ALL colors use variables

**Quick fix pattern:**
```bash
# Find any remaining hardcoded colors:
grep -n "bg-gray\|text-gray\|border-gray\|bg-blue\|text-blue" organization-form-modal.tsx
grep -n "bg-green\|text-green\|bg-purple\|text-purple" organization-form-modal.tsx
grep -n "bg-yellow\|text-yellow\|bg-red\|text-red" organization-form-modal.tsx
```

## Quick Test Commands

After completing updates:

```bash
# 1. TypeScript check
npm run typecheck

# 2. Lint
npm run lint

# 3. Check for remaining hardcoded colors
grep -r "className.*bg-gray" src/components/window-content/crm-window/
grep -r "className.*text-gray" src/components/window-content/crm-window/
grep -r "className.*border-gray" src/components/window-content/crm-window/

# 4. Check for untranslated strings (look for hardcoded English)
grep -r '"[A-Z][a-z]' src/components/window-content/crm-window/ | grep -v ".map" | grep -v "mailto" | grep -v "tel:"
```

## Theme Variables Reference

```css
/* Backgrounds */
--win95-bg
--win95-bg-light
--win95-button-face
--win95-selected-bg
--win95-hover-light
--win95-input-bg

/* Text */
--win95-text
--win95-selected-text
--win95-input-text
--neutral-gray

/* Borders */
--win95-border
--win95-highlight

/* Special */
--primary
--error
--modal-overlay-bg
--modal-border
--modal-bg
--modal-shadow
--modal-header-bg
--modal-header-text
```

## Translation Key Pattern

All keys follow: `ui.crm.{component}.{element}`

Examples:
- `ui.crm.contacts.search_placeholder`
- `ui.crm.organization_detail.company_info`
- `ui.crm.contact_form.title.add_new`
- `ui.crm.buttons.cancel`

## Final Checklist

- [ ] All imports added
- [ ] All hooks initialized
- [ ] No hardcoded colors (className with bg-/text-/border- + color)
- [ ] All text strings use t() function
- [ ] TypeScript compiles
- [ ] Lint passes
- [ ] Visual test: CRM windows render correctly
- [ ] Functional test: Can create/edit/delete contacts and organizations
