import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { generatePdfFromTemplate } from "../../../convex/lib/generatePdf";
import {
  answerAuditModeQuestion,
  completeAuditModeSession,
  openAuditModeHandoff,
  startAuditModeSession,
} from "../../../convex/onboarding/auditMode";
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
const ORG_ID = "org_ooo_052_integration" as Id<"organizations">;
const AGENT_ID = "agent_ooo_052_integration" as Id<"objects">;
const SESSION_TOKEN = "session-ooo-052-integration";
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
      const found = table.find((row) => row._id === id);
      if (found) {
        return found;
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

function createAuditModeContext(db: InMemoryDb) {
  return {
    db,
    runMutation: async (_ref: unknown, args: Record<string, unknown>) =>
      (emitFunnelEvent as any)._handler({ db }, args),
  };
}

function createDeliverableContext(args: {
  db: InMemoryDb;
  storage: InMemoryStorage;
}) {
  return {
    db: args.db,
    storage: args.storage,
    runQuery: async (_ref: unknown, queryArgs: Record<string, unknown>) => {
      if (Object.prototype.hasOwnProperty.call(queryArgs, "templateCode")) {
        return { _id: "template_1" };
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

function countByEventName(db: InMemoryDb, eventName: string) {
  return db
    .tableRows("onboardingFunnelEvents")
    .filter((row) => row.eventName === eventName).length;
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

describe("onboarding audit flow integration", () => {
  it("keeps lifecycle transitions deterministic and dedupes replay paths by eventKey", async () => {
    process.env.API_TEMPLATE_IO_KEY = "test-api-key";

    const generatePdfMock = vi.mocked(generatePdfFromTemplate);
    generatePdfMock.mockResolvedValue({
      status: "success",
      download_url: "https://template.example/generated.pdf",
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new TextEncoder().encode("%PDF-1.4 integration").buffer,
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const db = new InMemoryDb();
    const storage = new InMemoryStorage();
    const auditCtx = createAuditModeContext(db);
    const deliverableCtx = createDeliverableContext({ db, storage });

    const started = await (startAuditModeSession as any)._handler(auditCtx, {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
    });
    expect(started.success).toBe(true);
    expect(started.status).toBe("started");

    const questionSteps: Array<{
      questionId:
        | "business_revenue"
        | "team_size"
        | "monday_priority"
        | "delegation_gap"
        | "reclaimed_time";
      answer: string;
      expectedStatus: "in_progress" | "completed";
    }> = [
      {
        questionId: "business_revenue",
        answer: "Agency with $750k annual revenue.",
        expectedStatus: "in_progress",
      },
      {
        questionId: "team_size",
        answer: "6",
        expectedStatus: "in_progress",
      },
      {
        questionId: "monday_priority",
        answer: "Monday starts with fulfillment exception triage.",
        expectedStatus: "in_progress",
      },
      {
        questionId: "delegation_gap",
        answer: "Escalation decisions still route to me.",
        expectedStatus: "in_progress",
      },
      {
        questionId: "reclaimed_time",
        answer: "I would spend 12 hours on outbound partnerships.",
        expectedStatus: "completed",
      },
    ];

    for (const [index, step] of questionSteps.entries()) {
      const answered = await (answerAuditModeQuestion as any)._handler(auditCtx, {
        organizationId: ORG_ID,
        channel: CHANNEL,
        sessionToken: SESSION_TOKEN,
        questionId: step.questionId,
        answer: step.answer,
      });

      expect(answered.success).toBe(true);
      expect(answered.session.status).toBe(step.expectedStatus);
      expect(answered.session.answeredQuestionCount).toBe(index + 1);

      if (index === 0) {
        const replayAnswered = await (answerAuditModeQuestion as any)._handler(auditCtx, {
          organizationId: ORG_ID,
          channel: CHANNEL,
          sessionToken: SESSION_TOKEN,
          questionId: step.questionId,
          answer: step.answer,
        });

        expect(replayAnswered.success).toBe(true);
        expect(replayAnswered.deduped).toBe(true);
      }
    }

    const completed = await (completeAuditModeSession as any)._handler(auditCtx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
      workflowRecommendation: "Automate Monday triage with clear escalation thresholds.",
    });
    expect(completed.success).toBe(true);
    expect(completed.session.status).toBe("workflow_delivered");

    const firstDeliverable = await (generateAuditWorkflowDeliverable as any)._handler(deliverableCtx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
      input: {
        clientName: "Taylor Founder",
      },
    });

    expect(firstDeliverable.success).toBe(true);
    expect(firstDeliverable.deduped).toBe(false);

    const replayDeliverable = await (generateAuditWorkflowDeliverable as any)._handler(deliverableCtx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
      input: {
        clientName: "Taylor Founder",
      },
    });

    expect(replayDeliverable.success).toBe(true);
    expect(replayDeliverable.deduped).toBe(true);
    expect(replayDeliverable.storageId).toBe(firstDeliverable.storageId);

    const openedHandoff = await (openAuditModeHandoff as any)._handler(auditCtx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
    });
    expect(openedHandoff.success).toBe(true);
    expect(openedHandoff.session.status).toBe("handoff_opened");

    const replayHandoff = await (openAuditModeHandoff as any)._handler(auditCtx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
    });
    expect(replayHandoff.success).toBe(true);
    expect(replayHandoff.deduped).toBe(true);

    expect(generatePdfMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(countByEventName(db, "onboarding.funnel.audit_started")).toBe(1);
    expect(countByEventName(db, "onboarding.funnel.audit_question_answered")).toBe(5);
    expect(countByEventName(db, "onboarding.funnel.audit_completed")).toBe(1);
    expect(countByEventName(db, "onboarding.funnel.audit_deliverable_generated")).toBe(1);
    expect(countByEventName(db, "onboarding.funnel.audit_handoff_opened")).toBe(1);

    const expectedDeliverableEventKey = buildAuditLifecycleEventKey({
      eventName: "onboarding.funnel.audit_deliverable_generated",
      channel: CHANNEL,
      auditSessionKey: `audit:${CHANNEL}:${SESSION_TOKEN}`,
      sessionToken: SESSION_TOKEN,
    });

    const deliverableEvents = db
      .tableRows("onboardingFunnelEvents")
      .filter((row) => row.eventName === "onboarding.funnel.audit_deliverable_generated");
    expect(deliverableEvents).toHaveLength(1);
    expect(deliverableEvents[0]?.eventKey).toBe(expectedDeliverableEventKey);

    const allEventKeys = db
      .tableRows("onboardingFunnelEvents")
      .map((row) => row.eventKey as string);

    expect(new Set(allEventKeys).size).toBe(allEventKeys.length);
  });
});
