import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { provisionOrganizationBaselineInternal } from "../../../convex/organizations";
import {
  STARTER_TEMPLATE_PROVISIONING_ENV_FLAG,
  createFreeAccountInternal,
  isStarterTemplateProvisioningEnabled,
  maybeProvisionStarterTemplatesForSignup,
  signupFreeAccount,
} from "../../../convex/onboarding";
import { findOrCreateUserFromOAuth } from "../../../convex/api/v1/oauthSignup";

type FakeRow = Record<string, any> & { _id: string };

class FakeQuery {
  private readonly filters = new Map<string, unknown>();

  constructor(private readonly rows: FakeRow[]) {}

  withIndex(
    _indexName: string,
    build?: (q: { eq: (field: string, value: unknown) => unknown; field: (field: string) => string }) => unknown,
  ) {
    this.applyBuilder(build);
    return this;
  }

  filter(
    build?: (q: { eq: (field: string, value: unknown) => unknown; field: (field: string) => string }) => unknown,
  ) {
    this.applyBuilder(build);
    return this;
  }

  async first() {
    const [first] = this.apply();
    return first ? { ...first } : null;
  }

  async collect() {
    return this.apply().map((row) => ({ ...row }));
  }

  private applyBuilder(
    build?: (q: { eq: (field: string, value: unknown) => unknown; field: (field: string) => string }) => unknown,
  ) {
    if (!build) {
      return;
    }
    const query = {
      eq: (field: string, value: unknown) => {
        this.filters.set(field, value);
        return query;
      },
      field: (field: string) => field,
    };
    build(query);
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

const ORG_OWNER_ROLE_ID = "role_org_owner" as Id<"roles">;
const CLAIMED_ORG_ID = "organizations_claimed" as Id<"organizations">;
const EXISTING_USER_ID = "users_existing" as Id<"users">;

function seedOrgOwnerRole(db: FakeDb) {
  db.seed("roles", {
    _id: ORG_OWNER_ROLE_ID,
    name: "org_owner",
    description: "Organization owner",
    isActive: true,
    createdAt: 1,
    updatedAt: 1,
  });
}

function seedSystemOrg(db: FakeDb) {
  db.seed("organizations", {
    _id: "organizations_system",
    name: "System",
    slug: "system",
    businessName: "System",
    isActive: true,
    isPersonalWorkspace: false,
    createdAt: 1,
    updatedAt: 1,
  });
}

describe("main org creation baseline normalization", () => {
  it("routes email signup org creation through the shared organization baseline", async () => {
    const db = new FakeDb();
    seedOrgOwnerRole(db);
    seedSystemOrg(db);

    const baselineCalls: Array<Record<string, unknown>> = [];
    const schedulerCalls: Array<Record<string, unknown>> = [];
    const ctx = {
      db,
      scheduler: {
        runAfter: vi.fn(async (_delay: number, _ref: unknown, payload: Record<string, unknown>) => {
          schedulerCalls.push(payload);
        }),
      },
      runQuery: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        if (Object.prototype.hasOwnProperty.call(payload, "hasValidBetaCode")) {
          return {
            resolvedStatus: "approved",
            supportsBetaCodeAutoApprove: false,
          };
        }
        return null;
      }),
      runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        baselineCalls.push(payload);
        return {
          organizationId: payload.organizationId,
          operatorAgentId: "agent_default_signup",
          operatorProvisioningAction: "template_clone_created",
        };
      }),
    };

    const result = await (createFreeAccountInternal as any)._handler(ctx, {
      email: "owner@example.com",
      passwordHash: "hashed_password",
      firstName: "Taylor",
      lastName: "Owner",
      organizationName: "Taylor Ops",
      apiKeyHash: "hash",
      apiKeyPrefix: "pk_test",
    });

    expect(result.success).toBe(true);
    expect(baselineCalls).toHaveLength(1);
    expect(baselineCalls[0]).toMatchObject({
      organizationId: result.organization.id,
      createdByUserId: result.user.id,
      ownerUserIds: [result.user.id],
      appProvisioningUserId: result.user.id,
      contactEmail: "owner@example.com",
      appSurface: "platform_web",
    });
    expect(schedulerCalls).toHaveLength(1);
    expect(schedulerCalls[0]).toMatchObject({
      userId: result.user.id,
      organizationId: result.organization.id,
      email: "owner@example.com",
      planTier: "free",
    });
  });

  it("reuses a claimed onboarding workspace instead of creating a duplicate org during email signup", async () => {
    const db = new FakeDb();
    seedOrgOwnerRole(db);
    seedSystemOrg(db);
    db.seed("organizations", {
      _id: CLAIMED_ORG_ID,
      name: "Claimed Workspace",
      slug: "claimed-workspace",
      businessName: "Claimed Workspace",
      isActive: true,
      isPersonalWorkspace: false,
      createdAt: 1,
      updatedAt: 1,
    });

    const baselineCalls: Array<Record<string, unknown>> = [];
    const schedulerCalls: Array<Record<string, unknown>> = [];
    const ctx = {
      db,
      scheduler: {
        runAfter: vi.fn(async (_delay: number, _ref: unknown, payload: Record<string, unknown>) => {
          schedulerCalls.push(payload);
        }),
      },
      runQuery: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        if (Object.prototype.hasOwnProperty.call(payload, "hasValidBetaCode")) {
          return {
            resolvedStatus: "approved",
            supportsBetaCodeAutoApprove: false,
          };
        }
        return null;
      }),
      runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        baselineCalls.push(payload);
        return {
          organizationId: payload.organizationId,
          operatorAgentId: "agent_claimed_signup",
          operatorProvisioningAction: "template_clone_created",
        };
      }),
    };

    const result = await (createFreeAccountInternal as any)._handler(ctx, {
      email: "claimed-signup@example.com",
      passwordHash: "hashed_password",
      firstName: "Taylor",
      lastName: "Claim",
      apiKeyHash: "hash",
      apiKeyPrefix: "pk_claimed",
      claimedOrganizationId: CLAIMED_ORG_ID,
    });

    expect(result.success).toBe(true);
    expect(result.organization.id).toBe(CLAIMED_ORG_ID);
    expect(db.rows("organizations")).toHaveLength(2);
    expect(baselineCalls).toHaveLength(1);
    expect(baselineCalls[0]).toMatchObject({
      organizationId: CLAIMED_ORG_ID,
      contactEmail: "claimed-signup@example.com",
      appSurface: "platform_web",
    });
    expect(schedulerCalls).toHaveLength(1);
  });

  it("routes oauth new-org creation through the shared organization baseline", async () => {
    const db = new FakeDb();
    seedOrgOwnerRole(db);

    const baselineCalls: Array<Record<string, unknown>> = [];
    const schedulerCalls: Array<Record<string, unknown>> = [];
    const ctx = {
      db,
      scheduler: {
        runAfter: vi.fn(async (_delay: number, _ref: unknown, payload: Record<string, unknown>) => {
          schedulerCalls.push(payload);
        }),
      },
      runQuery: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        if (Object.prototype.hasOwnProperty.call(payload, "hasValidBetaCode")) {
          return {
            resolvedStatus: "approved",
            supportsBetaCodeAutoApprove: false,
          };
        }
        return null;
      }),
      runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        baselineCalls.push(payload);
        return {
          organizationId: payload.organizationId,
          operatorAgentId: "agent_default_oauth",
          operatorProvisioningAction: "template_clone_created",
        };
      }),
    };

    const result = await (findOrCreateUserFromOAuth as any)._handler(ctx, {
      email: "oauth@example.com",
      firstName: "Morgan",
      lastName: "Lead",
      organizationName: "Morgan Lead Ops",
    });

    expect(result.isNewUser).toBe(true);
    expect(baselineCalls).toHaveLength(1);
    expect(baselineCalls[0]).toMatchObject({
      organizationId: result.organizationId,
      createdByUserId: result.userId,
      ownerUserIds: [result.userId],
      appProvisioningUserId: result.userId,
      contactEmail: "oauth@example.com",
      appSurface: "platform_web",
    });
    expect(schedulerCalls).toHaveLength(1);
    expect(schedulerCalls[0]).toMatchObject({
      userId: result.userId,
      organizationId: result.organizationId,
      email: "oauth@example.com",
      planTier: "free",
    });
  });

  it("routes oauth claimed-org linking through the shared organization baseline", async () => {
    const db = new FakeDb();
    seedOrgOwnerRole(db);
    db.seed("users", {
      _id: EXISTING_USER_ID,
      email: "claimed@example.com",
      firstName: "Casey",
      lastName: "Owner",
      isActive: true,
      createdAt: 1,
      updatedAt: 1,
    });
    db.seed("organizations", {
      _id: CLAIMED_ORG_ID,
      name: "Claimed Workspace",
      slug: "claimed-workspace",
      businessName: "Claimed Workspace",
      isActive: true,
      isPersonalWorkspace: false,
      createdAt: 1,
      updatedAt: 1,
    });

    const baselineCalls: Array<Record<string, unknown>> = [];
    const ctx = {
      db,
      scheduler: {
        runAfter: vi.fn(),
      },
      runQuery: vi.fn(async () => null),
      runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        baselineCalls.push(payload);
        return {
          organizationId: payload.organizationId,
          operatorAgentId: "agent_default_claimed",
          operatorProvisioningAction: "template_clone_created",
        };
      }),
    };

    const result = await (findOrCreateUserFromOAuth as any)._handler(ctx, {
      email: "claimed@example.com",
      firstName: "Casey",
      lastName: "Owner",
      claimedOrganizationId: CLAIMED_ORG_ID,
    });

    expect(result.isNewUser).toBe(false);
    expect(result.organizationId).toBe(CLAIMED_ORG_ID);
    expect(baselineCalls).toHaveLength(1);
    expect(baselineCalls[0]).toMatchObject({
      organizationId: CLAIMED_ORG_ID,
      userId: EXISTING_USER_ID,
      contactEmail: "claimed@example.com",
      appSurface: "platform_web",
    });
  });

  it("seeds default booking concierge scaffolding when a law-firm baseline is provisioned", async () => {
    const db = new FakeDb();
    db.seed("organizations", {
      _id: "organizations_law_firm",
      name: "Kanzlei Test",
      slug: "kanzlei-test",
      businessName: "Kanzlei Test",
      isActive: true,
      isPersonalWorkspace: false,
      createdAt: 1,
      updatedAt: 1,
    });

    const mutationCalls: Array<Record<string, unknown>> = [];
    const ctx = {
      db,
      runQuery: vi.fn(async () => null),
      runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        mutationCalls.push(payload);
        if (Object.prototype.hasOwnProperty.call(payload, "appSurface")) {
          return {
            organizationId: payload.organizationId,
            operatorAgentId: "agent_law_firm_operator",
            operatorProvisioningAction: "template_clone_created",
          };
        }
        return null;
      }),
    };

    const result = await (provisionOrganizationBaselineInternal as any)._handler(ctx, {
      organizationId: "organizations_law_firm",
      createdByUserId: "users_law_firm_owner",
      timezone: "Europe/Berlin",
      dateFormat: "DD.MM.YYYY",
      language: "de",
      contactEmail: "kontakt@example.com",
      contactPhone: "+49 30 5550123",
      industry: "law_firm",
      description: "Inbound-first small-firm Kanzlei",
      appSurface: "platform_web",
    });

    expect(result).toMatchObject({
      organizationId: "organizations_law_firm",
      operatorAgentId: "agent_law_firm_operator",
      operatorProvisioningAction: "template_clone_created",
    });
    expect(mutationCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          organizationId: "organizations_law_firm",
          createdBy: "users_law_firm_owner",
          timezone: "Europe/Berlin",
          dateFormat: "DD.MM.YYYY",
          language: "de",
        }),
        expect.objectContaining({
          organizationId: "organizations_law_firm",
          createdBy: "users_law_firm_owner",
          primaryEmail: "kontakt@example.com",
          primaryPhone: "+49 30 5550123",
        }),
        expect.objectContaining({
          organizationId: "organizations_law_firm",
          createdBy: "users_law_firm_owner",
          industry: "law_firm",
          bio: "Inbound-first small-firm Kanzlei",
        }),
        expect.objectContaining({
          organizationId: "organizations_law_firm",
          createdBy: "users_law_firm_owner",
          timezone: "Europe/Berlin",
          primaryResourceLabel: "Erstberatung",
          defaultMeetingTitle: "Erstberatung",
          intakeLabel: "Erstberatung",
          requireConfiguredResource: false,
        }),
      ]),
    );
  });

  it("does not overwrite existing booking concierge settings when the baseline is re-run", async () => {
    const db = new FakeDb();
    db.seed("organizations", {
      _id: "organizations_law_firm_existing",
      name: "Kanzlei Test",
      slug: "kanzlei-test",
      businessName: "Kanzlei Test",
      isActive: true,
      isPersonalWorkspace: false,
      createdAt: 1,
      updatedAt: 1,
    });
    db.seed("objects", {
      _id: "objects_existing_booking_config",
      organizationId: "organizations_law_firm_existing",
      type: "organization_settings",
      subtype: "booking_concierge",
      name: "kanzlei-test-settings-booking_concierge",
      status: "active",
      customProperties: {
        contractVersion: "kanzlei_booking_concierge_config_v1",
        primaryResourceLabel: "Custom Erstberatung",
      },
      createdBy: "users_existing_owner",
      createdAt: 1,
      updatedAt: 1,
    });

    const mutationCalls: Array<Record<string, unknown>> = [];
    const ctx = {
      db,
      runQuery: vi.fn(async () => null),
      runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
        mutationCalls.push(payload);
        if (Object.prototype.hasOwnProperty.call(payload, "appSurface")) {
          return {
            organizationId: payload.organizationId,
            operatorAgentId: "agent_law_firm_operator_existing",
            operatorProvisioningAction: "template_clone_created",
          };
        }
        return null;
      }),
    };

    await (provisionOrganizationBaselineInternal as any)._handler(ctx, {
      organizationId: "organizations_law_firm_existing",
      createdByUserId: "users_existing_owner",
      timezone: "Europe/Berlin",
      language: "de",
      industry: "law_firm",
      appSurface: "platform_web",
    });

    expect(
      mutationCalls.find((payload) =>
        Object.prototype.hasOwnProperty.call(payload, "primaryResourceLabel"),
      ),
    ).toBeUndefined();
  });

  it("inspects telegram claim tokens before email signup so claimed workspaces are reused", async () => {
    const runMutation = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        sessionId: "session_signup_claim" as Id<"sessions">,
        user: {
          id: "users_signup_claim" as Id<"users">,
          email: "claimed@example.com",
          firstName: "Taylor",
          lastName: "Claim",
        },
        organization: {
          id: CLAIMED_ORG_ID,
          name: "Claimed Workspace",
          slug: "claimed-workspace",
        },
        apiKeyPrefix: "pk_claim",
        betaAccessStatus: "approved" as const,
      })
      .mockResolvedValueOnce({ success: true });

    const runAction = vi
      .fn()
      .mockResolvedValueOnce("password_hash")
      .mockResolvedValueOnce("api_key_hash")
      .mockResolvedValueOnce({
        valid: true,
        tokenType: "telegram_org_claim" as const,
        organizationId: CLAIMED_ORG_ID,
      })
      .mockResolvedValueOnce({ success: true });

    const ctx = {
      runAction,
      runMutation,
      scheduler: {
        runAfter: vi.fn(),
      },
    };

    const result = await (signupFreeAccount as any)._handler(ctx, {
      email: "claimed@example.com",
      password: "very-secure-password",
      firstName: "Taylor",
      lastName: "Claim",
      identityClaimToken: "signed_claim_token",
    });

    expect(result.success).toBe(true);
    expect(runMutation.mock.calls[0]?.[1]).toMatchObject({
      email: "claimed@example.com",
      claimedOrganizationId: CLAIMED_ORG_ID,
    });
    expect(
      runMutation.mock.calls.find(
        (call) => call[1] && typeof call[1] === "object" && "signedToken" in call[1]
      )?.[1]
    ).toMatchObject({
      signedToken: "signed_claim_token",
      organizationId: CLAIMED_ORG_ID,
      claimSource: "email_signup_complete",
    });
  });

  it("inspects guest onboarding org claim tokens before email signup so bound workspaces are reused", async () => {
    const runMutation = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        sessionId: "session_signup_guest_claim" as Id<"sessions">,
        user: {
          id: "users_signup_guest_claim" as Id<"users">,
          email: "guest-claimed@example.com",
          firstName: "Taylor",
          lastName: "Claim",
        },
        organization: {
          id: CLAIMED_ORG_ID,
          name: "Claimed Workspace",
          slug: "claimed-workspace",
        },
        apiKeyPrefix: "pk_guest_claim",
        betaAccessStatus: "approved" as const,
      })
      .mockResolvedValueOnce({ success: true });

    const runAction = vi
      .fn()
      .mockResolvedValueOnce("password_hash")
      .mockResolvedValueOnce("api_key_hash")
      .mockResolvedValueOnce({
        valid: true,
        tokenType: "guest_onboarding_org_claim" as const,
        organizationId: CLAIMED_ORG_ID,
      })
      .mockResolvedValueOnce({ success: true });

    const ctx = {
      runAction,
      runMutation,
      scheduler: {
        runAfter: vi.fn(),
      },
    };

    const result = await (signupFreeAccount as any)._handler(ctx, {
      email: "guest-claimed@example.com",
      password: "very-secure-password",
      firstName: "Taylor",
      lastName: "Claim",
      identityClaimToken: "signed_guest_claim_token",
    });

    expect(result.success).toBe(true);
    expect(runMutation.mock.calls[0]?.[1]).toMatchObject({
      email: "guest-claimed@example.com",
      claimedOrganizationId: CLAIMED_ORG_ID,
    });
    expect(
      runMutation.mock.calls.find(
        (call) => call[1] && typeof call[1] === "object" && "signedToken" in call[1]
      )?.[1]
    ).toMatchObject({
      signedToken: "signed_guest_claim_token",
      organizationId: CLAIMED_ORG_ID,
      claimSource: "email_signup_complete",
    });
  });
});

describe("starter template provisioning rollout flag", () => {
  it("defaults to disabled", () => {
    const previousCanonical = process.env[STARTER_TEMPLATE_PROVISIONING_ENV_FLAG];
    delete process.env[STARTER_TEMPLATE_PROVISIONING_ENV_FLAG];
    expect(isStarterTemplateProvisioningEnabled()).toBe(false);
    if (typeof previousCanonical === "string") {
      process.env[STARTER_TEMPLATE_PROVISIONING_ENV_FLAG] = previousCanonical;
    }
  });

  it("does not call provisioning when the flag is disabled", async () => {
    vi.stubEnv(STARTER_TEMPLATE_PROVISIONING_ENV_FLAG, "false");
    const provisioner = vi.fn(async () => {});

    const result = await maybeProvisionStarterTemplatesForSignup({
      ctx: {} as any,
      organizationId: "organizations_test" as Id<"organizations">,
      userId: "users_test" as Id<"users">,
      provisioner,
    });

    expect(provisioner).not.toHaveBeenCalled();
    expect(result).toEqual({
      enabled: false,
      attempted: false,
      success: false,
    });
  });

  it("runs provisioning when enabled and degrades non-blocking on failure", async () => {
    vi.stubEnv(STARTER_TEMPLATE_PROVISIONING_ENV_FLAG, "true");
    const provisioner = vi.fn(async () => {
      throw new Error("template bootstrap failed");
    });

    const result = await maybeProvisionStarterTemplatesForSignup({
      ctx: {} as any,
      organizationId: "organizations_test" as Id<"organizations">,
      userId: "users_test" as Id<"users">,
      provisioner,
    });

    expect(provisioner).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      enabled: true,
      attempted: true,
      success: false,
    });
  });
});
