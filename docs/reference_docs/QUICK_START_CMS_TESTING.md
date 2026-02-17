# 🚀 CMS Integration - Quick Start Testing

## ⚡ 60-Second Test

### 1. Start Your Environment
```bash
# Terminal 1
npm run dev

# Terminal 2
npx convex dev
```

### 2. Create Test Content
1. Open your app → Web Publishing window
2. Create a new published page:
   - Name: "Events Page"
   - Slug: `/events`
   - Status: `published`

### 3. Configure Content Rules
1. Click the ⚙️ Settings icon on your page
2. In the modal:
   - Show Events: **Future**
   - Visibility: **Public**
   - Event Types: **Seminar, Conference**
   - Maximum Events: **10**
3. Click **Save Rules**

### 4. Test the API
```bash
# Replace YOUR_ORG_SLUG with your actual organization slug
curl "https://agreeable-lion-828.convex.site/api/v1/published-content?org=YOUR_ORG_SLUG&page=/events"
```

### 5. ✅ Success Indicators
You should see JSON response with:
- ✅ `page` object with your content rules
- ✅ `events` array (filtered by your rules)
- ✅ `checkout` object (if you selected one)
- ✅ `forms` array (if you selected forms)
- ✅ `organization` object

## 📋 Quick Testing Checklist

### Backend Implementation ✅
- [x] Schema extended with contentRules
- [x] Query `getPublishedContentForFrontend` created
- [x] HTTP endpoint `/api/v1/published-content` added
- [x] Mutation `updateContentRules` created
- [x] CORS headers configured

### Frontend UI ✅
- [x] Content Rules Modal created
- [x] Settings icon added to published pages
- [x] Filter options (all/future/past/featured)
- [x] Visibility controls (all/public/private)
- [x] Event type multi-select
- [x] Checkout dropdown
- [x] Forms checkboxes
- [x] Save/cancel functionality

### Code Quality ✅
- [x] TypeScript compilation passes
- [x] ESLint passes (warnings only, no errors)
- [x] No new type errors introduced

### Documentation ✅
- [x] Implementation progress tracker
- [x] Frontend integration guide
- [x] Complete feature summary
- [x] Comprehensive testing guide
- [x] Quick start guide

## 🎯 Common Test Scenarios

### Scenario 1: Future Public Events Only
**Configure:**
- Filter: `Future`
- Visibility: `Public`

**Expected:** Only events with:
- startDate > now
- isPrivate = false
- status = published

### Scenario 2: Featured Events
**Configure:**
- Filter: `Featured`

**Expected:** Only events with:
- featured = true
- status = published

### Scenario 3: Specific Event Types
**Configure:**
- Event Types: `Seminar` only

**Expected:** Only events with:
- subtype = "seminar"
- (plus other active filters)

### Scenario 4: With Checkout
**Configure:**
- Select a checkout instance

**Expected:** Response includes:
- checkout object with full details
- checkout.customProperties.publicSlug
- checkout.customProperties.linkedProducts

## 🔧 Troubleshooting

### Issue: Empty Events Array
**Solutions:**
1. Check event status is `published`
2. Verify events exist that match filters
3. Check event dates (future vs past)
4. Verify visibility settings

### Issue: 404 Not Found
**Solutions:**
1. Verify page status is `published`
2. Check organization slug is correct
3. Ensure page slug matches exactly
4. Confirm page belongs to organization

### Issue: Missing Checkout/Forms
**Solutions:**
1. Verify resources are selected in content rules
2. Check resource status is `published`
3. Ensure resources belong to same org
4. Re-save content rules

## 📊 Quick Performance Check

### Test Response Time
```bash
time curl "https://agreeable-lion-828.convex.site/api/v1/published-content?org=YOUR_ORG_SLUG&page=/events"
```

**Expected:** < 500ms for typical queries

### Test Concurrent Requests
```bash
for i in {1..5}; do
  curl "https://agreeable-lion-828.convex.site/api/v1/published-content?org=YOUR_ORG_SLUG&page=/events" &
done
wait
```

**Expected:** All requests succeed without errors

## 🎨 Frontend Integration Preview

### Next.js Example
```typescript
// app/events/page.tsx
export default async function EventsPage() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/published-content?org=vc83&page=/events`,
    { cache: 'no-store' }
  );

  const data = await response.json();

  return (
    <div>
      <h1>{data.page.customProperties.metaTitle}</h1>
      {data.events.map(event => (
        <EventCard key={event._id} event={event} checkout={data.checkout} />
      ))}
    </div>
  );
}
```

## 📚 Additional Resources

- **Full Testing Guide**: [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md)
- **Frontend Integration**: [FRONTEND_INTEGRATION_GUIDE.md](./frontend/frontend-integration-guide.md)
- **Feature Summary**: [CMS_INTEGRATION_COMPLETE.md](./CMS_INTEGRATION_COMPLETE.md)
- **Implementation Progress**: [FRONTEND_CMS_INTEGRATION_PROGRESS.md](./frontend/frontend-cms-integration-progress.md)

## ✅ Ready for Production?

Check all these boxes:

- [ ] CMS UI works without errors
- [ ] Content rules save successfully
- [ ] API endpoint returns valid JSON
- [ ] Events filter correctly
- [ ] Checkout loads when selected
- [ ] Forms load when selected
- [ ] Error handling works (test 404, 400)
- [ ] CORS works from external domain
- [ ] Multiple pages work independently
- [ ] Frontend team has API documentation

## 🎉 What's Next?

1. **Share API endpoint** with your frontend team
2. **Document your organization slug** for reference
3. **Create content rules** for each published page
4. **Integrate into frontend** using the guide
5. **Monitor performance** in production

---

**Quick Links:**
- API Endpoint: `https://agreeable-lion-828.convex.site/api/v1/published-content`
- Query Params: `?org={org_slug}&page={page_slug}`
- CMS UI: Web Publishing → Published Pages → ⚙️ Settings

**Status**: ✅ Implementation Complete - Ready for Testing!
