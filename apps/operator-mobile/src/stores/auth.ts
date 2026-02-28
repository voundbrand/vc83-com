/**
 * Auth Store
 *
 * Manages authentication state using Zustand
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { l4yercak3Client } from '../api/client';
import { ENV } from '../config/env';
import {
  performOAuthSignIn,
  signOutFromGoogle,
  confirmAccountLinking,
  rejectAccountLinking,
} from '../lib/oauth';
import type { OAuthProvider, MobileOAuthResponse, OAuthSignupOptions } from '../lib/oauth';
import type { User, Organization, Session, SignInResult } from '../types/auth';

/**
 * Account linking state - when email collision detected
 */
export interface AccountLinkingState {
  linkingState: string;
  sourceProvider: OAuthProvider;
  existingEmail: string;
  existingProvider: OAuthProvider;
}

const SESSION_KEY = 'l4yercak3_session';

type AuthStore = {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  currentOrganization: Organization | null;
  // Account linking state
  accountLinking: AccountLinkingState | null;

  // Actions
  initialize: () => Promise<void>;
  signUp: (args: {
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    organizationName?: string;
    betaCode?: string;
  }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider, signupOptions?: OAuthSignupOptions) => Promise<MobileOAuthResponse>;
  setupPassword: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  // Account linking actions
  confirmLinking: () => Promise<void>;
  rejectLinking: () => Promise<void>;
  clearLinkingState: () => void;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: true,
  session: null,
  user: null,
  currentOrganization: null,
  accountLinking: null,

  /**
   * Initialize auth state from stored session
   */
  initialize: async () => {
    set({ isLoading: true });

    try {
      // Try to load existing session
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);

      if (!sessionData) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const parsed = JSON.parse(sessionData);
      const { sessionId, apiKey, organizationId } = parsed;

      // Set up client for authenticated API requests
      if (apiKey) {
        l4yercak3Client.setApiKey(apiKey);
      }
      if (sessionId) {
        l4yercak3Client.setSession(sessionId);
      }
      if (organizationId) {
        l4yercak3Client.setOrganization(organizationId);
      }

      // Validate stored session against the active backend deployment.
      const validationResponse = await fetch(`${ENV.L4YERCAK3_API_URL}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!validationResponse.ok) {
        await SecureStore.deleteItemAsync(SESSION_KEY);
        l4yercak3Client.clearAuth();
        set({
          isLoading: false,
          isAuthenticated: false,
          session: null,
          user: null,
          currentOrganization: null,
        });
        return;
      }

      set({
        isLoading: false,
        isAuthenticated: true,
        session: {
          sessionId,
          user: parsed.user,
          expiresAt: parsed.expiresAt || Date.now() + 24 * 60 * 60 * 1000,
        },
        user: parsed.user,
        currentOrganization: parsed.user?.currentOrganization || null,
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  /**
   * Create account with email/password (self-serve signup)
   */
  signUp: async ({ email, password, firstName, lastName, organizationName, betaCode }) => {
    set({ isLoading: true });

    try {
      const response = await fetch(`${ENV.L4YERCAK3_API_URL}/api/v1/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          organizationName,
          betaCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sign up failed');
      }

      const result: SignInResult & { apiKey?: string; user: User } = await response.json();

      const sessionData = {
        sessionId: result.sessionId,
        apiKey: result.apiKey,
        organizationId: result.user.currentOrganization?.id,
        user: result.user,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessionData));

      l4yercak3Client.setSession(result.sessionId);
      if (result.apiKey) {
        l4yercak3Client.setApiKey(result.apiKey);
      }
      if (result.user.currentOrganization?.id) {
        l4yercak3Client.setOrganization(result.user.currentOrganization.id);
      }

      set({
        isLoading: false,
        isAuthenticated: true,
        session: {
          sessionId: result.sessionId,
          user: result.user,
          expiresAt: sessionData.expiresAt,
        },
        user: result.user,
        currentOrganization: result.user.currentOrganization,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    set({ isLoading: true });

    try {
      // Call backend signIn action
      const response = await fetch(`${ENV.L4YERCAK3_API_URL}/api/v1/auth/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sign in failed');
      }

      const result: SignInResult & { apiKey?: string; user: User } = await response.json();

      // Store session
      const sessionData = {
        sessionId: result.sessionId,
        apiKey: result.apiKey,
        organizationId: result.user.currentOrganization?.id,
        user: result.user,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessionData));

      // Configure client
      l4yercak3Client.setSession(result.sessionId);
      if (result.apiKey) {
        l4yercak3Client.setApiKey(result.apiKey);
      }
      if (result.user.currentOrganization?.id) {
        l4yercak3Client.setOrganization(result.user.currentOrganization.id);
      }

      set({
        isLoading: false,
        isAuthenticated: true,
        session: {
          sessionId: result.sessionId,
          user: result.user,
          expiresAt: sessionData.expiresAt,
        },
        user: result.user,
        currentOrganization: result.user.currentOrganization,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Sign in with OAuth (Google/Apple/GitHub/Microsoft)
   * Uses native OAuth SDKs and syncs with backend via /api/v1/auth/mobile-oauth
   * Creates a platform user session (not frontend_user)
   * Returns the response - caller should check requiresLinking
   */
  signInWithOAuth: async (
    provider: OAuthProvider,
    signupOptions?: OAuthSignupOptions
  ): Promise<MobileOAuthResponse> => {
    set({ isLoading: true, accountLinking: null });

    try {
      // Perform OAuth sign-in and authenticate with backend
      // This creates a platform user (users table) not a frontend_user
      const result = await performOAuthSignIn(provider, signupOptions);

      // Check if account linking is required (email collision)
      if (result.requiresLinking && result.linkingState) {
        set({
          isLoading: false,
          accountLinking: {
            linkingState: result.linkingState,
            sourceProvider: provider,
            existingEmail: result.existingAccountEmail || '',
            existingProvider: result.existingAccountProvider || provider,
          },
        });
        return result;
      }

      // Normal login flow - store session
      const sessionData = {
        sessionId: result.sessionId,
        oauthProvider: provider,
        organizationId: result.organizationId,
        user: result.user,
        expiresAt: result.expiresAt,
      };

      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessionData));

      // Configure client for authenticated API requests
      // Use sessionId as the bearer token for API auth
      l4yercak3Client.setSession(result.sessionId);
      if (result.organizationId) {
        l4yercak3Client.setOrganization(result.organizationId);
      }

      set({
        isLoading: false,
        isAuthenticated: true,
        session: {
          sessionId: result.sessionId,
          user: result.user,
          expiresAt: result.expiresAt,
        },
        user: result.user,
        currentOrganization: result.user.currentOrganization,
      });

      return result;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Setup password for first-time users
   */
  setupPassword: async (email: string, password: string, firstName?: string, lastName?: string) => {
    set({ isLoading: true });

    try {
      const response = await fetch(`${ENV.L4YERCAK3_API_URL}/api/v1/auth/setup-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Setup failed');
      }

      const result: SignInResult & { apiKey?: string; user: User } = await response.json();

      // Store session (same as sign in)
      const sessionData = {
        sessionId: result.sessionId,
        apiKey: result.apiKey,
        organizationId: result.user.currentOrganization?.id,
        user: result.user,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessionData));

      if (result.apiKey) {
        l4yercak3Client.setApiKey(result.apiKey);
      }
      l4yercak3Client.setSession(result.sessionId);
      if (result.user.currentOrganization?.id) {
        l4yercak3Client.setOrganization(result.user.currentOrganization.id);
      }

      set({
        isLoading: false,
        isAuthenticated: true,
        session: {
          sessionId: result.sessionId,
          user: result.user,
          expiresAt: sessionData.expiresAt,
        },
        user: result.user,
        currentOrganization: result.user.currentOrganization,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Sign out and clear session
   */
  signOut: async () => {
    try {
      // Call backend signOut
      const { session } = get();
      if (session?.sessionId) {
        await fetch(`${ENV.L4YERCAK3_API_URL}/api/v1/auth/sign-out`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.sessionId }),
        }).catch(() => {
          // Ignore errors - we're signing out anyway
        });
      }

      // Also sign out from OAuth providers
      await signOutFromGoogle().catch(() => {});
    } finally {
      // Clear local state
      await SecureStore.deleteItemAsync(SESSION_KEY);
      l4yercak3Client.clearAuth();

      set({
        isAuthenticated: false,
        isLoading: false,
        session: null,
        user: null,
        currentOrganization: null,
      });
    }
  },

  /**
   * Switch to a different organization
   * Calls backend to persist the switch, then updates local state
   */
  switchOrganization: async (organizationId: string) => {
    const { session, user } = get();
    if (!session || !user) {
      throw new Error('Not authenticated');
    }

    const newOrg = user.organizations.find((org) => org.id === organizationId);
    if (!newOrg) {
      throw new Error('Organization not found');
    }

    // Call backend to switch organization
    const response = await l4yercak3Client.organizations.switch(organizationId);
    if (!response.success) {
      throw new Error('Failed to switch organization');
    }

    // Update client with new organization context
    l4yercak3Client.setOrganization(organizationId);

    // Update stored session
    const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      parsed.organizationId = organizationId;
      parsed.user.currentOrganization = newOrg;
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(parsed));
    }

    set({
      currentOrganization: newOrg,
      user: { ...user, currentOrganization: newOrg },
    });

    // Note: Caller should sync conversations after org switch
    // await chatStore.syncConversations();
  },

  /**
   * Refresh user data from backend
   */
  refreshUser: async () => {
    const { session } = get();
    if (!session) return;

    try {
      const response = await fetch(`${ENV.L4YERCAK3_API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${session.sessionId}`,
        },
      });

      if (response.ok) {
        const payload = await response.json();
        const user = (payload?.user || payload) as User;
        set({ user, currentOrganization: user.currentOrganization });
        return;
      }
      const errorPayload = await response.json().catch(() => null);
      console.warn('Failed to refresh user status:', response.status, errorPayload);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  },

  /**
   * Confirm account linking - links the new OAuth provider to existing account
   */
  confirmLinking: async () => {
    const { accountLinking } = get();
    if (!accountLinking) {
      throw new Error('No pending account linking');
    }

    set({ isLoading: true });

    try {
      const result = await confirmAccountLinking(accountLinking.linkingState);

      // Store session after successful linking
      const sessionData = {
        sessionId: result.sessionId,
        oauthProvider: accountLinking.sourceProvider,
        organizationId: result.organizationId,
        user: result.user,
        expiresAt: result.expiresAt,
      };

      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(sessionData));

      // Configure client
      l4yercak3Client.setSession(result.sessionId);
      if (result.organizationId) {
        l4yercak3Client.setOrganization(result.organizationId);
      }

      set({
        isLoading: false,
        isAuthenticated: true,
        accountLinking: null,
        session: {
          sessionId: result.sessionId,
          user: result.user,
          expiresAt: result.expiresAt,
        },
        user: result.user,
        currentOrganization: result.user.currentOrganization,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Reject account linking - user wants to use a different email
   */
  rejectLinking: async () => {
    const { accountLinking } = get();
    if (!accountLinking) {
      throw new Error('No pending account linking');
    }

    try {
      await rejectAccountLinking(accountLinking.linkingState);
    } finally {
      set({ accountLinking: null });
    }
  },

  /**
   * Clear account linking state without calling backend
   */
  clearLinkingState: () => {
    set({ accountLinking: null });
  },
}));
