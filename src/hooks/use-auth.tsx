"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, createContext, useContext, ReactNode, useEffect } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useWindowManager } from "./use-window-manager";

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  role: Role;
  permissions: Permission[];
  isOwner: boolean;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  hasPasskey: boolean; // Whether user has set up passkey authentication
  isSuperAdmin: boolean;
  globalRole?: Role | null;
  organizations: Organization[];
  currentOrganization?: Organization | null;
  defaultOrgId?: Id<"organizations"> | null;
  scheduledDeletionDate?: number; // Timestamp for account deletion grace period
}

interface AuthContextType {
  user: User | null;
  isSignedIn: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  permissions: string[]; // Array of permission names for current org
  signIn: (email: string, password: string) => Promise<void>;
  setupPassword: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  checkNeedsPasswordSetup: (email: string) => Promise<{ userExists: boolean; needsSetup: boolean; userName: string | null }>;
  signOut: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  canPerform: (permission: string, resource?: string, organizationId?: string) => boolean;
  canPerformMany: (permissions: string[], organizationId?: string) => Record<string, boolean>;
  sessionId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize sessionId synchronously from localStorage to avoid race conditions
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("convex_session_id");
    }
    return null;
  });

  const { closeAllWindows } = useWindowManager();
  const userQuery = useQuery(
    api.auth.getCurrentUser,
    sessionId ? { sessionId } : { sessionId: undefined }
  );

  // Proactively clear invalid sessions
  // If we have a sessionId but the query returns null, the session is invalid
  useEffect(() => {
    if (sessionId && userQuery === null) {
      console.log("[Auth] Session invalid, clearing localStorage");
      localStorage.removeItem("convex_session_id");
      setSessionId(null);
    }
  }, [sessionId, userQuery]);

  const signInAction = useAction(api.auth.signIn);
  const setupPasswordAction = useAction(api.auth.setupPassword);
  const signOutMutation = useMutation(api.auth.signOut);
  const switchOrgMutation = useMutation(api.auth.switchOrganization);
  const setDefaultOrgMutation = useMutation(api.auth.setDefaultOrganization);

  const signIn = async (email: string, password: string) => {
    const result = await signInAction({ email, password });
    if (result.sessionId) {
      localStorage.setItem("convex_session_id", result.sessionId);
      setSessionId(result.sessionId);
    }
  };

  const setupPassword = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const result = await setupPasswordAction({ email, password, firstName, lastName });
    if (result.sessionId) {
      localStorage.setItem("convex_session_id", result.sessionId);
      setSessionId(result.sessionId);
    }
  };

  const checkNeedsPasswordSetup = async (email: string) => {
    // We'll use the Convex client directly for this query
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("Convex URL not configured");
    }

    const response = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: "auth:checkNeedsPasswordSetup",
        args: { email },
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to check user status");
    }

    const result = await response.json();
    return result.value || { userExists: false, needsSetup: false, userName: null };
  };

  const signOut = async () => {
    if (sessionId) {
      // Close all windows before signing out to prevent permission issues
      closeAllWindows();
      try {
        await signOutMutation({ sessionId });
      } catch (error) {
        // Session may already be deleted (e.g., from account deletion)
        // Log but don't throw - we still need to clean up localStorage
        console.log("[Auth] signOut mutation error (session may be deleted):", error);
      }
      // Always clear localStorage and session state, regardless of mutation result
      localStorage.removeItem("convex_session_id");
      setSessionId(null);
    }
  };

  const switchOrganization = async (organizationId: string) => {
    if (!sessionId) {
      throw new Error("No active session");
    }
    await switchOrgMutation({
      sessionId,
      organizationId: organizationId as Id<"organizations">
    });
    // The user query will automatically refresh with the new org context
  };

  // Auto-persist defaultOrgId if user has organizations but no defaultOrgId
  // This fixes the issue where organization owners see no apps on first login
  useEffect(() => {
    if (sessionId && userQuery && !userQuery.defaultOrgId && userQuery.currentOrganization) {
      // User has organizations but no defaultOrgId set - persist the first one
      setDefaultOrgMutation({
        sessionId,
        organizationId: userQuery.currentOrganization.id as Id<"organizations">
      }).catch((error) => {
        console.error("Failed to set default organization:", error);
      });
    }
  }, [sessionId, userQuery, setDefaultOrgMutation]);

  // Transform the user data to match our interface
  const user: User | null = userQuery ? {
    id: userQuery.id,
    email: userQuery.email,
    firstName: userQuery.firstName,
    lastName: userQuery.lastName,
    hasPasskey: userQuery.hasPasskey || false,
    isSuperAdmin: userQuery.isSuperAdmin,
    globalRole: userQuery.globalRole,
    scheduledDeletionDate: userQuery.scheduledDeletionDate,
    // Filter out null organizations and ensure proper typing
    organizations: userQuery.organizations
      .filter((org): org is NonNullable<typeof org> => org !== null)
      .map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        isActive: org.isActive,
        role: org.role,
        permissions: org.permissions
          .filter((p: { id: string; name: string; resource: string; action: string } | null): p is { id: string; name: string; resource: string; action: string } => p !== null)
          .map((p: { id: string; name: string; resource: string; action: string }) => ({
            id: p.id,
            name: p.name,
            resource: p.resource,
            action: p.action,
          })),
        isOwner: org.isOwner,
      })),
    currentOrganization: userQuery.currentOrganization ? {
      id: userQuery.currentOrganization.id,
      name: userQuery.currentOrganization.name,
      slug: userQuery.currentOrganization.slug,
      isActive: userQuery.currentOrganization.isActive,
      role: userQuery.currentOrganization.role,
      permissions: userQuery.currentOrganization.permissions
        .filter((p: { id: string; name: string; resource: string; action: string } | null): p is { id: string; name: string; resource: string; action: string } => p !== null)
        .map((p: { id: string; name: string; resource: string; action: string }) => ({
          id: p.id,
          name: p.name,
          resource: p.resource,
          action: p.action,
        })),
      isOwner: userQuery.currentOrganization.isOwner,
    } : null,
    defaultOrgId: userQuery.defaultOrgId,
  } : null;

  // Client-side permission checking with caching
  const canPerform = (permission: string, resource?: string, organizationId?: string): boolean => {
    if (!user) return false;

    // Super admins can do everything
    if (user.isSuperAdmin) return true;

    // Check permissions in the current organization
    const org = organizationId
      ? user.organizations.find(o => o.id === organizationId)
      : user.currentOrganization;

    if (!org) return false;

    // Check if the permission exists in the user's permissions
    return org.permissions.some(p => {
      if (p.name === permission) {
        if (resource) {
          return p.resource === resource;
        }
        return true;
      }

      // Check for wildcard permissions
      if (p.name === '*') return true;

      // Check for prefix wildcard (e.g., 'view_*')
      if (p.name.endsWith('*')) {
        const prefix = p.name.replace('*', '');
        return permission.startsWith(prefix);
      }

      return false;
    });
  };

  const canPerformMany = (permissions: string[], organizationId?: string): Record<string, boolean> => {
    const results: Record<string, boolean> = {};

    permissions.forEach(permission => {
      results[permission] = canPerform(permission, undefined, organizationId);
    });

    return results;
  };

  // Extract permission names for easy access
  const permissions = user?.currentOrganization?.permissions.map(p => p.name) || [];

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn: !!user,
        isLoading: userQuery === undefined,
        isSuperAdmin: user?.isSuperAdmin || false,
        permissions, // Expose permissions array for PermissionProvider
        signIn,
        setupPassword,
        checkNeedsPasswordSetup,
        signOut,
        switchOrganization,
        canPerform,
        canPerformMany,
        sessionId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Convenience hooks for common permission checks
export function usePermission(permission: string, resource?: string, organizationId?: string): boolean {
  const { canPerform } = useAuth();
  return canPerform(permission, resource, organizationId);
}

export function usePermissions(permissions: string[], organizationId?: string): Record<string, boolean> {
  const { canPerformMany } = useAuth();
  return canPerformMany(permissions, organizationId);
}

// Role-based convenience hooks
export function useIsSuperAdmin(): boolean {
  const { user } = useAuth();
  return user?.isSuperAdmin || false;
}

export function useIsOrgOwner(organizationId?: string): boolean {
  const { user } = useAuth();
  if (!user) return false;

  const org = organizationId
    ? user.organizations.find(o => o.id === organizationId)
    : user.currentOrganization;

  return org?.role.name === 'org_owner' || false;
}

export function useIsManager(organizationId?: string): boolean {
  const { user } = useAuth();
  if (!user) return false;

  const org = organizationId
    ? user.organizations.find(o => o.id === organizationId)
    : user.currentOrganization;

  const role = org?.role.name;
  return role === 'business_manager' || role === 'org_owner' || user.isSuperAdmin;
}

export function useCurrentOrganization(): Organization | null {
  const { user } = useAuth();
  return user?.currentOrganization || null;
}

export function useOrganizations(): Organization[] {
  const { user } = useAuth();
  return user?.organizations || [];
}

// Account deletion status hook
export function useAccountDeletionStatus(): {
  isScheduledForDeletion: boolean;
  deletionDate: Date | null;
  daysRemaining: number | null;
} {
  const { user } = useAuth();

  if (!user?.scheduledDeletionDate) {
    return {
      isScheduledForDeletion: false,
      deletionDate: null,
      daysRemaining: null,
    };
  }

  const deletionDate = new Date(user.scheduledDeletionDate);
  const now = Date.now();
  const msRemaining = user.scheduledDeletionDate - now;
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  return {
    isScheduledForDeletion: true,
    deletionDate,
    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
  };
}