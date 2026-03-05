import {
  resolveAgentRuntimeModuleCapabilities,
  resolveAgentRuntimeModuleToolManifest,
  type AgentSpecCapabilityV1,
  type AgentSpecV1,
} from "./agentSpecRegistry";
import { normalizeDeterministicToolNames } from "./toolScoping";

export const RUNTIME_CAPABILITY_MANIFEST_CONTRACT_VERSION =
  "runtime_capability_manifest_v1" as const;

export type RuntimePolicyDecisionSourceLayer =
  | "platform"
  | "org"
  | "agent"
  | "session"
  | "channel";

export interface PolicyCompilerProfile {
  ref: string;
  allowedTools?: string[];
  deniedTools?: string[];
  allowedChannels?: string[];
  denyCatalog?: string[];
}

export interface RuntimePolicyCompilerInput {
  agentSpec: AgentSpecV1;
  orgPolicyProfile: PolicyCompilerProfile;
  channelPolicyProfile: PolicyCompilerProfile;
  runtimeDefaultsProfile: PolicyCompilerProfile;
  compiledAtMs?: number;
}

export interface RuntimeCapabilityManifestV1 {
  contractVersion: typeof RUNTIME_CAPABILITY_MANIFEST_CONTRACT_VERSION;
  manifestHash: string;
  compiledAt: number;
  inputs: {
    agentSpecVersion: "agent_spec_v1";
    agentSpecHash: string;
    orgPolicyHash: string;
    channelPolicyHash: string;
  };
  channelDecisions: Record<string, { allowed: boolean; reasonCode: string }>;
  toolDecisions: Record<
    string,
    {
      allowed: boolean;
      sourceLayer: RuntimePolicyDecisionSourceLayer;
      denials: string[];
    }
  >;
  outcomeContracts: Record<
    string,
    {
      requiredTools: string[];
      requiredFields: string[];
      enforcementMode: "enforce";
    }
  >;
  denyCatalog: string[];
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStringArray(values?: string[]): string[] {
  return Array.from(
    new Set(
      (values ?? [])
        .map((entry) => normalizeString(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort((left, right) => left.localeCompare(right));
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fnv1aHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function computeDeterministicHash(payload: unknown): string {
  return fnv1aHash(stableStringify(payload));
}

function resolveChannelDecisions(args: {
  agentChannels: string[];
  channelAllowList: string[];
}): RuntimeCapabilityManifestV1["channelDecisions"] {
  const channelDecisions: RuntimeCapabilityManifestV1["channelDecisions"] = {};
  const allowedByPolicy = new Set(args.channelAllowList);
  for (const channel of args.agentChannels) {
    if (allowedByPolicy.size === 0 || allowedByPolicy.has(channel)) {
      channelDecisions[channel] = {
        allowed: true,
        reasonCode: "allow_channel_bound",
      };
      continue;
    }
    channelDecisions[channel] = {
      allowed: false,
      reasonCode: "channel_not_allowed",
    };
  }
  return Object.keys(channelDecisions)
    .sort((left, right) => left.localeCompare(right))
    .reduce<RuntimeCapabilityManifestV1["channelDecisions"]>((accumulator, key) => {
      accumulator[key] = channelDecisions[key];
      return accumulator;
    }, {});
}

function resolveToolDecisions(args: {
  toolNames: string[];
  orgAllowed: string[];
  orgDenied: string[];
  channelDenied: string[];
}): RuntimeCapabilityManifestV1["toolDecisions"] {
  const orgAllowSet = new Set(args.orgAllowed);
  const orgDenySet = new Set(args.orgDenied);
  const channelDenySet = new Set(args.channelDenied);
  const decisions: RuntimeCapabilityManifestV1["toolDecisions"] = {};

  for (const toolName of args.toolNames) {
    const denials: string[] = [];
    let sourceLayer: RuntimePolicyDecisionSourceLayer = "agent";
    if (orgAllowSet.size > 0 && !orgAllowSet.has(toolName)) {
      denials.push("tool_not_allowlisted_org");
      sourceLayer = "org";
    }
    if (orgDenySet.has(toolName)) {
      denials.push("tool_denied_org");
      sourceLayer = "org";
    }
    if (channelDenySet.has(toolName)) {
      denials.push("tool_denied_channel");
      sourceLayer = "channel";
    }

    decisions[toolName] = {
      allowed: denials.length === 0,
      sourceLayer,
      denials: denials.sort((left, right) => left.localeCompare(right)),
    };
  }

  return Object.keys(decisions)
    .sort((left, right) => left.localeCompare(right))
    .reduce<RuntimeCapabilityManifestV1["toolDecisions"]>((accumulator, key) => {
      accumulator[key] = decisions[key];
      return accumulator;
    }, {});
}

function resolveOutcomeContracts(
  capabilities: AgentSpecCapabilityV1[],
): RuntimeCapabilityManifestV1["outcomeContracts"] {
  const entries: RuntimeCapabilityManifestV1["outcomeContracts"] = {};
  for (const capability of capabilities) {
    for (const outcome of capability.outcomes) {
      entries[outcome.outcomeKey] = {
        requiredTools: normalizeDeterministicToolNames(outcome.requiredTools),
        requiredFields: normalizeStringArray(outcome.preconditions?.requiredFields),
        enforcementMode: "enforce",
      };
    }
  }
  return Object.keys(entries)
    .sort((left, right) => left.localeCompare(right))
    .reduce<RuntimeCapabilityManifestV1["outcomeContracts"]>((accumulator, key) => {
      accumulator[key] = entries[key];
      return accumulator;
    }, {});
}

export function compileRuntimeCapabilityManifest(
  input: RuntimePolicyCompilerInput,
): RuntimeCapabilityManifestV1 {
  const agentChannels = normalizeStringArray(input.agentSpec.agent.channels.allowed);
  const orgAllowedTools = normalizeDeterministicToolNames(input.orgPolicyProfile.allowedTools ?? []);
  const orgDeniedTools = normalizeDeterministicToolNames(input.orgPolicyProfile.deniedTools ?? []);
  const channelAllowed = normalizeStringArray(input.channelPolicyProfile.allowedChannels ?? []);
  const channelDeniedTools = normalizeDeterministicToolNames(
    input.channelPolicyProfile.deniedTools ?? [],
  );
  const runtimeCapabilities = resolveAgentRuntimeModuleCapabilities(input.agentSpec);
  const runtimeToolManifest = resolveAgentRuntimeModuleToolManifest(input.agentSpec);
  const moduleManifestTools = normalizeDeterministicToolNames([
    ...(runtimeToolManifest?.requiredTools ?? []),
    ...(runtimeToolManifest?.optionalTools ?? []),
  ]);

  const requiredTools = normalizeDeterministicToolNames(
    [
      ...moduleManifestTools,
      ...runtimeCapabilities.flatMap((capability) =>
        capability.outcomes.flatMap((outcome) => outcome.requiredTools)),
    ],
  );

  const channelDecisions = resolveChannelDecisions({
    agentChannels,
    channelAllowList: channelAllowed,
  });
  const toolDecisions = resolveToolDecisions({
    toolNames: requiredTools,
    orgAllowed: orgAllowedTools,
    orgDenied: orgDeniedTools,
    channelDenied: channelDeniedTools,
  });
  const outcomeContracts = resolveOutcomeContracts(runtimeCapabilities);
  const decisionDenials = Object.values(toolDecisions).flatMap(
    (decision) => decision.denials,
  );

  const denyCatalog = normalizeStringArray([
    "context_invalid",
    "channel_not_allowed",
    "tool_unavailable",
    "precondition_missing",
    "replay_duplicate",
    ...decisionDenials,
    ...(input.runtimeDefaultsProfile.denyCatalog ?? []),
  ]);

  const inputs = {
    agentSpecVersion: "agent_spec_v1" as const,
    agentSpecHash: computeDeterministicHash(input.agentSpec),
    orgPolicyHash: computeDeterministicHash({
      ref: input.orgPolicyProfile.ref,
      allowedTools: orgAllowedTools,
      deniedTools: orgDeniedTools,
    }),
    channelPolicyHash: computeDeterministicHash({
      ref: input.channelPolicyProfile.ref,
      allowedChannels: channelAllowed,
      deniedTools: channelDeniedTools,
    }),
  };

  const hashSeed = {
    contractVersion: RUNTIME_CAPABILITY_MANIFEST_CONTRACT_VERSION,
    inputs,
    channelDecisions,
    toolDecisions,
    outcomeContracts,
    denyCatalog,
  };

  return {
    contractVersion: RUNTIME_CAPABILITY_MANIFEST_CONTRACT_VERSION,
    manifestHash: computeDeterministicHash(hashSeed),
    compiledAt: input.compiledAtMs ?? 0,
    inputs,
    channelDecisions,
    toolDecisions,
    outcomeContracts,
    denyCatalog,
  };
}
