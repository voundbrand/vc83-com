# Task 009: SOC2-Compliant Multi-Tenant Convex Auth & App Store Implementation

## Overview
Implement Convex Auth as the foundation for a SOC2-compliant multi-tenant web application with an app store architecture. Every user operates within an organization context (private or business), ensuring data isolation and security from day one. This architecture makes SOC2 certification achievable and maintains trust with enterprise customers while serving the VC83 Network State community platform for Mecklenburg-Vorpommern startups.

**Reference**: https://labs.convex.dev/auth
**Requirements Source**: `/Users/foundbrand_001/Development/vc83-com/.kiro/project_start_init/000_requirements_doc.md`

## Multi-Tenant Architecture Overview

### 🚨 CRITICAL: Everything is Organization-Scoped

**Every piece of data, every app, every feature in the platform MUST be scoped to an organization.** There are no exceptions to this rule.

### Account Structure
1. **Private Users = Private Organizations**: 
   - When a user signs up, automatically create a "private organization" for them
   - Organization name: User's email or name (e.g., "john@example.com's workspace")
   - Organization type: `isPersonal: true`
   - User is automatically the owner of their private org
   - **All app installations, content, and data are scoped to this private org**

2. **Business Organizations**: Multi-user collaborative spaces
   - Created when users explicitly create a business account
   - Organization type: `isPersonal: false`
   - Support multiple members with roles (owner, admin, member)
   - Can have custom names, settings, and branding

3. **Account Upgrade Flow**: 
   - Private org can be converted to business org
   - Simply update `isPersonal: false` and prompt for org details
   - All existing data remains intact (already org-scoped!)
   - User remains owner, can now invite members

### Simplified Data Model Benefits
- **No Conditional Logic**: Every query always includes `orgId`
- **Consistent Permissions**: Same permission model for private and business
- **Easy Upgrades**: Converting private → business is just a flag change
- **Data Isolation**: Built-in from day one, no retrofitting needed
- **Cleaner Codebase**: No `if (isPrivate)` checks throughout the app

### App Store Architecture (Always Org-Scoped)
- **Modular Apps**: Podcast, Events, Ideation (Kanban), Founder Matching
- **Installation Model**: Apps are installed per organization (including private orgs)
- **Access Control**: Free vs. paid apps validated against org's subscription
- **Visibility Control**: Apps can be hidden per organization
- **Content Scoping**: ALL content is isolated by `orgId` using Convex RLS

## Technical Requirements

### 1. Convex Database Schema (Updated for Universal Org Scoping)
Every user has at least one organization (their private org). All data is ALWAYS scoped to an organization.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.string(),
    // Remove isPrivate - not needed since everyone has an org
    defaultOrgId: v.id("organizations"), // User's primary/private org
  }).index("by_token", ["tokenIdentifier"]),

  organizations: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    isPersonal: v.boolean(), // true for auto-created private orgs
    plan: v.union(v.literal("free"), v.literal("pro")),
    
    // Business Information (required for business orgs, auto-filled for personal)
    legalName: v.string(), // "John's Workspace" or "Acme Corp GmbH"
    taxId: v.optional(v.string()), // VAT/Tax number for business
    addressLine1: v.string(),
    addressLine2: v.optional(v.string()),
    city: v.string(),
    state: v.string(), // Bundesland for Germany
    postalCode: v.string(),
    country: v.string(), // Default "DE" for MV focus
    
    // Contact Information
    billingEmail: v.string(), // Same as user email for personal
    supportEmail: v.optional(v.string()),
    phone: v.optional(v.string()),
    
    // Additional fields
    slug: v.optional(v.string()), // For future custom URLs
    description: v.optional(v.string()),
    logo: v.optional(v.string()),
    website: v.optional(v.string()),
    industry: v.optional(v.string()), // For business orgs
    size: v.optional(v.string()), // "1-10", "11-50", etc.
  }).index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_tax_id", ["taxId"]),

  memberships: defineTable({
    userId: v.id("users"),
    orgId: v.id("organizations"),
    role: v.union(v.literal("owner"), v.literal("member"), v.literal("admin")),
  }).index("by_user", ["userId"])
    .index("by_org", ["orgId"])
    .index("by_user_org", ["userId", "orgId"]),

  apps: defineTable({
    appId: v.string(), // e.g., "podcast", "events"
    name: v.string(),
    description: v.string(),
    defaultPlan: v.union(v.literal("free"), v.literal("pro")),
  }).index("by_appId", ["appId"]),

  app_access: defineTable({
    orgId: v.id("organizations"), // ALWAYS required - no nulls!
    appId: v.string(),
    enabled: v.boolean(), // True if installed
    hidden: v.boolean(), // True if hidden by org
    planRequired: v.union(v.literal("free"), v.literal("pro")),
  }).index("by_org_app", ["orgId", "appId"]),

  contents: defineTable({
    orgId: v.id("organizations"), // ALWAYS required - even for "public" content
    appId: v.string(),
    title: v.string(),
    data: v.any(), // e.g., podcast embed URL
    visibility: v.union(
      v.literal("public"), // Visible on public landing page
      v.literal("org_only"), // Only visible to org members
      v.literal("hidden") // Hidden from everyone
    ),
  }).index("by_org_app", ["orgId", "appId"])
    .index("by_visibility", ["visibility", "appId"]),
});
```

### 2. Convex Auth Setup
- [ ] Install `@convex-dev/auth` package
- [ ] Configure Microsoft OAuth and email/password providers
- [ ] **Post-signup flow**: Create user AND their private organization atomically
- [ ] Implement session management with organization context (always present)
- [ ] Add Row-Level Security (RLS) - every query MUST include `orgId`

### 3. Authentication Functions
- [ ] **User Registration Flow**:
  ```typescript
  // In a single transaction:
  1. Create user record
  2. Create private organization (name: user's email, isPersonal: true)
  3. Create membership (user as owner of their private org)
  4. Set user.defaultOrgId to the private org
  5. Set session currentOrgId to the private org
  ```
- [ ] **Organization Management**:
  - Create additional business organizations
  - Convert private org to business (just update `isPersonal: false`)
  - Join other organizations via invitation
  - Switch between organizations (update session `currentOrgId`)
- [ ] **Membership Management**: 
  - Invite users to business organizations
  - Manage roles (owner, admin, member)
  - Leave organizations (except own private org)
  - Remove members from organizations

### 4. App Store Backend Logic (Always Org-Scoped)
- [ ] **App Installation**: Create `app_access` record for the organization
- [ ] **App Uninstallation**: Set `enabled: false`, `hidden: true`  
- [ ] **App Hiding**: Toggle `app_access.hidden` for decluttering
- [ ] **Content Queries**: ALWAYS filter by `orgId` - no exceptions
- [ ] **Public Content**: Query with `visibility: "public"` for landing page
- [ ] **Access Gating**: Validate organization's subscription tier

### 5. Retro Desktop UI Components

#### Authentication Components
- [ ] **Login Window**: Retro-styled with Microsoft OAuth + email/password
  - Organization selection for multi-org users
  - "Remember me" functionality
  - CRT scanline effects and pixel fonts

- [ ] **Registration Windows - Two Versions**:
  
  **Personal Registration (Default)**:
  - Minimal fields: First name, email, password
  - Auto-generates fun workspace names
  - One-click signup experience
  - Placeholder org data in background
  
  **Business Registration**:
  - Full business details form
  - Legal name and tax ID fields
  - Complete address information
  - Billing contact details
  - Industry and size selection
  - Compliance-ready data collection

- [ ] **Organization Upgrade Form**:
  - Converts personal → business org
  - Pre-fills known data (email, name)
  - Collects missing business details
  - Updates org record in place

- [ ] **Organization Switcher**: Dropdown in system tray
  - Shows org names with type indicators
  - Personal orgs show workspace icon
  - Business orgs show briefcase icon
  - Instant context switching

#### App Store UI
- [ ] **App Store Window**: Retro desktop grid with app icons
  - Floppy disk icons, pixelated styling
  - Install/uninstall click actions
  - Free/paid tier indicators
- [ ] **App Installation Modal**: Confirm installation with plan check
- [ ] **App Settings**: Show/hide installed apps per user/org

#### Organization Management
- [ ] **Organization Dashboard**: Overview and member management
- [ ] **Create Organization Window**: Upgrade private account flow
- [ ] **Member Management**: Role assignment and invitation system
- [ ] **Organization Settings**: App visibility toggles, plan management

### 6. Organization-First Session Management
- [ ] **Auth Context**: Always includes current `orgId` - never null
- [ ] **Organization Switching**: Update `currentOrgId` in session
- [ ] **Data Scoping**: Every API call automatically includes `orgId`
- [ ] **Default Organization**: New users start in their private org
- [ ] **Session Validation**: Verify user has access to current `orgId`
- [ ] **Query Patterns**: 
  ```typescript
  // EVERY query looks like this:
  const items = await ctx.db
    .query("items")
    .withIndex("by_org", q => q.eq("orgId", ctx.session.orgId))
    .collect();
  
  // NEVER this:
  const items = await ctx.db.query("items").collect(); // ❌ NO!
  ```

## Implementation Phases

### Phase 1: Core Authentication (Week 1)
1. **Convex Auth Setup**
   ```bash
   npm install @convex-dev/auth
   ```

2. **Database Schema Implementation**
   - Create `convex/schema.ts` with organization-first schema
   - Every table has `orgId` field (no exceptions)
   - Set up indexes for efficient org-scoped queries

3. **User Registration Flow**
   ```typescript
   // auth.ts - atomic user + org creation
   export const signUpPersonal = mutation(async ({ db }, { email, password, firstName }) => {
     // Generate random workspace name variations
     const randomSuffixes = ["Workspace", "Studio", "Lab", "Space", "Hub", "Zone"];
     const suffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
     const workspaceName = `${firstName}'s ${suffix}`;
     
     // Transaction ensures both succeed or both fail
     const userId = await db.insert("users", { email, name: firstName });
     const orgId = await db.insert("organizations", {
       name: workspaceName,
       legalName: workspaceName, // Auto-generated
       ownerId: userId,
       isPersonal: true,
       plan: "free",
       // Auto-fill required fields with placeholder data
       billingEmail: email,
       addressLine1: "Not specified",
       city: "Not specified", 
       state: "Mecklenburg-Vorpommern", // Default for MV
       postalCode: "00000",
       country: "DE"
     });
     await db.insert("memberships", {
       userId,
       orgId,
       role: "owner"
     });
     await db.patch(userId, { defaultOrgId: orgId });
     return { userId, orgId };
   });
   
   export const signUpBusiness = mutation(async ({ db }, { 
     email, 
     password, 
     firstName,
     organizationData // Complete org info like Stripe requires
   }) => {
     const userId = await db.insert("users", { email, name: firstName });
     const orgId = await db.insert("organizations", {
       ...organizationData,
       ownerId: userId,
       isPersonal: false,
       plan: "free"
     });
     await db.insert("memberships", {
       userId,
       orgId,
       role: "owner"
     });
     await db.patch(userId, { defaultOrgId: orgId });
     return { userId, orgId };
   });
   ```

### Phase 2: Organization System (Week 2)
1. **Organization Management Backend**
   - Create organization mutations
   - Membership management (invite, join, leave)
   - Role-based permission validation

2. **Multi-Org Frontend**
   - Organization switcher component
   - Create organization flow
   - Member invitation system

3. **Retro UI Integration**
   - Auth windows in floating window system
   - Organization context in taskbar
   - Retro styling for all auth components

### Phase 3: App Store Foundation (Week 3-4)
1. **App Store Backend**
   - App installation/uninstallation logic
   - Content scoping by organization
   - Access control with subscription validation

2. **App Store UI**
   - Retro desktop grid with app icons
   - Installation modals and confirmations
   - App visibility controls

3. **Podcast Module Integration**
   - Public landing page (global content)
   - Organization-scoped podcast content
   - Admin controls for content management

### Phase 4: Admin & Settings (Week 5-6)
1. **Admin Controls**
   - Superuser management interface
   - CRUD operations on apps and content
   - Organization and user management

2. **Organization Settings**
   - App visibility toggles
   - Member management interface
   - Plan and billing integration preparation

## Security Implementation & SOC2 Compliance

### 🔒 SOC2-Ready Architecture from Day One

By implementing organization-scoped architecture from the start, we're building in SOC2 compliance requirements:

1. **Logical Access Controls** (CC6.1)
   - Every user action is scoped to their organization
   - Role-based permissions within organizations
   - No possibility of cross-tenant data access

2. **Data Segregation** (CC6.7)
   - Complete data isolation at the database level
   - Each organization's data is logically separated
   - No shared data pools or conditional access

3. **Audit Trails** (CC7.2)
   - Every query includes organization context
   - All access attempts are traceable to user + org
   - Failed access attempts logged for security monitoring

4. **Access Management** (CC6.2)
   - User provisioning creates isolated workspace
   - Deprovisioning removes org access cleanly
   - No orphaned data or access paths

### Organization-Based Data Isolation
- [ ] **Universal OrgId Requirement**: Every database query MUST include `orgId`
- [ ] **No Global Queries**: Forbid queries without organization context
- [ ] **Membership Validation**: Verify user belongs to the organization
- [ ] **Query Middleware**: Automatically inject `orgId` into all queries
- [ ] **Type Safety**: TypeScript ensures `orgId` is never optional
- [ ] **Audit Trail**: Log all cross-org access attempts
- [ ] **SOC2 Logging**: Track all data access with user, org, timestamp
- [ ] **Access Reviews**: Periodic membership audits per organization

### Authentication Security  
- [ ] Secure session token handling with organization context
- [ ] CSRF protection for all auth forms
- [ ] Rate limiting for login attempts
- [ ] Input sanitization and validation
- [ ] Secure invitation token generation with expiration

## Retro UI Design Specifications

### Color Palette & Typography
- **Primary**: Purple (#6B46C1), White (#FFFFFF), Black (#000000)
- **Fonts**: Press Start 2P for headers, system fonts for forms
- **Effects**: CRT scanlines, pixelated icons, retro button styling

### Authentication Flow UX
1. **Public Landing**: Simple retro podcast page (shows public content from all orgs)

2. **Registration Process - Two Paths**: 
   
   **Path A: Personal Account (Default)**
   - Simple form: First name, email, password
   - Auto-generates org name: "John's Studio" (random suffix)
   - Fills placeholder business data (can update later)
   - User lands directly in dashboard - frictionless!
   
   **Path B: Business Account (Optional)**
   - "Register as Business" link on signup
   - Full form like Stripe/payment processors require:
     - Legal business name
     - Tax ID (VAT number)
     - Business address (street, city, postal code)
     - Billing contact info
     - Industry and company size
   - Proper data for invoicing and compliance

3. **Login Process**: 
   - Desktop "Login" icon opens retro login window
   - Microsoft OAuth + email/password options
   - User lands in their default organization

4. **Organization Upgrade Flow**:
   - Personal users see "Upgrade to Business" button
   - Opens form to collect proper business details
   - Updates existing org from placeholder → real data
   - No data migration needed (same org ID!)

5. **Multi-Org Management**:
   - Create additional organizations (always business type)
   - Switch between orgs via system tray dropdown
   - Each org has proper business data for compliance

### App Store Experience
- **Grid Layout**: Retro desktop with app icons (floppy disks, etc.)
- **Installation**: Click to install with plan validation
- **Management**: Show/hide apps via settings
- **Opening Apps**: Installed apps open as draggable windows

## Testing Strategy

### Multi-Tenant Testing
- [ ] Data isolation between organizations
- [ ] Cross-tenant access prevention
- [ ] Organization switching functionality
- [ ] App access control validation
- [ ] Content scoping verification

### Authentication Testing
- [ ] Login/logout flows with organization context
- [ ] Registration with account type selection
- [ ] Organization creation and member management
- [ ] Session persistence across organization switches
- [ ] Permission validation for different roles

### UI/UX Testing
- [ ] Retro styling consistency across auth components
- [ ] Mobile responsiveness of authentication forms
- [ ] App store installation/uninstallation flows
- [ ] Organization switcher user experience

## Success Criteria

### Functional Requirements
- [ ] User registration automatically creates private organization
- [ ] Every piece of data in the system has an `orgId`
- [ ] No conditional logic for private vs business users
- [ ] Seamless organization switching without re-authentication
- [ ] App store installations are per-organization
- [ ] Private org → business org upgrade is a simple flag change
- [ ] Admin controls properly scoped to organizations

### Technical Requirements
- [ ] **NO QUERIES WITHOUT ORGID** - enforced at type level
- [ ] Strict data isolation between ALL organizations
- [ ] Private orgs have same security as business orgs
- [ ] Performance optimized for org-scoped queries
- [ ] All TypeScript checks pass with strict mode
- [ ] Zero "if (isPrivate)" conditionals in codebase
- [ ] Audit logs capture all data access attempts
- [ ] SOC2 compliance controls implemented from start

### Visual Requirements
- [ ] Retro desktop aesthetic maintained throughout
- [ ] Consistent styling across all auth and app store components
- [ ] Smooth animations for organization switching
- [ ] Mobile-responsive design for all interfaces

## Files to Create/Modify

### New Convex Files
```
convex/
├── schema.ts                   # Multi-tenant database schema
├── auth.config.ts              # Convex auth configuration
├── users.ts                    # User management functions
├── organizations.ts            # Organization CRUD operations
├── memberships.ts              # Membership management
├── apps.ts                     # App store management
├── app_access.ts               # App installation/access control
└── contents.ts                 # Content management with scoping
```

### New Frontend Files
```
src/
├── components/
│   ├── auth/
│   │   ├── auth-provider.tsx           # Multi-tenant auth context
│   │   ├── login-form.tsx              # Login with org selection
│   │   ├── register-form.tsx           # Registration with account type
│   │   ├── organization-switcher.tsx   # Org switching dropdown
│   │   └── microsoft-auth.tsx          # Microsoft OAuth component
│   ├── app-store/
│   │   ├── app-store-grid.tsx          # Retro app icons grid
│   │   ├── app-installation-modal.tsx  # Install/uninstall modal
│   │   ├── app-icon.tsx                # Individual app icon component
│   │   └── app-settings.tsx            # Show/hide app controls
│   ├── organizations/
│   │   ├── create-organization.tsx     # Organization creation form
│   │   ├── organization-dashboard.tsx  # Org overview and management
│   │   ├── member-management.tsx       # Member roles and invitations
│   │   └── organization-settings.tsx   # Org-level app visibility
│   └── window-content/
│       ├── login-window.tsx            # Login window content
│       ├── app-store-window.tsx        # App store window
│       ├── create-org-window.tsx       # Create organization window
│       ├── org-dashboard-window.tsx    # Organization dashboard
│       └── admin-window.tsx            # Admin management interface
├── hooks/
│   ├── use-auth.tsx                    # Multi-tenant auth hook
│   ├── use-organization.tsx            # Current organization hook
│   ├── use-organizations.tsx           # User's organizations
│   ├── use-app-store.tsx               # App installation management
│   └── use-memberships.tsx             # Organization memberships
├── lib/
│   ├── auth.ts                         # Auth utilities
│   ├── organizations.ts                # Organization utilities
│   ├── permissions.ts                  # Role-based permissions
│   └── app-store.ts                    # App store utilities
└── types/
    ├── auth.ts                         # Authentication types
    ├── organizations.ts                # Organization types
    └── app-store.ts                    # App store types
```

### Modified Files
```
src/
├── app/
│   ├── layout.tsx                      # Add multi-tenant auth provider
│   └── page.tsx                        # Public landing page
├── components/
│   ├── desktop-icon.tsx                # Add app store and auth icons
│   └── floating-window.tsx             # Support new window types
└── hooks/
    └── use-window-manager.tsx          # Add app store and auth windows
```

## Future Enhancements

### Phase 2: Advanced Features
- [ ] Stripe integration for paid app tiers
- [ ] Custom organization subdomains (`orgname.vc83.com`)
- [ ] Advanced admin analytics and reporting
- [ ] Discord widget integration for org-specific channels

### Phase 3: Network State Features
- [ ] Token-gated app access
- [ ] Community tools (Ideation Kanban, Founder Matching)
- [ ] Event platform integration as reusable module
- [ ] Multi-vertical support for different startup ecosystems

## Notes

### Development Priorities
1. **Organization-First Architecture**: Every user gets an org, every query has orgId
2. **Atomic User+Org Creation**: Single transaction ensures consistency
3. **Universal Data Scoping**: No exceptions - everything is org-scoped
4. **Simple Upgrade Path**: Private → business is just a flag change
5. **Clean Codebase**: No conditional logic for account types

### Key Implementation Rules
- **🚨 CRITICAL**: No data exists outside of an organization context
- **Query Pattern**: Every single database query includes `orgId`
- **User Signup**: Always creates user + org together (with appropriate data)
- **Type Safety**: Make `orgId` required in TypeScript types
- **Public Content**: Still has an `orgId` (just marked as public visibility)
- **No Conditionals**: Same code paths for private and business orgs

### Registration Data Strategy
- **Personal Accounts**: 
  - Minimal friction - just name, email, password
  - Auto-generate creative workspace names
  - Use placeholder data for required fields
  - Can upgrade later when needed
  
- **Business Accounts**:
  - Collect full details upfront (like Stripe)
  - Validate tax IDs for proper format
  - Require complete address for invoicing
  - Industry/size for better app recommendations

- **Benefits**:
  - Low barrier to entry for individuals
  - Compliance-ready for businesses
  - Easy upgrade path when users grow
  - Same security model for all

### Why This Approach?
- **Simplicity**: One data model for everything
- **Security**: Data isolation built-in from day one
- **Scalability**: Same architecture for 1 or 1000 orgs
- **Flexibility**: Easy upgrades and migrations
- **Clean Code**: No special cases to maintain
- **SOC2 Ready**: Compliance-first architecture design

### SOC2 Benefits of Organization-First Design

By structuring the application with mandatory organization scoping from the beginning:

1. **Automatic Compliance**: 
   - Data segregation is architectural, not procedural
   - No risk of accidentally exposing cross-tenant data
   - Audit trails are built into every operation

2. **Simplified Audits**:
   - Auditors can easily verify data isolation
   - Clear organizational boundaries in code
   - No complex conditional logic to review

3. **Trust & Security**:
   - Enterprise customers expect SOC2 compliance
   - Architecture demonstrates security-first thinking
   - Reduces time to achieve certification

4. **Future-Proof**:
   - GDPR data deletion is org-scoped
   - CCPA compliance easier with clear boundaries
   - Multi-region deployment possible per org

### MV Startup Context
- **Target Users**: Mecklenburg-Vorpommern startup founders and investors
- **Go-to-Market**: Leverage VC83 podcast audience for initial user acquisition
- **Value Proposition**: Virtual startup hub with modular tools (podcast, events, ideation, founder matching)
- **Business Model**: Freemium app store with paid premium features

---

**Estimated Effort**: 6 weeks (following requirements roadmap)
**Priority**: Critical (foundation for entire platform)
**Dependencies**: Convex backend setup (Task 003)
**Blocks**: App store implementation, content management, billing system
**Next Steps**: Begin with Week 1 authentication foundation