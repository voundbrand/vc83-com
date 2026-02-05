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
  | "direct";

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
}

// Provider credentials stored in objects table (customProperties)
export interface ProviderCredentials {
  providerId: ProviderId;
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
