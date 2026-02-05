# Use Case Recipes

Each recipe maps a business intent to a specific combination of platform primitives. Follow the recipe, adapt based on org knowledge, and execute skills in the order listed.

---

## Recipe 1: Lead Generation Funnel

**Triggers:** "lead gen", "capture leads", "landing page", "lead magnet", "opt-in"

**L4YERCAK3 systems:** Funnels (Lead Squeeze), StoryBrand (messaging), Marketing Made Simple (nurture)

**Skills in order:**

1. **create_form** — Registration form
   - Subtype: `registration`
   - Fields: `email` (required), `firstName` (required), `phone` (optional)
   - Add industry-specific qualifying fields from org knowledge
   - Form settings: redirect to thank-you or lead magnet delivery URL

2. **create_crm_pipeline** — Lead pipeline
   - Stages: `new_lead` -> `contacted` -> `qualified` -> `proposal` -> `closed_won` -> `closed_lost`
   - Adapt stage names to industry (e.g., real estate: `new_inquiry` -> `showing_scheduled` -> `offer_made`)

3. **create_layers_workflow** — Automation
   - Trigger: `trigger_form_submitted` (linked to form from step 1)
   - Nodes: `lc_crm` (create-contact, tags: ["lead_magnet_name"]) -> `lc_email` (send confirmation) -> `activecampaign` (add_contact, add_tag)
   - If org uses WhatsApp: add `whatsapp_business` (send_template: "welcome")

4. **create_sequence** — Nurture sequence
   - Type: Soap Opera Sequence (5 emails over 7 days)
   - See sequence-patterns.md for Soap Opera framework
   - Adapt copy using org RAG for ICP language and pain points
   - Channel: `email` primary, `sms` if org has SMS enabled

5. **link_objects** — Wire everything
   - Form -> Workflow (trigger)
   - Workflow -> Sequence (enrollment)
   - Form -> Pipeline (lead source)

**Adapt based on:**
- Free lead magnet: no product/checkout needed
- Paid lead magnet: add `create_product` + `create_checkout` before the workflow
- High-ticket: add `create_project` for client onboarding after close

---

## Recipe 2: Event / Workshop Registration

**Triggers:** "event", "workshop", "conference", "meetup", "seminar"

**L4YERCAK3 systems:** Funnels (Lead Squeeze + Webinar), Perfect Webinar (content), StoryBrand (positioning)

**Skills in order:**

1. **create_product** — Event ticket
   - Subtype: `ticket`
   - Price config: set price or free (priceInCents: 0)
   - If multi-tier: create multiple products (Early Bird, General, VIP)
   - Set `saleEndDate` to event date
   - Set `maxQuantity` for capacity limit

2. **create_form** — Registration form
   - Subtype: `registration`
   - Fields: `firstName`, `lastName`, `email`, `phone`
   - Add event-specific fields: dietary requirements, session preferences, company name
   - For paid events: form connects to checkout

3. **create_checkout** — Payment flow (if paid)
   - Link product(s) from step 1
   - Link form from step 2
   - Payment methods: Stripe

4. **create_crm_pipeline** — Attendee pipeline
   - Stages: `registered` -> `confirmed` -> `checked_in` -> `attended` -> `follow_up` -> `converted`

5. **create_layers_workflow** — Post-registration automation
   - Trigger: `trigger_form_submitted` or `trigger_payment_received`
   - Nodes: `lc_crm` (create-contact, move to "registered") -> `lc_email` (confirmation + ticket) -> `activecampaign` (add_tag: "event_name")

6. **create_sequence** — Event sequence
   - Pre-event: confirmation, reminder 7d, reminder 1d, day-of logistics
   - Post-event: thank you, recording/resources, feedback survey, upsell
   - See sequence-patterns.md for event sequence patterns

7. **link_objects** — Wire everything
   - Product -> Form, Product -> Checkout
   - Form -> Workflow, Workflow -> Sequence
   - All -> CRM Pipeline

---

## Recipe 3: Product Launch

**Triggers:** "product launch", "new product", "launch sequence", "product release"

**L4YERCAK3 systems:** Funnels (Product Launch), Go-To-Market System, StoryBrand, Perfect Webinar

**Skills in order:**

1. **create_product** — The product
   - Subtype: `digital` or `physical`
   - Price config with launch pricing vs. regular pricing
   - Set `saleStartDate` for launch date
   - Set `earlyBirdUntil` for early bird window

2. **create_form** — Waitlist or interest form
   - Subtype: `registration`
   - Fields: `email`, `firstName`, qualifying questions
   - Pre-launch: captures interest before product is available

3. **create_checkout** — Purchase flow
   - Wire product + form
   - Include order bump or upsell if applicable

4. **create_crm_pipeline** — Launch pipeline
   - Stages: `interested` -> `waitlisted` -> `cart_open` -> `purchased` -> `onboarding`

5. **create_layers_workflow** — Launch automation
   - Trigger: `trigger_form_submitted` (waitlist)
   - Nodes: `lc_crm` (create-contact, tag: "launch_waitlist") -> `activecampaign` (add_to_list: "launch_list")
   - Second workflow: `trigger_payment_received` -> `lc_crm` (move to "purchased") -> `lc_email` (receipt + access)

6. **create_sequence** — Launch sequence
   - Pre-launch: anticipation (3-5 emails building desire)
   - Launch: cart open announcement, social proof, scarcity
   - Post-launch: onboarding, value delivery
   - See sequence-patterns.md for Sales Campaign framework

7. **generate_copy** — Launch messaging
   - StoryBrand one-liner for the product
   - Landing page copy: problem -> solution -> plan -> CTA
   - Use org RAG for ICP-specific language

8. **link_objects** — Wire everything

---

## Recipe 4: Booking / Appointment System

**Triggers:** "booking", "appointment", "scheduling", "calendar", "consultation"

**L4YERCAK3 systems:** Marketing Made Simple (follow-up), StoryBrand (positioning)

**Skills in order:**

1. **create_product** — Service offering (if paid)
   - Subtype: `digital`
   - Price for consultation/appointment

2. **create_form** — Booking intake form
   - Subtype: `registration`
   - Fields: `firstName`, `lastName`, `email`, `phone`, preferred date/time, service type, notes
   - Industry-specific fields from org knowledge

3. **create_crm_pipeline** — Client pipeline
   - Stages: `inquiry` -> `booked` -> `confirmed` -> `completed` -> `follow_up` -> `recurring`

4. **create_layers_workflow** — Booking automation
   - Trigger: `trigger_booking_created`
   - Nodes: `lc_crm` (create-contact or update, move to "booked") -> `lc_email` (confirmation) -> `wait_delay` (1 day before) -> `lc_email` (reminder)
   - Add `whatsapp_business` reminder if org uses WhatsApp

5. **create_sequence** — Follow-up sequence
   - Post-appointment: thank you, feedback request, rebooking prompt
   - No-show: reschedule offer, value reminder
   - See sequence-patterns.md for Follow-Up patterns

6. **link_objects** — Wire everything

---

## Recipe 5: Membership / Subscription

**Triggers:** "membership", "subscription", "recurring", "community", "access"

**L4YERCAK3 systems:** Funnels (Membership), Marketing Made Simple, Perfect Webinar (onboarding content)

**Skills in order:**

1. **create_product** — Membership tiers
   - Subtype: `digital`
   - Price config with recurring interval (monthly/yearly)
   - Create multiple products for tier levels

2. **create_form** — Membership application
   - Subtype: `application`
   - Fields: contact info + qualifying questions
   - For exclusive memberships: application review step

3. **create_checkout** — Subscription flow
   - Wire membership product(s)
   - Stripe subscription mode

4. **create_crm_pipeline** — Member lifecycle
   - Stages: `prospect` -> `trial` -> `active_member` -> `at_risk` -> `churned` -> `reactivated`

5. **create_layers_workflow** — Member onboarding
   - Trigger: `trigger_payment_received`
   - Nodes: `lc_crm` (create-contact, tag: "member_tier_name") -> `lc_email` (welcome + access) -> `activecampaign` (add_to_automation: "member_onboarding")

6. **create_sequence** — Onboarding + retention
   - Onboarding: welcome, getting started guide, first-week check-in, feature highlights
   - Retention: monthly value digest, anniversary, renewal reminder
   - At-risk: re-engagement, offer, exit survey

7. **link_objects** — Wire everything

---

## Recipe 6: Webinar Funnel

**Triggers:** "webinar", "live event", "masterclass", "training", "presentation"

**L4YERCAK3 systems:** Funnels (Webinar), Perfect Webinar (content structure), StoryBrand

**Skills in order:**

1. **create_form** — Webinar registration
   - Subtype: `registration`
   - Fields: `email`, `firstName`, `lastName`, `phone`
   - Thank-you page with calendar add link

2. **create_crm_pipeline** — Webinar pipeline
   - Stages: `registered` -> `reminded` -> `attended` -> `stayed_to_offer` -> `purchased` -> `follow_up`

3. **create_layers_workflow** — Registration automation
   - Trigger: `trigger_form_submitted`
   - Nodes: `lc_crm` (create-contact, tag: "webinar_name") -> `lc_email` (confirmation + webinar details)

4. **create_sequence** — Webinar sequence
   - Pre-webinar: confirmation, reminder 24h, reminder 1h, "starting now"
   - Post-webinar (attended): replay link, offer recap, deadline urgency, last chance
   - Post-webinar (no-show): "you missed it", replay available, offer, deadline
   - See sequence-patterns.md for Webinar Sequence patterns

5. **generate_copy** — Webinar messaging
   - Perfect Webinar framework: origin story, 3 secrets, the stack, the close
   - Registration page copy using StoryBrand
   - Use org RAG for industry-specific content and examples

6. **link_objects** — Wire everything

---

## Recipe 7: E-Commerce / Product Sales

**Triggers:** "sell products", "online store", "e-commerce", "shop", "buy"

**L4YERCAK3 systems:** Funnels (Tripwire + Self-Liquidating Offer), Marketing Made Simple

**Skills in order:**

1. **create_product** — Product catalog
   - Subtype: `physical` or `digital`
   - Price config per product
   - Create multiple products for catalog

2. **create_form** — Order form (if custom fields needed)
   - Subtype: `registration`
   - Fields: shipping address, size/color preferences, special requests

3. **create_checkout** — Purchase flow
   - Wire product(s) + form
   - Configure shipping if physical

4. **create_crm_pipeline** — Customer pipeline
   - Stages: `browsing` -> `cart` -> `purchased` -> `shipped` -> `delivered` -> `review_requested`

5. **create_layers_workflow** — Order automation
   - Trigger: `trigger_payment_received`
   - Nodes: `lc_crm` (create-contact, tag: "customer") -> `lc_invoicing` (generate-invoice) -> `lc_email` (order confirmation) -> `activecampaign` (add_tag: "purchased_product_name")

6. **create_sequence** — Post-purchase
   - Order confirmation, shipping update, delivery confirmation
   - Review request (7 days post-delivery)
   - Cross-sell/upsell (14 days post-delivery)
   - Replenishment reminder (if consumable)

7. **link_objects** — Wire everything

---

## Recipe 8: Client Onboarding

**Triggers:** "onboarding", "new client", "client setup", "welcome client"

**L4YERCAK3 systems:** ICP Research, Hero Definition, Go-To-Market System

**Skills in order:**

1. **create_project** — Client project
   - Subtype: `client_project`
   - Status: `planning`
   - Milestones: discovery, setup, launch, review
   - Tasks: broken down per milestone

2. **create_form** — Onboarding questionnaire
   - Subtype: `application`
   - Fields: business info, goals, current challenges, brand assets, target audience
   - Adapt fields using org knowledge for industry-specific questions

3. **create_crm_pipeline** — Onboarding pipeline
   - Stages: `signed` -> `discovery` -> `setup` -> `launch_prep` -> `launched` -> `optimizing`

4. **create_layers_workflow** — Onboarding automation
   - Trigger: `trigger_form_submitted` (intake form)
   - Nodes: `lc_crm` (update-contact, move to "discovery") -> `lc_email` (welcome pack) -> `lc_ai_agent` (analyze questionnaire responses)

5. **create_sequence** — Onboarding drip
   - Welcome + expectations
   - Questionnaire reminder (if not completed)
   - Setup progress updates
   - Launch announcement
   - 30-day check-in

6. **link_objects** — Wire everything
   - Project -> Contact (client assignment)
   - Form -> Project (intake feeds project)
   - Workflow -> Sequence

---

## Recipe 9: Fundraising / Donations

**Triggers:** "fundraising", "donations", "nonprofit", "charity", "crowdfunding"

**L4YERCAK3 systems:** StoryBrand (cause messaging), Marketing Made Simple (donor nurture)

**Skills in order:**

1. **create_product** — Donation tiers
   - Subtype: `digital`
   - Multiple products: $25, $50, $100, $250, custom
   - No inventory limit

2. **create_form** — Donor form
   - Subtype: `registration`
   - Fields: `firstName`, `lastName`, `email`, `phone`, donation amount, dedication/tribute, recurring option

3. **create_checkout** — Donation flow
   - Wire donation product(s)
   - Support one-time and recurring

4. **create_crm_pipeline** — Donor pipeline
   - Stages: `prospect` -> `first_time_donor` -> `repeat_donor` -> `major_donor` -> `monthly_sustainer` -> `lapsed`

5. **create_layers_workflow** — Donation automation
   - Trigger: `trigger_payment_received`
   - Nodes: `lc_crm` (create-contact, tag: "donor") -> `lc_invoicing` (generate receipt) -> `lc_email` (thank you + tax receipt)

6. **create_sequence** — Donor stewardship
   - Immediate: thank you + receipt
   - 7 days: impact story ("here's what your donation did")
   - 30 days: update on cause progress
   - 90 days: re-engagement or upgrade ask
   - Annual: year-in-review, annual appeal

7. **link_objects** — Wire everything

---

## Composition Principles

1. **Recipe is guidance, not a script.** Adapt based on org knowledge, client industry, and specific requirements. Skip steps that don't apply.
2. **Dependencies first.** Create objects in dependency order. Products before checkouts. Forms before workflows that trigger on submission.
3. **Always wire objects.** Unlinked objects are useless. The `link_objects` step is not optional.
4. **Adapt copy to ICP.** If org RAG contains ICP profiles or industry knowledge, use that language in form labels, email copy, pipeline stage names, and product descriptions.
5. **Channel mix matters.** Check what channels the org has enabled (email, SMS, WhatsApp) before adding channel-specific nodes to workflows.
6. **Cost transparency.** Calculate total credit cost before execution. Present to agency owner for approval.
