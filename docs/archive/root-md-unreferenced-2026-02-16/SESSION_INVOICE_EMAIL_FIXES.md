# Invoice Email System Fixes - Session Summary

**Date**: 2025-01-27
**Status**: 🟡 Partially Complete - Translation & PDF Generation Remaining

## 🎯 Overview

This session focused on fixing invoice email functionality, specifically:
1. ✅ Template compatibility issues (FIXED)
2. ✅ Template Sets management UI (FIXED & MOVED)
3. 🔴 Language translations not working (TODO)
4. 🔴 PDF attachments not being sent (TODO)

---

## ✅ What Was Fixed

### 1. Invoice Email Template Compatibility (FIXED)

**Problem**: Invoice emails were crashing with error:
```
Cannot read properties of undefined (reading 'name')
at InvoiceB2BEmailTemplate (invoice-b2b/index.tsx:120:4)
at invoiceEmailService.ts:182
```

**Root Cause**: Templates expected `EmailTemplateProps` (ticket/event/attendee/domain) but `invoiceEmailService.ts` was passing completely different data structure (invoice/recipient/sender/branding).

**Solution**: Updated both invoice templates to match service data structure:

**Files Changed**:
- `src/templates/emails/invoice-b2b/index.tsx` - Complete rewrite (208 lines)
- `src/templates/emails/invoice-b2c/index.tsx` - Complete rewrite (208 lines)
- `src/templates/emails/registry.ts` - Added type casting for invoice templates

**Key Changes**:
```typescript
// OLD (broken)
export interface InvoiceB2BTemplateProps extends EmailTemplateProps {
  invoice?: { ... }
}

// NEW (works with service)
export interface InvoiceB2BTemplateProps {
  invoice: {
    _id: Id<"objects">;
    invoiceNumber: string;
    invoiceDate: number;  // timestamp
    dueDate: number;      // timestamp
    lineItems: Array<{
      description: string;
      unitPriceInCents: number;  // ✅ cents
      totalPriceInCents: number; // ✅ cents
    }>;
    subtotalInCents: number;
    taxAmountInCents: number;
    totalInCents: number;
    currency: string;
  };
  recipient: { name, email, companyName, address, taxId };
  sender: { name, companyName, email, phone, website };
  branding: { primaryColor, secondaryColor, accentColor, logoUrl };
  language: EmailLanguage;
  isTest: boolean;
}
```

**Result**: ✅ Invoice emails no longer crash and can be sent successfully

---

### 2. Template Sets Management UI (FIXED & MOVED)

**Problem**:
- User couldn't see or manage template sets from Templates Window
- System default template sets weren't visible to organizations
- No UI to set organization's default template set

**Root Cause**:
- Template Sets tab in Templates Window was read-only (107 lines)
- `includeSystem: false` was hiding system default template sets
- No comprehensive CRUD interface

**Solution**:
1. Replaced simple tab with comprehensive 1175-line CRUD UI from super admin
2. Changed `includeSystem: false` → `includeSystem: true`
3. Now shows BOTH system defaults AND organization's custom sets

**Files Changed**:
- `src/components/window-content/templates-window/template-sets-tab.tsx` - Replaced with full CRUD (1175 lines)
- `src/components/window-content/org-owner-manage-window/index.tsx` - Removed incorrect placement

**Key Features**:
- ✅ View all template sets (system + organization)
- ✅ Create new template sets with ANY schema-driven templates
- ✅ Edit existing sets (add/remove templates)
- ✅ Set as default (mark preferred set for organization)
- ✅ Delete template sets (except system defaults)
- ✅ Preview before using

**Location**: Templates Window → "Template Sets" tab (4th tab)

**Result**: ✅ Organizations can now see system defaults and manage their own template sets

---

## 🔴 What Still Needs Fixing

### 3. Language Translations Not Working (TODO)

**Problem**:
- User selects "German" language in invoice email preview
- Email is still sent in English
- No respect for language selection

**Root Cause**: Invoice templates have hardcoded English text, no translation support

**Current State**:
```typescript
// invoice-b2b/index.tsx - ALL HARDCODED ENGLISH
sections: [
  {
    type: "hero",
    title: `Invoice ${invoice.invoiceNumber}`,  // ❌ English only
    subtitle: `Professional services for ${buyerCompany.name}`,  // ❌ English only
  },
  {
    type: "body",
    paragraphs: [
      `Dear ${recipientFirstName},`,  // ❌ English only
      `Please find your invoice for services rendered.`,  // ❌ English only
      // ...
    ],
  },
]
```

**What's Needed**:
1. Create invoice-specific translation keys in `src/templates/emails/translations.ts`
2. Add German, Spanish, French translations
3. Update both invoice templates to use translations
4. Use `getTranslations(props.language)` to get correct language

**Translation Keys Needed**:
```typescript
export interface InvoiceTranslationKeys {
  // B2B
  invoiceTitle: string;              // "Invoice {number}"
  professionalServices: string;      // "Professional services for..."
  dearRecipient: string;             // "Dear {name},"
  invoiceBody: string;               // "Please find your invoice..."
  paymentTerms: string;              // "Payment Terms"
  viewInvoiceOnline: string;         // "View Invoice Online"
  payInvoiceNow: string;             // "Pay Invoice Now"

  // B2C
  invoiceReady: string;              // "Your Invoice is Ready!"
  thanksForBusiness: string;         // "Thanks for your business!"
  paySecurely: string;               // "Pay securely online..."
  payNowEasySecure: string;          // "Pay Now - Easy & Secure"
  needHelp: string;                  // "Need Help?"
  questionsAboutInvoice: string;     // "If you have questions..."
}
```

**Files to Modify**:
- `src/templates/emails/translations.ts` - Add invoice keys for all languages
- `src/templates/emails/invoice-b2b/index.tsx` - Use translations
- `src/templates/emails/invoice-b2c/index.tsx` - Use translations

**Priority**: 🔴 HIGH - User explicitly wants German invoice emails

---

### 4. PDF Attachments Not Being Sent (TODO)

**Problem**:
- User checks "Include PDF Invoice" checkbox
- Email sends successfully but reports: `📎 Attachments: ❌ PDF ❌ ICS`
- No PDF is attached to the email

**Root Cause**: Service checks if `invoice.pdfUrl` exists but doesn't generate PDF if missing

**Current Code** (`convex/invoiceEmailService.ts:182`):
```typescript
// Generate PDF attachment if requested
let pdfAttachment: PDFAttachment | undefined = undefined;

if (includePdfAttachment && invoice.pdfUrl) {  // ❌ Only checks if exists
  try {
    // Download existing PDF from URL
    const pdfResponse = await fetch(invoice.pdfUrl);
    // ... convert to base64 attachment
  } catch (error) {
    console.error("Failed to fetch PDF:", error);
  }
}
```

**What's Needed**:
1. Check if `includePdfAttachment === true`
2. If true and `invoice.pdfUrl` is missing, **generate PDF first**
3. Use existing PDF generation action from `convex/pdfGeneration.ts`
4. Then attach the generated PDF to email

**Solution Approach**:
```typescript
// Generate PDF attachment if requested
let pdfAttachment: PDFAttachment | undefined = undefined;

if (includePdfAttachment) {
  // If no PDF exists, generate it first
  if (!invoice.pdfUrl) {
    console.log("📄 No PDF found, generating invoice PDF...");

    // Use existing generateInvoicePDF action (if it exists)
    // OR create new generateInvoicePDFFromTemplate action
    // Similar to generateTicketPDF but for invoices

    const generatedPdf = await ctx.runAction(internal.pdfGeneration.generateInvoicePDF, {
      invoiceId: invoice._id,
      templateCode: "invoice_b2b_single_v1", // or from template set
    });

    if (generatedPdf) {
      pdfAttachment = generatedPdf;

      // Optionally save pdfUrl to invoice for future use
      await ctx.db.patch(invoice._id, {
        customProperties: {
          ...invoice.customProperties,
          pdfUrl: generatedPdf.url,
        },
      });
    }
  } else {
    // PDF already exists, download it
    const pdfResponse = await fetch(invoice.pdfUrl);
    // ... convert to attachment
  }
}
```

**Files to Modify**:
- `convex/invoiceEmailService.ts` - Add auto-generation logic
- `convex/pdfGeneration.ts` - Verify/add `generateInvoicePDF` action

**Check First**: Does `generateInvoicePDF` action already exist in `pdfGeneration.ts`?
- If YES: Just call it
- If NO: Need to create it (similar to `generateTicketPDF`)

**Priority**: 🔴 HIGH - User explicitly checked the box and expects PDF

---

## 📁 File Reference Guide

### Modified Files (This Session)

**Invoice Email Templates**:
- `src/templates/emails/invoice-b2b/index.tsx` - B2B invoice template (208 lines)
- `src/templates/emails/invoice-b2c/index.tsx` - B2C invoice template (208 lines)
- `src/templates/emails/registry.ts` - Template registry with type casting

**Template Sets UI**:
- `src/components/window-content/templates-window/template-sets-tab.tsx` - Full CRUD UI (1175 lines)
- `src/components/window-content/org-owner-manage-window/index.tsx` - Removed template sets tab

### Files to Modify Next

**For Translations**:
- `src/templates/emails/translations.ts` - Add invoice translation keys
- `src/templates/emails/invoice-b2b/index.tsx` - Use getTranslations()
- `src/templates/emails/invoice-b2c/index.tsx` - Use getTranslations()

**For PDF Generation**:
- `convex/invoiceEmailService.ts` - Add auto-generation logic
- `convex/pdfGeneration.ts` - Verify/create generateInvoicePDF action

### Key Backend Files

**Invoice Email Service**:
- `convex/invoiceEmailService.ts` - Main email sending logic (182 lines is where PDF logic goes)

**Template Resolution**:
- `convex/templateSetResolver.ts` - 6-level precedence for template selection
- `convex/templateSetQueries.ts` - Query template sets
- `convex/templateSetOntology.ts` - CRUD operations

**PDF Generation**:
- `convex/pdfGeneration.ts` - API Template.io PDF generation
- `convex/lib/generateTicketPdf.ts` - Ticket PDF generator (reference)
- `convex/lib/pdf_templates/` - HTML/CSS template files

---

## 🧪 Testing Checklist

### Test 1: Invoice Email Sends (✅ PASSING)
- [x] Open Invoicing window
- [x] Select an invoice
- [x] Click "Send Invoice Email"
- [x] Select language: English
- [x] Click "Send Test Email"
- [x] **Result**: Email sends successfully (no crash)

### Test 2: German Language (🔴 FAILING)
- [ ] Open Invoicing window
- [ ] Select an invoice
- [ ] Click "Send Invoice Email"
- [ ] Select language: **German**
- [ ] Click "Send Test Email"
- [ ] Check email received
- [ ] **Expected**: Email in German
- [ ] **Actual**: Email in English (hardcoded)

### Test 3: PDF Attachment (🔴 FAILING)
- [ ] Open Invoicing window
- [ ] Select an invoice
- [ ] Click "Send Invoice Email"
- [ ] Check "Include PDF Invoice" ✅
- [ ] Click "Send Test Email"
- [ ] Check email received
- [ ] **Expected**: PDF attached
- [ ] **Actual**: No PDF, message shows "📎 Attachments: ❌ PDF ❌ ICS"

### Test 4: Template Sets Visibility (✅ SHOULD PASS)
- [x] Open Templates window
- [x] Click "Template Sets" tab
- [x] **Expected**: See system default template set + any org custom sets
- [ ] **Verify**: System default is visible and usable

### Test 5: Set Organization Default (⚠️ NEEDS TESTING)
- [ ] Open Templates window
- [ ] Click "Template Sets" tab
- [ ] Find system default template set
- [ ] Click "Set as Default" button
- [ ] **Expected**: Set becomes organization's default
- [ ] Test sending invoice with "Use Organization Default"
- [ ] **Verify**: Uses correct template set

---

## 🎯 Next Steps (Priority Order)

### Immediate (Do Next Session)

1. **Add Invoice Translations** (30-60 min)
   - Add translation keys to `translations.ts`
   - German, Spanish, French for all invoice text
   - Update both invoice templates to use translations
   - Test German invoice email

2. **Fix PDF Auto-Generation** (60-90 min)
   - Check if `generateInvoicePDF` exists in `pdfGeneration.ts`
   - If not, create it (similar to ticket PDF)
   - Update `invoiceEmailService.ts` to auto-generate PDFs
   - Test invoice email with PDF attachment

3. **Verify Template Sets** (15 min)
   - Open Templates window
   - Confirm system default template set is visible
   - Test setting it as organization default
   - Verify it's used when sending invoices

### Future Enhancements

- Add more invoice template styles (modern, minimal, etc.)
- Support for invoice reminders (overdue notifications)
- Multi-currency support in templates
- Invoice preview before sending
- Batch invoice sending

---

## 💡 Key Insights

### Template System Architecture

**Two Systems Coexist**:
1. **Old Generic System**: Most email templates use `EmailTemplateProps` + `GenericEmailProps`
2. **New Schema-Driven System**: Invoice templates use specific data structures

**This is intentional** - allows gradual migration without breaking existing functionality.

### Template Set Precedence

Template resolution follows 6-level precedence:
1. Manual Send (explicit admin choice) - highest
2. Product Override
3. Checkout Override
4. Domain Override
5. Organization Default
6. System Default - guaranteed fallback

### System Defaults

System default template sets:
- Created in `system` organization
- Visible to ALL organizations (`includeSystem: true`)
- Cannot be deleted by regular orgs
- Provide guaranteed fallback templates

---

## 🔧 Debugging Commands

### Check Invoice Email Service
```bash
# Search for PDF attachment logic
grep -n "includePdfAttachment" convex/invoiceEmailService.ts

# Find where email is sent
grep -n "sendEmailViaResend" convex/invoiceEmailService.ts
```

### Check Template Sets
```bash
# List all template sets in Templates window
# Templates Window → Template Sets tab

# Verify system default exists
npx convex run templateSetOntology:getTemplateSets \
  --organizationId "YOUR_ORG_ID" \
  --includeSystem true
```

### Check PDF Generation
```bash
# Check if generateInvoicePDF exists
grep -n "generateInvoicePDF" convex/pdfGeneration.ts

# Check available PDF templates
ls convex/lib/pdf_templates/
```

---

## 📞 Contact Points

**Invoice Email Flow**:
1. User clicks "Send Invoice Email" → `invoicingWindow.tsx`
2. Opens modal → `send-invoice-email-modal.tsx`
3. Calls mutation → `invoiceEmailService.ts:sendInvoiceEmail()`
4. Resolves template → `emailTemplateResolver.ts`
5. Renders email → `invoice-b2b/index.tsx` or `invoice-b2c/index.tsx`
6. Sends via Resend → `emailDelivery.ts`

**PDF Attachment Flow**:
1. Check `includePdfAttachment` → `invoiceEmailService.ts:182`
2. Check `invoice.pdfUrl` exists → `invoiceEmailService.ts:183`
3. **MISSING**: Auto-generate PDF if not exists
4. Download/convert to base64 → `invoiceEmailService.ts:185-195`
5. Attach to email → `sendEmailViaResend()`

---

## 🚀 Quick Start (Next Session)

```bash
# 1. Pull latest code
git pull

# 2. Install dependencies (if needed)
npm install

# 3. Start dev servers
npm run dev          # Terminal 1
npx convex dev       # Terminal 2

# 4. Open app
# http://localhost:3000

# 5. Test invoice email
# - Go to Invoicing window
# - Select invoice
# - Click "Send Invoice Email"
# - Try German language + PDF attachment

# 6. Check Template Sets
# - Go to Templates window
# - Click "Template Sets" tab
# - Verify system default is visible
```

---

## ✅ Session Completion Checklist

- [x] Invoice email templates fixed (no more crashes)
- [x] Template Sets UI moved to Templates Window
- [x] System default template sets now visible
- [ ] German translations added to invoice templates
- [ ] PDF auto-generation implemented
- [ ] Full end-to-end testing completed

**Next Session Focus**: Translations + PDF Generation (2-3 hours work)
