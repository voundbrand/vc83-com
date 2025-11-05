# Quick API Test Guide

## 🚀 Step 1: Find Your Convex HTTP URL

**IMPORTANT**: Convex HTTP endpoints are served at `https://your-deployment.convex.site`, NOT `.convex.cloud`!

When you run `npx convex dev`, your deployment name is shown. For example:
- Deployment: `aromatic-akita-723`
- HTTP endpoints: `https://aromatic-akita-723.convex.site`

You can also find your deployment name in `.env.local`:
```
CONVEX_DEPLOYMENT=dev:aromatic-akita-723
```

Your HTTP endpoint URL is: `https://aromatic-akita-723.convex.site`

---

## 🧪 Step 2: Test with cURL

Replace `YOUR_CONVEX_URL` and `YOUR_API_KEY` below:

```bash
curl -X GET "YOUR_CONVEX_URL/api/v1/events" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### Example:
```bash
curl -X GET "https://aromatic-akita-723.convex.site/api/v1/events" \
  -H "Authorization: Bearer org_kn7024kr1pag4ck3haeqaf29zs7sfd78_z93ta6b4aisnud363m91zxf34v0y2jy4" \
  -H "Content-Type: application/json"
```

**Your specific URL**: `https://aromatic-akita-723.convex.site`

---

## ✅ What You Should See

### Success Response:
```json
{
  "events": [
    {
      "id": "...",
      "name": "Sample Event",
      "description": "...",
      "startDate": 1234567890,
      "endDate": 1234567890,
      ...
    }
  ],
  "total": 5
}
```

### Error (Invalid Key):
```json
{
  "error": "Invalid API key"
}
```

### Error (No Auth):
```json
{
  "error": "Missing or invalid Authorization header"
}
```

---

## 📋 Available Endpoints

All URLs are: `YOUR_CONVEX_URL` + endpoint path

### Layer 1: READ APIs (Before Checkout)
- `GET /api/v1/events` - List all events (supports query params: `?subtype=conference`, `?status=published`)
- `GET /api/v1/products/:productId` - Get specific product by ID
- `GET /api/v1/forms/:formId` - Get specific form by ID

### Layer 2: CHECKOUT APIs (Payment Processing)
- `GET /api/v1/checkout/config` - Get payment provider configuration
- `POST /api/v1/checkout/sessions` - Create checkout session
- `POST /api/v1/checkout/confirm` - Confirm payment and fulfill order

### Layer 3: WORKFLOW API (During Checkout)
- `POST /api/v1/workflows/trigger` - Trigger workflow

### Layer 4: RESULT APIs (After Checkout)
- `GET /api/v1/transactions/:transactionId` - Get transaction details
- `GET /api/v1/tickets/:ticketId/pdf` - Get ticket PDF
- `GET /api/v1/invoices/:invoiceId` - Get invoice

### Layer 5: CRM APIs (Contact Management) 🆕
- `POST /api/v1/crm/contacts/from-event` - Create contact from event registration
- `POST /api/v1/crm/contacts` - Create generic contact
- `GET /api/v1/crm/contacts` - List contacts (supports filtering)
- `GET /api/v1/crm/contacts/:contactId` - Get contact details

---

## 🐛 Troubleshooting

### Can't find Convex URL?
1. Run `npx convex dev` in terminal
2. Look for "HTTP endpoints:" in the output
3. Copy the URL (should be `https://something.convex.site`)

### Still getting 404?
- Make sure you're using **`.convex.site`**, NOT `.convex.cloud`!
- ❌ Wrong: `https://aromatic-akita-723.convex.cloud`
- ✅ Correct: `https://aromatic-akita-723.convex.site`
- Next.js runs on `localhost:3000`
- Convex HTTP endpoints run on `https://your-deployment.convex.site`

### API key not working?
1. Make sure it's enabled in the UI (green toggle)
2. Copy the FULL key, not just the preview
3. Include `Bearer ` prefix in Authorization header

---

## 🎯 Quick Test Commands

Once you have your Convex URL, test with:

```bash
# Set your variables
export CONVEX_URL="https://YOUR-DEPLOYMENT.convex.site"
export API_KEY="YOUR_FULL_API_KEY_HERE"

# Test events endpoint
curl -X GET "$CONVEX_URL/api/v1/events" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json"

# Test CRM endpoints (NEW!)
node test-crm-api.js $API_KEY
```

## 📚 Full Documentation

- **Basic API Testing**: This file (QUICK_API_TEST.md)
- **CRM API Documentation**: See [CRM_API_DOCUMENTATION.md](./CRM_API_DOCUMENTATION.md)
- **Test Scripts**:
  - `test-api.js` - Basic API authentication and events
  - `test-crm-api.js` - Full CRM endpoint testing

---

## 📊 Monitor in UI

After successful requests:
1. Go to app → Organizations → Manage Org → Security & API tab
2. Check the "Requests" column - should increment
3. "Last Used" should show current time

---

Happy testing! 🚀
