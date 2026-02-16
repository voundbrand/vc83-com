# PDF Template Availability System - Status & Next Steps

## ✅ What's Complete

### 1. Template.io Integration (DONE)
- ✅ 3 HTML/CSS templates created:
  - [convex/lib/pdf_templates/elegant_gold_ticket_template.ts](../convex/lib/pdf_templates/elegant_gold_ticket_template.ts)
  - [convex/lib/pdf_templates/modern_ticket_template.ts](../convex/lib/pdf_templates/modern_ticket_template.ts)
  - [convex/lib/pdf_templates/vip_premium_ticket_template.ts](../convex/lib/pdf_templates/vip_premium_ticket_template.ts)
- ✅ Template.io renderer service: [convex/lib/generateTicketPdf.ts](../convex/lib/generateTicketPdf.ts)
- ✅ PDF renderer integration: [convex/pdfTicketTemplateRenderer.ts](../convex/pdfTicketTemplateRenderer.ts)

### 2. Template Availability Backend (DONE)
- ✅ Created [convex/pdfTemplateAvailability.ts](../convex/pdfTemplateAvailability.ts) following the pattern from:
  - `convex/templateAvailability.ts` (web page templates)
  - `convex/formTemplateAvailability.ts` (form templates)
  - `convex/checkoutTemplateAvailability.ts` (checkout templates)

**Key Functions**:
- `enablePdfTemplate()` - Super admin enables template for org
- `disablePdfTemplate()` - Super admin disables template for org
- `getAvailablePdfTemplates()` - Get templates available to an org
- `getAllPdfTemplateAvailabilities()` - Super admin view all availabilities
- `getAllSystemPdfTemplates()` - Super admin view all system templates

### 3. PDF Template Registry Updated (DONE)
- ✅ Updated [convex/pdfTemplateRegistry.ts](../convex/pdfTemplateRegistry.ts)
- ✅ Added 3 new templates to `PDF_TEMPLATE_REGISTRY`:
  - `ticket_elegant_gold_v1` - Luxurious black & gold design
  - `ticket_modern_v1` - Clean contemporary design
  - `ticket_vip_premium_v1` - Exclusive VIP design

**Now registered**: 9 total PDF templates (6 old + 3 new)

---

## ⏳ What's Pending (Next Steps)

### Step 1: Add PDF Section to Super Admin UI

**File**: `src/components/window-content/super-admin-organizations-window/templates-tab.tsx`

The UI already has 3 sections:
1. Web Page Templates
2. Form Templates
3. Checkout Templates

**Need to add 4th section**: **PDF Templates**

**Pattern to follow** (copy from CheckoutTemplateRow):

```typescript
// Add after Checkout Templates Section (around line 393)

{/* PDF TEMPLATES SECTION */}
<div>
  {/* Header */}
  <div className="mb-4">
    <h3 className="text-sm font-bold flex items-center gap-2">
      <FileText size={16} />
      PDF Templates Availability
    </h3>
    <p className="text-xs text-gray-600 mt-1">
      Control which PDF templates are visible to each organization for tickets, invoices, and certificates.
    </p>
  </div>

  {allPdfTemplates.length === 0 ? (
    <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
      <div className="flex items-start gap-2">
        <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-sm text-yellow-900">No PDF Templates Found</h4>
          <p className="text-xs text-yellow-800 mt-1">
            No PDF templates have been seeded yet. Run: npx convex run seedPdfTemplates:seedPdfTemplates
          </p>
        </div>
      </div>
    </div>
  ) : (
    <>
      {/* Matrix Table */}
      <div className="border-2 border-gray-400 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-200 border-b-2 border-gray-400">
              <th className="px-3 py-2 text-left font-bold sticky left-0 bg-gray-200 z-10">
                Organization
              </th>
              {allPdfTemplates.map((template) => (
                <th key={template._id} className="px-3 py-2 text-center font-bold min-w-[120px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>
                      {template.customProperties?.category === "ticket" && "🎫"}
                      {template.customProperties?.category === "invoice" && "💰"}
                      {template.customProperties?.category === "receipt" && "🧾"}
                      {template.customProperties?.category === "certificate" && "📜"}
                      {!template.customProperties?.category && "📄"}
                    </span>
                    <span className="text-center">{template.name}</span>
                    <code className="text-xs text-gray-500 bg-gray-100 px-1">
                      {template.customProperties?.code}
                    </code>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <PdfTemplateRow
                key={org._id}
                organization={org}
                templates={allPdfTemplates}
                availabilities={allPdfAvailabilities.filter((a) => a.organizationId === org._id)}
                sessionId={sessionId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500 border-2 border-gray-400 flex items-center justify-center">
            <Check size={10} className="text-white" />
          </div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500 border-2 border-gray-400 flex items-center justify-center">
            <X size={10} className="text-white" />
          </div>
          <span>Not Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-300 border-2 border-gray-400 flex items-center justify-center">
            <Loader2 size={10} className="animate-spin" />
          </div>
          <span>Updating...</span>
        </div>
      </div>
    </>
  )}
</div>
```

**Also need to add**:

1. **At top of file** (around line 44):
```typescript
// Fetch all system PDF templates
const allPdfTemplates = useQuery(
  api.pdfTemplateAvailability.getAllSystemPdfTemplates,
  sessionId ? { sessionId } : "skip"
);

// Fetch all PDF template availabilities (for all orgs)
const allPdfAvailabilities = useQuery(
  api.pdfTemplateAvailability.getAllPdfTemplateAvailabilities,
  sessionId ? { sessionId } : "skip"
);
```

2. **PdfTemplateRow component** (copy from CheckoutTemplateRow, change mutations):
```typescript
function PdfTemplateRow({
  organization,
  templates,
  availabilities,
  sessionId,
}: {
  organization: { _id: Id<"organizations">; name: string; slug?: string };
  templates: any[];
  availabilities: any[];
  sessionId: string;
}) {
  const [loadingTemplateCode, setLoadingTemplateCode] = useState<string | null>(null);
  const enableTemplate = useMutation(api.pdfTemplateAvailability.enablePdfTemplate);
  const disableTemplate = useMutation(api.pdfTemplateAvailability.disablePdfTemplate);

  const handleToggle = async (templateCode: string, currentState: boolean) => {
    try {
      setLoadingTemplateCode(templateCode);

      if (currentState) {
        await disableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode,
        });
      } else {
        await enableTemplate({
          sessionId,
          organizationId: organization._id,
          templateCode,
        });
      }
    } catch (error) {
      console.error("Failed to toggle PDF template availability:", error);
      alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingTemplateCode(null);
    }
  };

  return (
    <tr className="border-b border-gray-300 hover:bg-gray-50">
      <td className="px-3 py-2 font-semibold sticky left-0 bg-white z-10">
        <div>
          <div>{organization.name}</div>
          <div className="text-gray-500 text-xs font-normal">
            {organization.slug}
          </div>
        </div>
      </td>
      {templates.map((template) => {
        const templateCode = template.customProperties?.code as string;
        const availability = availabilities.find(
          (a) => a.customProperties?.templateCode === templateCode
        );
        const isAvailable = availability?.customProperties?.available ?? false;
        const isLoading = loadingTemplateCode === templateCode;

        return (
          <td key={template._id} className="px-3 py-2 text-center">
            <button
              onClick={() => handleToggle(templateCode, isAvailable)}
              disabled={isLoading}
              className="w-8 h-8 border-2 border-gray-400 flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50 mx-auto"
              style={{
                backgroundColor: isLoading
                  ? "#d1d5db"
                  : isAvailable
                  ? "#22c55e"
                  : "#ef4444",
              }}
              title={
                isLoading
                  ? "Updating..."
                  : isAvailable
                  ? `Click to disable ${template.name} for ${organization.name}`
                  : `Click to enable ${template.name} for ${organization.name}`
              }
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin text-gray-600" />
              ) : isAvailable ? (
                <Check size={16} className="text-white" />
              ) : (
                <X size={16} className="text-white" />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}
```

### Step 2: Seed PDF Templates

**Command**:
```bash
npx convex run seedPdfTemplates:seedPdfTemplates
```

**What it does**:
- Reads all templates from `PDF_TEMPLATE_REGISTRY`
- Creates database objects with:
  - `type: "template"`
  - `subtype: "pdf"`
  - `organizationId`: system org ID
  - `customProperties`: template metadata (code, description, category, etc.)

**Expected output**:
```
✅ Created PDF template: Professional Event Ticket (ticket_professional_v1)
✅ Created PDF template: Retro Event Ticket (ticket_retro_v1)
✅ Created PDF template: Elegant Gold Ticket (ticket_elegant_gold_v1)
✅ Created PDF template: Modern Ticket (ticket_modern_v1)
✅ Created PDF template: VIP Premium Ticket (ticket_vip_premium_v1)
✅ Created PDF template: B2C Receipt (invoice_b2c_receipt_v1)
✅ Created PDF template: B2B Consolidated Invoice (invoice_b2b_consolidated_v1)
✅ Created PDF template: B2B Consolidated Invoice (Detailed) (invoice_b2b_consolidated_detailed_v1)
✅ Created PDF template: CME Completion Certificate (certificate_cme_v1)

✨ PDF template seeding complete!
📊 Summary: 9 created, 0 updated, 0 skipped
```

**Verify templates were seeded**:
```bash
npx convex run seedPdfTemplates:listPdfTemplates
```

### Step 3: Test Super Admin UI

1. **Open Super Admin Organizations Window**
   - Click "Manage Organizations" (super admin only)
   - Navigate to "Templates" tab

2. **Verify PDF Templates Section Appears**
   - Should see 4 sections: Web Page, Form, Checkout, **PDF**
   - PDF section shows matrix: Organizations (rows) × PDF Templates (columns)
   - 9 PDF templates should be visible as columns

3. **Test Enable/Disable Toggles**
   - Click checkbox for "Elegant Gold Ticket" for an organization
   - Should turn green ✅ (enabled)
   - Click again → should turn red ❌ (disabled)
   - Changes save automatically

4. **Verify Availability from Org's Perspective**
   - Login as user from that organization
   - When selecting PDF template (domain config, product edit, etc.)
   - Should ONLY see enabled templates

---

## 📊 Architecture Summary

### Template Availability Pattern

**Database Objects**:

1. **Templates** (`type: "template"`, `subtype: "pdf"`):
   - Stored in `objects` table
   - `organizationId`: system org
   - `customProperties.code`: unique template code
   - All orgs can see metadata, but availability controls usage

2. **Template Availabilities** (`type: "template_availability"`, `subtype: "pdf"`):
   - Junction table pattern
   - `organizationId`: target organization
   - `customProperties.templateCode`: which template
   - `customProperties.available`: true/false
   - `customProperties.enabledBy`: super admin user ID
   - `customProperties.enabledAt`: timestamp

**Resolution Chain** (from [convex/pdfTicketTemplateRenderer.ts](../convex/pdfTicketTemplateRenderer.ts)):

```
1. Ticket level → pdfTemplateId or pdfTemplateCode
2. Product level → pdfTemplateId or pdfTemplateCode
3. Event level → pdfTemplateId or pdfTemplateCode
4. Domain level → (TODO: add to domain config)
5. Organization level → (TODO: add org default)
6. System fallback → "ticket_elegant_gold_v1"
```

**Availability Filtering**:
- When org user selects template → query `getAvailablePdfTemplates()`
- Returns ONLY templates with `template_availability` where `available: true`
- Super admin bypasses (sees all templates)

---

## 🎨 Template Library App (Future Vision)

### Why a Template Library App?

**Current State**:
- Templates managed in code (TypeScript constants)
- Registry updated manually
- Seeding required for database
- No visual preview in codebase

**Future State with Template Library App**:
- Visual template gallery with live previews
- Categorization & search (ticket, invoice, certificate, email, web)
- Template editor (HTML/CSS with live preview)
- Template marketplace (share templates across orgs, premium templates)

### Implementation Phases

**Phase 1: Template Gallery UI** (10-15 hours)
- Browse all templates with visual previews
- Search and filter by category, color scheme, style
- Assignment workflow (assign to product/event/domain)
- Preview with sample data

**Phase 2: Template Editor** (20-30 hours)
- Visual HTML/CSS editor
- Live preview panel
- Template version management
- Export to TypeScript constants or upload to API Template.io
- Template variables editor (define required fields)

**Phase 3: Template Marketplace** (30-40 hours)
- Public template gallery
- Organizations can create custom templates
- Share templates with other orgs
- Premium templates (paid marketplace)
- Rating and reviews system
- Template submission/approval workflow

**Benefits**:
- **Easier Management**: No code editing required
- **Visual Feedback**: See templates before enabling
- **Rapid Development**: Create new templates visually
- **Collaboration**: Share templates across organizations
- **Revenue**: Premium template marketplace

---

## 🚀 Quick Start Commands

### Seed Templates
```bash
# Seed all 9 PDF templates to database
npx convex run seedPdfTemplates:seedPdfTemplates

# Verify templates exist
npx convex run seedPdfTemplates:listPdfTemplates
```

### Test Template.io Integration
```bash
# Test generating a PDF with Template.io (after seeding)
npx convex run pdfTicketTemplateRenderer:generatePdfTicketWithTemplateIo \
  --ticketId "your_ticket_id" \
  --checkoutSessionId "your_checkout_session_id"
```

### Environment Variables
```bash
# Configure API Template.io API key
npx convex env set API_TEMPLATE_IO_KEY "your_api_key_here"
```

---

## 📝 Files Modified

### Created
- ✅ [convex/pdfTemplateAvailability.ts](../convex/pdfTemplateAvailability.ts) - PDF template availability backend
- ✅ [convex/lib/pdf_templates/elegant_gold_ticket_template.ts](../convex/lib/pdf_templates/elegant_gold_ticket_template.ts)
- ✅ [convex/lib/pdf_templates/modern_ticket_template.ts](../convex/lib/pdf_templates/modern_ticket_template.ts)
- ✅ [convex/lib/pdf_templates/vip_premium_ticket_template.ts](../convex/lib/pdf_templates/vip_premium_ticket_template.ts)
- ✅ [convex/lib/generateTicketPdf.ts](../convex/lib/generateTicketPdf.ts) - Template.io renderer
- ✅ [docs/TEMPLATE_IO_INTEGRATION.md](./TEMPLATE_IO_INTEGRATION.md) - Template.io integration docs
- ✅ [docs/PDF_TEMPLATE_AVAILABILITY_STATUS.md](./PDF_TEMPLATE_AVAILABILITY_STATUS.md) - This file

### Modified
- ✅ [convex/pdfTemplateRegistry.ts](../convex/pdfTemplateRegistry.ts) - Added 3 new templates
- ✅ [convex/pdfTicketTemplateRenderer.ts](../convex/pdfTicketTemplateRenderer.ts) - Added Template.io integration
- ⏳ [src/components/window-content/super-admin-organizations-window/templates-tab.tsx](../src/components/window-content/super-admin-organizations-window/templates-tab.tsx) - Need to add PDF section

---

## ✅ Quality Checks

- TypeScript: Should pass ✅
- ESLint: Should pass ✅
- Pattern consistency: Follows form/checkout template availability pattern ✅

---

## 📚 Related Documentation

- [APP_AVAILABILITY_SYSTEM.md](./APP_AVAILABILITY_SYSTEM.md) - Pattern reference
- [TEMPLATE_IO_INTEGRATION.md](./TEMPLATE_IO_INTEGRATION.md) - Template.io integration details
- [TEMPLATE_SYSTEM_STATUS.md](./TEMPLATE_SYSTEM_STATUS.md) - Overall template system status
- [PDF_TEMPLATE_IMPLEMENTATION_COMPLETE.md](./PDF_TEMPLATE_IMPLEMENTATION_COMPLETE.md) - Original PDF system docs

---

**Document Version:** 1.0
**Created:** 2025-01-12
**Status:** 📋 Ready for UI Integration & Seeding
