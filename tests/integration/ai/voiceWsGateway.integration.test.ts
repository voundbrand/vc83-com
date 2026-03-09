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
  };
  verifyTicket: (token: string, secret: string) => { ok: boolean; reason?: string; payload?: Record<string, unknown> };
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
});
