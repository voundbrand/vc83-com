export const RUNTIME_GOVERNOR_CONTRACT_VERSION = "runtime_governor.v1";

const DEFAULT_MAX_STEPS = 8;
const DEFAULT_MAX_TIME_MS = 120_000;
const DEFAULT_MAX_COST_USD = 2.5;

const MIN_MAX_STEPS = 1;
const MAX_MAX_STEPS = 32;
const MIN_MAX_TIME_MS = 1_000;
const MAX_MAX_TIME_MS = 300_000;
const MIN_MAX_COST_USD = 0.01;
const MAX_MAX_COST_USD = 50;

export type RuntimeGovernorSource = "default" | "agent_config" | "metadata_override";

export interface RuntimeGovernorContract {
  contract_version: string;
  max_steps: number;
  max_time_ms: number;
  max_cost_usd: number;
  source: RuntimeGovernorSource;
}

export type RuntimeGovernorLimit = "none" | "max_steps" | "max_time_ms" | "max_cost_usd";

export interface RuntimeGovernorEnforcementState {
  assistantContent: string;
  toolCalls: Array<Record<string, unknown>>;
  toolCallsTrimmed: number;
  limitTriggered: RuntimeGovernorLimit;
}

type RuntimeGovernorPartial = {
  max_steps?: number;
  max_time_ms?: number;
  max_cost_usd?: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function normalizeBoundedInteger(
  value: unknown,
  minimum: number,
  maximum: number
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.floor(value);
  if (rounded < minimum || rounded > maximum) {
    return undefined;
  }
  return rounded;
}

function normalizeBoundedNumber(
  value: unknown,
  minimum: number,
  maximum: number
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.round(value * 1000) / 1000;
  if (rounded < minimum || rounded > maximum) {
    return undefined;
  }
  return rounded;
}

function readOverrideFromRecord(record: Record<string, unknown>): RuntimeGovernorPartial {
  const nested = asRecord(record.runtimeGovernor) || asRecord(record.runtime_governor);
  const source = nested || record;
  return {
    max_steps: normalizeBoundedInteger(
      source.max_steps ?? source.maxSteps,
      MIN_MAX_STEPS,
      MAX_MAX_STEPS
    ),
    max_time_ms: normalizeBoundedInteger(
      source.max_time_ms ?? source.maxTimeMs,
      MIN_MAX_TIME_MS,
      MAX_MAX_TIME_MS
    ),
    max_cost_usd: normalizeBoundedNumber(
      source.max_cost_usd ?? source.maxCostUsd,
      MIN_MAX_COST_USD,
      MAX_MAX_COST_USD
    ),
  };
}

function hasAnyOverride(override: RuntimeGovernorPartial): boolean {
  return (
    typeof override.max_steps === "number"
    || typeof override.max_time_ms === "number"
    || typeof override.max_cost_usd === "number"
  );
}

export function resolveRuntimeGovernorContract(args: {
  agentConfig?: unknown;
  metadata?: unknown;
}): RuntimeGovernorContract {
  const defaults: RuntimeGovernorContract = {
    contract_version: RUNTIME_GOVERNOR_CONTRACT_VERSION,
    max_steps: DEFAULT_MAX_STEPS,
    max_time_ms: DEFAULT_MAX_TIME_MS,
    max_cost_usd: DEFAULT_MAX_COST_USD,
    source: "default",
  };

  const agentConfigRecord = asRecord(args.agentConfig);
  const metadataRecord = asRecord(args.metadata);

  const fromAgent = agentConfigRecord ? readOverrideFromRecord(agentConfigRecord) : {};
  const fromMetadata = metadataRecord ? readOverrideFromRecord(metadataRecord) : {};

  const resolved: RuntimeGovernorContract = {
    contract_version: RUNTIME_GOVERNOR_CONTRACT_VERSION,
    max_steps: fromMetadata.max_steps ?? fromAgent.max_steps ?? defaults.max_steps,
    max_time_ms: fromMetadata.max_time_ms ?? fromAgent.max_time_ms ?? defaults.max_time_ms,
    max_cost_usd: fromMetadata.max_cost_usd ?? fromAgent.max_cost_usd ?? defaults.max_cost_usd,
    source: hasAnyOverride(fromMetadata)
      ? "metadata_override"
      : hasAnyOverride(fromAgent)
        ? "agent_config"
        : "default",
  };

  return resolved;
}

export function formatRuntimeGovernorLimitMessage(args: {
  limit: "max_steps" | "max_time_ms" | "max_cost_usd";
  contract: RuntimeGovernorContract;
  observedValue?: number;
}): string {
  const observedSuffix =
    typeof args.observedValue === "number" && Number.isFinite(args.observedValue)
      ? ` (observed: ${args.observedValue})`
      : "";

  if (args.limit === "max_steps") {
    return `Runtime governor paused execution because max_steps (${args.contract.max_steps}) was reached${observedSuffix}.`;
  }
  if (args.limit === "max_time_ms") {
    return `Runtime governor paused execution because max_time_ms (${args.contract.max_time_ms}) was exceeded${observedSuffix}.`;
  }
  return `Runtime governor paused execution because max_cost_usd (${args.contract.max_cost_usd}) was exceeded${observedSuffix}.`;
}

function appendLimitMessage(args: {
  assistantContent: string;
  limitMessage: string;
}): string {
  return args.assistantContent.trim().length > 0
    ? `${args.assistantContent}\n\n${args.limitMessage}`
    : args.limitMessage;
}

function recordLimitTrigger(args: {
  current: RuntimeGovernorLimit;
  next: Exclude<RuntimeGovernorLimit, "none">;
}): RuntimeGovernorLimit {
  return args.current === "none" ? args.next : args.current;
}

export function enforceRuntimeGovernorStepAndTime(args: {
  contract: RuntimeGovernorContract;
  assistantContent: string;
  toolCalls: Array<Record<string, unknown>>;
  elapsedMsBeforeTools: number;
  limitTriggered?: RuntimeGovernorLimit;
}): RuntimeGovernorEnforcementState {
  let assistantContent = args.assistantContent;
  let toolCalls = args.toolCalls;
  let toolCallsTrimmed = 0;
  let limitTriggered = args.limitTriggered ?? "none";

  const maxToolCallsForTurn = Math.max(0, args.contract.max_steps - 1);
  const requestedToolCallCount = toolCalls.length;
  if (requestedToolCallCount > maxToolCallsForTurn) {
    toolCallsTrimmed = requestedToolCallCount - maxToolCallsForTurn;
    toolCalls = toolCalls.slice(0, maxToolCallsForTurn);
    limitTriggered = recordLimitTrigger({
      current: limitTriggered,
      next: "max_steps",
    });
    if (maxToolCallsForTurn === 0) {
      const limitMessage = formatRuntimeGovernorLimitMessage({
        limit: "max_steps",
        contract: args.contract,
        observedValue: requestedToolCallCount,
      });
      assistantContent = appendLimitMessage({
        assistantContent,
        limitMessage,
      });
    }
  }

  if (args.elapsedMsBeforeTools > args.contract.max_time_ms && toolCalls.length > 0) {
    toolCalls = [];
    limitTriggered = recordLimitTrigger({
      current: limitTriggered,
      next: "max_time_ms",
    });
    const limitMessage = formatRuntimeGovernorLimitMessage({
      limit: "max_time_ms",
      contract: args.contract,
      observedValue: args.elapsedMsBeforeTools,
    });
    assistantContent = appendLimitMessage({
      assistantContent,
      limitMessage,
    });
  }

  return {
    assistantContent,
    toolCalls,
    toolCallsTrimmed,
    limitTriggered,
  };
}

export function enforceRuntimeGovernorCost(args: {
  contract: RuntimeGovernorContract;
  assistantContent: string;
  toolCalls: Array<Record<string, unknown>>;
  toolCallsTrimmed: number;
  estimatedCostUsd: number | undefined;
  limitTriggered: RuntimeGovernorLimit;
}): RuntimeGovernorEnforcementState {
  let assistantContent = args.assistantContent;
  let toolCalls = args.toolCalls;
  const toolCallsTrimmed = args.toolCallsTrimmed;
  let limitTriggered = args.limitTriggered;

  if (
    typeof args.estimatedCostUsd === "number"
    && Number.isFinite(args.estimatedCostUsd)
    && args.estimatedCostUsd > args.contract.max_cost_usd
    && toolCalls.length > 0
  ) {
    toolCalls = [];
    limitTriggered = recordLimitTrigger({
      current: limitTriggered,
      next: "max_cost_usd",
    });
    const limitMessage = formatRuntimeGovernorLimitMessage({
      limit: "max_cost_usd",
      contract: args.contract,
      observedValue: args.estimatedCostUsd,
    });
    assistantContent = appendLimitMessage({
      assistantContent,
      limitMessage,
    });
  }

  return {
    assistantContent,
    toolCalls,
    toolCallsTrimmed,
    limitTriggered,
  };
}
