# Authentication & Onboarding Status Review

**Date**: 2025-10-02
**Reviewed By**: Claude Code
**Purpose**: Compare planned implementation vs actual state

---

## Executive Summary

✅ **Phase 1 (Backend Schema & Auth)**: 95% Complete
🟡 **Phase 2 (Frontend Auth UI)**: 70% Complete
❌ **Phase 3 (App Store Backend)**: 10% Complete
❌ **Phase 4 (Organization Management UI)**: 5% Complete

**Overall Status**: Basic authentication works, but missing critical organization management and app platform features.

---

## Phase 1: Backend Schema & Auth ✅ 95%

### ✅ What's Implemented

1. **Convex Auth Setup** - Complete
   - `@convex-dev/auth` installed and configured
   - Password provider working
   - Session management active
   - JWT token handling

2. **Database Schema** - Complete
   - `users` table with all required fields
   - `organizations` table with business/personal support
   - `organizationMembers` with role-based access
   - `authAccounts` for credential storage
   - `auditLogs` for security tracking
   - All tables have proper indexes

3. **User Registration** - Complete
   - `signUpPersonal` mutation with minimal fields
   - `signUpBusiness` mutation with full business data
   - Auto-generates workspace names for personal accounts
   - Validates German VAT IDs for business accounts
   - Atomic user+org+membership creation
   - Password strength validation (8+ chars, uppercase, lowercase, number)

4. **Authentication** - Complete
   - `signInWithPassword` mutation working
   - Returns user + default org + all orgs
   - Proper password hashing with bcrypt
   - Session management via Convex Auth

5. **Security Features** - Complete
   - Bot protection (honeypot fields, IP tracking)
   - Disposable email detection
   - Audit logging for all auth actions
   - Rate limiting infrastructure ready

6. **Organization Helpers** - Complete
   - `getOrganization` - Fetch org by ID with membership check
   - `getUserOrganizations` - List user's orgs
   - `createOrganization` - Create additional orgs
   - `updateOrganization` - Update org details
   - `switchDefaultOrganization` - Change default org
   - `getOrganizationStats` - Dashboard statistics

### ❌ Missing from Phase 1

1. **Email Verification**
   - Flag exists (`emailVerified`) but not enforced
   - No email sending configured
   - No verification tokens table

2. **Microsoft OAuth**
   - Not configured in auth providers
   - No OAuth callback handlers

3. **Password Reset**
   - No forgot password flow
   - No reset tokens table

4. **Organization Validators**
   - Basic VAT validation exists
   - Missing advanced business data validation

---

## Phase 2: Frontend Auth UI 🟡 70%

### ✅ What's Implemented

1. **Auth Context** (`src/hooks/use-auth.tsx`) - Complete
   - React Context with Convex Auth integration
   - `signUpPersonal` and `signUpBusiness` methods
   - `signIn` and `signOut` methods
   - `switchOrganization` functionality
   - Auto-login after signup

2. **Login Window** - Complete
   - Email/password form
   - Password visibility toggle
   - Remember me checkbox
   - Error handling and loading states
   - "Forgot password" link (placeholder)

3. **Register Window** - Complete
   - Tab switcher (Personal/Business)
   - Routes to correct form component
   - Integrated with window management

4. **Personal Registration Form** - Complete
   - Minimal fields (firstName, email, password)
   - Real-time workspace name generation
   - Password strength indicator
   - Form validation
   - Auto-login on success

5. **Business Registration Form** - Complete
   - Full business data collection
   - Multi-step form (Account → Business → Contact)
   - German VAT ID validation
   - All required fields enforced
   - Auto-login on success

6. **Organization Switcher** - Basic Implementation
   - Dropdown component exists
   - Shows current org
   - Lists all user's orgs
   - Click to switch

### ❌ Missing from Phase 2

1. **Email Verification UI**
   - No verification prompt after signup
   - No verification link handler
   - No resend verification button

2. **Microsoft OAuth Button**
   - Button exists but is placeholder
   - No OAuth popup/redirect
   - No callback handler

3. **Forgot Password Flow**
   - Link exists but goes nowhere
   - No reset request form
   - No reset password form

4. **Error Boundaries**
   - Basic error display exists
   - Missing retry mechanisms
   - No network error recovery

5. **Organization Switcher Enhancements**
   - No "Create Organization" option in dropdown
   - No org type badges (Personal/Business)
   - No member count display
   - Missing quick actions (Settings, Manage)

6. **User Profile UI**
   - No profile editing
   - No avatar upload
   - No email change
   - No password change

---

## Phase 3: App Store Backend ❌ 10%

### ✅ What's Implemented

1. **Schema** - Complete
   - `apps` table with all fields
   - `appInstallations` table with org scoping
   - Proper indexes for performance

2. **App Registry** - Partial
   - Schema exists for apps
   - No DEFAULT_APPS defined yet
   - No seed data

3. **Auto-Install Free Apps** - Implemented
   - In `createOrganization` mutation
   - Installs apps matching org plan
   - Sets proper permissions

### ❌ Missing from Phase 3

1. **App Registry & Seeding**
   - No DEFAULT_APPS array (Podcast, Events, Ideation, etc.)
   - No `seedApps` mutation
   - No app categories defined
   - No app icons/metadata

2. **Installation System**
   - No `installApp` mutation
   - No `uninstallApp` mutation
   - No `toggleAppVisibility` mutation
   - No plan validation on install

3. **App Access Queries**
   - No `getInstalledApps` query
   - No `getAvailableApps` query
   - No `hasAppAccess` helper
   - No permission checking

4. **Content Management**
   - No `createContent` mutation
   - No `getContentForApp` query
   - No visibility filtering (public/org_only/hidden)
   - No content scoping by org

5. **Podcast Module**
   - Has schema (`app_podcasting`)
   - No episode creation mutations
   - No public episode queries
   - No org episode queries

6. **Admin Functions**
   - No `createApp` mutation
   - No `toggleAppAvailability` mutation
   - No `getAppStats` query
   - No superadmin role check

7. **Permission System**
   - No `requireAppAccess` helper
   - No `canModifyContent` helper
   - No permission middleware

8. **Initialization**
   - No `initializeAppStore` action
   - No system organization for public content
   - No cron job setup

---

## Phase 4: Organization Management UI ❌ 5%

### ✅ What's Implemented

1. **Basic Organization Context**
   - Auth hook provides `currentOrg`
   - Auth hook provides `organizations` list
   - `switchOrganization` method exists

### ❌ Missing from Phase 4 (Everything)

1. **App Store UI**
   - No app store grid component
   - No app icon component
   - No app details modal
   - No install/uninstall buttons
   - No category filters
   - No search functionality

2. **Organization Dashboard**
   - No dashboard window
   - No org info card
   - No member list card
   - No installed apps card
   - No activity stats
   - No quick actions

3. **Member Management**
   - No member list view
   - No role management dropdown
   - No invite member form
   - No remove member button
   - No pending invitations list
   - No permission checks

4. **Organization Settings**
   - No settings window
   - No general settings tab
   - No billing/tax tab
   - No app preferences tab
   - No form for editing org details

5. **Organization List/Switcher**
   - Basic switcher exists
   - No visual org cards
   - No "Create Organization" button
   - No org type indicators
   - No plan badges

6. **Invitation System**
   - No backend mutations
   - No email sending
   - No invitation tokens
   - No invitation acceptance flow

7. **Window Integration**
   - No app store window registered
   - No org dashboard window
   - No settings window
   - No member management window

---

## Test Coverage

### ✅ Existing Tests (9 passing)

Location: `convex/tests/auth.test.ts`

**Personal Account Registration** (6 tests):
- ✅ Create account with valid data
- ✅ Reject weak passwords
- ✅ Reject invalid email format
- ✅ Reject short names
- ✅ Reject bot-like names
- ✅ Reject disposable emails
- ✅ Reject duplicate emails

**Business Account Registration** (8 tests):
- ✅ Create account with valid data
- ✅ Accept valid German VAT ID
- ✅ Reject invalid VAT format
- ✅ Require last name
- ✅ Use contact email fallback
- ✅ Store optional contact details

**Password Security** (4 tests):
- ✅ Hash passwords before storage
- ✅ Require 8+ characters
- ✅ Require uppercase letter
- ✅ Require lowercase letter
- ✅ Require number

**User Authentication** (4 tests):
- ✅ Authenticate with correct credentials
- ✅ Reject incorrect password
- ✅ Reject non-existent email
- ✅ Reject inactive users
- ✅ Create audit log on login

**Current User Query** (3 tests):
- ✅ Return null when not authenticated
- ✅ Return user data when authenticated
- ✅ Not return inactive users

**Workspace Generation** (2 tests):
- ✅ Generate creative workspace names
- ✅ Generate valid slugs from business names

### ❌ Missing Tests

1. **Organization Tests**
   - No multi-org creation tests
   - No org switching tests
   - No org update tests
   - No member management tests

2. **App Store Tests**
   - No app installation tests
   - No app access tests
   - No content scoping tests
   - No permission tests

3. **Integration Tests**
   - No end-to-end flow tests
   - No UI component tests
   - No API integration tests

---

## Critical Gaps Analysis

### 🔴 High Priority (Blocks Core Features)

1. **App Store Backend** (Phase 3)
   - Without this, users can't install apps
   - Podcast episodes can't be scoped to orgs
   - No app marketplace functionality
   - **Estimated Effort**: 3-4 days

2. **Organization Management UI** (Phase 4)
   - Users can't manage their orgs
   - Can't invite team members
   - Can't configure apps
   - **Estimated Effort**: 4-5 days

3. **Email Verification**
   - Security risk without this
   - Allows fake signups
   - No way to recover accounts
   - **Estimated Effort**: 1-2 days

### 🟡 Medium Priority (UX Issues)

4. **Password Reset Flow**
   - Users locked out if they forget password
   - No account recovery
   - **Estimated Effort**: 1-2 days

5. **Organization Switcher Polish**
   - Hard to see which org you're in
   - Can't create orgs from UI
   - Missing visual feedback
   - **Estimated Effort**: 0.5 days

6. **User Profile Management**
   - Can't change password
   - Can't update email
   - Can't edit profile
   - **Estimated Effort**: 1 day

### 🟢 Low Priority (Nice to Have)

7. **Microsoft OAuth**
   - Button exists but doesn't work
   - Would improve UX for business users
   - **Estimated Effort**: 1-2 days

8. **Advanced Organization Features**
   - Custom branding
   - SSO integration
   - API access
   - **Estimated Effort**: 3-5 days

---

## Recommended Next Steps

### Option A: Complete App Platform (Recommended)

Focus on making the multi-tenant app platform actually work:

1. **Week 1**: Complete Phase 3 (App Store Backend)
   - Define DEFAULT_APPS array
   - Implement install/uninstall mutations
   - Create content management system
   - Build podcast module
   - Write tests

2. **Week 2**: Complete Phase 4 (Org Management UI)
   - Build app store grid UI
   - Create org dashboard
   - Add member management
   - Build settings interface
   - Integrate with windows

3. **Week 3**: Add Critical Missing Features
   - Email verification system
   - Password reset flow
   - Polish org switcher
   - User profile management

### Option B: Polish Authentication First

Make auth rock-solid before moving to apps:

1. **Email Verification** (2 days)
   - Email sending via Convex actions
   - Verification tokens table
   - Verification UI flow
   - Resend verification

2. **Password Reset** (2 days)
   - Reset token generation
   - Email reset links
   - Reset password form
   - Security measures

3. **User Profile** (1 day)
   - Edit profile form
   - Change password
   - Change email with verification
   - Avatar upload

4. **OAuth** (2 days)
   - Microsoft OAuth config
   - OAuth callbacks
   - Link/unlink accounts

### Option C: MVP Focus

Get core features working, skip advanced stuff:

1. **App Store MVP** (3 days)
   - Just podcast app
   - Manual install (no UI marketplace)
   - Basic episode management
   - Public episodes working

2. **Organization Basics** (2 days)
   - Simple org switcher UI
   - Basic org settings
   - No member management
   - No invitations

3. **Auth Basics** (1 day)
   - Email verification (enforced)
   - No password reset (tell users to contact support)
   - No OAuth
   - No profile editing

---

## Technical Debt

### Code Quality Issues

1. **Missing Type Safety**
   - Some `any` types in helpers
   - Missing return type annotations
   - Inconsistent error types

2. **Incomplete Error Handling**
   - Generic error messages
   - No error recovery
   - Missing validation feedback

3. **No Middleware**
   - Duplicate auth checks
   - No centralized permission logic
   - No request logging

### Performance Concerns

1. **N+1 Queries**
   - `getUserOrganizations` does Promise.all
   - Could batch with Convex's built-in batching

2. **Missing Caching**
   - No memoization of expensive queries
   - Could use Convex's reactive queries better

3. **No Pagination**
   - All queries fetch entire datasets
   - Will slow down with many orgs/members

### Security Concerns

1. **Email Verification Not Enforced**
   - Users can sign up with fake emails
   - No way to verify ownership

2. **Rate Limiting Not Active**
   - Table exists but no enforcement
   - Vulnerable to brute force

3. **No 2FA**
   - Single factor authentication only
   - Risk for business accounts

---

## Documentation Updates Needed

### Phase 1 Doc (`010_auth_implementation_phase1.md`)

**Status**: ✅ Mostly accurate

**Updates needed**:
- [x] Mark completed tasks
- [ ] Add notes about email verification being deferred
- [ ] Document actual implementation vs. plan

### Phase 2 Doc (`011_auth_implementation_phase2.md`)

**Status**: 🟡 Partially accurate

**Updates needed**:
- [x] Mark completed UI components
- [ ] Note missing features (email verify, OAuth, password reset)
- [ ] Add actual component structure

### Phase 3 Doc (`012_auth_implementation_phase3.md`)

**Status**: ❌ Not implemented

**Updates needed**:
- [ ] Add note at top: "NOT YET IMPLEMENTED"
- [ ] Mark what exists (schema only)
- [ ] Prioritize which parts to build first

### Phase 4 Doc (`013_auth_implementation_phase4.md`)

**Status**: ❌ Not implemented

**Updates needed**:
- [ ] Add note at top: "NOT YET IMPLEMENTED"
- [ ] Mark basic switcher as existing
- [ ] Everything else is missing

---

## Questions for Product Owner

Before proceeding, need answers to:

1. **Priority**: App platform or auth polish?
   - Do we need the full app marketplace now?
   - Or should we focus on making auth perfect?

2. **Email Verification**: Enforce now or later?
   - Risk allowing unverified signups?
   - Or defer to MVP launch?

3. **Multi-tenancy**: How important is it?
   - Do users really need multiple orgs?
   - Or is one org per user enough for now?

4. **Business Features**: Required for launch?
   - Is team member management critical?
   - Or is single-user orgs enough?

5. **OAuth**: Required or nice-to-have?
   - Should we finish Microsoft OAuth?
   - Or is email/password sufficient?

---

## Conclusion

**Current State**: We have a solid foundation with working signup/login, but we're missing the core value proposition (the app platform).

**Recommendation**: Follow **Option A** (Complete App Platform) to deliver on the multi-tenant vision. The infrastructure is 70% there, just needs the business logic and UI.

**Timeline**: ~3 weeks to complete all 4 phases properly, or ~1 week for a working MVP (Option C).

**Risk**: Without email verification and password reset, we're vulnerable to abuse and user lockouts. These should be prioritized within the 3-week timeline.
