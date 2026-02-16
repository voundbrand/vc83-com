/**
 * WhatsApp Business API OAuth Integration
 *
 * Handles OAuth flow for Meta WhatsApp Business accounts.
 * Each organization connects their own WhatsApp Business Account,
 * allowing them to send messages using their own verified phone number.
 *
 * Flow:
 * 1. Org admin clicks "Connect WhatsApp" → initiateWhatsAppOAuth
 * 2. Redirect to Meta OAuth (Facebook Login for Business)
 * 3. User grants permissions → callback with code
 * 4. Exchange code for token → handleWhatsAppCallback
 * 5. Fetch WhatsApp Business Account ID & Phone Number ID
 * 6. Store encrypted tokens + metadata in oauthConnections
 *
 * Required Meta App Permissions:
 * - whatsapp_business_management (read WABA info)
 * - whatsapp_business_messaging (send messages)
 *
 * Environment Variables:
 * - META_APP_ID: Your Meta App ID
 * - META_APP_SECRET: Your Meta App Secret
 * - NEXT_PUBLIC_APP_URL: Your app URL for callbacks
 */

import { action, mutation, query, internalMutation, internalQuery, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

const generatedApi: any = require("../_generated/api");

// Meta OAuth endpoints
const META_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";
const META_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";
const META_GRAPH_URL = "https://graph.facebook.com/v18.0";

// WhatsApp Business API scopes
const WHATSAPP_SCOPES = [
  "whatsapp_business_management", // Read WABA info, phone numbers
  "whatsapp_business_messaging",  // Send messages
  "business_management",          // Access business info
];

/**
 * Generate Meta OAuth authorization URL
 * User will be redirected to Facebook to grant WhatsApp permissions
 */
export const initiateWhatsAppOAuth = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get current user from session
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (!user.defaultOrgId) {
      throw new Error("User must belong to an organization");
    }

    // Verify user has permission to manage integrations
    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "oauth",
      organizationId: user.defaultOrgId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    // Generate CSRF state token
    const state = crypto.randomUUID();

    // Store state in database for verification (expires in 10 minutes)
    await ctx.db.insert("oauthStates", {
      state,
      userId: user._id,
      organizationId: user.defaultOrgId,
      connectionType: "organizational", // WhatsApp is always org-level
      provider: "whatsapp",
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/whatsapp/callback`;

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.META_APP_ID || "",
      redirect_uri: redirectUri,
      scope: WHATSAPP_SCOPES.join(","),
      state,
      response_type: "code",
      // Request long-lived token exchange
      config_id: process.env.META_WHATSAPP_CONFIG_ID || "", // Optional: Embedded Signup config
    });

    const authUrl = `${META_AUTH_URL}?${params.toString()}`;

    console.log("[WhatsApp OAuth] Initiating OAuth flow", {
      hasAppId: !!process.env.META_APP_ID,
      redirectUri,
      scopes: WHATSAPP_SCOPES,
    });

    return {
      authUrl,
      state,
      message: "Redirect user to authUrl to begin OAuth flow",
    };
  },
});

/**
 * Handle OAuth callback after user grants permission
 * Exchanges authorization code for tokens and fetches WABA details
 */
export const handleWhatsAppCallback = action({
  args: {
    code: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    connectionId: Id<"oauthConnections">;
    businessName?: string;
    phoneNumber?: string;
  }> => {
    // Verify state token (CSRF protection)
    const stateRecord = await (ctx as any).runQuery(generatedApi.internal.oauth.whatsapp.verifyState, {
      state: args.state,
    });

    if (!stateRecord) {
      throw new Error("Invalid state token - possible CSRF attack");
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/whatsapp/callback`;

    // Exchange authorization code for short-lived token
    const tokenResponse = await fetch(META_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.META_APP_ID || "",
        client_secret: process.env.META_APP_SECRET || "",
        code: args.code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("[WhatsApp OAuth] Token exchange failed:", errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(`Meta OAuth error: ${tokenData.error.message || tokenData.error}`);
    }

    // Exchange short-lived token for long-lived token (60 days)
    const longLivedResponse = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: process.env.META_APP_ID || "",
          client_secret: process.env.META_APP_SECRET || "",
          fb_exchange_token: tokenData.access_token,
        })
    );

    let accessToken = tokenData.access_token;
    let tokenExpiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

    if (longLivedResponse.ok) {
      const longLivedData = await longLivedResponse.json();
      if (longLivedData.access_token) {
        accessToken = longLivedData.access_token;
        // Long-lived tokens are valid for 60 days
        tokenExpiresAt = Date.now() + (longLivedData.expires_in || 60 * 24 * 60 * 60) * 1000;
      }
    }

    // Fetch user's WhatsApp Business Accounts
    const wabaResponse = await fetch(
      `${META_GRAPH_URL}/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,account_review_status}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!wabaResponse.ok) {
      const errorText = await wabaResponse.text();
      console.error("[WhatsApp OAuth] Failed to fetch WABA:", errorText);
      throw new Error(`Failed to fetch WhatsApp Business Account: ${errorText}`);
    }

    const wabaData = await wabaResponse.json();

    // Find first approved WhatsApp Business Account
    let wabaId: string | null = null;
    let wabaName: string | null = null;
    let businessId: string | null = null;
    let businessName: string | null = null;

    for (const business of wabaData.data || []) {
      businessId = business.id;
      businessName = business.name;

      const ownedWabas = business.owned_whatsapp_business_accounts?.data || [];
      for (const waba of ownedWabas) {
        if (waba.account_review_status === "APPROVED" || !waba.account_review_status) {
          wabaId = waba.id;
          wabaName = waba.name;
          break;
        }
      }
      if (wabaId) break;
    }

    if (!wabaId) {
      throw new Error("No approved WhatsApp Business Account found. Please set up a WhatsApp Business Account in Meta Business Suite first.");
    }

    // Fetch phone numbers for this WABA
    const phoneResponse = await fetch(
      `${META_GRAPH_URL}/${wabaId}/phone_numbers?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let phoneNumberId: string | null = null;
    let phoneNumber: string | null = null;
    let verifiedName: string | null = null;

    if (phoneResponse.ok) {
      const phoneData = await phoneResponse.json();
      const phones = phoneData.data || [];

      // Find first verified phone number
      for (const phone of phones) {
        if (phone.code_verification_status === "VERIFIED" || !phone.code_verification_status) {
          phoneNumberId = phone.id;
          phoneNumber = phone.display_phone_number;
          verifiedName = phone.verified_name;
          break;
        }
      }
    }

    if (!phoneNumberId) {
      console.warn("[WhatsApp OAuth] No phone number found - user will need to add one");
    }

    // Encrypt tokens before storage
    const encryptedAccessToken = await (ctx as any).runAction(generatedApi.internal.oauth.encryption.encryptToken, {
      plaintext: accessToken,
    });

    // Meta doesn't provide refresh tokens for this flow
    // We'll need to re-auth when token expires
    const encryptedRefreshToken = encryptedAccessToken;

    // Store connection in database
    const connectionId = await (ctx as any).runMutation(generatedApi.internal.oauth.whatsapp.storeConnection, {
      organizationId: stateRecord.organizationId,
      providerAccountId: wabaId,
      providerEmail: `${wabaName}@whatsapp.business`, // Synthetic email for schema
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt,
      scopes: WHATSAPP_SCOPES,
      metadata: {
        wabaId,
        wabaName,
        businessId,
        businessName,
        phoneNumberId,
        phoneNumber,
        verifiedName,
      },
    });

    // Delete used state token
    await (ctx as any).runMutation(generatedApi.internal.oauth.whatsapp.deleteState, {
      state: args.state,
    });

    // Log audit event
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: stateRecord.userId,
      organizationId: stateRecord.organizationId,
      action: "connect_oauth",
      resource: "oauth_connections",
      success: true,
      metadata: {
        provider: "whatsapp",
        wabaId,
        wabaName,
        phoneNumber,
      },
    });

    console.log("[WhatsApp OAuth] Connection successful", {
      connectionId,
      wabaId,
      phoneNumber,
    });

    return {
      success: true,
      connectionId,
      businessName: wabaName || businessName || undefined,
      phoneNumber: phoneNumber || undefined,
    };
  },
});

/**
 * Disconnect WhatsApp OAuth connection
 */
export const disconnectWhatsApp = mutation({
  args: {
    sessionId: v.string(),
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid or expired session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error("Connection not found");
    }

    if (connection.provider !== "whatsapp") {
      throw new Error("Not a WhatsApp connection");
    }

    // Verify permission
    const canManage = await (ctx as any).runQuery(generatedApi.api.auth.canUserPerform, {
      sessionId: args.sessionId,
      permission: "manage_integrations",
      resource: "oauth",
      organizationId: connection.organizationId,
    });

    if (!canManage) {
      throw new Error("Permission denied: manage_integrations required");
    }

    // Mark connection as revoked
    await ctx.db.patch(args.connectionId, {
      status: "revoked",
      updatedAt: Date.now(),
    });

    // Log audit event
    await (ctx as any).runMutation(generatedApi.internal.rbac.logAudit, {
      userId: user._id,
      organizationId: connection.organizationId,
      action: "disconnect_oauth",
      resource: "oauth_connections",
      success: true,
      metadata: {
        provider: "whatsapp",
        wabaId: (connection.customProperties as Record<string, unknown>)?.wabaId,
      },
    });

    return { success: true };
  },
});

/**
 * Get WhatsApp connection status for organization
 */
export const getWhatsAppConnectionStatus = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId as Id<"sessions">);
    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.defaultOrgId) {
      return null;
    }

    const connection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", user.defaultOrgId as Id<"organizations">)
          .eq("provider", "whatsapp")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!connection) {
      return {
        connected: false,
        connection: null,
      };
    }

    const metadata = connection.customProperties as Record<string, unknown> | undefined;

    // Check if token is expiring soon (within 7 days)
    const isExpiringSoon = connection.tokenExpiresAt < Date.now() + 7 * 24 * 60 * 60 * 1000;

    return {
      connected: true,
      isExpiringSoon,
      connection: {
        id: connection._id,
        wabaId: metadata?.wabaId,
        wabaName: metadata?.wabaName,
        businessName: metadata?.businessName,
        phoneNumberId: metadata?.phoneNumberId,
        phoneNumber: metadata?.phoneNumber,
        verifiedName: metadata?.verifiedName,
        connectedAt: connection.connectedAt,
        tokenExpiresAt: connection.tokenExpiresAt,
      },
    };
  },
});

/**
 * Send WhatsApp message using organization's connection
 * Internal use - called by messageSender
 */
export const sendWhatsAppMessage = internalAction({
  args: {
    organizationId: v.id("organizations"),
    to: v.string(), // Phone number in E.164 format
    templateName: v.string(),
    templateLanguage: v.optional(v.string()),
    templateParameters: v.optional(v.array(v.string())),
    // For text messages (only within 24h conversation window)
    textMessage: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> => {
    // Get organization's WhatsApp connection
    const connection = await (ctx as any).runQuery(generatedApi.internal.oauth.whatsapp.getConnection, {
      organizationId: args.organizationId,
    });

    if (!connection) {
      return {
        success: false,
        error: "WhatsApp not connected for this organization",
      };
    }

    const metadata = connection.customProperties as Record<string, unknown>;
    const phoneNumberId = metadata?.phoneNumberId as string | undefined;

    if (!phoneNumberId) {
      return {
        success: false,
        error: "No WhatsApp phone number configured",
      };
    }

    // Check if token is expired
    if (connection.tokenExpiresAt < Date.now()) {
      // Mark connection as expired
      await (ctx as any).runMutation(generatedApi.internal.oauth.whatsapp.markConnectionExpired, {
        connectionId: connection._id,
      });

      return {
        success: false,
        error: "WhatsApp token expired - reconnection required",
      };
    }

    // Decrypt access token
    const accessToken = await (ctx as any).runAction(generatedApi.internal.oauth.encryption.decryptToken, {
      encrypted: connection.accessToken,
    });

    // Build message payload
    let messagePayload: Record<string, unknown>;

    if (args.textMessage) {
      // Text message (only works within 24h conversation window)
      messagePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: args.to,
        type: "text",
        text: {
          preview_url: false,
          body: args.textMessage,
        },
      };
    } else {
      // Template message (works anytime)
      messagePayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: args.to,
        type: "template",
        template: {
          name: args.templateName,
          language: {
            code: args.templateLanguage || "de",
          },
          components: args.templateParameters?.length
            ? [
                {
                  type: "body",
                  parameters: args.templateParameters.map((text) => ({
                    type: "text",
                    text,
                  })),
                },
              ]
            : undefined,
        },
      };
    }

    // Send message via Meta API
    const response = await fetch(
      `${META_GRAPH_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("[WhatsApp] Send failed:", result);
      return {
        success: false,
        error: result.error?.message || `Send failed: ${response.status}`,
      };
    }

    const messageId = result.messages?.[0]?.id;

    console.log("[WhatsApp] Message sent successfully", {
      messageId,
      to: args.to,
      templateName: args.templateName,
    });

    return {
      success: true,
      messageId,
    };
  },
});

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Verify OAuth state token (internal)
 */
export const verifyState = internalQuery({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const stateRecord = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!stateRecord) {
      console.error("[WhatsApp OAuth] State token not found:", args.state);
      return null;
    }

    if (stateRecord.expiresAt < Date.now()) {
      console.error("[WhatsApp OAuth] State token expired");
      return null;
    }

    if (stateRecord.provider !== "whatsapp") {
      console.error("[WhatsApp OAuth] State token is for different provider:", stateRecord.provider);
      return null;
    }

    return {
      userId: stateRecord.userId,
      organizationId: stateRecord.organizationId,
    };
  },
});

/**
 * Store OAuth connection (internal)
 */
export const storeConnection = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    providerAccountId: v.string(),
    providerEmail: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiresAt: v.number(),
    scopes: v.array(v.string()),
    metadata: v.any(),
  },
  handler: async (ctx, args) => {
    // Check if connection already exists
    const existingConnection = await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "whatsapp")
      )
      .first();

    if (existingConnection) {
      // Update existing connection
      await ctx.db.patch(existingConnection._id, {
        providerAccountId: args.providerAccountId,
        providerEmail: args.providerEmail,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiresAt: args.tokenExpiresAt,
        scopes: args.scopes,
        status: "active",
        customProperties: args.metadata,
        lastSyncAt: Date.now(),
        updatedAt: Date.now(),
      });

      return existingConnection._id;
    }

    // Create new connection
    const connectionId = await ctx.db.insert("oauthConnections", {
      organizationId: args.organizationId,
      provider: "whatsapp",
      providerAccountId: args.providerAccountId,
      providerEmail: args.providerEmail,
      connectionType: "organizational",
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      scopes: args.scopes,
      syncSettings: {
        email: false,
        calendar: false,
        oneDrive: false,
        sharePoint: false,
      },
      status: "active",
      connectedAt: Date.now(),
      updatedAt: Date.now(),
      customProperties: args.metadata,
    });

    return connectionId;
  },
});

/**
 * Delete OAuth state token (internal)
 */
export const deleteState = internalMutation({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const stateRecord = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (stateRecord) {
      await ctx.db.delete(stateRecord._id);
    }
  },
});

/**
 * Get OAuth connection (internal)
 */
export const getConnection = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("oauthConnections")
      .withIndex("by_org_and_provider", (q) =>
        q.eq("organizationId", args.organizationId).eq("provider", "whatsapp")
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});

/**
 * Mark connection as expired (internal)
 */
export const markConnectionExpired = internalMutation({
  args: {
    connectionId: v.id("oauthConnections"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, {
      status: "expired",
      updatedAt: Date.now(),
    });
  },
});
