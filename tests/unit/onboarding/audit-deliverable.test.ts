import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { generatePdfFromTemplate } from "../../../convex/lib/generatePdf";
import {
  generateAuditWorkflowDeliverable,
  persistAuditDeliverableInternal,
  resolveAuditSessionForDeliverableInternal,
} from "../../../convex/onboarding/auditDeliverable";
import {
  buildAuditLifecycleEventKey,
  emitFunnelEvent,
} from "../../../convex/onboarding/funnelEvents";

vi.mock("../../../convex/lib/generatePdf", () => ({
  generatePdfFromTemplate: vi.fn(),
}));

type TestRow = Record<string, unknown> & { _id: string };

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_API_KEY = process.env.API_TEMPLATE_IO_KEY;
const ORG_ID = "org_ooo_052" as Id<"organizations">;
const AGENT_ID = "agent_ooo_052" as Id<"objects">;
const SESSION_ID = "session-ooo-052-deliverable";
const CHANNEL = "webchat" as const;

class InMemoryDb {
  private sequence = 0;
  private tables = new Map<string, TestRow[]>();

  async insert(tableName: string, doc: Record<string, unknown>) {
    const table = this.ensureTable(tableName);
    const id = `${tableName}_${++this.sequence}`;
    table.push({ _id: id, ...doc });
    return id;
  }

  async get(id: string) {
    for (const table of this.tables.values()) {
      const row = table.find((candidate) => candidate._id === id);
      if (row) {
        return row;
      }
    }
    return null;
  }

  async patch(id: string, patch: Record<string, unknown>) {
    const row = await this.get(id);
    if (!row) {
      throw new Error(`No row found for id ${id}`);
    }
    Object.assign(row, patch);
  }

  query(tableName: string) {
    const table = this.ensureTable(tableName);
    return {
      withIndex: (_indexName: string, cb: (q: { eq: (fieldName: string, value: unknown) => unknown }) => unknown) => {
        let fieldName: string | null = null;
        let expected: unknown;

        cb({
          eq: (candidateFieldName: string, candidateValue: unknown) => {
            fieldName = candidateFieldName;
            expected = candidateValue;
            return null;
          },
        });

        const filtered = fieldName
          ? table.filter((row) => row[fieldName as string] === expected)
          : table;

        return {
          first: async () => filtered[0] ?? null,
          collect: async () => [...filtered],
        };
      },
      collect: async () => [...table],
    };
  }

  tableRows(tableName: string) {
    return [...this.ensureTable(tableName)];
  }

  private ensureTable(tableName: string) {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }
    return this.tables.get(tableName)!;
  }
}

class InMemoryStorage {
  private sequence = 0;
  private files = new Map<string, Blob>();

  async store(blob: Blob) {
    const id = `storage_${++this.sequence}`;
    this.files.set(id, blob);
    return id;
  }

  async getUrl(storageId: string) {
    return this.files.has(storageId) ? `https://storage.test/${storageId}` : null;
  }
}

function buildAnsweredQuestionState() {
  const now = 1_700_000_000_000;
  return {
    business_revenue: {
      status: "answered",
      askedAt: now - 50_000,
      answeredAt: now - 49_000,
      answer: "Ecommerce operations consultancy at $1.2M ARR",
      answerEventKey: "answer:q1",
    },
    team_size: {
      status: "answered",
      askedAt: now - 48_000,
      answeredAt: now - 47_000,
      answer: "8",
      answerEventKey: "answer:q2",
    },
    monday_priority: {
      status: "answered",
      askedAt: now - 46_000,
      answeredAt: now - 45_000,
      answer: "Triage inbound customer issues and refunds.",
      answerEventKey: "answer:q3",
    },
    delegation_gap: {
      status: "answered",
      askedAt: now - 44_000,
      answeredAt: now - 43_000,
      answer: "Exception handling for high-value customers.",
      answerEventKey: "answer:q4",
    },
    reclaimed_time: {
      status: "answered",
      askedAt: now - 42_000,
      answeredAt: now - 41_000,
      answer: "I would spend 10 hours on partnerships.",
      answerEventKey: "answer:q5",
    },
  };
}

async function seedCompletedAuditSession(db: InMemoryDb) {
  const now = 1_700_000_000_000;
  const sessionId = await db.insert("onboardingAuditSessions", {
    auditSessionKey: `audit:${CHANNEL}:${SESSION_ID}`,
    channel: CHANNEL,
    organizationId: ORG_ID,
    agentId: AGENT_ID,
    sessionToken: SESSION_ID,
    questionSetVersion: "one_of_one_audit.v1",
    status: "workflow_delivered",
    currentQuestionId: undefined,
    answeredQuestionCount: 5,
    questionState: buildAnsweredQuestionState(),
    workflowRecommendation: "Automate high-volume support triage with clear escalation gates.",
    workflowDeliveredAt: now - 30_000,
    completedAt: now - 31_000,
    metadata: {},
    startedAt: now - 60_000,
    lastActivityAt: now - 30_000,
    createdAt: now - 60_000,
    updatedAt: now - 30_000,
  });

  return {
    sessionId,
    auditSessionKey: `audit:${CHANNEL}:${SESSION_ID}`,
  };
}

function createDeliverableContext(args: {
  db: InMemoryDb;
  storage: InMemoryStorage;
  template: Record<string, unknown> | null;
}) {
  return {
    db: args.db,
    storage: args.storage,
    runQuery: async (_ref: unknown, queryArgs: Record<string, unknown>) => {
      if (Object.prototype.hasOwnProperty.call(queryArgs, "templateCode")) {
        return args.template;
      }

      return (resolveAuditSessionForDeliverableInternal as any)._handler(
        { db: args.db },
        queryArgs
      );
    },
    runMutation: async (_ref: unknown, mutationArgs: Record<string, unknown>) => {
      if (
        Object.prototype.hasOwnProperty.call(mutationArgs, "sessionId")
        && Object.prototype.hasOwnProperty.call(mutationArgs, "deliverableKey")
      ) {
        return (persistAuditDeliverableInternal as any)._handler(
          { db: args.db },
          mutationArgs
        );
      }

      return (emitFunnelEvent as any)._handler({ db: args.db }, mutationArgs);
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_API_KEY === undefined) {
    delete process.env.API_TEMPLATE_IO_KEY;
  } else {
    process.env.API_TEMPLATE_IO_KEY = ORIGINAL_API_KEY;
  }
});

describe("onboarding audit deliverable failure modes", () => {
  it("returns deterministic missing_api_key when template generation key is absent", async () => {
    delete process.env.API_TEMPLATE_IO_KEY;

    const db = new InMemoryDb();
    const storage = new InMemoryStorage();
    await seedCompletedAuditSession(db);
    const ctx = createDeliverableContext({
      db,
      storage,
      template: { _id: "template_1" },
    });

    const result = await (generateAuditWorkflowDeliverable as any)._handler(ctx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_ID,
    });

    expect(result).toEqual({
      success: false,
      errorCode: "missing_api_key",
      message: "API_TEMPLATE_IO_KEY environment variable not set.",
    });
    expect(db.tableRows("onboardingFunnelEvents")).toHaveLength(0);
  });

  it("returns deterministic missing_template when template registry lookup fails", async () => {
    process.env.API_TEMPLATE_IO_KEY = "test-api-key";

    const db = new InMemoryDb();
    const storage = new InMemoryStorage();
    await seedCompletedAuditSession(db);
    const ctx = createDeliverableContext({
      db,
      storage,
      template: null,
    });

    const result = await (generateAuditWorkflowDeliverable as any)._handler(ctx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_ID,
    });

    expect(result).toEqual({
      success: false,
      errorCode: "missing_template",
      message: "Template 'leadmagnet_audit_workflow_report_v1' is not available in template registry.",
    });
    expect(db.tableRows("onboardingFunnelEvents")).toHaveLength(0);
  });

  it("replays deliverable generation idempotently without duplicate funnel rows", async () => {
    process.env.API_TEMPLATE_IO_KEY = "test-api-key";

    const generatePdfMock = vi.mocked(generatePdfFromTemplate);
    generatePdfMock.mockResolvedValue({
      status: "success",
      download_url: "https://template.example/generated.pdf",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new TextEncoder().encode("%PDF-1.4 test").buffer,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const db = new InMemoryDb();
    const storage = new InMemoryStorage();
    const seeded = await seedCompletedAuditSession(db);

    const ctx = createDeliverableContext({
      db,
      storage,
      template: { _id: "template_1" },
    });

    const firstResult = await (generateAuditWorkflowDeliverable as any)._handler(ctx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_ID,
      input: {
        clientName: "Alex Founder",
      },
    });

    expect(firstResult.success).toBe(true);
    expect(firstResult.deduped).toBe(false);
    expect(firstResult.auditSessionKey).toBe(`audit:${CHANNEL}:${SESSION_ID}`);

    const secondResult = await (generateAuditWorkflowDeliverable as any)._handler(ctx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_ID,
      input: {
        clientName: "Alex Founder",
      },
    });

    expect(secondResult.success).toBe(true);
    expect(secondResult.deduped).toBe(true);
    expect(secondResult.storageId).toBe(firstResult.storageId);
    expect(secondResult.fileName).toBe(firstResult.fileName);
    expect(secondResult.inputFingerprint).toBe(firstResult.inputFingerprint);
    expect(secondResult.generatedAt).toBe(firstResult.generatedAt);

    expect(generatePdfMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const session = await db.get(seeded.sessionId);
    expect(session?.status).toBe("deliverable_generated");

    const metadata = (session?.metadata ?? {}) as Record<string, unknown>;
    const auditDeliverables = (metadata.auditDeliverables ?? {}) as Record<string, unknown>;
    expect(Object.keys(auditDeliverables)).toHaveLength(1);

    const deliverableEvents = db
      .tableRows("onboardingFunnelEvents")
      .filter((row) => row.eventName === "onboarding.funnel.audit_deliverable_generated");

    expect(deliverableEvents).toHaveLength(1);

    const expectedEventKey = buildAuditLifecycleEventKey({
      eventName: "onboarding.funnel.audit_deliverable_generated",
      channel: CHANNEL,
      auditSessionKey: `audit:${CHANNEL}:${SESSION_ID}`,
      sessionToken: SESSION_ID,
    });
    expect(deliverableEvents[0]?.eventKey).toBe(expectedEventKey);

    const eventKeys = db
      .tableRows("onboardingFunnelEvents")
      .map((row) => row.eventKey as string);
    expect(new Set(eventKeys).size).toBe(eventKeys.length);
  });
});
