import { afterEach, describe, expect, it, vi } from "vitest";

import { directCallProvider } from "../../../convex/channels/providers/directCallProvider";

afterEach(() => {
  delete process.env.CONVEX_SITE_URL;
  delete process.env.NEXT_PUBLIC_API_ENDPOINT_URL;
  delete process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  vi.unstubAllGlobals();
});

describe("twilio_voice direct telephony transport", () => {
  it("initiates outbound calls through Twilio Calls.json with app-managed status callbacks", async () => {
    process.env.CONVEX_SITE_URL = "https://demo.convex.site";

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          sid: "CA123",
          status: "queued",
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await directCallProvider.sendMessage(
      {
        providerId: "direct",
        telephonyProviderIdentity: "twilio_voice",
        telephonyRouteKeyPolicy: "twilio_voice_v1",
        providerConnectionId: "org_1_twilio_voice",
        providerInstallationId: "phone_call_default",
        providerProfileType: "organization",
        bindingRouteKey: "twilio:phone:org_1_twilio_voice:phone_call_default",
        twilioAccountSid: "AC123",
        twilioAuthToken: "auth_token_123",
        twilioVoiceFromNumber: "+15551230000",
        twilioVoiceWebhookSecret: "telephony_secret",
      },
      {
        channel: "phone_call",
        recipientIdentifier: "+15557654321",
        content: "Hello Marcus, this is Anne Becker calling back.",
        metadata: {
          idempotencyKey: "call_123",
        },
      },
    );

    expect(result).toMatchObject({
      success: true,
      providerMessageId: "CA123",
      telephony: {
        providerCallId: "CA123",
        outcome: "queued",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.twilio.com/2010-04-01/Accounts/AC123/Calls.json");
    expect(options).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: expect.stringContaining("Basic "),
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": "call_123",
      }),
    });

    const body = new URLSearchParams(String(options?.body ?? ""));
    expect(body.get("To")).toBe("+15557654321");
    expect(body.get("From")).toBe("+15551230000");
    expect(body.get("StatusCallback")).toBe(
      "https://demo.convex.site/webhooks/twilio/voice/status?routeKey=twilio%3Aphone%3Aorg_1_twilio_voice%3Aphone_call_default&secret=telephony_secret",
    );
    expect(body.get("Twiml")).toContain("Anne Becker calling back");
  });
});
