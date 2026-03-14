import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type VoiceGatewayModule = {
  app: {
    inject: (opts: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      payload?: Record<string, unknown>;
    }) => Promise<{ statusCode: number; json: () => Record<string, unknown> }>;
    close: () => Promise<void>;
  };
  env: {
    WS_TICKET_SECRET: string;
    WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES: number;
    WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES: number;
  };
  verifyTicket: (token: string, secret: string) => { ok: boolean; reason?: string; payload?: Record<string, unknown> };
  resolveSlowConsumerSendAction: (args: {
    bufferedAmount: number;
    dropThresholdBytes: number;
    closeThresholdBytes: number;
    slowConsumerPolicy: 'drop' | 'close';
  }) => 'send' | 'drop' | 'close';
  sendJsonWithSlowConsumerGuard: (args: {
    socket: {
      OPEN: number;
      CLOSING: number;
      CLOSED: number;
      readyState: number;
      bufferedAmount: number;
      send: (payload: string) => void;
      close: (code: number, reason?: string) => void;
    };
    payload: unknown;
    messageType: string;
    connectionId: string;
    clientIp: string;
    slowConsumerPolicy: 'drop' | 'close';
  }) => { outcome: 'socket_unavailable' | 'sent' | 'dropped' | 'closed' | 'send_failed'; bufferedAmount: number };
};

describe('voice-ws-gateway ticketing + rate-limit integration', () => {
  let gatewayModule: VoiceGatewayModule;

  beforeAll(async () => {
    process.env.VOICE_WS_GATEWAY_DISABLE_LISTEN = 'true';
    process.env.CONVEX_HTTP_URL = 'https://example.convex.site';
    process.env.WS_REQUIRE_AUTH = 'true';
    process.env.WS_TICKET_SECRET = 'unit_test_ticket_secret';
    process.env.WS_TICKET_TTL_SECONDS = '120';
    process.env.RATE_LIMIT_TICKET_ISSUES_PER_MINUTE = '5';
    process.env.RATE_LIMIT_CONNECTIONS_PER_MINUTE = '20';
    process.env.RATE_LIMIT_AUDIO_CHUNKS_PER_10S = '20';
    process.env.WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES = '262144';
    process.env.WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES = '1048576';

    gatewayModule = (await import(
      '../../../apps/voice-ws-gateway/src/server.mjs'
    )) as unknown as VoiceGatewayModule;
  });

  afterAll(async () => {
    await gatewayModule.app.close();
  });

  it('requires bearer auth for ws ticket minting when WS_REQUIRE_AUTH=true', async () => {
    const response = await gatewayModule.app.inject({
      method: 'POST',
      url: '/v1/ws-ticket',
      payload: {
        conversationId: 'conv_1',
        interviewSessionId: 'int_1',
        voiceSessionId: 'voice_1',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('missing_bearer_auth');
  });

  it('issues signed tickets and enforces replay detection on verification', async () => {
    const authToken = 'session_token_abc';
    const response = await gatewayModule.app.inject({
      method: 'POST',
      url: '/v1/ws-ticket',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        conversationId: 'conv_2',
        interviewSessionId: 'int_2',
        voiceSessionId: 'voice_2',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(typeof body.ticket).toBe('string');

    const ticket = body.ticket as string;
    const verified = gatewayModule.verifyTicket(ticket, gatewayModule.env.WS_TICKET_SECRET);
    expect(verified.ok).toBe(true);
    expect(verified.payload?.iid).toBe('int_2');
    expect(verified.payload?.vid).toBe('voice_2');
    expect(verified.payload?.cid).toBe('conv_2');

    const expectedAuthHash = createHash('sha256').update(authToken).digest('hex');
    expect(verified.payload?.ah).toBe(expectedAuthHash);

    const replayCheck = gatewayModule.verifyTicket(ticket, gatewayModule.env.WS_TICKET_SECRET);
    expect(replayCheck.ok).toBe(false);
    expect(replayCheck.reason).toBe('ticket_replay_detected');
  });

  it('applies ticket issuance rate limiting', async () => {
    const authHeader = { authorization: 'Bearer session_token_rate_limit' };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await gatewayModule.app.inject({
        method: 'POST',
        url: '/v1/ws-ticket',
        headers: authHeader,
      });
      expect(response.statusCode).toBe(200);
    }

    const overLimit = await gatewayModule.app.inject({
      method: 'POST',
      url: '/v1/ws-ticket',
      headers: authHeader,
    });
    expect(overLimit.statusCode).toBe(429);
    const body = overLimit.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('ticket_rate_limited');
  });

  it('drops non-critical outbound frames for slow consumers and records counters', async () => {
    const metricsBefore = await gatewayModule.app.inject({
      method: 'GET',
      url: '/metrics',
    });
    expect(metricsBefore.statusCode).toBe(200);
    const countersBefore = metricsBefore.json().counters as Record<string, number>;

    const fakeSocketSentPayloads: string[] = [];
    const fakeSocketCloseCalls: Array<{ code: number; reason?: string }> = [];
    const fakeSocket = {
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
      readyState: 1,
      bufferedAmount: gatewayModule.env.WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES,
      send: (payload: string) => {
        fakeSocketSentPayloads.push(payload);
      },
      close: (code: number, reason?: string) => {
        fakeSocketCloseCalls.push({ code, reason });
      },
    };

    const decision = gatewayModule.resolveSlowConsumerSendAction({
      bufferedAmount: fakeSocket.bufferedAmount,
      dropThresholdBytes: gatewayModule.env.WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES,
      closeThresholdBytes: gatewayModule.env.WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES,
      slowConsumerPolicy: 'drop',
    });
    expect(decision).toBe('drop');

    const result = gatewayModule.sendJsonWithSlowConsumerGuard({
      socket: fakeSocket,
      payload: { type: 'partial_transcript', partialTranscript: 'processing' },
      messageType: 'partial_transcript',
      connectionId: 'conn_drop_test',
      clientIp: '127.0.0.1',
      slowConsumerPolicy: 'drop',
    });
    expect(result.outcome).toBe('dropped');
    expect(fakeSocketSentPayloads).toHaveLength(0);
    expect(fakeSocketCloseCalls).toHaveLength(0);

    const metricsAfter = await gatewayModule.app.inject({
      method: 'GET',
      url: '/metrics',
    });
    expect(metricsAfter.statusCode).toBe(200);
    const countersAfter = metricsAfter.json().counters as Record<string, number>;
    expect(countersAfter.wsSlowConsumerThresholdBreaches).toBe(countersBefore.wsSlowConsumerThresholdBreaches + 1);
    expect(countersAfter.wsSlowConsumerDrops).toBe(countersBefore.wsSlowConsumerDrops + 1);
    expect(countersAfter.wsSlowConsumerCloses).toBe(countersBefore.wsSlowConsumerCloses);
  });

  it('closes slow-consumer connections at close threshold and records counters', async () => {
    const metricsBefore = await gatewayModule.app.inject({
      method: 'GET',
      url: '/metrics',
    });
    expect(metricsBefore.statusCode).toBe(200);
    const countersBefore = metricsBefore.json().counters as Record<string, number>;

    const fakeSocketSentPayloads: string[] = [];
    const fakeSocketCloseCalls: Array<{ code: number; reason?: string }> = [];
    const fakeSocket = {
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
      readyState: 1,
      bufferedAmount: gatewayModule.env.WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES,
      send: (payload: string) => {
        fakeSocketSentPayloads.push(payload);
      },
      close: (code: number, reason?: string) => {
        fakeSocketCloseCalls.push({ code, reason });
      },
    };

    const decision = gatewayModule.resolveSlowConsumerSendAction({
      bufferedAmount: fakeSocket.bufferedAmount,
      dropThresholdBytes: gatewayModule.env.WS_SLOW_CONSUMER_DROP_THRESHOLD_BYTES,
      closeThresholdBytes: gatewayModule.env.WS_SLOW_CONSUMER_CLOSE_THRESHOLD_BYTES,
      slowConsumerPolicy: 'close',
    });
    expect(decision).toBe('close');

    const result = gatewayModule.sendJsonWithSlowConsumerGuard({
      socket: fakeSocket,
      payload: { type: 'gateway_ready', connectionId: 'conn_close_test', ts: Date.now() },
      messageType: 'gateway_ready',
      connectionId: 'conn_close_test',
      clientIp: '127.0.0.1',
      slowConsumerPolicy: 'close',
    });
    expect(result.outcome).toBe('closed');
    expect(fakeSocketSentPayloads).toHaveLength(0);
    expect(fakeSocketCloseCalls).toHaveLength(1);
    expect(fakeSocketCloseCalls[0]).toEqual({ code: 1008, reason: 'slow_consumer' });

    const metricsAfter = await gatewayModule.app.inject({
      method: 'GET',
      url: '/metrics',
    });
    expect(metricsAfter.statusCode).toBe(200);
    const countersAfter = metricsAfter.json().counters as Record<string, number>;
    expect(countersAfter.wsSlowConsumerThresholdBreaches).toBe(countersBefore.wsSlowConsumerThresholdBreaches + 1);
    expect(countersAfter.wsSlowConsumerDrops).toBe(countersBefore.wsSlowConsumerDrops);
    expect(countersAfter.wsSlowConsumerCloses).toBe(countersBefore.wsSlowConsumerCloses + 1);
  });
});
