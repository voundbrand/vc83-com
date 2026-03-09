import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { ensureTemplateManagedDefaultAgentForOrgInternal } from "../../../convex/agentOntology";

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
    return this.apply().map((row) => ({ ...row }));
  }

  async first() {
    return this.apply()[0] ? { ...this.apply()[0] } : null;
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

const PLATFORM_ORG_ID = "organizations_platform" as Id<"organizations">;
const TARGET_ORG_ID = "organizations_target" as Id<"organizations">;

function createCtx(db: FakeDb) {
  return { db } as any;
}

function listOrgAgents(db: FakeDb, organizationId: Id<"organizations">) {
  return db
    .rows("objects")
    .filter(
      (row) => row.organizationId === organizationId && row.type === "org_agent"
    );
}

function seedDefaultTemplate(db: FakeDb, templateId: Id<"objects">) {
  db.seed("objects", {
    _id: templateId,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent",
    subtype: "general",
    name: "Personal Operator Template",
    description: "Template for org default operator",
    status: "template",
    customProperties: {
      protected: true,
      templateRole: "personal_life_operator_template",
      displayName: "Personal Operator",
      toolProfile: "admin",
      enabledTools: ["draft_message"],
      disabledTools: [],
      channelBindings: [{ channel: "desktop", enabled: true }],
      templateLifecycleStatus: "published",
      templatePublishedVersion: "v1",
      totalMessages: 0,
      totalCostUsd: 0,
    },
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  });
}

const previousPlatformOrgId = process.env.PLATFORM_ORG_ID;
const previousTestOrgId = process.env.TEST_ORG_ID;
const previousDefaultTemplateId = process.env.DEFAULT_ORG_AGENT_TEMPLATE_ID;

beforeEach(() => {
  process.env.PLATFORM_ORG_ID = String(PLATFORM_ORG_ID);
  process.env.TEST_ORG_ID = "";
  delete process.env.DEFAULT_ORG_AGENT_TEMPLATE_ID;
});

afterEach(() => {
  if (previousPlatformOrgId === undefined) {
    delete process.env.PLATFORM_ORG_ID;
  } else {
    process.env.PLATFORM_ORG_ID = previousPlatformOrgId;
  }
  if (previousTestOrgId === undefined) {
    delete process.env.TEST_ORG_ID;
  } else {
    process.env.TEST_ORG_ID = previousTestOrgId;
  }
  if (previousDefaultTemplateId === undefined) {
    delete process.env.DEFAULT_ORG_AGENT_TEMPLATE_ID;
  } else {
    process.env.DEFAULT_ORG_AGENT_TEMPLATE_ID = previousDefaultTemplateId;
  }
});

describe("default template clone provisioning on org creation", () => {
  it("creates a managed template-linked default agent when template is available", async () => {
    const db = new FakeDb();
    const templateId = "objects_default_template" as Id<"objects">;
    seedDefaultTemplate(db, templateId);

    const result = await (ensureTemplateManagedDefaultAgentForOrgInternal as any)._handler(
      createCtx(db),
      {
        organizationId: TARGET_ORG_ID,
        channel: "desktop",
      },
    );

    expect(result.fallbackUsed).toBe(false);
    expect(result.provisioningAction).toBe("template_clone_created");
    expect(result.templateAgentId).toBe(templateId);

    const orgAgents = listOrgAgents(db, TARGET_ORG_ID);
    expect(orgAgents).toHaveLength(1);
    expect(orgAgents[0]?.status).toBe("active");
    expect(orgAgents[0]?.customProperties?.templateAgentId).toBe(templateId);
    expect(orgAgents[0]?.customProperties?.cloneLifecycle).toBe(
      "managed_use_case_clone_v1",
    );
    expect(
      orgAgents[0]?.customProperties?.templateCloneLinkage?.sourceTemplateId,
    ).toBe(String(templateId));
    expect(
      orgAgents[0]?.customProperties?.templateCloneLinkage?.contractVersion,
    ).toBe("ath_template_clone_linkage_v1");
  });

  it("falls back to legacy ensureActive behavior when default template cannot be resolved", async () => {
    const db = new FakeDb();

    const result = await (ensureTemplateManagedDefaultAgentForOrgInternal as any)._handler(
      createCtx(db),
      {
        organizationId: TARGET_ORG_ID,
        channel: "desktop",
      },
    );

    expect(result.fallbackUsed).toBe(true);
    expect(result.provisioningAction).toBe("fallback_created");

    const orgAgents = listOrgAgents(db, TARGET_ORG_ID);
    expect(orgAgents).toHaveLength(1);
    expect(orgAgents[0]?.name).toBe("One-of-One Operator");
    expect(orgAgents[0]?.customProperties?.templateAgentId).toBeUndefined();
    expect(orgAgents[0]?.customProperties?.templateCloneLinkage).toBeUndefined();
  });

  it("is idempotent and upserts the same template clone without creating duplicates", async () => {
    const db = new FakeDb();
    const templateId = "objects_default_template_idempotent" as Id<"objects">;
    seedDefaultTemplate(db, templateId);

    const first = await (ensureTemplateManagedDefaultAgentForOrgInternal as any)._handler(
      createCtx(db),
      {
        organizationId: TARGET_ORG_ID,
        channel: "desktop",
      },
    );
    const second = await (ensureTemplateManagedDefaultAgentForOrgInternal as any)._handler(
      createCtx(db),
      {
        organizationId: TARGET_ORG_ID,
        channel: "desktop",
      },
    );

    expect(first.fallbackUsed).toBe(false);
    expect(second.fallbackUsed).toBe(false);
    expect(second.provisioningAction).toBe("template_clone_updated");
    expect(second.agentId).toBe(first.agentId);

    const orgAgents = listOrgAgents(db, TARGET_ORG_ID);
    expect(orgAgents).toHaveLength(1);
    expect(orgAgents[0]?.customProperties?.templateAgentId).toBe(templateId);
  });
});
