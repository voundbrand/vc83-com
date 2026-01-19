# Pickup Prompt: AI Page Builder Full Backend Integration

## Status: IMPLEMENTATION COMPLETE

The page builder now uses the same tool infrastructure as normal chat with a specialized system prompt.

## Context Summary

We're building a v0.dev-style AI page builder that generates landing pages via chat. The architecture works and now the AI CAN use backend tools to create real, functional pages.

---

## KEY INSIGHT: Maximum Reuse Available

The page builder **ALREADY uses the same `api.ai.chat.sendMessage` action** as the normal chat:

```typescript
// src/contexts/builder-context.tsx line 118
const sendChatMessage = useAction(api.ai.chat.sendMessage);

// line 156 - calls same action, just prepends context
const result = await sendChatMessage({
  organizationId,
  userId: user.id,
  message: fullMessage,  // "[PAGE BUILDER MODE]..." prefix
  conversationId,
});
```

This means:
- **Same tool registry (58 tools)** is already available
- **Same approval workflow** already works
- **Same execution context** already applies
- **Only need to:**
  1. Add `context` parameter to `sendMessage`
  2. Switch system prompt based on context
  3. Update `pageBuilderSystem.ts` with tool usage instructions

**NO new tool infrastructure needed. Just prompt engineering + 1 parameter.**

---

## What's Already Built

### 1. Page Builder UI (`/builder` route)
- 30% chat / 70% preview split layout
- JSON sections approach: AI outputs structured JSON → section registry renders
- 9 section types: hero, features, cta, testimonials, pricing, gallery, team, faq, process
- Saves as projects with `subtype: "ai_generated_page"`

**Files:**
- `src/app/builder/page.tsx` - Route
- `src/components/builder/` - UI components
- `src/contexts/builder-context.tsx` - State management
- `src/lib/page-builder/section-registry.ts` - Section types
- `src/lib/page-builder/validators.ts` - Zod schemas

### 2. AI Tool Registry (58 tools)
Full backend capabilities available but not used contextually:

| Category | Tools | Status |
|----------|-------|--------|
| CRM | manage_crm, create_contact, search_contacts, tag_contacts, sync_contacts, send_bulk_crm_email | Ready |
| Checkout | create_checkout_page, publish_checkout | Ready |
| Products | create_product, list_products, set_product_price, set_product_form, activate_product | Ready |
| Forms | create_form, list_forms, publish_form, get_form_responses, manage_forms | Ready |
| Workflows | create_workflow, enable_workflow, list_workflows, add_behavior_to_workflow | Ready |
| Booking | configure_booking_workflow, manage_bookings | Ready |
| Events | create_event, list_events, update_event, register_attendee | Ready |
| Webinars | manage_webinars | Ready |
| Payments | create_invoice, send_invoice, process_payment | Ready |
| Email | create_template, send_email_from_template, manage_sequences | Ready |
| Media | upload_media, search_media | Ready |
| Publishing | create_page, publish_page, publish_all, manage_projects | Ready |

**File:** `convex/ai/tools/registry.ts`

### 3. Booking Behavior System (just completed)
Four behaviors for checkout workflows:
- `availability_slot_selection` - Date/time picker (time_slot, date_range, recurring, flexible)
- `capacity_validation` - Check limits (inventory, seats, rooms, concurrent, daily_limit)
- `booking_creation` - Create booking after payment
- `slot_reservation` - Temporary hold during checkout

**Files:**
- `src/lib/behaviors/handlers/availability-slot-selection.ts`
- `src/lib/behaviors/handlers/capacity-validation.ts`
- `src/lib/behaviors/handlers/booking-creation.ts`
- `src/lib/behaviors/handlers/slot-reservation.ts`
- `src/lib/behaviors/index.ts` - Registry

### 4. AI Booking Workflow Tool
- `configure_booking_workflow` - registered in tool registry
- Actions: suggest_workflow_for_product, create_booking_workflow, add_behavior_to_workflow, list_booking_workflows, get_workflow_behaviors, validate_workflow
- Auto-suggests workflow based on product type (courses→class_enrollment, hotels→reservation, etc.)

**File:** `convex/ai/tools/bookingWorkflowTool.ts`

### 5. Unused System Prompt
`convex/ai/prompts/pageBuilderSystem.ts` exists with section examples but is **NOT ACTIVE**. The page builder uses the generic chat system prompt.

---

## The Problem

The page builder generates beautiful page JSON but creates **non-functional pages**:

1. **Pricing sections** show prices but don't link to real products/checkouts
2. **Booking CTAs** don't connect to real workflows
3. **Contact forms** don't create CRM entries
4. **Event pages** don't create real events

The AI has access to 58 tools but doesn't know WHEN or HOW to use them in page building context.

---

## The Goal

Make the page builder "backend-aware" so when a user says:
> "Create a landing page for a sailing school with course booking"

The AI should:
1. Generate page sections (hero, features, pricing, testimonials, CTA)
2. **Create products** for each course via `create_product`
3. **Configure booking workflow** via `configure_booking_workflow`
4. **Create checkout page** via `create_checkout_page`
5. **Link everything together** - pricing cards → checkout URL, CTAs → booking flow
6. Result: A fully functional page with working checkout

---

## Implementation Plan (Simplified - Leverages Existing Infrastructure)

### Step 1: Add Context Parameter to sendMessage

**File:** `convex/ai/chat.ts` (line ~76)

```typescript
export const sendMessage = action({
  args: {
    conversationId: v.optional(v.id("aiConversations")),
    message: v.string(),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    selectedModel: v.optional(v.string()),
    isAutoRecovery: v.optional(v.boolean()),
    context: v.optional(v.union(v.literal("normal"), v.literal("page_builder"))), // NEW
  },
```

### Step 2: Switch System Prompt Based on Context

**File:** `convex/ai/chat.ts` (around line ~150 where system prompt is built)

```typescript
import { PAGE_BUILDER_SYSTEM_PROMPT } from "./prompts/pageBuilderSystem";

// In handler, after getting settings:
const systemPrompt = args.context === "page_builder"
  ? PAGE_BUILDER_SYSTEM_PROMPT
  : /* existing system prompt */;
```

### Step 3: Pass Context from Builder

**File:** `src/contexts/builder-context.tsx` (line ~156)

```typescript
const result = await sendChatMessage({
  organizationId,
  userId: user.id as Id<"users">,
  message: fullMessage,
  conversationId: conversationId || undefined,
  context: "page_builder",  // NEW - tells chat.ts to use page builder prompt
});
```

### Step 4: Enhance Page Builder System Prompt

**File:** `convex/ai/prompts/pageBuilderSystem.ts`

Add contextual tool usage patterns:
```
TOOL USAGE PATTERNS:

When generating a page with PRICING:
1. For each pricing tier, call create_product with name, price, description
2. Call create_checkout_page with all product IDs
3. Call publish_checkout to get public URL
4. In the pricing section JSON, set each card's checkoutUrl

When generating a page with BOOKING (courses, appointments, rentals):
1. Create products via create_product
2. Call configure_booking_workflow with action="suggest_workflow_for_product"
3. Use the suggested behaviors to create the workflow
4. Link checkout to workflow
5. CTAs use actionType="booking" with checkoutId

When generating a page with CONTACT FORM:
1. Call create_form with appropriate fields
2. Call publish_form to activate
3. In CTA, use actionType="form" with formId
4. Consider setting up CRM tagging via workflow

When generating an EVENT page:
1. Call create_event with event details
2. Create ticket products if paid
3. Set up registration form
4. Link CTAs to event registration
```

### Phase 3: Enhance Page Schema with Integration Fields

**File:** `src/lib/page-builder/section-registry.ts`

Add real resource IDs to props:
```typescript
interface CTAButtonProps {
  text: string;
  actionType: 'link' | 'booking' | 'form' | 'scroll' | 'contact' | 'checkout';
  // Integration fields
  href?: string;
  formId?: string;
  checkoutId?: string;
  checkoutUrl?: string;
  productId?: string;
  workflowId?: string;
  eventId?: string;
}

interface PricingCardProps {
  title: string;
  price: string;
  // Integration fields
  productId?: string;
  checkoutUrl?: string;
}
```

### Phase 4: Connect Preview to Real Resources

**File:** `src/components/builder/sections/cta-button.tsx`

Handle integrated CTAs:
```typescript
if (actionType === 'checkout' && checkoutUrl) {
  // Open checkout in modal or navigate
}
if (actionType === 'form' && formId) {
  // Open form modal with real form
}
if (actionType === 'booking' && checkoutId) {
  // Open booking checkout with workflow
}
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `convex/ai/chat.ts` | Main AI chat handler - needs mode detection |
| `convex/ai/prompts/pageBuilderSystem.ts` | System prompt - needs tool instructions |
| `convex/ai/tools/registry.ts` | 58 tools available |
| `convex/ai/tools/bookingWorkflowTool.ts` | Booking workflow configuration |
| `src/lib/page-builder/section-registry.ts` | Section type definitions |
| `src/lib/page-builder/validators.ts` | Zod validation schemas |
| `src/contexts/builder-context.tsx` | Builder state, handles chat |
| `src/components/builder/sections/cta-button.tsx` | CTA button component |
| `src/lib/behaviors/index.ts` | Behavior registry |

---

## Success Criteria

- [ ] Page builder uses dedicated system prompt
- [ ] AI creates real products when generating pricing pages
- [ ] AI creates real checkouts and links to pricing cards
- [ ] AI configures booking workflows for booking pages
- [ ] AI creates real forms for contact sections
- [ ] Preview shows functional CTAs connected to real resources
- [ ] Published pages have working checkout/booking/form flows

---

## What Was Implemented

1. **Added `context` parameter** to `sendMessage` action in `convex/ai/chat.ts`
2. **Added prompt switching** - if context is "page_builder", uses `PAGE_BUILDER_SYSTEM_PROMPT`
3. **Updated builder-context.tsx** to pass `context: "page_builder"`
4. **Enhanced pageBuilderSystem.ts** with comprehensive tool usage patterns including:
   - Product creation patterns
   - Checkout page creation
   - Booking workflow configuration
   - Form creation patterns
   - Event creation patterns
   - CTA integration fields

## Remaining Steps (Testing)

1. **Test** by asking for a "sailing school with course booking" page
2. **Verify** AI proposes tool calls for creating products
3. **Approve** tool executions and verify page JSON includes real IDs

---

## Example Ideal Flow

**User:** "Create a landing page for a sailing school. Include pricing for beginner and advanced courses, and let customers book directly."

**AI Actions:**
1. Generates page JSON with hero, features, pricing, testimonials, CTA sections
2. Calls `create_product` for "Beginner Course" ($299)
3. Calls `create_product` for "Advanced Course" ($499)
4. Calls `configure_booking_workflow` → suggests class_enrollment workflow
5. Calls `create_checkout_page` with products and workflow
6. Calls `publish_checkout` → gets public URL
7. Updates pricing section JSON with `checkoutUrl` for each card
8. Updates CTA with `actionType: "checkout"` and `checkoutId`

**Result:** User sees a beautiful preview with working "Book Now" buttons that open real checkout.
