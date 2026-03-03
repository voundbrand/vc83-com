/**
 * Shared types and constants for the agent management UI.
 */

import { DEFAULT_AGENT_MODEL_ID } from "@/lib/ai/model-defaults";

export interface AgentCustomProps {
  displayName?: string;
  personality?: string;
  language?: string;
  voiceLanguage?: string;
  additionalLanguages?: string[];
  brandVoiceInstructions?: string;
  elevenLabsVoiceId?: string;
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
  escalationPolicy?: {
    triggers?: Record<string, { enabled?: boolean } | undefined>;
    holdMessage?: string;
    resumeMessage?: string;
  };
  channelBindings?: Array<{ channel: string; enabled: boolean }>;
  totalMessages?: number;
  totalCostUsd?: number;
  isPrimary?: boolean;
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
  { value: DEFAULT_AGENT_MODEL_ID, label: "Claude Sonnet 4.5" },
  { value: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5" },
] as const;

export { DEFAULT_AGENT_MODEL_ID };

export type AgentTab =
  | "trust"
  | "soul"
  | "tools"
  | "sessions"
  | "approvals"
  | "escalations"
  | "analytics"
  | "debug";
