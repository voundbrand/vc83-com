# PDF Generation Testing Guide

**System:** API Template.io Integration
**Date:** January 2025
**Status:** Phase 1 & 2 Complete (Invoices & Tickets)

## Overview

This guide provides comprehensive testing instructions for the API Template.io PDF generation system covering both invoices and tickets.

## Prerequisites

### 1. Environment Setup

```bash
# Ensure API Template.io key is configured
echo "API_TEMPLATE_IO_KEY=your_api_key_here" >> .env.local

# Restart Convex development server
npx convex dev
```

### 2. Required Test Data

You'll need:
- **Organization ID** - An existing organization in your system
- **CRM Organization ID** - A CRM organization with billing data (for B2B)
- **Ticket ID** - An existing ticket from a completed purchase
- **Checkout Session ID** - The session associated with the ticket

## Phase 1: Invoice PDF Testing

### Test 1.1: B2B Invoice Generation

**Objective:** Test professional B2B invoice generation

**Test Data:**
```typescript
await ctx.runAction(api.b2bInvoiceHelper.generateB2BInvoicePdf, {
  sessionId: "test-session-001",
  organizationId: "YOUR_ORG_ID",
  crmOrganizationId: "CRM_ORG_ID",
  items: [
    {
      description: "Conference Registration - Standard Ticket",
      quantity: 10,
      unitPriceCents: 29900, // €299.00 per ticket
      taxRate: 0.19, // 19% VAT
    },
    {
      description: "Workshop Add-on",
      quantity: 5,
      unitPriceCents: 9900, // €99.00 per workshop
      taxRate: 0.19,
    }
  ],
  invoiceNumber: "TEST-INV-001",
  notes: "Thank you for your business. Payment due within 30 days.",
  templateCode: "b2b-professional",
});
```

**Expected Results:**
- ✅ PDF URL returned
- ✅ Transaction reference logged in console
- ✅ PDF opens in browser
- ✅ Invoice shows correct company details
- ✅ Line items displayed correctly with quantities and prices
- ✅ Tax calculation accurate (19% of subtotal)
- ✅ Total = Subtotal + Tax
- ✅ VAT numbers displayed if configured

**Edge Cases to Test:**
1. **No Tax:** Set `taxRate: 0`
2. **Multiple Items:** Add 10+ line items
3. **Long Descriptions:** Use 200+ character descriptions
4. **Different Currencies:** Try EUR, USD, GBP
5. **Missing Billing Data:** Test with CRM org without billing address

### Test 1.2: Consolidated Invoice

**Objective:** Test multi-employee consolidated invoicing

**Test Data:**
```typescript
await ctx.runAction(api.consolidatedInvoicing.generateConsolidatedInvoice, {
  sessionId: "test-session-001",
  organizationId: "YOUR_ORG_ID",
  crmOrganizationId: "EMPLOYER_ORG_ID",
  ticketIds: ["ticket1_id", "ticket2_id", "ticket3_id", "ticket4_id"],
  templateId: "b2b_consolidated",
  sendEmail: false, // Set true to test email delivery
});
```

**Expected Results:**
- ✅ Single PDF with all tickets consolidated
- ✅ Each employee listed with their ticket
- ✅ Subtotal per employee
- ✅ Grand total for all employees
- ✅ Tax calculated on total amount
- ✅ Organization billed correctly

**Edge Cases:**
1. **Single Ticket:** Test with just 1 ticket
2. **Large Group:** Test with 50+ tickets
3. **Mixed Prices:** Different ticket types at different prices
4. **Free Tickets:** Include complimentary tickets (price = 0)

### Test 1.3: Template Variations

Test all invoice templates:

```typescript
// Professional B2B
templateCode: "b2b-professional"

// Detailed Breakdown
templateCode: "detailed-breakdown"

// B2C Receipt Style
templateCode: "b2c-receipt"
```

**Expected Results:**
- ✅ Each template has distinct styling
- ✅ All data displays correctly in each template
- ✅ Branding colors consistent
- ✅ Layout is professional and readable

## Phase 2: Ticket PDF Testing

### Test 2.1: Basic Ticket Generation

**Objective:** Test individual event ticket PDF generation

**Test Data:**
```typescript
await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
  ticketId: "EXISTING_TICKET_ID",
  checkoutSessionId: "EXISTING_SESSION_ID",
  templateCode: "modern-ticket",
});
```

**Expected Results:**
- ✅ PDF URL returned
- ✅ Transaction reference logged
- ✅ Ticket displays attendee name
- ✅ Event name and details shown
- ✅ Event date/time formatted correctly
- ✅ Event location displayed
- ✅ QR code embedded and scannable
- ✅ Order details (price, tax, total) shown
- ✅ Organization branding included

**Data Validation:**
```javascript
// Check ticket contains:
{
  attendee_name: "John Doe",
  attendee_email: "john@example.com",
  ticket_type: "VIP",
  event_name: "Tech Conference 2025",
  event_date: "March 15, 2025",
  event_location: "Convention Center, San Francisco",
  qr_code_data: "[QR Code URL]",
  net_price: "199.00",
  tax_amount: "37.81",
  total_price: "236.81",
}
```

### Test 2.2: Template Variations

Test all three ticket templates:

```typescript
// Modern Ticket - Clean contemporary design
await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
  ticketId: "TICKET_ID",
  checkoutSessionId: "SESSION_ID",
  templateCode: "modern-ticket",
});

// Elegant Gold - Luxurious black & gold
await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
  ticketId: "TICKET_ID",
  checkoutSessionId: "SESSION_ID",
  templateCode: "elegant-gold",
});

// VIP Premium - Exclusive VIP styling
await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
  ticketId: "TICKET_ID",
  checkoutSessionId: "SESSION_ID",
  templateCode: "vip-premium",
});
```

**Expected Results:**
- ✅ Each template has unique design language
- ✅ "modern-ticket" - Clean, professional, easy to read
- ✅ "elegant-gold" - Premium feel, black/gold color scheme
- ✅ "vip-premium" - Exclusive design for high-value tickets
- ✅ QR code positioned correctly in all templates
- ✅ All data fields populated in all templates

### Test 2.3: Edge Cases

#### Free Tickets
```typescript
// Ticket with price = 0
{
  net_price: "0.00",
  tax_amount: "0.00",
  total_price: "0.00"
}
```
**Expected:** Shows "Free" or "Complimentary" instead of €0.00

#### Tickets with Sponsors
```typescript
// Event with multiple sponsors
event_sponsors: [
  { name: "TechCorp", level: "Gold" },
  { name: "InnovateInc", level: "Silver" },
  { name: "StartupHub", level: "Bronze" }
]
```
**Expected:** Sponsors displayed prominently on ticket

#### Missing Event Data
```typescript
// Ticket with TBD event details
{
  event_date: "TBD",
  event_location: "Location TBD"
}
```
**Expected:** Shows "TBD" gracefully without breaking layout

#### Long Event Names
```typescript
event_name: "International Conference on Artificial Intelligence, Machine Learning, and Data Science 2025"
```
**Expected:** Text wraps cleanly, doesn't overflow

## Performance Testing

### Test 3.1: Generation Speed

**Objective:** Measure PDF generation time

**Test:**
```javascript
console.time("PDF Generation");
const result = await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
  ticketId: "ID",
  checkoutSessionId: "SESSION_ID",
  templateCode: "modern-ticket",
});
console.timeEnd("PDF Generation");
```

**Expected Benchmarks:**
- Invoice generation: 3-5 seconds
- Ticket generation: 2-4 seconds
- Consolidated invoice (10 tickets): 4-6 seconds

### Test 3.2: Concurrent Generation

**Objective:** Test multiple PDFs generated simultaneously

**Test:**
```javascript
const promises = [1, 2, 3, 4, 5].map(i =>
  ctx.runAction(api.pdfGeneration.generateTicketPDF, {
    ticketId: `ticket_${i}`,
    checkoutSessionId: `session_${i}`,
    templateCode: "modern-ticket",
  })
);

const results = await Promise.all(promises);
console.log(`Generated ${results.length} PDFs`);
```

**Expected Results:**
- ✅ All PDFs generate successfully
- ✅ No timeouts or errors
- ✅ API Template.io handles concurrent requests
- ✅ Response times remain consistent

## Error Handling Testing

### Test 4.1: Missing API Key

**Test:**
```bash
# Remove API key temporarily
unset API_TEMPLATE_IO_KEY
npx convex dev
```

**Expected Results:**
- ✅ Error logged: "API_TEMPLATE_IO_KEY not configured"
- ✅ Function returns null gracefully
- ✅ No crashes or unhandled exceptions

### Test 4.2: Invalid Template Code

**Test:**
```typescript
await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
  ticketId: "TICKET_ID",
  checkoutSessionId: "SESSION_ID",
  templateCode: "non-existent-template",
});
```

**Expected Results:**
- ✅ Error logged from API Template.io
- ✅ Helpful error message
- ✅ Function returns null or default template

### Test 4.3: Missing Ticket Data

**Test:**
```typescript
await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
  ticketId: "invalid_id",
  checkoutSessionId: "invalid_session",
  templateCode: "modern-ticket",
});
```

**Expected Results:**
- ✅ Error: "Ticket not found"
- ✅ Function throws appropriate error
- ✅ No PDF generated

## Integration Testing

### Test 5.1: Email Delivery

**Objective:** Test PDF attachment in emails

**Test:**
```typescript
// Generate PDF and attach to email
const pdfAttachment = await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
  ticketId: "TICKET_ID",
  checkoutSessionId: "SESSION_ID",
  templateCode: "modern-ticket",
});

// Send email with attachment
await ctx.runAction(api.emailService.sendTicketEmail, {
  to: "customer@example.com",
  subject: "Your Event Ticket",
  attachments: [pdfAttachment],
});
```

**Expected Results:**
- ✅ Email received
- ✅ PDF attachment opens correctly
- ✅ PDF is not corrupted
- ✅ File size reasonable (<500KB)

### Test 5.2: Storage Integration

**Objective:** Test PDF storage in Convex

**Test:**
```typescript
// Generate PDF
const pdfResult = await ctx.runAction(api.pdfGeneration.generateTicketPDF, {
  ticketId: "TICKET_ID",
  checkoutSessionId: "SESSION_ID",
  templateCode: "modern-ticket",
});

// Store in Convex storage
const storageId = await ctx.storage.store(
  new Blob([Buffer.from(pdfResult.content, 'base64')], {
    type: "application/pdf"
  })
);

// Retrieve and verify
const url = await ctx.storage.getUrl(storageId);
```

**Expected Results:**
- ✅ PDF stores successfully
- ✅ Storage URL accessible
- ✅ PDF downloads correctly from storage
- ✅ File integrity maintained

## Visual Quality Testing

### Test 6.1: Cross-Platform Rendering

Test PDFs on different viewers:

- ✅ **Chrome PDF Viewer** - Opens and displays correctly
- ✅ **Firefox PDF Viewer** - All elements visible
- ✅ **Safari PDF Viewer** - Fonts and colors correct
- ✅ **Adobe Acrobat Reader** - Professional appearance
- ✅ **Mobile PDF Viewers** - Readable on phones/tablets
- ✅ **Print Preview** - Prints correctly on paper

### Test 6.2: Template Quality Checklist

For each template:

- ✅ **Typography** - Fonts load correctly, text is readable
- ✅ **Colors** - Brand colors match specification
- ✅ **Spacing** - Proper margins and padding
- ✅ **Alignment** - Elements aligned consistently
- ✅ **Images** - QR codes and logos sharp and clear
- ✅ **Responsiveness** - Scales appropriately for different page sizes

## Regression Testing

### Test 7.1: Old vs New Comparison

**Objective:** Ensure new API Template.io PDFs match old jsPDF output

**Comparison Points:**
- Data accuracy (prices, dates, names)
- Layout completeness (all fields present)
- Visual quality (equal or better)
- File size (reasonable)
- Generation speed (acceptable trade-off)

### Test 7.2: Database Compatibility

**Objective:** Ensure PDFs work with existing database structure

**Test:**
- Generate PDFs for old tickets
- Verify all custom properties accessible
- Confirm no breaking changes in data model

## Production Readiness Checklist

Before deploying to production:

### Environment
- ✅ API_TEMPLATE_IO_KEY configured in production
- ✅ Convex deployment updated
- ✅ Environment variables verified

### Functionality
- ✅ All invoice templates tested
- ✅ All ticket templates tested
- ✅ Edge cases handled gracefully
- ✅ Error handling verified

### Performance
- ✅ Generation speed acceptable
- ✅ Concurrent requests handled
- ✅ API Template.io limits understood

### Monitoring
- ✅ Logging configured for PDF generation
- ✅ Error tracking enabled
- ✅ Usage metrics tracked
- ✅ Cost monitoring active

### Documentation
- ✅ API Template.io integration documented
- ✅ Template customization guide created
- ✅ Testing guide available (this document)
- ✅ Troubleshooting steps documented

## Troubleshooting Guide

### Issue: "API_TEMPLATE_IO_KEY not configured"
**Solution:**
1. Check `.env.local` has the key
2. Restart Convex dev server
3. Verify key is valid on API Template.io dashboard

### Issue: "Template not found"
**Solution:**
1. Check template code matches registry:
   - Invoices: `b2b-professional`, `detailed-breakdown`, `b2c-receipt`
   - Tickets: `modern-ticket`, `elegant-gold`, `vip-premium`
2. Verify template files exist in `convex/lib/pdf_templates/`

### Issue: "Failed to download PDF"
**Solution:**
1. Check API Template.io service status
2. Verify download_url is valid
3. Check network connectivity
4. Ensure sufficient API Template.io credits

### Issue: Missing or incorrect data in PDF
**Solution:**
1. Verify ticket/session data in database
2. Check custom properties are populated
3. Review data transformation in code
4. Test with minimal dataset first

### Issue: QR code not scanning
**Solution:**
1. Verify QR code URL is correct
2. Check QR code size (should be 200x200 minimum)
3. Ensure contrast is sufficient
4. Test with multiple QR code readers

## Test Results Template

Use this template to document your test results:

```markdown
## Test Session: [Date]

**Tester:** [Name]
**Environment:** [Development/Staging/Production]
**API Template.io Account:** [Account ID]

### Invoice Tests
- [ ] B2B Invoice Generation - PASS/FAIL
- [ ] Consolidated Invoice - PASS/FAIL
- [ ] Template Variations - PASS/FAIL
- [ ] Edge Cases - PASS/FAIL

### Ticket Tests
- [ ] Basic Ticket Generation - PASS/FAIL
- [ ] Template Variations - PASS/FAIL
- [ ] Edge Cases - PASS/FAIL

### Performance Tests
- [ ] Generation Speed - [X] seconds (target: <5s)
- [ ] Concurrent Generation - PASS/FAIL

### Integration Tests
- [ ] Email Delivery - PASS/FAIL
- [ ] Storage Integration - PASS/FAIL

### Issues Found
1. [Issue description]
   - Severity: Critical/High/Medium/Low
   - Status: Open/Fixed
   - Notes: [Details]

### Overall Result
- [ ] PASS - Ready for deployment
- [ ] FAIL - Issues must be resolved
```

## Support & Resources

- **API Template.io Docs:** https://docs.apitemplate.io
- **Migration Guide:** [docs/reference_docs/API_TEMPLATE_IO_MIGRATION.md](./API_TEMPLATE_IO_MIGRATION.md)
- **Phase 2 Status:** [docs/reference_docs/PHASE_2_TICKET_PDF_MIGRATION_STATUS.md](./PHASE_2_TICKET_PDF_MIGRATION_STATUS.md)
- **Template Files:** `convex/lib/pdf_templates/`
- **Generator Code:** `convex/lib/generateInvoicePdf.ts` & `convex/lib/generateTicketPdf.ts`

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Status:** Complete for Phase 1 & 2
