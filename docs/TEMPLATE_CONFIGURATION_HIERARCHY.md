# Template Configuration Hierarchy & Architecture

## 📋 Overview

This document defines the **complete template configuration hierarchy** across the l4yercak3 platform, including all locations where templates can be configured and the **precedence rules** that determine which template is used.

---

## 🎯 Template Types

The platform uses **three types of templates**:

1. **Ticket Templates** - PDF tickets sent to attendees
2. **Invoice Templates** - PDF invoices for B2B/B2C transactions
3. **Email Templates** - Confirmation emails with order details

---

## 📍 Configuration Locations (Current State)

Templates can currently be configured in **7 different locations**:

### **1. System Level** (Highest Fallback)
- **Location**: System organization (`slug: "system"`)
- **Field**: `customProperties.isSystemDefault = true`
- **Purpose**: Guaranteed fallback when no other template is configured
- **Scope**: Global (all organizations)
- **Example**:
  ```typescript
  {
    organizationId: "system-org-id",
    type: "template",
    category: "ticket",
    templateCode: "ticket_professional_v1",
    customProperties: {
      isSystemDefault: true,
      isDefault: true
    }
  }
  ```

### **2. Organization Level** (Org Default)
- **Location**: Each organization's templates
- **Field**: `customProperties.isDefault = true`
- **Purpose**: Organization-wide default for each template category
- **Scope**: Organization-wide
- **Set by**: Admin in Templates Window
- **Example**:
  ```typescript
  {
    organizationId: "org-123",
    type: "template",
    category: "invoice",
    templateCode: "invoice_modern_v1",
    customProperties: {
      isDefault: true  // Org default for invoices
    }
  }
  ```

### **3. Domain Level** (Domain Default)
- **Location**: Domain configuration (`type: "domain_config"`)
- **Fields**:
  - `customProperties.ticketTemplateId`
  - `customProperties.invoiceTemplateId`
  - `customProperties.confirmationEmailTemplateId`
- **Purpose**: Domain-specific defaults (e.g., different branding per domain)
- **Scope**: All checkouts on that domain
- **Example**:
  ```typescript
  {
    type: "domain_config",
    customProperties: {
      domain: "events.company.com",
      ticketTemplateId: "template_id_789",
      invoiceTemplateId: "template_id_012"
    }
  }
  ```

### **4. Checkout Instance Level** (Checkout Default)
- **Location**: Checkout instance configuration
- **Fields**:
  - `customProperties.ticketTemplateId`
  - `customProperties.invoiceTemplateId`
  - `customProperties.confirmationEmailTemplateId`
- **Purpose**: Template defaults for a specific checkout flow
- **Scope**: All sessions of this checkout instance
- **Set by**: Admin when creating/editing checkout in Checkout Window
- **Example**:
  ```typescript
  {
    type: "checkout_instance",
    customProperties: {
      ticketTemplateId: "template_id_456",
      invoiceTemplateId: "template_id_789",
      confirmationEmailTemplateId: "template_id_012"
    }
  }
  ```

### **5. Product Level** (Product Override)
- **Location**: Product configuration (`type: "product"`)
- **Field**: `customProperties.ticketTemplateId` (tickets only)
- **Purpose**: Product-specific ticket template (e.g., VIP tickets get premium design)
- **Scope**: All tickets for this product
- **Set by**: Admin when creating/editing product in Products Window
- **Example**:
  ```typescript
  {
    type: "product",
    subtype: "ticket",
    customProperties: {
      ticketTemplateId: "template_id_vip_123"  // VIP-specific template
    }
  }
  ```

### **6. Checkout Session Level** (Session Override)
- **Location**: Checkout session (`type: "checkout_session"`)
- **Fields**:
  - `customProperties.selectedProducts[].ticketTemplateId` - Per-product override
  - `customProperties.ticketTemplateId` - Session-wide override
  - `customProperties.invoiceTemplateId` - Session-wide override
- **Purpose**: Runtime selection based on cart contents
- **Scope**: This checkout session only
- **Set by**: System (based on selected products)
- **Example**:
  ```typescript
  {
    type: "checkout_session",
    customProperties: {
      selectedProducts: [
        {
          productId: "prod_123",
          ticketTemplateId: "template_override_456"  // Product-specific override
        }
      ],
      ticketTemplateId: "template_session_789",  // Session-wide override
      invoiceTemplateId: "template_invoice_012"
    }
  }
  ```

### **7. Manual Send Level** (Explicit Selection)
- **Location**: Manual ticket resend/email UI
- **Field**: Passed as argument to `sendTicketEmail()`
- **Purpose**: Admin explicitly chooses template when manually sending
- **Scope**: Single email/ticket send
- **Set by**: Admin clicking "Resend Ticket" in UI
- **Example**: *(To be implemented)*

---

## ⚖️ Current Precedence Hierarchy

### **Ticket Templates** (Current Implementation)

```
Priority 1: Manual Send (explicit selection)
   ↓ If not set
Priority 2: Checkout Session ticketTemplateId (session override)
   ↓ If not set
Priority 3: Checkout Session selectedProducts[].ticketTemplateId (per-product)
   ↓ If not set
Priority 4: Product.ticketTemplateId (product default)
   ↓ If not set
Priority 5: Checkout Instance.ticketTemplateId (checkout default)
   ↓ If not set
Priority 6: Domain Config.ticketTemplateId (domain default)
   ↓ If not set
Priority 7: Organization Default (isDefault: true)
   ↓ If not set
Priority 8: System Default (isSystemDefault: true)
   ↓ If not set
FALLBACK: Hardcoded "ticket_professional_v1" ⚠️ (should never happen)
```

**Code Location**: [convex/pdfGeneration.ts:215-274](../convex/pdfGeneration.ts#L215)

---

### **Invoice Templates** (Current Implementation)

```
Priority 1: Manual Send (explicit selection) *(not implemented yet)*
   ↓ If not set
Priority 2: Checkout Session invoiceTemplateId (session override)
   ↓ If not set
Priority 3: Legacy pdfTemplateCode (deprecated - migration path)
   ↓ If not set
Priority 4: Checkout Instance.invoiceTemplateId (checkout default)
   ↓ If not set
Priority 5: Domain Config.invoiceTemplateId (domain default)
   ↓ If not set
Priority 6: Organization Default (isDefault: true)
   ↓ If not set
Priority 7: System Default (isSystemDefault: true)
   ↓ If not set
FALLBACK: Hardcoded "invoice_b2c_receipt_v1" ⚠️ (should never happen)
```

**Code Location**: [convex/pdfGeneration.ts:890-948](../convex/pdfGeneration.ts#L890)

---

### **Email Templates** (Current Implementation)

```
Priority 1: Manual Send (explicit selection) *(not implemented yet)*
   ↓ If not set
Priority 2: Checkout Instance.confirmationEmailTemplateId (checkout default)
   ↓ If not set
Priority 3: Domain Config.confirmationEmailTemplateId (domain default)
   ↓ If not set
Priority 4: Organization Default (isDefault: true)
   ↓ If not set
Priority 5: System Default (isSystemDefault: true)
   ↓ If not set
FALLBACK: Hardcoded "luxury-confirmation" ⚠️ (should never happen)
```

**Code Location**: [convex/ticketGeneration.ts:615-650](../convex/ticketGeneration.ts#L615)

---

## ⚠️ Current Issues

### **1. Hierarchy Inconsistency**
- **Ticket templates** check Session → Product → Checkout Instance → Domain → Org → System
- **Invoice templates** check Session → Checkout Instance → Domain → Org → System
- **Email templates** check Checkout Instance → Domain → Org → System
- **Problem**: Different precedence orders make debugging difficult

### **2. Missing Domain Level**
- Invoice and Email templates don't check Domain Config
- Only ticket templates check Domain Config
- **Problem**: Inconsistent behavior across template types

### **3. No Manual Send Support**
- When admin manually resends ticket/email, can't choose template
- **Problem**: Admin has no control over which template is used for manual sends

### **4. Poor Visibility**
- Admin can't see which template is actually being used
- No UI shows the precedence chain
- **Problem**: Hard to debug "why is this template being used?"

### **5. Hardcoded Fallbacks**
- All three template types have hardcoded string fallbacks
- If template doesn't exist in DB, system fails silently
- **Problem**: No error reporting when templates are misconfigured

---

## ✅ Recommended Hierarchy (Proposed)

### **Unified Precedence for All Template Types**

```
Priority 1: Manual Send (explicit admin selection)
   ↓ If not set
Priority 2: Checkout Session Override (runtime override)
   ↓ If not set (tickets only)
Priority 3: Product Override (product-specific template)
   ↓ If not set
Priority 4: Checkout Instance Default (checkout flow default)
   ↓ If not set
Priority 5: Domain Default (domain-specific branding)
   ↓ If not set
Priority 6: Organization Default (org-wide default)
   ↓ If not set
Priority 7: System Default (guaranteed fallback)
   ↓ If not set
ERROR: Throw descriptive error (system not seeded properly)
```

**Key Changes:**
1. ✅ All template types use **same precedence order**
2. ✅ Domain level checked for **all template types** (not just tickets)
3. ✅ Manual send gets **highest priority** (admin knows best)
4. ✅ **No hardcoded fallbacks** - throw error instead
5. ✅ Product override only applies to **tickets** (makes sense - products = tickets)

---

## 🎨 UI Improvements Needed

### **1. Template Detail View Modal**

**Current**: Templates Window shows grid of templates
**Proposed**: Click template → Opens detail modal with:

```
┌─ Template Detail Modal ──────────────────────────┐
│                                                   │
│  [Preview]                                        │
│  ┌───────────────────────────────────┐            │
│  │                                   │            │
│  │   [Template Preview Render]      │            │
│  │                                   │            │
│  └───────────────────────────────────┘            │
│                                                   │
│  Template: "Modern Invoice V1"                   │
│  Category: Invoice                               │
│  Code: invoice_modern_v1                         │
│                                                   │
│  ┌─ Configuration ─────────────────────┐          │
│  │                                     │          │
│  │ Where is this template used?       │          │
│  │                                     │          │
│  │ ✓ Organization Default              │  [Set]  │
│  │ ✓ Domain: events.company.com        │  [Set]  │
│  │ ○ Domain: shop.company.com          │  [Set]  │
│  │ ○ Checkout: "Event Registration"   │  [Set]  │
│  │ ○ Checkout: "Product Sales"         │  [Set]  │
│  │                                     │          │
│  │ Used in 23 products                │  [View] │
│  │ Used in 145 sessions this month    │  [View] │
│  │                                     │          │
│  └─────────────────────────────────────┘          │
│                                                   │
│  [Save Changes]  [Cancel]                        │
└───────────────────────────────────────────────────┘
```

**Features:**
- ✅ **Visual preview** of template
- ✅ **Show all configuration locations** where this template is used
- ✅ **Quick toggle** to set as default at any level (Org, Domain, Checkout)
- ✅ **Usage statistics** - how many products/sessions use this template
- ✅ **One-click configuration** - set template for specific domain/checkout

### **2. Template Selection Enhancement**

**Current**: Dropdown in Checkout/Product forms
**Proposed**: Smart template picker with preview

```
┌─ Select Template ────────────────────────┐
│                                           │
│  Current: "Professional Invoice"         │
│  ┌─────────────────┐                      │
│  │ [Mini Preview]  │                      │
│  └─────────────────┘                      │
│                                           │
│  ○ Use Organization Default               │
│    → "Modern Invoice V1"                  │
│                                           │
│  ○ Use Domain Default                     │
│    → "Elegant Invoice"                    │
│                                           │
│  ⚫ Override with specific template        │
│    [Select Template ▾]                    │
│                                           │
│  [Preview Selected]  [Apply]              │
└───────────────────────────────────────────┘
```

**Features:**
- ✅ Shows **what template would be used** if you select "default"
- ✅ **Visual preview** of selected template
- ✅ **Clear inheritance chain** - see where template comes from

### **3. Manual Send UI**

**Location**: When admin clicks "Resend Ticket" or "Resend Email"
**Proposed**: Template selection before sending

```
┌─ Resend Ticket ──────────────────────────┐
│                                           │
│  To: john.doe@example.com                │
│                                           │
│  Template:                                │
│  ⚫ Use configured template                │
│    → "VIP Premium Ticket"                 │
│                                           │
│  ○ Override with:                          │
│    [Select Template ▾]                    │
│                                           │
│  [Preview]  [Send]  [Cancel]              │
└───────────────────────────────────────────┘
```

**Features:**
- ✅ Shows **which template would be used** by default
- ✅ **Option to override** for this send only
- ✅ **Preview before sending**

### **4. Template Usage Dashboard**

**New Section**: Templates Window → "Usage" tab

```
┌─ Template Usage Analytics ───────────────┐
│                                           │
│  Template: "Modern Invoice V1"           │
│                                           │
│  📊 Usage Stats (Last 30 Days)           │
│  • 1,234 invoices generated              │
│  • 45 organizations using                │
│  • 12 domains configured                 │
│                                           │
│  🔧 Configured At:                        │
│  • Organization Default: ✓                │
│  • Domain Default: 3 domains              │
│  • Checkout Default: 8 checkouts          │
│  • Product Override: 23 products          │
│                                           │
│  📈 Trend: +15% usage this month          │
│                                           │
│  [View Details]  [Export Report]          │
└───────────────────────────────────────────┘
```

---

## 🔧 Implementation Plan

### **Phase 1: Fix Hierarchy Inconsistency**
1. ✅ Unify precedence order across all template types
2. ✅ Add domain-level checks for invoices and emails
3. ✅ Remove hardcoded fallbacks (throw errors instead)
4. ✅ Add comprehensive logging at each precedence level

**Files to modify:**
- `convex/pdfGeneration.ts`
- `convex/ticketGeneration.ts`
- `convex/emailTemplateResolver.ts`

### **Phase 2: Add Template Detail Modal**
1. Create `TemplateDetailModal` component
2. Add "Configuration" tab showing where template is used
3. Add "Usage Stats" tab showing how often template is used
4. Add one-click "Set as Default" buttons for each level

**Files to create:**
- `src/components/template-detail-modal.tsx`
- `src/components/template-configuration-panel.tsx`
- `src/components/template-usage-stats.tsx`

### **Phase 3: Enhance Template Selectors**
1. Update Checkout form template selector
2. Update Product form template selector
3. Add "Preview" button to all selectors
4. Show inheritance chain ("Using default from X")

**Files to modify:**
- `src/components/window-content/checkout-window/create-checkout-tab.tsx`
- `src/components/window-content/products-window/product-form.tsx`
- `src/components/template-selector.tsx` *(if exists)*

### **Phase 4: Add Manual Send Template Selection**
1. Create manual send modal for tickets
2. Create manual send modal for emails
3. Add template override option
4. Add preview before send

**Files to create:**
- `src/components/modals/resend-ticket-modal.tsx`
- `src/components/modals/resend-email-modal.tsx`

### **Phase 5: Add Usage Tracking**
1. Create template usage analytics query
2. Track template usage in checkout sessions
3. Add usage dashboard to Templates Window
4. Add export/reporting features

**Files to create:**
- `convex/templateUsageAnalytics.ts`
- `src/components/window-content/templates-window/usage-tab.tsx`

---

## 📖 Documentation Needed

1. **Admin Guide**: How to configure templates at each level
2. **Developer Guide**: How to add new template types
3. **Troubleshooting**: "Why is this template being used?"
4. **Migration Guide**: Upgrading from hardcoded fallbacks

---

## ✅ Success Metrics

After implementation:
- ✅ **Zero template configuration bugs** in support tickets
- ✅ **Admin can trace** exactly which template is being used and why
- ✅ **Consistent behavior** across all template types
- ✅ **Self-service configuration** - no developer needed to change templates
- ✅ **Clear error messages** when templates are misconfigured

---

## 🔗 Related Documents

- [TEMPLATE_FALLBACK_STRATEGY.md](../TEMPLATE_FALLBACK_STRATEGY.md) - System defaults and seeding
- [PDF_TEMPLATE_SYSTEM_IMPLEMENTATION.md](PDF_TEMPLATE_SYSTEM_IMPLEMENTATION.md) - Template ontology design
- [TEMPLATE_IO_INTEGRATION.md](TEMPLATE_IO_INTEGRATION.md) - API Template.io integration

---

**Last Updated**: 2025-01-13
**Author**: Claude Code
**Status**: Proposed - Awaiting Approval
