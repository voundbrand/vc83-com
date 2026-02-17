# Schema-Based Email Templates Architecture

## 🎯 Vision

**All email templates should be schema-based (JSON) instead of React components.**

This enables:
- ✅ **AI Editing** - AI agents can modify templates by editing JSON
- ✅ **User Editing** - Non-technical users edit through code editor UI
- ✅ **Database Storage** - Schemas stored in Convex, versioned over time
- ✅ **Dynamic Rendering** - Templates rendered from schemas at send-time
- ✅ **Consistency** - Same pattern for Email and PDF templates

---

## 📐 Architecture Overview

### Current State (Before)
```
Email Templates (React Components in /src/templates/emails/)
└──> Hardcoded in code
└──> Can't be edited without deploying
└──> AI agents can't modify them
└──> Different pattern than PDF templates
```

### Target State (After)
```
Email Template Schemas (JSON in Database)
├──> Stored in objects.customProperties.templateSchema
├──> Editable through Template Schema Editor UI
├──> AI agents can modify via JSON editing
├──> Rendered dynamically using EmailSchemaRenderer
└──> Same pattern as PDF templates ✅
```

---

## 🏗️ System Components

### 1. Schema Definition

**File**: `/src/templates/emails/email-template-schema.ts`

```typescript
interface EmailTemplateSchema {
  code: string;                    // "email_invoice_b2b"
  name: string;                    // "B2B Invoice"
  category: string;                // "transactional"
  defaultSections: EmailSection[]; // Hero, Body, CTA, InvoiceDetails
  variables: EmailTemplateVariable[]; // {invoiceNumber, total, etc}
  defaultBrandColor: string;
  supportedLanguages: string[];
}
```

**Key Features**:
- `defaultSections` - Array of sections (hero, body, cta, invoiceDetails, etc.)
- `variables` - Type-safe variables with AI instructions
- Compatible with existing `EmailSection` types from `generic-types.ts`

### 2. Schema Examples

**File**: `/src/templates/emails/schema-examples/invoice-b2b-schema.ts`

Shows how a B2B invoice looks as JSON:
```typescript
{
  code: "email_invoice_b2b",
  defaultSections: [
    { type: "hero", title: "Invoice {invoiceNumber}" },
    { type: "body", paragraphs: ["..."] },
    { type: "invoiceDetails", invoiceNumber: "{invoiceNumber}", ... },
    { type: "cta", text: "Pay Now", url: "{payNowUrl}" }
  ],
  variables: [
    { name: "invoiceNumber", type: "string", aiInstructions: "..." }
  ]
}
```

### 3. Schema Editor UI

**File**: `/src/components/template-schema-editor.tsx`

**Pattern**: Same as Forms Schema Editor

Features:
- JSON textarea with monospace font
- Format, Validate, Copy, Reset, Save buttons
- Real-time validation
- Dirty state tracking
- Error/success messages

**Usage**:
```tsx
<TemplateSchemaEditor templateId={templateId} />
```

### 4. Schema Renderer

**File**: `/convex/emailSchemaRenderer.ts` (To be created)

Converts schemas to HTML:
```typescript
function renderEmailFromSchema(
  schema: EmailTemplateSchema,
  data: Record<string, unknown>
): string {
  // 1. Parse schema sections
  // 2. Replace {variables} with data
  // 3. Use existing section-renderer.tsx logic
  // 4. Return HTML string
}
```

---

## 🔄 Migration Plan

### Phase 1: Foundation (✅ DONE)
- [x] Create `EmailTemplateSchema` interface
- [x] Create example invoice schema
- [x] Update `TemplateSchemaEditor` to support email templates
- [x] Update `TemplateBuilder` to show email templates

### Phase 2: Schema Generation (NEXT)
```bash
# Create schema generator script
npx convex run generateEmailSchemas:generateAll
```

This will:
1. Read all 14 existing email templates from registry
2. Convert React components → JSON schemas
3. Upsert schemas into database (`objects.customProperties.templateSchema`)
4. Templates become editable through UI

### Phase 3: Renderer
- [ ] Create `EmailSchemaRenderer` component
- [ ] Convert `section-renderer.tsx` to work with schemas
- [ ] Update `emailTemplateRenderer.ts` to use schemas
- [ ] Test email sending with schema-based templates

### Phase 4: AI Integration
- [ ] Create AI agent that edits schemas
- [ ] Add "AI Suggest" button in schema editor
- [ ] AI reads `aiInstructions` from variables
- [ ] AI generates personalized content

---

## 📊 Schema Structure Comparison

### PDF Template Schema (Existing ✅)
```json
{
  "version": "2.0",
  "type": "pdf",
  "code": "ticket_professional_v1",
  "layout": {
    "sections": [
      { "id": "header", "type": "header", "order": 0 },
      { "id": "qr", "type": "qrCode", "order": 1 }
    ]
  },
  "variables": [
    { "name": "eventName", "type": "string", "required": true }
  ],
  "styling": { "primaryColor": "#6B46C1" }
}
```

### Email Template Schema (New ✨)
```json
{
  "code": "email_invoice_b2b",
  "name": "B2B Invoice",
  "category": "transactional",
  "version": "1.0.0",
  "defaultSections": [
    { "type": "hero", "title": "Invoice {invoiceNumber}" },
    { "type": "invoiceDetails", "invoiceNumber": "{invoiceNumber}" }
  ],
  "variables": [
    { "name": "invoiceNumber", "type": "string", "required": true }
  ],
  "defaultBrandColor": "#6B46C1",
  "supportedLanguages": ["en", "de", "es", "fr"]
}
```

**Key Differences**:
- PDF uses `layout.sections` → Email uses `defaultSections`
- Email schemas map directly to `EmailSection` types
- Email supports multilingual content

---

## 🎨 UI Flow

### Editing Email Templates

1. **Browse**: Templates Window → Email Library tab
2. **Select**: Click on "B2B Invoice" template
3. **Edit Schema**:
   - Tab 1: **Schema** - JSON editor (like Forms)
   - Tab 2: **Preview** - Live preview with mock data
   - Tab 3: **Settings** - Template metadata
4. **Save**: Schema saved to database
5. **Use**: Template used at send-time with real data

### Schema Editor UI (Replicates Forms)
```
┌─────────────────────────────────────────┐
│ Template Schema Editor                  │
│ B2B Invoice                 │ [X] Close │
├─────────────────────────────────────────┤
│ [Copy] [Format] [Validate] [Reset] [Save]│
├─────────────────────────────────────────┤
│ {                                       │
│   "code": "email_invoice_b2b",         │
│   "defaultSections": [                 │
│     {                                   │
│       "type": "hero",                  │
│       "title": "Invoice {invoiceNumber}"│
│     },                                  │
│     ...                                 │
│   ]                                     │
│ }                                       │
└─────────────────────────────────────────┘
```

---

## 🤖 AI Integration Examples

### AI Agent Editing a Template
```typescript
// AI receives schema as JSON
const schema = await getEmailTemplateSchema("email_invoice_b2b");

// AI modifies sections based on instructions
schema.defaultSections.push({
  type: "body",
  paragraphs: [
    "Your AI-generated personalized message here..."
  ]
});

// AI saves modified schema
await updateEmailTemplateSchema("email_invoice_b2b", schema);
```

### AI Variable Instructions
```typescript
variables: [
  {
    name: "invoiceNumber",
    type: "string",
    aiInstructions: "Generate unique invoice number in format INV-YYYY-NNN"
  },
  {
    name: "paymentTerms",
    type: "string",
    aiInstructions: "Suggest payment terms based on customer history (Net 15/30/60)"
  }
]
```

---

## 📋 Checklist for Completion

### Code Changes
- [x] Create `EmailTemplateSchema` interface
- [x] Create example schemas (invoice-b2b)
- [x] Update `TemplateSchemaEditor` to load email templates
- [ ] Create schema generation script
- [ ] Create `EmailSchemaRenderer` component
- [ ] Update `seedEmailTemplates` to include schemas

### Database Changes
- [ ] Run schema generation script to populate `templateSchema` field
- [ ] All 14 email templates have schemas in database

### UI Updates
- [x] Email templates show in Template Builder
- [x] Schema tab works for email templates
- [ ] Preview tab renders from schema
- [ ] Settings tab shows metadata

### Testing
- [ ] Edit email schema through UI
- [ ] Preview updates in real-time
- [ ] Send email using schema-based template
- [ ] AI agent successfully modifies schema

---

## 🚀 Benefits Summary

### Before (React Components)
❌ Hardcoded in source code
❌ Requires deployment to change
❌ AI can't edit
❌ Different pattern than PDF templates
❌ No version history

### After (JSON Schemas)
✅ Stored in database
✅ Edit through UI instantly
✅ AI agents can modify
✅ Same pattern as PDF templates
✅ Version history in database
✅ User-editable without code
✅ A/B testing different versions
✅ Per-organization customization

---

## 📚 Related Files

- `/src/templates/emails/email-template-schema.ts` - Schema types
- `/src/templates/emails/schema-examples/` - Example schemas
- `/src/templates/emails/generic-types.ts` - Section types (already exists)
- `/src/templates/emails/section-renderer.tsx` - HTML renderer (already exists)
- `/src/components/template-schema-editor.tsx` - Schema editor UI
- `/convex/seedEmailTemplates.ts` - Database seeding
- `/convex/emailTemplateRenderer.ts` - Backend rendering

---

## 🎯 Next Steps

1. **Run**: Register Templates app
   ```bash
   npx convex run seedApps:registerTemplatesApp
   ```

2. **Create**: Schema generation script
   - Convert all 14 email templates to schemas
   - Upsert into database

3. **Build**: Email schema renderer
   - Render schemas to HTML
   - Use existing section renderers

4. **Test**: Edit → Preview → Send workflow

5. **AI**: Integrate with AI agent system
