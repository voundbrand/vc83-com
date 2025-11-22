# External Frontend Integration Guide

## 🎯 Overview

Your external Next.js frontend can now dynamically fetch CMS-configured content from your main app's backend. No more hardcoded IDs!

## 🔌 API Endpoint

```
GET https://your-app.convex.site/api/v1/published-content
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org` | string | ✅ | Organization slug (e.g., "vc83") |
| `page` | string | ✅ | Page slug (e.g., "/events", "/seminar") |

### Example Request

```bash
curl "https://agreeable-lion-828.convex.site/api/v1/published-content?org=vc83&page=/events"
```

## 📦 Response Format

```typescript
{
  page: {
    _id: string,
    name: string,
    description: string,
    customProperties: {
      slug: string,
      metaTitle: string,
      metaDescription: string,
      templateCode: string,
      themeCode: string,
      contentRules: { /* filtering configuration */ }
    }
  },
  events: [
    {
      _id: string,
      name: string,
      description: string,
      subtype: "seminar" | "conference" | "workshop" | "meetup",
      status: "published",
      customProperties: {
        startDate: number,      // Unix timestamp
        endDate: number,        // Unix timestamp
        location: string,
        timezone: string,
        agenda: [...],
        featured: boolean,
        isPrivate: boolean
      }
    }
  ],
  checkout: {
    _id: string,
    name: string,
    type: "checkout_instance",
    customProperties: {
      templateCode: string,
      publicSlug: string,
      linkedProducts: string[],
      // ... checkout configuration
    }
  } | null,
  forms: [
    {
      _id: string,
      name: string,
      type: "form",
      customProperties: {
        fields: [...],
        // ... form configuration
      }
    }
  ],
  organization: {
    _id: string,
    name: string,
    slug: string,
    // ... org details
  }
}
```

## 💻 Frontend Implementation

### 1. Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=https://agreeable-lion-828.convex.site
```

### 2. API Client (Recommended)

Create a reusable API client:

```typescript
// lib/cms-client.ts

interface CMSContent {
  page: any;
  events: any[];
  checkout: any | null;
  forms: any[];
  organization: any;
}

export async function fetchPageContent(
  orgSlug: string,
  pageSlug: string
): Promise<CMSContent | null> {
  const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/published-content`);
  url.searchParams.set('org', orgSlug);
  url.searchParams.set('page', pageSlug);

  const response = await fetch(url.toString(), {
    cache: 'no-store' // or use Next.js revalidate
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch content: ${response.statusText}`);
  }

  return response.json();
}
```

### 3. Server Component Usage (Next.js App Router)

```typescript
// app/events/page.tsx

import { fetchPageContent } from '@/lib/cms-client';

export default async function EventsPage() {
  const content = await fetchPageContent('vc83', '/events');

  if (!content) {
    return <div>Page not found</div>;
  }

  return (
    <div>
      <h1>{content.page.customProperties.metaTitle}</h1>
      <p>{content.page.customProperties.metaDescription}</p>

      {/* Events are already filtered by CMS rules */}
      <div className="events-grid">
        {content.events.map((event) => (
          <EventCard
            key={event._id}
            event={event}
            checkout={content.checkout}
          />
        ))}
      </div>

      {/* Display checkout link if configured */}
      {content.checkout && (
        <a href={`/checkout/${content.checkout.customProperties.publicSlug}`}>
          Register Now
        </a>
      )}
    </div>
  );
}
```

### 4. Client Component Usage (with SWR or React Query)

```typescript
// components/EventsList.tsx
'use client';

import useSWR from 'swr';
import { fetchPageContent } from '@/lib/cms-client';

export function EventsList() {
  const { data, error, isLoading } = useSWR(
    ['page-content', 'vc83', '/events'],
    ([_, org, page]) => fetchPageContent(org, page),
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: false
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading events</div>;
  if (!data) return <div>No content found</div>;

  return (
    <div>
      {data.events.map((event) => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  );
}
```

### 5. Static Site Generation (SSG)

```typescript
// app/events/page.tsx

import { fetchPageContent } from '@/lib/cms-client';

// Generate static page at build time
export const revalidate = 3600; // Revalidate every hour

export default async function EventsPage() {
  const content = await fetchPageContent('vc83', '/events');

  if (!content) {
    return <div>Page not found</div>;
  }

  return (
    <div>
      {/* Your content */}
    </div>
  );
}
```

## 🎨 Example Component

```typescript
// components/EventCard.tsx

interface EventCardProps {
  event: {
    _id: string;
    name: string;
    description: string;
    customProperties: {
      startDate: number;
      endDate: number;
      location: string;
      featured?: boolean;
    };
  };
  checkout?: {
    _id: string;
    customProperties: {
      publicSlug: string;
    };
  } | null;
}

export function EventCard({ event, checkout }: EventCardProps) {
  const startDate = new Date(event.customProperties.startDate);

  return (
    <div className="event-card">
      {event.customProperties.featured && (
        <span className="badge">Featured</span>
      )}

      <h3>{event.name}</h3>
      <p>{event.description}</p>

      <div className="event-meta">
        <span>{startDate.toLocaleDateString()}</span>
        <span>{event.customProperties.location}</span>
      </div>

      {checkout && (
        <a
          href={`/checkout/${checkout.customProperties.publicSlug}?event=${event._id}`}
          className="register-button"
        >
          Register Now
        </a>
      )}
    </div>
  );
}
```

## 🔧 Advanced Usage

### Dynamic Routes

```typescript
// app/events/[eventSlug]/page.tsx

interface PageProps {
  params: {
    eventSlug: string;
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const content = await fetchPageContent('vc83', '/events');

  const event = content?.events.find(
    (e) => e.customProperties.slug === params.eventSlug
  );

  if (!event) {
    return <div>Event not found</div>;
  }

  return (
    <div>
      <h1>{event.name}</h1>
      {/* Event details */}
    </div>
  );
}
```

### Multiple Page Types

```typescript
// lib/pages.ts

export const PAGES = {
  events: '/events',
  seminars: '/seminars',
  workshops: '/workshops'
} as const;

// app/seminars/page.tsx
import { fetchPageContent } from '@/lib/cms-client';
import { PAGES } from '@/lib/pages';

export default async function SeminarsPage() {
  const content = await fetchPageContent('vc83', PAGES.seminars);
  // ... render seminars
}
```

## 🚀 What You Get

### ✅ No Hardcoded IDs
Everything is configured via CMS - just query by org + page slug

### ✅ Dynamic Filtering
Events are pre-filtered based on CMS rules:
- Future events only
- Public events only
- Specific event types
- Already sorted and limited

### ✅ Single API Call
One request gets you:
- Filtered events
- Checkout configuration
- Required forms
- Organization details

### ✅ Cache-Friendly
Use Next.js ISR, SWR, or React Query for caching

## 📊 Performance Tips

1. **Use ISR for mostly-static content**:
   ```typescript
   export const revalidate = 3600; // 1 hour
   ```

2. **Cache API responses**:
   ```typescript
   const response = await fetch(url, {
     next: { revalidate: 60 } // Next.js 13+
   });
   ```

3. **Use SWR for client-side**:
   ```typescript
   const { data } = useSWR(key, fetcher, {
     refreshInterval: 60000,
     dedupingInterval: 5000
   });
   ```

## 🔍 Debugging

### Check API Response

```bash
# Test the endpoint
curl -v "https://agreeable-lion-828.convex.site/api/v1/published-content?org=vc83&page=/events"

# Pretty print JSON
curl "https://agreeable-lion-828.convex.site/api/v1/published-content?org=vc83&page=/events" | jq .
```

### Common Issues

1. **404 Not Found**:
   - Verify page is published (status = "published")
   - Check org slug and page slug are correct
   - Ensure published_page exists with matching slug

2. **Empty Events Array**:
   - Check content rules are configured
   - Verify events are published
   - Check event filters (future/past, public/private)

3. **Missing Checkout**:
   - Ensure checkoutId is set in contentRules
   - Verify checkout instance exists and is published

## 📞 Support

If you encounter issues:
1. Check the API response directly in browser/curl
2. Verify published_page configuration in CMS
3. Check browser console for errors
4. Review Convex logs for backend errors

## ✨ Next Steps

**TODO for you**:
1. ✅ Backend is ready - no changes needed on your end yet
2. ⏳ Wait for CMS UI to be built (Step 4)
3. ⏳ Configure your first published page with content rules
4. ⏳ Test the API endpoint
5. ⏳ Integrate into your Next.js frontend using examples above

**Current Status**: Backend implementation complete. CMS UI in progress.
