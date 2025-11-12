# Template.io Integration - Complete

This document summarizes the Template.io integration for PDF ticket generation, replacing hand-coded jsPDF with HTML/CSS templates rendered via API Template.io.

## ✅ Implementation Complete

The PDF ticket template system now uses API Template.io's `/v2/create-pdf-from-html` endpoint for professional, designer-quality ticket PDFs.

## Architecture Overview

### Previous System (jsPDF)
- **Problem**: 300+ lines of manual PDF drawing code per template
- **Maintenance**: Difficult to update designs
- **Quality**: Limited styling capabilities

### New System (Template.io)
- **Solution**: HTML/CSS templates stored as TypeScript constants
- **Maintenance**: Easy to update - just edit HTML/CSS
- **Quality**: Full CSS capabilities, professional designs
- **Rendering**: API Template.io generates high-quality PDFs

### Hybrid Approach
The system supports both rendering methods:
1. **Primary**: Template.io HTML/CSS rendering (professional quality)
2. **Fallback**: jsPDF for offline/development scenarios (if needed)

## Files Created

### 1. HTML/CSS Template Files

**`convex/lib/pdf_templates/elegant_gold_ticket_template.ts`**
- Luxurious black & gold design for upscale events
- Dark background (#1a1412) with gold accents (#d4af37)
- QR code with gold frame, elegant typography
- Sponsor display, barcode-style ticket number

**`convex/lib/pdf_templates/modern_ticket_template.ts`**
- Clean, contemporary design with bold typography
- Light background with configurable primary color
- Minimalist layout, bottom-right QR code
- Ideal for tech events and modern brands

**`convex/lib/pdf_templates/vip_premium_ticket_template.ts`**
- Exclusive VIP design with premium styling
- Very dark background (#0f0f0f) with VIP gold (#FFD700)
- Prominent VIP badge, centered QR code
- Elevated aesthetics for VIP ticket holders

### 2. Template.io Renderer Service

**`convex/lib/generateTicketPdf.ts`**
- Core `generateTicketPdfFromTemplate()` function
- Template registry mapping codes to HTML/CSS constants
- Full TypeScript types and error handling
- Helper functions: `getAvailableTicketTemplateCodes()`, `isValidTicketTemplateCode()`

### 3. Updated PDF Ticket Template Renderer

**`convex/pdfTicketTemplateRenderer.ts`**
- Added `generatePdfTicketWithTemplateIo()` action
- Integrates Template.io with existing resolution chain
- Formats data for Template.io rendering
- Returns PDF download URL from Template.io API

## Template Resolution Chain

The system follows this hierarchy to determine which PDF template to use:

```
1. Ticket level (direct override)
   ├─ Check pdfTemplateId (database reference)
   └─ Check pdfTemplateCode (direct code reference)

2. Product level
   ├─ Check pdfTemplateId (database reference)
   └─ Check pdfTemplateCode (direct code reference)

3. Event level
   ├─ Check pdfTemplateId (database reference)
   └─ Check pdfTemplateCode (direct code reference)

4. Domain level (TODO: implement domain config support)

5. Organization level (TODO: implement org default template)

6. System fallback → "elegant-gold"
```

## Template Data Structure

### Required Data Fields

All three templates support these data fields:

```typescript
{
  // Ticket info
  ticket_number?: string;
  ticket_type?: string;
  attendee_name: string;
  attendee_email?: string;
  guest_count?: number;

  // Event info
  event_name: string;
  event_date: string;
  event_time: string;
  event_location: string;
  event_address?: string;
  event_sponsors?: Array<{ name: string; level?: string }>;

  // QR code
  qr_code_data: string;

  // Organization/branding
  organization_name?: string;
  organization_email?: string;
  organization_phone?: string;
  organization_website?: string;
  logo_url?: string;
  highlight_color?: string; // Defaults: elegant-gold=#d4af37, modern=#6B46C1, vip=#FFD700

  // Order info (optional)
  order_id?: string;
  order_date?: string;
  currency?: string;
  net_price?: string;
  tax_amount?: string;
  tax_rate?: string;
  total_price?: string;
}
```

## Design Standards

All templates follow these standards:

### Elegant Gold
- **Background**: Dark (#1a1412)
- **Accent**: Gold (#d4af37)
- **Typography**: Serif (Garamond, Georgia)
- **Layout**: Left-aligned details, right QR code
- **Style**: Luxury, upscale events

### Modern Ticket
- **Background**: Light (#FFFFFF)
- **Accent**: Configurable purple (#6B46C1)
- **Typography**: Sans-serif (System fonts)
- **Layout**: Clean grid, bottom-right QR
- **Style**: Contemporary, tech events

### VIP Premium
- **Background**: Very dark (#0f0f0f)
- **Accent**: VIP gold (#FFD700)
- **Typography**: Sans-serif (Helvetica Neue)
- **Layout**: Centered QR, VIP badge
- **Style**: Exclusive, premium events

## Usage Example

### Generate Ticket PDF with Template.io

```typescript
// In Convex action
import { api } from "./_generated/api";

const result = await ctx.runAction(
  api.pdfTicketTemplateRenderer.generatePdfTicketWithTemplateIo,
  {
    ticketId: args.ticketId,
    checkoutSessionId: args.checkoutSessionId,
  }
);

if (result.status === "success") {
  console.log("PDF URL:", result.download_url);
  console.log("Transaction:", result.transaction_ref);
} else {
  console.error("Error:", result.error, result.message);
}
```

### Test Template Directly

```typescript
import { generateTicketPdfFromTemplate } from "./convex/lib/generateTicketPdf";

const pdfResult = await generateTicketPdfFromTemplate({
  apiKey: process.env.API_TEMPLATE_IO_KEY!,
  templateCode: "elegant-gold",
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
    highlight_color: "#d4af37",
    organization_name: "Medical Education Institute",
  },
});
```

## Environment Configuration

Set up API Template.io API key:

```bash
npx convex env set API_TEMPLATE_IO_KEY "your_api_key_here"
```

## Integration Points

### 1. Ticket Generation Workflow

When a ticket is purchased:

```typescript
// In checkout completion
const pdfResult = await ctx.runAction(
  api.pdfTicketTemplateRenderer.generatePdfTicketWithTemplateIo,
  { ticketId, checkoutSessionId }
);

if (pdfResult.status === "success") {
  // Store PDF URL in ticket
  await ctx.runMutation(api.ticketOntology.updateTicket, {
    ticketId,
    updates: {
      pdfUrl: pdfResult.download_url,
      pdfTransactionRef: pdfResult.transaction_ref,
    },
  });
}
```

### 2. Email Attachment

Tickets can be attached to confirmation emails:

```typescript
// After generating PDF
await ctx.runAction(api.emailDelivery.sendTicketEmail, {
  ticketId,
  pdfUrl: pdfResult.download_url,
});
```

### 3. Admin Preview

Admins can preview templates in domain config or event settings using the template preview modal.

## Benefits of Template.io Integration

### 1. Designer-Quality PDFs
- Full CSS capabilities (gradients, shadows, custom fonts)
- Professional typography and spacing
- Pixel-perfect rendering

### 2. Easy Maintenance
- Update designs by editing HTML/CSS
- No need to understand PDF coordinate systems
- Preview changes in browser before deploying

### 3. Version Control
- Templates stored as code in git
- Track changes and revert if needed
- No external template dashboard dependency

### 4. Type Safety
- Full TypeScript support
- Compile-time validation of data fields
- Autocomplete for template properties

### 5. Rapid Development
- Create new templates quickly
- Copy existing templates as starting points
- Test locally with sample data

## Performance Considerations

### API Template.io Limits
- **Rate Limit**: 100 requests per 10 seconds
- **File Size**: PDFs typically 100-500KB
- **Generation Time**: 2-5 seconds average

### Optimization Strategies
1. **Caching**: Store generated PDFs, regenerate only when data changes
2. **Async Generation**: Generate PDFs in background, not during checkout
3. **Fallback**: Implement jsPDF fallback for offline scenarios
4. **Batch Operations**: Queue multiple tickets for batch generation

## Testing

### Manual Testing

```bash
# Test template rendering
npx convex run pdfTicketTemplateRenderer:generatePdfTicketWithTemplateIo \
  --ticketId 'k123abc' \
  --checkoutSessionId 'k456def'
```

### Test Templates Available

- `elegant-gold` - Luxury black & gold design
- `modern-ticket` - Clean contemporary design
- `vip-premium` - Exclusive VIP design

## Next Steps

### 1. Add Domain Config Support (TODO)
Enable domain-level template selection:
- Add `pdfTemplateId` to domain config
- Implement resolution in template renderer

### 2. Add Organization Default (TODO)
Allow organizations to set default template:
- Store org preference in database
- Fall back to org default before system default

### 3. Create Additional Templates
Expand template library:
- `certificate-template` (landscape orientation)
- `backstage-pass-template` (credential style)
- `workshop-ticket-template` (education focus)

### 4. Preview System Integration
Add template preview to:
- Product edit modal (select PDF template)
- Event edit modal (select PDF template)
- Domain config modal (already added for email)

### 5. Template Gallery
Create admin interface for:
- Browse available templates
- Preview templates with sample data
- Assign templates to products/events/domains

## Technical Notes

- **Jinja2 Syntax**: Templates use `{{variable}}` for variables, `{%for%}` for loops, `{%if%}` for conditionals
- **CSS Variables**: Use `{{highlight_color}}` in CSS to make colors configurable
- **QR Codes**: Generated via API (https://api.qrserver.com) embedded in PDF
- **API Endpoint**: Uses `/v2/create-pdf-from-html` (not `/v2/create-pdf-url`)
- **Response**: API returns `download_url` for PDF and `transaction_ref` for tracking

## Comparison with Email Templates

### Similarities
- Both use HTML/CSS for layouts
- TypeScript constants for version control
- Template registry pattern
- Resolution chain concept

### Differences
| Feature | Email Templates | PDF Templates |
|---------|----------------|---------------|
| Rendering | React → HTML → Email | HTML → Template.io → PDF |
| Variables | React props | Jinja2 template variables |
| Preview | iframe + React | API call required |
| Languages | Multi-language support | Single render per language |
| Styling | Inline styles for email | Full CSS capabilities |

## Migration from jsPDF

The old jsPDF templates are preserved in `src/templates/pdfs/tickets/*/index.ts` but are no longer used as the primary rendering method. They can serve as fallback if Template.io API is unavailable.

To completely remove jsPDF dependencies:
1. Remove jsPDF functions from template files
2. Update registry to remove jsPDF references
3. Remove jsPDF from package.json

---

**Status**: ✅ Core implementation complete
**Last Updated**: 2025-01-12
**Version**: 1.0.0
