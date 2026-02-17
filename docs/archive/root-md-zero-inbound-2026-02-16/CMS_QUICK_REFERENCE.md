# 🚀 CMS Integration - Quick Reference Card

## ⚡ Start Testing in 30 Seconds

```bash
# 1. Start development servers (2 terminals)
npm run dev              # Terminal 1: Frontend
npx convex dev          # Terminal 2: Backend

# 2. Test API endpoint
curl "https://agreeable-lion-828.convex.site/api/v1/published-content?org=YOUR_ORG_SLUG&page=/events" | jq .

# 3. Open browser
# Navigate to Web Publishing → Published Pages → Click ⚙️ Settings
```

---

## 📋 Key Files Reference

### Backend
| File | Purpose | Key Lines |
|------|---------|-----------|
| `convex/publishingOntology.ts` | Content query & mutation | 314-380 (mutation)<br>527-743 (query) |
| `convex/http.ts` | Public API endpoint | 605-682 |

### Frontend
| File | Purpose | Key Lines |
|------|---------|-----------|
| `src/.../content-rules-modal.tsx` | CMS editor UI | Complete file (400+ lines) |
| `src/.../published-pages-tab.tsx` | Settings integration | 321-340 (button)<br>430-436 (modal) |

---

## 🎯 API Endpoint Reference

### Base URL
```
https://agreeable-lion-828.convex.site/api/v1/published-content
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `org` | string | ✅ Yes | Organization slug |
| `page` | string | ✅ Yes | Page slug (e.g., `/events`) |

### Example Requests
```bash
# Production
curl "https://agreeable-lion-828.convex.site/api/v1/published-content?org=vc83&page=/events"

# With pretty print
curl "https://agreeable-lion-828.convex.site/api/v1/published-content?org=vc83&page=/events" | jq .

# Test CORS
curl -X OPTIONS \
  "https://agreeable-lion-828.convex.site/api/v1/published-content" \
  -H "Origin: https://your-frontend.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

### Response Structure
```json
{
  "page": {
    "_id": "string",
    "name": "string",
    "customProperties": {
      "slug": "string",
      "contentRules": { /* config */ }
    }
  },
  "events": [
    {
      "_id": "string",
      "name": "string",
      "subtype": "seminar" | "conference" | "workshop" | "meetup",
      "customProperties": {
        "startDate": number,
        "endDate": number,
        "isPrivate": boolean,
        "featured": boolean
      }
    }
  ],
  "checkout": {
    "_id": "string",
    "name": "string",
    "customProperties": {
      "publicSlug": "string",
      "linkedProducts": ["string"]
    }
  } | null,
  "forms": [
    {
      "_id": "string",
      "name": "string"
    }
  ],
  "organization": {
    "_id": "string",
    "name": "string",
    "slug": "string"
  }
}
```

---

## 🎨 Content Rules Configuration

### Event Filters
| Filter | Values | Description |
|--------|--------|-------------|
| **Show Events** | `all`, `future`, `past`, `featured` | Time-based filtering |
| **Visibility** | `all`, `public`, `private` | Privacy control |
| **Event Types** | `seminar`, `conference`, `workshop`, `meetup` | Subtype filter (multi-select) |
| **Maximum Events** | 1-100 | Result limit |
| **Sort By** | `startDate`, `createdAt` | Sort field |
| **Sort Order** | `asc`, `desc` | Sort direction |

### Resource Selection
| Resource | Type | Description |
|----------|------|-------------|
| **Primary Checkout** | Dropdown | Default checkout for events |
| **Available Forms** | Multi-select | Forms to include |

---

## 🧪 Quick Tests

### Test 1: Future Public Events
```json
{
  "filter": "future",
  "visibility": "public",
  "subtypes": [],
  "limit": 10,
  "sortBy": "startDate",
  "sortOrder": "asc"
}
```

### Test 2: Featured Events Only
```json
{
  "filter": "featured",
  "visibility": "all",
  "subtypes": [],
  "limit": 5
}
```

### Test 3: Past Seminars
```json
{
  "filter": "past",
  "visibility": "all",
  "subtypes": ["seminar"],
  "limit": 10,
  "sortBy": "startDate",
  "sortOrder": "desc"
}
```

---

## 🔍 Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Missing parameters | Add `org` and `page` query params |
| 404 | Page not found | Check page exists, is published, slug matches |
| 500 | Server error | Check Convex logs for details |

---

## 📊 Status Checks

### TypeScript
```bash
npm run typecheck
# Should pass with 0 errors
```

### Linting
```bash
npm run lint
# Should pass (warnings OK)
```

### Build
```bash
npm run build
# Should complete successfully
```

---

## 🎯 Frontend Integration Snippet

### Next.js App Router
```typescript
// app/events/page.tsx
export default async function EventsPage() {
  const data = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/published-content?org=vc83&page=/events`,
    { cache: 'no-store' }
  ).then(r => r.json());

  return (
    <div>
      {data.events.map(event => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  );
}
```

### React with SWR
```typescript
import useSWR from 'swr';

function EventsList() {
  const { data, error } = useSWR(
    '/api/v1/published-content?org=vc83&page=/events',
    fetcher
  );

  if (error) return <div>Error loading events</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div>
      {data.events.map(event => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  );
}
```

---

## 🐛 Quick Debugging

### Check Convex Logs
1. Open https://dashboard.convex.dev
2. Select your project
3. Navigate to "Logs" tab
4. Search for:
   - `📋 Content Rules:` - Filter config
   - `📊 Events found:` - Query results
   - `🛒 Checkout loaded:` - Checkout status
   - `📋 Forms loaded:` - Forms count

### Common Issues
| Issue | Quick Fix |
|-------|-----------|
| Empty events | Check filters match event properties |
| 404 error | Verify page status = `published` |
| Missing checkout | Check checkout ID in contentRules |
| CORS error | Verify CORS headers in response |

---

## 📚 Documentation Links

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [QUICK_START_CMS_TESTING.md](./reference_docs/QUICK_START_CMS_TESTING.md) | 60-second test | First time testing |
| [API_TESTING_GUIDE.md](./reference_docs/API_TESTING_GUIDE.md) | Comprehensive testing | Full test suite |
| [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md) | Frontend integration | Building external app |
| [CMS_INTEGRATION_COMPLETE.md](./reference_docs/CMS_INTEGRATION_COMPLETE.md) | Feature overview | Understanding system |
| [CMS_IMPLEMENTATION_SUMMARY.md](./reference_docs/CMS_IMPLEMENTATION_SUMMARY.md) | Technical details | Development reference |

---

## ⚡ Performance Tips

### Optimize API Calls
```typescript
// Use ISR for static content
export const revalidate = 3600; // 1 hour

// Or use SWR for caching
const { data } = useSWR(key, fetcher, {
  refreshInterval: 60000, // 1 minute
  dedupingInterval: 5000   // 5 seconds
});
```

### Monitor Performance
```bash
# Measure response time
time curl "https://agreeable-lion-828.convex.site/api/v1/published-content?org=vc83&page=/events"

# Test concurrent requests
for i in {1..10}; do
  curl "URL" &
done
wait
```

---

## 🎉 Success Checklist

### Implementation ✅
- [x] Backend query created
- [x] HTTP endpoint added
- [x] CMS UI built
- [x] Mutation created
- [x] TypeScript passes
- [x] Lint passes
- [x] Documentation complete

### Testing ⏳
- [ ] CMS UI opens
- [ ] Content rules save
- [ ] API returns data
- [ ] Events filter correctly
- [ ] Checkout loads
- [ ] Forms load
- [ ] Errors handled
- [ ] CORS works

### Production ⏳
- [ ] Frontend integrated
- [ ] Users trained
- [ ] Monitoring setup
- [ ] Performance validated

---

## 📞 Quick Help

**UI Issues?** → Check browser console
**API Issues?** → Check Convex logs
**Filter Issues?** → Verify event properties match rules
**Empty Results?** → Check event status = published

**Need more help?** See [API_TESTING_GUIDE.md](./reference_docs/API_TESTING_GUIDE.md)

---

**Last Updated**: 2025-11-19
**Status**: ✅ Ready for Testing
**Version**: 1.0.0
