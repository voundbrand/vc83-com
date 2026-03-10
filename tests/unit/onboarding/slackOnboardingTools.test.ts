import { describe, expect, it, vi } from "vitest";
import { INTERVIEW_TOOLS } from "../../../convex/ai/tools/interviewTools";

const BASE_READINESS = {
  contractVersion: "slack_calendar_onboarding_readiness_v1",
  state: "partial",
  reasonCodes: ["slack_connection_missing"],
  checks: [],
  ownerAdminInputRequirements: [
    {
      id: "owner.confirm_slack_workspace_connect",
      label: "Confirm Slack workspace connection",
      owner: "owner",
      reasonCodes: ["slack_connection_missing"],
    },
  ],
  writesRequiringExplicitConfirmation: [
    "start_slack_workspace_connect",
    "save_pharmacist_vacation_policy",
  ],
};

function createToolCtx(overrides?: {
  runQuery?: ReturnType<typeof vi.fn>;
  runMutation?: ReturnType<typeof vi.fn>;
  sessionId?: string;
}) {
  const hasSessionOverride = Boolean(
    overrides && Object.prototype.hasOwnProperty.call(overrides, "sessionId")
  );
  return {
    organizationId: "org_test",
    userId: "user_test",
    channel: "webchat",
    sessionId: hasSessionOverride ? overrides?.sessionId : "session_test",
    runQuery: overrides?.runQuery ?? vi.fn().mockResolvedValue(BASE_READINESS),
    runMutation: overrides?.runMutation ?? vi.fn(),
    runAction: vi.fn(),
  } as never;
}

describe("Slack onboarding interview tools", () => {
  it("readiness tool fails closed when session is missing", async () => {
    const result =
      await INTERVIEW_TOOLS.check_slack_calendar_onboarding_readiness.execute(
        createToolCtx({ sessionId: undefined }),
        {}
      );
    expect(result.success).toBe(false);
    expect(result.error).toBe("session_required");
  });

  it("Slack connect requires explicit confirmation before mutation", async () => {
    const runQuery = vi.fn().mockResolvedValue(BASE_READINESS);
    const runMutation = vi.fn();
    const result = await INTERVIEW_TOOLS.start_slack_workspace_connect.execute(
      createToolCtx({ runQuery, runMutation }),
      {}
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("explicit_confirmation_required");
    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(runMutation).not.toHaveBeenCalled();
  });

  it("Slack connect executes mutation only after readiness preflight and confirmation, then reruns readiness", async () => {
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce(BASE_READINESS)
      .mockResolvedValueOnce({
        ...BASE_READINESS,
        state: "partial",
        reasonCodes: ["vacation_policy_missing"],
      });
    const runMutation = vi.fn().mockResolvedValue({
      authUrl: "https://slack.com/oauth/v2/authorize?state=test",
    });

    const result = await INTERVIEW_TOOLS.start_slack_workspace_connect.execute(
      createToolCtx({ runQuery, runMutation }),
      { confirmWrite: true }
    );

    expect(result.success).toBe(true);
    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(runMutation).toHaveBeenCalledTimes(1);
    expect(result.readinessBefore).toBeDefined();
    expect(result.readinessAfter).toBeDefined();
  });

  it("policy save tool requires explicit confirmation before mutation", async () => {
    const runQuery = vi.fn().mockResolvedValue({
      ...BASE_READINESS,
      state: "ready",
      reasonCodes: [],
      ownerAdminInputRequirements: [],
    });
    const runMutation = vi.fn();

    const result = await INTERVIEW_TOOLS.save_pharmacist_vacation_policy.execute(
      createToolCtx({ runQuery, runMutation }),
      {
        maxConcurrentAway: 1,
        minOnDutyTotal: 1,
        pharmacistRoleFloor: 1,
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("explicit_confirmation_required");
    expect(runMutation).not.toHaveBeenCalled();
  });

  it("policy save tool blocks writes when readiness is blocked", async () => {
    const runQuery = vi.fn().mockResolvedValue({
      ...BASE_READINESS,
      state: "blocked",
      reasonCodes: ["permission_manage_integrations_required"],
    });
    const runMutation = vi.fn();

    const result = await INTERVIEW_TOOLS.save_pharmacist_vacation_policy.execute(
      createToolCtx({ runQuery, runMutation }),
      {
        maxConcurrentAway: 1,
        minOnDutyTotal: 1,
        pharmacistRoleFloor: 1,
        confirmWrite: true,
      }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("readiness_blocked");
    expect(runMutation).not.toHaveBeenCalled();
  });
});
