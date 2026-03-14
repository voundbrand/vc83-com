/**
 * CHANNEL PROVIDER REGISTRY
 *
 * Runtime registry for channel providers.
 * Providers register themselves at module load.
 * The router uses this to look up provider implementations.
 */

import type { ChannelProvider, ProviderId, ChannelType } from "./types";
import { chatwootProvider } from "./providers/chatwoot";
import { manychatProvider } from "./providers/manychatAdapter";
import { whatsappProvider } from "./providers/whatsappProvider";
import { infobipProvider } from "./providers/infobipProvider";
import { telegramProvider } from "./providers/telegramProvider";
import { slackProvider } from "./providers/slackProvider";
import { directCallProvider } from "./providers/directCallProvider";

const PROVIDER_REGISTRY: Record<string, ChannelProvider> = {};
const PROVIDER_ID_ALIASES = Object.freeze({
  eleven_telephony: "direct",
});

function normalizeProviderLookupId(id: string): string {
  const normalized = id.trim();
  if (!normalized) {
    return normalized;
  }
  return PROVIDER_ID_ALIASES[normalized as keyof typeof PROVIDER_ID_ALIASES] ?? normalized;
}

export function getProviderConformanceIssues(provider: ChannelProvider): string[] {
  const issues: string[] = [];

  if (!provider.id?.trim()) {
    issues.push("provider.id is required");
  }
  if (!provider.name?.trim()) {
    issues.push("provider.name is required");
  }
  if (!provider.capabilities?.supportedChannels?.length) {
    issues.push("provider.capabilities.supportedChannels must be non-empty");
  }
  if (typeof provider.normalizeInbound !== "function") {
    issues.push("provider.normalizeInbound must be implemented");
  }
  if (typeof provider.sendMessage !== "function") {
    issues.push("provider.sendMessage must be implemented");
  }
  if (typeof provider.verifyWebhook !== "function") {
    issues.push("provider.verifyWebhook must be implemented");
  }
  if (typeof provider.testConnection !== "function") {
    issues.push("provider.testConnection must be implemented");
  }

  return issues;
}

function registerProvider(provider: ChannelProvider) {
  const issues = getProviderConformanceIssues(provider);
  if (issues.length > 0) {
    throw new Error(
      `[ChannelRegistry] Provider "${provider.id}" failed conformance checks: ${issues.join(
        "; "
      )}`
    );
  }
  if (PROVIDER_REGISTRY[provider.id]) {
    throw new Error(`[ChannelRegistry] Duplicate provider registration: ${provider.id}`);
  }
  PROVIDER_REGISTRY[provider.id] = provider;
}

// Register built-in providers
registerProvider(chatwootProvider);
registerProvider(manychatProvider);
registerProvider(whatsappProvider);
registerProvider(infobipProvider);
registerProvider(telegramProvider);
registerProvider(slackProvider);
registerProvider(directCallProvider);

export function getProvider(id: ProviderId): ChannelProvider | null {
  return PROVIDER_REGISTRY[normalizeProviderLookupId(id)] ?? null;
}

export function getProviderByIdentity(id: string): ChannelProvider | null {
  if (!id?.trim()) {
    return null;
  }
  return PROVIDER_REGISTRY[normalizeProviderLookupId(id)] ?? null;
}

export function getAllProviders(): ChannelProvider[] {
  return Object.values(PROVIDER_REGISTRY);
}

export function getProvidersForChannel(channel: ChannelType): ChannelProvider[] {
  return Object.values(PROVIDER_REGISTRY).filter((p) =>
    p.capabilities.supportedChannels.includes(channel)
  );
}
