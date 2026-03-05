import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
}));

import { resolveVoiceRuntimeContext } from "../../../convex/ai/voiceRuntime";
import { requireAuthenticatedUser } from "../../../convex/rbacHelpers";

type FakeRow = Record<string, any> & { _id: string };

const ORG_ID = "organizations_test";
const INTERVIEW_ID = "agentSessions_voice_1";
const SESSION_ID = "sessions_test";

const requireAuthenticatedUserMock = vi.mocked(requireAuthenticatedUser);

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

  seed(table: string, row: FakeRow) {
    this.table(table).push(clone(row));
  }

  async get(id: string) {
    for (const rows of this.tables.values()) {
      const found = rows.find((row) => row._id === id);
      if (found) {
        return clone(found);
      }
    }
    return null;
  }

  query(table: string) {
    return new FakeQuery(this.table(table));
  }

  private table(name: string) {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }
}

function withGeminiEnvKey<T>(value: string | undefined, fn: () => Promise<T>) {
  const previous = process.env.GEMINI_API_KEY;
  if (value === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = value;
  }
  return fn().finally(() => {
    if (previous === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = previous;
    }
  });
}

function seedRuntimeContextData(db: FakeDb, providerAuthProfiles: Record<string, unknown>[]) {
  db.seed("agentSessions", {
    _id: INTERVIEW_ID,
    organizationId: ORG_ID,
  });
  db.seed("organizationAiSettings", {
    _id: "org_ai_settings_voice_1",
    organizationId: ORG_ID,
    billingMode: "platform",
    billingSource: "platform",
    llm: {
      providerId: "openrouter",
      providerAuthProfiles,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAuthenticatedUserMock.mockResolvedValue({
    userId: "users_test",
    organizationId: ORG_ID,
  } as any);
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
});

describe("voice runtime provider binding resolution", () => {
  it("uses platform Gemini env fallback when org BYOK profile is absent", async () => {
    const db = new FakeDb();
    seedRuntimeContextData(db, []);

    const result = await withGeminiEnvKey("env-gemini-key", async () =>
      (resolveVoiceRuntimeContext as any)._handler(
        { db },
        {
          sessionId: SESSION_ID,
          interviewSessionId: INTERVIEW_ID,
        },
      ),
    );

    expect(result.geminiBinding).not.toBeNull();
    expect(result.geminiBinding.apiKey).toBe("env-gemini-key");
    expect(result.geminiBinding.profileId).toBe("env_gemini_key");
    expect(result.geminiBinding.billingSource).toBe("platform");
  });

  it("keeps org Gemini BYOK binding ahead of platform env fallback", async () => {
    const db = new FakeDb();
    seedRuntimeContextData(db, [
      {
        profileId: "org-gemini",
        providerId: "gemini",
        apiKey: "org-gemini-key",
        enabled: true,
        priority: 0,
        billingSource: "byok",
      },
    ]);

    const result = await withGeminiEnvKey("env-gemini-key", async () =>
      (resolveVoiceRuntimeContext as any)._handler(
        { db },
        {
          sessionId: SESSION_ID,
          interviewSessionId: INTERVIEW_ID,
        },
      ),
    );

    expect(result.geminiBinding).not.toBeNull();
    expect(result.geminiBinding.apiKey).toBe("org-gemini-key");
    expect(result.geminiBinding.profileId).toBe("org-gemini");
    expect(result.geminiBinding.billingSource).toBe("byok");
  });
});
