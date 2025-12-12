/**
 * OAuth Helper Functions
 *
 * Cryptographic and utility functions for OAuth 2.0 implementation.
 * Includes client credential generation, hashing, and PKCE support.
 */

import { ConvexError } from "convex/values";

/**
 * Generate a cryptographically secure client ID
 * Format: 32-character alphanumeric string (128 bits of entropy)
 * Example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
 */
export function generateClientId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = 32;
  let clientId = '';

  // Use crypto.getRandomValues for secure randomness
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  for (let i = 0; i < length; i++) {
    clientId += chars[randomBytes[i] % chars.length];
  }

  return clientId;
}

/**
 * Generate a cryptographically secure client secret
 * Format: 64-character hex string (256 bits of entropy)
 * Example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
 */
export function generateClientSecret(): string {
  const length = 32; // 32 bytes = 64 hex characters
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a client secret using SHA-256
 * Note: In production, consider using bcrypt or Argon2 for password-level security
 * For OAuth client secrets, SHA-256 is acceptable as secrets are machine-generated
 *
 * @param secret - Plain text client secret
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashClientSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a client secret against a stored hash
 * Constant-time comparison to prevent timing attacks
 *
 * @param plainSecret - Plain text secret to verify
 * @param hashedSecret - Stored hashed secret
 * @returns True if secrets match
 */
export async function verifyClientSecret(
  plainSecret: string,
  hashedSecret: string
): Promise<boolean> {
  const computedHash = await hashClientSecret(plainSecret);

  // Constant-time comparison
  if (computedHash.length !== hashedSecret.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ hashedSecret.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate an authorization code for OAuth flow
 * Format: 43-character URL-safe base64 string (256 bits of entropy)
 * Expires in 10 minutes as per OAuth 2.0 spec
 */
export function generateAuthorizationCode(): string {
  const length = 32; // 32 bytes = 43 base64 characters
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  // Convert to URL-safe base64
  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a PKCE code verifier
 * RFC 7636: 43-128 characters, URL-safe base64
 * We use 128 characters (maximum) for maximum security
 */
export function generateCodeVerifier(): string {
  const length = 96; // 96 bytes = 128 base64 characters
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 128);
}

/**
 * Generate a PKCE code challenge from a code verifier
 * Method: S256 (SHA-256 hash of the verifier)
 *
 * @param verifier - PKCE code verifier
 * @returns URL-safe base64-encoded SHA-256 hash
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Verify a PKCE code verifier against a challenge
 *
 * @param verifier - Code verifier provided by client
 * @param challenge - Stored code challenge
 * @returns True if verifier matches challenge
 */
export async function verifyCodeChallenge(
  verifier: string,
  challenge: string
): Promise<boolean> {
  const computedChallenge = await generateCodeChallenge(verifier);
  return computedChallenge === challenge;
}

/**
 * Validate redirect URI format
 * Must be a valid HTTPS URL (or http://localhost for development)
 *
 * @param uri - Redirect URI to validate
 * @throws ConvexError if URI is invalid
 */
export function validateRedirectUri(uri: string): void {
  try {
    const url = new URL(uri);

    // Must be HTTPS in production, allow localhost for development
    if (url.protocol !== 'https:' && !url.hostname.includes('localhost')) {
      throw new ConvexError({
        code: 'INVALID_REDIRECT_URI',
        message: 'Redirect URI must use HTTPS (or http://localhost for development)'
      });
    }

    // No fragments allowed (OAuth 2.0 spec)
    if (url.hash) {
      throw new ConvexError({
        code: 'INVALID_REDIRECT_URI',
        message: 'Redirect URI must not contain fragments (#)'
      });
    }
  } catch (error) {
    if (error instanceof ConvexError) throw error;

    throw new ConvexError({
      code: 'INVALID_REDIRECT_URI',
      message: `Invalid redirect URI format: ${uri}`
    });
  }
}

/**
 * Validate OAuth scope format
 * Scopes must be space-separated alphanumeric strings with underscores/colons
 * Example: "user:read organizations:write invoices:create"
 *
 * @param scopes - Space-separated scope string
 * @throws ConvexError if scopes are invalid
 */
export function validateScopes(scopes: string): void {
  if (!scopes || scopes.trim().length === 0) {
    throw new ConvexError({
      code: 'INVALID_SCOPES',
      message: 'At least one scope is required'
    });
  }

  const scopeArray = scopes.split(' ');
  const validScopePattern = /^[a-zA-Z0-9_:]+$/;

  for (const scope of scopeArray) {
    if (!validScopePattern.test(scope)) {
      throw new ConvexError({
        code: 'INVALID_SCOPES',
        message: `Invalid scope format: ${scope}. Scopes must be alphanumeric with underscores/colons only.`
      });
    }
  }
}

/**
 * Generate a state parameter for OAuth flow (CSRF protection)
 * Format: 32-character URL-safe base64 string
 */
export function generateState(): string {
  const length = 24; // 24 bytes = 32 base64 characters
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  return btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
