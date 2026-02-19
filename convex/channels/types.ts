/**
 * CHANNEL PROVIDER TYPES
 *
 * Core abstraction for pluggable messaging providers.
 * Each provider (Chatwoot, ManyChat, Twilio, Infobip, etc.)
 * implements ChannelProvider to normalize inbound/outbound messaging.
 *
 * Provider code handles the "how" (API calls, payload parsing).
 * Channel bindings in the DB handle the "who uses what" (org → provider → channel).
 */

// Canonical channel identifiers used across the platform
export type ChannelType =
  | "whatsapp"
  | "sms"
  | "email"
  | "instagram"
  | "facebook_messenger"
  | "webchat"
  | "telegram"
  | "slack"
  | "pushover";

// Provider identifiers — each maps to a TypeScript implementation
export type ProviderId =
  | "chatwoot"
  | "manychat"
  | "pushover"
  | "resend"
  | "infobip"
  | "twilio"
  | "whatsapp"
  | "telegram"
  | "slack"
  | "direct";

export type ProviderCredentialSource =
  | "oauth_connection"
  | "object_settings"
  | "env_fallback"
  | "platform_fallback";

export type ProviderProfileType = "platform" | "organization";

export interface ChannelBindingInstallationIdentity {
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: ProviderProfileType;
  routeKey?: string;
  allowPlatformFallback?: boolean;
}

export interface ChannelProviderBindingContract
  extends ChannelBindingInstallationIdentity {
  channel: string;
  providerId: ProviderId;
  priority?: number;
  enabled?: boolean;
}

// Canonical AI provider taxonomy (BMF-002).
export const AI_PROVIDER_ID_VALUES = [
  "openrouter",
  "openai",
  "anthropic",
  "gemini",
  "grok",
  "mistral",
  "kimi",
  "elevenlabs",
  "openai_compatible",
] as const;

export type AiProviderId = (typeof AI_PROVIDER_ID_VALUES)[number];

// Canonical AI credential source taxonomy (BMF-002).
export const AI_CREDENTIAL_SOURCE_VALUES = [
  "platform_env",
  "platform_vault",
  "organization_setting",
  "organization_auth_profile",
  "integration_connection",
] as const;

export type AiCredentialSource = (typeof AI_CREDENTIAL_SOURCE_VALUES)[number];

// Canonical AI capability matrix (BMF-002).
export const AI_CAPABILITY_VALUES = [
  "text",
  "vision",
  "audio_in",
  "audio_out",
  "tools",
  "json",
] as const;

export type AiCapability = (typeof AI_CAPABILITY_VALUES)[number];
export type AiCapabilityMatrix = Record<AiCapability, boolean>;

// Canonical AI billing source taxonomy (BMF-002).
export const AI_BILLING_SOURCE_VALUES = [
  "platform",
  "byok",
  "private",
] as const;

export type AiBillingSource = (typeof AI_BILLING_SOURCE_VALUES)[number];

export type ProviderCredentialField =
  | "whatsappAccessToken"
  | "slackBotToken"
  | "telegramBotToken"
  | "telegramWebhookSecret"
  | "chatwootApiToken"
  | "manychatApiKey"
  | "resendApiKey";

// Normalized inbound message from any provider
export interface NormalizedInboundMessage {
  organizationId: string;
  channel: ChannelType;
  externalContactIdentifier: string;
  message: string;
  messageType: "text" | "image" | "audio" | "video" | "file" | "location";
  metadata: InboundMessageMetadata;
}

export interface InboundMessageMetadata {
  providerId: ProviderId;
  providerMessageId?: string;
  providerEventId?: string;
  providerConversationId?: string;
  senderName?: string;
  senderAvatar?: string;
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
  skipOutbound?: boolean;
  raw?: Record<string, unknown>;
  [key: string]: unknown;
}

// Outbound message to send through a provider
export interface OutboundMessage {
  channel: ChannelType;
  recipientIdentifier: string;
  content: string;
  contentHtml?: string;
  subject?: string;
  metadata?: {
    providerConversationId?: string;
    templateName?: string;
    templateParams?: string[];
  };
}

// Result of sending a message
export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
  retryable?: boolean;
  statusCode?: number;
  retryAfterMs?: number;
}

// Provider credentials stored in objects table (customProperties)
export interface ProviderCredentials {
  providerId: ProviderId;
  credentialSource?: ProviderCredentialSource;
  encryptedFields?: ProviderCredentialField[];
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: ProviderProfileType;
  bindingRouteKey?: string;
  // Chatwoot
  chatwootUrl?: string;
  chatwootApiToken?: string;
  chatwootAccountId?: number;
  chatwootInboxIds?: Record<string, number>;
  // ManyChat
  manychatApiKey?: string;
  // Pushover
  pushoverAppToken?: string;
  pushoverUserKey?: string;
  // WhatsApp (Direct Meta API — credentials from oauthConnections)
  whatsappPhoneNumberId?: string;
  whatsappAccessToken?: string;
  whatsappWabaId?: string;
  whatsappOrganizationId?: string;
  // Infobip
  infobipApiKey?: string;
  infobipBaseUrl?: string;
  infobipSmsSenderId?: string;
  // Infobip CPaaS X (multi-tenant isolation)
  infobipApplicationId?: string;
  infobipEntityId?: string;
  // Resend (per-org email)
  resendApiKey?: string;
  resendSenderEmail?: string;
  resendReplyToEmail?: string;
  // Telegram (per-org custom bot)
  telegramBotToken?: string;
  telegramBotUsername?: string;
  telegramWebhookSecret?: string;
  // Slack (per-org OAuth bot)
  slackBotToken?: string;
  slackBotUserId?: string;
  slackTeamId?: string;
  slackAppId?: string;
  slackSigningSecret?: string;
  // Generic
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
}

// What a provider can do
export interface ChannelProviderCapabilities {
  supportedChannels: ChannelType[];
  supportsInbound: boolean;
  supportsOutbound: boolean;
  supportsWebhooks: boolean;
  supportsAttachments: boolean;
  supportsTemplates: boolean;
  supportsConversationThreading: boolean;
}

// The interface every provider must implement
export interface ChannelProvider {
  id: ProviderId;
  name: string;
  capabilities: ChannelProviderCapabilities;

  normalizeInbound(
    rawPayload: Record<string, unknown>,
    credentials: ProviderCredentials
  ): NormalizedInboundMessage | null;

  sendMessage(
    credentials: ProviderCredentials,
    message: OutboundMessage
  ): Promise<SendResult>;

  verifyWebhook(
    body: string,
    headers: Record<string, string>,
    credentials: ProviderCredentials
  ): boolean;

  testConnection(credentials: ProviderCredentials): Promise<{
    success: boolean;
    accountName?: string;
    error?: string;
  }>;
}
