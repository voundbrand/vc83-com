# Template Preview Fix

## Issue Reported
User reported seeing weird rendering in ticket preview:
- Missing QR code (image not showing)
- Template code like `{%endif%}` showing up in the preview instead of being processed

## Root Cause
The template preview modal was using `createMockInvoiceData()` for ALL template types, including tickets. Ticket templates have a completely different data structure than invoice templates, so they weren't rendering properly.

**Key Issues:**
1. Wrong mock data function: Using invoice data for ticket templates
2. Missing required fields: Ticket templates need `qr_code_data`, `event_name`, `attendee_name`, etc.
3. Template syntax not being processed: Because data structure was wrong, conditional blocks weren't rendering

## Solution Implemented

### 1. Created `createMockTicketData()` Function
**File:** [src/lib/template-renderer.ts](src/lib/template-renderer.ts:323)

Added a new function that creates proper mock data for ticket templates with all required fields:

```typescript
export function createMockTicketData(templateCode: string): TemplateData {
  return {
    // Organization details
    organization_name: "L4YERCAK3 Events",
    organization_email: "tickets@l4yercak3.com",
    organization_phone: "(555) 123-4567",
    highlight_color: "#d4af37", // Gold

    // Event details
    event_name: "Exclusive VIP Gala 2025",
    event_date: "Saturday, January 25, 2025",
    event_time: "7:00 PM - 11:00 PM",
    event_location: "Grand Ballroom",
    event_address: "456 Luxury Avenue, New York, NY 10022",
    event_sponsors: [...],

    // Ticket details
    ticket_number: "TKT-2025-001234",
    ticket_type: "VIP Access",

    // Attendee details
    attendee_name: "John Doe",
    attendee_email: "john.doe@example.com",
    guest_count: 2,

    // QR Code (URL-encoded for external API)
    qr_code_data: encodeURIComponent("https://l4yercak3.com/verify/TKT-2025-001234"),

    // Metadata
    order_id: "ORD-2025-5678",
    purchase_date: "January 10, 2025",
    price_paid: "$79.00",
  };
}
```

### 2. Updated Template Preview Modal
**File:** [src/components/template-set-preview-modal.tsx](src/components/template-set-preview-modal.tsx:78)

Changed ticket preview to use the correct mock data function:

```typescript
// Before (WRONG):
const { renderTemplate, createMockInvoiceData } = await import("@/lib/template-renderer");
const mockData = createMockInvoiceData(templateCode);

// After (CORRECT):
const { renderTemplate, createMockTicketData } = await import("@/lib/template-renderer");
const mockData = createMockTicketData(templateCode);
```

## How QR Codes Work in Templates

Ticket templates use an external QR code generation API:
```html
<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data={{qr_code_data}}"
     alt="Ticket QR Code"
     class="qr-code" />
```

The `qr_code_data` variable needs to be a URL-encoded string. The mock data now provides:
```typescript
qr_code_data: encodeURIComponent("https://l4yercak3.com/verify/TKT-2025-001234")
```

This renders as a working QR code image via the API.

## Template Syntax Processing

The templates use Jinja2-like syntax which the `renderTemplate()` function processes:
- `{{variable}}` - Variable substitution
- `{%if condition%}...{%endif%}` - Conditionals
- `{%for item in items%}...{%endfor%}` - Loops

**Example from template:**
```html
{%if logo_url%}
    <img src="{{logo_url}}" class="logo" alt="{{organization_name}}" />
{%else%}
    <div class="logo-text">{{organization_name}}</div>
{%endif%}
```

With proper mock data, this now renders correctly as:
```html
<div class="logo-text">L4YERCAK3 Events</div>
```

Instead of showing the raw template code.

## Template Data Structure Reference

### Ticket Templates Expect:
- **Organization:** `organization_name`, `organization_email`, `organization_phone`, `organization_website`, `logo_url`, `highlight_color`
- **Event:** `event_name`, `event_date`, `event_time`, `event_location`, `event_address`, `event_sponsors`
- **Ticket:** `ticket_number`, `ticket_type`, `qr_code_data`
- **Attendee:** `attendee_name`, `attendee_email`, `guest_count`
- **Metadata:** `order_id`, `purchase_date`, `price_paid`

### Invoice Templates Expect:
- **Organization:** `organization_name`, `organization_address`, `organization_email`, `logo_url`, `highlight_color`
- **Customer:** `bill_to` (B2B) or `customer_name` (B2C), `customer_email`
- **Invoice:** `invoice_number`, `invoice_date`, `due_date`, `currency`, `payment_method`
- **Items:** Array of `{description, quantity, unit_price, tax_amount, total_price, tax_rate}`
- **Totals:** `subtotal`, `tax`, `total`, `tax_rate`

### Email Templates Expect:
- **Ticket:** `_id`, `name`, `ticketNumber`, `status`, `customProperties`
- **Event:** `_id`, `name`, `customProperties`
- **Attendee:** `firstName`, `lastName`, `email`, `guestCount`
- **Domain:** `domainName`, `siteUrl`, `mapsUrl`
- **Branding:** `primaryColor`, `secondaryColor`, `accentColor`, `logoUrl`
- **Language:** `"en" | "de" | "es" | "fr"`

## Testing Performed

### Manual Testing
✅ Opened template set preview modal
✅ Switched to Ticket tab
✅ Verified QR code displays (via external API)
✅ Verified event name, date, time display correctly
✅ Verified attendee information displays
✅ Verified no template syntax (`{%endif%}`) appears in output
✅ Checked that conditional blocks render properly

### Automated Testing
✅ TypeScript compilation: **PASS**
✅ ESLint checks: **PASS**
✅ No console errors during preview

## Expected Behavior Now

When users open a template set preview and view the Ticket tab:
1. **QR Code Displays:** Shows a scannable QR code image (via api.qrserver.com)
2. **Event Information:** Event name, date, time, location all populate correctly
3. **Attendee Info:** Shows "John Doe" with email and guest count
4. **No Template Code:** All `{%...%}` syntax is processed and doesn't appear
5. **Professional Look:** Template renders exactly as it would in a real PDF

## Files Modified

1. **src/lib/template-renderer.ts** - Added `createMockTicketData()` function
2. **src/components/template-set-preview-modal.tsx** - Updated to use correct mock data function

## Next Steps (If Issues Persist)

If users still see issues:
1. Check browser console for errors during template loading
2. Verify the template code matches expected format (check `pdfTemplateRegistry.ts`)
3. Ensure external QR code API is accessible (check network tab)
4. Verify template conditional logic matches available mock data fields

## Related Documentation

- [TEMPLATE_SET_FEATURES_IMPLEMENTATION.md](TEMPLATE_SET_FEATURES_IMPLEMENTATION.md) - Full implementation summary
- [convex/lib/pdf_templates/](convex/lib/pdf_templates/) - Actual PDF template files
- [src/lib/template-renderer.ts](src/lib/template-renderer.ts) - Template rendering engine
