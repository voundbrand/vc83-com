# Frontend Checkout Integration Guide

## Overview

This document explains how your frontend registration form should integrate with the checkout system for event registrations, supporting **free events**, **paid events (Stripe)**, **manual invoices (B2B/B2C)**, and **auto-detected employer billing**.

---

## Payment Methods Supported

| Payment Method | `paymentIntentId` | Use Case |
|----------------|-------------------|----------|
| **Free** | `"free"` | Free events, no payment required |
| **Stripe** | `"pi_abc123..."` | Credit card payments |
| **Manual Invoice** | `"invoice"` or `"inv_xyz"` | B2B/B2C pay-later invoices |
| **Auto Employer** | Auto-detected | Employer billing (via behaviors) |

---

## API Endpoints

Base URL: `https://your-deployment.convex.site`

### 1. Create Checkout Session
```
POST /api/v1/checkout/sessions
```

### 2. Confirm Payment & Fulfill
```
POST /api/v1/checkout/confirm
```

---

## Complete Integration Examples

### **Example 1: Free Event Registration**

```typescript
// 1. Collect registration form data
const registrationData = {
  firstName: 'Hans',
  lastName: 'Schmidt',
  email: 'hans.schmidt@hospital.com',
  phone: '+49123456789',
  organization: 'University Hospital Berlin',
  attendee_category: 'internal',
  dietary_requirements: 'vegetarian',
  consent_privacy: true,
};

// 2. Create checkout session
const createSessionResponse = await fetch(`${CONVEX_URL}/api/v1/checkout/sessions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${YOUR_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    organizationId: 'your_org_id',
    checkoutInstanceId: 'your_checkout_instance_id',

    // Products
    productIds: ['event_ticket_product_id'],
    quantities: [1],

    // Customer info
    customerEmail: registrationData.email,
    customerName: `${registrationData.firstName} ${registrationData.lastName}`,
    customerPhone: registrationData.phone,

    // Form responses (ALL registration data)
    formResponses: [{
      productId: 'event_ticket_product_id',
      ticketNumber: 1,
      formId: 'event_registration_form_id',
      responses: registrationData,
      addedCosts: 0,
    }],

    // Payment method
    paymentMethod: 'free', // ✅ FREE REGISTRATION
  })
});

const { checkoutSessionId, requiresPayment } = await createSessionResponse.json();

// 3. Free events: immediately complete checkout (no payment)
if (!requiresPayment) {
  const confirmResponse = await fetch(`${CONVEX_URL}/api/v1/checkout/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${YOUR_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkoutSessionId,
      paymentIntentId: 'free', // ✅ Special marker for free registrations
    })
  });

  const result = await confirmResponse.json();

  if (result.success) {
    showConfirmationModal({
      ticketIds: result.purchasedItemIds,
      contactId: result.crmContactId,
      email: registrationData.email,
      invoiceType: result.invoiceType, // 'none' for free
      isGuestRegistration: result.isGuestRegistration,
      frontendUserId: result.frontendUserId,
    });
  }
}
```

---

### **Example 2: Paid Registration (Stripe)**

```typescript
// 1-2. Create session (same as Example 1, but paymentMethod: 'stripe')

const createSessionResponse = await fetch(`${CONVEX_URL}/api/v1/checkout/sessions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${YOUR_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    // ... same as Example 1 ...
    paymentMethod: 'stripe', // ✅ STRIPE PAYMENT
  })
});

const { checkoutSessionId, clientSecret, requiresPayment } = await createSessionResponse.json();

// 3. Show Stripe payment UI
if (requiresPayment && clientSecret) {
  const stripe = await loadStripe('pk_...');
  const elements = stripe.elements({ clientSecret });
  const paymentElement = elements.create('payment');
  paymentElement.mount('#payment-element');

  // Handle payment submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Confirm payment with Stripe
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/registration/success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      showError(error.message);
      return;
    }

    // 4. Complete checkout with Stripe payment intent
    const confirmResponse = await fetch(`${CONVEX_URL}/api/v1/checkout/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOUR_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkoutSessionId,
        paymentIntentId: paymentIntent.id, // ✅ Stripe payment intent ID
      })
    });

    const result = await confirmResponse.json();

    if (result.success) {
      showConfirmationModal({
        ticketIds: result.purchasedItemIds,
        contactId: result.crmContactId,
        email: registrationData.email,
        amountPaid: result.amount,
        currency: result.currency,
        invoiceType: result.invoiceType, // 'receipt'
        isGuestRegistration: result.isGuestRegistration,
      });
    }
  };
}
```

---

### **Example 3: Manual Invoice (B2B or B2C)**

```typescript
// Use when customer requests "pay later" via invoice
// B2B: Company pays later
// B2C: Individual pays later

const registrationData = {
  firstName: 'Maria',
  lastName: 'Weber',
  email: 'maria.weber@company.com',
  phone: '+49987654321',

  // B2B fields (optional - determines invoice type)
  companyName: 'ACME Corporation', // If present → B2B invoice
  vatNumber: 'DE123456789',
  billing_street: 'Hauptstraße 1',
  billing_city: 'Berlin',
  billing_postal_code: '10115',
  billing_country: 'Germany',
};

// Create session with invoice payment method
const createSessionResponse = await fetch(`${CONVEX_URL}/api/v1/checkout/sessions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${YOUR_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    organizationId: 'your_org_id',
    checkoutInstanceId: 'your_checkout_instance_id',

    productIds: ['event_ticket_product_id'],
    quantities: [1],

    customerEmail: registrationData.email,
    customerName: `${registrationData.firstName} ${registrationData.lastName}`,
    customerPhone: registrationData.phone,

    // B2B fields (if company invoice)
    transactionType: 'B2B', // or 'B2C'
    companyName: registrationData.companyName,
    vatNumber: registrationData.vatNumber,
    billingAddress: {
      line1: registrationData.billing_street,
      city: registrationData.billing_city,
      postalCode: registrationData.billing_postal_code,
      country: registrationData.billing_country,
    },

    formResponses: [{
      productId: 'event_ticket_product_id',
      ticketNumber: 1,
      responses: registrationData,
      addedCosts: 0,
    }],

    paymentMethod: 'invoice', // ✅ MANUAL INVOICE
  })
});

const { checkoutSessionId, requiresPayment } = await createSessionResponse.json();

// Invoice payments don't require immediate payment UI
// Backend will generate invoice PDF and send it via email
const confirmResponse = await fetch(`${CONVEX_URL}/api/v1/checkout/confirm`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${YOUR_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    checkoutSessionId,
    paymentIntentId: `invoice`, // ✅ or generate unique ID: `inv_${Date.now()}`
  })
});

const result = await confirmResponse.json();

if (result.success) {
  showConfirmationModal({
    ticketIds: result.purchasedItemIds,
    contactId: result.crmContactId,
    email: registrationData.email,
    invoiceType: result.invoiceType, // 'manual_b2b' or 'manual_b2c'
    message: result.invoiceType === 'manual_b2b'
      ? 'Invoice sent to your company email'
      : 'Invoice sent to your email. Payment due within 30 days.',
    isGuestRegistration: result.isGuestRegistration,
  });
}
```

---

### **Example 4: Employer Invoice (Auto-detected)**

```typescript
// Same as free registration, but employer auto-detection triggers invoice

const registrationData = {
  firstName: 'Thomas',
  lastName: 'Müller',
  email: 'thomas.mueller@hospital.com',
  phone: '+49123456789',
  organization: 'HaffNet Hospital',
  attendee_category: 'external', // ✅ Triggers employer detection
};

// Create session with free/stripe payment method
// Backend behaviors will detect employer and override payment
const createSessionResponse = await fetch(`${CONVEX_URL}/api/v1/checkout/sessions`, {
  method: 'POST',
  body: JSON.stringify({
    // ... standard fields ...
    paymentMethod: 'free', // Will be overridden by employer detection
    formResponses: [{
      productId: 'event_ticket_product_id',
      ticketNumber: 1,
      responses: registrationData, // attendee_category triggers detection
    }],
  })
});

// Confirm immediately (no payment UI)
const confirmResponse = await fetch(`${CONVEX_URL}/api/v1/checkout/confirm`, {
  method: 'POST',
  body: JSON.stringify({
    checkoutSessionId,
    paymentIntentId: 'free', // Backend will handle employer billing
  })
});

const result = await confirmResponse.json();

if (result.success) {
  showConfirmationModal({
    ticketIds: result.purchasedItemIds,
    contactId: result.crmContactId,
    email: registrationData.email,
    invoiceType: result.invoiceType, // 'employer'
    message: 'Your employer will be invoiced. Confirmation sent to your email.',
    isGuestRegistration: result.isGuestRegistration,
  });
}
```

---

## Response Format

### Confirm Response (Updated)
```json
{
  "success": true,
  "purchasedItemIds": ["ticket_id_1"],
  "crmContactId": "contact_xyz",
  "paymentId": "free", // or "pi_xyz" or "invoice" or "inv_123"
  "amount": 0, // 0 for free, invoice amount for others
  "currency": "EUR",

  // ✅ NEW FIELDS
  "isGuestRegistration": true,
  "frontendUserId": "frontend_user_xyz",
  "invoiceType": "none" // or "receipt", "manual_b2b", "manual_b2c", "employer"
}
```

### Invoice Type Meanings

| Invoice Type | Description | Email Behavior |
|--------------|-------------|----------------|
| `none` | Free registration | Confirmation only |
| `receipt` | Stripe payment | Receipt/invoice PDF attached |
| `manual_b2b` | B2B pay-later | Invoice PDF sent to company |
| `manual_b2c` | B2C pay-later | Invoice PDF sent to individual |
| `employer` | Auto-detected employer | Consolidated invoice to employer (no immediate PDF) |

---

## Confirmation Modal

Show different messages based on `invoiceType`:

```typescript
function showConfirmationModal(result) {
  const messages = {
    none: {
      title: '✅ Registration Successful!',
      message: 'Confirmation email sent with your ticket.',
    },
    receipt: {
      title: '✅ Payment Successful!',
      message: `Paid ${formatCurrency(result.amount, result.currency)}. Receipt sent to ${result.email}.`,
    },
    manual_b2b: {
      title: '✅ Registration Complete!',
      message: `Invoice sent to ${result.companyName}. Payment due per your payment terms.`,
    },
    manual_b2c: {
      title: '✅ Registration Complete!',
      message: 'Invoice sent to your email. Payment due within 30 days.',
    },
    employer: {
      title: '✅ Registration Complete!',
      message: 'Your employer will be invoiced. Confirmation sent to your email.',
    },
  };

  const config = messages[result.invoiceType];

  return (
    <Modal>
      <h2>{config.title}</h2>
      <p>{config.message}</p>

      {/* Guest account activation offer */}
      {result.isGuestRegistration && (
        <div className="account-activation">
          <p>💡 Want to track your registrations?</p>
          <button onClick={() => showActivationForm(result.email)}>
            Create Account
          </button>
        </div>
      )}

      {/* Download links */}
      <div className="downloads">
        <a href={`/api/v1/tickets/download/${result.purchasedItemIds[0]}`}>
          📄 Download Ticket
        </a>
        {(result.invoiceType === 'receipt' || result.invoiceType.includes('manual')) && (
          <a href={`/api/v1/invoices/download/${result.checkoutSessionId}`}>
            📄 Download Invoice
          </a>
        )}
      </div>
    </Modal>
  );
}
```

---

## Account Activation (Guest → Active)

If `isGuestRegistration: true`, offer account activation:

```typescript
async function activateGuestAccount(email: string, password: string) {
  const response = await fetch(`${CONVEX_URL}/api/v1/auth/activate-account`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    })
  });

  const result = await response.json();

  if (result.success) {
    // Account activated! User can now login
    showMessage('Account activated! You can now login to view your tickets.');
    redirectToLogin();
  }
}
```

---

## Payment Method Selection UI

Let users choose their payment method:

```typescript
function PaymentMethodSelector({ onSelect }) {
  return (
    <div className="payment-methods">
      <h3>Payment Method</h3>

      {/* Free event - no selection needed */}
      {isFreeEvent && (
        <div className="method free">
          <input type="radio" checked disabled />
          <label>Free Registration</label>
        </div>
      )}

      {/* Paid event - show options */}
      {!isFreeEvent && (
        <>
          <div className="method stripe">
            <input
              type="radio"
              name="payment"
              value="stripe"
              onChange={e => onSelect(e.target.value)}
            />
            <label>💳 Credit Card</label>
          </div>

          <div className="method invoice">
            <input
              type="radio"
              name="payment"
              value="invoice"
              onChange={e => onSelect(e.target.value)}
            />
            <label>📄 Invoice (Pay Later)</label>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## Error Handling

```typescript
try {
  const response = await fetch(endpoint, options);
  const data = await response.json();

  if (!response.ok) {
    // Handle specific errors
    switch (response.status) {
      case 400:
        showError(data.error || 'Invalid request');
        break;
      case 401:
        showError('Authentication failed. Check your API key.');
        break;
      case 402:
        showError('Payment failed: ' + data.details);
        break;
      case 404:
        showError('Checkout session not found or expired');
        break;
      default:
        showError('Registration failed. Please try again.');
    }
    return;
  }

  // Success
  handleSuccess(data);
} catch (error) {
  showError('Network error. Please check your connection.');
}
```

---

## Testing Checklist

### Free Registration
- [ ] Create session with `paymentMethod: 'free'`
- [ ] Confirm with `paymentIntentId: 'free'`
- [ ] Verify: No payment, tickets created, email sent
- [ ] Verify: `invoiceType: 'none'`
- [ ] Verify: `isGuestRegistration: true`

### Stripe Payment
- [ ] Create session with `paymentMethod: 'stripe'`
- [ ] Show Stripe Elements UI
- [ ] Confirm with `paymentIntentId: 'pi_...'`
- [ ] Verify: Payment processed, receipt sent
- [ ] Verify: `invoiceType: 'receipt'`

### Manual B2B Invoice
- [ ] Create session with `paymentMethod: 'invoice'` + company fields
- [ ] Confirm with `paymentIntentId: 'invoice'`
- [ ] Verify: Invoice PDF generated and sent
- [ ] Verify: `invoiceType: 'manual_b2b'`
- [ ] Verify: CRM organization created

### Manual B2C Invoice
- [ ] Create session with `paymentMethod: 'invoice'` (no company)
- [ ] Confirm with `paymentIntentId: 'invoice'`
- [ ] Verify: Invoice PDF sent to individual
- [ ] Verify: `invoiceType: 'manual_b2c'`

### Employer Auto-Detection
- [ ] Register with `attendee_category: 'external'`
- [ ] Verify: Employer detected
- [ ] Verify: `invoiceType: 'employer'`
- [ ] Verify: No immediate invoice PDF (consolidated later)

---

## Migration Checklist

- [ ] Update API integration from workflow API to checkout API
- [ ] Implement free registration flow
- [ ] Implement Stripe payment flow
- [ ] Implement manual invoice flow (B2B/B2C)
- [ ] Add payment method selector UI
- [ ] Update confirmation modal for all invoice types
- [ ] Add guest account activation offer
- [ ] Handle new response fields (`isGuestRegistration`, `invoiceType`)
- [ ] Test all payment flows on staging
- [ ] Deploy to production

---

## Support

If you encounter issues:
1. Check [SESSION_HANDOFF_CHECKOUT_ENHANCEMENT.md](./reference_docs/SESSION_HANDOFF_CHECKOUT_ENHANCEMENT.md) for backend details
2. Verify API key and organizationId are correct
3. Check Convex logs for detailed error messages
4. Review request/response formats in this document

---

## What Gets Created?

When registration completes, the system creates:

1. **CRM Contact** - Customer record with email, name, phone
2. **Frontend User** (dormant) - Guest account that can be activated
3. **B2B Organization** - If employer detected or B2B transaction
4. **Event Ticket** - With QR code for check-in
5. **Transaction** - Payment record (even if free)
6. **Purchase Items** - Generic purchase records
7. **Form Response** - Audit trail of registration data
8. **Invoice** - If manual B2B/B2C or employer billing
9. **Confirmation Email** - Sent with ticket PDF attached

All records are linked via `frontendUserId` for easy tracking!

---

## Next Steps

1. Review backend implementation: [SESSION_HANDOFF_CHECKOUT_ENHANCEMENT.md](./reference_docs/SESSION_HANDOFF_CHECKOUT_ENHANCEMENT.md)
2. Implement frontend flows from this guide
3. Test all payment methods thoroughly
4. Deploy and monitor

Good luck! 🚀
