---
system: l4yercak3
category: core
usage: SETUP_MODE
triggers: client_onboarding, knowledge_base_setup
priority: 5
---

# Knowledge Base Structure Guide

Use this when helping an agency owner organize their client's knowledge base. The knowledge base is a collection of markdown documents stored in the organization's media library that the customer-facing agent reads to understand its role, context, and capabilities.

## The Knowledge Base Folder Structure

Each client should have a folder in the media library with these documents:

```
[Client Name]/
  01-hero-profile.md        ← Who is the customer (`Business L4` hero)
  02-guide-profile.md       ← Brand voice, empathy, authority
  03-plan-and-cta.md        ← Process plan, promises, CTAs
  04-products-services.md   ← What the client offers (details, pricing)
  05-faq.md                 ← Common questions and answers
  06-objection-handling.md  ← Common objections and how to handle them
  07-business-info.md       ← Hours, location, service area, contact
  08-success-stories.md     ← Testimonials, case studies, results
```

## Document Descriptions

### 01 - Hero Profile
Generated using the Hero Definition framework. Contains:
- Who the customer is (demographics, psychographics)
- Their three-level problem (external, internal, philosophical)
- The villain they fight
- The transformation they want
- How they search for help

### 02 - Guide Profile
Generated using the Guide Positioning framework. Contains:
- One-liner
- Brand voice and tone
- Empathy statements
- Authority markers
- Testimonial snippets

### 03 - Plan and CTA
Generated using the Plan and CTA framework. Contains:
- Process plan (3-4 steps)
- Agreement plan (promises)
- Direct CTA
- Transitional CTA

### 04 - Products and Services
Created collaboratively with the agency owner. Contains:
- Each product/service with description
- Pricing (or price ranges)
- What's included
- What's NOT included
- Upsells or add-ons
- Seasonal or promotional offers

### 05 - FAQ
Common questions the hero might ask. Structure:
```markdown
## Q: [Question in the hero's words]
A: [Answer in the guide's voice]
```

Build this from:
- Real questions the client gets asked
- Questions found during ICP research
- "Google autocomplete" questions for the industry

### 06 - Objection Handling
Common reasons the hero doesn't buy, and how the guide addresses them:
```markdown
## Objection: "[What the hero says]"
### Why they say this:
[The real fear behind the objection]
### How to respond:
[The guide's response — empathetic, then authoritative]
```

Common objections:
- "It's too expensive"
- "I need to think about it"
- "I'll do it myself"
- "I'm not sure you're the right fit"
- "I had a bad experience with [competitor/industry]"

### 07 - Business Info
Factual information the agent needs:
- Business hours
- Location(s) and service area
- Phone number, email, website
- Booking link (if applicable)
- Payment methods accepted
- Emergency/after-hours policy

### 08 - Success Stories
Social proof the agent can reference:
```markdown
## [Customer Name/Type]
- **Problem:** [What they came in with]
- **Solution:** [What the client did]
- **Result:** [The outcome]
- **Quote:** "[Testimonial in their words]"
```

## How the Agent Uses the Knowledge Base

In **customer mode** (`Business L4` interaction context), the agent:
1. Reads ALL documents in the client's KB folder
2. Speaks in the voice defined in the Guide Profile
3. Answers questions using Products/Services, FAQ, and Business Info
4. Handles objections using the Objection Handling document
5. Drives toward the CTA defined in the Plan and CTA document
6. References success stories when building trust
7. Never makes up information not in the KB — if it doesn't know, it escalates

## Building the KB Collaboratively

The agency owner doesn't need to write these from scratch. The setup agent:
1. Asks questions based on each framework
2. Generates draft documents from the answers
3. Saves them to the media library
4. The agency owner reviews and refines
5. The agent re-reads updated documents on next conversation

This is an iterative process. The KB improves over time as the agency owner adds real customer questions, objections, and success stories.

## Quality Checklist

Before deploying a customer-facing agent, verify the KB has:
- [ ] Hero profile with specific demographics and problems
- [ ] Guide profile with clear brand voice
- [ ] At least one process plan with 3-4 steps
- [ ] Products/services with pricing
- [ ] At least 10 FAQs
- [ ] At least 5 objection handlers
- [ ] Complete business info (hours, location, contact)
- [ ] At least 2 success stories
