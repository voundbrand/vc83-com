# Task 010: Auth Implementation Phase 1 - Database Schema & Core Setup

**STATUS**: ✅ 95% COMPLETE (as of 2025-10-02)

## Overview
This task breaks down the first phase of Task 009 into actionable chunks. Phase 1 focuses on setting up the Convex database schema, implementing core authentication flows, and ensuring every user has an organization from day one.

**Parent Task**: 009_convex_auth_implementation.md
**Estimated Time**: 2-3 days (ACTUAL: 2 days)
**Priority**: Critical - Blocks all other features

## Implementation Status

✅ **Completed**: Database schema, user registration, authentication, organization management
❌ **Deferred**: Email verification enforcement, Microsoft OAuth, password reset
📝 **See**: [AUTH_STATUS_REVIEW.md](../../AUTH_STATUS_REVIEW.md) for detailed analysis

## Success Criteria
- [x] Every new user automatically gets a private organization ✅
- [x] All database tables have required `orgId` field ✅
- [x] User registration works for both personal and business paths ✅
- [x] Basic session management with organization context ✅
- [x] No data can exist without organization scope ✅

## Phase 1 Breakdown

### 1.1 Initial Convex Setup (2-3 hours)
**File**: `convex/package.json`, `convex/tsconfig.json`

- [ ] Install Convex Auth package
  ```bash
  cd convex
  npm install @convex-dev/auth
  ```
- [ ] Configure TypeScript for Convex
- [ ] Set up Convex environment variables
- [ ] Test basic Convex connection

### 1.2 Database Schema Implementation (3-4 hours)
**File**: `convex/schema.ts`

- [ ] Create complete schema with all tables:
  ```typescript
  // Key tables to implement:
  - users (with defaultOrgId)
  - organizations (with business fields)
  - memberships
  - apps
  - app_access (always requires orgId)
  - contents (always requires orgId)
  ```
- [ ] Add all required indexes for performance
- [ ] Ensure NO optional orgId fields anywhere
- [ ] Add validation rules at schema level

### 1.3 Auth Configuration (2-3 hours)
**File**: `convex/auth.config.ts`

- [ ] Configure authentication providers:
  - Email/password authentication
  - Microsoft OAuth setup
  - Session configuration
- [ ] Set up JWT token handling
- [ ] Configure auth middleware
- [ ] Add organization context to auth session

### 1.4 User Registration Mutations (4-5 hours)
**Files**: `convex/auth.ts`, `convex/users.ts`

- [ ] Implement `signUpPersonal` mutation:
  - Minimal fields (firstName, email, password)
  - Auto-generate creative workspace names
  - Create user + org + membership atomically
  - Fill placeholder business data
  
- [ ] Implement `signUpBusiness` mutation:
  - Full business data collection
  - Validate all required fields
  - Create user + org + membership atomically
  - Proper business data storage

- [ ] Add workspace name generator:
  ```typescript
  const workspaceNames = [
    "Workspace", "Studio", "Lab", "Space", 
    "Hub", "Zone", "Base", "HQ", "Office"
  ];
  ```

### 1.5 Organization Helper Functions (3-4 hours)
**File**: `convex/organizations.ts`

- [ ] Create organization CRUD functions:
  - `createOrganization` - for additional orgs
  - `updateOrganization` - for upgrades/edits
  - `getOrganizationById` - with membership check
  - `getUserOrganizations` - list user's orgs

- [ ] Implement organization validators:
  - Tax ID format validation (German VAT)
  - Required fields checker
  - Business data completeness

### 1.6 Membership Management (2-3 hours)
**File**: `convex/memberships.ts`

- [ ] Core membership functions:
  - `createMembership` - add user to org
  - `removeMembership` - remove from org
  - `updateMemberRole` - change permissions
  - `checkMembership` - verify access

- [ ] Prevent removing last owner
- [ ] Prevent leaving personal organization

### 1.7 Session & Context Management (3-4 hours)
**Files**: `convex/auth.ts`, `convex/helpers.ts`

- [ ] Implement session helpers:
  - `getCurrentUser` - with org context
  - `getCurrentOrganization` - from session
  - `switchOrganization` - update context
  - `validateOrgAccess` - security check

- [ ] Create auth context wrapper:
  ```typescript
  // Every query/mutation uses this pattern:
  export const myQuery = query({
    args: {},
    handler: async (ctx) => {
      const { user, organization } = await getCurrentContext(ctx);
      // All queries automatically have org scope
    }
  });
  ```

### 1.8 Basic Login Flow (2-3 hours)
**File**: `convex/auth.ts`

- [ ] Implement login mutations:
  - Email/password login
  - Microsoft OAuth callback
  - Return user + default org
  - Set session with org context

- [ ] Handle multi-org users:
  - Load user's default org
  - Return list of available orgs
  - Allow org selection

### 1.9 Security & Validation Layer (2-3 hours)
**File**: `convex/security.ts`

- [ ] Create security middleware:
  - Force orgId in all queries
  - Validate user membership
  - Prevent cross-org access
  - Log access attempts

- [ ] TypeScript guards:
  ```typescript
  type OrgScopedQuery<T> = {
    orgId: Id<"organizations">;
    data: T;
  };
  ```

### 1.10 Initial Testing & Validation (2-3 hours)
**File**: `convex/test-auth.ts` (temporary)

- [ ] Test user registration flows:
  - Personal account creation
  - Business account creation
  - Verify org auto-creation
  - Check data integrity

- [ ] Test security boundaries:
  - Attempt cross-org access
  - Verify isolation works
  - Check query scoping

## Development Checklist

### Before Starting
- [ ] Review Task 009 for full context
- [ ] Set up Convex dashboard access
- [ ] Configure local Convex dev environment
- [ ] Understand SOC2 requirements

### During Development
- [ ] Every table has `orgId` field
- [ ] No queries without organization scope
- [ ] Atomic transactions for user+org creation
- [ ] Proper TypeScript types throughout
- [ ] Security-first mindset

### After Completion
- [ ] All tests passing
- [ ] No way to create orphaned data
- [ ] Personal account signup < 30 seconds
- [ ] Business account data validated
- [ ] Ready for frontend integration

## Next Phase Preview
**Task 011**: Frontend Authentication UI
- Login/Register windows
- Organization switcher component  
- Auth context provider
- Protected routes setup

## Notes

### Critical Decisions
1. **No Optional OrgId**: Every single piece of data has an organization
2. **Auto-Create Orgs**: Users always have at least one organization
3. **Placeholder Data**: Personal accounts use minimal required data
4. **Same Security**: Personal and business orgs use identical security

### Common Pitfalls to Avoid
- Don't allow any queries without orgId
- Don't create users without organizations
- Don't make orgId optional "for convenience"
- Don't skip validation on personal accounts
- Don't allow data outside org scope

### Testing Scenarios
1. Register personal account → verify org created
2. Register business account → verify data complete
3. Try to access other org's data → must fail
4. Create additional org → verify isolation
5. Switch organizations → verify context updates

---

**Remember**: This phase sets the security foundation for the entire platform. Every decision here impacts SOC2 compliance and data isolation. When in doubt, choose the more secure option.