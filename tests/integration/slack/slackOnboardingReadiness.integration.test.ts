import { describe, expect, it } from "vitest";
import { getSlackCalendarOnboardingReadiness } from "../../../convex/oauth/slack";

type Row = Record<string, unknown>;
type Condition = { op: "eq" | "neq"; field: string; value: unknown };
type ConditionRecorder = {
  field: (name: string) => { __field: string };
  eq: (lhs: unknown, value: unknown) => ConditionRecorder;
  neq: (lhs: unknown, value: unknown) => ConditionRecorder;
};

const ORG_ID = "org_readiness";
const USER_ID = "user_readiness";
const SESSION_ID = "session_readiness";
const SLACK_CONNECTION_ID = "conn_slack_readiness";
const GOOGLE_CONNECTION_ID = "conn_google_readiness";
const POLICY_ID = "policy_readiness";

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeFieldReference(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    "__field" in (value as Record<string, unknown>)
  ) {
    return String((value as Record<string, unknown>).__field);
  }
  return String(value);
}

function createConditionRecorder(conditions: Condition[]): ConditionRecorder {
  const recorder: ConditionRecorder = {
    field: (name: string) => ({ __field: name }),
    eq: (lhs: unknown, value: unknown) => {
      conditions.push({
        op: "eq",
        field: normalizeFieldReference(lhs),
        value,
      });
      return recorder;
    },
    neq: (lhs: unknown, value: unknown) => {
      conditions.push({
        op: "neq",
        field: normalizeFieldReference(lhs),
        value,
      });
      return recorder;
    },
  };
  return recorder;
}

class FakeQuery {
  private conditions: Condition[] = [];

  constructor(private readonly rows: Row[]) {}

  withIndex(_indexName: string, callback: (q: ConditionRecorder) => unknown) {
    callback(createConditionRecorder(this.conditions));
    return this;
  }

  filter(callback: (q: ConditionRecorder) => unknown) {
    callback(createConditionRecorder(this.conditions));
    return this;
  }

  private applyConditions(): Row[] {
    return this.rows.filter((row) =>
      this.conditions.every((condition) => {
        const fieldValue = row[condition.field];
        if (condition.op === "eq") {
          return fieldValue === condition.value;
        }
        return fieldValue !== condition.value;
      })
    );
  }

  async first() {
    return this.applyConditions()[0] || null;
  }

  async collect() {
    return this.applyConditions();
  }
}

function createFakeCtx(args: {
  tables: {
    sessions: Row[];
    users: Row[];
    objects: Row[];
    oauthConnections: Row[];
    objectLinks: Row[];
  };
  canManageIntegrations?: boolean;
}) {
  const allRows = [
    ...args.tables.sessions,
    ...args.tables.users,
    ...args.tables.objects,
    ...args.tables.oauthConnections,
    ...args.tables.objectLinks,
  ];
  const byId = new Map<string, Row>();
  for (const row of allRows) {
    const id = typeof row._id === "string" ? row._id : null;
    if (id) {
      byId.set(id, row);
    }
  }

  return {
    db: {
      get: async (id: string) => byId.get(String(id)) || null,
      query: (tableName: keyof typeof args.tables) =>
        new FakeQuery(args.tables[tableName] || []),
    },
    runQuery: async (_reference: unknown) => args.canManageIntegrations !== false,
  };
}

function buildBaseTables() {
  const now = Date.now();
  return {
    sessions: [
      {
        _id: SESSION_ID,
        userId: USER_ID,
        expiresAt: now + 60_000,
      },
    ],
    users: [
      {
        _id: USER_ID,
        defaultOrgId: ORG_ID,
      },
    ],
    objects: [
      {
        _id: "slack_settings_main",
        organizationId: ORG_ID,
        type: "slack_settings",
        subtype: "main",
        status: "active",
        customProperties: {
          setupMode: "platform_managed",
          interactionMode: "mentions_only",
          aiAppFeaturesEnabled: false,
        },
      },
      {
        _id: "organization_settings_main",
        organizationId: ORG_ID,
        type: "organization_settings",
        subtype: "main",
        status: "active",
        customProperties: {
          timezone: "UTC",
          dateFormat: "MM/DD/YYYY",
        },
      },
      {
        _id: POLICY_ID,
        organizationId: ORG_ID,
        type: "vacation_policy",
        subtype: "pharmacist_team_v1",
        status: "active",
        updatedAt: now,
        customProperties: {
          timezone: "UTC",
          maxConcurrentAway: 1,
          minOnDutyTotal: 1,
          minOnDutyByRole: [{ roleTag: "pharmacist", minOnDuty: 1 }],
          requestWindow: {
            minLeadDays: 7,
            maxFutureDays: 365,
          },
          integrations: {
            slack: {
              providerConnectionId: SLACK_CONNECTION_ID,
              teamId: "T_READINESS",
              routeKey: "slack:route:readiness",
              channelId: "C_READINESS",
            },
            googleCalendar: {
              providerConnectionId: GOOGLE_CONNECTION_ID,
              blockingCalendarIds: ["primary"],
              pushCalendarId: "primary",
            },
          },
        },
      },
    ],
    oauthConnections: [
      {
        _id: SLACK_CONNECTION_ID,
        organizationId: ORG_ID,
        provider: "slack",
        status: "active",
        providerAccountId: "T_READINESS",
        providerProfileType: "platform",
        customProperties: {
          providerProfileType: "platform",
          providerRouteKey: "slack:route:readiness",
          incomingWebhookChannelId: "C_READINESS",
          teamName: "Readiness Workspace",
          teamDomain: "readiness",
        },
      },
      {
        _id: GOOGLE_CONNECTION_ID,
        organizationId: ORG_ID,
        provider: "google",
        status: "active",
        connectionType: "organizational",
        userId: USER_ID,
        providerAccountId: "readiness@example.com",
        providerEmail: "readiness@example.com",
        syncSettings: {
          calendar: true,
        },
        scopes: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
        ],
        customProperties: {},
      },
    ],
    objectLinks: [
      {
        _id: "calendar_link_readiness",
        organizationId: ORG_ID,
        linkType: "calendar_linked_to",
        properties: {
          connectionId: GOOGLE_CONNECTION_ID,
          blockingCalendarIds: ["primary"],
        },
      },
    ],
  };
}

async function runReadiness(args?: {
  tables?: ReturnType<typeof buildBaseTables>;
  teamBindingId?: string;
  canManageIntegrations?: boolean;
}) {
  const tables = args?.tables || buildBaseTables();
  const ctx = createFakeCtx({
    tables,
    canManageIntegrations: args?.canManageIntegrations,
  });
  return await (getSlackCalendarOnboardingReadiness as any)._handler(ctx, {
    sessionId: SESSION_ID,
    teamBindingId: args?.teamBindingId,
  });
}

function replacePolicy(
  tables: ReturnType<typeof buildBaseTables>,
  policies: Row[]
) {
  tables.objects = tables.objects.filter((row) => row.type !== "vacation_policy");
  tables.objects.push(...policies);
}

describe("Slack onboarding readiness integration", () => {
  it("returns ready for org-wide onboarding when core checks pass and no teams exist", async () => {
    const result = await runReadiness();
    expect(result.state).toBe("ready");
    expect(result.reasonCodes).toEqual([]);
    expect(result.summary.vacationPolicy.exists).toBe(true);
    expect(result.summary.vacationPolicy.teamBindingId).toBeNull();
  });

  it("returns misconfigured when Slack route key is missing", async () => {
    const tables = buildBaseTables();
    const slackConnection = tables.oauthConnections.find(
      (row) => row._id === SLACK_CONNECTION_ID
    ) as Row;
    const customProperties = deepClone(
      (slackConnection.customProperties || {}) as Record<string, unknown>
    );
    delete customProperties.providerRouteKey;
    slackConnection.customProperties = customProperties;

    const result = await runReadiness({ tables });
    expect(result.state).toBe("misconfigured");
    expect(result.reasonCodes).toContain("slack_identity_route_key_missing");
  });

  it("returns misconfigured when vacation policy scope mismatches Slack identity", async () => {
    const tables = buildBaseTables();
    replacePolicy(tables, [
      {
        _id: POLICY_ID,
        organizationId: ORG_ID,
        type: "vacation_policy",
        status: "active",
        updatedAt: Date.now(),
        customProperties: {
          integrations: {
            slack: {
              providerConnectionId: SLACK_CONNECTION_ID,
              teamId: "T_OTHER",
              routeKey: "slack:route:other",
              channelId: "C_OTHER",
            },
            googleCalendar: {
              providerConnectionId: GOOGLE_CONNECTION_ID,
              blockingCalendarIds: ["primary"],
            },
          },
        },
      },
    ]);

    const result = await runReadiness({ tables });
    expect(result.state).toBe("misconfigured");
    expect(result.reasonCodes).toContain("vacation_policy_slack_identity_mismatch");
  });

  it("returns misconfigured when multiple policies match the same scope", async () => {
    const tables = buildBaseTables();
    const basePolicy = tables.objects.find((row) => row._id === POLICY_ID) as Row;
    replacePolicy(tables, [
      basePolicy,
      {
        ...deepClone(basePolicy),
        _id: "policy_readiness_duplicate",
        updatedAt: Date.now() + 1000,
      },
    ]);

    const result = await runReadiness({ tables });
    expect(result.state).toBe("misconfigured");
    expect(result.reasonCodes).toContain("vacation_policy_ambiguous");
  });

  it("returns partial when calendar sync and write scope are incomplete", async () => {
    const tables = buildBaseTables();
    const googleConnection = tables.oauthConnections.find(
      (row) => row._id === GOOGLE_CONNECTION_ID
    ) as Row;
    googleConnection.scopes = [
      "https://www.googleapis.com/auth/calendar.readonly",
    ];
    googleConnection.syncSettings = {
      calendar: false,
    };

    const result = await runReadiness({ tables });
    expect(result.state).toBe("partial");
    expect(result.reasonCodes).toContain("calendar_sync_disabled");
    expect(result.reasonCodes).toContain("calendar_write_scope_missing");
  });

  it("returns degraded when organization regional settings are missing", async () => {
    const tables = buildBaseTables();
    tables.objects = tables.objects.filter(
      (row) =>
        !(row.type === "organization_settings" && row.subtype === "main")
    );

    const result = await runReadiness({ tables });
    expect(result.state).toBe("degraded");
    expect(result.reasonCodes).toContain("organization_settings_timezone_missing");
    expect(result.reasonCodes).toContain("organization_settings_date_format_missing");
  });

  it("supports optional team-linked policy scope when the linked team exists", async () => {
    const tables = buildBaseTables();
    tables.objects.push({
      _id: "team_alpha",
      organizationId: ORG_ID,
      type: "organization_team",
      subtype: "org_team_v1",
      name: "Team Alpha",
      status: "active",
      customProperties: {},
    });
    const policy = tables.objects.find((row) => row._id === POLICY_ID) as Row;
    policy.customProperties = {
      ...((policy.customProperties || {}) as Record<string, unknown>),
      teamId: "team_alpha",
      teamLink: {
        teamId: "team_alpha",
      },
    };

    const result = await runReadiness({
      tables,
      teamBindingId: "team_alpha",
    });
    expect(result.state).toBe("ready");
    expect(result.summary.vacationPolicy.teamBindingId).toBe("team_alpha");
    expect(result.reasonCodes).not.toContain("vacation_policy_team_link_missing");
  });

  it("fails closed with misconfigured when linked team is missing", async () => {
    const tables = buildBaseTables();
    const policy = tables.objects.find((row) => row._id === POLICY_ID) as Row;
    policy.customProperties = {
      ...((policy.customProperties || {}) as Record<string, unknown>),
      teamId: "team_missing",
      teamLink: {
        teamId: "team_missing",
      },
    };

    const result = await runReadiness({
      tables,
      teamBindingId: "team_missing",
    });
    expect(result.state).toBe("misconfigured");
    expect(result.reasonCodes).toContain("vacation_policy_team_link_target_missing");
    expect(result.reasonCodes).toContain("vacation_policy_team_link_missing");
  });
});
