import { v } from "convex/values";
import {
  isWebchatCustomizationChannel,
  normalizeWebchatCustomizationContract,
  type WebchatCustomizationContract,
} from "./webchatCustomizationContractCore";

export {
  WEBCHAT_BOOTSTRAP_CONTRACT_VERSION,
  WEBCHAT_CUSTOMIZATION_DEFAULTS,
  WEBCHAT_CUSTOMIZATION_FIELDS,
  normalizeWebchatCustomizationContract,
  normalizeWebchatCustomizationOverrides,
  type PublicInboundChannel,
  type WebchatCustomizationContract,
  type WebchatCustomizationField,
  type WebchatCustomizationOverrides,
  type WebchatWidgetPosition,
} from "./webchatCustomizationContractCore";

export const webchatPositionValidator = v.union(
  v.literal("bottom-right"),
  v.literal("bottom-left")
);

export const webchatChannelBindingValidator = v.object({
  channel: v.string(),
  enabled: v.boolean(),
  welcomeMessage: v.optional(v.string()),
  brandColor: v.optional(v.string()),
  position: v.optional(webchatPositionValidator),
  collectContactInfo: v.optional(v.boolean()),
  bubbleText: v.optional(v.string()),
  offlineMessage: v.optional(v.string()),
  language: v.optional(v.string()),
});

export type ChannelBindingContractRecord = {
  channel: string;
  enabled: boolean;
} & Partial<WebchatCustomizationContract> &
  Record<string, unknown>;

export function normalizeChannelBindingContract(
  binding: ChannelBindingContractRecord
): ChannelBindingContractRecord {
  const channel = typeof binding.channel === "string" ? binding.channel.trim() : "";

  const normalizedBinding: ChannelBindingContractRecord = {
    ...binding,
    channel,
    enabled: binding.enabled === true,
  };

  if (!isWebchatCustomizationChannel(channel)) {
    return normalizedBinding;
  }

  const customization = normalizeWebchatCustomizationContract(binding);
  return {
    ...normalizedBinding,
    ...customization,
  };
}

export function normalizeChannelBindingsContract(
  bindings?: ChannelBindingContractRecord[]
): ChannelBindingContractRecord[] {
  if (!bindings || bindings.length === 0) {
    return [];
  }

  return bindings
    .filter((binding) => typeof binding.channel === "string" && binding.channel.trim().length > 0)
    .map((binding) => normalizeChannelBindingContract(binding));
}
