import { beforeEach, describe, expect, it } from "vitest";

import { evaluateTemplateOrgPreflight } from "../../../convex/agentOntology";

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

function createCtx(
  db: FakeDb,
  overrides?: {
    runQuery?: (queryRef: unknown, args: Record<string, unknown>) => Promise<unknown>;
  },
) {
  return {
    db: db as any,
    runQuery: overrides?.runQuery ?? (async () => ({ apiKey: null })),
  } as any;
}

describe("evaluateTemplateOrgPreflight", () => {
  beforeEach(() => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  it("blocks when required mapped integrations are missing while unknown labels stay non-blocking", async () => {
    const db = new FakeDb();
    const organizationId = "organizations_1";

    db.seed("organizations", {
      _id: organizationId,
      name: "Org Alpha",
      isActive: true,
    } as any);
    db.seed("objects", {
      _id: "objects_binding_email",
      organizationId,
      type: "channel_provider_binding",
      status: "active",
      customProperties: {
        channel: "email",
        providerId: "resend",
        enabled: true,
      },
    } as any);
    db.seed("objects", {
      _id: "objects_stripe_connection",
      organizationId,
      type: "integration_connection",
      status: "active",
      customProperties: {
        providerId: "stripe",
        enabled: true,
      },
    } as any);

    const result = await evaluateTemplateOrgPreflight(createCtx(db), {
      organizationId: organizationId as any,
      templateBaseline: {
        channelBindings: [
          { channel: "email", enabled: true },
          { channel: "desktop", enabled: true },
        ],
        requiredIntegrations: ["Stripe", "Calendar API", "Unknown Internal Adapter"],
      },
    });

    expect(result.status).toBe("fail");
    expect(result.blockerCodes).toContain("integration_dependency_missing");
    expect(result.blockerCodes).not.toContain("channel_binding_missing");
    expect(result.integrations.required).toEqual(["calendar_api", "stripe"]);
    expect(result.integrations.available).toContain("stripe");
    expect(result.integrations.missing).toEqual(["calendar_api"]);
    expect(result.integrations.unknown).toEqual(["Unknown Internal Adapter"]);
    expect(result.channels.missing).toEqual([]);
  });

  it("blocks when required non-telephony channel bindings are missing", async () => {
    const db = new FakeDb();
    const organizationId = "organizations_2";

    db.seed("organizations", {
      _id: organizationId,
      name: "Org Beta",
      isActive: true,
    } as any);

    const result = await evaluateTemplateOrgPreflight(createCtx(db), {
      organizationId: organizationId as any,
      templateBaseline: {
        channelBindings: [{ channel: "sms", enabled: true }],
      },
    });

    expect(result.status).toBe("fail");
    expect(result.blockerCodes).toContain("channel_binding_missing");
    expect(result.channels.required).toEqual(["sms"]);
    expect(result.channels.missing).toEqual(["sms"]);
  });

  it("blocks when required domains are missing or unverified", async () => {
    const db = new FakeDb();
    const organizationId = "organizations_3";

    db.seed("organizations", {
      _id: organizationId,
      name: "Org Gamma",
      isActive: true,
    } as any);
    db.seed("objects", {
      _id: "objects_domain_config",
      organizationId,
      type: "configuration",
      subtype: "domain",
      status: "active",
      customProperties: {
        domainName: "portal.gamma.test",
        domainVerified: false,
      },
    } as any);

    const result = await evaluateTemplateOrgPreflight(createCtx(db), {
      organizationId: organizationId as any,
      templateBaseline: {
        orgPreflightRequirements: {
          domain: {
            requiredDomains: ["portal.gamma.test"],
            requireVerified: true,
          },
        },
      },
    });

    expect(result.status).toBe("fail");
    expect(result.blockerCodes).toContain("domain_verification_missing");
    expect(result.domain.required).toBe(true);
    expect(result.domain.requiredDomains).toEqual(["portal.gamma.test"]);
    expect(result.domain.unverifiedDomains).toEqual(["portal.gamma.test"]);
  });

  it("blocks when billing credit requirements are not met", async () => {
    const db = new FakeDb();
    const organizationId = "organizations_4";

    db.seed("organizations", {
      _id: organizationId,
      name: "Org Delta",
      isActive: true,
    } as any);

    const result = await evaluateTemplateOrgPreflight(
      createCtx(db, {
        runQuery: async (_queryRef, queryArgs) => {
          if (typeof queryArgs?.requiredAmount === "number") {
            return {
              hasCredits: false,
              isUnlimited: false,
              totalCredits: 3,
              shortfall: 2,
              skipped: false,
            };
          }
          return { apiKey: null };
        },
      }),
      {
        organizationId: organizationId as any,
        templateBaseline: {
          orgPreflightRequirements: {
            billing: {
              requiredCredits: 5,
              billingSource: "platform",
              requestSource: "platform_action",
            },
          },
        },
      },
    );

    expect(result.status).toBe("fail");
    expect(result.blockerCodes).toContain("billing_credits_insufficient");
    expect(result.billing.required).toBe(true);
    expect(result.billing.requiredCredits).toBe(5);
    expect(result.billing.shortfall).toBe(2);
  });

  it("blocks when required vertical contracts are missing", async () => {
    const db = new FakeDb();
    const organizationId = "organizations_5";

    db.seed("organizations", {
      _id: organizationId,
      name: "Org Epsilon",
      isActive: true,
      customProperties: {
        industry: "retail",
      },
    } as any);

    const result = await evaluateTemplateOrgPreflight(createCtx(db), {
      organizationId: organizationId as any,
      templateBaseline: {
        orgPreflightRequirements: {
          verticalContracts: {
            requiredContracts: ["law_firm"],
          },
        },
      },
    });

    expect(result.status).toBe("fail");
    expect(result.blockerCodes).toContain("vertical_contract_missing");
    expect(result.verticalContracts.required).toEqual(["law_firm"]);
    expect(result.verticalContracts.missing).toEqual(["law_firm"]);
  });
});
