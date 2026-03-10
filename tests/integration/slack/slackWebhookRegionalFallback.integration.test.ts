import { afterEach, describe, expect, it, vi } from "vitest";
import {
  processSlackEvent,
  processSlackSlashCommand,
} from "../../../convex/channels/webhooks";
import { slackProvider } from "../../../convex/channels/providers/slackProvider";

describe("Slack webhook regional-settings fallback integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("injects org main timezone/dateFormat into processSlackEvent normalization credentials", async () => {
    const normalizeSpy = vi
      .spyOn(slackProvider, "normalizeInbound")
      .mockReturnValue(null);
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce("org_test")
      .mockResolvedValueOnce({
        customProperties: {
          timezone: "UTC",
          dateFormat: "MM/DD/YYYY",
        },
      })
      .mockResolvedValueOnce(null);
    const runMutation = vi.fn().mockResolvedValue(undefined);

    const result = await (processSlackEvent as any)._handler(
      {
        runQuery,
        runMutation,
        runAction: vi.fn(),
      },
      {
        payload: JSON.stringify({
          type: "event_callback",
          team_id: "T123",
          event_id: "EvRegional1",
          event: {
            type: "app_mention",
            channel: "C123",
            user: "U123",
            text: "<@U-BOT> vacation next week",
            ts: "1710115200.000",
          },
        }),
        teamId: "T123",
        receivedAt: Date.UTC(2024, 2, 13, 12, 0, 0),
      }
    );

    expect(result.status).toBe("skipped");
    expect(runQuery).toHaveBeenCalledTimes(3);
    expect(runQuery.mock.calls[1][1]).toEqual({
      organizationId: "org_test",
      subtype: "main",
    });
    expect(normalizeSpy).toHaveBeenCalledTimes(1);
    const injectedCredentials = normalizeSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(injectedCredentials.providerId).toBe("slack");
    expect(injectedCredentials.slackFallbackTimezone).toBe("UTC");
    expect(injectedCredentials.slackFallbackDateFormat).toBe("MM/DD/YYYY");
  });

  it("injects org main timezone/dateFormat into processSlackSlashCommand normalization credentials", async () => {
    const normalizeSpy = vi
      .spyOn(slackProvider, "normalizeInbound")
      .mockReturnValue(null);
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce("org_test")
      .mockResolvedValueOnce({
        customProperties: {
          timezone: "UTC",
          dateFormat: "MM/DD/YYYY",
        },
      })
      .mockResolvedValueOnce({
        providerId: "slack",
        slackBotToken: "xoxb-test",
      });
    const runMutation = vi.fn().mockResolvedValue(undefined);

    const result = await (processSlackSlashCommand as any)._handler(
      {
        runQuery,
        runMutation,
        runAction: vi.fn(),
      },
      {
        teamId: "T123",
        channelId: "C123",
        userId: "U123",
        userName: "alice",
        command: "/vacation",
        text: "next month",
        receivedAt: Date.UTC(2024, 2, 13, 12, 0, 0),
      }
    );

    expect(result.status).toBe("error");
    expect(result.message).toBe("Unable to normalize Slack slash command payload");
    expect(runQuery).toHaveBeenCalledTimes(3);
    expect(runQuery.mock.calls[1][1]).toEqual({
      organizationId: "org_test",
      subtype: "main",
    });
    expect(normalizeSpy).toHaveBeenCalledTimes(1);
    const injectedCredentials = normalizeSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(injectedCredentials.providerId).toBe("slack");
    expect(injectedCredentials.slackFallbackTimezone).toBe("UTC");
    expect(injectedCredentials.slackFallbackDateFormat).toBe("MM/DD/YYYY");
    expect(injectedCredentials.slackBotToken).toBe("xoxb-test");
  });
});
