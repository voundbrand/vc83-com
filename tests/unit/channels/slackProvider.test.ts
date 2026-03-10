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

  it("ignores generic message events when interaction mode is mentions-only", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvDmOff1",
        event: {
          type: "message",
          user: "U123",
          text: "hello in dm",
          channel: "D123ABC",
          channel_type: "im",
          ts: "1700000200.200",
        },
      },
      {
        providerId: "slack",
        slackInteractionMode: "mentions_only",
      }
    );

    expect(normalized).toBeNull();
  });

  it("normalizes direct message events when interaction mode enables DMs", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvDmOn1",
        event: {
          type: "message",
          user: "U123",
          text: "hello in dm",
          channel: "D123ABC",
          channel_type: "im",
          ts: "1700000300.300",
        },
      },
      {
        providerId: "slack",
        slackInteractionMode: "mentions_and_dm",
      }
    );

    expect(normalized).not.toBeNull();
    expect(normalized?.externalContactIdentifier).toBe("slack:D123ABC:user:U123");
    expect(normalized?.message).toBe("hello in dm");
    expect((normalized?.metadata as Record<string, unknown>).slackInvocationType).toBe(
      "message"
    );
  });

  it("captures assistant thread metadata for AI app direct messages", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvDmAi1",
        event: {
          type: "message",
          user: "U123",
          text: "summarize this thread",
          channel: "D123ABC",
          channel_type: "im",
          ts: "1700000300.300",
          assistant_thread: {
            thread_ts: "1700000999.123",
            title: "Issue triage",
            action_token: "xapp-action-token",
            context: {
              channel_id: "C777",
              team_id: "T777",
              enterprise_id: "E777",
            },
          },
        },
      },
      {
        providerId: "slack",
        slackInteractionMode: "mentions_and_dm",
      }
    );

    expect(normalized).not.toBeNull();
    expect(normalized?.externalContactIdentifier).toBe("slack:D123ABC:1700000999.123");
    expect((normalized?.metadata as Record<string, unknown>).slackAiAppMessage).toBe(
      true
    );
    expect((normalized?.metadata as Record<string, unknown>).slackAssistantThreadTs).toBe(
      "1700000999.123"
    );
    expect((normalized?.metadata as Record<string, unknown>).slackAssistantThreadTitle).toBe(
      "Issue triage"
    );
    expect(
      (normalized?.metadata as Record<string, unknown>).slackAssistantContextChannelId
    ).toBe("C777");
    expect((normalized?.metadata as Record<string, unknown>).slackAssistantContextTeamId).toBe(
      "T777"
    );
    expect(
      (normalized?.metadata as Record<string, unknown>).slackAssistantContextEnterpriseId
    ).toBe("E777");
    expect((normalized?.metadata as Record<string, unknown>).slackAssistantHasActionToken).toBe(
      true
    );
    const raw = (normalized?.metadata as Record<string, unknown>).raw as Record<
      string,
      unknown
    >;
    const rawEvent = raw.event as Record<string, unknown>;
    const rawAssistantThread = rawEvent.assistant_thread as Record<string, unknown>;
    expect(rawAssistantThread.action_token).toBe("[REDACTED]");
  });

  it("ignores non-DM message events even when DM mode is enabled", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvDmOn2",
        event: {
          type: "message",
          user: "U123",
          text: "hello in channel",
          channel: "C123ABC",
          channel_type: "channel",
          ts: "1700000400.400",
        },
      },
      {
        providerId: "slack",
        slackInteractionMode: "mentions_and_dm",
      }
    );

    expect(normalized).toBeNull();
  });

  it("parses mention vacation requests with deterministic ISO date ranges", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvVacationMention1",
        event: {
          type: "app_mention",
          user: "U123",
          text: "<@U-BOT> vacation 2026-07-10 to 2026-07-14",
          channel: "C123ABC",
          ts: "1700000600.600",
        },
      },
      { providerId: "slack", slackBotUserId: "U-BOT" }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2026-07-10");
    expect(metadata.slackVacationRequestEndDate).toBe("2026-07-14");
    expect(metadata.slackVacationRequestBlockedReasons).toEqual([]);
  });

  it("parses mention vacation requests with deterministic US date ranges", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvVacationMentionUs1",
        event: {
          type: "app_mention",
          user: "U123",
          text: "<@U-BOT> pto 07/10/2026 to 07/14/2026",
          channel: "C123ABC",
          ts: "1700000601.600",
        },
      },
      { providerId: "slack", slackBotUserId: "U-BOT" }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2026-07-10");
    expect(metadata.slackVacationRequestEndDate).toBe("2026-07-14");
    expect(metadata.slackVacationRequestBlockedReasons).toEqual([]);
  });

  it("parses mention vacation requests with relative next-week range when UTC zone is explicit", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvVacationMentionRelative1",
        event: {
          type: "app_mention",
          user: "U123",
          text: "<@U-BOT> vacation next week timezone:UTC",
          channel: "C123ABC",
          ts: "1710115200.000",
        },
      },
      { providerId: "slack", slackBotUserId: "U-BOT" }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2024-03-18");
    expect(metadata.slackVacationRequestEndDate).toBe("2024-03-24");
    expect(metadata.slackVacationRequestBlockedReasons).toEqual([]);
  });

  it("fails closed for relative next-week mention requests without explicit timezone", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvVacationMentionRelative2",
        event: {
          type: "app_mention",
          user: "U123",
          text: "<@U-BOT> pto next week",
          channel: "C123ABC",
          ts: "1710115200.000",
        },
      },
      { providerId: "slack", slackBotUserId: "U-BOT" }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("blocked");
    expect(metadata.slackVacationRequestBlockedReasons).toContain(
      "missing_relative_timezone"
    );
  });

  it("parses relative next-week mention requests with org timezone fallback when text timezone is absent", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvVacationMentionRelativeFallback1",
        event: {
          type: "app_mention",
          user: "U123",
          text: "<@U-BOT> pto next week",
          channel: "C123ABC",
          ts: "1710115200.000",
        },
      },
      {
        providerId: "slack",
        slackBotUserId: "U-BOT",
        slackFallbackTimezone: "UTC",
        slackFallbackDateFormat: "MM/DD/YYYY",
      }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2024-03-18");
    expect(metadata.slackVacationRequestEndDate).toBe("2024-03-24");
    expect(metadata.slackVacationRequestRelativeTimezoneSource).toBe(
      "organization_settings"
    );
    expect(metadata.slackVacationRequestRelativeTimezone).toBe("UTC");
    expect(metadata.slackVacationRequestFallbackDateFormat).toBe("MM/DD/YYYY");
    expect(metadata.slackVacationRequestBlockedReasons).toEqual([]);
  });

  it("parses mention vacation requests with relative this-week range when UTC zone is explicit", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvVacationMentionRelativeThisWeek1",
        event: {
          type: "app_mention",
          user: "U123",
          text: "<@U-BOT> vacation this week timezone:UTC",
          channel: "C123ABC",
          ts: "1710115200.000",
        },
      },
      { providerId: "slack", slackBotUserId: "U-BOT" }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2024-03-11");
    expect(metadata.slackVacationRequestEndDate).toBe("2024-03-17");
    expect(metadata.slackVacationRequestBlockedReasons).toEqual([]);
  });

  it("fails closed for mention vacation requests without deterministic dates", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "event_callback",
        event_id: "EvVacationMention2",
        event: {
          type: "app_mention",
          user: "U123",
          text: "<@U-BOT> can I take vacation next week?",
          channel: "C123ABC",
          ts: "1700000700.700",
        },
      },
      { providerId: "slack", slackBotUserId: "U-BOT" }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("blocked");
    expect(metadata.slackVacationRequestBlockedReasons).toContain("missing_iso_date");
  });

  it("normalizes slash-command vacation requests through provider parsing", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "slash_command",
        team_id: "T123",
        channel_id: "C123ABC",
        user_id: "U123",
        user_name: "alice",
        command: "/vacation",
        text: "2026-08-01 to 2026-08-03",
        trigger_id: "Trig123",
      },
      { providerId: "slack" }
    );

    expect(normalized).not.toBeNull();
    expect(normalized?.message).toBe("2026-08-01 to 2026-08-03");
    expect(normalized?.externalContactIdentifier).toBe("slack:C123ABC:user:U123");
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackInvocationType).toBe("slash_command");
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2026-08-01");
    expect(metadata.slackVacationRequestEndDate).toBe("2026-08-03");
  });

  it("fails closed for ambiguous slash-command vacation date ranges", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "slash_command",
        team_id: "T123",
        channel_id: "C123ABC",
        user_id: "U123",
        user_name: "alice",
        command: "/vacation",
        text: "2026-09-01 2026-09-02 2026-09-03",
        trigger_id: "Trig124",
      },
      { providerId: "slack" }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("blocked");
    expect(metadata.slackVacationRequestBlockedReasons).toContain(
      "ambiguous_date_range"
    );
  });

  it("parses slash-command next-week requests when anchor time and timezone are explicit", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "slash_command",
        team_id: "T123",
        channel_id: "C123ABC",
        user_id: "U123",
        user_name: "alice",
        command: "/vacation",
        text: "next week tz:UTC",
        trigger_id: "Trig125",
        received_at_ms: Date.UTC(2024, 2, 13, 12, 0, 0),
      },
      { providerId: "slack" }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2024-03-18");
    expect(metadata.slackVacationRequestEndDate).toBe("2024-03-24");
    expect(metadata.slackVacationRequestBlockedReasons).toEqual([]);
  });

  it("parses slash-command next-month requests when anchor time and timezone are explicit", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "slash_command",
        team_id: "T123",
        channel_id: "C123ABC",
        user_id: "U123",
        user_name: "alice",
        command: "/vacation",
        text: "next month tz:UTC",
        trigger_id: "Trig126",
        received_at_ms: Date.UTC(2024, 2, 13, 12, 0, 0),
      },
      { providerId: "slack" }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2024-04-01");
    expect(metadata.slackVacationRequestEndDate).toBe("2024-04-30");
    expect(metadata.slackVacationRequestBlockedReasons).toEqual([]);
  });

  it("parses slash-command next-month requests with org timezone fallback when text timezone is absent", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "slash_command",
        team_id: "T123",
        channel_id: "C123ABC",
        user_id: "U123",
        user_name: "alice",
        command: "/vacation",
        text: "next month",
        trigger_id: "Trig126b",
        received_at_ms: Date.UTC(2024, 2, 13, 12, 0, 0),
      },
      {
        providerId: "slack",
        slackFallbackTimezone: "UTC",
        slackFallbackDateFormat: "MM/DD/YYYY",
      }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("parsed");
    expect(metadata.slackVacationRequestStartDate).toBe("2024-04-01");
    expect(metadata.slackVacationRequestEndDate).toBe("2024-04-30");
    expect(metadata.slackVacationRequestRelativeTimezoneSource).toBe(
      "organization_settings"
    );
    expect(metadata.slackVacationRequestRelativeTimezone).toBe("UTC");
    expect(metadata.slackVacationRequestFallbackDateFormat).toBe("MM/DD/YYYY");
    expect(metadata.slackVacationRequestBlockedReasons).toEqual([]);
  });

  it("fails closed for slash-command next-month requests without deterministic anchor time", () => {
    const normalized = slackProvider.normalizeInbound(
      {
        type: "slash_command",
        team_id: "T123",
        channel_id: "C123ABC",
        user_id: "U123",
        user_name: "alice",
        command: "/vacation",
        text: "next month tz:UTC",
        trigger_id: "Trig127",
      },
      { providerId: "slack" }
    );

    expect(normalized).not.toBeNull();
    const metadata = (normalized?.metadata || {}) as Record<string, unknown>;
    expect(metadata.slackVacationRequestDetected).toBe(true);
    expect(metadata.slackVacationRequestStatus).toBe("blocked");
    expect(metadata.slackVacationRequestBlockedReasons).toContain(
      "missing_relative_anchor_time"
    );
    expect(metadata.slackVacationRequestBlockedReasons).toContain("missing_iso_date");
  });
});
