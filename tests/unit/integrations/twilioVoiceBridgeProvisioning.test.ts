import { afterEach, describe, expect, it, vi } from "vitest";

import {
  applyOrganizationTwilioVoiceNumberBinding,
  validateOrganizationTwilioVoiceNumberBinding,
} from "../../../convex/integrations/twilio";

type FakeRow = Record<string, any> & { _id: string };

class FakeQuery {
  private filters = new Map<string, unknown>();

  constructor(private readonly rows: FakeRow[]) {}

  withIndex(
    _indexName: string,
    build: (q: { eq: (field: string, value: unknown) => unknown }) => unknown,
  ) {
    const query = {
      eq: (field: string, value: unknown) => {
        this.filters.set(field, value);
        return query;
      },
    };
    build(query);
    return this;
  }

  async first() {
    return this.apply()[0] ?? null;
  }

  async collect() {
    return this.apply();
  }

  private apply() {
    return this.rows.filter((row) => {
      for (const [field, value] of this.filters) {
        if (row[field] !== value) {
          return false;
        }
      }
      return true;
    });
  }
}

class FakeDb {
  private readonly tables = new Map<string, FakeRow[]>();
  private insertCounter = 0;

  seed(table: string, row: FakeRow) {
    this.table(table).push(JSON.parse(JSON.stringify(row)));
  }

  query(table: string) {
    return new FakeQuery(this.table(table));
  }

  async patch(id: string, patch: Record<string, unknown>) {
    for (const rows of this.tables.values()) {
      const found = rows.find((row) => row._id === id);
      if (!found) {
        continue;
      }
      Object.assign(found, JSON.parse(JSON.stringify(patch)));
      return;
    }
    throw new Error(`Document not found for patch: ${id}`);
  }

  async insert(table: string, doc: Record<string, unknown>) {
    const id = `${table}_${++this.insertCounter}`;
    this.table(table).push(
      JSON.parse(
        JSON.stringify({
          _id: id,
          ...doc,
        }),
      ),
    );
    return id;
  }

  rows(table: string) {
    return this.table(table).map((row) => JSON.parse(JSON.stringify(row)));
  }

  private table(name: string) {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }
}

const ORG_ID = "organizations_marcus";

afterEach(() => {
  delete process.env.CONVEX_SITE_URL;
  delete process.env.NEXT_PUBLIC_API_ENDPOINT_URL;
  delete process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  vi.unstubAllGlobals();
});

describe("Twilio voice bridge provisioning", () => {
  it("applies inbound and status webhook URLs to a live Twilio incoming number", async () => {
    process.env.CONVEX_SITE_URL = "https://demo.convex.site";
    const db = new FakeDb();
    db.seed("objects", {
      _id: "objects_direct_settings",
      organizationId: ORG_ID,
      type: "direct_settings",
      name: "Telephony Routing Settings",
      status: "active",
      customProperties: {
        providerId: "direct",
        providerKey: "twilio_voice",
        telephonyProviderIdentity: "twilio_voice",
        providerConnectionId: "org_marcus_twilio_voice",
        providerInstallationId: "phone_call_default",
        providerProfileId: "customer_telephony",
        routeKey: "twilio:phone:org_marcus_twilio_voice:phone_call_default",
        bindingRouteKey: "twilio:phone:org_marcus_twilio_voice:phone_call_default",
        twilioVoiceFromNumber: "+15551230000",
        twilioVoiceWebhookSecret: "secret_123",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any);
    db.seed("objects", {
      _id: "objects_phone_binding",
      organizationId: ORG_ID,
      type: "channel_provider_binding",
      name: "Phone Call Channel Binding",
      status: "active",
      customProperties: {
        channel: "phone_call",
        providerId: "direct",
        providerKey: "twilio_voice",
        enabled: true,
        routeKey: "twilio:phone:org_marcus_twilio_voice:phone_call_default",
        telephonyProviderIdentity: "twilio_voice",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any);

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sid: "PN123",
            phone_number: "+15551230000",
            friendly_name: "Marcus Demo Voice",
            capabilities: { voice: true, sms: true, mms: false },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sid: "PN123",
            voice_url:
              "https://demo.convex.site/webhooks/twilio/voice/inbound?routeKey=twilio%3Aphone%3Aorg_marcus_twilio_voice%3Aphone_call_default&secret=secret_123",
            status_callback:
              "https://demo.convex.site/webhooks/twilio/voice/status?routeKey=twilio%3Aphone%3Aorg_marcus_twilio_voice%3Aphone_call_default&secret=secret_123",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await (applyOrganizationTwilioVoiceNumberBinding as any)._handler(
      {
        runQuery: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
          if ("sessionId" in payload) {
            return {
              userId: "users_1",
              organizationId: ORG_ID,
              isSuperAdmin: true,
            };
          }
          return {
            directSettingsId: "objects_direct_settings",
            providerKey: "twilio_voice",
            providerIdentity: "twilio_voice",
            enabled: true,
            routeKey: "twilio:phone:org_marcus_twilio_voice:phone_call_default",
            fromNumber: "+15551230000",
            webhookSecret: "secret_123",
            incomingNumberSid: null,
            directProps: {
              providerId: "direct",
              providerKey: "twilio_voice",
              telephonyProviderIdentity: "twilio_voice",
              providerConnectionId: "org_marcus_twilio_voice",
              providerInstallationId: "phone_call_default",
              providerProfileId: "customer_telephony",
              routeKey: "twilio:phone:org_marcus_twilio_voice:phone_call_default",
              bindingRouteKey: "twilio:phone:org_marcus_twilio_voice:phone_call_default",
              twilioVoiceFromNumber: "+15551230000",
              twilioVoiceWebhookSecret: "secret_123",
            },
          };
        }),
        runAction: vi.fn(async () => ({
          accountSid: "AC123",
          authToken: "auth_123",
          accountSidLast4: "0123",
          enabled: true,
          usePlatformCredentials: true,
          hasOrgCredentials: false,
          hasPlatformCredentials: true,
          source: "platform",
        })),
        runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
          await db.patch(String(payload.directSettingsId), {
            customProperties: {
              ...(payload.directProps as Record<string, unknown>),
              providerKey: "twilio_voice",
              telephonyProviderIdentity: "twilio_voice",
              twilioVoiceFromNumber: payload.phoneNumber,
              directCallFromNumber: payload.phoneNumber,
              elevenTelephonyFromNumber: payload.phoneNumber,
              twilioVoiceIncomingNumberSid: payload.phoneNumberSid,
              twilioVoiceInboundWebhookUrl: payload.inboundWebhookUrl,
              twilioVoiceStatusCallbackUrl: payload.statusCallbackUrl,
              twilioVoiceWebhookAppliedAt: payload.appliedAt,
            },
            updatedAt: payload.appliedAt,
          });
          await db.insert("objectActions", {
            organizationId: payload.organizationId,
            objectId: payload.directSettingsId,
            actionType: "twilio_voice_number_binding_applied",
            actionData: {
              phoneNumberSid: payload.phoneNumberSid,
              phoneNumber: payload.phoneNumber,
              inboundWebhookUrl: payload.inboundWebhookUrl,
              statusCallbackUrl: payload.statusCallbackUrl,
              runtimeSource: payload.runtimeSource,
            },
            performedBy: payload.userId,
            performedAt: payload.appliedAt,
          });
        }),
      },
      {
        sessionId: "sessions_1",
        organizationId: ORG_ID,
        phoneNumberSid: "PN123",
      },
    );

    expect(result).toMatchObject({
      success: true,
      applied: true,
      phoneNumberSid: "PN123",
      phoneNumber: "+15551230000",
      inboundWebhookUrl:
        "https://demo.convex.site/webhooks/twilio/voice/inbound?routeKey=twilio%3Aphone%3Aorg_marcus_twilio_voice%3Aphone_call_default&secret=secret_123",
      statusCallbackUrl:
        "https://demo.convex.site/webhooks/twilio/voice/status?routeKey=twilio%3Aphone%3Aorg_marcus_twilio_voice%3Aphone_call_default&secret=secret_123",
    });

    const [, updateOptions] = fetchMock.mock.calls[1] ?? [];
    const body = new URLSearchParams(String(updateOptions?.body ?? ""));
    expect(body.get("VoiceUrl")).toContain("/webhooks/twilio/voice/inbound");
    expect(body.get("StatusCallback")).toContain("/webhooks/twilio/voice/status");

    const directSettings = db.rows("objects").find((row) => row._id === "objects_direct_settings");
    expect(directSettings?.customProperties?.twilioVoiceIncomingNumberSid).toBe("PN123");
    expect(directSettings?.customProperties?.twilioVoiceInboundWebhookUrl).toContain(
      "/webhooks/twilio/voice/inbound",
    );
  });

  it("validates the live Twilio number against the expected app-managed webhook URLs", async () => {
    process.env.CONVEX_SITE_URL = "https://demo.convex.site";
    const db = new FakeDb();
    db.seed("objects", {
      _id: "objects_direct_settings",
      organizationId: ORG_ID,
      type: "direct_settings",
      name: "Telephony Routing Settings",
      status: "active",
      customProperties: {
        providerId: "direct",
        providerKey: "twilio_voice",
        telephonyProviderIdentity: "twilio_voice",
        routeKey: "twilio:phone:org_marcus_twilio_voice:phone_call_default",
        twilioVoiceFromNumber: "+15551230000",
        twilioVoiceWebhookSecret: "secret_123",
        twilioVoiceIncomingNumberSid: "PN123",
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any);

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          sid: "PN123",
          phone_number: "+15551230000",
          friendly_name: "Marcus Demo Voice",
          capabilities: { voice: true, sms: true, mms: false },
          voice_url:
            "https://demo.convex.site/webhooks/twilio/voice/inbound?routeKey=twilio%3Aphone%3Aorg_marcus_twilio_voice%3Aphone_call_default&secret=secret_123",
          status_callback:
            "https://demo.convex.site/webhooks/twilio/voice/status?routeKey=twilio%3Aphone%3Aorg_marcus_twilio_voice%3Aphone_call_default&secret=secret_123",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await (validateOrganizationTwilioVoiceNumberBinding as any)._handler(
      {
        runQuery: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
          if ("sessionId" in payload) {
            return {
              userId: "users_1",
              organizationId: ORG_ID,
              isSuperAdmin: true,
            };
          }
          return {
            directSettingsId: "objects_direct_settings",
            providerKey: "twilio_voice",
            providerIdentity: "twilio_voice",
            enabled: true,
            routeKey: "twilio:phone:org_marcus_twilio_voice:phone_call_default",
            fromNumber: "+15551230000",
            webhookSecret: "secret_123",
            incomingNumberSid: "PN123",
            directProps: {
              providerId: "direct",
              providerKey: "twilio_voice",
              telephonyProviderIdentity: "twilio_voice",
              routeKey: "twilio:phone:org_marcus_twilio_voice:phone_call_default",
              twilioVoiceFromNumber: "+15551230000",
              twilioVoiceWebhookSecret: "secret_123",
              twilioVoiceIncomingNumberSid: "PN123",
            },
          };
        }),
        runAction: vi.fn(async () => ({
          accountSid: "AC123",
          authToken: "auth_123",
          accountSidLast4: "0123",
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
      },
    );

    expect(result).toMatchObject({
      success: true,
      valid: true,
      phoneNumberSid: "PN123",
      phoneNumber: "+15551230000",
    });
    expect(result.expected.inboundWebhookUrl).toContain("/webhooks/twilio/voice/inbound");
    expect(result.actual.voiceUrl).toBe(result.expected.inboundWebhookUrl);
  });
});
