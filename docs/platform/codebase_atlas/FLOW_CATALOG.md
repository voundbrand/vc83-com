# Flow Catalog

## Runtime Flows

| ID | Name | Entry points | Primary anchors | Current status |
|---|---|---|---|---|
| F1 | Identity and session lifecycle | `src/app/api/auth/*`, `src/app/api/passkeys/*`, `src/app/api/oauth/*` | `convex/auth.ts`, `convex/passkeys.ts`, `convex/portalAuth.ts`, `convex/rbac*.ts` | Active |
| F2 | AI conversation runtime | AI chat action + inbound channel pipeline | `convex/ai/chat.ts`, `convex/ai/agentExecution.ts`, `convex/ai/toolScoping.ts`, `convex/channels/router.ts` | Active |
| F3 | Checkout to fulfillment | `/api/v1/checkout/*` | `convex/api/v1/checkout.ts`, `convex/api/v1/checkoutInternal.ts`, `convex/checkoutSessions.ts`, `convex/createTransactionsFromCheckout.ts` | Active |
| F4 | Workflow trigger and behavior execution | `/api/v1/workflows/trigger`, form submission endpoints | `convex/api/v1/workflows.ts`, `convex/api/v1/workflowsInternal.ts`, `convex/workflows/behaviorExecutor.ts` | Active |
| F5 | External webhooks and channels | provider webhooks (`/stripe-webhooks`, `/telegram-webhook`, etc.) | `convex/http.ts`, `convex/stripeWebhooks.ts`, `convex/channels/webhooks.ts`, `convex/channels/router.ts` | Active |
| F6 | Affiliate event to reward pipeline | affiliate tracking API endpoints | `services/affiliate/apps/api/src/routes/v1/track/*`, `services/affiliate/apps/api/src/services/events.ts`, `services/affiliate/apps/api/src/services/reward-engine.ts` | Active |
| F7 | Organization onboarding and bootstrap | signup + onboarding completion paths | `convex/onboarding.ts`, `convex/onboarding/orgBootstrap.ts`, `convex/onboarding/completeOnboarding.ts` | Active |
| F8 | CRM, forms, events, and booking lifecycle | `/api/v1/crm/*`, `/api/v1/forms/*`, `/api/v1/events/*`, `/api/v1/bookings/*` | `convex/crmOntology.ts`, `convex/formsOntology.ts`, `convex/eventOntology.ts`, `convex/bookingOntology.ts` | Active |
| F9 | Projects, files, media, and collaboration | `/api/v1/projects/*`, finder/media/project UI | `convex/projectOntology.ts`, `convex/projectFileSystem.ts`, `convex/projectSharing.ts`, `convex/organizationMedia.ts` | Active |
| F10 | Template composition and resolution | template management + runtime resolution calls | `convex/templateOntology.ts`, `convex/templateSetOntology.ts`, `convex/templateSetResolver.ts` | Active |
| F11 | Builder, publishing, and deployment | builder UI + `/api/v1/publishing/*` | `convex/builderAppOntology.ts`, `convex/integrations/v0.ts`, `convex/integrations/github.ts`, `convex/integrations/vercel.ts`, `convex/publishingOntology.ts` | Active |
| F12 | Invoicing, PDF generation, and email delivery | `/api/v1/invoices/*` + checkout/invoice delivery hooks | `convex/invoicingOntology.ts`, `convex/pdfGeneration.ts`, `convex/ticketGeneration.ts`, `convex/emailDelivery.ts` | Active |
| F13 | OAuth, API keys, and integration authorization | OAuth endpoints + API auth middleware | `convex/oauth/authorize.ts`, `convex/oauth/tokens.ts`, `convex/oauth/endpoints.ts`, `convex/middleware/auth.ts` | Active |
| F14 | Credits, licensing, and AI billing | runtime credit deduction + Stripe AI checkout/webhooks | `convex/credits/index.ts`, `convex/licensing/helpers.ts`, `convex/ai/billing.ts`, `convex/stripe/aiCheckout.ts` | Active |
| F15 | Governance, audit, and runtime guards | auth/rate-limit/rbac/compliance guard paths | `convex/middleware/rateLimit.ts`, `convex/rbac.ts`, `convex/security/usageTracking.ts`, `convex/auditLogExport.ts`, `convex/compliance.ts` | Active |
| F16 | Translation and localization delivery | translation context/hooks + translation queries | `convex/ontologyTranslations.ts`, `convex/translationResolver.ts`, `src/contexts/translation-context.tsx` | Active |

## Flow Doc Paths

- `docs/platform/codebase_atlas/SYSTEM_LANDSCAPE.md`
- `docs/platform/codebase_atlas/flows/F1-identity-session.md`
- `docs/platform/codebase_atlas/flows/F2-ai-conversation-runtime.md`
- `docs/platform/codebase_atlas/flows/F3-checkout-fulfillment.md`
- `docs/platform/codebase_atlas/flows/F4-workflow-trigger-execution.md`
- `docs/platform/codebase_atlas/flows/F5-external-webhooks-and-channels.md`
- `docs/platform/codebase_atlas/flows/F6-affiliate-event-reward.md`
- `docs/platform/codebase_atlas/flows/F7-organization-onboarding-bootstrap.md`
- `docs/platform/codebase_atlas/flows/F8-crm-forms-events-lifecycle.md`
- `docs/platform/codebase_atlas/flows/F9-projects-files-media-collaboration.md`
- `docs/platform/codebase_atlas/flows/F10-template-composition-and-resolution.md`
- `docs/platform/codebase_atlas/flows/F11-builder-publishing-and-deployment.md`
- `docs/platform/codebase_atlas/flows/F12-invoicing-pdf-and-email-delivery.md`
- `docs/platform/codebase_atlas/flows/F13-oauth-api-keys-and-integrations.md`
- `docs/platform/codebase_atlas/flows/F14-credits-licensing-and-ai-billing.md`
- `docs/platform/codebase_atlas/flows/F15-governance-audit-and-runtime-guards.md`
- `docs/platform/codebase_atlas/flows/F16-translation-and-localization-delivery.md`
