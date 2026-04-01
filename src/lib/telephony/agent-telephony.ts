import { ANNE_BECKER_AGENT_TEMPLATE } from "../../../convex/ai/agents/elevenlabs/client_owned/anne_becker/template";
import { KANZLEI_MVP_AGENT_TEMPLATE } from "../../../convex/ai/agents/elevenlabs/templates/kanzlei_mvp/template";
import {
  CLARA_AGENT_TEMPLATE,
  JONAS_AGENT_TEMPLATE,
  MAREN_AGENT_TEMPLATE,
} from "../../../convex/ai/agents/elevenlabs/templates/core_wedge_templates";

export const TELEPHONY_PROVIDER_OPTIONS = [
  {
    key: "elevenlabs",
    label: "ElevenLabs",
    description: "Implemented now",
    implemented: true,
  },
  {
    key: "twilio_voice",
    label: "Twilio Voice",
    description: "Implemented beta",
    implemented: true,
  },
  {
    key: "custom_sip",
    label: "Custom SIP",
    description: "Coming soon",
    implemented: false,
  },
] as const;

export type AgentTelephonyProviderKey =
  (typeof TELEPHONY_PROVIDER_OPTIONS)[number]["key"];

export type AgentTelephonySyncStatus =
  | "idle"
  | "success"
  | "error";

export type AgentTelephonyTransferType = "conference" | "blind";

export interface AgentTelephonySyncState {
  status: AgentTelephonySyncStatus;
  lastSyncedAt?: number;
  lastSyncError?: string;
  lastSyncedProviderAgentId?: string;
  drift?: Array<
    "system_prompt" | "first_message" | "knowledge_base" | "managed_tools" | "workflow"
  >;
}

export interface AgentTelephonyTransferDestination {
  label: string;
  phoneNumber: string;
  condition: string;
  enabled: boolean;
  transferType?: AgentTelephonyTransferType;
}

export interface AgentElevenLabsTelephonyConfig {
  remoteAgentId?: string;
  systemPrompt: string;
  firstMessage: string;
  knowledgeBase: string;
  knowledgeBaseName: string;
  transferDestinations: AgentTelephonyTransferDestination[];
  managedTools: Record<string, unknown>;
  workflow?: unknown;
  syncState: AgentTelephonySyncState;
}

export interface AgentTelephonyConfig {
  selectedProvider: AgentTelephonyProviderKey;
  elevenlabs: AgentElevenLabsTelephonyConfig;
}

type JsonRecord = Record<string, unknown>;
type AgentTelephonyDriftKey = NonNullable<AgentTelephonySyncState["drift"]>[number];

const DEFAULT_SYNC_STATE: AgentTelephonySyncState = {
  status: "idle",
};

const ANNE_BECKER_SYSTEM_PROMPT = ANNE_BECKER_AGENT_TEMPLATE.systemPrompt;
const ANNE_BECKER_FIRST_MESSAGE = ANNE_BECKER_AGENT_TEMPLATE.firstMessage;
const ANNE_BECKER_KNOWLEDGE_BASE = ANNE_BECKER_AGENT_TEMPLATE.knowledgeBase;
const ANNE_BECKER_KNOWLEDGE_BASE_NAME = ANNE_BECKER_AGENT_TEMPLATE.knowledgeBaseName;
const ANNE_BECKER_MANAGED_TOOLS = ANNE_BECKER_AGENT_TEMPLATE.managedTools;
const KANZLEI_MVP_SYSTEM_PROMPT = KANZLEI_MVP_AGENT_TEMPLATE.systemPrompt;
const KANZLEI_MVP_FIRST_MESSAGE = KANZLEI_MVP_AGENT_TEMPLATE.firstMessage;
const KANZLEI_MVP_KNOWLEDGE_BASE = KANZLEI_MVP_AGENT_TEMPLATE.knowledgeBase;
const KANZLEI_MVP_KNOWLEDGE_BASE_NAME = KANZLEI_MVP_AGENT_TEMPLATE.knowledgeBaseName;
const KANZLEI_MVP_MANAGED_TOOLS = KANZLEI_MVP_AGENT_TEMPLATE.managedTools;
const CLARA_SYSTEM_PROMPT = CLARA_AGENT_TEMPLATE.systemPrompt;
const CLARA_FIRST_MESSAGE = CLARA_AGENT_TEMPLATE.firstMessage;
const CLARA_KNOWLEDGE_BASE = CLARA_AGENT_TEMPLATE.knowledgeBase;
const CLARA_KNOWLEDGE_BASE_NAME = CLARA_AGENT_TEMPLATE.knowledgeBaseName;
const JONAS_SYSTEM_PROMPT = JONAS_AGENT_TEMPLATE.systemPrompt;
const JONAS_KNOWLEDGE_BASE = JONAS_AGENT_TEMPLATE.knowledgeBase;
const JONAS_KNOWLEDGE_BASE_NAME = JONAS_AGENT_TEMPLATE.knowledgeBaseName;
const MAREN_SYSTEM_PROMPT = MAREN_AGENT_TEMPLATE.systemPrompt;
const MAREN_KNOWLEDGE_BASE = MAREN_AGENT_TEMPLATE.knowledgeBase;
const MAREN_KNOWLEDGE_BASE_NAME = MAREN_AGENT_TEMPLATE.knowledgeBaseName;

const DEFAULT_ELEVENLABS_CONFIG: AgentElevenLabsTelephonyConfig = {
  systemPrompt: "",
  firstMessage: "",
  knowledgeBase: "",
  knowledgeBaseName: "Telephony Knowledge Base",
  transferDestinations: [],
  managedTools: {},
  syncState: { ...DEFAULT_SYNC_STATE },
};

const DEFAULT_TELEPHONY_CONFIG: AgentTelephonyConfig = {
  selectedProvider: "elevenlabs",
  elevenlabs: DEFAULT_ELEVENLABS_CONFIG,
};

export const ANNE_BECKER_TEMPLATE_ROLE = "customer_telephony_anne_becker_template";
export const ANNE_BECKER_TEMPLATE_PLAYBOOK = "customer_telephony_intake";
export const KANZLEI_MVP_TEMPLATE_ROLE = "customer_telephony_kanzlei_mvp_template";
export const KANZLEI_MVP_TEMPLATE_PLAYBOOK = "customer_telephony_kanzlei_mvp";
export const CLARA_TEMPLATE_ROLE = "customer_telephony_clara_template";
export const CLARA_TEMPLATE_PLAYBOOK = "customer_telephony_reception";
export const JONAS_TEMPLATE_ROLE = "customer_telephony_jonas_template";
export const JONAS_TEMPLATE_PLAYBOOK = "customer_telephony_qualification";
export const MAREN_TEMPLATE_ROLE = "customer_telephony_maren_template";
export const MAREN_TEMPLATE_PLAYBOOK = "customer_telephony_booking";
export const DEFAULT_TELEPHONY_INSTALLATION_ID = "phone_call_default";
export const DEFAULT_TELEPHONY_PROFILE_ID = "customer_telephony";
export const ELEVEN_TELEPHONY_ROUTE_PREFIX = "eleven:phone";
export const TWILIO_VOICE_ROUTE_PREFIX = "twilio:phone";
const TEMPLATE_ROLE_AGENT_ID_PREFIX = "template_role:";
const DEFAULT_HUMAN_TRANSFER_NUMBER = "+4915140427103";

type AgentTransferAssignmentSeed = {
  templateRole: string;
  condition: string;
  transferMessage: string;
  enableTransferredAgentFirstMessage?: boolean;
  isWorkflowNodeTransfer?: boolean;
  delayMs?: number;
};

function buildEndCallTool(): Record<string, unknown> {
  return {
    type: "system",
    name: "end_call",
    description: "",
    params: {
      system_tool_type: "end_call",
      transfers: [],
    },
    disable_interruptions: false,
    tool_error_handling_mode: "auto",
  };
}

function buildTransferToNumberTool(condition: string): Record<string, unknown> {
  return {
    type: "system",
    name: "transfer_to_number",
    description: "",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    params: {
      system_tool_type: "transfer_to_number",
      transfers: [
        {
          custom_sip_headers: [],
          transfer_destination: {
            type: "phone",
            phone_number: DEFAULT_HUMAN_TRANSFER_NUMBER,
          },
          phone_number: DEFAULT_HUMAN_TRANSFER_NUMBER,
          condition,
          transfer_type: "conference",
          post_dial_digits: null,
        },
      ],
      enable_client_message: true,
    },
    dynamic_variables: {
      dynamic_variable_placeholders: {},
    },
  };
}

export function buildTemplateRoleTransferAgentId(templateRole: string): string {
  return `${TEMPLATE_ROLE_AGENT_ID_PREFIX}${templateRole}`;
}

function extractTemplateRoleTransferAgentId(agentId: unknown): string | null {
  const normalized = normalizeOptionalString(agentId);
  if (!normalized || !normalized.startsWith(TEMPLATE_ROLE_AGENT_ID_PREFIX)) {
    return null;
  }
  const templateRole = normalized.slice(TEMPLATE_ROLE_AGENT_ID_PREFIX.length).trim();
  return templateRole.length > 0 ? templateRole : null;
}

function buildTransferToAgentTool(
  assignments: AgentTransferAssignmentSeed[],
): Record<string, unknown> {
  return {
    type: "system",
    name: "transfer_to_agent",
    description: "",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    params: {
      system_tool_type: "transfer_to_agent",
      transfers: assignments.map((assignment) => ({
        agent_id: buildTemplateRoleTransferAgentId(assignment.templateRole),
        condition: assignment.condition,
        delay_ms: assignment.delayMs ?? 0,
        transfer_message: assignment.transferMessage,
        enable_transferred_agent_first_message:
          assignment.enableTransferredAgentFirstMessage !== false,
        ...(assignment.isWorkflowNodeTransfer === true
          ? { is_workflow_node_transfer: true }
          : {}),
      })),
    },
    dynamic_variables: {
      dynamic_variable_placeholders: {},
    },
  };
}

export function createAnneBeckerTelephonyConfigSeed(): AgentTelephonyConfig {
  return normalizeAgentTelephonyConfig({
    selectedProvider: "elevenlabs",
    elevenlabs: {
      systemPrompt: ANNE_BECKER_SYSTEM_PROMPT,
      firstMessage: ANNE_BECKER_FIRST_MESSAGE,
      knowledgeBase: ANNE_BECKER_KNOWLEDGE_BASE,
      knowledgeBaseName: ANNE_BECKER_KNOWLEDGE_BASE_NAME,
      managedTools: {
        ...ANNE_BECKER_MANAGED_TOOLS,
      },
      syncState: { ...DEFAULT_SYNC_STATE },
    },
  });
}

export function createKanzleiMvpTelephonyConfigSeed(): AgentTelephonyConfig {
  return normalizeAgentTelephonyConfig({
    selectedProvider: "elevenlabs",
    elevenlabs: {
      systemPrompt: KANZLEI_MVP_SYSTEM_PROMPT,
      firstMessage: KANZLEI_MVP_FIRST_MESSAGE,
      knowledgeBase: KANZLEI_MVP_KNOWLEDGE_BASE,
      knowledgeBaseName: KANZLEI_MVP_KNOWLEDGE_BASE_NAME,
      managedTools: {
        ...KANZLEI_MVP_MANAGED_TOOLS,
      },
      syncState: { ...DEFAULT_SYNC_STATE },
    },
  });
}

export function createClaraTelephonyConfigSeed(): AgentTelephonyConfig {
  return normalizeAgentTelephonyConfig({
    selectedProvider: "elevenlabs",
    elevenlabs: {
      systemPrompt: CLARA_SYSTEM_PROMPT,
      firstMessage: CLARA_FIRST_MESSAGE,
      knowledgeBase: CLARA_KNOWLEDGE_BASE,
      knowledgeBaseName: CLARA_KNOWLEDGE_BASE_NAME,
      managedTools: {
        end_call: buildEndCallTool(),
        transfer_to_agent: buildTransferToAgentTool([
          {
            templateRole: JONAS_TEMPLATE_ROLE,
            condition:
              "Transfer to Jonas immediately when the caller asks for qualification, intake triage, urgency assessment, route recommendation, or explicitly asks for Jonas.",
            transferMessage: "Gern. Ich verbinde Sie jetzt mit Jonas aus der Qualifizierung.",
            enableTransferredAgentFirstMessage: true,
          },
          {
            templateRole: MAREN_TEMPLATE_ROLE,
            condition:
              "Transfer to Maren immediately when the caller asks for booking, Terminvergabe, rescheduling, cancellations, waitlists, or explicitly asks for Maren.",
            transferMessage: "Gern. Ich verbinde Sie jetzt mit Maren aus der Terminkoordination.",
            enableTransferredAgentFirstMessage: true,
          },
        ]),
        transfer_to_number: buildTransferToNumberTool(
          "Transfer to a human when the caller explicitly asks for a real person, the founder, or a team member instead of the AI.",
        ),
      },
      syncState: { ...DEFAULT_SYNC_STATE },
    },
  });
}

export function createJonasTelephonyConfigSeed(): AgentTelephonyConfig {
  return normalizeAgentTelephonyConfig({
    selectedProvider: "elevenlabs",
    elevenlabs: {
      systemPrompt: JONAS_SYSTEM_PROMPT,
      firstMessage: "",
      knowledgeBase: JONAS_KNOWLEDGE_BASE,
      knowledgeBaseName: JONAS_KNOWLEDGE_BASE_NAME,
      managedTools: {
        end_call: buildEndCallTool(),
        transfer_to_agent: buildTransferToAgentTool([
          {
            templateRole: CLARA_TEMPLATE_ROLE,
            condition:
              "Transfer back to Clara when the caller leaves the qualification lane, asks for another demo, asks for booking, or explicitly asks for Clara.",
            transferMessage: "Gern. Ich verbinde Sie jetzt wieder mit Clara.",
            enableTransferredAgentFirstMessage: false,
          },
        ]),
        transfer_to_number: buildTransferToNumberTool(
          "Transfer to a human when the caller explicitly asks for a real person, the founder, or a team member instead of the AI.",
        ),
      },
      syncState: { ...DEFAULT_SYNC_STATE },
    },
  });
}

export function createMarenTelephonyConfigSeed(): AgentTelephonyConfig {
  return normalizeAgentTelephonyConfig({
    selectedProvider: "elevenlabs",
    elevenlabs: {
      systemPrompt: MAREN_SYSTEM_PROMPT,
      firstMessage: "",
      knowledgeBase: MAREN_KNOWLEDGE_BASE,
      knowledgeBaseName: MAREN_KNOWLEDGE_BASE_NAME,
      managedTools: {
        end_call: buildEndCallTool(),
        transfer_to_agent: buildTransferToAgentTool([
          {
            templateRole: CLARA_TEMPLATE_ROLE,
            condition:
              "Transfer back to Clara when the caller leaves the scheduling lane, asks for another demo, asks for qualification, or explicitly asks for Clara.",
            transferMessage: "Gern. Ich verbinde Sie jetzt wieder mit Clara.",
            enableTransferredAgentFirstMessage: false,
          },
        ]),
        transfer_to_number: buildTransferToNumberTool(
          "Transfer to a human when the caller explicitly asks for a real person, the founder, or a team member instead of the AI.",
        ),
      },
      syncState: { ...DEFAULT_SYNC_STATE },
    },
  });
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneRecord<T extends JsonRecord>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function extractTemplateRoleTransferDependencies(
  managedTools: Record<string, unknown>,
): string[] {
  const transferTool = managedTools.transfer_to_agent;
  if (!isRecord(transferTool)) {
    return [];
  }
  const params = isRecord(transferTool.params)
    ? (transferTool.params as JsonRecord)
    : {};
  const transfers = Array.isArray(params.transfers) ? params.transfers : [];
  const dependencies = new Set<string>();

  for (const transfer of transfers) {
    const templateRole = isRecord(transfer)
      ? extractTemplateRoleTransferAgentId(transfer.agent_id)
      : null;
    if (templateRole) {
      dependencies.add(templateRole);
    }
  }

  return Array.from(dependencies).sort((left, right) => left.localeCompare(right));
}

export function resolveTemplateRoleTransferManagedTools(args: {
  managedTools: Record<string, unknown>;
  remoteAgentIdsByTemplateRole: Record<string, string | undefined>;
}): Record<string, unknown> {
  const nextManagedTools = cloneRecord(args.managedTools as JsonRecord);
  const transferTool = nextManagedTools.transfer_to_agent;
  if (!isRecord(transferTool)) {
    return nextManagedTools;
  }

  const nextTransferTool = cloneRecord(transferTool as JsonRecord);
  const nextParams = isRecord(nextTransferTool.params)
    ? cloneRecord(nextTransferTool.params as JsonRecord)
    : {};
  const transfers = Array.isArray(nextParams.transfers) ? nextParams.transfers : [];
  const resolvedTransfers = transfers.flatMap((transfer) => {
    if (!isRecord(transfer)) {
      return [];
    }
    const templateRole = extractTemplateRoleTransferAgentId(transfer.agent_id);
    if (!templateRole) {
      return [cloneRecord(transfer)];
    }
    const remoteAgentId = normalizeOptionalString(
      args.remoteAgentIdsByTemplateRole[templateRole],
    );
    if (!remoteAgentId) {
      return [];
    }
    return [{ ...cloneRecord(transfer), agent_id: remoteAgentId }];
  });

  if (resolvedTransfers.length === 0) {
    delete nextManagedTools.transfer_to_agent;
    return nextManagedTools;
  }

  nextParams.transfers = resolvedTransfers;
  nextTransferTool.params = nextParams;
  nextManagedTools.transfer_to_agent = nextTransferTool;
  return nextManagedTools;
}

function normalizeSyncState(value: unknown): AgentTelephonySyncState {
  const seed = { ...DEFAULT_SYNC_STATE };
  if (!isRecord(value)) {
    return seed;
  }

  const drift = Array.isArray(value.drift)
    ? value.drift.filter(
        (entry): entry is AgentTelephonyDriftKey =>
          entry === "system_prompt"
          || entry === "first_message"
          || entry === "knowledge_base"
          || entry === "managed_tools"
          || entry === "workflow",
      )
    : undefined;

  return {
    status:
      value.status === "success" || value.status === "error" || value.status === "idle"
        ? value.status
        : "idle",
    lastSyncedAt:
      typeof value.lastSyncedAt === "number" && Number.isFinite(value.lastSyncedAt)
        ? value.lastSyncedAt
        : undefined,
    lastSyncError: normalizeOptionalString(value.lastSyncError),
    lastSyncedProviderAgentId: normalizeOptionalString(value.lastSyncedProviderAgentId),
    ...(drift && drift.length > 0 ? { drift } : {}),
  };
}

function normalizeManagedTools(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      ([toolName, toolConfig]) => normalizeOptionalString(toolName) && toolConfig !== undefined,
    ),
  );
}

function normalizeTransferType(value: unknown): AgentTelephonyTransferType | undefined {
  return value === "blind" || value === "conference"
    ? value
    : undefined;
}

function buildFallbackTransferCondition(label: string): string {
  return `When the caller explicitly asks for ${label}.`;
}

function normalizeTransferDestination(
  value: unknown,
): AgentTelephonyTransferDestination | null {
  if (!isRecord(value)) {
    return null;
  }

  const transferDestination = isRecord(value.transfer_destination)
    ? (value.transfer_destination as JsonRecord)
    : {};
  const phoneNumber =
    normalizeOptionalString(value.phoneNumber)
    || normalizeOptionalString(value.phone_number)
    || normalizeOptionalString(transferDestination.phone_number);
  if (!phoneNumber) {
    return null;
  }

  const label =
    normalizeOptionalString(value.label)
    || normalizeOptionalString(value.name)
    || phoneNumber;
  const condition =
    normalizeOptionalString(value.condition)
    || buildFallbackTransferCondition(label);

  return {
    label,
    phoneNumber,
    condition,
    enabled: value.enabled !== false,
    transferType:
      normalizeTransferType(value.transferType)
      || normalizeTransferType(value.transfer_type),
  };
}

function normalizeTransferDestinations(
  value: unknown,
): AgentTelephonyTransferDestination[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = new Map<string, AgentTelephonyTransferDestination>();
  for (const entry of value) {
    const normalized = normalizeTransferDestination(entry);
    if (!normalized) {
      continue;
    }
    const key = `${normalized.label.toLowerCase()}|${normalized.phoneNumber}|${normalized.condition.toLowerCase()}`;
    deduped.set(key, normalized);
  }

  return Array.from(deduped.values()).sort((left, right) => {
    const labelSort = left.label.localeCompare(right.label);
    if (labelSort !== 0) {
      return labelSort;
    }
    const numberSort = left.phoneNumber.localeCompare(right.phoneNumber);
    if (numberSort !== 0) {
      return numberSort;
    }
    return left.condition.localeCompare(right.condition);
  });
}

function buildTransferRule(
  destination: AgentTelephonyTransferDestination,
): Record<string, unknown> {
  return {
    transfer_destination: {
      type: "phone",
      phone_number: destination.phoneNumber,
    },
    condition: destination.condition,
    transfer_type: destination.transferType || "conference",
  };
}

function buildDefaultTransferToolConfig(): JsonRecord {
  const anneTransferTool = ANNE_BECKER_MANAGED_TOOLS.transfer_to_number;
  if (isRecord(anneTransferTool)) {
    return cloneRecord(anneTransferTool);
  }
  return {
    type: "system",
    name: "transfer_to_number",
    description: "",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    params: {
      system_tool_type: "transfer_to_number",
      transfers: [],
      enable_client_message: true,
    },
    dynamic_variables: {
      dynamic_variable_placeholders: {},
    },
  };
}

export function extractTransferDestinationsFromManagedTools(
  managedTools: Record<string, unknown>,
): AgentTelephonyTransferDestination[] {
  const transferTool = managedTools.transfer_to_number;
  if (!isRecord(transferTool)) {
    return [];
  }
  const params = isRecord(transferTool.params)
    ? (transferTool.params as JsonRecord)
    : {};
  return normalizeTransferDestinations(params.transfers);
}

export function applyTransferDestinationsToManagedTools(
  managedTools: Record<string, unknown>,
  transferDestinations: AgentTelephonyTransferDestination[],
): Record<string, unknown> {
  const nextManagedTools = cloneRecord(managedTools as JsonRecord);
  const hasTransferTool = isRecord(nextManagedTools.transfer_to_number);
  const enabledTransferDestinations = transferDestinations.filter(
    (destination) => destination.enabled,
  );
  if (!hasTransferTool && enabledTransferDestinations.length === 0) {
    return nextManagedTools;
  }
  const nextTransferTool = isRecord(nextManagedTools.transfer_to_number)
    ? cloneRecord(nextManagedTools.transfer_to_number as JsonRecord)
    : buildDefaultTransferToolConfig();
  const nextParams = isRecord(nextTransferTool.params)
    ? cloneRecord(nextTransferTool.params as JsonRecord)
    : {};

  nextParams.system_tool_type = "transfer_to_number";
  if (typeof nextParams.enable_client_message !== "boolean") {
    nextParams.enable_client_message = true;
  }
  nextParams.transfers = enabledTransferDestinations.map((destination) =>
    buildTransferRule(destination),
  );
  nextTransferTool.params = nextParams;
  nextManagedTools.transfer_to_number = nextTransferTool;

  return nextManagedTools;
}

function normalizeElevenLabsConfig(value: unknown): AgentElevenLabsTelephonyConfig {
  const fallback = DEFAULT_ELEVENLABS_CONFIG;
  if (!isRecord(value)) {
    return {
      ...fallback,
      transferDestinations: [...fallback.transferDestinations],
      managedTools: { ...fallback.managedTools },
      syncState: { ...fallback.syncState },
    };
  }

  const inputManagedTools = {
    ...fallback.managedTools,
    ...normalizeManagedTools(value.managedTools),
  };
  const transferDestinations = normalizeTransferDestinations(
    Array.isArray(value.transferDestinations)
      ? value.transferDestinations
      : extractTransferDestinationsFromManagedTools(inputManagedTools),
  );

  return {
    remoteAgentId: normalizeOptionalString(value.remoteAgentId),
    systemPrompt:
      typeof value.systemPrompt === "string" ? value.systemPrompt : fallback.systemPrompt,
    firstMessage:
      typeof value.firstMessage === "string" ? value.firstMessage : fallback.firstMessage,
    knowledgeBase:
      typeof value.knowledgeBase === "string" ? value.knowledgeBase : fallback.knowledgeBase,
    knowledgeBaseName:
      typeof value.knowledgeBaseName === "string" && value.knowledgeBaseName.trim().length > 0
        ? value.knowledgeBaseName.trim()
        : fallback.knowledgeBaseName,
    transferDestinations,
    managedTools: applyTransferDestinationsToManagedTools(
      inputManagedTools,
      transferDestinations,
    ),
    workflow: value.workflow,
    syncState: normalizeSyncState(value.syncState),
  };
}

export function normalizeAgentTelephonyConfig(value: unknown): AgentTelephonyConfig {
  const fallback = DEFAULT_TELEPHONY_CONFIG;
  if (!isRecord(value)) {
    return {
      ...fallback,
      elevenlabs: normalizeElevenLabsConfig(undefined),
    };
  }

  const selectedProvider =
    value.selectedProvider === "elevenlabs"
    || value.selectedProvider === "twilio_voice"
    || value.selectedProvider === "custom_sip"
      ? value.selectedProvider
      : fallback.selectedProvider;

  return {
    selectedProvider,
    elevenlabs: normalizeElevenLabsConfig(value.elevenlabs),
  };
}

export function parseManagedToolsJson(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  const parsed = JSON.parse(trimmed) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Managed tools JSON must be an object keyed by tool name.");
  }
  return normalizeManagedTools(parsed);
}

export function stringifyManagedToolsJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

export function toDeployableTelephonyConfig(value: unknown): AgentTelephonyConfig {
  const normalized = normalizeAgentTelephonyConfig(value);
  return {
    selectedProvider: normalized.selectedProvider,
    elevenlabs: {
      systemPrompt: normalized.elevenlabs.systemPrompt,
      firstMessage: normalized.elevenlabs.firstMessage,
      knowledgeBase: normalized.elevenlabs.knowledgeBase,
      knowledgeBaseName: normalized.elevenlabs.knowledgeBaseName,
      transferDestinations: [...normalized.elevenlabs.transferDestinations],
      managedTools: applyTransferDestinationsToManagedTools(
        normalized.elevenlabs.managedTools,
        normalized.elevenlabs.transferDestinations,
      ),
      workflow: normalized.elevenlabs.workflow,
      syncState: { ...DEFAULT_SYNC_STATE },
    },
  };
}

export function mergeDeployableTelephonyConfigIntoRuntime(args: {
  templateConfig: unknown;
  currentConfig: unknown;
}): AgentTelephonyConfig {
  const deployable = toDeployableTelephonyConfig(args.templateConfig);
  const current = normalizeAgentTelephonyConfig(args.currentConfig);

  return normalizeAgentTelephonyConfig({
    selectedProvider: deployable.selectedProvider,
    elevenlabs: {
      ...deployable.elevenlabs,
      remoteAgentId: current.elevenlabs.remoteAgentId,
      syncState: current.elevenlabs.syncState,
    },
  });
}

export function buildTelephonyConnectionId(
  organizationId: string,
  providerKey: AgentTelephonyProviderKey = "elevenlabs",
): string {
  const normalizedProviderKey =
    providerKey === "twilio_voice"
      ? "twilio_voice"
      : providerKey === "custom_sip"
        ? "custom_sip"
        : "elevenlabs";
  return `org_${organizationId.replace(/[^a-zA-Z0-9_:-]/g, "_")}_${normalizedProviderKey}`;
}

export function buildTelephonyRouteKey(args: {
  providerConnectionId: string;
  providerInstallationId?: string;
  providerKey?: AgentTelephonyProviderKey;
}): string {
  const installationId = args.providerInstallationId || DEFAULT_TELEPHONY_INSTALLATION_ID;
  const prefix =
    args.providerKey === "twilio_voice"
      ? TWILIO_VOICE_ROUTE_PREFIX
      : ELEVEN_TELEPHONY_ROUTE_PREFIX;
  return `${prefix}:${args.providerConnectionId}:${installationId}`;
}

export function buildElevenTelephonyRouteKey(args: {
  providerConnectionId: string;
  providerInstallationId?: string;
}): string {
  return buildTelephonyRouteKey({
    providerConnectionId: args.providerConnectionId,
    providerInstallationId: args.providerInstallationId,
    providerKey: "elevenlabs",
  });
}

export function resolveImplementedTelephonyProvider(
  providerKey: AgentTelephonyProviderKey
): "eleven_telephony" | "twilio_voice" | null {
  if (providerKey === "elevenlabs") {
    return "eleven_telephony";
  }
  if (providerKey === "twilio_voice") {
    return "twilio_voice";
  }
  return null;
}
