import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  PLATFORM_MOTHER_REVIEW_ACTION_RECORDED,
  PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
  PLATFORM_MOTHER_REVIEW_OBJECT_SUBTYPE,
  buildPlatformMotherReviewArtifactAuditEnvelope,
  createPlatformMotherReviewArtifactInternal,
  getPlatformMotherReviewArtifactInternal,
  listPlatformMotherReviewArtifactsInternal,
  normalizePlatformMotherApprovalEnvelope,
  normalizePlatformMotherRejectionEnvelope,
  normalizePlatformMotherReviewArtifact,
} from "../../../convex/ai/platformMotherReviewArtifacts";
import {
  PLATFORM_MOTHER_CANONICAL_NAME,
  PLATFORM_MOTHER_LEGACY_NAME,
} from "../../../convex/platformMother";

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

  rows(table: string): FakeRow[] {
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

const PLATFORM_ORG_ID = "organizations_platform";
const CUSTOMER_ORG_ID = "organizations_customer";
const ACTOR_USER_ID = "users_admin";
const TEMPLATE_ID = "objects_template";
const TEMPLATE_VERSION_ID = "objects_template_version";
const CREATED_AT = 1_763_000_000_000;

describe("platform Mother audit contracts", () => {
  const previousPlatformOrgId = process.env.PLATFORM_ORG_ID;
  const previousTestOrgId = process.env.TEST_ORG_ID;

  beforeEach(() => {
    delete process.env.PLATFORM_ORG_ID;
    process.env.TEST_ORG_ID = PLATFORM_ORG_ID;
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
  });

  it("normalizes pending proposal artifacts with dry-run placeholders and Quinn alias evidence", () => {
    const artifact = normalizePlatformMotherReviewArtifact(
      {
        targetTemplateRole: "personal_life_operator_template",
        targetTemplateId: TEMPLATE_ID,
        targetTemplateVersionId: TEMPLATE_VERSION_ID,
        targetTemplateVersionTag: "v7",
        requestingOrganizationId: CUSTOMER_ORG_ID,
        sourceConversationId: "conv_support_1",
        sourceMotherRuntimeId: "mother_support_runtime",
        proposalSummary: "Tighten operator handoff copy and add migration checklist.",
        proposalDetails: "Read-only review proposal only.",
        dryRunCorrelationId: "dry_run_1",
        aliasMigrationEvidence: {
          evidenceSummary: "Legacy Quinn lookup still resolves the Mother lineage safely.",
          matchedFields: ["legacyIdentityAliases", "name"],
          sourceTemplateId: TEMPLATE_ID,
          sourceTemplateVersionId: TEMPLATE_VERSION_ID,
          recordedAt: CREATED_AT,
        },
      },
      {
        defaultCreatedAt: CREATED_AT,
        defaultCreatedByUserId: ACTOR_USER_ID,
      },
    );

    expect(artifact).not.toBeNull();
    expect(artifact?.approvalStatus).toBe("pending");
    expect(artifact?.executionStatus).toBe("dry_run_pending");
    expect(artifact?.execution.dryRunCorrelationId).toBe("dry_run_1");
    expect(artifact?.aliasMigrationEvidence?.canonicalIdentityName).toBe(
      PLATFORM_MOTHER_CANONICAL_NAME,
    );
    expect(artifact?.aliasMigrationEvidence?.legacyIdentityAlias).toBe(
      PLATFORM_MOTHER_LEGACY_NAME,
    );
    expect(artifact?.policyFamilyScope.eligible).toBe(true);
    expect(artifact?.rolloutGateRequirements.status).toBe("satisfied_for_review");
    expect(artifact?.createdByUserId).toBe(ACTOR_USER_ID);
  });

  it("normalizes approval and rejection envelopes into explicit review states", () => {
    const approval = normalizePlatformMotherApprovalEnvelope({
      approverUserId: "users_reviewer",
      approverRole: "super_admin",
      reason: "Read-only dry run and alias evidence reviewed.",
      ticketId: "OPS-42",
      decidedAt: CREATED_AT,
    });
    const rejection = normalizePlatformMotherRejectionEnvelope({
      reviewerUserId: "users_reviewer",
      reasonCode: "missing_risk_notes",
      reason: "Proposal lacks rollback and blast-radius notes.",
      decidedAt: CREATED_AT,
    });

    expect(approval).toEqual(
      expect.objectContaining({
        status: "approved",
        approverUserId: "users_reviewer",
        approverRole: "super_admin",
      }),
    );
    expect(rejection).toEqual(
      expect.objectContaining({
        status: "rejected",
        reviewerUserId: "users_reviewer",
        reasonCode: "missing_risk_notes",
      }),
    );

    const approvedArtifact = normalizePlatformMotherReviewArtifact(
      {
        targetTemplateRole: "personal_life_operator_template",
        proposalSummary: "Approve the review packet only.",
        approvalStatus: "approved",
        approval,
      },
      { defaultCreatedAt: CREATED_AT },
    );
    const rejectedArtifact = normalizePlatformMotherReviewArtifact(
      {
        targetTemplateRole: "personal_life_operator_template",
        proposalSummary: "Reject the packet pending more evidence.",
        approvalStatus: "rejected",
        rejection,
      },
      { defaultCreatedAt: CREATED_AT },
    );

    expect(approvedArtifact?.executionStatus).toBe("approved_no_execution");
    expect(rejectedArtifact?.executionStatus).toBe("not_requested");
  });

  it("rejects approved review artifacts that omit persisted approver identity", () => {
    expect(
      normalizePlatformMotherReviewArtifact(
        {
          targetTemplateRole: "personal_life_operator_template",
          proposalSummary: "Missing approver identity must fail closed.",
          approvalStatus: "approved",
          approval: {
            reason: "Reviewed without actor attribution.",
            decidedAt: CREATED_AT,
          },
        },
        { defaultCreatedAt: CREATED_AT },
      ),
    ).toBeNull();
  });

  it("rejects governance review artifacts that lack alias evidence, review context, or dry-run evidence", () => {
    expect(
      normalizePlatformMotherReviewArtifact(
        {
          artifactKind: "migration_plan",
          targetTemplateRole: "personal_life_operator_template",
          proposalSummary: "Missing review context should fail closed.",
          aliasMigrationEvidence: {
            evidenceSummary: "Mother runtime still carries Quinn alias support.",
            matchedFields: ["canonicalIdentityName", "legacyIdentityAliases"],
            recordedAt: CREATED_AT,
          },
          execution: {
            dryRunCorrelationId: "dry_run_missing_evidence",
            downstreamObjectActionIds: [],
            downstreamAuditLogIds: [],
          },
        },
        { defaultCreatedAt: CREATED_AT },
      ),
    ).toBeNull();

    const artifact = normalizePlatformMotherReviewArtifact(
      {
        artifactKind: "migration_plan",
        targetTemplateRole: "personal_life_operator_template",
        proposalSummary: "Migration review packet is ready for audit.",
        aliasMigrationEvidence: {
          evidenceSummary: "Mother runtime still carries Quinn alias support.",
          matchedFields: ["canonicalIdentityName", "legacyIdentityAliases"],
          recordedAt: CREATED_AT,
        },
        execution: {
          dryRunCorrelationId: "dry_run_1",
          downstreamObjectActionIds: ["objectActions_dry_run_1"],
          downstreamAuditLogIds: [],
        },
        reviewContext: {
          requestedTargetOrganizationIds: [CUSTOMER_ORG_ID],
          stagedTargetOrganizationIds: [CUSTOMER_ORG_ID],
          recentDistributionJobIds: ["dry_run_1"],
          rolloutWindow: {
            stageStartIndex: 0,
            stageSize: 1,
            requestedTargetCount: 1,
            stagedTargetCount: 1,
            partialRolloutDetected: false,
            historicalPartialRolloutDetected: false,
          },
          driftSummary: {
            totalOrganizations: 1,
            missingCloneCount: 0,
            interventionCount: 1,
            reviewStateCounts: {
              missingClone: 0,
              inSync: 0,
              overridden: 0,
              stale: 0,
              blocked: 1,
            },
            riskLevelCounts: {
              low: 0,
              medium: 0,
              high: 1,
            },
          },
          interventionPackets: [
            {
              organizationId: CUSTOMER_ORG_ID,
              reviewState: "blocked",
              riskLevel: "high",
              reviewReasons: ["warn_confirmation_required"],
              changedFields: ["systemPrompt"],
              blockedFields: [],
              overriddenFields: ["systemPrompt"],
            },
          ],
        },
      },
      { defaultCreatedAt: CREATED_AT },
    );

    expect(artifact?.artifactKind).toBe("migration_plan");
    expect(artifact?.reviewContext?.driftSummary.interventionCount).toBe(1);
    expect(artifact?.reviewContext?.rolloutWindow.partialRolloutDetected).toBe(false);
  });

  it("rejects invalid review artifacts with missing required fields", async () => {
    expect(
      normalizePlatformMotherReviewArtifact(
        {
          proposalSummary: "Missing template role should fail closed.",
        },
        { defaultCreatedAt: CREATED_AT },
      ),
    ).toBeNull();

    await expect(
      (createPlatformMotherReviewArtifactInternal as any)._handler(createCtx(new FakeDb()), {
        artifact: {
          proposalSummary: "Still missing the template role.",
        },
        actorUserId: ACTOR_USER_ID,
      }),
    ).rejects.toThrow(/Platform Mother review artifact/);
  });

  it("persists a read-only review artifact with objectActions and auditLogs evidence only", async () => {
    const db = new FakeDb();
    db.seed("objects", {
      _id: TEMPLATE_ID,
      organizationId: PLATFORM_ORG_ID,
      type: "org_agent",
      subtype: "general",
      name: "One-of-One Operator Template",
      status: "active",
      createdAt: CREATED_AT - 10,
      updatedAt: CREATED_AT - 10,
      customProperties: {
        templateRole: "personal_life_operator_template",
      },
    });

    const result = await (createPlatformMotherReviewArtifactInternal as any)._handler(
      createCtx(db),
      {
        actorUserId: ACTOR_USER_ID,
        artifact: {
          targetTemplateRole: "personal_life_operator_template",
          targetTemplateId: TEMPLATE_ID,
          targetTemplateVersionId: TEMPLATE_VERSION_ID,
          targetTemplateVersionTag: "v7",
          requestingOrganizationId: CUSTOMER_ORG_ID,
          sourceConversationId: "conv_support_1",
          sourceMotherRuntimeId: "mother_support_runtime",
          proposalSummary: "Capture operator template rollout proposal for human review.",
          dryRunCorrelationId: "dry_run_1",
          aliasMigrationEvidence: {
            evidenceSummary: "Quinn alias fallback still resolves the Mother template safely.",
            matchedFields: ["canonicalIdentityName", "legacyIdentityAliases"],
            sourceTemplateId: TEMPLATE_ID,
            sourceTemplateVersionId: TEMPLATE_VERSION_ID,
            sourceTemplateVersionTag: "v7",
            recordedAt: CREATED_AT,
          },
          createdAt: CREATED_AT,
        },
      },
    );

    const objectRows = db.rows("objects");
    const reviewArtifactRow = objectRows.find((row) => row._id === result.artifactId);
    expect(reviewArtifactRow).toEqual(
      expect.objectContaining({
        organizationId: PLATFORM_ORG_ID,
        type: PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
        subtype: PLATFORM_MOTHER_REVIEW_OBJECT_SUBTYPE,
        status: "pending",
      }),
    );
    expect(reviewArtifactRow?.customProperties.approvalStatus).toBe("pending");
    expect(reviewArtifactRow?.customProperties.executionStatus).toBe("dry_run_pending");
    expect(reviewArtifactRow?.customProperties.policyFamilyScope?.eligible).toBe(true);
    expect(reviewArtifactRow?.customProperties.rolloutGateRequirements?.status).toBe(
      "satisfied_for_review",
    );

    const objectActions = db.rows("objectActions");
    const auditLogs = db.rows("auditLogs");
    expect(objectActions).toHaveLength(1);
    expect(auditLogs).toHaveLength(1);
    expect(objectActions[0]).toEqual(
      expect.objectContaining({
        organizationId: PLATFORM_ORG_ID,
        objectId: result.artifactId,
        actionType: PLATFORM_MOTHER_REVIEW_ACTION_RECORDED,
      }),
    );
    expect(auditLogs[0]).toEqual(
      expect.objectContaining({
        organizationId: PLATFORM_ORG_ID,
        action: PLATFORM_MOTHER_REVIEW_ACTION_RECORDED,
        resource: PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
        resourceId: result.artifactId,
        success: true,
      }),
    );
    expect(
      objectActions.some((row) =>
        row.actionType === "agent_template.version_published"
        || row.actionType === "template_distribution_applied"
        || row.actionType === "template_distribution_updated",
      ),
    ).toBe(false);
    expect(
      objectActions.some((row) => row.objectId === TEMPLATE_ID),
    ).toBe(false);

    expect(result.auditEnvelope).toEqual(
      expect.objectContaining({
        readOnly: true,
        platformOrganizationId: PLATFORM_ORG_ID,
        artifactId: result.artifactId,
      }),
    );
    expect(result.auditEnvelope.proposal).toEqual(
      expect.objectContaining({
        approvalStatus: "pending",
        executionStatus: "dry_run_pending",
        dryRunCorrelationId: "dry_run_1",
      }),
    );
    expect(result.auditEnvelope.aliasMigrationEvidence).toEqual(
      expect.objectContaining({
        canonicalIdentityName: PLATFORM_MOTHER_CANONICAL_NAME,
        legacyIdentityAlias: PLATFORM_MOTHER_LEGACY_NAME,
      }),
    );

    const loaded = await (getPlatformMotherReviewArtifactInternal as any)._handler(
      createCtx(db),
      { artifactId: result.artifactId },
    );
    expect(loaded?.artifact).toEqual(
      expect.objectContaining({
        artifactId: result.artifactId,
        platformOrganizationId: PLATFORM_ORG_ID,
        approvalStatus: "pending",
        executionStatus: "dry_run_pending",
      }),
    );
    expect(loaded?.evidence.objectActions).toHaveLength(1);
    expect(loaded?.evidence.auditLogs).toHaveLength(1);
    expect(loaded?.evidence.relatedObjectActions).toHaveLength(0);
    expect(loaded?.evidence.relatedAuditLogs).toHaveLength(0);
  });

  it("builds a stable audit envelope shape for downstream evidence rails", () => {
    const artifact = normalizePlatformMotherReviewArtifact(
      {
        targetTemplateRole: "personal_life_operator_template",
        targetTemplateId: TEMPLATE_ID,
        proposalSummary: "Audit envelope contract check.",
        aliasMigrationEvidence: {
          evidenceSummary: "Quinn alias kept as migration evidence.",
          matchedFields: ["name"],
          recordedAt: CREATED_AT,
        },
      },
      { defaultCreatedAt: CREATED_AT },
    );

    const envelope = buildPlatformMotherReviewArtifactAuditEnvelope({
      artifactId: "objects_review_1",
      platformOrganizationId: PLATFORM_ORG_ID,
      artifact: artifact!,
      actorUserId: ACTOR_USER_ID,
    });

    expect(envelope).toEqual(
      expect.objectContaining({
        action: PLATFORM_MOTHER_REVIEW_ACTION_RECORDED,
        readOnly: true,
        motherIdentity: {
          canonicalName: PLATFORM_MOTHER_CANONICAL_NAME,
          legacyAlias: PLATFORM_MOTHER_LEGACY_NAME,
        },
      }),
    );
    expect(envelope.target).toEqual(
      expect.objectContaining({
        templateRole: "personal_life_operator_template",
        templateId: TEMPLATE_ID,
      }),
    );
    expect(envelope.aliasMigrationEvidence?.legacyIdentityAlias).toBe("Quinn");
  });

  it("lists Mother review artifacts for internal programmatic controls with stable filters", async () => {
    const db = new FakeDb();

    await (createPlatformMotherReviewArtifactInternal as any)._handler(createCtx(db), {
      actorUserId: ACTOR_USER_ID,
      artifact: {
        targetTemplateRole: "personal_life_operator_template",
        proposalSummary: "Pending customer proposal.",
        requestingOrganizationId: CUSTOMER_ORG_ID,
        createdAt: CREATED_AT,
      },
    });
    await (createPlatformMotherReviewArtifactInternal as any)._handler(createCtx(db), {
      actorUserId: ACTOR_USER_ID,
      artifact: {
        targetTemplateRole: "personal_life_operator_template",
        proposalSummary: "Approved customer proposal.",
        requestingOrganizationId: CUSTOMER_ORG_ID,
        approvalStatus: "approved",
        approval: {
          approverUserId: ACTOR_USER_ID,
          approverRole: "super_admin",
          reason: "Reviewed and approved programmatically.",
          decidedAt: CREATED_AT + 10,
        },
        createdAt: CREATED_AT + 10,
      },
    });
    await (createPlatformMotherReviewArtifactInternal as any)._handler(createCtx(db), {
      actorUserId: ACTOR_USER_ID,
      artifact: {
        targetTemplateRole: "personal_life_operator_template",
        proposalSummary: "Other org proposal.",
        requestingOrganizationId: "organizations_other",
        createdAt: CREATED_AT + 20,
      },
    });

    const filtered = await (listPlatformMotherReviewArtifactsInternal as any)._handler(
      createCtx(db),
      {
        requestingOrganizationId: CUSTOMER_ORG_ID,
        limit: 10,
      },
    );

    expect(filtered.totalCount).toBe(2);
    expect(filtered.statusCounts).toEqual({
      pending: 1,
      approved: 1,
      rejected: 0,
    });
    expect(
      filtered.artifacts.every(
        (artifact: any) => artifact.requestingOrganizationId === CUSTOMER_ORG_ID,
      ),
    ).toBe(true);

    const approvedOnly = await (listPlatformMotherReviewArtifactsInternal as any)._handler(
      createCtx(db),
      {
        approvalStatus: "approved",
        requestingOrganizationId: CUSTOMER_ORG_ID,
        limit: 10,
      },
    );

    expect(approvedOnly.totalCount).toBe(1);
    expect(approvedOnly.artifacts[0]?.approvalStatus).toBe("approved");
  });
});
