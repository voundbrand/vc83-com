import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  acquireDispatchLease,
  commitDispatchAttemptOutcome,
  createDispatchRun,
  moveRunToDeadLetter,
  requestDeadLetterReplay,
} from "../../../convex/ai/postCaptureDispatcher";
import { SAMANTHA_POST_CAPTURE_DISPATCH_INPUT_VERSION } from "../../../convex/ai/postCaptureDispatcherContracts";

type TestRow = Record<string, unknown> & { _id: string };

function applyPatch(row: TestRow, patch: Record<string, unknown>) {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete row[key];
    } else {
      row[key] = value;
    }
  }
}

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
    applyPatch(row, patch);
  }

  query(tableName: string) {
    const table = this.ensureTable(tableName);
    const buildResult = (rows: TestRow[]) => ({
      first: async () => rows[0] ?? null,
      collect: async () => [...rows],
      take: async (limit: number) => rows.slice(0, limit),
      filter: (
        cb: (q: {
          field: (name: string) => string;
          eq: (left: string, right: unknown) => { left: string; right: unknown };
        }) => { left: string; right: unknown }
      ) => {
        const expression = cb({
          field: (name) => name,
          eq: (left, right) => ({ left, right }),
        });
        const filtered = rows.filter((row) => row[expression.left] === expression.right);
        return buildResult(filtered);
      },
    });

    return {
      withIndex: (
        _indexName: string,
        cb: (q: { eq: (fieldName: string, value: unknown) => { eq: (fieldName: string, value: unknown) => any } }) => unknown
      ) => {
        const filters: Array<{ field: string; value: unknown }> = [];
        const q = {
          eq: (fieldName: string, value: unknown) => {
            filters.push({ field: fieldName, value });
            return q;
          },
        };
        cb(q);
        const filtered = table.filter((row) =>
          filters.every((entry) => row[entry.field] === entry.value)
        );
        return buildResult(filtered);
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

function buildStepState(args: {
  leadStatus: "pending" | "succeeded" | "failed_retryable" | "failed_terminal";
  salesStatus: "pending" | "succeeded" | "failed_retryable" | "failed_terminal";
}) {
  return [
    {
      stepKey: "lead_email_send",
      status: args.leadStatus,
      attemptCount: args.leadStatus === "pending" ? 0 : 1,
      completedAt: args.leadStatus === "pending" ? undefined : Date.now(),
    },
    {
      stepKey: "sales_notification_send",
      status: args.salesStatus,
      attemptCount: args.salesStatus === "pending" ? 0 : 1,
      completedAt: args.salesStatus === "pending" ? undefined : Date.now(),
    },
    {
      stepKey: "founder_call_orchestration",
      status: "pending",
      attemptCount: 0,
    },
    {
      stepKey: "slack_hot_lead_notify",
      status: "pending",
      attemptCount: 0,
    },
  ];
}

describe("post-capture dispatcher integration", () => {
  it("tracks leased retry attempts and transitions terminal failures into dead-letter replay", async () => {
    const db = new InMemoryDb();
    const orgId = "org_post_capture_1" as Id<"organizations">;

    const input = {
      contractVersion: SAMANTHA_POST_CAPTURE_DISPATCH_INPUT_VERSION,
      organizationId: orgId,
      auditSessionKey: "audit_session_1",
      idempotencyKey: "dispatch:org_post_capture_1:audit_session_1:test@example.com:abc",
      correlationId: "sam_dispatch:org_post_capture_1:audit_session_1:1700000000000",
      source: {
        toolName: "generate_audit_workflow_deliverable" as const,
        channel: "webchat" as const,
      },
      lead: {
        email: "test@example.com",
        firstName: "Test",
        lastName: "Lead",
        phone: "+14155551212",
        founderContactRequested: false,
        salesCallRequested: false,
        qualificationLevel: "High",
        qualificationReasons: ["budget_confirmed"],
      },
      sideEffects: {
        leadEmail: {
          to: "test@example.com",
          subject: "Lead deliverable",
          html: "<p>ok</p>",
          text: "ok",
          useDefaultSenderFallback: true,
        },
        salesEmail: {
          to: "sales@example.com",
          subject: "New lead",
          html: "<p>lead</p>",
          text: "lead",
          useDefaultSenderFallback: true,
        },
      },
      policy: {
        allowSlackHotLead: false,
      },
      maxAttempts: 4,
    };

    const created = await (createDispatchRun as any)._handler({ db }, { input });
    expect(created.success).toBe(true);
    expect(created.created).toBe(true);

    const replayCreate = await (createDispatchRun as any)._handler({ db }, { input });
    expect(replayCreate.success).toBe(true);
    expect(replayCreate.created).toBe(false);
    expect(replayCreate.runId).toBe(created.runId);

    const firstLease = await (acquireDispatchLease as any)._handler(
      { db },
      {
        runId: created.runId,
        leaseOwner: "worker:test",
        leaseDurationMs: 120_000,
      }
    );
    expect(firstLease.success).toBe(true);
    if (!firstLease.success) {
      return;
    }

    const nextRetryAt = Date.now() + 60_000;
    const firstCommit = await (commitDispatchAttemptOutcome as any)._handler(
      { db },
      {
        runId: created.runId,
        attemptId: firstLease.attemptId,
        leaseToken: firstLease.leaseToken,
        attemptOutcome: "failed_retryable",
        stepState: buildStepState({
          leadStatus: "failed_retryable",
          salesStatus: "pending",
        }),
        outputs: {
          leadEmailDelivery: {
            success: false,
            error: "timeout",
          },
        },
        reasonCode: "lead_email_send_failed",
        error: "timeout",
        nextRetryAt,
        backoffMs: 60_000,
      }
    );
    expect(firstCommit.success).toBe(true);
    expect(firstCommit.status).toBe("retry_scheduled");

    const secondLeaseTooEarly = await (acquireDispatchLease as any)._handler(
      { db },
      {
        runId: created.runId,
        leaseOwner: "worker:test",
        leaseDurationMs: 120_000,
      }
    );
    expect(secondLeaseTooEarly.success).toBe(false);
    if (secondLeaseTooEarly.success) {
      return;
    }
    expect(secondLeaseTooEarly.reason).toBe("run_retry_not_due");

    await db.patch(created.runId, {
      nextRetryAt: Date.now() - 1,
    });

    const secondLease = await (acquireDispatchLease as any)._handler(
      { db },
      {
        runId: created.runId,
        leaseOwner: "worker:test",
        leaseDurationMs: 120_000,
      }
    );
    expect(secondLease.success).toBe(true);
    if (!secondLease.success) {
      return;
    }

    const secondCommit = await (commitDispatchAttemptOutcome as any)._handler(
      { db },
      {
        runId: created.runId,
        attemptId: secondLease.attemptId,
        leaseToken: secondLease.leaseToken,
        attemptOutcome: "failed_terminal",
        stepState: buildStepState({
          leadStatus: "succeeded",
          salesStatus: "failed_terminal",
        }),
        outputs: {
          leadEmailDelivery: {
            success: true,
            messageId: "msg_1",
          },
          salesEmailDelivery: {
            success: false,
            error: "smtp_rejected",
          },
        },
        reasonCode: "sales_email_send_failed",
        error: "smtp_rejected",
      }
    );
    expect(secondCommit.success).toBe(true);
    expect(secondCommit.status).toBe("failed_terminal");

    const deadLetterMove = await (moveRunToDeadLetter as any)._handler(
      { db },
      {
        runId: created.runId,
        reasonCode: "sales_email_send_failed",
        error: "smtp_rejected",
      }
    );
    expect(deadLetterMove.success).toBe(true);
    if (!deadLetterMove.success) {
      return;
    }

    const runAfterDeadLetter = await db.get(created.runId);
    expect(runAfterDeadLetter?.status).toBe("dead_lettered");
    expect(runAfterDeadLetter?.deadLetterId).toBe(deadLetterMove.deadLetterId);

    const replayRequest = await (requestDeadLetterReplay as any)._handler(
      { db },
      {
        runId: created.runId,
        triageNotes: "Updated sales mailbox credentials",
      }
    );
    expect(replayRequest.success).toBe(true);

    const runAfterReplay = await db.get(created.runId);
    expect(runAfterReplay?.status).toBe("replay_requested");
    expect(runAfterReplay?.attemptCount).toBe(0);
    expect(Array.isArray(runAfterReplay?.stepState)).toBe(true);

    const stepStateAfterReplay = (runAfterReplay?.stepState || []) as Array<Record<string, unknown>>;
    const leadStep = stepStateAfterReplay.find((step) => step.stepKey === "lead_email_send");
    const salesStep = stepStateAfterReplay.find((step) => step.stepKey === "sales_notification_send");
    expect(leadStep?.status).toBe("succeeded");
    expect(salesStep?.status).toBe("pending");

    const deadLetterRows = db.tableRows("onboardingPostCaptureDispatchDeadLetters");
    expect(deadLetterRows).toHaveLength(1);
    expect(deadLetterRows[0].status).toBe("replay_queued");
    expect(deadLetterRows[0].replayCount).toBe(1);
  });
});
