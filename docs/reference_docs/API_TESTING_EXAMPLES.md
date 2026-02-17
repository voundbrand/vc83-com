# API Testing Examples (Postman / cURL / JavaScript)

## 🎯 Purpose

Use these examples to **test the API directly** before integrating into your frontend application.

**Base URL**: `https://agreeable-lion-828.convex.site`

---

## 📋 Prerequisites

Before testing, you need:

1. **API Key**: `org_j97abc...` (get from backend team)
2. **Organization ID**: `j97abc123...` (your platform organization)
3. **Checkout Instance ID**: `k123abc...` (for your event)
4. **Product ID**: `m456def...` (event ticket product)

---

## Example 1: Free Event Registration (cURL)

### Step 1: Create Checkout Session

```bash
curl -X POST https://agreeable-lion-828.convex.site/api/v1/checkout/sessions \
  -H "Authorization: Bearer org_j97abc123_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "j97abc123",
    "checkoutInstanceId": "k123abc",
    "productIds": ["m456def"],
    "quantities": [1],

    "customerEmail": "john.doe@example.com",
    "customerName": "John Doe",
    "customerPhone": "+49123456789",

    "paymentMethod": "free",

    "formResponses": [
      {
        "productId": "m456def",
        "ticketNumber": 1,
        "formId": "event_registration",
        "responses": {
          "firstName": "John",
          "lastName": "Doe",
          "email": "john.doe@example.com",
          "phone": "+49123456789",
          "organization": "ACME Corporation",
          "attendee_category": "internal",
          "dietary_requirements": "vegetarian",
          "consent_privacy": true
        },
        "addedCosts": 0
      }
    ]
  }'
```

**Expected Response** (200 OK):

```json
{
  "checkoutSessionId": "k789xyz123",
  "sessionId": "sess_abc123",
  "clientSecret": undefined,
  "requiresPayment": false,
  "amount": 0,
  "currency": "eur",
  "expiresAt": 1704123456789
}
```

### Step 2: Confirm Payment (Free)

```bash
curl -X POST https://agreeable-lion-828.convex.site/api/v1/checkout/confirm \
  -H "Authorization: Bearer org_j97abc123_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "Content-Type: application/json" \
  -d '{
    "checkoutSessionId": "k789xyz123",
    "sessionId": "sess_abc123",
    "paymentIntentId": "free"
  }'
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "purchasedItemIds": ["ticket_abc123"],
  "crmContactId": "contact_xyz789",
  "paymentId": "free",
  "amount": 0,
  "currency": "EUR",
  "isGuestRegistration": true,
  "frontendUserId": "frontend_user_def456",
  "invoiceType": "none",
  "downloadUrls": {
    "purchaseItems": "https://agreeable-lion-828.convex.site/api/v1/purchase-items/k789xyz123/download",
    "tickets": "https://agreeable-lion-828.convex.site/api/v1/tickets/k789xyz123/download"
  }
}
```

---

## Example 2: Paid Event with Stripe (JavaScript)

### Full Flow Implementation

```typescript
// ===== STEP 1: Create Checkout Session =====

const createSessionResponse = await fetch(
  'https://agreeable-lion-828.convex.site/api/v1/checkout/sessions',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer org_j97abc123_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      organizationId: 'j97abc123',
      checkoutInstanceId: 'k123abc',
      productIds: ['m456def'],
      quantities: [1],

      customerEmail: 'jane.smith@example.com',
      customerName: 'Jane Smith',
      customerPhone: '+49987654321',

      paymentMethod: 'stripe', // ✅ STRIPE PAYMENT

      formResponses: [
        {
          productId: 'm456def',
          ticketNumber: 1,
          formId: 'event_registration',
          responses: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            phone: '+49987654321',
            organization: 'XYZ GmbH',
            attendee_category: 'external',
            dietary_requirements: 'vegan',
            consent_privacy: true,
          },
          addedCosts: 0,
        },
      ],
    }),
  }
);

const sessionData = await createSessionResponse.json();

console.log('Session created:', sessionData);
// {
//   checkoutSessionId: "k789xyz123",
//   clientSecret: "pi_abc123_secret_xyz",
//   requiresPayment: true,
//   amount: 5000,  // EUR 50.00
//   currency: "eur"
// }

// ===== STEP 2: Initialize Stripe Elements =====

const stripe = await loadStripe('pk_test_...');
const elements = stripe.elements({
  clientSecret: sessionData.clientSecret,
});

const paymentElement = elements.create('payment');
paymentElement.mount('#payment-element');

// ===== STEP 3: User Submits Payment =====

const handleSubmit = async (e) => {
  e.preventDefault();

  // Confirm payment with Stripe
  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: 'https://yoursite.com/registration/success',
    },
    redirect: 'if_required', // ✅ Don't redirect, stay on page
  });

  if (error) {
    console.error('Payment failed:', error);
    return;
  }

  console.log('Payment successful:', paymentIntent);

  // ===== STEP 4: Confirm with Backend =====

  const confirmResponse = await fetch(
    'https://agreeable-lion-828.convex.site/api/v1/checkout/confirm',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer org_j97abc123_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        checkoutSessionId: sessionData.checkoutSessionId,
        sessionId: sessionData.sessionId,
        paymentIntentId: paymentIntent.id, // ✅ From Stripe
      }),
    }
  );

  const confirmData = await confirmResponse.json();

  console.log('Confirmation:', confirmData);
  // {
  //   success: true,
  //   purchasedItemIds: ["ticket_abc123"],
  //   amount: 5000,
  //   currency: "EUR",
  //   invoiceType: "receipt",
  //   downloadUrls: {
  //     tickets: "https://.../tickets/k789xyz123/download"
  //   }
  // }

  // Show success modal
  showSuccessModal(confirmData);
};
```

---

## Example 3: B2B Invoice (Postman)

### Request 1: Create Session (B2B)

**Method**: `POST`
**URL**: `https://agreeable-lion-828.convex.site/api/v1/checkout/sessions`

**Headers**:
```
Authorization: Bearer org_j97abc123_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "organizationId": "j97abc123",
  "checkoutInstanceId": "k123abc",
  "productIds": ["m456def"],
  "quantities": [1],

  "customerEmail": "procurement@acme.com",
  "customerName": "Bob Johnson",
  "customerPhone": "+49111222333",

  "paymentMethod": "invoice",

  "transactionType": "B2B",
  "companyName": "ACME Corporation",
  "vatNumber": "DE123456789",
  "billingAddress": {
    "line1": "Hauptstraße 1",
    "line2": "Suite 200",
    "city": "Berlin",
    "state": "Berlin",
    "postalCode": "10115",
    "country": "Germany"
  },

  "formResponses": [
    {
      "productId": "m456def",
      "ticketNumber": 1,
      "formId": "event_registration",
      "responses": {
        "firstName": "Bob",
        "lastName": "Johnson",
        "email": "bob@acme.com",
        "phone": "+49111222333",
        "organization": "ACME Corporation",
        "companyName": "ACME Corporation",
        "vatNumber": "DE123456789",
        "attendee_category": "external",
        "dietary_requirements": "none",
        "consent_privacy": true
      },
      "addedCosts": 0
    }
  ]
}
```

**Expected Response**:
```json
{
  "checkoutSessionId": "k789xyz123",
  "sessionId": "sess_abc123",
  "requiresPayment": false,
  "amount": 5000,
  "currency": "eur",
  "expiresAt": 1704123456789
}
```

### Request 2: Confirm Invoice

**Method**: `POST`
**URL**: `https://agreeable-lion-828.convex.site/api/v1/checkout/confirm`

**Headers**:
```
Authorization: Bearer org_j97abc123_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "checkoutSessionId": "k789xyz123",
  "sessionId": "sess_abc123",
  "paymentIntentId": "invoice"
}
```

**Expected Response**:
```json
{
  "success": true,
  "purchasedItemIds": ["ticket_abc123"],
  "crmContactId": "contact_xyz789",
  "paymentId": "invoice",
  "amount": 5000,
  "currency": "EUR",
  "isGuestRegistration": true,
  "frontendUserId": "frontend_user_def456",
  "invoiceType": "manual_b2b",
  "downloadUrls": {
    "purchaseItems": "https://agreeable-lion-828.convex.site/api/v1/purchase-items/k789xyz123/download",
    "tickets": "https://agreeable-lion-828.convex.site/api/v1/tickets/k789xyz123/download",
    "invoice": "https://agreeable-lion-828.convex.site/api/v1/invoices/k789xyz123/download"
  }
}
```

---

## Example 4: Multiple Tickets (Group Registration)

### cURL Example

```bash
curl -X POST https://agreeable-lion-828.convex.site/api/v1/checkout/sessions \
  -H "Authorization: Bearer org_j97abc123_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "j97abc123",
    "checkoutInstanceId": "k123abc",
    "productIds": ["m456def"],
    "quantities": [3],

    "customerEmail": "team@company.com",
    "customerName": "Team Lead",
    "customerPhone": "+49123456789",

    "paymentMethod": "free",

    "formResponses": [
      {
        "productId": "m456def",
        "ticketNumber": 1,
        "responses": {
          "firstName": "Alice",
          "lastName": "Anderson",
          "email": "alice@company.com",
          "organization": "Company Inc",
          "attendee_category": "internal"
        },
        "addedCosts": 0
      },
      {
        "productId": "m456def",
        "ticketNumber": 2,
        "responses": {
          "firstName": "Bob",
          "lastName": "Brown",
          "email": "bob@company.com",
          "organization": "Company Inc",
          "attendee_category": "internal"
        },
        "addedCosts": 0
      },
      {
        "productId": "m456def",
        "ticketNumber": 3,
        "responses": {
          "firstName": "Charlie",
          "lastName": "Chen",
          "email": "charlie@company.com",
          "organization": "Company Inc",
          "attendee_category": "internal"
        },
        "addedCosts": 0
      }
    ]
  }'
```

**Expected Response**:
```json
{
  "checkoutSessionId": "k789xyz123",
  "requiresPayment": false,
  "amount": 0,
  "currency": "eur"
}
```

---

## Testing Checklist

### ✅ Test 1: Free Event Registration
- [ ] Create session with `paymentMethod: "free"`
- [ ] Verify `requiresPayment: false`
- [ ] Verify `clientSecret` is undefined
- [ ] Confirm with `paymentIntentId: "free"`
- [ ] Verify `invoiceType: "none"`
- [ ] Verify `isGuestRegistration: true`
- [ ] Check email confirmation sent

### ✅ Test 2: Stripe Payment
- [ ] Create session with `paymentMethod: "stripe"`
- [ ] Verify `clientSecret` is present
- [ ] Verify `requiresPayment: true`
- [ ] Use Stripe Elements to complete payment
- [ ] Confirm with `paymentIntentId: "pi_..."`
- [ ] Verify `invoiceType: "receipt"`
- [ ] Check receipt PDF in downloadUrls

### ✅ Test 3: B2B Invoice
- [ ] Include all B2B fields (companyName, vatNumber, billingAddress)
- [ ] Create session with `paymentMethod: "invoice"`
- [ ] Confirm with `paymentIntentId: "invoice"`
- [ ] Verify `invoiceType: "manual_b2b"`
- [ ] Verify `crmContactId` is present
- [ ] Check invoice PDF in downloadUrls

### ✅ Test 4: B2C Invoice
- [ ] Create session with `paymentMethod: "invoice"` (no B2B fields)
- [ ] Confirm with `paymentIntentId: "invoice"`
- [ ] Verify `invoiceType: "manual_b2c"`

### ✅ Test 5: Multiple Tickets
- [ ] Set `quantities: [3]`
- [ ] Include 3 formResponses with ticketNumbers 1, 2, 3
- [ ] Verify 3 tickets created in response

---

## Error Testing

### Test Invalid API Key

```bash
curl -X POST https://agreeable-lion-828.convex.site/api/v1/checkout/sessions \
  -H "Authorization: Bearer invalid_key" \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "j97abc123"}'
```

**Expected Response** (401):
```json
{
  "error": "Invalid API key"
}
```

### Test Missing Required Field

```bash
curl -X POST https://agreeable-lion-828.convex.site/api/v1/checkout/sessions \
  -H "Authorization: Bearer org_j97abc123_..." \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "j97abc123"
    // Missing productIds, quantities, etc.
  }'
```

**Expected Response** (400):
```json
{
  "error": "Missing 'productId' field"
}
```

### Test Invalid Product ID

```bash
curl -X POST https://agreeable-lion-828.convex.site/api/v1/checkout/sessions \
  -H "Authorization: Bearer org_j97abc123_..." \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "j97abc123",
    "productIds": ["invalid_product_id"],
    "quantities": [1],
    "customerEmail": "test@example.com",
    "customerName": "Test User",
    "paymentMethod": "free",
    "formResponses": []
  }'
```

**Expected Response** (404 or 400):
```json
{
  "error": "Product not found"
}
```

---

## Postman Collection

Import this JSON into Postman:

```json
{
  "info": {
    "name": "Checkout API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "https://agreeable-lion-828.convex.site"
    },
    {
      "key": "api_key",
      "value": "org_j97abc123_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
    },
    {
      "key": "org_id",
      "value": "j97abc123"
    },
    {
      "key": "checkout_instance_id",
      "value": "k123abc"
    },
    {
      "key": "product_id",
      "value": "m456def"
    },
    {
      "key": "checkout_session_id",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "1. Create Free Event Session",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{api_key}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": "{{base_url}}/api/v1/checkout/sessions",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"organizationId\": \"{{org_id}}\",\n  \"checkoutInstanceId\": \"{{checkout_instance_id}}\",\n  \"productIds\": [\"{{product_id}}\"],\n  \"quantities\": [1],\n  \"customerEmail\": \"test@example.com\",\n  \"customerName\": \"Test User\",\n  \"customerPhone\": \"+49123456789\",\n  \"paymentMethod\": \"free\",\n  \"formResponses\": [\n    {\n      \"productId\": \"{{product_id}}\",\n      \"ticketNumber\": 1,\n      \"responses\": {\n        \"firstName\": \"Test\",\n        \"lastName\": \"User\",\n        \"email\": \"test@example.com\",\n        \"organization\": \"Test Org\"\n      },\n      \"addedCosts\": 0\n    }\n  ]\n}"
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test(\"Status is 200\", function() {",
              "  pm.response.to.have.status(200);",
              "});",
              "",
              "const response = pm.response.json();",
              "pm.collectionVariables.set(\"checkout_session_id\", response.checkoutSessionId);"
            ]
          }
        }
      ]
    },
    {
      "name": "2. Confirm Free Event Payment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{api_key}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": "{{base_url}}/api/v1/checkout/confirm",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"checkoutSessionId\": \"{{checkout_session_id}}\",\n  \"sessionId\": \"{{checkout_session_id}}\",\n  \"paymentIntentId\": \"free\"\n}"
        }
      }
    }
  ]
}
```

---

## Environment Variables for Testing

Create a Postman environment with:

```json
{
  "name": "Checkout API - Development",
  "values": [
    {
      "key": "base_url",
      "value": "https://agreeable-lion-828.convex.site",
      "enabled": true
    },
    {
      "key": "api_key",
      "value": "org_j97abc123_YOUR_ACTUAL_KEY_HERE",
      "enabled": true
    },
    {
      "key": "org_id",
      "value": "YOUR_ACTUAL_ORG_ID",
      "enabled": true
    },
    {
      "key": "checkout_instance_id",
      "value": "YOUR_ACTUAL_CHECKOUT_INSTANCE_ID",
      "enabled": true
    },
    {
      "key": "product_id",
      "value": "YOUR_ACTUAL_PRODUCT_ID",
      "enabled": true
    }
  ]
}
```

---

## Support

For complete API documentation:
- **[API_PAYLOAD_STRUCTURE.md](./api/api-payload-structure.md)** - Complete API spec
- **[API_DATA_FLOW_DIAGRAM.md](./api/api-data-flow-diagram.md)** - Visual data flow
- **[FRONTEND_BACKEND_INTEGRATION_SUMMARY.md](./FRONTEND_BACKEND_INTEGRATION_SUMMARY.md)** - Quick reference

**Need help?**
- Check Convex logs for detailed error messages
- Verify all IDs are correct (organization, product, checkout instance)
- Ensure payload structure exactly matches examples
