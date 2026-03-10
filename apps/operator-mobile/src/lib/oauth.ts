/**
 * OAuth Authentication Utilities
 *
 * Handles Google, Apple, GitHub, and Microsoft Sign-In for the L4yercak3 mobile app.
 * Uses native OAuth SDKs where available, and expo-auth-session for web-based OAuth flows.
 * Syncs with backend via /api/v1/auth/mobile-oauth to create platform users.
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { ENV } from '../config/env';
import type { User } from '../types/auth';

// Needed for web browser auth session to work properly
WebBrowser.maybeCompleteAuthSession();

// Types
export type OAuthProvider = 'google' | 'apple' | 'github' | 'microsoft';

export interface OAuthCredentials {
  provider: OAuthProvider;
  email: string;
  name: string;
  providerUserId: string;
  idToken?: string;
}

export interface OAuthSignupOptions {
  organizationName?: string;
  betaCode?: string;
}

/**
 * Response from /api/v1/auth/mobile-oauth endpoint
 * Creates a platform user session (not frontend_user)
 */
export interface MobileOAuthResponse {
  success: boolean;
  sessionId: string;
  userId: string;
  email: string;
  organizationId: string;
  expiresAt: number;
  isNewUser: boolean;
  user: User;
  error?: string;
  // Account linking fields (when email collision detected)
  requiresLinking?: boolean;
  linkingState?: string;
  existingAccountEmail?: string;
  existingAccountProvider?: OAuthProvider;
}

/**
 * Response from /api/v1/auth/link-account/confirm endpoint
 */
export interface AccountLinkingConfirmResponse {
  success: boolean;
  sessionId: string;
  userId: string;
  email: string;
  organizationId: string;
  expiresAt: number;
  linkedProvider: OAuthProvider;
  user: User;
  error?: string;
}

/**
 * Response from /api/v1/auth/link-account/status endpoint
 */
export interface AccountLinkingStatusResponse {
  success: boolean;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  existingAccountEmail?: string;
  existingAccountProvider?: OAuthProvider;
  newProvider?: OAuthProvider;
  error?: string;
}

type HostedOAuthProvider = 'github' | 'microsoft';

// Configure Google Sign-In (call this once on app startup)
export function configureGoogleSignIn() {
  if (!ENV.GOOGLE_IOS_CLIENT_ID) {
    console.warn(
      '[OAuth] Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Google Sign-In is disabled until configured.'
    );
    return;
  }

  const googleConfig: {
    iosClientId: string;
    webClientId?: string;
    offlineAccess: boolean;
  } = {
    iosClientId: ENV.GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  };

  // Optional but recommended for backend token verification.
  if (ENV.GOOGLE_WEB_CLIENT_ID) {
    googleConfig.webClientId = ENV.GOOGLE_WEB_CLIENT_ID;
  }

  GoogleSignin.configure(googleConfig);
}

/**
 * Sign in with Google
 * Returns credentials including ID token for backend verification
 */
export async function signInWithGoogle(): Promise<OAuthCredentials> {
  if (!ENV.GOOGLE_IOS_CLIENT_ID) {
    throw new Error(
      'Google OAuth is not configured. Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in apps/operator-mobile/.env.local.'
    );
  }

  try {
    // Check if Play Services are available (Android only)
    await GoogleSignin.hasPlayServices();

    // Perform sign in
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new Error('Google Sign-In was cancelled');
    }

    const { data } = response;

    if (!data.user.email) {
      throw new Error('No email received from Google');
    }

    return {
      provider: 'google',
      email: data.user.email,
      name: data.user.name || data.user.email,
      providerUserId: data.user.id,
      idToken: data.idToken || undefined,
    };
  } catch (error) {
    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new Error('Sign in was cancelled');
        case statusCodes.IN_PROGRESS:
          throw new Error('Sign in is already in progress');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error('Play Services not available');
        default:
          throw new Error(`Google Sign-In failed: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * Sign out from Google
 */
export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.warn('Error signing out from Google:', error);
  }
}

/**
 * Decode a JWT token to extract payload (without verification)
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Base64 decode (handle URL-safe base64)
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Sign in with Apple
 * Only available on iOS
 * Returns credentials including identity token for backend verification
 */
export async function signInWithApple(): Promise<OAuthCredentials> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Apple only provides email/name on first sign-in
    // On subsequent sign-ins, we only get the user identifier
    // BUT the ID token always contains the real email, so extract it from there
    let email = credential.email;

    if (!email && credential.identityToken) {
      const payload = decodeJwtPayload(credential.identityToken);
      if (payload && typeof payload.email === 'string') {
        email = payload.email;
        console.log('[OAuth] Extracted email from Apple ID token:', email);
      }
    }

    // Fallback to relay email if we still don't have one
    email = email || `apple_${credential.user}@privaterelay.appleid.com`;

    const name = credential.fullName
      ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
      : email;

    return {
      provider: 'apple',
      email,
      name: name || email,
      providerUserId: credential.user,
      idToken: credential.identityToken || undefined,
    };
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error) {
      const appleError = error as { code: string; message: string };
      if (appleError.code === 'ERR_REQUEST_CANCELED') {
        throw new Error('Sign in was cancelled');
      }
    }
    throw error;
  }
}

/**
 * Check if Apple Sign-In is available on this device
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return await AppleAuthentication.isAvailableAsync();
}

// ============================================================================
// GitHub OAuth (web-based flow using expo-auth-session)
// ============================================================================

const githubDiscovery = {
  authorizationEndpoint: 'https://github.com/login/oauth/authorize',
  tokenEndpoint: 'https://github.com/login/oauth/access_token',
  revocationEndpoint: `https://github.com/settings/connections/applications/${ENV.GITHUB_CLIENT_ID}`,
};

function createOAuthRedirectUri(provider: HostedOAuthProvider): string {
  return AuthSession.makeRedirectUri({
    scheme: 'l4yercak3',
    path: `oauth/${provider}`,
  });
}

function buildHostedLoginInitURL(provider: HostedOAuthProvider, redirectUri: string, state: string): string {
  const appBaseURL = ENV.L4YERCAK3_APP_URL || 'https://app.l4yercak3.com';
  const loginInitURL = new URL('/api/auth/login/init', appBaseURL);
  loginInitURL.searchParams.set('client', 'operator_mobile');
  loginInitURL.searchParams.set('provider', provider);
  loginInitURL.searchParams.set('callback', redirectUri);
  loginInitURL.searchParams.set('state', state);
  return loginInitURL.toString();
}

function parseHostedCallbackSession(resultURL: string, expectedState: string): {
  sessionToken: string;
  isNewUser: boolean;
} {
  const callbackURL = new URL(resultURL);
  const receivedState = callbackURL.searchParams.get('state');
  if (!receivedState || receivedState !== expectedState) {
    throw new Error('Sign-in callback state mismatch');
  }

  const sessionToken =
    callbackURL.searchParams.get('session')
    || callbackURL.searchParams.get('session_token')
    || callbackURL.searchParams.get('token');
  if (!sessionToken) {
    const callbackError =
      callbackURL.searchParams.get('error_description') || callbackURL.searchParams.get('error');
    throw new Error(callbackError || 'Missing session token in OAuth callback');
  }

  return {
    sessionToken,
    isNewUser: callbackURL.searchParams.get('isNewUser') === 'true',
  };
}

async function fetchUserFromSession(sessionToken: string): Promise<User> {
  const baseUrl = ENV.L4YERCAK3_API_URL || 'https://agreeable-lion-828.convex.site';
  const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid auth profile response (${response.status})`);
  }

  if (!response.ok) {
    const errorMessage =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error?: unknown }).error || '')
        : '';
    throw new Error(errorMessage || `Failed to load auth profile (${response.status})`);
  }

  const user = (data as { user?: User } | User)?.user ?? (data as User);
  if (!user || typeof user !== 'object' || !('id' in user) || !('email' in user)) {
    throw new Error('Auth profile response missing user payload');
  }
  return user;
}

function deriveOrganizationId(user: User): string {
  if (user.currentOrganization?.id) {
    return user.currentOrganization.id;
  }
  if (user.defaultOrgId) {
    return user.defaultOrgId;
  }
  if (user.organizations.length > 0 && user.organizations[0]?.id) {
    return user.organizations[0].id;
  }
  throw new Error('No organization available for authenticated user');
}

async function signInWithHostedOAuthSession(provider: HostedOAuthProvider): Promise<MobileOAuthResponse> {
  const redirectUri = createOAuthRedirectUri(provider);
  const state = `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  const loginURL = buildHostedLoginInitURL(provider, redirectUri, state);

  console.log(`[OAuth] Hosted login init URL (${provider}):`, loginURL);

  const authResult = await WebBrowser.openAuthSessionAsync(loginURL, redirectUri);
  if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
    throw new Error('Sign in was cancelled');
  }
  if (authResult.type !== 'success' || !authResult.url) {
    throw new Error(`${provider} Sign-In failed`);
  }

  const { sessionToken, isNewUser } = parseHostedCallbackSession(authResult.url, state);
  const user = await fetchUserFromSession(sessionToken);
  const organizationId = deriveOrganizationId(user);

  return {
    success: true,
    sessionId: sessionToken,
    userId: user.id,
    email: user.email,
    organizationId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    isNewUser,
    user,
  };
}

/**
 * Sign in with GitHub
 * Uses web-based OAuth flow via expo-auth-session
 */
export async function signInWithGitHub(): Promise<OAuthCredentials> {
  if (!ENV.GITHUB_CLIENT_ID) {
    throw new Error('GitHub Client ID not configured');
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'l4yercak3',
    path: 'oauth/github',
  });

  console.log('[OAuth] GitHub redirect URI:', redirectUri);

  const request = new AuthSession.AuthRequest({
    clientId: ENV.GITHUB_CLIENT_ID,
    scopes: ['read:user', 'user:email'],
    redirectUri,
  });

  const result = await request.promptAsync(githubDiscovery);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Sign in was cancelled');
  }

  if (result.type !== 'success' || !result.params.code) {
    throw new Error('GitHub Sign-In failed');
  }

  // Exchange code for user info via our backend
  // The backend will exchange the code for an access token and fetch user info
  const code = result.params.code;

  // For GitHub, we send the authorization code to our backend
  // which will exchange it for user info securely (keeps client_secret server-side)
  return {
    provider: 'github',
    email: '', // Will be fetched by backend using the code
    name: '',
    providerUserId: '',
    idToken: code, // Send the auth code as idToken - backend will exchange it
  };
}

// ============================================================================
// Microsoft OAuth (web-based flow using expo-auth-session)
// ============================================================================

/**
 * Get Microsoft discovery document for the configured tenant
 */
function getMicrosoftDiscovery() {
  const tenantId = ENV.MICROSOFT_TENANT_ID || 'common';
  return {
    authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
  };
}

/**
 * Sign in with Microsoft (Azure AD / Entra ID)
 * Uses web-based OAuth flow via expo-auth-session
 */
export async function signInWithMicrosoft(): Promise<OAuthCredentials> {
  if (!ENV.MICROSOFT_CLIENT_ID) {
    throw new Error('Microsoft Client ID not configured');
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'l4yercak3',
    path: 'oauth/microsoft',
  });

  console.log('[OAuth] Microsoft redirect URI:', redirectUri);

  const discovery = getMicrosoftDiscovery();

  const request = new AuthSession.AuthRequest({
    clientId: ENV.MICROSOFT_CLIENT_ID,
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUri,
    usePKCE: true,
  });

  const result = await request.promptAsync(discovery);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Sign in was cancelled');
  }

  if (result.type !== 'success' || !result.params.code) {
    throw new Error('Microsoft Sign-In failed');
  }

  // Send the authorization code to our backend for exchange
  const code = result.params.code;

  return {
    provider: 'microsoft',
    email: '', // Will be fetched by backend using the code
    name: '',
    providerUserId: '',
    idToken: code, // Send the auth code - backend will exchange it
  };
}

/**
 * Authenticate with L4yercak3 backend using native OAuth credentials
 * Creates or logs into a platform user account (users table, not frontend_user)
 */
export async function authenticateWithBackend(
  credentials: OAuthCredentials,
  signupOptions?: OAuthSignupOptions
): Promise<MobileOAuthResponse> {
  // Use env var or fallback to hardcoded URL
  const baseUrl = ENV.L4YERCAK3_API_URL || 'https://agreeable-lion-828.convex.site';
  const url = `${baseUrl}/api/v1/auth/mobile-oauth`;
  const body = JSON.stringify({
    provider: credentials.provider,
    email: credentials.email,
    name: credentials.name,
    providerUserId: credentials.providerUserId,
    idToken: credentials.idToken,
    organizationName: signupOptions?.organizationName,
    betaCode: signupOptions?.betaCode,
  });

  console.log('[OAuth] Authenticating with backend:', url);
  console.log('[OAuth] Request body:', body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body,
  });

  console.log('[OAuth] Response status:', response.status, response.statusText);

  // Get raw text first to debug non-JSON responses
  const text = await response.text();
  console.log('[OAuth] Response body:', text.substring(0, 500));

  // Try to parse as JSON
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('[OAuth] Failed to parse response as JSON:', text);
    throw new Error(`Server returned invalid response (${response.status}): ${text.substring(0, 100)}`);
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || `Authentication failed: ${response.statusText}`);
  }

  // Validate required fields in response
  if (!data.sessionId) {
    console.error('[OAuth] Backend response missing sessionId:', data);
    throw new Error('Invalid server response: missing session');
  }
  if (!data.user) {
    console.error('[OAuth] Backend response missing user:', data);
    throw new Error('Invalid server response: missing user data');
  }

  return data as MobileOAuthResponse;
}

/**
 * Full OAuth sign-in flow for platform users:
 * 1. Sign in with OAuth provider (native or web-based)
 * 2. Send credentials to backend /api/v1/auth/mobile-oauth
 * 3. Backend creates/finds platform user and returns session
 */
export async function performOAuthSignIn(
  provider: OAuthProvider,
  signupOptions?: OAuthSignupOptions
): Promise<MobileOAuthResponse> {
  if (
    ENV.USE_UNIFIED_MOBILE_HOSTED_OAUTH &&
    (provider === 'github' || provider === 'microsoft')
  ) {
    try {
      return await signInWithHostedOAuthSession(provider);
    } catch (error) {
      console.warn(
        `[OAuth] Unified hosted login failed for ${provider}, falling back to legacy mobile-oauth flow:`,
        error
      );
    }
  }

  // Step 1: OAuth sign-in based on provider
  let credentials: OAuthCredentials;

  switch (provider) {
    case 'google':
      credentials = await signInWithGoogle();
      break;
    case 'apple':
      credentials = await signInWithApple();
      break;
    case 'github':
      credentials = await signInWithGitHub();
      break;
    case 'microsoft':
      credentials = await signInWithMicrosoft();
      break;
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }

  // Step 2: Authenticate with backend (creates platform session)
  const backendResponse = await authenticateWithBackend(credentials, signupOptions);

  return backendResponse;
}

// ============================================================================
// Account Linking Functions
// ============================================================================

/**
 * Confirm account linking when email collision is detected
 * Links the new OAuth provider to the existing account
 */
export async function confirmAccountLinking(
  linkingState: string
): Promise<AccountLinkingConfirmResponse> {
  const baseUrl = ENV.L4YERCAK3_API_URL || 'https://agreeable-lion-828.convex.site';
  const url = `${baseUrl}/api/v1/auth/link-account/confirm`;

  console.log('[OAuth] Confirming account linking:', linkingState);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ linkingState }),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to link accounts');
  }

  return data as AccountLinkingConfirmResponse;
}

/**
 * Reject account linking - user wants to use a different email
 */
export async function rejectAccountLinking(linkingState: string): Promise<void> {
  const baseUrl = ENV.L4YERCAK3_API_URL || 'https://agreeable-lion-828.convex.site';
  const url = `${baseUrl}/api/v1/auth/link-account/reject`;

  console.log('[OAuth] Rejecting account linking:', linkingState);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ linkingState }),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to reject linking');
  }
}

/**
 * Get account linking status (for polling if needed)
 */
export async function getAccountLinkingStatus(
  linkingState: string
): Promise<AccountLinkingStatusResponse> {
  const baseUrl = ENV.L4YERCAK3_API_URL || 'https://agreeable-lion-828.convex.site';
  const url = `${baseUrl}/api/v1/auth/link-account/status?state=${encodeURIComponent(linkingState)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
  }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to get linking status');
  }

  return data as AccountLinkingStatusResponse;
}
