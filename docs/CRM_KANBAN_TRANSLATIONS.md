# CRM Kanban Board - Required Translation Keys

## Overview
This document lists all translation keys required for the CRM Kanban Pipeline view.

## Required Translation Keys

All keys use the `ui.crm` namespace.

### Tab Label
- `ui.crm.tabs.pipeline` - The "Pipeline" tab button text
  - **English**: "PIPELINE"
  - **German**: "PIPELINE"
  - **Polish**: "PIPELINE"

### Stage Labels
- `ui.crm.pipeline.stages.lead` - Lead stage column header
  - **English**: "Leads"
  - **German**: "Leads"
  - **Polish**: "Leady"

- `ui.crm.pipeline.stages.prospect` - Prospect stage column header
  - **English**: "Prospects"
  - **German**: "Interessenten"
  - **Polish**: "Prospekty"

- `ui.crm.pipeline.stages.customer` - Customer stage column header
  - **English**: "Customers"
  - **German**: "Kunden"
  - **Polish**: "Klienci"

- `ui.crm.pipeline.stages.partner` - Partner stage column header
  - **English**: "Partners"
  - **German**: "Partner"
  - **Polish**: "Partnerzy"

### UI Messages
- `ui.crm.pipeline.contact_count` - Contact count message (supports interpolation)
  - **English**: "contact" (singular) / "contacts" (plural)
  - **German**: "Kontakt" / "Kontakte"
  - **Polish**: "kontakt" / "kontakty"
  - **Note**: Currently simplified to just show count without plural logic

- `ui.crm.pipeline.no_contacts` - Empty state message
  - **English**: "No contacts in this stage"
  - **German**: "Keine Kontakte in dieser Phase"
  - **Polish**: "Brak kontaktów na tym etapie"

## Implementation Notes

### Namespace Usage
The Kanban board uses the existing `ui.crm` namespace via:
```tsx
const { t } = useNamespaceTranslations("ui.crm")
```

### Stage Colors
Stage colors use RGBA with transparency to remain theme-aware while providing semantic visual indicators:
- **Lead**: Yellow tint (new/unqualified)
- **Prospect**: Blue tint (qualified/interested)
- **Customer**: Green tint (active/paying)
- **Partner**: Purple tint (strategic relationship)

These colors use transparency to blend with the active theme's background colors.

## Adding Translations to Database

To add these translations, update the seed file or create a migration:

```typescript
// Example for English translations
const translations = [
  { key: "ui.crm.tabs.pipeline", value: "PIPELINE", locale: "en" },
  { key: "ui.crm.pipeline.stages.lead", value: "Leads", locale: "en" },
  { key: "ui.crm.pipeline.stages.prospect", value: "Prospects", locale: "en" },
  { key: "ui.crm.pipeline.stages.customer", value: "Customers", locale: "en" },
  { key: "ui.crm.pipeline.stages.partner", value: "Partners", locale: "en" },
  { key: "ui.crm.pipeline.contact_count", value: "contact", locale: "en" },
  { key: "ui.crm.pipeline.no_contacts", value: "No contacts in this stage", locale: "en" },
];

// Insert into objects table with type: "translation"
for (const trans of translations) {
  await ctx.db.insert("objects", {
    organizationId: systemOrgId,
    type: "translation",
    locale: trans.locale,
    name: trans.key,
    value: trans.value,
    status: "active"
  });
}
```

## See Also
- [Translation System Architecture](./TRANSLATION_SYSTEM.md)
- [Theme System Guide](./THEME_SYSTEM.md)
- [CRM Kanban Implementation Plan](./reference_docs/CRM_KANBAN_IMPLEMENTATION_PLAN.md)
