import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  createProvisionalOnboardingOrg,
  ensureTelegramOnboardingOrgBinding,
  finalizeOnboardingOrgClaim,
  ONBOARDING_ORG_LIFECYCLE,
  promoteOnboardingOrgToLiveUnclaimed,
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

const ONBOARDING_ORG_ID = "organizations_onboarding" as Id<"organizations">;
const TELEGRAM_MAPPING_ID = "telegram_mapping_onboarding" as Id<"telegramMappings">;
const USER_ID = "users_owner" as Id<"users">;

describe("onboarding org lifecycle", () => {
  it("creates provisional onboarding workspaces explicitly", async () => {
    const db = new FakeDb();

    const organizationId = await (createProvisionalOnboardingOrg as any)._handler(
      { db },
      {
        workspaceName: "Telegram Pharmacy",
        workspaceContext: "Neighborhood pharmacy",
        source: "telegram_onboarding",
        channelContactIdentifier: "tg_123",
      },
    );

    const organization = await db.get(organizationId);
    expect(organization?.name).toBe("Telegram Pharmacy");
    expect(organization?.onboardingLifecycleState).toBe(
      ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
    );
    expect(organization?.onboardingLifecycleSource).toBe("telegram_onboarding");
  });

  it("promotes provisional onboarding workspaces to live unclaimed with strict operator bootstrap", async () => {
    const db = new FakeDb();
    db.seed("organizations", {
      _id: ONBOARDING_ORG_ID,
      name: "Telegram Pharmacy",
      slug: "telegram-pharmacy",
      businessName: "Telegram Pharmacy",
      isActive: true,
      isPersonalWorkspace: false,
      onboardingLifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
      createdAt: 1,
      updatedAt: 1,
    });

    const mutationCalls: Array<Record<string, unknown>> = [];
    const result = await (promoteOnboardingOrgToLiveUnclaimed as any)._handler(
      {
        db,
        runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
          mutationCalls.push(payload);
          if (Object.prototype.hasOwnProperty.call(payload, "appSurface")) {
            return {
              operatorAgentId: "agent_live_unclaimed",
              operatorProvisioningAction: "template_clone_created",
              authorityChannel: "desktop",
            };
          }
          return { success: true };
        }),
      },
      {
        organizationId: ONBOARDING_ORG_ID,
        workspaceName: "Telegram Pharmacy Live",
        workspaceContext: "Neighborhood pharmacy",
        source: "telegram_onboarding",
        appSurface: "platform_web",
      },
    );

    const organization = await db.get(ONBOARDING_ORG_ID);
    expect(result.lifecycleState).toBe(ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED);
    expect(result.operatorAgentId).toBe("agent_live_unclaimed");
    expect(organization?.name).toBe("Telegram Pharmacy Live");
    expect(organization?.onboardingLifecycleState).toBe(
      ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED,
    );
    expect(mutationCalls).toHaveLength(1);
    expect(mutationCalls[0]).toMatchObject({
      organizationId: ONBOARDING_ORG_ID,
      appSurface: "platform_web",
    });
  });

  it("binds a Telegram onboarding mapping to a first-touch provisional workspace once", async () => {
    const db = new FakeDb();
    db.seed("telegramMappings", {
      _id: TELEGRAM_MAPPING_ID,
      telegramChatId: "tg_123",
      organizationId: "org_platform",
      status: "onboarding",
      senderName: "Ada",
      createdAt: 1,
    });

    const firstResult = await (ensureTelegramOnboardingOrgBinding as any)._handler(
      { db },
      {
        telegramChatId: "tg_123",
        source: "telegram_onboarding",
        senderName: "Ada",
      },
    );
    const secondResult = await (ensureTelegramOnboardingOrgBinding as any)._handler(
      { db },
      {
        telegramChatId: "tg_123",
        source: "telegram_onboarding",
        senderName: "Ada",
      },
    );

    const mapping = await db.get(TELEGRAM_MAPPING_ID);
    const organization = await db.get(firstResult.organizationId);

    expect(firstResult.created).toBe(true);
    expect(secondResult).toMatchObject({
      organizationId: firstResult.organizationId,
      created: false,
      lifecycleState: ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
    });
    expect(mapping?.onboardingOrganizationId).toBe(firstResult.organizationId);
    expect(organization?.onboardingLifecycleState).toBe(
      ONBOARDING_ORG_LIFECYCLE.PROVISIONAL,
    );
    expect(db.rows("organizations")).toHaveLength(1);
  });

  it("finalizes claimed onboarding workspaces onto the signed-in baseline", async () => {
    const db = new FakeDb();
    db.seed("organizations", {
      _id: ONBOARDING_ORG_ID,
      name: "Claim Me",
      slug: "claim-me",
      businessName: "Claim Me",
      isActive: true,
      isPersonalWorkspace: false,
      onboardingLifecycleState: ONBOARDING_ORG_LIFECYCLE.LIVE_UNCLAIMED,
      onboardingActivatedAt: 100,
      createdAt: 1,
      updatedAt: 1,
    });

    const mutationCalls: Array<Record<string, unknown>> = [];
    const result = await (finalizeOnboardingOrgClaim as any)._handler(
      {
        db,
        runMutation: vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
          mutationCalls.push(payload);
          return {
            organizationId: payload.organizationId,
            operatorAgentId: "agent_claimed",
            operatorProvisioningAction: "template_clone_created",
          };
        }),
      },
      {
        organizationId: ONBOARDING_ORG_ID,
        userId: USER_ID,
        contactEmail: "owner@example.com",
        appSurface: "platform_web",
      },
    );

    const organization = await db.get(ONBOARDING_ORG_ID);
    expect(result.lifecycleState).toBe(ONBOARDING_ORG_LIFECYCLE.CLAIMED);
    expect(result.operatorAgentId).toBe("agent_claimed");
    expect(organization?.onboardingLifecycleState).toBe(
      ONBOARDING_ORG_LIFECYCLE.CLAIMED,
    );
    expect(organization?.onboardingClaimedByUserId).toBe(USER_ID);
    expect(organization?.createdBy).toBe(USER_ID);
    expect(mutationCalls).toHaveLength(1);
    expect(mutationCalls[0]).toMatchObject({
      organizationId: ONBOARDING_ORG_ID,
      createdByUserId: USER_ID,
      ownerUserIds: [USER_ID],
      appProvisioningUserId: USER_ID,
      contactEmail: "owner@example.com",
      appSurface: "platform_web",
    });
  });

  it("skips baseline reprovisioning when the same user re-finalizes an already-claimed workspace", async () => {
    const db = new FakeDb();
    db.seed("organizations", {
      _id: ONBOARDING_ORG_ID,
      name: "Claim Me",
      slug: "claim-me",
      businessName: "Claim Me",
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

    const runMutation = vi.fn(async () => {
      throw new Error("baseline_should_not_run");
    });

    const result = await (finalizeOnboardingOrgClaim as any)._handler(
      {
        db,
        runMutation,
      },
      {
        organizationId: ONBOARDING_ORG_ID,
        userId: USER_ID,
        contactEmail: "owner@example.com",
        appSurface: "platform_web",
      },
    );

    expect(result).toMatchObject({
      organizationId: ONBOARDING_ORG_ID,
      lifecycleState: ONBOARDING_ORG_LIFECYCLE.CLAIMED,
      operatorAgentId: null,
      operatorProvisioningAction: null,
    });
    expect(runMutation).not.toHaveBeenCalled();
  });
});
