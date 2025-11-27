# Email Template Copy/Paste Guide

## 🎯 The Pattern (Same as Forms!)

### Step 1: Start with Base Template
Copy this file: `/src/templates/emails/BASE_TEMPLATE_SCHEMA.json`

### Step 2: Modify for Your Email Type
- Change `code`, `name`, `description`
- Update `category` (transactional, marketing, event, support)
- Add/remove/modify `sections`
- Add/remove/modify `variables`
- Update `previewData` with realistic examples

### Step 3: Save As New File
Save as: `/src/templates/emails/schema-examples/{email-type}-schema.json`

### Step 4: Copy/Paste Into UI
1. Go to Templates window → Email Library tab
2. Click on a template to edit
3. Open Schema Editor
4. Copy entire JSON from your file
5. Paste into editor
6. Click "Validate" then "Save"

---

## 📋 Example: Invoice B2B Email

### Before (Base Template)
```json
{
  "code": "base-email-template",
  "name": "Base Email Template",
  "category": "transactional",
  "defaultSections": [
    {
      "type": "hero",
      "title": "{heroTitle}",
      "subtitle": "{heroSubtitle}"
    },
    {
      "type": "body",
      "paragraphs": [
        "Dear {firstName},",
        "{mainMessage}"
      ]
    },
    {
      "type": "cta",
      "text": "{ctaText}",
      "url": "{ctaUrl}"
    }
  ]
}
```

### After (Invoice B2B)
```json
{
  "code": "invoice-b2b-email",
  "name": "Invoice Email (B2B)",
  "category": "transactional",
  "defaultSections": [
    {
      "type": "hero",
      "title": "Invoice {invoiceNumber}",
      "subtitle": "Due {dueDate}"
    },
    {
      "type": "body",
      "paragraphs": [
        "Dear {contactName},",
        "Please find attached invoice {invoiceNumber} for {companyName}.",
        "Payment is due by {dueDate}."
      ]
    },
    {
      "type": "invoiceDetails",
      "invoiceNumber": "{invoiceNumber}",
      "invoiceDate": "{invoiceDate}",
      "dueDate": "{dueDate}",
      "status": "sent",
      "lineItems": "{lineItems}",
      "subtotal": "{subtotal}",
      "taxTotal": "{taxTotal}",
      "total": "{total}",
      "amountDue": "{amountDue}",
      "sellerCompany": {
        "name": "{sellerCompanyName}",
        "address": "{sellerAddress}",
        "taxId": "{sellerTaxId}"
      },
      "buyerCompany": {
        "name": "{buyerCompanyName}",
        "address": "{buyerAddress}",
        "taxId": "{buyerTaxId}"
      }
    },
    {
      "type": "cta",
      "text": "View Invoice",
      "url": "{invoiceUrl}",
      "style": "primary"
    }
  ],
  "variables": [
    {
      "name": "invoiceNumber",
      "type": "string",
      "description": "Unique invoice number",
      "required": true,
      "aiInstructions": "Generate a unique invoice number like 'INV-2025-001'"
    },
    {
      "name": "invoiceDate",
      "type": "date",
      "description": "Invoice issue date",
      "required": true
    },
    {
      "name": "dueDate",
      "type": "date",
      "description": "Payment due date",
      "required": true
    },
    {
      "name": "total",
      "type": "currency",
      "description": "Total invoice amount",
      "required": true
    }
    // ... more variables
  ]
}
```

### What Changed?
1. ✅ Changed `code` from "base-email-template" to "invoice-b2b-email"
2. ✅ Changed `name` to "Invoice Email (B2B)"
3. ✅ Added `invoiceDetails` section
4. ✅ Added invoice-specific variables (invoiceNumber, dueDate, etc.)
5. ✅ Updated hero title/subtitle with invoice data
6. ✅ Updated CTA to "View Invoice"

---

## 🎨 All 14 Email Templates to Create

### Transactional (6)
1. **transaction** - Generic transaction confirmation
2. **account** - Account creation/verification
3. **shipping** - Shipping/delivery updates
4. **invoice_b2b** - B2B invoices
5. **invoice_b2c** - B2C invoices
6. **receipt** - Payment receipts

### Marketing (3)
7. **newsletter** - Email newsletters
8. **lead_magnet** - Lead magnet delivery
9. **generic** - Generic marketing email

### Event (4)
10. **event_invitation** - Event invitations
11. **event_confirmation** - Event confirmations
12. **event_reminder** - Event reminders
13. **event_followup** - Post-event followup

### Support (2)
14. **support_response** - Support ticket responses
15. **status_update** - Status updates

---

## 🔧 How to Customize Each Section Type

### Hero Section
```json
{
  "type": "hero",
  "title": "Your Main Headline",
  "subtitle": "Supporting text",
  "image": "https://example.com/image.png"
}
```

### Body Section (Paragraphs)
```json
{
  "type": "body",
  "paragraphs": [
    "First paragraph with {variable}",
    "",
    "Second paragraph",
    "Third paragraph"
  ]
}
```

### Body Section (Structured)
```json
{
  "type": "body",
  "sections": [
    {
      "title": "Section Title",
      "content": "Section content with {variable}",
      "icon": "calendar"
    }
  ]
}
```

### CTA Section
```json
{
  "type": "cta",
  "text": "Button Text",
  "url": "{actionUrl}",
  "style": "primary" // or "secondary", "outline"
}
```

### Event Details Section
```json
{
  "type": "eventDetails",
  "eventName": "{eventName}",
  "date": "{eventDate}",
  "time": "{eventTime}",
  "location": "{eventLocation}",
  "guestCount": "{guestCount}"
}
```

### Order Details Section
```json
{
  "type": "orderDetails",
  "orderNumber": "{orderNumber}",
  "orderDate": "{orderDate}",
  "items": "{orderItems}",
  "subtotal": "{subtotal}",
  "tax": "{tax}",
  "shipping": "{shipping}",
  "total": "{total}",
  "paymentMethod": "{paymentMethod}"
}
```

### Invoice Details Section
```json
{
  "type": "invoiceDetails",
  "invoiceNumber": "{invoiceNumber}",
  "invoiceDate": "{invoiceDate}",
  "dueDate": "{dueDate}",
  "status": "sent",
  "lineItems": "{lineItems}",
  "subtotal": "{subtotal}",
  "taxTotal": "{taxTotal}",
  "total": "{total}",
  "amountDue": "{amountDue}"
}
```

### Shipping Info Section
```json
{
  "type": "shippingInfo",
  "status": "shipped",
  "trackingNumber": "{trackingNumber}",
  "trackingUrl": "{trackingUrl}",
  "estimatedDelivery": "{deliveryDate}",
  "carrier": "{carrier}",
  "shippingAddress": {
    "name": "{recipientName}",
    "street": "{street}",
    "city": "{city}",
    "state": "{state}",
    "zipCode": "{zipCode}"
  }
}
```

---

## 📝 Variable Types

### String
```json
{
  "name": "firstName",
  "type": "string",
  "description": "User's first name",
  "required": true,
  "defaultValue": "John"
}
```

### Email
```json
{
  "name": "email",
  "type": "email",
  "description": "User's email address",
  "required": true,
  "validation": {
    "pattern": "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
  }
}
```

### URL
```json
{
  "name": "actionUrl",
  "type": "url",
  "description": "Call to action URL",
  "required": true
}
```

### Date
```json
{
  "name": "eventDate",
  "type": "date",
  "description": "Event date",
  "required": true,
  "defaultValue": "2025-01-15"
}
```

### Currency
```json
{
  "name": "total",
  "type": "currency",
  "description": "Total amount",
  "required": true,
  "defaultValue": 99.99
}
```

### Number
```json
{
  "name": "quantity",
  "type": "number",
  "description": "Item quantity",
  "required": true,
  "validation": {
    "min": 1,
    "max": 999
  }
}
```

---

## 🚀 Quick Start Checklist

For each email template:

1. ☐ Copy `BASE_TEMPLATE_SCHEMA.json`
2. ☐ Update `code` (e.g., "invoice-b2b-email")
3. ☐ Update `name` (e.g., "Invoice Email (B2B)")
4. ☐ Update `description`
5. ☐ Change `category` if needed
6. ☐ Modify `defaultSections` array
7. ☐ Update `variables` array
8. ☐ Update `previewData` with realistic examples
9. ☐ Save as `/src/templates/emails/schema-examples/{type}-schema.json`
10. ☐ Copy/paste into UI Schema Editor
11. ☐ Validate and save

---

## 💡 Tips

### Variable Naming
- Use camelCase: `firstName`, `invoiceNumber`, `eventDate`
- Be descriptive: `sellerCompanyName` not just `name`
- Use common patterns: `*Url`, `*Date`, `*Email`, `*Total`

### AI Instructions
- Tell AI what to generate: "Create a welcome message for new users"
- Give context: "Use formal business language for B2B emails"
- Provide examples: "Like: 'Thank you for your purchase'"

### Preview Data
- Use realistic examples
- Show all edge cases (long names, multiple items, etc.)
- Make it visually complete so designers can see final result

---

## 🎯 Next Steps

After you've created all 14 schemas manually and approved them:

1. ✅ Test each template in the UI
2. ✅ Verify all variables render correctly
3. ✅ Check preview with mock data
4. ✅ **THEN** ask Claude to create seed script

**Do NOT create seed script yet!** Manual creation first, seed script after approval.
