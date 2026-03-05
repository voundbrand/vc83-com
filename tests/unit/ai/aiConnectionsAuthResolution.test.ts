import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("../../../convex/licensing/helpers", () => ({
  getLicenseInternal: vi.fn(),
}));

import {
  getAIConnectionCatalog,
  saveAIConnection,
} from "../../../convex/integrations/aiConnections";
import { resolveOrganizationProviderBindingForProvider } from "../../../convex/ai/providerRegistry";
import { getLicenseInternal } from "../../../convex/licensing/helpers";
import { requireAuthenticatedUser } from "../../../convex/rbacHelpers";

type FakeRow = Record<string, any> & { _id: string };

const ORG_ID = "organizations_test";

function clone<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

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
    const rows = this.apply();
    return clone(rows[0] ?? null);
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
    this.table(table).push(clone(row));
  }

  async get(id: string) {
    return clone(this.findById(id) ?? null);
  }

  query(table: string) {
    return new FakeQuery(this.table(table));
  }

  async insert(table: string, doc: Record<string, unknown>) {
    const id = `${table}_${++this.insertCounter}`;
    this.table(table).push({
      _id: id,
      ...clone(doc),
    });
    return id;
  }

  async patch(id: string, patch: Record<string, unknown>) {
    const found = this.findById(id);
    if (!found) {
      throw new Error(`Document not found for patch: ${id}`);
    }
    Object.assign(found, clone(patch));
  }

  private findById(id: string) {
    for (const rows of this.tables.values()) {
      const found = rows.find((row) => row._id === id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private table(name: string) {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }
}

const requireAuthenticatedUserMock = vi.mocked(requireAuthenticatedUser);
const getLicenseInternalMock = vi.mocked(getLicenseInternal);

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthenticatedUserMock.mockResolvedValue({
    userId: "users_test",
    organizationId: ORG_ID,
  } as any);
});

function seedAiSettings(db: FakeDb) {
  db.seed("organizationAiSettings", {
    _id: "org_ai_settings_1",
    organizationId: ORG_ID,
    llm: {
      providerId: "openrouter",
      providerAuthProfiles: [],
    },
  });
}

describe("AI connections BYOK gating and resolver interplay", () => {
  it("fails closed in save flow when BYOK is not eligible for the tier", async () => {
    const db = new FakeDb();
    getLicenseInternalMock.mockResolvedValue({
      planTier: "pro",
      features: {
        aiEnabled: true,
        aiByokEnabled: true,
      },
    } as any);

    await expect(
      (saveAIConnection as any)._handler(
        { db },
        {
          sessionId: "sessions_test",
          organizationId: ORG_ID,
          providerId: "gemini",
          profileId: "gemini_primary",
          apiKey: "org-gemini-key",
          enabled: true,
        },
      ),
    ).rejects.toThrow("BYOK connections require Scale (€299/month) or higher.");
  });

  it("returns catalog entries as locked when BYOK is not eligible", async () => {
    const db = new FakeDb();
    seedAiSettings(db);
    getLicenseInternalMock.mockResolvedValue({
      planTier: "pro",
      features: {
        aiEnabled: true,
        aiByokEnabled: true,
      },
    } as any);

    const catalog = await (getAIConnectionCatalog as any)._handler(
      { db },
      {
        sessionId: "sessions_test",
        organizationId: ORG_ID,
      },
    );

    const gemini = catalog.providers.find(
      (provider: { providerId: string }) => provider.providerId === "gemini",
    );
    expect(gemini).toBeDefined();
    expect(gemini?.canConfigure).toBe(false);
    expect(gemini?.lockedReason).toContain("BYOK connections require");
    expect(catalog.byokEnabled).toBe(false);
  });

  it("can show provider disconnected in catalog while platform env fallback still resolves", async () => {
    const db = new FakeDb();
    seedAiSettings(db);
    getLicenseInternalMock.mockResolvedValue({
      planTier: "agency",
      features: {
        aiEnabled: true,
        aiByokEnabled: true,
      },
    } as any);

    const catalog = await (getAIConnectionCatalog as any)._handler(
      { db },
      {
        sessionId: "sessions_test",
        organizationId: ORG_ID,
      },
    );

    const gemini = catalog.providers.find(
      (provider: { providerId: string }) => provider.providerId === "gemini",
    );
    expect(gemini).toBeDefined();
    expect(gemini?.isConnected).toBe(false);
    expect(gemini?.hasApiKey).toBe(false);

    const resolvedBinding = resolveOrganizationProviderBindingForProvider({
      providerId: "gemini",
      llmSettings: {
        providerId: "openrouter",
        providerAuthProfiles: [],
      },
      envApiKeysByProvider: {
        gemini: "platform-gemini-key",
      },
    });
    expect(resolvedBinding?.source).toBe("platform_env");
    expect(resolvedBinding?.apiKey).toBe("platform-gemini-key");
  });
});
