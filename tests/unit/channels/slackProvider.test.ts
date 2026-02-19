import { afterEach, describe, expect, it, vi } from "vitest";
import { slackProvider } from "../../../convex/channels/providers/slackProvider";

describe("slackProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends top-level channel posts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, ts: "1700000000.100" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await slackProvider.sendMessage(
      { providerId: "slack", slackBotToken: "xoxb-test" },
      {
        channel: "slack",
        recipientIdentifier: "C123ABC",
        content: "hello channel",
      }
    );

    expect(result).toEqual({
      success: true,
      providerMessageId: "1700000000.100",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body)
    ) as Record<string, unknown>;
    expect(payload.channel).toBe("C123ABC");
    expect(payload.text).toBe("hello channel");
    expect(payload.thread_ts).toBeUndefined();
  });

  it("treats user-scoped recipient identifiers as top-level channel posts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, ts: "1700000000.101" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await slackProvider.sendMessage(
      { providerId: "slack", slackBotToken: "xoxb-test" },
      {
        channel: "slack",
        recipientIdentifier: "slack:C123ABC:user:U123",
        content: "hello top-level",
      }
    );

    expect(result.success).toBe(true);
    const payload = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body)
    ) as Record<string, unknown>;
    expect(payload.channel).toBe("C123ABC");
    expect(payload.thread_ts).toBeUndefined();
  });

  it("treats malformed conversation identifiers as top-level channel posts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, ts: "1700000000.102" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await slackProvider.sendMessage(
      { providerId: "slack", slackBotToken: "xoxb-test" },
      {
        channel: "slack",
        recipientIdentifier: "slack:C123ABC:not-a-thread-ts",
        content: "hello malformed identifier",
      }
    );

    expect(result.success).toBe(true);
    const payload = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body)
    ) as Record<string, unknown>;
    expect(payload.channel).toBe("C123ABC");
    expect(payload.thread_ts).toBeUndefined();
  });

  it("sends thread replies using conversation metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, ts: "1700000001.200" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await slackProvider.sendMessage(
      { providerId: "slack", slackBotToken: "xoxb-test" },
      {
        channel: "slack",
        recipientIdentifier: "slack:C123ABC:1700000000.100",
        content: "reply in thread",
        metadata: {
          providerConversationId: "1700000000.100",
        },
      }
    );

    expect(result.success).toBe(true);
    const payload = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body)
    ) as Record<string, unknown>;
    expect(payload.channel).toBe("C123ABC");
    expect(payload.thread_ts).toBe("1700000000.100");
  });

  it("surfaces Slack rate limits as retryable with retry-after delay", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "ratelimited" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "retry-after": "2",
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await slackProvider.sendMessage(
      { providerId: "slack", slackBotToken: "xoxb-test" },
      {
        channel: "slack",
        recipientIdentifier: "C123ABC",
        content: "hello channel",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("ratelimited");
    expect(result.retryable).toBe(true);
    expect(result.statusCode).toBe(429);
    expect(result.retryAfterMs).toBe(2000);
  });

  it("marks non-rate-limit Slack API errors as non-retryable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "channel_not_found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await slackProvider.sendMessage(
      { providerId: "slack", slackBotToken: "xoxb-test" },
      {
        channel: "slack",
        recipientIdentifier: "C123ABC",
        content: "hello channel",
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("channel_not_found");
    expect(result.retryable).toBe(false);
  });

  it("ignores self-originated inbound events", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "Ev111",
        event: {
          type: "message",
          user: "U-BOT",
          text: "echo",
          channel: "C123ABC",
          ts: "1700000002.000",
        },
      },
      {
        providerId: "slack",
        slackBotUserId: "U-BOT",
      }
    );

    expect(normalized).toBeNull();
  });

  it("normalizes top-level app mentions for top-level channel replies", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvTop1",
        event: {
          type: "app_mention",
          user: "U123",
          text: "<@U-BOT> check order 42",
          channel: "C123ABC",
          ts: "1700000100.123",
        },
      },
      { providerId: "slack", slackBotUserId: "U-BOT" }
    );

    expect(normalized).not.toBeNull();
    expect(normalized?.externalContactIdentifier).toBe("slack:C123ABC:user:U123");
    expect(normalized?.message).toBe("check order 42");
    expect(normalized?.metadata.providerConversationId).toBeUndefined();
    expect((normalized?.metadata as Record<string, unknown>).slackResponseMode).toBe(
      "top_level"
    );
  });
});
