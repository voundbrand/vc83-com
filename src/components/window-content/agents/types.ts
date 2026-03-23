/**
 * Shared types and constants for the agent management UI.
 */

import { DEFAULT_AGENT_MODEL_ID } from "@/lib/ai/model-defaults";
import type { AgentTelephonyConfig } from "@/lib/telephony/agent-telephony";

export interface AgentCustomProps {
  agentClass?: "internal_operator" | "external_customer_facing";
  displayName?: string;
  personality?: string;
  language?: string;
  voiceLanguage?: string;
  additionalLanguages?: string[];
  brandVoiceInstructions?: string;
  elevenLabsVoiceId?: string;
  systemPrompt?: string;
  faqEntries?: Array<{ q: string; a: string }>;
  toolProfile?: string;
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
  telephonyConfig?: AgentTelephonyConfig;
  channelBindings?: Array<{ channel: string; enabled: boolean }>;
  templateAgentId?: string;
  templateVersion?: string;
  cloneLifecycle?: string;
  overridePolicy?: TemplateOverridePolicy;
  templateCloneLinkage?: TemplateCloneLinkage;
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

export type AgentFormSection =
  | "identity"
  | "knowledge"
  | "model"
  | "guardrails"
  | "channels";

export type TemplateOverridePolicyMode = "locked" | "warn" | "free";
export const TEMPLATE_OVERRIDE_GATED_FIELDS = [
  "toolProfile",
  "enabledTools",
  "disabledTools",
  "autonomyLevel",
  "modelProvider",
  "modelId",
  "systemPrompt",
  "channelBindings",
] as const;
export type TemplateOverrideGatedField = (typeof TEMPLATE_OVERRIDE_GATED_FIELDS)[number];

export interface TemplateOverridePolicy {
  mode?: TemplateOverridePolicyMode;
  fields?: Record<string, { mode?: TemplateOverridePolicyMode } | undefined>;
}

export interface TemplateCloneLinkage {
  sourceTemplateId?: string;
  sourceTemplateVersion?: string;
  cloneLifecycleState?: string;
  overridePolicy?: TemplateOverridePolicy;
}

export function resolveTemplateLineage(customProps: AgentCustomProps): {
  sourceTemplateId?: string;
  sourceTemplateVersion?: string;
  cloneLifecycleState?: string;
  overridePolicyMode?: TemplateOverridePolicyMode;
  isTemplateLinked: boolean;
} {
  const linkage = customProps.templateCloneLinkage;
  const sourceTemplateId = linkage?.sourceTemplateId || customProps.templateAgentId;
  const sourceTemplateVersion = linkage?.sourceTemplateVersion || customProps.templateVersion;
  const cloneLifecycleState = linkage?.cloneLifecycleState || customProps.cloneLifecycle;
  const overridePolicyMode =
    linkage?.overridePolicy?.mode || customProps.overridePolicy?.mode;

  return {
    sourceTemplateId,
    sourceTemplateVersion,
    cloneLifecycleState,
    overridePolicyMode,
    isTemplateLinked: Boolean(sourceTemplateId),
  };
}

export function resolveTemplateFieldOverrideMode(
  customProps: AgentCustomProps,
  field: string,
): TemplateOverridePolicyMode | undefined {
  const linkagePolicy = customProps.templateCloneLinkage?.overridePolicy;
  const legacyPolicy = customProps.overridePolicy;
  const mode =
    linkagePolicy?.fields?.[field]?.mode
    || legacyPolicy?.fields?.[field]?.mode
    || linkagePolicy?.mode
    || legacyPolicy?.mode;
  if (mode === "locked" || mode === "warn" || mode === "free") {
    return mode;
  }
  return undefined;
}

function normalizeToolArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const deduped = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    deduped.add(trimmed);
  }
  return Array.from(deduped).sort((a, b) => a.localeCompare(b));
}

function normalizeChannelBindingsComparable(
  value: unknown
): Array<{ channel: string; enabled: boolean }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is { channel: string; enabled?: boolean } => {
      return !!entry && typeof entry === "object" && typeof (entry as { channel?: unknown }).channel === "string";
    })
    .map((entry) => ({
      channel: entry.channel.trim().toLowerCase(),
      enabled: entry.enabled === true,
    }))
    .sort((left, right) => {
      if (left.channel !== right.channel) {
        return left.channel.localeCompare(right.channel);
      }
      if (left.enabled === right.enabled) {
        return 0;
      }
      return left.enabled ? 1 : -1;
    });
}

function normalizeGatedFieldComparable(
  field: TemplateOverrideGatedField,
  value: unknown
): unknown {
  if (field === "enabledTools" || field === "disabledTools") {
    return normalizeToolArray(value);
  }
  if (field === "channelBindings") {
    return normalizeChannelBindingsComparable(value);
  }
  if (field === "toolProfile" || field === "systemPrompt") {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return value ?? null;
}

export function evaluateTemplateOverrideGate(
  customProps: AgentCustomProps,
  proposedUpdates: Partial<Record<TemplateOverrideGatedField, unknown>>,
): {
  isManagedTemplateClone: boolean;
  changedFields: TemplateOverrideGatedField[];
  lockedFields: TemplateOverrideGatedField[];
  warnFields: TemplateOverrideGatedField[];
  freeFields: TemplateOverrideGatedField[];
} {
  const lineage = resolveTemplateLineage(customProps);
  const isManagedTemplateClone =
    Boolean(lineage.sourceTemplateId) &&
    lineage.cloneLifecycleState !== "legacy_unmanaged";
  if (!isManagedTemplateClone) {
    return {
      isManagedTemplateClone: false,
      changedFields: [],
      lockedFields: [],
      warnFields: [],
      freeFields: [],
    };
  }

  const changedFields: TemplateOverrideGatedField[] = [];
  const lockedFields: TemplateOverrideGatedField[] = [];
  const warnFields: TemplateOverrideGatedField[] = [];
  const freeFields: TemplateOverrideGatedField[] = [];

  for (const field of TEMPLATE_OVERRIDE_GATED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(proposedUpdates, field)) {
      continue;
    }
    const nextComparable = normalizeGatedFieldComparable(field, proposedUpdates[field]);
    const currentComparable = normalizeGatedFieldComparable(field, customProps[field]);
    if (JSON.stringify(currentComparable) === JSON.stringify(nextComparable)) {
      continue;
    }
    changedFields.push(field);
    const mode =
      resolveTemplateFieldOverrideMode(customProps, field) ||
      lineage.overridePolicyMode ||
      "warn";
    if (mode === "locked") {
      lockedFields.push(field);
    } else if (mode === "warn") {
      warnFields.push(field);
    } else {
      freeFields.push(field);
    }
  }

  return {
    isManagedTemplateClone: true,
    changedFields,
    lockedFields,
    warnFields,
    freeFields,
  };
}

export const SUBTYPES = [
  { value: "customer_support", label: "Customer Support" },
  { value: "sales_assistant", label: "Sales Assistant" },
  { value: "booking_agent", label: "Booking Agent" },
  { value: "general", label: "General" },
] as const;

export const CHANNELS = [
  "whatsapp", "email", "webchat", "sms", "phone_call", "api",
  "instagram", "facebook_messenger", "telegram",
] as const;

const CHANNEL_LABELS: Record<string, string> = {
  api: "API",
  facebook_messenger: "Facebook Messenger",
  phone_call: "Phone Calls",
  sms: "SMS",
};

export function formatAgentChannelLabel(channel: string): string {
  return (
    CHANNEL_LABELS[channel]
    || channel.replace(/_/g, " ").replace(/\b\w/g, (value) => value.toUpperCase())
  );
}

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
  | "layers"
  | "soul"
  | "telephony"
  | "tools"
  | "sessions"
  | "approvals"
  | "escalations"
  | "analytics"
  | "debug";
