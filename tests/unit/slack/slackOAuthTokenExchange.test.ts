import { describe, expect, it, vi } from "vitest";
import { exchangeSlackToken } from "../../../convex/oauth/slack";

describe("Slack OAuth token exchange error handling", () => {
  it("retries with fallback client secret on invalid_client", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false, error: "invalid_client" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: true, access_token: "xoxb-test", team: { id: "T123" } }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

    const tokenData = await exchangeSlackToken(
      { code: "code-1", redirectUri: "https://app.example.com/callback" },
      {
        clientId: "client-id",
        clientSecretCandidates: ["primary-secret", "fallback-secret"],
        fetchImpl: fetchMock as unknown as typeof fetch,
      }
    );

    expect(tokenData.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstRequestBody = String((fetchMock.mock.calls[0][1] as RequestInit).body);
    const secondRequestBody = String((fetchMock.mock.calls[1][1] as RequestInit).body);
    expect(firstRequestBody).toContain("client_secret=primary-secret");
    expect(secondRequestBody).toContain("client_secret=fallback-secret");
  });

  it("throws immediately for non-retryable Slack OAuth errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "invalid_code" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      exchangeSlackToken(
        { code: "bad-code", redirectUri: "https://app.example.com/callback" },
        {
          clientId: "client-id",
          clientSecretCandidates: ["primary-secret", "fallback-secret"],
          fetchImpl: fetchMock as unknown as typeof fetch,
        }
      )
    ).rejects.toThrow("Slack OAuth error: invalid_code");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces HTTP status when OAuth response payload is not JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("upstream error", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      })
    );

    await expect(
      exchangeSlackToken(
        { code: "code-2", redirectUri: "https://app.example.com/callback" },
        {
          clientId: "client-id",
          clientSecretCandidates: ["primary-secret"],
          fetchImpl: fetchMock as unknown as typeof fetch,
        }
      )
    ).rejects.toThrow("Slack OAuth error: http_502");
  });

  it("throws when Slack OAuth credentials are missing", async () => {
    await expect(
      exchangeSlackToken(
        { code: "code-3", redirectUri: "https://app.example.com/callback" },
        {
          clientId: "",
          clientSecretCandidates: [],
        }
      )
    ).rejects.toThrow("Slack OAuth client credentials are not configured");
  });
});
