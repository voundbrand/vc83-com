import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getOrganizationTwilioAdminState,
  getOrganizationTwilioRuntimeBinding,
  saveOrganizationTwilioAdminState,
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

  async get(id: string) {
    for (const rows of this.tables.values()) {
      const found = rows.find((row) => row._id === id);
      if (found) {
        return JSON.parse(JSON.stringify(found));
      }
    }
    return null;
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

  async delete(id: string) {
    for (const rows of this.tables.values()) {
      const index = rows.findIndex((row) => row._id === id);
      if (index >= 0) {
        rows.splice(index, 1);
        return;
      }
    }
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

beforeEach(() => {
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_VERIFY_SERVICE_SID;
});

afterEach(() => {
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_VERIFY_SERVICE_SID;
});

describe("organization Twilio admin platform access", () => {
  it("overlays platform credentials without deleting org BYOK Twilio credentials and falls back cleanly when revoked", async () => {
    const db = new FakeDb();
    const now = Date.now();

    db.seed("roles", {
      _id: "roles_super_admin",
      name: "super_admin",
    } as any);
    db.seed("users", {
      _id: "users_super_admin",
      email: "sa@example.com",
      defaultOrgId: "organizations_platform",
      global_role_id: "roles_super_admin",
    } as any);
    db.seed("sessions", {
      _id: "sessions_super_admin",
      userId: "users_super_admin",
      organizationId: "organizations_platform",
      email: "sa@example.com",
      expiresAt: now + 60_000,
    } as any);
    db.seed("objects", {
      _id: "objects_twilio_settings",
      organizationId: ORG_ID,
      type: "twilio_settings",
      name: "Twilio Settings",
      status: "active",
      customProperties: {
        accountSid: "enc_sid_org",
        authToken: "enc_token_org",
        accountSidLast4: "1234",
        credentialSource: "object_settings",
        encryptedFields: ["accountSid", "authToken"],
        verifyServiceSid: "VA_ORG_1",
        smsPhoneNumber: "+15551234567",
        enabled: true,
      },
      createdAt: now,
      updatedAt: now,
    } as any);

    process.env.TWILIO_ACCOUNT_SID = "AC_platform_9999";
    process.env.TWILIO_AUTH_TOKEN = "platform_token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA_PLATFORM";

    const granted = await (saveOrganizationTwilioAdminState as any)._handler(
      { db },
      {
        sessionId: "sessions_super_admin",
        organizationId: ORG_ID,
        enabled: true,
        usePlatformCredentials: true,
        verifyServiceSid: "VA_MARCUS_PLATFORM",
        smsPhoneNumber: "+15557654321",
      },
    );

    expect(granted).toMatchObject({
      success: true,
      usePlatformCredentials: true,
      hasOrgCredentials: true,
      hasPlatformCredentials: true,
      hasEffectiveCredentials: true,
      runtimeSource: "platform",
      verifyServiceSid: "VA_MARCUS_PLATFORM",
      smsPhoneNumber: "+15557654321",
      accountSidLast4: "...9999",
    });

    const updatedSettings = db
      .rows("objects")
      .find((row) => row.type === "twilio_settings");
    expect(updatedSettings?.customProperties?.accountSid).toBe("enc_sid_org");
    expect(updatedSettings?.customProperties?.authToken).toBe("enc_token_org");
    expect(updatedSettings?.customProperties?.accountSidLast4).toBe("1234");
    expect(updatedSettings?.customProperties?.verifyServiceSid).toBe(
      "VA_MARCUS_PLATFORM",
    );
    expect(updatedSettings?.customProperties?.smsPhoneNumber).toBe(
      "+15557654321",
    );

    const policy = db
      .rows("objects")
      .find((row) => row.type === "integration_access_policy");
    expect(policy?.customProperties?.twilio?.usePlatformCredentials).toBe(true);

    const adminState = await (getOrganizationTwilioAdminState as any)._handler(
      { db },
      {
        sessionId: "sessions_super_admin",
        organizationId: ORG_ID,
      },
    );
    expect(adminState).toMatchObject({
      usePlatformCredentials: true,
      runtimeSource: "platform",
      accountSidLast4: "...9999",
    });

    const runtimeGranted = await (getOrganizationTwilioRuntimeBinding as any)._handler(
      {
        runQuery: async () => ({
          settings: updatedSettings?.customProperties ?? null,
          usePlatformCredentials: true,
        }),
        runAction: vi.fn(),
      },
      { organizationId: ORG_ID },
    );
    expect(runtimeGranted).toMatchObject({
      accountSid: "AC_platform_9999",
      authToken: "platform_token",
      verifyServiceSid: "VA_MARCUS_PLATFORM",
      smsPhoneNumber: "+15557654321",
      source: "platform",
    });

    const revoked = await (saveOrganizationTwilioAdminState as any)._handler(
      { db },
      {
        sessionId: "sessions_super_admin",
        organizationId: ORG_ID,
        enabled: true,
        usePlatformCredentials: false,
        verifyServiceSid: "VA_ORG_FALLBACK",
        smsPhoneNumber: "+15550001111",
      },
    );

    expect(revoked).toMatchObject({
      success: true,
      usePlatformCredentials: false,
      hasOrgCredentials: true,
      runtimeSource: "org",
      verifyServiceSid: "VA_ORG_FALLBACK",
      smsPhoneNumber: "+15550001111",
      accountSidLast4: "...1234",
    });

    const revokedSettings = db
      .rows("objects")
      .find((row) => row.type === "twilio_settings");
    const runtimeRevoked = await (getOrganizationTwilioRuntimeBinding as any)._handler(
      {
        runQuery: async () => ({
          settings: revokedSettings?.customProperties ?? null,
          usePlatformCredentials: false,
        }),
        runAction: async (
          _ref: unknown,
          payload: { encrypted: string },
        ) => {
          if (payload.encrypted === "enc_sid_org") {
            return "AC_org_1234";
          }
          return "org_token";
        },
      },
      { organizationId: ORG_ID },
    );
    expect(runtimeRevoked).toMatchObject({
      accountSid: "AC_org_1234",
      authToken: "org_token",
      verifyServiceSid: "VA_ORG_FALLBACK",
      smsPhoneNumber: "+15550001111",
      source: "org",
    });
  });

  it("does not silently fall back to platform env credentials without an explicit org grant", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC_platform_9999";
    process.env.TWILIO_AUTH_TOKEN = "platform_token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA_PLATFORM";

    const runtime = await (getOrganizationTwilioRuntimeBinding as any)._handler(
      {
        runQuery: async () => ({
          settings: null,
          usePlatformCredentials: false,
        }),
        runAction: vi.fn(),
      },
      { organizationId: ORG_ID },
    );

    expect(runtime).toMatchObject({
      enabled: false,
      usePlatformCredentials: false,
      hasPlatformCredentials: true,
      accountSid: null,
      authToken: null,
      source: null,
    });
  });
});
