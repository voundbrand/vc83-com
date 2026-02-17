# Boundaries and Capabilities

## System Boundaries

| ID | Boundary | Primary anchors |
|---|---|---|
| B1 | Experience Layer | `src/app`, `src/components`, `src/contexts`, `src/hooks` |
| B2 | API Surface Layer | `src/app/api`, `convex/http.ts`, `convex/api/v1` |
| B3 | Core Domain Backend | `convex/*.ts` (ontology and domain modules) |
| B4 | AI Control Plane | `convex/ai`, `convex/agentOntology.ts`, `src/app/chat` |
| B5 | Identity and Security Plane | `convex/auth`, `convex/rbac*.ts`, `convex/security`, `convex/passkeys.ts`, `convex/compliance.ts` |
| B6 | Commerce and Billing Plane | `convex/checkout*`, `convex/transaction*`, `convex/invoicing*`, `convex/stripe*`, `convex/paymentProviders`, `convex/credits`, `convex/licensing` |
| B7 | Workflow and Automation Plane | `convex/workflows`, `convex/sequences`, `convex/zapier`, `convex/channels` |
| B8 | Content and Publishing Plane | `convex/template*`, `convex/pdf*`, `convex/publishing*`, `convex/pageBuilder.ts`, `src/templates` |
| B9 | Data and Platform Ops Plane | `convex/schema`, `convex/schemas`, `convex/migrations`, `convex/seed`, `convex/seeds`, `convex/translations` |
| B10 | Affiliate Subplatform | `services/affiliate/apps/*`, `services/affiliate/packages/*` |
| B11 | Delivery and Quality Plane | `tests`, `scripts`, `.github/workflows` |

## Capability Catalog

| ID | Capability | Primary boundaries |
|---|---|---|
| C1 | Organization and tenant lifecycle | B3, B5 |
| C2 | Identity and authentication | B2, B5 |
| C3 | Role and permission enforcement | B5 |
| C4 | API keys and external app access | B2, B5 |
| C5 | AI model policy and selection | B4 |
| C6 | AI tool execution and safety boundaries | B4, B7 |
| C7 | AI session memory and context handling | B4, B9 |
| C8 | Human approval and escalation controls | B4, B7 |
| C9 | CRM entities and pipeline management | B3 |
| C10 | Forms and data capture | B2, B3 |
| C11 | Events, tickets, and booking | B1, B3, B6 |
| C12 | Checkout session orchestration | B2, B6 |
| C13 | Transaction and tax handling | B6 |
| C14 | Invoicing and PDF generation | B6, B8 |
| C15 | Payment provider and Stripe integration | B2, B6 |
| C16 | Credits, licensing, and entitlements | B6 |
| C17 | Projects and collaboration artifacts | B1, B3 |
| C18 | Templates and content composition | B8 |
| C19 | Publishing and storefront delivery | B1, B8 |
| C20 | Media and file asset management | B1, B3, B8 |
| C21 | Workflow and sequence automation | B7 |
| C22 | Channel delivery and messaging adapters | B7 |
| C23 | Webhooks and third-party integrations | B2, B7 |
| C24 | Translation and localization layer | B1, B9 |
| C25 | Audit, compliance, and governance | B5, B9 |
| C26 | Observability, alerts, and runtime health | B9, B11 |
| C27 | Affiliate ecosystem runtime | B10 |

## Capability Coverage (Initial Full Pass)

| Capability ID | Covered by flow IDs |
|---|---|
| C1 | F7, F1 |
| C2 | F1, F13 |
| C3 | F1, F15 |
| C4 | F13 |
| C5 | F2 |
| C6 | F2, F15 |
| C7 | F2 |
| C8 | F2, F15 |
| C9 | F8 |
| C10 | F8 |
| C11 | F8, F3 |
| C12 | F3 |
| C13 | F3, F12 |
| C14 | F12 |
| C15 | F3, F14 |
| C16 | F14 |
| C17 | F9 |
| C18 | F10 |
| C19 | F11 |
| C20 | F9 |
| C21 | F4 |
| C22 | F5 |
| C23 | F5, F13 |
| C24 | F16 |
| C25 | F15 |
| C26 | F15, F2 |
| C27 | F6 |
