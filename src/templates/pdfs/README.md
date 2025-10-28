# PDF Templates

This directory contains the visual design specifications and preview components for PDF templates used in the invoicing system.

## Structure

```
pdfs/
├── README.md (this file)
├── b2c-receipt/
│   ├── preview.tsx          # React component showing PDF preview
│   ├── sample-data.ts       # Sample data for preview
│   └── template-spec.md     # Template design specification
├── b2b-single/
│   ├── preview.tsx
│   ├── sample-data.ts
│   └── template-spec.md
├── b2b-consolidated/
│   ├── preview.tsx
│   ├── sample-data.ts
│   └── template-spec.md
└── b2b-consolidated-detailed/
    ├── preview.tsx
    ├── sample-data.ts
    └── template-spec.md
```

## Template Types

### 1. B2C Receipt (`b2c_receipt`)
- **Purpose**: Simple receipt for individual customer purchases
- **Use Case**: Standard checkout transactions, event ticket purchases
- **Features**: Customer info, itemized list, tax breakdown, payment method
- **Color Scheme**: Purple (#6B46C1) primary

### 2. B2B Single Invoice (`b2b_single`)
- **Purpose**: Professional invoice for single B2B transactions
- **Use Case**: Individual corporate purchases, single event registrations
- **Features**: Company details, VAT numbers, billing address, payment terms
- **Color Scheme**: Blue (#2563EB) primary

### 3. B2B Consolidated Invoice (`b2b_consolidated`)
- **Purpose**: Consolidated invoice for multiple employees/tickets
- **Use Case**: AMEOS use case - multiple doctors → one invoice
- **Features**: Employee list, consolidated totals, payment terms
- **Color Scheme**: Green (#059669) primary

### 4. B2B Consolidated Detailed (`b2b_consolidated_detailed`)
- **Purpose**: Detailed breakdown with per-employee line items
- **Use Case**: Organizations requiring itemized expenses per employee
- **Features**: Employee names with sub-items (base + add-ons), detailed pricing
- **Color Scheme**: Purple (#7C3AED) primary

## Usage in Code

Templates are defined in:
- **Backend**: `convex/pdfTemplates.ts` (template registry and metadata)
- **Generation**: `convex/pdfGenerationTemplated.ts` (PDF rendering engine)
- **Frontend Previews**: This directory (`src/templates/pdfs/`)

## Template Preview Components

Each template directory contains a `preview.tsx` component that:
1. Loads sample data
2. Renders a visual preview of the PDF template
3. Can be displayed in the Invoicing window → Templates tab
4. Uses retro styling consistent with the L4YERCAK3 design system

## Creating a New Template

1. Add template definition to `convex/pdfTemplates.ts`
2. Add renderer function to `convex/pdfGenerationTemplated.ts`
3. Create preview directory here with:
   - `preview.tsx` - React preview component
   - `sample-data.ts` - Sample data matching template schema
   - `template-spec.md` - Design specification and mockup

## Notes

- Templates are **hard-coded** (no UI editing)
- Templates use **jsPDF** for server-side generation
- Frontend previews are **visual approximations** of the actual PDF
- All templates follow the same base structure with different styling
