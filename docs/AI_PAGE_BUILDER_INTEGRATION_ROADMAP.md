# AI Page Builder - Backend Integration Roadmap

## Current State

The AI page builder exists at `/builder` and generates landing pages via chat. It uses the **same AI chat system** as the main app, with full access to 58+ tools in the registry.

### Architecture Overview
```
User Prompt
    → "[PAGE BUILDER MODE]" prefix injected
    → Shared AI Chat (convex/ai/chat.ts)
    → Full Tool Registry (58 tools) ← ALREADY AVAILABLE!
    → AI Response with JSON
    → Client-side schema parsing
    → Save as project (subtype: ai_generated_page)
```

### Key Reuse Insight

The page builder **already shares the same chat action** (`api.ai.chat.sendMessage`) as the normal chat:
- Same tool registry (58 tools)
- Same approval workflow
- Same execution context
- Same model adapters

**What's missing is just:**
1. A `context` parameter to switch system prompts
2. Tool usage instructions in `pageBuilderSystem.ts`

**NO new infrastructure needed.**

---

## Backend Capability Matrix

### Legend
- ✅ **Ready** - Tool exists and is fully implemented
- 🔧 **Needs Wiring** - Tool exists but page builder doesn't know how to use it contextually
- 🚧 **Partial** - Some functionality exists
- ❌ **Missing** - Not yet implemented
- 📋 **Planned** - In roadmap

---

### 1. CRM Integration

| Capability | Tool | Status | Page Builder Aware? |
|------------|------|--------|---------------------|
| Create contacts from form submissions | `manage_crm`, `create_contact` | ✅ Ready | 🔧 Needs Wiring |
| Search existing contacts | `search_contacts` | ✅ Ready | 🔧 Needs Wiring |
| Tag contacts | `tag_contacts` | ✅ Ready | 🔧 Needs Wiring |
| Sync from Microsoft/Google | `sync_contacts` | ✅ Ready | 🔧 Needs Wiring |
| Send bulk emails | `send_bulk_crm_email` | ✅ Ready | 🔧 Needs Wiring |
| Link form → CRM pipeline | Behaviors | ✅ Ready | 🔧 Needs Wiring |

**Gap:** Page builder can generate contact forms but doesn't know to:
- Configure CRM tagging on submission
- Set up lead scoring
- Connect to email sequences

---

### 2. Checkout & Payments

| Capability | Tool | Status | Page Builder Aware? |
|------------|------|--------|---------------------|
| Create checkout page | `create_checkout_page` | ✅ Ready | 🔧 Needs Wiring |
| Publish checkout | `publish_checkout` | ✅ Ready | 🔧 Needs Wiring |
| Create products | `create_product` | ✅ Ready | 🔧 Needs Wiring |
| Set pricing | `set_product_price` | ✅ Ready | 🔧 Needs Wiring |
| Attach forms to products | `set_product_form` | ✅ Ready | 🔧 Needs Wiring |
| Create invoices | `create_invoice` | ✅ Ready | 🔧 Needs Wiring |
| Process payments | `process_payment` | ✅ Ready | 🔧 Needs Wiring |

**Gap:** Page builder can add pricing sections but doesn't know to:
- Create actual products in the database
- Configure checkout workflows
- Link pricing cards to checkout URLs

---

### 3. Booking & Availability

| Capability | Tool/Behavior | Status | Page Builder Aware? |
|------------|---------------|--------|---------------------|
| Slot selection (time/date) | `availability_slot_selection` behavior | ✅ Ready | 🔧 Needs Wiring |
| Capacity validation | `capacity_validation` behavior | ✅ Ready | 🔧 Needs Wiring |
| Booking creation | `booking_creation` behavior | ✅ Ready | 🔧 Needs Wiring |
| Temporary reservations | `slot_reservation` behavior | ✅ Ready | 🔧 Needs Wiring |
| Configure booking workflow | `configure_booking_workflow` | ✅ Ready | 🔧 Needs Wiring |
| Manage bookings | `manage_bookings` | ✅ Ready | 🔧 Needs Wiring |

**Gap:** Page builder can create booking CTAs but doesn't know to:
- Suggest appropriate booking workflow for product type
- Configure capacity limits
- Set up availability calendars

---

### 4. Forms

| Capability | Tool | Status | Page Builder Aware? |
|------------|------|--------|---------------------|
| Create forms | `create_form` | ✅ Ready | 🔧 Needs Wiring |
| List forms | `list_forms` | ✅ Ready | 🔧 Needs Wiring |
| Publish forms | `publish_form` | ✅ Ready | 🔧 Needs Wiring |
| Get responses | `get_form_responses` | ✅ Ready | 🔧 Needs Wiring |
| Manage forms | `manage_forms` | ✅ Ready | 🔧 Needs Wiring |
| Form linking behavior | `form_linking` behavior | ✅ Ready | 🔧 Needs Wiring |

**Gap:** Page builder generates form sections in JSON but doesn't:
- Create actual form objects
- Configure field validation
- Set up response handling

---

### 5. Workflows & Automation

| Capability | Tool | Status | Page Builder Aware? |
|------------|------|--------|---------------------|
| Create workflows | `create_workflow` | ✅ Ready | 🔧 Needs Wiring |
| Enable/disable | `enable_workflow` | ✅ Ready | 🔧 Needs Wiring |
| List workflows | `list_workflows` | ✅ Ready | 🔧 Needs Wiring |
| Add behaviors | `add_behavior_to_workflow` | ✅ Ready | 🔧 Needs Wiring |
| Remove behaviors | `remove_behavior_from_workflow` | ✅ Ready | 🔧 Needs Wiring |

**Gap:** Page builder doesn't suggest or create workflows based on page purpose.

---

### 6. Events & Webinars

| Capability | Tool | Status | Page Builder Aware? |
|------------|------|--------|---------------------|
| Create events | `create_event` | ✅ Ready | 🔧 Needs Wiring |
| List events | `list_events` | ✅ Ready | 🔧 Needs Wiring |
| Update events | `update_event` | ✅ Ready | 🔧 Needs Wiring |
| Register attendees | `register_attendee` | ✅ Ready | 🔧 Needs Wiring |
| Manage webinars | `manage_webinars` | ✅ Ready | 🔧 Needs Wiring |

**Gap:** Page builder could auto-create event when generating event landing page.

---

### 7. Email & Templates

| Capability | Tool | Status | Page Builder Aware? |
|------------|------|--------|---------------------|
| Create templates | `create_template` | ✅ Ready | 🔧 Needs Wiring |
| Send from template | `send_email_from_template` | ✅ Ready | 🔧 Needs Wiring |
| Sequences | `manage_sequences` | ✅ Ready | 🔧 Needs Wiring |

**Gap:** Page builder could suggest confirmation email templates for forms/checkouts.

---

### 8. Media & Assets

| Capability | Tool | Status | Page Builder Aware? |
|------------|------|--------|---------------------|
| Upload media | `upload_media` | ✅ Ready | 🔧 Needs Wiring |
| Search media | `search_media` | ✅ Ready | 🔧 Needs Wiring |

**Gap:** Page builder uses placeholder images instead of media library.

---

### 9. Projects & Publishing

| Capability | Tool | Status | Page Builder Aware? |
|------------|------|--------|---------------------|
| Manage projects | `manage_projects` | ✅ Ready | ✅ Connected |
| Create pages | `create_page` | ✅ Ready | 🔧 Needs Wiring |
| Publish pages | `publish_page` | ✅ Ready | 🔧 Needs Wiring |
| Batch publish | `publish_all` | ✅ Ready | 🔧 Needs Wiring |

**Status:** Page builder saves as projects but doesn't use standard page tools.

---

### 10. Integrations

| Capability | Tool | Status | Page Builder Aware? |
|------------|------|--------|---------------------|
| ActiveCampaign | `activecampaign` | ✅ Ready | 🔧 Needs Wiring |
| OAuth check | `check_oauth_connection` | ✅ Ready | 🔧 Needs Wiring |

---

## What "Aware" Means

For the page builder to be truly "aware" of a capability, it needs:

1. **System Prompt Knowledge** - Instructions in `pageBuilderSystem.ts` explaining when/how to use the tool
2. **Contextual Triggers** - AI recognizes scenarios that warrant tool usage (e.g., "sailing school with booking" → configure_booking_workflow)
3. **Schema Integration** - Page schema supports the integration (e.g., CTA with `actionType: "checkout"` includes `checkoutId`)
4. **Preview Connection** - Builder preview can demonstrate the integration

---

## Priority Integration Roadmap

### Phase 1: Checkout-Aware (High Value)
When user asks for pages with pricing/purchase:
1. AI creates products via `create_product`
2. AI creates checkout via `create_checkout_page`
3. AI links pricing section to checkout URL
4. AI suggests workflow behaviors for checkout

### Phase 2: CRM-Aware (Lead Generation)
When user asks for contact/lead capture pages:
1. AI creates form via `create_form`
2. AI configures CRM tagging on submission
3. AI suggests email sequence follow-up
4. Page schema `actionType: "form"` links to real form

### Phase 3: Booking-Aware (Service Businesses)
When user asks for booking/scheduling pages:
1. AI suggests workflow via `configure_booking_workflow`
2. AI creates product with booking behaviors
3. AI configures capacity and availability
4. CTA connects to checkout with booking flow

### Phase 4: Event-Aware (Event Marketing)
When user asks for event/webinar pages:
1. AI creates event via `create_event`
2. AI creates registration form
3. AI sets up checkout for paid events
4. Page dynamically shows event details

---

## Implementation Strategy

### Step 1: Activate pageBuilderSystem.ts
The file exists but isn't used. Integrate it into the chat system:
```typescript
// In convex/ai/chat.ts
if (context.mode === 'page_builder') {
  systemPrompt = PAGE_BUILDER_SYSTEM_PROMPT;
}
```

### Step 2: Add Tool Usage Instructions
Update `pageBuilderSystem.ts` with tool-aware instructions:
```
WHEN generating a pricing page:
1. Call create_product for each pricing tier
2. Call create_checkout_page with products
3. Include checkoutId in CTA props

WHEN generating a booking page:
1. Call configure_booking_workflow with action="suggest_workflow_for_product"
2. Follow the suggested workflow
3. Include workflowId in booking CTAs
```

### Step 3: Enhance Page Schema
Add integration fields to section schemas:
```typescript
interface CTAProps {
  // Existing
  actionType: 'link' | 'booking' | 'form' | 'scroll' | 'contact';
  // New integration fields
  productId?: string;      // Links to real product
  checkoutId?: string;     // Links to real checkout
  formId?: string;         // Links to real form
  workflowId?: string;     // Links to real workflow
  eventId?: string;        // Links to real event
}
```

### Step 4: Tool Orchestration Mode
Add a "setup mode" after page generation:
1. User: "Create a sailing school landing page"
2. AI: Generates page JSON (sections)
3. AI: "I've designed your page. Now let me set up the backend..."
4. AI: Calls create_product, create_checkout, configure_booking_workflow
5. AI: Updates page JSON with real IDs
6. User sees fully functional preview

---

## Files to Modify

| File | Changes |
|------|---------|
| `convex/ai/chat.ts` | Add page_builder mode detection, use dedicated prompt |
| `convex/ai/prompts/pageBuilderSystem.ts` | Add tool usage instructions |
| `src/lib/page-builder/section-registry.ts` | Add integration fields to schemas |
| `src/lib/page-builder/validators.ts` | Validate integration fields |
| `src/components/builder/sections/cta-button.tsx` | Connect to real resources |
| `src/contexts/builder-context.tsx` | Handle multi-step tool orchestration |

---

## Success Metrics

- [ ] User says "create a landing page for a sailing school with course booking"
- [ ] AI generates page sections (hero, features, pricing, testimonials, CTA)
- [ ] AI automatically creates products for each course
- [ ] AI configures booking workflow with availability + capacity
- [ ] AI creates checkout page with workflow attached
- [ ] Preview shows functional booking buttons
- [ ] Published page has working checkout flow
