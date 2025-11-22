# CMS Integration API Testing Guide

## 🎯 Overview

This guide provides step-by-step instructions for testing the complete CMS integration, from UI configuration to API endpoint validation.

## 📋 Prerequisites

Before testing, ensure:
- ✅ Development server is running (`npm run dev`)
- ✅ Convex backend is running (`npx convex dev`)
- ✅ You have access to an organization owner account
- ✅ TypeScript compilation passes (`npm run typecheck`)
- ✅ Linting passes (`npm run lint`)

## 🧪 Testing Workflow

### Phase 1: Create Test Content

#### Step 1.1: Create Test Events

1. Open the Events window in your application
2. Create at least 3 test events with different properties:

**Event A - Future Public Seminar**
- Name: "Future Public Seminar"
- Subtype: `seminar`
- Start Date: [future date]
- End Date: [future date]
- Status: `published`
- customProperties.isPrivate: `false`
- customProperties.featured: `true`

**Event B - Past Public Conference**
- Name: "Past Public Conference"
- Subtype: `conference`
- Start Date: [past date]
- End Date: [past date]
- Status: `published`
- customProperties.isPrivate: `false`
- customProperties.featured: `false`

**Event C - Future Private Workshop**
- Name: "Future Private Workshop"
- Subtype: `workshop`
- Start Date: [future date]
- End Date: [future date]
- Status: `published`
- customProperties.isPrivate: `true`
- customProperties.featured: `false`

#### Step 1.2: Create Checkout Instance

1. Open the Checkout window
2. Create a test checkout instance:
   - Name: "Test Checkout Instance"
   - Template: Select any checkout template
   - Status: `published`
   - Link products to the checkout
3. **Copy the checkout ID** using the new ID badge button

#### Step 1.3: Create Forms

1. Open the Forms window
2. Create 2 test forms:
   - Form 1: "Registration Form"
   - Form 2: "Feedback Form"
3. Copy the form IDs for reference

### Phase 2: Configure Published Page

#### Step 2.1: Create Published Page

1. Open the Web Publishing window
2. Navigate to "Published Pages" tab
3. Click "New Page" (or similar action)
4. Create a page:
   - Name: "Events Page"
   - customProperties.slug: `/events`
   - Template: Select appropriate template
   - Status: `published`

#### Step 2.2: Configure Content Rules

1. Locate the newly created page in the list
2. Click the **⚙️ Settings** icon button (purple highlight)
3. The Content Rules Modal opens
4. Configure event filters:
   - **Show Events**: `Future`
   - **Visibility**: `Public`
   - **Event Types**: Select `Seminar`, `Conference`
   - **Maximum Events**: `10`
   - **Sort By**: `Start Date`
   - **Order**: `Ascending`
5. Select resources:
   - **Primary Checkout**: Select your test checkout instance
   - **Available Forms**: Check both test forms
6. Click **Save Rules**
7. Verify success notification appears

### Phase 3: Test Backend Query

#### Step 3.1: Test via Convex Dashboard

1. Open Convex dashboard in browser
2. Navigate to "Functions" tab
3. Find `publishingOntology.getPublishedContentForFrontend`
4. Run the query with args:
```json
{
  "orgSlug": "your-org-slug",
  "pageSlug": "/events"
}
```
5. Verify response includes:
   - ✅ Page object with contentRules
   - ✅ Filtered events (only future, public seminars/conferences)
   - ✅ Checkout instance object
   - ✅ Forms array
   - ✅ Organization object

#### Step 3.2: Expected Response Structure

```json
{
  "page": {
    "_id": "...",
    "name": "Events Page",
    "customProperties": {
      "slug": "/events",
      "metaTitle": "...",
      "contentRules": {
        "events": {
          "filter": "future",
          "visibility": "public",
          "subtypes": ["seminar", "conference"],
          "limit": 10,
          "sortBy": "startDate",
          "sortOrder": "asc"
        },
        "checkoutId": "...",
        "formIds": ["...", "..."]
      }
    }
  },
  "events": [
    {
      "_id": "...",
      "name": "Future Public Seminar",
      "subtype": "seminar",
      "customProperties": {
        "startDate": 1735689600000,
        "endDate": 1735776000000,
        "isPrivate": false,
        "featured": true
      }
    }
  ],
  "checkout": {
    "_id": "...",
    "name": "Test Checkout Instance",
    "customProperties": {
      "templateCode": "...",
      "publicSlug": "...",
      "linkedProducts": ["..."]
    }
  },
  "forms": [
    {
      "_id": "...",
      "name": "Registration Form"
    },
    {
      "_id": "...",
      "name": "Feedback Form"
    }
  ],
  "organization": {
    "_id": "...",
    "name": "Your Organization",
    "slug": "your-org-slug"
  }
}
```

### Phase 4: Test HTTP API Endpoint

#### Step 4.1: Test with cURL

Replace `your-deployment-url` with your actual Convex deployment URL:

```bash
# Test basic request
curl "https://your-deployment-url.convex.site/api/v1/published-content?org=your-org-slug&page=/events"

# Pretty print JSON
curl "https://your-deployment-url.convex.site/api/v1/published-content?org=your-org-slug&page=/events" | jq .

# Test CORS preflight
curl -X OPTIONS \
  "https://your-deployment-url.convex.site/api/v1/published-content" \
  -H "Origin: https://your-frontend.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

#### Step 4.2: Test with Browser

1. Open browser developer tools
2. Navigate to Console
3. Run:
```javascript
fetch('https://your-deployment-url.convex.site/api/v1/published-content?org=your-org-slug&page=/events')
  .then(r => r.json())
  .then(data => {
    console.log('✅ API Response:', data);
    console.log('📊 Events Count:', data.events.length);
    console.log('🛒 Checkout:', data.checkout?.name);
    console.log('📋 Forms:', data.forms.map(f => f.name));
  })
  .catch(err => console.error('❌ Error:', err));
```

#### Step 4.3: Test with Postman/Thunder Client

1. Create new GET request
2. URL: `https://your-deployment-url.convex.site/api/v1/published-content`
3. Add query parameters:
   - `org`: `your-org-slug`
   - `page`: `/events`
4. Send request
5. Verify 200 OK response with JSON body

### Phase 5: Test Content Filtering

#### Test 5.1: Filter - Show All Events

1. Open Content Rules modal again
2. Change **Show Events** to `All`
3. Save
4. Re-test API endpoint
5. Verify response includes both future AND past events

#### Test 5.2: Filter - Show Past Events

1. Change **Show Events** to `Past`
2. Save
3. Re-test API endpoint
4. Verify response includes ONLY past events

#### Test 5.3: Filter - Visibility All

1. Change **Visibility** to `All`
2. Save
3. Re-test API endpoint
4. Verify response includes private events

#### Test 5.4: Filter - Event Types

1. Uncheck all event types except `Workshop`
2. Save
3. Re-test API endpoint
4. Verify response includes ONLY workshops

#### Test 5.5: Filter - Limit

1. Change **Maximum Events** to `1`
2. Save
3. Re-test API endpoint
4. Verify response includes exactly 1 event

#### Test 5.6: Filter - Sort Order

1. Change **Order** to `Descending`
2. Save
3. Re-test API endpoint
4. Verify events are sorted by date descending

### Phase 6: Test Error Handling

#### Test 6.1: Missing Parameters

```bash
# Missing org parameter
curl "https://your-deployment-url.convex.site/api/v1/published-content?page=/events"
# Expected: 400 Bad Request

# Missing page parameter
curl "https://your-deployment-url.convex.site/api/v1/published-content?org=your-org-slug"
# Expected: 400 Bad Request
```

#### Test 6.2: Invalid Organization

```bash
# Non-existent org slug
curl "https://your-deployment-url.convex.site/api/v1/published-content?org=nonexistent&page=/events"
# Expected: 404 Not Found
```

#### Test 6.3: Invalid Page

```bash
# Non-existent page slug
curl "https://your-deployment-url.convex.site/api/v1/published-content?org=your-org-slug&page=/nonexistent"
# Expected: 404 Not Found
```

### Phase 7: Test Multiple Pages

1. Create a second published page:
   - Name: "Seminars Page"
   - Slug: `/seminars`
2. Configure different content rules:
   - Event Types: Only `Seminar`
   - Visibility: `Private`
3. Test both endpoints:
```bash
# Events page (public, all types)
curl "https://your-deployment-url.convex.site/api/v1/published-content?org=your-org-slug&page=/events"

# Seminars page (private seminars only)
curl "https://your-deployment-url.convex.site/api/v1/published-content?org=your-org-slug&page=/seminars"
```
4. Verify each returns different filtered results

## 🔍 Debugging

### Check Convex Logs

1. Open Convex dashboard
2. Navigate to "Logs" tab
3. Look for console.log outputs from the query
4. Search for key indicators:
   - `📋 Content Rules:` - Filtering configuration
   - `🔍 Base Query Filter:` - Database query
   - `📊 Events found:` - Result count
   - `🛒 Checkout loaded:` - Checkout instance
   - `📋 Forms loaded:` - Forms array

### Common Issues

**Issue: Empty events array**
- Check event status (must be `published`)
- Verify event dates match filter (future/past)
- Check visibility settings (public/private)
- Ensure event subtype matches filter

**Issue: Missing checkout**
- Verify checkout ID is correct in contentRules
- Check checkout status (must be `published`)
- Ensure checkout belongs to same organization

**Issue: Missing forms**
- Verify form IDs in contentRules
- Check form status
- Ensure forms belong to same organization

**Issue: 404 Not Found**
- Verify page status is `published`
- Check page slug exactly matches
- Ensure organization slug is correct
- Confirm page belongs to organization

## ✅ Success Criteria

Your CMS integration is working correctly when:

1. ✅ Content Rules modal opens and closes without errors
2. ✅ All filter options can be selected and saved
3. ✅ API endpoint returns 200 OK with valid JSON
4. ✅ Events are filtered according to content rules
5. ✅ Checkout instance is included in response
6. ✅ Forms array is included in response
7. ✅ Changing content rules immediately affects API response
8. ✅ Multiple pages can have different content rules
9. ✅ Error handling works for invalid requests
10. ✅ CORS headers allow cross-origin requests

## 📊 Performance Testing

### Load Testing

Test API performance with multiple requests:

```bash
# Parallel requests
for i in {1..10}; do
  curl "https://your-deployment-url.convex.site/api/v1/published-content?org=your-org-slug&page=/events" &
done
wait
```

### Cache Testing

1. Make initial request and note response time
2. Make same request again
3. Compare response times (Convex may cache)
4. Test cache invalidation by updating content rules

## 🚀 Next Steps

After successful testing:

1. ✅ Document your organization's slug
2. ✅ Document your published page slugs
3. ✅ Share API endpoint with frontend team
4. ✅ Integrate into external Next.js frontend
5. ✅ Set up production environment variables
6. ✅ Monitor API usage and performance
7. ✅ Train organization owners on CMS UI

## 📞 Support

If you encounter issues:

1. Check Convex logs for detailed error messages
2. Verify all prerequisites are met
3. Test each phase sequentially
4. Review [FRONTEND_INTEGRATION_GUIDE.md](./FRONTEND_INTEGRATION_GUIDE.md)
5. Consult [CMS_INTEGRATION_COMPLETE.md](./CMS_INTEGRATION_COMPLETE.md)

---

**Status**: ✅ Testing guide complete
**Last Updated**: 2025-11-19
**Related Docs**: FRONTEND_INTEGRATION_GUIDE.md, CMS_INTEGRATION_COMPLETE.md
