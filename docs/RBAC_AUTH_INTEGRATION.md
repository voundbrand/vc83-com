# RBAC and Auth Integration Documentation

## Overview

We have successfully integrated a comprehensive Role-Based Access Control (RBAC) system with the authentication system for the l4yercak3.com invite-only platform.

## Key Features

### 1. Invite-Only Authentication
- Users must be pre-created by administrators
- New users set up their password on first login
- Sessions are managed server-side with 24-hour expiration

### 2. Hierarchical RBAC System
The system implements five hierarchical roles:

1. **Super Admin** (Global)
   - Complete platform access
   - Can manage all organizations
   - Bypass all permission checks

2. **Organization Owner**
   - Full control of their organization
   - Billing and subscription management
   - Team and user management

3. **Business Manager**
   - Operational management
   - Team coordination
   - App installation and management
   - Cannot access billing

4. **Employee**
   - Day-to-day task execution
   - Limited to assigned work
   - Can update own profile

5. **Viewer**
   - Read-only access
   - For audits and reviews

### 3. Multi-Organization Support
- Users can belong to multiple organizations
- Each user has a role per organization
- Users can switch between organizations
- Super admins have global access

## Database Schema

### Core Tables
- `users` - User profiles with global role support
- `organizations` - Company/organization entities
- `organizationMembers` - User-organization relationships
- `roles` - Role definitions
- `permissions` - Granular permission definitions
- `rolePermissions` - Role-permission mappings
- `sessions` - Active user sessions
- `userPasswords` - Secure password storage
- `auditLogs` - SOC2-compliant audit trail

## Authentication Flow

### First-Time Setup (Invite-Only)
1. Admin creates user with email and assigns to organization
2. User receives invite (email implementation pending)
3. User visits login page, enters email
4. System detects no password set, redirects to setup
5. User sets password and completes profile
6. Session created, user logged in

### Regular Sign-In
1. User enters email and password
2. System validates credentials
3. Session created with 24-hour expiration
4. User context loaded with organizations and permissions

## Authorization System

### Permission Checking
The system provides multiple levels of permission checking:

#### Backend (Convex)
```typescript
// Check single permission
const canEdit = await canUserPerform({
  sessionId,
  permission: "manage_users",
  resource: "users",
  organizationId
});

// Check multiple permissions
const permissions = await canUserPerformMany({
  sessionId,
  permissions: ["view_reports", "create_invoice"],
  organizationId
});
```

#### Frontend (React)
```typescript
// Using hooks
const { canPerform } = useAuth();
const canManageUsers = canPerform("manage_users");

// Convenience hooks
const isSuperAdmin = useIsSuperAdmin();
const isOrgOwner = useIsOrgOwner();
const isManager = useIsManager();

// Permission-based UI
{canPerform("manage_users") && <AdminPanel />}
```

## Seeded Users

### 1. Super Admin
- Email: remington@voundbrand.com
- Name: Remington Voundbrand
- Organization: Voundbrand (Owner)
- Access: Global super admin

### 2. Organization Manager
- Email: itsmetherealremington@gmail.com
- Name: Max Manager
- Organization: Voundbrand (Business Manager)
- Access: Operational management

## API Endpoints

### Authentication
- `auth.checkNeedsPasswordSetup` - Check if user needs password
- `auth.setupPassword` - First-time password setup
- `auth.signIn` - Regular sign-in
- `auth.signOut` - End session
- `auth.getCurrentUser` - Get full user context
- `auth.switchOrganization` - Change active organization

### Permission Checking
- `auth.canUserPerform` - Check single permission
- `auth.canUserPerformMany` - Check multiple permissions
- `rbac.isSuperAdmin` - Quick super admin check

### Management
- `rbac.assignRoleToOrganization` - Assign user role
- `rbac.getAuditLogs` - View audit trail
- `seedAdmin.createSuperAdminUser` - Create super admin
- `seedAdmin.createOrgManagerUser` - Create org user

## Security Features

1. **Password Security**
   - Currently using base64 for demo (NOT SECURE)
   - TODO: Implement bcrypt or argon2

2. **Session Management**
   - Server-side sessions
   - 24-hour expiration
   - Secure session IDs

3. **Audit Logging**
   - All permission checks logged
   - User actions tracked
   - SOC2-compliant trail

4. **Permission Isolation**
   - Per-organization permissions
   - No cross-organization access (except super admin)
   - Granular resource-action pairs

## Usage Examples

### Creating a New User (Admin)
```typescript
// Backend - Create user with role
await createOrgManagerUser({
  email: "newuser@company.com",
  firstName: "John",
  lastName: "Doe",
  organizationId: orgId,
  roleId: roleId
});
```

### Checking Permissions in UI
```tsx
function AdminDashboard() {
  const { user, canPerform } = useAuth();
  const canManageUsers = usePermission("manage_users");

  if (!canManageUsers) {
    return <AccessDenied />;
  }

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {canPerform("manage_financials") && <BillingSection />}
      {canPerform("install_apps") && <AppStore />}
    </div>
  );
}
```

### Organization Switching
```tsx
function OrgSwitcher() {
  const { user, switchOrganization } = useAuth();
  const orgs = useOrganizations();

  return (
    <select onChange={(e) => switchOrganization(e.target.value)}>
      {orgs.map(org => (
        <option key={org.id} value={org.id}>
          {org.name} ({org.role.name})
        </option>
      ))}
    </select>
  );
}
```

## Next Steps

1. **Email Integration**
   - Set up email service for invites
   - Password reset functionality
   - Email verification

2. **OAuth Integration**
   - Microsoft Entra ID for enterprise SSO
   - Google/GitHub for developer accounts

3. **Security Enhancements**
   - Implement proper password hashing
   - Add 2FA support
   - Rate limiting on auth endpoints

4. **UI Components**
   - User management interface
   - Role assignment UI
   - Permission viewer
   - Audit log viewer

## Scripts

### Seed RBAC System
```bash
npx tsx scripts/seed-rbac.ts
```

### Create Super Admin
```bash
npx tsx scripts/seed-super-admin.ts
```

### Create Organization Manager
```bash
npx tsx scripts/seed-org-manager.ts
```

### Test RBAC Permissions
```bash
npx tsx scripts/test-rbac.ts
```

## Troubleshooting

### User Can't Login
1. Check if user exists: Query `users` table
2. Verify password is set: Check `userPasswords` table
3. Confirm organization membership: Check `organizationMembers`
4. Validate role assignment: Verify role in membership

### Permission Denied
1. Check user's role in organization
2. Verify role has required permission
3. Confirm user is in correct organization
4. Check if super admin bypass applies

### Session Issues
1. Verify session exists and not expired
2. Check localStorage for session ID
3. Confirm session matches user
4. Validate organization context