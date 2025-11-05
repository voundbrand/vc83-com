# CRM API Documentation

## Overview

The CRM API allows external applications to create and manage contacts in your organization's CRM system. This is perfect for integrating event registrations, form submissions, or any external data source with your centralized CRM.

**Base URL**: `https://your-deployment.convex.site`

**Authentication**: All endpoints require API key authentication via the `Authorization: Bearer <api_key>` header.

---

## Getting Started

### 1. Generate an API Key

1. Log into your L4YERCAK3 application
2. Go to **Organizations → Manage Org → Security & API**
3. Enable API access (Super Admin only)
4. Click **Generate New API Key**
5. Copy the full API key (you'll only see it once!)

### 2. Test Your API Key

Use the provided test scripts:

```bash
# Test basic API endpoints
node test-api.js YOUR_API_KEY_HERE

# Test CRM endpoints
node test-crm-api.js YOUR_API_KEY_HERE
```

---

## Endpoints

### 1. Create Contact from Event Registration

Create a CRM contact from an event registration. Automatically handles deduplication by email.

**Endpoint**: `POST /api/v1/crm/contacts/from-event`

**Request Headers**:
```
Authorization: Bearer {api_key}
Content-Type: application/json
```

**Request Body**:
```json
{
  "eventId": "k17abc123...",           // Optional - event object ID
  "eventName": "Conference 2024",      // Required
  "eventDate": 1234567890,             // Optional - Unix timestamp
  "attendeeInfo": {
    "firstName": "John",               // Required
    "lastName": "Doe",                 // Required
    "email": "john@example.com",       // Required
    "phone": "+1-555-1234",            // Optional
    "company": "Acme Corp"             // Optional
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "contactId": "k27def456...",
  "eventId": "k17abc123...",
  "message": "Contact created successfully"
}
```

**Deduplication Response** (200):
```json
{
  "success": true,
  "contactId": "k27def456...",
  "eventId": "k17abc123...",
  "message": "Existing contact linked to event"
}
```

**Features**:
- ✅ Automatic deduplication by email
- ✅ Creates event object if eventId not provided
- ✅ Links contact to event via objectLinks
- ✅ Full audit trail in objectActions
- ✅ Contacts created as "lead" subtype
- ✅ Tagged with "event-attendee" and "api-created"

---

### 2. Create Generic Contact

Create a generic CRM contact with full customization.

**Endpoint**: `POST /api/v1/crm/contacts`

**Request Headers**:
```
Authorization: Bearer {api_key}
Content-Type: application/json
```

**Request Body**:
```json
{
  "subtype": "lead",                   // Required: "lead", "customer", or "prospect"
  "firstName": "Jane",                 // Required
  "lastName": "Smith",                 // Required
  "email": "jane@example.com",         // Required
  "phone": "+1-555-5678",              // Optional
  "company": "Tech Solutions",         // Optional
  "jobTitle": "CTO",                   // Optional
  "source": "api",                     // Optional (default: "api")
  "sourceRef": "external-id-123",      // Optional - your external reference
  "tags": ["demo", "priority"],        // Optional
  "notes": "Met at trade show",        // Optional
  "customFields": {                    // Optional - any additional fields
    "industry": "Technology",
    "interests": ["AI", "Cloud"]
  }
}
```

**Success Response** (200):
```json
{
  "success": true,
  "contactId": "k38xyz789...",
  "message": "Contact created successfully"
}
```

**Error Response** (400):
```json
{
  "error": "Missing required fields: firstName, lastName, email"
}
```

**Error Response** (409):
```json
{
  "error": "Contact with this email already exists"
}
```

**Features**:
- ✅ Full control over contact properties
- ✅ Custom fields support
- ✅ Flexible tagging system
- ✅ Source tracking for attribution
- ✅ Rejects duplicate emails

---

### 3. List Contacts

Retrieve contacts with filtering and pagination.

**Endpoint**: `GET /api/v1/crm/contacts`

**Request Headers**:
```
Authorization: Bearer {api_key}
```

**Query Parameters**:
- `subtype` (optional): Filter by contact type (`lead`, `customer`, `prospect`)
- `status` (optional): Filter by status (default: `active`)
- `source` (optional): Filter by source (`event`, `api`, `checkout`, etc.)
- `limit` (optional): Number of results (default: 50, max: 200)
- `offset` (optional): Pagination offset (default: 0)

**Example Request**:
```
GET /api/v1/crm/contacts?subtype=lead&status=active&limit=50&offset=0
```

**Success Response** (200):
```json
{
  "contacts": [
    {
      "id": "k27def456...",
      "name": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1-555-1234",
      "company": "Acme Corp",
      "jobTitle": "CEO",
      "subtype": "lead",
      "status": "active",
      "source": "api",
      "tags": ["event-attendee", "api-created"],
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

**Features**:
- ✅ Flexible filtering by type, status, and source
- ✅ Pagination support
- ✅ Returns metadata (total count)
- ✅ Sorted by creation date (newest first)

---

### 4. Get Contact by ID

Retrieve detailed information about a specific contact.

**Endpoint**: `GET /api/v1/crm/contacts/:contactId`

**Request Headers**:
```
Authorization: Bearer {api_key}
```

**Example Request**:
```
GET /api/v1/crm/contacts/k27def456...
```

**Success Response** (200):
```json
{
  "id": "k27def456...",
  "name": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1-555-1234",
  "company": "Acme Corp",
  "jobTitle": "CEO",
  "subtype": "lead",
  "status": "active",
  "source": "api",
  "sourceRef": "external-123",
  "tags": ["event-attendee", "priority"],
  "notes": "Met at conference",
  "customFields": {
    "industry": "Technology",
    "interests": ["AI", "Cloud"]
  },
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

**Error Response** (404):
```json
{
  "error": "Contact not found"
}
```

**Features**:
- ✅ Full contact details including custom fields
- ✅ Organization-scoped access control
- ✅ Rich metadata

---

## Authentication

### API Key Format

API keys follow this format:
```
org_{organizationId}_{32_random_chars}
```

Example:
```
org_kn7024kr1pag4ck3haeqaf29zs7sfd78_z93ta6b4aisnud363m91zxf34v0y2jy4
```

### Using API Keys

Always include the API key in the `Authorization` header with the `Bearer` prefix:

```bash
curl -X GET "https://your-deployment.convex.site/api/v1/crm/contacts" \
  -H "Authorization: Bearer org_kn7024kr1pag4ck3haeqaf29zs7sfd78_z93ta6b4aisnud363m91zxf34v0y2jy4" \
  -H "Content-Type: application/json"
```

### Security Best Practices

1. **Never commit API keys to version control**
   - Use environment variables
   - Add to `.gitignore`

2. **Store keys securely**
   - Use `.env.local` for development
   - Use secure secret managers in production

3. **Rotate keys regularly**
   - Generate new keys periodically
   - Revoke old keys in the UI

4. **Monitor usage**
   - Check "Last Used" and "Requests" in the UI
   - Track API key activity

---

## Error Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Missing required fields, invalid data format |
| 401 | Unauthorized | Invalid or missing API key |
| 404 | Not Found | Contact ID doesn't exist or wrong organization |
| 409 | Conflict | Duplicate email (for generic contact creation) |
| 500 | Internal Server Error | Server error - contact support |

---

## Rate Limiting

Currently, rate limiting is tracked per organization:
- Requests are counted per API key
- "Last Used" timestamp is updated on each request
- Future: Rate limits may be enforced (TBD)

---

## Integration Examples

### JavaScript/Node.js

```javascript
// Create contact from event registration
async function createEventContact(eventName, attendeeInfo) {
  const response = await fetch(
    `${process.env.BACKEND_CRM_URL}/api/v1/crm/contacts/from-event`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BACKEND_CRM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        eventDate: Date.now(),
        attendeeInfo,
      }),
    }
  );

  return await response.json();
}

// Usage
const result = await createEventContact('Conference 2024', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '+1-555-1234',
  company: 'Acme Corp',
});

console.log(`Contact created: ${result.contactId}`);
```

### Fire-and-Forget Pattern (Recommended)

For event registrations, use a fire-and-forget pattern to avoid blocking:

```javascript
// Don't await - fire and forget
createEventContact(eventName, attendeeInfo)
  .then((result) => {
    if (result.success) {
      console.log(`✅ CRM contact created: ${result.contactId}`);
    } else {
      console.error(`❌ CRM submission failed: ${result.error}`);
    }
  })
  .catch((error) => {
    console.error('CRM submission error:', error);
  });

// Return immediately to user
return NextResponse.json({ success: true, message: 'Registration confirmed' });
```

### Python

```python
import requests
import os

def create_event_contact(event_name, attendee_info):
    response = requests.post(
        f"{os.environ['BACKEND_CRM_URL']}/api/v1/crm/contacts/from-event",
        headers={
            'Authorization': f"Bearer {os.environ['BACKEND_CRM_API_KEY']}",
            'Content-Type': 'application/json',
        },
        json={
            'eventName': event_name,
            'eventDate': int(time.time() * 1000),
            'attendeeInfo': attendee_info,
        }
    )

    return response.json()

# Usage
result = create_event_contact('Conference 2024', {
    'firstName': 'John',
    'lastName': 'Doe',
    'email': 'john@example.com',
    'phone': '+1-555-1234',
    'company': 'Acme Corp',
})

print(f"Contact created: {result['contactId']}")
```

---

## Testing

### Test Scripts

Two test scripts are provided:

1. **test-api.js** - Tests basic API authentication and events endpoint
2. **test-crm-api.js** - Tests all CRM endpoints

### Running Tests

```bash
# Set your Convex URL in .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Test basic API
node test-api.js YOUR_API_KEY

# Test CRM API
node test-crm-api.js YOUR_API_KEY
```

### Expected Output

```
🎉 All CRM API tests passed! Ready to integrate with external clients.

📝 Next Steps:
   1. Use these endpoints in your external website
   2. Store the API key securely in environment variables
   3. Implement fire-and-forget pattern for event registrations
```

---

## Data Model

### Contact Object Structure

Contacts are stored in the universal `objects` table with:

```typescript
{
  type: "crm_contact",
  subtype: "lead" | "customer" | "prospect",
  name: "John Doe",
  status: "active" | "inactive" | "unsubscribed" | "archived",
  customProperties: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+1-555-1234",
    company: "Acme Corp",
    jobTitle: "CEO",
    source: "api" | "event" | "checkout" | "manual",
    sourceRef: "external-id-123",
    tags: ["tag1", "tag2"],
    notes: "Additional notes",
    // Plus any custom fields you add
  }
}
```

### Event Linkage

Contacts created from events are linked via the `objectLinks` table:

```typescript
{
  fromObjectId: contactId,
  toObjectId: eventId,
  linkType: "registered_for",
  properties: {
    registeredAt: timestamp,
    source: "api"
  }
}
```

### Audit Trail

All actions are logged in the `objectActions` table:

```typescript
{
  objectId: contactId,
  actionType: "created_from_event" | "created" | "linked_to_event",
  actionData: {
    eventId: eventId,
    eventName: "Conference 2024",
    source: "api"
  },
  performedBy: userId,
  performedAt: timestamp
}
```

---

## Troubleshooting

### 404 Error: Endpoint Not Found

**Problem**: `GET https://your-deployment.convex.cloud/api/v1/crm/contacts` returns 404

**Solution**: HTTP endpoints use `.convex.site`, NOT `.convex.cloud`!

```bash
# ❌ Wrong
https://aromatic-akita-723.convex.cloud/api/v1/crm/contacts

# ✅ Correct
https://aromatic-akita-723.convex.site/api/v1/crm/contacts
```

### 401 Error: Invalid API Key

**Possible Causes**:
1. API key not enabled in UI (check green toggle)
2. Copying partial key instead of full key
3. Missing `Bearer ` prefix in header
4. API key revoked

**Solution**: Generate a new API key and copy the FULL key when shown.

### 400 Error: Missing Required Fields

**Problem**: Request body missing required fields

**Solution**: Ensure all required fields are present:
- `eventName`, `firstName`, `lastName`, `email` for `/from-event`
- `firstName`, `lastName`, `email` for generic contact

### 409 Error: Contact Already Exists

**Problem**: Trying to create contact with duplicate email via generic endpoint

**Solution**: Use `/from-event` endpoint (handles deduplication automatically) or query for existing contact first.

---

## Support

For questions or issues:
1. Check the test scripts for working examples
2. Review this documentation
3. Check API key status in UI (Organizations → Manage Org → Security & API)
4. Contact support with error details and request logs

---

## Changelog

### v1.0.0 (Current)
- ✅ POST `/api/v1/crm/contacts/from-event` - Create from event registration
- ✅ POST `/api/v1/crm/contacts` - Create generic contact
- ✅ GET `/api/v1/crm/contacts` - List contacts with filtering
- ✅ GET `/api/v1/crm/contacts/:id` - Get contact details
- ✅ Automatic email deduplication
- ✅ Event linkage via objectLinks
- ✅ Full audit trail
- ✅ Organization-scoped access control
