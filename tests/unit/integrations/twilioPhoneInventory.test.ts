import { afterEach, describe, expect, it, vi } from "vitest";

import {
  listOrganizationTwilioIncomingPhoneNumbers,
  validateOrganizationTwilioPhoneNumber,
} from "../../../convex/integrations/twilio";

const ORG_ID = "organizations_marcus";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Twilio phone inventory and validation", () => {
  it("lists incoming Twilio phone numbers from the effective runtime binding", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          incoming_phone_numbers: [
            {
              sid: "PN1",
              phone_number: "+15551230000",
              friendly_name: "Marcus Demo Voice",
              capabilities: {
                voice: true,
                sms: true,
                mms: false,
              },
              voice_url: "https://example.com/voice",
              sms_url: "https://example.com/sms",
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await (listOrganizationTwilioIncomingPhoneNumbers as any)._handler(
      {
        runQuery: vi.fn(async () => ({
          userId: "users_1",
          organizationId: ORG_ID,
          isSuperAdmin: false,
        })),
        runAction: vi.fn(async () => ({
          accountSid: "AC_platform_9999",
          authToken: "platform_token",
          accountSidLast4: "9999",
          verifyServiceSid: "VA_MARCUS",
          smsPhoneNumber: "+15551230000",
          enabled: true,
          usePlatformCredentials: true,
          hasOrgCredentials: false,
          hasPlatformCredentials: true,
          source: "platform",
        })),
      },
      {
        sessionId: "sessions_1",
        organizationId: ORG_ID,
        pageSize: 10,
      },
    );

    expect(result).toMatchObject({
      success: true,
      source: "platform",
      accountSidLast4: "...9999",
      phoneNumbers: [
        {
          sid: "PN1",
          phoneNumber: "+15551230000",
          friendlyName: "Marcus Demo Voice",
          voiceEnabled: true,
          smsEnabled: true,
          mmsEnabled: false,
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/IncomingPhoneNumbers.json");
    expect(options).toMatchObject({
      headers: {
        Authorization: expect.stringContaining("Basic "),
      },
    });
  });

  it("validates a configured Twilio phone number against provider inventory", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          incoming_phone_numbers: [
            {
              sid: "PN_MATCH",
              phone_number: "+15551230000",
              friendly_name: "Marcus Demo Voice",
              capabilities: {
                voice: true,
                sms: false,
                mms: false,
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await (validateOrganizationTwilioPhoneNumber as any)._handler(
      {
        runQuery: vi.fn(async () => ({
          userId: "users_1",
          organizationId: ORG_ID,
          isSuperAdmin: false,
        })),
        runAction: vi.fn(async () => ({
          accountSid: "AC_org_1234",
          authToken: "org_token",
          accountSidLast4: "1234",
          verifyServiceSid: "VA_ORG",
          smsPhoneNumber: "+15551230000",
          enabled: true,
          usePlatformCredentials: false,
          hasOrgCredentials: true,
          hasPlatformCredentials: true,
          source: "org",
        })),
      },
      {
        sessionId: "sessions_1",
        organizationId: ORG_ID,
        phoneNumber: "+1 (555) 123-0000",
      },
    );

    expect(result).toMatchObject({
      success: true,
      valid: true,
      source: "org",
      phoneNumber: "+15551230000",
      match: {
        sid: "PN_MATCH",
        phoneNumber: "+15551230000",
        friendlyName: "Marcus Demo Voice",
        voiceEnabled: true,
        smsEnabled: false,
        mmsEnabled: false,
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
