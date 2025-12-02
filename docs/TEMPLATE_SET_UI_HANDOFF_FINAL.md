# Template Set UI - Final Handoff Document

**Date**: 2025-01-14
**Status**: Ready for Implementation - Phase 2
**Context**: Continuation of Template Set UI work with simplified hierarchy approach

---

## 🎯 **The Core Vision: Simplification Through Bundling**

### **The Problem We're Solving**
Previously, users had to select 3 separate templates at every configuration level:
- 🎫 Ticket Template (50+ options)
- 💰 Invoice Template (50+ options)
- 📧 Email Template (50+ options)

This was overwhelming and error-prone. **Template Sets solve this by bundling all 3 templates into one selection.**

### **The Solution: Template Set-First Workflow**

Instead of choosing 3 things, choose **ONE template set** and get all 3 templates together:
```
📦 Template Set: [VIP Premium Set ▾]
  ↳ Includes: VIP Ticket + Premium Invoice + Luxury Email
```

---

## ✅ **What We've Completed**

### 1. **Super Admin Template Sets CRUD** ✅
**Location**: `src/components/window-content/super-admin-organizations-window/template-sets-tab.tsx`

**Features Working**:
- ✅ View all template sets (system org)
- ✅ Create new template sets with name, description, tags
- ✅ Edit template assignments via dropdowns (auto-save)
- ✅ Delete template sets (with confirmation modal)
- ✅ Set as default (only one can be default)
- ✅ Theme system compliant (all colors use CSS variables)
- ✅ Real-time updates with Convex reactivity

**Super Admin Can**:
1. Create bundles: "VIP Premium Set" = VIP Ticket + Premium Invoice + Luxury Email
2. Change templates in a set by selecting from dropdowns
3. Set which template set is the organization default
4. Delete unused template sets

### 2. **Template Sets Category Added** ✅
**Location**: `src/components/window-content/templates-window/template-categories.tsx`

**Changes Made**:
- ✅ Added 📦 "Template Sets" category to sidebar
- ✅ Updated `TemplateCategory` type to include `"template_sets"`
- ✅ Added Package icon import

### 3. **Backend Infrastructure** ✅
**Files**:
- `convex/templateSetOntology.ts` - CRUD mutations
- `convex/templateSetQueries.ts` - Query functions
- `convex/templateSetResolver.ts` - Template resolution logic
- `convex/templateSetAvailability.ts` - Licensing/availability control
- `convex/seedTemplateSet.ts` - Seeding default sets

**All Working**:
- ✅ Create/Read/Update/Delete template sets
- ✅ Set default template set (auto-unsets previous default)
- ✅ Resolve which template set to use based on hierarchy
- ✅ Enable/disable template sets per organization

---

## 🎨 **The Simplified Hierarchy (AGREED APPROACH)**

### **Template Set Hierarchy** (Same levels, but picking bundles)

```
Priority 1: Manual Send
   ↳ Explicit template/set selection when admin manually sends
   ↳ Most flexible: can pick any set OR individual templates

Priority 2: Checkout Session Override
   ↳ Runtime template set selection based on cart

Priority 3: Product Override (tickets only)
   ↳ Product-specific template set (e.g., VIP products use VIP set)

Priority 4: Checkout Instance Default
   ↳ Template set selected in checkout configuration
   ↳ THIS IS WHERE MOST USERS CONFIGURE

Priority 5: Domain Config
   ↳ Template set for specific domain (e.g., events.company.com)

Priority 6: Organization Default
   ↳ Organization's default template set
   ↳ Org owner sets this in settings

Priority 7: System Default
   ↳ Guaranteed fallback template set (set by super admin)
```

**Key Insight**: The hierarchy stays the same! But at each level, you're choosing **ONE template set** instead of **THREE individual templates**. That's the simplification! 🎉

### **Two Modes for Flexibility**

**1. Simple Mode (Default)** - 90% of users use this
```
┌─ Checkout Configuration ────────────────┐
│ Template Set: [VIP Premium Set ▾]       │
│   ↳ 🎫 VIP Ticket                       │
│   ↳ 💰 Premium Invoice                  │
│   ↳ 📧 Luxury Confirmation               │
│                                          │
│ [👁️ Preview All 3 Templates]            │
└──────────────────────────────────────────┘
```

**2. Advanced Mode** - Power users who want granular control
```
┌─ Checkout Configuration ────────────────┐
│ Template Set: [VIP Premium Set ▾]       │
│                                          │
│ [🔧 Advanced: Override Individual]      │
│                                          │
│ 🎫 Ticket:  [Override ▾] (optional)     │
│ 💰 Invoice: [Override ▾] (optional)     │
│ 📧 Email:   [Override ▾] (optional)     │
└──────────────────────────────────────────┘
```

---

## 🚧 **What Still Needs to Be Built**

### **Phase 2A: Template Set Display in Templates Window**

**Goal**: When users click "📦 Template Sets" category, show all available template sets

**Tasks**:
1. **Fetch template sets** in `templates-window/index.tsx`
   ```typescript
   const templateSets = useQuery(
     api.templateSetQueries.getAvailableTemplateSets,
     organizationId ? { organizationId } : "skip"
   );
   ```

2. **Create TemplateSetCard component**
   - Location: `src/components/window-content/templates-window/template-set-card.tsx`
   - Shows all 3 templates in one card
   - Layout:
     ```
     ┌─────────────────────────────────────┐
     │ 📦 VIP Premium Set                  │
     │ #luxury #premium #vip               │
     │ ┌───────┐ ┌───────┐ ┌───────┐      │
     │ │  🎫   │ │  💰   │ │  📧   │      │
     │ │ Thumb │ │ Thumb │ │ Thumb │      │
     │ └───────┘ └───────┘ └───────┘      │
     │ [👁️ Preview All] [Use This Set]     │
     └─────────────────────────────────────┘
     ```

3. **Filter logic** for template sets in templates window
   ```typescript
   if (selectedCategory === "template_sets") {
     filteredItems = templateSets;
   }
   ```

### **Phase 2B: Template Set Preview Modal**

**Goal**: Show all 3 templates side-by-side when clicking "Preview All"

**Component**: `src/components/template-set-preview-modal.tsx`

**Layout**:
```
┌─ VIP Premium Set Preview ──────────────────────────────┐
│                                                         │
│  📦 VIP Premium Set                                     │
│  Luxury event suite for premium customers              │
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │ 🎫 Ticket  │  │ 💰 Invoice │  │ 📧 Email   │       │
│  │            │  │            │  │            │       │
│  │  [Large    │  │  [Large    │  │  [Large    │       │
│  │   Preview] │  │   Preview] │  │   Preview] │       │
│  │            │  │            │  │            │       │
│  └────────────┘  └────────────┘  └────────────┘       │
│                                                         │
│  [Use This Set]  [Close]                               │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Live preview of all 3 templates using `TemplateThumbnail`
- Template names shown below each preview
- "Use This Set" button (context-aware)

### **Phase 2C: Usage Information Panel**

**Goal**: Show where each template is being used

**Component**: Add to existing `TemplateCard` component

**Layout**:
```
┌─ Template Detail ─────────────────────────────────────┐
│                                                        │
│  [Left Panel]          [Right Panel]                  │
│  ┌─ Where Used ─┐      ┌─ Preview ──────────────┐    │
│  │              │      │                         │    │
│  │ 📍 Used In:  │      │   [Large Template       │    │
│  │              │      │    Preview Render]      │    │
│  │ ✓ Org Default│      │                         │    │
│  │ ✓ Domain:    │      │                         │    │
│  │   x.com      │      └─────────────────────────┘    │
│  │ ○ Checkout:  │                                     │
│  │   Event1     │      Modern Invoice V1              │
│  │              │      Code: invoice_modern_v1        │
│  │ 📊 Stats:    │                                     │
│  │ • 23 products│      [Set as Org Default]           │
│  │ • 145 uses   │      [Use in Checkout]              │
│  │              │                                     │
│  └──────────────┘                                     │
│                                                        │
│  [Close]                                              │
└────────────────────────────────────────────────────────┘
```

**Data Needed**:
- Query to find where template is configured
- Usage statistics (products, checkouts, sessions)

### **Phase 2D: Template Set Selector Component**

**Goal**: Replace individual template dropdowns with template set selector

**Component**: `src/components/template-set-selector.tsx`

**Usage in**:
1. `src/components/window-content/checkout-window/create-checkout-tab.tsx`
2. `src/components/window-content/products-window/product-form.tsx`
3. `src/components/window-content/org-owner-manage-window/domain-config-tab.tsx`

**Interface**:
```typescript
interface TemplateSetSelectorProps {
  value?: Id<"objects">; // Current template set ID
  onChange: (setId: Id<"objects"> | null) => void;
  organizationId: Id<"organizations">;
  showAdvanced?: boolean; // Toggle for advanced mode
  onAdvancedToggle?: () => void;
}
```

**Simple Mode UI**:
```
┌─ Template Set ────────────────────────┐
│ [VIP Premium Set ▾]                   │
│                                        │
│ Includes:                              │
│ • 🎫 VIP Premium Ticket                │
│ • 💰 Premium Invoice                   │
│ • 📧 Luxury Confirmation               │
│                                        │
│ [👁️ Preview All]  [🔧 Advanced Mode]  │
└────────────────────────────────────────┘
```

**Advanced Mode UI**:
```
┌─ Template Set ────────────────────────┐
│ Base: [VIP Premium Set ▾]             │
│                                        │
│ [← Back to Simple Mode]               │
│                                        │
│ Override Individual Templates:         │
│ 🎫 Ticket:  [Custom Ticket ▾]         │
│ 💰 Invoice: [Use from set]            │
│ 📧 Email:   [Use from set]            │
└────────────────────────────────────────┘
```

### **Phase 2E: Manual Send Enhancement**

**Goal**: Fix manual send to not be weirdly coupled to domain, allow flexible template selection

**Current Problem**: Manual send might be too tightly coupled to domain config

**Solution**: Make manual send the MOST flexible level

**Component**: Create/update resend modals
- `src/components/modals/resend-ticket-modal.tsx`
- `src/components/modals/resend-email-modal.tsx`

**UI**:
```
┌─ Resend Ticket ───────────────────────┐
│                                        │
│ To: john.doe@example.com               │
│                                        │
│ Template Options:                      │
│ ○ Use configured template set          │
│   → VIP Premium Set                    │
│                                        │
│ ○ Override with different set          │
│   [Select Template Set ▾]              │
│                                        │
│ ○ Advanced: Pick specific template     │
│   [Select Ticket Template ▾]           │
│                                        │
│ [👁️ Preview]  [Send]  [Cancel]        │
└────────────────────────────────────────┘
```

---

## 📊 **Current State Assessment**

### **What Works** ✅
- Backend infrastructure (all Convex functions working)
- Super admin can create/manage template sets
- Template sets properly bundle 3 templates
- Availability system (licensing control)
- Theme system compliance

### **What Doesn't Exist Yet** ❌
- Template sets don't show in organization templates window
- No TemplateSetCard component for display
- No 3-template preview modal
- No usage information panel
- No Template Set selector replacing individual dropdowns
- Checkout/Product forms still use individual template selectors
- Manual send doesn't support template set selection

### **Design System Status** ✅
- All new components must use theme variables:
  - `var(--win95-bg)` - Backgrounds
  - `var(--win95-border)` - Borders
  - `var(--win95-text)` - Primary text
  - `var(--neutral-gray)` - Secondary text
  - `var(--win95-highlight)` - Accent color
  - `var(--error)` - Error states
  - `var(--success)` - Success states

---

## 🎯 **Implementation Priority Order**

### **High Priority** (Do First)
1. **TemplateSetCard** - Display template sets in templates window
2. **Template Set Selector** - Replace individual dropdowns in checkout/product forms
3. **3-Template Preview Modal** - Show all templates together

### **Medium Priority** (Do Second)
4. **Usage Information** - Show where templates are used
5. **Advanced Mode Toggle** - Allow granular template overrides

### **Lower Priority** (Nice to Have)
6. **Manual Send Enhancement** - Flexible template selection in resend
7. **Analytics Dashboard** - Usage statistics and trends

---

## 🔧 **Technical Notes**

### **Key Convex Queries**
```typescript
// Get template sets available to org
api.templateSetQueries.getAvailableTemplateSets({ organizationId })

// Get all templates for a set
api.templateSetOntology.getTemplateSets({
  sessionId,
  organizationId,
  includeSystem: false
})

// Get individual templates (for advanced mode)
api.pdfTemplateQueries.getPdfTemplatesByCategory({
  category: "ticket" | "invoice",
  organizationId
})
api.emailTemplateOntology.getAllSystemEmailTemplates({})
```

### **Key Mutations**
```typescript
// Update checkout to use template set
api.checkoutOntology.updateCheckout({
  sessionId,
  checkoutId,
  templateSetId: setId // NEW: Just pass the set ID
})

// Fallback: Individual template overrides (advanced mode)
api.checkoutOntology.updateCheckout({
  sessionId,
  checkoutId,
  ticketTemplateId: customTicketId, // Override just ticket
  // Invoice and email come from template set
})
```

### **Resolution Logic**
The template resolver (`convex/templateSetResolver.ts`) should:
1. Check for individual template overrides first (advanced mode)
2. Fall back to template set at current level
3. Walk up hierarchy if no template set configured
4. Always resolve to 3 specific template IDs (never return a set ID)

---

## 📁 **File Structure**

```
src/components/
├── template-set-selector.tsx              (NEW - Main selector)
├── template-set-preview-modal.tsx         (NEW - 3-template preview)
└── window-content/
    ├── templates-window/
    │   ├── index.tsx                      (MODIFY - Add template sets)
    │   ├── template-categories.tsx        (✅ DONE - Added category)
    │   ├── template-card.tsx              (MODIFY - Add usage info)
    │   └── template-set-card.tsx          (NEW - Display template sets)
    ├── checkout-window/
    │   └── create-checkout-tab.tsx        (MODIFY - Use TemplateSetSelector)
    ├── products-window/
    │   └── product-form.tsx               (MODIFY - Use TemplateSetSelector)
    └── org-owner-manage-window/
        └── domain-config-tab.tsx          (MODIFY - Use TemplateSetSelector)
```

---

## 🎨 **Design Mockups**

### **TemplateSetCard (What we're building)**
```
┌─────────────────────────────────────────────┐
│ 📦 VIP Premium Set                      ⭐  │
│ #luxury #premium #vip #events               │
│ ─────────────────────────────────────────── │
│                                             │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│ │  🎫     │  │  💰     │  │  📧     │     │
│ │         │  │         │  │         │     │
│ │ VIP     │  │ Premium │  │ Luxury  │     │
│ │ Ticket  │  │ Invoice │  │ Email   │     │
│ │         │  │         │  │         │     │
│ └─────────┘  └─────────┘  └─────────┘     │
│                                             │
│ Luxury event suite for premium customers   │
│                                             │
│ [👁️ Preview All 3]  [Use This Set]         │
└─────────────────────────────────────────────┘
```

### **Template Set Selector (Replacing dropdowns)**
```
BEFORE (Complex):
┌─ Templates ────────────────────┐
│ 🎫 Ticket:  [Select ▾] 50 opts │
│ 💰 Invoice: [Select ▾] 50 opts │
│ 📧 Email:   [Select ▾] 50 opts │
└─────────────────────────────────┘

AFTER (Simple):
┌─ Template Set ─────────────────┐
│ [VIP Premium Set ▾] 5 opts     │
│ ✓ Includes all 3 templates     │
│ [👁️ Preview] [🔧 Advanced]     │
└─────────────────────────────────┘
```

---

## ✅ **Success Criteria**

When complete, users should:
1. ✅ See template sets in Templates window (📦 category)
2. ✅ View all 3 templates in one card
3. ✅ Preview all 3 templates side-by-side
4. ✅ Select template sets instead of individual templates
5. ✅ Choose ONE thing and get 3 templates automatically
6. ✅ Toggle "Advanced" to override individual templates (power users)
7. ✅ See where templates are being used (usage info)
8. ✅ Experience a much simpler configuration workflow

---

## 🚀 **Next Steps**

1. Read this handoff document thoroughly
2. Start with **TemplateSetCard** component (highest priority)
3. Add template set fetching to templates window
4. Build 3-template preview modal
5. Create TemplateSetSelector to replace dropdowns
6. Test the simplified workflow end-to-end
7. Run `npm run typecheck` and `npm run lint` after each component

---

## 💡 **Key Insights**

1. **Template Sets don't replace the hierarchy** - they simplify it by bundling choices
2. **Simple mode = 90% use case** - Pick one set, get 3 templates
3. **Advanced mode = power users** - Override individual templates if needed
4. **Manual send = most flexible** - Can pick any set OR any individual template
5. **The simplification is in the UI** - Backend hierarchy stays the same

---

**Ready to continue? Start with TemplateSetCard and let's make template configuration 10x simpler!** 🚀
