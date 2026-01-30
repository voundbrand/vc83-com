# @l4yercak3/sdk React Hooks Reference

Complete reference for all React hooks provided by `@l4yercak3/sdk/react`.

## Table of Contents

- [Setup](#setup)
- [Provider](#provider)
- [CRM Hooks](#crm-hooks)
  - [useContacts](#usecontacts)
  - [useOrganizations](#useorganizations)
- [Event Hooks](#event-hooks)
  - [useEvents](#useevents)
  - [useAttendees](#useattendees)
- [Form Hooks](#form-hooks)
  - [useForms](#useforms)
  - [useFormSubmissions](#useformsubmissions)
- [Commerce Hooks](#commerce-hooks)
  - [useProducts](#useproducts)
  - [useCheckout](#usecheckout)
  - [useOrders](#useorders)
- [Finance Hooks](#finance-hooks)
  - [useInvoices](#useinvoices)
- [Benefits Hooks](#benefits-hooks)
  - [useBenefitClaims](#usebenefitclaims)
  - [useCommissions](#usecommissions)
- [Certificate Hooks](#certificate-hooks)
  - [useCertificates](#usecertificates)

---

## Setup

### Installation

```bash
npm install @l4yercak3/sdk
```

### Environment Variables

```env
NEXT_PUBLIC_L4YERCAK3_API_KEY=sk_live_...
NEXT_PUBLIC_L4YERCAK3_URL=https://agreeable-lion-828.convex.site
```

---

## Provider

Wrap your application with `L4yercak3Provider` to use any hooks.

```tsx
// app/layout.tsx (Next.js App Router)
import { L4yercak3Provider } from '@l4yercak3/sdk/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <L4yercak3Provider>
          {children}
        </L4yercak3Provider>
      </body>
    </html>
  );
}
```

### Provider Props

| Prop | Type | Description |
|------|------|-------------|
| `apiKey` | `string` | API key (overrides env var) |
| `organizationId` | `string` | Organization ID (overrides env var) |
| `baseUrl` | `string` | Backend URL (overrides env var) |
| `client` | `L4yercak3Client` | Pre-configured client instance |

### Accessing the Client Directly

```tsx
import { useL4yercak3, useL4yercak3Client } from '@l4yercak3/sdk/react';

function MyComponent() {
  // Get client and context
  const { client, organizationId } = useL4yercak3();

  // Or just the client
  const client = useL4yercak3Client();
}
```

---

## CRM Hooks

### useContacts

Manage CRM contacts.

```tsx
import { useContacts } from '@l4yercak3/sdk/react';

function ContactList() {
  const {
    contacts,        // Contact[] - Current list
    loading,         // boolean - Request in progress
    error,           // Error | null - Last error
    total,           // number - Total count
    hasMore,         // boolean - More available
    fetchContacts,   // (params?) => Promise<PaginatedResponse>
    getContact,      // (id) => Promise<Contact>
    createContact,   // (data) => Promise<Contact>
    updateContact,   // (id, data) => Promise<Contact>
    deleteContact,   // (id) => Promise<void>
    addTags,         // (id, tags) => Promise<Contact>
    removeTags,      // (id, tags) => Promise<Contact>
    clearError,      // () => void
  } = useContacts();

  useEffect(() => {
    fetchContacts({ status: 'active', limit: 20 });
  }, []);

  const handleCreate = async () => {
    const contact = await createContact({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
    // contact is automatically added to contacts array
  };

  return (
    <div>
      {loading && <Spinner />}
      {error && <Alert>{error.message}</Alert>}
      {contacts.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </div>
  );
}
```

### useOrganizations

Manage B2B organizations.

```tsx
import { useOrganizations } from '@l4yercak3/sdk/react';

function OrganizationList() {
  const {
    organizations,
    loading,
    error,
    total,
    hasMore,
    fetchOrganizations,
    getOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    clearError,
  } = useOrganizations();

  useEffect(() => {
    fetchOrganizations({ subtype: 'customer' });
  }, []);

  return (
    <ul>
      {organizations.map(org => (
        <li key={org.id}>{org.name}</li>
      ))}
    </ul>
  );
}
```

---

## Event Hooks

### useEvents

Manage events.

```tsx
import { useEvents } from '@l4yercak3/sdk/react';

function EventList() {
  const {
    events,
    loading,
    error,
    total,
    hasMore,
    fetchEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    clearError,
  } = useEvents();

  useEffect(() => {
    fetchEvents({ status: 'published' });
  }, []);

  const loadEventDetails = async (eventId: string) => {
    const event = await getEvent(eventId, {
      includeProducts: true,
      includeSponsors: true,
    });
    return event;
  };

  return (
    <div className="grid gap-4">
      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
```

### useAttendees

Manage event attendees and check-ins.

```tsx
import { useAttendees } from '@l4yercak3/sdk/react';

function AttendeeList({ eventId }: { eventId: string }) {
  const {
    attendees,
    loading,
    error,
    total,
    hasMore,
    fetchAttendees,
    checkIn,
    cancelRegistration,
    clearError,
  } = useAttendees();

  useEffect(() => {
    fetchAttendees(eventId, { status: 'registered' });
  }, [eventId]);

  const handleCheckIn = async (attendeeId: string) => {
    await checkIn(eventId, attendeeId);
    // attendee status automatically updated in array
  };

  return (
    <table>
      <tbody>
        {attendees.map(attendee => (
          <tr key={attendee.id}>
            <td>{attendee.contact.firstName} {attendee.contact.lastName}</td>
            <td>{attendee.ticketName}</td>
            <td>{attendee.status}</td>
            <td>
              {attendee.status === 'registered' && (
                <button onClick={() => handleCheckIn(attendee.id)}>
                  Check In
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Form Hooks

### useForms

Fetch forms.

```tsx
import { useForms } from '@l4yercak3/sdk/react';

function FormList() {
  const {
    forms,
    loading,
    error,
    total,
    hasMore,
    fetchForms,
    getForm,
    clearError,
  } = useForms();

  useEffect(() => {
    fetchForms({ status: 'published', eventId: 'event_123' });
  }, []);

  return (
    <div>
      {forms.map(form => (
        <FormCard key={form.id} form={form} />
      ))}
    </div>
  );
}
```

### useFormSubmissions

Submit forms and view submissions.

```tsx
import { useFormSubmissions } from '@l4yercak3/sdk/react';

function ContactForm({ formId }: { formId: string }) {
  const {
    submissions,
    loading,
    isSubmitting,    // Separate state for form submission
    error,
    total,
    hasMore,
    fetchSubmissions,
    submitForm,
    clearError,
  } = useFormSubmissions();

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      await submitForm(formId, data);
      setSubmitted(true);
    } catch (err) {
      // Error is available in error state
    }
  };

  if (submitted) {
    return <div>Thank you for your submission!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="firstName" placeholder="First Name" required />
      <input name="lastName" placeholder="Last Name" required />
      <input name="email" type="email" placeholder="Email" required />

      {error && <div className="error">{error.message}</div>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}
```

---

## Commerce Hooks

### useProducts

Fetch products.

```tsx
import { useProducts } from '@l4yercak3/sdk/react';

function ProductCatalog({ eventId }: { eventId: string }) {
  const {
    products,
    loading,
    error,
    total,
    hasMore,
    fetchProducts,
    getProduct,
    clearError,
  } = useProducts();

  useEffect(() => {
    fetchProducts({ eventId, status: 'active' });
  }, [eventId]);

  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### useCheckout

Shopping cart and checkout session management.

```tsx
import { useCheckout } from '@l4yercak3/sdk/react';

function ShoppingCart() {
  const {
    cart,                   // CartItem[] - Current cart items
    isCreatingCheckout,     // boolean - Checkout creation in progress
    error,
    checkoutSession,        // CheckoutSession | null
    addToCart,              // (productId, quantity?) => void
    removeFromCart,         // (productId) => void
    updateQuantity,         // (productId, quantity) => void
    clearCart,              // () => void
    createCheckoutSession,  // (options) => Promise<CheckoutSession>
    getCheckoutSession,     // (sessionId) => Promise<CheckoutSession>
    clearError,
  } = useCheckout();

  const handleAddToCart = (productId: string) => {
    addToCart(productId, 1);
  };

  const handleCheckout = async () => {
    try {
      const session = await createCheckoutSession({
        successUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout/cancelled`,
        email: 'customer@example.com', // Optional for guest checkout
      });

      // Redirect to Stripe checkout
      window.location.href = session.checkoutUrl;
    } catch (err) {
      // Handle error
    }
  };

  return (
    <div>
      <h2>Cart ({cart.length} items)</h2>

      {cart.map(item => (
        <div key={item.productId}>
          <span>Product: {item.productId}</span>
          <span>Qty: {item.quantity}</span>
          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</button>
          <button onClick={() => removeFromCart(item.productId)}>Remove</button>
        </div>
      ))}

      <button
        onClick={handleCheckout}
        disabled={cart.length === 0 || isCreatingCheckout}
      >
        {isCreatingCheckout ? 'Creating checkout...' : 'Proceed to Checkout'}
      </button>
    </div>
  );
}
```

### useOrders

View orders.

```tsx
import { useOrders } from '@l4yercak3/sdk/react';

function OrderHistory({ contactId }: { contactId: string }) {
  const {
    orders,
    loading,
    error,
    total,
    hasMore,
    fetchOrders,
    getOrder,
    getOrderByNumber,
    clearError,
  } = useOrders();

  useEffect(() => {
    fetchOrders({ contactId, status: 'paid' });
  }, [contactId]);

  return (
    <div>
      {orders.map(order => (
        <div key={order.id}>
          <span>Order #{order.orderNumber}</span>
          <span>${(order.totalInCents / 100).toFixed(2)}</span>
          <span>{order.status}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Finance Hooks

### useInvoices

Manage invoices.

```tsx
import { useInvoices } from '@l4yercak3/sdk/react';

function InvoiceList({ organizationId }: { organizationId: string }) {
  const {
    invoices,
    loading,
    error,
    total,
    hasMore,
    fetchInvoices,
    getInvoice,
    createInvoice,
    sendInvoice,
    markPaid,
    getPdf,
    voidInvoice,
    clearError,
  } = useInvoices();

  useEffect(() => {
    fetchInvoices({ organizationId, status: 'sent' });
  }, [organizationId]);

  const handleDownloadPdf = async (invoiceId: string) => {
    const { pdfUrl } = await getPdf(invoiceId);
    window.open(pdfUrl, '_blank');
  };

  const handleMarkPaid = async (invoiceId: string) => {
    await markPaid(invoiceId, {
      paymentMethod: 'bank_transfer',
      paymentReference: 'TXN-123',
    });
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Invoice #</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map(invoice => (
          <tr key={invoice.id}>
            <td>{invoice.number}</td>
            <td>${(invoice.totalInCents / 100).toFixed(2)}</td>
            <td>{invoice.status}</td>
            <td>
              <button onClick={() => handleDownloadPdf(invoice.id)}>PDF</button>
              {invoice.status === 'sent' && (
                <button onClick={() => handleMarkPaid(invoice.id)}>Mark Paid</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## Benefits Hooks

### useBenefitClaims

Manage benefit claims.

```tsx
import { useBenefitClaims } from '@l4yercak3/sdk/react';

function ClaimsList({ memberId }: { memberId: string }) {
  const {
    claims,
    loading,
    error,
    total,
    hasMore,
    fetchClaims,
    getClaim,
    createClaim,
    approveClaim,
    rejectClaim,
    clearError,
  } = useBenefitClaims();

  useEffect(() => {
    fetchClaims({ memberId, status: 'pending' });
  }, [memberId]);

  const handleSubmitClaim = async () => {
    await createClaim({
      memberId,
      benefitType: 'medical',
      amountInCents: 15000,
      description: 'Doctor visit',
    });
  };

  return (
    <div>
      {claims.map(claim => (
        <div key={claim.id}>
          <span>{claim.benefitType}</span>
          <span>${(claim.amountInCents / 100).toFixed(2)}</span>
          <span>{claim.status}</span>
        </div>
      ))}
    </div>
  );
}
```

### useCommissions

View commission payouts.

```tsx
import { useCommissions } from '@l4yercak3/sdk/react';

function CommissionHistory({ memberId }: { memberId: string }) {
  const {
    commissions,
    loading,
    error,
    total,
    hasMore,
    fetchCommissions,
    getCommission,
    clearError,
  } = useCommissions();

  useEffect(() => {
    fetchCommissions({ memberId, status: 'completed' });
  }, [memberId]);

  return (
    <ul>
      {commissions.map(commission => (
        <li key={commission.id}>
          {commission.commissionType}: ${(commission.amountInCents / 100).toFixed(2)}
        </li>
      ))}
    </ul>
  );
}
```

---

## Certificate Hooks

### useCertificates

Manage and verify certificates.

```tsx
import { useCertificates } from '@l4yercak3/sdk/react';

function CertificateList({ recipientId }: { recipientId: string }) {
  const {
    certificates,
    loading,
    error,
    total,
    hasMore,
    fetchCertificates,
    getCertificate,
    verifyCertificate,
    clearError,
  } = useCertificates();

  useEffect(() => {
    fetchCertificates({ recipientId });
  }, [recipientId]);

  const handleVerify = async (certNumber: string) => {
    try {
      const cert = await verifyCertificate(certNumber);
      alert(`Valid certificate for ${cert.recipientName}`);
    } catch {
      alert('Certificate not found or invalid');
    }
  };

  return (
    <div className="grid gap-4">
      {certificates.map(cert => (
        <div key={cert.id}>
          <span>{cert.certificateNumber}</span>
          <span>{cert.type}</span>
          <span>{cert.courseName || cert.eventName}</span>
          {cert.pdfUrl && (
            <a href={cert.pdfUrl} target="_blank">Download</a>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Common Patterns

### Loading States

All hooks provide a `loading` boolean:

```tsx
const { loading, contacts } = useContacts();

if (loading) {
  return <Spinner />;
}
```

### Error Handling

All hooks provide `error` and `clearError`:

```tsx
const { error, clearError, fetchContacts } = useContacts();

if (error) {
  return (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={clearError}>Dismiss</button>
      <button onClick={() => fetchContacts()}>Retry</button>
    </div>
  );
}
```

### Pagination

All list hooks provide `total` and `hasMore`:

```tsx
const { contacts, total, hasMore, fetchContacts } = useContacts();
const [offset, setOffset] = useState(0);

const loadMore = () => {
  const newOffset = offset + 20;
  setOffset(newOffset);
  fetchContacts({ offset: newOffset, limit: 20 });
};

return (
  <div>
    <p>Showing {contacts.length} of {total}</p>
    {contacts.map(c => <ContactCard key={c.id} contact={c} />)}
    {hasMore && <button onClick={loadMore}>Load More</button>}
  </div>
);
```

### Optimistic Updates

Mutation hooks automatically update local state:

```tsx
const { contacts, createContact, deleteContact } = useContacts();

// After createContact(), new contact is automatically in contacts[]
// After deleteContact(), contact is automatically removed from contacts[]
```
