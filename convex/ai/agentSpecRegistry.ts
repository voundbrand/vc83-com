import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import {
  AUDIT_DELIVERABLE_EMAIL_REQUEST_TOOL_NAME,
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
  SAMANTHA_AUDIT_REQUIRED_FIELDS,
  SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
  SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE,
} from "./samanthaAuditContract";
import { getAllToolDefinitions } from "./tools/registry";

export const AGENT_SPEC_CONTRACT_VERSION = "agent_spec_v1" as const;
export const AGENT_RUNTIME_MODULE_METADATA_CONTRACT_VERSION =
  "agent_runtime_module_metadata_v1" as const;
export const AGENT_RUNTIME_MODULE_HOOKS_CONTRACT_VERSION =
  "agent_runtime_hooks_v1" as const;
export const AGENT_RUNTIME_MODULE_TOOL_MANIFEST_CONTRACT_VERSION =
  "agent_runtime_tool_manifest_v1" as const;
export const AGENT_RUNTIME_MODULE_HOOK_NAMES = [
  "preRoute",
  "preLLM",
  "postLLM",
  "preTool",
  "postTool",
  "completionPolicy",
] as const;
export const SAMANTHA_AGENT_RUNTIME_MODULE_KEY =
  "one_of_one_samantha_runtime_module_v1" as const;

type UnknownRecord = Record<string, unknown>;

export type AgentRuntimeModuleHookName =
  (typeof AGENT_RUNTIME_MODULE_HOOK_NAMES)[number];

export type AgentSpecOutcomeV1 = {
  outcomeKey: string;
  requiredTools: string[];
  preconditions?: {
    requiredFields: string[];
  };
};

export type AgentSpecCapabilityV1 = {
  key: string;
  outcomes: AgentSpecOutcomeV1[];
};

export type AgentRuntimeModulePromptMetadataV1 = {
  profileRef: string;
  templateRoles: string[];
};

export type AgentRuntimeModuleHooksMetadataV1 = {
  contractVersion: typeof AGENT_RUNTIME_MODULE_HOOKS_CONTRACT_VERSION;
  enabled: AgentRuntimeModuleHookName[];
};

export type AgentRuntimeModuleToolManifestV1 = {
  contractVersion: typeof AGENT_RUNTIME_MODULE_TOOL_MANIFEST_CONTRACT_VERSION;
  requiredTools: string[];
  optionalTools: string[];
  deniedTools: string[];
};

export type AgentRuntimeModuleMetadataV1 = {
  contractVersion: typeof AGENT_RUNTIME_MODULE_METADATA_CONTRACT_VERSION;
  key: string;
  prompt: AgentRuntimeModulePromptMetadataV1;
  hooks: AgentRuntimeModuleHooksMetadataV1;
  toolManifest: AgentRuntimeModuleToolManifestV1;
  capabilities: AgentSpecCapabilityV1[];
};

export type AgentSpecV1 = {
  contractVersion: typeof AGENT_SPEC_CONTRACT_VERSION;
  agent: {
    key: string;
    identity: {
      displayName: string;
      role: string;
      templateRole?: string;
    };
    channels: {
      allowed: string[];
      defaults: {
        primary: string;
        deploymentMode?: string;
      };
    };
    capabilities: AgentSpecCapabilityV1[];
    runtimeModule?: AgentRuntimeModuleMetadataV1;
    policyProfiles: {
      orgPolicyRef: string;
      channelPolicyRef: string;
      runtimePolicyRef: string;
    };
  };
};

const BUILTIN_AGENT_RUNTIME_MODULE_REGISTRY: Record<
  string,
  AgentRuntimeModuleMetadataV1
> = {
  [SAMANTHA_AGENT_RUNTIME_MODULE_KEY]: {
    contractVersion: AGENT_RUNTIME_MODULE_METADATA_CONTRACT_VERSION,
    key: SAMANTHA_AGENT_RUNTIME_MODULE_KEY,
    prompt: {
      profileRef: "samantha_lead_capture_prompt_v1",
      templateRoles: [
        SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE,
        SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE,
      ],
    },
    hooks: {
      contractVersion: AGENT_RUNTIME_MODULE_HOOKS_CONTRACT_VERSION,
      enabled: [...AGENT_RUNTIME_MODULE_HOOK_NAMES],
    },
    toolManifest: {
      contractVersion: AGENT_RUNTIME_MODULE_TOOL_MANIFEST_CONTRACT_VERSION,
      requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
      optionalTools: [AUDIT_DELIVERABLE_EMAIL_REQUEST_TOOL_NAME],
      deniedTools: [],
    },
    capabilities: [
      {
        key: "audit_delivery",
        outcomes: [
          {
            outcomeKey: AUDIT_DELIVERABLE_OUTCOME_KEY,
            requiredTools: [AUDIT_DELIVERABLE_TOOL_NAME],
            preconditions: {
              requiredFields: [...SAMANTHA_AUDIT_REQUIRED_FIELDS],
            },
          },
        ],
      },
    ],
  },
};

const KNOWN_ORG_POLICY_PROFILES = new Set([
  "org_policy_default_v3",
]);

const KNOWN_CHANNEL_POLICY_PROFILES = new Set([
  "native_guest_policy_v2",
  "webchat_policy_v1",
]);

const KNOWN_RUNTIME_POLICY_PROFILES = new Set([
  "runtime_fail_closed_v5",
]);

const KNOWN_OUTCOME_KEYS = new Set([
  "audit_workflow_deliverable_email",
  "pdf_generated",
  "email_sent",
  "booking_created",
]);

function getKnownToolNames(): Set<string> {
  return new Set(
    getAllToolDefinitions().map((entry) => entry.name.trim()).filter((entry) => entry.length > 0),
  );
}

function asRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as UnknownRecord;
}

function assertNoUnknownKeys(record: UnknownRecord, allowedKeys: string[], path: string) {
  const allowed = new Set(allowedKeys);
  const unknown = Object.keys(record).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(`${path} contains unsupported keys: ${unknown.sort().join(", ")}`);
  }
}

function normalizeNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string`);
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${path} cannot be empty`);
  }
  return normalized;
}

function normalizeOptionalString(value: unknown, path: string): string | undefined {
  if (typeof value === "undefined") {
    return undefined;
  }
  return normalizeNonEmptyString(value, path);
}

function normalizeStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  const unique = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    unique.add(normalizeNonEmptyString(value[index], `${path}[${index}]`));
  }
  return Array.from(unique).sort((left, right) => left.localeCompare(right));
}

function normalizeOptionalStringArray(value: unknown, path: string): string[] {
  if (typeof value === "undefined") {
    return [];
  }
  return normalizeStringArray(value, path);
}

function normalizeLooseString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeLooseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const unique = new Set<string>();
  for (const entry of value) {
    const normalized = normalizeLooseString(entry);
    if (normalized) {
      unique.add(normalized);
    }
  }
  return Array.from(unique).sort((left, right) => left.localeCompare(right));
}

function isAgentRuntimeModuleHookName(value: string): value is AgentRuntimeModuleHookName {
  return AGENT_RUNTIME_MODULE_HOOK_NAMES.includes(value as AgentRuntimeModuleHookName);
}

function normalizeAgentRuntimeHookNames(value: unknown, path: string): AgentRuntimeModuleHookName[] {
  const hookNames = normalizeStringArray(value, path);
  const invalidHookName = hookNames.find((hookName) => !isAgentRuntimeModuleHookName(hookName));
  if (invalidHookName) {
    throw new Error(`${path} contains unsupported hook name: ${invalidHookName}`);
  }
  return hookNames as AgentRuntimeModuleHookName[];
}

function sortObjectDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObjectDeep(entry));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortObjectDeep(record[key]);
        return accumulator;
      }, {});
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortObjectDeep(value));
}

function fnv1aHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function normalizeOutcome(value: unknown, path: string): AgentSpecOutcomeV1 {
  const record = asRecord(value, path);
  assertNoUnknownKeys(record, ["outcomeKey", "requiredTools", "preconditions"], path);

  const requiredTools = normalizeStringArray(record.requiredTools, `${path}.requiredTools`);
  const preconditionsRaw = record.preconditions;
  let preconditions: AgentSpecOutcomeV1["preconditions"] = undefined;

  if (typeof preconditionsRaw !== "undefined") {
    const preconditionsRecord = asRecord(preconditionsRaw, `${path}.preconditions`);
    assertNoUnknownKeys(preconditionsRecord, ["requiredFields"], `${path}.preconditions`);
    preconditions = {
      requiredFields: normalizeStringArray(
        preconditionsRecord.requiredFields,
        `${path}.preconditions.requiredFields`,
      ),
    };
  }

  return {
    outcomeKey: normalizeNonEmptyString(record.outcomeKey, `${path}.outcomeKey`),
    requiredTools,
    ...(preconditions ? { preconditions } : {}),
  };
}

function normalizeCapability(value: unknown, path: string): AgentSpecCapabilityV1 {
  const record = asRecord(value, path);
  assertNoUnknownKeys(record, ["key", "outcomes"], path);
  if (!Array.isArray(record.outcomes)) {
    throw new Error(`${path}.outcomes must be an array`);
  }
  const outcomes = record.outcomes
    .map((entry, index) => normalizeOutcome(entry, `${path}.outcomes[${index}]`))
    .sort((left, right) => left.outcomeKey.localeCompare(right.outcomeKey));

  return {
    key: normalizeNonEmptyString(record.key, `${path}.key`),
    outcomes,
  };
}

function normalizeCapabilityArray(value: unknown, path: string): AgentSpecCapabilityV1[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  return value
    .map((entry, index) => normalizeCapability(entry, `${path}[${index}]`))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function normalizeAgentRuntimeModuleMetadata(
  value: unknown,
  path: string,
): AgentRuntimeModuleMetadataV1 {
  const record = asRecord(value, path);
  assertNoUnknownKeys(
    record,
    ["contractVersion", "key", "prompt", "hooks", "toolManifest", "capabilities"],
    path,
  );
  const contractVersion = normalizeNonEmptyString(record.contractVersion, `${path}.contractVersion`);
  if (contractVersion !== AGENT_RUNTIME_MODULE_METADATA_CONTRACT_VERSION) {
    throw new Error(
      `${path}.contractVersion must be ${AGENT_RUNTIME_MODULE_METADATA_CONTRACT_VERSION}`,
    );
  }

  const prompt = asRecord(record.prompt, `${path}.prompt`);
  assertNoUnknownKeys(prompt, ["profileRef", "templateRoles"], `${path}.prompt`);
  const hooks = asRecord(record.hooks, `${path}.hooks`);
  assertNoUnknownKeys(hooks, ["contractVersion", "enabled"], `${path}.hooks`);
  const hooksContractVersion = normalizeNonEmptyString(
    hooks.contractVersion,
    `${path}.hooks.contractVersion`,
  );
  if (hooksContractVersion !== AGENT_RUNTIME_MODULE_HOOKS_CONTRACT_VERSION) {
    throw new Error(
      `${path}.hooks.contractVersion must be ${AGENT_RUNTIME_MODULE_HOOKS_CONTRACT_VERSION}`,
    );
  }
  const toolManifest = asRecord(record.toolManifest, `${path}.toolManifest`);
  assertNoUnknownKeys(
    toolManifest,
    ["contractVersion", "requiredTools", "optionalTools", "deniedTools"],
    `${path}.toolManifest`,
  );
  const toolManifestContractVersion = normalizeNonEmptyString(
    toolManifest.contractVersion,
    `${path}.toolManifest.contractVersion`,
  );
  if (toolManifestContractVersion !== AGENT_RUNTIME_MODULE_TOOL_MANIFEST_CONTRACT_VERSION) {
    throw new Error(
      `${path}.toolManifest.contractVersion must be ${AGENT_RUNTIME_MODULE_TOOL_MANIFEST_CONTRACT_VERSION}`,
    );
  }

  return {
    contractVersion: AGENT_RUNTIME_MODULE_METADATA_CONTRACT_VERSION,
    key: normalizeNonEmptyString(record.key, `${path}.key`),
    prompt: {
      profileRef: normalizeNonEmptyString(prompt.profileRef, `${path}.prompt.profileRef`),
      templateRoles: normalizeOptionalStringArray(
        prompt.templateRoles,
        `${path}.prompt.templateRoles`,
      ),
    },
    hooks: {
      contractVersion: AGENT_RUNTIME_MODULE_HOOKS_CONTRACT_VERSION,
      enabled: normalizeAgentRuntimeHookNames(hooks.enabled, `${path}.hooks.enabled`),
    },
    toolManifest: {
      contractVersion: AGENT_RUNTIME_MODULE_TOOL_MANIFEST_CONTRACT_VERSION,
      requiredTools: normalizeOptionalStringArray(
        toolManifest.requiredTools,
        `${path}.toolManifest.requiredTools`,
      ),
      optionalTools: normalizeOptionalStringArray(
        toolManifest.optionalTools,
        `${path}.toolManifest.optionalTools`,
      ),
      deniedTools: normalizeOptionalStringArray(
        toolManifest.deniedTools,
        `${path}.toolManifest.deniedTools`,
      ),
    },
    capabilities: normalizeCapabilityArray(record.capabilities, `${path}.capabilities`),
  };
}

function normalizeRuntimeModuleMetadataSafely(
  value: unknown,
): AgentRuntimeModuleMetadataV1 | null {
  try {
    return normalizeAgentRuntimeModuleMetadata(value, "agent_runtime_module");
  } catch {
    return null;
  }
}

export function normalizeAgentSpecV1(input: unknown): AgentSpecV1 {
  const root = asRecord(input, "agent_spec_v1");
  assertNoUnknownKeys(root, ["contractVersion", "agent"], "agent_spec_v1");

  const contractVersion = normalizeNonEmptyString(
    root.contractVersion,
    "agent_spec_v1.contractVersion",
  );
  if (contractVersion !== AGENT_SPEC_CONTRACT_VERSION) {
    throw new Error(
      `agent_spec_v1.contractVersion must be ${AGENT_SPEC_CONTRACT_VERSION}`,
    );
  }

  const agent = asRecord(root.agent, "agent_spec_v1.agent");
  assertNoUnknownKeys(
    agent,
    ["key", "identity", "channels", "capabilities", "runtimeModule", "policyProfiles"],
    "agent_spec_v1.agent",
  );

  const identity = asRecord(agent.identity, "agent_spec_v1.agent.identity");
  assertNoUnknownKeys(
    identity,
    ["displayName", "role", "templateRole"],
    "agent_spec_v1.agent.identity",
  );

  const channels = asRecord(agent.channels, "agent_spec_v1.agent.channels");
  assertNoUnknownKeys(
    channels,
    ["allowed", "defaults"],
    "agent_spec_v1.agent.channels",
  );
  const channelDefaults = asRecord(
    channels.defaults,
    "agent_spec_v1.agent.channels.defaults",
  );
  assertNoUnknownKeys(
    channelDefaults,
    ["primary", "deploymentMode"],
    "agent_spec_v1.agent.channels.defaults",
  );
  const allowedChannels = normalizeStringArray(
    channels.allowed,
    "agent_spec_v1.agent.channels.allowed",
  );

  const capabilities = normalizeCapabilityArray(
    agent.capabilities,
    "agent_spec_v1.agent.capabilities",
  );
  const runtimeModule = typeof agent.runtimeModule === "undefined"
    ? undefined
    : normalizeAgentRuntimeModuleMetadata(
        agent.runtimeModule,
        "agent_spec_v1.agent.runtimeModule",
      );

  const policyProfiles = asRecord(
    agent.policyProfiles,
    "agent_spec_v1.agent.policyProfiles",
  );
  assertNoUnknownKeys(
    policyProfiles,
    ["orgPolicyRef", "channelPolicyRef", "runtimePolicyRef"],
    "agent_spec_v1.agent.policyProfiles",
  );

  const normalized: AgentSpecV1 = {
    contractVersion: AGENT_SPEC_CONTRACT_VERSION,
    agent: {
      key: normalizeNonEmptyString(agent.key, "agent_spec_v1.agent.key"),
      identity: {
        displayName: normalizeNonEmptyString(
          identity.displayName,
          "agent_spec_v1.agent.identity.displayName",
        ),
        role: normalizeNonEmptyString(identity.role, "agent_spec_v1.agent.identity.role"),
        templateRole: normalizeOptionalString(
          identity.templateRole,
          "agent_spec_v1.agent.identity.templateRole",
        ),
      },
      channels: {
        allowed: allowedChannels,
        defaults: {
          primary: normalizeNonEmptyString(
            channelDefaults.primary,
            "agent_spec_v1.agent.channels.defaults.primary",
          ),
          deploymentMode: normalizeOptionalString(
            channelDefaults.deploymentMode,
            "agent_spec_v1.agent.channels.defaults.deploymentMode",
          ),
        },
      },
      capabilities,
      ...(runtimeModule ? { runtimeModule } : {}),
      policyProfiles: {
        orgPolicyRef: normalizeNonEmptyString(
          policyProfiles.orgPolicyRef,
          "agent_spec_v1.agent.policyProfiles.orgPolicyRef",
        ),
        channelPolicyRef: normalizeNonEmptyString(
          policyProfiles.channelPolicyRef,
          "agent_spec_v1.agent.policyProfiles.channelPolicyRef",
        ),
        runtimePolicyRef: normalizeNonEmptyString(
          policyProfiles.runtimePolicyRef,
          "agent_spec_v1.agent.policyProfiles.runtimePolicyRef",
        ),
      },
    },
  };

  validateAgentSpecReferences(normalized);
  return normalized;
}

export function computeAgentSpecHash(spec: AgentSpecV1): string {
  return fnv1aHash(stableStringify(spec));
}

function cloneAgentSpecOutcome(outcome: AgentSpecOutcomeV1): AgentSpecOutcomeV1 {
  return {
    outcomeKey: outcome.outcomeKey,
    requiredTools: [...outcome.requiredTools],
    ...(outcome.preconditions
      ? {
          preconditions: {
            requiredFields: [...outcome.preconditions.requiredFields],
          },
        }
      : {}),
  };
}

function cloneAgentSpecCapability(capability: AgentSpecCapabilityV1): AgentSpecCapabilityV1 {
  return {
    key: capability.key,
    outcomes: capability.outcomes.map((outcome) => cloneAgentSpecOutcome(outcome)),
  };
}

function cloneAgentRuntimeModuleMetadata(
  metadata: AgentRuntimeModuleMetadataV1,
): AgentRuntimeModuleMetadataV1 {
  return {
    contractVersion: metadata.contractVersion,
    key: metadata.key,
    prompt: {
      profileRef: metadata.prompt.profileRef,
      templateRoles: [...metadata.prompt.templateRoles],
    },
    hooks: {
      contractVersion: metadata.hooks.contractVersion,
      enabled: [...metadata.hooks.enabled],
    },
    toolManifest: {
      contractVersion: metadata.toolManifest.contractVersion,
      requiredTools: [...metadata.toolManifest.requiredTools],
      optionalTools: [...metadata.toolManifest.optionalTools],
      deniedTools: [...metadata.toolManifest.deniedTools],
    },
    capabilities: metadata.capabilities.map((capability) =>
      cloneAgentSpecCapability(capability)),
  };
}

function getBuiltinRuntimeModuleByKey(moduleKey: string): AgentRuntimeModuleMetadataV1 | null {
  const moduleMetadata = BUILTIN_AGENT_RUNTIME_MODULE_REGISTRY[moduleKey];
  return moduleMetadata ? cloneAgentRuntimeModuleMetadata(moduleMetadata) : null;
}

function resolveLegacySamanthaRuntimeModule(
  config: Record<string, unknown>,
): AgentRuntimeModuleMetadataV1 | null {
  const templateRole = normalizeLooseString(config.templateRole);
  if (
    templateRole === SAMANTHA_LEAD_CAPTURE_TEMPLATE_ROLE
    || templateRole === SAMANTHA_WARM_LEAD_CAPTURE_TEMPLATE_ROLE
  ) {
    return getBuiltinRuntimeModuleByKey(SAMANTHA_AGENT_RUNTIME_MODULE_KEY);
  }
  const displayName = normalizeLooseString(config.displayName);
  const hasSamanthaDisplayName = Boolean(displayName?.toLowerCase().includes("samantha"));
  if (!hasSamanthaDisplayName) {
    return null;
  }
  const enabledTools = new Set(
    normalizeLooseStringArray(config.enabledTools)
      .map((toolName) => toolName.toLowerCase()),
  );
  return enabledTools.has(AUDIT_DELIVERABLE_TOOL_NAME)
    ? getBuiltinRuntimeModuleByKey(SAMANTHA_AGENT_RUNTIME_MODULE_KEY)
    : null;
}

export function resolveAgentRuntimeModuleMetadataFromConfig(
  config: Record<string, unknown> | null | undefined,
): AgentRuntimeModuleMetadataV1 | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const runtimeModuleRecord = (
    config.runtimeModule && typeof config.runtimeModule === "object" && !Array.isArray(config.runtimeModule)
  )
    ? (config.runtimeModule as Record<string, unknown>)
    : null;
  const explicitModuleKey = typeof config.runtimeModuleKey === "string"
    ? config.runtimeModuleKey.trim()
    : "";
  const runtimeModuleKeyFromRecord = runtimeModuleRecord
    && typeof runtimeModuleRecord.key === "string"
    ? runtimeModuleRecord.key.trim()
    : "";
  const runtimeModuleKey = explicitModuleKey || runtimeModuleKeyFromRecord;

  if (runtimeModuleRecord) {
    const normalizedModule = normalizeRuntimeModuleMetadataSafely(runtimeModuleRecord);
    if (
      normalizedModule
      && (!runtimeModuleKey || normalizedModule.key === runtimeModuleKey)
    ) {
      return normalizedModule;
    }
  }

  if (runtimeModuleKey) {
    return getBuiltinRuntimeModuleByKey(runtimeModuleKey);
  }

  return resolveLegacySamanthaRuntimeModule(config);
}

export function resolveAgentRuntimeModuleCapabilities(spec: AgentSpecV1): AgentSpecCapabilityV1[] {
  const runtimeModuleCapabilities = spec.agent.runtimeModule?.capabilities;
  if (runtimeModuleCapabilities && runtimeModuleCapabilities.length > 0) {
    return runtimeModuleCapabilities.map((capability) => cloneAgentSpecCapability(capability));
  }
  return spec.agent.capabilities.map((capability) => cloneAgentSpecCapability(capability));
}

export function resolveAgentRuntimeModuleToolManifest(
  spec: AgentSpecV1,
): AgentRuntimeModuleToolManifestV1 | null {
  if (!spec.agent.runtimeModule) {
    return null;
  }
  return {
    contractVersion: spec.agent.runtimeModule.toolManifest.contractVersion,
    requiredTools: [...spec.agent.runtimeModule.toolManifest.requiredTools],
    optionalTools: [...spec.agent.runtimeModule.toolManifest.optionalTools],
    deniedTools: [...spec.agent.runtimeModule.toolManifest.deniedTools],
  };
}

function buildScopeKey(organizationId?: string): string {
  return organizationId ? `org:${organizationId}` : "global";
}

export function validateAgentSpecReferences(spec: AgentSpecV1) {
  const knownTools = getKnownToolNames();
  const unknownTools = new Set<string>();
  const unknownOutcomes = new Set<string>();
  const runtimeModule = spec.agent.runtimeModule;
  const capabilityContracts = [
    ...spec.agent.capabilities,
    ...(runtimeModule?.capabilities ?? []),
  ];

  for (const capability of capabilityContracts) {
    for (const outcome of capability.outcomes) {
      if (!KNOWN_OUTCOME_KEYS.has(outcome.outcomeKey)) {
        unknownOutcomes.add(outcome.outcomeKey);
      }
      for (const requiredTool of outcome.requiredTools) {
        if (!knownTools.has(requiredTool)) {
          unknownTools.add(requiredTool);
        }
      }
    }
  }
  if (runtimeModule) {
    for (const moduleToolRef of [
      ...runtimeModule.toolManifest.requiredTools,
      ...runtimeModule.toolManifest.optionalTools,
      ...runtimeModule.toolManifest.deniedTools,
    ]) {
      if (!knownTools.has(moduleToolRef)) {
        unknownTools.add(moduleToolRef);
      }
    }
  }

  if (unknownTools.size > 0) {
    throw new Error(
      `agent_spec_v1 unknown tool references: ${Array.from(unknownTools)
        .sort((left, right) => left.localeCompare(right))
        .join(", ")}`,
    );
  }

  if (unknownOutcomes.size > 0) {
    throw new Error(
      `agent_spec_v1 unknown outcome references: ${Array.from(unknownOutcomes)
        .sort((left, right) => left.localeCompare(right))
        .join(", ")}`,
    );
  }

  const { orgPolicyRef, channelPolicyRef, runtimePolicyRef } = spec.agent.policyProfiles;
  if (!KNOWN_ORG_POLICY_PROFILES.has(orgPolicyRef)) {
    throw new Error(`agent_spec_v1 unknown org policy profile: ${orgPolicyRef}`);
  }
  if (!KNOWN_CHANNEL_POLICY_PROFILES.has(channelPolicyRef)) {
    throw new Error(`agent_spec_v1 unknown channel policy profile: ${channelPolicyRef}`);
  }
  if (!KNOWN_RUNTIME_POLICY_PROFILES.has(runtimePolicyRef)) {
    throw new Error(`agent_spec_v1 unknown runtime policy profile: ${runtimePolicyRef}`);
  }
}

const registryStatusValidator = v.union(v.literal("active"), v.literal("draft"));

export const internalUpsertAgentSpec = internalMutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    spec: v.any(),
    updatedBy: v.optional(v.string()),
    status: v.optional(registryStatusValidator),
  },
  handler: async (ctx, args) => {
    const normalizedSpec = normalizeAgentSpecV1(args.spec);
    const specHash = computeAgentSpecHash(normalizedSpec);
    const now = Date.now();
    const scopeKey = buildScopeKey(args.organizationId);
    const dbAny = ctx.db as any;

    const existing = await dbAny
      .query("agentSpecRegistry")
      .withIndex("by_scope_agent_key", (q: any) =>
        q.eq("scopeKey", scopeKey).eq("agentKey", normalizedSpec.agent.key))
      .first();

    const payload = {
      scopeKey,
      organizationId: args.organizationId,
      agentKey: normalizedSpec.agent.key,
      contractVersion: AGENT_SPEC_CONTRACT_VERSION,
      status: args.status ?? "active",
      specHash,
      specNormalized: normalizedSpec,
      policyRefs: normalizedSpec.agent.policyProfiles,
      channelAllowList: normalizedSpec.agent.channels.allowed,
      updatedAt: now,
      updatedBy: args.updatedBy,
    };

    if (existing) {
      await dbAny.patch(existing._id, payload);
      return {
        id: existing._id,
        created: false,
        scopeKey,
        agentKey: normalizedSpec.agent.key,
        specHash,
      };
    }

    const insertedId = await dbAny.insert("agentSpecRegistry", {
      ...payload,
      createdAt: now,
    });

    return {
      id: insertedId,
      created: true,
      scopeKey,
      agentKey: normalizedSpec.agent.key,
      specHash,
    };
  },
});

export const internalGetAgentSpecByKey = internalQuery({
  args: {
    organizationId: v.optional(v.id("organizations")),
    agentKey: v.string(),
  },
  handler: async (ctx, args) => {
    const dbAny = ctx.db as any;
    const scopeKey = buildScopeKey(args.organizationId);
    return await dbAny
      .query("agentSpecRegistry")
      .withIndex("by_scope_agent_key", (q: any) =>
        q.eq("scopeKey", scopeKey).eq("agentKey", args.agentKey.trim()))
      .first();
  },
});

export const internalGetAgentSpecByHash = internalQuery({
  args: {
    specHash: v.string(),
  },
  handler: async (ctx, args) => {
    const dbAny = ctx.db as any;
    return await dbAny
      .query("agentSpecRegistry")
      .withIndex("by_spec_hash", (q: any) => q.eq("specHash", args.specHash.trim()))
      .collect();
  },
});
