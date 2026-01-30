# @l4yercak3/sdk API Reference

Complete API reference for the LayerCake SDK client.

## Table of Contents

- [Client Configuration](#client-configuration)
- [Contacts API](#contacts-api)
- [Organizations API](#organizations-api)
- [Events API](#events-api)
- [Forms API](#forms-api)
- [Products API](#products-api)
- [Checkout API](#checkout-api)
- [Orders API](#orders-api)
- [Invoices API](#invoices-api)
- [Benefits API](#benefits-api)
- [Certificates API](#certificates-api)
- [Error Handling](#error-handling)

---

## Client Configuration

### Creating a Client

```typescript
import { L4yercak3Client, getL4yercak3Client, createL4yercak3Client } from '@l4yercak3/sdk';

// Option 1: Use singleton (configured via environment variables)
const client = getL4yercak3Client();

// Option 2: Create with explicit configuration
const client = new L4yercak3Client({
  apiKey: 'sk_live_...',
  baseUrl: 'https://agreeable-lion-828.convex.site', // optional
  organizationId: 'org_...', // optional
});

// Option 3: Factory function
const client = createL4yercak3Client({ apiKey: 'sk_...' });
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_L4YERCAK3_API_KEY` | API key for client-side usage | Yes |
| `L4YERCAK3_API_KEY` | API key for server-side usage | Yes (if no public key) |
| `NEXT_PUBLIC_L4YERCAK3_URL` | Backend URL | No (defaults to production) |
| `L4YERCAK3_ORG_ID` | Default organization ID | No |

---

## Contacts API

Manage CRM contacts (customers, leads, prospects, partners).

### List Contacts

```typescript
const { items, total, hasMore } = await client.contacts.list({
  status: 'active',           // 'active' | 'inactive' | 'unsubscribed' | 'archived'
  subtype: 'customer',        // 'customer' | 'lead' | 'prospect' | 'partner'
  search: 'john',             // Search by name or email
  tags: ['vip', 'sponsor'],   // Filter by tags
  limit: 20,
  offset: 0,
});
```

### Get Contact

```typescript
const contact = await client.contacts.get('contact_id', {
  includeActivities: true,
  includeNotes: true,
  includeOrganization: true,
});
```

### Create Contact

```typescript
const contact = await client.contacts.create({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  company: 'Acme Inc',
  jobTitle: 'CEO',
  subtype: 'lead',
  tags: ['conference-2024'],
  customFields: { source: 'website' },
});
```

### Update Contact

```typescript
const updated = await client.contacts.update('contact_id', {
  status: 'active',
  tags: ['vip'],
});
```

### Delete Contact

```typescript
await client.contacts.delete('contact_id');
```

### Manage Tags

```typescript
// Add tags
await client.contacts.addTags('contact_id', ['vip', 'sponsor']);

// Remove tags
await client.contacts.removeTags('contact_id', ['prospect']);
```

---

## Organizations API

Manage B2B organizations.

### List Organizations

```typescript
const { items } = await client.organizations.list({
  subtype: 'customer',  // 'customer' | 'prospect' | 'partner' | 'vendor'
  search: 'acme',
  limit: 20,
});
```

### Get Organization

```typescript
const org = await client.organizations.get('org_id', {
  includeContacts: true,
});
```

### Create Organization

```typescript
const org = await client.organizations.create({
  name: 'Acme Corporation',
  website: 'https://acme.com',
  industry: 'Technology',
  size: 'enterprise',  // 'small' | 'medium' | 'large' | 'enterprise'
  subtype: 'customer',
  address: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94102',
    country: 'US',
  },
  taxId: 'US123456789',
  billingEmail: 'billing@acme.com',
});
```

### Update Organization

```typescript
const updated = await client.organizations.update('org_id', {
  size: 'large',
});
```

### Delete Organization

```typescript
await client.organizations.delete('org_id');
```

---

## Events API

Manage events (conferences, workshops, webinars, etc.).

### List Events

```typescript
const { items } = await client.events.list({
  status: 'published',  // 'draft' | 'published' | 'cancelled' | 'completed'
  fromDate: '2024-01-01',
  toDate: '2024-12-31',
  limit: 10,
});
```

### Get Event

```typescript
const event = await client.events.get('event_id', {
  includeProducts: true,   // Include ticket types
  includeSponsors: true,
  includeForms: true,
});
```

### Create Event

```typescript
const event = await client.events.create({
  name: 'Tech Conference 2024',
  description: 'Annual technology conference...',
  shortDescription: 'The biggest tech event of the year',
  startDate: '2024-06-15T09:00:00Z',
  endDate: '2024-06-17T18:00:00Z',
  timezone: 'America/New_York',
  location: 'San Francisco, CA',
  venue: {
    name: 'Moscone Center',
    address: { city: 'San Francisco', state: 'CA' },
    capacity: 5000,
  },
  subtype: 'conference',  // 'conference' | 'workshop' | 'webinar' | 'meetup' | 'seminar' | 'other'
  maxCapacity: 1000,
  imageUrl: 'https://...',
  tags: ['tech', '2024'],
});
```

### Update Event

```typescript
const updated = await client.events.update('event_id', {
  status: 'published',
  maxCapacity: 1500,
});
```

### Delete Event

```typescript
await client.events.delete('event_id');
```

### Get Event Attendees

```typescript
const { items: attendees } = await client.events.getAttendees('event_id', {
  status: 'registered',  // 'registered' | 'checked_in' | 'cancelled' | 'no_show'
  limit: 100,
});
```

### Check In Attendee

```typescript
const attendee = await client.events.checkInAttendee('event_id', 'attendee_id');
// Returns updated attendee with status: 'checked_in' and checkedInAt timestamp
```

### Cancel Attendee Registration

```typescript
const attendee = await client.events.cancelAttendee('event_id', 'attendee_id');
```

---

## Forms API

Manage forms and submissions.

### List Forms

```typescript
const { items } = await client.forms.list({
  status: 'published',  // 'draft' | 'published' | 'closed'
  eventId: 'event_id',  // Filter by associated event
  subtype: 'registration',  // 'registration' | 'survey' | 'application' | 'feedback' | 'contact' | 'custom'
  limit: 20,
});
```

### Get Form

```typescript
const form = await client.forms.get('form_id');
// Returns form with fields array containing field definitions
```

### Submit Form

```typescript
const submission = await client.forms.submit('form_id', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  // ... form field values
});
```

### Get Form Submissions

```typescript
const { items: submissions } = await client.forms.getSubmissions('form_id', {
  status: 'submitted',  // 'submitted' | 'reviewed' | 'approved' | 'rejected'
  limit: 50,
});
```

### Get Single Submission

```typescript
const submission = await client.forms.getSubmission('form_id', 'submission_id');
```

---

## Products API

Manage products (tickets, merchandise, etc.).

### List Products

```typescript
const { items } = await client.products.list({
  eventId: 'event_id',  // Filter by event
  status: 'active',     // 'active' | 'sold_out' | 'hidden' | 'archived'
  category: 'tickets',
  limit: 20,
});
```

### Get Product

```typescript
const product = await client.products.get('product_id');
```

---

## Checkout API

Create and manage checkout sessions.

### Create Checkout Session

```typescript
const session = await client.checkout.createSession({
  items: [
    { productId: 'prod_123', quantity: 2 },
    { productId: 'prod_456', quantity: 1 },
  ],
  contactId: 'contact_id',  // Optional: link to existing contact
  email: 'john@example.com', // Optional: for guest checkout
  successUrl: 'https://yoursite.com/checkout/success',
  cancelUrl: 'https://yoursite.com/checkout/cancelled',
  metadata: {
    campaign: 'early-bird',
  },
});

// Redirect to Stripe checkout
window.location.href = session.checkoutUrl;
```

### Get Checkout Session

```typescript
const session = await client.checkout.getSession('session_id');
// session.status: 'open' | 'complete' | 'expired'
// session.order: Order object if complete
```

---

## Orders API

View and manage orders.

### List Orders

```typescript
const { items } = await client.orders.list({
  contactId: 'contact_id',
  status: 'paid',  // 'pending' | 'paid' | 'partially_refunded' | 'refunded' | 'cancelled'
  fromDate: '2024-01-01',
  toDate: '2024-12-31',
  limit: 50,
});
```

### Get Order

```typescript
const order = await client.orders.get('order_id');
```

### Get Order by Order Number

```typescript
const order = await client.orders.getByOrderNumber('ORD-2024-0001');
```

---

## Invoices API

Manage invoices.

### List Invoices

```typescript
const { items } = await client.invoices.list({
  contactId: 'contact_id',
  organizationId: 'org_id',
  status: 'sent',  // 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled' | 'void'
  type: 'b2b',     // 'b2b' | 'b2c'
  limit: 50,
});
```

### Get Invoice

```typescript
const invoice = await client.invoices.get('invoice_id');
```

### Create Invoice

```typescript
const invoice = await client.invoices.create({
  organizationId: 'org_id',  // For B2B
  contactId: 'contact_id',   // For B2C
  type: 'b2b',
  dueDate: '2024-02-15',
  lineItems: [
    {
      description: 'Consulting Services - January',
      quantity: 40,
      unitPriceInCents: 15000,  // $150.00
      taxable: true,
    },
  ],
  taxRate: 8.5,  // 8.5%
  notes: 'Thank you for your business!',
  terms: 'Net 30',
});
```

### Send Invoice

```typescript
await client.invoices.send('invoice_id', {
  emailTo: 'billing@client.com',  // Optional: override default
  message: 'Please find attached...',  // Optional: custom message
});
```

### Mark Invoice Paid

```typescript
const invoice = await client.invoices.markPaid('invoice_id', {
  paidAt: '2024-01-20T10:30:00Z',
  paymentMethod: 'wire_transfer',
  paymentReference: 'TXN-123456',
});
```

### Get Invoice PDF

```typescript
const { pdfUrl } = await client.invoices.getPdf('invoice_id');
// pdfUrl is a signed URL valid for limited time
```

### Void Invoice

```typescript
const invoice = await client.invoices.void('invoice_id');
```

---

## Benefits API

Manage benefit claims and commission payouts.

### List Benefit Claims

```typescript
const { items } = await client.benefits.listClaims({
  memberId: 'member_id',
  status: 'pending',  // 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid' | 'cancelled'
  benefitType: 'medical',
  limit: 50,
});
```

### Get Benefit Claim

```typescript
const claim = await client.benefits.getClaim('claim_id');
```

### Create Benefit Claim

```typescript
const claim = await client.benefits.createClaim({
  memberId: 'member_id',
  benefitType: 'medical',
  benefitPlanId: 'plan_id',
  amountInCents: 25000,  // $250.00
  currency: 'USD',
  description: 'Doctor visit - annual checkup',
  receiptUrl: 'https://...',
  supportingDocuments: ['https://...', 'https://...'],
});
```

### Approve Benefit Claim

```typescript
const claim = await client.benefits.approveClaim('claim_id', 'Approved - all documentation complete');
```

### Reject Benefit Claim

```typescript
const claim = await client.benefits.rejectClaim('claim_id', 'Missing receipt documentation');
```

### List Commission Payouts

```typescript
const { items } = await client.benefits.listCommissions({
  memberId: 'member_id',
  status: 'completed',  // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  limit: 50,
});
```

### Get Commission Payout

```typescript
const commission = await client.benefits.getCommission('commission_id');
```

---

## Certificates API

Manage and verify certificates.

### List Certificates

```typescript
const { items } = await client.certificates.list({
  recipientId: 'recipient_id',
  eventId: 'event_id',
  limit: 50,
});
```

### Get Certificate

```typescript
const certificate = await client.certificates.get('certificate_id');
```

### Verify Certificate

```typescript
const certificate = await client.certificates.verify('CERT-2024-0001');
// Returns certificate if valid, throws error if not found
```

---

## Error Handling

All API methods throw `L4yercak3Error` on failure.

```typescript
import { L4yercak3Error } from '@l4yercak3/sdk';

try {
  const contact = await client.contacts.get('invalid_id');
} catch (error) {
  if (error instanceof L4yercak3Error) {
    console.error('Status:', error.status);     // HTTP status code
    console.error('Message:', error.message);   // Error message
    console.error('Code:', error.code);         // Error code (if available)
    console.error('Details:', error.details);   // Additional error details
  }
}
```

### Common Error Codes

| Status | Description |
|--------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API key |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |
