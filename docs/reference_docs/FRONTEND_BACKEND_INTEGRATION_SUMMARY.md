# Frontend ↔️ Backend Integration Summary

## 🎯 Quick Reference

Your **frontend** sends data to your **backend** via HTTP endpoints. Here's what you need to know:

---

## 📊 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/checkout/sessions` | POST | Create checkout session |
| `/api/v1/checkout/confirm` | POST | Complete checkout & fulfill |
| `/api/v1/checkout/config` | GET | Get Stripe config (optional) |

**Base URL**: `https://agreeable-lion-828.convex.site`

---

## 🔑 Key Differences: Frontend Docs vs Actual Backend

### ✅ What Your Backend Actually Expects

Your backend API is **simpler** than the frontend docs suggest:

#### 1. **No `checkoutInstanceId` Required** (Optional)
- **Frontend docs say**: Required field
- **Backend reality**: Optional - backend can work without it
- **Recommendation**: Include it if you have it, omit if not

#### 2. **Payment Method is Simple**
- **Frontend sends**: `"free"` | `"stripe"` | `"invoice"`
- **Backend expects**: Same - perfect match! ✅

#### 3. **No Separate Billing Fields in Main Payload**
- **Frontend docs show**: Top-level billing fields
- **Backend expects**: Billing address only for B2B (in `billingAddress` object)
- **Fix**: Move billing fields into nested `billingAddress` object

---

## 📦 Correct Payload Structure

### What Your Frontend Should Send

```typescript
// POST /api/v1/checkout/sessions
{
  // CORE FIELDS
  "organizationId": "j97abc123",
  "checkoutInstanceId": "k123abc",  // Optional but recommended
  "productIds": ["m456def"],
  "quantities": [1],

  // CUSTOMER
  "customerEmail": "john@example.com",
  "customerName": "John Doe",
  "customerPhone": "+49123456789",

  // PAYMENT
  "paymentMethod": "free" | "stripe" | "invoice",

  // REGISTRATION DATA
  "formResponses": [
    {
      "productId": "m456def",
      "ticketNumber": 1,
      "formId": "event_registration",  // Optional
      "responses": {
        // YOUR CUSTOM FORM FIELDS GO HERE
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "organization": "ACME Corp",
        "attendee_category": "internal",
        // ... any other fields
      },
      "addedCosts": 0
    }
  ],

  // B2B ONLY (if invoice payment)
  "transactionType": "B2B",        // Omit for B2C
  "companyName": "ACME Corp",
  "vatNumber": "DE123456789",
  "billingAddress": {              // ✅ NESTED OBJECT
    "line1": "Hauptstraße 1",
    "city": "Berlin",
    "postalCode": "10115",
    "country": "Germany"
  }
}
```

---

## 🔄 Complete Flow

### Flow 1: Free Event ✅ Simplest

```typescript
// 1️⃣ CREATE SESSION
POST /api/v1/checkout/sessions
{
  organizationId: "...",
  checkoutInstanceId: "...",
  productIds: ["..."],
  quantities: [1],
  customerEmail: "...",
  customerName: "...",
  paymentMethod: "free",  // ✅ NO PAYMENT NEEDED
  formResponses: [...]
}

// RESPONSE
{
  checkoutSessionId: "k789xyz",
  requiresPayment: false,  // ✅ NO PAYMENT UI NEEDED
  amount: 0,
  currency: "eur"
}

// 2️⃣ IMMEDIATE CONFIRM (no payment UI)
POST /api/v1/checkout/confirm
{
  checkoutSessionId: "k789xyz",
  paymentIntentId: "free"  // ✅ SPECIAL MARKER
}

// RESPONSE
{
  success: true,
  purchasedItemIds: ["ticket_123"],
  invoiceType: "none",  // ✅ NO INVOICE
  isGuestRegistration: true
}
```

---

### Flow 2: Stripe Payment 💳

```typescript
// 1️⃣ CREATE SESSION
POST /api/v1/checkout/sessions
{
  organizationId: "...",
  productIds: ["..."],
  quantities: [1],
  customerEmail: "...",
  customerName: "...",
  paymentMethod: "stripe",  // ✅ STRIPE PAYMENT
  formResponses: [...]
}

// RESPONSE
{
  checkoutSessionId: "k789xyz",
  clientSecret: "pi_abc123_secret_xyz",  // ✅ FOR STRIPE ELEMENTS
  requiresPayment: true,
  amount: 5000,  // EUR 50.00
  currency: "eur"
}

// 2️⃣ SHOW STRIPE UI
const stripe = await loadStripe('pk_...');
const elements = stripe.elements({ clientSecret });
const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

// 3️⃣ USER SUBMITS PAYMENT
const { paymentIntent } = await stripe.confirmPayment({ elements });

// 4️⃣ CONFIRM WITH BACKEND
POST /api/v1/checkout/confirm
{
  checkoutSessionId: "k789xyz",
  paymentIntentId: paymentIntent.id  // ✅ FROM STRIPE
}

// RESPONSE
{
  success: true,
  purchasedItemIds: ["ticket_123"],
  amount: 5000,
  invoiceType: "receipt",  // ✅ RECEIPT SENT
  downloadUrls: {
    tickets: "https://.../tickets/k789xyz/download"
  }
}
```

---

### Flow 3: Manual Invoice (B2B) 📄

```typescript
// 1️⃣ CREATE SESSION WITH B2B DATA
POST /api/v1/checkout/sessions
{
  organizationId: "...",
  productIds: ["..."],
  customerEmail: "...",
  customerName: "...",
  paymentMethod: "invoice",  // ✅ INVOICE PAYMENT

  // B2B FIELDS ✅
  transactionType: "B2B",
  companyName: "ACME Corp",
  vatNumber: "DE123456789",
  billingAddress: {  // ✅ NESTED!
    line1: "Hauptstraße 1",
    city: "Berlin",
    postalCode: "10115",
    country: "Germany"
  },

  formResponses: [...]
}

// RESPONSE
{
  checkoutSessionId: "k789xyz",
  requiresPayment: false,  // ✅ NO IMMEDIATE PAYMENT
  amount: 5000,
  currency: "eur"
}

// 2️⃣ IMMEDIATE CONFIRM
POST /api/v1/checkout/confirm
{
  checkoutSessionId: "k789xyz",
  paymentIntentId: "invoice"  // ✅ INVOICE MARKER
}

// RESPONSE
{
  success: true,
  purchasedItemIds: ["ticket_123"],
  invoiceType: "manual_b2b",  // ✅ B2B INVOICE SENT
  crmContactId: "contact_xyz",
  downloadUrls: {
    invoice: "https://.../invoices/k789xyz/download"
  }
}
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Wrong: Billing fields at top level
```typescript
{
  organizationId: "...",
  billing_street: "Hauptstraße 1",  // ❌ DON'T DO THIS
  billing_city: "Berlin",
  billing_postal_code: "10115"
}
```

### ✅ Correct: Billing fields nested
```typescript
{
  organizationId: "...",
  billingAddress: {  // ✅ NESTED OBJECT
    line1: "Hauptstraße 1",
    city: "Berlin",
    postalCode: "10115",
    country: "Germany"
  }
}
```

---

### ❌ Wrong: Sending checkoutSessionId in create
```typescript
// DON'T include checkoutSessionId in CREATE request
POST /api/v1/checkout/sessions
{
  checkoutSessionId: "k789xyz",  // ❌ WRONG - this is generated by backend
  organizationId: "..."
}
```

### ✅ Correct: Receive it in response
```typescript
// Backend RETURNS checkoutSessionId
RESPONSE
{
  checkoutSessionId: "k789xyz",  // ✅ USE THIS IN CONFIRM
  clientSecret: "..."
}
```

---

## 📋 Integration Checklist

### Before You Start
- [ ] Get API key from backend team
- [ ] Get `organizationId` from backend
- [ ] Get `checkoutInstanceId` for your event
- [ ] Get `productId` for your event ticket

### Implementation
- [ ] Create session with correct payload structure
- [ ] Handle `requiresPayment` flag correctly
- [ ] For Stripe: Show payment UI only if `clientSecret` present
- [ ] For free: Skip directly to confirm
- [ ] For invoice: Skip directly to confirm
- [ ] Send correct `paymentIntentId` in confirm request

### Testing
- [ ] Test free event registration
- [ ] Test Stripe payment flow
- [ ] Test B2B invoice flow
- [ ] Test B2C invoice flow
- [ ] Verify guest user creation
- [ ] Check invoice types in responses

---

## 🔍 Debugging Tips

### Check Your Payload
```typescript
// Before sending, log your payload
console.log('Creating session with:', JSON.stringify(payload, null, 2));

// Check response
console.log('Session created:', response);
```

### Verify Field Names
- ✅ `customerEmail` (not `customer_email`)
- ✅ `customerName` (not `customer_name`)
- ✅ `productIds` (array, not singular)
- ✅ `quantities` (array, matches productIds length)
- ✅ `paymentMethod` (not `payment_method`)
- ✅ `billingAddress` (nested object, not top-level fields)

### Check HTTP Status Codes
- `200`: Success ✅
- `400`: Bad request (check payload structure)
- `401`: Invalid API key
- `404`: Product/checkout instance not found
- `500`: Server error (contact backend team)

---

## 💡 Quick Tips

1. **Start with free events** - Simplest flow, no payment UI needed
2. **Use TypeScript types** - Copy from [API_PAYLOAD_STRUCTURE.md](./api/api-payload-structure.md)
3. **Test with Postman first** - Verify payloads before implementing in frontend
4. **Check invoice types** - Different flows return different `invoiceType` values
5. **Guest users always created** - Every registration creates a dormant user account

---

## 📞 Support

**Backend Documentation**:
- [Complete API Spec](./api/api-payload-structure.md) ⭐ **Read this first!**
- [Frontend Integration Guide](./frontend/frontend-checkout-integration.md)
- [Team Q&A](./frontend/frontend-team-answers.md)

**Quick Reference**:
- **Backend Repo**: `/Users/foundbrand_001/Development/vc83-com`
- **Frontend Repo**: `/Users/foundbrand_001/Development/haffnet-l4yercak3`
- **API Base URL**: `https://agreeable-lion-828.convex.site`

---

## 🎯 Next Steps

1. ✅ **Read this summary** (you are here!)
2. ✅ **Review [API_PAYLOAD_STRUCTURE.md](./api/api-payload-structure.md)** for complete examples
3. ✅ **Copy TypeScript types** from the API spec
4. ✅ **Test with Postman** to verify payloads
5. ✅ **Implement in frontend** following the examples
6. ✅ **Test all payment flows** (free, Stripe, invoice)

Good luck! 🚀
