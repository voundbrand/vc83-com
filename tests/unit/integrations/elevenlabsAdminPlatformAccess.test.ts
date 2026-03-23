import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getOrganizationElevenLabsRuntimeBinding,
  saveOrganizationElevenLabsAdminState,
} from "../../../convex/integrations/elevenlabs";

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
  delete process.env.ELEVENLABS_API_KEY;
});

afterEach(() => {
  delete process.env.ELEVENLABS_API_KEY;
});

describe("organization ElevenLabs admin platform access", () => {
  it("overlays platform credentials without deleting org BYOK credentials and falls back cleanly when revoked", async () => {
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
    db.seed("organizationAiSettings", {
      _id: "org_ai_settings_marcus",
      organizationId: ORG_ID,
      enabled: true,
      billingMode: "platform",
      billingSource: "platform",
      settingsContractVersion: "provider_agnostic_v1",
      llm: {
        providerId: "openrouter",
        enabledModels: [],
        defaultModelId: "openrouter/auto",
        temperature: 0.7,
        maxTokens: 4000,
        providerAuthProfiles: [
          {
            profileId: "voice_runtime_default",
            providerId: "elevenlabs",
            label: "ElevenLabs Voice Runtime",
            baseUrl: "https://api.elevenlabs.io/v1",
            credentialSource: "organization_auth_profile",
            billingSource: "byok",
            apiKey: "org_eleven_key",
            enabled: true,
            metadata: {
              defaultVoiceId: "voice_org",
            },
          },
        ],
      },
      embedding: {
        provider: "none",
        model: "",
        dimensions: 0,
      },
      currentMonthSpend: 0,
      createdAt: now,
      updatedAt: now,
    } as any);

    process.env.ELEVENLABS_API_KEY = "platform_eleven_key";

    const granted = await (saveOrganizationElevenLabsAdminState as any)._handler(
      { db },
      {
        sessionId: "sessions_super_admin",
        organizationId: ORG_ID,
        enabled: true,
        usePlatformCredentials: true,
        baseUrl: "https://api.elevenlabs.io/v1",
        defaultVoiceId: "voice_platform",
      },
    );

    expect(granted).toMatchObject({
      success: true,
      usePlatformCredentials: true,
      billingSource: "platform",
      hasOrgApiKey: true,
      hasPlatformApiKey: true,
      hasEffectiveApiKey: true,
      runtimeSource: "platform",
      defaultVoiceId: "voice_platform",
    });

    const updatedSettings = db.rows("organizationAiSettings")[0];
    expect(
      updatedSettings?.llm?.providerAuthProfiles?.[0]?.apiKey,
    ).toBe("org_eleven_key");

    const policy = db
      .rows("objects")
      .find((row) => row.type === "integration_access_policy");
    expect(policy?.customProperties?.elevenlabs?.usePlatformCredentials).toBe(true);

    const grantedRuntime = await (getOrganizationElevenLabsRuntimeBinding as any)._handler(
      { db },
      { organizationId: ORG_ID },
    );
    expect(grantedRuntime).toMatchObject({
      apiKey: "platform_eleven_key",
      billingSource: "platform",
      defaultVoiceId: "voice_platform",
    });

    const revoked = await (saveOrganizationElevenLabsAdminState as any)._handler(
      { db },
      {
        sessionId: "sessions_super_admin",
        organizationId: ORG_ID,
        enabled: true,
        usePlatformCredentials: false,
        baseUrl: "https://api.elevenlabs.io/v1",
        defaultVoiceId: "voice_platform",
      },
    );

    expect(revoked).toMatchObject({
      success: true,
      usePlatformCredentials: false,
      hasOrgApiKey: true,
      runtimeSource: "org",
      billingSource: "byok",
    });

    const revokedRuntime = await (getOrganizationElevenLabsRuntimeBinding as any)._handler(
      { db },
      { organizationId: ORG_ID },
    );
    expect(revokedRuntime).toMatchObject({
      apiKey: "org_eleven_key",
      billingSource: "byok",
      defaultVoiceId: "voice_platform",
    });
  });
});
