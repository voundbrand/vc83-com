import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";

export const TRUST_EVENT_TAXONOMY_VERSION = "2026-02-19.v3";
export const TRUST_EVENT_NAMESPACE = "trust";

export const TRUST_EVENT_MODE_VALUES = [
  "lifecycle",
  "setup",
  "agents",
  "admin",
  "runtime",
] as const;
export type TrustEventMode = (typeof TRUST_EVENT_MODE_VALUES)[number];

export const TRUST_EVENT_LEGACY_MODE_VALUES = [
  "brain",
] as const;
export type TrustEventLegacyMode =
  (typeof TRUST_EVENT_LEGACY_MODE_VALUES)[number];

export type TrustEventModeInput = TrustEventMode | TrustEventLegacyMode;

export const trustEventModeValidator = v.union(
  v.literal("lifecycle"),
  v.literal("setup"),
  v.literal("agents"),
  v.literal("admin"),
  v.literal("runtime"),
  v.literal("brain"),
);

export const trustEventCanonicalModeValidator = v.union(
  v.literal("lifecycle"),
  v.literal("setup"),
  v.literal("agents"),
  v.literal("admin"),
  v.literal("runtime"),
);

export const TRUST_EVENT_ACTOR_TYPE_VALUES = [
  "user",
  "agent",
  "admin",
  "system",
  "workflow",
] as const;
export type TrustEventActorType = (typeof TRUST_EVENT_ACTOR_TYPE_VALUES)[number];

export const trustEventActorTypeValidator = v.union(
  v.literal("user"),
  v.literal("agent"),
  v.literal("admin"),
  v.literal("system"),
  v.literal("workflow"),
);

export const TRUST_EVENT_SCHEMA_VALIDATION_STATUS_VALUES = [
  "passed",
  "failed",
] as const;
export type TrustEventSchemaValidationStatus =
  (typeof TRUST_EVENT_SCHEMA_VALIDATION_STATUS_VALUES)[number];

export const trustEventSchemaValidationStatusValidator = v.union(
  v.literal("passed"),
  v.literal("failed"),
);

export const TRUST_CONTEXT_EVENT_NAMES = [
  "trust.context.layer_boundaries_validated.v1",
  "trust.context.layer_violation_blocked.v1",
] as const;

export const TRUST_LIFECYCLE_EVENT_NAMES = [
  "trust.lifecycle.transition_checkpoint.v1",
  "trust.lifecycle.operator_reply_in_stream.v1",
] as const;

export const TRUST_VOICE_EVENT_NAMES = [
  "trust.voice.session_transition.v1",
  "trust.voice.adaptive_flow_decision.v1",
  "trust.voice.runtime_failover_triggered.v1",
] as const;

export const TRUST_BRAIN_EVENT_NAMES = [
  "trust.brain.content_dna.composed.v1",
  "trust.brain.content_dna.source_linked.v1",
] as const;

export const TRUST_MEMORY_EVENT_NAMES = [
  "trust.memory.consent_prompted.v1",
  "trust.memory.consent_decided.v1",
  "trust.memory.write_blocked_no_consent.v1",
] as const;

export const TRUST_KNOWLEDGE_EVENT_NAMES = [
  "trust.knowledge.ingest_submitted.v1",
  "trust.knowledge.ingest_processed.v1",
  "trust.knowledge.ingest_failed.v1",
] as const;

export const TRUST_SETUP_EVENT_NAMES = [
  "trust.setup.artifact_generation_started.v1",
  "trust.setup.artifact_generated.v1",
  "trust.setup.artifact_generation_failed.v1",
  "trust.setup.connect_validation_passed.v1",
  "trust.setup.connect_validation_failed.v1",
  "trust.setup.connect_persisted.v1",
] as const;

export const TRUST_SOUL_EVENT_NAMES = [
  "trust.soul.proposal_created.v1",
  "trust.soul.proposal_reviewed.v1",
  "trust.soul.rollback_executed.v1",
] as const;

export const TRUST_GUARDRAIL_EVENT_NAMES = [
  "trust.guardrail.policy_evaluated.v1",
  "trust.guardrail.policy_blocked.v1",
  "trust.guardrail.policy_overridden.v1",
] as const;

export const TRUST_TEAM_EVENT_NAMES = [
  "trust.team.handoff_started.v1",
  "trust.team.handoff_completed.v1",
  "trust.team.handoff_dropped_context.v1",
] as const;

export const TRUST_TELEMETRY_EVENT_NAMES = [
  "trust.telemetry.schema_registered.v1",
  "trust.telemetry.schema_validation_failed.v1",
  "trust.telemetry.kpi_checkpoint.v1",
] as const;

export const TRUST_ADMIN_EVENT_NAMES = [
  "trust.admin.training_session_started.v1",
  "trust.admin.training_artifact_published.v1",
  "trust.admin.training_session_completed.v1",
] as const;

export const TRUST_EVENT_NAME_VALUES = [
  ...TRUST_CONTEXT_EVENT_NAMES,
  ...TRUST_LIFECYCLE_EVENT_NAMES,
  ...TRUST_VOICE_EVENT_NAMES,
  ...TRUST_BRAIN_EVENT_NAMES,
  ...TRUST_MEMORY_EVENT_NAMES,
  ...TRUST_KNOWLEDGE_EVENT_NAMES,
  ...TRUST_SETUP_EVENT_NAMES,
  ...TRUST_SOUL_EVENT_NAMES,
  ...TRUST_GUARDRAIL_EVENT_NAMES,
  ...TRUST_TEAM_EVENT_NAMES,
  ...TRUST_TELEMETRY_EVENT_NAMES,
  ...TRUST_ADMIN_EVENT_NAMES,
] as const;
export type TrustEventName = (typeof TRUST_EVENT_NAME_VALUES)[number];

export const trustEventNameValidator = v.union(
  v.literal("trust.context.layer_boundaries_validated.v1"),
  v.literal("trust.context.layer_violation_blocked.v1"),
  v.literal("trust.lifecycle.transition_checkpoint.v1"),
  v.literal("trust.lifecycle.operator_reply_in_stream.v1"),
  v.literal("trust.voice.session_transition.v1"),
  v.literal("trust.voice.adaptive_flow_decision.v1"),
  v.literal("trust.voice.runtime_failover_triggered.v1"),
  v.literal("trust.brain.content_dna.composed.v1"),
  v.literal("trust.brain.content_dna.source_linked.v1"),
  v.literal("trust.memory.consent_prompted.v1"),
  v.literal("trust.memory.consent_decided.v1"),
  v.literal("trust.memory.write_blocked_no_consent.v1"),
  v.literal("trust.knowledge.ingest_submitted.v1"),
  v.literal("trust.knowledge.ingest_processed.v1"),
  v.literal("trust.knowledge.ingest_failed.v1"),
  v.literal("trust.setup.artifact_generation_started.v1"),
  v.literal("trust.setup.artifact_generated.v1"),
  v.literal("trust.setup.artifact_generation_failed.v1"),
  v.literal("trust.setup.connect_validation_passed.v1"),
  v.literal("trust.setup.connect_validation_failed.v1"),
  v.literal("trust.setup.connect_persisted.v1"),
  v.literal("trust.soul.proposal_created.v1"),
  v.literal("trust.soul.proposal_reviewed.v1"),
  v.literal("trust.soul.rollback_executed.v1"),
  v.literal("trust.guardrail.policy_evaluated.v1"),
  v.literal("trust.guardrail.policy_blocked.v1"),
  v.literal("trust.guardrail.policy_overridden.v1"),
  v.literal("trust.team.handoff_started.v1"),
  v.literal("trust.team.handoff_completed.v1"),
  v.literal("trust.team.handoff_dropped_context.v1"),
  v.literal("trust.telemetry.schema_registered.v1"),
  v.literal("trust.telemetry.schema_validation_failed.v1"),
  v.literal("trust.telemetry.kpi_checkpoint.v1"),
  v.literal("trust.admin.training_session_started.v1"),
  v.literal("trust.admin.training_artifact_published.v1"),
  v.literal("trust.admin.training_session_completed.v1"),
);

const TRUST_EVENT_NAME_PATTERN =
  /^trust\.[a-z0-9_]+\.[a-z0-9_]+(?:\.[a-z0-9_]+)?\.v1$/;

export const TRUST_EVENT_BASE_REQUIRED_FIELDS = [
  "event_id",
  "event_version",
  "occurred_at",
  "org_id",
  "mode",
  "channel",
  "session_id",
  "actor_type",
  "actor_id",
] as const;
export type TrustEventBaseField = (typeof TRUST_EVENT_BASE_REQUIRED_FIELDS)[number];

const CONTEXT_REQUIRED_ADDITIONAL_FIELDS = [
  "source_layer",
  "resolved_layer",
  "enforcement_action",
  "request_origin",
] as const;

const LIFECYCLE_REQUIRED_ADDITIONAL_FIELDS = [
  "lifecycle_state_from",
  "lifecycle_state_to",
  "lifecycle_checkpoint",
  "lifecycle_transition_actor",
  "lifecycle_transition_reason",
] as const;

const VOICE_SESSION_REQUIRED_ADDITIONAL_FIELDS = [
  "voice_session_id",
  "voice_state_from",
  "voice_state_to",
  "voice_transition_reason",
  "voice_runtime_provider",
] as const;

const VOICE_ADAPTIVE_REQUIRED_ADDITIONAL_FIELDS = [
  "voice_session_id",
  "adaptive_phase_id",
  "adaptive_decision",
  "adaptive_confidence",
  "consent_checkpoint_id",
] as const;

const VOICE_FAILOVER_REQUIRED_ADDITIONAL_FIELDS = [
  "voice_session_id",
  "voice_runtime_provider",
  "voice_failover_provider",
  "voice_failover_reason",
  "voice_provider_health_status",
] as const;

const CONTENT_DNA_REQUIRED_ADDITIONAL_FIELDS = [
  "content_profile_id",
  "content_profile_version",
  "source_object_ids",
  "artifact_types",
] as const;

const MEMORY_REQUIRED_ADDITIONAL_FIELDS = [
  "consent_scope",
  "consent_decision",
  "memory_candidate_ids",
  "consent_prompt_version",
] as const;

const KNOWLEDGE_REQUIRED_ADDITIONAL_FIELDS = [
  "knowledge_item_id",
  "knowledge_kind",
  "ingest_status",
  "processor_stage",
  "failure_reason",
] as const;

const SETUP_ARTIFACT_REQUIRED_ADDITIONAL_FIELDS = [
  "setup_session_id",
  "artifact_kind",
  "artifact_path",
  "artifact_checksum",
  "generator_model",
] as const;

const SETUP_CONNECT_REQUIRED_ADDITIONAL_FIELDS = [
  "detected_artifacts",
  "validation_status",
  "validation_errors",
  "persisted_object_ids",
] as const;

const SOUL_REQUIRED_ADDITIONAL_FIELDS = [
  "proposal_id",
  "proposal_version",
  "risk_level",
  "review_decision",
  "rollback_target",
] as const;

const GUARDRAIL_REQUIRED_ADDITIONAL_FIELDS = [
  "policy_type",
  "policy_id",
  "tool_name",
  "enforcement_decision",
  "override_source",
] as const;

const TEAM_REQUIRED_ADDITIONAL_FIELDS = [
  "team_session_id",
  "handoff_id",
  "from_agent_id",
  "to_agent_id",
  "context_digest",
] as const;

const TELEMETRY_REQUIRED_ADDITIONAL_FIELDS = [
  "taxonomy_version",
  "event_namespace",
  "schema_validation_status",
  "metric_name",
  "metric_value",
] as const;

export const TRUST_ADMIN_REQUIRED_ADDITIONAL_FIELDS = [
  "platform_agent_id",
  "training_template_id",
  "parity_mode",
  "customer_agent_template_link",
] as const;

export interface TrustEventBasePayload {
  event_id: string;
  event_version: string;
  occurred_at: number;
  org_id: Id<"organizations">;
  mode: TrustEventModeInput;
  channel: string;
  session_id: string;
  actor_type: TrustEventActorType;
  actor_id: string;
}

export interface TrustEventAdditionalPayload {
  source_layer?: string;
  resolved_layer?: string;
  enforcement_action?: string;
  request_origin?: string;

  lifecycle_state_from?: string;
  lifecycle_state_to?: string;
  lifecycle_checkpoint?: string;
  lifecycle_transition_actor?: string;
  lifecycle_transition_reason?: string;

  voice_session_id?: string;
  voice_state_from?: string;
  voice_state_to?: string;
  voice_transition_reason?: string;
  voice_runtime_provider?: string;
  adaptive_phase_id?: string;
  adaptive_decision?: string;
  adaptive_confidence?: number;
  consent_checkpoint_id?: string;
  voice_failover_provider?: string;
  voice_failover_reason?: string;
  voice_provider_health_status?: string;

  content_profile_id?: string;
  content_profile_version?: string;
  source_object_ids?: string[];
  artifact_types?: string[];

  consent_scope?: string;
  consent_decision?: string;
  memory_candidate_ids?: string[];
  consent_prompt_version?: string;

  knowledge_item_id?: string;
  knowledge_kind?: string;
  ingest_status?: string;
  processor_stage?: string;
  failure_reason?: string;

  setup_session_id?: string;
  artifact_kind?: string;
  artifact_path?: string;
  artifact_checksum?: string;
  generator_model?: string;

  detected_artifacts?: string[];
  validation_status?: string;
  validation_errors?: string[];
  persisted_object_ids?: string[];

  proposal_id?: string;
  proposal_version?: string;
  risk_level?: string;
  review_decision?: string;
  rollback_target?: string;

  policy_type?: string;
  policy_id?: string;
  tool_name?: string;
  enforcement_decision?: string;
  override_source?: string;

  team_session_id?: string;
  handoff_id?: string;
  from_agent_id?: string;
  to_agent_id?: string;
  context_digest?: string;

  taxonomy_version?: string;
  event_namespace?: string;
  schema_validation_status?: TrustEventSchemaValidationStatus;
  metric_name?: string;
  metric_value?: number;

  platform_agent_id?: string;
  training_template_id?: string;
  parity_mode?: string;
  customer_agent_template_link?: string;
}

export type TrustEventPayload = TrustEventBasePayload &
  Partial<TrustEventAdditionalPayload>;

type TrustEventAdditionalField = keyof TrustEventAdditionalPayload;

export interface TrustEventSpecification {
  allowed_modes: readonly TrustEventMode[];
  required_additional_fields: readonly TrustEventAdditionalField[];
}

const ALL_TRUST_EVENT_MODES = TRUST_EVENT_MODE_VALUES;

export const TRUST_EVENT_SPECIFICATIONS: Record<TrustEventName, TrustEventSpecification> = {
  "trust.context.layer_boundaries_validated.v1": {
    allowed_modes: ["setup", "runtime"],
    required_additional_fields: CONTEXT_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.context.layer_violation_blocked.v1": {
    allowed_modes: ["setup", "runtime"],
    required_additional_fields: CONTEXT_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.lifecycle.transition_checkpoint.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: LIFECYCLE_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.lifecycle.operator_reply_in_stream.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: LIFECYCLE_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.voice.session_transition.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: VOICE_SESSION_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.voice.adaptive_flow_decision.v1": {
    allowed_modes: ["lifecycle", "runtime"],
    required_additional_fields: VOICE_ADAPTIVE_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.voice.runtime_failover_triggered.v1": {
    allowed_modes: ["lifecycle", "runtime"],
    required_additional_fields: VOICE_FAILOVER_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.brain.content_dna.composed.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: CONTENT_DNA_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.brain.content_dna.source_linked.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: CONTENT_DNA_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.memory.consent_prompted.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: MEMORY_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.memory.consent_decided.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: MEMORY_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.memory.write_blocked_no_consent.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: MEMORY_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.knowledge.ingest_submitted.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: KNOWLEDGE_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.knowledge.ingest_processed.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: KNOWLEDGE_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.knowledge.ingest_failed.v1": {
    allowed_modes: ["lifecycle"],
    required_additional_fields: KNOWLEDGE_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.setup.artifact_generation_started.v1": {
    allowed_modes: ["setup"],
    required_additional_fields: SETUP_ARTIFACT_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.setup.artifact_generated.v1": {
    allowed_modes: ["setup"],
    required_additional_fields: SETUP_ARTIFACT_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.setup.artifact_generation_failed.v1": {
    allowed_modes: ["setup"],
    required_additional_fields: SETUP_ARTIFACT_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.setup.connect_validation_passed.v1": {
    allowed_modes: ["setup"],
    required_additional_fields: SETUP_CONNECT_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.setup.connect_validation_failed.v1": {
    allowed_modes: ["setup"],
    required_additional_fields: SETUP_CONNECT_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.setup.connect_persisted.v1": {
    allowed_modes: ["setup"],
    required_additional_fields: SETUP_CONNECT_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.soul.proposal_created.v1": {
    allowed_modes: ["agents"],
    required_additional_fields: SOUL_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.soul.proposal_reviewed.v1": {
    allowed_modes: ["agents"],
    required_additional_fields: SOUL_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.soul.rollback_executed.v1": {
    allowed_modes: ["agents"],
    required_additional_fields: SOUL_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.guardrail.policy_evaluated.v1": {
    allowed_modes: ["agents", "runtime"],
    required_additional_fields: GUARDRAIL_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.guardrail.policy_blocked.v1": {
    allowed_modes: ["agents", "runtime"],
    required_additional_fields: GUARDRAIL_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.guardrail.policy_overridden.v1": {
    allowed_modes: ["agents", "runtime"],
    required_additional_fields: GUARDRAIL_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.team.handoff_started.v1": {
    allowed_modes: ["agents", "runtime"],
    required_additional_fields: TEAM_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.team.handoff_completed.v1": {
    allowed_modes: ["agents", "runtime"],
    required_additional_fields: TEAM_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.team.handoff_dropped_context.v1": {
    allowed_modes: ["agents", "runtime"],
    required_additional_fields: TEAM_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.telemetry.schema_registered.v1": {
    allowed_modes: ALL_TRUST_EVENT_MODES,
    required_additional_fields: TELEMETRY_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.telemetry.schema_validation_failed.v1": {
    allowed_modes: ALL_TRUST_EVENT_MODES,
    required_additional_fields: TELEMETRY_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.telemetry.kpi_checkpoint.v1": {
    allowed_modes: ALL_TRUST_EVENT_MODES,
    required_additional_fields: TELEMETRY_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.admin.training_session_started.v1": {
    allowed_modes: ["admin"],
    required_additional_fields: TRUST_ADMIN_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.admin.training_artifact_published.v1": {
    allowed_modes: ["admin"],
    required_additional_fields: TRUST_ADMIN_REQUIRED_ADDITIONAL_FIELDS,
  },
  "trust.admin.training_session_completed.v1": {
    allowed_modes: ["admin"],
    required_additional_fields: TRUST_ADMIN_REQUIRED_ADDITIONAL_FIELDS,
  },
};

const TRUST_EVENT_NAME_SET = new Set<string>(TRUST_EVENT_NAME_VALUES);
const TRUST_EVENT_MODE_SET = new Set<string>(TRUST_EVENT_MODE_VALUES);
const TRUST_EVENT_MODE_INPUT_SET = new Set<string>([
  ...TRUST_EVENT_MODE_VALUES,
  ...TRUST_EVENT_LEGACY_MODE_VALUES,
]);
const TRUST_EVENT_MODE_ALIAS_MAP: Record<TrustEventLegacyMode, TrustEventMode> = {
  brain: "lifecycle",
};

export function isTrustEventMode(value: string): value is TrustEventMode {
  return TRUST_EVENT_MODE_SET.has(value);
}

export function isTrustEventLegacyMode(value: string): value is TrustEventLegacyMode {
  return (TRUST_EVENT_LEGACY_MODE_VALUES as readonly string[]).includes(value);
}

export function isTrustEventModeInput(value: string): value is TrustEventModeInput {
  return TRUST_EVENT_MODE_INPUT_SET.has(value);
}

export function normalizeTrustEventMode(value: string): TrustEventMode | null {
  if (isTrustEventMode(value)) {
    return value;
  }
  if (isTrustEventLegacyMode(value)) {
    return TRUST_EVENT_MODE_ALIAS_MAP[value];
  }
  return null;
}

export function isTrustEventName(value: string): value is TrustEventName {
  return TRUST_EVENT_NAME_SET.has(value);
}

export function isDeterministicTrustEventName(value: string): boolean {
  return TRUST_EVENT_NAME_PATTERN.test(value);
}

export function getTrustEventSpecification(
  eventName: TrustEventName,
): TrustEventSpecification {
  return TRUST_EVENT_SPECIFICATIONS[eventName];
}

export function isModeAllowedForTrustEvent(
  eventName: TrustEventName,
  mode: TrustEventModeInput,
): boolean {
  const normalizedMode = normalizeTrustEventMode(mode);
  if (!normalizedMode) {
    return false;
  }
  return TRUST_EVENT_SPECIFICATIONS[eventName].allowed_modes.includes(normalizedMode);
}

export function getTrustEventNamesForMode(mode: TrustEventModeInput): TrustEventName[] {
  const normalizedMode = normalizeTrustEventMode(mode);
  if (!normalizedMode) {
    return [];
  }
  return TRUST_EVENT_NAME_VALUES.filter((eventName) =>
    TRUST_EVENT_SPECIFICATIONS[eventName].allowed_modes.includes(normalizedMode),
  );
}

function hasDefinedPayloadValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return value !== null && value !== undefined;
}

export interface TrustEventPayloadValidationResult {
  ok: boolean;
  errors: string[];
  missing_base_fields: TrustEventBaseField[];
  missing_additional_fields: TrustEventAdditionalField[];
}

export function validateTrustEventPayload(
  eventName: string,
  payload: Partial<TrustEventPayload>,
): TrustEventPayloadValidationResult {
  const payloadRecord = payload as Record<string, unknown>;
  const errors: string[] = [];

  const missing_base_fields = TRUST_EVENT_BASE_REQUIRED_FIELDS.filter(
    (field) => !hasDefinedPayloadValue(payloadRecord[field]),
  ) as TrustEventBaseField[];

  if (!isDeterministicTrustEventName(eventName)) {
    errors.push(
      "event name must match trust.<surface>.<action>.v1 or trust.<surface>.<domain>.<action>.v1",
    );
  }

  const knownEvent = isTrustEventName(eventName);
  if (!knownEvent) {
    errors.push(`event name "${eventName}" is not registered in trust taxonomy`);
  }

  const modeRaw = payloadRecord.mode;
  const mode = typeof modeRaw === "string"
    ? normalizeTrustEventMode(modeRaw)
    : null;
  if (!mode) {
    errors.push(
      `mode must be one of: ${[...TRUST_EVENT_MODE_VALUES, ...TRUST_EVENT_LEGACY_MODE_VALUES].join(", ")}`,
    );
  } else if (knownEvent && !isModeAllowedForTrustEvent(eventName, modeRaw as TrustEventModeInput)) {
    const rawValue = typeof modeRaw === "string" ? modeRaw : String(modeRaw);
    errors.push(`mode "${rawValue}" (normalized to "${mode}") is not allowed for event "${eventName}"`);
  }

  let missing_additional_fields: TrustEventAdditionalField[] = [];
  if (knownEvent) {
    const requiredAdditional =
      TRUST_EVENT_SPECIFICATIONS[eventName].required_additional_fields;
    missing_additional_fields = requiredAdditional.filter(
      (field) => !hasDefinedPayloadValue(payloadRecord[field]),
    ) as TrustEventAdditionalField[];
  }

  if (missing_base_fields.length > 0) {
    errors.push(`missing base fields: ${missing_base_fields.join(", ")}`);
  }
  if (missing_additional_fields.length > 0) {
    errors.push(
      `missing event-specific fields: ${missing_additional_fields.join(", ")}`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    missing_base_fields,
    missing_additional_fields,
  };
}
