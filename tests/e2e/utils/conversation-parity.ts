import {
  CONVERSATION_CONTRACT_VERSION as WEB_CONTRACT_VERSION,
  CONVERSATION_EVENT_TYPES as WEB_EVENT_TYPES,
  CONVERSATION_REASON_CODES as WEB_REASON_CODES,
  CONVERSATION_SESSION_STATES as WEB_SESSION_STATES,
  inferConversationReasonCode as inferWebConversationReasonCode,
  type ConversationEventType,
  type ConversationSessionState,
} from "../../../src/lib/ai/conversation-session-contract";
import { mapConversationCapabilityReasonCode } from "../../../src/lib/av/session/mediaSessionContract";
import {
  CONVERSATION_CONTRACT_VERSION as IPHONE_CONTRACT_VERSION,
  CONVERSATION_EVENT_TYPES as IPHONE_EVENT_TYPES,
  CONVERSATION_REASON_CODES as IPHONE_REASON_CODES,
  CONVERSATION_SESSION_STATES as IPHONE_SESSION_STATES,
  inferConversationReasonCode as inferIphoneConversationReasonCode,
} from "../../../apps/operator-mobile/src/lib/voice/lifecycle";
import { mapVisionReadinessReasonToConversationReason } from "../../../apps/operator-mobile/src/lib/av/metaBridge-contracts";

export const CANONICAL_CONVERSATION_MODES = ["voice", "voice_with_eyes"] as const;
export type ConversationMode = (typeof CANONICAL_CONVERSATION_MODES)[number];

type ReasonMapper = "runtime" | "eyes_source";
type ParityScenario = "permission-denied" | "reconnect" | "source-drop-degrade" | "dat-unavailable-fallback";

type ParityScenarioDefinition = {
  mode: ConversationMode;
  state: ConversationSessionState;
  scenario: ParityScenario;
  eventType: ConversationEventType;
  reasonInput: string;
  reasonMapper: ReasonMapper;
};

export type CrossSurfaceParityMatrixRow = {
  mode: ConversationMode;
  state: ConversationSessionState;
  scenario: ParityScenario;
  eventType: ConversationEventType;
  reasonCode: string;
};

const PARITY_SCENARIOS: ReadonlyArray<ParityScenarioDefinition> = [
  {
    mode: "voice",
    state: "error",
    scenario: "permission-denied",
    eventType: "conversation_permission_denied",
    reasonInput: "NotAllowedError: microphone denied",
    reasonMapper: "runtime",
  },
  {
    mode: "voice",
    state: "reconnecting",
    scenario: "reconnect",
    eventType: "conversation_reconnecting",
    reasonInput: "websocket dropped",
    reasonMapper: "runtime",
  },
  {
    mode: "voice_with_eyes",
    state: "live",
    scenario: "source-drop-degrade",
    eventType: "conversation_degraded_to_voice",
    reasonInput: "meta_bridge_not_connected",
    reasonMapper: "eyes_source",
  },
  {
    mode: "voice_with_eyes",
    state: "error",
    scenario: "dat-unavailable-fallback",
    eventType: "conversation_error",
    reasonInput: "meta_bridge_dat_sdk_unavailable",
    reasonMapper: "eyes_source",
  },
];

type TimelineStep = {
  eventType: ConversationEventType;
  state: ConversationSessionState;
  reasonCode?: string;
};

export type ExecutionLaneInvariant = {
  mode: ConversationMode;
  approvalInvariant: "non_bypassable";
  mcpRoute: "session_scoped_mcp";
  mcpEnabled: boolean;
  handoffSupported: boolean;
};

export interface CrossSurfaceConversationParityGate {
  contractVersion: {
    webDesktop: typeof WEB_CONTRACT_VERSION;
    iphone: typeof IPHONE_CONTRACT_VERSION;
  };
  modeTaxonomy: ReadonlyArray<ConversationMode>;
  stateTaxonomy: {
    webDesktop: ReadonlyArray<string>;
    iphone: ReadonlyArray<string>;
  };
  eventTaxonomy: {
    webDesktop: ReadonlyArray<string>;
    iphone: ReadonlyArray<string>;
  };
  reasonTaxonomy: {
    webDesktop: ReadonlyArray<string>;
    iphone: ReadonlyArray<string>;
  };
  eventReasonMatrix: {
    webDesktop: ReadonlyArray<CrossSurfaceParityMatrixRow>;
    iphone: ReadonlyArray<CrossSurfaceParityMatrixRow>;
  };
  stateTimelineBySurface: {
    webDesktop: Record<ConversationMode, ReadonlyArray<TimelineStep>>;
    iphone: Record<ConversationMode, ReadonlyArray<TimelineStep>>;
  };
  executionLaneInvariantBySurface: {
    webDesktop: Record<ConversationMode, ExecutionLaneInvariant>;
    iphone: Record<ConversationMode, ExecutionLaneInvariant>;
  };
}

function mapWebReasonCode(definition: ParityScenarioDefinition): string {
  if (definition.reasonMapper === "runtime") {
    return inferWebConversationReasonCode(definition.reasonInput);
  }
  return mapConversationCapabilityReasonCode(definition.reasonInput);
}

function mapIphoneReasonCode(definition: ParityScenarioDefinition): string {
  if (definition.reasonMapper === "runtime") {
    return inferIphoneConversationReasonCode(definition.reasonInput);
  }
  return mapVisionReadinessReasonToConversationReason(definition.reasonInput);
}

function buildStateTimeline(rows: ReadonlyArray<CrossSurfaceParityMatrixRow>) {
  const reconnectReason = rows.find((row) => row.scenario === "reconnect")?.reasonCode || "transport_failed";
  const degradeReason = rows.find((row) => row.scenario === "source-drop-degrade")?.reasonCode || "device_unavailable";

  return {
    voice: [
      { eventType: "conversation_start_requested", state: "idle" },
      { eventType: "conversation_connecting", state: "connecting" },
      { eventType: "conversation_live", state: "live" },
      { eventType: "conversation_reconnecting", state: "reconnecting", reasonCode: reconnectReason },
      { eventType: "conversation_live", state: "live" },
      { eventType: "conversation_ending", state: "ending" },
      { eventType: "conversation_ended", state: "ended" },
    ] as const,
    voice_with_eyes: [
      { eventType: "conversation_start_requested", state: "idle" },
      { eventType: "conversation_connecting", state: "connecting" },
      { eventType: "conversation_live", state: "live" },
      { eventType: "conversation_eyes_source_changed", state: "live" },
      { eventType: "conversation_degraded_to_voice", state: "live", reasonCode: degradeReason },
      { eventType: "conversation_reconnecting", state: "reconnecting", reasonCode: reconnectReason },
      { eventType: "conversation_live", state: "live" },
      { eventType: "conversation_ending", state: "ending" },
      { eventType: "conversation_ended", state: "ended" },
    ] as const,
  };
}

function buildExecutionLaneInvariantByMode(): Record<ConversationMode, ExecutionLaneInvariant> {
  return {
    voice: {
      mode: "voice",
      approvalInvariant: "non_bypassable",
      mcpRoute: "session_scoped_mcp",
      mcpEnabled: true,
      handoffSupported: true,
    },
    voice_with_eyes: {
      mode: "voice_with_eyes",
      approvalInvariant: "non_bypassable",
      mcpRoute: "session_scoped_mcp",
      mcpEnabled: true,
      handoffSupported: true,
    },
  };
}

export function buildCrossSurfaceConversationParityGate(): CrossSurfaceConversationParityGate {
  const webDesktopMatrix = PARITY_SCENARIOS.map((definition) => ({
    mode: definition.mode,
    state: definition.state,
    scenario: definition.scenario,
    eventType: definition.eventType,
    reasonCode: mapWebReasonCode(definition),
  }));
  const iphoneMatrix = PARITY_SCENARIOS.map((definition) => ({
    mode: definition.mode,
    state: definition.state,
    scenario: definition.scenario,
    eventType: definition.eventType,
    reasonCode: mapIphoneReasonCode(definition),
  }));

  return {
    contractVersion: {
      webDesktop: WEB_CONTRACT_VERSION,
      iphone: IPHONE_CONTRACT_VERSION,
    },
    modeTaxonomy: CANONICAL_CONVERSATION_MODES,
    stateTaxonomy: {
      webDesktop: WEB_SESSION_STATES,
      iphone: IPHONE_SESSION_STATES,
    },
    eventTaxonomy: {
      webDesktop: WEB_EVENT_TYPES,
      iphone: IPHONE_EVENT_TYPES,
    },
    reasonTaxonomy: {
      webDesktop: WEB_REASON_CODES,
      iphone: IPHONE_REASON_CODES,
    },
    eventReasonMatrix: {
      webDesktop: webDesktopMatrix,
      iphone: iphoneMatrix,
    },
    stateTimelineBySurface: {
      webDesktop: buildStateTimeline(webDesktopMatrix),
      iphone: buildStateTimeline(iphoneMatrix),
    },
    executionLaneInvariantBySurface: {
      webDesktop: buildExecutionLaneInvariantByMode(),
      iphone: buildExecutionLaneInvariantByMode(),
    },
  };
}
