# Email Sending Flow After Checkout - Complete Analysis

> Generated: 2026-01-19
> Purpose: Document the complete email sending flow to understand discrepancies between preview and actual sends

---

## Executive Summary

This document traces the complete email sending flow after checkout completion, from the initial trigger through to the actual Resend API call. It identifies the key integration points, data flows, and potential discrepancies between preview and send.

**Key Finding:** There are actually TWO different email rendering systems being used:
1. **Order Confirmation Emails** - Uses `orderEmailRenderer.ts` with hardcoded gold (#d4af37) styling
2. **Ticket/Invoice Emails** - Uses the template registry system (`modern-minimal`, `luxury-confirmation`, etc.)

This explains why previews don't match actual emails - they're using different rendering paths.

---

## 1. CHECKOUT COMPLETION FLOW

### 1.1 Entry Point: Checkout Completion

**File:** `convex/checkoutSessions.ts`
**Function:** `completeCheckoutAndFulfill` (Lines 660-1304)

**Key Responsibilities:**
- Verifies payment success
- Creates purchase items and tickets
- Initiates email sending as **STEP 10** (Line 1240-1250)

**Critical Data Extracted from Checkout Session:**
```typescript
// Lines 712-743
const organizationId = session.organizationId;
const customerEmail = session.customProperties?.customerEmail;
const customerName = session.customProperties?.customerName;
const selectedProducts = session.customProperties?.selectedProducts;
const formResponses = session.customProperties?.formResponses;
const behaviorContext = session.customProperties?.behaviorContext;
```

### 1.2 Email Trigger

**Lines:** 1241-1250

```typescript
await ctx.runAction(internal.ticketGeneration.sendOrderConfirmationEmail, {
  checkoutSessionId: args.checkoutSessionId,
  recipientEmail: customerEmail,
  recipientName: customerName,
  includeInvoicePDF, // Determined by payment method
});
```

---

## 2. ORDER CONFIRMATION EMAIL (The Actual Send)

### 2.1 Main Function

**File:** `convex/ticketGeneration.ts`
**Function:** `sendOrderConfirmationEmail` (Lines 384-789)

### 2.2 Email HTML Generation

**CRITICAL:** This uses `orderEmailRenderer.ts`, NOT the template registry!

**File:** `convex/helpers/orderEmailRenderer.ts`
**Function:** `generateOrderConfirmationHtml` (Lines 59-162)

```typescript
{
  recipientName: string;
  eventName: string;
  eventSponsors?: Array<{ name: string; level?: string }>;
  eventLocation?: string;
  formattedDate: string;
  ticketCount: number;
  orderNumber: string;
  orderDate: string;
  primaryColor?: string; // Default: #d4af37 (gold) - HARDCODED!
  organizationName?: string;
}
```

**This is why emails look different from previews - the order confirmation uses a completely different renderer with hardcoded gold styling!**

---

## 3. TICKET CONFIRMATION EMAIL (Manual Resend)

For manually sending ticket confirmation emails to individual tickets:

**File:** `convex/ticketEmailService.ts`
**Function:** `sendTicketConfirmationEmail` (Lines 22-431)

### Key Differences from Order Confirmation:

1. **Uses Template Registry** - Actually calls `getEmailTemplate(templateCode)`
2. **Uses emailTemplateRenderer** - Proper template resolution chain
3. **Default Template:** `modern-minimal` (purple #6B46C1)

```typescript
const templateFn = getEmailTemplate(templateCode);
const { html: emailHtml, subject } = templateFn(templateData);
```

---

## 4. INVOICE EMAILS

**File:** `convex/invoiceEmailService.ts`

Uses `InvoiceB2BEmailTemplate` or `InvoiceB2CEmailTemplate` from template registry.

---

## 5. THE ROOT CAUSE OF DISCREPANCIES

### Preview Shows:
- Template from registry (e.g., `modern-minimal` with purple)
- Uses `getEmailTemplate()` function
- Renders through React component templates

### Actual Order Confirmation Sends:
- Uses `orderEmailRenderer.ts` (hardcoded gold theme)
- Does NOT use template registry
- Completely different HTML structure

### Ticket Confirmation (Manual Resend):
- DOES use template registry
- Matches preview styling
- But rarely used (only for manual resends)

---

## 6. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│ CHECKOUT COMPLETION TRIGGERED                               │
│ completeCheckoutAndFulfill (checkoutSessions.ts:660)        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ SEND ORDER CONFIRMATION EMAIL                               │
│ sendOrderConfirmationEmail (ticketGeneration.ts:384)        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────────────┐
   │ generateOrderConfirmationHtml           │
   │ (orderEmailRenderer.ts)                 │
   │                                         │
   │ ⚠️  HARDCODED GOLD THEME (#d4af37)      │
   │ ⚠️  DOES NOT USE TEMPLATE REGISTRY      │
   └────────────────┬────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │ Send via Resend API          │
         │ emailDelivery.sendEmail      │
         └──────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│ TEMPLATE PREVIEW (UI)                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────────────┐
   │ getEmailTemplate(templateCode)          │
   │ (registry.ts)                           │
   │                                         │
   │ ✅ Uses template registry               │
   │ ✅ Uses branding colors                 │
   │ ✅ Modern-minimal, luxury-confirmation  │
   └─────────────────────────────────────────┘
```

---

## 7. FILE REFERENCE GUIDE

### Order Confirmation (ACTUAL SEND)
| Purpose | File | Lines |
|---------|------|-------|
| Trigger | `convex/checkoutSessions.ts` | 1241-1250 |
| Main function | `convex/ticketGeneration.ts` | 384-789 |
| HTML renderer | `convex/helpers/orderEmailRenderer.ts` | 59-175 |
| Email delivery | `convex/emailDelivery.ts` | 13-138 |

### Ticket Confirmation (MANUAL RESEND)
| Purpose | File | Lines |
|---------|------|-------|
| Send | `convex/ticketEmailService.ts` | 22-431 |
| Preview | `convex/ticketEmailService.ts` | 437-515 |
| Template resolver | `convex/emailTemplateRenderer.ts` | 152-200 |

### Invoice Emails
| Purpose | File | Lines |
|---------|------|-------|
| Send | `convex/invoiceEmailService.ts` | 183-569 |
| Preview | `convex/invoiceEmailService.ts` | 24-178 |
| Data resolver | `convex/invoiceDataResolver.ts` | - |

### Email Templates (Registry)
| Template | File |
|----------|------|
| Modern Minimal | `src/templates/emails/modern-minimal/index.tsx` |
| Luxury Confirmation | `src/templates/emails/luxury-confirmation/index.tsx` |
| Invoice B2B | `src/templates/emails/invoice-b2b/index.tsx` |
| Registry | `src/templates/emails/registry.ts` |

---

## 8. RECOMMENDATIONS TO FIX

### Option A: Unify on Template Registry (Recommended)

Replace `orderEmailRenderer.ts` with template registry usage:

1. Modify `sendOrderConfirmationEmail` to use `getEmailTemplate()`
2. Pass proper branding colors from organization settings
3. Use the same resolution chain as ticket emails

**Pros:**
- Preview matches send
- Uses organization branding
- Leverages existing template system

**Cons:**
- Requires modifying working code
- Need to ensure all checkout data maps correctly

### Option B: Create Dedicated Order Template

Add a new template to registry specifically for order confirmations:

1. Create `src/templates/emails/order-confirmation/index.tsx`
2. Register in `registry.ts`
3. Update `sendOrderConfirmationEmail` to use it

**Pros:**
- Isolates order email concerns
- Can optimize for checkout session data structure

### Option C: Fix orderEmailRenderer to Use Branding

Make `orderEmailRenderer.ts` configurable:

1. Accept `primaryColor` from organization branding
2. Add template selection logic
3. Keep separate from ticket emails

**Pros:**
- Minimal changes
- Keeps systems separate

**Cons:**
- Still two parallel systems
- Preview won't match without additional work

---

## 9. IMMEDIATE FIX: Gold Color Issue

The quickest fix to remove the gold styling:

**File:** `convex/helpers/orderEmailRenderer.ts`
**Line:** ~70

Change:
```typescript
const primaryColor = args.primaryColor || '#d4af37'; // Gold
```

To:
```typescript
const primaryColor = args.primaryColor || '#6B46C1'; // Professional purple (matches PDFs)
```

Or better, pass the organization's branding color from the caller.

---

## 10. CHECKOUT SESSION DATA AVAILABLE

For reference, here's what data is available in the checkout session for email generation:

```typescript
customProperties: {
  // Customer
  customerEmail: string;
  customerName: string;
  customerPhone?: string;

  // Event
  eventName: string;
  eventSponsors?: Array<{ name: string; level?: string }>;
  eventDate?: string;       // or startDate, eventStartDate
  eventLocation?: string;

  // Products
  selectedProducts: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    customProperties?: any;
  }>;

  // Forms
  formResponses?: Record<string, any>;

  // Behavior
  behaviorContext?: {
    isEmployerBilling?: boolean;
    employerId?: string;
    taxBehavior?: any;
  };

  // Config
  domainConfigId?: string;
  checkoutInstanceId?: string;
}
```

---

## 11. NEXT STEPS

1. **Decide on approach** (A, B, or C above)
2. **Update orderEmailRenderer** or replace with template registry
3. **Test with real checkout** to verify emails match previews
4. **Update preview UI** if needed to show correct template
5. **Document template selection** for customer configuration
