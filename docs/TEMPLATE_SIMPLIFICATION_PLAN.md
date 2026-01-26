# Template System Simplification Plan

> Created: 2026-01-19
> Goal: Remove template selection complexity, use ONE hardcoded template per document type

## Current Problem

We have a complex template system with:
- Template sets
- Template selection chains (product → checkout → domain → organization → system)
- Multiple email templates (18+ in registry)
- Multiple PDF templates
- Preview vs. send discrepancies
- Gold theme showing in previews but not in actual sends

## Desired State

**ONE template per document type, hardcoded, with branding support only:**

| Document Type | Template | Branding Support |
|---------------|----------|------------------|
| Order Confirmation Email | Single professional email | Logo + Primary Color |
| Ticket PDF | Single professional ticket | Logo + Primary Color |
| Invoice PDF | Single professional invoice | Logo + Primary Color |

## What We Keep

1. **Branding resolution** (already works):
   - Organization branding settings (logo, primaryColor, secondaryColor)
   - Domain config override (if set)
   - Passed as `highlight_color` and `logo_url` to templates

2. **API Template.io** for PDFs (already works):
   - `convex/lib/generateInvoicePdf.ts`
   - Uses HTML/CSS templates with variable substitution

3. **Multi-language support** for emails (keep translations)

## What We Remove

1. **Template selection logic**:
   - `convex/templateSetQueries.ts` - resolveIndividualTemplateInternal
   - `convex/pdfTemplateQueries.ts` - template resolution chains
   - `convex/emailTemplateResolver.ts` - template resolution

2. **Template registry** (most of it):
   - `src/templates/emails/registry.ts` - keep only what we need
   - `convex/pdfTemplateRegistry.ts` - keep only the one template

3. **Template set system**:
   - Template sets, template set availability, copying template sets
   - UI for selecting templates

4. **Premium/luxury templates**:
   - `luxury-confirmation`, `vip-exclusive`, `modern-minimal` choices
   - Gold theme templates

## Implementation Steps

### Phase 1: Identify the Working Templates

Find which templates are actually working well:

1. **Invoice PDF**: Uses `invoice_b2b_single_v1` or dashboard template
   - File: `convex/lib/pdf_templates/`
   - Already has branding support

2. **Ticket PDF**: Uses professional template
   - File: `convex/pdf/ticketPdf.ts`
   - Already has branding support

3. **Order Confirmation Email**: Need to identify or create
   - Should use professional, clean design
   - Must support logo + primaryColor

### Phase 2: Simplify PDF Generation

**invoicePdf.ts changes:**
```typescript
// REMOVE: Template resolution logic (lines 950-988)
// KEEP: Branding resolution (lines 127-180)
// CHANGE: Hardcode template code

const templateCode = "invoice_b2b_single_v1"; // Hardcoded
```

**ticketPdf.ts changes:**
```typescript
// REMOVE: Template resolution logic
// KEEP: Branding resolution
// CHANGE: Hardcode template
```

### Phase 3: Simplify Email Generation

**ticketGeneration.ts - sendOrderConfirmationEmail:**
```typescript
// REMOVE: Template resolution (lines 612-654)
// REMOVE: Import of orderEmailRenderer with gold theme
// ADD: Simple inline email HTML with branding variables

const emailHtml = generateProfessionalOrderEmail({
  recipientName,
  eventName,
  eventSponsors,
  eventLocation,
  formattedDate,
  ticketCount,
  orderNumber,
  orderDate,
  primaryColor: brandPrimaryColor,  // From branding resolution
  logoUrl: brandLogoUrl,            // From branding resolution
  organizationName,
  translations: emailTranslations,
});
```

### Phase 4: Clean Up Files

**Files to modify:**
- `convex/ticketGeneration.ts` - Remove template resolution, use hardcoded template
- `convex/pdf/invoicePdf.ts` - Remove template resolution, hardcode template
- `convex/pdf/ticketPdf.ts` - Remove template resolution, hardcode template

**Files potentially to delete/simplify:**
- `convex/templateSetQueries.ts` - May still be needed for other features
- `convex/pdfTemplateQueries.ts` - Simplify significantly
- `src/templates/emails/registry.ts` - Keep minimal
- `convex/helpers/orderEmailRenderer.ts` - Replace with simpler version

### Phase 5: Update UI

- Remove template selection from checkout configuration
- Remove template preview modal usage for document templates
- Keep only branding settings in organization settings

## The One Email Template

Create a single, professional order confirmation email:

```html
<!-- Professional Order Confirmation - Uses primaryColor and logoUrl -->
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px;">

    <!-- Header with branding -->
    <div style="background: {{primaryColor}}; padding: 30px; text-align: center;">
      {{#if logoUrl}}<img src="{{logoUrl}}" style="max-height: 40px;">{{/if}}
      <h1 style="color: #fff;">Order Confirmation</h1>
    </div>

    <!-- Content -->
    <div style="padding: 30px;">
      <p>Dear {{recipientName}},</p>
      <p>{{translations.confirmed}}</p>

      <!-- Event Details -->
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="color: {{primaryColor}};">{{eventName}}</h2>
        <p>{{ticketCount}} Ticket(s)</p>
        <p>{{formattedDate}}</p>
        {{#if eventLocation}}<p>{{eventLocation}}</p>{{/if}}
      </div>

      <!-- Order Info -->
      <p style="color: #666; font-size: 13px;">
        Order #{{orderNumber}} · {{orderDate}}
      </p>

      <!-- Attachments Note -->
      <div style="border-left: 3px solid {{primaryColor}}; padding-left: 15px; margin: 20px 0;">
        <p><strong>{{translations.documentsHeader}}</strong></p>
        <p>{{translations.documentsBody}}</p>
      </div>

      <p>{{translations.closing}}</p>
      <p style="color: {{primaryColor}};">{{translations.team}}</p>
    </div>

    <!-- Footer -->
    <div style="background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666;">
      <p>{{translations.supportText}}</p>
      <p>{{translations.copyright}}</p>
    </div>
  </div>
</body>
</html>
```

## Benefits

1. **Simpler codebase** - Remove thousands of lines of template selection logic
2. **No preview/send mismatch** - One template, no selection = always consistent
3. **Faster sends** - No template resolution queries
4. **Easier maintenance** - Change one template, affects everyone
5. **Still customizable** - Logo and color per organization

## Questions to Answer

1. Which existing invoice PDF template works best? (Need to test)
2. Which ticket PDF template works best?
3. Should we keep translations in database or hardcode?

## Next Steps

1. Test current templates to identify the "professional" ones that work
2. Hardcode the template codes in the generation functions
3. Remove template resolution logic
4. Test end-to-end
5. Clean up unused files
