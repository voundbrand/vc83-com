# Workflow Trigger API - Frontend Integration Guide

**Version**: 2.0
**Last Updated**: 2025-01-17
**Backend**: Convex Workflows with Auto-Detection

---

## 🚨 BREAKING CHANGES IN v2.0

**IMPORTANT**: If you're upgrading from v1.0, the following changes are **NOT backward compatible**:

### 1️⃣ Form ID Now Required ⚠️
```typescript
// ❌ v1.0 (OLD - Will fail)
{
  eventId: "...",
  productId: "...",  // Missing formId!
  // ...
}

// ✅ v2.0 (NEW - Required)
{
  eventId: "...",
  formId: "form_haffsymposium_2025_registration",  // ← ADD THIS
  products: [...],
  // ...
}
```

**Why**: The `createFormResponse` workflow behavior requires a formId to store form submissions.

**Action Required**: Add the `formId` field to all registration API calls.

---

### 2️⃣ Products Changed from Singular to Array ⚠️
```typescript
// ❌ v1.0 (OLD - Will fail)
{
  productId: "k29j5y9mp0qm8nqy0g28pypyard7vcpv2"  // Singular
}

// ✅ v2.0 (NEW - Required)
{
  products: [
    { productId: "k29j5y9mp0qm8nqy0g28pypyard7vcpv2", quantity: 1 }
  ]
}
```

**Why**: Support for multiple products (base ticket + addons like UCRA boat trip).

**Action Required**:
- Change `productId` to `products` array
- Even for single products, wrap in array with quantity
- Update pricing calculation to handle multiple products

---

### 3️⃣ CRM Organization ID Auto-Detection (New Feature) ✨
```typescript
// ✅ v2.0 - Auto-detect (Recommended)
{
  formResponses: {
    attendee_category: "ameos"  // Backend auto-detects CRM org
  }
}

// ✅ v2.0 - Manual override (Optional)
{
  formResponses: {
    attendee_category: "ameos"
  },
  crmOrganizationId: "k47m5y9mp0qm8nqy0g28pypyard7vcpv2"  // Override
}
```

**Why**: Automatically map attendee categories to CRM organizations for employer billing.

**Action Required**: None - auto-detection works by default. Override only if you have the CRM org ID.

---

## 📋 Overview

This document describes how to trigger the **Event Registration Workflow** from your frontend application. The workflow handles the complete registration process including:

- ✅ Validation
- ✅ Capacity checking
- ✅ Pricing calculation (supports multiple products)
- ✅ Employer billing detection
- ✅ Contact & ticket creation
- ✅ Transaction recording
- ✅ Form response storage
- ✅ Invoice generation (for employer billing)
- ✅ Email confirmations
- ✅ Statistics updates

---

## 🔗 API Endpoint

```
POST https://agreeable-lion-828.convex.site/api/v1/events/:eventId/register
```

**Authentication**: Required (session-based)

---

## 📤 Request Payload

### Required Fields

```typescript
{
  // Event identification
  eventId: string;              // ID of the event being registered for

  // Form identification (NEW!)
  formId: string;               // ID of the registration form schema

  // Products (NEW: Array for multiple products)
  products: Array<{
    productId: string;          // Product/ticket type ID
    quantity: number;           // How many (usually 1 for base ticket)
  }>;

  // Customer information
  customerData: {
    email: string;              // REQUIRED - Primary contact email
    firstName: string;          // REQUIRED
    lastName: string;           // REQUIRED
    salutation: string;         // REQUIRED - "Herr" | "Frau" | "Divers"
    title?: string;             // Optional - "Dr." | "Prof." | etc.
    phone?: string;             // Optional - Contact phone number
    organization?: string;      // Optional - Company/organization name
  };

  // Form responses (all answers from registration form)
  formResponses: {
    // CRITICAL: This determines billing method
    attendee_category: "ameos" | "haffnet" | "external" | "haff_health_network";

    // Contact information (duplicated for form storage)
    salutation: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;

    // Professional information
    profession?: string;
    position?: string;
    organization?: string;
    department?: string;

    // Address (REQUIRED for external attendees)
    street?: string;
    city?: string;
    postal_code?: string;
    country?: string;

    // Event-specific preferences
    arrival_time?: string;      // e.g., "09:00"
    bbq_attendance?: boolean;
    dietary_requirements?: string;
    accommodation_needs?: string;
    activity_day2?: string;     // e.g., "workshop_a"
    ucra_participants?: number; // Number for UCRA boat trip

    // Legal
    consent_privacy: boolean;   // REQUIRED - Must be true
    consent_photos?: boolean;

    comments?: string;
  };

  // Transaction data
  transactionData: {
    currency: "EUR";            // Always EUR for now

    // Pricing breakdown (calculated from products array)
    breakdown: {
      basePrice: number;        // Base ticket price in cents
      addons?: Array<{
        id: string;             // Addon identifier (e.g., "addon-ucra")
        name: string;           // Display name
        pricePerUnit: number;   // Price per unit in cents
        quantity: number;       // How many
        total: number;          // pricePerUnit * quantity
      }>;
      subtotal: number;         // Sum before taxes
      total: number;            // Final total in cents
    };
  };
}
```

### Optional Fields (Auto-Detect Override)

```typescript
{
  // Override auto-detected CRM organization
  // Backend auto-detects from attendee_category, but you can override
  crmOrganizationId?: string;
}
```

---

## 📥 Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Registration completed successfully",
  "data": {
    "contactId": "k173...",
    "ticketId": "k274...",
    "ticketNumber": "TKT-2025-001234",
    "qrCode": "QR-k274...",
    "transactionId": "k375...",
    "invoiceId": "k476...",           // Only present for employer billing
    "invoiceNumber": "INV-2025-0123", // Only present for employer billing
    "billingMethod": "employer_invoice" | "customer_payment" | "free",
    "confirmationEmailSent": true
  }
}
```

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Found 3 validation error(s)",
  "data": {
    "errors": [
      { "field": "email", "message": "Email is required" },
      { "field": "consent_privacy", "message": "Privacy consent is required" },
      { "field": "billing_address", "message": "Billing address is required for this category" }
    ]
  }
}
```

### Error Response (409 Conflict)

```json
{
  "success": false,
  "error": "Event is at full capacity",
  "message": "Event has reached maximum capacity of 100 registrations"
}
```

---

## 💡 Complete Example: AMEOS Employer Billing with Multiple Products

```typescript
// Frontend registration submission
const registrationData = {
  // Identification
  eventId: "k17h5y9mp0qm8nqy0g28pypyard7vcpv2",
  formId: "form_haffsymposium_2025_registration",

  // Multiple products: Base ticket + UCRA addon
  products: [
    {
      productId: "k29j5y9mp0qm8nqy0g28pypyard7vcpv2",  // Base symposium ticket
      quantity: 1
    },
    {
      productId: "k39k5y9mp0qm8nqy0g28pypyard7vcpv2",  // UCRA boat trip addon
      quantity: 2  // Attendee + 1 guest
    }
  ],

  // Customer information
  customerData: {
    email: "max.mustermann@ameos.de",
    firstName: "Max",
    lastName: "Mustermann",
    salutation: "Herr",
    title: "Dr.",
    phone: "+49 123 456789",
    organization: "AMEOS Klinikum Ueckermünde"
  },

  // Form responses
  formResponses: {
    // CRITICAL: "ameos" triggers employer billing to AMEOS
    attendee_category: "ameos",

    // Contact (duplicated for form storage)
    salutation: "Herr",
    first_name: "Max",
    last_name: "Mustermann",
    email: "max.mustermann@ameos.de",
    phone: "+49 123 456789",
    title: "Dr.",

    // Professional
    profession: "Facharzt für Allgemeinmedizin",
    position: "Oberarzt",
    organization: "AMEOS Klinikum Ueckermünde",
    department: "Innere Medizin",

    // Address
    street: "Ravensteinstraße 23",
    city: "Ueckermünde",
    postal_code: "17373",
    country: "Deutschland",

    // Event preferences
    arrival_time: "09:00",
    bbq_attendance: true,
    dietary_requirements: "Vegetarisch",
    accommodation_needs: "Einzelzimmer gewünscht",
    activity_day2: "workshop_a",
    ucra_participants: 2,  // Attendee + 1 guest for boat trip

    // Legal
    consent_privacy: true,
    consent_photos: true,

    comments: "Freue mich auf die Veranstaltung"
  },

  // Transaction breakdown
  transactionData: {
    currency: "EUR",
    breakdown: {
      basePrice: 29000,  // €290.00 base ticket
      addons: [
        {
          id: "addon-ucra",
          name: "UCRA Bootsfahrt",
          pricePerUnit: 3000,  // €30.00 per person
          quantity: 2,
          total: 6000  // €60.00 total
        }
      ],
      subtotal: 35000,  // €350.00 (€290 + €60)
      total: 35000      // €350.00 (no tax for employer billing)
    }
  }
};

// Submit to API
const response = await fetch(
  'https://agreeable-lion-828.convex.site/api/v1/events/k17h5y9mp0qm8nqy0g28pypyard7vcpv2/register',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionToken}`
    },
    body: JSON.stringify(registrationData)
  }
);

const result = await response.json();

if (result.success) {
  // Registration successful!
  console.log('Ticket Number:', result.data.ticketNumber);
  console.log('QR Code:', result.data.qrCode);
  console.log('Billing Method:', result.data.billingMethod);

  if (result.data.invoiceNumber) {
    console.log('Invoice Number:', result.data.invoiceNumber);
    // Show message: "Your employer will be invoiced"
  } else {
    // Show message: "Payment confirmed" or "Free registration"
  }
} else {
  // Handle errors
  console.error('Registration failed:', result.error);
  if (result.data?.errors) {
    // Show validation errors to user
    result.data.errors.forEach(err => {
      showFieldError(err.field, err.message);
    });
  }
}
```

---

## 🎯 Attendee Categories & Billing Behavior

The `attendee_category` field is **critical** - it determines how billing is handled:

| Category | Employer | Billing Method | Invoice To |
|----------|----------|----------------|------------|
| `ameos` | AMEOS Klinikum Ueckermünde | Employer Invoice | AMEOS |
| `haffnet` | Haff-Gesundheitsnetzwerk | Employer Invoice | HaffNet |
| `haff_health_network` | Haff-Gesundheitsnetzwerk | Employer Invoice | HaffNet |
| `external` | N/A | Direct Payment | Customer |

**Auto-Detection Process:**
1. Backend reads `attendee_category` from form responses
2. Looks up employer mapping in product's `invoiceConfig.employerMapping`
3. Searches CRM for matching organization by name
4. Uses CRM org ID for invoice generation

**Manual Override:**
If you already know the CRM organization ID, you can skip auto-detection:

```typescript
{
  attendee_category: "ameos",
  crmOrganizationId: "k47m5y9mp0qm8nqy0g28pypyard7vcpv2"  // Override auto-detect
}
```

---

## 📊 Multiple Products Handling

### How It Works

**Frontend sends:**
```typescript
products: [
  { productId: "base_ticket_id", quantity: 1 },
  { productId: "addon_ucra_id", quantity: 2 },
  { productId: "addon_workshop_id", quantity: 1 }
]
```

**Backend processes:**
1. ✅ Creates **one consolidated transaction** with itemized breakdown
2. ✅ Creates **one ticket** with all products listed
3. ✅ Generates **one invoice** (for employer billing) with line items
4. ✅ Calculates total price from all products

**Transaction Record Structure:**
```json
{
  "transactionId": "k375...",
  "customProperties": {
    "products": [
      {
        "productId": "k29j...",
        "productName": "Symposium Ticket",
        "quantity": 1,
        "pricePerUnit": 29000,
        "total": 29000
      },
      {
        "productId": "k39k...",
        "productName": "UCRA Bootsfahrt",
        "quantity": 2,
        "pricePerUnit": 3000,
        "total": 6000
      }
    ],
    "totalInCents": 35000,
    "breakdown": { ... }
  }
}
```

---

## 🔍 Validation Rules

The backend validates all input. Common validation failures:

### Required Fields
- ❌ Missing `email` → "Email is required"
- ❌ Invalid `email` format → "Invalid email format"
- ❌ Missing `firstName` → "First name is required"
- ❌ Missing `lastName` → "Last name is required"
- ❌ Missing `salutation` → "Salutation is required"
- ❌ Missing `consent_privacy` → "Privacy consent is required"

### Category-Specific Requirements
- ❌ External/HaffNet without address → "Billing address is required for this category"
- ❌ Invalid `phone` format → "Invalid phone format"

### Event Constraints
- ❌ Event at capacity → "Event has reached maximum capacity"
- ❌ Event not found → "Event not found"
- ❌ Product not found → "Product not found"

---

## 🧪 Testing

### Test Mode
Use the backend's Test Mode to validate your payload before going live:

1. Open Workflows window in backend UI
2. Click "Test" button on your workflow
3. Select real Event, Products, Form, CRM Org from dropdowns
4. Paste your frontend payload into JSON editor
5. Click "Run Test"
6. Review step-by-step execution results

### Test Credentials
```
Event ID: <get from backend Events window>
Form ID: <get from backend Forms window>
Product IDs: <get from backend Products window>
```

---

## ⚠️ Common Pitfalls

### 1. Wrong Product Price Calculation
```typescript
// ❌ WRONG: Hardcoded total
transactionData: {
  breakdown: {
    total: 35000  // Don't hardcode!
  }
}

// ✅ CORRECT: Calculate from products
const basePrice = 29000;
const addonTotal = 2 * 3000;
transactionData: {
  breakdown: {
    basePrice: basePrice,
    addons: [{ ..., total: addonTotal }],
    subtotal: basePrice + addonTotal,
    total: basePrice + addonTotal
  }
}
```

### 2. Missing Category Field
```typescript
// ❌ WRONG: Missing attendee_category
formResponses: {
  first_name: "Max",
  last_name: "Mustermann"
  // Missing: attendee_category!
}

// ✅ CORRECT: Always include category
formResponses: {
  attendee_category: "ameos",  // REQUIRED!
  first_name: "Max",
  last_name: "Mustermann"
}
```

### 3. Singular Product Instead of Array
```typescript
// ❌ WRONG: Old format (singular)
productId: "k29j..."

// ✅ CORRECT: New format (array)
products: [
  { productId: "k29j...", quantity: 1 }
]
```

---

## 📞 Support

**Questions?** Contact the backend team:
- **Workflow Issues**: Check workflow execution logs in Convex dashboard
- **Validation Errors**: Review the error response `data.errors` array
- **Test Mode**: Use the workflow builder's test panel for debugging

**Backend Convex Dashboard**: https://agreeable-lion-828.convex.cloud

---

## 📝 Changelog

### Version 2.0 (2025-01-17) - BREAKING CHANGES ⚠️
- ⚠️ **BREAKING**: Added `formId` requirement (for form response storage)
- ⚠️ **BREAKING**: Changed `productId` from string to `products` array (multi-product support)
- ✨ **NEW**: Added optional `crmOrganizationId` override (auto-detect with manual override)
- ✨ **NEW**: Consolidated transaction handling for multiple products
- 📊 Updated examples with multi-product scenarios

**Migration Required**: All existing frontend code must be updated to v2.0 format.

### Version 1.0 (2024-12-15)
- 🎉 Initial release
- ✅ Basic event registration workflow
- ✅ Employer billing auto-detection
- ✅ Single product support

---

## 🔄 Migration Guide: v1.0 → v2.0

### Step 1: Add Form ID
```typescript
// Before (v1.0):
const payload = {
  eventId: EVENT_ID,
  productId: PRODUCT_ID,
  // ...
};

// After (v2.0):
const FORM_ID = "form_haffsymposium_2025_registration";  // ← Add constant
const payload = {
  eventId: EVENT_ID,
  formId: FORM_ID,  // ← Add this field
  products: [...],
  // ...
};
```

### Step 2: Convert Product to Array
```typescript
// Before (v1.0):
productId: selectedProductId

// After (v2.0):
products: [
  { productId: selectedProductId, quantity: 1 }
]

// With addons (v2.0):
products: [
  { productId: baseTicketId, quantity: 1 },
  { productId: ucraAddonId, quantity: ucraGuestCount }
]
```

### Step 3: Update Price Calculation
```typescript
// Before (v1.0):
const total = basePrice;

// After (v2.0):
const basePrice = 29000;
const addonTotal = ucraGuestCount * 3000;
const total = basePrice + addonTotal;

transactionData: {
  breakdown: {
    basePrice,
    addons: ucraGuestCount > 0 ? [{
      id: "addon-ucra",
      name: "UCRA Bootsfahrt",
      pricePerUnit: 3000,
      quantity: ucraGuestCount,
      total: addonTotal
    }] : [],
    subtotal: total,
    total: total
  }
}
```

### Step 4: (Optional) Add CRM Org Override
```typescript
// If you already know the CRM org ID:
const payload = {
  // ... other fields
  crmOrganizationId: knownCrmOrgId  // Optional override
};
```
