# Template System Status & Next Steps

## 📊 Current State Overview

### ✅ What's Complete (Template.io Integration)

1. **HTML/CSS Templates Created**
   - [convex/lib/pdf_templates/elegant_gold_ticket_template.ts](../convex/lib/pdf_templates/elegant_gold_ticket_template.ts)
   - [convex/lib/pdf_templates/modern_ticket_template.ts](../convex/lib/pdf_templates/modern_ticket_template.ts)
   - [convex/lib/pdf_templates/vip_premium_ticket_template.ts](../convex/lib/pdf_templates/vip_premium_ticket_template.ts)

2. **Template.io Renderer Service**
   - [convex/lib/generateTicketPdf.ts](../convex/lib/generateTicketPdf.ts) - API Template.io integration
   - Template registry for elegant-gold, modern-ticket, vip-premium

3. **PDF Renderer Integration**
   - [convex/pdfTicketTemplateRenderer.ts](../convex/pdfTicketTemplateRenderer.ts) updated with `generatePdfTicketWithTemplateIo()`
   - Template resolution chain working (Ticket → Product → Event → Domain → Org → System)

4. **Documentation**
   - [docs/TEMPLATE_IO_INTEGRATION.md](./TEMPLATE_IO_INTEGRATION.md) - Complete integration guide

5. **Quality Checks**
   - TypeScript: ✅ Passing
   - ESLint: ✅ Passing (no new warnings)

---

## ⚠️ What's MISSING (Template Availability System)

### Problem: No Availability Control for Templates

Currently, PDF templates are registered in the database but there's NO system to control which organizations can use which templates (similar to how App Availability works).

### What We Have (Old System)

**File**: `convex/pdfTemplateRegistry.ts`
- Old system with 6 templates (invoice, ticket, certificate)
- Uses API Template.io `/v2/create-pdf-from-html`
- Templates stored as TypeScript constants
- **NO availability control**

**File**: `convex/seedPdfTemplates.ts`
- Seeds templates from `PDF_TEMPLATE_REGISTRY` to database
- Creates objects with `type: "template"`, `subtype: "pdf"`
- **But**: ALL orgs can see ALL templates (no filtering)

### What We Need (New System - Like App Availability)

Following the **App Availability System** pattern from [APP_AVAILABILITY_SYSTEM.md](./APP_AVAILABILITY_SYSTEM.md):

#### 1. Template Availability Junction Table

**Schema Addition Needed:**
```typescript
// Add to schema.ts
templateAvailabilities: defineTable({
  templateId: v.id("objects"),      // Reference to template object
  organizationId: v.id("organizations"),
  isAvailable: v.boolean(),
  approvedBy: v.id("users"),        // Super admin who approved
  approvedAt: v.number(),
})
  .index("by_org_template", ["organizationId", "templateId"])
  .index("by_template", ["templateId"])
  .index("by_org", ["organizationId"]),
```

#### 2. Backend Files Needed

**Create**: `convex/templateAvailability.ts`
```typescript
// Query: getTemplateAvailability
// Query: getOrgTemplateAvailabilities
// Mutation: setTemplateAvailability
// Mutation: bulkSetTemplateAvailability
```

**Update**: `convex/templateOntology.ts`
```typescript
// Add query: getAvailablePdfTemplates (filter by availability)
// Add query: getAvailableEmailTemplates (filter by availability)
```

#### 3. Frontend UI Needed

**Create**: `src/components/window-content/admin-manage-window/template-availability-tab.tsx`
- Matrix table showing Organizations (rows) × Templates (columns)
- Toggle checkboxes to enable/disable templates per org
- Similar to app-availability-tab.tsx

**Update**: `src/components/window-content/org-owner-manage-window/domain-config-modal.tsx`
- Template selector should ONLY show available templates
- Filter by `templateAvailabilities` for current org

#### 4. Seeding Process Needed

**Current State**: We have TWO template registries!

1. **Old Registry** (`convex/pdfTemplateRegistry.ts`):
   - `ticket_professional_v1`
   - `ticket_retro_v1`
   - `invoice_b2c_receipt_v1`
   - `invoice_b2b_consolidated_v1`
   - `invoice_b2b_consolidated_detailed_v1`
   - `certificate_cme_v1`

2. **New Templates** (just created, NOT in registry yet):
   - `elegant-gold` (HTML/CSS Template.io)
   - `modern-ticket` (HTML/CSS Template.io)
   - `vip-premium` (HTML/CSS Template.io)

**Action Required:**

```bash
# Step 1: Update pdfTemplateRegistry.ts to include new templates
# Step 2: Run seeding to register new templates in database
npx convex run seedPdfTemplates:seedPdfTemplates

# Step 3: Once templateAvailabilities system is built, enable templates per org
npx convex run seedTemplates:seedTemplateAvailabilities
```

---

## 🎨 Template Library App Concept

### Vision: Centralized Template Management

Instead of managing templates in code, create a **Template Library App** that:

1. **Template Gallery**
   - Visual preview of all templates (email, PDF, web)
   - Categorization (ticket, invoice, certificate, email)
   - Search and filter by category, style, color scheme

2. **Template Editor** (Future)
   - Visual HTML/CSS editor
   - Live preview with sample data
   - Export to TypeScript constants or upload to API Template.io

3. **Availability Management**
   - Super admin: Enable/disable templates per organization
   - Organization admin: Select default templates for products/events/domains

4. **Template Marketplace** (Future Vision)
   - Organizations can create custom templates
   - Share templates with other orgs (public gallery)
   - Premium templates (paid marketplace)

### Implementation Plan

**Phase 1: Template Availability System** (7-10 hours)
- Add `templateAvailabilities` table to schema
- Create backend queries/mutations
- Build template availability matrix UI (like app availability)
- Update template selectors to filter by availability

**Phase 2: Template Gallery UI** (10-15 hours)
- Create template browser window
- Preview system with sample data
- Categorization and search
- Assignment workflow (assign to products/events/domains)

**Phase 3: Template Editor** (20-30 hours)
- Visual HTML/CSS editor with live preview
- Template version management
- Export/import functionality
- Integration with API Template.io

**Phase 4: Template Marketplace** (30-40 hours)
- Public template gallery
- Template submission/approval workflow
- Rating and reviews
- Premium template licensing

---

## 📋 Immediate Next Steps (Template Availability)

### Backend Implementation (4-5 hours)

1. **Add Schema**
   ```bash
   # In convex/schema.ts
   # Add templateAvailabilities table with indexes
   ```

2. **Create Template Availability Module**
   ```bash
   # Create convex/templateAvailability.ts
   # Implement queries: getTemplateAvailability, getOrgTemplateAvailabilities
   # Implement mutations: setTemplateAvailability, bulkSetTemplateAvailability
   ```

3. **Update Template Ontology**
   ```bash
   # Update convex/templateOntology.ts
   # Add getAvailablePdfTemplates() - filters by availability
   # Add getAvailableEmailTemplates() - filters by availability
   ```

4. **Update PDF Template Registry**
   ```bash
   # Update convex/pdfTemplateRegistry.ts
   # Add new templates: elegant-gold, modern-ticket, vip-premium
   # Update PDF_TEMPLATE_REGISTRY object
   ```

5. **Seed Templates**
   ```bash
   # Run seeding
   npx convex run seedPdfTemplates:seedPdfTemplates

   # Verify
   npx convex run seedPdfTemplates:listPdfTemplates
   ```

### Frontend Implementation (3-4 hours)

6. **Create Template Availability Tab**
   ```bash
   # Create src/components/window-content/admin-manage-window/template-availability-tab.tsx
   # Matrix UI: Organizations (rows) × Templates (columns)
   # Toggle checkboxes for enable/disable
   ```

7. **Update Admin Manage Window**
   ```bash
   # Update src/components/window-content/admin-manage-window/index.tsx
   # Add "Template Availability" tab
   ```

8. **Update Template Selectors**
   ```bash
   # Update domain-config-modal.tsx - filter email templates by availability
   # Add PDF template selector - filter PDF templates by availability
   ```

### Testing (1-2 hours)

9. **Test Availability System**
   ```bash
   # Enable elegant-gold for Org A, disable for Org B
   # Login as Org A user → see elegant-gold in selector
   # Login as Org B user → don't see elegant-gold
   # Toggle availability → verify real-time updates
   ```

**Total Estimated Time: 8-11 hours**

---

## 🚀 Seeding Requirements Summary

### What to Seed Now

1. **PDF Templates (Old + New)**
   ```bash
   # This will seed ALL templates from pdfTemplateRegistry.ts
   npx convex run seedPdfTemplates:seedPdfTemplates
   ```

   **Currently seeds**: 6 old templates (invoice, ticket, certificate)

   **After updating registry**: Will seed 9 templates (6 old + 3 new)

2. **Email Templates** (Already working)
   - Email templates are code-based (React components)
   - No seeding required (registry pattern)

### What to Seed After Template Availability System is Built

3. **Template Availabilities** (New)
   ```bash
   # Seed default template availabilities for all orgs
   npx convex run seedTemplates:seedDefaultTemplateAvailabilities
   ```

   This will:
   - Enable basic templates for all orgs (ticket_professional_v1, invoice_b2c_receipt_v1)
   - Enable premium templates (elegant-gold, vip-premium) only for specific orgs
   - Create audit trail for who enabled what

---

## 📝 Continuation Prompt for Next Session

```markdown
# Template Availability System Implementation

## Context
We just completed the Template.io integration for PDF ticket generation. We created 3 new HTML/CSS templates (elegant-gold, modern-ticket, vip-premium) that use API Template.io for professional PDF rendering.

**Current Issue**: Templates are registered in the database but there's NO availability control system (like the App Availability system). All organizations can currently see all templates.

**Goal**: Implement a Template Availability System following the same pattern as App Availability (see [docs/APP_AVAILABILITY_SYSTEM.md](./APP_AVAILABILITY_SYSTEM.md)).

## What's Already Done
1. ✅ Template.io integration complete ([docs/TEMPLATE_IO_INTEGRATION.md](./docs/TEMPLATE_IO_INTEGRATION.md))
2. ✅ 3 new HTML/CSS templates created (elegant-gold, modern-ticket, vip-premium)
3. ✅ Template renderer updated with Template.io support
4. ✅ TypeScript and ESLint passing

## What Needs to be Done

### Phase 1: Template Availability Backend (4-5 hours)

1. **Add `templateAvailabilities` Junction Table**
   - File: `convex/schema.ts`
   - Add table with fields: templateId, organizationId, isAvailable, approvedBy, approvedAt
   - Indexes: by_org_template, by_template, by_org

2. **Create Template Availability Module**
   - File: `convex/templateAvailability.ts` (NEW)
   - Implement queries: getTemplateAvailability, getOrgTemplateAvailabilities
   - Implement mutations: setTemplateAvailability, bulkSetTemplateAvailability
   - Follow pattern from App Availability ([docs/APP_AVAILABILITY_SYSTEM.md](./docs/APP_AVAILABILITY_SYSTEM.md))

3. **Update Template Ontology**
   - File: `convex/templateOntology.ts`
   - Add query: getAvailablePdfTemplates() - filters by templateAvailabilities
   - Add query: getAvailableEmailTemplates() - filters by templateAvailabilities
   - Super admin bypass (sees all templates)

4. **Update PDF Template Registry**
   - File: `convex/pdfTemplateRegistry.ts`
   - Add 3 new templates to PDF_TEMPLATE_REGISTRY:
     - elegant-gold (reference HTML/CSS from convex/lib/pdf_templates/elegant_gold_ticket_template.ts)
     - modern-ticket (reference HTML/CSS from convex/lib/pdf_templates/modern_ticket_template.ts)
     - vip-premium (reference HTML/CSS from convex/lib/pdf_templates/vip_premium_ticket_template.ts)

5. **Seed Templates**
   ```bash
   npx convex run seedPdfTemplates:seedPdfTemplates
   npx convex run seedPdfTemplates:listPdfTemplates
   ```

### Phase 2: Template Availability Frontend (3-4 hours)

6. **Create Template Availability Management UI**
   - File: `src/components/window-content/admin-manage-window/template-availability-tab.tsx` (NEW)
   - Matrix table: Organizations (rows) × Templates (columns)
   - Toggle checkboxes to enable/disable
   - Copy pattern from app-availability-tab.tsx

7. **Update Admin Manage Window**
   - File: `src/components/window-content/admin-manage-window/index.tsx`
   - Add "Template Availability" tab

8. **Update Template Selectors**
   - File: `src/components/window-content/org-owner-manage-window/domain-config-modal.tsx`
   - Email template selector: Filter by availability
   - Add PDF template selector: Filter by availability

### Phase 3: Testing (1-2 hours)

9. **Test Availability System**
   - Enable elegant-gold for Org A, disable for Org B
   - Verify selectors show correct templates per org
   - Test real-time updates when toggling

## Future Enhancement: Template Library App

**Vision**: Create a centralized Template Library App for visual template management, preview, and assignment.

**Features**:
- Template gallery with visual previews
- Categorization and search
- Template editor (HTML/CSS with live preview)
- Template marketplace (future: public templates, premium templates)

See [docs/TEMPLATE_SYSTEM_STATUS.md](./docs/TEMPLATE_SYSTEM_STATUS.md) for full vision and implementation plan.

## Key Files Reference

**Completed (Template.io)**:
- [convex/lib/pdf_templates/elegant_gold_ticket_template.ts](./convex/lib/pdf_templates/elegant_gold_ticket_template.ts)
- [convex/lib/pdf_templates/modern_ticket_template.ts](./convex/lib/pdf_templates/modern_ticket_template.ts)
- [convex/lib/pdf_templates/vip_premium_ticket_template.ts](./convex/lib/pdf_templates/vip_premium_ticket_template.ts)
- [convex/lib/generateTicketPdf.ts](./convex/lib/generateTicketPdf.ts)
- [convex/pdfTicketTemplateRenderer.ts](./convex/pdfTicketTemplateRenderer.ts)

**Need to Create**:
- convex/templateAvailability.ts (NEW)
- src/components/window-content/admin-manage-window/template-availability-tab.tsx (NEW)

**Need to Update**:
- convex/schema.ts (add templateAvailabilities table)
- convex/templateOntology.ts (add availability filters)
- convex/pdfTemplateRegistry.ts (add 3 new templates)
- src/components/window-content/admin-manage-window/index.tsx (add tab)
- src/components/window-content/org-owner-manage-window/domain-config-modal.tsx (filter selectors)

## Pattern Reference

Follow the **App Availability System** pattern from [docs/APP_AVAILABILITY_SYSTEM.md](./docs/APP_AVAILABILITY_SYSTEM.md):
- Junction table for availability control
- Super admin management UI
- Per-organization filtering
- Audit trail (who, when)

## Total Estimated Time
8-11 hours for complete Template Availability System
```

---

## 📊 Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Template.io Integration | ✅ Complete | 3 HTML/CSS templates created |
| Template Renderer | ✅ Complete | generatePdfTicketWithTemplateIo() working |
| Template Resolution Chain | ✅ Complete | Ticket → Product → Event → Domain → Org → System |
| Documentation | ✅ Complete | TEMPLATE_IO_INTEGRATION.md |
| Template Registry Update | ⏳ Pending | Need to add 3 new templates to registry |
| Template Seeding | ⏳ Pending | Seed after registry update |
| Template Availability System | ❌ Not Started | Like App Availability |
| Template Availability UI | ❌ Not Started | Matrix table for super admin |
| Template Selectors | ⚠️ Partial | Email selector exists, needs availability filter |
| Template Library App | 💡 Future | Vision documented |

---

**Document Version:** 1.0
**Created:** 2025-01-12
**Status:** 📋 Ready for Next Phase (Template Availability)
