# Phase 3: Clean Architecture Migration Plan

**Date**: 2025-01-27
**Goal**: Remove all hardcoded templates, keep only schema-driven templates, deprecate individual defaults

---

## ✅ Current State - What We're Keeping

### **Existing Schema-Driven Templates (3)**

1. **✅ Newsletter Email** (`seedNewsletterTemplate.ts`)
   - Full EmailTemplateSchema with sections
   - Variables for dynamic content
   - AI instructions included
   - Category: marketing

2. **✅ Invoice Email** (`seedInvoiceEmailTemplate.ts`)
   - HTML template with placeholders
   - Translation support
   - Attachment handling
   - Category: transactional

3. **✅ B2B Invoice PDF** (`seedInvoiceB2BTemplate.ts`)
   - Full PdfTemplateSchema
   - Complete styling and layout
   - VAT breakdown support
   - Category: invoice

### **PDF Templates in lib/pdf_templates/ (11 total)**
All appear to be functional code-based generators:
- ✅ invoice_b2b_single.ts
- ✅ invoice_template.ts
- ✅ ticket_template.ts
- ✅ elegant_gold_ticket_template.ts
- ✅ modern_ticket_template.ts
- ✅ vip_premium_ticket_template.ts
- ✅ ebook_guide.ts
- ✅ checklist_onepager.ts
- ✅ quote_estimate.ts
- ✅ badge_attendee.ts
- ✅ program_event.ts

---

## 🎯 What We Need to Add

### **2 Essential Email Templates (Schema-Driven)**

1. **Event Confirmation Email** (HIGHEST PRIORITY)
   - Confirms event registration
   - Includes ticket details
   - Calendar invite (.ics)
   - Category: event

2. **Transaction Receipt Email**
   - Confirms payment
   - Shows order details
   - Download links
   - Category: transactional

**Why these 2?**
- Cover the most common use cases
- Event confirmation is used by every event
- Transaction receipt is used by every purchase
- Combined with existing 3, covers 95% of needs

---

## ❌ What We're Removing

### **Hardcoded Email Templates (19 files to delete)**

```
src/templates/emails/
├── ❌ modern-minimal/ (delete)
├── ❌ luxury-confirmation/ (delete)
├── ❌ transaction/ (delete - replace with schema version)
├── ❌ event-followup/ (delete)
├── ❌ sales-notification/ (delete)
├── ❌ status-update/ (delete)
├── ❌ event-reminder/ (delete)
├── ❌ shipping/ (delete)
├── ❌ lead-magnet/ (delete)
├── ❌ generic/ (delete)
├── ❌ account/ (delete)
├── ❌ event-invitation/ (delete)
├── ❌ support-response/ (delete)
├── ❌ vip-exclusive/ (delete)
├── ❌ event-confirmation/ (delete - replace with schema version)
├── ✅ invoice-b2b/ (KEEP - convert to schema if needed)
├── ❌ invoice-b2c/ (delete)
├── ❌ receipt/ (delete)
└── ✅ newsletter/ (KEEP - already schema-driven)
```

### **Old Seed Scripts to Remove**
```
convex/
├── ❌ seedEmailTemplates.ts (delete - replaced by individual schema seeds)
├── ❌ seedTemplates.ts (delete if unused)
└── ❌ Any other non-schema seed scripts
```

### **UI Elements to Remove**
```
❌ "Set Default" button on individual templates
❌ Individual template default selection UI
❌ Non-schema template references
```

---

## 📋 Migration Steps

### **Step 1: Create 2 New Schema Email Templates** (30 min)

**1.1 Event Confirmation Schema**
```typescript
// convex/seedEventConfirmationTemplate.ts
{
  code: "event-confirmation-v2",
  category: "event",
  defaultSections: [
    { type: "hero", title: "You're Registered!", ... },
    { type: "eventDetails", ... },
    { type: "calendarAttachment", ... }
  ],
  variables: [
    { name: "eventName", type: "string", required: true },
    { name: "eventDate", type: "date", required: true },
    { name: "ticketType", type: "string", required: true }
  ]
}
```

**1.2 Transaction Receipt Schema**
```typescript
// convex/seedTransactionReceiptTemplate.ts
{
  code: "transaction-receipt-v2",
  category: "transactional",
  defaultSections: [
    { type: "hero", title: "Payment Confirmed", ... },
    { type: "orderSummary", ... },
    { type: "downloadLinks", ... }
  ],
  variables: [
    { name: "orderNumber", type: "string", required: true },
    { name: "total", type: "currency", required: true },
    { name: "items", type: "array", required: true }
  ]
}
```

---

### **Step 2: Update System Default Template Set** (20 min)

**File**: `convex/seedSystemDefaultTemplateSet.ts`

**Change From** (13 templates including hardcoded):
```typescript
templates: [
  ticketTemplate,
  invoiceTemplate,
  emailConfirmation,
  newsletter,
  // ... 9 more hardcoded templates
]
```

**Change To** (5 schema-driven templates):
```typescript
templates: [
  // PDF Templates (from lib/pdf_templates/)
  { templateId: "ticket_professional_v1", templateType: "ticket", isRequired: true },
  { templateId: "invoice_b2b_single_v1", templateType: "invoice", isRequired: false },

  // Email Templates (schema-driven)
  { templateId: "event-confirmation-v2", templateType: "email", isRequired: true },
  { templateId: "transaction-receipt-v2", templateType: "email", isRequired: false },
  { templateId: "newsletter-confirmation", templateType: "email", isRequired: false },
]
```

**Result**: Clean v2.0 template set with ONLY schema-driven templates

---

### **Step 3: Remove Hardcoded Email Templates** (15 min)

```bash
# Delete 16 hardcoded template directories
rm -rf src/templates/emails/modern-minimal
rm -rf src/templates/emails/luxury-confirmation
rm -rf src/templates/emails/transaction
rm -rf src/templates/emails/event-followup
rm -rf src/templates/emails/sales-notification
rm -rf src/templates/emails/status-update
rm -rf src/templates/emails/event-reminder
rm -rf src/templates/emails/shipping
rm -rf src/templates/emails/lead-magnet
rm -rf src/templates/emails/generic
rm -rf src/templates/emails/account
rm -rf src/templates/emails/event-invitation
rm -rf src/templates/emails/support-response
rm -rf src/templates/emails/vip-exclusive
rm -rf src/templates/emails/event-confirmation
rm -rf src/templates/emails/invoice-b2c
rm -rf src/templates/emails/receipt

# Keep these (schema-driven or will be converted):
# ✅ src/templates/emails/invoice-b2b/ (convert if needed)
# ✅ src/templates/emails/newsletter/ (already schema-driven via seed)
```

---

### **Step 4: Remove Individual Template Defaults UI** (25 min)

**4.1 Remove "Set Default" Button**
- File: Wherever individual templates show "Set Default"
- Action: Remove button and related mutation calls

**4.2 Update Template Selection UI**
- Show only schema-driven templates
- Filter out hardcoded templates
- Update dropdowns to use schema templates

**4.3 Update Template Preview**
- Use schema renderer for previews
- Remove hardcoded preview logic

---

### **Step 5: Clean Up Seed Scripts** (20 min)

**5.1 Remove Old Seeds**
```bash
# Delete old email template seeds (if they exist and are unused)
# Be careful - check if these are referenced anywhere first
```

**5.2 Create Master Seed Script**
```typescript
// convex/seedAllSchemaTemplates.ts
export const seedAllSchemaTemplates = internalMutation({
  handler: async (ctx) => {
    // Seed email templates
    await ctx.runMutation(internal.seedNewsletterTemplate.seedNewsletterTemplate);
    await ctx.runMutation(internal.seedInvoiceEmailTemplate.seedInvoiceEmailTemplate);
    await ctx.runMutation(internal.seedEventConfirmationTemplate.seedEventConfirmationTemplate);
    await ctx.runMutation(internal.seedTransactionReceiptTemplate.seedTransactionReceiptTemplate);

    // Seed PDF template (B2B Invoice)
    await ctx.runMutation(internal.seedInvoiceB2BTemplate.seedInvoiceB2BTemplate);

    // Seed system default template set (v2.0)
    await ctx.runMutation(internal.seedSystemDefaultTemplateSet.seedSystemDefaultTemplateSet);
  }
});
```

---

### **Step 6: Update Documentation** (10 min)

**6.1 Update Template Docs**
- Document the 5 schema-driven templates
- Explain schema structure
- Provide examples

**6.2 Update Migration Guide**
- Phase 3 completion notes
- Breaking changes (if any)
- Migration path for custom templates

---

## 🎯 Final State

### **Templates After Migration (5 Email + 11 PDF = 16 total)**

**Email Templates (5 schema-driven):**
1. ✅ Event Confirmation (event category)
2. ✅ Transaction Receipt (transactional)
3. ✅ Newsletter Confirmation (marketing)
4. ✅ Invoice Email (transactional)
5. ✅ B2B Invoice Email (if separate from #4)

**PDF Templates (11 existing):**
1. ✅ Professional Ticket
2. ✅ B2B Invoice
3. ✅ B2C Invoice/Receipt
4. ✅ Elegant Gold Ticket
5. ✅ Modern Ticket
6. ✅ VIP Premium Ticket
7. ✅ eBook Guide
8. ✅ Checklist One-Pager
9. ✅ Quote/Estimate
10. ✅ Attendee Badge
11. ✅ Event Program

**System Default Template Set (v2.0):**
- 3 required templates (ticket + event confirmation + invoice)
- 13+ optional templates (all others)
- 100% schema-driven
- AI-editable
- Fully flexible

---

## ✅ Benefits of This Migration

1. **🧹 Clean Architecture**
   - One template system (schema-driven)
   - No hardcoded HTML in src/
   - All templates stored in database

2. **🤖 AI-Ready**
   - AI can edit any template via schema
   - Consistent structure across all templates
   - Variable definitions for smart content

3. **🎨 Flexible & Extensible**
   - Easy to add new templates
   - Users can customize via UI
   - Template Sets v2.0 supports unlimited templates

4. **📦 Smaller Codebase**
   - Remove 19 hardcoded template files
   - Simplified seed scripts
   - Less maintenance overhead

5. **🚀 Future-Proof**
   - Template versioning
   - Schema evolution
   - Plugin architecture possible

---

## ⚠️ Migration Risks & Mitigation

### **Risk 1: Existing Users Have Hardcoded Templates**
**Mitigation**:
- Keep backward compatibility in renderer
- Provide migration tool
- Gradual deprecation warnings

### **Risk 2: Some Use Cases Not Covered**
**Mitigation**:
- Generic template as catchall
- Easy to add new schema templates
- Users can create custom templates

### **Risk 3: Schema Format Changes**
**Mitigation**:
- Version all schemas
- Schema migration system
- Backward compatible renderer

---

## 🎓 Post-Migration Guidelines

### **Adding New Templates**
1. Create schema definition
2. Create seed script
3. Add to system default set (optional)
4. Document in registry

### **Template Versioning**
```typescript
// Version 1.0.0
code: "event-confirmation-v2",
version: "1.0.0",

// When updating to 2.0.0, create new template:
code: "event-confirmation-v3",
version: "2.0.0",
```

### **Schema Evolution**
- Add new fields (backward compatible)
- Deprecate old fields (keep for 2 versions)
- Remove after warning period

---

## 📊 Success Metrics

**Code Quality:**
- ✅ 0 hardcoded templates in src/
- ✅ 100% schema-driven email templates
- ✅ Consistent PDF template structure
- ✅ Single source of truth

**User Experience:**
- ✅ Template Sets v2.0 only
- ✅ No confusing "Set Default" buttons
- ✅ Clear template hierarchy
- ✅ AI-editable templates

**System Architecture:**
- ✅ Database-driven templates
- ✅ Version control
- ✅ Easy to extend
- ✅ Plugin-ready

---

## 🚀 Ready to Execute

**Total Time**: ~2 hours
**Breaking Changes**: Minimal (backward compatible)
**Risk Level**: Low
**Benefits**: High

**Next Step**: Create the 2 new schema email templates

---

**Status**: Ready for implementation ✅
