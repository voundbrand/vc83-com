import { resolveSamanthaRoutingAgentSnapshot } from "./policy";

export interface SamanthaRuntimeRoutingAgentSnapshot {
  agentId: string | null;
  displayName: string | null;
  templateRole: string | null;
  subtype: string | null;
  runtimeModuleKey: string | null;
  isSamanthaRuntime: boolean;
}

export interface SamanthaRuntimeRouterSelectionStage {
  stage: string;
  source: string;
  agentId: string | null;
  displayName: string | null;
  templateRole: string | null;
  subtype: string | null;
  runtimeModuleKey: string | null;
  isSamanthaRuntime: boolean;
}

export interface SamanthaRuntimeDispatchTraceEvent {
  stage: string;
  status: "pass" | "skip" | "fail";
  reasonCode: string;
  detail?: Record<string, unknown>;
  atMs: number;
}

export interface SamanthaRuntimeDispatchEventInput {
  stage: string;
  status: "pass" | "skip" | "fail";
  reasonCode: string;
  detail?: Record<string, unknown>;
}

interface SamanthaTraceLogPayload {
  correlationId: string | null;
  organizationId: string;
  channel: string;
  stage: string;
  status: "pass" | "skip" | "fail";
  reasonCode: string;
  detail?: Record<string, unknown>;
}

export interface SamanthaDispatchTraceScaffolding {
  samanthaDispatchTraceEvents: SamanthaRuntimeDispatchTraceEvent[];
  samanthaDispatchRouterSelectionPath: SamanthaRuntimeRouterSelectionStage[];
  recordSamanthaDispatchEvent: (event: SamanthaRuntimeDispatchEventInput) => void;
  recordSamanthaRouterSelectionStage: (
    stage: string,
    source: string,
    selectedAgent: unknown,
  ) => void;
  setSamanthaDispatchTraceCorrelationId: (
    correlationId: string | null | undefined,
  ) => void;
  getSamanthaDispatchTraceCorrelationId: () => string | undefined;
}

export function createSamanthaDispatchTraceScaffolding(args: {
  organizationId: string;
  channel: string;
  shouldEmitConsoleTrace: boolean;
  initialCorrelationId?: string | null;
  now?: () => number;
  emitConsoleTrace?: (message: string, payload: SamanthaTraceLogPayload) => void;
}): SamanthaDispatchTraceScaffolding {
  const now = args.now ?? (() => Date.now());
  const emitConsoleTrace = args.emitConsoleTrace ?? ((message, payload) => {
    console.info(message, payload);
  });
  let samanthaDispatchTraceCorrelationId =
    args.initialCorrelationId ?? undefined;
  const samanthaDispatchTraceStartedAt = now();
  const samanthaDispatchTraceEvents: SamanthaRuntimeDispatchTraceEvent[] = [];
  const samanthaDispatchRouterSelectionPath: SamanthaRuntimeRouterSelectionStage[] = [];

  const recordSamanthaDispatchEvent = (event: SamanthaRuntimeDispatchEventInput) => {
    const tracedEvent: SamanthaRuntimeDispatchTraceEvent = {
      ...event,
      atMs: now() - samanthaDispatchTraceStartedAt,
    };
    samanthaDispatchTraceEvents.push(tracedEvent);
    if (args.shouldEmitConsoleTrace) {
      emitConsoleTrace("[AgentExecution][SamanthaDispatchTrace]", {
        correlationId: samanthaDispatchTraceCorrelationId ?? null,
        organizationId: args.organizationId,
        channel: args.channel,
        stage: tracedEvent.stage,
        status: tracedEvent.status,
        reasonCode: tracedEvent.reasonCode,
        detail: tracedEvent.detail,
      });
    }
  };

  const recordSamanthaRouterSelectionStage = (
    stage: string,
    source: string,
    selectedAgent: unknown,
  ) => {
    const snapshot = resolveSamanthaRoutingAgentSnapshot(selectedAgent);
    samanthaDispatchRouterSelectionPath.push({
      stage,
      source,
      ...snapshot,
    });
    recordSamanthaDispatchEvent({
      stage,
      status: snapshot.agentId ? "pass" : "skip",
      reasonCode: snapshot.agentId ? source : `${source}_unresolved`,
      detail: {
        agentId: snapshot.agentId,
        displayName: snapshot.displayName,
        templateRole: snapshot.templateRole,
        runtimeModuleKey: snapshot.runtimeModuleKey,
        isSamanthaRuntime: snapshot.isSamanthaRuntime,
        subtype: snapshot.subtype,
      },
    });
  };

  return {
    samanthaDispatchTraceEvents,
    samanthaDispatchRouterSelectionPath,
    recordSamanthaDispatchEvent,
    recordSamanthaRouterSelectionStage,
    setSamanthaDispatchTraceCorrelationId: (correlationId) => {
      samanthaDispatchTraceCorrelationId = correlationId ?? undefined;
    },
    getSamanthaDispatchTraceCorrelationId: () =>
      samanthaDispatchTraceCorrelationId,
  };
}
