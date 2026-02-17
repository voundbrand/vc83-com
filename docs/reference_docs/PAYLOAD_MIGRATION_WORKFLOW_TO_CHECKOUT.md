# Migration Guide: Workflow API → Checkout API

## 🎯 Decision: Use Checkout API for Quick Win

**Why Checkout API?**
✅ **Already complete** - Handles tickets, transactions, invoices, emails, CRM, PDFs
✅ **Ship TODAY** - No need to build individual behaviors
✅ **Battle-tested** - Fully working in production
✅ **Minimal changes** - Your payload is 90% compatible

**Future**: You can migrate to behavior-based system later without changing frontend again.

---

## 📊 Your Current Payload (Workflow API)

```javascript
{
  trigger: "api_call",
  inputData: {
    customerData: {
      email: "itsmetherealremington@gmail.com",
      firstName: "Remington",
      lastName: "Splettstoesser",
      organization: "VOUND BRAND UG (haftungsbeschränkt)",
      phone: "015140427103",
      salutation: "Herr",
      title: "Dr."
    },

    eventId: "ns73596xb9xmypy0g28pypyard7vcpv2",
    eventType: "haffsymposium_registration",
    formId: "form_haffsymposium_2025_registration",

    formResponses: {
      attendee_category: "standard",
      salutation: "Herr",
      title: "Dr.",
      first_name: "Remington",
      last_name: "Splettstoesser",
      email: "itsmetherealremington@gmail.com",
      phone: "015140427103",
      organization: "VOUND BRAND UG (haftungsbeschränkt)",
      department: "Inhaber",
      position: "Inhaber",
      profession: "Fachartz",
      country: "Deutschland",
      dietary_requirements: "Vegetarisch",
      accessibility_needs: "Rollstuhl",
      accommodation_needs: "Ja bitte. Doppelbett",
      activity_day2: "workshop_a",
      arrival_time: "20:00",
      bbq_attendance: true,
      ucra_participants: 2,
      billing_street: "Am Markt 11",
      billing_city: "Pasewalk",
      billing_postal_code: "17309",
      billing_country: "Germany",
      consent_photos: true,
      consent_privacy: true,
      newsletter_signup: true,
      special_requests: "keine"
    },

    products: [
      { productId: "ns72v16yzsa6h5w5f0m9156g397vc57s", quantity: 1 },
      { productId: "addon-1763127610845", quantity: 2 }
    ],

    transactionData: {
      currency: "EUR",
      breakdown: {
        basePrice: 15000,
        addons: [
          { id: "addon-1763127610845", name: "UCRA Bootsfahrt", quantity: 2, pricePerUnit: 3000, total: 6000 }
        ],
        subtotal: 21000,
        total: 21000
      }
    },

    metadata: {
      source: "website",
      userAgent: "Mozilla/5.0..."
    }
  }
}
```

---

## ✅ Converted Payload (Checkout API)

```javascript
{
  // BACKEND CONFIG (from env vars)
  organizationId: "YOUR_ORG_ID",  // Get from backend team
  checkoutInstanceId: "YOUR_CHECKOUT_INSTANCE_ID",  // Get from backend team

  // PRODUCTS (flatten your products array)
  productIds: [
    "ns72v16yzsa6h5w5f0m9156g397vc57s",  // Main event ticket
    "addon-1763127610845"                 // UCRA Bootsfahrt addon
  ],
  quantities: [1, 2],  // Matches productIds order

  // CUSTOMER INFO (from customerData)
  customerEmail: "itsmetherealremington@gmail.com",
  customerName: "Herr Dr. Remington Splettstoesser",  // salutation + title + firstName + lastName
  customerPhone: "015140427103",

  // PAYMENT METHOD
  paymentMethod: "free",  // Or "stripe" or "invoice"

  // FORM RESPONSES (ALL registration data)
  formResponses: [
    {
      productId: "ns72v16yzsa6h5w5f0m9156g397vc57s",  // Main ticket
      ticketNumber: 1,
      formId: "form_haffsymposium_2025_registration",
      responses: {
        // Copy ALL fields from your formResponses
        attendee_category: "standard",
        salutation: "Herr",
        title: "Dr.",
        first_name: "Remington",
        last_name: "Splettstoesser",
        email: "itsmetherealremington@gmail.com",
        phone: "015140427103",
        organization: "VOUND BRAND UG (haftungsbeschränkt)",
        department: "Inhaber",
        position: "Inhaber",
        profession: "Fachartz",
        country: "Deutschland",
        dietary_requirements: "Vegetarisch",
        accessibility_needs: "Rollstuhl",
        accommodation_needs: "Ja bitte. Doppelbett",
        activity_day2: "workshop_a",
        arrival_time: "20:00",
        bbq_attendance: true,
        ucra_participants: 2,
        billing_street: "Am Markt 11",
        billing_city: "Pasewalk",
        billing_postal_code: "17309",
        billing_country: "Germany",
        consent_photos: true,
        consent_privacy: true,
        newsletter_signup: true,
        special_requests: "keine"
      },
      addedCosts: 0  // No dynamic pricing from form
    }
  ],

  // B2B FIELDS (if organization provided - triggers B2B invoice)
  transactionType: "B2B",
  companyName: "VOUND BRAND UG (haftungsbeschränkt)",
  billingAddress: {
    line1: "Am Markt 11",
    city: "Pasewalk",
    postalCode: "17309",
    country: "Germany"
  }
}
```

---

## 🚀 Implementation: Payload Mapper

### Step 1: Create Mapper Utility

Create this file in your frontend project:

```typescript
// /src/utils/checkoutPayloadMapper.ts

interface WorkflowPayload {
  trigger: string;
  inputData: {
    customerData: {
      email: string;
      firstName: string;
      lastName: string;
      organization?: string;
      phone?: string;
      salutation?: string;
      title?: string;
    };
    eventId: string;
    eventType: string;
    formId: string;
    formResponses: Record<string, any>;
    products: Array<{ productId: string; quantity: number }>;
    transactionData: {
      currency: string;
      breakdown: {
        basePrice: number;
        addons?: Array<any>;
        subtotal: number;
        total: number;
      };
    };
    metadata?: Record<string, any>;
  };
}

interface CheckoutPayload {
  organizationId: string;
  checkoutInstanceId: string;
  productIds: string[];
  quantities: number[];
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  paymentMethod: 'free' | 'stripe' | 'invoice';
  formResponses: Array<{
    productId: string;
    ticketNumber: number;
    formId?: string;
    responses: Record<string, any>;
    addedCosts: number;
  }>;
  transactionType?: 'B2C' | 'B2B';
  companyName?: string;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
}

export function mapWorkflowToCheckout(
  workflowPayload: WorkflowPayload,
  organizationId: string,
  checkoutInstanceId: string,
  paymentMethod: 'free' | 'stripe' | 'invoice' = 'free'
): CheckoutPayload {
  const { inputData } = workflowPayload;
  const { customerData, formResponses, products, formId } = inputData;

  // Build customer name with salutation and title
  const nameParts = [
    customerData.salutation,
    customerData.title,
    customerData.firstName,
    customerData.lastName,
  ].filter(Boolean);
  const customerName = nameParts.join(' ');

  // Extract product IDs and quantities
  const productIds = products.map(p => p.productId);
  const quantities = products.map(p => p.quantity);

  // Map form responses for main ticket (first product)
  // Note: We only create formResponses for the main ticket, not addons
  const mainProduct = products[0];
  const checkoutFormResponses = [
    {
      productId: mainProduct.productId,
      ticketNumber: 1,
      formId: formId,
      responses: formResponses,  // ALL form data
      addedCosts: 0,  // No dynamic pricing from form (pricing is in products)
    },
  ];

  // Build base payload
  const checkoutPayload: CheckoutPayload = {
    organizationId,
    checkoutInstanceId,
    productIds,
    quantities,
    customerEmail: customerData.email,
    customerName,
    customerPhone: customerData.phone,
    paymentMethod,
    formResponses: checkoutFormResponses,
  };

  // Add B2B fields if organization provided
  if (customerData.organization) {
    checkoutPayload.transactionType = 'B2B';
    checkoutPayload.companyName = customerData.organization;

    // Extract billing address from formResponses
    if (formResponses.billing_street && formResponses.billing_city) {
      checkoutPayload.billingAddress = {
        line1: formResponses.billing_street,
        city: formResponses.billing_city,
        postalCode: formResponses.billing_postal_code,
        country: formResponses.billing_country,
      };
    }
  }

  return checkoutPayload;
}
```

---

### Step 2: Update Your API Integration

Replace your workflow API call with checkout API:

```typescript
// BEFORE: Workflow API
const workflowPayload = {
  trigger: "api_call",
  inputData: {
    customerData: { ... },
    formResponses: { ... },
    products: [ ... ],
    // ...
  }
};

const response = await fetch(`${CONVEX_URL}/api/v1/workflows/trigger`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(workflowPayload),
});
```

```typescript
// AFTER: Checkout API
import { mapWorkflowToCheckout } from '@/utils/checkoutPayloadMapper';

const workflowPayload = {
  trigger: "api_call",
  inputData: {
    customerData: { ... },
    formResponses: { ... },
    products: [ ... ],
    // ...
  }
};

// Convert to checkout payload
const checkoutPayload = mapWorkflowToCheckout(
  workflowPayload,
  process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
  process.env.NEXT_PUBLIC_CHECKOUT_INSTANCE_ID!,
  'free'  // Or 'stripe' or 'invoice' based on your logic
);

// STEP 1: Create checkout session
const createResponse = await fetch(`${CONVEX_URL}/api/v1/checkout/sessions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(checkoutPayload),
});

if (!createResponse.ok) {
  const error = await createResponse.json();
  throw new Error(error.message || 'Failed to create checkout session');
}

const { checkoutSessionId, requiresPayment, clientSecret } = await createResponse.json();

// STEP 2: Confirm payment (for free events)
if (!requiresPayment) {
  const confirmResponse = await fetch(`${CONVEX_URL}/api/v1/checkout/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      checkoutSessionId,
      sessionId: checkoutSessionId,
      paymentIntentId: 'free',
    }),
  });

  if (!confirmResponse.ok) {
    const error = await confirmResponse.json();
    throw new Error(error.message || 'Failed to confirm checkout');
  }

  const result = await confirmResponse.json();

  // SUCCESS!
  console.log('Registration complete:', result);
  return result;
  // {
  //   success: true,
  //   purchasedItemIds: ["ticket_123"],
  //   crmContactId: "contact_xyz",
  //   isGuestRegistration: true,
  //   frontendUserId: "frontend_user_abc",
  //   invoiceType: "none",
  //   downloadUrls: { ... }
  // }
}
```

---

## 🔧 Environment Variables

Add these to your frontend `.env.local`:

```bash
# Convex Backend
NEXT_PUBLIC_CONVEX_URL=https://agreeable-lion-828.convex.site

# API Key (from backend team)
NEXT_PUBLIC_API_KEY=org_j97abc123_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Organization & Checkout Config
NEXT_PUBLIC_ORGANIZATION_ID=j97abc123
NEXT_PUBLIC_CHECKOUT_INSTANCE_ID=k123abc
```

---

## ⚠️ Important Notes

### 1. **Addon Products Handling**

Your payload has multiple products (main ticket + addon):
```javascript
products: [
  { productId: "ns72v16...", quantity: 1 },      // Main ticket
  { productId: "addon-1763127610845", quantity: 2 }  // UCRA Bootsfahrt
]
```

**Checkout API behavior:**
- ✅ `productIds` and `quantities` arrays support multiple products
- ✅ Backend creates separate `purchase_item` records for each
- ✅ All products are included in the same checkout session
- ⚠️ **Only create `formResponses` for the main ticket** (not addons)

**Why?** Addons don't have separate registration data - they're just additional purchases.

### 2. **Transaction Pricing**

Your workflow payload includes pricing breakdown:
```javascript
transactionData: {
  breakdown: {
    basePrice: 15000,      // Main ticket (EUR 150.00)
    addons: [...],         // UCRA addon (EUR 60.00)
    subtotal: 21000,
    total: 21000           // EUR 210.00
  }
}
```

**Checkout API behavior:**
- ✅ Pricing is calculated from product database records
- ✅ Backend validates total matches expected amount
- ✅ No need to send pricing in payload (backend calculates it)

### 3. **Form Fields Preservation**

All your custom form fields are preserved:
- `attendee_category`, `dietary_requirements`, `accessibility_needs`
- `accommodation_needs`, `activity_day2`, `ucra_participants`
- `bbq_attendance`, `arrival_time`, `special_requests`
- Billing address fields
- Consent checkboxes

**These all go in `formResponses[0].responses`** - no changes needed!

---

## ✅ Migration Checklist

### Backend Preparation
- [ ] Get `organizationId` from backend team
- [ ] Get `checkoutInstanceId` for HaffSymposium event
- [ ] Get API key with proper permissions
- [ ] Verify product IDs are correct in database
- [ ] Verify checkout instance is configured

### Frontend Implementation
- [ ] Add environment variables (`.env.local`)
- [ ] Create payload mapper (`/src/utils/checkoutPayloadMapper.ts`)
- [ ] Update API integration to use checkout endpoints
- [ ] Test with free event first
- [ ] Add error handling
- [ ] Test with B2B organization data
- [ ] Update success/confirmation flow

### Testing
- [ ] Test free event registration
- [ ] Verify all form fields are saved
- [ ] Check email confirmation is sent
- [ ] Verify ticket PDF is attached
- [ ] Test with addon products
- [ ] Test B2B invoice generation (if applicable)
- [ ] Verify guest user account creation

---

## 🐛 Debugging

### Check Request Payload

```typescript
console.log('Checkout payload:', JSON.stringify(checkoutPayload, null, 2));
```

### Check Response

```typescript
console.log('Create session response:', createResponse.status);
console.log('Response data:', await createResponse.json());
```

### Common Issues

**Issue**: "Product not found"
**Fix**: Verify `productId` matches database record

**Issue**: "Checkout instance not found"
**Fix**: Verify `checkoutInstanceId` is correct

**Issue**: "Missing required fields"
**Fix**: Check payload structure matches examples

**Issue**: "Invalid API key"
**Fix**: Verify `NEXT_PUBLIC_API_KEY` is correct

---

## 🚀 Next Steps

1. ✅ **Get credentials** from backend team (org ID, checkout instance ID, API key)
2. ✅ **Copy mapper code** to your frontend
3. ✅ **Update API integration** from workflow → checkout
4. ✅ **Test end-to-end** with your HaffSymposium registration
5. ✅ **Ship it!** Go live with working checkout

---

## 📞 Support

**Backend Team**: Provide these values to frontend:
- `organizationId`: Your platform organization ID
- `checkoutInstanceId`: HaffSymposium checkout instance ID
- `API_KEY`: API key with checkout permissions

**Documentation**:
- [Complete API Spec](./api/api-payload-structure.md)
- [Data Flow Diagram](./api/api-data-flow-diagram.md)
- [Testing Examples](./API_TESTING_EXAMPLES.md)

---

## 💡 Why This Works Better Than Workflow API

| Feature | Workflow API | Checkout API |
|---------|--------------|--------------|
| **Ticket Creation** | ❌ Manual | ✅ Automatic |
| **Email Sending** | ❌ Manual | ✅ Automatic |
| **Invoice Generation** | ❌ Manual | ✅ Automatic |
| **CRM Integration** | ❌ Manual | ✅ Automatic |
| **Transaction Records** | ❌ Manual | ✅ Automatic |
| **PDF Generation** | ❌ Manual | ✅ Automatic |
| **Payment Processing** | ❌ Limited | ✅ Full support |
| **Guest User Creation** | ❌ No | ✅ Automatic |
| **Multi-product Support** | ⚠️ Limited | ✅ Full support |

**Bottom line**: Checkout API is fully built and tested. Use it now, migrate to behaviors later if needed.
