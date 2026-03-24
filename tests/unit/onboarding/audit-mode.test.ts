import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  answerAuditModeQuestion,
  completeAuditModeSession,
  ensureAuditModeSessionForDeliverable,
  openAuditModeHandoff,
  startAuditModeSession,
} from "../../../convex/onboarding/auditMode";
import {
  buildAuditLifecycleEventKey,
  emitFunnelEvent,
} from "../../../convex/onboarding/funnelEvents";

type TestRow = Record<string, unknown> & { _id: string };

const ORG_ID = "org_ooo_052" as Id<"organizations">;
const AGENT_ID = "agent_ooo_052" as Id<"objects">;
const SESSION_TOKEN = "session-ooo-052";
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
    const match = this.findRow(id);
    return match ? this.clone(match) : null;
  }

  async patch(id: string, patch: Record<string, unknown>) {
    const existing = this.findRow(id);
    if (!existing) {
      throw new Error(`No row found for id ${id}`);
    }
    Object.assign(existing, patch);
  }

  query(tableName: string) {
    const table = this.ensureTable(tableName);
    return {
      withIndex: (_indexName: string, cb: (q: { eq: (fieldName: string, value: unknown) => unknown }) => unknown) => {
        let fieldName: string | null = null;
        let value: unknown;
        cb({
          eq: (candidateFieldName: string, candidateValue: unknown) => {
            fieldName = candidateFieldName;
            value = candidateValue;
            return null;
          },
        });

        const filtered = fieldName
          ? table.filter((row) => row[fieldName as string] === value)
          : table;

        return {
          first: async () => (filtered[0] ? this.clone(filtered[0]) : null),
          collect: async () => filtered.map((row) => this.clone(row)),
        };
      },
      collect: async () => table.map((row) => this.clone(row)),
    };
  }

  tableRows(tableName: string) {
    return this.ensureTable(tableName).map((row) => this.clone(row));
  }

  private ensureTable(tableName: string) {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, []);
    }
    return this.tables.get(tableName)!;
  }

  private findRow(id: string) {
    for (const table of this.tables.values()) {
      const match = table.find((row) => row._id === id);
      if (match) {
        return match;
      }
    }
    return null;
  }

  private clone<T>(value: T): T {
    return structuredClone(value);
  }
}

function createAuditModeContext(db: InMemoryDb) {
  return {
    db,
    runMutation: async (_ref: unknown, args: Record<string, unknown>) =>
      (emitFunnelEvent as any)._handler({ db }, args),
  };
}

describe("onboarding audit mode lifecycle", () => {
  it("keeps native_guest audit mode independent from onboarding binding side tables", async () => {
    const db = new InMemoryDb();
    const ctx = createAuditModeContext(db);

    const startResult = await (startAuditModeSession as any)._handler(ctx, {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: "native_guest",
      sessionToken: "ng_audit_mode_regression",
    });

    expect(startResult.success).toBe(true);
    expect(startResult.auditSessionKey).toBe("audit:native_guest:ng_audit_mode_regression");
    expect(db.tableRows("guestOnboardingBindings")).toHaveLength(0);
    expect(db.tableRows("anonymousClaimTokens")).toHaveLength(0);
  });

  it("tracks deterministic status transitions and dedupes replayed lifecycle events", async () => {
    const db = new InMemoryDb();
    const ctx = createAuditModeContext(db);

    const startResult = await (startAuditModeSession as any)._handler(ctx, {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
    });

    expect(startResult.success).toBe(true);
    expect(startResult.deduped).toBe(false);
    expect(startResult.status).toBe("started");
    expect(startResult.currentQuestionId).toBe("business_revenue");
    expect(startResult.auditSessionKey).toBe(`audit:${CHANNEL}:${SESSION_TOKEN}`);

    const replayStartResult = await (startAuditModeSession as any)._handler(ctx, {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
    });

    expect(replayStartResult.success).toBe(true);
    expect(replayStartResult.deduped).toBe(true);
    expect(db.tableRows("onboardingAuditSessions")).toHaveLength(1);

    const startedEventKey = buildAuditLifecycleEventKey({
      eventName: "onboarding.funnel.audit_started",
      channel: CHANNEL,
      auditSessionKey: `audit:${CHANNEL}:${SESSION_TOKEN}`,
      sessionToken: SESSION_TOKEN,
    });

    const startedEvents = db
      .tableRows("onboardingFunnelEvents")
      .filter((row) => row.eventName === "onboarding.funnel.audit_started");
    expect(startedEvents).toHaveLength(1);
    expect(startedEvents[0]?.eventKey).toBe(startedEventKey);

    const steps: Array<{
      questionId:
        | "business_revenue"
        | "team_size"
        | "monday_priority"
        | "delegation_gap"
        | "reclaimed_time";
      answer: string;
      expectedStatus: "in_progress" | "completed";
      expectedNextQuestionId:
        | "team_size"
        | "monday_priority"
        | "delegation_gap"
        | "reclaimed_time"
        | undefined;
      stepOrdinal: number;
    }> = [
      {
        questionId: "business_revenue",
        answer: "We run an ecommerce brand at $900k ARR.",
        expectedStatus: "in_progress",
        expectedNextQuestionId: "team_size",
        stepOrdinal: 1,
      },
      {
        questionId: "team_size",
        answer: "7 people total across operations and sales.",
        expectedStatus: "in_progress",
        expectedNextQuestionId: "monday_priority",
        stepOrdinal: 2,
      },
      {
        questionId: "monday_priority",
        answer: "Monday starts with triaging all inbound orders and issue tickets.",
        expectedStatus: "in_progress",
        expectedNextQuestionId: "delegation_gap",
        stepOrdinal: 3,
      },
      {
        questionId: "delegation_gap",
        answer: "Customer exception handling still depends on me for judgment.",
        expectedStatus: "in_progress",
        expectedNextQuestionId: "reclaimed_time",
        stepOrdinal: 4,
      },
      {
        questionId: "reclaimed_time",
        answer: "I would spend those 10 hours on outbound partnerships.",
        expectedStatus: "completed",
        expectedNextQuestionId: undefined,
        stepOrdinal: 5,
      },
    ];

    let priorQuestionEventCount = db
      .tableRows("onboardingFunnelEvents")
      .filter((row) => row.eventName === "onboarding.funnel.audit_question_answered").length;

    for (const step of steps) {
      const answerResult = await (answerAuditModeQuestion as any)._handler(ctx, {
        organizationId: ORG_ID,
        channel: CHANNEL,
        sessionToken: SESSION_TOKEN,
        questionId: step.questionId,
        answer: step.answer,
      });

      expect(answerResult.success).toBe(true);
      expect(answerResult.deduped).toBe(false);
      expect(answerResult.session.status).toBe(step.expectedStatus);
      expect(answerResult.session.currentQuestionId).toBe(step.expectedNextQuestionId);
      expect(answerResult.session.answeredQuestionCount).toBe(step.stepOrdinal);

      const expectedAnswerEventKey = buildAuditLifecycleEventKey({
        eventName: "onboarding.funnel.audit_question_answered",
        channel: CHANNEL,
        auditSessionKey: `audit:${CHANNEL}:${SESSION_TOKEN}`,
        sessionToken: SESSION_TOKEN,
        auditQuestionId: step.questionId,
        auditStepOrdinal: step.stepOrdinal,
      });

      expect(answerResult.session.questionState[step.questionId].answerEventKey).toBe(expectedAnswerEventKey);

      const matchingQuestionEvents = db
        .tableRows("onboardingFunnelEvents")
        .filter(
          (row) =>
            row.eventName === "onboarding.funnel.audit_question_answered"
            && row.auditQuestionId === step.questionId
        );
      expect(matchingQuestionEvents).toHaveLength(1);
      expect(matchingQuestionEvents[0]?.eventKey).toBe(expectedAnswerEventKey);

      const currentQuestionEventCount = db
        .tableRows("onboardingFunnelEvents")
        .filter((row) => row.eventName === "onboarding.funnel.audit_question_answered").length;

      expect(currentQuestionEventCount).toBe(priorQuestionEventCount + 1);
      priorQuestionEventCount = currentQuestionEventCount;

      if (step.stepOrdinal === 1) {
        const replayAnswer = await (answerAuditModeQuestion as any)._handler(ctx, {
          organizationId: ORG_ID,
          channel: CHANNEL,
          sessionToken: SESSION_TOKEN,
          questionId: "business_revenue",
          answer: "We run an ecommerce brand at $900k ARR.",
        });

        expect(replayAnswer.success).toBe(true);
        expect(replayAnswer.deduped).toBe(true);

        const afterReplayQuestionEventCount = db
          .tableRows("onboardingFunnelEvents")
          .filter((row) => row.eventName === "onboarding.funnel.audit_question_answered").length;
        expect(afterReplayQuestionEventCount).toBe(currentQuestionEventCount);
      }
    }

    const completedEventKey = buildAuditLifecycleEventKey({
      eventName: "onboarding.funnel.audit_completed",
      channel: CHANNEL,
      auditSessionKey: `audit:${CHANNEL}:${SESSION_TOKEN}`,
      sessionToken: SESSION_TOKEN,
      auditStepOrdinal: 5,
    });

    const completedEventsBeforeComplete = db
      .tableRows("onboardingFunnelEvents")
      .filter((row) => row.eventName === "onboarding.funnel.audit_completed");
    expect(completedEventsBeforeComplete).toHaveLength(1);
    expect(completedEventsBeforeComplete[0]?.eventKey).toBe(completedEventKey);

    const completeResult = await (completeAuditModeSession as any)._handler(ctx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
      workflowRecommendation: "Automate Monday intake triage with explicit escalation rules.",
    });

    expect(completeResult.success).toBe(true);
    expect(completeResult.session.status).toBe("workflow_delivered");
    const persistedAfterComplete = db.tableRows("onboardingAuditSessions")[0];
    expect(persistedAfterComplete?.lastLifecycleEventKey).toBe(completedEventKey);

    const completedEventsAfterComplete = db
      .tableRows("onboardingFunnelEvents")
      .filter((row) => row.eventName === "onboarding.funnel.audit_completed");
    expect(completedEventsAfterComplete).toHaveLength(1);

    const handoffResult = await (openAuditModeHandoff as any)._handler(ctx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
    });

    expect(handoffResult.success).toBe(true);
    expect(handoffResult.deduped).toBe(false);
    expect(handoffResult.session.status).toBe("handoff_opened");

    const replayHandoffResult = await (openAuditModeHandoff as any)._handler(ctx, {
      organizationId: ORG_ID,
      channel: CHANNEL,
      sessionToken: SESSION_TOKEN,
    });

    expect(replayHandoffResult.success).toBe(true);
    expect(replayHandoffResult.deduped).toBe(true);

    const handoffEvents = db
      .tableRows("onboardingFunnelEvents")
      .filter((row) => row.eventName === "onboarding.funnel.audit_handoff_opened");
    expect(handoffEvents).toHaveLength(1);

    const eventKeys = db
      .tableRows("onboardingFunnelEvents")
      .map((row) => row.eventKey as string);
    expect(new Set(eventKeys).size).toBe(eventKeys.length);
  });

  it("bootstraps a deliverable-ready audit session when Samantha dispatch has no existing audit record", async () => {
    const db = new InMemoryDb();
    const ctx = createAuditModeContext(db);

    const result = await (ensureAuditModeSessionForDeliverable as any)._handler(ctx, {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: "native_guest",
      sessionToken: "ng_dispatch_bootstrap",
      workflowRecommendation: "Automate intake triage and route founder-ready follow-ups.",
      capturedEmail: "lead@example.com",
      capturedName: "Ava Rivers",
    });

    expect(result.success).toBe(true);
    expect(result.created).toBe(true);
    expect(result.session?.status).toBe("workflow_delivered");
    expect(result.session?.answeredQuestionCount).toBe(5);
    expect(result.session?.workflowRecommendation).toContain("Automate intake triage");

    const sessions = db.tableRows("onboardingAuditSessions");
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.channel).toBe("native_guest");
    expect(sessions[0]?.capturedEmail).toBe("lead@example.com");
    expect(sessions[0]?.capturedName).toBe("Ava Rivers");
  });

  it("returns existing session when bootstrap is called repeatedly for the same scope", async () => {
    const db = new InMemoryDb();
    const ctx = createAuditModeContext(db);
    const args = {
      organizationId: ORG_ID,
      agentId: AGENT_ID,
      channel: "native_guest",
      sessionToken: "ng_dispatch_bootstrap_repeat",
      workflowRecommendation: "First recommendation",
      capturedEmail: "first@example.com",
      capturedName: "First Lead",
    };

    const first = await (ensureAuditModeSessionForDeliverable as any)._handler(ctx, args);
    const second = await (ensureAuditModeSessionForDeliverable as any)._handler(ctx, {
      ...args,
      workflowRecommendation: "Updated recommendation",
      capturedEmail: "updated@example.com",
      capturedName: "Updated Lead",
    });

    expect(first.success).toBe(true);
    expect(first.created).toBe(true);
    expect(second.success).toBe(true);
    expect(second.created).toBe(false);
    expect(second.session?.workflowRecommendation).toContain("Updated recommendation");
    expect(db.tableRows("onboardingAuditSessions")).toHaveLength(1);
    const persisted = db.tableRows("onboardingAuditSessions")[0];
    expect(persisted?.capturedEmail).toBe("updated@example.com");
    expect(persisted?.capturedName).toBe("Updated Lead");
  });
});
