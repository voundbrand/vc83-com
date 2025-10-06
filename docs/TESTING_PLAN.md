# Comprehensive Testing Plan for RBAC & Organization System

**Created**: 2025-10-06
**Status**: 🔄 IN PROGRESS
**Testing Framework**: Vitest + convex-test

---

## 📊 System Architecture Overview

### **1. Authentication System**
- **Invite-only**: Users must be pre-created by admins
- **First-time setup**: New users set password on first login
- **Session management**: Server-side sessions with 24-hour expiration
- **Password security**: bcrypt hashing (recently implemented)

### **2. RBAC Hierarchy** (5 Roles)

```
┌─────────────────────────────────────┐
│  1. SUPER ADMIN (Global)            │  ← Bypass all checks, manage all orgs
├─────────────────────────────────────┤
│  2. ORG OWNER (Per-Organization)    │  ← Full control, billing, team management
├─────────────────────────────────────┤
│  3. BUSINESS MANAGER (Per-Org)      │  ← Operations, team coordination, apps
├─────────────────────────────────────┤
│  4. EMPLOYEE (Per-Org)              │  ← Day-to-day tasks, limited access
├─────────────────────────────────────┤
│  5. VIEWER (Per-Org)                │  ← Read-only access
└─────────────────────────────────────┘
```

### **3. Permission Categories** (7 Categories)

1. **Organization Management**: Create/update org settings
2. **User Management**: Invite, remove, assign roles
3. **Financials**: Billing, subscriptions, invoices
4. **Operations**: Day-to-day business operations
5. **Reporting**: View analytics and reports
6. **App Management**: Install/configure apps
7. **Vertical-Specific**: Industry-specific permissions

### **4. Multi-Organization Support**
- Users can belong to **multiple organizations**
- Each user has a **different role per organization**
- Users can **switch between organizations**
- Super admins have **global access across all orgs**

### **5. Database Schema**

```
users
├── _id: Id<"users">
├── email: string (unique)
├── firstName?: string
├── lastName?: string
├── global_role_id?: Id<"roles">  ← Super Admin role
└── isPasswordSet: boolean

organizations
├── _id: Id<"organizations">
├── name: string
├── subdomain: string (unique)
└── ownerId: Id<"users">

organizationMembers
├── _id: Id<"organizationMembers">
├── organizationId: Id<"organizations">
├── userId: Id<"users">
├── role: Id<"roles">              ← Per-org role
└── status: "active" | "pending" | "inactive"

roles
├── _id: Id<"roles">
├── name: string
├── description: string
├── hierarchy: number (0-4)
└── isActive: boolean

permissions
├── _id: Id<"permissions">
├── name: string
├── resource: string
├── action: "read" | "write" | "delete"
├── category: string
└── description: string

rolePermissions
├── _id: Id<"rolePermissions">
├── roleId: Id<"roles">
└── permissionId: Id<"permissions">

sessions
├── _id: Id<"sessions">
├── userId: Id<"users">
├── organizationId?: Id<"organizations">
└── expiresAt: number

userPasswords
├── _id: Id<"userPasswords">
├── userId: Id<"users">
└── passwordHash: string (bcrypt)

auditLogs
├── _id: Id<"auditLogs">
├── userId: Id<"users">
├── organizationId?: Id<"organizations">
├── action: string
├── resource: string
├── success: boolean
└── metadata?: object
```

---

## 🎯 Testing Strategy

### **Phase 1: Unit Tests (Backend Logic)**
Test individual functions in isolation using `convex-test`.

### **Phase 2: Integration Tests (Full Flows)**
Test complete workflows (signup → login → permission checks).

### **Phase 3: E2E Tests (UI + Backend)**
Test user interactions through the React UI.

---

## 📋 Test Suites

### **Suite 1: Authentication Tests** ✅ Priority: HIGH

**File**: `__tests__/auth.test.ts`

#### **Test Cases**:

1. ✅ **First-Time User Setup Flow**
   - Given: User created by admin, no password set
   - When: User enters email
   - Then: System detects `needsSetup: true`
   - When: User sets password
   - Then: Password hashed with bcrypt, session created
   - Verify: `userPasswords` record exists, `isPasswordSet: true`

2. ✅ **Returning User Sign-In**
   - Given: User has password set
   - When: User enters correct email + password
   - Then: Session created, user logged in
   - Verify: Session expires in 24 hours

3. ✅ **Invalid Credentials**
   - Given: User exists with password
   - When: User enters wrong password
   - Then: Error thrown, no session created
   - Verify: Audit log shows failed login

4. ✅ **Non-Existent User Login**
   - Given: Email not in system
   - When: User tries to check email
   - Then: Returns `userExists: false`
   - Verify: No password setup allowed

5. ✅ **Session Expiration**
   - Given: User logged in with session
   - When: 24+ hours pass
   - Then: Session marked expired
   - When: User tries to use expired session
   - Then: `getCurrentUser` returns null

6. ✅ **Sign Out**
   - Given: Active user session
   - When: User signs out
   - Then: Session deleted from DB
   - Verify: Subsequent calls with sessionId fail

---

### **Suite 2: RBAC Permission Tests** ✅ Priority: HIGH

**File**: `__tests__/rbac.permissions.test.ts`

#### **Test Cases**:

1. ✅ **Super Admin Bypass**
   - Given: User with `global_role_id` pointing to super_admin role
   - When: Check any permission in any organization
   - Then: Always returns `true` (bypass)
   - Verify: Works across multiple organizations

2. ✅ **Org Owner Full Access**
   - Given: User is org_owner in Organization A
   - When: Check `manage_organization`, `manage_users`, `manage_financials`
   - Then: All return `true` for Organization A
   - When: Check same permissions in Organization B (where user is viewer)
   - Then: All return `false`

3. ✅ **Business Manager Permissions**
   - Given: User is business_manager in org
   - When: Check `manage_users`, `install_apps`, `view_reports`
   - Then: Returns `true`
   - When: Check `manage_financials` (billing)
   - Then: Returns `false` (managers can't access billing)

4. ✅ **Employee Limited Access**
   - Given: User is employee in org
   - When: Check `view_reports`, `execute_tasks`
   - Then: Returns `true`
   - When: Check `manage_users`, `install_apps`
   - Then: Returns `false`

5. ✅ **Viewer Read-Only**
   - Given: User is viewer in org
   - When: Check any `read` permission
   - Then: Returns `true`
   - When: Check any `write` or `delete` permission
   - Then: Returns `false`

6. ✅ **Cross-Organization Isolation**
   - Given: User is org_owner in Org A, employee in Org B
   - When: Check `manage_users` in Org A
   - Then: Returns `true`
   - When: Check `manage_users` in Org B
   - Then: Returns `false`

7. ✅ **Permission Inheritance (Hierarchical)**
   - Given: Role hierarchy: super_admin > org_owner > manager > employee > viewer
   - When: Higher role checks lower role's permission
   - Then: Should return `true` (if hierarchy respected)
   - Note: Verify if your system implements this

---

### **Suite 3: Multi-Organization Tests** ✅ Priority: HIGH

**File**: `__tests__/multi-organization.test.ts`

#### **Test Cases**:

1. ✅ **User Belongs to Multiple Organizations**
   - Given: User is member of Org A (owner) and Org B (employee)
   - When: Call `getCurrentUser`
   - Then: Returns both organizations with correct roles
   - Verify: `user.organizations.length === 2`

2. ✅ **Switch Organization Context**
   - Given: User in session with Org A active
   - When: Call `switchOrganization(orgBId)`
   - Then: Session updated to Org B
   - When: Check permissions
   - Then: Permissions reflect Org B role

3. ✅ **Create User and Auto-Assign to Organization**
   - Given: Admin creates new user via `adminCreateUser`
   - When: Provide `organizationId` and `roleId`
   - Then: User created + `organizationMembers` record created
   - Verify: User appears in organization with correct role

4. ✅ **Invite User to Second Organization**
   - Given: User exists in Org A
   - When: Org B owner invites user with `inviteUserToOrganization`
   - Then: New `organizationMembers` record created
   - Verify: User now has 2 organizations

5. ✅ **Remove User from Organization**
   - Given: User belongs to Org A and Org B
   - When: Remove user from Org A
   - Then: `organizationMembers` record deleted or status = "inactive"
   - Verify: User still has access to Org B

6. ✅ **Super Admin Access to All Organizations**
   - Given: Super admin user
   - When: Query any organization's data
   - Then: Access granted without membership requirement
   - Verify: Can manage any org even without `organizationMembers` record

---

### **Suite 4: Role Assignment Tests** ✅ Priority: MEDIUM

**File**: `__tests__/role-assignment.test.ts`

#### **Test Cases**:

1. ✅ **Assign Role to User in Organization**
   - Given: User and organization exist
   - When: Admin calls `assignRoleToOrganization`
   - Then: `organizationMembers.role` updated
   - Verify: Permissions reflect new role

2. ✅ **Upgrade User Role (Employee → Manager)**
   - Given: User is employee in org
   - When: Owner upgrades to business_manager
   - Then: Role updated, permissions expanded
   - Verify: User can now `install_apps` (manager perm)

3. ✅ **Downgrade User Role (Owner → Employee)**
   - Given: User is org_owner
   - When: Super admin downgrades to employee
   - Then: Role updated, permissions restricted
   - Verify: User can no longer `manage_financials`

4. ✅ **Assign Super Admin (Global Role)**
   - Given: Regular user
   - When: Super admin assigns `global_role_id`
   - Then: User becomes super admin
   - Verify: Bypass works, access to all orgs

5. ✅ **Prevent Self-Demotion (Org Owner)**
   - Given: User is org_owner
   - When: User tries to downgrade their own role
   - Then: Error thrown (business rule)
   - Note: Implement if not already present

---

### **Suite 5: Audit Logging Tests** ✅ Priority: MEDIUM

**File**: `__tests__/audit-logs.test.ts`

#### **Test Cases**:

1. ✅ **Log Successful Login**
   - Given: User signs in
   - When: Login succeeds
   - Then: Audit log created with `action: "sign_in"`, `success: true`

2. ✅ **Log Failed Login**
   - Given: User enters wrong password
   - When: Login fails
   - Then: Audit log created with `action: "sign_in"`, `success: false`

3. ✅ **Log Permission Check**
   - Given: User checks permission
   - When: `canUserPerform` called
   - Then: Audit log created (optional based on sensitivity)

4. ✅ **Log Role Assignment**
   - Given: Admin assigns role to user
   - When: `assignRoleToOrganization` succeeds
   - Then: Audit log shows who, what, when
   - Verify: Includes `metadata` with role details

5. ✅ **Query Audit Logs (SOC2 Compliance)**
   - Given: Multiple audit logs exist
   - When: Admin queries logs with filters (date range, user, action)
   - Then: Returns matching logs
   - Verify: Proper pagination

---

### **Suite 6: User Invitation Flow Tests** ✅ Priority: MEDIUM

**File**: `__tests__/user-invitations.test.ts`

#### **Test Cases**:

1. ✅ **Admin Creates New User**
   - Given: Admin user in organization
   - When: Admin calls `adminCreateUser` with email, role
   - Then: User created with `isPasswordSet: false`
   - Verify: User appears in organization with role

2. ✅ **Invite User to Organization (Existing User)**
   - Given: User exists in Org A
   - When: Org B invites via `inviteUserToOrganization`
   - Then: New membership created with `status: "pending"`
   - Verify: User doesn't get access until they accept (if implemented)

3. ✅ **Invite User (Non-Existent Email)**
   - Given: Email doesn't exist in system
   - When: Admin invites user
   - Then: Create new user + organization membership
   - Verify: `isPasswordSet: false`, waiting for setup

4. ✅ **User Accepts Invitation** (If implemented)
   - Given: User has pending invitation
   - When: User sets password
   - Then: Membership status → "active"
   - Verify: User can access organization

5. ✅ **Revoke Invitation**
   - Given: Pending invitation exists
   - When: Admin revokes invitation
   - Then: Membership deleted or status → "inactive"
   - Verify: User cannot access organization

---

### **Suite 7: Organization Management Tests** ✅ Priority: MEDIUM

**File**: `__tests__/organization-management.test.ts`

#### **Test Cases**:

1. ✅ **Create Organization**
   - Given: Admin user
   - When: Create new organization
   - Then: Organization created with owner
   - Verify: Creator auto-assigned as org_owner

2. ✅ **Update Organization Settings**
   - Given: Org owner user
   - When: Update organization name, settings
   - Then: Organization updated
   - Verify: Non-owners cannot update

3. ✅ **Delete Organization**
   - Given: Organization exists with members
   - When: Owner deletes organization
   - Then: Organization marked deleted
   - Verify: All members lose access

4. ✅ **List Users in Organization**
   - Given: Organization with 5 members
   - When: Owner queries members
   - Then: Returns all 5 with roles
   - Verify: Non-members cannot see list

5. ✅ **Transfer Ownership**
   - Given: Org has owner and manager
   - When: Owner transfers to manager
   - Then: Manager becomes owner, old owner downgraded
   - Verify: New owner has full access

---

### **Suite 8: Edge Cases & Security Tests** ✅ Priority: HIGH

**File**: `__tests__/security.test.ts`

#### **Test Cases**:

1. ✅ **Session Hijacking Prevention**
   - Given: User A has valid session
   - When: User B tries to use User A's sessionId
   - Then: Verify session belongs to correct user
   - Note: Check if userId validation exists

2. ✅ **SQL Injection Prevention** (Not applicable - NoSQL)
   - Skip - Convex uses typed queries

3. ✅ **Cross-Organization Data Leak**
   - Given: User in Org A
   - When: User queries data from Org B
   - Then: Access denied
   - Verify: No way to bypass org isolation

4. ✅ **Expired Session Handling**
   - Given: Session expired 1 hour ago
   - When: User tries to use expired session
   - Then: Returns null/error
   - Verify: Session cleanup happens

5. ✅ **Password Reset Security** (If implemented)
   - Given: User requests password reset
   - When: Reset token generated
   - Then: Token expires after 1 hour
   - Verify: Token single-use only

6. ✅ **Concurrent Role Changes**
   - Given: User role being changed
   - When: Two admins change role simultaneously
   - Then: Last write wins (or error)
   - Verify: No race condition bugs

7. ✅ **Null/Undefined Organization Context**
   - Given: Session without organizationId
   - When: Check organization-scoped permission
   - Then: Graceful error or default behavior
   - Verify: No crashes

---

## 🚀 Implementation Priority

### **Phase 1: Critical Path** (Week 1)
1. ✅ Suite 1: Authentication Tests (Login, password setup, sessions)
2. ✅ Suite 2: RBAC Permission Tests (Core permission logic)
3. ✅ Suite 8: Security Tests (Prevent data leaks)

### **Phase 2: Core Features** (Week 2)
4. ✅ Suite 3: Multi-Organization Tests
5. ✅ Suite 4: Role Assignment Tests
6. ✅ Suite 6: User Invitation Flow Tests

### **Phase 3: Advanced Features** (Week 3)
7. ✅ Suite 5: Audit Logging Tests
8. ✅ Suite 7: Organization Management Tests

---

## 🧪 Testing Tools & Setup

### **Vitest Configuration**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
});
```

### **Convex Test Setup**
```typescript
// test/setup.ts
import { ConvexTestingHelper } from 'convex-test';

export async function setupTestEnvironment() {
  const t = new ConvexTestingHelper();
  await t.mutation(api.rbac.seedRoles);
  await t.mutation(api.rbac.seedPermissions);
  return t;
}
```

---

## 📊 Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: All critical user flows
- **E2E Tests**: Happy paths for each role

---

## 🔄 Continuous Integration

**GitHub Actions Workflow**:
```yaml
- Run: npm run test
- Coverage: Upload to Codecov
- Required: All tests pass before merge
```

---

## ✅ Definition of Done

- [ ] All 8 test suites implemented
- [ ] 80%+ code coverage
- [ ] CI/CD pipeline running tests
- [ ] All critical paths tested
- [ ] Security tests passing
- [ ] Documentation updated

---

**Next Steps**: Start with Suite 1 (Authentication Tests) in `__tests__/auth.test.ts`
