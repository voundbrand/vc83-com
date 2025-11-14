# 🔄 Handoff Prompt: Template Sets Enhanced UI

## 📋 Session Context

**Status**: Phase 1 (Backend) and Phase 2 (Super Admin UI) are **COMPLETE**. Ready for Phase 3: Enhanced Templates UI.

**Completed Work Summary**:
- ✅ Backend template set resolution in `pdfGeneration.ts`, `ticketGeneration.ts`, `emailDelivery.ts`
- ✅ Availability ontology pattern in `templateSetAvailability.ts` (super admin licensing control)
- ✅ Super admin matrix UI in `templates-tab.tsx` (enable/disable per organization)
- ✅ Template set selector components for checkout and product forms
- ✅ All code passes typecheck and lint

## 🎯 Next Phase: Enhanced Templates UI + Template Set Management

### Current Problem
The existing Templates UI has TWO major gaps:

#### Gap 1: Template Set Management (Super Admin)
**Location**: Super Admin Organizations Window → Templates Tab

**Problem**: No way to manage which templates belong to which template sets!
- Template sets exist in backend with `ticketTemplateId`, `invoiceTemplateId`, `emailTemplateId`
- Availability matrix exists (enable/disable per org)
- BUT: No UI to change template assignments
- Currently requires code changes to move templates between sets

**User Need**: Super admins need to:
- Move current "default" templates to a different set
- Create new template sets with different template combinations
- Change which ticket/invoice/email templates belong to each set
- Do this through a UI, not code changes

#### Gap 2: Template Sets Visibility (End Users)
**Location**: Main Templates Window (`src/components/window-content/templates-window/index.tsx`)

**Problem**: Template sets aren't visible anywhere in the main Templates UI!
- Form templates and checkout templates not showing correctly
- 16+ templates scattered without clear organization
- No "Template Sets" category in left sidebar
- Users can't see bundled template options

### Objective: Fix BOTH Gaps

#### Part 1: Template Set Management UI (Super Admin - PRIORITY)
**Create NEW "Template Sets" tab in Super Admin Organizations window:**

A dedicated tab (separate from Templates tab) for full template set CRUD that allows super admins to:
- View all template sets with current template assignments
- Change which ticket/invoice/email templates belong to each set (via dropdowns)
- Create new template sets
- Delete template sets
- Set any template set as the organization default
- Manage tags for better organization

**See**: `TEMPLATE_SET_MANAGEMENT_PLAN.md` for full implementation details.

**Tab Structure**:
```
Super Admin Organizations Window:
[Organizations] [Template Sets] [Templates] [Users]
                     ↑ NEW TAB!
```

**Why a separate tab?**
- Templates tab already has 4 availability matrices (Web, Form, Checkout, PDF, Template Sets)
- Template set CRUD needs more space for dropdowns and forms
- Cleaner separation: Configuration (Template Sets tab) vs. Availability (Templates tab)

**Key Features**:
```
┌─────────────────────────────────────┐
│ 📦 Template Set Configuration      │
├─────────────────────────────────────┤
│ [+ Create New Template Set]        │
│                                     │
│ ⭐ System Default Template Set     │
│ 🎫 Ticket:  [Dropdown ▼]          │
│ 💰 Invoice: [Dropdown ▼]          │
│ 📧 Email:   [Dropdown ▼]          │
│ [Edit] [Set as Default] [Delete]  │
└─────────────────────────────────────┘
```

#### Part 2: Template Sets Category (End User Templates UI)
**Add to Main Templates Window:**

A new "Template Sets" category in left sidebar that shows:
- All available template sets for the current organization
- Each template set's bundled templates (ticket, invoice, email)
- Visual preview of what's included in each set
- Ability to see details and select template sets

**Fix existing issues:**
- Ensure Form Templates category shows all form templates
- Ensure Checkout Templates category shows all checkout templates
- Create consistent UI pattern across all template types

## 📁 Key Files to Work With

### Priority 1: Template Set Management (Super Admin)
```
src/components/window-content/super-admin-organizations-window/
  ├── index.tsx                            (Modify - Add "Template Sets" tab to navigation)
  ├── template-sets-tab.tsx                (NEW - Full tab for template set CRUD)
  ├── template-set-card.tsx                (NEW - Individual set card)
  └── create-template-set-form.tsx         (NEW - Creation form modal)
```

**Note:** `templates-tab.tsx` remains unchanged - it keeps the availability matrices.

**Backend Queries/Mutations**:
```typescript
// Get all template sets (system org)
api.templateSetOntology.getTemplateSets({
  sessionId,
  organizationId: systemOrgId,
  includeSystem: true
})

// Get available templates for dropdowns
api.pdfTemplateQueries.getAvailablePdfTemplates({
  sessionId,
  organizationId: systemOrgId,
  category: "ticket" | "invoice"
})

api.emailTemplateQueries.getAvailableEmailTemplates({
  sessionId,
  organizationId: systemOrgId
})

// Update template assignments
api.templateSetOntology.updateTemplateSet({
  sessionId,
  setId,
  ticketTemplateId,    // Change to different template
  invoiceTemplateId,   // Change to different template
  emailTemplateId      // Change to different template
})

// Create new template set
api.templateSetOntology.createTemplateSet({ ... })

// Delete template set
api.templateSetOntology.deleteTemplateSet({ setId })

// Set as default
api.templateSetOntology.setDefaultTemplateSet({ setId })
```

**See Full Details**: [TEMPLATE_SET_MANAGEMENT_PLAN.md](TEMPLATE_SET_MANAGEMENT_PLAN.md)

### Priority 2: Templates UI (End User)
```
src/components/window-content/templates-window/index.tsx
```
**Current Structure:**
- Left sidebar with categories (PDF Templates, Web Page Templates, etc.)
- Right panel showing templates in selected category
- Uses tab-based navigation with category selection

**What to Add:**
1. New "Template Sets" category in left sidebar
2. Template set cards showing:
   - Set name and description
   - Tags (luxury, modern, minimalist, etc.)
   - Preview of bundled templates (ticket + invoice + email)
   - System default indicator (⭐)
   - Visual card layout similar to existing template cards

### Backend Queries to Use
```typescript
// Get available template sets for current organization
api.templateSetQueries.getAvailableTemplateSets({ organizationId })

// Get details of a specific template set
api.templateSetQueries.getTemplateSetById({ setId })
```

### Existing Template Patterns
Look at how PDF templates are displayed:
- `src/components/window-content/templates-window/index.tsx` (main UI)
- Card-based layout with name, description, preview
- Click to select, visual selection state

## 🔧 Implementation Guide

### Step 1: Add Template Sets Category
In `templates-window/index.tsx`, add new category:
```typescript
const categories = [
  { id: "template-sets", name: "Template Sets", icon: Package },
  { id: "pdf", name: "PDF Templates", icon: FileText },
  { id: "web", name: "Web Page Templates", icon: Globe },
  { id: "form", name: "Form Templates", icon: FileInput },
  { id: "checkout", name: "Checkout Templates", icon: ShoppingCart },
];
```

### Step 2: Fetch Template Sets
```typescript
const templateSets = useQuery(
  api.templateSetQueries.getAvailableTemplateSets,
  organizationId ? { organizationId } : "skip"
);
```

### Step 3: Create Template Set Card Component
```typescript
function TemplateSetCard({
  templateSet,
  selected,
  onSelect
}: {
  templateSet: TemplateSet;
  selected: boolean;
  onSelect: () => void;
}) {
  // Show set name, description, tags
  // Show preview of bundled templates:
  //   - Ticket template name
  //   - Invoice template name
  //   - Email template name
  // System default indicator
  // Click to select
}
```

### Step 4: Fix Missing Categories
**Investigate why Form and Checkout templates aren't showing:**
- Check if queries are correctly fetching from availability ontology
- Verify template seeding completed correctly
- Ensure UI is checking the right availability objects

## 🐛 Known Issues to Fix

### Issue 1: Form Templates Not Showing
**Location**: Templates window → Form Templates category
**Expected**: Should show all available form templates for organization
**Actual**: Category might be empty or not rendering correctly
**Check**: `api.formTemplateAvailability.getAvailableFormTemplates`

### Issue 2: Checkout Templates Not Showing
**Location**: Templates window → Checkout Templates category
**Expected**: Should show all available checkout templates for organization
**Actual**: Category might be empty or not rendering correctly
**Check**: `api.checkoutTemplateAvailability.getAvailableCheckoutTemplates`

### Issue 3: 16+ Templates Disorganized
**Goal**: Clear categorization and easy discovery of both individual templates and template sets

## 📊 Success Criteria

When this phase is complete, users should be able to:

1. ✅ Open Templates window and see "Template Sets" category in left sidebar
2. ✅ Click "Template Sets" and see all available template sets (enabled by super admin)
3. ✅ See each template set's bundled templates clearly displayed
4. ✅ Select a template set to see full details
5. ✅ See ALL form templates in "Form Templates" category (bug fixed)
6. ✅ See ALL checkout templates in "Checkout Templates" category (bug fixed)
7. ✅ Navigate between categories smoothly with consistent UI patterns

## 🎨 Design Guidelines

**Template Set Card Layout:**
```
┌─────────────────────────────────────┐
│ ⭐ System Default                   │
│ Luxury Event Suite                  │
│ #luxury #events #premium            │
│                                     │
│ Includes:                           │
│ 🎫 Luxury Ticket Template          │
│ 💰 Luxury Invoice Template         │
│ 📧 Luxury Email Template           │
│                                     │
│ [Preview] [Select]                 │
└─────────────────────────────────────┘
```

**Follow Win95 retro styling:**
- Border: `2px solid var(--win95-border)`
- Hover: Slight shadow or border color change
- Selected: Purple accent border
- Consistent with existing template cards

## 🔍 Testing Checklist

Before marking complete:
- [ ] Template Sets category appears in left sidebar
- [ ] Template sets load correctly for current organization
- [ ] Template set cards display all bundled templates
- [ ] System default indicator shows correctly (⭐)
- [ ] Tags display properly
- [ ] Form templates category shows all templates (bug fixed)
- [ ] Checkout templates category shows all templates (bug fixed)
- [ ] All 16+ templates are organized and discoverable
- [ ] Clicking template sets shows proper details
- [ ] UI is responsive and matches Win95 aesthetic
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

## 📝 Current System State

**Template Set Availability:**
- System default template set exists in system organization
- Super admins can enable/disable per organization via Super Admin UI
- Template sets filter by availability in queries
- Organizations only see enabled template sets

**Backend Resolution:**
- Template resolution works: Manual > Context (Product > Checkout > Domain) > Organization
- Fallback to organization default if no template set override
- All template types (ticket, invoice, email) resolve correctly

**UI Components:**
- `TemplateSetSelector` exists for checkout/product forms
- Super admin matrix UI exists in `templates-tab.tsx`
- Main Templates UI needs Template Sets category added

## 🚀 Start Here

### Priority Order (Do in This Sequence)

**PRIORITY 1: Template Set Management UI (Super Admin) - START HERE**

This is the MOST IMPORTANT feature because it unblocks you from:
- Moving your current "default" templates to a different set
- Creating a new template set with new templates
- Organizing all template sets without code changes

**First Tasks:**
1. Read [TEMPLATE_SET_MANAGEMENT_PLAN.md](TEMPLATE_SET_MANAGEMENT_PLAN.md) thoroughly
2. Create `TemplateSetCard` component (read-only display first)
3. Add Template Set Configuration section to top of Super Admin Templates tab
4. Wire up dropdowns to change template assignments
5. Add create/delete functionality

**Files to read first:**
1. [TEMPLATE_SET_MANAGEMENT_PLAN.md](TEMPLATE_SET_MANAGEMENT_PLAN.md) - Full implementation guide
2. [convex/templateSetOntology.ts](convex/templateSetOntology.ts) - Backend mutations
3. [src/components/window-content/super-admin-organizations-window/index.tsx](src/components/window-content/super-admin-organizations-window/index.tsx) - Tab navigation structure
4. [src/components/window-content/super-admin-organizations-window/templates-tab.tsx](src/components/window-content/super-admin-organizations-window/templates-tab.tsx) - Reference for tab structure

**Success Criteria for Priority 1:**
- ✅ Super admin can view all template sets with current template assignments
- ✅ Super admin can change which ticket/invoice/email templates belong to each set
- ✅ Super admin can create new template sets
- ✅ Super admin can move current "default" templates to a new set
- ✅ Super admin can create a new set with different templates as the default

---

**PRIORITY 2: Template Sets Category (End User Templates UI)**

After template set management is complete, add the "Template Sets" category to the main Templates window.

**Tasks:**
1. Add "Template Sets" category to Templates window left sidebar
2. Create template set card component for end users
3. Investigate why form and checkout templates aren't showing correctly
4. Fix missing categories

**Files to work on:**
1. `src/components/window-content/templates-window/index.tsx` - Main templates UI
2. `convex/templateSetQueries.ts` - Available queries
3. `src/components/template-set-selector.tsx` - Existing template set component for reference

---

### Example User Workflow (Your Use Case!)

**Goal**: Move current default templates to a "Legacy" set, create new template set as default

**Steps with new UI:**
1. Open Super Admin Organizations window
2. Click "Template Sets" tab (new tab between "Create" and "Templates"!)
3. See "System Default Template Set ⭐" card with current templates
4. Click "+ Create New Template Set"
5. Fill in form:
   - Name: "Legacy Event Set"
   - Description: "Original default templates"
   - Ticket: Select current default ticket template
   - Invoice: Select current default invoice template
   - Email: Select current default email template
   - Tags: "legacy", "original"
   - Set as Default: NO
6. Click "Create" → New set created!
7. Find "System Default Template Set" card
8. Change dropdowns:
   - Ticket: Select your new ticket template
   - Invoice: Select your new invoice template
   - Email: Select your new email template
9. Changes auto-save!
10. ✅ Done! All future checkouts use new default templates

Good luck! 🎉
