# Project Publishing Architecture

**Last Updated:** January 2026

This document explains the current project publishing system and what's needed to publish project pages to external domains.

---

## Current State: What's Wired Up

### 1. Project Public Pages (Working)

Projects can have a public page accessible at `/project/[slug]`:

**Route:** `src/app/project/[slug]/page.tsx`

**Flow:**
```
User visits /project/gerrit-sailing
        ↓
getProjectBySlug query (convex/projectOntology.ts)
        ↓
Find project where customProperties.publicPage.slug === "gerrit-sailing"
        ↓
If password protected → show PasswordProtection component
        ↓
If authenticated → render ProjectPageTemplate
        ↓
Template selector picks: simple | proposal | rikscha | gerrit
```

**Project customProperties.publicPage schema:**
```typescript
interface PublicPageConfig {
  enabled: boolean;
  slug: string;                    // URL slug (e.g., "gerrit-sailing")
  password?: string;               // Optional password protection
  title?: string;                  // Override project name
  description?: string;            // Override project description
  theme?: string;                  // purple | amber | blue | green | neutral
  template?: string;               // simple | proposal | rikscha | gerrit
  logoUrl?: string;                // Custom logo
  faviconUrl?: string;             // Custom favicon
  customCss?: string;              // Custom CSS injection
}
```

### 2. Template System (Working)

**Location:** `src/app/project/[slug]/templates/`

| Template | File | Purpose |
|----------|------|---------|
| `simple` | `SimpleTemplate.tsx` | Basic project overview |
| `proposal` | `ProposalTemplate.tsx` | Sales proposal template |
| `rikscha` | `RikschaTemplate.tsx` | Rikscha-specific template |
| `gerrit` | `GerritTemplate.tsx` | Gerrit's sailing school template |

**Template Features:**
- Editable content blocks via `EditModeProvider`
- Project drawer for meetings/interactions
- Language toggle support (de/en)
- Custom theming via config
- Responsive design

### 3. Project Ontology (Working)

**Location:** `convex/projectOntology.ts`

**Key queries/mutations:**
- `getProjectBySlug` - Public query, returns safe data only
- `verifyProjectPassword` - Password verification
- `updateProjectPublicPage` - Update public page config (auth required)

**Object Links supported:**
- `has_milestone` - Project → Milestones
- `has_task` - Project/Milestone → Tasks
- `has_comment` - Project → Comments
- `internal_team_member` - Project → Users
- `client_team_member` - Project → CRM Contacts

---

## What's Missing for External Domain Publishing

### Gap 1: Domain Routing

**Current:** Pages only accessible at `yourdomain.com/project/[slug]`

**Needed:** Pages accessible at `client-domain.com/` or `client-domain.com/[path]`

**Required Components:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Domain Router                             │
├─────────────────────────────────────────────────────────────┤
│  1. DNS Configuration                                        │
│     - CNAME record pointing to L4yercak3                    │
│     - SSL certificate provisioning (Let's Encrypt)          │
│                                                              │
│  2. Domain Config → Published Page Link                      │
│     - domain_config object with webPublishing.enabled       │
│     - Link: domain_config → published_page                   │
│                                                              │
│  3. HTTP Routing Layer                                       │
│     - Match Host header to domain_config                    │
│     - Resolve path to published_page                        │
│     - Serve appropriate template                            │
└─────────────────────────────────────────────────────────────┘
```

### Gap 2: Project → Published Page Connection

**Current:** Projects have inline `publicPage` config in `customProperties`

**Problem:** No link to the `published_page` system (used for events, checkouts, etc.)

**Solution Options:**

**Option A: Keep Inline (Simpler)**
- Extend `publicPage` config with external domain support
- Add `externalDomain` field to `PublicPageConfig`
- Routing layer reads from project.customProperties.publicPage

**Option B: Use Published Page System (Consistent)**
- Create `published_page` object linked to project
- Link type: `project → published_page` via `"publishes"`
- Unifies with event/checkout publishing

### Gap 3: CRM Integration on Templates

**Current:** Templates are static or use editable blocks stored locally

**Needed:** Templates connected to live CRM data

**Required:**
```typescript
// Template needs access to:
interface ProjectTemplateData {
  project: Project;
  client: CRMOrganization;         // Via clientOrgId link
  contacts: CRMContact[];          // Team members
  milestones: Milestone[];         // Project milestones
  invoices: Invoice[];             // Related invoices
  meetings: Meeting[];             // Scheduled meetings
}
```

**Current queries exist but not wired to templates:**
- `getProjectMilestones` - Returns milestones
- `getProjectTasks` - Returns tasks
- CRM contacts via `client_team_member` links

### Gap 4: Editable Content Storage

**Current:** `gerrit-editable-blocks.ts` defines editable regions
- Content stored in localStorage (client-side only)
- Not persisted to database

**Needed:** Server-side content storage

**Solution:**
```typescript
// Add to project.customProperties
editableContent: {
  [blockId: string]: {
    content: string;
    updatedAt: number;
    updatedBy: string;
  }
}

// Or use objectLinks
link: project → content_block (linkType: "has_content")
```

### Gap 5: Template Registry

**Current:** Hardcoded switch statement in `ProjectPageTemplate.tsx`

**Needed:** Dynamic template registry

```typescript
// Template registry
const TEMPLATES = {
  simple: {
    component: SimpleTemplate,
    name: "Simple Overview",
    description: "Basic project information",
    features: ["milestones", "team"],
  },
  proposal: {
    component: ProposalTemplate,
    name: "Sales Proposal",
    description: "Client-facing proposal",
    features: ["pricing", "timeline", "cta"],
  },
  // ... etc
};
```

---

## Architecture for Cohort (Non-Technical Users)

For the cohort use case (lead generation pages), here's what's needed:

### Simplified Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 Cohort User Flow                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User answers ICP questions                               │
│     → AI generates offer copy                                │
│     → System creates project with publicPage config         │
│                                                              │
│  2. User records video (external, paste URL)                 │
│                                                              │
│  3. System generates landing page                            │
│     → Uses "offer-page" template                             │
│     → Auto-populates from AI-generated content               │
│     → Connects WhatsApp/email via contact form              │
│                                                              │
│  4. User gets shareable link                                 │
│     → Option A: yourdomain.com/project/[slug]               │
│     → Option B: custom-domain.com (if configured)           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### New Template: Offer Page

```typescript
// src/app/project/[slug]/templates/OfferPageTemplate.tsx

interface OfferPageConfig {
  // Hero
  headline: string;
  subheadline: string;
  videoUrl?: string;

  // Offer
  offerTitle: string;
  offerDescription: string;
  price: string;
  priceNote?: string;

  // Benefits
  benefits: string[];

  // Social proof
  testimonials?: Testimonial[];

  // Contact
  contactChannels: {
    whatsapp?: string;
    email?: string;
    calendly?: string;
  };

  // Branding
  primaryColor: string;
  logoUrl?: string;
}
```

### Contact Form → Unified Messaging Hub

```
User fills contact form
        ↓
POST /api/v1/leads/capture
        ↓
Create CRM contact (if new)
        ↓
Create conversation in messaging hub
        ↓
Notify business owner (WhatsApp/email/push)
        ↓
AI agent can auto-respond
```

---

## Implementation Priority

### Phase 1: Make Current System Production-Ready

1. **Persist editable content to database**
   - Add `editableContent` to project.customProperties
   - Update save logic in EditModeProvider

2. **Wire templates to live project data**
   - Pass milestones, tasks, team to templates
   - Add queries for related CRM data

3. **Add "Offer Page" template**
   - Simple landing page for lead gen
   - Video embed, benefits list, contact CTA

### Phase 2: External Domain Publishing

1. **Domain verification system**
   - CNAME record validation
   - SSL certificate provisioning

2. **HTTP routing layer**
   - Next.js middleware or edge function
   - Map Host header → domain_config → published_page

3. **Link domain_config to projects**
   - domain_config.webPublishing.projectId
   - Or: objectLink domain_config → project

### Phase 3: AI-Powered Page Generation

1. **ICP questionnaire flow**
   - Collect niche, target audience, offer details

2. **AI copy generation**
   - Generate headline, benefits, CTA text
   - Store in project.customProperties.offerPage

3. **One-click page creation**
   - Create project + publicPage config
   - Generate unique slug
   - Return shareable URL

---

## File Locations Summary

**Current Project System:**
- `src/app/project/[slug]/page.tsx` - Main route
- `src/app/project/[slug]/ProjectPageTemplate.tsx` - Template selector
- `src/app/project/[slug]/templates/*.tsx` - Individual templates
- `convex/projectOntology.ts` - Backend queries/mutations

**Publishing System:**
- `convex/publishingOntology.ts` - Published page system
- `convex/domainConfigOntology.ts` - Domain configuration

**CRM Integration:**
- `convex/crmOntology.ts` - CRM queries
- `convex/crmIntegrations.ts` - CRM mutations

**Ontology Core:**
- `convex/schemas/ontologySchemas.ts` - objects, objectLinks, objectActions tables

---

## Quick Wins for Cohort

1. **Create `/project/[slug]` as the cohort landing page URL**
   - Already works, just needs "offer-page" template

2. **Add contact form that creates CRM lead**
   - POST to existing CRM endpoint
   - Trigger notification to owner

3. **Connect to email/WhatsApp via existing infrastructure**
   - Use ActiveCampaign for email
   - WhatsApp Business API integration

4. **Let AI customize template content**
   - Store in customProperties.offerContent
   - Template reads and renders

This gets cohort participants a working lead gen page without external domain complexity.
