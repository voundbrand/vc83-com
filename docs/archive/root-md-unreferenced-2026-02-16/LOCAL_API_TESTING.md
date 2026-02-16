# Local API Testing Guide

This guide explains how to test your Invoices API (and other APIs) locally.

## Prerequisites

1. **Backend Running**: Convex dev server must be running
   ```bash
   npx convex dev
   ```

2. **Frontend Running** (optional): Next.js dev server
   ```bash
   npm run dev
   ```

3. **API Key**: You need a valid API key (see below)

## Your Local Setup

- **Backend (Convex)**: `https://aromatic-akita-723.convex.cloud`
- **Frontend (Next.js)**: `http://localhost:3000`
- **Your Client App**: `http://localhost:3001` (if separate)

## Step 1: Create an API Key

### Option A: Via Convex Dashboard (Easiest)

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project: `aromatic-akita-723`
3. Navigate to **Data** > **apiKeys** table
4. Click **Add Document** and insert:

```json
{
  "organizationId": "kn7024kr1pag4ck3haeqaf29zs7sfd78",
  "userId": "ks722jzpcm00wy060wrk40nzd97s7dg4",
  "keyHash": "test-dev-key-12345",
  "keyPrefix": "test_",
  "name": "Local Development Key",
  "scopes": ["*"],
  "isActive": true,
  "createdAt": 1733331600000,
  "lastUsedAt": 1733331600000,
  "expiresAt": 1764867600000
}
```

5. Copy the `keyHash` value - this is your API key
6. Use it as: `Bearer test-dev-key-12345`

### Option B: Programmatically (Advanced)

You can create API keys using the auth mutations in `convex/api/v1/auth.ts`, but you'll need to be authenticated first.

## Step 2: Test with curl

### Basic Test: Create Invoice

```bash
curl -X POST https://aromatic-akita-723.convex.cloud/api/v1/invoices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "crmOrganizationId": "test-org-123",
    "billToName": "Test Customer",
    "billToEmail": "customer@example.com",
    "lineItems": [
      {
        "description": "Website Development",
        "quantity": 1,
        "unitPriceInCents": 500000,
        "totalPriceInCents": 500000
      }
    ],
    "subtotalInCents": 500000,
    "taxInCents": 100000,
    "totalInCents": 600000,
    "currency": "USD",
    "invoiceDate": 1733331600000,
    "dueDate": 1735923600000,
    "paymentTerms": "net30"
  }'
```

### List Invoices

```bash
curl https://aromatic-akita-723.convex.cloud/api/v1/invoices \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

### Get Invoice Details

```bash
curl https://aromatic-akita-723.convex.cloud/api/v1/invoices/YOUR_INVOICE_ID \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

## Step 3: Test with TypeScript Script

Run the comprehensive test script:

```bash
# 1. Edit the API key in the script
vim scripts/test-invoices-api.ts
# Update CONFIG.API_KEY = "YOUR_API_KEY_HERE"

# 2. Run the tests
npx tsx scripts/test-invoices-api.ts
```

This will run through:
1. ✅ Create draft invoice
2. ✅ List all invoices
3. ✅ List draft invoices only
4. ✅ Get invoice details
5. ✅ Update draft invoice
6. ✅ Seal invoice (make final)
7. ✅ Send invoice
8. ✅ Get PDF URL

## Step 4: Test from Your Client App (Port 3001)

If you have a separate client application running on port 3001, you can make requests like this:

### JavaScript/TypeScript Example

```typescript
const API_BASE_URL = "https://aromatic-akita-723.convex.cloud";
const API_KEY = "YOUR_API_KEY_HERE";

async function createInvoice() {
  const response = await fetch(`${API_BASE_URL}/api/v1/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      crmOrganizationId: "test-org-123",
      billToName: "Test Customer",
      billToEmail: "customer@example.com",
      lineItems: [
        {
          description: "Service",
          quantity: 1,
          unitPriceInCents: 100000,
          totalPriceInCents: 100000,
        },
      ],
      subtotalInCents: 100000,
      taxInCents: 20000,
      totalInCents: 120000,
      currency: "USD",
      invoiceDate: Date.now(),
      dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
    }),
  });

  const data = await response.json();
  console.log("Created invoice:", data);
  return data;
}

// Call it
createInvoice();
```

### React Example

```tsx
import { useState } from 'react';

const API_BASE_URL = "https://aromatic-akita-723.convex.cloud";
const API_KEY = "YOUR_API_KEY_HERE";

export function InvoiceCreator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const createInvoice = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/invoices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          crmOrganizationId: "test-org-123",
          billToName: "Test Customer",
          billToEmail: "customer@example.com",
          lineItems: [{
            description: "Service",
            quantity: 1,
            unitPriceInCents: 100000,
            totalPriceInCents: 100000,
          }],
          subtotalInCents: 100000,
          taxInCents: 20000,
          totalInCents: 120000,
          currency: "USD",
          invoiceDate: Date.now(),
          dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000),
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={createInvoice} disabled={loading}>
        {loading ? "Creating..." : "Create Invoice"}
      </button>
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

## Step 5: Test with Postman/Insomnia

1. **Import Collection**: Create a new request collection
2. **Set Base URL**: `https://aromatic-akita-723.convex.cloud`
3. **Add Authorization Header**:
   - Key: `Authorization`
   - Value: `Bearer YOUR_API_KEY_HERE`
4. **Test Endpoints**: Use the examples above

## Common Issues

### 401 Unauthorized

**Problem**: Invalid or missing API key

**Solution**:
- Check that you're including the `Authorization` header
- Verify the API key exists in the `apiKeys` table
- Ensure `isActive: true` in the database

### 404 Not Found

**Problem**: Endpoint doesn't exist or Convex not running

**Solution**:
- Check `npx convex dev` is running
- Verify the URL matches your Convex deployment
- Check that routes are registered in `convex/http.ts`

### CORS Errors (from browser)

**Problem**: Browser blocking cross-origin requests

**Solution**:
- Add CORS headers to your endpoints (already configured)
- Or use server-side requests (Node.js, not browser)

## All Available Endpoints

### Invoices API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/invoices` | Create draft invoice |
| GET | `/api/v1/invoices` | List invoices |
| GET | `/api/v1/invoices/:id` | Get invoice details |
| PATCH | `/api/v1/invoices/:id` | Update draft invoice |
| DELETE | `/api/v1/invoices/:id` | Delete draft invoice |
| POST | `/api/v1/invoices/:id/seal` | Seal invoice |
| POST | `/api/v1/invoices/:id/send` | Send invoice |
| GET | `/api/v1/invoices/:id/pdf` | Get PDF URL |

### Projects API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects` | List projects |
| GET | `/api/v1/projects/:id` | Get project details |
| PATCH | `/api/v1/projects/:id` | Update project |
| DELETE | `/api/v1/projects/:id` | Delete project |

### CRM API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/crm/contacts` | Create contact |
| GET | `/api/v1/crm/contacts` | List contacts |
| GET | `/api/v1/crm/contacts/:id` | Get contact details |

## Next Steps

1. ✅ Create API key
2. ✅ Test with curl
3. ✅ Test with TypeScript script
4. ✅ Integrate into your client app (port 3001)
5. 📝 Build your frontend UI
6. 🚀 Deploy to production

## Resources

- [Convex HTTP Actions Docs](https://docs.convex.dev/functions/http-actions)
- [API Documentation](./API_STATUS_AND_DOCUMENTATION.md)
- [Implementation Roadmap](./API_IMPLEMENTATION_ROADMAP.md)
