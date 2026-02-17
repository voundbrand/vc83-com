# Backend Integration Specification
## Event Booking API Endpoint

**Project:** Geschlossene Gesellschaft
**Goal:** Connect frontend booking flow to backend event management system
**Approach:** Option 2 (Hybrid) - Backend records bookings, frontend handles PDF/email

---

## 📋 Overview

This document specifies the new API endpoint needed to integrate your frontend booking system with your backend event management platform. The backend will create transaction, ticket, and CRM records, while the frontend continues to handle PDF generation and email delivery.

### 🔑 Important: Authentication & Organization ID

**For Backend Agents:**
- ✅ Use existing API key authentication system (see `/convex/api/v1/events.ts` for reference)
- ✅ Organization ID comes from `verifyApiKey()` - you don't pass it!
- ✅ Pattern: Get API key from `Authorization: Bearer` header → Call `verifyApiKey()` → Get `organizationId` from result
- ❌ DO NOT use environment variables for organization ID
- ❌ DO NOT parse organization ID from the API key string
- ❌ DO NOT accept organization ID in request body

**Authentication Flow:**
1. Frontend sends: `Authorization: Bearer org_xxx_xxx`
2. Backend calls: `verifyApiKey(apiKey)`
3. Backend receives: `{ organizationId, userId }`
4. Backend uses: `organizationId` for all database operations

This is already working in your other API endpoints - just follow the same pattern!

---

## 🎯 Prerequisites (Create These First)

Before building the booking endpoint, create these in your backend:

### 1. Create Event Object
```typescript
// In your backend admin panel or via mutation
{
  type: "event",
  subtype: "meetup", // or "conference", "workshop", etc.
  organizationId: "your-org-id",
  name: "Geschlossene Gesellschaft - Pasewalk",
  description: "Ein Abend der Begegnungen",
  status: "published", // MUST be published for bookings
  customProperties: {
    startDate: 1704492000000, // Unix timestamp
    endDate: 1704492000000,
    location: "Vound Brand, Am Markt 11, 17309 Pasewalk",
    // These match your frontend display:
    displayDate: "6. Januar 2024",
    displayTime: "19:00 Uhr"
  }
}
```
→ **Save the Event ID** (e.g., `k57evt123...`)

### 2. Create Product Object (Ticket Type)
```typescript
// In your backend admin panel or via mutation
{
  type: "product",
  subtype: "ticket",
  organizationId: "your-org-id",
  name: "Standard Admission",
  description: "General admission to event",
  status: "active",
  customProperties: {
    price: 0, // Free event
    currency: "eur",
    maxQuantity: null // Unlimited
  }
}
```
→ **Save the Product ID** (e.g., `k57prod123...`)

### 3. Link Product to Event
```typescript
// Create objectLink
{
  organizationId: "your-org-id",
  fromObjectId: "k57evt123...", // Event ID
  toObjectId: "k57prod123...",   // Product ID
  linkType: "offers",
  properties: {
    displayOrder: 0,
    isFeatured: true
  }
}
```

---

## 🎯 What You Need to Build

### **NEW ENDPOINT: `POST /api/v1/bookings/create`**

**Location:** Create at `/convex/api/v1/bookings.ts`

**Purpose:**
- Accept Event ID + Product ID + Attendee details
- Create Transaction, Tickets, Purchase Items, CRM Contacts
- Return ticket IDs for frontend PDF generation
- Enable full event management capabilities

---

## 📥 Request Specification

### Request Body

```typescript
{
  // Backend IDs (you created these already!)
  eventId: string,              // Backend event object ID (e.g., "k57evt123...")
  productId: string,            // Backend product ID (e.g., "k57prod123...")

  // Primary Attendee (becomes CRM contact #1)
  primaryAttendee: {
    firstName: string,          // "Max"
    lastName: string,           // "Mustermann"
    email: string,              // "max@example.com" (required)
    phone: string               // "+49123456789"
  },

  // Additional Guests (each becomes a CRM contact)
  guests?: [{
    firstName: string,          // "Anna"
    lastName: string,           // "Schmidt"
    email?: string,             // "anna@example.com" (optional for guests)
    phone: string               // "+49987654321"
  }],

  // Source Tracking
  source: string,               // "web" (or "mobile" later)

  // Optional: Frontend tracking (from your Convex DB)
  frontendRsvpId?: string       // Your Convex RSVP ID for reference
}
```

**That's it!** Event details, pricing, etc. all come from the Event and Product you already created.

### Example Request

```json
{
  "eventId": "k57evt123...",
  "productId": "k57prod123...",
  "primaryAttendee": {
    "firstName": "Max",
    "lastName": "Mustermann",
    "email": "max@example.com",
    "phone": "+49123456789"
  },
  "guests": [
    {
      "firstName": "Anna",
      "lastName": "Schmidt",
      "email": "anna@example.com",
      "phone": "+49987654321"
    }
  ],
  "source": "web",
  "frontendRsvpId": "j_abc123..."
}
```

**Much simpler!** The backend loads all event/product details from the IDs you provide.

---

## 📤 Response Specification

### Success Response (200 OK)

```typescript
{
  success: true,

  // Booking identifiers
  bookingId: string,            // Transaction ID (primary identifier)
  transactionId: string,        // Same as bookingId (for clarity)

  // Ticket details (one per attendee)
  tickets: [{
    ticketId: string,           // Backend ticket object ID
    attendeeName: string,       // "Max Mustermann"
    attendeeEmail?: string,     // "max@example.com" (if provided)
    attendeePhone: string,      // "+49123456789"
    isPrimary: boolean,         // true for primary, false for guests
    qrCode: string              // Ticket ID for QR code generation
  }],

  // Purchase tracking
  purchaseItemIds: string[],    // Purchase item IDs (for fulfillment)

  // CRM integration
  crmContacts: [{
    contactId: string,          // CRM contact object ID
    email: string,
    isPrimary: boolean
  }],

  // Summary
  totalAttendees: number,       // Count including primary + guests

  // Timestamps
  createdAt: number             // Unix timestamp
}
```

### Example Response

```json
{
  "success": true,
  "bookingId": "k57tx123abc...",
  "transactionId": "k57tx123abc...",
  "tickets": [
    {
      "ticketId": "k57tkt001...",
      "attendeeName": "Max Mustermann",
      "attendeeEmail": "max@example.com",
      "attendeePhone": "+49123456789",
      "isPrimary": true,
      "qrCode": "k57tkt001..."
    },
    {
      "ticketId": "k57tkt002...",
      "attendeeName": "Anna Schmidt",
      "attendeeEmail": "anna@example.com",
      "attendeePhone": "+49987654321",
      "isPrimary": false,
      "qrCode": "k57tkt002..."
    }
  ],
  "purchaseItemIds": ["k57pi001...", "k57pi002..."],
  "crmContacts": [
    {
      "contactId": "k57crm001...",
      "email": "max@example.com",
      "isPrimary": true
    },
    {
      "contactId": "k57crm002...",
      "email": "anna@example.com",
      "isPrimary": false
    }
  ],
  "totalAttendees": 2,
  "createdAt": 1704492000000
}
```

### Error Response (400/500)

```json
{
  "success": false,
  "error": "Error message",
  "details": {
    "code": "INVALID_EVENT",
    "message": "Event not found or not published"
  }
}
```

---

## 🏗️ Backend Implementation Guide

### File Structure

Create these files in your backend:

```
/convex/api/v1/
├── bookings.ts          ← NEW: Main booking endpoint
└── bookingsInternal.ts  ← NEW: Internal helper functions
```

### Step 1: Create Internal Helper (`bookingsInternal.ts`)

This file orchestrates the creation of all backend records.

```typescript
/**
 * BOOKINGS INTERNAL
 *
 * Internal mutations for creating complete bookings.
 * Orchestrates Transaction, Ticket, Purchase Item, and CRM Contact creation.
 */

import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * CREATE COMPLETE BOOKING (INTERNAL)
 *
 * Creates all necessary records for a booking:
 * 1. Transaction (for event management)
 * 2. Tickets (one per attendee)
 * 3. Purchase Items (links tickets to transaction)
 * 4. CRM Contacts (for marketing/communication)
 */
export const createCompleteBookingInternal = internalMutation({
  args: {
    organizationId: v.id("organizations"),

    // Backend references (you created these!)
    eventId: v.id("objects"),
    productId: v.id("objects"),

    // Attendees (become CRM contacts)
    primaryAttendee: v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.string(),
      phone: v.string(),
    }),
    guests: v.optional(v.array(v.object({
      firstName: v.string(),
      lastName: v.string(),
      email: v.optional(v.string()),
      phone: v.string(),
    }))),

    // Tracking
    source: v.string(),
    frontendRsvpId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Load event from backend (all details are here!)
    const event = await ctx.db.get(args.eventId);
    if (!event || event.type !== "event") {
      throw new Error("Event not found");
    }
    if (event.status !== "published") {
      throw new Error("Event is not available for booking");
    }

    // Extract event details from backend
    const eventName = event.name;
    const eventDate = event.customProperties?.startDate as number;
    const eventVenue = event.customProperties?.location as string;
    const eventDescription = event.description;

    // 2. Load product from backend (pricing, name, etc.)
    const product = await ctx.db.get(args.productId);
    if (!product || product.type !== "product") {
      throw new Error("Product not found");
    }
    const productName = product.name;
    const priceInCents = (product.customProperties?.price as number) || 0;
    const currency = (product.customProperties?.currency as string) || "eur";

    // 3. Build attendee list
    const allAttendees = [
      { ...args.primaryAttendee, isPrimary: true }
    ];
    if (args.guests && args.guests.length > 0) {
      allAttendees.push(...args.guests.map(g => ({ ...g, isPrimary: false })));
    }

    // 4. Get system user for record creation
    const systemUser = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("email"), "system@l4yercak3.com"))
      .first();
    if (!systemUser) {
      throw new Error("System user not found");
    }

    // 5. Create Transaction record
    const transactionId = await ctx.runMutation(
      internal.transactionOntology.createTransactionInternal,
      {
        organizationId: args.organizationId,
        subtype: "event_booking",

        // Product context
        productId: args.productId,
        productName: productName,
        productDescription: args.eventDescription,
        productSubtype: "ticket",

        // Event context (from backend event object)
        eventId: args.eventId,
        eventName: eventName,
        eventLocation: eventVenue,
        eventStartDate: eventDate,
        eventEndDate: eventDate,

        // Customer (primary attendee)
        customerName: `${args.primaryAttendee.firstName} ${args.primaryAttendee.lastName}`,
        customerEmail: args.primaryAttendee.email,
        customerPhone: args.primaryAttendee.phone,

        // Payer (same as customer for individual bookings)
        payerType: "individual",

        // Financial (from backend product object)
        amountInCents: priceInCents * allAttendees.length,
        currency: currency,
        quantity: allAttendees.length,

        // Payment (free events auto-paid)
        paymentMethod: priceInCents === 0 ? "free" : "pending",
        paymentStatus: priceInCents === 0 ? "paid" : "pending",
      }
    );

    console.log(`✅ Created transaction ${transactionId} for ${allAttendees.length} attendees`);

    // 6. Create Tickets (one per attendee)
    const tickets: Array<{
      ticketId: Id<"objects">;
      attendeeName: string;
      attendeeEmail?: string;
      attendeePhone: string;
      isPrimary: boolean;
      qrCode: string;
    }> = [];

    for (const attendee of allAttendees) {
      const ticketId = await ctx.runMutation(
        internal.ticketOntology.createTicketInternal,
        {
          organizationId: args.organizationId,
          productId: args.productId,
          eventId: args.eventId,
          holderName: `${attendee.firstName} ${attendee.lastName}`,
          holderEmail: attendee.email || `${attendee.firstName.toLowerCase()}.${attendee.lastName.toLowerCase()}@temp.gg`,
          customProperties: {
            holderPhone: attendee.phone,
            bookingSource: args.source,
            frontendRsvpId: args.frontendRsvpId,
            transactionId: transactionId,
          },
          userId: systemUser._id,
        }
      );

      tickets.push({
        ticketId,
        attendeeName: `${attendee.firstName} ${attendee.lastName}`,
        attendeeEmail: attendee.email,
        attendeePhone: attendee.phone,
        isPrimary: attendee.isPrimary,
        qrCode: ticketId, // Use ticket ID as QR code data
      });

      console.log(`✅ Created ticket ${ticketId} for ${attendee.firstName} ${attendee.lastName}`);
    }

    // 7. Create Purchase Items (one per ticket)
    const purchaseItemIds: Id<"objects">[] = [];

    for (let i = 0; i < tickets.length; i++) {
      const attendee = allAttendees[i];
      const ticket = tickets[i];

      const { purchaseItemIds: itemIds } = await ctx.runMutation(
        internal.purchaseOntology.createPurchaseItemInternal,
        {
          organizationId: args.organizationId,
          checkoutSessionId: transactionId, // Link to transaction
          productId: args.productId,
          quantity: 1,
          pricePerUnit: args.totalAmount / allAttendees.length,
          totalPrice: args.totalAmount / allAttendees.length,
          buyerEmail: attendee.email || `${attendee.firstName.toLowerCase()}@temp.gg`,
          buyerName: `${attendee.firstName} ${attendee.lastName}`,
          buyerPhone: attendee.phone,
          fulfillmentType: "ticket",
          registrationData: {
            eventId: args.eventId,
            eventName: args.eventName,
            eventDate: args.eventDate,
            source: args.source,
          },
          userId: systemUser._id,
        }
      );

      purchaseItemIds.push(...itemIds);

      // Link purchase item to ticket
      await ctx.runMutation(
        internal.purchaseOntology.updatePurchaseItemFulfillmentInternal,
        {
          purchaseItemId: itemIds[0],
          fulfillmentData: {
            ticketId: ticket.ticketId,
            ticketCode: ticket.qrCode,
            eventId: args.eventId,
            eventDate: args.eventDate,
          },
        }
      );

      console.log(`✅ Created purchase item ${itemIds[0]} linked to ticket ${ticket.ticketId}`);
    }

    // 8. Create CRM Contacts (for all attendees)
    const crmContacts: Array<{
      contactId: Id<"objects">;
      email: string;
      isPrimary: boolean;
    }> = [];

    for (const attendee of allAttendees) {
      // Build tags
      const tags = ["GG"]; // Base tag for Geschlossene Gesellschaft
      if (!attendee.isPrimary) {
        tags.push("guest");
      }

      try {
        // Create CRM contact via API (uses existing CRM integration)
        const contactResult = await ctx.runAction(
          internal.api.v1.crmInternal.createContactFromEventInternal,
          {
            organizationId: args.organizationId,
            eventId: args.eventId,
            eventName: eventName,
            eventDate: eventDate,
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            email: attendee.email || `${attendee.firstName.toLowerCase()}.${attendee.lastName.toLowerCase()}@temp.gg`,
            phone: attendee.phone,
            tags: tags,
          }
        );

        if (contactResult.success && contactResult.contactId) {
          crmContacts.push({
            contactId: contactResult.contactId as Id<"objects">,
            email: attendee.email || "",
            isPrimary: attendee.isPrimary,
          });
          console.log(`✅ Created CRM contact ${contactResult.contactId}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create CRM contact for ${attendee.firstName}:`, error);
        // Don't fail the entire booking if CRM fails
      }
    }

    // 9. Return complete booking data
    return {
      success: true,
      bookingId: transactionId,
      transactionId: transactionId,
      tickets: tickets,
      purchaseItemIds: purchaseItemIds,
      crmContacts: crmContacts,
      totalAttendees: allAttendees.length,
      createdAt: Date.now(),
    };
  },
});
```

---

### Step 2: Create Public API Endpoint (`bookings.ts`)

This file provides the HTTP endpoint that your frontend will call.

```typescript
/**
 * BOOKINGS API (PUBLIC)
 *
 * Public HTTP endpoint for creating event bookings.
 * Called by frontend after user completes registration form.
 */

import { httpRouter } from "convex/server";
import { httpAction } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const http = httpRouter();

/**
 * POST /api/v1/bookings/create
 *
 * Create a complete event booking with tickets and CRM records.
 */
http.route({
  path: "/api/v1/bookings/create",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // 1. Verify API key (REQUIRED - matches existing /api/v1/events pattern)
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing or invalid Authorization header",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const apiKey = authHeader.substring(7); // Remove "Bearer "
      const authContext = await ctx.runQuery(internal.api.auth.verifyApiKey, {
        apiKey,
      });

      if (!authContext) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid API key",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Organization ID is securely derived from the API key!
      const { organizationId, userId } = authContext;

      // 2. Parse request body
      const body = await request.json();

      // 3. Validate required fields
      const requiredFields = [
        'eventId',        // Backend event ID
        'productId',      // Backend product ID
        'primaryAttendee', // Attendee details
        'source'          // Tracking ("web" or "mobile")
      ];

      for (const field of requiredFields) {
        if (!body[field]) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Missing required field: ${field}`,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      // 4. Validate primary attendee
      if (!body.primaryAttendee.firstName ||
          !body.primaryAttendee.lastName ||
          !body.primaryAttendee.email ||
          !body.primaryAttendee.phone) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Primary attendee must have firstName, lastName, email, and phone",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // 5. Create complete booking
      const result = await ctx.runMutation(
        internal.api.v1.bookingsInternal.createCompleteBookingInternal,
        {
          organizationId,
          eventId: body.eventId as Id<"objects">,
          productId: body.productId as Id<"objects">,
          primaryAttendee: body.primaryAttendee,
          guests: body.guests || [],
          source: body.source,
          frontendRsvpId: body.frontendRsvpId,
        }
      );

      // 6. Return success response
      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": organizationId,
          },
        }
      );
    } catch (error) {
      console.error("Booking creation failed:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          details: {
            code: "BOOKING_FAILED",
            message: "Failed to create booking",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

export default http;
```

---

### Step 3: Register HTTP Routes

Add to your main HTTP router configuration (usually in `convex/http.ts`):

```typescript
import { httpRouter } from "convex/server";
import bookingsHttp from "./api/v1/bookings";

const http = httpRouter();

// Mount bookings routes
http.route({
  path: "/api/v1/bookings",
  method: "POST",
  handler: bookingsHttp,
});

export default http;
```

---

## 🔗 Existing Backend Functions You'll Use

Your backend already has these mutations - you just need to orchestrate them:

### ✅ Already Exists:

1. **`createTransactionInternal`** - [transactionOntology.ts:459](cci:7://file:///Users/foundbrand_001/Development/geschlossene-gesellschaft/docs/vc83-com/convex/transactionOntology.ts:459:0-459:0)
2. **`createTicketInternal`** - [ticketOntology.ts:181](cci:7://file:///Users/foundbrand_001/Development/geschlossene-gesellschaft/docs/vc83-com/convex/ticketOntology.ts:181:0-181:0)
3. **`createPurchaseItemInternal`** - [purchaseOntology.ts:113](cci:7://file:///Users/foundbrand_001/Development/geschlossene-gesellschaft/docs/vc83-com/convex/purchaseOntology.ts:113:0-113:0)
4. **`updatePurchaseItemFulfillmentInternal`** - [purchaseOntology.ts:222](cci:7://file:///Users/foundbrand_001/Development/geschlossene-gesellschaft/docs/vc83-com/convex/purchaseOntology.ts:222:0-222:0)

### ⚠️ Needs Check:

- **CRM Contact Creation** - Check if you have `createContactFromEventInternal` in your CRM API

---

## 🧪 Testing the Endpoint

### Test with cURL:

```bash
curl -X POST https://your-backend.convex.site/api/v1/bookings/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer org_YOUR_ORG_ID_your_api_key_here" \
  -d '{
    "eventId": "k57evt123...",
    "productId": "k57prod123...",
    "primaryAttendee": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "phone": "+49123456789"
    },
    "source": "web"
  }'
```

**Important:** Replace `org_YOUR_ORG_ID_your_api_key_here` with your actual API key!

### Expected Response:

```json
{
  "success": true,
  "bookingId": "k57tx123...",
  "transactionId": "k57tx123...",
  "tickets": [
    {
      "ticketId": "k57tkt001...",
      "attendeeName": "Test User",
      "attendeeEmail": "test@example.com",
      "attendeePhone": "+49123456789",
      "isPrimary": true,
      "qrCode": "k57tkt001..."
    }
  ],
  "purchaseItemIds": ["k57pi001..."],
  "crmContacts": [
    {
      "contactId": "k57crm001...",
      "email": "test@example.com",
      "isPrimary": true
    }
  ],
  "totalAttendees": 1,
  "createdAt": 1704492000000
}
```

---

## 🔐 Security & Authentication

### 1. API Key Authentication (Already Implemented!)

Your backend uses a secure API key system:

**API Key Format:** `org_{organizationId}_{random32chars}`
- Example: `org_j97a2b3c4d5e6f7g8h9i_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

**How It Works:**
1. Frontend sends API key in header: `Authorization: Bearer org_xxx_xxx`
2. Backend calls `internal.api.auth.verifyApiKey` to verify the key
3. API returns `organizationId` and `userId` from the key record
4. **Organization ID is NEVER sent in plain text** - it's derived from the authenticated API key

**Security Features:**
- ✅ API keys stored in dedicated `apiKeys` table
- ✅ Keys track the user who created them (audit trails)
- ✅ Keys can be revoked without affecting data
- ✅ Scoped access - each key only accesses its organization's data
- ✅ Usage tracking (last used, request count)

**Reference Implementation:** See `/convex/api/v1/events.ts` for existing pattern

### 2. Rate Limiting
- Consider adding rate limiting to prevent abuse
- Limit bookings per email/IP per time window

### 3. Validation
- ✅ Validate event is published and available
- ✅ Validate product exists and is active
- ✅ Sanitize all string inputs
- Consider adding duplicate booking detection

---

## 📊 Database Records Created

For each booking, the endpoint creates:

| Table | Type | Count | Purpose |
|-------|------|-------|---------|
| `objects` | `transaction` | 1 | Booking record for event management |
| `objects` | `ticket` | N | One per attendee (primary + guests) |
| `objects` | `purchase_item` | N | One per ticket (fulfillment tracking) |
| `objects` | `crm_contact` | N | One per attendee (marketing) |
| `objectLinks` | `admits_to` | N | Links tickets to event |
| `objectLinks` | `issued_from` | N | Links tickets to product |

**Example for 1 primary + 1 guest:**
- 1 Transaction
- 2 Tickets
- 2 Purchase Items
- 2 CRM Contacts
- 4 Object Links

---

## 🚀 Deployment Checklist

### Before Going Live:

- [ ] **Step 1: Create Event in Backend**
  - Create event object with all details (name, date, location)
  - Set status to "published"
  - Save Event ID

- [ ] **Step 2: Create Product in Backend**
  - Create product (ticket) with pricing
  - Link to event via objectLink
  - Save Product ID

- [ ] **Step 3: Build Booking Endpoint**
  - Create `bookingsInternal.ts` in `/convex/api/v1/`
  - Create `bookings.ts` in `/convex/api/v1/`
  - Register HTTP routes in `convex/http.ts`
  - **Note:** No environment variables needed! Organization ID comes from API key authentication

- [ ] **Step 4: Test**
  - Test endpoint with cURL using your Event/Product IDs
  - Verify Transaction, Tickets, Purchase Items created
  - Check CRM contacts created with correct tags
  - Verify objectLinks created correctly

- [ ] **Step 5: Deploy**
  - Deploy to production
  - Give Event ID + Product ID to frontend team

---

## 🔄 What Frontend Needs to Do

**See separate document:** `FRONTEND_INTEGRATION_GUIDE.md`

Summary:
1. Call `POST /api/v1/bookings/create` FIRST (before PDF/email)
2. Use returned `tickets[].ticketId` in QR codes
3. Use returned `tickets[].qrCode` in PDF generation
4. Continue with existing PDF/email flow

---

## 📞 Support

If you encounter issues:

1. Check Convex dashboard logs for errors
2. Verify all required environment variables are set
3. Test with minimal payload (primary attendee only)
4. Check that system user exists (`system@l4yercak3.com`)
5. Verify event and product IDs are valid

---

## 📝 Notes

- **Free Events:** For free events (totalAmount = 0), payment status is automatically set to "paid"
- **Guest Emails:** If guest doesn't provide email, a temporary email is generated
- **QR Codes:** Ticket IDs are used directly as QR code data (simple and secure)
- **Idempotency:** NOT YET IMPLEMENTED - Add `idempotencyKey` in future version

---

## ❓ FAQ for Backend Agents

### Q: Where do I get the organization ID?
**A:** You DON'T need to get it! The organization ID is automatically extracted from the API key when you call `internal.api.auth.verifyApiKey`. The API key format is `org_{organizationId}_{random}`, and the `verifyApiKey` function returns the `organizationId` from the database record, NOT by parsing the key string.

### Q: Is the organization ID sent in plain text?
**A:** NO! The organization ID is NEVER sent in plain text. It's securely stored in the `apiKeys` table and returned only after the API key is verified. The frontend only sends the API key in the `Authorization: Bearer` header.

### Q: What API key should the frontend use?
**A:** The frontend needs an API key generated by your backend's `generateApiKey` mutation. This key should be stored securely in the frontend's environment variables (e.g., `NEXT_PUBLIC_BACKEND_API_KEY` or similar).

### Q: Does the CRM function signature match the spec?
**A:** The spec shows flat parameters, but the actual `createContactFromEventInternal` function (in `/convex/api/v1/crmInternal.ts`) accepts an `attendeeInfo` object. The implementation code in this spec already uses the correct signature - agents should follow the implementation code, not the simplified examples.

### Q: Does the system user need to exist?
**A:** YES! The code references `system@l4yercak3.com` as the user ID for automated bookings. Make sure this user exists in your `users` table before testing the endpoint.

### Q: Where can I see a working example of API key authentication?
**A:** Check `/convex/api/v1/events.ts` lines 43-66. This shows the exact pattern to use for API key verification.

---

**Document Version:** 1.1
**Last Updated:** 2025-01-11
**Status:** Ready for Implementation
**Changes:** Added API key authentication, clarified organization ID handling, added FAQ section
