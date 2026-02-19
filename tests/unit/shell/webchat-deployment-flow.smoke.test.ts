import { describe, expect, it, vi } from "vitest";
import {
  runWebchatDeploymentSmoke,
  type WebchatDeploymentSmokeOptions,
} from "../../helpers/webchat-deployment-smoke";

const bootstrapFixture = {
  contractVersion: "2026-02-18.webchat-bootstrap.v1",
  resolvedAt: 1730000000000,
  channel: "webchat",
  organizationId: "org_123",
  agentId: "agent_abc",
  config: {
    agentId: "agent_abc",
    agentName: "Support Agent",
    welcomeMessage: "Welcome",
    brandColor: "#1d4ed8",
    position: "bottom-right",
    collectContactInfo: true,
    bubbleText: "Chat",
    offlineMessage: "Offline",
    language: "en",
  },
  deploymentDefaults: {
    snippetMode: "script",
    iframe: {
      width: 420,
      height: 620,
      offsetPx: 24,
      position: "bottom-right",
    },
  },
} as const;

const configFixture = {
  ...bootstrapFixture.config,
  channel: "webchat",
  contractVersion: bootstrapFixture.contractVersion,
  customizationFields: [
    "welcomeMessage",
    "brandColor",
    "position",
    "collectContactInfo",
    "bubbleText",
    "offlineMessage",
    "language",
  ],
} as const;

function createOptions(fetchImpl: typeof fetch): WebchatDeploymentSmokeOptions {
  return {
    appBaseUrl: "https://app.l4yercak3.com/",
    agentId: "agent_abc",
    channel: "webchat",
    message: "How can I deploy this?",
    fetchImpl,
  };
}

describe("webchat deployment flow smoke", () => {
  it("executes bootstrap -> snippet copy -> config fetch -> message send in order", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(bootstrapFixture), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(configFixture), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sessionToken: "wc_session_123",
            response: "Deployed!",
            agentName: "Support Agent",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    const result = await runWebchatDeploymentSmoke(createOptions(fetchMock));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://app.l4yercak3.com/api/v1/webchat/bootstrap/agent_abc?channel=webchat",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://app.l4yercak3.com/api/v1/webchat/config/agent_abc?channel=webchat",
    );
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://app.l4yercak3.com/api/v1/webchat/message");

    const thirdCallInit = fetchMock.mock.calls[2]?.[1] as RequestInit;
    expect(thirdCallInit.method).toBe("POST");
    expect(typeof thirdCallInit.body).toBe("string");
    expect(JSON.parse(String(thirdCallInit.body))).toMatchObject({
      agentId: "agent_abc",
      message: "How can I deploy this?",
    });

    expect(result.copiedSnippet).toContain('data-agent-id="agent_abc"');
    expect(result.copiedSnippet).toContain('data-channel="webchat"');
    expect(result.config.agentId).toBe("agent_abc");
    expect(result.message.sessionToken).toBe("wc_session_123");
    expect(result.message.response).toBe("Deployed!");
  });

  it("fails fast when message response misses sessionToken", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(bootstrapFixture), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(configFixture), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            response: "Missing token",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    await expect(runWebchatDeploymentSmoke(createOptions(fetchMock))).rejects.toThrow(
      "Missing required message field: sessionToken",
    );
  });
});
