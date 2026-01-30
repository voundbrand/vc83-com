# @l4yercak3/sdk

Official SDK for [LayerCake](https://l4yercak3.com) - Backend-as-a-Service for events, CRM, forms, and commerce.

## Installation

```bash
npm install @l4yercak3/sdk
# or
yarn add @l4yercak3/sdk
# or
pnpm add @l4yercak3/sdk
```

## Quick Start

### Environment Variables

```env
NEXT_PUBLIC_L4YERCAK3_API_KEY=sk_...
NEXT_PUBLIC_L4YERCAK3_URL=https://agreeable-lion-828.convex.site
L4YERCAK3_ORG_ID=org_...  # Optional, for server-side
```

### React / Next.js

1. Wrap your app with the provider:

```tsx
// app/layout.tsx
import { L4yercak3Provider } from '@l4yercak3/sdk/react';

export default function RootLayout({ children }) {
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

2. Use the hooks in your components:

```tsx
import { useContacts, useEvents, useCheckout } from '@l4yercak3/sdk/react';

function ContactList() {
  const { contacts, loading, error, fetchContacts } = useContacts();

  useEffect(() => {
    fetchContacts({ status: 'active' });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {contacts.map(contact => (
        <li key={contact.id}>
          {contact.firstName} {contact.lastName}
        </li>
      ))}
    </ul>
  );
}
```

### Server-Side / Node.js

```typescript
import { L4yercak3Client, getL4yercak3Client } from '@l4yercak3/sdk';

// Use the singleton (configured via env vars)
const client = getL4yercak3Client();

// Or create a custom instance
const client = new L4yercak3Client({
  apiKey: 'sk_...',
  organizationId: 'org_...',
});

// Make API calls
const { items: contacts } = await client.contacts.list({ status: 'active' });
const event = await client.events.get('evt_123', { includeProducts: true });
```

## Available Hooks

### CRM

- `useContacts()` - Manage contacts (customers, leads, prospects)
- `useOrganizations()` - Manage B2B organizations

### Events

- `useEvents()` - List and manage events
- `useAttendees()` - Manage event registrations and check-ins

### Forms

- `useForms()` - List and fetch forms
- `useFormSubmissions()` - Handle form submissions

### Commerce

- `useProducts()` - Product catalog
- `useCheckout()` - Shopping cart and checkout sessions
- `useOrders()` - Order management

### Finance

- `useInvoices()` - Invoice management

### Benefits

- `useBenefitClaims()` - Benefit claim management
- `useCommissions()` - Commission payouts

### Certificates

- `useCertificates()` - Certificate management and verification

## TypeScript Types

All types are exported from the main package:

```typescript
import type {
  Contact,
  ContactCreateInput,
  Event,
  Product,
  Order,
  Form,
  FormField,
  Invoice,
  PaginatedResponse,
} from '@l4yercak3/sdk';
```

## API Reference

### Client Methods

```typescript
// Contacts
client.contacts.list(params?)
client.contacts.get(id, options?)
client.contacts.create(data)
client.contacts.update(id, data)
client.contacts.delete(id)
client.contacts.addTags(id, tags)
client.contacts.removeTags(id, tags)

// Organizations
client.organizations.list(params?)
client.organizations.get(id, options?)
client.organizations.create(data)
client.organizations.update(id, data)
client.organizations.delete(id)

// Events
client.events.list(params?)
client.events.get(id, options?)
client.events.create(data)
client.events.update(id, data)
client.events.delete(id)
client.events.getAttendees(eventId, params?)
client.events.checkInAttendee(eventId, attendeeId)

// Forms
client.forms.list(params?)
client.forms.get(id)
client.forms.submit(formId, data)
client.forms.getSubmissions(formId, params?)

// Products
client.products.list(params?)
client.products.get(id)

// Checkout
client.checkout.createSession(data)
client.checkout.getSession(sessionId)

// Orders
client.orders.list(params?)
client.orders.get(id)
client.orders.getByOrderNumber(orderNumber)

// Invoices
client.invoices.list(params?)
client.invoices.get(id)
client.invoices.create(data)
client.invoices.send(id, options?)
client.invoices.markPaid(id, data?)
client.invoices.getPdf(id)
client.invoices.void(id)

// Benefits
client.benefits.listClaims(params?)
client.benefits.getClaim(id)
client.benefits.createClaim(data)
client.benefits.approveClaim(id, notes?)
client.benefits.rejectClaim(id, reason)
client.benefits.listCommissions(params?)
client.benefits.getCommission(id)

// Certificates
client.certificates.list(params?)
client.certificates.get(id)
client.certificates.verify(certificateNumber)
```

## Examples

### Event Registration with Checkout

```tsx
import { useEvents, useProducts, useCheckout } from '@l4yercak3/sdk/react';

function EventRegistration({ eventId }) {
  const { getEvent } = useEvents();
  const { products, fetchProducts } = useProducts();
  const { addToCart, createCheckoutSession, cart } = useCheckout();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    getEvent(eventId, { includeProducts: true }).then(setEvent);
    fetchProducts({ eventId, status: 'active' });
  }, [eventId]);

  const handleRegister = async () => {
    const session = await createCheckoutSession({
      successUrl: '/registration/success',
      cancelUrl: '/registration/cancelled',
    });
    window.location.href = session.checkoutUrl;
  };

  return (
    <div>
      <h1>{event?.name}</h1>
      {products.map(product => (
        <div key={product.id}>
          <span>{product.name}</span>
          <span>${(product.priceInCents / 100).toFixed(2)}</span>
          <button onClick={() => addToCart(product.id)}>
            Add to Cart
          </button>
        </div>
      ))}
      <button onClick={handleRegister} disabled={cart.length === 0}>
        Proceed to Checkout ({cart.length} items)
      </button>
    </div>
  );
}
```

### Contact Form Submission

```tsx
import { useFormSubmissions } from '@l4yercak3/sdk/react';

function ContactForm({ formId }) {
  const { submitForm, isSubmitting, error } = useFormSubmissions();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      await submitForm(formId, data);
      setSubmitted(true);
    } catch (err) {
      // Error is also in the error state
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

## License

MIT
