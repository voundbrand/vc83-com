# External Frontend Integration Guide

## 🎯 Overview

Your **backend is ready**! The API endpoint for fetching filtered content is already built and working. This guide explains how your external Next.js frontend should integrate with it.

---

## ✅ What's Already Working (Backend)

### 1. Content Rules Configuration ✅
- You can configure content rules in the CMS (Web Publishing window)
- Rules are stored in `published_page.customProperties.contentRules`
- Rules support:
  - **Event filtering**: future/past/featured/all
  - **Visibility**: public/private/all
  - **Event types**: Filter by subtypes (seminar, conference, etc.)
  - **Sorting**: By any field, asc/desc
  - **Limits**: Max number of results
  - **Checkout linking**: Associate a checkout instance
  - **Form linking**: Associate form IDs

### 2. Public API Endpoint ✅
**Endpoint**: `getPublishedContentForFrontend`
- **Type**: Convex query (no auth required)
- **Purpose**: Returns filtered events, checkout, forms for external frontends
- **Location**: `convex/publishingOntology.ts` (lines 716-950)

---

## 📊 API Usage

### How to Call from Your Frontend

```typescript
// In your Next.js frontend app
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Fetch content for a specific page
const content = await client.query(
  api.publishingOntology.getPublishedContentForFrontend,
  {
    orgSlug: "voundbrand",     // Your organization slug
    pageSlug: "/events"         // The page slug (from CMS)
  }
);

// Response structure:
// {
//   page: { _id, name, customProperties: { ... } },
//   events: [ { _id, name, description, startDate, ... } ],
//   checkout: { _id, name, products: [...] } | null,
//   forms: [ { _id, name, schema: {...} } ]
// }
```

---

## 🔧 What You Configured in CMS

When you create an external page and click "Configure Content Rules", you're setting:

```typescript
{
  events: {
    filter: "future",          // Only show upcoming events
    visibility: "public",      // Only show public events
    subtypes: ["seminar"],     // Only show seminars
    limit: 10,                 // Max 10 events
    sortBy: "startDate",       // Sort by start date
    sortOrder: "asc"           // Ascending order
  },
  checkoutId: "k123abc...",    // Primary checkout instance
  formIds: ["form_1", "form_2"] // Available forms
}
```

---

## 🌐 Complete Frontend Integration

### Step 1: Install Convex Client

```bash
npm install convex
```

### Step 2: Create API Helper

Create `/lib/convex-client.ts`:

```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Initialize Convex client
export const convexClient = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

// Helper function to fetch page content
export async function getPageContent(orgSlug: string, pageSlug: string) {
  try {
    const content = await convexClient.query(
      api.publishingOntology.getPublishedContentForFrontend,
      { orgSlug, pageSlug }
    );

    if (!content) {
      return null;
    }

    return {
      page: content.page,
      events: content.events || [],
      checkout: content.checkout,
      forms: content.forms || [],
    };
  } catch (error) {
    console.error("Failed to fetch page content:", error);
    return null;
  }
}
```

### Step 3: Use in Your Next.js Page

Create `/app/events/page.tsx`:

```typescript
import { getPageContent } from "@/lib/convex-client";
import EventList from "@/components/EventList";

export default async function EventsPage() {
  // Fetch content based on CMS configuration
  const content = await getPageContent("voundbrand", "/events");

  if (!content) {
    return <div>Page not found or not published</div>;
  }

  const { page, events, checkout } = content;

  return (
    <div>
      <h1>{page.name}</h1>

      {/* Events are already filtered by your CMS rules! */}
      <EventList events={events} />

      {/* Checkout button if configured */}
      {checkout && (
        <a href={`/checkout/${checkout._id}`}>
          Register Now
        </a>
      )}
    </div>
  );
}
```

### Step 4: Create Event List Component

Create `/components/EventList.tsx`:

```typescript
interface Event {
  _id: string;
  name: string;
  description?: string;
  subtype?: string;
  customProperties?: {
    startDate?: number;
    endDate?: number;
    location?: string;
  };
}

export default function EventList({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return <p>No events available at this time.</p>;
  }

  return (
    <div className="event-grid">
      {events.map((event) => (
        <div key={event._id} className="event-card">
          <h3>{event.name}</h3>
          <p>{event.description}</p>

          {event.customProperties?.startDate && (
            <p>
              Date: {new Date(event.customProperties.startDate).toLocaleDateString()}
            </p>
          )}

          {event.customProperties?.location && (
            <p>Location: {event.customProperties.location}</p>
          )}

          <a href={`/events/${event._id}`}>View Details</a>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔄 How It Works

### 1. CMS Configuration (Backend)
```
You create external page: "Events Page"
   ↓
You configure content rules:
   - Show only future events
   - Public visibility only
   - Limit to 10 events
   - Sort by start date
   ↓
Rules saved in database
```

### 2. Frontend Fetches Content
```
Your Next.js app calls API:
   api.publishingOntology.getPublishedContentForFrontend
   ↓
Backend applies your filters automatically:
   - Filters by time (future only)
   - Filters by visibility (public only)
   - Sorts and limits results
   ↓
Returns filtered events + checkout + forms
```

### 3. You Display Content
```
Your React component receives filtered data
   ↓
No filtering logic needed in frontend!
   ↓
Just display the events
```

---

## 📋 Response Structure

```typescript
interface PublishedContentResponse {
  page: {
    _id: string;
    name: string;
    description: string;
    customProperties: {
      slug: string;
      metaTitle: string;
      metaDescription: string;
      templateContent: object;
      contentRules: {
        events?: EventRules;
        checkoutId?: string;
        formIds?: string[];
      };
    };
  };

  events: Array<{
    _id: string;
    name: string;
    description?: string;
    subtype?: string;
    status: string;
    customProperties?: {
      startDate?: number;
      endDate?: number;
      location?: string;
      isPrivate?: boolean;
      featured?: boolean;
      [key: string]: any;
    };
  }>;

  checkout: {
    _id: string;
    name: string;
    description?: string;
    customProperties?: {
      products?: string[];
      [key: string]: any;
    };
  } | null;

  forms: Array<{
    _id: string;
    name: string;
    description?: string;
    customProperties?: {
      schema?: object;
      [key: string]: any;
    };
  }>;
}
```

---

## 🎯 Real-World Example

### CMS Configuration
```
Page: "HaffSymposium 2025"
Slug: "/haffsymposium"
External Domain: https://haffsymposium.de

Content Rules:
  Events:
    - Filter: future
    - Visibility: public
    - Subtypes: ["seminar", "workshop"]
    - Limit: 20
    - Sort by: startDate (asc)

  Checkout: k123abc... (HaffSymposium Checkout)
  Forms: [form_1, form_2]
```

### Frontend Code
```typescript
// haffsymposium.de/app/page.tsx
import { getPageContent } from "@/lib/convex-client";

export default async function HomePage() {
  const content = await getPageContent("voundbrand", "/haffsymposium");

  return (
    <div>
      <h1>{content.page.name}</h1>

      <section>
        <h2>Upcoming Seminars & Workshops</h2>
        {content.events.map(event => (
          <EventCard key={event._id} event={event} />
        ))}
      </section>

      <section>
        <h2>Register Now</h2>
        <CheckoutButton checkoutId={content.checkout._id} />
      </section>
    </div>
  );
}
```

### What Happens
1. Frontend calls API with `orgSlug="voundbrand"` and `pageSlug="/haffsymposium"`
2. Backend finds the published page configuration
3. Backend applies filters: future + public + subtypes=[seminar, workshop]
4. Backend returns max 20 events, sorted by date
5. Frontend displays the filtered events
6. **No filtering logic in frontend!** Backend did everything.

---

## 🚨 Important Notes

### 1. **API is Public** (No Auth Required)
- The `getPublishedContentForFrontend` query is public
- No API key needed
- Only returns published pages with status="published"
- External pages won't expose sensitive data

### 2. **Content is Pre-Filtered**
- Backend applies ALL filters before returning data
- Frontend just displays what it receives
- No need for client-side filtering logic
- Reduces frontend complexity

### 3. **Real-Time Updates**
- Use Convex's reactive queries for live updates
- Changes in CMS reflect immediately
- No cache invalidation needed

### 4. **SEO-Friendly**
- Server-side rendering (SSR) supported
- Content available at build time (SSG) for static pages
- All event data in HTML for crawlers

---

## 🔍 Testing

### Test with Convex Dashboard
1. Go to https://dashboard.convex.dev
2. Select your project
3. Go to "Functions" → "publishingOntology"
4. Run `getPublishedContentForFrontend`
5. Input: `{ orgSlug: "voundbrand", pageSlug: "/events" }`
6. See the filtered results

### Test with cURL
```bash
# Not available via HTTP endpoint (it's a Convex query)
# Use Convex client or dashboard for testing
```

---

## 📞 Common Questions

### Q: Do I need to configure API keys?
**A:** No! The `getPublishedContentForFrontend` query is public. No authentication required.

### Q: Can I filter events further in the frontend?
**A:** You can, but you shouldn't need to. Configure all filters in the CMS, and the backend will handle everything.

### Q: What if I have multiple external sites?
**A:** Create separate published pages for each site with different content rules. Each page can have its own filtering configuration.

### Q: Can I fetch events without a published page?
**A:** No. The API is designed to work with published pages. Create a page in the CMS first, even if it's just for configuration.

### Q: How do I handle pagination?
**A:** Use the `limit` parameter in content rules. For pagination, you'll need to implement offset/cursor-based pagination in your frontend.

### Q: Can I cache the results?
**A:** Yes! Use Next.js's built-in caching or Vercel's ISR (Incremental Static Regeneration) with a revalidation period.

---

## 🎉 Summary

### Backend Status: ✅ **READY**
- API endpoint built and working
- Content rules filtering implemented
- Public query (no auth needed)
- Supports events, checkouts, forms

### Frontend Status: ⏳ **NEEDS IMPLEMENTATION**
- Install Convex client
- Create API helper function
- Call `getPublishedContentForFrontend`
- Display filtered content

### Integration Time: **~2 hours**
- 30 min: Setup Convex client
- 30 min: Create API helper
- 60 min: Build UI components

---

## 🚀 Next Steps

1. **TODAY**: Install Convex client in your frontend
2. **TODAY**: Test API call from dashboard to verify data
3. **TODAY**: Create helper function to fetch page content
4. **TOMORROW**: Build event list component
5. **TOMORROW**: Test end-to-end with your external domain

---

## 📚 Related Documentation

- [FRONTEND_BACKEND_INTEGRATION_SUMMARY.md](./reference_docs/FRONTEND_BACKEND_INTEGRATION_SUMMARY.md) - Checkout API integration
- [API_PAYLOAD_STRUCTURE.md](./API_PAYLOAD_STRUCTURE.md) - Checkout payload examples
- [INTEGRATION_COMPLETE_SUMMARY.md](./reference_docs/INTEGRATION_COMPLETE_SUMMARY.md) - Complete integration guide

---

## 🎯 Key Takeaway

**Your backend is already doing the filtering!** You configured the content rules in the CMS, and the backend applies them automatically. Your frontend just needs to:

1. Call the API
2. Display the results
3. That's it!

No complex filtering logic needed in your frontend. The backend handles everything based on your CMS configuration.

🚀 **Ship it!**
