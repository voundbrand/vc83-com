/**
 * OAuth HTTP Endpoints
 *
 * Public HTTP endpoints for OAuth 2.0 Authorization Code flow.
 * These are called directly by OAuth clients (Zapier, Make, etc.)
 *
 * Endpoints:
 * - GET  /oauth/authorize - Show consent screen
 * - POST /oauth/authorize - Handle user approval/denial
 * - POST /oauth/token     - Exchange code for access token (Phase 4)
 * - POST /oauth/revoke    - Revoke tokens (Phase 4)
 */

import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * GET /oauth/authorize
 *
 * Step 1 of OAuth flow: App redirects user here to request authorization.
 *
 * Query Parameters:
 * - client_id: OAuth application client ID
 * - redirect_uri: Where to send user after approval
 * - response_type: Must be "code"
 * - scope: Space-separated list of requested permissions
 * - state: CSRF protection token (recommended)
 * - code_challenge: PKCE challenge (required for public clients)
 * - code_challenge_method: Must be "S256" if using PKCE
 *
 * Returns: HTML consent page or redirect with error
 */
export const authorize = httpAction(async (ctx, request) => {
  // Parse query parameters
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  const responseType = url.searchParams.get("response_type");
  const scope = url.searchParams.get("scope");
  const state = url.searchParams.get("state") || undefined;
  const codeChallenge = url.searchParams.get("code_challenge") || undefined;
  const codeChallengeMethod = url.searchParams.get("code_challenge_method") || undefined;

  // Validate required parameters
  if (!clientId || !redirectUri || !responseType || !scope) {
    return new Response(
      JSON.stringify({
        error: "invalid_request",
        error_description: "Missing required parameters: client_id, redirect_uri, response_type, scope",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Validate authorization request
    const validation = await ctx.runQuery(api.oauth.authorize.validateAuthorizationRequest, {
      clientId,
      redirectUri,
      responseType,
      scope,
      state,
      codeChallenge,
      codeChallengeMethod: codeChallengeMethod as "S256" | undefined,
    });

    // Return HTML consent page
    const consentPage = generateConsentPage({
      application: validation.application,
      organization: validation.organization,
      scopes: validation.requestedScopes,
      clientId,
      redirectUri,
      scope,
      state,
      codeChallenge,
      codeChallengeMethod,
    });

    return new Response(consentPage, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: any) {
    // If redirect_uri is valid, redirect with error
    // Otherwise, show error page
    if (error.code === "INVALID_REDIRECT_URI" || error.code === "INVALID_CLIENT") {
      return new Response(
        JSON.stringify({
          error: error.code?.toLowerCase() || "invalid_request",
          error_description: error.message || "Invalid request",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Redirect to client with error
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", error.code?.toLowerCase() || "server_error");
    errorUrl.searchParams.set("error_description", error.message || "An error occurred");
    if (state) {
      errorUrl.searchParams.set("state", state);
    }

    return Response.redirect(errorUrl.toString(), 302);
  }
});

/**
 * POST /oauth/authorize
 *
 * Step 2 of OAuth flow: Handle user's approval or denial.
 *
 * Form Data:
 * - action: "approve" or "deny"
 * - client_id: OAuth application client ID
 * - redirect_uri: Where to send user
 * - scope: Requested permissions
 * - state: CSRF token (if provided)
 * - code_challenge: PKCE challenge (if using PKCE)
 * - code_challenge_method: PKCE method (if using PKCE)
 *
 * Returns: Redirect to client app with code or error
 */
export const authorizePost = httpAction(async (ctx, request) => {
  // Parse form data
  const formData = await request.formData();
  const action = formData.get("action") as string;
  const clientId = formData.get("client_id") as string;
  const redirectUri = formData.get("redirect_uri") as string;
  const scope = formData.get("scope") as string;
  const state = formData.get("state") as string | undefined;
  const codeChallenge = formData.get("code_challenge") as string | undefined;
  const codeChallengeMethod = formData.get("code_challenge_method") as string | undefined;

  // Validate required parameters
  if (!action || !clientId || !redirectUri || !scope) {
    return new Response(
      JSON.stringify({
        error: "invalid_request",
        error_description: "Missing required parameters",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    if (action === "approve") {
      // User approved - generate authorization code
      const result = await ctx.runMutation(api.oauth.authorize.approveAuthorization, {
        clientId,
        redirectUri,
        scope,
        state,
        codeChallenge,
        codeChallengeMethod: codeChallengeMethod as "S256" | undefined,
      });

      // Redirect back to client with authorization code
      return Response.redirect(result.redirectUrl, 302);
    } else if (action === "deny") {
      // User denied - redirect with error
      const result = await ctx.runMutation(api.oauth.authorize.denyAuthorization, {
        redirectUri,
        state,
        reason: "User denied authorization",
      });

      return Response.redirect(result.redirectUrl, 302);
    } else {
      throw new Error("Invalid action");
    }
  } catch (error: any) {
    // Redirect to client with error
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "server_error");
    errorUrl.searchParams.set("error_description", error.message || "An error occurred");
    if (state) {
      errorUrl.searchParams.set("state", state);
    }

    return Response.redirect(errorUrl.toString(), 302);
  }
});

/**
 * Generate HTML consent page
 *
 * Shows user what permissions the app is requesting.
 * User can approve or deny the request.
 */
function generateConsentPage(params: {
  application: {
    name: string;
    description?: string;
    type: string;
  };
  organization: {
    name: string;
  };
  scopes: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    dangerous?: boolean;
  }>;
  clientId: string;
  redirectUri: string;
  scope: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}): string {
  const { application, organization, scopes, clientId, redirectUri, scope, state, codeChallenge, codeChallengeMethod } = params;

  // Group scopes by category
  const scopesByCategory: Record<string, typeof scopes> = {};
  for (const s of scopes) {
    if (!scopesByCategory[s.category]) {
      scopesByCategory[s.category] = [];
    }
    scopesByCategory[s.category].push(s);
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize ${application.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      max-width: 500px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 24px;
      margin-bottom: 10px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .app-info {
      background: #f7fafc;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .app-info h2 {
      font-size: 20px;
      color: #2d3748;
      margin-bottom: 8px;
    }
    .app-info p {
      font-size: 14px;
      color: #718096;
      line-height: 1.5;
    }
    .permissions {
      margin-bottom: 25px;
    }
    .permissions h3 {
      font-size: 16px;
      color: #2d3748;
      margin-bottom: 15px;
    }
    .permission-category {
      margin-bottom: 20px;
    }
    .permission-category h4 {
      font-size: 14px;
      color: #4a5568;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .permission-item {
      display: flex;
      align-items: start;
      padding: 12px;
      background: #f7fafc;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .permission-item.dangerous {
      background: #fff5f5;
      border: 1px solid #feb2b2;
    }
    .permission-icon {
      width: 20px;
      height: 20px;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .permission-details {
      flex: 1;
    }
    .permission-name {
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 4px;
    }
    .permission-description {
      font-size: 13px;
      color: #718096;
      line-height: 1.4;
    }
    .warning {
      background: #fffaf0;
      border: 1px solid #fbd38d;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 25px;
    }
    .warning-title {
      font-size: 14px;
      font-weight: 600;
      color: #744210;
      margin-bottom: 6px;
    }
    .warning-text {
      font-size: 13px;
      color: #975a16;
      line-height: 1.5;
    }
    .actions {
      display: flex;
      gap: 12px;
    }
    button {
      flex: 1;
      padding: 14px 24px;
      font-size: 15px;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-approve {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-approve:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .btn-deny {
      background: #e2e8f0;
      color: #4a5568;
    }
    .btn-deny:hover {
      background: #cbd5e0;
    }
    .security-note {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #718096;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Authorization Request</h1>
      <p>${application.name} wants to access your ${organization.name} account</p>
    </div>

    <div class="content">
      <div class="app-info">
        <h2>${application.name}</h2>
        ${application.description ? `<p>${application.description}</p>` : ''}
      </div>

      ${scopes.some(s => s.dangerous) ? `
      <div class="warning">
        <div class="warning-title">⚠️ Sensitive Permissions</div>
        <div class="warning-text">
          This application is requesting access to sensitive data. Make sure you trust ${application.name} before continuing.
        </div>
      </div>
      ` : ''}

      <div class="permissions">
        <h3>This application will be able to:</h3>
        ${Object.entries(scopesByCategory).map(([category, categoryScopes]) => `
          <div class="permission-category">
            <h4>${category}</h4>
            ${categoryScopes.map(s => `
              <div class="permission-item ${s.dangerous ? 'dangerous' : ''}">
                <svg class="permission-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <div class="permission-details">
                  <div class="permission-name">${s.name}</div>
                  <div class="permission-description">${s.description}</div>
                </div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>

      <form method="POST" action="/oauth/authorize">
        <input type="hidden" name="client_id" value="${clientId}" />
        <input type="hidden" name="redirect_uri" value="${redirectUri}" />
        <input type="hidden" name="scope" value="${scope}" />
        ${state ? `<input type="hidden" name="state" value="${state}" />` : ''}
        ${codeChallenge ? `<input type="hidden" name="code_challenge" value="${codeChallenge}" />` : ''}
        ${codeChallengeMethod ? `<input type="hidden" name="code_challenge_method" value="${codeChallengeMethod}" />` : ''}

        <div class="actions">
          <button type="submit" name="action" value="deny" class="btn-deny">
            Cancel
          </button>
          <button type="submit" name="action" value="approve" class="btn-approve">
            Authorize
          </button>
        </div>
      </form>

      <div class="security-note">
        🔒 By authorizing, you allow ${application.name} to access your data according to the permissions above.
        You can revoke access at any time from your account settings.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * POST /oauth/token
 *
 * Step 3 of OAuth flow: Exchange authorization code for access token.
 *
 * Form Data (grant_type=authorization_code):
 * - grant_type: "authorization_code"
 * - code: Authorization code from Step 2
 * - redirect_uri: Must match the one used in authorization
 * - client_id: OAuth application client ID
 * - client_secret: Client secret (for confidential clients)
 * - code_verifier: PKCE verifier (if PKCE was used)
 *
 * Form Data (grant_type=refresh_token):
 * - grant_type: "refresh_token"
 * - refresh_token: Refresh token from previous token response
 * - client_id: OAuth application client ID
 * - client_secret: Client secret (for confidential clients)
 * - scope: Optional, to request fewer scopes than original
 *
 * Returns: JSON token response or error
 */
export const token = httpAction(async (ctx, request) => {
  // Only accept POST
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        error: "invalid_request",
        error_description: "Only POST method is allowed",
      }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const grantType = formData.get("grant_type") as string;
    const clientId = formData.get("client_id") as string;
    const clientSecret = formData.get("client_secret") as string | null;

    // Validate required parameters
    if (!grantType || !clientId) {
      return new Response(
        JSON.stringify({
          error: "invalid_request",
          error_description: "Missing required parameters: grant_type, client_id",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (grantType === "authorization_code") {
      // Exchange authorization code for access token
      const code = formData.get("code") as string;
      const redirectUri = formData.get("redirect_uri") as string;
      const codeVerifier = formData.get("code_verifier") as string | null;

      if (!code || !redirectUri) {
        return new Response(
          JSON.stringify({
            error: "invalid_request",
            error_description: "Missing required parameters: code, redirect_uri",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const result = await ctx.runAction(api.oauth.tokens.exchangeAuthorizationCode, {
        code,
        clientId,
        clientSecret: clientSecret || undefined,
        redirectUri,
        codeVerifier: codeVerifier || undefined,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Pragma": "no-cache",
        },
      });
    } else if (grantType === "refresh_token") {
      // Refresh access token
      const refreshToken = formData.get("refresh_token") as string;
      const scope = formData.get("scope") as string | null;

      if (!refreshToken) {
        return new Response(
          JSON.stringify({
            error: "invalid_request",
            error_description: "Missing required parameter: refresh_token",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const result = await ctx.runAction(api.oauth.tokens.refreshAccessToken, {
        refreshToken,
        clientId,
        clientSecret: clientSecret || undefined,
        scope: scope || undefined,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Pragma": "no-cache",
        },
      });
    } else {
      return new Response(
        JSON.stringify({
          error: "unsupported_grant_type",
          error_description: "Only authorization_code and refresh_token grant types are supported",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    // Map errors to OAuth error codes
    const errorCode = error.code?.toLowerCase() || "server_error";
    const errorDescription = error.message || "An error occurred";

    return new Response(
      JSON.stringify({
        error: errorCode,
        error_description: errorDescription,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Pragma": "no-cache",
        },
      }
    );
  }
});

/**
 * POST /oauth/revoke
 *
 * OAuth 2.0 Token Revocation (RFC 7009).
 * Allows clients to notify the server that a token is no longer needed.
 *
 * Form Data:
 * - token: The token to revoke (access or refresh token)
 * - token_type_hint: Optional hint about token type ("access_token" or "refresh_token")
 * - client_id: OAuth application client ID
 * - client_secret: Client secret (for confidential clients)
 *
 * Returns: Success or error (always returns 200 per RFC 7009)
 */
export const revoke = httpAction(async (ctx, request) => {
  // Only accept POST
  if (request.method !== "POST") {
    return new Response(null, { status: 200 }); // RFC 7009: Always return 200
  }

  try {
    // Parse form data
    const formData = await request.formData();
    const token = formData.get("token") as string;
    const tokenTypeHint = formData.get("token_type_hint") as string | null;
    const clientId = formData.get("client_id") as string;
    const clientSecret = formData.get("client_secret") as string | null;

    if (!token || !clientId) {
      // RFC 7009: Return 200 even for invalid requests (security consideration)
      return new Response(null, { status: 200 });
    }

    await ctx.runAction(api.oauth.tokens.revokeToken, {
      token,
      tokenTypeHint: tokenTypeHint as any,
      clientId,
      clientSecret: clientSecret || undefined,
    });

    // RFC 7009: Always return 200 OK
    return new Response(null, { status: 200 });
  } catch {
    // RFC 7009: Always return 200 OK (don't leak information about tokens)
    return new Response(null, { status: 200 });
  }
});

// Export handlers for use in main http.ts router
// These will be added to convex/http.ts
