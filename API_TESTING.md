# API Testing Guide

This guide shows you how to test your API keys with external applications.

## 🔑 Quick Start

### 1. Generate an API Key

1. Start your dev servers:
   ```bash
   # Terminal 1
   npm run dev

   # Terminal 2
   npx convex dev
   ```

2. In the app (localhost:3000):
   - Login as **super admin**
   - Go to **Organizations** → **App Availability** tab
   - Enable API keys for an organization (toggle button)
   - Go to **Manage Organizations** → Select org → **Security & API** tab
   - Click **"Generate Key"**
   - **Copy the full API key** (you'll only see it once!)

### 2. Test with Node.js Script

```bash
node test-api.js YOUR_API_KEY_HERE
```

This will run 4 automated tests:
- ✅ GET events with valid key
- ✅ GET products with valid key
- ✅ Reject invalid key (should fail)
- ✅ Reject missing auth (should fail)

---

## 🧪 Manual Testing Methods

### Method 1: cURL (Command Line)

**Test 1: Get Events**
```bash
curl -X GET "http://localhost:3000/api/v1/events" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json"
```

**Test 2: Get Products**
```bash
curl -X GET "http://localhost:3000/api/v1/products" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json"
```

**Test 3: Get Forms**
```bash
curl -X GET "http://localhost:3000/api/v1/forms" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json"
```

**Test 4: Invalid Key (Should Fail)**
```bash
curl -X GET "http://localhost:3000/api/v1/events" \
  -H "Authorization: Bearer invalid_key_12345" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "error": "Invalid API key"
}
```

---

### Method 2: Postman

1. **Create a new request**
   - Method: `GET`
   - URL: `http://localhost:3000/api/v1/events`

2. **Add Authorization header**
   - Go to **Headers** tab
   - Add header:
     - Key: `Authorization`
     - Value: `Bearer YOUR_API_KEY_HERE`

3. **Send request**
   - Click **Send**
   - Should get JSON response with events

4. **Test other endpoints**
   - `/api/v1/products`
   - `/api/v1/forms`
   - `/api/v1/transactions`
   - `/api/v1/invoices`
   - `/api/v1/tickets`
   - `/api/v1/workflows`

---

### Method 3: JavaScript Fetch

```javascript
const apiKey = 'YOUR_API_KEY_HERE';
const url = 'http://localhost:3000/api/v1/events';

fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
})
  .then(response => response.json())
  .then(data => {
    console.log('Success:', data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

---

### Method 4: Python

```python
import requests

api_key = 'YOUR_API_KEY_HERE'
url = 'http://localhost:3000/api/v1/events'

headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json',
}

response = requests.get(url, headers=headers)

if response.ok:
    print('Success:', response.json())
else:
    print('Error:', response.status_code, response.json())
```

---

## 📋 Available API Endpoints

All endpoints require the `Authorization: Bearer YOUR_API_KEY` header.

### Events
```
GET /api/v1/events
GET /api/v1/events?subtype=conference
GET /api/v1/events?status=published
GET /api/v1/events?startDate=1234567890
```

### Products
```
GET /api/v1/products
GET /api/v1/products?subtype=course
GET /api/v1/products?status=active
```

### Forms
```
GET /api/v1/forms
GET /api/v1/forms?subtype=registration
```

### Transactions
```
GET /api/v1/transactions
```

### Invoices
```
GET /api/v1/invoices
```

### Tickets
```
GET /api/v1/tickets
```

### Workflows
```
GET /api/v1/workflows
```

### Checkout (POST)
```
POST /api/v1/checkout
```

---

## 🔍 What to Check

### ✅ Valid API Key Should:
- Return 200 OK status
- Return JSON data
- Show organization-specific data only
- Increment request count in UI

### ❌ Invalid API Key Should:
- Return 401 Unauthorized
- Return `{"error": "Invalid API key"}`
- NOT return any data

### 📊 In the UI, You Should See:
- **Request count** incrementing in the API keys table
- **Last used** timestamp updating
- Keys listed with status "active"

---

## 🐛 Troubleshooting

### Error: "Invalid API key"
- ✅ Check you copied the full key (not just the preview)
- ✅ Verify key status is "active" (not revoked)
- ✅ Ensure API keys are **enabled** for the organization

### Error: "Missing or invalid Authorization header"
- ✅ Check header format: `Authorization: Bearer YOUR_KEY`
- ✅ Make sure "Bearer " prefix is included
- ✅ No extra spaces or quotes

### Error: Connection refused / Network error
- ✅ Verify dev servers are running (both npm and convex)
- ✅ Check URL is `http://localhost:3000` (or your port)
- ✅ Try accessing http://localhost:3000 in browser first

### API key works but returns empty data
- ✅ Check if organization has any events/products/etc in database
- ✅ Verify data is marked as "published" or "active"
- ✅ Check if you're querying the right organization

---

## 🔐 Security Notes

⚠️ **Important:**
- API keys are shown in full **only once** when generated
- Store keys securely (environment variables, secret managers)
- Never commit API keys to version control
- Rotate keys regularly
- Revoke compromised keys immediately
- Each key is scoped to a single organization

---

## 📊 Monitoring Usage

You can monitor API key usage in the app:

1. **Super Admin View:**
   - Organizations → Manage Org → Security & API tab
   - See all keys for that org
   - View request counts and last used timestamps

2. **Organization Owner View:**
   - Manage Organization → Security tab
   - See your org's API keys
   - Monitor usage and revoke if needed

---

## 🎯 Next Steps

After testing locally:
1. Deploy to production (Vercel + Convex)
2. Generate production API keys
3. Update your external apps with production URLs
4. Set up monitoring and alerts for API usage
5. Document your API for external developers

---

Happy testing! 🚀
