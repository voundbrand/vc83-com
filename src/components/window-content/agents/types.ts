/**
 * Shared types and constants for the agent management UI.
 */

export interface AgentCustomProps {
  displayName?: string;
  personality?: string;
  language?: string;
  additionalLanguages?: string[];
  brandVoiceInstructions?: string;
  systemPrompt?: string;
  faqEntries?: Array<{ q: string; a: string }>;
  enabledTools?: string[];
  disabledTools?: string[];
  autonomyLevel?: "supervised" | "autonomous" | "draft_only";
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  requireApprovalFor?: string[];
  blockedTopics?: string[];
  modelProvider?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  channelBindings?: Array<{ channel: string; enabled: boolean }>;
  totalMessages?: number;
  totalCostUsd?: number;
  soul?: {
    version?: number;
    name?: string;
    tagline?: string;
    traits?: string[];
    communicationStyle?: string;
    toneGuidelines?: string;
    neverDo?: string[];
    alwaysDo?: string[];
    emojiUsage?: string;
    lastUpdatedAt?: number;
    lastUpdatedBy?: string;
  };
}

export const SUBTYPES = [
  { value: "customer_support", label: "Customer Support" },
  { value: "sales_assistant", label: "Sales Assistant" },
  { value: "booking_agent", label: "Booking Agent" },
  { value: "general", label: "General" },
] as const;

export const CHANNELS = [
  "whatsapp", "email", "webchat", "sms", "api",
  "instagram", "facebook_messenger", "telegram",
] as const;

export const MODELS = [
  { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { value: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5" },
] as const;

export type AgentTab = "soul" | "tools" | "sessions" | "approvals" | "analytics";
