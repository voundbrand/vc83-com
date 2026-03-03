import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { getAllToolDefinitions } from "./tools/registry";

export const AGENT_SPEC_CONTRACT_VERSION = "agent_spec_v1" as const;

type UnknownRecord = Record<string, unknown>;

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
    policyProfiles: {
      orgPolicyRef: string;
      channelPolicyRef: string;
      runtimePolicyRef: string;
    };
  };
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
  "audit_workflow_deliverable_pdf",
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
    ["key", "identity", "channels", "capabilities", "policyProfiles"],
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

  if (!Array.isArray(agent.capabilities)) {
    throw new Error("agent_spec_v1.agent.capabilities must be an array");
  }
  const capabilities = agent.capabilities
    .map((entry, index) =>
      normalizeCapability(entry, `agent_spec_v1.agent.capabilities[${index}]`))
    .sort((left, right) => left.key.localeCompare(right.key));

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

function buildScopeKey(organizationId?: string): string {
  return organizationId ? `org:${organizationId}` : "global";
}

export function validateAgentSpecReferences(spec: AgentSpecV1) {
  const knownTools = getKnownToolNames();
  const unknownTools = new Set<string>();
  const unknownOutcomes = new Set<string>();

  for (const capability of spec.agent.capabilities) {
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
