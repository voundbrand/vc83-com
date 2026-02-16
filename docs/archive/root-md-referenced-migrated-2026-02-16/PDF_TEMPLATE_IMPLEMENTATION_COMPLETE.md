# PDF Template Implementation - Complete

This document summarizes the PDF template system implementation following the l4yercak3-landing pattern.

## ✅ Implementation Complete

The PDF template system is now fully implemented with HTML/CSS templates stored as TypeScript string constants, using API Template.io's `/v2/create-pdf-from-html` endpoint for rendering.

## Files Created

### 1. Template HTML/CSS Files

**`convex/lib/pdf-templates/invoice-template.ts`**
- Complete invoice template with HTML and CSS as TypeScript constants
- White background, black text, configurable highlight color
- Logo support with fallback to organization name
- Jinja2 template variables for dynamic content
- Hard-coded payment terms and policy information

**`convex/lib/pdf-templates/ticket-template.ts`**
- Complete ticket template with HTML and CSS as TypeScript constants
- Professional event ticket design with QR code
- Responsive layout with event details grid
- Hard-coded event policies and instructions

### 2. Updated Files

**`convex/pdfTemplateRegistry.ts`**
- Updated to import template HTML/CSS constants
- Modified `PdfTemplateDefinition` interface to include `template: { html, css }`
- Removed `templateId` from `apiTemplate` object
- Changed endpoint to `/v2/create-pdf-from-html`
- All 6 template definitions now reference TypeScript template constants:
  - `TICKET_PROFESSIONAL_V1` → uses `TICKET_TEMPLATE_HTML/CSS`
  - `TICKET_RETRO_V1` → uses `TICKET_TEMPLATE_HTML/CSS`
  - `INVOICE_B2C_RECEIPT_V1` → uses `INVOICE_TEMPLATE_HTML/CSS`
  - `INVOICE_B2B_CONSOLIDATED_V1` → uses `INVOICE_TEMPLATE_HTML/CSS`
  - `INVOICE_B2B_CONSOLIDATED_DETAILED_V1` → uses `INVOICE_TEMPLATE_HTML/CSS`
  - `CERTIFICATE_CME_V1` → placeholder (needs certificate template)

### 3. PDF Generation Module

**`convex/lib/generatePdf.ts`**
- Core `generatePdfFromTemplate()` function
- Helper `generateInvoicePdf()` function
- Helper `generateTicketPdf()` function
- Full TypeScript types and error handling
- Example usage in JSDoc comments

## Design Standards Implemented

All PDF templates follow the required design standards:

✅ **White background** (#FFFFFF)
✅ **Black text** (#000000)
✅ **One configurable highlight color** (default: #6B46C1)
✅ **Logo support** with fallback to organization name
✅ **Template-specific information** hard-coded in HTML

## Architecture Pattern

The implementation follows the l4yercak3-landing pattern:

```
┌─────────────────────────────────────────────────────────┐
│ Template Storage (TypeScript Constants)                │
│ - convex/lib/pdf-templates/invoice-template.ts         │
│ - convex/lib/pdf-templates/ticket-template.ts          │
│   └─> INVOICE_TEMPLATE_HTML, INVOICE_TEMPLATE_CSS      │
│   └─> TICKET_TEMPLATE_HTML, TICKET_TEMPLATE_CSS        │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ Template Registry (Metadata)                            │
│ - convex/pdfTemplateRegistry.ts                         │
│   └─> PDF_TEMPLATE_REGISTRY with field definitions     │
│   └─> References to HTML/CSS constants                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ PDF Generation (Runtime)                                │
│ - convex/lib/generatePdf.ts                             │
│   └─> Fetch template from registry                     │
│   └─> Merge org settings + dynamic data                │
│   └─> POST to /v2/create-pdf-from-html                 │
│   └─> Return PDF URL                                   │
└─────────────────────────────────────────────────────────┘
```

## Template Variables

### Organization Settings (Configurable)
These are stored in the database and passed at generation time:
- `logo_url` - Organization logo URL
- `highlight_color` - Accent color (default: #6B46C1)
- `organization_name` - Organization name
- `organization_address` - Full address
- `organization_phone` - Contact phone
- `organization_email` - Contact email

### Invoice Template Variables
- `invoice_number` - Unique invoice ID
- `invoice_date` - Issue date
- `due_date` - Payment due date
- `bill_to` - Customer information object
- `items[]` - Line items array
- `subtotal`, `tax_rate`, `tax`, `total` - Financial calculations

### Ticket Template Variables
- `ticket_number` - Unique ticket ID
- `ticket_type` - Ticket category (VIP, General, etc.)
- `attendee_name` - Ticket holder name
- `attendee_email` - Ticket holder email
- `event_name` - Event title
- `event_date` - Event date
- `event_time` - Event time
- `event_location` - Venue name
- `event_address` - Venue address
- `qr_code_data` - QR code validation URL

## Usage Example

### Generate Invoice PDF

```typescript
import { generateInvoicePdf } from "./convex/lib/generatePdf";

const result = await generateInvoicePdf({
  apiKey: process.env.API_TEMPLATE_IO_KEY!,
  templateCode: "invoice_b2b_consolidated_v1",

  organizationSettings: {
    logo_url: "https://cdn.vc83.com/logos/mei-logo.png",
    highlight_color: "#6B46C1",
    organization_name: "Medical Education Institute",
    organization_address: "123 Main St, City, State 12345",
    organization_phone: "(555) 123-4567",
    organization_email: "billing@mei.org",
  },

  invoiceData: {
    invoice_number: "INV-2025-001234",
    invoice_date: "January 15, 2025",
    due_date: "February 14, 2025",
    bill_to: {
      company_name: "ABC Medical School",
      address: "123 University Ave",
      city: "Boston",
      state: "MA",
      zip_code: "02115",
    },
    items: [
      {
        description: "Conference Registration (10 attendees)",
        quantity: 10,
        rate: 299.00,
        amount: 2990.00,
      },
      {
        description: "Workshop Bundle Access",
        quantity: 10,
        rate: 99.00,
        amount: 990.00,
      },
    ],
    subtotal: 3980.00,
    tax_rate: 8.0,
    tax: 318.40,
    total: 4298.40,
  },
});

if (result.status === "success") {
  console.log("PDF generated:", result.download_url);
} else {
  console.error("PDF generation failed:", result.error, result.message);
}
```

### Generate Ticket PDF

```typescript
import { generateTicketPdf } from "./convex/lib/generatePdf";

const result = await generateTicketPdf({
  apiKey: process.env.API_TEMPLATE_IO_KEY!,
  templateCode: "ticket_professional_v1",

  organizationSettings: {
    logo_url: "https://cdn.vc83.com/logos/mei-logo.png",
    highlight_color: "#6B46C1",
    organization_name: "Medical Education Institute",
  },

  ticketData: {
    ticket_number: "TKT-2025-001234",
    ticket_type: "VIP Access",
    attendee_name: "Dr. John Doe",
    attendee_email: "john.doe@example.com",
    event_name: "Medical Conference 2025",
    event_date: "March 15, 2025",
    event_time: "9:00 AM - 5:00 PM",
    event_location: "Convention Center",
    event_address: "456 Event Plaza, City, State 12345",
    qr_code_data: "https://vc83.com/validate/TKT-2025-001234",
  },
});

if (result.status === "success") {
  console.log("Ticket PDF generated:", result.download_url);
}
```

## Next Steps

### 1. Create Certificate Template
Create `convex/lib/pdf-templates/certificate-template.ts` with:
- Landscape orientation for traditional certificate layout
- Elegant typography for formal presentation
- Signature placeholders for authorized signatories
- Accreditation information display

### 2. Environment Configuration
Set up API Template.io API key:

```bash
npx convex env set API_TEMPLATE_IO_KEY "your_api_key_here"
```

### 3. Seed Templates to Database
Run the seeding mutation to populate the database:

```bash
npx convex run seedPdfTemplates:seedPdfTemplates
```

### 4. Create Template Availability System
Allow super admin to enable/disable templates per organization:
- UI for super admin to configure which orgs can access which templates
- Logo upload interface for organizations
- Color picker for highlight color configuration

### 5. Integration with Workflows
Integrate PDF generation into existing workflows:
- **Invoice workflow**: Generate PDF when invoice is created
- **Ticket workflow**: Generate ticket PDF on checkout completion
- **Certificate workflow**: Generate certificate on course completion

### 6. Testing
Create test cases for:
- Template rendering with different data sets
- Organization settings customization (logo, colors)
- Error handling (missing data, API failures)
- PDF validation (check download URLs work)

## File Structure

```
convex/
├── lib/
│   ├── pdf-templates/
│   │   ├── invoice-template.ts       ✅ Created
│   │   ├── ticket-template.ts        ✅ Created
│   │   └── certificate-template.ts   ⏳ TODO
│   ├── generatePdf.ts                ✅ Created
│   └── apiTemplateClient.ts          (existing)
├── pdfTemplateRegistry.ts            ✅ Updated
└── seedPdfTemplates.ts               (existing)

docs/
└── PDF_TEMPLATE_IMPLEMENTATION_COMPLETE.md  ✅ This file
```

## Key Benefits

1. **No Dashboard Dependency**: Templates stored in code, version controlled
2. **Type Safety**: Full TypeScript types for all template data
3. **Reusability**: Same base templates with different styling via CSS variables
4. **Customization**: Per-organization logo and color configuration
5. **Maintainability**: Template HTML/CSS can be edited and tested locally
6. **Consistency**: All templates follow the same white/black/highlight color scheme

## Technical Notes

- **Jinja2 Syntax**: Templates use `{{variable}}` for variables, `{%for%}` for loops, `{%if%}` for conditionals
- **CSS Variables**: Use `{{highlight_color}}` in CSS to make colors configurable
- **Logo Fallback**: `{%if logo_url%}` provides graceful fallback to text
- **API Endpoint**: Uses `/v2/create-pdf-from-html` (not `/v2/create-pdf-url`)
- **Response**: API returns `download_url` for PDF and `transaction_ref` for tracking

---

**Status**: ✅ Core implementation complete
**Last Updated**: 2025-01-01
**Version**: 1.0.0
