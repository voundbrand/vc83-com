/**
 * Auth Context
 *
 * Provides authentication state and actions to the app
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

import { useAuthStore } from '../stores/auth';
import type { OAuthProvider, MobileOAuthResponse, OAuthSignupOptions } from '../lib/oauth';
import type { User, Organization, Session } from '../types/auth';

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  currentOrganization: Organization | null;
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
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();

  const {
    isAuthenticated,
    isLoading,
    session,
    user,
    currentOrganization,
    initialize,
    signUp,
    signIn,
    signInWithOAuth,
    setupPassword,
    signOut,
    switchOrganization,
    refreshUser,
  } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading) return;

    const segmentList = segments as unknown as string[];
    const inAuthGroup = segmentList[0] === '(auth)';
    const isPendingApprovalRoute = inAuthGroup && segmentList[1] === 'pending-approval';
    const isPendingApproval = user?.betaAccessStatus === 'pending';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to sign in if not authenticated
      router.replace('/(auth)/sign-in');
    } else if (isAuthenticated && isPendingApproval && !isPendingApprovalRoute) {
      router.replace('/(auth)/pending-approval');
    } else if (isAuthenticated && !isPendingApproval && inAuthGroup) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router, user?.betaAccessStatus]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    session,
    user,
    currentOrganization,
    signUp,
    signIn,
    signInWithOAuth,
    setupPassword,
    signOut,
    switchOrganization,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
