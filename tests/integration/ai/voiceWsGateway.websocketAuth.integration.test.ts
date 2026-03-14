import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { WebSocket } from 'ws';

type StartedGatewayModule = {
  app: {
    server: {
      address: () => string | { port: number } | null;
    };
    inject: (opts: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      payload?: Record<string, unknown>;
    }) => Promise<{ statusCode: number; json: () => Record<string, unknown> }>;
    close: () => Promise<void>;
  };
};

type WsCapture = {
  closeCode: number;
  closeReason: string;
  messages: Array<Record<string, unknown>>;
};

type WsCaptureOptions = {
  headers?: Record<string, string>;
  onOpen?: (websocket: WebSocket) => void;
  timeoutMs?: number;
};

function createWsCapture(url: string, options: WsCaptureOptions = {}): Promise<WsCapture> {
  return new Promise((resolve, reject) => {
    const { headers, onOpen, timeoutMs = 4_000 } = options;
    const messages: Array<Record<string, unknown>> = [];
    const websocket = new WebSocket(url, { headers });
    const timeout = setTimeout(() => {
      websocket.terminate();
      reject(new Error('websocket_capture_timeout'));
    }, timeoutMs);

    websocket.on('open', () => {
      onOpen?.(websocket);
    });

    websocket.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as Record<string, unknown>;
        messages.push(parsed);
      } catch {
        messages.push({ raw: data.toString() });
      }
    });

    websocket.on('close', (closeCode, closeReasonBuffer) => {
      clearTimeout(timeout);
      resolve({
        closeCode,
        closeReason: closeReasonBuffer.toString(),
        messages,
      });
    });

    websocket.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

describe('voice-ws-gateway websocket auth failures', () => {
  let startupError: Error | null = null;
  let gatewayModule: StartedGatewayModule | null = null;
  let websocketBaseUrl = '';

  beforeAll(async () => {
    process.env.VOICE_WS_GATEWAY_DISABLE_LISTEN = 'false';
    process.env.HOST = '127.0.0.1';
    process.env.PORT = '0';
    process.env.CONVEX_HTTP_URL = 'https://example.convex.site';
    process.env.WS_REQUIRE_AUTH = 'true';
    process.env.WS_TICKET_SECRET = 'unit_test_ticket_secret_ws_auth';
    process.env.WS_TICKET_TTL_SECONDS = '120';
    process.env.WS_HANDSHAKE_TIMEOUT_MS = '300';
    process.env.RATE_LIMIT_CONNECTIONS_PER_MINUTE = '100';
    process.env.RATE_LIMIT_TICKET_ISSUES_PER_MINUTE = '100';
    process.env.RATE_LIMIT_AUDIO_CHUNKS_PER_10S = '100';
    process.env.WS_HEARTBEAT_CADENCE_MS = '2500';

    try {
      vi.resetModules();
      const imported = (await import(
        '../../../apps/voice-ws-gateway/src/server.mjs'
      )) as unknown as StartedGatewayModule;
      gatewayModule = imported;
      const address = imported.app.server.address();
      if (!address || typeof address === 'string' || typeof address.port !== 'number') {
        throw new Error('failed_to_resolve_ws_gateway_listen_port');
      }
      websocketBaseUrl = `ws://127.0.0.1:${address.port}`;
    } catch (error) {
      startupError = error instanceof Error ? error : new Error(String(error));
    }
  });

  afterAll(async () => {
    if (gatewayModule) {
      await gatewayModule.app.close();
    }
  });

  async function issueTicket(args: {
    authToken: string;
    conversationId: string;
    interviewSessionId: string;
    voiceSessionId: string;
  }): Promise<string> {
    const ticketResponse = await gatewayModule!.app.inject({
      method: 'POST',
      url: '/v1/ws-ticket',
      headers: {
        authorization: `Bearer ${args.authToken}`,
      },
      payload: {
        conversationId: args.conversationId,
        interviewSessionId: args.interviewSessionId,
        voiceSessionId: args.voiceSessionId,
      },
    });

    expect(ticketResponse.statusCode).toBe(200);
    const ticketBody = ticketResponse.json();
    expect(ticketBody.success).toBe(true);
    return ticketBody.ticket as string;
  }

  it('rejects invalid ticket format', async () => {
    if (startupError) {
      const code = (startupError as NodeJS.ErrnoException).code;
      const message = startupError.message || '';
      const isSandboxListenBlock =
        code === 'EPERM'
        || code === 'EACCES'
        || message.includes('EPERM')
        || message.includes('EACCES');
      expect(isSandboxListenBlock).toBe(true);
      return;
    }

    const capture = await createWsCapture(`${websocketBaseUrl}/ws?ticket=invalid`);
    expect(capture.closeCode).toBe(1008);
    expect(capture.messages[0]?.error).toBe('invalid_ticket_format');
  });

  it('rejects missing bearer auth when WS_REQUIRE_AUTH=true', async () => {
    if (startupError) {
      const code = (startupError as NodeJS.ErrnoException).code;
      const message = startupError.message || '';
      const isSandboxListenBlock =
        code === 'EPERM'
        || code === 'EACCES'
        || message.includes('EPERM')
        || message.includes('EACCES');
      expect(isSandboxListenBlock).toBe(true);
      return;
    }

    const capture = await createWsCapture(`${websocketBaseUrl}/ws`);
    expect(capture.closeCode).toBe(1008);
    expect(capture.messages[0]?.error).toBe('missing_bearer_auth');
  });

  it('rejects ticket/auth hash mismatch', async () => {
    if (startupError) {
      const code = (startupError as NodeJS.ErrnoException).code;
      const message = startupError.message || '';
      const isSandboxListenBlock =
        code === 'EPERM'
        || code === 'EACCES'
        || message.includes('EPERM')
        || message.includes('EACCES');
      expect(isSandboxListenBlock).toBe(true);
      return;
    }

    const ticket = await issueTicket({
      authToken: 'auth_user_a',
      conversationId: 'conv_ws_auth',
      interviewSessionId: 'int_ws_auth',
      voiceSessionId: 'voice_ws_auth',
    });

    const capture = await createWsCapture(
      `${websocketBaseUrl}/ws?ticket=${encodeURIComponent(ticket)}`,
      { headers: { authorization: 'Bearer auth_user_b' } },
    );

    expect(capture.closeCode).toBe(1008);
    expect(capture.messages[0]?.error).toBe('ticket_auth_mismatch');
  });

  it('closes when first valid client frame is not voice_session_open', async () => {
    if (startupError) {
      const code = (startupError as NodeJS.ErrnoException).code;
      const message = startupError.message || '';
      const isSandboxListenBlock =
        code === 'EPERM'
        || code === 'EACCES'
        || message.includes('EPERM')
        || message.includes('EACCES');
      expect(isSandboxListenBlock).toBe(true);
      return;
    }

    const authToken = 'auth_user_first_frame_gate';
    const ticket = await issueTicket({
      authToken,
      conversationId: 'conv_ws_first_frame_gate',
      interviewSessionId: 'int_ws_first_frame_gate',
      voiceSessionId: 'voice_ws_first_frame_gate',
    });

    const capture = await createWsCapture(
      `${websocketBaseUrl}/ws?ticket=${encodeURIComponent(ticket)}`,
      {
        headers: { authorization: `Bearer ${authToken}` },
        onOpen: (websocket) => {
          websocket.send(JSON.stringify({
            type: 'audio_chunk',
            audioBase64: 'Zm9v',
            mimeType: 'audio/m4a',
          }));
        },
      },
    );

    expect(capture.closeCode).toBe(1008);
    expect(capture.closeReason).toBe('first_frame_not_session_open');
    expect(
      capture.messages.some((message) => message.error === 'first_frame_must_be_voice_session_open'),
    ).toBe(true);
  });

  it('closes when handshake timeout expires before voice_session_open', async () => {
    if (startupError) {
      const code = (startupError as NodeJS.ErrnoException).code;
      const message = startupError.message || '';
      const isSandboxListenBlock =
        code === 'EPERM'
        || code === 'EACCES'
        || message.includes('EPERM')
        || message.includes('EACCES');
      expect(isSandboxListenBlock).toBe(true);
      return;
    }

    const authToken = 'auth_user_handshake_timeout';
    const ticket = await issueTicket({
      authToken,
      conversationId: 'conv_ws_handshake_timeout',
      interviewSessionId: 'int_ws_handshake_timeout',
      voiceSessionId: 'voice_ws_handshake_timeout',
    });

    const capture = await createWsCapture(
      `${websocketBaseUrl}/ws?ticket=${encodeURIComponent(ticket)}`,
      {
        headers: { authorization: `Bearer ${authToken}` },
        timeoutMs: 5_000,
      },
    );

    expect(capture.closeCode).toBe(1008);
    expect(capture.closeReason).toBe('session_open_timeout');
    expect(capture.messages.some((message) => message.error === 'voice_session_open_timeout')).toBe(true);
  });

  it('accepts valid ticket with matching bearer auth and emits gateway_ready', async () => {
    if (startupError) {
      const code = (startupError as NodeJS.ErrnoException).code;
      const message = startupError.message || '';
      const isSandboxListenBlock =
        code === 'EPERM'
        || code === 'EACCES'
        || message.includes('EPERM')
        || message.includes('EACCES');
      expect(isSandboxListenBlock).toBe(true);
      return;
    }

    const authToken = 'auth_user_happy_path';
    const ticket = await issueTicket({
      authToken,
      conversationId: 'conv_ws_happy',
      interviewSessionId: 'int_ws_happy',
      voiceSessionId: 'voice_ws_happy',
    });

    const connectedCapture = await new Promise<{
      messages: Array<Record<string, unknown>>;
      closeCode: number;
      closeReason: string;
    }>((resolve, reject) => {
      const messages: Array<Record<string, unknown>> = [];
      const websocket = new WebSocket(
        `${websocketBaseUrl}/ws?ticket=${encodeURIComponent(ticket)}`,
        { headers: { authorization: `Bearer ${authToken}` } },
      );
      const timeout = setTimeout(() => {
        websocket.terminate();
        reject(new Error('websocket_happy_path_timeout'));
      }, 4_000);

      websocket.on('message', (data) => {
        try {
          messages.push(JSON.parse(data.toString()) as Record<string, unknown>);
        } catch {
          messages.push({ raw: data.toString() });
        }
        if (messages.some((message) => message.type === 'gateway_ready')) {
          clearTimeout(timeout);
          websocket.close(1000, 'test_complete');
        }
      });

      websocket.on('close', (closeCode, closeReasonBuffer) => {
        clearTimeout(timeout);
        resolve({
          messages,
          closeCode,
          closeReason: closeReasonBuffer.toString(),
        });
      });

      websocket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    const gatewayReadyMessage = connectedCapture.messages.find(
      (message) => message.type === 'gateway_ready',
    );
    expect(gatewayReadyMessage).toBeTruthy();
    expect(gatewayReadyMessage?.policy).toMatchObject({
      version: 'voice_gateway_ready_policy_v1',
      maxPayloadBytes: 2_097_152,
      maxBufferedBytes: 1_048_576,
      heartbeat: {
        cadenceMs: 2_500,
        contractVersion: 'voice_relay_heartbeat_v1',
        sequenceGapTolerance: 0,
        stallTimeoutMs: 7_500,
      },
    });
    expect(connectedCapture.closeCode).toBe(1000);
  });
});
