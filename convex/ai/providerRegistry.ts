import {
  AI_PROVIDER_ID_VALUES,
  type AiBillingSource,
  type AiCredentialSource,
  type AiProviderId,
} from "../channels/types";
import {
  buildEnvApiKeysByProvider,
  getDefaultProviderBaseUrl,
  getProviderAdapterContractConformanceIssues,
  getProviderAdapterContractSnapshot,
  type ProviderAdapterContractSnapshot,
} from "./modelAdapters";

export interface AiProviderRegistryEntry {
  id: AiProviderId;
  label: string;
  discoverySource: "openrouter_catalog" | "provider_api" | "manual";
  supportsCustomBaseUrl: boolean;
  defaultBaseUrl: string;
}

export const AI_PROVIDER_PLUGIN_MANIFEST_VERSION =
  "ai_provider_plugin_manifest_v1" as const;

export interface AiProviderPluginManifest {
  contractVersion?: typeof AI_PROVIDER_PLUGIN_MANIFEST_VERSION;
  id: AiProviderId;
  label: string;
  discoverySource: AiProviderRegistryEntry["discoverySource"];
  supportsCustomBaseUrl: boolean;
  defaultBaseUrl?: string;
  adapter: Omit<ProviderAdapterContractSnapshot, "providerId">;
}

export interface ProviderAuthProfileBindingLike {
  profileId?: string;
  providerId?: string;
  baseUrl?: string;
  credentialSource?: AiCredentialSource;
  billingSource?: AiBillingSource;
  apiKey?: string;
  enabled?: boolean;
  priority?: number;
  cooldownUntil?: number;
}

interface LlmSettingsProviderResolverLike {
  providerId?: string;
  openrouterApiKey?: string;
  providerAuthProfiles?: ProviderAuthProfileBindingLike[];
}

export interface ProviderBindingFallbackMetadata {
  usedFallback: boolean;
  reasons: string[];
}

export type AiProviderBindingSource =
  | "organization_auth_profile"
  | "legacy_openrouter_key"
  | "platform_env";

export interface ResolvedAiProviderBinding {
  providerId: AiProviderId;
  providerLabel: string;
  profileId: string;
  apiKey: string;
  baseUrl: string;
  priority: number;
  source: AiProviderBindingSource;
  credentialSource: AiCredentialSource;
  billingSource: AiBillingSource;
  fallbackMetadata: ProviderBindingFallbackMetadata;
}

interface ResolveOrganizationProviderBindingsArgs {
  llmSettings?: LlmSettingsProviderResolverLike | null;
  providerId?: string | null;
  envApiKeysByProvider?: Partial<Record<AiProviderId, string | undefined>>;
  envOpenRouterApiKey?: string;
  envOpenAiCompatibleBaseUrl?: string;
  defaultBillingSource?: AiBillingSource;
  now?: number;
}

const PROVIDER_ALIASES: Record<string, AiProviderId> = {
  openrouter: "openrouter",
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  google: "gemini",
  grok: "grok",
  xai: "grok",
  mistral: "mistral",
  kimi: "kimi",
  elevenlabs: "elevenlabs",
  openai_compatible: "openai_compatible",
  "openai-compatible": "openai_compatible",
};

const CREDENTIAL_SOURCE_VALUES = new Set<AiCredentialSource>([
  "platform_env",
  "platform_vault",
  "organization_setting",
  "organization_auth_profile",
  "integration_connection",
]);

const BILLING_SOURCE_VALUES = new Set<AiBillingSource>([
  "platform",
  "byok",
  "private",
]);

function toPluginAdapterContract(
  snapshot: ProviderAdapterContractSnapshot
): AiProviderPluginManifest["adapter"] {
  const { providerId, ...adapter } = snapshot;
  void providerId;
  return adapter;
}

const BUILT_IN_PROVIDER_PLUGIN_MANIFESTS: AiProviderPluginManifest[] = [
  {
    contractVersion: AI_PROVIDER_PLUGIN_MANIFEST_VERSION,
    id: "openrouter",
    label: "OpenRouter",
    discoverySource: "openrouter_catalog",
    supportsCustomBaseUrl: true,
    defaultBaseUrl: getDefaultProviderBaseUrl("openrouter"),
    adapter: toPluginAdapterContract(
      getProviderAdapterContractSnapshot("openrouter")
    ),
  },
  {
    contractVersion: AI_PROVIDER_PLUGIN_MANIFEST_VERSION,
    id: "openai",
    label: "OpenAI",
    discoverySource: "provider_api",
    supportsCustomBaseUrl: false,
    defaultBaseUrl: getDefaultProviderBaseUrl("openai"),
    adapter: toPluginAdapterContract(
      getProviderAdapterContractSnapshot("openai")
    ),
  },
  {
    contractVersion: AI_PROVIDER_PLUGIN_MANIFEST_VERSION,
    id: "anthropic",
    label: "Anthropic",
    discoverySource: "provider_api",
    supportsCustomBaseUrl: false,
    defaultBaseUrl: getDefaultProviderBaseUrl("anthropic"),
    adapter: toPluginAdapterContract(
      getProviderAdapterContractSnapshot("anthropic")
    ),
  },
  {
    contractVersion: AI_PROVIDER_PLUGIN_MANIFEST_VERSION,
    id: "gemini",
    label: "Google Gemini",
    discoverySource: "provider_api",
    supportsCustomBaseUrl: false,
    defaultBaseUrl: getDefaultProviderBaseUrl("gemini"),
    adapter: toPluginAdapterContract(
      getProviderAdapterContractSnapshot("gemini")
    ),
  },
  {
    contractVersion: AI_PROVIDER_PLUGIN_MANIFEST_VERSION,
    id: "grok",
    label: "xAI Grok",
    discoverySource: "provider_api",
    supportsCustomBaseUrl: false,
    defaultBaseUrl: getDefaultProviderBaseUrl("grok"),
    adapter: toPluginAdapterContract(
      getProviderAdapterContractSnapshot("grok")
    ),
  },
  {
    contractVersion: AI_PROVIDER_PLUGIN_MANIFEST_VERSION,
    id: "mistral",
    label: "Mistral",
    discoverySource: "provider_api",
    supportsCustomBaseUrl: false,
    defaultBaseUrl: getDefaultProviderBaseUrl("mistral"),
    adapter: toPluginAdapterContract(
      getProviderAdapterContractSnapshot("mistral")
    ),
  },
  {
    contractVersion: AI_PROVIDER_PLUGIN_MANIFEST_VERSION,
    id: "kimi",
    label: "Kimi",
    discoverySource: "provider_api",
    supportsCustomBaseUrl: false,
    defaultBaseUrl: getDefaultProviderBaseUrl("kimi"),
    adapter: toPluginAdapterContract(
      getProviderAdapterContractSnapshot("kimi")
    ),
  },
  {
    contractVersion: AI_PROVIDER_PLUGIN_MANIFEST_VERSION,
    id: "elevenlabs",
    label: "ElevenLabs",
    discoverySource: "provider_api",
    supportsCustomBaseUrl: false,
    defaultBaseUrl: getDefaultProviderBaseUrl("elevenlabs"),
    adapter: toPluginAdapterContract(
      getProviderAdapterContractSnapshot("elevenlabs")
    ),
  },
  {
    contractVersion: AI_PROVIDER_PLUGIN_MANIFEST_VERSION,
    id: "openai_compatible",
    label: "OpenAI-Compatible",
    discoverySource: "manual",
    supportsCustomBaseUrl: true,
    defaultBaseUrl: getDefaultProviderBaseUrl("openai_compatible"),
    adapter: toPluginAdapterContract(
      getProviderAdapterContractSnapshot("openai_compatible")
    ),
  },
];

const PROVIDER_REGISTRY: Partial<Record<AiProviderId, AiProviderRegistryEntry>> =
  {};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeProviderId(value: unknown): AiProviderId | null {
  const normalized = normalizeString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  return PROVIDER_ALIASES[normalized] ?? null;
}

function normalizeCredentialSource(value: unknown): AiCredentialSource | null {
  if (typeof value !== "string") {
    return null;
  }

  return CREDENTIAL_SOURCE_VALUES.has(value as AiCredentialSource)
    ? (value as AiCredentialSource)
    : null;
}

function normalizeBillingSource(value: unknown): AiBillingSource | null {
  if (typeof value !== "string") {
    return null;
  }

  return BILLING_SOURCE_VALUES.has(value as AiBillingSource)
    ? (value as AiBillingSource)
    : null;
}

function normalizePriority(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(0, Math.floor(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDiscoverySource(
  value: unknown
): AiProviderRegistryEntry["discoverySource"] | null {
  if (value === "openrouter_catalog") {
    return "openrouter_catalog";
  }
  if (value === "provider_api") {
    return "provider_api";
  }
  if (value === "manual") {
    return "manual";
  }
  return null;
}

function containsSensitiveManifestKey(key: string): boolean {
  return /api[_-]?key|token|secret|password/i.test(key);
}

function collectSensitiveManifestPaths(
  value: unknown,
  basePath = ""
): string[] {
  if (!isRecord(value)) {
    return [];
  }

  const paths: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const path = basePath ? `${basePath}.${key}` : key;
    if (containsSensitiveManifestKey(key)) {
      paths.push(path);
    }
    paths.push(...collectSensitiveManifestPaths(child, path));
  }

  return paths;
}

function parseProviderPluginManifest(value: unknown): {
  manifest: AiProviderPluginManifest | null;
  issues: string[];
} {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return {
      manifest: null,
      issues: ["manifest must be an object"],
    };
  }

  const sensitivePaths = collectSensitiveManifestPaths(value);
  if (sensitivePaths.length > 0) {
    issues.push(
      `manifest must not include credential-like fields (${sensitivePaths.join(
        ", "
      )})`
    );
  }

  const contractVersion = normalizeString(value.contractVersion);
  if (
    contractVersion &&
    contractVersion !== AI_PROVIDER_PLUGIN_MANIFEST_VERSION
  ) {
    issues.push(
      `manifest.contractVersion must be "${AI_PROVIDER_PLUGIN_MANIFEST_VERSION}"`
    );
  }

  const id = normalizeProviderId(value.id);
  if (!id) {
    issues.push("manifest.id must be a canonical provider id");
  }

  const label = normalizeString(value.label);
  if (!label) {
    issues.push("manifest.label is required");
  }

  const discoverySource = normalizeDiscoverySource(value.discoverySource);
  if (!discoverySource) {
    issues.push("manifest.discoverySource is invalid");
  }

  if (typeof value.supportsCustomBaseUrl !== "boolean") {
    issues.push("manifest.supportsCustomBaseUrl must be boolean");
  }

  const defaultBaseUrl = normalizeString(value.defaultBaseUrl) ?? undefined;

  const adapterRecord = value.adapter;
  if (!isRecord(adapterRecord)) {
    issues.push("manifest.adapter must be an object");
  }

  const requestProtocol =
    isRecord(adapterRecord) && typeof adapterRecord.requestProtocol === "string"
      ? adapterRecord.requestProtocol
      : null;
  if (
    requestProtocol !== "openai_compatible" &&
    requestProtocol !== "anthropic_messages"
  ) {
    issues.push("manifest.adapter.requestProtocol is invalid");
  }

  const supportsToolCalling =
    isRecord(adapterRecord) &&
    typeof adapterRecord.supportsToolCalling === "boolean"
      ? adapterRecord.supportsToolCalling
      : null;
  if (supportsToolCalling === null) {
    issues.push("manifest.adapter.supportsToolCalling must be boolean");
  }

  const supportsStructuredOutput =
    isRecord(adapterRecord) &&
    typeof adapterRecord.supportsStructuredOutput === "boolean"
      ? adapterRecord.supportsStructuredOutput
      : null;
  if (supportsStructuredOutput === null) {
    issues.push("manifest.adapter.supportsStructuredOutput must be boolean");
  }

  const requiresToolCallId =
    isRecord(adapterRecord) &&
    typeof adapterRecord.requiresToolCallId === "boolean"
      ? adapterRecord.requiresToolCallId
      : null;
  if (requiresToolCallId === null) {
    issues.push("manifest.adapter.requiresToolCallId must be boolean");
  }

  const toolResultField =
    isRecord(adapterRecord) && typeof adapterRecord.toolResultField === "string"
      ? adapterRecord.toolResultField
      : null;
  if (toolResultField !== "tool_use_id" && toolResultField !== "tool_call_id") {
    issues.push("manifest.adapter.toolResultField is invalid");
  }

  const reasoningParamKind =
    isRecord(adapterRecord) &&
    typeof adapterRecord.reasoningParamKind === "string"
      ? adapterRecord.reasoningParamKind
      : null;
  if (
    reasoningParamKind !== "none" &&
    reasoningParamKind !== "openrouter_reasoning"
  ) {
    issues.push("manifest.adapter.reasoningParamKind is invalid");
  }

  if (issues.length > 0 || !id || !label || !discoverySource) {
    return {
      manifest: null,
      issues,
    };
  }

  return {
    manifest: {
      contractVersion:
        contractVersion === AI_PROVIDER_PLUGIN_MANIFEST_VERSION
          ? AI_PROVIDER_PLUGIN_MANIFEST_VERSION
          : undefined,
      id,
      label,
      discoverySource,
      supportsCustomBaseUrl: Boolean(value.supportsCustomBaseUrl),
      defaultBaseUrl,
      adapter: {
        requestProtocol: requestProtocol as AiProviderPluginManifest["adapter"]["requestProtocol"],
        supportsToolCalling: supportsToolCalling as boolean,
        supportsStructuredOutput: supportsStructuredOutput as boolean,
        requiresToolCallId: requiresToolCallId as boolean,
        toolResultField: toolResultField as AiProviderPluginManifest["adapter"]["toolResultField"],
        reasoningParamKind:
          reasoningParamKind as AiProviderPluginManifest["adapter"]["reasoningParamKind"],
      },
    },
    issues,
  };
}

export function getProviderPluginManifestSchemaIssues(value: unknown): string[] {
  return parseProviderPluginManifest(value).issues;
}

export function getProviderPluginManifestConformanceIssues(
  value: unknown
): string[] {
  const parsed = parseProviderPluginManifest(value);
  if (!parsed.manifest) {
    return parsed.issues;
  }

  const adapterIssues = getProviderAdapterContractConformanceIssues({
    providerId: parsed.manifest.id,
    expected: {
      providerId: parsed.manifest.id,
      ...parsed.manifest.adapter,
    },
  }).map((issue) => `manifest.adapter ${issue}`);

  return [...parsed.issues, ...adapterIssues];
}

function resolveProviderEntryFromManifest(
  manifest: AiProviderPluginManifest
): AiProviderRegistryEntry {
  return {
    id: manifest.id,
    label: manifest.label,
    discoverySource: manifest.discoverySource,
    supportsCustomBaseUrl: manifest.supportsCustomBaseUrl,
    defaultBaseUrl:
      normalizeString(manifest.defaultBaseUrl) ??
      getDefaultProviderBaseUrl(manifest.id),
  };
}

function getProviderConformanceIssues(
  provider: AiProviderRegistryEntry
): string[] {
  const issues: string[] = [];
  if (!AI_PROVIDER_ID_VALUES.includes(provider.id)) {
    issues.push("provider.id is not canonical");
  }
  if (!normalizeString(provider.label)) {
    issues.push("provider.label is required");
  }
  if (
    provider.discoverySource !== "openrouter_catalog" &&
    provider.discoverySource !== "provider_api" &&
    provider.discoverySource !== "manual"
  ) {
    issues.push("provider.discoverySource is invalid");
  }
  if (typeof provider.supportsCustomBaseUrl !== "boolean") {
    issues.push("provider.supportsCustomBaseUrl must be boolean");
  }
  if (!normalizeString(provider.defaultBaseUrl)) {
    issues.push("provider.defaultBaseUrl is required");
  }
  return issues;
}

function registerProvider(provider: AiProviderRegistryEntry) {
  const issues = getProviderConformanceIssues(provider);
  if (issues.length > 0) {
    throw new Error(
      `[AiProviderRegistry] Provider "${provider.id}" failed conformance checks: ${issues.join(
        "; "
      )}`
    );
  }
  if (PROVIDER_REGISTRY[provider.id]) {
    throw new Error(`[AiProviderRegistry] Duplicate provider: ${provider.id}`);
  }

  PROVIDER_REGISTRY[provider.id] = provider;
}

export function registerProviderPluginManifest(manifestValue: unknown) {
  const parsed = parseProviderPluginManifest(manifestValue);
  const conformanceIssues = getProviderPluginManifestConformanceIssues(
    manifestValue
  );
  if (!parsed.manifest || conformanceIssues.length > 0) {
    throw new Error(
      `[AiProviderRegistry] Provider plugin manifest failed conformance checks: ${conformanceIssues.join(
        "; "
      )}`
    );
  }

  registerProvider(resolveProviderEntryFromManifest(parsed.manifest));
}

function registerProviderPluginManifestsFromEnv(rawPayload?: string) {
  const payload = normalizeString(rawPayload);
  if (!payload) {
    return;
  }

  let manifests: unknown;
  try {
    manifests = JSON.parse(payload);
  } catch (error) {
    throw new Error(
      `[AiProviderRegistry] Failed to parse AI_PROVIDER_PLUGIN_MANIFESTS_JSON: ${
        error instanceof Error ? error.message : "invalid_json"
      }`
    );
  }

  if (!Array.isArray(manifests)) {
    throw new Error(
      "[AiProviderRegistry] AI_PROVIDER_PLUGIN_MANIFESTS_JSON must be a JSON array"
    );
  }

  for (let index = 0; index < manifests.length; index += 1) {
    const manifest = manifests[index];
    try {
      registerProviderPluginManifest(manifest);
    } catch (error) {
      throw new Error(
        `[AiProviderRegistry] Plugin manifest at index ${index} rejected: ${
          error instanceof Error ? error.message : "unknown_error"
        }`
      );
    }
  }
}

function registerProviderPluginManifestsFromEnvSafely(rawPayload?: string) {
  try {
    registerProviderPluginManifestsFromEnv(rawPayload);
  } catch (error) {
    console.error(
      `[AiProviderRegistry] Ignoring AI_PROVIDER_PLUGIN_MANIFESTS_JSON due to initialization error: ${
        error instanceof Error ? error.message : "unknown_error"
      }`
    );
  }
}

for (const manifest of BUILT_IN_PROVIDER_PLUGIN_MANIFESTS) {
  registerProviderPluginManifest(manifest);
}

registerProviderPluginManifestsFromEnvSafely(
  process.env.AI_PROVIDER_PLUGIN_MANIFESTS_JSON
);

export function getAiProvider(providerId: AiProviderId): AiProviderRegistryEntry {
  const provider = PROVIDER_REGISTRY[providerId];
  if (!provider) {
    throw new Error(`[AiProviderRegistry] Provider not registered: ${providerId}`);
  }
  return provider;
}

export function getAllAiProviders(): AiProviderRegistryEntry[] {
  return AI_PROVIDER_ID_VALUES.map((providerId) => getAiProvider(providerId));
}

function resolveBindingBaseUrl(args: {
  providerId: AiProviderId;
  baseUrl?: string | null;
  envOpenAiCompatibleBaseUrl?: string | null;
}): { baseUrl: string; fallbackReasons: string[] } {
  const explicitBaseUrl = normalizeString(args.baseUrl);
  if (explicitBaseUrl) {
    return {
      baseUrl: explicitBaseUrl.replace(/\/+$/, ""),
      fallbackReasons: [],
    };
  }

  if (args.providerId === "openai_compatible") {
    const envBaseUrl = normalizeString(args.envOpenAiCompatibleBaseUrl);
    if (envBaseUrl) {
      return {
        baseUrl: envBaseUrl.replace(/\/+$/, ""),
        fallbackReasons: ["openai_compatible_env_base_url"],
      };
    }
  }

  return {
    baseUrl: getAiProvider(args.providerId).defaultBaseUrl,
    fallbackReasons: ["provider_default_base_url"],
  };
}

function buildFallbackMetadata(reasons: string[]): ProviderBindingFallbackMetadata {
  const deduped = Array.from(new Set(reasons)).sort((a, b) =>
    a.localeCompare(b)
  );
  return {
    usedFallback: deduped.length > 0,
    reasons: deduped,
  };
}

function resolveDefaultProviderId(
  llmSettings?: LlmSettingsProviderResolverLike | null
): AiProviderId {
  return normalizeProviderId(llmSettings?.providerId) ?? "openrouter";
}

function filterByProviderId(
  bindings: ResolvedAiProviderBinding[],
  targetProviderId: AiProviderId | null
): ResolvedAiProviderBinding[] {
  if (!targetProviderId) {
    return bindings;
  }

  return bindings.filter((binding) => binding.providerId === targetProviderId);
}

export function resolveOrganizationProviderBindings(
  args: ResolveOrganizationProviderBindingsArgs
): ResolvedAiProviderBinding[] {
  const now = args.now ?? Date.now();
  const targetProviderId = normalizeProviderId(args.providerId);
  const fallbackProviderId = resolveDefaultProviderId(args.llmSettings);
  const defaultBillingSource =
    normalizeBillingSource(args.defaultBillingSource) ?? "platform";
  const envApiKeysByProvider =
    args.envApiKeysByProvider ?? buildEnvApiKeysByProvider(process.env);
  const resolved: ResolvedAiProviderBinding[] = [];

  const profileBindings = args.llmSettings?.providerAuthProfiles ?? [];
  for (let index = 0; index < profileBindings.length; index += 1) {
    const profile = profileBindings[index];
    if (!profile || profile.enabled === false) {
      continue;
    }

    if (
      typeof profile.cooldownUntil === "number" &&
      profile.cooldownUntil > now
    ) {
      continue;
    }

    const profileId = normalizeString(profile.profileId);
    const apiKey = normalizeString(profile.apiKey);
    if (!profileId || !apiKey) {
      continue;
    }

    const profileProviderId = normalizeProviderId(profile.providerId);
    const providerId = profileProviderId ?? fallbackProviderId;
    const fallbackReasons: string[] = [];
    if (!profileProviderId) {
      fallbackReasons.push("profile_provider_defaulted");
    }

    const resolvedBaseUrl = resolveBindingBaseUrl({
      providerId,
      baseUrl: profile.baseUrl,
      envOpenAiCompatibleBaseUrl: args.envOpenAiCompatibleBaseUrl,
    });
    fallbackReasons.push(...resolvedBaseUrl.fallbackReasons);

    const credentialSource =
      normalizeCredentialSource(profile.credentialSource) ??
      "organization_auth_profile";
    if (!normalizeCredentialSource(profile.credentialSource)) {
      fallbackReasons.push("credential_source_defaulted");
    }

    const billingSource =
      normalizeBillingSource(profile.billingSource) ?? defaultBillingSource;
    if (!normalizeBillingSource(profile.billingSource)) {
      fallbackReasons.push("billing_source_defaulted");
    }

    resolved.push({
      providerId,
      providerLabel: getAiProvider(providerId).label,
      profileId,
      apiKey,
      baseUrl: resolvedBaseUrl.baseUrl,
      priority: normalizePriority(profile.priority, index),
      source: "organization_auth_profile",
      credentialSource,
      billingSource,
      fallbackMetadata: buildFallbackMetadata(fallbackReasons),
    });
  }

  const legacyOpenRouterApiKey = normalizeString(args.llmSettings?.openrouterApiKey);
  if (legacyOpenRouterApiKey) {
    const legacyBaseUrl = resolveBindingBaseUrl({
      providerId: "openrouter",
      envOpenAiCompatibleBaseUrl: args.envOpenAiCompatibleBaseUrl,
    });

    resolved.push({
      providerId: "openrouter",
      providerLabel: getAiProvider("openrouter").label,
      profileId: "legacy_openrouter_key",
      apiKey: legacyOpenRouterApiKey,
      baseUrl: legacyBaseUrl.baseUrl,
      priority: 10_000,
      source: "legacy_openrouter_key",
      credentialSource: "organization_setting",
      billingSource: defaultBillingSource,
      fallbackMetadata: buildFallbackMetadata([
        "legacy_openrouter_key",
        ...legacyBaseUrl.fallbackReasons,
      ]),
    });
  }

  let providerOffset = 0;
  for (const providerId of AI_PROVIDER_ID_VALUES) {
    const envApiKey = normalizeString(
      envApiKeysByProvider[providerId] ??
        (providerId === "openrouter" ? args.envOpenRouterApiKey : undefined)
    );
    if (!envApiKey) {
      continue;
    }

    const envBaseUrl = resolveBindingBaseUrl({
      providerId,
      envOpenAiCompatibleBaseUrl: args.envOpenAiCompatibleBaseUrl,
    });
    resolved.push({
      providerId,
      providerLabel: getAiProvider(providerId).label,
      profileId:
        providerId === "openrouter"
          ? "env_openrouter_key"
          : `env_${providerId}_key`,
      apiKey: envApiKey,
      baseUrl: envBaseUrl.baseUrl,
      priority: 20_000 + providerOffset,
      source: "platform_env",
      credentialSource: "platform_env",
      billingSource: "platform",
      fallbackMetadata: buildFallbackMetadata([
        "platform_env_key",
        ...envBaseUrl.fallbackReasons,
      ]),
    });
    providerOffset += 1;
  }

  const filtered = filterByProviderId(resolved, targetProviderId);
  const deduped = new Map<string, ResolvedAiProviderBinding>();
  for (const binding of filtered) {
    const key = `${binding.providerId}:${binding.profileId}`;
    const existing = deduped.get(key);
    if (!existing || binding.priority < existing.priority) {
      deduped.set(key, binding);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    if (a.providerId !== b.providerId) {
      return a.providerId.localeCompare(b.providerId);
    }
    return a.profileId.localeCompare(b.profileId);
  });
}

export function resolveOrganizationProviderBindingForProvider(
  args: ResolveOrganizationProviderBindingsArgs
): ResolvedAiProviderBinding | null {
  const providerId = normalizeProviderId(args.providerId);
  if (!providerId) {
    return null;
  }

  const bindings = resolveOrganizationProviderBindings({
    ...args,
    providerId,
  });
  return bindings[0] ?? null;
}

export function stripApiKeyFromBinding(
  binding: ResolvedAiProviderBinding
): Omit<ResolvedAiProviderBinding, "apiKey"> {
  // Never leak provider secrets to client-facing queries.
  const { apiKey, ...rest } = binding;
  void apiKey;
  return rest;
}
