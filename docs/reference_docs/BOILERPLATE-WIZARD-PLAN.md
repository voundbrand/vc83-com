# Boilerplate Wizard System - Implementation Plan

**Date**: 2025-01-27  
**Goal**: Create a transparent onboarding flow that shows users exactly what they're getting (boilerplates + templates) and allows customization before installation.

---

## 🎯 Vision

Users should see **exactly** what's being installed when they choose their ICP profile. The system should:
1. Show preselected boilerplates and template sets based on ICP choice
2. Allow users to customize/add more before installing
3. Check licensing limits and prompt for upgrade if needed
4. Collect payment before finalizing installation
5. Provide ongoing management in Settings

---

## 📊 Current State Analysis

### What Exists Now

#### 1. **Quick Start Flow** (`src/components/quick-start/`)
- **ICP Selector** (`quick-start-icp-selector.tsx`): Shows cards for AI Agency, Founder/Builder, Event Manager, etc.
- **ICP Definitions** (`icp-definitions.ts`): Defines what each ICP gets (apps, templates, features)
- **Backend** (`convex/manualOnboarding.ts`): Provisions apps and templates automatically
- **Problem**: Users don't see what's being installed until after confirmation

#### 2. **Template System**
- **System Templates**: Stored in system organization (`convex/seedSystemDefaultTemplateSet.ts`)
- **Template Sets**: Collections of email + PDF templates
- **Types**:
  - Email templates (transactional, marketing, events, support)
  - PDF templates (tickets, invoices, lead magnets, quotes, badges)
  - Web app templates (Freelancer Portal, etc.)

#### 3. **Boilerplates (Websites)**
- **Current**: Freelancer Portal template exists as `web_app` subtype
- **GitHub Integration**: Already exists (`convex/oauth/github.ts`)
- **Deployment**: Vercel integration exists (`src/components/window-content/integrations-window/vercel-settings.tsx`)
- **API Connection**: External frontend integration guide exists (`docs/reference_docs/frontend/frontend-integration-guide.md`)

#### 4. **Settings Structure**
- **Control Panel** (`src/components/window-content/control-panel-window.tsx`): Icon grid with Desktop, Quick Start, Manage, Integrations, etc.
- **Settings Window** (`src/components/window-content/settings-window.tsx`): Desktop settings (appearance, wallpaper, region)
- **Missing**: No "Boilerplates" section yet

#### 5. **Licensing System**
- **Tier Configs** (`convex/licensing/tierConfigs.ts`): Free, Starter, Professional, Agency, Enterprise
- **Limits**: `maxSystemTemplates`, `maxCustomTemplates`, `maxPages`, etc.
- **Upgrade Flow**: Needs integration with boilerplate wizard

---

## 🏗️ Architecture Design

### Two Types of "Boilerplates"

#### 1. **Website Boilerplates** (GitHub Repos)
- **Definition**: Pre-built websites (Next.js, React, etc.) connected to backend via API
- **Storage**: GitHub repositories
- **Connection**: OAuth + API keys
- **Examples**:
  - Freelancer Portal (client-facing portal)
  - Event Registration Site
  - Product Catalog
  - Lead Generation Landing Page
  - Client Dashboard

#### 2. **Template Sets** (Digital Communication Templates)
- **Definition**: Collections of email + PDF templates for digital communications
- **Types**:
  - **Email Templates**: Transactional, marketing, events, support
  - **PDF Templates**: Tickets, invoices, quotes, certificates, badges
  - **Form Templates**: Lead capture, registration, feedback
- **Examples**:
  - Professional System Default (7 templates)
  - Event Manager Set (event-focused templates)
  - E-commerce Set (transactional templates)
  - Agency Set (client communication templates)

---

## 🔄 New Flow Design

### Updated Quick Start Flow

```
1. User clicks "Quick Start"
   ↓
2. ICP Selection Screen (existing)
   - Shows: AI Agency, Founder/Builder, Event Manager, etc.
   - User selects their profile
   ↓
3. Boilerplate Wizard Screen (NEW)
   - Shows preselected boilerplates + templates based on ICP
   - Two tabs: "Website Boilerplates" | "Template Sets"
   - User can:
     - See what's preselected
     - Add more boilerplates/templates
     - Remove preselected items
     - See licensing limits and upgrade prompts
   ↓
4. Review & Payment Screen (NEW)
   - Shows summary of selections
   - Checks licensing limits
   - If over limits: Shows upgrade options + payment
   - If within limits: Shows "Install" button
   ↓
5. Installation Progress
   - Installs boilerplates (clones GitHub repos, sets up API connections)
   - Provisions template sets
   - Configures apps
   - Shows progress
   ↓
6. Completion
   - Success message
   - Links to installed boilerplates
   - Links to template management
```

---

## 📁 File Structure

### New Files to Create

```
src/components/boilerplate-wizard/
├── boilerplate-wizard.tsx              # Main wizard component
├── boilerplate-selection-step.tsx       # Step 1: Select boilerplates
├── template-set-selection-step.tsx     # Step 2: Select template sets
├── review-payment-step.tsx              # Step 3: Review + payment
├── boilerplate-card.tsx                # Card component for boilerplate
├── template-set-card.tsx                # Card component for template set
├── licensing-limit-banner.tsx          # Shows licensing limits/warnings
└── types.ts                             # TypeScript types

src/components/window-content/boilerplates-window/
├── index.tsx                            # Main boilerplates management window
├── boilerplates-tab.tsx                # Website boilerplates tab
├── template-sets-tab.tsx                # Template sets tab
├── boilerplate-details-modal.tsx        # Details/configuration modal
└── install-boilerplate-modal.tsx        # Installation flow modal

convex/boilerplates/
├── boilerplateRegistry.ts               # Registry of available boilerplates
├── boilerplateMutations.ts              # Install, uninstall, configure boilerplates
├── boilerplateQueries.ts                # Query installed boilerplates
└── templateSetMutations.ts               # Install template sets

convex/schema.ts                          # Add boilerplate object type
```

---

## 🗄️ Database Schema Changes

### New Object Types

#### 1. **Boilerplate** (`type: "boilerplate"`)
```typescript
{
  organizationId: Id<"organizations">,
  type: "boilerplate",
  subtype: "website", // Future: "mobile_app", "api_server", etc.
  name: string, // "Freelancer Portal"
  description: string,
  status: "installed" | "pending" | "failed",
  
  // GitHub Integration
  customProperties: {
    githubRepo: string, // "https://github.com/org/repo"
    githubRepoId?: string, // GitHub API repo ID
    branch: string, // "main" | "master"
    
    // Deployment
    deployment: {
      platform: "vercel" | "netlify" | "self-hosted",
      status: "not_deployed" | "deploying" | "deployed" | "failed",
      deployedUrl?: string,
      deployedAt?: number,
    },
    
    // API Connection
    apiConnection: {
      apiKeyId?: Id<"apiKeys">,
      requiredScopes: string[], // ["contacts:read", "projects:read"]
      requiredEndpoints: string[], // ["GET /api/v1/crm/contacts"]
    },
    
    // Template Link (if this boilerplate uses a template)
    templateId?: Id<"objects">, // Links to template object
    
    // Metadata
    boilerplateCode: string, // "freelancer_portal_v1"
    version: string, // "1.0.0"
    category: string, // "client_portal" | "event_site" | "ecommerce" | "landing_page"
    tags: string[],
    previewImageUrl?: string,
    demoUrl?: string,
    
    // Installation metadata
    installedAt: number,
    installedBy: Id<"users">,
    lastUpdatedAt: number,
  },
  
  createdAt: number,
  updatedAt: number,
}
```

#### 2. **Boilerplate Registry** (System-level)
```typescript
// Stored in system organization
{
  organizationId: systemOrgId,
  type: "boilerplate_registry",
  name: string, // "Freelancer Portal"
  boilerplateCode: string, // "freelancer_portal_v1"
  
  customProperties: {
    githubRepo: string,
    description: string,
    category: string,
    tags: string[],
    previewImageUrl?: string,
    demoUrl?: string,
    
    // Requirements
    requiredApps: string[], // ["CRM", "Projects", "Invoicing"]
    requiredScopes: string[],
    requiredEndpoints: string[],
    
    // Licensing
    minTier: "free" | "starter" | "professional" | "agency",
    
    // Template link
    templateId?: Id<"objects">,
  },
}
```

---

## 🎨 UI Components

### 1. Boilerplate Wizard (Multi-step)

#### Step 1: Website Boilerplates Selection
```
┌─────────────────────────────────────────────────┐
│ 🚀 Choose Website Boilerplates                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Preselected (based on AI Agency):              │
│  ┌──────────────┐  ┌──────────────┐          │
│  │ ✓ Freelancer │  │ ✓ Client     │          │
│  │   Portal     │  │   Dashboard  │          │
│  │ [Preview]    │  │ [Preview]    │          │
│  └──────────────┘  └──────────────┘          │
│                                                  │
│  Available Boilerplates:                        │
│  ┌──────────────┐  ┌──────────────┐          │
│  │ + Event      │  │ + Product    │          │
│  │   Site       │  │   Catalog    │          │
│  │ [Preview]    │  │ [Preview]    │          │
│  └──────────────┘  └──────────────┘          │
│                                                  │
│  ⚠️  Free tier: 1 boilerplate max               │
│  [Upgrade to Starter]                           │
│                                                  │
│  [Back]              [Next: Template Sets]     │
└─────────────────────────────────────────────────┘
```

#### Step 2: Template Sets Selection
```
┌─────────────────────────────────────────────────┐
│ 📄 Choose Template Sets                         │
├─────────────────────────────────────────────────┤
│                                                  │
│  Preselected:                                   │
│  ┌──────────────────────────────────────────┐  │
│  │ ✓ Professional System Default            │  │
│  │   7 templates: Event Confirmation,       │  │
│  │   Invoice Email, Ticket PDF, etc.       │  │
│  │   [Preview Templates]                    │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  Available Sets:                                │
│  ┌──────────────────────────────────────────┐  │
│  │ + Event Manager Set                      │  │
│  │   5 templates: Event-specific emails     │  │
│  │   [Preview Templates]                    │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [Back]              [Next: Review & Payment]  │
└─────────────────────────────────────────────────┘
```

#### Step 3: Review & Payment
```
┌─────────────────────────────────────────────────┐
│ ✅ Review Your Selection                        │
├─────────────────────────────────────────────────┤
│                                                  │
│  Website Boilerplates (2):                     │
│  • Freelancer Portal                           │
│  • Client Dashboard                             │
│                                                  │
│  Template Sets (1):                             │
│  • Professional System Default (7 templates)    │
│                                                  │
│  ────────────────────────────────────────────  │
│                                                  │
│  ⚠️  Licensing Check:                          │
│  Your selection requires:                      │
│  • Starter tier (2 boilerplates)                │
│  • Current tier: Free                           │
│                                                  │
│  [Upgrade to Starter - €199/month]             │
│                                                  │
│  OR                                             │
│                                                  │
│  [Remove 1 boilerplate to stay on Free tier]    │
│                                                  │
│  ────────────────────────────────────────────  │
│                                                  │
│  [Back]              [Install & Pay]            │
└─────────────────────────────────────────────────┘
```

### 2. Settings Window - Boilerplates Tab

```
┌─────────────────────────────────────────────────┐
│ ⚙️  Settings > Boilerplates                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  [Website Boilerplates] [Template Sets]        │
│                                                  │
│  Installed Website Boilerplates:               │
│  ┌──────────────────────────────────────────┐  │
│  │ Freelancer Portal                       │  │
│  │ Status: ✓ Deployed                     │  │
│  │ URL: https://portal.example.com        │  │
│  │ [Configure] [View Repo] [Uninstall]   │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  [+ Install New Boilerplate]                    │
│                                                  │
│  Available Boilerplates:                        │
│  • Event Registration Site                      │
│  • Product Catalog                             │
│  • Lead Generation Landing Page                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Implementation Steps

### Phase 1: Foundation (Week 1)

#### 1.1 Database Schema
- [ ] Add `boilerplate` object type to schema
- [ ] Add `boilerplate_registry` object type
- [ ] Create seed script for boilerplate registry (start with Freelancer Portal)

#### 1.2 Backend - Boilerplate Registry
- [ ] Create `convex/boilerplates/boilerplateRegistry.ts`
  - Define available boilerplates
  - Link to GitHub repos
  - Define requirements (apps, scopes, endpoints)
- [ ] Create `convex/boilerplates/boilerplateQueries.ts`
  - Query available boilerplates
  - Query installed boilerplates for org
  - Query boilerplate details

#### 1.3 Backend - Template Set Queries
- [ ] Extend template set queries to show available sets
- [ ] Query template set details (what templates included)

### Phase 2: Wizard UI (Week 2)

#### 2.1 Boilerplate Wizard Component
- [ ] Create `src/components/boilerplate-wizard/` directory
- [ ] Build multi-step wizard component
- [ ] Implement Step 1: Website Boilerplates selection
- [ ] Implement Step 2: Template Sets selection
- [ ] Implement Step 3: Review & Payment

#### 2.2 Card Components
- [ ] Create `BoilerplateCard` component
- [ ] Create `TemplateSetCard` component
- [ ] Add preview functionality

#### 2.3 Licensing Integration
- [ ] Create `LicensingLimitBanner` component
- [ ] Integrate with licensing system to check limits
- [ ] Show upgrade prompts when limits exceeded

### Phase 3: Quick Start Integration (Week 3)

#### 3.1 Update Quick Start Flow
- [ ] Modify `quick-start-icp-selector.tsx` to navigate to boilerplate wizard
- [ ] Pass ICP selection to boilerplate wizard
- [ ] Preselect boilerplates/templates based on ICP

#### 3.2 ICP → Boilerplate Mapping
- [ ] Update `icp-definitions.ts` to include boilerplate codes
- [ ] Create mapping: ICP → Preselected Boilerplates
- [ ] Create mapping: ICP → Preselected Template Sets

### Phase 4: Installation Backend (Week 4)

#### 4.1 Boilerplate Installation
- [ ] Create `convex/boilerplates/boilerplateMutations.ts`
  - `installBoilerplate`: Clone repo, set up API connection, create boilerplate object
  - `uninstallBoilerplate`: Remove boilerplate, clean up API connections
  - `configureBoilerplate`: Update configuration

#### 4.2 Template Set Installation
- [ ] Create `convex/boilerplates/templateSetMutations.ts`
  - `installTemplateSet`: Copy templates to org, link template set
  - `uninstallTemplateSet`: Remove templates

#### 4.3 Payment Integration
- [ ] Integrate with Stripe for upgrade flow
- [ ] Create checkout session before installation
- [ ] Only install after payment confirmation

### Phase 5: Settings Integration (Week 5)

#### 5.1 Settings Window
- [ ] Add "Boilerplates" tab to Control Panel
- [ ] Create `src/components/window-content/boilerplates-window/`
- [ ] Build boilerplates management UI
- [ ] Build template sets management UI

#### 5.2 Management Features
- [ ] List installed boilerplates
- [ ] Show deployment status
- [ ] Configure boilerplates
- [ ] Uninstall boilerplates
- [ ] Install additional boilerplates

### Phase 6: Testing & Polish (Week 6)

#### 6.1 Testing
- [ ] Test full onboarding flow
- [ ] Test licensing limit checks
- [ ] Test payment flow
- [ ] Test boilerplate installation
- [ ] Test template set installation

#### 6.2 Documentation
- [ ] Update onboarding docs
- [ ] Create boilerplate developer guide
- [ ] Create template set guide

---

## 🔗 Integration Points

### 1. Licensing System
- **File**: `convex/licensing/tierConfigs.ts`
- **New Limits**:
  - `maxBoilerplates: number` (Free: 1, Starter: 3, Professional: 10, Agency: -1)
- **Check**: Before allowing installation, verify tier limits

### 2. GitHub Integration
- **File**: `convex/oauth/github.ts`
- **Use**: Existing GitHub OAuth to clone repos
- **New**: API to list available boilerplate repos

### 3. API Keys
- **File**: `convex/apiKeysInternal.ts`
- **Use**: Create API keys for boilerplate connections
- **Link**: Boilerplate → API Key relationship

### 4. Template System
- **Files**: `convex/seedSystemDefaultTemplateSet.ts`, `convex/templateOntology.ts`
- **Use**: Existing template system
- **Extend**: Query available template sets

---

## 📋 ICP → Boilerplate Mapping

### AI Agency Owner
**Preselected Boilerplates:**
- Freelancer Portal (client portal)
- Client Dashboard

**Preselected Template Sets:**
- Professional System Default (7 templates)

**Available to Add:**
- Event Registration Site
- Product Catalog
- Lead Generation Landing Page

### Founder / Builder
**Preselected Boilerplates:**
- Freelancer Portal

**Preselected Template Sets:**
- Professional System Default (7 templates)

**Available to Add:**
- Product Catalog
- Lead Generation Landing Page
- Event Registration Site

### Event Manager
**Preselected Boilerplates:**
- Event Registration Site

**Preselected Template Sets:**
- Event Manager Set (event-specific templates)
- Professional System Default (7 templates)

**Available to Add:**
- Freelancer Portal
- Lead Generation Landing Page

---

## 🎯 Success Metrics

1. **Transparency**: Users see exactly what's being installed before confirming
2. **Customization**: Users can add/remove boilerplates and templates
3. **Upgrade Path**: Clear upgrade prompts when limits exceeded
4. **Conversion**: % of users who upgrade during onboarding
5. **Completion**: % of users who complete full onboarding flow

---

## 🚀 Future Enhancements

1. **Boilerplate Marketplace**: Allow users to create/share boilerplates
2. **Custom Boilerplates**: Users can add their own GitHub repos
3. **Boilerplate Templates**: Pre-configured boilerplates for common use cases
4. **One-Click Deployment**: Automatic Vercel deployment from wizard
5. **Preview Mode**: Preview boilerplates before installing
6. **Version Management**: Update boilerplates to new versions
7. **Analytics**: Track which boilerplates are most popular

---

## 📝 Notes

- **Backward Compatibility**: Existing users who already have templates installed should see them in the boilerplates window
- **Migration**: Need to migrate existing Freelancer Portal installations to new boilerplate system
- **GitHub Repos**: Need to create/identify GitHub repos for each boilerplate
- **API Documentation**: Each boilerplate needs clear API requirements documentation

---

## ✅ Next Steps

1. Review and approve this plan
2. Create database schema changes
3. Build boilerplate registry
4. Create wizard UI components
5. Integrate with Quick Start flow
6. Test end-to-end flow
7. Deploy and iterate
