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
import { getExternalSendSkillToolNames } from "./skills";
import {
  AGENT_PACKAGE_CONTRACT_VERSION,
  AGENT_RUNTIME_TOPOLOGY_ADAPTER_VALUES,
  AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
  isAgentRuntimeTopologyProfile,
  resolveAgentRuntimeTopologyAdapter,
  type AgentPackageContract,
  type AgentRuntimeTopologyAdapter,
  type AgentRuntimeTopologyProfile,
} from "../schemas/aiSchemas";

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
export const HELENA_AGENT_RUNTIME_MODULE_KEY =
  "helena_backoffice_runtime_module_v1" as const;
export const KANZLEI_FAIL_CLOSED_ORG_POLICY_REF =
  "org_policy_kanzlei_fail_closed_v1" as const;
export const KANZLEI_COMPLIANCE_AUDIT_CONTRACT_VERSION =
  "kanzlei_compliance_audit_v1" as const;
export const KANZLEI_PROMPT_INPUT_MINIMIZATION_CONTRACT_VERSION =
  "kanzlei_prompt_input_minimization_v1" as const;
export const KANZLEI_COMPLIANCE_AUDIT_EVENT_TYPES = [
  "approval_decision",
  "action_blocked",
  "external_dispatch_attempt",
] as const;
export type KanzleiComplianceAuditEventType =
  (typeof KANZLEI_COMPLIANCE_AUDIT_EVENT_TYPES)[number];

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

export type AgentRuntimeTopologyDeclarationV1 = {
  contractVersion: typeof AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION;
  profile: AgentRuntimeTopologyProfile;
  adapter: AgentRuntimeTopologyAdapter;
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
    runtimeTopology: AgentRuntimeTopologyDeclarationV1;
    runtimeModule?: AgentRuntimeModuleMetadataV1;
    policyProfiles: {
      orgPolicyRef: string;
      channelPolicyRef: string;
      runtimePolicyRef: string;
    };
    packageContract: AgentPackageContract;
  };
};

const AGENT_SPEC_RUNTIME_MODULE_TOPOLOGY_PROFILE_BY_KEY: Record<
  string,
  AgentRuntimeTopologyProfile
> = {
  [SAMANTHA_AGENT_RUNTIME_MODULE_KEY]: "evaluator_loop",
  [HELENA_AGENT_RUNTIME_MODULE_KEY]: "pipeline_router",
  der_terminmacher_runtime_module_v1: "pipeline_router",
  david_ogilvy_runtime_module_v1: "single_agent_loop",
};

const KNOWN_RUNTIME_TOPOLOGY_ADAPTERS = new Set(
  AGENT_RUNTIME_TOPOLOGY_ADAPTER_VALUES as readonly string[],
);

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
  [HELENA_AGENT_RUNTIME_MODULE_KEY]: {
    contractVersion: AGENT_RUNTIME_MODULE_METADATA_CONTRACT_VERSION,
    key: HELENA_AGENT_RUNTIME_MODULE_KEY,
    prompt: {
      profileRef: "helena_backoffice_prompt_v1",
      templateRoles: [
        "helena_backoffice_worker_template",
      ],
    },
    hooks: {
      contractVersion: AGENT_RUNTIME_MODULE_HOOKS_CONTRACT_VERSION,
      enabled: ["preRoute", "preLLM", "preTool", "postTool", "completionPolicy"],
    },
    toolManifest: {
      contractVersion: AGENT_RUNTIME_MODULE_TOOL_MANIFEST_CONTRACT_VERSION,
      requiredTools: ["create_contact", "search_contacts", "update_contact"],
      optionalTools: ["manage_bookings", "escalate_to_human"],
      deniedTools: [],
    },
    capabilities: [
      {
        key: "booking_followup",
        outcomes: [
          {
            outcomeKey: "booking_created",
            requiredTools: ["manage_bookings"],
          },
        ],
      },
    ],
  },
};

const KNOWN_ORG_POLICY_PROFILES = new Set([
  "org_policy_default_v3",
  KANZLEI_FAIL_CLOSED_ORG_POLICY_REF,
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

function normalizeFraction(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
  if (value < 0 || value > 1) {
    throw new Error(`${path} must be between 0 and 1`);
  }
  return Number(value.toFixed(6));
}

function sanitizePackageFlagToken(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.length > 0 ? normalized : "agent";
}

function collectCapabilityRequiredTools(capabilities: AgentSpecCapabilityV1[]): string[] {
  const requiredTools = new Set<string>();
  for (const capability of capabilities) {
    for (const outcome of capability.outcomes) {
      for (const requiredTool of outcome.requiredTools) {
        requiredTools.add(requiredTool);
      }
    }
  }
  return Array.from(requiredTools).sort((left, right) => left.localeCompare(right));
}

function buildDefaultAgentPackageContract(args: {
  agentKey: string;
  capabilities: AgentSpecCapabilityV1[];
  runtimeModule?: AgentRuntimeModuleMetadataV1;
  policyProfiles: AgentSpecV1["agent"]["policyProfiles"];
}): AgentPackageContract {
  const primaryOutcome =
    args.capabilities
      .flatMap((capability) => capability.outcomes)
      .map((outcome) => outcome.outcomeKey)
      .sort((left, right) => left.localeCompare(right))[0]
    || "generic_outcome";
  const requiredTools = new Set(collectCapabilityRequiredTools(args.capabilities));
  for (const runtimeRequiredTool of args.runtimeModule?.toolManifest.requiredTools || []) {
    requiredTools.add(runtimeRequiredTool);
  }

  return {
    contractVersion: AGENT_PACKAGE_CONTRACT_VERSION,
    goal: {
      primaryOutcome,
      successMetric: "agent_success_rate",
    },
    tools: {
      required: Array.from(requiredTools).sort((left, right) => left.localeCompare(right)),
      optional: [...(args.runtimeModule?.toolManifest.optionalTools || [])],
      denied: [...(args.runtimeModule?.toolManifest.deniedTools || [])],
    },
    policy: {
      orgPolicyRef: args.policyProfiles.orgPolicyRef,
      channelPolicyRef: args.policyProfiles.channelPolicyRef,
      runtimePolicyRef: args.policyProfiles.runtimePolicyRef,
    },
    memory: {
      mode: "session_context",
      retentionPolicyRef: "memory_retention_default_v1",
    },
    eval: {
      suiteRef: `agent_eval_suite:${sanitizePackageFlagToken(args.agentKey)}:v1`,
      passThreshold: 0.85,
      holdThreshold: 0.7,
    },
    rollout: {
      stage: "internal",
      owner: "runtime_oncall",
      enableFlag: `agent_package_${sanitizePackageFlagToken(args.agentKey)}_enabled`,
    },
  };
}

function normalizeAgentPackageContract(args: {
  value: unknown;
  path: string;
  agentKey: string;
  capabilities: AgentSpecCapabilityV1[];
  runtimeModule?: AgentRuntimeModuleMetadataV1;
  policyProfiles: AgentSpecV1["agent"]["policyProfiles"];
}): AgentPackageContract {
  if (typeof args.value === "undefined") {
    return buildDefaultAgentPackageContract({
      agentKey: args.agentKey,
      capabilities: args.capabilities,
      runtimeModule: args.runtimeModule,
      policyProfiles: args.policyProfiles,
    });
  }

  const record = asRecord(args.value, args.path);
  assertNoUnknownKeys(
    record,
    ["contractVersion", "goal", "tools", "policy", "memory", "eval", "rollout"],
    args.path,
  );
  const contractVersion = normalizeNonEmptyString(
    record.contractVersion,
    `${args.path}.contractVersion`,
  );
  if (contractVersion !== AGENT_PACKAGE_CONTRACT_VERSION) {
    throw new Error(
      `${args.path}.contractVersion must be ${AGENT_PACKAGE_CONTRACT_VERSION}`,
    );
  }

  const goal = asRecord(record.goal, `${args.path}.goal`);
  assertNoUnknownKeys(goal, ["primaryOutcome", "successMetric"], `${args.path}.goal`);

  const tools = asRecord(record.tools, `${args.path}.tools`);
  assertNoUnknownKeys(
    tools,
    ["required", "optional", "denied"],
    `${args.path}.tools`,
  );
  const requiredTools = normalizeOptionalStringArray(
    tools.required,
    `${args.path}.tools.required`,
  );
  const optionalTools = normalizeOptionalStringArray(
    tools.optional,
    `${args.path}.tools.optional`,
  );
  const deniedTools = normalizeOptionalStringArray(
    tools.denied,
    `${args.path}.tools.denied`,
  );
  const requiredToolSet = new Set(requiredTools);
  const deniedToolConflict = deniedTools.find((toolName) =>
    requiredToolSet.has(toolName),
  );
  if (deniedToolConflict) {
    throw new Error(
      `${args.path}.tools.denied cannot include required tool ${deniedToolConflict}`,
    );
  }

  const policy = asRecord(record.policy, `${args.path}.policy`);
  assertNoUnknownKeys(
    policy,
    ["orgPolicyRef", "channelPolicyRef", "runtimePolicyRef"],
    `${args.path}.policy`,
  );
  const normalizedPolicy = {
    orgPolicyRef: normalizeNonEmptyString(
      policy.orgPolicyRef,
      `${args.path}.policy.orgPolicyRef`,
    ),
    channelPolicyRef: normalizeNonEmptyString(
      policy.channelPolicyRef,
      `${args.path}.policy.channelPolicyRef`,
    ),
    runtimePolicyRef: normalizeNonEmptyString(
      policy.runtimePolicyRef,
      `${args.path}.policy.runtimePolicyRef`,
    ),
  };
  if (
    normalizedPolicy.orgPolicyRef !== args.policyProfiles.orgPolicyRef
    || normalizedPolicy.channelPolicyRef !== args.policyProfiles.channelPolicyRef
    || normalizedPolicy.runtimePolicyRef !== args.policyProfiles.runtimePolicyRef
  ) {
    throw new Error(
      `${args.path}.policy refs must match agent_spec_v1.agent.policyProfiles`,
    );
  }

  const memory = asRecord(record.memory, `${args.path}.memory`);
  assertNoUnknownKeys(memory, ["mode", "retentionPolicyRef"], `${args.path}.memory`);
  const memoryMode = normalizeNonEmptyString(memory.mode, `${args.path}.memory.mode`);
  if (
    memoryMode !== "stateless"
    && memoryMode !== "session_context"
    && memoryMode !== "session_and_org_memory"
  ) {
    throw new Error(`${args.path}.memory.mode is unsupported: ${memoryMode}`);
  }

  const evalRecord = asRecord(record.eval, `${args.path}.eval`);
  assertNoUnknownKeys(
    evalRecord,
    ["suiteRef", "passThreshold", "holdThreshold"],
    `${args.path}.eval`,
  );
  const passThreshold = normalizeFraction(
    evalRecord.passThreshold,
    `${args.path}.eval.passThreshold`,
  );
  const holdThreshold = normalizeFraction(
    evalRecord.holdThreshold,
    `${args.path}.eval.holdThreshold`,
  );
  if (holdThreshold > passThreshold) {
    throw new Error(`${args.path}.eval.holdThreshold cannot exceed passThreshold`);
  }

  const rollout = asRecord(record.rollout, `${args.path}.rollout`);
  assertNoUnknownKeys(
    rollout,
    ["stage", "owner", "enableFlag"],
    `${args.path}.rollout`,
  );
  const rolloutStage = normalizeNonEmptyString(
    rollout.stage,
    `${args.path}.rollout.stage`,
  );
  if (
    rolloutStage !== "disabled"
    && rolloutStage !== "internal"
    && rolloutStage !== "canary"
    && rolloutStage !== "production"
  ) {
    throw new Error(`${args.path}.rollout.stage is unsupported: ${rolloutStage}`);
  }

  return {
    contractVersion: AGENT_PACKAGE_CONTRACT_VERSION,
    goal: {
      primaryOutcome: normalizeNonEmptyString(
        goal.primaryOutcome,
        `${args.path}.goal.primaryOutcome`,
      ),
      successMetric: normalizeNonEmptyString(
        goal.successMetric,
        `${args.path}.goal.successMetric`,
      ),
    },
    tools: {
      required: requiredTools,
      optional: optionalTools,
      denied: deniedTools,
    },
    policy: normalizedPolicy,
    memory: {
      mode: memoryMode,
      retentionPolicyRef: normalizeNonEmptyString(
        memory.retentionPolicyRef,
        `${args.path}.memory.retentionPolicyRef`,
      ),
    },
    eval: {
      suiteRef: normalizeNonEmptyString(
        evalRecord.suiteRef,
        `${args.path}.eval.suiteRef`,
      ),
      passThreshold,
      holdThreshold,
    },
    rollout: {
      stage: rolloutStage,
      owner: normalizeNonEmptyString(rollout.owner, `${args.path}.rollout.owner`),
      enableFlag: normalizeNonEmptyString(
        rollout.enableFlag,
        `${args.path}.rollout.enableFlag`,
      ),
    },
  };
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

function normalizeDeterministicToolNames(values?: string[]): string[] {
  if (!values) {
    return [];
  }
  return Array.from(
    new Set(
      values
        .map((entry) => normalizeLooseString(entry))
        .filter((entry): entry is string => Boolean(entry)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

const KANZLEI_FAIL_CLOSED_MODE_TOKENS = new Set([
  "kanzlei",
  "law_firm",
  "lawfirm",
  "kanzlei_fail_closed",
  "law_firm_fail_closed",
  KANZLEI_FAIL_CLOSED_ORG_POLICY_REF,
]);

const KANZLEI_EXTERNAL_DISPATCH_TOOL_NAMES = new Set(
  [
    ...getExternalSendSkillToolNames(),
    AUDIT_DELIVERABLE_TOOL_NAME,
    AUDIT_DELIVERABLE_EMAIL_REQUEST_TOOL_NAME,
    "send_email_from_template",
  ]
    .map((entry) => normalizeLooseString(entry)?.toLowerCase())
    .filter((entry): entry is string => Boolean(entry)),
);

const KANZLEI_PROMPT_INPUT_ALLOWED_FIELD_TOKENS = [
  "appointment_window",
  "callback_requested",
  "callback_window",
  "case_reference",
  "channel",
  "conflict_check_required",
  "contact_id",
  "contact_reference",
  "existing_client",
  "existing_mandate",
  "intake_summary",
  "language",
  "matter_type",
  "preferred_language",
  "scheduling_intent",
  "team_hint",
  "topic",
  "urgency",
  "urgency_level",
] as const;

const KANZLEI_PROMPT_INPUT_DENIED_FIELD_TOKENS = [
  "address",
  "attachments",
  "bic",
  "city",
  "date_of_birth",
  "document_text",
  "dob",
  "email",
  "first_name",
  "full_name",
  "iban",
  "last_name",
  "mandant_name",
  "passport_number",
  "phone",
  "postal_code",
  "raw_notes",
  "raw_transcript",
  "social_security_number",
  "ssn",
  "street",
  "tax_id",
] as const;

export type KanzleiPromptInputMinimizationContract = {
  contractVersion: typeof KANZLEI_PROMPT_INPUT_MINIMIZATION_CONTRACT_VERSION;
  mode: "need_to_know";
  requiresExplicitFieldMapping: true;
  onDeniedField: "drop_and_audit";
  allowedFieldTokens: string[];
  deniedFieldTokens: string[];
};

export type KanzleiPromptInputMinimizationResult = {
  minimizedPayload: Record<string, unknown>;
  retainedFields: string[];
  droppedFields: string[];
  droppedDeniedFields: string[];
};

export function isKanzleiFailClosedModeToken(value: unknown): boolean {
  const normalized = normalizeLooseString(value)?.toLowerCase();
  if (!normalized) {
    return false;
  }
  if (KANZLEI_FAIL_CLOSED_MODE_TOKENS.has(normalized)) {
    return true;
  }
  return normalized.includes("kanzlei")
    || normalized.includes("law_firm")
    || normalized.includes("lawfirm");
}

export function isKanzleiExternalDispatchToolName(value: unknown): boolean {
  const normalized = normalizeLooseString(value)?.toLowerCase();
  return normalized
    ? KANZLEI_EXTERNAL_DISPATCH_TOOL_NAMES.has(normalized)
    : false;
}

export function resolveFailClosedApprovalToolNames(args?: {
  toolNames?: string[];
}): string[] {
  const definitions = getAllToolDefinitions();
  const readOnlyByToolName = new Map(
    definitions.map((definition) => [
      definition.name.trim(),
      definition.readOnly === true,
    ]),
  );
  const candidateToolNames = normalizeDeterministicToolNames(args?.toolNames);
  const resolvedCandidates =
    candidateToolNames.length > 0
      ? candidateToolNames
      : Array.from(readOnlyByToolName.keys()).sort((left, right) =>
          left.localeCompare(right),
        );
  const approvalRequired = new Set<string>();
  for (const toolName of resolvedCandidates) {
    if (readOnlyByToolName.get(toolName) !== true) {
      approvalRequired.add(toolName);
    }
  }
  return Array.from(approvalRequired).sort((left, right) =>
    left.localeCompare(right),
  );
}

function normalizePromptInputFieldToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized.length > 0 ? normalized : null;
}

function normalizePromptInputFieldTokenArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const deduped = new Set<string>();
  for (const entry of value) {
    const token = normalizePromptInputFieldToken(entry);
    if (token) {
      deduped.add(token);
    }
  }
  return Array.from(deduped).sort((left, right) => left.localeCompare(right));
}

function readPromptInputMinimizationConfigRecord(
  customProperties?: Record<string, unknown>,
): Record<string, unknown> {
  const rawConfig = customProperties?.promptInputMinimization;
  if (!rawConfig || typeof rawConfig !== "object" || Array.isArray(rawConfig)) {
    return {};
  }
  return rawConfig as Record<string, unknown>;
}

function resolveKanzleiPolicyTokens(args?: {
  modeTokens?: string[];
  customProperties?: Record<string, unknown>;
}): string[] {
  const deduped = new Set(
    normalizeLooseStringArray(args?.modeTokens).map((token) => token.toLowerCase()),
  );
  const customProperties = args?.customProperties;
  if (!customProperties) {
    return Array.from(deduped).sort((left, right) => left.localeCompare(right));
  }
  const directPolicyTokens = [
    customProperties.orgPolicyRef,
    customProperties.policyMode,
    customProperties.complianceMode,
    customProperties.templateRole,
    customProperties.templatePlaybook,
    customProperties.templateLayer,
  ];
  for (const token of directPolicyTokens) {
    const normalized = normalizeLooseString(token)?.toLowerCase();
    if (normalized) {
      deduped.add(normalized);
    }
  }
  for (const token of [
    ...normalizeLooseStringArray(customProperties.knowledgeBaseTags),
    ...normalizeLooseStringArray(customProperties.policyTags),
    ...normalizeLooseStringArray(customProperties.complianceTags),
  ]) {
    deduped.add(token.toLowerCase());
  }
  return Array.from(deduped).sort((left, right) => left.localeCompare(right));
}

export function resolveKanzleiPromptInputMinimizationContract(args?: {
  modeTokens?: string[];
  customProperties?: Record<string, unknown>;
}): KanzleiPromptInputMinimizationContract | null {
  const policyTokens = resolveKanzleiPolicyTokens(args);
  if (!policyTokens.some((token) => isKanzleiFailClosedModeToken(token))) {
    return null;
  }
  const configRecord = readPromptInputMinimizationConfigRecord(args?.customProperties);
  if (configRecord.enabled === false) {
    return null;
  }
  const allowedFieldTokens = normalizePromptInputFieldTokenArray(
    configRecord.allowedFields,
  );
  const deniedFieldTokens = normalizePromptInputFieldTokenArray(
    configRecord.deniedFields,
  );
  return {
    contractVersion: KANZLEI_PROMPT_INPUT_MINIMIZATION_CONTRACT_VERSION,
    mode: "need_to_know",
    requiresExplicitFieldMapping: true,
    onDeniedField: "drop_and_audit",
    allowedFieldTokens:
      allowedFieldTokens.length > 0
        ? allowedFieldTokens
        : [...KANZLEI_PROMPT_INPUT_ALLOWED_FIELD_TOKENS],
    deniedFieldTokens:
      deniedFieldTokens.length > 0
        ? deniedFieldTokens
        : [...KANZLEI_PROMPT_INPUT_DENIED_FIELD_TOKENS],
  };
}

export function applyKanzleiPromptInputMinimization(
  payload: unknown,
  contract: KanzleiPromptInputMinimizationContract,
): KanzleiPromptInputMinimizationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      minimizedPayload: {},
      retainedFields: [],
      droppedFields: [],
      droppedDeniedFields: [],
    };
  }
  const record = payload as Record<string, unknown>;
  const minimizedPayload: Record<string, unknown> = {};
  const retainedFields: string[] = [];
  const droppedFields: string[] = [];
  const droppedDeniedFields: string[] = [];
  const allowed = new Set(contract.allowedFieldTokens);
  const denied = new Set(contract.deniedFieldTokens);

  for (const field of Object.keys(record).sort((left, right) => left.localeCompare(right))) {
    const normalizedField = normalizePromptInputFieldToken(field);
    const deniedField = Boolean(normalizedField && denied.has(normalizedField));
    const allowedField = Boolean(normalizedField && allowed.has(normalizedField));

    if (!allowedField || deniedField) {
      droppedFields.push(field);
      if (deniedField) {
        droppedDeniedFields.push(field);
      }
      continue;
    }
    minimizedPayload[field] = record[field];
    retainedFields.push(field);
  }

  return {
    minimizedPayload,
    retainedFields,
    droppedFields,
    droppedDeniedFields,
  };
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

function normalizeAgentRuntimeTopologyDeclaration(
  value: unknown,
  path: string,
): AgentRuntimeTopologyDeclarationV1 {
  const record = asRecord(value, path);
  assertNoUnknownKeys(record, ["contractVersion", "profile", "adapter"], path);

  const contractVersion = normalizeNonEmptyString(
    record.contractVersion,
    `${path}.contractVersion`,
  );
  if (contractVersion !== AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION) {
    throw new Error(
      `${path}.contractVersion must be ${AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION}`,
    );
  }

  const profileToken = normalizeNonEmptyString(record.profile, `${path}.profile`);
  if (!isAgentRuntimeTopologyProfile(profileToken)) {
    throw new Error(
      `${path}.profile contains unsupported topology profile: ${profileToken}`,
    );
  }

  const adapterToken = normalizeNonEmptyString(record.adapter, `${path}.adapter`);
  if (!KNOWN_RUNTIME_TOPOLOGY_ADAPTERS.has(adapterToken)) {
    throw new Error(
      `${path}.adapter contains unsupported topology adapter: ${adapterToken}`,
    );
  }

  const expectedAdapter = resolveAgentRuntimeTopologyAdapter(profileToken);
  if (adapterToken !== expectedAdapter) {
    throw new Error(
      `${path}.adapter ${adapterToken} is incompatible with profile ${profileToken}`,
    );
  }

  return {
    contractVersion: AGENT_RUNTIME_TOPOLOGY_CONTRACT_VERSION,
    profile: profileToken,
    adapter: expectedAdapter,
  };
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
    [
      "key",
      "identity",
      "channels",
      "capabilities",
      "runtimeTopology",
      "runtimeModule",
      "policyProfiles",
      "packageContract",
    ],
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
  const runtimeTopology = normalizeAgentRuntimeTopologyDeclaration(
    agent.runtimeTopology,
    "agent_spec_v1.agent.runtimeTopology",
  );
  const runtimeModule = typeof agent.runtimeModule === "undefined"
    ? undefined
    : normalizeAgentRuntimeModuleMetadata(
        agent.runtimeModule,
        "agent_spec_v1.agent.runtimeModule",
      );
  const expectedRuntimeModuleTopologyProfile = runtimeModule
    ? AGENT_SPEC_RUNTIME_MODULE_TOPOLOGY_PROFILE_BY_KEY[runtimeModule.key]
    : null;
  if (
    expectedRuntimeModuleTopologyProfile
    && expectedRuntimeModuleTopologyProfile !== runtimeTopology.profile
  ) {
    throw new Error(
      "agent_spec_v1.agent.runtimeTopology.profile does not match runtimeModule topology contract",
    );
  }

  const policyProfiles = asRecord(
    agent.policyProfiles,
    "agent_spec_v1.agent.policyProfiles",
  );
  assertNoUnknownKeys(
    policyProfiles,
    ["orgPolicyRef", "channelPolicyRef", "runtimePolicyRef"],
    "agent_spec_v1.agent.policyProfiles",
  );
  const agentKey = normalizeNonEmptyString(agent.key, "agent_spec_v1.agent.key");
  const normalizedPolicyProfiles = {
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
  };
  const packageContract = normalizeAgentPackageContract({
    value: agent.packageContract,
    path: "agent_spec_v1.agent.packageContract",
    agentKey,
    capabilities,
    runtimeModule,
    policyProfiles: normalizedPolicyProfiles,
  });

  const normalized: AgentSpecV1 = {
    contractVersion: AGENT_SPEC_CONTRACT_VERSION,
    agent: {
      key: agentKey,
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
      runtimeTopology,
      ...(runtimeModule ? { runtimeModule } : {}),
      policyProfiles: normalizedPolicyProfiles,
      packageContract,
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
  const { orgPolicyRef, channelPolicyRef, runtimePolicyRef } = spec.agent.policyProfiles;
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
  for (const packageToolRef of [
    ...spec.agent.packageContract.tools.required,
    ...spec.agent.packageContract.tools.optional,
    ...spec.agent.packageContract.tools.denied,
  ]) {
    if (!knownTools.has(packageToolRef)) {
      unknownTools.add(packageToolRef);
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

  const packagePolicyRefs = spec.agent.packageContract.policy;
  if (
    packagePolicyRefs.orgPolicyRef !== orgPolicyRef
    || packagePolicyRefs.channelPolicyRef !== channelPolicyRef
    || packagePolicyRefs.runtimePolicyRef !== runtimePolicyRef
  ) {
    throw new Error(
      "agent_spec_v1 package policy refs must match policyProfiles",
    );
  }
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
      runtimeTopologyContractVersion: normalizedSpec.agent.runtimeTopology.contractVersion,
      runtimeTopologyProfile: normalizedSpec.agent.runtimeTopology.profile,
      runtimeTopologyAdapter: normalizedSpec.agent.runtimeTopology.adapter,
      packageContractVersion: normalizedSpec.agent.packageContract.contractVersion,
      packageRolloutStage: normalizedSpec.agent.packageContract.rollout.stage,
      packageEvalSuiteRef: normalizedSpec.agent.packageContract.eval.suiteRef,
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
