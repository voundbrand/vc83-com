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
  acknowledgeTemplateCertificationAlertDispatch,
  evaluateTemplateCertificationForTemplateVersion,
  getTemplateCertificationAlertDispatchControl,
  getTemplateCertificationAutomationPolicy,
  getTemplateCertificationRiskPolicy,
  processTemplateCertificationAlertDispatchQueueNow,
  recordTemplateCertificationEvidenceBundle,
  setTemplateCertificationAlertDispatchControl,
  setTemplateCertificationAutomationPolicy,
  setTemplateCertificationRiskPolicy,
  throttleTemplateCertificationAlertDispatch,
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

async function queueAlertDispatchForChannel(args: {
  ctx: any;
  channel: "slack" | "pagerduty" | "email";
  target: string;
  maxAttempts?: number;
  retryDelayMs?: number;
}) {
  await (setTemplateCertificationAlertDispatchControl as any)._handler(args.ctx, {
    sessionId: SUPER_ADMIN_SESSION_ID,
    policy: {
      maxAttempts: args.maxAttempts ?? 3,
      retryDelayMs: args.retryDelayMs ?? 1_000,
      channels: {
        [args.channel]: {
          enabled: true,
          target: args.target,
        },
      },
    },
  });
  await (setTemplateCertificationAutomationPolicy as any)._handler(args.ctx, {
    sessionId: SUPER_ADMIN_SESSION_ID,
    templateFamily: SALES_TEMPLATE_ROLE,
    policy: {
      ownerUserIds: ["users_sales_owner"],
      alertChannels: [args.channel],
      alertOnCertificationBlocked: true,
      alertOnMissingDefaultEvidence: false,
    },
  });
  const recorded = await (recordTemplateCertificationEvidenceBundle as any)._handler(args.ctx, {
    sessionId: SUPER_ADMIN_SESSION_ID,
    templateId: TEMPLATE_ID,
    templateVersionId: TEMPLATE_VERSION_V2_ID,
    templateVersionTag: "v2",
    evaluationOutputs: [
      {
        sourceType: "runtime_smoke_eval",
        outcome: "pass",
        summary: "Runtime smoke passed.",
        runId: `ci_runtime_${args.channel}`,
      },
    ],
  });
  return recorded.summary.alertDispatches.find(
    (entry: any) => entry.channel === args.channel && entry.deliveryStatus === "queued",
  );
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

  it("applies deterministic requirement authoring standards for risk-tier verification rules", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db);
    const ctx = createCtx(db);

    const write = await (setTemplateCertificationRiskPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      policy: {
        requiredVerificationByTier: {
          medium: ["manifest_integrity", "risk_assessment"],
          high: ["manifest_integrity", "risk_assessment", "tool_contract_eval"],
        },
      },
    });

    expect(write.requirementAuthoring.byTier.medium.foundationalSatisfied).toBe(true);
    expect(write.requirementAuthoring.byTier.medium.operationalEvidenceSatisfied).toBe(true);
    expect(write.requirementAuthoring.byTier.high.operationalEvidenceSatisfied).toBe(true);
    expect(write.policy.requiredVerificationByTier.medium).toEqual([
      "manifest_integrity",
      "risk_assessment",
      "wae_eval",
    ]);
    expect(write.policy.requiredVerificationByTier.high).toEqual([
      "manifest_integrity",
      "risk_assessment",
      "tool_contract_eval",
    ]);

    const read = await (getTemplateCertificationRiskPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateFamily: SALES_TEMPLATE_ROLE,
    });
    expect(read.requirementAuthoring.standards.foundationalRequirements).toEqual([
      "manifest_integrity",
      "risk_assessment",
    ]);
    expect(read.requirementAuthoring.byTier.medium.requirements).toEqual([
      "manifest_integrity",
      "risk_assessment",
      "wae_eval",
    ]);
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

  it("supports per-family automation ownership and adoption policy overlays", async () => {
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

    const baselineGlobal = await (getTemplateCertificationAutomationPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateFamily: SUPPORT_TEMPLATE_ROLE,
    });
    expect(baselineGlobal.scope).toBe("global");
    expect(baselineGlobal.policy.adoptionMode).toBe("shadow");

    const familyOverlayWrite = await (setTemplateCertificationAutomationPolicy as any)._handler(
      ctx,
      {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateFamily: SALES_TEMPLATE_ROLE,
        policy: {
          adoptionMode: "enforced",
          ownerUserIds: ["users_sales_owner", "users_sales_delegate"],
          ownerTeamIds: ["team_certification_ops"],
          alertChannels: ["pagerduty", "slack"],
          alertOnCertificationBlocked: true,
          alertOnMissingDefaultEvidence: true,
        },
      },
    );
    expect(familyOverlayWrite.scope).toBe("family");
    expect(familyOverlayWrite.templateFamily).toBe("sales_specialist_template");
    expect(familyOverlayWrite.policy.adoptionMode).toBe("enforced");
    expect(familyOverlayWrite.policy.ownerUserIds).toEqual([
      "users_sales_delegate",
      "users_sales_owner",
    ]);
    expect(familyOverlayWrite.policy.alertChannels).toEqual(["pagerduty", "slack"]);

    const salesFamilyPolicy = await (getTemplateCertificationAutomationPolicy as any)._handler(
      ctx,
      {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateFamily: SALES_TEMPLATE_ROLE,
      },
    );
    const supportFamilyPolicy = await (getTemplateCertificationAutomationPolicy as any)._handler(
      ctx,
      {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateFamily: SUPPORT_TEMPLATE_ROLE,
      },
    );

    expect(salesFamilyPolicy.scope).toBe("family");
    expect(salesFamilyPolicy.policy.adoptionMode).toBe("enforced");
    expect(salesFamilyPolicy.policy.ownerTeamIds).toEqual(["team_certification_ops"]);
    expect(supportFamilyPolicy.scope).toBe("global");
    expect(supportFamilyPolicy.policy.adoptionMode).toBe("shadow");
    expect(supportFamilyPolicy.policy.ownerUserIds).toEqual([]);
  });

  it("emits family-routed alert recommendations when certification evidence is blocked", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);

    await (setTemplateCertificationRiskPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateFamily: SALES_TEMPLATE_ROLE,
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
    await (setTemplateCertificationAutomationPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateFamily: SALES_TEMPLATE_ROLE,
      policy: {
        adoptionMode: "enforced",
        ownerUserIds: ["users_sales_owner"],
        ownerTeamIds: ["team_certification_ops"],
        alertChannels: ["slack", "pagerduty"],
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
          runId: "ci_runtime_alert_1",
        },
      ],
    });

    expect(recorded.artifact.status).toBe("rejected");
    expect(recorded.summary.templateFamily).toBe("sales_specialist_template");
    expect(recorded.summary.automationPolicyScope).toBe("family");
    expect(recorded.summary.automationAdoptionMode).toBe("enforced");
    expect(recorded.summary.automationOwnerUserIds).toEqual(["users_sales_owner"]);
    expect(recorded.summary.automationOwnerTeamIds).toEqual(["team_certification_ops"]);
    expect(recorded.summary.automationAlertChannels).toEqual(["pagerduty", "slack"]);
    expect(recorded.summary.alertRecommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "certification_blocked",
          severity: "critical",
          ownerUserIds: ["users_sales_owner"],
          ownerTeamIds: ["team_certification_ops"],
          alertChannels: ["pagerduty", "slack"],
        }),
        expect.objectContaining({
          code: "default_evidence_missing",
          severity: "warning",
        }),
      ]),
    );
    expect(recorded.summary.alertDispatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: "slack",
          deliveryStatus: "queued",
          recommendationCode: "certification_blocked",
        }),
        expect.objectContaining({
          channel: "pagerduty",
          deliveryStatus: "queued",
          recommendationCode: "default_evidence_missing",
        }),
      ]),
    );
  });

  it("suppresses duplicate alert dispatches for the same version digest + channel + recommendation", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);

    await (setTemplateCertificationRiskPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateFamily: SALES_TEMPLATE_ROLE,
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
    await (setTemplateCertificationAutomationPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateFamily: SALES_TEMPLATE_ROLE,
      policy: {
        adoptionMode: "enforced",
        ownerUserIds: ["users_sales_owner"],
        alertChannels: ["slack", "email"],
      },
    });

    const first = await (recordTemplateCertificationEvidenceBundle as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateId: TEMPLATE_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
      templateVersionTag: "v2",
      evaluationOutputs: [
        {
          sourceType: "runtime_smoke_eval",
          outcome: "pass",
          summary: "Runtime smoke passed.",
          runId: "ci_runtime_alert_dedupe_1",
        },
      ],
    });
    expect(first.summary.alertDispatches.some((entry: any) => entry.deliveryStatus === "queued")).toBe(
      true,
    );

    const second = await (recordTemplateCertificationEvidenceBundle as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateId: TEMPLATE_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
      templateVersionTag: "v2",
      evaluationOutputs: [
        {
          sourceType: "runtime_smoke_eval",
          outcome: "pass",
          summary: "Runtime smoke passed again.",
          runId: "ci_runtime_alert_dedupe_2",
        },
      ],
    });
    expect(
      second.summary.alertDispatches.every(
        (entry: any) => entry.deliveryStatus === "suppressed_duplicate",
      ),
    ).toBe(true);
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

  it("reads and updates alert dispatch worker control policy", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db);
    const ctx = createCtx(db);

    const baseline = await (getTemplateCertificationAlertDispatchControl as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
    });
    expect(baseline.policy.maxAttempts).toBe(3);
    expect(baseline.policy.channels.slack.enabled).toBe(true);
    expect(baseline.policy.strictMode.enabled).toBe(false);
    expect(baseline.policy.credentialGovernance.slack.allowInlineTargetCredentials).toBe(true);
    expect(baseline.credentialHealth.slack.ready).toBe(false);
    expect(baseline.policyDrift.detected).toBe(false);

    const updated = await (setTemplateCertificationAlertDispatchControl as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      policy: {
        maxAttempts: 4,
        retryDelayMs: 120_000,
        channels: {
          slack: {
            enabled: true,
            target: "ops-alerts",
          },
        },
        throttle: {
          slack: {
            windowMs: 600_000,
            maxDispatches: 2,
          },
        },
        credentialGovernance: {
          slack: {
            requireDedicatedCredentials: true,
            allowInlineTargetCredentials: false,
            runbookUrl:
              "docs/reference_docs/topic_collections/implementation/template-certification-and-org-preflight/TRANSPORT_CREDENTIAL_RUNBOOK.md#slack",
          },
          email: {
            requireDedicatedCredentials: true,
          },
        },
      },
    });
    expect(updated.policy.maxAttempts).toBe(4);
    expect(updated.policy.retryDelayMs).toBe(120_000);
    expect(updated.policy.channels.slack.target).toBe("ops-alerts");
    expect(updated.policy.throttle.slack.maxDispatches).toBe(2);
    expect(updated.policy.credentialGovernance.slack.requireDedicatedCredentials).toBe(true);
    expect(updated.policy.credentialGovernance.slack.allowInlineTargetCredentials).toBe(false);
    expect(updated.credentialHealth.slack.policyCompliant).toBe(false);
    expect(updated.credentialHealth.slack.reasonCode).toBe(
      "slack_transport_not_configured",
    );
    expect(updated.policy.strictMode.enabled).toBe(false);
    expect(updated.policyDrift.detected).toBe(false);
  });

  it("auto-promotes strict credential governance for ready channels and emits policy drift recommendations", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);
    const originalDedicatedSlackToken = process.env.TEMPLATE_CERTIFICATION_ALERT_SLACK_BOT_TOKEN;
    const originalFallbackSlackToken = process.env.SLACK_BOT_TOKEN;
    const originalPagerDutyGlobalKey = process.env.TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_KEY;
    const originalPagerDutyMap = process.env.TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_MAP_JSON;
    const originalDedicatedEmailKey = process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY;
    const originalDedicatedEmailFrom = process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM;
    const originalFallbackEmailKey = process.env.RESEND_API_KEY;
    const originalFallbackEmailFrom = process.env.AUTH_RESEND_FROM;

    process.env.TEMPLATE_CERTIFICATION_ALERT_SLACK_BOT_TOKEN = "xoxb_strict_mode_token";
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_KEY;
    delete process.env.TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_MAP_JSON;
    delete process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY;
    delete process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM;
    delete process.env.RESEND_API_KEY;
    delete process.env.AUTH_RESEND_FROM;

    try {
      await (setTemplateCertificationAutomationPolicy as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateFamily: SALES_TEMPLATE_ROLE,
        policy: {
          ownerUserIds: ["users_sales_owner"],
          alertChannels: ["slack"],
          alertOnCertificationBlocked: true,
          alertOnMissingDefaultEvidence: false,
        },
      });

      const updated = await (setTemplateCertificationAlertDispatchControl as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        policy: {
          channels: {
            slack: {
              enabled: true,
              target: "certification-alerts",
            },
            pagerduty: {
              enabled: true,
              target: "template-certification",
            },
            email: {
              enabled: true,
              target: "alerts@example.com",
            },
          },
          credentialGovernance: {
            slack: {
              requireDedicatedCredentials: false,
              allowInlineTargetCredentials: true,
            },
            pagerduty: {
              allowInlineTargetCredentials: true,
            },
            email: {
              requireDedicatedCredentials: false,
            },
          },
          strictMode: {
            enabled: true,
            rolloutMode: "auto_promote_ready_channels",
            guardrailMode: "advisory",
            notifyOnPolicyDrift: true,
          },
        },
      });

      expect(updated.policy.strictMode.enabled).toBe(true);
      expect(updated.policy.credentialGovernance.slack.requireDedicatedCredentials).toBe(true);
      expect(updated.policy.credentialGovernance.slack.allowInlineTargetCredentials).toBe(false);
      expect(updated.strictModeRollout.promotedChannels).toEqual(["slack"]);
      expect(updated.strictModeRollout.blockedChannels.length).toBeGreaterThanOrEqual(1);
      expect(updated.policyDrift.detected).toBe(true);
      expect(
        updated.policyDrift.issues.some(
          (issue: any) => issue.code === "email_credential_governance_drift",
        ),
      ).toBe(true);

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
            runId: "ci_runtime_strict_mode_1",
          },
        ],
      });
      expect(recorded.summary.policyDrift.detected).toBe(true);
      expect(recorded.summary.strictModeRollout.enabled).toBe(true);
      expect(recorded.summary.alertRecommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "policy_drift_detected",
          }),
        ]),
      );
      expect(recorded.summary.alertDispatches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            recommendationCode: "policy_drift_detected",
            channel: "slack",
          }),
        ]),
      );
    } finally {
      if (originalDedicatedSlackToken === undefined) {
        delete process.env.TEMPLATE_CERTIFICATION_ALERT_SLACK_BOT_TOKEN;
      } else {
        process.env.TEMPLATE_CERTIFICATION_ALERT_SLACK_BOT_TOKEN = originalDedicatedSlackToken;
      }
      if (originalFallbackSlackToken === undefined) {
        delete process.env.SLACK_BOT_TOKEN;
      } else {
        process.env.SLACK_BOT_TOKEN = originalFallbackSlackToken;
      }
      if (originalPagerDutyGlobalKey === undefined) {
        delete process.env.TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_KEY;
      } else {
        process.env.TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_KEY = originalPagerDutyGlobalKey;
      }
      if (originalPagerDutyMap === undefined) {
        delete process.env.TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_MAP_JSON;
      } else {
        process.env.TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_MAP_JSON = originalPagerDutyMap;
      }
      if (originalDedicatedEmailKey === undefined) {
        delete process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY;
      } else {
        process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY = originalDedicatedEmailKey;
      }
      if (originalDedicatedEmailFrom === undefined) {
        delete process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM;
      } else {
        process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM = originalDedicatedEmailFrom;
      }
      if (originalFallbackEmailKey === undefined) {
        delete process.env.RESEND_API_KEY;
      } else {
        process.env.RESEND_API_KEY = originalFallbackEmailKey;
      }
      if (originalFallbackEmailFrom === undefined) {
        delete process.env.AUTH_RESEND_FROM;
      } else {
        process.env.AUTH_RESEND_FROM = originalFallbackEmailFrom;
      }
    }
  });

  it("enforces strict credential governance guardrails when strict mode is enforced", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db);
    const ctx = createCtx(db);
    const originalDedicatedSlackToken = process.env.TEMPLATE_CERTIFICATION_ALERT_SLACK_BOT_TOKEN;
    process.env.TEMPLATE_CERTIFICATION_ALERT_SLACK_BOT_TOKEN = "xoxb_guardrail_token";

    try {
      const updated = await (setTemplateCertificationAlertDispatchControl as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        policy: {
          channels: {
            slack: {
              enabled: true,
              target: "certification-alerts",
            },
            pagerduty: {
              enabled: false,
              target: "template-certification",
            },
            email: {
              enabled: false,
              target: "certification-alerts@ops.local",
            },
          },
          credentialGovernance: {
            slack: {
              requireDedicatedCredentials: false,
              allowInlineTargetCredentials: true,
            },
          },
          strictMode: {
            enabled: true,
            rolloutMode: "manual",
            guardrailMode: "enforced",
            notifyOnPolicyDrift: true,
          },
        },
      });

      expect(updated.policy.strictMode.guardrailMode).toBe("enforced");
      expect(updated.policy.credentialGovernance.slack.requireDedicatedCredentials).toBe(true);
      expect(updated.policy.credentialGovernance.slack.allowInlineTargetCredentials).toBe(false);
      expect(updated.strictModeRollout.promotedChannels).toContain("slack");
      expect(updated.policyDrift.detected).toBe(false);
    } finally {
      if (originalDedicatedSlackToken === undefined) {
        delete process.env.TEMPLATE_CERTIFICATION_ALERT_SLACK_BOT_TOKEN;
      } else {
        process.env.TEMPLATE_CERTIFICATION_ALERT_SLACK_BOT_TOKEN = originalDedicatedSlackToken;
      }
    }
  });

  it("processes queued dispatches, then supports acknowledgement lifecycle", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => "ok",
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    try {
      await (setTemplateCertificationAlertDispatchControl as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        policy: {
          channels: {
            slack: {
              enabled: true,
              target: "https://hooks.slack.com/services/T000/B000/XXXXXXXXXXXXXXXXXXXXXXXX",
            },
          },
        },
      });
      await (setTemplateCertificationAutomationPolicy as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateFamily: SALES_TEMPLATE_ROLE,
        policy: {
          ownerUserIds: ["users_sales_owner"],
          alertChannels: ["slack"],
          alertOnCertificationBlocked: true,
          alertOnMissingDefaultEvidence: false,
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
            runId: "ci_runtime_worker_1",
          },
        ],
      });
      const queuedDispatch = recorded.summary.alertDispatches.find(
        (entry: any) => entry.channel === "slack" && entry.deliveryStatus === "queued",
      );
      expect(queuedDispatch).toBeTruthy();

      const run = await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateVersionId: TEMPLATE_VERSION_V2_ID,
      });
      expect(run.dispatched).toBeGreaterThanOrEqual(1);

      const dispatchRow = db
        .rows("objectActions")
        .find((row) =>
          row.actionType === "template_certification.alert_dispatch"
          && row.actionData?.dedupeKey === queuedDispatch.dedupeKey,
        );
      expect(dispatchRow?.actionData?.deliveryStatus).toBe("dispatched");
      expect(dispatchRow?.actionData?.workerStatus).toBe("dispatched");
      expect(dispatchRow?.actionData?.attemptCount).toBe(1);

      await (acknowledgeTemplateCertificationAlertDispatch as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateVersionId: TEMPLATE_VERSION_V2_ID,
        dedupeKey: queuedDispatch.dedupeKey,
        acknowledgementNote: "Acknowledged by certification owner",
      });

      const rerun = await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateVersionId: TEMPLATE_VERSION_V2_ID,
      });
      expect(rerun.processed).toBe(0);

      const acknowledgedRow = db
        .rows("objectActions")
        .find((row) =>
          row.actionType === "template_certification.alert_dispatch"
          && row.actionData?.dedupeKey === queuedDispatch.dedupeKey,
        );
      expect(acknowledgedRow?.actionData?.deliveryStatus).toBe("acknowledged");
      expect(acknowledgedRow?.actionData?.workerStatus).toBe("acknowledged");
      expect(acknowledgedRow?.actionData?.acknowledgedByUserId).toBe(SUPER_ADMIN_USER_ID);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("supports manual throttle controls and defers worker execution until throttle window", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);

    await (setTemplateCertificationAutomationPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateFamily: SALES_TEMPLATE_ROLE,
      policy: {
        ownerUserIds: ["users_sales_owner"],
        alertChannels: ["slack"],
        alertOnCertificationBlocked: true,
        alertOnMissingDefaultEvidence: false,
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
          runId: "ci_runtime_throttle_1",
        },
      ],
    });
    const queuedDispatch = recorded.summary.alertDispatches.find(
      (entry: any) => entry.channel === "slack" && entry.deliveryStatus === "queued",
    );
    expect(queuedDispatch).toBeTruthy();

    const throttled = await (throttleTemplateCertificationAlertDispatch as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
      dedupeKey: queuedDispatch.dedupeKey,
      throttleMinutes: 60,
      reason: "incident_noise_control",
    });
    expect(throttled.deliveryStatus).toBe("throttled");
    expect(throttled.workerStatus).toBe("throttled");
    expect(throttled.throttleReason).toBe("incident_noise_control");
    expect(throttled.nextAttemptAt).toBeGreaterThan(0);

    const run = await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
      now: (throttled.nextAttemptAt ?? 0) - 10_000,
    });
    expect(run.processed).toBe(0);
    expect(run.pending).toBeGreaterThanOrEqual(1);
  });

  it("keeps retry behavior fail-closed and transitions to terminal failure when attempts exhaust", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);

    await (setTemplateCertificationAlertDispatchControl as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      policy: {
        maxAttempts: 2,
        retryDelayMs: 1_000,
        channels: {
          slack: {
            enabled: true,
            target: "simulate_retryable_failure",
          },
        },
      },
    });
    await (setTemplateCertificationAutomationPolicy as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateFamily: SALES_TEMPLATE_ROLE,
      policy: {
        ownerUserIds: ["users_sales_owner"],
        alertChannels: ["slack"],
        alertOnCertificationBlocked: true,
        alertOnMissingDefaultEvidence: false,
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
          runId: "ci_runtime_retry_1",
        },
      ],
    });
    const queuedDispatch = recorded.summary.alertDispatches.find(
      (entry: any) => entry.channel === "slack" && entry.deliveryStatus === "queued",
    );
    expect(queuedDispatch).toBeTruthy();

    await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
    });
    const firstFailure = db
      .rows("objectActions")
      .find((row) =>
        row.actionType === "template_certification.alert_dispatch"
        && row.actionData?.dedupeKey === queuedDispatch.dedupeKey,
      );
    expect(firstFailure?.actionData?.deliveryStatus).toBe("dispatch_failed");
    expect(firstFailure?.actionData?.workerStatus).toBe("retry_scheduled");
    expect(firstFailure?.actionData?.attemptCount).toBe(1);
    expect(firstFailure?.actionData?.nextAttemptAt).toBeGreaterThan(0);

    await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
      sessionId: SUPER_ADMIN_SESSION_ID,
      templateVersionId: TEMPLATE_VERSION_V2_ID,
      now: (firstFailure?.actionData?.nextAttemptAt ?? 0) + 1,
    });
    const terminalFailure = db
      .rows("objectActions")
      .find((row) =>
        row.actionType === "template_certification.alert_dispatch"
        && row.actionData?.dedupeKey === queuedDispatch.dedupeKey,
      );
    expect(terminalFailure?.actionData?.deliveryStatus).toBe("dispatch_failed");
    expect(terminalFailure?.actionData?.workerStatus).toBe("failed_terminal");
    expect(terminalFailure?.actionData?.attemptCount).toBe(2);
  });

  it("dispatches queued Slack alerts through external transport adapters", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => "ok",
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    try {
      const queuedDispatch = await queueAlertDispatchForChannel({
        ctx,
        channel: "slack",
        target: "https://hooks.slack.com/services/T000/B000/XXXXXXXXXXXXXXXXXXXXXXXX",
      });
      expect(queuedDispatch).toBeTruthy();

      const run = await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateVersionId: TEMPLATE_VERSION_V2_ID,
      });
      expect(run.dispatched).toBeGreaterThanOrEqual(1);
      expect(fetchMock).toHaveBeenCalled();

      const dispatched = db
        .rows("objectActions")
        .find((row) =>
          row.actionType === "template_certification.alert_dispatch"
          && row.actionData?.dedupeKey === queuedDispatch.dedupeKey,
        );
      expect(dispatched?.actionData?.deliveryStatus).toBe("dispatched");
      expect(dispatched?.actionData?.workerStatus).toBe("dispatched");
      expect(dispatched?.actionData?.attemptCount).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("keeps PagerDuty adapter retry behavior deterministic and terminal after max attempts", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      headers: { get: () => null },
      json: async () => ({ status: "error", message: "pagerduty unavailable" }),
    }));
    vi.stubGlobal("fetch", fetchMock as any);

    try {
      const queuedDispatch = await queueAlertDispatchForChannel({
        ctx,
        channel: "pagerduty",
        target: "routing_key:pd_routing_key_12345678901234567890",
        maxAttempts: 2,
        retryDelayMs: 1_000,
      });
      expect(queuedDispatch).toBeTruthy();

      await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateVersionId: TEMPLATE_VERSION_V2_ID,
      });
      const firstFailure = db
        .rows("objectActions")
        .find((row) =>
          row.actionType === "template_certification.alert_dispatch"
          && row.actionData?.dedupeKey === queuedDispatch.dedupeKey,
        );
      expect(firstFailure?.actionData?.deliveryStatus).toBe("dispatch_failed");
      expect(firstFailure?.actionData?.workerStatus).toBe("retry_scheduled");
      expect(firstFailure?.actionData?.lastErrorCode).toBe("pagerduty_http_500");

      await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateVersionId: TEMPLATE_VERSION_V2_ID,
        now: (firstFailure?.actionData?.nextAttemptAt ?? 0) + 1,
      });
      const terminalFailure = db
        .rows("objectActions")
        .find((row) =>
          row.actionType === "template_certification.alert_dispatch"
          && row.actionData?.dedupeKey === queuedDispatch.dedupeKey,
        );
      expect(terminalFailure?.actionData?.deliveryStatus).toBe("dispatch_failed");
      expect(terminalFailure?.actionData?.workerStatus).toBe("failed_terminal");
      expect(terminalFailure?.actionData?.attemptCount).toBe(2);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("dispatches queued email alerts through resend adapter", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);
    const originalResendApiKey = process.env.RESEND_API_KEY;
    const originalAuthResendFrom = process.env.AUTH_RESEND_FROM;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({ id: "email_dispatch_1" }),
    }));
    vi.stubGlobal("fetch", fetchMock as any);
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.AUTH_RESEND_FROM = "alerts@example.com";

    try {
      const queuedDispatch = await queueAlertDispatchForChannel({
        ctx,
        channel: "email",
        target: "ops@example.com",
      });
      expect(queuedDispatch).toBeTruthy();

      await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateVersionId: TEMPLATE_VERSION_V2_ID,
      });
      const dispatched = db
        .rows("objectActions")
        .find((row) =>
          row.actionType === "template_certification.alert_dispatch"
          && row.actionData?.dedupeKey === queuedDispatch.dedupeKey,
        );
      expect(dispatched?.actionData?.deliveryStatus).toBe("dispatched");
      expect(dispatched?.actionData?.workerStatus).toBe("dispatched");
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({ method: "POST" }),
      );
    } finally {
      if (originalResendApiKey === undefined) {
        delete process.env.RESEND_API_KEY;
      } else {
        process.env.RESEND_API_KEY = originalResendApiKey;
      }
      if (originalAuthResendFrom === undefined) {
        delete process.env.AUTH_RESEND_FROM;
      } else {
        process.env.AUTH_RESEND_FROM = originalAuthResendFrom;
      }
      vi.unstubAllGlobals();
    }
  });

  it("fails closed when email credential governance requires dedicated env secrets", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);
    const originalDedicatedApiKey = process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY;
    const originalDedicatedFrom = process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM;
    const originalResendApiKey = process.env.RESEND_API_KEY;
    const originalAuthResendFrom = process.env.AUTH_RESEND_FROM;
    delete process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY;
    delete process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM;
    process.env.RESEND_API_KEY = "fallback_resend_key";
    process.env.AUTH_RESEND_FROM = "alerts-fallback@example.com";

    try {
      const queuedDispatch = await queueAlertDispatchForChannel({
        ctx,
        channel: "email",
        target: "ops@example.com",
        maxAttempts: 1,
      });
      expect(queuedDispatch).toBeTruthy();

      await (setTemplateCertificationAlertDispatchControl as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        policy: {
          credentialGovernance: {
            email: {
              requireDedicatedCredentials: true,
            },
          },
        },
      });

      await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateVersionId: TEMPLATE_VERSION_V2_ID,
      });
      const failedClosed = db
        .rows("objectActions")
        .find((row) =>
          row.actionType === "template_certification.alert_dispatch"
          && row.actionData?.dedupeKey === queuedDispatch.dedupeKey,
        );
      expect(failedClosed?.actionData?.deliveryStatus).toBe("dispatch_failed");
      expect(failedClosed?.actionData?.workerStatus).toBe("failed_terminal");
      expect(failedClosed?.actionData?.lastErrorCode).toBe(
        "email_transport_credential_policy_violation",
      );
      expect(failedClosed?.actionData?.lastErrorMessage).toContain(
        "TRANSPORT_CREDENTIAL_RUNBOOK.md#email",
      );
    } finally {
      if (originalDedicatedApiKey === undefined) {
        delete process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY;
      } else {
        process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY = originalDedicatedApiKey;
      }
      if (originalDedicatedFrom === undefined) {
        delete process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM;
      } else {
        process.env.TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM = originalDedicatedFrom;
      }
      if (originalResendApiKey === undefined) {
        delete process.env.RESEND_API_KEY;
      } else {
        process.env.RESEND_API_KEY = originalResendApiKey;
      }
      if (originalAuthResendFrom === undefined) {
        delete process.env.AUTH_RESEND_FROM;
      } else {
        process.env.AUTH_RESEND_FROM = originalAuthResendFrom;
      }
    }
  });

  it("fails closed for queued email alerts when resend transport credentials are missing", async () => {
    const db = new FakeDb();
    seedTemplateWithTwoVersions(db, {
      templateRole: SALES_TEMPLATE_ROLE,
    });
    const ctx = createCtx(db);
    const originalResendApiKey = process.env.RESEND_API_KEY;
    const originalAuthResendFrom = process.env.AUTH_RESEND_FROM;
    delete process.env.RESEND_API_KEY;
    delete process.env.AUTH_RESEND_FROM;

    try {
      const queuedDispatch = await queueAlertDispatchForChannel({
        ctx,
        channel: "email",
        target: "ops@example.com",
        maxAttempts: 1,
      });
      expect(queuedDispatch).toBeTruthy();

      await (processTemplateCertificationAlertDispatchQueueNow as any)._handler(ctx, {
        sessionId: SUPER_ADMIN_SESSION_ID,
        templateVersionId: TEMPLATE_VERSION_V2_ID,
      });
      const failedClosed = db
        .rows("objectActions")
        .find((row) =>
          row.actionType === "template_certification.alert_dispatch"
          && row.actionData?.dedupeKey === queuedDispatch.dedupeKey,
        );
      expect(failedClosed?.actionData?.deliveryStatus).toBe("dispatch_failed");
      expect(failedClosed?.actionData?.workerStatus).toBe("failed_terminal");
      expect(failedClosed?.actionData?.lastErrorCode).toBe("email_transport_not_configured");
    } finally {
      if (originalResendApiKey === undefined) {
        delete process.env.RESEND_API_KEY;
      } else {
        process.env.RESEND_API_KEY = originalResendApiKey;
      }
      if (originalAuthResendFrom === undefined) {
        delete process.env.AUTH_RESEND_FROM;
      } else {
        process.env.AUTH_RESEND_FROM = originalAuthResendFrom;
      }
    }
  });
});
