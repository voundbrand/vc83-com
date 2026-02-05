# Skill: Membership / Subscription

> L4YERCAK3 AI Composition Platform -- membership-subscription template.
> All object schemas, mutation signatures, node types, and link types reference `_SHARED.md`. Use those exact names.

---

## 1. Purpose

Deploy a membership or subscription system with tiered access levels, recurring billing via Stripe, automated onboarding sequences, retention messaging, and churn prevention workflows. The agency builds this for a client who runs a community, course platform, professional association, coaching program, or any recurring-access service.

Key capabilities:
- Multiple product tiers with monthly/yearly billing intervals
- Optional application-review gate for exclusive or high-tier memberships
- CRM pipeline tracking the full member lifecycle from prospect to lifetime
- Automated onboarding sequence (7-step, 30-day) personalized per tier
- Retention and re-engagement sequences triggered by behavioral signals
- Renewal invoicing and failed-payment handling
- Cancellation processing with exit survey and win-back automation

Three-layer model: L4YERCAK3 -> Agency -> Agency's Client -> End Customer (the member).

---

## 2. Ontologies Involved

### Product (`type: "product"`, subtype: `"digital"`)

One product object per membership tier. All prices in cents.

```
customProperties: {
  productCode: string,          // e.g. "MEMBER-STARTER-MO"
  description: string,          // tier benefits summary
  price: number,                // in cents, e.g. 4900 for $49
  currency: "USD",              // ISO 4217
  inventory: -1,                // unlimited (-1) for digital memberships
  sold: 0,
  taxBehavior: "exclusive",
  maxQuantity: 1,               // one membership per customer
  invoiceConfig: {
    recurringInterval: "monthly" | "yearly",
    trialPeriodDays: 0 | 7 | 14 | 30
  }
}
```

Mutations used: `createProduct`, `updateProduct`, `publishProduct`, `archiveProduct`, `duplicateProduct`.

### Form (`type: "form"`, subtype: `"application"`)

Used for membership application (especially for exclusive/high-tier memberships) or simple signup.

```
customProperties: {
  fields: [
    { type: "section_header", label: "Contact Information", required: false },
    { type: "text", label: "Full Name", required: true },
    { type: "email", label: "Email Address", required: true },
    { type: "phone", label: "Phone Number", required: false },
    { type: "text", label: "Company / Organization", required: false },
    { type: "section_header", label: "Membership Application", required: false },
    { type: "select", label: "Desired Tier", required: true, options: ["Starter", "Growth", "Inner Circle"] },
    { type: "textarea", label: "Why do you want to join?", required: true },
    { type: "textarea", label: "What do you hope to achieve in the first 90 days?", required: false },
    { type: "select", label: "How did you hear about us?", required: true, options: ["Referral", "Social Media", "Search", "Podcast", "Other"] },
    { type: "checkbox", label: "I agree to the membership terms and conditions", required: true }
  ],
  formSettings: {
    redirectUrl: "/welcome",
    notifications: { adminEmail: true, applicantConfirmation: true },
    submissionBehavior: "redirect"
  },
  displayMode: "standard",
  conditionalLogic: [
    {
      fieldId: "desired_tier",
      operator: "equals",
      value: "Inner Circle",
      action: "show",
      targetFieldId: "why_join"
    }
  ],
  submissionWorkflow: {
    requiresReview: true,
    reviewerRole: "admin"
  }
}
```

Mutations used: `createForm`, `updateForm`, `publishForm`, `createFormResponse`, `submitPublicForm`.

### CRM Contact (`type: "crm_contact"`, subtype: `"customer"` or `"prospect"`)

```
customProperties: {
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  companyName: string,
  contactType: "member",
  tags: ["member", "tier_starter", "onboarding"],   // dynamic per tier
  pipelineStageId: string,                           // current lifecycle stage
  pipelineDealValue: number,                         // annual membership value in cents
  customFields: {
    memberSince: number,           // timestamp
    currentTier: string,           // "starter" | "growth" | "inner_circle"
    renewalDate: number,           // next renewal timestamp
    lifetimeValue: number,         // cumulative payments in cents
    engagementScore: number,       // 0-100, used for at_risk detection
    applicationStatus: string,     // "pending" | "approved" | "waitlisted" | "rejected"
    stripeCustomerId: string,
    stripeSubscriptionId: string
  }
}
```

Mutations used: `createContact`, `updateContact`.

### Checkout (Stripe subscription mode)

Checkout is created via `lc_checkout` node with `create-transaction` action configured for Stripe subscription mode. Config:

```
{
  paymentProvider: "stripe",
  mode: "subscription",
  recurringInterval: "monthly" | "yearly",
  productId: Id<"objects">,       // linked membership product
  successUrl: "/welcome",
  cancelUrl: "/membership"
}
```

### Invoice

```
type: "b2c_single"
status flow: draft -> sent -> paid | overdue | cancelled
paymentTerms: "due_on_receipt"
```

Generated automatically on each successful renewal via `lc_invoicing` node (`generate-invoice` action).

Mutations used: `createDraftInvoiceFromTransactions`, `sealInvoice`, `markInvoiceAsSent`, `markInvoiceAsPaid`.

### Workflow (`type: "layer_workflow"`)

Five workflows (see Section 4 for full node/edge definitions):
1. New Member Signup
2. Application Review
3. Renewal Processing
4. Churn Prevention
5. Cancellation Processing

Mutations used: `createWorkflow`, `saveWorkflow`, `updateWorkflowStatus`.

### Automation Sequences (`type: "automation_sequence"`)

Three sequences:
1. **Onboarding Sequence** -- subtype: `lifecycle`, trigger: `contact_tagged` (tag: `"onboarding"`), 7 steps over 30 days
2. **Retention Sequence** -- subtype: `custom`, trigger: `pipeline_stage_changed` (to `"active_member"`), ongoing monthly
3. **Re-Engagement Sequence** -- subtype: `custom`, trigger: `contact_tagged` (tag: `"at_risk"`), 6 steps over 14 days

### objectLinks

| linkType | sourceObjectId | targetObjectId | Purpose |
|----------|---------------|----------------|---------|
| `product_form` | membership product (any tier) | application form | Product requires application |
| `checkout_product` | checkout config | membership product | Checkout sells this product |
| `workflow_form` | application-review workflow | application form | Workflow triggered by form submission |
| `workflow_sequence` | new-member-signup workflow | onboarding sequence | Workflow enrolls member in sequence |
| `workflow_sequence` | churn-prevention workflow | re-engagement sequence | Workflow enrolls at-risk member |

---

## 3. Builder Components

### Membership Landing Page

Primary marketing page. Structure:

- **Hero Section** -- headline (value prop), sub-headline (who it is for), primary CTA button
- **Tier Comparison Table** -- 3-column table (one per tier), rows: price, billing interval, feature checklist (checkmarks/dashes), CTA button per tier
- **Benefits List** -- icon + title + description grid (6-8 benefits), grouped by category (access, community, support, content)
- **Social Proof / Testimonials** -- carousel or grid of 3-5 member testimonials with name, photo, tier, quote, and result metric
- **FAQ Accordion** -- 8-10 common questions: "What happens after I sign up?", "Can I upgrade/downgrade?", "Is there a free trial?", "How do I cancel?", "What payment methods?", "Is there an application process?", etc.
- **Final CTA Section** -- urgency or scarcity element, repeated tier selection, money-back guarantee badge

### Application / Signup Page

- Form embed (from the application form object)
- Tier selection pre-filled from landing page CTA
- Progress indicator if multi-step
- Trust badges (secure payment, privacy policy, guarantee)

### Member Welcome Page

- Personalized greeting ("Welcome, {firstName}!")
- Login credentials or SSO link
- Getting started checklist (3-5 items)
- Quick links: community, first resource, support contact
- Video embed: welcome video from founder/coach

### Member Dashboard Concept

- Current tier and renewal date
- Engagement metrics (sessions attended, resources accessed)
- Upcoming events or calls
- Upgrade prompt (if not top tier)
- Support/help link

---

## 4. Layers Automations

### Workflow 1: New Member Signup

**Trigger:** `trigger_payment_received` (Stripe subscription created)

```
nodes:
  - id: "trigger_1"
    type: "trigger_payment_received"
    position: { x: 0, y: 200 }
    config: { paymentProvider: "stripe" }
    status: "ready"
    label: "Payment Received"

  - id: "crm_create"
    type: "lc_crm"
    position: { x: 300, y: 200 }
    config: {
      action: "create-contact",
      firstName: "{{payment.customerFirstName}}",
      lastName: "{{payment.customerLastName}}",
      email: "{{payment.customerEmail}}",
      contactType: "member",
      tags: ["member", "tier_{{payment.productTierTag}}", "onboarding"],
      customFields: {
        memberSince: "{{now}}",
        currentTier: "{{payment.productTierTag}}",
        stripeCustomerId: "{{payment.stripeCustomerId}}",
        stripeSubscriptionId: "{{payment.stripeSubscriptionId}}"
      }
    }
    status: "ready"
    label: "Create CRM Contact"

  - id: "crm_pipeline"
    type: "lc_crm"
    position: { x: 600, y: 200 }
    config: {
      action: "move-pipeline-stage",
      stage: "active_member"
    }
    status: "ready"
    label: "Move to Active Member"

  - id: "email_welcome"
    type: "lc_email"
    position: { x: 900, y: 200 }
    config: {
      action: "send-confirmation-email",
      subject: "Welcome to {{programName}} -- Here's How to Get Started",
      body: "Welcome {{firstName}}! Your {{tierName}} membership is active. Here are your login credentials and getting started guide...",
      includeAttachments: ["getting-started-guide"]
    }
    status: "ready"
    label: "Send Welcome Email"

  - id: "ac_sync"
    type: "activecampaign"
    position: { x: 1200, y: 100 }
    config: {
      action: "add_contact",
      email: "{{contact.email}}",
      firstName: "{{contact.firstName}}",
      lastName: "{{contact.lastName}}"
    }
    status: "ready"
    label: "AC: Add Contact"

  - id: "ac_automation"
    type: "activecampaign"
    position: { x: 1500, y: 100 }
    config: {
      action: "add_to_automation",
      automationName: "member_onboarding"
    }
    status: "ready"
    label: "AC: Start Onboarding"

  - id: "ac_tag"
    type: "activecampaign"
    position: { x: 1500, y: 300 }
    config: {
      action: "add_tag",
      tag: "member_{{payment.productTierTag}}"
    }
    status: "ready"
    label: "AC: Tag Tier"

edges:
  - id: "e1"
    source: "trigger_1"
    target: "crm_create"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "e2"
    source: "crm_create"
    target: "crm_pipeline"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "e3"
    source: "crm_pipeline"
    target: "email_welcome"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "e4"
    source: "email_welcome"
    target: "ac_sync"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "e5"
    source: "ac_sync"
    target: "ac_automation"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "e6"
    source: "ac_sync"
    target: "ac_tag"
    sourceHandle: "output"
    targetHandle: "input"
```

---

### Workflow 2: Application Review (for Exclusive Tiers)

**Trigger:** `trigger_form_submitted` (application form)

```
nodes:
  - id: "trigger_app"
    type: "trigger_form_submitted"
    position: { x: 0, y: 200 }
    config: { formId: "{{applicationFormId}}" }
    status: "ready"
    label: "Application Submitted"

  - id: "crm_prospect"
    type: "lc_crm"
    position: { x: 300, y: 200 }
    config: {
      action: "create-contact",
      firstName: "{{form.fullName.split(' ')[0]}}",
      lastName: "{{form.fullName.split(' ').slice(1).join(' ')}}",
      email: "{{form.email}}",
      phone: "{{form.phone}}",
      contactType: "prospect",
      tags: ["applicant", "tier_{{form.desiredTier}}"],
      customFields: {
        applicationStatus: "pending",
        desiredTier: "{{form.desiredTier}}"
      }
    }
    status: "ready"
    label: "Create Prospect Contact"

  - id: "crm_stage_prospect"
    type: "lc_crm"
    position: { x: 600, y: 200 }
    config: {
      action: "move-pipeline-stage",
      stage: "applicant"
    }
    status: "ready"
    label: "Move to Applicant Stage"

  - id: "email_received"
    type: "lc_email"
    position: { x: 900, y: 200 }
    config: {
      action: "send-confirmation-email",
      subject: "We've Received Your Application",
      body: "Hi {{firstName}}, thanks for applying to {{programName}}. We'll review your application within 48 hours and get back to you."
    }
    status: "ready"
    label: "Application Received Email"

  - id: "ai_review"
    type: "lc_ai_agent"
    position: { x: 1200, y: 200 }
    config: {
      prompt: "Review this membership application. Score the applicant 0-100 based on fit with our ideal member profile. Consider: stated goals, company/background, desired tier, and reason for joining. Return JSON: { score: number, reasoning: string, recommendation: 'approve' | 'waitlist' | 'reject' }",
      model: "default"
    }
    status: "ready"
    label: "AI Review Application"

  - id: "check_score"
    type: "if_then"
    position: { x: 1500, y: 200 }
    config: {
      expression: "{{ai_review.output.score}} >= 70"
    }
    status: "ready"
    label: "Score >= 70?"

  - id: "email_approved"
    type: "lc_email"
    position: { x: 1800, y: 100 }
    config: {
      action: "send-confirmation-email",
      subject: "You're Approved! Complete Your {{tierName}} Membership",
      body: "Congratulations {{firstName}}! Your application has been approved. Click here to complete your membership: {{checkoutLink}}"
    }
    status: "ready"
    label: "Approved Email + Payment Link"

  - id: "email_waitlisted"
    type: "lc_email"
    position: { x: 1800, y: 350 }
    config: {
      action: "send-confirmation-email",
      subject: "Application Update -- You're on Our Waitlist",
      body: "Hi {{firstName}}, thank you for your interest. We've placed you on our waitlist and will reach out when a spot opens up."
    }
    status: "ready"
    label: "Waitlisted Email"

edges:
  - id: "ea1"
    source: "trigger_app"
    target: "crm_prospect"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ea2"
    source: "crm_prospect"
    target: "crm_stage_prospect"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ea3"
    source: "crm_stage_prospect"
    target: "email_received"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ea4"
    source: "email_received"
    target: "ai_review"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ea5"
    source: "ai_review"
    target: "check_score"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ea6"
    source: "check_score"
    target: "email_approved"
    sourceHandle: "true"
    targetHandle: "input"

  - id: "ea7"
    source: "check_score"
    target: "email_waitlisted"
    sourceHandle: "false"
    targetHandle: "input"
```

---

### Workflow 3: Renewal Processing

**Trigger:** `trigger_payment_received` (Stripe recurring payment)

```
nodes:
  - id: "trigger_renewal"
    type: "trigger_payment_received"
    position: { x: 0, y: 200 }
    config: { paymentProvider: "stripe" }
    status: "ready"
    label: "Renewal Payment Received"

  - id: "crm_update_renewal"
    type: "lc_crm"
    position: { x: 300, y: 200 }
    config: {
      action: "update-contact",
      tags: ["renewed", "active"],
      customFields: {
        renewalDate: "{{nextRenewalTimestamp}}",
        lifetimeValue: "{{contact.lifetimeValue + payment.amount}}"
      }
    }
    status: "ready"
    label: "Update Contact: Renewed"

  - id: "invoice_generate"
    type: "lc_invoicing"
    position: { x: 600, y: 200 }
    config: {
      action: "generate-invoice",
      type: "b2c_single",
      paymentTerms: "due_on_receipt",
      autoSeal: true,
      autoSend: true
    }
    status: "ready"
    label: "Generate Renewal Invoice"

  - id: "email_renewal_confirm"
    type: "lc_email"
    position: { x: 900, y: 200 }
    config: {
      action: "send-confirmation-email",
      subject: "Membership Renewed -- Receipt Inside",
      body: "Hi {{firstName}}, your {{tierName}} membership has been renewed. Your invoice is attached. Next renewal: {{nextRenewalDate}}."
    }
    status: "ready"
    label: "Renewal Confirmation Email"

edges:
  - id: "er1"
    source: "trigger_renewal"
    target: "crm_update_renewal"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "er2"
    source: "crm_update_renewal"
    target: "invoice_generate"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "er3"
    source: "invoice_generate"
    target: "email_renewal_confirm"
    sourceHandle: "output"
    targetHandle: "input"
```

---

### Workflow 4: Churn Prevention

**Trigger:** `trigger_contact_updated` (fires when contact tags or fields change)

```
nodes:
  - id: "trigger_contact_change"
    type: "trigger_contact_updated"
    position: { x: 0, y: 200 }
    config: {}
    status: "ready"
    label: "Contact Updated"

  - id: "check_at_risk"
    type: "if_then"
    position: { x: 300, y: 200 }
    config: {
      expression: "{{contact.tags}}.includes('at_risk')"
    }
    status: "ready"
    label: "Is At-Risk?"

  - id: "email_reengage"
    type: "lc_email"
    position: { x: 600, y: 100 }
    config: {
      action: "send-confirmation-email",
      subject: "We've Noticed You've Been Away -- Special Offer Inside",
      body: "Hi {{firstName}}, we miss you! Here's what's been happening in the community and a special offer to re-engage..."
    }
    status: "ready"
    label: "Re-Engagement Email"

  - id: "wait_3d"
    type: "wait_delay"
    position: { x: 900, y: 100 }
    config: { duration: 3, unit: "days" }
    status: "ready"
    label: "Wait 3 Days"

  - id: "check_still_at_risk"
    type: "if_then"
    position: { x: 1200, y: 100 }
    config: {
      expression: "{{contact.tags}}.includes('at_risk')"
    }
    status: "ready"
    label: "Still At-Risk?"

  - id: "email_discount"
    type: "lc_email"
    position: { x: 1500, y: 0 }
    config: {
      action: "send-confirmation-email",
      subject: "A Special Discount -- Just for You",
      body: "Hi {{firstName}}, as a valued member, we'd like to offer you {{discountPercent}}% off your next renewal. Use code: {{discountCode}}"
    }
    status: "ready"
    label: "Discount Offer Email"

  - id: "wait_5d"
    type: "wait_delay"
    position: { x: 1800, y: 0 }
    config: { duration: 5, unit: "days" }
    status: "ready"
    label: "Wait 5 Days"

  - id: "email_exit_survey"
    type: "lc_email"
    position: { x: 2100, y: 0 }
    config: {
      action: "send-confirmation-email",
      subject: "Quick Question Before You Go",
      body: "Hi {{firstName}}, we'd love to understand what we could do better. Would you take 2 minutes to share your feedback? {{exitSurveyLink}}"
    }
    status: "ready"
    label: "Exit Survey Email"

edges:
  - id: "ec1"
    source: "trigger_contact_change"
    target: "check_at_risk"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ec2"
    source: "check_at_risk"
    target: "email_reengage"
    sourceHandle: "true"
    targetHandle: "input"

  - id: "ec3"
    source: "email_reengage"
    target: "wait_3d"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ec4"
    source: "wait_3d"
    target: "check_still_at_risk"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ec5"
    source: "check_still_at_risk"
    target: "email_discount"
    sourceHandle: "true"
    targetHandle: "input"

  - id: "ec6"
    source: "email_discount"
    target: "wait_5d"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ec7"
    source: "wait_5d"
    target: "email_exit_survey"
    sourceHandle: "output"
    targetHandle: "input"
```

Note: The `false` branch of `check_at_risk` terminates (member re-engaged, no action needed). The `false` branch of `check_still_at_risk` also terminates (member re-engaged after first email).

---

### Workflow 5: Cancellation Processing

**Trigger:** `trigger_webhook` (Stripe cancellation webhook)

```
nodes:
  - id: "trigger_cancel"
    type: "trigger_webhook"
    position: { x: 0, y: 200 }
    config: {
      path: "/stripe-cancel",
      secret: "{{webhookSecret}}"
    }
    status: "ready"
    label: "Stripe Cancellation Webhook"

  - id: "crm_churn"
    type: "lc_crm"
    position: { x: 300, y: 200 }
    config: {
      action: "move-pipeline-stage",
      stage: "churned"
    }
    status: "ready"
    label: "Move to Churned"

  - id: "crm_tag_cancel"
    type: "lc_crm"
    position: { x: 600, y: 200 }
    config: {
      action: "update-contact",
      tags: ["cancelled"],
      removeTags: ["active", "member", "onboarding"]
    }
    status: "ready"
    label: "Tag: Cancelled"

  - id: "email_cancel_confirm"
    type: "lc_email"
    position: { x: 900, y: 200 }
    config: {
      action: "send-confirmation-email",
      subject: "Your Membership Has Been Cancelled",
      body: "Hi {{firstName}}, your {{tierName}} membership has been cancelled. You'll retain access until {{accessEndDate}}. We'd love your feedback: {{exitSurveyLink}}"
    }
    status: "ready"
    label: "Cancellation Confirmation"

  - id: "ac_tag_churned"
    type: "activecampaign"
    position: { x: 1200, y: 100 }
    config: {
      action: "add_tag",
      tag: "churned"
    }
    status: "ready"
    label: "AC: Tag Churned"

  - id: "ac_winback"
    type: "activecampaign"
    position: { x: 1200, y: 300 }
    config: {
      action: "add_to_automation",
      automationName: "win_back"
    }
    status: "ready"
    label: "AC: Win-Back Automation"

edges:
  - id: "ex1"
    source: "trigger_cancel"
    target: "crm_churn"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ex2"
    source: "crm_churn"
    target: "crm_tag_cancel"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ex3"
    source: "crm_tag_cancel"
    target: "email_cancel_confirm"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ex4"
    source: "email_cancel_confirm"
    target: "ac_tag_churned"
    sourceHandle: "output"
    targetHandle: "input"

  - id: "ex5"
    source: "email_cancel_confirm"
    target: "ac_winback"
    sourceHandle: "output"
    targetHandle: "input"
```

---

## 5. CRM Pipeline

**Pipeline Name:** `Membership: [Program Name]`

### Stages

| Order | Stage ID | Stage Name | Description | Automation Trigger |
|-------|----------|-----------|-------------|-------------------|
| 1 | `prospect` | Prospect | Visited membership page, not yet applied or paid | -- |
| 2 | `applicant` | Applicant | Submitted application form (exclusive tiers only) | `trigger_form_submitted` -> Application Review workflow |
| 3 | `trial` | Trial Member | Active trial period, not yet converted | Schedule: check trial expiration daily |
| 4 | `active_member` | Active Member | Paying member in good standing | `trigger_payment_received` -> New Member Signup workflow |
| 5 | `at_risk` | At-Risk | Engagement score dropped below threshold, or payment failed | `trigger_contact_updated` -> Churn Prevention workflow |
| 6 | `churned` | Churned | Cancelled or expired, no longer active | `trigger_webhook` (Stripe cancel) -> Cancellation workflow |
| 7 | `reactivated` | Reactivated | Previously churned, now re-subscribed | `trigger_payment_received` (with tag `"cancelled"` present) |
| 8 | `lifetime` | Lifetime Member | Grandfathered or awarded permanent access | Manual move only |

### Stage Transition Rules

- **prospect -> applicant**: Form submission (exclusive tiers) or direct to `active_member` (open tiers)
- **prospect -> active_member**: Direct payment (open tiers, no application)
- **applicant -> active_member**: Application approved + payment completed
- **applicant -> prospect**: Application rejected/waitlisted (can re-apply)
- **active_member -> at_risk**: Engagement score < 30 OR payment failure OR no login in 30 days
- **at_risk -> active_member**: Re-engagement successful (engagement score recovers OR payment resolved)
- **at_risk -> churned**: Cancellation processed OR 3 consecutive failed payments
- **churned -> reactivated**: New payment received from previously churned contact
- **reactivated -> active_member**: After 30 days of continuous active status
- **any -> lifetime**: Manual admin action only

### At-Risk Detection Criteria

Tag a contact as `at_risk` when ANY of the following is true:
- Engagement score drops below 30 (out of 100)
- No platform login for 30+ consecutive days
- Stripe payment fails (invoice.payment_failed webhook)
- Contact opens 0 of last 5 emails sent
- Contact submits a support ticket with "cancel" or "refund" in the subject

---

## 6. File System Scaffold

```
/builder
  /membership-landing-page       # kind: builder_ref
    # Tier comparison, benefits, testimonials, FAQ, CTAs
  /application-page              # kind: builder_ref
    # Form embed for exclusive tier applications
  /welcome-page                  # kind: builder_ref
    # Post-signup welcome with getting started guide

/layers
  /new-member-workflow            # kind: layer_ref
    # Workflow 1: Payment -> CRM -> Email -> AC
  /application-review-workflow    # kind: layer_ref
    # Workflow 2: Form -> CRM -> Email -> AI Review -> Approve/Waitlist
  /renewal-workflow               # kind: layer_ref
    # Workflow 3: Renewal payment -> CRM update -> Invoice -> Email
  /churn-prevention-workflow      # kind: layer_ref
    # Workflow 4: Contact updated -> At-risk check -> Re-engage sequence
  /cancellation-workflow          # kind: layer_ref
    # Workflow 5: Stripe cancel webhook -> CRM -> Email -> AC win-back

/notes
  /tier-benefits-matrix           # kind: virtual
    # Comparison grid: feature vs. tier, pricing, included access
  /pricing-strategy               # kind: virtual
    # Monthly vs. yearly pricing, discount rationale, trial length
  /onboarding-checklist           # kind: virtual
    # Step-by-step what new members should do in first 7 days
  /churn-prevention-playbook      # kind: virtual
    # At-risk detection criteria, intervention steps, escalation

/assets
  /membership-badges              # kind: media_ref
    # Tier badge images (Starter, Growth, Inner Circle)
  /welcome-video                  # kind: media_ref
    # Founder/coach welcome video for welcome page
  /tier-comparison-graphic        # kind: media_ref
    # Visual tier comparison for landing page and social
```

Initialized via: `initializeProjectFolders({ organizationId, projectId })`
Additional folders via: `createFolder({ sessionId, projectId, name, parentPath })`
Notes created via: `createVirtualFile({ sessionId, projectId, name, parentPath, content })`

---

## 7. Data Flow Diagram

```
                                    MEMBERSHIP DATA FLOW
 ============================================================================

 ACQUISITION                    CONVERSION                     ACTIVATION
 -----------                    ----------                     ----------

 Prospect visits       Select tier        Fill application     Payment
 membership page  ---> on landing  -----> (exclusive tiers) -> processed
       |               page               OR direct to              |
       |                                  checkout (open)           |
       v                                       |                    v
  [Landing Page]                               v             [Stripe Checkout]
  - tier comparison                      [Application Form]        |
  - benefits                                   |                    |
  - testimonials                               v                    v
  - FAQ                                  [Workflow 2:          [Workflow 1:
                                          App Review]          New Member Signup]
                                               |                    |
                                          AI scores fit             |
                                               |                    |
                                         ------+------              |
                                        |             |             |
                                     >= 70         < 70             |
                                        |             |             |
                                   Approved      Waitlisted         |
                                   email +       email              |
                                   payment                          |
                                   link                             |
                                        |                           |
                                        +------------>--------------+
                                                                    |
                                                                    v
 ONBOARDING                                                  CRM Contact Created
 ----------                                                  - tags: member, tier_X
                                                             - stage: active_member
  [Onboarding Sequence - 7 steps, 30 days]                         |
  Immediate : Welcome email + credentials + guide                  v
  +1 day    : Quick win -- "Do this first"                   [Welcome Email]
  +3 days   : Feature spotlight                              + access credentials
  +5 days   : Check-in (email + sms)                         + getting started
  +7 days   : Success story                                        |
  +14 days  : Advanced tips                                        v
  +30 days  : Review + upsell to next tier               [ActiveCampaign Sync]
                                                         - add contact
                                                         - tag: member_tier_X
                                                         - automation: onboarding

 RETENTION (ongoing)                CHURN PREVENTION             CANCELLATION
 -------------------                ----------------             ------------

 Monthly:                        Contact tagged "at_risk"     Stripe cancel webhook
 - Renewal payment          ---> [Workflow 4]                  [Workflow 5]
   [Workflow 3]                        |                            |
   |                              Re-engagement email          Move to "churned"
   v                                   |                       Tag: cancelled
 CRM: tag "renewed"              Wait 3 days                       |
 Invoice generated                     |                      Cancellation email
 Confirmation email              Still at-risk?               + exit survey link
                                  Y: discount offer                 |
                                  Wait 5 days                  AC: tag churned
                                  Exit survey email            AC: win_back auto
                                                                    |
                                                                    v
                                                            [Re-Engagement Sequence]
                                                            Day 1  : "We miss you"
                                                            Day 3  : Value reminder
                                                            Day 5  : Incentive/offer
                                                            Day 7  : Social proof
                                                            Day 10 : Last chance
                                                            Day 14 : Account paused
```

---

## 8. Customization Points

### Must Customize (will not work with defaults)

| Item | What to Set | Example |
|------|------------|---------|
| Tier names | Product `name` field for each tier | "Starter", "Growth", "Inner Circle" |
| Tier prices | Product `customProperties.price` (cents) | 4900, 14900, 49900 |
| Tier benefits | Product `customProperties.description` + landing page content | Feature lists per tier |
| Billing interval | Product `customProperties.invoiceConfig.recurringInterval` | "monthly" or "yearly" |
| Access delivery method | Welcome email content + welcome page links | Portal URL, community invite link, calendar link |
| Stripe product/price IDs | Checkout config mapping to Stripe dashboard | `price_xxxxx` for each tier |
| Program name | Used in all email subjects and page headings | "Growth Accelerator Membership" |

### Should Customize (works with defaults but will be generic)

| Item | Default | Recommended |
|------|---------|-------------|
| Application form questions | Generic qualifying questions | Industry-specific questions, tier-relevant criteria |
| Welcome email content | Template greeting + placeholder guide | Founder's personal voice, specific first steps |
| Onboarding sequence messaging | Framework 7 generic steps | Tier-specific content, real resource links, actual support contacts |
| Churn thresholds | Engagement score < 30 | Calibrate to actual usage patterns after 30 days of data |
| AI application review prompt | Generic fit scoring | Specific ideal-member criteria, deal-breakers, tier requirements |
| Landing page testimonials | Placeholder quotes | Real member testimonials with photos and metrics |
| FAQ content | Generic membership questions | Program-specific policies, billing details, access specifics |

### Can Use Defaults (ready out of the box)

| Item | Default Value |
|------|--------------|
| Pipeline stages | prospect, applicant, trial, active_member, at_risk, churned, reactivated, lifetime |
| Workflow structure | All 5 workflows as defined in Section 4 |
| Sequence timing | Onboarding: 7 steps over 30 days per Framework 7 |
| Re-engagement timing | 6 steps over 14 days per Framework 8 |
| File system layout | /builder, /layers, /notes, /assets structure |
| Invoice type | b2c_single, due_on_receipt |
| objectLink types | product_form, checkout_product, workflow_form, workflow_sequence |
| CRM contact fields | Standard membership custom fields |

---

## 9. Common Pitfalls

### 1. Multiple Products Not Distinguished by Tier Tag

**Problem:** All tier products are created but the CRM contact is tagged only as `"member"` without a tier-specific tag like `"tier_starter"` or `"tier_inner_circle"`.

**Impact:** Onboarding sequence cannot be personalized per tier. Reporting cannot segment by tier. Upgrade/downgrade logic breaks.

**Fix:** Every product must map to a unique tier tag. The New Member Signup workflow must include `"tier_{{productTierTag}}"` in the contact's tags array. Verify with: each product's `productCode` should contain the tier slug.

### 2. Stripe Subscription Mode Not Configured on Checkout

**Problem:** Checkout is created with one-time payment mode instead of subscription mode. Member pays once and never gets billed again.

**Impact:** No recurring revenue. Renewal workflow never fires. Member appears to churn after first period.

**Fix:** Checkout config must specify `mode: "subscription"` and `recurringInterval` matching the product's `invoiceConfig.recurringInterval`. Verify in Stripe dashboard that the price object is type `recurring`, not `one_time`.

### 3. Renewal Workflow Not Handling Failed Payments

**Problem:** Workflow 3 (Renewal Processing) only handles successful payments. When Stripe sends `invoice.payment_failed`, nothing happens.

**Impact:** Member loses access silently. No dunning emails. No at-risk tagging. Revenue leaks.

**Fix:** Add a separate trigger or branch for failed payments: `trigger_webhook` (path: `/stripe-payment-failed`) -> `lc_crm` (update-contact, tags: `["payment_failed", "at_risk"]`, move-pipeline-stage: `"at_risk"`) -> `lc_email` (payment failed notification with update-card link). Alternatively, rely on Stripe's built-in dunning and use the `at_risk` tag from webhook events.

### 4. At-Risk Detection Not Defined

**Problem:** The churn prevention workflow triggers on `trigger_contact_updated` and checks for the `"at_risk"` tag, but nothing ever APPLIES that tag.

**Impact:** Churn prevention workflow never fires. Members quietly disengage and cancel.

**Fix:** Implement at-risk detection via one or more of: (a) a `trigger_schedule` workflow that runs daily, queries contacts with engagement score < 30 or no login in 30 days, and applies the `"at_risk"` tag; (b) Stripe webhook for `invoice.payment_failed` that tags the contact; (c) ActiveCampaign engagement scoring that syncs back to LC.

### 5. Onboarding Sequence Not Tier-Specific

**Problem:** All members regardless of tier receive the same onboarding sequence with the same content, resources, and CTAs.

**Impact:** Starter members get references to features they do not have access to. Inner Circle members get basic-level content that does not match their investment.

**Fix:** Create separate onboarding sequences per tier, or use conditional content within the sequence that branches based on the contact's `currentTier` custom field. At minimum, the welcome email, quick-win step, and feature spotlight should differ per tier.

### 6. Application Review Workflow Missing When It Should Exist

**Problem:** An exclusive or high-ticket tier (e.g., Inner Circle at $499/mo) is set up with direct checkout and no application gate.

**Impact:** Unqualified members join and churn quickly. Community quality degrades. High-value members leave because of poor fit.

**Fix:** Any tier above a price threshold (agency-defined, typically the top tier) should route through Workflow 2 (Application Review) before receiving a payment link. Link the application form to those specific product tiers via `product_form` objectLink.

### 7. Missing objectLinks Between Products and Forms

**Problem:** Products and forms are created but not linked via `objectLinks`. The `product_form` link is missing.

**Impact:** Workflow triggers cannot resolve which form belongs to which product. Application review workflow does not know which tier the applicant is applying for.

**Fix:** After creating products and forms, always create `objectLinks` with `linkType: "product_form"` connecting each exclusive-tier product to the application form.

---

## 10. Example Deployment

### Scenario

A marketing agency sets up a membership community for a business coaching firm called "Apex Growth Co." They offer three tiers:

- **Starter** ($49/mo) -- weekly group coaching calls, resource library, community forum
- **Growth** ($149/mo) -- everything in Starter + bi-weekly 1:1 coaching sessions, priority support
- **Inner Circle** ($499/mo, application required) -- everything in Growth + monthly mastermind retreats, direct Slack access to coach, annual strategy session

### Step 1: Create Products

Three `createProduct` calls:

```
createProduct({
  sessionId: "{{sessionId}}",
  organizationId: "{{orgId}}",
  name: "Apex Growth -- Starter Membership",
  subtype: "digital",
  price: 4900,
  currency: "USD",
  description: "Weekly group coaching calls, full resource library access, community forum membership.",
  customProperties: {
    productCode: "APEX-STARTER-MO",
    inventory: -1,
    sold: 0,
    taxBehavior: "exclusive",
    maxQuantity: 1,
    invoiceConfig: { recurringInterval: "monthly", trialPeriodDays: 7 }
  }
})
// -> productId: "prod_starter"

createProduct({
  sessionId: "{{sessionId}}",
  organizationId: "{{orgId}}",
  name: "Apex Growth -- Growth Membership",
  subtype: "digital",
  price: 14900,
  currency: "USD",
  description: "Everything in Starter plus bi-weekly 1:1 coaching, priority support queue.",
  customProperties: {
    productCode: "APEX-GROWTH-MO",
    inventory: -1,
    sold: 0,
    taxBehavior: "exclusive",
    maxQuantity: 1,
    invoiceConfig: { recurringInterval: "monthly", trialPeriodDays: 7 }
  }
})
// -> productId: "prod_growth"

createProduct({
  sessionId: "{{sessionId}}",
  organizationId: "{{orgId}}",
  name: "Apex Growth -- Inner Circle",
  subtype: "digital",
  price: 49900,
  currency: "USD",
  description: "Full access: mastermind retreats, direct Slack channel, annual strategy session, plus all Growth benefits.",
  customProperties: {
    productCode: "APEX-INNERCIRCLE-MO",
    inventory: -1,
    sold: 0,
    taxBehavior: "exclusive",
    maxQuantity: 1,
    invoiceConfig: { recurringInterval: "monthly", trialPeriodDays: 0 }
  }
})
// -> productId: "prod_innercircle"
```

Then publish all three:

```
publishProduct({ sessionId: "{{sessionId}}", productId: "prod_starter" })
publishProduct({ sessionId: "{{sessionId}}", productId: "prod_growth" })
publishProduct({ sessionId: "{{sessionId}}", productId: "prod_innercircle" })
```

### Step 2: Create Application Form

One form for Inner Circle applications:

```
createForm({
  sessionId: "{{sessionId}}",
  organizationId: "{{orgId}}",
  name: "Apex Growth Inner Circle Application",
  description: "Application for the Inner Circle mastermind membership.",
  fields: [
    { type: "section_header", label: "Your Information", required: false },
    { type: "text", label: "Full Name", required: true, placeholder: "First and Last Name" },
    { type: "email", label: "Email Address", required: true },
    { type: "phone", label: "Phone Number", required: true },
    { type: "text", label: "Company Name", required: true },
    { type: "text", label: "Website URL", required: false, placeholder: "https://" },
    { type: "section_header", label: "About Your Business", required: false },
    { type: "select", label: "Annual Revenue Range", required: true, options: ["Under $100K", "$100K-$500K", "$500K-$1M", "$1M-$5M", "$5M+"] },
    { type: "number", label: "Team Size", required: true, placeholder: "Number of employees" },
    { type: "textarea", label: "Describe your business in 2-3 sentences", required: true },
    { type: "section_header", label: "Membership Goals", required: false },
    { type: "textarea", label: "What specific outcome do you want from the Inner Circle in the next 12 months?", required: true },
    { type: "textarea", label: "What is your biggest business challenge right now?", required: true },
    { type: "select", label: "How did you hear about Apex Growth?", required: true, options: ["Current Member Referral", "Social Media", "Podcast", "Google Search", "Event", "Other"] },
    { type: "checkbox", label: "I understand the Inner Circle is $499/month and requires a 6-month commitment", required: true }
  ],
  formSettings: {
    redirectUrl: "/inner-circle-thank-you",
    notifications: { adminEmail: true, applicantConfirmation: true },
    submissionBehavior: "redirect"
  }
})
// -> formId: "form_innercircle_app"

publishForm({ sessionId: "{{sessionId}}", formId: "form_innercircle_app" })
```

### Step 3: Create Checkout Configurations

For Starter and Growth (direct checkout, no application):

```
// Checkout handled via lc_checkout node in Workflow 1 with config:
{
  paymentProvider: "stripe",
  mode: "subscription",
  recurringInterval: "monthly",
  trialPeriodDays: 7
}
```

For Inner Circle, checkout link is sent only after application approval (Workflow 2, email_approved node).

### Step 4: Create CRM Pipeline

```
// Pipeline: "Membership: Apex Growth"
// Stages created in order:
// 1. prospect
// 2. applicant
// 3. trial
// 4. active_member
// 5. at_risk
// 6. churned
// 7. reactivated
// 8. lifetime
```

### Step 5: Create Workflows

**Workflow 1 -- New Member Signup** (as defined in Section 4, Workflow 1):

```
createWorkflow({ sessionId: "{{sessionId}}", name: "Apex: New Member Signup", description: "Processes new membership payments, creates CRM contact, sends welcome email, syncs to ActiveCampaign." })
// -> workflowId: "wf_new_member"

saveWorkflow({
  sessionId: "{{sessionId}}",
  workflowId: "wf_new_member",
  name: "Apex: New Member Signup",
  nodes: [ /* all nodes from Workflow 1 definition */ ],
  edges: [ /* all edges from Workflow 1 definition */ ],
  triggers: [{ type: "trigger_payment_received", config: { paymentProvider: "stripe" } }]
})

updateWorkflowStatus({ sessionId: "{{sessionId}}", workflowId: "wf_new_member", status: "active" })
```

**Workflow 2 -- Application Review** (as defined in Section 4, Workflow 2):

```
createWorkflow({ sessionId: "{{sessionId}}", name: "Apex: Inner Circle Application Review", description: "Reviews Inner Circle applications using AI scoring, approves or waitlists." })
// -> workflowId: "wf_app_review"

saveWorkflow({
  sessionId: "{{sessionId}}",
  workflowId: "wf_app_review",
  name: "Apex: Inner Circle Application Review",
  nodes: [ /* all nodes from Workflow 2 definition, with formId: "form_innercircle_app" */ ],
  edges: [ /* all edges from Workflow 2 definition */ ],
  triggers: [{ type: "trigger_form_submitted", config: { formId: "form_innercircle_app" } }]
})

updateWorkflowStatus({ sessionId: "{{sessionId}}", workflowId: "wf_app_review", status: "active" })
```

**Workflow 3 -- Renewal Processing** (as defined in Section 4, Workflow 3):

```
createWorkflow({ sessionId: "{{sessionId}}", name: "Apex: Renewal Processing", description: "Handles recurring payments, updates CRM, generates invoices." })
// -> workflowId: "wf_renewal"

saveWorkflow({ /* nodes and edges from Workflow 3 */ })
updateWorkflowStatus({ sessionId: "{{sessionId}}", workflowId: "wf_renewal", status: "active" })
```

**Workflow 4 -- Churn Prevention** (as defined in Section 4, Workflow 4):

```
createWorkflow({ sessionId: "{{sessionId}}", name: "Apex: Churn Prevention", description: "Detects at-risk members and runs re-engagement sequence." })
// -> workflowId: "wf_churn"

saveWorkflow({ /* nodes and edges from Workflow 4 */ })
updateWorkflowStatus({ sessionId: "{{sessionId}}", workflowId: "wf_churn", status: "active" })
```

**Workflow 5 -- Cancellation** (as defined in Section 4, Workflow 5):

```
createWorkflow({ sessionId: "{{sessionId}}", name: "Apex: Cancellation Processing", description: "Processes Stripe cancellations, updates CRM, triggers win-back." })
// -> workflowId: "wf_cancel"

saveWorkflow({ /* nodes and edges from Workflow 5 */ })
updateWorkflowStatus({ sessionId: "{{sessionId}}", workflowId: "wf_cancel", status: "active" })
```

### Step 6: Create Sequences

**Onboarding Sequence (per Framework 7):**

```
// Type: automation_sequence, subtype: lifecycle
// Trigger: contact_tagged, tag: "onboarding"
// Create 3 variants: one per tier (starter, growth, inner_circle)

// STARTER onboarding steps:
Step 1 - Immediate (email):
  Subject: "Welcome to Apex Growth Starter -- Let's Get You Started"
  Body: Login credentials, community forum link, this week's group call schedule, resource library tour link

Step 2 - +1 day (email):
  Subject: "Your First Quick Win: Join This Week's Group Call"
  Body: Calendar link for next group call, what to expect, how to prepare one question

Step 3 - +3 days (email):
  Subject: "Did You Know? The Resource Library Has 200+ Templates"
  Body: Spotlight the resource library, direct link to most popular template, how other Starter members use it

Step 4 - +5 days (email + sms):
  Email Subject: "How's Your First Week Going?"
  Email Body: Check-in, link to support, FAQ link, community forum help thread
  SMS: "Hey {{firstName}}! How's Apex Growth going? Reply with any questions or check support: {{supportLink}}"

Step 5 - +7 days (email):
  Subject: "Sarah Doubled Her Leads in Week 1 -- Here's How"
  Body: Member success story (Starter tier), specific actions they took, results achieved

Step 6 - +14 days (email):
  Subject: "Unlock More Value: Advanced Group Call Strategies"
  Body: Tips for getting more from group calls, how to network in the community, power-user features

Step 7 - +30 days (email):
  Subject: "Your First Month at Apex Growth -- What's Next?"
  Body: Recap of resources used, engagement stats, feedback survey link, Growth tier upgrade pitch with benefits comparison

// GROWTH onboarding: same timing, different content emphasizing 1:1 sessions
// INNER CIRCLE onboarding: same timing, content focuses on mastermind prep, Slack channel intro, strategy session scheduling
```

**Retention Sequence (custom):**

```
// Type: automation_sequence, subtype: custom
// Trigger: pipeline_stage_changed (to active_member), starts after onboarding completes

Step 1 - +45 days from signup (email):
  Subject: "Your Monthly Apex Growth Digest"
  Body: Top resources added this month, upcoming events, member spotlight

Step 2 - +90 days / Quarterly (email):
  Subject: "Your Apex Growth Anniversary -- 3 Months!"
  Body: Progress recap, usage stats, personalized recommendation, referral program invite

Step 3 - Renewal -7 days (email):
  Subject: "Your Membership Renews Next Week"
  Body: Renewal date, amount, what's coming next month, how to update payment method

Step 4 - Renewal -1 day (email):
  Subject: "Renewing Tomorrow -- Here's What's Ahead"
  Body: Preview of next month's content, upcoming events, confirm renewal
```

**Re-Engagement Sequence (per Framework 8):**

```
// Type: automation_sequence, subtype: custom
// Trigger: contact_tagged, tag: "at_risk"

Step 1 - Day 1 (email):
  Subject: "We've Missed You at Apex Growth"
  Body: Acknowledge absence, highlight 3 new things added since last login, direct link to most relevant resource

Step 2 - Day 3 (email):
  Subject: "Here's What You're Missing as a {{tierName}} Member"
  Body: Recap of key benefits for their specific tier, upcoming events they could attend, member wins from this week

Step 3 - Day 5 (email):
  Subject: "A Special Offer -- Just for You"
  Body: Discount on next renewal (e.g., 20% off next month), or free upgrade trial to next tier for 14 days

Step 4 - Day 7 (email):
  Subject: "Mark Just Closed a $50K Deal Using What He Learned Here"
  Body: Recent member achievement story, what they did, how the membership helped, CTA to log back in

Step 5 - Day 10 (email + sms):
  Email Subject: "We're About to Pause Your Membership Access"
  Email Body: Warning that continued inactivity may result in paused access, direct link to log in, support contact
  SMS: "{{firstName}}, your Apex Growth access may be paused soon. Log in to keep it active: {{loginLink}}"

Step 6 - Day 14 (email):
  Subject: "Your Apex Growth Membership Has Been Paused"
  Body: Access paused due to inactivity, how to reactivate (one-click link), what they'll get back, support contact for questions
```

### Step 7: Link Objects

```
// Product -> Form (Inner Circle requires application)
objectLinks.create({
  sourceObjectId: "prod_innercircle",
  targetObjectId: "form_innercircle_app",
  linkType: "product_form",
  properties: { requiresApproval: true }
})

// Checkout -> Products
objectLinks.create({
  sourceObjectId: "checkout_starter",
  targetObjectId: "prod_starter",
  linkType: "checkout_product"
})
objectLinks.create({
  sourceObjectId: "checkout_growth",
  targetObjectId: "prod_growth",
  linkType: "checkout_product"
})
objectLinks.create({
  sourceObjectId: "checkout_innercircle",
  targetObjectId: "prod_innercircle",
  linkType: "checkout_product"
})

// Workflow -> Form
objectLinks.create({
  sourceObjectId: "wf_app_review",
  targetObjectId: "form_innercircle_app",
  linkType: "workflow_form"
})

// Workflow -> Sequences
objectLinks.create({
  sourceObjectId: "wf_new_member",
  targetObjectId: "seq_onboarding_starter",
  linkType: "workflow_sequence"
})
objectLinks.create({
  sourceObjectId: "wf_new_member",
  targetObjectId: "seq_onboarding_growth",
  linkType: "workflow_sequence"
})
objectLinks.create({
  sourceObjectId: "wf_new_member",
  targetObjectId: "seq_onboarding_innercircle",
  linkType: "workflow_sequence"
})
objectLinks.create({
  sourceObjectId: "wf_churn",
  targetObjectId: "seq_reengagement",
  linkType: "workflow_sequence"
})
```

### End-to-End Member Journey: "Alex joins Starter"

1. Alex visits the Apex Growth membership landing page, reads tier comparison, clicks "Start 7-Day Free Trial" on Starter tier.
2. Redirected to Stripe Checkout in subscription mode. Enters card. Stripe creates subscription with 7-day trial.
3. `trigger_payment_received` fires. **Workflow 1** executes:
   - `lc_crm` creates contact: Alex, tags `["member", "tier_starter", "onboarding"]`, stage `active_member`, customFields `{ memberSince: now, currentTier: "starter", renewalDate: +7d }`.
   - `lc_email` sends welcome email with community forum link, group call calendar, resource library login.
   - `activecampaign`: adds contact, tags `member_starter`, starts `member_onboarding` automation.
4. **Onboarding Sequence** begins:
   - Immediate: welcome email (already sent by workflow).
   - +1 day: "Join this week's group call" email.
   - +3 days: Resource library spotlight email.
   - +5 days: "How's it going?" email + SMS.
   - +7 days: Member success story email. Trial ends, first real charge.
   - **Workflow 3** fires: CRM updated with `renewed` tag, invoice generated (b2c_single), confirmation email sent.
   - +14 days: Advanced tips email.
   - +30 days: First month review + Growth tier upsell email.
5. Alex stays active for 3 months. **Retention Sequence** fires monthly digest, quarterly anniversary, and renewal reminders.
6. Month 4: Alex stops logging in. After 30 days of inactivity, a scheduled detection workflow tags Alex as `"at_risk"`, moves pipeline to `at_risk`.
7. `trigger_contact_updated` fires. **Workflow 4** executes:
   - Checks `at_risk` tag: true.
   - Sends re-engagement email.
   - Waits 3 days. Still at-risk. Sends 20% discount offer.
   - Waits 5 days. Sends exit survey.
8. **Re-Engagement Sequence** also runs in parallel:
   - Day 1: "We miss you" email.
   - Day 3: Benefits reminder.
   - Day 5: Special offer.
   - Day 7: Social proof.
   - Day 10: "About to pause access" email + SMS.
   - Day 14: "Account paused" email.
9. Scenario A -- Alex re-engages: logs back in on Day 6, `at_risk` tag removed, pipeline moves back to `active_member`, sequences stop.
10. Scenario B -- Alex cancels: clicks cancel in Stripe portal. `trigger_webhook` (path: `/stripe-cancel`) fires. **Workflow 5** executes:
    - CRM: move to `churned`, tags `["cancelled"]`, remove `["active", "member"]`.
    - Cancellation confirmation email with exit survey link.
    - ActiveCampaign: tag `churned`, start `win_back` automation.
    - 30 days later, `win_back` automation sends "Come back" offer. Alex rejoins at Growth tier. Pipeline moves to `reactivated`, then to `active_member` after 30 days. New onboarding sequence (Growth variant) begins.
