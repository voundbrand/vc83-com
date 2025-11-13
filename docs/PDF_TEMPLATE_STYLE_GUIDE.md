# PDF Template Style Implementation Guide

This guide ensures all PDF templates are implemented correctly with proper styling, formatting, and API Template.io integration.

## ✅ Technical Requirements Checklist

### 1. File Structure
- [ ] Template exports both `HTML` and `CSS` as separate constants
- [ ] HTML is pure HTML without `<style>` tags
- [ ] CSS is pure CSS without `<style>` wrapper tags (added by generator)
- [ ] Template is registered in `convex/pdfTemplateRegistry.ts`

**Example:**
```typescript
export const INVOICE_TEMPLATE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{invoice_number}}</title>
</head>
<body>
    <!-- Content here -->
</body>
</html>
`;

export const INVOICE_TEMPLATE_CSS = `
/* Base styles - NO <style> tags here! */
:root {
    --highlight-color: {{highlight_color}};
}
body {
    font-family: 'Inter', 'Helvetica', 'Arial', sans-serif;
}
`;
```

### 2. API Template.io Integration
- [ ] Generator wraps CSS in `<style>` tags: `css: \`<style>\${template.template.css}</style>\``
- [ ] Margins set to `5mm` for all sides (not 15mm)
- [ ] `print_background: true` enabled for gradients/colors
- [ ] Paper size defaults to `A4`
- [ ] Orientation defaults to `portrait`

### 3. Jinja2 Template Variables
- [ ] All dynamic data uses Jinja2 syntax: `{{variable_name}}`
- [ ] Conditional blocks use `{%if condition%}...{%endif%}`
- [ ] Loops use `{%for item in items%}...{%endfor%}`
- [ ] Template variables match data passed from generator

## 🎨 Design Standards Checklist

### Typography
- [ ] Headers use clear hierarchy (h1 > h2 > h3)
- [ ] Body text is readable (11pt minimum)
- [ ] Font stack includes fallbacks: `'Inter', 'Helvetica', 'Arial', sans-serif`
- [ ] Line height provides breathing room (1.5 for body, 1.2 for headers)
- [ ] Letter spacing used sparingly for headers/labels

### Color System
- [ ] Uses CSS variables for brand colors: `--highlight-color: {{highlight_color}}`
- [ ] Default highlight color: `#6B46C1` (purple)
- [ ] Text colors are accessible (sufficient contrast)
- [ ] Background colors print correctly with `print_background: true`

### Spacing & Layout
- [ ] Consistent margins/padding throughout
- [ ] Elements have proper breathing room
- [ ] Related content grouped together
- [ ] Clear visual hierarchy with spacing

### Tables (for invoices)
- [ ] Clean borders and cell padding
- [ ] Header row visually distinct (colored background)
- [ ] Alternating row colors optional but recommended
- [ ] Right-align numeric columns
- [ ] Clear totals section at bottom

### Branding Elements
- [ ] Logo placement (if provided)
- [ ] Organization name prominent
- [ ] Contact information visible
- [ ] Consistent brand color usage

## 📋 Template-by-Template Verification

### Invoice Templates

#### `invoice_b2b_single.ts` (B2B Single Invoice)
**Purpose:** Professional invoice for individual B2B transactions with VAT breakdown

**Design Standards:**
- [ ] Purple branding (`#6B46C1`)
- [ ] White background with purple accents
- [ ] Professional table with purple header
- [ ] VAT breakdown clearly visible (Net, VAT, Gross)
- [ ] Payment terms section with purple left border
- [ ] Organization info in header
- [ ] Bill To section clear and prominent

**Required Fields:**
- [ ] `organization_name`, `organization_address`, `organization_phone`, `organization_email`
- [ ] `invoice_number`, `invoice_date`, `due_date`
- [ ] `bill_to` (company_name, contact_name, address, vat_number)
- [ ] `items[]` (description, quantity, unit_price_formatted, tax_amount_formatted, total_price_formatted, tax_rate)
- [ ] `subtotal_formatted`, `tax_formatted`, `total_formatted`, `tax_rate`
- [ ] `payment_terms`, `payment_method`
- [ ] All translation keys (t_invoice, t_billTo, etc.)

**Visual Check:**
- [ ] Header has purple bottom border
- [ ] Invoice title section has purple background
- [ ] Table header has purple background with white text
- [ ] Payment terms has light gray background with purple left border
- [ ] Footer has subtle gray top border
- [ ] "Thank you" text in purple

#### `invoice_template.ts` (Legacy B2C)
**Purpose:** Simple receipt-style invoice for B2C transactions

**Design Standards:**
- [ ] Similar to B2B but simpler layout
- [ ] Clear itemization
- [ ] Total prominently displayed

**Required Fields:**
- Similar to B2B but may have fewer fields

---

### Ticket Templates

#### `vip_premium_ticket_template.ts` (Geschlossene Gesellschaft Style)
**Purpose:** Luxurious dark-themed VIP ticket with gold accents

**Design Standards:**
- [ ] Dark gradient background (`#1a1412` to `#2c1810`)
- [ ] Elegant gold accents (`#d4af37`)
- [ ] Cream text (`#f5f1e8`)
- [ ] Ornamental dividers
- [ ] QR code on white background panel
- [ ] Serif typography (Didot, Bodoni, Garamond)

**Required Fields:**
- [ ] `event_name`, `event_date`, `event_time`, `event_location`, `event_address`
- [ ] `ticket_number`, `ticket_type`
- [ ] `attendee_name`, `guest_count`
- [ ] `qr_code_data` (validation URL)
- [ ] `organization_name`

**Visual Check:**
- [ ] Dark gradient background renders (needs `print_background: true`)
- [ ] Gold ornamental lines visible
- [ ] "Geschlossene Gesellschaft" title in gold
- [ ] Event details in boxes with gold borders
- [ ] QR code on white panel (high contrast)
- [ ] Footer tagline: "Privat · Offen · Echt"

#### `ticket_template.ts` (Professional Standard)
**Purpose:** Clean professional ticket for standard events

**Design Standards:**
- [ ] Purple branding matching invoices
- [ ] White/light gray background
- [ ] Clear information hierarchy
- [ ] QR code prominent

**Required Fields:**
- Similar to VIP but simpler styling

#### `elegant_gold_ticket_template.ts` (Elegant Gold)
**Purpose:** Elegant ticket with gold accents

**Design Standards:**
- [ ] Gold color scheme
- [ ] Elegant typography
- [ ] Professional but upscale

#### `modern_ticket_template.ts` (Modern Minimal)
**Purpose:** Clean modern design

**Design Standards:**
- [ ] Minimalist approach
- [ ] Clear typography
- [ ] Good use of white space

## 🧪 Testing Checklist

### For Each Template:

#### 1. Code Quality
- [ ] Run `npm run typecheck` - no errors
- [ ] Run `npm run lint` - no errors
- [ ] Template registered in registry
- [ ] Generator function exists and works

#### 2. Data Handling
- [ ] All required fields are populated
- [ ] Optional fields handled gracefully (don't break if missing)
- [ ] Currency formatting works correctly
- [ ] Date formatting works correctly
- [ ] German locale support (1.008,40 € format)

#### 3. Visual Quality
- [ ] Generate test PDF with real data
- [ ] CSS applies correctly (no raw CSS text visible)
- [ ] Colors render properly
- [ ] Gradients/backgrounds print correctly
- [ ] Fonts render correctly (fallbacks work)
- [ ] Tables align properly
- [ ] QR codes are scannable
- [ ] Logo displays (if provided)

#### 4. Layout & Spacing
- [ ] No excessive white space on edges (5mm margins)
- [ ] Content fills page appropriately
- [ ] No overlapping elements
- [ ] Proper alignment throughout
- [ ] Consistent spacing between sections

#### 5. Print Quality
- [ ] Colors are print-friendly (not too dark)
- [ ] Text is readable when printed
- [ ] High contrast for important elements
- [ ] QR codes scan reliably

## 🚫 Common Issues to Avoid

### CSS Issues
- ❌ **DON'T** include `<style>` tags in CSS constant (generator adds them)
- ❌ **DON'T** embed CSS in HTML (use separate CSS field)
- ❌ **DON'T** use `@import` for fonts (may not work in PDF)
- ❌ **DON'T** use JavaScript or complex CSS features

### Layout Issues
- ❌ **DON'T** use large margins (use 5mm, not 15mm)
- ❌ **DON'T** rely on viewport units (vh/vw) - may not work
- ❌ **DON'T** use position: fixed (may not work in PDF)
- ❌ **DON'T** assume specific page breaks

### Data Issues
- ❌ **DON'T** hardcode values (use Jinja2 variables)
- ❌ **DON'T** forget to format currency (use `_formatted` fields)
- ❌ **DON'T** assume fields exist (handle missing data)
- ❌ **DON'T** mix currency symbols with amounts (use formatted strings)

### Color Issues
- ❌ **DON'T** forget `print_background: true` for colored backgrounds
- ❌ **DON'T** use pure black (#000000) for text (use #2A2A2A)
- ❌ **DON'T** use low-contrast colors (accessibility)

## 📝 Template Improvement Workflow

When updating a template:

1. **Read the current template file**
   - Understand existing structure
   - Note any issues or bugs

2. **Check data requirements**
   - What fields does generator pass?
   - What's optional vs required?

3. **Design improvements**
   - Is typography clear and readable?
   - Are colors accessible and on-brand?
   - Is spacing consistent?
   - Does layout work for all data scenarios?

4. **Update HTML**
   - Clean semantic markup
   - Proper Jinja2 variables
   - Handle missing data gracefully

5. **Update CSS**
   - Use CSS variables for brand colors
   - Consistent spacing scale
   - Professional typography
   - Print-friendly colors

6. **Test thoroughly**
   - Generate with real data
   - Check all visual elements
   - Verify on different paper sizes
   - Test printing if possible

7. **Deploy and verify**
   - Run typecheck and lint
   - Deploy to Convex
   - Generate new PDFs
   - Compare to preview/expectations

## 🎯 Quick Reference

### CSS Variable Pattern
```css
:root {
    --highlight-color: {{highlight_color}};
    --bg-white: #FFFFFF;
    --text-black: #2A2A2A;
    --text-gray: #666666;
    --border-gray: #E5E7EB;
}
```

### Table Styling Pattern
```css
.items-table {
    width: 100%;
    border-collapse: collapse;
}
.items-table thead {
    background-color: var(--highlight-color);
    color: white;
}
.items-table td {
    padding: 12px;
    border-bottom: 1px solid var(--border-gray);
}
```

### Typography Scale
```css
/* Headers */
h1 { font-size: 28pt; font-weight: 700; line-height: 1.2; }
h2 { font-size: 18pt; font-weight: 600; line-height: 1.3; }
h3 { font-size: 14pt; font-weight: 600; line-height: 1.4; }

/* Body */
body { font-size: 11pt; line-height: 1.5; }
small { font-size: 9pt; }
```

### Spacing Scale
```css
/* Use consistent spacing */
.section { margin-bottom: 30px; }
.element { margin-bottom: 15px; }
.small-gap { margin-bottom: 10px; }
```

## 📚 Resources

- **API Template.io Docs**: https://apitemplate.io/docs/
- **Jinja2 Template Syntax**: https://jinja.palletsprojects.com/
- **CSS Print Media**: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/print
- **Project Style Guide**: See existing `invoice_b2b_single.ts` and `vip_premium_ticket_template.ts` as reference

---

**Last Updated:** 2025-11-13
**Maintained By:** Development Team
