# Production Seed Files to Run

After deploying this branch to production, run the following seed files in order:

## 1. PDF Templates (CRITICAL - Run First)
```bash
npx convex run seedPdfTemplates:seedAll
```
**Why**: Updated invoice and ticket templates with:
- Fixed invoice subtotal calculation (multiplies by quantity)
- Grouped tax display by rate (0%, 7%, 19%)
- Optimized VIP ticket template to fit on one page
- Cleaned up standard ticket template (removed borders, organization header)

## 2. Email Templates (IMPORTANT - Run Second)
```bash
npx convex run seedEmailTemplates:seedAll
```
**Why**: Removed invoice line items from email body (now only in PDF attachment)

## 3. Checkout Translations (Optional but Recommended)
```bash
# Payment form translations
npx convex run translations/seedCheckoutTemplate_05b_PaymentForm:seedCheckoutTemplate_05b_PaymentForm

# Confirmation success translations
npx convex run translations/seedCheckoutTemplate_06a_ConfirmationSuccess:seedCheckoutTemplate_06a_ConfirmationSuccess
```
**Why**: Updated translations for behavior-driven checkout flow

## Summary of Changes

### Invoice & Ticket Generation
- **Fixed invoice subtotal bug**: Now correctly multiplies unit price by quantity
- **Tax grouping**: Invoices and checkout now show separate lines for each tax rate
- **Template cleanup**: 
  - VIP ticket fits on one page (reduced spacing, smaller QR code 180px→160px)
  - Standard ticket cleaned up (removed purple borders and organization header)
  - Invoice templates support multiple tax rates

### Email Templates
- Removed redundant invoice details from email body
- Financial details only in PDF attachment

### Checkout Flow
- Product selection step shows taxes grouped by rate
- Review order step shows taxes grouped by rate
- Payment step unchanged (shows total only)

## Testing After Seeding

1. **Test invoice generation**:
   - Order multiple tickets with same product → should create ONE line item with correct quantity
   - Verify subtotal calculation: unit price × quantity
   - Check tax grouping if multiple rates exist

2. **Test ticket generation**:
   - VIP tickets should fit on one page
   - Standard tickets should have no purple borders
   - QR codes should be sized correctly

3. **Test email sending**:
   - Email should NOT contain invoice line items
   - Email should have invoice PDF attached with correct totals
