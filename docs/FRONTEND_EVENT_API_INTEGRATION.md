# Frontend Event API Integration Guide

## 🚀 Quick Start

### Base Configuration

Add these environment variables to your frontend project:

```bash
# Production API
NEXT_PUBLIC_API_URL=https://agreeable-lion-828.convex.site/api/v1
NEXT_PUBLIC_BACKEND_API_KEY=org_ks79z6rj8kc42sn7r847smrdr57vd3mz_00lbs61zzosdidru0vucxp4xynnbbp3p
```

### Authentication

All API requests require an `Authorization` header with a Bearer token:

```
Authorization: Bearer org_ks79z6rj8kc42sn7r847smrdr57vd3mz_00lbs61zzosdidru0vucxp4xynnbbp3p
```

---

## 📡 Available Endpoints

### 1. List All Events

**GET** `/api/v1/events`

Returns a paginated list of all published events.

**Query Parameters:**
- `subtype` (optional): Filter by event type (`conference`, `workshop`, `concert`, `meetup`, `seminar`)
- `status` (optional): Filter by status (`draft`, `published`, `in_progress`, `completed`, `cancelled`)
- `upcoming` (optional): Filter for upcoming events only (`true`/`false`)

**Example Request:**
```bash
curl -X GET "https://agreeable-lion-828.convex.site/api/v1/events?status=published&upcoming=true" \
  -H "Authorization: Bearer org_ks79z6rj8kc42sn7r847smrdr57vd3mz_00lbs61zzosdidru0vucxp4xynnbbp3p" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "events": [
    {
      "id": "ns73596xb9xmypy0g28pypyard7vcpv2",
      "name": "9. HaffSymposium der Sportmedizin",
      "subtype": "conference",
      "status": "published",
      "location": "Am Rathaus 3 – 17373 Ueckermünde",
      "startDate": 1780142400000,
      "endDate": 1780372740000,
      "agenda": []
    }
  ],
  "total": 1
}
```

**TypeScript Interface:**
```typescript
interface Event {
  id: string;
  name: string;
  subtype: 'conference' | 'workshop' | 'concert' | 'meetup' | 'seminar';
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
  location: string;
  startDate: number; // Unix timestamp in milliseconds
  endDate: number;   // Unix timestamp in milliseconds
  agenda: AgendaItem[];
  slug?: string;     // URL-friendly identifier
}
```

---

### 2. Get Event by Slug

**GET** `/api/v1/events/by-slug/:slug`

Returns a single event by its URL-friendly slug.

**Path Parameters:**
- `slug` (required): URL-friendly event identifier (e.g., `9-haffsymposium-der-sportmedizin`)

**Example Request:**
```bash
curl -X GET "https://agreeable-lion-828.convex.site/api/v1/events/by-slug/9-haffsymposium-der-sportmedizin" \
  -H "Authorization: Bearer org_ks79z6rj8kc42sn7r847smrdr57vd3mz_00lbs61zzosdidru0vucxp4xynnbbp3p" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "event": {
    "_id": "ns73596xb9xmypy0g28pypyard7vcpv2",
    "name": "9. HaffSymposium der Sportmedizin",
    "type": "event",
    "subtype": "conference",
    "status": "published",
    "slug": "9-haffsymposium-der-sportmedizin",
    "description": "Annual sports medicine conference...",
    "eventDetails": {
      "startDate": 1780142400000,
      "endDate": 1780372740000,
      "location": "Am Rathaus 3 – 17373 Ueckermünde"
    }
  }
}
```

**Error Response (404):**
```json
{
  "error": "Event not found"
}
```

---

### 3. Get Event by ID

**GET** `/api/v1/events/:eventId`

Returns a single event by its unique ID.

**Path Parameters:**
- `eventId` (required): Convex object ID (e.g., `ns73596xb9xmypy0g28pypyard7vcpv2`)

**Example Request:**
```bash
curl -X GET "https://agreeable-lion-828.convex.site/api/v1/events/ns73596xb9xmypy0g28pypyard7vcpv2" \
  -H "Authorization: Bearer org_ks79z6rj8kc42sn7r847smrdr57vd3mz_00lbs61zzosdidru0vucxp4xynnbbp3p" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "event": {
    "_id": "ns73596xb9xmypy0g28pypyard7vcpv2",
    "name": "9. HaffSymposium der Sportmedizin",
    "type": "event",
    "subtype": "conference",
    "status": "published"
  }
}
```

---

### 4. Get Event Products

**GET** `/api/v1/events/:eventId/products`

Returns all products (tickets, merchandise, etc.) associated with an event.

**Path Parameters:**
- `eventId` (required): Convex object ID of the event

**Example Request:**
```bash
curl -X GET "https://agreeable-lion-828.convex.site/api/v1/events/ns73596xb9xmypy0g28pypyard7vcpv2/products" \
  -H "Authorization: Bearer org_ks79z6rj8kc42sn7r847smrdr57vd3mz_00lbs61zzosdidru0vucxp4xynnbbp3p" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "ns72v16yzsa6h5w5f0m9156g397vc57s",
      "name": "9. HaffSymposium (Standard)",
      "description": "Reguläre Teilnahmegebühr für externe Teilnehmer...",
      "status": "active",
      "customProperties": {
        "price": 15000,
        "currency": "EUR",
        "category": "ticket",
        "categoryLabel": "Standard Ticket",
        "inventory": null,
        "eventId": "ns73596xb9xmypy0g28pypyard7vcpv2"
      }
    }
  ],
  "total": 1
}
```

**TypeScript Interface:**
```typescript
interface EventProduct {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'sold_out';
  customProperties: {
    price: number;      // Price in cents (15000 = €150.00)
    currency: string;   // ISO 4217 currency code (e.g., "EUR", "USD")
    category?: string;
    categoryLabel?: string;
    inventory?: {
      available?: number;
      total?: number;
    } | null;
    metadata?: Record<string, any>;
    eventId: string;    // ID of the associated event
  };
}
```

---

## 🔧 Integration Examples

### React/Next.js Example

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY;

export async function fetchEvents(params?: {
  subtype?: string;
  status?: string;
  upcoming?: boolean;
}) {
  const queryParams = new URLSearchParams();
  if (params?.subtype) queryParams.set('subtype', params.subtype);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.upcoming !== undefined) queryParams.set('upcoming', String(params.upcoming));

  const url = `${API_BASE_URL}/events${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function fetchEventBySlug(slug: string) {
  const response = await fetch(`${API_BASE_URL}/events/by-slug/${slug}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Event not found');
    }
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export async function fetchEventProducts(eventId: string) {
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/products`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}
```

### React Hook Example

```typescript
// hooks/useEvents.ts
import { useQuery } from '@tanstack/react-query';
import { fetchEvents, fetchEventBySlug, fetchEventProducts } from '@/lib/api-client';

export function useEvents(filters?: { subtype?: string; status?: string; upcoming?: boolean }) {
  return useQuery({
    queryKey: ['events', filters],
    queryFn: () => fetchEvents(filters),
  });
}

export function useEventBySlug(slug: string) {
  return useQuery({
    queryKey: ['event', slug],
    queryFn: () => fetchEventBySlug(slug),
    enabled: !!slug,
  });
}

export function useEventProducts(eventId: string) {
  return useQuery({
    queryKey: ['event-products', eventId],
    queryFn: () => fetchEventProducts(eventId),
    enabled: !!eventId,
  });
}
```

### Component Example

```typescript
// components/EventList.tsx
'use client';

import { useEvents } from '@/hooks/useEvents';

export function EventList() {
  const { data, isLoading, error } = useEvents({
    status: 'published',
    upcoming: true
  });

  if (isLoading) return <div>Loading events...</div>;
  if (error) return <div>Error loading events: {error.message}</div>;

  return (
    <div className="grid gap-4">
      {data?.events.map((event) => (
        <div key={event.id} className="border p-4 rounded">
          <h2>{event.name}</h2>
          <p>{event.location}</p>
          <p>
            {new Date(event.startDate).toLocaleDateString()} -
            {new Date(event.endDate).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔒 Authentication Errors

### 401 Unauthorized - Missing API Key
```json
{
  "error": "Missing or invalid Authorization header"
}
```
**Solution:** Ensure you're including the `Authorization: Bearer <API_KEY>` header.

### 401 Unauthorized - Invalid API Key
```json
{
  "error": "Invalid API key"
}
```
**Solution:** Verify your API key is correct and active.

---

## 📝 Important Notes

### Slugs for Existing Events
- **New events** automatically get slugs when created
- **Existing events** need slugs added manually or will get them when their name is updated
- Until an event has a slug, the `/by-slug/:slug` endpoint will return 404

### Date Handling
- All dates are Unix timestamps in **milliseconds**
- Convert to Date objects: `new Date(timestamp)`
- Format for display: `new Date(timestamp).toLocaleDateString()`

### Price Formatting
- Prices are in **cents** (e.g., 15000 = €150.00)
- Display: `(price / 100).toFixed(2)` with currency symbol

### CORS
- The API supports CORS for frontend requests
- No additional configuration needed

---

## 🧪 Testing the API

You can test the API using curl:

```bash
# Test connection
curl -X GET "https://agreeable-lion-828.convex.site/api/v1/events" \
  -H "Authorization: Bearer org_ks79z6rj8kc42sn7r847smrdr57vd3mz_00lbs61zzosdidru0vucxp4xynnbbp3p"

# Test with filters
curl -X GET "https://agreeable-lion-828.convex.site/api/v1/events?status=published" \
  -H "Authorization: Bearer org_ks79z6rj8kc42sn7r847smrdr57vd3mz_00lbs61zzosdidru0vucxp4xynnbbp3p"

# Test event by ID
curl -X GET "https://agreeable-lion-828.convex.site/api/v1/events/ns73596xb9xmypy0g28pypyard7vcpv2" \
  -H "Authorization: Bearer org_ks79z6rj8kc42sn7r847smrdr57vd3mz_00lbs61zzosdidru0vucxp4xynnbbp3p"
```

---

## 🐛 Troubleshooting

### Issue: Getting HTML instead of JSON
**Cause:** Using the wrong base URL (Next.js app URL instead of Convex API URL)
**Solution:** Use `https://agreeable-lion-828.convex.site/api/v1` not `https://app.l4yercak3.com/api/v1`

### Issue: 404 on /by-slug/:slug
**Cause:** Event doesn't have a slug yet
**Solution:** Check if the event has `customProperties.slug` set, or use the `/events/:eventId` endpoint instead

### Issue: CORS errors
**Cause:** Missing or incorrect headers
**Solution:** Ensure you're sending proper `Authorization` and `Content-Type` headers

---

## 📞 Support

For questions or issues, contact the backend team with:
- The endpoint you're calling
- The full request (including headers)
- The response you received
- What you expected to happen
