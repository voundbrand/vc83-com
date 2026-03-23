import { describe, expect, it } from "vitest";

import {
  ANNE_BECKER_TEMPLATE_AGENT_SEED,
  ensureProtectedTemplateLifecycleBootstrap,
} from "../../../convex/onboarding/seedPlatformAgents";
import { normalizeAgentTelephonyConfig } from "../../../src/lib/telephony/agent-telephony";

type FakeRow = Record<string, any> & { _id: string };

class FakeQuery {
  private filters = new Map<string, unknown>();

  constructor(private readonly rows: FakeRow[]) {}

  withIndex(
    _indexName: string,
    build?: (q: { eq: (field: string, value: unknown) => unknown }) => unknown,
  ) {
    const query = {
      eq: (field: string, value: unknown) => {
        this.filters.set(field, value);
        return query;
      },
    };
    if (build) {
      build(query);
    }
    return this;
  }

  async collect() {
    return this.rows
      .filter((row) => {
        for (const [field, value] of this.filters) {
          if (row[field] !== value) {
            return false;
          }
        }
        return true;
      })
      .map((row) => ({ ...row }));
  }
}

class FakeDb {
  private readonly tables = new Map<string, FakeRow[]>();
  private insertCounter = 0;

  seed(table: string, row: FakeRow) {
    this.table(table).push({ ...row });
  }

  query(table: string) {
    return new FakeQuery(this.table(table));
  }

  async get(id: string) {
    for (const rows of this.tables.values()) {
      const found = rows.find((row) => row._id === id);
      if (found) {
        return { ...found };
      }
    }
    return null;
  }

  async insert(table: string, doc: Record<string, unknown>) {
    const id = `${table}_${++this.insertCounter}`;
    this.table(table).push({
      _id: id,
      ...doc,
    });
    return id;
  }

  async patch(id: string, patch: Record<string, unknown>) {
    for (const rows of this.tables.values()) {
      const found = rows.find((row) => row._id === id);
      if (!found) {
        continue;
      }
      Object.assign(found, patch);
      return;
    }
    throw new Error(`Document not found for patch: ${id}`);
  }

  rows(table: string) {
    return this.table(table).map((row) => ({ ...row }));
  }

  private table(name: string) {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }
}

function createCtx(db: FakeDb) {
  return { db } as any;
}

describe("protected template lifecycle bootstrap", () => {
  it("creates Anne Becker's initial published version snapshot without snapshotting runtime telephony state", async () => {
    const db = new FakeDb();
    const organizationId = "organizations_platform";
    const now = 1_700_950_000_000;
    const telephonyConfig = normalizeAgentTelephonyConfig({
      ...ANNE_BECKER_TEMPLATE_AGENT_SEED.customProperties.telephonyConfig,
      elevenlabs: {
        ...(ANNE_BECKER_TEMPLATE_AGENT_SEED.customProperties.telephonyConfig as any).elevenlabs,
        remoteAgentId: "agent_template_platform",
        syncState: {
          status: "success",
          lastSyncedAt: now - 1_000,
          lastSyncedProviderAgentId: "agent_template_platform",
        },
      },
    });

    db.seed("objects", {
      _id: "objects_anne_template",
      organizationId,
      type: "org_agent",
      subtype: ANNE_BECKER_TEMPLATE_AGENT_SEED.subtype,
      name: ANNE_BECKER_TEMPLATE_AGENT_SEED.name,
      description: ANNE_BECKER_TEMPLATE_AGENT_SEED.description,
      status: "template",
      customProperties: {
        ...ANNE_BECKER_TEMPLATE_AGENT_SEED.customProperties,
        telephonyConfig,
      },
      createdAt: now,
      updatedAt: now,
    } as any);

    const result = await ensureProtectedTemplateLifecycleBootstrap(createCtx(db), {
      organizationId: organizationId as any,
      now,
      templateId: "objects_anne_template" as any,
      seed: ANNE_BECKER_TEMPLATE_AGENT_SEED,
    });

    expect(result).toMatchObject({
      bootstrapped: true,
      versionTag:
        "customer_telephony_anne_becker_template_seed_bootstrap_v1",
    });

    const template = db.rows("objects").find((row) => row._id === "objects_anne_template");
    expect(template?.customProperties?.templateLifecycleStatus).toBe("published");
    expect(template?.customProperties?.templatePublishedVersion).toBe(
      "customer_telephony_anne_becker_template_seed_bootstrap_v1",
    );

    const version = db
      .rows("objects")
      .find((row) => row.type === "org_agent_template_version");
    expect(version?.customProperties?.lifecycleStatus).toBe("published");
    expect(
      version?.customProperties?.snapshot?.baselineCustomProperties?.telephonyConfig?.elevenlabs
        ?.remoteAgentId,
    ).toBeUndefined();
    expect(
      version?.customProperties?.snapshot?.baselineCustomProperties?.telephonyConfig?.elevenlabs
        ?.syncState,
    ).toEqual({
      status: "idle",
    });

    const secondRun = await ensureProtectedTemplateLifecycleBootstrap(createCtx(db), {
      organizationId: organizationId as any,
      now: now + 1_000,
      templateId: "objects_anne_template" as any,
      seed: ANNE_BECKER_TEMPLATE_AGENT_SEED,
    });
    expect(secondRun).toMatchObject({
      bootstrapped: false,
      skippedReason: "already_published",
      versionTag:
        "customer_telephony_anne_becker_template_seed_bootstrap_v1",
    });
  });
});
