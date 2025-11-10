# CRM API Enhancements - Organization Support & Contact Upsert

## Overview

The CRM API has been enhanced with comprehensive organization support and intelligent contact deduplication. When you send a contact via the API, the system now:

1. **Creates or updates contacts** (no more "email already exists" errors)
2. **Creates or finds CRM organizations** based on company information
3. **Links contacts to organizations** automatically
4. **Merges data** when updating existing contacts (tags, phone, company, etc.)

## What's New

### ✅ Contact Upsert Logic
- **Before**: API threw error if email already existed
- **After**: API updates existing contact with new information
- **Benefit**: You can send the same email multiple times with different tags/data

### ✅ Organization Creation & Linking
- **Before**: Company was just a text field
- **After**: Company creates a `crm_organization` object and links it to the contact
- **Benefit**: Track companies separately with full details (address, tax ID, etc.)

### ✅ Data Merging
- **Before**: Only updated `updatedAt` timestamp
- **After**: Merges tags, updates phone/company if missing, tracks all changes
- **Benefit**: Data accumulates instead of being lost

## API Endpoints

### 1. Create Contact from Event (Enhanced)

**POST** `/api/v1/crm/contacts/from-event`

#### Request Body (NEW - with organization support):

```json
{
  "eventId": "k170abc123...",  // Optional
  "eventName": "Tech Conference 2025",
  "eventDate": 1735689600000,
  "attendeeInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "company": "Acme Corp",  // Simple company name (backward compatible)
    "tags": ["vip", "early-bird"]
  },
  "organizationInfo": {  // NEW - Optional detailed organization data
    "name": "Acme Corporation",  // Overrides attendeeInfo.company
    "website": "https://acme.com",
    "industry": "Technology",
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "postalCode": "94105",
      "country": "USA"
    },
    "taxId": "12-3456789",
    "billingEmail": "billing@acme.com",
    "phone": "+1234567890"
  }
}
```

#### Response (NEW - with organization info):

```json
{
  "success": true,
  "contactId": "k170xyz789...",
  "eventId": "k170abc123...",
  "crmOrganizationId": "k170org456...",  // NEW - ID of CRM organization
  "organizationId": "k170myorg...",       // Your organization ID
  "isNewContact": false,                  // NEW - True if created, false if updated
  "message": "Existing contact updated and linked to event"
}
```

### 2. Create Contact (Enhanced)

**POST** `/api/v1/crm/contacts`

#### Request Body (NEW - with organization support):

```json
{
  "subtype": "lead",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@company.com",
  "phone": "+9876543210",
  "company": "Tech Startup Inc",  // Simple company name
  "jobTitle": "CTO",
  "source": "api",
  "tags": ["technical", "decision-maker"],
  "notes": "Met at conference",
  "organizationInfo": {  // NEW - Optional detailed organization
    "name": "Tech Startup Inc",
    "website": "https://techstartup.io",
    "industry": "SaaS",
    "address": {
      "street": "456 Innovation Drive",
      "city": "Austin",
      "state": "TX",
      "postalCode": "78701",
      "country": "USA"
    },
    "taxId": "98-7654321",
    "billingEmail": "accounts@techstartup.io",
    "phone": "+9876543210"
  }
}
```

#### Response (NEW):

```json
{
  "success": true,
  "contactId": "k170contact123...",
  "crmOrganizationId": "k170org789...",  // NEW
  "isNewContact": true,                   // NEW
  "message": "Contact created successfully"
}
```

## Behavior Examples

### Example 1: First Contact Creation

**Request:**
```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@email.com",
  "company": "Acme Corp",
  "tags": ["newsletter"]
}
```

**Result:**
- ✅ Creates new contact
- ✅ Creates new CRM organization "Acme Corp"
- ✅ Links contact to organization
- ✅ Returns `isNewContact: true`

### Example 2: Duplicate Email (Same Person, New Event)

**Request:**
```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@email.com",  // SAME EMAIL
  "company": "Acme Corp",
  "tags": ["webinar-2025"]      // NEW TAG
}
```

**Result:**
- ✅ Finds existing contact
- ✅ Merges tags: `["newsletter", "webinar-2025"]`
- ✅ Keeps existing organization link
- ✅ Returns `isNewContact: false`
- ✅ Updates `updatedAt` timestamp

### Example 3: Same Email, Different Organization

**Request:**
```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@email.com",  // SAME EMAIL
  "organizationInfo": {
    "name": "Beta Industries",  // DIFFERENT COMPANY
    "website": "https://beta.com"
  },
  "tags": ["partner"]
}
```

**Result:**
- ✅ Finds existing contact
- ✅ Creates/finds "Beta Industries" organization
- ✅ Links contact to Beta Industries (in addition to Acme Corp)
- ✅ Merges tags: `["newsletter", "webinar-2025", "partner"]`
- ✅ Contact now has 2 organization links

### Example 4: Admin Email (Your Super Admin)

**Request:**
```json
{
  "firstName": "Admin",
  "lastName": "User",
  "email": "admin@yourdomain.com",  // YOUR ADMIN EMAIL
  "tags": ["event-registration"]
}
```

**Result:**
- ✅ Finds your existing admin user in CRM
- ✅ Adds "event-registration" tag
- ✅ Does NOT create duplicate contact
- ✅ Returns `isNewContact: false`

## Data Merging Rules

### Fields that are Merged:
- **Tags**: Deduplicated union of all tags
- **Phone**: Only updated if previously empty
- **Company**: Only updated if previously empty
- **Job Title**: Only updated if previously empty
- **Notes**: Only updated if previously empty
- **Custom Fields**: Merged with new values

### Fields that are NOT Changed:
- **First Name**: Original value preserved
- **Last Name**: Original value preserved
- **Email**: Original value preserved (used for matching)
- **Created Date**: Original value preserved

## Organization Deduplication

Organizations are matched by **name** (case-insensitive):

```javascript
// These are considered the SAME organization:
"Acme Corp"
"acme corp"
"ACME CORP"

// These are DIFFERENT organizations:
"Acme Corp"
"Acme Corporation"
```

When the same organization name is sent multiple times:
- ✅ Finds existing organization
- ✅ Updates empty fields with new data
- ✅ Links contact to existing organization
- ✅ Does NOT create duplicates

## Database Structure

### Objects Table
```javascript
// CRM Contact
{
  _id: "k170contact123...",
  type: "crm_contact",
  subtype: "lead",
  name: "John Doe",
  customProperties: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+1234567890",
    company: "Acme Corp",  // Text field for backward compatibility
    tags: ["vip", "early-bird"],
    source: "api",
    lastEventUpdate: 1735689600000
  }
}

// CRM Organization
{
  _id: "k170org456...",
  type: "crm_organization",
  subtype: "prospect",
  name: "Acme Corporation",
  customProperties: {
    website: "https://acme.com",
    industry: "Technology",
    address: { ... },
    taxId: "12-3456789",
    billingEmail: "billing@acme.com",
    phone: "+1234567890",
    tags: ["api-created"],
    source: "api"
  }
}
```

### Object Links Table
```javascript
// Contact → Organization Link
{
  _id: "k170link789...",
  fromObjectId: "k170contact123...",  // Contact
  toObjectId: "k170org456...",        // Organization
  linkType: "works_at",
  properties: {
    source: "api",
    linkedAt: 1735689600000,
    jobTitle: "CTO"
  }
}

// Contact → Event Link
{
  _id: "k170link012...",
  fromObjectId: "k170contact123...",  // Contact
  toObjectId: "k170event345...",      // Event
  linkType: "registered_for",
  properties: {
    registeredAt: 1735689600000,
    source: "api"
  }
}
```

### Object Actions Table (Audit Trail)
```javascript
// Contact Creation
{
  objectId: "k170contact123...",
  actionType: "created_from_event",
  actionData: {
    eventId: "k170event345...",
    eventName: "Tech Conference 2025",
    source: "api"
  },
  performedAt: 1735689600000
}

// Contact Update
{
  objectId: "k170contact123...",
  actionType: "updated_from_event",
  actionData: {
    eventId: "k170event678...",
    eventName: "Webinar 2025",
    source: "api",
    fieldsUpdated: ["tags", "lastActivity"]
  },
  performedAt: 1735690000000
}

// Organization Link
{
  objectId: "k170contact123...",
  actionType: "linked_to_organization",
  actionData: {
    crmOrganizationId: "k170org456...",
    organizationName: "Acme Corporation",
    source: "api"
  },
  performedAt: 1735689600000
}
```

## Testing

### Test Script
See `test-crm-api-enhanced.js` for comprehensive test scenarios including:
- ✅ Creating new contacts with organizations
- ✅ Updating existing contacts
- ✅ Merging tags across multiple submissions
- ✅ Handling duplicate emails
- ✅ Organization creation and linking
- ✅ Multiple organizations per contact

### Run Tests
```bash
# Update API_KEY in test-crm-api-enhanced.js first
node test-crm-api-enhanced.js
```

## Migration Notes

### Backward Compatibility
- ✅ Old API format still works (without `organizationInfo`)
- ✅ `company` field still creates organizations
- ✅ Existing contacts continue to work
- ✅ No breaking changes

### What Changed
- ✅ No longer throws "Contact with this email already exists"
- ✅ Now returns `isNewContact` boolean
- ✅ Now returns `crmOrganizationId` if organization created/linked
- ✅ Response message changes based on create vs update

## Error Handling

### Validation Errors (400)
```json
{
  "error": "Missing required fields: firstName, lastName, email"
}
```

### Authentication Errors (401)
```json
{
  "error": "Invalid API key"
}
```

### Server Errors (500)
```json
{
  "error": "Internal server error",
  "details": "Detailed error message"
}
```

## Best Practices

1. **Always include organization data when available**
   - Provides better CRM organization tracking
   - Enables better reporting and segmentation

2. **Use tags liberally**
   - Tags accumulate across submissions
   - Great for tracking sources, campaigns, interests

3. **Handle `isNewContact` in your code**
   - `true`: New contact, send welcome email
   - `false`: Existing contact, send update notification

4. **Check `crmOrganizationId` in response**
   - Use this ID to track organization separately
   - Can be used to link other data to the organization

5. **Monitor audit trail**
   - Use `objectActions` table to track all changes
   - Review `actionType` for debugging

## Questions?

Check the audit trail in the database:
```javascript
// See all actions for a contact
db.query("objectActions")
  .filter(q => q.eq("objectId", contactId))
  .collect()
```

---

**Generated**: 2025-01-10
**Version**: 2.0
**Status**: ✅ Implemented & Tested
