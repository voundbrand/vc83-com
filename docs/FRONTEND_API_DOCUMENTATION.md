# 🎉 Backend API Ready for External Frontend!

## ✅ What's Ready

Your backend is now fully configured to serve your external frontend's dynamic forms system. All required fields have been added to the API responses.

---

## 📚 API Endpoints

### Base URL
```
https://your-backend-domain.convex.site/api/v1
```

### Authentication
All endpoints require an API key in the Authorization header:
```
Authorization: Bearer YOUR_API_KEY
```

---

## 🎫 Events API

### GET /api/v1/events/:slug

Get event details by slug (e.g., "haffsymposium-2024")

**Response:**
```typescript
{
  success: true,
  event: {
    _id: string,                          // Event ID
    organizationId: string,               // ✅ Organization ID (NEW!)
    type: "event",
    subtype: string,                      // "conference" | "workshop" | etc
    name: string,                         // Event name
    slug: string,                         // URL-friendly slug
    description: string,                  // Event description
    status: string,                       // "published" | "draft" | etc

    // Event details
    eventDetails: {
      startDate: number,                  // Unix timestamp
      endDate: number,
      location: string,
      venue: string,
      address: object
    },

    // Registration configuration
    registration: {
      enabled: boolean,
      formId: string,                     // Registration form ID
      registrationOpenDate: string,
      registrationCloseDate: string,
      maxAttendees: number,
      currentRegistrations: number,
      categories: array,
      addons: array
    },

    registrationFormId: string,           // ✅ Direct access to form ID (NEW!)
    checkoutInstanceId: string,           // ✅ Checkout workflow ID (NEW!)

    // Workflow configuration
    workflow: {
      checkoutInstanceId: string,         // Checkout instance to use
      workflowTemplateId: string
    },

    publishedAt: string
  }
}
```

**Example Request:**
```typescript
const response = await fetch('https://your-backend.convex.site/api/v1/events/haffsymposium-2024', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const { event } = await response.json();
```

---

## 📝 Forms API

### GET /api/v1/forms/:formId

Get form schema and configuration

**Response:**
```typescript
{
  id: string,                             // Form ID
  organizationId: string,                 // ✅ Organization ID (NEW!)
  name: string,                           // Form name
  description: string,                    // Form description
  status: string,                         // "published" | "draft"
  subtype: string,                        // ✅ "survey" | "registration" | "application" (NEW!)

  // Form fields (legacy format - for backward compatibility)
  fields: Array<{
    id: string,
    type: string,                         // "text" | "email" | "rating" | etc
    label: string,
    required: boolean,
    validation: object,
    options: array,
    conditionalLogic: object
  }>,

  // Form settings
  settings: {
    submitButtonText: string,
    successMessage: string
  },

  // Translations
  translations: object,

  // ✅ Full custom properties including formSchema (NEW!)
  customProperties: {
    formSchema: {                         // ✅ NEW: Dynamic form schema
      version: string,
      sections: Array<{
        id: string,
        title: string,
        description: string,
        fields: Array<{
          id: string,
          type: string,                   // "text" | "email" | "rating" | "radio" | "checkbox" | "textarea" | "select"
          label: string,
          required: boolean,
          placeholder: string,
          helpText: string,
          validation: {
            min: number,
            max: number,
            pattern: string
          },
          options: Array<{
            value: string,
            label: string
          }>,
          metadata: object                // Type-specific metadata (e.g., NPS rating config)
        }>
      }>
    },
    // Other custom fields
    templateCode: string,
    themeCode: string,
    enableInternalHosting: boolean,
    enableExternalHosting: boolean
  }
}
```

**Example Request:**
```typescript
const response = await fetch('https://your-backend.convex.site/api/v1/forms/abc123', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const form = await response.json();

// Access the dynamic schema
const schema = form.customProperties.formSchema;
```

---

## 🔄 Workflow Trigger API

### POST /api/v1/workflows/trigger

Submit form data and trigger workflows (registration, payment, email, etc.)

**Request Body:**
```typescript
{
  trigger: string,                        // "course_registration" | "form_submission" | "survey_submission"
  inputData: {
    formId: string,                       // Form ID
    eventId?: string,                     // Event ID (for registrations)
    productId?: string,                   // Product ID (for payments)
    formResponses: {                      // User's form data
      field_id_1: value,
      field_id_2: value,
      // ... all form field values
    },
    metadata: {
      source: "website",
      userAgent: string,
      submittedAt: string
    }
  },
  webhookUrl?: string                     // Optional: callback URL for async results
}
```

**Response:**
```typescript
{
  success: boolean,
  transactionId: string,                  // Created transaction ID
  ticketId?: string,                      // Generated ticket (if applicable)
  invoiceId?: string,                     // Generated invoice (if applicable)
  message: string,
  workflowExecutionId: string
}
```

**Example Request:**
```typescript
const response = await fetch('https://your-backend.convex.site/api/v1/workflows/trigger', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    trigger: 'form_submission',
    inputData: {
      formId: 'abc123',
      formResponses: {
        overall_satisfaction: 5,
        nps_score: 9,
        contact_email: 'user@example.com',
        // ... other form fields
      },
      metadata: {
        source: 'website',
        userAgent: navigator.userAgent,
        submittedAt: new Date().toISOString()
      }
    }
  })
});
const result = await response.json();
```

---

## 🎯 Trigger Types

### Form Submissions

**`form_submission`** - Generic form submission
- Used for: Contact forms, applications, general forms
- Triggers: Email notifications, CRM contact creation, data storage

**`survey_submission`** - Survey/feedback form submission
- Used for: Post-event surveys, feedback forms, NPS surveys
- Triggers: Survey response storage, analytics, thank you emails

**`course_registration`** - Event/course registration
- Used for: Event registrations with payments
- Triggers: Transaction creation, invoice generation, ticket generation, confirmation emails
- **Requires**: `eventId`, `productId`, payment info

---

## 🔑 Required Fields Summary

### Event API Returns:
✅ `organizationId` - Organization owning the event
✅ `registrationFormId` - Direct access to registration form ID
✅ `checkoutInstanceId` - Workflow checkout instance ID

### Form API Returns:
✅ `organizationId` - Organization owning the form
✅ `customProperties.formSchema` - Full dynamic form schema with sections and fields

---

## 🚀 Frontend Integration Example

```typescript
// 1. Get Event Details
const eventRes = await fetch(`${API_BASE}/events/${slug}`, {
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});
const { event } = await eventRes.json();

// 2. Get Registration Form
const formRes = await fetch(`${API_BASE}/forms/${event.registrationFormId}`, {
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});
const form = await formRes.json();

// 3. Render Form Using Schema
const schema = form.customProperties.formSchema;
schema.sections.forEach(section => {
  section.fields.forEach(field => {
    // Render field based on type: text, email, rating, radio, etc.
  });
});

// 4. Submit Form
const submitRes = await fetch(`${API_BASE}/workflows/trigger`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    trigger: 'course_registration',
    inputData: {
      formId: form.id,
      eventId: event._id,
      productId: selectedProductId,
      formResponses: formData,
      metadata: {
        source: 'website',
        submittedAt: new Date().toISOString()
      }
    }
  })
});
const result = await submitRes.json();
// Redirect to thank you page or show success message
```

---

## 🔒 CORS Configuration

The backend automatically handles CORS for:
- `http://localhost:3000` (development)
- `http://localhost:3001` (development)
- Your production frontend domains (configure in backend settings)

Headers included:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

---

## 📊 Response Headers

All successful responses include:
```
Content-Type: application/json
X-Organization-Id: {organizationId}
```

---

## ⚠️ Error Responses

All errors follow this format:
```typescript
{
  error: string,                          // Error type
  message?: string                        // Detailed error message
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing fields, validation errors)
- `401` - Unauthorized (invalid/missing API key)
- `404` - Not found (event/form doesn't exist)
- `500` - Internal server error

---

## 🎉 You're Ready!

Your backend is now fully configured to serve your external frontend. All the fields requested by your frontend team are now included in the API responses:

✅ Event API: `organizationId`, `registrationFormId`, `checkoutInstanceId`
✅ Form API: `organizationId`, `customProperties.formSchema`
✅ Workflow Trigger API: Ready for form submissions

Your frontend can now:
1. Fetch events dynamically
2. Load form schemas from the backend
3. Render forms based on the schema
4. Submit forms via workflow triggers

Happy coding! 🚀
