import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(),
  getUserContext: vi.fn(),
}));

import {
  getAgentDetails,
  internalReadDatasetSnapshot,
  listAgents,
  resolveRecommendations,
} from "../../../convex/ai/agentCatalogAdmin";
import {
  getUserContext,
  requireAuthenticatedUser,
} from "../../../convex/rbacHelpers";

type FakeRow = Record<string, any> & { _id: string };

const SUPER_USER_ID = "users_super";
const ORG_ID = "organizations_super";
const DEFAULT_DATASET = "agp_v1";

class FakeQuery {
  private filters = new Map<string, unknown>();
  private sortDirection: "asc" | "desc" = "asc";

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

  order(direction: "asc" | "desc") {
    this.sortDirection = direction;
    return this;
  }

  async take(limit: number) {
    const rows = this.apply();
    const sorted = this.sortDirection === "desc" ? rows.slice().reverse() : rows;
    return clone(sorted.slice(0, limit));
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

  private table(name: string) {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }
}

function clone<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

const requireAuthenticatedUserMock = vi.mocked(requireAuthenticatedUser);
const getUserContextMock = vi.mocked(getUserContext);

function createCtx(db: FakeDb) {
  return { db } as any;
}

function seedCatalogEntry(db: FakeDb, overrides: Partial<FakeRow> = {}) {
  db.seed("agentCatalogEntries", {
    _id: `agent_entry_${overrides.catalogAgentNumber ?? 1}`,
    datasetVersion: DEFAULT_DATASET,
    catalogAgentNumber: 1,
    name: "Patient Liaison Specialist",
    category: "health",
    tier: "Foundation",
    soulBlend: "Sample blend",
    soulStatus: "needs_build",
    subtype: "customer_support",
    toolProfile: "health",
    requiredIntegrations: ["resend"],
    channelAffinity: ["webchat", "voice"],
    specialistAccessModes: ["invisible", "direct"],
    autonomyDefault: "supervised",
    implementationPhase: 3,
    catalogStatus: "pending",
    toolCoverageStatus: "partial",
    seedStatus: "skeleton",
    runtimeStatus: "template_only",
    blockers: [],
    sourceRefs: {
      catalogDocPath: "docs/prd/souls/AGENT_PRODUCT_CATALOG.md",
      matrixDocPath: "docs/prd/souls/TOOL_REQUIREMENT_MATRIX.md",
      seedDocPath: "docs/prd/souls/SOUL_SEED_LIBRARY.md",
      roadmapDocPath: "docs/prd/souls/IMPLEMENTATION_ROADMAP.md",
    },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  });
}

function seedToolRequirement(db: FakeDb, overrides: Partial<FakeRow> = {}) {
  db.seed("agentCatalogToolRequirements", {
    _id: `tool_row_${overrides.catalogAgentNumber ?? 1}_${overrides.toolName ?? "schedule_callback"}`,
    datasetVersion: DEFAULT_DATASET,
    catalogAgentNumber: 1,
    toolName: "schedule_callback",
    requirementLevel: "required",
    modeScope: {
      work: "approval_required",
      private: "deny",
    },
    mutability: "mutating",
    source: "proposed_new",
    implementationStatus: "missing",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  });
}

function seedSeedRegistry(db: FakeDb, overrides: Partial<FakeRow> = {}) {
  db.seed("agentCatalogSeedRegistry", {
    _id: `seed_row_${overrides.catalogAgentNumber ?? 1}`,
    datasetVersion: DEFAULT_DATASET,
    catalogAgentNumber: 1,
    seedCoverage: "full",
    requiresSoulBuild: false,
    systemTemplateAgentId: "objects_seed_template",
    templateRole: "platform_system_bot_template",
    protectedTemplate: true,
    immutableOriginContractMapped: true,
    sourcePath: "seed://registry",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  });
}

async function invokeListAgents(args: {
  db: FakeDb;
  filters?: Record<string, unknown>;
}) {
  return await (listAgents as any)._handler(createCtx(args.db), {
    sessionId: "session_super",
    datasetVersion: DEFAULT_DATASET,
    filters: args.filters,
    pagination: {
      cursor: "0",
      limit: 50,
    },
  });
}

async function invokeResolveRecommendations(args: {
  db: FakeDb;
  queryText?: string;
  requestedAccessMode?: "invisible" | "direct" | "meeting";
  availableIntegrations?: string[];
}) {
  return await (resolveRecommendations as any)._handler(createCtx(args.db), {
    sessionId: "session_super",
    datasetVersion: DEFAULT_DATASET,
    queryText: args.queryText,
    requestedAccessMode: args.requestedAccessMode,
    availableIntegrations: args.availableIntegrations,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("AGENT_RECOMMENDER_COMPATIBILITY_ENABLED", "true");

  requireAuthenticatedUserMock.mockResolvedValue({
    userId: SUPER_USER_ID,
    organizationId: ORG_ID,
    session: {
      _id: "session_super",
      userId: SUPER_USER_ID,
      email: "super.admin@test.dev",
      expiresAt: Date.now() + 60_000,
    },
  } as any);

  getUserContextMock.mockResolvedValue({
    userId: SUPER_USER_ID,
    organizationId: ORG_ID,
    session: {
      _id: "session_super",
      userId: SUPER_USER_ID,
      email: "super.admin@test.dev",
      expiresAt: Date.now() + 60_000,
    },
    isGlobal: true,
    roleName: "super_admin",
  } as any);
});

describe("agent catalog recommendation metadata surfaces", () => {
  it("derives backward-compatible defaults for legacy rows and supports metadata-aware filters", async () => {
    const db = new FakeDb();
    seedCatalogEntry(db, {
      catalogAgentNumber: 35,
      name: "The Patient Liaison",
    });
    seedToolRequirement(db, {
      catalogAgentNumber: 35,
      toolName: "care_plan_followup_scheduler",
      implementationStatus: "implemented",
    });

    const baseline = await invokeListAgents({ db });
    expect(baseline.total).toBe(1);
    const row = baseline.agents[0];
    expect(row.intentTags).toEqual(
      expect.arrayContaining(["care_follow_up", "retention_and_reviews"]),
    );
    expect(row.keywordAliases).toEqual(
      expect.arrayContaining(["care_plan", "medical_followup"]),
    );
    expect(row.recommendationMetadata).toMatchObject({
      schemaVersion: "agp_recommender_v1",
      source: "derived",
      defaultActivationState: "planned_only",
    });

    const byIntent = await invokeListAgents({
      db,
      filters: { intentTag: "care_follow_up" },
    });
    expect(byIntent.total).toBe(1);

    const byAlias = await invokeListAgents({
      db,
      filters: { keywordAlias: "medical_followup" },
    });
    expect(byAlias.total).toBe(1);

    const byActivationState = await invokeListAgents({
      db,
      filters: { defaultActivationState: "planned_only" },
    });
    expect(byActivationState.total).toBe(1);
  });

  it("preserves stored metadata and searches across manual tags/aliases", async () => {
    const db = new FakeDb();
    seedCatalogEntry(db, {
      catalogAgentNumber: 78,
      category: "trades",
      subtype: "sales_assistant",
      toolProfile: "trades",
      runtimeStatus: "live",
      seedStatus: "full",
      toolCoverageStatus: "complete",
      intentTags: ["urgent_dispatch"],
      keywordAliases: ["dispatch_now"],
      recommendationMetadata: {
        schemaVersion: "agp_recommender_v1",
        source: "manual",
        rankHint: 0.33,
        gapPenaltyMultiplier: 1.4,
        defaultActivationState: "blocked",
      },
    });
    seedToolRequirement(db, {
      catalogAgentNumber: 78,
      implementationStatus: "implemented",
      toolName: "job_material_estimator",
    });

    const result = await invokeListAgents({
      db,
      filters: {
        intentTag: "urgent_dispatch",
        keywordAlias: "dispatch_now",
        defaultActivationState: "blocked",
        search: "dispatch_now",
      },
    });

    expect(result.total).toBe(1);
    expect(result.agents[0].recommendationMetadata).toMatchObject({
      source: "manual",
      rankHint: 0.33,
      gapPenaltyMultiplier: 1.4,
      defaultActivationState: "blocked",
    });
    expect(result.agents[0].intentTags).toEqual(["urgent_dispatch"]);
    expect(result.agents[0].keywordAliases).toEqual(["dispatch_now"]);
  });

  it("publishes recommendation metadata hash in internal snapshot output", async () => {
    const db = new FakeDb();
    seedCatalogEntry(db, {
      catalogAgentNumber: 91,
      category: "ecommerce",
      subtype: "sales_assistant",
      toolProfile: "ecommerce",
      runtimeStatus: "live",
      seedStatus: "skeleton",
      toolCoverageStatus: "partial",
    });
    seedToolRequirement(db, {
      catalogAgentNumber: 91,
      toolName: "abandoned_cart_recovery_trigger",
      implementationStatus: "missing",
    });

    const snapshot = await (internalReadDatasetSnapshot as any)._handler(createCtx(db), {
      datasetVersion: DEFAULT_DATASET,
    });

    expect(typeof snapshot.hashes.recommendationMetadataHash).toBe("string");
    expect(snapshot.hashes.recommendationMetadataHash).toContain("recommendation:");
    expect(snapshot.entries[0].intentTags.length).toBeGreaterThan(0);
    expect(snapshot.entries[0].recommendationMetadata.schemaVersion).toBe("agp_recommender_v1");
  });

  it("returns explainable gap-first resolver payloads from admin query surface", async () => {
    const db = new FakeDb();
    seedCatalogEntry(db, {
      catalogAgentNumber: 42,
      category: "health",
      subtype: "booking_agent",
      toolProfile: "health",
      runtimeStatus: "template_only",
      seedStatus: "skeleton",
      toolCoverageStatus: "partial",
      specialistAccessModes: ["invisible"],
      requiredIntegrations: ["stripe"],
      intentTags: ["book_appointment"],
      keywordAliases: ["book", "appointment"],
      recommendationMetadata: {
        schemaVersion: "agp_recommender_v1",
        source: "manual",
        rankHint: 0.04,
        gapPenaltyMultiplier: 1.2,
        defaultActivationState: "suggest_activation",
      },
    });
    seedToolRequirement(db, {
      catalogAgentNumber: 42,
      toolName: "schedule_callback",
      implementationStatus: "missing",
      source: "proposed_new",
    });

    const result = await invokeResolveRecommendations({
      db,
      queryText: "book appointment",
      requestedAccessMode: "direct",
      availableIntegrations: [],
    });

    expect(result.recommendations).toHaveLength(1);
    const recommendation = result.recommendations[0];
    expect(recommendation.activationState).toBe("blocked");
    expect(recommendation.gaps.runtime.length).toBeGreaterThan(0);
    expect(recommendation.gaps.integrations).toEqual(["stripe"]);
    expect(recommendation.gaps.tools).toEqual(["schedule_callback"]);
    expect(recommendation.gaps.accessMode.length).toBeGreaterThan(0);
    expect(recommendation.rationale.gapSummary[0]).toContain("Runtime gaps");
    expect(recommendation.rationale.activationSuggestion).toContain("blocked");
  });

  it("fails closed when recommender compatibility flag is disabled", async () => {
    vi.unstubAllEnvs();
    const db = new FakeDb();
    seedCatalogEntry(db, {
      catalogAgentNumber: 42,
      category: "health",
      subtype: "booking_agent",
      toolProfile: "health",
      runtimeStatus: "live",
      seedStatus: "full",
      toolCoverageStatus: "complete",
      specialistAccessModes: ["direct"],
      requiredIntegrations: [],
      intentTags: ["book_appointment"],
      keywordAliases: ["book", "appointment"],
    });
    seedToolRequirement(db, {
      catalogAgentNumber: 42,
      toolName: "schedule_callback",
      implementationStatus: "implemented",
      source: "registry",
    });

    const result = await invokeResolveRecommendations({
      db,
      queryText: "book appointment",
      requestedAccessMode: "direct",
      availableIntegrations: ["google_calendar"],
    });

    expect(result.recommendations).toEqual([]);
    expect(result.query.requestedAccessMode).toBe("direct");
    expect(result.compatibility).toMatchObject({
      enabled: false,
      reason: "compatibility_flag_disabled",
      flagKey: "AGENT_RECOMMENDER_COMPATIBILITY_ENABLED",
      defaultState: "off",
      matchedAlias: null,
    });
  });

  it("maps seed linkage into deterministic bridge metadata without breaking legacy rows", async () => {
    const db = new FakeDb();
    seedCatalogEntry(db, {
      catalogAgentNumber: 64,
      runtimeStatus: "live",
      seedStatus: "full",
      toolCoverageStatus: "complete",
    });
    seedToolRequirement(db, {
      catalogAgentNumber: 64,
      implementationStatus: "implemented",
    });
    seedSeedRegistry(db, {
      catalogAgentNumber: 64,
    });

    const listResult = await invokeListAgents({ db });
    expect(listResult.total).toBe(1);
    expect(listResult.agents[0].seedTemplateBridge).toMatchObject({
      contractVersion: "ath_seed_template_bridge_v1",
      precedenceOrder: [
        "platform_policy",
        "template_baseline",
        "org_clone_overrides",
        "runtime_session_restrictions",
      ],
      roleBoundary: "super_admin_global_templates",
      protectedTemplate: true,
      immutableOriginContractMapped: true,
      systemTemplateAgentId: "objects_seed_template",
    });

    const details = await (getAgentDetails as any)._handler(createCtx(db), {
      sessionId: "session_super",
      datasetVersion: DEFAULT_DATASET,
      catalogAgentNumber: 64,
    });
    expect(details.seedTemplateBridge).toMatchObject({
      contractVersion: "ath_seed_template_bridge_v1",
      legacyCompatibilityMode: "managed_seed",
    });
  });
});
