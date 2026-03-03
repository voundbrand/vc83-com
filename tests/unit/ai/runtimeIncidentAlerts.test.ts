import { describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  buildRuntimeIncidentAlertDedupeKey,
  buildRuntimeIncidentThreadDeepLink,
  notifyRuntimeIncident,
} from "../../../convex/ai/runtimeIncidentAlerts";

const ORG_ID = "org_1" as Id<"organizations">;
const SESSION_ID = "session_1" as Id<"agentSessions">;
const TURN_ID = "turn_1" as Id<"agentTurns">;

describe("runtime incident alert helpers", () => {
  it("builds deterministic dedupe keys from org + proposal/session partition + reason", () => {
    const withProposal = buildRuntimeIncidentAlertDedupeKey({
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      proposalKey: "toolspec:checkout:org_1:session_1",
      reasonCode: "claim_tool_unavailable",
    });
    const fallbackToSession = buildRuntimeIncidentAlertDedupeKey({
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      reasonCode: "claim_tool_unavailable",
    });

    expect(withProposal).toBe(
      "org_1|toolspec:checkout:org_1:session_1|claim_tool_unavailable",
    );
    expect(fallbackToSession).toBe(
      "org_1|session:session_1|claim_tool_unavailable",
    );
  });

  it("builds thread deep links against the desktop shell route grammar", () => {
    const deepLink = buildRuntimeIncidentThreadDeepLink({
      sessionId: SESSION_ID,
      proposalKey: "toolspec:checkout:org_1:session_1",
    });

    expect(deepLink).toContain("app=organizations");
    expect(deepLink).toContain("panel=agent-control-center");
    expect(deepLink).toContain("entity=session_1");
    expect(deepLink).toContain("proposalKey=toolspec%3Acheckout%3Aorg_1%3Asession_1");
  });
});

describe("runtime incident alert emission + dedupe", () => {
  it("emits once and dedupes repeated identical alerts within the throttle window", async () => {
    const sentAlerts: Array<Record<string, unknown>> = [];
    const recordedLogs: Array<Record<string, unknown>> = [];

    const ctx = {
      runQuery: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
        const dedupeKey = args.dedupeKey;
        const since = args.since;
        if (typeof dedupeKey !== "string" || typeof since !== "number") {
          return null;
        }
        const latest = [...recordedLogs]
          .reverse()
          .find(
            (row) =>
              row.dedupeKey === dedupeKey
              && row.deliveryStatus === "sent"
              && typeof row.notifiedAt === "number"
              && (row.notifiedAt as number) >= since,
          );
        if (!latest) {
          return null;
        }
        return {
          _id: "objects_alert_1",
          notifiedAt: latest.notifiedAt,
          emailId: latest.emailId,
        };
      }),
      runAction: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
        sentAlerts.push(args);
        return {
          success: true,
          emailId: `email_${sentAlerts.length}`,
        };
      }),
      runMutation: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
        recordedLogs.push(args);
        return { logId: `log_${recordedLogs.length}` };
      }),
    } as any;

    const payload = {
      incidentType: "claim_tool_unavailable" as const,
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      proposalKey: "toolspec:checkout:org_1:session_1",
      tool: "generate_audit_workflow_deliverable",
      reasonCode: "claim_tool_unavailable",
      reason: "Required tool is unavailable in runtime scope.",
      linearIssueId: "issue_123",
      linearIssueUrl: "https://linear.app/l4yercak3/issue/ENG-42",
    };

    const first = await (notifyRuntimeIncident as any)._handler(ctx, payload);
    expect(first).toMatchObject({
      success: true,
      emitted: true,
      deduped: false,
    });
    expect(sentAlerts).toHaveLength(1);
    expect(String(sentAlerts[0]?.context || "")).toContain(
      "reasonCode=claim_tool_unavailable",
    );
    expect(String(sentAlerts[0]?.context || "")).toContain(
      "manifestHash=manifest:unknown",
    );
    expect(String(sentAlerts[0]?.context || "")).toContain(
      "idempotencyScopeKey=toolspec:checkout:org_1:session_1",
    );
    expect(String(sentAlerts[0]?.context || "")).toContain(
      "admissionReasonCode=claim_tool_unavailable",
    );

    const second = await (notifyRuntimeIncident as any)._handler(ctx, payload);
    expect(second).toMatchObject({
      success: true,
      emitted: false,
      deduped: true,
    });
    expect(sentAlerts).toHaveLength(1);
  });

  it("does not dedupe when reasonCode changes", async () => {
    const sentAlerts: Array<Record<string, unknown>> = [];
    const recordedLogs: Array<Record<string, unknown>> = [];

    const ctx = {
      runQuery: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
        const dedupeKey = args.dedupeKey;
        const since = args.since;
        if (typeof dedupeKey !== "string" || typeof since !== "number") {
          return null;
        }
        const latest = [...recordedLogs]
          .reverse()
          .find(
            (row) =>
              row.dedupeKey === dedupeKey
              && row.deliveryStatus === "sent"
              && typeof row.notifiedAt === "number"
              && (row.notifiedAt as number) >= since,
          );
        if (!latest) {
          return null;
        }
        return {
          _id: "objects_alert_1",
          notifiedAt: latest.notifiedAt,
          emailId: latest.emailId,
        };
      }),
      runAction: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
        sentAlerts.push(args);
        return {
          success: true,
          emailId: `email_${sentAlerts.length}`,
        };
      }),
      runMutation: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
        recordedLogs.push(args);
        return { logId: `log_${recordedLogs.length}` };
      }),
    } as any;

    await (notifyRuntimeIncident as any)._handler(ctx, {
      incidentType: "delivery_blocked_escalated",
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      reasonCode: "response_loop",
    });
    await (notifyRuntimeIncident as any)._handler(ctx, {
      incidentType: "delivery_blocked_escalated",
      organizationId: ORG_ID,
      sessionId: SESSION_ID,
      turnId: TURN_ID,
      reasonCode: "tool_failure",
    });

    expect(sentAlerts).toHaveLength(2);
  });
});
