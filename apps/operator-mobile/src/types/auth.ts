/**
 * Authentication types matching L4yercak3 backend
 */

export type Organization = {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  role: {
    id: string;
    name: string;
    description?: string;
  };
  permissions: {
    id: string;
    name: string;
    resource: string;
    action: string;
  }[];
  isOwner: boolean;
};

export type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isPasswordSet: boolean;
  betaAccessStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  hasPasskey: boolean;
  isSuperAdmin: boolean;
  globalRole?: {
    id: string;
    name: string;
    description?: string;
  } | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  defaultOrgId?: string;
  scheduledDeletionDate?: number;
};

export type Session = {
  sessionId: string;
  user: User;
  expiresAt: number;
};

export type SignInResult = {
  success: boolean;
  sessionId: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
};

export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  currentOrganization: Organization | null;
};
