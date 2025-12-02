# Template Set Management UI - Implementation Plan

## 🎯 Goal
Build a CRUD interface for super admins to manage template set composition - which ticket, invoice, and email templates belong to which template sets.

## 📋 Current State

### Backend (Already Complete ✅)
- Template sets stored in `objects` table with `type: "template_set"`
- Properties: `ticketTemplateId`, `invoiceTemplateId`, `emailTemplateId`, `isDefault`, `tags`
- Mutations available in `convex/templateSetOntology.ts`:
  - `createTemplateSet` - Create new template set
  - `updateTemplateSet` - Change template assignments
  - `deleteTemplateSet` - Remove template set
  - `setDefaultTemplateSet` - Set as organization default
  - `getTemplateSets` - List all sets for organization

### Frontend (Needs Work ❌)
- Super Admin Templates tab has availability matrix (enable/disable per org)
- NO UI to manage which templates belong to which sets
- NO UI to create/edit/delete template sets
- NO way to change template assignments without code changes

## 🎨 Proposed Solution: New Template Sets Tab

Create a **NEW TAB** in the Super Admin Organizations window specifically for Template Set configuration.

This is cleaner than adding to the existing Templates tab because:
- Templates tab already has 4 availability matrices (Web, Form, Checkout, PDF, Template Sets)
- Template set CRUD needs more space for dropdowns, forms, etc.
- Separation of concerns: Availability (Templates tab) vs. Configuration (Template Sets tab)
- Easier navigation and less overwhelming UI

### Tab Structure

**Super Admin Organizations Window Tabs:**
- Organizations (existing)
- **Template Sets** (NEW - Full CRUD for template sets)
- Templates (existing - Availability matrices only)
- Users (existing)

### Template Sets Tab Layout

```
┌─────────────────────────────────────────────────────┐
│ Super Admin Organizations                           │
│ [Organizations] [Template Sets] [Templates] [Users] │
├─────────────────────────────────────────────────────┤
│ 📦 Template Set Configuration                      │
│ Create, edit, and manage template set composition  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [+ Create New Template Set]                        │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ ⭐ System Default Template Set              │   │
│ │ Luxury Event Suite                          │   │
│ │ #luxury #events #premium                    │   │
│ │                                             │   │
│ │ Templates:                                  │   │
│ │ 🎫 Ticket:  [Luxury Ticket Template ▼]     │   │
│ │ 💰 Invoice: [Luxury Invoice Template ▼]    │   │
│ │ 📧 Email:   [Luxury Email Template ▼]      │   │
│ │                                             │   │
│ │ [Edit] [Set as Default] [Delete]           │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Modern Corporate Set                        │   │
│ │ #modern #corporate #clean                   │   │
│ │                                             │   │
│ │ Templates:                                  │   │
│ │ 🎫 Ticket:  [Modern Ticket Template ▼]     │   │
│ │ 💰 Invoice: [Modern Invoice Template ▼]    │   │
│ │ 📧 Email:   [Modern Email Template ▼]      │   │
│ │                                             │   │
│ │ [Edit] [Set as Default] [Delete]           │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Note:** The Templates tab (separate) will continue to have the availability matrix for enabling/disabling template sets per organization.

## 🔧 Implementation Details

### 1. New Tab: Template Sets Tab

**Location**: `src/components/window-content/super-admin-organizations-window/template-sets-tab.tsx`

**Features**:
- Full-page dedicated to template set CRUD
- List all template sets (system org only initially)
- Expandable cards showing template assignments
- Dropdowns to change ticket/invoice/email templates
- Create/Edit/Delete buttons
- Tag management
- Set as default button

### 2. Integration with Organizations Window

**File**: `src/components/window-content/super-admin-organizations-window/index.tsx`

**Changes**:
- Add "Template Sets" to tab navigation (between "Create" and "Templates")
- Import and render `TemplateSetsTab` component
- Update `TabType` to include `"template-sets"`
- Add Package icon for template sets tab

### 3. Supporting Components

**Location**: `src/components/window-content/super-admin-organizations-window/`

**New files**:
- `template-set-card.tsx` - Individual template set card component
- `create-template-set-form.tsx` - Modal/form for creating new sets

### 4. Backend Integration

**Queries to Use**:
```typescript
// Get all template sets for system org
api.templateSetOntology.getTemplateSets({
  sessionId,
  organizationId: systemOrgId,
  includeSystem: true
})

// Get all available templates for dropdowns
api.pdfTemplateQueries.getAvailablePdfTemplates({
  sessionId,
  organizationId: systemOrgId,
  category: "ticket" | "invoice" | "receipt"
})

api.emailTemplateQueries.getAvailableEmailTemplates({
  sessionId,
  organizationId: systemOrgId
})
```

**Mutations to Use**:
```typescript
// Create new template set
api.templateSetOntology.createTemplateSet({
  sessionId,
  organizationId: systemOrgId,
  name: "...",
  description: "...",
  ticketTemplateId: "...",
  invoiceTemplateId: "...",
  emailTemplateId: "...",
  tags: ["luxury", "premium"],
  isDefault: false
})

// Update existing template set (change template assignments)
api.templateSetOntology.updateTemplateSet({
  sessionId,
  setId: "...",
  ticketTemplateId: "...", // NEW template ID
  invoiceTemplateId: "...", // NEW template ID
  emailTemplateId: "...",   // NEW template ID
  tags: [...],
  isDefault: false
})

// Delete template set
api.templateSetOntology.deleteTemplateSet({
  sessionId,
  setId: "..."
})

// Set as default
api.templateSetOntology.setDefaultTemplateSet({
  sessionId,
  setId: "..."
})
```

## 📝 UI Component Breakdown

### TemplateSetCard Component

**Props**:
```typescript
interface TemplateSetCardProps {
  templateSet: {
    _id: Id<"objects">;
    name: string;
    description?: string;
    customProperties: {
      ticketTemplateId: Id<"objects">;
      invoiceTemplateId: Id<"objects">;
      emailTemplateId: Id<"objects">;
      isDefault: boolean;
      tags: string[];
    };
  };
  availableTicketTemplates: Template[];
  availableInvoiceTemplates: Template[];
  availableEmailTemplates: Template[];
  onUpdate: (updates) => void;
  onDelete: () => void;
  onSetDefault: () => void;
  sessionId: string;
}
```

**Features**:
- Display template set name, description, tags
- Show current template selections
- Dropdowns to change template assignments (updates immediately)
- Edit button to modify name/description/tags
- Set as Default button (unsets previous default)
- Delete button (with confirmation)

### CreateTemplateSetForm Component

**Features**:
- Modal/inline form to create new template set
- Fields:
  - Name (required)
  - Description (optional)
  - Tags (comma-separated or chip input)
  - Ticket Template (dropdown - required)
  - Invoice Template (dropdown - required)
  - Email Template (dropdown - required)
  - Set as Default (checkbox)
- Validation:
  - All three template types required
  - Name must be unique
  - Auto-unsets previous default if "Set as Default" checked
- Submit creates new template set

## 🎯 User Workflows

### Workflow 1: Move Current Default Template to Different Set

**Current State**:
- System has "System Default Template Set" with current default templates
- User wants to move those templates to a new "Legacy" set
- User wants to create a new set with new templates as the default

**Steps**:
1. Super admin opens **Template Sets tab** (new!)
2. Scrolls to "Template Set Configuration" section
3. Sees "System Default Template Set ⭐" card
4. Creates new template set:
   - Click "+ Create New Template Set"
   - Name: "Legacy Event Set"
   - Select current ticket/invoice/email templates from dropdowns
   - Add tags: "legacy", "original"
   - DON'T check "Set as Default"
   - Click "Create"
5. Edits "System Default Template Set":
   - Change ticket template dropdown to new template
   - Change invoice template dropdown to new template
   - Change email template dropdown to new template
   - Dropdowns auto-save on change
6. System updates template set in real-time
7. All future checkouts/products use new default templates

### Workflow 2: Create Brand New Template Set

**Steps**:
1. Click "+ Create New Template Set"
2. Fill in form:
   - Name: "Corporate Modern Set"
   - Description: "Clean modern design for corporate events"
   - Tags: "modern", "corporate", "professional"
   - Ticket: Select "Modern Ticket Template" from dropdown
   - Invoice: Select "Modern Invoice Template" from dropdown
   - Email: Select "Modern Email Template" from dropdown
   - Set as Default: false (NOT the default)
3. Click "Create"
4. New template set appears in list
5. Super admin can then enable for specific organizations in matrix below

### Workflow 3: Change Template Assignment in Existing Set

**Steps**:
1. Find template set card in list
2. Click ticket template dropdown
3. Select different template from dropdown
4. Change auto-saves via `updateTemplateSet` mutation
5. New template immediately used for this set

## 🛠️ Technical Implementation Steps

### Phase 1: Create New Tab + Read-Only Display (2-3 hours)
1. Add "Template Sets" tab to Organizations window navigation
2. Create `template-sets-tab.tsx` component
3. Create `TemplateSetCard` component
4. Fetch all template sets for system org
5. Display cards with current template selections
6. Show tags and default indicator
7. NO editing yet - just display

### Phase 2: Edit Template Assignments (2-3 hours)
1. Fetch all available templates (ticket, invoice, email) from availability ontology
2. Add dropdowns to each template type
3. Wire up `updateTemplateSet` mutation
4. Handle loading states
5. Show success/error feedback

### Phase 3: Create/Delete Template Sets (2-3 hours)
1. Create modal form for new template sets
2. Wire up `createTemplateSet` mutation
3. Add delete button with confirmation
4. Wire up `deleteTemplateSet` mutation
5. Handle edge cases (can't delete default, can't delete if used)

### Phase 4: Edit Name/Description/Tags (1-2 hours)
1. Add edit mode for template set metadata
2. Inline editing or modal form
3. Wire up `updateTemplateSet` for metadata changes

### Phase 5: Set as Default (1 hour)
1. Add "Set as Default" button
2. Wire up `setDefaultTemplateSet` mutation
3. Handle un-setting previous default
4. Show visual feedback

## 🐛 Edge Cases to Handle

1. **Deleting template set in use**:
   - Check if any org/domain/checkout/product references this set
   - Show warning and prevent deletion

2. **Deleting default template set**:
   - Prevent deletion or auto-promote another set to default

3. **Changing default template set**:
   - Auto-unset previous default (backend already handles this)

4. **Template not available**:
   - If ticket/invoice/email template is deleted or disabled, show warning
   - Allow selecting replacement template

5. **No templates available**:
   - If no templates exist in a category, show warning
   - Provide link to seed templates or create new ones

## 📊 Success Criteria

When complete, super admins should be able to:

1. ✅ View all template sets in one place
2. ✅ See which templates are in each set (ticket, invoice, email)
3. ✅ Change template assignments via dropdowns (auto-save)
4. ✅ Create new template sets with name, description, tags
5. ✅ Delete template sets (with confirmation)
6. ✅ Set any template set as the organization default
7. ✅ Move templates between sets by editing assignments
8. ✅ Manage tags for better organization
9. ✅ All changes persist and work with existing template resolution

## 🎨 Design Consistency

**Match existing Win95 aesthetic**:
- Border: `2px solid var(--win95-border)`
- Buttons: Standard retro button styles
- Dropdowns: Native select with retro styling
- Cards: Light gray background, subtle shadow
- Tags: Small gray chips with rounded corners
- Default indicator: Gold star (⭐) icon

**Color scheme**:
- Default set: Gold accent (#FFD700)
- Active state: Purple accent (#6B46C1)
- Disabled: Gray (#9CA3AF)
- Delete: Red (#EF4444)

## 📁 Files to Create/Modify

### New Files
```
src/components/window-content/super-admin-organizations-window/
  ├── template-sets-tab.tsx                (New - Full tab for template set CRUD)
  ├── template-set-card.tsx                (New - Individual set card)
  └── create-template-set-form.tsx         (New - Creation form modal)
```

### Modified Files
```
src/components/window-content/super-admin-organizations-window/
  └── index.tsx                            (Add "Template Sets" tab to navigation)
```

**Note:** `templates-tab.tsx` remains unchanged - it still has the availability matrices.

## 🚀 Next Steps

1. Read this plan thoroughly
2. Create `TemplateSetCard` component (read-only first)
3. Add to Templates tab above availability matrix
4. Test display with existing template sets
5. Add edit functionality (dropdowns)
6. Add create/delete functionality
7. Test full workflow: move default templates, create new set
8. Run `npm run typecheck` and `npm run lint`
9. Document in handoff for next session

## 🎓 Learning Outcomes

This pattern can be reused for:
- Managing which form fields belong to form templates
- Managing which checkout steps belong to checkout templates
- Any other "bundling" use cases where super admins need to organize related items
