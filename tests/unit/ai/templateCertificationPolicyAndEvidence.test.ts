import { beforeEach, describe, expect, it, vi } from "vitest";

const SUPER_ADMIN_USER_ID = "users_super_admin";
const SUPER_ADMIN_SESSION_ID = "sessions_super_admin";
const PLATFORM_ORG_ID = "organizations_platform";
const TEMPLATE_ID = "objects_template_policy";
const TEMPLATE_VERSION_V1_ID = "objects_template_policy_v1";
const TEMPLATE_VERSION_V2_ID = "objects_template_policy_v2";
const SUPPORT_TEMPLATE_ID = "objects_template_support";
const SUPPORT_TEMPLATE_VERSION_V1_ID = "objects_template_support_v1";
const SUPPORT_TEMPLATE_VERSION_V2_ID = "objects_template_support_v2";
const SALES_TEMPLATE_ROLE = "sales_specialist_template";
const SUPPORT_TEMPLATE_ROLE = "support_specialist_template";

vi.mock("../../../convex/rbacHelpers", () => ({
  requireAuthenticatedUser: vi.fn(async () => ({
    userId: SUPER_ADMIN_USER_ID,
    organizationId: PLATFORM_ORG_ID,
  })),
  getUserContext: vi.fn(async () => ({
    isGlobal: true,
    roleName: "super_admin",
  })),
}));

import {
  evaluateTemplateCertificationForTemplateVersion,
  recordTemplateCertificationEvidenceBundle,
  setTemplateCertificationRiskPolicy,
} from "../../../convex/ai/agentCatalogAdmin";

type FakeRow = Record<string, any> & { _id: string };

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
    return clone(
      this.rows.filter((row) => {
        for (const [field, value] of this.filters.entries()) {
          if (row[field] !== value) {
            return false;
          }
        }
        return true;
      }),
    );
  }
}

class FakeDb {
  private readonly tables = new Map<string, FakeRow[]>();
  private insertCounter = 0;

  seed(table: string, row: FakeRow) {
    this.table(table).push(clone(row));
  }

  rows(table: string) {
    return clone(this.table(table));
  }

  async get(id: string) {
    return clone(this.findById(id));
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

function createCtx(db: FakeDb) {
  return { db } as any;
}

function seedTemplateWithTwoVersions(
  db: FakeDb,
  args?: Partial<{
    templateId: string;
    versionV1Id: string;
    versionV2Id: string;
    templateRole: string;
    name: string;
  }>,
) {
  const templateId = args?.templateId ?? TEMPLATE_ID;
  const versionV1Id = args?.versionV1Id ?? TEMPLATE_VERSION_V1_ID;
  const versionV2Id = args?.versionV2Id ?? TEMPLATE_VERSION_V2_ID;
  const templateRole = args?.templateRole ?? SALES_TEMPLATE_ROLE;
  const name = args?.name ?? "Policy Test Template";

  db.seed("objects", {
    _id: templateId,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent",
    subtype: "general",
    name,
    status: "template",
    createdAt: 1_763_000_000_000,
    updatedAt: 1_763_000_100_000,
    customProperties: {
      templateLifecycleStatus: "published",
      templatePublishedVersionId: versionV1Id,
      templatePublishedVersion: "v1",
      templateVersion: "v1",
      templateRole,
    },
  } as any);
  db.seed("objects", {
    _id: versionV1Id,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent_template_version",
    subtype: "general",
    name: `${name} @ v1`,
    status: "template_version",
    createdAt: 1_763_000_000_000,
    updatedAt: 1_763_000_050_000,
    customProperties: {
      sourceTemplateId: templateId,
      versionTag: "v1",
      lifecycleStatus: "published",
      snapshot: {
        baselineCustomProperties: {
          systemPrompt: "Prompt v1",
          modelProvider: "openrouter",
          modelId: "openai/gpt-4o-mini",
          templateRole,
        },
      },
    },
  } as any);
  db.seed("objects", {
    _id: versionV2Id,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent_template_version",
    subtype: "general",
    name: `${name} @ v2`,
    status: "template_version",
    createdAt: 1_763_000_060_000,
    updatedAt: 1_763_000_090_000,
    customProperties: {
      sourceTemplateId: templateId,
      versionTag: "v2",
      lifecycleStatus: "draft",
      snapshot: {
        baselineCustomProperties: {
          systemPrompt: "Prompt v2",
          modelProvider: "openrouter",
          modelId: "openai/gpt-4o-mini",
          templateRole,
        },
      },
    },
  } as any);
}

describe("template certification risk policy and CI evidence ingestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows risk-tier remapping through platform risk policy settings", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db);
    const ctx = createCtx(db);

    const defaultEvaluation = await evaluateTemplateCertificationForTemplateVersion(ctx, {
      templateId: TEMPLATE_ID as any,
      templateVersionId: TEMPLATE_VERSION_V2_ID as any,
      templateVersionTag: "v2",
    });
    expect(defaultEvaluation.riskAssessment?.tier).toBe("medium");
    expect(defaultEvaluation.autoCertificationEligible).toBe(false);

    await (setTemplateCertificationRiskPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      policy: {
        explicitLowRiskFields: ["systemPrompt"],
        explicitMediumRiskFields: [],
      },
    });

    const remappedEvaluation = await evaluateTemplateCertificationForTemplateVersion(ctx, {
      templateId: TEMPLATE_ID as any,
      templateVersionId: TEMPLATE_VERSION_V2_ID as any,
      templateVersionTag: "v2",
    });
    expect(remappedEvaluation.riskAssessment?.tier).toBe("low");
    expect(remappedEvaluation.autoCertificationEligible).toBe(true);
  });

  it("applies family overlays without mutating unrelated template families", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateId: TEMPLATE_ID,
      versionV1Id: TEMPLATE_VERSION_V1_ID,
      versionV2Id: TEMPLATE_VERSION_V2_ID,
      templateRole: SALES_TEMPLATE_ROLE,
      name: "Sales Template",
    });
    seedTemplateWithTwoVersions(db, {
      templateId: SUPPORT_TEMPLATE_ID,
      versionV1Id: SUPPORT_TEMPLATE_VERSION_V1_ID,
      versionV2Id: SUPPORT_TEMPLATE_VERSION_V2_ID,
      templateRole: SUPPORT_TEMPLATE_ROLE,
      name: "Support Template",
    });
    const ctx = createCtx(db);

    const baselineSales = await evaluateTemplateCertificationForTemplateVersion(ctx, {
      templateId: TEMPLATE_ID as any,
      templateVersionId: TEMPLATE_VERSION_V2_ID as any,
      templateVersionTag: "v2",
    });
    const baselineSupport = await evaluateTemplateCertificationForTemplateVersion(ctx, {
      templateId: SUPPORT_TEMPLATE_ID as any,
      templateVersionId: SUPPORT_TEMPLATE_VERSION_V2_ID as any,
      templateVersionTag: "v2",
    });
    expect(baselineSales.riskAssessment?.tier).toBe("medium");
    expect(baselineSupport.riskAssessment?.tier).toBe("medium");

    const overlayWrite = await (setTemplateCertificationRiskPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateFamily: SALES_TEMPLATE_ROLE,
      policy: {
        explicitLowRiskFields: ["systemPrompt"],
        explicitMediumRiskFields: [],
      },
    });
    expect(overlayWrite.scope).toBe("family");
    expect(overlayWrite.templateFamily).toBe("sales_specialist_template");

    const overlaySales = await evaluateTemplateCertificationForTemplateVersion(ctx, {
      templateId: TEMPLATE_ID as any,
      templateVersionId: TEMPLATE_VERSION_V2_ID as any,
      templateVersionTag: "v2",
    });
    const overlaySupport = await evaluateTemplateCertificationForTemplateVersion(ctx, {
      templateId: SUPPORT_TEMPLATE_ID as any,
      templateVersionId: SUPPORT_TEMPLATE_VERSION_V2_ID as any,
      templateVersionTag: "v2",
    });
    expect(overlaySales.riskAssessment?.tier).toBe("low");
    expect(overlaySales.autoCertificationEligible).toBe(true);
    expect(overlaySupport.riskAssessment?.tier).toBe("medium");
    expect(overlaySupport.autoCertificationEligible).toBe(false);
  });

  it("ingests CI evaluation outputs with medium-tier defaults and certifies non-WAE bundles", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db);
    const ctx = createCtx(db);

    await (setTemplateCertificationRiskPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      policy: {
        requiredVerificationByTier: {
          medium: [
            "manifest_integrity",
            "risk_assessment",
            "behavioral_eval",
            "tool_contract_eval",
            "policy_compliance_eval",
          ],
        },
      },
    });

    const recorded = await (recordTemplateCertificationEvidenceBundle as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateId: TEMPLATE_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
      templateVersionTag: "v2",
      evaluationOutputs: [
        {
          sourceType: "runtime_smoke_eval",
          outcome: "pass",
          summary: "CI runtime smoke suite passed.",
          runId: "ci_runtime_1",
        },
        {
          sourceType: "tool_contract_eval",
          outcome: "pass",
          summary: "CI tool contract checks passed.",
          runId: "ci_contract_1",
        },
        {
          sourceType: "policy_compliance_eval",
          outcome: "pass",
          summary: "CI policy compliance checks passed.",
          runId: "ci_policy_1",
        },
      ],
      notes: ["ci_pipeline: template-certification"],
    });

    expect(recorded.artifact.status).toBe("certified");
    expect(recorded.artifact.requiredVerification).toEqual(
      expect.arrayContaining(["behavioral_eval", "tool_contract_eval", "policy_compliance_eval"]),
    );
    expect(recorded.artifact.evidenceSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: "runtime_smoke_eval", status: "pass" }),
        expect.objectContaining({ sourceType: "tool_contract_eval", status: "pass" }),
        expect.objectContaining({ sourceType: "policy_compliance_eval", status: "pass" }),
      ]),
    );
    expect(recorded.evaluation.allowed).toBe(true);
    expect(recorded.evaluation.reasonCode).toBeUndefined();
    expect(recorded.summary.defaultEvidenceSources).toEqual(
      expect.arrayContaining([
        "runtime_smoke_eval",
        "tool_contract_eval",
        "policy_compliance_eval",
      ]),
    );
    expect(recorded.summary.missingRequiredVerification).toEqual([]);
    expect(recorded.summary.failedRequiredVerification).toEqual([]);
    expect(recorded.summary.blocked).toBe(false);

    const certificationActions = db.rows("objectActions").filter(
      (row) => row.actionType === "template_certification.recorded",
    );
    expect(certificationActions.length).toBeGreaterThan(0);
  });

  it("fails closed when required CI evidence is failed or missing", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db);
    const ctx = createCtx(db);

    await (setTemplateCertificationRiskPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      policy: {
        requiredVerificationByTier: {
          medium: [
            "manifest_integrity",
            "risk_assessment",
            "behavioral_eval",
            "tool_contract_eval",
            "policy_compliance_eval",
          ],
        },
      },
    });

    const recorded = await (recordTemplateCertificationEvidenceBundle as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateId: TEMPLATE_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
      templateVersionTag: "v2",
      evaluationOutputs: [
        {
          sourceType: "runtime_smoke_eval",
          outcome: "pass",
          summary: "Runtime smoke passed.",
          runId: "ci_runtime_2",
        },
        {
          sourceType: "tool_contract_eval",
          outcome: "fail",
          summary: "Tool contract check failed.",
          runId: "ci_contract_2",
        },
      ],
    });

    expect(recorded.artifact.status).toBe("rejected");
    expect(recorded.evaluation.allowed).toBe(false);
    expect(recorded.evaluation.reasonCode).toBe("certification_invalid");
    expect(recorded.summary.missingRequiredVerification).toEqual(
      expect.arrayContaining(["policy_compliance_eval"]),
    );
    expect(recorded.summary.failedRequiredVerification).toEqual(
      expect.arrayContaining(["tool_contract_eval"]),
    );
    expect(recorded.summary.blocked).toBe(true);
    expect(recorded.summary.blockedReason).toBe("missing_required_verification");
  });

  it("preserves WAE compatibility when medium-risk policy still requires wae_eval", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db);
    const ctx = createCtx(db);

    const withoutWae = await (recordTemplateCertificationEvidenceBundle as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateId: TEMPLATE_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
      templateVersionTag: "v2",
      evaluationOutputs: [
        {
          sourceType: "runtime_smoke_eval",
          outcome: "pass",
          summary: "Runtime smoke passed.",
          runId: "ci_runtime_3",
        },
        {
          sourceType: "tool_contract_eval",
          outcome: "pass",
          summary: "Tool contract checks passed.",
          runId: "ci_contract_3",
        },
        {
          sourceType: "policy_compliance_eval",
          outcome: "pass",
          summary: "Policy checks passed.",
          runId: "ci_policy_3",
        },
      ],
    });

    expect(withoutWae.evaluation.allowed).toBe(false);
    expect(withoutWae.summary.missingRequiredVerification).toContain("wae_eval");

    const withWae = await (recordTemplateCertificationEvidenceBundle as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateId: TEMPLATE_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
      templateVersionTag: "v2",
      evidenceSources: [
        {
          sourceType: "wae_eval",
          status: "pass",
          summary: "WAE scorer bundle passed for v2.",
          runId: "wae_run_compat_v2",
        },
      ],
      evaluationOutputs: [
        {
          sourceType: "runtime_smoke_eval",
          outcome: "pass",
          summary: "Runtime smoke passed.",
          runId: "ci_runtime_3",
        },
      ],
    });

    expect(withWae.artifact.status).toBe("certified");
    expect(withWae.evaluation.allowed).toBe(true);
    expect(withWae.summary.recordedEvidenceSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceType: "wae_eval", status: "pass" }),
      ]),
    );
  });

  it("keeps low-tier automation defaults non-WAE and deterministic", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db);
    const ctx = createCtx(db);

    await (setTemplateCertificationRiskPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      policy: {
        explicitLowRiskFields: ["systemPrompt"],
        explicitMediumRiskFields: [],
      },
    });

    const recorded = await (recordTemplateCertificationEvidenceBundle as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateId: TEMPLATE_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
      templateVersionTag: "v2",
      evaluationOutputs: [
        {
          sourceType: "runtime_smoke_eval",
          outcome: "pass",
          summary: "Runtime smoke passed for low-risk promotion.",
          runId: "ci_runtime_low_1",
        },
      ],
    });

    expect(recorded.summary.riskTier).toBe("low");
    expect(recorded.summary.defaultEvidenceSources).toEqual(["runtime_smoke_eval"]);
    expect(recorded.summary.requiredVerification).toEqual([
      "manifest_integrity",
      "risk_assessment",
    ]);
    expect(recorded.summary.missingRequiredVerification).toEqual([]);
    expect(recorded.evaluation.allowed).toBe(true);
  });
});
