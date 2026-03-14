import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const parsedWsSlowConsumerDropThresholdBytes = Number.parseInt(
  process.env.WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES || '262144',
  10,
);
const wsSlowConsumerDropThresholdBytes = Math.max(
  16_384,
  Number.isFinite(parsedWsSlowConsumerDropThresholdBytes)
    ? parsedWsSlowConsumerDropThresholdBytes
    : 262_144,
);
const parsedWsSlowConsumerCloseThresholdBytes = Number.parseInt(
  process.env.WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES || '1048576',
  10,
);
const wsSlowConsumerCloseThresholdBytes = Math.max(
  wsSlowConsumerDropThresholdBytes,
  Number.isFinite(parsedWsSlowConsumerCloseThresholdBytes)
    ? parsedWsSlowConsumerCloseThresholdBytes
    : 1_048_576,
);
const parsedWsHeartbeatCadenceMs = Number.parseInt(
  process.env.WS_HEARTBEAT_CADENCE_MS || '2500',
  10,
);
const wsHeartbeatCadenceMs = Math.max(
  250,
  Number.isFinite(parsedWsHeartbeatCadenceMs)
    ? parsedWsHeartbeatCadenceMs
    : 2_500,
);
const parsedWsHeartbeatSequenceGapTolerance = Number.parseInt(
  process.env.WS_HEARTBEAT_SEQUENCE_GAP_TOLERANCE || '0',
  10,
);
const wsHeartbeatSequenceGapTolerance = Math.max(
  0,
  Number.isFinite(parsedWsHeartbeatSequenceGapTolerance)
    ? parsedWsHeartbeatSequenceGapTolerance
    : 0,
);
const parsedWsHeartbeatStallTimeoutMs = Number.parseInt(
  process.env.WS_HEARTBEAT_STALL_TIMEOUT_MS || String(Math.max(5_000, wsHeartbeatCadenceMs * 3)),
  10,
);
const wsHeartbeatStallTimeoutMs = Math.max(
  250,
  Number.isFinite(parsedWsHeartbeatStallTimeoutMs)
    ? parsedWsHeartbeatStallTimeoutMs
    : Math.max(5_000, wsHeartbeatCadenceMs * 3),
);

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || '0.0.0.0',
  PORT: Number.parseInt(process.env.PORT || '8080', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  CONVEX_HTTP_URL: (process.env.CONVEX_HTTP_URL || process.env.EXPO_PUBLIC_L4YERCAK3_API_URL || '').trim(),
  CONVEX_SERVICE_AUTH_TOKEN: (process.env.CONVEX_SERVICE_AUTH_TOKEN || '').trim(),
  WS_CLIENT_TOKEN: (process.env.WS_CLIENT_TOKEN || '').trim(),
  WS_REQUIRE_CLIENT_TOKEN: (process.env.WS_REQUIRE_CLIENT_TOKEN || 'false').toLowerCase() === 'true',
  WS_REQUIRE_AUTH: (process.env.WS_REQUIRE_AUTH || 'false').toLowerCase() === 'true',
  WS_TICKET_SECRET: (process.env.WS_TICKET_SECRET || '').trim(),
  WS_TICKET_TTL_SECONDS: Math.max(30, Number.parseInt(process.env.WS_TICKET_TTL_SECONDS || '90', 10) || 90),
  RATE_LIMIT_CONNECTIONS_PER_MINUTE: Math.max(
    5,
    Number.parseInt(process.env.RATE_LIMIT_CONNECTIONS_PER_MINUTE || '30', 10) || 30,
  ),
  RATE_LIMIT_TICKET_ISSUES_PER_MINUTE: Math.max(
    5,
    Number.parseInt(process.env.RATE_LIMIT_TICKET_ISSUES_PER_MINUTE || '30', 10) || 30,
  ),
  RATE_LIMIT_AUDIO_CHUNKS_PER_10S: Math.max(
    5,
    Number.parseInt(process.env.RATE_LIMIT_AUDIO_CHUNKS_PER_10S || '30', 10) || 30,
  ),
  WS_HANDSHAKE_TIMEOUT_MS: Math.max(
    250,
    Number.parseInt(process.env.WS_HANDSHAKE_TIMEOUT_MS || '5000', 10) || 5000,
  ),
  MAX_AUDIO_BASE64_BYTES: Math.max(
    16_384,
    Number.parseInt(process.env.MAX_AUDIO_BASE64_BYTES || '2097152', 10) || 2_097_152,
  ),
  WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES: wsSlowConsumerDropThresholdBytes,
  WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES: wsSlowConsumerCloseThresholdBytes,
  WS_HEARTBEAT_CADENCE_MS: wsHeartbeatCadenceMs,
  WS_HEARTBEAT_SEQUENCE_GAP_TOLERANCE: wsHeartbeatSequenceGapTolerance,
  WS_HEARTBEAT_STALL_TIMEOUT_MS: wsHeartbeatStallTimeoutMs,
};

const WS_CLOSE_CODE_POLICY_VIOLATION = 1008;
const WS_CLOSE_CODE_TRY_AGAIN_LATER = 1013;
const WS_GATEWAY_READY_POLICY_VERSION = 'voice_gateway_ready_policy_v1';
const WS_GATEWAY_READY_HEARTBEAT_CONTRACT_VERSION = 'voice_relay_heartbeat_v1';
const WS_CLOSE_REASON_UNAUTHORIZED = 'unauthorized';
const WS_CLOSE_REASON_CONNECTION_RATE_LIMITED = 'connection_rate_limited';
const WS_CLOSE_REASON_SESSION_OPEN_TIMEOUT = 'session_open_timeout';
const WS_CLOSE_REASON_FIRST_FRAME_NOT_SESSION_OPEN = 'first_frame_not_session_open';
const WS_CLOSE_REASON_SESSION_OPEN_REQUIRED = 'session_open_required';
const WS_CLOSE_REASON_SLOW_CONSUMER = 'slow_consumer';
const WS_SLOW_CONSUMER_POLICY_DROP = 'drop';
const WS_SLOW_CONSUMER_POLICY_CLOSE = 'close';
const WS_SLOW_CONSUMER_ACTION_SEND = 'send';
const WS_SLOW_CONSUMER_ACTION_DROP = 'drop';
const WS_SLOW_CONSUMER_ACTION_CLOSE = 'close';

if (!env.CONVEX_HTTP_URL) {
  throw new Error('Missing CONVEX_HTTP_URL');
}

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
  },
  disableRequestLogging: false,
  trustProxy: true,
});

await app.register(websocket);

const metrics = {
  startedAtMs: Date.now(),
  ticketsIssued: 0,
  ticketsRejected: 0,
  wsConnectionsAccepted: 0,
  wsConnectionsRejectedAuth: 0,
  wsConnectionsRejectedRateLimit: 0,
  wsConnectionsRejectedProtocol: 0,
  wsHandshakeTimeouts: 0,
  wsMessagesInvalid: 0,
  wsAudioChunksReceived: 0,
  wsAudioChunksRateLimited: 0,
  wsAudioChunksRejectedSize: 0,
  wsSlowConsumerThresholdBreaches: 0,
  wsSlowConsumerDrops: 0,
  wsSlowConsumerCloses: 0,
  transcribeSuccess: 0,
  transcribeFailed: 0,
  transcribeLatencyMs: [],
};

const fixedWindowCounters = new Map();
const usedTicketJti = new Map();

function nowMs() {
  return Date.now();
}

function pruneFixedWindows() {
  const now = nowMs();
  for (const [key, record] of fixedWindowCounters.entries()) {
    if (record.expiresAtMs <= now) {
      fixedWindowCounters.delete(key);
    }
  }
}

function hitFixedWindowLimit({ key, limit, windowMs }) {
  const now = nowMs();
  const current = fixedWindowCounters.get(key);
  if (!current || current.expiresAtMs <= now) {
    fixedWindowCounters.set(key, {
      count: 1,
      expiresAtMs: now + windowMs,
    });
    return false;
  }
  current.count += 1;
  fixedWindowCounters.set(key, current);
  return current.count > limit;
}

function pruneUsedTickets() {
  const now = nowMs();
  for (const [jti, expiresAtMs] of usedTicketJti.entries()) {
    if (expiresAtMs <= now) {
      usedTicketJti.delete(jti);
    }
  }
}

function toBase64Url(input) {
  const raw = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return raw
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const normalized = input
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLength), 'base64');
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

function safeEqualUtf8(left, right) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function signTicketPayload(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerPart = toBase64Url(JSON.stringify(header));
  const payloadPart = toBase64Url(JSON.stringify(payload));
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = createHmac('sha256', secret).update(signingInput).digest();
  return `${signingInput}.${toBase64Url(signature)}`;
}

function verifyTicket(token, secret) {
  if (!token || typeof token !== 'string') {
    return { ok: false, reason: 'missing_ticket' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { ok: false, reason: 'invalid_ticket_format' };
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;
  const expectedSignature = createHmac('sha256', secret).update(signingInput).digest();
  const providedSignature = fromBase64Url(signaturePart);

  if (expectedSignature.length !== providedSignature.length) {
    return { ok: false, reason: 'invalid_ticket_signature' };
  }
  if (!timingSafeEqual(expectedSignature, providedSignature)) {
    return { ok: false, reason: 'invalid_ticket_signature' };
  }

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(payloadPart).toString('utf8'));
  } catch {
    return { ok: false, reason: 'invalid_ticket_payload' };
  }

  if (!payload || payload.v !== 1) {
    return { ok: false, reason: 'unsupported_ticket_version' };
  }
  if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(nowMs() / 1000)) {
    return { ok: false, reason: 'ticket_expired' };
  }
  if (typeof payload.jti !== 'string' || payload.jti.trim().length < 8) {
    return { ok: false, reason: 'invalid_ticket_jti' };
  }
  if (usedTicketJti.has(payload.jti)) {
    return { ok: false, reason: 'ticket_replay_detected' };
  }

  usedTicketJti.set(payload.jti, payload.exp * 1000);
  return { ok: true, payload };
}

function getBearerFromHeader(raw) {
  if (!raw || typeof raw !== 'string') {
    return '';
  }
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    return '';
  }
  return trimmed.slice(7).trim();
}

function normalizeMessage(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeQueryValue(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function estimateBase64Bytes(base64Payload) {
  if (!base64Payload) {
    return 0;
  }
  const normalized = base64Payload.replace(/\s+/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] || 0;
}

function observeTranscribeLatency(ms) {
  if (!Number.isFinite(ms)) {
    return;
  }
  metrics.transcribeLatencyMs.push(Math.max(0, Math.floor(ms)));
  if (metrics.transcribeLatencyMs.length > 500) {
    metrics.transcribeLatencyMs.splice(0, metrics.transcribeLatencyMs.length - 500);
  }
}

function logEvent(level, event, details = {}) {
  app.log[level]({
    event,
    service: 'voice-ws-gateway',
    ts: new Date().toISOString(),
    ...details,
  });
}

function normalizeSocketBufferedAmount(socket) {
  const rawBufferedAmount = typeof socket?.bufferedAmount === 'number'
    ? socket.bufferedAmount
    : 0;
  if (!Number.isFinite(rawBufferedAmount)) {
    return 0;
  }
  return Math.max(0, Math.floor(rawBufferedAmount));
}

function resolveSlowConsumerSendAction({
  bufferedAmount,
  dropThresholdBytes,
  closeThresholdBytes,
  slowConsumerPolicy,
}) {
  if (bufferedAmount >= closeThresholdBytes) {
    return WS_SLOW_CONSUMER_ACTION_CLOSE;
  }
  if (bufferedAmount >= dropThresholdBytes) {
    return slowConsumerPolicy === WS_SLOW_CONSUMER_POLICY_DROP
      ? WS_SLOW_CONSUMER_ACTION_DROP
      : WS_SLOW_CONSUMER_ACTION_CLOSE;
  }
  return WS_SLOW_CONSUMER_ACTION_SEND;
}

function sendJsonWithSlowConsumerGuard({
  socket,
  payload,
  messageType = 'unknown',
  connectionId = 'unknown_connection',
  clientIp = 'unknown_ip',
  slowConsumerPolicy = WS_SLOW_CONSUMER_POLICY_CLOSE,
  closeCode = WS_CLOSE_CODE_POLICY_VIOLATION,
  closeReason = WS_CLOSE_REASON_SLOW_CONSUMER,
}) {
  const socketClosingState = typeof socket.CLOSING === 'number' ? socket.CLOSING : 2;
  const socketClosedState = typeof socket.CLOSED === 'number' ? socket.CLOSED : 3;
  if (socket.readyState === socketClosedState || socket.readyState === socketClosingState) {
    return { outcome: 'socket_unavailable', bufferedAmount: 0 };
  }

  const bufferedAmount = normalizeSocketBufferedAmount(socket);
  const sendAction = resolveSlowConsumerSendAction({
    bufferedAmount,
    dropThresholdBytes: env.WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES,
    closeThresholdBytes: env.WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES,
    slowConsumerPolicy,
  });

  if (sendAction === WS_SLOW_CONSUMER_ACTION_DROP) {
    metrics.wsSlowConsumerThresholdBreaches += 1;
    metrics.wsSlowConsumerDrops += 1;
    logEvent('warn', 'ws_send_dropped_slow_consumer', {
      connectionId,
      clientIp,
      messageType,
      bufferedAmount,
      dropThresholdBytes: env.WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES,
      closeThresholdBytes: env.WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES,
      policy: slowConsumerPolicy,
    });
    return { outcome: 'dropped', bufferedAmount };
  }

  if (sendAction === WS_SLOW_CONSUMER_ACTION_CLOSE) {
    metrics.wsSlowConsumerThresholdBreaches += 1;
    metrics.wsSlowConsumerCloses += 1;
    logEvent('warn', 'ws_send_closed_slow_consumer', {
      connectionId,
      clientIp,
      messageType,
      bufferedAmount,
      dropThresholdBytes: env.WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES,
      closeThresholdBytes: env.WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES,
      policy: slowConsumerPolicy,
      closeCode,
      closeReason,
    });
    try {
      socket.close(closeCode, closeReason);
    } catch {
      /* ignore */
    }
    return { outcome: 'closed', bufferedAmount };
  }

  try {
    const serializedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    socket.send(serializedPayload);
    return { outcome: 'sent', bufferedAmount };
  } catch (error) {
    logEvent('warn', 'ws_send_failed', {
      connectionId,
      clientIp,
      messageType,
      error: error instanceof Error ? error.message : String(error),
    });
    return { outcome: 'send_failed', bufferedAmount };
  }
}

function buildGatewayReadyPolicyEnvelope() {
  return {
    version: WS_GATEWAY_READY_POLICY_VERSION,
    maxPayloadBytes: env.MAX_AUDIO_BASE64_BYTES,
    maxBufferedBytes: env.WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES,
    heartbeat: {
      cadenceMs: env.WS_HEARTBEAT_CADENCE_MS,
      contractVersion: WS_GATEWAY_READY_HEARTBEAT_CONTRACT_VERSION,
      sequenceGapTolerance: env.WS_HEARTBEAT_SEQUENCE_GAP_TOLERANCE,
      stallTimeoutMs: env.WS_HEARTBEAT_STALL_TIMEOUT_MS,
    },
  };
}

function closeSocketWithError(
  socket,
  {
    error,
    code,
    reason,
    extra = {},
    connectionId = 'unknown_connection',
    clientIp = 'unknown_ip',
  },
) {
  const socketClosingState = typeof socket.CLOSING === 'number' ? socket.CLOSING : 2;
  const socketClosedState = typeof socket.CLOSED === 'number' ? socket.CLOSED : 3;
  if (socket.readyState === socketClosedState || socket.readyState === socketClosingState) {
    return;
  }
  const errorSendResult = sendJsonWithSlowConsumerGuard({
    socket,
    payload: {
      type: 'error',
      error,
      ...extra,
    },
    messageType: 'error',
    connectionId,
    clientIp,
    slowConsumerPolicy: WS_SLOW_CONSUMER_POLICY_CLOSE,
  });
  if (errorSendResult.outcome === 'closed') {
    return;
  }
  socket.close(code, reason);
}

function getClientIp(request) {
  return request.ip || 'unknown_ip';
}

function buildConvexHeaders(clientAuthorizationHeader) {
  const headers = {
    'content-type': 'application/json',
  };

  if (env.CONVEX_SERVICE_AUTH_TOKEN) {
    headers.authorization = `Bearer ${env.CONVEX_SERVICE_AUTH_TOKEN}`;
    return headers;
  }

  if (clientAuthorizationHeader) {
    headers.authorization = clientAuthorizationHeader;
  }

  return headers;
}

async function postConvex(path, body, clientAuthorizationHeader) {
  const res = await fetch(`${env.CONVEX_HTTP_URL}${path}`, {
    method: 'POST',
    headers: buildConvexHeaders(clientAuthorizationHeader),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return {
    ok: res.ok,
    status: res.status,
    body: json,
  };
}

app.get('/healthz', async () => {
  return { ok: true, service: 'voice-ws-gateway', ts: nowMs() };
});

app.get('/readyz', async (_request, reply) => {
  if (!env.CONVEX_HTTP_URL) {
    reply.code(503);
    return { ok: false, reason: 'missing_convex_http_url' };
  }
  return { ok: true, convexHttpUrl: env.CONVEX_HTTP_URL };
});

app.get('/metrics', async () => {
  pruneFixedWindows();
  pruneUsedTickets();

  return {
    uptimeSeconds: Math.floor((nowMs() - metrics.startedAtMs) / 1000),
    counters: {
      ticketsIssued: metrics.ticketsIssued,
      ticketsRejected: metrics.ticketsRejected,
      wsConnectionsAccepted: metrics.wsConnectionsAccepted,
      wsConnectionsRejectedAuth: metrics.wsConnectionsRejectedAuth,
      wsConnectionsRejectedRateLimit: metrics.wsConnectionsRejectedRateLimit,
      wsConnectionsRejectedProtocol: metrics.wsConnectionsRejectedProtocol,
      wsHandshakeTimeouts: metrics.wsHandshakeTimeouts,
      wsMessagesInvalid: metrics.wsMessagesInvalid,
      wsAudioChunksReceived: metrics.wsAudioChunksReceived,
      wsAudioChunksRateLimited: metrics.wsAudioChunksRateLimited,
      wsAudioChunksRejectedSize: metrics.wsAudioChunksRejectedSize,
      wsSlowConsumerThresholdBreaches: metrics.wsSlowConsumerThresholdBreaches,
      wsSlowConsumerDrops: metrics.wsSlowConsumerDrops,
      wsSlowConsumerCloses: metrics.wsSlowConsumerCloses,
      transcribeSuccess: metrics.transcribeSuccess,
      transcribeFailed: metrics.transcribeFailed,
    },
    latencies: {
      transcribeP50Ms: percentile(metrics.transcribeLatencyMs, 50),
      transcribeP95Ms: percentile(metrics.transcribeLatencyMs, 95),
      sampleCount: metrics.transcribeLatencyMs.length,
    },
    inMemory: {
      fixedWindowKeys: fixedWindowCounters.size,
      usedTickets: usedTicketJti.size,
    },
  };
});

app.post('/v1/ws-ticket', async (request, reply) => {
  if (!env.WS_TICKET_SECRET) {
    metrics.ticketsRejected += 1;
    reply.code(503);
    return { success: false, error: 'ws_ticket_secret_not_configured' };
  }

  const clientIp = getClientIp(request);
  const authHeader = typeof request.headers.authorization === 'string'
    ? request.headers.authorization
    : '';
  const bearerToken = getBearerFromHeader(authHeader);

  if (env.WS_REQUIRE_AUTH && !bearerToken && !env.CONVEX_SERVICE_AUTH_TOKEN) {
    metrics.ticketsRejected += 1;
    reply.code(401);
    return { success: false, error: 'missing_bearer_auth' };
  }

  const rateLimitKey = `ticket:${clientIp}:${bearerToken ? sha256Hex(bearerToken) : 'anon'}`;
  if (
    hitFixedWindowLimit({
      key: rateLimitKey,
      limit: env.RATE_LIMIT_TICKET_ISSUES_PER_MINUTE,
      windowMs: 60_000,
    })
  ) {
    metrics.ticketsRejected += 1;
    reply.code(429);
    return { success: false, error: 'ticket_rate_limited' };
  }

  const body = typeof request.body === 'object' && request.body !== null ? request.body : {};
  const conversationId = normalizeQueryValue(body.conversationId);
  const interviewSessionId = normalizeQueryValue(body.interviewSessionId);
  const voiceSessionId = normalizeQueryValue(body.voiceSessionId);

  const issuedAtSeconds = Math.floor(nowMs() / 1000);
  const expiresAtSeconds = issuedAtSeconds + env.WS_TICKET_TTL_SECONDS;
  const jti = randomUUID();
  const authHash = bearerToken ? sha256Hex(bearerToken) : '';

  const ticketPayload = {
    v: 1,
    iat: issuedAtSeconds,
    exp: expiresAtSeconds,
    jti,
    ah: authHash || undefined,
    cid: conversationId || undefined,
    iid: interviewSessionId || undefined,
    vid: voiceSessionId || undefined,
  };

  const ticket = signTicketPayload(ticketPayload, env.WS_TICKET_SECRET);
  metrics.ticketsIssued += 1;

  logEvent('info', 'ws_ticket_issued', {
    clientIp,
    hasAuth: Boolean(bearerToken),
    expiresAtSeconds,
    hasConversationId: Boolean(conversationId),
    hasInterviewSessionId: Boolean(interviewSessionId),
    hasVoiceSessionId: Boolean(voiceSessionId),
  });

  return {
    success: true,
    ticket,
    expiresAtMs: expiresAtSeconds * 1000,
    ttlSeconds: env.WS_TICKET_TTL_SECONDS,
  };
});

app.get('/ws', { websocket: true }, (socket, request) => {
  const connectionId = randomUUID();
  const clientIp = getClientIp(request);
  const query = request.query || {};
  const queryTicket = normalizeQueryValue(query.ticket);

  const clientAuthorizationHeader = typeof request.headers.authorization === 'string'
    ? request.headers.authorization
    : '';
  const bearerToken = getBearerFromHeader(clientAuthorizationHeader);
  const bearerTokenHash = bearerToken ? sha256Hex(bearerToken) : '';

  const staticClientToken = (() => {
    const fromHeader = bearerToken;
    if (fromHeader) {
      return fromHeader;
    }
    const fromQuery = normalizeQueryValue(query.token);
    return fromQuery;
  })();

  const connectionRateKey = `conn:${clientIp}:${bearerTokenHash || 'anon'}`;
  if (
    hitFixedWindowLimit({
      key: connectionRateKey,
      limit: env.RATE_LIMIT_CONNECTIONS_PER_MINUTE,
      windowMs: 60_000,
    })
  ) {
    metrics.wsConnectionsRejectedRateLimit += 1;
    logEvent('warn', 'ws_connection_rejected_rate_limit', { connectionId, clientIp });
    closeSocketWithError(socket, {
      error: 'connection_rate_limited',
      code: WS_CLOSE_CODE_TRY_AGAIN_LATER,
      reason: WS_CLOSE_REASON_CONNECTION_RATE_LIMITED,
      connectionId,
      clientIp,
    });
    return;
  }

  let ticketPayload = null;
  if (queryTicket) {
    if (!env.WS_TICKET_SECRET) {
      metrics.wsConnectionsRejectedAuth += 1;
      closeSocketWithError(socket, {
        error: 'ws_ticket_secret_not_configured',
        code: WS_CLOSE_CODE_POLICY_VIOLATION,
        reason: WS_CLOSE_REASON_UNAUTHORIZED,
        connectionId,
        clientIp,
      });
      return;
    }
    const ticketCheck = verifyTicket(queryTicket, env.WS_TICKET_SECRET);
    if (!ticketCheck.ok) {
      metrics.wsConnectionsRejectedAuth += 1;
      logEvent('warn', 'ws_connection_rejected_ticket_invalid', {
        connectionId,
        clientIp,
        reason: ticketCheck.reason,
      });
      closeSocketWithError(socket, {
        error: ticketCheck.reason,
        code: WS_CLOSE_CODE_POLICY_VIOLATION,
        reason: WS_CLOSE_REASON_UNAUTHORIZED,
        connectionId,
        clientIp,
      });
      return;
    }
    ticketPayload = ticketCheck.payload;

    if (ticketPayload.ah && !bearerTokenHash) {
      metrics.wsConnectionsRejectedAuth += 1;
      closeSocketWithError(socket, {
        error: 'missing_bearer_auth',
        code: WS_CLOSE_CODE_POLICY_VIOLATION,
        reason: WS_CLOSE_REASON_UNAUTHORIZED,
        connectionId,
        clientIp,
      });
      return;
    }
    if (ticketPayload.ah && !safeEqualUtf8(ticketPayload.ah, bearerTokenHash)) {
      metrics.wsConnectionsRejectedAuth += 1;
      closeSocketWithError(socket, {
        error: 'ticket_auth_mismatch',
        code: WS_CLOSE_CODE_POLICY_VIOLATION,
        reason: WS_CLOSE_REASON_UNAUTHORIZED,
        connectionId,
        clientIp,
      });
      return;
    }
  }

  if (env.WS_REQUIRE_AUTH && !bearerToken && !ticketPayload && !env.CONVEX_SERVICE_AUTH_TOKEN) {
    metrics.wsConnectionsRejectedAuth += 1;
    logEvent('warn', 'ws_connection_rejected_missing_auth', { connectionId, clientIp });
    closeSocketWithError(socket, {
      error: 'missing_bearer_auth',
      code: WS_CLOSE_CODE_POLICY_VIOLATION,
      reason: WS_CLOSE_REASON_UNAUTHORIZED,
      connectionId,
      clientIp,
    });
    return;
  }

  if (env.WS_REQUIRE_CLIENT_TOKEN && (!env.WS_CLIENT_TOKEN || staticClientToken !== env.WS_CLIENT_TOKEN)) {
    metrics.wsConnectionsRejectedAuth += 1;
    logEvent('warn', 'ws_connection_rejected_static_token', { connectionId, clientIp });
    closeSocketWithError(socket, {
      error: 'unauthorized',
      code: WS_CLOSE_CODE_POLICY_VIOLATION,
      reason: WS_CLOSE_REASON_UNAUTHORIZED,
      connectionId,
      clientIp,
    });
    return;
  }

  metrics.wsConnectionsAccepted += 1;
  logEvent('info', 'ws_connection_accepted', {
    connectionId,
    clientIp,
    hasBearer: Boolean(bearerToken),
    hasTicket: Boolean(ticketPayload),
  });

  const state = {
    connectionId,
    openedAtMs: nowMs(),
    voiceSessionId: '',
    interviewSessionId: '',
    conversationId: '',
    ready: false,
    transcribeInFlight: false,
    firstValidClientFrameSeen: false,
    closeInitiated: false,
  };

  let handshakeTimeout = setTimeout(() => {
    if (state.ready || state.closeInitiated) {
      return;
    }
    metrics.wsHandshakeTimeouts += 1;
    metrics.wsConnectionsRejectedProtocol += 1;
    state.closeInitiated = true;
    logEvent('warn', 'ws_connection_rejected_handshake_timeout', {
      connectionId,
      clientIp,
      timeoutMs: env.WS_HANDSHAKE_TIMEOUT_MS,
    });
    closeSocketWithError(socket, {
      error: 'voice_session_open_timeout',
      code: WS_CLOSE_CODE_POLICY_VIOLATION,
      reason: WS_CLOSE_REASON_SESSION_OPEN_TIMEOUT,
      extra: {
        closeCode: WS_CLOSE_CODE_POLICY_VIOLATION,
        closeReason: WS_CLOSE_REASON_SESSION_OPEN_TIMEOUT,
      },
      connectionId,
      clientIp,
    });
  }, env.WS_HANDSHAKE_TIMEOUT_MS);
  handshakeTimeout.unref?.();

  function clearHandshakeTimeout() {
    if (!handshakeTimeout) {
      return;
    }
    clearTimeout(handshakeTimeout);
    handshakeTimeout = null;
  }

  function rejectPreOpenMessage(error, reason, messageType) {
    if (state.closeInitiated) {
      return;
    }
    state.closeInitiated = true;
    metrics.wsConnectionsRejectedProtocol += 1;
    clearHandshakeTimeout();
    logEvent('warn', 'ws_connection_rejected_pre_open_message', {
      connectionId,
      clientIp,
      error,
      reason,
      messageType,
    });
    closeSocketWithError(socket, {
      error,
      code: WS_CLOSE_CODE_POLICY_VIOLATION,
      reason,
      extra: {
        closeCode: WS_CLOSE_CODE_POLICY_VIOLATION,
        closeReason: reason,
        messageType,
      },
      connectionId,
      clientIp,
    });
  }

  function sendToClient(
    payload,
    {
      messageType = 'unknown',
      slowConsumerPolicy = WS_SLOW_CONSUMER_POLICY_CLOSE,
    } = {},
  ) {
    const sendResult = sendJsonWithSlowConsumerGuard({
      socket,
      payload,
      messageType,
      connectionId,
      clientIp,
      slowConsumerPolicy,
    });
    if (sendResult.outcome === 'closed') {
      state.closeInitiated = true;
      clearHandshakeTimeout();
    }
    return sendResult;
  }

  sendToClient(
    {
      type: 'gateway_ready',
      connectionId,
      ts: nowMs(),
      policy: buildGatewayReadyPolicyEnvelope(),
    },
    { messageType: 'gateway_ready' },
  );

  socket.on('message', async (raw) => {
    const message = normalizeMessage(raw.toString());
    if (!message || typeof message.type !== 'string') {
      metrics.wsMessagesInvalid += 1;
      sendToClient({ type: 'error', error: 'invalid_json_message' }, { messageType: 'error' });
      return;
    }

    if (!state.firstValidClientFrameSeen) {
      state.firstValidClientFrameSeen = true;
      if (message.type !== 'voice_session_open') {
        rejectPreOpenMessage(
          'first_frame_must_be_voice_session_open',
          WS_CLOSE_REASON_FIRST_FRAME_NOT_SESSION_OPEN,
          message.type,
        );
        return;
      }
    }

    if (!state.ready && message.type !== 'voice_session_open') {
      rejectPreOpenMessage(
        'session_open_required_before_message',
        WS_CLOSE_REASON_SESSION_OPEN_REQUIRED,
        message.type,
      );
      return;
    }

    if (message.type === 'ping') {
      sendToClient(
        { type: 'pong', ts: nowMs() },
        {
          messageType: 'pong',
          slowConsumerPolicy: WS_SLOW_CONSUMER_POLICY_DROP,
        },
      );
      return;
    }

    if (message.type === 'voice_session_open') {
      const voiceSessionId = typeof message.voiceSessionId === 'string' ? message.voiceSessionId.trim() : '';
      const interviewSessionId = typeof message.interviewSessionId === 'string' ? message.interviewSessionId.trim() : '';
      const conversationId = typeof message.conversationId === 'string' ? message.conversationId.trim() : '';

      if (!voiceSessionId || !interviewSessionId) {
        sendToClient({ type: 'error', error: 'missing_session_ids' }, { messageType: 'error' });
        return;
      }

      if (ticketPayload?.vid && ticketPayload.vid !== voiceSessionId) {
        sendToClient({ type: 'error', error: 'voice_session_id_ticket_mismatch' }, { messageType: 'error' });
        return;
      }
      if (ticketPayload?.iid && ticketPayload.iid !== interviewSessionId) {
        sendToClient({ type: 'error', error: 'interview_session_id_ticket_mismatch' }, { messageType: 'error' });
        return;
      }
      if (ticketPayload?.cid && conversationId && ticketPayload.cid !== conversationId) {
        sendToClient({ type: 'error', error: 'conversation_id_ticket_mismatch' }, { messageType: 'error' });
        return;
      }

      const verifyStart = nowMs();
      const verify = await postConvex(
        '/api/v1/ai/voice/session/open',
        {
          voiceSessionId,
          interviewSessionId,
          conversationId,
        },
        clientAuthorizationHeader,
      );
      observeTranscribeLatency(nowMs() - verifyStart);

      if (!verify.ok) {
        logEvent('warn', 'voice_session_open_verify_failed', {
          connectionId,
          status: verify.status,
          error: verify.body?.error || 'voice_session_open_failed',
        });
        sendToClient({
          type: 'voice_session_open_failed',
          status: verify.status,
          error: verify.body?.error || 'voice_session_open_failed',
        }, {
          messageType: 'voice_session_open_failed',
        });
        return;
      }

      state.voiceSessionId = voiceSessionId;
      state.interviewSessionId = interviewSessionId;
      state.conversationId = conversationId;
      state.ready = true;
      clearHandshakeTimeout();

      sendToClient({
        type: 'voice_session_open_ok',
        voiceSessionId,
        interviewSessionId,
        conversationId,
      }, {
        messageType: 'voice_session_open_ok',
      });

      logEvent('info', 'voice_session_open_ok', {
        connectionId,
        voiceSessionId,
        interviewSessionId,
        hasConversationId: Boolean(conversationId),
      });
      return;
    }

    if (message.type === 'audio_chunk') {
      metrics.wsAudioChunksReceived += 1;

      if (!state.ready) {
        sendToClient({ type: 'error', error: 'session_not_open' }, { messageType: 'error' });
        return;
      }
      if (state.transcribeInFlight) {
        sendToClient(
          { type: 'ingest_backpressure', reason: 'transcribe_in_flight' },
          {
            messageType: 'ingest_backpressure',
            slowConsumerPolicy: WS_SLOW_CONSUMER_POLICY_DROP,
          },
        );
        return;
      }

      const audioRateLimitKey = `audio:${connectionId}`;
      if (
        hitFixedWindowLimit({
          key: audioRateLimitKey,
          limit: env.RATE_LIMIT_AUDIO_CHUNKS_PER_10S,
          windowMs: 10_000,
        })
      ) {
        metrics.wsAudioChunksRateLimited += 1;
        sendToClient({ type: 'error', error: 'audio_chunk_rate_limited' }, { messageType: 'error' });
        return;
      }

      const audioBase64 = typeof message.audioBase64 === 'string' ? message.audioBase64.trim() : '';
      const mimeType = typeof message.mimeType === 'string' && message.mimeType.trim()
        ? message.mimeType.trim()
        : 'audio/m4a';

      if (!audioBase64) {
        sendToClient({ type: 'error', error: 'missing_audio_base64' }, { messageType: 'error' });
        return;
      }

      const estimatedBytes = estimateBase64Bytes(audioBase64);
      if (estimatedBytes > env.MAX_AUDIO_BASE64_BYTES) {
        metrics.wsAudioChunksRejectedSize += 1;
        sendToClient({
          type: 'error',
          error: 'audio_chunk_too_large',
          maxBytes: env.MAX_AUDIO_BASE64_BYTES,
        }, {
          messageType: 'error',
        });
        return;
      }

      state.transcribeInFlight = true;
      try {
        const processingSend = sendToClient(
          { type: 'partial_transcript', partialTranscript: 'Processing...' },
          {
            messageType: 'partial_transcript',
            slowConsumerPolicy: WS_SLOW_CONSUMER_POLICY_DROP,
          },
        );
        if (processingSend.outcome === 'closed') {
          return;
        }

        const transcribeStart = nowMs();
        const transcribe = await postConvex(
          '/api/v1/ai/voice/transcribe',
          {
            conversationId: state.conversationId || undefined,
            interviewSessionId: state.interviewSessionId,
            voiceSessionId: state.voiceSessionId,
            audioBase64,
            mimeType,
          },
          clientAuthorizationHeader,
        );
        observeTranscribeLatency(nowMs() - transcribeStart);

        if (!transcribe.ok || !transcribe.body?.success) {
          metrics.transcribeFailed += 1;
          logEvent('warn', 'audio_chunk_transcribe_failed', {
            connectionId,
            status: transcribe.status,
            error: transcribe.body?.error || 'transcribe_failed',
          });
          sendToClient({
            type: 'error',
            error: transcribe.body?.error || 'transcribe_failed',
            status: transcribe.status,
          }, {
            messageType: 'error',
          });
          return;
        }

        metrics.transcribeSuccess += 1;

        const text = typeof transcribe.body.text === 'string' ? transcribe.body.text : '';
        if (text) {
          sendToClient(
            {
              type: 'partial_transcript',
              partialTranscript: text,
            },
            {
              messageType: 'partial_transcript',
              slowConsumerPolicy: WS_SLOW_CONSUMER_POLICY_DROP,
            },
          );
          sendToClient(
            {
              eventType: 'partial_transcript',
              transcriptText: text,
            },
            {
              messageType: 'partial_transcript_event',
              slowConsumerPolicy: WS_SLOW_CONSUMER_POLICY_DROP,
            },
          );
        }
      } catch (error) {
        metrics.transcribeFailed += 1;
        logEvent('error', 'audio_chunk_processing_failed', {
          connectionId,
          error: error instanceof Error ? error.message : String(error),
        });
        sendToClient({ type: 'error', error: 'audio_chunk_processing_failed' }, { messageType: 'error' });
      } finally {
        state.transcribeInFlight = false;
      }
      return;
    }

    sendToClient(
      { type: 'error', error: 'unsupported_message_type', messageType: message.type },
      { messageType: 'error' },
    );
  });

  socket.on('close', (code, reasonBuffer) => {
    clearHandshakeTimeout();
    const reason = reasonBuffer?.toString() || '';
    logEvent('info', 'ws_client_closed', {
      connectionId,
      code,
      reason,
      sessionDurationMs: nowMs() - state.openedAtMs,
    });
  });

  socket.on('error', (error) => {
    logEvent('warn', 'ws_client_error', {
      connectionId,
      error: error instanceof Error ? error.message : String(error),
    });
  });
});

setInterval(() => {
  pruneFixedWindows();
  pruneUsedTickets();
}, 30_000).unref();

if (process.env.VOICE_WS_GATEWAY_DISABLE_LISTEN !== 'true') {
  const address = await app.listen({
    host: env.HOST,
    port: env.PORT,
  });

  logEvent('info', 'voice_ws_gateway_started', {
    address,
    env: env.NODE_ENV,
    wsRequireAuth: env.WS_REQUIRE_AUTH,
    wsRequireClientToken: env.WS_REQUIRE_CLIENT_TOKEN,
    hasWsTicketSecret: Boolean(env.WS_TICKET_SECRET),
  });
}

export {
  app,
  env,
  signTicketPayload,
  verifyTicket,
  hitFixedWindowLimit,
  resolveSlowConsumerSendAction,
  sendJsonWithSlowConsumerGuard,
  buildGatewayReadyPolicyEnvelope,
  WS_GATEWAY_READY_POLICY_VERSION,
  WS_GATEWAY_READY_HEARTBEAT_CONTRACT_VERSION,
};
