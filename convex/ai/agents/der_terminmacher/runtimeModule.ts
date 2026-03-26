import {
  resolveAgentRuntimeModuleMetadataFromConfig,
} from "../../agentSpecRegistry";
import { DER_TERMINMACHER_BOOKING_TOOL_MANIFEST } from "../../tools/bookingTool";
import { DER_TERMINMACHER_CRM_TOOL_MANIFEST } from "../../tools/crmTool";

const MEETING_CONCIERGE_EMAIL_PATTERN =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const MEETING_CONCIERGE_PHONE_PATTERN =
  /(?:\+?\d{1,2}[\s-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/;
const DER_TERMINMACHER_INTENT_BOOKING_PATTERN =
  /\b(termin|termine|terminanfrage|terminplanung|buchen|buche|buchung|appointment|appointments|book|booking|schedule|scheduled|meeting|meetings|calendar|slot|slots)\b/i;
const DER_TERMINMACHER_INTENT_PLANNING_PATTERN =
  /\b(plan|plane|planen|planung|organize|organise|arrange|arrangement|coordina(?:te|tion))\b/i;
const DER_TERMINMACHER_INTENT_GERMAN_PATTERN =
  /\b(auf deutsch|deutsch|bitte deutsch|bitte auf deutsch|german|german-first|terminanfrage|terminvereinbarung)\b/i;
const DER_TERMINMACHER_INTENT_CLARIFYING_QUESTION =
  "Quick clarification before I proceed: do you want me to switch into appointment concierge mode and prepare a preview booking plan?";
const RUNTIME_MODULE_INTENT_ROUTER_HIGH_CONFIDENCE_THRESHOLD = 0.72;
const RUNTIME_MODULE_INTENT_ROUTER_AMBIGUOUS_THRESHOLD = 0.48;

export const RUNTIME_MODULE_INTENT_ROUTER_CONTRACT_VERSION =
  "aoh_runtime_module_intent_router_v1" as const;
export const DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY =
  "der_terminmacher_runtime_module_v1" as const;
export const DER_TERMINMACHER_PROMPT_CONTRACT_VERSION =
  "aoh_der_terminmacher_prompt_contract_v1" as const;
export const DER_TERMINMACHER_TOOL_MANIFEST_CONTRACT_VERSION =
  "aoh_der_terminmacher_tool_manifest_v1" as const;
export const DER_TERMINMACHER_MUTATION_POLICY_CONTRACT_VERSION =
  "aoh_der_terminmacher_mutation_policy_v1" as const;

export interface RuntimeModuleIntentRoutingCandidate {
  moduleKey: string;
  confidence: number;
  reasonCodes: string[];
}

export interface RuntimeModuleIntentRoutingDecision {
  contractVersion: typeof RUNTIME_MODULE_INTENT_ROUTER_CONTRACT_VERSION;
  decision: "selected" | "default" | "clarification_required";
  selectedModuleKey: string | null;
  confidence: number;
  thresholds: {
    highConfidence: number;
    ambiguous: number;
  };
  clarificationQuestion?: string;
  reasonCodes: string[];
  candidates: RuntimeModuleIntentRoutingCandidate[];
}

export interface DerTerminmacherRuntimeContract {
  contractVersion: typeof DER_TERMINMACHER_PROMPT_CONTRACT_VERSION;
  moduleKey: typeof DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY;
  languagePolicy: {
    primary: "de";
    fallback: "en";
    responseMode: "german_first";
  };
  ingressAssumptions: {
    allowedChannels: Array<"desktop" | "native_guest">;
    requireLiveSignal: true;
    preferredSurfaces: Array<"voice" | "camera">;
  };
  toolManifest: {
    contractVersion: typeof DER_TERMINMACHER_TOOL_MANIFEST_CONTRACT_VERSION;
    requiredTools: string[];
    optionalTools: string[];
    deniedTools: string[];
  };
  mutationPolicy: {
    contractVersion: typeof DER_TERMINMACHER_MUTATION_POLICY_CONTRACT_VERSION;
    modeDefault: "preview";
    previewFirst: true;
    executeRequiresExplicitConfirmation: true;
  };
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const normalized = normalizeOptionalString(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function normalizeObject(
  value: unknown
): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeLowercaseRuntimeToken(value: unknown): string | null {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
}

function normalizeIntentRoutingConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function normalizeDeterministicRuntimeStringArray(values?: string[]): string[] {
  if (!values) {
    return [];
  }
  return Array.from(
    new Set(
      values
        .map((value) => normalizeOptionalString(value))
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function scoreDerTerminmacherIntent(args: {
  authorityConfig: Record<string, unknown> | null | undefined;
  message: string;
  channel: string;
  metadata: Record<string, unknown>;
}): RuntimeModuleIntentRoutingCandidate {
  let confidence = 0;
  const reasonCodes: string[] = [];
  const normalizedMessage = args.message.trim();
  const messageLower = normalizedMessage.toLowerCase();

  const runtimeModuleRecord = normalizeObject(args.authorityConfig?.runtimeModule);
  const explicitRuntimeModuleKey = normalizeLowercaseRuntimeToken(
    firstNonEmptyString(
      args.authorityConfig?.runtimeModuleKey,
      runtimeModuleRecord?.key,
    ),
  );
  if (explicitRuntimeModuleKey === DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY) {
    return {
      moduleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
      confidence: 1,
      reasonCodes: ["explicit_runtime_module_config"],
    };
  }

  const runtimeModuleMetadata = resolveAgentRuntimeModuleMetadataFromConfig(
    args.authorityConfig,
  );
  if (runtimeModuleMetadata?.key === DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY) {
    return {
      moduleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
      confidence: 1,
      reasonCodes: ["resolved_runtime_module_metadata"],
    };
  }

  const bookingSignal = DER_TERMINMACHER_INTENT_BOOKING_PATTERN.test(messageLower);
  if (bookingSignal) {
    confidence += 0.38;
    reasonCodes.push("booking_intent_signal");
  }
  const planningSignal = DER_TERMINMACHER_INTENT_PLANNING_PATTERN.test(messageLower);
  if (bookingSignal && planningSignal) {
    confidence += 0.06;
    reasonCodes.push("booking_planning_signal");
  }

  const germanSignal = DER_TERMINMACHER_INTENT_GERMAN_PATTERN.test(messageLower);
  if (germanSignal) {
    confidence += 0.12;
    reasonCodes.push("german_language_signal");
  }

  const contactSignal =
    MEETING_CONCIERGE_EMAIL_PATTERN.test(normalizedMessage)
    || MEETING_CONCIERGE_PHONE_PATTERN.test(normalizedMessage);
  if (contactSignal) {
    confidence += 0.18;
    reasonCodes.push("contact_payload_signal");
  }

  const voiceRuntime = normalizeObject(args.metadata.voiceRuntime);
  const cameraRuntime = normalizeObject(args.metadata.cameraRuntime);
  const conversationRuntime = normalizeObject(args.metadata.conversationRuntime);
  const liveSignal = Boolean(
    firstNonEmptyString(args.metadata.liveSessionId) || voiceRuntime || cameraRuntime,
  );
  if (liveSignal) {
    confidence += 0.14;
    reasonCodes.push("live_signal_present");
  }
  if (voiceRuntime) {
    confidence += 0.09;
    reasonCodes.push("voice_runtime_present");
  }
  if (cameraRuntime) {
    confidence += 0.09;
    reasonCodes.push("camera_runtime_present");
  }

  const sourceModeToken = normalizeLowercaseRuntimeToken(
    firstNonEmptyString(
      args.metadata.sourceMode,
      conversationRuntime?.sourceMode,
      cameraRuntime?.sourceClass,
      voiceRuntime?.sourceClass,
    ),
  );
  if (
    sourceModeToken === "meta_glasses"
    || sourceModeToken === "webcam"
    || sourceModeToken === "camera"
  ) {
    confidence += 0.06;
    reasonCodes.push("eyes_source_signal");
  }

  const templateRole = normalizeLowercaseRuntimeToken(args.authorityConfig?.templateRole);
  const displayName = normalizeLowercaseRuntimeToken(
    firstNonEmptyString(args.authorityConfig?.displayName, args.authorityConfig?.name),
  );
  const identityHint =
    templateRole?.includes("terminmacher")
    || displayName?.includes("terminmacher");
  if (identityHint) {
    confidence += 0.1;
    reasonCodes.push("identity_hint_terminmacher");
  }

  if (args.channel === "desktop" || args.channel === "native_guest") {
    confidence += 0.04;
    reasonCodes.push("supported_channel_signal");
  } else {
    confidence -= 0.08;
    reasonCodes.push("unsupported_channel_penalty");
  }

  return {
    moduleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
    confidence: normalizeIntentRoutingConfidence(confidence),
    reasonCodes,
  };
}

export function resolveInboundRuntimeModuleIntentRoute(args: {
  authorityConfig: Record<string, unknown> | null | undefined;
  message: string;
  channel: string;
  metadata: Record<string, unknown>;
}): RuntimeModuleIntentRoutingDecision {
  const authorityRuntimeModule = resolveAgentRuntimeModuleMetadataFromConfig(
    args.authorityConfig,
  );
  const authorityRuntimeModuleKey = normalizeLowercaseRuntimeToken(
    authorityRuntimeModule?.key,
  );
  if (
    authorityRuntimeModuleKey
    && authorityRuntimeModuleKey !== DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY
  ) {
    return {
      contractVersion: RUNTIME_MODULE_INTENT_ROUTER_CONTRACT_VERSION,
      decision: "selected",
      selectedModuleKey: authorityRuntimeModuleKey,
      confidence: 1,
      thresholds: {
        highConfidence: RUNTIME_MODULE_INTENT_ROUTER_HIGH_CONFIDENCE_THRESHOLD,
        ambiguous: RUNTIME_MODULE_INTENT_ROUTER_AMBIGUOUS_THRESHOLD,
      },
      reasonCodes: ["non_routed_runtime_module_locked"],
      candidates: [],
    };
  }

  const derTerminmacherCandidate = scoreDerTerminmacherIntent(args);
  const candidates = [derTerminmacherCandidate];
  if (derTerminmacherCandidate.confidence >= RUNTIME_MODULE_INTENT_ROUTER_HIGH_CONFIDENCE_THRESHOLD) {
    return {
      contractVersion: RUNTIME_MODULE_INTENT_ROUTER_CONTRACT_VERSION,
      decision: "selected",
      selectedModuleKey: derTerminmacherCandidate.moduleKey,
      confidence: derTerminmacherCandidate.confidence,
      thresholds: {
        highConfidence: RUNTIME_MODULE_INTENT_ROUTER_HIGH_CONFIDENCE_THRESHOLD,
        ambiguous: RUNTIME_MODULE_INTENT_ROUTER_AMBIGUOUS_THRESHOLD,
      },
      reasonCodes: derTerminmacherCandidate.reasonCodes,
      candidates,
    };
  }

  if (derTerminmacherCandidate.confidence >= RUNTIME_MODULE_INTENT_ROUTER_AMBIGUOUS_THRESHOLD) {
    return {
      contractVersion: RUNTIME_MODULE_INTENT_ROUTER_CONTRACT_VERSION,
      decision: "clarification_required",
      selectedModuleKey: null,
      confidence: derTerminmacherCandidate.confidence,
      thresholds: {
        highConfidence: RUNTIME_MODULE_INTENT_ROUTER_HIGH_CONFIDENCE_THRESHOLD,
        ambiguous: RUNTIME_MODULE_INTENT_ROUTER_AMBIGUOUS_THRESHOLD,
      },
      clarificationQuestion: DER_TERMINMACHER_INTENT_CLARIFYING_QUESTION,
      reasonCodes: derTerminmacherCandidate.reasonCodes,
      candidates,
    };
  }

  return {
    contractVersion: RUNTIME_MODULE_INTENT_ROUTER_CONTRACT_VERSION,
    decision: "default",
    selectedModuleKey: authorityRuntimeModuleKey ?? null,
    confidence: derTerminmacherCandidate.confidence,
    thresholds: {
      highConfidence: RUNTIME_MODULE_INTENT_ROUTER_HIGH_CONFIDENCE_THRESHOLD,
      ambiguous: RUNTIME_MODULE_INTENT_ROUTER_AMBIGUOUS_THRESHOLD,
    },
    reasonCodes:
      derTerminmacherCandidate.reasonCodes.length > 0
        ? [...derTerminmacherCandidate.reasonCodes, "confidence_below_ambiguity_threshold"]
        : ["no_strong_runtime_module_signal"],
    candidates,
  };
}

export function buildRuntimeModuleIntentRoutingContext(
  decision: RuntimeModuleIntentRoutingDecision
): string | null {
  if (decision.decision === "default" && !decision.selectedModuleKey) {
    return null;
  }

  const lines: string[] = [];
  lines.push(`Decision: ${decision.decision}`);
  lines.push(`Confidence: ${decision.confidence.toFixed(3)}`);
  lines.push(`Selected module: ${decision.selectedModuleKey ?? "none"}`);
  lines.push(
    `Thresholds: high=${decision.thresholds.highConfidence.toFixed(2)}, ambiguous=${decision.thresholds.ambiguous.toFixed(2)}`,
  );
  if (decision.reasonCodes.length > 0) {
    lines.push(`Reason codes: ${decision.reasonCodes.join(", ")}`);
  }
  if (decision.clarificationQuestion) {
    lines.push(`Clarification question: ${decision.clarificationQuestion}`);
  }
  if (decision.candidates.length > 0) {
    for (const candidate of decision.candidates) {
      lines.push(
        `Candidate ${candidate.moduleKey}: confidence=${candidate.confidence.toFixed(3)} reasons=${candidate.reasonCodes.join(", ")}`,
      );
    }
  }

  return [
    "--- RUNTIME MODULE INTENT ROUTING ---",
    lines.join("\n"),
    "--- END RUNTIME MODULE INTENT ROUTING ---",
  ].join("\n");
}

function isDerTerminmacherRuntimeModuleConfig(
  config: Record<string, unknown> | null | undefined
): boolean {
  if (!config || typeof config !== "object") {
    return false;
  }
  const runtimeModule = resolveAgentRuntimeModuleMetadataFromConfig(config);
  if (runtimeModule?.key === DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY) {
    return true;
  }

  const runtimeModuleRecord = normalizeObject(config.runtimeModule);
  const explicitRuntimeModuleKey = normalizeLowercaseRuntimeToken(
    firstNonEmptyString(config.runtimeModuleKey, runtimeModuleRecord?.key),
  );
  if (explicitRuntimeModuleKey === DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY) {
    return true;
  }

  const templateRole = normalizeLowercaseRuntimeToken(config.templateRole);
  if (
    templateRole?.includes("der_terminmacher")
    || templateRole?.includes("terminmacher")
  ) {
    return true;
  }

  const displayName = normalizeLowercaseRuntimeToken(
    firstNonEmptyString(config.displayName, config.name),
  );
  return Boolean(displayName?.includes("terminmacher"));
}

export function resolveDerTerminmacherRuntimeContract(
  config: Record<string, unknown> | null | undefined
): DerTerminmacherRuntimeContract | null {
  if (!isDerTerminmacherRuntimeModuleConfig(config)) {
    return null;
  }

  const runtimeModule =
    config ? resolveAgentRuntimeModuleMetadataFromConfig(config) : null;
  const requiredTools = normalizeDeterministicRuntimeStringArray([
    DER_TERMINMACHER_BOOKING_TOOL_MANIFEST.toolName,
    DER_TERMINMACHER_CRM_TOOL_MANIFEST.toolName,
    ...(runtimeModule?.toolManifest.requiredTools ?? []),
  ]);
  const optionalTools = normalizeDeterministicRuntimeStringArray([
    "query_org_data",
    ...(runtimeModule?.toolManifest.optionalTools ?? []),
  ]).filter((toolName) => !requiredTools.includes(toolName));

  return {
    contractVersion: DER_TERMINMACHER_PROMPT_CONTRACT_VERSION,
    moduleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
    languagePolicy: {
      primary: "de",
      fallback: "en",
      responseMode: "german_first",
    },
    ingressAssumptions: {
      allowedChannels: ["desktop", "native_guest"],
      requireLiveSignal: true,
      preferredSurfaces: ["voice", "camera"],
    },
    toolManifest: {
      contractVersion: DER_TERMINMACHER_TOOL_MANIFEST_CONTRACT_VERSION,
      requiredTools,
      optionalTools,
      deniedTools: normalizeDeterministicRuntimeStringArray(
        runtimeModule?.toolManifest.deniedTools ?? [],
      ),
    },
    mutationPolicy: {
      contractVersion: DER_TERMINMACHER_MUTATION_POLICY_CONTRACT_VERSION,
      modeDefault: "preview",
      previewFirst: true,
      executeRequiresExplicitConfirmation: true,
    },
  };
}
