# Role-Based Access Control (RBAC) - End User Guide

## Overview

L4YERCAK3.com uses a comprehensive Role-Based Access Control (RBAC) system to manage what users can do within the platform. This guide explains the different roles, their permissions, and how role assignment works.

---

## Understanding Roles

Roles determine what actions you can perform in the system. Each role has a specific set of permissions that control access to features and data.

### Role Hierarchy

Roles are organized in a hierarchy from highest to lowest privilege:

```
┌─────────────────────────────────────────┐
│  1. Super Admin                          │  ← Highest privilege
├─────────────────────────────────────────┤
│  2. Enterprise Owner                     │
├─────────────────────────────────────────┤
│  3. Organization Owner                   │
├─────────────────────────────────────────┤
│  4. Business Manager                     │
├─────────────────────────────────────────┤
│  5. Employee / Translator (Specialized)  │
├─────────────────────────────────────────┤
│  6. Viewer                               │  ← Lowest privilege
└─────────────────────────────────────────┘
```

**Important**: You can only assign roles that are **below** your own role in the hierarchy.

---

## Role Descriptions

### 🔴 Super Admin (System Level)

**Who should have this role?** Platform administrators only

**Description**: Complete system access with no restrictions. Super Admins can manage the entire platform, all organizations, and all users.

**Key Permissions**:
- ✅ All permissions (unrestricted access)
- ✅ Manage ontology system (data structure and relationships)
- ✅ Create system organizations
- ✅ Assign any role to any user
- ✅ Access all features across all organizations

**Can Assign**: All roles (super_admin, enterprise_owner, org_owner, business_manager, employee, translator, viewer)

---

### 🟠 Enterprise Owner

**Who should have this role?** Users who manage multiple organizations across the platform

**Description**: Can create and manage multiple organizations system-wide. Perfect for enterprise clients or partners managing multiple business units.

**Key Permissions**:
- ✅ Create new organizations (system-wide)
- ✅ Manage organization settings
- ✅ Manage users and assign roles
- ✅ Manage roles and permissions
- ✅ Full financial management (billing, invoices)
- ✅ Full operational control (tasks, projects, events)
- ✅ Install and manage apps
- ✅ View audit logs
- ✅ Create and export reports

**Cannot Do**:
- ❌ Manage system ontology (Super Admin only)
- ❌ Assign Super Admin role

**Can Assign**: org_owner, business_manager, employee, translator, viewer

---

### 🟡 Organization Owner

**Who should have this role?** The owner or primary administrator of a single organization

**Description**: Full control over a single organization including billing, team management, and all operational features.

**Key Permissions**:
- ✅ Manage organization settings
- ✅ Manage users and assign roles
- ✅ Manage roles and permissions
- ✅ Full financial management (billing, invoices, approve invoices)
- ✅ Full operational control (tasks, projects, events)
- ✅ Install and manage apps
- ✅ View audit logs
- ✅ Create and export reports

**Cannot Do**:
- ❌ Create new organizations (Enterprise Owner only)
- ❌ Manage system ontology (Super Admin only)
- ❌ Assign Super Admin or Enterprise Owner roles

**Can Assign**: business_manager, employee, translator, viewer

---

### 🟢 Business Manager

**Who should have this role?** Project managers, event coordinators, team leads

**Description**: Manages daily operations and teams. Can assign tasks, create invoices, and manage apps, but cannot change organization settings or manage billing.

**Key Permissions**:
- ✅ Manage team members (invite, remove, assign roles below manager)
- ✅ View roles and permissions
- ✅ Full operational control (create, assign, execute tasks)
- ✅ Create invoices (cannot approve)
- ✅ Create reports
- ✅ Install and manage apps
- ✅ View organization details
- ✅ View financial reports

**Cannot Do**:
- ❌ Change organization settings
- ❌ Manage billing/subscriptions
- ❌ Approve invoices
- ❌ Assign Organization Owner or higher roles
- ❌ View audit logs

**Can Assign**: employee, translator, viewer

---

### 🔵 Employee

**Who should have this role?** Regular team members executing daily tasks

**Description**: Can perform assigned work and create their own tasks. Read access to most areas.

**Key Permissions**:
- ✅ Update own profile
- ✅ Execute assigned tasks
- ✅ Create new tasks
- ✅ View organization details
- ✅ View team members
- ✅ View operational data (tasks, projects)
- ✅ View apps
- ✅ View reports

**Cannot Do**:
- ❌ Manage other users
- ❌ Assign tasks to others
- ❌ Create invoices
- ❌ Install apps
- ❌ Change any settings
- ❌ Assign roles

**Can Assign**: None (cannot assign roles)

---

### 🟣 Translator (Specialized Role)

**Who should have this role?** Users managing translations and internationalization

**Description**: Specialized role focused on translation management. Same privilege level as Employee but with translation-specific permissions.

**Key Permissions**:
- ✅ View translations and progress
- ✅ Create and edit translations
- ✅ Approve translations
- ✅ View organization details
- ✅ View team members
- ✅ Update own profile

**Cannot Do**:
- ❌ Manage users or roles
- ❌ Access operational features (tasks, projects)
- ❌ Create invoices or reports
- ❌ Install apps
- ❌ Assign roles

**Can Assign**: None (cannot assign roles)

---

### ⚪ Viewer

**Who should have this role?** Auditors, stakeholders, or external reviewers needing read-only access

**Description**: Read-only access to most areas. Cannot make any changes or perform any actions.

**Key Permissions**:
- ✅ View organization details
- ✅ View team members
- ✅ View roles and permissions
- ✅ View operational data (tasks, projects)
- ✅ View financial reports
- ✅ View reports and analytics
- ✅ View installed apps

**Cannot Do**:
- ❌ Make any changes
- ❌ Create anything
- ❌ Execute tasks
- ❌ Update own profile (except through org owner)
- ❌ Assign roles

**Can Assign**: None (cannot assign roles)

---

## Permission Categories

Permissions are organized into categories for easier understanding:

### 📋 Organization Management
- Manage organization settings
- View organization details
- Create system organizations (Enterprise Owner only)

### 👥 User Management
- Invite and remove users
- Assign roles (based on hierarchy)
- Update user profiles
- View team members

### 💰 Financial Management
- Manage billing and subscriptions
- Create invoices
- Approve invoices
- View financial reports

### 🔧 Operations Management
- Manage tasks, projects, and events
- Create and assign tasks
- Execute assigned work
- View operational data

### 📊 Reporting & Analytics
- Create custom reports
- View dashboards
- Export data
- View audit logs

### 🛠️ App Management
- Install apps from marketplace
- Configure installed apps
- View app configurations

### 🌐 Translation Management
- View translations
- Create and edit translations
- Approve translations

### 🔐 System Administration (Super Admin Only)
- Manage ontology system
- Create system organizations
- Access all features unrestricted

---

## Role Assignment Rules

### Who Can Assign Roles?

You can only assign roles that are **below** your current role in the hierarchy:

| Your Role | Can Assign These Roles |
|-----------|------------------------|
| **Super Admin** | All roles (super_admin, enterprise_owner, org_owner, business_manager, employee, translator, viewer) |
| **Enterprise Owner** | org_owner, business_manager, employee, translator, viewer |
| **Organization Owner** | business_manager, employee, translator, viewer |
| **Business Manager** | employee, translator, viewer |
| **Employee** | Cannot assign roles |
| **Translator** | Cannot assign roles |
| **Viewer** | Cannot assign roles |

### Security Rules

✅ **You CAN**:
- Assign roles below your hierarchy level
- View all available roles in your organization
- Update user profiles (if you have manage_users permission)

❌ **You CANNOT**:
- Assign a role equal to or higher than your own
- Assign yourself a higher role
- Bypass role hierarchy restrictions

---

## How to Manage Roles

### Viewing User Roles

1. Navigate to the **Manage** window (requires `manage_users` or `view_users` permission)
2. View the user list with their current roles
3. Click on a user to see their full profile and permissions

### Assigning Roles

1. Navigate to the **Manage** window
2. Click **Edit** on a user row
3. In the modal, you'll see a **Role** dropdown
4. The dropdown only shows roles you're allowed to assign
5. Select the appropriate role
6. Click **Save Changes**

**Note**: If you cannot see certain roles in the dropdown, it means they are at or above your hierarchy level and you don't have permission to assign them.

### Creating Custom Roles (Advanced)

Only **Super Admin** and **Organization Owner** roles can create custom roles:

1. Navigate to **Settings** → **Roles & Permissions**
2. Click **Create New Role**
3. Assign specific permissions to the role
4. Save the role

*Custom role creation may be restricted based on your organization's plan.*

---

## Common Scenarios

### Scenario 1: Setting Up a New Organization

**Recommended Role Assignment**:
1. **Organization Owner** → Primary business owner
2. **Business Manager** → Operations lead, project managers
3. **Employee** → Team members executing work
4. **Viewer** → External stakeholders, auditors

### Scenario 2: Managing Multiple Organizations

**Recommended Approach**:
1. Request **Enterprise Owner** role from Super Admin
2. Create separate organizations for each business unit
3. Assign **Organization Owner** to each business unit leader
4. Each org owner manages their own team

### Scenario 3: Translation Team

**Recommended Role Assignment**:
1. **Business Manager** → Translation team lead (can assign translators)
2. **Translator** → Translation team members
3. Use specialized translation permissions for workflow management

---

## Frequently Asked Questions

### Why can't I see all roles in the dropdown?

You can only assign roles below your hierarchy level. This is a security feature to prevent privilege escalation.

### Can I have multiple roles?

Each user has one role per organization. However, if you're a Super Admin, you have a global role that applies across all organizations.

### What happens if my role changes?

Your permissions update immediately. You may lose access to certain features if your new role has fewer permissions.

### Can I create custom permissions?

Only Super Admin can create custom permissions. Organization Owners can create custom roles using existing permissions.

### What's the difference between Enterprise Owner and Organization Owner?

- **Enterprise Owner**: Can create **multiple organizations** system-wide
- **Organization Owner**: Full control over **one organization** only

### How do I request a role change?

Contact your Organization Owner or someone with `manage_users` permission. They can update your role if they have the appropriate hierarchy level.

---

## Best Practices

### ✅ Do's

- **Principle of Least Privilege**: Assign the lowest role that provides necessary permissions
- **Regular Reviews**: Periodically review user roles and remove unnecessary access
- **Clear Role Assignment**: Assign roles based on job function, not individual requests
- **Documentation**: Document why specific users have elevated roles
- **Training**: Ensure users understand their role's capabilities and limitations

### ❌ Don'ts

- **Don't Over-Assign**: Avoid giving everyone Organization Owner or Business Manager roles
- **Don't Skip Hierarchy**: Don't try to work around role hierarchy restrictions
- **Don't Share Accounts**: Each user should have their own account with the appropriate role
- **Don't Ignore Audit Logs**: Review audit logs regularly for unusual role assignments

---

## Support

Need help with roles or permissions?

1. **Check this documentation** for role capabilities
2. **Contact your Organization Owner** for role changes
3. **Contact platform support** for technical issues or Super Admin requests

---

## Changelog

### Version 1.1 (Current)
- Added **Enterprise Owner** role for multi-organization management
- Implemented hierarchical role assignment restrictions
- Added **Translator** specialized role
- Enhanced permission granularity

### Version 1.0
- Initial RBAC implementation
- Base roles: Super Admin, Org Owner, Business Manager, Employee, Viewer
- 30 base permissions across 8 categories

---

*Last Updated: 2025-10-09*
*Document Version: 1.1*
