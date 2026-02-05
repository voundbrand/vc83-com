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

const PROVIDER_REGISTRY: Record<string, ChannelProvider> = {};

function registerProvider(provider: ChannelProvider) {
  PROVIDER_REGISTRY[provider.id] = provider;
}

// Register built-in providers
registerProvider(chatwootProvider);
registerProvider(manychatProvider);
registerProvider(whatsappProvider);
registerProvider(infobipProvider);

export function getProvider(id: ProviderId): ChannelProvider | null {
  return PROVIDER_REGISTRY[id] ?? null;
}

export function getAllProviders(): ChannelProvider[] {
  return Object.values(PROVIDER_REGISTRY);
}

export function getProvidersForChannel(channel: ChannelType): ChannelProvider[] {
  return Object.values(PROVIDER_REGISTRY).filter((p) =>
    p.capabilities.supportedChannels.includes(channel)
  );
}
