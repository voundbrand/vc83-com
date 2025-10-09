/**
 * Test Data Fixtures for RBAC Testing
 *
 * Provides consistent test data for users, roles, permissions, and organizations
 */

import { Id } from "../../convex/_generated/dataModel";

export const TEST_USERS = {
  systemAdmin: {
    _id: "user_system_admin" as Id<"users">,
    email: "admin@system.test",
    name: "System Admin",
    role: "admin" as const,
  },
  orgOwner: {
    _id: "user_org_owner" as Id<"users">,
    email: "owner@org.test",
    name: "Organization Owner",
    role: "user" as const,
  },
  orgManager: {
    _id: "user_org_manager" as Id<"users">,
    email: "manager@org.test",
    name: "Organization Manager",
    role: "user" as const,
  },
  orgMember: {
    _id: "user_org_member" as Id<"users">,
    email: "member@org.test",
    name: "Organization Member",
    role: "user" as const,
  },
  guestUser: {
    _id: "user_guest" as Id<"users">,
    email: "guest@test.test",
    name: "Guest User",
    role: "user" as const,
  },
};

export const TEST_ORGANIZATIONS = {
  primary: {
    _id: "org_primary" as Id<"organizations">,
    name: "Primary Test Organization",
    slug: "primary-test-org",
    ownerId: TEST_USERS.orgOwner._id,
  },
  secondary: {
    _id: "org_secondary" as Id<"organizations">,
    name: "Secondary Test Organization",
    slug: "secondary-test-org",
    ownerId: TEST_USERS.orgOwner._id,
  },
  empty: {
    _id: "org_empty" as Id<"organizations">,
    name: "Empty Test Organization",
    slug: "empty-test-org",
    ownerId: TEST_USERS.systemAdmin._id,
  },
};

export const TEST_ROLES = {
  systemAdmin: {
    _id: "role_system_admin" as Id<"roles">,
    name: "System Administrator",
    description: "Full system access",
    isSystem: true,
    permissions: ["*.*"],
  },
  orgOwner: {
    _id: "role_org_owner" as Id<"roles">,
    name: "Organization Owner",
    description: "Full organization access",
    isSystem: true,
    organizationId: TEST_ORGANIZATIONS.primary._id,
    permissions: ["organizations.*", "users.*", "addresses.*"],
  },
  orgAdmin: {
    _id: "role_org_admin" as Id<"roles">,
    name: "Organization Admin",
    description: "Administrative access within organization",
    isSystem: true,
    organizationId: TEST_ORGANIZATIONS.primary._id,
    permissions: ["organizations.read", "organizations.update", "users.*", "addresses.*"],
  },
  manager: {
    _id: "role_manager" as Id<"roles">,
    name: "Manager",
    description: "Manage users and view data",
    isSystem: false,
    organizationId: TEST_ORGANIZATIONS.primary._id,
    permissions: ["users.read", "users.update", "addresses.read", "addresses.update"],
  },
  member: {
    _id: "role_member" as Id<"roles">,
    name: "Member",
    description: "Basic member access",
    isSystem: false,
    organizationId: TEST_ORGANIZATIONS.primary._id,
    permissions: ["users.read", "addresses.read"],
  },
  customRole: {
    _id: "role_custom" as Id<"roles">,
    name: "Custom Role",
    description: "Custom mixed permissions",
    isSystem: false,
    organizationId: TEST_ORGANIZATIONS.primary._id,
    permissions: ["users.read", "users.create", "addresses.read"],
  },
};

export const TEST_PERMISSIONS = {
  // Resource permissions
  usersCreate: "users.create",
  usersRead: "users.read",
  usersUpdate: "users.update",
  usersDelete: "users.delete",
  usersAll: "users.*",

  // Organization permissions
  organizationsCreate: "organizations.create",
  organizationsRead: "organizations.read",
  organizationsUpdate: "organizations.update",
  organizationsDelete: "organizations.delete",
  organizationsAll: "organizations.*",

  // Address permissions
  addressesCreate: "addresses.create",
  addressesRead: "addresses.read",
  addressesUpdate: "addresses.update",
  addressesDelete: "addresses.delete",
  addressesAll: "addresses.*",

  // Wildcard permissions
  allRead: "*.read",
  allCreate: "*.create",
  allAll: "*.*",
};

export const TEST_USER_ROLES = {
  systemAdminRoles: [TEST_ROLES.systemAdmin._id],
  orgOwnerRoles: [TEST_ROLES.orgOwner._id],
  orgManagerRoles: [TEST_ROLES.manager._id],
  orgMemberRoles: [TEST_ROLES.member._id],
  multipleRoles: [TEST_ROLES.manager._id, TEST_ROLES.member._id],
};

export const TEST_ORGANIZATION_MEMBERS = {
  primary: [
    { userId: TEST_USERS.orgOwner._id, roleId: TEST_ROLES.orgOwner._id },
    { userId: TEST_USERS.orgManager._id, roleId: TEST_ROLES.manager._id },
    { userId: TEST_USERS.orgMember._id, roleId: TEST_ROLES.member._id },
  ],
  secondary: [
    { userId: TEST_USERS.orgOwner._id, roleId: TEST_ROLES.orgOwner._id },
  ],
  empty: [],
};

/**
 * Helper to generate test context for permission checks
 */
export function createTestContext(userId: Id<"users">, organizationId?: Id<"organizations">) {
  return {
    userId,
    organizationId,
  };
}

/**
 * Helper to create a test permission check
 */
export function createPermissionCheck(
  resource: string,
  action: string,
  resourceId?: string,
  organizationId?: Id<"organizations">
) {
  return {
    resource,
    action,
    resourceId,
    organizationId,
  };
}
