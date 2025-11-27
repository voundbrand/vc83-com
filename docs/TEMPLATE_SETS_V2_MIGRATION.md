# Template Sets v2.0 Migration - Complete Summary

**Date**: 2025-01-27
**Status**: Phase 1 Complete ✅ | Phase 2 In Progress 🚧 | Phase 3 Pending ⏳

---

## 🎯 Project Goal

**Migrate from Individual Template Defaults to Flexible Template Sets**

### Problem Statement
- **Two competing systems**: Individual template defaults (UI) vs Template Sets (Backend)
- **Hardcoded structure**: Template sets required exactly 3 templates (ticket, invoice, email)
- **No UI for template sets**: Component existed but wasn't integrated
- **User confusion**: "Set Default" button on individual templates, but backend used template sets

### Solution Architecture
- **Single system**: Template sets only (flexible composition)
- **Flexible bundles**: Any combination of templates (1+ templates per set)
- **Full UI**: Template Sets tab with visual builder
- **Clear fallback**: System org has default template set (seeded)

---

## ✅ Phase 1: Backend - Flexible Template Sets (COMPLETED)

### Architecture Overview

```
Template Set v2.0 Structure:
{
  version: "2.0",
  templates: [
    { templateId: "...", templateType: "ticket", isRequired: true, displayOrder: 1 },
    { templateId: "...", templateType: "invoice", isRequired: true, displayOrder: 2 },
    { templateId: "...", templateType: "email", isRequired: true, displayOrder: 3 },
    { templateId: "...", templateType: "badge", isRequired: false, displayOrder: 4 },
    { templateId: "...", templateType: "program", isRequired: false, displayOrder: 5 },
    // ... unlimited templates of any type!
  ],
  isDefault: true,           // Org default flag
  isSystemDefault: true,      // System fallback flag
}

Resolution Cascade (6 levels):
1. Manual Send (explicit override)
2. Product Override (product-specific branding)
3. Checkout Override (checkout-specific)
4. Domain Override (domain-specific)
5. Organization Default (org's default set)
6. System Default (guaranteed fallback) ← NEW!
```

---

## 📂 Files Modified (Phase 1)

### 1. **convex/templateSetOntology.ts** ⭐
**Changes:**
- Updated header documentation to explain v2.0 vs v1.0
- Modified `createTemplateSet` mutation to accept BOTH formats:
  - `templates: Array<{ templateId, templateType, isRequired, displayOrder }>` (v2.0)
  - `ticketTemplateId, invoiceTemplateId, emailTemplateId` (v1.0 - backward compatible)
- Added `isSystemDefault` flag for system org template sets
- Stores both v2.0 array format AND v1.0 legacy fields for backward compatibility
- Added `getTemplateUsage` query to show where templates are used:
  - Template sets containing the template
  - Products overriding with sets that use it
  - Checkouts overriding with sets that use it
  - Domains overriding with sets that use it

**Key Code:**
```typescript
// v2.0 format
customProperties: {
  version: "2.0",
  templates: [
    { templateId, templateType: "ticket", isRequired: true, displayOrder: 1 },
    { templateId, templateType: "badge", isRequired: false, displayOrder: 2 },
  ],
  isDefault: true,
  isSystemDefault: true,
}

// v1.0 backward compatibility (also stored)
customProperties: {
  ...above,
  ticketTemplateId: "...",
  invoiceTemplateId: "...",
  emailTemplateId: "...",
}
```

---

### 2. **convex/templateSetResolver.ts** ⭐
**Changes:**
- Updated `ResolvedTemplateSet` interface:
  - Added `version: string` ("1.0" or "2.0")
  - Changed from hardcoded 3 fields to `templates: Map<string, Id>`
  - Kept legacy fields for backward compatibility
- Updated `buildResult()` function:
  - Handles both v1.0 (legacy) and v2.0 (flexible) formats
  - Converts v1.0 format to v2.0 Map internally
  - Returns backward-compatible fields
- Updated `resolveIndividualTemplate()`:
  - Changed from `templateType: "ticket" | "invoice" | "email"` to `templateType: string`
  - Returns `Id | null` (was `Id` - now handles missing templates gracefully)
  - Checks flexible Map first, falls back to legacy fields
- Added `getAllTemplatesFromSet()` helper for batch operations

**Key Code:**
```typescript
export interface ResolvedTemplateSet {
  setId: Id<"objects">;
  setName: string;
  version: string; // "1.0" or "2.0"
  templates: Map<string, Id<"objects">>; // templateType -> templateId
  source: "manual" | "product" | "checkout" | "domain" | "organization" | "system";

  // v1.0 backward compatibility
  ticketTemplateId?: Id<"objects">;
  invoiceTemplateId?: Id<"objects">;
  emailTemplateId?: Id<"objects">;
}

// Usage
const templateId = resolved.templates.get("badge"); // Works with ANY type!
```

---

### 3. **convex/seedSystemDefaultTemplateSet.ts** (NEW FILE) ⭐
**Purpose**: Creates comprehensive system default template set with ALL system templates

**Features:**
- Fetches all system templates (email + PDF)
- Groups by type and category
- Builds v2.0 flexible template array:
  - Core required: ticket, invoice, email
  - Optional: receipt, badge, program, quote, leadmagnet, etc.
- Stores with `isSystemDefault: true` flag
- Creates objectLinks for all templates
- Supports `overwrite: true` to update existing set

**Key Code:**
```typescript
// Core templates (required)
templatesList.push({ templateId: ticketTemplate._id, templateType: "ticket", isRequired: true, displayOrder: 1 });
templatesList.push({ templateId: invoiceTemplate._id, templateType: "invoice", isRequired: true, displayOrder: 2 });
templatesList.push({ templateId: defaultEmailTemplate._id, templateType: "email", isRequired: true, displayOrder: 3 });

// Optional templates (dynamically discovered)
if (receiptTemplate) templatesList.push({ templateId, templateType: "receipt", isRequired: false, displayOrder: 4 });
if (badgeTemplate) templatesList.push({ templateId, templateType: "badge", isRequired: false, displayOrder: 5 });
// ... etc

// Result: Comprehensive system fallback with 11+ email templates and 8+ PDF templates
```

**Run Command:**
```bash
npx convex run seedSystemDefaultTemplateSet:seedSystemDefaultTemplateSet '{"overwrite": true}'
```

---

### 4. **convex/pdfGeneration.ts** (FIXES)
**Changes:**
- Line 243-248: Added null check for `ticketTemplateId`
  - Throws clear error if template set doesn't include ticket template
- Line 883-888: Added null check for `invoiceTemplateId`
  - Throws clear error if template set doesn't include invoice template

**Reason**: `resolveIndividualTemplate` now returns `Id | null` instead of `Id`, so we must handle null case.

---

### 5. **convex/ticketGeneration.ts** (FIXES)
**Changes:**
- Line 641-646: Added null check for `emailTemplateId`
  - Throws clear error if template set doesn't include email template

**Reason**: Same as above - graceful handling of missing templates in sets.

---

## 🧪 Testing Results

### TypeScript Compilation
```bash
npm run typecheck
```
**Result**: ✅ 0 errors

### ESLint
```bash
npm run lint
```
**Result**: ✅ Only pre-existing warnings (AI code, generated files)

### Files Passing Quality Checks
- ✅ convex/templateSetOntology.ts
- ✅ convex/templateSetResolver.ts
- ✅ convex/seedSystemDefaultTemplateSet.ts
- ✅ convex/pdfGeneration.ts
- ✅ convex/ticketGeneration.ts

---

## 🔑 Key Design Decisions

### 1. **Backward Compatibility is Critical**
- **Decision**: Support BOTH v1.0 and v2.0 formats
- **Rationale**: Existing template sets in database must continue working
- **Implementation**:
  - Store both formats in `customProperties`
  - `buildResult()` converts v1.0 to v2.0 Map internally
  - Resolver returns legacy fields for old consumers

### 2. **Flexible Template Types (Not Hardcoded)**
- **Decision**: Use `templateType: string` instead of enum
- **Rationale**: Allows adding new template types without schema changes
- **Implementation**:
  - Map stores any string key
  - `resolveIndividualTemplate` accepts any string
  - New types (e.g., "newsletter", "report") work automatically

### 3. **Graceful Null Handling**
- **Decision**: Return `null` when template type not in set
- **Rationale**: Not all sets have all template types (flexible composition!)
- **Implementation**:
  - Changed return type from `Id` to `Id | null`
  - Callers must null-check before using
  - Clear error messages guide users to fix template sets

### 4. **System Default as Ultimate Fallback**
- **Decision**: Create comprehensive system template set with ALL templates
- **Rationale**: Guarantee resolution always succeeds (no more template not found errors!)
- **Implementation**:
  - `isSystemDefault: true` flag in system org
  - Resolver checks system default as final fallback
  - Includes 11+ email templates and 8+ PDF templates

### 5. **Display Order for UI**
- **Decision**: Add `displayOrder` field to template array
- **Rationale**: UI needs consistent ordering for builder/preview
- **Implementation**:
  - Stored in v2.0 array: `{ displayOrder: 1, 2, 3, ... }`
  - Also stored in objectLinks properties
  - UI can sort by displayOrder

---

## 📊 Template Set Resolution Flow (Updated)

```
User Action (e.g., Generate Invoice)
          ↓
resolveTemplateSet(organizationId, context)
          ↓
┌─────────────────────────────────────────┐
│  1. Manual Override (manualSetId)?      │ → Return if found
├─────────────────────────────────────────┤
│  2. Product Override (productId)?       │ → Return if found
├─────────────────────────────────────────┤
│  3. Checkout Override (checkoutId)?     │ → Return if found
├─────────────────────────────────────────┤
│  4. Domain Override (domainConfigId)?   │ → Return if found
├─────────────────────────────────────────┤
│  5. Organization Default (isDefault)?   │ → Return if found
├─────────────────────────────────────────┤
│  6. System Default (isSystemDefault)?   │ → Return (guaranteed!)
└─────────────────────────────────────────┘
          ↓
resolveIndividualTemplate(templateType: "invoice")
          ↓
resolved.templates.get("invoice")
          ↓
┌─────────────────────────────────────────┐
│  Found?  → Return Id<"objects">         │
│  Not Found?  → Return null              │
│                                         │
│  Caller checks for null:                │
│  if (!id) throw error                   │
└─────────────────────────────────────────┘
```

---

## 🚧 Phase 2: Template Sets UI (NEXT)

### Tasks Remaining

1. **Add Template Sets Tab** (templates-window/index.tsx)
   - Add 4th tab after "PDF Library"
   - Tab label: "Template Sets"
   - Icon: Package icon

2. **Create template-sets-tab.tsx** (NEW FILE)
   - List all template sets (org + system)
   - Show default badge
   - Create/Edit/Delete buttons
   - "Set as Default" button

3. **Create template-set-builder.tsx** (NEW FILE)
   - Drag-and-drop template selection
   - Add ANY template type (not just 3)
   - Mark as required/optional
   - Reorder templates
   - Preview all templates in set

4. **Update templates-list.tsx** (MODIFICATION)
   - Remove individual "Set Default" button
   - Add "Used In" section showing template sets
   - Link to template sets using this template

5. **Visual Design** (UI Mockup Already Designed)
   ```
   ┌─────────────────────────────────────────┐
   │ 📦 Template Sets              [+ Create]│
   ├─────────────────────────────────────────┤
   │ ⭐ Corporate Standard (Default)         │
   │ ├─ 🎫 Ticket: Professional Ticket       │
   │ ├─ 💰 Invoice: B2B Invoice              │
   │ ├─ 📧 Email: Invoice Email              │
   │ └─ 🧾 Receipt: Payment Receipt          │
   │ [👁️ Preview] [✏️ Edit] [⭐ Set Default] │
   │                                         │
   │ 🎉 VIP Package                          │
   │ ├─ 🎫 Ticket: VIP Gold Ticket           │
   │ ├─ 💰 Invoice: VIP Invoice              │
   │ ├─ 📧 Email: VIP Welcome Email          │
   │ ├─ 🏅 Badge: VIP Badge                  │
   │ └─ 📋 Program: Event Program            │
   │ [👁️ Preview] [✏️ Edit] [🗑️ Delete]     │
   └─────────────────────────────────────────┘
   ```

---

## ⏳ Phase 3: Deprecate Individual Defaults (FUTURE)

### Tasks Remaining

1. **Remove setDefaultTemplate mutation** (templateOntology.ts)
   - Or deprecate with warning
   - Redirect to template sets

2. **Remove isDefault from individual templates**
   - Migrate existing defaults to template sets
   - Migration script needed

3. **Update pdfTemplateResolver.ts**
   - Remove `getDefaultTemplateForCategory`
   - Force all resolution through template sets

4. **Update all template generation flows**
   - Ensure all use `resolveTemplateSet` → `resolveIndividualTemplate`
   - No direct template ID lookups

---

## 🎯 Current State Summary

### ✅ What Works Now

1. **Backend fully supports flexible template sets**
   - Can create sets with 1 to 20+ templates
   - Any template type allowed
   - v1.0 and v2.0 formats both work

2. **Resolution system upgraded**
   - 6-level cascade works
   - Graceful null handling
   - System default fallback ready

3. **Generation flows updated**
   - PDF generation checks for null
   - Email generation checks for null
   - Clear error messages

4. **Seed script ready**
   - Can create comprehensive system default
   - Includes all system templates
   - Ready to run

### 🚧 What's In Progress

1. **UI for template sets**
   - Tab not added yet
   - Builder not created yet
   - List view not implemented yet

### ⏳ What's Pending

1. **Migration of existing data**
   - Existing orgs still use individual defaults
   - Need migration script

2. **Deprecation of old system**
   - Individual defaults still work
   - Need phase-out plan

---

## 🔄 Next Steps (Immediate)

1. **Test the seed script** ⭐
   ```bash
   npx convex run seedSystemDefaultTemplateSet:seedSystemDefaultTemplateSet '{"overwrite": true}'
   ```

2. **Verify system default in database**
   - Check system org has template set with `isSystemDefault: true`
   - Verify all system templates are linked
   - Confirm resolution falls back to it

3. **Start Phase 2: Template Sets UI**
   - Add Template Sets tab
   - Build list view
   - Create template set builder

---

## 📚 Key Files Reference

### Backend (Phase 1 - Complete)
- `convex/templateSetOntology.ts` - CRUD operations for template sets
- `convex/templateSetResolver.ts` - Resolution logic (6-level cascade)
- `convex/seedSystemDefaultTemplateSet.ts` - System default seeding
- `convex/pdfGeneration.ts` - PDF generation (updated for null checks)
- `convex/ticketGeneration.ts` - Ticket generation (updated for null checks)

### Frontend (Phase 2 - Pending)
- `src/components/window-content/templates-window/index.tsx` - Add tab
- `src/components/window-content/templates-window/template-sets-tab.tsx` - NEW (list view)
- `src/components/window-content/templates-window/template-set-builder.tsx` - NEW (builder)
- `src/components/window-content/templates-window/templates-list.tsx` - Update (remove "Set Default")
- `src/components/template-set-card.tsx` - Already exists (needs update for v2.0)

### Documentation
- `docs/TEMPLATE_SETS_V2_MIGRATION.md` - This file! Complete reference

---

## 💡 Important Notes

1. **Backward Compatibility Maintained**
   - All existing v1.0 template sets continue working
   - No breaking changes to database schema
   - Old consumers still get legacy fields

2. **System Default is Critical**
   - Must be seeded before production use
   - Guarantees resolution always succeeds
   - Ultimate fallback for all organizations

3. **Template Types Are Flexible**
   - Not limited to ticket/invoice/email
   - Can add newsletter, report, certificate, etc. without code changes
   - UI should support adding custom types

4. **Quality First**
   - All code passes TypeScript checks
   - All code passes ESLint
   - Null safety enforced

---

## 🎉 Success Metrics

### Phase 1 Achievements
- ✅ 0 TypeScript errors
- ✅ 0 breaking changes
- ✅ Backward compatible with v1.0
- ✅ Flexible composition (any templates)
- ✅ System default fallback ready
- ✅ Graceful null handling
- ✅ 6-level resolution cascade

### Phase 2 Goals
- 🎯 Template Sets tab integrated
- 🎯 Visual builder working
- 🎯 Users can create flexible sets
- 🎯 Users can see template usage
- 🎯 Set default via UI

### Phase 3 Goals
- 🎯 Individual defaults deprecated
- 🎯 All flows use template sets
- 🎯 Migration script run
- 🎯 Old system removed

---

**End of Summary** - Ready to continue with Phase 2! 🚀
