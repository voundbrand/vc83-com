# Session Handoff: Invoice PDF & Checkout Fixes

## ✅ What Was Fixed This Session

### 1. Ticket Template Code Mismatch ✅
**Issue:** Seed scripts used `ticket_standard_v1` but registry had `ticket_professional_v1`
**Fix:** Updated `seedTicketPdfTemplate.ts` and `seedSystemDefaultTemplateSet.ts`
**Files:**
- `convex/seedTicketPdfTemplate.ts`
- `convex/seedSystemDefaultTemplateSet.ts`
**Status:** ✅ Committed (f8267e0)

### 2. Transaction Amount Calculation Bug ✅ CRITICAL
**Issue:** Transactions stored NET price in `totalPriceInCents` instead of GROSS
**Impact:** All invoices showed wrong amounts
**Fix:**
- `transactionHelpers.ts:157` - Add tax to totalPriceInCents
- `transactionHelpers.ts:179` - Calculate subtotal from unitPrice × quantity

**Before:**
```typescript
totalPriceInCents: item.totalPrice,  // NET (wrong!)
subtotal = sum(totalPriceInCents)    // Would double-count tax
```

**After:**
```typescript
totalPriceInCents: item.totalPrice + taxAmountInCents,  // GROSS (correct!)
subtotal = sum(unitPriceInCents × quantity)              // Net subtotal
```

**Files:** `convex/transactionHelpers.ts`
**Status:** ✅ Committed (05e5cc0)

### 3. PDF Generation Quantity Bug ✅
**Issue:** Invoice PDF counted purchase items instead of transaction quantity
**Fix:** `pdfGeneration.ts:689-697` - Use `txn.customProperties.quantity`
**Files:** `convex/pdfGeneration.ts`
**Status:** ✅ Committed (f8267e0)

---

## ❌ REMAINING ISSUES - CRITICAL

### Issue #1: Invoice PDF Table Headers Wrong
**Current State:**
```
Beschreibung | Menge | Einzelpreis (Netto) | USt-IdNr. (0%) | Gesamt (Brutto)
                                              ^^^^^^^^
                                              WRONG! Should be "MwSt."
```

**Should Be:**
```
Beschreibung | Menge | Einzelpreis (Netto) | MwSt. (19%) | Gesamt (Brutto)
```

**Location:** Invoice PDF template - `convex/lib/pdf_templates/invoice_b2b_single.ts`

### Issue #2: Invoice PDF Line Items Display Wrong

**Current Display:**
```
Item             Qty   Unit Price    Tax         Total
Amazing Ticket   1     €0.00         €250.80     €0.00
VIP Ticket       1     €120.00       €0.00       €120.00

Subtotal: €0.00
Tax: €250.80
Total: €120.00
```

**Should Display:**
```
Item             Qty   Unit Price    Tax         Total
Amazing Ticket   1     €1,200.00     €228.00     €1,428.00
VIP Ticket       1     €120.00       €22.80      €142.80

Subtotal: €1,320.00
Tax: €250.80
Total: €1,570.80
```

**Root Cause:** Need to verify transaction data is being read correctly in PDF generation

### Issue #3: Tax Line Format Issues
The tax breakdown section is showing wrong format/values.

---

## 🔍 Investigation Needed

### Check Transaction Data
Run this to verify transactions have correct values after the fix:

```bash
npx convex run debugTransaction:debugCheckoutTransactions \
  '{"checkoutSessionId": "YOUR_NEW_CHECKOUT_SESSION_ID"}'
```

Expected transaction structure after fix:
```json
{
  "quantity": 1,
  "unitPriceInCents": 120000,      // €1200 NET
  "taxAmountInCents": 22800,       // €228 tax (19%)
  "totalPriceInCents": 142800,     // €1428 GROSS (unit + tax)
  "taxRatePercent": 19
}
```

---

## 📝 Files Involved

### Fixed Files (Committed):
- ✅ `convex/transactionHelpers.ts` - Transaction calculation
- ✅ `convex/pdfGeneration.ts` - PDF generation quantity fix
- ✅ `convex/seedTicketPdfTemplate.ts` - Template code
- ✅ `convex/seedSystemDefaultTemplateSet.ts` - Template set

### Need Investigation:
- ⏳ `convex/lib/pdf_templates/invoice_b2b_single.ts` - PDF template HTML/CSS
- ⏳ `convex/pdfGeneration.ts:679-716` - Invoice data preparation
- ⏳ `convex/invoiceDataResolver.ts` - Invoice data resolution

### Verification Needed:
- ⏳ Do a fresh checkout and check if transaction data is correct
- ⏳ Check if invoice PDF displays correct amounts
- ⏳ Fix table headers (USt-IdNr → MwSt)
- ⏳ Fix tax line formatting

---

## 🧪 Testing Checklist

### Transaction Creation (After Fresh Checkout):
- [ ] Run debugTransaction query
- [ ] Verify `unitPriceInCents` is NET price
- [ ] Verify `totalPriceInCents` is GROSS (NET + tax)
- [ ] Verify `taxAmountInCents` is correct
- [ ] Verify aggregate totals are correct

### Invoice PDF Display:
- [ ] Table header shows "MwSt." not "USt-IdNr."
- [ ] Line items show correct amounts
- [ ] Tax line shows correct format
- [ ] Subtotal, Tax, Total all correct

### Expected Values (Example):
```
Product: Amazing Ticket (€1200 NET)
- Quantity: 1
- Unit Price: €1,200.00
- Tax (19%): €228.00
- Total: €1,428.00
```

---

## 🚀 Next Steps (Priority Order)

1. **Test Transaction Creation**
   - Do a fresh checkout
   - Verify transaction data is correct with new fix

2. **Fix Invoice PDF Template**
   - Fix table header: USt-IdNr → MwSt
   - Fix tax rate display (show actual %, not hardcoded 0%)
   - Ensure amounts display correctly

3. **Verify PDF Generation**
   - Check pdfGeneration.ts data preparation
   - Ensure values are passed correctly to template

4. **End-to-End Test**
   - Complete checkout
   - Download invoice PDF
   - Verify all amounts match transaction

---

## 💡 Key Insights

### Transaction Structure (After Fix):
```typescript
{
  quantity: 1,
  unitPriceInCents: NET_PRICE,           // Per unit, before tax
  taxAmountInCents: TAX_AMOUNT,          // Total tax for this line
  totalPriceInCents: NET + TAX,          // GROSS total (with tax)
  taxRatePercent: 19,

  // Aggregate totals:
  subtotalInCents: sum(unitPrice × qty), // NET total
  taxAmountInCents: sum(tax),            // Total tax
  totalInCents: subtotal + tax           // GROSS total
}
```

### Invoice Display Formula:
- **Unit Price (Netto):** `unitPriceInCents / 100`
- **Tax per Unit:** `taxAmountInCents / quantity / 100`
- **Total (Brutto):** `totalPriceInCents / quantity / 100`

---

## 📚 Reference Data

### Sample Transaction (Correct):
```json
{
  "productName": "Amazing Ticket",
  "quantity": 1,
  "unitPriceInCents": 120000,    // €1200.00
  "taxAmountInCents": 22800,     // €228.00
  "totalPriceInCents": 142800,   // €1428.00
  "taxRatePercent": 19
}
```

### Sample Invoice Line Item:
```json
{
  "description": "Amazing Ticket",
  "quantity": 1,
  "unitPriceInCents": 120000,
  "taxAmountInCents": 22800,
  "totalPriceInCents": 142800,
  "taxRatePercent": 19,
  "unit_price_formatted": "€1.200,00",
  "tax_amount_formatted": "€228,00",
  "total_price_formatted": "€1.428,00"
}
```

---

## 🎯 Critical Questions to Answer

1. **Are transactions now storing correct values?**
   - Check a fresh checkout after the fix
   - Verify totalPriceInCents = unitPrice + tax

2. **Is pdfGeneration.ts passing correct data?**
   - Check lines 679-716 in pdfGeneration.ts
   - Verify formatted values are calculated correctly

3. **Is the PDF template rendering correctly?**
   - Check invoice_b2b_single.ts template
   - Fix table headers and tax display

---

## 🔗 Git Commits This Session

1. **1bf32f9** - fix: Resolve checkout PDF generation and email delivery issues
2. **f8267e0** - fix: Resolve ticket template and invoice PDF critical bugs
3. **05e5cc0** - fix: CRITICAL - Fix transaction and invoice amount calculations

---

## 📞 Handoff Summary

**Status:** Transaction calculations fixed, but need to verify with fresh checkout and fix PDF display

**Immediate Next Step:** Do a fresh test checkout and verify transaction data is correct

**Critical Issues Remaining:**
1. Invoice PDF table header (USt-IdNr → MwSt)
2. Invoice PDF amounts may still be wrong (need to test)
3. Tax line formatting

**Ready to Continue:** Yes, all code changes committed and Convex dev is running
