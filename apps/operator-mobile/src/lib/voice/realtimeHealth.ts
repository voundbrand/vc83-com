export type MobileRealtimeRelayHealthReasonCode =
  | 'relay_healthy'
  | 'socket_disconnected'
  | 'relay_ingest_failures'
  | 'relay_ack_pending'
  | 'relay_ack_stale'
  | 'relay_server_qos_missing'
  | 'relay_server_qos_contract_mismatch'
  | 'relay_server_heartbeat_contract_mismatch'
  | 'relay_server_heartbeat_sequence_gap'
  | 'relay_server_heartbeat_stall_timeout'
  | 'relay_server_qos_unhealthy'
  | 'relay_server_ack_missing'
  | 'relay_server_heartbeat_stale';

export const MOBILE_VOICE_RELAY_QOS_CONTRACT_VERSION =
  'voice_relay_qos_v1' as const;
export const MOBILE_VOICE_RELAY_HEARTBEAT_CONTRACT_VERSION =
  'voice_relay_heartbeat_v1' as const;

export type MobileRealtimeRelayContractVersionStatus =
  | 'ok'
  | 'missing'
  | 'mismatch';

export type MobileRealtimeRelayServerQosSnapshot = {
  contractVersion: string;
  observedAtMs: number;
  healthy: boolean;
  reasonCode: string;
  heartbeat: {
    contractVersion?: string;
    status: 'acknowledged' | 'missing';
    expectedSequence: number;
    ackSequence?: number;
    acknowledgedAtMs?: number;
  };
  qos?: {
    orderingDecision?: string;
    relayEventCount?: number;
    idempotentReplay?: boolean;
    persistedFinalTranscript?: boolean;
  };
};

export type MobileRealtimeRelayHealth = {
  healthy: boolean;
  reasonCode: MobileRealtimeRelayHealthReasonCode;
  evaluatedAtMs: number;
  lastIngestAttemptAtMs?: number;
  lastIngestAckAtMs?: number;
  consecutiveIngestFailures: number;
  serverRelayHeartbeatSequenceGap?: number;
  serverRelayHeartbeatAckAgeMs?: number;
  serverRelayReasonCode?: string;
  serverRelayQosAgeMs?: number;
  serverRelayContractVersionStatus?: MobileRealtimeRelayContractVersionStatus;
  serverRelayHeartbeatContractVersionStatus?: MobileRealtimeRelayContractVersionStatus;
  serverRelayQos?: MobileRealtimeRelayServerQosSnapshot;
};

const DEFAULT_MAX_CONSECUTIVE_FAILURES = 2;
const DEFAULT_ACK_STALE_MS = 2_500;
const DEFAULT_INGEST_ACK_GRACE_MS = 3_000;
const DEFAULT_SERVER_QOS_GRACE_MS = 3_500;
const DEFAULT_SERVER_HEARTBEAT_STALE_MS = 5_000;
const DEFAULT_SERVER_HEARTBEAT_SEQUENCE_GAP_TOLERANCE = 0;
const DEFAULT_SERVER_HEARTBEAT_STALL_TIMEOUT_MS = 7_500;

function clampFiniteInt(value: number | undefined | null, minimum: number): number | undefined {
  if (!Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(minimum, Math.floor(value || 0));
}

function normalizeServerRelayQosSnapshot(
  value: MobileRealtimeRelayServerQosSnapshot | undefined
): MobileRealtimeRelayServerQosSnapshot | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const observedAtMs = clampFiniteInt(value.observedAtMs, 0);
  const expectedSequence = clampFiniteInt(value.heartbeat?.expectedSequence, 0);
  if (
    observedAtMs === undefined
    || expectedSequence === undefined
    || (value.heartbeat?.status !== 'acknowledged' && value.heartbeat?.status !== 'missing')
  ) {
    return undefined;
  }
  const ackSequence = clampFiniteInt(value.heartbeat?.ackSequence, 0);
  const acknowledgedAtMs = clampFiniteInt(value.heartbeat?.acknowledgedAtMs, 0);
  return {
    contractVersion:
      typeof value.contractVersion === 'string' && value.contractVersion.trim().length > 0
        ? value.contractVersion.trim()
        : 'missing',
    observedAtMs,
    healthy: value.healthy === true,
    reasonCode:
      typeof value.reasonCode === 'string' && value.reasonCode.trim().length > 0
        ? value.reasonCode.trim()
        : 'relay_unknown',
    heartbeat: {
      contractVersion:
        typeof value.heartbeat?.contractVersion === 'string'
          ? value.heartbeat.contractVersion.trim()
          : undefined,
      status: value.heartbeat.status,
      expectedSequence,
      ackSequence,
      acknowledgedAtMs,
    },
    qos: value.qos,
  };
}

function resolveContractVersionStatus(args: {
  observed?: string;
  expected: string;
}): MobileRealtimeRelayContractVersionStatus {
  if (typeof args.observed !== 'string' || args.observed.trim().length === 0) {
    return 'missing';
  }
  return args.observed.trim() === args.expected ? 'ok' : 'mismatch';
}

function resolveHeartbeatSequenceGap(
  heartbeat: MobileRealtimeRelayServerQosSnapshot['heartbeat'] | undefined
): number | undefined {
  if (!heartbeat) {
    return undefined;
  }
  const expectedSequence = clampFiniteInt(heartbeat.expectedSequence, 0);
  if (expectedSequence === undefined) {
    return undefined;
  }
  const acknowledgedSequence = clampFiniteInt(
    heartbeat.ackSequence,
    0
  );
  const effectiveAcknowledgedSequence =
    acknowledgedSequence !== undefined
      ? acknowledgedSequence
      : heartbeat.status === 'missing'
        ? Math.max(0, expectedSequence - 1)
        : expectedSequence;
  return Math.max(0, expectedSequence - effectiveAcknowledgedSequence);
}

function resolveHeartbeatAckAgeMs(args: {
  nowMs: number;
  heartbeat: MobileRealtimeRelayServerQosSnapshot['heartbeat'] | undefined;
}): number | undefined {
  const acknowledgedAtMs = clampFiniteInt(args.heartbeat?.acknowledgedAtMs, 0);
  if (acknowledgedAtMs === undefined) {
    return undefined;
  }
  return Math.max(0, args.nowMs - acknowledgedAtMs);
}

function buildRelayHealthSnapshot(args: {
  healthy: boolean;
  reasonCode: MobileRealtimeRelayHealthReasonCode;
  nowMs: number;
  lastIngestAttemptAtMs?: number;
  lastIngestAckAtMs?: number;
  consecutiveIngestFailures: number;
  serverRelayHeartbeatSequenceGap?: number;
  serverRelayHeartbeatAckAgeMs?: number;
  serverRelayQos?: MobileRealtimeRelayServerQosSnapshot;
  serverRelayQosAgeMs?: number;
  serverRelayContractVersionStatus?: MobileRealtimeRelayContractVersionStatus;
  serverRelayHeartbeatContractVersionStatus?: MobileRealtimeRelayContractVersionStatus;
}): MobileRealtimeRelayHealth {
  return {
    healthy: args.healthy,
    reasonCode: args.reasonCode,
    evaluatedAtMs: args.nowMs,
    lastIngestAttemptAtMs: args.lastIngestAttemptAtMs,
    lastIngestAckAtMs: args.lastIngestAckAtMs,
    consecutiveIngestFailures: args.consecutiveIngestFailures,
    serverRelayHeartbeatSequenceGap: args.serverRelayHeartbeatSequenceGap,
    serverRelayHeartbeatAckAgeMs: args.serverRelayHeartbeatAckAgeMs,
    serverRelayQos: args.serverRelayQos,
    serverRelayQosAgeMs: args.serverRelayQosAgeMs,
    serverRelayContractVersionStatus: args.serverRelayContractVersionStatus,
    serverRelayHeartbeatContractVersionStatus:
      args.serverRelayHeartbeatContractVersionStatus,
    serverRelayReasonCode: args.serverRelayQos?.reasonCode,
  };
}

export function evaluateMobileRealtimeRelayHealth(args: {
  nowMs?: number;
  isSocketConnected: boolean;
  lastIngestAttemptAtMs?: number | null;
  lastIngestAckAtMs?: number | null;
  consecutiveIngestFailures?: number;
  maxConsecutiveFailures?: number;
  ackStaleMs?: number;
  ingestAckGraceMs?: number;
  serverRelayQos?: MobileRealtimeRelayServerQosSnapshot;
  serverQosGraceMs?: number;
  serverHeartbeatStaleMs?: number;
  serverHeartbeatSequenceGapTolerance?: number;
  serverHeartbeatStallTimeoutMs?: number;
}): MobileRealtimeRelayHealth {
  const nowMs = Number.isFinite(args.nowMs) ? Math.floor(args.nowMs || 0) : Date.now();
  const consecutiveIngestFailures = Number.isFinite(args.consecutiveIngestFailures)
    ? Math.max(0, Math.floor(args.consecutiveIngestFailures || 0))
    : 0;
  const maxConsecutiveFailures = Number.isFinite(args.maxConsecutiveFailures)
    ? Math.max(1, Math.floor(args.maxConsecutiveFailures || 0))
    : DEFAULT_MAX_CONSECUTIVE_FAILURES;
  const ackStaleMs = Number.isFinite(args.ackStaleMs)
    ? Math.max(250, Math.floor(args.ackStaleMs || 0))
    : DEFAULT_ACK_STALE_MS;
  const ingestAckGraceMs = Number.isFinite(args.ingestAckGraceMs)
    ? Math.max(250, Math.floor(args.ingestAckGraceMs || 0))
    : DEFAULT_INGEST_ACK_GRACE_MS;
  const serverQosGraceMs = Number.isFinite(args.serverQosGraceMs)
    ? Math.max(250, Math.floor(args.serverQosGraceMs || 0))
    : DEFAULT_SERVER_QOS_GRACE_MS;
  const serverHeartbeatStaleMs = Number.isFinite(args.serverHeartbeatStaleMs)
    ? Math.max(250, Math.floor(args.serverHeartbeatStaleMs || 0))
    : DEFAULT_SERVER_HEARTBEAT_STALE_MS;
  const serverHeartbeatSequenceGapTolerance = Number.isFinite(args.serverHeartbeatSequenceGapTolerance)
    ? Math.max(0, Math.floor(args.serverHeartbeatSequenceGapTolerance || 0))
    : DEFAULT_SERVER_HEARTBEAT_SEQUENCE_GAP_TOLERANCE;
  const serverHeartbeatStallTimeoutMs = Number.isFinite(args.serverHeartbeatStallTimeoutMs)
    ? Math.max(250, Math.floor(args.serverHeartbeatStallTimeoutMs || 0))
    : DEFAULT_SERVER_HEARTBEAT_STALL_TIMEOUT_MS;
  const lastIngestAttemptAtMs = Number.isFinite(args.lastIngestAttemptAtMs)
    ? Math.max(0, Math.floor(args.lastIngestAttemptAtMs || 0))
    : undefined;
  const lastIngestAckAtMs = Number.isFinite(args.lastIngestAckAtMs)
    ? Math.max(0, Math.floor(args.lastIngestAckAtMs || 0))
    : undefined;
  const serverRelayQos = normalizeServerRelayQosSnapshot(args.serverRelayQos);
  const serverRelayQosAgeMs = serverRelayQos
    ? Math.max(0, nowMs - serverRelayQos.observedAtMs)
    : undefined;
  const serverRelayContractVersionStatus = resolveContractVersionStatus({
    observed: serverRelayQos?.contractVersion,
    expected: MOBILE_VOICE_RELAY_QOS_CONTRACT_VERSION,
  });
  const serverRelayHeartbeatContractVersionStatus = resolveContractVersionStatus({
    observed: serverRelayQos?.heartbeat.contractVersion,
    expected: MOBILE_VOICE_RELAY_HEARTBEAT_CONTRACT_VERSION,
  });
  const serverRelayHeartbeatSequenceGap = resolveHeartbeatSequenceGap(
    serverRelayQos?.heartbeat
  );
  const serverRelayHeartbeatAckAgeMs = resolveHeartbeatAckAgeMs({
    nowMs,
    heartbeat: serverRelayQos?.heartbeat,
  });

  if (!args.isSocketConnected) {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'socket_disconnected',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }
  if (consecutiveIngestFailures >= maxConsecutiveFailures) {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_ingest_failures',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }
  if (!lastIngestAttemptAtMs) {
    return buildRelayHealthSnapshot({
      healthy: true,
      reasonCode: 'relay_healthy',
      nowMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }
  const msSinceAttempt = Math.max(0, nowMs - lastIngestAttemptAtMs);
  if (msSinceAttempt <= ingestAckGraceMs) {
    return buildRelayHealthSnapshot({
      healthy: true,
      reasonCode: 'relay_ack_pending',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }
  if (!lastIngestAckAtMs) {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_ack_stale',
      nowMs,
      lastIngestAttemptAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }
  const msSinceAck = Math.max(0, nowMs - lastIngestAckAtMs);
  if (msSinceAck > ackStaleMs) {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_ack_stale',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
    });
  }

  if (msSinceAttempt > serverQosGraceMs && !serverRelayQos) {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_server_qos_missing',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }

  if (serverRelayQos && serverRelayContractVersionStatus !== 'ok') {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_server_qos_contract_mismatch',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }

  if (serverRelayQos && serverRelayHeartbeatContractVersionStatus !== 'ok') {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_server_heartbeat_contract_mismatch',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }

  if (
    serverRelayQos
    && (serverRelayHeartbeatSequenceGap ?? 0) > serverHeartbeatSequenceGapTolerance
  ) {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_server_heartbeat_sequence_gap',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }

  if (
    serverRelayQos
    && (serverRelayHeartbeatAckAgeMs ?? 0) > serverHeartbeatStallTimeoutMs
  ) {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_server_heartbeat_stall_timeout',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }

  if (serverRelayQos && (serverRelayQosAgeMs || 0) > serverHeartbeatStaleMs) {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_server_heartbeat_stale',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }

  if (serverRelayQos && serverRelayQos.heartbeat.status !== 'acknowledged') {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_server_ack_missing',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }

  if (serverRelayQos && !serverRelayQos.healthy) {
    return buildRelayHealthSnapshot({
      healthy: false,
      reasonCode: 'relay_server_qos_unhealthy',
      nowMs,
      lastIngestAttemptAtMs,
      lastIngestAckAtMs,
      consecutiveIngestFailures,
      serverRelayHeartbeatSequenceGap,
      serverRelayHeartbeatAckAgeMs,
      serverRelayQos,
      serverRelayQosAgeMs,
      serverRelayContractVersionStatus,
      serverRelayHeartbeatContractVersionStatus,
    });
  }
  return buildRelayHealthSnapshot({
    healthy: true,
    reasonCode: 'relay_healthy',
    nowMs,
    lastIngestAttemptAtMs,
    lastIngestAckAtMs,
    consecutiveIngestFailures,
    serverRelayHeartbeatSequenceGap,
    serverRelayHeartbeatAckAgeMs,
    serverRelayQos,
    serverRelayQosAgeMs,
    serverRelayContractVersionStatus,
    serverRelayHeartbeatContractVersionStatus,
  });
}
