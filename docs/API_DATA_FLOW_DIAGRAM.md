# API Data Flow Diagram

## 🔄 Visual Data Flow: Frontend → Backend

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND APPLICATION                            │
│                    (haffnet-l4yercak3/src)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1. User fills registration form
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  REGISTRATION FORM DATA                                                  │
│  ─────────────────────────                                              │
│  • firstName, lastName, email                                           │
│  • organization, phone                                                   │
│  • attendee_category (internal/external)                                │
│  • dietary_requirements                                                  │
│  • consent_privacy                                                       │
│  • ... (any custom fields)                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 2. Frontend prepares API payload
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API REQUEST PAYLOAD (POST /api/v1/checkout/sessions)                   │
│  ───────────────────────────────────────────────────────                │
│  {                                                                       │
│    organizationId: "j97abc123",       ← Your platform org ID           │
│    checkoutInstanceId: "k123abc",     ← Event checkout config          │
│    productIds: ["m456def"],           ← Event ticket product           │
│    quantities: [1],                   ← Number of tickets              │
│                                                                          │
│    customerEmail: "john@example.com", ← From form                      │
│    customerName: "John Doe",          ← From form                      │
│    customerPhone: "+49123456789",     ← From form                      │
│                                                                          │
│    paymentMethod: "free",             ← "free" | "stripe" | "invoice"  │
│                                                                          │
│    formResponses: [                   ← ALL FORM DATA GOES HERE        │
│      {                                                                   │
│        productId: "m456def",          ← Matches productIds[0]          │
│        ticketNumber: 1,               ← Sequential (1, 2, 3...)        │
│        formId: "event_registration",  ← Optional form template         │
│        responses: {                   ← ✅ YOUR CUSTOM FORM DATA       │
│          firstName: "John",                                             │
│          lastName: "Doe",                                               │
│          email: "john@example.com",                                     │
│          organization: "ACME Corp",                                     │
│          attendee_category: "internal",                                 │
│          dietary_requirements: "vegetarian",                            │
│          consent_privacy: true                                          │
│        },                                                                │
│        addedCosts: 0                  ← Dynamic pricing (cents)        │
│      }                                                                   │
│    ],                                                                    │
│                                                                          │
│    // B2B ONLY (if invoice payment)                                     │
│    transactionType: "B2B",            ← Triggers B2B invoice           │
│    companyName: "ACME Corp",                                            │
│    vatNumber: "DE123456789",                                            │
│    billingAddress: {                  ← ✅ NESTED OBJECT               │
│      line1: "Hauptstraße 1",                                            │
│      city: "Berlin",                                                     │
│      postalCode: "10115",                                               │
│      country: "Germany"                                                  │
│    }                                                                     │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 3. HTTPS POST with Bearer token
                                    │    Authorization: Bearer org_j97abc...
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          BACKEND API ENDPOINT                            │
│              https://agreeable-lion-828.convex.site                     │
│                  /api/v1/checkout/sessions                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 4. Backend processes request
                                    │    • Verifies API key
                                    │    • Validates payload
                                    │    • Gets product details
                                    │    • Calculates pricing
                                    │    • Creates Stripe PaymentIntent (if stripe)
                                    │    • Stores checkout_session object
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  API RESPONSE (200 OK)                                                   │
│  ────────────────────                                                   │
│  {                                                                       │
│    checkoutSessionId: "k789xyz",      ← ✅ USE IN CONFIRM REQUEST      │
│    sessionId: "sess_abc123",          ← Legacy: same as above          │
│    clientSecret: "pi_abc_secret_xyz", ← ✅ FOR STRIPE ELEMENTS         │
│    requiresPayment: true,             ← false for free events          │
│    amount: 5000,                      ← Total in cents (EUR 50.00)     │
│    currency: "eur",                                                     │
│    expiresAt: 1704123456789           ← Session expiry timestamp       │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                ┌───────────────────┴───────────────────┐
                │                                       │
        requiresPayment: true               requiresPayment: false
                │                                       │
                ▼                                       ▼
    ┌───────────────────────┐               ┌─────────────────────┐
    │   SHOW STRIPE UI      │               │   SKIP PAYMENT UI   │
    │   (Stripe Elements)   │               │   (Free/Invoice)    │
    └───────────────────────┘               └─────────────────────┘
                │                                       │
                │ 5. User completes payment             │ 5. Skip directly to confirm
                ▼                                       ▼
    ┌───────────────────────────────────────────────────────────┐
    │  Stripe.confirmPayment({ elements })                       │
    │  Returns: { paymentIntent: { id: "pi_abc123..." } }       │
    └───────────────────────────────────────────────────────────┘
                │                                       │
                └───────────────────┬───────────────────┘
                                    │
                                    │ 6. Frontend sends confirmation
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CONFIRM REQUEST (POST /api/v1/checkout/confirm)                        │
│  ──────────────────────────────────────────────────                     │
│  {                                                                       │
│    checkoutSessionId: "k789xyz",      ← From create response           │
│    sessionId: "sess_abc123",          ← Legacy: same as above          │
│    paymentIntentId: "free"            ← ✅ CRITICAL FIELD:              │
│                     "invoice"            • "free" for free events       │
│                     "pi_abc123..."       • "invoice" for invoices       │
│  }                                       • "pi_..." for Stripe          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 7. Backend fulfillment
                                    │    • Verifies payment (if Stripe)
                                    │    • Creates CRM contact
                                    │    • Creates dormant frontend user
                                    │    • Creates purchase_item(s)
                                    │    • Creates event ticket(s)
                                    │    • Generates invoice (if B2B)
                                    │    • Sends confirmation email
                                    │    • Generates PDFs (ticket, invoice)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  CONFIRM RESPONSE (200 OK)                                               │
│  ────────────────────────                                               │
│  {                                                                       │
│    success: true,                     ← ✅ Registration complete        │
│                                                                          │
│    purchasedItemIds: [                ← Generic purchase records        │
│      "ticket_123",                                                       │
│      "ticket_456"                                                        │
│    ],                                                                    │
│                                                                          │
│    crmContactId: "contact_xyz",       ← CRM contact created            │
│    paymentId: "free",                 ← Payment reference               │
│    amount: 0,                         ← 0 for free, actual for paid    │
│    currency: "EUR",                                                     │
│                                                                          │
│    // NEW FIELDS (v2.0)                                                 │
│    isGuestRegistration: true,         ← ✅ Dormant user created        │
│    frontendUserId: "frontend_user_abc", ← User ID for activation       │
│    invoiceType: "none",               ← "none" | "receipt" | "manual_b2b"│
│                                          | "manual_b2c" | "employer"     │
│                                                                          │
│    downloadUrls: {                    ← Download links                  │
│      purchaseItems: "https://...purchase-items/k789xyz/download",      │
│      tickets: "https://...tickets/k789xyz/download",                   │
│      invoice: "https://...invoices/k789xyz/download"                   │
│    }                                                                     │
│  }                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 8. Frontend shows success
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  SUCCESS MODAL                                                           │
│  ────────────                                                           │
│  ✅ Registration Successful!                                            │
│                                                                          │
│  • Confirmation email sent to john@example.com                          │
│  • Ticket(s) attached to email                                          │
│  • Invoice type: none (free registration)                               │
│                                                                          │
│  💡 Want to track your registrations?                                   │
│     [Create Account] ← Activate dormant user                            │
│                                                                          │
│  📄 Downloads:                                                          │
│     • [Download Ticket PDF]                                             │
│     • [Download Invoice] (if applicable)                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Data Mappings

### Form Data → API Payload

```
USER FILLS FORM                 →    API PAYLOAD
──────────────────────────────       ─────────────────────────────────
firstName: "John"                    formResponses[0].responses.firstName
lastName: "Doe"                  →   formResponses[0].responses.lastName
email: "john@example.com"            formResponses[0].responses.email
phone: "+49123456789"                formResponses[0].responses.phone
organization: "ACME Corp"        →   formResponses[0].responses.organization
attendee_category: "internal"        formResponses[0].responses.attendee_category
dietary_requirements: "vegan"    →   formResponses[0].responses.dietary_requirements
consent_privacy: true                formResponses[0].responses.consent_privacy

                                 ─────────────────────────────────
                                 ALSO STORED AT TOP LEVEL:
                                 ─────────────────────────────────
firstName + lastName             →   customerName: "John Doe"
email                            →   customerEmail: "john@example.com"
phone                            →   customerPhone: "+49123456789"
```

### Payment Method → Response Fields

```
PAYMENT METHOD              →    RESPONSE FIELDS
─────────────────────            ─────────────────────────────────
paymentMethod: "free"            requiresPayment: false
                             →   clientSecret: undefined
                                 invoiceType: "none"
                                 paymentIntentId: "free"

paymentMethod: "stripe"          requiresPayment: true
                             →   clientSecret: "pi_abc_secret_xyz"
                                 invoiceType: "receipt"
                                 paymentIntentId: "pi_abc123..."

paymentMethod: "invoice"         requiresPayment: false
+ transactionType: "B2B"     →   clientSecret: undefined
                                 invoiceType: "manual_b2b"
                                 paymentIntentId: "invoice"

paymentMethod: "invoice"         requiresPayment: false
+ NO transactionType         →   clientSecret: undefined
                                 invoiceType: "manual_b2c"
                                 paymentIntentId: "invoice"
```

---

## 🎯 Critical Field Mappings

### ⚠️ Must Match Exactly

```typescript
// Frontend sends productIds array
productIds: ["m456def"]

// Backend expects matching productId in formResponses
formResponses: [
  {
    productId: "m456def",  // ✅ MUST MATCH productIds[0]
    ticketNumber: 1,
    responses: {...}
  }
]
```

### ⚠️ Billing Address Structure

```typescript
// ❌ WRONG: Top-level fields
{
  billing_street: "Hauptstraße 1",
  billing_city: "Berlin"
}

// ✅ CORRECT: Nested object
{
  billingAddress: {
    line1: "Hauptstraße 1",
    city: "Berlin",
    postalCode: "10115",
    country: "Germany"
  }
}
```

---

## 📊 Payment Flow Decision Tree

```
User submits registration form
         │
         ▼
What's the payment method?
         │
    ┌────┴────┬──────────┬─────────┐
    │         │          │         │
   FREE    STRIPE    INVOICE    INVOICE
                    + B2B       + B2C
    │         │          │         │
    ▼         ▼          ▼         ▼
Skip to   Show Stripe  Skip to   Skip to
Confirm     Payment    Confirm   Confirm
            UI
    │         │          │         │
    ▼         ▼          ▼         ▼
paymentId  paymentId  paymentId  paymentId
= "free"   = "pi_..." = "invoice"= "invoice"
    │         │          │         │
    ▼         ▼          ▼         ▼
invoice    invoice    invoice    invoice
Type:      Type:      Type:      Type:
"none"    "receipt"  "manual_   "manual_
                      b2b"       b2c"
    │         │          │         │
    └─────────┴──────────┴─────────┘
              │
              ▼
    Email sent with:
    • Ticket PDF(s)
    • Invoice PDF (if applicable)
    • Confirmation message
              │
              ▼
    Guest user created (dormant)
    Can activate account later
```

---

## 🔍 Data Validation Rules

### Backend Validates

```
✅ REQUIRED FIELDS
─────────────────────────────────────────────
organizationId        → Must exist in database
productIds[0]         → Must exist in database
quantities[0]         → Must be > 0
customerEmail         → Must be valid email
paymentMethod         → Must be "free" | "stripe" | "invoice"

✅ B2B INVOICE REQUIREMENTS
─────────────────────────────────────────────
IF paymentMethod = "invoice" AND transactionType = "B2B":
  → companyName REQUIRED
  → vatNumber REQUIRED (EU)
  → billingAddress REQUIRED
    → billingAddress.line1 REQUIRED
    → billingAddress.city REQUIRED
    → billingAddress.postalCode REQUIRED
    → billingAddress.country REQUIRED

✅ PRODUCT MATCHING
─────────────────────────────────────────────
formResponses[0].productId === productIds[0]  → MUST MATCH

✅ TICKET NUMBERING
─────────────────────────────────────────────
formResponses[].ticketNumber → Sequential: 1, 2, 3...
```

---

## 💡 Common Patterns

### Pattern 1: Multiple Tickets (Same Person)

```typescript
{
  productIds: ["m456def"],
  quantities: [3],  // ✅ 3 tickets

  formResponses: [
    { productId: "m456def", ticketNumber: 1, responses: {...} },
    { productId: "m456def", ticketNumber: 2, responses: {...} },
    { productId: "m456def", ticketNumber: 3, responses: {...} }
  ]
}
```

### Pattern 2: Group Registration (Different People)

```typescript
{
  productIds: ["m456def"],
  quantities: [3],  // ✅ 3 tickets for group

  formResponses: [
    {
      productId: "m456def",
      ticketNumber: 1,
      responses: {
        firstName: "John",
        email: "john@example.com",
        // ... John's data
      }
    },
    {
      productId: "m456def",
      ticketNumber: 2,
      responses: {
        firstName: "Jane",
        email: "jane@example.com",
        // ... Jane's data
      }
    },
    {
      productId: "m456def",
      ticketNumber: 3,
      responses: {
        firstName: "Bob",
        email: "bob@example.com",
        // ... Bob's data
      }
    }
  ]
}
```

---

## 📞 Support

For complete API documentation, see:
- **[API_PAYLOAD_STRUCTURE.md](./API_PAYLOAD_STRUCTURE.md)** ⭐ Complete spec
- **[FRONTEND_BACKEND_INTEGRATION_SUMMARY.md](./FRONTEND_BACKEND_INTEGRATION_SUMMARY.md)** Quick reference
- **[FRONTEND_CHECKOUT_INTEGRATION.md](./FRONTEND_CHECKOUT_INTEGRATION.md)** Integration guide
