import {
  DER_TERMINMACHER_BOOKING_TOOL_MANIFEST,
  MEETING_CONCIERGE_STAGE_CONTRACT_VERSION,
  MEETING_CONCIERGE_STAGE_SEQUENCE,
  ORG_BOOKING_CONCIERGE_TOOL_ACTION,
  isBookingConciergeToolAction,
} from "../../tools/bookingTool";
import { DER_TERMINMACHER_CRM_TOOL_MANIFEST } from "../../tools/crmTool";
import { MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION } from "../../mobileRuntimeHardening";
import type { AgentToolResult } from "../../agentToolOrchestration";
import type {
  DerTerminmacherRuntimeContract,
} from "./runtimeModule";
import type { InboundMeetingConciergeIntent } from "./meetingConcierge";

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export type DerTerminmacherMeetingConciergeIntentLike = InboundMeetingConciergeIntent;

export interface MeetingConciergeStageContractTelemetry {
  present: boolean;
  valid: boolean;
  contractVersion: string | null;
  mode: "preview" | "execute" | null;
  terminalStage: string | null;
  terminalOutcome: "success" | "blocked" | null;
  validationError: string | null;
  stages: Array<{
    stage: string;
    status: string;
    outcomeCode: string;
    failClosed: boolean;
  }>;
}

export interface MeetingConciergeDecisionTelemetry {
  decision:
    | "not_applicable"
    | "preview_success"
    | "execute_success"
    | "pending_approval"
    | "blocked_missing_required_fields"
    | "blocked_command_policy"
    | "blocked_explicit_confirmation"
    | "blocked_source_attestation"
    | "blocked_unknown";
  decisionReasonCodes: string[];
  ingestLatencyMs: number | null;
  runtimeLatencyMs: number;
  endToEndLatencyMs: number | null;
  latencyTargetMs: number;
  latencyTargetBreached: boolean | null;
  demoOutcomeTargetMs: number;
  demoOutcomeTargetBreached: boolean | null;
  demoOutcomeBreachReasons: Array<
    | "demo_outcome_target_exceeded"
    | "demo_outcome_ingest_budget_exceeded"
    | "demo_outcome_runtime_budget_exceeded"
    | "demo_outcome_ingest_latency_missing"
  >;
  latencyContract: {
    contractVersion: "meeting_concierge_latency_contract_v1";
    telemetryTargetMs: number;
    telemetryTargetBreached: boolean | null;
    demoOutcomeTargetMs: number;
    demoOutcomeIngestBudgetMs: number;
    demoOutcomeRuntimeBudgetMs: number;
    demoOutcomeTargetBreached: boolean | null;
    demoOutcomeBreachReasons: Array<
      | "demo_outcome_target_exceeded"
      | "demo_outcome_ingest_budget_exceeded"
      | "demo_outcome_runtime_budget_exceeded"
      | "demo_outcome_ingest_latency_missing"
    >;
  };
  payloadFieldCoverage: {
    requiredTotal: number;
    requiredPresent: number;
    optionalPresent: number;
  };
  toolInvocation: {
    attempted: boolean;
    status: string | null;
    success: boolean;
    mode: "preview" | "execute" | null;
    error: string | null;
  };
  stageContract: MeetingConciergeStageContractTelemetry;
}

export function enforceDerTerminmacherPreviewFirstToolPolicy(args: {
  toolCalls: Array<Record<string, unknown>>;
  runtimeContract: DerTerminmacherRuntimeContract | null | undefined;
  explicitConfirmDetected: boolean;
}): Array<Record<string, unknown>> {
  if (!args.runtimeContract || args.toolCalls.length === 0) {
    return args.toolCalls;
  }
  const previewFirstTools: Set<string> = new Set(
    args.runtimeContract.toolManifest.requiredTools.filter(
      (toolName) =>
        toolName === DER_TERMINMACHER_BOOKING_TOOL_MANIFEST.toolName
        || toolName === DER_TERMINMACHER_CRM_TOOL_MANIFEST.toolName,
    ),
  );
  if (previewFirstTools.size === 0) {
    return args.toolCalls;
  }

  return args.toolCalls.map((toolCall) => {
    const functionRecord =
      toolCall.function && typeof toolCall.function === "object"
        ? (toolCall.function as Record<string, unknown>)
        : null;
    const toolName = normalizeOptionalString(functionRecord?.name);
    if (!toolName || !previewFirstTools.has(toolName)) {
      return toolCall;
    }
    const rawArguments = functionRecord?.arguments;
    if (typeof rawArguments !== "string") {
      return toolCall;
    }

    try {
      const parsedArgs = JSON.parse(rawArguments) as Record<string, unknown>;
      const mode = normalizeOptionalString(parsedArgs.mode);
      if (args.explicitConfirmDetected && mode === "execute") {
        return toolCall;
      }
      if (mode === "preview") {
        return toolCall;
      }
      parsedArgs.mode = "preview";
      return {
        ...toolCall,
        function: {
          ...functionRecord,
          arguments: JSON.stringify(parsedArgs),
        },
      };
    } catch {
      return toolCall;
    }
  });
}

export function buildInboundMeetingConciergeRuntimeContext(
  intent: DerTerminmacherMeetingConciergeIntentLike,
): string | null {
  if (!intent.enabled) {
    return null;
  }

  const derTerminmacherRuntimeActive =
    intent.runtimeModuleKey === "der_terminmacher_runtime_module_v1";
  const lines: string[] = [];
  lines.push("Mobile live concierge context detected (voice/camera ingress).");
  if (derTerminmacherRuntimeActive) {
    lines.push(
      "Der Terminmacher runtime active: respond in German first, fall back to English only when explicitly requested.",
    );
    lines.push(
      "Ingress assumptions: live voice+camera metadata is preferred; missing channels must be treated as degraded context.",
    );
  }
  lines.push("Guardrail: run preview first before any mutating booking execution.");
  lines.push(
    "Guardrail: execute mode requires explicit user confirmation and approval-gated mutation.",
  );
  if (intent.sourceAttestation.verificationRequired) {
    lines.push(
      `Source attestation: ${intent.sourceAttestation.verified ? "verified" : "quarantined"} (${intent.sourceAttestation.verificationStatus}).`,
    );
  }
  if (intent.transportSessionAttestation.required) {
    lines.push(
      `Transport/session attestation: ${intent.transportSessionAttestation.verified ? "verified" : "quarantined"} (${intent.transportSessionAttestation.status}).`,
    );
  }
  lines.push(
    `Node command policy (${MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION}): ${intent.commandPolicy.status}.`,
  );
  if (!intent.commandPolicy.allowed) {
    lines.push(
      `Node command policy blocked execution (${intent.commandPolicy.reasonCode}) and runtime remains fail-closed.`,
    );
  }

  if (intent.payload) {
    lines.push("Extracted concierge payload candidate:");
    lines.push(JSON.stringify(intent.payload));
  }
  if (intent.missingRequiredFields.length > 0) {
    lines.push(
      `Missing required fields: ${intent.missingRequiredFields.join(", ")}. Ask the user for these fields before booking.`,
    );
  } else {
    lines.push(
      `When appropriate, call manage_bookings with action=${ORG_BOOKING_CONCIERGE_TOOL_ACTION} and mode=preview.`,
    );
    lines.push(
      "Use native booking engine availability and booking mutations for booking writes; do not route booking writes through provider-specific APIs.",
    );
  }
  if (intent.fallbackReasons.length > 0) {
    lines.push(`Fallback signals: ${intent.fallbackReasons.join(", ")}.`);
  }
  if (typeof intent.ingestLatencyMs === "number") {
    lines.push(`Ingress latency estimate: ${intent.ingestLatencyMs}ms.`);
  }

  return [
    "--- MOBILE MEETING CONCIERGE CONTEXT ---",
    lines.join("\n"),
    "--- END MOBILE MEETING CONCIERGE CONTEXT ---",
  ].join("\n");
}

function resolveMeetingConciergeStageContractTelemetry(
  meetingToolResult: AgentToolResult | null,
): MeetingConciergeStageContractTelemetry {
  const emptyTelemetry: MeetingConciergeStageContractTelemetry = {
    present: false,
    valid: false,
    contractVersion: null,
    mode: null,
    terminalStage: null,
    terminalOutcome: null,
    validationError: null,
    stages: [],
  };
  if (
    !meetingToolResult?.result ||
    typeof meetingToolResult.result !== "object" ||
    Array.isArray(meetingToolResult.result)
  ) {
    return emptyTelemetry;
  }

  const resultRecord = meetingToolResult.result as Record<string, unknown>;
  if (
    !isBookingConciergeToolAction(
      normalizeOptionalString(resultRecord.action),
    )
  ) {
    return emptyTelemetry;
  }

  const dataRecord =
    resultRecord.data &&
    typeof resultRecord.data === "object" &&
    !Array.isArray(resultRecord.data)
      ? (resultRecord.data as Record<string, unknown>)
      : null;
  const stageContractRecord =
    dataRecord?.stageContract &&
    typeof dataRecord.stageContract === "object" &&
    !Array.isArray(dataRecord.stageContract)
      ? (dataRecord.stageContract as Record<string, unknown>)
      : null;
  if (!stageContractRecord) {
    return {
      ...emptyTelemetry,
      validationError: "missing_stage_contract",
    };
  }

  const contractVersion =
    normalizeOptionalString(stageContractRecord.contractVersion) ?? null;
  const contractMode = normalizeOptionalString(stageContractRecord.mode);
  const normalizedMode =
    contractMode === "preview" || contractMode === "execute" ? contractMode : null;
  const terminalStage =
    normalizeOptionalString(stageContractRecord.terminalStage) ?? null;
  const terminalOutcomeRaw = normalizeOptionalString(
    stageContractRecord.terminalOutcome,
  );
  const terminalOutcome =
    terminalOutcomeRaw === "success" || terminalOutcomeRaw === "blocked"
      ? terminalOutcomeRaw
      : null;
  const stageEntries = Array.isArray(stageContractRecord.stages)
    ? stageContractRecord.stages
    : [];
  const normalizedStages = stageEntries
    .map((stageEntry) => {
      if (!stageEntry || typeof stageEntry !== "object" || Array.isArray(stageEntry)) {
        return null;
      }
      const stageRecord = stageEntry as Record<string, unknown>;
      const stageName = normalizeOptionalString(stageRecord.stage);
      const status = normalizeOptionalString(stageRecord.status);
      const outcomeCode = normalizeOptionalString(stageRecord.outcomeCode);
      if (!stageName || !status || !outcomeCode) {
        return null;
      }
      return {
        stage: stageName,
        status,
        outcomeCode,
        failClosed: stageRecord.failClosed === true,
      };
    })
    .filter(
      (
        stage,
      ): stage is {
        stage: string;
        status: string;
        outcomeCode: string;
        failClosed: boolean;
      } => Boolean(stage),
    );
  const expectedStages = [...MEETING_CONCIERGE_STAGE_SEQUENCE];
  const flowEntries = Array.isArray(stageContractRecord.flow)
    ? stageContractRecord.flow
      .map((stage) => normalizeOptionalString(stage))
      .filter((stage): stage is string => Boolean(stage))
    : [];
  const flowValid =
    flowEntries.length === expectedStages.length &&
    flowEntries.every((stage, index) => stage === expectedStages[index]);
  const stageOrderValid =
    normalizedStages.length === expectedStages.length &&
    normalizedStages.every(
      (stage, index) =>
        stage.stage === expectedStages[index] &&
        (stage.status === "success" ||
          stage.status === "blocked" ||
          stage.status === "skipped"),
    );

  if (contractVersion !== MEETING_CONCIERGE_STAGE_CONTRACT_VERSION) {
    return {
      ...emptyTelemetry,
      present: true,
      contractVersion,
      mode: normalizedMode,
      terminalStage,
      terminalOutcome,
      stages: normalizedStages,
      validationError: "contract_version_mismatch",
    };
  }
  if (!normalizedMode) {
    return {
      ...emptyTelemetry,
      present: true,
      contractVersion,
      terminalStage,
      terminalOutcome,
      stages: normalizedStages,
      validationError: "mode_invalid",
    };
  }
  if (!flowValid) {
    return {
      ...emptyTelemetry,
      present: true,
      contractVersion,
      mode: normalizedMode,
      terminalStage,
      terminalOutcome,
      stages: normalizedStages,
      validationError: "flow_invalid",
    };
  }
  if (!stageOrderValid) {
    return {
      ...emptyTelemetry,
      present: true,
      contractVersion,
      mode: normalizedMode,
      terminalStage,
      terminalOutcome,
      stages: normalizedStages,
      validationError: "stage_order_invalid",
    };
  }
  if (!terminalStage || !expectedStages.includes(terminalStage as typeof expectedStages[number])) {
    return {
      ...emptyTelemetry,
      present: true,
      contractVersion,
      mode: normalizedMode,
      terminalStage,
      terminalOutcome,
      stages: normalizedStages,
      validationError: "terminal_stage_invalid",
    };
  }
  if (!terminalOutcome) {
    return {
      ...emptyTelemetry,
      present: true,
      contractVersion,
      mode: normalizedMode,
      terminalStage,
      stages: normalizedStages,
      validationError: "terminal_outcome_invalid",
    };
  }

  const terminalStageRecord =
    normalizedStages.find((stage) => stage.stage === terminalStage) ?? null;
  if (!terminalStageRecord) {
    return {
      ...emptyTelemetry,
      present: true,
      contractVersion,
      mode: normalizedMode,
      terminalStage,
      terminalOutcome,
      stages: normalizedStages,
      validationError: "terminal_stage_missing",
    };
  }
  if (
    (terminalOutcome === "success" && terminalStageRecord.status !== "success") ||
    (terminalOutcome === "blocked" && terminalStageRecord.status !== "blocked")
  ) {
    return {
      ...emptyTelemetry,
      present: true,
      contractVersion,
      mode: normalizedMode,
      terminalStage,
      terminalOutcome,
      stages: normalizedStages,
      validationError: "terminal_status_mismatch",
    };
  }

  return {
    present: true,
    valid: true,
    contractVersion,
    mode: normalizedMode,
    terminalStage,
    terminalOutcome,
    validationError: null,
    stages: normalizedStages,
  };
}

export function buildMeetingConciergeDecisionTelemetry(args: {
  intent: DerTerminmacherMeetingConciergeIntentLike;
  toolResults: AgentToolResult[];
  runtimeElapsedMs: number;
  latencyTargetMs?: number;
  demoOutcomeTargetMs?: number;
  demoOutcomeIngestBudgetMs?: number;
}): MeetingConciergeDecisionTelemetry {
  const telemetryLatencyTargetMs =
    typeof args.latencyTargetMs === "number" && Number.isFinite(args.latencyTargetMs)
      ? Math.max(1, Math.floor(args.latencyTargetMs))
      : 60_000;
  const demoOutcomeTargetMs =
    typeof args.demoOutcomeTargetMs === "number" && Number.isFinite(args.demoOutcomeTargetMs)
      ? Math.max(1, Math.floor(args.demoOutcomeTargetMs))
      : 20_000;
  const demoOutcomeIngestBudgetMs =
    typeof args.demoOutcomeIngestBudgetMs === "number"
      && Number.isFinite(args.demoOutcomeIngestBudgetMs)
      ? Math.max(1, Math.floor(args.demoOutcomeIngestBudgetMs))
      : 4_000;
  const normalizedRuntimeElapsedMs = Math.max(
    0,
    Number.isFinite(args.runtimeElapsedMs) ? Math.floor(args.runtimeElapsedMs) : 0,
  );
  const ingestLatencyMs =
    typeof args.intent.ingestLatencyMs === "number"
      ? Math.max(0, Math.floor(args.intent.ingestLatencyMs))
      : null;
  const endToEndLatencyMs =
    ingestLatencyMs === null
      ? null
      : ingestLatencyMs + normalizedRuntimeElapsedMs;
  const normalizedDemoOutcomeIngestBudgetMs = Math.min(
    demoOutcomeTargetMs,
    demoOutcomeIngestBudgetMs,
  );
  const normalizedDemoOutcomeRuntimeBudgetMs = Math.max(
    1,
    demoOutcomeTargetMs - normalizedDemoOutcomeIngestBudgetMs,
  );
  const latencyTargetBreached =
    endToEndLatencyMs === null
      ? null
      : endToEndLatencyMs > telemetryLatencyTargetMs;
  const demoOutcomeTargetBreached =
    endToEndLatencyMs === null ? null : endToEndLatencyMs > demoOutcomeTargetMs;
  const demoOutcomeBreachReasons: Array<
    | "demo_outcome_target_exceeded"
    | "demo_outcome_ingest_budget_exceeded"
    | "demo_outcome_runtime_budget_exceeded"
    | "demo_outcome_ingest_latency_missing"
  > = [];
  if (demoOutcomeTargetBreached) {
    demoOutcomeBreachReasons.push("demo_outcome_target_exceeded");
    if (ingestLatencyMs === null) {
      demoOutcomeBreachReasons.push("demo_outcome_ingest_latency_missing");
    } else if (ingestLatencyMs > normalizedDemoOutcomeIngestBudgetMs) {
      demoOutcomeBreachReasons.push("demo_outcome_ingest_budget_exceeded");
    }
    if (normalizedRuntimeElapsedMs > normalizedDemoOutcomeRuntimeBudgetMs) {
      demoOutcomeBreachReasons.push("demo_outcome_runtime_budget_exceeded");
    }
  }
  const latencyContract = {
    contractVersion: "meeting_concierge_latency_contract_v1" as const,
    telemetryTargetMs: telemetryLatencyTargetMs,
    telemetryTargetBreached: latencyTargetBreached,
    demoOutcomeTargetMs,
    demoOutcomeIngestBudgetMs: normalizedDemoOutcomeIngestBudgetMs,
    demoOutcomeRuntimeBudgetMs: normalizedDemoOutcomeRuntimeBudgetMs,
    demoOutcomeTargetBreached,
    demoOutcomeBreachReasons,
  };

  const requiredTotal = 1;
  const requiredPresent =
    (args.intent.payload?.personEmail &&
      args.intent.payload.personEmail.trim().length > 0) ||
      (args.intent.payload?.personPhone &&
        args.intent.payload.personPhone.trim().length > 0)
      ? 1
      : 0;
  const optionalPresent = [
    args.intent.payload?.personName,
    args.intent.payload?.personPhone,
    args.intent.payload?.company,
    args.intent.payload?.meetingTitle,
    args.intent.payload?.confirmationRecipient,
  ].filter((value) => typeof value === "string" && value.trim().length > 0).length;

  const meetingToolResult =
    args.toolResults.find((result) => result.tool === "manage_bookings") ?? null;
  const toolStatus = meetingToolResult?.status ?? null;
  const toolSuccess = toolStatus === "success";
  const toolError = meetingToolResult?.error ?? null;
  const rawMode =
    (meetingToolResult?.result &&
      typeof meetingToolResult.result === "object" &&
      "mode" in (meetingToolResult.result as Record<string, unknown>))
      ? (meetingToolResult.result as { mode?: unknown }).mode
      : null;
  const mode =
    rawMode === "preview" || rawMode === "execute"
      ? rawMode
      : null;
  const stageContractTelemetry =
    resolveMeetingConciergeStageContractTelemetry(meetingToolResult);

  const decisionReasonCodes = Array.from(
    new Set([
      ...args.intent.fallbackReasons,
      ...args.intent.missingRequiredFields.map((field) => `missing:${field}`),
      ...(stageContractTelemetry.validationError
        ? [`stage_contract:${stageContractTelemetry.validationError}`]
        : []),
      ...(stageContractTelemetry.terminalOutcome === "blocked" &&
      stageContractTelemetry.terminalStage
        ? [
          `stage_blocked:${stageContractTelemetry.terminalStage}:${stageContractTelemetry.stages.find(
            (stage) => stage.stage === stageContractTelemetry.terminalStage,
          )?.outcomeCode || "unknown"}`,
        ]
        : []),
    ]),
  );

  const commandPolicyBlocked =
    args.intent.commandPolicy.policyRequired && !args.intent.commandPolicy.allowed;
  const sourceAttestationBlocked =
    decisionReasonCodes.includes("source_metadata_quarantined")
    || decisionReasonCodes.includes("transport_session_metadata_quarantined")
    || decisionReasonCodes.includes("meta_source_attestation_missing_or_unverified")
    || decisionReasonCodes.some(
      (reason) =>
        reason.startsWith("source_attestation:")
        || reason.startsWith("transport_session_attestation:"),
    );
  const explicitConfirmationBlocked =
    typeof toolError === "string"
    && toolError.toLowerCase().includes("explicit operator confirmation");

  if (!args.intent.enabled) {
    return {
      decision: "not_applicable",
      decisionReasonCodes,
      ingestLatencyMs,
      runtimeLatencyMs: normalizedRuntimeElapsedMs,
      endToEndLatencyMs,
      latencyTargetMs: telemetryLatencyTargetMs,
      latencyTargetBreached,
      demoOutcomeTargetMs,
      demoOutcomeTargetBreached,
      demoOutcomeBreachReasons,
      latencyContract,
      payloadFieldCoverage: { requiredTotal, requiredPresent, optionalPresent },
      toolInvocation: {
        attempted: false,
        status: null,
        success: false,
        mode: null,
        error: null,
      },
      stageContract: stageContractTelemetry,
    };
  }

  let decision:
    | "preview_success"
    | "execute_success"
    | "pending_approval"
    | "blocked_missing_required_fields"
    | "blocked_command_policy"
    | "blocked_explicit_confirmation"
    | "blocked_source_attestation"
    | "blocked_unknown";
  const stageContractSuccess =
    stageContractTelemetry.valid &&
    stageContractTelemetry.terminalOutcome === "success";
  if (toolSuccess && mode === "execute" && stageContractSuccess) {
    decision = "execute_success";
  } else if (toolSuccess && stageContractSuccess) {
    decision = "preview_success";
  } else if (toolStatus === "pending_approval") {
    decision = "pending_approval";
  } else if (explicitConfirmationBlocked) {
    decision = "blocked_explicit_confirmation";
  } else if (commandPolicyBlocked) {
    decision = "blocked_command_policy";
  } else if (args.intent.missingRequiredFields.length > 0) {
    decision = "blocked_missing_required_fields";
  } else if (sourceAttestationBlocked) {
    decision = "blocked_source_attestation";
  } else {
    decision = "blocked_unknown";
  }

  return {
    decision,
    decisionReasonCodes,
    ingestLatencyMs,
    runtimeLatencyMs: normalizedRuntimeElapsedMs,
    endToEndLatencyMs,
    latencyTargetMs: telemetryLatencyTargetMs,
    latencyTargetBreached,
    demoOutcomeTargetMs,
    demoOutcomeTargetBreached,
    demoOutcomeBreachReasons,
    latencyContract,
    payloadFieldCoverage: { requiredTotal, requiredPresent, optionalPresent },
    toolInvocation: {
      attempted: meetingToolResult !== null,
      status: toolStatus,
      success: toolSuccess,
      mode,
      error: toolError,
    },
    stageContract: stageContractTelemetry,
  };
}
