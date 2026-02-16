# Session Handoff: PDF Template System Refactoring

**Date**: 2025-11-13
**Status**: In Progress - Core refactoring complete, need to fix templates and update UI

---

## 🎯 What We Accomplished

### 1. ✅ Fixed VAT & Currency Issues
- **Fixed ticket PDF Jinja2 error**: Changed price fields from strings to numbers
- **Fixed invoice template selection**: Now uses configured template instead of hardcoded B2B/B2C logic
- **Fixed currency formatting**: Euro displays as €1.000,00 (European format)
- **Fixed VAT display**: Shows NET amount (€100) not GROSS (€119) for tax-inclusive pricing

**Files Changed**:
- `convex/pdfGeneration.ts` (lines 205-209, 266-267, 581)
- `convex/lib/generateTicketPdf.ts` (lines 101-104)
- `convex/pdfTicketTemplateRenderer.ts` (lines 416-419)

### 2. ✅ Refactored PDF Template System (Major Architecture Change)

**Before**: Hardcoded B2B/B2C logic scattered everywhere
**After**: Clean ontology-based system using template IDs

**New Files Created**:
1. `convex/pdfTemplateResolver.ts` - Generic template resolution utilities
2. `convex/pdfTemplateQueries.ts` - Public queries for fetching templates

**Modified Files**:
1. `convex/checkoutOntology.ts` - Added template ID fields
2. `convex/pdfGeneration.ts` - Removed ALL hardcoded B2B/B2C logic

**New Template Fields in Checkout**:
```typescript
// PDF Templates
invoiceTemplateId: v.optional(v.id("objects"))
ticketTemplateId: v.optional(v.id("objects"))
certificateTemplateId: v.optional(v.id("objects"))

// Email Templates
confirmationEmailTemplateId: v.optional(v.id("objects"))
salesNotificationEmailTemplateId: v.optional(v.id("objects"))

// Deprecated (backward compatible)
pdfTemplateCode: "invoice_b2b_single_v1" | "invoice_b2c_receipt_v1" | ...
```

### 3. ✅ Template Resolution Architecture

**Priority System**:
1. Check `invoiceTemplateId` / `ticketTemplateId` (new system)
2. Fall back to `pdfTemplateCode` (legacy - still works)
3. Query system for default template by category
4. Hardcoded fallback (invoice_b2c_receipt_v1)

**Template Object Structure** (database):
```typescript
{
  type: "template",
  subtype: "pdf",
  customProperties: {
    category: "invoice" | "ticket" | "certificate",
    templateCode: "invoice_b2b_single_v1",
    html: "...",
    css: "...",
    isDefault: true
  }
}
```

---

## 🔴 Current Issues

### Issue #1: Template Missing templateCode Error

**Error Message**:
```
Template missing templateCode: q97fnf02dmep553g37337dm8th7tskxd
```

**Root Cause**:
The checkout is configured with `ticketTemplateId` and `invoiceTemplateId` that point to template objects that DON'T have `templateCode` in their `customProperties`. These are likely:
- Checkout page templates (not PDF templates)
- Email templates (not PDF templates)
- Or improperly configured PDF templates

**Immediate Fix Options**:
1. **Quick Fix**: Remove the invalid templateIds and use legacy `pdfTemplateCode`
2. **Proper Fix**: Ensure templates in database have proper structure (see below)

### Issue #2: Email Templates Not Using Template System

Confirmation emails are hardcoded - they should use `confirmationEmailTemplateId` from checkout configuration.

**Files to Update**:
- `convex/ticketGeneration.ts` (sendOrderConfirmationEmail function)
- `convex/ticketEmailService.ts`

---

## 📋 What Needs to Be Done Next

### Priority 1: Fix Template Database (CRITICAL)

**Task**: Ensure system PDF templates have proper structure

**Required Fields**:
```typescript
{
  type: "template",
  subtype: "pdf",  // CRITICAL
  status: "published",
  organizationId: SYSTEM_ORG_ID,
  customProperties: {
    category: "invoice",  // REQUIRED
    templateCode: "invoice_b2b_single_v1",  // REQUIRED
    html: INVOICE_B2B_SINGLE_HTML,
    css: INVOICE_B2B_SINGLE_CSS,
    version: "1.0",
    isDefault: true,  // Mark one template per category as default
    requiredFields: [...],
    defaultStyling: {...}
  }
}
```

**Templates Needed**:
- Invoice templates:
  - `invoice_b2c_receipt_v1` (default for B2C)
  - `invoice_b2b_single_v1` (default for B2B)
  - `invoice_b2b_consolidated_v1`
  - `invoice_b2b_consolidated_detailed_v1`
- Ticket templates:
  - `ticket_professional_v1` (default)
  - `elegant-gold`
  - `modern-ticket`
  - `vip-premium`

**How to Check/Fix**:
1. Query database: Find all templates with `type="template"` and `subtype="pdf"`
2. Verify each has `templateCode` and `category` in customProperties
3. Ensure one template per category has `isDefault: true`
4. Run seed script: `convex/seedPdfTemplates.ts` if needed

### Priority 2: Add ticketTemplateId to Product Ontology

**File**: `convex/productOntology.ts`

**Add Field**:
```typescript
// For products with subtype="ticket"
ticketTemplateId: v.optional(v.id("objects"))
```

**Logic**: When creating checkout from product, inherit `ticketTemplateId` from product settings.

### Priority 3: Update Product UI for Ticket Template Selection

**File**: `src/components/window-content/products-window/product-form.tsx` (or similar)

**Add to Ticket Settings Section**:
```tsx
// When productType === "ticket"
const ticketTemplates = useQuery(api.pdfTemplateQueries.getPdfTemplatesByCategory, {
  category: "ticket",
  organizationId: orgId
});

<select
  value={selectedTicketTemplate}
  onChange={(e) => setSelectedTicketTemplate(e.target.value)}
>
  <option value="">System Default</option>
  {ticketTemplates?.map(t => (
    <option key={t._id} value={t._id}>{t.name}</option>
  ))}
</select>
```

### Priority 4: Update Email Sending to Use Templates

**Files to Update**:
1. `convex/ticketGeneration.ts` - sendOrderConfirmationEmail function
2. `convex/ticketEmailService.ts`

**Pattern**:
```typescript
// Get template from checkout
const emailTemplateId = session.customProperties?.confirmationEmailTemplateId;

if (emailTemplateId) {
  // Resolve email template (create emailTemplateResolver if needed)
  const template = await resolveEmailTemplate(ctx, emailTemplateId);
  // Render with template
  const html = renderEmailTemplate(template, data);
} else {
  // Fall back to hardcoded email
  const html = generateDefaultConfirmationEmail(data);
}
```

### Priority 5: Update Checkout UI for Template Selection

**File**: `src/components/window-content/checkout-window/create-checkout-tab.tsx`

**Add Template Selection Dropdowns**:
```tsx
// Invoice Template
const invoiceTemplates = useQuery(api.pdfTemplateQueries.getPdfTemplatesByCategory, {
  category: "invoice",
  organizationId: orgId
});

// Ticket Template
const ticketTemplates = useQuery(api.pdfTemplateQueries.getPdfTemplatesByCategory, {
  category: "ticket",
  organizationId: orgId
});

// Confirmation Email Template
const emailTemplates = useQuery(api.pdfTemplateQueries.getPdfTemplatesByCategory, {
  category: "email",  // Need to add this category
  organizationId: orgId
});
```

---

## 📝 Important Code Locations

### Template Resolution
- **Resolver**: `convex/pdfTemplateResolver.ts`
- **Queries**: `convex/pdfTemplateQueries.ts`
- **Usage in PDF Gen**: `convex/pdfGeneration.ts` (lines 629-688 for invoices, 212-268 for tickets)

### Template Registry
- **Registry**: `convex/pdfTemplateRegistry.ts` - Contains template definitions
- **Seed Script**: `convex/seedPdfTemplates.ts` - Seeds templates to database

### Configuration
- **Checkout Config**: `convex/checkoutOntology.ts` (lines 102-119)
- **Product Config**: `convex/productOntology.ts` (needs ticketTemplateId)

### Frontend
- **Checkout Creation**: `src/components/window-content/checkout-window/create-checkout-tab.tsx`
- **Product Form**: `src/components/window-content/products-window/` (needs update)

---

## 🔧 Quick Commands

```bash
# Deploy changes
npx convex deploy

# Run quality checks
npm run typecheck && npm run lint

# Seed PDF templates (if needed)
npx convex run seedPdfTemplates:seed

# Check templates in database
npx convex run pdfTemplateQueries:getPdfTemplatesByCategory '{"category":"invoice"}'
```

---

## 🎯 Testing Checklist

After completing the above tasks:

- [ ] Create checkout with no template config → uses system defaults
- [ ] Create checkout with specific invoice template → uses that template
- [ ] Create ticket product with specific ticket template → inherits to checkout
- [ ] Generate invoice PDF → correct template used
- [ ] Generate ticket PDF → correct template used
- [ ] Send confirmation email → uses email template
- [ ] All prices show correct currency format (€1.000,00)
- [ ] VAT shows NET amount correctly
- [ ] No "template missing templateCode" errors

---

## 💡 Key Design Principles

1. **No Hardcoded Logic**: Templates always come from database configuration
2. **Backward Compatible**: Old `pdfTemplateCode` system still works
3. **Graceful Fallbacks**: System defaults if nothing configured
4. **Type-Safe**: All template IDs are properly typed
5. **Extensible**: Easy to add new PDF types (certificates, badges, etc.)

---

## 🚨 Common Pitfalls to Avoid

1. ❌ Don't use checkout page templates as PDF templates
2. ❌ Don't hardcode template selection based on B2B/B2C
3. ❌ Don't bypass the template resolver - always use it
4. ❌ Don't forget to set `isDefault: true` on system defaults
5. ❌ Don't use `ctx.db` in Actions - use `ctx.runQuery` instead

---

## 📞 Context for Next Session

**Current State**:
- Core refactoring complete and deployed
- System architecture is sound
- Error handling improved with better messages

**Immediate Next Steps**:
1. Fix templates in database (add missing fields)
2. Add ticketTemplateId to products
3. Update email sending code
4. Update frontend UIs

**Long-term**:
- Add certificate templates when needed
- Add custom organization templates
- Migrate all existing checkouts to new system
- Remove deprecated pdfTemplateCode field (after migration)
