# Phase 5: White-Label & Scale

> Agencies brand the entire experience as their own. Prompt-generated onboarding flows mean agencies never start from scratch. The marketplace makes templates shareable.

**Depends on:** Phase 1-4

---

## Goals

- Full white-label branding for client-facing experience
- AI-generated interview templates from natural language descriptions
- Template marketplace for agencies to share/sell onboarding flows
- Analytics and reporting for agency ROI tracking
- Multi-language support for international agencies

---

## 5.1 White-Label Branding

### What Gets Branded

| Element | Source | Where Applied |
|---|---|---|
| Logo | Agency org settings | Client shell header, emails, mobile app |
| Primary color | Agency org settings | Buttons, progress bars, accents |
| Secondary color | Agency org settings | Backgrounds, cards |
| Favicon | Agency org settings | Browser tab (web) |
| App name | Agency org settings | Page titles, email subjects |
| Custom domain | Agency DNS + Vercel | `onboard.agencyname.com` |
| Email sender | Agency Resend config | `hello@agencyname.com` |
| Support email | Agency org settings | Footer, error pages |

### Branding Configuration

```typescript
// Extension to organization customProperties
interface AgencyBranding {
  brandName: string;                       // "AgencyX" (shown to clients)
  logoUrl: string;                         // uploaded to media library
  logoLightUrl?: string;                   // for dark backgrounds
  primaryColor: string;                    // hex, e.g., "#4F46E5"
  secondaryColor: string;
  accentColor?: string;
  customDomain?: string;                   // "onboard.agencyname.com"
  supportEmail?: string;
  customCss?: string;                      // advanced: CSS overrides
  hideLayerCakeBranding: boolean;          // requires Professional+ tier
  customTermsUrl?: string;
  customPrivacyUrl?: string;
}
```

### Implementation Tasks

- [ ] Create `AgencyBrandingSettings` component:
  - [ ] Logo upload (light + dark variants)
  - [ ] Color picker (primary, secondary, accent)
  - [ ] Brand name input
  - [ ] Custom domain configuration
  - [ ] Live preview of client experience with branding applied
- [ ] Create `useBranding` hook:
  - [ ] Loads parent org's branding settings
  - [ ] Returns CSS variables + logo URLs
  - [ ] Falls back to platform defaults
- [ ] Apply branding to all client-facing surfaces:
  - [ ] Client shell (header, colors)
  - [ ] Signup page (`/onboard/{token}`)
  - [ ] Email templates
  - [ ] Mobile app header
  - [ ] Push notification icon (if supported)
- [ ] Custom domain setup:
  - [ ] DNS verification flow (CNAME record)
  - [ ] Vercel custom domain API integration
  - [ ] SSL auto-provisioning
  - [ ] Tier gate: Agency+ required
- [ ] White-label tier enforcement:
  - [ ] Free/Starter: Platform branding shown
  - [ ] Professional: Badge removal
  - [ ] Agency: Full white-label
  - [ ] Enterprise: Custom API domain

---

## 5.2 Prompt-Generated Interview Templates

### The Multiplier

Instead of manually designing interview templates question by question, agencies describe their client type in natural language and the AI generates the entire template.

### Flow

```
Agency opens "Create Interview Template"
    ↓
"Describe your client type and what you need to learn:"
    ↓
Agency types: "Real estate agents who need LinkedIn content.
              I need to understand their market, specialization,
              client success stories, and personal brand."
    ↓
AI generates full InterviewTemplate:
  - 4 phases (Market & Specialization, Client Stories, Personal Brand, Content Strategy)
  - 15-20 questions with follow-ups
  - Skip conditions (e.g., skip "Client Stories" if agent is new)
  - Output schema mapped to Content DNA fields
  - Estimated time: 25 min
    ↓
Agency reviews in Template Designer
  - Edit/add/remove questions
  - Adjust ordering
  - Modify follow-up prompts
    ↓
[Activate] → Template ready for use with clients
```

### Generation Prompt

```
You are designing an AI-powered interview template for a content marketing platform.

The agency described their client as:
"{agencyDescription}"

Generate a complete interview template with:
1. 3-6 phases, ordered from general to specific
2. 3-5 questions per phase
3. Follow-up prompts for brief answers
4. Skip conditions where phases may not apply
5. Output schema fields categorized as: voice, expertise, audience, content_prefs, brand, goals
6. Estimated time per phase

Output format: JSON matching the InterviewTemplate schema.

Guidelines:
- Questions should feel conversational, not clinical
- Include at least one storytelling question per phase ("Tell me about a time...")
- Include at least one opinion question ("What do you think about...")
- Avoid yes/no questions
- Follow-ups should probe for specificity and emotion
```

### Implementation Tasks

- [ ] Create `generateInterviewTemplate` action:
  - [ ] Takes agency description as input
  - [ ] Calls LLM with template generation prompt
  - [ ] Parses and validates output against InterviewTemplate schema
  - [ ] Returns generated template for review
  - [ ] Credit cost: 3 credits (complex generation)
- [ ] Add "Generate with AI" button to Template Designer:
  - [ ] Text area for client type description
  - [ ] "Generate" button → loading state → populated designer
  - [ ] All fields editable after generation
- [ ] Create template refinement prompt:
  - [ ] "Make questions more specific to {industry}"
  - [ ] "Add a phase about {topic}"
  - [ ] "Shorten to 15 minutes"
  - [ ] "Make it friendlier / more professional"
- [ ] Create industry-specific generation presets:
  - [ ] Real estate agents
  - [ ] SaaS founders
  - [ ] E-commerce brands
  - [ ] Coaches / consultants
  - [ ] Local businesses
  - [ ] Personal brands

---

## 5.3 Template Marketplace

### Concept

Agencies can share their interview templates with other agencies. Templates can be free or paid (credit-gated).

### Marketplace Schema

```typescript
// type="marketplace_listing" in objects table
interface MarketplaceListing {
  templateId: Id<"objects">;               // source interview_template
  creatorOrgId: Id<"organizations">;
  listingName: string;
  description: string;
  industry: string;
  tags: string[];
  previewQuestions: string[];              // 3-5 sample questions shown in listing
  stats: {
    installs: number;
    rating: number;                        // 1-5 stars
    reviews: number;
  };
  pricing: {
    type: "free" | "credits";
    creditCost?: number;                   // one-time cost to clone
  };
  status: "pending_review" | "approved" | "rejected" | "archived";
}
```

### Implementation Tasks

- [ ] Create marketplace ontology:
  - [ ] `publishTemplate(templateId, name, description, pricing)`
  - [ ] `listMarketplaceTemplates(industry?, tags?, sort?)`
  - [ ] `getListingDetails(listingId)`
  - [ ] `installTemplate(listingId)` — clones to agency's org
  - [ ] `rateTemplate(listingId, rating, review?)`
- [ ] Create marketplace UI:
  - [ ] Browse view with filters (industry, rating, price)
  - [ ] Template preview card (name, description, sample questions, stats)
  - [ ] "Install" button (clones template to org)
  - [ ] Rating/review system
- [ ] Moderation:
  - [ ] Templates submitted for review before listing
  - [ ] Super-admin approval workflow
  - [ ] Report/flag functionality
- [ ] Revenue sharing (future):
  - [ ] Track credit purchases for paid templates
  - [ ] Creator dashboard with install/revenue stats

---

## 5.4 Analytics & Reporting

### Agency Dashboard Metrics

```
┌─────────────────────────────────────────────┐
│ Onboarding Analytics                         │
├─────────────────────────────────────────────┤
│                                             │
│ ┌─ Overview ──────────────────────────────┐ │
│ │ Active Clients: 12                      │ │
│ │ Interviews Completed: 10/12 (83%)       │ │
│ │ Avg Interview Duration: 22 min          │ │
│ │ Content Generated: 156 posts            │ │
│ │ Approval Rate: 78%                      │ │
│ │ Twin Maturity (avg): 67%                │ │
│ │ Credits Used This Month: 1,240          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ Per Client ────────────────────────────┐ │
│ │ Client    │ Status │ Posts │ Approval   │ │
│ │ Bakery A  │ Active │  42  │    92%     │ │
│ │ TechStart │ Active │  28  │    71%     │ │
│ │ FitGym    │ New    │   3  │    67%     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ Credit Usage ──────────────────────────┐ │
│ │ [Bar chart: credits per client]         │ │
│ │ [Line chart: credits over time]         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

### Implementation Tasks

- [ ] Create `onboardingAnalytics` query:
  - [ ] Aggregate across sub-orgs: interview completion rate, avg duration
  - [ ] Content stats: generated, approved, rejected, published
  - [ ] Credit consumption breakdown (per client, per action type)
  - [ ] Twin maturity score (signal count / threshold)
- [ ] Create `AnalyticsDashboard` component:
  - [ ] Overview cards (KPIs)
  - [ ] Per-client table with sortable columns
  - [ ] Credit usage charts (bar + line)
  - [ ] Export to CSV
- [ ] Create client-facing analytics (simple):
  - [ ] "Your content this month: X posts, Y platforms"
  - [ ] Engagement data (future: when platform APIs connected)

---

## 5.5 Multi-Language Support

### Concept

Agencies serve international clients. Interviews, content generation, and the client UI should support multiple languages.

### Language Flow

```
Interview Template: language = "de" (German)
    ↓
Agent asks questions in German
    ↓
Client answers in German (voice transcription supports 98+ languages)
    ↓
Content DNA stored in German
    ↓
Content generated in German (per platform)
    ↓
Client UI rendered in their language preference
```

### Implementation Tasks

- [ ] Add `language` field to interview templates (already in Phase 1 schema)
- [ ] Add `uiLanguage` preference to client profile:
  - [ ] Auto-detect from browser/device
  - [ ] Override in profile settings
- [ ] Create i18n string table for client UI:
  - [ ] English (default)
  - [ ] German
  - [ ] French
  - [ ] Spanish
  - [ ] Additional languages on demand
- [ ] Ensure Whisper transcription passes language hint:
  - [ ] From interview template language setting
  - [ ] Improves accuracy for non-English
- [ ] Content generation respects target language:
  - [ ] Platform-specific language (e.g., LinkedIn post in German)
  - [ ] Hashtag suggestions in correct language

---

## 5.6 Onboarding Skill for Layers

### Auto-Wiring via AI Composition

Add an "Onboarding" skill to the existing skill registry that agencies can invoke from Builder or Layers:

```typescript
// New skill in skills/index.ts
{
  skillId: "create_onboarding_flow",
  name: "Create Client Onboarding Flow",
  description: "Sets up a complete interview → content pipeline for a new client type",
  creditCost: 5,
  steps: [
    "Generate interview template from description",
    "Create content calendar trigger workflow",
    "Configure draft generation settings",
    "Set up client notification sequence",
    "Wire review → twin learning feedback loop"
  ],
  toolChain: [
    "generateInterviewTemplate",
    "create_layers_workflow",
    "create_sequence",
    "link_objects"
  ]
}
```

### Implementation Tasks

- [ ] Add `create_onboarding_flow` skill to skill registry
- [ ] Create skill knowledge document (`SKILL_ONBOARDING.md`):
  - [ ] Describes the full onboarding pipeline
  - [ ] Maps steps to tools and ontology types
  - [ ] Includes example prompts for different industries
- [ ] Wire skill triggers in Builder AI chat:
  - [ ] Detect intent: "set up onboarding for {client type}"
  - [ ] Load onboarding skill + knowledge
  - [ ] Execute tool chain with confirmation

---

## Success Criteria

- [ ] Agency branding applied to all client-facing surfaces
- [ ] Custom domain works with SSL for Agency+ tiers
- [ ] AI can generate a complete interview template from a natural language description
- [ ] Generated templates are editable in the Template Designer
- [ ] Template marketplace allows browsing, installing, and rating templates
- [ ] Analytics dashboard shows onboarding and content metrics per client
- [ ] Multi-language interviews and content generation work correctly
- [ ] "Create Onboarding Flow" skill automates the full setup from Builder/Layers
- [ ] White-label tier enforcement works correctly per licensing level

---

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `src/components/agency/branding-settings.tsx` | **Create** | Branding configuration UI |
| `src/hooks/useBranding.ts` | **Create** | Branding context hook |
| `convex/ai/generateInterviewTemplate.ts` | **Create** | AI template generation |
| `convex/marketplaceOntology.ts` | **Create** | Template marketplace CRUD |
| `src/components/marketplace/marketplace-browser.tsx` | **Create** | Marketplace browse UI |
| `src/components/marketplace/template-card.tsx` | **Create** | Listing preview card |
| `src/components/agency/analytics-dashboard.tsx` | **Create** | Onboarding analytics |
| `convex/analytics/onboardingAnalytics.ts` | **Create** | Analytics aggregation queries |
| `src/i18n/` | **Create** | Internationalization strings |
| `convex/ai/skills/SKILL_ONBOARDING.md` | **Create** | Onboarding skill knowledge |
| `convex/ai/skills/index.ts` | **Modify** | Register onboarding skill |
| `convex/licensing/tierConfigs.ts` | **Modify** | White-label tier enforcement |
