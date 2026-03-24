import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getPlatformMotherRolloutStatus,
  setPlatformMotherLive,
} from "../../../convex/ai/platformMotherAdmin";
import { PLATFORM_MOTHER_REVIEW_OBJECT_TYPE, getPlatformMotherReviewArtifactInternal } from "../../../convex/ai/platformMotherReviewArtifacts";
import { MOTHER_SUPPORT_RUNTIME_SEED } from "../../../convex/onboarding/seedPlatformAgents";
import { PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY } from "../../../convex/platformMother";
import {
  CUSTOMER_ORG_A_ID,
  CUSTOMER_ORG_B_ID,
  FakeDb,
  PLATFORM_ORG_ID,
  createCtx,
  seedCanonicalOperatorTemplate,
  seedMotherGovernanceRuntime,
  seedOrganization,
  seedWaeGateArtifact,
} from "../../integration/ai/platformMotherExecutionHarness";

const SUPER_ADMIN_ROLE_ID = "roles_super_admin";
const SUPER_ADMIN_USER_ID = "users_super_admin";
const SUPER_ADMIN_SESSION_ID = "sessions_super_admin";
const MOTHER_SUPPORT_ID = "objects_mother_support";

function seedSuperAdminSession(db: FakeDb) {
  const now = Date.now();
  db.seed("roles", {
    _id: SUPER_ADMIN_ROLE_ID,
    name: "super_admin",
    isActive: true,
  } as any);
  db.seed("users", {
    _id: SUPER_ADMIN_USER_ID,
    email: "super-admin@example.com",
    defaultOrgId: PLATFORM_ORG_ID,
    global_role_id: SUPER_ADMIN_ROLE_ID,
  } as any);
  db.seed("sessions", {
    _id: SUPER_ADMIN_SESSION_ID,
    userId: SUPER_ADMIN_USER_ID,
    organizationId: PLATFORM_ORG_ID,
    email: "super-admin@example.com",
    expiresAt: now + 60_000,
  } as any);
}

function seedMotherSupportRuntime(db: FakeDb) {
  db.seed("objects", {
    _id: MOTHER_SUPPORT_ID,
    organizationId: PLATFORM_ORG_ID,
    type: "org_agent",
    subtype: MOTHER_SUPPORT_RUNTIME_SEED.subtype,
    name: MOTHER_SUPPORT_RUNTIME_SEED.name,
    description: MOTHER_SUPPORT_RUNTIME_SEED.description,
    status: "active",
    createdAt: 1_763_000_000_000,
    updatedAt: 1_763_000_000_000,
    customProperties: {
      ...MOTHER_SUPPORT_RUNTIME_SEED.customProperties,
    },
  } as any);
}

function seedAdminRolloutBase(db: FakeDb) {
  seedOrganization(db, { id: PLATFORM_ORG_ID, name: "Platform" });
  seedOrganization(db, { id: CUSTOMER_ORG_A_ID, name: "Customer A" });
  seedOrganization(db, { id: CUSTOMER_ORG_B_ID, name: "Customer B" });
  seedSuperAdminSession(db);
  seedMotherGovernanceRuntime(db);
  seedMotherSupportRuntime(db);
  seedCanonicalOperatorTemplate(db);
  seedWaeGateArtifact(db);
}

describe("Platform Mother admin rollout", () => {
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

  it("returns an empty rollout queue before any Mother review artifacts exist", async () => {
    const db = new FakeDb();
    seedAdminRolloutBase(db);

    const overview = await (getPlatformMotherRolloutStatus as any)._handler(
      createCtx(db),
      {
        sessionId: SUPER_ADMIN_SESSION_ID,
      },
    );

    expect(overview.needsSeed).toBe(false);
    expect(overview.routeCandidates).toEqual([]);
    expect(overview.statusCounts).toEqual({
      pending: 0,
      approved: 0,
      rejected: 0,
    });
  });

  it("auto-generates and binds a fresh Mother migration review when going live without selecting an artifact", async () => {
    const db = new FakeDb();
    seedAdminRolloutBase(db);

    const result = await (setPlatformMotherLive as any)._handler(createCtx(db), {
      sessionId: SUPER_ADMIN_SESSION_ID,
      reason: "Approve Mother live rollout from the admin surface.",
      ticketId: "OPS-PSA-MOTHER",
      notes: "Generate the required review during go-live.",
    });

    expect(result.needsSeed).toBe(false);
    expect(result.routeAvailability?.enabled).toBe(true);
    expect(result.releaseStatus?.stage).toBe(
      PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY,
    );
    expect(result.routeFlags).toMatchObject({
      identityEnabled: true,
      supportRouteEnabled: true,
    });
    expect(result.releaseStatus?.reviewArtifactId).toBeTruthy();
    expect(result.routeCandidates).toHaveLength(1);
    expect(result.statusCounts).toEqual({
      pending: 0,
      approved: 1,
      rejected: 0,
    });

    const reviewArtifactId = result.releaseStatus?.reviewArtifactId;
    const reviewObjects = db.rows("objects").filter(
      (row) => row.type === PLATFORM_MOTHER_REVIEW_OBJECT_TYPE,
    );
    expect(reviewObjects).toHaveLength(1);
    expect(reviewObjects[0]?._id).toBe(reviewArtifactId);

    const supportRuntime = db.rows("objects").find((row) => row._id === MOTHER_SUPPORT_ID);
    expect(
      supportRuntime?.customProperties?.platformMotherSupportRelease,
    ).toMatchObject({
      stage: PLATFORM_MOTHER_SUPPORT_RELEASE_STAGE_GENERAL_AVAILABILITY,
      reviewArtifactId,
      approvedByUserId: SUPER_ADMIN_USER_ID,
    });
    expect(
      supportRuntime?.customProperties?.platformMotherSupportRouteFlags,
    ).toMatchObject({
      identityEnabled: true,
      supportRouteEnabled: true,
      reviewArtifactId,
      updatedByUserId: SUPER_ADMIN_USER_ID,
    });

    const loaded = await (getPlatformMotherReviewArtifactInternal as any)._handler(
      createCtx(db),
      {
        artifactId: reviewArtifactId,
      },
    );
    expect(loaded?.artifact.artifactKind).toBe("migration_plan");
    expect(loaded?.artifact.approvalStatus).toBe("approved");
    expect(loaded?.artifact.approval?.approverUserId).toBe(SUPER_ADMIN_USER_ID);
    expect(loaded?.artifact.reviewContext?.requestedTargetOrganizationIds).toEqual([
      CUSTOMER_ORG_A_ID,
      CUSTOMER_ORG_B_ID,
    ]);
    expect(loaded?.artifact.execution.dryRunCorrelationId).toBeTruthy();
  });
});
