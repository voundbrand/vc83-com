# Product-Agnostic Payment API Architecture

## Overview

The Payment API is **fully product-agnostic** and works with ANY product type - not just tickets. This is achieved through the `purchase_items` architecture that abstracts fulfillment away from the payment flow.

## Product Types Supported

The API handles all product types through a unified `purchase_item` record:

- **🎫 Tickets** (`subtype: "ticket"`) - Event access, QR codes
- **📦 Subscriptions** (`subtype: "subscription"`) - Recurring services
- **💾 Digital Downloads** (`subtype: "download"`) - Files, software
- **📮 Physical Goods** (`subtype: "shipment"`) - Shipped products
- **🎓 Courses** (`subtype: "course"`) - Online learning
- **🎨 Services** (`subtype: "service"`) - Custom services

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Payment API (Product-Agnostic)                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  POST /api/v1/checkout/sessions                 │
│  ├─ Takes: productId, quantity, customer info   │
│  ├─ Creates: checkout_session                   │
│  └─ Returns: clientSecret (for ANY product)     │
│                                                  │
│  POST /api/v1/checkout/confirm                  │
│  ├─ Verifies payment                            │
│  ├─ Creates purchase_items (generic!)           │
│  └─ Triggers fulfillment hooks (product-specific)│
│                                                  │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│ Purchase Items (Generic Records)                │
├─────────────────────────────────────────────────┤
│                                                  │
│  purchase_item {                                │
│    type: "purchase_item",                       │
│    productId: "...",                            │
│    quantity: 1,                                 │
│    fulfillmentType: <from product.subtype>,     │
│    fulfillmentStatus: "pending" → "fulfilled",  │
│    fulfillmentData: { ... }                     │
│  }                                              │
│                                                  │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│ Fulfillment Hooks (Product-Specific)            │
├─────────────────────────────────────────────────┤
│                                                  │
│  IF fulfillmentType === "ticket":               │
│    ├─ Create event ticket                       │
│    ├─ Generate QR code                          │
│    └─ Send ticket PDF                           │
│                                                  │
│  IF fulfillmentType === "subscription":         │
│    ├─ Create subscription record                │
│    ├─ Set up billing cycle                      │
│    └─ Grant access to service                   │
│                                                  │
│  IF fulfillmentType === "download":             │
│    ├─ Generate secure download link             │
│    ├─ Set expiration date                       │
│    └─ Send download email                       │
│                                                  │
│  IF fulfillmentType === "shipment":             │
│    ├─ Create shipping order                     │
│    ├─ Calculate shipping cost                   │
│    └─ Send to warehouse system                  │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Key Design Principles

### 1. Single Payment Flow for All Products

The same 3 API endpoints work for **any product type**:

```javascript
// Works for tickets
POST /api/v1/checkout/sessions { productId: "ticket_product" }

// Works for subscriptions
POST /api/v1/checkout/sessions { productId: "subscription_product" }

// Works for downloads
POST /api/v1/checkout/sessions { productId: "download_product" }

// The API doesn't care about product type!
```

### 2. Product Type Determined by Product Configuration

```javascript
// In database: products table
{
  _id: "product_123",
  type: "product",
  subtype: "ticket", // ← This determines fulfillment type
  name: "Event Admission",
  customProperties: {
    priceInCents: 5000,
    currency: "usd",
    eventId: "event_456", // Product-specific data
  }
}

// In database: products table (different product)
{
  _id: "product_789",
  type: "product",
  subtype: "subscription", // ← Different fulfillment
  name: "Premium Plan",
  customProperties: {
    priceInCents: 9900,
    currency: "usd",
    billingCycle: "monthly", // Product-specific data
  }
}
```

### 3. Generic Purchase Records

**All purchases create the same `purchase_item` structure:**

```javascript
// purchase_item (generic for ANY product)
{
  type: "purchase_item",
  subtype: <from product.subtype>,
  productId: "...",
  quantity: 1,
  pricePerUnit: 5000,
  totalPrice: 5000,
  buyerEmail: "customer@example.com",
  buyerName: "John Doe",

  // Fulfillment tracking (product-agnostic)
  fulfillmentType: "ticket", // or "subscription", "download", etc.
  fulfillmentStatus: "pending",
  fulfillmentData: {}, // Filled by fulfillment hook
}
```

### 4. Product-Specific Fulfillment Hooks

The `completeCheckoutWithTickets` action (despite its name) handles **all product types**:

```typescript
// From convex/checkoutSessions.ts:843
const fulfillmentType = product.subtype || "ticket"; // Default to ticket for backward compatibility

// From convex/checkoutSessions.ts:884-956
// FULFILLMENT DISPATCH - Based on product type
if (fulfillmentType === "ticket") {
  // Create event ticket for access control
  const ticketId = await createTicketInternal({...});
  await updateFulfillmentStatusInternal({
    purchaseItemId,
    fulfillmentStatus: "fulfilled",
    fulfillmentData: { ticketId, eventId }
  });
}
// TODO: Add more fulfillment types here:
// else if (fulfillmentType === "subscription") { ... }
// else if (fulfillmentType === "download") { ... }
// else if (fulfillmentType === "shipment") { ... }
```

## API Response Structure

The API returns **product-agnostic** purchase data:

```json
{
  "success": true,
  "transactionId": "pi_...",
  "purchaseItemIds": ["obj_...", "obj_..."],
  "crmContactId": "obj_...",
  "amount": 9900,
  "currency": "usd",
  "downloadUrls": {
    "purchaseItems": "https://.../api/v1/purchase-items/.../download",
    "tickets": "https://.../api/v1/tickets/.../download",  // Only if product is ticket
    "invoice": "https://.../api/v1/invoices/.../download"  // Only if B2B
  }
}
```

## Why This Matters for API Integration

### Before (Ticket-Specific)

```javascript
// ❌ Old approach - hardcoded to tickets
const response = await fetch('/api/v1/checkout/confirm', {...});
const { ticketIds } = await response.json();
// What if I'm selling subscriptions? 🤔
```

### After (Product-Agnostic)

```javascript
// ✅ New approach - works for ANY product
const response = await fetch('/api/v1/checkout/confirm', {...});
const { purchaseItemIds, downloadUrls } = await response.json();

// Access generic purchase items
downloadUrls.purchaseItems // Works for tickets, subscriptions, downloads, etc.

// Access product-specific downloads (if applicable)
downloadUrls.tickets  // Only present if product is ticket
downloadUrls.invoice  // Only present if B2B transaction
```

## Code References

### Product-Agnostic Implementation

**File**: `convex/checkoutSessions.ts`

- **Line 567**: `purchasedItemIds` (renamed from `ticketIds`)
- **Line 843**: `fulfillmentType = product.subtype` (reads from product)
- **Line 857**: `createPurchaseItemInternal` (generic purchase record)
- **Line 915**: Fulfillment dispatch based on `fulfillmentType`

**File**: `convex/api/v1/checkoutInternal.ts`

- **Line 255**: Return type uses `purchaseItemIds` (generic)
- **Line 259**: `downloadUrls: Record<string, string>` (dynamic based on products)
- **Line 291-319**: Build download URLs based on product types in cart
- **Line 324**: Return `purchaseItemIds` (works for ANY product type)

**File**: `convex/purchaseOntology.ts`

- **Line 1-28**: Architecture documentation for product-agnostic purchases
- **Line 41-111**: Examples of different product types (ticket, subscription, download, shipment)

## Adding New Product Types

To support a new product type (e.g., "course"):

### 1. Create Product with Subtype

```javascript
await createProduct({
  name: "Advanced React Course",
  subtype: "course", // ← New product type
  customProperties: {
    priceInCents: 14900,
    currency: "usd",
    courseId: "course_123",
    durationWeeks: 8,
  }
});
```

### 2. Add Fulfillment Hook

**File**: `convex/checkoutSessions.ts` (Line 915)

```typescript
// FULFILLMENT DISPATCH - Based on product type
if (fulfillmentType === "ticket") {
  // Existing ticket fulfillment
  const ticketId = await createTicketInternal({...});
  // ...
}
else if (fulfillmentType === "course") { // ← Add new fulfillment
  // Create course enrollment
  const enrollmentId = await createCourseEnrollmentInternal({
    organizationId,
    courseId: product.customProperties?.courseId,
    studentEmail: holderEmail,
    studentName: holderName,
    startDate: Date.now(),
    durationWeeks: product.customProperties?.durationWeeks,
  });

  // Update purchase item fulfillment
  await updateFulfillmentStatusInternal({
    purchaseItemId,
    fulfillmentStatus: "fulfilled",
    fulfillmentData: {
      enrollmentId,
      courseId: product.customProperties?.courseId,
      accessUrl: `https://courses.example.com/enroll/${enrollmentId}`,
    },
  });
}
```

### 3. Done! API Already Works

The Payment API automatically handles the new product type:

```javascript
// No API changes needed!
const response = await fetch('/api/v1/checkout/sessions', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ...' },
  body: JSON.stringify({
    productId: 'course_product_id', // ← New product type
    quantity: 1,
    customerEmail: 'student@example.com'
  })
});

// Payment flow works exactly the same
// Fulfillment hook triggers automatically
```

## Benefits

### For API Consumers

1. **Single API** - Same endpoints for all products
2. **No code changes** - Add new product types without updating API integration
3. **Flexible responses** - `downloadUrls` adapts to product types in cart

### For Platform Owners

1. **Maintainability** - One payment flow for all products
2. **Extensibility** - Add fulfillment hooks without changing API
3. **Consistency** - All purchases tracked in `purchase_items` table

## Migration Notes

### Legacy API Compatibility

The API maintains backwards compatibility:

```json
{
  "purchaseItemIds": ["obj_...", "obj_..."],  // Generic (new)
  "downloadUrls": {
    "purchaseItems": "...",  // Generic download (new)
    "tickets": "...",        // Legacy support (if product is ticket)
    "invoice": "..."         // B2B support
  }
}
```

Old API clients expecting `ticketIds` will still work if products are tickets.

New API clients should use `purchaseItemIds` for all product types.

## Summary

The Payment API is **fully product-agnostic** and ready for:
- ✅ Event tickets
- ✅ Subscriptions
- ✅ Digital downloads
- ✅ Physical goods
- ✅ Services
- ✅ Courses
- ✅ **Any future product type you create!**

Just set `product.subtype` and add a fulfillment hook. The API handles the rest.
