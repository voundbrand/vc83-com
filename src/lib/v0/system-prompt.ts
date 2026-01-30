/**
 * v0 System Prompt Template
 *
 * This module provides the system prompt that teaches v0 about the LayerCake SDK,
 * enabling it to generate production-ready code that integrates with the LayerCake backend.
 */

// ============ Types ============

/** Context about the user's organization for prompt injection */
export interface OrganizationContext {
  id: string;
  name: string;
  website?: string;
  industry?: string;
}

/** Context about available events */
export interface EventContext {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  ticketCount?: number;
}

/** Context about available forms */
export interface FormContext {
  id: string;
  name: string;
  subtype: string;
  fieldCount: number;
  eventId?: string;
}

/** Context about available products */
export interface ProductContext {
  id: string;
  name: string;
  priceInCents: number;
  category?: string;
  eventId?: string;
  status: string;
}

/** BrandScript based on Donald Miller's StoryBrand framework */
export interface BrandScript {
  character?: {
    identity: string;
    wants: string;
    demographics?: string;
  };
  problem?: {
    villain?: string;
    external: string;
    internal: string;
    philosophical?: string;
  };
  guide?: {
    empathy: string;
    authority: string;
    credentials?: string[];
    testimonialHighlight?: string;
  };
  plan?: {
    steps: Array<{ title: string; description: string }>;
  };
  callToAction?: {
    direct: string;
    directUrl?: string;
    transitional?: string;
    transitionalUrl?: string;
  };
  success?: {
    outcome: string;
    transformation: string;
    results?: string[];
  };
  failure?: {
    consequence: string;
    pain?: string;
  };
  voice?: {
    tone: string;
    personality: string[];
    avoidWords?: string[];
    preferWords?: string[];
  };
  oneLiners?: {
    tagline?: string;
    elevatorPitch?: string;
    problemSolution?: string;
  };
  // Marketing Made Simple one-liner formula
  oneLiner?: {
    problem: string;
    product: string;
    result: string;
    fullOneLiner?: string;
  };
}

/** Sales Funnel based on Marketing Made Simple (Donald Miller) */
export interface SalesFunnel {
  oneLiner?: {
    problem: string;
    product: string;
    result: string;
    fullStatement: string;
  };
  websiteWireframe?: {
    header?: {
      headline: string;
      subheadline: string;
      primaryCta: string;
      secondaryCta?: string;
    };
    stakes?: {
      problemStatement: string;
      emotionalImpact: string;
      whyItMatters: string;
    };
    valueProposition?: {
      benefits: Array<{ title: string; description: string }>;
      sectionHeadline?: string;
    };
    guide?: {
      empathyStatement: string;
      authorityStatement: string;
      testimonialQuote?: string;
      testimonialAuthor?: string;
    };
    pricing?: {
      showPricing: boolean;
      pricingStyle: "tiers" | "products" | "contact";
      tiers?: Array<{
        name: string;
        price: string;
        features: string[];
        ctaText: string;
        highlighted?: boolean;
      }>;
    };
    plan?: {
      planTitle?: string;
      steps: Array<{ number: number; title: string; description: string }>;
    };
    explanatory?: {
      objections: Array<{ objection: string; response: string }>;
      composedParagraph: string;
    };
    leadGeneratorAd?: {
      headline: string;
      description: string;
      ctaText: string;
    };
    video?: {
      includeVideo: boolean;
      videoTitle: string;
    };
    junkDrawer?: {
      links: Array<{ label: string; url: string; category?: string }>;
    };
  };
  leadGenerator?: {
    title: string;
    type: string;
    content?: {
      problemIntro: { externalProblem: string; internalProblem: string };
      valueDelivery: { items: Array<{ title: string; description: string }> };
      closingCta: { successVision: string; callToAction: string };
    };
  };
  salesCampaign?: {
    email1_deliverAsset?: { subject: string; body: string };
    email2_problemSolution?: { subject: string; problemStatement: string; solutionIntro: string };
    email3_testimonial?: { subject: string; testimonialText: string; customerName: string };
    email4_overcomeObjection?: { subject: string; mainObjection: string; overcomeStatement: string };
    email5_paradigmShift?: { subject: string; oldWayOfThinking: string; newWayOfThinking: string };
    email6_salesLetter?: { subject: string; openingProblem: string; offerExplanation: string };
  };
}

/** Full context for prompt generation */
export interface V0PromptContext {
  organization: OrganizationContext;
  brandScript?: BrandScript;
  salesFunnel?: SalesFunnel;
  events?: EventContext[];
  forms?: FormContext[];
  products?: ProductContext[];
  /** Additional custom instructions from the user */
  customInstructions?: string;
  /** Preferred UI framework (defaults to shadcn/ui) */
  uiFramework?: "shadcn" | "tailwind" | "custom";
}

// ============ Platform Capabilities Reference ============

const PLATFORM_CAPABILITIES = `
## What LayerCake Handles (via SDK)

LayerCake provides a complete backend for these domains - use the SDK hooks, don't build your own:

### Data & CRM
- **Contacts**: Create, update, list, tag contacts (customers, leads, prospects)
- **Organizations**: B2B company records with billing info
- **Contact Sync**: Automatic sync with Microsoft/Google contacts (configured in dashboard)

### Events & Registration
- **Events**: Conferences, workshops, webinars, courses, meetups
- **Attendees**: Registration tracking, check-in, badge printing
- **Webinars**: Video hosting via Mux, registration, playback analytics
- **Bookings**: Resource/room booking with availability management

### Commerce & Payments
- **Products**: Tickets, physical goods, digital products, subscriptions
- **Checkout**: Cart management, Stripe-powered checkout sessions
- **Orders**: Order history, line items, fulfillment status
- **Invoices**: B2B/B2C invoicing, PDF generation, payment tracking

### Forms & Data Collection
- **Forms**: Registration, surveys, applications, feedback forms
- **Submissions**: Form responses with validation, file uploads
- **Dynamic Fields**: Conditional logic, custom field types

### Benefits & Commissions
- **Benefit Claims**: Member benefit submissions, approval workflows
- **Commission Payouts**: Affiliate/partner commission tracking

### Certificates
- **Certificates**: Achievement, completion, CME/CE certificates
- **Verification**: Public verification endpoint for certificate authenticity

### Automation (Configured in Dashboard)
- **Workflows**: Trigger-based automation (registration → email → CRM sync)
- **Sequences**: Multi-channel drip campaigns (email, SMS, WhatsApp)
- **Email Campaigns**: Bulk email to CRM segments

### Built-in Integrations (Configured in Dashboard)
- **Stripe**: Payment processing (LayerCake handles webhooks)
- **ActiveCampaign**: CRM sync, list management, automation triggers
- **ManyChat**: Multi-channel messaging (Messenger, Instagram, WhatsApp, Telegram)
- **Mux**: Video hosting for webinars
- **Pushover**: Push notifications
`;

const WHAT_USERS_MUST_BUILD = `
## What YOU Must Build (Not in SDK)

LayerCake handles data and commerce, but YOUR Next.js app handles:

### 1. Authentication & User Sessions
LayerCake doesn't manage end-user login sessions. You need:
\`\`\`tsx
// Use NextAuth.js, Clerk, or similar
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
};

export const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
\`\`\`

### 2. OAuth for Third-Party Integrations
If YOUR app needs OAuth with external services (not LayerCake's built-in integrations):
\`\`\`tsx
// You register your app, handle callbacks
// app/api/oauth/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  // Exchange code for tokens...
}
\`\`\`

### 3. Custom Webhooks
If you need real-time notifications from LayerCake events:
\`\`\`tsx
// app/api/webhooks/layercake/route.ts
export async function POST(request: Request) {
  const event = await request.json();
  // Handle: order.paid, attendee.checked_in, form.submitted, etc.
}
\`\`\`

### 4. Server Actions with Secrets
Any operation requiring server-side API keys:
\`\`\`tsx
// app/actions/send-notification.ts
'use server';

export async function sendSlackNotification(message: string) {
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    body: JSON.stringify({ text: message }),
  });
}
\`\`\`

### 5. Custom Integrations
Services not built into LayerCake:
- Slack notifications
- Custom CRM systems
- Analytics platforms (beyond what LayerCake tracks)
- Custom payment flows (PayPal, crypto, etc.)

### 6. Environment Variables You Manage
\`\`\`env
# Your app's secrets (not LayerCake's)
NEXTAUTH_SECRET=your-secret
GOOGLE_CLIENT_ID=your-google-app
GOOGLE_CLIENT_SECRET=your-google-secret
SLACK_WEBHOOK_URL=your-slack-webhook
# etc.
\`\`\`
`;

// ============ Marketing Made Simple Website Wireframe ============

const WEBSITE_WIREFRAME_GUIDE = `
## Website Structure (Marketing Made Simple Framework)

When building landing pages or websites, follow this 10-section wireframe for maximum conversion:

### SECTION 1: HEADER (Above the Fold)
The header must pass the "Grunt Test" - within 5 seconds, answer:
- **What do you offer?** (Clear headline)
- **How does it make my life better?** (Benefit-focused subheadline)
- **How do I get it?** (Prominent CTA button)

\`\`\`tsx
// Header pattern
<section className="min-h-[70vh] flex flex-col justify-center">
  <h1 className="text-4xl md:text-6xl font-bold">{headline}</h1>
  <p className="text-xl text-muted-foreground mt-4">{subheadline}</p>
  <div className="flex gap-4 mt-8">
    <Button size="lg">{primaryCta}</Button>
    <Button variant="outline" size="lg">{secondaryCta}</Button>
  </div>
</section>
\`\`\`

### SECTION 2: STAKES
What's at stake if they don't buy? Create urgency through:
1. State the problem they face
2. Describe how it makes them feel
3. Explain why it's wrong/unfair

### SECTION 3: VALUE PROPOSITION
Show 3-4 key benefits with icons. Focus on outcomes, not features.

\`\`\`tsx
// Value props pattern
<section className="py-20 bg-muted/30">
  <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
  <div className="grid md:grid-cols-3 gap-8">
    {benefits.map(benefit => (
      <Card key={benefit.title}>
        <CardHeader>
          <Icon className="h-10 w-10 text-primary mb-4" />
          <CardTitle>{benefit.title}</CardTitle>
        </CardHeader>
        <CardContent>{benefit.description}</CardContent>
      </Card>
    ))}
  </div>
</section>
\`\`\`

### SECTION 4: GUIDE (Empathy + Authority)
Position the brand as the guide, not the hero. Show:
- Empathy: "We understand your struggle..."
- Authority: Social proof, credentials, testimonial

### SECTION 5: PRICING/PRODUCTS (Optional)
Show 2-3 pricing tiers or featured products. Highlight the recommended option.

### SECTION 6: THE PLAN (3 Simple Steps)
Make it feel easy with a 3-step process:
1. Schedule a call / Sign up
2. We'll [do the work]
3. You'll [achieve success]

\`\`\`tsx
// Plan pattern
<section className="py-20">
  <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
  <div className="grid md:grid-cols-3 gap-8">
    {steps.map((step, i) => (
      <div key={i} className="text-center">
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
          {i + 1}
        </div>
        <h3 className="font-semibold text-xl mb-2">{step.title}</h3>
        <p className="text-muted-foreground">{step.description}</p>
      </div>
    ))}
  </div>
</section>
\`\`\`

### SECTION 7: EXPLANATORY PARAGRAPH
Overcome objections in paragraph form. Address the top 3-5 reasons people don't buy.
Use a "Read More" button to avoid overwhelming.

### SECTION 8: LEAD GENERATOR AD
Prominently display the lead magnet:
- Catchy headline
- Brief benefit description
- Email capture form

\`\`\`tsx
// Lead gen pattern
<section className="py-20 bg-primary text-primary-foreground">
  <div className="max-w-2xl mx-auto text-center">
    <h2 className="text-3xl font-bold mb-4">{leadGen.headline}</h2>
    <p className="mb-8">{leadGen.description}</p>
    <div className="flex gap-2 max-w-md mx-auto">
      <Input placeholder="Enter your email" className="bg-background" />
      <Button variant="secondary">{leadGen.ctaText}</Button>
    </div>
  </div>
</section>
\`\`\`

### SECTION 9: VIDEO (Optional)
If included, give it a compelling title that makes people want to press play.

### SECTION 10: JUNK DRAWER (Footer)
All other links: About, Contact, Blog, Terms, Social links, etc.
Keep it organized but comprehensive.

## Key Principles

1. **People SCAN websites, they don't read them** - Use short paragraphs, bullet points, headings
2. **Repeat the CTA** - Put CTA buttons in the header, middle, and end
3. **Customer is the HERO** - Frame all copy around customer success, not brand features
4. **One-liner in the header** - Use the Problem → Product → Result formula
5. **Social proof everywhere** - Testimonials, logos, numbers, credentials
`;

// ============ SDK Reference (Condensed for v0) ============

const SDK_QUICK_REFERENCE = `
## SDK Quick Reference

### Installation & Setup
\`\`\`bash
npm install @l4yercak3/sdk
\`\`\`

\`\`\`tsx
// app/layout.tsx
import { L4yercak3Provider } from '@l4yercak3/sdk/react';

export default function RootLayout({ children }) {
  return (
    <L4yercak3Provider>
      {children}
    </L4yercak3Provider>
  );
}
\`\`\`

### Available Hooks

| Hook | Purpose | Key Returns |
|------|---------|-------------|
| \`useContacts()\` | CRM contacts | \`contacts, fetchContacts, createContact, updateContact\` |
| \`useOrganizations()\` | B2B orgs | \`organizations, fetchOrganizations, createOrganization\` |
| \`useEvents()\` | Events | \`events, fetchEvents, getEvent\` |
| \`useAttendees()\` | Event attendees | \`attendees, fetchAttendees, checkIn\` |
| \`useForms()\` | Forms | \`forms, fetchForms, getForm\` |
| \`useFormSubmissions()\` | Form data | \`submissions, submitForm, isSubmitting\` |
| \`useProducts()\` | Products/tickets | \`products, fetchProducts, getProduct\` |
| \`useCheckout()\` | Cart & checkout | \`cart, addToCart, createCheckoutSession\` |
| \`useOrders()\` | Order history | \`orders, fetchOrders, getOrder\` |
| \`useInvoices()\` | Invoices | \`invoices, fetchInvoices, sendInvoice, markPaid, getPdf\` |
| \`useBenefitClaims()\` | Benefits | \`claims, fetchClaims, createClaim, approveClaim\` |
| \`useCommissions()\` | Commissions | \`commissions, fetchCommissions\` |
| \`useCertificates()\` | Certificates | \`certificates, verifyCertificate\` |
| \`useWebinars()\` | Webinars | \`webinars, fetchWebinars, register, getPlaybackUrl\` |
| \`useBookings()\` | Resource booking | \`bookings, getAvailability, createBooking\` |

### Common Patterns

**Fetching Data:**
\`\`\`tsx
const { events, loading, error, fetchEvents } = useEvents();

useEffect(() => {
  fetchEvents({ status: 'published' });
}, []);

if (loading) return <Spinner />;
if (error) return <Error message={error.message} />;
\`\`\`

**Shopping Cart & Checkout:**
\`\`\`tsx
const { cart, addToCart, updateQuantity, createCheckoutSession } = useCheckout();

const handleCheckout = async () => {
  // SDK creates Stripe checkout session - you just redirect
  const session = await createCheckoutSession({
    successUrl: \`\${window.location.origin}/success\`,
    cancelUrl: \`\${window.location.origin}/cart\`,
  });
  window.location.href = session.checkoutUrl; // Stripe handles payment UI
};
\`\`\`

**Form Submission:**
\`\`\`tsx
const { submitForm, isSubmitting, error } = useFormSubmissions();

const handleSubmit = async (data) => {
  await submitForm(formId, data);
  // LayerCake triggers configured workflows (email confirmation, CRM sync, etc.)
};
\`\`\`

**Event Check-in:**
\`\`\`tsx
const { checkIn } = useAttendees();

const handleCheckIn = async (attendeeId: string) => {
  await checkIn(eventId, attendeeId);
  // Attendee marked as checked_in, timestamp recorded
};
\`\`\`

**Invoice Management:**
\`\`\`tsx
const { invoices, sendInvoice, markPaid, getPdf } = useInvoices();

// Send invoice email (LayerCake handles email delivery)
await sendInvoice(invoiceId);

// Download PDF
const { pdfUrl } = await getPdf(invoiceId);
window.open(pdfUrl, '_blank');

// Mark as paid (for manual/offline payments)
await markPaid(invoiceId, { paymentMethod: 'bank_transfer', paymentReference: 'TXN-123' });
\`\`\`

### Key Types

\`\`\`typescript
// Import types
import type { Event, Product, Contact, Order, Form, Invoice, Attendee } from '@l4yercak3/sdk';

// Event
interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  subtype: 'conference' | 'workshop' | 'webinar' | 'course' | 'meetup';
  products?: Product[];
  maxCapacity?: number;
  registeredCount?: number;
}

// Product (ticket, merchandise, etc.)
interface Product {
  id: string;
  name: string;
  priceInCents: number;
  currency: string;
  status: 'active' | 'sold_out' | 'hidden' | 'archived';
  maxPerOrder?: number;
  inventory?: number;
}

// Contact
interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'active' | 'inactive' | 'unsubscribed';
  subtype: 'customer' | 'lead' | 'prospect' | 'partner';
  tags: string[];
}

// Order
interface Order {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  totalInCents: number;
  currency: string;
  status: 'pending' | 'paid' | 'partially_refunded' | 'refunded' | 'cancelled';
}

// Invoice
interface Invoice {
  id: string;
  number: string;
  type: 'b2b' | 'b2c';
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'void';
  totalInCents: number;
  dueDate: string;
  pdfUrl?: string;
}
\`\`\`
`;

// ============ Prompt Templates ============

const BASE_SYSTEM_PROMPT = `
# LayerCake SDK Integration Guide

You are generating code for a Next.js 14+ application that integrates with LayerCake, a platform for event management, CRM, e-commerce, invoicing, and member benefits.

## Key Principle

**LayerCake SDK handles data operations. Your Next.js app handles user experience and custom integrations.**

- Use SDK hooks for: events, contacts, products, checkout, invoices, forms, certificates
- Build yourself: user authentication, OAuth integrations, custom webhooks, server actions with secrets

${PLATFORM_CAPABILITIES}

${WHAT_USERS_MUST_BUILD}

## Critical Rules

1. **Always use TypeScript** - All code must be TypeScript (.tsx files)
2. **Use SDK hooks for data** - Never make raw fetch calls for LayerCake data
3. **Handle all states** - Always handle loading, error, and empty states
4. **Client components** - All components using hooks must have 'use client' directive
5. **Use shadcn/ui** - Prefer shadcn/ui components for consistent styling
6. **Real IDs** - Use the actual event/form/product IDs provided in context
7. **Format currency** - Always format cents to dollars: \`(priceInCents / 100).toFixed(2)\`
8. **Format dates** - Use \`toLocaleDateString()\` for user-friendly dates
9. **Don't build what's provided** - If SDK has a hook for it, use the hook

## Architecture

\`\`\`
Your Next.js App
    │
    ├── app/
    │   ├── layout.tsx              ← L4yercak3Provider wraps your app
    │   ├── api/
    │   │   ├── auth/[...nextauth]  ← YOUR auth (NextAuth, Clerk, etc.)
    │   │   └── webhooks/           ← YOUR webhook handlers (optional)
    │   └── actions/                ← YOUR server actions (optional)
    │
    └── components/                 ← Your React components
        └── *.tsx                   ← Use SDK hooks here
                │
                ▼
        @l4yercak3/sdk              ← Handles LayerCake API communication
                │
                ▼
        LayerCake Backend           ← CRM, Events, Checkout, Invoices, etc.
                │
                ▼
        [Stripe, Mux, ActiveCampaign, etc.] ← LayerCake's integrations (you don't touch these)
\`\`\`

${SDK_QUICK_REFERENCE}

## UI Components to Use

When generating UI, use these shadcn/ui components:
- \`Button\` - For actions and CTAs
- \`Card, CardHeader, CardContent, CardFooter\` - For content containers
- \`Input, Label, Textarea\` - For forms
- \`Select, SelectContent, SelectItem, SelectTrigger, SelectValue\` - For dropdowns
- \`Table, TableHeader, TableBody, TableRow, TableCell\` - For data tables
- \`Badge\` - For status indicators
- \`Skeleton\` - For loading states
- \`Alert, AlertDescription\` - For errors and notifications
- \`Dialog, DialogContent, DialogHeader, DialogTrigger\` - For modals
- \`Tabs, TabsContent, TabsList, TabsTrigger\` - For tabbed interfaces

## Example: Event Registration Page

\`\`\`tsx
'use client';

import { useEffect, useState } from 'react';
import { useEvents, useProducts, useCheckout } from '@l4yercak3/sdk/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function EventRegistration({ eventId }: { eventId: string }) {
  const { getEvent } = useEvents();
  const { products, fetchProducts } = useProducts();
  const { cart, addToCart, createCheckoutSession, isCreatingCheckout } = useCheckout();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [eventData] = await Promise.all([
          getEvent(eventId, { includeProducts: true }),
          fetchProducts({ eventId, status: 'active' }),
        ]);
        setEvent(eventData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [eventId]);

  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product?.priceInCents || 0) * item.quantity;
  }, 0);

  const handleCheckout = async () => {
    // SDK creates Stripe checkout - LayerCake handles payment webhooks
    const session = await createCheckoutSession({
      successUrl: \`\${window.location.origin}/events/\${eventId}/success\`,
      cancelUrl: \`\${window.location.origin}/events/\${eventId}\`,
    });
    window.location.href = session.checkoutUrl;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!event) {
    return (
      <Alert>
        <AlertDescription>Event not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
      <p className="text-muted-foreground mb-6">
        {new Date(event.startDate).toLocaleDateString()} • {event.location}
      </p>

      <div className="space-y-4">
        {products.map(product => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{product.name}</span>
                <span>\${(product.priceInCents / 100).toFixed(2)}</span>
              </CardTitle>
            </CardHeader>
            {product.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </CardContent>
            )}
            <CardFooter>
              <Button
                onClick={() => addToCart(product.id)}
                disabled={product.status === 'sold_out'}
              >
                {product.status === 'sold_out' ? 'Sold Out' : 'Add to Cart'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="mt-8 border-t pt-6">
          <p className="text-xl font-semibold mb-4">
            Total: \${(cartTotal / 100).toFixed(2)}
          </p>
          <Button
            onClick={handleCheckout}
            disabled={isCreatingCheckout}
            className="w-full"
            size="lg"
          >
            {isCreatingCheckout ? 'Processing...' : 'Proceed to Checkout'}
          </Button>
        </div>
      )}
    </div>
  );
}
\`\`\`
`;

// ============ Context Injection ============

/**
 * Format event context for injection into the prompt
 */
function formatEventsContext(events: EventContext[]): string {
  if (!events || events.length === 0) {
    return "No events available.";
  }

  return events
    .map(
      (e) => `- **${e.name}** (ID: \`${e.id}\`)
    - Date: ${new Date(e.startDate).toLocaleDateString()} - ${new Date(e.endDate).toLocaleDateString()}
    - Location: ${e.location}
    - Status: ${e.status}${e.ticketCount ? `\n    - Tickets: ${e.ticketCount} types available` : ""}`
    )
    .join("\n");
}

/**
 * Format form context for injection into the prompt
 */
function formatFormsContext(forms: FormContext[]): string {
  if (!forms || forms.length === 0) {
    return "No forms available.";
  }

  return forms
    .map(
      (f) => `- **${f.name}** (ID: \`${f.id}\`)
    - Type: ${f.subtype}
    - Fields: ${f.fieldCount}${f.eventId ? `\n    - Event-linked: Yes` : ""}`
    )
    .join("\n");
}

/**
 * Format product context for injection into the prompt
 */
function formatProductsContext(products: ProductContext[]): string {
  if (!products || products.length === 0) {
    return "No products available.";
  }

  return products
    .map(
      (p) => `- **${p.name}** (ID: \`${p.id}\`)
    - Price: $${(p.priceInCents / 100).toFixed(2)}
    - Status: ${p.status}${p.category ? `\n    - Category: ${p.category}` : ""}${p.eventId ? `\n    - Event-specific: Yes` : ""}`
    )
    .join("\n");
}

/**
 * Format BrandScript for injection into the prompt (StoryBrand framework)
 */
function formatBrandScript(brandScript: BrandScript): string {
  const sections: string[] = [];

  // One-liners (most important)
  if (brandScript.oneLiners) {
    const oneLiners: string[] = [];
    if (brandScript.oneLiners.tagline) {
      oneLiners.push(`**Tagline:** "${brandScript.oneLiners.tagline}"`);
    }
    if (brandScript.oneLiners.problemSolution) {
      oneLiners.push(`**Value Proposition:** ${brandScript.oneLiners.problemSolution}`);
    }
    if (brandScript.oneLiners.elevatorPitch) {
      oneLiners.push(`**Elevator Pitch:** ${brandScript.oneLiners.elevatorPitch}`);
    }
    if (oneLiners.length) {
      sections.push(`### Key Messages\n${oneLiners.join("\n")}`);
    }
  }

  // Character
  if (brandScript.character) {
    sections.push(`### Target Customer (The Hero)
- **Who:** ${brandScript.character.identity}
- **Wants:** ${brandScript.character.wants}${brandScript.character.demographics ? `\n- **Demographics:** ${brandScript.character.demographics}` : ""}`);
  }

  // Problem
  if (brandScript.problem) {
    let problemSection = `### Problem We Solve`;
    if (brandScript.problem.villain) {
      problemSection += `\n- **The Villain:** ${brandScript.problem.villain}`;
    }
    problemSection += `\n- **External Problem:** ${brandScript.problem.external}`;
    problemSection += `\n- **Internal Feeling:** ${brandScript.problem.internal}`;
    if (brandScript.problem.philosophical) {
      problemSection += `\n- **Why It Matters:** ${brandScript.problem.philosophical}`;
    }
    sections.push(problemSection);
  }

  // Guide
  if (brandScript.guide) {
    let guideSection = `### How We Help (The Guide)
- **Empathy:** ${brandScript.guide.empathy}
- **Authority:** ${brandScript.guide.authority}`;
    if (brandScript.guide.testimonialHighlight) {
      guideSection += `\n- **Social Proof:** "${brandScript.guide.testimonialHighlight}"`;
    }
    if (brandScript.guide.credentials?.length) {
      guideSection += `\n- **Credentials:** ${brandScript.guide.credentials.join(", ")}`;
    }
    sections.push(guideSection);
  }

  // Plan
  if (brandScript.plan?.steps?.length) {
    const stepsText = brandScript.plan.steps
      .map((step, i) => `${i + 1}. **${step.title}** - ${step.description}`)
      .join("\n");
    sections.push(`### The Plan (Make It Simple)\n${stepsText}`);
  }

  // Success & Failure
  if (brandScript.success || brandScript.failure) {
    let stakesSection = `### The Stakes`;
    if (brandScript.success) {
      stakesSection += `\n**Success:** ${brandScript.success.outcome}`;
      if (brandScript.success.transformation) {
        stakesSection += ` → ${brandScript.success.transformation}`;
      }
      if (brandScript.success.results?.length) {
        stakesSection += `\n  - Proof points: ${brandScript.success.results.join(", ")}`;
      }
    }
    if (brandScript.failure) {
      stakesSection += `\n**Failure (what to avoid):** ${brandScript.failure.consequence}`;
    }
    sections.push(stakesSection);
  }

  // Call to Action
  if (brandScript.callToAction) {
    let ctaSection = `### Calls to Action
- **Primary CTA:** "${brandScript.callToAction.direct}"`;
    if (brandScript.callToAction.transitional) {
      ctaSection += `\n- **Soft CTA:** "${brandScript.callToAction.transitional}"`;
    }
    sections.push(ctaSection);
  }

  // Voice
  if (brandScript.voice) {
    let voiceSection = `### Brand Voice
- **Tone:** ${brandScript.voice.tone}`;
    if (brandScript.voice.personality?.length) {
      voiceSection += `\n- **Personality:** ${brandScript.voice.personality.join(", ")}`;
    }
    if (brandScript.voice.preferWords?.length) {
      voiceSection += `\n- **Use words like:** ${brandScript.voice.preferWords.join(", ")}`;
    }
    if (brandScript.voice.avoidWords?.length) {
      voiceSection += `\n- **Avoid words like:** ${brandScript.voice.avoidWords.join(", ")}`;
    }
    sections.push(voiceSection);
  }

  return sections.join("\n\n");
}

/**
 * Format Sales Funnel for injection into the prompt (Marketing Made Simple framework)
 */
function formatSalesFunnel(salesFunnel: SalesFunnel): string {
  const sections: string[] = [];

  // One-liner
  if (salesFunnel.oneLiner) {
    sections.push(`### One-Liner (Use in Header)
**Problem:** ${salesFunnel.oneLiner.problem}
**Product:** ${salesFunnel.oneLiner.product}
**Result:** ${salesFunnel.oneLiner.result}
${salesFunnel.oneLiner.fullStatement ? `\n**Full Statement:** "${salesFunnel.oneLiner.fullStatement}"` : ""}`);
  }

  // Website Wireframe
  if (salesFunnel.websiteWireframe) {
    const wf = salesFunnel.websiteWireframe;
    const wireframeSections: string[] = [];

    if (wf.header) {
      wireframeSections.push(`**Header:**
- Headline: "${wf.header.headline}"
- Subheadline: "${wf.header.subheadline}"
- Primary CTA: "${wf.header.primaryCta}"${wf.header.secondaryCta ? `\n- Secondary CTA: "${wf.header.secondaryCta}"` : ""}`);
    }

    if (wf.stakes) {
      wireframeSections.push(`**Stakes Section:**
- Problem: ${wf.stakes.problemStatement}
- Emotional: ${wf.stakes.emotionalImpact}
- Why It Matters: ${wf.stakes.whyItMatters}`);
    }

    if (wf.valueProposition?.benefits?.length) {
      const benefitsList = wf.valueProposition.benefits
        .map(b => `  - **${b.title}:** ${b.description}`)
        .join("\n");
      wireframeSections.push(`**Value Proposition:**${wf.valueProposition.sectionHeadline ? `\nHeadline: "${wf.valueProposition.sectionHeadline}"` : ""}
${benefitsList}`);
    }

    if (wf.guide) {
      wireframeSections.push(`**Guide Section:**
- Empathy: "${wf.guide.empathyStatement}"
- Authority: "${wf.guide.authorityStatement}"${wf.guide.testimonialQuote ? `\n- Testimonial: "${wf.guide.testimonialQuote}" — ${wf.guide.testimonialAuthor || "Customer"}` : ""}`);
    }

    if (wf.plan?.steps?.length) {
      const stepsList = wf.plan.steps
        .map(s => `  ${s.number}. **${s.title}** - ${s.description}`)
        .join("\n");
      wireframeSections.push(`**Plan (How It Works):**${wf.plan.planTitle ? `\nTitle: "${wf.plan.planTitle}"` : ""}
${stepsList}`);
    }

    if (wf.leadGeneratorAd) {
      wireframeSections.push(`**Lead Generator Ad:**
- Headline: "${wf.leadGeneratorAd.headline}"
- Description: ${wf.leadGeneratorAd.description}
- CTA: "${wf.leadGeneratorAd.ctaText}"`);
    }

    if (wireframeSections.length) {
      sections.push(`### Website Wireframe Content\n${wireframeSections.join("\n\n")}`);
    }
  }

  // Lead Generator
  if (salesFunnel.leadGenerator) {
    const lg = salesFunnel.leadGenerator;
    let lgSection = `### Lead Generator
- **Title:** "${lg.title}"
- **Type:** ${lg.type}`;

    if (lg.content) {
      if (lg.content.problemIntro) {
        lgSection += `\n- **Problem Intro:** ${lg.content.problemIntro.externalProblem}`;
      }
      if (lg.content.closingCta) {
        lgSection += `\n- **CTA:** ${lg.content.closingCta.callToAction}`;
      }
    }
    sections.push(lgSection);
  }

  // Sales Campaign Emails
  if (salesFunnel.salesCampaign) {
    const sc = salesFunnel.salesCampaign;
    const emailSummaries: string[] = [];

    if (sc.email1_deliverAsset) {
      emailSummaries.push(`1. **Deliver Asset:** "${sc.email1_deliverAsset.subject}"`);
    }
    if (sc.email2_problemSolution) {
      emailSummaries.push(`2. **Problem+Solution:** "${sc.email2_problemSolution.subject}"`);
    }
    if (sc.email3_testimonial) {
      emailSummaries.push(`3. **Testimonial:** "${sc.email3_testimonial.subject}"`);
    }
    if (sc.email4_overcomeObjection) {
      emailSummaries.push(`4. **Overcome Objection:** "${sc.email4_overcomeObjection.subject}"`);
    }
    if (sc.email5_paradigmShift) {
      emailSummaries.push(`5. **Paradigm Shift:** "${sc.email5_paradigmShift.subject}"`);
    }
    if (sc.email6_salesLetter) {
      emailSummaries.push(`6. **Sales Letter:** "${sc.email6_salesLetter.subject}"`);
    }

    if (emailSummaries.length) {
      sections.push(`### Sales Email Campaign\n${emailSummaries.join("\n")}`);
    }
  }

  return sections.join("\n\n");
}

// ============ Main Prompt Builder ============

/**
 * Build the complete system prompt with injected context
 */
export function buildV0SystemPrompt(context: V0PromptContext): string {
  // Build brand story section if available
  const brandSection = context.brandScript
    ? `
## Brand Story (StoryBrand Framework)

${formatBrandScript(context.brandScript)}

**IMPORTANT:** Use this brand context to inform ALL copy, messaging, and design decisions. Position the customer as the hero, not the brand. Use the tagline, CTAs, and voice guidelines throughout.
`
    : "";

  // Build sales funnel section if available
  const salesFunnelSection = context.salesFunnel
    ? `
## Sales Funnel Content (Marketing Made Simple)

${formatSalesFunnel(context.salesFunnel)}

**IMPORTANT:** When building landing pages or websites, follow the 10-section wireframe structure. Use the content above for each section.
`
    : "";

  const contextSection = `
## Your Organization Context

**Organization:** ${context.organization.name}
${context.organization.website ? `**Website:** ${context.organization.website}` : ""}
${context.organization.industry ? `**Industry:** ${context.organization.industry}` : ""}
${brandSection}
${salesFunnelSection}

### Available Events
${formatEventsContext(context.events || [])}

### Available Forms
${formatFormsContext(context.forms || [])}

### Available Products
${formatProductsContext(context.products || [])}

${
  context.customInstructions
    ? `
## Additional Instructions
${context.customInstructions}
`
    : ""
}
`;

  // Include wireframe guide when sales funnel is present
  const wireframeGuide = context.salesFunnel ? WEBSITE_WIREFRAME_GUIDE : "";

  return `${BASE_SYSTEM_PROMPT}
${wireframeGuide}
${contextSection}
## Remember

1. Use the actual IDs provided above when generating code
2. Use SDK hooks for LayerCake data - don't reinvent checkout, invoicing, etc.
3. Build auth, webhooks, and custom integrations yourself if needed
4. All components using hooks must be client components ('use client')
5. Always format prices from cents to dollars
6. Handle loading, error, and empty states
7. Use shadcn/ui components for consistent design
8. **Match the brand voice** - Use the tagline, CTAs, and tone from the brand story
9. **Customer is the hero** - Frame messaging around customer success, not brand features
10. **Follow the 10-section wireframe** when building landing pages
`;
}

/**
 * Build a minimal prompt for quick generations (shorter context)
 */
export function buildV0MinimalPrompt(context: V0PromptContext): string {
  return `
# LayerCake SDK Quick Guide

Generate Next.js 14+ TypeScript code using the @l4yercak3/sdk.

## Key Principle
SDK handles: events, contacts, products, checkout, invoices, forms, certificates
You build: user auth, custom webhooks, third-party OAuth, server actions

## Setup
\`\`\`tsx
// Wrap app with L4yercak3Provider
import { L4yercak3Provider } from '@l4yercak3/sdk/react';
\`\`\`

## Hooks (use these, don't build your own)
- \`useEvents()\` → events, fetchEvents, getEvent
- \`useProducts()\` → products, fetchProducts
- \`useCheckout()\` → cart, addToCart, createCheckoutSession (Stripe-powered)
- \`useContacts()\` → contacts, createContact
- \`useForms()\` → forms, getForm
- \`useFormSubmissions()\` → submitForm, isSubmitting
- \`useOrders()\` → orders, fetchOrders
- \`useInvoices()\` → invoices, sendInvoice, markPaid, getPdf
- \`useAttendees()\` → attendees, checkIn
- \`useCertificates()\` → certificates, verifyCertificate
- \`useWebinars()\` → webinars, register, getPlaybackUrl
- \`useBookings()\` → bookings, getAvailability, createBooking

## Context
Organization: ${context.organization.name}
${context.events?.length ? `Events: ${context.events.map((e) => `${e.name} (${e.id})`).join(", ")}` : ""}
${context.products?.length ? `Products: ${context.products.map((p) => `${p.name} (${p.id})`).join(", ")}` : ""}
${context.forms?.length ? `Forms: ${context.forms.map((f) => `${f.name} (${f.id})`).join(", ")}` : ""}

## Rules
1. Always use TypeScript + 'use client'
2. Use SDK hooks for LayerCake data (never raw fetch)
3. Handle loading/error states
4. Format: (priceInCents / 100).toFixed(2)
5. Use shadcn/ui components
6. Build your own auth if needed (NextAuth, Clerk, etc.)
`;
}

// ============ Export ============

export const LAYERCAKE_SYSTEM_PROMPT = BASE_SYSTEM_PROMPT;
