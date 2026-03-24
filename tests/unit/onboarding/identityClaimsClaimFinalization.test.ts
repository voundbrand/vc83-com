import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  consumeIdentityClaimToken,
  issueGuestOnboardingOrgClaimToken,
  issueTelegramOrgClaimToken,
} from "../../../convex/onboarding/identityClaims";
import {
  finalizeOnboardingOrgClaim,
  ONBOARDING_ORG_LIFECYCLE,
} from "../../../convex/onboarding/orgBootstrap";

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

  private table(name: string) {
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }
}

const ORG_ID = "organizations_claimed_lifecycle" as Id<"organizations">;
const USER_ID = "users_claimed_lifecycle" as Id<"users">;
const TELEGRAM_MAPPING_ID = "telegram_mapping_claimed_lifecycle" as Id<"telegramMappings">;
const GUEST_BINDING_ID = "guest_binding_claimed_lifecycle" as Id<"guestOnboardingBindings">;

describe("identity claim finalization lifecycle", () => {
  it("does not re-finalize a Telegram workspace already claimed by the same user", async () => {
    const db = new FakeDb();
    db.seed("organizations", {
      _id: ORG_ID,
      name: "Claimed Workspace",
      slug: "claimed-workspace",
      businessName: "Claimed Workspace",
      isActive: true,
      isPersonalWorkspace: false,
      onboardingLifecycleState: ONBOARDING_ORG_LIFECYCLE.CLAIMED,
      onboardingActivatedAt: 100,
      onboardingClaimedAt: 200,
      onboardingClaimedByUserId: USER_ID,
      createdBy: USER_ID,
      createdAt: 1,
      updatedAt: 1,
    });
    db.seed("users", {
      _id: USER_ID,
      email: "owner@example.com",
      firstName: "Taylor",
      lastName: "Owner",
      createdAt: 1,
      updatedAt: 1,
    });
    db.seed("telegramMappings", {
      _id: TELEGRAM_MAPPING_ID,
      telegramChatId: "tg_claimed_lifecycle",
      organizationId: ORG_ID,
      onboardingOrganizationId: ORG_ID,
      status: "active",
      createdAt: 1,
    });

    const issued = await (issueTelegramOrgClaimToken as any)._handler(
      { db },
      {
        telegramChatId: "tg_claimed_lifecycle",
        organizationId: ORG_ID,
        issuedBy: "test",
      },
    );

    const mutationCalls: Array<Record<string, unknown>> = [];
    const result = await (consumeIdentityClaimToken as any)._handler(
      {
        db,
        runQuery: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
          if (Object.prototype.hasOwnProperty.call(payload, "tokenId")) {
            return await db
              .query("anonymousClaimTokens")
              .withIndex("by_token_id", (q) => q.eq("tokenId", payload.tokenId))
              .first();
          }
          return null;
        }),
        runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
          mutationCalls.push(payload);
          return { success: true };
        }),
      },
      {
        signedToken: issued.claimToken,
        userId: USER_ID,
        organizationId: ORG_ID,
        claimSource: "test_claim",
      },
    );

    const mapping = await db.get(TELEGRAM_MAPPING_ID);
    const user = await db.get(USER_ID);

    expect(result).toMatchObject({
      success: true,
      alreadyClaimed: true,
      tokenType: "telegram_org_claim",
      linkedOrganizationId: ORG_ID,
    });
    expect(
      mutationCalls.some(
        (payload) =>
          Object.prototype.hasOwnProperty.call(payload, "organizationId")
          && Object.prototype.hasOwnProperty.call(payload, "appSurface")
          && Object.prototype.hasOwnProperty.call(payload, "contactEmail")
      )
    ).toBe(false);
    expect(mapping).toMatchObject({
      organizationId: ORG_ID,
      status: "active",
      userId: USER_ID,
    });
    expect(user?.defaultOrgId).toBe(ORG_ID);
  });

  it("finalizes a guest onboarding org claim token against the bound provisional workspace", async () => {
    const db = new FakeDb();
    db.seed("organizations", {
      _id: ORG_ID,
      name: "Bound Workspace",
      slug: "bound-workspace",
      businessName: "Bound Workspace",
      isActive: true,
      isPersonalWorkspace: false,
      onboardingLifecycleState: ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED,
      onboardingActivatedAt: 150,
      createdAt: 1,
      updatedAt: 1,
    });
    db.seed("users", {
      _id: USER_ID,
      email: "owner@example.com",
      firstName: "Taylor",
      lastName: "Owner",
      createdAt: 1,
      updatedAt: 1,
    });
    db.seed("guestOnboardingBindings", {
      _id: GUEST_BINDING_ID,
      sourceIdentityKey: "native_guest:one_of_one_landing_native_guest_audit:ng_claimed_lifecycle",
      channel: "native_guest",
      onboardingSurface: "one_of_one_landing_native_guest_audit",
      sessionToken: "ng_claimed_lifecycle",
      onboardingOrganizationId: ORG_ID,
      organizationLifecycleState: ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED,
      bindingStatus: "active",
      createdAt: 1,
      updatedAt: 1,
      lastActivityAt: 1,
    });
    db.seed("webchatSessions", {
      _id: "webchat_session_claimed_lifecycle",
      sessionToken: "ng_claimed_lifecycle",
      organizationId: ORG_ID,
      agentId: "agent_claimed_lifecycle",
      channel: "native_guest",
      createdAt: 1,
      lastActivityAt: 1,
    });
    db.seed("anonymousIdentityLedger", {
      _id: "ledger_claimed_lifecycle",
      identityKey: "native_guest:ng_claimed_lifecycle",
      channel: "native_guest",
      organizationId: ORG_ID,
      agentId: "agent_claimed_lifecycle",
      sessionToken: "ng_claimed_lifecycle",
      claimStatus: "unclaimed",
      createdAt: 1,
      updatedAt: 1,
      lastActivityAt: 1,
    });

    const issued = await (issueGuestOnboardingOrgClaimToken as any)._handler(
      { db },
      {
        bindingId: GUEST_BINDING_ID,
        sessionToken: "ng_claimed_lifecycle",
        organizationId: ORG_ID,
        channel: "native_guest",
        issuedBy: "test",
      },
    );

    const baselineCalls: Array<Record<string, unknown>> = [];
    const result = await (consumeIdentityClaimToken as any)._handler(
      {
        db,
        runQuery: vi.fn(),
        runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
          if (
            Object.prototype.hasOwnProperty.call(payload, "organizationId")
            && Object.prototype.hasOwnProperty.call(payload, "userId")
            && Object.prototype.hasOwnProperty.call(payload, "appSurface")
            && Object.prototype.hasOwnProperty.call(payload, "contactEmail")
          ) {
            return await (finalizeOnboardingOrgClaim as any)._handler(
              {
                db,
                runMutation: vi.fn(async (_nestedRef: unknown, nestedPayload: Record<string, unknown>) => {
                  baselineCalls.push(nestedPayload);
                  return {
                    organizationId: nestedPayload.organizationId,
                    operatorAgentId: "agent_finalized_claimed_lifecycle",
                    operatorProvisioningAction: "template_clone_created",
                  };
                }),
              },
              payload,
            );
          }
          return { success: true };
        }),
      },
      {
        signedToken: issued.claimToken,
        userId: USER_ID,
        organizationId: ORG_ID,
        claimSource: "test_claim",
      },
    );

    const organization = await db.get(ORG_ID);
    const binding = await db.get(GUEST_BINDING_ID);
    const session = await db
      .query("webchatSessions")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", "ng_claimed_lifecycle"))
      .first();
    const ledger = await db
      .query("anonymousIdentityLedger")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", "ng_claimed_lifecycle"))
      .first();
    const token = await db
      .query("anonymousClaimTokens")
      .withIndex("by_token_id", (q) => q.eq("tokenId", issued.tokenId))
      .first();
    const user = await db.get(USER_ID);

    expect(result).toMatchObject({
      success: true,
      tokenType: "guest_onboarding_org_claim",
      linkedOrganizationId: ORG_ID,
      linkedSessionToken: "ng_claimed_lifecycle",
    });
    expect(baselineCalls).toHaveLength(1);
    expect(baselineCalls[0]).toMatchObject({
      organizationId: ORG_ID,
      createdByUserId: USER_ID,
      ownerUserIds: [USER_ID],
      appProvisioningUserId: USER_ID,
      contactEmail: "owner@example.com",
      appSurface: "platform_web",
    });
    expect(organization).toMatchObject({
      onboardingLifecycleState: ONBOARDING_ORG_LIFECYCLE.CLAIMED,
      onboardingClaimedByUserId: USER_ID,
    });
    expect(binding).toMatchObject({
      organizationLifecycleState: ONBOARDING_ORG_LIFECYCLE.CLAIMED,
      bindingStatus: "claimed",
      claimedByUserId: USER_ID,
    });
    expect(session).toMatchObject({
      claimedByUserId: USER_ID,
      claimedOrganizationId: ORG_ID,
    });
    expect(ledger).toMatchObject({
      claimStatus: "claimed",
      claimedByUserId: USER_ID,
      claimedOrganizationId: ORG_ID,
    });
    expect(token).toMatchObject({
      status: "consumed",
      consumedByUserId: USER_ID,
      consumedByOrganizationId: ORG_ID,
    });
    expect(user?.defaultOrgId).toBe(ORG_ID);
  });
});
