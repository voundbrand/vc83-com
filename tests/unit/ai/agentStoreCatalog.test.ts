import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
  getUserContext: vi.fn(),
  checkPermission: vi.fn(),
}));

import {
  compareCatalogCards,
  getClonePreflight,
  listCatalogCards,
} from "../../../convex/ai/agentStoreCatalog";
import {
  checkPermission,
  getUserContext,
  requireAuthenticatedUser,
} from "../../../convex/rbacHelpers";

type FakeRow = Record<string, any> & { _id: string };

const DEFAULT_DATASET = "agp_v1";
const ORG_ID = "organizations_1";
const USER_ID = "users_1";

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

  async collect() {
    return clone(this.apply());
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

  query(table: string) {
    return new FakeQuery(this.table(table));
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

  private table(name: string) {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }
}

const requireAuthenticatedUserMock = vi.mocked(requireAuthenticatedUser);
const getUserContextMock = vi.mocked(getUserContext);
const checkPermissionMock = vi.mocked(checkPermission);

function createCtx(db: FakeDb) {
  return { db } as any;
}

function seedOrgAccess(
  db: FakeDb,
  overrides: Partial<FakeRow> = {},
) {
  db.seed("organizations", {
    _id: ORG_ID,
    name: "Test Org",
    paymentProviders: [],
    ...overrides,
  });
  db.seed("organizationMembers", {
    _id: "organizationMembers_1",
    organizationId: ORG_ID,
    userId: USER_ID,
    isActive: true,
  });
}

function seedCatalogEntry(db: FakeDb, overrides: Partial<FakeRow>) {
  db.seed("agentCatalogEntries", {
    _id: `agentCatalogEntries_${overrides.catalogAgentNumber ?? 1}`,
    datasetVersion: DEFAULT_DATASET,
    catalogAgentNumber: 1,
    name: "Agent",
    category: "core",
    tier: "Foundation",
    subtype: "general",
    toolProfile: "general",
    requiredIntegrations: [],
    channelAffinity: ["webchat"],
    specialistAccessModes: ["invisible"],
    autonomyDefault: "supervised",
    runtimeStatus: "live",
    seedStatus: "full",
    intentTags: ["platform_operations"],
    keywordAliases: ["operations"],
    recommendationMetadata: {
      schemaVersion: "agp_recommender_v1",
      source: "manual",
      rankHint: 0.07,
      gapPenaltyMultiplier: 1,
      defaultActivationState: "suggest_activation",
    },
    updatedAt: 1,
    ...overrides,
  });
}

function seedToolRequirement(db: FakeDb, overrides: Partial<FakeRow>) {
  db.seed("agentCatalogToolRequirements", {
    _id: `agentCatalogToolRequirements_${overrides.catalogAgentNumber ?? 1}_${overrides.toolName ?? "run_platform_productivity_loop"}`,
    datasetVersion: DEFAULT_DATASET,
    catalogAgentNumber: 1,
    toolName: "run_platform_productivity_loop",
    requirementLevel: "required",
    source: "registry",
    implementationStatus: "implemented",
    ...overrides,
  });
}

function seedSeedRow(db: FakeDb, overrides: Partial<FakeRow>) {
  db.seed("agentCatalogSeedRegistry", {
    _id: `agentCatalogSeedRegistry_${overrides.catalogAgentNumber ?? 1}`,
    datasetVersion: DEFAULT_DATASET,
    catalogAgentNumber: 1,
    seedCoverage: "full",
    requiresSoulBuild: false,
    systemTemplateAgentId: "objects_template_1",
    ...overrides,
  });
}

function seedTemplate(db: FakeDb, overrides: Partial<FakeRow> = {}) {
  db.seed("objects", {
    _id: "objects_template_1",
    organizationId: ORG_ID,
    type: "org_agent",
    name: "Template Agent",
    status: "template",
    updatedAt: 1,
    customProperties: {
      protected: true,
      templateRole: "sales_template",
      clonePolicy: {
        spawnEnabled: true,
        maxClonesPerOrg: 12,
        maxClonesPerTemplatePerOrg: 4,
        maxClonesPerOwner: 3,
      },
    },
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("AGENT_STORE_COMPATIBILITY_ENABLED", "true");
  requireAuthenticatedUserMock.mockResolvedValue({
    userId: USER_ID,
    organizationId: ORG_ID,
    session: {
      _id: "sessions_1",
      userId: USER_ID,
      email: "owner@test.dev",
      expiresAt: Date.now() + 60_000,
    },
  } as any);
  getUserContextMock.mockResolvedValue({
    userId: USER_ID,
    organizationId: ORG_ID,
    isGlobal: false,
    roleName: "org_owner",
  } as any);
  checkPermissionMock.mockResolvedValue(true);
});

describe("agentStoreCatalog list/filter/compare/preflight", () => {
  it("lists privacy-safe cards with tool/integration readiness and comparison support", async () => {
    const db = new FakeDb();
    seedOrgAccess(db, {
      paymentProviders: [{ providerCode: "stripe-connect", status: "active" }],
    });
    db.seed("oauthConnections", {
      _id: "oauthConnections_1",
      organizationId: ORG_ID,
      provider: "activecampaign",
      status: "active",
    });
    seedCatalogEntry(db, {
      catalogAgentNumber: 77,
      name: "The Quote Follow-Up Agent",
      category: "trades",
      toolProfile: "trades",
      subtype: "sales_assistant",
      requiredIntegrations: ["stripe", "activecampaign"],
      intentTags: ["document_or_quote_packet"],
    });
    seedToolRequirement(db, {
      catalogAgentNumber: 77,
      toolName: "generate_quote_or_scope_pdf",
      implementationStatus: "implemented",
      source: "registry",
      integrationDependency: "stripe",
    });
    seedToolRequirement(db, {
      catalogAgentNumber: 77,
      toolName: "schedule_callback",
      implementationStatus: "missing",
      source: "proposed_new",
    });
    seedSeedRow(db, {
      catalogAgentNumber: 77,
      systemTemplateAgentId: "objects_template_1",
    });
    seedCatalogEntry(db, {
      catalogAgentNumber: 78,
      name: "The Job Scheduler",
      category: "trades",
      toolProfile: "trades",
      subtype: "general",
      requiredIntegrations: ["stripe"],
      intentTags: ["book_appointment"],
    });
    seedToolRequirement(db, {
      catalogAgentNumber: 78,
      toolName: "schedule_callback",
      implementationStatus: "implemented",
      source: "registry",
      integrationDependency: "stripe",
    });
    seedSeedRow(db, {
      catalogAgentNumber: 78,
      systemTemplateAgentId: "objects_template_1",
    });
    seedTemplate(db);

    const listResult = await (listCatalogCards as any)._handler(createCtx(db), {
      sessionId: "sessions_1",
      organizationId: ORG_ID,
      datasetVersion: DEFAULT_DATASET,
      sort: "recommended",
      pagination: { cursor: "0", limit: 10 },
    });

    expect(listResult.total).toBe(2);
    const card = listResult.cards.find((item: any) => item.catalogAgentNumber === 77);
    expect(card).toBeDefined();
    expect(card.displayName).toBe("The Quote Follow-Up Agent");
    expect(card.verticalCategory).toBe("trades");
    expect(card.toolTags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "generate_quote_or_scope_pdf", status: "available_now" }),
        expect.objectContaining({ key: "schedule_callback", status: "planned" }),
      ]),
    );
    expect(card.integrationTags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "stripe", status: "available_now" }),
        expect.objectContaining({ key: "activecampaign", status: "available_now" }),
      ]),
    );
    expect((card as any).soulBlend).toBeUndefined();
    expect(listResult.noFitEscalation).toEqual({
      minimum: "€5,000 minimum",
      deposit: "€2,500 deposit",
      onboarding: "includes 90-minute onboarding with engineer",
    });

    const compareResult = await (compareCatalogCards as any)._handler(createCtx(db), {
      sessionId: "sessions_1",
      organizationId: ORG_ID,
      datasetVersion: DEFAULT_DATASET,
      catalogAgentNumbers: [77, 78],
    });

    expect(compareResult.cards.length).toBe(2);
    expect(compareResult.comparison.sharedFrameworkTags.length).toBeGreaterThan(0);
  });

  it("returns clone preflight capability snapshot with blocked reasons when requirements are unmet", async () => {
    const db = new FakeDb();
    seedOrgAccess(db);
    seedCatalogEntry(db, {
      catalogAgentNumber: 35,
      name: "The Patient Liaison",
      category: "health",
      subtype: "customer_support",
      toolProfile: "health",
      requiredIntegrations: ["resend"],
      specialistAccessModes: ["invisible"],
      channelAffinity: ["webchat"],
      intentTags: ["care_follow_up"],
    });
    seedToolRequirement(db, {
      catalogAgentNumber: 35,
      toolName: "care_plan_followup_scheduler",
      implementationStatus: "implemented",
      source: "registry",
      integrationDependency: "resend",
    });
    seedSeedRow(db, {
      catalogAgentNumber: 35,
      systemTemplateAgentId: "objects_template_1",
    });
    seedTemplate(db);

    const preflight = await (getClonePreflight as any)._handler(createCtx(db), {
      sessionId: "sessions_1",
      organizationId: ORG_ID,
      datasetVersion: DEFAULT_DATASET,
      catalogAgentNumber: 35,
      requestedAccessMode: "direct",
      requestedChannel: "slack",
    });

    expect(preflight.allowClone).toBe(false);
    expect(preflight.directCreateAllowed).toBe(false);
    expect(preflight.capabilitySnapshot.blocked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          blockerType: "access_mode_restricted",
        }),
        expect.objectContaining({
          blockerType: "channel_unavailable",
        }),
        expect.objectContaining({
          blockerType: "integration_missing",
        }),
      ]),
    );
    expect(preflight.noFitEscalation.minimum).toBe("€5,000 minimum");
    expect(preflight.noFitEscalation.deposit).toBe("€2,500 deposit");
    expect(preflight.noFitEscalation.onboarding).toBe(
      "includes 90-minute onboarding with engineer",
    );
  });

  it("fails closed when store compatibility flag is disabled", async () => {
    vi.unstubAllEnvs();
    const db = new FakeDb();
    seedOrgAccess(db);

    const listResult = await (listCatalogCards as any)._handler(createCtx(db), {
      sessionId: "sessions_1",
      organizationId: ORG_ID,
      datasetVersion: DEFAULT_DATASET,
      sort: "recommended",
      pagination: { cursor: "0", limit: 10 },
    });
    expect(listResult.total).toBe(0);
    expect(listResult.cards).toEqual([]);
    expect(listResult.compatibility).toMatchObject({
      enabled: false,
      reason: "compatibility_flag_disabled",
      flagKey: "AGENT_STORE_COMPATIBILITY_ENABLED",
      defaultState: "off",
      matchedAlias: null,
    });

    const compareResult = await (compareCatalogCards as any)._handler(createCtx(db), {
      sessionId: "sessions_1",
      organizationId: ORG_ID,
      datasetVersion: DEFAULT_DATASET,
      catalogAgentNumbers: [77, 78],
    });
    expect(compareResult.cards).toHaveLength(2);
    expect(compareResult.cards[0].weaknessTags).toContain("compatibility_flag_disabled");
    expect(compareResult.compatibility.enabled).toBe(false);

    const preflight = await (getClonePreflight as any)._handler(createCtx(db), {
      sessionId: "sessions_1",
      organizationId: ORG_ID,
      datasetVersion: DEFAULT_DATASET,
      catalogAgentNumber: 35,
    });
    expect(preflight.allowClone).toBe(false);
    expect(preflight.capabilitySnapshot.blocked).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capabilityId: "agent_store_compatibility_disabled",
        }),
      ]),
    );
    expect(preflight.compatibility).toMatchObject({
      enabled: false,
      reason: "compatibility_flag_disabled",
    });
  });
});
